import { Alert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert';
import { Button } from '@/components/ui/shadcn/button';
import type { ApiError } from '../../api/client.js';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 错态（07 §4 错误码本地化兜底——code → errors 表；未命中 → 兜底含 code 永不空白；
 * 07 表格语义：「操作失败，code」）。
 *
 * 归位（本批 §3.9）：官方 `Alert`（`variant="destructive"`）作壳 + `AlertTitle`/`AlertDescription`
 * 结构 + 官方 `Button`（`outline`/`sm`）承载重试。**逻辑零变更**：按 code 本地化、`role="alert"`
 * （官方 `Alert` 内置）、重试回调与「无 error 时显示 loading 文案」的原行为全部保留
 * （dogfood 404 断言复用）。形态官方化：左对齐告警条（描边/底色由 `Alert` 决定），原自绘
 * 「居中 muted 文案 + 主色描边钮」随之收敛（design §8.7 观感项）。
 */
export function ErrorState({ error, onRetry }: { error: ApiError | null; onRetry?: () => void }) {
  const { tErr, t } = useI18n();
  return (
    <Alert variant="destructive">
      <AlertTitle>{error ? tErr(error.code) : t('common', 'loading')}</AlertTitle>
      {onRetry && (
        <AlertDescription>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {t('common', 'retry')}
          </Button>
        </AlertDescription>
      )}
    </Alert>
  );
}
