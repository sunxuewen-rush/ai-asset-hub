/**
 * 资产域业务错误码（07 §4 结构化 code 返回；前端按 code 映射 i18n，服务端不返回成品文案）。
 * 认证域错误码在 auth/errors.ts；资产协议错误码在 @ai-asset-hub/protocol。
 * M2 资产域（注册/上传/版本管理）错误码集中于此（design 2026-09-08-m2-asset-domain-design §3/§6）。
 */

export const assetErrorCodes = {
  /** 目标 namespace 不存在（按 slug 寻址） */
  namespaceNotFound: 'asset.namespace_not_found',
  /** 资产不存在（按坐标寻址；HIDDEN/ARCHIVED 同码——活跃面不存在语义） */
  notFound: 'asset.not_found',
  /** 空间已归档且非成员（skillhub error.namespace.archived 对齐——403 明示） */
  namespaceArchived: 'asset.namespace_archived',
  /** 资产存在但不可见（PRIVATE/NAMESPACE_ONLY 拒——skillhub error.skill.access.denied 对齐 403 明示） */
  accessDenied: 'asset.access_denied',
  /** slug 跨类型唯一冲突（01 §3.3） */
  slugTaken: 'asset.slug_taken',
  /** 版本号重复（UNIQUE(asset_id, version)，版本不可覆写） */
  versionConflict: 'asset.version_conflict',
  /** 版本存在但不可删（PENDING_REVIEW/PUBLISHED/YANKED 禁删态——M3 design §3.4 R5；
   *  替代 M2 draft_only：删除面放宽为 DRAFT/SCAN_FAILED 上传者可删 + REJECTED/UPLOADED 管理面可删） */
  versionNotDeletable: 'asset.version_not_deletable',
  /** 版本存在但未发布/无预览权（skillhub error.skill.version.notPublished 对齐——400 明示） */
  versionNotPublished: 'asset.version_not_published',
  /** 提交审核前态不符（仅 DRAFT/UPLOADED 可 submit——M3 design §3.1 R2） */
  versionNotSubmittable: 'asset.version_not_submittable',
  /** YANKED 已撤回分发版本禁下载（曾公开族——M3 design §7.2 R13） */
  versionYanked: 'asset.version_yanked',
  /** yank 仅对 PUBLISHED 生效（M3 design §4.1 R9——非发布态拒） */
  versionNotYankable: 'asset.version_not_yankable',
  /** yank 必须给撤回理由（skillhub YankRequest 同构——M3 design §4.1 R9） */
  yankReasonRequired: 'asset.yank_reason_required',
  /** 资产已有 YANKED 版本禁删（曾分发即留档——M3 design §4.2 R10） */
  hasYanked: 'asset.has_yanked',
  /** bundle 缺失（M3 起上传必存——null 为理论不可达态，防 500 明示——design §7.2） */
  bundleMissing: 'asset.bundle_missing',
  /** 资产已有 PUBLISHED 版本，删除走 M3 治理（防已分发资产静默移除） */
  hasPublished: 'asset.has_published',
  /** zip 布局违规：主文件不在包根 / 带外层目录（root 级契约） */
  packageLayoutInvalid: 'asset.package_layout_invalid',
  /** zip 条目路径穿越（zip slip：禁 ../ / 绝对路径 / 反斜杠） */
  packagePathInvalid: 'asset.package_path_invalid',
  /** multipart 接收超限（上传前置 413） */
  packageTooLarge: 'asset.package_too_large',
} as const;

export type AssetErrorCode = (typeof assetErrorCodes)[keyof typeof assetErrorCodes];

/** HTTP 状态映射（07 §4；资产域码的状态语义——穷尽 switch，新增码漏映射即编译错） */
export function httpStatusForAsset(code: AssetErrorCode): number {
  switch (code) {
    case 'asset.not_found':
    case 'asset.namespace_not_found':
      return 404;
    case 'asset.namespace_archived':
    case 'asset.access_denied':
      return 403;
    case 'asset.slug_taken':
    case 'asset.version_conflict':
      return 409;
    case 'asset.package_too_large':
      return 413;
    case 'asset.version_not_deletable':
    case 'asset.has_published':
    case 'asset.has_yanked':
    case 'asset.bundle_missing':
    case 'asset.version_not_published':
    case 'asset.version_not_submittable':
    case 'asset.version_yanked':
    case 'asset.version_not_yankable':
    case 'asset.yank_reason_required':
    case 'asset.package_layout_invalid':
    case 'asset.package_path_invalid':
      return 400;
  }
}

/** 资产域业务异常：route 层统一转 { code, message } 响应（app.onError 认领） */
export class AssetError extends Error {
  constructor(
    readonly code: AssetErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AssetError';
  }

  get status(): number {
    return httpStatusForAsset(this.code);
  }
}

/**
 * 上传校验失败（族校验器 issues 全量——T13 端点 400 响应含 issues 数组，非单码结构——
 * 路由层特异 catch，不进 onError 通用出口）
 */
export class UploadValidationError extends Error {
  constructor(
    readonly issues: Array<{ code: string; path?: string; message?: string }>,
  ) {
    super(issues[0]?.code ?? 'validation_failed');
    this.name = 'UploadValidationError';
  }
}
