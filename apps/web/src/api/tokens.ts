/**
 * /api/tokens（M4b-3 T4：**我的令牌**读面 + 创建 / 编辑 / 删除）。
 *
 * 契约（批 design §4.2 / §5 / §7；服务端 `http/tokens.ts`）：
 * - `GET /api/tokens` ⇒ `{ items: ApiKeyRow[] }`（**仅本人**、无分页——本人令牌量小）
 * - `POST /api/tokens { name, scope? }` ⇒ 201 `{ id, token, expiresAt }`（**明文仅此一次**）
 * - `PATCH /api/tokens/:id { name, scope? }` ⇒ 200 单条 `ApiKeyRow`（M4b-3 T3 新增；**仅本人**）
 * - `DELETE /api/tokens/:id` ⇒ 204（服务端语义 = 吊销「`enabled=false`」留行；**UI 措辞「删除」**）
 *
 * ⚠️ 三条硬口径（M4b-3 定案，勿凭记忆改）：
 * 1. **`name` 必填**（新建与编辑皆不可为空；服务端 `trim()` 后 1..32 字，缺/空 ⇒ 400）
 * 2. `scope`：**省略** = 新建为「全量」/ 编辑为「不改权限」；**`[]` = 全量**（不是「无权限」）
 * 3. 令牌**彻底私有**：列表 / 编辑 / 删除一律**仅本人**（他人含超管 ⇒ 404，前端当不存在处理）
 */
import {
  type ApiGetOptions,
  type ApiWriteOptions,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from './client.js';

/** scope 码（与 `05 §6.4` / 服务端 `auth/token-scopes.ts` 5 码同集；**顺序即 UI 展示顺序**） */
export const TOKEN_SCOPE_CODES = [
  'asset:publish',
  'asset:manage',
  'review:submit',
  'review:approve',
  'audit:read',
] as const;

export type TokenScopeCode = (typeof TOKEN_SCOPE_CODES)[number];

/** 令牌列表项（服务端 `ApiKeyRow` 的同形投影，9 字段） */
export interface ApiKeyRow {
  id: string;
  /** 逗号串；`''` = 全量（服务端 `permissions` 为空/NULL 时归一） */
  scope: string;
  /** 名称（旧令牌无名称 ⇒ `null`，UI 兜底「—」） */
  name: string | null;
  /** 明文前 12 位（含 `aih_` 前缀）；M4b-pre 迁移前的旧行 ⇒ `null` */
  start: string | null;
  /** 明文后 4 位（服务端 `metadata.tail`）；旧行 ⇒ `null` */
  tail: string | null;
  /** ISO 字符串；`null` = 永不过期 */
  expiresAt: string | null;
  /** ISO 字符串；`null` = 有效；非空 = 已吊销 */
  revokedAt: string | null;
  createdAt: string;
  /** 最后使用（官方 verify 路径写入）；`null` = 从未使用 */
  lastRequest: string | null;
}

export interface TokenListResponse {
  items: ApiKeyRow[];
}

/** 创建响应：明文**只在这里出现一次**（库中仅官方哈希，不可回流） */
export interface IssuedToken {
  id: string;
  token: string;
  expiresAt: string | null;
}

/** 创建 / 编辑共用的请求体（`name` 必填；`scope` 语义见文件头 ②） */
export interface TokenUpsertBody {
  name: string;
  scope?: readonly TokenScopeCode[];
}

/** 本人令牌列表（仅有效与已吊销均返回；「只显有效」由页面过滤 `revokedAt === null`） */
export async function fetchTokens(opts?: ApiGetOptions): Promise<TokenListResponse> {
  return apiGet<TokenListResponse>('/api/tokens', opts);
}

/** 创建令牌（明文一次性）；`scope` 省略 = 全量 */
export async function createToken(
  body: TokenUpsertBody,
  opts?: ApiWriteOptions,
): Promise<IssuedToken> {
  return apiPost<IssuedToken>('/api/tokens', body, opts);
}

/** 编辑令牌（改名 + 改权限）⇒ 200 单条（与列表 item 同形，可直接回填） */
export async function updateToken(
  id: string,
  body: TokenUpsertBody,
  opts?: ApiWriteOptions,
): Promise<ApiKeyRow> {
  return apiPatch<ApiKeyRow>(`/api/tokens/${encodeURIComponent(id)}`, body, opts);
}

/** 删除令牌（服务端语义 = 吊销，返回 204 无体 ⇒ `void`） */
export async function deleteToken(id: string, opts?: ApiWriteOptions): Promise<void> {
  await apiDelete<void>(`/api/tokens/${encodeURIComponent(id)}`, opts);
}
