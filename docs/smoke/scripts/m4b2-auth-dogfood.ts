/**
 * M4b-2 认证与壳批 · 本批 dogfood（六组 · 批 plan T10 断言③ · Q10）
 *
 * G1 未登录壳态 · G2 `role=USER` 组与直访弹回 · G3 `role=ADMIN` · G4 `role=SUPER_ADMIN`（含占位条目）·
 * G5 登录 → 用户菜单 → 登出闭环 · G6 设备授权认领 → 批准。全程 **NO JS ERRORS**。
 *
 * 前置：dev 三件在线（`:3000` API / `:5173` web / `:9222` Edge CDP）+ 种子三账号（`m4b2_{super,mgr,user}`）。
 * 口令只从 shell env 读（`SMOKE_M4B2_PASSWORD`）——**仓库内不落口令**。
 *
 * 运行：`SMOKE_M4B2_PASSWORD=… bun docs/smoke/scripts/m4b2-auth-dogfood.ts`
 */
import { NAV_ROLE, navGroupCounts, navPlaceholderCount } from './nav-truth.js';

const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const API = 'http://localhost:3000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PW = process.env.SMOKE_M4B2_PASSWORD;
if (!PW) {
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

/* ── CDP 基础设施 ── */
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
const netStatus: number[] = [];
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
  if (msg.method === 'Network.responseReceived') {
    const u = String(msg.params.response.url);
    if (u.includes('/api/') && !u.includes('/src/')) netStatus.push(msg.params.response.status);
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
const nav = async (url: string, wait = 2200) => {
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

/** 侧栏分组快照：返回 `{个人: n, 管理: n, 超级管理: n, 门户: n}` + 各分组条目文本 */
const SIDEBAR = `(() => {
  const out = { groups: {}, items: {}, userArea: null, links: [] };
  const labels = [...document.querySelectorAll('[data-slot="sidebar-group-label"]')];
  for (const l of labels) {
    const name = (l.textContent ?? '').trim();
    const content = l.parentElement?.querySelector('[data-slot="sidebar-group-content"]');
    const items = [...(content?.querySelectorAll('[data-slot="sidebar-menu-button"], a, button') ?? [])]
      .map((n) => (n.textContent ?? '').trim())
      .filter(Boolean);
    out.groups[name] = items.length;
    out.items[name] = [...new Set(items)];
  }
  const footer = document.querySelector('[data-slot="sidebar-footer"]');
  out.userArea = footer ? (footer.textContent ?? '').trim() : null;
  out.links = [...document.querySelectorAll('[data-slot="sidebar-footer"] a')].map((a) => a.getAttribute('href'));
  return JSON.stringify(out);
})()`;

const login = async (username: string) => {
  await nav(`${APP}/login`);
  await evalJs(setInput('#login-username', username));
  await evalJs(setInput('#login-password', PW));
  await evalJs(`document.querySelector('form button[type="submit"]').click()`);
  await sleep(2400);
};
const logoutByCookie = async () => {
  await send('Network.clearBrowserCookies');
  await sleep(300);
};
const newDeviceCode = async (): Promise<string> => {
  const res = await fetch(`${API}/api/auth/device/code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP },
    body: JSON.stringify({ client_id: 'aih-cli' }),
  });
  return ((await res.json()) as { user_code: string }).user_code;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
// F221：**自带桌面视口** —— 此前本脚本不设视口，靠**复用标签页里残留的覆盖**才拿到 1440；
// 一旦标签页是新的（默认 ≈748×472）侧栏即退化为移动 Sheet ⇒ 断言全红（实测）。
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await logoutByCookie();
jsErrors.length = 0;

/* ─────────────── G1 未登录壳态 ─────────────── */
await nav(`${APP}/`);
let s = JSON.parse((await evalJs(SIDEBAR)) as string) as {
  groups: Record<string, number>;
  items: Record<string, string[]>;
  userArea: string | null;
  links: string[];
};
const portalItems = (await evalJs(
  `['首页','技能中心','MCP 中心','专家中心'].filter((t) => document.body.innerText.includes(t)).length`,
)) as number;
ok('G1 门户组 4 条（裸 `SidebarMenu`，门户组无组标签）', portalItems === 4, `命中=${portalItems}`);
ok(
  'G1 三档组零渲染',
  !s.groups['个人'] && !s.groups['管理'] && !s.groups['超级管理'],
  JSON.stringify(s.groups),
);
ok(
  'G1 用户区为登录入口',
  (s.links ?? []).some((h) => h && h.includes('/login')),
  JSON.stringify(s.links),
);
// F221：顶栏形态以 **F207 真值**为准 —— 官方 block 形态（`header` > 单一内层容器 div），
// **无标题区**；原断言「children === 4」（品牌/分隔/触发/语言切换 4 件）是 F207 之前的历史记忆。
const topbarJson = (await evalJs(`(() => {
  const h = document.querySelector('header');
  if (!h) return JSON.stringify({ children: -1 });
  return JSON.stringify({
    children: h.children.length,
    innerDiv: h.firstElementChild?.tagName === 'DIV',
    h1: !!h.querySelector('h1'),
    trigger: !!h.querySelector('[data-slot="sidebar-trigger"]'),
  });
})()`)) as string;
const tb = JSON.parse(topbarJson) as {
  children: number;
  innerDiv: boolean;
  h1: boolean;
  trigger: boolean;
};
ok(
  'G1 顶栏 = 官方 block 形态（header > 单一内层容器 · **无标题区**〔F207〕· 含侧栏触发器）',
  tb.children === 1 && tb.innerDiv === true && tb.h1 === false && tb.trigger === true,
  topbarJson,
);

/* ─────────────── G2 role=USER ─────────────── */
await login('m4b2_user');
await nav(`${APP}/dashboard`, 2400);
s = JSON.parse((await evalJs(SIDEBAR)) as string);
ok('G2 个人组 4 条', s.groups['个人'] === 4, JSON.stringify(s.items['个人']));
const portalItems2 = (await evalJs(
  `['首页','技能中心','MCP 中心','专家中心'].filter((t) => document.body.innerText.includes(t)).length`,
)) as number;
ok('G2 门户组仍在 4 条', portalItems2 === 4, `命中=${portalItems2}`);
ok('G2 管理/超管组零渲染', !s.groups['管理'] && !s.groups['超级管理'], JSON.stringify(s.groups));
ok('G2 用户区含登出入口', (s.userArea ?? '').length > 0, (s.userArea ?? '').slice(0, 60));
await nav(`${APP}/admin/labels`, 2400);
const g2path = (await evalJs(`location.pathname`)) as string;
const g2toast = (await evalJs(
  `[...document.querySelectorAll('[data-sonner-toast]')].map((n) => n.textContent).join('|')`,
)) as string;
ok('G2 直访 /admin/labels 弹回 /dashboard', g2path === '/dashboard', `path=${g2path}`);
ok('G2 弹回带轻提示', (g2toast ?? '').includes('无权访问'), `toast=${g2toast}`);

/* ─────────────── G3 role=ADMIN ─────────────── */
await logoutByCookie();
await login('m4b2_mgr');
await nav(`${APP}/dashboard`, 2400);
s = JSON.parse((await evalJs(SIDEBAR)) as string);
// F221：条数**取 navItems SSOT**（不写死 —— 后续批加条目不再红）
const G_admin = navGroupCounts(NAV_ROLE.ADMIN);
ok(
  'G3 个人组条数 = SSOT',
  s.groups['个人'] === G_admin['个人'],
  `${s.groups['个人']} vs ${G_admin['个人']}`,
);
ok(
  'G3 管理组条数 = SSOT',
  s.groups['管理'] === G_admin['管理'],
  `${s.groups['管理']} vs ${G_admin['管理']} · ${JSON.stringify(s.items['管理'])}`,
);
ok('G3 超管组零渲染', !s.groups['超级管理'], JSON.stringify(s.groups));
await nav(`${APP}/admin/reviews`, 2400);
const g3path = (await evalJs(`location.pathname`)) as string;
const g3title = (await evalJs(
  `document.querySelector('[data-slot="empty-title"]')?.textContent ?? ''`,
)) as string;
ok('G3 /admin/reviews 可达', g3path === '/admin/reviews', `path=${g3path} title=${g3title}`);

/* ─────────────── G4 role=SUPER_ADMIN（含占位条目）─────────────── */
await logoutByCookie();
await login('m4b2_super');
await nav(`${APP}/dashboard`, 2400);
s = JSON.parse((await evalJs(SIDEBAR)) as string);
// F221：条数与占位数均取 SSOT
const G_super = navGroupCounts(NAV_ROLE.SUPER_ADMIN);
ok(
  'G4 超管组条数 = SSOT',
  s.groups['超级管理'] === G_super['超级管理'],
  `${s.groups['超级管理']} vs ${G_super['超级管理']} · ${JSON.stringify(s.items['超级管理'])}`,
);
ok(
  'G4 管理组条数 = SSOT（与超管组并存）',
  s.groups['管理'] === G_super['管理'],
  `${s.groups['管理']} vs ${G_super['管理']}`,
);
// 占位条目：非 `<a>`、点击后出轻提示
const placeholder = (await evalJs(`(() => {
  const btns = [...document.querySelectorAll('[data-slot="sidebar-menu-button"]')]
    .filter((n) => n.tagName === 'BUTTON' && /系统设置|用户管理/.test(n.textContent ?? ''));
  return btns.length;
})()`)) as number;
ok(
  'G4 超管组含占位条目（BUTTON）= SSOT 占位数',
  placeholder >= navPlaceholderCount('超级管理'),
  `占位条目数=${placeholder} · SSOT=${navPlaceholderCount('超级管理')}`,
);
if (placeholder >= 1) {
  // F221：占位条目 = **无 `to` 的条目** ⇒ 从「超级管理」组内取**非 `<a>`** 的菜单钮点它。
  // 原写法点 `[data-slot="sidebar-menu-button"]:not(a)` 的**索引 0** —— T11-i 之后侧栏首钮 = **搜索触发器**
  // （点它只开命令面板、不出轻提示）⇒ 断言**恒假**。
  const clickedPlaceholder = (await evalJs(`(() => {
    const label = [...document.querySelectorAll('[data-slot="sidebar-group-label"]')]
      .find((l) => (l.textContent || '').trim() === '超级管理');
    const content = label?.parentElement?.querySelector('[data-slot="sidebar-group-content"]');
    const btn = [...(content?.querySelectorAll('[data-slot="sidebar-menu-button"]') ?? [])]
      .find((b) => b.tagName === 'BUTTON');
    if (!btn) return false;
    btn.click();
    return true;
  })()`)) as boolean;
  await sleep(900);
  const t = (await evalJs(
    `[...document.querySelectorAll('[data-sonner-toast]')].map((n) => n.textContent).join('|')`,
  )) as string;
  ok(
    'G4 占位条目点击出轻提示',
    clickedPlaceholder === true && (t ?? '').length > 0,
    `点击=${clickedPlaceholder} toast=${t}`,
  );
}

/* ─────────────── G5 登录 → 用户菜单 → 登出闭环 ─────────────── */
await nav(`${APP}/dashboard`, 2400);
await realClick('[data-slot="sidebar-footer"] button', 0).catch(async () => {
  await realClick('[data-slot="sidebar-menu-button"]', 0);
});
await sleep(900);
const menuItems = (await evalJs(
  `[...document.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent).join('|')`,
)) as string;
ok('G5 用户菜单含登出项', (menuItems ?? '').includes('登出'), `menu=${menuItems}`);
await evalJs(`(() => {
  const it = [...document.querySelectorAll('[role="menuitem"]')].find((n) => (n.textContent ?? '').includes('登出'));
  it?.click();
  return !!it;
})()`);
await sleep(2400);
const path5 = (await evalJs(`location.pathname`)) as string;
const me5 = (await evalJs(
  `fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.status)`,
)) as number;
const s5 = JSON.parse((await evalJs(SIDEBAR)) as string);
ok(
  'G5 登出后归位 /login（受保护路由 /dashboard 未登录 ⇒ `RoleGuard` 保码归位，design §4.3）',
  path5 === '/login',
  `path=${path5}`,
);
ok('G5 登出后 /me 401', me5 === 401, `me=${me5}`);
const sidebar5 = (await evalJs(
  `document.querySelectorAll('[data-slot="sidebar"]').length`,
)) as number;
ok(
  'G5 登出后无侧栏（独立版式 `/login` ⇒ 三组归零）',
  sidebar5 === 0 && !s5.groups['个人'] && !s5.groups['管理'] && !s5.groups['超级管理'],
  `sidebar=${sidebar5} groups=${JSON.stringify(s5.groups)}`,
);

/* ─────────────── G6 设备授权认领 → 批准 ─────────────── */
await login('m4b2_user');
const code = await newDeviceCode();
await nav(`${APP}/device?user_code=${code}`, 2600);
const claimed = (await evalJs(`document.body.innerText.includes('aih-cli')`)) as boolean;
ok('G6 认领落已认领态（含客户端名）', claimed === true, `code=${code}`);
await evalJs(`(() => {
  const b = [...document.querySelectorAll('button')].find((n) => (n.textContent ?? '').includes('批准'));
  b?.click();
  return !!b;
})()`);
await sleep(2200);
const terminal = (await evalJs(
  `document.querySelector('[data-testid="device-terminal"]')?.textContent ?? ''`,
)) as string;
ok('G6 批准后落终态', terminal.includes('已批准'), `terminal=${terminal}`);

/* ─────────────── 汇总 ─────────────── */
const expected401 = netStatus.filter((c) => c === 401).length;
console.log('');
if (jsErrors.length === 0) {
  console.log(`NO JS ERRORS（网络层 401 log ${expected401} 条：未登录态断言预期触发——非 JS 错误）`);
} else {
  console.log(`CONSOLE ERRORS（${jsErrors.length}）:`);
  for (const e of jsErrors.slice(0, 10)) console.log(`  - ${e}`);
}
console.log(`\nM4b-2 DOGFOOD: ${pass} PASS / ${fail} FAIL`);
ws.close();
process.exit(fail === 0 && jsErrors.length === 0 ? 0 : 1);
