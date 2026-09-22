/**
 * 版本对比（M4a R9 → **M4b-5 F156**：设计 §5.5——对比引擎替换为官方件）。
 *
 * 契约：`GET /assets/:slug/versions/compare?from=&to=` → `files[]`
 *       （`path` + `changeType` + `binary` / `truncated` + **`patch`（标准 unified diff 文本）**）。
 *
 * **引擎 = `diff`（jsdiff 9.0.0 · BSD-3 · 零依赖）** —— 自研 LCS DP `lineDiff()` 已**退役**（批 design §5.5）。
 * patch 文本规范（批 design §2.1e **G-Q11**）：
 *   ① 每文件一段完整 `diff --git` 段 ⇒ 前端 `react-diff-view` 的 `parseDiff(整段 patch)` 一次吃多文件
 *   ② **3 行头**：`diff --git a/P b/P` / `--- …` / `+++ …`；**不产 `index` 行**（手中只有 `sha256`，非 git blob sha
 *      ⇒ 产 index 即伪造 git 语义）
 *   ③ 增 / 删文件用 `/dev/null`：`ADDED` ⇒ `--- /dev/null`；`DELETED` ⇒ `+++ /dev/null`
 *   ④ **不产** `new file mode` / `deleted file mode` / `similarity index` / `rename`
 *   ⑤ `context: Infinity` ⇒ **全文件单 hunk**（与退役前逐行等价；前端以「按文件折叠」承载收敛）
 *
 * 授权同 R8（`decideDownload`——PUBLISHED 匿名 / 预览集 / YANKED 400——比较读内容与下载同语义）；
 * 大文本（行数 / 读取字节超限）与二进制 ⇒ 标注 `truncated` / `binary` 且**不产 patch**（前端只读标注）。
 */

import type { Readable } from 'node:stream';
import { structuredPatch } from 'diff';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { assetFile, assetVersion } from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { type DownloadViewer, decideDownload } from './download.js';
import { AssetError, assetErrorCodes } from './errors.js';
import { collectStream, looksTextual } from './version-content.js';

export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED';

export interface CompareFileResult {
  path: string;
  changeType: ChangeType;
  binary: boolean;
  /** 文本超限（行数 / 读取字节截断）未产 patch */
  truncated: boolean;
  /** 标准 unified diff 文本（单文件 `diff --git` 段）；`binary` / `truncated` / 无差异 ⇒ 缺省 */
  patch?: string;
}

export interface CompareInput {
  assetId: number;
  ownerId: string;
  from: string;
  to: string;
  viewer: DownloadViewer;
}

/** 单侧行数上限（超限按 truncated 标注；原自研矩阵保护的语义保留为文本规模门槛） */
const MAX_DIFF_LINES = 1500;
/** 单侧读取字节上限（diff 只对中小文本——超大标注 truncated） */
const COMPARE_READ_CAP = 512 * 1024;

/**
 * diff 结果缓存（批 design §5.5）。
 * **内容寻址**：key = `path|sha256(from)|sha256(to)`（缺侧 = `-`）⇒ 内容变则 sha 变则**自动失效**，
 * 并天然跨版本 / 跨资产复用（同内容同路径 ⇒ 同 patch）。TTL 5 分钟 · 上限 100 条 · **进程内**（重启即清，不落库）。
 *
 * ⚠️ **安全硬约束**：**只缓存「内容 → diff 结果」**，**永不缓存「授权判定」** —— `decideDownload` 恒在缓存之前执行。
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 100;
interface CacheEntry {
  at: number;
  value: Pick<CompareFileResult, 'binary' | 'truncated' | 'patch'>;
}
const diffCache = new Map<string, CacheEntry>();

/** 仅测试用：清空缓存（批 design §2.1e **G-Q12** · dogfood / 单测**不得断言命中率**） */
export function __resetCompareCache(): void {
  diffCache.clear();
}

function cacheGet(key: string): CacheEntry['value'] | undefined {
  const hit = diffCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    diffCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: CacheEntry['value']): void {
  diffCache.set(key, { at: Date.now(), value });
  while (diffCache.size > CACHE_MAX) {
    const oldest = diffCache.keys().next();
    if (oldest.done) break;
    diffCache.delete(oldest.value);
  }
}

/** 行数（尾空行不计——与退役前 `splitLines` 口径一致） */
function countLines(text: string): number {
  const parts = text.split('\n');
  return parts.length > 1 && parts[parts.length - 1] === '' ? parts.length - 1 : parts.length;
}

/** 单文件 unified diff 段（3 行头 + 库产 hunk；`undefined` = 无差异） */
function buildPatch(
  path: string,
  changeType: ChangeType,
  fromText: string,
  toText: string,
): string | undefined {
  const oldName = changeType === 'ADDED' ? '/dev/null' : path;
  const newName = changeType === 'DELETED' ? '/dev/null' : path;
  const sp = structuredPatch(oldName, newName, fromText, toText, undefined, undefined, {
    context: Infinity, // 全文件单 hunk —— 与退役前逐行等价
  });
  if (sp.hunks.length === 0) return undefined;

  const out: string[] = [
    `diff --git a/${path} b/${path}`,
    `--- ${changeType === 'ADDED' ? '/dev/null' : `a/${path}`}`,
    `+++ ${changeType === 'DELETED' ? '/dev/null' : `b/${path}`}`,
  ];
  for (const h of sp.hunks) {
    out.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`);
    out.push(...h.lines);
  }
  return `${out.join('\n')}\n`;
}

/** 读版本文件内容（复用 collectStream——cap 内）；binary 判定复用 looksTextual */
async function readFileText(
  storage: ObjectStorage,
  file: { storageKey: string; contentType: string | null; filePath: string; fileSize: number },
): Promise<{ text: string; binary: boolean; truncated: boolean }> {
  const stream = (await storage.get(file.storageKey)) as Readable;
  const buf = await collectStream(stream, COMPARE_READ_CAP);
  const truncated = file.fileSize > COMPARE_READ_CAP || buf.byteLength >= COMPARE_READ_CAP;
  const binary = !looksTextual(file.contentType, file.filePath, buf);
  return { text: binary ? '' : buf.toString('utf8'), binary, truncated };
}

/**
 * 单文件对比（**带内容寻址缓存**）—— `binary` / `truncated` 均为内容派生 ⇒ 可与 patch 一并缓存。
 * `FILE_SIDES` = 读到的内容字节级 sha256（`-` = 该侧无此文件）。
 */
async function compareFile(
  storage: ObjectStorage,
  args: {
    path: string;
    changeType: ChangeType;
    fromFile?: {
      storageKey: string;
      contentType: string | null;
      filePath: string;
      fileSize: number;
      sha256: string;
    };
    toFile?: {
      storageKey: string;
      contentType: string | null;
      filePath: string;
      fileSize: number;
      sha256: string;
    };
  },
): Promise<Pick<CompareFileResult, 'binary' | 'truncated' | 'patch'>> {
  const { path, changeType, fromFile, toFile } = args;
  const key = `${path}|${fromFile?.sha256 ?? '-'}|${toFile?.sha256 ?? '-'}|${changeType}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const [fromText, toText] = await Promise.all([
    fromFile ? readFileText(storage, fromFile) : Promise.resolve(undefined),
    toFile ? readFileText(storage, toFile) : Promise.resolve(undefined),
  ]);
  const binary = Boolean(fromText?.binary) || Boolean(toText?.binary);
  const tooLarge =
    (fromText !== undefined && countLines(fromText.text) > MAX_DIFF_LINES) ||
    (toText !== undefined && countLines(toText.text) > MAX_DIFF_LINES);
  const truncated = Boolean(fromText?.truncated) || Boolean(toText?.truncated) || tooLarge;

  const value: CacheEntry['value'] =
    binary || truncated
      ? { binary, truncated }
      : {
          binary: false,
          truncated: false,
          patch: buildPatch(path, changeType, fromText?.text ?? '', toText?.text ?? ''),
        };

  cacheSet(key, value);
  return value;
}

export async function compareVersions(
  db: Db,
  storage: ObjectStorage,
  input: CompareInput,
): Promise<CompareFileResult[]> {
  const { assetId, ownerId, from, to, viewer } = input;
  const [fromRow, toRow] = await Promise.all([
    db
      .select()
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, assetId), eq(assetVersion.version, from)))
      .limit(1),
    db
      .select()
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, assetId), eq(assetVersion.version, to)))
      .limit(1),
  ]);
  const fv = fromRow[0];
  const tv = toRow[0];
  if (!fv || !tv) throw new AssetError(assetErrorCodes.notFound);
  // ⚠️ 授权恒在缓存之前（缓存只存「内容 → diff 结果」）
  for (const v of [fv, tv]) {
    const decision = decideDownload(v.status, viewer, ownerId, v);
    if (decision.kind === 'yanked') throw new AssetError(assetErrorCodes.versionYanked);
    if (decision.kind === 'not_published')
      throw new AssetError(assetErrorCodes.versionNotPublished);
  }

  const [fromFiles, toFiles] = await Promise.all([
    db.select().from(assetFile).where(eq(assetFile.versionId, fv.id)),
    db.select().from(assetFile).where(eq(assetFile.versionId, tv.id)),
  ]);
  const fromMap = new Map(fromFiles.map((f) => [f.filePath, f]));
  const toMap = new Map(toFiles.map((f) => [f.filePath, f]));
  const allPaths = [...new Set([...fromMap.keys(), ...toMap.keys()])].sort();

  const results: CompareFileResult[] = [];
  for (const p of allPaths) {
    const f = fromMap.get(p);
    const t = toMap.get(p);
    if (f && t) {
      if (f.sha256 === t.sha256) continue; // 未变文件不列（sha 全等）
      const value = await compareFile(storage, {
        path: p,
        changeType: 'MODIFIED',
        fromFile: f,
        toFile: t,
      });
      results.push({ path: p, changeType: 'MODIFIED', ...value });
    } else if (t) {
      const value = await compareFile(storage, { path: p, changeType: 'ADDED', toFile: t });
      results.push({ path: p, changeType: 'ADDED', ...value });
    } else {
      const file = f;
      if (!file) continue; // 不可达守卫（else 分支语义上 f 恒存在）
      const value = await compareFile(storage, { path: p, changeType: 'DELETED', fromFile: file });
      results.push({ path: p, changeType: 'DELETED', ...value });
    }
  }
  return results;
}
