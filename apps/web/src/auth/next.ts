/**
 * 路由安全单点（批 design §4.3 + §4.2 ②；**件 9**）。
 *
 * 纯函数 + 一份前缀清单，被 **4 处**消费：
 * - `sanitizeNext(raw)` —— `next` 白名单：反向守卫回跳（`/login`）与 401 分流生成点的**唯一净化器**
 * - `isProtectedRoute(pathname)` —— 401 分流**第 ② 类**的判定（`api/client` 的 `doFetch` 消费）
 * - `PROTECTED_PREFIXES` —— 受保护**路由**前缀（与主 design §5.2 路由清单同源）
 *
 * ⚠ **判定域（Q14 · 实测）**：`isProtectedRoute` 收的是**当前浏览器路由**
 * （`window.location.pathname`），**不是** API 请求路径——全仓 `apiGet` 的 path 一律
 * `/api/assets` / `/api/labels` / … 与路由前缀**不同域**，拿请求路径匹配**永不命中**
 * （那会让 401 分流整体失效）。
 *
 * 依赖：**零 import**（纯模块）——因此 `api/client` 可安全引用它而**不形成环**
 * （`AuthProvider → api/auth → api/client → auth/next`，末段为叶子）。
 */

/**
 * 受保护**路由**前缀（4 个；主 design §5.2 路由清单的受保护子集）。
 * 其余（M4a 五路由 + `/login`）为公开段 —— 401 静默当 anon（design §4.2 ③）。
 */
export const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/reviews', '/device'] as const;

/**
 * 当前路由是否受保护。
 *
 * 前缀匹配含段边界（`/admin` 命中 `/admin` 与 `/admin/reviews`，**不命中** `/administrator`）。
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 控制字符（U+0000–U+001F）检测 —— 防 header / URL 注入。
 * **逐字符码点判定**（而非正则字面量）：biome `noControlCharactersInRegex` 禁止正则内控制字符，
 * 且码点比较语义更直白。
 */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return true;
  }
  return false;
}

/** 控制字符的 URL 编码形态（`%00`–`%1f`）；注意 `%2F`（`/`）不在该区间 */
const ENCODED_CONTROL = /%(0[0-9a-f]|1[0-9a-f])/i;

/** 编码反斜杠 `%5C`（大小写不敏感） */
const ENCODED_BACKSLASH = /%5c/i;

/**
 * `/device` 站内路由（带可选设备码）——**唯一**构造该路由 query 的页面侧落点。
 *
 * 用途：未登录访 `/device?user_code=…` 时生成回跳 URL（`/login?next=<本值>`），
 * 使「保码」逻辑集中一处（页面不出现裸拼接；`user_code` 字面量只在本文件与 `api/auth.ts` 出现）。
 *
 * ⚠️ 语义区别：`api/auth.ts` 的 `claimDevice` 拼的是 **API 请求** query（同一参数名、下划线），
 * 本函数拼的是 **站内路由** URL——二者字面相同但域不同。
 */
export function devicePath(userCode?: string | null): string {
  const code = (userCode ?? '').trim();
  return code ? `/device?user_code=${encodeURIComponent(code)}` : '/device';
}

/**
 * `next` 白名单（design §4.3）——**仅接受以单个 `/` 开头的站内相对路径**：
 *
 * | 输入 | 结果 | 理由 |
 * |------|------|------|
 * | `//evil.com` | `null` | 协议相对 URL |
 * | `https://x.com/a` | `null` | 不以 `/` 开头（含协议） |
 * | `/​\evil.com` · 任意含 `\` | `null` | 浏览器把 `\` 归一为 `/` ⇒ **协议相对 URL**（开放重定向，Q16） |
 * | `/%5Cevil.com` | `null` | 同上（编码形态） |
 * | 含控制字符 / `%00`-`%1f` | `null` | 注入面 |
 * | `/device?user_code=ABCD-1234` | **原样** | **支持 query** ⇒ 设备流深链不丢码 |
 * | `/dashboard` · `/` | **原样** | 站内相对路径 |
 * | `''` · `null` · `undefined` | `null` | 空值 |
 *
 * 非法一律回 `null`，由调用方回落 `/dashboard`（design §4.3）。
 *
 * 注：**不需要 `origin` 参数**（design §4.3 原签名 `sanitizeNext(raw, origin)`）——
 * 「仅站内相对路径」规则已排除一切跨源形态，origin 对比属冗余（执行期简化，见批 plan T2 落地记录）。
 */
export function sanitizeNext(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (!raw.startsWith('/')) return null;
  const second = raw.charAt(1);
  // 次字符既非 `/`（协议相对）也非 `\`（浏览器归一为 `/`）；`raw === '/'` 时 second 为空串，合法
  if (second === '/' || second === '\\') return null;
  if (raw.includes('\\')) return null;
  if (ENCODED_BACKSLASH.test(raw)) return null;
  if (hasControlChar(raw)) return null;
  if (ENCODED_CONTROL.test(raw)) return null;
  return raw;
}
