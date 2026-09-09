import { type ReactNode, useState } from 'react';
import type { VersionFileEntry } from '../../../api/types.js';
import styles from './FileTree.module.css';
import {
  buildFileTree,
  dirFileCount,
  type FileNode,
  formatBytes,
  formatSha,
} from './fileTreeNodes.js';

/**
 * 版本文件折叠树（design §4.4 v0.7：目录行可折叠 ▶ 旋转 90° + 文件行 sha 徽章；mono 全树。
 * demo 📄/📁 emoji 省略——树以 chevron + mono 文本呈现，防 emoji 排版抖动）。
 */
export function FileTree({
  files,
  onOpenFile,
}: {
  files: readonly VersionFileEntry[];
  onOpenFile: (file: VersionFileEntry) => void;
}) {
  const nodes = buildFileTree(files);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  function toggleDir(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderNode(node: FileNode, depth: number): ReactNode {
    const pad = depth === 0 ? '' : `${styles.indent}${styles[`d${Math.min(depth, 3)}`]}`;
    if (node.type === 'dir') {
      const open = !collapsed.has(node.path);
      const count = dirFileCount(node);
      return (
        <div key={node.path}>
          <button
            type="button"
            className={`${styles.row} ${styles.dir} ${open ? styles.open : ''} ${pad}`}
            onClick={() => toggleDir(node.path)}
            aria-expanded={open}
          >
            <span className={styles.chev} aria-hidden="true">
              ▶
            </span>
            <span className={styles.nm}>{node.name}/</span>
            <span className={styles.sz}>{count} files</span>
          </button>
          {open && node.children && (
            <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }
    if (node.type === 'file') {
      const entry = node.entry;
      if (!entry) return null;
      return (
        <button
          key={node.path}
          type="button"
          className={`${styles.row} ${styles.file} ${pad}`}
          onClick={() => onOpenFile(entry)}
          title={`${node.path} · ${formatBytes(entry.fileSize)}`}
        >
          <span className={styles.nm}>{node.name}</span>
          <span className={styles.sz}>{formatBytes(entry.fileSize)}</span>
          <span className={styles.sha}>{formatSha(entry.sha256)}</span>
        </button>
      );
    }
    return null;
  }

  return <div className={styles.tree}>{nodes.map((node) => renderNode(node, 0))}</div>;
}
