import { cn } from 'cn';
import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/**
 * tone → 语义色（design §4.4 ①：AIH 语义补丁层 `--success`/`--warning` + 官方 `--destructive`/
 * `--primary`/`--muted`）。旧层为「demo pill 色系」字面值（`#047857`/`--ct-mod`/`#be123c`/
 * `rgba(148,163,184,.15)`）——换皮后统一收敛到语义 token，深浅观感随之微调（登记项）。
 */
const TONE: Record<BadgeTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  info: 'border-primary/20 bg-primary/10 text-primary',
  warning: 'border-warning/25 bg-warning/15 text-warning',
  danger: 'border-destructive/20 bg-destructive/10 text-destructive',
  neutral: 'border-transparent bg-muted text-muted-foreground',
};

/**
 * 状态/类型小徽章（PUBLISHED/YANKED/changeType 各自 tone）。
 *
 * 换皮（T20 增补）：原 `Badge.module.css` 全量 Tailwind 化——10.5px→`text-[11px]`（§4.4 ⑤ 首档）·
 * 半径 999→`rounded-full` · `--line-*`→语义色边框；`mono` 变体保留（`font-mono`）。
 */
export function Badge({
  tone = 'neutral',
  mono = false,
  children,
}: {
  tone?: BadgeTone;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-[9px] py-[2px] text-[11px] leading-[1.6] font-semibold whitespace-nowrap',
        TONE[tone],
        mono && 'font-mono',
      )}
    >
      {children}
    </span>
  );
}
