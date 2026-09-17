/**
 * 登录页 `/login`（批 design **§14.4 A** 落地规格 · §5.1 功能契约 · §4.3 反向守卫 · §4.2 ④ inline 失败态）。
 *
 * **2026-09-17 UI 重做（T13 · 方向 V1 浅蓝·品牌承载）**：
 * - **全屏双栏** `grid-cols-[minmax(0,42%)_minmax(0,58%)]` + `min-h-svh`——**不套 `AuthLayout`**
 *   （该件随 T14 退役）：左栏 = `--gradient-brand` 品牌面板，右栏 = 表单区（**无白卡**）
 * - **无 tab**（Q9）：单表单 + 底部「使用 OAuth 登录」文本按钮 ⇒ 切**备用面板**（OAuth 说明 +
 *   打开统一认证页 + 返回密码登录）；语言切换器落**右栏右上角**（Q10）
 * - 尺寸档（实测口径见 §14.4 A）：表单列 **336** · 字段 **48/圆角 28** · 主按钮 **42 胶囊** ·
 *   字段间距 **22**；令牌语义 = `bg-muted` / `border-input` / `placeholder:text-muted-foreground/60`
 *
 * **功能契约零变更**（本页重写只动视觉）：
 * 1. `loading`（`bootstrapAuth` 未返回）→ 官方 `Skeleton` 骨架、**不渲染表单**（Y3：防「表单闪现 →
 *    反向守卫跳走」竞态）；骨架**镜像表单列**（同宽同节奏）⇒ 切态无跳动
 * 2. `authed`（已登录访 `/login`）→ **反向守卫** `<Navigate to={next ?? '/'} />`（**Q1：`next` 优先** · 无 `next` 落**首页**，2026-09-17 拍板）
 * 3. `anon` → 表单；失败态**全部 inline**（`skipAuthRedirect` ⇒ 401 不退化全局跳转，**错口令 URL 不变**），
 *    文案经 `tErr()` 本地化（07 §4：页面不直读 `code`）
 * 4. 成功链：`invalidateCache()`（全量）→ `refresh()`（真实重取 `/me`）→ 跳 `next ?? '/'`（无 `next` 落首页）
 * 5. OAuth 入口（Q2 = B+）：`<a target="_blank" rel="noreferrer">` 直跳、**不做前置探测**（`GET /authorize`
 *    有写 `oidc_state` cookie 的副作用）；未启用时落独立标签页 JSON 404（可关闭、不破坏本页）
 *
 * ⚠ **已知缺口（F5 登记，本批不处理）**：OIDC 成功 302 `/?oidc=success`（**不经 `next`**）落门户首页，
 * 门户面零 `oidc` 消费点 ⇒ 会话 Cookie 已建但 `AuthProvider` 不知情（需刷新才见登录态）；消费点落门户面
 * 会碰 M4a **零回归硬约束** ⇒ 交 M4b 收尾 / M4c（主 design §7.2 G6 延续）。
 *
 * **无注册入口**（企业目录 + 管理员建号，05 §3.1）；用户名字段为**中性文案**（非「邮箱」——
 * 企业目录通道用 `sAMAccountName`）。左栏品牌字与许可行**硬编码**（品牌陈述，先例 = `TopBar` 品牌字）。
 */
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { ApiError, invalidateCache } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { sanitizeNext } from '@/auth/next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Spinner } from '@/components/ui/shadcn/spinner';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * OAuth 授权入口 —— **站内同源路径**（服务端 `/api/auth/oidc/authorize`）。
 * **不做前置探测**（Q2 = B+）：探测会写 `oidc_state` cookie，且未启用时的 404 由新标签页自行呈现。
 */
const OIDC_AUTHORIZE_URL = '/api/auth/oidc/authorize';

/** 字段与主按钮的共用尺寸档（§14.4 A：输入 48 / 圆角 28 / 间距 22 / 按钮 42） */
const FIELD_CLASS =
  'h-12 rounded-[28px] border-input bg-muted px-4 placeholder:text-muted-foreground/60 focus-visible:border-primary/40';
const SUBMIT_CLASS = 'h-[42px] w-full rounded-full';

/** 左栏（品牌面板）——三段式 `justify-between`；文案走 `login` 组键，品牌字与许可行硬编码 */
function BrandPanel() {
  const { t } = useI18n();
  return (
    <section
      className="relative flex flex-col justify-between p-12 text-white"
      style={{ backgroundImage: 'var(--gradient-brand)' }}
    >
      <div>
        <div className="text-[17px] font-bold tracking-[-0.3px]">AI X Hub</div>
        <div className="mt-1 text-xs text-white/70">{t('login', 'brandTagline')}</div>
      </div>
      <div>
        <h1 className="text-[34px] font-bold leading-tight">{t('login', 'heroTitle')}</h1>
        <p className="mt-3 max-w-md text-sm text-white/80">{t('login', 'heroDesc')}</p>
        <ul className="mt-8 space-y-3 text-sm text-white/85">
          <li>· {t('login', 'feature1')}</li>
          <li>· {t('login', 'feature2')}</li>
          <li>· {t('login', 'feature3')}</li>
        </ul>
      </div>
      <div className="text-xs text-white/60">Apache 2.0 · 可自托管</div>
    </section>
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
  /** 备用面板（Q9：OAuth 链接 ⇒ 面板；不再用 tab） */
  const [altMode, setAltMode] = useState(false);

  // `next` 白名单校验（design §4.3 单点 `sanitizeNext`）：非法/缺失 ⇒ `null` ⇒ 回落 `/dashboard`
  // 默认落点 = **首页**（2026-09-17 用户拍板「按推荐」）：`next` 仍**优先**（被拦截后登录回原页），
  // 无 `next` 时才落 `/`（原为 `/dashboard`）。同一条链同时服务「反向守卫」（已登录访 /login）与
  // 「登录成功跳转」两处出口 ⇒ 二者行为天然一致。
  const destination = sanitizeNext(new URLSearchParams(search).get('next')) ?? '/';

  // ① 首帧骨架（**不渲染表单**）——骨架镜像表单列（同宽 336 + 同节奏），切态无跳动
  if (state.status === 'loading') {
    return (
      <div className="relative grid min-h-svh grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        <BrandPanel />
        <section className="relative flex items-center justify-center px-12">
          <div className="absolute top-6 right-6">
            <LanguageSwitcher />
          </div>
          <div className="w-full max-w-[336px]">
            <Skeleton className="mx-auto h-8 w-40" />
            <Skeleton className="mx-auto mt-2 h-4 w-52" />
            <div className="mt-6 flex flex-col gap-[22px]">
              <Skeleton className="h-12 w-full rounded-[28px]" />
              <Skeleton className="h-12 w-full rounded-[28px]" />
              <Skeleton className="h-[42px] w-full rounded-full" />
            </div>
          </div>
        </section>
      </div>
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
    <div className="relative grid min-h-svh grid-cols-[minmax(0,42%)_minmax(0,58%)]">
      <BrandPanel />
      <section className="relative flex items-center justify-center px-12">
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>
        {/* 右栏内**水平 + 垂直居中**（§14.4 A）；表单直落页面底 ⇒ **无白卡** */}
        <div className="w-full max-w-[336px]">
          <h2 className="text-center text-[24px] font-semibold tracking-[-0.2px]">
            {t('login', 'title')}
          </h2>
          <p className="mt-1 text-center text-[13px] text-muted-foreground">
            {t('login', 'subtitle')}
          </p>

          <div className="mt-6">
            {altMode ? (
              <div className="flex flex-col gap-[22px]">
                <p className="text-[13px] leading-[22px] text-muted-foreground">
                  {t('login', 'oidcHint')}
                </p>
                <Button asChild className={SUBMIT_CLASS}>
                  <a href={OIDC_AUTHORIZE_URL} target="_blank" rel="noreferrer">
                    {t('login', 'oidcOpen')}
                  </a>
                </Button>
              </div>
            ) : (
              /* `noValidate`：空值/格式交服务端（错误码经 `tErr` 落 inline 错误条，不用浏览器原生气泡） */
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[22px]">
                <Input
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  required
                  aria-label={t('login', 'username')}
                  placeholder={t('login', 'username')}
                  className={FIELD_CLASS}
                  value={username}
                  disabled={submitting}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-label={t('login', 'password')}
                  placeholder={t('login', 'password')}
                  className={FIELD_CLASS}
                  value={password}
                  disabled={submitting}
                  onChange={(event) => setPassword(event.target.value)}
                />

                {/* 失败态 = inline 错误行（**非 Alert 块**），位置在密码字段与主按钮之间（§14.4 A） */}
                {errorCode ? (
                  <p role="alert" className="px-1 text-[13px] leading-[22px] text-destructive">
                    {tErr(errorCode)}
                  </p>
                ) : null}

                <Button type="submit" className={SUBMIT_CLASS} disabled={submitting}>
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
            )}
          </div>

          {/* 底部浅色链接（§14.4 A：仅此一条 —— 与备用面板互为出入口） */}
          <div className="mt-4 flex items-center justify-center text-[13px]">
            <button
              type="button"
              onClick={() => setAltMode((value) => !value)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {altMode ? t('login', 'backToForm') : t('login', 'oidcLink')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
