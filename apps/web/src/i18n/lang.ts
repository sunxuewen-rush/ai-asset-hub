/**
 * UI 语言状态（07 §2/§5）：
 * - 默认跟随系统（Accept-Language/navigator.language，非 zh → en 兜底）
 * - 手动切换持久化（localStorage 用户偏好覆盖系统默认）
 * - current 模块级镜像——api/client.ts 取头用（语言切换后新请求即刻带新 Accept-Language）
 */
export type UiLang = 'zh-CN' | 'en';

const STORAGE_KEY = 'aih.uiLang';
export const SUPPORTED_LANGS: readonly UiLang[] = ['zh-CN', 'en'];

let current: UiLang = detectInitial();

function detectInitial(): UiLang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'en') return stored;
  } catch {
    // localStorage 不可用（隐私模式等）——回落系统检测
  }
  try {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  } catch {
    return 'en';
  }
}

/** 当前生效语言（api 请求头 / 缓存键共用） */
export function getCurrentLang(): UiLang {
  return current;
}

/** 切换语言：镜像 current + 持久化（Provider 调用；旧缓存按语言区分不失效——07 §5） */
export function setCurrentLang(lang: UiLang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // 持久化失败静默——会话内语言仍生效
  }
}
