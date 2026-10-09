# M4c-1 认证层统一到官方设计（批 design）

> Date: 2026-10-08
> Updated: 2026-10-09（**v0.14：T4 迁移增语句 ⓪（F284 登录名保全）** —— ① 新增 **§6.0**：`0015` 在 §6.1 归一 `account_id` **之前**回填 `user.username = lower(credential.account_id)`（否则「登录名只存在 `account_id`」的存量本地账号迁移后永久 401 且不可逆）② §6.3 增**语句顺序**与**登录名保全**两行（单事务原子：`drizzle-orm/pg-core/dialect.cjs:62-73`）③ §6.4 探针扩为 **P1–P6**（+P5 登录名保全；P4 合规判据改**形态拆解**）④ §13 登记 **F284** |
> Updated: 2026-10-09（**v0.13：F283 定案「甲」+ 口径订正** —— ① §5.3 决策段由「待拍板」改为**已定案甲**：插件 `hooks.before` 首条复用官方 `formCsrfMiddleware`、`matcher` = `/sign-in/*`（先于建号钩子）② **F283 精确化**：核心 `sign-in` / `sign-up` 端点**自带**该中间件，缺的只有 `username` 插件端点（本批采纳端点）③ **实测口径订正**：官方测试环境默认 `skipOriginCheck=true` ⇒ 原「实测 200」不成立；显式 `advanced.disableOriginCheck:false` 后实测 403（`INVALID_ORIGIN` / `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED`）且**零建号** ④ §8 CSRF 行改「已闭环」|
> Updated: 2026-10-09（**v0.12：T3 落地 + F282/F283 登记** —— ① §5.1 增**委派行写入点**（建号事务内 · 可选入参 `delegatedPassword`）② §5.3 表增**实现落点 / 登录名护栏 / 审计**三行 ⇒ 返回行为「不短路」并挂 **F283 口径订正** ③ **§8 CSRF/Origin 行订正**（原「不短路以保住官方校验」不完备）④ §13 登记 **F282**（登录审计零消费点 · 归 T6）· **F283**（官方登录端点无 cookieless Origin/CSRF 强校验 · 实测 200 · 修法待拍板）|
> 头部口径：只留最近 1–2 版 · 不复述历史；更早版本见 §18 修订记录。
> Status: **定稿**（**批 design** —— 本批落点与契约；实现细则落批 plan）。**定稿条件**：① 8 维自检 **9.50**（标准 9.50 · 深度 9.50；首稿 8.94 → 处置 9.38 → §6 补全 9.44 → **换靶检查 9.19 → 修复后 9.50**）✅ ② 批内对齐 **B1–B10 全部确认**（2026-10-08）✅ ③ 未决项清零（迁移 SQL **与执行窗口口径**已补；dogfood 分段归 plan；CSRF 联调列入实现首批）✅ ⇒ **2026-10-08 用户批准**。本文为**纯设计语言**（意图与契约）。
> Scope: M4c-1（主 design §2.3）—— **认证层统一到官方**：前端三层改官方 SDK + 后端目录凭据委派行 / `password.verify` 分支 / **不短路**首登建号钩子 / 身份源共享模块 / `accountId` 语义统一（含 1 次数据迁移）+ 退役自绘端点 `signInAih`。
> **不含**：账号治理面（M4c-2：用户管理页 / 启停 / 权限码）· 外部身份源（M4c-3：社交 provider / Entra ID / 登录页入口）。
> 引用链：本文档 → 主 design `2026-10-08-m4c-account-and-access-governance-design.md` §3.0–§3.5 / §8 / §15 · 规范 `05` §3 / §4 · `08` §5（**引用不复制**，字段与规则以规范为准）。

## 1. 背景与批界

### 1.1 位置与依赖链

主 design 已定本批总方针（D7「完全沿用 better-auth 官方做法」）与分层归属（D12：L1 目录协议自写 · L2 登录端点官方 · L3 会话/Cookie/CSRF/错误码官方）。
本批是 M4c 的**认证底座**：M4c-2 的用户管理页依赖官方 SDK 的会话 / 权限显隐，M4c-3 的 provider 入口依赖官方 SDK 的登录调用层 ⇒ 先落本批，后两批只写一次、零返工（主 design §2.3 编排说明）。

### 1.2 入口与靶件现状（真码实测 2026-10-08）

**本批要解决的问题（现状真值）**：

| # | 现状 | 锚点 |
|---|------|------|
| 1 | 前端认证为自绘封装（端点手调 + 自管会话态），未用官方 SDK | `apps/web/src/api/auth.ts` · `apps/web/src/auth/{AuthProvider.tsx,roles.ts,next.ts}` |
| 2 | 目录账号无官方可用凭据行：`accountId` 存**工号**，官方口径为 **`user.id`** ⇒ 官方 `sign-in/username` 对既有账号一律 401 | `apps/server/src/db/seed.ts:59` · 官方 `better-auth/dist/db/internal-adapter.mjs:652-668` |
| 3 | 目录建号走**直写 drizzle**，绕过官方 `databaseHooks` / username 规范化 / 邮箱小写 | `apps/server/src/auth/plugins/ldap-credentials.ts:200-215` |
| 4 | 登录链上仍挂着自绘端点 `signInAih`（本地 + 目录两分支） | `apps/server/src/auth/plugins/ldap-credentials.ts:268` |

### 1.3 批界

本批只做**认证层统一**：账号治理面（用户管理页 / 启停 / 权限码）归 **M4c-2**；外部身份源（社交 provider / Entra ID / 登录页入口）归 **M4c-3**。本批**零新页面 · 零视觉改动**（§10）。

## 2. 拍板结果（本批）

### 2.1 批内决策（B1–B10 · 2026-10-08 批内对齐**全部已确认**）

> 对齐方式：清单一次给全 + **逐条确认**（每条附依据与代价）。

| # | 决策点 | 取值 | 依据 / 代价 |
|---|--------|------|------------|
| B1 | `/api/auth/me` 薄层 | **保留**，对外契约 `{ user, role }` 不变 | 前端会话层改 SDK 后仍消费它做角色显隐；它承接「官方文本档 → 本仓数值档」与 `name → displayName` 的适配，避免适配逻辑散到消费点（34 处） |
| B2 | 401 四分类分流 | **保留在 `apps/web/src/api/client.ts`**，经 SDK `fetchOptions` 钩子注入 | 官方 SDK 的 `redirectPlugin` 只处理 `{url, redirect}` 响应体、不拦 401（主 design §3.1 实测）⇒ 本仓口径可原样实现；`PROTECTED_PREFIXES` / `next` 白名单 / 反向守卫断言全保留 |
| B3 | 迁移载体 | **drizzle SQL 迁移 `0015`**（两条幂等语句）· forward-only | 沿用本仓迁移惯例（`apps/server/drizzle/0000–0014` 全为 SQL）；不做自动回滚，失败即停 + 迁移前快照（主 design §3.5 回滚口径） |
| B4 | 凭据委派行写入时机 | ① **迁移内**为既有目录账号**只补缺** ② **首登建号钩子内**为新账号写入 | 两侧同源（同一封装函数），避免两条写入路径漂移 |
| B5 | `signInAih` 退役顺序 | **同一批内两步**：前端先切官方 SDK → 后端再下线端点 | 防切换期 401 风暴；CLI / 设备授权流走官方端点，不受影响 |
| B6 | 时序侧信道处理 | **随迁**到 `verify` 分支内保留（固定假哈希校验） | 现 `plugins/ldap-credentials.ts:393` 的 `DUMMY_PASSWORD_HASH` 逻辑不得随端点退役丢失（主 design §6.1） |
| B7 | 身份源共享模块落点 | 新文件 `apps/server/src/auth/identity.ts`（自 `plugins/ldap-credentials.ts:166` 的 `ensureDirectoryUser` 抽取/扩展） | 被**官方钩子**调用；不是与官方并行的第二套建号机制（主 design §3.4 定位声明） |
| B8 | 档位适配单点 | 前端 `apps/web/src/auth/roles.ts`：官方 role 文本（`user`/`admin`/`superadmin`）→ 本仓数值档（1/10/100） | `hasRole(role, min)` 对外签名不变（调用点 **21 处**（10 文件）零改签名） |
| B9 | 字段适配 | 前端会话层把官方 `user.name` 映射为 `displayName` | 消费点无感；`/api/auth/me` 形状不变（B1） |
| B10 | 本批 UI 面 | **零新页面**；登录页视觉不动（provider 入口归 M4c-3） | 视觉定稿归各批就地处理（主 design §2.2 铁律） |

## 3. 前端：官方 SDK 三层落点

| 层 | 现状文件 | 目标 | 关键点 |
|----|---------|------|--------|
| 调用层 | `apps/web/src/api/auth.ts`（自绘端点封装） | 改官方 **React 入口 `better-auth/react`** 的 `createAuthClient`（`signIn` / `signOut` / `useSession`） | 基址 `/api/auth` + `credentials: 'include'` **须与 dev 的 CSRF 同源守卫及 `AUTH_TRUSTED_ORIGINS` 白名单对齐**（须含 `http://localhost:5173`，否则 dev 写请求 403） |
| 会话层 | `apps/web/src/auth/AuthProvider.tsx`（自管内部实现） | 改 SDK **`useSession`**（React hook；跨标签页同步经 client core 的 broadcast channel），**保留三态对外契约**（`loading` / `anon` / `authed`） | 服务端维持既有 `disableSessionRefresh`（不延长过期）⇒ 前端**不依赖静默续期**；SDK `refetch` = 「重读状态」，与现语义一致 |
| 交互层 | `apps/web/src/api/client.ts`（401 四分类 + 反向守卫 + `next` 白名单） | **保留**，经 SDK `fetchOptions` 钩子注入（B2） | 官方 `redirectPlugin` 不碰 401（实测） |

**改动面（立项期实测）**：认证相关源文件 **3** 个 · 认证消费点 **14** 文件（实测查询式：从 `auth/{AuthProvider,roles,next}` 导入的模块数）· `useAuth()` / `hasRole()` 调用 **21** 处（10 文件：`useAuth()` 8 + `hasRole()` 13；口径：`grep` 命中 34 行 = 21 调用 + 11 注释 + 2 定义） · 涉及登录态的 dogfood 脚本 **7** 个（`docs/smoke/scripts/*-dogfood.ts`）。

> **依赖声明（本批新增 1 个）**：`apps/web` 加官方 React 入口包 `better-auth@1.7.5`（**exact**，与 `@ai-asset-hub/server` 严格一致；1.7.5 实测 `exports["./react"]` → `dist/client/react/index.mjs`）· 命令 `cd apps/web && bun add better-auth@1.7.5` · **同批提交** `apps/web/package.json` + 根 `bun.lock`（CI `bun install --frozen-lockfile` 校验）· 该包**无 `postinstall`** ⇒ 不动 `bunfig.toml` 的 `trustedDependencies`。
> **认证配置口径（既有事实 · 防按官文误设）**：本仓**不设**官文默认变量 `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`，走**显式选项** —— `secret: env.SESSION_SECRET`（≥32 校验）· `baseURL: env.PUBLIC_BASE_URL`（`apps/server/src/auth/better-auth.ts:73-74`）。前端与 API **dev 同源**（vite proxy `/api` → `localhost:3000` + `changeOrigin: true`）⇒ 官文「同域可省 `baseURL`」适用；`Origin` 仍为 `5173` ⇒ `trustedOrigins` 须含 `http://localhost:5173`。
## 4. 两处适配

| 适配 | 方向 | 落点 | 约束 |
|------|------|------|------|
| 档位适配 | 官方 role 文本 ↔ 本仓数值档 | 前端 `auth/roles.ts`（B8） | `hasRole(role, min)` 签名不变；档位序仍 `user` 1 / `admin` 10 / `superadmin` 100（`apps/server/src/auth/roles.ts` 的 `ROLE_LEVEL` 为同源真值） |
| 字段适配 | 官方 `user.name` → 本仓 `displayName` | 前端会话层（B9）/ `/api/auth/me` 薄层（B1） | 会话用户形状与 `/api/auth/me` 出参**双端一致**，消费点无感 |

## 5. 后端：凭据委派与建号

### 5.1 凭据委派行数据契约

目录账号在 `account` 表补齐一行：

| 字段 | 值 | 说明 |
|------|-----|------|
| `providerId` | `credential` | 官方 `findCredentialAccount` 三条件之一（`better-auth/dist/db/internal-adapter.mjs:652-668`：`userId = ? AND providerId='credential' AND accountId = userId`） |
| `accountId` | **`user.id`** | 官方口径（非工号） |
| `password` | **`ldap:<工号>`** | **非空标记**（非密文）。官方在该值为空时直接返 401，走不到 `verify` ⇒ 必须非空 |

**写入点（M4c-1 T3）**：新账号的委派行由 `identity.ensureDirectoryUser` 在**建号事务内**一并写入（可选入参 `delegatedPassword`）= 与 `user` / 外部身份行**同事务** ⇒ 不存在「用户已建但无凭据行 ⇒ 官方登录永久 401」的半途状态；**存量**账号由迁移 `0015`（§6.2）补齐，两者口径一致。

**本地账号（非目录）同口径**：本仓本地账号登录也走官方 `sign-in/username`（主 design §2.6 R14「用工号单入口」）⇒ 其 `credential` 行**同样满足上述三条件**（`accountId = user.id`），由迁移 `0015`（§6）一并归一。前缀不撞车：官方 scrypt 哈希以 `$` 开头，与 `ldap:` 前缀无重叠（列入验收探针）。

### 5.2 `password.verify` 分支

以本仓函数替换官方 `emailAndPassword.password.verify`，按存值前缀分派：

| 存值形态 | 处理 |
|---------|------|
| `ldap:` 前缀 | 解析出登录名（工号）⇒ 走本仓目录 `bind`（`apps/server/src/auth/ldap.ts`）⇒ 返回布尔；**含时序侧信道等价处理**（B6） |
| 其他（**本仓 scrypt 哈希**） | **保留本仓 `verifyPassword`**（`$scrypt$N$r$p$saltB64$hashB64` 自描述格式；N=131072 · r=8 · dkLen=32）—— ⚠️ **不得**委托官方 `better-auth/crypto` 的 `verifyPassword`：两者格式与参数均不同、互不认（官方 `saltHex:keyHex` · N=16384 · r=16 · dkLen=64 · NFKC），实测官方 verify 在本仓哈希上**抛 `Invalid password hash`** ⇒ 会让存量本地账号全 500（**F279**） |

`password.hash` **保持本仓 `hashPassword` 不变**（库内单一格式）。**「拒绝目录账号改密」不在 hash 分支实现**：`password.hash(password)` 是**全局单参函数、拿不到目标账号身份** ⇒ 一刀拒绝会让所有设密路径失效（官方 sign-up · `/change-password` · M4c-2 的 R21 自助改密）—— 该拒绝落**入口层**（改密端点按目标账号判定 + 明确错误码），见 **F280** 与主 design §2.6 R12 订正。

### 5.3 首登建号：不短路的官方钩子

| 步骤 | 行为 |
|------|------|
| 实现落点 | `apps/server/src/auth/plugins/ldap-credentials.ts` 插件对象的 `hooks.before`（官方插件钩子**并入全局钩子表**并按 `matcher` 判定：`api/dispatch.mjs:157-165`；执行**先于端点 handler 与其自身中间件**：`:210-231`） |
| 触发条件 | 登录名在本仓**无对应用户**（有用户则不介入，直接放行） |
| 登录名护栏 | 不满足官方端点前置校验（长度 **3–30** · 默认校验器 `/^[a-zA-Z0-9_.]+$/`）⇒ **不介入**（否则「先建号、再被官方 422 拒」留下孤儿账号）—— 护栏口径与官方**同源常量**，见 **F281** |
| 动作 | 目录 `bind` 校验口令 ⇒ 成功后经 **§3.4 共享模块**建号 + 补凭据委派行（§5.1，**同事务**）；`created=true` 时写 `AUDIT_ACTIONS.provisionLdap` |
| 返回 | **不返回响应（不短路）** ⇒ 官方端点**自有中间件**照常执行，随后官方端点按常规流程完成登录；bind 失败 / 邮箱缺失或冲突 ⇒ 不建号、不返回 |

**关键约束**：官方 **before 钩子运行在端点自身中间件之前** ⇒ 钩子内短路返回会**绕过**官方校验（主 design §2.5 实测）⇒ 本设计明确要求**不短路**。

⚠️ **口径订正（F283 · 已定案「甲」）**：「不短路」只能保住官方**既有**中间件，而**本批采纳的 `/sign-in/username`（`username` 插件）自身未挂官方的 `formCsrfMiddleware`**（真码对照：核心 `api/routes/sign-in.mjs` / `sign-up.mjs` **都挂了** `use: [formCsrfMiddleware]`，`plugins/username/index.mjs` 的端点**没有**）⇒ 无 cookie 的跨源登录 POST 在该端点**不被强校验**（全局 `originCheckMiddleware` 对无 cookie 请求早退，真码 `api/middlewares/origin-check.mjs`：`validateOrigin` 内 `if (!(forceValidate || useCookies)) return;`）。
**处置（本批 T3 落地）**：插件 `hooks.before` **首条**复用**官方件** `formCsrfMiddleware`，`matcher` = `ctx.path.startsWith('/sign-in/')`（整个登录面；数组顺序 = 执行顺序 ⇒ **CSRF 先于建号钩子**，不通过则零副作用）。
**实测口径（订正）**：官方在**测试环境默认跳过 Origin 校验**（`context/create-context.mjs`：`skipOriginCheck = isTest() ? true : false`）⇒ 不加 `advanced.disableOriginCheck: false` 的「实测 200」**不成立**；本批测试按仓内先例（`app.test.ts:165`）**显式强制校验**后实测：跨源 ⇒ **403** `INVALID_ORIGIN` · `Sec-Fetch-Site: cross-site` + `Mode: navigate` ⇒ **403** `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED`（两条均**零建号**）。

**失败语义**：目录 `bind` 失败 ⇒ 不建号、不返回响应 ⇒ 由官方端点给出统一登录失败响应（不泄露账号存在性）。

### 5.4 身份源共享模块（`apps/server/src/auth/identity.ts`）

承载两条以上通道共用的产品规则（现雏形 = `plugins/ldap-credentials.ts:166`）：

| 职责 | 说明 |
|------|------|
| 身份复用与漂移同步 | 同一 `(providerId, accountId)` 再次登录 ⇒ 复用账号 + 同步显示名 |
| 邮箱归一化与必填（**目录通道**） | 邮箱统一小写；缺失即拒（不合成） |
| 显示名与默认档 | 显示名取自目录属性；默认档 = 用户档 |
| 账号链接策略 | 撞邮箱处置 = **自动链接**（唯一实现处；本批只承载，M4c-3 全量接线） |
| 审计 | 登录来源与结果事件（沿用既有 `auth.login.success` / `auth.login.failed` 动作，**无需新增动作名**） |
| **`username` 全局唯一（隐含约束）** | 建号写 `username = subject`，而官方表约束为 `user_username_unique`（`drizzle/0008_icy_argent.sql:84`）⇒ **Cross-provider 同一 subject 串会撞车**：撞车时既有兜底只回查 `(provider, subject)` / `user.id`，**不覆盖 username 撞车** ⇒ 原始 23505 冒到统一出口 = **500 `{internal_error}`**。本批**不改行为**（T1 = 零行为变化）；候选处置（① subject 加 provider 前缀 ② 撞车回查并返结构化码 ③ 明确声明 subject 需全域唯一）**归 M4c-3 拍板**（**F278**） |

**定位声明**：本模块**不是**与官方并行的第二套建号机制，而是**挂在官方钩子下游**的规则实现 —— 两个入口都是官方的（官方端点上的 `hooks.before` · 官方 provider 的建号流程）。

## 6. 迁移 `0015` 与回滚口径

**载体**：drizzle SQL 迁移（序号 `0015`，文件名由 drizzle-kit 生成）—— 与既有 `0000–0014` 同构；**forward-only · 幂等**。

### 6.0 语句 ⓪：救回「登录名只存在于 `account_id`」的账号（**必须早于 §6.1**）

**依据（M4c-1 T4 执行期发现 · F284）**：官方 `/sign-in/username` **只按 `user.username` 查找**（`normalizer` = 小写，`dist/plugins/username/index.mjs`）⇒ 存量本地账号若 `username IS NULL`（登录名只存在凭据行的 `account_id` —— 旧 `signInAih` 时代即如此，它按 `account_id` 查），§6.1 归一后该登录名在库内**无处可寻** ⇒ 该账号永久 401 且**不可逆**。

```sql
UPDATE "user" u
SET "username" = lower(a."account_id"),
    "display_username" = a."account_id"
FROM "account" a
WHERE a."user_id" = u."id"
  AND a."provider_id" = 'credential'
  AND u."username" IS NULL
  AND a."account_id" IS DISTINCT FROM u."id"
  AND a."account_id" <> '';
```

**口径**：`username` 存**小写**（对齐官方查找语义）· `display_username` 保留原样（官方 display 归一缺省 = 恒等）。**安全性**：`IS DISTINCT FROM u."id"` 天然排除「`account_id` 已 = `user.id`」的随机 token 夹具行。

### 6.1 语句 ①：`credential` 行 `accountId` 语义归一（工号 → `user.id`）

```sql
-- 官方 findCredentialAccount 的三条件要求 account_id = user_id
-- （better-auth/dist/db/internal-adapter.mjs:652-668）
UPDATE "account"
SET "account_id" = "user_id"
WHERE "provider_id" = 'credential'
  AND "account_id" IS DISTINCT FROM "user_id";
```

### 6.2 语句 ②：为既有目录账号补齐凭据委派行（只补缺）

```sql
-- 目录账号判定 = 存在 provider_id ∈ ('ldap','oidc') 的行（0009 迁移 ③ 由 identity_binding 搬入）
-- 登录名择优：优先 ldap 行的 account_id（与 0009 同款 LATERAL 排序），无则取 oidc 行
INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
SELECT
  'cred-' || u."id",
  u."id",
  'credential',
  u."id",
  'ldap:' || d."account_id",
  now(),
  now()
FROM "user" u
JOIN LATERAL (
  SELECT a2."account_id"
  FROM "account" a2
  WHERE a2."user_id" = u."id" AND a2."provider_id" IN ('ldap', 'oidc')
  ORDER BY (a2."provider_id" = 'ldap') DESC, a2."id" ASC
  LIMIT 1
) d ON true
WHERE NOT EXISTS (
  SELECT 1 FROM "account" a
  WHERE a."user_id" = u."id" AND a."provider_id" = 'credential'
);
```

### 6.3 口径与边界

| 项 | 口径 |
|----|------|
| 幂等 | ⓪ 靠 `u.username IS NULL`；① 靠 `IS DISTINCT FROM`（重跑零影响）；② 靠 `NOT EXISTS`（已存在 `credential` 行则跳过 ⇒ **不覆盖本仓本地账号的真实口令行**） |
| **语句顺序** | **不可交换**：⓪ 必须早于 ①（① 归一 `account_id` 后就取不到原登录名）③ | 三条同属一个迁移文件 ⇒ 单事务原子（`drizzle-orm/pg-core/dialect.cjs:62-73` 的 `session.transaction`） |
| **登录名保全** | 存量本地账号登录名若只存在于 `credential.account_id`（`username IS NULL`）⇒ 由 ⓪ 回填 `user.username = lower(account_id)`（**F284**）；迁移**不得**丢登录名 |
| 全新库 / 空库 | 两条语句**自然零命中**（幂等迁移的期望行为），无需特判 |
| 不改哈希 | 不动任何既有 `password` 值；语句 ② 只**新增**标记行 |
| 目录登录名取自 | 该账号的 **ldap 行 `account_id`**（= 目录 subject，惯例 `sAMAccountName`）；仅 OIDC 行时取其 subject |
| OIDC-only 账号 | 若其 subject 非可 bind 的目录登录名 ⇒ **口令路径对其不适用**（该账号走重定向通道登录，M4c-3 接线）—— 迁移照常补行（`verify` 分支对其返回失败，不泄露账号存在性） |
| 执行窗口与并发 | 迁移在**停服窗口**执行（服务停写）；执行后**立即**跑 §6.4 P1 / P2 复核，并以「`credential` 行按 `user_id` 唯一」作为**重复插入兜底判据** —— 兜住「迁移与首登建号钩子并发」的 `NOT EXISTS` 竞态 |
| **载体登记** | 手写 SQL **必须**同步登记 `drizzle/meta/_journal.json`（`idx` 顺延 · `tag` = 文件名去扩展名）并落 `meta/0015_snapshot.json` —— `apps/server/src/db/migrate.ts:12` 走 drizzle-orm `migrate()`，**只读 journal、不扫 `.sql` 目录** ⇒ 漏登记则迁移**静默不执行**；先例 `0009_auth_user_domain_data_move` 即此形态（journal 已登记 + 快照存在） |
| **schema 变更** | 本批 **零 schema 变更**（`0015` = **数据迁移**）⇒ **不跑**官方 CLI `auth generate` / `migrate`，沿用 `0007` / `0009` **手写 SQL** 先例；官方 CLI 姿势（`bun x auth@latest generate --adapter drizzle --dialect pg --output <仓外>` + 临时 `--config`，因本仓 auth 实例导出名 `authOptions/createAuth/gAuth`-style **不符官文约定**）仅在**未来 schema 变更**时启用（M4b-pre 有可复现记录） |
| 失败处置 | 失败即停并保留现场；迁移前对 `user` / `account` 两表做一次快照备份 |
| 顺序 | `user.status` 列归 **M4c-2**，本批不动（避免同批混两次迁移） |

### 6.4 验收探针（迁移后断言）

| # | 断言 |
|---|------|
| P1 | 归一零例外：`SELECT count(*) FROM "account" WHERE provider_id='credential' AND account_id IS DISTINCT FROM user_id` = **0** |
| P2 | 完整性：每个「有 ldap/oidc 行」的用户**恰有 1 行** `credential` 行（`credential` 行按 `user_id` 唯一） |
| P3 | 幂等：**连跑两次** `db:migrate`，第二次零插入 |
| P4 | **登录名合规（F281）**：credential 账号的 `username` 不匹配 `/^[a-zA-Z0-9_.]+$/` 或长度不在 3–30 的计数。⚠️ 只在**干净环境**期望 0；dev 库含夹具（随机 token 行 `username IS NULL` · `usr_<uuid>` 形态超长）⇒ 判据改为**形态拆解**（真员工账号 = 0），不合规清单只出**订正清单**不动数据 |
| P5 | **登录名保全（F284）**：`SELECT count(*) FROM "user" u JOIN "account" a ON a.user_id=u.id WHERE a.provider_id='credential' AND u.username IS NULL AND a.account_id IS DISTINCT FROM u.id` = **0**（迁移后不应再有「登录名只在 `account_id`」的账号） |
| P6 | 载体已登记：`meta/_journal.json` 条目数 = **16** 且含 `0015_*` tag；`meta/0015_snapshot.json` 存在 |

## 7. 退役 `signInAih`：调用点切换顺序

| 步 | 动作 | 前置 |
|----|------|------|
| 1 | 前端调用层切到官方 SDK（§3），`signInAih` 调用点**归零**（grep 断言） | — |
| 2 | 后端下线 `POST /api/auth/sign-in/aih`（本地 + 目录两分支） | 步 1 完成且 dogfood 全绿 |

端点退役后：CLI 令牌面 / 设备授权流（`/device`）走官方端点，**不受影响**（本批仅回归验证）。

## 8. 安全

| 项 | 处理 |
|----|------|
| 时序侧信道 | 目录 `bind` 耗时显著高于本地 scrypt ⇒ 保留等价耗时处理（`DUMMY_PASSWORD_HASH` 随迁，B6），不得凭响应时间区分「目录账号 / 本地账号 / 账号不存在」 |
| 防枚举 | 用户不存在 / 口令错 ⇒ **同一官方错误码**；首登建号失败不得返回差异化信息 |
| CSRF / Origin | 钩子**不短路**以保住官方校验；dev 侧 `AUTH_TRUSTED_ORIGINS` 须含前端源（§3）。**补强（F283 · 已定案甲）**：官方 `formCsrfMiddleware` 未挂在 `username` 插件端点上 ⇒ 本插件 `hooks.before` **首条**复用该官方件、`matcher` 覆盖 `/sign-in/*`（先于建号钩子）⇒ 跨源 / Fetch Metadata 跨站导航一律 **403** 且零副作用（强制校验口径下实测） |
| 口令流转 | 口令只在验证路径内存中流转：不落盘、不进日志、不进响应体 |

> **承接（plan）**：本表四条 —— 「时序侧信道」→ plan **T2**（步骤 2 + 断言 ③）· 「CSRF / Origin」→ plan **T3**（不短路）+ **T5**（前置探针）· 「**防枚举**」与「**口令流转**」→ plan **T7**（断言 ② / ③）。
## 9. 接口变更总览（服务端面）

| 变更 | 类型 | 说明 |
|------|------|------|
| `POST /api/auth/sign-in/aih` | **退役** | 本地 + 目录登录改由官方 `sign-in/username` 承担（§7） |
| `account` 行语义 | **数据迁移 `0015`** | 凭据行 `accountId` → `user.id`；目录账号补标记行（幂等） |
| `REGISTRATION_ENABLED` 默认值 | **变更** | 默认 `true` → **`false`**（自助注册默认关闭；`apps/server/src/config/env.ts:35` · `apps/server/src/auth/better-auth.ts:80`） |
| 认证错误码 | **收敛** | 删 7 个自绘码、留 5 个（主 design §4.6 / §2.6 R18） |
| `/api/auth/me` 薄层 | **不变** | 形状 `{ user, role }` 保持（B1） |

> **承接（plan）**：本表五项 —— 「`POST /api/auth/sign-in/aih` 退役」→ plan **T6** · 「`account` 行语义（迁移 `0015`）」→ plan **T4** · 「**`REGISTRATION_ENABLED` 默认值**（`true` → `false`）」→ plan **T7**（步骤 4 + 断言 ④）· 「认证错误码收敛」→ plan **T7** · 「`/api/auth/me` 薄层不变」→ plan **T5**（B1）。
## 10. UI-UX 变动总览

- **零新页面 / 零视觉改动**：登录页版式与视觉不变（provider 入口归 M4c-3）。
- 视觉基线引 `2026-09-09-m4a-marketplace-portal-design.md` §4.4（全站视觉真值 SSOT）—— **不复制**。
- 前端改造面 = 认证三件（`auth/{AuthProvider.tsx,roles.ts,next.ts}`）+ `api/auth.ts` + `api/client.ts`（401 钩子注入），**用户可见行为约定不变**（登录 / 登出 / 401 分流 / 角色显隐）。

> **承接（plan）**：本节三项 —— 「**零新页面 / 零视觉改动**」→ plan **T5**（**断言 ⑤**：`apps/web/src/pages/` 零新增文件 · `pages/Login.tsx` 本批零改动 · 视觉基线引 M4a §4.4 不动）· 「前端改造面五件」（`auth/{AuthProvider.tsx,roles.ts,next.ts}` + `api/auth.ts` + `api/client.ts`）→ plan **T5**（步骤 2/3/4）· 「用户可见行为约定不变」→ plan **T5** 断言 ③ + **T8** 等价判据。
## 11. 线框图

**N/A** —— 本批无新增 / 改造页面（登录页形态不动，§10）。

## 12. 等价完成判据（引主 design §15）

三层硬判据（主 design §2.6 R16）：

1. `hasRole(role, min)` / `useAuth()` **对外签名不变**（调用点 **21 处** · 10 文件：`useAuth()` **8** + `hasRole()` **13**；口径：`grep -rn 'useAuth(\|hasRole(' apps/web/src` 命中 34 行 = 21 调用 + 11 注释 + 2 定义）。
2. 401 四分类 + 反向守卫 + `next` 白名单的**既有断言全绿**（`apps/web/src/api/client.ts`）。
3. 涉及登录态的 **7 个 dogfood 脚本全绿** + `signInAih` 调用点 **grep 归零**。

**验收探针**：上述三条以脚本断言；另加 §6 的两条迁移断言。

## 13. 实施期发现与处置（F…）

> 依 `docs/designs/README.md`：F 号全局连续 · 明细主家 = 本节 · 跨批总览（指针表）在 `docs/README.md` §6.1。

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| F267 | 权限码 | 权限码表缺 `session` 资源与 `set-password` ⇒ 官方 `list-user-sessions` / `revoke-user-sessions` 开箱 403 | 归 M4c-2（`session:['revoke']`） |
| F268 | 认证门 | 官方认证面不读本仓 `status` 列（`apps/server/src/app.ts:148` 无状态门） | 本批（启停判定改读官方 `banned` 后自然消除，落 M4c-2 收口） |
| F269 | 建号 | 官方 `create-user` body **无 `username` 字段**（`email` 必填且强制小写）；`password` 可选；官方 username 插件**无 `set-username` 端点** | 本批（建号钩子内写规范化 `username`）· 管理面落 M4c-2 |
| F270 | 列表 | 官方 `list-users` 异常吞错返空列表；`searchField` 需白名单 | 归 M4c-2 |
| F271 | 规范 | `docs/05-identity-access.md` §4 缺「策略 → 准入结果」映射表 | 归 M4c-2 |
| F272 | 文档 | `docs/plans/M4b-4-me-assets-and-console.md:395` 措辞不实 | 本批收尾订正 |
| F273 | 账号行 | 本仓凭据行 `accountId = 工号` 与官方口径 `accountId = user.id` 不一致 ⇒ 官方端点对既有账号 401 | 本批（迁移 `0015` §6） |
| F274 | 建号路径 | 目录建号直写 drizzle，绕过官方 `databaseHooks` / username 规范化 / 邮箱小写 | 本批（§5.3 钩子 + §5.4 共享模块） |
| F275 | 钩子时序 | 官方 before 钩子运行在端点自身中间件**之前** ⇒ 钩子内短路会绕过官方 Origin / CSRF 校验 | 本批（§5.3 明确不短路） |
| F276 | 钩子限制 | 官方 after 钩子只能改写响应体 / 头，**改不了 HTTP 状态码** | 本批（据此确立：登录链必须走官方 `password.verify` 分支，而非响应层兜底） |
| F277 | 迁移载体 | 手写迁移 `0015` 若**只落 `.sql` 不登记** `drizzle/meta/_journal.json`（及 `meta/0015_snapshot.json`）⇒ `db:migrate`（drizzle-orm `migrate()` 只读 journal）**静默跳过**该迁移 | 本批（plan T4 步骤 2 落载体 + 断言 ⑥；§6.3 载体登记行 + §6.4 P4 探针） |
| F278 | 建号约束 | 建号写 `username = subject`，官方表 `user_username_unique` 全局唯一 ⇒ **跨通道同 subject 串撞车**时既有兜底不覆盖（只回查 `(provider, subject)` / `user.id`）⇒ 原始 23505 冒到统一出口 = **500**（非结构化码）。LDAP 工号（8 位数字）与社交/OIDC 的数字 sub 存在真实撞车面 | 归 **M4c-3**（候选：subject 加 provider 前缀 / 撞车回查并返结构化码 / 声明 subject 全域唯一）· 本批仅登记 + §5.4 记约束 |
| F279 | 口令校验口径 | 「`password.verify` 其他分支 ⇒ 委托官方 `better-auth/crypto` 的 `verifyPassword`」**不可实施**：官方（`saltHex:keyHex` · N=16384 r=16 dkLen=64 · NFKC 归一）与本仓（`$scrypt$N$r$p$saltB64$hashB64` · N=131072 r=8 dkLen=32）格式与参数**均不同、互不认**；实测反控 = 官方 verify 在本仓哈希上 **抛 `Invalid password hash`** ⇒ 照做 = 存量本地账号（seed/夹具/生产）**一律 500** + 违反 R10 零重置 | 本批订正：非 `ldap:` 分支**保留本仓 `verifyPassword`**（净新增仅「`ldap:` 前缀」一条路径）；T2 断言含**存量零回归**反证 |
| F280 | 改密拒绝机制 | 「`password.hash` 分支 = 显式拒绝」**机制错**：`password.hash(password)` 为**全局单参函数**（官真实码 `dist/api/routes/password.mjs:162`），**拿不到目标账号** ⇒ 一刀拒绝会失效**所有**设密路径（官方 sign-up · `/change-password` · M4c-2 的 R21 自助改密）。原意（R12：管理员对目录账号改密 ⇒ 明确错误码）正确，**落点错** | 本批订正：`hash` **保持本仓 `hashPassword` 不变**；「拒绝目录账号改密」落**入口层**（按目标账号判定），实现归 **M4c-2**（R21/R12 接线时） |
| F281 | 用户名合规 | 官方 `username` 默认校验器 = `/^[a-zA-Z0-9_.]+$/`（长度 3–30，**不接受 `-`**；`dist/plugins/username/index.mjs:12-14,31-40`）⇒ 既有账号若登录名含其他字符（如连字符）会被官方 `sign-in/username` **422 `INVALID_USERNAME`** 拒（工号形态安全） | 本批登记 + 建议 **T4 探针加「全量 `credential` 行登录名合规」断言**（不合规者需数据订正）· T2 直测已按该规则造数 |

| F282 | 审计面 | T6 退役 `signInAih` 后，`auth.login.success` / `auth.login.failed` **零消费点**（全仓仅 `plugins/ldap-credentials.ts` 在写；`apps/server/src/app.ts` 包装层只管 `logout` / device 三件）⇒ 官方 `sign-in/username` 路径无登录审计 | 归 **T6**（退役同批补官方路径审计；落点候选 = 官方 `hooks.after` 或 `app.ts` 包装层加 `/sign-in/*` 分支） |
| F283 | CSRF / Origin | 本批采纳的 `/sign-in/username`（`username` 插件端点）**自身未挂**官方 `formCsrfMiddleware`（核心 `api/routes/sign-in.mjs` / `sign-up.mjs` 都挂了 ⇒ 仅该插件端点缺口）；全局 `originCheckMiddleware` 对**无 cookie** 请求早退（`validateOrigin` 内 `if (!(forceValidate || useCookies)) return;`）⇒ 无 cookie 的跨源登录 POST 不被强校验（**源码判定**；测试环境下 better-auth 默认跳过 Origin 校验 ⇒ 实测须显式 `advanced.disableOriginCheck:false`） | **已定案「甲」并落地（T3）**：插件 `hooks.before` **首条**复用官方 `formCsrfMiddleware`，`matcher` = `/sign-in/*`（先于建号钩子 ⇒ 不通过零副作用）；平价探针 **⑧⑨⑩**（强制校验口径下实测 403 + 零建号） |

| F284 | 迁移丢登录名 | `0015` §6.1 把 `credential.account_id` 归一为 `user.id` 时，**`user.username IS NULL` 的存量本地账号会失去登录名**（其登录名只存在 `account_id`；官方 `/sign-in/username` 只按 `username` 查）⇒ 归一后**不可逆**地登不进来（旧 `signInAih` 按 `account_id` 查故此前可用）。dev 库实测：368 个 `username IS NULL` 的 credential 账号中 **365** 已 `account_id = user.id`（随机 token 夹具，无影响）· 真正受影响 **3** 个（`admin` / `smoke-uploader` / `smoke-admin`）· 本机 dev 无任何真员工账号（`username ~ '^[0-9]{6,10}$'` 命中 0），但生产/其他环境可能有 | **本批已修**：`0015` 增 **§6.0 语句 ⓪**（**早于 ①** 回填 `username = lower(account_id)` · `display_username` 原样 · `IS DISTINCT FROM u.id` 排除夹具行）+ 探针 **P5** |

## 14. i18n 变更规格

### 14.1 i18n 组与键

| 组 | 变更 |
|----|------|
| `auth` / `errors` | **删除 7 条**错误码文案（主 design §4.6 / §2.6 R18）：`auth.user_pending` · `auth.user_disabled` · `auth.invalid_credentials` · `auth.ldap_denied` · `auth.email_conflict` · `auth.oidc_state_mismatch` · `auth.oidc_denied`（zh / en **各 1 条**，与主 design §11 一致） |
| `auth` | **保留 5 条**：`auth.email_missing` · `auth.rate_limited` · `auth.csrf_failed` · `auth.session_expired` · `auth.forbidden` |
| 登录失败映射 | 改官方错误码：**已封禁**明确提示（官方 `BANNED_USER` + 中文 `bannedUserMessage`，主 design §6.2）；其余登录失败**统一码**（不泄露存在性）⇒ 前端映射表调整，`07` §4 同步 |
| 连带 | 涉及登录失败的 dogfood 断言随改（与 §15 的 7 脚本同批）；`auth` 组新增 / 删除键**双语双向差集为 0** |

### 14.2 规范同步项（本批触发的规范落点）

| 规范 | 同步内容 | 时点 |
|------|---------|------|
| `05` §3.1 | 目录通道命名口径：**企业目录口令验证**（非 SSO） | 本批落地时 |
| `08` §5 | `account` 行 `accountId` 语义（= `user.id`）与**凭据委派标记行**口径 | 本批落地时 |
| `07` §4 | 错误码收敛后的映射表（删 7 留 5） | 本批落地时 |

> 其余规范行（`05` §4.1 账号状态「三态单列」→ 官方封禁三件套 · `05` §4 准入结果收敛等）**触发批为 M4c-2**，见主 design §14。

## 15. 回归面与验证口径

| 项 | 口径 |
|----|------|
| 门禁 | 沿用仓库既有门禁序列（12 步 · 见各批证据文件实跑记录）+ 文档四门禁；**提交前逐项 exit 0** |
| 零回归（硬约束） | 门户 `m4a-dogfood` 与既有各批 dogfood 全绿；控制台**零视觉改动** |
| 本批 dogfood | 涉及登录态的 **7 个 `*-dogfood.ts`** 全绿 + `signInAih` 调用点 **grep = 0**（主 design §2.6 R16） |
| 等价判据 | §12 三层硬判据 + §6 两条迁移断言 |
| 造数需求 | **无**（迁移 `0015` 直接作用于既有库；如需造数须单独授权） |
| 出口件 | ① 本 design 8 维 ≥9 定稿 ② 批 plan Task 全绿 ③ 门禁 ④ dogfood（本批**零 UI ⇒ 观感 N/A**）⑤ 整体审计无未决项 |

## 16. 引用文件清单

**规范层**：`docs/05-identity-access.md` §3（身份源）/ §4（账号状态）· `docs/08-data-model.md` §5 · `docs/07-i18n-conventions.md` §3 / §4。
**设计层**：主 design `2026-10-08-m4c-account-and-access-governance-design.md` §3.0–§3.5 / §8 / §15 · `2026-09-09-m4a-marketplace-portal-design.md` §4.4（视觉 SSOT，本批零视觉改动仅引用）· `2026-09-15-m4b-pre-auth-migration-design.md`（认证整车迁移结论；其 R5 已被本里程碑 D3 推翻）。
**代码锚点（前端）**：`apps/web/src/auth/{AuthProvider.tsx,roles.ts,next.ts}` · `apps/web/src/api/auth.ts` · `apps/web/src/api/client.ts`（401 四分类 + 反向守卫 + `next` 白名单）。
**代码锚点（后端）**：`apps/server/src/auth/better-auth.ts` · `apps/server/src/auth/plugins/ldap-credentials.ts`（`:166` `ensureDirectoryUser` · `:200-215` 直写建号 · `:268` `signInAih` · `:393` `DUMMY_PASSWORD_HASH`）· `apps/server/src/auth/ldap.ts` · `apps/server/src/auth/roles.ts` · `apps/server/src/auth/errors.ts` · `apps/server/src/config/env.ts:35` · `apps/server/src/db/seed.ts:59` · `apps/server/src/db/schema/auth.ts`。
**上游事实（`better-auth@1.7.5`，实位于 `node_modules/.bun/`）**：`better-auth/dist/db/internal-adapter.mjs:652-668`（`findCredentialAccount` 三条件）· `better-auth/dist/plugins/username/index.mjs`（`sign-in/username` 链路）· `better-auth/dist/api/dispatch.mjs`（钩子时序）· `better-auth/dist/crypto/password.mjs`（`verifyPassword`，exports 含 `./crypto`）· `@better-auth/core/dist/social-providers/`（M4c-3 用）。

## 17. 8 维自检

### 17.1 首稿自检（口径：8 维等权算术平均 = 标准 4 维 + 深度 4 维）

| 维度 | 分 | 依据 |
|------|:--:|------|
| 完整性 | 8.5 | 批内决策 B1–B10 / 三层落点 / 后端三件 / 迁移 / 退役顺序 / 安全 / 判据 / F 登记齐；**缺** i18n 变更规格 · 回归面与验证口径 · 引用文件清单（骨架 7 段未满） |
| 一致性 | 9.5 | 与主 design §3.0–§3.5 逐条对齐（分层归属 / 不短路 / 自动链接定位声明 / 迁移口径），无相悖表述 |
| 清晰度 | 9.0 | 契约表化；迁移与钩子时序为「条件 + 行为」两级表述 |
| 可实施性 | 8.5 | 迁移仅给**条件形态**未给完整语句 · dogfood 分组未定 · `ldap:` 前缀撞车未断言 |
| 设计纯粹性 | 9.5 | 零自绘端点（退役 `signInAih`）；共享模块定位声明明确「挂在官方钩子下游」 |
| 边界覆盖 | 9.0 | 未覆盖：**全新库**（无既有账号）迁移行为 · `ldap:` 前缀与真实哈希撞车 · **本地账号**（非目录）行是否满足三条件 |
| 实施精度 | 9.0 | 落点 / 契约 / 判据可定位；上游引用带包路径 |
| 跨平台 | 9.5 | 无平台差异面；本批不涉迁移执行差异（数据面） |

**标准 4 维 8.625 ｜ 深度 4 维 9.25 ｜ 综合 8.94**

### 17.2 首稿发现与处置（本轮）

| 类 | 项 | 处置 |
|----|----|------|
| ⚪ 缺 | 骨架 7 段未满：无 i18n 规格 / 回归口径 / 引用文件清单 | **本轮补**（§14 / §15 / §16） |
| 🟡 | 迁移只给条件形态 | 处置：**批内对齐**时补完整幂等语句（§6） |
| 🟡 | dogfood 分组未定（7 脚本如何分段） | 处置：批 plan 承载（属实现细则） |
| ⚪ | 边界三项（新库行为 / 前缀撞车 / 本地账号行） | 处置：**新库零命中 = 幂等自然结果**（写入 §6 口径）· **前缀不撞车**（scrypt 以 `$` 开头）+ **本地账号同三条件**（写入 §5.1）⇒ 两项本轮已补，一项（新库）写入 §6 |

### 17.3 处置后重评

| 维度 | 首稿 | 处置后 |
|------|:---:|:-----:|
| 完整性 | 8.5 | **9.5**（三节补齐） |
| 一致性 | 9.5 | 9.5 |
| 清晰度 | 9.0 | 9.5（迁移口径两级 + 前缀断言） |
| 可实施性 | 8.5 | **9.0**（迁移完整语句仍待批内对齐补） |
| 设计纯粹性 | 9.5 | 9.5 |
| 边界覆盖 | 9.0 | **9.5**（三项边界均落判据或口径） |
| 实施精度 | 9.0 | 9.0（迁移语句待补） |
| 跨平台 | 9.5 | 9.5 |

**标准 4 维 9.375 ｜ 深度 4 维 9.375 ｜ 综合 9.38**

### 17.4 未决 / 缺口登记（含归属）

| 项 | 归属 |
|----|------|
| 迁移 `0015` 幂等语句 | **已闭环（2026-10-08）** —— 见 §6.1 / §6.2 两条可落盘 SQL + §6.4 验收探针 P1–P3 |
| dogfood 7 脚本的分段与断言改造清单 | 批 plan |
| 官方 SDK 与 dev CSRF 同源守卫的联调验证（`AUTH_TRUSTED_ORIGINS` 实测） | 实现期首批 Task（前置探针） |

### 17.5 检查修复轮复评（换靶 6 条修复后 + F7）

| 维度 | 17.3 后 | 换靶检查 | 修复后 | 变动理由 |
|------|:------:|:-------:|:-----:|---------|
| 完整性 | 9.5 | 9.0 | **9.5** | §14.2 规范同步项补齐 · 骨架对齐同仓先例（§1 分 1.1/1.2/1.3 · §2 更名「拍板结果（本批）」） |
| 一致性 | 9.5 | 8.5 | **9.5** | 355 行 / 18 节实测与声明一致 · §17.4 未决行闭环 · `docs/00` §5 子行与主 design 登记行同步 |
| 清晰度 | 9.5 | 9.0 | **9.5** | 章节命名与结构对齐先例 |
| 可实施性 | 9.5 | 9.5 | **9.5** | §6 两条可落盘 SQL + P1–P3 探针，无退化 |
| 设计纯粹性 | 9.5 | 9.0 | **9.5** | 清除对已否路线的点名（纪律项） |
| 边界覆盖 | 9.5 | 9.5 | **9.5** | **F7**：补「迁移执行窗口与并发」口径（停服窗口 + P1/P2 复核 + `user_id` 唯一兜底） |
| 实施精度 | 9.5 | 9.5 | **9.5** | 无变动 |
| 跨平台 | 9.5 | 9.5 | **9.5** | 无变动 |

**标准 4 维 9.50 ｜ 深度 4 维 9.50 ｜ 综合 9.50**
> **同分不同构成声明（v0.5 · 纪律项）**：综合仍 **9.50**，但**构成与 v0.4 不同** —— v0.4 的 9.50 含两条本轮才检出的缺陷（「34 处调用点」口径失真 · 手写迁移未登记 `_journal.json` 的载体缺口）；v0.5 已补齐（§6.3 载体登记行 + §6.4 **P4** · §12 口径坐实 · §13 **F277**）。故此处 9.50 = 修复后实测，**非**沿用上轮虚高分。

## 18. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.14 | 2026-10-09 | **T4 迁移增语句 ⓪（F284 登录名保全）** —— ① 新增 **§6.0**（`UPDATE "user" u SET username = lower(a.account_id), display_username = a.account_id FROM account a WHERE … u.username IS NULL AND a.account_id IS DISTINCT FROM u.id AND a.account_id <> ''`），**必须早于 §6.1** ② §6.3 增两行（语句顺序不可交换 · 登录名保全）+ 单事务原子依据 ③ §6.4 探针 **P1–P6**（P4 合规判据改形态拆解 · 新增 P5 登录名保全）④ §13 登记 **F284**（dev 库取证：368 个 NULL username 中 365 为随机 token 夹具、真正受影响 3 个；本机无真员工账号） |
| v0.13 | 2026-10-09 | **F283 定案「甲」+ 口径订正** —— ① §5.3 决策段改**已定案甲**（`hooks.before` 首条复用官方 `formCsrfMiddleware` · `matcher` `/sign-in/*` · 先于建号钩子）② 精确化：核心 `api/routes/sign-in.mjs` / `sign-up.mjs` **自带**该中间件，仅 `username` 插件端点缺 ③ 实测口径订正：官方测试环境 `skipOriginCheck = isTest() ? true : false` ⇒ 原「跨源实测 200」**不成立**；显式 `advanced.disableOriginCheck:false` 后实测 **403**（`INVALID_ORIGIN` · `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED`）+ 零建号 ④ §8 CSRF 行 → **已闭环** |
| v0.12 | 2026-10-09 | **T3 落地 + F282/F283 登记** —— ① §5.1 增**委派行写入点**（`identity.ensureDirectoryUser` 建号事务内写 `credential` 行；可选入参 `delegatedPassword`）② §5.3 表增三行（**实现落点** = 插件 `hooks.before`（真码 `api/dispatch.mjs:157-165` / `:210-231`）· **登录名护栏** 3–30 + `/^[a-zA-Z0-9_.]+$/`（F281）· **`provisionLdap` 审计**）③ **§8 CSRF/Origin 行订正**（原「不短路以保住官方校验」不完备）+ **F283** ④ §13 登记 **F282**（T6 后登录审计零消费点 → 归 T6）· **F283**（官方登录端点 cookieless 请求无 Origin/CSRF 强校验 ⇒ 跨源登录 POST 实测 **200**；修法甲/乙/丙 **待拍板**）⑤ 代码：`identity.ts` 220 行 · `plugins/ldap-credentials.ts` 369 行 · 新增直测 9 例 + `identity.test.ts` 2 例 |
| v0.11 | 2026-10-09 | **F281 登记（T2 测试附带发现）** —— 官方 `username` 默认校验器 `/^[a-zA-Z0-9_.]+$/`（长度 3–30 · **不收 `-`**；`dist/plugins/username/index.mjs:12-14,31-40` 真码）⇒ 既有账号登录名含其他字符时会被官方 `sign-in/username` **422 `INVALID_USERNAME`** 拒（**工号形态安全**）。本批**仅登记**；处置建议 = T4 探针加「全量 `credential` 行登录名合规」断言（不合规者数据订正）。来源：T2 直测首次以 `pwv-xxxx` 造数触发 422，实测坐实 |
| v0.10 | 2026-10-09 | **T2 契约口径订正 + F279/F280 登记**（用户「全修」）—— 🔴 **F279**：§5.2「其他（官方 scrypt 哈希）⇒ 委托官方 `better-auth/crypto` 的 verifyPassword」**不可实施**（官 方/本仓格式参数互不认；实测反控 = 官方 verify 在本仓哈希上 **THREW `Invalid password hash`**）⇒ 订正为**保留本仓 `verifyPassword`**（N=131072 r=8 dkLen=32 · `$scrypt$…` 自描述）· 🔴 **F280**：§5.2 末行「`password.hash` 分支 = 显式拒绝」机制错（全局单参函数 ⇒ 失效所有设密路径，含 R21 自助改密）⇒ 订正为 `hash` 保持本仓 `hashPassword` + 拒绝落**入口层**（实现归 M4c-2）· 证据：`better-auth/dist/crypto/password.mjs`（委托 `@better-auth/utils/password`，格式 `salt:key`）· `@better-auth/utils/dist/password.node.mjs`（N=16384 r=16 dkLen=64）· 临时探针正反双证（已删） |
| v0.9 | 2026-10-09 | **T1 落地回填 + F278 登记** —— ① §5.4 表增「`username` 全局唯一（隐含约束）」行（跨通道同 subject 撞车 ⇒ 500；处置归 M4c-3，含三个候选）② §13 登记 **F278** —— 由 T1 的模块直测（`identity.test.ts` 第 ⑧ 例「同 subject 不同 provider 不误复用」）稳定照出：单例重跑必失败，非 flaky ⇒ 该例按用户拍板**移除**（T1 承诺零行为变化，修它需先定规则）③ 实测依据：`0008_icy_argent.sql:84` `user_username_unique` · `app.ts:105-124` 统一出口（非 AuthError/AssetError/ReviewError/LabelError ⇒ 500 `internal_error`） |
| v0.8 | 2026-10-08 | **官方安装页对账（跨文档）** —— 读完官文 `/docs/installation` 后：① §3 表订正入口名（vanilla `better-auth/client` → 官方 **React 入口 `better-auth/react`**，官文点名；实测 `exports["./react"]` 存在且 `useSession` 为 React hook + `useStore`；vanilla 的 `useSession` 是 `Atom<{data,error,isPending}>`）② §3 表后补「依赖声明」（exact · `bun.lock` 同批 · 无 `postinstall`）与「认证配置口径」（不设 `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`，走显式 `secret`/`baseURL`）③ §6.3 增「schema 变更」行（本批零 schema 变更 ⇒ 不跑官方 CLI）。**零实现改动 · 分数不变（9.50）** |
| v0.7 | 2026-10-08 | **§10 承接指针** —— plan 复核轮 **R4** 指出本件 §10「零新页面 / 零视觉改动」在 plan 无承接 ⇒ §10 表后补「**承接（plan）**」行（零视觉声明→plan **T5 断言 ⑤** · 前端改造面五件→plan T5 · 行为约定不变→plan T5 断言 ③ + T8）。**零实现改动 · 分数不变（9.50）** |
| v0.6 | 2026-10-08 | **承接指针补齐（plan 侧对账驱动）** —— 第二轮 plan 抽查（R2）指出「本件已写项在 plan 无承接」⇒ §8 表后补「**承接（plan）**」行（四条逐项→T2/T3/T5/T7）· §9 表后补「**承接（plan）**」行（五项逐项→T4/T5/T6/T7，含 **`REGISTRATION_ENABLED` 默认值 → T7 步骤 4 + 断言 ④**）。**零实现改动 · 分数不变（9.50）** |
| v0.5 | 2026-10-08 | **抽查修复轮（跨文档换靶 · 命中 P1/P4）** —— 🔴 **P1** 手写迁移**载体登记**缺口：§6.3 增「载体登记」行（`_journal.json` + `0015_snapshot.json`；`migrate.ts:12` 只读 journal 实证）+ §6.4 增 **P4** 探针 ⇒ 登记 **F277**（§13）· 🟡 **P4** §12 判据 ① 口径坐实（调用点 **21 处 / 10 文件** = `useAuth()` 8 + `hasRole()` 13；grep 34 行 = 21 + 11 注释 + 2 定义）· §17 加**同分不同构成声明**。**零实现改动** |
| v0.4 | 2026-10-08 | **检查修复轮（换靶 6 条）** —— 🔴 ① §17.4 未决登记首行已过期（迁移语句已补）⇒ 改**已闭环**；🟡 ② 新增 **§14.2 规范同步项**（本批触发 `05` §3.1 / `08` §5 / `07` §4 三处）③ 章节结构对齐同仓先例（§1 → 1.1/1.2/1.3；§2 → 「拍板结果（本批）」+ 2.1）④ 清除否决路线点名（F276 行）与「替代方案」措辞（纪律项）⑤ **F7**：§6.3 补「迁移执行窗口与并发」口径（停服窗口 + 迁移后立即跑 P1/P2 + `credential` 行按 `user_id` 唯一兜底）⑥ §17 节号归位（原 §17.5 误排在 §17.4 之前 ⇒ 复评块归位为 §17.5 · 未决登记为 §17.4）⇒ 复评 **9.50**。（同轮跨文件修复：主 design 修订行 333 行 → **332 行** · `docs/00` §5 M4c-1 子行状态回填） |
| v0.3 | 2026-10-08 | **批内对齐确认 + §6 完整 SQL + 转定稿（用户批准）** —— ① §2 决策 B1–B10 **全部确认**（逐条清单式对齐）② §6 重写：两条**可直接落盘的幂等 SQL**（列名 `account_id`/`provider_id`/`password` 与 provider 常量 `credential`/`ldap`/`oidc` 经真码核对；目录账号判定 = 存在 ldap/oidc 行；登录名择优沿用 `0009` 同款 LATERAL 排序）+ §6.3 口径（幂等 / 全新库零命中 / 不改哈希 / **OIDC-only 账号**口径）+ §6.4 验收探针 **P1–P3** ③ §17.5 复评：可实施性 9.0→**9.5** · 实施精度 9.0→**9.5** ⇒ 综合 **9.44** ④ **Status 草案 → 定稿**（三条件闭合）。 |
| v0.2 | 2026-10-08 | 补 7 段骨架缺口 + 首稿自检：新增 §14 i18n 变更规格（删 7 条错误码文案 · 留 5 条）· §15 回归面与验证口径（门禁 / 零回归 / 7 dogfood / 等价判据 / 造数 / 出口件）· §16 引用文件清单（规范层 / 设计层 / 前后端代码锚点 / 上游事实）· §17 8 维自检（首稿 **8.94** → 处置后 **9.38** + 未决登记 3 项）；§5.1 补「本地账号行同三条件 + 前缀不撞车」；§6 补「全新库零命中」口径。 |
| v0.1 | 2026-10-08 | 首稿：本批批内决策 B1–B10（内嵌推荐值）· 官方 SDK 三层落点 · 两处适配 · 凭据委派行 / `verify` 分支 / 不短路建号钩子 / 身份源共享模块 · 迁移 `0015` 与回滚口径 · `signInAih` 退役顺序 · 安全（时序侧信道 / 防枚举 / CSRF）· 等价判据 · F267–F276 登记。 |
