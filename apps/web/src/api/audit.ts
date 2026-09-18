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

export async function fetchAudit(
  params: { limit?: number; offset?: number } = {},
  opts?: ApiGetOptions,
) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<AuditListResponse>(`/api/audit${suffix}`, opts);
}
