/**
 * API 响应类型（design §5.1/§5.2 契约形状一一对应——字段 camelCase 照抄服务端序列化；
 * 命名空间/版本等写面形状 M4b 再补。服务端实现为契约真相，见 apps/server/src/http/*）。
 */
export type AssetType = 'skill' | 'mcp' | 'agent';
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'NAMESPACE_ONLY';
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

/** 列表/详情资产项（R5/R6：latest* 投影 + ownerDisplayName——匿名可见面） */
export interface AssetItem {
  id: number;
  namespaceId: number;
  namespaceSlug: string;
  slug: string;
  type: AssetType;
  visibility: Visibility;
  status: AssetStatus;
  ownerId: string;
  latestVersionId: string | null;
  latestVersion: string | null;
  latestName: string | null;
  latestDescription: string | null;
  ownerDisplayName: string | null;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  labels: ReadonlyArray<Pick<LabelDto, 'slug' | 'displayName'>>;
}

export interface ListEnvelope<T> {
  items: readonly T[];
  total: number;
  limit: number;
  offset: number;
}

export type AssetListResponse = ListEnvelope<AssetItem>;

/** R7 stats（typeCounts 键 = AssetType 枚举驱动动态键） */
export interface StatsResponse {
  totalAssets: number;
  totalDownloads: number;
  typeCounts: Record<AssetType, number>;
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
