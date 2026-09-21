/**
 * 我的令牌 `/dashboard/tokens`（M4b-3 批 design §4.2 + §4.4.1；批 plan T7）。
 *
 * 契约（引用不复制）：
 * - `GET /api/tokens` ⇒ `{ items: ApiKeyRow[] }`（**仅本人**、无分页 ⇒ 本页**不做分页**）
 * - `POST /api/tokens { name, scope? }` ⇒ 201 `{ id, token, expiresAt }`（**明文仅此一次**）
 * - `PATCH /api/tokens/:id { name, scope? }` ⇒ 200 单条（T3 新增）· `DELETE /api/tokens/:id` ⇒ 204（服务端语义 = 吊销）
 *
 * 硬口径（design D11/D13/D14 · §4.2 · **勿凭记忆改**）：
 * 1. **只显有效令牌**：前端过滤 `revokedAt === null`（零服务端改动）⇒ 操作列恒为 [编辑][删除]，无「—」分支。
 * 2. **`name` 必填**（新建与编辑；空 / 纯空白 ⇒ 提交禁用 + 服务端 400 双保险）；`scope` 省略 / `[]` = **全量**。
 * 3. **明文一次性**：库里只有哈希 ⇒ 明文只在本页创建响应里出现一次；**禁止**写入日志/上报。
 * 4. **关闭逻辑单一入口** `requestClose()`：Esc / 遮罩 / ✕（`onOpenChange`）与自绘按钮**共用**，
 *    `copiedOnce === false` 时先弹确认；**明文态隐藏 ✕**（`showCloseButton={false}`）。
 * 5. **关闭后复位**：`step → 'form'` · `copiedOnce → false` · 明文清空（防下次创建时防护失效）。
 * 6. 删除确认 **去红**（`destructive={false}`）；两个行内图标 **同色**（ghost，不用红）；文案用「创建/删除」。
 */
import type { LegacyColumnDef } from '@tanstack/react-table/legacy';
import { Check, SquarePen, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, invalidateCache } from '@/api/client';
import {
  type ApiKeyRow,
  createToken,
  deleteToken,
  fetchTokens,
  type IssuedToken,
  TOKEN_SCOPE_CODES,
  type TokenScopeCode,
  updateToken,
} from '@/api/tokens';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { PageHeader } from '@/components/console/PageHeader';
import { CopyButton } from '@/components/ui/CopyButton';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/shadcn/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/shadcn/field';
import { Input } from '@/components/ui/shadcn/input';
import { Spinner } from '@/components/ui/shadcn/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/shadcn/toggle-group';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/i18n/I18nProvider';

/** scope 码 → i18n 说明键（**单点映射**；禁在 JSX 里散写三元链；`satisfies` 保证键名与字典对齐） */
const SCOPE_KEY = {
  'asset:publish': 'scope.publish',
  'asset:manage': 'scope.manage',
  'review:submit': 'scope.submit',
  'review:approve': 'scope.approve',
  'audit:read': 'scope.audit',
} as const satisfies Record<TokenScopeCode, string>;

/** 名称上限（与服务端 `trim().max(32)` / 官方 `maximumNameLength: 32` 同值） */
const NAME_MAX = 32;

/** 僵尸令牌阈值：最后使用早于 **3 个月**（90 天）⇒ `text-warning`（design D11，对标 new-api） */
const STALE_MS = 90 * 24 * 60 * 60 * 1000;

/** scope 串 → 码数组（`''` = 全量 ⇒ 空选；与 `ToggleGroup` 的「全不勾」语义一致） */
function toCodes(scope: string): TokenScopeCode[] {
  if (scope === '') return [];
  return scope
    .split(',')
    .filter((code): code is TokenScopeCode =>
      (TOKEN_SCOPE_CODES as readonly string[]).includes(code),
    );
}

export function Tokens() {
  const { t, tErr } = useI18n();
  const [retryTick, setRetryTick] = useState(0);

  // ── 创建（两态同一 Dialog：`step = 'form' | 'plain'`） ──────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'plain'>('form');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<TokenScopeCode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  /** 明文（**只在本次创建的生命周期内存活**；关闭即清） */
  const [issued, setIssued] = useState<IssuedToken | null>(null);
  /** 复制标记（`CopyButton` 无 `onCopied` ⇒ 页内 `onClickCapture` 打标，零改共享件） */
  const [copiedOnce, setCopiedOnce] = useState(false);
  const [confirmPlainClose, setConfirmPlainClose] = useState(false);

  // ── 编辑 / 删除 ──────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState<ApiKeyRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editScopes, setEditScopes] = useState<TokenScopeCode[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ApiKeyRow | null>(null);

  const { data, error, loading } = useApi((signal) => fetchTokens({ signal }), [retryTick]);

  /** 只显有效（D11）：已吊销的行不出现 ⇒ 操作列恒有值 */
  const rows = useMemo(() => (data?.items ?? []).filter((row) => row.revokedAt === null), [data]);

  const refresh = () => {
    invalidateCache('/api/tokens');
    setRetryTick((n) => n + 1);
  };

  const resetCreate = () => {
    setStep('form');
    setCopiedOnce(false);
    setIssued(null);
    setName('');
    setScopes([]);
  };

  /**
   * **关闭逻辑唯一入口**（design §4.2 ★ 实现期须知①）：四条路径（Esc / 遮罩 / ✕ / 自绘按钮）
   * 全部经此 —— 明文态未复制时先弹确认，**禁止在两处各写一套分支**。
   */
  const requestClose = () => {
    if (step === 'plain' && !copiedOnce) {
      setConfirmPlainClose(true);
      return;
    }
    closeCreate();
  };

  /** 真正关闭（含复位与**关闭后**刷新列表 —— design：明文态关闭之后才刷新） */
  const closeCreate = () => {
    const wasPlain = step === 'plain';
    setConfirmPlainClose(false);
    setCreateOpen(false);
    resetCreate();
    if (wasPlain) refresh();
  };

  const nameMissing = name.trim() === '';
  const editNameMissing = editName.trim() === '';

  const onSubmitCreate = async () => {
    if (nameMissing || submitting) return;
    setSubmitting(true);
    try {
      // `scope` 省略 = 全量（服务端与官方同语义；全不勾 ⇒ 不传）
      const created = await createToken({
        name: name.trim(),
        ...(scopes.length > 0 ? { scope: scopes } : {}),
      });
      setIssued(created);
      setStep('plain');
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitEdit = async () => {
    if (!editRow || editNameMissing || editSubmitting) return;
    setEditSubmitting(true);
    try {
      // 编辑：全不勾 = **全量** ⇒ 显式传 `[]`（省略 = 不改权限，语义不同）
      await updateToken(editRow.id, { name: editName.trim(), scope: editScopes });
      setEditRow(null);
      refresh();
      toast.success(t('tokens', 'edit.success'));
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const onConfirmDelete = async () => {
    const row = deleteRow;
    setDeleteRow(null);
    if (!row) return;
    try {
      await deleteToken(row.id);
      refresh();
      toast.success(t('tokens', 'delete.success'));
    } catch (err) {
      // 他人令牌（含超管视角）⇒ 404：刷新回服务端真实状态 + 提示
      refresh();
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    }
  };

  const columns = useMemo<Array<LegacyColumnDef<ApiKeyRow, unknown>>>(
    () => [
      {
        accessorKey: 'name',
        header: t('tokens', 'col.name'),
        cell: ({ row }) =>
          row.original.name ? (
            <span>{row.original.name}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'start',
        header: t('tokens', 'col.key'),
        cell: ({ row }) => {
          const { start, tail, id } = row.original;
          // 旧令牌（迁移前 start/tail 缺失）⇒ 「—」（无法回填，design §4.2 ⚠️）
          if (!start || !tail) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="block max-w-[240px] truncate font-mono text-xs text-muted-foreground"
              title={id}
            >
              {`${start}*****${tail}`}
            </span>
          );
        },
      },
      {
        accessorKey: 'scope',
        header: t('tokens', 'col.scope'),
        cell: ({ row }) => {
          const codes = row.original.scope === '' ? [] : row.original.scope.split(',');
          if (codes.length === 0)
            return <Badge variant="outline">{t('tokens', 'scope.full')}</Badge>;
          return (
            <span className="flex flex-wrap items-center gap-1">
              {codes.map((code) => (
                <Badge key={code} variant="outline" className="font-mono">
                  {code}
                </Badge>
              ))}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('tokens', 'col.createdAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'lastRequest',
        header: t('tokens', 'col.lastUsed'),
        cell: ({ row }) => {
          const last = row.original.lastRequest;
          if (!last)
            return <span className="text-muted-foreground">{t('tokens', 'uses.never')}</span>;
          const stale = Date.now() - new Date(last).getTime() > STALE_MS;
          return (
            <span className={stale ? 'text-warning' : undefined}>
              {new Date(last).toLocaleString()}
            </span>
          );
        },
      },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('dashboard', 'tokens')}
        description={t('tokens', 'subtitle')}
        actions={
          <Button
            type="button"
            onClick={() => {
              resetCreate();
              setCreateOpen(true);
            }}
          >
            {t('tokens', 'create.button')}
          </Button>
        }
      />

      {!loading && !error && rows.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>{t('tokens', 'empty.none')}</EmptyTitle>
            <EmptyDescription>{t('tokens', 'empty.noneHint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable<ApiKeyRow>
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refresh}
          emptyMessage={t('tokens', 'empty.none')}
          rowActionsLabel={t('tokens', 'col.actions')}
          rowActionsHeader={t('tokens', 'col.actions')}
          rowActions={(row) => (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t('tokens', 'edit.button')}
                title={t('tokens', 'edit.button')}
                onClick={() => {
                  setEditRow(row);
                  setEditName(row.name ?? '');
                  setEditScopes(toCodes(row.scope));
                }}
              >
                <SquarePen className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t('tokens', 'delete.button')}
                title={t('tokens', 'delete.button')}
                onClick={() => setDeleteRow(row)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        />
      )}

      {/* ── 创建（表单态 → 明文态，同一 Dialog 单 open 状态） ─────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) requestClose(); // 四条关闭路径的唯一入口（design §4.2 ★）
        }}
      >
        <DialogContent showCloseButton={step === 'form'} className="sm:max-w-[520px]">
          {step === 'form' ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('tokens', 'create.title')}</DialogTitle>
                <DialogDescription>{t('tokens', 'create.desc')}</DialogDescription>
              </DialogHeader>
              <Field>
                <FieldLabel htmlFor="token-name">{t('tokens', 'create.nameLabel')}</FieldLabel>
                <Input
                  id="token-name"
                  value={name}
                  maxLength={NAME_MAX}
                  placeholder={t('tokens', 'create.nameHint')}
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldDescription>{t('tokens', 'create.nameHint')}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>{t('tokens', 'create.scopeLabel')}</FieldLabel>
                <ScopePicker value={scopes} onChange={setScopes} />
                <FieldDescription>
                  {scopes.length === 0
                    ? t('tokens', 'create.scopeHintNone')
                    : t('tokens', 'create.scopeHintSome', { n: scopes.length })}
                </FieldDescription>
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={requestClose}>
                  {t('common', 'cancel')}
                </Button>
                <Button type="button" disabled={nameMissing || submitting} onClick={onSubmitCreate}>
                  {submitting ? <Spinner className="size-4" /> : null}
                  {t('tokens', 'create.submit')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('tokens', 'plain.title')}</DialogTitle>
                <DialogDescription>{t('tokens', 'plain.warning')}</DialogDescription>
              </DialogHeader>
              {/*
                复制标记：`CopyButton` 无 `onCopied` 回调 ⇒ 页内层 `onClickCapture` 打标（**零改共享件**）。
                ⚠️ 该层**只包明文与复制按钮**（不包「我已保存，关闭」）——否则点关闭会顺手置位 copiedOnce，
                误关防护形同失效（design §4.2 ★ 实现期须知：防「按钮路径绕过复制标记」）。
              */}
              <div
                onClickCapture={() => setCopiedOnce(true)}
                className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3"
              >
                <code className="break-all font-mono text-sm">{issued?.token ?? ''}</code>
                <CopyButton
                  value={issued?.token ?? ''}
                  label={t('tokens', 'plain.copy')}
                  copiedLabel={t('tokens', 'plain.copied')}
                  clearOnUnmount
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={requestClose}>
                  {t('tokens', 'plain.close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 明文态误关确认（destructive=false 去红：「取消」留在明文态） */}
      <ConfirmDialog
        open={confirmPlainClose}
        onOpenChange={(open) => {
          if (!open) setConfirmPlainClose(false);
        }}
        title={t('tokens', 'plain.closeTitle')}
        description={t('tokens', 'plain.closeDesc')}
        confirmLabel={t('tokens', 'plain.closeConfirm')}
        cancelLabel={t('tokens', 'plain.closeCancel')}
        destructive={false}
        onConfirm={closeCreate}
      />

      {/* ── 编辑（改名 + 改权限） ─────────────────────────────────────── */}
      <Dialog
        open={editRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t('tokens', 'edit.title')}</DialogTitle>
            <DialogDescription>{t('tokens', 'edit.desc')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="token-edit-name">{t('tokens', 'edit.nameLabel')}</FieldLabel>
            <Input
              id="token-edit-name"
              value={editName}
              maxLength={NAME_MAX}
              onChange={(event) => setEditName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>{t('tokens', 'edit.scopeLabel')}</FieldLabel>
            <ScopePicker value={editScopes} onChange={setEditScopes} />
            <FieldDescription>{t('tokens', 'edit.scopeHint')}</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              {t('common', 'cancel')}
            </Button>
            <Button
              type="button"
              disabled={editNameMissing || editSubmitting}
              onClick={onSubmitEdit}
            >
              {editSubmitting ? <Spinner className="size-4" /> : null}
              {t('tokens', 'edit.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除（去红二次确认；服务端语义 = 吊销，措辞用「删除」） ────────── */}
      <ConfirmDialog
        open={deleteRow !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRow(null);
        }}
        title={t('tokens', 'delete.title')}
        description={t('tokens', 'delete.desc', { name: deleteRow?.name ?? '—' })}
        confirmLabel={t('tokens', 'delete.confirm')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

/**
 * 权限范围选择器（官方 `ToggleGroup type="multiple"`，**每项两行** = 码名 mono + 中文说明；
 * 选中显 ✓ / 未选显空方框 —— design Q13 与 §4.2 形态。
 *
 * 布局走 `className`（规则①允许布局类）：官方 `ToggleGroup` 自带 `w-fit items-center`
 * ⇒ 同属性冲突处用 v4 尾置 `!` 提权；`spacing={2}` 避开官方 `data-[spacing=0]:rounded-none`
 * （默认 0 会把自定义圆角打成直角，见 `shadcn-ui-v4-adoption` refs §4）。
 */
function ScopePicker({
  value,
  onChange,
}: {
  value: TokenScopeCode[];
  onChange: (next: TokenScopeCode[]) => void;
}) {
  const { t } = useI18n();
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      spacing={2}
      value={value}
      onValueChange={(next) => onChange(next as TokenScopeCode[])}
      className="w-full! flex-col items-stretch!"
    >
      {TOKEN_SCOPE_CODES.map((code) => {
        const selected = value.includes(code);
        return (
          <ToggleGroupItem
            key={code}
            value={code}
            className="h-auto flex-col items-start gap-0.5 px-3 py-2"
          >
            <span className="flex items-center gap-1.5">
              <span className="flex size-3.5 items-center justify-center" aria-hidden>
                {selected ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="block size-3 rounded-[3px] border border-muted-foreground/60" />
                )}
              </span>
              <span className="font-mono text-xs">{code}</span>
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {t('tokens', SCOPE_KEY[code])}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
