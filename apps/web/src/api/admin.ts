/**
 * 管理面 API 客户端（M4b-6 T1/T2 交付的服务端端点的调用封装）。
 *
 * 覆盖：看板三只读端点（`overview` / `rankings` / `trends`）+ 审计动作全集（`/api/audit/actions`）+ 标签全量（`/api/labels/all`）。
 * 契约来源 = 批 design §5.1 / §5.4；字段含义见各 interface 注释（服务端 SSOT：`apps/server/src/admin/*.ts`）。
 */
import {
  type ApiGetOptions,
  type ApiWriteOptions,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  invalidateCache,
} from './client.js';

export interface AdminOverviewKpi {
  activeAssets: number;
  allAssets: number;
  downloads: number;
  pending: number;
  reviewsTotal: number;
  activeUsers: number;
  allUsers: number;
  /**
   * **近 7 个自然日**（含今天 · 上海日界）新增下载事件数（看板「累计下载」卡副行）。
   * 与服务端趋势曲线同口径、**与趋势窗口选择器无关**；`null` = 下载事件表不可用（显「暂无下载历史」）。
   */
  downloads7d: number | null;
}

/** 一级标签维度聚合（标签资产数量同心环 + 标签下载热度雷达共用 · 看板重做） */
export interface AdminOverviewLabel {
  /** 一级标签内部 id（前端 key） */
  id: number;
  /** 一级标签 slug（前端仅作 React 用的稳定键 —— 取色已改为**按行序 13 色池**，不再按 slug hash） */
  slug: string;
  /** 显示名（服务端回退链 zh-CN → zh → en → slug，永不空） */
  name: string;
  /** 该一级标签（含子标签上卷）下去重的 `ACTIVE` 资产数 */
  count: number;
  /** 同一资产集合的 `sum(download_count)` */
  downloads: number;
}

export interface AdminOverview {
  kpi: AdminOverviewKpi;
  labels: AdminOverviewLabel[];
}

export interface AdminRankItem {
  /** 人 = 工号 · 标签 = slug · 资产 = slug */
  id: string;
  /** 人 = 姓名 · 标签 = 显示名 · 资产 = 版本投影名 */
  name: string;
  value: number;
}

export interface AdminRankings {
  people: AdminRankItem[];
  labels: AdminRankItem[];
  assets: AdminRankItem[];
}

export interface TrendPoint {
  /** `YYYY-MM-DD`（Asia/Shanghai 日界） */
  day: string;
  assets: number;
  /** `null` = 下载事件表未落（前端显「—」/虚线占位） */
  downloads: number | null;
}

export interface AuditActionGroup {
  prefix: string;
  actions: string[];
}

export interface ManagedLabelRow {
  id: number;
  slug: string;
  type: string;
  visibleInFilter: boolean;
  sortOrder: number;
  parentId: string | null;
  translations: Array<{ locale: string; displayName: string }>;
  assetCount: number;
  /**
   * **任一状态**挂载数（F212）：删除守卫的判据（含已隐藏/已归档）。
   * 页面「挂载数」列仍走 `assetCount`（仅已发布 · 与看板同面）；**删除钮禁用条件与确认文案**走本字段。
   */
  mountCountAny: number;
}

export interface ManagedLabelsResponse {
  items: ManagedLabelRow[];
  total: number;
  limit: number;
}

/** `GET /api/admin/overview` —— KPI ×7 + 一级标签维度（看板重做：删 creative/types，加 labels） */
export async function fetchAdminOverview(opts?: ApiGetOptions): Promise<AdminOverview> {
  return apiGet<AdminOverview>('/api/admin/overview', opts);
}

/** `GET /api/admin/rankings?limit=N` —— 三口径排行榜（英雄榜取同一响应的前 3） */
export async function fetchAdminRankings(
  limit: number,
  opts?: ApiGetOptions,
): Promise<AdminRankings> {
  return apiGet<AdminRankings>(`/api/admin/rankings?limit=${limit}`, opts);
}

/** `GET /api/admin/trends?days=N` —— 两条累计序列（含今天共 N 点；越界由服务端夹档） */
export async function fetchAdminTrends(
  days: number,
  opts?: ApiGetOptions,
): Promise<{ days: number; points: TrendPoint[] }> {
  return apiGet<{ days: number; points: TrendPoint[] }>(`/api/admin/trends?days=${days}`, opts);
}

/** `GET /api/audit/actions` —— 审计动作全集（按前缀分组；下拉数据源） */
export async function fetchAuditActions(
  opts?: ApiGetOptions,
): Promise<{ groups: AuditActionGroup[] }> {
  return apiGet<{ groups: AuditActionGroup[] }>('/api/audit/actions', opts);
}

/** `GET /api/labels/all` —— 标签全量（`{ items, total, limit }` · 每条带挂载数） */
export async function fetchAllLabels(opts?: ApiGetOptions): Promise<ManagedLabelsResponse> {
  return apiGet<ManagedLabelsResponse>('/api/labels/all', opts);
}

/* ── 标签定义页的写面（M4b-6 T8）── */

/**
 * 标签写后失效（**F216**）：标签变更影响三个缓存面 ——
 * ① `/api/labels*`：公开候选面（门户筛选 chip / 资产卡标签名候选）+ 管理全量列表（`/api/labels/all`）
 * ② `/api/admin*`：看板 `overview`（标签维度两图）/ `trends` / `rankings`（标签口径）
 * ③ `/api/assets*`：资产 payload **内嵌的标签名**（改名后卡片须跟着变）
 *
 * 为什么放这里：与 `api/stars.ts` 同范式 —— **失效收口在 api 层**，覆盖所有调用者（页面/组件/未来的批量脚本），
 * 不依赖每个调用点自律。此前四个写函数**零失效调用** ⇒ `api/client.ts` 的语言感知 Promise 缓存命中旧值
 * ⇒ 「创建标签后列表/门户不显示，整页刷新（模块重建、缓存清空）才显示」。
 */
const invalidateLabelCaches = (): void => {
  invalidateCache('/api/labels');
  invalidateCache('/api/admin');
  invalidateCache('/api/assets');
};

export interface LabelTranslationInput {
  locale: string;
  displayName: string;
}

export interface CreateLabelBody {
  slug: string;
  type: string;
  visibleInFilter?: boolean;
  parentSlug?: string | null;
  translations?: LabelTranslationInput[];
}

export async function createLabel(body: CreateLabelBody, opts?: ApiWriteOptions) {
  const row = await apiPost<ManagedLabelRow>('/api/labels', body, opts);
  invalidateLabelCaches(); // F216
  return row;
}

export async function updateLabel(
  slug: string,
  body: Partial<CreateLabelBody>,
  opts?: ApiWriteOptions,
) {
  const row = await apiPatch<ManagedLabelRow>(
    `/api/labels/${encodeURIComponent(slug)}`,
    body,
    opts,
  );
  invalidateLabelCaches(); // F216
  return row;
}

export async function deleteLabel(slug: string, opts?: ApiWriteOptions) {
  const res = await apiDelete(`/api/labels/${encodeURIComponent(slug)}`, opts);
  invalidateLabelCaches(); // F216
  return res;
}

/** 一次提交整组顺序（`PUT /order`） */
export async function reorderLabels(
  order: Array<{ slug: string; sortOrder: number }>,
  opts?: ApiWriteOptions,
) {
  const res = await apiPut('/api/labels/order', { order }, opts);
  invalidateLabelCaches(); // F216
  return res;
}
