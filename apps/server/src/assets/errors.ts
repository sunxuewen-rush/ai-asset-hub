/**
 * 资产域业务错误码（07 §4 结构化 code 返回；前端按 code 映射 i18n，服务端不返回成品文案）。
 * 认证域错误码在 auth/errors.ts；资产协议错误码在 @ai-asset-hub/protocol。
 * M2 资产域（注册/上传/版本管理）错误码集中于此（design 2026-09-08-m2-asset-domain-design §3/§6）。
 */

export const assetErrorCodes = {
  /** 目标 namespace 不存在（按 slug 寻址） */
  namespaceNotFound: 'asset.namespace_not_found',
  /** 资产不存在（按坐标寻址；可见性过滤 404 同码防枚举） */
  notFound: 'asset.not_found',
  /** slug 跨类型唯一冲突（01 §3.3） */
  slugTaken: 'asset.slug_taken',
  /** 版本号重复（UNIQUE(asset_id, version)，版本不可覆写） */
  versionConflict: 'asset.version_conflict',
  /** 仅 DRAFT 版本可删除（UPLOADED+ 走治理面） */
  draftOnly: 'asset.draft_only',
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

/** HTTP 状态映射（07 §4；资产域码的状态语义） */
export function httpStatusForAsset(code: AssetErrorCode): number {
  switch (code) {
    case 'asset.not_found':
    case 'asset.namespace_not_found':
      return 404;
    case 'asset.slug_taken':
    case 'asset.version_conflict':
      return 409;
    case 'asset.package_too_large':
      return 413;
    default:
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
