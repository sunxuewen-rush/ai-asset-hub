/**
 * `/api/assets/:slug/star`（M4b-4 T16 · 契约 = 批 design §5.1 ⑧）。
 *
 * - `PUT` 收藏 / `DELETE` 取消收藏 —— **任意登录用户**（社交动作，不受 `canManageAsset` 约束）；
 *   匿名 ⇒ 401（前端 `StarButton` 拦截，不发写请求 —— §5.1 ⑧ 拍板）
 * - **幂等**：已收藏再 PUT ⇒ 计数不变（服务端 `ON CONFLICT DO NOTHING` + 同事务 ±1）
 * - 响应 `{ starCount, starred }`（同一形状两面共用）
 * - 授权集外（非 ACTIVE 且我无权）⇒ 404（沿 `assertAssetReadable`，不泄露存在性）
 *
 * **写后失效缓存**（本文件内做，非页面层）：star 计数出现在**三处读面**（列表 `?starCount` ·
 * 详情 · 门户卡/首页统计），页面级逐一失效易漏 ⇒ 收敛在此（批 plan T16 步骤 1 明写口径）。
 */
import { type ApiWriteOptions, apiDelete, apiPut, invalidateCache } from './client.js';

/** 读写面共用形状（服务端 `assets/stars.ts` 返回） */
export interface StarResult {
  starCount: number;
  starred: boolean;
}

function afterMutation(result: StarResult): StarResult {
  invalidateCache('/api/assets');
  return result;
}

/** 收藏（幂等：已收藏 ⇒ 200 且不重复计数） */
export async function starAsset(slug: string, opts?: ApiWriteOptions): Promise<StarResult> {
  return afterMutation(
    await apiPut<StarResult>(`/api/assets/${encodeURIComponent(slug)}/star`, undefined, opts),
  );
}

/** 取消收藏（幂等：未收藏 ⇒ 200） */
export async function unstarAsset(slug: string, opts?: ApiWriteOptions): Promise<StarResult> {
  return afterMutation(
    await apiDelete<StarResult>(`/api/assets/${encodeURIComponent(slug)}/star`, opts),
  );
}
