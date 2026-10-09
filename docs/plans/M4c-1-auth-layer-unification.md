# M4c-1 认证层统一到官方：官方 SDK 三层 + 目录口令官方 verify 分支 + 建号钩子 —— 批计划

> Date: 2026-10-08
> Updated: 2026-10-08（**v0.5：官方安装页对账轮（install 1–5 + D1–D3）** —— 读完官文 `/docs/installation` 逐条对账后补齐 7 项：① **依赖安装形态**（命令 `cd apps/web && bun add better-auth@1.7.5`（exact）· **`bun.lock` 同批提交**（CI `--frozen-lockfile`）· 无 `postinstall` ⇒ 不动 `bunfig.toml`）② **客户端入口改官方 React 入口 `better-auth/react`**（官文点名；`useSession` 为 React hook + `useStore`；原写 vanilla `better-auth/client`）③ **依赖类断言 ⑥**（`apps/web` 可解析 + `bun.lock` 单一 1.7.5 条目）④ 风险 7 补「锁文件未同批 ⇒ CI FAIL」⑤ T8 增**依赖登记复核**（`THIRD-PARTY-NOTICES.md`）⑥ T4 依据补「**零 schema 变更 ⇒ 不跑官方 CLI** `generate`/`migrate`，沿用 `0007`/`0009` 手写先例」⑦ §1 补**认证配置口径**（本仓不设 `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`，走显式选项）⇒ 连带 批 design **v0.8** · 主 design **v0.13** · `docs/00` **v1.122**）
> Updated: 2026-10-08（**v0.4：R4 承接补齐（复核轮命中）** —— ① **T5 依据行补 B10** · ② **T5 断言新增 ⑤**：零新页面 / 登录页视觉不动（`apps/web/src/pages/` **零新增文件** · `pages/Login.tsx` **本批零改动**（`git diff --name-only` 断言）· 视觉基线引 M4a §4.4 不动）③ §8 自报 **9.31** 由此**成立**（v0.3 报 9.31 时 B10 无承接 ⇒ 实测仅 9.29，本轮补齐）④ 连带：批 design **v0.7**（§10 补承接指针）· 主 design **v0.12** · `docs/00` **v1.121**）
> Updated: 2026-10-08（**v0.3：第二轮抽查修复（换靶 10 类 · 命中 R1–R3）** —— ① **R1** 头部三处**去硬版本引用**（Status / 上游两行改「版本以各件版本头为准」；原写 批 design v0.4 · 主 design v0.8，实体已 v0.5 / v0.10）② **R2** 批 design §8/§9 已写而 plan 无承接的 **3 条**并入 **T7**：**防枚举**（断言 ② 正反对照）· **口令流转**（断言 ③ 零泄漏）· **`REGISTRATION_ENABLED` 默认关闭**（新步骤 4 + 断言 ④）③ **R3** §4 合并「`lint` + `biome check`」措辞（同物，实测 `lint` = `biome check src`）④ §8 自检 **9.09 → 9.31**（两轮抽查修复后）⑤ 连带：批 design **v0.6**（§8/§9 补承接指针）· 主 design **v0.11** · `docs/00` **v1.120**）
> **头部口径（本件起）**：只留最近 1-2 版 · 不复述历史与验收数字；更早版本见 §9 修订记录。
> Status: ⏳ **待开工**（批 design **定稿** · 8 维 **9.50** · B1–B10 全部确认 —— **版本号以各件版本头为准**（防二次漂移，沿用 `docs/00` v1.26 先例））· **本批零提交** —— 实现期一事一提交、**逐文件 `git add`**、push 待用户口令
> 上游：批 design `docs/designs/2026-10-08-m4c1-auth-layer-unification-design.md`（**定稿 · 8 维 9.50** · B1–B10 —— 版本以其版本头为准）
> · 主 design `docs/designs/2026-10-08-m4c-account-and-access-governance-design.md`（§2.3 批件登记 · §15 等价判据 —— 版本以其版本头为准）
> · 视觉真值 SSOT `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（**本批零视觉改动**，仅引用）
> · `docs/00-product-direction.md` §5 **M4c-1 子行**（状态唯一源）
> **前置：无**（M4c-1 = M4c 首批 / 认证底座）；开工硬前置 = **重启 dev 两服务**（现进程启动时间早于末次提交）

---

## 1. 目标与非目标

**目标**（本批 = 认证层统一到官方，**零新页面 / 零视觉改动**；服务端 3 组改动 + 1 次迁移 + 前端三层改造）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | **身份源共享模块** `apps/server/src/auth/identity.ts` | 自 `plugins/ldap-credentials.ts:166` 的 `ensureDirectoryUser` 抽取/扩展；承载身份复用与漂移同步 / 邮箱归一（目录通道）/ 显示名与默认档 / 链接策略（本批只承载）/ 审计（沿用既有 `auth.login.*` 动作） |
| 2 | **官方 `password.verify` 分支** | 替换 `emailAndPassword.password.verify`：`ldap:` 前缀 ⇒ 目录 bind；其他 ⇒ 委托官方 `better-auth/crypto` 的 `verifyPassword`（**不出现第二套口令加密**）；**时序侧信道等价处理随迁**（`plugins/ldap-credentials.ts:393`） |
| 3 | **不短路建号钩子** | `sign-in/username` 的 `hooks.before`：登录名无对应用户 ⇒ 目录 bind 成功 ⇒ 经共享模块建号 + 补凭据委派行；**不返回响应**（保住官方 Origin / CSRF 中间件） |
| 4 | **迁移 `0015`**（两条幂等 SQL） | ① `credential` 行 `account_id` 工号 → `user.id` ② 既有目录账号补齐凭据委派行（只补缺）；**执行窗口 = 停服**；验收探针 P1–P3 |
| 5 | **前端官方 SDK 三层** | 调用层（官方 **React 入口 `better-auth/react`**）· 会话层（SDK `useSession` 替换 `AuthProvider` 内部实现，**保留三态契约**）· 交互层（401 四分类经 SDK `fetchOptions` 注入）；**两处适配**：档位（官方文本 → 1/10/100 单点）· 字段（官方 `user.name` → `displayName`） |
| 6 | **退役 `signInAih`** | 前端调用点（`apps/web/src/api/auth.ts:47`）切官方 SDK ⇒ **归零**；后端下线 `POST /api/auth/sign-in/aih`（本地 + 目录两分支） |
| 7 | **错误码收敛 + 自助注册默认关闭 + i18n + 规范回填** | 删 7 自绘码（`user_pending` / `user_disabled` / `invalid_credentials` / `ldap_denied` / `email_conflict` / `oidc_state_mismatch` / `oidc_denied`）· 留 5（`email_missing` / `rate_limited` / `csrf_failed` / `session_expired` / `forbidden`）· 登录失败统一码 + 已封禁明确提示 · **`REGISTRATION_ENABLED` 默认 `true`→`false`**（`env.ts:35` · `better-auth.ts:80`）· **防枚举 / 口令流转断言** · 规范回填 `05` §3.1 / `08` §5 / `07` §4 |
| 8 | **验证与收尾** | 7 个 `*-dogfood.ts` 全绿 · 等价判据三层 · 门禁 12 步 · F 号登记同步 · 证据归档 |

**非目标**（不属本批，归属已定）：
- 用户管理页 / 启停 / 权限码扩 `session:['revoke']` / `user.status` 列退休 → **M4c-2**
- 本地账号**自助改密**（主 design R21）→ **M4c-2**
- 社交 provider（Google / GitHub / WeChat）· 官方内置 Entra ID provider 替自绘 OIDC（`oidc-routes.ts`）· 登录页 provider 入口 → **M4c-3**
- 管理员重置密码 → **不做**（主 design D2）

**新增依赖：1 个** —— **`better-auth@1.7.5`（MIT · 加在 `apps/web`）**：D8「前端三层全用官方 SDK」的内在要求；与 `apps/server` **同版本**，`exports["./react"]` → `dist/client/react/index.mjs`（实测存在；`./client` 亦在但为 vanilla 入口，无 React 集成）。**`apps/web` 将是本仓首个 `better-auth/react` 消费方**（`grep` 零先例）。
**零新设计件** · 新增代码件 **1**（`auth/identity.ts`）+ 改造件 **9**（**主 design §2.7** 件清单）。
**认证配置口径（既有事实 · 防按官文误设）**：本仓**不设**官文默认变量 `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`，走**显式选项** —— `secret: env.SESSION_SECRET`（≥32 校验）· `baseURL: env.PUBLIC_BASE_URL`（`apps/server/src/auth/better-auth.ts:73-74`）；前端与 API **dev 同源**（vite proxy `/api` → `localhost:3000` + `changeOrigin: true`）⇒ 官文「同域可省 `baseURL`」适用，`Origin` 仍为 5173 ⇒ `trustedOrigins` 须含 `http://localhost:5173`。

> **登记缺口**：OIDC 通道的自绘实现本批**不动**（`http/oidc-routes.ts` 归 M4c-3）⇒ 本批 `password.verify` 分支只覆盖「本地 + 目录」两条口令通道。

---

## 2. Task 总览

**执行序 = 后端能力（共享模块 → verify 分支 → 建号钩子）→ 迁移 → 前端 SDK 三层 → 退役端点 → 错误码/i18n → 验证 → 门禁与收尾。**
（顺序即安全窗：**前端切换必须发生在「后端两条口令通道都能走通」之后**）

| # | 归属 | 主题 | 前置 | 出口 |
|---|------|------|------|------|
| **T1** | server | 身份源共享模块 `auth/identity.ts` 抽取/扩展 | — | `typecheck` + 本包测试绿 · 调用方（LDAP / OIDC 通道）行为不变 |
| **T2** | server | 官方 **`verify` 分支**（`ldap:` 分派 + 官方 `verifyPassword` 委托 + **时序侧信道随迁**） | T1 | `ldap:` ⇒ bind · 官方哈希 ⇒ 官方 verify · 假哈希等价耗时不退化 |
| **T3** | server | **不短路建号钩子**（`sign-in/username` 的 `hooks.before`） | T2 | 无用户 ⇒ 建号 + **续走官方流程**（不短路）；有用户 ⇒ 零介入；bind 失败 ⇒ 零副作用 |
| **T4** | server | **迁移 `0015`** + **P1–P3 探针** + 停服窗口口径 | T3 | 迁移 exit 0 · P1/P2 通过 · P3 连跑两次第二次零插入 · **执行需授权** |
| **T5** | web | **官方 SDK 三层** + 两处适配（含新增依赖） | T4 | 登录 / 登出 / 三态 / 401 四分类**行为等价**（既有断言全绿）· 调用点 **21 处**（10 文件）零改签名 |
| **T6** | web + server | **退役 `signInAih`**：前端归零 → 后端下线 | T5 | `grep 'sign-in/aih' apps/web/src` = **0** · 端点 404 · 设备流 / CLI 零回归 |
| **T7** | server + web | **错误码收敛**（删 7 留 5）+ i18n 删键 + 统一码 + 已封禁提示 | T6 | 双语双向差集 0 · 错误码集合实测 = 5 · 已封禁提示可见 · **防枚举（不存在 / 口令错同码）** · **口令流转零泄漏** · **自助注册默认关闭（实测 `false`）** |
| **T8** | script / 验证 / 文档 | 7 dogfood 全绿 + 等价判据三层 + **门禁 12 步** + 规范回填 + F 号同步 + 证据归档 | T7 | 12 步 exit 0 · 7 脚本 0 FAIL · F 号登记 + `docs/README.md` §6.1 同步 |

---

## 3. Task 明细（每 Task 三段齐全）

### T1 · server：身份源共享模块

> 依据 = 批 design **§5.4** · **B7** · 主 design §3.4。前置 = 无。

1. 新建 `apps/server/src/auth/identity.ts`：自 `apps/server/src/auth/plugins/ldap-credentials.ts:166` 的 `ensureDirectoryUser` 抽取并扩展为「跨通道共享规则」（身份复用与漂移同步 / 邮箱归一与必填（目录通道）/ 显示名与默认档 / **链接策略占位**（本批只承载，M4c-3 接线）/ 审计）。
2. 原调用方（LDAP 通道 `:355` · OIDC 通道 `:407`）改为调用新模块，**行为零变化**。

**断言 / 门禁**：① 调用方行为不变（既有测试绿）② `typecheck` + `biome check` 绿 ③ 模块内**不含任何自绘 HTTP 端点**（纯规则函数，`grep` 断言）。

### T2 · server：官方 `password.verify` 分支

> 依据 = 批 design **§5.2** · **B6** · 主 design §3.2 / §6.1。前置 = T1。

1. 以本仓函数替换官方 `emailAndPassword.password.verify`（装配点 `apps/server/src/auth/better-auth.ts`）：`ldap:` ⇒ 解析工号 ⇒ 本仓目录 `bind`（`apps/server/src/auth/ldap.ts`）⇒ 布尔；其他 ⇒ **官方** `better-auth/crypto` 的 `verifyPassword`。
2. **时序侧信道**：目录账号路径执行一次固定假哈希校验（现 `plugins/ldap-credentials.ts:393` 的 `DUMMY_PASSWORD_HASH`），抹平「账号不存在 / 密码错 / 目录账号」耗时差。

**断言 / 门禁**：① `ldap:` ⇒ 走目录 bind（路径可断言）② 官方 scrypt 哈希 ⇒ 委托官方 verify（**无第二套口令加密**）③ 假哈希常量仍存在且被调用（`grep`）④ `typecheck` + `biome` 绿。

### T3 · server：不短路建号钩子

> 依据 = 批 design **§5.3** · **B4** · 主 design §3.3；事实依据 **F275**（官方 before 钩子在端点中间件之前）。前置 = T2。

1. 挂 `sign-in/username` 的 **before 钩子**：登录名无对应用户 ⇒ 目录 `bind` ⇒ 成功则经 T1 模块建号 + 补凭据委派行（`providerId='credential'` · `account_id = user.id` · `password = 'ldap:<工号>'`）。
2. **不返回响应**（不短路）⇒ 官方端点中间件（Origin / CSRF）照常执行；bind 失败 ⇒ 不建号、不返回 ⇒ 由官方端点给统一失败响应。

**断言 / 门禁**：① 无用户 + bind 成功 ⇒ 建号 + 续走官方流程（**不是**钩子直接返回）② 已有用户 ⇒ 钩子零介入 ③ bind 失败 ⇒ DB 零副作用（`user` / `account` 行数不变）④ 钩子内**不构造响应对象**（`grep` 断言）。

### T4 · server：迁移 `0015` + 探针

> 依据 = 批 design **§6.1 / §6.2 / §6.3 / §6.4** · **B3** · 主 design §3.5 / R8。前置 = T3（后端能力就绪后再动数据）。**执行需用户授权**。
> **建表口径（官方 CLI）**：本批 **零 schema 变更**（`0015` = **数据迁移**）⇒ **不跑**官方 CLI `auth generate` / `migrate`，沿用 `0007` / `0009` **手写 SQL** 先例；官方 CLI 姿势仅在**未来 schema 变更**时启用（M4b-pre 可复现记录：临时 `export const auth = betterAuth(authOptions())` + `bun x auth@latest generate --adapter drizzle --dialect pg --output <仓外>`，因本仓 auth 实例导出名 `authOptions/createAuth/getAuth` **不符官文约定**故须 `--config`）。

1. 落 `apps/server/drizzle/0015_*.sql`：两条语句与批 design §6.1 / §6.2 **一字不差**（列名 `account_id` / `provider_id` / `password` / `user_id`；provider 常量 `credential` / `ldap` / `oidc`；登录名择优沿用 `0009` 同款 LATERAL 排序）。
2. **登记迁移载体**：`apps/server/drizzle/meta/_journal.json` 追加条目（`idx` 顺延 = **15** · `tag` = 文件名去扩展名）+ 落 `meta/0015_snapshot.json` —— `apps/server/src/db/migrate.ts:12` 走 drizzle-orm `migrate()`，**只读 journal、不扫 `.sql` 目录** ⇒ 漏登记则迁移**静默不执行**（对齐先例 `0009_auth_user_domain_data_move` 的登记形态）。
3. 执行窗口 = **停服** ⇒ `bun run --filter=@ai-asset-hub/server db:migrate` ⇒ 立即跑 P1–P3。

**断言 / 门禁**：**P1** `credential` 行 `account_id IS DISTINCT FROM user_id` 计数 = 0 · **P2** 每个「有 ldap/oidc 行」的用户恰有 1 行 `credential` 行 · **P3** 迁移连跑两次，第二次零插入 · ④ 迁移前后 `user` / `account` 既有行口令哈希**零改动**（除新增标记行）⑤ 迁移前快照已存在 ⑥ **载体已登记**：`meta/_journal.json` 条目数 = **16** 且含 `0015_*` tag · `meta/0015_snapshot.json` 存在。

### T5 · web：官方 SDK 三层 + 两处适配

> 依据 = 批 design **§3 / §4** · **§10（零新页面 / 零视觉改动）** · **B1 / B2 / B8 / B9 / B10** · 主 design §3.1。前置 = T4。

1. **依赖**：在 `apps/web` 声明官方 React 入口包 —— `cd apps/web && bun add better-auth@1.7.5`（**exact**，与 `@ai-asset-hub/server` 严格一致）；**同批提交** `apps/web/package.json` + 根 `bun.lock`（CI `bun install --frozen-lockfile` 校验 —— 漏更锁文件 = CI FAIL）。该包**无 `postinstall`** ⇒ **无需**改 `bunfig.toml` 的 `trustedDependencies`（现白名单仅 `esbuild`）。
2. **调用层**：`apps/web/src/api/auth.ts` 改用官方 **React 入口 `better-auth/react`** 的 `createAuthClient`（`signIn` / `signOut` / `useSession`）；基址 `/api/auth`（dev 经 vite proxy `/api` → `3000` ⇒ 浏览器侧同源，官文允许省略 `baseURL`）+ `credentials:'include'`；**前置探针**：dev 侧 `AUTH_TRUSTED_ORIGINS` 须含 `http://localhost:5173`（先验再改，不通过即停）。
3. **会话层**：`apps/web/src/auth/AuthProvider.tsx` 内部实现换 SDK **`useSession`**（React hook；跨标签页同步经 client core 的 broadcast channel），**保留三态对外契约**（`loading` / `anon` / `authed`）；`/api/auth/me` **保留**（B1 · 形状 `{ user, role }` 不变）。
4. **交互层**：401 四分类 + 反向守卫 + `next` 白名单**保留在** `apps/web/src/api/client.ts`，经 SDK `fetchOptions` 钩子注入（B2）。
5. **两处适配**：档位（`apps/web/src/auth/roles.ts` 单点：官方文本 → 1/10/100）· 字段（官方 `user.name` → `displayName`，前端会话层与 `/me` 薄层双端一致）。

**断言 / 门禁**：① `hasRole(role,min)` / `useAuth()` **签名不变**（调用点 **21 处** · 10 文件：`useAuth()` **8** + `hasRole()` **13** 零改签名 —— 口径：`grep -rn 'useAuth(\|hasRole(' apps/web/src` 命中 34 行 = 21 调用 + 11 注释 + 2 定义）② 401 四分类 + 反向守卫 + `next` 白名单**既有断言全绿** ③ 登录 / 登出 / 三态行为等价 ④ `typecheck` + `biome` 绿 ⑤ **零新页面 / 登录页视觉不动**（**B10** · 批 design §10）：本批 `apps/web/src/pages/` **零新增文件**；`apps/web/src/pages/Login.tsx` **本批零改动**（`git diff --name-only` 断言）；视觉基线引 `2026-09-09-m4a-marketplace-portal-design.md` §4.4 **不动** ⑥ **依赖声明生效**：`bun install --frozen-lockfile` 后自 `apps/web` 解析 `better-auth/package.json` **成功**（证明是显式声明、非靠 hoisting —— 现状实测为 `MODULE_NOT_FOUND`）；`bun.lock` 中 `better-auth` 仍为**单一 `1.7.5` 条目**（无第二版本）。

### T6 · web + server：退役 `signInAih`

> 依据 = 批 design **§7** · **B5**。前置 = T5（**两步不可倒序**）。

1. 步 1（前端）：`apps/web/src/api/auth.ts` 的 `/api/auth/sign-in/aih` 调用点切官方 SDK ⇒ **归零**；同步清注释中的端点描述（`:5` / `:29`）。
2. 步 2（后端）：下线 `POST /api/auth/sign-in/aih`（`apps/server/src/auth/plugins/ldap-credentials.ts:268`，本地 + 目录两分支）。

**断言 / 门禁**：① `grep -rn 'sign-in/aih' apps/web/src` = **0**（含注释）② 端点下线后请求 404 ③ **设备授权流 `/device` 与 CLI 令牌面零回归**（走官方端点）。

### T7 · server + web：错误码收敛 + i18n

> 依据 = 批 design **§14.1** · **§8（安全：防枚举 / 口令流转）** · **§9（`REGISTRATION_ENABLED` 默认值）** · 主 design §4.6 / R18 / R3 / §6.2。前置 = T6。

1. `apps/server/src/auth/errors.ts`：删 7 自绘码、留 5（批 design §14.1 键表为**一字不差真值**）。
2. 登录失败统一官方码（不泄露存在性）；**已封禁**明确提示（官方 `BANNED_USER` + 中文 `bannedUserMessage`）。
3. `apps/web/src/i18n/{zh,en}.ts`：删对应 7 条文案（各 1 条）；`auth` / `errors` 组映射调整。
4. **自助注册默认关闭**（批 design §9 · 主 design R3）：`apps/server/src/config/env.ts:35` 的 `REGISTRATION_ENABLED` 默认 `true` → `false`；`apps/server/src/auth/better-auth.ts:80` 的 `disableSignUp: !env.REGISTRATION_ENABLED` 随之生效。

**断言 / 门禁**：① 服务端错误码集合实测 = **5** ② **防枚举**：用户不存在 / 口令错 ⇒ **同一错误码**（**正反对照**实测 —— 不得只看集合大小）③ **口令流转**：响应体与日志**零口令**（`grep` 断言 + 负例）④ **`REGISTRATION_ENABLED` 默认值实测 = `false`** 且自助注册端点不可用（`disableSignUp` 生效；`env.ts:35` / `better-auth.ts:80`）⑤ 双语双向差集 **0** ⑥ 涉及登录失败的 dogfood 断言同步更新且全绿。

### T8 · script / 验证 / 文档

> 依据 = 批 design **§15 / §16** · 主 design **§15 等价判据（R16）**。前置 = T7。

1. **7 个 `*-dogfood.ts`** 全绿（逐段 `SMOKE_ONLY=Gn`，收尾才全量；每段 `NO JS ERRORS` 硬门）。
2. **等价判据三层**：① `hasRole` / `useAuth` 签名不变（调用点 21 处 · 口径见 T5 断言 ①）② 401 四分类 + 反向守卫 + `next` 白名单断言全绿 ③ 7 dogfood 全绿 + `signInAih` 调用点 grep 归零。
3. **门禁 12 步**（§4，CI 同序）逐项 exit 0。
4. **规范回填**：`05` §3.1（目录通道命名 = 企业目录口令验证）· `08` §5（`accountId` 语义 + 标记行口径）· `07` §4（错误码映射）。
5. **F 号同步**：本批 findings 明细登记于批 design §13（F267–F277 已登记）+ `docs/README.md` §6.1 号段行维护。
6. **依赖登记复核**：实测核对 `THIRD-PARTY-NOTICES.md` 与依赖树一致（本次为**同一依赖的第二消费方**，预期内容不变；若变则按其生成口径重生成）。

**断言 / 门禁**：① 7 脚本 0 FAIL ② 门禁 12 步 exit 0 ③ `doc-audit` / `doc-claims-check` 全绿 ④ 证据文件落 `docs/smoke/`。

---

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```text
bun install --frozen-lockfile → typecheck → lint → format:check →
bun docs/smoke/scripts/doc-audit.ts → bun docs/smoke/scripts/doc-claims-check.ts →
bun docs/smoke/scripts/head-sink-coverage.ts --base <before> --head <sha> →
bun docs/smoke/scripts/table-structure-check.ts → bun docs/smoke/scripts/file-ref-closure-check.ts →
build → db:migrate → test
```

逐项 **exit 0** 才算过；顺序**不得调换**（= `.github/workflows/ci.yml` 真序）。
**每 Task 收尾**先跑本包 `typecheck` + `lint`（= `biome check src`）；**落地前**跑全量 12 步。
**dogfood 逐段跑**（`SMOKE_ONLY=Gn`），**收尾才全量**；每段 `NO JS ERRORS` 为硬门。

**跨平台说明（Win / macOS / Linux）**：本批为**认证 + 服务端数据面**改动 —— 无路径 / 时区 / 换行相关差异；迁移 `0015` 为纯 PostgreSQL SQL（三平台语义一致）。
**本批唯一平台相关点**：`AUTH_TRUSTED_ORIGINS` 须含前端源（T5 前置探针；Windows 开发者同此口径）。

---

## 5. 造数需求（**写库需用户授权**）

- **本批不新增 seed 脚本**：迁移 `0015` 作用于**既有库**（幂等 + 只补缺）⇒ 无新造数需求。
- **写库动作只有 1 处**：迁移 `0015`（T4）⇒ **执行前须获用户明确授权**，并先做 `user` / `account` 两表快照。
- **只读探针**：P1–P3 + `user.status` 分布查询 —— 沿用本会话已验证的「临时只读脚本 + 用完即删（不入仓）」方式。
- ⚠️ 测试库 / 生产库不在本批范围；连接串与口令一律从 env 读，不落盘。

---

## 6. 风险与回退

| # | 风险 | 缓解 / 回退 |
|---|------|------------|
| 1 | **迁移与首登建号钩子并发**（`NOT EXISTS` 竞态 ⇒ 可能重复插入 credential 行） | 迁移在**停服窗口**执行；迁移后立即跑 P1/P2；以「`credential` 行按 `user_id` 唯一」兜底（批 design §6.3） |
| 2 | **官方 SDK × dev CSRF 同源守卫**不匹配（写请求 403） | T5 **前置探针**：先验 `AUTH_TRUSTED_ORIGINS` 含 `http://localhost:5173` 再改码；不通过则停 T5 回批 design |
| 3 | **既有账号登录窗口**（迁移未跑而前端已切） | 顺序锁死：T4 迁移 ⇒ T5 前端切换；`signInAih` 端点保留到 T6 才下线 |
| 4 | **时序侧信道退化**（假哈希随端点退役丢失） | T2 断言 ③ 以 `grep` 硬门守住；T6 端点退役**不触碰** verify 分支 |
| 5 | **401 四分类口径回归**（SDK 接管 fetch 后行为漂移） | T5 断言 ② 用**既有断言**（非新写）判定；不绿即回退自绘封装（B2 替代路径已评估） |
| 6 | **dogfood 断言漂移**（登录方式 / 错误码变化） | T7 与 T8 同批改断言；逐段跑 + 收尾全量；断言数**不低于基线** |
| 7 | **依赖新增副作用**（`better-auth` 进 `apps/web`：产物体积 / Vite 解析 / 锁文件） | 仅引 `/react` 子路径（`dist/client/react/index.mjs`，含 `dist/client/` 共享 chunk）；`build` 门禁把关；产物 `grep` 断言**服务端代码未进前端 bundle**；**锁文件未同批更新 ⇒ CI `--frozen-lockfile` FAIL**（T5 步骤 1 + 断言 ⑥ 兜住） |
| 8 | **迁移载体漏登记**（手写 SQL 未进 `meta/_journal.json` / 缺 `0015_snapshot.json`）⇒ `db:migrate` **静默跳过** | T4 步骤 2 落载体 + 断言 ⑥ 计数硬门 · P1–P3 迁移后立即复核 |

---

## 7. 落地记录（执行期回填）

| Task | 日期 | 实测 | 门禁 | 发现 / 偏差 |
|------|------|------|------|------------|
| T1 | | | | |

### 7.1 逐 Task 自检打分位（标准档 **18 维** · A×0.40 + B×0.30 + C×0.30 · 门 ≥9）

> 每 Task 收尾就地打分并留痕（**每个 Task 单独报一次 + 18 维自检分，未验部分如实扣**）。

---

## 8. 自检打分（v0.3 · 两轮抽查修复后）

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | 9.4 | 8 个 Task 覆盖批 design 全部含项；**本轮补齐 3 条已写未承接项**（防枚举 / 口令流转 / `REGISTRATION_ENABLED`）；迁移**含载体登记** |
| 标准 2 准确性 | 9.4 | 数字全部取自实测：`api/auth.ts:47` 调用点 · 调用点 **21 处 / 10 文件**（口径：grep 34 行 = 21 + 11 注释 + 2 定义）· `_journal.json` 条目 **16** · `lint` = `biome check src`（实测）· 7 脚本 · 删 7 留 5 · `better-auth@1.7.5` `exports["./client"]` |
| 标准 3 一致性 | 9.3 | 与批 design §3–§7 / §14 逐条对齐；Task 序 = 安全序（能力 → 迁移 → 前端 → 下线） |
| 标准 4 可用性 | 9.3 | 每 Task 可现场复跑；门禁 12 步 + dogfood 分段写清 |
| 深度 1 追溯性 | 9.5 | 每 Task 带批 design 章节 + B 号指针；**批 design §8/§9 逐行已有 plan 承接指针**；关键事实带 `file:line` |
| 深度 2 反证 | 9.0 | 非目标 4 条 + 登记缺口 1 条 + 风险 **8** 条均带缓解 |
| 深度 3 边界/风险 | 9.3 | 并发 / CSRF / 登录窗口 / 侧信道 / **防枚举 / 口令流转**（入 T7 断言）/ **迁移载体漏登记** / 依赖体积 逐类有缓解；**迁移实跑读数待执行期回填** |
| 深度 4 维护性 | 9.3 | 执行序不倒挂；T4 迁移与 T6 端点下线可独立回退 |

**均分 = 9.31**（逐维和 74.5 ÷ 8）⇒ 达门（≥9）。**版本足迹**：v0.1 自检 9.23 → 第一轮换靶抽查（实体对不对：指针 / `file:line` / 迁移可执行性 / 量化 / B 号 / 骨架 / 计划层规则 / 纪律）命中 **P1–P4** → v0.2 **9.26** → **第二轮抽查（Step 0 读全文 + 头部声明 vs 实体 + design 已写项 → Task 承接 + CI 真序 + 件清单 + 路径 token）命中 R1–R3** → v0.3 **9.31**（实测 9.29：B10 无承接）→ **v0.4 R4 补齐 → 9.31 成立** → v0.5 官文对账轮补 7 项口径（依赖安装形态 / 客户端入口 / 依赖断言 / 建表 CLI / env 命名 / notices 复核 / 风险）。**口径说明**：其中「客户端入口写 vanilla `better-auth/client`」属**与官文不符的事实项**（官文点名 React 入口 `/react`）⇒ 按 v0.4 口径严格计应 −0.1（准确性 9.4→9.3，即 **9.29**）；v0.5 已订正 ⇒ **9.31** 成立。
**执行期换靶复核位**：T5 收尾后按「plan ↔ design 数值对账 + 断言可复跑性 + 件归属」重评一次。

---

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v0.5** | 2026-10-08 | sunxuewen-rush | **官方安装页对账轮（install 1–5 + D1–D3 · 用户「全修」）** —— 读完官文 `/docs/installation` 九步逐条对账后补 7 项：① **依赖安装形态**（`cd apps/web && bun add better-auth@1.7.5`（exact）· **`bun.lock` 同批提交**（CI `--frozen-lockfile`；漏则 FAIL）· 包无 `postinstall` ⇒ 不动 `bunfig.toml`）② **客户端入口订正为官方 React 入口 `better-auth/react`**（官文点名；`useSession` = React hook + `useStore`；原写 vanilla `better-auth/client`，其 `useSession` 实为 `Atom<{data,error,isPending}>`）③ T5 **断言 ⑥**（自 `apps/web` 可解析 + `bun.lock` 单一 1.7.5 条目）④ 风险 **7** 补锁文件口径 ⑤ T8 增**依赖登记复核**（`THIRD-PARTY-NOTICES.md`）⑥ T4 依据补**建表口径**（零 schema 变更 ⇒ 不跑官方 CLI `generate`/`migrate`；引 M4b-pre 可复现 CLI 姿势）⑦ §1 补**认证配置口径**（本批不设 `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`，走 `secret: SESSION_SECRET` / `baseURL: PUBLIC_BASE_URL`）。**实测依据**：官文安装页（真读）· `exports["./react"]` · `vanilla.d.mts:24` · `better-auth.ts:73-74` · `vite.config.ts:16-22` |
| **v0.4** | 2026-10-08 | sunxuewen-rush | **R4 承接补齐（复核轮命中 · 用户「按推荐修」）** —— 🟡 **R4**：**B10「本批零新页面 / 登录页视觉不动」无 Task 承接、无断言**（v0.3 判它「显式 ✅」实为被头部串「B1–B10」**误命中**的探针假阳性）⇒ ① T5 依据行补 **B10** + **§10** ② T5 断言新增 **⑤**（`pages/` 零新增文件 · `pages/Login.tsx` 本批零改动（`git diff --name-only`）· 视觉基线 M4a §4.4 不动）③ §8 **9.31 成立**（v0.3 报 9.31 时 B10 空缺 ⇒ 实测 9.29）④ 连带 批 design **v0.7**（§10 承接指针）· 主 design **v0.12** · `docs/00` **v1.121** |
| **v0.3** | 2026-10-08 | sunxuewen-rush | **第二轮抽查修复（换靶 10 类 · 命中 R1–R3）** —— 🟡 **R1** 头部三处**去硬版本引用**（Status / 上游两行 → 「版本以各件版本头为准」；旧写 批 design v0.4 / 主 design v0.8 ≠ 实体 v0.5 / v0.10）· 🟡 **R2** 批 design §8/§9 已写而 plan 零字的 **3 条**并入 T7（防枚举断言 ② 正反对照 · 口令流转断言 ③ · **`REGISTRATION_ENABLED` 默认关闭** 新步骤 4 + 断言 ④）+ §1 行 7 / §2 T7 出口同步 · ⚪ **R3** §4 合并「`lint` + `biome check`」（同物：`lint` = `biome check src`）· §8 **9.31** · 连带 批 design **v0.6** · 主 design **v0.11** · `docs/00` **v1.120** |
| **v0.2** | 2026-10-08 | sunxuewen-rush | **抽查修复轮（换靶 8 类 · 命中 P1–P4）** —— 🔴 **P1** 迁移载体登记缺失 ⇒ T4 增「登记 `_journal.json` + `0015_snapshot.json`」步骤与断言 ⑥（`migrate.ts:12` 只读 journal 实证），并同步批 design §6.3/§6.4（**F277**）· 🟡 **P2** §1 件清单指针改「主 design §2.7」· 🟡 **P3** T4 依据补 **B3** · 🟡 **P4**「34 处调用点」→ 口径坐实「21 处 / 10 文件（8 + 13）；grep 34 行 = 21 + 11 注释 + 2 定义」· 风险表 **8** 条 · §8 **9.26** |
| **v0.1** | 2026-10-08 | sunxuewen-rush | **首稿**：由批 design **v0.4（定稿 · 8 维 9.50）** 派生 —— §1 目标 8 项 + 非目标 4 条 + 新增依赖 1 项 · §2 **T1–T8** 总览 · §3 逐 Task 明细（依据 / 步骤 / 断言门禁）· §4 门禁 12 步 · §5 造数（无新脚本 · 迁移执行需授权）· §6 风险 7 条 · §7 落地记录位 + 7.1 逐 Task 18 维打分位 · §8 自检 **9.23**。**本版零实现改动** |
