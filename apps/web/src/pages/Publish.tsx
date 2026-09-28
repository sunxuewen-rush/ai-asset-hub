/**
 * 发布 `/dashboard/publish`（M4b-7 发布批 · design **§4.1–§4.9**；批 plan **T7**）。
 *
 * 契约（引用不复制 —— 真源在批 design）：
 * - **一键链**三跳：新建资产 → 上传版本（`DRAFT`）→ 提交审核（§4.4）；**失败停点不回滚**（D5）
 * - 上限文案取 `GET /api/meta/limits`（端点不可达 ⇒ `api/meta` 的常量兜底，**仅文案**；
 *   判定恒在服务端 —— C1/C13/D40）
 * - 版本号预填 **C3/D37**：只按列表项 `latestVersion` 推（`deriveNextVersion`）；撞号 409 ⇒
 *   字段行内交用户手改（**不自动规避**）
 * - 资产选择器 = 官方 `Combobox` + `useMarketQuery` 的 **300ms 防抖** `q`（C11/D38/C17）：
 *   读 `?slug=`（深链预选，无效 ⇒ 忽略 + 轻提示 + 回落「新建」）、写 `?q=`
 * - 行内错误三联动 **D33**：`<Field data-invalid>` + 控件 `aria-invalid` + `<FieldError>`
 * - 上限预检**不禁用提交**（C13）；**未选文件**才禁用主按钮（存在性门）
 * - 卸载即 abort 进行中的上传（C16/D41）；429 ⇒ 主按钮倒计时禁用（C14/D43）
 *
 * 硬口径（勿凭记忆改）：① 两出口分工 = 「放弃该资产」（**仅本页会话内创建 ∧ 该资产零版本**，D39）
 * 与「撤回提交」（`POST /api/reviews/:id/withdraw`，204 —— **不是**删版本，D30/D44）
 * ② 「再发布一个」= 复位（C15）：清 slug/文件/changelog/版本号 ⇒ 回落「新建」+ `1.0.0`
 * ③ 三段**同页平铺**（无「下一步」、无折叠）；未达前置的段保持可见（§4.2）
 * ④ 文案一律走 `t`/`tErr`（**禁中文字面量** —— dogfood G9 静态守卫）
 */

import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { deleteAsset } from '@/api/assets';
import { ApiError } from '@/api/client';
import { fetchMyAssets } from '@/api/me';
import { fetchPlatformLimits, PLATFORM_LIMITS_FALLBACK, toMiB } from '@/api/meta';
import { withdrawReview } from '@/api/reviews';
import type { AssetItem, AssetType } from '@/api/types';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { PageHeader } from '@/components/console/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert';
import { Button } from '@/components/ui/shadcn/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/shadcn/combobox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/shadcn/empty';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/shadcn/field';
import { Input } from '@/components/ui/shadcn/input';
import { Progress } from '@/components/ui/shadcn/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/shadcn/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { useApi } from '@/hooks/useApi';
import { useMarketQuery } from '@/hooks/useMarketQuery';
import { useI18n } from '@/i18n/I18nProvider';
import { deriveNextVersion, runChain } from '@/lib/publish-chain';

/** 右栏三段状态（design §4.3 四态；「未通过」由 `stopAt` 一次性置位 —— 单一真源） */
type StepState = 'pending' | 'active' | 'done' | 'failed';
/** ① 段二选一 */
type Mode = 'new' | 'existing';

const ASSET_TYPES: readonly AssetType[] = ['skill', 'mcp', 'agent'];
/** 类型 → 文案键（`as const` 保字面量类型 —— `t` 的 `DictKey` 约束需要字面量，禁宽化为 string） */
const TYPE_KEY = {
  skill: 'type.skill',
  mcp: 'type.mcp',
  agent: 'type.agent',
} as const;
/** 本页可达的**字段级**错误码 → 所属字段（design §4.6；其余一律段落 Alert） */
const FIELD_OF_CODE: Record<string, 'slug' | 'version'> = {
  'asset.slug_taken': 'slug',
  'asset.version_conflict': 'version',
};

/** 上传失败时形成的「包校验 issues」形状（服务端 `{code, issues}` —— `http/assets.ts` 上传端点） */
interface PackageIssue {
  path?: string;
  code?: string;
}

export function Publish() {
  const { t, tErr } = useI18n();
  const [searchParams] = useSearchParams();
  /** `?q=` 搜索词由 `useMarketQuery` 管（D46/C17：本页写 `?q=`，其余状态不落 URL） */
  const market = useMarketQuery();

  // —— 表单态 ——
  const [mode, setMode] = useState<Mode>('new');
  const [slug, setSlug] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('skill');
  const [picked, setPicked] = useState<AssetItem | null>(null);
  /**
   * 选择器输入框的**显示值**（本地态，独立于 `?q=`）：选中资产 ⇒ 回显其 slug（否则用户看不出
   * 选的是哪个 —— 实测踩过）；用户输入 ⇒ 正常显示草稿并清空选中。服务端搜索仍由 `market.q`
   * （300ms 防抖 ⇒ `?q=`）驱动，两者职责分离。
   */
  const [displayQuery, setDisplayQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(() => deriveNextVersion(null));
  const [changelog, setChangelog] = useState('');
  const [fieldError, setFieldError] = useState<{ field: 'slug' | 'version'; code: string } | null>(
    null,
  );

  // —— 链态 ——
  const [steps, setSteps] = useState<readonly [StepState, StepState, StepState]>([
    'active',
    'pending',
    'pending',
  ]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stopAt, setStopAt] = useState<1 | 2 | 3 | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [issues, setIssues] = useState<readonly PackageIssue[]>([]);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [countdown, setCountdown] = useState(0);
  /** 本页会话内**已创建成功**的 slug（D39 幂等边界：重试不重复注册） */
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  /** 「放弃该资产」前提 = 本页创建 ∧ **该资产零版本**（D39）；提交成功即视为有版本 */
  const [assetHasVersion, setAssetHasVersion] = useState(false);
  const [submitted, setSubmitted] = useState<{ taskId: number; version: string } | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deepLinkHandled = useRef(false);

  // —— 上限（匿名只读端点；失败退常量，仅文案）——
  const limits = useApi((signal) => fetchPlatformLimits({ signal }), []);
  const limitValues = limits.data ?? PLATFORM_LIMITS_FALLBACK;

  // —— 「我的资产」读面（仅「选用已有资产」支取数：C11 单次上限 100）——
  // ⚠️ `q` 归一：**空串必须省略**（服务端 `meQuerySchema.q` = `min(1)` ⇒ `?q=` 直接 400
  //    `request.invalid`，实测：冒烟中点「选用已有资产」曾整块退化成 ErrorState）；
  //    超长（>100）按服务端上限截断（`max(100)`），避免误触 400。
  const searchQ = market.committedQ.trim();
  const normalizedQ = searchQ === '' ? undefined : searchQ.slice(0, 100);
  /**
   * 深链 `?slug=`（D45/C17）：**必须在「新建」支也取一次数**才能解析 —— 否则预选分支不可达
   * （实测踩过：原条件只看 `mode === 'existing'` ⇒ 深链从不生效，只有默认态「新建」）。
   * 解析完（命中或判无效）即置 `true`，不再因深链重复取数。
   */
  const deepLinkSlug = searchParams.get('slug');
  const [deepLinkResolved, setDeepLinkResolved] = useState(deepLinkSlug === null);
  const myAssets = useApi(
    (signal) =>
      mode === 'existing' || !deepLinkResolved
        ? fetchMyAssets({ q: normalizedQ, limit: 100 }, { signal })
        : Promise.resolve(null),
    [mode, normalizedQ, deepLinkResolved],
  );

  // 卸载即 abort（C16/D41：与「取消上传」同一通路；无 beforeunload）
  useEffect(() => () => abortRef.current?.abort(), []);

  // 429 倒计时（C14/D43：归零自动恢复，不清空已填字段）
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // `?slug=` 深链（D45/C17）：命中我的资产 ⇒ 预选；无效 ⇒ 忽略 + 轻提示 + 回落「新建」
  useEffect(() => {
    if (deepLinkSlug === null || myAssets.data === null) return;
    if (deepLinkHandled.current) return;
    const found = myAssets.data.items.find((row) => row.slug === deepLinkSlug) ?? null;
    deepLinkHandled.current = true;
    setDeepLinkResolved(true);
    if (found === null) {
      toast.error(t('publish', 'assetNotFound'));
      return;
    }
    setMode('existing');
    setPicked(found);
    setDisplayQuery(found.slug);
    setVersion(deriveNextVersion(found.latestVersion));
  }, [deepLinkSlug, myAssets.data, t]);

  // 选中已有资产 ⇒ 版本号按 C3 预填（只读列表项 `latestVersion`，不拉版本列表 —— D37）
  useEffect(() => {
    if (mode !== 'existing') return;
    setVersion(deriveNextVersion(picked?.latestVersion ?? null));
  }, [mode, picked]);

  const packageTooLarge = file !== null && file.size > limitValues.packageMaxBytes;
  // 存在性门（design §4.2 ③：未选文件 ⇒ 禁用）；「选用已有资产」支**必须已选中**，
  // 否则链无从寻址（空 slug 必 400 —— 与其让服务端报错，不如就地禁掉）
  const canPublish =
    !running &&
    countdown === 0 &&
    file !== null &&
    stopAt === null &&
    submitted === null &&
    (mode === 'new' || picked !== null);

  /** 复位（C15/D45：「再发布一个」与「放弃该资产」成功后的共同出口） */
  function resetForm() {
    setMode('new');
    setSlug('');
    setAssetType('skill');
    setPicked(null);
    setFile(null);
    setVersion(deriveNextVersion(null));
    setChangelog('');
    setFieldError(null);
    setSteps(['active', 'pending', 'pending']);
    setStopAt(null);
    setError(null);
    setIssues([]);
    setIssuesExpanded(false);
    setProgress(0);
    setCountdown(0);
    setCreatedSlug(null);
    setAssetHasVersion(false);
    setSubmitted(null);
    setWithdrawn(false);
  }

  async function publish() {
    if (file === null) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);
    setIssues([]);
    setFieldError(null);
    setStopAt(null);
    setProgress(0);
    setSteps(['active', 'pending', 'pending']);

    const result = await runChain(
      {},
      {
        target:
          mode === 'new'
            ? { kind: 'create', slug, type: assetType }
            : { kind: 'existing', slug: picked?.slug ?? '' },
        ...(createdSlug === null ? {} : { createdSlug }),
        file,
        version,
        ...(changelog.trim() === '' ? {} : { changelog }),
      },
      {
        onStep: (step, state) => {
          setSteps((prev) => {
            const next = [...prev] as [StepState, StepState, StepState];
            next[step - 1] = state === 'active' ? 'active' : 'done';
            return next;
          });
        },
        onProgress: setProgress,
        signal: controller.signal,
      },
    );

    setRunning(false);
    abortRef.current = null;

    if (result.ok) {
      setAssetHasVersion(true);
      setSubmitted({ taskId: result.taskId, version: result.version });
      return;
    }

    // —— 失败停点：右栏精确停在该步（不回滚 —— D5）——
    setStopAt(result.stopAt);
    setSteps((prev) => {
      const next = [...prev] as [StepState, StepState, StepState];
      next[result.stopAt - 1] = 'failed';
      return next;
    });
    if (result.assetSlug !== null) setCreatedSlug(result.assetSlug);

    const err = result.error;
    if (err instanceof DOMException && err.name === 'AbortError') return; // 取消/卸载：不改错误面
    const apiError = err instanceof ApiError ? err : new ApiError('network', 0);
    setError(apiError);

    // 字段级错误 ⇒ 行内三联动；其余 ⇒ 段落 Alert（§4.6）
    // `request.invalid` 按**停点**归属字段：跳 1 = `slug`（形态非法）；跳 2 = `version`
    // （semver / changelog 超长；缺 file 由上游存在性门挡住，不到这里）—— design §4.6 行内规则
    const field =
      apiError.code === 'request.invalid'
        ? result.stopAt === 1
          ? 'slug'
          : 'version'
        : FIELD_OF_CODE[apiError.code];
    if (field !== undefined) setFieldError({ field, code: apiError.code });

    // 包校验 issues（服务端 `{code, issues}`）
    const body = apiError.body as { issues?: PackageIssue[] } | undefined;
    if (Array.isArray(body?.issues)) setIssues(body.issues);

    // 429 ⇒ 倒计时禁用主按钮（秒数取 `retryAfterSec`）
    const retryAfter = (apiError.body as { retryAfterSec?: number } | undefined)?.retryAfterSec;
    if (apiError.code === 'auth.rate_limited' && typeof retryAfter === 'number') {
      setCountdown(retryAfter);
    }
  }

  async function abandonAsset() {
    if (createdSlug === null) return;
    try {
      await deleteAsset(createdSlug);
      toast.success(t('publish', 'assetCreated.hint'));
      resetForm();
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setConfirmAbandon(false);
    }
  }

  async function withdraw() {
    if (submitted === null) return;
    try {
      await withdrawReview(submitted.taskId);
      setWithdrawn(true); // 就地改「已撤回」，不整页复位、不跳转（D44）
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setConfirmWithdraw(false);
    }
  }

  const flowSteps: ReadonlyArray<{ n: 1 | 2 | 3; title: string; hint: string }> = [
    { n: 1, title: t('publish', 'step.create'), hint: t('publish', 'step.create.hint') },
    { n: 2, title: t('publish', 'step.upload'), hint: t('publish', 'step.upload.hint') },
    { n: 3, title: t('publish', 'step.submit'), hint: t('publish', 'step.submit.hint') },
  ];
  const stateText: Record<StepState, string> = {
    pending: t('publish', 'state.pending'),
    active: t('publish', 'state.active'),
    done: t('publish', 'state.done'),
    failed: t('publish', 'state.failed'),
  };

  return (
    <>
      <PageHeader title={t('publish', 'title')} description={t('publish', 'subtitle')} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* ── 左栏：三段同页平铺（§4.2）── */}
        <div className="flex flex-col gap-6">
          {/* ① 新建资产 */}
          <FieldSet>
            <FieldLegend>
              <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs">
                1
              </span>
              {t('publish', 'step.create')}
            </FieldLegend>
            <FieldGroup>
              <Field
                orientation="horizontal"
                data-invalid={fieldError?.field === 'slug' || undefined}
              >
                <RadioGroup
                  value={mode}
                  onValueChange={(next) => {
                    const value = String(next) as Mode;
                    setMode(value);
                    setFieldError(null);
                    setStopAt(null);
                    setError(null);
                  }}
                  className="flex flex-wrap gap-4"
                >
                  <Field orientation="horizontal">
                    <RadioGroupItem value="new" id="publish-mode-new" />
                    <FieldLabel htmlFor="publish-mode-new">{t('publish', 'mode.new')}</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem
                      value="existing"
                      id="publish-mode-existing"
                      disabled={myAssets.data !== null && myAssets.data.items.length === 0}
                    />
                    <FieldLabel htmlFor="publish-mode-existing">
                      {t('publish', 'mode.existing')}
                    </FieldLabel>
                  </Field>
                </RadioGroup>
              </Field>

              {mode === 'new' ? (
                <>
                  <Field data-invalid={fieldError?.field === 'slug' || undefined}>
                    <FieldLabel htmlFor="publish-slug">{t('publish', 'field.slug')}</FieldLabel>
                    <Input
                      id="publish-slug"
                      value={slug}
                      aria-invalid={fieldError?.field === 'slug' || undefined}
                      placeholder={t('publish', 'field.slug.placeholder')}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setFieldError(null);
                      }}
                    />
                    <FieldDescription>{t('publish', 'field.slug.hint')}</FieldDescription>
                    {fieldError?.field === 'slug' && (
                      <FieldError>{tErr(fieldError.code)}</FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="publish-type">{t('publish', 'field.type')}</FieldLabel>
                    <Select
                      value={assetType}
                      onValueChange={(next) => setAssetType(next as AssetType)}
                    >
                      <SelectTrigger id="publish-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {t('assets', TYPE_KEY[item])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : (
                <Field>
                  <FieldLabel htmlFor="publish-asset">{t('publish', 'field.asset')}</FieldLabel>
                  {myAssets.error !== null ? (
                    <ErrorState error={myAssets.error} onRetry={() => setMode('new')} />
                  ) : myAssets.data !== null && myAssets.data.items.length === 0 ? (
                    <Empty className="border border-dashed">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Upload />
                        </EmptyMedia>
                        <EmptyTitle>{t('publish', 'field.asset.empty')}</EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button type="button" variant="outline" onClick={() => setMode('new')}>
                          {t('publish', 'field.asset.emptyAction')}
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <>
                      <Combobox
                        items={myAssets.data?.items ?? []}
                        value={picked}
                        onValueChange={(next) => {
                          const item = (next as AssetItem | null) ?? null;
                          setPicked(item);
                          setDisplayQuery(item?.slug ?? '');
                        }}
                        itemToStringLabel={(item: AssetItem) => item.slug}
                      >
                        <ComboboxInput
                          id="publish-asset"
                          placeholder={t('publish', 'field.asset.placeholder')}
                          value={displayQuery}
                          onChange={(e) => {
                            setDisplayQuery(e.target.value);
                            setPicked(null); // 重新输入 ⇒ 视为改选（上下文行同步清空）
                            market.setQ(e.target.value);
                          }}
                        />
                        <ComboboxContent>
                          <ComboboxList>
                            {(item: AssetItem) => (
                              <ComboboxItem key={item.slug} value={item}>
                                {item.slug}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                          <ComboboxEmpty>{t('publish', 'field.asset.loading')}</ComboboxEmpty>
                        </ComboboxContent>
                      </Combobox>
                      <FieldDescription>
                        {picked === null
                          ? t('publish', 'field.asset.hint')
                          : picked.latestVersion === null
                            ? t('publish', 'field.asset.latestNone')
                            : t('publish', 'field.asset.latest', {
                                version: picked.latestVersion,
                              })}
                      </FieldDescription>
                    </>
                  )}
                </Field>
              )}
            </FieldGroup>
          </FieldSet>

          {/* ② 上传版本 */}
          <FieldSet>
            <FieldLegend>
              <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs">
                2
              </span>
              {t('publish', 'step.upload')}
            </FieldLegend>
            <FieldGroup>
              {file === null ? (
                <Empty className="border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Upload />
                    </EmptyMedia>
                    <EmptyTitle>{t('publish', 'field.file')}</EmptyTitle>
                    <EmptyDescription>
                      {t('publish', 'field.file.hint', {
                        package: toMiB(limitValues.packageMaxBytes),
                        file: toMiB(limitValues.fileMaxBytes),
                        // ⚠️ 键内占位符名 = `{count}`（不是 maxFiles）—— 名字必须与字典一致，
                        //    否则原样渲染 `{count}`（实测踩过：见 §7.1 T3 B2 登记的同类风险）
                        count: limitValues.maxFiles,
                      })}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t('publish', 'field.file.choose')}
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{file.name}</span>
                    {running && steps[1] === 'active' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => abortRef.current?.abort()}
                      >
                        {t('publish', 'action.cancelUpload')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={running}
                        onClick={() => {
                          setFile(null);
                          setProgress(0);
                        }}
                      >
                        {t('publish', 'field.file.choose')}
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t('publish', 'upload.cancelNote')}
                  </p>
                  {steps[1] === 'active' && (
                    <Progress
                      value={progress}
                      aria-label={t('publish', 'upload.progress', { percent: progress })}
                    />
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setProgress(0);
                  setFieldError(null);
                  setStopAt(null);
                  setError(null);
                }}
              />
              {packageTooLarge && (
                <p className="text-destructive text-sm">
                  {tErr('asset.package_too_large', {
                    package: toMiB(limitValues.packageMaxBytes),
                  })}
                </p>
              )}
              <Field data-invalid={fieldError?.field === 'version' || undefined}>
                <FieldLabel htmlFor="publish-version">{t('publish', 'field.version')}</FieldLabel>
                <Input
                  id="publish-version"
                  value={version}
                  aria-invalid={fieldError?.field === 'version' || undefined}
                  disabled={running || submitted !== null}
                  onChange={(e) => {
                    setVersion(e.target.value);
                    setFieldError(null);
                  }}
                />
                <FieldDescription>{t('publish', 'field.version.hint')}</FieldDescription>
                {fieldError?.field === 'version' && (
                  <FieldError>{tErr(fieldError.code)}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="publish-changelog">
                  {t('publish', 'field.changelog')}
                </FieldLabel>
                <Textarea
                  id="publish-changelog"
                  value={changelog}
                  disabled={running || submitted !== null}
                  placeholder={t('publish', 'field.changelog.placeholder')}
                  onChange={(e) => setChangelog(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          {/* ③ 提交审核（或结果块） */}
          <FieldSet>
            <FieldLegend>
              <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs">
                3
              </span>
              {t('publish', 'step.submit')}
            </FieldLegend>
            <FieldGroup>
              {submitted === null ? (
                <>
                  <Button
                    type="button"
                    size="lg"
                    disabled={!canPublish}
                    onClick={() => void publish()}
                  >
                    {running
                      ? t('publish', 'action.publishing')
                      : countdown > 0
                        ? tErr('auth.rate_limited')
                        : t('publish', 'action.publish')}
                  </Button>
                  {countdown > 0 && (
                    <FieldDescription>
                      {tErr('auth.rate_limited', { seconds: countdown })}
                    </FieldDescription>
                  )}
                  <FieldDescription>{t('publish', 'flow.note')}</FieldDescription>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="font-medium">
                    {withdrawn ? t('publish', 'done.withdrawn') : t('publish', 'done.title')}
                  </p>
                  {!withdrawn && (
                    <p className="text-muted-foreground text-sm">
                      {t('publish', 'done.hint', { version: submitted.version })}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      {t('publish', 'action.again')}
                    </Button>
                    {!withdrawn && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmWithdraw(true)}
                      >
                        {t('publish', 'action.withdraw')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 失败面：段落 Alert / issues 列表 / 两出口（§4.4 · §4.6） */}
              {stopAt !== null && error !== null && fieldError === null && (
                <Alert variant="destructive">
                  <AlertTitle>
                    {issues.length > 0
                      ? t('publish', 'error.issues.title', { count: issues.length })
                      : tErr(error.code)}
                  </AlertTitle>
                  <AlertDescription>
                    {createdSlug !== null && (
                      <p className="mb-2">{t('publish', 'assetCreated.hint')}</p>
                    )}
                    {issues.length > 0 && (
                      <ul className="mb-2 flex flex-col gap-1">
                        {(issuesExpanded ? issues : issues.slice(0, 5)).map((issue) => (
                          <li key={`${issue.path ?? ''}-${issue.code ?? ''}`}>
                            <span className="font-mono text-xs">{issue.path ?? ''}</span>
                            {issue.path !== undefined && ' · '}
                            {tErr(issue.code ?? 'network')}
                          </li>
                        ))}
                      </ul>
                    )}
                    {issues.length > 5 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIssuesExpanded((v) => !v)}
                      >
                        {t(
                          'publish',
                          issuesExpanded ? 'error.issues.collapse' : 'error.issues.expand',
                        )}
                      </Button>
                    )}
                    {createdSlug !== null && !assetHasVersion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAbandon(true)}
                      >
                        {t('publish', 'action.abandon')}
                      </Button>
                    )}
                    {createdSlug !== null && assetHasVersion && (
                      <p className="text-muted-foreground text-sm">
                        {t('publish', 'error.versionedAssetHint')}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </FieldSet>
        </div>

        {/* ── 右栏：流程面板（§4.3）── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium text-sm">{t('publish', 'flow.title')}</h2>
            <ol className="flex flex-col gap-3">
              {flowSteps.map((step, index) => {
                const state: StepState = steps[step.n - 1] ?? 'pending';
                const connector = index < flowSteps.length - 1;
                return (
                  <li key={step.n} className="relative pl-7">
                    {connector && (
                      <span className="absolute top-5 left-[10px] h-[calc(100%+0.5rem)] w-px bg-border" />
                    )}
                    <span
                      data-state={state}
                      className="absolute top-0.5 left-0 inline-flex size-[22px] items-center justify-center rounded-full border text-[11px]"
                    >
                      {state === 'done' ? '✓' : state === 'failed' ? '!' : step.n}
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm">{step.title}</span>
                      <span className="text-muted-foreground text-xs">{stateText[state]}</span>
                    </div>
                    {state === 'active' && (
                      <p className="text-muted-foreground mt-1 text-xs">{step.hint}</p>
                    )}
                    {step.n === 2 && state === 'active' && running && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={progress} className="h-1" />
                        <span className="text-muted-foreground text-xs">
                          {t('publish', 'upload.progress', { percent: progress })}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
              {t('publish', 'flow.note')}
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmAbandon}
        onOpenChange={(open) => setConfirmAbandon((_) => open)}
        title={t('publish', 'action.abandon')}
        description={t('publish', 'assetCreated.hint')}
        confirmLabel={t('publish', 'action.abandon')}
        cancelLabel={t('common', 'cancel')}
        onConfirm={() => void abandonAsset()}
      />
      <ConfirmDialog
        open={confirmWithdraw}
        onOpenChange={(open) => setConfirmWithdraw((_) => open)}
        title={t('publish', 'action.withdraw')}
        description={t('publish', 'done.hint', { version: submitted?.version ?? '' })}
        confirmLabel={t('publish', 'action.withdraw')}
        cancelLabel={t('common', 'cancel')}
        onConfirm={() => void withdraw()}
      />
    </>
  );
}
