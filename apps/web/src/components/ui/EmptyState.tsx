import styles from './EmptyState.module.css';

/** 空态（demo 空/错/载三件套之一——§7 空/错/载纪律） */
export function EmptyState({ message }: { message: string }) {
  return <div className={styles.empty}>{message}</div>;
}
