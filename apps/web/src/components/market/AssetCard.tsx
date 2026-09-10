import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AssetItem } from '../../api/types.js';
import { AssetAvatar } from '../ui/AssetAvatar.js';
import styles from './AssetCard.module.css';
import { compactCount, ownerText } from './format.js';

/**
 * 资产卡（§4.4 v0.6 正式结构命名一步到位：card-head → title(main/meta) → card-desc → card-foot；
 * demo v0.5 网格卡数值——radius 16 / min-h 158 / desc clamp2；完整卡可点 → 详情路由）
 */
export function AssetCard({ item }: { item: AssetItem }) {
  const to = `/assets/${encodeURIComponent(item.slug)}`;
  const displayName = item.latestName ?? item.slug;
  const author = ownerText(item);
  return (
    <Link to={to} className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <AssetAvatar name={displayName} size={40} />
        <div className={styles.titles}>
          <div className={styles.title}>
            <h3 className={styles.main}>{displayName}</h3>
          </div>
          <div className={styles.meta}>
            <span className={styles.dl}>⇣ {compactCount(item.downloadCount)}</span>
            {item.latestVersion && <span className={styles.ver}>v{item.latestVersion}</span>}
          </div>
        </div>
      </div>
      <p className={styles.desc}>{item.latestDescription ?? ''}</p>
      <div className={styles.foot}>
        {author && (
          <>
            <b>{author}</b>
            <span className={styles.dot} />
          </>
        )}
      </div>
    </Link>
  );
}

/** 网格容器（4 列 × 行；响应式降列——§4.4 断点 1200/900） */
export function AssetGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
