import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en.js';
import { getCurrentLang, setCurrentLang as persistLang, type UiLang } from './lang.js';
import { type Dict, zh } from './zh.js';

export type DictGroup = keyof Dict;
export type DictKey<G extends DictGroup> = keyof Dict[G];
export type Translate = <G extends DictGroup, K extends DictKey<G>>(
  group: G,
  key: K,
  vars?: Record<string, string | number>,
) => string;

interface I18nContextValue {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
  t: Translate;
  /** 错误码本地化（07 §4：code → 消息；未命中 → 兜底含 code——永不空白） */
  tErr: (code: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (raw, name: string) =>
    name in vars ? String(vars[name]) : raw,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // 初始语言：lang.ts 已按 用户偏好 > 系统 > en 判定（模块装载时）
  const [lang, setLangState] = useState<UiLang>(() => getCurrentLang());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const dict: Dict = lang === 'zh-CN' ? zh : en;
    const t: Translate = (group, key, vars) => {
      const template = dict[group][key];
      // 运行时兜底（类型已保证存在；防御未来动态合并资源包）
      return interpolate(String(template), vars);
    };
    return {
      lang,
      setLang: (next) => {
        setLangState(next);
        persistLang(next);
      },
      t,
      tErr: (code, vars) => {
        const errors = dict.errors as Record<string, string>;
        const template = errors[code] ?? errors.unknown ?? code;
        return interpolate(template, vars ?? { code });
      },
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
