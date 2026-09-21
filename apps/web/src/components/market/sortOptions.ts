/**
 * 市场排序档位常量（**T11-i A 部分上提** · M4a design §8.12「常量上提」）
 *
 * 原住 `CenterPage.tsx:48,113,115,119`（T11-f 落地）。上提理由 = 新增的 `/search` 结果页需要
 * **同一套**档位 / 白名单守卫 / 标签键 / 页长 ⇒ 不复制第二份（单一事实源）。
 * **行为零变化**：`CenterPage` 仅改 import（其 dogfood 断言与既有排序断言守）。
 */
/**
 * 排序档位类型（**T11-j j2 归位**）：原住门户 `AssetList.tsx`；但白名单 / 守卫 / 标签键都由本模块
 * 持有 ⇒ 类型随之上提，避免「类型住在 UI 件里」的反向依赖。
 * ⚠️ 值域**三档**（`newest` / `downloads` / `stars`）—— `name` / `author` 已于 **T11-j `j3`** 随 **D0-8** 下线。
 */
export type SortKey = 'newest' | 'downloads' | 'stars';

/** 每页条数（门户中心页与结果页同值 · 与 `GET /api/assets` 的 `limit` 配套） */
export const PAGE_SIZE = 20;

/**
 * 排序档位（T11-f · design §4.7.5 · 与服务端 `ASSET_SORT_VALUES` 同值域）。
 * 顺序 = `Select` 选项序（默认档「最新」在首）。
 */
export const SORT_OPTIONS = ['newest', 'downloads', 'stars'] as const;

/** 档位白名单守卫（T11-f）：URL 值归一 —— 非法 ⇒ 回落默认档（与服务端「静默回落」同口径） */
export function isSortKey(value: string | undefined): value is SortKey {
  return value !== undefined && (SORT_OPTIONS as readonly string[]).includes(value);
}

/** 档位 → i18n 标签键（`market` 组） */
export const SORT_LABEL_KEYS = {
  newest: 'sortNewest',
  downloads: 'sortDownloads',
  stars: 'sortStars',
} as const;
