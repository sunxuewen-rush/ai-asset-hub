import styles from './Spinner.module.css';

/** 载入旋转指示（tokens 蓝；块级居中由父容器定） */
export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 11)) }}
      role="status"
      aria-label="loading"
    />
  );
}
