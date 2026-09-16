/**
 * 认证端点封装（批 design §3.1 件 3 · §7「消费的既有端点」）。
 *
 * 契约（真码实证）：
 * - **登录** `POST /api/auth/sign-in/aih` —— **JSON** body `{username, password}`
 *   （`content-type: application/json` 必填；`apps/server/src/app.test.ts:115-119` 实证）；
 *   成功 200 `{user, session}` + `Set-Cookie: better-auth.session_token=…`。
 *   用户名走**自绘目录凭证插件**（本地账号短路 → 目录 bind → 回退本地，05 §3.1）——前端**无需分支**。
 * - **登出** `POST /api/auth/sign-out`（官方端点，M4b-pre 起为**唯一**登出端点，无旧别名）。
 * - **会话** `GET /api/auth/me` → `{ user: { id, displayName }, role }`
 *   （`apps/server/src/http/auth-routes.ts:17-28` 薄层）；未登录 401 `auth.session_expired`。
 *
 * 页面**不直读** `code`：错误统一由 `ApiError.code` 承载，本地化经 `useI18n().tErr`（07 §4）。
 */
import { type ApiGetOptions, apiGet, apiPost } from './client.js';

/** 会话用户（`/me` 契约的 `user` 子集；M4a 门户已消费同形状） */
export interface AuthUser {
  id: string;
  displayName: string;
}

/** `GET /api/auth/me` 响应（`role` 为数值 4 档——服务端 `?? ACCOUNT_ROLE.GUEST` 保证非空） */
export interface MeResponse {
  user: AuthUser;
  role: number;
}

/** `POST /api/auth/sign-in/aih` 成功响应（`session` 形状本批不消费，保持未知类型） */
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
  opts?: { signal?: AbortSignal },
): Promise<LoginResponse> {
  return apiPost<LoginResponse>(
    '/api/auth/sign-in/aih',
    { username, password },
    { signal: opts?.signal, skipAuthRedirect: true },
  );
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
export async function logout(opts?: { signal?: AbortSignal }): Promise<void> {
  await apiPost<unknown>('/api/auth/sign-out', {}, { signal: opts?.signal });
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
