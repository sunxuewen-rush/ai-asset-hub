import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { levelOf, ROLE_LEVEL } from '../auth/roles.js';
import { createClient, type Db } from './client.js';

/**
 * 迁移规则断言常驻化（M4b-pre plan T6 · design §6 新增测试面 ⑥「迁移断言」）。
 *
 * 迁移是**一次性前向**动作，跑过就回不来 ⇒ 把规则本身钉死成常驻用例（两条腿）：
 * - **表达式级**：以 `VALUES` 常量复跑迁移 SQL 里的表达（角色映射 / 邮箱归一 / key re-encode /
 *   permissions 聚合 / enabled 映射 / 时间列归一），与 TS 侧口径逐条对齐；
 * - **文件级**：迁移文件内容与 journal 的结构不变量（防手改回归——T3/T4 踩过的定序与列型坑）。
 *
 * 依据（实测）：`drizzle/0009_auth_user_domain_data_move.sql` · `0010_black_lady_mastermind.sql` ·
 * `0011_quick_mastermind.sql` · `meta/_journal.json`。
 */

let db: Db;

const DRIZZLE_DIR = './drizzle';

function migrationSql(tag: string): string {
  return readFileSync(`${DRIZZLE_DIR}/${tag}.sql`, 'utf8');
}

interface JournalEntry {
  idx: number;
  tag: string;
  breakpoints: boolean;
}
function journal(): JournalEntry[] {
  const raw = JSON.parse(readFileSync(`${DRIZZLE_DIR}/meta/_journal.json`, 'utf8')) as {
    entries: JournalEntry[];
  };
  return raw.entries;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: DRIZZLE_DIR });
});

afterAll(async () => {
  await db.$client.end();
});

describe('迁移表达式级不变量（0009/0011 的规则 ↔ TS 口径）', () => {
  it('角色映射（0009）：数值档位 → 档名文本，与 roles.ts 的档位口径一致', async () => {
    // 与 0009 的 CASE 逐字同构：>=100 superadmin · >=10 admin · 其余 user（0/1/10/100 为 05 §6.1 四档）
    const rows = await db.execute<{ role: number; name: string }>(sql`
      SELECT v.role, CASE
        WHEN v.role >= 100 THEN 'superadmin'
        WHEN v.role >= 10 THEN 'admin'
        ELSE 'user'
      END AS name
      FROM (VALUES (0), (1), (10), (100)) AS v(role)
    `);
    for (const row of rows.rows) {
      const expected =
        row.role >= ROLE_LEVEL.superadmin
          ? 'superadmin'
          : row.role >= ROLE_LEVEL.admin
            ? 'admin'
            : 'user';
      expect(row.name).toBe(expected);
      // 反向：档名 → 档位（roles.ts）与该数值档位同档
      expect(levelOf(row.name)).toBe(
        row.role >= ROLE_LEVEL.superadmin
          ? ROLE_LEVEL.superadmin
          : row.role >= ROLE_LEVEL.admin
            ? ROLE_LEVEL.admin
            : ROLE_LEVEL.user,
      );
    }
  });

  it("邮箱归一与合成（0009）：NULL → `id || '@local'`；大小写归一且幂等", async () => {
    const rows = await db.execute<{ id: string; raw: string | null; final: string }>(sql`
      SELECT v.id, v.raw, COALESCE(lower(v.raw), v.id || '@local') AS final
      FROM (VALUES ('usr_1', NULL), ('usr_2', 'User@Example.COM')) AS v(id, raw)
    `);
    const byId = new Map(rows.rows.map((r) => [r.id, r.final]));
    expect(byId.get('usr_1')).toBe('usr_1@local'); // 缺失邮箱的确定性合成（design §5.2）
    expect(byId.get('usr_2')).toBe('user@example.com'); // 全部小写（对齐官方写入路径 P2）
    const again = await db.execute<{ v: string }>(sql`SELECT lower(${byId.get('usr_2')}) AS v`);
    expect(again.rows[0]?.v).toBe('user@example.com'); // 幂等
  });

  it('key re-encode（0011）：SQL 公式 === base64url(sha256(明文))，43 位且字符集合法', async () => {
    const plain = 'aih_migration-rule-check-0000000000000000';
    const hex = createHash('sha256').update(plain).digest('hex');
    const expected = createHash('sha256').update(plain).digest('base64url');
    const rows = await db.execute<{ key: string }>(sql`
      SELECT translate(rtrim(encode(decode(${hex}, 'hex'), 'base64'), '='), '+/', '-_') AS key
    `);
    const produced = rows.rows[0]!.key;
    expect(produced).toBe(expected);
    expect(produced).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('permissions 聚合（0011）：单层 `jsonb_object_agg` 会**静默丢弃**同 resource 的其它 action ⇒ 两层聚合为必要', async () => {
    // 单层：resource 重复 ⇒ 静默只留最后一项（实测 `{"asset":"manage"}`，publish 丢失且**不报错**）
    const single = await db.execute<{ perms: string }>(sql`
      SELECT jsonb_object_agg(res, act)::text AS perms
      FROM (
        SELECT split_part(sp, ':', 1) AS res, split_part(sp, ':', 2) AS act
        FROM unnest(string_to_array('asset:publish,asset:manage', ',')) AS sp
      ) x
    `);
    expect(JSON.parse(single.rows[0]!.perms)).toEqual({ asset: 'manage' }); // 丢 action（静默）

    // 两层（迁移实际形态）：per-resource 聚 actions，再按行聚对象
    const rows = await db.execute<{ perms: string }>(sql`
      SELECT (
        SELECT jsonb_object_agg(res, acts)::text
        FROM (
          SELECT split_part(sp, ':', 1) AS res, jsonb_agg(split_part(sp, ':', 2)) AS acts
          FROM unnest(string_to_array('asset:publish,asset:manage,audit:read', ',')) AS sp
          GROUP BY split_part(sp, ':', 1)
        ) x
      ) AS perms
    `);
    expect(JSON.parse(rows.rows[0]!.perms)).toEqual({
      asset: ['publish', 'manage'],
      audit: ['read'],
    });
  });

  it('enabled 映射（0011）：`revoked_at IS NULL` → true；非空 → false（吊销语义 = 官方 enabled=false）', async () => {
    const rows = await db.execute<{ live: boolean; revoked: boolean }>(sql`
      SELECT (NULL::timestamptz IS NULL) AS live,
             (now() IS NULL) AS revoked
    `);
    expect(rows.rows[0]!.live).toBe(true);
    expect(rows.rows[0]!.revoked).toBe(false);
  });

  it("时间列归一（0011）：`timestamptz AT TIME ZONE 'UTC'` = naive UTC 墙钟（官方表为 timestamp）", async () => {
    const rows = await db.execute<{ naive: string }>(sql`
      SELECT ('2026-09-15T12:00:00Z'::timestamptz AT TIME ZONE 'UTC')::text AS naive
    `);
    expect(rows.rows[0]!.naive).toBe('2026-09-15 12:00:00');
  });

  it('`apikey.permissions` 列型 = text（钉定 P16：官方以 JSON 文本写入，非 jsonb）', async () => {
    const rows = await db.execute<{ data_type: string }>(sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'apikey' AND column_name = 'permissions'
    `);
    expect(rows.rows[0]?.data_type).toBe('text');
  });
});

describe('迁移文件级不变量（防手改回归）', () => {
  it('journal 条目 0..11 连续，且每个 tag 都存在对应 SQL 文件', () => {
    const entries = journal();
    expect(entries.map((e) => e.idx)).toEqual([...Array(entries.length).keys()]);
    const files = new Set(readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith('.sql')));
    for (const entry of entries) {
      expect(files.has(`${entry.tag}.sql`), `missing ${entry.tag}.sql`).toBe(true);
    }
  });

  it('0011 内容不变量：含 re-encode 公式 · 两层聚合 · 删除 api_token（且先搬后删）', () => {
    const sqlText = migrationSql('0011_quick_mastermind');
    expect(sqlText).toContain(
      "translate(rtrim(encode(decode(t.token_hash, 'hex'), 'base64'), '='), '+/', '-_')",
    );
    expect(sqlText).toContain('jsonb_object_agg(res, acts)');
    expect(sqlText).toContain('INSERT INTO "apikey"');
    const insertAt = sqlText.indexOf('INSERT INTO "apikey"');
    // 头注释里也提到该语句 ⇒ 取**最后一次**出现（真正的 DDL 在文件末尾）
    const dropAt = sqlText.lastIndexOf('DROP TABLE "api_token"');
    expect(insertAt).toBeGreaterThan(-1);
    expect(dropAt).toBeGreaterThan(insertAt); // 先搬后删（单一路径）
  });

  it('0010 定序不变量：DROP CONSTRAINT → ADD CONSTRAINT → DROP TABLE（drizzle 生成的死路序已被手工纠正）', () => {
    const sqlText = migrationSql('0010_black_lady_mastermind');
    const dropConstraintAt = sqlText.indexOf('DROP CONSTRAINT');
    const addConstraintAt = sqlText.indexOf('ADD CONSTRAINT');
    const dropTableAt = sqlText.indexOf('DROP TABLE "user_account"');
    expect(dropConstraintAt).toBeGreaterThan(-1);
    expect(addConstraintAt).toBeGreaterThan(dropConstraintAt);
    expect(dropTableAt).toBeGreaterThan(addConstraintAt);
  });

  it('迁移后表数 = 14（design §5.1「现状 12 → 迁后 14」）', async () => {
    const rows = await db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count FROM information_schema.tables WHERE table_schema = 'public'
    `);
    expect(Number(rows.rows[0]!.count)).toBe(14);
  });
});
