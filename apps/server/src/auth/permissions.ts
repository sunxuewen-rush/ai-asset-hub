/**
 * 权限码单源（05 §6.4 十码 + group 归类）：seed 与 RBAC 判定共用，防常量/种子漂移（T23）。
 */
export const PERMISSIONS = {
  /** 发布资产包（普通用户须为目标空间成员） */
  assetPublish: 'asset:publish',
  /** 提交已有版本进审核（owner / 空间 ADMIN+ / ASSET_ADMIN+） */
  reviewSubmit: 'review:submit',
  /** 管理资产（归档/版本）：空间 ADMIN 以上或 owner 本人 */
  assetManage: 'asset:manage',
  /** 空间间提升（如到全局） */
  assetPromote: 'asset:promote',
  /** 审核发布 */
  reviewApprove: 'review:approve',
  /** 管理空间成员/角色（OWNER/ADMIN） */
  namespaceManage: 'namespace:manage',
  /** 审核提升申请 */
  promotionApprove: 'promotion:approve',
  /** 管理用户角色 */
  userManage: 'user:manage',
  /** 审批用户准入 */
  userApprove: 'user:approve',
  /** 查看审计日志 */
  auditRead: 'audit:read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** permission 表 group_code 归类（权限面扩展按组管理） */
export const PERMISSION_GROUPS: Record<PermissionCode, string> = {
  [PERMISSIONS.assetPublish]: 'asset',
  [PERMISSIONS.reviewSubmit]: 'asset',
  [PERMISSIONS.assetManage]: 'asset',
  [PERMISSIONS.assetPromote]: 'asset',
  [PERMISSIONS.reviewApprove]: 'review',
  [PERMISSIONS.namespaceManage]: 'namespace',
  [PERMISSIONS.promotionApprove]: 'promotion',
  [PERMISSIONS.userManage]: 'user',
  [PERMISSIONS.userApprove]: 'user',
  [PERMISSIONS.auditRead]: 'audit',
};

/** permission 展示名（管理面用） */
export const PERMISSION_NAMES: Record<PermissionCode, string> = {
  [PERMISSIONS.assetPublish]: '发布资产包',
  [PERMISSIONS.reviewSubmit]: '提交版本进审核',
  [PERMISSIONS.assetManage]: '管理资产',
  [PERMISSIONS.assetPromote]: '提升资产到其他空间',
  [PERMISSIONS.reviewApprove]: '审核发布',
  [PERMISSIONS.namespaceManage]: '管理空间成员',
  [PERMISSIONS.promotionApprove]: '审核提升申请',
  [PERMISSIONS.userManage]: '管理用户角色',
  [PERMISSIONS.userApprove]: '审批用户准入',
  [PERMISSIONS.auditRead]: '查看审计日志',
};

export const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(PERMISSIONS);
