import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { identityBinding, userAccount } from '../db/schema/index.js';

/**
 * 外部用户公共 provision（T26，05 §3.1 第 5 步抽公共：LDAP + OIDC 共用）：
 * identity_binding(provider + providerSubject) 唯一定位外部身份——
 * 1. 已绑定 → 复用绑定账号（防同一外部身份双账号，S10 语义）
 * 2. 未绑定且 userId 对应账号已存在 → 建 binding 复用现成账号
 * 3. 未绑定且无账号 → 事务建号（ACTIVE，外部身份可信）+ binding
 * 并发兜底：binding UNIQUE 冲突（23505）→ 重查复用，不重复建号。
 */

export interface ProvisionInput {
  /** 身份源（'ldap' / 'oidc'；多 IdP 即多 provider 值） */
  provider: string;
  /** 外部身份 subject（LDAP 工号 / OIDC sub） */
  providerSubject: string;
  /** 平台账号 id（调用方决定：LDAP 传映射值，OIDC 传生成的 usr_xxx） */
  userId: string;
  displayName: string;
  email?: string | null;
}

export interface ProvisionedUser {
  id: string;
  displayName: string;
  email: string | null;
  /** true = 本次调用完成建号/重建（T17：oidc.provisioned 埋点判别） */
  created: boolean;
}

export async function provisionExternalUser(
  db: Db,
  input: ProvisionInput,
): Promise<ProvisionedUser> {
  const { provider, providerSubject, userId, displayName, email } = input;

  // —— 1. binding 命中 → 复用绑定账号 ——
  const bound = await findBinding(db, provider, providerSubject);
  const targetId = bound?.userId ?? userId;

  const existing = await db
    .select({ id: userAccount.id, email: userAccount.email })
    .from(userAccount)
    .where(eq(userAccount.id, targetId));

  let created = false;
  if (!bound) {
    if (existing.length === 0) {
      // —— 3. 全新：事务建号 + binding ——
      try {
        await db.transaction(async (tx) => {
          await tx.insert(userAccount).values({
            id: userId,
            displayName,
            email: email ?? null,
            status: 'ACTIVE', // 外部身份可信（05 §3.1），无平台角色
          });
          await tx.insert(identityBinding).values({ provider, providerSubject, userId });
        });
        created = true; // 事务成功 = 本次完成建号（T17：provision 埋点判别）
      } catch (err) {
        // 并发同 subject 双飞：binding UNIQUE(provider, subject) 冲突 → 重查复用
        if ((err as { cause?: { code?: string } }).cause?.code === '23505') {
          const reBound = await findBinding(db, provider, providerSubject);
          if (reBound) return fetchAndSync(db, reBound.userId, displayName, email);
        }
        throw err;
      }
    } else {
      // —— 2. 账号已存在（未绑定）→ 补 binding 复用（不重复建号）——
      await db.insert(identityBinding).values({ provider, providerSubject, userId: targetId });
    }
  } else if (existing.length === 0) {
    // binding 指向的账号已被删（异常态）→ 重建账号不重建 binding
    created = true; // 重建了账号行（异常态修复——属建号动作）
    await db.insert(userAccount).values({
      id: targetId,
      displayName,
      email: email ?? null,
      status: 'ACTIVE',
    });
  }

  return { ...(await fetchAndSync(db, targetId, displayName, email)), created };
}

function findBinding(db: Db, provider: string, providerSubject: string) {
  const rows = db
    .select({ userId: identityBinding.userId })
    .from(identityBinding)
    .where(
      and(
        eq(identityBinding.provider, provider),
        eq(identityBinding.providerSubject, providerSubject),
      ),
    )
    .limit(1);
  return rows.then((r) => r[0]);
}

/** 拉取账号 + 身份字段同步（重复登录时 displayName/email 漂移更新） */
async function fetchAndSync(
  db: Db,
  id: string,
  displayName: string,
  email?: string | null,
): Promise<ProvisionedUser> {
  const [account] = await db
    .select({ id: userAccount.id, displayName: userAccount.displayName, email: userAccount.email })
    .from(userAccount)
    .where(eq(userAccount.id, id));
  if (!account) throw new Error(`provision: account ${id} missing after upsert`);

  const patch: { displayName?: string; email?: string | null } = {};
  if (account.displayName !== displayName) patch.displayName = displayName;
  // email 仅调用方显式传入时同步（LDAP 调用不传 → 不动 email，语义与旧实现等值；
  // 显式 null = 清除）
  if (email !== undefined && account.email !== email) patch.email = email;
  if (Object.keys(patch).length > 0) {
    await db.update(userAccount).set(patch).where(eq(userAccount.id, id));
  }
  return {
    id: account.id,
    created: false, // 复用/同步路径——非本次建号
    displayName,
    // 未同步（email 未传）→ 回读库值；同步过 → 输入收敛值
    email: email === undefined ? account.email : email,
  };
}
