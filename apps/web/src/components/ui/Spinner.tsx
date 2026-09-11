/**
 * 载入旋转指示（块级居中由父容器定）。
 *
 * 换皮（T20 增补）：原 `Spinner.module.css` 全量 Tailwind 化——`--line-soft`→`border-border` ·
 * `--brand`→`border-t-primary`；动画由自持 `@keyframes spin` 改 **Tailwind `animate-spin`**
 * （速度 0.8s → 1s，观感可忽略；登记）并补 **`motion-reduce:animate-none`**（§4.4 ⑥
 * 「`prefers-reduced-motion: reduce` 全关」——旧层未覆盖动画，此处补齐）。
 * 尺寸/线宽仍由调用方以 inline style 传入（`size` 档位零变更）。
 */
export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-solid border-border border-t-primary motion-reduce:animate-none"
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 11)) }}
      role="status"
      aria-label="loading"
    />
  );
}
