import { Hono } from 'hono';
import { z } from 'zod';
import type { AuditWriter } from '../audit/audit.js';
import {
  findApiKey,
  issueApiKey,
  listApiKeys,
  readApiKeyRow,
  revokeApiKey,
  updateApiKey,
} from '../auth/api-keys.js';
import type { AihAuth } from '../auth/better-auth.js';
import { ALL_TOKEN_SCOPES, scopesToPermissions } from '../auth/token-scopes.js';
import type { Db } from '../db/client.js';
import { requireAuth } from './auth-middleware.js';

/**
 * /api/tokens 路由组（T14-T16，板块 C；05 §5 API Token——平台通用凭证）：
 * 任何 ACTIVE 用户签发本人凭证，无需权限码（签发自己 token 天然授权）。
 * **令牌彻底私有（2026-09-16 用户拍板，对齐规范层 `05 §5`「Token 签发 / 吊销 = 本人」）**：
 * 列表 / 编辑 / 删除一律**仅本人**，本人以外视同不存在（404 防枚举）——**超管亦无例外**
 * （原 DELETE 的 SUPER_ADMIN 分支已收回；未来若需超管令牌治理能力 ⇒ 另立治理面端点，登记 M4b-6/M4c 候选）。
 *
 * M4b-pre T4（令牌面切流）：内部改官方 api-key 插件（服务端直呼，`auth/api-keys.ts` 薄适配层）；
 * **响应形状保持**（design §8）——明文只在签发响应出现一次；库中只有官方哈希（`base64url(sha256)`）。
 * 登记的两处形状差异（design §8 变更表）：① `id` 由自增整数变官方文本主键 ② 历史 `scope='cli'`
 * （设备令牌）在列表中回 `''`（迁移后同为 `permissions NULL` = 全量，语义等价）。
 */

export interface TokenRoutesDeps {
  db: Db;
  /** 官方实例（令牌 CRUD 直呼官方端点：create/update server-only 面，verify 亦 serverOnly） */
  auth: AihAuth;
  /** 审计写入器（T17：token.issue/revoke 埋点——明文零落 detail） */
  audit?: AuditWriter;
}

const DAY_MS = 86_400_000;

/** 官方 `apikey.id` 为文本主键（迁移行为数字串，新签发为随机字母数字）⇒ 形状校验放宽到通用 id 面 */
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** POST body（T14：省略 expiresInDays = 永不过期 expiresAt null；1-3650 天，超限 400；
 *  T15：可选 scope = **scope 码**白名单（交集收窄——R14；省略 = 空 scope 全量；
 *  码表单源 `auth/token-scopes.ts`——M4-pre D2：scope 与角色正交，非权限码）；
 *  M4b-3：`name` **必填**（用户 2026-09-16 定「新建和编辑名字都不能为空」）——`trim()` 后 1..32 字
 *  （上限 = 官方 `maximumNameLength` 默认口径，钉定于 `better-auth.ts`；下限 1 由我们前置拦，不进官方） */
const issueBodySchema = z.object({
  expiresInDays: z.number().int().min(1).max(3650).optional(),
  scope: z.array(z.enum(ALL_TOKEN_SCOPES)).max(10).optional(),
  name: z.string().trim().min(1).max(32),
});

/** PATCH body（M4b-3 T3：编辑 = 改名 + 改权限）——
 *  `name` **必填**（与新建同口径：`trim().min(1).max(32)`；缺 / 空 / 纯空白 ⇒ 400）；
 *  `scope` **省略 = 不改权限**，`[]` = **全量**（写 `permissions = null`，对齐签发语义）。
 *  ⚠️ 官方对「无任何变更」的请求会抛 `NO_VALUES_TO_UPDATE`（`dist/index.mjs:1526`）——`name` 必填后
 *  该边界在路由层即被拦下（zod），不会触达官方。 */
const patchBodySchema = z.object({
  name: z.string().trim().min(1).max(32),
  scope: z.array(z.enum(ALL_TOKEN_SCOPES)).max(10).optional(),
});

export function createTokenRoutes(deps: TokenRoutesDeps): Hono {
  const { db, auth } = deps;
  const app = new Hono();
  app.use('*', requireAuth());

  // POST /api/tokens（T14：签发明文一次；哈希落库由官方完成）
  app.post('/', async (c) => {
    const principal = c.get('principal');
    // requireAuth() 已保证 principal（组级中间件）；守卫仅为类型窄化
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    let payload: unknown;
    try {
      const text = await c.req.text();
      payload = text.length === 0 ? {} : JSON.parse(text);
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = issueBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const expiresAt =
      parsed.data.expiresInDays === undefined
        ? null
        : new Date(Date.now() + parsed.data.expiresInDays * DAY_MS);
    const issued = await issueApiKey(auth, {
      userId: principal.userId,
      expiresAt,
      // scope 缺省 = 全量（`permissions` 不写）；显式 scope = 交集收窄（T15 R14）
      scope: parsed.data.scope ?? null,
      // M4b-3：名称（必填；`issueApiKey` 内 trim 后透传）
      name: parsed.data.name,
    });
    // 审计（T17：token.issue——detail 零明文（明文只在签发响应；库中仅官方哈希））
    await deps.audit?.({
      actorId: principal.userId,
      action: 'token.issue',
      targetType: 'api_key',
      targetId: issued.id,
      detail: { expiresAt: issued.expiresAt?.toISOString() ?? null },
    });
    return c.json({ id: issued.id, token: issued.plain, expiresAt: issued.expiresAt }, 201);
  });

  // GET /api/tokens（T15：仅本人 token 全量——本人量小，分页后置 R9）
  // 标识面说明：库中仅哈希不可逆 ⇒ 列表以 id/时间/状态识别（旧口径不变）
  app.get('/', async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const items = await listApiKeys(db, principal.userId);
    return c.json({ items });
  });

  // PATCH /api/tokens/:id（M4b-3 T3：编辑——改名 + 改权限；**仅本人**（令牌彻底私有）；他人视同 404 防枚举）
  app.patch('/:id', async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const keyId = c.req.param('id');
    if (!KEY_ID_PATTERN.test(keyId)) {
      return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    }
    let payload: unknown;
    try {
      const text = await c.req.text();
      payload = text.length === 0 ? {} : JSON.parse(text);
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = patchBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const token = await findApiKey(db, keyId);
    if (!token) return c.json({ code: 'token.not_found', message: 'token.not_found' }, 404);
    // 令牌彻底私有：本人以外（**含超管**）一律视同不存在（防枚举）
    if (token.referenceId !== principal.userId) {
      return c.json({ code: 'token.not_found', message: 'token.not_found' }, 404);
    }
    // scope 省略 ⇒ 不改权限；`[]` / 畸形码 ⇒ 全量（`permissions = null`）
    const permissions =
      parsed.data.scope === undefined
        ? undefined
        : (scopesToPermissions(parsed.data.scope) ?? null);
    await updateApiKey(auth, {
      keyId,
      ownerId: principal.userId,
      name: parsed.data.name,
      ...(permissions === undefined ? {} : { permissions }),
    });
    // 审计（detail 只记「改了哪些字段」——零明文、零值回显）
    await deps.audit?.({
      actorId: principal.userId,
      action: 'token.update',
      targetType: 'api_key',
      targetId: keyId,
      detail: { fields: parsed.data.scope === undefined ? ['name'] : ['name', 'scope'] },
    });
    // 回填 200 单条（与列表 item 同形）
    const row = await readApiKeyRow(db, keyId);
    return c.json(row, 200);
  });

  // DELETE /api/tokens/:id（T16：吊销——**仅本人**（2026-09-16 起令牌彻底私有）；幂等 204；他人 token 视同 404 防枚举）
  app.delete('/:id', async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const keyId = c.req.param('id');
    if (!KEY_ID_PATTERN.test(keyId)) {
      return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    }
    const token = await findApiKey(db, keyId);
    if (!token) return c.json({ code: 'token.not_found', message: 'token.not_found' }, 404);

    // 令牌彻底私有：本人以外（**含超管**）一律视同不存在（防枚举）——规范层 05 §5「Token 签发 / 吊销 = 本人」
    if (token.referenceId !== principal.userId) {
      return c.json({ code: 'token.not_found', message: 'token.not_found' }, 404);
    }
    if (token.enabled === false) return c.body(null, 204); // 幂等：已吊销
    // 吊销 = 官方 `enabled=false`（保留行 ⇒ 列表仍可见 revokedAt；归属校验传原归属者 id）
    await revokeApiKey(auth, { keyId, ownerId: token.referenceId });
    // 审计（T17：token.revoke——吊销动作；幂等分支不记）
    await deps.audit?.({
      actorId: principal.userId,
      action: 'token.revoke',
      targetType: 'api_key',
      targetId: keyId,
    });
    return c.body(null, 204);
  });

  return app;
}
