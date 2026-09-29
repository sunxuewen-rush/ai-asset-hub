/**
 * 一键链编排（M4b-7 T5 新建 · design **§4.4**）—— **纯函数模块，无 React 依赖**。
 *
 * 语义（design §4.4 逐条对齐）：
 * - **三跳**：跳1 注册（仅「新建」支）→ 跳2 上传（multipart，带进度）→ 跳3 提审
 * - **失败停点不回滚**（D5）：任一步失败即停在该步，返回 `stopAt` + 资产 slug（供「放弃该资产」出口）
 * - **跳1 幂等边界**（D39）：以**本页会话内「已创建」标记**为准 —— 「选用已有资产」支不调注册端点；
 *   重试时（`createdSlug` 已给）也**不重复注册**；**不做服务端探测**
 * - **每跳回调** `onStep(step, 'active' | 'done')` 驱动右栏三段状态（design §4.3）
 * - **不做**每跳自定义超时（C9 明确不定毫秒数）；上传进度与取消经 `apiUpload`（§4.5）
 */
import { createAsset } from '../api/assets.js';
import type { ApiUploadOptions, ApiWriteOptions } from '../api/client.js';
import type { AssetType } from '../api/types.js';
import {
  type CreatedVersion,
  type SubmitVersionResult,
  submitVersion,
  type UploadVersionInput,
  uploadVersion,
} from '../api/versions.js';

/** 链上三步（与右栏三段一一对应） */
export type ChainStep = 1 | 2 | 3;

/** 依赖注入面（默认取真实 api；注入仅用于测试/桩，调用方通常省略） */
export interface PublishChainDeps {
  createAsset?: (
    input: { slug: string; type: AssetType },
    opts?: ApiWriteOptions,
  ) => Promise<{ slug: string }>;
  uploadVersion?: (
    slug: string,
    input: UploadVersionInput,
    opts?: Omit<ApiUploadOptions, 'file' | 'fields' | 'fileField'>,
  ) => Promise<CreatedVersion>;
  submitVersion?: (
    slug: string,
    version: string,
    opts?: ApiWriteOptions,
  ) => Promise<SubmitVersionResult>;
}

export interface PublishChainInput {
  /** 目标：`create` = 新建支（**会调注册端点**）；`existing` = 选用已有资产支（跳 1 跳过） */
  target: { kind: 'create'; slug: string; type: AssetType } | { kind: 'existing'; slug: string };
  /**
   * 本页会话内**已创建成功**的 slug（一次失败后的重试会带上它）⇒ 跳 1 跳过、**不重复注册**（D39）。
   * 仅对 `kind: 'create'` 有意义。
   */
  createdSlug?: string;
  file: File | Blob;
  version: string;
  changelog?: string;
}

export interface PublishChainHooks {
  /**
   * 每跳**进入 / 完成**回调（驱动右栏状态；`active` = 当前步，`done` = 完成）。
   *
   * ⚠ **不报 `failed`**：失败态由调用方按返回值的 `stopAt` 推导 —— 单一真源（design §4.8 的
   * 「未通过」态由页面在 catch 后一次性置位），避免链与页面各持一份状态而漂移。
   */
  onStep?: (step: ChainStep, state: 'active' | 'done') => void;
  /** 上传进度 0–100（透传 `apiUpload`） */
  onProgress?: (percent: number) => void;
  /** 取消 / 卸载（C16：组件卸载即 abort —— 与「取消上传」同一通路） */
  signal?: AbortSignal;
}

/** `assetSlug` = 停点处已存在的资产（跳 1 失败 ⇒ `null`），供「放弃该资产」/「去我的资产」分支出文案 */
export type PublishChainResult =
  | { ok: true; assetSlug: string; version: string; taskId: number }
  | { ok: false; stopAt: ChainStep; error: unknown; assetSlug: string | null };

/**
 * 版本号预填（**C3 / D37** —— 纯推导，不拉版本列表、不做撞号规避）。
 *
 * | 输入 `latestVersion` | 输出 | 依据 |
 * |---|---|---|
 * | `null`（空壳 / 新建） | `1.0.0` | C3「新建 = 1.0.0；`latestVersion === null` ⇒ 1.0.0」 |
 * | `1.2.3` | `1.2.4` | C3「取 `latestVersion` → `major.minor.(patch+1)`」 |
 * | `2.0.0-pre` | `2.0.0` | D37「含 `-pre` ⇒ **剥 pre 段补位**」（该核心号尚未正式发布 ⇒ 不需 +1） |
 * | `2.0.0-pre+build` | `2.0.0` | 同上（build 段一并剥） |
 * | `1.2.3+build` | `1.2.4` | 无 pre ⇒ 正常 `patch+1`（build 元数据不参与） |
 * | 形状不认识 | `1.0.0` | 兜底退回起点（**服务端才是判定者** —— D11 不变；撞号由 409 交用户手改） |
 *
 * 撞号（409 `asset.version_conflict`）**不在此处理**：页面按 D37 就地给 `version` 字段行内提示。
 */
export function deriveNextVersion(latestVersion: string | null): string {
  if (latestVersion === null) return '1.0.0';
  // 先剥 build 段（`+build`），再剥 `-pre`（服务端版本形态见 `versionFieldSchema`：
  // `^\d+\.\d+\.\d+(-pre)?(+build)?$` ⇒ 两段都是字面量，非任意 semver 预发布）
  const [core = ''] = latestVersion.split('+');
  const stripped = core.replace(/-pre$/, '');
  const matched = /^(\d+)\.(\d+)\.(\d+)$/.exec(stripped);
  if (matched === null) return '1.0.0';
  if (stripped !== core) return stripped; // 含 `-pre` ⇒ 剥段补位（不 +1）
  return `${matched[1]}.${matched[2]}.${Number(matched[3]) + 1}`;
}

/**
 * 跑一键链（design §4.4）。**失败停点不回滚**；返回值携带停点与资产 slug 供页面出出口。
 *
 * 参数顺序按批 plan **T5** 的签名（`deps` 前置且可省略）：`runChain(deps, input, hooks)`。
 */
export async function runChain(
  deps: PublishChainDeps = {},
  input: PublishChainInput,
  hooks: PublishChainHooks = {},
): Promise<PublishChainResult> {
  const doCreate = deps.createAsset ?? createAsset;
  const doUpload = deps.uploadVersion ?? uploadVersion;
  const doSubmit = deps.submitVersion ?? submitVersion;

  // 跳 1 —— 仅「新建」支且本页尚未创建成功时执行
  let slug: string | null =
    input.target.kind === 'existing' ? input.target.slug : (input.createdSlug ?? null);
  if (input.target.kind === 'create' && slug === null) {
    hooks.onStep?.(1, 'active');
    try {
      const created = await doCreate(
        { slug: input.target.slug, type: input.target.type },
        { signal: hooks.signal },
      );
      slug = created.slug;
      hooks.onStep?.(1, 'done');
    } catch (error) {
      return { ok: false, stopAt: 1, error, assetSlug: null };
    }
  } else {
    hooks.onStep?.(1, 'done'); // 跳 1 跳过 ⇒ 右栏①直接置完成
  }

  // 收窄：两条支都已赋值 slug（新建支刚拿到、已有支起点即有）——显式兜底取代非空断言
  if (slug === null) {
    return {
      ok: false,
      stopAt: 1,
      error: new Error('publish-chain: asset slug unresolved'),
      assetSlug: null,
    };
  }
  const assetSlug: string = slug;

  // 跳 2 —— 上传（DRAFT）
  hooks.onStep?.(2, 'active');
  try {
    await doUpload(
      assetSlug,
      { file: input.file, version: input.version, changelog: input.changelog },
      { onProgress: hooks.onProgress, signal: hooks.signal },
    );
    hooks.onStep?.(2, 'done');
  } catch (error) {
    return { ok: false, stopAt: 2, error, assetSlug };
  }

  // 跳 3 —— 提审
  hooks.onStep?.(3, 'active');
  try {
    const submitted = await doSubmit(assetSlug, input.version, { signal: hooks.signal });
    hooks.onStep?.(3, 'done');
    return { ok: true, assetSlug, version: input.version, taskId: submitted.taskId };
  } catch (error) {
    return { ok: false, stopAt: 3, error, assetSlug };
  }
}

/**
 * zip 文件名 → slug（T6 · design §3.1）—— **照搬** `24-clawhub/src/routes/skills/publish.tsx:1394-1402`
 * `slugFromFolderName`，仅在两处按 AIH 形态改动（差异清单见 design §3.1）：
 * - 差异②：末尾加「截断 **64** → 再去尾部 `-`」（AIH `slugSchema` 硬上限 64；ClawHub 无此步）
 * - 差异③：入参是**文件名**，先去掉 `.zip` 扩展名（大小写不敏感；ClawHub 入参本就是目录名）
 *
 * 规则：trim → camelCase 拆词 → 小写 → 非 `[a-z0-9]` 全变 `-` → 去首尾 `-` → 折叠 `--` → 截 64 → 去尾 `-`
 * 派生结果为空（如纯中文名 `我的技能.zip`）⇒ 返回 `''`（调用方**留空不猜** —— 同 ClawHub 的 `if (nextSlug && …)`）
 */
export function deriveSlugFromFileName(fileName: string): string {
  const base = fileName.trim().replace(/\.zip$/i, '');
  return base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64)
    .replace(/-+$/g, '');
}
