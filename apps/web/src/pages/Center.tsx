import type { AssetType } from '../api/types.js';
import { CenterPage } from '../components/market/CenterPage.js';

export type CenterType = AssetType;

/** 中心页路由壳（design §3：类型即路由——type 注入参数化 CenterPage） */
export function Center({ type }: { type: CenterType }) {
  return <CenterPage type={type} />;
}
