import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// db 集成测试：连 ai_asset_hub_test 库（惰性 getEnv——模块 import 时不会触发）
process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { localCredential, userAccount } from '../db/schema/index.js';
import { AuthError } from './errors.js';
import { UserService } from './users.js';

let db: Db;
let users: UserService;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  users = new UserService(db, { registrationEnabled: true });
});

afterAll(async () => {
  // 清理本测试创建的数据（先删凭据再删账号）
  const creds = await db
    .select({ userId: localCredential.userId })
    .from(localCredential)
    .where(like(localCredential.username, 'it-%'));
  for (const c of creds) {
    await db.delete(localCredential).where(eq(localCredential.userId, c.userId));
    await db.delete(userAccount).where(eq(userAccount.id, c.userId));
  }
  await db.$client.end();
});

async function expectAuthError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    expect.unreachable(`expected AuthError ${code}`);
  } catch (err) {
    expect(err).toBeInstanceOf(AuthError);
    // bun:test 类型比 vitest 严格（union vs string）——字符串化后比较
    expect(`${(err as AuthError).code}`).toBe(code);
  }
}

describe('UserService.register', () => {
  it('creates a user with usr_ id and ACTIVE status', async () => {
    const user = await users.register({
      username: 'it-alice',
      password: 'password-123',
      displayName: 'Alice',
      email: 'alice@example.com',
    });
    expect(user.id.startsWith('usr_')).toBe(true);
    expect(user.status).toBe('ACTIVE');
    expect(user.displayName).toBe('Alice');
  });

  it('normalizes username to lowercase on register', async () => {
    await users.register({ username: 'it-Bob', password: 'password-123' });
    const row = await db
      .select({ username: localCredential.username })
      .from(localCredential)
      .where(eq(localCredential.username, 'it-bob'));
    expect(row).toHaveLength(1);
  });

  it('rejects invalid username format', async () => {
    await expectAuthError(
      users.register({ username: 'bad name!', password: 'password-123' }),
      'auth.username_invalid',
    );
  });

  it('rejects duplicate username case-insensitively', async () => {
    await users.register({ username: 'it-dup', password: 'password-123' });
    await expectAuthError(
      users.register({ username: 'IT-DUP', password: 'password-123' }),
      'auth.username_taken',
    );
  });

  it('rejects weak password', async () => {
    await expectAuthError(
      users.register({ username: 'it-weak', password: 'short' }),
      'auth.password_too_weak',
    );
  });

  it('rejects registration when disabled', async () => {
    const closed = new UserService(db, { registrationEnabled: false });
    await expectAuthError(
      closed.register({ username: 'it-closed', password: 'password-123' }),
      'auth.registration_disabled',
    );
  });
});

describe('UserService.localLogin', () => {
  it('logs in with correct credentials (case-insensitive username)', async () => {
    const { user } = await users.localLogin('IT-ALICE', 'password-123');
    expect(user.displayName).toBe('Alice');
    expect(user.status).toBe('ACTIVE');
  });

  it('returns invalid_credentials for wrong password and increments attempts', async () => {
    await users.register({ username: 'it-counter', password: 'password-123' });
    await expectAuthError(
      users.localLogin('it-counter', 'wrong-password'),
      'auth.invalid_credentials',
    );
    const row = await db
      .select({ failedAttempts: localCredential.failedAttempts })
      .from(localCredential)
      .where(eq(localCredential.username, 'it-counter'));
    expect(row[0]?.failedAttempts).toBe(1);
  });

  it('returns invalid_credentials for unknown username (dummy verify path)', async () => {
    await expectAuthError(users.localLogin('it-ghost', 'whatever-123'), 'auth.invalid_credentials');
  });

  it('locks the credential after MAX_FAILED_ATTEMPTS failures', async () => {
    await users.register({ username: 'it-lock', password: 'password-123' });
    for (let i = 0; i < 5; i += 1) {
      await expectAuthError(
        users.localLogin('it-lock', 'wrong-password'),
        'auth.invalid_credentials',
      );
    }
    // 第 5 次失败后锁定：即使密码正确也拒绝
    await expectAuthError(users.localLogin('it-lock', 'password-123'), 'auth.user_locked');
  });

  it('unlocks after lock window passes and resets failed attempts', async () => {
    // 直插过去时间的 locked_until 模拟窗口过期
    await users.register({ username: 'it-unlock', password: 'password-123' });
    const row = await db
      .select({ userId: localCredential.userId })
      .from(localCredential)
      .where(eq(localCredential.username, 'it-unlock'));
    await db
      .update(localCredential)
      .set({ failedAttempts: 5, lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(localCredential.userId, row[0]!.userId));
    const { user } = await users.localLogin('it-unlock', 'password-123');
    expect(user.displayName).toBe('it-unlock');
    const after = await db
      .select({
        failedAttempts: localCredential.failedAttempts,
        lockedUntil: localCredential.lockedUntil,
      })
      .from(localCredential)
      .where(eq(localCredential.userId, row[0]!.userId));
    expect(after[0]?.failedAttempts).toBe(0);
    expect(after[0]?.lockedUntil).toBeNull();
  });

  it('rejects DISABLED user', async () => {
    const user = await users.register({ username: 'it-disabled', password: 'password-123' });
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, user.id));
    await expectAuthError(users.localLogin('it-disabled', 'password-123'), 'auth.user_disabled');
  });

  it('rejects PENDING user (no session boundary)', async () => {
    const user = await users.register({ username: 'it-pending', password: 'password-123' });
    await db.update(userAccount).set({ status: 'PENDING' }).where(eq(userAccount.id, user.id));
    await expectAuthError(users.localLogin('it-pending', 'password-123'), 'auth.user_pending');
  });
});
