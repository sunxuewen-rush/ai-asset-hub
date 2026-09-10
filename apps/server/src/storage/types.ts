import type { Readable } from 'node:stream';

/**
 * 对象存储 SPI（08 §5.3 storage_key 契约；M1 只立接口 + Local 实现，
 * M3 上传/下载管线消费，S3 实现按需后置）。
 *
 * key 规则：服务端拼装 `{assetId}/{versionId}/{filename}`（M4-pre：坐标扁平化去空间段；
 * 存量对象的旧 key（含空间段）不受影响——key 存于 `asset_file.storage_key`）；
 * 所有实现必须经 `assertSafeKey` 校验后方可触达底层存储（防路径穿越）。
 */

/** 存储 key 不合法（穿越/绝对路径/反斜杠/空） */
export class StorageKeyError extends Error {
  constructor(key: string) {
    super(`unsafe storage key: ${key}`);
    this.name = 'StorageKeyError';
  }
}

/**
 * 校验存储 key：非空、非绝对路径、无反斜杠、路径段不含 `..`。
 * 不合法即抛 `StorageKeyError`（fail fast，禁止任何实现绕行）。
 */
export function assertSafeKey(key: string): void {
  if (key.length === 0 || key.startsWith('/') || key.includes('\\')) {
    throw new StorageKeyError(key);
  }
  for (const segment of key.split('/')) {
    if (segment === '..') {
      throw new StorageKeyError(key);
    }
  }
}

/** 写入负载：内存 Buffer 或可读流（上传管线按文件大小选择） */
export type PutData = Buffer | Readable;

/** 下载直链签名选项（S3 实现消费；Local 走服务端流式下载，无需直链） */
export interface PresignedOptions {
  /** 有效期秒数（默认实现自定） */
  expiresInSec?: number;
  /** 触发下载的文件名（Content-Disposition attachment） */
  downloadFilename?: string;
}

/**
 * 对象存储接口。get 返回 Buffer 或 Readable（实现自选，Local 返回读流）；
 * 键不存在时实现应抛错（调用方先 exists 判定或接错误出口）。
 */
export interface ObjectStorage {
  put(key: string, data: PutData, options?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<Buffer | Readable>;
  delete(key: string): Promise<void>;
  /** 批量删除（S2 对齐：版本删除按 key 清单一次清理） */
  deleteMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** 下载直链；不支持直链的实现返回 null（服务端流式兜底） */
  presignedGetUrl(key: string, options?: PresignedOptions): Promise<string | null>;
}
