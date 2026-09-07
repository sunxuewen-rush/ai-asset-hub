import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ObjectStorage, PresignedOptions, PutData } from './types.js';
import { assertSafeKey, StorageKeyError } from './types.js';

/**
 * Local 对象存储实现（R4：M1 只落 Local；S3 后置 M3）。
 * 目录布局 = key 直接映射为 dir 下路径；put 写临时文件原子改名（并发安全）。
 * contentType 不落盘——下载响应头由 M3 从 asset_file.content_type 取，存储层无元数据面。
 */

/** key → dir 内绝对路径：assertSafeKey 之后仍校验解析结果以 dir 为根（纵深防御） */
function resolvePath(root: string, key: string): string {
  assertSafeKey(key);
  const resolvedRoot = path.resolve(root);
  const full = path.resolve(resolvedRoot, key);
  if (full !== resolvedRoot && !full.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new StorageKeyError(key);
  }
  return full;
}

/** ENOENT 忽略（delete 幂等面）；其余错误照抛 */
async function unlinkIfExists(full: string): Promise<void> {
  try {
    await unlink(full);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

export function createLocalStorage(dir: string): ObjectStorage {
  return {
    async put(key: string, data: PutData): Promise<void> {
      const full = resolvePath(dir, key);
      await mkdir(path.dirname(full), { recursive: true });
      const tmp = `${full}.${randomUUID()}.tmp`;
      if (data instanceof Buffer) {
        await writeFile(tmp, data);
      } else {
        await pipeline(data, createWriteStream(tmp));
      }
      await rename(tmp, full);
    },

    async get(key: string): Promise<Readable> {
      const full = resolvePath(dir, key);
      try {
        await stat(full);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`storage key not found: ${key}`);
        }
        throw err;
      }
      return createReadStream(full);
    },

    async delete(key: string): Promise<void> {
      await unlinkIfExists(resolvePath(dir, key));
    },

    async deleteMany(keys: string[]): Promise<void> {
      await Promise.all(keys.map((key) => unlinkIfExists(resolvePath(dir, key))));
    },

    async exists(key: string): Promise<boolean> {
      const full = resolvePath(dir, key);
      try {
        await stat(full);
        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw err;
      }
    },

    // Local 无下载直链（M3 下载走服务端流式）；S3 实现按此签名接 presigned URL
    async presignedGetUrl(_key: string, _options?: PresignedOptions): Promise<null> {
      return null;
    },
  };
}
