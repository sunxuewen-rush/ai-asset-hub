/** /api/stats（R7 公开聚合——PUBLIC+ACTIVE 语义同匿名列表） */
import { type ApiGetOptions, apiGet } from './client.js';
import type { StatsResponse } from './types.js';

export async function fetchStats(opts?: ApiGetOptions): Promise<StatsResponse> {
  return apiGet<StatsResponse>('/api/stats', opts);
}
