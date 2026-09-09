/**
 * 版本对比（M4a R9——design §5.2 G8：服务端行级 diff，前端零 diff 库）。
 * 契约：GET /assets/:ns/:slug/versions/compare?from=&to= → files[]（path + changeType +
 * binary/truncated + hunks（行级 unified diff 数据））。
 * 授权同 R8（decideDownload——PUBLISHED 匿名 / 预览集 / YANKED 400——比较读内容与下载同语义）；
 * 大文本（行数/矩阵超限）与二进制 → 标注 truncated/binary 不产 hunks（前端区分提示）。
 */

import type { Readable } from 'node:stream';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { assetFile, assetVersion } from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { type DownloadViewer, decideDownload } from './download.js';
import { AssetError, assetErrorCodes } from './errors.js';
import { collectStream, looksTextual } from './version-content.js';

export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED';
export type DiffLineType = 'ADD' | 'DELETE' | 'CONTEXT';

export interface DiffLine {
  type: DiffLineType;
  /** 源版本行号（ADD 行无——null） */
  oldLineNumber: number | null;
  /** 目标版本行号（DELETE 行无——null） */
  newLineNumber: number | null;
  content: string;
}

export interface CompareFileResult {
  path: string;
  changeType: ChangeType;
  binary: boolean;
  /** 文本超限（行数/读取字节截断）未产行 diff */
  truncated: boolean;
  hunks?: Array<{ lines: DiffLine[] }>;
}

export interface CompareInput {
  assetId: number;
  ownerId: string;
  from: string;
  to: string;
  viewer: DownloadViewer;
}

/** 单侧行数上限（LCS DP 矩阵保护——超限按 truncated 标注） */
const MAX_DIFF_LINES = 1500;
/** 单侧读取字节上限（行 diff 只对中小文本——超大标注 truncated） */
const COMPARE_READ_CAP = 512 * 1024;

/**
 * 行级 diff（LCS DP + 回溯——O(n·m) 滚动不适用需全表回溯；n/m 上限保护）。
 * 返回统一 diff 行序列（GitHub 视觉数据：行号双列 + ADD/DELETE/CONTEXT）。
 */
/** split 去尾空行（文件尾 \n 的正常形态——GitHub 行视图不含尾空行） */
function splitLines(text: string): string[] {
  const parts = text.split('\n');
  if (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

function lineDiff(fromLines: string[], toLines: string[]): DiffLine[] {
  const n = fromLines.length;
  const m = toLines.length;
  if (n === 0)
    return toLines.map((c, i) => ({
      type: 'ADD',
      oldLineNumber: null,
      newLineNumber: i + 1,
      content: c,
    }));
  if (m === 0)
    return fromLines.map((c, i) => ({
      type: 'DELETE',
      oldLineNumber: i + 1,
      newLineNumber: null,
      content: c,
    }));
  if (n > MAX_DIFF_LINES || m > MAX_DIFF_LINES) throw new Error('diff_too_large');

  // LCS 长度矩阵（Int32 行滚动 + 回溯用全表——n*m ≤ 1500² 内存受控）
  const rows = n + 1;
  const cols = m + 1;
  const dp = new Int32Array(rows * cols);
  for (let i = n - 1; i >= 0; i--) {
    const fi = fromLines[i];
    if (fi === undefined) continue; // 不可达守卫（i<n 恒真）——noNonNull 替代
    for (let j = m - 1; j >= 0; j--) {
      dp[i * cols + j] =
        fi === toLines[j]
          ? dp[(i + 1) * cols + j + 1]! + 1
          : Math.max(dp[(i + 1) * cols + j]!, dp[i * cols + j + 1]!);
    }
  }
  // 回溯
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const fl = fromLines[i];
    const tl = toLines[j];
    if (fl === undefined || tl === undefined) break; // 不可达守卫（i<n 且 j<m 恒真）
    if (fl === tl) {
      out.push({ type: 'CONTEXT', oldLineNumber: i + 1, newLineNumber: j + 1, content: fl });
      i++;
      j++;
    } else if (dp[(i + 1) * cols + j]! >= dp[i * cols + j + 1]!) {
      out.push({ type: 'DELETE', oldLineNumber: i + 1, newLineNumber: null, content: fl });
      i++;
    } else {
      out.push({ type: 'ADD', oldLineNumber: null, newLineNumber: j + 1, content: tl });
      j++;
    }
  }
  while (i < n) {
    const fl = fromLines[i];
    if (fl === undefined) break; // 不可达守卫
    out.push({ type: 'DELETE', oldLineNumber: i + 1, newLineNumber: null, content: fl });
    i++;
  }
  while (j < m) {
    const tl = toLines[j];
    if (tl === undefined) break; // 不可达守卫
    out.push({ type: 'ADD', oldLineNumber: null, newLineNumber: j + 1, content: tl });
    j++;
  }
  return out;
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

/** 全 ADD/DELETE 行序列（ADDED/DELETED 文件——GitHub 视觉全量行） */
function fullAddOrDelete(type: 'ADD' | 'DELETE', content: string): CompareFileResult['hunks'] {
  const lines = splitLines(content).map((line, idx) =>
    type === 'ADD'
      ? { type: 'ADD' as const, oldLineNumber: null, newLineNumber: idx + 1, content: line }
      : { type: 'DELETE' as const, oldLineNumber: idx + 1, newLineNumber: null, content: line },
  );
  return lines.length > 0 ? [{ lines }] : undefined;
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
      const { text, binary, truncated } = await readFileText(storage, t);
      if (binary || truncated) {
        results.push({ path: p, changeType: 'MODIFIED', binary, truncated });
        continue;
      }
      const fromText = await readFileText(storage, f);
      let lines: DiffLine[];
      try {
        lines = lineDiff(splitLines(fromText.text), splitLines(text));
      } catch {
        results.push({ path: p, changeType: 'MODIFIED', binary: false, truncated: true });
        continue;
      }
      results.push({
        path: p,
        changeType: 'MODIFIED',
        binary: false,
        truncated: false,
        hunks: [{ lines }],
      });
    } else if (t) {
      const { text, binary, truncated } = await readFileText(storage, t);
      results.push({
        path: p,
        changeType: 'ADDED',
        binary,
        truncated,
        hunks: !binary && !truncated ? fullAddOrDelete('ADD', text) : undefined,
      });
    } else {
      const file = f;
      if (!file) continue; // 不可达守卫（else 分支语义上 f 恒存在）
      const { text, binary, truncated } = await readFileText(storage, file);
      results.push({
        path: p,
        changeType: 'DELETED',
        binary,
        truncated,
        hunks: !binary && !truncated ? fullAddOrDelete('DELETE', text) : undefined,
      });
    }
  }
  return results;
}
