/**
 * M4b-2 出口件 ④ 七项验收清单 —— **CDP 自动断言版**（用户 2026-09-16 授权代跑）
 *
 * 覆盖批 design §9.4 的七项人工清单，逐项输出 PASS/FAIL + 关键证据。
 * **能力边界**：七项**全为功能/行为项** ⇒ 可自动断言；**纯审美判定不在此脚本范围**
 * （本批口径 = 只看功能，视觉打磨归 M4b-7）。
 *
 * 前置：dev 三件在线（`:3000` API / `:5173` web / Edge CDP `:9222`）+ 种子三账号。
 * 口令只从 shell env 读（`SMOKE_M4B2_PASSWORD`）——**仓库内不落口令**。
 *
 * 运行：`SMOKE_M4B2_PASSWORD=… bun docs/smoke/scripts/m4b2-acceptance-checklist.ts`
 */
import { NAV_ROLE, navGroupCounts } from './nav-truth.js';

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
/** `inPlace`：**在当前页**直接提交（不重导航）—— 供「带 `?next=` 的登录回原页」用。
 *  F221：重导航会**丢掉 `next`** ⇒ 原 ① 断言恒假（2026-09-17 默认落点改「首页」后暴露）。 */
const signIn = async (user: string, password = PW, opts: { inPlace?: boolean } = {}) => {
  if (!opts.inPlace) await nav(`${APP}/login`);
  await evalJs(setInput('#login-username', user));
  await evalJs(setInput('#login-password', password));
  await evalJs(`document.querySelector('form button[type="submit"]').click()`);
  await sleep(2300);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
// F221：**自带桌面视口**（同 c2 —— 不再依赖复用标签页的残留覆盖）
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await clearCookies();
jsErrors.length = 0;

console.log('=== 出口件 ④ 七项验收（CDP 自动断言）===\n');

/* ── ① 未登录跳转回原页 ── */
await nav(`${APP}/dashboard`, 2300);
const p1a = (await evalJs(`location.pathname + location.search`)) as string;
ok(
  '① 未登录访 /dashboard ⇒ 跳登录并保 next',
  p1a.startsWith('/login?next=') && p1a.includes('%2Fdashboard'),
  `path=${p1a}`,
);
await signIn('m4b2_user', PW, { inPlace: true }); // F221：不重导航 ⇒ `next` 保留（真契约 = `next` **优先**）
const p1b = (await evalJs(`location.pathname`)) as string;
ok('① 登录后回原页 /dashboard', p1b === '/dashboard', `path=${p1b}`);

/* ── ② 错密码 inline（URL 不变）── */
await clearCookies();
await nav(`${APP}/login`);
await evalJs(setInput('#login-username', 'm4b2_user'));
await evalJs(setInput('#login-password', 'definitely-wrong-password'));
await evalJs(`document.querySelector('form button[type="submit"]').click()`);
await sleep(1800);
const p2path = (await evalJs(`location.pathname`)) as string;
// F221：真值 = **inline 错误行**（`Login.tsx` §14.4 A 明写「失败态 = inline 错误行（**非 Alert 块**）」）
const p2alert = (await evalJs(
  `document.querySelector('[role="alert"]')?.textContent ?? ''`,
)) as string;
ok(
  '② 错密码 ⇒ inline 错误行（`<p role="alert">` · 非 Alert 块）且 URL 不变',
  p2path === '/login' && p2alert.trim().length > 0,
  `path=${p2path} alert=${p2alert.trim()}`,
);

/* ── ③ 登录后硬刷新不闪（高频采样：不得出现 anon 形态）── */
await signIn('m4b2_user');
await nav(`${APP}/dashboard`, 2300);
await evalJs(`location.reload()`);
const samples: string[] = [];
for (let i = 0; i < 14; i++) {
  await sleep(110);
  const s = (await evalJs(`(() => {
    const footer = document.querySelector('[data-slot="sidebar-footer"]');
    return JSON.stringify({
      loginLink: !!document.querySelector('[data-slot="sidebar-footer"] a[href="/login"]'),
      authed: !!(footer && footer.textContent && footer.textContent.includes('m4b2_user')),
      body: document.body.innerText.length,
    });
  })()`)) as string;
  samples.push(s);
}
const parsed = samples.map((s) => JSON.parse(s) as { loginLink: boolean; authed: boolean });
const sawAnon = parsed.some((p) => p.loginLink);
const sawAuthed = parsed.some((p) => p.authed);
ok(
  '③ 硬刷新全程无 anon 闪现（无「登录」入口形态）',
  sawAnon === false,
  `采样 ${parsed.length} 次 · loginLink 出现 ${parsed.filter((p) => p.loginLink).length} 次`,
);
ok(
  '③ 刷新后落已登录态',
  sawAuthed === true,
  `authed 出现 ${parsed.filter((p) => p.authed).length} 次`,
);

/* ── ④ 用户菜单 → 登出 → 归位登录页 ── */
await nav(`${APP}/dashboard`, 2300);
await realClick('[data-slot="sidebar-footer"] button', 0).catch(async () => {
  await realClick('[data-slot="sidebar-menu-button"]', 0);
});
await sleep(900);
const menu = (await evalJs(
  `[...document.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent).join('|')`,
)) as string;
ok('④ 用户菜单含「登出」', (menu ?? '').includes('登出'), `menu=${menu}`);
await evalJs(`(() => {
  const it = [...document.querySelectorAll('[role="menuitem"]')].find((n) => (n.textContent ?? '').includes('登出'));
  it?.click();
  return !!it;
})()`);
await sleep(2300);
const p4path = (await evalJs(`location.pathname`)) as string;
const p4me = (await evalJs(
  `fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.status)`,
)) as number;
ok(
  '④ 登出后归位 /login 且 /me 401',
  p4path === '/login' && p4me === 401,
  `path=${p4path} me=${p4me}`,
);

/* ── ⑤ role=USER 直访 /admin/labels ⇒ 弹回 + 轻提示 ── */
await signIn('m4b2_user');
await nav(`${APP}/admin/labels`, 2400);
const p5path = (await evalJs(`location.pathname`)) as string;
const p5toast = (await evalJs(
  `[...document.querySelectorAll('[data-sonner-toast]')].map((n) => n.textContent).join('|')`,
)) as string;
ok(
  '⑤ 弹回 /dashboard + 轻提示',
  p5path === '/dashboard' && (p5toast ?? '').includes('无权访问'),
  `path=${p5path} toast=${p5toast}`,
);

/* ── ⑥ 侧栏四档显隐逐档 ── */
const sidebarProbe = `(() => {
  const labels = [...document.querySelectorAll('[data-slot="sidebar-group-label"]')].map((n) => (n.textContent ?? '').trim());
  const counts = {};
  for (const l of document.querySelectorAll('[data-slot="sidebar-group-label"]')) {
    const name = (l.textContent ?? '').trim();
    const content = l.parentElement?.querySelector('[data-slot="sidebar-group-content"]');
    counts[name] = [...(content?.querySelectorAll('[data-slot="sidebar-menu-button"], a, button') ?? [])].length;
  }
  const portal = ['首页', '技能中心', 'MCP 中心', '专家中心'].filter((t) => document.body.innerText.includes(t)).length;
  return JSON.stringify({ labels, counts, portal });
})()`;
await clearCookies();
await nav(`${APP}/`, 2300);
let s6 = JSON.parse((await evalJs(sidebarProbe)) as string) as {
  labels: string[];
  counts: Record<string, number>;
  portal: number;
};
// F221：四档期望条数**全部取 navItems SSOT**（此前写死 4/2/3 ⇒ 后续批加条目即红）
const G_anon = navGroupCounts('anon');
const G_user = navGroupCounts(1);
const G_admin = navGroupCounts(NAV_ROLE.ADMIN);
const G_super = navGroupCounts(NAV_ROLE.SUPER_ADMIN);
ok(
  '⑥ 档0 未登录：仅门户（SSOT）· 三档组零渲染',
  s6.portal === G_anon['门户'] &&
    !s6.counts['个人'] &&
    !s6.counts['管理'] &&
    !s6.counts['超级管理'],
  `portal=${s6.portal} groups=${JSON.stringify(s6.counts)}`,
);

await signIn('m4b2_user');
await nav(`${APP}/dashboard`, 2300);
s6 = JSON.parse((await evalJs(sidebarProbe)) as string);
ok(
  '⑥ 档1 user：个人组 = SSOT · 其余零',
  s6.counts['个人'] === G_user['个人'] && !s6.counts['管理'] && !s6.counts['超级管理'],
  JSON.stringify(s6.counts),
);

await clearCookies();
await signIn('m4b2_mgr');
await nav(`${APP}/dashboard`, 2300);
s6 = JSON.parse((await evalJs(sidebarProbe)) as string);
ok(
  '⑥ 档10 admin：个人 + 管理（SSOT）· 超管组零',
  s6.counts['个人'] === G_admin['个人'] &&
    s6.counts['管理'] === G_admin['管理'] &&
    !s6.counts['超级管理'],
  JSON.stringify(s6.counts),
);

await clearCookies();
await signIn('m4b2_super');
await nav(`${APP}/dashboard`, 2300);
s6 = JSON.parse((await evalJs(sidebarProbe)) as string);
ok(
  '⑥ 档100 superadmin：个人 + 管理 + 超管（SSOT）',
  s6.counts['个人'] === G_super['个人'] &&
    s6.counts['管理'] === G_super['管理'] &&
    s6.counts['超级管理'] === G_super['超级管理'],
  JSON.stringify(s6.counts),
);

/* ── ⑦ /device?user_code= → 认领 → 批准 → 已批准 ── */
const codeRes = await fetch(`${API}/api/auth/device/code`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: APP },
  body: JSON.stringify({ client_id: 'aih-cli' }),
});
const { user_code } = (await codeRes.json()) as { user_code: string };
await nav(`${APP}/device?user_code=${user_code}`, 2600);
const p7claimed = (await evalJs(`document.body.innerText.includes('aih-cli')`)) as boolean;
ok('⑦ 认领落已认领态（展示 client_id）', p7claimed === true, `code=${user_code}`);
await evalJs(`(() => {
  const b = [...document.querySelectorAll('button')].find((n) => (n.textContent ?? '').includes('批准'));
  b?.click();
  return !!b;
})()`);
await sleep(2200);
const p7terminal = (await evalJs(
  `document.querySelector('[data-testid="device-terminal"]')?.textContent ?? ''`,
)) as string;
ok('⑦ 批准后落终态「已批准」', p7terminal.includes('已批准'), `terminal=${p7terminal}`);

console.log('');
if (jsErrors.length === 0) {
  console.log('NO JS ERRORS');
} else {
  console.log(`CONSOLE ERRORS（${jsErrors.length}）:`);
  for (const e of jsErrors.slice(0, 8)) console.log(`  - ${e}`);
}
console.log(`\nM4b-2 出口件④：${pass} PASS / ${fail} FAIL`);
ws.close();
process.exit(fail === 0 && jsErrors.length === 0 ? 0 : 1);
