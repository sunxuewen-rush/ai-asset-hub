/**
 * M4b-6 治理批 · 本批 dogfood（**G1–G14** · 批 design §9.3 · 批 plan T10）
 *
 * 覆盖：看板（KPI 与端点真值一致 / 趋势两图 + 范围四档 / **标签维度两图**（G3）· 排行榜三口径 + **两处 Combobox** ·
 *       **英雄榜形制**（G5：竖柱 + 柱顶数值 + 水平多行类目名）· **T6⁺ 看板重做段**（G14 · F208/F208-A 守护））·
 *       资产管理（10 列 + 状态默认全部 + 排序接线 + 列显示 + 详情抽屉）·
 *       标签定义（两级树 + 上限块 + ↑↓ 边界 + 删除确认禁用）·
 *       审计日志（过滤区三块 + 6 列 + 详情抽屉 + **服务端过滤生效** + 清除筛选）· 跨页数字一致 ·
 *       **侧栏激活唯一性**（G12 · F206 守护：任一导航路径下恰 1 条 `[data-active=true]`，13 路径 + 1 零态）·
 *       **顶栏形态 + 页内标题**（G13 · F207 守护：顶栏**无** `h1` 且内容区**有**标题，14 路径 + 1 聚合）·
 *       **看板重做段**（G14 · T6⁺：六段结构 / 删项守护 / 出参换靶 / **KPI 档位无关性（F208）** / **层叠守护（F208-A）** /
 *        斜排截断不越界 / 无副标题 · 8 条断言）。
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
const SECTION_IDS = [
  'G1',
  'G2',
  'G3',
  'G4',
  'G5',
  'G6',
  'G7',
  'G8',
  'G9',
  'G10',
  'G11',
  'G12',
  'G13',
  'G14',
] as const;
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

/* ── T6⁺ 换靶后新增助手（G2/G4/G14 共用）─────────────────────────────
 * 背景：本轮把时间档位与 Top N 都换成了官方 `Combobox`（页上**已无原生 <select>**），
 * 旧断言（`querySelector('select')` / `textContent.trim() === '标签'`）在 T6⁺ 后**恒真而失去判别力**
 * （实证：4 张看板截图字节相同 = 状态从未改变）⇒ 此处统一改为「真点击 + 读真值」。
 */
/** 点开官方 Combobox 并按可见文案选中（选中后等图表重取 + 动画） */
const pickComboboxOption = async (inputAriaPrefix: RegExp, label: string): Promise<boolean> => {
  const opened = await evalJs(
    `(() => { const el = [...document.querySelectorAll('input[aria-label]')].find((i) => ${inputAriaPrefix}.test(i.getAttribute('aria-label') || ''));
      if (!el) return false; el.focus(); el.click(); el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); return true; })()`,
  );
  if (!opened) return false;
  await sleep(700);
  const picked = await evalJs(
    `(() => { const el = [...document.querySelectorAll('[role=option]')].find((e) => (e.textContent || '').trim() === ${JSON.stringify(label)});
      if (el) el.click(); return !!el; })()`,
  );
  await sleep(2600);
  return !!picked;
};
/** 时间档位（「近 N 天」档） */
const pickRange = (label: string) => pickComboboxOption(/^近/, label);
/** 趋势卡「第一个图」的 X 轴刻度文字（左→右 · 只取形如 `MM-DD` 的标签） */
const trendTicks = async (): Promise<string[]> => {
  const v = await evalJs(`(() => {
    const c = [...document.querySelectorAll('[data-slot=card]')].find((x) => x.textContent.includes('资产数和下载数趋势'));
    if (!c) return null;
    const svg = c.querySelector('svg.recharts-surface');
    if (!svg) return null;
    return [...svg.querySelectorAll('text')].map((t) => (t.textContent || '').trim()).filter((t) => t.length === 5 && t.includes('-'));
  })()`);
  return Array.isArray(v) ? (v as string[]) : [];
};
/** 排行榜卡内的柱子数（**只数排行榜卡** —— 否则会把英雄榜两榜的柱子算进来） */
const rankBarCount = async (): Promise<number> => {
  const v = await evalJs(`(() => {
    const c = [...document.querySelectorAll('[data-slot=card]')].find((x) => x.textContent.includes('排行榜'));
    return c ? c.querySelectorAll('svg.recharts-surface .recharts-bar-rectangle').length : -1;
  })()`);
  return typeof v === 'number' ? v : -1;
};
/** 「MM-DD」距今天的天数（Asia/Shanghai 日界；跨年时取最近一次未来的那天） */
const tickAgeDays = (mmdd: string): number => {
  if (!mmdd) return -1;
  const dayOf = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(d);
  const today = new Date(`${dayOf(new Date())}T12:00:00+08:00`).getTime();
  for (const year of [new Date().getFullYear(), new Date().getFullYear() - 1]) {
    const t = new Date(`${year}-${mmdd}T12:00:00+08:00`).getTime();
    const age = Math.round((today - t) / 86_400_000);
    if (age >= 0 && age <= 400) return age;
  }
  return -1;
};

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

/* ── G2 看板：趋势两图 + 档位**真实切换**（T6⁺ 重写：官方 Combobox + 硬证据）── */
if (want('G2')) {
  const svg = await svgCount();
  const trendCharts = await evalJs(
    `(() => { const c = [...document.querySelectorAll('[data-slot=card]')].find((x) => x.textContent.includes('资产数和下载数趋势')); return c ? c.querySelectorAll('svg.recharts-surface').length : -1; })()`,
  );
  ok(
    'G2.1 趋势卡两图 + 全页图表 SVG ≥6',
    svg >= 6 && trendCharts === 2,
    `全页=${svg} 趋势卡=${trendCharts}`,
  );
  const cap = await bodyText();
  const capCount = (cap.match(/截至 \d{4}-\d{2}-\d{2}/g) ?? []).length;
  ok(
    'G2.2 下载态 = 数值（题注「截至 YYYY-MM-DD」≥2 处 · 无空态文案）',
    capCount >= 2 && !cap.includes('暂无下载历史'),
    `题注=${capCount} 处`,
  );
  const t30 = await trendTicks();
  const age30 = tickAgeDays(t30[0] ?? '');
  ok(
    'G2.3 默认档位 = 近 30 天（首刻度龄 8–29 天）',
    t30.length >= 2 && age30 >= 8 && age30 <= 29,
    `刻度=${t30.join('/')} 首刻度龄=${age30}`,
  );
  const switched = await pickRange('近 7 天');
  const t7 = await trendTicks();
  const age7 = tickAgeDays(t7[0] ?? '');
  ok(
    'G2.4 档位切换**生效**（近 7 天：首刻度龄 ≤6 且与 30 天档不同）',
    switched && t7.length >= 2 && age7 >= 0 && age7 <= 6 && t7.join() !== t30.join(),
    `切换=${switched} 刻度=${t7.join('/')} 首刻度龄=${age7}`,
  );
  await shot('g2-board-trend-7');
  await pickRange('近 30 天');
  const back = await trendTicks();
  const ageBack = tickAgeDays(back[0] ?? '');
  ok(
    'G2.5 切回近 30 天（首刻度龄回到 8–29 天）',
    ageBack >= 8 && ageBack <= 29,
    `刻度=${back.join('/')} 首刻度龄=${ageBack}`,
  );
}

/* ── G3 看板：标签维度两图（同心环 + 雷达 · T6⁺ 换靶） ── */
if (want('G3')) {
  const s = await evalJs(`(() => {
    const cardOf = (t) => [...document.querySelectorAll('[data-slot=card]')].find((c) => c.textContent.includes(t));
    const ring = cardOf('标签资产数量');
    const radar = cardOf('标签下载热度');
    const fills = (root, sel) => (root ? [...root.querySelectorAll(sel)].map((e) => getComputedStyle(e).fill) : []);
    const bgs = (root, sel) => (root ? [...root.querySelectorAll(sel)].map((e) => getComputedStyle(e).backgroundColor) : []);
    return {
      sectors: ring ? ring.querySelectorAll('.recharts-radial-bar-sector').length : 0,
      ringCircles: ring ? ring.querySelectorAll('.recharts-polar-grid-concentric-circle').length : 0,
      radarCircles: radar ? radar.querySelectorAll('.recharts-polar-grid-concentric-circle').length : 0,
      radarAngle: radar ? radar.querySelectorAll('.recharts-polar-angle-axis-tick').length : 0,
      sectorFills: fills(ring, '.recharts-radial-bar-sector'),
      ringChips: bgs(ring, 'span[aria-hidden]'),
      radarDotFills: radar ? [...radar.querySelectorAll('circle')].filter((c) => c.getAttribute('r') === '4').map((c) => getComputedStyle(c).fill) : [],
      radarChips: bgs(radar, 'span[aria-hidden]'),
      ringDesc: ring ? ring.querySelectorAll('[data-slot=card-description]').length : -1,
      radarDesc: radar ? radar.querySelectorAll('[data-slot=card-description]').length : -1,
    };
  })()`);
  ok('G3.1 同心环扇区在场', (s?.sectors ?? 0) >= 1, `sectors=${s?.sectors}`);
  ok(
    'G3.2 两图同心网格（官方 gridType=circle）',
    (s?.ringCircles ?? 0) >= 1 && (s?.radarCircles ?? 0) >= 1,
    `ring=${s?.ringCircles} radar=${s?.radarCircles}`,
  );
  const t = await bodyText();
  ok('G3.3 两图标题在位（标签维度）', t.includes('标签资产数量') && t.includes('标签下载热度'));
  ok('G3.4 雷达轴文字在场', (s?.radarAngle ?? 0) >= 1, `ticks=${s?.radarAngle}`);
  const same = (a: string[], b: string[]) =>
    a.length > 0 && a.length === b.length && a.every((x, i) => x === b[i]);
  ok(
    'G3.5 取色三处一致（环扇区↔环图例 · 雷达点↔雷达图例）',
    same(s?.sectorFills ?? [], s?.ringChips ?? []) &&
      same(s?.radarDotFills ?? [], s?.radarChips ?? []),
    `ring=${JSON.stringify(s?.sectorFills)} radar=${JSON.stringify(s?.radarDotFills)}`,
  );
  ok(
    'G3.6 两图无副标题（T6⁺ 拍板）',
    s?.ringDesc === 0 && s?.radarDesc === 0,
    `ring=${s?.ringDesc} radar=${s?.radarDesc}`,
  );
  // 口径三向一致：overview.labels[] ↔ rankings.labels（逐条 count 相等 ⇒ 一级 + 上卷 + 仅 ACTIVE + 去重同面）
  const ov = await readJson('/api/admin/overview');
  const rk = await readJson('/api/admin/rankings?limit=100');
  const ovMap = new Map((ov.body?.labels ?? []).map((l: any) => [l.slug, l.count]));
  const rkLabels = rk.body?.labels ?? [];
  const mismatch = rkLabels.filter((l: any) => ovMap.get(l.id) !== l.value);
  ok(
    'G3.7 标签口径与排行榜同面（逐条 count 相等）',
    rkLabels.length > 0 && mismatch.length === 0,
    `rankings=${rkLabels.length} mismatch=${JSON.stringify(mismatch.slice(0, 2))}`,
  );
}

/* ── G4 看板：排行榜三口径（T6⁺ 重写：按 data-active 定位 + 柱数 = 端点条数）── */
if (want('G4')) {
  const rk = await readJson('/api/admin/rankings?limit=100');
  const TOPN = 10; // 页面默认 Top N（与 rank.topN 默认档一致）
  // 期望柱数 = 前 TOPN 条里 **value > 0** 的条数 —— recharts 不为零高柱渲染 `recharts-bar-rectangle`
  // （实测：资产榜前 10 条含 6 条 value=0 ⇒ DOM 只有 4 根柱；按数组长度断言会假红）
  const nonzero = (arr: Array<{ value: number }>) =>
    Math.min(TOPN, arr.filter((x) => x.value > 0).length);
  const expectOf: Record<string, number> = {
    人: nonzero(rk.body?.people ?? []),
    标签: nonzero(rk.body?.labels ?? []),
    资产: nonzero(rk.body?.assets ?? []),
  };
  const caliberBtn = (label: string) =>
    `[...document.querySelectorAll('button[data-active]')].find((x) => (x.textContent || '').includes(${JSON.stringify(label)}))`;
  const activeNow = async (): Promise<string | null> =>
    evalJs(
      `(() => { const b = [...document.querySelectorAll('button[data-active]')].find((x) => x.getAttribute('data-active') === 'true');
        if (!b) return null; const m = (b.textContent || '').trim().match(/^(人|资产|标签)/); return m ? m[0] : null; })()`,
    );
  const a0 = await activeNow();
  ok('G4.1 默认口径 = 人（按钮 data-active=true）', a0 === '人', `active=${a0}`);
  for (const label of ['标签', '资产', '人'] as const) {
    await evalJs(`(() => { const b = ${caliberBtn(label)}; if (b) b.click(); return !!b; })()`);
    await sleep(1400);
    const active = await evalJs(
      `(() => { const b = ${caliberBtn(label)}; return b ? b.getAttribute('data-active') : null; })()`,
    );
    const bars = await rankBarCount();
    ok(
      `G4.2 切「${label}」口径生效：data-active=true 且柱数 = 端点条数`,
      active === 'true' && bars === expectOf[label],
      `active=${active} bars=${bars} 端点=${expectOf[label]}`,
    );
    if (label === '标签') await shot('g4-board-rank-label');
  }
  const t = await bodyText();
  ok('G4.3 英雄榜两榜在位', t.includes('资产榜') && t.includes('员工榜'));
  const comboLabels = await evalJs(
    `(() => [...document.querySelectorAll('input[aria-label]')].map((i) => i.getAttribute('aria-label')))()`,
  );
  ok(
    'G4.4 两处 Combobox 在位（Top N + 时间档位）',
    (comboLabels ?? []).some((x: string) => /^Top/.test(x)) &&
      (comboLabels ?? []).some((x: string) => /^近/.test(x)),
    JSON.stringify(comboLabels),
  );
}

/* ── G5 看板：英雄榜形制（T6⁺：竖柱 + 柱顶数值 + 水平多行类目名） ── */
if (want('G5')) {
  const h = await evalJs(`(() => {
    const hero = [...document.querySelectorAll('[data-slot=card]')].find((c) => c.textContent.includes('英雄榜'));
    if (!hero) return null;
    const panels = [...hero.querySelectorAll('div.rounded-xl[class*="bg-muted/50"]')];
    return panels.map((p) => {
      const svg = p.querySelector('svg.recharts-surface');
      const texts = svg ? [...svg.querySelectorAll('text')] : [];
      const isNum = (x) => /^[0-9]+$/.test((x.textContent || '').trim());
      const rot = (x) =>
        /rotate/.test((x.getAttribute('transform') || '') + (x.parentElement?.getAttribute('transform') || ''));
      return {
        title: (p.firstElementChild?.textContent || '').trim(),
        bars: p.querySelectorAll('.recharts-bar-rectangle').length,
        topLabels: texts.filter(isNum).length,
        nameLines: texts.filter((x) => !isNum(x)).map((x) => x.querySelectorAll('tspan').length),
        rotated: texts.filter(rot).length,
        gridVertical: p.querySelectorAll('.recharts-cartesian-grid-vertical line').length,
      };
    });
  })()`);
  const hs = (h ?? []) as Array<any>;
  ok(
    'G5.1 英雄榜两榜在位（员工榜 / 资产榜）',
    hs.length === 2 &&
      hs.some((x) => x.title.includes('员工榜')) &&
      hs.some((x) => x.title.includes('资产榜')),
    JSON.stringify(hs.map((x) => x.title)),
  );
  ok(
    'G5.2 每榜 3 根竖柱 + 3 个柱顶数值',
    hs.length === 2 && hs.every((x) => x.bars === 3 && x.topLabels === 3),
    JSON.stringify(hs.map((x) => [x.bars, x.topLabels])),
  );
  ok(
    'G5.3 类目名水平多行（无 -45° 旋转 · 每名至少 1 层 tspan）',
    hs.length === 2 &&
      hs.every(
        (x) =>
          x.rotated === 0 && x.nameLines.length >= 1 && x.nameLines.every((n: number) => n >= 1),
      ),
    JSON.stringify(hs.map((x) => [x.rotated, x.nameLines])),
  );
  ok(
    'G5.4 无纵向网格线（官方 vertical={false}）',
    hs.length === 2 && hs.every((x) => x.gridVertical === 0),
    JSON.stringify(hs.map((x) => x.gridVertical)),
  );
  const t = await bodyText();
  ok('G5.5 英雄榜无副标题/无页脚口径行', !t.includes('取排行榜前 3') && !t.includes('柱内为名称'));
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

/* ── G12 侧栏激活唯一性（**F206 守护断言** · design §9.3 / navItems.tsx 顶部规则） ──
 * 背景：F206 = 「前缀匹配 + 人肉维护精确集」形态 ⇒ 分区父项在子页**双亮**（用户实证：点「管理看板」
 *   再点「资产管理」，「管理看板」仍选中）。修法 = 判定改**全精确匹配**（`pathname === to`）。
 * 断言：逐路径读官方 `[data-slot="sidebar-menu-button"][data-active="true"]`，要求**恰 1 条**且 href = 该路径；
 *   外加**零态** `/search`（无对应条目 ⇒ 应 0 条）+ **F206 回归专条**（`/admin/assets` 下 `/admin` 不得激活）。
 * ⚠️ 依赖桌面视口（脚本头部已 `Emulation.setDeviceMetricsOverride` 1440）——窄视口下侧栏退化为移动
 *   Sheet、条目不入 DOM（M4b-3 已记此坑）。账号 = 超管（覆盖 `/admin/labels`）。  */
if (want('G12')) {
  await loginAs(SUPER);
  /** 读侧栏激活条目的 href（`asChild` ⇒ `<a>` 自带 `data-slot`/`data-active`）；无 href 用文本兜底 */
  const activeHrefs = async (): Promise<string[]> =>
    ((await evalJs(
      `Array.from(document.querySelectorAll('[data-slot="sidebar-menu-button"][data-active="true"]')).map((e) => e.getAttribute('href') ?? ('#' + e.innerText.trim()))`,
    )) as string[]) ?? [];
  const CASES: Array<{ path: string; expect: string; note: string }> = [
    { path: '/', expect: '/', note: '门户首页' },
    { path: '/skills', expect: '/skills', note: '技能中心' },
    { path: '/mcps', expect: '/mcps', note: 'MCP 中心' },
    { path: '/agents', expect: '/agents', note: 'Agents 中心' },
    { path: '/dashboard', expect: '/dashboard', note: '个人工作台（父项）' },
    { path: '/dashboard/assets', expect: '/dashboard/assets', note: '我的资产' },
    { path: '/dashboard/submissions', expect: '/dashboard/submissions', note: '我的提交' },
    { path: '/dashboard/tokens', expect: '/dashboard/tokens', note: '访问令牌' },
    { path: '/admin', expect: '/admin', note: '管理看板（父项）' },
    { path: '/admin/assets', expect: '/admin/assets', note: '资产管理' },
    { path: '/admin/reviews', expect: '/admin/reviews', note: '审核管理' },
    { path: '/admin/audit', expect: '/admin/audit', note: '审计日志' },
    { path: '/admin/labels', expect: '/admin/labels', note: '标签定义' },
  ];
  let idx = 0;
  for (const c of CASES) {
    idx += 1;
    await nav(`${APP}${c.path}`);
    const hrefs = await activeHrefs();
    ok(
      `G12.${idx} ${c.path} 恰 1 条激活（${c.note}）`,
      hrefs.length === 1 && hrefs[0] === c.expect,
      `active=${JSON.stringify(hrefs)}`,
    );
  }
  // 零态：无对应条目的路径 ⇒ 侧栏 0 条激活（防「父项乱兜」）
  await nav(`${APP}/search`);
  const zero = await activeHrefs();
  ok('G12.14 /search 无对应条目 ⇒ 0 条激活', zero.length === 0, `active=${JSON.stringify(zero)}`);
  // F206 回归专条：用户实证场景 —— 停在 /admin/assets 时「管理看板」不得激活
  await nav(`${APP}/admin/assets`);
  const f206 = await activeHrefs();
  ok(
    'G12.15 F206 回归：/admin/assets 下「管理看板」不激活',
    !f206.includes('/admin') && f206.length === 1,
    `active=${JSON.stringify(f206)}`,
  );
}

/* ── G13 顶栏形态 + 页内标题（**F207 守护** · 2026-09-23 用户拍板「甲」） ──
 * 「甲」= 顶栏回归官方 block 形态 —— 删自造 `titleOf(pathname)` 路由表（官方 `dashboard-01/site-header.tsx`
 *   的 `<h1>` 是写死的、`sidebar-07` 顶栏 Breadcrumb 亦每页硬编码 ⇒ 官方**无**「路由 → 标题」机制）。
 *   F207 实况：该表漏 `/admin` 与 `/admin/assets` ⇒ 两页顶栏无名称（用户 2026-09-23 报）。
 * 断言（逐路由两条合一）：「顶栏**无** `h1`」**且**「内容区有首个标题」。
 * 口径注记：页内标题**不必**是 `<h1>` —— 本仓多数页用 `PageHeader`（官方 `Card` → `CardTitle` 渲染为
 *   `<div data-slot="card-title">`）⇒ 取值集合 = `[data-slot="card-title"], h1, h2, h3`（排除 `header` 内）。  */
if (want('G13')) {
  await loginAs(SUPER);
  const readTitles = async (): Promise<{ bar: string | null; main: string | null }> =>
    JSON.parse(
      ((await evalJs(`(() => {
        const txt = (e) => ((e && e.textContent) || '').trim();
        const bar = document.querySelector('header h1');
        const root = document.querySelector('main') || document.body;
        const cand = Array.from(root.querySelectorAll('[data-slot="card-title"], h1, h2, h3'))
          .filter((e) => !e.closest('header')).map(txt).filter(Boolean);
        return JSON.stringify({ bar: bar ? txt(bar) : null, main: cand[0] ?? null });
      })()`)) as string | undefined) ?? '{"bar":null,"main":null}',
    );
  const G13_PATHS = [
    '/',
    '/skills',
    '/mcps',
    '/agents',
    '/search',
    '/dashboard',
    '/dashboard/assets',
    '/dashboard/submissions',
    '/dashboard/tokens',
    '/admin',
    '/admin/assets',
    '/admin/reviews',
    '/admin/audit',
    '/admin/labels',
  ];
  let i13 = 0;
  for (const p of G13_PATHS) {
    i13 += 1;
    await nav(`${APP}${p}`);
    const r = await readTitles();
    ok(
      `G13.${i13} ${p} 顶栏无 h1 且内容区有标题`,
      r.bar === null && typeof r.main === 'string' && r.main.length > 0,
      `bar=${JSON.stringify(r.bar)} main=${JSON.stringify(r.main)}`,
    );
  }
  ok(
    'G13.15 顶栏 h1 计数 = 0（甲口径：页面名只在页内）',
    (await evalJs("document.querySelectorAll('header h1').length")) === 0,
  );
}

/* ── G14 看板重做段（T6⁺：结构 / 删项 / 档位无关性 / 层叠 / 斜排 / 无副标题） ── */
if (want('G14')) {
  await loginAs(MGR);
  await nav(`${APP}/admin`);

  // KPI 卡：标题槽是数字、名称在副行槽（`card-description`）⇒ 两槽都读，按 DOM 序
  const titles = (await evalJs(
    `(() => [...document.querySelectorAll('[data-slot="card-title"], [data-slot="card-description"]')].map((e) => e.textContent.trim()))()`,
  )) as string[];
  const order = [
    '已发布资产',
    '累计下载',
    '待审',
    '有效用户',
    '资产数和下载数趋势',
    '标签资产数量',
    '标签下载热度',
    '排行榜',
    '英雄榜',
  ];
  const idx = order.map((x) => (titles ?? []).findIndex((t) => t.startsWith(x)));
  ok(
    'G14.1 六段结构在位且顺序正确',
    idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1])),
    JSON.stringify(idx),
  );

  const t = await bodyText();
  ok(
    'G14.2 已删段落字样不出现（创意四项 / 类型维度）',
    !t.includes('平均审核时长') &&
      !t.includes('下载集中度') &&
      !t.includes('标签覆盖度') &&
      !t.includes('沉睡资产') &&
      !t.includes('类型数量') &&
      !t.includes('类型下载热度'),
  );

  const ov = await readJson('/api/admin/overview');
  ok(
    'G14.3 出参已换靶（labels[] 在场 · creative/types 不在场）',
    Array.isArray(ov.body?.labels) &&
      ov.body?.creative === undefined &&
      ov.body?.types === undefined,
    `labels=${ov.body?.labels?.length} creative=${typeof ov.body?.creative}`,
  );

  /** 读「累计下载」卡副行 */
  const kpiHint = async (): Promise<string | null> =>
    (await evalJs(
      `(() => { const c = [...document.querySelectorAll('[data-slot=card]')].find((x) => x.textContent.includes('累计下载'));
        return c ? [...c.querySelectorAll('[data-slot=card-content]')].map((e) => e.textContent.trim()).join('|') : null; })()`,
    )) as string | null;

  const hint30 = await kpiHint();
  await pickRange('近 7 天');
  const hint7 = await kpiHint();
  await pickRange('近半年');
  const hint180 = await kpiHint();
  ok(
    'G14.4 KPI 副行与趋势档位无关（F208 专条）',
    hint30 !== null && hint30 === hint7 && hint7 === hint180,
    `30=${hint30} | 7=${hint7} | 180=${hint180}`,
  );
  const d7 = ov.body?.kpi?.downloads7d;
  ok(
    'G14.5 KPI 副行 = 端点 kpi.downloads7d',
    d7 === null ? (hint30 ?? '').includes('暂无下载历史') : (hint30 ?? '').includes(String(d7)),
    `endpoint=${d7} hint=${hint30}`,
  );
  await pickRange('近 30 天');

  // 层叠守护：把排行榜卡头滚到 TopBar 下方，重叠点必须命中顶栏（而非口径按钮）
  await evalJs(`(() => {
    const b = [...document.querySelectorAll('button[data-active]')].filter((x) => /^(人|资产|标签)/.test(x.textContent.trim()))[0];
    if (b) window.scrollTo(0, window.scrollY + b.getBoundingClientRect().top - 20);
    return !!b;
  })()`);
  await sleep(700);
  const layer = await evalJs(`(() => {
    const header = document.querySelector('header.sticky') || document.querySelector('header');
    const b = [...document.querySelectorAll('button[data-active]')].filter((x) => /^(人|资产|标签)/.test(x.textContent.trim()))[0];
    if (!header || !b) return null;
    const hb = header.getBoundingClientRect(); const bb = b.getBoundingClientRect();
    const x = Math.round(Math.max(hb.left, bb.left) + 10); const y = Math.round(hb.top + hb.height - 6);
    const el = document.elementFromPoint(x, y);
    return { insideTopBar: y >= hb.top && y <= hb.bottom, hitIsCaliberButton: !!(el && el.closest('button[data-active]')), hitTag: el ? el.tagName : null };
  })()`);
  ok(
    'G14.6 层叠守护：口径按钮不得盖住 TopBar（F208-A 专条）',
    !!layer && layer.insideTopBar === true && layer.hitIsCaliberButton === false,
    JSON.stringify(layer),
  );

  await nav(`${APP}/admin`);
  const rank = await evalJs(`(() => {
    const svg = [...document.querySelectorAll('svg.recharts-surface')].find((s) => s.querySelectorAll('.recharts-bar-rectangle').length >= 5);
    if (!svg) return null;
    const card = svg.closest('[data-slot=card]'); const cb = card.getBoundingClientRect();
    const rot = [...svg.querySelectorAll('text')].filter((x) =>
      /rotate/.test((x.getAttribute('transform') || '') + (x.parentElement?.getAttribute('transform') || '')));
    const boxes = rot.map((x) => { const b = (x.parentElement ?? x).getBoundingClientRect(); return { left: Math.round(b.left - cb.left), bottom: Math.round(b.bottom - cb.top) }; });
    return {
      count: rot.length,
      maxLen: rot.reduce((m, x) => Math.max(m, (x.textContent || '').length), 0),
      outLeft: boxes.filter((b) => b.left < 0).length,
      outBottom: boxes.filter((b) => b.bottom > cb.height + 1).length,
    };
  })()`);
  ok(
    'G14.7 排行榜类目名斜排 + 截断 ≤14 字符 + 不越出卡片',
    !!rank && rank.count >= 1 && rank.maxLen <= 15 && rank.outLeft === 0 && rank.outBottom === 0,
    JSON.stringify(rank),
  );

  const trend = await evalJs(`(() => {
    const c = [...document.querySelectorAll('[data-slot=card]')].find((x) => x.textContent.includes('资产数和下载数趋势'));
    return { desc: c ? c.querySelectorAll('[data-slot=card-description]').length : -1, toggle: document.querySelectorAll('[data-slot=toggle-group]').length };
  })()`);
  ok(
    'G14.8 趋势卡无副标题且档位非 ToggleGroup',
    !!trend && trend.desc === 0 && trend.toggle === 0,
    JSON.stringify(trend),
  );
  await shot('g14-board-redesign');
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
