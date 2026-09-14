import { Button } from '@/components/ui/shadcn/button';
import {
  PaginationContent,
  PaginationItem,
  Pagination as PaginationRoot,
} from '@/components/ui/shadcn/pagination';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 分页（demo .pager：‹ 上一页 | 1 / 25 · 每页 20 | 下一页 ›）
 *
 * offset 替换式（design §7：列表查询 offset 语义；页码 = floor(offset/limit)+1）。
 *
 * 归位（本批 §3.11）：结构走官方 `Pagination`（`nav`）· `PaginationContent`（`ul`）·
 * `PaginationItem`（`li`）——官方 `nav` 自带 `mx-auto flex w-full justify-center`（居中；实测与
 * 归位前 `justify-center` 真值一致）。**`offset` 语义零变更**：翻页值换算 · 竞态 abort（上游
 * `useMarketQuery`/`useApi`）· 末页判定（`clamped >= pages`）· 页码文本（i18n `common.pageOf`）
 * 全部沿用（M4a T11 口径复验）。
 *
 * 执行期说明（登记）：**未用官方 `PaginationLink`/`PaginationPrevious`/`PaginationNext`** ——
 * 官方版渲染为 `<a>` 且**不提供 `asChild`**；无 `href` 的 `<a>` 不可键盘聚焦（a11y 回退），而 SPA
 * 分页为状态驱动（无逐页 URL）。故控件用**官方 `Button`**（与 `PaginationLink` 内部同一
 * `buttonVariants` 语义），外层仍是官方 `li` ⇒ 结构官方化 + 零 `href` 泄漏 + 键盘可用。
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
  return (
    <PaginationRoot className="pt-[18px] pb-1">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={clamped <= 1}
            onClick={() => onPageChange((clamped - 2) * pageSize)}
          >
            {t('common', 'prev')}
          </Button>
        </PaginationItem>
        <PaginationItem>
          <span className="px-1 text-xs font-semibold text-muted-foreground">
            {t('common', 'pageOf', { n: clamped, total: pages, size: pageSize })}
          </span>
        </PaginationItem>
        <PaginationItem>
          <Button
            type="button"
            size="sm"
            disabled={clamped >= pages}
            onClick={() => onPageChange(clamped * pageSize)}
          >
            {t('common', 'next')}
          </Button>
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
