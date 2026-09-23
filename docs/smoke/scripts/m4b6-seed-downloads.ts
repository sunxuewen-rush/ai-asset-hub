/**
 * M4b-6 造数：下载事件跨天分布（`docs/smoke/scripts/m4b6-seed-downloads.ts`）。
 *
 * 目的 = 让 `/admin` 的**下载曲线**有真实形态（design §9.5：造数覆盖下载曲线分支）。
 *
 * 设计要点：
 * - **专用种子资产**（slug = `m4b6-seed-downloads`）：种子事件全挂它 ⇒ `--clean` 精确回收，不误伤真库。
 * - **一致性**：同时把该资产 `download_count` 设为种子事件数（事件 ↔ 计数同源，趋势与 KPI 不打架）。
 * - **创建/发布时间前移 40 天** ⇒ 顺带覆盖「沉睡资产」时间分支所需数据。
 * - **只依赖 `createClient`**（不 import `drizzle-orm`）：`docs/smoke/scripts/` 不在 workspace 依赖解析路径上，
 *   裸包名会解析失败 ⇒ 本脚本一律走 `db.$client` 原生 SQL（既有 seeds 同思路）。
 * - ⚠️ **写库**：运行需用户授权；`--clean` 只删种子资产及其事件/版本。
 *
 * 用法（仓库根）：
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-seed-downloads.ts
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-seed-downloads.ts --clean
 */
import { createClient } from '../../../apps/server/src/db/client.js';

const SEED_SLUG = 'm4b6-seed-downloads';
const DAYS = 14;
const PER_DAY = [1, 2, 2, 3, 1, 4, 2, 3, 5, 2, 1, 6, 3, 2];

const clean = process.argv.includes('--clean');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log('✗ 未取到 DATABASE_URL（用 --env-file=apps/server/.env 运行）');
  process.exit(1);
}
const db = createClient(connectionString);
const pg = db.$client;

async function cleanup(): Promise<boolean> {
  const { rows } = await pg.query<{ id: string }>('SELECT id FROM asset WHERE slug = $1', [
    SEED_SLUG,
  ]);
  const seedId = rows[0]?.id;
  if (!seedId) {
    console.log('（无种子资产，跳过清理）');
    return false;
  }
  await pg.query('DELETE FROM download_event WHERE asset_id = $1', [seedId]);
  await pg.query('DELETE FROM asset_version WHERE asset_id = $1', [seedId]);
  await pg.query('DELETE FROM asset WHERE id = $1', [seedId]);
  console.log('✓ 已回收种子资产 + 其下载事件 + 其版本');
  return true;
}

if (clean) {
  await cleanup();
  await pg.end();
  process.exit(0);
}

await cleanup(); // 幂等：先清后插

const { rows: owners } = await pg.query<{ id: string }>(
  'SELECT id FROM "user" WHERE status = \'ACTIVE\' ORDER BY id LIMIT 1',
);
const ownerId = owners[0]?.id;
if (!ownerId) {
  console.log('✗ 真库无 ACTIVE 账号，无法挂种子资产');
  process.exit(1);
}

const { rows: seedRows } = await pg.query<{ id: string }>(
  `INSERT INTO asset (slug, type, owner_id, status, created_by, updated_by, download_count, created_at, updated_at)
   VALUES ($1, 'skill', $2, 'ACTIVE', $2, $2, 0, now() - interval '40 days', now())
   RETURNING id`,
  [SEED_SLUG, ownerId],
);
const assetId = seedRows[0]!.id;

const { rows: verRows } = await pg.query<{ id: string }>(
  `INSERT INTO asset_version (asset_id, version, status, published_at, parsed_metadata_json)
   VALUES ($1, '1.0.0', 'PUBLISHED', now() - interval '40 days', $2::jsonb)
   RETURNING id`,
  [assetId, JSON.stringify({ name: 'M4b-6 造数资产', description: '造数用（可 --clean 回收）' })],
);
const versionId = verRows[0]!.id;
await pg.query('UPDATE asset SET latest_version_id = $1 WHERE id = $2', [versionId, assetId]);

let inserted = 0;
for (let d = DAYS - 1; d >= 0; d -= 1) {
  const count = PER_DAY[DAYS - 1 - d] ?? 1;
  for (let i = 0; i < count; i += 1) {
    await pg.query(
      `INSERT INTO download_event (asset_id, version_id, created_at) VALUES ($1, $2, now() - ($3 || ' days')::interval - ($4 || ' hours')::interval)`,
      [assetId, versionId, String(d), String(i * 3)],
    );
    inserted += 1;
  }
}

await pg.query('UPDATE asset SET download_count = $1 WHERE id = $2', [inserted, assetId]);

const { rows: cnt } = await pg.query<{ n: string }>(
  'SELECT count(*)::int AS n FROM download_event WHERE asset_id = $1',
  [assetId],
);
const { rows: act } = await pg.query<{ n: string }>(
  "SELECT count(*)::int AS n FROM asset WHERE status = 'ACTIVE'",
);

console.log(
  `✓ 种子资产 \`${SEED_SLUG}\`（id=${assetId}）· 事件 ${inserted} 条 · 事件表核 ${cnt[0]?.n} 条`,
);
console.log(
  `  分布：最近 ${DAYS} 天（每日 ${PER_DAY.join('/')}）· download_count = ${inserted}（与事件一致）`,
);
console.log(`  真库 ACTIVE 资产合计 = ${act[0]?.n}（含本种子资产）`);
console.log(
  '  回收：bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-seed-downloads.ts --clean',
);

await pg.end();
