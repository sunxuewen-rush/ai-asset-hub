import {
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Pagination as PaginationRoot,
} from '@/components/ui/shadcn/pagination';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 分页（`‹ Previous | 1 / 25 · 每页 20 | Next ›`）
 *
 * offset 替换式（design §7：列表查询 offset 语义；页码 = floor(offset/limit)+1）。
 *
 * 归位（本批 §3.11）：结构走官方 `Pagination`（`nav`）· `PaginationContent`（`ul`）·
 * `PaginationItem`（`li`）；两端控件走官方 **`PaginationPrevious`/`PaginationNext`**（= `PaginationLink`
 * + chevron 图标）。**`offset` 语义零变更**：翻页值换算 · 竞态 abort（上游 `useMarketQuery`/`useApi`）·
 * 末页判定 · 页码文本（i18n `common.pageOf`）全部沿用（M4a T11 口径复验）。
 *
 * ⚠ **执行期说明（用户 2026-09-14 拍板 (c)「严格用官方」，两条代价已登记）**：
 * 1. **英文标签硬编码**：官方 `PaginationPrevious`/`Next` 内部写死 `<span>Previous/Next</span>` 与英文
 *    `aria-label="Go to previous/next page"`，**children 无法覆盖**（组件内字面 children 优先）⇒ 中文界面
 *    显示英文，`common.prev`/`common.next` 两键随之失去消费点（同批删除）。与 07《UI 语言与本地化》的
 *    双语要求冲突 —— 属**已知并接受的偏离**。
 * 2. **键盘不可达**：`PaginationLink` 渲染 `<a>` 且不接受 `asChild`；无 `href` 的 `<a>` 不进入 Tab 序列
 *    （实测 `focus()` 不生效）⇒ 翻页控件**鼠标可点、键盘不可达**。本批 a11y 债清理范围外新增一笔，登记。
 *
 * 末页判定：锚点无 `disabled` 属性 → 以 `aria-disabled` + 不挂 `onClick` + `pointer-events-none opacity-50`
 * 表达（官方件无 disabled variant，故该 `className` 属外观覆盖**例外**，理由：锚点无法用原生 disabled，
 * 不给出视觉线索会让「禁用」不可见）。尺寸随官方 `size="default"`（h-9，原 Button `sm` 为 h-8）。
 */
export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
}: {
  total: number;
  limit: number;
  offset: number;
  /** 目标 offset 回调（页码由组件换算） */
  onPageChange: (nextOffset: number) => void;
}) {
  const { t } = useI18n();
  if (total <= 0) return null;
  const pageSize = limit > 0 ? limit : 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.floor(offset / pageSize) + 1;
  const clamped = Math.min(current, pages);
  const atFirst = clamped <= 1;
  const atLast = clamped >= pages;
  return (
    <PaginationRoot className="pt-[18px] pb-1">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={atFirst}
            className={atFirst ? 'pointer-events-none opacity-50' : undefined}
            onClick={atFirst ? undefined : () => onPageChange((clamped - 2) * pageSize)}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-1 text-xs font-semibold text-muted-foreground">
            {t('common', 'pageOf', { n: clamped, total: pages, size: pageSize })}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            aria-disabled={atLast}
            className={atLast ? 'pointer-events-none opacity-50' : undefined}
            onClick={atLast ? undefined : () => onPageChange(clamped * pageSize)}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
