/**
 * `/api/admin` 用户治理面（M4c-2 **T2** · 6 个薄端点）。
 *
 * 设计依据 = 批 design `2026-10-09-m4c2-user-governance-design.md` **§3.1 / §3.2 / §3.3 / §3.6**（v0.4）。
 *
 * **原则（批 design §3.1）**：数据面**全交官方**（服务端直呼 `auth.api.*` + **透传调用方 headers** ——
 * 官方 admin 端点的 `adminMiddleware` 靠会话 + `user:*` / `session:['revoke']` 权限码判定），
 * 本仓只做：守卫（`requireRole` 第二道在官方权限码之前）· 护栏 · 审计 · 中文码 · 出参归一。
 *
 * **两处我方只读 SQL（理由已写入文档 · 原则要求）**：
 * 1. `lastLoginAt` —— 官方 `list-users` **不返回**该字段，主 design R22 要求展示 ⇒ 对当页 userId 集合做
 *    一次 `max(session.created_at)` 聚合（**只读聚合，不替代官方数据面**）。
 * 2. **F270 一致性哨兵** —— 官方 `list-users` 把查询异常吞成 `{users:[],total:0}`（真码 `routes.mjs:378`）
 *    ⇒ 当官方 `total === 0` 时用**同一筛选条件**做一次我方 `count(*)` 交叉核对；我方 count > 0 ⇒
 *    判「官方静默吞错」⇒ **500 `user.list_failed`**（把静默空列表变显式失败）。仅在 total=0 时触发，
 *    避免与官方查询语义的细微差异导致误报。
 *
 * **筛选能力边界（**F294** · 2026-10-09 用户拍板「A」）**：官方单次仅容**一组 search**（`searchField`
 * 被 z.enum 限死 `email`\\|`name`）+ **一组 filter**（任意字段/操作符），二者 AND ⇒ 本服务端规则：
 * - `q` + `field=username` ⇒ 占用 filter 位；此时再给 `role`/`status` ⇒ **400 `request.invalid`**（互斥）
 * - `role` 与 `status` 同时给 ⇒ **400 `request.invalid`**（同占 filter 位）
 * - 其余 = search 位 + filter 位各一，放行
 * UI（T4）据同一规则禁用互斥控件（`field=username` 时角色 / 状态下拉禁用等）。
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { AUDIT_ACTIONS, type AuditWriter } from '../audit/audit.js';
import type { AihAuth } from '../auth/better-auth.js';
import { ACCOUNT_ROLE } from '../auth/rbac.js';
import { accountRoleOf, isRoleName, ROLE_LEVEL } from '../auth/roles.js';
import type { Db } from '../db/client.js';
import { session, user } from '../db/schema/index.js';
import { requireRole } from './auth-middleware.js';

export interface AdminUserRoutesDeps {
  db: Db;
  /** 官方实例（薄层直呼其 admin 插件端点 —— 先例 `http/oidc-routes.ts`） */
  auth: AihAuth;
  audit?: AuditWriter;
}

/** 官方用户出参（只取本面用到的字段） */
interface OfficialUser {
  id: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
}

/**
 * 官方 admin 插件端点面（`Auth` 类型不含插件端点 ⇒ **局部窄化**，
 * 先例 = `http/oidc-routes.ts` 的 `deps.auth.api as unknown as OidcSignInApi`）。
 * 官方入参与真码一一对应：`list-users`(`routes.mjs:322`) · `set-role`(`:43`) · `ban-user`(`:506`) ·
 * `unban-user`(`:447`) · `create-user`(`:133`) · `revoke-user-sessions`(`:710`)。
 */
interface OfficialAdminApi {
  listUsers(input: {
    headers: Headers;
    query: Record<string, unknown>;
  }): Promise<{ users: OfficialUser[]; total: number }>;
  setRole(input: { headers: Headers; body: { userId: string; role: string } }): Promise<unknown>;
  banUser(input: {
    headers: Headers;
    body: { userId: string; banReason?: string; banExpiresIn?: number };
  }): Promise<unknown>;
  unbanUser(input: { headers: Headers; body: { userId: string } }): Promise<unknown>;
  createUser(input: {
    headers: Headers;
    body: {
      email: string;
      password: string;
      name: string;
      role: string;
      data?: Record<string, unknown>;
    };
  }): Promise<{ user?: OfficialUser }>;
  revokeUserSessions(input: { headers: Headers; body: { userId: string } }): Promise<unknown>;
}

/** 薄层护栏错误码（批 design §3.6 · 由 T8 回填 `07` §4） */
export const userGuardCodes = {
  notFound: 'user.not_found',
  selfTargetForbidden: 'user.self_target_forbidden',
  roleEscalationForbidden: 'user.role_escalation_forbidden',
  lastSuperadminForbidden: 'user.last_superadmin_forbidden',
  usernameTaken: 'user.username_taken',
  listFailed: 'user.list_failed',
} as const;

export type UserGuardCode = (typeof userGuardCodes)[keyof typeof userGuardCodes];

/** 错误码 → HTTP 状态（我方窄映射；`request.invalid` 复用既有 400 先例 `http/admin.ts`） */
const GUARD_STATUS: Record<UserGuardCode, 400 | 403 | 404 | 409 | 500> = {
  'user.not_found': 404,
  'user.self_target_forbidden': 403,
  'user.role_escalation_forbidden': 403,
  'user.last_superadmin_forbidden': 403,
  'user.username_taken': 409,
  'user.list_failed': 500,
};

/** 官方 APIError 形态（`@better-auth/core/error`）—— 只读判定，不引入官方类型依赖 */
function asOfficialError(err: unknown): { status: number; code?: string; message?: string } | null {
  const e = err as {
    status?: unknown;
    statusCode?: unknown;
    body?: { code?: unknown; message?: unknown };
    message?: unknown;
  };
  const status =
    typeof e?.status === 'number'
      ? e.status
      : typeof e?.statusCode === 'number'
        ? e.statusCode
        : null;
  if (status === null || status < 400 || status > 599) return null;
  return {
    status,
    code: typeof e.body?.code === 'string' ? e.body.code : undefined,
    message:
      typeof e.body?.message === 'string'
        ? e.body.message
        : typeof e.message === 'string'
          ? e.message
          : undefined,
  };
}

/** 登录名规范（官方 username 插件小写归一 + 校验器 `/^[a-zA-Z0-9_.]+$/` 3–30 · F281） */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().min(1).max(120).optional(),
  field: z.enum(['username', 'name', 'email']).default('username'),
  role: z.string().trim().min(1).max(40).optional(),
  status: z.enum(['active', 'banned']).optional(),
  sort: z.enum(['username', 'name', 'email', 'role', 'createdAt']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

const createBodySchema = z.object({
  username: z.string().trim().regex(USERNAME_PATTERN, '登录名需 3–30 位字母/数字/下划线/点'),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  role: z.string().trim().min(1).max(40),
  password: z.string().min(8).max(128),
});

const roleBodySchema = z.object({ role: z.string().trim().min(1).max(40) });
const banBodySchema = z.object({
  reason: z.string().trim().max(200).optional(),
  /** 到期秒数（官方 `banExpiresIn`；缺省 = 永久封禁） */
  expiresIn: z
    .number()
    .int()
    .positive()
    .max(365 * 24 * 3600)
    .optional(),
});

/**
 * **F270 哨兵判定（纯函数 · 可单测）**。
 *
 * 官方 `list-users` 把查询异常吞成 `{ users: [], total: 0 }`（真码 `routes.mjs:378`）——
 * 本仓在官方 `total === 0` 时用同一筛选条件做一次我方 `count(*)` 交叉核对；
 * **仅当「官方空 + 我方有」** 才判为吞错（其余情况放行，避免与官方语义的细微差异造成误报）。
 */
export function listLooksSwallowed(
  officialTotal: number,
  officialCount: number,
  ownCount: number,
): boolean {
  return officialTotal === 0 && officialCount === 0 && ownCount > 0;
}

export function createAdminUserRoutes({ db, auth, audit }: AdminUserRoutesDeps): Hono {
  const app = new Hono();
  const api = auth.api as unknown as OfficialAdminApi;

  // 第一道：本仓档位门（快速失败 + 中文码）；第二道 = 官方 `user:*` / `session:['revoke']`
  app.use('*', requireRole(ACCOUNT_ROLE.ADMIN));

  /** 操作者身份（`requireRole` 已保证有会话；此处取 userId 供护栏判定） */
  const actorId = (headers: Headers): Promise<string | null> =>
    auth.api
      .getSession({ headers })
      .then((s) => (s?.user?.id as string | undefined) ?? null)
      .catch(() => null);

  const notBanned = sql`coalesce(${user.banned}, false) = false`;

  async function loadTarget(id: string) {
    const [row] = await db
      .select({ id: user.id, role: user.role, username: user.username })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return row ?? null;
  }

  async function countActiveSuperadmins(): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(user)
      .where(sql`${user.role} = 'superadmin' and ${notBanned}`);
    return row?.n ?? 0;
  }

  /** F270 哨兵用：按同一筛选条件数我方视角的命中行数（**只读**） */
  async function countMatching(d: z.infer<typeof listQuerySchema>): Promise<number> {
    const conds = [sql`true`];
    if (d.q) {
      if (d.field === 'username')
        conds.push(sql`coalesce(${user.username}, '') ilike ${`%${d.q}%`}`);
      else if (d.field === 'name') conds.push(sql`${user.name} ilike ${`%${d.q}%`}`);
      else conds.push(sql`${user.email} ilike ${`%${d.q}%`}`);
    } else {
      if (d.role) conds.push(sql`${user.role} = ${d.role}`);
      if (d.status) conds.push(sql`coalesce(${user.banned}, false) = ${d.status === 'banned'}`);
    }
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(user)
      .where(and(...conds));
    return row?.n ?? 0;
  }

  // ───────────────────────────── 列表（委托官方 `list-users`） ─────────────────────────────
  app.get('/users', async (c) => {
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        { code: 'request.invalid', message: parsed.error.issues[0]?.message ?? '参数不合法' },
        400,
      );
    }
    const d = parsed.data;

    // 筛选位冲突（F294：官方单次仅一组 search + 一组 filter）⇒ 显式 400，不静默丢条件
    const usernameSearch = Boolean(d.q) && d.field === 'username';
    if (usernameSearch && (d.role || d.status)) {
      return c.json(
        {
          code: 'request.invalid',
          message: '工号搜索与角色 / 状态筛选互斥（官方单次查询仅容一组过滤条件）',
        },
        400,
      );
    }
    if (d.role && d.status) {
      return c.json(
        { code: 'request.invalid', message: '角色与状态筛选互斥（官方单次查询仅容一组过滤条件）' },
        400,
      );
    }

    const officialQuery: Record<string, unknown> = {
      limit: d.limit,
      offset: d.offset,
      sortBy: d.sort,
      sortDirection: d.dir,
    };
    if (d.q) {
      if (usernameSearch) {
        officialQuery.filterField = 'username';
        officialQuery.filterOperator = 'contains';
        officialQuery.filterValue = d.q;
      } else {
        officialQuery.searchValue = d.q;
        officialQuery.searchField = d.field;
      }
    } else if (d.role) {
      officialQuery.filterField = 'role';
      officialQuery.filterOperator = 'eq';
      officialQuery.filterValue = d.role;
    } else if (d.status) {
      officialQuery.filterField = 'banned';
      officialQuery.filterOperator = 'eq';
      officialQuery.filterValue = d.status === 'banned';
    }

    let result: { users: OfficialUser[]; total: number };
    try {
      result = await api.listUsers({ headers: c.req.raw.headers, query: officialQuery });
    } catch (err) {
      const official = asOfficialError(err);
      if (official) {
        return c.json(
          { code: official.code ?? 'request.invalid', message: official.message ?? '列表查询失败' },
          official.status as 400 | 403,
        );
      }
      throw err;
    }

    // F270 哨兵：官方静默空列表 ⇒ 我方交叉核对（**仅**「官方空 + 我方有」触发，避免语义差异误报）
    const ownCount = await countMatching(d);
    if (listLooksSwallowed(result.total ?? 0, result.users?.length ?? 0, ownCount)) {
      return c.json(
        {
          code: userGuardCodes.listFailed,
          message: `列表查询结果不一致（官方 total=0 · 本仓 count=${ownCount}）`,
        },
        GUARD_STATUS['user.list_failed'],
      );
    }

    // `lastLoginAt`：官方不返回 ⇒ 当页 userId 集合一次只读聚合（批 design §3.3）
    const ids = (result.users ?? []).map((u) => u.id);
    const lastRows = ids.length
      ? await db
          .select({ userId: session.userId, last: sql<string | null>`max(${session.createdAt})` })
          .from(session)
          .where(inArray(session.userId, ids))
          .groupBy(session.userId)
      : [];
    const lastLogin = new Map(lastRows.map((r) => [r.userId ?? '', r.last]));

    return c.json({
      items: (result.users ?? []).map((u) => ({
        userId: u.id,
        username: u.username ?? null,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        banned: u.banned === true,
        banReason: u.banReason ?? null,
        banExpires: u.banExpires ? new Date(u.banExpires).toISOString() : null,
        lastLoginAt: lastLogin.get(u.id)
          ? new Date(lastLogin.get(u.id) as string).toISOString()
          : null,
      })),
      total: result.total ?? 0,
    });
  });

  // ───────────────────────────── 建号（委托官方 `create-user`） ─────────────────────────────
  app.post('/users', async (c) => {
    const parsed = createBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { code: 'request.invalid', message: parsed.error.issues[0]?.message ?? '参数不合法' },
        400,
      );
    }
    const body = parsed.data;
    if (!isRoleName(body.role)) {
      return c.json({ code: 'request.invalid', message: `未知档位：${body.role}` }, 400);
    }
    const actor = await actorId(c.req.raw.headers);
    const actorRole = await loadTarget(actor ?? '');
    const actorLevel = accountRoleOf(actorRole?.role) ?? 0;
    if (ROLE_LEVEL[body.role] > actorLevel) {
      return c.json(
        { code: userGuardCodes.roleEscalationForbidden, message: '不可建出高于自己档位的账号' },
        GUARD_STATUS['user.role_escalation_forbidden'],
      );
    }

    const username = body.username.toLowerCase();
    const [taken] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(coalesce(${user.username}, '')) = ${username}`)
      .limit(1);
    if (taken) {
      return c.json(
        { code: userGuardCodes.usernameTaken, message: `登录名已被占用：${username}` },
        GUARD_STATUS['user.username_taken'],
      );
    }

    let created: OfficialUser | undefined;
    try {
      // 登录名经官方 `data` 与账号**同一次写入**（官方 create-user 合并 `data` 进 user 行
      // 真码 `plugins/admin/routes.mjs:133` 段：`const { role: dataRole, ...userData } = ctx.body.data ?? {}`）
      // ⇒ 无「已建号但登录名未落」的半成品窗口（优于「建号后直写」· 批 design §3.2 意图相同）
      const res = await api.createUser({
        headers: c.req.raw.headers,
        body: {
          email: body.email.toLowerCase(),
          password: body.password,
          name: body.name,
          role: body.role,
          data: { username, displayUsername: username },
        },
      });
      created = res?.user;
    } catch (err) {
      const official = asOfficialError(err);
      if (official) {
        return c.json(
          { code: official.code ?? 'request.invalid', message: official.message ?? '建号失败' },
          official.status as 400 | 403 | 409,
        );
      }
      throw err;
    }

    if (!created?.id) {
      // 官方未回用户标识 ⇒ 不静默成功（可能已被官方吞错）；不写审计，显式失败
      return c.json({ code: 'request.invalid', message: '建号未返回用户标识' }, 500);
    }

    await audit?.({
      actorId: actor,
      action: AUDIT_ACTIONS.userCreate,
      targetType: 'user',
      targetId: created.id,
      detail: { username, role: body.role },
    });
    return c.json({ userId: created.id }, 201);
  });

  // ───────────────────────────── 改角色（委托官方 `set-role`） ─────────────────────────────
  app.patch('/users/:id/role', async (c) => {
    const id = c.req.param('id');
    const parsed = roleBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success || !isRoleName(parsed.data.role)) {
      return c.json({ code: 'request.invalid', message: '参数不合法' }, 400);
    }
    const next = parsed.data.role;
    const target = await loadTarget(id);
    if (!target) {
      return c.json(
        { code: userGuardCodes.notFound, message: '用户不存在' },
        GUARD_STATUS['user.not_found'],
      );
    }
    const actor = await actorId(c.req.raw.headers);
    if (actor && actor === id) {
      return c.json(
        { code: userGuardCodes.selfTargetForbidden, message: '不可修改自己的档位' },
        GUARD_STATUS['user.self_target_forbidden'],
      );
    }
    const actorLevel = accountRoleOf((await loadTarget(actor ?? ''))?.role) ?? 0;
    if (ROLE_LEVEL[next] > actorLevel) {
      return c.json(
        { code: userGuardCodes.roleEscalationForbidden, message: '不可把他人提到高于自己的档位' },
        GUARD_STATUS['user.role_escalation_forbidden'],
      );
    }
    // 末位超管：降级（脱离 superadmin）⇒ 拒绝
    if (
      target.role === 'superadmin' &&
      next !== 'superadmin' &&
      (await countActiveSuperadmins()) <= 1
    ) {
      return c.json(
        {
          code: userGuardCodes.lastSuperadminForbidden,
          message: '不可降级最后一个超管（防全站失管）',
        },
        GUARD_STATUS['user.last_superadmin_forbidden'],
      );
    }

    try {
      await api.setRole({ headers: c.req.raw.headers, body: { userId: id, role: next } });
    } catch (err) {
      const official = asOfficialError(err);
      if (official) {
        return c.json(
          { code: official.code ?? 'request.invalid', message: official.message ?? '改角色失败' },
          official.status as 400 | 403,
        );
      }
      throw err;
    }

    await audit?.({
      actorId: actor,
      action: AUDIT_ACTIONS.userRoleChange,
      targetType: 'user',
      targetId: id,
      detail: { from: target.role ?? null, to: next },
    });
    return c.json({ ok: true });
  });

  // ───────────────────────────── 封禁 / 解封（委托官方 `ban-user` / `unban-user`） ─────────────────────────────
  app.post('/users/:id/ban', async (c) => {
    const id = c.req.param('id');
    const parsed = banBodySchema.safeParse((await c.req.json().catch(() => ({}))) ?? {});
    if (!parsed.success) {
      return c.json(
        { code: 'request.invalid', message: parsed.error.issues[0]?.message ?? '参数不合法' },
        400,
      );
    }
    const target = await loadTarget(id);
    if (!target) {
      return c.json(
        { code: userGuardCodes.notFound, message: '用户不存在' },
        GUARD_STATUS['user.not_found'],
      );
    }
    const actor = await actorId(c.req.raw.headers);
    if (actor && actor === id) {
      return c.json(
        { code: userGuardCodes.selfTargetForbidden, message: '不可封禁自己' },
        GUARD_STATUS['user.self_target_forbidden'],
      );
    }
    if (target.role === 'superadmin' && (await countActiveSuperadmins()) <= 1) {
      return c.json(
        {
          code: userGuardCodes.lastSuperadminForbidden,
          message: '不可封禁最后一个超管（防全站失管）',
        },
        GUARD_STATUS['user.last_superadmin_forbidden'],
      );
    }

    try {
      await api.banUser({
        headers: c.req.raw.headers,
        body: {
          userId: id,
          ...(parsed.data.reason ? { banReason: parsed.data.reason } : {}),
          ...(parsed.data.expiresIn ? { banExpiresIn: parsed.data.expiresIn } : {}),
        },
      });
    } catch (err) {
      const official = asOfficialError(err);
      if (official) {
        return c.json(
          { code: official.code ?? 'request.invalid', message: official.message ?? '封禁失败' },
          official.status as 400 | 403,
        );
      }
      throw err;
    }

    await audit?.({
      actorId: actor,
      action: AUDIT_ACTIONS.userBan,
      targetType: 'user',
      targetId: id,
      detail: { reason: parsed.data.reason ?? null, expiresIn: parsed.data.expiresIn ?? null },
    });
    return c.json({ ok: true });
  });

  app.post('/users/:id/unban', async (c) => {
    const id = c.req.param('id');
    const target = await loadTarget(id);
    if (!target) {
      return c.json(
        { code: userGuardCodes.notFound, message: '用户不存在' },
        GUARD_STATUS['user.not_found'],
      );
    }
    const actor = await actorId(c.req.raw.headers);

    try {
      await api.unbanUser({ headers: c.req.raw.headers, body: { userId: id } });
    } catch (err) {
      const official = asOfficialError(err);
      if (official) {
        return c.json(
          { code: official.code ?? 'request.invalid', message: official.message ?? '解封失败' },
          official.status as 400 | 403,
        );
      }
      throw err;
    }

    await audit?.({
      actorId: actor,
      action: AUDIT_ACTIONS.userUnban,
      targetType: 'user',
      targetId: id,
      detail: {},
    });
    return c.json({ ok: true });
  });

  // ─────────────────── 吊销全部会话（委托官方 `revoke-user-sessions` · 不给会话列表 R20） ───────────────────
  app.post('/users/:id/sessions/revoke', async (c) => {
    const id = c.req.param('id');
    const target = await loadTarget(id);
    if (!target) {
      return c.json(
        { code: userGuardCodes.notFound, message: '用户不存在' },
        GUARD_STATUS['user.not_found'],
      );
    }
    const actor = await actorId(c.req.raw.headers);

    try {
      // 官方只返回 `{ success: true }`（不含数量）⇒ 本仓归一 `{ ok: true }`，不给会话数量
      await api.revokeUserSessions({ headers: c.req.raw.headers, body: { userId: id } });
    } catch (err) {
      const official = asOfficialError(err);
      if (official) {
        return c.json(
          { code: official.code ?? 'request.invalid', message: official.message ?? '吊销会话失败' },
          official.status as 400 | 403,
        );
      }
      throw err;
    }

    await audit?.({
      actorId: actor,
      action: AUDIT_ACTIONS.userSessionRevoke,
      targetType: 'user',
      targetId: id,
      detail: {},
    });
    return c.json({ ok: true });
  });

  return app;
}
