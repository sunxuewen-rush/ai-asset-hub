import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';

/**
 * 审计查询服务（T19，08 §6 audit_log 浏览面；05 §6.4 audit:read）。
 * 过滤组合（S4 对齐 skillhub AuditLogController）：action / targetType / targetId /
 * actorId / requestId / clientIp + createdAt 时间窗；createdAt desc + id desc 稳定分页。
 */

export interface AuditQuery {
  limit: number;
  offset: number;
  action?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  requestId?: string;
  clientIp?: string;
  from?: Date;
  to?: Date;
}

export type AuditRow = typeof auditLog.$inferSelect;

export async function queryAudit(
  db: Db,
  q: AuditQuery,
): Promise<{ items: AuditRow[]; total: number }> {
  const conds = [];
  if (q.action) conds.push(eq(auditLog.action, q.action));
  if (q.targetType) conds.push(eq(auditLog.targetType, q.targetType));
  if (q.targetId) conds.push(eq(auditLog.targetId, q.targetId));
  if (q.actorId) conds.push(eq(auditLog.actorId, q.actorId));
  if (q.requestId) conds.push(eq(auditLog.requestId, q.requestId));
  if (q.clientIp) conds.push(eq(auditLog.clientIp, q.clientIp));
  if (q.from) conds.push(gte(auditLog.createdAt, q.from));
  if (q.to) conds.push(lte(auditLog.createdAt, q.to));
  const where = conds.length > 0 ? and(...conds) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(auditLog).where(where);
  const total = totalRow?.total ?? 0;
  const items = await db
    .select()
    .from(auditLog)
    .where(where)
    // 同 createdAt 以 id 倒序稳定分页（createdAt 微秒级仍可能同刻）
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(q.limit)
    .offset(q.offset);
  return { items, total };
}
