/**
 * 管理看板 `/admin`（M4b-6 T6 · 看板重做 T6⁺）。
 *
 * 结构（批 design §4.1 · 段落顺序 = 逐条拍板结果）：
 * ① KPI ×4（已发布资产〔可点 → `/admin/assets`〕/ 累计下载 / 待审〔可点 → `/admin/reviews`〕/ 有效用户）
 * ② 趋势卡（**两张小图并排** —— 累计资产数 / 累计下载数，各自纵轴；官方 `Area Chart - Axes` 配方 +
 *    `linearGradient` 渐变填充（拍板 8.1a）· 纵轴自 0 起（拍板 8.2a，**取代 D37**）·
 *    四档时间 = 官方 `Combobox`（**右上角**）· 默认近 30 天（拍板 9a/9.1a））
 * ③ 标签资产数量（**一级标签**同心环 · 官方 `Radial Chart - Grid` 配方 · 取色 = **13 色池按行序**）
 * ④ 标签下载热度（**一级标签**雷达 · 官方 `Radar Chart - Grid Circle` 配方 · 主圈色 `--chart-1`、
 *    **点**按 13 色池行序 · 拍板 22a 保留雷达形制）
 * ⑤ 排行榜（官方 `Bar Chart - Interactive` 外壳：三口径按钮 + Top N `Combobox`；
 *    **竖柱** + 类目名 -45° 斜排（截断 14 字符）；右上按钮数字 = 当前 Top N 榜内合计；
 *    卡级 `isolate` —— 官方按钮类名自带 `relative z-30`，需与 sticky TopBar(`z-20`) 隔离）
 * ⑥ 英雄榜（外壳卡 + 两张内层 muted 分区块：**左员工榜 · 右资产榜**；官方 `Bar Chart - Label` 配方：
 *    竖柱 + 柱顶数值；类目名**水平多行**（`HeroTick`/`wrapLabel`））
 *
 * 本轮删项：创意四项（含 `overview.creative` 出参）· 类型维度（含 `overview.types`）·
 * 自写虚线空态框（下载无历史时保留一处说明文案，不再自造边框）。
 *
 * 数据：`/api/admin/{overview,rankings,trends}`（**仅进页拉一次**，D51 —— 不做轮询、不加刷新按钮）。
 * 标签两图的数据源 = `overview.labels[]`（服务端一级+上卷+仅 ACTIVE+去重）；排行榜与英雄榜共用
 * `rankings` 同一响应（英雄榜取前 3 —— 零额外请求）。
 */
import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type AdminOverviewLabel,
  type AdminRankItem,
  fetchAdminOverview,
  fetchAdminRankings,
  fetchAdminTrends,
  type TrendPoint,
} from '@/api/admin';
import { PageHeader } from '@/components/console/PageHeader';
import { Button } from '@/components/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/shadcn/chart';
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/shadcn/combobox';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/i18n/I18nProvider';

/** 趋势窗口四档（D5；与 `board.trend.range.*` 键一一对应） */
const RANGES = [7, 30, 180, 365] as const;
/** 窗口 → 键名（字面量映射，避开模板键 —— `Translate` 的键为字面量联合类型） */
const RANGE_KEY: Record<
  (typeof RANGES)[number],
  'trend.range.7' | 'trend.range.30' | 'trend.range.180' | 'trend.range.365'
> = {
  7: 'trend.range.7',
  30: 'trend.range.30',
  180: 'trend.range.180',
  365: 'trend.range.365',
};

/** Top N 值域（**拍板 10/20/30/50** —— 覆盖原 D7 的 10/20/50/100；服务端值域 1–100 不变） */
const TOP_OPTS = [10, 20, 30, 50] as const;

/** 排行榜类目名显示上限（字符）—— 斜排 -45° 下超过此长度会越出卡片；完整名仍在 tooltip 里 */
const RANK_LABEL_MAX = 14;

type Caliber = 'people' | 'labels' | 'assets';
/** 口径顺序（按钮从左到右；默认口径 = 人 —— 拍板 13a） */
const CALIBERS: Caliber[] = ['people', 'assets', 'labels'];

/**
 * 口径取色（拍板 14a / 11b —— 全页一套语义色，排行榜按钮与英雄榜同源）：
 * 人 = `--type-skill` 蓝 · 资产 = `--type-mcp` 青 · 标签 = `--type-agent` 紫。
 */
const CALIBER_COLOR: Record<Caliber, string> = {
  people: 'var(--type-skill)',
  assets: 'var(--type-mcp)',
  labels: 'var(--type-agent)',
};
/** 口径 → i18n 键（字面量映射，避开模板键） */
const CALIBER_KEY: Record<Caliber, 'rank.byPeople' | 'rank.byAsset' | 'rank.byLabel'> = {
  people: 'rank.byPeople',
  assets: 'rank.byAsset',
  labels: 'rank.byLabel',
};

/**
 * 标签两图**取色池（13 色 · 本轮拍板）** = 对标 5 色 `--chart-1…5` + 资产卡片 8 色 `--ava-1…8`。
 * 按**行序**取（`index % 13`，>13 循环）—— 序：index 0–4 → chart-1…5；index 5–12 → ava-1…8。
 * 三处一致：同心环扇区 / 雷达点 / 图下行色点（同一 index 恒同色，换档位/换数据不跳色）。
 * 全部取自仓内既有 token，**零硬编码新色**。
 */
const LABEL_COLOR_TOKENS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--ava-1',
  '--ava-2',
  '--ava-3',
  '--ava-4',
  '--ava-5',
  '--ava-6',
  '--ava-7',
  '--ava-8',
] as const;

function labelColor(index: number): string {
  return `var(${LABEL_COLOR_TOKENS[index % LABEL_COLOR_TOKENS.length]})`;
}

/**
 * 字形宽度估量（单位 = 1 个全角字宽）：CJK/全角 1、拉丁数字标点 0.58。
 * 只用于「一行放不下就换行」的排版判定，不参与渲染。
 */
function glyphUnits(text: string): number {
  let u = 0;
  for (const ch of text) u += (ch.codePointAt(0) ?? 0) > 0x2e80 ? 1 : 0.58;
  return u;
}

/** 英雄榜类目名排版预算：每行 14 全角单位、最多 3 行（末行放不下加省略号） */
const HERO_LABEL_UNITS = 14;
const HERO_LABEL_MAX_LINES = 3;

/**
 * 把类目名切成若干行（水平显示，放不下就换行）。
 * 规则：**优先按空格断词**（保住「工号 姓名」两段完整）；单个词元自身超预算时再按字硬切；
 * 最多 `maxLines` 行，只有**真的没放完**才在末行加省略号。
 * 返回每行的 `{ start, text }`：`start` = 该行首字符在全名里的位置，用作 React key
 * （不用数组下标 —— 满足 `lint/suspicious/noArrayIndexKey`）。
 */
function wrapLabel(
  text: string,
  maxUnits = HERO_LABEL_UNITS,
  maxLines = HERO_LABEL_MAX_LINES,
): Array<{ start: number; text: string }> {
  /** 词元：空白串或非空白词（空白跟随其后，断行时丢弃行尾空格） */
  const tokens = text.match(/\s+|[^\s]+/g) ?? [text];
  const lines: string[] = [];
  let cur = '';
  let truncated = false;
  const flush = () => {
    const trimmed = cur.replace(/\s+$/, '');
    if (trimmed !== '') lines.push(trimmed);
    cur = '';
  };
  for (const token of tokens) {
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }
    if (glyphUnits(cur + token) <= maxUnits) {
      cur += token;
      continue;
    }
    if (!/^\s+$/.test(token) && cur !== '') flush();
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }
    // 单个词元自身超预算 ⇒ 按字硬切
    for (const ch of token) {
      if (glyphUnits(cur + ch) > maxUnits && cur !== '') {
        flush();
        if (lines.length >= maxLines) {
          truncated = true;
          break;
        }
      }
      cur += ch;
    }
  }
  if (lines.length < maxLines) flush();

  let start = 0;
  const out = lines.map((line) => {
    const seg = { start, text: line };
    start += line.length;
    return seg;
  });
  const last = out[out.length - 1];
  if (last && truncated) out[out.length - 1] = { start: last.start, text: `${last.text}…` };
  return out;
}

/**
 * 英雄榜 X 轴类目名：**水平多行**（官方 `XAxis` 默认 tick 形态 + 换行）。
 * 不用 -45° 斜排 —— 拍板改为「都水平显示，放不下就换行」。
 */
function HeroTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const lines = wrapLabel(String(payload?.value ?? ''));
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
      {lines.map((seg, i) => (
        <tspan key={seg.start} x={x} dy={i === 0 ? 14 : 13}>
          {seg.text}
        </tspan>
      ))}
    </text>
  );
}

function dayLabel(day: string, long: boolean): string {
  // 短窗口 `MM-DD` · 长窗口 `YY-MM`
  const [y, m, d] = day.split('-');
  return long ? `${(y ?? '').slice(2)}-${m}` : `${m}-${d}`;
}

/**
 * 英雄榜条目名：工号 + 姓名两段（拍板 21b —— D9 的「人 = 工号 + 姓名」拼接、工号区分同名）。
 * 资产的 `id` 是 slug、标签是 slug ⇒ 只有人口径需要拼接；调用方按口径决定是否传入 `id`。
 */
function rowLabelOf(row: AdminRankItem, withId: boolean): string {
  return withId ? `${row.id} ${row.name}` : row.name;
}

/**
 * 图下行色点（自绘）：官方 `ChartLegend` 在 `RadialBarChart` 上取不到 payload（实测渲染为空图例），
 * 故按「扇区 / 雷达点 / 图下行色点三处一致」自绘一行 —— 色点取色与扇区、雷达点同源（`labelColor(i)`）。
 */
function LabelLegend({ items }: { items: Array<{ key: number; color: string; text: string }> }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: item.color }}
          />
          {item.text}
        </span>
      ))}
    </div>
  );
}

/**
 * 英雄榜首榜面板 —— 官方 `Bar Chart - Label` 配方（竖柱 + 柱顶数值标签）：
 * `margin={{top:20}}` · `CartesianGrid vertical={false}` · `XAxis tickLine/axisLine=false` ·
 * `ChartTooltip cursor={false} hideLabel` · `Bar radius={8}` + `LabelList position="top" offset={12}`。
 * 两处本地化：① 类目名**水平显示、超长自动换行**（`HeroTick` + `wrapLabel`，3 行封顶；tooltip 仍给全名）
 * ② 取色走 `--color-value`（= 口径色，人 = type-skill 蓝 / 资产 = type-mcp 青）。
 * `memo`：两榜数据已在父级 `useMemo` 稳定 ⇒ 父级其它状态变化时不重渲染图表。
 */
const HeroPanel = memo(function HeroPanel({
  title,
  rows,
  color,
  loading,
  emptyText,
}: {
  title: string;
  rows: AdminRankItem[];
  color: string;
  loading: boolean;
  emptyText: string;
}) {
  // 官方配方吃 `label` 键；排行榜条目原本叫 `name` ⇒ 此处归一（人口径的 name 已在父级拼成「工号 姓名」）
  const data = useMemo(() => rows.map((row) => ({ label: row.name, value: row.value })), [rows]);
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <div className="mb-3 text-[13px] font-semibold">{title}</div>
      {loading ? (
        <Skeleton className="h-[212px] w-full" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ChartContainer
          config={{ value: { label: title, color } }}
          className="aspect-auto h-[212px] w-full"
        >
          <BarChart accessibilityLayer data={data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            {/* 类目名水平显示、超长换行（3 行封顶）—— 见 HeroTick / wrapLabel */}
            <XAxis
              dataKey="label"
              interval={0}
              height={68}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={<HeroTick />}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={8}>
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
});

function Kpi({
  title,
  value,
  hint,
  onClick,
}: {
  title: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  const body = (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardDescription className="text-xs">{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="px-4 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
  if (!onClick) return body;
  return (
    <button type="button" className="text-left" onClick={onClick}>
      {body}
    </button>
  );
}

/**
 * 单选项下拉（官方 `Combobox` —— 本仓首次使用该件）：**排行榜 Top N** 与 **趋势时间档位**共用一个薄封装。
 * `items` 是数值档位；显示文案由调用方给（`labelOf`），`aria-label` 与输入框一致。
 */
function OptionCombobox({
  items,
  value,
  onChange,
  labelOf,
}: {
  items: readonly number[];
  value: number;
  onChange: (n: number) => void;
  labelOf: (n: number) => string;
}) {
  return (
    <Combobox
      items={items as number[]}
      value={value}
      onValueChange={(v) => {
        if (typeof v === 'number') onChange(v);
      }}
      itemToStringLabel={labelOf}
    >
      <ComboboxInput
        className="w-[118px]"
        aria-label={labelOf(value)}
        placeholder={labelOf(value)}
      />
      <ComboboxContent>
        <ComboboxList>
          {(item: number) => (
            <ComboboxItem key={item} value={item}>
              {labelOf(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export default function AdminBoard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);
  const [topN, setTopN] = useState<number>(10);
  const [caliber, setCaliber] = useState<Caliber>('people');
  const [tick, setTick] = useState(0);

  const overview = useApi((signal) => fetchAdminOverview({ signal }), [tick]);
  const trends = useApi((signal) => fetchAdminTrends(days, { signal }), [days, tick]);
  const rankings = useApi((signal) => fetchAdminRankings(topN, { signal }), [topN, tick]);

  // 首屏骨架（D51：仅进页拉一次）
  const loading = overview.loading || trends.loading || rankings.loading;
  const failed = overview.error ?? trends.error ?? rankings.error;

  const kpi = overview.data?.kpi;
  const labels: AdminOverviewLabel[] = overview.data?.labels ?? [];
  const points: TrendPoint[] = trends.data?.points ?? [];

  /** 排行榜三口径行（人条目按拍板 21b 拼「工号 姓名」） */
  const rankRows: Array<{ label: string; value: number }> = useMemo(() => {
    const data = rankings.data;
    if (!data) return [];
    return data[caliber].map((row) => ({
      label: rowLabelOf(row, caliber === 'people'),
      value: row.value,
    }));
  }, [rankings.data, caliber]);

  /** 按钮大数字 = **当前 Top N 的榜内合计**（拍板 Aa —— 三名口径各自求和，随档位变） */
  const caliberTotals = useMemo(() => {
    const sum = (rows: AdminRankItem[] | undefined) =>
      (rows ?? []).reduce((acc, r) => acc + r.value, 0);
    return {
      people: sum(rankings.data?.people),
      assets: sum(rankings.data?.assets),
      labels: sum(rankings.data?.labels),
    } satisfies Record<Caliber, number>;
  }, [rankings.data]);

  /** 环图 config（官方 `Radial Chart - Grid` 的取色机制：`nameKey` 的**值**必须是 config 的键 ⇒ 键 = slug；
   *  颜色 = 13 色池按行序 —— 与雷达点、图下行色点同一 index 同色）。
   *  `useMemo`：config 引用稳定 ⇒ 每次父级渲染不重建图表（recharts 按引用判重渲染）。 */
  const ringConfig: ChartConfig = useMemo(
    () => ({
      count: { label: t('board', 'label.countTitle') },
      ...Object.fromEntries(
        labels.map((row, i) => [row.slug, { label: row.name, color: labelColor(i) }]),
      ),
    }),
    [labels, t],
  );

  /** 英雄榜两榜数据（切片 + 人口径拼「工号 姓名」）—— memo 后引用稳定，配合 `HeroPanel` 的 `memo` 免重渲染 */
  const heroPeople = useMemo(
    () =>
      (rankings.data?.people ?? [])
        .slice(0, 3)
        .map((row) => ({ ...row, name: rowLabelOf(row, true) })),
    [rankings.data],
  );
  const heroAssets = useMemo(() => (rankings.data?.assets ?? []).slice(0, 3), [rankings.data]);

  const longWindow = days >= 180;
  const hasDownloadHistory = points.some((p) => p.downloads !== null);
  const lastPoint = points.at(-1);

  /**
   * 英雄榜首榜面板 —— 官方 `Bar Chart - Label` 配方（竖柱 + 柱顶数值标签）：
   * `margin={{top:20}}` · `CartesianGrid vertical={false}` · `XAxis tickLine/axisLine=false` ·
   * `ChartTooltip cursor={false} hideLabel` · `Bar radius={8}` + `LabelList position="top" offset={12}`。
   * 两处本地化：① 类目名**水平显示、超长自动换行**（`HeroTick` + `wrapLabel`，3 行封顶；chart tooltip 仍给全名）
   * ② 取色走 `--color-value`（= 口径色，人=type-skill / 资产=type-mcp）。
   */
  const heroPanels = (
    <>
      <HeroPanel
        title={t('board', 'hero.people')}
        rows={heroPeople}
        color={CALIBER_COLOR.people}
        loading={loading}
        emptyText={t('admin', 'empty')}
      />
      <HeroPanel
        title={t('board', 'hero.assets')}
        rows={heroAssets}
        color={CALIBER_COLOR.assets}
        loading={loading}
        emptyText={t('admin', 'empty')}
      />
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t('board', 'title')} />

      {failed ? (
        <Card>
          <CardContent className="flex items-center justify-between py-6 text-sm">
            <span className="text-muted-foreground">{failed.code}</span>
            <Button size="sm" variant="outline" onClick={() => setTick((v) => v + 1)}>
              {t('common', 'retry')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ① KPI ×4 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title={t('board', 'kpi.assets')}
          value={loading || !kpi ? '—' : String(kpi.activeAssets)}
          hint={kpi ? t('board', 'kpi.assetsHint', { n: kpi.allAssets }) : undefined}
          onClick={() => navigate('/admin/assets')}
        />
        <Kpi
          title={t('board', 'kpi.downloads')}
          value={loading || !kpi ? '—' : String(kpi.downloads)}
          // F208 修：副行取**服务端固定窗口**字段（`kpi.downloads7d` = 近 7 个自然日事件数），
          // 不再按趋势窗口切片（旧写法在「近 7 天」档位会退化成累计总量）
          hint={
            kpi
              ? kpi.downloads7d === null
                ? t('board', 'kpi.noDownloadHistory')
                : t('board', 'kpi.downloads7dHint', { n: kpi.downloads7d })
              : undefined
          }
        />
        <Kpi
          title={t('board', 'kpi.pending')}
          value={loading || !kpi ? '—' : String(kpi.pending)}
          hint={kpi ? t('board', 'kpi.pendingHint', { n: kpi.reviewsTotal }) : undefined}
          onClick={() => navigate('/admin/reviews')}
        />
        <Kpi
          title={t('board', 'kpi.users')}
          value={loading || !kpi ? '—' : String(kpi.activeUsers)}
          hint={kpi ? t('board', 'kpi.usersHint', { n: kpi.allUsers }) : undefined}
        />
      </div>

      {/* ② 趋势卡：两张小图并排（各自纵轴 · 共享四档选择器） */}
      <Card>
        {/* 时间档位 = 官方 Combobox（右上）；本轮按拍板去掉副标题（CardDescription）。
            ⚠️ 这里用裸 div 而非 CardHeader：官方 CardHeader 自带 `grid`，再加 flex 工具类改不了
               display（实测 Combobox 会被挤到标题下一行、左对齐）—— 与排行榜卡头同做法。 */}
        <div className="flex items-center justify-between gap-3 px-6 pt-6">
          <CardTitle>{t('board', 'trend.title')}</CardTitle>
          <OptionCombobox
            items={RANGES}
            value={days}
            onChange={setDays}
            labelOf={(r) => t('board', RANGE_KEY[r as (typeof RANGES)[number]])}
          />
        </div>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          {(
            [
              ['assets', t('board', 'trend.assets'), '--chart-1', 'fill-assets'],
              ['downloads', t('board', 'trend.downloads'), '--chart-2', 'fill-downloads'],
            ] as const
          ).map(([key, title, chartToken, gradientId]) => (
            <figure key={key} className="space-y-2">
              <figcaption className="flex items-baseline justify-between">
                <span className="text-xs font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">
                  {points.length > 0 && (key === 'assets' || hasDownloadHistory)
                    ? t('board', 'trend.asOf', {
                        day: lastPoint?.day ?? '',
                        value: (key === 'assets' ? lastPoint?.assets : lastPoint?.downloads) ?? 0,
                      })
                    : t('board', 'trend.empty.downloads')}
                </span>
              </figcaption>
              {loading || points.length === 0 ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ChartContainer
                  config={{ [key]: { label: title, color: `var(${chartToken})` } }}
                  className="aspect-auto h-[220px] w-full"
                >
                  <AreaChart accessibilityLayer data={points} margin={{ left: 0, right: 12 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(v: string) => dayLabel(v, longWindow)}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickCount={3} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Area
                      dataKey={key}
                      name={title}
                      type="natural"
                      fill={`url(#${gradientId})`}
                      stroke={`var(--color-${key})`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </figure>
          ))}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          {t('board', 'trend.downloadsNote')}
        </CardFooter>
      </Card>

      {/* ③④ 标签维度两图（一级标签 · 子标签上卷 · 仅已发布资产） */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          {/* 本轮按拍板去掉副标题（口径详见 design + 服务端实现注释） */}
          <CardHeader>
            <CardTitle>{t('board', 'label.countTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : labels.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t('admin', 'empty')}
              </p>
            ) : (
              <ChartContainer config={ringConfig} className="mx-auto aspect-square max-h-[250px]">
                {/* 官方 `Radial Chart - Grid` 配方：`PolarGrid gridType="circle"` + `RadialBar`（无 background/圆角）
                    + tooltip `cursor={false}` / `hideLabel` / `nameKey="slug"`；取色走 config 生成的
                    `--color-<slug>`（值 = `labelColor(i)`，与雷达点、图下行色点三处一致）。 */}
                <RadialBarChart
                  data={labels.map((row) => ({
                    slug: row.slug,
                    label: row.name,
                    count: row.count,
                    fill: `var(--color-${row.slug})`,
                  }))}
                  innerRadius={30}
                  outerRadius={100}
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="slug" />}
                  />
                  <PolarGrid gridType="circle" />
                  <RadialBar dataKey="count" />
                </RadialBarChart>
              </ChartContainer>
            )}
            <LabelLegend
              items={labels.map((row, i) => ({
                key: row.id,
                color: labelColor(i),
                text: `${row.name} · ${row.count}`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('board', 'label.heatTitle')}</CardTitle>
          </CardHeader>
          {/* 图表盒子与环图卡一致（`aspect-square max-h-[250px]`）—— 两卡「图表对图表、文字对文字」对齐 */}
          {/* 官方 `Radar Chart - Grid Circle` 配方（逐条照抄）：`ChartTooltip cursor={false} hideLabel` ·
              `PolarGrid gridType="circle"` · `PolarAngleAxis dataKey="name"` · `Radar fillOpacity={0.6}`。
              唯一保留的本地差异：`dot` 仍走**按行序的 13 色池**（`renderLabelDot`，与环图扇区/图下行色点同色）；
              官方那行是单色对象 `{r:4, fillOpacity:1}` —— 要纯官方单色说一声，一行就换。 */}
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : labels.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t('admin', 'empty')}
              </p>
            ) : (
              <ChartContainer
                config={{
                  downloads: { label: t('board', 'label.heatTitle'), color: 'var(--chart-1)' },
                }}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <RadarChart data={labels.map((row) => ({ ...row }))}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <PolarGrid gridType="circle" />
                  <PolarAngleAxis dataKey="name" />
                  <Radar
                    dataKey="downloads"
                    fill="var(--color-downloads)"
                    fillOpacity={0.6}
                    dot={renderLabelDot}
                  />
                </RadarChart>
              </ChartContainer>
            )}
            <LabelLegend
              items={labels.map((row, i) => ({
                key: row.id,
                color: labelColor(i),
                text: `${row.name} · ${row.downloads}`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* ⑤ 排行榜（官方 Interactive 外壳：标题 + Top N 控件 + 三口径按钮）
          ⚠️ `isolate` = 修复「三口径按钮盖住 TopBar」：官方按钮类名自带 `relative z-30`，而本仓 TopBar 是
             `sticky top-0 z-20`（F207 定稿形态）⇒ 30 > 20 时按钮会压住顶栏。`isolation:isolate` 在卡内建立
             层叠上下文，把 z-30 关进卡片（官方按钮写法一个字符不改，卡内「按钮压图表」的关系保持）。 */}
      <Card className="isolate py-0">
        <div className="flex flex-col items-stretch border-b sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-6">
            <div className="flex items-center gap-3">
              <CardTitle>{t('board', 'rank.title')}</CardTitle>
              <OptionCombobox
                items={TOP_OPTS}
                value={topN}
                onChange={setTopN}
                labelOf={(n) => t('board', 'rank.topN', { n })}
              />
            </div>
          </div>
          <div className="flex">
            {CALIBERS.map((key) => (
              <button
                key={key}
                type="button"
                data-active={caliber === key}
                onClick={() => setCaliber(key)}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              >
                <span className="text-xs text-muted-foreground">
                  {t('board', CALIBER_KEY[key])}
                </span>
                <span className="text-lg leading-none font-bold tabular-nums sm:text-2xl">
                  {loading ? '—' : caliberTotals[key]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <CardContent className="px-2 sm:px-6">
          {loading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : rankRows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t('admin', 'empty')}</p>
          ) : (
            <ChartContainer
              config={{
                value: { label: t('board', CALIBER_KEY[caliber]), color: CALIBER_COLOR[caliber] },
              }}
              className="aspect-auto h-[340px] w-full"
            >
              <BarChart accessibilityLayer data={rankRows} margin={{ left: 8, right: 16 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={112}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  // 斜排类目名截断到 14 字符（超出加省略号）：长名斜排会越出卡片
                  // （真库实测：45 字符的本地账号 id 会左溢 88px、下溢 186px）；tooltip 仍给全名
                  tickFormatter={(v: string) =>
                    v.length > RANK_LABEL_MAX ? `${v.slice(0, RANK_LABEL_MAX)}…` : v
                  }
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickCount={3} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent className="w-[200px]" />}
                />
                <Bar
                  dataKey="value"
                  name={t('board', CALIBER_KEY[caliber])}
                  fill={CALIBER_COLOR[caliber]}
                  radius={4}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ⑥ 英雄榜（外壳卡 + 两张内层 muted 分区块：左员工榜 · 右资产榜） */}
      <Card>
        <CardHeader>
          <CardTitle>{t('board', 'hero.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">{heroPanels}</CardContent>
      </Card>
    </div>
  );
}

/** 雷达点：按**行序**取 13 色池（与同心环扇区、图下行色点同色） */
function renderLabelDot(props: { cx?: number; cy?: number; index?: number }) {
  const { cx = 0, cy = 0, index = 0 } = props;
  return (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={4}
      fill={labelColor(index)}
      stroke="#ffffff"
      strokeWidth={1.5}
    />
  );
}
