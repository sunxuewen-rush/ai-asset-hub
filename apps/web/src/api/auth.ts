/**
 * 认证端点封装（批 design §3.1 件 3 · §7「消费的既有端点」）。
 *
 * 契约（M4c-1 T5 起：**调用层交官方 SDK**，批 design §3）：
 * - **登录** 官方 `POST /api/auth/sign-in/username`（经 SDK `signIn.username`，客户端插件 `usernameClient()`）；
 *   成功 200 `{redirect, token, url, user}` + `Set-Cookie: better-auth.session_token=…`。
 *   后端在官方端点上的 before 钩子按需**首登建号**（目录通道），前端**无需分支**。
 *   ⚠️ 失败**不是抛错**而是 `{ data: null, error }` ⇒ 本文件归一为 `ApiError`（保持 `Login.tsx` 的
 *   `err.code → tErr()` 契约**零改动**，B10）。
 * - **登出** 官方 `POST /api/auth/sign-out`（经 SDK `signOut`；官方端点为**唯一**登出端点，无旧别名）。
 * - **会话** `GET /api/auth/me` → `{ user: { id, displayName }, role }`
 *   （`apps/server/src/http/auth-routes.ts:17-28` 薄层）；未登录 401 `auth.session_expired`。
 *
 * 页面**不直读** `code`：错误统一由 `ApiError.code` 承载，本地化经 `useI18n().tErr`（07 §4）。
 */

import { usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ApiError, type ApiGetOptions, apiGet, apiPost, notifyUnauthorized } from './client.js';

/**
 * 官方 SDK 客户端（批 design §3 调用层 · M4c-1 T5）。
 *
 * - 基址：**省略** `baseURL` ⇒ 官方默认同源 `/api/auth`（dev 经 vite proxy `/api` → `3000`，
 *   与官文「同域可省 baseURL」一致；`auth/next.ts` 的既有口径不变）。
 * - 插件：`usernameClient()` —— 服务端 `username` 插件的**客户端配对件**，`signIn.username` 的唯一正路
 *   （**F285 登记**：批 design §3 原未列客户端插件清单，本批补）。
 * - `fetchOptions.credentials: 'include'`：跨端口 dev（5173 → proxy）仍带会话 cookie。
 * - `onError`：401 回注**交互层单点**（`client.ts` 的四分类 `notifyUnauthorized`），不另起一套判定。
 *   ⚠️ 官方 SDK 的会话端点 `get-session` 的 401 = 「未登录」正常态（与 `/api/auth/me` 同类，
 *   交 `AuthProvider` 消费）⇒ 该路径**不回注**，避免与 ① 类语义冲突。
 */
const authClient = createAuthClient({
  plugins: [usernameClient()],
  fetchOptions: {
    credentials: 'include',
    onError: (ctx) => {
      if (ctx.response?.status !== 401) return;
      const path = pathOfRequest(ctx.request);
      if (path === SDK_SESSION_PATH) return;
      notifyUnauthorized(path);
    },
  },
});

/** 官方 SDK 会话端点（`${baseURL}/get-session`）——401 属「未登录正常态」，见上 */
const SDK_SESSION_PATH = '/api/auth/get-session';

/**
 * 请求 URL → 路径（四分类只认 path）。
 * `better-fetch` 的 `onError.request` 是 `RequestContext`（`{url: URL | string, …}`，**非** DOM `Request`），
 * 且 URL 可能是相对形态 ⇒ 用占位基准解析，只取 `pathname`。
 */
function pathOfRequest(request: { url?: URL | string } | undefined): string {
  const url = request?.url;
  if (!url) return '';
  try {
    return new URL(String(url), 'http://placeholder.invalid').pathname;
  } catch {
    return '';
  }
}

/**
 * 登录失败归一为 `ApiError`（保持 `Login.tsx` 的 `err.code` 消费契约 · B10）。
 *
 * **M4c-1 T7：官方码直通** —— 登录面已全交官方（`/sign-in/username`），官方码即 i18n 文案键
 * （`errors` 组按**官方码**建键，与既有族协议码键同范式）⇒ 不再维护我方重映射表。
 * **防枚举**由「同一官方码 ⇒ 同一文案」天然保证（用户不存在与口令错同码）。
 * 唯一例外 = 限流：官方 429 响应体不带我方码 ⇒ 前端归一为保留码 `auth.rate_limited`。
 */
function signInError(error: { status?: number; code?: string; message?: string }): ApiError {
  const status = typeof error.status === 'number' && error.status > 0 ? error.status : 401;
  if (status === 429) return new ApiError('auth.rate_limited', status, error.message ?? '', error);
  const code = error.code ?? 'unknown';
  return new ApiError(code, status, error.message ?? code, error);
}

/**
 * SDK 会话 hook（会话层单点）：官方 React `useSession` 的绑定包装 ——
 * `AuthProvider` 消费它拿「登录态 + 用户」，`role` 档位仍以 `/api/auth/me` 为准（M4c-1 T5 拍板）。
 */
export function useAuthSession() {
  return authClient.useSession();
}

/** 会话用户（`/me` 契约的 `user` 子集；M4a 门户已消费同形状） */
export interface AuthUser {
  id: string;
  displayName: string;
}

/** `GET /api/auth/me` 响应（`role` 为数值 4 档——服务端 `?? ACCOUNT_ROLE.GUEST` 保证非空） */
export interface MeResponse {
  user: AuthUser;
  role: number;
  /** M4c-2 T5：本账号是否有本地口令（目录账号 = `false` ⇒ 不显示改密入口 · 批 design §4.5 R21） */
  hasLocalPassword: boolean;
}

/** 登录成功响应（官方 `POST /api/auth/sign-in/username`；`session` 位为官方返回体，本批不消费） */
export interface LoginResponse {
  user: AuthUser;
  session: unknown;
}

/**
 * 登录（常规通道）。
 *
 * `skipAuthRedirect: true` —— design §4.2 ④：登录失败的 401 必须**表单内 inline 展示**，
 * 不得退化为全局跳转（本批第 ④ 类唯一消费点 = 登录表单）。
 */
export async function login(
  username: string,
  password: string,
  _opts?: { signal?: AbortSignal },
): Promise<LoginResponse> {
  const { data, error } = await authClient.signIn.username({ username, password });
  if (error) throw signInError(error as { status?: number; code?: string; message?: string });
  const user = (data as { user?: { id?: string; name?: string | null } } | null)?.user;
  if (!user?.id) throw new ApiError('unknown', 200, 'unexpected sign-in response');
  return { user: { id: user.id, displayName: user.name ?? user.id }, session: data };
}

/**
 * 登出（官方端点）。
 *
 * **调用形态为实测所得**（2026-09-16 T4 登出链，两种失败各实锤一次）：
 * - 无 `content-type` ⇒ **415 `UNSUPPORTED_MEDIA_TYPE`**（`Content-Type is required. Allowed types: application/json`）
 * - 有 `content-type` 但**空 body** ⇒ **400 `BAD_REQUEST`**（`Invalid JSON in request body`）
 * - ⇒ 必须 `content-type: application/json` + **合法 JSON body**（传 `{}`）⇒ **200 `{success:true}`**
 *   （`content-type` 由 `apiPost` 对所有写请求统一声明；body 必须由调用方给出）
 * 调用方负责清缓存与跳转（design §4.4：清上下文 + 回首页）。
 */
export async function logout(_opts?: { signal?: AbortSignal }): Promise<void> {
  const res = await authClient.signOut();
  if (res?.error) {
    throw new ApiError(
      res.error.code ?? 'auth.session_expired',
      res.error.status ?? 0,
      res.error.message ?? '',
      res.error,
    );
  }
}

/**
 * 会话探测。
 *
 * **强制 `cache: false`**（design §4.1「`/me` 禁缓存」）——本函数不接受 `cache` 覆盖，
 * 避免调用方把「会话探测」接进语言感知缓存（登出/过期后会命中旧值）。
 */
export async function me(opts?: { signal?: AbortSignal }): Promise<MeResponse> {
  const init: ApiGetOptions = { signal: opts?.signal, cache: false };
  return apiGet<MeResponse>('/api/auth/me', init);
}

/* ───────────────────── 设备授权流（官方 `device-authorization`）───────────────────── */

/**
 * `GET /api/auth/device?user_code=` 响应（该调用即**认领**——带会话时把码绑定到当前用户）。
 *
 * ⚠️ **`client_id` / `scope` 仅对「认领者」返回**（2026-09-16 dev 真机实测）：
 * 非认领者 / 无会话调用得 200 `{user_code, status}`（**不含**这两字段）
 * ⇒ 「他人已认领」的**前置判定** = 200 且 `client_id` 缺失（见 `pages/Device.tsx`；
 * 官方另有 approve 阶段的 403 `access_denied` 兜底）。
 *
 * ⚠️ **无 `expires_in`**（实测响应仅四字段）⇒ 页面**不展示有效期**
 * （`expires_in` 只出现在 CLI 侧调用的 `POST /device/code` 响应里）。
 */
export interface DeviceClaim {
  user_code: string;
  /** 官方状态：`pending` | `approved` | `denied`——**批准/拒绝后刷新仍返回终态** ⇒ 「已处理态」可判定 */
  status: string;
  /** 仅认领者可见（缺此字段 = 他人已认领 / 未带会话） */
  client_id?: string;
  /** 请求范围（实测 `null` = 无条件 scope = 全量） */
  scope?: string | null;
}

/**
 * OAuth `error` → 本仓归一码（批 design §5.2 · Q18①）。
 *
 * 实测映射（2026-09-16 dev 真机 + `apps/server/src/http/device-flow.test.ts`）：
 * - `invalid_request`（错码 / 已处理 / 未认领）· `expired_token`（码过期）
 *   ⇒ **`device.invalidCode`**（**共用一键**——用户视角同为「码无效或已失效」；用户拍板，design §10 口径）
 * - `access_denied`（**非认领者** approve）⇒ **`device.claimedByOther`**
 * - 未命中 ⇒ 保留原 `code`（交 `errors` 组兜底）
 */
const DEVICE_OAUTH_ERROR: Record<string, string> = {
  invalid_request: 'device.invalidCode',
  expired_token: 'device.invalidCode',
  access_denied: 'device.claimedByOther',
};

/**
 * 设备端点错误归一（**适配方 = 本文件**——design §5.2 拍板「页面不直读 `code`」）。
 *
 * 设备端点为官方插件提供，错误体是 **OAuth 风格 `{error, error_description}`**（非本仓
 * `{code, message}`）⇒ `doFetch` 的归一 `code` 退化为 `http_400` ⇒ 此处读 `ApiError.body`
 * 的 `error` 重新映射，并把 `error_description` 提为消息（保留可诊断性）。
 */
function normalizeDeviceError(err: unknown): never {
  if (err instanceof ApiError) {
    const oauth = err.body as { error?: unknown; error_description?: unknown } | undefined;
    const mapped = typeof oauth?.error === 'string' ? DEVICE_OAUTH_ERROR[oauth.error] : undefined;
    if (mapped) {
      const description =
        typeof oauth?.error_description === 'string' ? oauth.error_description : err.message;
      throw new ApiError(mapped, err.status, description, err.body);
    }
  }
  throw err;
}

/**
 * 认领设备码。
 *
 * ⚠️ **端点命名坑**（本函数是**唯一**吸收点）：认领用 **`user_code`（下划线）** 作 query，
 * 而 approve/deny 用 **`userCode`（驼峰）** 作 body 键——页面不出现裸拼接
 * （断言：`grep -c 'user_code' pages/Device.tsx` = 0）。
 */
export async function claimDevice(
  userCode: string,
  opts?: { signal?: AbortSignal },
): Promise<DeviceClaim> {
  try {
    return await apiGet<DeviceClaim>(`/api/auth/device?user_code=${encodeURIComponent(userCode)}`, {
      signal: opts?.signal,
      // 认领有写副作用（绑定用户）⇒ 禁语言感知缓存，避免二次进入命中旧认领结果
      cache: false,
    });
  } catch (err) {
    normalizeDeviceError(err);
  }
}

/** 批准（`POST /device/approve`，body **`{userCode}` 驼峰**） */
export async function approveDevice(
  userCode: string,
  opts?: { signal?: AbortSignal },
): Promise<{ success: boolean }> {
  try {
    return await apiPost<{ success: boolean }>(
      '/api/auth/device/approve',
      { userCode },
      { signal: opts?.signal },
    );
  } catch (err) {
    normalizeDeviceError(err);
  }
}

/** 拒绝（`POST /device/deny`，body **`{userCode}` 驼峰**） */
export async function denyDevice(
  userCode: string,
  opts?: { signal?: AbortSignal },
): Promise<{ success: boolean }> {
  try {
    return await apiPost<{ success: boolean }>(
      '/api/auth/device/deny',
      { userCode },
      { signal: opts?.signal },
    );
  } catch (err) {
    normalizeDeviceError(err);
  }
}

/* ───────────────────── 自助改密（官方 `change-password` · M4c-2 T5）───────────────────── */

/**
 * 自助改密：`POST /api/auth/change-password`（官方端点 · 本批**零薄端点**）。
 *
 * - `revokeOtherSessions: true`（批 design §4.5 R21）——改密成功后**其余会话一并失效**，当前会话由官方保留；
 * - 目录账号**无入口**（`hasLocalPassword === false`，见 `UserMenu`）⇒ 本函数不会被调用；
 * - 失败码（官方 `INVALID_PASSWORD` 等）由调用方经 `tErr` 呈现。
 */
export async function changePassword(
  body: { currentPassword: string; newPassword: string },
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await apiPost('/api/auth/change-password', { ...body, revokeOtherSessions: true }, opts);
}
