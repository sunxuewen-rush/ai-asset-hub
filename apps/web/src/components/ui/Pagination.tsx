import { useI18n } from '../../i18n/I18nProvider.js';
import styles from './Pagination.module.css';

/**
 * 分页（demo .pager：‹ 上一页 | 1 / 25 · 每页 20 | 下一页 ›）
 * offset 替换式（design §7：列表查询 offset 语义；页码 = floor(offset/limit)+1）。
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
    <div className={styles.pager}>
      <button
        type="button"
        className={styles.prev}
        disabled={clamped <= 1}
        onClick={() => onPageChange((clamped - 2) * pageSize)}
      >
        {t('common', 'prev')}
      </button>
      <span className={styles.page}>
        {t('common', 'pageOf', { n: clamped, total: pages, size: pageSize })}
      </span>
      <button
        type="button"
        className={styles.next}
        disabled={clamped >= pages}
        onClick={() => onPageChange(clamped * pageSize)}
      >
        {t('common', 'next')}
      </button>
    </div>
  );
}
