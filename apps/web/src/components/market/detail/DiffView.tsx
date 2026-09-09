import { useState } from 'react';
import type { CompareFile, DiffLine } from '../../../api/types.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Badge, type BadgeTone } from '../../ui/Badge.js';
import styles from './DiffView.module.css';

const CHANGE_TONE: Record<CompareFile['changeType'], BadgeTone> = {
  ADDED: 'success',
  MODIFIED: 'warning',
  DELETED: 'danger',
};

function countByType(lines: readonly DiffLine[]): { add: number; del: number } {
  let add = 0;
  let del = 0;
  for (const line of lines) {
    if (line.type === 'ADD') add++;
    else if (line.type === 'DELETE') del++;
  }
  return { add, del };
}

function DiffRows({ lines }: { lines: readonly DiffLine[] }) {
  return (
    <div className={styles.rows}>
      {lines.map((line) => (
        <div
          key={`${line.type}|${line.oldLineNumber ?? '-'}|${line.newLineNumber ?? '-'}`}
          className={`${styles.line} ${styles[line.type.toLowerCase()]}`}
        >
          {/* 行内三列 grid（§4.4 布局纪律：外层纵向 + 行内 grid 防重叠） */}
          <span className={styles.no}>{line.oldLineNumber ?? ''}</span>
          <span className={styles.no}>{line.newLineNumber ?? ''}</span>
          <span className={styles.tx}>
            {line.type === 'ADD' ? '+' : line.type === 'DELETE' ? '-' : ' '}
            {line.content}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 行级 diff 区（design §4.4 v0.7 GitHub 视觉系：文件 section 头 chevron + 路径 mono +
 * changeType 徽章 + +N −M 统计；行三列 old|new|内容——GitHub 亮色 #1a7f37/#cf222e）。
 */
export function DiffView({ files }: { files: readonly CompareFile[] }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());

  function toggle(index: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className={styles.sections}>
      {files.map((file, index) => {
        const lines = (file.hunks ?? []).flatMap((hunk) => hunk.lines);
        const { add, del } = countByType(lines);
        const isCollapsed = collapsed.has(index);
        return (
          <section
            key={file.path}
            id={`dsec-${index}`}
            className={`${styles.sec} ${isCollapsed ? styles.collapsed : ''}`}
          >
            <button
              type="button"
              className={styles.head}
              onClick={() => toggle(index)}
              aria-expanded={!isCollapsed}
            >
              <span className={styles.chev} aria-hidden="true">
                ▼
              </span>
              <span className={styles.path}>{file.path}</span>
              <Badge tone={CHANGE_TONE[file.changeType]} mono>
                {file.changeType}
              </Badge>
              <span className={styles.stat}>
                {add > 0 && <span className={styles.plus}>+{add}</span>}
                {del > 0 && <span className={styles.minus}>−{del}</span>}
              </span>
            </button>
            {!isCollapsed && (
              <div className={styles.body}>
                {lines.length > 0 ? (
                  <DiffRows lines={lines} />
                ) : (
                  <p className={styles.note}>
                    {file.binary
                      ? t('market', 'binaryPreviewUnsupported')
                      : file.truncated
                        ? t('market', 'previewTruncated')
                        : t('market', 'diffNoChanges')}
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
