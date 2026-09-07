import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { auditLog, userAccount } from '../db/schema/index.js';
import { createAuditWriter } from './audit.js';
import { queryAudit } from './query.js';

let db: Db;

/** 审计 actor 需真实 user 行（FK）；displayName 前缀 aq- */
async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(async () => {
  const reqIds = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(like(auditLog.requestId, 'aq-%'));
  for (const r of reqIds) {
    await db.delete(auditLog).where(eq(auditLog.id, r.id));
  }
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'aq-%'));
  for (const u of users) {
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('queryAudit（T19：组合过滤 + 稳定分页 + 总数）', () => {
  let u1: string;
  let u2: string;
  // 时间窗用固定偏移（相对 now 的 ± 分钟级，避免时钟边界翻车）
  const NOW = Date.now();
  const older = new Date(NOW - 60_000);
  const middle = new Date(NOW - 30_000);
  const newer = new Date(NOW - 10_000);

  beforeAll(async () => {
    // 幂等：清上次运行残留（重复 run 会重插同 requestId，先清后插）
    const stale = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(like(auditLog.requestId, 'aq-%'));
    for (const r of stale) {
      await db.delete(auditLog).where(eq(auditLog.id, r.id));
    }
    const staleUsers = await db
      .select({ id: userAccount.id })
      .from(userAccount)
      .where(like(userAccount.displayName, 'aq-%'));
    for (const u of staleUsers) {
      await db.delete(userAccount).where(eq(userAccount.id, u.id));
    }

    u1 = await makeUser('aq-u1');
    u2 = await makeUser('aq-u2');
    const write = createAuditWriter(db);
    // 时间轴（desc）：aq-new(NOW-10s) > aq-mid(NOW-30s) > aq-u2(NOW-50s) > aq-old(NOW-60s)
    await write({
      actorId: u1,
      action: 'auth.login.success',
      targetType: 'user',
      targetId: u1,
      requestId: 'aq-old',
      clientIp: '10.1.1.1',
      detail: { m: 1 },
    });
    await db.update(auditLog).set({ createdAt: older }).where(eq(auditLog.requestId, 'aq-old'));
    await write({
      actorId: u1,
      action: 'auth.login.failed',
      targetType: 'user',
      targetId: u1,
      requestId: 'aq-mid',
      clientIp: '10.1.1.2',
    });
    await db.update(auditLog).set({ createdAt: middle }).where(eq(auditLog.requestId, 'aq-mid'));
    await write({
      actorId: u1,
      action: 'auth.logout',
      targetType: 'user',
      targetId: u1,
      requestId: 'aq-new',
      clientIp: '10.1.1.1',
    });
    await db.update(auditLog).set({ createdAt: newer }).where(eq(auditLog.requestId, 'aq-new'));
    // u2 一条（actor 过滤负例；时间窗压在 middle 之下保证排序确定）
    await write({
      actorId: u2,
      action: 'auth.login.success',
      targetType: 'user',
      targetId: u2,
      requestId: 'aq-u2',
      clientIp: '10.2.2.2',
    });
    await db
      .update(auditLog)
      .set({ createdAt: new Date(NOW - 50_000) })
      .where(eq(auditLog.requestId, 'aq-u2'));
  });

  it('无过滤：分页 + total 全量 + createdAt desc（最新在前）', async () => {
    const page = await queryAudit(db, { limit: 2, offset: 0 });
    expect(page.total).toBeGreaterThanOrEqual(4);
    expect(page.items).toHaveLength(2);
    // 时间窗确定序：首条 aq-new（最新）；同文件并行其他 run 无 aq- 前缀互扰
    expect(page.items[0]!.requestId).toBe('aq-new');
    expect(page.items[1]!.requestId).toBe('aq-mid');
    // 翻页接续：第 3 条 aq-u2、第 4 条 aq-old（offset=2）
    const next = await queryAudit(db, { limit: 2, offset: 2 });
    expect(next.items[0]!.requestId).toBe('aq-u2');
    expect(next.items[1]!.requestId).toBe('aq-old');
  });

  it('action 过滤只返回匹配 action', async () => {
    const r = await queryAudit(db, { limit: 20, offset: 0, action: 'auth.login.failed' });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.requestId).toBe('aq-mid');
    expect(r.total).toBe(1);
  });

  it('actorId 过滤只返回该 actor', async () => {
    const r = await queryAudit(db, { limit: 20, offset: 0, actorId: u2 });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.requestId).toBe('aq-u2');
  });

  it('clientIp 过滤组合 action', async () => {
    const r = await queryAudit(db, {
      limit: 20,
      offset: 0,
      clientIp: '10.1.1.1',
      action: 'auth.login.success',
    });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.requestId).toBe('aq-old');
  });

  it('requestId 精确过滤', async () => {
    const r = await queryAudit(db, { limit: 20, offset: 0, requestId: 'aq-mid' });
    expect(r.items).toHaveLength(1);
  });

  it('时间窗 from/to 组合', async () => {
    // middle(NOW-30s) 与 newer(NOW-10s) 在内，old(NOW-60s) 在外
    const r = await queryAudit(db, {
      limit: 20,
      offset: 0,
      from: new Date(NOW - 40_000),
      to: new Date(NOW - 5_000),
    });
    const reqIds = new Set(r.items.map((i) => i.requestId));
    expect(reqIds.has('aq-mid')).toBe(true);
    expect(reqIds.has('aq-new')).toBe(true);
    expect(reqIds.has('aq-old')).toBe(false);
    expect(reqIds.has('aq-u2')).toBe(false); // u2 行 createdAt=now（在窗外）
    expect(r.total).toBe(2);
  });

  it('无匹配 → 空列表 total 0', async () => {
    const r = await queryAudit(db, {
      limit: 20,
      offset: 0,
      action: 'auth.register',
      requestId: 'aq-none',
    });
    expect(r.items).toHaveLength(0);
    expect(r.total).toBe(0);
  });
});
