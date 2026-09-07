import { describe, expect, it } from 'bun:test';
import { assertSafeKey, StorageKeyError } from './types.js';

describe('assertSafeKey（对象存储 key 防穿越）', () => {
  it('拒绝空 key', () => {
    expect(() => assertSafeKey('')).toThrow(StorageKeyError);
  });

  it('拒绝路径穿越（.. 段）', () => {
    expect(() => assertSafeKey('..')).toThrow(StorageKeyError);
    expect(() => assertSafeKey('../secret')).toThrow(StorageKeyError);
    expect(() => assertSafeKey('a/../b')).toThrow(StorageKeyError);
    expect(() => assertSafeKey('1/2/../../etc/passwd')).toThrow(StorageKeyError);
  });

  it('拒绝绝对路径', () => {
    expect(() => assertSafeKey('/etc/passwd')).toThrow(StorageKeyError);
    expect(() => assertSafeKey('/')).toThrow(StorageKeyError);
  });

  it('拒绝反斜杠（Windows 风格路径/转义）', () => {
    expect(() => assertSafeKey('a\\..\\b')).toThrow(StorageKeyError);
    expect(() => assertSafeKey('1\\2\\3\\file.zip')).toThrow(StorageKeyError);
  });

  it('放行服务端拼装的合法嵌套 key', () => {
    // {namespaceId}/{assetId}/{versionId}/{filename}
    expect(() => assertSafeKey('1/2/3/asset.zip')).not.toThrow();
    expect(() => assertSafeKey('100/200/300/docs/README.md')).not.toThrow();
    expect(() => assertSafeKey('42/7/1/with space + (1).tar.gz')).not.toThrow();
    expect(() => assertSafeKey('9/8/7/.hidden')).not.toThrow();
  });
});
