import { cn } from 'cn';
import { useState } from 'react';
import type { CompareFile, DiffLine } from '../../../api/types.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Badge, type BadgeTone } from '../../ui/Badge.js';

const CHANGE_TONE: Record<CompareFile['changeType'], BadgeTone> = {
  ADDED: 'success',
  MODIFIED: 'warning',
  DELETED: 'danger',
};

/** 行色/行字色——**GitHub 亮色系**（design §4.4 ② 语义修正：diff 内容色**不并入** UI 语义色，
 *  故此处为**有意保留的字面值**，非 token 漂移：新增 #1a7f37 底 #e6ffec · 删除 #cf222e 底 #ffebe9） */
const LINE_STYLE: Record<DiffLine['type'], { row: string; tx: string }> = {
  ADD: { row: 'bg-[#e6ffec]', tx: 'text-[#1a7f37]' },
  DELETE: { row: 'bg-[#ffebe9]', tx: 'text-[#cf222e]' },
  CONTEXT: { row: '', tx: 'text-muted-foreground' },
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

/** 行号列（旧 `.no`：右对齐 + 右侧细分隔 + 不可选中） */
const NO_CLS = 'border-r border-border px-2 text-right text-muted-foreground select-none';

function DiffRows({ lines }: { lines: readonly DiffLine[] }) {
  return (
    <div className="flex flex-col font-mono text-[11px] leading-[1.65]">
      {lines.map((line) => {
        const style = LINE_STYLE[line.type];
        return (
          <div
            key={`${line.type}|${line.oldLineNumber ?? '-'}|${line.newLineNumber ?? '-'}`}
            className={cn('grid grid-cols-[46px_46px_1fr]', style.row)}
          >
            {/* 行内三列 grid（§4.4 布局纪律：外层纵向 + 行内 grid 防重叠） */}
            <span className={NO_CLS}>{line.oldLineNumber ?? ''}</span>
            <span className={NO_CLS}>{line.newLineNumber ?? ''}</span>
            <span className={cn('overflow-x-auto px-2.5 whitespace-pre', style.tx)}>
              {line.type === 'ADD' ? '+' : line.type === 'DELETE' ? '-' : ' '}
              {line.content}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 行级 diff 区（design §4.4 v0.7 GitHub 视觉系：文件 section 头 chevron + 路径 mono +
 * changeType 徽章 + +N −M 统计；行三列 old|new|内容——GitHub 亮色 #1a7f37/#cf222e）。
 *
 * 换皮（T20）：原 `DiffView.module.css` 全量 Tailwind 化——section 头底 `--tint-row` 一族
 * → `bg-muted/50`（hover → `bg-muted`）· `--line-*`→`border` · `--text-2/3`→`muted-foreground` ·
 * `--diff-add/del-*` → **字面色**（见 `LINE_STYLE` 注释：内容色不并入语义色）；
 * 动态类索引 `styles[line.type.toLowerCase()]` → `LINE_STYLE` 查表（同 T19 `INDENT` 化，消除动态键）。
 * 折叠状态 / `aria-expanded` / `id=dsec-N` 滚动锚点零变更。
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
    <div className="flex min-w-0 flex-col gap-3">
      {files.map((file, index) => {
        const lines = (file.hunks ?? []).flatMap((hunk) => hunk.lines);
        const { add, del } = countByType(lines);
        const isCollapsed = collapsed.has(index);
        return (
          <section
            key={file.path}
            id={`dsec-${index}`}
            className="overflow-hidden rounded-lg border border-border"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2.5 border-0 border-b border-border bg-muted/50 px-3 py-2 text-left hover:bg-muted"
              onClick={() => toggle(index)}
              aria-expanded={!isCollapsed}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mr-0.5 shrink-0 text-[9px] text-muted-foreground transition-transform duration-[120ms]',
                  isCollapsed && '-rotate-90',
                )}
              >
                ▼
              </span>
              <span className="flex-1 truncate font-mono text-xs font-semibold text-foreground">
                {file.path}
              </span>
              <Badge tone={CHANGE_TONE[file.changeType]} mono>
                {file.changeType}
              </Badge>
              <span className="shrink-0 font-mono text-[11px] font-semibold">
                {add > 0 && <span className="text-[#1a7f37]">+{add}</span>}
                {del > 0 && <span className="ml-2 text-[#cf222e]">−{del}</span>}
              </span>
            </button>
            {!isCollapsed && (
              <div className="py-1">
                {lines.length > 0 ? (
                  <DiffRows lines={lines} />
                ) : (
                  <p className="m-0 px-3.5 py-2.5 text-xs text-muted-foreground">
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
