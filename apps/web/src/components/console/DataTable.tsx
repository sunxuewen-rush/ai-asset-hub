import { flexRender } from '@tanstack/react-table';
import {
  getCoreRowModel,
  type LegacyColumnDef,
  useLegacyTable,
} from '@tanstack/react-table/legacy';
import type { ReactNode } from 'react';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/shadcn/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import type { ApiError } from '../../api/client.js';
import { ErrorState } from '../ui/ErrorState.js';
import { SkeletonLoader } from '../ui/SkeletonLoader.js';

/**
 * 与 TanStack v9 `RowData`（`Record<string, any> | Array<any>`）**结构等价**的行类型约束。
 *
 * 本地声明而非 `import type { RowData } from '@tanstack/table-core'`：`table-core` 是
 * `@tanstack/react-table` 的**传递依赖**（未声明进 `apps/web/package.json`），直接 import 会形成
 * 隐藏依赖。此处只需约束能力，不需要该包本身 ⇒ 用等价结构类型。
 */
type RowDataLike = Record<string, unknown> | unknown[];

/**
 * 通用表格（design §5.1）：官方 `Table` 全族 + `@tanstack/react-table`（列定义驱动）+ 空/载/错三态
 * + 行内动作槽。
 *
 * 规格真值（主 design §6.3 已落值）：**表头高 40**（官方 `TableHead` 自带 `h-10` = 40px，**不覆盖**）·
 * 单元格 `p-2`（官方 `TableCell` 自带）—— 两项均为官方默认，本件零 className 外观覆盖。
 *
 * **TanStack 版本说明（执行期说明，登记）**：本仓装的是 `@tanstack/react-table@9.2.4`，其**原生 API 已改为
 * 特性注册式**（`useTable` + `coreRowModel`/`rowSortingFeature` 等特性对象，且特性来自传递依赖
 * `@tanstack/table-core`——直接用会引入**未声明依赖**）。故采用 v9 **官方 `/legacy` 子路径**
 * （`useLegacyTable` + `getCoreRowModel`）：与官方 shadcn data-table recipe（v8 形态）一一对应、
 * 不新增依赖；`flexRender` 由主入口导出（同一渲染器）。
 *
 * 三态：载态 `SkeletonLoader variant="table"`（官方 `Skeleton` 组合）· 空态官方 `Empty` ·
 * 错态复用 `ErrorState`（T4 起=官方 `Alert`）。
 */
export function DataTable<TData extends RowDataLike>({
  columns,
  data,
  getRowId,
  loading = false,
  error = null,
  onRetry,
  emptyMessage,
  skeletonRows = 5,
  rowActions,
  rowActionsLabel,
}: {
  /** 列定义（TanStack `LegacyColumnDef`——`accessorKey`/`header`/`cell` 与官方 recipe 同形） */
  columns: Array<LegacyColumnDef<TData, unknown>>;
  data: readonly TData[];
  /** 稳定行 key（缺省由 TanStack 生成索引 key——有 id 字段时务必传入） */
  getRowId?: (row: TData) => string;
  loading?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  /** 空态文案（i18n 由调用方传入） */
  emptyMessage: string;
  skeletonRows?: number;
  /** 行内动作槽：给定则**追加一列**（表头留空 + `sr-only` 标签），单元格右对齐 */
  rowActions?: (row: TData) => ReactNode;
  /** 动作列的无障碍表头名（`rowActions` 存在时必填） */
  rowActionsLabel?: string;
}) {
  const table = useLegacyTable({
    data: data as TData[],
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return <SkeletonLoader variant="table" rows={skeletonRows} columns={columns.length} />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (data.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
            {rowActions ? (
              <TableHead className="text-right">
                <span className="sr-only">{rowActionsLabel}</span>
              </TableHead>
            ) : null}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
            {rowActions ? (
              <TableCell className="text-right">{rowActions(row.original)}</TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
