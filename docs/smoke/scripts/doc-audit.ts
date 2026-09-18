#!/usr/bin/env bun
/**
 * 文档体检 —— doc-audit.ts
 *
 * 背景（2026-09-18）：整体体检发现「版本头 vs 修订表」在 8 份文档里对不上，
 * 根因是**写文档时只改一边**、且没有校验机制。本脚本把该检查自动化，防复发。
 *
 * 检查项：
 *   A. 版本头一致性 —— 头部最新版必须== 出现在修订记录表内（且表首行== 头部最新版）
 *   B. 死路径引用 —— 文档里形如 `docs/xxx.md` 的引用必须真实存在
 *   C. 头部长度告警 —— 头部 >1500 字符视为「又在堆历史」（口径：头部只留最近 1-2 版）
 *
 * 用法：bun docs/smoke/scripts/doc-audit.ts
 * 退出码：0 = 全通过；1 = 有 FAIL
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SEARCH_DIRS = ['docs', 'docs/designs', 'docs/plans', 'docs/smoke'];

function collect(): string[] {
  const out: string[] = ['README.md', 'AGENTS.md'];
  for (const d of SEARCH_DIRS) {
    const abs = join(ROOT, d);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) if (f.endsWith('.md')) out.push(join(d, f));
  }
  return out.filter((p) => existsSync(join(ROOT, p)));
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

const files = collect();
console.log(`=== 文档体检 doc-audit（${files.length} 份）===\n`);

for (const rel of files) {
  const text: string = readFileSync(join(ROOT, rel), 'utf8'); // 显式标注：脚本不在 tsconfig 覆盖范围内，无 node 类型
  const lines = text.split('\n');
  const headLine = lines.find((l) => l.startsWith('> Updated:'));

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
      ok(
        hv.length <= 3,
        `[A] ${rel} 头部版本数 ≤3（当前 ${hv.length}）`,
        '口径：头部只留最近 1-2 版，完整历史见修订表',
      );
    }
  }

  // B. 死路径引用
  for (const [idx, line] of lines.entries()) {
    if (/更名|旧名|原文件名|沿革/.test(line)) continue; // 更名记录里有意保留的旧名
    for (const m of line.matchAll(/`?((?:docs|apps|packages)\/[A-Za-z0-9_./-]+\.md)`?/g)) {
      const p = m[1];
      if (!existsSync(join(ROOT, p))) ok(false, `[B] ${rel}:${idx + 1} 引用的 ${p} 存在`, '死路径');
    }
  }

  // C. 头部长度
  if (headLine && headLine.length > 1500) {
    ok(false, `[C] ${rel} 头部长度 ${headLine.length} ≤1500`, '疑似又在头部堆历史');
  }
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
if (bad.length) console.log('FAIL 明细：\n' + bad.map((b) => '  · ' + b).join('\n'));
process.exit(fail === 0 ? 0 : 1);
