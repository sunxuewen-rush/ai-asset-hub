/**
 * API Token scope 码（M4-pre 实现注记：`auth/permissions.ts` 删除后，token 凭证级操作标签的落点）。
 *
 * 语义沿 M3 design §8 R14 **不变**：token 的 scope 非空时与操作码求交集——scope 未含该码 → 403。
 * 取值与 M3 时期**逐字一致**（存量取值经迁移 `0011` 原样转入官方 `permissions`，语义零变化）。
 *
 * 与角色判定的关系：角色判定走 `role >= N`（M4-pre design §2.2），不再使用权限码；
 * 本表只是**凭证级**标签（"这把钥匙能开哪扇门"），与"这个人有多高权限"正交。
 *
 * M4b-pre T4：存储面切官方 `apikey`，scope 以官方 `permissions` 形态落库（`{asset:['publish']}`）。
 * 本文件的转换函数是 **scope 码 ↔ permissions JSON** 的唯一落点（迁移 SQL 与之同口径）。
 */
export const TOKEN_SCOPES = {
  assetPublish: 'asset:publish',
  assetManage: 'asset:manage',
  reviewSubmit: 'review:submit',
  reviewApprove: 'review:approve',
  auditRead: 'audit:read',
} as const;

export type TokenScopeCode = (typeof TOKEN_SCOPES)[keyof typeof TOKEN_SCOPES];

/**
 * 全量 scope 码表。**非空元组形态**（`z.enum` 消费方要求，本表恒 ≥1 项）。
 * 消费点：`http/tokens.ts` 签发校验 `z.enum(ALL_TOKEN_SCOPES)`——避免各调用点重复内联
 * `Object.values(TOKEN_SCOPES)` + 就地断言。
 */
export const ALL_TOKEN_SCOPES = Object.values(TOKEN_SCOPES) as [
  TokenScopeCode,
  ...TokenScopeCode[],
];

/**
 * scope 码 → 官方 `permissions` 形态（`'asset:publish'` → `{asset:['publish']}`）。
 *
 * 空/`null`/`'cli'`（历史全量语义）→ `undefined`（官方列写 NULL ⇒ 官方语义「无 permissions 限制」= 全量），
 * 与 design §5.3「`''`/`cli`（全量）→ `permissions = NULL`」一致。
 * 畸形码（无 `:` 或空段）跳过——迁移口径同（SQL 侧同样过滤）。
 */
export function scopesToPermissions(
  codes: readonly string[] | null | undefined,
): Record<string, string[]> | undefined {
  if (!codes || codes.length === 0) return undefined;
  const out: Record<string, string[]> = {};
  for (const code of codes) {
    const [resource, action] = splitScopeCode(code);
    if (!resource || !action) continue;
    out[resource] = [...(out[resource] ?? []), action];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 官方 `permissions` → scope 码集合（`{asset:['publish']}` → `{'asset:publish'}`）。
 * `null`/`undefined`/空对象 → `null`（= 全量；与 `parseTokenScope` 旧口径同义）。
 */
export function permissionsToScopes(
  permissions: Record<string, string[]> | null | undefined,
): Set<string> | null {
  if (!permissions) return null;
  const out = new Set<string>();
  for (const [resource, actions] of Object.entries(permissions)) {
    for (const action of actions ?? []) out.add(`${resource}:${action}`);
  }
  return out.size > 0 ? out : null;
}

/**
 * 官方 `permissions` → 旧契约的 `scope` 字符串（逗号串；列表响应保持形状）。
 * `null`/空 → `''`（旧契约中 `''` 即全量）。全量来源无法区分 `''` 与 `'cli'`
 * （迁移后同为 NULL）⇒ 一律回 `''`（design §8 变更表登记）。
 */
export function permissionsToScopeString(
  permissions: Record<string, string[]> | null | undefined,
): string {
  const scopes = permissionsToScopes(permissions);
  return scopes ? [...scopes].join(',') : '';
}

/** `'asset:publish'` → `['asset','publish']`（仅两段；畸形返回空串对） */
function splitScopeCode(code: string): [string, string] {
  const idx = code.indexOf(':');
  if (idx <= 0 || idx === code.length - 1) return ['', ''];
  return [code.slice(0, idx), code.slice(idx + 1)];
}
