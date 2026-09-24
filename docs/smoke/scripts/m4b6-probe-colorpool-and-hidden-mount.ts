/**
 * M4b-6 收口探针 —— 证据 §8 item **⑦⑧** 的形式缺口实证（一次性 · 可重复 · **自带自清**）。
 *
 * ⑦ **>13 个一级标签的 13 色池换圈**（`apps/web/src/pages/AdminBoard.tsx::labelColor` 的 `index % 13`）
 *    —— 真库原只有 7 个一级标签 ⇒ 取色只走到 `--chart-1…5` + `--ava-1/2`，**换圈分支从未被执行**。
 * ⑧ **F212「仅挂已隐藏/已归档」分支**（`AdminLabels.tsx` 删除确认四分支之第三支 `labels.delete.inUseHidden`）
 *    —— 真库原无「只挂非 `ACTIVE` 资产」的标签（实测 SQL：0 条）⇒ 该支从未在真页走过。
 *
 * **造数（写库 · 需用户授权）**：14 个**零挂载**一级标签 + 1 个「**仅挂 `HIDDEN` 资产**」的一级标签
 * （连带 1 个 `HIDDEN` 资产 + 1 条 `asset_label` 挂载）。显示名走 `pickDisplayName` 的 slug 回退
 * （不造 `label_translation` —— 与本缺口无关，少造 30 行）。
 * **自清**：`--clean` 逆序回收（挂载 → 资产 → 标签），**不触碰真库既有数据**（一切按 `m4b6-probe-%` 前缀圈定）；
 * 回收后自检「我方条目归零」，不彻底即退出码非 0。
 *
 * 用法（仓库根）：
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-probe-colorpool-and-hidden-mount.ts --verify
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-probe-colorpool-and-hidden-mount.ts --seed
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-probe-colorpool-and-hidden-mount.ts --clean
 */
import { createClient } from '../../../apps/server/src/db/client.js';

const COLOR_PREFIX = 'm4b6-probe-color-';
const COLOR_COUNT = 14;
const HIDDEN_LABEL = 'm4b6-probe-hidden-mount';
const HIDDEN_ASSET = 'm4b6-probe-hidden-asset';
const PROBE_LIKE = 'm4b6-probe-%';

const mode = process.argv.includes('--seed')
  ? 'seed'
  : process.argv.includes('--clean')
    ? 'clean'
    : 'verify';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log('✗ 未取到 DATABASE_URL（用 --env-file=apps/server/.env 运行）');
  process.exit(1);
}
const pg = createClient(connectionString).$client;

/** 单值计数查询（`count(*)::text` ⇒ JS number） */
async function one(sql: string, params: unknown[] = []): Promise<number> {
  const r = await pg.query<{ n: string }>(sql, params);
  return Number(r.rows[0]?.n ?? 0);
}

async function counts() {
  const roots = await one(
    'SELECT count(*)::text AS n FROM label_definition WHERE parent_id IS NULL',
  );
  const probeLabels = await one(
    'SELECT count(*)::text AS n FROM label_definition WHERE slug LIKE $1',
    [PROBE_LIKE],
  );
  const probeAssets = await one('SELECT count(*)::text AS n FROM asset WHERE slug LIKE $1', [
    PROBE_LIKE,
  ]);
  const links = await one(
    `SELECT count(*)::text AS n FROM asset_label al
      JOIN asset a ON a.id = al.asset_id
      JOIN label_definition l ON l.id = al.label_id
     WHERE a.slug LIKE $1 OR l.slug LIKE $1`,
    [PROBE_LIKE],
  );
  const assetsAll = await one('SELECT count(*)::text AS n FROM asset');
  return { roots, probeLabels, probeAssets, links, assetsAll };
}

async function listProbe(): Promise<number> {
  const r = await pg.query<{ slug: string; kind: string; extra: string }>(
    `SELECT l.slug AS slug, 'label' AS kind,
            coalesce((SELECT count(*)::text FROM asset_label al WHERE al.label_id = l.id), '0') AS extra
       FROM label_definition l WHERE l.slug LIKE $1
      UNION ALL
     SELECT a.slug AS slug, 'asset:' || a.status AS kind, '—' AS extra
       FROM asset a WHERE a.slug LIKE $1
      ORDER BY kind, slug`,
    [PROBE_LIKE],
  );
  for (const row of r.rows) {
    console.log(`   · ${row.kind.padEnd(14)} ${row.slug}  挂载=${row.extra}`);
  }
  return r.rows.length;
}

async function seed() {
  const before = await counts();
  console.log('== 造数前（只读盘点）==');
  console.log(
    `   一级标签 ${before.roots} · 我方残留 ${before.probeLabels} 标签 / ${before.probeAssets} 资产 / ${before.links} 挂载`,
  );
  if (before.probeLabels || before.probeAssets) {
    console.log('✗ 检测到上一轮残留 ⇒ 先 --clean 再 seed（保证幂等）');
    process.exit(1);
  }
  const ownerRes = await pg.query<{ id: string; username: string | null }>(
    'SELECT id, username FROM "user" ORDER BY created_at ASC LIMIT 1',
  );
  const owner = ownerRes.rows[0];
  if (!owner) {
    console.log('✗ 真库无用户 ⇒ 无法造资产（owner_id 非空引用 user.id）');
    process.exit(1);
  }
  // ⑦ 14 个零挂载一级标签
  for (let i = 1; i <= COLOR_COUNT; i++) {
    const slug = `${COLOR_PREFIX}${String(i).padStart(2, '0')}`;
    await pg.query(
      `INSERT INTO label_definition (slug, type, visible_in_filter, sort_order, parent_id, created_by)
       VALUES ($1, 'RECOMMENDED', true, 0, NULL, $2)`,
      [slug, owner.id],
    );
  }
  // ⑧ 「仅挂 HIDDEN 资产」的一级标签 + 其 HIDDEN 资产 + 挂载
  const labRes = await pg.query<{ id: string }>(
    `INSERT INTO label_definition (slug, type, visible_in_filter, sort_order, parent_id, created_by)
     VALUES ($1, 'RECOMMENDED', true, 0, NULL, $2) RETURNING id`,
    [HIDDEN_LABEL, owner.id],
  );
  const astRes = await pg.query<{ id: string }>(
    `INSERT INTO asset (type, slug, owner_id, status, created_by)
     VALUES ('skill', $1, $2, 'HIDDEN', $2) RETURNING id`,
    [HIDDEN_ASSET, owner.id],
  );
  await pg.query('INSERT INTO asset_label (asset_id, label_id, created_by) VALUES ($1, $2, $3)', [
    astRes.rows[0]?.id,
    labRes.rows[0]?.id,
    owner.id,
  ]);
  const after = await counts();
  console.log('== 造数完成 ==');
  console.log(
    `   一级标签 ${before.roots} → **${after.roots}**（+${after.roots - before.roots}）· 我方标签 ${after.probeLabels} · 资产 ${after.probeAssets} · 挂载 ${after.links}`,
  );
  console.log(
    `   资产总数 ${before.assetsAll} → ${after.assetsAll} · owner = ${owner.username ?? owner.id}`,
  );
  await listProbe();
}

async function clean() {
  const before = await counts();
  if (!before.probeLabels && !before.probeAssets) {
    console.log('（无残留，跳过清理）');
  } else {
    const del1 = await pg.query(
      `DELETE FROM asset_label WHERE asset_id IN (SELECT id FROM asset WHERE slug LIKE $1)
          OR label_id IN (SELECT id FROM label_definition WHERE slug LIKE $1)`,
      [PROBE_LIKE],
    );
    const del2 = await pg.query('DELETE FROM asset WHERE slug LIKE $1', [PROBE_LIKE]);
    const del3 = await pg.query(
      'DELETE FROM label_translation WHERE label_id IN (SELECT id FROM label_definition WHERE slug LIKE $1)',
      [PROBE_LIKE],
    );
    const del4 = await pg.query('DELETE FROM label_definition WHERE slug LIKE $1', [PROBE_LIKE]);
    console.log(
      `✓ 已回收：挂载 ${del1.rowCount} · 资产 ${del2.rowCount} · 翻译 ${del3.rowCount} · 标签 ${del4.rowCount}`,
    );
  }
  const after = await counts();
  console.log(
    `== 自清后 == 一级标签 **${after.roots}** · 我方标签 ${after.probeLabels} · 我方资产 ${after.probeAssets} · 我方挂载 ${after.links} · 资产总数 ${after.assetsAll}`,
  );
  if (after.probeLabels || after.probeAssets || after.links) {
    console.log('✗ 自清不彻底 ⇒ 请人工核查');
    process.exit(1);
  }
}

async function verify() {
  const c = await counts();
  console.log('== 只读盘点 ==');
  console.log(
    `   一级标签 **${c.roots}** · 我方标签 ${c.probeLabels} · 我方资产 ${c.probeAssets} · 我方挂载 ${c.links} · 资产总数 ${c.assetsAll}`,
  );
  if (c.probeLabels || c.probeAssets) {
    console.log('   我方条目明细：');
    await listProbe();
  }
  // ⑧ 缺口复现条件：真库是否存在「只挂非 ACTIVE 资产」的标签（历史实测 0 条）
  const onlyHidden = await one(
    `SELECT count(*)::text AS n FROM (
       SELECT al.label_id
         FROM asset_label al JOIN asset a ON a.id = al.asset_id
        GROUP BY al.label_id
       HAVING count(*) FILTER (WHERE a.status = 'ACTIVE') = 0
     ) t`,
  );
  console.log(
    `   「仅挂非 ACTIVE 资产」的标签数 = **${onlyHidden}**（0 ⇒ ⑧ 分支无真数据，须造数才可实证）`,
  );
}

if (mode === 'seed') await seed();
else if (mode === 'clean') await clean();
else await verify();
