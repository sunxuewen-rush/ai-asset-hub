import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';
import { AUDIT_ACTIONS, createAuditWriter } from './audit.js';

let db: Db;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(async () => {
  // 精确清理自数据（requestId 唯一标识 + 匿名 ghost 行）——不误删并发文件的同 action 行
  await db.delete(auditLog).where(eq(auditLog.requestId, 'req-12345'));
  await db
    .delete(auditLog)
    .where(sql`actor_id IS NULL AND detail->>'username' = 'ghost'`);
  await db.delete(auditLog).where(eq(auditLog.action, 'test.audit'));
  await db.$client.end();
});

describe('audit writer（08 §6 v1.1：D5 网络字段落库）', () => {
  it('persists full entry incl. request_id / client_ip / user_agent / detail', async () => {
    const write = createAuditWriter(db);
    await write({
      action: AUDIT_ACTIONS.loginSuccess,
      targetType: 'user',
      targetId: 'usr_audit-actor',
      requestId: 'req-12345',
      clientIp: '10.1.2.3',
      userAgent: 'vitest/1.0',
      detail: { username: 'audit-user' },
    });
    const rows = await db.select().from(auditLog).where(eq(auditLog.requestId, 'req-12345'));
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    // actor 落库已由 app.test（真实用户全链路）覆盖；此处聚焦 D5 网络字段
    expect(row.action).toBe('auth.login.success');
    expect(row.targetType).toBe('user');
    expect(row.targetId).toBe('usr_audit-actor');
    expect(row.clientIp).toBe('10.1.2.3');
    expect(row.userAgent).toBe('vitest/1.0');
    expect(row.detail).toEqual({ username: 'audit-user' });
  });

  it('persists anonymous entries with null actor', async () => {
    const write = createAuditWriter(db);
    await write({
      action: 'auth.login.failed',
      detail: { username: 'ghost' },
    });
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.login.failed'));
    const latest = rows[rows.length - 1]!;
    expect(latest.actorId).toBeNull();
    expect(latest.detail).toEqual({ username: 'ghost' });
  });
});
