import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/shadcn/card';
import type { AssetItem } from '../../api/types.js';
import { AssetStat } from '../console/asset-stats.js';
import { AssetAvatar } from '../ui/AssetAvatar.js';
import { ownerText } from './format.js';

/**
 * 资产卡（§4.4 v0.6 结构命名：card-head → title(main/meta) → card-desc → card-foot）
 *
 * 换皮（plan T10）：玻璃面 → 白卡 `bg-card` + `shadow-sm`；hover = 底色变化（`bg-muted/50`）。
 * 不变：`compactCount`/`ownerText` 口径 · `line-clamp-2` 描述。
 *
 * **M4b-4 验收期三条调整（用户 2026-09-18 拍板）**：
 *  ① 下载图标 = 与详情页元信息卡/列表列**同件**（`AssetStat`，lucide `Download`）—— 退役文本字形 `⇣`
 *  ② **去掉卡片上的版本号**（元信息行只剩下载与收藏两个数值）
 *  ③ 收藏**在卡片上是纯展示**（`AssetStat kind="star"`，紧贴下载次数右侧，与下载同款度量：图标 `size-3.5` ·
 *     `text-[11px] tabular-nums` · `text-muted-foreground`）—— **不响应点击**，与元信息同级；
 *     收藏交互的**唯一入口 = 资产详情页头卡**（`StarButton`，仍为登录用户可用）
 *
 * ⚠️ **DOM 结构（覆盖层 Link）**：`Card(relative)` → ① `<a class="absolute inset-0 z-0">`（整卡热区，含页脚一行）
 * → ② 内容层 `relative z-10 pointer-events-none`（纯展示，点击一律穿透到 ①）。取舍：卡内**文本拖选**失效。
 * （历史：早先为让收藏按钮可点曾把 `<Link>` 只包主体 —— F58；星标改纯展示后不再有嵌套 interactive content 问题，
 * 覆盖层保留的理由变成「**整卡可点（含页脚）**」。）
 */
export function AssetCard({ item }: { item: AssetItem }) {
  const to = `/assets/${encodeURIComponent(item.slug)}`;
  const displayName = item.latestName ?? item.slug;
  const author = ownerText(item);
  return (
    <Card className="group relative flex min-h-[158px] w-full cursor-pointer flex-col gap-0 px-[18px] pt-[18px] transition-colors hover:bg-muted/50">
      {/* ① 覆盖层热区：整卡可点（含页脚） */}
      <Link to={to} aria-label={displayName} className="absolute inset-0 z-0 rounded-xl" />
      {/* ② 内容层：纯展示，点击一律穿透到 ① */}
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="mb-2.5 flex items-center gap-3">
          <AssetAvatar name={displayName} size={40} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="truncate text-base leading-[1.25] font-bold tracking-[-0.3px] transition-colors group-hover:text-primary">
                {displayName}
              </h3>
            </div>
            {/* 元信息行：下载 + 收藏（两者**同件同款 · 纯展示**——图标一律无色、不表达收藏态，
                与列表「收藏」列 / 详情页元信息卡同口径） */}
            <div className="flex min-w-0 items-center gap-3.5 text-[11px]">
              <AssetStat kind="download" count={item.downloadCount} />
              <AssetStat kind="star" count={item.starCount} />
            </div>
          </div>
        </div>
        <p className="mb-3 line-clamp-2 flex-1 text-[13px] leading-[1.7] text-foreground/80">
          {item.latestDescription ?? ''}
        </p>
      </div>
      <div className="pointer-events-none relative z-10 flex items-center gap-[7px] overflow-hidden border-t border-border pt-[9px] pb-[11px] text-[11px] whitespace-nowrap text-muted-foreground">
        {author && (
          <>
            <b className="overflow-hidden font-normal text-ellipsis">{author}</b>
            <span className="size-[3px] shrink-0 rounded-full bg-muted-foreground/40" />
          </>
        )}
      </div>
    </Card>
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
