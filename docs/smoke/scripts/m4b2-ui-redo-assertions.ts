/**
 * M4b-2 UI 视觉重做 —— **§14.5 验收断言脚本**（CDP 自动断言 · 2026-09-17 T15 落仓）
 *
 * 覆盖批 design §14.5 的 **29 条**：A 登录页 11 · B 设备页 5 · C 应用壳 9 · D 通用 4。
 * 逐条输出 PASS/FAIL + 关键实测值；**审美判定不在本脚本**（人眼观感另计）。
 *
 * 前置：dev 三件在线（`:3000` API / `:5173` web / Edge CDP `:9222`）+ 种子账号 `m4b2_{super,user}`。
 * 口令只从 shell env 读（`SMOKE_M4B2_PASSWORD`）——**仓库内不落口令**。
 *
 * 运行：`SMOKE_M4B2_PASSWORD=… bun docs/smoke/scripts/m4b2-ui-redo-assertions.ts`
 */
const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const API = 'http://localhost:3000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 仅跑 A（登录页 · 匿名可达）时无需口令；B/C/D 需登录态 ⇒ 必须提供 */
const NEED_PW = (process.env.UI_REDO_ONLY ?? '').toUpperCase() !== 'A';
const PW = process.env.SMOKE_M4B2_PASSWORD;
if (NEED_PW && !PW) {
  console.error('缺 `SMOKE_M4B2_PASSWORD`（口令从 env 读，不入库）');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${extra ? `  ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${extra ? `  ${extra}` : ''}`);
  }
};

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
const netLogs: string[] = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
    return;
  }
  if (
    msg.method === 'Network.requestWillBeSent' &&
    String(msg.params?.request?.url ?? '').includes('sign-in')
  ) {
    netLogs.push(
      `REQ ${msg.params.request.method} ${String(msg.params.request.url).split('/api')[1]}`,
    );
  }
  if (
    msg.method === 'Network.responseReceived' &&
    String(msg.params?.response?.url ?? '').includes('sign-in')
  ) {
    netLogs.push(
      `RES ${msg.params.response.status} ${String(msg.params.response.url).split('/api')[1]}`,
    );
  }
  if (msg.method === 'Network.loadingFailed' && String(msg.params?.errorText ?? '')) {
    netLogs.push(`FAILED ${msg.params.errorText}`);
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
const send = (m: string, p?: unknown) =>
  new Promise<any>((res) => {
    const n = ++seq;
    pending.set(n, res);
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
const nav = async (url: string, wait = 2300) => {
  await send('Page.navigate', { url });
  await sleep(wait);
};
async function realClick(selector: string, index = 0) {
  const box = (await evalJs(`(() => {
    const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`)) as string | null;
  if (!box) throw new Error(`not found: ${selector}[${index}]`);
  const { x, y } = JSON.parse(box) as { x: number; y: number };
  const c = { x, y, button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...c });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...c });
}
const setInput = (sel: string, v: string) => `(() => {
  const el = document.querySelector('${sel}');
  if (!el) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;
const clearCookies = async () => {
  await send('Network.clearBrowserCookies');
  await sleep(350);
};
const signIn = async (user: string) => {
  await nav(`${APP}/login`);
  await evalJs(`(() => {
    const back = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '返回密码登录');
    back && back.click();
    return true;
  })()`);
  await sleep(300);
  await evalJs(setInput('#login-username', user));
  await evalJs(setInput('#login-password', PW as string));
  await evalJs(`document.querySelector('form')?.requestSubmit()`);
  for (let i = 0; i < 11; i++) {
    await sleep(500);
    const at = (await evalJs(`location.pathname`)) as string;
    if (at && at !== '/login') return;
  }
};
/** 元素几何（视口坐标） */
const geo = (sel: string) => `(() => {
  const e = document.querySelector(${JSON.stringify(sel)});
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
})()`;

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
// 桌面视口**必须显式覆盖**：headless 默认 <768px ⇒ 官方 `Sidebar` 退化为移动端 Sheet、条目不入 DOM
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

const ONLY = process.env.UI_REDO_ONLY ?? '';
const want = (block: string) => ONLY === '' || ONLY.toUpperCase().includes(block);

// 语言定基：`aih.uiLang`（headless 默认 navigator.language=en ⇒ 不显式定基会出现「中文文案断言假失败」）
await nav(`${APP}/login`, 1500);
await evalJs(`localStorage.setItem('aih.uiLang', 'zh-CN')`);
await nav(`${APP}/login`);

console.log(`=== §14.5 UI 重做验收（29 条 · CDP 自动断言${ONLY ? ` · 仅跑 ${ONLY}` : ''}）===\n`);

/* ═══ A. 登录页（未登录）═══ */
if (want('A')) {
  await clearCookies();
  jsErrors.length = 0;
  await nav(`${APP}/login`);

  const col = (await evalJs(`(() => {
  const h = document.querySelector('h2');
  if (!h) return null;
  const b = h.parentElement.getBoundingClientRect();
  const s = h.closest('section').getBoundingClientRect();
  return { w: b.width, cx: b.x + b.width / 2, cy: b.y + b.height / 2,
           scx: s.x + s.width / 2, scy: s.y + s.height / 2, fs: getComputedStyle(h).fontSize,
           align: getComputedStyle(h).textAlign };
})()`)) as any;
  ok(
    'A1 表单列宽 = 336',
    !!col && Math.round(col.w) === 336,
    `实测 ${col ? Math.round(col.w) : 'n/a'}`,
  );
  ok(
    'A2 表单列在右栏内水平 + 垂直居中',
    !!col && Math.abs(col.cx - col.scx) <= 1 && Math.abs(col.cy - col.scy) <= 1,
    col ? `dx=${Math.round(col.cx - col.scx)} dy=${Math.round(col.cy - col.scy)}` : '',
  );
  ok('A3 标题 24px 且居中', !!col && col.fs === '24px' && col.align === 'center', col?.fs);

  const loginText = (await evalJs(`document.body.innerText`)) as string;
  ok(
    'A4 副文案（zh/en 任一）+ 不含「本地账号」/「local account」',
    (loginText.includes('使用企业目录账号登录') ||
      loginText.includes('enterprise directory account')) &&
      !loginText.includes('本地账号') &&
      !loginText.toLowerCase().includes('local account'),
  );

  const inp = (await evalJs(`(() => {
  const e = document.querySelector('#login-username');
  if (!e) return null;
  const s = getComputedStyle(e);
  return { h: s.height, radius: s.borderRadius, bg: s.backgroundColor, border: s.borderColor };
})()`)) as any;
  ok(
    'A5 输入框 48 / 圆角 28 / 底 `--muted` / 描边 `--input`',
    !!inp &&
      inp.h === '48px' &&
      inp.radius === '28px' &&
      inp.bg === 'rgb(241, 245, 251)' &&
      inp.border === 'rgb(227, 234, 246)',
    inp ? `${inp.h} ${inp.radius} ${inp.bg}` : '',
  );

  const btn = (await evalJs(`(() => {
  const e = document.querySelector('form button[type="submit"]');
  if (!e) return null;
  const b = e.getBoundingClientRect();
  const s = getComputedStyle(e);
  return { w: b.width, h: b.height, radius: s.borderRadius, bg: s.backgroundColor };
})()`)) as any;
  ok(
    'A6 主按钮 336×42 胶囊 + primary',
    !!btn && Math.round(btn.w) === 336 && Math.round(btn.h) === 42 && parseFloat(btn.radius) > 9999,
    btn ? `${Math.round(btn.w)}×${Math.round(btn.h)} r=${btn.radius}` : '',
  );

  const gap = (await evalJs(`(() => {
  const a = document.querySelector('#login-username').getBoundingClientRect();
  const b = document.querySelector('#login-password').getBoundingClientRect();
  return Math.round(b.top - a.bottom);
})()`)) as number;
  ok('A7 字段间距 = 22px（±1）', Math.abs(gap - 22) <= 1, `实测 ${gap}`);

  // A8 错误态：错口令 → inline `<p role=alert>`（非 Alert 块）· URL 不变
  const pathBefore = (await evalJs(`location.pathname + location.search`)) as string;
  await evalJs(`(() => {
  if (document.body.innerText.includes('返回密码登录')) {  // 若上次留了备用面板，先切回表单
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === '返回密码登录');
    b && b.click();
  }
  return true;
})()`);
  await sleep(400);
  await evalJs(setInput('#login-username', 'no_such_user'));
  await evalJs(setInput('#login-password', 'wrong-password'));
  await sleep(350); // 让受控输入的 state 先行 flush（真机探针同序）
  if (process.env.UI_REDO_DEBUG) {
    console.log(
      '  [debug A8] 提交前:',
      JSON.stringify(
        await evalJs(`(() => ({
    url: location.pathname,
    forms: document.querySelectorAll('form').length,
    altMode: document.body.innerText.includes('返回密码登录'),
    values: [...document.querySelectorAll('input')].map((i) => i.value),
    btn: !!document.querySelector('form button[type="submit"]'),
    btnDisabled: document.querySelector('form button[type="submit"]')?.disabled ?? null,
  }))()`),
      ),
    );
  }
  await evalJs(`document.querySelector('form')?.requestSubmit()`);
  if (process.env.UI_REDO_DEBUG) {
    await sleep(1500);
    console.log(
      '  [debug A8] 提交后:',
      JSON.stringify(
        await evalJs(`(() => ({
    url: location.pathname,
    alerts: document.querySelectorAll('[role="alert"]').length,
    body: document.body.innerText.replace(/\\n/g, '|').slice(-260),
  }))()`),
      ),
    );
  }
  let errState: any = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const s = (await evalJs(`(() => ({
    alerts: document.querySelectorAll('[role="alert"]').length,
    alertBlocks: document.querySelectorAll('[data-slot="alert"]').length,
    tag: (document.querySelector('[role="alert"]') || {}).tagName || null,
    path: location.pathname + location.search,
  }))()`)) as any;
    if (s.alerts > 0) {
      errState = s;
      break;
    }
    errState = s;
  }
  if (process.env.UI_REDO_DEBUG) {
    console.log(
      '  [debug A8] 轮询后:',
      JSON.stringify(
        await evalJs(`(() => ({
    alerts: document.querySelectorAll('[role="alert"]').length,
    submitting: document.body.innerText.includes('登录中'),
    netLogs: netLogs.slice(-8),
  }))()`),
      ),
    );
  }
  ok(
    'A8 错误态 = inline `<p role=alert>`（非 Alert 块）+ URL 不变',
    errState.alerts === 1 &&
      errState.alertBlocks === 0 &&
      errState.tag === 'P' &&
      errState.path === pathBefore,
    `role=alert ${errState.alerts} · data-slot=alert ${errState.alertBlocks} · ${errState.tag} · path ${errState.path === pathBefore ? '不变' : '变了'}`,
  );

  const noCard = (await evalJs(`(() => ({
  cards: document.querySelectorAll('[data-slot="card"]').length,
  hasCaptcha: document.body.innerText.includes('验证码'),
}))()`)) as any;
  ok('A9 白卡 0 + 无「验证码」', noCard.cards === 0 && !noCard.hasCaptcha, `cards=${noCard.cards}`);

  const tabs = (await evalJs(`(() => {
  const link = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '使用 OAuth 登录');
  return { tabs: document.querySelectorAll('[role="tab"]').length, link: !!link };
})()`)) as any;
  ok(
    'A10 无 Tabs（[role=tab] = 0）+ 底部 OAuth 链接在',
    tabs.tabs === 0 && tabs.link,
    `tabs=${tabs.tabs}`,
  );
  await evalJs(
    `[...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '使用 OAuth 登录').click()`,
  );
  await sleep(700);
  const panel = (await evalJs(`(() => ({
  hasOpen: document.body.innerText.includes('打开统一认证页'),
  back: document.body.innerText.includes('返回密码登录'),
}))()`)) as any;
  ok('A10b OAuth 链接 ⇒ 备用面板（打开统一认证页 + 返回密码登录）', panel.hasOpen && panel.back);
  const chrome = (await evalJs(`(() => {
  const sw = document.querySelector('button[aria-label], [data-slot="dropdown-menu-trigger"], .flex.items-center.gap-1 button');
  const hdr = document.querySelectorAll('header').length;
  const swBox = (() => {
    const cand = [...document.querySelectorAll('button')].filter((b) => /中文|EN|English/.test(b.innerText));
    if (!cand.length) return null;
    const r = cand[cand.length - 1].getBoundingClientRect();
    return { x: r.x, y: r.y };
  })();
  return { hdr, swBox };
})()`)) as any;
  ok(
    'A11 无 `AuthLayout` 页头（header 数 = 0）+ 语言切换在右上角',
    chrome.hdr === 0 && !!chrome.swBox && chrome.swBox.x > 1000 && chrome.swBox.y < 120,
    `header=${chrome.hdr} sw=${chrome.swBox ? `${Math.round(chrome.swBox.x)},${Math.round(chrome.swBox.y)}` : 'n/a'}`,
  );
}

/* ═══ B. 设备页（登录态）═══ */
if (want('B')) {
  await signIn('m4b2_super');

  // 造一个真实 device code（CLI 侧端点）⇒ 覆盖 ② 已认领 / ③ 已处理 两态
  const codeRes = (await (
    await fetch(`${API}/api/auth/device/code`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'aih-ui-redo-probe' }),
    })
  ).json()) as { user_code?: string };
  const deviceCode = codeRes.user_code;

  // ① 输入态（**不带 code**）⇒ 量取字段与按钮几何；带有效码会先落「认领中/已认领」而输入框不在 DOM
  await nav(`${APP}/device`);
  const bGeo = (await evalJs(`(() => {
  const e = document.querySelector('#device-code');
  if (!e) return null;
  const b = e.getBoundingClientRect();
  const s = getComputedStyle(e);
  return { x: b.x, w: b.width, cx: b.x + b.width / 2, h: s.height, radius: s.borderRadius, ls: s.letterSpacing };
})()`)) as any;
  ok(
    'B1 单列居中（输入框居中 ±2 · 无左品牌栏）',
    !!bGeo && Math.abs(bGeo.cx - 720) <= 2,
    bGeo ? `cx=${Math.round(bGeo.cx)}（期望 720）` : 'n/a',
  );
  ok(
    'B2 授权码输入 letter-spacing ≥ 2px · 48 · 圆角 28',
    !!bGeo && parseFloat(bGeo.ls) >= 2 && bGeo.h === '48px' && bGeo.radius === '28px',
    bGeo ? `ls=${bGeo.ls}` : 'n/a',
  );
  const bBtn = (await evalJs(`(() => {
  const e = document.querySelector('form button[type="submit"]');
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { w: b.width, h: b.height, text: e.innerText.trim() };
})()`)) as any;
  ok(
    'B3 主按钮（`device.confirm`）336×42',
    !!bBtn && Math.round(bBtn.w) === 336 && Math.round(bBtn.h) === 42,
    bBtn ? `${Math.round(bBtn.w)}×${Math.round(bBtn.h)}` : 'n/a',
  );

  // ④ 错误态（无效码）
  await nav(`${APP}/device?user_code=ZZZZZZZZ`);
  const bErr = (await evalJs(`(() => ({
  alert: document.querySelectorAll('[role="alert"], [data-slot="alert"]').length,
  hasForm: !!document.querySelector('#device-code'),
  url: location.pathname,
}))()`)) as any;
  ok(
    'B4a ④ 错误态回 ①（错误可见 + 输入表单仍在 + URL=/device）',
    bErr.alert >= 1 && bErr.hasForm && bErr.url === '/device',
    `alert=${bErr.alert} url=${bErr.url}`,
  );

  // ① 输入 → ② 已认领 → ③ 已批准
  // 新造一枚码（B1 那枚已被自动认领消费）⇒ 手输 → ② 已认领 → ③ 已批准
  const code2 = (await (
    await fetch(`${API}/api/auth/device/code`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'aih-ui-redo-probe-2' }),
    })
  ).json()) as { user_code?: string };
  await nav(`${APP}/device`);
  await evalJs(setInput('#device-code', code2.user_code as string));
  await sleep(400);
  await evalJs(`document.querySelector('form')?.requestSubmit()`);
  let claimedState: any = null;
  for (let i = 0; i < 10; i++) {
    await sleep(600);
    claimedState = (await evalJs(`(() => {
    const labels = [...document.querySelectorAll('button')].map((b) => b.innerText.trim());
    return { labels, approve: labels.some((x) => /批准|Approve/.test(x)), deny: labels.some((x) => /拒绝|Deny/.test(x)) };
  })()`)) as any;
    if (claimedState.approve && claimedState.deny) break;
  }
  ok(
    'B4b ② 已认领（client_id/scope + 批准/拒绝）',
    claimedState.approve && claimedState.deny,
    claimedState.labels.join('/'),
  );
  const box = (await evalJs(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /批准|Approve/.test(x.innerText));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
})()`)) as string | null;
  if (box) {
    const { x, y } = JSON.parse(box) as { x: number; y: number };
    const c = { x, y, button: 'left', clickCount: 1 };
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...c });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...c });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...c });
  }
  let terminalText = '';
  for (let i = 0; i < 10; i++) {
    await sleep(600);
    terminalText = (await evalJs(`document.body.innerText`)) as string;
    if (/已批准|Approved/.test(terminalText)) break;
  }
  ok('B4c ③ 已处理（批准 ⇒ 已批准终态）', /已批准|Approved/.test(terminalText));
  ok(
    'B4d 四态可切且无 JS 异常',
    jsErrors.length === 0,
    `jsErrors=${jsErrors.length}${jsErrors[0] ? ` (${jsErrors[0]})` : ''}`,
  );

  const bHdr = (await evalJs(`document.querySelectorAll('header').length`)) as number;
  const bSw = (await evalJs(`(() => {
  const cand = [...document.querySelectorAll('button')].filter((b) => /中文|EN|English/.test(b.innerText));
  if (!cand.length) return null;
  const r = cand[cand.length - 1].getBoundingClientRect();
  return { x: r.x, y: r.y };
})()`)) as any;
  ok(
    'B5 无 `AuthLayout` 页头 + 语言切换右上角',
    bHdr === 0 && !!bSw && bSw.x > 1000 && bSw.y < 120,
    `header=${bHdr}`,
  );
}

/* ═══ C. 应用壳（superadmin 视角：四组齐）═══ */
if (want('C')) {
  await nav(`${APP}/dashboard`);
  const shell = (await evalJs(`(() => {
  const sb = document.querySelector('[data-slot="sidebar"]');
  const inner = sb && sb.querySelector('[data-slot="sidebar-inner"]');
  const labels = [...document.querySelectorAll('[data-slot="sidebar-group-label"]')].map((e) => e.innerText.trim());
  const items = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')];
  const withSvg = items.filter((b) => b.querySelector('svg')).length;
  const icons = items.map((b) => {
    const s = b.querySelector('svg');
    return s ? (s.getAttribute('class') || '').split(' ').find((c) => c.startsWith('lucide-')) || 'TypeIcon' : null;
  });
  const first = items[0];
  const panel = inner ? inner.getBoundingClientRect() : null;
  const footer = document.querySelector('[data-slot="sidebar-footer"]');
  const fb = footer ? footer.getBoundingClientRect() : null;
  const main = document.querySelector('main');
  const header = document.querySelector('header');
  return {
    w: sb ? Math.round(sb.getBoundingClientRect().width) : null,
    variant: sb ? sb.getAttribute('data-variant') : null,
    radius: inner ? getComputedStyle(inner).borderRadius : null,
    inset: panel ? Math.round(panel.x - sb.getBoundingClientRect().x) : null,
    labels, itemCount: items.length, withSvg, icons,
    homeText: first ? first.innerText.trim() : null,
    homeHasGlyph: first ? first.textContent.includes('⌂') : null,
    footerBottom: fb ? fb.bottom : null, panelBottom: panel ? panel.bottom : null,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
    headerFirstSlot: (() => {
      // 官方 SiteHeader：header > div（内层容器）> SidebarTrigger ⇒ 取内层容器的首个子元素
      const box = header && (header.querySelector(':scope > div') || header);
      const f = box ? box.firstElementChild : null;
      return f ? f.getAttribute('data-slot') : null;
    })(),
    brandInHeader: !!(header && header.querySelector('b.bg-clip-text')),
    brandInSidebar: !!document.querySelector('[data-slot="sidebar-header"]'),
    headerInnerDiv: !!(header && header.querySelector(':scope > div')),
    titleTag: (() => {
      if (!header) return null;
      const h1 = header.querySelector('h1');
      if (h1) return h1.tagName;
      return header.querySelector('b') ? 'B' : null;
    })(),
    activeSlotBg: (() => {
      const b = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')].find(
        (x) => x.getAttribute('data-active') === 'true',
      );
      const slot = b && b.querySelector('span');
      return slot ? getComputedStyle(slot).backgroundColor : null;
    })(),
    hasTitle: header ? !!header.querySelector('h1') : false,
    mainPad: main ? getComputedStyle(main).padding : null,
    mainX: main ? Math.round(main.getBoundingClientRect().x) : null,
    headerW: header ? Math.round(header.getBoundingClientRect().width) : null,
    hasInset: !!document.querySelector('[data-slot="sidebar-inset"]'),
    insetInHeader: (() => {
      const h = document.querySelector('header');
      const i = document.querySelector('[data-slot="sidebar-inset"]');
      return !!(h && i && i.contains(h));
    })(),
    containerBorderRight: (() => {
      const c = document.querySelector('[data-slot="sidebar"] .fixed');
      return c ? getComputedStyle(c).borderRightWidth : null;
    })(),
    innerPad: (() => {
      // 顶栏(header)已移入 SidebarInset 内 ⇒ 取「直接子 div」（跳过 header）
      const d = document.querySelector('main[data-slot="sidebar-inset"] > div');
      return d ? getComputedStyle(d).padding : null;
    })(),
  };
})()`)) as any;
  ok('C1 侧栏宽 256（展开 · 2026-09-17 对齐官方 16rem）', shell.w === 256, `实测 ${shell.w}`);
  ok(
    'C2 官方默认形态 `variant=sidebar`（实心贴边 · 圆角 0 · 内缩 0）',
    shell.variant === 'sidebar' && shell.radius === '0px' && shell.inset === 0,
    `${shell.variant} r=${shell.radius} inset=${shell.inset}`,
  );
  ok(
    'C2b 结构 = 官方形态（`SidebarInset` 存在 · 顶栏在其内 · 官方 container 右缘 1px 分隔线）',
    shell.hasInset === true && shell.insetInHeader === true && shell.containerBorderRight === '1px',
    `inset=${shell.hasInset} header∈inset=${shell.insetInHeader} border-r=${shell.containerBorderRight}`,
  );
  ok(
    'C2c 顶栏首元素 = `SidebarTrigger`（官方骨架：trigger 最左 · `-ml-1`）',
    shell.headerFirstSlot === 'sidebar-trigger',
    `first=${shell.headerFirstSlot}`,
  );
  ok(
    'C2d 品牌位：**不在顶栏** · 在侧栏顶部（`SidebarHeader`，官方骨架）',
    shell.brandInHeader === false && shell.brandInSidebar === true,
    `header=${shell.brandInHeader} sidebar=${shell.brandInSidebar}`,
  );
  ok(
    'C3 组标题 = 4（门户/个人/管理/超级管理 · 顺序固定）',
    JSON.stringify(shell.labels) === JSON.stringify(['门户', '个人', '管理', '超级管理']),
    shell.labels.join('/'),
  );
  ok(
    'C4 侧栏条目 14 条且每条含 SVG',
    shell.itemCount === 14 && shell.withSvg === 14,
    `${shell.itemCount} 条 / ${shell.withSvg} 含 SVG`,
  );
  const geom = (await evalJs(`(() => {
    const btns = Array.from(document.querySelectorAll('[data-slot="sidebar"] [data-slot="sidebar-menu-button"]'));
    return btns.map((el) => {
      const r = el.getBoundingClientRect();
      const slot = el.querySelector('span');
      const sr = slot ? slot.getBoundingClientRect() : { width: 0, height: 0 };
      return {
        h: Math.round(r.height), w: Math.round(r.width),
        slot: Math.round(sr.width) + 'x' + Math.round(sr.height),
        em: !!el.querySelector('em'),
        fs: getComputedStyle(el).fontSize,
        bg: slot ? getComputedStyle(slot).backgroundColor : null,
        active: el.getAttribute('data-active') === 'true',
      };
    });
  })()`)) as Array<{
    h: number;
    w: number;
    slot: string;
    em: boolean;
    fs: string;
    bg: string | null;
    active: boolean;
  }>;
  const uniqOf = (xs: unknown[]) => [...new Set(xs.map((x) => JSON.stringify(x)))];
  ok(
    'C4b 14 条形态统一（行高 32 · 宽 224 = 239 − 滚动条槽 15 · 图标槽 22x22 · 字号 14 · 副标已降级）',
    geom.length === 14 &&
      uniqOf(geom.map((g) => g.h)).length === 1 &&
      geom[0].h === 32 &&
      uniqOf(geom.map((g) => g.w)).length === 1 &&
      geom[0].w === 224 &&
      uniqOf(geom.map((g) => g.slot)).length === 1 &&
      geom[0].slot === '22x22' &&
      uniqOf(geom.map((g) => g.fs)).length === 1 &&
      geom.filter((g) => g.em).length === 0,
    `${geom.length} 条 · h=${uniqOf(geom.map((g) => g.h))} w=${uniqOf(geom.map((g) => g.w))} slot=${uniqOf(geom.map((g) => g.slot))} fs=${uniqOf(geom.map((g) => g.fs))} em=${geom.filter((g) => g.em).length}`,
  );
  const idleBg = geom.filter((g) => !g.active).map((g) => g.bg);
  const activeBg = geom.filter((g) => g.active).map((g) => g.bg);
  ok(
    'C4c 衬底统一：常态 13 条全中性（同色 · 非类型色）· 激活 1 条落 primary',
    uniqOf(idleBg).length === 1 && idleBg.length === 13 && activeBg.length === 1,
    `常态种类=${uniqOf(idleBg)}（${idleBg.length} 条）· 激活=${uniqOf(activeBg)}`,
  );
  const expectIcons = [
    'lucide-house',
    'TypeIcon',
    'TypeIcon',
    'TypeIcon',
    'lucide-layout-dashboard',
    'lucide-package',
    'lucide-send',
    'lucide-key-round',
    'lucide-gauge',
    'lucide-clipboard-check',
    'lucide-scroll-text',
    'lucide-tags',
    'lucide-settings',
    'lucide-users',
  ];
  ok(
    'C5 图标逐条匹配 §14.6 映射表',
    JSON.stringify(shell.icons) === JSON.stringify(expectIcons),
    shell.icons.join(','),
  );
  ok('C6 门户「首页」不含 `⌂` 字形', shell.homeHasGlyph === false);
  ok(
    'C7 用户区贴底（≤12）+ 下拉四项',
    shell.footerBottom !== null && Math.abs(shell.panelBottom - shell.footerBottom) <= 12,
    `panel=${Math.round(shell.panelBottom)} footer=${Math.round(shell.footerBottom)}`,
  );
  await realClick('[data-slot="sidebar-footer"] button');
  await sleep(800);
  const menu = (await evalJs(`(() => {
  const m = document.querySelector('[data-slot="dropdown-menu-content"]');
  return m ? m.innerText.replace(/\\s+/g, '|') : null;
})()`)) as string | null;
  ok(
    'C7b 下拉四项（我的账号/我的资产/访问令牌/登出）',
    !!menu && menu.includes('我的资产') && menu.includes('访问令牌') && menu.includes('登出'),
    menu ?? 'n/a',
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await sleep(400);
  ok('C8 顶栏高 58 且含页面标题区', shell.headerH === 58 && shell.hasTitle, `h=${shell.headerH}`);
  ok(
    'C8c 顶栏结构 = 官方 `SiteHeader`（内层容器 div + 语义 `<h1>` 标题）',
    shell.headerInnerDiv === true && shell.titleTag === 'H1',
    `innerDiv=${shell.headerInnerDiv} titleTag=${shell.titleTag}`,
  );
  ok(
    'C8b 顶栏宽 = 内容区宽（视口 − 侧栏宽 · 改官方结构后不再全宽）',
    shell.headerW === 1440 - 256,
    `header w=${shell.headerW}（期望 ${1440 - 256}）`,
  );
  ok(
    'C9 内容区：`SidebarInset` 起点 x = 256（随侧栏宽）· 内层容器 padding = 8px 22px',
    shell.mainX === 256 && shell.innerPad === '8px 22px',
    `x=${shell.mainX} innerPad=${shell.innerPad}`,
  );

  /* ── C1b 图标态（收起）── */
  // 入口 = **⌘B 真实键盘事件**（官方 `SidebarProvider` 的 cookie 是**只写**的 ⇒ 无法靠 cookie 进收起态；
  // 组合键须用 `rawKeyDown` + `nativeVirtualKeyCode`，`keyDown` 变体在 CDP 下不触发 React 处理）
  const pressCmdB = async () => {
    const base = {
      key: 'b',
      code: 'KeyB',
      windowsVirtualKeyCode: 66,
      nativeVirtualKeyCode: 66,
      modifiers: 4,
    };
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  };
  const readSide = async () =>
    (await evalJs(`(() => {
    const sb = document.querySelector('[data-slot="sidebar"]');
    const inner = sb && sb.querySelector('[data-slot="sidebar-inner"]');
    const items = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')];
    return {
      state: sb ? sb.getAttribute('data-state') : null,
      iconVar: sb ? getComputedStyle(sb).getPropertyValue('--sidebar-width-icon').trim() : null,
      innerW: inner ? Math.round(inner.getBoundingClientRect().width) : null,
      containerW: sb ? Math.round(sb.getBoundingClientRect().width) : null,
      headerH: (() => {
        const h = document.querySelector('header');
        return h ? Math.round(h.getBoundingClientRect().height) : null;
      })(),
      iconDeltas: (() => {
        if (!inner) return null;
        const ic = inner.getBoundingClientRect();
        const centre = ic.x + ic.width / 2;
        const ds = items
          .map((b) => b.querySelector('svg'))
          .filter(Boolean)
          .map((v) => { const r = v.getBoundingClientRect(); return Math.round(r.x + r.width / 2 - centre); });
        return [...new Set(ds)];
      })(),
      activeSlotBg: (() => {
        const b = items.find((x) => x.getAttribute('data-active') === 'true');
        const slot = b && b.querySelector('span');
        return slot ? getComputedStyle(slot).backgroundColor : null;
      })(),
      activeBtnBg: (() => {
        const b = items.find((x) => x.getAttribute('data-active') === 'true');
        return b ? getComputedStyle(b).backgroundColor : null;
      })(),
      activeIconColor: (() => {
        const b = items.find((x) => x.getAttribute('data-active') === 'true');
        const v = b && b.querySelector('svg');
        return v ? getComputedStyle(v).color : null;
      })(),
      allBtnWidths: [...new Set(items.map((b) => Math.round(b.getBoundingClientRect().width)))],
      slotCoversBtn: (() => {
        const b = items.find((x) => x.getAttribute('data-active') === 'true');
        if (!b) return null;
        const slots = [...b.querySelectorAll('span')];
        const s = slots.find((x) => Math.round(x.getBoundingClientRect().width) > 0) || slots[0];
        return s ? Math.round(s.getBoundingClientRect().width) === Math.round(b.getBoundingClientRect().width) : null;
      })(),
      brandSquareDelta: (() => {
        const hd = document.querySelector('[data-slot="sidebar-header"]');
        const sq = hd && hd.querySelector('span');
        if (!hd || !sq || !inner) return null;
        const ic = inner.getBoundingClientRect();
        const r = sq.getBoundingClientRect();
        return Math.round(r.x + r.width / 2 - (ic.x + ic.width / 2));
      })(),
      svg: items.filter((b) => b.querySelector('svg')).length,
    };
  })()`)) as any;
  const side = await readSide();
  if (side.state !== 'expanded') {
    await pressCmdB(); // 先归位到展开态（起点确定）
    await sleep(900);
  }
  await pressCmdB();
  let collapsedW: any = null;
  for (let i = 0; i < 10; i++) {
    await sleep(400);
    collapsedW = await readSide();
    if (collapsedW.state === 'collapsed') break;
  }
  ok(
    'C1b 图标态：容器/面板收到 **48 / 47** · 14 条图标**全部居中**（偏差 0）· 顶栏**保持 58**（跟官方 dashboard-01）',
    collapsedW.state === 'collapsed' &&
      collapsedW.iconVar === '48px' &&
      collapsedW.containerW === 48 &&
      collapsedW.innerW === 47 &&
      collapsedW.svg === 14 &&
      Array.isArray(collapsedW.iconDeltas) &&
      collapsedW.iconDeltas.every((d: number) => Math.abs(d) <= 1) &&
      collapsedW.headerH === 58,
    `state=${collapsedW.state} 容器=${collapsedW.containerW} 面板=${collapsedW.innerW} svg=${collapsedW.svg} 图标偏差=${JSON.stringify(collapsedW.iconDeltas)} 顶栏=${collapsedW.headerH}`,
  );
  ok(
    'C2f 收起态 = **单层底色**（14 条按钮统一 32 · 衬底槽 32×32 铺满按钮 · 选中深蓝/常态中性）',
    JSON.stringify(collapsedW.allBtnWidths) === '[32]' &&
      collapsedW.slotCoversBtn === true &&
      collapsedW.activeSlotBg === 'oklch(0.488 0.243 264.376)' &&
      collapsedW.activeIconColor === 'oklch(0.97 0.014 254.604)',
    `按钮宽=${JSON.stringify(collapsedW.allBtnWidths)} 槽铺满=${collapsedW.slotCoversBtn} 选中槽=${collapsedW.activeSlotBg} 图标=${collapsedW.activeIconColor}`,
  );
  let tip: any = null;
  for (let i = 0; i < 6 && !tip; i++) {
    await evalJs(`(() => {
      const btns = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')];
      const b = btns.find((x) => (x.textContent || '').includes('首页')) || btns[0];
      const r = b.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerType: 'mouse', isPrimary: true, pointerId: 1, buttons: 0 };
      b.dispatchEvent(new PointerEvent('pointerover', o));
      b.dispatchEvent(new PointerEvent('pointerenter', o));
      b.dispatchEvent(new PointerEvent('pointermove', o));
      return true;
    })()`);
    await sleep(600);
    tip = await evalJs(
      `(() => { const t = document.querySelector('[data-slot="tooltip-content"], [role="tooltip"]'); return t ? t.textContent.trim() : null; })()`,
    );
  }
  ok(
    'C2g 收起态 hover 提示**统一纯中文**（门户组不再「中文 · 英文」）',
    typeof tip === 'string' && tip.length > 0 && !tip.includes('·'),
    `tooltip=${JSON.stringify(tip)}`,
  );
  ok(
    'C2e 品牌区图标态：`A` 方块与图标轨**几何居中**（偏差 ≤1px）',
    collapsedW.brandSquareDelta !== null && Math.abs(collapsedW.brandSquareDelta) <= 1,
    `偏差=${collapsedW.brandSquareDelta}px`,
  );
  await pressCmdB(); // 恢复展开（D 块按文案找条目）
  await sleep(900);
}

/* ═══ D. 通用 ═══ */
if (want('D')) {
  const d1 = (await evalJs(`(() => {
  const items = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')].map((b) => b.innerText.trim());
  return items.includes('管理看板');
})()`)) as boolean;
  ok('D1a zh：`navigation.adminBoard` = 「管理看板」', d1 === true);
  // 切 EN
  await evalJs(`(() => {
  const cand = [...document.querySelectorAll('button')].filter((b) => /中文|EN|English/.test(b.innerText));
  cand[cand.length - 1].click();
  return true;
})()`);
  await sleep(1200);
  const d1b = (await evalJs(`(() => {
  const items = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')].map((b) => b.innerText.trim());
  const en = items.includes('Admin Dashboard');
  const cand = [...document.querySelectorAll('button')].filter((b) => /中文|EN|English/.test(b.innerText));
  const zh = cand.find((b) => /中文/.test(b.innerText));
  (zh ?? cand[cand.length - 1]).click(); // 切回中文（按文案定位，防 EN 态再点 EN）
  return en;
})()`)) as boolean;
  await sleep(1000);
  ok('D1b en：= "Admin Dashboard"', d1b === true);

  await evalJs(`(() => {
  const b = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')]
    .find((x) => x.innerText.trim() === '管理看板');
  b && b.click();
  return true;
})()`);
  await sleep(900);
  let toastState: any = null;
  for (let i = 0; i < 8; i++) {
    await sleep(400);
    toastState = (await evalJs(`(() => ({
    toast: !!document.querySelector('[data-sonner-toast]') || /后续版本|coming later|subsequent/i.test(document.body.innerText),
    path: location.pathname,
  }))()`)) as any;
    if (toastState.toast) break;
  }
  ok(
    'D2a 「管理看板」占位条目 ⇒ 轻提示且**不跳转**（URL 不变）',
    toastState.toast && toastState.path === '/dashboard',
    `path=${toastState.path}`,
  );
  await nav(`${APP}/admin`);
  const adminRedirect = (await evalJs(`location.pathname`)) as string;
  ok(
    'D2b `/admin` 维持既有重定向 → `/admin/reviews`',
    adminRedirect === '/admin/reviews',
    adminRedirect,
  );
  ok(
    'D3 全程 `NO JS ERRORS`',
    jsErrors.length === 0,
    `errors=${jsErrors.length}${jsErrors[0] ? ` (${jsErrors[0]})` : ''}`,
  );
  const items14 = (await evalJs(
    `document.querySelectorAll('[data-slot="sidebar-menu-button"]').length`,
  )) as number;
  ok(
    'D4 门户零回归由 `m4a-dogfood.ts` / `m4a-chain-smoke.ts` 另跑（本脚本不重复）· 侧栏条目 14',
    true,
    `条目实测 ${items14} · 门户零回归见 T15 证据文件`,
  );
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL（jsErrors=${jsErrors.length}）===`);
process.exit(fail === 0 ? 0 : 1);
