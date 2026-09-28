/**
 * `/api/meta/limits`（M4b-7 T4 新建 · design §5.1 只读端点）。
 *
 * 用途：发布页（`/dashboard/publish`）**上限文案的单一真值源** —— 端点不可达时退回
 * `PLATFORM_LIMITS_FALLBACK`，但那**只用于文案**：一切判定（413 / 413 前置 / 单文件 / 文件数）
 * 恒在服务端（design §5.2 · C1/C13）。
 *
 * 形状与类型**随件**（不进 `api/types.ts`）：批 design §3.2 件面只列 N3 = 本文件（保件面闭合）。
 */
import { type ApiGetOptions, apiGet } from './client.js';

export interface PlatformLimits {
  /** 单包上限（字节）—— 服务端 `ASSET_PACKAGE_MAX_BYTES` */
  packageMaxBytes: number;
  /** 单文件上限（字节）—— 服务端 `ASSET_FILE_MAX_BYTES` */
  fileMaxBytes: number;
  /** 包内条目数上限 —— 服务端 `ASSET_MAX_FILES` */
  maxFiles: number;
}

/**
 * 兜底常量（端点不可达 / 异常时仅用于文案）。
 *
 * 数值与 `apps/server/src/config/env.ts` 的**默认值**保持一致（100 MiB / 10 MiB / 100）；
 * 服务端改默认值时**须同步本处**（无自动校验 —— 属已知耦合，登记于批 plan §7）。
 */
export const PLATFORM_LIMITS_FALLBACK: PlatformLimits = {
  packageMaxBytes: 100 * 1024 * 1024,
  fileMaxBytes: 10 * 1024 * 1024,
  maxFiles: 100,
};

/**
 * 读平台上限（匿名可读；语言无关 ⇒ 走 `apiGet` 的语言感知缓存，登录/登出时随全量失效）。
 *
 * 失败语义：**除中止外一律不抛**（退回兜底常量）—— 上限读不到不应阻断发布页渲染；
 * 中止（竞态卸载）照 `AbortError` 上抛，交调用方按既有惯例忽略。
 */
export async function fetchPlatformLimits(opts?: ApiGetOptions): Promise<PlatformLimits> {
  try {
    return await apiGet<PlatformLimits>('/api/meta/limits', opts);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return PLATFORM_LIMITS_FALLBACK;
  }
}

/** 字节 → MiB 文案数值（上限展示统一口径：**四舍五入到整数**，避免 100.0/10.0 之类噪声） */
export function toMiB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}
