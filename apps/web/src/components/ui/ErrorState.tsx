import type { ApiError } from '../../api/client.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import styles from './ErrorState.module.css';

/**
 * 错态（07 §4 错误码本地化兜底——code → errors 表；未命中 → 兜底含 code 永不空白；
 * 07 表格语义：「操作失败，code」）。
 */
export function ErrorState({ error, onRetry }: { error: ApiError | null; onRetry?: () => void }) {
  const { tErr, t } = useI18n();
  return (
    <div className={styles.error} role="alert">
      <p>{error ? tErr(error.code) : t('common', 'loading')}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t('common', 'retry')}
        </button>
      )}
    </div>
  );
}
