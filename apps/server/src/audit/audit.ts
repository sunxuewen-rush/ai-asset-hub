import type { Db } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';

/** 审计动作常量（认证域；业务域随实现扩展） */
export const AUDIT_ACTIONS = {
  register: 'auth.register',
  loginSuccess: 'auth.login.success',
  loginFailed: 'auth.login.failed',
  logout: 'auth.logout',
} as const;

export interface AuditEntry {
  /** 可空 = 匿名（登录失败等无身份动作） */
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  clientIp?: string;
  userAgent?: string;
  detail?: Record<string, unknown>;
}

/** audit_log 写入器（08 §6 v1.1：actor/action/target/网络字段/detail） */
export function createAuditWriter(db: Db) {
  return async function writeAudit(entry: AuditEntry): Promise<void> {
    await db.insert(auditLog).values({
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      requestId: entry.requestId ?? null,
      clientIp: entry.clientIp ?? null,
      userAgent: entry.userAgent ?? null,
      detail: entry.detail ?? null,
    });
  };
}

export type AuditWriter = ReturnType<typeof createAuditWriter>;
