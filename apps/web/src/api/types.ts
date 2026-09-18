/**
 * API 响应类型（design §5.1/§5.2 契约形状一一对应——字段 camelCase 照抄服务端序列化；
 * 写面形状 M4b 再补。服务端实现为契约真相，见 apps/server/src/http/*）。
 */
export type AssetType = 'skill' | 'mcp' | 'agent';
export type AssetStatus = 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
/** 版本状态机（M1 六态 + REJECTED；匿名读面仅见 PUBLISHED/YANKED） */
export type VersionStatus =
  | 'DRAFT'
  | 'SCANNING'
  | 'SCAN_FAILED'
  | 'UPLOADED'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'YANKED';

/** label（06：displayName 数据回退 slug——渲染端兜底） */
export interface LabelDto {
  slug: string;
  type: string;
  parentId: string | null;
  displayName: string | null;
}

/**
 * 资产已挂标签（**结构体** —— M4b-4 T14 · Q14=B：服务端按请求语种解析好 `displayName`
 * ⇒ 前端**零 join**；`parentId` 为父标签 slug）。对齐 skillhub `SkillLabelDto`。
 */
export interface AssetLabelRef {
  slug: string;
  type: string;
  parentId: string | null;
  /** 服务端回退链兜底：locale → 主语言 → en → slug ⇒ **永不为空** */
  displayName: string;
}

/**
 * 列表/详情资产项（R5/R6：latest* 投影 + ownerDisplayName——匿名可见面；扁平坐标 = 裸 slug）。
 *
 * ⚠️ 刻意用 **type 别名**而非 `interface`（同 `MyReviewItem`）：`DataTable` 的行约束为
 * `Record<string, unknown>`（TanStack `RowData`），**interface 不带隐式索引签名** ⇒ 不能作为行类型传入。
 */
export type AssetItem = {
  id: number;
  slug: string;
  type: AssetType;
  status: AssetStatus;
  ownerId: string;
  latestVersionId: string | null;
  latestVersion: string | null;
  latestName: string | null;
  latestDescription: string | null;
  ownerDisplayName: string | null;
  downloadCount: number;
  /** 收藏热度计数（M4b-4 v1.8：服务端冗余列直读） */
  starCount: number;
  /** 我是否已收藏（匿名 ⇒ false） */
  starredByMe: boolean;
  createdAt: string;
  updatedAt: string;
  /** M4b-4 T14：已挂标签（**仅详情面与个人面下发**；公开列表面不含 ⇒ 可选） */
  labels?: readonly AssetLabelRef[];
};

export interface ListEnvelope<T> {
  items: readonly T[];
  total: number;
  limit: number;
  offset: number;
}

export type AssetListResponse = ListEnvelope<AssetItem>;

/** R7 stats（typeCounts 键 = AssetType 枚举驱动动态键；`totalUsers` 口径见 server `assets/stats.ts`） */
export interface StatsResponse {
  totalAssets: number;
  totalDownloads: number;
  typeCounts: Record<AssetType, number>;
  /** 注册用户数（v0.17 新增；口径 官方 `user.status = 'ACTIVE'`） */
  totalUsers: number;
}

/** R8 单文件内容（§5.2 G7——binary/truncated 时无 content） */
export interface FileContentResponse {
  path: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content?: string;
}

export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED';
export type DiffLineType = 'ADD' | 'DELETE' | 'CONTEXT';

export interface DiffLine {
  type: DiffLineType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface CompareFile {
  path: string;
  changeType: ChangeType;
  binary: boolean;
  truncated: boolean;
  hunks?: ReadonlyArray<{ lines: readonly DiffLine[] }>;
}

/** R9 版本对比（§5.2 G8——服务端行级 hunks，前端零 diff 库） */
export interface CompareResponse {
  files: readonly CompareFile[];
}

/** 版本列表行（listVersions 投影——version-read.ts 实证） */
export interface VersionListItem {
  id: number;
  version: string;
  status: VersionStatus;
  fileCount: number;
  totalSize: number;
  changelog: string | null;
  createdAt: string;
}

export type VersionListResponse = ListEnvelope<VersionListItem>;

/** 版本文件清单条目（storageKey 服务端内部——不消费） */
export interface VersionFileEntry {
  filePath: string;
  fileSize: number;
  sha256: string;
}

/** 版本详情（getVersion 实证：manifest/投影/文件清单） */
export interface VersionDetail extends VersionListItem {
  manifestJson: Record<string, unknown> | null;
  parsedMetadataJson: Record<string, unknown> | null;
  files: readonly VersionFileEntry[];
}
