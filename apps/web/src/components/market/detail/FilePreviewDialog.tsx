import { useEffect } from 'react';
import { fetchVersionFile } from '../../../api/content.js';
import { useApi } from '../../../hooks/useApi.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Spinner } from '../../ui/Spinner.js';
import styles from './FilePreviewDialog.module.css';
import { formatBytes } from './fileTreeNodes.js';

/**
 * 文件预览对话框（design §4.4 v0.7：居中白卡 720px/76vh + 遮罩 blur3 + mono pre-wrap；
 * 文本 G7 渲染 / binary/truncated 提示；useApi 缓存——重复打开零重拉）。
 * 关闭：✕ / 遮罩点击 / Esc。
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
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={t('common', 'close')}
        onClick={onClose}
      />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={file.filePath}>
        <div className={styles.head}>
          <span className={styles.path}>{file.filePath}</span>
          <span className={styles.size}>{formatBytes(file.fileSize)}</span>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('common', 'close')}
          >
            ✕
          </button>
        </div>
        <div className={styles.body}>
          {loading && (
            <div className={styles.center}>
              <Spinner />
            </div>
          )}
          {error && <p className={styles.msg}>{t('errors', 'unknown', { code: error.code })}</p>}
          {!loading && !error && data && (
            <>
              {data.binary && (
                <p className={styles.msg}>{t('market', 'binaryPreviewUnsupported')}</p>
              )}
              {!data.binary && (
                <>
                  {data.truncated && (
                    <p className={styles.truncated}>{t('market', 'previewTruncated')}</p>
                  )}
                  <pre className={styles.content}>{data.content}</pre>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
