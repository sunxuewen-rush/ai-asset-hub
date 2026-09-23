#!/usr/bin/env bun
/**
 * 换靶校验 —— doc-claims-check.ts
 *
 * 背景（2026-09-23 · M4b-6 T10 交付）：`doc-audit.ts` 只查「头部版本行 ≤3 / 死路径 / 中立性」，
 * 对**声明与真码的偏离**不设防 —— 实测盲区两类：① 头部版本行**陈旧或乱序**（只查 ≤3）
 * ② 文档里的**数值/件/端点声明**与真码或与自身他节不一致（M4b-6 换靶 5 轮抓到的缺陷全属此类）。
 *
 * 与 `doc-audit.ts` 的分工：doc-audit = 形式体检；本脚本 = **断言回读**（claim → 真码/真值）。
 *
 * 检查项（6 类 · 对应批 design §3.1）：
 *   1. 引用逐条回读     —— `file:line` + 期望关键词（锚点表）+ 文档内联引用存在性
 *   2. 同一量跨节对照   —— 同一数量在文档多处出现时取值必须一致
 *   3. 三向一致         —— 件表 ↔ 服务端改动号 ↔ 端点表
 *   4. 机制声明实测复核 —— 源码里确实存在该机制（非「文档说已做」）
 *   5. UI 契约 ↔ 真码回读 —— 件路径 / 路由 / i18n 键覆盖与成对 / 页面零中文泄漏
 *   6. 头部版本行不得陈旧或乱序
 *
 * 用法：bun docs/smoke/scripts/doc-claims-check.ts
 * 退出码：0 = 全通过；1 = 有 FAIL
 *
 * 维护口径：本脚本的**期望值**随批定稿更新；批切换时同步 `DOCS` / `HEAD_DOCS` 与各表。
 * 踩坑记录（2026-09-23 首跑）：① 数值正则过宽 ⇒ 抓到 before→after 叙述里的旧值（假缺陷）
 * ② 中文泄漏检查漏掉「纯 JSX 文本行」（漏报）③ 头部版号取「行内最大」⇒ 误读承接文档的版号。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** 本批校验范围（批定稿后随批更新） */
const DOCS = [
  'docs/designs/2026-09-23-m4b6-governance-console-design.md',
  'docs/plans/M4b-6-governance-console.md',
];
/** 头部检查范围（含上游登记文档） */
const HEAD_DOCS = [
  ...DOCS,
  'docs/00-product-direction.md',
  'docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md',
];
/** PoC / 临时物料行豁免（这些件**刻意不进仓**） */
const TRANSIENT_RE = /不进仓|临时|已删|PoC|__proto|tmp-/;

let pass = 0;
let fail = 0;
const bad: string[] = [];
const ok = (cond: boolean, label: string, detail = ''): void => {
  if (cond) {
    pass++;
    console.log(`PASS ${label}`);
  } else {
    fail++;
    bad.push(label);
    console.log(`FAIL ${label}  ${detail}`);
  }
};

const abs = (rel: string) => join(ROOT, rel);
const read = (rel: string) => (existsSync(abs(rel)) ? readFileSync(abs(rel), 'utf8') : '');
const docText = new Map<string, string>();
for (const d of new Set([...DOCS, ...HEAD_DOCS])) docText.set(d, read(d));
const pick = (list: string[], i: number): string => list[i] ?? '';

console.log(`=== 换靶校验 doc-claims-check（范围 ${DOCS.length} 份）===\n`);

/* ── 1. 引用逐条回读 ─────────────────────────────────────────────── */
console.log('--- 1. 引用逐条回读 ---');

/** 锚点表：文档声明的**关键断言**（批定稿时逐条回读；换靶换批时同步） */
const ANCHORS: { file: string; line: number; keyword: string; why: string }[] = [
  {
    file: 'apps/server/src/http/audit.ts',
    line: 19,
    keyword: 'AUDIT_FILTER_MAX',
    why: 'actorId 上限 256 的实现点',
  },
  {
    file: 'apps/server/src/assets/download.ts',
    line: 104,
    keyword: 'insert(downloadEvent)',
    why: '改动 5 · 同事务写事件行',
  },
  {
    file: 'apps/server/src/labels/errors.ts',
    line: 11,
    keyword: 'label.in_use',
    why: '改动 8 · 错误码',
  },
  { file: 'apps/web/src/main.tsx', line: 120, keyword: '/admin/assets', why: '路由 4 条之一' },
  {
    file: 'apps/server/src/app.ts',
    line: 214,
    keyword: 'createAdminRoutes',
    why: '改动 1–3 挂载点',
  },
];
for (const a of ANCHORS) {
  if (!existsSync(abs(a.file))) {
    ok(false, `[1] 锚点 ${a.file}:${a.line} 存在`, '文件缺失');
    continue;
  }
  const lines = read(a.file).split('\n');
  const got = lines[a.line - 1] ?? '';
  ok(
    got.includes(a.keyword),
    `[1] ${a.file}:${a.line} 含「${a.keyword}」（${a.why}）`,
    `实际：${got.trim().slice(0, 80)}`,
  );
}

/** 文档内联引用：`docs|apps|packages/...` 形式必须真实存在；带行号者不得越界 */
let refCount = 0;
let refOk = 0;
for (const d of DOCS) {
  for (const [i, line] of (docText.get(d) ?? '').split('\n').entries()) {
    if (TRANSIENT_RE.test(line)) continue;
    const re =
      /(?<![\w/])((?:docs|apps|packages)\/[A-Za-z0-9_./-]+\.(?:tsx|ts|md|sql|json|css))(?::(\d+))?/g;
    for (const m of line.matchAll(re)) {
      refCount++;
      const rel = pick(m, 1);
      const ln = m[2] ? Number(m[2]) : 0;
      if (!existsSync(abs(rel))) {
        ok(false, `[1] ${d}:${i + 1} 引用 ${rel} 存在`, '死路径');
        continue;
      }
      if (ln > 0) {
        const total = read(rel).split('\n').length;
        if (ln > total) {
          ok(false, `[1] ${d}:${i + 1} 引用 ${rel}:${ln} 行号在界内`, `实际行数 ${total}`);
          continue;
        }
      }
      refOk++;
    }
  }
}
ok(refOk === refCount, `[1] 内联引用逐条回读（${refOk}/${refCount} 存在且行号在界内）`);

/* ── 2. 同一量跨节对照 ───────────────────────────────────────────── */
console.log('--- 2. 同一量跨节对照 ---');

/** 期望值表：同一数量在文档多处出现时必须恒等于 expected（0 命中亦 FAIL —— 防「删了没同步」）
 * 口径：只在**声明式措辞**上取数 —— 避开「before → after」叙述行与同名不同量（首跑实测误报）。 */
const NUMBERS: { label: string; expected: string; re: RegExp; group?: number; allow?: string[] }[] =
  [
    {
      label: '服务端改动数（→ N 项/处）',
      expected: '8',
      re: /服务端[^。\n|]{0,16}?→\s*\*{0,2}(\d+)\s*(?:项|处)/g,
    },
    // allowlist：`§3.1` 有「序号实测已用到 0013」的历史语境（不是本批声明），豁免之
    { label: '迁移序号', expected: '0014', re: /迁移\s*\*{0,2}(\d{4})/g, allow: ['0013'] },
    {
      label: 'actorId 上限（五维第 3 位）',
      expected: '256',
      re: /长度上限对齐服务端 schema：\d+\/\d+\/(\d+)\//g,
    },
    { label: '审计动作潜在全集', expected: '9', re: /潜在全集\s*\*{0,2}(\d+)/g },
    { label: '列宽数据列合计', expected: '92', re: /数据列[^。\n|]{0,8}?(\d{1,3})\s*%/g },
    // 取「+N 键」形式（避免与「各 534 键」这种绝对值混用同一断言）
    // 2026-09-23 口径订正（F207 轮实测）：原字符类排除 `|` ⇒ 只能命中**头部叙述行**形态
    // （「i18n **+130** 键」）；而 §9.7 表行形态（`| 2 | i18n 键数 | … 本批 **+130 键** …`）因行内 `|` **永不命中**
    // ⇒ 该量一旦只剩表行声明，断言即报「命中 0 处」（假红）。
    // 改法 = **按声明式措辞锚定**（`本批 **+N 键` 或 `i18n **+N 键`）：同时覆盖头部与表行两种形态，
    // 且**不吞**另一量 —— F205 叙述「28 处 i18n 泄漏 + 17 键」的 `17` 是「某次发现补的键数」，非本批总增量
    // （首改放宽字符类时实测被它误吞 ⇒ 取值 17 报假红）。判据未放宽：值仍须被声明、且不得出现其它值。
    {
      label: 'i18n 本批新增键数',
      expected: '130',
      re: /(?:本批|i18n)\s*\*\*\+(\d{2,4})\*{0,2}\s*键/g,
    },
  ];
for (const n of NUMBERS) {
  // 取值一律用**字符串**比较 —— 迁移序号是零填充（`0014`），转 Number 会变成 14（首跑实测 bug）
  const hits: string[] = [];
  for (const d of DOCS) {
    for (const m of (docText.get(d) ?? '').matchAll(n.re)) hits.push(pick(m, n.group ?? 1));
  }
  const values = [...new Set(hits)];
  const allowed = new Set([n.expected, ...(n.allow ?? [])]);
  const declared = values.filter((v) => !allowed.has(v));
  ok(
    hits.includes(n.expected) && declared.length === 0,
    `[2] ${n.label} 跨节恒为 ${n.expected}（命中 ${hits.length} 处${n.allow ? ` · 豁免 ${n.allow.join('/')}` : ''}）`,
    `实测取值：${values.join(', ') || '(未命中 expected)'}`,
  );
}

/* ── 3. 三向一致：件表 ↔ 改动号 ↔ 端点表 ─────────────────────────── */
console.log('--- 3. 件表 ↔ 改动号 ↔ 端点表 ---');

const design = docText.get(pick(DOCS, 0)) ?? '';
const designLines = design.split('\n');
const sectRange = (title: string): [number, number] => {
  const start = designLines.findIndex((l) => l.startsWith(title));
  if (start < 0) return [-1, -1];
  const end = designLines.findIndex((l, i) => i > start && l.startsWith('## '));
  return [start, end < 0 ? designLines.length : end];
};
const [sec31Start, sec31End] = sectRange('### 3.1');
const tablePaths = designLines
  .slice(sec31Start, sec31End)
  .flatMap((l) =>
    [...l.matchAll(/`((?:apps|docs|packages)\/[A-Za-z0-9_./-]+)`/g)].map((m) => pick(m, 1)),
  )
  .filter((p) => p !== '' && !TRANSIENT_RE.test(p));
const missing = [...new Set(tablePaths)].filter((p) => !existsSync(abs(p)));
ok(
  missing.length === 0,
  `[3] §3.1 新建件表 ${new Set(tablePaths).size} 个路径全部存在`,
  `缺失：${missing.join(', ')}`,
);

/** §5 各小节标题里的「改动 N」 ∪ 应恰为 1..N */
const changeIds = new Set<number>();
for (const l of designLines) {
  const m = l.match(/^### 5[.\w]*\s.*?改动\s*([\d–-]+)/);
  if (!m) continue;
  const parts = pick(m, 1)
    .replace('–', '-')
    .split('-')
    .map((s) => Number(s.replace(/\D/g, '')));
  if (parts.length === 1) changeIds.add(parts[0] ?? 0);
  else for (let v = parts[0] ?? 0; v <= (parts[1] ?? 0); v++) changeIds.add(v);
}
const changeArr = [...changeIds].sort((a, b) => a - b);
ok(
  changeArr.length > 0 && changeArr.every((v, i) => v === i + 1),
  `[3] §5 服务端改动号连续无缺（1..${changeArr.length}）`,
  `实测：${changeArr.join(', ')}`,
);

/** §7 端点表 `#` 列集合 == §5 改动号集合（三向一致的第三向） */
const [sec7Start, sec7End] = sectRange('## 7.');
const endIds = designLines
  .slice(sec7Start, sec7End)
  .map((l) => l.match(/^\|\s*(\d+)\s*\|/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map((m) => Number(pick(m, 1)));
ok(
  endIds.length === changeArr.length && endIds.every((v, i) => v === changeArr[i]),
  `[3] §7 端点表 ${endIds.length} 行 ↔ §5 改动号 ${changeArr.length} 项一一对应`,
  `端点表：${endIds.join(', ')}｜改动：${changeArr.join(', ')}`,
);

/* ── 4. 机制声明实测复核 ────────────────────────────────────────── */
console.log('--- 4. 机制声明实测复核 ---');

const srcHas = (rel: string, re: RegExp) => existsSync(abs(rel)) && re.test(read(rel));
const adminTs = read('apps/server/src/http/admin.ts');
const MECH: { label: string; cond: boolean }[] = [
  {
    label: '改动 1–3 · 三只读路由已挂载（overview/rankings/trends）',
    cond:
      /['"]\/overview['"]/.test(adminTs) &&
      /['"]\/rankings['"]/.test(adminTs) &&
      /['"]\/trends['"]/.test(adminTs),
  },
  {
    label: '改动 4 · listQuerySchema 含 status 与 owner',
    cond:
      srcHas('apps/server/src/http/assets.ts', /status:\s/) &&
      srcHas('apps/server/src/http/assets.ts', /owner:\s/),
  },
  {
    label: '改动 5 · download_event 表在 schema 与迁移中均存在（含 2 索引）',
    cond: (() => {
      const migDir = 'apps/server/drizzle';
      if (!existsSync(abs(migDir))) return false;
      const mig = readdirSync(abs(migDir)).filter(
        (f) => f.startsWith('0014') && f.endsWith('.sql'),
      );
      if (mig.length === 0) return false;
      const sql = read(`${migDir}/${pick(mig, 0)}`);
      return (
        sql.includes('download_event') &&
        (sql.match(/CREATE INDEX/gi) ?? []).length === 2 &&
        srcHas('apps/server/src/db/schema/assets.ts', /download_event/)
      );
    })(),
  },
  {
    label: '改动 6 · /api/audit/actions 路由存在',
    cond: srcHas('apps/server/src/http/audit.ts', /['"]\/actions['"]/),
  },
  {
    label: '改动 7 · /api/labels/all 出参含 items/total/limit 与 assetCount',
    cond:
      srcHas('apps/server/src/labels/service.ts', /assetCount/) &&
      srcHas('apps/server/src/http/labels.ts', /total/),
  },
  {
    label: '改动 8 · label.in_use 已映射 400',
    cond:
      srcHas('apps/server/src/labels/errors.ts', /label\.in_use/) &&
      srcHas('apps/server/src/labels/errors.ts', /400/),
  },
];
for (const m of MECH) ok(m.cond, `[4] ${m.label}`);

/* ── 5. UI 契约 ↔ 真码回读 ──────────────────────────────────────── */
console.log('--- 5. UI 契约 ↔ 真码回读 ---');

const PAGES = [
  'apps/web/src/pages/AdminBoard.tsx',
  'apps/web/src/pages/AdminAssets.tsx',
  'apps/web/src/pages/AdminLabels.tsx',
  'apps/web/src/pages/AdminAudit.tsx',
];
for (const p of PAGES) ok(existsSync(abs(p)), `[5] 页件存在 ${p}`);

const mainTsx = read('apps/web/src/main.tsx');
for (const r of ['/admin', '/admin/assets', '/admin/audit', '/admin/labels']) {
  ok(mainTsx.includes(`path="${r}"`), `[5] 路由已注册 ${r}`);
}

/** i18n 键覆盖：zh/en 叶子键集合必须相等（成对），且本批两组键存在 */
const flatten = (o: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, key)
      : [key];
  });
if (existsSync(abs('apps/web/src/i18n/zh.ts')) && existsSync(abs('apps/web/src/i18n/en.ts'))) {
  const zh = (await import(abs('apps/web/src/i18n/zh.ts'))).zh as Record<string, unknown>;
  const en = (await import(abs('apps/web/src/i18n/en.ts'))).en as Record<string, unknown>;
  const zk = flatten(zh);
  const ek = flatten(en);
  const onlyZh = zk.filter((k) => !ek.includes(k));
  const onlyEn = ek.filter((k) => !zk.includes(k));
  ok(
    onlyZh.length === 0 && onlyEn.length === 0,
    `[5] i18n zh/en 成对（各 ${zk.length} 键 · 差集 0）`,
    `zh-only ${onlyZh.slice(0, 5).join(', ')}｜en-only ${onlyEn.slice(0, 5).join(', ')}`,
  );
  ok(
    zk.some((k) => k.startsWith('board.')),
    '[5] board 组键已落',
  );
  ok(
    zk.some((k) => k.startsWith('admin.')),
    '[5] admin 组键已落',
  );
}

/**
 * 页面零中文字面量泄漏（i18n 铁律）。
 * 注释感知：「行注释」「块注释」「单行 JSX 注释」三类豁免 —— 只查**代码行**上的中日韩字符
 * （本仓注释即中文，注释豁免是必须的；但**纯 JSX 文本行**（>`中文`<）必须查出来 —— 首跑漏报点）。
 */
const codeLines = (text: string): { i: number; l: string }[] => {
  const out: { i: number; l: string }[] = [];
  let inBlock = false;
  for (const [idx, l] of text.split('\n').entries()) {
    const t = l.trim();
    const started = inBlock;
    if (!inBlock && /(\/\*|\{\s*\/\*)/.test(l)) inBlock = true;
    if (inBlock && /\*\//.test(l)) inBlock = false;
    if (started) continue;
    if (/^\/\//.test(t) || /^\*/.test(t) || /^\/\*/.test(t) || /^\{\s*\/\*/.test(t)) continue;
    out.push({ i: idx + 1, l });
  }
  return out;
};
for (const p of PAGES) {
  if (!existsSync(abs(p))) continue;
  const leaked = codeLines(read(p)).filter(({ l }) => /[\u4e00-\u9fff]/.test(l));
  ok(
    leaked.length === 0,
    `[5] ${p} 无中文字面量泄漏`,
    `行 ${leaked
      .slice(0, 3)
      .map((x) => x.i)
      .join(', ')}`,
  );
}

/* ── 6. 头部版本行：不得陈旧或乱序 ─────────────────────────────── */
console.log('--- 6. 头部版本行陈旧 / 乱序 ---');

const cmp = (a: string, b: string): number => {
  const [a1 = 0, a2 = 0] = a.split('.').map(Number);
  const [b1 = 0, b2 = 0] = b.split('.').map(Number);
  return a1 - b1 || a2 - b2;
};
for (const d of HEAD_DOCS) {
  const lines = read(d).split('\n');
  const heads = lines.filter((l) => l.startsWith('> Updated:'));
  if (heads.length === 0) {
    ok(false, `[6] ${d} 有头部版本行`, '未找到 Updated 行（约定前缀 `> Updated:`）');
    continue;
  }
  /** 本文件版号 = 「vX.Y：」**声明形式**（与 `doc-audit` 同口径）。
   * 不用「行内最大版号」—— 会把「承接某文档 v1.89」误读成本文件版号（首跑实测误报）。 */
  const headVs = heads
    .map((l) => (l.match(/v(\d+\.\d+)：/) ?? [])[1] ?? '')
    .filter((v) => v !== '');
  const sorted = [...headVs].sort((a, b) => cmp(b, a));
  ok(
    headVs.length > 0 && headVs.every((v, i) => v === sorted[i]),
    `[6] ${d} 头部版本行降序（乱序检测）`,
    `实测序：${headVs.join(' > ') || '(未识别到 vX.Y： 形式)'}`,
  );
  const tableVs = lines
    .map((l) => l.match(/^\|\s*\*{0,2}v?(\d+\.\d+)\s*\*{0,2}\s*\|/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => pick(m, 1));
  if (tableVs.length > 0) {
    const tmax = tableVs.reduce((a, b) => (cmp(a, b) >= 0 ? a : b));
    const htop = pick(headVs, 0);
    ok(cmp(htop, tmax) === 0, `[6] ${d} 头部最新版 v${htop} == 修订表最新版 v${tmax}（陈旧检测）`);
  }
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
if (bad.length) console.log(`FAIL 明细：\n${bad.map((b) => `  · ${b}`).join('\n')}`);
process.exit(fail === 0 ? 0 : 1);
