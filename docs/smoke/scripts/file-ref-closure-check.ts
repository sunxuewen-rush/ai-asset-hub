/**
 * 第五道文档门禁：**件面 ↔ 引用闭合**（`file-ref-closure-check` · M4b-7 design §9.2 / 件 **N10**）。
 *
 * 管什么维（一句话）：**「批 design 声明的件面」与「它在全文中引用的路径」必须闭合** ——
 * 拦「改了口径忘了加件」这类残留（M4b-7 首稿的 **F7** 即此类：件面漏 5 件，靠人肉发现）。
 *
 * 两条断言：
 *  ① **件路径分档断言**：§3.1（`N` 前缀 = 新建件）允许不存在；§3.2（`M` 前缀 = 改造件）**必须已存在**
 *     —— 改造件若不存在 ⇒ 说明「件面写错了」或「实现漏了」。
 *  ② **引用闭合**：批 design 全文出现的 `apps/**` · `docs/**` · `.env.example` 路径集合
 *     必须 ⊆ 件面 ∪ 豁免集；未归属路径 ⇒ FAIL（新增了引用却忘了登记件）。
 *
 * 豁免集（**实测校准** —— 见 M4b-7 design §9.8 **F234**）：
 *   · 批 design 自身路径
 *   · §9.6 同步点文档（主 design / `docs/00`）与 `AGENTS.md`（登记项）
 *   · `docs/plans/**`（历史批 plan，**只作史实引用**，不回改）
 *   · `docs/smoke/**` 证据文件（每批收尾交付，非件面；`2026-09-28-m4b7-publish.md` 等）
 *   · `.env` / `.env.example` 类（配置样例，非件）
 *   · `node_modules` / `dist` 等产物路径
 *
 * 用法（仓库根）：
 *   bun docs/smoke/scripts/file-ref-closure-check.ts
 *   bun docs/smoke/scripts/file-ref-closure-check.ts docs/designs/<别的批 design>.md
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

/** 默认目标 = 本批（M4b-7）design；可传参复用到别的批 */
const DESIGN = process.argv[2] ?? 'docs/designs/2026-09-28-m4b7-publish-design.md';

/** 门禁自检：目标必须存在（否则「静默通过」= 最危险的假绿） */
if (!existsSync(DESIGN)) {
  console.error(`FAIL [0] 目标 design 不存在：${DESIGN}`);
  process.exit(1);
}
const md = readFileSync(DESIGN, 'utf8');

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? `  ${extra}` : ''}`);
};

/** 表格行里的第一个反引号路径 */
function rowPath(line: string): string | null {
  const m = /^\|\s*(N\d+|M\d+)\s*\|\s*`([^`]+)`/.exec(line);
  return m?.[2] ?? null;
}
function sectionPaths(heading: string): Array<{ id: string; path: string }> {
  const start = md.indexOf(heading);
  if (start < 0) return [];
  const rest = md.slice(start);
  const end = rest.indexOf('\n### ', 4);
  const body = end < 0 ? rest : rest.slice(0, end);
  const out: Array<{ id: string; path: string }> = [];
  for (const line of body.split('\n')) {
    const id = /^\|\s*([NM]\d+)\s*\|/.exec(line)?.[1];
    const p = rowPath(line);
    if (id && p) out.push({ id, path: p });
  }
  return out;
}

/* ── ① 件路径分档断言 ── */
const newItems = sectionPaths('### 3.1 ');
const modItems = sectionPaths('### 3.2 ');
ok(
  '①a 件表可解析（新建件 >0 且改造件 >0）',
  newItems.length > 0 && modItems.length > 0,
  `新建 ${newItems.length} / 改造 ${modItems.length}`,
);
for (const it of modItems) {
  // 改造件**必须已存在**（本仓件均为「已在仓」或「同批新建后即存在」）
  ok(`①b 改造件已存在 ${it.id} ${it.path}`, existsSync(it.path));
}
// 新建件：允许不存在（实现期），但**已存在者必须是文件**（防写错成目录名）
for (const it of newItems) {
  if (!existsSync(it.path)) continue;
  const isFile = existsSync(it.path) && !it.path.endsWith('/');
  ok(`①c 新建件同形 ${it.id} ${it.path}`, isFile);
}

/* ── ② 引用闭合 ── */
const declared = new Set<string>([
  ...newItems.map((x) => x.path),
  ...modItems.map((x) => x.path),
  DESIGN,
  'AGENTS.md',
]);
const EXEMPT_PATTERNS: RegExp[] = [
  /^docs\/plans\//, // 历史批 plan（史实引用）
  /^docs\/smoke\/[^/]+\.md$/, // 证据文件（每批收尾交付）
  /^docs\/smoke\/[^/]+\.png$/, // 截图
  /^apps\/server\/\.env$/, // 本地配置（gitignored）
  /^\.env\.example$/,
  /^node_modules\//,
  /\/dist\//,
];
const EXEMPT_EXACT = new Set<string>([
  'docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md', // §9.6 同步点（主 design）
  'docs/00-product-direction.md', // §9.6 同步点
  'docs/README.md', // F 号总览（§9.7 ⑧ 收尾回填项）
  'apps/server/.env.example', // 设计里的**否定断言**（「无该文件」）—— 非件
]);
/**
 * **证据引用白名单**（首跑实测校准 · F234）：设计正文用这些路径作「现状真值」依据，
 * 本批**只读不改** ⇒ 不是件面。**人工评审维护** —— 新增未列入者仍会 FAIL（这正是本门禁的用途）。
 */
const EVIDENCE_ALLOWLIST = new Set<string>([
  'apps/web/src/api/reviews.ts', // 撤回封装（M4b-3 已落仓，复用）
  'apps/web/src/auth/next.ts', // 回跳白名单（零改动，仅验证）
  'apps/web/src/components/console/PageHeader.tsx', // 页头（既有件，复用）
  'docs/designs/README.md', // 设计层规则（证据）
  // 原型物料（设计明确「不上仓」）
  'apps/web/proto.html',
  'apps/web/src/proto/main.tsx',
  'apps/web/src/proto/PublishProto.tsx',
]);
/** `docs/NN` 简写 ⇒ 归一化到**唯一** `docs/NN-*.md`（件面里的真路径） */
function normalize(token: string): string {
  const m = /^docs\/(\d{2})$/.exec(token);
  if (!m) return token;
  const hits = readdirSync('docs').filter((f) => f.startsWith(`${m[1]}-`) && f.endsWith('.md'));
  return hits.length === 1 ? `docs/${hits[0]}` : token;
}
/** 目录泛称（`apps/web/src` · `apps/web/src/lib/` 等）⇒ 非件，天然豁免 */
const isDirLike = (t: string): boolean => t.endsWith('/') || !/\.[a-z0-9]+$/i.test(t);

/** 全文扫描：反引号内的路径 token */
const tokens = new Set<string>();
for (const m of md.matchAll(/`((?:apps|docs)\/[A-Za-z0-9._\-/]+|\.env\.example)`/g))
  tokens.add(m[1]);
const orphans: string[] = [];
for (const raw of tokens) {
  const t = normalize(raw);
  if (declared.has(t)) continue;
  if (EXEMPT_EXACT.has(t) || EVIDENCE_ALLOWLIST.has(t)) continue;
  if (isDirLike(t)) continue;
  if (EXEMPT_PATTERNS.some((re) => re.test(t))) continue;
  orphans.push(`${raw}${t === raw ? '' : ` → ${t}`}`);
}
ok(
  `② 引用闭合（扫到 ${tokens.size} 个路径 token · 未归属 ${orphans.length}）`,
  orphans.length === 0,
  orphans.length > 0 ? `\n      ${orphans.join('\n      ')}` : '',
);

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
