/**
 * 版本文件内容读取（M4a R8——design §5.2 G7；T1 实证：assetFile 逐文件顺存直读）。
 * 授权语义复用下载判定（decideDownload——PUBLISHED 匿名；UPLOADED/PENDING_REVIEW
 * 预览授权集；YANKED 400 version_yanked；其余 400 version_not_published——文件内容
 * 读取是下载的前奏，授权同下载最严一致）。
 */
import { and, eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import type { Db } from '../db/client.js';
import { assetFile, assetVersion } from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { decideDownload, type DownloadViewer } from './download.js';
import { AssetError, assetErrorCodes } from './errors.js';

/** 文本预览截断阈值（超限 content 截断 + truncated:true——契约 §5.2） */
export const FILE_CONTENT_TRUNCATE_BYTES = 256 * 1024;

export interface FileContentResult {
  path: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  /** 文本内容（binary=true 时为 undefined——预览 UI 区分提示） */
  content?: string;
}

/** 路径安全校验（`..`/绝对/反斜杠拒绝——db 查询天然不命中，显式拒给友好 400） */
export function assertSafeReadPath(filePath: string): void {
  if (
    filePath.length === 0 ||
    filePath.startsWith('/') ||
    filePath.includes('\\') ||
    filePath.split('/').some((seg) => seg === '..')
  ) {
    throw new AssetError(assetErrorCodes.versionFilePathInvalid);
  }
}

/** 流收集（至 maxBytes 截断——超大文件不全读） */
export function collectStream(stream: Readable, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let truncated = false;
    stream.on('data', (chunk: Buffer) => {
      if (truncated) return;
      const need = maxBytes - total;
      if (need <= 0) {
        truncated = true;
        return;
      }
      const part = chunk.length > need ? chunk.subarray(0, need) : chunk;
      chunks.push(part);
      total += part.length;
      if (total >= maxBytes) truncated = true;
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/** 常见文本 content-type（storage 顺存时 contentTypeFor 推断——白名单判文本） */
const TEXT_PREFIXES = ['text/', 'application/json', 'application/xml', 'application/javascript',
  'application/x-yaml', 'application/x-httpd-php', 'application/sql', 'application/toml'];
const TEXT_EXTS = ['.md', '.markdown', '.json', '.mjs', '.js', '.ts', '.tsx', '.jsx', '.yaml', '.yml',
  '.toml', '.xml', '.txt', '.csv', '.svg', '.css', '.html', '.sh', '.py', '.go', '.rs', '.java', '.c',
  '.h', '.ini', '.conf', '.lock', '.env'];

export function looksTextual(contentType: string | null, path: string, buf: Buffer): boolean {
  const ct = (contentType ?? '').toLowerCase();
  if (TEXT_PREFIXES.some((p) => ct.startsWith(p))) return true;
  const lower = path.toLowerCase();
  if (TEXT_EXTS.some((e) => lower.endsWith(e))) return true;
  // 兜底：utf8 解码试判（含替代符即视非文本）
  try {
    const decoded = buf.toString('utf8');
    return !decoded.includes('\uFFFD');
  } catch {
    return false;
  }
}

export interface ReadVersionFileInput {
  assetId: number;
  ownerId: string;
  version: string;
  filePath: string;
  viewer: DownloadViewer;
}

/**
 * 读版本单文件（T1 路径：db 参数化查 assetFile(versionId+filePath) uq → storage.get
 * 直读零解压；fileSize 先行判定截断；contentType + 扩展名 + utf8 解码判 binary）。
 */
export async function readVersionFile(
  db: Db,
  storage: ObjectStorage,
  input: ReadVersionFileInput,
): Promise<FileContentResult> {
  const { assetId, ownerId, version, filePath, viewer } = input;
  assertSafeReadPath(filePath);

  const vRows = await db
    .select()
    .from(assetVersion)
    .where(and(eq(assetVersion.assetId, assetId), eq(assetVersion.version, version)));
  const versionRow = vRows[0];
  if (!versionRow) throw new AssetError(assetErrorCodes.notFound);
  const decision = decideDownload(versionRow.status, viewer, ownerId, versionRow);
  if (decision.kind === 'yanked') throw new AssetError(assetErrorCodes.versionYanked);
  if (decision.kind === 'not_published') throw new AssetError(assetErrorCodes.versionNotPublished);

  const fRows = await db
    .select()
    .from(assetFile)
    .where(and(eq(assetFile.versionId, versionRow.id), eq(assetFile.filePath, filePath)))
    .limit(1);
  const file = fRows[0];
  if (!file) throw new AssetError(assetErrorCodes.versionFileNotFound);

  const stream = (await storage.get(file.storageKey)) as Readable;
  const buf = await collectStream(stream, FILE_CONTENT_TRUNCATE_BYTES);
  const truncated = file.fileSize > FILE_CONTENT_TRUNCATE_BYTES || buf.byteLength >= FILE_CONTENT_TRUNCATE_BYTES;
  const binary = !looksTextual(file.contentType, file.filePath, buf);
  return {
    path: file.filePath,
    size: file.fileSize,
    binary,
    truncated,
    content: binary ? undefined : buf.toString('utf8'),
  };
}
