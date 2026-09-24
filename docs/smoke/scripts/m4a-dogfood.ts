// M4a 浏览器 dogfood（可重放——M4a-marketplace T18 收编）
// 前置：dev db + server(:3000) + web dev(:5173) + Edge headless CDP(:9222)：
//   "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --headless=new \
//     --remote-debugging-port=9222 --user-data-dir=/tmp/m4a-edge-profile --disable-gpu --no-first-run about:blank
// 运行（仓库根）：bun docs/smoke/scripts/m4a-dogfood.ts
// ⚠ 重跑同一里程碑请加前缀 **`SMOKE_SHOT_PREFIX=<前缀>`**（不加 = 前缀空 → **直接覆盖**历史截图，
//   变量名是 `SMOKE_SHOT_PREFIX`，不是 `SHOT_PREFIX`——2026-09-11 实测踩过）。
// 视口：脚本自带 `Emulation.setDeviceMetricsOverride` 1440×900 桌面（见 main() 注释）。
// 断言：五路由真实数据渲染 + 详情三 tab 交互 + console 零错误；截图写入 docs/smoke/（覆盖同名）。
// ⚠ **tab 激活必须用 `clickReal()`（CDP 真指针）**，不能用页内合成 `el.click()`：官方 `Tabs`
//   （radix-ui `TabsPrimitive.Trigger`）的激活在 `onMouseDown`/`onFocus` 路径上 —— M4b-1 T8 实测：
//   合成 click 事件确已派发到 document，但 `aria-selected`/panel 不变；补 mousedown 即正常。
//   M4a 时代 `DetailTabs` 是手搓 `onClick` 版本，故本脚本旧写法当时可用（M4b-1 T3 归位后失效）。
// ⚠ **关闭对话框用 `closeDialog()`**：官方 `Dialog` 的内置 ✕ **无 `aria-label`**（`sr-only` 文本 = `Close`），
//   故 `button[aria-label="关闭"]` 自 M4b-1 T3 起**恒为 null 且静默失效**（`evalJs` 吞异常）——旧脚本
//   「关闭」实为 no-op，仅因后续断言恰好仍过而未暴露；真指针点 tab 时则被未关的遮罩吞掉（T8 实证）。
//   新助手 = Esc（官方标准路径，焦点在框内）→ 兜底点内置 ✕ → 轮询「对话框消失」。
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (n: string, c: boolean, extra = '') =>
  console.log(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? ' :: ' + extra : ''}`);
const errors: string[] = [];
/** 网络层 404 资源日志（单列；由 404 态断言**预期**触发，不计入 JS 错误——T25 增） */
const netLogs: string[] = [];
/** 网络层 401 资源日志（单列；未登录门户**必然**探测 `/api/auth/me`，401 即其预期结果
 *  ——批 design §4.1「未登录 → anon」，M4b-2 T3 增） */
const authNetLogs: string[] = [];
/** 可参数化（多实例并存时用）：SMOKE_BASE_URL 指向前端 dev 端口；SMOKE_SHOT_PREFIX 给截图加前缀
 *  （避免覆盖历史里程碑的 docs/smoke/*.png 产物）。 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173';
const API_BASE = process.env.SMOKE_API_URL ?? 'http://localhost:3000';
const SHOT_PREFIX = process.env.SMOKE_SHOT_PREFIX ?? '';

async function main() {
  const cwd = process.cwd();
  const target = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' }).then(
    (r) => r.json(),
  );
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((res, rej) => {
    ws.onopen = () => res();
    ws.onerror = () => rej(new Error('ws error'));
  });
  let id = 0;
  const pending = new Map<number, { res: (v: unknown) => void }>();
  const eventWaiters: Array<{
    evt: string;
    res: () => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(String(m.data));
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!.res(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Page.loadEventFired') {
      const i = eventWaiters.findIndex((w) => w.evt === 'load');
      if (i >= 0) {
        clearTimeout(eventWaiters[i]!.timer);
        eventWaiters.splice(i, 1)[0]!.res();
      }
    }
    if (msg.method === 'Runtime.exceptionThrown')
      errors.push('exception: ' + (msg.params?.exceptionDetails?.text ?? '?'));
    if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
      const text = String(msg.params.entry.text ?? '?');
      // 网络层资源加载失败**单列**（两类都是预期触发的网络 log，非 JS 错误）：
      // ① 404 —— 404 态断言预期触发（T25）② 401 —— 未登录门户的 `/api/auth/me` 会话探测
      // 预期结果（批 design §4.1：未登录 → anon；M4b-2 T3）
      // JS 错误 / 其它 log 仍严格计入 errors（否则新增断言会让「console 零错误」假红）
      if (/^Failed to load resource/.test(text) && /404/.test(text)) netLogs.push(text);
      else if (/^Failed to load resource/.test(text) && /401/.test(text)) authNetLogs.push(text);
      else errors.push('log: ' + text);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      errors.push(
        'console: ' +
          (msg.params.args ?? []).map((a: { value?: unknown }) => String(a.value ?? '')).join(' '),
      );
    }
  };
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<unknown>((res) => {
      const myId = ++id;
      pending.set(myId, { res });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  // 桌面视口钉死（2026-09-11 修复，实证根因）：headless 新建 tab 的默认窗口可能窄于 768px
  // （实测 748×472 → shadcn `useIsMobile` 判为移动端）→ 侧栏退化为 **Sheet（不进 DOM）**，
  // 「三中心 href 可达（侧栏导航）」必然**假失败**（首页 `<a>` 只剩品牌链接）。
  // 本脚本按**桌面**语义断言（移动端不在本里程碑范围）⇒ 显式设定视口，令断言与截图宽度确定化
  // （1440×900 = design/plan 实测口径）。
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const waitLoad = () =>
    new Promise<void>((res) => {
      const timer = setTimeout(() => {
        eventWaiters.splice(
          eventWaiters.findIndex((w) => w.evt === 'load'),
          1,
        );
        res();
      }, 8000);
      eventWaiters.push({ evt: 'load', res, timer });
    });
  const evalJs = async (expression: string) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return (r as { result?: { value?: unknown } }).result?.value;
  };
  const shot = async (name: string) => {
    const r = (await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })) as { data: string };
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${cwd}/docs/smoke/${SHOT_PREFIX}${name}.png`, Buffer.from(r.data, 'base64'));
  };
  const nav = async (url: string) => {
    errors.length = 0;
    netLogs.length = 0;
    await send('Page.navigate', { url });
    await waitLoad();
    await sleep(2600);
  };
  // vite 冷编译竞态兜底：断言前轮询
  const until = async (fn: () => Promise<boolean>) => {
    for (let i = 0; i < 7; i++) {
      if (await fn()) return true;
      await sleep(900);
    }
    return false;
  };

  /**
   * **真指针点击**（CDP `Input.dispatchMouseEvent`）：凡「激活类官方件」（`Tabs` 等）都用它。
   * 入参 = 求值为目标元素的表达式（与 `evalJs` 同风格，便于按文本谓词定位）。
   * 判据见文件头 ⚠ 段：官方 `Tabs` 走 mousedown 激活，合成 `.click()` 不生效（2026-09-14 实测）。
   * 返回是否命中元素（未命中 → false，供断言失败时定位）。
   */
  const clickReal = async (findExpr: string) => {
    // 守卫：等目标成为该点**最顶层元素**——否则点击会被退出动画中的 overlay / 未关闭的对话框吞掉
    // （T8 实证：上一步对话框没真关 ⇒ 点 tab 落到遮罩上，tab 不激活、后续 innerText 断言连带失效）
    for (let i = 0; i < 10; i++) {
      const topmost = (await evalJs(`(() => {
        const el = ${findExpr};
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const t = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
        return !!t && (t === el || el.contains(t) || t.contains(el));
      })()`)) as boolean;
      if (topmost) break;
      await sleep(300);
    }
    const box = (await evalJs(`(() => {
      const el = ${findExpr};
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`)) as { x: number; y: number } | null;
    if (!box) return false;
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: box.x,
      y: box.y,
      button: 'none',
      buttons: 0,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: box.x,
      y: box.y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: box.x,
      y: box.y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await sleep(400); // 激活后等面板渲染（与旧写法后续 sleep 叠加仍成立）
    return true;
  };

  /**
   * **关闭官方 `Dialog`**：Esc（官方标准路径，焦点须在框内）→ 兜底点内置 ✕ → 轮询「对话框已消失」。
   * 取代旧写法 `querySelector('button[aria-label="关闭"]').click()`（T3 起该选择器恒 null，见文件头 ⚠）。
   */
  const closeDialog = async () => {
    const present = async () =>
      (await evalJs(`!!document.querySelector('[role="dialog"]')`)) === true;
    if (!(await present())) return true;
    for (const mode of ['escape', 'close-button'] as const) {
      if (mode === 'escape') {
        for (const type of ['keyDown', 'keyUp'] as const) {
          await send('Input.dispatchKeyEvent', {
            type,
            key: 'Escape',
            code: 'Escape',
            windowsVirtualKeyCode: 27,
            nativeVirtualKeyCode: 27,
          });
        }
      } else {
        await evalJs(`(() => {
          const btns = [...document.querySelectorAll('[role="dialog"] button')];
          const b = btns.find((x) => x.textContent.includes('Close')) ?? btns[btns.length - 1];
          if (b) b.click();
          return !!b;
        })()`);
      }
      for (let i = 0; i < 8; i++) {
        if (!(await present())) return true;
        await sleep(300);
      }
    }
    return false;
  };

  await nav(`${BASE}/skills`);
  await sleep(2000); // 预热

  await nav(`${BASE}/`);
  const homeTxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok('首页 hero', await until(async () => ((await homeTxt()) ?? '').includes('发现和分享AI资源')));
  // v0.16（2026-09-11 用户拍板）：「资产总数」拆分为「技能总数 / 专家总数 / MCP 总数」——断言随之改判
  // 三族标签；数字前置检查保留（`innerText` 顺序 = <b> 值 → <span> 标签）。
  ok(
    '首页统计 三族计数',
    await until(async () => {
      const txt = (await homeTxt()) ?? '';
      return (
        /[0-9]/.test((txt.split('技能总数')[0] ?? '').slice(-8)) &&
        txt.includes('专家总数') &&
        txt.includes('MCP 总数')
      );
    }),
  );
  // v0.15（2026-09-11 用户拍板 A）：首页精简为「纯 hero 落地页」——原「最新发布含 demo 资产」断言
  // 随功能区删除，改为**负向断言**锁住新 IA；另加「死链」断言（原 learnTypes CTA 指向的
  // #explore-types 锚点已随「按类型探索」区删除）。
  ok(
    '首页仅 hero（无「按类型探索」/「最新发布」）',
    await until(async () => {
      const txt = (await homeTxt()) ?? '';
      return !txt.includes('按类型探索') && !txt.includes('最新发布');
    }),
  );
  const homeLinks = (await evalJs(
    `[...document.querySelectorAll('a')].map((a) => a.getAttribute('href'))`,
  )) as string[];
  ok(
    '三中心 href 可达（侧栏导航）',
    ['/skills', '/mcps', '/agents'].every((p) => homeLinks.includes(p)),
  );
  ok(
    '首页无 #explore-types 死链',
    (await evalJs(`document.querySelector('a[href="#explore-types"]') === null`)) === true,
  );
  await shot('1-home');

  /* ── T11-h（2026-09-20 用户拍板「只做形态对齐 · 空态没反应」）：首页搜索**两态** ────────────
     空态 = `ghost` 底 + 主色描边放大镜 + `aria-disabled`（点击 / 回车一律无反应）；
     有输入 = `default` 实底主色 + 白图标（`text-primary-foreground` 随 variant）+ 可提交 `/skills?q=`。
     ⚠️ **读底色前必须先关过渡**（本笔实测踩过）：官方 `Button` 带 `transition-all`，在**隐藏 tab**
     里过渡不推进 ⇒ 直接读 `backgroundColor` 会拿到**过渡起点值**（`oklab(0 0 0 / 0)` = 透明），
     误判「实底没生效」。故探针内 `transition:none` → 读 → 复原。 */
  /**
   * **页面作用域**（F99 同族 —— 壳层新件抢裸选择器）：`[data-slot=input-group]` 同时出现在
   * **壳层**：顶栏的全资产搜索件（T11-i A · 常驻）与内容区**同为** `sidebar-inset` 的子节点，
   * 且壳层那支在 DOM 中**先于内容区** ⇒ 裸 `document.querySelector('[data-slot="input-group"] input')`
   * 会打到**顶栏那支**（实证：首跑 T11-h 三条断言集体假红）。凡「页面级」探针一律限定
   * `[data-slot=sidebar-inset] > div`（≡ 壳层 `Outlet` 容器；顶栏是同级 `> header`，天然排除）。
   *
   * 历史：F102 登记时壳层那支是 **B′ 期侧栏一体搜索件**（`ui/SidebarSearch.tsx`）；该件已随 B″
   * 拍板**退役**（见批 design §4.7.6），但**本作用域保留** —— 它对后续任何壳层件都成立。
   */
  const PAGE = `[data-slot="sidebar-inset"] > div`;
  const HERO_INPUT = `document.querySelector('${PAGE} [data-slot="input-group"] input')`;
  const HERO_BTN = `(() => {
    const b = [...document.querySelectorAll('${PAGE} button')].find((x) => (x.getAttribute('aria-label') ?? '') === '搜索');
    if (!b) return 'none';
    const t = b.style.transition; b.style.transition = 'none'; void b.offsetWidth;
    const cs = getComputedStyle(b); const svg = b.querySelector('svg');
    const out = { dv: b.getAttribute('data-variant'), ad: b.getAttribute('aria-disabled'),
      bg: cs.backgroundColor, icon: svg ? getComputedStyle(svg).color : null, r: cs.borderRadius };
    b.style.transition = t;
    return JSON.stringify(out);
  })()`;
  const TYPE_HERO = `(() => { const i = document.querySelector('${PAGE} [data-slot="input-group"] input');
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(i, 'm4a'); i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`;
  const CLICK_HERO = `(() => { const b = [...document.querySelectorAll('${PAGE} button')].find((x) => (x.getAttribute('aria-label') ?? '') === '搜索');
    if (b) b.click(); return !!b; })()`;

  const idleBtn = JSON.parse((await evalJs(HERO_BTN)) as string) as {
    dv: string;
    ad: string | null;
    bg: string;
    icon: string | null;
    r: string;
  };
  ok(
    'T11-h 空态：右钮 `ghost` + 主色描边 + 不可用（`aria-disabled`）+ 全胶囊',
    idleBtn.dv === 'ghost' &&
      idleBtn.ad === 'true' &&
      idleBtn.bg === 'rgba(0, 0, 0, 0)' &&
      idleBtn.r !== '0px' &&
      !!idleBtn.icon,
    JSON.stringify(idleBtn),
  );
  await evalJs(CLICK_HERO);
  await sleep(900);
  ok(
    'T11-h 空态点击 ⇒ 无反应（URL 不变，不跳 `/skills`）',
    (await evalJs('location.pathname + location.search')) === '/',
  );

  /* v0.25（2026-09-20 用户拍板「鼠标一点击输入的地方、焦点在的时候就变」）：点亮判据 = **聚焦 或 有输入**。
     断言三态：① 真指针点入 ⇒ input 真获得焦点 ② 聚焦空态 ⇒ 点亮（`default` + 实底主色）但 `aria-disabled`
     **仍在**（不可提交）③ 真指针点标题 ⇒ 失焦复位 `ghost` 描边。
     ⚠️ **必须用真指针**（`clickReal`），不能用页内 `el.focus()`：本笔实测 —— **后台 tab 里
     `element.focus()` 会设上 `activeElement` 却不派发 `focus` 事件**（探针实测 `activeElement === input`
     为真、`data-variant` 仍 `ghost`）⇒ React `onFocus` 不触发 ⇒ 假红。与 **F94**（过渡不推进）同属
     「后台 tab 副作用」家族，但成因不同：本条是**事件不派发**，不是样式不推进。 */
  await clickReal(HERO_INPUT);
  await sleep(500);
  ok(
    'T11-h 聚焦探针（真指针点入）：input 真获得焦点',
    (await evalJs(`document.activeElement === ${HERO_INPUT}`)) === true,
  );
  const focusBtn = JSON.parse((await evalJs(HERO_BTN)) as string) as {
    dv: string;
    ad: string | null;
    bg: string;
  };
  ok(
    'T11-h 聚焦空态（v0.25）：右钮点亮 `default` 实底主色 · 但仍不可提交（`aria-disabled` 保留）',
    focusBtn.dv === 'default' &&
      focusBtn.ad === 'true' &&
      focusBtn.bg !== 'rgba(0, 0, 0, 0)' &&
      focusBtn.bg !== 'oklab(0 0 0 / 0)',
    JSON.stringify(focusBtn),
  );
  await clickReal(`document.querySelector('h1')`);
  await sleep(500);
  ok(
    'T11-h 失焦探针（真指针点标题）：焦点已离开 input',
    (await evalJs(`document.activeElement === ${HERO_INPUT}`)) === false,
  );
  const blurredBtn = JSON.parse((await evalJs(HERO_BTN)) as string) as {
    dv: string;
    ad: string | null;
    bg: string;
  };
  ok(
    'T11-h 失焦空态（v0.25）：右钮复位 `ghost` + 主色描边 + 不可用',
    blurredBtn.dv === 'ghost' && blurredBtn.bg === 'rgba(0, 0, 0, 0)' && blurredBtn.ad === 'true',
    JSON.stringify(blurredBtn),
  );

  await evalJs(TYPE_HERO);
  await sleep(700);
  const typedBtn = JSON.parse((await evalJs(HERO_BTN)) as string) as {
    dv: string;
    ad: string | null;
    bg: string;
  };
  ok(
    'T11-h 有输入：右钮 `default` **实底主色** + 可提交（`aria-disabled` 移除）',
    typedBtn.dv === 'default' &&
      typedBtn.ad === null &&
      typedBtn.bg !== 'rgba(0, 0, 0, 0)' &&
      typedBtn.bg !== 'oklab(0 0 0 / 0)',
    JSON.stringify(typedBtn),
  );
  await evalJs(CLICK_HERO);
  await sleep(1600);
  const submitted = (await evalJs('location.pathname + location.search')) as string;
  // T11-i A（口径变更）：Hero 提交目标由 `/skills?q=` **改 `/search?q=`**（跨类型；design §8.12 ⑤）
  ok(
    'T11-h 有输入点击 ⇒ 提交 `/search?q=m4a`（T11-i 口径）',
    submitted.startsWith('/search?q=m4a'),
    submitted,
  );

  /* ── T11-i（2026-09-20 用户拍板 A1 + B1 + C3 +「Hero 对齐」+「sidebar 放命令面板搜索」）────
     **A** = 顶栏小搜索（公共件 `AssetSearch` 的 `sm` 档）+ `/search` 跨类型结果页 + 首页搜索抽件；
     **B″** = 侧栏**框样触发器**（看起来像常驻输入框的按钮）→ 打开**官方 `CommandDialog` 命令面板**
     （2026-09-20 用户拍板「还是官方站的对话框更适合」⇒ **A 案**；形态照 **shadcn 官方站同款**实测配方）。
     ⚠️ 同日先试过「常驻输入框 + 紧邻下拉」的一体形态（官方 `Combobox` · Base UI 原语）—— 用户复审后
     **拍板改回对话框**，该形态与其依赖 `@base-ui/react` 一并**退役**（偏离登记见批 design §4.7.6）。
     ⚠️ **F98（本笔实测）**：**后台 tab 里 SPA 路由切换的 DOM 不提交** —— URL 已变而内容仍是旧页
        （与 F94「过渡不推进」/ F95「focus 不派发」同族）；**凡断言「导航后的页面内容」须先
        `Page.bringToFront` 激活 tab**（只断言 URL 时不受影响）。 */
  await send('Page.bringToFront');
  await sleep(500);

  // A-① 顶栏小搜索（`sm` 档 = h-9 · **固定 w-320** · **靠右**且**在语言切换左侧** · 放大镜 `stroke-width=4`）
  //     2026-09-20 用户调整：原「标题右侧 · 弹性 max-w-320」⇒ 现「语言切换左侧 · 固定 320 · 图标加粗一倍」
  const topBar = JSON.parse(
    (await evalJs(`(() => {
    const f = document.querySelector('header form');
    if (!f) return JSON.stringify({ ok: false });
    const g = f.querySelector('[data-slot="input-group"]');
    const b = g.getBoundingClientRect();
    const hb = document.querySelector('header').getBoundingClientRect();
    const sws = [...document.querySelectorAll('header button[aria-pressed]')];
    const sw = sws.length ? sws[0].getBoundingClientRect() : null;
    return JSON.stringify({ ok: true, h: Math.round(b.height), w: Math.round(b.width),
      ph: f.querySelector('input').placeholder,
      stroke: f.querySelector('svg').getAttribute('stroke-width'),
      rightHalf: b.left > hb.left + hb.width / 2,
      leftOfSwitcher: sw ? b.right <= sw.left : null,
      gapToSwitcher: sw ? Math.round(sw.left - b.right) : null });
  })()`)) as string,
  ) as {
    ok: boolean;
    h?: number;
    w?: number;
    ph?: string;
    stroke?: string;
    rightHalf?: boolean;
    leftOfSwitcher?: boolean;
    gapToSwitcher?: number;
  };
  ok(
    'T11-i A 顶栏小搜索（`sm` h-9 · **w=320** · **靠右**·**在语言切换左侧** · 放大镜 `stroke=4`）',
    topBar.ok &&
      topBar.h === 36 &&
      topBar.w === 320 &&
      topBar.rightHalf === true &&
      topBar.leftOfSwitcher === true &&
      topBar.stroke === '4',
    JSON.stringify(topBar),
  );

  // A-② 顶栏提交 ⇒ `/search?q=`（真指针：先点入聚焦、再点提交钮 —— 与 T11-h 同法 · F95）
  await clickReal(`document.querySelector('header form input')`);
  await sleep(400);
  await evalJs(`(() => { const i = document.querySelector('header form input');
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(i, 'm4a'); i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`);
  await sleep(400);
  await clickReal(`document.querySelector('header form button[type="submit"]')`);
  await sleep(1800);
  const topSubmitted = (await evalJs('location.pathname + location.search')) as string;
  ok(
    'T11-i A 顶栏提交 ⇒ `/search?q=m4a`（**跨类型**结果页）',
    topSubmitted === '/search?q=m4a',
    topSubmitted,
  );
  ok(
    'T11-i A 顶栏输入**保留**（顶栏常驻 ⇒ 便于改词）',
    (await evalJs(`document.querySelector('header form input').value`)) === 'm4a',
  );

  // A-③ `/search` 结果页形态（标题 / 计数 / 类型 chips 四档 / 排序 / 有卡片）
  await nav(`${BASE}/search?q=seed`);
  await sleep(2000);
  const searchPage = JSON.parse(
    (await evalJs(`(() => {
    const txt = document.body.innerText;
    const chips = [...document.querySelectorAll('[data-slot="toggle-group-item"]')].map((x) => x.innerText.trim());
    return JSON.stringify({ title: !!document.querySelector('h1'), count: /共 [0-9]+ 个结果/.test(txt),
      chips: chips.slice(0, 4), sort: !!document.querySelector('button[aria-label="排序"]'),
      cards: document.querySelectorAll('a[href^="/assets/"]').length });
  })()`)) as string,
  ) as {
    title: boolean;
    count: boolean;
    chips: string[];
    sort: boolean;
    cards: number;
  };
  ok(
    'T11-i A `/search` 页：标题 + 计数 + 类型 chips（全部/技能/MCP/专家）+ 排序 + 卡片',
    searchPage.title &&
      searchPage.count &&
      searchPage.sort &&
      searchPage.cards > 0 &&
      searchPage.chips.join('/') === '全部/技能/MCP/专家',
    JSON.stringify(searchPage),
  );

  // A-④ 类型 chips 生效（切「技能」⇒ `?type=skill` 且结果**收窄** ⇒ 反证 `all` 档 = 跨类型）
  const allCards = searchPage.cards;
  await clickReal(
    `[...document.querySelectorAll('[data-slot="toggle-group-item"]')].find((x) => x.innerText.trim() === '技能')`,
  );
  await sleep(1800);
  const pinned = JSON.parse(
    (await evalJs(`(() => JSON.stringify({
    url: location.search, cards: document.querySelectorAll('a[href^="/assets/"]').length }))()`)) as string,
  ) as {
    url: string;
    cards: number;
  };
  ok(
    'T11-i A 类型 chips 生效（`?type=skill` ⇒ 结果收窄 ⇒ 反证 `all` 是跨类型）',
    pinned.url.includes('type=skill') && pinned.cards > 0 && pinned.cards < allCards,
    `${JSON.stringify(pinned)} · all=${allCards}`,
  );

  // B-① 侧栏框样触发器（占比文案 + 快捷键徽标 + `aria-haspopup=dialog`）
  await nav(`${BASE}/`);
  await sleep(1600);
  const entry = JSON.parse(
    (await evalJs(`(() => {
    const b = document.querySelector('[aria-haspopup="dialog"]');
    if (!b) return JSON.stringify({ ok: false });
    return JSON.stringify({ ok: true, text: b.innerText.replace(/\\n/g, '|'),
      kbd: b.innerText.includes('⌘K') || b.innerText.includes('Ctrl+K') });
  })()`)) as string,
  ) as { ok: boolean; text?: string; kbd?: boolean };
  ok(
    'T11-i B″ 侧栏触发器（常驻框样 · 占位文案 + 快捷键徽标 + `aria-haspopup=dialog`）',
    entry.ok && entry.kbd === true && entry.text?.includes('搜索页面') === true,
    JSON.stringify(entry),
  );

  // B-①b 触发器放大镜**取色**（2026-09-20 用户「侧边栏搜索图标的颜色要浅一些」）：
  //   原 = 无 className ⇒ 继承按钮 `--foreground`（`#0f172a`，比同块文案更深）；
  //   现 = `text-muted-foreground` ⇒ 与文案 + `⌘K` 徽标**三处同色**。
  //   **断言口径**：与 `--muted-foreground` 的**实时解析值**比对（临时探针元素解 token，不写死 hex），
  //   并反证 ≠ `--foreground` ⇒ token 换肤后断言仍成立。
  const iconInk = JSON.parse(
    (await evalJs(`(() => {
    const b = document.querySelector('[aria-haspopup="dialog"]');
    const probe = document.createElement('span'); document.body.appendChild(probe);
    probe.style.color = 'var(--muted-foreground)'; const mutedFg = getComputedStyle(probe).color;
    probe.style.color = 'var(--foreground)'; const fg = getComputedStyle(probe).color;
    probe.remove();
    const svg = b.querySelector('svg'), sp = b.querySelector('span'), kbd = b.querySelector('kbd');
    return JSON.stringify({ icon: getComputedStyle(svg).color, text: getComputedStyle(sp).color,
      kbd: kbd ? getComputedStyle(kbd).color : null, mutedFg, fg,
      stroke: svg.getAttribute('stroke-width') });
  })()`)) as string,
  ) as {
    icon: string;
    text: string;
    kbd: string | null;
    mutedFg: string;
    fg: string;
    stroke: string;
  };
  ok(
    'T11-i B″ 触发器放大镜 = `--muted-foreground`（与文案 / `⌘K` 徽标**三处同色** · ≠ `--foreground`）',
    iconInk.icon === iconInk.mutedFg &&
      iconInk.icon === iconInk.text &&
      iconInk.icon === iconInk.kbd &&
      iconInk.icon !== iconInk.fg,
    JSON.stringify(iconInk),
  );

  // B-② 点触发器 ⇒ 面板打开 · 门户 4 条俱在 ·（未登录）不加管理面
  await clickReal(`document.querySelector('[aria-haspopup="dialog"]')`);
  await sleep(1000);
  const panel = JSON.parse(
    (await evalJs(`(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return JSON.stringify({ state: 'ABSENT' });
    return JSON.stringify({ state: d.getAttribute('data-state'),
      items: [...d.querySelectorAll('[cmdk-item]')].map((x) => x.innerText.trim()),
      heading: [...d.querySelectorAll('[cmdk-group-heading]')].map((x) => x.innerText.trim()) });
  })()`)) as string,
  ) as { state: string; items?: string[]; heading?: string[] };
  const anon = ((await evalJs(`document.body.innerText.includes('登录')`)) as boolean) === true;
  const portalOk = ['首页', '技能中心', 'MCP 中心', '专家中心'].every((x) =>
    (panel.items ?? []).includes(x),
  );
  ok(
    'T11-i B″ 点触发器 ⇒ 官方 `CommandDialog` 打开（`data-state=open`）· 门户 4 条俱在 · 未登录不加管理面',
    panel.state === 'open' &&
      portalOk &&
      panel.heading?.includes('页面') === true &&
      (!anon || panel.items?.length === 4),
    `${JSON.stringify(panel)} anon=${anon}`,
  );

  // B-②b 条目形态（2026-09-20 用户拍板「只做 B」）：**页面**条目带 `→` 前缀箭头
  //   （lucide `ArrowRight` · size-16 · 色 = `--muted-foreground` · `stroke-width=2`）。
  //   尺寸 / 色值**全走官方 `CommandItem` 内建规则**（`[&_svg:not([class*=size-])]:size-4` +
  //   `[&_svg:not([class*=text-])]:text-muted-foreground`）⇒ 本仓**零 className 覆盖**。
  //   断言 = 门户 4 条**各 1 枚** svg，且**同尺寸同色**（跨条目一致）。
  const itemArrows = JSON.parse(
    (await evalJs(`(() => {
    const probe = document.createElement('span'); document.body.appendChild(probe);
    probe.style.color = 'var(--muted-foreground)'; const mutedFg = getComputedStyle(probe).color;
    probe.remove();
    const rows = [...document.querySelectorAll('[cmdk-item]')].filter((x) =>
      ['首页', '技能中心', 'MCP 中心', '专家中心'].includes(x.innerText.trim()));
    return JSON.stringify({ mutedFg, rows: rows.map((x) => {
      const s = x.querySelector('svg');
      return { t: x.innerText.trim(), svg: !!s,
        w: s ? Math.round(s.getBoundingClientRect().width) : 0,
        color: s ? getComputedStyle(s).color : null };
    }) });
  })()`)) as string,
  ) as { mutedFg: string; rows: { t: string; svg: boolean; w: number; color: string | null }[] };
  ok(
    'T11-i B″ 页面条目带 `→` 前缀（4 条各 1 枚 · size 16 · 色 = `--muted-foreground`）',
    itemArrows.rows.length === 4 &&
      itemArrows.rows.every((r) => r.svg && r.w === 16 && r.color === itemArrows.mutedFg),
    JSON.stringify(itemArrows),
  );

  // B-③ Esc ⇒ 关闭（`data-state` 节点消失）
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
  await sleep(1200);
  ok(
    'T11-i B″ `Esc` ⇒ 面板关闭',
    (await evalJs(`document.querySelector('[role="dialog"]') === null`)) === true,
  );

  // B-④ ⌘K / Ctrl+K ⇒ 打开
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'k',
    code: 'KeyK',
    windowsVirtualKeyCode: 75,
    modifiers: 4,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'k',
    code: 'KeyK',
    windowsVirtualKeyCode: 75,
    modifiers: 4,
  });
  await sleep(1000);
  ok(
    'T11-i B″ `⌘K`/`Ctrl+K` ⇒ 面板打开',
    (await evalJs(`document.querySelector('[role="dialog"]')?.getAttribute('data-state')`)) ===
      'open',
  );

  // B-⑤ 兜底行：输入关键词 ⇒ 末尾出现「在全部资产里搜「{q}」」⇒ 回车跳 `/search?q=`
  await evalJs(`(() => { const i = document.querySelector('[cmdk-input]');
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(i, 'seed'); i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`);
  await sleep(1000);
  const fallback = (await evalJs(`(() => {
    const items = [...document.querySelectorAll('[cmdk-item]')].map((x) => x.innerText.trim());
    return JSON.stringify(items.filter((x) => x.includes('在全部资产里搜')));
  })()`)) as string;
  ok('T11-i B″ 兜底行出现（「在全部资产里搜「seed」」）', fallback.includes('seed'), fallback);
  // B-⑤b 兜底行**不带**箭头（2026-09-20 用户拍板「只做 B」时定：箭头 = 跳转语义，兜底行是**搜索**语义）
  ok(
    'T11-i B″ 兜底行**不带** `→`（搜索语义 ≠ 跳转 · 与页面条目区分）',
    (await evalJs(
      `(() => { const it = [...document.querySelectorAll('[cmdk-item]')].find((x) => x.innerText.includes('在全部资产里搜')); return it ? it.querySelector('svg') === null : false; })()`,
    )) === true,
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await sleep(1800);
  ok(
    'T11-i B″ 兜底行回车 ⇒ 跳 `/search?q=seed`（面板与结果页串联）',
    (await evalJs('location.pathname + location.search')) === '/search?q=seed',
    (await evalJs('location.pathname + location.search')) as string,
  );

  await nav(`${BASE}/skills`);
  /**
   * 搜索入口（**2026-09-18 改口径 · T11-e**）：页头搜索框已移除（用户拍板去重复入口）⇒
   * 入口 = 工具条右侧的折叠面板触发钮；点开后输入框出现（占位符仍为「搜索技能…」）。
   * 原断言直接查 `input[placeholder*="搜索技能"]` —— 折叠收起时 DOM 里不存在，故拆两步。
   */
  ok(
    '中心搜索入口 = 折叠面板触发钮',
    await until(
      async () =>
        (await evalJs(
          `[...document.querySelectorAll('button')].some((b) => (b.getAttribute('aria-label') ?? '') === '搜索')`,
        )) === true,
    ),
  );
  await evalJs(
    `(() => { const t = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '') === '搜索'); if (t) t.click(); return !!t; })()`,
  );
  await sleep(1400);
  ok(
    '点开触发钮 ⇒ 搜索输入框出现（占位符 = 搜索技能…）',
    (await evalJs(`document.querySelector('input[placeholder*="搜索技能"]') !== null`)) === true,
  );
  ok(
    '中心真实数据卡',
    await until(async () => ((await homeTxt()) ?? '').includes('LangGraph RAG 检索技能')),
  );
  // ⚠ 2026-09-16 修正（M4b-3 T10 自检发现**数据依赖**）：原断言硬编码「共 3 个技能」——
  //   任何新增 skill 资产（如 M4b-3 造数）都会误报失败 ⇒ 改为**与 `/api/stats` 对账**（AGENTS.md：测试只依赖自己造的数据）
  ok(
    '中心计数与 `stats` 接口技能数一致',
    await until(async () => {
      const t = (await homeTxt()) ?? '';
      // ⚠ 该 `until` 回调在 **Node 侧**执行（非页面上下文）⇒ 必须用绝对 URL
      const api = (await fetch(`${API_BASE}/api/stats`)
        .then((r) => r.json())
        .catch(() => null)) as { typeCounts?: { skill?: number } } | null;
      const n = api?.typeCounts?.skill;
      return typeof n === 'number' && t.includes(`共 ${n} 个技能`);
    }),
  );
  // ⚠ 2026-09-20 口径变更（M4b-4 验收期第三笔 T11-f · 两轮）：原断言 = 静态文本「排序：最近更新」
  //   → v1.25 改 chips ×5 → **v1.27 用户线框对比后拍板改官方 `Select`**（跨批交付物改动，同类 F69/F85）。
  //   ★ **2026-09-21 再变更（M4b-4 验收期第六笔 T11-j `j6` · 用户拍板「方向 1 纯图标」）**：
  //   `Select`（160px）→ **纯图标无框钮（32px）+ 官方 `DropdownMenu` 三档** ⇒ 断言改为
  //   「**纯图标无框钮存在且几何正确**」：① 旧静态文本已消失 ② `button[aria-label=排序]` 在
  //   ③ **32×32 且 `border 0`**（无框）④ 钮内**无文案**（纯图标）。
  //   档位齐 / 勾选态 / URL 换档由 **M4b-4 G22 段**覆盖（跨批脚本不驱动 radix 面板，避免脆弱耦合）。
  const sortState = (await evalJs(`(() => {
    const b = document.querySelector('button[aria-label="排序"]');
    const st = b ? getComputedStyle(b) : null;
    const r = b ? b.getBoundingClientRect() : null;
    return {
      legacyText: (document.body.innerText || '').includes('排序：最近更新'),
      hasBtn: !!b,
      box: r ? Math.round(r.width) + 'x' + Math.round(r.height) : null,
      border: st ? st.borderTopWidth : null,
      text: b ? (b.innerText || '').trim() : null,
    };
  })()`)) as {
    legacyText: boolean;
    hasBtn: boolean;
    box: string | null;
    border: string | null;
    text: string | null;
  };
  ok('中心排序栏：静态文本已退役（T11-f）', sortState.legacyText === false);
  ok(
    '中心排序栏：形态 = **纯图标无框钮**（`aria-label=排序` · 32×32 · border 0 · 无文案）—— T11-j `j6` 方向 1',
    sortState.hasBtn &&
      sortState.box === '32x32' &&
      sortState.border === '0px' &&
      sortState.text === '',
    JSON.stringify(sortState),
  );
  await shot('2-skills');

  // 全态（T25 补）① 搜索：?q= 提交态驱动列表（design §7）——命中 1 条 + 结果头切「筛选结果」
  await nav(`${BASE}/skills?q=LangGraph`);
  ok(
    '中心搜索 ?q= 命中',
    await until(async () => ((await homeTxt()) ?? '').includes('LangGraph RAG 检索技能')),
  );
  ok(
    '中心搜索结果头（筛选结果）',
    await until(async () => ((await homeTxt()) ?? '').includes('筛选结果')),
  );
  await shot('2b-skills-search');

  // 全态 ② 筛选：点根标签 chip → URL ?label= + 列表收窄；点「全部」→ 复位
  await nav(`${BASE}/skills`);
  await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '智能体'); if (b) b.click(); return !!b; })()`,
  );
  await sleep(1500);
  ok(
    '筛选 chip 点击 → URL ?label=',
    ((await evalJs('location.search')) as string).includes('label=agentic'),
  );
  ok(
    '筛选后列表收窄（筛选结果）',
    await until(async () => ((await homeTxt()) ?? '').includes('筛选结果')),
  );
  await shot('2c-skills-filter');
  await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '全部'); if (b) b.click(); return !!b; })()`,
  );
  await sleep(1500);
  ok('筛选「全部」复位 URL', ((await evalJs('location.search')) as string) === '');
  // 全态 ③ 分页：3 资产 < limit 20 ⇒ 分页控件不渲染（正当行为；真翻页需 >20 资产 → 登记）
  // ⚠ 2026-09-16 修正（M4b-3 T6 自检发现**假 PASS**）：旧选择器 `nav[aria-label*="分页"]` **永不匹配**
  //   —— 官方 `Pagination` 的 `aria-label` 是英文 `pagination`（`components/ui/shadcn/pagination.tsx:11`）
  //   ⇒ 该断言恒真、静默失效（实测：中心页当时确在渲染「1 / 1 · 每页 20」）。现改为官方真值选择器，
  //   并**补非空洞条件**（同页真实卡片已渲染）⇒「控件缺席」才是真结论。配套真码修正见
  //   `components/market/CenterPage.tsx`（分页补 `total > PAGE_SIZE` 条件）。
  ok(
    '资产数 < limit ⇒ 无分页控件（正当缺席）',
    (await evalJs(
      `(() => {
        const rendered = document.body.innerText.includes('LangGraph RAG 检索技能');
        return rendered && document.querySelector('nav[aria-label="pagination"]') === null;
      })()`,
    )) === true,
  );

  await nav(`${BASE}/assets/demo-rag-skill`);
  const dtxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok(
    '详情名/元信息（M4-pre：坐标裸 slug）',
    await until(
      async () =>
        ((await dtxt()) ?? '').includes('LangGraph RAG 检索技能') &&
        ((await dtxt()) ?? '').includes('元信息'),
    ),
  );
  ok('空间前缀已消失（反证）', !((await dtxt()) ?? '').includes('@smoke-ns'));
  ok('总览 md 渲染', await until(async () => ((await dtxt()) ?? '').includes('模糊前缀匹配')));
  ok(
    '下载按钮（受控）aria-busy',
    await until(
      async () => (await evalJs(`document.querySelector('a[aria-busy]') !== null`)) === true,
    ),
  );
  await shot('3-skill-detail');

  await clickReal(
    `[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('文件'))`,
  );
  await sleep(1500);
  const ftxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok(
    '文件树目录行',
    ((await ftxt()) ?? '').includes('lib/') || ((await ftxt()) ?? '').includes('scripts/'),
  );
  // sha 徽章实存：文件行格式函数产 '…' 截断（≥2 个文件行）
  ok(
    '文件行 sha 徽章（… 截断 ≥2）',
    (await evalJs(`(document.body.innerText.match(/…/g) || []).length`)) >= 2,
  );
  await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('SKILL.md')); if (b) b.click(); return !!b; })()`,
  );
  await sleep(1500);
  ok(
    '预览对话框内容',
    await until(async () => ((await dtxt()) ?? '').includes('LangGraph RAG 检索技能')),
  );
  ok('对话框 role=dialog', (await evalJs(`!!document.querySelector('[role="dialog"]')`)) === true);
  await shot('4-skill-files-dialog');
  await closeDialog();
  await sleep(600);

  // §3 表 9（T25 补）：**嵌套路径文件预览**——目录未展开则先展开 → 点嵌套文件 → 断言路径与内容
  // （此前只覆盖 root 级 SKILL.md；demo 资产 v1.1.0 的嵌套文件 = lib/embedding.ts）
  const hasNestedRow = async () =>
    (await evalJs(
      `[...document.querySelectorAll('button')].some((x) => x.textContent.includes('embedding.ts'))`,
    )) === true;
  if (!(await hasNestedRow())) {
    await evalJs(
      `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith('lib/')); if (b) b.click(); return !!b; })()`,
    );
    await sleep(1200);
  }
  const nestedClicked = await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('embedding.ts')); if (b) { b.click(); return true; } return false; })()`,
  );
  ok('嵌套文件行 embedding.ts 可见可点', nestedClicked === true);
  await sleep(1600);
  ok(
    '嵌套文件预览内容（lib/embedding.ts）',
    await until(async () => {
      const t = (await dtxt()) ?? '';
      return t.includes('export interface Embedding') || t.includes('embed(text');
    }),
  );
  ok(
    '嵌套文件预览路径显示 lib/embedding.ts',
    await until(async () => ((await dtxt()) ?? '').includes('lib/embedding.ts')),
  );
  await shot('4b-skill-nested-preview');
  await closeDialog();
  await sleep(600);

  await clickReal(
    `[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('版本'))`,
  );
  await sleep(2500);
  const vtxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok(
    '版本历史两行',
    ((await vtxt()) ?? '').includes('v1.1.0') && ((await vtxt()) ?? '').includes('v1.0.0'),
  );
  // F220 修（2026-09-24）：真值口径已变更 —— diff 文件行的**类型标记**不再是字面词
  // `MODIFIED/ADDED/DELETED`，而由 `+N −M` **签名**承载（`apps/web/src/components/ui/DiffWorkspace.tsx`：
  // 折叠行 = `▸<path>+N −M` 的 `button`；展开后 = `<section aria-label="<path> +N −M">` 内含真 diff 行）
  // ⇒ 原「找三个字面词」**恒假红**。另：原「+− 行内容」取全页 `document.body.innerText` 搜 `searchByPrefix`，
  // 命中的其实是右侧「**变更历史**」文案（**假命中** —— 同 F219 的「断言取全文而非真源」病灶）
  // ⇒ 现改为**在 diff 区内**取证。
  const signOf = (tx: string) => {
    const m = tx.match(/\+(\d+) −(\d+)$/);
    return m ? ([Number(m[1]), Number(m[2])] as [number, number]) : null;
  };
  const fileRows = JSON.parse(
    (await evalJs(
      `JSON.stringify([...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((x) => /^[▸▾]?[^\\s].*\\+\\d+ −\\d+$/.test(x) && x.length < 60))`,
    )) as string,
  ) as string[];
  const sigs = fileRows.map(signOf).filter((x): x is [number, number] => x !== null);
  ok(
    'diff 三类变更（真值口径 `+N/−M` 签名：修改 = 有增有删 / 新增 = 只增 / 删除 = 只删）',
    fileRows.length >= 2 &&
      sigs.some(([a, d]) => a > 0 && d > 0) &&
      sigs.some(([a, d]) => a > 0 && d === 0) &&
      sigs.some(([a, d]) => a === 0 && d > 0),
    `文件行=${JSON.stringify(fileRows)}`,
  );
  // 真源取证：按**签名**挑「只增」那行（不写死文件名）⇒ 展开后在**该 section 内**找 `searchByPrefix`
  const addRow = fileRows[sigs.findIndex(([a, d]) => a > 0 && d === 0)] ?? '';
  const addPath = addRow
    .replace(/^[^A-Za-z0-9_.\-/]+/, '')
    .replace(/\+\d+ −\d+$/, '')
    .trim();
  const clickRow = () =>
    evalJs(
      `(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === ${JSON.stringify(addRow)}); if (b) b.click(); return !!b; })()`,
    );
  const sectionText = async () =>
    ((await evalJs(
      `(() => { const s = [...document.querySelectorAll('section[aria-label]')].find((x) => (x.getAttribute('aria-label') || '').startsWith(${JSON.stringify(addPath)})); return s ? s.innerText || '' : ''; })()`,
    )) as string) ?? '';
  await clickRow();
  await sleep(1700);
  let diffText = await sectionText();
  if (!diffText) {
    await clickRow();
    await sleep(1700);
    diffText = await sectionText();
  }
  ok(
    'diff +/− 行内容（**diff 区内**取证：`只增` 行展开后含增行 `searchByPrefix` · 排除「变更历史」假命中）',
    diffText.includes('searchByPrefix'),
    `path=${addPath} · 长度=${diffText.length} · 首段=${JSON.stringify(diffText.slice(0, 120))}`,
  );
  await shot('5-skill-versions');

  await nav(`${BASE}/assets/demo-http-mcp`);
  ok(
    'mcp 总览 README',
    await until(async () => ((await dtxt()) ?? '').includes('HTTP Echo MCP Server')),
  );
  await clickReal(
    `[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('版本'))`,
  );
  await sleep(1500);
  ok('mcp 单版本 → 暂无数据', ((await dtxt()) ?? '').includes('暂无数据'));
  await shot('6-mcp-detail');

  // 全态 ④ 语言切换（zh ↔ en）：导航与页头文案切换 + 无 i18n 裸键泄漏（T25 补）
  await nav(`${BASE}/skills`);
  await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'EN'); if (b) b.click(); return !!b; })()`,
  );
  await sleep(1200);
  ok(
    '语言切换 → EN（Skill Center）',
    await until(async () => ((await homeTxt()) ?? '').includes('Skill Center')),
  );
  ok('EN 下无 i18n 裸键泄漏', !/market\.[a-zA-Z]+/.test((await homeTxt()) ?? ''));
  await shot('7-locale-en');
  await evalJs(
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '中文'); if (b) b.click(); return !!b; })()`,
  );
  await sleep(1200);
  ok(
    '语言切换 → 中文（回切）',
    await until(async () => ((await homeTxt()) ?? '').includes('技能中心')),
  );

  // 全态 ⑤ 404：不存在坐标 → ErrorState（含重试），不白屏（T25 补）
  await nav(`${BASE}/assets/__no_such_asset__`);
  ok(
    '404 坐标 → ErrorState（未找到 + 重试）',
    await until(async () => {
      const t = (await dtxt()) ?? '';
      return t.includes('重试') && (t.includes('未找到') || t.includes('not found'));
    }),
  );
  ok('404 页仍渲染应用壳（侧栏在）', ((await dtxt()) ?? '').includes('技能中心'));
  await shot('8-notfound');

  console.log(
    errors.length === 0
      ? `NO JS ERRORS${netLogs.length > 0 ? `（网络层 404 log ${netLogs.length} 条：404 态断言预期触发——非 JS 错误）` : ''}${authNetLogs.length > 0 ? `（网络层 401 log ${authNetLogs.length} 条：未登录 /api/auth/me 会话探测预期触发——非 JS 错误）` : ''}`
      : `CONSOLE ERRORS (${errors.length}):\n${errors.slice(0, 8).join('\n')}`,
  );
  ws.close();
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('DRIVER ERROR', e);
    process.exit(1);
  });
