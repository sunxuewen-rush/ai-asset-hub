import type { StorageDriver } from '../config/env.js';
import { createLocalStorage } from './local.js';
import type { ObjectStorage } from './types.js';

/** 存储工厂配置（env.ts 同源：driver 枚举 + 目录） */
export interface StorageConfig {
  driver: StorageDriver;
  dir: string;
}

/**
 * 存储工厂（R4：M1 只实现 local；S3 后置 M3）。
 * parseEnv 已拒 s3 启动；此处兜底防绕过 env 直连工厂的误配。
 */
export function createStorage(config: StorageConfig): ObjectStorage {
  switch (config.driver) {
    case 'local':
      return createLocalStorage(config.dir);
    default:
      throw new Error(
        `storage driver '${config.driver}' is not implemented in M1 (only 'local')`,
      );
  }
}
