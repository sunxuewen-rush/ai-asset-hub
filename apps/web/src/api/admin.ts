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
} from './client.js';

export interface AdminOverviewKpi {
  activeAssets: number;
  allAssets: number;
  downloads: number;
  pending: number;
  reviewsTotal: number;
  activeUsers: number;
  allUsers: number;
}

export interface AdminOverviewCreative {
  /** 平均审核时长（**小时** —— 前端格式化天/小时；空集 ⇒ null） */
  reviewSpeed: number | null;
  /** 下载集中度（**比例 0–1** —— 前端 ×100 展示；总下载 0 ⇒ null） */
  concentration: number | null;
  /** 标签覆盖度（**比例 0–1**；无 ACTIVE 资产 ⇒ null） */
  labelCoverage: number | null;
  sleeping: number;
}

/** 类型级聚合（(e) 同心环 + (f) 雷达共用） */
export interface AdminOverviewType {
  type: string;
  count: number;
  downloads: number;
}

export interface AdminOverview {
  kpi: AdminOverviewKpi;
  creative: AdminOverviewCreative;
  types: AdminOverviewType[];
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
}

export interface ManagedLabelsResponse {
  items: ManagedLabelRow[];
  total: number;
  limit: number;
}

/** `GET /api/admin/overview` —— KPI ×7 + 创意四项 + 类型级聚合 */
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
  return apiPost<ManagedLabelRow>('/api/labels', body, opts);
}

export async function updateLabel(
  slug: string,
  body: Partial<CreateLabelBody>,
  opts?: ApiWriteOptions,
) {
  return apiPatch<ManagedLabelRow>(`/api/labels/${encodeURIComponent(slug)}`, body, opts);
}

export async function deleteLabel(slug: string, opts?: ApiWriteOptions) {
  return apiDelete(`/api/labels/${encodeURIComponent(slug)}`, opts);
}

/** 一次提交整组顺序（`PUT /order`） */
export async function reorderLabels(
  order: Array<{ slug: string; sortOrder: number }>,
  opts?: ApiWriteOptions,
) {
  return apiPut('/api/labels/order', { order }, opts);
}
