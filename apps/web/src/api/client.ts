/**
 * api 客户端核心（design §4.1 数据 useApi 自研——零请求库）：
 * - 错误归一 {code,message}（07 §4——服务端结构化 code，前端按表本地化）
 * - 响应缓存 Map<`${lang} ${path}`, Promise>——语言感知（07 §5：旧缓存按语言区分；
 *   label displayName 等数据随 Accept-Language 变化，缓存键必须含语言）
 * - Accept-Language 头跟随当前 UI 语言（lang.ts 镜像，切换即生效）
 */
import { getCurrentLang } from '../i18n/lang.js';

export interface ApiErrorBody {
  code?: string;
  message?: string;
}

/** 归一错误：服务端 {code,message} 或传输层失败（network/http_{status}） */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const responseCache = new Map<string, Promise<unknown>>();

export interface ApiGetOptions {
  signal?: AbortSignal;
  /** 默认 true；需要每次新鲜的调用（如刷新统计）传 false */
  cache?: boolean;
}

export async function apiGet<T>(path: string, opts: ApiGetOptions = {}): Promise<T> {
  const cacheable = opts.cache !== false;
  const key = `${getCurrentLang()} ${path}`;
  if (cacheable) {
    const hit = responseCache.get(key);
    if (hit) return hit as Promise<T>;
  }
  const request = doFetch<T>(path, opts.signal);
  if (cacheable) {
    responseCache.set(key, request);
    // 失败不污染缓存——错误后重试需能真实重发（失败 promise 若滞留，重试将永远命中坏缓存）
    void request.catch(() => {
      responseCache.delete(key);
    });
  }
  return request;
}

/** 当前语言清缓存（切换时若需强制刷新旧语言包可调；07 §5 允许按语言区分保留——默认不动） */
export function clearApiCache(): void {
  responseCache.clear();
}

async function doFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { Accept: 'application/json', 'Accept-Language': getCurrentLang() },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err; // 竞态终止由调用方处理
    throw new ApiError('network', 0, err instanceof Error ? err.message : 'network');
  }
  if (!res.ok) {
    let code = `http_${res.status}`;
    let message: string | undefined;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body && typeof body.code === 'string' && body.code.length > 0) code = body.code;
      if (body && typeof body.message === 'string') message = body.message;
    } catch {
      // 非 JSON 错误体——保留 http_{status} 归一码
    }
    throw new ApiError(code, res.status, message ?? res.statusText);
  }
  return (await res.json()) as T;
}
