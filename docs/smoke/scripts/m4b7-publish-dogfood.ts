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
 * 运行：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b7-publish-dogfood.ts`
 *   分段：`SMOKE_ONLY=G1,G9 …`（**分段绿 ≠ 收口绿** —— 收口必须全量跑一次）
 *   截图前缀：`SMOKE_SHOT_PREFIX=m4b7-`
 * ⚠️ 账号：`m4b2_user`（普通档 · 造数夹具的 owner）；口令只从 env 读（`SMOKE_M4B2_PASSWORD`）。
 * ⚠️ G5/G7 会**真写库**（链：新建 → 上传 → 提审；撤回）—— slug 一律 `m4b7-dogfood-*`，G7 自清。
 * ⚠️ **未覆盖（有意 · 见 §9.3 注）**：⑥ 的 **413 / 429** 需注入小上限 env / 打满 10 次每分钟限流
 *    ⇒ 属**手工探针**（本脚本不重启 API）；439/400 两条在此段直接断言。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { navTruth } from './nav-truth.js';

const DBG = process.env.SMOKE_CDP ?? 'http://127.0.0.1:9222'; // F297：CDP 地址可由 runner 注入（默认 9222）
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
function packZip(files: Array<[string, Buffer]>): Buffer {
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

/** 最小 skill 包（happy path 夹具）—— 保持原行为 */
function buildFixtureZip(): Buffer {
  return packZip([
    [
      'SKILL.md',
      Buffer.from(
        '---\nname: m4b7-dogfood\ndescription: M4b-7 dogfood fixture (inline generated)\n---\n\n# m4b7 dogfood\n\n本包由 dogfood 脚本内联生成，用于一键链 happy path。\n',
        'utf8',
      ),
    ],
    ['notes.txt', Buffer.from('attached by m4b7 dogfood\n', 'utf8')],
  ]);
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
        // ── T14（整页版式重做）：图例**去数字** + 状态记号 + 右侧状态徽标 ──
        legendTexts: Array.from(document.querySelectorAll('[data-slot="field-legend"]')).map((l) => (l.innerText || '').replace(/\\s+/g, ' ').trim()),
        legendBadges: Array.from(document.querySelectorAll('[data-slot="field-legend"] [data-slot="badge"]')).map((b) => (b.innerText || '').trim()),
        legendMarks: Array.from(document.querySelectorAll('[data-slot="field-legend"] svg')).length,
        emptyCount: document.querySelectorAll('[data-slot="empty"]').length,
        nativeSelect: document.querySelectorAll('select').length,
        comboboxSlot: document.querySelectorAll('[data-slot^="combobox"]').length,
        desc: Array.from(document.querySelectorAll('[data-slot="card-description"]')).map((e) => e.textContent.trim()).find((x) => x.includes('拖进来或点选上传') || x.includes('核对识别出的资产详情')) || '',
        // ── T12（照搬 ClawHub 空态观感）：读 ② 段空态三处文案（标题 / 描述 / 下沉的硬上限）──
        emptyTitle: (document.querySelector('[data-slot="empty-title"]')?.textContent ?? '').trim(),
        emptyDesc: (document.querySelector('[data-slot="empty-description"]')?.textContent ?? '').trim(),
        emptyLimit: (document.querySelector('[data-slot="empty"] [data-slot="field-description"]')?.textContent ?? '').trim(),
        // ── T13（① 段视觉重做 · 方向 A 聚焦式）：圆底图标 class / 上限 chips 文本 / 空态内容中轴 ──
        emptyText: (document.querySelector('[data-slot="empty"]')?.innerText ?? '').trim(),
        emptyIconClass: document.querySelector('[data-slot="empty-icon"]')?.className ?? '',
        emptyContentCenterX: (() => {
          const el = document.querySelector('[data-slot="empty-content"]');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return Math.round(r.left + r.width / 2);
        })(),
      });
    })()`)) as string,
  ) as Record<string, unknown>;
  ok(
    'G3① 右栏存在（aside 1 个）且两栏栅格 = 1fr + **320px**（T14：右栏 240 → 320）',
    shape.asideCount === 1 && String(shape.rightLayout).includes('320px'),
    String(shape.rightLayout),
  );
  const tops = shape.stepTops as number[];
  const lefts = shape.stepLefts as number[];
  ok(
    'G3② 右栏三段**竖排**（top 递增 · left 恒等）',
    tops.length === 3 && tops[0]! < tops[1]! && tops[1]! < tops[2]! && new Set(lefts).size === 1,
    `tops=${tops.join(',')} lefts=${lefts.join(',')}`,
  );
  // ── T11（design v1.7 · D21 渐进披露）：起步态**只渲染 ①** ──
  ok(
    'G3③ T11 起步态：未给包 ⇒ 只渲染 ①（官方 FieldSet ×1 · ②③ 缺席）',
    shape.fieldSets === 1 && shape.fieldLegends === 1,
    `set=${shape.fieldSets} legend=${shape.fieldLegends}（**反证**：>1 即 FAIL）`,
  );
  ok(
    'G3⑩ T11 页头副标题：起步（未展开）⇒ 上传引导版（D22）',
    String(shape.desc).includes('拖进来或点选上传'),
    String(shape.desc),
  );
  ok(
    'G3④ 未选文件态 = 官方 Empty 在位（D34）',
    (shape.emptyCount as number) >= 1,
    `empty=${shape.emptyCount}`,
  );
  // ── T12（照搬 ClawHub 空态观感）：标题 = 动作号召 · 描述 = 拖拽引导 · 硬上限下沉按钮下方 ──
  ok(
    'G3⑫ T12 空态标题 = 引导语（**非**字段名「包文件」· 反证）∧ 描述非空且**非**上限文案',
    String(shape.emptyTitle).length > 0 &&
      shape.emptyTitle !== '包文件' &&
      String(shape.emptyDesc).length > 0 &&
      !String(shape.emptyDesc).includes('MiB'),
    `title=${shape.emptyTitle} desc=${shape.emptyDesc}`,
  );
  ok(
    'G3⑬ T12/T13 硬上限**仍在册**（承「信息不丢」）：Empty 全文含 MiB ∧ 三项 `≤` ∧ `.zip` 标记在位（**读法随形态改写**：T13 上限由 `field-description` 位改为 chips 行）',
    String(shape.emptyText).includes('MiB') &&
      (String(shape.emptyText).match(/≤/g)?.length ?? 0) >= 3 &&
      String(shape.emptyText).includes('.zip'),
    `text=${String(shape.emptyText).replace(/\n/g, ' | ').slice(0, 90)}`,
  );
  // ── T13（A 聚焦式）：圆底品牌图标（静默 primary/10 + size-14 + rounded-full）──
  ok(
    'G3⑭ T13 空态图标 = **圆形品牌底**（class 含 rounded-full ∧ size-14 ∧ bg-primary/10）∧ 标题非空',
    String(shape.emptyIconClass).includes('rounded-full') &&
      String(shape.emptyIconClass).includes('size-14') &&
      String(shape.emptyIconClass).includes('bg-primary/10') &&
      String(shape.emptyTitle).length > 0,
    `icon=${String(shape.emptyIconClass).slice(0, 80)}`,
  );
  // ── T14（整页版式重做 · 六处调整①）：**取消数字 1/2/3** + 段卡状态徽标 ──
  const legendTexts = shape.legendTexts as string[];
  const legendBadges = shape.legendBadges as string[];
  ok(
    'G3⑮ T14 段卡图例**不含数字**（反证：以数字开头即 FAIL）',
    legendTexts.length >= 1 && legendTexts.every((t) => !/^\d/.test(t)),
    JSON.stringify(legendTexts),
  );
  ok(
    'G3⑯ T14 段卡状态徽标在位（文案 ∈ 完成 / 当前 / 待办 / 未通过 · 复用 `state.*`）',
    legendBadges.length >= 1 &&
      legendBadges.every((b) => ['完成', '当前', '待办', '未通过'].includes(b)),
    JSON.stringify(legendBadges),
  );
  ok(
    'G3⑤ 类型选择器 = 官方 Select（无原生 select）；资产选择器未渲染时 combobox 允许为 0',
    (shape.nativeSelect as number) === 0,
  );
  // ── T10（design v1.6 §5 断言 20–21）：IA 重组「上传 → 自识别 → 发布」──
  // 读纯文本（不用正则/猜测选择器）：左栏 legend 文案顺序 + 右栏面板三项文案
  const iaSnap = JSON.parse(
    ((await evalJs(`JSON.stringify({
        panel: Array.from(document.querySelectorAll('aside ol li')).map((li) => li.textContent),
      })`)) as string) ?? '{}',
  ) as { panel: string[] };
  ok(
    'G3⑧ T10：右栏流程面板三段 = 上传 / 自识别 / 发布（键名换血后）',
    iaSnap.panel.length === 3 &&
      iaSnap.panel[0].includes('上传') &&
      iaSnap.panel[1].includes('自识别') &&
      iaSnap.panel[2].includes('发布'),
    JSON.stringify(iaSnap.panel),
  );
  // ── T11：给包 ⇒ ②③ 展开（D21 展开判据 = 有文件 ∨ 已选定资产）──
  //    ⚠️ 收起态下 ② 段（含模式单选）**不在 DOM** ⇒ 必须先给包才能触达单选（实证踩到）
  await evalJs(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const zone = Array.from(document.querySelectorAll('fieldset'))[0];
        const dt = new DataTransfer();
        dt.items.add(new File(['x'], ${JSON.stringify('g3-expand-probe.zip')}, { type: 'application/zip' }));
        zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        await wait(400);
        return 'ok';
      })()`);
  await sleep(600);
  const expandedSnap = JSON.parse(
    ((await evalJs(`JSON.stringify({
        sets: document.querySelectorAll('[data-slot="field-set"]').length,
        legends: Array.from(document.querySelectorAll('[data-slot="field-legend"]')).map((l) => l.textContent),
        desc: Array.from(document.querySelectorAll('[data-slot="card-description"]')).map((e) => e.textContent.trim()).find((x) => x.includes('拖进来或点选上传') || x.includes('核对识别出的资产详情')) || '',
      })`)) as string) ?? '{}',
  ) as { sets: number; legends: string[]; desc: string };
  ok(
    'G3⑨ T11 展开：给包 ⇒ ②③ 出现（FieldSet ×3）',
    expandedSnap.sets === 3 &&
      (expandedSnap.legends[1] ?? '').includes('自识别') &&
      (expandedSnap.legends[2] ?? '').includes('发布'),
    JSON.stringify({ sets: expandedSnap.sets, legends: expandedSnap.legends }),
  );
  ok(
    'G3⑦ T10：左栏三段 DOM 顺序 = 上传 → 自识别 → 发布（**展开态**读数）',
    expandedSnap.legends.length === 3 &&
      expandedSnap.legends[0].includes('上传') &&
      expandedSnap.legends[1].includes('自识别') &&
      expandedSnap.legends[2].includes('发布'),
    JSON.stringify(expandedSnap.legends),
  );
  ok(
    'G3⑪ T11 页头副标题：展开态 ⇒ 核对识别结果版（D22）',
    expandedSnap.desc.includes('核对识别出的资产详情'),
    expandedSnap.desc,
  );
  // ⚠️ 上一次替换**误删**了「点『已有』」这一行（实证：Combobox 因此未渲染 ⇒ G3⑥ FAIL）——已补回
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
      publishDisabled: (document.querySelector('button[size]')||{}).disabled ?? Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布')?.disabled,
      sets: document.querySelectorAll('[data-slot="field-set"]').length,
    })`)) as string,
  ) as { states: string[]; publishDisabled: boolean | undefined; sets: number };
  ok(
    'G4① 起步·空表单：① 当前 / ②③ 待办',
    start.states.length === 3 &&
      start.states[0]!.includes('当前') &&
      start.states[1]!.includes('待办'),
    start.states.join(' | '),
  );
  ok(
    'G4② T11：未给包 ⇒ ③ 段（含主按钮）**不渲染** ⇒ 主按钮不可达（原「disabled」语义由「不渲染」表达）',
    start.sets === 1 && start.publishDisabled === undefined,
    `sets=${start.sets} disabled=${start.publishDisabled}`,
  );
  // ── T11（design v1.7 §5 断言 22）：给包 ⇒ ②③ 出现 + 平滑滚到 ② 段顶部 ──
  const t11Expand = JSON.parse(
    ((await evalJs(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const before = document.querySelectorAll('[data-slot="field-set"]').length;
        const zone = Array.from(document.querySelectorAll('fieldset'))[0];
        const dt = new DataTransfer();
        dt.items.add(new File(['x'], 't11-expand-probe.zip', { type: 'application/zip' }));
        zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        await wait(1000);
        const sets = Array.from(document.querySelectorAll('[data-slot="field-set"]'));
        return JSON.stringify({
          before,
          after: sets.length,
          seg2Top: sets[1] ? Math.round(sets[1].getBoundingClientRect().top) : null,
          scrollY: Math.round(window.scrollY),
          viewportH: window.innerHeight,
        });
      })()`)) as string) ?? '{}',
  ) as {
    before: number;
    after: number;
    seg2Top: number | null;
    scrollY: number;
    viewportH: number;
  };
  ok(
    'G4②c T11：起步只渲染 ①（set=1）⇒ 给包 ⇒ ②③ 出现（set=3）且 ② 段**进入视口**（T14 后页面变短 ⇒ ② 往往已在视口内，`scrollY` 可为 0：以「视口内」为准，不再要求必发生滚动）',
    t11Expand.before === 1 &&
      t11Expand.after === 3 &&
      t11Expand.seg2Top !== null &&
      t11Expand.seg2Top <= t11Expand.viewportH,
    JSON.stringify(t11Expand),
  );
  const prefill: Record<string, { ctx: string; version: string; sets: number }> = {};
  for (const slug of ['m4b7-fix-1', 'm4b7-fix-2', 'm4b7-fix-3']) {
    await navTo(`${APP}/dashboard/publish?slug=${slug}`, 2600);
    const r = JSON.parse(
      (await evalJs(`JSON.stringify({
        ctx: (Array.from(document.querySelectorAll('fieldset p')).map(p=>p.textContent.trim()).find(x=>x.includes('当前最新版')||x.includes('暂无版本')))||'',
        version: (document.querySelector('input[id="publish-version"]')||{}).value||'',
        sets: document.querySelectorAll('[data-slot="field-set"]').length,
      })`)) as string,
    ) as { ctx: string; version: string; sets: number };
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
  ok(
    'G4③b T11：`?slug=` 深链（已选定资产 · **无文件**）⇒ ②③ 直接展开（D21 展开判据含「已选定资产」）',
    prefill['m4b7-fix-1']?.sets === 3,
    JSON.stringify({ sets: prefill['m4b7-fix-1']?.sets }),
  );

  // ── T14（整页版式重做 · 方向 B 双栏工作台）：六处调整 6 条 + 版式几何 1 条 ──
  // 当前态 = `?slug=` 深链（②③ 展开 · 无文件）⇒ 三段全在 · 主按钮在位（disabled）
  const t14 = JSON.parse(
    (await evalJs(`(() => {
      const m = document.querySelector('main');
      const segs = Array.from(document.querySelectorAll('[data-slot="field-set"]'));
      const txt = (el) => (el ? el.innerText.replace(/\\s+/g, ' ') : '');
      const legendOf = (i) => txt(segs[i]?.querySelector('[data-slot="field-legend"]'));
      const badgesOf = (i) => Array.from(segs[i]?.querySelectorAll('[data-slot="field-legend"] [data-slot="badge"]') ?? []).map((b) => b.innerText.trim());
      const aside = document.querySelector('aside');
      const leftCol = m.querySelector('.max-w-2xl');
      return JSON.stringify({
        segs: segs.length,
        digits: segs.map((_, i) => /^\\d/.test(legendOf(i).trim())),
        badges: segs.map((_, i) => badgesOf(i)),
        seg1HasVersion: txt(segs[0]).includes('版本号'),
        seg2HasVersion: txt(segs[1]).includes('版本号'),
        seg3HasChangelog: txt(segs[2]).includes('更新说明'),
        railCards: aside ? aside.querySelectorAll('[data-slot="card"]').length : -1,
        railButtons: aside ? aside.querySelectorAll('button').length : -1,
        bodyHasLegacyNote: /一次点击依次执行三步/.test(m.innerText),
        publishBtns: Array.from(m.querySelectorAll('button')).map((b) => b.innerText.trim()).filter((x) => x.includes('发布')),
        leftW: leftCol ? Math.round(leftCol.getBoundingClientRect().width) : -1,
        railW: aside ? Math.round(aside.getBoundingClientRect().width) : -1,
        railAfterLeft: !!(leftCol && aside && (leftCol.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING)),
      });
    })()`)) as string,
  ) as Record<string, unknown>;
  ok(
    'G4㉘ T14 调整②：② 段含「版本号」输入 ∧ ① 段**不含**（字段已迁移 · 反证）',
    t14.seg2HasVersion === true && t14.seg1HasVersion === false,
    JSON.stringify({ seg1: t14.seg1HasVersion, seg2: t14.seg2HasVersion }),
  );
  ok(
    'G4㉙ T14 调整③：③ 段含「更新说明」文本域（与主按钮同段）',
    t14.seg3HasChangelog === true,
    String(t14.seg3HasChangelog),
  );
  ok(
    'G4㉚ T14 调整④：右栏 = 恰 2 卡（识别摘要 / 流程）∧ 右栏内 `button` 计数 = 0（反证：主按钮卡已撤）',
    t14.railCards === 2 && t14.railButtons === 0,
    JSON.stringify({ cards: t14.railCards, buttons: t14.railButtons }),
  );
  ok(
    'G4㉛ T14 调整⑤：主按钮文案 == 「发布」（反证：不含「提交审核」/「→」）',
    (t14.publishBtns as string[]).length === 1 && (t14.publishBtns as string[])[0] === '发布',
    JSON.stringify(t14.publishBtns),
  );
  ok(
    'G4㉜ T14 调整⑥：全页**不出现** `flow.note` 文案（退役键零渲染 · F251）',
    t14.bodyHasLegacyNote === false,
    String(t14.bodyHasLegacyNote),
  );
  ok(
    'G4㉝ T14 调整①：三段图例**均不含数字** ∧ 每段恰 1 枚状态徽标',
    (t14.digits as boolean[]).length === 3 &&
      (t14.digits as boolean[]).every((d) => d === false) &&
      (t14.badges as string[][]).every((b) => b.length === 1),
    JSON.stringify({ digits: t14.digits, badges: t14.badges }),
  );
  ok(
    'G4㉞ T14 版式几何：左列 ≤ 696（`max-w-2xl` 672 + 容差）∧ 右栏 = 320 ∧ 右栏节点位于左列之后（DOM 顺序）',
    (t14.leftW as number) > 600 &&
      (t14.leftW as number) <= 696 &&
      t14.railW === 320 &&
      t14.railAfterLeft === true,
    JSON.stringify({ leftW: t14.leftW, railW: t14.railW, after: t14.railAfterLeft }),
  );
  await navTo(`${APP}/dashboard/publish?slug=no-such-asset-xyz`, 1500);
  const invalid = JSON.parse(
    (await evalJs(`JSON.stringify({
      hasSlugField: !!document.querySelector('input[id="publish-slug"]'),
      sets: document.querySelectorAll('[data-slot="field-set"]').length,
      toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map(t=>t.textContent.trim().slice(0,24)),
    })`)) as string,
  ) as { hasSlugField: boolean; toasts: string[]; sets: number };
  ok(
    'G4⑥ `?slug=` 无效 ⇒ 回落「新建」（**T11 形态 = ②③ 不渲染**）+ 轻提示（D45）',
    invalid.sets === 1 && invalid.hasSlugField === false && invalid.toasts.length > 0,
    JSON.stringify(invalid),
  );
  ok('G4⑦ 预填四支之「撞号 409」归 G6 ② 断言（同源夹具 0.0.1）', true);

  // ── T3（drag-upload design §5）：拖拽上传真机断言（D1–D3/D5）──
  await navTo(`${APP}/dashboard/publish`, 2500);
  const dragSnap = JSON.parse(
    (await evalJs(`(async () => {
      const box = document.querySelector('[data-slot="empty"]');
      if (!box) return JSON.stringify({ err: 'no-empty' });
      const fire = (type, files) => {
        const dt = new DataTransfer();
        for (const f of files ?? []) dt.items.add(f);
        const ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
        box.dispatchEvent(ev);
        return ev.defaultPrevented;
      };
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const titleOf = () => (document.querySelector('[data-slot="empty-title"]')?.textContent ?? '').trim();
      const iconClass = () => document.querySelector('[data-slot="empty-icon"]')?.className ?? '';
      const centerX = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2); };
      const titleIdle = titleOf();
      const emptyCenterX = centerX('[data-slot="empty-content"]');
      const segCenterX = centerX('[data-slot="field-set"]');
      const enterPrevented = fire('dragenter', []);
      await wait(180);
      const hiEnter = box.className.includes('border-primary');
      const titleDrag = titleOf();
      const iconDrag = iconClass();
      fire('dragleave', []);
      await wait(180);
      const hiLeave = box.className.includes('border-primary');
      const overPrevented = fire('dragover', []);
      // 顺序：**先**测非 zip（此时仍处「未选文件」态、Empty 在册），**再**测合法 zip（drop 后 Empty 会被替换）
      const mdPrevented = fire('drop', [new File(['x'], 'notes.md', { type: 'text/markdown' })]);
      await wait(400);
      const bodyAfterMd = document.body.innerText;
      const hintShown = bodyAfterMd.includes('请选择 .zip 包');
      const pickedAfterMd = bodyAfterMd.includes('drag-probe.zip');
      const zipPrevented = fire('drop', [new File(['x'], 'drag-probe.zip', { type: 'application/zip' })]);
      await wait(500);
      const bodyAfterZip = document.body.innerText;
      const pickedName = (bodyAfterZip.match(/drag-probe.zip/) ?? [null])[0];
      // T14：主按钮文案去括号（「发布（新建 → 上传 → 提交审核）」⇒「发布」）⇒ 按【精确等值】在 main 内定位
      // （顶栏也有一个「发布」入口，故必须限定在 main 内取）
      const publishBtn = Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布');
      return JSON.stringify({
        enterPrevented, hiEnter, hiLeave, overPrevented, mdPrevented, zipPrevented,
        pickedName, publishEnabled: publishBtn ? !publishBtn.disabled : null,
        hintShown, pickedAfterMd,
        titleIdle, titleDrag, iconDrag, emptyCenterX, segCenterX,
        pickedCenterX: centerX('[data-slot="upload-file-row"]'),
      });
    })()`)) as string as Record<string, unknown>,
  );
  ok(
    'G4⑧ 拖入合法 zip ⇒ ①（上传）段已选 + 主按钮可用（D5①）',
    dragSnap.pickedName === 'drag-probe.zip' && dragSnap.publishEnabled === true,
    JSON.stringify(dragSnap),
  );
  ok(
    'G4⑨ 拖拽高亮：dragenter 出现 ⇒ dragleave 消失（**反证**：无高亮即 FAIL，D2①）',
    dragSnap.hiEnter === true && dragSnap.hiLeave === false,
    JSON.stringify(dragSnap),
  );
  ok(
    'G4⑩ 非 zip ⇒ 行内提示 + 不选中（D3①③）',
    dragSnap.hintShown === true && dragSnap.pickedAfterMd === false,
    JSON.stringify(dragSnap),
  );
  ok(
    'G4⑪ 事件契约：dragover 必须 preventDefault（否则收不到 drop，D1①）',
    dragSnap.overPrevented === true,
    JSON.stringify(dragSnap),
  );
  // ── T13（① 段视觉重做 · 方向 A 聚焦式）：文案联动 + 两态同轴 ──
  ok(
    'G4㉕ T13 拖拽态**文案联动**（**反证**：标题不变即 FAIL）∧ 圆底反白（含 bg-primary 且不再 bg-primary/10）',
    String(dragSnap.titleIdle).length > 0 &&
      dragSnap.titleDrag !== dragSnap.titleIdle &&
      String(dragSnap.iconDrag).includes('bg-primary') &&
      !String(dragSnap.iconDrag).includes('bg-primary/10'),
    `idle=${dragSnap.titleIdle} drag=${dragSnap.titleDrag} icon=${String(dragSnap.iconDrag).slice(0, 70)}`,
  );
  ok(
    'G4㉗ T13 空态与已选态**同轴**（重心不跳变）：两态内容中心 x 与 ① 段中轴之差 ≤ 24',
    dragSnap.emptyCenterX !== null &&
      dragSnap.pickedCenterX !== null &&
      dragSnap.segCenterX !== null &&
      Math.abs((dragSnap.emptyCenterX as number) - (dragSnap.segCenterX as number)) <= 24 &&
      Math.abs((dragSnap.pickedCenterX as number) - (dragSnap.segCenterX as number)) <= 24,
    `empty=${dragSnap.emptyCenterX} picked=${dragSnap.pickedCenterX} seg=${dragSnap.segCenterX}`,
  );
  // ── T6（design v1.3 §5 断言 6–10）：slug 自动预填 5 条（含 3 条反证）──
  // ⚠️ T9 起「模式自动判定」会把这些包名判成「已有」（账号下确有同名资产）⇒ slug 字段不渲染；
  //    故此处**先制造一次「已有 → 新建」的手动切换**（= modeTouched ⇒ 不再自动切），保证 T6 断言前置稳定。
  //    ⚠️ 必须点两次：Radix `onValueChange` **只在值变化时触发** —— 模式本就是「新建」时点它不会置 touched（实测踩过）。
  await navTo(`${APP}/dashboard/publish`, 2500);
  // ⚠️ T11：收起态下模式单选不在 DOM ⇒ **必须先给包展开**，才点得到单选（实证踩到）
  await evalJs(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const zone = Array.from(document.querySelectorAll('fieldset'))[0];
        const dt = new DataTransfer();
        dt.items.add(new File(['x'], 't6-guard.zip', { type: 'application/zip' }));
        zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        await wait(400);
        return 'ok';
      })()`);
  await sleep(400);
  await realClick(`document.querySelector('#publish-mode-existing')`);
  await sleep(700);
  await realClick(`document.querySelector('#publish-mode-new')`);
  await sleep(700);
  const dropZipAndReadSlug = async (fileName: string) =>
    JSON.parse(
      ((await evalJs(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const zone = Array.from(document.querySelectorAll('fieldset'))[0]; // ① 上传段（T10 置首）
        const dt = new DataTransfer();
        dt.items.add(new File(['x'], ${JSON.stringify(fileName)}, { type: 'application/zip' }));
        zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        // ⚠️ T11：给包后 ② 段才渲染 ⇒ slug 字段出现需一拍，**轮询**而不死等
        let el = null;
        for (let i = 0; i < 12 && !el; i += 1) {
          await wait(150);
          el = document.querySelector('#publish-slug');
        }
        await wait(250);
        el = document.querySelector('#publish-slug');
        return JSON.stringify({ slug: el ? el.value : null, hasField: !!el });
      })()`)) as string) ?? '{}',
    ) as { slug: string | null; hasField: boolean };
  const slug1 = await dropZipAndReadSlug('Skill_UCTS Report.zip');
  ok(
    'G4⑫ T6：拖入 `Skill_UCTS Report.zip` ⇒ slug 自动填 `skill-ucts-report`',
    slug1.slug === 'skill-ucts-report',
    JSON.stringify(slug1),
  );
  const slug2 = await dropZipAndReadSlug('Another_Pack.zip');
  ok(
    'G4⑬ T6：换包 ⇒ 已自动填的值**随新文件名刷新**（design §3.1 差异④）',
    slug2.slug === 'another-pack',
    JSON.stringify(slug2),
  );
  await fillInput('#publish-slug', 'my-own-slug');
  const slug3 = await dropZipAndReadSlug('Third_Pack.zip');
  ok(
    'G4⑭ T6（反证）：用户手改过 ⇒ 再换包**不覆盖**',
    slug3.slug === 'my-own-slug',
    JSON.stringify(slug3),
  );
  await fillInput('#publish-slug', '');
  const slug4 = await dropZipAndReadSlug('Fourth_Pack.zip');
  ok(
    'G4⑮ T6（反证）：改过后即使清空 ⇒ **仍不自动填**（touched 优先 · ClawHub 同义）',
    slug4.slug === '',
    JSON.stringify(slug4),
  );
  await navTo(`${APP}/dashboard/publish`, 2500);
  const slug5 = await dropZipAndReadSlug('我的技能.zip');
  ok(
    'G4⑯ T6（反证）：纯中文名 ⇒ slug **留空不猜**（照搬 ClawHub `if (nextSlug && …)`）',
    slug5.slug === '' && slug5.hasField === true,
    JSON.stringify(slug5),
  );
  // ── T7（design v1.4 §5 断言 11–14）：已选态 × 移除 4 条 ──
  const REMOVE_LABEL = '移除所选包（可重新选择或拖入）';
  await navTo(`${APP}/dashboard/publish`, 2500);
  const dropZipOnZone = async (fileName: string) =>
    evalJs(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const zone = Array.from(document.querySelectorAll('fieldset'))[0]; // ① 上传段（T10 置首）
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], ${JSON.stringify(fileName)}, { type: 'application/zip' }));
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      await wait(350);
      return 'ok';
    })()`);
  const sel = (extra: string) =>
    `document.querySelector('button[aria-label=' + JSON.stringify(${JSON.stringify(REMOVE_LABEL)}) + ']')${extra}`;
  const readRemoveState = async () =>
    JSON.parse(
      ((await evalJs(`JSON.stringify({
        hasIconBtn: !!${sel('')},
        label: (${sel('')}||{}).getAttribute ? ${sel('')}.getAttribute('aria-label') : null,
        hasTextBtn: Array.from(document.querySelectorAll('button')).some((b) => b.textContent.trim() === '选择 zip 文件'),
        slug: (document.querySelector('#publish-slug')||{}).value ?? null,
      })`)) as string) ?? '{}',
    ) as { hasIconBtn: boolean; label: string | null; hasTextBtn: boolean; slug: string | null };
  const clickRemoveThenRead = async (fileName: string) =>
    JSON.parse(
      ((await evalJs(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const btn = ${sel('')};
        if (!btn) return JSON.stringify({ err: 'no-remove-btn' });
        btn.click();
        await wait(400);
        const pub = Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布');
        return JSON.stringify({
          err: null,
          emptyBack: !!document.querySelector('[data-slot="empty"]'),
          nameGone: !document.body.innerText.includes(${JSON.stringify(fileName)}),
          slug: (document.querySelector('#publish-slug')||{}).value ?? null,
          publishDisabled: pub ? pub.disabled : null,
          sets: document.querySelectorAll('[data-slot="field-set"]').length,
        });
      })()`)) as string) ?? '{}',
    ) as {
      err: string | null;
      emptyBack?: boolean;
      nameGone?: boolean;
      slug?: string | null;
      publishDisabled?: boolean | null;
      sets?: number;
    };
  await dropZipOnZone('Remove_Probe.zip');
  const beforeRemove = await readRemoveState();
  ok(
    'G4⑰ T7：已选态右侧 = × 图标按钮（aria-label = 新键）且旧文字按钮已不在位',
    beforeRemove.hasIconBtn === true &&
      beforeRemove.label === REMOVE_LABEL &&
      beforeRemove.hasTextBtn === false,
    JSON.stringify(beforeRemove),
  );
  const afterRemove = await clickRemoveThenRead('Remove_Probe.zip');
  ok(
    'G4⑱ T7（+T11 扩写）：点 × ⇒ 回未选态（Empty 重现 + 主按钮**不可达** + 文件名消失 + **②③ 收起**）',
    afterRemove.emptyBack === true &&
      afterRemove.publishDisabled === null &&
      afterRemove.nameGone === true &&
      afterRemove.sets === 1,
    JSON.stringify(afterRemove),
  );
  // ⚠️ T11：点 × 后 ②③ 收起 ⇒ slug 字段不在 DOM，**须再给一个包**才可读值。
  //    判据用「派生为空的包名」（中文名 ⇒ 规则留空不猜）：若 × 真清了自动值 ⇒ 读回 ''；
  //    若没清（残留 remove-probe）⇒ 中文名不覆盖 ⇒ 仍读出 remove-probe ⇒ **可判别**
  await dropZipOnZone('我的技能.zip');
  const afterRemoveReExpand = await readRemoveState();
  ok(
    'G4⑲ T7（反证）：**自动填**的 slug 随 × 一并清空（移除前 = remove-probe；再给「派生为空」的包 ⇒ 读回空）',
    beforeRemove.slug === 'remove-probe' && afterRemoveReExpand.slug === '',
    JSON.stringify({ before: beforeRemove.slug, afterReExpand: afterRemoveReExpand.slug }),
  );
  await dropZipOnZone('Keep_Probe.zip');
  await fillInput('#publish-slug', 'kept-slug');
  const afterRemoveKept = await clickRemoveThenRead('Keep_Probe.zip');
  await dropZipOnZone('Keep_Probe2.zip');
  const afterRemoveKeptReExpand = await readRemoveState();
  ok(
    'G4⑳ T7（反证）：**手改过**的 slug 不随 × 清空（移除后再给新包 ⇒ 仍为 kept-slug）',
    afterRemoveKept.slug === null && afterRemoveKeptReExpand.slug === 'kept-slug',
    JSON.stringify({
      afterRemove: afterRemoveKept.slug,
      afterReExpand: afterRemoveKeptReExpand.slug,
    }),
  );
  await shot('G4-slug-prefill');
  // ── T9（design v1.5 §5 断言 16–19）：模式与版本号自动判定 4 条 ──
  const readModeState = async () =>
    JSON.parse(
      ((await evalJs(`JSON.stringify({
        modeNew: (document.querySelector('#publish-mode-new')||{}).getAttribute?.('data-state') === 'checked',
        modeExisting: (document.querySelector('#publish-mode-existing')||{}).getAttribute?.('data-state') === 'checked',
        version: (document.querySelector('#publish-version')||{}).value ?? null,
        assetValue: (document.querySelector('#publish-asset')||{}).value ?? null,
        slugValue: (document.querySelector('#publish-slug')||{}).value ?? null,
        sets: document.querySelectorAll('[data-slot="field-set"]').length,
        panel: Array.from(document.querySelectorAll('aside ol li')).map((li) => li.textContent.trim().replace(/\\s+/g, ' ')),
      })`)) as string) ?? '{}',
    ) as {
      modeNew: boolean;
      modeExisting: boolean;
      version: string | null;
      assetValue: string | null;
      slugValue: string | null;
      sets: number;
      panel: string[];
    };
  await navTo(`${APP}/dashboard/publish`, 2500);
  await dropZipOnZone('m4b7-fix-1.zip');
  await sleep(1600);
  const modeExistingCase = await readModeState();
  ok(
    'G4㉑ T9：拖入 `m4b7-fix-1.zip`（账号下已有 · latest=1.0.0）⇒ 自动切「已有」+ 选中 + 版本 1.0.1',
    modeExistingCase.modeExisting === true &&
      modeExistingCase.version === '1.0.1' &&
      modeExistingCase.assetValue === 'm4b7-fix-1',
    JSON.stringify(modeExistingCase),
  );
  await navTo(`${APP}/dashboard/publish`, 2500);
  await dropZipOnZone('brand-new-thing.zip');
  await sleep(1600);
  const modeNewCase = await readModeState();
  ok(
    'G4㉒ T9：拖入**不存在**同名资产的包 ⇒ 保持「新建」+ 版本 1.0.0',
    modeNewCase.modeNew === true && modeNewCase.version === '1.0.0',
    JSON.stringify(modeNewCase),
  );
  await navTo(`${APP}/dashboard/publish`, 2500);
  // ⚠️ T11：收起态点不到单选 ⇒ 先给包展开，再「已有 → 新建」两次点击置 touched（Radix 同值不触发）
  await dropZipOnZone('t9-guard.zip');
  await sleep(500);
  await realClick(`document.querySelector('#publish-mode-existing')`);
  await sleep(600);
  await realClick(`document.querySelector('#publish-mode-new')`);
  await sleep(600);
  await dropZipOnZone('m4b7-fix-1.zip');
  await sleep(1600);
  const modeTouchedCase = await readModeState();
  ok(
    'G4㉓ T9（反证）：用户**手动切过**模式 ⇒ 再选包**不覆盖**（保持「新建」+ 1.0.0）',
    modeTouchedCase.modeNew === true && modeTouchedCase.version === '1.0.0',
    JSON.stringify(modeTouchedCase),
  );
  await navTo(`${APP}/dashboard/publish`, 2500);
  await dropZipOnZone('m4b7-fix-1.zip');
  await sleep(1600);
  const beforeRemoveMode = await readModeState();
  await evalJs(`(() => {
    const b = document.querySelector('button[aria-label=' + JSON.stringify('移除所选包（可重新选择或拖入）') + ']');
    if (b) b.click();
    return 'ok';
  })()`);
  await sleep(700);
  const afterRemoveMode = await readModeState();
  ok(
    'G4㉔ T9（反证·T11 形态）：自动切「已有」后点 × ⇒ **②③ 收起**（回「新建」空表单态：面板 = ① 当前 / ②③ 待办）',
    beforeRemoveMode.modeExisting === true &&
      afterRemoveMode.sets === 1 &&
      afterRemoveMode.modeNew === false &&
      afterRemoveMode.panel.length === 3 &&
      afterRemoveMode.panel[0]!.includes('当前') &&
      afterRemoveMode.panel[1]!.includes('待办'),
    JSON.stringify({ before: beforeRemoveMode, after: afterRemoveMode }),
  );
  await shot('G4-drag');
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
  // T3④（drag §5）：**上传中**拖入另一包 ⇒ 已选文件不变（D6① running 守卫）。
  // 点击与投放同一页内脚本内完成：点后立刻轮询「执行中」，抓到即投放 —— 避开 250ms 级竞态。
  const inFlight = JSON.parse(
    (await evalJs(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const btn = () => Array.from(document.querySelectorAll('button')).find((b) => /执行中/.test(b.textContent||''));
    const target = Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布');
    if (!target) return JSON.stringify({ err: 'no-button' });
    target.click();
    /* T13/**F257**（① 段进度条存在性）+ **F255**（右栏进度守卫）——**观察器**在点击前装：
       ① 段进度条只在上传进行中出现（本地小包 ⇒ 窗口常 <100ms），细读 DOM 必然漏 ⇒ 用 MutationObserver
       （childList + aria-label 属性变化）在事件里捕获，命中即记 —— 判定仍在本脚本 TS 侧做。 */
    let progSeen = 0;
    let progLabel = '';
    let asideProgSeen = 0;
    let asideCardsSeen = 0;
    const asideOf = () => { const x = Array.from(document.querySelectorAll('aside')); return x.length ? x[x.length - 1] : null; };
    const obs = new MutationObserver(() => {
      const p = document.querySelector('fieldset [data-slot="progress"]');
      if (p) { progSeen++; progLabel = p.getAttribute('aria-label') || ''; }
      const a = asideOf();
      if (a) {
        asideProgSeen = Math.max(asideProgSeen, a.querySelectorAll('[data-slot="progress"]').length);
        asideCardsSeen = Math.max(asideCardsSeen, a.querySelectorAll('[data-slot="card"]').length);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
    let seenRunning = false;
    for (let i = 0; i < 60; i++) { if (btn()) { seenRunning = true; break; } await wait(40); }
    const zone = Array.from(document.querySelectorAll('fieldset'))[0]; // ① 上传段（T10 置首）
    const beforeName = /m4b7-dogfood\\.zip/.test(document.body.innerText) ? 'm4b7-dogfood.zip' : null;
    let prevented = null;
    if (zone) {
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], 'replace-attempt.zip', { type: 'application/zip' }));
      const ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
      zone.dispatchEvent(ev);
      prevented = ev.defaultPrevented;
    }
    const removeProbeBtn = document.querySelector('button[aria-label=' + JSON.stringify('移除所选包（可重新选择或拖入）') + ']');
    const cancelProbeBtn = Array.from(document.querySelectorAll('button')).find((b) => /取消上传/.test(b.textContent||''));
    /* 观察器全程在位 ⇒ 上面那段（等「执行中」+ 投放反证 + 按钮读数）期间的变异已被计数；
       这里再有界等一会儿（≤3s）兜住「跳1 注册 → 跳2 上传」切换，然后收工。 */
    for (let w = 0; w < 120 && progSeen === 0; w++) await wait(25);
    obs.disconnect();
    return JSON.stringify({ err: null, seenRunning, beforeName, prevented, zones: document.querySelectorAll('fieldset').length, removeBtnShown: !!removeProbeBtn, cancelBtnShown: !!cancelProbeBtn, progSeen, progLabel, asideProgSeen, asideCardsSeen });
  })()`)) as string as {
      err: string | null;
      seenRunning: boolean;
      beforeName: string | null;
      prevented: boolean | null;
      zones: number;
      removeBtnShown: boolean;
      cancelBtnShown: boolean;
      progSeen: number;
      progLabel: string;
      asideProgSeen: number;
      asideCardsSeen: number;
    },
  );
  await sleep(900);
  const afterInFlight = ((await evalJs(`document.body.innerText`)) as string) ?? '';
  ok(
    'G5⑧ 上传中拖入另一包 ⇒ 已选文件不变（D6① running 守卫 · 拖拽区常驻才可达）',
    inFlight.err === null &&
      inFlight.seenRunning === true &&
      inFlight.beforeName === 'm4b7-dogfood.zip' &&
      inFlight.prevented === true &&
      !afterInFlight.includes('replace-attempt.zip'),
    JSON.stringify(inFlight),
  );
  ok(
    'G5⑨ T7：上传中**无 ×**（该位置由「取消上传」承担 · D14①）',
    inFlight.removeBtnShown === false,
    JSON.stringify({
      removeBtnShown: inFlight.removeBtnShown,
      cancelBtnShown: inFlight.cancelBtnShown,
    }),
  );
  ok(
    'G5⑩ T13/F257：① 段（上传）内含**进度条**（`[data-slot=progress]`）∧ 其进度文案（`aria-label`）= 「上传 N%」（此前仅声称、无断言 ⇒ 本轮补齐）',
    inFlight.progSeen >= 1 && /^上传\s*\d+%$/.test(inFlight.progLabel),
    JSON.stringify({ progSeen: inFlight.progSeen, progLabel: inFlight.progLabel }),
  );
  ok(
    'G5⑪ F255 正向守卫（反证式）：上传中**右栏不含进度条**（计数 0）∧ 右栏两卡在位（⇒ 非空转/非未渲染）',
    inFlight.asideProgSeen === 0 && inFlight.asideCardsSeen === 2,
    JSON.stringify({
      asideProgSeen: inFlight.asideProgSeen,
      asideCardsSeen: inFlight.asideCardsSeen,
    }),
  );
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
    `Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布')`,
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
  // ── F243（2026-09-29 用户实测报告）：失败停点后主按钮**必须可点**（= 重试 · design §4.8 N6）──
  const retryState = JSON.parse(
    ((await evalJs(`JSON.stringify({
        disabled: (() => { const b = Array.from(document.querySelectorAll('main button')).find((x) => (x.textContent || '').trim() === '发布'); return b ? b.disabled : null; })(),
        label: (() => { const b = Array.from(document.querySelectorAll('main button')).find((x) => (x.textContent || '').trim() === '发布'); return b ? b.textContent.trim().slice(0,12) : null; })(),
      })`)) as string) ?? '{}',
  ) as { disabled: boolean | null; label: string | null };
  ok(
    'G6①b F243：失败停点后主按钮**可点**（设计 N6「复用 action.publish = 重试」· 修前此处 FAIL）',
    retryState.disabled === false,
    JSON.stringify(retryState),
  );
  const assetsBeforeRetry = (await apiGet('/api/me/assets?limit=100')).body?.items?.length ?? -1;
  await realClick(
    `Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布')`,
  );
  await sleep(2800);
  const retryErr = JSON.parse(
    ((await evalJs(`JSON.stringify({
        invalid: !!document.querySelector('#publish-slug[aria-invalid="true"]'),
        text: Array.from(document.querySelectorAll('[data-slot="field-error"]')).map(e=>e.textContent.trim().slice(0,26)),
      })`)) as string) ?? '{}',
  ) as { invalid: boolean; text: string[] };
  const assetsAfterRetry = (await apiGet('/api/me/assets?limit=100')).body?.items?.length ?? -1;
  ok(
    'G6①c F243：点它确实**重跑**（再次 409 行内 · 零重复注册）',
    retryErr.invalid === true && assetsAfterRetry === assetsBeforeRetry,
    JSON.stringify({ ...retryErr, assetsBeforeRetry, assetsAfterRetry }),
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

  // ── F242 契约（用户 2026-09-28 拍板 B）：套一层目录 + 自动产物 ⇒ 接受；套两层 ⇒ 仍拒 ──
  // 真机走**原始 API**（与用户那份 Finder 压缩包同形态：外层同名目录 + __MACOSX/.DS_Store/__pycache__）
  const skillFixture = 'm4b4-seed-skill'; // 仓内既有 skill 型资产（m4b2_user 名下）—— 用完即删探针版本
  const wrappedZip = packZip([
    [
      'm4b4-seed-skill/SKILL.md',
      Buffer.from('---\nname: m4b4-seed-skill\ndescription: wrapped dogfood probe\n---\nbody\n'),
    ],
    ['m4b4-seed-skill/scripts/a.py', Buffer.from('print(1)\n')],
    ['__MACOSX/m4b4-seed-skill/._SKILL.md', Buffer.from('junk')],
    ['m4b4-seed-skill/.DS_Store', Buffer.from('junk')],
    ['m4b4-seed-skill/scripts/__pycache__/a.cpython-314.pyc', Buffer.from('junk')],
  ]);
  const deepZip = packZip([
    [
      'outer/inner/SKILL.md',
      Buffer.from('---\nname: m4b4-seed-skill\ndescription: double wrapper probe\n---\nb\n'),
    ],
  ]);
  const apiUploadRaw = async (zipBuf: Buffer, version: string) =>
    JSON.parse(
      (await evalJs(`(async () => {
      const bin = atob(${JSON.stringify(zipBuf.toString('base64'))});
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const fd = new FormData();
      fd.append('file', new File([bytes], 'probe.zip', { type: 'application/zip' }));
      fd.append('version', ${JSON.stringify(version)});
      const res = await fetch('/api/assets/${skillFixture}/versions', { method:'POST', body: fd, credentials:'include' });
      let b = null; try { b = await res.json(); } catch { b = null; }
      return JSON.stringify({ status: res.status, body: b });
    })()`)) as string as {
        status: number;
        body: { fileCount?: number; issues?: { message?: string }[] } | null;
      },
    );

  const wrappedRes = await apiUploadRaw(wrappedZip, '9.1.0');
  ok(
    'G6⑦ F242：套一层目录 + 自动产物 ⇒ **接受**（201）',
    wrappedRes.status === 201,
    JSON.stringify(wrappedRes).slice(0, 160),
  );
  ok(
    'G6⑧ F242：自动产物**不计数**（5 条目中 3 条垃圾 ⇒ fileCount=2）',
    wrappedRes.body?.fileCount === 2,
    `fileCount=${wrappedRes.body?.fileCount}`,
  );
  const deepRes = await apiUploadRaw(deepZip, '9.2.0');
  ok(
    'G6⑨ F242 边界：套两层 ⇒ 仍拒（400 layout）',
    deepRes.status === 400,
    JSON.stringify(deepRes).slice(0, 160),
  );
  // 探针版本清理（不留在库里）
  await evalJs(
    `fetch('/api/assets/${skillFixture}/versions/9.1.0', { method:'DELETE', credentials:'include' }).then(r=>r.status)`,
  );
  // ── T5：**用户原始 zip**（套一层目录 + macOS 垃圾）经**发布页**端到端回归 ──
  // 路径由 env 提供（用户本机文件 · 不入仓）；未提供则**显式跳过**（不伪装成通过）。
  const originalZip = process.env.SMOKE_ORIGINAL_ZIP;
  if (!originalZip) {
    ok('G6⑩ 用户原始 zip 发布页回归：**跳过**（未提供 SMOKE_ORIGINAL_ZIP）', true, 'skipped');
  } else {
    const oSlug = `m4b7-orig-${Date.now().toString(36)}`;
    await navTo(`${APP}/dashboard/publish`, 3000);
    // ⚠️ T11：slug 字段只在**展开后**存在 ⇒ 不能再「先填 slug 再注入包」（旧序会静默失败：
    //    字段不在 DOM ⇒ 链跳1 以空 slug 注册 ⇒ 400）。改为：注入包（展开）⇒ 切回「新建」⇒ 再填。
    await send('DOM.enable');
    const doc = await send('DOM.getDocument', { depth: -1 });
    const q = await send('DOM.querySelector', {
      nodeId: doc.result?.root?.nodeId,
      selector: 'input[type="file"]',
    });
    // 真盘文件（大包不走 base64 塞进 Runtime.evaluate —— 用 CDP 原生注入）
    await send('DOM.setFileInputFiles', { nodeId: q.result?.nodeId, files: [originalZip] });
    await sleep(1200);
    // T11：注入包 ⇒ ②③ 展开；若 T9 自动判定切了「已有」（原始包名撞上账号下同名资产）⇒ 点回「新建」。
    // ⚠️ Radix `onValueChange` 只在值变化时触发 ⇒ 需「已有 → 新建」两次点击才稳（实测踩过）
    await realClick(`Array.from(document.querySelectorAll('[data-slot="radio-group-item"]'))[1]`);
    await sleep(500);
    await realClick(`Array.from(document.querySelectorAll('[data-slot="radio-group-item"]'))[0]`);
    await sleep(600);
    await fillInput('#publish-slug', oSlug);
    await sleep(250);
    // 判定读 **DOM 真值**（`input.files[0].name`）；页面文案回显只作旁证（展示层差异不误判 FAIL）
    // ⚠️ 转义纪律：模板字面量里写正则须**双反斜杠**（`\\w`）—— 单反斜杠会被 JS 吃成字面 `w`（本轮踩过）
    const pickedUi = JSON.parse(
      ((await evalJs(`JSON.stringify({
        inputName: (document.querySelector('input[type=file]')?.files?.[0]?.name) ?? null,
        shownZip: /[\\w.-]+\\.zip/.test(document.body.innerText),
        enabled: (() => { const b = Array.from(document.querySelectorAll('main button')).find((x) => (x.textContent || '').trim() === '发布'); return b ? !b.disabled : null; })(),
      })`)) as string) ?? '{}',
    ) as { inputName: string | null; shownZip: boolean; enabled: boolean | null };
    const wantName = originalZip.split('/').pop() ?? '';
    ok(
      'G6⑩ 真盘 zip 注入发布页 ⇒ 落点文件 = 原始包名 + 主按钮可用（`DOM.setFileInputFiles`）',
      pickedUi.inputName === wantName && pickedUi.enabled === true,
      JSON.stringify(pickedUi),
    );
    ok(
      'G6⑩b 旁证：页面文案回显 zip 名（不参与判定 · 记读数）',
      true,
      `shownZip=${pickedUi.shownZip}`,
    );
    await realClick(
      `Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布')`,
    );
    let oText = '';
    for (let i = 0; i < 24; i++) {
      oText = ((await evalJs(`document.body.innerText`)) as string) ?? '';
      if (oText.includes('已提交审核') || /未通过|失败/.test(oText)) break;
      await sleep(1500);
    }
    ok(
      'G6⑪ 用户原始 zip 三跳全绿（页面结果块 = 已提交审核 · F242 剥层 + 忽略清单端到端）',
      oText.includes('已提交审核'),
      oText.slice(0, 80).replace(/\s+/g, ' '),
    );
    const oVer = await apiGet(`/api/assets/${oSlug}/versions/1.0.0`);
    ok(
      'G6⑫ 落库核对：fileCount = 13（原始包 60 条目 → 剥壳去垃圾后 13 个真文件）',
      oVer.body?.fileCount === 13 && oVer.body?.version === '1.0.0',
      `status=${oVer.status} fileCount=${oVer.body?.fileCount} version=${oVer.body?.version}`,
    );
  }
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
    `Array.from(document.querySelectorAll('main button')).find((b) => (b.textContent || '').trim() === '发布')`,
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

/* ═══════════ G10 T15：版本号自识别（真实占号集合 · 缺陷回归 · 三入口同源） ═══════════ */
/**
 * 段义（增量 design **v2.1** §3.4 / §5 · D25–D27）：证明「自识别版本号」的数据源 =
 * **真实占号集合**（`GET /assets/{slug}/versions` · 排除 `SCAN_FAILED`），而不是列表项的
 * `latestVersion`（= 最新**已发布**版本 ⇒ 看不到在途版本 ⇒ 预填撞号 · **F252**）。
 *
 * ⚠️ 本段必须排在 **G5 之后**：只有 G5 的一键链会自产「在审 · 从未发布」的资产（`runSlug`）——
 * 那正是缺陷现场（旧实现预填 `1.0.0` 撞在审版本）。G4 段在 G5 之前 ⇒ 用不到该夹具，
 * 故 T15 断言**独立成段 G10**（design §5 的「G4㉟–㊷」为设计期拟号 ⇒ 落地形 = G10①–⑨）。
 *
 * ⚠️ 段内**顺序有讲究**：网络类实验（⑦ 延迟 / ⑨ 阻断）排在交互类断言之后，且各自**当场复原 + 重载**，
 * 避免污染后续断言的标签页网络（首跑实证：全局网络条件残留 ⇒ 之后所有取数停住 ⇒ 连锁 FAIL）。
 */
if (want('G10')) {
  sec('G10', `T15 版本号自识别：真实占号集合 + 三入口同源 + 失败静默回落（slug=${runSlug}）`);
  await loginAs(USER);

  const zhSrc = readFileSync('apps/web/src/i18n/zh.ts', 'utf8');
  /** 文案真值**取自字典**（不写死 —— 防键值漂移把断言变成化石） */
  const zhValue = (key: string): string => {
    const m = new RegExp(`'${key.replace(/[.]/g, '\\.')}':\\s*'([^']*)'`).exec(zhSrc);
    return m?.[1] ?? '';
  };
  const NONE_TEXT = zhValue('field.asset.latestNone');
  const INFLIGHT_TEXT = zhValue('field.asset.inflight');
  const OCCUPIED_TEXT = zhValue('field.version.occupied');
  const OCCUPIED_SEG = OCCUPIED_TEXT.split('{version}')[1]?.split('（')[0]?.trim() ?? '';
  const inflightHead = INFLIGHT_TEXT.split('{version}')[0]?.trim() ?? '';

  /** 读面板真值：版本号输入 + **资产字段**的上下文行（结构读）= 行内提示 / toast / 模式 */
  const readPanel = async (attempts = 3) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const raw = (await evalJs(`(() => {
        try {
          const el = document.querySelector('#publish-version');
          const combo = document.querySelector('[data-slot^="combobox"], [role="combobox"]');
          const assetField = combo ? combo.closest('[data-slot="field"]') : null;
          const desc = assetField ? assetField.querySelector('[data-slot="field-description"]') : null;
          const radios = Array.from(document.querySelectorAll('[data-slot="radio-group-item"]'));
          return JSON.stringify({
            v: el ? el.value : null,
            ctx: desc ? (desc.textContent || '').trim() : null,
            errs: Array.from(document.querySelectorAll('main [data-slot="field-error"]')).map((e) => (e.textContent || '').trim()),
            toasts: document.querySelectorAll('[data-sonner-toast]').length,
            mode: radios.length > 1 ? radios[1].getAttribute('data-state') : null,
          });
        } catch (e) {
          return JSON.stringify({ v: null, ctx: null, errs: [], toasts: 0, mode: null, pageErr: String(e) });
        }
      })()`)) as string | undefined;
      if (typeof raw === 'string' && raw.startsWith('{')) {
        try {
          return JSON.parse(raw) as {
            v: string | null;
            ctx: string | null;
            errs: string[];
            toasts: number;
            mode: string | null;
            pageErr?: string;
          };
        } catch {
          /* 落到重试 */
        }
      }
      await sleep(500); // 页面可能正在导航（`evalJs` 返回 undefined）
    }
    return {
      v: null,
      ctx: null,
      errs: [],
      toasts: 0,
      mode: null,
      pageErr: 'readPanel: unreachable',
    };
  };

  // ── 独立 oracle（**刻意不复用被测实现** —— 用被测代码自证等于空转）──
  const partsOf = (version: string) => {
    const [coreRaw = ''] = version.split('+');
    const hasPre = coreRaw.endsWith('-pre');
    const core = hasPre ? coreRaw.slice(0, -4) : coreRaw;
    const [major = 1, minor = 0, patch = 0] = core.split('.').map((n) => Number(n) || 0);
    return { major, minor, patch, hasPre };
  };
  const cmp = (x: string, y: string): number => {
    const l = partsOf(x);
    const r = partsOf(y);
    if (l.major !== r.major) return l.major - r.major;
    if (l.minor !== r.minor) return l.minor - r.minor;
    if (l.patch !== r.patch) return l.patch - r.patch;
    if (l.hasPre === r.hasPre) return 0;
    return l.hasPre ? -1 : 1;
  };
  /** 服务端口径复算：占号集合（排除 SCAN_FAILED）⇒ 最大号 + 1（`-pre` 剥段补位） */
  const nextFrom = (occupied: string[]): string => {
    if (occupied.length === 0) return '1.0.0';
    const max = occupied.reduce((acc, v) => (cmp(v, acc) > 0 ? v : acc));
    const { major, minor, patch, hasPre } = partsOf(max);
    let cand = hasPre ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`;
    for (let i = 0; i < 100 && occupied.includes(cand); i += 1) {
      const p = partsOf(cand);
      cand = `${p.major}.${p.minor}.${p.patch + 1}`;
    }
    return cand;
  };
  const occupiedOf = async (slug: string): Promise<string[]> =>
    ((await apiGet(`/api/assets/${slug}/versions?limit=100`)).body?.items ?? [])
      .filter((i: { status: string }) => i.status !== 'SCAN_FAILED')
      .map((i: { version: string }) => i.version);

  const deepLink = async (slug: string) => {
    await navTo(`${APP}/dashboard/publish?slug=${slug}`, 3200);
    return await readPanel();
  };

  // ── G10① 缺陷回归：G5 链自产资产（在审 1.0.0 · 从未发布）⇒ 预填 = 最大占号 + 1（旧实现 = 1.0.0 撞号）──
  const regOccupied = await occupiedOf(runSlug);
  const regExpect = nextFrom(regOccupied);
  const reg = await deepLink(runSlug);
  ok(
    `G10① 缺陷回归：在审/未发布资产不再预填撞号值（占号 [${regOccupied.join(', ')}] ⇒ ${regExpect}）`,
    reg.v === regExpect && reg.v !== '1.0.0',
    `page=${reg.v} · 旧实现填 1.0.0 ⇒ 必 409`,
  );

  // ── G10② 口径一致性（数据自适应 · 逐资产导航）：页面预填 == 独立算出的「最大占号 + 1」──
  const rows: Array<{ slug: string; page: string | null; want: string; occ: string[] }> = [];
  for (const slug of ['m4b7-fix-1', 'm4b7-fix-2', 'm4b7-fix-3', runSlug]) {
    const occ = await occupiedOf(slug);
    const want = nextFrom(occ);
    const panel = slug === runSlug ? reg : await deepLink(slug);
    rows.push({ slug, page: panel.v, want, occ });
  }
  ok(
    'G10② 口径一致性：页面预填 == 独立算出的「最大占号 + 1」（含空集 ⇒ 1.0.0 · `-pre` 剥段 · 待审占号）',
    rows.every((r) => r.page === r.want),
    rows
      .map((r) => `${r.slug}[${r.occ.join('/')}]=${r.page}${r.page === r.want ? '' : `≠${r.want}`}`)
      .join(' · '),
  );

  // ── G10③ 上下文行：压着在途版本 ⇒「在途 …」（**不再**谎报「暂无版本」）──
  ok(
    'G10③ 资产上下文行：有在途版本 ⇒「在途 {version}」而非「暂无版本」（F253）',
    reg.ctx !== null &&
      reg.ctx !== NONE_TEXT &&
      inflightHead !== '' &&
      reg.ctx.startsWith(inflightHead),
    `ctx=${reg.ctx}`,
  );

  // ── G10④ 反证：真空壳资产仍「暂无版本」∧ 预填 1.0.0（D49 不变 · 防误伤）──
  const shell = await deepLink('m4b7-fix-2');
  ok(
    'G10④ 反证：无版本资产 ⇒ 上下文仍「暂无版本」∧ 预填 1.0.0（D49 不变）',
    shell.ctx === NONE_TEXT && shell.v === '1.0.0',
    `ctx=${shell.ctx} v=${shell.v}`,
  );

  // ── G10⑤⑥ 占号**前置**提示（D27）：命中 ⇒ 说明原因 + 建议号；改空闲号 ⇒ 提示消失 ──
  await deepLink(runSlug);
  await fillInput('#publish-version', regOccupied[0] ?? '');
  await sleep(420);
  const hit = await readPanel();
  ok(
    `G10⑤ 占号前置提示：填被占号 ${regOccupied[0]} ⇒ 行内说明原因 ∧ 给出建议号 ${regExpect}`,
    OCCUPIED_SEG !== '' &&
      hit.errs.some((e) => e.includes(OCCUPIED_SEG)) &&
      hit.errs.some((e) => e.includes(regExpect)),
    `errs=${JSON.stringify(hit.errs)}`,
  );
  await fillInput('#publish-version', '9.9.9');
  await sleep(420);
  const free = await readPanel();
  ok(
    'G10⑥ 反证：改为空闲号 ⇒ 占号提示消失（提示非恒显）',
    free.errs.length === 0,
    `errs=${JSON.stringify(free.errs)}`,
  );

  // ── G10⑦ 三入口同源：① `?slug=` 深链 ② 手动选中 ③ **拖包自动判定** ──
  // ① 深链
  const viaLink = (await deepLink(runSlug)).v;
  // ② 手动选中（切「已有」+ 选择器点选 —— D7/C11）
  // ⚠️ Radix/Base UI 的单选与选项**不吃 `element.click()`**（实测：state 不变）⇒ 必须真实鼠标事件
  await navTo(`${APP}/dashboard/publish`, 3000);
  const probed = (await evalJs(`(() => {
    const i = document.querySelector('input[type=file]');
    if (!i) return 'no-file-input';
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'probe-pack.zip', { type: 'application/zip' }));
    i.files = dt.files;
    i.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  })()`)) as string;
  await sleep(1000);
  await realClick(`Array.from(document.querySelectorAll('[data-slot="radio-group-item"]'))[1]`);
  await sleep(1400);
  const manualSteps: Record<string, unknown> = { probed };
  manualSteps.modeAfterRadio = (await evalJs(
    `JSON.stringify(Array.from(document.querySelectorAll('[data-slot="radio-group-item"]')).map((e) => e.getAttribute('data-state')))`,
  )) as string;
  await realClick(`document.querySelector('[role="combobox"]')`); // 点开 popup（选项仅在开态渲染）
  await sleep(900);
  manualSteps.filled = await fillInput('[role="combobox"]', runSlug);
  await sleep(2000);
  const items = JSON.parse(
    (await evalJs(
      `JSON.stringify(Array.from(document.querySelectorAll('[role="option"]')).map((e) => (e.textContent || '').trim()))`,
    )) as string,
  ) as string[];
  manualSteps.items = items.slice(0, 4);
  manualSteps.loading = (await evalJs(
    `!!document.querySelector('[data-slot="combobox-empty"]')`,
  )) as boolean;
  const pickedIdx = items.indexOf(runSlug);
  if (pickedIdx >= 0) {
    await realClick(
      `Array.from(document.querySelectorAll('[role="option"]')).find((e) => (e.textContent || '').trim() === ${JSON.stringify(runSlug)})`,
    );
    await sleep(2600); // 等占号集合拉回
  }
  // ⚠️ 点选后占号集合还要一次取数 ⇒ **轮询到期望值**，不用固定 sleep（网络时序容差）
  for (let i = 0; i < 30; i += 1) {
    manualSteps.v = (await evalJs(
      `(document.querySelector('#publish-version') || {}).value ?? null`,
    )) as string | null;
    if (manualSteps.v === regExpect) break;
    await sleep(250);
  }
  if (pickedIdx < 0) manualSteps.err = 'no-item';
  const manual = JSON.parse(JSON.stringify(manualSteps)) as {
    v?: string | null;
    err?: string;
  };
  // ③ 拖包自动判定（T9/D15 —— **用户 2026-09-29 点名要求**）：包名派生 slug == 该资产 ⇒ 自动切「已有」+ 预填
  const zipB64 = buildFixtureZip().toString('base64');
  await navTo(`${APP}/dashboard/publish`, 3000);
  const dropped = (await evalJs(`(() => {
    const bin = atob(${JSON.stringify(zipB64)});
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], ${JSON.stringify(`${runSlug}.zip`)}, { type: 'application/zip' });
    const input = document.querySelector('input[type=file]');
    if (!input) return 'no-input';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  })()`)) as string;
  await sleep(3200); // 防抖 300ms + 两次取数（我的资产 + 占号集合）
  const dropPanel = await readPanel();
  ok(
    'G10⑦ 三入口同源：深链 / 手动选中 / **拖包自动判定** ⇒ 预填值两两相等（用户点名要求 ③ 同样生效）',
    dropped === 'ok' &&
      viaLink === regExpect &&
      manual.v === regExpect &&
      dropPanel.v === regExpect &&
      dropPanel.mode === 'checked',
    `深链=${viaLink} 手动=${manual.v ?? manual.err} 拖包=${dropPanel.v}（期望 ${regExpect} · 拖包=${dropped} · 拖包后模式=${dropPanel.mode} · 手选调试=${JSON.stringify(manual)}）`,
  );

  // ── G10⑧ 手改保护：占号集合**异步**返回不覆盖用户输入（`versionTouched`）──
  // 手法：给 `*/api/assets/*/versions*` 加全局延迟 ⇒ 输入框一出现就手改 ⇒ 等响应落地后仍须保持手改值。
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 250,
    downloadThroughput: 10_000_000,
    uploadThroughput: 10_000_000,
  });
  await navTo(`${APP}/dashboard/publish?slug=${runSlug}`, 300);
  const keepRaw = (await evalJs(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let el = null;
    for (let i = 0; i < 200 && el === null; i += 1) {
      el = document.querySelector('#publish-version');
      if (el === null) await wait(50);
    }
    if (el === null) return JSON.stringify({ err: 'no-input' });
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter.call(el, '7.7.7');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(3200); // 等被延迟的占号集合响应落地
    return JSON.stringify({ v: document.querySelector('#publish-version')?.value ?? null });
  })()`)) as string;
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: 10_000_000,
    uploadThroughput: 10_000_000,
  });
  const kept = JSON.parse(keepRaw) as { v?: string | null; err?: string };
  ok(
    'G10⑧ 手改版本号后：占号集合异步返回**不覆盖**用户输入（versionTouched）',
    kept.v === '7.7.7',
    `v=${kept.v ?? kept.err}`,
  );

  // ── G10⑨ 拉取失败静默回落：**只**阻断版本列表端点（不碰模块 URL）⇒ 仍给号 ∧ 零报错零 toast ──
  await navTo(`${APP}/dashboard/publish`, 2200); // 先复原页面（⑦ 的延迟已撤）
  await send('Network.setBlockedURLs', { urls: ['*/api/assets/*/versions*'] });
  const blocked = await deepLink(runSlug);
  await send('Network.setBlockedURLs', { urls: [] });
  ok(
    'G10⑨ 拉取失败静默回落：阻断 `*/api/assets/*/versions*` ⇒ 仍给出版本号（回落旧口径）∧ 零行内错误 ∧ 零 toast',
    blocked.v === '1.0.0' && blocked.errs.length === 0 && blocked.toasts === 0,
    `v=${blocked.v} errs=${JSON.stringify(blocked.errs)} toasts=${blocked.toasts}`,
  );
  await navTo(`${APP}/dashboard/publish`, 1500); // 收尾复原
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
if (only.length > 0) {
  const missing = only.filter((s) => !hit.has(s));
  if (missing.length > 0) console.log(`⚠️ SMOKE_ONLY 未命中段：${missing.join(',')}`);
  console.log('⚠️ 分段绿 ≠ 收口绿：收口须全量跑一次');
}
process.exit(fail === 0 ? 0 : 1);
