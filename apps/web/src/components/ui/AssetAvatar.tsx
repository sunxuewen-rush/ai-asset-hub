import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';

/**
 * 资产首字母方块 logo（design §4.4 v0.6 正名——demo .tava 实证；plan T10 换皮；本批 §3.6 归位）
 *
 * 取色：名称 hash → 8 色板（`aih-theme.css` `--ava-1..8` 序即 hash 序，**实底**——渐变已在 T3
 * 令牌层去除，色相/序不变）；同资产恒色（确定性 hash）。首字：拉丁大写 / CJK 原样。
 *
 * 归位（§3.6）：官方 `Avatar` + **必带 `AvatarFallback`**（§2.2 硬规则 4）——本件不带头像图，
 * Fallback 即内容载体。方块圆角（`rounded-lg` 10px）与 8 色实底属**站点级差异**，按 §3.6 授权
 * 走 className（尺寸/圆角）+ 内联值（取色/字号）——**不覆盖官方件的颜色/排版类**；视觉目标
 * **零变化**（8 色板 hash → 色序不变）。
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
    <Avatar
      className="shrink-0 rounded-lg font-semibold text-white shadow-sm"
      style={{ width: size, height: size, background: `var(--ava-${colorIndex})` }}
      aria-hidden="true"
    >
      <AvatarFallback
        className="rounded-lg bg-transparent font-semibold text-white"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {firstLetter(name)}
      </AvatarFallback>
    </Avatar>
  );
}
