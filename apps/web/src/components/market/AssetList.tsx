/**
 * 资产行列表 —— **门户 preset**（表格族统一 · T11-j `j2` · 跨批 design §3）。
 *
 * 手写表格 → 消费统一件 `components/ui/DataTable.tsx`（同一件亦服务控制台三页）：
 * 本件只持**门户列定义 + preset 参数**，渲染（表头 / 排序头 / 骨架 / 行线）全部交给统一件。
 *
 * **列集合 7 列**（design §3.1）：名称 / 描述 / 作者 / 下载 / 收藏 / 更新 / **操作**（槽列）。
 * 列宽 **22 / 24 / 14 / 10 / 10 / 12 / 8 = 100%**（`table-fixed` 下为确定值）—— 末列 8% 由
 * 动作槽**自动取余量**（槽不在列定义里，无需声明宽度）。
 *
 * **与控制台 preset 的穷举差异仅 3 项**（design §3.3）：
 * ① 密度 `comfortable`（`py-4` · 行高 ≈55 · 阅读态）⇄ 控制台 40（`p-2` · 操作态）
 * ② 列宽 `table-fixed` + 百分比列（「描述 3 行」需有界宽）
 * ③ 空 / 错态**页面级**（本件只负责「有数据」与「载态」两态）
 * ⇒ 其余（列定义形态 · `meta` 约定 · 排序语义 · 操作列形态 · 类名纪律）**全部一致**。
 *
 * **观感零覆盖**（v1.22 → 本笔）：表头底纹 `bg-muted/50`（v1.22 为治「去卡后表头悬空」而加）
 * 与整行 stretched link **随 D3 / D6 退役** —— 结构改由官方行线 `[&_tr]:border-b` 划分；
 * 表头高 `h-10` 与单元格内距分别走官方默认 / `density`，**件内不再写任何外观类**。
 *
 * **排序档位由列 `meta.sortKey` 直接携带**（D5）：回调给出的 `key` **就是**服务端白名单档位
 * ⇒ 旧 `COLUMN_SORT`（列名 → 档）与 `DEFAULT_DIR` 两张表**退役**；
 * 「更新」列 ⟷ `newest` 档由该列 `meta.sortKey: 'newest'` 表达（**列名 ≠ 档名**）。
 */
import type { LegacyColumnDef } from '@tanstack/react-table/legacy';
import { Eye } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { type ColumnUiMeta, DataTable, type TableSortingProps } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/shadcn/button';
import type { AssetItem } from '../../api/types.js';
import { type DictKey, useI18n } from '../../i18n/I18nProvider.js';
import { AssetStat } from '../console/asset-stats.js';
import { AssetAvatar } from '../ui/AssetAvatar.js';
import { formatDate, ownerText } from './format.js';

/** 列宽（design §3.1 · 7 列合计 100%；末列 = 动作槽取余量） */
const HEAD_NAME = 'w-[22%]';
const HEAD_DESC = 'w-[24%]';
const HEAD_AUTHOR = 'w-[14%]';
const HEAD_STAT = 'w-[10%] text-right';
const HEAD_UPDATED = 'w-[12%]';

/**
 * 门户列集合（**列集合的单一事实源** · T11-j `j6`）：列定义与「列显示」菜单共用同一份 id / 文案键 /
 * 可隐藏性。`hidable: false` = **保护列**（名称 + 动作槽列 —— D0-7；槽列不在 `columns` 内 ⇒ 天然不可隐藏）。
 * ⚠️ 菜单项的 `key` **必须**与下表列定义的 `accessorKey` / `id` 一致，否则勾选不动列。
 */
export const PORTAL_COLUMNS: ReadonlyArray<{
  key: string;
  labelKey: DictKey<'market'>;
  hidable: boolean;
}> = [
  { key: 'slug', labelKey: 'colName', hidable: false },
  { key: 'desc', labelKey: 'colDesc', hidable: true },
  { key: 'author', labelKey: 'author', hidable: true },
  { key: 'downloadCount', labelKey: 'colDownload', hidable: true },
  { key: 'starCount', labelKey: 'star', hidable: true },
  { key: 'updatedAt', labelKey: 'colUpdated', hidable: true },
  /* 动作槽列（**不在 `columns` 内**）：无对应列 id ⇒ 永远不可隐藏（键仅作菜单项身份） */
  { key: 'rowActions', labelKey: 'colActions', hidable: false },
];

/**
 * 门户 preset：把 `items` 投影成 7 列表格。
 *
 * @param items   列表数据（`GET /api/assets` 的 `items`）
 * @param loading 载态（统一件 `keepHeader`：表头保留**且可点** + 5 行骨架 —— design §2.6 / U3）
 * @param sorting 排序头受控参数（`{ key, dir, onChange }`；`key` = 档位，缺省 = 未排序）
 */
export function AssetList({
  items,
  loading = false,
  sorting,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  items: readonly AssetItem[];
  loading?: boolean;
  sorting: TableSortingProps;
  /** **列显示**（`j6` · 受控 · 不传 ⇒ 全列可见 = 现状）；入口在页面工具条（design §2.8 V1） */
  columnVisibility?: Record<string, boolean>;
  /** 列显示回调（受控 · 件内不自持状态 · **不持久化** —— 与「视图切换不记忆」同口径） */
  onColumnVisibilityChange?: (next: Record<string, boolean>) => void;
}) {
  const { t } = useI18n();
  const columns = useMemo<Array<LegacyColumnDef<AssetItem, unknown>>>(
    () => [
      /* 1 名称：**首字母色块 + 纯文本**（2026-09-21 用户：「资产名称列除了文字，可以像卡片一样加一下图标么」
         ⇒ 复用**卡片同源件** `AssetAvatar`（hash 恒色 · 官方 `Avatar` + `AvatarFallback` · 自带 `aria-hidden`）·
         **24px**（行高 65px 同级别；字号 = 24 × 0.42 = 10px，拉丁/CJK 均清楚）· **纯展示不响应点击**
         （进详情入口仍在操作列 —— D6）· **列宽不动**（色块 + 8px 间距约 32px ≈ 表宽 2.8%，长名早截一点）*/
      {
        accessorKey: 'slug',
        header: t('market', 'colName'),
        meta: {
          headClassName: HEAD_NAME,
          /** 保护列（design §3.1 脚注 E7）：不可隐藏（列开关消费于 `j6`，本列 `hidable: false`） */
          hidable: false,
        } satisfies ColumnUiMeta,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <AssetAvatar name={row.original.latestName ?? row.original.slug} size={24} />
            {/* `min-w-0` 必需：flex 子项默认 `min-width: auto` ⇒ 缺它则 `truncate` 失效、撑破列宽 */}
            <span className="block min-w-0 truncate font-medium">
              {row.original.latestName ?? row.original.slug}
            </span>
          </div>
        ),
      },
      /* 2 描述：最多 3 行 + 省略号（官方 `TableCell` 自带 `whitespace-nowrap` ⇒ 须 `whitespace-normal` 解开） */
      {
        id: 'desc',
        header: t('market', 'colDesc'),
        meta: {
          headClassName: HEAD_DESC,
          cellClassName: 'whitespace-normal text-muted-foreground',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => (
          <div className="line-clamp-3 min-w-0">{row.original.latestDescription ?? ''}</div>
        ),
      },
      /* 3 作者（派生 `ownerText`）· 4 下载 · 5 收藏 · 6 更新 —— 后三列可点排序（天然方向 desc） */
      {
        id: 'author',
        header: t('market', 'author'),
        meta: {
          headClassName: HEAD_AUTHOR,
          cellClassName: 'text-muted-foreground',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => <div className="truncate">{ownerText(row.original)}</div>,
      },
      {
        accessorKey: 'downloadCount',
        header: t('market', 'colDownload'),
        meta: {
          headClassName: HEAD_STAT,
          cellClassName: 'text-right',
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'downloads',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => <AssetStat kind="download" count={row.original.downloadCount} />,
      },
      {
        accessorKey: 'starCount',
        header: t('market', 'star'),
        meta: {
          headClassName: HEAD_STAT,
          cellClassName: 'text-right',
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'stars',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => <AssetStat kind="star" count={row.original.starCount} />,
      },
      {
        accessorKey: 'updatedAt',
        header: t('market', 'colUpdated'),
        meta: {
          headClassName: HEAD_UPDATED,
          cellClassName: 'text-muted-foreground tabular-nums',
          sortable: true,
          naturalDir: 'desc',
          /** 「更新」列 ⟷ `newest` 档（列名 ≠ 档名 —— D5 落地） */
          sortKey: 'newest',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => <div className="truncate">{formatDate(row.original.updatedAt)}</div>,
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(item) => String(item.id)}
      loading={loading}
      /** 载态：表头保留 + 骨架（与真表同形，避免载入完成时表头跳动）—— 门户原形态 */
      loadingVariant="keepHeader"
      /** 读数态密度（design §3.3 差异①） */
      density="comfortable"
      /** 列宽确定化（差异②）：百分比列在有界宽下「描述 3 行」才成立 */
      tableClassName="table-fixed"
      /** dogfood 稳定锚点（门户断言按 `[data-asset-row]` 计数） */
      rowProps={(item) => ({ 'data-asset-row': item.slug })}
      sorting={sorting}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={onColumnVisibilityChange}
      emptyMessage={t('market', 'noResult')}
      /* 进详情入口（D6）：操作列 = `Eye` 图标钮**真链接**（列表 ↔ 详情零中间态 · 管理动作全归详情页） */
      rowActions={(item) => (
        <Button asChild size="icon-sm" variant="ghost">
          <Link
            to={`/assets/${encodeURIComponent(item.slug)}`}
            aria-label={t('market', 'actionOpen')}
          >
            <Eye aria-hidden />
          </Link>
        </Button>
      )}
      /** 操作列**可见**表头（D6 拍板）· a11y 名同值 */
      rowActionsHeader={t('market', 'colActions')}
      rowActionsLabel={t('market', 'colActions')}
    />
  );
}
