import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { localCredential, userAccount } from '../db/schema/index.js';
import { AuthError } from './errors.js';
import { hashPassword, verifyPassword } from './password.js';

/**
 * 本地账号 service（05 §4/§4.1，D2/D3 吸收）：
 * register 建 user_account(id=usr_<uuid>) + local_credential(username 独立登录名)；
 * localLogin 按 username 查凭据，失败计数行级锁定，成功重置。
 */

/** 本地用户名归一与格式（P7）：trim + lowercase；首尾字母数字，中间 ._- */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
export const USERNAME_MAX = 64;
export const PASSWORD_MIN_LENGTH = 8;

/** 行级失败锁定阈值（05 §3.1 防爆破） */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_WINDOW_MS = 15 * 60 * 1000;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export interface PublicUser {
  id: string;
  displayName: string;
  email: string | null;
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
}

export interface RegisterParams {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
}

export interface LocalLoginResult {
  user: PublicUser;
}

export class UserService {
  constructor(
    private readonly db: Db,
    private readonly options: { registrationEnabled: boolean },
  ) {}

  /** 注册（本地模式；准入 OPEN → 直接 ACTIVE） */
  async register(params: RegisterParams): Promise<PublicUser> {
    const username = normalizeUsername(params.username);
    if (username.length > USERNAME_MAX || !USERNAME_PATTERN.test(username)) {
      throw new AuthError('auth.username_invalid');
    }
    if (!this.options.registrationEnabled) {
      throw new AuthError('auth.registration_disabled');
    }
    if (params.password.length < PASSWORD_MIN_LENGTH) {
      throw new AuthError('auth.password_too_weak');
    }

    const existing = await this.db
      .select({ id: localCredential.id })
      .from(localCredential)
      .where(eq(localCredential.username, username));
    if (existing.length > 0) {
      throw new AuthError('auth.username_taken');
    }

    const id = `usr_${randomUUID()}`;
    const passwordHash = await hashPassword(params.password);
    const displayName = params.displayName?.trim() || username;
    await this.db.transaction(async (tx) => {
      await tx.insert(userAccount).values({
        id,
        displayName,
        email: params.email?.trim() || null,
        status: 'ACTIVE',
      });
      await tx.insert(localCredential).values({
        userId: id,
        username,
        passwordHash,
        failedAttempts: 0,
      });
    });

    return { id, displayName, email: params.email?.trim() || null, status: 'ACTIVE' };
  }

  /**
   * 本地密码登录（05 §4.1 账号状态机）：
   * - username 无凭据 → dummy verify 抹时序（D9）后报 invalid_credentials
   * - 锁定中（locked_until 未过）→ user_locked
   * - DISABLED → user_disabled；PENDING → user_pending（无 Session）
   * - 密码错 → failed_attempts+1，超阈值置 locked_until；成功 → 重置计数
   */
  async localLogin(usernameInput: string, password: string): Promise<LocalLoginResult> {
    const username = normalizeUsername(usernameInput);
    const now = Date.now();

    const row = await this.db
      .select({
        credentialId: localCredential.id,
        passwordHash: localCredential.passwordHash,
        failedAttempts: localCredential.failedAttempts,
        lockedUntil: localCredential.lockedUntil,
        userId: userAccount.id,
        displayName: userAccount.displayName,
        email: userAccount.email,
        status: userAccount.status,
      })
      .from(localCredential)
      .innerJoin(userAccount, eq(localCredential.userId, userAccount.id))
      .where(eq(localCredential.username, username));

    if (row.length === 0) {
      // D9：无凭据也执行一次 verify，抹平「用户不存在 vs 密码错」耗时差
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      throw new AuthError('auth.invalid_credentials');
    }

    const credential = row[0]!;
    if (credential.lockedUntil && credential.lockedUntil.getTime() > now) {
      throw new AuthError('auth.user_locked');
    }
    if (credential.status === 'DISABLED') {
      throw new AuthError('auth.user_disabled');
    }
    if (credential.status === 'PENDING') {
      throw new AuthError('auth.user_pending');
    }

    const ok = await verifyPassword(password, credential.passwordHash);
    if (!ok) {
      const attempts = credential.failedAttempts + 1;
      const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(now + LOCK_WINDOW_MS) : null;
      await this.db
        .update(localCredential)
        .set({ failedAttempts: attempts, lockedUntil })
        .where(eq(localCredential.id, credential.credentialId));
      throw new AuthError('auth.invalid_credentials');
    }

    // 成功：重置失败计数（P7 补充语义）
    if (credential.failedAttempts !== 0) {
      await this.db
        .update(localCredential)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(localCredential.id, credential.credentialId));
    }

    return {
      user: {
        id: credential.userId,
        displayName: credential.displayName,
        email: credential.email,
        status: credential.status,
      },
    };
  }
}

/** D9 防时序枚举：预置一个合法 scrypt hash（内容任意，仅用于耗时抹平） */
const DUMMY_PASSWORD_HASH =
  '$scrypt$131072$8$1$c2FsdC1kdW1teS1zYWx0LXNhbHQtc2FsdA==$aXMtbm90LWEtcmVhbC1oYXNoLWJ1dC12ZXJpZnktcnVucw==';
