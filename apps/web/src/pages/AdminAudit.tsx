import { CalendarDays, Eye, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchAuditActions } from '@/api/admin';
import { type AuditItem, fetchAudit } from '@/api/audit';
import { Drawer } from '@/components/console/Drawer';
import { PAGE_SIZE } from '@/components/market/sortOptions';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Calendar } from '@/components/ui/shadcn/calendar';
import { Card, CardHeader } from '@/components/ui/shadcn/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Separator } from '@/components/ui/shadcn/separator';
import { useApi } from '@/hooks/useApi';
import { type Translate, useI18n } from '@/i18n/I18nProvider';

/**
 * M4b-6 · 审计日志页**原型**（DEV-only · 物料不进仓）。
 *
 * 依据：批 design §4.4 / §4.4b（已对齐 2026-09-23）
 * 数据：`audit-data.ts` = **真库快照**（DB 直读最近 20 条 + 动作全集 + 总量）——
 *       `/api/audit` 与 `/api/audit/actions` 均需 `role >= ADMIN`，DEV 匿名环境连不上。
 * 列宽口径：**数据列合计 92% + 操作槽 8%**（对齐资产管理页 —— 原先 6 列合计 100% 会把操作列挤成 0 宽、
 * 查看钮溢出单元格并让表格横向溢出）。
 * 说明：筛选（动作 / 时间）在**快照内**演示（实现期由服务端 `action` 精确匹配 + `from`/`to` 承担）；
 *       分页 `offset` 口径；`action` 下拉数据源 = 实现期的 `GET /api/audit/actions`（改动 6）。
 */
const ALL = '__all__';
/** 动作组名（潜在全集 9 组 · design §6.3；未知前缀**原样显示**兜底） */
function groupLabel(t: Translate, prefix: string): string {
  switch (prefix) {
    case 'asset':
      return t('admin', 'audit.group.asset');
    case 'review':
      return t('admin', 'audit.group.review');
    case 'label':
      return t('admin', 'audit.group.label');
    case 'token':
      return t('admin', 'audit.group.token');
    case 'auth':
      return t('admin', 'audit.group.auth');
    case 'device':
      return t('admin', 'audit.group.device');
    case 'namespace':
      return t('admin', 'audit.group.namespace');
    case 'ldap':
      return t('admin', 'audit.group.ldap');
    case 'oidc':
      return t('admin', 'audit.group.oidc');
    default:
      return prefix;
  }
}

const RANGES = [{ key: 'today' }, { key: '7' }, { key: '30' }, { key: 'custom' }] as const;

/** 日期快捷文案 */
function rangeLabel(t: Translate, key: (typeof RANGES)[number]['key']): string {
  switch (key) {
    case 'today':
      return t('admin', 'audit.range.today');
    case '7':
      return t('admin', 'audit.range.7');
    case '30':
      return t('admin', 'audit.range.30');
    default:
      return t('admin', 'audit.range.custom');
  }
}

/** §4.4「更多筛选」5 维（长度上限对齐服务端 schema：64/128/256/64/64） */
const MORE_FIELDS = [
  { key: 'targetType', max: 64 },
  { key: 'targetId', max: 128 },
  { key: 'actorId', max: 256 },
  { key: 'requestId', max: 64 },
  { key: 'clientIp', max: 64 },
] as const;

/** 更多筛选的维度标签 */
function fieldLabel(t: Translate, key: string): string {
  switch (key) {
    case 'targetType':
      return t('admin', 'audit.field.targetType');
    case 'targetId':
      return t('admin', 'audit.field.targetId');
    case 'actorId':
      return t('admin', 'audit.col.actor');
    case 'requestId':
      return t('admin', 'audit.col.requestId');
    default:
      return t('admin', 'audit.col.ip');
  }
}

/** 更多筛选的输入提示（精确匹配语义 + 示例） */
function fieldPlaceholder(t: Translate, key: string): string {
  return key === 'targetType'
    ? t('admin', 'audit.field.targetTypeHint')
    : t('admin', 'audit.field.exactHint');
}

/**
 * 时间展示：按 **`Asia/Shanghai`** 呈现（design §4.4「时间」列口径，与 D35 日切同源）。
 * ⚠️ 快照串形如 `2026-09-23 01:03:25.9299+00`（非 ISO，**探针用 raw SQL 取值的产物**）——
 * 实现期接口经 drizzle 类型化 select 返回 `Date`，JSON 序列化即标准 ISO 8601（UTC），前端再按时区格式化。
 * 实测校准：当前浏览器对非 ISO 串宽松解析后按本地时区渲染（01:03Z → 09:03 CST，+8 正确），但**不应依赖**该行为。
 */
function fmtTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function AdminAudit() {
  const { t } = useI18n();
  const [action, setAction] = useState<string>(ALL);
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('7');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [more, setMore] = useState<Record<string, string>>({});
  /** 快捷筛选（对标兄弟仓（SkillHub）的「一键筛选」）：只映射**既有**查询参数 ⇒ 零服务端改动 */
  const [quick, setQuick] = useState<'24h' | 'versionYank' | null>(null);
  const [current, setCurrent] = useState<AuditItem | null>(null);
  const [page, setPage] = useState(0);

  /** 查询参数（服务端过滤 —— M4b-6 T9 起不再客户端过滤快照） */
  const params = useMemo(() => {
    const now = Date.now();
    const days = range === 'today' ? 1 : range === '7' ? 7 : range === '30' ? 30 : 0;
    const fromBase =
      range === 'custom' && customFrom
        ? new Date(`${customFrom}T00:00:00`).toISOString()
        : days > 0
          ? new Date(now - days * 86_400_000).toISOString()
          : undefined;
    return {
      // 快捷「版本下架」= `action=asset.version_yank`（action 精确匹配 ⇒ 零服务端改动）
      action: quick === 'versionYank' ? 'asset.version_yank' : action === ALL ? undefined : action,
      targetType: (more.targetType ?? '').trim() || undefined,
      targetId: (more.targetId ?? '').trim() || undefined,
      actorId: (more.actorId ?? '').trim() || undefined,
      requestId: (more.requestId ?? '').trim() || undefined,
      clientIp: (more.clientIp ?? '').trim() || undefined,
      // 快捷「近 24 小时」= 覆盖 `from`（from 参数服务端已支持 ⇒ 零改动）
      from: quick === '24h' ? new Date(now - 86_400_000).toISOString() : fromBase,
      to:
        range === 'custom' && customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined,
    };
  }, [action, range, customFrom, customTo, more, quick]);

  const list = useApi(
    (signal) => fetchAudit({ ...params, limit: PAGE_SIZE, offset: page * PAGE_SIZE }, { signal }),
    [params, page],
  );
  const rows: readonly AuditItem[] = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  /** 页头计数：全库记录数 + 近 7 天数（各一次 1 行的轻查询 —— 与筛选无关） */
  const allCount = useApi((signal) => fetchAudit({ limit: 1 }, { signal }), []);
  const last7 = useApi(
    (signal) =>
      fetchAudit(
        { limit: 1, from: new Date(Date.now() - 7 * 86_400_000).toISOString() },
        { signal },
      ),
    [],
  );
  /** 动作全集（下拉数据源 = `GET /api/audit/actions` · 改动 6） */
  const actionApi = useApi((signal) => fetchAuditActions({ signal }), []);
  const actionGroups = actionApi.data?.groups ?? [];

  /** 清除筛选（含快捷）—— 对标兄弟仓的「清除筛选」按钮 */
  function clearAll() {
    setAction(ALL);
    setRange('7');
    setCustomFrom('');
    setCustomTo('');
    setMore({});
    setQuick(null);
  }

  const columns = useMemo(
    () => [
      {
        id: 'createdAt',
        header: t('admin', 'audit.col.time'),
        meta: { headClassName: 'w-[14%]', hidable: false },
        cell: ({ row }: { row: { original: AuditItem } }) => (
          <span className="tabular-nums text-muted-foreground">
            {fmtTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'action',
        header: t('admin', 'audit.col.action'),
        meta: { headClassName: 'w-[20%]', hidable: false },
        /* §4.4 口径 = 「动作（原始串）」⇒ 只渲原始串（组名在下拉里体现；视觉复查抓到我首稿多塞了组徽标 ⇒ 已去） */
        cell: ({ row }: { row: { original: AuditItem } }) => (
          <span className="block truncate font-mono text-xs" title={row.original.action}>
            {row.original.action}
          </span>
        ),
      },
      {
        id: 'actor',
        header: t('admin', 'audit.col.actor'),
        meta: { headClassName: 'w-[14%]', hidable: true },
        cell: ({ row }: { row: { original: AuditItem } }) =>
          row.original.actorId ? (
            <span
              className="block truncate"
              title={`${row.original.actorId}${row.original.actorName ? ` ${row.original.actorName}` : ''}`}
            >
              <span className="font-mono text-xs">{row.original.actorId}</span>
              {row.original.actorName ? (
                <span className="text-muted-foreground"> {row.original.actorName}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted-foreground">{t('admin', 'audit.anonymous')}</span>
          ),
      },
      {
        id: 'target',
        header: t('admin', 'audit.col.target'),
        meta: { headClassName: 'w-[16%]', hidable: true },
        cell: ({ row }: { row: { original: AuditItem } }) => {
          const text = row.original.targetType
            ? `${row.original.targetType}:${row.original.targetId ?? '—'}`
            : '—';
          return (
            <span className="block truncate font-mono text-xs text-muted-foreground" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'clientIp',
        header: t('admin', 'audit.col.ip'),
        meta: { headClassName: 'w-[12%]', hidable: true },
        cell: ({ row }: { row: { original: AuditItem } }) => (
          <span className="font-mono text-xs">{row.original.clientIp ?? '—'}</span>
        ),
      },
      {
        id: 'requestId',
        header: t('admin', 'audit.col.requestId'),
        meta: { headClassName: 'w-[16%]', hidable: true },
        cell: ({ row }: { row: { original: AuditItem } }) => (
          <span className="truncate font-mono text-xs text-muted-foreground">
            {row.original.requestId ?? '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const moreActive = MORE_FIELDS.filter((f) => (more[f.key] ?? '').trim() !== '').length;
  const scopeRange = rangeLabel(t, range);
  /** 计数区的作用域描述：快捷优先（近 24 小时）→ 否则「快捷 · 区间」 */
  const scopeLabel =
    quick === '24h'
      ? t('admin', 'audit.quick.24h')
      : quick === 'versionYank'
        ? `${t('admin', 'audit.quick.yank')} · ${scopeRange}`
        : scopeRange;

  return (
    <div className="flex flex-col py-6">
      <div className="mx-4 lg:mx-6">
        <Card className="flex flex-row items-center justify-between gap-4 px-[26px] py-[22px]">
          <CardHeader className="flex flex-1 flex-row items-center gap-4 p-0">
            <div className="flex size-[44px] shrink-0 items-center justify-center rounded-[13px] bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold tracking-[-0.4px]">{t('admin', 'audit')}</h1>
                <span className="font-semibold text-[11px] text-muted-foreground tracking-[1px]">
                  ADMIN
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{t('admin', 'audit.desc')}</p>
            </div>
          </CardHeader>
          <div className="shrink-0 rounded-xl border border-border bg-secondary px-5 py-2.5 text-center">
            <b className="block text-[22px] leading-tight font-bold text-primary tabular-nums">
              {(allCount.data?.total ?? 0).toLocaleString()}
            </b>
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">
              {t('admin', 'audit.headerCount', {
                all: allCount.data?.total ?? 0,
                last7: last7.data?.total ?? 0,
              })}
            </span>
          </div>
        </Card>

        {/* 过滤区（常显）：动作分组下拉 + 日期区间快捷项 */}
        <div className="mt-4 mb-3 flex flex-wrap items-center gap-3 px-0.5">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">快捷</span>
            <Button
              variant={quick === '24h' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setQuick(quick === '24h' ? null : '24h')}
            >
              {t('admin', 'audit.quick.24h')}
            </Button>
            <Button
              variant={quick === 'versionYank' ? 'secondary' : 'outline'}
              size="sm"
              title="治理高频查法：版本下架（action=asset.version_yank）"
              onClick={() => {
                setQuick(quick === 'versionYank' ? null : 'versionYank');
                setAction(ALL);
              }}
            >
              {t('admin', 'audit.quick.yank')}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              {t('admin', 'audit.quick.clear')}
            </Button>
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger
              size="sm"
              className="w-[240px]"
              aria-label={t('admin', 'audit.col.action')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('admin', 'audit.actionAll')}</SelectItem>
              {/* 未知前缀**原样显示**兜底（design §4.4：新动作不丢） */}
              {actionGroups.map((g) => (
                <SelectGroup key={g.prefix}>
                  <SelectLabel>{groupLabel(t, g.prefix)}</SelectLabel>
                  {g.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                variant={range === r.key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRange(r.key)}
              >
                {rangeLabel(t, r.key)}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="日期区间"
                  title="日期区间（官方 Calendar）"
                >
                  <CalendarDays className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <div className="flex flex-col gap-2 p-3">
                  <span className="text-xs text-muted-foreground">自定义区间（落 from / to）</span>
                  <Calendar mode="range" numberOfMonths={1} />
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      aria-label="起始日期"
                      value={customFrom}
                      onChange={(e) => {
                        setCustomFrom(e.target.value);
                        setRange('custom');
                      }}
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      type="date"
                      aria-label="结束日期"
                      value={customTo}
                      onChange={(e) => {
                        setCustomTo(e.target.value);
                        setRange('custom');
                      }}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <span className="text-[13px] text-muted-foreground">
            {scopeLabel}
            {t('admin', 'audit.count', { n: total, all: last7.data?.total ?? 0 })}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Search className="size-4" />
                  {t('admin', 'audit.more')}
                  {moreActive > 0 ? <Badge variant="secondary">{moreActive}</Badge> : null}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>

        {/* 更多筛选：5 个精确匹配输入（长度上限对齐服务端 schema） */}
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleContent>
            <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-dashed p-3 md:grid-cols-3 lg:grid-cols-5">
              {MORE_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label className="text-xs">
                    {fieldLabel(t, f.key)}
                    <span className="ml-1 text-[10px] text-muted-foreground">≤{f.max}</span>
                  </Label>
                  <Input
                    maxLength={f.max}
                    placeholder={fieldPlaceholder(t, f.key)}
                    value={more[f.key] ?? ''}
                    onChange={(e) => setMore((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {rows.length === 0 ? (
          <EmptyState message={t('admin', 'empty')} />
        ) : (
          <DataTable
            columns={columns as never}
            data={rows as never}
            getRowId={(r) => String((r as unknown as AuditItem).id)}
            emptyMessage={t('admin', 'empty')}
            density="default"
            tableClassName="table-fixed"
            rowProps={(raw) => {
              const r = raw as unknown as AuditItem;
              return {
                'data-audit-row': r.action,
                className: 'cursor-pointer hover:bg-muted/50',
                onClick: () => setCurrent(r),
              };
            }}
            rowActions={(raw) => {
              const r = raw as unknown as AuditItem;
              return (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="查看"
                  title="查看"
                  onClick={() => setCurrent(r)}
                >
                  <Eye className="size-4" />
                </Button>
              );
            }}
            rowActionsHeader={t('assets', 'col.actions')}
            rowActionsLabel={t('assets', 'col.actions')}
          />
        )}

        {total > PAGE_SIZE ? (
          <Pagination
            total={total}
            limit={PAGE_SIZE}
            offset={page * PAGE_SIZE}
            onPageChange={(nextOffset) => {
              setPage(Math.floor(nextOffset / PAGE_SIZE));
              window.scrollTo({ top: 0 });
            }}
          />
        ) : null}
      </div>

      {/* 详情抽屉：全量原样展示（detail jsonb 美化 + userAgent + 完整 IP，不打码 —— D49） */}
      <Drawer
        open={current !== null}
        onOpenChange={(o) => !o && setCurrent(null)}
        title={current ? `${current.action} · #${current.id}` : ''}
        description="原始记录（全量展示，不打码）"
      >
        {current ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t('admin', 'audit.col.time')}</dt>
              <dd className="col-span-2 tabular-nums">{fmtTime(current.createdAt)}</dd>
              <dt className="text-muted-foreground">{t('admin', 'audit.col.action')}</dt>
              <dd className="col-span-2 font-mono text-xs">{current.action}</dd>
              <dt className="text-muted-foreground">{t('admin', 'audit.col.actor')}</dt>
              <dd className="col-span-2">
                {current.actorId ? (
                  <>
                    <span className="font-mono text-xs">{current.actorId}</span>
                    {current.actorName ? ` ${current.actorName}` : ''}
                  </>
                ) : (
                  '—（匿名）'
                )}
              </dd>
              <dt className="text-muted-foreground">{t('admin', 'audit.col.target')}</dt>
              <dd className="col-span-2 font-mono text-xs">
                {current.targetType ? `${current.targetType}:${current.targetId ?? '—'}` : '—'}
              </dd>
              <dt className="text-muted-foreground">{t('admin', 'audit.col.ip')}</dt>
              <dd className="col-span-2 font-mono text-xs">{current.clientIp ?? '—'}</dd>
              <dt className="text-muted-foreground">{t('admin', 'audit.col.requestId')}</dt>
              <dd className="col-span-2 font-mono text-xs">{current.requestId ?? '—'}</dd>
              <dt className="text-muted-foreground">{t('admin', 'audit.field.userAgent')}</dt>
              <dd className="col-span-2 break-all text-xs">{current.userAgent ?? '—'}</dd>
            </dl>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {t('admin', 'audit.field.detail')}
              </span>
              <pre className="max-h-[320px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
                {JSON.stringify(current.detail ?? null, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
