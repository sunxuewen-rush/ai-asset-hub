/**
 * M4b-4 个人面 B · 本批 dogfood（**G1–G22** · 批 plan T11/T11-f 断言 · 批 design §9.3）
 *
 * 覆盖：工作台三卡（角色裁剪 / 请求数 / 独立三态）· 我的资产（九列 / 显式 status=ALL / owner-only 集合 /
 *       直跳详情）· 详情页管理区（**5 档权限矩阵** / 版本行内动作 2 态 vs 4 态 / yank）·
 *       标签结构体渲染 · star 全链（幂等 / starredByMe / 三处一致 / 未登录拦截）· 跨页未登录归位
 *       · **G20/G21**（T11-e：视图切换 / 折叠搜索）· **G22**（T11-f：排序 `Select` / 列头两态 / 匿名可用）
 *
 * 前置：dev 三件在线（`:3000` API / `:5173` web / `:9222` Edge CDP）
 *       + 造数已跑：`SMOKE_M4B2_PASSWORD=… bun --env-file=apps/server/.env docs/smoke/scripts/m4b4-seed-assets.ts`
 *
 * 运行（口令不入仓）：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b4-personal-b-dogfood.ts`
 *   可选：`SMOKE_SHOT_PREFIX=<前缀>`（截图前缀，缺省 `m4b4-`）
 *
 * ⚠️ **G12b 会改库**（T12 覆盖补测 · 2026-09-18）：管理档**真点一次**「撤回分发」会把
 *    `m4b4-seed-skill` 的 `1.0.0` 置为 `YANKED` ⇒ **重跑本脚本前必须先重跑 seed 脚本复位**
 *    （`bun --env-file=apps/server/.env docs/smoke/scripts/m4b4-seed-assets.ts`，幂等）。
 *    正确顺序：**seed → dogfood**（脚本尾部的 `07-detail-yank-done.png` 即撤回后状态）。
 *
 * ⚠️ 执行期踩坑（两处，均为脚本自身，已在实现期修掉 —— 留痕防复现）：
 *   ① **必须新建 tab**（`PUT /json/new`）：复用既有 tab 会命中历史遗留的僵死/节流页 ⇒ CDP 稳定超时
 *   ② **请求统计必须排除 Vite 模块请求**：dev server 把 `apps/web/src/api/*.ts` 以 `/api/<name>.ts`
 *      路径提供 ⇒ 宽松 `includes('/api/reviews')` / `includes('/star')` 会把**源码模块**计入业务请求
 *      （实测：`/api/stars.ts` 被误判为「未登录发了收藏写请求」）⇒ 一律用「端点正则 + 非 `.ts`」判定
 *
 * ⚠️ G15 口径（F60 登记）：**幂等以 API 两次 `PUT` 判**，不以 UI 连点两次判
 *    —— UI 的收藏按钮是**切换**语义（连点两次 = 收藏后取消），那是正确行为、不是幂等失败。
 *
 * ⚠️ **登录限流**：服务端 `LOGIN_RATE_LIMIT = 15 分钟 / 20 次`（`apps/server/src/auth/better-auth.ts:64`·
 *    in-memory）。2026-09-20 起脚本自身做了两道缓解（原症状：凭据正确但 `/api/auth/me` 回
 *    `401:anon` ⇒ 打印诊断行后中止）：
 *      ① **会话复用**：同一账号二次进入不再重新登录 —— 当前已登录（`curUser` 一致）直接复用；
 *         曾登录过的账号还原 cookie 并核对 `me.user.id` 一致（`/api/auth/me` 响应面无 `username`
 *         字段）⇒ 免登录。一轮真登录次数 = 各账号首次之和。
 *      ② **`SMOKE_ONLY=<组>` 分段执行**：只跑命中段，其余整段跳过（`G20,G21` 逗号可多选 ·
 *         段粒度非断言级）。**日常迭代用；提交前 / 收口必须不带该变量全跑**（末尾有命中检查，
 *         组名打错会 FAIL 并列出可选段）。**新增段三件**：段内包 `if (want(...))` + 段头补一行「段选」注释
 *         （注明可命中它的组名）+ 顶层 `SECTION_IDS` 补 token（跨段共享的局部量须一并上提到顶层）。
 *         例：`SMOKE_ONLY=G22 bun --env-file=apps/server/.env docs/smoke/scripts/m4b4-personal-b-dogfood.ts`
 *         末行会打印 ⚠️ 分段模式警示（**分段绿 ≠ 收口绿**）。
 *    仍撞限流时：**重启 api**（in-memory 计数清零）后再跑 —— 不要靠等待窗口硬扛。
 *    **攒批口径**（2026-09-20 起）：纯文案 / 文档改动不跑本脚本；交互 / 样式改动只跑相关段；
 *    多层改动攒到收口一次性全跑（实测全跑 3.5~5 分 / 轮 ⇒ 迭代期分段能省掉大头）。
 */
import { appendFileSync, writeFileSync } from 'node:fs';

const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const SHOT = process.env.SMOKE_SHOT_PREFIX ?? 'm4b4-';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PW = process.env.SMOKE_M4B2_PASSWORD;
const USER = process.env.SMOKE_USERNAME ?? 'm4b2_user'; // owner（role=user）
const MGR = 'm4b2_mgr'; // 管理档（admin）
const SUPER = 'm4b2_super'; // 超管（superadmin）
const OUTSIDER = 'm4b4_outsider'; // 登录非 owner（role=user）
const SLUG = 'm4b4-seed-skill';
const OTHER_SLUG = 'm4b4-seed-other';

const PROGRESS = process.env.SMOKE_LOG ?? '/tmp/m4b4-dogfood-progress.log';
try {
  writeFileSync(PROGRESS, '');
} catch {}

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? `  ${extra}` : ''}`;
  if (cond) pass++;
  else fail++;
  console.log(line);
  try {
    appendFileSync(PROGRESS, `${line}\n`);
  } catch {}
};
/** 宽容解析（DOM 快照缺失时返回 null，不让整脚本崩在 JSON.parse） */
function parseOrNull<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ── 分段执行（`SMOKE_ONLY`）—— 攒批验证用：只跑命中段，其余**整段跳过**
   · 段粒度 = 段头 banner 的 token（`SMOKE_ONLY=G22` / `SMOKE_ONLY=G20,G21,G22`）
   · **未设 = 全跑**（提交前 / 收口口径）；末尾有命中检查，组名打错会 FAIL（不静默）
   · `G19`（无 JS 错误）不参与分段：它聚合「本次实际跑过的段」，永远执行 */
const ONLY = new Set(
  (process.env.SMOKE_ONLY ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);
const HIT = new Set<string>();
/** 该段是否要跑（未设 SMOKE_ONLY ⇒ 恒 true）；命中即登记，供末尾命中检查 */
const want = (...ids: string[]): boolean => {
  if (ONLY.size === 0) return true;
  const matched = ids.some((i) => ONLY.has(i));
  if (matched) for (const i of ids) if (ONLY.has(i)) HIT.add(i);
  return matched;
};
/** 可选段清单（组名打错时打印，省一轮翻源码） */
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
  'G12B',
  'G13',
  'G14B',
  'G15',
  'G16',
  'G17',
  'G18',
  'G20',
  'G21',
  'G22',
];

if (!PW) {
  console.error('SMOKE_M4B2_PASSWORD is required（口令不入仓）');
  process.exit(1);
}

/* ── CDP 基础设施（沿用 M4b-2/M4b-3 脚本口径 + 本批两条踩坑修正） ── */
const target = (await (await fetch(`${DBG}/json/new?about:blank`, { method: 'PUT' })).json()) as {
  webSocketDebuggerUrl?: string;
};
if (!target?.webSocketDebuggerUrl) {
  throw new Error('无法新建 tab —— Edge CDP(:9222) 是否在线？（启动命令见本文件头）');
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));

let seq = 0;
const pending = new Map<number, (m: any) => void>();
const jsErrors: string[] = [];
/** 网络记录（`Network.requestWillBeSent`）—— 请求数断言与「未登录不发写请求」反证都用它 */
const netLog: Array<{ method: string; url: string }> = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Network.requestWillBeSent') {
    netLog.push({
      method: msg.params?.request?.method ?? '?',
      url: msg.params?.request?.url ?? '',
    });
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
const nav = async (url: string, wait = 2400) => {
  await send('Page.navigate', { url });
  await sleep(wait);
};
const shot = async (name: string) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data)
    writeFileSync(`docs/smoke/${SHOT}${name}.png`, Buffer.from(r.result.data, 'base64'));
};
/** 真指针点击（元素级） */
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
/** 输入：真键盘为主；DOM 值不符则用原生 setter + input 事件兜底；返回是否就位 */
async function ensureInput(sel: string, value: string): Promise<boolean> {
  await realClickExpr(`document.querySelector(${JSON.stringify(sel)})`);
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

const CONTENT = `document.querySelector('[data-slot="sidebar-inset"]')`;
/** 收藏按钮（**按 title 前缀精确命中**——`sidebar-inset` 里还有 TopBar 的语言切换钮也带 `aria-pressed`，直取首个会误命中） */
const STAR_BTN = `[...(${CONTENT}).querySelectorAll('button[aria-pressed]')].find((b) => /^(收藏|已收藏)/.test(b.getAttribute('title') ?? ''))`;
/** 标签卡（容器：chips 的禁用态计数须限定在此卡内，避免命中页面上其它 `aria-disabled` 元素） */
const LABEL_CARD = `[...(${CONTENT}).querySelectorAll('[data-slot="card"]')].find((el) => el.innerText.includes('标签+-'))`;
/** 卡片链接（工作台三卡 = 卡片内 anchor；侧栏不在 `sidebar-inset` 内 ⇒ 不串扰） */
const cardLinks = `JSON.stringify([...(${CONTENT}).querySelectorAll('[data-slot="card"] a[href]')].map((a) => a.getAttribute('href')))`;
/** 业务请求判定：**端点正则**（排除壳层 `me`/`stats`，也排除 Vite 的 `/api/*.ts` 模块请求 —— 见文件头坑②） */
const BIZ_RE = /\/api\/(me\/assets|reviews|audit)(\?|$)/;
const bizSince = (from: number) =>
  netLog.slice(from).filter((r) => r.method === 'GET' && BIZ_RE.test(r.url));
/** 收藏**写**请求（`PUT`/`DELETE .../star` 精确端点；`.ts` 模块不算） */
const starWrites = (from: number) =>
  netLog
    .slice(from)
    .filter((r) => r.method !== 'GET' && /\/api\/assets\/[^/]+\/star(\?|$)/.test(r.url));

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
// 视口：桌面 1440×1000（真指针点击需要目标落在视口内）
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await sleep(300);

/* ── 会话复用（2026-09-20）：同账号二次进入免重新登录，规避「15 分钟 / 20 次」登录限流
   身份判据 = `me.user.id`（`/api/auth/me` 响应面 = `{ user: { id, displayName }, role }`，无 `username`） */
type Session = { userId: string | null; cookies: unknown[] };
const jar = new Map<string, Session>();
let curUser: string | null = null;
/** 当前会话身份（未登录 ⇒ null；取不到 id ⇒ 'unknown'） */
async function meUserId(): Promise<string | null> {
  const raw = (await evalJs(
    `fetch('/api/auth/me').then(async (r) => { if (!r.ok) return 'anon'; try { const j = await r.json(); return String((j && j.user && j.user.id) || 'unknown'); } catch { return 'unknown'; } })`,
  )) as string;
  return raw === 'anon' ? null : raw;
}
/** 登录成功后存档 cookie + 身份（供后续段还原） */
async function stashSession(username: string): Promise<void> {
  const all = await send('Network.getAllCookies');
  // `send()` 回的是整条 CDP 消息（`{ id, result }`）—— cookie 在 `result.cookies`
  const cookies = all?.result?.cookies ?? all?.cookies ?? [];
  if (cookies.length === 0) {
    console.log(`  · 会话存档为空（${username}：cookie 未取到 ⇒ 该账号下次仍真登录）—— 非致命`);
  }
  jar.set(username, { userId: await meUserId(), cookies });
}

/** 登录（清 cookie → /login → 真键盘输入（带 setter 兜底）→ 提交 → 复核 `/api/auth/me`） */
async function loginAs(username: string): Promise<boolean> {
  await send('Network.clearBrowserCookies');
  await sleep(250);
  await nav(`${APP}/login`, 2400);
  const filledUser = await ensureInput('#login-username', username);
  const filledPw = await ensureInput('#login-password', PW!);
  const diag = (await evalJs(
    `JSON.stringify({ u: document.querySelector('#login-username')?.value ?? null, pLen: document.querySelector('#login-password')?.value.length ?? -1, disabled: document.querySelector('form button[type="submit"]')?.disabled ?? null })`,
  )) as string;
  await realClickExpr(`document.querySelector('form button[type="submit"]')`);
  await sleep(2800);
  const me = (await evalJs(
    `fetch('/api/auth/me').then((r) => r.status + ':' + (r.ok ? 'ok' : 'anon'))`,
  )) as string;
  const okLogin = me === '200:ok';
  if (!okLogin) {
    console.log(
      `  · 登录失败诊断（${username}）：filled=${filledUser}/${filledPw} · ${diag} · me=${me}`,
    );
  } else {
    curUser = username;
    await stashSession(username);
  }
  return okLogin;
}
async function logout() {
  await send('Network.clearBrowserCookies');
  curUser = null;
  await sleep(250);
  await nav(`${APP}/`, 2000);
}
/** 必须登录：失败即中止（后续断言全部依赖会话，继续跑只会刷屏假红） */
async function mustLogin(username: string): Promise<void> {
  if (curUser === username) {
    ok(`前置：以 ${username} 登录`, true, '会话复用（当前已登录，免登录）');
    return;
  }
  const saved = jar.get(username);
  if (saved?.cookies.length) {
    await send('Network.clearBrowserCookies');
    await send('Network.setCookies', { cookies: saved.cookies });
    await sleep(200);
    const uid = await meUserId();
    if (uid && (!saved.userId || uid === saved.userId)) {
      curUser = username;
      ok(`前置：以 ${username} 登录`, true, '会话复用（还原 cookie · me.user.id 一致，免登录）');
      return;
    }
    console.log(`  · 会话复用未命中（${username}：me.user.id=${uid ?? 'anon'}）⇒ 回落真登录`);
  }
  const okLogin = await loginAs(username);
  ok(`前置：以 ${username} 登录`, okLogin, okLogin ? '真登录' : '');
  if (!okLogin) {
    console.log('❌ 登录失败 —— 中止（先修会话再跑断言）');
    process.exit(1);
  }
}

/* ── 段间共享探针（2026-09-20 由 G7 段内上提到顶层）：`snapDetail` 的调用点横跨 G7 与 G12b
   两段，段被 `SMOKE_ONLY` 整块跳过时函数体不再受段 block 作用域影响 ── */
type DetailSnap = {
  h1: string | null;
  hasStatusGroup: boolean;
  hasLabelCard: boolean;
  hasPrivilegedBtn: boolean;
  privilegedChipLocked: number;
  downloadHref: string | null;
  starBtn: string | null;
};
const detailSnapshot = `(() => {
  const c = ${CONTENT};
  if (!c) return null;
  const star = ${STAR_BTN};
  const labelCard = ${LABEL_CARD};
  return JSON.stringify({
    h1: c.querySelector('h1') ? c.querySelector('h1').innerText : null,
    hasStatusGroup: c.innerText.includes('资产状态'),
    hasLabelCard: c.innerText.includes('标签+-'),
    hasPrivilegedBtn: [...c.querySelectorAll('button')].some((b) => b.innerText.trim() === '特权标签'),
    privilegedChipLocked: labelCard ? labelCard.querySelectorAll('span[aria-disabled="true"]').length : -1,
    downloadHref: c.querySelector('a[href*="/download"]') ? c.querySelector('a[href*="/download"]').getAttribute('href') : null,
    starBtn: star ? star.getAttribute('aria-label') : null,
  });
})()`;
const snapDetail = async (): Promise<DetailSnap | null> =>
  parseOrNull<DetailSnap>(await evalJs(detailSnapshot));
/** 打开版本 Tab（官方 `Tabs` 激活在 mousedown 路径上 —— 必须真指针） */
async function openVersionsTab() {
  await realClickExpr(
    `(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.innerText.trim() === '版本'))()`,
  );
  await sleep(1900);
}
/** 版本 Tab 行内动作快照 */
const snapVersionActions = async (): Promise<{ del: number; yank: number } | null> =>
  parseOrNull<{ del: number; yank: number }>(
    await evalJs(`(() => {
      const c = ${CONTENT};
      if (!c) return null;
      const btns = [...c.querySelectorAll('button')].map((b) => b.innerText.trim());
      return JSON.stringify({ del: btns.filter((t) => t === '删除').length, yank: btns.filter((t) => t === '撤回分发').length });
    })()`),
  );

/** 详情页快照（跨段持有 · 段内赋值） */
let snap: DetailSnap | null = null;

/* 本脚本以「未登录」为起点：浏览器 profile 可能残留上一轮会话 ⇒ 先清（G1/G20/G22 的匿名断言依赖它） */
await logout();

/* 段选：`SMOKE_ONLY=G1`（可选 G1）⇒ 命中即整段执行 */
if (ONLY.size) {
  console.log(
    `· SMOKE_ONLY=${[...ONLY].join(',')} ⇒ 只跑命中段（其余整段跳过）；收口请不带该变量全跑`,
  );
}

/* ═══════════════ G1 · 未登录归位（保码） ═══════════════ */
if (want('G1')) {
  await logout();
  for (const path of ['/dashboard', '/dashboard/assets']) {
    await nav(`${APP}${path}`, 2400);
    const loc = (await evalJs(
      `JSON.stringify({ p: location.pathname, s: location.search })`,
    )) as string;
    const parsed = parseOrNull<{ p: string; s: string }>(loc);
    ok(
      `G1 未登录直访 ${path} ⇒ /login 且保 next`,
      parsed?.p === '/login' && decodeURIComponent(parsed?.s ?? '').includes(path),
      loc,
    );
  }
}

/* 段选：`SMOKE_ONLY=G18`（可选 G18）⇒ 命中即整段执行 */
/* ═══════════════ G18 · 未登录点收藏 ⇒ 零写请求 + 跳登录（**详情页头卡入口**
   —— 2026-09-18 起门户卡的星标为纯展示，收藏交互唯一入口 = 详情页） ═══════════════ */
if (want('G18')) {
  {
    const from = netLog.length;
    await nav(`${APP}/assets/${SLUG}`, 3200);
    const clicked = await realClickExpr(
      `(() => [...document.querySelectorAll('button[aria-pressed]')].find((b) => (b.getAttribute('title') ?? '').startsWith('收藏')))()`,
    );
    await sleep(1600);
    const writes = starWrites(from);
    const loc = (await evalJs(`location.pathname + location.search`)) as string;
    ok(
      'G18 未登录点详情页「收藏」⇒ 不发写请求 + 跳 /login?next=（回指详情页）',
      clicked &&
        writes.length === 0 &&
        loc.startsWith('/login') &&
        decodeURIComponent(loc).includes(`/assets/${SLUG}`),
      `star 写请求 ${writes.length} 条 · ${loc}`,
    );
  }
}

/* 段选：`SMOKE_ONLY=G14B`（可选 G14B）⇒ 命中即整段执行 */
/* ═══════════════ G14b · 门户卡星标 = **纯展示**（与下载同款 · 不响应点击）
   —— 用户 2026-09-18「卡片上的星标只用显示就好了，不用响应点击。类似于元信息」 ═══════════════ */
if (want('G14B')) {
  {
    await nav(`${APP}/skills`, 3000);
    const probe = (await evalJs(`(() => {
    const h3 = [...document.querySelectorAll('h3')].find((h) => (h.innerText || '').trim().length > 0);
    const card = h3 && h3.closest('[data-slot="card"]');
    if (!card) return null;
    const stats = [...card.querySelectorAll('span.tabular-nums')];
    const m = (el) => { const s = getComputedStyle(el); const svg = el.querySelector('svg');
      const b = svg.getBoundingClientRect();
      return { font: s.fontSize, color: s.color, icon: Math.round(b.width) }; };
    return JSON.stringify({
      buttons: card.querySelectorAll('button[aria-pressed]').length,
      statCount: stats.length,
      same: stats.length === 2 && JSON.stringify(m(stats[0])) === JSON.stringify(m(stats[1])),
      detail: stats.length === 2 ? JSON.stringify([m(stats[0]), m(stats[1])]) : null,
    });
  })()`)) as string | null;
    const p = parseOrNull<{ buttons: number; statCount: number; same: boolean; detail: string }>(
      probe,
    );
    ok(
      'G14b-1 门户卡星标为纯展示（卡内无 button[aria-pressed] · 两枚同款 stat：下载 + 收藏）',
      !!p && p.buttons === 0 && p.statCount === 2 && p.same,
      probe ?? 'no-card',
    );
    ok(
      'G14b-2 点击卡片星标处 ⇒ 穿透到整卡热区（进入详情页，非收藏动作）',
      (await (async () => {
        // 用本脚本的 `realClickExpr`（内部按元素中心派发真鼠标事件）
        // 锚点与 G14b-1 一致：**含 `h3` 的卡**才是资产卡（`/skills` 首卡可能是筛选/页头卡）
        const clicked = await realClickExpr(
          `(() => { const h3 = [...document.querySelectorAll('h3')].find((h) => (h.innerText || '').trim().length > 0); const c = h3 && h3.closest('[data-slot="card"]'); return c ? [...c.querySelectorAll('span.tabular-nums')].pop() : null; })()`,
        );
        await sleep(1800);
        const path = (await evalJs(`location.pathname`)) as string;
        return clicked && path.startsWith('/assets/');
      })()) === true,
    );
  }
}

/* 段选：`SMOKE_ONLY=G2`（可选 G2）⇒ 命中即整段执行 */
/* ═══════════════ G2 · role<10 工作台：1 卡 + 1 请求 ═══════════════ */
if (want('G2')) {
  await mustLogin(USER);
  {
    const from = netLog.length;
    await nav(`${APP}/dashboard`, 3000);
    const cards = (await evalJs(cardLinks)) as string;
    const biz = bizSince(from);
    ok('G2 role=1 工作台：只渲染 1 卡（我的资产）', cards === '["/dashboard/assets"]', cards);
    ok(
      'G2 role=1 工作台：页面自身业务请求 = 1',
      biz.length === 1 && biz[0]!.url.includes('/api/me/assets'),
      `${biz.length} 条：${biz.map((b) => b.url.replace(/^https?:\/\/[^/]+/, '')).join(' | ')}`,
    );
    await shot('01-dashboard-user');
  }
}

/* 段选：`SMOKE_ONLY=G3`（可选 G3）⇒ 命中即整段执行 */
/* ═══════════════ G3 · role≥10 工作台：3 卡 + 3 请求 + 审计 5 行 ═══════════════ */
if (want('G3')) {
  await mustLogin(MGR);
  {
    const from = netLog.length;
    await nav(`${APP}/dashboard`, 3400);
    const cards = (await evalJs(cardLinks)) as string;
    const biz = bizSince(from);
    ok(
      'G3 role=10 工作台：3 卡（待审核 / 我的资产 / 最近审计）',
      cards === '["/admin/reviews","/dashboard/assets","/admin/audit"]',
      cards,
    );
    ok('G3 role=10 工作台：页面自身业务请求 = 3', biz.length === 3, `${biz.length} 条`);
    const audit = parseOrNull<{ rows: number; heads: string[]; text: string }>(
      await evalJs(`(() => {
      const c = ${CONTENT};
      if (!c) return null;
      const card = [...c.querySelectorAll('[data-slot="card"]')].find((el) => el.innerText.includes('最近审计'));
      if (!card) return null;
      return JSON.stringify({
        rows: card.querySelectorAll('tbody tr').length,
        heads: [...card.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
        text: card.innerText,
      });
    })()`),
    );
    ok('G3 审计卡 5 行', audit?.rows === 5, `rows=${audit?.rows ?? 'n/a'}`);
    ok(
      'G3 审计卡列头 = 时间/动作/对象 且不含操作人',
      audit?.heads.join(',') === '时间,动作,对象' && !(audit?.text ?? '').includes('操作人'),
      audit?.heads.join(','),
    );
    await shot('02-dashboard-admin');
  }
}

/* 段选：`SMOKE_ONLY=G10`（可选 G10/G4/G5/G6/G7/G9）⇒ 命中即整段执行 */
/* ═══════════════ G4/G5/G6/G9/G10/G7 · 我的资产列表（owner） ═══════════════ */
if (want('G10', 'G4', 'G5', 'G6', 'G7', 'G9')) {
  await mustLogin(USER);
  {
    const from = netLog.length;
    await nav(`${APP}/dashboard/assets`, 3400);
    const reqs = bizSince(from).map((r) => r.url.replace(/^https?:\/\/[^/]+/, ''));
    ok(
      'G4 默认「全部」⇒ 实际请求含 status=ALL',
      reqs.some((u) => u.includes('/api/me/assets') && u.includes('status=ALL')),
      reqs.join(' | '),
    );
    const snap = parseOrNull<{
      heads: string[];
      rows: number;
      body: string;
      typeColorBlocks: number;
      chips: string[];
      hrefs: string[];
    }>(
      await evalJs(`(() => {
      const c = ${CONTENT};
      if (!c) return null;
      return JSON.stringify({
        heads: [...c.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
        rows: c.querySelectorAll('tbody tr').length,
        body: c.innerText,
        typeColorBlocks: c.querySelectorAll('[class*="bg-type-"]').length,
        chips: [...c.querySelectorAll('tbody tr span')]
          .filter((s) => (s.getAttribute('class') ?? '').includes('rounded-full'))
          .map((s) => s.innerText.trim()),
        hrefs: [...c.querySelectorAll('tbody tr a[href^="/assets/"]')].map((a) => a.getAttribute('href')),
      });
    })()`),
    );
    ok(
      'G6 九列表头齐',
      snap?.heads.join(',') === '名称,类型,状态,标签,版本,下载,收藏,更新,操作',
      snap?.heads.join(',') ?? 'n/a',
    );
    ok(
      'G6 三态各一行（ACTIVE/HIDDEN/ARCHIVED）',
      snap?.rows === 3 &&
        snap.body.includes('活跃') &&
        snap.body.includes('已隐藏') &&
        snap.body.includes('已归档'),
      `rows=${snap?.rows ?? 'n/a'}`,
    );
    ok(
      'G6 类型列无色（反证：无 bg-type-* 色块）',
      snap?.typeColorBlocks === 0,
      `色块 ${snap?.typeColorBlocks ?? 'n/a'}`,
    );
    ok(
      'G5 owner-only 集合：他人资产不出现',
      !(snap?.body ?? 'x').includes(OTHER_SLUG),
      `含 other=${(snap?.body ?? '').includes(OTHER_SLUG)}`,
    );
    ok(
      'G9 标签 chip 文案 = displayName（≠ slug）',
      !!snap?.chips.includes('特权示例') && !snap.chips.some((c) => c.includes('m4b4-seed-')),
      snap?.chips.slice(0, 6).join(' / ') ?? 'n/a',
    );
    ok(
      'G7 操作列 = 真链接 <a href="/assets/<slug>">',
      !!snap?.hrefs.includes(`/assets/${SLUG}`),
      snap?.hrefs.join(',') ?? 'n/a',
    );

    // G10：列表 下载/收藏 数值 = 接口值
    const api = parseOrNull<{ star: number; dl: number }>(
      await evalJs(
        `fetch('/api/me/assets?status=ALL&limit=20').then((r) => r.json()).then((d) => {
         const it = d.items.find((i) => i.slug === '${SLUG}');
         return JSON.stringify({ star: it ? it.starCount : null, dl: it ? it.downloadCount : null });
       })`,
      ),
    );
    const rowText = (await evalJs(`(() => {
    const c = ${CONTENT};
    if (!c) return null;
    const tr = [...c.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('${SLUG}'));
    return tr ? tr.innerText.replace(/\\n/g, ' ') : null;
  })()`)) as string | null;
    ok(
      'G10 列表 下载/收藏 数值 = 接口值',
      !!rowText &&
        api?.dl !== null &&
        api?.star !== null &&
        rowText.includes(String(api?.dl)) &&
        rowText.includes(String(api?.star)),
      `接口 dl=${api?.dl} star=${api?.star} · 行=${(rowText ?? '').slice(0, 120)}`,
    );
    await shot('03-my-assets');
  }
}

/* 段选：`SMOKE_ONLY=G13`（可选 G13）⇒ 命中即整段执行 */
/* ═══════════════ G13 · 筛选/搜索 ⇒ page 回落 1 ═══════════════ */
if (want('G13')) {
  {
    await nav(`${APP}/dashboard/assets?page=2`, 2600);
    await realClickExpr(`document.querySelector('#assets-status-filter')`);
    await sleep(700);
    await realClickExpr(
      `(() => [...document.querySelectorAll('[role="option"]')].find((o) => o.innerText.trim() === '已隐藏'))()`,
    );
    await sleep(1600);
    const afterStatus = (await evalJs(`location.pathname + location.search`)) as string;
    const rows = (await evalJs(
      `(() => { const c = ${CONTENT}; return c ? c.querySelectorAll('tbody tr').length : -1; })()`,
    )) as number;
    ok(
      'G13 切状态筛选 ⇒ URL 含 status=HIDDEN 且 page 删除',
      afterStatus.includes('status=HIDDEN') && !afterStatus.includes('page='),
      afterStatus,
    );
    ok('G13 筛选后行集合收窄（HIDDEN 仅 1 行）', rows === 1, `rows=${rows}`);
    await nav(`${APP}/dashboard/assets?page=2`, 2600);
    await realClickExpr(`(() => ${CONTENT}.querySelector('input[aria-label]'))()`);
    await realType('m4b4');
    await sleep(1400);
    const afterQ = (await evalJs(`location.pathname + location.search`)) as string;
    ok('G13 q 搜索写 URL（300ms 防抖后）', afterQ.includes('q=m4b4'), afterQ);
  }
}

/* 段选：`SMOKE_ONLY=G11`（可选 G11/G12/G7/G8）⇒ 命中即整段执行 */
/* ═══════════════ G7/G8/G11/G12 · 详情页（五档） ═══════════════ */
if (want('G11', 'G12', 'G7', 'G8')) {
  // ① 访客
  await logout();
  await nav(`${APP}/assets/${SLUG}`, 3000);
  snap = await snapDetail();
  ok(
    'G7 直跳后 pathname = /assets/<slug>',
    (await evalJs(`location.pathname`)) === `/assets/${SLUG}`,
  );
  ok(
    'G7 全站无 sheet-content（反证：抽屉已取消）',
    (await evalJs(`document.querySelectorAll('[data-slot="sheet-content"]').length === 0`)) ===
      true,
  );
  ok('G8 详情页为唯一视图（h1 渲染该资产）', !!snap?.h1, snap?.h1 ?? '');
  ok(
    'G11① 访客：管理区/标签卡均不渲染',
    !!snap && !snap.hasStatusGroup && !snap.hasLabelCard,
    JSON.stringify(snap),
  );
  ok('G14(anon) 详情页收藏入口存在', !!snap?.starBtn, snap?.starBtn ?? '');
  ok('G8 匿名可下载（受控链 <a href=…/download>）', !!snap?.downloadHref, snap?.downloadHref ?? '');
  await openVersionsTab();
  let va = await snapVersionActions();
  ok('G12 访客：版本行零动作', va?.del === 0 && va?.yank === 0, JSON.stringify(va));

  // ② 登录非 owner
  await mustLogin(OUTSIDER);
  await nav(`${APP}/assets/${SLUG}`, 3000);
  snap = await snapDetail();
  ok(
    'G11② 登录非 owner：管理区/标签卡均不渲染',
    !!snap && !snap.hasStatusGroup && !snap.hasLabelCard,
    JSON.stringify(snap),
  );

  // ③ owner
  await mustLogin(USER);
  await nav(`${APP}/assets/${SLUG}`, 3200);
  snap = await snapDetail();
  ok(
    'G11③ owner：管理区 + 标签卡均渲染',
    !!snap?.hasStatusGroup && !!snap?.hasLabelCard,
    JSON.stringify(snap),
  );
  ok('G11③ owner：无「特权标签」按钮', snap?.hasPrivilegedBtn === false);
  ok(
    'G11/Q2 owner：PRIVILEGED chip 的 × 禁用（非超管）',
    (snap?.privilegedChipLocked ?? 0) >= 1,
    `locked=${snap?.privilegedChipLocked ?? 'n/a'}`,
  );
  await openVersionsTab();
  va = await snapVersionActions();
  ok(
    'G12 owner：删除仅 2 态行（DRAFT 1 行）、无撤回分发',
    va?.del === 1 && va?.yank === 0,
    JSON.stringify(va),
  );
  await shot('04-detail-owner');

  // ④ 管理档
  await mustLogin(MGR);
  await nav(`${APP}/assets/${SLUG}`, 3200);
  snap = await snapDetail();
  ok(
    'G11④ 管理档：管理区渲染 + 无「特权标签」',
    !!snap?.hasStatusGroup && snap?.hasPrivilegedBtn === false,
    JSON.stringify(snap),
  );
  await openVersionsTab();
  va = await snapVersionActions();
  ok(
    'G12 管理档：删除 4 态行（3 行）+ 撤回分发（PUBLISHED 行）',
    va?.del === 3 && va?.yank === 1,
    JSON.stringify(va),
  );
  await shot('05-detail-manager');
}

/* 段选：`SMOKE_ONLY=G12`（可选 G12/G12B）⇒ 命中即整段执行 */
/* ═══════════════ G12b · 撤回分发「UI → 端点」端到端（T12 覆盖补测） ═══════════════
 * 为什么补：G12 只验了按钮**渲染与权限门**；yank 端点此前零覆盖（路由层），
 * 单测补了（`apps/server/src/http/yank-route.test.ts`），这里补**真点击**那一段。
 * ⚠️ 本段会**改库**（`${SLUG}` 的 1.0.0 → YANKED）⇒ 重跑前先重跑 seed 脚本复位。 */
if (want('G12', 'G12B')) {
  {
    const before = (await evalJs(
      `fetch('/api/assets/${SLUG}/versions?limit=20').then((r) => r.json()).then((d) => {
       const v = d.items.find((i) => i.version === '1.0.0');
       return JSON.stringify({ status: v ? v.status : null });
     })`,
    )) as string;
    const clicked = await realClickExpr(
      `(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '撤回分发'))()`,
    );
    await sleep(900);
    const dialogOpen = (await evalJs(
      // 官方 `AlertDialog`（非 Dialog）⇒ 认 `role="alertdialog"` / `data-slot="alert-dialog-content"`
      `document.querySelectorAll('[role="alertdialog"], [data-slot="alert-dialog-content"]').length > 0`,
    )) as boolean;
    const reasonFilled = await ensureInput('textarea', 'dogfood G12b · 撤回分发端到端');
    const submitted = await realClickExpr(
      `(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '确认'))()`,
    );
    await sleep(2200);

    const after = (await evalJs(
      `fetch('/api/assets/${SLUG}/versions?limit=20').then((r) => r.json()).then((d) => {
       const v = d.items.find((i) => i.version === '1.0.0');
       return JSON.stringify({ status: v ? v.status : null });
     })`,
    )) as string;
    const parsedBefore = parseOrNull<{ status: string }>(before);
    const parsedAfter = parseOrNull<{ status: string }>(after);
    ok(
      'G12b-1 管理档点「撤回分发」⇒ 确认框打开 + 填原因 + 提交',
      clicked && dialogOpen && reasonFilled && submitted,
      `click=${clicked} dialog=${dialogOpen} reason=${reasonFilled} submit=${submitted}`,
    );
    ok(
      'G12b-2 端点真被调用：版本 1.0.0 PUBLISHED → YANKED',
      parsedBefore?.status === 'PUBLISHED' && parsedAfter?.status === 'YANKED',
      `${parsedBefore?.status} → ${parsedAfter?.status}`,
    );
    const yankGone = (await evalJs(
      `[...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === '撤回分发').length === 0`,
    )) as boolean;
    ok('G12b-3 行内「撤回分发」入口消失（非 PUBLISHED 不再可撤 · 无重复入口）', yankGone);
    const dl = (await evalJs(
      `fetch('/api/assets/${SLUG}/versions/1.0.0/download').then(async (r) => JSON.stringify({ status: r.status, code: (await r.json().catch(() => ({}))).code }))`,
    )) as string;
    const dlParsed = parseOrNull<{ status: number; code: string }>(dl);
    ok(
      'G12b-4 已撤回版本下载 ⇒ 400 asset.version_yanked（状态门真生效）',
      dlParsed?.status === 400 && dlParsed?.code === 'asset.version_yanked',
      dl,
    );
    const again = (await evalJs(
      `fetch('/api/assets/${SLUG}/versions/1.0.0/yank', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'G12b re-run' }) }).then(async (r) => JSON.stringify({ status: r.status, code: (await r.json().catch(() => ({}))).code }))`,
    )) as string;
    const againParsed = parseOrNull<{ status: number; code: string }>(again);
    ok(
      'G12b-5 重复撤回 ⇒ 400 asset.version_not_yankable（明示非幂等契约）',
      againParsed?.status === 400 && againParsed?.code === 'asset.version_not_yankable',
      again,
    );
    await shot('07-detail-yank-done');
  }

  // ⑤ 超管
  await mustLogin(SUPER);
  await nav(`${APP}/assets/${SLUG}`, 3200);
  snap = await snapDetail();
  ok('G11⑤ 超管：有「特权标签」按钮', snap?.hasPrivilegedBtn === true, JSON.stringify(snap));
  ok(
    'G11/Q2 超管：PRIVILEGED chip 的 × 可点（无禁用标记）',
    snap?.privilegedChipLocked === 0,
    `locked=${snap?.privilegedChipLocked ?? 'n/a'}`,
  );
  await shot('06-detail-super');
}

/* 段选：`SMOKE_ONLY=G15`（可选 G15/G16）⇒ 命中即整段执行 */
/* ═══════════════ G15/G16 · star 幂等与 starredByMe 语义（API 级，F60 口径） ═══════════════ */
if (want('G15', 'G16')) {
  await mustLogin(USER);
  {
    const base = (await evalJs(
      `fetch('/api/assets/${SLUG}').then((r) => r.json()).then((d) => d.starCount)`,
    )) as number;
    const p1 = parseOrNull<{ starCount: number; starred: boolean }>(
      await evalJs(
        `fetch('/api/assets/${SLUG}/star', { method: 'PUT' }).then((r) => r.json()).then((d) => JSON.stringify(d))`,
      ),
    );
    const p2 = parseOrNull<{ starCount: number; starred: boolean }>(
      await evalJs(
        `fetch('/api/assets/${SLUG}/star', { method: 'PUT' }).then((r) => r.json()).then((d) => JSON.stringify(d))`,
      ),
    );
    ok(
      'G15 两次 PUT ⇒ 计数只 +1 且 starred=true',
      p1?.starCount === base + 1 && p2?.starCount === base + 1 && p2?.starred === true,
      `base=${base} → ${p1?.starCount} → ${p2?.starCount}`,
    );
    ok('G16 本人收藏后 starredByMe=true', p2?.starred === true);
    const d1 = parseOrNull<{ starCount: number }>(
      await evalJs(
        `fetch('/api/assets/${SLUG}/star', { method: 'DELETE' }).then((r) => r.json()).then((d) => JSON.stringify(d))`,
      ),
    );
    const d2 = parseOrNull<{ starCount: number; starred: boolean }>(
      await evalJs(
        `fetch('/api/assets/${SLUG}/star', { method: 'DELETE' }).then((r) => r.json()).then((d) => JSON.stringify(d))`,
      ),
    );
    ok(
      'G15 两次 DELETE ⇒ 回基线',
      d1?.starCount === base && d2?.starCount === base && d2?.starred === false,
      `${d1?.starCount} → ${d2?.starCount}（基线 ${base}）`,
    );
    const detail = (await evalJs(
      `fetch('/api/assets/${SLUG}').then((r) => r.json()).then((d) => JSON.stringify({ s: d.starCount, me: d.starredByMe }))`,
    )) as string;
    const parsed = parseOrNull<{ s: number; me: boolean }>(detail);
    ok(
      'G16 他人（种子）已收藏 ⇒ 我的 starredByMe 仍 false 且计数回基线',
      parsed?.me === false && parsed?.s === base,
      detail,
    );
    const mine = (await evalJs(
      `fetch('/api/assets/${OTHER_SLUG}').then((r) => r.json()).then((d) => JSON.stringify({ s: d.starCount, me: d.starredByMe }))`,
    )) as string;
    const mineParsed = parseOrNull<{ s: number; me: boolean }>(mine);
    ok('G16 我收藏的资产 ⇒ starredByMe=true', mineParsed?.me === true && mineParsed?.s === 1, mine);
    await logout();
    await nav(`${APP}/assets/${SLUG}`, 2600);
    const anonStar = (await evalJs(
      `fetch('/api/assets/${SLUG}').then((r) => r.json()).then((d) => JSON.stringify({ me: d.starredByMe }))`,
    )) as string;
    ok(
      'G16 匿名 ⇒ starredByMe=false',
      parseOrNull<{ me: boolean }>(anonStar)?.me === false,
      anonStar,
    );
  }
}

/* 段选：`SMOKE_ONLY=G17`（可选 G17）⇒ 命中即整段执行 */
/* ═══════════════ G17 · star 读面一致（列表列 = 详情头卡 = 接口） ═══════════════ */
if (want('G17')) {
  await mustLogin(USER);
  {
    await nav(`${APP}/dashboard/assets`, 3400);
    const listStar = (await evalJs(`(() => {
    const c = ${CONTENT};
    if (!c) return null;
    const tr = [...c.querySelectorAll('tbody tr')].find((r) => r.innerText.includes('${SLUG}'));
    if (!tr) return null;
    const tds = [...tr.querySelectorAll('td')];
    return tds.length >= 9 ? tds[6].innerText.trim() : null;
  })()`)) as string | null;
    const api = (await evalJs(
      `fetch('/api/assets/${SLUG}').then((r) => r.json()).then((d) => d.starCount)`,
    )) as number;
    await nav(`${APP}/assets/${SLUG}`, 2800);
    const headStar = (await evalJs(`(() => {
    const c = ${CONTENT};
    if (!c) return null;
    const b = ${STAR_BTN};
    return b ? (b.getAttribute('aria-label') ?? '') : null;
  })()`)) as string | null;
    ok(
      'G17 star 读面三处一致（列表列 = 详情头卡 = 接口）',
      listStar !== null &&
        headStar !== null &&
        listStar.includes(String(api)) &&
        headStar.includes(String(api)),
      `列表=${listStar} · 头卡=${headStar} · 接口=${api}`,
    );
  }
}

/* 段选：`SMOKE_ONLY=G20`（可选 G20）⇒ 命中即整段执行 */
/* ═══════════════ G20 · 门户视图切换（网格 ⇄ 列表 · **T11-e**）
   —— 用户 2026-09-18 拍板：「我们不用记忆，默认都按照卡片显示，用户手动切换的话，就切换列表，
      下一页上一页的时候不影响」。断言面 = 默认态 / 切换后形态与字段 / 翻页保持 / 不记忆 / 匿名可用。
   选 `/mcps` 做翻页（造数 21 条 ⇒ 23 > limit 20，**故 /skills 的既有基线不被污染**）。
   形态 = 官方 `Table`（用户 2026-09-18 拍板 A：先试 `Item` 后弃用 —— 带边框 `Item` 逐行成卡，
   「列表」读起来碎/松；官方注册表**无 `list` 件**，最接近的是 `table` / `item`）。 ═══════════════ */
if (want('G20')) {
  {
    /** 视图态探针：视图钮按 i18n aria-label 定位（zh/en 双口径）；行锚点 = 官方 `Item` 上的
      `data-asset-row`（本件稳定标记 —— 不按 class 嗅探，官方件改版即失效） */
    const VIEW_STATE = `(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /^(网格视图|列表视图|Grid view|List view)$/.test((b.getAttribute('aria-label') ?? '').trim()));
    const rows = [...document.querySelectorAll('[data-asset-row]')];
    let rowButtons = 0;
    for (const r of rows) rowButtons += r.querySelectorAll('button').length;
    return JSON.stringify({
      toggleCount: btns.length,
      on: btns.filter((b) => b.getAttribute('data-state') === 'on').map((b) => b.getAttribute('aria-label')),
      grid: document.querySelector('div.grid.grid-cols-4') !== null,
      rows: rows.length,
      rowButtons,
      rowHeight: rows[0] ? Math.round(rows[0].getBoundingClientRect().height) : null,
      pagination: document.querySelector('nav[aria-label="pagination"]') !== null,
      url: location.pathname + location.search,
    });
  })()`;
    type ViewState = {
      toggleCount: number;
      on: string[];
      grid: boolean;
      rows: number;
      rowButtons: number;
      rowHeight: number | null;
      pagination: boolean;
      url: string;
    };
    const viewState = async (): Promise<ViewState | null> =>
      parseOrNull<ViewState>((await evalJs(VIEW_STATE)) as string);
    const clickView = async (label: string): Promise<boolean> =>
      (await evalJs(
        `(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') ?? '').trim() === '${label}'); if (!b) return false; b.click(); return true; })()`,
      )) === true;

    await mustLogin(USER);
    await nav(`${APP}/mcps`, 3400);
    const s1 = await viewState();
    ok(
      'G20-1 `/mcps` 首访 ⇒ **默认网格**（两枚视图钮存在 · 网格容器在 · 行容器 0）',
      s1?.toggleCount === 2 &&
        s1.on.length === 1 &&
        s1.on[0] === '网格视图' &&
        s1.grid &&
        s1.rows === 0,
      JSON.stringify(s1),
    );

    ok('G20-2 点「列表视图」⇒ 切换成功', await clickView('列表视图'));
    await sleep(1600);
    const s2 = await viewState();
    ok(
      'G20-3 列表形态：20 行（= limit）· 行高 ≥55（单行描述 55；描述最多 3 行时更高）· 行内 **0 button**（下载/收藏纯展示口径不破）',
      s2?.on.length === 1 &&
        s2.on[0] === '列表视图' &&
        !s2.grid &&
        s2.rows === 20 &&
        (s2.rowHeight ?? 0) >= 55 &&
        s2.rowButtons === 0,
      JSON.stringify(s2),
    );
    ok(
      'G20-4 表头 **6 列**（名称/描述/作者/下载/收藏/**更新**）+ 行内六格字段齐（名称链接 · 描述 · 作者 · 两枚 stat · 更新时间 `YYYY-MM-DD`）',
      (await evalJs(`(() => {
      const heads = [...document.querySelectorAll('thead th')].map((h) => h.innerText.trim()).join('|');
      const row = document.querySelector('[data-asset-row]');
      if (!row) return false;
      const tds = [...row.querySelectorAll('td')];
      if (tds.length !== 6) return false;
      return (
        heads === '名称|描述|作者|下载|收藏|更新' &&
        tds[0].querySelector('a[href^="/assets/"]') !== null &&
        (tds[1].innerText || '').length > 0 &&
        (tds[2].innerText || '').includes('m4b2_mgr') &&
        tds[3].querySelector('span.tabular-nums') !== null &&
        tds[4].querySelector('span.tabular-nums') !== null &&
        /^\\d{4}-\\d{2}-\\d{2}$/.test((tds[5].innerText || '').trim())
      );
    })()`)) === true,
    );
    ok(
      'G20-4b 描述列上限 = **3 行 + 省略号**（`line-clamp: 3` 真值 + 单元格可换行）',
      (await evalJs(`(() => {
      const row = document.querySelector('[data-asset-row]');
      if (!row) return false;
      const td = row.querySelectorAll('td')[1];
      const box = td.firstElementChild;
      if (!box) return false;
      const s = getComputedStyle(box);
      return (
        s.webkitLineClamp === '3' &&
        getComputedStyle(td).whiteSpace === 'normal' &&
        s.webkitLineClamp !== 'none'
      );
    })()`)) === true,
    );
    await shot('20-mcps-list-view');

    // 翻页：仍为列表（用户口径「下一页上一页的时候不影响」）
    const paged = await evalJs(`(() => {
    const nav = document.querySelector('nav[aria-label="pagination"]');
    if (!nav) return 'no-nav';
    const next = [...nav.querySelectorAll('a,button')].find((e) => /next|Next/.test((e.getAttribute('aria-label') ?? '') + (e.textContent ?? '')));
    if (!next) return 'no-next';
    next.click();
    return 'clicked';
  })()`);
    await sleep(2200);
    const s3 = await viewState();
    ok(
      'G20-5 翻到第 2 页 ⇒ URL `?page=2` 且**仍是列表**（视图不受翻页影响）',
      paged === 'clicked' &&
        s3?.url.includes('page=2') === true &&
        s3?.on[0] === '列表视图' &&
        s3?.grid === false &&
        s3?.rows === 3,
      `${paged} · ${JSON.stringify(s3)}`,
    );

    // 不记忆：离开页面再回来 ⇒ 回默认网格
    await nav(`${APP}/agents`, 2600);
    await nav(`${APP}/mcps`, 3400);
    const s4 = await viewState();
    ok(
      'G20-6 「不记忆」口径：离开再回（重新挂载）⇒ 回默认网格',
      s4?.on[0] === '网格视图' && s4?.grid === true && s4?.rows === 0,
      JSON.stringify(s4),
    );

    // 匿名可用（视图切换纯前端）
    await logout();
    await nav(`${APP}/skills`, 3000);
    const anonToggle = await evalJs(
      `[...document.querySelectorAll('button')].filter((b) => /^(网格视图|列表视图)$/.test((b.getAttribute('aria-label') ?? '').trim())).length`,
    );
    ok('G20-7 匿名 ⇒ 视图钮照常渲染（纯前端能力）', anonToggle === 2, `toggleCount=${anonToggle}`);
    ok('G20-8 匿名点「列表视图」⇒ 生效', await clickView('列表视图'));
    await sleep(1600);
    const s5 = await viewState();
    ok(
      'G20-9 匿名列表形态生效（/skills 6 行 · 无分页控件 = 正当缺席）',
      s5?.on[0] === '列表视图' && s5?.grid === false && s5?.rows === 6 && s5?.pagination === false,
      JSON.stringify(s5),
    );
    await shot('20-skills-list-view-anon');
  }
}

/* 段选：`SMOKE_ONLY=G21`（可选 G21）⇒ 命中即整段执行 */
/* ═══════════════ G21 · 折叠搜索（ClawHub 同构 · **T11-e**）
   —— 用户 2026-09-18：「参考切换按钮左侧的搜索，点击后下方显示一个搜索框，我们也做一个」
   ClawHub 实测规格：触发钮 = 图标钮（42×42 · `aria-label="Search skills"` · 开时 `aria-expanded=true`）；
   面板 = 工具条**下方** · 宽度与工具条等宽 · 内含「放大镜 + 无边框输入 + 关闭钮」。 ═══════════════ */
if (want('G21')) {
  {
    const TRIG = `[...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '') === '搜索')`;
    const VIEWBTN = `[...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '') === '列表视图')`;
    const PROBE = `(() => {
    const t = ${TRIG};
    const v = ${VIEWBTN};
    const bar = t && t.parentElement;
    const g = [...document.querySelectorAll('[data-slot="input-group"]')].find((x) => x.getBoundingClientRect().width > 0);
    const inp = g && g.querySelector('input');
    return JSON.stringify({
      trigBox: t ? Math.round(t.getBoundingClientRect().width) + 'x' + Math.round(t.getBoundingClientRect().height) : null,
      trigX: t ? Math.round(t.getBoundingClientRect().left) : null,
      viewX: v ? Math.round(v.getBoundingClientRect().left) : null,
      expanded: t ? t.getAttribute('aria-expanded') : null,
      barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : null,
      barW: bar ? Math.round(bar.getBoundingClientRect().width) : null,
      groupTop: g ? Math.round(g.getBoundingClientRect().top) : null,
      groupW: g ? Math.round(g.getBoundingClientRect().width) : null,
      addons: g ? g.querySelectorAll('[data-slot="input-group-addon"]').length : 0,
      focused: !!inp && document.activeElement === inp,
      closeBtn: (() => { const c = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '') === '关闭搜索'); return c ? Math.round(c.getBoundingClientRect().width) : null; })(),
      // hero 卡 = **第一个内含 h1 的 Card**（实测：中心页 hero 恒为首卡且含 h1，筛选条卡无 h1，
      // 资产卡是 h3）。⚠️ 两个坑都踩过：① 页面上有**两个 h1**（顶栏 + hero），用第一个 h1 的
      // closest(card) 会命中顶栏的那个 ⇒ -1；② 按计数徽章文案匹配也不行 —— zh 文案
      // 「个技能资产」连写、「个 MCP 资产」带空格（正则一律失配）。
      heroInputs: (() => {
        const c = [...document.querySelectorAll('[data-slot="card"]')].find((x) => x.querySelector('h1'));
        return c ? c.querySelectorAll('input').length : -1;
      })(),
      visibleInputs: [...document.querySelectorAll('input')].filter((i) => i.getBoundingClientRect().width > 0).length,
      url: location.pathname + location.search,
    });
  })()`;
    type FoldSearch = {
      trigBox: string | null;
      trigX: number | null;
      viewX: number | null;
      expanded: string | null;
      barBottom: number | null;
      barW: number | null;
      groupTop: number | null;
      groupW: number | null;
      addons: number;
      focused: boolean;
      closeBtn: number | null;
      heroInputs: number;
      visibleInputs: number;
      url: string;
    };
    const probe = async (): Promise<FoldSearch | null> =>
      parseOrNull<FoldSearch>((await evalJs(PROBE)) as string);

    await nav(`${APP}/mcps`, 3400);
    const s1 = await probe();
    ok(
      'G21-1 收起态：触发钮为图标钮（32×32）· 位于视图切换钮**左侧** · `aria-expanded=false` · 面板未渲染',
      s1?.trigBox === '32x32' &&
        (s1.trigX ?? 0) < (s1.viewX ?? 0) &&
        s1.expanded === 'false' &&
        s1.groupTop === null &&
        s1.visibleInputs === 0 &&
        s1.heroInputs === 0,
      JSON.stringify(s1),
    );

    ok(
      'G21-2 点触发钮 ⇒ 展开',
      (await evalJs(
        `(() => { const t = ${TRIG}; if (!t) return false; t.click(); return true; })()`,
      )) === true,
    );
    await sleep(1600);
    const s2 = await probe();
    ok(
      'G21-3 展开态：面板在工具条**下方**（top ≥ 工具条底）· 宽度与工具条等宽 · 两枚 addon · 自动聚焦',
      s2?.expanded === 'true' &&
        (s2.groupTop ?? 0) >= (s2.barBottom ?? 0) &&
        Math.abs((s2.groupW ?? 0) - (s2.barW ?? 0)) <= 2 &&
        s2.addons === 2 &&
        s2.focused &&
        s2.closeBtn === 24,
      JSON.stringify(s2),
    );

    ok(
      'G21-4 面板输入 ⇒ URL `?q=` 且计数改「筛选结果」（收窄）',
      (await (async () => {
        await evalJs(`(() => {
        const g = [...document.querySelectorAll('[data-slot="input-group"]')].find((x) => x.getBoundingClientRect().width > 0);
        const inp = g.querySelector('input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, 'seed-page');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`);
        await sleep(1600);
        const s = await probe();
        const narrowed =
          ((await evalJs('document.body.innerText.includes("筛选结果")')) as boolean) === true;
        return s?.url.includes('q=seed-page') === true && narrowed;
      })()) === true,
    );

    const s3 = await probe();
    ok(
      'G21-5 页头搜索**已移除**（去重复入口 · 用户 2026-09-18）：hero 卡内 input 数 = 0 · 全页可见 input = 1（即面板这个）',
      s3?.heroInputs === 0 && s3?.visibleInputs === 1,
      `heroInputs=${s3?.heroInputs} · visibleInputs=${s3?.visibleInputs}`,
    );

    ok(
      'G21-6 点关闭钮 ⇒ 清空 q（URL 去 q）+ 收起（面板消失 · `aria-expanded=false`）',
      (await (async () => {
        const clicked =
          (await evalJs(
            `(() => { const c = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '') === '关闭搜索'); if (!c) return false; c.click(); return true; })()`,
          )) === true;
        await sleep(1600);
        const s = await probe();
        return (
          clicked &&
          s?.url === '/mcps' &&
          s.expanded === 'false' &&
          s.groupTop === null &&
          s.visibleInputs === 0
        );
      })()) === true,
    );
  }
}

/* 段选：`SMOKE_ONLY=G22`（可选 G22）⇒ 命中即整段执行 */
/* ═══════════════ G22 · 资产排序（**T11-f** · 2026-09-20）
   —— 用户：「资产排序的设计——收藏/下载/作者/名称 支持排序」+「列表视图表头可点排序，我的倾向是做」。
   契约（批 design §4.7 · **v1.27 起形态 = 官方 `Select`** —— 用户 2026-09-20 线框对比后拍板「方案 B」）：
   控件 = `Label「排序」+ SelectTrigger#market-sort`（`size="sm"` = **160×32**（与 EN 最长选项 `Most downloads`=106px 相容）· 计数行内 · 搜索钮左侧 · 默认档删参数）·
   URL `?sort=` / `?dir=` · **非法值静默回落** · **改排序回第 1 页** ·
   列表列头**四列可点**（名称/作者/下载/收藏；描述列不可点 · **首点 `desc`**、再点反向 —— F84 口径）· **匿名可用**。
   ⚠️ 本段**全程不登录**（顺带证明「匿名可用」）；`me` 面同参数的反证（不传 ⇒ 现状序 / 非法回落）归**服务端测试**
   （`assets/service.test.ts` + `http/assets.test.ts` + `http/me.test.ts` 共 12 例）。 ═══════════════ */
if (want('G22')) {
  {
    const API = 'http://localhost:3000';
    const PAGE_SLUGS = `[...document.querySelectorAll('a[href^="/assets/"]')].map((a) => decodeURIComponent(a.getAttribute('href').replace('/assets/', '')))`;
    /** 排序控件现值（Select 收起态显示文案 + `role`/尺寸真值） */
    const SEL = `(() => {
    const el = document.querySelector('#market-sort');
    return el
      ? JSON.stringify({
          role: el.getAttribute('role'),
          value: (el.querySelector('[data-slot="select-value"]')?.textContent || '').trim(),
          box: Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height),
          hasLabel: !!document.querySelector('label[for="market-sort"]'),
        })
      : null;
  })()`;
    const HEAD_SORT = (label: string) =>
      `(() => { const th = [...document.querySelectorAll('th')].find((x) => (x.textContent || '').trim() === ${JSON.stringify(label)}); return th ? (th.getAttribute('aria-sort') ?? 'null') : 'no-th'; })()`;
    const CLICK_HEAD = (label: string) =>
      `(() => { const th = [...document.querySelectorAll('th')].find((x) => (x.textContent || '').trim() === ${JSON.stringify(label)}); const b = th && th.querySelector('button'); if (!b) return false; b.click(); return true; })()`;
    const CLICK_VIEW = (label: string) =>
      `(() => { const b = document.querySelector('button[aria-label="' + ${JSON.stringify(label)} + '"]'); if (!b) return false; b.click(); return true; })()`;
    const curUrl = () => evalJs('location.pathname + location.search') as Promise<string>;
    const apiSlugs = async (query: string): Promise<string[]> => {
      const r = (await fetch(`${API}/api/assets?type=skill&limit=20${query}`)
        .then((x) => x.json())
        .catch(() => null)) as { items?: Array<{ slug: string }> } | null;
      return r?.items?.map((i) => i.slug) ?? [];
    };
    const selValue = async () => {
      const raw = (await evalJs(SEL)) as string | null;
      return raw
        ? (JSON.parse(raw) as { role: string; value: string; box: string; hasLabel: boolean })
        : null;
    };
    /** 换档（官方 `Select`：**真指针**开触发钮 → 真指针点 `[role=option]` —— 沿 G13 先例） */
    const selectSort = async (label: string) => {
      const opened = await realClickExpr(`document.querySelector('#market-sort')`);
      await sleep(700);
      const picked = await realClickExpr(
        `(() => [...document.querySelectorAll('[role="option"]')].find((o) => (o.innerText || '').trim() === ${JSON.stringify(label)}))()`,
      );
      await sleep(1900);
      return opened && picked;
    };
    const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

    // G22-1 默认档：干净 URL + Select 显示「最新」
    await nav(`${APP}/skills`, 3000);
    const dUrl = await curUrl();
    const dSel = await selValue();
    ok(
      'G22-1 默认档：URL 不含 `sort`（干净 URL）· 排序 `Select` 显示「最新」（`role=combobox` · 160×32）',
      dUrl === '/skills' &&
        dSel?.value === '最新' &&
        dSel?.role === 'combobox' &&
        dSel.box === '160x32',
      `${dUrl} · ${JSON.stringify(dSel)}`,
    );
    await shot('24-sort-select');

    // G22-2 默认序 = 接口默认序（行为零变化）
    const dRows = (await evalJs(PAGE_SLUGS)) as string[];
    const dApi = await apiSlugs('');
    ok(
      'G22-2 默认排序 = 接口默认序（`updated_at desc, id desc` —— 行为零变化）',
      dRows.length > 0 && same(dRows, dApi),
      `页面 ${dRows.length} 行 · 接口 ${dApi.length} 行 · 首条 ${dRows[0]}`,
    );

    // G22-3 四档逐档：Select 显示 + URL 写入 + 列表序与接口**逐项一致**
    for (const [label, key] of [
      ['下载量', 'downloads'],
      ['星标数', 'stars'],
      ['名称', 'name'],
      ['作者', 'author'],
    ] as const) {
      const picked = await selectSort(label);
      const u = await curUrl();
      const rows = (await evalJs(PAGE_SLUGS)) as string[];
      const expect = await apiSlugs(`&sort=${key}`);
      const shown = (await selValue())?.value;
      ok(
        `G22-3 ${label}档：Select 显示「${label}」· URL = \`?sort=${key}\` 且列表序与接口逐项一致`,
        picked && shown === label && u === `/skills?sort=${key}` && same(rows, expect),
        `${u} · 显示 ${shown} · 首条 ${rows[0]}（接口 ${expect[0]}）`,
      );
    }

    // G22-4 改排序 ⇒ 回第 1 页（`page` 参数消失）· 深链第 2 页本身合法
    await nav(`${APP}/mcps?page=2`, 3000);
    const p2Url = await curUrl();
    const p2Rows = ((await evalJs(PAGE_SLUGS)) as string[]).length;
    await selectSort('星标数');
    const afterPick = await curUrl();
    ok(
      'G22-4 改排序 ⇒ **回第 1 页**（URL 去 `page`）；深链 `?page=2` 本身合法（有行）',
      p2Url === '/mcps?page=2' && p2Rows > 0 && afterPick === '/mcps?sort=stars',
      `${p2Url}（${p2Rows} 行）→ ${afterPick}`,
    );

    // G22-5 非法值静默回落（不空白、不报错、控件归一）
    await nav(`${APP}/skills?sort=bogus`, 3000);
    const bUrl = await curUrl();
    const bSel = (await selValue())?.value;
    const bRows = (await evalJs(PAGE_SLUGS)) as string[];
    ok(
      'G22-5 非法值（`?sort=bogus`）⇒ 静默回落默认序 + Select 归一「最新」（不空白 / 不报错 / 不 400）',
      bUrl === '/skills?sort=bogus' && bSel === '最新' && bRows.length > 0 && same(bRows, dApi),
      `${bUrl} · 显示 ${bSel} · ${bRows.length} 行`,
    );
    await shot('25-sort-bogus-fallback');

    // G22-6 列头两态（切列表视图）：同列切换 asc → desc
    await nav(`${APP}/skills?sort=name&dir=asc`, 3000);
    await evalJs(CLICK_VIEW('列表视图'));
    await sleep(1600);
    const ascState = (await evalJs(HEAD_SORT('名称'))) as string;
    await evalJs(CLICK_HEAD('名称'));
    await sleep(1900);
    const descState = (await evalJs(HEAD_SORT('名称'))) as string;
    const descUrl = await curUrl();
    ok(
      'G22-6 列头两态：`?dir=asc` ⇒ 名称列 `aria-sort=ascending`；**点同列** ⇒ `descending` + URL `dir=desc`',
      ascState === 'ascending' &&
        descState === 'descending' &&
        descUrl === '/skills?sort=name&dir=desc',
      `${ascState} → ${descState} · ${descUrl}`,
    );
    await shot('26-sort-header-desc');

    // G22-6b 点异列 ⇒ 首点 `desc`（F84 订正口径）
    await evalJs(CLICK_HEAD('下载'));
    await sleep(1900);
    const dlState = (await evalJs(HEAD_SORT('下载'))) as string;
    const dlUrl = await curUrl();
    const dlRows = (await evalJs(PAGE_SLUGS)) as string[];
    const dlApi = await apiSlugs('&sort=downloads&dir=desc');
    ok(
      'G22-6b 点**异列**（下载）⇒ 首点 `descending` + URL `?sort=downloads&dir=desc` + 序与接口一致（F84）',
      dlState === 'descending' &&
        dlUrl === '/skills?sort=downloads&dir=desc' &&
        same(dlRows, dlApi),
      `${dlUrl} · ${dlState}`,
    );

    // G22-7 描述列不可点（五列可点 = 名称/作者/下载/收藏/更新）
    const thMap = (await evalJs(
      `JSON.stringify([...document.querySelectorAll('th')].map((x) => ((x.textContent || '').trim() + ':' + (x.querySelector('button') ? 'btn' : 'text'))))`,
    )) as string;
    ok(
      'G22-7 列头可点 = 名称 / 作者 / 下载 / 收藏 / **更新** 五列（**描述列不可点**）',
      thMap.includes('描述:text') &&
        !thMap.includes('描述:btn') &&
        ['名称:btn', '作者:btn', '下载:btn', '收藏:btn', '更新:btn'].every((s) =>
          thMap.includes(s),
        ),
      thMap,
    );

    // G22-8 双视图同序（列表改排序 → 切回网格 ⇒ 排序保持）
    await evalJs(CLICK_VIEW('网格视图'));
    await sleep(1300);
    const gUrl = await curUrl();
    const gSel = (await selValue())?.value;
    const gRows = (await evalJs(PAGE_SLUGS)) as string[];
    ok(
      'G22-8 双视图同序：列表视图改排序后切回网格 ⇒ 排序保持（URL + Select 显示 + 顺序均一致）',
      gUrl === '/skills?sort=downloads&dir=desc' && gSel === '下载量' && same(gRows, dlApi),
      `${gUrl} · 显示 ${gSel} · 首条 ${gRows[0]}`,
    );
    await shot('27-sort-grid-preserved');

    // G22-6c 点「更新」列 ⟷ **「最新」档**（用户 2026-09-20：「资产列加一个『更新』…和我们的『排序-最新』相对应」）
    //   语义（注意）：默认档即「最新」⇒ 「更新」列**恒为 active**，点它是**同列反向**（不是首点 desc）
    //   ① URL 不出现 `?sort=updated`（列名 ≠ 档位；`updated` 在白名单外）② Select 仍显示「最新」
    //   ③ `aria-sort` 与该向的接口序逐项一致 ④ 再点 ⇒ 反向
    await nav(`${APP}/skills`, 3000);
    await evalJs(CLICK_VIEW('列表视图'));
    await sleep(1600);
    const updInit = (await evalJs(HEAD_SORT('更新'))) as string; // 默认档 ⇒ descending
    await evalJs(CLICK_HEAD('更新'));
    await sleep(1900);
    const upd1Url = await curUrl();
    const upd1Sort = (await evalJs(HEAD_SORT('更新'))) as string;
    const upd1Sel = (await selValue())?.value;
    const upd1Rows = (await evalJs(PAGE_SLUGS)) as string[];
    const upd1Api = await apiSlugs('&sort=newest&dir=asc');
    await evalJs(CLICK_HEAD('更新'));
    await sleep(1900);
    const upd2Url = await curUrl();
    const upd2Rows = (await evalJs(PAGE_SLUGS)) as string[];
    const upd2Api = await apiSlugs('&sort=newest&dir=desc');
    ok(
      'G22-6c 点「更新」列 ⇒ **仍属「最新」档**（URL 无 `?sort=updated` · Select 显示「最新」· 同列反向 desc→asc→desc 且序与接口逐项一致）',
      updInit === 'descending' &&
        !upd1Url.includes('sort=updated') &&
        upd1Sel === '最新' &&
        upd1Sort === 'ascending' &&
        same(upd1Rows, upd1Api) &&
        !upd2Url.includes('sort=updated') &&
        same(upd2Rows, upd2Api),
      `init ${updInit} → ${upd1Url} ${upd1Sort} → ${upd2Url} · 首条 ${upd2Rows[0]}`,
    );
    await shot('28-sort-updated-column');

    // G22-9 匿名可用（本段全程未登录）
    const meStatus = (await fetch(`${API}/api/auth/me`)
      .then((r) => r.status)
      .catch(() => 0)) as number;
    ok(
      'G22-9 **匿名可用**：本段全程未登录（`/api/auth/me` = 401）而排序 Select / 列头全部生效',
      meStatus === 401,
      `me=${meStatus}`,
    );
  }
}

/* 本段不参与 `SMOKE_ONLY` 分段：永远执行（聚合本次实际跑过的段） */
/* ═══════════════ G19 · 无 JS 错误 ═══════════════ */
if (ONLY.size) {
  const missed = [...ONLY].filter((i) => !HIT.has(i));
  ok(
    `SMOKE_ONLY 命中检查：${[...ONLY].join(',')}`,
    missed.length === 0,
    missed.length
      ? `未命中 ${missed.join(',')}（可选段：${SECTION_IDS.join(' ')}）`
      : `命中 ${HIT.size} 段`,
  );
}

ok('G19 全程 NO JS ERRORS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' ¶ '));

console.log(
  `\n${fail === 0 && timeouts === 0 ? '✅' : '❌'} M4b-4 dogfood: PASS ${pass} · FAIL ${fail} · CDP 超时 ${timeouts}`,
);
if (ONLY.size) {
  console.log(
    `⚠️ 分段模式（SMOKE_ONLY=${[...ONLY].join(',')}）—— 本次**只覆盖命中段**：不得作为收口 / 批末证据，` +
      '收口请不带该变量全跑',
  );
}
process.exit(fail === 0 && timeouts === 0 ? 0 : 1);
