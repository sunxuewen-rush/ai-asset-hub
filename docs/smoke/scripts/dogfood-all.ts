/**
 * 全量 dogfood runner（F290 家族 + F293 加固 · 2026-10-09）
 *
 * 为什么需要本件：7 个 `*-dogfood.ts` 各有前置（dev 三件在线 · 造数已跑 · 干净标签 · 桌面视口），
 * 手工按序跑容易漏前置 ⇒ **假红**（历史两例：**F290** 复用陈旧标签 · **F293** 未重播种子的顺序依赖）。
 * 本 runner 把「**前置体检 → 造数 → 依次跑 → 汇总**」收敛到一处，任一脚本 FAIL 即以非零码退出。
 *
 * 用法（口令不入仓）：
 *   bun --env-file=apps/server/.env docs/smoke/scripts/dogfood-all.ts
 *
 * 可选环境变量：
 *   `SMOKE_SCRIPTS=m4b2,m4b5`  只跑子集（按脚本名包含匹配）
 *   `SMOKE_SKIP_SEED=1`       跳过本 runner 的造数（子脚本自愈亦随之跳过）
 *   `SMOKE_LOG_DIR=<dir>`     日志目录（缺省 `/tmp/dogfood-all-<ts>`，每脚本一份 `.log`）
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');
const SCRIPT_DIR = new URL('./', import.meta.url).pathname;
const API = 'http://127.0.0.1:3000';
/** web 的 vite 只监听 **IPv6 回环**（实测 `[::1]:5173`）⇒ 优先 ::1，再回落 127.0.0.1 */
const WEB_CANDIDATES = ['http://[::1]:5173/', 'http://127.0.0.1:5173/'];
const CDP = 'http://127.0.0.1:9222';

/** 造数脚本（可重放 · 幂等）——按脚本名前缀排序执行 */
const SEEDS = [
  'm4b2-seed-roles.ts',
  'm4b3-seed-submissions.ts',
  'm4b4-seed-assets.ts',
  'm4b5-seed-reviews.ts',
  'm4b6-seed-downloads.ts',
  'm4b7-seed-assets.ts',
];

/** dogfood 脚本（**执行序即下表序** —— 与批验收一致） */
const SCRIPT_NAMES = [
  'm4a-dogfood.ts',
  'm4b2-auth-dogfood.ts',
  'm4b3-personal-a-dogfood.ts',
  'm4b4-personal-b-dogfood.ts',
  'm4b5-review-dogfood.ts',
  'm4b6-governance-dogfood.ts',
  'm4b7-publish-dogfood.ts',
];

const LOG_DIR = process.env.SMOKE_LOG_DIR ?? `/tmp/dogfood-all-${Date.now()}`;
mkdirSync(LOG_DIR, { recursive: true });

const ok = (s: string) => console.log(`  ✅ ${s}`);
const bad = (s: string) => console.log(`  ❌ ${s}`);

async function reachable(url: string, ms = 8000): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── 1. 前置体检：dev 三件 ── */
console.log('【前置体检】');
let fatal = false;
if (!(await reachable(`${API}/healthz`))) {
  bad(`api ${API}/healthz 不可达（起服务：bun run dev）`);
  fatal = true;
} else ok(`api ${API} 在线`);

let webUp = false;
for (const u of WEB_CANDIDATES) {
  if (await reachable(u)) {
    webUp = true;
    ok(`web ${u} 在线`);
    break;
  }
}
if (!webUp) {
  bad(`web 不可达（试过 ${WEB_CANDIDATES.join(' · ')}）—— 注意 vite 只听 IPv6 回环`);
  fatal = true;
}

const cdpVersion = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(8000) })
  .then((r) => r.json() as Promise<{ Browser?: string }>)
  .catch(() => null);
if (!cdpVersion?.Browser) {
  bad(`Edge CDP ${CDP} 不可达（启动：见各脚本头部注释）`);
  fatal = true;
} else ok(`Edge CDP 在线（${cdpVersion.Browser}）`);

/* ── 2. 标签清理（F290：陈旧 5173 标签会污染断言） ── */
const tabs =
  (await fetch(`${CDP}/json`)
    .then((r) => r.json() as Promise<Array<{ type?: string; url?: string; id?: string }>>)
    .catch(() => [])) ?? [];
const stale = tabs.filter((t) => t.type === 'page' && (t.url ?? '').includes('5173'));
for (const t of stale) {
  await fetch(`${CDP}/json/close/${t.id}`).catch(() => null);
}
ok(stale.length > 0 ? `清理陈旧 5173 标签 ${stale.length} 个` : '5173 标签已是干净态');

if (fatal) {
  console.error('\n前置未满足 ⇒ 中止（先修前置，勿看 dogfood 结论）');
  process.exit(2);
}

/* ── 3. 造数（幂等 · 可重放） ── */
function run(file: string, timeoutMs: number) {
  const started = Date.now();
  const r = spawnSync('bun', [`${SCRIPT_DIR}${file}`], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  writeFileSync(`${LOG_DIR}/${file.replace(/\.ts$/, '')}.log`, out);
  const pass = (out.match(/^\s*PASS /gm) ?? []).length;
  const fail = (out.match(/^\s*FAIL /gm) ?? []).length;
  return { status: r.status, signal: r.signal, pass, fail, ms: Date.now() - started, out };
}

if (process.env.SMOKE_SKIP_SEED !== '1') {
  console.log('\n【造数】（幂等复位；`SMOKE_SKIP_SEED=1` 跳过）');
  for (const s of SEEDS) {
    const r = run(s, 5 * 60 * 1000);
    if (r.status !== 0) {
      bad(`${s} 失败（exit=${r.status}）—— 日志 ${LOG_DIR}/${s.replace(/\.ts$/, '')}.log`);
      console.error(r.out.slice(-1500));
      process.exit(2);
    }
    ok(`${s} ✓（${(r.ms / 1000).toFixed(1)}s）`);
  }
}

/* ── 4. 依次跑 dogfood ── */
const filter = (process.env.SMOKE_SCRIPTS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const selected =
  filter.length > 0 ? SCRIPT_NAMES.filter((n) => filter.some((f) => n.includes(f))) : SCRIPT_NAMES;
if (selected.length === 0) {
  console.error(`SMOKE_SCRIPTS=${process.env.SMOKE_SCRIPTS} 未匹配任何脚本`);
  process.exit(2);
}

console.log(`\n【dogfood ${selected.length} 脚本 · 执行序如下】`);
const results: Array<{
  name: string;
  pass: number;
  fail: number;
  status: number | null;
  ms: number;
}> = [];
for (const name of selected) {
  process.stdout.write(`\n── ${name} ──\n`);
  const r = run(name, 15 * 60 * 1000);
  const timedOut = r.signal === 'SIGTERM';
  results.push({ name, pass: r.pass, fail: r.fail, status: r.status, ms: r.ms });
  const line = `${name}: ${r.pass} PASS / ${r.fail} FAIL · EXIT=${r.status}${timedOut ? '（超时）' : ''} · ${(r.ms / 1000).toFixed(1)}s`;
  if (r.status === 0 && r.fail === 0) ok(line);
  else bad(`${line} —— 日志 ${LOG_DIR}/${name.replace(/\.ts$/, '')}.log`);
}

/* ── 5. 汇总 ── */
const totalPass = results.reduce((a, r) => a + r.pass, 0);
const totalFail = results.reduce((a, r) => a + r.fail, 0);
const failed = results.filter((r) => r.status !== 0 || r.fail > 0);
console.log('\n══════ 汇总 ══════');
for (const r of results) {
  console.log(
    `  ${r.status === 0 && r.fail === 0 ? '✅' : '❌'} ${r.name.padEnd(34)} ${String(r.pass).padStart(3)} PASS / ${String(r.fail).padStart(2)} FAIL · EXIT=${r.status}`,
  );
}
console.log(
  `  合计：${totalPass} PASS / ${totalFail} FAIL · ${results.length - failed.length}/${results.length} 脚本绿`,
);
console.log(`  日志目录：${LOG_DIR}`);
if (failed.length > 0) {
  console.error(`\n❌ 未全绿：${failed.map((f) => f.name).join(' · ')}`);
  process.exit(1);
}
console.log('\n🎉 全绿');
