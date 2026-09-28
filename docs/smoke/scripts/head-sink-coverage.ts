#!/usr/bin/env bun
/**
 * 头部下沉覆盖检查 —— head-sink-coverage.ts
 *
 * 背景（2026-09-28）：M4b 头部口径统一笔换靶自查发现，**头部版本行被删时其内容可能与
 * 修订记录表行「同源不同文本」** ⇒ 删掉即丢细节。全仓历史扫类实测 117 条被删头部行中
 * 有 14+ 条存在「删后无补偿」（token 在任何地方都找不到）。既有门禁（doc-audit）只看
 * **状态**、不看**删除的确切内容**，故此缺陷无闸可拦 —— 本脚本补上这一维。
 *
 * 判据（token 级覆盖 · 与仓内先例同口径：M4b-4 plan v0.38 行「被删 29 条裸 token 在
 * 正文其他处全命中」）：把**被删头部版本声明行**里的裸 token（路径 / 版号 / `F` 号 /
 * 反引号标识 / ≥2 位数）逐个在 **post-state 全文**里找；找不到即 FAIL。
 *
 * 为什么基于 diff 而非状态：doc-audit 跑在 CI（浅克隆）只能看当前树，无法知道「删了什么」。
 * 故本检查比对**一个提交区间**（CI 用 push 区间；本地默认 WORKTREE vs HEAD）。
 *
 * 用法：
 *   bun docs/smoke/scripts/head-sink-coverage.ts                     # 工作区 vs HEAD
 *   bun docs/smoke/scripts/head-sink-coverage.ts --base <sha>        # <sha> vs 工作区
 *   bun docs/smoke/scripts/head-sink-coverage.ts --base <sha> --head <sha2>
 * 退出码：0 = 无未覆盖下沉行（或区间不可用 ⇒ 显式 N/A）；1 = 有 FAIL；2 = 用法错误
 *
 * 区间纪律（2026-09-28 鲁棒性反证 D1–D8 六探针后加固）：
 *   base / head **给了但不可用**（空串 / 全零 / 不可解析）⇒ 一律**显式 N/A 退出 0**，
 *   绝不替换成别的区间（旧版曾静默回退 HEAD^ 与工作区 ⇒ 在 CI 里既可能假绿也可能假红）；
 *   diff 取法 = 先取改动文件清单、再**逐文件**取 diff ⇒ 规避区间级 diff 触发 maxBuffer。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** 头部「版本声明行」三形态（与 doc-audit 保持一致口径） */
const HEAD_DECL =
  /^> (?:Updated: )?(?:\d{4}-\d{2}-\d{2}（\*{0,2}v\d|v\d+\.\d+（\d{4}-\d{2}-\d{2}）)/;

const TOKEN_RES: RegExp[] = [
  /(?:docs|apps|packages)\/[A-Za-z0-9_./-]+/g, // 路径
  /v\d+\.\d+/g, // 版号
  /\bF\d{1,3}\b/g, // 缺陷号
  /`([^`]+)`/g, // 反引号标识（取组 1）
  /\b\d{2,}\b/g, // ≥2 位数
];

function tokens(line: string): string[] {
  const out = new Set<string>();
  for (const re of TOKEN_RES) {
    for (const m of line.matchAll(re)) {
      const raw = (m[1] ?? m[0]).trim();
      for (const part of raw.split(/[/、\s]+/)) {
        if (!part) continue;
        if (/^\d+$/.test(part) && part.length < 2) continue;
        out.add(part);
      }
    }
  }
  return [...out];
}

/** 64 MiB：区间级 diff 已改走「逐文件」，此值只作兜底（单文件 diff 不会接近它） */
const MAX_BUFFER = 64 * 1024 * 1024;

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: MAX_BUFFER });
}

/** 取区间内改动文件清单，再逐文件取 diff（规避区间级 diff 的 maxBuffer 溢出 · D5/D6 实证） */
function collectDiff(baseRev: string, headRev: string | null): string {
  const scope = headRev ? [baseRev, headRev] : [baseRev];
  const files = git(['diff', '--name-only', ...scope, '--', 'docs'])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return files.map((f) => git(['diff', '--unified=0', ...scope, '--', f])).join('');
}

/**
 * 覆盖判定（含 markdown 转义归一）：表行里 `a\|b` 与头部行 `a|b` 是同一事实
 * —— 反证实证：m4b4 design v1.15 的 `assets|versions|labels|client` 曾被本检查误报 FAIL。
 */
function covered(post: string, token: string): boolean {
  if (post.includes(token)) return true;
  if (post.includes(token.replaceAll('|', '\\|'))) return true;
  return post.replaceAll('\\|', '|').includes(token.replaceAll('\\|', '|'));
}

function tryGit(args: string[]): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

const USAGE = [
  '用法：',
  '  bun docs/smoke/scripts/head-sink-coverage.ts                    # 工作区 vs HEAD',
  '  bun docs/smoke/scripts/head-sink-coverage.ts --base <sha>       # <sha> vs 工作区',
  '  bun docs/smoke/scripts/head-sink-coverage.ts --base <sha> --head <sha2>',
].join('\n');

/** 参数白名单：未知参数 / 缺取值 ⇒ 用法错误 exit 2（不静默吞掉 · D7/D8 实证） */
function parseArgs(argv: string[]): { base: string | null; head: string | null } {
  const allowed = new Set(['--base', '--head']);
  const out: { base: string | null; head: string | null } = { base: null, head: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
    if (!allowed.has(a)) {
      console.error(`未知参数：${a}\n${USAGE}`);
      process.exit(2);
    }
    const v = argv[i + 1];
    if (v === undefined) {
      console.error(`参数 ${a} 缺少取值\n${USAGE}`);
      process.exit(2);
    }
    if (a === '--base') out.base = v;
    else out.head = v;
    i += 1;
  }
  return out;
}

/**
 * 豁免册：显式、逐条带理由（与仓内「口径登记」同风格）。
 * 只在「同一事实的**记法差异**」或「补录会引入不准确/已退役形态」时使用 —— 不是逃生门：
 * 每次新增豁免都会出现在本检查的 N/A 明细里，评审可见。
 */
const WAIVERS = join(ROOT, 'docs/smoke/head-sink-waivers.json');

interface Waiver {
  file: string;
  version: string;
  tokens: string[];
  reason: string;
}

function loadWaivers(): Waiver[] {
  try {
    return (JSON.parse(readFileSync(WAIVERS, 'utf8')) as { waivers: Waiver[] }).waivers ?? [];
  } catch {
    return [];
  }
}

/** 可用性判定：非空 · 非全零（首推/force push 的 before）· 且可解析为 commit */
const usable = (rev: string | null): boolean =>
  !!rev &&
  rev.trim() !== '' &&
  !/^0+$/.test(rev.trim()) &&
  tryGit(['rev-parse', '--verify', `${rev}^{commit}`]) !== null;

/**
 * 区间端点决议：**未给** ⇒ 返回 null（调用方取本地语义）；**给了但不可用** ⇒ 打印显式 N/A 并退出 0。
 * 关键：绝不替换成另一个区间（旧版静默回退 HEAD^ / 工作区 ⇒ CI 里可能假绿或假红 · D2/D3/D4 实证）。
 */
function resolveRev(rev: string | null, label: string): string | null {
  if (rev === null) return null;
  if (!usable(rev)) {
    console.log(
      `N/A  ${label} 不可用（取值：${rev.trim() === '' ? '(空串)' : rev}）⇒ 本检查显式跳过，不替换成其它区间`,
    );
    process.exit(0);
  }
  return rev;
}

const argv = parseArgs(process.argv.slice(2));
const base = resolveRev(argv.base, '--base') ?? 'HEAD';
const head = resolveRev(argv.head, '--head');

let diff: string;
try {
  diff = collectDiff(base, head);
} catch (e) {
  const over = /ENOBUFS|maxBuffer/i.test(String(e));
  console.log(
    over
      ? `N/A  diff 体量超出上限（逐文件取 diff 后仍溢出 ${MAX_BUFFER} 字节）⇒ 显式跳过（未做判定）`
      : `N/A  git diff 失败（base=${base} / head=${head ?? 'WORKTREE'}）⇒ 显式跳过（未做判定）：${String(e).slice(0, 120)}`,
  );
  process.exit(0);
}

const postState = (file: string): string | null => {
  if (head && usable(head)) return tryGit(['show', `${head}:${file}`]);
  try {
    return readFileSync(join(ROOT, file), 'utf8');
  } catch {
    return null; // 文件已删除/改名 ⇒ 免检（删除语义不同，另事）
  }
};

let cur: string | null = null;
let pass = 0;
const fails: string[] = [];
const skipped: string[] = [];
const waivers = loadWaivers();

for (const [idx, line] of diff.split('\n').entries()) {
  if (line.startsWith('+++ b/')) {
    cur = line.slice(6);
    continue;
  }
  if (!line.startsWith('-') || line.startsWith('---')) continue;
  const removed = line.slice(1);
  if (!HEAD_DECL.test(removed) || !cur) continue;
  const post = postState(cur);
  if (post === null) {
    skipped.push(`${cur}:${idx + 1}（文件已不存在 ⇒ 免检）`);
    continue;
  }
  const ver = (removed.match(/v(\d+\.\d+)：/) ?? removed.match(/v(\d+\.\d+)/))?.[1] ?? '?';
  const miss = tokens(removed).filter((t) => !covered(post, t));
  if (miss.length === 0) {
    pass += 1;
    continue;
  }
  const w = waivers.find((x) => x.file === cur && x.version === ver);
  const waived = w ? miss.filter((t) => w.tokens.includes(t)) : [];
  const hard = miss.filter((t) => !waived.includes(t));
  if (waived.length)
    skipped.push(
      `${cur} v${ver} · 豁免 ${waived.length} token（${waived.slice(0, 4).join(' · ')}）—— ${w?.reason ?? ''}`,
    );
  if (hard.length > 0) {
    fails.push(
      `${cur}:${idx + 1} v${ver} 下沉后未覆盖 ${hard.length} token：${hard.slice(0, 8).join(' · ')}`,
    );
  } else {
    pass += 1;
  }
}

for (const f of fails) console.log(`FAIL ${f}`);
for (const s of skipped) console.log(`N/A  ${s}`);
console.log(
  `\n=== 结果：${pass} PASS / ${fails.length} FAIL（区间 ${base}${head && usable(head) ? `..${head}` : '..WORKTREE'}）===`,
);
if (fails.length) {
  console.log(
    '说明：头部版本行删除时，其内容必须仍能在同文件内找到（逐字迁移到修订表行，或确认正文/表行已完整承载）。',
  );
}
process.exit(fails.length === 0 ? 0 : 1);
