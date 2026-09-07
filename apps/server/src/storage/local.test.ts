import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createLocalStorage } from './local.js';
import { StorageKeyError } from './types.js';

/** 收集 Readable → Buffer（roundtrip 字节断言） */
async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe('local object storage（tmp dir roundtrip）', () => {
  let dir: string;
  let storage: ReturnType<typeof createLocalStorage>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'aih-storage-'));
    storage = createLocalStorage(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('put(buffer) → get 字节一致，文件落盘', async () => {
    const payload = Buffer.from('hello object storage 你好');
    await storage.put('1/2/3/asset.zip', payload);
    const got = await collect((await storage.get('1/2/3/asset.zip')) as Readable);
    expect(got.equals(payload)).toBe(true);
    expect(await storage.exists('1/2/3/asset.zip')).toBe(true);
    // 磁盘真实存在（内容校验双通道）
    expect(await readFile(path.join(dir, '1/2/3/asset.zip'))).toEqual(payload);
  });

  it('put(stream) → get 字节一致', async () => {
    const payload = Buffer.from('streamed payload '.repeat(2000));
    await storage.put('100/200/300/big.bin', Readable.from(payload));
    const got = await collect((await storage.get('100/200/300/big.bin')) as Readable);
    expect(got.equals(payload)).toBe(true);
  });

  it('重复 put 同 key 覆盖（原子替换）', async () => {
    await storage.put('1/2/3/file', Buffer.from('v1'));
    await storage.put('1/2/3/file', Buffer.from('v2'));
    const got = await collect((await storage.get('1/2/3/file')) as Readable);
    expect(got.toString()).toBe('v2');
    // 无残留 tmp 文件
    expect(await readdir(path.join(dir, '1/2/3'))).toEqual(['file']);
  });

  it('get 不存在的 key 抛错', async () => {
    await expect(storage.get('9/9/9/missing.bin')).rejects.toThrow('storage key not found');
  });

  it('delete 幂等；deleteMany 批量清理', async () => {
    await storage.put('1/2/3/a', Buffer.from('a'));
    await storage.put('1/2/3/b', Buffer.from('b'));
    await storage.deleteMany(['1/2/3/a', '1/2/3/b']);
    expect(await storage.exists('1/2/3/a')).toBe(false);
    expect(await storage.exists('1/2/3/b')).toBe(false);
    // 幂等：再删不抛
    await storage.delete('1/2/3/a');
    await storage.deleteMany(['1/2/3/a', '1/2/3/b']);
  });

  it('presignedGetUrl 不支持 → null（服务端流式兜底语义）', async () => {
    await expect(storage.presignedGetUrl('1/2/3/a')).resolves.toBeNull();
  });

  it('越界 key（穿越/绝对/反斜杠）put/exists 抛错且不落盘', async () => {
    const evil = Buffer.from('evil');
    const outOfBounds = [
      '../escape.bin',
      'a/../../escape.bin',
      '/etc/escape.bin',
      'a\\b\\escape.bin',
    ];
    for (const key of outOfBounds) {
      await expect(storage.put(key, evil)).rejects.toThrow(StorageKeyError);
      await expect(storage.exists(key)).rejects.toThrow(StorageKeyError);
    }
    // 目录根下未写入任何越界内容；dir 保持空
    expect(await readdir(dir)).toEqual([]);
  });

  it('delete/exists 越界 key 同样抛错（全方法同一闸门）', async () => {
    await expect(storage.delete('../x')).rejects.toThrow(StorageKeyError);
    await expect(storage.deleteMany(['a/b', '../x'])).rejects.toThrow(StorageKeyError);
  });
});
