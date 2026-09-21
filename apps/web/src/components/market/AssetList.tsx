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
import { useI18n } from '../../i18n/I18nProvider.js';
import { AssetStat } from '../console/asset-stats.js';
import { formatDate, ownerText } from './format.js';

/** 列宽（design §3.1 · 7 列合计 100%；末列 = 动作槽取余量） */
const HEAD_NAME = 'w-[22%]';
const HEAD_DESC = 'w-[24%]';
const HEAD_AUTHOR = 'w-[14%]';
const HEAD_STAT = 'w-[10%] text-right';
const HEAD_UPDATED = 'w-[12%]';

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
}: {
  items: readonly AssetItem[];
  loading?: boolean;
  sorting: TableSortingProps;
}) {
  const { t } = useI18n();
  const columns = useMemo<Array<LegacyColumnDef<AssetItem, unknown>>>(
    () => [
      /* 1 名称：**纯文本**（D6 —— 进详情入口从「整行热区」搬到操作列）；超长截断保留 */
      {
        accessorKey: 'slug',
        header: t('market', 'colName'),
        meta: {
          headClassName: HEAD_NAME,
          /** 保护列（design §3.1 脚注 E7）：本笔不消费列开关，登记为后续「门户列开关」笔的预留 */
          hidable: false,
        } satisfies ColumnUiMeta,
        cell: ({ row }) => (
          <span className="block truncate font-medium">
            {row.original.latestName ?? row.original.slug}
          </span>
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
