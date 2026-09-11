/**
 * 资产首字母方块 logo（design §4.4 v0.6 正名——demo .tava 实证；plan T10 换皮）
 *
 * 取色：名称 hash → Avatar 8 色板（`aih-theme.css` `--ava-1..8` 序即 hash 序，**实底**——
 * 渐变已在 T3 令牌层去除，色相/序不变）；同资产恒色（确定性 hash）。首字：拉丁大写 / CJK 原样。
 * 换皮：圆角收到轴上 `rounded-lg`(10px) · 投影改 `shadow-sm`（去重投影）· 其余（尺寸/字号比例）不变。
 */
function hashName(name: string): number {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  }
  return Math.abs(hash);
}

function firstLetter(name: string): string {
  const ch = name.trim().charAt(0);
  if (!ch) return '?';
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}

export function AssetAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const colorIndex = (hashName(name) % 8) + 1;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-white shadow-sm select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `var(--ava-${colorIndex})`,
      }}
      aria-hidden="true"
    >
      {firstLetter(name)}
    </span>
  );
}
