/**
 * API Token scope 码（M4-pre 实现注记：`auth/permissions.ts` 删除后，token 凭证级操作标签的落点）。
 *
 * 语义沿 M3 design §8 R14 **不变**：token 的 scope 非空时与操作码求交集——scope 未含该码 → 403。
 * 取值与 M3 时期**逐字一致**（存量 `api_token.scope` 零迁移）。
 *
 * 与角色判定的关系：角色判定走 `role >= N`（M4-pre design §2.2），不再使用权限码；
 * 本表只是**凭证级**标签（"这把钥匙能开哪扇门"），与"这个人有多高权限"正交。
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
