import { describe, expect, test } from 'bun:test';
import { parseTrustedOrigins } from './better-auth.js';

/**
 * Origin 白名单解析（design §4.3 R9 · §2.1 R9）。
 *
 * 语义：env 里是**逗号分隔串**（空 = 仅同源）；解析必须容忍书写噪声（空格/空段/尾逗号），
 * 且**不得**把空段变成 `''` 白名单项——一个空字符串进白名单等于放行任意同形 origin（安全面）。
 * 注：本文件只 import 模块级纯函数，导入期不构造实例（因此不解析 env）。
 */

describe('parseTrustedOrigins：逗号分隔 Origin 白名单', () => {
  test('空串 ⇒ 空数组（= 仅同源，安全默认）', () => {
    expect(parseTrustedOrigins('')).toEqual([]);
  });

  test('未设置（只含空白的串）⇒ 空数组', () => {
    expect(parseTrustedOrigins('   ')).toEqual([]);
    expect(parseTrustedOrigins('\n')).toEqual([]);
  });

  test('单值原样返回（dev 场景：web 源）', () => {
    expect(parseTrustedOrigins('http://localhost:5173')).toEqual(['http://localhost:5173']);
  });

  test('多值：按逗号切分并各段 trim', () => {
    expect(parseTrustedOrigins('http://localhost:5173, http://localhost:3000')).toEqual([
      'http://localhost:5173',
      'http://localhost:3000',
    ]);
  });

  test('书写噪声（空段 / 首尾逗号 / 多余空格）不产生空项', () => {
    const parsed = parseTrustedOrigins(' http://a.test , ,http://b.test, ');
    expect(parsed).toEqual(['http://a.test', 'http://b.test']);
    expect(parsed).not.toContain('');
  });

  test('通配形态（官方 trustedOrigins 支持）原样透传，不做本地改写', () => {
    expect(parseTrustedOrigins('*.example.test')).toEqual(['*.example.test']);
  });
});
