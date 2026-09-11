import type { ApiError } from '../../api/client.js';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 错态（07 §4 错误码本地化兜底——code → errors 表；未命中 → 兜底含 code 永不空白；
 * 07 表格语义：「操作失败，code」）。
 *
 * 换皮（T20 增补）：原 `ErrorState.module.css` 全量 Tailwind 化——13px→`text-[13px]` ·
 * `--text-2`→`muted-foreground` · `--brand`→`primary` · `--line-strong`→`primary/20` 边框；
 * retry 圆角 9→`rounded-md`(8)（非轴值就近向下）· 12.5→`text-xs` · 文案/`role="alert"` 零变更。
 */
export function ErrorState({ error, onRetry }: { error: ApiError | null; onRetry?: () => void }) {
  const { tErr, t } = useI18n();
  return (
    <div className="px-4 py-8 text-center" role="alert">
      <p className="mb-3 text-[13px] text-muted-foreground">
        {error ? tErr(error.code) : t('common', 'loading')}
      </p>
      {onRetry && (
        <button
          type="button"
          className="cursor-pointer rounded-md border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
          onClick={onRetry}
        >
          {t('common', 'retry')}
        </button>
      )}
    </div>
  );
}
