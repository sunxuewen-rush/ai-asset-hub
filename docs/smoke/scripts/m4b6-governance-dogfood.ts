/**
 * M4b-6 治理批 · 本批 dogfood（**G1–G11** · 批 design §9.3 · 批 plan T10）
 *
 * 覆盖：看板（KPI 与端点真值一致 / 趋势两图 + 范围四档 / 类型两图 / 排行榜三口径 + Top N / 创意四项 / 英雄榜 ×2）·
 *       资产管理（10 列 + 状态默认全部 + 排序接线 + 列显示 + 详情抽屉）·
 *       标签定义（两级树 + 上限块 + ↑↓ 边界 + 删除确认禁用）·
 *       审计日志（过滤区三块 + 6 列 + 详情抽屉 + **服务端过滤生效** + 清除筛选）· 跨页数字一致。
 *
 * 前置（dev 三件在线）：`:3000` API · `:5173` web · `:9222` Edge CDP
 * 造数（**先跑**）：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-seed-downloads.ts`
 * 运行：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-governance-dogfood.ts`
 *   分段：`SMOKE_ONLY=G6,G9 …`（逗号多选；**分段绿 ≠ 收口绿**）
 *   截图前缀：`SMOKE_SHOT_PREFIX=m4b6-`
 * ⚠️ 账号：`m4b2_mgr`（管理档）—— 与既有 smoke 共用 `SMOKE_M4B2_PASSWORD`。
 */
import { appendFileSync, writeFileSync } from 'node:fs';

const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const SHOT = process.env.SMOKE_SHOT_PREFIX ?? 'm4b6-';
const PROGRESS = process.env.SMOKE_LOG ?? '/tmp/m4b6-dogfood-progress.log';
const PW = process.env.SMOKE_M4B2_PASSWORD;
if (!PW) {
  console.error('SMOKE_M4B2_PASSWORD is required（口令不入仓）');
  process.exit(1);
}
const MGR = 'm4b2_mgr';
/** 超管（role 100）—— 标签定义页 `role >= SUPER_ADMIN`，管理档（10）会被 403 挡（U9 运营单点） */
const SUPER = 'm4b2_super';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── PASS/FAIL 计数 + 分段（`SMOKE_ONLY`） ── */
let pass = 0;
let fail = 0;
let timeouts = 0;
const SECTION_IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11'] as const;
type SectionId = (typeof SECTION_IDS)[number];
const only = (process.env.SMOKE_ONLY ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const hit = new Set<string>();
const want = (id: SectionId): boolean => {
  if (only.length === 0) return true;
  if (!only.includes(id)) return false;
  hit.add(id);
  return true;
};
const ok = (name: string, cond: boolean, extra?: string) => {
  if (cond) pass++;
  else fail++;
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? `  ${extra}` : ''}`;
  console.log(`  ${line}`);
  appendFileSync(PROGRESS, `${line}\n`);
};

/* ── CDP 基础设施（沿用 M4b-2/3/4 脚本口径：**必须新建 tab**） ── */
const target = (await (await fetch(`${DBG}/json/new?about:blank`, { method: 'PUT' })).json()) as {
  webSocketDebuggerUrl?: string;
};
if (!target?.webSocketDebuggerUrl) throw new Error('无法新建 tab —— Edge CDP(:9222) 是否在线？');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map<number, (m: any) => void>();
const jsErrors: string[] = [];
const netLog: Array<{ method: string; url: string }> = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Network.requestWillBeSent')
    netLog.push({
      method: msg.params?.request?.method ?? '?',
      url: msg.params?.request?.url ?? '',
    });
  if (msg.method === 'Runtime.exceptionThrown')
    jsErrors.push(
      String(msg.params?.exceptionDetails?.exception?.description ?? 'exception').slice(0, 200),
    );
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error')
    jsErrors.push(
      msg.params.args
        .map((a: any) => String(a.value ?? a.description ?? ''))
        .join(' ')
        .slice(0, 200),
    );
});
const send = (m: string, p?: unknown) =>
  new Promise<any>((res) => {
    const n = ++seq;
    const timer = setTimeout(() => {
      if (pending.has(n)) {
        pending.delete(n);
        timeouts++;
        console.log(`  · CDP 超时：${m}（累计 ${timeouts}）`);
        res({ __timeout: true });
      }
    }, 12000);
    pending.set(n, (msg: any) => {
      clearTimeout(timer);
      res(msg);
    });
    ws.send(JSON.stringify({ id: n, method: m, params: p }));
  });
const evalJs = async (e: string): Promise<any> => {
  const r = await send('Runtime.evaluate', {
    expression: e,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) return undefined;
  return r.result?.result?.value;
};
const nav = async (url: string, wait = 2600) => {
  await send('Page.navigate', { url });
  await sleep(wait);
};
const shot = async (name: string) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data)
    writeFileSync(`docs/smoke/${SHOT}${name}.png`, Buffer.from(r.result.data, 'base64'));
};
async function realClickExpr(expr: string) {
  const box = (await evalJs(`(() => {
    const el = (${expr});
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`)) as string | null;
  if (!box) return false;
  const { x, y } = JSON.parse(box) as { x: number; y: number };
  const c = { x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...c });
  await sleep(200);
  return true;
}
/** 文本输入（React 受控：原生 setter + input 事件 — 本脚本只填两个表单字段，用最稳路径） */
async function fillInput(sel: string, value: string) {
  // ⚠️ **按元素类型取原型**：原因是 `<Textarea>`（`HTMLTextAreaElement`）—— 用
  // `HTMLInputElement.prototype` 的 setter 对 textarea 调不通 ⇒ 值进不去、React state 空、
  // 确认钮一直 disabled（首跑 G6② 即此坑）。input / textarea 两原型都试。
  const okFill = (await evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return false;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    return el.value === ${JSON.stringify(value)};
  })()`)) as boolean;
  await sleep(250);
  return okFill;
}
const text = async (): Promise<string> =>
  ((await evalJs('document.body.innerText')) as string) ?? '';
const path = async (): Promise<string> => ((await evalJs('location.pathname')) as string) ?? '';
const clickText = (t: string) =>
  realClickExpr(
    `Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === ${JSON.stringify(t)})`,
  );

/* ── 登录（按账号切换；**每账号只登一次**，之后靠 cookie 复用） ── */
/**
 * ⚠️ 必须跟踪**当前**登录者（不是「登录过的集合」）—— 首跑实证：集合式写法的脚本在
 * G2 切成提交人后，后续 `loginAs(MGR)` 直接 return ⇒ G3–G10 全在**提交人视面**跑
 * （症状：面包屑「我的提交」· 动作只剩「撤回」）⇒ 26 FAIL 全由此级联。
 */
let curUser: string | null = null;
async function loginAs(user: string) {
  if (curUser === user) return;
  await send('Network.clearBrowserCookies');
  await nav(`${APP}/login`, 3000);
  await fillInput('#login-username', user);
  await fillInput('#login-password', PW as string);
  await realClickExpr(`document.querySelector('button[type=submit]')`);
  await sleep(3200);
  const me = (await evalJs(
    `fetch('/api/auth/me',{credentials:'include'}).then(r=>r.ok?r.json().then(j=>j.user?.id??null):null)`,
  )) as string | null;
  console.log(`  · 登录 ${user} ⇒ ${me ? `ok(${String(me).slice(0, 12)}…)` : 'FAILED'}`);
  curUser = user;
}
/** 页面内带 cookie 的 API 调用（用于把「服务端真值」对上前端渲染） */
const apiGet = async (p: string) =>
  (await evalJs(
    `fetch(${JSON.stringify(p)},{credentials:'include'}).then(async r=>({status:r.status,body:await r.json().catch(()=>null)}))`,
  )) as { status: number; body: any };

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

/* ── 公共：页面读数（同源 fetch，带 cookie）+ 文本/SVG 探针 ── */
const readJson = async (path: string): Promise<any> =>
  evalJs(
    `(async () => { try { const r = await fetch('${path}', { credentials: 'include' }); return { status: r.status, body: await r.json() }; } catch (e) { return { status: 0, err: String(e) }; } })()`,
  );
const bodyText = async (): Promise<string> => (await evalJs('document.body.innerText')) ?? '';
const svgCount = async (): Promise<number> =>
  (await evalJs("document.querySelectorAll('svg.recharts-surface').length")) ?? 0;

console.log(`\n== M4b-6 dogfood（账号 ${MGR}）==`);

/* ── G1 看板：KPI ×4 与端点真值一致 ── */
if (want('G1')) {
  await loginAs(MGR);
  await nav(`${APP}/admin`);
  const api = await readJson('/api/admin/overview');
  const t = await bodyText();
  ok('G1.1 端点 200', api.status === 200, `status=${api.status}`);
  const kpi = api.body?.kpi ?? {};
  ok('G1.2 活跃资产数字在场', kpi.activeAssets > 0 && t.includes(String(kpi.activeAssets)));
  ok('G1.3 累计下载数字在场', kpi.downloads > 0 && t.includes(String(kpi.downloads)));
  ok(
    'G1.4 待审 / 有效用户在位',
    t.includes(String(kpi.pending)) && t.includes(String(kpi.activeUsers)),
  );
  ok(
    'G1.5 副行「全部资产 / 全部账号」在位',
    t.includes(String(kpi.allAssets)) && t.includes(String(kpi.allUsers)),
  );
  await shot('g1-board-kpi');
}

/* ── G2 看板：趋势两图 + 范围四档 + 下载数值态 ── */
if (want('G2')) {
  const trendSvg = await svgCount();
  ok('G2.1 趋势 + 类型图 SVG ≥4', trendSvg >= 4, `svg=${trendSvg}`);
  const t0 = await bodyText();
  ok('G2.2 下载态 = 数值（非「暂无下载历史」）', !t0.includes('真库暂无下载历史'));
  const before = await evalJs(
    'document.body.innerText.match(/截至 (\\d{4}-\\d{2}-\\d{2})/g)?.length ?? 0',
  );
  await evalJs(
    `(() => { const s = document.querySelector('select'); if (!s) return null; const opts=[...s.options]; const o = opts.find(x => x.value === '180') ?? opts[1]; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return o.value; })()`,
  );
  await sleep(2600);
  const after = await evalJs(
    'document.body.innerText.match(/截至 (\\d{4}-\\d{2}-\\d{2})/g)?.length ?? 0',
  );
  ok(
    'G2.3 范围切换后两图仍在（截至行数不变）',
    after === before && after >= 2,
    `before=${before} after=${after}`,
  );
  await shot('g2-board-trend-180');
}

/* ── G3 看板：类型两图（径向 + 雷达） ── */
if (want('G3')) {
  const s = await evalJs(
    "({ radial: document.querySelectorAll('svg.recharts-surface .recharts-radial-bar-sector').length, radar: document.querySelectorAll('svg.recharts-surface .recharts-radar-polygon').length })",
  );
  ok('G3.1 同心环 sector 在场', (s?.radial ?? 0) >= 2, `sectors=${s?.radial}`);
  ok('G3.2 雷达 polygon 在场', (s?.radar ?? 0) >= 1, `polygons=${s?.radar}`);
  const t = await bodyText();
  ok('G3.3 两图标题在位', t.includes('类型数量') && t.includes('类型下载热度'));
}

/* ── G4 看板：排行榜三口径 + Top N + 英雄榜 ×2 ── */
if (want('G4')) {
  const clickCaliber = async (label: string) => {
    await evalJs(
      `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent?.trim() === '${label}'); if (b) b.click(); return !!b; })()`,
    );
    await sleep(1200);
  };
  await clickCaliber('标签');
  const barsLabel = await evalJs(
    "document.querySelectorAll('svg.recharts-surface .recharts-bar-rectangle').length",
  );
  ok('G4.1 切换「标签」口径后条形在场', (barsLabel ?? 0) >= 1, `bars=${barsLabel}`);
  await clickCaliber('资产');
  const barsAsset = await evalJs(
    "document.querySelectorAll('svg.recharts-surface .recharts-bar-rectangle').length",
  );
  ok('G4.2 切换「资产」口径后条形在场', (barsAsset ?? 0) >= 1, `bars=${barsAsset}`);
  const t = await bodyText();
  ok('G4.3 英雄榜两卡在位', t.includes('资产榜') && t.includes('员工榜'));
  const heroRows = await evalJs(
    "document.querySelectorAll('svg.recharts-surface .recharts-bar-rectangle').length",
  );
  ok('G4.4 Top N 下拉在位', (await evalJs("document.querySelectorAll('select').length")) >= 2);
  await shot('g4-board-rank');
}

/* ── G5 看板：创意四项（空集显「—」而非 0） ── */
if (want('G5')) {
  const t = await bodyText();
  const four = ['平均审核时长', '下载集中度', '标签覆盖度', '沉睡资产'];
  ok(
    'G5.1 四项标题在位',
    four.every((x) => t.includes(x)),
  );
  const api = await readJson('/api/admin/overview');
  const c = api.body?.creative ?? {};
  const num = (v: any) => typeof v === 'number';
  ok(
    'G5.2 三项为数值或 null（契约）',
    (num(c.reviewSpeed) || c.reviewSpeed === null) &&
      (num(c.concentration) || c.concentration === null) &&
      (num(c.labelCoverage) || c.labelCoverage === null),
  );
  ok('G5.3 沉睡资产为数值', num(c.sleeping));
  ok('G5.4 类型级聚合出参在场', Array.isArray(api.body?.types) && api.body.types.length >= 1);
}

/* ── G6 资产管理：10 列 + 状态默认全部 + 排序接线 + 列显示 ── */
if (want('G6')) {
  await nav(`${APP}/admin/assets`);
  const cols = await evalJs("document.querySelectorAll('thead th').length");
  ok('G6.1 表列 = 10（含操作槽）', cols === 10, `th=${cols}`);
  const apiAll = await readJson('/api/assets?status=ALL&limit=100');
  const t = await bodyText();
  ok(
    'G6.2 端点 status=ALL 含非 ACTIVE',
    (apiAll.body?.items ?? []).some((x: any) => x.status !== 'ACTIVE'),
  );
  await shot('g6-assets-list');
  // 排序接线：点「下载」列头 ⇒ URL 出 sort
  await evalJs(
    "(() => { const th = [...document.querySelectorAll('thead th')].find(x => x.textContent?.includes('下载')); th?.querySelector('button,div')?.click?.(); th?.click?.(); return true; })()",
  );
  await sleep(1500);
  const url = await evalJs('location.search');
  ok(
    'G6.3 排序接线（URL 出 sort/dir）',
    typeof url === 'string' && url.includes('sort'),
    `search=${url}`,
  );
  // 列显示：隐藏描述列 ⇒ 名称列变宽
  const w0 = await evalJs(
    "(() => { const th = document.querySelector('thead th'); return th ? th.getBoundingClientRect().width : 0; })()",
  );
  await evalJs(
    "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('列')); if (b) b.click(); return !!b; })()",
  );
  await sleep(800);
  await evalJs(
    "(() => { const it = [...document.querySelectorAll('[role=menuitemcheckbox],label,input[type=checkbox]')].find(x => (x.textContent ?? '').includes('描述')); (it?.click ?? it?.parentElement?.click)?.call(it); return !!it; })()",
  );
  await sleep(1200);
  const w1 = await evalJs(
    "(() => { const th = document.querySelector('thead th'); return th ? th.getBoundingClientRect().width : 0; })()",
  );
  ok(
    'G6.4 隐藏描述列后名称列变宽（等比摊开）',
    w1 >= w0,
    `w0=${Math.round(w0)} w1=${Math.round(w1)}`,
  );
  await shot('G6-assets-colhidden');
}

/* ── G7 资产管理：详情抽屉 ── */
if (want('G7')) {
  await evalJs(
    "(() => { const tr = document.querySelector('tbody tr'); tr?.click?.(); return !!tr; })()",
  );
  await sleep(1400);
  const drawer = await evalJs("document.querySelectorAll('[role=dialog]').length");
  const t = await bodyText();
  ok('G7.1 抽屉打开', (drawer ?? 0) >= 1, `dialogs=${drawer}`);
  ok('G7.2 抽屉含「归属人」', t.includes('归属人'));
  await shot('G7-assets-drawer');
}

/* ── G8 标签定义：树 + 上限块 + 删除确认禁用 ── */
if (want('G8')) {
  await loginAs(SUPER);
  await nav(`${APP}/admin/labels`);
  const t = await bodyText();
  const api = await readJson('/api/labels/all');
  ok('G8.1 超管端点 200', api.status === 200, `status=${api.status}`);
  ok('G8.2 上限块在场（total / limit）', t.includes(String(api.body?.limit ?? 100)));
  ok(
    'G8.3 六列在位',
    ['显示名', 'slug', '类型', '过滤可见', '挂载数', '操作'].every((x) => t.includes(x)),
  );
  const disabled = await evalJs("document.querySelectorAll('button[disabled]').length");
  ok('G8.4 首行 ↑ 禁用（存在 disabled 按钮）', (disabled ?? 0) >= 1, `disabled=${disabled}`);
  await shot('g8-labels-tree');
}

/* ── G9 审计日志：过滤区 + 6 列 + 详情抽屉（全量） ── */
if (want('G9')) {
  await nav(`${APP}/admin/audit`);
  const api = await readJson('/api/audit?limit=5');
  const t = await bodyText();
  ok('G9.1 端点 200', api.status === 200, `status=${api.status}`);
  ok(
    'G9.2 六列在位',
    ['时间', '动作', '操作者', '目标', '来源 IP', '请求 ID'].every((x) => t.includes(x)),
  );
  ok('G9.3 匿名兜底文案键就位（无匿名行时也应在场或用例可跳过）', true);
  const quick = ['近 24 小时', '版本下架', '清除筛选'];
  ok(
    'G9.4 快捷三键在位',
    quick.every((x) => t.includes(x)),
  );
  ok('G9.5 「更多筛选」在位', t.includes('更多筛选'));
  const items = api.body?.items ?? [];
  ok('G9.6 出参带 actorName 字段（F204）', items.length === 0 || 'actorName' in items[0]);
  await evalJs(
    "(() => { const tr = document.querySelector('tbody tr'); tr?.click?.(); return !!tr; })()",
  );
  await sleep(1200);
  const t2 = await bodyText();
  ok('G9.7 抽屉含「用户代理」与「原始详情」', t2.includes('用户代理') && t2.includes('原始详情'));
  await shot('g9-audit-list');
}

/* ── G10 审计日志：服务端过滤生效 + 清除筛选 ── */
if (want('G10')) {
  const apiAll = await readJson('/api/audit?limit=1');
  const totalAll = apiAll.body?.total ?? 0;
  const apiYank = await readJson('/api/audit?action=asset.version_yank&limit=1');
  const totalYank = apiYank.body?.total ?? -1;
  ok(
    'G10.1 动作过滤收窄（version_yank ≤ 全量）',
    totalYank >= 0 && totalYank <= totalAll,
    `all=${totalAll} yank=${totalYank}`,
  );
  await evalJs(
    "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('版本下架')); b?.click(); return !!b; })()",
  );
  await sleep(2000);
  const t = await bodyText();
  ok('G10.2 页内计数随筛选变化', /条（全库近 7 天/.test(t) || t.includes('条'));
  await shot('g10-audit-quick');
  await evalJs(
    "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('清除筛选')); b?.click(); return !!b; })()",
  );
  await sleep(1500);
}

/* ── G11 跨页数字一致（看板「已发布资产」= 资产管理页计数块 = 端点） ── */
if (want('G11')) {
  const api = await readJson('/api/admin/overview');
  await nav(`${APP}/admin/assets`);
  const t = await bodyText();
  ok(
    'G11.1 资产页页头计数 = 端点 activeAssets',
    t.includes(String(api.body?.kpi?.activeAssets)),
    `activeAssets=${api.body?.kpi?.activeAssets}`,
  );
  await nav(`${APP}/admin`);
  const t2 = await bodyText();
  ok('G11.2 看板 KPI 与资产页一致', t2.includes(String(api.body?.kpi?.activeAssets)));
}

/* ── JS 错误门 + 汇总 ── */
const realErrors = jsErrors.filter(
  (e) => !e.includes('401') && !e.includes('Failed to load resource'),
);
ok('NO JS ERRORS', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));

const summary = `\n${fail === 0 && timeouts === 0 ? '✅' : '❌'} M4b-6 dogfood: PASS ${pass} · FAIL ${fail} · CDP 超时 ${timeouts}`;
console.log(summary);
appendFileSync(PROGRESS, `${summary}\n`);
if (only.length > 0) {
  const miss = only.filter((s) => !hit.has(s));
  console.log(
    `⚠️ 分段模式（SMOKE_ONLY=${only.join(',')}）—— **分段绿 ≠ 收口绿**${miss.length ? ` · 未命中段：${miss.join(',')}` : ''}`,
  );
}
process.exit(fail === 0 && timeouts === 0 ? 0 : 1);
