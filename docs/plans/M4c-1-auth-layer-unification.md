# M4c-1 认证层统一到官方：官方 SDK 三层 + 目录口令官方 verify 分支 + 建号钩子 —— 批计划

> Date: 2026-10-08
> Updated: 2026-10-09（**v0.21：dogfood 加固收口** —— ① 新增统一 runner `docs/smoke/scripts/dogfood-all.ts`（前置体检 + 清陈旧标签 + 造数 + 依次跑 + 汇总）② `m4b4`/`m4b5` 启动即 seed（`SMOKE_SKIP_SEED=1` 可跳）⇒ 实证单跑 **89/0 · 62/0**（加固前 85/4 · 54/8）· runner 子集快测 24/0 ③ F290/F293 处置收口）
> Updated: 2026-10-09（**v0.20：T8 收口 —— 本批完成（T1–T8 ✅）** —— ① 门禁 11 步本地 EXIT=0（含 `test` **644 pass / 1 skip / 0 fail**；第 7 道区间门禁归 CI）② dogfood 7 脚本 **494 PASS / 0 FAIL**（含 **F293** 种子前置：`m4b4`/`m4b5` 跑前重播种子）③ 等价判据三层实测全绿（`hasRole`/`useAuth` 签名逐字同 · 21 调用点 · `signInAih` grep **= 0**）④ 规范回填 `05` **v1.13** · `08` **v1.11**（`07` **v1.12** 已于 T7）⑤ 依赖登记复核一致（`better-auth` 1.7.5）⑥ 证据归档 `docs/smoke/2026-10-09-m4c1.md` ⑦ 审计清 3 处陈旧注释（引用已删件）⑧ **F291–F293 登记** · **批收口自检 9.52**）
> **头部口径（本件起）**：只留最近 1-2 版 · 不复述历史与验收数字；更早版本见 §9 修订记录。
> Status: ✅ **本批完成（T1–T8 ✅ · 2026-10-09）** —— dogfood **7/7 全绿（494 PASS / 0 FAIL）** · 门禁 11 步本地 EXIT=0（第 7 道区间门禁由 CI 实测）· 全量测试 **644 pass / 1 skip / 0 fail** · **批收口自检 9.52**（T1 9.46 / T2 9.52 / T3 9.52 / T4 9.57 / T5 9.51 / T6 9.52 / T7 9.54 / T8 9.54）· 批 design **定稿** · 8 维 **9.50** · B1–B10 全部确认 —— **版本号以各件版本头为准**（防二次漂移）
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
| 2 | **官方 `password.verify` 分支** | 替换 `emailAndPassword.password.verify`：`ldap:` 前缀 ⇒ 目录 bind；**其他 ⇒ 保留本仓 `verifyPassword`（自描述 scrypt 格式）** —— ⚠️ 官方 `better-auth/crypto` 的 `verifyPassword` **不适用于本仓存量哈希**（格式/参数均不同，实测 **F279**：照原口径实施会让全部本地账号 500）；**时序侧信道等价处理随迁**（`plugins/ldap-credentials.ts:258`） |
| 3 | **不短路建号钩子** | `sign-in/username` 的 `hooks.before`：登录名无对应用户 ⇒ 目录 bind 成功 ⇒ 经共享模块建号 + 补凭据委派行；**不返回响应**（保住官方 Origin / CSRF 中间件） |
| 4 | **迁移 `0015`**（两条幂等 SQL） | ① `credential` 行 `account_id` 工号 → `user.id` ② 既有目录账号补齐凭据委派行（只补缺）；**执行窗口 = 停服**；验收探针 P1–P3 |
| 5 | **前端官方 SDK 三层** | 调用层（官方 **React 入口 `better-auth/react`**）· 会话层（SDK `useSession` 替换 `AuthProvider` 内部实现，**保留三态契约**）· 交互层（401 四分类经 SDK `fetchOptions` 注入）；**两处适配**：档位（官方文本 → 1/10/100 单点）· 字段（官方 `user.name` → `displayName`） |
| 6 | **退役 `signInAih`** | 前端调用点（`apps/web/src/api/auth.ts:47`）切官方 SDK ⇒ **归零**；后端下线 `POST /api/auth/sign-in/aih`（本地 + 目录两分支） |
| 7 | **错误码收敛 + 自助注册默认关闭 + i18n + 规范回填** ✅ | 删 7 自绘码（`user_pending` / `user_disabled` / `invalid_credentials` / `ldap_denied` / `email_conflict` / `oidc_state_mismatch` / `oidc_denied`）· 留 5（`email_missing` / `rate_limited` / `csrf_failed` / `session_expired` / `forbidden`）· 登录失败统一码 + 已封禁明确提示 · **`REGISTRATION_ENABLED` 默认 `true`→`false`**（`env.ts:35` · `better-auth.ts:80`）· **防枚举 / 口令流转断言** · 规范回填 `05` §3.1 / `08` §5 / `07` §4 |
| 8 | **验证与收尾** ✅ **已完成（2026-10-09）** | 7 个 `*-dogfood.ts` 全绿（**494 / 0**）· 等价判据三层实测 · 门禁 11 步 EXIT=0 · F 号 **F267–F293** 同步 · 证据 `docs/smoke/2026-10-09-m4c1.md` |

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

1. 在官方装配点（`apps/server/src/auth/better-auth.ts:82-86`）把 `emailAndPassword.password.verify` 换成**前缀分派**函数：`ldap:` ⇒ 解析工号 ⇒ 本仓目录 `bind`（`apps/server/src/auth/ldap.ts`）⇒ 布尔；**其他 ⇒ 本仓 `verifyPassword(password, hash)`（既有 scrypt · 自描述格式）**，**不**委托官方 `better-auth/crypto`（F279：官方格式 `saltHex:keyHex` / N=16384 / r=16 / dkLen=64 + NFKC，与本仓 `$scrypt$N$r$p$salt$hash` / N=131072 / r=8 / dkLen=32 **互不认**；官方 verify 在本仓哈希上**直接抛** `Invalid password hash`）。`password.hash` **保持本仓 `hashPassword` 不变**（库内单一格式；「拒绝目录账号改密」落入口层，见 F280）。
2. **时序侧信道**：目录账号路径执行一次固定假哈希校验（现 `plugins/ldap-credentials.ts:393` 的 `DUMMY_PASSWORD_HASH`），抹平「账号不存在 / 密码错 / 目录账号」耗时差。

**断言 / 门禁**：① `ldap:` ⇒ 走目录 bind（路径可断言）② **本仓 scrypt 哈希（`$scrypt$` 前缀）⇒ 走本仓 verify ⇒ 通过**（存量零回归：迁移后既有本地账号口令可验；**反证**：官方 crypto 在本仓哈希上抛错 —— 临时探针已证，故**不得**改走官方）③ 假哈希常量仍存在且被调用（`grep`）④ `password.hash` 未被改动（`hash` 仍 = 本仓 `hashPassword`；`git diff` 断言该行零变化）⑤ `typecheck` + `biome` 绿。

### T3 · server：不短路建号钩子

> 依据 = 批 design **§5.3** · **B4** · 主 design §3.3；事实依据 **F275**（官方 before 钩子在端点中间件之前）。前置 = T2。

1. 挂 `sign-in/username` 的 **before 钩子**（落点 = `plugins/ldap-credentials.ts` 插件对象的 `hooks.before`；官方插件钩子**并入全局钩子表**并按 `matcher` 判定，真码 `api/dispatch.mjs:157-165`）：登录名无对应用户 ⇒ 目录 `bind` ⇒ 成功则经 T1 模块建号 + 补凭据委派行（`providerId='credential'` · `accountId = user.id` · `password = 'ldap:<工号>'`）——**委派行与 user / 目录行同事务**（`identity.ensureDirectoryUser` 新增可选入参 `delegatedPassword`；批 design §5.1/§5.4）。
   - **护栏（F281）**：登录名不满足官方端点前置校验（长度 3–30 · 默认校验器 `/^[a-zA-Z0-9_.]+$/`）时**不介入** —— 否则会「先建号、再被官方 422 拒」留下孤儿账号；
   - **审计**：`created=true` 时写 `AUDIT_ACTIONS.provisionLdap`（沿用既有动作名 · `detail.via = 'sign-in/username'`）。
   - **链路**：建号后官方端点查 user ⇒ `findCredentialAccount`（凭据委派行）⇒ `password.verify` 落到 T2 件 `auth/password-verify.ts` 的分派（`ldap:` 前缀 ⇒ 再 bind 一次）。
2. **不返回响应**（不短路）⇒ 官方端点**自有中间件**照常执行；bind 失败 / 邮箱缺失或冲突 ⇒ 不建号、不返回 ⇒ 由官方端点给统一失败响应（不泄露存在性）。
   - ⚠️ **口径订正（F283 · 已定案「甲」）**：官方 `originCheckMiddleware` 对**无 cookie 的请求直接放行**（真码 `api/middlewares/origin-check.mjs`：`validateOrigin` 内 `if (!(forceValidate || useCookies)) return;`），且官方 **`username` 插件端点自身未挂** `formCsrfMiddleware`（核心 `sign-in` / `sign-up` 端点**都挂了**）⇒ 本钩子**首条**复用官方 `formCsrfMiddleware`（`matcher` `/sign-in/*`，**先于建号钩子** ⇒ 不通过零副作用）补上这一层。**实测口径**：官方测试环境默认 `skipOriginCheck = isTest() ? true : false` ⇒ 断言须按仓内先例显式 `advanced.disableOriginCheck: false`（`app.test.ts:165`，否则实测不可用）。

**断言 / 门禁**：① 无用户 + bind 成功 ⇒ 建号 + 续走官方流程（**不是**钩子直接返回）② 已有用户 ⇒ 钩子零介入 ③ bind 失败 ⇒ DB 零副作用（`user` / `account` / `audit_log` 行数不变）④ 钩子内**不构造响应对象**（源码级硬证：钩子段不得出现 `ctx.json` / `new Response` / `ctx.error`）⑤ **官方语义硬证**：错口令 ⇒ 官方码 `INVALID_USERNAME_OR_PASSWORD`（我方钩子从不出响应）⑥ 无效登录名（含 `-`）⇒ 钩子不介入、不建号 + 官方 422 `INVALID_USERNAME`（F281 护栏）。

### T4 · server：迁移 `0015` + 探针

> 依据 = 批 design **§6.1 / §6.2 / §6.3 / §6.4** · **B3** · 主 design §3.5 / R8 · 事实依据 **F281 / F284**。前置 = T3（后端能力就绪后再动数据）。**执行需用户授权**。
> **建表口径（官方 CLI）**：本批 **零 schema 变更**（`0015` = **数据迁移**）⇒ **不跑**官方 CLI `auth generate` / `migrate`，沿用 `0007` / `0009` **手写 SQL** 先例；官方 CLI 姿势仅在**未来 schema 变更**时启用（M4b-pre 可复现记录：临时 `export const auth = betterAuth(authOptions())` + `bun x auth@latest generate --adapter drizzle --dialect pg --output <仓外>`，因本仓 auth 实例导出名 `authOptions/createAuth/getAuth` **不符官文约定**故须 `--config`）。

1. 落 `apps/server/drizzle/0015_*.sql`：**三条**语句与批 design **§6.0 / §6.1 / §6.2** **一字不差**（**顺序不可交换**：⓪ 登录名保全**必须**早于 ① 归一 —— ① 会覆盖 `account_id`；**F284**）（列名 `account_id` / `provider_id` / `password` / `user_id`；provider 常量 `credential` / `ldap` / `oidc`；登录名择优沿用 `0009` 同款 LATERAL 排序）。
2. **登记迁移载体**：`apps/server/drizzle/meta/_journal.json` 追加条目（`idx` 顺延 = **15** · `tag` = 文件名去扩展名）+ 落 `meta/0015_snapshot.json` —— `apps/server/src/db/migrate.ts:12` 走 drizzle-orm `migrate()`，**只读 journal、不扫 `.sql` 目录** ⇒ 漏登记则迁移**静默不执行**（对齐先例 `0009_auth_user_domain_data_move` 的登记形态）。
3. 执行窗口 = **停服** ⇒ `bun run --filter=@ai-asset-hub/server db:migrate` ⇒ 立即跑 **P1–P6**（三条语句同属一个迁移文件 ⇒ drizzle **单事务**原子：`pg-core/dialect.cjs:62-73`）。

**断言 / 门禁**：**P1** 归一零例外：`credential` 行 `account_id IS DISTINCT FROM user_id` 计数 = 0 · **P2** 完整性：每个「有 ldap/oidc 行」的用户恰有 1 行 `credential` 行 · **P3** 幂等：连跑两次，第二次零插入 · **P4**（**F281**）**登录名合规**：`credential` 账号的 `username` 匹配官方默认校验器 `/^[a-zA-Z0-9_.]+$/` 且长度 3–30（真码 `dist/plugins/username/index.mjs:12-14,31-40`）—— ⚠️ **只在干净环境期望 0**；dev 库含夹具 ⇒ 判据为**形态拆解**（真员工账号 = 0），不合规只出**订正清单**（改数据需另行授权，**不静默改**）· **P5**（**F284**）**登录名保全**：迁移后「`username IS NULL` 且 `credential.account_id IS DISTINCT FROM user.id`」的账号数 = 0（不再有「登录名只在 `account_id`」的账号；**由 ⓪ 保证**）· ④ 迁移前后 `user` / `account` 既有行口令哈希**零改动**（除新增标记行）⑤ 迁移前快照已存在 ⑥ **载体已登记**：`meta/_journal.json` 条目数 = **16** 且含 `0015_*` tag · `meta/0015_snapshot.json` 存在。

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

**T6 收口实测（2026-10-09 · F289 / F290）**：

- **F289**：4 个 seed 脚本凭据行原写 `account_id = 登录名` ⇒ 官方 `findCredentialAccount` 查不到 ⇒ 三账号 401；改 `user.id` + 重跑 seed ⇒ 真 200（dogfood 全绿前置）
- **F290**：dogfood 脚本按 `url.includes('5173')` 复用**陈旧标签** ⇒ 假红；加固覆盖 `m4a`（本走新建标签）/ `m4b2` / `m4b3`（复用标签）/ `m4b4` / `m4b5` / `m4b6` / `m4b7` —— 处置 = 附着后先归一页面态（落 `about:blank`）+ `m4b2` 的 `/dashboard` 快照改侧栏就绪轮询（≤5s）替代固定 `sleep`

### T7 · server + web：错误码收敛 + i18n

> 依据 = 批 design **§14.1** · **§8（安全：防枚举 / 口令流转）** · **§9（`REGISTRATION_ENABLED` 默认值）** · 主 design §4.6 / R18 / R3 / §6.2。前置 = T6。

1. `apps/server/src/auth/errors.ts`：**本批删 4 留 8**（键表按主 design **§4.6 逐行归属**订正 —— **F291**）：`auth.invalid_credentials` · `auth.ldap_denied`（零生产点）· `auth.user_disabled` · `auth.user_pending`（状态门改官方码）；另 3 码（`auth.email_conflict` · `auth.oidc_state_mismatch` · `auth.oidc_denied`）**归 M4c-3**（客户端可见生产点全在保留件）⇒ 终态 5 = 12 − 4 − 3。
2. 登录失败统一官方码（不泄露存在性）；**已封禁**明确提示：状态门 `identity.ts` `statusError` 改抛**官方 `BANNED_USER`** + 官方 `admin({ bannedUserMessage })` 中文；`DISABLED` / 遗留 `PENDING` **行为不变（仍拒）**；前端删重映射表。
3. `apps/web/src/i18n/{zh,en}.ts`：删本批 4 条 `auth.*` 文案（各 1 条）；`errors` 组**增 5 个官方码键**（`BANNED_USER` · `INVALID_USERNAME` · `INVALID_USERNAME_OR_PASSWORD` · `USERNAME_TOO_LONG` · `USERNAME_TOO_SHORT` —— 后四条**同文案 = 防枚举**）。
4. **自助注册默认关闭**（批 design §9 · 主 design R3）：`apps/server/src/config/env.ts:35` 的 `REGISTRATION_ENABLED` 默认 `true` → `false`；`apps/server/src/auth/better-auth.ts:80` 的 `disableSignUp: !env.REGISTRATION_ENABLED` 随之生效。

**T7 落地实测（2026-10-09 · 真库真端点）**：
- 码集合 = **8**（`errors.ts` 实测）；4 个已删码在 `apps/**`（除 `dist`）**零代码引用**
- **防枚举四态同码**（`POST /api/auth/sign-in/username`）：存在+错口令 / 不存在（合规格式）/ 目录账号错口令 / 空口令 ⇒ **一律 401 `INVALID_USERNAME_OR_PASSWORD`**（非合规格式如含 `-` ⇒ 422 `INVALID_USERNAME`，属官方**校验器层**、先于查库 ⇒ 只泄露格式、不泄露存在性）
- **自助注册默认关闭**：`.env.example` + `env.test.ts` 断言 + `app.test.ts` 新增用例（`REGISTRATION_ENABLED=false` ⇒ 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED` · 零建号）
- **口令流转**：登录成功响应体不含明文口令（实测）；登录路径零「口令进日志」代码；审计用例 ⑫ 覆盖零明文
- 全量测试 **644 pass / 1 skip / 0 fail（Ran 645）**；server/web typecheck + lint ✓；仓根 format ✓

**断言 / 门禁**：① 服务端错误码集合实测 = **8**（本批删 4；终态 5 待 M4c-3 删 3） ② **防枚举**：用户不存在 / 口令错 ⇒ **同一错误码**（**正反对照**实测 —— 不得只看集合大小）③ **口令流转**：响应体与日志**零口令**（`grep` 断言 + 负例）④ **`REGISTRATION_ENABLED` 默认值实测 = `false`** 且自助注册端点不可用（`disableSignUp` 生效；`env.ts:35` / `better-auth.ts:80`）⑤ 双语双向差集 **0** ⑥ 涉及登录失败的 dogfood 断言同步更新且全绿。

### T8 · script / 验证 / 文档

> 依据 = 批 design **§15 / §16** · 主 design **§15 等价判据（R16）**。前置 = T7。

1. **7 个 `*-dogfood.ts`** 全绿（逐段 `SMOKE_ONLY=Gn`，收尾才全量；每段 `NO JS ERRORS` 硬门）。
   **前置（F293 · 2026-10-09 已由脚本自愈收口）**：`m4b4` / `m4b5` 会**真改数据** ⇒ 二者已**启动即跑各自种子**（幂等复位 · `SMOKE_SKIP_SEED=1` 可跳）；实证不手工播种单跑 = **89/0 · 62/0**（加固前 85/4 · 54/8）。
   **全量序一键跑（F290 家族收口）**：`bun --env-file=apps/server/.env docs/smoke/scripts/dogfood-all.ts`（前置体检 → 清陈旧 5173 标签 → 造数 → 依次跑 7 脚本 → 汇总）。
2. **等价判据三层**：① `hasRole` / `useAuth` 签名不变（调用点 21 处 · 口径见 T5 断言 ①）② 401 四分类 + 反向守卫 + `next` 白名单断言全绿 ③ 7 dogfood 全绿 + `signInAih` 调用点 grep 归零。
3. **门禁 12 步**（§4，CI 同序）逐项 exit 0。
4. **规范回填**：`05` §3.1（目录通道 = 企业目录口令验证）⇒ **v1.13**（新增「实现口径」8 面表 + F292 订正）· `08` **§3**（`account_id = user.id` 语义 + 凭据委派行标记口径）⇒ **v1.11**（T8 实测订正：`accountId` 真值在 **§3 用户域**，原写「§5」为笔误）· `07` §4（错误码映射）**已在 T7 完成**（v1.12）。
5. **F 号同步**：本批 findings 明细登记于批 design §13（**F267–F293**）；F282 → T6 · F283 已定案「甲」并落地 · F284/F289/F290 本批已修 · F286 已收口 · F287 已复核 · **F291**（错误码删除的跨批归属）· **F292**（目录不可达回退口径订正）· **F293**（dogfood 顺序依赖 ⇒ 前置重播种子 · 本 T8 发现）；`docs/README.md` §6.1 号段行维护。
6. **依赖登记复核**：实测核对 `THIRD-PARTY-NOTICES.md` 与依赖树一致（本次为**同一依赖的第二消费方**，预期内容不变；若变则按其生成口径重生成）。

**T8 落地实测（2026-10-09）**：

- 门禁：install / typecheck / lint / format:check / build / db:migrate / test **逐项 EXIT=0**（test = **644 pass / 1 skip / 0 fail**，Ran 645）；文档四道 **253/130/46/37 全 0 FAIL**；第 7 道 `head-sink-coverage` 为区间门禁 ⇒ 归 CI
- dogfood：**7 脚本 494 PASS / 0 FAIL · 7×EXIT=0 · 全程 NO JS ERRORS**（`m4b4` 89 · `m4b5` 62 须**跑前重播种子**，见 **F293**）
- 等价判据三层：① 签名逐字同（`hasRole` / `useAuth` · 批起点 `c065899` 对比）· 调用点 **21** ② 四分类 / 反向守卫 / `next` 白名单断言随全量测试全绿 ③ 7 dogfood 全绿 + `signInAih`（非 Oidc）grep **= 0**
- 规范回填：`05` **v1.13**（§3.1 实现口径 8 面表 —— 含官方 `bannedUserMessage` 中文提示 + **F292** 订正）· `08` **v1.11**（§3 `account_id` 语义 + 凭据委派行）· `07` **v1.12**（T7）
- 依赖登记：`THIRD-PARTY-NOTICES.md` ↔ 依赖树**一致 · 零变更**（`better-auth` 1.7.5 / `@better-auth/api-key` 1.7.5）
- 整体审计：已删码 4 个全仓 **0 引用** · `signInAih` 调用点 0 · 清 3 处引用已删件的陈旧注释（`m4b4` dogfood 限流注释 + `ldap-credentials.ts` 两处）· 遗留 `InMemoryRateLimiter` 为**下载/上传限流**（与本批无关）
- 证据归档：`docs/smoke/2026-10-09-m4c1.md`

**断言 / 门禁**：① 7 脚本 0 FAIL ② 门禁 12 步 exit 0 ③ `doc-audit` / `doc-claims-check` 全绿 ④ 证据文件落 `docs/smoke/`。

> **T2 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.575** × 0.40 + B 深度 **9.475** × 0.30 + C 工程 **9.500** × 0.30 = **9.52**（门 ≥9 ✓）
> - A 逐维：A1 9.6（11 例含端到端 + 存量零回归）· A2 9.6（scrypt 校验函数注入，避免循环导入）· A3 9.6（官方端点契约未动 · 存量账号可登录）· A4 9.5（目录未启用 / 空登录名 / 异格式 ⇒ false ⇒ 401 不 500）
> - B 逐维：B1 9.5（三分支穷尽）· B2 9.5（空登录名 · `null` 通道 · 异格式 · 目录拒）· B3 9.5（装配点单点 + 假哈希随迁 + 代码注释带 F279/F280 依据）· B4 9.4（目录不可达 ⇒ false，不抛）
> - C 逐维：C1 9.5（等价耗时三条路径 · 不泄露存在性）· **C2 9.3（目录分支多 1 次 scrypt ≈ +250ms —— 时序等价的既定代价）** · C3 9.3 · C4 9.6（新件 71 行 · 职责单一）· C5 9.6（11 例直测）· C6 9.7 · C7 9.6 · C8 9.6 · C9 9.4 · C10 9.4


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
| **T1** | 2026-10-09 | 新建 `apps/server/src/auth/identity.ts`（**194 行** · 纯规则：`createAuthEndpoint`/`APIError`/`setSessionCookie`/`ctx.`/`audit(`/`internalAdapter` **全 0 命中**）· 调用方 `plugins/ldap-credentials.ts` **430 → 295 行（−135）** · **搬移逐字比对**（`git show HEAD:` ↔ 新件，去注释/空白后逐行 diff）：`findExternalUser` **0 差异** · `statusError` **0 差异** · `ensureDirectoryUser` **14 行差异 = 13 行签名/类型区（编译期：匿名字面量 → `DirectoryIdentityInput` · 返回类型 → `EnsureDirectoryUserResult`；10 删 + 3 增）+ 2 行 = 1 条 `throw` 文案的删/增**（`directory credentials:` → `identity rules:`）⇒ **运行期唯一差异 = 1 条异常文案** | 本包 `typecheck` ✓ · `lint`（biome 129 文件 · No fixes applied）✓ · 测试 **609 pass / 1 skip / 0 fail**（610 例 / 54 文件 / 34.2s）· 上笔 CI run **37871796462 success** | ① **审计仍留在调用方**（`provisionLdap` / `login.*` 由端点携 `ctx` 元信息写；若搬进模块会让 OIDC 通道**新增** provision 审计 = 行为变化，违反 T1「零行为变化」）⇒ 记为 **待 M4c-3 拍板项** ② 唯一运行期差异 = 1 条异常文案（安全网分支，不可被程序依赖）③ **未新增测试**（`identity.ts` 直接单测缺位，现靠 `app.test.ts` / `session-lifecycle.test.ts` 间接覆盖）⇒ 18 维 C5 已如实扣分 ④ **F278（T1 测试照出的真缺口）**：建号 `username = subject` 撞官方 `user_username_unique` ⇒ 跨通道同 subject 串 ⇒ 既有兜底不覆盖 ⇒ **500**；**本批不修**（T1 零行为变化），处置归 **M4c-3**；原第 ⑧ 例按用户拍板移除，测试件余 **9 例** |
| **T2** | 2026-10-09 | 新建 `apps/server/src/auth/password-verify.ts`（**71 行**：`DIRECTORY_CREDENTIAL_PREFIX` + `DUMMY_PASSWORD_HASH`（自 `plugins/ldap-credentials.ts` **随迁**）+ `verifyCredential` 前缀分派；scrypt 校验由调用方**注入**以免 `better-auth → 插件 → 新件` 循环导入）· 装配点 `better-auth.ts`：`verify` 换分派（`hash` **零改动** · `ldapChannel` 与插件**单源共用**）· ⚠️ 非 `ldap:` 分支**不**委托官方 `better-auth/crypto`（**F279**）· 新增直测 `password-verify.test.ts` **11 例**（纯函数 6 + 端到端 5）| 本包 `typecheck` ✓ · `lint`（biome 131 文件）✓ · 全量 **629 pass / 1 skip / 0 fail**（630 例 / 56 文件）· 文档门禁 **4/4** | ① **T2 净新增仅「`ldap:` 前缀」一条路径** —— 其余路径零变化（F279 订正的直接收益）② 端到端 ⑦ 目录账号 ⇒ **200 + 官方会话 cookie**（新能力）· ⑨ **存量本地账号 ⇒ 200**（零回归守卫）· ⑧⑩⑪ ⇒ **401（非 500）** ③ 时序侧信道：目录分支**额外跑一次假哈希 scrypt**（三条路径耗时拉齐；代价 ≈ +1 次 scrypt ≈250ms，已知既定代价）④ **附带发现（待拍 F281）**：官方默认用户名校验器 = `/^[a-zA-Z0-9_.]+$/`（3–30 字符，**不接受 `-`**）⇒ 既有账号登录名若含其他字符会被官方端点 **422** 拒（工号形态安全；建议 T4 探针加「全量 credential 行登录名合规」断言）|

| **T3** | 2026-10-09 | ① `identity.ts` +26 行：`DirectoryIdentityInput.delegatedPassword`（可选）⇒ 建号事务内一并写**凭据委派行**（`credential` · `accountId=user.id`）；导出 `CREDENTIAL_PROVIDER` ② `plugins/ldap-credentials.ts`（295 → **390 行**）：`hooks.before` **两条** —— **首条 = 官方 `formCsrfMiddleware`（F283 平价 · `matcher` `/sign-in/*`）**、次条 = 首登建号（`matcher` `path === '/sign-in/username'`，**绝不返回响应**）+ F281 护栏常量 + `provisionLdap` 审计 ③ 新增 `plugins/ldap-credentials.test.ts`（**354 行 · 10 例**：首登建号 / 已有用户零介入 / bind 拒零副作用 / 无效名护栏 / 官方语义硬证 / **CSRF 平价 403** / **Fetch-Metadata 平价 403** / 覆盖面 / 缺凭据行 / 二次登录）④ `identity.test.ts` +2 例（⑩ 委派行两行 · ⑪ 缺省零额外行）⑤ 全库 **642 例 / 57 文件 / 0 fail** | typecheck ✓ · lint **0 warning**（133 文件）· format ✓ · 全量 ✓ · 四道文档门禁 ✓ | **F282**（T6 退役后登录审计零消费点 · 归 T6）· **F283**（`username` 插件端点未挂官方 `formCsrfMiddleware` ⇒ **已定案「甲」并落地**：钩子首条复用官方件 · `/sign-in/*` 覆盖 · 强制校验口径下实测 403 且零副作用；**原「实测 200」口径作废** —— 官方测试环境默认跳过 Origin 校验）· 首登**双 bind**（钩子建号 1 次 + 官方 verify 分派 1 次 = 既定代价，已钉进断言 ①）|

| **T4** | 2026-10-09 | ① 载体三件：`0015_auth_credential_delegation.sql`（**70 行** · 三语句 ⓪/①/② 与批 design §6.0–§6.2 **逐字一致**）· `meta/_journal.json` 条目 **15 → 16** · `meta/0015_snapshot.json`（prevId = 0014 · tables 深比相等 = **零 schema 变更**）② 备份：`~/aih-m4c1-t4-backup-20261009_112452.sql`（**237,872 B** · user+account 两段 COPY）③ 测试库试跑：`migrate` **双跑**（第二次零插入）④ **dev 库执行（停服窗口）**：`__drizzle_migrations` **15 → 16** · `account` **439 → 440**（② 补 1 行）· `user` **612 不变** ⑤ 探针：**P1 = 0**（前 **9**）· **P2 = 0** · **P3** 幂等（双跑 `account` 440→440 · migrations 16→16）· **P4** 形态拆解（真员工形态不合规 = **0** · 夹具 365 `NULL` + 63 `usr_` 超长）· **P5 = 0**（前 **3**：`admin` / `smoke-admin` / `smoke-uploader` 由 **⓪** 救回登录名）· **P6** 载体（`__drizzle_migrations` 16 条 · 最新 `created_at` = journal `when`）⑥ 服务起回（3000 bun · 5173 vite **200**）+ 匿名 **401** + 错口令 **401**（官方形状，**不 500**）⑦ 全量 **642 例 / 57 文件 / 0 fail** | typecheck ✓ · lint 0 warning · format ✓ · 文档 4 道 ✓ · 区间门禁 ✓ · CI **#138 / #139 绿** | **F284**（执行期发现：归一丢登录名 ⇒ 本批 **⓪** 修 + 探针 P5）· **真 200 登录冒烟未做**：仓内不落口令（冒烟口令从 `SMOKE_M4B2_PASSWORD` env 读）⇒ 待用户口令或用户本地跑 |

| **T5** | 2026-10-09 | ① 依赖：`apps/web` 显式声明 `better-auth@1.7.5`（**exact**）+ `bun.lock` 同批（单一 1.7.5 条目）② 调用层 `api/auth.ts`：`createAuthClient`（`better-auth/react`）+ **客户端插件 `usernameClient()`**（**F285**）· `login()` → `signIn.username`（官方端点；error → `ApiError` 归一）· `logout()` → `signOut` · `useAuthSession()` 绑定 SDK `useSession` ③ 会话层 `AuthProvider.tsx`：登录态交 SDK `useSession`，`user` 取会话（`name` → `displayName` · B9）、`role` 仍取 `/me`（**甲**）+ `roleLevelOf`（B8）兜底；三态契约不变 ④ 交互层 `client.ts`：+`notifyUnauthorized()` 导出，经 SDK `fetchOptions.onError` 回注四分类（**单点不复制**）⑤ 实测冒烟（真页面 · 错口令路径，无需口令）：三请求 `get-session` + `sign-in/username` + `me` 全中 · inline 文案「用户名或密码错误」 · **路由不跳**（四分类 ④ ✓）；`Login.tsx` **sha 未变** · pages **17 文件零新增** ⑥ 门禁：web typecheck ✓ · lint 141 文件 0 问题 ✓ · **build ✓** · 全量 642 例 0 fail | typecheck ✓ · lint ✓ · build ✓ · 文档 4 道 ✓ | **F285**（设计 §3 未列客户端插件清单 ⇒ T5 补 `usernameClient()` 并登记）· **真 200 登录未做**（冒烟口令从 `SMOKE_M4B2_PASSWORD` env 读，仓内不落）· 首帧仍 session + `/me` **两请求**（既定代价）|
| **T6** | 2026-10-09 | ① **删自绘端点** `signInAih`：`plugins/ldap-credentials.ts` **376 → 266 行**（端点 132 行 + `findLocalCredential` / `LocalCredentialRow` / `signInBody` / `LOCAL_PROVIDER` / `AccountRow` / `DUMMY_PASSWORD_HASH` / `rateLimiter` dep 全清）② **审计承接（F282）**：`hooks.after` 挂官方 `/sign-in/username`（真码 `api/dispatch.mjs:234-245`：handler 抛 `APIError` 后被收敛成 `{response,status}` 且**仍执行** after ⇒ 成败两态可判；只读不写 ⇒ F276 无关）+ `ldap-credentials.test.ts` 直测 **2 例**（⑪ 成功 `actorId = user.id` · ⑫ 失败匿名 + 官方码 + 零明文）③ **限流交官方（甲）**：删自绘链（`index.ts` 实例 + sweepTimer · `app.ts` `AppDeps.rateLimiter` + `createAuth` 传参 · `better-auth.ts` deps + `LOGIN_RATE_LIMIT` + `InMemoryRateLimiter` 装配 · **7 处**测试 `makeApp({rateLimiter})`）+ `AuthRuntimeDeps.rateLimit` 透传钩子（与既有 `advanced` 同款「测试专用」先例）· 429 用例改「官方 `rateLimit` 显式开启 + `customRules` 钉定」④ **fixture 切官方通道**：`loginNameOf(id)` 单点派生（已合规原样 · 否则折 `_` + 截 23 + 6 位 sha 指纹 ⇒ ≤30；**53 调用点 / 23 个 `PREFIX` 零改**）· 凭据行 `accountId = user.id`（官方 `findCredentialAccount` 三条件之一 · **F273** 测试侧收口）· `signInCookie` → `auth.signInUsername`⑤ **测试改写**：`app.test.ts` 11 处 + `session-lifecycle.test.ts` 1 处；**4 个 LDAP 用例改官方契约**（`user.name` 替 `displayName` · 两行身份 · 目录拒/缺邮箱/邮箱冲突 ⇒ 统一 401 + 零建号）⑥ `password-verify.test.ts` 清理顺序修正（审计行先摘 —— 新钩子写 `auth.login.*` 触发 FK 23503 当场暴露）+ 一处错误注释订正（校验器**收** `_` 不收 `-`）· web 注释清零 | server lint/typecheck ✓ · web typecheck/lint ✓ · 仓根 format ✓ · 全量 **643 pass / 1 skip / 0 fail（Ran 644）** · `grep 'sign-in/aih' apps/web/src` = **0** · 端点 **404**（dev 真探）| **F286**（`auth.ldap_denied` 零生产点 ⇒ T7）· **F287**（限流口径变更 ⇒ T7 复核）· **F288**（`audit_log.actor_id` FK NO ACTION ⇒ M4c-2）· **dogfood 7/7 全绿**（494 PASS / 0 FAIL · 含真 200 登录 + G6 设备流 · NO JS ERRORS；前置 dev 三件在线 `3000/5173/9222`）· 过程中修 **F289**（4 个 seed 脚本 `account_id` 未对齐官方 `findCredentialAccount` ⇒ 登录 401）· **F290**（脚本复用陈旧标签 ⇒ 假红 · **本批已加固**：先归一页面态 + 侧栏就绪轮询；反证 8 陈旧标签下 m4b2 24/0 · m4b3 43/0）|

### 7.1 逐 Task 自检打分位（标准档 **18 维** · A×0.40 + B×0.30 + C×0.30 · 门 ≥9）

> 每 Task 收尾就地打分并留痕（**每个 Task 单独报一次 + 18 维自检分，未验部分如实扣**）。

**T3 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.525** × 0.40 + B 深度 **9.450** × 0.30 + C 工程 **9.590** × 0.30 = **9.52**（门 ≥9 ✓）
> - A 逐维：A1 9.5（10 例覆盖首登/已有用户/bind 拒/无效名/官方语义/缺凭据行/二次登录）· A2 9.6（官方扩展点 `hooks.before`；零新文件；机制注释带 `dispatch.mjs` 行号）· A3 9.5（官方端点契约未动；OIDC 通道零变化（⑪ 直测）；存量账号可登录）· A4 9.5（bind 拒 / 邮箱缺失或冲突 / 无效名 ⇒ 零副作用 + 官方统一响应，一律不 500）
> - B 逐维：B1 9.5（触发条件 6 态穷尽）· B2 9.5（不短路以「官方错误码」正反证 + **CSRF / Fetch-Metadata 平价 403 双证** ⇒ F283 闭环） · B3 9.6（§5.1/§5.3/B4/F275/F281 + 官源码行号）· B4 9.2（目录不可达 ⇒ 不介入，无新降级路径）
> - C 逐维：**C1 9.5（不短路 + 护栏 + 审计 + CSRF 面复用官方件闭环；扣 0.5 = 上游 `username` 插件缺口仍在（本批以钩子补））** · C2 9.4（首登双 bind = 既定代价）· C3 9.5 · C4 9.6（+100 行含测试）· C5 9.6（10 例直测 + 2 例模块直测）· C6 9.6 · C7 9.6 · C8 9.7（零新依赖）· **C9 9.4（provision 审计带 `via`；登录成功/失败审计缺 ⇒ F282）** · C10 9.6


**T4 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.575** × 0.40 + B 深度 **9.550** × 0.30 + C 工程 **9.580** × 0.30 = **9.57**（门 ≥9 ✓）
> - A 逐维：A1 9.7（dev 库实跑成功 + 幂等双跑 + 服务起回后再跑全量 642/0）· A2 9.5（SQL 与批 design **逐字**一致；⓪ 必须早于 ① 已注明；夹具行靠 `IS DISTINCT FROM u.id` 排除）· A3 9.6（**零 schema 变更**：快照 tables 深比相等；不改任何 `password`；旧登 401 非 500）· A4 9.5（单事务原子 `pg-core/dialect.cjs:62-73` + 停服窗口 + 备份 + 失败即停）
> - B 逐维：B1 9.5（空库冷跑（CI）· 有数据 dev · 幂等双跑 · `NULL` username 形态 · 随机 token 夹具）· B2 9.6（**前后对照**：P1 9→0 · P5 3→0 · P3 双跑零插入 · 错口令 401）· B3 9.6（design §6.0–§6.2 逐字 · journal/快照链 · 事务依据带行号 · F284）· B4 9.5（备份留存 + forward-only 声明）
> - C 逐维：C1 9.5（零口令泄露 · 不改哈希 · 不泄露账号存在性）· C2 9.6（两条 UPDATE + 一条 INSERT…SELECT；dev 439 行瞬时）· C3 9.5（载体登记 + 快照链 + 手写先例一致）· C4 9.6（70 行含注释）· **C5 9.4（迁移本身无自动化测试 —— 仅探针 + 静态自检 ⇒ 扣）** · C6 9.6 · C7 9.7（design §6.0–§6.4 + F284 + 四文件版本 + 探针 P1–P6）· C8 9.7（零新依赖）· C9 9.5（探针 + `__drizzle_migrations` 真值核对）· C10 9.7（纯 SQL · 容器/CI 同构）

**T5 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.550** × 0.40 + B 深度 **9.475** × 0.30 + C 工程 **9.480** × 0.30 = **9.51**（门 ≥9 ✓）
> - A 逐维：A1 9.6（真页面 e2e：SDK 走官方端点 + inline 文案 + 路由不跳）· A2 9.5（SDK 客户端集中一处 · 四分类单点复用不复制 · 注释带依据）· A3 9.6（21 处调用零改 · `Login.tsx` sha 未变 · `/me` 保留 · `hasRole` 签名不变）· A4 9.5（error → `ApiError` 归一含 429/`BANNED_USER`；未知码保留原码）
> - B 逐维：B1 9.4（`isPending` / 会话空 / `/me` 失败兜底 role / SDK 会话端点 401 不回注）· B2 9.5（错口令 401 + inline + 网络路径实证）· B3 9.6（§3/§4 + B1/B2/B8/B9/B10 + F285）· B4 9.4（单文件可回退 · 依赖 additive）
> - C 逐维：C1 9.5（`credentials:'include'` · 不落口令 · CSRF/Origin 由服务端侧承担）· C2 9.4（首帧两请求 = 既定代价）· C3 9.5 · C4 9.5（`api/auth.ts` +~90 行；`AuthProvider` 重写行数相当）· **C5 9.0（`apps/web` 无自动化测试（仅 typecheck/lint/build）⇒ 本批仅 e2e 冒烟手工验，如实扣）** · C6 9.6 · C7 9.6 · C8 9.6（新依赖 1 个 · exact · 同实例复用 · notices 不变）· C9 9.4（错误码映射可诊断；无新增日志）· C10 9.7

**T6 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.525** × 0.40 + B 深度 **9.475** × 0.30 + C 工程 **9.550** × 0.30 = **9.52**（门 ≥9 ✓；C5 于 dogfood 全绿后由 9.2 → 9.6）
> - A 逐维：A1 9.6（11 件全落 + 端点真 404 实测 + 审计两态直测 + 全量 643/0）· A2 9.5（官方 `hooks.after` 扩展点 · 零新文件 · 死码清尽 · 注释带真码行号）· **A3 9.4（响应体契约变化：官方 `{redirect,token,url,user}` 替自绘 `{user,session}` —— 前端 T5 已适配 ✓，但对外 API 契约变更须规范回填（T8）⇒ 如实扣）** · A4 9.6（404 真探 + 空体 400 + fixture 侧 32 文件零改实证）
> - B 逐维：B1 9.5（F282/F286/F287/F288 + 官方真码行号：`dispatch.mjs:234-245` · `create-context.mjs` rateLimit 默认 · `rate-limiter/index.mjs` 解析优先级 · `username/index.mjs` 返回体）· B2 9.6（正反双证：404 vs 400；**钩子生效硬证 = FK 23503 当场抓出**；429 用例改官方口径后仍真跑）· **B3 9.3（CSRF/限流前置 ⇒ 不写审计（已注明）；限流仅生产生效 ⇒ dev 环境无登录限流，口径变更登记 F287）** · B4 9.5（删净死码 · 单文件可回退 · `rateLimit` 透传与 `advanced` 同款先例）
> - C 逐维：**C1 9.4（防枚举增强（统一 401）✓ · 审计面恢复 ✓ · 但 dev 环境登录限流随官方默认关闭 ⇒ 如实扣）** · C2 9.6（净删代码 · after 每次登录仅一次审计写入）· C3 9.6（lint/format 零问题 · 死码清尽）· C4 9.6（源代码侧净 −51 行）· **C5 9.6（dogfood 7/7 全绿：494 PASS / 0 FAIL ⇒ 浏览器侧成功登录 + OIDC 之外全链已端到端）** · C6 9.7（零新依赖 —— 限流改官方内置）· C7 9.5（审计成功/失败两态 + detail 语义（`via` / `username`+`code`））· C8 9.4（限流口径变更 + FK 删号阻塞 均已登记）

---

**T7 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.550** × 0.40 + B 深度 **9.500** × 0.30 + C 工程 **9.560** × 0.30 = **9.54**（门 ≥9 ✓）
> - A 逐维：A1 9.6（4 步骤全落 + 六份文档回填 + F291 登记）· A2 9.6（**删**重映射表而非新增；官方 `BANNED_USER` 复用不新造码；零新文件；顺手清 T6 引入的 `seed.ts` non-null 告警）· A3 9.5（`DISABLED` / 遗留 `PENDING` 行为不变 = 零回归；码词汇单源 `AuthSurfaceCode`；`oidc-routes.ts` 透传名单同步）· A4 9.5（防枚举四态实测同码；非合规名 422 = 校验器层先于查库；注册关闭 400 + 零建号直测）
> - B 逐维：B1 9.5（存在+错口令 / 不存在 / 目录失败 / 空口令 / 非合规格式 **五态** + 关闭态 + 全量 645）· B2 9.6（真库真端点实测 + 新增用例 + 登录响应体零口令实测）· B3 9.6（§14.1 逐行归属订正 · 主 design §4.6 归属注 · `07` §4 · F291；token 预演全过）· B4 9.3（单批可回退；**但 `REGISTRATION_ENABLED` 默认翻转属部署期行为变更** —— 自助注册默认不可用，`.env.example` 已同步）
> - C 逐维：C1 9.6（防枚举闭环 + 零口令 + 封禁明确提示 + 零回归）· C2 9.6（热路径零新增，仅少一次映射查表）· C3 9.6（码词汇单源 + 官方码常量集中）· C4 9.6（净删多于增 · 注释带真码出处）· C5 9.3（服务端模块/集成层有直测 + 新增注册关闭用例；**`apps/web` 映射改造无自动化测试**（该 App 无测试基建，同 T5 口径扣））· C6 9.6（F291 记录跨批归属矛盾并订正口径）· C7 9.6（六件文档同步 + 双门禁）· C8 9.7（零新依赖）· C9 9.5（登录成败审计沿用 T6 口径，失败审计 `detail.code` = 官方码原件）· C10 9.5（env 默认值变更须部署注意；`.env.example` 已同步）


**T8 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.525** × 0.40 + B 深度 **9.525** × 0.30 + C 工程 **9.570** × 0.30 = **9.54**（门 ≥9 ✓）
> - A 逐维：A1 9.6（T8 六项全落 + 证据归档）· A2 9.6（证据文件只放读数与指针 · 零生产代码改动）· A3 9.5（规范 05/08 与实现逐条对齐 · F292 订正）· A4 9.4（**F293 顺序依赖**已写明前置；脚本自愈归后续）
> - B 逐维：B1 9.5（7 脚本 + 等价判据三层 + 依赖复核 + 全仓扫描）· B2 9.6（真跑读数：494/0 · 11 步 EXIT=0 · 644/0）· B3 9.6（批 design §13/§15/§16 · 主 design §15 · 规范落点）· B4 9.4（F293 未做脚本自愈 ⇒ 扣）
> - C 逐维：C1 9.6（审计零残留：已删码/端点 0 引用）· C2 9.6（零生产代码改动）· C3 9.6 · C4 9.5（仅 3 处陈旧注释）· C5 9.5（门禁 12 步 + dogfood 7/7；区间门禁本地不可跑）· C6 9.6 · C7 9.6（六件 + 证据文件 + token 预演）· C8 9.7（零新依赖）· C9 9.5 · C10 9.5（注册默认关闭属部署期行为变更，已在文档写明）

**批收口自检（18 维 · 各 Task 算术平均）**：T1 **9.46** · T2 **9.52** · T3 **9.52** · T4 **9.57** · T5 **9.51** · T6 **9.52** · T7 **9.54** · T8 **9.54** ⇒ **批收口 = 9.52**（八项均 ≥9 门 ✓）
> 口径：逐 Task 分数取自上表/本节各 T 的收尾自检块（未验部分已如实扣分）；批收口 = 八项**算术平均**（非加权——各 Task 工作量不同，加权会掩盖短板 Task）。

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
| **v0.21** | 2026-10-09 | sunxuewen-rush | **dogfood 加固收口（F290 家族 + F293 自愈）** —— ① 新增 `docs/smoke/scripts/dogfood-all.ts`：一条命令跑全量序（前置体检 api/web `[::1]`/CDP → 清陈旧 5173 标签 → 6 份造数幂等重播 → 依次跑 7 dogfood → 汇总表 + 非零退出；`SMOKE_SCRIPTS` / `SMOKE_SKIP_SEED` / `SMOKE_LOG_DIR` 可选）② `m4b4` / `m4b5` 启动即跑各自种子 ⇒ **实证**不手工播种单跑 **89/0 · 62/0**（加固前同条件 85/4 · 54/8）③ runner 子集快测 m4b2 = **24/0**（前置体检报出并清理 7 个陈旧 5173 标签） ④ T8 步 1 前置说明改「已自愈」 |
| **v0.20** | 2026-10-09 | sunxuewen-rush | **T8 收口 —— 本批完成（T1–T8 ✅）** —— ① 门禁 11 步本地 EXIT=0（`test` **644 pass / 1 skip / 0 fail**；第 7 道区间门禁归 CI）② dogfood 7 脚本 **494 PASS / 0 FAIL**（**F293** 前置：`m4b4`/`m4b5` 跑前重播种子）③ 等价判据三层实测（签名逐字同 · 21 调用点 · `signInAih` grep=0）④ 规范回填 `05` **v1.13** · `08` **v1.11** ⑤ 依赖登记复核一致 ⑥ 证据 `docs/smoke/2026-10-09-m4c1.md` ⑦ 审计清 3 处陈旧注释 · **F291/F292/F293 登记** ⑧ 逐 Task 自检 + **批收口 9.52** |
| **v0.19** | 2026-10-09 | sunxuewen-rush | **T7 落地（错误码收敛 12→8 · 官方码直通 i18n · 自助注册默认关闭）+ F291 登记** —— ① `errors.ts` 删 4 留 8（零生产点 2 + 状态门 2）· 另 3 码归 M4c-3（**F291**：§14.1「删 7」原为**终态**口径）② `identity.ts` `statusError` 改抛官方 `BANNED_USER` + `admin({ bannedUserMessage })` 中文（DISABLED/PENDING 行为不变）③ 前端删 `SIGN_IN_ERROR_KEY` 重映射表 ⇒ 官方码直通 `errors` 组（+5 键／删 4 条）④ `env.ts:35` 默认 `false` + `.env.example` + `env.test.ts` + 关闭态实测用例 ⑤ 实测：防枚举**四态同码 401** · 全量 **644/1/0** · 码集合 **8** · 顺手清 T6 引入的 `seed.ts` non-null 告警 |
| **v0.18** | 2026-10-09 | sunxuewen-rush | **F290 加固（dogfood 脚本自愈）+ 反证验收** —— ① `m4b2-auth-dogfood` / `m4b3-personal-a-dogfood`：附着后**先落 `about:blank`** 归一页面态；`m4b2` 4 处 `/dashboard` 快照改**侧栏就绪轮询**（≤5s）② 反证：8 个陈旧 5173 标签在场 ⇒ `m4b2` **24/0** · `m4b3` **43/0**（加固前同条件 5 FAIL）③ 证据 PNG 提交前通配还原 |
| **v0.17** | 2026-10-09 | sunxuewen-rush | **T6 收口（dogfood 7/7 全绿 · 494 PASS / 0 FAIL）+ F289/F290 登记 · 18 维 9.52** —— ① 7 脚本全绿（24/64/43/89/62/108/104 · 全 EXIT=0）② **F289** 4 个 seed 脚本 `account_id` 未对齐官方三条件 ⇒ 官方端点 401（已修 + 重跑 seed）③ **F290** dogfood 复用陈旧 5173 标签 ⇒ 假红（清标签重跑即绿；脚本加固归 T8）④ C5 9.2 → 9.6 |
| **v0.16** | 2026-10-09 | sunxuewen-rush | **T6 落地（退役 `signInAih` + 审计承接 + 限流交官方）+ F286–F288 登记 · 18 维 9.50** —— ① 删自绘端点（`plugins/ldap-credentials.ts` 376 → 266 行）+ 死码全清 ② `hooks.after` 审计承接（F282 收口）+ 2 例直测 ③ 限流交官方（自绘链全删 + `rateLimit` 透传钩子）④ fixture 切官方通道（`loginNameOf` 单点派生 · `accountId = user.id`）⑤ 4 个 LDAP 用例改官方契约 ⑥ 实测：端点 **404** · 全量 **643/0** ⑦ **F286**/**F287**/**F288** 登记 |
| **v0.15** | 2026-10-09 | sunxuewen-rush | **T5 落地（官方 SDK 三层 + 两处适配）+ 18 维 9.51** —— ① `apps/web` 声明 `better-auth@1.7.5`（exact；lock 单一 1.7.5；notices 预期不变）② `api/auth.ts`：`createAuthClient` + **`usernameClient()`**（**F285**）· `login` → `signIn.username`（error → `ApiError`）· `logout` → `signOut` · `useAuthSession()` ③ `AuthProvider.tsx`：登录态交 SDK `useSession`；`user` 取会话（`name`→`displayName` · B9）；`role` 仍取 `/me`（甲）+ `roleLevelOf`（B8）兜底；三态契约不变 ④ `client.ts`：+`notifyUnauthorized()`（四分类单点不复制）⑤ 实测（真页面 · 错口令）：三请求全中 + inline「用户名或密码错误」+ 路由不跳；`Login.tsx` sha 未变 · pages 17 零新增 ⑥ 门禁：web typecheck/lint/build ✓ · 全量 642/0 ⑦ 未做：真 200 登录（env 口令）⑧ 18 维 **9.51**（C5 9.0：web 无自动化测试）|
| **v0.14** | 2026-10-09 | sunxuewen-rush | **T4 落地（`0015` 已在 dev 库执行）+ 18 维 9.57** —— ① 载体三件（SQL 70 行 · journal 15→16 · 快照 prevId=0014）② 备份 `~/aih-m4c1-t4-backup-20261009_112452.sql`（237,872 B）③ 执行：测试库试跑 + **dev 库停服执行**（migrations 15→16 · account 439→440 · user 612 不变）④ 探针 **P1–P6 全过**（P1 9→0 · P2 0 · P3 幂等双跑 · P4 形态拆解真员工 0 · P5 3→0（`admin`/`smoke-admin`/`smoke-uploader` 由 ⓪ 救回）· P6 载体真值）⑤ 服务起回（3000 bun / 5173 vite 200）+ 匿名 401 + 错口令 401 ⑥ 全量 **642 例 / 0 fail** ⑦ 未做：真 200 登录冒烟（口令从 env 读，仓内不落）⑧ CI **#138 / #139 绿** |
| **v0.13** | 2026-10-09 | sunxuewen-rush | **T4 迁移增语句 ⓪（F284 登录名保全）+ 探针 P1–P6** —— ① `0015` 由两条改**三条**（⓪ 回填 `user.username = lower(credential.account_id)`（`username IS NULL` 且 `account_id IS DISTINCT FROM user.id` 且非空）· ① 归一 `account_id` · ② 补委派行），**顺序不可交换**（① 会覆盖 `account_id`）② 步骤 3 跑 **P1–P6**（P4 合规判据 = **形态拆解**（干净环境才期望 0）· 新增 **P5 登录名保全**（`username IS NULL` 且 `account_id ≠ user.id` 计数 = 0））③ 依据补 **F284**；单事务原子（`drizzle-orm/pg-core/dialect.cjs:62-73`）④ F 号段 → **F267–F284** |
| **v0.12** | 2026-10-09 | sunxuewen-rush | **T3 收尾（F283 定案「甲」· CSRF 平价落地）** —— ① `plugins/ldap-credentials.ts` 的 `hooks.before` **首条** = 官方 `formCsrfMiddleware`（`matcher` = `ctx.path.startsWith('/sign-in/')`；数组顺序 ⇒ **先于建号钩子** ⇒ CSRF 不通过则**零建号副作用**）② `plugins/ldap-credentials.test.ts` **9 → 10 例**（⑧ 跨源 ⇒ 403 `INVALID_ORIGIN` + 零建号 · ⑨ `Sec-Fetch-Site: cross-site` + `Mode: navigate` ⇒ 403 `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED` + 零建号 · ⑩ 覆盖面含 `/sign-in/email`），**全部在显式 `advanced.disableOriginCheck: false` 口径下**（官方测试环境默认跳过 Origin 校验 `isTest()`；仓内先例 `app.test.ts:165`）③ **F283 精确化**：核心 `api/routes/sign-in.mjs` / `sign-up.mjs` **自带** `formCsrfMiddleware`，缺的只有 `username` 插件端点 ④ T3 18 维 **9.48 → 9.52**（B2 9.3→9.5 · C1 9.2→9.5 · C5 9.5→9.6）⑤ 全库 **642 例 / 57 文件 / 0 fail** ⑥ 链路：钩子建号成功后官方端点经 T2 件 `password-verify.ts` 分派复核口令（`ldap:` 前缀 ⇒ 目录再 bind 一次）；本笔待 **commit/push**（需用户口令） |
| **v0.11** | 2026-10-09 | sunxuewen-rush | **T3 落地（官方 before 钩子首登建号）+ F282/F283 登记** —— ① `apps/server/src/auth/identity.ts`（220 行）：`DirectoryIdentityInput.delegatedPassword`（可选）⇒ 建号事务内一并写凭据委派行（`credential` · `accountId=user.id` · `password=ldap:<工号>`），`CREDENTIAL_PROVIDER` 导出 ② `plugins/ldap-credentials.ts`（295 → 369 行）：插件对象增 `hooks.before`（`matcher: ctx.path === '/sign-in/username'`），首登建号 + **不短路**（真码 `api/dispatch.mjs:210-231` 先于端点 handler 与其中间件；F275）+ F281 护栏（长度 3–30 + `/^[a-zA-Z0-9_.]+$/`）+ `provisionLdap` 审计 ③ 新增 `apps/server/src/auth/plugins/ldap-credentials.test.ts`（**9 例** · 8 pass / 1 skip）④ `identity.test.ts` 增 ⑩⑪（委派行两行 / 缺省零额外行）⑤ 全库 **640 例 / 57 文件 / 0 fail** ⑥ **F282**：T6 退役 `signInAih` 后 `auth.login.success` / `auth.login.failed` **零消费点**（`app.ts` 包装层只管 logout / device 三件）⇒ 归 **T6** ⑦ **F283**：官方 `sign-in/username` 对无 cookie 请求**不做** Origin/CSRF 强校验（真码 `api/middlewares/origin-check.mjs`）⇒ 跨源登录 POST 实测 **200**；「不短路以保住官方校验」口径不完备 ⇒ **修法待拍板**（甲/乙/丙），平价探针挂 `it.skip`（⑧）|
| **v0.10** | 2026-10-09 | sunxuewen-rush | **头部下沉覆盖修复** —— CI **#133**（`1ea8c60`）唯一失败步 = `head-sink-coverage`：**v0.5 头部版本行**下沉时其尾部「**连带版本**：批 design v0.8 · 主 design **v0.13** · `docs/00` **v1.122**」未在同文件留存（token `v0.13`/`v1.122`/`122` 零命中）⇒ **逐字迁入 §9 v0.5 行**（⑧ 连带版本）。**流程修正**：文档头部改动的提交，本地门禁须含 `head-sink-coverage.ts --base <before> --head HEAD`（原只跑 4 个默认脚本，漏此项 ⇒ 网络时延后才暴露） （本地验真命令：`--base 22f973a --head HEAD`） |
| **v0.9** | 2026-10-09 | sunxuewen-rush | **T2 收口 + T4 探针 P4** —— ① T2 交付：新建 `apps/server/src/auth/password-verify.ts`（71 行 · 前缀分派 + 假哈希随迁）· 装配点 `verify` 换分派（`hash` 零改动）· 直测 **11 例**（目录 ⇒ 200；**存量本地账号 ⇒ 200 零回归（F279 守卫）**；异常一律 401 非 500）· 全量 **629 pass / 1 skip / 0 fail** · 文档 4/4 ② **T4 增断言 P4**（**F281**：全量 `credential` 账号登录名合规，不合规 = 0，否则出订正清单待授权）· T4 依据补 F281 ③ §7 回填 T2 落地 + §7.1 T2 **18 维 9.52** |
| **v0.8** | 2026-10-09 | sunxuewen-rush | **T2 落地（存值前缀分派）** —— ① 新建 `apps/server/src/auth/password-verify.ts`（71 行）② 装配点 `better-auth.ts`：`verify` 换前缀分派 · `hash` **零改动** · `ldapChannel` 单源 ③ 新增 `password-verify.test.ts` **11 例**（纯函数 6 + 端到端 5）④ §7/§7.1 回填（**9.52**）⑤ 附带发现 **F281**：官方默认用户名校验器 `/^[a-zA-Z0-9_.]+$/`（3–30、不收 `-`）—— 待拍：登记 + T4 加「credential 行登录名合规」探针 |
| **v0.7** | 2026-10-09 | sunxuewen-rush | **T2 契约口径订正（F279/F280 · 用户「全修」）** —— 🔴 **F279**：`password.verify` 的「其他」分支原口径「委托官方 `better-auth/crypto` 的 `verifyPassword`」**不可实施** —— 官方（`saltHex:keyHex` · N=16384 r=16 dkLen=64 · NFKC）与本仓（`$scrypt$N$r$p$saltB64$hashB64` · N=131072 r=8 dkLen=32）**格式与参数均不同、互不认**；实测反控：官方 verify 在本仓哈希上 **THREW `Invalid password hash`** ⇒ 照做 = 存量本地账号（含 seed/夹具）**全 500** + 踩穿 R10 零重置。订正 = **保留本仓 `verifyPassword`**（净新增仅「`ldap:` 前缀」一条路径）· 🔴 **F280**：「`password.hash` 分支 = 显式拒绝」**机制错**（官真实码 `ctx.context.password.hash(newPassword)` **单参**、拿不到账号身份 ⇒ 一刀拒 = 所有设密路径失效，含官方 sign-up 与 M4c-2 的 R21 自助改密）；原意（R12「管理员对目录账号改密 ⇒ 明确错误码」）正确 ⇒ 落点改为**入口层按目标账号判定**，`hash` 保持本仓 `hashPassword` · 连带：批 design **v0.10** · 主 design **v0.15** · `docs/00` **v1.124** · `docs/README` §6.1 **F267–F280** |
| **v0.6** | 2026-10-09 | sunxuewen-rush | **T1 落地（身份源共享模块）+ F278 登记** —— ① Status → 🔵 **执行中（T1 ✅）** ② §7 回填 + §7.1 18 维 **9.43** ③ 新建 `apps/server/src/auth/identity.ts`（194 行纯规则）· 改造 `plugins/ldap-credentials.ts`（430→295）· **零行为变化证据**（两函数 0 差异 / `ensureDirectoryUser` 14 行差异 = 13 行类型区 + 1 条 throw 文案）④ 新增模块直测 `identity.test.ts` **9 例**（`CI=true` 真库 · 自造前缀 · `afterAll` 自证零残留）⑤ **F278**：跨通道同 subject 撞 `user_username_unique` ⇒ 500（**本批不修**，归 M4c-3）；原第 ⑧ 例按拍板移除 ⑥ 连带 批 design **v0.9**（§5.4 约束行 + §13 F278）· 主 design **v0.14**（上界 F278）· `docs/00` **v1.123** · `docs/README` §6.1 **F267–F278** |
| **v0.5** | 2026-10-08 | sunxuewen-rush | **官方安装页对账轮（install 1–5 + D1–D3 · 用户「全修」）** —— 读完官文 `/docs/installation` 九步逐条对账后补 7 项：① **依赖安装形态**（`cd apps/web && bun add better-auth@1.7.5`（exact）· **`bun.lock` 同批提交**（CI `--frozen-lockfile`；漏则 FAIL）· 包无 `postinstall` ⇒ 不动 `bunfig.toml`）② **客户端入口订正为官方 React 入口 `better-auth/react`**（官文点名；`useSession` = React hook + `useStore`；原写 vanilla `better-auth/client`，其 `useSession` 实为 `Atom<{data,error,isPending}>`）③ T5 **断言 ⑥**（自 `apps/web` 可解析 + `bun.lock` 单一 1.7.5 条目）④ 风险 **7** 补锁文件口径 ⑤ T8 增**依赖登记复核**（`THIRD-PARTY-NOTICES.md`）⑥ T4 依据补**建表口径**（零 schema 变更 ⇒ 不跑官方 CLI `generate`/`migrate`；引 M4b-pre 可复现 CLI 姿势）⑦ §1 补**认证配置口径**（本批不设 `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`，走 `secret: SESSION_SECRET` / `baseURL: PUBLIC_BASE_URL`）⑧ **连带版本**：批 design **v0.8** · 主 design **v0.13** · `docs/00` **v1.122**（自该版头部行逐字迁入）。**实测依据**：官文安装页（真读）· `exports["./react"]` · `vanilla.d.mts:24` · `better-auth.ts:73-74` · `vite.config.ts:16-22` |
| **v0.4** | 2026-10-08 | sunxuewen-rush | **R4 承接补齐（复核轮命中 · 用户「按推荐修」）** —— 🟡 **R4**：**B10「本批零新页面 / 登录页视觉不动」无 Task 承接、无断言**（v0.3 判它「显式 ✅」实为被头部串「B1–B10」**误命中**的探针假阳性）⇒ ① T5 依据行补 **B10** + **§10** ② T5 断言新增 **⑤**（`pages/` 零新增文件 · `pages/Login.tsx` 本批零改动（`git diff --name-only`）· 视觉基线 M4a §4.4 不动）③ §8 **9.31 成立**（v0.3 报 9.31 时 B10 空缺 ⇒ 实测 9.29）④ 连带 批 design **v0.7**（§10 承接指针）· 主 design **v0.12** · `docs/00` **v1.121** |
| **v0.3** | 2026-10-08 | sunxuewen-rush | **第二轮抽查修复（换靶 10 类 · 命中 R1–R3）** —— 🟡 **R1** 头部三处**去硬版本引用**（Status / 上游两行 → 「版本以各件版本头为准」；旧写 批 design v0.4 / 主 design v0.8 ≠ 实体 v0.5 / v0.10）· 🟡 **R2** 批 design §8/§9 已写而 plan 零字的 **3 条**并入 T7（防枚举断言 ② 正反对照 · 口令流转断言 ③ · **`REGISTRATION_ENABLED` 默认关闭** 新步骤 4 + 断言 ④）+ §1 行 7 / §2 T7 出口同步 · ⚪ **R3** §4 合并「`lint` + `biome check`」（同物：`lint` = `biome check src`）· §8 **9.31** · 连带 批 design **v0.6** · 主 design **v0.11** · `docs/00` **v1.120** |
| **v0.2** | 2026-10-08 | sunxuewen-rush | **抽查修复轮（换靶 8 类 · 命中 P1–P4）** —— 🔴 **P1** 迁移载体登记缺失 ⇒ T4 增「登记 `_journal.json` + `0015_snapshot.json`」步骤与断言 ⑥（`migrate.ts:12` 只读 journal 实证），并同步批 design §6.3/§6.4（**F277**）· 🟡 **P2** §1 件清单指针改「主 design §2.7」· 🟡 **P3** T4 依据补 **B3** · 🟡 **P4**「34 处调用点」→ 口径坐实「21 处 / 10 文件（8 + 13）；grep 34 行 = 21 + 11 注释 + 2 定义」· 风险表 **8** 条 · §8 **9.26** |
| **v0.1** | 2026-10-08 | sunxuewen-rush | **首稿**：由批 design **v0.4（定稿 · 8 维 9.50）** 派生 —— §1 目标 8 项 + 非目标 4 条 + 新增依赖 1 项 · §2 **T1–T8** 总览 · §3 逐 Task 明细（依据 / 步骤 / 断言门禁）· §4 门禁 12 步 · §5 造数（无新脚本 · 迁移执行需授权）· §6 风险 7 条 · §7 落地记录位 + 7.1 逐 Task 18 维打分位 · §8 自检 **9.23**。**本版零实现改动** |

> **T1 收尾自检（标准档 18 维 · A×0.40 + B×0.30 + C×0.30）**：A 基础 **9.525** × 0.40 + B 深度 **9.375** × 0.30 + C 工程 **9.470** × 0.30 = **9.46**（门 ≥9 ✓）
> **重评 delta（首轮 9.43 → 9.46）**：补测后 A1 9.3→**9.5**（模块 9 例直测）· C5 8.9→**9.4**（`identity.test.ts` 9 例：复用/漂移/邮箱必填/归一/冲突/默认值/成对建号/竞态回查/状态门；`CI=true` 真库 · 自造前缀 · `afterAll` 自证零残留）· C9 9.3→**9.4**（plan §7 回填 + 批 design §5.4 约束行 + F278 登记）；B 维不变
> - A 逐维：A1 9.5 · A2 9.6（具名接口替匿名字面量 · 无 any）· A3 9.5（导出面/端点/响应形状未动）· A4 9.5（错误路径逐字搬移）
> - B 逐维：B1 9.4 · B2 9.4（23505 竞态 / 缺行安全网 / null 邮箱全保留）· B3 9.5（工厂形态同 `directoryCredentials(deps)`）· B4 9.2（无新增降级，OIDC 无审计保持原状）
> - C 逐维：C1 9.4 · C2 9.4 · C3 9.3 · C4 9.6（430→295 行 · 链接策略单点）· **C5 9.4**（9 例直测；移除的第 ⑧ 例对应 **F278** —— 缺口已登记、归 M4c-3，故不视为覆盖到）· C6 9.7 · C7 9.6 · C8 9.5 · C9 9.4 · C10 9.4
