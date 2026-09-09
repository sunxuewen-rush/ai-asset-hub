import { NavLink } from 'react-router-dom';
import { fetchStats } from '../../api/stats.js';
import type { AssetType } from '../../api/types.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import styles from './SideNav.module.css';
import { TypeIcon } from './TypeIcon.js';

/** 版本行文字与 web package.json version 同步（demo v0.1.0 · Apache 2.0） */
const APP_VERSION = '0.1.0';

type NavType = 'home' | AssetType;

interface NavEntry {
  type: NavType;
  to: string;
  zhLabel: string;
  enLabel: string;
}

/**
 * 侧栏导航（design §3/§8：首页 + 三中心（类型即路由）+ 计数（R7 stats——useApi 缓存与
 * 首页统计共用一次请求）+ 底部开源区；全高 sticky，内滚滚动条隐藏——§4.4）
 */
export function SideNav() {
  const { t } = useI18n();
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);

  const entries: NavEntry[] = [
    { type: 'home', to: '/', zhLabel: t('navigation', 'home'), enLabel: 'Home' },
    { type: 'skill', to: '/skills', zhLabel: t('navigation', 'skills'), enLabel: 'Skills' },
    { type: 'mcp', to: '/mcps', zhLabel: t('navigation', 'mcps'), enLabel: 'MCP Servers' },
    { type: 'agent', to: '/agents', zhLabel: t('navigation', 'agents'), enLabel: 'Agents' },
  ];

  const countOf = (type: NavType): number | undefined =>
    type === 'home' ? undefined : stats?.typeCounts[type];

  return (
    <nav className={`glass ${styles.nav}`}>
      <div className={styles.scroll}>
        {entries.map(({ type, to, zhLabel, enLabel }) => {
          const count = countOf(type);
          return (
            <NavLink
              key={to}
              to={to}
              end={type === 'home'}
              className={({ isActive }) =>
                `${styles.item} ${isActive ? styles.active : ''} ${type !== 'home' ? styles[`t-${type}`] : ''}`
              }
            >
              <span className={styles.ic}>{type === 'home' ? '⌂' : <TypeIcon type={type} />}</span>
              <span className={styles.labels}>
                {zhLabel}
                <em className={styles.en}>{enLabel}</em>
              </span>
              {count !== undefined && <span className={styles.cnt}>{count.toLocaleString()}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className={styles.foot}>
        <a
          className={styles.gh}
          href="https://github.com/sunxuewen-rush/ai-asset-hub"
          target="_blank"
          rel="noreferrer"
        >
          <span className={styles.star}>★</span> {t('navigation', 'starRepo')}
        </a>
        {/* M4b/开源期接真实文档与反馈地址（现无可达目标——不渲染死链） */}
        <div className={styles.footLinks}>
          <span>{t('navigation', 'footDocs')}</span>
          <span>{t('navigation', 'footFeedback')}</span>
        </div>
        <div className={styles.ver}>{t('navigation', 'versionLine', { version: APP_VERSION })}</div>
      </div>
    </nav>
  );
}
