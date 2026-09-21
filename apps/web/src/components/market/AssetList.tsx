/**
 * 资产**行列表**（M4b-4 批 T11-e「验收期 UI 调整轮」· 门户视图切换——列表形态）。
 *
 * 形态件 = **官方 `Table` 家族**（`ui/shadcn/table.tsx`，M4b-1 落仓）：`Table`（`table-fixed`）→
 * `TableHeader`/`TableHead` → `TableBody`/`TableRow`/`TableCell`。**不自造行骨架**——列头、表线、
 * 列集合 **六列**：名称 / 描述 / 作者 / 下载 / 收藏 / **更新**（`updatedAt` · 2026-09-20 用户要求）——
 * **可点排序五列**（名称/作者/下载/收藏/**更新 ⟷ `newest` 档**；**描述列不可点**）。
 *
 * **覆盖面（逐条交代 · 与本件行内注释一一对应）**：表线/表头结构走官方默认；
 * **布局类覆盖 3 项** —— `table-fixed`（列宽确定 · 便于截断）+ 百分比列宽（`HEAD_*`）+ 单元格 `py-4`（行距加宽）；
 * **观感类覆盖 1 项** —— 表头 `bg-muted/50`（去卡化后表头悬空；取值同官方 `TableFooter`）。
 * 观感类覆盖仅此 1 处 ⇒ 与控制台 `ui/DataTable` 的「零外观覆盖」纪律的**唯一差异**即此项（F79 订正）。
 *
 * 形态取舍（用户 2026-09-18 拍板，先试 A）：
 * - 首选 `Item`（官方列表件）后**弃用** —— 带边框的 `Item` 逐行成卡，「列表」读起来碎/松
 * - 改 `Table`：列头 + 列对齐 + 官方默认密度（单元格 `p-2` ⇒ 行高 ≈40，**不覆盖内距**）
 * - 官方注册表**没有** `list` 件（64 件实测核对：只有 `table` / `data-table` / `item`）
 *
 * 与网格形态（`AssetCard` / `AssetGrid`）同源不同形：共用 `AssetItem` 投影与 `AssetStat` 展示小件。
 *
 * ⚠️ **整行热区（stretched link）**：`TableRow`（`relative`）→ 首列 `<Link>` 用
 * `after:absolute after:inset-0` 把热区撑满整行（表内不能挂「行级 `<a>`」——`<tr>` 子元素只能是
 * 单元格）。绝对定位伪元素按绘制层序**盖在同层普通内容之上** ⇒ 点击任意单元格都落到链接；
 * 代价与网格卡一致：行内文本**拖选失效**，行内**零可交互元素**（下载/收藏纯展示）。
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/shadcn/button';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import type { AssetItem } from '../../api/types.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { AssetStat } from '../console/asset-stats.js';
import { formatDate, ownerText } from './format.js';

/**
 * 列宽（`table-fixed` 下为确定值）：**百分比** —— 定宽在窄视口会把「描述」列压成几十像素
 * （实测：定宽 248/190/104/104 时描述列仅剩 45px）。百分比让五列在任意视口按比例分宽，
 * 描述列恒得 30%（≈207px @ 691 内容宽）。
 */
const HEAD_NAME = 'w-[24%]';
const HEAD_AUTHOR = 'w-[16%]';
const HEAD_STAT = 'w-[11%] text-right';
/** 「更新」列宽（12% —— 6 列总和 100%；`YYYY-MM-DD` 10 字符 ≈80px 够用） */
const HEAD_UPDATED = 'w-[12%]';

/**
 * 单元格纵向内距（用户 2026-09-18「行距加宽」）：官方默认 `p-2`（上下各 8 ⇒ 行高 39）偏紧，
 * 覆写为 `py-4`（上下各 16 ⇒ 行高 ≈55）。**只动纵向，横向仍用官方 `px-2`**。
 */
const CELL_PAD = 'py-4';

/**
 * 排序档位（T11-f）：与服务端 `ASSET_SORT_VALUES` **同值域**（五档）。
 * 列头可点的是其中**四列**（`SortColumn`）—— 「最新」(`newest`) 无对应列，只能由工具条 chips 回位。
 */
export type SortKey = 'newest' | 'downloads' | 'stars' | 'name' | 'author';
export type SortDir = 'asc' | 'desc';
/**
 * 可点列（**五列**）：`updated` 列 **⟷ `newest` 档**（= `updated_at desc, id desc`）——
 * 用户 2026-09-20：「资产列加一个『更新』对应更新时间，和我们的『排序-最新』相对应」。
 */
export type SortColumn = 'name' | 'author' | 'downloads' | 'stars' | 'updated';
/**
 * 列 → 排序档位（**导出**：调用方 `CenterPage` 用它把「列」译成「档」再落 URL —— 单一事实源）。
 * `updated` 列复用 `newest` 档 ⇒ 点「更新」列写的是 `?sort=newest`（**不是** `?sort=updated`）。
 */
export const COLUMN_SORT: Record<SortColumn, SortKey> = {
  name: 'name',
  author: 'author',
  downloads: 'downloads',
  stars: 'stars',
  updated: 'newest',
};

/**
 * 档位**固有方向**（design §4.7.5 映射表同源）：下载/收藏 = `desc`（热度高在前）· 名称/作者 = `asc`。
 * 用于 ① chips 驱动（URL 无 `dir`）时**图标与 `aria-sort` 的真值** ② 列头点同列时的**切换基准**。
 * ⚠️ **列头首点某列不用此表** —— 首点恒 `desc`（官方配方 `toggleSorting(false)` 同口径；F84 订正）。
 */
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  newest: 'desc',
  downloads: 'desc',
  stars: 'desc',
  name: 'asc',
  author: 'asc',
};

/** 载态槽位（5 行 ≈ 首屏观感；槽位名做 key —— `noArrayIndexKey` 规则：禁数组下标做 key） */
const LOADING_ROWS = ['lr1', 'lr2', 'lr3', 'lr4', 'lr5'];

/**
 * 列表面板（官方 `Table` + 表头；与网格 `AssetGrid` 分属两种密度）。
 *
 * **与页面背景融为一体**（用户 2026-09-18 拍板）：**不加**外层 `border` / `bg-card` / 圆角面板
 * —— 表格直接落在页面底上，只靠官方自带的**表头底纹**（`bg-muted/50`）与**行分隔线**
 * （`TableRow` 的 `border-b`，末行自动去线）划出结构。
 */
export function AssetList({
  children,
  sortKey,
  dir,
  onSortChange,
}: {
  children: ReactNode;
  /** 当前排序档位（T11-f）；缺省 ⇒ 列头退化为**纯文本表头**（载态骨架等场景） */
  sortKey?: SortKey;
  /** 方向覆盖（仅列头写入）；缺省 ⇒ 按 `DEFAULT_DIR` 定档位固有方向 */
  dir?: SortDir;
  /** 列头点击（T11-f 两态）：`nextDir` = 应用后的方向（首点该列 `desc` · 再点反向） */
  onSortChange?: (column: SortColumn, nextDir: SortDir) => void;
}) {
  const { t } = useI18n();
  return (
    <Table className="table-fixed">
      {/* 表头底纹（v1.22 观感收口）：官方 `TableHeader` 本身无底色，去卡化后表头在页面底上「悬空」
          ⇒ 补官方既有语汇 `bg-muted/50`（同官方 `TableFooter` 取值）—— 本件唯一观感类覆盖 */}
      <TableHeader className="bg-muted/50">
        <TableRow>
          {/* 四列可点排序（T11-f · design §4.7.2）；**描述列不可点** */}
          <SortableHead
            column="name"
            className={HEAD_NAME}
            sortKey={sortKey}
            dir={dir}
            onSortChange={onSortChange}
          >
            {t('market', 'colName')}
          </SortableHead>
          <TableHead>{t('market', 'colDesc')}</TableHead>
          <SortableHead
            column="author"
            className={HEAD_AUTHOR}
            sortKey={sortKey}
            dir={dir}
            onSortChange={onSortChange}
          >
            {t('market', 'author')}
          </SortableHead>
          <SortableHead
            column="downloads"
            className={HEAD_STAT}
            sortKey={sortKey}
            dir={dir}
            onSortChange={onSortChange}
          >
            {t('market', 'colDownload')}
          </SortableHead>
          <SortableHead
            column="stars"
            className={HEAD_STAT}
            sortKey={sortKey}
            dir={dir}
            onSortChange={onSortChange}
          >
            {t('market', 'star')}
          </SortableHead>
          {/* 「更新」列（2026-09-20 用户要求）：显示 `updatedAt`，**与「排序 - 最新」同档**（可点 ⇒ `?sort=newest`）*/}
          <SortableHead
            column="updated"
            className={HEAD_UPDATED}
            sortKey={sortKey}
            dir={dir}
            onSortChange={onSortChange}
          >
            {t('market', 'colUpdated')}
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

/**
 * 可点列头（T11-f）= 官方 `Button`（`variant="ghost"` `size="sm"`）包住**列名 + 方向图标**
 * （官方 data-table Sorting 配方；图标 = lucide `ArrowUpDown` 未排 / `ArrowUp` 升 / `ArrowDown` 降）。
 *
 * `aria-sort` 落在 `th`（`none ｜ ascending ｜ descending` —— 与「当前档位」同源，非当前列恒 `none`）。
 * **无 `onSortChange`（载态骨架）⇒ 退化为纯文本表头**（同一件两态，免第二套骨架件）。
 */
function SortableHead({
  column,
  className,
  sortKey,
  dir,
  onSortChange,
  children,
}: {
  column: SortColumn;
  className?: string;
  sortKey?: SortKey;
  dir?: SortDir;
  onSortChange?: (column: SortColumn, nextDir: SortDir) => void;
  children: ReactNode;
}) {
  if (!onSortChange) return <TableHead className={className}>{children}</TableHead>;
  const active = sortKey === COLUMN_SORT[column];
  // 有效方向 = 显式 `dir` ∨ 档位固有方向（`Select` 驱动时 URL 无 `dir`）
  const effective: SortDir = dir ?? DEFAULT_DIR[COLUMN_SORT[column]];
  const ariaSort = active ? (effective === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = active ? (effective === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead aria-sort={ariaSort} className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          // 两态：**首点该列 ⇒ desc**（未排/异列）· 再点 ⇒ 反向（design §4.7.2/§4.7.3；F84 订正）
          onSortChange(column, active && effective === 'desc' ? 'asc' : 'desc')
        }
      >
        {children}
        <Icon aria-hidden />
      </Button>
    </TableHead>
  );
}

/** 载态（表头保留 + 5 行骨架 —— 与真表同形，避免载入完成时表头跳动） */
export function AssetListLoading() {
  return (
    <AssetList>
      {LOADING_ROWS.map((slot) => (
        <TableRow key={slot}>
          <TableCell colSpan={6} className={CELL_PAD}>
            <Skeleton className="h-5 w-full rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </AssetList>
  );
}

export function AssetListRow({ item }: { item: AssetItem }) {
  const to = `/assets/${encodeURIComponent(item.slug)}`;
  const displayName = item.latestName ?? item.slug;
  const owner = ownerText(item);
  return (
    <TableRow
      className="group relative cursor-pointer hover:bg-muted/50"
      data-asset-row={item.slug}
    >
      {/* 名称列：stretched link 把热区撑满整行 */}
      <TableCell className={CELL_PAD}>
        <Link
          to={to}
          aria-label={displayName}
          className="after:absolute after:inset-0 after:content-['']"
        >
          <span className="block truncate font-medium transition-colors group-hover:text-primary">
            {displayName}
          </span>
        </Link>
      </TableCell>
      {/* 描述列（用户 2026-09-18）：**最多 3 行 + 省略号**。官方 `TableCell` 自带
          `whitespace-nowrap` ⇒ 必须 `whitespace-normal` 解开才可换行；`line-clamp-3` 在行数
          上限处自动加省略号。行高因此随描述长度自适应（1 行 55 ⇒ 3 行 ≈97，名称/作者/数值
          由官方 `align-middle` 垂直居中） */}
      <TableCell className={`${CELL_PAD} whitespace-normal text-muted-foreground`}>
        <div className="line-clamp-3 min-w-0">{item.latestDescription ?? ''}</div>
      </TableCell>
      <TableCell className={`${CELL_PAD} text-muted-foreground`}>
        <div className="truncate">{owner}</div>
      </TableCell>
      <TableCell className={`${CELL_PAD} text-right`}>
        <AssetStat kind="download" count={item.downloadCount} />
      </TableCell>
      <TableCell className={`${CELL_PAD} text-right`}>
        <AssetStat kind="star" count={item.starCount} />
      </TableCell>
      {/* 更新时间（与控制台「更新」列同格式：`formatDate` = `YYYY-MM-DD`；`tabular-nums` 对齐数字）*/}
      <TableCell className={`${CELL_PAD} text-muted-foreground tabular-nums`}>
        <div className="truncate">{formatDate(item.updatedAt)}</div>
      </TableCell>
    </TableRow>
  );
}
