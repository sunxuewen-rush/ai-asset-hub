import { randomBytes } from 'node:crypto';

/** 会话主体（middleware 注入 c.set('principal')） */
export interface Principal {
  userId: string;
  displayName: string;
}

export interface SessionData extends Principal {
  createdAt: number;
  expiresAt: number;
}

export interface SessionStore {
  /** 签发：返回 session id（≥32B 随机） */
  create(data: Omit<SessionData, 'createdAt' | 'expiresAt'>, now?: number): Promise<string>;
  get(sessionId: string, now?: number): Promise<SessionData | null>;
  revoke(sessionId: string): Promise<void>;
}

/**
 * 内存 SessionStore（R4：进程内 Map + TTL 惰性过期清理）。
 * 多实例共享存储为部署期配置项——实现 SessionStore 接口即换（Redis/DB）。
 */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionData>();

  constructor(private readonly ttlMs: number) {}

  async create(
    data: Omit<SessionData, 'createdAt' | 'expiresAt'>,
    now: number = Date.now(),
  ): Promise<string> {
    const sessionId = randomBytes(32).toString('base64url');
    this.sessions.set(sessionId, {
      ...data,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    });
    return sessionId;
  }

  async get(sessionId: string, now: number = Date.now()): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    // 惰性过期清理（08h TTL）
    if (session.expiresAt <= now) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  async revoke(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  /** 测试/维护：清理全部过期会话 */
  sweep(now: number = Date.now()): number {
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}

export class SessionManager {
  constructor(private readonly store: SessionStore) {}

  /** now 仅供测试注入（模拟时间推进） */
  async createSession(userId: string, displayName: string, now?: number): Promise<string> {
    return this.store.create({ userId, displayName }, now);
  }

  /** now 仅供测试注入 */
  async getSession(sessionId: string, now?: number): Promise<SessionData | null> {
    return this.store.get(sessionId, now);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.store.revoke(sessionId);
  }
}
