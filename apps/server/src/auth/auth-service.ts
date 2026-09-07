import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS, type AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import { localCredential } from '../db/schema/index.js';
import { AuthError } from './errors.js';
import type { LdapChannel } from './ldap.js';
import { provisionExternalUser } from './provision.js';
import { normalizeUsername, type UserService } from './users.js';

/**
 * 登录编排（05 §3.1 第 1-5 步全序，D2/D9 吸收）：
 * 1. username 存在 local_credential（保留本地账号）→ 跳过 LDAP 走本地（逃生通道）
 * 2. LDAP enabled → bind（三重 × 多 DC，超时兜底）
 * 3. 目录禁用/凭据错 → auth.ldap_denied，不回退
 * 4. 网络类失败（unreachable）→ 回退本地（存在 local_credential 时）；否则 invalid_credentials
 * 5. 成功（目录）→ 自动建号（id = LDAP_USER_ID_ATTR 映射值，D3）或同步 displayName
 * 纯本地模式 = 跳过 LDAP 直走本地校验。
 */

export interface AuthContextInfo {
  requestId: string;
  clientIp: string;
  userAgent: string;
}

export interface LoginInput extends AuthContextInfo {
  username: string;
  password: string;
}

export interface AuthServiceDeps {
  db: Db;
  users: UserService;
  ldap: LdapChannel | null; // LDAP_ENABLED=false → null
  audit: AuditWriter;
}

export interface AuthSessionUser {
  id: string;
  displayName: string;
  email?: string | null;
}

export class AuthService {
  private readonly db: Db;
  private readonly users: UserService;
  private readonly ldap: LdapChannel | null;
  private readonly audit: AuditWriter;

  constructor(deps: AuthServiceDeps) {
    this.db = deps.db;
    this.users = deps.users;
    this.ldap = deps.ldap;
    this.audit = deps.audit;
  }

  private auditCtx(ctx: AuthContextInfo) {
    return {
      requestId: ctx.requestId,
      clientIp: ctx.clientIp,
      userAgent: ctx.userAgent,
    };
  }

  /** 注册（本地；准入 OPEN → ACTIVE；审计 auth.register 带网络字段） */
  async register(
    input: {
      username: string;
      password: string;
      displayName?: string;
      email?: string;
    } & AuthContextInfo,
  ): Promise<AuthSessionUser> {
    const user = await this.users.register(input);
    await this.audit({
      ...this.auditCtx(input),
      actorId: user.id,
      action: AUDIT_ACTIONS.register,
      targetType: 'user',
      targetId: user.id,
      detail: { username: normalizeUsername(input.username) },
    });
    return { id: user.id, displayName: user.displayName, email: user.email };
  }

  /** 登录：返回平台用户（调用方签发 Session） */
  async login(input: LoginInput): Promise<AuthSessionUser> {
    const username = normalizeUsername(input.username);
    const auditCtx = this.auditCtx(input);
    let ldapDenied = false;

    try {
      // —— 第 1 步：本地凭据存在（保留本地账号）→ 本地逃生通道 ——
      if (await this.userHasLocalCredential(username)) {
        const result = await this.users.localLogin(username, input.password);
        await this.audit({
          ...auditCtx,
          actorId: result.user.id,
          action: AUDIT_ACTIONS.loginSuccess,
          targetType: 'user',
          targetId: result.user.id,
        });
        return { id: result.user.id, displayName: result.user.displayName };
      }

      // —— 第 2 步：LDAP 通道（仅无本地凭据时）——
      if (this.ldap) {
        const ldapResult = await this.ldap.authenticate(username, input.password);
        if (ldapResult.status === 'ok') {
          const provisioned = await this.provisionOrSyncLdapUser(
            ldapResult.userId,
            ldapResult.displayName,
          );
          await this.audit({
            ...auditCtx,
            actorId: provisioned.id,
            action: AUDIT_ACTIONS.loginSuccess,
            targetType: 'user',
            targetId: provisioned.id,
            detail: { via: 'ldap' },
          });
          return provisioned;
        }
        if (ldapResult.status === 'denied') {
          // —— 第 3 步：目录判定（凭据错/禁用）→ 拒绝且不回退 ——
          ldapDenied = true;
          throw new AuthError('auth.ldap_denied');
        }
        // unreachable → 落第 4 步：回退本地（无本地凭据时 localLogin 会走 dummy verify 后报错）
      }

      // —— 纯本地模式 / LDAP unreachable 回退 ——
      const result = await this.users.localLogin(username, input.password);
      await this.audit({
        ...auditCtx,
        actorId: result.user.id,
        action: AUDIT_ACTIONS.loginSuccess,
        targetType: 'user',
        targetId: result.user.id,
      });
      return { id: result.user.id, displayName: result.user.displayName };
    } catch (err) {
      // 审计失败（ldap_denied 已显式审计，避免双记）
      if (err instanceof AuthError && !ldapDenied) {
        await this.audit({
          ...auditCtx,
          action: AUDIT_ACTIONS.loginFailed,
          targetType: 'user',
          detail: { username, code: err.code },
        }).catch(() => undefined);
      }
      throw err;
    }
  }

  private async userHasLocalCredential(username: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: localCredential.id })
      .from(localCredential)
      .where(eq(localCredential.username, username));
    return rows.length > 0;
  }

  /**
   * LDAP 建号（05 §3.1 第 5 步）：委托公共 provisionExternalUser（T26）——
   * binding(ldap, 工号) 复用 + 建号事务 + displayName 同步；userId = LDAP 映射值。
   */
  private async provisionOrSyncLdapUser(
    userId: string,
    displayName: string,
  ): Promise<AuthSessionUser> {
    const user = await provisionExternalUser(this.db, {
      provider: 'ldap',
      providerSubject: userId,
      userId,
      displayName,
    });
    return { id: user.id, displayName: user.displayName };
  }
}
