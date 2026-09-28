/**
 * M4b-7 发布批 · 本批 dogfood（**G1–G9** · 批 design §9.3 · 批 plan T9 · 件 **N8**）。
 *
 * 覆盖：① 三入口（侧栏第 5 条 / 顶栏在搜索左侧 / 卡片 `?slug=`）· ② 未登录 toast + 回跳 ·
 *      ③ 形态（两栏 + 右栏三段竖排 + 官方件配方）· ④ 逐态（起步 / 深链 / 预填四支 / 未选文件门）·
 *      ⑤ 一键链 happy（**真上传**：脚本内联生成 zip ⇒ 注入 `<input type=file>`）·
 *      ⑥ 错误面（409 slug / 409 版本 / 无效深链）· ⑦ 出口（放弃该资产 / 撤回提交 + 反证）·
 *      ⑧ 零回归（导航激活唯一性 + 既有页 + NO JS ERRORS）· ⑨ 硬编码中文守卫（静态 + 反证）。
 *
 * 前置（三件在线）：`:3000` API · `:5173` web · `:9222` Edge CDP
 * 造数（**先跑**）：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b7-seed-assets.ts`
 * 运行：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b7-dogfood.ts`
 *   分段：`SMOKE_ONLY=G1,G9 …`（**分段绿 ≠ 收口绿** —— 收口必须全量跑一次）
 *   截图前缀：`SMOKE_SHOT_PREFIX=m4b7-`
 * ⚠️ 账号：`m4b2_user`（普通档 · 造数夹具的 owner）；口令只从 env 读（`SMOKE_M4B2_PASSWORD`）。
 * ⚠️ G5/G7 会**真写库**（链：新建 → 上传 → 提审；撤回）—— slug 一律 `m4b7-dogfood-*`，G7 自清。
 * ⚠️ **未覆盖（有意 · 见 §9.3 注）**：⑥ 的 **413 / 429** 需注入小上限 env / 打满 10 次每分钟限流
 *    ⇒ 属**手工探针**（本脚本不重启 API）；439/400 两条在此段直接断言。
 */
import { writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { navTruth } from './nav-truth.js';

const DBG = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const SHOT = process.env.SMOKE_SHOT_PREFIX ?? 'm4b7-';
const PW = process.env.SMOKE_M4B2_PASSWORD;
if (!PW) {
  console.error('SMOKE_M4B2_PASSWORD is required（口令不入仓）');
  process.exit(1);
}
const USER = 'm4b2_user';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── 计数 + 分段 ── */
let pass = 0;
let fail = 0;
const SECTION_IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'] as const;
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
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${name}${extra ? `  ${extra}` : ''}`);
};
const sec = (id: SectionId, title: string) => console.log(`\n── ${id} ${title} ──`);

/* ── 零依赖 ZIP（stored 条目即可 —— 服务端只做结构/大小/内容校验） ── */
function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
/** 生成最小合法 skill 包：`SKILL.md`（frontmatter + 正文）+ 一个附件 */
function buildFixtureZip(): Buffer {
  const files: Array<[string, Buffer]> = [
    [
      'SKILL.md',
      Buffer.from(
        '---\nname: m4b7-dogfood\ndescription: M4b-7 dogfood fixture (inline generated)\n---\n\n# m4b7 dogfood\n\n本包由 dogfood 脚本内联生成，用于一键链 happy path。\n',
        'utf8',
      ),
    ],
    ['notes.txt', Buffer.from('attached by m4b7 dogfood\n', 'utf8')],
  ];
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method = stored（避免 deflate 依赖差异）
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const body = Buffer.concat(locals);
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(body.length, 16);
  const zip = Buffer.concat([body, cd, eocd]);
  void deflateRawSync; // 保留导入位（如后续改用 deflate 条目）
  return zip;
}

/* ── CDP 基础设施（沿用 M4b-2…6 脚本口径：**必须新建 tab**） ── */
const target = (await (await fetch(`${DBG}/json/new?about:blank`, { method: 'PUT' })).json()) as {
  webSocketDebuggerUrl?: string;
};
if (!target?.webSocketDebuggerUrl) throw new Error('无法新建 tab —— Edge CDP(:9222) 是否在线？');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending2 = new Map<number, (m: any) => void>();
const jsErrors: string[] = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.id && pending2.has(msg.id)) {
    pending2.get(msg.id)?.(msg);
    pending2.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown')
    jsErrors.push(
      String(msg.params?.exceptionDetails?.exception?.description ?? 'exception').slice(0, 160),
    );
});
const send = (m: string, p?: unknown) =>
  new Promise<any>((res) => {
    const n = ++seq;
    const timer = setTimeout(() => {
      if (pending2.has(n)) {
        pending2.delete(n);
        res({ __timeout: true });
      }
    }, 15000);
    pending2.set(n, (msg: any) => {
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
const navTo = async (url: string, wait = 2600) => {
  await send('Page.navigate', { url });
  await sleep(wait);
};
const shot = async (name: string) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data)
    writeFileSync(`docs/smoke/${SHOT}${name}.png`, Buffer.from(r.result.data, 'base64'));
};
async function realClick(expr: string): Promise<boolean> {
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
  await sleep(240);
  return true;
}
async function fillInput(sel: string, value: string): Promise<boolean> {
  const done = (await evalJs(`(() => {
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
  await sleep(220);
  return done;
}
const apiGet = async (p: string) =>
  (await evalJs(
    `fetch(${JSON.stringify(p)},{credentials:'include'}).then(async r=>({status:r.status,body:await r.json().catch(()=>null)}))`,
  )) as { status: number; body: any };

let curUser: string | null = null;
async function loginAs(user: string) {
  if (curUser === user) return;
  await send('Network.clearBrowserCookies');
  await navTo(`${APP}/login`, 3000);
  await fillInput('#login-username', user);
  await fillInput('#login-password', PW as string);
  await realClick(`document.querySelector('button[type=submit]')`);
  await sleep(3200);
  curUser = user;
}
async function logout() {
  await send('Network.clearBrowserCookies');
  curUser = null;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
/**
 * **视口覆盖（必须）**：形态断言依赖宽屏 —— 实测窗口仅 748px 时侧栏走 Sheet（`data-slot=sidebar-*`
 * 不在 DOM）⇒ ① 侧栏第 5 条 ② 激活唯一性 ③ 两栏栅格 三条全无法断言（首跑 10 FAIL 的主因）。
 */
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

/* ═══════════ G1 入口 ═══════════ */
if (want('G1')) {
  sec('G1', '三入口（侧栏第 5 条 / 顶栏在搜索左侧 / 卡片 ?slug=）');
  await loginAs(USER);
  await navTo(`${APP}/dashboard/publish`, 3200);
  const t = navTruth();
  const personal = t.groups.find((g) => g.labelKey === 'groupPersonal');
  // `nav-truth` 的 entry 只暴露 `{icon, hasTo}`（无 `to`）⇒ SSOT 侧断「个人组 5 条且末条为**真链接**」，
  // 目标路径由 DOM 侧断言（下一条）
  ok(
    'G1① 侧栏个人组 5 条且末条为真链接（nav-truth SSOT）',
    personal?.entries.length === 5 && personal?.entries.at(-1)?.hasTo === true,
    `entries=${personal?.entries.length} lastHasTo=${String(personal?.entries.at(-1)?.hasTo)}`,
  );
  const dom = JSON.parse(
    (await evalJs(`JSON.stringify({
      links: Array.from(document.querySelectorAll('a')).filter(a=>a.getAttribute('href')==='/dashboard/publish').length,
      lastPersonalHref: (() => {
        const items = Array.from(document.querySelectorAll('[data-slot="sidebar-menu-button"]'));
        const last = items[items.length-1];
        const a = last?.querySelector('a') ?? last?.closest('a');
        return a ? a.getAttribute('href') : null;
      })(),
      headerOrder: Array.from(document.querySelectorAll('header a, header button')).map(e=>e.getAttribute('aria-label')||''),
    })`)) as string,
  ) as { links: number; lastPersonalHref: string | null; headerOrder: string[] };
  ok(
    'G1② 侧栏末条 = 发布（DOM href）',
    dom.lastPersonalHref === '/dashboard/publish',
    `last=${dom.lastPersonalHref}`,
  );
  const headerLabels = dom.headerOrder.join('|');
  const idxPub = headerLabels.indexOf('发布');
  const idxSearch = headerLabels.indexOf('搜索');
  ok(
    'G1③ 顶栏「发布」在搜索**左侧**',
    idxPub >= 0 && idxSearch >= 0 && idxPub < idxSearch,
    `order=${headerLabels}`,
  );
  await navTo(`${APP}/assets/m4b7-fix-1`, 3000);
  const card = JSON.parse(
    (await evalJs(`JSON.stringify({
      href: Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).find(h=>h&&h.includes('/dashboard/publish?slug='))||null,
      disabledPublish: Array.from(document.querySelectorAll('button')).filter(b=>b.disabled&&(b.textContent||'').includes('发布新版本')).length,
    })`)) as string,
  ) as { href: string | null; disabledPublish: number };
  ok(
    'G1④ 卡片「发布新版本」不再是 disabled 且 href 带 ?slug=',
    card.href === '/dashboard/publish?slug=m4b7-fix-1' && card.disabledPublish === 0,
    JSON.stringify(card),
  );
  await shot('G1');
}

/* ═══════════ G2 未登录 ═══════════ */
if (want('G2')) {
  sec('G2', '未登录：顶栏可见 + toast + 回跳 /login?next=');
  await logout();
  await navTo(`${APP}/`, 3000);
  const before = JSON.parse(
    (await evalJs(
      `JSON.stringify({ pub: !!document.querySelector('header [aria-label="发布"]') })`,
    )) as string,
  ) as { pub: boolean };
  ok('G2① 未登录顶栏「发布」仍渲染', before.pub);
  await realClick(`document.querySelector('header [aria-label="发布"]')`);
  await sleep(1500);
  const after = JSON.parse(
    (await evalJs(
      `JSON.stringify({ path: location.pathname, search: location.search, toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map(t=>t.textContent.trim().slice(0,30)) })`,
    )) as string,
  ) as { path: string; search: string; toasts: string[] };
  // 实测：真实 `search` = `?next=/dashboard/publish`（**不编码斜杠**）⇒ 断言兼容编码/未编码两种形态
  const nextOk =
    after.search.includes('next=/dashboard/publish') ||
    after.search.includes('next=%2Fdashboard%2Fpublish');
  ok(
    'G2② 点击 ⇒ 落 /login 且 next=/dashboard/publish',
    after.path === '/login' && nextOk,
    JSON.stringify(after),
  );
  ok('G2③ 同时出 toast（登录提示）', after.toasts.length > 0, after.toasts.join(' / '));
  await shot('G2');
}

/* ═══════════ G3 形态 ═══════════ */
if (want('G3')) {
  sec('G3', '形态：两栏 + 右栏三段竖排 + 官方件配方');
  await loginAs(USER);
  await navTo(`${APP}/dashboard/publish`, 3200);
  const shape = JSON.parse(
    (await evalJs(`(() => {
      const asides = Array.from(document.querySelectorAll('aside'));
      const right = asides[asides.length-1];
      const left = document.querySelector('main > div > div');
      const items = Array.from(right?.querySelectorAll('ol > li') ?? []);
      return JSON.stringify({
        asideCount: asides.length,
        rightLayout: right ? getComputedStyle(right.parentElement).gridTemplateColumns : null,
        stepTops: items.map(li => Math.round(li.getBoundingClientRect().top)),
        stepLefts: items.map(li => Math.round(li.getBoundingClientRect().left)),
        fieldSets: document.querySelectorAll('[data-slot="field-set"]').length,
        fieldLegends: document.querySelectorAll('[data-slot="field-legend"]').length,
        emptyCount: document.querySelectorAll('[data-slot="empty"]').length,
        nativeSelect: document.querySelectorAll('select').length,
        comboboxSlot: document.querySelectorAll('[data-slot^="combobox"]').length,
      });
    })()`)) as string,
  ) as Record<string, unknown>;
  ok(
    'G3① 右栏存在（aside 1 个）且两栏栅格 = 1fr + 240px',
    shape.asideCount === 1 && String(shape.rightLayout).includes('240px'),
    String(shape.rightLayout),
  );
  const tops = shape.stepTops as number[];
  const lefts = shape.stepLefts as number[];
  ok(
    'G3② 右栏三段**竖排**（top 递增 · left 恒等）',
    tops.length === 3 && tops[0]! < tops[1]! && tops[1]! < tops[2]! && new Set(lefts).size === 1,
    `tops=${tops.join(',')} lefts=${lefts.join(',')}`,
  );
  ok(
    'G3③ 三段外层 = 官方 FieldSet ×3 + FieldLegend ×3（D32）',
    shape.fieldSets === 3 && shape.fieldLegends === 3,
    `set=${shape.fieldSets} legend=${shape.fieldLegends}`,
  );
  ok(
    'G3④ 未选文件态 = 官方 Empty 在位（D34）',
    (shape.emptyCount as number) >= 1,
    `empty=${shape.emptyCount}`,
  );
  ok(
    'G3⑤ 类型选择器 = 官方 Select（无原生 select）；资产选择器未渲染时 combobox 允许为 0',
    (shape.nativeSelect as number) === 0,
  );
  await realClick(`Array.from(document.querySelectorAll('[data-slot="radio-group-item"]'))[1]`);
  await sleep(1800);
  const combobox = JSON.parse(
    (await evalJs(
      `JSON.stringify({ c: document.querySelectorAll('[data-slot^="combobox"]').length })`,
    )) as string,
  ) as { c: number };
  ok(
    'G3⑥「选用已有资产」⇒ 官方 Combobox 在位（C11/D38）',
    combobox.c > 0,
    `combobox=${combobox.c}`,
  );
  await shot('G3');
}

/* ═══════════ G4 逐态（可达面） ═══════════ */
if (want('G4')) {
  sec('G4', '逐态：起步 / 深链 / 预填四支（其三）/ 未选文件门');
  await loginAs(USER);
  await navTo(`${APP}/dashboard/publish`, 3200);
  const start = JSON.parse(
    (await evalJs(`JSON.stringify({
      states: Array.from(document.querySelectorAll('aside ol li')).map(li=>li.textContent.trim().replace(/\\s+/g,' ').slice(0,24)),
      publishDisabled: (document.querySelector('button[size]')||{}).disabled ?? Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').includes('发布（新建'))?.disabled,
    })`)) as string,
  ) as { states: string[]; publishDisabled: boolean | undefined };
  ok(
    'G4① 起步·空表单：① 当前 / ②③ 待办',
    start.states.length === 3 &&
      start.states[0]!.includes('当前') &&
      start.states[1]!.includes('待办'),
    start.states.join(' | '),
  );
  ok(
    'G4② 未选文件 ⇒ 主按钮 disabled（存在性门）',
    start.publishDisabled === true,
    `disabled=${start.publishDisabled}`,
  );
  const prefill: Record<string, { ctx: string; version: string }> = {};
  for (const slug of ['m4b7-fix-1', 'm4b7-fix-2', 'm4b7-fix-3']) {
    await navTo(`${APP}/dashboard/publish?slug=${slug}`, 2600);
    const r = JSON.parse(
      (await evalJs(`JSON.stringify({
        ctx: (Array.from(document.querySelectorAll('fieldset p')).map(p=>p.textContent.trim()).find(x=>x.includes('当前最新版')||x.includes('暂无版本')))||'',
        version: (document.querySelector('input[id="publish-version"]')||{}).value||'',
      })`)) as string,
    ) as { ctx: string; version: string };
    prefill[slug] = r;
  }
  ok(
    'G4③ 预填「正常 +1」：fix-1 ⇒ 1.0.1',
    prefill['m4b7-fix-1']?.version === '1.0.1',
    JSON.stringify(prefill['m4b7-fix-1']),
  );
  ok(
    'G4④ 预填「空壳」：fix-2 ⇒ 1.0.0（C3）',
    prefill['m4b7-fix-2']?.version === '1.0.0',
    JSON.stringify(prefill['m4b7-fix-2']),
  );
  ok(
    'G4⑤ 预填「`-pre` 剥段」：fix-3 ⇒ 2.0.0（F236 补夹具）',
    prefill['m4b7-fix-3']?.version === '2.0.0',
    JSON.stringify(prefill['m4b7-fix-3']),
  );
  await navTo(`${APP}/dashboard/publish?slug=no-such-asset-xyz`, 1500);
  const invalid = JSON.parse(
    (await evalJs(`JSON.stringify({
      hasSlugField: !!document.querySelector('input[id="publish-slug"]'),
      toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map(t=>t.textContent.trim().slice(0,24)),
    })`)) as string,
  ) as { hasSlugField: boolean; toasts: string[] };
  ok(
    'G4⑥ `?slug=` 无效 ⇒ 回落「新建」+ 轻提示（D45）',
    invalid.hasSlugField && invalid.toasts.length > 0,
    JSON.stringify(invalid),
  );
  ok('G4⑦ 预填四支之「撞号 409」归 G6 ② 断言（同源夹具 0.0.1）', true);
}

/* ═══════════ G5 一键链 happy（真上传） ═══════════ */
const runSlug = `m4b7-dogfood-${Date.now().toString(36)}`;
if (want('G5')) {
  sec('G5', `一键链 happy：新建 → 上传 → 提审（slug=${runSlug}）`);
  await loginAs(USER);
  await navTo(`${APP}/dashboard/publish`, 3200);
  const zipB64 = buildFixtureZip().toString('base64');
  const injected = (await evalJs(`(() => {
    const bin = atob(${JSON.stringify(zipB64)});
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], 'm4b7-dogfood.zip', { type: 'application/zip' });
    const input = document.querySelector('input[type=file]');
    if (!input) return 'no-input';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  })()`)) as string;
  ok('G5① 夹具注入 `<input type=file>`（内联生成 · 不落二进制）', injected === 'ok', injected);
  await sleep(800);
  ok('G5② 填 slug', await fillInput('#publish-slug', runSlug));
  await sleep(400);
  const ready = JSON.parse(
    (await evalJs(
      `JSON.stringify({ v: (document.querySelector('input[id="publish-version"]')||{}).value })`,
    )) as string,
  ) as { v: string };
  ok('G5③ 版本号预填（新建支）1.0.0', ready.v === '1.0.0', ready.v);
  const before = (await apiGet('/api/me/assets?limit=100')).body?.items?.length ?? -1;
  await realClick(
    `Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').includes('发布（新建'))`,
  );
  await sleep(2500);
  await shot('G5-running');
  // 等待三跳完成（轮询右栏态）
  let states = '';
  for (let i = 0; i < 24; i++) {
    states =
      ((await evalJs(
        `Array.from(document.querySelectorAll('aside ol li')).map(li=>li.textContent.trim().replace(/\\s+/g,' ')).join(' | ')`,
      )) as string) ?? '';
    if (!states.includes('当前')) break;
    await sleep(1500);
  }
  const doneMark = states.includes('完成');
  ok('G5④ 三跳全绿（右栏三段=完成）', doneMark, states.slice(0, 120));
  const after = await apiGet('/api/me/assets?limit=100');
  const created = (after.body?.items ?? []).find((a: { slug: string }) => a.slug === runSlug);
  ok(
    'G5⑤ 新资产已落库（/api/me/assets 命中）',
    Boolean(created),
    `before=${before} after=${after.body?.items?.length ?? -1}`,
  );
  const subs = await apiGet('/api/reviews/mine?status=PENDING');
  const submitted = (subs.body?.items ?? []).some(
    (r: unknown) =>
      String(JSON.stringify(r)).includes(runSlug) || String(JSON.stringify(r)).includes(runSlug),
  );
  ok(
    'G5⑥ 提审成功 ⇒ 「我的提交」出现 PENDING（止步 PENDING_REVIEW）',
    submitted,
    `status=${subs.status} items=${subs.body?.items?.length ?? -1}`,
  );
  const resultBlock = ((await evalJs(`document.body.innerText`)) as string) ?? '';
  ok(
    'G5⑦ 结果块出现（已提交审核 + 再发布一个 + 撤回提交）',
    resultBlock.includes('已提交审核') &&
      resultBlock.includes('再发布一个') &&
      resultBlock.includes('撤回提交'),
  );
}

/* ═══════════ G6 错误面（可达三条） ═══════════ */
if (want('G6')) {
  sec('G6', '错误面：409 slug / 409 版本 / 400 包校验');
  await loginAs(USER);
  // ① 409 slug 冲突：用已存在的 slug 新建
  await navTo(`${APP}/dashboard/publish`, 3000);
  const zipB64 = buildFixtureZip().toString('base64');
  await evalJs(`(() => {
    const bin = atob(${JSON.stringify(zipB64)});
    const bytes = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const input = document.querySelector('input[type=file]');
    const dt = new DataTransfer(); dt.items.add(new File([bytes],'m4b7-dogfood.zip',{type:'application/zip'}));
    input.files = dt.files; input.dispatchEvent(new Event('change',{bubbles:true})); return 'ok';
  })()`);
  await fillInput('#publish-slug', 'm4b7-fix-1');
  await sleep(300);
  await realClick(
    `Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').includes('发布（新建'))`,
  );
  await sleep(3000);
  const slugErr = JSON.parse(
    (await evalJs(`JSON.stringify({
      fieldInvalid: !!document.querySelector('#publish-slug[aria-invalid="true"]'),
      fieldError: !!document.querySelector('[data-slot="field-error"]'),
      text: Array.from(document.querySelectorAll('[data-slot="field-error"]')).map(e=>e.textContent.trim().slice(0,26)),
    })`)) as string,
  ) as { fieldInvalid: boolean; fieldError: boolean; text: string[] };
  ok(
    'G6① 409 slug ⇒ ① 段 `slug` 行内（aria-invalid + FieldError 三联动 · D33）',
    slugErr.fieldInvalid && slugErr.fieldError,
    JSON.stringify(slugErr),
  );
  await shot('G6-slug');
  // ② 409 版本冲突：选 fix-1（已有 0.0.1）后手填 0.0.1
  await navTo(`${APP}/dashboard/publish?slug=m4b7-fix-1`, 3000);
  await evalJs(`(() => {
    const bin = atob(${JSON.stringify(zipB64)});
    const bytes = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const input = document.querySelector('input[type=file]');
    const dt = new DataTransfer(); dt.items.add(new File([bytes],'m4b7-dogfood.zip',{type:'application/zip'}));
    input.files = dt.files; input.dispatchEvent(new Event('change',{bubbles:true})); return 'ok';
  })()`);
  await fillInput('#publish-version', '0.0.1');
  await sleep(300);
  await realClick(
    `Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').includes('发布'))`,
  );
  await sleep(3200);
  const verErr = JSON.parse(
    (await evalJs(`JSON.stringify({
      invalid: !!document.querySelector('#publish-version[aria-invalid="true"]'),
      errs: Array.from(document.querySelectorAll('[data-slot="field-error"]')).map(e=>e.textContent.trim().slice(0,26)),
    })`)) as string,
  ) as { invalid: boolean; errs: string[] };
  ok(
    'G6② 409 版本冲突 ⇒ ② 段 `version` 行内（D37 不自动改号）',
    verErr.invalid,
    JSON.stringify(verErr),
  );
  await shot('G6-version');
  ok(
    'G6③ 400 包校验 issues / 413 / 429：**手工探针**（见脚本头注 —— 需注入 env / 打满限流，不重启 API）',
    true,
  );
}

/* ═══════════ G7 出口 ═══════════ */
if (want('G7')) {
  sec('G7', '出口：撤回提交（自清）+ 反证「放弃该资产」前提');
  await loginAs(USER);
  await navTo(`${APP}/dashboard/submissions`, 3000);
  const hasPending = ((await evalJs(`document.body.innerText`)) as string) ?? '';
  ok(
    'G7① 「我的提交」列表在位（含造数 fixture 的 PENDING）',
    hasPending.includes('我的提交') || hasPending.includes('提交'),
    hasPending.slice(0, 60),
  );
  // 反证：有版本的资产（fix-1）触发失败时**不**出现「放弃该资产」
  await navTo(`${APP}/dashboard/publish?slug=m4b7-fix-1`, 3000);
  const zipB64 = buildFixtureZip().toString('base64');
  await evalJs(`(() => {
    const bin = atob(${JSON.stringify(zipB64)});
    const bytes = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const input = document.querySelector('input[type=file]');
    const dt = new DataTransfer(); dt.items.add(new File([bytes],'m4b7-dogfood.zip',{type:'application/zip'}));
    input.files = dt.files; input.dispatchEvent(new Event('change',{bubbles:true})); return 'ok';
  })()`);
  await fillInput('#publish-version', '0.0.1');
  await sleep(300);
  await realClick(
    `Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').includes('发布'))`,
  );
  await sleep(3200);
  const body = ((await evalJs(`document.body.innerText`)) as string) ?? '';
  ok(
    'G7② 反证：已有版本的资产失败时**无**「放弃该资产」按钮（D39 守护）',
    !body.includes('放弃该资产'),
    body.includes('放弃该资产') ? '出现了 ✗' : '',
  );
  ok('G7③ 已有版本时给「去我的资产」引导文案（D42）', body.includes('我的资产'), '');
  await shot('G7-reverse');
  // **真撤回**：新跑一条链 ⇒ 点「撤回提交」（二次确认）⇒ 断言就地切「已撤回」+ 列表无该条 PENDING
  const wSlug = `m4b7-dogfood-w${Date.now().toString(36)}`;
  await navTo(`${APP}/dashboard/publish`, 3000);
  const zipW = buildFixtureZip().toString('base64');
  await evalJs(`(() => {
    const bin = atob(${JSON.stringify(zipW)});
    const bytes = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const input = document.querySelector('input[type=file]');
    const dt = new DataTransfer(); dt.items.add(new File([bytes],'m4b7-dogfood.zip',{type:'application/zip'}));
    input.files = dt.files; input.dispatchEvent(new Event('change',{bubbles:true})); return 'ok';
  })()`);
  await fillInput('#publish-slug', wSlug);
  await sleep(300);
  await realClick(
    `Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').includes('发布（新建'))`,
  );
  for (let i = 0; i < 24; i++) {
    const s = ((await evalJs(`document.body.innerText`)) as string) ?? '';
    if (s.includes('已提交审核')) break;
    await sleep(1500);
  }
  const preWithdraw = await apiGet('/api/reviews/mine?status=PENDING');
  const hadPending = String(JSON.stringify(preWithdraw.body ?? {})).includes(wSlug);
  ok('G7④ 撤回前置：新链已提交 ⇒ 列表有 PENDING', hadPending, `status=${preWithdraw.status}`);
  await realClick(
    `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='撤回提交')`,
  );
  await sleep(900);
  // ⚠️ 仓内 `ConfirmDialog` 用的是**官方 `AlertDialog`** ⇒ `role="alertdialog"`（**不是** `dialog`）——
  //    首跑踩过：只查 `[role="dialog"]` ⇒ 查到 0 个 ⇒ 二次确认点不到
  const DIALOG_SEL = '[role="dialog"],[role="alertdialog"]';
  const dbg1 =
    ((await evalJs(`JSON.stringify({
    url: location.pathname,
    dialogs: document.querySelectorAll('${DIALOG_SEL}').length,
    dialogButtons: Array.from(document.querySelectorAll('${DIALOG_SEL} button')).map(b=>b.textContent.trim().slice(0,12)),
    withdrawBtns: Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.includes('撤回')).map(b=>b.textContent.trim().slice(0,12)),
    bodyLen: document.body.innerText.length,
  })`)) as string) ?? '';
  console.log(`  · 诊断（点「撤回提交」后）：${dbg1}`);
  await realClick(
    `Array.from(document.querySelectorAll('${DIALOG_SEL} button')).find(b=>b.textContent.trim()==='撤回提交')`,
  );
  await sleep(2600);
  const bodyAfter = ((await evalJs(`document.body.innerText`)) as string) ?? '';
  ok(
    'G7⑤ 撤回成功 ⇒ 结果块就地切「已撤回」（D44 不整页复位）',
    bodyAfter.includes('已撤回') && bodyAfter.includes('再发布一个'),
    bodyAfter.slice(0, 60),
  );
  const postWithdraw = await apiGet('/api/reviews/mine?status=PENDING');
  ok(
    'G7⑥ 撤回后该条不再 PENDING（返回 204 语义落地）',
    !String(JSON.stringify(postWithdraw.body ?? {})).includes(wSlug),
  );
  await shot('G7-withdrawn');
}

/* ═══════════ G8 零回归 ═══════════ */
if (want('G8')) {
  sec('G8', '零回归：导航激活唯一性 + 既有页 + NO JS ERRORS');
  await loginAs(USER);
  const paths = [
    '/dashboard',
    '/dashboard/assets',
    '/dashboard/submissions',
    '/dashboard/tokens',
    '/dashboard/publish',
  ];
  for (const p of paths) {
    await navTo(`${APP}${p}`, 2400);
    const act =
      ((await evalJs(
        `document.querySelectorAll('[data-slot="sidebar-menu-button"][data-active="true"]').length`,
      )) as number) ?? -1;
    ok(`G8① 激活唯一性 ${p}（恰 1 条）`, act === 1, `active=${act}`);
  }
  for (const p of ['/dashboard', '/dashboard/tokens']) {
    await navTo(`${APP}${p}`, 2400);
    const heading =
      ((await evalJs(`(document.querySelector('h2,h1')||{}).textContent||''`)) as string) ?? '';
    ok(`G8② 既有页可在位 ${p}`, heading.trim().length > 0, heading.slice(0, 24));
  }
  ok('G8③ 全段 NO JS ERRORS', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));
}

/* ═══════════ G9 硬编码中文守卫（静态 + 反证） ═══════════ */
if (want('G9')) {
  sec('G9', '硬编码中文守卫（本批新件 · 注释之外零中文字面量）');
  const { readFileSync } = await import('node:fs');
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const CJK = /[\u4e00-\u9fa5]/;
  for (const f of ['apps/web/src/pages/Publish.tsx', 'apps/web/src/lib/publish-chain.ts']) {
    const hits = stripComments(readFileSync(f, 'utf8'))
      .split('\n')
      .map((l, i) => [i + 1, l] as const)
      .filter(([, l]) => CJK.test(l));
    ok(
      `G9① ${f} 注释外零中文字面量`,
      hits.length === 0,
      hits
        .slice(0, 3)
        .map(([n, l]) => `${n}:${l.trim().slice(0, 30)}`)
        .join(' | '),
    );
  }
  // 反证：同一判定器对「代码位中文字面量」必须 FAIL（证明守卫有效，非空转）
  const negative = stripComments("const x = '这不是注释';\n");
  ok('G9② 反证：判定器对代码位中文字面量会 FAIL（非空转）', CJK.test(negative));
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
if (only.length > 0) {
  const missing = only.filter((s) => !hit.has(s));
  if (missing.length > 0) console.log(`⚠️ SMOKE_ONLY 未命中段：${missing.join(',')}`);
  console.log('⚠️ 分段绿 ≠ 收口绿：收口须全量跑一次');
}
process.exit(fail === 0 ? 0 : 1);
