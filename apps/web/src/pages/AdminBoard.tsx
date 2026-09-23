/**
 * 管理看板 `/admin`（M4b-6 T6 · 由 prototype `pages/__proto/DashboardProto.tsx` 定案稿转正）。
 *
 * 结构（批 design §4.1）：
 * ① KPI ×4（活跃资产〔可点 → `/admin/assets`〕/ 累计下载 / 待审〔可点 → `/admin/reviews`〕/ 有效用户，各带副行 hint）
 * ② 趋势卡（**两张小图** —— 累计资产数 / 累计下载数，各自纵轴 · 共享时间范围选择器 · 默认近 30 天）
 * ③ 类型两图（(e) 类型数量同心环 D13 · (f) 类型下载热度雷达 D14）
 * ④ 排行榜单卡（三口径按钮 人/标签/资产 + Top N Combobox）
 * ⑤ 创意四项（平均审核时长 / 下载集中度 / 标签覆盖度 / 沉睡资产；空集显「—」）
 * ⑥ 英雄榜 ×2（资产榜 / 员工榜 —— 官方 `Bar Chart - Custom Label` 配方，取排行榜响应的前 3）
 *
 * 数据：`/api/admin/{overview,rankings,trends}`（**仅进页拉一次**，D51 —— 不做轮询、不加刷新按钮）。
 * 空态：`downloads === null`（下载事件表未落）⇒ 下载小图改虚线占位 + 右上说明（design §4.1(b)）。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
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
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/shadcn/chart';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { useApi } from '@/hooks/useApi';
import { type Translate, useI18n } from '@/i18n/I18nProvider';

/** 类型色（design §4.1 定值：skill / mcp / agent） */
const TYPE_COLOR: Record<string, string> = {
  skill: '#2563eb',
  mcp: '#0e7490',
  agent: '#6d28d9',
};
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
/** Top N 值域（D7） */
const TOP_OPTS = [10, 20, 50, 100] as const;
type Caliber = 'people' | 'labels' | 'assets';

/** 4 档等距整档刻度（design §4.1(b)：步长按档向上试，直到 4 档覆盖数据 + 10% 余量） */
function axisTicks(max: number): number[] {
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
  const target = Math.max(max, 1) * 1.1;
  let step = steps[0] ?? 1;
  for (let e = 0; e < 9; e += 1) {
    for (const s of steps) {
      const candidate = s * 10 ** e;
      if (candidate * 3 >= target) {
        step = candidate;
        break;
      }
    }
    const top = step * 3;
    if (top >= target) break;
  }
  return [0, step, step * 2, step * 3];
}

function dayLabel(day: string, long: boolean): string {
  // 短窗口 `MM-DD` · 长窗口 `YY-MM`
  const [y, m, d] = day.split('-');
  return long ? `${(y ?? '').slice(2)}-${m}` : `${m}-${d}`;
}

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
  const creative = overview.data?.creative;
  const types = overview.data?.types ?? [];
  const points: TrendPoint[] = trends.data?.points ?? [];

  const rankRows: AdminRankItem[] = useMemo(() => {
    const data = rankings.data;
    if (!data) return [];
    return data[caliber];
  }, [rankings.data, caliber]);

  const heroAssets = rankings.data?.assets.slice(0, 3) ?? [];
  const heroPeople = rankings.data?.people.slice(0, 3) ?? [];

  const longWindow = days >= 180;
  const maxAssets = Math.max(...points.map((p) => p.assets), 0);
  const maxDownloads = Math.max(...points.map((p) => p.downloads ?? 0), 0);
  const hasDownloadHistory = points.some((p) => p.downloads !== null);

  const creativeValue = (kind: 'reviewSpeed' | 'concentration' | 'labelCoverage' | 'sleeping') => {
    if (!creative) return '—';
    if (kind === 'reviewSpeed') {
      if (creative.reviewSpeed === null) return t('board', 'creative.none');
      const hours = creative.reviewSpeed;
      return hours >= 24
        ? t('board', 'creative.dayUnit', { n: (hours / 24).toFixed(1) })
        : t('board', 'creative.hourUnit', { n: hours.toFixed(1) });
    }
    if (kind === 'concentration') {
      if (creative.concentration === null) return t('board', 'creative.none');
      return t('board', 'creative.percent', { n: (creative.concentration * 100).toFixed(1) });
    }
    if (kind === 'labelCoverage') {
      if (creative.labelCoverage === null) return t('board', 'creative.none');
      return t('board', 'creative.percent', { n: (creative.labelCoverage * 100).toFixed(1) });
    }
    return t('board', 'creative.countUnit', { n: creative.sleeping });
  };

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
          hint={
            kpi
              ? hasDownloadHistory
                ? t('board', 'kpi.downloads7dHint', { n: lastWeekDelta(points) })
                : t('board', 'kpi.noDownloadHistory')
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

      {/* ② 趋势卡：两张小图（各自纵轴 · 共享选择器） */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t('board', 'trend.title')}</CardTitle>
            <CardDescription>{t('board', 'trend.desc')}</CardDescription>
          </div>
          <Select
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            options={RANGES.map((r) => ({
              value: String(r),
              label: t('board', RANGE_KEY[r]),
            }))}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 上：累计资产数 */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium">{t('board', 'trend.assets')}</span>
              <span className="text-xs text-muted-foreground">
                {points.length > 0
                  ? t('board', 'trend.asOf', {
                      day: points.at(-1)?.day ?? '',
                      value: points.at(-1)?.assets ?? 0,
                    })
                  : '—'}
              </span>
            </div>
            {loading || points.length === 0 ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ChartContainer config={{}} className="aspect-auto h-[180px] w-full">
                <AreaChart data={points} margin={{ top: 8, left: 4, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v: string) => dayLabel(v, longWindow)}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    ticks={axisTicks(maxAssets)}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    domain={[0, 'dataMax']}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    dataKey="assets"
                    type="natural"
                    fill="var(--color-assets)"
                    fillOpacity={0.9}
                    stroke="var(--color-assets)"
                    stackId="a"
                    name={t('board', 'trend.assets')}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>

          {/* 下：累计下载数（事件表未落 ⇒ 虚线占位） */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium">{t('board', 'trend.downloads')}</span>
              <span className="text-xs text-muted-foreground">
                {hasDownloadHistory && points.length > 0
                  ? t('board', 'trend.asOf', {
                      day: points.at(-1)?.day ?? '',
                      value: points.at(-1)?.downloads ?? 0,
                    })
                  : t('board', 'trend.empty.downloads')}
              </span>
            </div>
            {loading || points.length === 0 ? (
              <Skeleton className="h-[180px] w-full" />
            ) : hasDownloadHistory ? (
              <ChartContainer config={{}} className="aspect-auto h-[180px] w-full">
                <AreaChart data={points} margin={{ top: 8, left: 4, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v: string) => dayLabel(v, longWindow)}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    ticks={axisTicks(maxDownloads)}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    domain={[0, 'dataMax']}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    dataKey="downloads"
                    type="natural"
                    fill="var(--color-downloads)"
                    fillOpacity={0.9}
                    stroke="var(--color-downloads)"
                    stackId="a"
                    name={t('board', 'trend.downloads')}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[180px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                {t('board', 'trend.empty.downloadsWait')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ③ 类型两图：(e) 同心环 + (f) 雷达 */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('board', 'type.countTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ChartContainer config={{}} className="mx-auto aspect-square h-[220px]">
                <RadialBarChart
                  data={types.map((row) => ({
                    type: row.type,
                    count: row.count,
                    fill: TYPE_COLOR[row.type] ?? 'var(--chart-1)',
                  }))}
                  innerRadius={30}
                  outerRadius={100}
                >
                  <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                  <PolarRadiusAxis type="number" dataKey="count" tick={false} axisLine={false} />
                  <RadialBar dataKey="count" background cornerRadius={4} />
                  <ChartLegend
                    content={
                      <ChartLegendContent
                        nameKey="type"
                        className="flex-wrap gap-2"
                        formatter={(_value, entry) => {
                          const row = entry?.payload as
                            | { type?: string; count?: number }
                            | undefined;
                          const key = row?.type ?? '';
                          return `${typeLabel(t, key)} · ${row?.count ?? 0}`;
                        }}
                      />
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="type"
                        hideLabel
                        formatter={(value, _name, item) => {
                          const row = item?.payload as { type?: string } | undefined;
                          return `${typeLabel(t, row?.type ?? '')} · ${value}`;
                        }}
                      />
                    }
                  />
                </RadialBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('board', 'type.heatTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ChartContainer config={{}} className="mx-auto aspect-square h-[220px]">
                <RadarChart
                  data={types.map((row) => ({
                    type: typeLabel(t, row.type),
                    downloads: row.downloads,
                  }))}
                >
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <PolarGrid />
                  <Radar
                    dataKey="downloads"
                    fill="var(--chart-1)"
                    fillOpacity={0.6}
                    stroke="var(--chart-1)"
                    dot={{ r: 4, fillOpacity: 1 }}
                  />
                </RadarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ④ 排行榜单卡（三口径 + Top N） */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{t('board', 'rank.title')}</CardTitle>
          <div className="flex items-center gap-2">
            {(['people', 'labels', 'assets'] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={caliber === key ? 'secondary' : 'ghost'}
                onClick={() => setCaliber(key)}
              >
                {key === 'people'
                  ? t('board', 'rank.byPeople')
                  : key === 'labels'
                    ? t('board', 'rank.byLabel')
                    : t('board', 'rank.byAsset')}
              </Button>
            ))}
            <Select
              value={String(topN)}
              onChange={(v) => setTopN(Number(v))}
              options={TOP_OPTS.map((n) => ({
                value: String(n),
                label: t('board', 'rank.topN', { n }),
              }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : rankRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('admin', 'empty')}</p>
          ) : (
            <ChartContainer config={{}} className="aspect-auto h-[280px] w-full">
              <BarChart accessibilityLayer data={rankRows} margin={{ left: 12, right: 12 }}>
                <YAxis type="category" dataKey="id" hide />
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v, _n, item) => `${item?.payload?.name ?? ''} · ${v}`}
                    />
                  }
                />
                <Bar dataKey="value" radius={4} fill="var(--chart-1)">
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    className="fill-background"
                    fontSize={12}
                  />
                  <LabelList
                    dataKey="value"
                    position="right"
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ⑤ 创意四项 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['reviewSpeed', 'board', 'creative.reviewSpeed'],
            ['concentration', 'board', 'creative.concentration'],
            ['labelCoverage', 'board', 'creative.labelCoverage'],
            ['sleeping', 'board', 'creative.sleeping'],
          ] as const
        ).map(([kind, group, key]) => (
          <Kpi key={kind} title={t(group, key)} value={loading ? '—' : creativeValue(kind)} />
        ))}
      </div>

      {/* ⑥ 英雄榜 ×2（官方 Bar Chart - Custom Label 配方；取排行榜前 3） */}
      <div className="grid gap-3 lg:grid-cols-2">
        <HeroCard
          title={t('board', 'hero.assets')}
          rows={heroAssets}
          loading={loading}
          emptyText={t('admin', 'empty')}
        />
        <HeroCard
          title={t('board', 'hero.people')}
          rows={heroPeople}
          loading={loading}
          emptyText={t('admin', 'empty')}
          staff
        />
      </div>
    </div>
  );
}

/** 近 7 天新增下载（`cum[D] − cum[D-7]`；design D31 —— 前端由趋势切片算，零服务端改动） */
function lastWeekDelta(points: TrendPoint[]): number {
  const last = points.at(-1)?.downloads ?? 0;
  const prev = points.at(-8)?.downloads ?? 0;
  return Math.max(last - prev, 0);
}

/** 英雄榜卡（横条 + 柱内名称 + 柱外数值 · 两轴全隐藏 · 无 footer —— D11/D12） */
function HeroCard({
  title,
  rows,
  loading,
  emptyText,
  staff,
}: {
  title: string;
  rows: AdminRankItem[];
  loading: boolean;
  emptyText: string;
  staff?: boolean;
}) {
  const data = rows.map((r) => ({ label: staff ? `${r.id} ${r.name}` : r.name, value: r.value }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ChartContainer config={{}} className="aspect-auto h-[200px] w-full">
            <BarChart accessibilityLayer data={data} layout="vertical" margin={{ right: 16 }}>
              <YAxis type="category" dataKey="label" hide />
              <XAxis type="number" hide />
              <Bar dataKey="value" radius={4} fill="var(--chart-1)">
                <LabelList
                  dataKey="label"
                  position="insideLeft"
                  className="fill-background"
                  fontSize={12}
                />
                <LabelList
                  dataKey="value"
                  position="right"
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** 类型文案（复用 `assets` 组的 `type.*` 既有键；已知三族显式映射 —— `Translate` 键为字面量联合类型，不接模板键） */
function typeLabel(t: Translate, type: string): string {
  switch (type) {
    case 'skill':
      return t('assets', 'type.skill');
    case 'mcp':
      return t('assets', 'type.mcp');
    case 'agent':
      return t('assets', 'type.agent');
    default:
      return type;
  }
}

/** 轻量受控选择器（原型即此形态；官方 `Select` 件在 T7 的表单里用） */
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      className="h-8 rounded-md border bg-card px-2 text-xs text-foreground"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
