/** R9 版本对比（§5.2 G8：GET versions/compare?from=&to=——服务端行级 hunks） */
import { type ApiGetOptions, apiGet } from './client.js';
import type { CompareResponse } from './types.js';

export async function fetchCompare(
  slug: string,
  from: string,
  to: string,
  opts?: ApiGetOptions,
): Promise<CompareResponse> {
  const query = new URLSearchParams({ from, to });
  return apiGet<CompareResponse>(
    `/api/assets/${encodeURIComponent(slug)}/versions/compare?${query.toString()}`,
    opts,
  );
}
