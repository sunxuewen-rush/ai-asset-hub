/**
 * 标签定义页 `/admin/labels`（M4b-6 T8 · 由 prototype `pages/__proto/LabelsProto.tsx` 定案稿转正）。
 *
 * 结构（批 design §4.3）：
 * ① 页头卡（门户 `CenterPage` 同构）+ **上限块**（`total / limit`；≥90% 切 `warn` 色调）
 * ② **两级严格树**：一级缩进 0 · 二级 **28px + 2px 引导线**（`border-l-2`）· **chevron 仅在有子级的一级行** · 默认折叠
 * ③ 六列：显示名（zh）· slug · 类型徽标 · 过滤可见 · **挂载数**（可点 → `/admin/assets?label=<slug>`）· 操作
 * ④ 行内动作：↑↓（**首/末禁用** · 一次 `PUT /order` 提交整组）· 编辑 · 删除
 * ⑤ 删除确认（F212 + F214）：禁用条件 = **有子标签**(`hasChildren`) **或** 任一状态有挂载(`mountCountAny`)
 *    —— 与服务端 `deleteLabel` 的两条拒绝路径（`label.parent.has_children` → `label.in_use`）**逐条同面**；
 *    文案按同一优先级四分支（有子级 / 有已发布挂载 / 仅隐藏归档挂载 / 无挂载）
 * ⑥ 创建/编辑对话框（同一对话框两态）：slug（创建后禁改）· 类型 · 父级 · 中/英文名 · **过滤可见开关（默认打开）**
 */

import {
  ChevronDown,
  ChevronRight,
  Gauge,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  createLabel,
  deleteLabel,
  fetchAllLabels,
  type ManagedLabelRow,
  reorderLabels,
  updateLabel,
} from '@/api/admin';
import { ApiError } from '@/api/client';
import { PageHeader } from '@/components/console/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Switch } from '@/components/ui/shadcn/switch';
import { useApi } from '@/hooks/useApi';
import { type Translate, useI18n } from '@/i18n/I18nProvider';

/** 上限块 warn 阈值（≥90% 切暖色） */
const WARN_RATIO = 0.9;
/** 二级缩进（design §4.3 v0.22 定值：一级 0 · 二级 28px + 2px 引导线） */
const CHILD_INDENT_PX = 28;

/**
 * 树行 = 标签行 + 层级信息（**扁平**：cells/actions 直接吃 `row.original.depth`）。
 *
 * 用**对象字面量类型**显式列字段（不用 `interface`）：`DataTable<TData extends Record<string, unknown>>`
 * 要求 TData 有隐式索引签名，而 interface / 与 interface 的交叉类型都不带 ⇒ 显式列字段的字面量类型才有。
 */
type TreeRow = {
  id: number;
  slug: string;
  type: string;
  visibleInFilter: boolean;
  sortOrder: number;
  parentId: string | null;
  translations: Array<{ locale: string; displayName: string }>;
  assetCount: number;
  /** 任一状态挂载数（F212 —— 删除禁用条件与文案用；`assetCount` 只算已发布） */
  mountCountAny: number;
  /** 0 = 一级 · 1 = 二级 */
  depth: number;
  hasChildren: boolean;
};

/** 翻译取值（zh-CN → zh → en → slug 回退链；服务端已归一 locale 为小写） */
function displayNameOf(row: ManagedLabelRow, locale: string): string {
  // F215：与服务端 `pickDisplayName` **同一条链**（locale 精确 → 主语言精确 → 主语言前缀 → en → slug）。
  // 此前两侧都只做精确匹配 ⇒ 行内 locale 是 `zh-cn`（管理页表单写 `zh-CN` 归一而来）时，中文界面显示英文名。
  const norm = (value: string) => value.trim().replaceAll('_', '-').toLowerCase();
  const want = norm(locale);
  const primary = want.split('-')[0] ?? want;
  const byExact = (target: string) => row.translations.find((x) => norm(x.locale) === target);
  const hit =
    byExact(want) ??
    byExact(primary) ??
    row.translations.find((x) => norm(x.locale).startsWith(`${primary}-`)) ??
    byExact('en');
  return hit?.displayName ?? row.slug;
}

function typeText(t: Translate, type: string): string {
  return type === 'PRIVILEGED'
    ? t('admin', 'labels.type.PRIVILEGED')
    : t('admin', 'labels.type.RECOMMENDED');
}

export default function AdminLabels() {
  const { t, tErr } = useI18n();
  const locale = 'zh-CN';
  const [tick, setTick] = useState(0);
  const { data, error, loading } = useApi((signal) => fetchAllLabels({ signal }), [tick]);

  /** 本地行集（服务端返回后初始化；↑↓ 与保存后以本地为准） */
  const [rows, setRows] = useState<ManagedLabelRow[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  // F214：弹窗目标改吃 `TreeRow`（= 行 + 层级信息）—— 删除前置条件需要 `hasChildren`（服务端两条拒绝路径之一）
  const [delTarget, setDelTarget] = useState<TreeRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedLabelRow | null>(null);
  const [form, setForm] = useState({
    slug: '',
    type: 'RECOMMENDED',
    parentId: '',
    nameZh: '',
    nameEn: '',
    visibleInFilter: true,
  });

  useEffect(() => {
    if (data) {
      setRows(data.items);
      setDirty(false);
    }
  }, [data]);

  /** 两级树展开（一级 → 其二级；无子级的一级行不渲染 chevron） */
  const tree = useMemo<TreeRow[]>(() => {
    const parents = rows
      .filter((r) => r.parentId === null)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const out: TreeRow[] = [];
    for (const p of parents) {
      const kids = rows
        .filter((r) => r.parentId === p.slug)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      out.push({ ...p, depth: 0, hasChildren: kids.length > 0 });
      if (expanded[p.id]) for (const k of kids) out.push({ ...k, depth: 1, hasChildren: false });
    }
    return out;
  }, [rows, expanded]);

  const quota = data ? { total: data.total, limit: data.limit } : null;
  const warn = quota !== null && quota.limit > 0 && quota.total / quota.limit >= WARN_RATIO;

  /** 同级内移动（一次提交整组顺序 —— design D28） */
  const move = (row: ManagedLabelRow, delta: -1 | 1) => {
    const siblings = rows
      .filter((r) => r.parentId === row.parentId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const idx = siblings.findIndex((r) => r.id === row.id);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= siblings.length) return;
    const next = siblings.slice();
    const [moved] = next.splice(idx, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    const orderMap = new Map(next.map((r, i) => [r.id, i]));
    setRows((prev) =>
      prev.map((r) => {
        const nextOrder = orderMap.get(r.id);
        return nextOrder === undefined ? r : { ...r, sortOrder: nextOrder };
      }),
    );
    setDirty(true);
  };

  const saveOrder = async () => {
    setBusy(true);
    try {
      const order = rows
        .map((r) => ({ slug: r.slug, sortOrder: r.sortOrder }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      await reorderLabels(order);
      toast.success(t('admin', 'labels.orderSaved'));
      setDirty(false);
    } finally {
      setBusy(false);
    }
  };

  const submitForm = async () => {
    setBusy(true);
    try {
      const translations = [
        ...(form.nameZh.trim() ? [{ locale: 'zh-CN', displayName: form.nameZh.trim() }] : []),
        ...(form.nameEn.trim() ? [{ locale: 'en', displayName: form.nameEn.trim() }] : []),
      ];
      if (editing) {
        await updateLabel(editing.slug, {
          type: form.type,
          visibleInFilter: form.visibleInFilter,
          parentSlug: form.parentId === '' ? null : form.parentId,
          translations,
        });
      } else {
        await createLabel({
          slug: form.slug.trim(),
          type: form.type,
          visibleInFilter: form.visibleInFilter,
          parentSlug: form.parentId === '' ? null : form.parentId,
          translations,
        });
      }
      setFormOpen(false);
      setTick((v) => v + 1);
    } catch (err) {
      // F217：写面失败**必须可见** —— 此前只有 `try/finally`（无 catch）⇒ 400/409 被静默吞掉，
      // 表现为「保存不生效、也没提示」；仓内范式见 `StarButton.tsx:69` / `AssetAdminCard.tsx:100`。
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setBusy(true);
    try {
      await deleteLabel(delTarget.slug);
      setDelTarget(null);
      setTick((v) => v + 1);
    } catch (err) {
      // F217：删除失败同样不得静默（与提交同范式）
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      slug: '',
      type: 'RECOMMENDED',
      parentId: '',
      nameZh: '',
      nameEn: '',
      visibleInFilter: true,
    });
    setFormOpen(true);
  };

  const openEdit = (row: TreeRow) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      type: row.type,
      parentId: row.parentId ?? '',
      nameZh:
        row.translations.find((x) => x.locale === 'zh-cn' || x.locale === 'zh-CN')?.displayName ??
        '',
      nameEn: row.translations.find((x) => x.locale === 'en')?.displayName ?? '',
      visibleInFilter: row.visibleInFilter,
    });
    setFormOpen(true);
  };

  /** F217：编辑态下目标是**一级**标签 ⇒ 父级选择锁定（与服务端「锁两级校验」同面） */
  const parentLocked = editing?.parentId === null;

  const firstParents = rows.filter((r) => r.parentId === null);

  return (
    <div className="space-y-4">
      <PageHeader title={t('admin', 'labels')} description={t('admin', 'labels.desc')} />

      {error ? (
        <ErrorState error={error} onRetry={() => setTick((v) => v + 1)} />
      ) : (
        <Card className="flex flex-row items-center gap-5 px-[26px] py-[22px]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-primary text-white">
            <Gauge className="size-[22px]" aria-hidden />
          </span>
          <CardHeader className="relative min-w-0 flex-1 gap-0 p-0">
            <CardTitle className="text-xl">{t('admin', 'labels')}</CardTitle>
            <CardDescription className="text-[13px]">{t('admin', 'labels.desc')}</CardDescription>
          </CardHeader>
          <div
            className={`shrink-0 rounded-xl border px-5 py-2.5 text-center ${
              warn ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-secondary'
            }`}
          >
            <b
              className={`block text-[22px] leading-tight font-bold tabular-nums ${
                warn ? 'text-destructive' : 'text-primary'
              }`}
            >
              {quota ? `${quota.total} / ${quota.limit}` : '—'}
            </b>
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">
              {quota ? t('admin', 'labels.quota', { used: quota.total, limit: quota.limit }) : ''}
            </span>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden /> {t('admin', 'labels.create')}
          </Button>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <DataTable
            data={tree}
            getRowId={(r: TreeRow) => String(r.id)}
            density="default"
            tableClassName="table-fixed"
            emptyMessage={t('admin', 'labels.empty')}
            columns={[
              {
                accessorKey: 'slug',
                header: t('admin', 'labels.col.name'),
                cell: ({ row }) => {
                  const r = row.original;
                  return (
                    <div
                      className="flex items-center gap-2"
                      style={r.depth === 1 ? { paddingLeft: CHILD_INDENT_PX } : undefined}
                    >
                      {r.depth === 1 ? (
                        <span
                          className="absolute inset-y-0 border-border border-l-2"
                          style={{ marginLeft: -14 }}
                          aria-hidden
                        />
                      ) : null}
                      {r.hasChildren ? (
                        <button
                          type="button"
                          aria-label={r.depth === 0 ? 'toggle' : undefined}
                          onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                        >
                          {expanded[r.id] ? (
                            <ChevronDown className="size-4" aria-hidden />
                          ) : (
                            <ChevronRight className="size-4" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span className="inline-block w-4" aria-hidden />
                      )}
                      <span className="truncate font-medium" title={displayNameOf(r, locale)}>
                        {displayNameOf(r, locale)}
                      </span>
                    </div>
                  );
                },
              },
              {
                accessorKey: 'type',
                header: t('admin', 'labels.col.type'),
                cell: ({ row }) => (
                  <Badge variant="secondary">{typeText(t, row.original.type)}</Badge>
                ),
              },
              {
                accessorKey: 'visibleInFilter',
                header: t('admin', 'labels.col.visible'),
                cell: ({ row }) =>
                  row.original.visibleInFilter ? (
                    <span className="text-muted-foreground">✓</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                accessorKey: 'assetCount',
                header: t('admin', 'labels.col.count'),
                cell: ({ row }) => (
                  <Link
                    to={`/admin/assets?label=${encodeURIComponent(row.original.slug)}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {row.original.assetCount}
                  </Link>
                ),
              },
              {
                accessorKey: 'slug',
                id: 'slugText',
                header: t('admin', 'labels.col.slug'),
                cell: ({ row }) => (
                  <code className="text-xs text-muted-foreground" title={row.original.slug}>
                    {row.original.slug}
                  </code>
                ),
              },
            ]}
            rowActionsHeader={t('assets', 'col.actions')}
            rowActionsLabel={t('assets', 'col.actions')}
            rowActions={(r: TreeRow) => {
              const siblings = rows.filter((x) => x.parentId === r.parentId);
              const idx = siblings.findIndex((x) => x.id === r.id);
              return (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('admin', 'labels.moveUp')}
                    disabled={idx <= 0}
                    onClick={() => move(r, -1)}
                  >
                    <MoveUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('admin', 'labels.moveDown')}
                    disabled={idx < 0 || idx >= siblings.length - 1}
                    onClick={() => move(r, 1)}
                  >
                    <MoveDown className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('admin', 'labels.edit')}
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('admin', 'labels.delete')}
                    onClick={() => setDelTarget(r)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </>
              );
            }}
          />
        </div>
      )}

      {dirty ? (
        <div className="flex items-center justify-end gap-3">
          <Button size="sm" disabled={busy} onClick={saveOrder}>
            {t('admin', 'labels.saveOrder')}
          </Button>
        </div>
      ) : null}

      {/* 删除确认（有挂载 ⇒ 确认钮禁用 + 解挂指引） */}
      <Dialog open={delTarget !== null} onOpenChange={(open) => (open ? null : setDelTarget(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin', 'labels.delete.title')}</DialogTitle>
            <DialogDescription>
              {/* F214：文案按**服务端判定顺序**分四支（有子级 ⇒ 任一状态挂载 ⇒ 已发布挂载 ⇒ 无挂载） */}
              {delTarget && delTarget.hasChildren
                ? t('admin', 'labels.delete.hasChildren')
                : delTarget && delTarget.mountCountAny > 0
                  ? delTarget.assetCount > 0
                    ? t('admin', 'labels.delete.inUse', { n: delTarget.assetCount })
                    : t('admin', 'labels.delete.inUseHidden', { n: delTarget.mountCountAny })
                  : t('admin', 'labels.delete.unrecoverable')}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {delTarget && !delTarget.hasChildren && delTarget.mountCountAny > 0
              ? t('admin', 'labels.delete.detachHint')
              : ''}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelTarget(null)}>
              {t('common', 'cancel')}
            </Button>
            <Button
              variant="destructive"
              // F214：禁用条件 = 服务端**两条**拒绝路径的完整前置（有子标签 · 任一状态挂载）
              disabled={
                busy || (delTarget?.hasChildren ?? false) || (delTarget?.mountCountAny ?? 0) > 0
              }
              onClick={confirmDelete}
            >
              {t('admin', 'labels.delete.ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建 / 编辑（同一对话框两态） */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('admin', 'labels.edit') : t('admin', 'labels.create')}
            </DialogTitle>
            <DialogDescription>{t('admin', 'labels.parentHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="label-slug">{t('admin', 'labels.field.slug')}</Label>
              <Input
                id="label-slug"
                value={form.slug}
                disabled={editing !== null}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('admin', 'labels.slugLocked')}</p>
            </div>
            <div className="space-y-1">
              <Label>{t('admin', 'labels.field.type')}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECOMMENDED">
                    {t('admin', 'labels.type.RECOMMENDED')}
                  </SelectItem>
                  <SelectItem value="PRIVILEGED">{t('admin', 'labels.type.PRIVILEGED')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('admin', 'labels.type.privilegedHint')}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="label-parent">{t('admin', 'labels.field.parent')}</Label>
              {/* F217：编辑**一级**标签时禁用父级选择 —— 服务端 `updateLabel` 对「一级降级」直接 400
                  （06 §5.2 锁两级校验），UI 必须前置同面（本批 F212/F214 同一原则）。 */}
              <Select
                disabled={parentLocked}
                value={form.parentId === '' ? '__none__' : form.parentId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, parentId: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger id="label-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {firstParents.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {displayNameOf(p, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parentLocked ? (
                <p className="text-xs text-muted-foreground">
                  {t('admin', 'labels.parentLockedHint')}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="label-zh">{t('admin', 'labels.field.nameZh')}</Label>
              <Input
                id="label-zh"
                value={form.nameZh}
                onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="label-en">{t('admin', 'labels.field.nameEn')}</Label>
              <Input
                id="label-en"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="label-visible">{t('admin', 'labels.field.visibleInFilter')}</Label>
              <Switch
                id="label-visible"
                checked={form.visibleInFilter}
                onCheckedChange={(v) => setForm((f) => ({ ...f, visibleInFilter: v }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin', 'labels.field.visibleHint')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t('common', 'cancel')}
            </Button>
            <Button disabled={busy || form.slug.trim() === ''} onClick={submitForm}>
              {t('common', 'save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
