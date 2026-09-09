import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import styles from './TopBar.module.css';
import { TypeIcon } from './TypeIcon.js';

/**
 * 顶栏（demo .topbar：sticky 玻璃 + 品牌渐变字 + 语言切换 + 登录占位——M4b 接真实登录）
 */
export function TopBar() {
  const { t } = useI18n();
  return (
    <header className={`glass ${styles.topbar}`}>
      <Link to="/" className={styles.brand} aria-label="AI X Hub home">
        <b>AI X Hub</b>
      </Link>
      <div className={styles.right}>
        <LanguageSwitcher />
        {/* M4a 匿名门户无登录（design §2 out）——占位视觉，M4b 接真实认证 */}
        <span className={styles.user}>
          <span className={styles.ava}>
            <TypeIcon type="agent" size={13} />
          </span>
          {t('navigation', 'login')}
        </span>
      </div>
    </header>
  );
}
