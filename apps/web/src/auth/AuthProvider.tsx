/**
 * 会话上下文（批 design §3.1 件 1 · §4.1「三态与首帧」；**M4c-1 T5：会话层改官方 SDK**）。
 *
 * 三态 `loading | anon | authed`（**对外契约不变**）：
 * - `loading`：官方 SDK `useSession()` 未落定，**或**已登录但 `/me` 未回（role 未定）—— **绝不**先渲染
 *   「未登录」形态再切换（那就是「闪」，design §4.1）
 * - `anon`：SDK 会话为空（未登录 / 会话过期）**或**非 401 失败（网络断 / 5xx）—— 后者保持 anon 不阻塞壳渲染
 * - `authed`：`{ user: { id, displayName }, role }`
 *   · `user` 取自 SDK 会话（官方 `name` → 本仓 `displayName`，**字段适配 B9**）
 *   · `role` 以 `/api/auth/me` 为准（**T5 拍板「甲」**：B1 保留 `/me`、21 处调用零改、行为等价）；
 *     `/me` 未回时用 SDK 会话的官方文本档经 `roleLevelOf()`（**B8 档位适配**）兜底
 *
 * **首帧预热**：`main.tsx` 模块顶层调用 `bootstrapAuth()`（**不 `await`**）——`/me` 与首屏渲染并行，
 * 结果由 `<AuthProvider>` 复用（不重复请求）。官方 SDK 会话请求由 `useSession()` 自行发起。
 *
 * **401 单点分流**：登记口在 `api/client`（`setUnauthorizedHandler`），**判定在 client 侧**（四分类）；
 * 本文件只负责「置 anon + 跳 `/login?next=`」。依赖方向 `auth/* → api/*` 为**单向**（防 ESM 循环）。
 *
 * **不做静默续期**（design §4.1）；过期由任意请求 401 触发分流。
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { type AuthUser, type MeResponse, me, useAuthSession } from '../api/auth.js';
import { setUnauthorizedHandler } from '../api/client.js';
import { roleLevelOf } from './roles.js';

export type AuthStatus = 'loading' | 'anon' | 'authed';

/** 判别联合（类型安全：`status === 'authed'` 时 `user`/`role` 收窄为非空） */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'authed'; user: AuthUser; role: number };

interface AuthContextValue {
  state: AuthState;
  /** 已登录档位（`loading` / `anon` = `null`）；消费点一律配 `hasRole`（design §4.5） */
  role: number | null;
  /** 已登录用户（同上 = `null`） */
  user: AuthUser | null;
  /** 重新探测会话（**绕过预热缓存**）——登录成功 / 登出后由消费方调用（design §4.4） */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 官方 SDK 会话用户的**结构子集**（只取本文件用到的字段）。
 *
 * 官方 `useSession()` 的 `user` 类型由客户端配置推断；本仓未启用 `inferAdditionalFields`
 * （需跨包引服务端 auth 类型 ⇒ 反向依赖，不做）⇒ 按**用到的字段**最小标注。
 * `role` = 官方（`admin` 插件）文本档名，仅用于 `/me` 未回时的兜底（经 `roleLevelOf` 归一）。
 */
interface SessionUserSubset {
  id?: string;
  name?: string | null;
  role?: string | number | null;
}

/**
 * 首次 `/me` 预取（模块级单例）。
 *
 * 失败一律 → `null`（= 无 role 真值）：401（会话过期）与网络/5xx 在**状态机层面等价**
 * （design §4.1：非 401 失败保持 anon，不区分错误态、不阻塞壳渲染）。
 */
let mePrefetch: Promise<MeResponse | null> | null = null;

function prefetchMe(): Promise<MeResponse | null> {
  if (!mePrefetch) mePrefetch = me().catch(() => null);
  return mePrefetch;
}

/**
 * 首帧预热（design U3）：**在 `main.tsx` 模块顶层调用、不要 `await`**。
 * 只负责提前发起 `/me`（role 真值）；登录态由 SDK `useSession()` 推进。
 */
export function bootstrapAuth(): void {
  void prefetchMe();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  /** 官方 SDK 会话（登录态真值）：`isPending` = 未落定 */
  const { data: session, isPending, refetch } = useAuthSession();
  /** `/me` 出参（role 数值档真值；失败 = `null`） */
  const [meRes, setMeRes] = useState<MeResponse | null>(null);
  const [roleReady, setRoleReady] = useState(false);

  const loadRole = useCallback(async () => {
    const res = await prefetchMe();
    setMeRes(res);
    setRoleReady(true);
  }, []);

  // 挂载即探测（复用 `bootstrapAuth()` 已发出的预热请求）
  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  // 401 分流**登记口**（判定与跳转参数由 client 侧给出；四分类在 client 侧单点）
  useEffect(
    () =>
      setUnauthorizedHandler((path, search) => {
        setMeRes(null);
        setRoleReady(true);
        navigate(`/login?next=${encodeURIComponent(`${path}${search}`)}`, { replace: true });
      }),
    [navigate],
  );

  const refresh = useCallback(async () => {
    mePrefetch = null; // 丢弃预热值：登录/登出后必须真实重取（design §4.4「清缓存 + 重取」）
    setRoleReady(false);
    await refetch(); // SDK 重读会话（跨标签页同步由 client core 的 broadcast channel 承担）
    await loadRole();
  }, [refetch, loadRole]);

  const sessionUser = (session as { user?: SessionUserSubset } | null | undefined)?.user;
  const userId = sessionUser?.id;
  const authed = typeof userId === 'string' && userId.length > 0;

  const state: AuthState =
    isPending || (authed && !roleReady)
      ? { status: 'loading' }
      : authed
        ? {
            status: 'authed',
            user: { id: userId, displayName: sessionUser?.name ?? userId },
            // `/me` 为权威；未回（网络/5xx）时用 SDK 会话的官方文本档兜底（B8 单点归一）
            role: meRes?.role ?? roleLevelOf(sessionUser?.role ?? null),
          }
        : { status: 'anon' };

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      role: state.status === 'authed' ? state.role : null,
      user: state.status === 'authed' ? state.user : null,
      refresh,
    }),
    [state, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
