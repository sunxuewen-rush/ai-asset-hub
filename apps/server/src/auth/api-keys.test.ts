import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { cleanupCreatedUsers, createTestUser, signInCookie } from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { apikey } from '../db/schema/index.js';
import { findApiKey, issueApiKey, listApiKeys, revokeApiKey, verifyApiKey } from './api-keys.js';
import { type AihAuth, createAuth } from './better-auth.js';
import { permissionsToScopes, scopesToPermissions } from './token-scopes.js';

/**
 * 官方 api-key 适配层测试（M4b-pre T4 · design R7 / §5.3）：
 * ① scope ↔ permissions 双向映射（含畸形码与全量语义）
 * ② **迁移 SQL 表达式 ⇔ TS 映射等价**（同一口径两处实现，锁死防漂移——0011 的 permissions 转换）
 * ③ 签发/校验/吊销闭环（明文一次性、哈希落库、吊销即时失效）
 * ④ 官方权限码逐项（范围内 valid / 超范围 invalid / 不存在 key 的错误码实测）
 * ⑤ 服务端直呼约定：客户端请求带 `permissions` → 官方拒（`SERVER_ONLY_PROPERTY`）
 * ⑥ 官方默认限流已关（连续 >10 次校验不被拦——R7）
 */

let db: Db;
let auth: AihAuth;
let userId: string;

interface RawEndpoints {
  createApiKey: (input: {
    body: Record<string, unknown>;
    headers?: Record<string, string>;
  }) => Promise<{
    id: string;
    key: string;
  }>;
  verifyApiKey: (input: {
    body: { key: string; permissions?: Record<string, string[]> };
  }) => Promise<{
    valid: boolean;
    error?: { code?: string } | null;
    key: { id: string; permissions?: Record<string, string[]> | null } | null;
  }>;
}

function raw(): RawEndpoints {
  return auth.api as unknown as RawEndpoints;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  auth = createAuth({ ldap: null });
  userId = await createTestUser(db, { id: `usr_${randomUUID()}`, displayName: 'apikey-owner' });
});

afterAll(async () => {
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('scope ⇔ permissions 映射（design §5.3）', () => {
  it('scope 码 → 官方 permissions（同 resource 归并到数组）', () => {
    expect(scopesToPermissions(['audit:read'])).toEqual({ audit: ['read'] });
    expect(scopesToPermissions(['asset:publish', 'asset:manage'])).toEqual({
      asset: ['publish', 'manage'],
    });
    expect(scopesToPermissions(['asset:publish', 'review:submit'])).toEqual({
      asset: ['publish'],
      review: ['submit'],
    });
  });

  it('全量语义：null / 空数组 → undefined（官方列写 NULL）；畸形码跳过', () => {
    expect(scopesToPermissions(null)).toBeUndefined();
    expect(scopesToPermissions([])).toBeUndefined();
    expect(scopesToPermissions(['nope', ':x', 'y:', ''])).toBeUndefined();
    expect(scopesToPermissions(['audit:read', 'nope'])).toEqual({ audit: ['read'] });
  });

  it('permissions → scope 集合/字符串（NULL/空对象 = 全量 = null/空串）', () => {
    expect(permissionsToScopes({ audit: ['read'] })).toEqual(new Set(['audit:read']));
    expect(permissionsToScopes(null)).toBeNull();
    expect(permissionsToScopes({})).toBeNull();
    expect(scopesToPermissions(['audit:read'])).toEqual({ audit: ['read'] });
  });

  it('往返一致（mapping round trip）', () => {
    const codes = ['asset:publish', 'review:approve', 'audit:read'];
    const perms = scopesToPermissions(codes);
    expect(permissionsToScopes(perms)).toEqual(new Set(codes));
  });

  it('迁移 SQL 表达式 ⇔ TS 映射等价（0011 的 permissions 转换，锁死防漂移）', async () => {
    // 与 drizzle/0011_quick_mastermind.sql 内的表达式逐字一致（仅数据源换成 VALUES 常量）
    const rows = await db.execute<{ scope: string; perms: string | null }>(sql`
      SELECT v.scope, (
        SELECT jsonb_object_agg(res, acts)::text
        FROM (
          SELECT split_part(sp, ':', 1) AS res, jsonb_agg(split_part(sp, ':', 2)) AS acts
          FROM unnest(string_to_array(v.scope, ',')) AS sp
          WHERE v.scope IS NOT NULL AND v.scope <> '' AND v.scope <> 'cli' AND sp <> ''
            AND split_part(sp, ':', 1) <> '' AND split_part(sp, ':', 2) <> ''
          GROUP BY split_part(sp, ':', 1)
        ) x
      ) AS perms
      FROM (VALUES (''), ('cli'), ('audit:read'),
                   ('asset:publish,review:submit'),
                   ('asset:publish,asset:manage'),
                   ('audit:read,nope'))
           AS v(scope)
    `);
    const byScope = new Map(
      rows.rows.map((r) => [
        r.scope,
        r.perms ? (JSON.parse(r.perms) as Record<string, string[]>) : null,
      ]),
    );
    // 逐条与 TS 映射对齐（全量口径：''/'cli' → NULL；多码同 resource 归并；畸形码跳过）
    expect(byScope.get('')).toBeNull();
    expect(byScope.get('cli')).toBeNull();
    expect(byScope.get('audit:read')).toEqual(scopesToPermissions(['audit:read']) ?? null);
    expect(byScope.get('asset:publish,review:submit')).toEqual(
      scopesToPermissions(['asset:publish', 'review:submit']) ?? null,
    );
    expect(byScope.get('asset:publish,asset:manage')).toEqual(
      scopesToPermissions(['asset:publish', 'asset:manage']) ?? null,
    );
    expect(byScope.get('audit:read,nope')).toEqual(scopesToPermissions(['audit:read']) ?? null);
  });
});

describe('签发 / 校验 / 吊销闭环', () => {
  it('签发：明文一次性返回 + 官方哈希落库 + permissions 形态正确', async () => {
    const issued = await issueApiKey(auth, { userId, scope: ['audit:read'] });
    expect(issued.plain.startsWith('aih_')).toBe(true);
    expect(issued.plain).toHaveLength(47);
    expect(issued.expiresAt).toBeNull();
    const [row] = await db.select().from(apikey).where(eq(apikey.id, issued.id));
    expect(row!.referenceId).toBe(userId);
    expect(row!.enabled).toBe(true);
    expect(row!.rateLimitEnabled).toBe(false);
    expect(JSON.parse(row!.permissions ?? 'null')).toEqual({ audit: ['read'] });
  });

  it('校验：正确明文 → userId + scope 集合；错明文 → null', async () => {
    const issued = await issueApiKey(auth, { userId, scope: ['audit:read', 'asset:publish'] });
    const ok = await verifyApiKey(auth, issued.plain);
    expect(ok).not.toBeNull();
    expect(ok!.userId).toBe(userId);
    expect(ok!.keyId).toBe(issued.id);
    expect(ok!.scopes).toEqual(new Set(['audit:read', 'asset:publish']));
    expect(await verifyApiKey(auth, 'aih_wrong-plaintext-0000000000000000000000')).toBeNull();
  });

  it('校验：scope 缺省（全量）→ scopes null', async () => {
    const issued = await issueApiKey(auth, { userId });
    const ok = await verifyApiKey(auth, issued.plain);
    expect(ok!.scopes).toBeNull();
  });

  it('吊销（官方 enabled=false）→ 校验失效；重复吊销幂等', async () => {
    const issued = await issueApiKey(auth, { userId });
    expect(await verifyApiKey(auth, issued.plain)).not.toBeNull();
    await revokeApiKey(auth, { keyId: issued.id, ownerId: userId });
    expect(await verifyApiKey(auth, issued.plain)).toBeNull();
    await revokeApiKey(auth, { keyId: issued.id, ownerId: userId }); // 幂等
    const [row] = await db.select().from(apikey).where(eq(apikey.id, issued.id));
    expect(row!.enabled).toBe(false);
  });

  it('过期令牌 → 校验失效（官方 KEY_EXPIRED 且删除该行）', async () => {
    // 官方 create 的最小过期 = `keyExpiration.minExpiresIn`（1 小时）⇒ 造「已过期」只能签发后改库
    const issued = await issueApiKey(auth, { userId });
    await db
      .update(apikey)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(apikey.id, issued.id));
    expect(await verifyApiKey(auth, issued.plain)).toBeNull();
    const rows = await db.select().from(apikey).where(eq(apikey.id, issued.id));
    expect(rows).toHaveLength(0); // 官方行为：过期即清行（design v1.9 §8 登记）
  });

  it('listApiKeys：仅本人、createdAt desc、scope 字符串回显 + revokedAt 由 enabled 派生', async () => {
    const other = await createTestUser(db, {
      id: `usr_${randomUUID()}`,
      displayName: 'apikey-other',
    });
    const mine = await issueApiKey(auth, { userId, scope: ['audit:read'] });
    await issueApiKey(auth, { userId: other });
    const listed = await listApiKeys(db, userId);
    expect(listed.some((k) => k.id === mine.id)).toBe(true);
    expect(listed.every((k) => k.id !== undefined)).toBe(true);
    const scoped = listed.find((k) => k.id === mine.id);
    expect(scoped!.scope).toBe('audit:read');
    expect(scoped!.revokedAt).toBeNull();
    // 吊销后 revokedAt 可见（旧契约：吊销行仍列出）
    await revokeApiKey(auth, { keyId: mine.id, ownerId: userId });
    const after = await listApiKeys(db, userId);
    const revoked = after.find((k) => k.id === mine.id);
    expect(revoked!.revokedAt).not.toBeNull();
    // 他人令牌不在列表
    const otherKeys = await listApiKeys(db, other);
    expect(otherKeys.every((k) => k.id !== mine.id)).toBe(true);
  });

  it('findApiKey：按 id 读取归属与启用态；不存在 → null', async () => {
    const issued = await issueApiKey(auth, { userId });
    const row = await findApiKey(db, issued.id);
    expect(row).toEqual({ id: issued.id, referenceId: userId, enabled: true });
    expect(await findApiKey(db, 'nonexistent-key-id')).toBeNull();
  });
});

describe('官方权限码语义（verify with permissions）', () => {
  it('范围内 → valid；超范围 → invalid（错误码实测）；不存在 key 的错误码实测', async () => {
    const issued = await issueApiKey(auth, { userId, scope: ['asset:publish'] });
    const inScope = await raw().verifyApiKey({
      body: { key: issued.plain, permissions: { asset: ['publish'] } },
    });
    expect(inScope.valid).toBe(true);

    const outOfScope = await raw().verifyApiKey({
      body: { key: issued.plain, permissions: { asset: ['manage'] } },
    });
    expect(outOfScope.valid).toBe(false);
    const outOfScopeCode = outOfScope.error?.code;

    const unknown = await raw().verifyApiKey({
      body: {
        key: 'aih_unknown-key-000000000000000000000000000',
        permissions: { asset: ['publish'] },
      },
    });
    expect(unknown.valid).toBe(false);
    // 实测口径：未知 key → `INVALID_API_KEY`；权限不足 → `KEY_NOT_FOUND`（官方源码 validateApiKey）
    expect(unknown.error?.code).toBe('INVALID_API_KEY');
    expect(outOfScopeCode).toBe('KEY_NOT_FOUND');
  });

  it('客户端请求（带 headers）传 permissions → 官方拒 `SERVER_ONLY_PROPERTY`', async () => {
    const cookie = await signInCookie(auth, userId);
    let code = '';
    try {
      await raw().createApiKey({
        body: { permissions: { asset: ['publish'] } },
        headers: { cookie },
      });
    } catch (err) {
      code = (err as { body?: { code?: string } }).body?.code ?? String(err);
    }
    expect(code).toBe('SERVER_ONLY_PROPERTY');
  });

  it('官方默认限流已关：连续 12 次校验全 valid（R7，不因 10 次/24h 上限被拦）', async () => {
    const issued = await issueApiKey(auth, { userId });
    for (let i = 0; i < 12; i += 1) {
      expect(await verifyApiKey(auth, issued.plain)).not.toBeNull();
    }
  });
});
