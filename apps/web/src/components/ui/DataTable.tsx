import { flexRender } from '@tanstack/react-table';
import {
  getCoreRowModel,
  type LegacyColumnDef,
  useLegacyTable,
} from '@tanstack/react-table/legacy';
import { cn } from 'cn';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/shadcn/empty';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import type { ApiError } from '../../api/client.js';
import { ErrorState } from './ErrorState.js';
import { SkeletonLoader } from './SkeletonLoader.js';

/**
 * 与 TanStack v9 `RowData`（`Record<string, any> | Array<any>`）**结构等价**的行类型约束。
 *
 * 本地声明而非 `import type { RowData } from '@tanstack/table-core'`：`table-core` 是
 * `@tanstack/react-table` 的**传递依赖**（未声明进 `apps/web/package.json`），直接 import 会形成
 * 隐藏依赖。此处只需约束能力，不需要该包本身 ⇒ 用等价结构类型。
 */
type RowDataLike = Record<string, unknown> | unknown[];

/** 排序方向（与 `useMarketQuery` / 服务端 `ASSET_SORT_DIRS` 同值域） */
export type SortDir = 'asc' | 'desc';

/**
 * 列级 UI 约定（`columnDef.meta` 的本地类型；**不 import 传递依赖 table-core**）。
 *
 * 类型实证（跨批 design §2.3）：`LegacyColumnDef['meta']` 的解析类型是**空接口** `ColumnMeta<…>`
 * ⇒ 写自定义键编译通过、读自定义键需一次本地断言（件内单点 `as ColumnUiMeta | undefined`）。
 */
export type ColumnUiMeta = {
  /** `th` 附加类：列宽（`w-[24%]`）· 对齐（`text-right`） */
  headClassName?: string;
  /** `td` 附加类：对齐 · `whitespace-normal` · `text-muted-foreground` */
  cellClassName?: string;
  /** 该列可点排序（缺省 false） */
  sortable?: boolean;
  /** 该列**固有方向**（`sorting.dir` 缺省时用于图标与 `aria-sort` 真值）· 缺省 `desc` */
  naturalDir?: SortDir;
  /** 该列的排序**档位**（服务端白名单值）；缺省取列 `id`（design §5 D5） */
  sortKey?: string;
  /** 该列是否参与列开关（design §2.8）；缺省 `true`。保护列写 `false` */
  hidable?: boolean;
};

/** 排序头能力（design §2.4）：URL 驱动 · 件内**不自持**排序状态 */
export type TableSortingProps = {
  /** 当前排序**档位**（= 列 `meta.sortKey` ?? 列 `id`）· 缺省 = 未排序 */
  key?: string;
  /** 方向覆盖；缺省 = 该列 `meta.naturalDir` ?? `'desc'` */
  dir?: SortDir;
  /** 点击回调：`nextDir` = 应用后的方向。调用方只负责落 URL —— 件内不留状态 */
  onChange: (key: string, nextDir: SortDir) => void;
};

/** 行选择列的无障碍名（`enableRowSelection` 时必填 —— 件内无可读文案来源，i18n 由调用方传入） */
export type SelectionLabels = {
  /** 每行选择框的无障碍名 */
  row: string;
  /** 表头全选框的无障碍名 */
  all: string;
};

/** 载态骨架行槽位名（`noArrayIndexKey` 规则：禁数组下标做 key ⇒ 常量槽位表按需切片） */
const SKELETON_ROW_SLOTS = [
  'sk0',
  'sk1',
  'sk2',
  'sk3',
  'sk4',
  'sk5',
  'sk6',
  'sk7',
  'sk8',
  'sk9',
  'sk10',
  'sk11',
];

/** 取前 n 个骨架行槽位名（n 超出表长时用「表长 + 序号」补齐，保持唯一） */
function skeletonRowKeys(n: number): string[] {
  if (n <= SKELETON_ROW_SLOTS.length) return SKELETON_ROW_SLOTS.slice(0, n);
  return [
    ...SKELETON_ROW_SLOTS,
    ...Array.from({ length: n - SKELETON_ROW_SLOTS.length }, (_, i) => `sk-x${i}`),
  ];
}

/** TanStack 受控 updater 归一（`value | (old) => value` ⇒ 值；件内不自持状态） */
function resolveUpdater<T>(updater: T | ((old: T) => T), old: T): T {
  return typeof updater === 'function' ? (updater as (prev: T) => T)(old) : updater;
}

/**
 * 行选择列（design §2.8 V4）：`enableRowSelection` 时**首列插入**官方 `Checkbox`，
 * 表头 = 全选（半选态走官方件的 `indeterminate`）。**不挂任何页面**（V5）⇒ 由单测 / 探针验证。
 */
function selectionColumn<TData extends RowDataLike>(
  labels?: SelectionLabels,
): LegacyColumnDef<TData, unknown> {
  return {
    id: '__select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllRowsSelected()
            ? true
            : table.getIsSomeRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(value) => table.toggleAllRowsSelected(value === true)}
        aria-label={labels?.all}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(value === true)}
        aria-label={labels?.row}
      />
    ),
    meta: { headClassName: 'w-10', cellClassName: 'w-10' } satisfies ColumnUiMeta,
  };
}

/**
 * 表格族**统一件**（跨批 design `2026-09-21-table-family-alignment-design.md` v1.11 §2 = 规格 SSOT）。
 *
 * 官方 `Table` 全族 + `@tanstack/react-table`（列定义驱动）+ 空/载/错三态 + 行内动作槽 +
 * **排序头能力**（URL 驱动）+ 两项**预置能力**（列开关 / 行选择）。门户 preset 与控制台三页
 * 消费同一件 ⇒ 排序语义只写一次（design §2.4）。
 *
 * **零外观覆盖纪律（design §2.7）**：件内 className 的唯一外观写入 = `density='comfortable'`
 * 的 `py-4`（纵向行距）；表头高 40（官方 `TableHead` 自带 `h-10`）· 单元格 `p-2`（官方自带）·
 * 底纹 / 边框 / 字阶**一律不覆盖**。列宽与对齐走调用方 `meta.headClassName` / `meta.cellClassName`
 * —— 那是 preset 的本地布局，不是件的外观覆盖。
 *
 * **默认值不变式（design §2.2）**：`density='default'` ∧ `loadingVariant='replace'` ∧ 不传
 * `sorting` / `tableClassName` / `rowProps` / 两项预置能力 ⇒ **逐字节等价于迁移前的
 * `console/DataTable`**（控制台三页零变化）。
 *
 * **TanStack 版本说明（执行期说明，登记）**：本仓装的是 `@tanstack/react-table@9.2.4`，其**原生
 * API 已改为特性注册式**（`useTable` + `coreRowModel`/`rowSortingFeature` 等特性对象，且特性来自
 * 传递依赖 `@tanstack/table-core` —— 直接用会引入**未声明依赖**）。故采用 v9 **官方 `/legacy`
 * 子路径**（`useLegacyTable` + `getCoreRowModel`）：与官方 shadcn data-table recipe（v8 形态）
 * 一一对应、不新增依赖；`flexRender` 由主入口导出（同一渲染器）。
 *
 * 三态：载态 `SkeletonLoader variant="table"`（官方 `Skeleton` 组合）· 空态官方 `Empty` ·
 * 错态复用 `ErrorState`（官方 `Alert`）。
 */
export function DataTable<TData extends RowDataLike>({
  columns,
  data,
  getRowId,
  loading = false,
  loadingVariant = 'replace',
  error = null,
  onRetry,
  emptyMessage,
  skeletonRows = 5,
  density = 'default',
  tableClassName,
  rowProps,
  sorting,
  rowActions,
  rowActionsLabel,
  rowActionsHeader,
  columnVisibility,
  onColumnVisibilityChange,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  selectionLabels,
}: {
  /** 列定义（TanStack `LegacyColumnDef`——`accessorKey`/`header`/`cell` 与官方 recipe 同形） */
  columns: Array<LegacyColumnDef<TData, unknown>>;
  data: readonly TData[];
  /** 稳定行 key（缺省由 TanStack 生成索引 key——有 id 字段时务必传入） */
  getRowId?: (row: TData) => string;
  loading?: boolean;
  /**
   * 载态形态：`replace` = 整表换骨架（控制台现状）｜ `keepHeader` = 保留表头 + N 行骨架
   * （门户现状 —— 载态表头与真表**同形**，含排序钮）。
   */
  loadingVariant?: 'replace' | 'keepHeader';
  error?: ApiError | null;
  onRetry?: () => void;
  /** 空态文案（i18n 由调用方传入） */
  emptyMessage: string;
  skeletonRows?: number;
  /** 单元格纵向内距：`default` = 官方 `p-2` ｜ `comfortable` = 纵向覆写 `py-4`（横向仍官方） */
  density?: 'default' | 'comfortable';
  /**
   * 落在外层 `<table>` 的**布局类**（如 `table-fixed`）。
   *
   * ⚠️ **纪律（design §2.1）**：该口**只准放布局类** —— 件内不解析列宽、不提供列宽 prop；
   * 列宽归 preset 本地布局（`meta.headClassName`）。
   */
  tableClassName?: string;
  /** 行级属性/类透传（门户挂 `data-asset-row` 作 dogfood 稳定锚点） */
  rowProps?: (row: TData) => ComponentProps<'tr'>;
  /** 排序头能力（design §2.4）；不传 ⇒ 全部表头**纯文本**（= 控制台现状形态） */
  sorting?: TableSortingProps;
  /** 行内动作槽：给定则**追加一列**（`rowActionsHeader` 缺省时表头留空 + `sr-only` 标签） */
  rowActions?: (row: TData) => ReactNode;
  /** 动作列的无障碍表头名（`rowActions` 存在时必填） */
  rowActionsLabel?: string;
  /**
   * 动作列的**可见**表头文案（缺省 `undefined` ⇒ 维持「表头留空 + `sr-only`」既有形态 ——
   * 加性可选 prop，不传零行为变化；三页统一为可见「操作」表头）。
   */
  rowActionsHeader?: string;
  /** **列开关**（design §2.8 · 受控）：不传 ⇒ 不改变可见列（= 现状）；开关**入口由页面渲染**（V1） */
  columnVisibility?: Record<string, boolean>;
  /** 列开关回调（**受控**，件内不自持状态）。本件不渲染开关入口 ⇒ 只作受控契约存在 */
  onColumnVisibilityChange?: (next: Record<string, boolean>) => void;
  /** **行选择**（design §2.8）：不写 ⇒ 不渲染选择列（= 现状） */
  enableRowSelection?: boolean;
  /** 选中行集合（**受控**，键 = `getRowId`） */
  rowSelection?: Record<string, boolean>;
  /** 行选择回调（**受控**） */
  onRowSelectionChange?: (next: Record<string, boolean>) => void;
  /** 选择列无障碍名（`enableRowSelection` 时必填 —— 件内无可读文案来源） */
  selectionLabels?: SelectionLabels;
}) {
  const selectable = enableRowSelection === true;
  const tableColumns: Array<LegacyColumnDef<TData, unknown>> = selectable
    ? [selectionColumn<TData>(selectionLabels), ...columns]
    : columns;

  // 受控状态按「传了才带」（缺省 ⇒ TanStack 自持 ⇒ 与迁移前行为一致）
  const state: Record<string, unknown> = {};
  if (columnVisibility) state.columnVisibility = columnVisibility;
  if (rowSelection) state.rowSelection = rowSelection;

  const table = useLegacyTable({
    data: data as TData[],
    columns: tableColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: selectable,
    ...(Object.keys(state).length > 0 ? { state } : {}),
    ...(onColumnVisibilityChange
      ? {
          onColumnVisibilityChange: (updater: unknown) =>
            onColumnVisibilityChange(
              resolveUpdater(updater as Record<string, boolean>, columnVisibility ?? {}),
            ),
        }
      : {}),
    ...(onRowSelectionChange
      ? {
          onRowSelectionChange: (updater: unknown) =>
            onRowSelectionChange(
              resolveUpdater(updater as Record<string, boolean>, rowSelection ?? {}),
            ),
        }
      : {}),
  });

  // 可见列数（Q3 裁定：载态骨架两形态都按**可见列数**，防「关掉的列又被骨架冒出来」）
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const cellPad = density === 'comfortable' ? 'py-4' : undefined;

  if (loading && loadingVariant === 'replace') {
    return <SkeletonLoader variant="table" rows={skeletonRows} columns={visibleColumnCount} />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!loading && data.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table className={tableClassName}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                // 非可点列**不写** `aria-sort`（design §2.4 S3）；可点列非当前档位恒 `none`
                {...(sorting && header.isPlaceholder === false
                  ? headerAriaSort(header, sorting)
                  : {})}
                className={cn(columnMeta(header)?.headClassName)}
              >
                {header.isPlaceholder
                  ? null
                  : renderHeaderCell(header, sorting, columnMeta(header))}
              </TableHead>
            ))}
            {rowActions ? (
              <TableHead className="text-right">
                {rowActionsHeader ?? <span className="sr-only">{rowActionsLabel}</span>}
              </TableHead>
            ) : null}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {loading
          ? skeletonRowKeys(skeletonRows).map((slot) => (
              <TableRow key={slot}>
                <TableCell colSpan={visibleColumnCount + (rowActions ? 1 : 0)} className={cellPad}>
                  <Skeleton className="h-5 w-full rounded-md" />
                </TableCell>
              </TableRow>
            ))
          : table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} {...rowProps?.(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn(cellPad, columnMeta(cell)?.cellClassName)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                {rowActions ? (
                  <TableCell className={cn('text-right', cellPad)}>
                    {rowActions(row.original)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

/** 列 `meta` 读取单点（design §2.3：`ColumnMeta` 是空接口 ⇒ 一次本地断言） */
function columnMeta(container: {
  column: { columnDef: { meta?: unknown } };
}): ColumnUiMeta | undefined {
  return container.column.columnDef.meta as ColumnUiMeta | undefined;
}

/** 当前列排序档位（= `meta.sortKey` ?? 列 `id` —— design §2.4 S7） */
function sortKeyOf(container: { column: { id: string; columnDef: { meta?: unknown } } }): string {
  return columnMeta(container)?.sortKey ?? container.column.id;
}

/** `th[aria-sort]`（S3）：当前档位列 `ascending`/`descending` ｜ 非当前可点列 `none` */
function headerAriaSort(
  header: {
    column: { id: string; columnDef: { meta?: unknown } };
  },
  sorting: TableSortingProps,
): { 'aria-sort': 'none' | 'ascending' | 'descending' } | Record<string, never> {
  if (columnMeta(header)?.sortable !== true) return {};
  const active = sorting.key === sortKeyOf(header);
  if (!active) return { 'aria-sort': 'none' };
  const effective = effectiveDir(header, sorting);
  return { 'aria-sort': effective === 'asc' ? 'ascending' : 'descending' };
}

/** 有效方向（S4）：`sorting.dir ?? meta.naturalDir ?? 'desc'` */
function effectiveDir(
  header: { column: { id: string; columnDef: { meta?: unknown } } },
  sorting: TableSortingProps,
): SortDir {
  return sorting.dir ?? columnMeta(header)?.naturalDir ?? 'desc';
}

/**
 * 表头单元格内容（S1/S2/S5）：可点列 = 官方 `Button variant="ghost" size="sm"` 包住**列名 + 方向
 * 图标**（lucide `ArrowUpDown` 未排 / `ArrowUp` 升 / `ArrowDown` 降，`aria-hidden`）；其余 = 纯文本。
 *
 * **点击语义（两态 · 现状逐字保留）**：首点某列（未排 / 异列）⇒ `desc`；点同列 ⇒ 反向。
 */
function renderHeaderCell(
  header: {
    isPlaceholder?: boolean;
    column: { id: string; columnDef: { header?: unknown; meta?: unknown } };
    getContext: () => unknown;
  },
  sorting: TableSortingProps | undefined,
  meta: ColumnUiMeta | undefined,
): ReactNode {
  const columnDef = header.column.columnDef as LegacyColumnDef<RowDataLike, unknown>;
  const label = flexRender(columnDef.header, header.getContext() as never);
  if (!sorting || meta?.sortable !== true) return label;
  const key = meta.sortKey ?? header.column.id;
  const active = sorting.key === key;
  const effective = active ? effectiveDir(header, sorting) : undefined;
  const Icon = active ? (effective === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => sorting.onChange(key, active && effective === 'desc' ? 'asc' : 'desc')}
    >
      {label}
      <Icon aria-hidden />
    </Button>
  );
}
