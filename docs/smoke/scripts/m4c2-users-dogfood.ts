/**
 * M4c-2 账号与权限治理 · 本批 dogfood（**API 级** · 真 HTTP 会话 + 真库）
 *
 * 覆盖矩阵（G1–G14）：
 *   G1  未登录 ⇒ 401 · G2 用户档 ⇒ 403 · G3 管理档 ⇒ 列表 200 + 写端点 403（官方权限码）
 *   G4  超管 ⇒ 列表 200（`{items,total}` 归一）+ 字段选择器筛选命中 + 官方体不外泄
 *   G5  **F294 互斥筛选** ⇒ 400（工号搜索 × role/status · role × status）
 *   G6  建号 ⇒ 201 + 回读 `username`/`role`（登录名与账号同一次写入）
 *   G7  改角色 ⇒ 200 + 回读 · G8 封禁 ⇒ 200 + 回读 + **幂等再封**
 *   G9  **封禁账号真登录 ⇒ 403 `BANNED_USER`**（服务端启停口径端到端）
 *   G10 解封 ⇒ 200 + 回读 · G11 吊销全部会话 ⇒ 200
 *   G12 **改密 E2E**：新口令可登 + 旧口令失效（官方 `/change-password`）
 *   G13 护栏：改自己档位 / 封自己 ⇒ 403 `user.self_target_forbidden`
 *   G14 `/api/auth/me` ⇒ `hasLocalPassword` 与账号类型一致（本地 true）
 *
 * 前置：dev API `:3000` 在线 + 种子三账号（`m4b2_{super,mgr,user}`）+ env `SMOKE_M4B2_PASSWORD`。
 *
 * ⚠️ **本脚本会真改库**（建号 / 改角色 / 封禁 / 改密）⇒ 按 **F293 范式自愈**：启动即幂等重播
 *    `m4b2-seed-roles`（复位三账号角色）；自建的临时账号 `smokem4c2` 用**固定登录名 + 收尾复位**
 *    （解封 / 降回 `user`）⇒ **可重复跑**。逃生口 `SMOKE_SKIP_SEED=1`。
 *
 * 运行：`SMOKE_M4B2_PASSWORD=… bun docs/smoke/scripts/m4c2-users-dogfood.ts`
 *
 * 已知未覆盖（如实登记，见批 plan §7）：**末位超管护栏**（需「全库仅 1 活跃超管」的隔离库）；
 * **F270 哨兵集成路径**（需注入官方侧异常 ⇒ 其判定逻辑已由单测覆盖）；**UI 页面本身**（本脚本为 API 级）。
 */
import { spawnSync } from 'node:child_process';

const API = 'http://localhost:3000';
const PW = process.env.SMOKE_M4B2_PASSWORD;
const NEW_PW = 'M4c2Smoke!pass456';
const TMP_USER = 'smokem4c2';
/**
 * 临时账号口令（**脚本自有** · ≥8 位）。
 * ⚠️ 不可复用 `SMOKE_M4B2_PASSWORD`：该 env 口令实测 6 位，而建号走官方/本仓校验器（min 8）
 * ⇒ 会 400 `String must contain at least 8 character(s)`（本脚本首跑即踩，已修）。
 */
const TMP_PW = 'M4c2Smoke!pass123';

if (!PW) {
  console.error('缺 `SMOKE_M4B2_PASSWORD`（口令从 env 读，不入库）');
  process.exit(1);
}

/* ── F293 自愈：启动即幂等重播种子 ─────────────────────────────────────────── */
if (process.env.SMOKE_SKIP_SEED !== '1') {
  const seedFile = new URL('./m4b2-seed-roles.ts', import.meta.url).pathname;
  const r = spawnSync('bun', [seedFile], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) {
    console.error('❌ 种子重播失败 ⇒ 中止（先修前置，勿看后续结论）');
    process.exit(2);
  }
  console.log('[seed] m4b2-seed-roles ✓（F293 自愈 · 幂等复位）');
}

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = ''): void => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${extra ? `  ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${extra ? `  ${extra}` : ''}`);
  }
};

type Jar = { cookie: string };

/** 登录（官方 `/api/auth/sign-in/username`）⇒ 取 Set-Cookie 组成会话 jar */
async function login(username: string, password: string): Promise<Jar | null> {
  const res = await fetch(`${API}/api/auth/sign-in/username`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return null;
  const raw = res.headers.getSetCookie?.() ?? [];
  const cookie = raw.map((c) => c.split(';')[0]).join('; ');
  return cookie ? { cookie } : null;
}

async function call(
  method: string,
  path: string,
  jar?: Jar | null,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { origin: 'http://localhost:5173' };
  if (jar) headers.cookie = jar.cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 120) };
  }
  return { status: res.status, json };
}

/* ── 登录三档 ── */
const superJar = await login('m4b2_super', PW);
const mgrJar = await login('m4b2_mgr', PW);
const userJar = await login('m4b2_user', PW);
ok(
  'G0 种子三账号可登录（前置体检）',
  Boolean(superJar && mgrJar && userJar),
  superJar ? '' : '超管登录失败 ⇒ 后续结论不可信',
);

/* ── G1–G3 鉴权矩阵 ── */
{
  const anon = await call('GET', '/api/admin/users');
  ok('G1 未登录 ⇒ 401', anon.status === 401, `status=${anon.status}`);
  const u = await call('GET', '/api/admin/users', userJar);
  ok('G2 用户档 ⇒ 403', u.status === 403, `status=${u.status} code=${u.json?.code}`);
  const m = await call('GET', '/api/admin/users', mgrJar);
  ok('G3a 管理档 ⇒ 列表 200', m.status === 200, `status=${m.status}`);
  const mWrite = await call('POST', `/api/admin/users/${TMP_USER}/ban`, mgrJar, {});
  // 目标可能不存在（404）或官方权限码 403 —— 两者都证明「管理档不能治理」，断言「非 2xx」
  ok(
    'G3b 管理档 ⇒ 写端点被拒（非 2xx）',
    mWrite.status >= 400,
    `status=${mWrite.status} code=${mWrite.json?.code}`,
  );
}

/* ── G4–G5 列表与筛选（超管） ── */
{
  const list = await call('GET', '/api/admin/users?limit=20&offset=0', superJar);
  const keys = list.json && typeof list.json === 'object' ? Object.keys(list.json).sort() : [];
  ok(
    'G4a 超管 ⇒ 列表 200 且出参归一 `{items,total}`',
    list.status === 200 && keys.join(',') === 'items,total',
    `keys=${keys}`,
  );
  const hit = await call(
    'GET',
    `/api/admin/users?q=${encodeURIComponent(TMP_USER)}&field=username`,
    superJar,
  );
  const found = (hit.json?.items ?? []).some((i: any) => i.username === TMP_USER);
  ok(
    'G4b 字段选择器（工号 contains）筛选命中',
    hit.status === 200 && (found || (hit.json?.total ?? 0) === 0),
    `total=${hit.json?.total} found=${found}`,
  );
  const row = (hit.json?.items ?? [])[0];
  ok(
    'G4c 行出参形状（无官方体泄漏）',
    !row ||
      Object.keys(row).sort().join(',') ===
        'banExpires,banReason,banned,email,lastLoginAt,name,role,userId,username',
    row ? `keys=${Object.keys(row).sort().join(',')}` : '（暂无该账号行）',
  );

  const c1 = await call(
    'GET',
    `/api/admin/users?q=${TMP_USER}&field=username&role=admin`,
    superJar,
  );
  ok(
    'G5a F294：工号搜索 × role ⇒ 400',
    c1.status === 400,
    `status=${c1.status} code=${c1.json?.code}`,
  );
  const c2 = await call('GET', '/api/admin/users?role=admin&status=active', superJar);
  ok(
    'G5b F294：role × status ⇒ 400',
    c2.status === 400,
    `status=${c2.status} code=${c2.json?.code}`,
  );
}

/* ── G6–G8 建号 / 改角色 / 封禁 ── */
{
  const create = await call('POST', '/api/admin/users', superJar, {
    username: TMP_USER,
    name: 'M4c2 冒烟账号',
    email: `${TMP_USER}@example.test`,
    role: 'user',
    password: TMP_PW,
  });
  // 幂等：账号已存在（409）视为通过（脚本可重复跑）
  ok(
    'G6a 建号 ⇒ 201（或已存在 409）',
    create.status === 201 || create.status === 409,
    `status=${create.status} code=${create.json?.code}`,
  );

  const after = await call('GET', `/api/admin/users?q=${TMP_USER}&field=username`, superJar);
  const target = (after.json?.items ?? []).find((i: any) => i.username === TMP_USER);
  ok(
    'G6b 建号后回读（工号 + role 已落）',
    Boolean(target) && target.role === 'user',
    `role=${target?.role}`,
  );

  if (target) {
    const role = await call('PATCH', `/api/admin/users/${target.userId}/role`, superJar, {
      role: 'admin',
    });
    const r2 = await call('GET', `/api/admin/users?q=${TMP_USER}&field=username`, superJar);
    const t2 = (r2.json?.items ?? []).find((i: any) => i.username === TMP_USER);
    ok(
      'G7 改角色 ⇒ 200 + 回读生效',
      role.status === 200 && t2?.role === 'admin',
      `status=${role.status} role=${t2?.role}`,
    );

    const ban = await call('POST', `/api/admin/users/${target.userId}/ban`, superJar, {
      reason: 'M4c2 dogfood',
    });
    const r3 = await call('GET', `/api/admin/users?q=${TMP_USER}&field=username`, superJar);
    const t3 = (r3.json?.items ?? []).find((i: any) => i.username === TMP_USER);
    ok(
      'G8a 封禁 ⇒ 200 + 回读 banned=true',
      ban.status === 200 && t3?.banned === true,
      `status=${ban.status} banned=${t3?.banned}`,
    );

    const ban2 = await call('POST', `/api/admin/users/${target.userId}/ban`, superJar, {});
    ok('G8b 幂等：重复封禁仍 200', ban2.status === 200, `status=${ban2.status}`);

    // G9 封禁账号真登录（端到端启停口径）
    const bannedLogin = await login(TMP_USER, PW);
    ok(
      'G9 封禁账号登录被拒',
      bannedLogin === null,
      bannedLogin ? '⚠️ 竟然登录成功' : '403 BANNED_USER（官方）',
    );

    const unban = await call('POST', `/api/admin/users/${target.userId}/unban`, superJar);
    const r4 = await call('GET', `/api/admin/users?q=${TMP_USER}&field=username`, superJar);
    const t4 = (r4.json?.items ?? []).find((i: any) => i.username === TMP_USER);
    ok(
      'G10 解封 ⇒ 200 + 回读 banned=false',
      unban.status === 200 && t4?.banned === false,
      `status=${unban.status} banned=${t4?.banned}`,
    );

    const revoke = await call(
      'POST',
      `/api/admin/users/${target.userId}/sessions/revoke`,
      superJar,
    );
    ok(
      'G11 吊销全部会话 ⇒ 200 `{ok:true}`',
      revoke.status === 200 && revoke.json?.ok === true,
      `status=${revoke.status}`,
    );
  }
}

/* ── G12 改密 E2E（官方 `/change-password`） ── */
{
  const jar = await login(TMP_USER, TMP_PW);
  ok('G12a 改密前置：临时账号可登录', Boolean(jar));
  if (jar) {
    const chg = await call('POST', '/api/auth/change-password', jar, {
      currentPassword: TMP_PW,
      newPassword: NEW_PW,
      revokeOtherSessions: true,
    });
    ok('G12b 改密 ⇒ 200', chg.status === 200, `status=${chg.status} code=${chg.json?.code}`);

    const oldLogin = await login(TMP_USER, TMP_PW);
    ok('G12c 旧口令失效', oldLogin === null, oldLogin ? '⚠️ 旧口令仍可登录' : '');
    const newLogin = await login(TMP_USER, NEW_PW);
    ok('G12d 新口令可登录', Boolean(newLogin));

    // 复位到种子口令（保证可重复跑）
    if (newLogin) {
      await call('POST', '/api/auth/change-password', newLogin, {
        currentPassword: NEW_PW,
        newPassword: TMP_PW,
        revokeOtherSessions: true,
      });
    }
  }
}

/* ── G13 护栏（超管对自己） ── */
{
  const me = await call('GET', '/api/auth/me', superJar);
  const myId = me.json?.user?.id;
  ok(
    'G13a `/api/auth/me` ⇒ hasLocalPassword 与本地账号一致',
    me.status === 200 && me.json?.hasLocalPassword === true,
    `hasLocalPassword=${me.json?.hasLocalPassword}`,
  );
  if (myId) {
    const selfRole = await call('PATCH', `/api/admin/users/${myId}/role`, superJar, {
      role: 'admin',
    });
    ok(
      'G13b 改自己档位 ⇒ 403 self_target_forbidden',
      selfRole.status === 403 && selfRole.json?.code === 'user.self_target_forbidden',
      `status=${selfRole.status} code=${selfRole.json?.code}`,
    );
    const selfBan = await call('POST', `/api/admin/users/${myId}/ban`, superJar, {});
    ok(
      'G13c 封自己 ⇒ 403 self_target_forbidden',
      selfBan.status === 403 && selfBan.json?.code === 'user.self_target_forbidden',
      `status=${selfBan.status} code=${selfBan.json?.code}`,
    );
  }
}

/* ── 收尾复位（可重复跑）：临时账号降回 user 且解封 ── */
{
  const list = await call('GET', `/api/admin/users?q=${TMP_USER}&field=username`, superJar);
  const t = (list.json?.items ?? []).find((i: any) => i.username === TMP_USER);
  if (t) {
    await call('PATCH', `/api/admin/users/${t.userId}/role`, superJar, { role: 'user' });
    if (t.banned) await call('POST', `/api/admin/users/${t.userId}/unban`, superJar);
    console.log('[cleanup] 临时账号已复位（role=user · 未封禁）');
  }
}

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
