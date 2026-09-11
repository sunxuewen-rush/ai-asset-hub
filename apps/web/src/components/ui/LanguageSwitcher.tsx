import { Button } from '@/components/ui/shadcn/button';
import { useI18n } from '../../i18n/I18nProvider.js';
import { SUPPORTED_LANGS, type UiLang } from '../../i18n/lang.js';

const LABEL: Record<UiLang, string> = { 'zh-CN': '中文', en: 'EN' };

/**
 * 语言切换器（07 §2：界面提供语言切换器 · 切换即时生效 + 持久化；形态 = 已拍板「中文|EN」分段控件）
 *
 * 换皮（plan T7，design §4.4）：渐变选中底 → **实底 `--primary`**；按钮换 shadcn `Button`
 * （选中 `variant="default"` / 未选 `variant="ghost"`，`size="xs"`）。
 * **交互零变更**（仍为单点击分段控件，不引入 DropdownMenu）——本阶段是纯视觉变更，
 * 「行为不变」优先于 plan T7 的局部措辞（**2026-09-11 用户拍板：保 pill**）。
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      {SUPPORTED_LANGS.map((code) => (
        <Button
          key={code}
          type="button"
          size="xs"
          variant={lang === code ? 'default' : 'ghost'}
          className="font-semibold"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
        >
          {LABEL[code]}
        </Button>
      ))}
    </div>
  );
}
