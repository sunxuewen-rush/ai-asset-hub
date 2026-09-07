import { describe, expect, it } from 'bun:test';
import { DevicePendingStore } from './device-store.js';

const TTL = 10 * 60 * 1000;

describe('DevicePendingStore（T29：RFC 8628 pending）', () => {
  it('create → device 32B base64url + user 8 位免混淆字母', async () => {
    const store = new DevicePendingStore();
    const p = await store.create();
    expect(p.deviceCode).toHaveLength(43); // 32B base64url 无填充
    expect(p.userCode).toHaveLength(8);
    expect(p.userCode).toMatch(/^[2345679ACDEFGHJKMNPQRSTUVWXYZ]+$/);
    expect(p.userId).toBeNull();
    expect(p.expiresAt - p.createdAt).toBe(TTL);
  });

  it('getByDevice roundtrip；TTL 过期后失效（惰性清理）', async () => {
    const store = new DevicePendingStore();
    const p = await store.create();
    expect((await store.getByDevice(p.deviceCode))?.userCode).toBe(p.userCode);
    // 时间推进到过期后 → null 且记录被清
    const after = p.expiresAt + 1;
    expect(await store.getByDevice(p.deviceCode, after)).toBeNull();
    expect(await store.getByDevice(p.deviceCode, after + 1)).toBeNull(); // 已清
  });

  it('getByUser 大小写不敏感；错码 null', async () => {
    const store = new DevicePendingStore();
    const p = await store.create();
    expect((await store.getByUser(p.userCode.toLowerCase()))?.deviceCode).toBe(p.deviceCode);
    expect(await store.getByUser('XXXX-XXXX')).toBeNull();
  });

  it('approve 绑定 userId；重复 approve 幂等；异用户拒绝', async () => {
    const store = new DevicePendingStore();
    const p = await store.create();
    expect(await store.approve(p.deviceCode, 'usr_a')).toBe(true);
    const approved = await store.getByDevice(p.deviceCode);
    expect(approved!.userId).toBe('usr_a');
    // 幂等同用户
    expect(await store.approve(p.deviceCode, 'usr_a')).toBe(true);
    // 异用户拒绝（code 不可猜，理论不可达）
    expect(await store.approve(p.deviceCode, 'usr_b')).toBe(false);
    expect((await store.getByDevice(p.deviceCode))!.userId).toBe('usr_a');
  });

  it('approve 过期/不存在的 code → false', async () => {
    const store = new DevicePendingStore();
    const p = await store.create();
    expect(await store.approve('no-such-code', 'usr_a')).toBe(false);
    expect(await store.approve(p.deviceCode, 'usr_a', p.expiresAt + 1)).toBe(false);
  });

  it('user_code 碰撞重抽 + reject/sweep', async () => {
    const store = new DevicePendingStore();
    const codes = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      codes.add((await store.create()).userCode);
    }
    // 200 个 8 位免混淆 code 理论碰撞率极低；若真碰撞 create 会重抽 → 集合无重复
    expect(codes.size).toBe(200);
    // reject 清除
    const victim = await store.create();
    await store.reject(victim.deviceCode);
    expect(await store.getByDevice(victim.deviceCode)).toBeNull();
    // sweep 清过期（victim 已删 → 计数 = 200 个过期）
    const now = Date.now();
    expect(store.sweep(now)).toBe(0);
    expect(store.sweep(now + TTL + 1)).toBe(200);
  });
});
