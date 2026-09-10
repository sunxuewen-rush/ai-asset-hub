// M4a 浏览器 dogfood（可重放——M4a-marketplace T18 收编）
// 前置：dev db + server(:3000) + web dev(:5173) + Edge headless CDP(:9222)：
//   "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --headless=new \
//     --remote-debugging-port=9222 --user-data-dir=/tmp/m4a-edge-profile --disable-gpu --no-first-run about:blank
// 运行（仓库根）：bun docs/smoke/scripts/m4a-dogfood.ts
// 断言：五路由真实数据渲染 + 详情三 tab 交互 + console 零错误；截图写入 docs/smoke/（覆盖同名）。
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (n: string, c: boolean, extra = '') => console.log(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? ' :: ' + extra : ''}`);
const errors: string[] = [];
/** 可参数化（多实例并存时用）：SMOKE_BASE_URL 指向前端 dev 端口；SMOKE_SHOT_PREFIX 给截图加前缀
 *  （避免覆盖历史里程碑的 docs/smoke/*.png 产物）。 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173';
const SHOT_PREFIX = process.env.SMOKE_SHOT_PREFIX ?? '';

async function main() {
  const cwd = process.cwd();
  const target = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws error')); });
  let id = 0;
  const pending = new Map<number, { res: (v: unknown) => void }>();
  const eventWaiters: Array<{ evt: string; res: () => void; timer: ReturnType<typeof setTimeout> }> = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(String(m.data));
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)!.res(msg.result); pending.delete(msg.id); return; }
    if (msg.method === 'Page.loadEventFired') {
      const i = eventWaiters.findIndex((w) => w.evt === 'load');
      if (i >= 0) { clearTimeout(eventWaiters[i]!.timer); eventWaiters.splice(i, 1)[0]!.res(); }
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (msg.params?.exceptionDetails?.text ?? '?'));
    if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') errors.push('log: ' + (msg.params.entry.text ?? '?'));
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      errors.push('console: ' + (msg.params.args ?? []).map((a: { value?: unknown }) => String(a.value ?? '')).join(' '));
    }
  };
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<unknown>((res) => { const myId = ++id; pending.set(myId, { res }); ws.send(JSON.stringify({ id: myId, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  const waitLoad = () => new Promise<void>((res) => {
    const timer = setTimeout(() => { eventWaiters.splice(eventWaiters.findIndex((w) => w.evt === 'load'), 1); res(); }, 8000);
    eventWaiters.push({ evt: 'load', res, timer });
  });
  const evalJs = async (expression: string) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return (r as { result?: { value?: unknown } }).result?.value;
  };
  const shot = async (name: string) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }) as { data: string };
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${cwd}/docs/smoke/${SHOT_PREFIX}${name}.png`, Buffer.from(r.data, 'base64'));
  };
  const nav = async (url: string) => {
    errors.length = 0;
    await send('Page.navigate', { url });
    await waitLoad();
    await sleep(2600);
  };
  // vite 冷编译竞态兜底：断言前轮询
  const until = async (fn: () => Promise<boolean>) => {
    for (let i = 0; i < 7; i++) { if (await fn()) return true; await sleep(900); }
    return false;
  };

  await nav(`${BASE}/skills`);
  await sleep(2000); // 预热

  await nav(`${BASE}/`);
  const homeTxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok('首页 hero', await until(async () => ((await homeTxt()) ?? '').includes('发现和分享AI资源')));
  ok('首页统计 资产总数', await until(async () => /[0-9]/.test(((await homeTxt()) ?? '').split('资产总数')[0]?.slice(-8) ?? '') && ((await homeTxt()) ?? '').includes('最新发布')));
  ok('首页最新发布含 demo 资产', await until(async () => ((await homeTxt()) ?? '').includes('LangGraph RAG 检索技能')));
  const homeLinks = (await evalJs(`[...document.querySelectorAll('a')].map((a) => a.getAttribute('href'))`)) as string[];
  ok('首页入口 href 指向三中心', ['/skills', '/mcps', '/agents'].every((p) => homeLinks.includes(p)));
  await shot('1-home');

  await nav(`${BASE}/skills`);
  ok('中心搜索占位', await until(async () => (await evalJs(`document.querySelector('input[placeholder*="搜索技能"]') !== null`)) === true));
  ok('中心真实数据卡', await until(async () => ((await homeTxt()) ?? '').includes('LangGraph RAG 检索技能')));
  ok('中心计数 共 3 个技能', await until(async () => ((await homeTxt()) ?? '').includes('共 3 个技能')));
  ok('中心排序栏', ((await homeTxt()) ?? '').includes('最近更新'));
  await shot('2-skills');

  await nav(`${BASE}/assets/demo-rag-skill`);
  const dtxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok('详情名/元信息（M4-pre：坐标裸 slug）', await until(async () => ((await dtxt()) ?? '').includes('LangGraph RAG 检索技能') && ((await dtxt()) ?? '').includes('元信息')));
  ok('空间前缀已消失（反证）', !((await dtxt()) ?? '').includes('@smoke-ns'));
  ok('总览 md 渲染', await until(async () => ((await dtxt()) ?? '').includes('模糊前缀匹配')));
  ok('下载按钮（受控）aria-busy', await until(async () => (await evalJs(`document.querySelector('a[aria-busy]') !== null`)) === true));
  await shot('3-skill-detail');

  await evalJs(`[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('文件')).click()`);
  await sleep(1500);
  const ftxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok('文件树目录行', ((await ftxt()) ?? '').includes('lib/') || ((await ftxt()) ?? '').includes('scripts/'));
  // sha 徽章实存：文件行格式函数产 '…' 截断（≥2 个文件行）
  ok('文件行 sha 徽章（… 截断 ≥2）', (await evalJs(`(document.body.innerText.match(/…/g) || []).length`)) >= 2);
  await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('SKILL.md')); if (b) b.click(); return !!b; })()`);
  await sleep(1500);
  ok('预览对话框内容', await until(async () => ((await dtxt()) ?? '').includes('LangGraph RAG 检索技能')));
  ok('对话框 role=dialog', (await evalJs(`!!document.querySelector('[role="dialog"]')`)) === true);
  await shot('4-skill-files-dialog');
  await evalJs(`document.querySelector('button[aria-label="关闭"]').click()`);
  await sleep(600);

  await evalJs(`[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('版本')).click()`);
  await sleep(2500);
  const vtxt = () => evalJs('document.body.innerText') as Promise<string>;
  ok('版本历史两行', ((await vtxt()) ?? '').includes('v1.1.0') && ((await vtxt()) ?? '').includes('v1.0.0'));
  ok('diff 三型徽章', ((await vtxt()) ?? '').includes('MODIFIED') && ((await vtxt()) ?? '').includes('ADDED') && ((await vtxt()) ?? '').includes('DELETED'));
  ok('diff +/− 行内容', ((await vtxt()) ?? '').includes('searchByPrefix'));
  await shot('5-skill-versions');

  await nav(`${BASE}/assets/demo-http-mcp`);
  ok('mcp 总览 README', await until(async () => ((await dtxt()) ?? '').includes('HTTP Echo MCP Server')));
  await evalJs(`[...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('版本')).click()`);
  await sleep(1500);
  ok('mcp 单版本 → 暂无数据', ((await dtxt()) ?? '').includes('暂无数据'));
  await shot('6-mcp-detail');

  console.log(errors.length === 0 ? 'NO CONSOLE ERRORS' : `CONSOLE ERRORS (${errors.length}):\n${errors.slice(0, 8).join('\n')}`);
  ws.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error('DRIVER ERROR', e); process.exit(1); });
