import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { type AihAuth, hashPassword } from '../auth/better-auth.js';
import { ACCOUNT_ROLE } from '../auth/roles.js';
import type { Db } from '../db/client.js';
import { account, apiToken, auditLog, session, user } from '../db/schema/index.js';

/**
 * 认证测试夹具（M4b-pre T3 · design §6 范式 A/B）——取代自研 `sessions.createSession(...)`。
 *
 * 全程走**真实端点与真实表**（不 mock 官方件、不碰官方内部实现）：
 * 1. `createTestUser`：直写官方用户域表（`user` + `account(provider_id='credential')`）——
 *    与 `db/seed.ts` 同形态，口令哈希走注入官方的同一 scrypt
 * 2. `signInCookie`：调**官方插件端点** `sign-in/aih`（服务端直呼 + `asResponse: true`），
 *    从响应 `Set-Cookie` 取官方会话 cookie（cookie 名/签名/TTL 全由官方生成）
 * 3. `createSignedInUser`：1+2 一步到位
 *
 * 范式 B（按档位断言）：`createSignedInUser(..., { role: 100 })` 或 `setUserRole` —— 档位读库即生效。
 * 范式 C（令牌断言）：令牌类用例仍走服务端直呼签发（`http/tokens.ts`）。
 *
 * 注意：`auth` 必须是**被测 app 用的同一个实例**（`createApp({ auth })` 传同一对象），
 * 否则会话 cookie 的签名/config 可能与被测中间件不一致。
 */

/** 测试口令（≥8 字符） */
export const TEST_PASSWORD = 'test-password-1';

/**
 * 本进程内由夹具创建的账号 id 登记表（`cleanupCreatedUsers` 用）。
 * 动机：官方端点为服务器生成随机 id（不带测试前缀），按前缀清理必然漏网 ⇒ 残留会污染 dev 库，
 * 并让「只依赖自己造的数据」的断言失效（AGENTS.md 硬规则）。此处按「谁创建谁登记」收敛。
 */
const createdUserIds = new Set<string>();

/** 数值档位 → 库中档名（与 `roles.ts` 的映射同源；测试侧改档用） */
export function roleNameOf(level: number): string {
  if (level >= ACCOUNT_ROLE.SUPER_ADMIN) return 'superadmin';
  if (level >= ACCOUNT_ROLE.ADMIN) return 'admin';
  return 'user';
}

export interface TestUserOptions {
  /** 用户 id（缺省 `usr_<uuid>`） */
  id?: string;
  /** 数值档位（`ACCOUNT_ROLE.*`；缺省 USER） */
  role?: number;
  status?: 'ACTIVE' | 'PENDING' | 'DISABLED';
  displayName?: string;
  /** 登录名（缺省 = id） */
  username?: string;
  password?: string;
  /** 身份通道（'credential' 缺省；'ldap'/'oidc' 用于目录建号断言——不建口令行） */
  providerId?: string;
}

/** 直写官方用户域表建测试账号；返回用户 id */
export async function createTestUser(db: Db, options: TestUserOptions = {}): Promise<string> {
  const id = options.id ?? `usr_${randomUUID()}`;
  const username = options.username ?? id;
  const password = options.password ?? TEST_PASSWORD;
  const providerId = options.providerId ?? 'credential';

  await db.insert(user).values({
    id,
    name: options.displayName ?? id,
    // `user.email` NOT NULL + UNIQUE（官方表形态）⇒ 测试内确定性合成（非生产路径）
    email: `${id}@test.local`.toLowerCase(),
    emailVerified: true,
    status: options.status ?? 'ACTIVE',
    role: roleNameOf(options.role ?? ACCOUNT_ROLE.USER),
    username,
    displayUsername: username,
  });
  await db.insert(account).values({
    id: `acc_${randomUUID()}`,
    providerId,
    accountId: username,
    userId: id,
    ...(providerId === 'credential' ? { password: await hashPassword(password) } : {}),
  });
  createdUserIds.add(id);
  return id;
}

/** 改档位（数值 → 库中档名；测试侧「给某人升档」用） */
export async function setUserRole(db: Db, userId: string, level: number): Promise<void> {
  await db
    .update(user)
    .set({ role: roleNameOf(level) })
    .where(eq(user.id, userId));
}

/** 取官方会话 cookie 串（`better-auth.session_token=...`）；缺失即抛（测试内应视为断言失败） */
function extractSessionCookie(response: Response): string {
  const cookies = response.headers.getSetCookie();
  const entry = cookies.find((value) => value.startsWith('better-auth.session_token='));
  if (!entry) {
    throw new Error(`auth fixture: no session cookie in response (${response.status})`);
  }
  return entry.split(';')[0] ?? entry;
}

/**
 * 会话 cookie 缓存（key = 实例 + 登录名）。
 * 动机：同一测试文件里 `cookieFor(user)` 常被多个用例重复调用，每次都真登一次会：
 * ① 撞上目录插件的登录限流（20 次/15 分钟 —— 生产语义，不该为测试放宽）
 * ② 无谓地堆会话行。登录本身仍走真实端点（首次未命中缓存时）。
 */
const cookieCache = new Map<string, string>();

/** 登录取官方会话 cookie（官方插件端点，服务端直呼；进程内按实例+登录名缓存） */
export async function signInCookie(
  auth: AihAuth,
  username: string,
  password = TEST_PASSWORD,
): Promise<string> {
  const cacheKey = `${username}|${password}`;
  const cached = cookieCache.get(cacheKey);
  if (cached) return cached;
  const api = auth.api as unknown as {
    signInAih: (input: {
      body: { username: string; password: string };
      asResponse: true;
    }) => Promise<Response>;
  };
  const response = await api.signInAih({ body: { username, password }, asResponse: true });
  if (!response.ok) {
    throw new Error(`auth fixture: sign-in failed with ${response.status}`);
  }
  const cookie = extractSessionCookie(response);
  cookieCache.set(cacheKey, cookie);
  return cookie;
}

/** 清空 cookie 缓存（需要「重新登录」语义的用例可调用） */
export function resetCookieCache(): void {
  cookieCache.clear();
}

/** 建号 + 登录取 cookie（范式 A/B 主入口） */
export async function createSignedInUser(
  db: Db,
  auth: AihAuth,
  options: TestUserOptions = {},
): Promise<{ id: string; cookie: string }> {
  const id = await createTestUser(db, options);
  const cookie = await signInCookie(auth, options.username ?? id, options.password);
  return { id, cookie };
}

/** 该用户的会话行数（会话落库断言用） */
export async function countSessions(db: Db, userId: string): Promise<number> {
  const rows = await db.select({ id: session.id }).from(session).where(eq(session.userId, userId));
  return rows.length;
}

/**
 * 清理本进程内夹具创建的账号（含其审计行、会话/凭据级联）。
 * 在测试文件的 `afterAll` 调用一次即可——取代按前缀猜 id 的清理写法（后者对官方生成的随机 id 无效）。
 */
export async function cleanupCreatedUsers(db: Db): Promise<void> {
  const ids = [...createdUserIds];
  createdUserIds.clear();
  if (ids.length === 0) return;
  // FK：audit_log.actor_id → user（NO ACTION）⇒ 先摘审计行；session/account 级联
  await db.delete(auditLog).where(inArray(auditLog.actorId, ids));
  // 令牌表（过渡期仍在 api_token）引用 user ⇒ 先删，否则清理被 FK 拦下
  await db.delete(apiToken).where(inArray(apiToken.userId, ids));
  await db.delete(user).where(inArray(user.id, ids));
}
