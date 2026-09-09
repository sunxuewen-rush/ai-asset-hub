/** /api/labels（公开；displayName 随 Accept-Language 回退 slug） */
import { type ApiGetOptions, apiGet } from './client.js';
import type { LabelDto } from './types.js';

export async function fetchLabels(opts?: ApiGetOptions): Promise<readonly LabelDto[]> {
  return apiGet<readonly LabelDto[]>('/api/labels', opts);
}
