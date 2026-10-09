/**
 * 用户管理页（M4c-2 **T4** · 本批唯一新页面）。
 *
 * 依据 = 批 design `2026-10-09-m4c2-user-governance-design.md` §4.1–§4.5（v0.4）· 主 design §7.1/§7.3/§10.2。
 *
 * 契约要点：
 * - **数据面 = 服务端薄端点** `/api/admin/users*`（`apps/web/src/api/admin.ts` 已封装）—— 服务端分页（替换式）；
 * - **F294 筛选互斥**：`field=username` 与 `role` / `status` 互斥（服务端 400）⇒ 本页禁用互斥控件并提示；
 * - **护栏两侧**：本页对「本人行」与「唯一超管行」隐藏/禁用危险动作；服务端仍是权威（403 中文码）；
 * - **档位**：路由门槛 = 管理档（`role >= ADMIN`，数据面 `user:['list']`）；治理动作 = 超管 ⇒ 管理档进页为**只读视图**；
 * - **视觉零新值**：全部复用既有件（DataTable / Pagination / ConfirmDialog / shadcn Select·Input·Dialog·Badge·Button）。
 */
import { MoreHorizontal, Search, UserPlus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  type AdminUserRow,
  type AdminUserSearchField,
  type AdminUserStatus,
  banAdminUser,
  createAdminUser,
  fetchAdminUsers,
  revokeAdminUserSessions,
  setAdminUserRole,
  unbanAdminUser,
} from '@/api/admin';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { ROLE } from '@/auth/roles';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { PageHeader } from '@/components/console/PageHeader';
import { PAGE_SIZE } from '@/components/market/sortOptions';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/i18n/I18nProvider';

/** 档位下拉项（值 = 官方 role 名；顺序 = 由低到高） */
const ROLE_OPTIONS = [
  { value: 'user', key: 'role.user' },
  { value: 'admin', key: 'role.admin' },
  { value: 'superadmin', key: 'role.superadmin' },
] as const;

const FIELD_OPTIONS = ['username', 'name', 'email'] as const;

/** 时间显示：空 ⇒ 「从未登录」（**模块级** ⇒ 不参与 hooks 依赖表） */
const formatTime = (iso: string | null, never: string): string =>
  iso ? new Date(iso).toLocaleString() : never;

/** 字段 ⇒ i18n 键（字面量映射 —— i18n 键为字面量联合类型，动态拼接不参与类型推断） */
const FIELD_LABEL_KEY = {
  username: 'field.username',
  name: 'field.name',
  email: 'field.email',
} as const;

export default function AdminUsers() {
  const { t, tErr } = useI18n();
  const { role: myRole, myUserId } = useAuthRole();
  const canGovern = (myRole ?? 0) >= ROLE.SUPER_ADMIN;

  // ── 筛选态（q/field 与 role/status 互斥 —— F294）──
  const [field, setField] = useState<AdminUserSearchField>('username');
  const [draftQ, setDraftQ] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | ''>('');
  const [offset, setOffset] = useState(0);

  /** 列表版本号：变更动作后自增 ⇒ `useApi` deps 变 ⇒ 替换式重取 */
  const [listVersion, setListVersion] = useState(0);
  const refreshList = () => setListVersion((v) => v + 1);

  /** 打开「改角色」对话框（`useCallback` + **前置声明** ⇒ 可安全进 `columns` 依赖表，避 TDZ） */
  const openRole = useCallback((u: AdminUserRow) => {
    setRoleTarget(u);
    setRoleDraft(u.role ?? 'user');
  }, []);

  const usernameSearching = q !== '' && field === 'username';

  const loader = useCallback(
    (signal: AbortSignal) =>
      fetchAdminUsers(
        {
          limit: PAGE_SIZE,
          offset,
          ...(q ? { q, field } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        { signal },
      ),
    [offset, q, field, roleFilter, statusFilter],
  );
  const { data, error, loading } = useApi(loader, [loader, listVersion]);
  const rows: AdminUserRow[] = data?.items ?? [];
  const total = data?.total ?? 0;

  // ── 对话框态 ──
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [roleDraft, setRoleDraft] = useState<string>('user');
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUserRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminUserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState({
    username: '',
    name: '',
    email: '',
    role: 'user',
    password: '',
  });
  const [busy, setBusy] = useState(false);

  const onError = (err: unknown) =>
    toast.error(tErr(err instanceof ApiError ? err.code : 'network'));

  const columns = useMemo(
    () => [
      {
        accessorKey: 'username',
        header: t('users', 'col.account'),
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="font-mono text-xs">{row.original.username ?? '—'}</span>
        ),
      },
      { accessorKey: 'name', header: t('users', 'col.name') },
      {
        accessorKey: 'email',
        header: t('users', 'col.email'),
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-muted-foreground">{row.original.email ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: t('users', 'col.role'),
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const key = ROLE_OPTIONS.find((o) => o.value === row.original.role)?.key;
          return <span>{key ? t('users', key) : (row.original.role ?? '—')}</span>;
        },
      },
      {
        accessorKey: 'banned',
        header: t('users', 'col.status'),
        cell: ({ row }: { row: { original: AdminUserRow } }) =>
          row.original.banned ? (
            <Badge variant="destructive">{t('users', 'status.banned')}</Badge>
          ) : (
            <Badge variant="secondary">{t('users', 'status.active')}</Badge>
          ),
      },
      {
        accessorKey: 'lastLoginAt',
        header: t('users', 'col.lastLogin'),
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-muted-foreground">
            {formatTime(row.original.lastLoginAt, t('users', 'neverLoggedIn'))}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('users', 'col.actions'),
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const u = row.original;
          const isSelf = u.userId === myUserId;
          const isLastSuper = u.role === 'superadmin';
          if (!canGovern) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" aria-label={t('users', 'col.actions')}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={isSelf || isLastSuper} onSelect={() => openRole(u)}>
                  {t('users', 'action.role')}
                </DropdownMenuItem>
                {u.banned ? (
                  <DropdownMenuItem onSelect={() => setUnbanTarget(u)}>
                    {t('users', 'action.unban')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={isSelf || isLastSuper}
                    onSelect={() => setBanTarget(u)}
                  >
                    {t('users', 'action.ban')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setRevokeTarget(u)}>
                  {t('users', 'action.revoke')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canGovern, myUserId, t, openRole],
  );

  const submitRole = async () => {
    if (!roleTarget || !roleDraft) return;
    setBusy(true);
    try {
      await setAdminUserRole(roleTarget.userId, roleDraft);
      toast.success(t('users', 'toast.roleChanged'));
      setRoleTarget(null);
      refreshList();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitBan = async (reason?: string) => {
    if (!banTarget) return;
    setBusy(true);
    try {
      await banAdminUser(banTarget.userId, reason ? { reason } : {});
      toast.success(t('users', 'toast.banned'));
      setBanTarget(null);
      refreshList();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitUnban = async () => {
    if (!unbanTarget) return;
    setBusy(true);
    try {
      await unbanAdminUser(unbanTarget.userId);
      toast.success(t('users', 'toast.unbanned'));
      setUnbanTarget(null);
      refreshList();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitRevoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await revokeAdminUserSessions(revokeTarget.userId);
      toast.success(t('users', 'toast.revoked'));
      setRevokeTarget(null);
      refreshList();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async () => {
    setBusy(true);
    try {
      await createAdminUser(create);
      toast.success(t('users', 'toast.created', { username: create.username }));
      setCreateOpen(false);
      setCreate({ username: '', name: '', email: '', role: 'user', password: '' });
      refreshList();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const resetFilters = () => {
    setField('username');
    setDraftQ('');
    setQ('');
    setRoleFilter('');
    setStatusFilter('');
    setOffset(0);
  };

  const applySearch = () => {
    setQ(draftQ.trim());
    setOffset(0);
  };

  return (
    <div className="p-6">
      <PageHeader
        title={t('users', 'title')}
        description={t('users', 'desc')}
        actions={
          canGovern ? (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 size-4" />
              {t('users', 'create.title')}
            </Button>
          ) : null
        }
      />

      {!canGovern ? (
        <p className="mb-3 text-xs text-muted-foreground">{t('users', 'roleAdminOnlyHint')}</p>
      ) : null}

      {/* ── 筛选行（F294 互斥规则就地体现）── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={field} onValueChange={(v) => setField(v as AdminUserSearchField)}>
          <SelectTrigger className="w-[130px]" aria-label={t('users', 'searchField')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map((f) => (
              <SelectItem key={f} value={f}>
                {t('users', FIELD_LABEL_KEY[f])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="w-[220px]"
          value={draftQ}
          placeholder={t('users', 'keyword')}
          onChange={(e) => setDraftQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
        />
        <Button size="sm" variant="secondary" onClick={applySearch}>
          <Search className="mr-1 size-4" />
          {t('users', 'keyword')}
        </Button>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setOffset(0);
          }}
        >
          <SelectTrigger
            className="w-[150px]"
            disabled={usernameSearching}
            aria-label={t('users', 'role')}
          >
            <SelectValue placeholder={t('users', 'role.all')} />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t('users', o.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as AdminUserStatus | '');
            setOffset(0);
          }}
        >
          <SelectTrigger
            className="w-[140px]"
            disabled={usernameSearching}
            aria-label={t('users', 'status')}
          >
            <SelectValue placeholder={t('users', 'status.all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t('users', 'status.active')}</SelectItem>
            <SelectItem value="banned">{t('users', 'status.banned')}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={resetFilters}>
          {t('users', 'reset')}
        </Button>
      </div>
      {usernameSearching ? (
        <p className="mb-2 text-xs text-muted-foreground">{t('users', 'mutualHint')}</p>
      ) : null}

      <DataTable<AdminUserRow>
        columns={columns}
        data={rows}
        getRowId={(r) => r.userId}
        loading={loading}
        error={error}
        onRetry={refreshList}
        emptyMessage={error ? tErr(error.code) : t('admin', 'empty')}
        tableClassName="table-fixed"
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t('users', 'total', { n: total })}</span>
        <Pagination total={total} limit={PAGE_SIZE} offset={offset} onPageChange={setOffset} />
      </div>

      {/* ── 改角色 ── */}
      <Dialog open={roleTarget !== null} onOpenChange={(o) => (o ? null : setRoleTarget(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users', 'confirm.roleTitle')}</DialogTitle>
            <DialogDescription>
              {t('users', 'confirm.roleDesc', {
                name: roleTarget?.name ?? roleTarget?.username ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <Select value={roleDraft} onValueChange={setRoleDraft}>
            <SelectTrigger aria-label={t('users', 'role')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t('users', o.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoleTarget(null)}>
              {t('common', 'cancel')}
            </Button>
            <Button disabled={busy} onClick={submitRole}>
              {t('common', 'save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 停用（原因可选）─ 启用 ─ 强制登出 ── */}
      <ConfirmDialog
        open={banTarget !== null}
        onOpenChange={(o) => (o ? null : setBanTarget(null))}
        title={t('users', 'confirm.banTitle')}
        description={t('users', 'confirm.banDesc')}
        confirmLabel={t('users', 'action.ban')}
        cancelLabel={t('common', 'cancel')}
        reason="optional"
        reasonLabel={t('users', 'banReasonLabel')}
        reasonPlaceholder={t('users', 'banReasonPlaceholder')}
        onConfirm={submitBan}
      />
      <ConfirmDialog
        open={unbanTarget !== null}
        onOpenChange={(o) => (o ? null : setUnbanTarget(null))}
        title={t('users', 'confirm.unbanTitle')}
        description={t('users', 'confirm.unbanDesc', {
          name: unbanTarget?.name ?? unbanTarget?.username ?? '',
        })}
        confirmLabel={t('users', 'action.unban')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        onConfirm={submitUnban}
      />
      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(o) => (o ? null : setRevokeTarget(null))}
        title={t('users', 'confirm.revokeTitle')}
        description={t('users', 'confirm.revokeDesc', {
          name: revokeTarget?.name ?? revokeTarget?.username ?? '',
        })}
        confirmLabel={t('users', 'action.revoke')}
        cancelLabel={t('common', 'cancel')}
        onConfirm={submitRevoke}
      />

      {/* ── 建号 ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users', 'create.title')}</DialogTitle>
            <DialogDescription>{t('users', 'create.desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="nu-username">{t('users', 'create.username')}</Label>
              <Input
                id="nu-username"
                value={create.username}
                onChange={(e) => setCreate({ ...create, username: e.target.value })}
              />
              <span className="text-xs text-muted-foreground">
                {t('users', 'create.usernameHint')}
              </span>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="nu-name">{t('users', 'create.name')}</Label>
              <Input
                id="nu-name"
                value={create.name}
                onChange={(e) => setCreate({ ...create, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="nu-email">{t('users', 'create.email')}</Label>
              <Input
                id="nu-email"
                type="email"
                value={create.email}
                onChange={(e) => setCreate({ ...create, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label>{t('users', 'create.role')}</Label>
              <Select value={create.role} onValueChange={(v) => setCreate({ ...create, role: v })}>
                <SelectTrigger aria-label={t('users', 'create.role')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t('users', o.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="nu-password">{t('users', 'create.password')}</Label>
              <Input
                id="nu-password"
                type="password"
                value={create.password}
                onChange={(e) => setCreate({ ...create, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common', 'cancel')}
            </Button>
            <Button disabled={busy} onClick={submitCreate}>
              {t('users', 'create.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 当前登录档位 + 本人 id（薄封装：只取本页用到的两项） */
function useAuthRole(): { role: number | null; myUserId: string | null } {
  const { role, user } = useAuth();
  return { role, myUserId: user?.id ?? null };
}
