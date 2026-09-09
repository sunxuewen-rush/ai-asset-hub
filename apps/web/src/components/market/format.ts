import type { AssetItem } from '../../api/types.js';

/** 千分位/紧凑计数（demo 元数据 ⇣1.3K 形态——≥1000 → X.X K 去尾零；列表脚注/卡片通用） */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  const text = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '');
  return `${text}K`;
}

/** ISO 时间 → YYYY-MM-DD（demo 元信息日期形态；UTC 切片） */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * 作者展示（§5.2 G6：工号形态 userId（非 usr_ 前缀）→「displayName · userId」；
 * 本地账号只显姓名；无 displayName 时工号裸显、本地空显）
 */
export function ownerText(item: Pick<AssetItem, 'ownerDisplayName' | 'ownerId'>): string {
  const { ownerDisplayName, ownerId } = item;
  if (!ownerDisplayName) return ownerId.startsWith('usr_') ? '' : ownerId;
  return ownerId.startsWith('usr_') ? ownerDisplayName : `${ownerDisplayName} · ${ownerId}`;
}
