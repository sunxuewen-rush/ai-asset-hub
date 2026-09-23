/**
 * `/api/audit`（M4b-4 T5 —— 工作台「最近审计」卡；**M4b-6 审计页复用**）。
 *
 * 契约：`GET /api/audit?limit=&offset=` ⇒ `{ items, total, limit, offset }`
 * - 「时间倒序（同刻以 id 倒序）」分页稳定（服务端 `audit/query.ts` 排序口径）
 * - **权限**：服务端 `requireRole(ADMIN, { scope: auditRead })` ⇒ 仅管理档可达（本卡只在管理档工作台出现）
 */
import { type ApiGetOptions, apiGet } from './client.js';

/** 审计条目（服务端 `audit_log` 行投影） */
export type AuditItem = {
  id: number;
  /** null = 匿名动作（登录失败等） */
  actorId: string | null;
  /** 操作者姓名（F204 服务端左连 `user` 提供；匿名行 ⇒ null） */
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  requestId: string | null;
  clientIp: string | null;
  userAgent: string | null;
  detail: Record<string, unknown> | null;
  /** ISO 字符串（JSON 传输） */
  createdAt: string;
};

export interface AuditListResponse {
  items: readonly AuditItem[];
  total: number;
  limit: number;
  offset: number;
}

/** 审计页查询面（M4b-6 T9）：动作 / 5 维精确 / 时间窗 / 分页 */
export interface AuditQueryParams {
  action?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  requestId?: string;
  clientIp?: string;
  /** ISO 8601（服务端按 `Asia/Shanghai` 展示；过滤按时间戳比较） */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAudit(params: AuditQueryParams = {}, opts?: ApiGetOptions) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<AuditListResponse>(`/api/audit${suffix}`, opts);
}
