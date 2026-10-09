#!/usr/bin/env bun
/**
 * 已退休列名检查 —— `schema-column-check.ts`（M4c-2 **T7** · F295 处置「甲」）
 *
 * 背景（F295 · 2026-10-09）：T3 删 `user.status` 列后，**4 个 dogfood 种子脚本**仍读写该列
 * ⇒ 全量 dogfood 前置体检 `exit 2`（`42703: column "status" … does not exist`）。
 * 为何类型检查没兜住：① `docs/smoke/scripts` 不在 `apps/server/tsconfig.json` 的覆盖面内；
 * ② 4 处里 **3 处是 `db.$client.query()` 的裸字符串 SQL** ⇒ **类型检查原理上抓不到**。
 *
 * 本脚本 = 轻量**文本级回归守卫**（与 `doc-claims-check.ts` 同族）：扫「已退休列名」在
 * 表作用域 SQL 文本里的出现 ⇒ 红。**新增退休列时在 `RETIRED` 追加一行即可。**
 *
 * 扫描面：`apps/server/src/**`（含原生 SQL）· `docs/smoke/scripts/**` · `apps/server/drizzle/*.sql`
 * 误报控制：① 按**表名**限定（`update "user"` / `from "user"` 等锚点）② 跳过注释行
 *
 * 用法：`bun docs/smoke/scripts/schema-column-check.ts`
 * 退出码：0 = 全通过；1 = 有 FAIL
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** 已退休列（**新增一行 = 纳入守卫**）：表 · 列 · 何时退休 · 现真值 */
const RETIRED: Array<{ table: string; column: string; since: string; now: string }> = [
  {
    table: 'user',
    column: 'status',
    since: 'M4c-2 T3（迁移 `0016`）',
    now: '官方封禁三件套 `banned` / `ban_reason` / `ban_expires`',
  },
];

/**
 * 取「语句级片段」：模板串 + 单引号串 + （`.sql` 文件按 `;` 切）。
 * **必须按片段匹配**：曾用整文件文本匹配 ⇒ 跨语句误报（实测首跑 3 处假红）。
 */
function sqlSnippets(text: string, isSqlFile: boolean): string[] {
  if (isSqlFile)
    return text
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean);
  const out: string[] = [];
  for (const m of text.matchAll(/`([\s\S]{0,4000}?)`/g)) out.push(m[1]!);
  for (const m of text.matchAll(/'([^'\n]{0,600})'/g)) out.push(m[1]!);
  return out;
}

/** 扫描面（目录递归 + 后缀过滤） */
const SCAN: Array<{ dir: string; ext: string[] }> = [
  { dir: 'apps/server/src', ext: ['.ts'] },
  { dir: 'apps/server/drizzle', ext: ['.sql'] },
  { dir: 'docs/smoke/scripts', ext: ['.ts'] },
];

function walk(dir: string, ext: string[], out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(join(ROOT, dir));
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = `${dir}/${e}`;
    const abs = join(ROOT, rel);
    if (statSync(abs).isDirectory()) walk(rel, ext, out);
    else if (ext.some((x) => e.endsWith(x))) out.push(rel);
  }
  return out;
}

/** 表作用域锚点：`update "user"` / `from "user"` / `into "user"` / `table "user"`（含无引号写法） */
function tableScopePatterns(table: string): RegExp[] {
  const t = `"?${table}"?`;
  return [
    new RegExp(`update\\s+${t}\\b[\\s\\S]{0,500}?\\b{COL}\\b\\s*=`, 'i'),
    new RegExp(`from\\s+${t}\\b[\\s\\S]{0,400}?where[\\s\\S]{0,300}?\\b{COL}\\b`, 'i'),
    new RegExp(`select[\\s\\S]{0,300}?\\b{COL}\\b[\\s\\S]{0,120}?from\\s+${t}\\b`, 'i'),
  ];
}

/** 去注释行（`//` · `*` · `--`）：只对**行首**判定，避免误杀字符串里的内容 */
const dropCommentLines = (text: string): string =>
  text
    .split('\n')
    .filter((l) => {
      const t = l.trimStart();
      return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('--'));
    })
    .join('\n');

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  if (cond) {
    pass++;
    console.log(`PASS ${label}`);
  } else {
    fail++;
    console.log(`FAIL ${label}  ${detail}`);
  }
};

console.log(`=== 已退休列名检查（守卫 ${RETIRED.length} 条 · 扫描 ${SCAN.length} 个面）===\n`);

const files = SCAN.flatMap((s) => walk(s.dir, s.ext));
ok(files.length > 0, `[0] 扫描面非空（命中 ${files.length} 个文件）`);

for (const r of RETIRED) {
  const hits: string[] = [];
  for (const f of files) {
    // 排除守卫脚本自身（其 docstring / 灵敏度样例**故意**含禁用模式）
    if (f.endsWith('schema-column-check.ts')) continue;
    const text = dropCommentLines(readFileSync(join(ROOT, f), 'utf8'));
    const snips = sqlSnippets(text, f.endsWith('.sql'));
    for (const p of tableScopePatterns(r.table)) {
      const re = new RegExp(
        p.source.replace('{COL}', r.column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        p.flags,
      );
      if (snips.some((sn) => re.test(sn))) hits.push(f);
    }
  }
  ok(
    hits.length === 0,
    `[1] 已退休列 \`${r.table}.${r.column}\` 无残留使用（自 ${r.since} · 现真值 = ${r.now}）`,
    hits.length ? `命中：${[...new Set(hits)].join(' · ')}` : '',
  );
}

/* 反向自检：守卫**确实能抓到**该模式（防「永远 PASS 的假门」）—— 用内联样例回读 */
{
  const sample =
    'await db.$client.query(`update "user"\n  set name = $1, status = \'ACTIVE\'\n where id = $2`);';
  const p = tableScopePatterns('user')[0]!.source.replace('{COL}', 'status');
  ok(new RegExp(p, 'i').test(sample), '[2] 守卫灵敏度自检（构造样例应命中）');
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
