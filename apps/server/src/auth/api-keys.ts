import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { apikey } from '../db/schema/index.js';
import type { AihAuth } from './better-auth.js';
import {
  permissionsToScopeString,
  permissionsToScopes,
  scopesToPermissions,
} from './token-scopes.js';

/**
 * 官方 api-key 插件薄适配层（M4b-pre T4 · design R7/§5.3）。
 *
 * 为什么不直接调官方端点：官方 `verifyApiKey` 是 **serverOnly** 端点，`createApiKey`/`updateApiKey`
 * 在「非 client request」（服务端直呼，不带 `headers`）时才允许传 server-only 属性（`permissions` /
 * `rateLimitEnabled`）并按 `body.userId` 归属（源码：`@better-auth/api-key` `create-api-key.ts:733-735`
 * `isClientRequest = ctx.request || ctx.headers`；`verify-api-key.ts` `createAuthEndpoint.serverOnly`）。
 * 本层把这一调用姿势收口在一处，路由层只消费项目语义（scope 码 / 明文一次性返回 / 幂等吊销）。
 *
 * 语义映射（design §5.3 逐条）：
 * - scope 码 ↔ 官方 `permissions`（`{asset:['publish']}`）；全量 = `permissions NULL`
 * - 吊销 = 官方 `enabled=false`（官方校验链对此抛 `KEY_DISABLED` ⇒ 令牌失效；**保留行**以便列表可见）
 * - 明文只在本层一次性回传（官方负责 `base64url(sha256(明文))` 落库）
 */

/** 官方实例上本批消费的端点面（局部窄化；`declaration:true` 下实例类型不可命名——T1 口径） */
interface ApiKeyEndpoints {
  createApiKey: (input: {
    body: {
      userId: string;
      expiresIn?: number | null;
      permissions?: Record<string, string[]>;
      rateLimitEnabled?: boolean;
    };
  }) => Promise<{ id: string; key: string; expiresAt: Date | string | null }>;
  updateApiKey: (input: {
    body: { keyId: string; userId: string; enabled?: boolean };
  }) => Promise<unknown>;
  verifyApiKey: (input: { body: { key: string } }) => Promise<{
    valid: boolean;
    error?: { code?: string; message?: string } | null;
    key: {
      id: string;
      referenceId?: string | null;
      permissions?: Record<string, string[]> | null;
    } | null;
  }>;
}

function endpoints(auth: AihAuth): ApiKeyEndpoints {
  return auth.api as unknown as ApiKeyEndpoints;
}

export interface IssuedApiKey {
  /** 官方 `apikey.id`（**文本**——旧 `api_token.id` 为自增整数；design §8 变更表登记） */
  id: string;
  /** 明文（**仅签发响应出现一次**；库中只有官方哈希） */
  plain: string;
  expiresAt: Date | null;
}

/**
 * 签发令牌（服务端直呼：不带 `headers` ⇒ 允许 `permissions`，按 `body.userId` 归属）。
 * `scope`：`null`/空 = 全量（`permissions` 不写）。
 */
export async function issueApiKey(
  auth: AihAuth,
  opts: { userId: string; expiresAt?: Date | null; scope?: readonly string[] | null },
): Promise<IssuedApiKey> {
  const expiresAt = opts.expiresAt ?? null;
  const expiresIn =
    expiresAt === null ? null : Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000));
  const permissions = scopesToPermissions(opts.scope ?? null);
  const created = await endpoints(auth).createApiKey({
    body: {
      userId: opts.userId,
      expiresIn,
      ...(permissions ? { permissions } : {}),
      /** R7：全局关限流（官方默认 10 次/24h 会改掉既有语义）——行级同口径写 false */
      rateLimitEnabled: false,
    },
  });
  return {
    id: created.id,
    plain: created.key,
    expiresAt: created.expiresAt === null ? null : new Date(created.expiresAt),
  };
}

/**
 * 吊销（幂等 · **不删行**）：官方 `enabled=false`。
 * `ownerId` 必须是该令牌的归属用户（官方 `update-api-key.ts` 强制 `apiKey.referenceId === user.id`；
 * 超管代吊销时传原归属者 id——归属校验在路由层已完成）。
 */
export async function revokeApiKey(
  auth: AihAuth,
  opts: { keyId: string; ownerId: string },
): Promise<void> {
  await endpoints(auth).updateApiKey({
    body: { keyId: opts.keyId, userId: opts.ownerId, enabled: false },
  });
}

export interface VerifiedApiKey {
  keyId: string;
  userId: string;
  /** scope 码集合；`null` = 全量（permissions 为 NULL） */
  scopes: Set<string> | null;
}

/**
 * 校验明文令牌（官方 serverOnly `verifyApiKey`）。
 * 无效 / 吊销（`KEY_DISABLED`）/ 过期（`KEY_EXPIRED`，官方同时**删除该行**）/ 未知 → `null`
 * （调用方按匿名处理，401 由路由层判定——与旧 `tokenAuthMiddleware` 语义一致）。
 */
export async function verifyApiKey(auth: AihAuth, plain: string): Promise<VerifiedApiKey | null> {
  const result = await endpoints(auth).verifyApiKey({ body: { key: plain } });
  if (!result.valid || !result.key) return null;
  const userId = result.key.referenceId ?? null;
  if (!userId) return null;
  return {
    keyId: result.key.id,
    userId,
    scopes: permissionsToScopes(result.key.permissions ?? null),
  };
}

export interface ApiKeyRow {
  id: string;
  scope: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * 本人令牌列表（旧契约形状：`{id, scope, expiresAt, revokedAt, createdAt}`，createdAt desc）。
 *
 * 实现说明（执行期偏离登记）：plan 原写「内部官方 create/list/delete」，**list 改直读官方表**——
 * 官方 `GET /api-key/list` 走 `sessionMiddleware`（需会话 cookie），而 `/api/tokens` 的 GET 允许
 * **令牌通道**（Bearer）访问，无会话 cookie ⇒ 改用 drizzle 读同一张官方表（只读，不涉安全决策），
 * 两通道行为一致且形状可精确映射。
 */
export async function listApiKeys(db: Db, userId: string): Promise<ApiKeyRow[]> {
  const rows = await db
    .select({
      id: apikey.id,
      permissions: apikey.permissions,
      expiresAt: apikey.expiresAt,
      enabled: apikey.enabled,
      updatedAt: apikey.updatedAt,
      createdAt: apikey.createdAt,
    })
    .from(apikey)
    .where(eq(apikey.referenceId, userId))
    .orderBy(desc(apikey.createdAt));
  return rows.map((row) => ({
    id: row.id,
    scope: permissionsToScopeString(parsePermissions(row.permissions)),
    expiresAt: row.expiresAt,
    /** 旧契约：吊销时间可见 ⇒ 由 `enabled=false` 时的 `updated_at` 表达 */
    revokedAt: row.enabled === false ? row.updatedAt : null,
    createdAt: row.createdAt,
  }));
}

/** 单行读取（吊销前的归属判定用；不返回明文与哈希） */
export async function findApiKey(
  db: Db,
  keyId: string,
): Promise<{ id: string; referenceId: string; enabled: boolean | null } | null> {
  const [row] = await db
    .select({ id: apikey.id, referenceId: apikey.referenceId, enabled: apikey.enabled })
    .from(apikey)
    .where(eq(apikey.id, keyId));
  return row ?? null;
}

/** 官方 `permissions` 列为 JSON 文本（源码 `JSON.stringify(permissions)`）——解析失败按「无限制」处理 */
function parsePermissions(raw: string | null): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, string[]>;
  } catch {
    return null;
  }
}
