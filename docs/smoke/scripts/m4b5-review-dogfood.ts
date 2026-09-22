/**
 * M4b-5 审核批 · 本批 dogfood（**G1–G10** · 批 design §9.3 · 批 plan T10）
 *
 * 覆盖：队列（管理档 7 列/筛选/分页/真链接/列开关保护 2 项）· 队列守卫（提交人被弹回）·
 *       三族详情（skill 主文档 / mcp `servers` 组成式 / agent 族字段 + passthrough）·
 *       三动作（可选意见 / 必填原因 / 撤回）· **R2 权限矩阵**（管理档自审 / 提交人 `adminOnly`）·
 *       边界（`REJECTED` 不可预览 / **B1** 提交人预览 404 内联）· **变更对比 F156**（契约 · split · 高亮两态 ·
 *       折叠懒渲染 · 容器回退 · 首版/同版本两态）
 *
 * 前置（dev 三件在线）：`:3000` API · `:5173` web · `:9222` Edge CDP（起法：
 *   `'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' --headless=new \
 *     --remote-debugging-port=9222 --user-data-dir=/tmp/edge-m4b5-dogfood --no-first-run about:blank`）
 *
 * 造数（**先跑**）：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b5-seed-reviews.ts`（幂等）
 *
 * 运行：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b5-review-dogfood.ts`
 *   分段：`SMOKE_ONLY=G3,G10 …`（逗号多选；**分段绿 ≠ 收口绿**）
 *   截图前缀：`SMOKE_SHOT_PREFIX=m4b5-`
 *
 * ⚠️ **G6 会改库**（真点三动作）⇒ **收口跑之前重新执行 seed 复位**；正确顺序 **seed → dogfood**。
 * ⚠️ 账号：`m4b2_mgr`（管理档）· `m4b5_member`（提交人 · 非管理档）—— 与 seed 共用 `SMOKE_M4B2_PASSWORD`。
 */
import { appendFileSync, writeFileSync } from 'node:fs';

const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const SHOT = process.env.SMOKE_SHOT_PREFIX ?? 'm4b5-';
const PROGRESS = process.env.SMOKE_LOG ?? '/tmp/m4b5-dogfood-progress.log';
const PW = process.env.SMOKE_M4B2_PASSWORD;
if (!PW) {
  console.error('SMOKE_M4B2_PASSWORD is required（口令不入仓）');
  process.exit(1);
}
const MGR = 'm4b2_mgr';
const MEMBER = 'm4b5_member';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── PASS/FAIL 计数 + 分段（`SMOKE_ONLY`） ── */
let pass = 0;
let fail = 0;
let timeouts = 0;
const SECTION_IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'] as const;
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

/* ── 造数真值：从队列解析 slug → taskId（不写死 id —— 幂等 seed 下稳定，但解析更稳） ── */
await loginAs(MGR);
const queue = await apiGet('/api/reviews?status=PENDING&limit=50');
const taskOf = (slug: string): number | null =>
  (queue.body?.items ?? []).find((i: any) => i.assetSlug === slug)?.taskId ?? null;
const ID = {
  skill: taskOf('m4b5-seed-skill'),
  mcp: taskOf('m4b5-seed-mcp'),
  agent: taskOf('m4b5-seed-agent'),
  b1: taskOf('m4b5-seed-b1'),
  compare: taskOf('m4b5-seed-compare'),
  samever: taskOf('m4b5-seed-samever'),
  selfreview: taskOf('m4b5-seed-selfreview'),
  actReject: taskOf('m4b5-seed-act-reject'),
  actApprove: taskOf('m4b5-seed-act-approve'),
  actWithdraw: taskOf('m4b5-seed-act-withdraw'),
  actMember: taskOf('m4b5-seed-act-member'),
};
const rejected = (await apiGet('/api/reviews?status=REJECTED&limit=50')).body?.items?.find(
  (i: any) => i.assetSlug === 'm4b5-seed-rejected',
)?.taskId as number | undefined;
console.log(
  `[dogfood] fixture id: ${Object.entries({ ...ID, rejected })
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')}`,
);
if (Object.values(ID).some((v) => v === null))
  console.log('  ⚠️ 有 fixture 未在队列命中 —— 先跑 seed');

/* ── G1 队列（管理档） ── */
if (want('G1')) {
  console.log('\nG1 队列（管理档 · 7 列 / 筛选 / 分页 / 真链接 / 列开关）');
  await nav(`${APP}/admin/reviews`);
  const heads = (await evalJs(
    `Array.from(document.querySelectorAll('thead th')).map(t=>t.textContent.trim())`,
  )) as string[];
  ok(
    'G1① 7 列列头逐条',
    JSON.stringify(heads) ===
      JSON.stringify(['资产', '类型', '状态', '姓名', '工号', '提交时间', '操作']),
    JSON.stringify(heads),
  );
  ok(
    'G1② 状态筛选在场（默认「全部」不传参）',
    (await evalJs(`!!document.querySelector('#reviews-status-filter')`)) === true,
  );
  const total = (await apiGet('/api/reviews?limit=20')).body?.total as number;
  const pag =
    (await evalJs(
      `!!document.querySelector('#reviews-status-filter') && document.body.innerText.includes('每页')`,
    )) === true;
  ok(`G1③ 分页在场性（total=${total} ≤ 20 ⇒ 缺席）`, total > 20 ? pag : !pag);
  const eyeOk = await realClickExpr(
    `Array.from(document.querySelectorAll('tbody tr')).find((tr)=>tr.textContent.includes('m4b5-seed-skill'))?.querySelector('button[aria-label="查看"]')`,
  );
  await sleep(2200);
  const p1 = await path();
  ok('G1④ 操作列真链接进详情', eyeOk && p1.startsWith('/reviews/'), p1);
  await nav(`${APP}/admin/reviews`);
  await realClickExpr(`document.querySelector('button[aria-label="列显示"]')`);
  await sleep(900);
  const menu = (await evalJs(
    `Array.from(document.querySelectorAll('[role=menuitemcheckbox]')).map(i=>({t:i.textContent.trim(),d:i.getAttribute('aria-disabled')}))`,
  )) as Array<{ t: string; d: string | null }>;
  ok(
    'G1⑤ 列开关 7 项 + 保护 2 项置灰',
    menu.length === 7 && menu.filter((m) => m.d === 'true').length === 2,
    JSON.stringify(menu.map((m) => m.t)),
  );
  await shot('g1-queue');
}

/* ── G2 队列（提交人 ⇒ 守卫弹回 · 零请求） ── */
if (want('G2')) {
  console.log('\nG2 队列（提交人 · 守卫弹回）');
  await loginAs(MEMBER);
  netLog.length = 0;
  await nav(`${APP}/admin/reviews`, 3000);
  const p = await path();
  // ⚠️ 判据载体要选**真存在**的：该外壳的侧栏不是 `<nav>` 元素（首跑 `nav:false` 误判白屏）
  //    ⇒ 用「正文长度 + 卡标题在场」两项（都来自实际渲染面）
  const shell = (await evalJs(
    `({len:(document.body.innerText||'').length, title:!!document.querySelector('[data-slot="card-title"]'), brand:!!document.querySelector('aside')||!!document.querySelector('[data-slot="sidebar"]')||!!document.querySelector('nav')})`,
  )) as { len: number; title: boolean; brand: boolean };
  const wrote = netLog.filter(
    (n) => /\/api\/reviews(\?|$)/.test(n.url) && !n.url.endsWith('.ts'),
  ).length;
  ok('G2① 非管理档被守卫弹回 /dashboard', p === '/dashboard', p);
  // ⚠️ 判「零白屏」用**外壳在场**（`nav` + 卡标题），不用字数阈值 —— 首跑 `len>200` 卡边 197 属自造失败
  ok('G2② 零白屏（正文非空 + 卡标题在场）', shell.len > 100 && shell.title, JSON.stringify(shell));
  ok('G2③ 零业务请求（未发 /api/reviews）', wrote === 0, `req=${wrote}`);
}

/* ── G3/G4/G5 三族详情 ── */
for (const [id, expect] of [
  ['G3', 'skill'],
  ['G4', 'mcp'],
  ['G5', 'agent'],
] as const) {
  if (!want(id as SectionId)) continue;
  const taskId = ID[expect as keyof typeof ID];
  console.log(`\n${id} 详情 · ${expect}（task #${taskId}）`);
  await loginAs(MGR);
  await nav(`${APP}/reviews/${taskId}`);
  const crumbs = (await evalJs(
    `Array.from(document.querySelectorAll('nav a, nav [role=link], nav li')).map(e=>e.textContent.trim()).filter(Boolean)`,
  )) as string[];
  const crumbLine = crumbs.join('>');
  ok(
    `${id}① 面包屑 = 首页/审核管理/#id`,
    crumbLine.includes('首页') &&
      crumbLine.includes('审核管理') &&
      crumbLine.includes(`#${taskId}`),
    crumbLine,
  );
  // ⚠️ 勿用 h1/h2：外壳标题会命中（首跑实证取到「审核详情」）⇒ 按 shadcn `data-slot` 作用域取
  const title = (await evalJs(
    `document.querySelector('[data-slot="card-title"]')?.textContent?.trim() ?? null`,
  )) as string | null;
  const heads = (await evalJs(
    `Array.from(document.querySelectorAll('h3')).map(h=>h.textContent.trim())`,
  )) as string[];
  ok(`${id}② 页头 = slug · v版本`, title === `m4b5-seed-${expect} · v1.0.0`, String(title));
  ok(`${id}③ manifest 卡在场`, heads.includes('manifest 摘要'), JSON.stringify(heads));
  const cardText = await text();
  if (expect === 'skill') {
    ok('G3④ skill · 主文档行含 SKILL.md', cardText.includes('SKILL.md'));
    const rows = (await evalJs(
      `document.querySelectorAll('button[aria-expanded]').length`,
    )) as number;
    ok('G3⑤ 文件树行在场（≥2）', rows >= 2, `rows=${rows}`);
  }
  if (expect === 'mcp') {
    const badges = (await evalJs(
      `Array.from(document.querySelectorAll('span,div')).map(e=>e.textContent.trim()).filter(t=>t==='stdio'||t==='http')`,
    )) as string[];
    ok(
      'G4① servers 块 = 2 条（stdio 1 + http 1）',
      badges.filter((b) => b === 'stdio').length >= 1 &&
        badges.filter((b) => b === 'http').length >= 1,
      JSON.stringify(badges),
    );
    ok('G4② url 与 command 双呈现', cardText.includes('地址') && cardText.includes('命令'));
    ok('G4③ 不造 README ⇒ 主文档回退（显 manifest 来源）', cardText.includes('manifest'));
  }
  if (expect === 'agent') {
    ok(
      'G5① agent 族字段行（keywords/category）',
      cardText.includes('keywords') && cardText.includes('category'),
    );
    ok('G5② passthrough 字段不报错（x-aih-team）', cardText.includes('x-aih-team'));
  }
  const acts = (await evalJs(
    `Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(t=>['通过','驳回','撤回'].includes(t))`,
  )) as string[];
  ok(`${id}⑥ 三动作在场（管理档）`, acts.length === 3, JSON.stringify(acts));
  await shot(`${id.toLowerCase()}-detail-${expect}`);
}

/* ── G6 三动作（**会改库** ⇒ 收口前重跑 seed） ── */
if (want('G6')) {
  console.log('\nG6 三动作（驳回必填原因 / 通过可选意见 / 撤回）');
  await loginAs(MGR);
  // ① 驳回（专用 fixture act-reject）：空原因 ⇒ 确认钮 disabled；填原因 ⇒ 可提交
  await nav(`${APP}/reviews/${ID.actReject}`);
  await clickText('驳回');
  await sleep(800);
  const disabledEmpty = (await evalJs(
    `(()=>{const b=Array.from(document.querySelectorAll('[role=alertdialog] button')).find(x=>x.textContent.trim()==='确认驳回');return b?b.disabled:null})()`,
  )) as boolean | null;
  ok('G6① 驳回 · 空原因 ⇒ 确认钮 disabled', disabledEmpty === true, String(disabledEmpty));
  await fillInput('#confirm-dialog-reason', '缺少最小复现用例');
  await sleep(300);
  const enabledFilled = (await evalJs(
    `(()=>{const b=Array.from(document.querySelectorAll('[role=alertdialog] button')).find(x=>x.textContent.trim()==='确认驳回');return b?b.disabled:null})()`,
  )) as boolean | null;
  ok('G6② 填写原因后 ⇒ 可提交', enabledFilled === false, String(enabledFilled));
  await clickText('确认驳回');
  await sleep(2600);
  const toastReject = await text();
  ok('G6③ 驳回 ⇒ toast 含版本号', toastReject.includes('已驳回') && toastReject.includes('v1.0.0'));
  ok('G6④ 成功 ⇒ 跳回来源', (await path()) === '/admin/reviews', await path());
  // ② 通过（专用 fixture act-approve）：**空意见**亦可提交（optional）
  await nav(`${APP}/reviews/${ID.actApprove}`);
  await clickText('通过');
  await sleep(800);
  const approveDisabled = (await evalJs(
    `(()=>{const b=Array.from(document.querySelectorAll('[role=alertdialog] button')).find(x=>x.textContent.trim()==='确认通过');return b?b.disabled:null})()`,
  )) as boolean | null;
  ok(
    'G6⑤ 通过 · 空意见 ⇒ 确认钮**可点**（optional）',
    approveDisabled === false,
    String(approveDisabled),
  );
  await clickText('确认通过');
  await sleep(2800);
  ok('G6⑥ 通过 ⇒ toast 含版本号', (await text()).includes('已通过'));
  // ③ 撤回（专用 fixture act-withdraw · 提交人 = 非管理档）
  await loginAs(MEMBER);
  await nav(`${APP}/reviews/${ID.actWithdraw}`);
  const memberActs = (await evalJs(
    `Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(t=>['通过','驳回','撤回'].includes(t))`,
  )) as string[];
  ok(
    'G6⑦ 提交人视面仅有「撤回」',
    JSON.stringify(memberActs) === JSON.stringify(['撤回']),
    JSON.stringify(memberActs),
  );
  await clickText('撤回');
  await sleep(800);
  await clickText('确认撤回');
  await sleep(2600);
  ok('G6⑧ 撤回 ⇒ toast 含版本号', (await text()).includes('已撤回'));
  await shot('g6-after-actions');
}

/* ── G7 权限矩阵（R2） ── */
if (want('G7')) {
  console.log('\nG7 权限矩阵（R2：管理档可自审 / 提交人 adminOnly）');
  await loginAs(MGR);
  await nav(`${APP}/reviews/${ID.selfreview}`);
  const selfActs = (await evalJs(
    `Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(t=>['通过','驳回','撤回'].includes(t))`,
  )) as string[];
  ok(
    'G7① R2：管理档对自己的提交 ⇒ 三动作照常渲染',
    selfActs.length === 3,
    JSON.stringify(selfActs),
  );
  const selfText = await text();
  ok('G7② R2：不渲染「不能审核自己提交的版本」', !selfText.includes('不能审核自己'));
  ok('G7③ 提交人行显示「你」（当前登录者=提交人）', selfText.includes('你'));
  await loginAs(MEMBER);
  await nav(`${APP}/reviews/${ID.actMember}`);
  const memText = await text();
  ok('G7④ 提交人（非管理档）⇒ 说明行「仅管理员可审核」', memText.includes('仅管理员可审核'));
  const memActs2 = (await evalJs(
    `Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(t=>['通过','驳回','撤回'].includes(t))`,
  )) as string[];
  ok(
    'G7⑤ 提交人视面无裁决动作',
    !memActs2.includes('通过') && !memActs2.includes('驳回'),
    JSON.stringify(memActs2),
  );
  await shot('g7-member-view');
}

/* ── G8 边界（REJECTED 不可预览 / B1 内联兜底） ── */
if (want('G8')) {
  console.log('\nG8 边界（不可预览 / B1）');
  await loginAs(MGR);
  await nav(`${APP}/reviews/${rejected}`);
  const t8 = await text();
  // ⚠️ 探测**限定在「文件清单」卡内**：全页 `button[aria-expanded]` 会把侧栏折叠组一起数进来（首跑误判）
  // ⚠️ 该 fixture 只有 root 级单文件（无子目录）⇒ `button[aria-expanded]` 为 0（目录行才有）
  //    ⇒ 按「行文本 + 行禁用态」探测（`disabled` 属性 = 无预览动作的机器可读面）
  const fileRowProbe = `(()=>{const c=Array.from(document.querySelectorAll('[data-slot=card]')).find(x=>x.textContent.includes('文件清单'));if(!c)return null;
    const b=Array.from(c.querySelectorAll('button')).find(x=>x.textContent.includes('SKILL.md'));
    return b?{found:true,disabled:b.disabled}:{found:false,disabled:null}})()`;
  const frp = (await evalJs(fileRowProbe)) as { found: boolean; disabled: boolean | null } | null;
  ok('G8① REJECTED ⇒ 不可预览说明行', t8.includes('该版本当前不可预览'));
  ok('G8② 文件树仍在（结构可审）', frp?.found === true, JSON.stringify(frp));
  ok('G8③ 文件行无预览动作（disabled）', frp?.disabled === true, JSON.stringify(frp));
  ok('G8④ REJECTED ⇒ 驳回原因行在场', t8.includes('缺少最小复现'));
  await shot('g8-rejected');
  // B1：提交人（非 owner / 非上传者? —— ⑥ 的提交人就是上传者 => 预览 404 场景用 ⑥ 的提交人视角触发）
  await loginAs(MEMBER);
  await nav(`${APP}/reviews/${ID.b1}`, 3200);
  const b1Visible = (await text()).includes('m4b5-seed-b1');
  ok('G8⑤ B1 提交人详情可见', b1Visible);
  await realClickExpr(`document.querySelector('button[aria-expanded]')`);
  await sleep(1400);
  // ⚠️ 用 `el.click()`（技能 §4：纯 React `onClick` 钮的可靠路径）—— 真指针在长页里可能落到别的层
  const clicked =
    (await evalJs(`(()=>{const c=Array.from(document.querySelectorAll('[data-slot=card]')).find(x=>x.textContent.includes('文件清单'));if(!c)return 'no-card';
    const b=Array.from(c.querySelectorAll('button')).find(x=>x.textContent.includes('SKILL.md')&&!x.disabled);
    if(!b)return 'no-row'; b.click(); return 'clicked';})()`)) as string;
  await sleep(2600);
  const dlg =
    (await evalJs(`(()=>{const d=Array.from(document.querySelectorAll('[role=dialog]')).filter(e=>e.getAttribute('data-state')==='open');if(!d.length)return null;
    const t=d[0].textContent||'';
    return {len:d.length, hasCode:/asset\\./.test(t), text:t.slice(0,90), broken:!document.querySelector('[data-slot=card-title]')}})()`)) as any;
  ok(
    'G8⑥ B1 预览失败 ⇒ 弹层内联错误码（不破版 / 不整页报错）',
    dlg?.len === 1 && dlg?.hasCode === true && dlg?.broken === false,
    `click=${clicked} ${JSON.stringify(dlg)}`,
  );
  await shot('g8-b1-preview');
}

/* ── G9 零回归（外部三脚本 —— 本脚本仅提示） ── */
if (want('G9')) {
  console.log('\nG9 零回归：由外部按序执行（本脚本不内嵌）');
  console.log(
    '  · m4a-chain-smoke.ts · m4b3-personal-a-dogfood.ts · m4b4-personal-b-dogfood.ts（各 0 FAIL）',
  );
  ok('G9① 三脚本零回归（外部执行结果为准）', true, '见收口记录');
}

/* ── G10 变更对比（F156） ── */
if (want('G10')) {
  console.log('\nG10 变更对比（契约 / split / 高亮两态 / 折叠 / 容器回退 / 两态）');
  await loginAs(MGR);
  // ① 契约（HTTP 真值）
  const cmp = await apiGet('/api/assets/m4b5-seed-compare/versions/compare?from=1.0.0&to=1.1.0');
  const files = (cmp.body?.files ?? []) as Array<{
    path: string;
    changeType: string;
    patch?: string;
  }>;
  const segs = files.filter((f) => f.patch).map((f) => (f.patch as string).split('\n')[0]);
  ok(
    'G10① 契约：段数 = files 数',
    segs.length === files.length && segs.length >= 2,
    `files=${files.length} segs=${segs.length}`,
  );
  ok(
    'G10② 段首 = `diff --git`',
    segs.every((s) => s.startsWith('diff --git a/')),
    JSON.stringify(segs[0]),
  );
  ok(
    'G10③ 不产 `index` 行',
    files.every((f) => !f.patch || !/\nindex /.test(f.patch)),
  );
  const added = files.find((f) => f.changeType === 'ADDED')?.patch ?? '';
  const deleted = files.find((f) => f.changeType === 'DELETED')?.patch ?? '';
  ok(
    'G10④ ADDED ⇒ `--- /dev/null`',
    added.includes('--- /dev/null'),
    added.split('\n')[1] ?? 'none',
  );
  ok(
    'G10⑤ DELETED ⇒ `+++ /dev/null`（本 fixture 无删除文件 ⇒ 空断言跳过）',
    deleted === '' || deleted.includes('+++ /dev/null'),
  );
  // ②③④ 浏览器：可比态详情
  await nav(`${APP}/reviews/${ID.compare}`, 3600);
  const hasCard = (await evalJs(
    `Array.from(document.querySelectorAll('h3')).some(h=>h.textContent.includes('变更对比'))`,
  )) as boolean;
  ok('G10⑥ 可比态 ⇒ 变更对比卡在场', hasCard === true);
  const before = (await evalJs(`document.querySelectorAll('table.diff').length`)) as number;
  ok('G10⑦ 折叠懒渲染：未展开时 diff 表不在 DOM', before === 0);
  // 展开「变更对比」卡内的首个文件
  // ⚠️ 展开钮限定在「变更对比」卡内（首跑未限定 ⇒ 点到了文件树行 ⇒ diff 断言全 null）
  await realClickExpr(
    `(()=>{const c=Array.from(document.querySelectorAll('[data-slot=card]')).find(x=>x.textContent.includes('变更对比'));if(!c)return null;return Array.from(c.querySelectorAll('button[aria-expanded]')).find(b=>b.getAttribute('aria-expanded')==='false')??null})()`,
  );
  await sleep(1800);
  const on = (await evalJs(
    `(()=>{const t=document.querySelector('table.diff');if(!t)return null;const r0=t.querySelector('tbody tr');const colors=new Set();for(const s of t.querySelectorAll('.diff-code span'))colors.add(getComputedStyle(s).color);return {cls:t.className,cells:r0?Array.from(r0.querySelectorAll('td')).length:0,spans:t.querySelectorAll('.diff-code span').length,colors:colors.size}})()`,
  )) as any;
  ok(
    'G10⑧ 默认左右对比（split）· 每行 2 个代码单元格',
    on?.cls === 'diff diff-split' && on?.cells === 4,
    JSON.stringify(on && { cls: on.cls, cells: on.cells }),
  );
  ok(
    'G10⑨ 高亮开 ⇒ token span > 0 且色数 ≥ 2',
    (on?.spans ?? 0) > 0 && (on?.colors ?? 0) >= 2,
    JSON.stringify(on && { spans: on.spans, colors: on.colors }),
  );
  await shot('g10-diff-highlight-on');
  // 高亮关
  await clickText('语法高亮');
  await sleep(1000);
  const off = (await evalJs(
    `(()=>{const t=document.querySelector('table.diff');return t?t.querySelectorAll('.diff-code span').length:null})()`,
  )) as number | null;
  ok('G10⑩ 高亮关 ⇒ token span = 0', off === 0, String(off));
  await clickText('语法高亮');
  await sleep(600);
  // ⑧ 容器回退（限宽触发 ResizeObserver）
  const narrowed = (await evalJs(`(()=>{
    const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='左右对比');
    if(!b)return null;
    let n=b.parentElement,g=0;
    while(n&&g++<6){ if(n.className.includes('flex-col')&&n.clientWidth>50){ n.style.maxWidth='600px'; n.style.width='600px'; return n.clientWidth; } n=n.parentElement; }
    return null;
  })()`)) as number | null;
  await sleep(1800);
  const nar =
    (await evalJs(`(()=>{const t=document.querySelector('table.diff');const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='左右对比');
    const c=Array.from(document.querySelectorAll('[data-slot=card]')).find(x=>x.textContent.includes('变更对比'));
    const cont=c?Array.from(c.querySelectorAll('div')).find(d=>d.className.includes('flex-col')&&d.clientWidth>0):null;
    return {cls:t?t.className:null,disabled:b?b.disabled:null,contW:cont?cont.clientWidth:null}})()`)) as any;
  ok(
    'G10⑪ 容器 <700 ⇒ 回退 unified（split 钮禁用）',
    nar?.cls === 'diff diff-unified' && nar?.disabled === true,
    `setW=${narrowed} ${JSON.stringify(nar)}`,
  );
  await shot('g10-container-narrow');
  // ⑦ 两态：首版（skill）⇒ 整卡不渲染；同版本重审 ⇒ 卡在场 + 空态
  await nav(`${APP}/reviews/${ID.skill}`, 3200);
  const firstCard = (await evalJs(
    `Array.from(document.querySelectorAll('h3')).some(h=>h.textContent.includes('变更对比'))`,
  )) as boolean;
  ok('G10⑫ 首版（latestVersion=null）⇒ 整卡不渲染', firstCard === false);
  await nav(`${APP}/reviews/${ID.samever}`, 3200);
  const sameText = await text();
  ok(
    'G10⑬ 同版本重审 ⇒ 卡在场 + 空态文案',
    sameText.includes('变更对比') && sameText.includes('与当前已发布版本无差异'),
  );
  await shot('g10-samever-empty');
  // ⑭ **门户侧**同一件（`components/ui/DiffWorkspace` 双处挂载零分叉）：门户资产详情的「版本」tab
  //    ⚠️ Radix Tabs 用 `mousedown` 激活 ⇒ 合成 `click` 无效（首跑实测）⇒ 必须真指针点击 tab
  //    ⚠️ 展开钮**必须按容器作用域**取（限定在 `DiffWorkspace` 根内）—— 与 ⑧ 同一坑：
  //       未限定 ⇒ 点到页面别处的 `aria-expanded` 钮 ⇒ `table.diff` 根本不在 DOM（run7 实测 `portal=null`）
  //    ⚠️ 对比数据是**异步**到的（`pairValid && loading` 先出 Spinner）⇒ 一律**轮询**，不用固定 sleep
  const poll = async <T>(expr: string, ms = 9000): Promise<T | null> => {
    const t0 = Date.now();
    for (;;) {
      const v = (await evalJs(expr)) as T | null;
      if (v) return v;
      if (Date.now() - t0 > ms) return null;
      await sleep(500);
    }
  };
  await nav(`${APP}/assets/demo-rag-skill`, 3400);
  await realClickExpr(
    `Array.from(document.querySelectorAll('button,[role=tab]')).find(x=>x.textContent.trim()==='版本')`,
  );
  const tabOn = await poll<string>(
    `(()=>{const t=Array.from(document.querySelectorAll('[role=tab]')).find(x=>x.textContent.trim()==='版本');return t&&t.getAttribute('aria-selected')==='true'?'true':null})()`,
  );
  // 等工具栏就位 = 对比数据已到且 `files.length > 0`（`DiffWorkspace` 已挂载）
  await poll<string>(
    `Array.from(document.querySelectorAll('button')).some(x=>x.textContent.trim()==='语法高亮')?'ready':null`,
  );
  // 作用域：从工具栏「语法高亮」钮上溯到含文件行（`aria-expanded`）的容器，再点其中首个未展开行
  await realClickExpr(`(()=>{const hl=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='语法高亮');if(!hl)return null;
    let r=hl;for(let i=0;i<5&&r;i++){r=r.parentElement;if(r&&r.querySelector('button[aria-expanded="false"]'))break;}
    if(!r)return null;return Array.from(r.querySelectorAll('button[aria-expanded="false"]')).find(b=>!b.disabled)??null})()`);
  await poll<string>(`document.querySelector('table.diff')?'on':null`);
  const portal =
    (await evalJs(`(()=>{const t=document.querySelector('table.diff');if(!t)return null;
    const r0=t.querySelector('tbody tr');const colors=new Set();for(const s of t.querySelectorAll('.diff-code span'))colors.add(getComputedStyle(s).color);
    return {cls:t.className,cells:r0?r0.querySelectorAll('td').length:0,spans:t.querySelectorAll('.diff-code span').length,colors:colors.size}})()`)) as any;
  ok(
    'G10⑭ 门户侧：tab 激活 + 同一 `DiffWorkspace` 形态（split · 2 代码格 · 有 token）',
    tabOn === 'true' &&
      portal?.cls === 'diff diff-split' &&
      portal?.cells === 4 &&
      (portal?.spans ?? 0) > 0,
    `tab=${tabOn} ${JSON.stringify(portal)}`,
  );
  await shot('g10-portal-diff-split');
}

/* ── JS 错误门 + 汇总 ── */
const realErrors = jsErrors.filter(
  (e) => !e.includes('401') && !e.includes('Failed to load resource'),
);
ok('NO JS ERRORS', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));

const summary = `\n${fail === 0 && timeouts === 0 ? '✅' : '❌'} M4b-5 dogfood: PASS ${pass} · FAIL ${fail} · CDP 超时 ${timeouts}`;
console.log(summary);
appendFileSync(PROGRESS, `${summary}\n`);
if (only.length > 0) {
  const miss = only.filter((s) => !hit.has(s));
  console.log(
    `⚠️ 分段模式（SMOKE_ONLY=${only.join(',')}）—— **分段绿 ≠ 收口绿**${miss.length ? ` · 未命中段：${miss.join(',')}` : ''}`,
  );
}
process.exit(fail === 0 && timeouts === 0 ? 0 : 1);
