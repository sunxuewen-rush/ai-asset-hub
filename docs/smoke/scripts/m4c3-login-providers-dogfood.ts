/**
 * M4c-3 外部身份源接入 · dogfood（L6 · 批 design §6 L6 · 2026-10-12 落地）
 *
 * 覆盖设计 §6 L6 两条 + 三条加固（**默认全关态**；开态亦可跑，见 G3/G5 的自适应口径）：
 *   G1 只读启用集端点：匿名可达 + 出参形状 `{ providers: string[] }`（**幂等**：连调两次同值）
 *   G2 安全硬线：出参**不回显密钥类项**（`clientSecret` / `secret` / `tenantId` / `clientId` 零命中）
 *   G3 登录页入口渲染：**链接行项数 = 服务端启用集项数**（关态 ⇒ 0 项 ⇒ **整行不渲染**）
 *   G4 退役面清零：无「或」分隔线（`[data-slot=field-separator]` 0）· 无旧备用面板/旧 OAuth 链接
 *   G5 误配降级：调**未装配** provider ⇒ **404 `PROVIDER_NOT_FOUND`**（全 4 通道启用时显式 SKIP，不假绿）
 *   G6 页面健康：表单两输入在 DOM（防「骨架卡死」把 G3 读成假 PASS）
 *   G7 全程 `NO JS ERRORS`（**硬门**）
 *
 * 前置：dev 在线（`:3000` API / `:5173` web）+ CDP（`SMOKE_CDP` 注入；缺省 `:9222`）。
 * **无需口令**（本脚本全程匿名：登录页 + 公开端点）。
 *
 * 运行：`bun docs/smoke/scripts/m4c3-login-providers-dogfood.ts`
 *      （全量收敛：`bun docs/smoke/scripts/dogfood-all.ts` —— 已登记 `SCRIPT_NAMES` 末位）
 */

const DBG = process.env.SMOKE_CDP ?? 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';
const API = 'http://localhost:3000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 官方四通道键名（与 `apps/server/src/auth/better-auth.ts` 的 `EXTERNAL_PROVIDER_IDS` 同值） */
const OFFICIAL_IDS = ['microsoft', 'google', 'github', 'wechat'] as const;

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

/* ── CDP 基础设施（同 `m4b2-auth-dogfood.ts` · F296：一律**自建标签**，不找现成标签） ── */
const target = (await (await fetch(`${DBG}/json/new?${APP}/login`, { method: 'PUT' })).json()) as {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};
if (!target?.webSocketDebuggerUrl) throw new Error('无法新建浏览器 tab（Edge CDP）');
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

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
/** 桌面视口（headless 默认 <768px ⇒ 布局退化，实测口径会变） */
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

console.log('=== M4c-3 登录页 provider 入口 dogfood（L6 · 默认全关态）===\n');

/* ─────────────── G1 / G2 只读启用集端点（匿名 · 形状 · 泄露面） ─────────────── */
const r1 = await fetch(`${API}/api/meta/auth-providers`);
const raw1 = await r1.text();
const r2 = await fetch(`${API}/api/meta/auth-providers`);
const raw2 = await r2.text();
let body: { providers?: unknown } = {};
try {
  body = JSON.parse(raw1) as { providers?: unknown };
} catch {
  /* 非 JSON ⇒ 下面的断言会翻红 */
}
const providers = Array.isArray(body.providers) ? (body.providers as string[]) : null;
ok(
  'G1 匿名可达 + 出参形状 { providers: string[] } + 幂等（两次同值）',
  r1.status === 200 && providers !== null && raw1 === raw2,
  `status=${r1.status} providers=${JSON.stringify(providers)} 幂等=${raw1 === raw2}`,
);
ok(
  'G2 不回显密钥类项（clientSecret / secret / tenantId / clientId 零命中）',
  !/clientSe?cret|secret|tenantId|clientId/i.test(raw1),
  `len=${raw1.length}`,
);
const enabledCount = providers?.length ?? -1;
console.log(`  （当前启用集：${enabledCount} 项 ${JSON.stringify(providers ?? [])}）`);

/* ─────────────── G3 / G4 / G6 登录页渲染（真页） ─────────────── */
await sleep(1200);
const ui = (await evalJs(`(() => {
  const LABELS = ['Microsoft 账号', 'Microsoft account', 'Google', 'GitHub', '微信', 'WeChat'];
  const links = [...document.querySelectorAll('button')].filter((b) => LABELS.includes(b.innerText.trim()));
  return {
    links: links.length,
    sep: document.querySelectorAll('[data-slot="field-separator"]').length,
    legacyPanel: document.body.innerText.includes('打开统一认证页') || document.body.innerText.includes('返回密码登录'),
    legacyOauth: document.body.innerText.includes('使用 OAuth 登录'),
    username: !!document.querySelector('#login-username'),
    password: !!document.querySelector('#login-password'),
    path: location.pathname,
  };
})()`)) as any;
const uiOk = ui && ui.path === '/login' && ui.username;
ok(
  'G6 登录页表单健康（`#login-username` / `#login-password` 在 DOM ⇒ 非骨架卡死）',
  !!uiOk && ui.password,
  `path=${ui?.path} user=${ui?.username} pwd=${ui?.password}`,
);
ok(
  'G3 provider 链接行项数 = 服务端启用集项数（关态 0 项 ⇒ 整行不渲染）',
  ui?.links === enabledCount,
  `links=${ui?.links} enabled=${enabledCount}`,
);
ok(
  'G4 退役面清零：无「或」分隔线 + 无旧备用面板 + 无旧 OAuth 链接',
  ui?.sep === 0 && !ui?.legacyPanel && !ui?.legacyOauth,
  `fieldSeparator=${ui?.sep} panel=${ui?.legacyPanel} oauth=${ui?.legacyOauth}`,
);

/* ─────────────── G5 误配降级（未装配 provider ⇒ 404） ─────────────── */
const missing = OFFICIAL_IDS.find((id) => !(providers ?? []).includes(id));
if (missing) {
  const res = await fetch(`${API}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: missing, callbackURL: `${APP}/` }),
  });
  const txt = await res.text();
  ok(
    `G5 未装配 provider（${missing}）⇒ 404 + code PROVIDER_NOT_FOUND`,
    res.status === 404 && txt.includes('PROVIDER_NOT_FOUND'),
    `status=${res.status} body=${txt.slice(0, 120)}`,
  );
} else {
  console.log('SKIP G5 四通道**全部启用** ⇒ 无「未装配 provider」可测（不假绿 · 关态下必跑）');
}

/* ─────────────── 汇总（NO JS ERRORS 硬门） ─────────────── */
console.log('');
if (jsErrors.length === 0) {
  console.log('NO JS ERRORS');
} else {
  console.log(`CONSOLE ERRORS（${jsErrors.length}）:`);
  for (const e of jsErrors.slice(0, 10)) console.log(`  - ${e}`);
}
console.log(`\nM4C-3 LOGIN PROVIDERS DOGFOOD: ${pass} PASS / ${fail} FAIL`);
ws.close();
process.exit(fail === 0 && jsErrors.length === 0 ? 0 : 1);
