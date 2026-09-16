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
import { ApiError, type ApiGetOptions, apiGet, apiPost } from './client.js';

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
