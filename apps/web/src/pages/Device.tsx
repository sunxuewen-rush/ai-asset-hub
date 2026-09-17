/**
 * 设备授权页 `/device`（批 design §5.2 四态 · §4.3 `next` 保码 · 主 design §3.4 基址与 dev 口径 · §7.1 device 三行）。
 *
 * **版式 = 独立**（**2026-09-17 UI 重做 T14 · 批 design §14.4 B**）：**不套 `AuthLayout`**（该件已退役）——
 * 单列居中 `min-h-svh` + 28×28 品牌小方块（`--gradient-brand`）+ 语言切换器置**右上角**；
 * 字段档与登录页同规格（48 / 圆角 28 / `bg-muted`+`border-input`）+ 授权码额外 `letter-spacing 2.52px`。
 *
 * **三态门（顺序敏感，与 `/login` 同构）**：
 * 1. `loading`（`bootstrapAuth` 未返回）→ 官方 `Skeleton` 骨架、**不渲染表单**
 * 2. `anon`（未登录）→ `<Navigate to={/login?next=/device?user_code=…} />` **保码回跳**（design §4.3 Q1）
 * 3. `authed` → 正常四态流程 + 自动认领
 *
 * ⚠️ **门② 是本页的实测修正（2026-09-16，T7）**——**不能依赖 401 分流**：官方
 * `GET /api/auth/device?user_code=` **未登录也返回 200**（只给 `status`、不给 `client_id`/`scope`，
 * 见 `api/auth.ts` 的 `DeviceClaim` 注释）⇒ 401 分类**永不触发**。若不做本门：
 * 未登录用户会因「响应缺 `client_id`」落入「**他人已认领**」**误报**（实测复现）。
 * 故未登录判定改为**读会话三态**（`useAuth`），与 `RoleGuard` 同源。
 *
 * **四态（Q4 完整实现 · 服务端行为 2026-09-16 dev 真机实测）**：
 * 1. **输入**：无有效码 / 码被拒 → `Field` + `Input`（placeholder 提示码形态）+「确认」
 * 2. **已认领**：`GET` → 200 `status:'pending'` **且 `client_id` 有值** → 展示 `client_id` /
 *    请求范围（`scope` 为 `null` = 全量）+ 「批准」/「拒绝」
 * 3. **已处理**：`status:'approved'|'denied'`（**批准/拒绝后刷新仍返回终态** ⇒ 刷新自然落本态）→ 终态文案
 * 4. **错误**：`invalid_request`（错码 / 已处理 / 未认领）· `expired_token`（过期）→ 码级 `Alert` 回 ①；
 *    网络 / 未知错误 → `errors` 组兜底
 *
 * ⚠️ **「他人已认领」两面（Q18② · 实测）**——不是 ④ 码级错误，而是 ② 的变体：
 * - **前置判定**：`GET` 得 200 但**响应缺 `client_id`**（官方只把 `client_id`/`scope` 给认领者）
 *   ⇒ 直接落**终态**「该请求已由其他账号认领」（**不给批准按钮**——调用方不可能是认领者）
 * - **被动兜底**：非认领者 `POST /device/approve` → 403 `{error:'access_denied'}` ⇒ 同文案
 *
 * ⚠️ **不展示有效期**：设备详情接口**不返回** `expires_in`（实测响应仅 4 字段；该字段只在 CLI 侧
 * `POST /device/code` 的响应里）⇒ 线框的「有效期」行**无数据来源**，本页不落（design §5.2 已同步订正）。
 *
 * ⚠️ **不消费** CLI 两端（`/device/code`、`/device/token`）——那属 CLI 侧（主 design §7.1）。
 *
 * 端点命名坑（`user_code` 下划线 query vs `userCode` 驼峰 body）**只在 `api/auth.ts` 封装内吸收**，
 * 本文件不出现裸 query 拼接。
 */
import { TriangleAlert } from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { approveDevice, claimDevice, type DeviceClaim, denyDevice } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { devicePath } from '@/auth/next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Alert, AlertTitle } from '@/components/ui/shadcn/alert';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Spinner } from '@/components/ui/shadcn/spinner';
import { useI18n } from '@/i18n/I18nProvider';

/** 终态（③ 已处理 + ② 变体「他人已认领」——都是「不再给动作」的收束态） */
type Terminal = 'approved' | 'denied' | 'foreign';

/** 失败态：device 专属走 `device` 组文案；其余（网络 / 未知码）交 `errors` 组兜底 */
type Fail =
  | { scope: 'device'; key: 'invalidCode' | 'claimedByOther' }
  | { scope: 'error'; code: string };

/** `ApiError` → 失败态（**页面唯一**的错误分类点；`code` 由 `api/auth.ts` 封装归一） */
function toFail(err: unknown): Fail {
  if (err instanceof ApiError) {
    if (err.code === 'device.invalidCode') return { scope: 'device', key: 'invalidCode' };
    if (err.code === 'device.claimedByOther') return { scope: 'device', key: 'claimedByOther' };
    return { scope: 'error', code: err.code };
  }
  return { scope: 'error', code: 'network' };
}

export function Device() {
  const { state } = useAuth();
  const { t, tErr } = useI18n();
  const [params] = useSearchParams();
  const urlCode = (params.get('user_code') ?? '').trim();

  const [code, setCode] = useState(urlCode.toUpperCase());
  const [claim, setClaim] = useState<DeviceClaim | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [fail, setFail] = useState<Fail | null>(null);
  const [busy, setBusy] = useState(false);

  /** 自动认领只跑一次的门（StrictMode 双跑；认领有写副作用） */
  const autoClaimed = useRef(false);

  const claimByCode = useCallback(async (raw: string) => {
    const target = raw.trim().toUpperCase();
    if (!target) return;
    setFail(null);
    setTerminal(null);
    setBusy(true);
    try {
      const result = await claimDevice(target);
      if (result.status === 'approved' || result.status === 'denied') {
        // ③ 已处理（批准/拒绝后刷新即落此态）
        setTerminal(result.status);
        setClaim(null);
      } else if (result.client_id) {
        // ② 已认领（`client_id`/`scope` 仅认领者可见）
        setClaim(result);
      } else {
        // ② 变体：码已被其他账号认领（官方不把细节给非认领者）
        setTerminal('foreign');
        setClaim(null);
      }
    } catch (err) {
      setFail(toFail(err));
      setClaim(null);
    } finally {
      setBusy(false);
    }
  }, []);

  // 带 `?user_code=` 进入且**已登录** ⇒ 预填 + 自动认领（StrictMode 双跑只发一次；
  // 未登录时不发——否则会因官方「未登录 GET 也 200」而误判为「他人已认领」）
  useEffect(() => {
    if (state.status !== 'authed') return;
    if (autoClaimed.current || !urlCode) return;
    autoClaimed.current = true;
    void claimByCode(urlCode);
  }, [state.status, urlCode, claimByCode]);

  // 门① 会话探测中：骨架（结构镜像输入卡 ⇒ 切态无跳动）、**不渲染表单**
  if (state.status === 'loading') {
    return (
      <DeviceShell>
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="mx-auto mt-2 h-4 w-56" />
        <div className="mt-6 flex flex-col gap-[22px]">
          <Skeleton className="h-12 w-full rounded-[28px]" />
          <Skeleton className="h-[42px] w-full rounded-full" />
        </div>
      </DeviceShell>
    );
  }

  // 门② 未登录：跳登录并**保码**（`next` 优先，design §4.3 Q1）——登录后回跳续流
  if (state.status === 'anon') {
    return <Navigate to={`/login?next=${encodeURIComponent(devicePath(urlCode))}`} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    await claimByCode(code);
  }

  async function decide(action: 'approve' | 'deny') {
    if (!claim || busy) return;
    const target = claim.user_code;
    setFail(null);
    setBusy(true);
    try {
      if (action === 'approve') await approveDevice(target);
      else await denyDevice(target);
      setTerminal(action === 'approve' ? 'approved' : 'denied');
      setClaim(null);
    } catch (err) {
      const f = toFail(err);
      if (f.scope === 'device' && f.key === 'claimedByOther') {
        // 被动兜底：非认领者 approve → 403 access_denied ⇒ 与前置判定同一终态
        setTerminal('foreign');
        setClaim(null);
      } else {
        setFail(f); // 保留 `claim`：可原地重试
      }
    } finally {
      setBusy(false);
    }
  }

  /** 码级错误条（device 专属文案 or `errors` 兜底） */
  const failAlert = fail ? (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{fail.scope === 'device' ? t('device', fail.key) : tErr(fail.code)}</AlertTitle>
    </Alert>
  ) : null;

  return (
    <DeviceShell>
      <h2 className="text-center text-[24px] font-semibold tracking-[-0.2px]">
        {t('device', 'title')}
      </h2>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        {t('device', 'subtitle')}
      </p>
      <div className="mt-6">
        {terminal ? (
          /* ③ 已处理 / ② 变体：终态（不再给动作） */
          <p className="text-sm" data-testid="device-terminal">
            {terminal === 'foreign' ? t('device', 'claimedByOther') : t('device', terminal)}
          </p>
        ) : claim ? (
          /* ② 已认领：详情 + 批准 / 拒绝 */
          <div className="flex flex-col gap-[22px]">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t('device', 'clientLabel')}</dt>
              <dd className="font-medium break-all">{claim.client_id}</dd>
              <dt className="text-muted-foreground">{t('device', 'scopeLabel')}</dt>
              <dd className="font-medium break-all">
                {claim.scope ? claim.scope : t('device', 'scopeAll')}
              </dd>
            </dl>
            {failAlert}
            <div className="flex gap-3">
              <Button
                type="button"
                className="flex-1"
                disabled={busy}
                onClick={() => decide('approve')}
              >
                {busy ? <Spinner /> : null}
                {t('device', 'approve')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide('deny')}
              >
                {t('device', 'deny')}
              </Button>
            </div>
          </div>
        ) : busy ? (
          /* 认领中：结构镜像输入卡（骨架 → 表单无跳动） */
          <div className="flex flex-col gap-[22px]">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          /* ① 输入 */
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[22px]">
            <Input
              id="device-code"
              name="device-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-label={t('device', 'codeLabel')}
              placeholder={t('device', 'codePlaceholder')}
              className="h-12 rounded-[28px] border-input bg-muted px-4 tracking-[2.52px] placeholder:text-muted-foreground/60 focus-visible:border-primary/40 placeholder:tracking-normal"
              value={code}
              disabled={busy}
              /* 设备码实测为**大写字母数字**（如 `CMK68C6R`）⇒ 输入即归一为大写 */
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            {failAlert}
            <Button
              type="submit"
              className="h-[42px] w-full rounded-full"
              disabled={busy || code.trim().length === 0}
            >
              {t('device', 'confirm')}
            </Button>
          </form>
        )}
      </div>
    </DeviceShell>
  );
}

/**
 * 设备页独立版式（批 design §14.4 B）：单列居中 + 品牌小方块 + 右上角语言切换；列宽 **336**。
 * 与登录页同为**全屏**（`min-h-svh`）——两页共用同一套版式语言，不共用组件（登录页另有左品牌栏）。
 */
function DeviceShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center p-12">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-[336px]">
        <div className="mb-2 flex justify-center">
          <span
            className="inline-flex size-7 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ backgroundImage: 'var(--gradient-brand)' }}
          >
            A
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
