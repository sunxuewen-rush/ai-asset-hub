/**
 * M4b-3 提交与令牌批 · 本批 dogfood（**G1-G15** · 批 plan T10 断言① · 批 design §9.3）
 *
 * 覆盖：我的提交页（列渲染 / 撤回链 / 拒绝原因 / 查看跳转 / 类型列）·
 *       我的令牌页（创建两态 / 误关防护 / 掩码 / 编辑 / 删除 / Last Used warning）·
 *       跨页（未登录直访归位 + `next` / 筛选与分页的 URL 状态化含刷新与后退）
 *
 * 前置：dev 三件在线（`:3000` API / `:5173` web / `:9222` Edge CDP）
 *       + 造数已跑：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b3-seed-submissions.ts`
 *       + 两条令牌探针经产品路径创建（`m4b3-seed-stale` / `m4b3-seed-legacy`）
 *
 * 运行（二选一，**口令不入仓**）：
 *   ① 标准路径：`SMOKE_M4B2_PASSWORD=… bun docs/smoke/scripts/m4b3-personal-a-dogfood.ts`（登出后以 `m4b2_user` 重新登录）
 *      · 指定账号：追加 `SMOKE_USERNAME=<user>`（造数脚本用 `SMOKE_TARGET_USERNAME=<user>` 同参）
 *   ② 复用现有登录态：`bun docs/smoke/scripts/m4b3-personal-a-dogfood.ts`（检测 `/api/auth/me`；口令不在手时的口径）
 *
 * ⚠️ 唯一夹具点（**G1(b)**）：当前账号已有造数数据 ⇒「从未提交」空态用**浏览器侧空响应夹具**渲染（脚本内 `Page.addScriptToEvaluateOnNewDocument`，
 *    跑完即移除）。其余断言**全部走真实后端**。
 *
 * ⚠️ **G6 判据说明（2026-09-21 · 假失败订正）**：令牌 Key 列在**行无 `start`** 时显示占位符「—」
 *    ⇒ 该占位符**不构成身份**。故两处身份比对（已吊销行**泄漏** / 有效行**缺失**）**先剔除无 `start` 的行**再比；
 *    **行数净判据**（`页面行数 == 有效行数`）不受影响 ⇒ **覆盖面不降**（造数留下的 `m4b3-seed-legacy`
 *    即无 `start`：已吊销 2 行 + 有效 4 行 —— 订正前恒判「泄漏」，与改动无关的**长期假红**）。
 */
import { appendFileSync, writeFileSync } from 'node:fs';

const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const API = 'http://localhost:3000';
const SHOT = process.env.SMOKE_SHOT_PREFIX ?? 'm4b3-';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PW = process.env.SMOKE_M4B2_PASSWORD;
/** 目标账号（默认 M4b-2 的 `m4b2_user`；可用 `SMOKE_USERNAME` 指定专用账号，造数脚本同参 `SMOKE_TARGET_USERNAME`） */
const USERNAME = process.env.SMOKE_USERNAME ?? 'm4b2_user';
try {
  writeFileSync(process.env.SMOKE_LOG ?? '/tmp/m4b3-dogfood-progress.log', ''); // 清空上一跑
} catch {}

let pass = 0;
let fail = 0;
const PROGRESS = process.env.SMOKE_LOG ?? '/tmp/m4b3-dogfood-progress.log';
const ok = (name: string, cond: boolean, extra = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? `  ${extra}` : ''}`;
  if (cond) pass++;
  else fail++;
  console.log(line);
  // 逐条落盘（stdout 重定向时块缓冲 ⇒ 只有落盘才看得到实时进度）
  try {
    appendFileSync(PROGRESS, `${line}\n`);
  } catch {}
};

/* ── CDP 基础设施（沿用 M4b-2 脚本口径） ── */
const targets = (await (await fetch(`${DBG}/json`)).json()) as Array<{
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}>;
const target =
  targets.find((t) => t.type === 'page' && t.url.includes('5173')) ??
  targets.find((t) => t.type === 'page');
if (!target) throw new Error('无可用浏览器 tab（Edge CDP :9222）');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map<number, (m: any) => void>();
const jsErrors: string[] = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    jsErrors.push(
      String(msg.params?.exceptionDetails?.exception?.description ?? 'exception').slice(0, 200),
    );
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    jsErrors.push(
      msg.params.args
        .map((a: any) => String(a.value ?? a.description ?? ''))
        .join(' ')
        .slice(0, 200),
    );
  }
});
let timeouts = 0;
const send = (m: string, p?: unknown) =>
  new Promise<any>((res) => {
    const n = ++seq;
    // 超时护栏：本机长跑浏览器 CDP 偶发无响应 ⇒ 不挂死整脚本，计次后放行
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
const nav = async (url: string, wait = 2200) => {
  await send('Page.navigate', { url });
  await sleep(wait);
};
const shot = async (name: string) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data)
    writeFileSync(`docs/smoke/${SHOT}${name}.png`, Buffer.from(r.result.data, 'base64'));
};
/** 真指针点击（选择器 + 序号）；返回是否命中 */
async function realClick(selector: string, index = 0, dx = 0, dy = 0) {
  const box = (await evalJs(`(() => {
    const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2 + ${dx}, y: r.y + r.height / 2 + ${dy} });
  })()`)) as string | null;
  if (!box) return false;
  const { x, y } = JSON.parse(box) as { x: number; y: number };
  const c = { x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...c });
  await sleep(120);
  return true;
}
/** 元素级真指针点击（由 JS 表达式解析目标元素；比「选择器 + 序号」稳） */
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
  await sleep(150);
  return true;
}
/** 点某一行内的操作按钮（行按可见文本匹配，按钮按 aria-label 匹配） */
const clickRowAction = (label: string, needle: string) =>
  realClickExpr(
    `(() => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes(${JSON.stringify(needle)})); return tr ? [...tr.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '') === ${JSON.stringify(label)}) : null; })()`,
  );
/** 官方 ToggleGroup 项（**限定在打开的弹窗内**，避免命中残留的已关闭节点） */
const clickScopeItem = (needle: string) =>
  realClickExpr(
    `(() => { const d = (${openDialogs('[role="dialog"]')})[0]; if (!d) return null; return [...d.querySelectorAll('button[data-state]')].find((e) => e.innerText.includes(${JSON.stringify(needle)})) ?? null; })()`,
  );
/** 输入：真键盘为主；DOM 值不符则用原生 setter + input 事件兜底；返回是否就位 */
async function ensureInput(sel: string, value: string) {
  await focusInput(sel);
  await realType(value);
  await sleep(250);
  let v = (await evalJs(`document.querySelector(${JSON.stringify(sel)})?.value ?? null`)) as
    | string
    | null;
  if (v !== value) {
    await evalJs(
      `(() => { const i = document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`,
    );
    await sleep(250);
    v = (await evalJs(`document.querySelector(${JSON.stringify(sel)})?.value ?? null`)) as
      | string
      | null;
  }
  return v === value;
}
/** 按可见文本点按钮（真指针） */
const realClickText = async (text: string, scope = 'body') => {
  const idx = (await evalJs(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')];
    return els.findIndex((e) => (e.innerText ?? '').trim() === ${JSON.stringify(text)});
  })()`)) as number;
  if (idx < 0) return false;
  return realClick(`${scope} button`, idx);
};
/** 真键盘输入（React 受控输入：真 key 事件） */
async function realType(text: string) {
  for (const ch of text) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: ch,
      text: ch,
      unmodifiedText: ch,
    });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
    await sleep(15);
  }
}
const focusInput = (sel: string, replace = true) =>
  evalJs(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); if (!i) return false;
    i.focus(); ${replace ? 'i.setSelectionRange(0, i.value.length);' : ''} return true; })()`);
const ctrlA = async () => {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    modifiers: 4,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    modifiers: 4,
  });
};
const openDialogs = (sel: string) =>
  `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getAttribute('data-state') === 'open')`;
const waitFor = async (expr: string, timeout = 6000, step = 200) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evalJs(expr)) return true;
    await sleep(step);
  }
  return false;
};

/* ── 会话：标准路径（口令）或复用现有登录态 ── */
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
// 视口：桌面 1440×1000（**必须** —— 对话框内的按钮要落在视口内，真指针才点得到；同 `m4a-dogfood.ts` 口径）
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await sleep(300);

let sessionMode = '';
const meOf = async () =>
  (await evalJs(
    `fetch('/api/auth/me').then((r) => r.status + ':' + (r.ok ? 'ok' : 'anon'))`,
  )) as string;
if (PW) {
  sessionMode = '口令登录（标准路径）';
  await send('Network.clearBrowserCookies');
  await sleep(300);
  await nav(`${APP}/login`, 2400);
  // 真指针聚焦 + 真键盘输入（受控输入的 state 才会更新；页内 setter 在本环境实测不可靠）
  await realClickExpr(`document.querySelector('#login-username')`);
  await realType(USERNAME);
  await realClickExpr(`document.querySelector('#login-password')`);
  await realType(PW);
  const dbgLogin = (await evalJs(
    `(() => JSON.stringify({ u: document.querySelector('#login-username')?.value ?? null, pLen: document.querySelector('#login-password')?.value.length ?? -1, btnDisabled: document.querySelector('form button[type="submit"]')?.disabled, path: location.pathname }))()`,
  )) as string;
  console.log(`  · 登录诊断（提交前）：${dbgLogin}`);
  await realClickExpr(`document.querySelector('form button[type="submit"]')`);
  await sleep(2600);
  const dbgAfter = (await evalJs(
    `(async () => (await fetch('/api/auth/me')).status + ' @ ' + location.pathname)()`,
  )) as string;
  console.log(`  · 登录诊断（提交后）：${dbgAfter}`);
} else {
  sessionMode = '复用现有登录态（未提供 SMOKE_M4B2_PASSWORD）';
}
await nav(`${APP}/dashboard/submissions`, 2600);
const meStatus = await meOf();
ok(
  '前置：登录态可用（/api/auth/me 非 anon）',
  meStatus !== '401:anon',
  `${sessionMode} · me=${meStatus}`,
);
if (meStatus === '401:anon') {
  console.log('\n❌ 未登录且未提供 SMOKE_M4B2_PASSWORD ⇒ 无法继续');
  process.exit(1);
}
jsErrors.length = 0;

/* ── 前置：写通道探针（**无状态变更**：对已撤回的 task 再撤回 ⇒ 400 `review.not_pending`） ──
   本机长跑的 web dev（vite）代理会间歇卡住 POST/PATCH/DELETE（GET 正常、`curl` 直连服务端正常）
   ⇒ 探针不返回时：重启 `@ai-asset-hub/web dev` 再重跑本脚本。 */
const writeProbe = (await evalJs(
  `fetch('/api/reviews/1371/withdraw', { method: 'POST' }).then((r) => r.status).catch(() => -1)`,
)) as number;
ok(
  '前置：写通道可用（POST 探针 · 期望 400）',
  writeProbe === 400,
  `status=${writeProbe}${writeProbe === -1 ? ' ⇒ 写请求无响应：重启 web dev 后重跑' : ''}`,
);

/* ═══════════ G1 空态文案（区分两种） ═══════════ */
const scriptId = (
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => { const f = window.fetch.bind(window); window.fetch = (u, i) => {
    const s = typeof u === 'string' ? u : (u && u.url) || '';
    if (s.includes('/api/reviews/mine')) return Promise.resolve(new Response(JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }), { status: 200, headers: { 'content-type': 'application/json' } }));
    return f(u, i); }; })()`,
  })
).result?.identifier as string;
await nav(`${APP}/dashboard/submissions`, 2400);
const g1a = (await evalJs(`document.body.innerText`)) as string;
ok(
  'G1 从未提交 ⇒ 两行空态（标题 + 用途说明）',
  g1a.includes('还没有提交记录') && g1a.includes('提交资产版本后'),
  g1a.includes('还没有提交记录') ? '' : '缺空态文案',
);
await shot('G01-empty-none');
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
await nav(`${APP}/dashboard/submissions?status=APPROVED`, 2400);
const g1b = (await evalJs(`document.body.innerText`)) as string;
ok(
  'G1 筛选无结果 ⇒ 单行空态（与「从未提交」文案不同）',
  g1b.includes('当前筛选下没有记录') && !g1b.includes('还没有提交记录'),
);

/* ═══════════ G2 有数据：列渲染 + 撤回可用 + 徽章文案 ═══════════ */
await nav(`${APP}/dashboard/submissions`, 2600);
const g2 = JSON.parse(
  (await evalJs(`(() => {
    const heads = [...document.querySelectorAll('thead th')].map((t) => t.innerText.trim());
    const rows = [...document.querySelectorAll('tbody tr')].map((tr) => {
      const tds = [...tr.querySelectorAll('td')];
      const badge = tds[2].querySelector('[data-slot="badge"]');
      return {
        asset: tds[0].innerText.replace(/\\n/g, '@').trim(),
        typeText: tds[1].innerText.trim(), typeSvgs: tds[1].querySelectorAll('svg').length,
        status: badge ? badge.innerText.trim() : null, variant: badge ? badge.getAttribute('data-variant') : null,
        comment: tds[4].innerText.trim(), commentTitle: tds[4].querySelector('span')?.getAttribute('title') ?? null,
        actions: [...tds[5].querySelectorAll('button')].map((b) => b.getAttribute('aria-label')),
      };
    });
    return JSON.stringify({ heads, rows });
  })()`)) as string,
) as {
  heads: string[];
  rows: Array<{
    asset: string;
    typeText: string;
    typeSvgs: number;
    status: string | null;
    variant: string | null;
    comment: string;
    commentTitle: string | null;
    actions: string[];
  }>;
};
ok(
  'G2 列头 6 列且顺序正确',
  JSON.stringify(g2.heads) ===
    JSON.stringify(['资产', '类型', '状态', '提交时间', '拒绝原因', '操作']),
  JSON.stringify(g2.heads),
);
ok('G2 三行数据（PENDING / REJECTED / WITHDRAWN）', g2.rows.length === 3, `rows=${g2.rows.length}`);
const pendingRow = g2.rows.find((r) => r.status === '待审核');
const rejectedRow = g2.rows.find((r) => r.status === '已驳回');
const withdrawnRow = g2.rows.find((r) => r.status === '已撤回');
ok(
  'G2 徽章文案三态正确',
  !!pendingRow && !!rejectedRow && !!withdrawnRow,
  JSON.stringify(g2.rows.map((r) => r.status)),
);
ok(
  'G2 PENDING 行「撤回」可用；非 PENDING 行只有「查看」',
  !!pendingRow &&
    pendingRow.actions.includes('撤回') &&
    pendingRow.actions.includes('查看') &&
    rejectedRow?.actions.join() === '查看' &&
    withdrawnRow?.actions.join() === '查看',
  JSON.stringify(g2.rows.map((r) => r.actions)),
);
ok(
  'G2 已驳回行为 `rejected` 变体（实底蓝→紫渐变，非红）',
  rejectedRow?.variant === 'rejected',
  `variant=${rejectedRow?.variant}`,
);
await shot('G02-submissions-list');

/* ═══════════ G15 类型列（列序第 2 + TypeIcon SVG + 短文案） ═══════════ */
const typeOk = g2.rows.every(
  (r) => r.typeSvgs >= 1 && ['技能', 'MCP', '专家'].includes(r.typeText),
);
ok(
  'G15 第 2 列为「类型」，每行渲染 TypeIcon SVG + 短文案',
  g2.heads[1] === '类型' && typeOk,
  JSON.stringify(g2.rows.map((r) => [r.typeText, r.typeSvgs])),
);
ok(
  'G15 双类型覆盖（技能 + MCP）',
  new Set(g2.rows.map((r) => r.typeText)).size >= 2,
  JSON.stringify([...new Set(g2.rows.map((r) => r.typeText))]),
);

/* ═══════════ G4 拒绝原因露全文（title）+ 截断显示 ═══════════ */
const g4 = JSON.parse(
  (await evalJs(`(() => {
    const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('已驳回'));
    if (!tr) return 'null';
    const cell = tr.querySelectorAll('td')[4];
    const span = cell.querySelector('span');
    const cs = span ? getComputedStyle(span) : null;
    return JSON.stringify({ text: cell.innerText.trim(), title: span?.getAttribute('title') ?? null, ellipsis: cs?.textOverflow ?? null, maxWidth: cs?.maxWidth ?? null });
  })()`)) as string | 'null',
) as {
  text: string;
  title: string | null;
  ellipsis: string | null;
  maxWidth: string | null;
} | null;
ok(
  'G4 已驳回行露拒绝原因（截断 + title 全文）',
  !!g4 &&
    g4.text.length > 0 &&
    (g4.title ?? '').length >= g4.text.length &&
    g4.ellipsis === 'ellipsis',
  JSON.stringify(g4),
);

/* ═══════════ G14 查看跳转 /reviews/:id ═══════════ */
const g14clicked = await clickRowAction('查看', 'm4b3-seed-skill');
await sleep(2000);
const g14path = (await evalJs(`location.pathname`)) as string;
ok(
  'G14 点「查看」⇒ URL 变 `/reviews/:taskId`',
  !!g14clicked && g14path.startsWith('/reviews/'),
  `clicked=${g14clicked} path=${g14path}`,
);

/* ═══════════ G8 URL 状态化（筛选写入 / 刷新保持 / 后退） ═══════════ */
await nav(`${APP}/dashboard/submissions`, 2600);
// 官方 Select：点触发钮 → 按可见文本选「已驳回」（真指针，元素级定位）
await waitFor(`document.querySelector('#submissions-status-filter') !== null`, 8000); // 页面渲染未完成时触发钮还不在 DOM
const g8opened = await realClickExpr(`document.querySelector('#submissions-status-filter')`);
await sleep(800);
const g8picked = await realClickExpr(
  `[...document.querySelectorAll('[role="option"]')].find((o) => o.innerText.trim() === '已驳回')`,
);
await sleep(1600);
const g8url = (await evalJs(`location.search`)) as string;
ok(
  'G8 切筛选 ⇒ URL 带 `status=REJECTED`',
  !!g8opened && !!g8picked && g8url.includes('status=REJECTED'),
  `opened=${g8opened} picked=${g8picked} search=${g8url}`,
);
await nav(`${APP}/dashboard/submissions${g8url}`, 2600);
const g8keep = JSON.parse(
  (await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('role') === 'combobox'); return JSON.stringify({ sel: b ? b.innerText.trim() : null, url: location.search }); })()`,
  )) as string,
) as { sel: string | null; url: string };
ok('G8 刷新后筛选保持（Select 回显「已驳回」）', g8keep.sel === '已驳回', JSON.stringify(g8keep));
await evalJs(`history.back()`);
await sleep(1600);
const g8back = (await evalJs(`location.search`)) as string;
ok('G8 浏览器后退可回上一筛选（无 status）', !g8back.includes('status='), `search=${g8back}`);

/* ═══════════ G3 撤回链（确认 → toast → 行状态变更 + 按钮消失） ═══════════ */
await nav(`${APP}/dashboard/submissions`, 2600);
const beforeWithdraw = (await evalJs(
  `(() => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('待审核')); return !!tr; })()`,
)) as boolean;
if (beforeWithdraw) {
  const g3clicked = await clickRowAction('撤回', '待审核');
  await sleep(900);
  const dlgText = (await evalJs(
    `(${openDialogs('[role="alertdialog"]')})[0]?.innerText.replace(/\\n+/g, ' | ') ?? null`,
  )) as string | null;
  ok(
    'G3 撤回前弹确认框（含后果说明）',
    !!g3clicked && !!dlgText && dlgText.includes('确认撤回') && dlgText.includes('退回草稿'),
    `clicked=${g3clicked} dlg=${dlgText}`,
  );
  await realClickText('确认撤回', '[role="alertdialog"]');
  await sleep(2600);
  const after = JSON.parse(
    (await evalJs(`(() => {
      const toasts = [...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.innerText.trim());
      const rows = [...document.querySelectorAll('tbody tr')].map((r) => ({ s: r.querySelectorAll('td')[2].innerText.trim(), a: [...r.querySelectorAll('td')[5].querySelectorAll('button')].map((b) => b.getAttribute('aria-label')) }));
      return JSON.stringify({ toasts, rows });
    })()`)) as string,
  ) as { toasts: string[]; rows: Array<{ s: string; a: string[] }> };
  ok(
    'G3 成功 toast「已撤回」',
    after.toasts.some((t) => t.includes('已撤回')),
    JSON.stringify(after.toasts),
  );
  const withdr = after.rows.find((r) => r.s === '已撤回' && !r.a.includes('撤回'));
  ok(
    'G3 行状态变「已撤回」且「撤回」按钮消失',
    !!withdr && after.rows.filter((r) => r.s === '已撤回').length >= 2,
    JSON.stringify(after.rows.map((r) => [r.s, r.a])),
  );
} else {
  ok('G3 撤回链（跳过：无 PENDING 行 —— 请先重跑造数脚本复位）', false, '无 PENDING 行');
}
await shot('G03-after-withdraw');

/* ═══════════ G5 令牌页：空态（引用 T7 实测）+ 创建明文态 ═══════════ */
await nav(`${APP}/dashboard/tokens`, 2600);
const tokHeads = (await evalJs(
  `JSON.stringify([...document.querySelectorAll('thead th')].map((t) => t.innerText.trim()))`,
)) as string;
ok(
  'G5 令牌页 6 列列头正确',
  tokHeads === JSON.stringify(['名称', 'Key', '权限范围', '创建时间', '最后使用', '操作']),
  tokHeads,
);
// 清理上一跑残留（幂等：dogfood 可反复跑而不累积同名令牌）
await evalJs(
  `(async () => {
    const api = await fetch('/api/tokens').then((r) => r.json());
    for (const t of api.items.filter((i) => ['m4b3-dogfood-token', 'm4b3-dogfood-renamed'].includes(i.name))) {
      await fetch('/api/tokens/' + t.id, { method: 'DELETE' });
    }
    return true;
  })()`,
);
await sleep(400);
await nav(`${APP}/dashboard/tokens`, 2400); // 清理后刷新，避免 DOM 残留影响后续断言
await realClickText('创建令牌', 'body');
await sleep(1000);
const formOk = JSON.parse(
  (await evalJs(`(() => { const d = (${openDialogs('[role="dialog"]')})[0]; if (!d) return 'null';
    return JSON.stringify({ input: !!document.querySelector('#token-name'), items: d.querySelectorAll('button[data-state]').length, submitDisabled: [...d.querySelectorAll('button')].find((b) => b.innerText.trim() === '创建令牌')?.disabled }); })()`)) as
    | string
    | 'null',
) as { input: boolean; items: number; submitDisabled: boolean } | null;
ok(
  'G5 创建弹窗表单态（名称输入 + 5 项 scope + 空名禁用提交）',
  !!formOk && formOk.input && formOk.items === 5 && formOk.submitDisabled === true,
  JSON.stringify(formOk),
);
const g5name = await ensureInput('#token-name', 'm4b3-dogfood-token');
const g5item = await clickScopeItem('audit:read');
await sleep(500);
const g5ready = (await evalJs(
  `(() => { const d = (${openDialogs('[role="dialog"]')})[0]; const b = [...d.querySelectorAll('button')].find((x) => x.innerText.trim() === '创建令牌'); return JSON.stringify({ name: document.querySelector('#token-name')?.value ?? null, checkedOn: [...d.querySelectorAll('button[data-state]')].filter((e) => e.getAttribute('data-state') === 'on').length, disabled: b?.disabled }); })()`,
)) as string;
const g5submitted = await realClickText('创建令牌', '[role="dialog"]');
console.log(`  · G5 提交前诊断：${g5ready} · name=${g5name} item=${g5item} submit=${g5submitted}`);
await waitFor(`(${openDialogs('[role="dialog"]')})[0]?.querySelector('code') !== null`, 8000);
const plain = JSON.parse(
  (await evalJs(`(() => { const d = (${openDialogs('[role="dialog"]')})[0]; if (!d) return 'null';
    const code = d.querySelector('code')?.innerText ?? '';
    return JSON.stringify({ title: d.querySelector('[data-slot="dialog-title"]')?.innerText ?? null, prefix: code.slice(0, 4), len: code.length, tail: code.slice(-4), copyBtn: [...d.querySelectorAll('button')].some((b) => (b.getAttribute('aria-label') ?? '') === '复制令牌'), closeX: [...d.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Close').length, warn: d.innerText.includes('不会再次显示') || d.innerText.includes('立即复制') }); })()`)) as
    | string
    | 'null',
) as {
  title: string | null;
  prefix: string;
  len: number;
  tail: string;
  copyBtn: boolean;
  closeX: number;
  warn: boolean;
} | null;
ok(
  'G5 创建成功进明文态（`aih_` 前缀 · 47 位 · CopyButton · 一次性警告 · ✕ 隐藏）',
  !!plain &&
    plain.prefix === 'aih_' &&
    plain.len === 47 &&
    plain.copyBtn &&
    plain.warn &&
    plain.closeX === 0,
  JSON.stringify({ ...plain, token: undefined }),
);
await shot('G05-plain-state');

/* ═══════════ G10 Key 掩码（前 12 + `*****` + 后 4） ═══════════ */
const plainStart = (await evalJs(
  `(${openDialogs('[role="dialog"]')})[0]?.querySelector('code')?.innerText.slice(0, 12) ?? null`,
)) as string | null;
const plainTail = (await evalJs(
  `(${openDialogs('[role="dialog"]')})[0]?.querySelector('code')?.innerText.slice(-4) ?? null`,
)) as string | null;
const listedBefore = (await evalJs(
  `[...document.querySelectorAll('tbody tr')].some((r) => r.innerText.includes('m4b3-dogfood-token'))`,
)) as boolean;
ok('G9 明文态：列表**尚未**出现新令牌（关闭后才刷新）', !listedBefore);

/* ═══════════ G9 误关防护（Esc / 遮罩 / 复制后直接关） ═══════════ */
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Escape',
  code: 'Escape',
  windowsVirtualKeyCode: 27,
});
await send('Input.dispatchKeyEvent', {
  type: 'keyUp',
  key: 'Escape',
  code: 'Escape',
  windowsVirtualKeyCode: 27,
});
await waitFor(`(${openDialogs('[role="alertdialog"]')}).length > 0`, 4000);
const escDlg = (await evalJs(
  `(${openDialogs('[role="alertdialog"]')})[0]?.innerText.replace(/\\n+/g, ' | ') ?? null`,
)) as string | null;
const plainAlive = (await evalJs(
  `!!(${openDialogs('[role="dialog"]')})[0]?.querySelector('code')`,
)) as boolean;
ok(
  'G9 明文态按 Esc ⇒ 弹误关确认且**留在明文态**',
  !!escDlg && escDlg.includes('还没有复制') && plainAlive,
  `dlg=${escDlg}`,
);
await realClickText('返回', '[role="alertdialog"]');
await sleep(800);
ok(
  'G9 点「返回」⇒ 确认关闭、明文态保留',
  (await evalJs(`!!(${openDialogs('[role="dialog"]')})[0]?.querySelector('code')`)) === true,
);
await shot('G09-escape-guard');
// 真指针点遮罩：运行时挑一个 `elementFromPoint` 命中 overlay 的点（Radix 的 outside-pointer 判定需真指针）
const overlayPick = JSON.parse(
  (await evalJs(`(() => {
    const cands = [[8, 8], [innerWidth - 8, 8], [8, innerHeight - 8], [innerWidth - 8, innerHeight - 8]];
    for (const [x, y] of cands) {
      const el = document.elementFromPoint(x, y);
      const slot = el?.getAttribute?.('data-slot') ?? '';
      if (slot.includes('overlay')) return JSON.stringify({ x, y, slot });
    }
    const probe = document.elementFromPoint(8, 8);
    return JSON.stringify({ x: 8, y: 8, slot: (probe?.getAttribute?.('data-slot') ?? probe?.tagName ?? 'none') + ':MISS' });
  })()`)) as string,
) as { x: number; y: number; slot: string };
{
  const c = { x: overlayPick.x, y: overlayPick.y, button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...c });
  await sleep(1000);
}
const overlayDlg = (await evalJs(
  `(${openDialogs('[role="alertdialog"]')})[0]?.innerText.replace(/\\n+/g, ' | ') ?? null`,
)) as string | null;
ok(
  'G9 点遮罩 ⇒ 同样弹误关确认（真指针路径）',
  !!overlayDlg && overlayDlg.includes('还没有复制'),
  `dlg=${overlayDlg}`,
);
// 复制 → 直接关闭（不弹确认）
await realClickText('返回', '[role="alertdialog"]');
await sleep(700);
const copyIdx = (await evalJs(
  `(() => { const d = (${openDialogs('[role="dialog"]')})[0]; return [...d.querySelectorAll('button')].findIndex((b) => (b.getAttribute('aria-label') ?? '') === '复制令牌'); })()`,
)) as number;
await realClick('[role="dialog"] button', copyIdx);
await sleep(600);
await realClickText('我已保存，关闭', '[role="dialog"]');
await sleep(2200);
const closed = (await evalJs(
  `(${openDialogs('[role="dialog"]')}).length === 0 && (${openDialogs('[role="alertdialog"]')}).length === 0`,
)) as boolean;
const listedAfter = (await evalJs(
  `[...document.querySelectorAll('tbody tr')].some((r) => r.innerText.includes('m4b3-dogfood-token'))`,
)) as boolean;
ok(
  'G9 复制后点「我已保存，关闭」⇒ 无确认直接关 + 关闭后列表刷新',
  closed && listedAfter,
  `closed=${closed} listed=${listedAfter}`,
);

/* ═══════════ G10 掩码形态 + 旧数据「—」 ═══════════ */
const rowKey = (await evalJs(
  `(() => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('m4b3-dogfood-token')); return tr ? tr.querySelectorAll('td')[1].innerText.trim() : null; })()`,
)) as string | null;
ok(
  'G10 Key 列掩码 = 前 12 + `*****` + 后 4',
  !!rowKey && !!plainStart && !!plainTail && rowKey === `${plainStart}*****${plainTail}`,
  `masked=${rowKey}`,
);
const legacyKey = (await evalJs(
  `(() => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('m4b3-seed-legacy')); return tr ? tr.querySelectorAll('td')[1].innerText.trim() : null; })()`,
)) as string | null;
ok(
  'G10 旧令牌（`start`/`metadata` null）Key 列显「—」',
  legacyKey === '—',
  `legacyKey=${legacyKey}`,
);

/* ═══════════ G13 Last Used warning 色 ═══════════ */
const g13 = JSON.parse(
  (await evalJs(`(() => {
    const pick = (name) => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes(name)); if (!tr) return null; const cell = tr.querySelectorAll('td')[4]; const s = cell.querySelector('span') ?? cell; return { text: cell.innerText.trim(), cls: s.className, color: getComputedStyle(s).color }; };
    return JSON.stringify({ stale: pick('m4b3-seed-stale'), fresh: pick('m4b3-dogfood-token') });
  })()`)) as string,
) as {
  stale: { text: string; cls: string; color: string } | null;
  fresh: { text: string; cls: string; color: string } | null;
};
ok(
  'G13 超 3 个月 ⇒ `text-warning`；未使用 ⇒ 默认 muted',
  !!g13.stale &&
    g13.stale.cls.includes('text-warning') &&
    !!g13.fresh &&
    !g13.fresh.cls.includes('text-warning'),
  JSON.stringify(g13),
);

/* ═══════════ G11 编辑（改名 + 改权限） ═══════════ */
const g11clicked = await clickRowAction('编辑', 'm4b3-dogfood-token');
await sleep(1100);
if (!(await evalJs(`document.querySelector('#token-edit-name') !== null`))) {
  // 兜底：页内 click（仅当真指针未生效时；行操作钮是普通 React onClick）
  await evalJs(
    `(() => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('m4b3-dogfood-token')); const b = tr && [...tr.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '编辑'); b?.click(); return !!b; })()`,
  );
  await sleep(900);
}
await waitFor(`document.querySelector('#token-edit-name') !== null`, 8000);
await sleep(300);
const editInit = (await evalJs(`document.querySelector('#token-edit-name')?.value ?? null`)) as
  | string
  | null;
await ensureInput('#token-edit-name', 'm4b3-dogfood-renamed');
await sleep(300);
const g11saved = await realClickText('保存', '[role="dialog"]');
await waitFor(`(${openDialogs('[role="dialog"]')}).length === 0`, 8000);
const g11 = JSON.parse(
  (await evalJs(
    `(() => JSON.stringify({ toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.innerText.trim()), listed: [...document.querySelectorAll('tbody tr')].some((r) => r.innerText.includes('m4b3-dogfood-renamed')) }))()`,
  )) as string,
) as { toasts: string[]; listed: boolean };
ok(
  'G11 编辑：初值回显 + 保存 toast「已保存」+ 列表回显新名',
  !!g11clicked &&
    !!g11saved &&
    editInit === 'm4b3-dogfood-token' &&
    g11.toasts.some((t) => t.includes('已保存')) &&
    g11.listed,
  JSON.stringify({ g11clicked, g11saved, editInit, ...g11 }),
);

/* ═══════════ G12 删除（确认按钮非红 + 行消失） ═══════════ */
const g12clicked = await clickRowAction('删除', 'm4b3-dogfood-renamed');
await sleep(1100);
if (!(await evalJs(`(${openDialogs('[role="alertdialog"]')}).length > 0`))) {
  await evalJs(
    `(() => { const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('m4b3-dogfood-renamed')); const b = tr && [...tr.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '删除'); b?.click(); return !!b; })()`,
  );
  await sleep(900);
}
await waitFor(`(${openDialogs('[role="alertdialog"]')}).length > 0`, 8000);
await sleep(300);
const g12dlg = JSON.parse(
  (await evalJs(`(() => { const a = (${openDialogs('[role="alertdialog"]')})[0]; if (!a) return 'null';
    const confirm = [...a.querySelectorAll('button')].find((b) => b.innerText.trim() === '确认删除');
    return JSON.stringify({ text: a.innerText.replace(/\\n+/g, ' | '), confirmClasses: confirm ? confirm.className : null, destructive: confirm ? /(^|\\s)bg-destructive/.test(confirm.className) : null }); })()`)) as
    | string
    | 'null',
) as { text: string; confirmClasses: string | null; destructive: boolean | null } | null;
ok(
  'G12 删除弹窗确认按钮**无红**（primary）',
  !!g12clicked &&
    !!g12dlg &&
    g12dlg.destructive === false &&
    (g12dlg.confirmClasses ?? '').includes('bg-primary'),
  JSON.stringify({ g12clicked, ...(g12dlg ?? {}) }),
);
await realClickText('确认删除', '[role="alertdialog"]');
await sleep(2600);
const g12after = JSON.parse(
  (await evalJs(
    `(() => JSON.stringify({ toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.innerText.trim()), gone: ![...document.querySelectorAll('tbody tr')].some((r) => r.innerText.includes('m4b3-dogfood-renamed')) }))()`,
  )) as string,
) as { toasts: string[]; gone: boolean };
ok(
  'G12 删除后该行从列表消失 + toast「已删除」',
  g12after.gone && g12after.toasts.some((t) => t.includes('已删除')),
  JSON.stringify(g12after),
);
await shot('G12-after-delete');

/* ═══════════ G6 令牌吊销（本批最终设计口径：只显有效 ⇒ 删除后不再显示） ═══════════ */
await nav(`${APP}/dashboard/tokens`, 2600); // G6 对账前刷新：DOM 与接口状态对齐
const g6 = JSON.parse(
  (await evalJs(`(async () => {
    // 自造一条「已吊销」探针：真接口签发 → 真接口删除（服务端语义 = 吊销，保留行）
    const created = await fetch('/api/tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'm4b3-dogfood-revoked' }) }).then((r) => r.json());
    if (created?.id) await fetch('/api/tokens/' + created.id, { method: 'DELETE' });
    const api = await fetch('/api/tokens').then((r) => r.json());
    // 无 start ⇒ 返回 null（占位符不是身份；比对前剔除 —— 见件头 G6 判据说明）
    const rowKey = (i) => (i.start ? String(i.start).slice(0, 12) : null);
    const items = api.items.map((i) => ({ n: i.name, key: rowKey(i), revoked: i.revokedAt !== null }));
    const dom = [...document.querySelectorAll('tbody tr')].map((r) => r.querySelectorAll('td')[1].innerText.trim().slice(0, 12));
    return JSON.stringify({
      statusColumn: [...document.querySelectorAll('thead th')].some((t) => t.innerText.trim() === '状态'),
      revokedTotal: items.filter((i) => i.revoked).length,
      enabledTotal: items.filter((i) => !i.revoked).length,
      domCount: dom.length,
      revokedLeaked: items.filter((i) => i.revoked && i.key !== null).map((i) => i.key).filter((k) => dom.includes(k)),
      enabledMissing: items.filter((i) => !i.revoked && i.key !== null).map((i) => i.key).filter((k) => !dom.includes(k)),
    });
  })()`)) as string,
) as {
  statusColumn: boolean;
  revokedTotal: number;
  enabledTotal: number;
  domCount: number;
  revokedLeaked: string[];
  enabledMissing: string[];
};
ok(
  'G6 只显有效：接口 `revokedAt !== null` 的行**零泄漏**、有效行**零缺失**（本页无「状态」列 —— 与 §4.2 最终设计一致；**无 `start` 的行不参与 key 比对** —— 占位符不构成身份，行数口径另由 domCount 兜住）',
  !g6.statusColumn &&
    g6.revokedTotal >= 1 &&
    g6.revokedLeaked.length === 0 &&
    g6.enabledMissing.length === 0 &&
    g6.domCount === g6.enabledTotal,
  JSON.stringify(g6),
);

/* ═══════════ G16–G19 「我的资产」表格族统一（T11-k k1：排序头 / 列开关 / 视图切换 / 搜索） ═══════════
   ⚠ 本段**必须在 G7 之前**（G7 会清 cookie，序比对需要会话）。
   序比对走接口（带会话 cookie）⇒ 只依赖本账号自己的数据（AGENTS.md「测试只依赖自己造的数据」）。 */
const sessToken = (
  (await send('Network.getAllCookies')).result?.cookies as Array<{ name: string; value: string }>
).find((c) => c.name === 'better-auth.session_token')?.value;
const apiOrder = async (q: string) => {
  const r = await fetch(`http://localhost:3000/api/me/assets?limit=20${q}`, {
    headers: { cookie: `better-auth.session_token=${sessToken}` },
  });
  const j = (await r.json()) as { items?: Array<{ slug: string }> };
  return (j.items ?? []).map((i) => i.slug);
};
const pageSlugs = () =>
  evalJs(
    `[...document.querySelectorAll('tbody a[href^="/assets/"]')].map((a) => a.getAttribute('href').replace('/assets/', ''))`,
  ) as Promise<string[]>;
const G_SORT_BTN = `[...document.querySelectorAll('button[aria-label="排序"]')][0]`;
const G_COL_BTN = `document.querySelector('button[aria-label="列显示"]')`;
const G_SEARCH_BTN = `[...document.querySelectorAll('button[aria-label="搜索"]')].find((b) => b.hasAttribute('aria-expanded'))`;

await nav(`${APP}/dashboard/assets`, 3000);
const g16head = JSON.parse(
  (await evalJs(
    `JSON.stringify([...document.querySelectorAll('thead th')].map((th) => ({ text: (th.textContent || '').trim(), btn: !!th.querySelector('button') })))`,
  )) as string,
) as Array<{ text: string; btn: boolean }>;
ok(
  'G16 表头 9 列 · 「操作」**可见** · **仅** 下载/收藏/更新 三列可点（D0-5 列表态只列头可点）',
  g16head.length === 9 &&
    g16head[8].text === '操作' &&
    g16head
      .filter((h) => h.btn)
      .map((h) => h.text)
      .join('/') === '下载/收藏/更新',
  JSON.stringify(g16head.map((h) => `${h.text}${h.btn ? ':btn' : ''}`)),
);

const g17probe = async (col: string, sortKey: string, dir: string) => {
  await realClickExpr(
    `[...document.querySelectorAll('thead th button')].find((b) => (b.closest('th').textContent || '').trim().startsWith(${JSON.stringify(col)}))`,
  );
  await sleep(1900);
  const aria = (await evalJs(
    `(() => { const t = [...document.querySelectorAll('thead th')].find((x) => (x.textContent || '').trim().startsWith(${JSON.stringify(col)})); return t ? t.getAttribute('aria-sort') : null; })()`,
  )) as string;
  return {
    url: (await evalJs(`location.pathname + location.search`)) as string,
    aria,
    rows: (await pageSlugs()).join('|'),
    api: (await apiOrder(`&sort=${sortKey}&dir=${dir}`)).join('|'),
  };
};
const g17a = await g17probe('下载', 'downloads', 'desc');
const g17b = await g17probe('下载', 'downloads', 'asc');
ok(
  'G17 列头两态 + URL 同步 + 列表序与接口**逐项一致**（首点 `desc` · 再点 `asc`）',
  g17a.url === '/dashboard/assets?sort=downloads&dir=desc' &&
    g17a.aria === 'descending' &&
    g17a.rows === g17a.api &&
    g17b.url === '/dashboard/assets?sort=downloads&dir=asc' &&
    g17b.aria === 'ascending' &&
    g17b.rows === g17b.api,
  `${g17a.url} [${g17a.aria}] · ${g17b.url} [${g17b.aria}] · 序一致=${g17a.rows === g17a.api && g17b.rows === g17b.api}`,
);

await realClickExpr(G_COL_BTN);
await sleep(800);
const g18menu = JSON.parse(
  (await evalJs(
    `(() => { const its = [...document.querySelectorAll('[role="menuitemcheckbox"]')]; return JSON.stringify({ n: its.length, disabled: its.filter((i) => i.getAttribute('data-disabled') !== null || i.hasAttribute('disabled')).length, checked: its.filter((i) => i.getAttribute('aria-checked') === 'true').length, required: its.filter((i) => (i.textContent || '').includes('必显')).length }); })()`,
  )) as string,
) as { n: number; disabled: number; checked: number; required: number };
await realClickExpr(
  `[...document.querySelectorAll('[role="menuitemcheckbox"]')].find((i) => (i.textContent || '').trim() === '类型')`,
);
await sleep(900);
const g18hidden = JSON.parse(
  (await evalJs(
    `(() => { const ths = [...document.querySelectorAll('thead th')]; const badge = [...document.querySelectorAll('span')].find((s) => /^[0-9]+$/.test((s.textContent || '').trim()) && (s.className || '').includes('rounded-full')); return JSON.stringify({ cols: ths.length, hasType: ths.some((t) => (t.textContent || '').trim() === '类型'), badge: badge ? (badge.textContent || '').trim() : null }); })()`,
  )) as string,
) as { cols: number; hasType: boolean; badge: string | null };
await realClickExpr(
  `[...document.querySelectorAll('[role="menuitem"]')].find((i) => (i.textContent || '').trim() === '重置为默认')`,
);
await sleep(900);
await realClickExpr(
  `[...document.querySelectorAll('[role="menuitemcheckbox"]')].find((i) => (i.textContent || '').trim().startsWith('名称'))`,
);
await sleep(700);
const g18reset = JSON.parse(
  (await evalJs(
    `(() => { const ths = [...document.querySelectorAll('thead th')]; return JSON.stringify({ cols: ths.length, first: (ths[0]?.textContent || '').trim() }); })()`,
  )) as string,
) as { cols: number; first: string };
ok(
  'G18 列开关：**9 项**（8 数据列 + 动作槽）· 保护列 **2** 置灰「必显」· 勾掉「类型」⇒ 表头少一列 + **角标 1** · 重置 ⇒ 回 9 · 保护列「名称」**关不掉**',
  g18menu.n === 9 &&
    g18menu.disabled === 2 &&
    g18menu.required === 2 &&
    g18menu.checked === 9 &&
    g18hidden.cols === 8 &&
    !g18hidden.hasType &&
    g18hidden.badge === '1' &&
    g18reset.cols === 9 &&
    g18reset.first === '名称',
  JSON.stringify({ menu: g18menu, hidden: g18hidden, reset: g18reset }),
);

// 注：G18 末点的「重置为默认」是 `DropdownMenuItem` ⇒ **会关闭菜单**（`CheckboxItem` 才 keep-open）
// ⇒ 此处不再点触发钮（否则把菜单重新打开，后续点击被遮罩吃掉 —— 第二跑实测踩到）
const g19list = JSON.parse(
  (await evalJs(
    `(() => JSON.stringify({ th: document.querySelectorAll('thead th').length, colBtn: !!(${G_COL_BTN}), sortBtn: !!(${G_SORT_BTN}) }))()`,
  )) as string,
) as { th: number; colBtn: boolean; sortBtn: boolean };
await realClickExpr(`document.querySelector('button[aria-label="网格视图"]')`);
await sleep(1600);
const g19grid = JSON.parse(
  (await evalJs(
    `(() => { const c = document.querySelector('a[href^="/assets/"]')?.closest('[data-slot="card"]'); const av = c ? c.querySelector('[data-slot="avatar"]') : null; return JSON.stringify({ th: document.querySelectorAll('thead th').length, cards: document.querySelectorAll('a[href^="/assets/"]').length, colBtn: !!(${G_COL_BTN}), sortBtn: !!(${G_SORT_BTN}), avatar: av ? Math.round(av.getBoundingClientRect().width) : null, pills: [...document.querySelectorAll('[data-slot="card"] span')].filter((s) => ['活跃', '已隐藏', '已归档'].includes((s.textContent || '').trim())).length }); })()`,
  )) as string,
) as {
  th: number;
  cards: number;
  colBtn: boolean;
  sortBtn: boolean;
  avatar: number | null;
  pills: number;
};
await shot('05-console-grid');
await realClickExpr(`document.querySelector('button[aria-label="列表视图"]')`);
await sleep(1500);
await realClickExpr(G_SEARCH_BTN);
await sleep(800);
const g19search = JSON.parse(
  (await evalJs(
    `(() => { const b = ${G_SEARCH_BTN}; const ins = [...document.querySelectorAll('[data-slot="input-group-control"]')]; const last = ins[ins.length - 1]; return JSON.stringify({ expanded: b ? b.getAttribute('aria-expanded') : null, groups: ins.length, focus: document.activeElement === last, w: last ? Math.round(last.getBoundingClientRect().width) : null }); })()`,
  )) as string,
) as { expanded: string | null; groups: number; focus: boolean; w: number | null };
ok(
  'G19 视图切换（默认列表 · 两钮互斥 · 卡片 40px 色块 + 状态徽标 · 切回列表）+ 搜索对齐（点开 ⇒ 面板撑满 + 自动聚焦）',
  g19list.th === 9 &&
    g19list.colBtn &&
    !g19list.sortBtn &&
    g19grid.th === 0 &&
    g19grid.cards > 0 &&
    !g19grid.colBtn &&
    g19grid.sortBtn &&
    g19grid.avatar === 40 &&
    g19grid.pills > 0 &&
    g19search.expanded === 'true' &&
    g19search.groups === 2 &&
    g19search.focus &&
    (g19search.w ?? 0) > 900,
  JSON.stringify({ list: g19list, grid: g19grid, search: g19search }),
);

/* ═══════════ G7 未登录直访两页 ⇒ 归位登录（保 next） ═══════════ */
const cookies = (await send('Network.getAllCookies')).result?.cookies as Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
}>;
const sess = cookies.find((c) => c.name === 'better-auth.session_token');
ok('前置：取到会话 cookie（供 G7 复原）', !!sess);
await send('Network.clearBrowserCookies');
await sleep(400);
await nav(`${APP}/dashboard/submissions`, 2600);
const g7a = JSON.parse(
  (await evalJs(
    `(() => JSON.stringify({ path: location.pathname, search: location.search }))()`,
  )) as string,
) as { path: string; search: string };
ok(
  'G7 未登录直访 /dashboard/submissions ⇒ 归位 /login 且保 next',
  g7a.path === '/login' &&
    g7a.search.includes('next=') &&
    decodeURIComponent(g7a.search).includes('/dashboard/submissions'),
  JSON.stringify(g7a),
);
await nav(`${APP}/dashboard/tokens`, 2600);
const g7b = JSON.parse(
  (await evalJs(
    `(() => JSON.stringify({ path: location.pathname, search: location.search }))()`,
  )) as string,
) as { path: string; search: string };
ok(
  'G7 未登录直访 /dashboard/tokens ⇒ 同样归位登录',
  g7b.path === '/login' && decodeURIComponent(g7b.search).includes('/dashboard/tokens'),
  JSON.stringify(g7b),
);
if (sess) {
  await send('Network.setCookie', {
    name: sess.name,
    value: sess.value,
    domain: 'localhost',
    path: sess.path ?? '/',
    httpOnly: sess.httpOnly,
  });
  await sleep(400);
  await nav(`${APP}/dashboard/tokens`, 2600);
  const restored = (await evalJs(`location.pathname`)) as string;
  ok('G7 复原会话（回到 /dashboard/tokens）', restored === '/dashboard/tokens', `path=${restored}`);
}

/* ── 收尾 ── */
await sleep(600);
await send('Emulation.clearDeviceMetricsOverride');
const errs = jsErrors.filter((e) => !/404/.test(e));
ok('NO JS ERRORS（网络层 404 不计）', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(
  `\n${fail === 0 && timeouts === 0 ? '✅' : '❌'} M4b-3 dogfood: PASS ${pass} · FAIL ${fail} · CDP 超时 ${timeouts}（登录口径：${sessionMode}）`,
);
console.log(`截图前缀：docs/smoke/${SHOT}*.png`);
process.exit(fail === 0 ? 0 : 1);
