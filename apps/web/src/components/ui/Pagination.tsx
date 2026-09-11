import { Button } from '@/components/ui/shadcn/button';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 分页（demo .pager：‹ 上一页 | 1 / 25 · 每页 20 | 下一页 ›）
 *
 * offset 替换式（design §7：列表查询 offset 语义；页码 = floor(offset/limit)+1）。
 * 换皮（plan T11）：控件换 shadcn `Button`（上一页 `outline` / 下一页 `default`）——
 * **不引入 shadcn `Pagination` 原语**（其语义与我们的 offset 替换式不同），语义与回调零变更。
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
    <div className="flex items-center justify-center gap-2 pt-[18px] pb-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={clamped <= 1}
        onClick={() => onPageChange((clamped - 2) * pageSize)}
      >
        {t('common', 'prev')}
      </Button>
      <span className="px-1 text-xs font-semibold text-muted-foreground">
        {t('common', 'pageOf', { n: clamped, total: pages, size: pageSize })}
      </span>
      <Button
        type="button"
        size="sm"
        disabled={clamped >= pages}
        onClick={() => onPageChange(clamped * pageSize)}
      >
        {t('common', 'next')}
      </Button>
    </div>
  );
}
