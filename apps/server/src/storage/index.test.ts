import { describe, expect, it } from 'bun:test';
import { createStorage } from './index.js';

describe('createStorage 工厂', () => {
  it('STORAGE_DRIVER=local 返回 ObjectStorage（Local 实现）', () => {
    const storage = createStorage({ driver: 'local', dir: '/tmp/aih-objects' });
    expect(typeof storage.put).toBe('function');
    expect(typeof storage.get).toBe('function');
    expect(typeof storage.delete).toBe('function');
    expect(typeof storage.deleteMany).toBe('function');
    expect(typeof storage.exists).toBe('function');
    expect(typeof storage.presignedGetUrl).toBe('function');
  });

  it('s3 → 抛 not implemented（工厂兜底，防绕过 env 直连误配）', () => {
    expect(() => createStorage({ driver: 's3', dir: '/tmp/x' })).toThrow(/not implemented/);
  });
});
