/**
 * 审计动作全集（`GET /api/audit/actions` 的数据源 · M4b-6 T2 · 服务端改动 6）。
 *
 * **本表 = 动作名的单源**。与真实写入点的一致性由 `audit/actions.test.ts` 的「源码扫描」用例兜底：
 * 扫描 `src/**` 里的 `action: '<字面量>'` 与 `AUDIT_ACTIONS.*` 取值，任何未登记的动作 ⇒ 测试红
 * （防「新写入点漏登记」这类静默腐化）。
 *
 * 分组 = **点号前缀**（前端按组渲染下拉；**未知前缀前端原样显示** —— 实现期新增动作不丢，design §4.4）。
 * 「潜在全集 9 组」中含 `namespace`（design §4.4），但当前**无任何写入点**写 `namespace.*`
 * ⇒ 不进本表（本表只列**代码真会写**的动作；`namespace` 组待其写入点落地后由本表 + 扫描用例自然纳入）。
 */
export const AUDIT_ACTION_GROUPS: ReadonlyArray<{ prefix: string; actions: readonly string[] }> = [
  {
    prefix: 'asset',
    actions: [
      'asset.delete',
      'asset.label_attach',
      'asset.label_detach',
      'asset.register',
      'asset.status_update',
      'asset.version_delete',
      'asset.version_submit',
      'asset.version_upload',
      'asset.version_yank',
    ],
  },
  {
    prefix: 'review',
    actions: ['review.approve', 'review.reject', 'review.withdraw'],
  },
  {
    prefix: 'label',
    actions: ['label.create', 'label.delete', 'label.reorder', 'label.update'],
  },
  {
    prefix: 'token',
    actions: ['token.issue', 'token.revoke', 'token.update'],
  },
  {
    prefix: 'auth',
    actions: ['auth.register', 'auth.login.success', 'auth.login.failed', 'auth.logout'],
  },
  {
    prefix: 'device',
    actions: ['device.approve', 'device.deny', 'device.token_issued'],
  },
  {
    prefix: 'ldap',
    actions: ['ldap.provisioned'],
  },
  {
    prefix: 'oidc',
    actions: ['oidc.provisioned'],
  },
];

/** 全部动作（扁平化）—— 供出参与扫描用例比对 */
export function allAuditActions(): string[] {
  return AUDIT_ACTION_GROUPS.flatMap((g) => [...g.actions]);
}
