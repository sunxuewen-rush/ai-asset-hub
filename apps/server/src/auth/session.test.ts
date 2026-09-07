import { describe, expect, it } from 'vitest';
import { InMemorySessionStore, SessionManager } from './session.js';

describe('InMemorySessionStore', () => {
  it('creates and retrieves a session', async () => {
    const store = new InMemorySessionStore(1000);
    const manager = new SessionManager(store);
    const sid = await manager.createSession('usr_1', 'alice');
    expect(sid.length).toBeGreaterThanOrEqual(32);
    const data = await manager.getSession(sid);
    expect(data?.userId).toBe('usr_1');
    expect(data?.displayName).toBe('alice');
    expect(data!.expiresAt).toBeGreaterThan(data!.createdAt);
  });

  it('returns null after TTL expiry', async () => {
    const store = new InMemorySessionStore(1000);
    const manager = new SessionManager(store);
    const sid = await manager.createSession('usr_1', 'alice', 0); // 初始 now=0
    // 模拟时间推进 2000ms
    const expired = await manager.getSession(sid, 2000);
    expect(expired).toBeNull();
  });

  it('returns null after revoke', async () => {
    const store = new InMemorySessionStore(60_000);
    const manager = new SessionManager(store);
    const sid = await manager.createSession('usr_1', 'alice');
    await manager.revokeSession(sid);
    expect(await manager.getSession(sid)).toBeNull();
  });

  it('returns null for unknown session id', async () => {
    const store = new InMemorySessionStore(60_000);
    expect(await store.get('no-such-session')).toBeNull();
  });

  it('sweep removes only expired sessions', async () => {
    const store = new InMemorySessionStore(60_000);
    const manager = new SessionManager(store);
    await manager.createSession('usr_1', 'a', 0);
    await manager.createSession('usr_2', 'b', 0);
    const removed = store.sweep(61_000);
    expect(removed).toBe(2);
  });
});
