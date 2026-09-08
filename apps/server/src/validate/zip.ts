/**
 * zip 结构校验（M2 design §4；02 §3.3 上限契约 + 服务端安全规则）。
 * yauzl 流式遍历（防 zip bomb：边读边累计，超限即停不继续解压）；
 * 路径安全（穿越/绝对/反斜杠/symlink）拒绝；目录条目跳过不计数。
 * 数值上限 env 可配（skillhub properties 同构）：
 *   AHT_PACKAGE_MAX_BYTES（总包，默认 10MiB）
 *   AHT_FILE_MAX_BYTES（单文件，默认 1MiB）
 *   AHT_MAX_FILES（条目数，默认 100）
 * 超限/结构错误抛 ZipValidationError（code = protocolErrorCodes / assetErrorCodes）。
 */
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { fromBuffer } from 'yauzl';
import { assetErrorCodes } from '../assets/errors.js';

export interface ZipLimits {
  maxTotalBytes: number;
  maxFileBytes: number;
  maxFiles: number;
}

const MiB = 1024 * 1024;

export function defaultZipLimits(env: NodeJS.ProcessEnv = process.env): ZipLimits {
  const num = (v: string | undefined, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    maxTotalBytes: num(env.AHT_PACKAGE_MAX_BYTES, 10 * MiB),
    maxFileBytes: num(env.AHT_FILE_MAX_BYTES, 1 * MiB),
    maxFiles: num(env.AHT_MAX_FILES, 100),
  };
}

export interface ZipEntryMeta {
  /** zip 内相对路径（已过安全校验；主文件 root 级判定各族规则负责） */
  path: string;
  /** 解压后字节数（uncompressedSize） */
  size: number;
}

/** 包结构/安全违规（code 07 §4 结构化码——T12 上传端 400 返回首错） */
export class ZipValidationError extends Error {
  constructor(
    public readonly code: string,
    public readonly path?: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ZipValidationError';
  }
}

/** zip 条目路径安全（zip-slip 防护：禁绝对/反斜杠/空段/.././穿越） */
export function assertSafeZipPath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('//')
  ) {
    throw new ZipValidationError(assetErrorCodes.packagePathInvalid, path);
  }
  for (const segment of path.split('/')) {
    if (segment === '..' || segment === '.') {
      throw new ZipValidationError(assetErrorCodes.packagePathInvalid, path);
    }
  }
}

/** unix 外部属性提取（mode 高 16 位）；无 unix 属性返回 0 */
function unixMode(entry: { externalFileAttributes: number }): number {
  return entry.externalFileAttributes >>> 16;
}

/**
 * 流式扫描 zip：目录条目跳过（尾斜杠或 dir mode），文件条目逐项校验
 * （路径安全/symlink/单文件上限/总量/条目数），全部通过返回条目清单。
 * 违规即抛 ZipValidationError（首错即停——02 契约 fail fast）。
 */
export async function scanZip(zip: Buffer, limits: ZipLimits = defaultZipLimits()): Promise<{ entries: ZipEntryMeta[] }> {
  return new Promise((resolve, reject) => {
    fromBuffer(zip, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        reject(new ZipValidationError(assetErrorCodes.packageLayoutInvalid, undefined, 'zip open failed'));
        return;
      }
      const entries: ZipEntryMeta[] = [];
      let totalBytes = 0;
      let fileCount = 0;

      zipfile.on('error', (err: Error) => {
        reject(new ZipValidationError(assetErrorCodes.packageLayoutInvalid, undefined, err.message));
      });
      zipfile.on('entry', (entry: { fileName: string; uncompressedSize: number; externalFileAttributes: number }) => {
        try {
          assertSafeZipPath(entry.fileName);
          const mode = unixMode(entry);
          const isDir = entry.fileName.endsWith('/') || (mode & 0o170000) === 0o040000;
          if (isDir) {
            zipfile.readEntry();
            return;
          }
          // symlink 拒绝（服务端安全规则：解压语义不可追踪外部目标）
          if ((mode & 0o170000) === 0o120000) {
            throw new ZipValidationError(assetErrorCodes.packagePathInvalid, entry.fileName, 'symlink entries are not allowed');
          }
          if (entry.uncompressedSize > limits.maxFileBytes) {
            throw new ZipValidationError(protocolErrorCodes.fileTooLarge, entry.fileName);
          }
          totalBytes += entry.uncompressedSize;
          if (totalBytes > limits.maxTotalBytes) {
            throw new ZipValidationError(protocolErrorCodes.packageTooLarge, undefined);
          }
          fileCount += 1;
          if (fileCount > limits.maxFiles) {
            throw new ZipValidationError(protocolErrorCodes.tooManyFiles, undefined);
          }
          entries.push({ path: entry.fileName, size: entry.uncompressedSize });
          zipfile.readEntry();
        } catch (err) {
          zipfile.close();
          reject(err);
        }
      });
      zipfile.on('end', () => resolve({ entries }));
      zipfile.readEntry();
    });
  });
}

/** 取 zip 内单文件内容（主文件读取——族规则/解析器共用；≤maxFileBytes 已由 scan 保证） */
export function readZipEntry(zip: Buffer, path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fromBuffer(zip, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        reject(new ZipValidationError(assetErrorCodes.packageLayoutInvalid, undefined, 'zip open failed'));
        return;
      }
      let found = false;
      zipfile.on('error', (err: Error) => reject(err));
      zipfile.on('entry', (entry) => {
        if (entry.fileName === path) {
          found = true;
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              reject(new ZipValidationError(assetErrorCodes.packageLayoutInvalid, path, 'read stream failed'));
              return;
            }
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', (err: Error) => reject(err));
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.on('end', () => {
        if (!found) {
          reject(new ZipValidationError(assetErrorCodes.packageLayoutInvalid, path, 'entry not found'));
        }
      });
      zipfile.readEntry();
    });
  });
}
