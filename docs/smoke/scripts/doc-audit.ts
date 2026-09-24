#!/usr/bin/env bun
/**
 * 文档体检 —— doc-audit.ts
 *
 * 背景（2026-09-18）：整体体检发现「版本头 vs 修订记录表」在 8 份文档里对不上，
 * 根因是**写文档时只改一边**、且没有校验机制。本脚本把该检查自动化，防复发。
 *
 * 检查项：
 *   A. 版本头一致性 —— 头部最新版必须出现在修订记录表内；且头部只留最近 1-2 版
 *   B. 死路径引用 —— 形如 `docs/xxx.md` 的引用必须真实存在（更名/旧名史实行豁免）
 *   C. 头部长度告警 —— 头部 >1500 字符视为「又在堆历史」
 *   D. 中立性（文档 + `apps|packages/*\/src` 一并扫）—— 禁三类：
 *        公司名 · 内部仓编号 · 本机绝对路径
 *      （外部开源项目只写项目名 + 许可；doc-audit 自身豁免）
 *
 * 用法：bun docs/smoke/scripts/doc-audit.ts
 * 退出码：0 = 全通过；1 = 有 FAIL
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const MD_DIRS = ['docs', 'docs/designs', 'docs/plans', 'docs/smoke'];
const SRC_DIRS = ['apps/server/src', 'apps/web/src', 'apps/cli/src', 'packages/protocol/src'];
const SELF = 'docs/smoke/scripts/doc-audit.ts';

/**
 * 中立性词表（可维护）：新发现的越界形态补到这里。
 * 刻意用**显式词表**而非宽泛正则 —— 宽正则会误伤文件名（如 `01-asset-protocol.md`）。
 */
const NEUTRAL_PATTERNS: { label: string; re: RegExp }[] = [
  { label: '公司名', re: /iflytek|科大讯飞|讯飞/i },
  { label: '内部仓编号', re: /21-skillhub/i },
  { label: '本机绝对路径', re: /\/Users\/[A-Za-z]|\/home\/[A-Za-z]|[A-Z]:\\Users/ },
];

function walk(dir: string, out: string[], exts: string[]): void {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return;
  for (const name of readdirSync(abs)) {
    const rel = join(dir, name);
    const absChild = join(ROOT, rel);
    if (statSync(absChild).isDirectory()) walk(rel, out, exts);
    else if (exts.some((e) => name.endsWith(e))) out.push(rel);
  }
}

function listDocs(): string[] {
  const out: string[] = [];
  for (const f of ['README.md', 'AGENTS.md', 'THIRD-PARTY-NOTICES.md'])
    if (existsSync(join(ROOT, f))) out.push(f);
  for (const d of MD_DIRS) {
    const abs = join(ROOT, d);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) if (name.endsWith('.md')) out.push(join(d, name));
  }
  return out;
}

function listSources(): string[] {
  const out: string[] = [];
  for (const d of SRC_DIRS) walk(d, out, ['.ts', '.tsx', '.css']);
  return out;
}

let pass = 0;
let fail = 0;
const bad: string[] = [];
const ok = (cond: boolean, label: string, detail = '') => {
  if (cond) {
    pass++;
    console.log(`PASS ${label}`);
  } else {
    fail++;
    bad.push(label);
    console.log(`FAIL ${label}  ${detail}`);
  }
};

const docs = listDocs();
const sources = listSources();
console.log(`=== 文档体检 doc-audit（文档 ${docs.length} 份 · 源码 ${sources.length} 份）===\n`);

for (const rel of docs) {
  const text: string = readFileSync(join(ROOT, rel), 'utf8');
  const lines = text.split('\n');
  /*
   * 头部版本行 = **全部** `> Updated:` 行（不是第一行）。
   * F-111（2026-09-21）：原实现 `lines.find(...)` 只取第一行 ⇒「头部版本数 ≤3」恒 ≤1、
   * 「头部长度 ≤1500」只量第一行 ⇒ 头部堆到 10 行照样 PASS（假绿 —— 与 F64/F93 同族盲区）。
   */
  const headLines = lines.filter((l) => l.startsWith('> Updated:'));
  const headLine = headLines[0];

  // A. 版本头 vs 修订表
  if (headLine) {
    const hv = [...headLine.matchAll(/v(\d+\.\d+)：/g)].map((m) => m[1]);
    const rv = lines
      .filter((l) => /^\|\s*\*{0,2}v?\d+\.\d+\s*\*{0,2}\s*\|/.test(l))
      .map((l) => (l.match(/^\|\s*\*{0,2}v?(\d+\.\d+)/) as RegExpMatchArray)[1]);
    if (hv.length > 0) {
      ok(
        rv.includes(hv[0]),
        `[A] ${rel} 头部最新版 v${hv[0]} 在修订表内`,
        `表内 ${rv.length} 版：${rv.slice(0, 5).join(', ')}…`,
      );
    }
    ok(
      headLines.length <= 3,
      `[A] ${rel} 头部版本行 ≤3（当前 ${headLines.length}）`,
      `口径：头部只留最近 1-2 版，完整历史见修订表｜本文件头部行：${headLines
        .map((l) => (l.match(/v(\d+\.\d+)/) ?? [])[1] ?? '?')
        .join(', ')}`,
    );
  }

  /*
   * A2. 修订表 → 头部（**反向检查** · 2026-09-22 加）：
   * A 是**单向**的（只验「头部版 ∈ 表」）⇒ 抓不到「表加了行、头部没同步」。
   * 实测逃逸 3 处（`docs/05` v1.11 · M3 design v1.7 · M4b-4 plan v0.48），故补反向检查。
   * 口径：修订记录段（`## N. 修订记录`）内表行的**最大版号**必须出现在头部版本行内。
   * 已知边界（必要非充分）：头部版号取「首行至第一个 `## ` 前、以 `> ` 开头的行」——
   *   若某文件头部引用了**别的文档**的版号，可能掩盖本文件的落后（假绿）。
   */
  const secIdx = lines.findIndex((l) => /^##\s+\d*\.?\s*修订记录/.test(l));
  if (secIdx >= 0) {
    const h2 = lines.findIndex((l) => l.startsWith('## '));
    const headVs = new Set(
      lines
        .slice(0, h2 < 0 ? lines.length : h2)
        .filter((l) => l.startsWith('> '))
        .flatMap((l) => [...l.matchAll(/v(\d+\.\d+)/g)].map((m) => m[1] ?? ''))
        .filter((v) => v !== ''),
    );
    const tvs = lines
      .slice(secIdx)
      .map((l) => l.match(/^\|\s*\*{0,2}v?(\d+\.\d+)\s*\*{0,2}\s*\|/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => m[1] ?? '')
      .filter((v) => v !== '');
    if (tvs.length > 0) {
      const cmp = (a: string, b: string) => {
        const [a1 = 0, a2 = 0] = a.split('.').map(Number);
        const [b1 = 0, b2 = 0] = b.split('.').map(Number);
        return a1 - b1 || a2 - b2;
      };
      const tmax = tvs.reduce((a, b) => (cmp(a, b) >= 0 ? a : b));
      ok(
        headVs.has(tmax),
        `[A2] ${rel} 修订表最新版 v${tmax} 已同步到头部`,
        `头部版号：${[...headVs].join(', ') || '(无)'}`,
      );
    }
  }

  // B. 死路径引用（更名/旧名/沿革 史实行豁免）
  for (const [idx, line] of lines.entries()) {
    if (/更名|旧名|原文件名|沿革/.test(line)) continue;
    for (const m of line.matchAll(/`?((?:docs|apps|packages)\/[A-Za-z0-9_./-]+\.md)`?/g)) {
      const p = m[1];
      if (!existsSync(join(ROOT, p))) ok(false, `[B] ${rel}:${idx + 1} 引用的 ${p} 存在`, '死路径');
    }
  }

  // C. 头部长度（**每一条** `Updated:` 行都量 —— F-111：原只量第一行）
  for (const [i, l] of headLines.entries()) {
    if (l.length > 1500) {
      ok(false, `[C] ${rel} 头部第 ${i + 1} 行长度 ${l.length} ≤1500`, '疑似又在头部堆历史');
    }
  }
}

// D. 中立性（文档 + 源码）
for (const rel of [...docs, ...sources]) {
  if (rel === SELF) continue; // 本脚本内含词表，自身豁免
  const text: string = readFileSync(join(ROOT, rel), 'utf8');
  for (const [idx, line] of text.split('\n').entries()) {
    for (const { label, re } of NEUTRAL_PATTERNS) {
      if (re.test(line))
        ok(false, `[D] ${rel}:${idx + 1} 中立性 · ${label}`, line.trim().slice(0, 90));
    }
  }
}

// E. 缺陷总览（docs/README §6.1）双向一致性 —— F216 后新增：防「新批登记了却没进总览」与「标了空洞其实有记录」
{
  const readme = readFileSync(join(ROOT, 'docs/README.md'), 'utf8');
  const sec = readme.slice(readme.indexOf('### 6.1 缺陷总览'));
  const covered = new Set<number>();
  const holes = new Set<number>();
  const take = (cell: string): number[] => {
    const out: number[] = [];
    for (const m of cell.replaceAll('*', '').matchAll(/F(\d{1,3})(?:\s*[–—-]\s*F?(\d{1,3}))?/g)) {
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : a;
      for (let i = a; i <= b; i += 1) out.push(i);
    }
    return out;
  };
  for (const line of sec.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/[---]\|---/.test(line)) continue;
    const cells = line.split('|');
    const isHoleRow = line.includes('未登记');
    const nums = take(cells[1] ?? '');
    for (const n of nums) (isHoleRow ? holes : covered).add(n);
  }
  // 全仓实际出现的 F 号（含源码/脚本注释）
  const seen = new Map<number, string>();
  const REGISTRY_DOCS = new Set(['docs/README.md', 'docs/designs/README.md']);
  for (const rel of [...listDocs(), ...listSources()]) {
    if (REGISTRY_DOCS.has(rel)) continue; // 总览/规则文档自身只指路，不算「有记录」
    const text = readFileSync(join(ROOT, rel), 'utf8');
    for (const m of text.matchAll(/\bF(\d{1,3})\b/g))
      if (!seen.has(Number(m[1]))) seen.set(Number(m[1]), rel);
  }
  const unlisted = [...seen.keys()]
    .filter((n) => !covered.has(n) && !holes.has(n))
    .sort((a, b) => a - b);
  ok(
    unlisted.length === 0,
    `[E] 缺陷总览 §6.1 覆盖全部已出现的 F 号（${seen.size} 个）`,
    unlisted.length
      ? `未登记进总览：${unlisted.map((n) => `F${n}(${seen.get(n)})`).join(' · ')}`
      : '',
  );
  const wrongHoles = [...holes].filter((n) => seen.has(n)).sort((a, b) => a - b);
  ok(
    wrongHoles.length === 0,
    `[E] §6.1 标注的「未登记」空洞确为零命中（${holes.size} 个）`,
    wrongHoles.length ? `实际有记录：${wrongHoles.map((n) => `F${n}`).join(' · ')}` : '',
  );
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
if (bad.length) console.log('FAIL 明细：\n' + bad.map((b) => '  · ' + b).join('\n'));
process.exit(fail === 0 ? 0 : 1);
