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
 * ③ 三段**同页**（无「下一步」）；**渐进披露（T11 · design v1.7 D21）**：未给包 ∧ 未在用已有资产
 *   ⇒ ②③ **不渲染**（展开判据 = 有文件 ∨ 已选定资产）；出现时平滑滚到 ② 段 —— **翻转** v1.1「未达前置的段保持可见」
 * ④ 文案一律走 `t`/`tErr`（**禁中文字面量** —— dogfood G9 静态守卫）
 * ⑤ **① 段（上传）空态**（T12 · 照搬 ClawHub 观感）：标题 = 动作号召 · 描述 = 拖拽引导（**zip** 语义，
 *   非 ClawHub 的 folder —— AIH 只收 zip）· 硬上限 `field.file.hint` **下沉**按钮下方（信息不丢）
 * ⑦ **整页版式重做**（T14 · design **v2.0 D24** · 方向 **B 双栏工作台** + 六处调整）：三段外层 = 官方 `Card`
 *   （视觉边界）包住**保留**的 `FieldSet`/`FieldLegend`（a11y 语义分组 + dogfood 既有读点零破坏）·
 *   段图例 = **状态记号**（**去数字 1/2/3**：完成 ✓ / 当前 实心圆点 / 待办 空心圆点）+ 段名 + 右侧状态徽标
 *   （三值复用 `state.*`，取值源 = 右栏同一 `panelStates`）· 左列 `max-w-2xl` · 右栏 **320px 两卡**
 *   （识别摘要 `summary.title` + 流程 · **撤主按钮卡**）· **字段归属迁移**：版本号 → ② 段 · 更新说明 → ③ 段
 *   · 主按钮文案 `action.publish` **改值**（去括号 ⇒「发布」）· **撤**按钮下方 `flow.note`（键**退役** · F251）
 * ⑥ **① 段视觉重做**（T13 · design v1.9 D23 · 方向 A 聚焦式）：圆底品牌图标（拖拽反白 + 放大）· 标题随态
 *   （`field.file.dropActive`）· 主行动升实底 `lg`（**单按钮** · 落地期收敛：第二出口已按用户 1A 取消）·
 *   上限改 chips 行（`Badge` + 三键）· 已选/上传中与空态**同轴** ·
 *   429 ⇒ ① 段 `Alert` + 主按钮标签**同键** `error.rateLimitedCountdown`（**F250** 孤儿键转活 · ③ 段去重）
 */

import { cn } from 'cn';
import { Check, Loader2Icon, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { deleteAsset } from '@/api/assets';
import { ApiError } from '@/api/client';
import { fetchMyAssets } from '@/api/me';
import { fetchPlatformLimits, PLATFORM_LIMITS_FALLBACK, toMiB } from '@/api/meta';
import { withdrawReview } from '@/api/reviews';
import type { AssetItem, AssetType } from '@/api/types';
import { fetchVersionList } from '@/api/versions';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { PageHeader } from '@/components/console/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatBytes } from '@/components/ui/fileTreeNodes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Card } from '@/components/ui/shadcn/card';
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
import {
  deriveNextVersion,
  deriveSlugFromFileName,
  maxVersion,
  nextAvailableVersion,
  occupiedVersionsOf,
  runChain,
  type VersionLike,
} from '@/lib/publish-chain';

/** 右栏三段状态（design §4.3 四态；「未通过」由 `stopAt` 一次性置位 —— 单一真源） */
type StepState = 'pending' | 'active' | 'done' | 'failed';
/** ① 段二选一 */
type Mode = 'new' | 'existing';

/**
 * 段卡状态记号（T14 · 评审调整①：**取消数字 1/2/3** ⇒ 编号位改记状态）
 * 完成 ✓（实底）/ 当前 实心圆点 / 待办 空心圆点 / 未通过 `!`（红底）。
 * 图标一律 SVG / 字符，不用 emoji。
 */
function StateMark({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" />
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive font-medium text-[11px] leading-none text-white">
        !
      </span>
    );
  }
  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center">
      <span
        className={cn(
          'size-2.5 rounded-full',
          state === 'active' ? 'bg-primary' : 'border border-muted-foreground/50',
        )}
      />
    </span>
  );
}

/**
 * 段卡图例（T14）：状态记号 + 段名 + 右侧状态徽标。
 * 徽标文案**复用** `state.*`（与右栏流程面板同一套词，禁同义双键）；状态源 = 调用方传入（本页 = `panelStates`）。
 */
function SegmentLegend({
  state,
  label,
  stateLabel,
}: {
  state: StepState;
  label: string;
  stateLabel: string;
}) {
  return (
    <FieldLegend className="w-full">
      <span className="flex w-full items-center gap-2">
        <StateMark state={state} />
        <span>{label}</span>
        <Badge
          variant={state === 'active' ? 'default' : 'secondary'}
          className="ml-auto text-[11px]"
        >
          {stateLabel}
        </Badge>
      </span>
    </FieldLegend>
  );
}

const ASSET_TYPES: readonly AssetType[] = ['skill', 'mcp', 'agent'];
/** 类型 → 文案键（`as const` 保字面量类型 —— `t` 的 `DictKey` 约束需要字面量，禁宽化为 string） */
const TYPE_KEY = {
  skill: 'type.skill',
  mcp: 'type.mcp',
  agent: 'type.agent',
} as const;
/**
 * **T15 · D26**：在途族（已上传但尚未公开、且仍在流程中）—— 上下文行据此切「在途 {version}」。
 * `PUBLISHED` / `YANKED` / `REJECTED` 不算在途（`REJECTED` 已定格 ⇒ 归「最新版」口径）。
 */
const INFLIGHT_STATUSES: ReadonlySet<string> = new Set([
  'DRAFT',
  'SCANNING',
  'UPLOADED',
  'PENDING_REVIEW',
]);

/**
 * 版本八态 → 状态词 i18n 键（**T15 · D27** 的 `{state}`）。
 * 与 `components/market/detail/VersionCompare.tsx` 的同类映射**同表同源**（键本身在 `assets` 组，
 * 零新增文案）；第三处消费出现时抽共用件。
 */
const VERSION_STATUS_KEY = {
  DRAFT: 'version.status.draft',
  SCANNING: 'version.status.scanning',
  SCAN_FAILED: 'version.status.scan_failed',
  UPLOADED: 'version.status.uploaded',
  PENDING_REVIEW: 'version.status.pending_review',
  PUBLISHED: 'version.status.published',
  REJECTED: 'version.status.rejected',
  YANKED: 'version.status.yanked',
} as const;

/** 未知状态兜底 `DRAFT`（服务端八态之外的值不出现；兜底只为满足类型与健壮性） */
function versionStatusKey(status: string): keyof typeof VERSION_STATUS_KEY {
  return status in VERSION_STATUS_KEY ? (status as keyof typeof VERSION_STATUS_KEY) : 'DRAFT';
}

/** 本页可达的**字段级**错误码 → 所属字段（design §4.6；其余一律段落 Alert） */
const FIELD_OF_CODE: Record<string, 'slug' | 'version'> = {
  'asset.slug_taken': 'slug',
  'asset.version_conflict': 'version',
};

/** 上传失败时形成的「包校验 issues」形状（服务端 `{code, issues}` —— `http/assets.ts` 上传端点） */
interface PackageIssue {
  path?: string;
  code?: string;
  /** 服务端原文（`package_layout_invalid` 等只有它可读 —— F241） */
  message?: string;
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
  // ── 拖拽上传（增补设计 `2026-09-28-publish-drag-upload-design.md` v1.0 · D1–D7）──
  // `dragDepth` 计数法：子元素间移动也会触发 dragleave，靠计数避免高亮抖动（D1①）
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  /** 非 zip 的**本地**提示（D3①③）：只提示这一种；多文件静默取第一个 */
  const [fileHint, setFileHint] = useState<string | null>(null);
  /**
   * slug 自动预填（T6 · design §3.1）：选包（点击/拖入）⇒ 按**文件名**派生 slug。
   * 触发条件（D10①，与 ClawHub 的 `!dirtyFields.slug && !trimmedSlug` 同义）：
   *   仅「新建」支 ∧ 用户**没改过**（`slugTouchedRef`）∧ 当前值**为空或仍是上次自动值** ⇒ 填 / 刷新；
   *   用户改过（含改后又清空）**一律不动** —— touched 优先于「空」，否则会与正在打字的用户抢输入框。
   * 派生为空（纯中文包名等）⇒ **留空不猜**（D11①）。
   */
  const slugTouchedRef = useRef(false);
  const autoSlugRef = useRef('');
  /** T9：用户手动切过模式 ⇒ 此后不再自动判定；`autoExisting` = 当前「已有」模式是本功能自动切的 */
  const modeTouchedRef = useRef(false);
  const autoExistingRef = useRef(false);
  const detectSeqRef = useRef(0);
  /** T15：版本号**用户手改**标记（异步返回不覆盖输入 —— 与 `slugTouched` 同族语义） */
  const versionTouchedRef = useRef(false);
  /** T15：占号集合拉取序号（丢弃过期响应 —— 与 `detectSeqRef` 同族） */
  const occupiedSeqRef = useRef(0);
  const maybePrefillSlug = (next: File | null) => {
    if (next === null || mode !== 'new') return;
    if (slugTouchedRef.current) return;
    if (slug !== '' && slug !== autoSlugRef.current) return;
    const derived = deriveSlugFromFileName(next.name);
    if (derived === '') return;
    autoSlugRef.current = derived;
    setSlug(derived);
    setFieldError(null);
    detectModeForSlug(derived);
  };
  /**
   * 模式自动判定（T9 · design v1.5 D15–D17）：按**派生 slug** 一次性查「我的资产」——
   * 命中 ⇒ 切「已有」+ 选中它（版本号由既有 useEffect 自动变 `latest+1`）；未命中/失败 ⇒ 保持「新建」。
   * 保护：① 用户**手动切过**模式（`modeTouchedRef`）⇒ 永不自动切（同 `slugTouched` 语义）
   *       ② **深链 `?slug=` 或用户手动选中的「已有」不动** —— 只有本功能自动切成的才允许再判定
   *       ③ 序号（`detectSeqRef`）防过期响应覆盖后一次选择 ④ 失败**静默**（不阻断/不报错/不弹提示）
   */
  const detectModeForSlug = (candidate: string) => {
    if (modeTouchedRef.current) return;
    if (mode === 'existing' && !autoExistingRef.current) return;
    const seq = ++detectSeqRef.current;
    void fetchMyAssets({ q: candidate, limit: 100 }, {})
      .then((data) => {
        if (seq !== detectSeqRef.current || modeTouchedRef.current) return;
        const hit = data.items.find((item) => item.slug === candidate) ?? null;
        if (hit !== null) {
          autoExistingRef.current = true;
          setMode('existing');
          setPicked(hit);
          setDisplayQuery(hit.slug);
        } else {
          autoExistingRef.current = false;
          setMode('new');
          setPicked(null);
        }
      })
      .catch(() => {
        /* D17①：查询失败 ⇒ 静默保持「新建」 */
      });
  };
  /** 拖拽落点归一（D5①）：与点击选择走**同一个** `file` 状态，键鼠路径不变 */
  const acceptDroppedFile = (next: File | null) => {
    if (next === null) return;
    if (!next.name.toLowerCase().endsWith('.zip')) {
      setFileHint(t('publish', 'field.file.notZip'));
      return;
    }
    setFileHint(null);
    setFile(next);
    maybePrefillSlug(next);
  };
  /**
   * 移除已选包（T7 · design D12–D14）：回「未选态」⇒ 可重新点击选择或重新拖入。
   * 联动（D13①）：清本地提示 + 进度；**自动填的 slug 一并清空**（对称：随包来、随包去），
   * 用户手改过（`slugTouchedRef`）不动；**仅「新建」支**适用 —— `?slug=` 深链的 slug 属于
   * 用户选定的既有资产，不得被 × 抹掉。
   */
  const removeSelectedFile = () => {
    setFile(null);
    setFileHint(null);
    setProgress(0);
    if (mode === 'new' && !slugTouchedRef.current) {
      setSlug('');
      autoSlugRef.current = '';
    }
    // T9 对称语义：模式若是本功能自动切成的 ⇒ 随包回到「新建」（用户手动切过的不动）
    if (!modeTouchedRef.current && autoExistingRef.current) {
      autoExistingRef.current = false;
      detectSeqRef.current += 1;
      setMode('new');
      setPicked(null);
    }
  };
  /**
   * 模式切换的**唯一入口**（T13 · D23）：② 段单选拨盘调用；① 段空态原「第二出口」按钮**已于落地期取消**
   * （用户 2026-09-29 拍板 1A —— 单按钮聚焦；同时消解「随手点一下就把本次会话的自动识别关掉」的隐性陷阱）。
   * 保留单入口命名：语义集中，`modeTouchedRef` 保护只可能在一处漏置（避免两套切换逻辑漂移）。
   * `modeTouchedRef` = T9/D16 语义：手动切过 ⇒ 此后不再被「派生 slug 自动判定」覆盖。
   */
  const applyModeChange = (next: Mode) => {
    modeTouchedRef.current = true;
    autoExistingRef.current = false;
    setMode(next);
    setFieldError(null);
    setStopAt(null);
    setError(null);
  };
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(() => deriveNextVersion(null));
  /**
   * **T15 · D25**：选中资产的**真实占号集合**（`GET /api/assets/{slug}/versions` ⇒ 排除 `SCAN_FAILED`）。
   * `null` = 未拉回 / 拉取失败 ⇒ **回落**旧口径（列表项 `latestVersion` 推导）。
   * 为什么必须换数据源：服务端占号**跨全状态**（`assets/versions.ts:55-61`），而列表项的
   * `latestVersion` 只是「最新**已发布**版本」⇒ 少了在途 / 草稿 / 被驳回这一半 ⇒ 预填的号撞号（**F252**）。
   */
  const [occupied, setOccupied] = useState<readonly VersionLike[] | null>(null);
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
    // 版本号不在此处派生（**T15**：单一数据源 —— 统一由「模式 / 资产 / 占号集合」effect 承载）
  }, [deepLinkSlug, myAssets.data, t]);

  /**
   * **T15 · D25**：选中已有资产 ⇒ 拉**真实占号集合**（`GET /assets/{slug}/versions` · 排除 `SCAN_FAILED`）。
   *
   * **三入口同源**：本 effect 的触发面 = `mode === 'existing' ∧ picked !== null`，而「已有」态只有三条
   * 来路 —— ① `?slug=` 深链 ② 手动「选用已有资产」③ **拖包自动判定命中**（T9/D15）⇒ 三者自动共用本逻辑，
   * 不需要各自实现（也**禁止**各写一遍 —— 用户 2026-09-29 点名要求 ③ 同样生效）。
   *
   * 失败面：拉取失败 / 超时 ⇒ `occupied` 保持 `null` ⇒ 派生回落旧口径 + 既有 409 行内兜底
   * （静默、不阻断、不报错 —— 与 D17① 同口径 · 设计 v2.1 §4 边界）。
   */
  useEffect(() => {
    if (mode !== 'existing' || picked === null) {
      occupiedSeqRef.current += 1; // 失效在途响应（切模式 / 清选中）
      setOccupied(null);
      return;
    }
    const seq = ++occupiedSeqRef.current;
    setOccupied(null);
    void (async () => {
      const first = await fetchVersionList(picked.slug, { limit: 100 }).catch(() => null);
      if (seq !== occupiedSeqRef.current) return; // 过期响应（快速切换资产 / 模式）
      if (first === null) return; // 拉取失败 ⇒ 静默回落
      let items = first.items;
      // 版本数 > 100 ⇒ 补拉一页（上限 200）；仍不足 ⇒ 回落（罕见场景，409 兜住）
      if (first.total > items.length && items.length === 100) {
        const second = await fetchVersionList(picked.slug, { limit: 100, offset: 100 }).catch(
          () => null,
        );
        if (seq !== occupiedSeqRef.current) return;
        if (second !== null) items = [...items, ...second.items];
      }
      setOccupied(occupiedVersionsOf(items));
    })();
  }, [mode, picked]);

  /**
   * 版本号派生（**C3/D49 + T15/D25** —— 数据源换血，算法语义保留）：
   *
   * | 态 | 取值 |
   * |---|---|
   * | 新建 | `1.0.0`（D49） |
   * | 已有 ∧ 占号集合到手 | **最大占号 + 1**（`-pre` ⇒ 剥段补位 · D37 保留） |
   * | 已有 ∧ 未拉回 / 拉取失败 | **回落**旧口径（列表项 `latestVersion` 推导） |
   *
   * 覆盖语义**刻意不对称**：切模式 / 换资产 = 用户显式动作 ⇒ **同步覆盖**（F244 既有语义，否则会发错号）；
   * 占号集合**异步**返回 ⇒ 仅当用户**没手改过**版本号时覆盖（`versionTouchedRef` —— 防「打字打到一半被覆盖」）。
   */
  useEffect(() => {
    if (mode !== 'existing') {
      setVersion(deriveNextVersion(null));
      return;
    }
    if (occupied === null) {
      setVersion(deriveNextVersion(picked?.latestVersion ?? null));
      return;
    }
    if (!versionTouchedRef.current)
      setVersion(nextAvailableVersion(occupied.map((item) => item.version)));
  }, [mode, picked, occupied]);

  const packageTooLarge = file !== null && file.size > limitValues.packageMaxBytes;
  // 存在性门（design §4.2 ③：未选文件 ⇒ 禁用）；「选用已有资产」支**必须已选中**，
  // 否则链无从寻址（空 slug 必 400 —— 与其让服务端报错，不如就地禁掉）
  const canPublish =
    !running &&
    countdown === 0 &&
    file !== null &&
    // **F243（2026-09-29 用户实测）**：此处原含 `stopAt === null` ⇒ 失败停点后主按钮永久禁用，
    // 而设计 §4.8/N6 明确「失败停点按钮复用 `action.publish`（= 重试）」⇒ 门已删（用户拍板 A）。
    // 重试语义：`publish()` 内部 `setStopAt(null)` 刷新右栏；跳1 幂等由 `createdSlug` 兜住（D39）。
    submitted === null &&
    (mode === 'new' || picked !== null);

  /**
   * **渐进披露（T11 · design v1.7 D21 · author: 2026-09-29）**：有文件 或 已选定资产
   * （`?slug=` 深链 / 手动切「已有」）⇒ ②③ 出现；否则只留 ① 上传。
   * 判据与 ClawHub `isNewSkillPublishEmpty = files.length === 0 && !updateSlug` 同形。
   */
  const expanded = file !== null || mode === 'existing';
  /** ② 段锚点：仅在「收起 → 展开」时平滑滚到段顶（深链首帧即展开 ⇒ 不滚，避免开页跳动） */
  const segment2Ref = useRef<HTMLFieldSetElement | null>(null);
  const prevExpandedRef = useRef(expanded);
  useEffect(() => {
    if (expanded && !prevExpandedRef.current) {
      segment2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  /** 复位（C15/D45：「再发布一个」与「放弃该资产」成功后的共同出口） */
  function resetForm() {
    setMode('new');
    setSlug('');
    slugTouchedRef.current = false;
    autoSlugRef.current = '';
    modeTouchedRef.current = false;
    autoExistingRef.current = false;
    detectSeqRef.current += 1;
    setAssetType('skill');
    setPicked(null);
    setFile(null);
    setVersion(deriveNextVersion(null));
    versionTouchedRef.current = false; // T15：复位手改标记
    occupiedSeqRef.current += 1; // T15：失效在途响应
    setOccupied(null);
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
    { n: 1, title: t('publish', 'step.upload'), hint: t('publish', 'step.upload.hint') },
    { n: 2, title: t('publish', 'step.detect'), hint: t('publish', 'step.detect.hint') },
    { n: 3, title: t('publish', 'step.publish'), hint: t('publish', 'step.publish.hint') },
  ];
  /**
   * 右栏面板三段状态（T10 · design v1.6 D19 · P2A「用户视角」）：
   * ① 上传 = 未选文件 ⇒ 当前 / 已选 ⇒ 完成；② 自识别 = 未选 ⇒ 待办 / 已选 ⇒ 完成；
   * ③ 发布 = 未选 ⇒ 待办 / 已选未点 ⇒ 待办 / 执行中 ⇒ 当前 / 成功 ⇒ 完成 / **链失败 ⇒ 未通过**（圆点统一落此处，
   * 字段级行内错误仍按停点归属 —— 有意解绑，见 design §7⑪）。
   */
  const panelStates: readonly [StepState, StepState, StepState] =
    submitted !== null
      ? ['done', 'done', 'done']
      : stopAt !== null
        ? ['done', 'done', 'failed']
        : running
          ? ['done', 'done', 'active']
          : file === null
            ? ['active', 'pending', 'pending']
            : ['done', 'done', 'pending'];
  const stateText: Record<StepState, string> = {
    pending: t('publish', 'state.pending'),
    active: t('publish', 'state.active'),
    done: t('publish', 'state.done'),
    failed: t('publish', 'state.failed'),
  };

  /**
   * **T15 · D25/D26/D27** 的派生面（三入口共用同一份占号集合）：
   * - `occupiedNames`：占号号集（喂派生函数）
   * - `inflightVersions`：在途号（`DRAFT` / `SCANNING` / `UPLOADED` / `PENDING_REVIEW`）
   * - `occupiedHit`：用户输入是否**已被占**（⇒ D27 前置提示）
   * - `assetContextText`：资产上下文行文案（在途 ⇒「在途 {version}」/ 有占号 ⇒「当前最新版」/
   *   集合空 ⇒「暂无版本」；`occupied === null` ⇒ 回落旧口径）
   */
  const occupiedNames = occupied?.map((item) => item.version) ?? [];
  const inflightVersions = (occupied ?? [])
    .filter((item) => INFLIGHT_STATUSES.has(item.status))
    .map((item) => item.version);
  const occupiedHit = occupied?.find((item) => item.version === version.trim()) ?? null;
  const assetContextText =
    picked === null
      ? t('publish', 'field.asset.hint')
      : occupied === null
        ? picked.latestVersion === null
          ? t('publish', 'field.asset.latestNone')
          : t('publish', 'field.asset.latest', { version: picked.latestVersion })
        : inflightVersions.length > 0
          ? t('publish', 'field.asset.inflight', { version: maxVersion(inflightVersions) ?? '' })
          : occupied.length > 0
            ? t('publish', 'field.asset.latest', { version: maxVersion(occupiedNames) ?? '' })
            : t('publish', 'field.asset.latestNone');

  /** T14 调整②：版本号字段（归 ② 段「自识别」——识别结果的一部分，与 标识 / 类型 同组；新建支与已有支都渲染） */
  const versionField = (
    <Field data-invalid={fieldError?.field === 'version' || occupiedHit !== null || undefined}>
      <FieldLabel htmlFor="publish-version">{t('publish', 'field.version')}</FieldLabel>
      <Input
        id="publish-version"
        value={version}
        aria-invalid={fieldError?.field === 'version' || occupiedHit !== null || undefined}
        disabled={running || submitted !== null}
        onChange={(e) => {
          versionTouchedRef.current = true; // T15：手改过 ⇒ 异步返回不再覆盖（同步派生仍覆盖）
          setVersion(e.target.value);
          setFieldError(null);
        }}
      />
      <FieldDescription>{t('publish', 'field.version.hint')}</FieldDescription>
      {fieldError?.field === 'version' ? (
        // 服务端 409 兜底（并发 / 他页改动 / 拉取失败路径）—— 文案保持不变（`asset.version_conflict`）
        <FieldError>{tErr(fieldError.code)}</FieldError>
      ) : occupiedHit !== null ? (
        // **T15 · D27**：**前置**提示（比服务端 409 更早一步）· 状态词复用 `assets` 组既有八键（零新增文案）
        <FieldError>
          {t('publish', 'field.version.occupied', {
            version: occupiedHit.version,
            state: t('assets', VERSION_STATUS_KEY[versionStatusKey(occupiedHit.status)]),
            suggested: nextAvailableVersion(occupiedNames),
          })}
        </FieldError>
      ) : null}
    </Field>
  );

  /**
   * T14 右栏「识别摘要」三行（`dl`）—— **只列该阶段客户端已知的值**：
   * 包内条目数要服务端解压后才有（客户端解压需引库 ⇒ 违反零依赖）⇒ 不进摘要；
   * 「资产」行亦不出（新建支资产尚不存在 · 已有支与「标识」同值）。
   * 未展开（未给包 ∧ 未选定资产）⇒ 三值一律「—」（占位符非文案 ⇒ 零键）。
   */
  const summaryRows: [string, string][] = [
    [
      t('publish', 'field.slug'),
      !expanded ? '—' : mode === 'existing' ? (picked?.slug ?? '—') : slug.trim() || '—',
    ],
    [
      t('publish', 'field.type'),
      !expanded
        ? '—'
        : mode === 'existing'
          ? picked === null
            ? '—'
            : t('assets', TYPE_KEY[picked.type])
          : t('assets', TYPE_KEY[assetType]),
    ],
    [t('publish', 'field.version'), !expanded ? '—' : version.trim() || '—'],
  ];

  return (
    <>
      <PageHeader
        title={t('publish', 'title')}
        description={t('publish', expanded ? 'subtitle' : 'subtitle.empty')}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── 左栏：三段同页平铺（§4.2）── */}
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {/* ① 上传（T10 置首：先给包 ⇒ 系统自识别 · T14 段卡化：官方 Card 作视觉边界）*/}
          {/* 拖拽区 = 整个 ① 段（常驻 · §7.2 决策⑥ A 方案）：已选/上传中同样有落点，
              否则「上传中拖入」不可达；事件在 FieldSet 上，视觉高亮仍复用官方 Empty（D2①） */}
          {/* T14：段卡 = 官方 `Card`（边界/圆角/阴影）+ 官方 `FieldSet`（a11y 语义分组 · 既有读点保留） */}
          <Card className="gap-4 px-6 py-5">
            <FieldSet
              onDragEnter={(event) => {
                event.preventDefault();
                if (running) return;
                dragDepth.current += 1;
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setDragActive(false);
                if (running) return;
                acceptDroppedFile(event.dataTransfer?.files?.[0] ?? null);
              }}
            >
              <SegmentLegend
                state={panelStates[0]}
                label={t('publish', 'step.upload')}
                stateLabel={stateText[panelStates[0]]}
              />
              <FieldGroup>
                {file === null ? (
                  <Empty
                    className={cn(
                      'border border-dashed transition-colors',
                      // 拖拽高亮（D2①：复用官方 Empty，不新造样式体系）；上传中不高亮（D6①）
                      // 事件已上移到 ② 段 <FieldSet>（拖拽区常驻）；此处只保留视觉高亮
                      dragActive && 'border-primary bg-primary/5',
                    )}
                  >
                    {/* T13（A 聚焦式 · D23）：圆底品牌图标（拖拽反白 + 放大）· 标题随态 · **单按钮**主行动实底 · 上限 chips */}
                    <EmptyHeader>
                      <EmptyMedia
                        variant="icon"
                        className={cn(
                          'size-14 rounded-full transition-transform',
                          dragActive
                            ? 'scale-110 bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        <Upload />
                      </EmptyMedia>
                      <EmptyTitle className="text-xl font-semibold tracking-tight">
                        {dragActive
                          ? t('publish', 'field.file.dropActive')
                          : t('publish', 'field.file')}
                      </EmptyTitle>
                      <EmptyDescription>{t('publish', 'field.file.drop')}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="max-w-none">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {t('publish', 'field.file.choose')}
                        </Button>
                      </div>
                      {/* T13 上限 chips（四态均可见）：官方 `Badge` 承载格式标记 + 三项小字，值取 `/api/meta/limits`；
                        ⚠️ 键内占位符名必须与调用点参数名一致（**F230** 纪律：曾因 maxFiles ≠ {count} 原样渲染） */}
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          .zip
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {t('publish', 'field.file.limit.package', {
                            package: toMiB(limitValues.packageMaxBytes),
                          })}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {t('publish', 'field.file.limit.file', {
                            file: toMiB(limitValues.fileMaxBytes),
                          })}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {t('publish', 'field.file.limit.count', { count: limitValues.maxFiles })}
                        </span>
                      </div>
                    </EmptyContent>
                    {fileHint !== null && <FieldError>{fileHint}</FieldError>}
                    {/* T13 · **F250**：429 ⇒ 段内 Alert，与主按钮标签**同键** `error.rateLimitedCountdown`（带秒数）；
                      ③ 段不再重复同一句（同屏去重）；主按钮倒计时禁用语义不变（D43 不撤销） */}
                    {countdown > 0 && (
                      <Alert variant="destructive" className="max-w-md">
                        <AlertTitle>
                          {t('publish', 'error.rateLimitedCountdown', { seconds: countdown })}
                        </AlertTitle>
                      </Alert>
                    )}
                  </Empty>
                ) : (
                  /* T13（A 聚焦式）：已选 / 上传中 与空态**同轴**（同宽居中容器 ⇒ 视觉重心不跳变）
                   `data-slot` = dogfood 读取钩（G4㉗ 同轴断言用；无样式/行为含义） */
                  <div
                    data-slot="upload-file-row"
                    className="mx-auto flex w-full max-w-md flex-col gap-2"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        {steps[1] === 'active' ? (
                          <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
                        ) : (
                          <Check aria-hidden="true" className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{file.name}</span>
                        <span className="text-muted-foreground block text-xs">
                          {formatBytes(file.size)}
                        </span>
                      </span>
                      {running ? (
                        steps[1] === 'active' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => abortRef.current?.abort()}
                          >
                            {t('publish', 'action.cancelUpload')}
                          </Button>
                        ) : null
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('publish', 'field.file.remove')}
                          title={t('publish', 'field.file.remove')}
                          onClick={removeSelectedFile}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    {steps[1] === 'active' && (
                      <>
                        <Progress
                          value={progress}
                          aria-label={t('publish', 'upload.progress', { percent: progress })}
                        />
                        {/* T13：该注**仅上传中**显示（现状无条件显示 ⇒ 未上传时也讲「取消」语义，属错位） */}
                        <p className="text-muted-foreground text-xs">
                          {t('publish', 'upload.cancelNote')}
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const nextFile = e.target.files?.[0] ?? null;
                    setFile(nextFile);
                    maybePrefillSlug(nextFile);
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
              </FieldGroup>
            </FieldSet>
          </Card>

          {/* ② 自识别（T10：系统识别的结果，全部可编辑）*/}
          {/* T11 · D21：未给包 ⇒ ②③ 整段不渲染（展开判据见 `expanded`）*/}
          {expanded ? (
            <Card className="gap-4 px-6 py-5">
              <FieldSet ref={segment2Ref}>
                <SegmentLegend
                  state={panelStates[1]}
                  label={t('publish', 'step.detect')}
                  stateLabel={stateText[panelStates[1]]}
                />
                <FieldGroup>
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldError?.field === 'slug' || undefined}
                  >
                    <RadioGroup
                      value={mode}
                      onValueChange={(next) => {
                        // T13：模式切换唯一入口（T9：用户手动切过 ⇒ 此后不再被自动判定覆盖）
                        applyModeChange(String(next) as Mode);
                      }}
                      className="flex flex-wrap gap-4"
                    >
                      <Field orientation="horizontal">
                        <RadioGroupItem value="new" id="publish-mode-new" />
                        <FieldLabel htmlFor="publish-mode-new">
                          {t('publish', 'mode.new')}
                        </FieldLabel>
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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Field data-invalid={fieldError?.field === 'slug' || undefined}>
                        <FieldLabel htmlFor="publish-slug">{t('publish', 'field.slug')}</FieldLabel>
                        <Input
                          id="publish-slug"
                          value={slug}
                          aria-invalid={fieldError?.field === 'slug' || undefined}
                          placeholder={t('publish', 'field.slug.placeholder')}
                          onChange={(e) => {
                            // 用户碰过即「脏」（ClawHub `dirtyFields.slug` 同义）⇒ 此后不再被自动值覆盖
                            slugTouchedRef.current = true;
                            setSlug(e.target.value);
                            setFieldError(null);
                          }}
                        />
                        <FieldDescription>{t('publish', 'field.slug.hint')}</FieldDescription>
                        {fieldError?.field === 'slug' && (
                          <FieldError>{tErr(fieldError.code)}</FieldError>
                        )}
                      </Field>
                      {versionField}
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
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="publish-asset">
                          {t('publish', 'field.asset')}
                        </FieldLabel>
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
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMode('new')}
                              >
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
                            {/* **T15 · D26**：取值源 = 占号集合（在途版本不再谎报「暂无版本」）*/}
                            <FieldDescription>{assetContextText}</FieldDescription>
                          </>
                        )}
                      </Field>
                      {versionField}
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </Card>
          ) : null}

          {/* ③ 发布（或结果块）（T10 改名：「提交审核」⇒「发布」）*/}
          {expanded ? (
            <Card className="gap-4 px-6 py-5">
              <FieldSet>
                <SegmentLegend
                  state={panelStates[2]}
                  label={t('publish', 'step.publish')}
                  stateLabel={stateText[panelStates[2]]}
                />
                <FieldGroup>
                  {submitted === null ? (
                    <>
                      {/* T14 调整③：更新说明归 ③ 段（与主按钮同段 ⇒ 发布前最后确认） */}
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
                      <Button
                        type="button"
                        size="lg"
                        disabled={!canPublish}
                        onClick={() => void publish()}
                      >
                        {running
                          ? t('publish', 'action.publishing')
                          : countdown > 0
                            ? t('publish', 'error.rateLimitedCountdown', { seconds: countdown })
                            : t('publish', 'action.publish')}
                      </Button>
                      {/* T13 · **F250**：倒计时提示已上移到 ① 段 Alert（同键同句）—— 此处不再重复，
                        避免同屏两处同文；主按钮 `disabled` + 倒计时语义不变（D43 不撤销）。
                        T14 调整⑥：原按钮下方 `flow.note` 小字**撤除**（键退役 · **F251**） */}
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
                                {issue.path !== undefined && (
                                  <>
                                    <span className="font-mono text-xs">{issue.path}</span>
                                    {' · '}
                                  </>
                                )}
                                {tErr(issue.code ?? 'network')}
                                {/* 服务端原文（F241）：`package_layout_invalid` 这类**只有 message、没有 path**
                                的 issue，本地化码文案与标题同文 ⇒ 不显示原文等于没信息 */}
                                {issue.message !== undefined && (
                                  <span className="text-muted-foreground"> · {issue.message}</span>
                                )}
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
            </Card>
          ) : null}
        </div>

        {/* ── 右栏：流程面板（§4.3）── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          {/* ── 卡 1：识别摘要（T14）—— 只列该阶段**客户端已知**的值（三行）── */}
          <Card className="gap-3 px-5 py-5">
            <h2 className="font-medium text-sm">{t('publish', 'summary.title')}</h2>
            <dl className="flex flex-col gap-2">
              {summaryRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed pb-1.5 text-xs"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* ── 卡 2：流程（§4.3 · T14 去数字 + 撤底部 `flow.note`）── */}
          <Card className="gap-3 px-5 py-5">
            <h2 className="font-medium text-sm">{t('publish', 'flow.title')}</h2>
            <ol className="flex flex-col gap-3">
              {flowSteps.map((step, index) => {
                const state: StepState = panelStates[index] ?? 'pending';
                const connector = index < flowSteps.length - 1;
                return (
                  <li key={step.n} className="relative pl-7">
                    {connector && (
                      <span className="absolute top-5 left-[10px] h-[calc(100%+0.5rem)] w-px bg-border" />
                    )}
                    {/* T14 调整①：编号位改**状态记号**（去数字 1/2/3） */}
                    <span data-state={state} className="absolute top-0.5 left-0">
                      <StateMark state={state} />
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm">{step.title}</span>
                      <span className="text-muted-foreground text-xs">{stateText[state]}</span>
                    </div>
                    {state === 'active' && (
                      <p className="text-muted-foreground mt-1 text-xs">{step.hint}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
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
