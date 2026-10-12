/**
 * 登录页 `/login`（批 design **§14.4 A** 落地规格 · §5.1 功能契约 · §4.3 反向守卫 · §4.2 ④ inline 失败态；
 * **M4c-3 T7**：表单下方 provider **文字链一行**（批 design §4.1 / §4.2 / §4.5）。
 *
 * **2026-09-17 UI 重做（T13 · 方向 V1 浅蓝·品牌承载）**：
 * - **全屏双栏** `grid-cols-[minmax(0,42%)_minmax(0,58%)]` + `min-h-svh`——**不套 `AuthLayout`**
 *   （该件随 T14 退役）：左栏 = `--gradient-brand` 品牌面板，右栏 = 表单区（**无白卡**）
 * - **无 tab**（Q9）：单表单 + 表单下方 provider **文字链一行**（**M4c-3 T7**：按服务端启用集渲染 ·
 *   项间 1×12 竖线 · 常态下划线 · **0 项整行不渲染**）；语言切换器落**右栏右上角**（Q10）
 * - 尺寸档（实测口径见 §14.4 A）：表单列 **336** · 字段 **48/圆角 28** · 主按钮 **42 胶囊** ·
 *   字段间距 **22**；令牌语义 = `bg-muted` / `border-input` / `placeholder:text-muted-foreground/60`
 *
 * **功能契约零变更**（本页重写只动视觉）：
 * 1. `loading`（`bootstrapAuth` 未返回）→ 官方 `Skeleton` 骨架、**不渲染表单**（Y3：防「表单闪现 →
 *    反向守卫跳走」竞态）；骨架**镜像表单列**（同宽同节奏）+ **链接行位**（**随启用集条件渲染**、
 *    与真实页面同一 16px 间距）⇒ 切态**零跳动**
 * 2. `authed`（已登录访 `/login`）→ **反向守卫** `<Navigate to={next ?? '/'} />`（**Q1：`next` 优先** · 无 `next` 落**首页**，2026-09-17 拍板）
 * 3. `anon` → 表单；失败态**全部 inline**（`skipAuthRedirect` ⇒ 401 不退化全局跳转，**错口令 URL 不变**），
 *    文案经 `tErr()` 本地化（07 §4：页面不直读 `code`）
 * 4. 成功链：`invalidateCache()`（全量）→ `refresh()`（真实重取 `/me`）→ 跳 `next ?? '/'`（无 `next` 落首页）
 * 5. 外部身份源入口（M4c-3 T7 · design §4.1）：表单下方**文字链一行**，按服务端启用集
 *    `GET /api/meta/auth-providers` 渲染（0 项 ⇒ 整行不渲染）；点击 ⇒ SDK `signIn.social({ provider,
 *    callbackURL })` **同页跳转**（官方社交通道是 **POST** 端点 ⇒ 不能照抄 `<a href>` 直跳）；
 *    失败 ⇒ inline 错误条落**链接行之下**（E2），与表单错误**互斥**。
 *
 * **F5 缺口已消解（M4c-3 T7）**：原自绘 OIDC 成功 302 `/?oidc=success`（**不经 `next`**）⇒ 会话已建而
 * 门户面不知情（需刷新才见登录态）；现入口改走官方社交通道 + `callbackURL = destination`（**严格走 `next`** ·
 * `auth/next.ts` 单点）⇒ 回调即整页重载、登录态当场就位（design §4.1 步 2）。
 *
 * **无注册入口**（企业目录 + 管理员建号，05 §3.1）；用户名字段为**中性文案**（非「邮箱」——
 * 企业目录通道用 `sAMAccountName`）。左栏品牌字与许可行**硬编码**（品牌陈述，先例 = `TopBar` 品牌字）。
 */
import { type FormEvent, Fragment, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login, signInWithProvider } from '@/api/auth';
import { ApiError, invalidateCache } from '@/api/client';
import { fetchAuthProviders } from '@/api/meta';
import { useAuth } from '@/auth/AuthProvider';
import { sanitizeNext } from '@/auth/next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Spinner } from '@/components/ui/shadcn/spinner';
import { type DictKey, useI18n } from '@/i18n/I18nProvider';

/**
 * 启用集 provider 键 → `login` 组文案键（**键名字面只住 i18n 字典**；此处仅 id → 键名映射）。
 *
 * 为什么需要映射：键名大小写并非 id 的机械变换（`github` ⇒ `providerGitHub` 含大写 H）
 * ⇒ 不做动态拼接，避免拼错静默落「未命中」。**未知键**（服务端未来新增 provider）⇒ 调用侧
 * **原样显示 id**（不丢入口，同审计分组「未知前缀原样显示」口径）。
 */
const PROVIDER_LABEL_KEY: Record<string, DictKey<'login'>> = {
  microsoft: 'providerMicrosoft',
  google: 'providerGoogle',
  github: 'providerGitHub',
  wechat: 'providerWechat',
};

/** 启用集取数兜底上限（ms）—— 端点无响应时按「未启用」处理，**不留死入口 / 不卡骨架** */
const PROVIDERS_TIMEOUT_MS = 3000;

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
  /** 入口失败（provider 未装配 / 网络）—— 与表单错误**互斥**（design §4.5 · P4 + R6） */
  const [providerFailed, setProviderFailed] = useState(false);
  /** 外部身份源启用集（`null` = 未取到 ⇒ 仍算骨架期；`[]` = 未启用 ⇒ 链接行整体不渲染） */
  const [providers, setProviders] = useState<string[] | null>(null);

  // `next` 白名单校验（design §4.3 单点 `sanitizeNext`）：非法/缺失 ⇒ `null` ⇒ 回落 `/dashboard`
  // 默认落点 = **首页**（2026-09-17 用户拍板「按推荐」）：`next` 仍**优先**（被拦截后登录回原页），
  // 无 `next` 时才落 `/`（原为 `/dashboard`）。同一条链同时服务「反向守卫」（已登录访 /login）与
  // 「登录成功跳转」两处出口 ⇒ 二者行为天然一致。
  const destination = sanitizeNext(new URLSearchParams(search).get('next')) ?? '/';

  // 启用集取数（design §4.1 取数步）：进页取**一次** · 不落持久缓存 · 卸载即中止
  useEffect(() => {
    const controller = new AbortController();
    // 兜底上限：端点无响应 ⇒ 按「未启用」处理（`[]`）—— **不留死入口 / 不把登录页卡在骨架**
    const timer = setTimeout(() => setProviders((current) => current ?? []), PROVIDERS_TIMEOUT_MS);
    fetchAuthProviders({ signal: controller.signal })
      .then((list) => setProviders(list))
      .catch(() => {
        // 中止（卸载竞态）⇒ 忽略；其余失败已由 `fetchAuthProviders` 归一为 `[]`
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // ① 首帧骨架（**不渲染表单**）——骨架镜像表单列（同宽 336 + 同节奏）+ **链接行位**（随启用集条件
  // 渲染）；`anon` 且启用集未取到 ⇒ 仍留骨架（否则链接行位会在表单落屏后补画 ⇒ 跳动）
  if (state.status === 'loading' || (state.status === 'anon' && providers === null)) {
    return (
      <div className="relative grid min-h-svh grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        <BrandPanel />
        <section className="relative flex items-center justify-center px-12">
          <div className="absolute top-6 right-6">
            <LanguageSwitcher />
          </div>
          <div className="w-full max-w-[336px]">
            {/* 占位尺寸档 = **真实文本盒**（标题 `text-[24px]`/lh 36 ⇒ `h-9`；副标题与链接行
                `text-[13px]`/lh 19.5 ⇒ `h-[19.5px]`）—— 否则切态列高差 5px（**T7 实测**） */}
            <Skeleton className="mx-auto h-9 w-40" />
            <Skeleton className="mx-auto mt-1 h-[19.5px] w-52" />
            <div className="mt-6 flex flex-col gap-[22px]">
              <Skeleton className="h-12 w-full rounded-[28px]" />
              <Skeleton className="h-12 w-full rounded-[28px]" />
              <Skeleton className="h-[42px] w-full rounded-full" />
            </div>
            {/* 链接行位：**同一 16px 间距** + 随启用集条件渲染（0 启用 ⇒ 不多画 ⇒ 零跳动） */}
            {providers && providers.length > 0 ? (
              <div className="mt-4">
                <Skeleton className="h-[19.5px] w-full rounded-md" />
              </div>
            ) : null}
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
    setProviderFailed(false); // 两条错误**互斥**（design §4.5 · P4 + R6）
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

  /** 点 provider 链（design §4.1 步 1–3）：成功 ⇒ SDK **同页跳转**（本函数不再继续）；失败 ⇒ inline 错误条 */
  async function onProvider(provider: string) {
    setErrorCode(null);
    setProviderFailed(false);
    try {
      await signInWithProvider(provider, destination);
    } catch {
      setProviderFailed(true);
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
            {/* `noValidate`：空值/格式交服务端（错误码经 `tErr` 落 inline 错误条，不用浏览器原生气泡） */}
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

              {/* 表单失败态 = inline 错误行（**非 Alert 块**），位置在密码字段与主按钮之间（§14.4 A） */}
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

            {/* M4c-3 T7：外部身份源入口 = **文字链一行**（按启用集渲染 · 1 项无竖线 · 0 项整行不渲染）
                · 主按钮 ↔ 链接行 **16px**（design P16）· 常态下划线（offset 4）· 项间 1×12 竖线 */}
            {providers && providers.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px]">
                {providers.map((provider, index) => (
                  <Fragment key={provider}>
                    {index > 0 ? (
                      <span aria-hidden="true" className="h-3 w-px flex-none bg-border" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onProvider(provider)}
                      className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                    >
                      {PROVIDER_LABEL_KEY[provider]
                        ? t('login', PROVIDER_LABEL_KEY[provider])
                        : provider}
                    </button>
                  </Fragment>
                ))}
              </div>
            ) : null}

            {/* 入口失败行 ⇒ 落**链接行之下**（E2 · design §4.5）；与表单错误互斥 ⇒ 不同屏两条红字 */}
            {providerFailed ? (
              <p
                role="alert"
                className="mt-2 px-1 text-center text-[13px] leading-[22px] text-destructive"
              >
                {t('login', 'providerFailed')}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
