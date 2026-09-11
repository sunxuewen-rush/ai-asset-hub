// M4a 浏览器 dogfood（可重放——M4a-marketplace T18 收编）
// 前置：dev db + server(:3000) + web dev(:5173) + Edge headless CDP(:9222)：
//   "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --headless=new \
//     --remote-debugging-port=9222 --user-data-dir=/tmp/m4a-edge-profile --disable-gpu --no-first-run about:blank
// 运行（仓库根）：bun docs/smoke/scripts/m4a-dogfood.ts
// ⚠ 重跑同一里程碑请加前缀 **`SMOKE_SHOT_PREFIX=<前缀>`**（不加 = 前缀空 → **直接覆盖**历史截图，
//   变量名是 `SMOKE_SHOT_PREFIX`，不是 `SHOT_PREFIX`——2026-09-11 实测踩过）。
// 视口：脚本自带 `Emulation.setDeviceMetricsOverride` 1440×900 桌面（见 main() 注释）。
// 断言：五路由真实数据渲染 + 详情三 tab 交互 + console 零错误；截图写入 docs/smoke/（覆盖同名）。
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (n: string, c: boolean, extra = '') =>
  console.log(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? ' :: ' + extra : ''}`);
const errors: string[] = [];
/** 网络层 404 资源日志（单列；由 404 态断言**预期**触发，不计入 JS 错误——T25 增） */
const netLogs: string[] = [];
/** 可参数化（多实例并存时用）：SMOKE_BASE_URL 指向前端 dev 端口；SMOKE_SHOT_PREFIX 给截图加前缀
 *  （避免覆盖历史里程碑的 docs/smoke/*.png 产物）。 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173';
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
      // 网络层资源加载失败（`Failed to load resource` + 404）**单列**：404 态断言会**预期**触发它；
      // JS 错误 / 其它 log 仍严格计入 errors（T25：否则新增 404 断言会让「console 零错误」假红）
      if (/^Failed to load resource/.test(text) && /404/.test(text)) netLogs.push(text);
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

  await nav(`${BASE}/skills`);
  ok(
    '中心搜索占位',
    await until(
      async () =>
        (await evalJs(`document.querySelector('input[placeholder*="搜索技能"]') !== null`)) ===
        true,
    ),
  );
  ok(
    '中心真实数据卡',
    await until(async () => ((await homeTxt()) ?? '').includes('LangGraph RAG 检索技能')),
  );
  ok(
    '中心计数 共 3 个技能',
    await until(async () => ((await homeTxt()) ?? '').includes('共 3 个技能')),
  );
  ok('中心排序栏', ((await homeTxt()) ?? '').includes('最近更新'));
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
  ok(
    '资产数 < limit ⇒ 无分页控件（正当缺席）',
    (await evalJs(
      `document.querySelector('[role="navigation"][aria-label*="分页"], nav[aria-label*="分页"]') === null`,
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

  await evalJs(
    `[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('文件')).click()`,
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
  await evalJs(`document.querySelector('button[aria-label="关闭"]').click()`);
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
  await evalJs(`document.querySelector('button[aria-label="关闭"]').click()`);
  await sleep(600);

  await evalJs(
    `[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('版本')).click()`,
  );
  await sleep(2500);
  const vtxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok(
    '版本历史两行',
    ((await vtxt()) ?? '').includes('v1.1.0') && ((await vtxt()) ?? '').includes('v1.0.0'),
  );
  ok(
    'diff 三型徽章',
    ((await vtxt()) ?? '').includes('MODIFIED') &&
      ((await vtxt()) ?? '').includes('ADDED') &&
      ((await vtxt()) ?? '').includes('DELETED'),
  );
  ok('diff +/− 行内容', ((await vtxt()) ?? '').includes('searchByPrefix'));
  await shot('5-skill-versions');

  await nav(`${BASE}/assets/demo-http-mcp`);
  ok(
    'mcp 总览 README',
    await until(async () => ((await dtxt()) ?? '').includes('HTTP Echo MCP Server')),
  );
  await evalJs(
    `[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('版本')).click()`,
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
      ? `NO JS ERRORS${netLogs.length > 0 ? `（网络层 404 log ${netLogs.length} 条：404 态断言预期触发——非 JS 错误）` : ''}`
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
