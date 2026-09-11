import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AssetItem } from '../../api/types.js';
import { AssetAvatar } from '../ui/AssetAvatar.js';
import { compactCount, ownerText } from './format.js';

/**
 * 资产卡（§4.4 v0.6 正式结构命名一步到位：card-head → title(main/meta) → card-desc → card-foot）
 *
 * 换皮（plan T10）：玻璃面 → 白卡 `bg-card` + `shadow-sm`（无边框，卡片圆角按 design ③ card 真值
 * `rounded-xl`）；hover 由「位移 -2px + 投影升」改**底色变化**（`bg-muted/50`，design ⑥），
 * 标题变 primary 的既有反馈保留；字阶收敛（15.5→16 / 12.5→13 / 11.5→11）。
 * 不变：完整卡可点 → 详情路由 · `compactCount`/`ownerText` 口径 · `line-clamp-2` 描述 · DOM 结构。
 */
export function AssetCard({ item }: { item: AssetItem }) {
  const to = `/assets/${encodeURIComponent(item.slug)}`;
  const displayName = item.latestName ?? item.slug;
  const author = ownerText(item);
  return (
    <Link
      to={to}
      className="group flex min-h-[158px] cursor-pointer flex-col rounded-xl bg-card px-[18px] pt-[18px] text-inherit no-underline shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="mb-2.5 flex items-center gap-3">
        <AssetAvatar name={displayName} size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3 className="truncate text-base leading-[1.25] font-bold tracking-[-0.3px] transition-colors group-hover:text-primary">
              {displayName}
            </h3>
          </div>
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="inline-flex items-center text-[11px] text-muted-foreground tabular-nums">
              ⇣ {compactCount(item.downloadCount)}
            </span>
            {item.latestVersion && (
              <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                v{item.latestVersion}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="mb-3 line-clamp-2 flex-1 text-[13px] leading-[1.7] text-foreground/80">
        {item.latestDescription ?? ''}
      </p>
      <div className="flex items-center gap-[7px] overflow-hidden border-t border-border pt-[9px] pb-[11px] text-[11px] whitespace-nowrap text-muted-foreground">
        {author && (
          <>
            <b className="overflow-hidden font-normal text-ellipsis">{author}</b>
            <span className="size-[3px] shrink-0 rounded-full bg-muted-foreground/40" />
          </>
        )}
      </div>
    </Link>
  );
}

/** 网格容器（4 列 × 行；响应式降列——§4.4 断点 1200/900） */
export function AssetGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-4 gap-[14px] max-[1200px]:grid-cols-3 max-[900px]:grid-cols-2">
      {children}
    </div>
  );
}
