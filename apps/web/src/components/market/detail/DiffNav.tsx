import { cn } from 'cn';
import type { CompareFile } from '../../../api/types.js';
import { Badge, type BadgeTone } from '../../ui/Badge.js';

const TONE: Record<CompareFile['changeType'], BadgeTone> = {
  ADDED: 'success',
  MODIFIED: 'warning',
  DELETED: 'danger',
};

/**
 * 变更文件导航（changeType 徽章 + 点击滚动锚点 → diff section）
 *
 * 换皮（T20）：原 `DiffNav.module.css` 全量 Tailwind 化——`--text-2`→`muted-foreground` ·
 * `--line-*`→`border`；hover/active 走**底色语义**（§4.4 ① `--accent` = 选中底、⑥ hover = 底色变化），
 * 不再用品牌蓝字色。滚动锚点 / `aria-label` / 选中态由消费方（`VersionCompare`）驱动，零变更。
 */
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
    <nav
      className="flex max-h-[420px] flex-col overflow-hidden overflow-y-auto rounded-lg border border-border bg-card"
      aria-label="changed files"
    >
      {files.map((file, index) => (
        <button
          key={file.path}
          type="button"
          className={cn(
            'flex w-full cursor-pointer items-center gap-[7px] border-0 border-b border-border bg-transparent px-2.5 py-[7px] text-left font-mono text-[11px] text-muted-foreground',
            index === active
              ? 'bg-accent font-semibold text-accent-foreground'
              : 'hover:bg-muted/60',
          )}
          onClick={() => onSelect(index)}
        >
          <span className="flex-1 truncate">{file.path}</span>
          <Badge tone={TONE[file.changeType]} mono>
            {file.changeType}
          </Badge>
        </button>
      ))}
    </nav>
  );
}
