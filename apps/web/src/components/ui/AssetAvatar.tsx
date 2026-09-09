import styles from './AssetAvatar.module.css';

/**
 * 资产首字母方块 logo（design §4.4 v0.6 正名——demo .tava 实证）。
 * 取色：名称 hash → Avatar 8 色板（tokens.css --ava-1..8 序即 hash 序）；
 * 同资产恒色（确定性 hash）。首字：拉丁大写 / CJK 原样。
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
  const gradientIndex = (hashName(name) % 8) + 1;
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `var(--ava-${gradientIndex})`,
      }}
      aria-hidden="true"
    >
      {firstLetter(name)}
    </span>
  );
}
