import { useEffect } from 'react';
import { fetchVersionFile } from '../../../api/content.js';
import { useApi } from '../../../hooks/useApi.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Spinner } from '../../ui/Spinner.js';
import { formatBytes } from './fileTreeNodes.js';

/**
 * 文件预览对话框（design §4.4 v0.7 / ③：居中白卡 `min(720px,88vw)`/76vh + **遮罩 `bg-black/50`
 * 无 blur**（原 `backdrop-filter: blur(3px)` 属 §4.4 废弃清单）+ mono pre-wrap；文本 G7 渲染 /
 * binary / truncated 提示；useApi 缓存——重复打开零重拉。
 * 关闭：✕ / 遮罩点击 / Esc。行为零变更（`role=dialog` + `aria-modal` + Esc 监听 + 真 button 遮罩）。
 *
 * 换皮（T19）：原 `FilePreviewDialog.module.css` 全量 Tailwind 化——卡面 `bg-card` + `shadow-lg`
 * （浮层档，取消原 70px 大黑投影 → §4.4 ⑥）、圆角 16→`rounded-lg`（③ dialog 真值）、
 * `--text-2/3`→`muted-foreground` · `--line-soft`→`border`；截断提示走 **AIH `--warning`**
 * （原裸琥珀字面量，§4.4 ① 语义补丁层）；11.5→`text-[11px]` · 13→`text-[13px]` · 12→`text-xs`。
 */
export function FilePreviewDialog({
  file,
  slug,
  version,
  onClose,
}: {
  file: { filePath: string; fileSize: number };
  slug: string;
  version: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data, error, loading } = useApi(
    (signal) => fetchVersionFile(slug, version, file.filePath, { signal }),
    [slug, version, file.filePath],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default border-0 bg-black/50"
        aria-label={t('common', 'close')}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[76vh] w-[min(720px,88vw)] flex-col overflow-hidden rounded-lg bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={file.filePath}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-[18px] py-[13px]">
          <span className="flex-1 truncate font-mono text-[13px] font-semibold text-foreground">
            {file.filePath}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatBytes(file.fileSize)}
          </span>
          <button
            type="button"
            className="size-[26px] shrink-0 cursor-pointer rounded-md border-0 bg-muted text-[13px] font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
            aria-label={t('common', 'close')}
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto px-[18px] py-4 font-mono text-xs leading-[1.7] text-muted-foreground">
          {loading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}
          {error && (
            <p className="py-5 text-center font-sans text-[13px] text-muted-foreground">
              {t('errors', 'unknown', { code: error.code })}
            </p>
          )}
          {!loading && !error && data && (
            <>
              {data.binary && (
                <p className="py-5 text-center font-sans text-[13px] text-muted-foreground">
                  {t('market', 'binaryPreviewUnsupported')}
                </p>
              )}
              {!data.binary && (
                <>
                  {data.truncated && (
                    <p className="mb-2.5 rounded-md bg-warning/10 px-3 py-1.5 font-sans text-[11px] text-warning">
                      {t('market', 'previewTruncated')}
                    </p>
                  )}
                  <pre className="whitespace-pre-wrap break-words">{data.content}</pre>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
