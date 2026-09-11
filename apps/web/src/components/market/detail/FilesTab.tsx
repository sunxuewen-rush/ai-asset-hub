import { useState } from 'react';
import type { VersionFileEntry } from '../../../api/types.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Spinner } from '../../ui/Spinner.js';
import { FilePreviewDialog } from './FilePreviewDialog.js';
import { FileTree } from './FileTree.js';

/**
 * 文件 tab 编排（design §5.3：目录树来自版本详情文件清单；文件点击 → G7 按 path 拉内容进
 * 预览对话框——useApi 缓存（语言感知键）重复打开零重拉）。
 *
 * 换皮（T19）：原 `FilesTab.module.css` 三个类全量 Tailwind 化——字阶按 §4.4 ⑤ 九档轴
 * （11.5→`text-[11px]` · 13→`text-[13px]`），`--text-3`→`muted-foreground` · `--line-faint`→`border`。
 * 结构/分支（波 2 未就 → Spinner 占位；空清单 → empty）零变更。
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
        <div className="flex justify-center py-[26px]">
          <Spinner />
        </div>
      ) : files.length === 0 ? (
        <p className="py-5 text-center text-[13px] text-muted-foreground">{t('common', 'empty')}</p>
      ) : (
        <FileTree files={files} onOpenFile={setPreview} />
      )}
      <p className="mt-2.5 border-t border-border pt-2.5 text-[11px] leading-[1.7] text-muted-foreground">
        {t('market', 'filesTreeHint')}
      </p>
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
