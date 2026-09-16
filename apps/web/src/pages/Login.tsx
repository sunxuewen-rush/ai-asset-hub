/**
 * 登录页 `/login`（批 design §5.1 页面规格 · §4.3 反向守卫 · §4.2 ④ inline 失败态；线框见主 design §12）。
 *
 * **独立版式**：不入 `AppShell`（**无侧栏 / 无用户区**）——顶部品牌 + 语言切换器，中部居中官方 `Card`。
 *
 * 渲染顺序（**顺序敏感**，design §5.1 + Y3）：
 * 1. `loading`（`bootstrapAuth` 未返回）→ 官方 `Skeleton` 骨架、**不渲染表单**
 *    ——否则会「表单闪现 → 反向守卫跳走」的竞态闪烁
 * 2. `authed`（已登录访 `/login`）→ **反向守卫** `<Navigate to={next ?? '/dashboard'} />`
 *    （**Q1：`next` 优先**——保住 `/device?user_code=…` 的深链回跳）
 * 3. `anon` → 两 tab 表单
 *
 * **失败态全部 inline**（design §4.2 ④）：`login()` 已内置 `skipAuthRedirect: true` ⇒ 401 **不**退化为
 * 全局跳转，错误由表单内 `Alert` 展示（**实测断言：错口令 URL 不变**）；码经 `tErr()` 本地化
 * （07 §4：页面**不直读** `code` 的语义，未命中兜底 `errors.unknown`）。
 *
 * **成功链**（design §5.1）：`invalidateCache()`（全量）→ `refresh()`（真实重取 `/me`，绕过预热值）→
 * 跳 `next ?? '/dashboard'`。
 *
 * OAuth tab（Q2 = B+）：官方 `Button asChild` 包 `<a target="_blank" rel="noreferrer">` 直跳，
 * **不做前置探测**（`GET /authorize` 有写 `oidc_state` cookie 的副作用）；未启用时落在独立标签页的
 * JSON 404（`http/oidc-routes.ts:98` 返回 `{code:'oidc.not_configured'}`）——可关闭、不破坏登录页。
 *
 * ⚠ **本批不处理的已知缺口（登记）**：OIDC 成功 302 `/?oidc=success`（**不经 `next`**）落门户首页，
 * 而门户面零 `oidc` 消费点（2026-09-16 实测 `apps/web/src` grep 零命中）⇒ 会话 Cookie 已建但
 * `AuthProvider` 不知情，用户需刷新页面才见登录态。消费点落门户面会碰 M4a **零回归硬约束**
 * ⇒ 登记交 M4b 收尾 / M4c（主 design §7.2 G6 缺口的延续）。
 *
 * **无注册入口**（企业目录 + 管理员建号，05 §3.1）；用户名字段为**中性文案**（非「邮箱」——
 * 企业目录通道用 `sAMAccountName`）。
 */
import { TriangleAlert } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { ApiError, invalidateCache } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { sanitizeNext } from '@/auth/next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Alert, AlertTitle } from '@/components/ui/shadcn/alert';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/shadcn/field';
import { Input } from '@/components/ui/shadcn/input';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Spinner } from '@/components/ui/shadcn/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { useI18n } from '@/i18n/I18nProvider';

/** tab 值（两 tab：常规登录 / OAuth 登录） */
const TAB_LOCAL = 'local';
const TAB_OIDC = 'oidc';

/**
 * OAuth 授权入口 —— **站内同源路径**（服务端 `/api/auth/oidc/authorize`）。
 * **不做前置探测**（Q2 = B+）：探测会写 `oidc_state` cookie，且未启用时的 404 由新标签页自行呈现。
 */
const OIDC_AUTHORIZE_URL = '/api/auth/oidc/authorize';

/**
 * 登录页版式骨架（独立版式）：顶部品牌 + 语言切换器，中部居中内容。
 *
 * 与 `AppShell` 无关（**无侧栏 / 无顶栏件**）；品牌沿用 `TopBar` 的 `--gradient-brand` 渐变字
 * （视觉真值 SSOT = M4a design §4.4，此处引用不复制色值），并保留回门户首页的链接。
 */
function LoginScaffold({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center no-underline" aria-label="AI X Hub home">
          <b className="bg-[image:var(--gradient-brand)] bg-clip-text text-[17px] font-bold tracking-[-0.3px] text-transparent">
            AI X Hub
          </b>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-24">{children}</main>
    </div>
  );
}

export function Login() {
  const { state, refresh } = useAuth();
  const { t, tErr } = useI18n();
  const navigate = useNavigate();
  const { search } = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  /** 失败码（`ApiError.code` 或传输层 `network`）；`null` = 无错误条 */
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // `next` 白名单校验（design §4.3 单点 `sanitizeNext`）：非法/缺失 ⇒ `null` ⇒ 回落 `/dashboard`
  const destination = sanitizeNext(new URLSearchParams(search).get('next')) ?? '/dashboard';

  // ① 首帧骨架（**不渲染表单**——防「表单闪现 → 反向守卫跳走」）
  //    结构**镜像表单卡**（`CardHeader` 标题位 + `CardContent` 内容位）：两态卡片高度与间距一致，
  //    切态时无收缩跳动（否则骨架卡与表单卡的 padding 差异本身就成了新的闪动源）
  if (state.status === 'loading') {
    return (
      <LoginScaffold>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* 逐位镜像常规登录表单：Tabs 条 → （label + input）×2 → 提交钮 */}
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </LoginScaffold>
    );
  }

  // ② 反向守卫（design §4.3：`next` 优先）
  if (state.status === 'authed') {
    return <Navigate to={destination} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setErrorCode(null);
    setSubmitting(true);
    try {
      await login(username, password);
      invalidateCache(); // 全量清（design §4.4：登录后清缓存）
      await refresh(); // 真实重取 `/me`（丢弃预热值）
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : 'network');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginScaffold>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('login', 'title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={TAB_LOCAL}>
            <TabsList className="w-full">
              <TabsTrigger value={TAB_LOCAL}>{t('login', 'tabLocal')}</TabsTrigger>
              <TabsTrigger value={TAB_OIDC}>{t('login', 'tabOidc')}</TabsTrigger>
            </TabsList>

            {/* ── 常规登录：原生 `<form>` ⇒ Enter 提交 ── */}
            <TabsContent value={TAB_LOCAL}>
              {/* `noValidate`：空值/格式交服务端（错误码经 `tErr` 落 inline 错误条，不用浏览器原生气泡） */}
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="login-username">{t('login', 'username')}</FieldLabel>
                    <Input
                      id="login-username"
                      name="username"
                      autoComplete="username"
                      required
                      value={username}
                      disabled={submitting}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="login-password">{t('login', 'password')}</FieldLabel>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      disabled={submitting}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Field>
                </FieldGroup>

                {errorCode ? (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{tErr(errorCode)}</AlertTitle>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner />
                      {t('login', 'submitting')}
                    </>
                  ) : (
                    t('login', 'submit')
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ── OAuth 登录：新标签页直跳（零前置探测）── */}
            <TabsContent value={TAB_OIDC}>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">{t('login', 'oidcHint')}</p>
                <Button asChild variant="outline" className="w-full">
                  <a href={OIDC_AUTHORIZE_URL} target="_blank" rel="noreferrer">
                    {t('login', 'tabOidc')}
                  </a>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </LoginScaffold>
  );
}
