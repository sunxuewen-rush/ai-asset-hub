/**
 * 资产**行列表**（M4b-4 批 T11-e「验收期 UI 调整轮」· 门户视图切换——列表形态）。
 *
 * 形态件 = **官方 `Table` 家族**（`ui/shadcn/table.tsx`，M4b-1 落仓）：`Table`（`table-fixed`）→
 * `TableHeader`/`TableHead` → `TableBody`/`TableRow`/`TableCell`。**不自造行骨架**——列头、表线、
 * **覆盖面（逐条交代 · 与本件行内注释一一对应）**：表线/表头结构走官方默认；
 * **布局类覆盖 3 项** —— `table-fixed`（列宽确定 · 便于截断）+ 百分比列宽（`HEAD_*`）+ 单元格 `py-4`（行距加宽）；
 * **观感类覆盖 1 项** —— 表头 `bg-muted/50`（去卡化后表头悬空；取值同官方 `TableFooter`）。
 * 观感类覆盖仅此 1 处 ⇒ 与控制台 `console/DataTable` 的「零外观覆盖」纪律的**唯一差异**即此项（F79 订正）。
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
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
import { ownerText } from './format.js';

/**
 * 列宽（`table-fixed` 下为确定值）：**百分比** —— 定宽在窄视口会把「描述」列压成几十像素
 * （实测：定宽 248/190/104/104 时描述列仅剩 45px）。百分比让五列在任意视口按比例分宽，
 * 描述列恒得 30%（≈207px @ 691 内容宽）。
 */
const HEAD_NAME = 'w-[26%]';
const HEAD_AUTHOR = 'w-[20%]';
const HEAD_STAT = 'w-[12%] text-right';

/**
 * 单元格纵向内距（用户 2026-09-18「行距加宽」）：官方默认 `p-2`（上下各 8 ⇒ 行高 39）偏紧，
 * 覆写为 `py-4`（上下各 16 ⇒ 行高 ≈55）。**只动纵向，横向仍用官方 `px-2`**。
 */
const CELL_PAD = 'py-4';

/** 载态槽位（5 行 ≈ 首屏观感；槽位名做 key —— `noArrayIndexKey` 规则：禁数组下标做 key） */
const LOADING_ROWS = ['lr1', 'lr2', 'lr3', 'lr4', 'lr5'];

/**
 * 列表面板（官方 `Table` + 表头；与网格 `AssetGrid` 分属两种密度）。
 *
 * **与页面背景融为一体**（用户 2026-09-18 拍板）：**不加**外层 `border` / `bg-card` / 圆角面板
 * —— 表格直接落在页面底上，只靠官方自带的**表头底纹**（`bg-muted/50`）与**行分隔线**
 * （`TableRow` 的 `border-b`，末行自动去线）划出结构。
 */
export function AssetList({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Table className="table-fixed">
      {/* 表头底纹（v1.22 观感收口）：官方 `TableHeader` 本身无底色，去卡化后表头在页面底上「悬空」
          ⇒ 补官方既有语汇 `bg-muted/50`（同官方 `TableFooter` 取值）—— 本件唯一观感类覆盖 */}
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className={HEAD_NAME}>{t('market', 'colName')}</TableHead>
          <TableHead>{t('market', 'colDesc')}</TableHead>
          <TableHead className={HEAD_AUTHOR}>{t('market', 'author')}</TableHead>
          <TableHead className={HEAD_STAT}>{t('market', 'colDownload')}</TableHead>
          <TableHead className={HEAD_STAT}>{t('market', 'star')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

/** 载态（表头保留 + 5 行骨架 —— 与真表同形，避免载入完成时表头跳动） */
export function AssetListLoading() {
  return (
    <AssetList>
      {LOADING_ROWS.map((slot) => (
        <TableRow key={slot}>
          <TableCell colSpan={5} className={CELL_PAD}>
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
    </TableRow>
  );
}
