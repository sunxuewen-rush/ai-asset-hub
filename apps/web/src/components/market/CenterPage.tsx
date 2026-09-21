import { LayoutGrid, List, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardHeader } from '@/components/ui/shadcn/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/shadcn/input-group';
import {} from '@/components/ui/shadcn/select';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/shadcn/toggle-group';
import { fetchAssetList } from '../../api/assets.js';
import { fetchStats } from '../../api/stats.js';
import type { AssetItem, AssetType } from '../../api/types.js';
import { useApi } from '../../hooks/useApi.js';
import type { SortDir } from '../../hooks/useMarketQuery.js';
import { useMarketQuery } from '../../hooks/useMarketQuery.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { EmptyState } from '../ui/EmptyState.js';
import { ErrorState } from '../ui/ErrorState.js';
import { Pagination } from '../ui/Pagination.js';
import { TypeIcon } from '../ui/TypeIcon.js';
import { AssetCard, AssetGrid } from './AssetCard.js';
import { AssetList, PORTAL_COLUMNS } from './AssetList.js';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu.js';
import { FilterStrip } from './FilterStrip.js';
import { SortMenu } from './SortMenu.js';
// 排序档位常量（T11-i A 上提）：与 `/search` 结果页**同源**（design §8.12「常量上提」—— 本件改 import，行为零变化）
import { isSortKey, PAGE_SIZE, type SortKey } from './sortOptions.js';

/**
 * 视图形态（T11-e）：默认**网格**；`list` = 单列行列表（`AssetList`）。
 *
 * **不落 URL、不落存储**（用户 2026-09-18 拍板「不用记忆」）：由组件 state 承载 ⇒
 * 同页内翻页（`?page=`）/ 搜索（`?q=`）/ 筛标签都**保持视图**（同一路由同元素 ⇒ 组件不卸载）；
 * 离开页面 / 刷新 / 后退前进 ⇒ 重新挂载 ⇒ 回默认网格。
 */
type ViewMode = 'grid' | 'list';

/**
 * 载态骨架槽位（本批 §3.10：各页载态 → 官方 `Skeleton`）：**8 壳 = 1440 断点首屏可见量**
 * （`AssetGrid` 4 列 × 2 行）。槽位名做 `key`（`noArrayIndexKey` 规则：禁数组下标做 key）。
 */
const LOADING_SLOTS = ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7', 'sk8'];
/** 载态时传给 `AssetList` 的空数据（模块级常量：避免每次渲染新建空数组） */
const NO_ITEMS: readonly AssetItem[] = [];

type MarketKey =
  | 'centerTitleSkill'
  | 'centerTitleMcps'
  | 'centerTitleAgents'
  | 'centerDescSkill'
  | 'centerDescMcps'
  | 'centerDescAgents'
  | 'searchPlaceholderSkill'
  | 'searchPlaceholderMcps'
  | 'searchPlaceholderAgents'
  | 'countBadgeSkill'
  | 'countBadgeMcps'
  | 'countBadgeAgents'
  | 'totalSkills'
  | 'totalMcps'
  | 'totalAgents';

const META: Record<
  AssetType,
  { title: MarketKey; desc: MarketKey; ph: MarketKey; badge: MarketKey; total: MarketKey }
> = {
  skill: {
    title: 'centerTitleSkill',
    desc: 'centerDescSkill',
    ph: 'searchPlaceholderSkill',
    badge: 'countBadgeSkill',
    total: 'totalSkills',
  },
  mcp: {
    title: 'centerTitleMcps',
    desc: 'centerDescMcps',
    ph: 'searchPlaceholderMcps',
    badge: 'countBadgeMcps',
    total: 'totalMcps',
  },
  agent: {
    title: 'centerTitleAgents',
    desc: 'centerDescAgents',
    ph: 'searchPlaceholderAgents',
    badge: 'countBadgeAgents',
    total: 'totalAgents',
  },
};

/**
 * 类型 icon tile 底色（§4.4 ② 类型色补丁 `--type-*` → `@theme` 映射；**查表替代旧
 * `styles[type]` 动态类名**——Tailwind 静态扫描不到拼接类，动态取值一律走查表）。
 */
const TILE_BG: Record<AssetType, string> = {
  skill: 'bg-type-skill',
  mcp: 'bg-type-mcp',
  agent: 'bg-type-agent',
};

/**
 * 页头 eyebrow：**语言中立的类型标识**（`SKILL` / `MCP` / `AGENT`）。
 *
 * 对齐 design §9 线框的「双语头」意图（`技能中心 Skill Center`）。**不用 i18n 键**：类型名不是
 * 可翻译副本，两种语言下都与 h1 不重复；旧实现误用 `meta.title`（与 h1 **同键**）⇒ 中文界面渲染
 * 「技能中心 / 技能中心」两行重复（自 `bdc0d5e` 中心页初版起，非换皮引入）。
 * 字面即大写（不依赖 CSS `uppercase` 才成大写）⇒ `textContent` / `innerText` 取值确定。
 */
const TYPE_EYEBROW: Record<AssetType, string> = {
  skill: 'SKILL',
  mcp: 'MCP',
  agent: 'AGENT',
};

/**
 * 中心页（design §3 v0.4 定稿：CenterHeader → 两级标签筛选条 → result-head → 4×5 网格 →
 * 分页；type 参数化——/skills|/mcps|/agents 同构）。列表请求以 URL 提交态驱动
 * （committedQ/labels/page——防抖只写 URL，请求随 URL 变发——design §7）。
 *
 * 换皮（plan T21，§4.4 SSOT）：
 * - 页头 `.glass`（毛玻璃 + 白色描边 + 蓝投影）→ **白卡 `bg-card` + `shadow-sm` + 圆角 18**
 *   （与 hero 同语法）；氛围光斑 `::before`（300px radial-gradient）整块删除（§4.4 废弃项）；
 *   `overflow-hidden`/`position:relative` 随光斑一并去除
 * - icon tile 52px 渐变（`--grad-skill/mcp/agent`）+ 蓝投影 → **44px 实底类型色 + 圆角 13px**
 *   + 白图标 22px（§4.4 ③ 类型 tile 真值；渐变只回品牌字/主 CTA/页面底三处）
 * - 页头搜索框改 shadcn `Input`（§4.1 纪律 1「交互件装原生」；与 hero 同件）——宽度、占位符、
 *   `aria-label`、受控行为不变 —— ⚠️ **该页头搜索框已于 v1.22（T11-e）移除**（用户「title 上的搜索就重复设计了」）：
 *   本页搜索唯一入口 = 工具条右侧的**折叠面板**（见下方 `searchOpen` 段）；本行保留为 M4a 迁移沿革
 * - 计数徽章（`--brand` #2563eb + rgba 衬底/描边 + r14）→ **hero 统计 tile 语法**（`bg-secondary`
 *   + `border-border` + `rounded-xl`），数字 `text-[22px] text-primary tabular-nums`
 * - 字阶收敛（§4.4 ⑤）：21 → `text-xl`(20，21 降 1px 归位) · 12.5 → `text-xs` · 13/11 保档
 * - 圆角轴（§4.4 ④）：18 → `rounded-2xl` · 14 → `rounded-xl` · 13 不成轴保 `rounded-[13px]`
 * - **页头 eyebrow 修重复**（用户 2026-09-11 拍板 (d)）：原文用 `t('market', meta.title)`（与 h1 同键）
 *   ⇒ zh 渲染「技能中心 / 技能中心」；改**语言中立的类型常量表** `TYPE_EYEBROW`（对齐 §9「双语头」）
 * 不变：请求编排（useApi / committedQ / labelsKey / retryTick）· `META` 动态 i18n 键 ·
 * 计数语义区分（徽章 = 全站总量，结果头在筛选激活时改「筛选结果」）· 三态（loading/error/empty）·
 * `PAGE_SIZE` 20 与分页 offset 换算 · `AssetGrid` 断点（4 → <1200 3 → <900 2）。
 */
export function CenterPage({ type }: { type: AssetType }) {
  const { t } = useI18n();
  const query = useMarketQuery({ sort: { defaultValue: 'newest' } });
  const { q, setQ, committedQ, labels, toggleLabel, clearLabels, page, setPage } = query;
  /**
   * 排序档位 / 方向（T11-f）：URL 值经**白名单归一** ⇒ 非法值回落 `newest`
   * （与服务端「静默回落」同口径 —— design §4.7.1 #4；防「URL 写 bogus 而服务端排 newest」的观感错位）。
   */
  const sort: SortKey = isSortKey(query.sort) ? query.sort : 'newest';
  const dir = query.dir;
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const [retryTick, setRetryTick] = useState(0);
  const [view, setView] = useState<ViewMode>('grid');
  /**
   * 折叠搜索（T11-e · 用户 2026-09-18「参考 ClawHub 切换钮左侧的搜索，点击后下方显示一个搜索框」）：
   * 默认收起；点触发钮在**工具条下方**展开一条撑满宽度的搜索条（官方 `Collapsible` + 官方 `InputGroup`）。
   * 复用 `useMarketQuery` 的**同一 `q`**（防抖 300ms 与 URL 写入由该 hook 统一负责）。
   * ⚠️ v1.22 前页头亦有搜索框、两者同源；页头搜索移除后本面板为**中心三页唯一搜索入口**（首页 `Hero` 的胶囊搜索属落地页入口，未动）。
   */
  const [searchOpen, setSearchOpen] = useState(false);
  /** 列显示（`j6` · 受控 · **不持久化** —— 与「视图切换不记忆」同口径） */
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  // 展开即聚焦输入框（ClawHub 实测不聚焦；本仓**有意 +1 行**：少一次点击，触屏/键盘都更顺）
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const labelsKey = labels.join(',');
  const {
    data: list,
    error,
    loading,
  } = useApi(
    (signal) =>
      fetchAssetList(
        {
          type,
          q: committedQ || undefined,
          labels: labels.length > 0 ? labels : undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          sort,
          dir,
        },
        { signal },
      ),
    [type, committedQ, labelsKey, page, retryTick, sort, dir],
  );

  const meta = META[type];
  const count = stats?.typeCounts[type];
  // 🟡2 计数语义区分：徽章 = 该类型全站总量（stats）；结果头在筛选激活时改用「筛选结果」文案
  const filtersActive = labels.length > 0 || committedQ !== '';

  /**
   * 翻页 → 滚动复位（design §3.11「**翻页回顶**」语义）。
   *
   * 2026-09-14 补齐：该语义在 M4a T9/T11 与批 design 均写入契约，但**代码中从无实现**（全仓滚动 API
   * 核查仅 `VersionCompare` 的 `scrollIntoView`）——按 design 「不变」契约补上，避免把「文档声明 vs
   * 代码」的债留到批末。瞬时滚动（不用 `smooth`：避免与列表重发 + 骨架替换叠动画）。
   */
  function handlePageChange(nextOffset: number) {
    setPage(Math.floor(nextOffset / PAGE_SIZE) + 1);
    window.scrollTo({ top: 0 });
  }

  /**
   * 列头可点排序（两态）：**档位由列 `meta.sortKey` 直接携带**（D5 —— 统一件回调给的就是档位），
   * 本处不再译档，只把结果落 URL：点**同列** ⇒ 写 `dir` 反向（`setDir`）；点**异列** ⇒
   * `setSort(档, 'desc')`（**首点降序**，官方配方 `toggleSorting(false)` 同口径）。两者内部均回第 1 页。
   * 回默认档 = 点工具条 `Select`「最新」（列头无「最新」列可比）。
   *
   * ⚠️ **F89 复发防线**：`key` 来自件回调（已由 `meta.sortKey` 归一）⇒ 不再有「把列名当档位」
   * 的失配（旧 `COLUMN_SORT` 译档表已退役）；此处仍以 `isSortKey` 兜一道，白名单外**不落 URL**。
   */
  function handleHeaderSort(key: string, nextDir: SortDir) {
    if (!isSortKey(key)) return;
    if (key === sort) query.setDir?.(nextDir);
    else query.setSort?.(key, nextDir);
  }

  return (
    <div className="flex flex-col">
      {/*
        ⚠️ T2 归位后的回归修复（2026-09-14 实测）：shadcn v4 的 `CardHeader` 自带
        `@container/card-header` ⇒ 计算样式 container-type: **inline-size**（内联尺寸包含）⇒
        **它不按内容撑开自身宽度**。放进 `flex flex-row` 当 flex item 时，自动宽度解析为 0，
        描述文字被压到 min-content（43~64px）⇒ 6~12 行、卡高 240~357px（/skills /mcps /agents 三页）。
        **`flex-1` 为必需项**：显式给这个 flex item 宽度上下文（形态零变化：图标 44 / 搜索框 240 /
        计数块 97 / 内距 26·22 均不动 —— **原「搜索框 240」已随 v1.22 删页头搜索移除**）。后续 Card 子件进 flex 行时同查此坑。
      */}
      <Card className="mb-4 flex flex-row items-center gap-5 px-[26px] py-[22px]">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-[13px] text-white ${TILE_BG[type]}`}
        >
          <TypeIcon type={type} size={22} />
        </span>
        <CardHeader className="relative min-w-0 flex-1 gap-0 p-0">
          <h1 className="text-xl font-bold tracking-[-0.4px]">{t('market', meta.title)}</h1>
          <span className="text-[11px] font-semibold tracking-[1px] text-muted-foreground uppercase">
            {TYPE_EYEBROW[type]}
          </span>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('market', meta.desc)}</p>
        </CardHeader>
        {/* 页头搜索框**已移除**（用户 2026-09-18：「title 上的搜索就重复设计了，需要去掉」）
            —— 唯一搜索入口 = 工具条右侧折叠面板（T11-e）；`meta.ph` 三键改由面板消费。
            计数块随 `CardHeader` 的 `flex-1` 自动贴右，页头形态不变。 */}
        <div className="shrink-0 rounded-xl border border-border bg-secondary px-5 py-2.5 text-center">
          <b className="block text-[22px] leading-tight font-bold text-primary tabular-nums">
            {count === undefined ? '—' : count.toLocaleString()}
          </b>
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            {t('market', meta.badge)}
          </span>
        </div>
      </Card>

      <FilterStrip selected={labels} onToggle={toggleLabel} onClearAll={clearLabels} />

      <Collapsible open={searchOpen} onOpenChange={setSearchOpen} className="mb-3">
        <div className="flex items-center gap-3 px-0.5">
          <span className="text-[13px] text-muted-foreground">
            {filtersActive
              ? t('market', 'filteredCount', { n: list?.total ?? 0 })
              : t('market', meta.total, { n: list?.total ?? 0 })}
          </span>
          {/* 右侧控件群（`j6`）：`ml-auto` 由**本容器**承担 ⇒ 组内控件随视图条件增删时整组不横跳 */}
          <div className="ml-auto flex items-center gap-3">
            {/* 列显示入口（`j6` · 方向 1「纯图标」）：**仅列表视图渲染** —— 网格/卡片形态没有列的概念 */}
            {view === 'list' && (
              <ColumnVisibilityMenu
                items={PORTAL_COLUMNS}
                value={columnVisibility}
                onChange={setColumnVisibility}
                label={t('market', 'colShow')}
              />
            )}
            {/* 排序（`j6` · 2026-09-21 用户拍板「方向 1 纯图标」）：图标钮 + 官方 `DropdownMenu` 三档 radio
              —— 取代 T11-f 的官方 `Select`（160px ⇒ 32px；代价「当前档不可见」已登记，靠 tooltip 补足） */}
            <SortMenu value={sort} onChange={(next) => query.setSort?.(next)} />
            {/* 折叠搜索触发钮（T11-e）：官方 `Button`（ghost · icon-sm）—— 位置在视图切换钮**左侧**，
              与 ClawHub 同位；`aria-expanded` 由官方 `CollapsibleTrigger` 自动给出 */}
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('market', 'searchBtn')}
                title={t('market', 'searchBtn')}
              >
                <Search />
              </Button>
            </CollapsibleTrigger>
            {/* 视图切换（T11-e）：官方 ToggleGroup —— 形态/色值走官方 variant，**不覆盖 className**。
            `type="single"` 下再点当前项会回调空串 ⇒ 以 `if (next)` 守住「两态必居其一」。 */}
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={view}
              onValueChange={(next) => {
                if (next) setView(next as ViewMode);
              }}
            >
              <ToggleGroupItem
                value="grid"
                aria-label={t('market', 'viewGrid')}
                title={t('market', 'viewGrid')}
              >
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                aria-label={t('market', 'viewList')}
                title={t('market', 'viewList')}
              >
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {/* 折叠搜索面板（T11-e）：工具条**下方** · 宽度撑满 —— 官方 `InputGroup`
            （放大镜 addon + 无边框输入 + 尾部关闭钮），对应 ClawHub 的 `.browse-search-control` */}
        <CollapsibleContent>
          <InputGroup className="mt-2">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t('market', meta.ph)}
              aria-label={t('market', meta.ph)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={t('market', 'searchClose')}
                title={t('market', 'searchClose')}
                onClick={() => {
                  setQ('');
                  setSearchOpen(false);
                }}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </CollapsibleContent>
      </Collapsible>

      {loading &&
        // 载态骨架（本批 §3.10：官方 `Skeleton` 替手搓居中占位；T11-e：随视图形态分派）
        (view === 'grid' ? (
          <AssetGrid>
            {LOADING_SLOTS.map((slot) => (
              <Skeleton key={slot} className="h-[166px] rounded-xl" />
            ))}
          </AssetGrid>
        ) : (
          <AssetList
            items={NO_ITEMS}
            loading
            sorting={{ key: sort, dir, onChange: handleHeaderSort }}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        ))}
      {error && <ErrorState error={error} onRetry={() => setRetryTick((tick) => tick + 1)} />}
      {!loading && !error && list && list.items.length === 0 && (
        <EmptyState message={t('market', 'noResult')} />
      )}
      {!loading && !error && list && list.items.length > 0 && (
        <>
          {view === 'grid' ? (
            <AssetGrid>
              {list.items.map((item) => (
                <AssetCard key={item.id} item={item} />
              ))}
            </AssetGrid>
          ) : (
            <AssetList
              items={list.items}
              sorting={{ key: sort, dir, onChange: handleHeaderSort }}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
            />
          )}
          {/* 分页：**仅多页时渲染**（`total > PAGE_SIZE`）—— 单页显示「1 / 1 · 每页 20」是噪音。
              ⚠️ 2026-09-16（M4b-3 T6 自检发现）：本件此前**无条件**渲染分页（`Pagination` 只在 `total <= 0`
              时自隐）⇒ 3 个资产也出「1 / 1」，与门户 dogfood 断言「资产数 < limit ⇒ 无分页控件（正当缺席）」
              的**声明意图相反**（该断言当时因选择器写错而**假 PASS**，见 `docs/smoke/scripts/m4a-dogfood.ts:328`）。
              现补该条件，与 M4b-3 批 design §4.4.1「`Pagination` 仅 `total > limit` 时渲染」同口径。 */}
          {list.total > PAGE_SIZE ? (
            <Pagination
              total={list.total}
              limit={PAGE_SIZE}
              offset={(page - 1) * PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
