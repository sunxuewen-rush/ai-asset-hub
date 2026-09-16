/**
 * 会话上下文（批 design §3.1 件 1 · §4.1「三态与首帧」）。
 *
 * 三态 `loading | anon | authed`：
 * - `loading`：`/me` 未返回 —— **不外泄 anon**（首帧由消费方渲染 `Skeleton`，**绝不**先渲染
 *   「未登录」形态再切换，那就是「闪」）
 * - `anon`：401（会话过期）**与** `/me` 非 401 失败（网络断 / 5xx）—— 后者**保持 anon 不阻塞壳渲染**
 *   （design §4.1：登记为已知代价，恢复由下一次任意请求触发）
 * - `authed`：`{ user: { id, displayName }, role }`（`role` = 数值 4 档，服务端 `auth-routes.ts:17-28`）
 *
 * **首帧预热**：`main.tsx` 模块顶层调用 `bootstrapAuth()`（**不 `await`**）——`/me` 与首屏渲染并行，
 * 结果由 `<AuthProvider>` 复用（不重复请求）。
 *
 * **401 单点分流**：登记口在 `api/client`（`setUnauthorizedHandler`），**判定在 client 侧**（T2 落四分类）；
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
import { type AuthUser, type MeResponse, me } from '../api/auth.js';
import { setUnauthorizedHandler } from '../api/client.js';

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
 * 首次 `/me` 预取（模块级单例）。
 *
 * 失败一律 → `null`（= anon）：401（会话过期）与网络/5xx 在**状态机层面等价**
 * （design §4.1：非 401 失败保持 anon，不区分错误态、不阻塞壳渲染）。
 */
let mePrefetch: Promise<MeResponse | null> | null = null;

function prefetchMe(): Promise<MeResponse | null> {
  if (!mePrefetch) mePrefetch = me().catch(() => null);
  return mePrefetch;
}

/**
 * 首帧预热（design U3）：**在 `main.tsx` 模块顶层调用、不要 `await`**。
 * 只负责提前发起 `/me`；状态推进由 `<AuthProvider>` 挂载时接管。
 */
export function bootstrapAuth(): void {
  void prefetchMe();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const load = useCallback(async () => {
    const res = await prefetchMe();
    setState(res ? { status: 'authed', user: res.user, role: res.role } : { status: 'anon' });
  }, []);

  // 挂载即探测（复用 `bootstrapAuth()` 已发出的预热请求）
  useEffect(() => {
    void load();
  }, [load]);

  // 401 分流**登记口**（判定与跳转参数由 client 侧给出；四分类在 T2 落地）
  useEffect(
    () =>
      setUnauthorizedHandler((path, search) => {
        setState({ status: 'anon' });
        navigate(`/login?next=${encodeURIComponent(`${path}${search}`)}`, { replace: true });
      }),
    [navigate],
  );

  const refresh = useCallback(async () => {
    mePrefetch = null; // 丢弃预热值：登录/登出后必须真实重取（design §4.4「清缓存 + 重取」）
    setState({ status: 'loading' });
    await load();
  }, [load]);

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
