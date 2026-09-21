/**
 * `/api/me`（M4b-4 T5 · R6 个人面读面）。
 *
 * 契约（批 design §5.1 R6 · 表格族统一 §4.2）：`GET /api/me/assets?status=&q=&sort=&dir=&limit=&offset=`
 * - 集合恒 = **我名下资产**（`ownerId` 由服务端取会话，**不接受客户端传入**）
 * - `status` 缺省 `'ALL'`（含 `ACTIVE`/`HIDDEN`/`ARCHIVED`）；非法值 ⇒ 400
 * - 形状与公开面 `/api/assets` 同构（`AssetListResponse`）
 */
import { type ApiGetOptions, apiGet } from './client.js';
import type { AssetListResponse, AssetStatus } from './types.js';

export interface MyAssetsParams {
  /** 缺省 = 全部（服务端默认 `ALL`）；三态值透传 */
  status?: AssetStatus | 'ALL';
  q?: string;
  /** 排序档位（`T11-k` · 服务端白名单 `newest` / `downloads` / `stars`；**非法值静默回落 `newest`**） */
  sort?: string;
  /** 排序方向（缺省 = 该档**固有方向**；列头首点 `desc` —— design §4.7.2 两态） */
  dir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export async function fetchMyAssets(params: MyAssetsParams = {}, opts?: ApiGetOptions) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<AssetListResponse>(`/api/me/assets${suffix}`, opts);
}
