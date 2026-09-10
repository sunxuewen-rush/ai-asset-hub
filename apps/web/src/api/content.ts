/** R8 版本文件内容（§5.2 G7：GET files/{path}——path 含目录，URL 编码后交服务端） */
import { type ApiGetOptions, apiGet } from './client.js';
import type { FileContentResponse } from './types.js';

export async function fetchVersionFile(
  slug: string,
  version: string,
  path: string,
  opts?: ApiGetOptions,
): Promise<FileContentResponse> {
  const base = `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/files/`;
  return apiGet<FileContentResponse>(`${base}${encodeURIComponent(path)}`, opts);
}
