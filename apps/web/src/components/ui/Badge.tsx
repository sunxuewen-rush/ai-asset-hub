import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** 状态/类型小徽章（demo pill 系：PUBLIC 绿 / YANKED 灰 / ns 蓝 / changeType 各自 tone） */
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
    <span className={`${styles.badge} ${styles[tone]} ${mono ? styles.mono : ''}`}>{children}</span>
  );
}
