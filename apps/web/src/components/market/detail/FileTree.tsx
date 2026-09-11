import { cn } from 'cn';
import { type ReactNode, useState } from 'react';
import type { VersionFileEntry } from '../../../api/types.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import {
  buildFileTree,
  dirFileCount,
  type FileNode,
  formatBytes,
  formatSha,
} from './fileTreeNodes.js';

/** 行样式（旧 `.row`：flex + gap 9 + 13px + py 5 + mono + muted-foreground；hover 走字色） */
const ROW =
  'flex w-full cursor-pointer items-center gap-[9px] border-0 bg-transparent py-[5px] text-left font-mono text-[13px] text-muted-foreground hover:text-foreground';
/** 缩进档（旧层 = `.indent`(20) + `.d2`(40) + `.d3`(60) 叠加；depth≥4 归 d3）。
 *  ⚠ 顺带修掉旧写法 `${styles.indent}${styles[`d${depth}`]}` 在 depth=1 时取到 `undefined`
 *  → 类名里多出一个字面 "undefined" 的残留（无样式效果，但污染 DOM/调试）。 */
const INDENT = ['', 'pl-5', 'pl-10', 'pl-[60px]'] as const;

/**
 * 版本文件折叠树（design §4.4 v0.7：目录行可折叠 ▶ 旋转 90° + 文件行 sha 徽章；mono 全树。
 * demo 📄/📁 emoji 省略——树以 chevron + mono 文本呈现，防 emoji 排版抖动）。
 *
 * 换皮（T19）：原 `FileTree.module.css` 全量 Tailwind 化——`--text-2/3`→`muted-foreground` ·
 * `--sha-bg`（slate 淡底，§4.4 ⑦ **无映射**）→ `bg-muted`（登记项）· 10.5px→`text-[11px]`（⑤ 首档）。
 * 折叠行为零变更：`useState<Set>` + `aria-expanded` + `▶` 字形（不换 lucide，超出「纯视觉」范围）。
 * 文案修订（用户 2026-09-11 同意）：目录计数由写死的 `{count} files` 改走 i18n `market.fileUnit`
 * （zh「文件」/ en「files」——该键早已存在且被 `VersionCompare` 消费，此处属**补齐既有 i18n 缺口**）。
 */
export function FileTree({
  files,
  onOpenFile,
}: {
  files: readonly VersionFileEntry[];
  onOpenFile: (file: VersionFileEntry) => void;
}) {
  const { t } = useI18n();
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
    const pad = INDENT[Math.min(depth, 3)] ?? 'pl-[60px]';
    if (node.type === 'dir') {
      const open = !collapsed.has(node.path);
      const count = dirFileCount(node);
      return (
        <div key={node.path}>
          <button
            type="button"
            className={cn(ROW, 'font-semibold', pad)}
            onClick={() => toggleDir(node.path)}
            aria-expanded={open}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-block w-3.5 shrink-0 text-[9px] text-muted-foreground transition-transform duration-[120ms]',
                open && 'rotate-90',
              )}
            >
              ▶
            </span>
            <span className="flex-1 truncate">{node.name}/</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {count} {t('market', 'fileUnit')}
            </span>
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
          className={cn(ROW, 'group', pad)}
          onClick={() => onOpenFile(entry)}
          title={`${node.path} · ${formatBytes(entry.fileSize)}`}
        >
          <span className="flex-1 truncate group-hover:underline group-hover:underline-offset-2">
            {node.name}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatBytes(entry.fileSize)}
          </span>
          <span className="shrink-0 rounded-[6px] bg-muted px-[7px] py-px text-[11px] text-muted-foreground">
            {formatSha(entry.sha256)}
          </span>
        </button>
      );
    }
    return null;
  }

  return <div className="flex flex-col">{nodes.map((node) => renderNode(node, 0))}</div>;
}
