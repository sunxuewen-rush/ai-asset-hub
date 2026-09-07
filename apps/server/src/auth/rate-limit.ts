/**
 * 登录限流（05 §3.1 安全边界：匿名低频窗口防爆破）：
 * 内存滑动窗口按 username+IP 聚合；超阈值 429（不锁死账号——行级锁定职责在 local_credential）。
 * 多实例部署换共享存储（接口预留）。
 */

export interface RateLimiter {
  hit(key: string, now?: number): { allowed: boolean; retryAfterSec: number };
  reset(key: string): void;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly maxHits: number,
  ) {}

  hit(key: string, now: number = Date.now()): { allowed: boolean; retryAfterSec: number } {
    const windowStart = now - this.windowMs;
    const entries = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    entries.push(now);
    this.hits.set(key, entries);

    if (entries.length > this.maxHits) {
      const oldest = entries[0]!;
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now);
      return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  /** 防内存无限增长：周期性清理（调用方定时器触发） */
  sweep(now: number = Date.now()): number {
    const windowStart = now - this.windowMs;
    let removed = 0;
    for (const [key, entries] of this.hits) {
      const alive = entries.filter((t) => t > windowStart);
      if (alive.length === 0) {
        this.hits.delete(key);
        removed += 1;
      } else {
        this.hits.set(key, alive);
      }
    }
    return removed;
  }
}
