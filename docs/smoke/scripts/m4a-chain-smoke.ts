// M4a 契约全链冒烟（可重放——M4a-marketplace T18 收编）
// 前置：dev db + server(:3000) + seed 资产（demo-rag-skill / demo-http-mcp——见
// docs/smoke/2026-09-09-m4a-t18.md §1）。运行：cd 仓库根 && bun docs/smoke/scripts/m4a-chain-smoke.ts
// 断言：匿名面全链 200 + §5.2 形状 + from=to 语义 + download bundle + stats/labels。
// M4-pre（S2）：坐标由 `@smoke-ns/<slug>` 扁平化为全局唯一裸 `<slug>`（脚本同步）。
const base = 'http://localhost:3000/api';
const json = async (p: string) => {
  const r = await fetch(`${base}${p}`);
  return { status: r.status, body: await r.json().catch(() => null) };
};
const out: string[] = [];
const ok = (name: string, cond: boolean, extra = '') =>
  out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ` :: ${extra}` : ''}`);

const list = await json('/assets?limit=20');
const slugs = (list.body?.items ?? []).map((i: { slug: string }) => i.slug);
ok('列表含 demo-rag-skill', slugs.includes('demo-rag-skill'));
ok('列表含 demo-http-mcp', slugs.includes('demo-http-mcp'));

const detail = await json('/assets/demo-rag-skill');
const d = detail.body;
// M4-pre S3：可见性已删 —— 断言改为「详情 200 + ACTIVE 且响应无 visibility 字段」
ok(
  '详情 200 + ACTIVE（S3：无 visibility 字段）',
  detail.status === 200 && d.status === 'ACTIVE' && d.visibility === undefined,
);
ok('详情 latestVersion 1.1.0', d.latestVersion === '1.1.0');
ok('详情 latestName 投影', d.latestName === 'LangGraph RAG 检索技能');
ok('详情 downloadCount ≥1284（下载自增）', d.downloadCount >= 1284);
ok('详情 owner 匿名可见', typeof d.ownerId === 'string' && d.ownerId.startsWith('usr_'));

const vl = await json('/assets/demo-rag-skill/versions');
ok('版本列表 total 2', vl.status === 200 && vl.body.total === 2);
ok(
  '版本降序 1.1.0 在前',
  vl.body.items[0]?.version === '1.1.0' && vl.body.items[1]?.version === '1.0.0',
);
ok(
  '版本行形状',
  typeof vl.body.items[0]?.fileCount === 'number' &&
    typeof vl.body.items[0]?.totalSize === 'number' &&
    typeof vl.body.items[0]?.changelog === 'string',
);

const vd = await json('/assets/demo-rag-skill/versions/1.1.0');
ok('版本详情 files 3', vd.status === 200 && vd.body.files.length === 3);
ok(
  '版本详情清单',
  vd.body.files.some((f: { filePath: string }) => f.filePath === 'SKILL.md') &&
    vd.body.files.some((f: { filePath: string }) => f.filePath === 'scripts/search.mjs'),
);
ok(
  '版本详情 sha256 64 位',
  vd.body.files.every((f: { sha256: string }) => f.sha256.length === 64),
);

const fc = await fetch(`${base}/assets/demo-rag-skill/versions/1.1.0/files/SKILL.md`);
const text = await fc.text();
ok('文件内容 200 + v1.1 特性', fc.status === 200 && text.includes('模糊前缀匹配'));
ok('文件内容含 md 表格', text.includes('| topK |'));

const cmp = await json('/assets/demo-rag-skill/versions/compare?from=1.0.0&to=1.1.0');
const files = cmp.body?.files ?? [];
const kind = (k: string) => files.filter((f: { changeType: string }) => f.changeType === k);
ok(
  'compare 三型齐',
  kind('ADDED').length >= 1 && kind('MODIFIED').length >= 1 && kind('DELETED').length >= 1,
);
ok(
  'compare ADDED=search.mjs',
  kind('ADDED').some((f: { path: string }) => f.path === 'scripts/search.mjs'),
);
ok(
  'compare DELETED=guide.md',
  kind('DELETED').some((f: { path: string }) => f.path === 'reference/guide.md'),
);
const sk = kind('MODIFIED').find((f: { path: string }) => f.path === 'SKILL.md');
const allLines = (sk?.hunks ?? []).flatMap((h: { lines: unknown[] }) => h.lines) as Array<{
  type: string;
  content: string;
}>;
ok(
  'SKILL.md hunks 含 +/− 行',
  allLines.some((l) => l.type === 'ADD' && l.content.includes('searchByPrefix')) ||
    allLines.some((l) => l.type === 'DELETE'),
);
ok(
  'hunk 行号对形状',
  (sk?.hunks ?? []).every(
    (h: { lines: Array<{ oldLineNumber: number | null; newLineNumber: number | null }> }) =>
      h.lines.every(
        (l) =>
          (l.oldLineNumber === null) !== (l.newLineNumber === null) ||
          (l.oldLineNumber !== null && l.newLineNumber !== null),
      ),
  ),
);

const eq = await json('/assets/demo-rag-skill/versions/compare?from=1.1.0&to=1.1.0');
ok('from=to → 200 空 files', eq.status === 200 && eq.body.files.length === 0);

const dl = await fetch(`${base}/assets/demo-rag-skill/versions/1.1.0/download`, {
  redirect: 'manual',
});
const dlBuf = Buffer.from(await dl.arrayBuffer());
ok(
  'download 200 + zip 头',
  (dl.status === 200 || dl.status === 302) &&
    (dl.headers.get('content-type') ?? '').includes('zip'),
);
ok('bundle 字节非空', dlBuf.length > 0);

const mcp = await json('/assets/demo-http-mcp');
ok('mcp 详情 latestVersion 1.0.0', mcp.body.latestVersion === '1.0.0' && mcp.body.type === 'mcp');
const mcpFc = await fetch(`${base}/assets/demo-http-mcp/versions/1.0.0/files/README.md`);
ok('mcp README 内容', mcpFc.status === 200 && (await mcpFc.text()).includes('HTTP Echo MCP'));

const st = await json('/stats');
ok('stats typeCounts skill ≥3', (st.body.typeCounts?.skill ?? 0) >= 3);
ok('stats typeCounts mcp ≥1', (st.body.typeCounts?.mcp ?? 0) >= 1);
ok('stats totalAssets ≥4', (st.body.totalAssets ?? 0) >= 4);

const lb = await json('/labels');
ok('labels 200 数组', lb.status === 200 && Array.isArray(lb.body));

console.log(out.join('\n'));
const fails = out.filter((s) => s.startsWith('FAIL'));
console.log(fails.length === 0 ? 'CHAIN SMOKE PASS' : `CHAIN SMOKE FAIL (${fails.length})`);
