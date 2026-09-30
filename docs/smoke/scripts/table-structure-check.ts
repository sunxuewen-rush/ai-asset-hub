#!/usr/bin/env bun
import { execFileSync } from 'node:child_process';
/**
 * 修订表结构完整性检查 —— table-structure-check.ts
 *
 * 背景：主 design **v1.58** 行（2026-09-20 · F96）已登记该审计缺口 ——「`doc-audit` 暂不覆盖
 * 修订表结构完整性（候选检查 = 行首单元格形态 + `|` 计数 + **版本序无空洞**）」。
 * 2026-09-28 负控实证（沙箱删除一行表行）：doc-audit / doc-claims / head-sink **三道门禁全绿**
 * ⇒ 该缺陷无闸；且历史已发生 3 例（`39d1b21` 主设计 27 行 + M4b-4 11 行 · `aef6b31` M4b-6 1 行）。
 * 2026-09-28（**F100-b 收口**）：全仓 18 份 ASC 表（161 行）统一重排为 DESC ⇒ 检查项 1 由
 * 「表向自定（以多数方向为准）」改为「**固定 DESC（最新在上）**」，ASC 表直接 FAIL。
 *
 * 检查项（5 类 · 见 §检查项）：
 *   1. **表向 = DESC（最新在上）**（仓级统一口径）+ 段内版本序**单调**（逐段判）
 *   2. 版本号**不重复**（同 `主.次+后缀` 唯一）
 *   3. 同主版号内**无空洞**（`v0.30 → v0.32` 型）—— 允许豁免册逐条带理由
 *   4. 若存在「**历史版本段说明**」条：其「最早一行 = `vX`」须与表首一致
 *   5. **表格行未闭合**（行首 `|` 起 ∧ 行尾无 `|`）⇒ FAIL —— F246 实证：这类行 = 内容落在行外
 *      （续文**游离表外**或**已丢失**），此前**五道门禁全看不见**；围栏代码块（``` / ~~~）内豁免
 *      （线框与示例里的半截表格行属正当用法）
 *
 * 用法：bun docs/smoke/scripts/table-structure-check.ts
 * 退出码：0 = 全绿（含 N/A 与豁免）；1 = 有 FAIL
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ROW = /^\|\s*\*{0,2}v(\d+)\.(\d+)([a-z]?)\*{0,2}\s*\|/;
const HEAD = /^#{1,4}\s/;
const WAIVERS = join(ROOT, 'docs/smoke/table-structure-waivers.json');

interface Waiver {
  file: string;
  kind: 'gap' | 'order' | 'dup';
  detail: string;
  reason: string;
}
function loadWaivers(): Waiver[] {
  try {
    return (JSON.parse(readFileSync(WAIVERS, 'utf8')) as { waivers: Waiver[] }).waivers ?? [];
  } catch {
    return [];
  }
}

const files = execFileSync('git', ['ls-files', 'docs'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f.endsWith('.md'));

const waivers = loadWaivers();
let pass = 0;
const fails: string[] = [];
const skips: string[] = [];

for (const file of files) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  const start = lines.findIndex((l) => HEAD.test(l) && l.includes('修订记录'));
  if (start < 0) continue;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  // 段 = 以表头行切分（同节可含多表）
  const segs: { idx: number; key: [number, number, string] }[][] = [];
  let seg: { idx: number; key: [number, number, string] }[] = [];
  for (let i = start; i < end; i += 1) {
    if (/^\|\s*版本\s*\|/.test(lines[i])) {
      if (seg.length) segs.push(seg);
      seg = [];
      continue;
    }
    const m = ROW.exec(lines[i]);
    if (m) seg.push({ idx: i, key: [Number(m[1]), Number(m[2]), m[3] ?? ''] });
  }
  if (seg.length) segs.push(seg);
  const all = segs.flat();
  if (!all.length) {
    skips.push(`${file} 修订记录节无表行`);
    continue;
  }
  const cmp = (a: [number, number, string], b: [number, number, string]) =>
    a[0] !== b[0]
      ? a[0] - b[0]
      : a[1] !== b[1]
        ? a[1] - b[1]
        : a[2] < b[2]
          ? -1
          : a[2] > b[2]
            ? 1
            : 0;
  // 1) 表向统一（DESC）+ 段内单调 —— **逐段**判定（跨表头不算；同节多表各自判）
  //    2026-09-28（F100-b 收口）起仓级口径 = **DESC（最新在上）**：旧「表向自定（以多数方向为准）」
  //    逻辑移除 —— 整段 ASC 直接 FAIL（不逐行报噪声）；混合序仍逐行报。
  for (const s of segs) {
    let up = 0;
    let down = 0;
    for (let i = 1; i < s.length; i += 1) {
      if (cmp(s[i].key, s[i - 1].key) > 0) up += 1;
      else if (cmp(s[i].key, s[i - 1].key) < 0) down += 1;
    }
    if (up > down) {
      const w = waivers.find((x) => x.file === file && x.kind === 'order' && x.detail === 'ASC');
      if (w) skips.push(`${file} · 表向豁免（ASC）：${w.reason}`);
      else
        fails.push(
          `${file}:${s[0].idx + 1} 表向为 ASC ⇒ 仓级口径 = DESC（最新在上）` +
            `（段首 v${s[0].key.join('.')} → 段尾 v${s[s.length - 1].key.join('.')}）`,
        );
      continue;
    }
    for (let i = 1; i < s.length; i += 1) {
      if (cmp(s[i].key, s[i - 1].key) > 0) {
        const detail = `v${s[i - 1].key.join('.')} → v${s[i].key.join('.')}`;
        const w = waivers.find((x) => x.file === file && x.kind === 'order' && x.detail === detail);
        if (w) skips.push(`${file} · 逆序豁免 ${detail}：${w.reason}`);
        else fails.push(`${file}:${s[i].idx + 1} 版本序逆序（DESC 表）${detail}`);
      }
    }
  }
  // 2) 重复
  const seen = new Set<string>();
  for (const r of all) {
    const id = r.key.join('.');
    if (seen.has(id)) {
      const w = waivers.find((x) => x.file === file && x.kind === 'dup' && x.detail === id);
      if (w) skips.push(`${file} · 重复豁免 v${id}：${w.reason}`);
      else fails.push(`${file}:${r.idx + 1} 版本号重复 v${id}`);
    }
    seen.add(id);
  }
  // 3) 同主版号内空洞
  const majors = [...new Set(all.map((r) => r.key[0]))];
  for (const maj of majors) {
    const minors = [...new Set(all.filter((r) => r.key[0] === maj).map((r) => r.key[1]))].sort(
      (a, b) => a - b,
    );
    for (let i = 1; i < minors.length; i += 1) {
      if (minors[i] - minors[i - 1] > 1) {
        for (let k = minors[i - 1] + 1; k < minors[i]; k += 1) {
          const detail = `v${maj}.${k}`;
          const w = waivers.find((x) => x.file === file && x.kind === 'gap' && x.detail === detail);
          if (w) skips.push(`${file} · 空洞豁免 ${detail}：${w.reason}`);
          else
            fails.push(
              `${file} 同主版号内空洞：v${maj}.${minors[i - 1]} → v${maj}.${minors[i]}（缺 ${detail}）`,
            );
        }
      }
    }
  }
  // 4) 说明条「最早一行」与表首一致
  const note = lines.find((l) => l.startsWith('> **历史版本段说明'));
  if (note) {
    const m = /最早一行 = `v([\d.]+)`/.exec(note);
    const first = [...all].sort((a, b) => cmp(a.key, b.key))[0].key;
    const actual = `${first[0]}.${first[1]}`;
    if (!m) fails.push(`${file} 说明条缺「最早一行 = vX」字段`);
    else if (m[1] !== actual)
      fails.push(`${file} 说明条「最早一行 = v${m[1]}」与表首 v${actual} 不一致`);
  }
  pass += 1;
}

// 5) 表格行未闭合（F246 · 2026-09-30 新增）—— 行首 `|` 起 ∧ 行尾无 `|`
//    实证（2026-09-16 M4b-2 轮事故）：这类行 = 内容落在行外（续文游离表外 / 已丢失），
//    且 doc-audit / doc-claims / head-sink / file-ref-closure 与本脚本旧 4 项**全看不见** ⇒ 单立判据。
for (const file of files) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  let fence = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const t = lines[i].replace(/\s+$/, '');
    if (/^\s*\|/.test(t) && !t.endsWith('|'))
      fails.push(
        `${file}:${i + 1} 表格行未闭合（行首 \`|\` 起 ∧ 行尾无 \`|\` ⇒ 内容落在行外：续文游离或已丢失）`,
      );
  }
}

for (const f of fails) console.log(`FAIL ${f}`);
for (const s of skips) console.log(`N/A  ${s}`);
console.log(
  `\n=== 结果：${pass} PASS / ${fails.length} FAIL（检查文档 ${files.length} 份 · 豁免 ${waivers.length} 条）===`,
);
if (fails.length) {
  console.log(
    '说明：修订表须「表向 DESC（最新在上）· 段内单调 · 无重复版号 · 同主版号无空洞」；空洞如属史实（编号未使用）须入豁免册并写明理由。',
  );
}
process.exit(fails.length === 0 ? 0 : 1);
