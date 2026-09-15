import type { Db } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';

/** 审计动作常量（认证域；业务域随实现扩展） */
export const AUDIT_ACTIONS = {
  register: 'auth.register',
  loginSuccess: 'auth.login.success',
  loginFailed: 'auth.login.failed',
  logout: 'auth.logout',
  /** 目录首登建号（M4b-pre T3；与 `loginSuccess` 分开记——建号是独立事实） */
  provisionLdap: 'ldap.provisioned',
  /** OIDC 首登建号（原 `http/oidc-routes.ts` 内联字面量，随 M4b-pre T3 收敛到常量表） */
  provisionOidc: 'oidc.provisioned',
  /** 设备流：用户确认设备授权（M4b-pre T5；官方端点无钩子 ⇒ 由 app 层包装层记） */
  deviceApprove: 'device.approve',
  /** 设备流：用户拒绝设备授权（官方 `/device/deny` 端点） */
  deviceDeny: 'device.deny',
  /** 设备流：CLI 凭 device_code 换得会话令牌（审计关联归属用户；明文不落 detail） */
  deviceTokenIssued: 'device.token_issued',
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

/**
 * 请求头 → 审计网络字段（`clientIp` / `userAgent`）。
 * 装配点：官方端点 hooks（`databaseHooks` / `hooks.after`）与自绘目录插件共用一套解析口径。
 * 无 headers（服务端直呼）→ 两字段均省略（`AuditEntry` 允许 undefined）。
 */
export function auditMetaFromHeaders(headers: Headers | undefined | null): {
  clientIp?: string;
  userAgent?: string;
} {
  if (!headers) return {};
  const forwarded = headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || undefined;
  return { clientIp, userAgent: headers.get('user-agent') ?? undefined };
}
