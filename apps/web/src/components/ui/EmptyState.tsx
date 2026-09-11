/**
 * 空态（§7 空/错/载三件套之一）。
 *
 * 换皮（T20 增补）：原 `EmptyState.module.css` 全量 Tailwind 化——13px→`text-[13px]` ·
 * `--text-3`→`muted-foreground` · padding 40/16→`py-10 px-4` · line-height 1.7 保留。
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-10 text-center text-[13px] leading-[1.7] text-muted-foreground">
      {message}
    </div>
  );
}
