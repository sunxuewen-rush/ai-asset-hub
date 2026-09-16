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

/**
 * 401 分流登记口（design §4.2）。
 *
 * **依赖方向 = `auth/* → api/*`（单向）**：`auth/AuthProvider` 挂载时注册处理函数，
 * `api/client` 侧在 401 分支回调——反向 import 会形成 ESM 循环（`api/auth` → `client`）。
 * T1 落登记口，**T2 落消费**（四分类：`/me` / 受保护路由 / 公开段 / `skipAuthRedirect`）。
 */
export type UnauthorizedHandler = (path: string, search: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** 注册 401 处理函数；返回注销函数（供 `useEffect` cleanup） */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export interface ApiGetOptions {
  signal?: AbortSignal;
  /** 默认 true；需要每次新鲜的调用（如刷新统计）传 false */
  cache?: boolean;
  /** true = 该调用的 401 **完全跳过分流**（交调用方 inline 展示，如登录表单；design §4.2 ④） */
  skipAuthRedirect?: boolean;
}

export async function apiGet<T>(path: string, opts: ApiGetOptions = {}): Promise<T> {
  const cacheable = opts.cache !== false;
  const key = `${getCurrentLang()} ${path}`;
  if (cacheable) {
    const hit = responseCache.get(key);
    if (hit) return hit as Promise<T>;
  }
  const request = doFetch<T>(path, {
    signal: opts.signal,
    skipAuthRedirect: opts.skipAuthRedirect,
  });
  if (cacheable) {
    responseCache.set(key, request);
    // 失败不污染缓存——错误后重试需能真实重发（失败 promise 若滞留，重试将永远命中坏缓存）
    void request.catch(() => {
      responseCache.delete(key);
    });
  }
  return request;
}

export interface ApiPostOptions {
  signal?: AbortSignal;
  /** true = 该调用的 401 **完全跳过分流**（交调用方 inline 展示，design §4.2 ④） */
  skipAuthRedirect?: boolean;
}

/**
 * POST（JSON）——design §3.2 件 4。
 *
 * **复用 `doFetch`**（不新起 fetch 路径）：401 分流、错误归一、`Accept-Language` 与 GET 同源。
 * `body` 省略 / `undefined` ⇒ **无请求体**（官方 `POST /api/auth/sign-out` 即此形态）。
 */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts: ApiPostOptions = {},
): Promise<T> {
  return doFetch<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: opts.signal,
    skipAuthRedirect: opts.skipAuthRedirect,
  });
}

/** `doFetch` 请求形态（T1：method/body/headers；**T2**：401 四分类消费 `skipAuthRedirect`） */
interface DoFetchInit {
  method?: string;
  /** 已序列化的请求体（JSON 字符串）；`undefined` = 无 body */
  body?: string;
  signal?: AbortSignal;
  skipAuthRedirect?: boolean;
}

async function doFetch<T>(path: string, init: DoFetchInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? 'GET',
      body: init.body,
      headers: {
        Accept: 'application/json',
        'Accept-Language': getCurrentLang(),
        // 仅在有 body 时声明 JSON（`sign-out` 等无 body 调用不引入无意义 content-type）
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      signal: init.signal,
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
