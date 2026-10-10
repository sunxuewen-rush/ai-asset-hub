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

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');
const SCRIPT_DIR = new URL('./', import.meta.url).pathname;
const API = 'http://127.0.0.1:3000';
/** web 的 vite 只监听 **IPv6 回环**（实测 `[::1]:5173`）⇒ 优先 ::1，再回落 127.0.0.1 */
const WEB_CANDIDATES = ['http://[::1]:5173/', 'http://127.0.0.1:5173/'];
/**
 * **浏览器生命周期自管（F297 处置 · 2026-10-09）** —— 为什么：长期运行的无头调试 Edge 会「老化」：
 * CDP 连得上但命令/事件不返回（实测脚本卡在 `about:blank` · CPU 0% · 烧满 900s/脚本超时 ·
 * `/json/activate` 无效；实例跑满 1d4h / 4h 后复现；**重启后同一脚本立刻恢复 8/8 · 519/0**）。
 * 故本 runner **自起自灭**一个全新实例：专属端口（不与手工/其它工具的 :9222 争用）+ 临时 profile
 * （`mktemp -d` ⇒ 每轮全新）+ 只杀自己启动的进程；每脚本前做健康探针，超时则重启并重试一次。
 * 逃生口：`SMOKE_NO_BROWSER_MGMT=1`（回到旧行为：用外部既有实例）。
 */
const CDP_PORT = Number(process.env.SMOKE_CDP_PORT ?? 9333);
const CDP = `http://127.0.0.1:${CDP_PORT}`;
const EDGE_BIN =
  process.env.SMOKE_EDGE ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const MANAGE_BROWSER = process.env.SMOKE_NO_BROWSER_MGMT !== '1';
/** 应用 origin（剪贴板授权用） */
const APP_ORIGIN = 'http://localhost:5173';
let browserProc: ReturnType<typeof spawn> | null = null;
let profileDir = '';

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
  'm4c2-users-dogfood.ts', // M4c-2 T7：用户治理面（API 级）
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

/* ── 0. 浏览器生命周期工具（F297）── */
function launchBrowser(): void {
  if (browserProc) return;
  profileDir = mkdtempSync(join(tmpdir(), 'edge-dogfood-'));
  browserProc = spawn(
    EDGE_BIN,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  browserProc.on('error', () => {
    browserProc = null;
  });
}

async function waitCdp(ms: number): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(2000) })
      .then((r) => r.json() as Promise<{ Browser?: string }>)
      .catch(() => null);
    if (v?.Browser) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** 只动**自己启动**的实例：按临时 profile 路径匹配 + 杀自身子进程 */
function killBrowser(): void {
  if (profileDir) spawnSync('pkill', ['-f', profileDir], { stdio: 'ignore' });
  if (browserProc) {
    try {
      browserProc.kill('SIGKILL');
    } catch {
      /* 已退出 */
    }
    browserProc = null;
  }
  if (profileDir) {
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* 忽略 */
    }
    profileDir = '';
  }
}

/**
 * **剪贴板授权（F296 · m4b3 根因处置 · 2026-10-09）**：`navigator.clipboard.writeText()` 在**未获授权**的
 * origin 上会被拒 ⇒ 应用不标记"已复制"⇒ 明文态弹窗关闭时改弹确认 ⇒ 后续断言（掩码/编辑/删除）**一因多果全红**。
 * 旧 profile 恰好被历史操作授权过 ⇒ 一直"恰好能复制"；换干净 profile 即暴露（实测：日志内 G12 时刻弹窗文本
 * 仍是「还没有复制，确定关闭吗？」）。全仓脚本此前**零** clipboard 处理（grep 零命中）。
 * 处置：由 runner 在**自管实例**上对该 origin 授予剪贴板权限（`Browser.grantPermissions` · browser 级命令）。
 */
async function grantClipboardPermission(): Promise<boolean> {
  const ver = (await fetch(`${CDP}/json/version`)
    .then((r) => r.json())
    .catch(() => null)) as { webSocketDebuggerUrl?: string } | null;
  if (!ver?.webSocketDebuggerUrl) return false;
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  const opened = await new Promise<boolean>((res) => {
    ws.onopen = () => res(true);
    ws.onerror = () => res(false);
    setTimeout(() => res(false), 3000);
  });
  if (!opened) return false;
  const granted = await new Promise<boolean>((res) => {
    const onMsg = (ev: MessageEvent) => {
      try {
        const m = JSON.parse(ev.data as string) as { id?: number; error?: unknown };
        if (m.id === 1) {
          ws.removeEventListener('message', onMsg);
          res(!m.error);
        }
      } catch {
        /* 非 JSON 帧忽略 */
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(
      JSON.stringify({
        id: 1,
        method: 'Browser.grantPermissions',
        params: {
          origin: APP_ORIGIN,
          permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        },
      }),
    );
    setTimeout(() => res(false), 3000);
  });
  ws.close();
  return granted;
}

/** 健康探针：新开标签发 `Runtime.evaluate`，3s 内不回 ⇒ 判定老化 */
async function probeBrowser(): Promise<boolean> {
  const tab = (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })
    .then((r) => r.json())
    .catch(() => null)) as { id?: string; webSocketDebuggerUrl?: string } | null;
  if (!tab?.webSocketDebuggerUrl) return false;
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const opened = await new Promise<boolean>((res) => {
    ws.onopen = () => res(true);
    ws.onerror = () => res(false);
    setTimeout(() => res(false), 3000);
  });
  let healthy = false;
  if (opened) {
    healthy = await new Promise<boolean>((res) => {
      const onMsg = (ev: MessageEvent) => {
        try {
          if ((JSON.parse(ev.data as string) as { id?: number }).id === 1) {
            ws.removeEventListener('message', onMsg);
            res(true);
          }
        } catch {
          /* 非 JSON 帧忽略 */
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(
        JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1 + 1' } }),
      );
      setTimeout(() => res(false), 3000);
    });
    ws.close();
  }
  await fetch(`${CDP}/json/close/${tab.id}`).catch(() => null);
  return healthy;
}

process.on('exit', killBrowser);
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    killBrowser();
    process.exit(130);
  });
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

if (MANAGE_BROWSER) {
  launchBrowser();
  if (await waitCdp(15000)) {
    ok(`CDP 自管实例就绪（端口 ${CDP_PORT} · 临时 profile · F297）`);
    ok(`剪贴板授权 ${APP_ORIGIN}：${(await grantClipboardPermission()) ? '✓' : '⚠️ 失败'}`);
  } else {
    bad(`CDP 自管实例未就绪（${CDP} · Edge=${EDGE_BIN}）`);
    fatal = true;
  }
} else {
  const cdpVersion = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(8000) })
    .then((r) => r.json() as Promise<{ Browser?: string }>)
    .catch(() => null);
  if (!cdpVersion?.Browser) {
    bad(`Edge CDP ${CDP} 不可达（启动：见各脚本头部注释）`);
    fatal = true;
  } else ok(`Edge CDP 在线（${cdpVersion.Browser}）`);
}

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
    env: { ...process.env, SMOKE_CDP: CDP },
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
const retried = new Set<string>();
for (const name of selected) {
  process.stdout.write(`\n── ${name} ──\n`);
  if (MANAGE_BROWSER) {
    const healthy = await probeBrowser();
    if (!healthy) {
      process.stdout.write('   ⚠️ CDP 健康探针失败 ⇒ 重启浏览器实例后继续（F297）\n');
      killBrowser();
      launchBrowser();
      await waitCdp(15000);
      await grantClipboardPermission();
    }
  }
  let r = run(name, 15 * 60 * 1000);
  // F297：**超时**（`SIGTERM`）判为环境可疑 ⇒ 重启实例后重试一次（只一次，避免掩盖真缺陷）
  if (MANAGE_BROWSER && r.signal === 'SIGTERM' && !retried.has(name)) {
    retried.add(name);
    process.stdout.write('   ⚠️ 超时 ⇒ 重启浏览器实例后重试一次（F297）\n');
    killBrowser();
    launchBrowser();
    await waitCdp(15000);
    await grantClipboardPermission();
    r = run(name, 15 * 60 * 1000);
  }
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
