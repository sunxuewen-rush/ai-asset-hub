import { useI18n } from '../../i18n/I18nProvider.js';
import { SUPPORTED_LANGS, type UiLang } from '../../i18n/lang.js';
import styles from './LanguageSwitcher.module.css';

const LABEL: Record<UiLang, string> = { 'zh-CN': '中文', en: 'EN' };

/** 语言切换器（demo .lang-switch 拍板：中文|EN pill；切换即时生效 + 持久化——07 §2） */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className={styles.switch}>
      {SUPPORTED_LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`${styles.btn} ${lang === code ? styles.on : ''}`}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
        >
          {LABEL[code]}
        </button>
      ))}
    </div>
  );
}
