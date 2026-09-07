import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, count, eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { identityBinding, userAccount } from '../db/schema/index.js';
import { provisionExternalUser } from './provision.js';

let db: Db;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  // 幂等：清上次运行残留——按 id 前缀（usr_prov-%；displayName 由外部身份源决定不可作键）
  const staleUsers = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.id, 'usr_prov-%'));
  for (const u of staleUsers) {
    await db.delete(identityBinding).where(eq(identityBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
});

afterAll(async () => {
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.id, 'usr_prov-%'));
  for (const u of users) {
    await db.delete(identityBinding).where(eq(identityBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('provisionExternalUser（T26：公共建号/binding 复用）', () => {
  it('首次 provision → 建号 ACTIVE + binding(provider, subject) 落库', async () => {
    const user = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-1',
      userId: 'usr_prov-oidc-1',
      displayName: 'OIDC One',
      email: 'one@example.com',
    });
    expect(user.id).toBe('usr_prov-oidc-1');
    expect(user.email).toBe('one@example.com');
    const [account] = await db
      .select()
      .from(userAccount)
      .where(eq(userAccount.id, 'usr_prov-oidc-1'));
    expect(account!.status).toBe('ACTIVE');
    const [binding] = await db
      .select()
      .from(identityBinding)
      .where(
        and(eq(identityBinding.provider, 'oidc'), eq(identityBinding.providerSubject, 'sub-1')),
      );
    expect(binding!.userId).toBe('usr_prov-oidc-1');
  });

  it('同 subject 二次 provision → 复用绑定账号，不重复建号（id 不变）', async () => {
    await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-2',
      userId: 'usr_prov-oidc-2',
      displayName: 'First',
    });
    // 第二次换 userId 参数也不重建（binding 决定身份归属）
    const again = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-2',
      userId: 'usr_prov-different-id',
      displayName: 'First',
    });
    expect(again.id).toBe('usr_prov-oidc-2');
    const [binding] = await db
      .select()
      .from(identityBinding)
      .where(
        and(eq(identityBinding.provider, 'oidc'), eq(identityBinding.providerSubject, 'sub-2')),
      );
    expect(binding!.userId).toBe('usr_prov-oidc-2');
  });

  it('displayName 漂移 → 更新账号（身份源为准）', async () => {
    const first = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-3',
      userId: 'usr_prov-oidc-3',
      displayName: 'Old Name',
    });
    expect(first.displayName).toBe('Old Name');
    const second = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-3',
      userId: 'usr_prov-oidc-3',
      displayName: 'New Name',
    });
    expect(second.displayName).toBe('New Name');
    const [account] = await db
      .select({ displayName: userAccount.displayName })
      .from(userAccount)
      .where(eq(userAccount.id, 'usr_prov-oidc-3'));
    expect(account!.displayName).toBe('New Name');
  });

  it('email 显式同步：首次携带 → 落库；二次不传 → 不动；显式 null → 清除', async () => {
    await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-4',
      userId: 'usr_prov-oidc-4',
      displayName: 'Email Sync',
      email: 'sync@example.com',
    });
    // 不传 email → 保持
    const keep = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-4',
      userId: 'usr_prov-oidc-4',
      displayName: 'Email Sync',
    });
    expect(keep.email).toBe('sync@example.com');
    // 显式 null → 清除
    const cleared = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-4',
      userId: 'usr_prov-oidc-4',
      displayName: 'Email Sync',
      email: null,
    });
    expect(cleared.email).toBeNull();
    const [account] = await db
      .select({ email: userAccount.email })
      .from(userAccount)
      .where(eq(userAccount.id, 'usr_prov-oidc-4'));
    expect(account!.email).toBeNull();
  });

  it('账号已存在但无 binding → 补 binding 复用（不重复建号）', async () => {
    // 预置本地风格账号（无 binding）；displayName 必须匹配 prov-% 清理前缀（跨 run 防残留）
    await db
      .insert(userAccount)
      .values({ id: 'usr_prov-existing', displayName: 'prov-existing', status: 'ACTIVE' });
    const user = await provisionExternalUser(db, {
      provider: 'oidc',
      providerSubject: 'sub-existing',
      userId: 'usr_prov-existing',
      displayName: 'Existing',
    });
    expect(user.id).toBe('usr_prov-existing');
    const [binding] = await db
      .select()
      .from(identityBinding)
      .where(
        and(
          eq(identityBinding.provider, 'oidc'),
          eq(identityBinding.providerSubject, 'sub-existing'),
        ),
      );
    expect(binding!.userId).toBe('usr_prov-existing');
  });

  it('LDAP 场景（provider=ldap, subject=工号, id=工号）等值建号', async () => {
    const user = await provisionExternalUser(db, {
      provider: 'ldap',
      providerSubject: 'E10086',
      userId: 'E10086',
      displayName: 'Ldap User',
    });
    expect(user.id).toBe('E10086');
    // LDAP 调用不带 email → 账号 email 为 null 且保持
    expect(user.email).toBeNull();
  });

  it('T27：OIDC 重复登录（同 subject 两轮完整 provision）→ 账号与 binding 恒 1 条', async () => {
    // 模拟同一 OIDC 用户两次回调（M1 ACCESS_POLICY=open 直通 ACTIVE，env 层已拒非 open）
    for (let i = 0; i < 2; i += 1) {
      await provisionExternalUser(db, {
        provider: 'oidc',
        providerSubject: 'sub-repeat',
        userId: `usr_prov-oidc-repeat-${i}`,
        displayName: 'Repeat User',
      });
    }
    const [acctCount] = await db
      .select({ total: count() })
      .from(userAccount)
      .where(eq(userAccount.id, 'usr_prov-oidc-repeat-0'));
    expect(acctCount!.total).toBe(1);
    const [bindCount] = await db
      .select({ total: count() })
      .from(identityBinding)
      .where(
        and(
          eq(identityBinding.provider, 'oidc'),
          eq(identityBinding.providerSubject, 'sub-repeat'),
        ),
      );
    expect(bindCount!.total).toBe(1);
    // binding 归属首轮 id（非第二轮参数）
    const [binding] = await db
      .select({ userId: identityBinding.userId })
      .from(identityBinding)
      .where(
        and(
          eq(identityBinding.provider, 'oidc'),
          eq(identityBinding.providerSubject, 'sub-repeat'),
        ),
      );
    expect(binding!.userId).toBe('usr_prov-oidc-repeat-0');
    // 第二轮建的孤儿账号不应存在
    const [orphan] = await db
      .select({ id: userAccount.id })
      .from(userAccount)
      .where(eq(userAccount.id, 'usr_prov-oidc-repeat-1'));
    expect(orphan).toBeUndefined();
  });
});
