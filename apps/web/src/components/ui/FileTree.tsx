import { cn } from 'cn';
import { type ReactNode, useState } from 'react';
import type { VersionFileEntry } from '../../api/types.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import {
  buildFileTree,
  dirFileCount,
  type FileNode,
  formatBytes,
  formatSha,
} from './fileTreeNodes.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './shadcn/collapsible.js';

/**
 * 行样式（旧 `.row`：flex + gap 9 + 13px + py 5 + mono + muted-foreground）。
 * **可点档**（目录行 / 传了 `onOpenFile` 的文件行）另加 `cursor-pointer` + `hover:text-foreground`；
 * **纯结构态**（M4b-5 P4：文件行未传 `onOpenFile`）⇒ 不加交互态类（行不响应点击、无 hover 反馈）。
 */
const ROW =
  'flex w-full items-center gap-[9px] border-0 bg-transparent py-[5px] text-left font-mono text-[13px] text-muted-foreground';
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
 * 文案修订（用户 2026-09-11 同意）：目录计数由写死的 `{count} files` 改走 i18n `market.fileUnit`。
 *
 * 归位（本批 §3.4）：折叠容器/内容换官方 `Collapsible` + `CollapsibleTrigger`/`CollapsibleContent`
 * （`data-state=open|closed`），**零样式包装** —— 层级/缩进仍由 AIH 逻辑生成（`INDENT`）；
 * `CollapsibleTrigger asChild` 让既有 `<button>` 承接 Radix 的 `aria-expanded`/`data-state`/键盘行为，
 * `▶` 旋转与行样式不变 ⇒ **折叠行为与视觉零变更**。
 */
export function FileTree({
  files,
  onOpenFile,
}: {
  files: readonly VersionFileEntry[];
  /**
   * 打开文件（**M4b-5 P4 加性可选**）：给定 ⇒ 行可点并回调；**缺省 ⇒ 纯结构态**
   * （行不响应点击、不显 hover 下划线）—— 审核面「不可预览 ⇒ 不渲染预览动作」靠此实现。
   * 既有调用点（门户 `FilesTab`）恒传该 prop ⇒ 行为零变化。
   */
  onOpenFile?: (file: VersionFileEntry) => void;
}) {
  const { t } = useI18n();
  const nodes = buildFileTree(files);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  /** Radix `onOpenChange(next)` → 集合语义（收起集合 = 反向存储，向后兼容原状态形状） */
  function setOpen(path: string, open: boolean) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (open) next.delete(path);
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
        <Collapsible
          key={node.path}
          open={open}
          onOpenChange={(next: boolean) => setOpen(node.path, next)}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(ROW, 'cursor-pointer font-semibold hover:text-foreground', pad)}
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
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div>{node.children?.map((child) => renderNode(child, depth + 1))}</div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    if (node.type === 'file') {
      const entry = node.entry;
      if (!entry) return null;
      return (
        <button
          key={node.path}
          type="button"
          className={cn(
            ROW,
            onOpenFile ? 'group cursor-pointer hover:text-foreground' : 'cursor-default',
            pad,
          )}
          onClick={onOpenFile ? () => onOpenFile(entry) : undefined}
          disabled={onOpenFile === undefined}
          title={`${node.path} · ${formatBytes(entry.fileSize)}`}
        >
          <span
            className={cn(
              'flex-1 truncate',
              onOpenFile && 'group-hover:underline group-hover:underline-offset-2',
            )}
          >
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
