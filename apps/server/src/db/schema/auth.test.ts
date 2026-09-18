import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { getAuth } from '../../auth/better-auth.js';
import { createClient, type Db } from '../client.js';

let db: Db;

/**
 * 认证域表结构测试（M4b-pre plan T2 断言③④⑤）。
 *
 * 三件事：
 * 1. 官方 6 表（`user`/`session`/`account`/`verification`/`device_code`/`apikey`）结构与关键约束到位；
 * 2. **旧表已收口**：`user_account`/`identity_binding`/`local_credential`（T3 的 `0010`）与
 *    `api_token`（T4 的 `0011`）**均已删除**；指向官方 `user` 的外键 12 条（含 11 条重指向）；
 * 3. `getAuth().api.getSession`（空 cookie）→ `null`——官方在首次 API 调用即做 schema check，
 *    该断言通过即证明 6 表结构被官方认可（T1 实测的 `SCHEMA_MISMATCH` 就此转正）。
 */

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(async () => {
  await db.$client.end();
});

async function tableNames(): Promise<string[]> {
  const res = await db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public'`,
  );
  return res.rows.map((r) => r.table_name);
}

async function columnRow(
  table: string,
  column: string,
): Promise<{ is_nullable: string; data_type: string; column_default: string | null }> {
  const res = await db.execute<{
    is_nullable: string;
    data_type: string;
    column_default: string | null;
  }>(
    sql`select is_nullable, data_type, column_default from information_schema.columns
        where table_schema = 'public' and table_name = ${table} and column_name = ${column}`,
  );
  const row = res.rows[0];
  if (!row) throw new Error(`列不存在: ${table}.${column}`);
  return row;
}

async function constraintCount(name: string): Promise<number> {
  const res = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from pg_constraint where conname = ${name}`,
  );
  return Number(res.rows[0]?.count ?? '0');
}

describe('认证域表结构（官方 6 表）', () => {
  it('6 张官方表全部存在', async () => {
    const names = await tableNames();
    for (const t of ['user', 'session', 'account', 'verification', 'device_code', 'apikey']) {
      expect(names).toContain(t);
    }
  });

  it('user 表关键列满足官方语义（email 非空唯一 · role 文本 · status 默认 ACTIVE）', async () => {
    const email = await columnRow('user', 'email');
    expect(email.is_nullable).toBe('NO');
    expect(await constraintCount('user_email_unique')).toBe(1);
    expect(await constraintCount('user_username_unique')).toBe(1);

    const role = await columnRow('user', 'role');
    expect(role.data_type).toBe('text');

    const status = await columnRow('user', 'status');
    expect(status.column_default).toContain('ACTIVE');
  });

  it('session/device_code/apikey 的关键约束与索引到位', async () => {
    expect(await constraintCount('session_token_unique')).toBe(1);
    const res = await db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where schemaname = 'public'
          and indexname in ('deviceCode_deviceCode_uidx', 'deviceCode_userCode_uidx', 'apikey_key_idx')`,
    );
    expect(res.rows.map((r) => r.indexname).sort()).toEqual([
      'apikey_key_idx',
      'deviceCode_deviceCode_uidx',
      'deviceCode_userCode_uidx',
    ]);
  });
});

describe('用户域收口（design §5.1 时序原则：搬迁与切流同批）', () => {
  it('旧用户域 3 表已删；令牌表 api_token 已删（T4 的 0011 收口）', async () => {
    const names = await tableNames();
    for (const t of ['user_account', 'identity_binding', 'local_credential', 'api_token']) {
      expect(names).not.toContain(t);
    }
  });

  // M4b-4 T15：`asset_star.user_id` 新增一条 FK ⇒ 12 → 13（语义不变量：全部指向官方 user、旧表引用 0）
  it('13 条外键全部指向官方 user 表（T4 11 重指向 + account/session 各 1 + M4b-4 `asset_star` 1）', async () => {
    const toUser = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from pg_constraint
          where contype = 'f' and confrelid = 'public."user"'::regclass`,
    );
    expect(Number(toUser.rows[0]?.count ?? '0')).toBe(13);
    const stale = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from pg_constraint
          where contype = 'f' and confrelid::regclass::text like '%user_account%'`,
    );
    expect(Number(stale.rows[0]?.count ?? '0')).toBe(0);
  });
});

describe('官方实例的 schema check（P4 仓内复现）', () => {
  it('getSession（空 cookie）返回 null，不抛 SCHEMA_MISMATCH', async () => {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: new Headers() });
    expect(session).toBeNull();
  });
});
