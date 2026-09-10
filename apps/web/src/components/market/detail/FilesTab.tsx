import { useState } from 'react';
import type { VersionFileEntry } from '../../../api/types.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Spinner } from '../../ui/Spinner.js';
import { FilePreviewDialog } from './FilePreviewDialog.js';
import styles from './FilesTab.module.css';
import { FileTree } from './FileTree.js';

/**
 * 文件 tab 编排（design §5.3：目录树来自版本详情文件清单；文件点击 → G7 按 path 拉内容进
 * 预览对话框——useApi 缓存（语言感知键）重复打开零重拉）。
 */
export function FilesTab({
  slug,
  version,
  files,
}: {
  slug: string;
  version: string;
  files: readonly VersionFileEntry[] | null;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<VersionFileEntry | null>(null);
  return (
    <div>
      {files === null ? (
        // R2：波 2 文件清单未就 → 加载占位（防误导性「暂无文件」闪烁）
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : files.length === 0 ? (
        <p className={styles.empty}>{t('common', 'empty')}</p>
      ) : (
        <FileTree files={files} onOpenFile={setPreview} />
      )}
      <p className={styles.hint}>{t('market', 'filesTreeHint')}</p>
      {preview && (
        <FilePreviewDialog
          file={preview}
          slug={slug}
          version={version}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
