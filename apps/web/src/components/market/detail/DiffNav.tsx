import type { CompareFile } from '../../../api/types.js';
import { Badge, type BadgeTone } from '../../ui/Badge.js';
import styles from './DiffNav.module.css';

const TONE: Record<CompareFile['changeType'], BadgeTone> = {
  ADDED: 'success',
  MODIFIED: 'warning',
  DELETED: 'danger',
};

/** 变更文件导航（changeType 徽章 + 点击滚动锚点 → diff section） */
export function DiffNav({
  files,
  active,
  onSelect,
}: {
  files: readonly CompareFile[];
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className={styles.nav} aria-label="changed files">
      {files.map((file, index) => (
        <button
          key={file.path}
          type="button"
          className={`${styles.item} ${index === active ? styles.active : ''}`}
          onClick={() => onSelect(index)}
        >
          <span className={styles.name}>{file.path}</span>
          <Badge tone={TONE[file.changeType]} mono>
            {file.changeType}
          </Badge>
        </button>
      ))}
    </nav>
  );
}
