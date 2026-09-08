/**
 * 扫描器注册表（M3 design §3.2 R3：M3 单实现直通——扫描规则全资产共用，
 * type 差异化在 SPI 输入内由真规则消费；替换实现点留在此处，M6 接真扫描器）。
 */
import { createPassThroughScanner } from './pass-through.js';
import type { Scanner } from './types.js';

let singleton: Scanner | null = null;

/** 取治理扫描器（惰性单例——无状态可共享；未来真规则替换 createPassThroughScanner） */
export function getScanner(): Scanner {
  singleton ??= createPassThroughScanner();
  return singleton;
}
