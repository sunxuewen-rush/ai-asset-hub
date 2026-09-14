import { Skeleton } from '@/components/ui/shadcn/skeleton';

/**
 * 静态槽位名：骨架没有业务 id 可做 key（`noArrayIndexKey` 禁数组下标做 key）⇒ 用常量槽位表按需切片。
 * 上限 12（表格骨架 12 行/列以内覆盖，超出时回落到最后一批槽位名）。
 */
const ROW_SLOTS = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11'];
const CELL_SLOTS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'];

/** 取前 n 个槽位名（n 超出表长时用「表长 + 序号」补齐，保持唯一） */
function slots(prefix: string, base: readonly string[], n: number): string[] {
  if (n <= base.length) return base.slice(0, n) as string[];
  return [...base, ...Array.from({ length: n - base.length }, (_, i) => `${prefix}-x${i}`)];
}

/**
 * 载态骨架预设（design §5.2：表格 / 详情两类）。
 *
 * 色值/动效全走官方 `Skeleton`（`animate-pulse bg-accent`，**不逐点覆盖颜色**——design §3.10）；
 * 这里只组合**布局**（行数 / 列宽 / 块高 = 布局类，官方允许用 className 表达）。
 */
export function SkeletonLoader({
  variant,
  rows = 5,
  columns = 4,
}: {
  variant: 'table' | 'detail';
  /** variant=table：骨架行数（默认 5） */
  rows?: number;
  /** variant=table：骨架列数（默认 4） */
  columns?: number;
}) {
  if (variant === 'table') {
    return (
      <div className="flex flex-col gap-2 py-1">
        {slots('row', ROW_SLOTS, rows).map((rowKey) => (
          <div key={rowKey} className="flex items-center gap-3">
            {slots('cell', CELL_SLOTS, columns).map((cellKey, colIndex) => (
              <Skeleton
                key={`${rowKey}-${cellKey}`}
                className={colIndex === 0 ? 'h-4 flex-1' : 'h-4 w-20'}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 py-1">
      <Skeleton className="h-6 w-[45%]" />
      <Skeleton className="h-4 w-[92%]" />
      <Skeleton className="h-4 w-[86%]" />
      <Skeleton className="h-4 w-[64%]" />
      <Skeleton className="mt-2 h-[120px] w-full rounded-xl" />
    </div>
  );
}
