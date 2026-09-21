import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/shadcn/card';
import type { AssetItem } from '../../api/types.js';
import { AssetStat } from '../console/asset-stats.js';
import { AssetAvatar } from '../ui/AssetAvatar.js';

/**
 * 资产卡（§4.4 v0.6 结构命名：card-head → title(main/meta) → card-desc）
 *
 * 换皮（plan T10）：玻璃面 → 白卡 `bg-card` + `shadow-sm`；hover = 底色变化（`bg-muted/50`）。
 *
 * **M4b-4 验收期四条调整（用户 2026-09-18 拍板）**：
 *  ① 下载图标 = 与详情页元信息卡/列表列**同件**（`AssetStat`，lucide `Download`）—— 退役文本字形 `⇣`
 *  ② **去掉卡片上的版本号**（元信息行只剩下载与收藏两个数值）
 *  ③ 收藏**纯展示**（`AssetStat kind="star"`，紧贴下载次数右侧，同件同款）—— 不响应点击；
 *     收藏交互的**唯一入口 = 资产详情页头卡**（`StarButton`）
 *  ④ **取消页脚整块**（原「作者」行 + 悬空圆点一并去掉），**让出的高度给描述** ⇒ `line-clamp-2` → **`-3`**
 *     卡片高度不变（`min-h-[158px]` ⇒ 网格节奏不变）；**作者不再显示在卡片上**（详情页仍显示）
 *
 * ⚠️ **DOM 结构（覆盖层 Link）**：`Card(relative)` → ① `<a class="absolute inset-0 z-0">`（整卡热区）
 * → ② 内容层 `relative z-10 pointer-events-none`（纯展示，点击一律穿透到 ①）。取舍：卡内**文本拖选**失效。
 * 卡内**无任何可交互元素**（星标已改纯展示）⇒ 无 nested interactive content 问题。
 */
export function AssetCard({
  item,
  status,
}: {
  item: AssetItem;
  /**
   * **可选状态徽标槽**（`T11-k` 追加）：控制台卡片视图需要「活跃/隐藏/归档」——
   * 门户不传 ⇒ 零变化（`AssetCard` 仍是纯展示卡）。传 `ReactNode` 而非布尔量 ⇒
   * 件内不取 i18n、不绑 `StatusPill`（调用方决定形态）。
   */
  status?: ReactNode;
}) {
  const to = `/assets/${encodeURIComponent(item.slug)}`;
  const displayName = item.latestName ?? item.slug;
  return (
    <Card className="group relative flex min-h-[158px] w-full cursor-pointer flex-col gap-0 px-[18px] pt-[18px] pb-[16px] transition-colors hover:bg-muted/50">
      {/* ① 覆盖层热区：整卡可点 */}
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
              {status ? <span className="shrink-0">{status}</span> : null}
              <AssetStat kind="download" count={item.downloadCount} />
              <AssetStat kind="star" count={item.starCount} />
            </div>
          </div>
        </div>
        {/* 描述：页脚取消后**独占剩余高度**（`flex-1` + `line-clamp-3`） */}
        <p className="line-clamp-3 flex-1 text-[13px] leading-[1.7] text-foreground/80">
          {item.latestDescription ?? ''}
        </p>
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
