/**
 * 用户管理页（M4c-2 **T4** 新建 · **T9 验收期增量：骨架对齐 `/admin/assets`**）。
 *
 * 依据 = 批 design `2026-10-09-m4c2-user-governance-design.md` **§14（v0.10 验收期增量）** · §4.1–§4.6（v0.10）· 主 design §7.1/§7.3/§10.2。
 *
 * 契约要点（v0.10）：
 * - **骨架 = `/admin/assets` 同构**（页头卡 + 工具条 + 折叠搜索 + 表下分页 —— §14.2 / §14.7 对齐声明）；
 * - **页头计数块 = 全站聚合**（`/api/stats.totalUsers` · 有效用户 · 载入显 `—`）—— 与工具条「**当前筛选结果**计数」
 *   **不同源不同数**（防同信息两处 · §14.2 ③/④）；
 * - **排序入口 = `ui/SortMenu` 统一件**（**与 `/admin/assets` 同一显示**：32px 纯图标钮 + radio 菜单 +
 *   tooltip · 与「列显示」「搜索」同族三连）· 与三列表头**同源**（单一 `sort`/`dir` 状态 · 服务端
 *   白名单子集 · §14.3）；**列显隐**接 `ColumnVisibilityMenu`（账号列必显 · §14.4）；
 * - **数据面 = 服务端薄端点** `/api/admin/users*`（`api/admin.ts` 已封装）—— 服务端分页（替换式）；
 * - **F294 筛选互斥**：`field=username` 与 `role`/`status` 互斥（服务端 400）⇒ 本页禁用互斥控件并提示；
 * - **护栏两侧**：本人行 / 唯一超管行禁用危险动作；服务端仍是权威（403 中文码）；**F301 甲（v0.10）**：
 *   行标记「本人 / 唯一超管」在**角色列**可见（= 被禁用控件的**可见理由**）· 封禁确认框补**「到期（天）」可选输入**
 *   （留空 = 永久 · 换算秒传服务端 `expiresIn` —— 服务端与 2 个 i18n 键**早已就绪** ⇒ 本次仅补齐 UI 接线）；
 * - **档位**：路由门槛 = 管理档（数据面 `user:['list']`）；治理动作 = 超管 ⇒ 管理档进页为**只读视图**；
 * - **视觉零新值**：全部复用既有件（批 design §4.2 四层账 · 数值登记 M4a design §4.4 v0.46）。
 */
import { MoreHorizontal, Plus, Search, Users, X } from 'lucide-react';
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
import { fetchStats } from '@/api/stats';
import { useAuth } from '@/auth/AuthProvider';
import { ROLE } from '@/auth/roles';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { formatDate } from '@/components/market/format';
import { PAGE_SIZE } from '@/components/market/sortOptions';
import { type ColumnToggleItem, ColumnVisibilityMenu } from '@/components/ui/ColumnVisibilityMenu';
import { type ColumnUiMeta, DataTable, type TableSortingProps } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { SortMenu } from '@/components/ui/SortMenu';
import { StatTile } from '@/components/ui/StatTile';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardHeader } from '@/components/ui/shadcn/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
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
import { Field, FieldLabel } from '@/components/ui/shadcn/field';
import { Input } from '@/components/ui/shadcn/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/shadcn/input-group';
import { Label } from '@/components/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Switch } from '@/components/ui/shadcn/switch';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * **列宽权重**（沿用 `AdminAssets` 的 92%/8% 纪律：数据列合计 92% · 操作槽 8%）。
 *
 * 权重值 = 本页局部视觉决策（登记于 **M4a design §4.4 v0.46**）；改动只影响本页列宽比例。
 */
const COL_WEIGHTS: Record<string, number> = {
  username: 14,
  name: 12,
  email: 24,
  role: 10,
  banned: 9,
  lastLoginAt: 15,
};
/** 数据列合计百分比（操作槽 = 余下 8%，由 `rowActions` 槽自动吸收） */
const DATA_W_TOTAL = 92;

/** 可见列的 CSS 变量表（`--cw-<columnKey>` ⇒ 百分比字符串；隐藏列后其余列**按权重摊开** —— 与 `AdminAssets` 同法） */
function useColumnVars(columnVisibility: Record<string, boolean>) {
  return useMemo(() => {
    const visible = Object.entries(COL_WEIGHTS).filter(([key]) => columnVisibility[key] !== false);
    const sum = visible.reduce((acc, [, w]) => acc + w, 0);
    const scale = DATA_W_TOTAL / sum;
    const vars: Record<string, string> = {};
    for (const [key, weight] of visible) vars[`--cw-${key}`] = `${(weight * scale).toFixed(3)}%`;
    return vars;
  }, [columnVisibility]);
}

/** 档位下拉项（值 = 官方 role 名；顺序 = 由低到高） */
const ROLE_OPTIONS = [
  { value: 'user', key: 'role.user' },
  { value: 'admin', key: 'role.admin' },
  { value: 'superadmin', key: 'role.superadmin' },
] as const;

const FIELD_OPTIONS = ['username', 'name', 'email'] as const;

/** 字段 ⇒ i18n 键（字面量映射 —— i18n 键为字面量联合类型，动态拼接不参与类型推断） */
const FIELD_LABEL_KEY = {
  username: 'field.username',
  name: 'field.name',
  email: 'field.email',
} as const;

/**
 * 排序档位（批 design **§14.3**）：默认 `createdAt` · 与**三列表头同源**（同一 `sort`/`dir` 状态）。
 * 服务端白名单另含 `role`（`admin-users.ts:144`）—— 本页不给入口（白名单属服务端能力面）。
 */
type UserSortKey = 'createdAt' | 'username' | 'name' | 'email';
/** 排序档位（顺序 = 菜单序）· 默认 `createdAt` —— 与**三列表头同源**（同一 `sort` / `dir` 状态） */
const USER_SORT_OPTIONS: readonly UserSortKey[] = ['createdAt', 'username', 'name', 'email'];
/** 档位 ⇒ i18n 键（字面量映射 · 同 `FIELD_LABEL_KEY` 范式） */
const USER_SORT_LABEL_KEY = {
  createdAt: 'sort.createdAt',
  username: 'sort.username',
  name: 'sort.name',
  email: 'sort.email',
} as const;

/** 封禁到期换算：**天 → 秒**（服务端 `expiresIn` 单位为秒 · 官方 `banExpiresIn`）—— F301 甲 */
const SECONDS_PER_DAY = 86_400;

export default function AdminUsers() {
  const { t } = useI18n();
  const { role: myRole, myUserId } = useAuthRole();
  const canGovern = (myRole ?? 0) >= ROLE.SUPER_ADMIN;

  // ── 筛选态（q/field 与 role/status 互斥 —— F294）──
  const [field, setField] = useState<AdminUserSearchField>('username');
  const [draftQ, setDraftQ] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | ''>('');
  const [offset, setOffset] = useState(0);

  // ── 排序 / 列显隐 / 折叠搜索（v0.10 新接线）──
  const [sort, setSort] = useState<UserSortKey>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [searchOpen, setSearchOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  /** 列表版本号：变更动作后自增 ⇒ `useApi` deps 变 ⇒ 替换式重取 */
  const [listVersion, setListVersion] = useState(0);
  const refreshList = () => setListVersion((v) => v + 1);

  /** 打开「改角色」对话框（`useCallback` + **前置声明** ⇒ 可安全进 `rowActions` 依赖表，避 TDZ） */
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
          sort,
          dir,
        },
        { signal },
      ),
    [offset, q, field, roleFilter, statusFilter, sort, dir],
  );
  const { data, error, loading } = useApi(loader, [loader, listVersion]);
  const rows: AdminUserRow[] = data?.items ?? [];
  const total = data?.total ?? 0;

  /** 页头计数块 = **全站聚合**（不随筛选变 · 与工具条计数不同数 —— §14.2 ③） */
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);

  // ── 对话框态 ──
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [roleDraft, setRoleDraft] = useState<string>('user');
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  /** 封禁「到期（天）」草稿（**留空 = 永久** · 提交时换算秒传服务端 `expiresIn` —— F301 甲 · §4.3） */
  const [banDays, setBanDays] = useState('');
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

  const onError = (err: unknown) => toast.error(tErrOf(err));

  const columnVars = useColumnVars(columnVisibility);
  const hiddenCount = Object.values(columnVisibility).filter((v) => v === false).length;

  const sorting: TableSortingProps = {
    key: sort,
    dir,
    onChange: (key, nextDir) => {
      setSort(key as UserSortKey);
      setDir(nextDir);
      setOffset(0);
    },
  };

  /** 列显隐菜单项（**账号列必显**；动作槽列由 `DataTable` 充当哨兵 ⇒ 不出现于菜单） */
  const columnItems: ColumnToggleItem[] = useMemo(
    () => [
      { key: 'username', label: t('users', 'col.account'), hidable: false },
      { key: 'name', label: t('users', 'col.name'), hidable: true },
      { key: 'email', label: t('users', 'col.email'), hidable: true },
      { key: 'role', label: t('users', 'col.role'), hidable: true },
      { key: 'banned', label: t('users', 'col.status'), hidable: true },
      { key: 'lastLoginAt', label: t('users', 'col.lastLogin'), hidable: true },
    ],
    [t],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: 'username',
        header: t('users', 'col.account'),
        meta: {
          headClassName: 'w-[var(--cw-username)]',
          hidable: false,
          sortable: true,
          sortKey: 'username',
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="block min-w-0 truncate font-mono text-xs">
            {row.original.username ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('users', 'col.name'),
        meta: {
          headClassName: 'w-[var(--cw-name)]',
          hidable: true,
          sortable: true,
          sortKey: 'name',
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="block min-w-0 truncate">{row.original.name || '—'}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('users', 'col.email'),
        meta: {
          headClassName: 'w-[var(--cw-email)]',
          cellClassName: 'text-muted-foreground',
          hidable: true,
          sortable: true,
          sortKey: 'email',
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const email = row.original.email;
          /* 资产页口径：单元格 `block min-w-0 truncate` + 全值进 `title`（原生悬浮） */
          /* 空值来源（M4c-3 §3.4 · P7 丙）：外部通道未给邮箱 ⇒ 服务端出参已把官方合成占位串
             （`.placeholder.invalid`）归一为 `null`（`http/admin-users.ts`）⇒ 下方 `|| '—'` 即「无邮箱」展示 */
          return (
            <span className="block min-w-0 truncate text-xs" title={email ?? ''}>
              {email || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'role',
        header: t('users', 'col.role'),
        meta: { headClassName: 'w-[var(--cw-role)]', hidable: true } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const u = row.original;
          const key = ROLE_OPTIONS.find((o) => o.value === u.role)?.key;
          /* 行标记（F301 甲 · 批 design §4.3 矩阵「本人行 / 末位超管行…标」）：
             与护栏**同一判据**（本人 / 超管）⇒ 被禁用的启停开关由此获得**可见理由**（T10 放大的 UX 洞）。 */
          const tag =
            u.userId === myUserId ? 'selfTag' : u.role === 'superadmin' ? 'lastSuperTag' : null;
          return (
            <span className="block min-w-0 truncate">
              {key ? t('users', key) : (u.role ?? '—')}
              {tag ? (
                <span className="ml-1 text-[11px] text-muted-foreground">{t('users', tag)}</span>
              ) : null}
            </span>
          );
        },
      },
      {
        accessorKey: 'banned',
        header: t('users', 'col.status'),
        meta: { headClassName: 'w-[var(--cw-banned)]', hidable: true } satisfies ColumnUiMeta,
        /* **启停列**（T10 · 批 design §14.8）：`Switch` **单一承载「状态显示 + 操作」**（列头仍复用
           `users.col.status` ⇒ 零新列键）。拨动即打开**既有确认流**（停用：可填原因；启用：直确认）；
           取消 ⇒ 开关**自动回弹** —— 受控于服务端数据（`!u.banned`）· 本列**不持本地态**。
           护栏（沿用 ⋮ 菜单旧法）：本人行 / 唯一超管行（**停用方向**）禁用 · 管理档只读 ⇒ 显 `—` · 提交中禁用。 */
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const u = row.original;
          if (!canGovern) return <span className="text-xs text-muted-foreground">—</span>;
          const enabled = !u.banned;
          const who = u.name || u.username || u.email || u.userId;
          const label = t('users', enabled ? 'toggle.ban' : 'toggle.unban', { name: who });
          /* 停用方向的两条硬护栏：不可停用自己 · 不可停用超管行（解封方向不设限 —— 与旧菜单一致） */
          const locked = busy || u.userId === myUserId || (enabled && u.role === 'superadmin');
          return (
            <Switch
              checked={enabled}
              disabled={locked}
              aria-label={label}
              title={label}
              onCheckedChange={(next) => (next ? setUnbanTarget(u) : setBanTarget(u))}
            />
          );
        },
      },
      {
        accessorKey: 'lastLoginAt',
        header: t('users', 'col.lastLogin'),
        meta: {
          headClassName: 'w-[var(--cw-lastLoginAt)]',
          cellClassName: 'text-muted-foreground tabular-nums',
          hidable: true,
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const iso = row.original.lastLoginAt;
          /* 资产页口径：表格显纯日期 · 全时间进 `title`（原生悬浮）· 空值显「从未登录」 */
          return iso ? (
            <span title={new Date(iso).toLocaleString()}>{formatDate(iso)}</span>
          ) : (
            <span>{t('users', 'neverLoggedIn')}</span>
          );
        },
      },
    ],
    [t, canGovern, myUserId, busy],
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
    /* 到期（天）：留空 = 永久；合法正整数 ⇒ 换算秒传 `expiresIn`（非法值由服务端 zod 400 兜底 ——
       `type=number min=1 step=1` 已在 UI 侧拦绝大多数） */
    const days = Number(banDays);
    const expiresIn =
      banDays.trim() !== '' && Number.isFinite(days) && days >= 1
        ? Math.floor(days) * SECONDS_PER_DAY
        : undefined;
    setBusy(true);
    try {
      await banAdminUser(banTarget.userId, {
        ...(reason ? { reason } : {}),
        ...(expiresIn ? { expiresIn } : {}),
      });
      toast.success(t('users', 'toast.banned'));
      setBanTarget(null);
      setBanDays('');
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

  return (
    /* CSS 变量挂在**表格祖先**上 ⇒ `w-[var(--cw-*)]` 在表头与单元格同时生效 */
    <div className="flex flex-col py-6" style={columnVars}>
      <div className="px-4 lg:px-6">
        {/* ① 页头卡（门户 `CenterPage` / `AdminAssets` 逐字同构：icon tile + h1 + eyebrow + 副述 + 右侧计数块） */}
        <Card className="mb-4 flex flex-row items-center gap-5 px-[26px] py-[22px]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-primary text-white">
            <Users className="size-[22px]" aria-hidden />
          </span>
          <CardHeader className="relative min-w-0 flex-1 gap-0 p-0">
            <h1 className="text-xl font-bold tracking-[-0.4px]">{t('users', 'title')}</h1>
            <span className="text-[11px] font-semibold tracking-[1px] text-muted-foreground uppercase">
              ADMIN
            </span>
            <p className="mt-1 text-[13px] text-muted-foreground">{t('users', 'desc')}</p>
          </CardHeader>
          {/* 计数块 = **全站聚合**（不随筛选变）⇒ 与工具条「当前筛选结果」计数不同数（§14.2 ③/④） */}
          <StatTile
            value={stats ? stats.totalUsers.toLocaleString() : '—'}
            label={t('board', 'kpi.users')}
          />
        </Card>

        {!canGovern ? (
          <p className="mb-3 text-xs text-muted-foreground">{t('users', 'roleAdminOnlyHint')}</p>
        ) : null}

        {/* ② 工具条（左结果计数 · 右控件群）+ 折叠搜索 —— 结构同 `AdminAssets` */}
        <Collapsible open={searchOpen} onOpenChange={setSearchOpen} className="mb-3">
          <div className="flex flex-wrap items-center gap-3 px-0.5">
            <span className="text-[13px] text-muted-foreground">
              {t('users', 'total', { n: total })}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Select
                value={roleFilter || 'ALL'}
                onValueChange={(v) => {
                  setRoleFilter(v === 'ALL' ? '' : v);
                  setOffset(0);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-[130px]"
                  disabled={usernameSearching}
                  aria-label={t('users', 'role')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('users', 'role.all')}</SelectItem>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t('users', o.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter || 'ALL'}
                onValueChange={(v) => {
                  setStatusFilter(v === 'ALL' ? '' : (v as AdminUserStatus));
                  setOffset(0);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-[120px]"
                  disabled={usernameSearching}
                  aria-label={t('users', 'status')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('users', 'status.all')}</SelectItem>
                  <SelectItem value="active">{t('users', 'status.active')}</SelectItem>
                  <SelectItem value="banned">{t('users', 'status.banned')}</SelectItem>
                </SelectContent>
              </Select>
              <ColumnVisibilityMenu
                items={columnItems}
                value={columnVisibility}
                onChange={setColumnVisibility}
                label={t('market', 'colShow')}
                labels={{ required: t('market', 'colRequired'), reset: t('market', 'colReset') }}
                badgeCount={hiddenCount}
              />
              {/* 排序入口 = `ui/SortMenu` 统一件（**与 `/admin/assets` 同一显示**：32px 图标钮 +
                  radio 菜单 + tooltip）· 与三列表头**同源**（同一 `sort` / `dir`）—— §14.3 / §14.7 */}
              <SortMenu
                value={sort}
                options={USER_SORT_OPTIONS}
                labelOf={(option) => t('users', USER_SORT_LABEL_KEY[option])}
                ariaLabel={t('market', 'sortLabel')}
                onChange={(next) => {
                  setSort(next);
                  setOffset(0);
                }}
              />
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
              {canGovern ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" aria-hidden />
                  {t('users', 'create.title')}
                </Button>
              ) : null}
            </div>
          </div>
          <CollapsibleContent>
            <div className="mt-2 flex items-center gap-2">
              <Select value={field} onValueChange={(v) => setField(v as AdminUserSearchField)}>
                <SelectTrigger
                  size="sm"
                  className="w-[130px]"
                  aria-label={t('users', 'searchField')}
                >
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
              <InputGroup className="max-w-[420px]">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setQ(draftQ.trim());
                      setOffset(0);
                    }
                  }}
                  placeholder={t('users', 'keyword')}
                  aria-label={t('users', 'keyword')}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t('market', 'searchClose')}
                    title={t('market', 'searchClose')}
                    onClick={() => {
                      setDraftQ('');
                      setQ('');
                      setSearchOpen(false);
                    }}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            {usernameSearching ? (
              <p className="mt-2 text-xs text-muted-foreground">{t('users', 'mutualHint')}</p>
            ) : null}
          </CollapsibleContent>
        </Collapsible>

        {/* ③ 表（空 / 错态独立渲染 · 载态保留表头 —— 全资产页口径） */}
        {error ? <ErrorState error={error} onRetry={refreshList} /> : null}
        {!error && !loading && rows.length === 0 ? (
          <EmptyState message={t('admin', 'empty')} />
        ) : null}
        {!error && (loading || rows.length > 0) ? (
          <DataTable<AdminUserRow>
            columns={columns}
            data={rows}
            getRowId={(r) => r.userId}
            loading={loading}
            loadingVariant="keepHeader"
            density="default"
            tableClassName="table-fixed"
            sorting={sorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            emptyMessage={t('admin', 'empty')}
            rowActions={(u: AdminUserRow) => {
              if (!canGovern) return <span className="text-xs text-muted-foreground">—</span>;
              const isSelf = u.userId === myUserId;
              const isLastSuper = u.role === 'superadmin';
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t('users', 'col.actions')}
                      title={t('users', 'col.actions')}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={isSelf || isLastSuper} onSelect={() => openRole(u)}>
                      {t('users', 'action.role')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRevokeTarget(u)}>
                      {t('users', 'action.revoke')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }}
            rowActionsHeader={t('users', 'col.actions')}
            rowActionsLabel={t('users', 'col.actions')}
          />
        ) : null}

        {/* ④ 分页：仅存在多页时渲染 + 翻页回顶（资产页口径） */}
        {total > PAGE_SIZE ? (
          <div className="mt-3">
            <Pagination
              total={total}
              limit={PAGE_SIZE}
              offset={offset}
              onPageChange={(next) => {
                setOffset(next);
                window.scrollTo({ top: 0 });
              }}
            />
          </div>
        ) : null}

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
          onOpenChange={(o) => {
            if (!o) {
              setBanTarget(null);
              setBanDays('');
            }
          }}
          title={t('users', 'confirm.banTitle')}
          description={t('users', 'confirm.banDesc')}
          confirmLabel={t('users', 'action.ban')}
          cancelLabel={t('common', 'cancel')}
          reason="optional"
          reasonLabel={t('users', 'banReasonLabel')}
          reasonPlaceholder={t('users', 'banReasonPlaceholder')}
          /* 到期（天）**可选** —— 留空 = 永久；填值 ⇒ 前端换算秒传服务端 `expiresIn`（F301 甲 · §4.3） */
          extraField={
            <Field>
              <FieldLabel htmlFor="ban-expire-days">{t('users', 'banExpireLabel')}</FieldLabel>
              <Input
                id="ban-expire-days"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={banDays}
                placeholder={t('users', 'banExpirePlaceholder')}
                onChange={(event) => setBanDays(event.target.value)}
              />
            </Field>
          }
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
                <Select
                  value={create.role}
                  onValueChange={(v) => setCreate({ ...create, role: v })}
                >
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
    </div>
  );
}

/** 网络/服务端错误码 → 本地化文案（`ApiError` 之外一律 `network`） */
function tErrOf(err: unknown): string {
  return err instanceof ApiError ? err.code : 'network';
}

/** 当前登录档位 + 本人 id（薄封装：只取本页用到的两项） */
function useAuthRole(): { role: number | null; myUserId: string | null } {
  const { role, user } = useAuth();
  return { role, myUserId: user?.id ?? null };
}
