# M4b-pre 认证整车迁移实现计划（better-auth）

> Date: 2026-09-15
> Updated: 2026-09-15（v0.4：**T1 提交前补丁**——`better-auth` 版本精确化（`^1.7.5` → **`1.7.5`**，与插件包对齐 · 防内核/插件错配）+ `docs/00` M6 行登记 `SECURITY.md`/`CODE_OF_CONDUCT.md`（升 **v1.31**）；v0.3：**T1 落地回写****提交前自检换靶轮回修**——T7 fixture 口径 18 文件/24 处 → **15 文件/20 处** · **T3 补漏 `ldap.test.ts`** + 断言⑦ · 沙箱描述去时效 · design 同步升 **v1.3**（8 维 **9.44**）；v0.1：初稿——依据 design v1.2（用户整体批准）+ 沙箱实测 X1-X8；T1-T9 立项）
> Status: **执行中**（**T1 ✅ 2026-09-15** · T2-T9 待执行；design 已定稿批准 · 8 维自检 **9.44**）
> 引用链：本文档 → design `docs/designs/2026-09-15-m4b-pre-auth-migration-design.md`（§N 逐 Task 引用）→ 规范 `05` §3/§4.1/§5/§6 · `08` §3/§8 · `00` §5（引用不复制）
> 命名约定见 `docs/plans/README.md`

## 1. 目标与范围

**目标**：把自研认证面（会话 / CSRF / 令牌 / 设备流 / 角色判定）迁到 **better-auth**（MIT · 官方件），
交付可验收的六件事：① 官方实例与角色模型（4 档用官方 admin 插件表达）② 6 张官方表 + 存量数据搬迁
③ 企业目录自定义凭证插件（官方零支持槽位，官方扩展点内自绘）④ 会话落库（顺带修掉「重启即全员登出」）
⑤ 令牌改官方 api-key（存量令牌 re-encode 迁移，持有者无感）⑥ 设备流按官方两段式契约。

**前置已就绪**：M4b-1 地基批 ✅（组件面域已交付）· design 定稿批准（8 维 9.38）· 沙箱实测 X1-X8 全通过（**仓外临时环境**，不进仓）· 官方文档存档 22 页 + 官方包源码核对

**不含**（归属相邻批次）：
- **设备授权页 UI**（本批只出契约；UI 落地 → M4b-2）· **登录页 / 会话上下文组件 / 401 分流**（→ M4b-2）
- **用户管理面**（listUsers/setRole 由官方承接，UI 与封禁端点 → M4c）
- **CLI 实现**（`apps/cli/src/index.ts` 现为 2 行占位；本批只**定契约**，实现 → M5）
- **OIDC 通道改官方 `genericOAuth`**（R11 决定保留既有编排，仅接缝；如需翻转另立决议）

**执行纪律**（沿用 M4b-1 + 本批特有）：
- commit 点 = Task 结束（Conventional Commits）；**逐 Task 独立 commit**（便于单件回退）
- **门禁统一在代码落地后跑**：`typecheck → lint → format:check → build → db:migrate → test`（顺序即 CI 口径）
- **跑 `test` 会写 dev 库 ⇒ 必须先取得用户授权**；不得为本地 hack 改弱测试（测试是上游契约）
- 每个 Task 收尾必跑**自检打分**（代码 18 维 + 文档 8 维）≥9 才报告/提交；自检发现的缺陷**同轮修**；打分须**换靶**
- **官方件纪律**：能用官方用官方；本批新增自绘只有 1 处（目录凭证插件），理由已写死在 design §1.4
- **官方 CLI 用法写死**：`generate --adapter drizzle --dialect pg` 产 schema 定义；**迁移文件仍走我们既有
  drizzle-kit 流程入库**（forward-only 纪律不破；不用官方 `migrate` 命令做变更）；`create-admin` 仅作一次性运维工具
- **中立铁律**：仓内文档与代码不引用任何内部/公司系统；沙箱与实测细节记录**不入库**
- 迁移 **forward-only**；已推送的漏项补 fixup，**不 force-push**

**阶段映射**：design §7 的分阶段口径 ↔ 本 plan 的 Task 粒度 ——
S1 骨架与数据层 = **T1/T2** · S2 目录凭证插件 = **T3** · S3 业务面切流 = **T4/T5** · S4 设备流与 CLI 契约 = **T6** ·
S5 清理与规范同步 = **T7/T8** · S6 收尾 = **T9**（测试 fixture 改写集中在 T7，各 Task 内只带本 Task 断言的用例改动）

## 2. Task 清单

### T1 依赖落位 + 官方实例骨架 ✅（2026-09-15 落地；执行期说明 3 项见「落地记录」）（design §4.1 · §4.3）
- **Files**: Modify `apps/server/package.json`（+ `better-auth@^1.7.5`；R16 = 仅此 1 个直接依赖）· `bun.lock` ·
  Create `apps/server/src/auth/roles.ts`（`ROLE_LEVEL` 数值映射单点 + `createAccessControl` statements + `ac.newRole` 三档）·
  Create `apps/server/src/auth/better-auth.ts`（drizzle adapter 带 schema · `baseURL`/`secret`/`session`/`trustedOrigins` ·
  plugins：admin/deviceAuthorization/apiKey(rateLimit 关)/bearer/username · `emailAndPassword` 注入我方 hash/verify）·
  Modify `apps/server/src/config/env.ts`（+ `AUTH_TRUSTED_ORIGINS` · `SEED_ADMIN_EMAIL`，默认 `admin@local.test`）·
  Create `apps/server/src/auth/roles.test.ts`
- **Assert**:
  ① `git diff apps/server/package.json` 仅新增 `better-auth` 1 项；`bun install` 成功
  ② `bun run --filter=@ai-asset-hub/server typecheck` 零错
  ③ 实例可构造：脚本内 `auth.api.getSession({ headers: new Headers() })` 返回 `null` 且不抛（不依赖 HTTP server）
  ④ env 既有校验不被削弱：`SESSION_SECRET` <32 字符仍拒；`AUTH_TRUSTED_ORIGINS` 未设 ⇒ 仅同源
  ⑤ **单测**：`ROLE_LEVEL` 键集合 === `ac.roles` 键集合（防档位与权限码双源漂移）
  ⑥ `bun x auth@latest info` 回显实例配置（辅助校验，不作门禁）
- **Commit**: `feat(server): wire better-auth instance, role map and auth env`

### T2 官方 schema + 迁移 0008（design §5.1 · §5.2 · §5.3）
- **Files**: Create `apps/server/src/db/schema/auth.ts`（官方 CLI 生成产物并入 + `status` 额外字段）·
  Modify `apps/server/src/db/schema/index.ts` · Create `apps/server/drizzle/0008_*.sql`（结构 + 数据搬迁）·
  Modify `apps/server/drizzle/meta/**`（生成物；format 排除规则已存在）
- **Assert**:
  ① CLI 产物一致性：`bun x auth@latest generate --adapter drizzle --dialect pg --output <tmp>` 与我方 schema 逐字段 diff，
     差异**仅**为我方 `status` 额外字段（已登记项）
  ② 冷库 `0000→0008` 按序迁移成功（**全新建库**实测，非复用 dev 库）
  ③ **搬迁对账**：`user_account`→`user` · `identity_binding`+`local_credential`→`account` · `api_token`→`apikey` 三组行数相等
  ④ `user.email` 无 NULL（缺失行按 `id||'@local'` 规则补齐）· `select distinct role` ⊆ {user, admin, superadmin}
  ⑤ 令牌 re-encode 后 `apikey.key ~ '^[A-Za-z0-9_-]+$'`（base64url）且长度 = 43
  ⑥ 13 条 FK 全部仍指向新 `user` 表（`pg_constraint` 查询，零重建）
  ⑦ **`getSession`（空 cookie）→ `null`**：官方在首次 API 调用即做 schema check（T1 实测 `SCHEMA_MISMATCH`）⇒ 该断言随 6 张表落地后归本 Task
  ⑧ 门禁：typecheck/lint/format:check/build + `bun run db:migrate`（dev 库执行前已获授权）
- **Commit**: `feat(db): add better-auth schema and 0008 auth migration`

### T3 企业目录凭证插件 + bootstrap 建号（design §1.4 · §2.2 · R12/R13/R15）
- **Files**: Create `apps/server/src/auth/plugins/ldap-credentials.ts`（三路分派 · 建号 · 错误码映射）·
  Modify `apps/server/src/auth/ldap.ts`（`searchSelf` 属性集 + `mail`）· Modify `apps/server/src/db/seed.ts`（bootstrap 走官方 API，**保持幂等**）·
  Delete `auth/auth-service.ts` · `auth/provision.ts` · `auth/users.ts` · `auth/routes.ts` · `auth/password.ts`（函数体迁入实例注入配置）·
  Modify `apps/server/src/auth/ldap.test.ts`（fake server 断言集随属性面变化同步——属性增强路径的兜底断言按新属性集复测）
- **Assert**:
  ① 三路分派各 1 例（真 ldapjs server，**网络层真实 bind**）：保留账号 → 本地密码；目录账号 → bind 建号；目录不可达 + 本地有凭证 → 回退
  ② 负例：错密码 401 · 目录禁用账号 401 · 缺字段 400 · 邮箱缺失 400 `auth.email_missing` · 邮箱冲突（同 mail 两账号）拒
  ③ **存量密码零重置**：T2 前排入的本地凭证行，迁后用**原密码**登录成功；错误密码仍 401
  ④ 建号落点：`user`（`role` = 默认档 · `status` = `ACTIVE`）+ `account`（`provider_id='ldap'` · `account_id` = 工号）
  ⑤ **seed 幂等**：连跑 2 次不报错、`user` 行数不变（不依赖官方 `create-admin`，X8：其非幂等）
  ⑥ 密码不落盘/不进日志断言（`grep -rn 'password' <日志/审计写点>` 无明文）
  ⑦ `ldap.test.ts` 兜底路径断言随 `searchSelf` 属性面更新后全绿（属性缺失 → CN 兜底语义保持不变）
- **Commit**: `feat(server): add enterprise directory credential plugin`

### T4 会话与档位切流（design §2.2 · R4/R5/R6 · §4.1 改造面）
- **Files**: Modify `apps/server/src/auth/rbac.ts`（内部读官方 `user.role` 文本 → `ROLE_LEVEL`；签名不变）·
  Modify `apps/server/src/http/auth-middleware.ts` · Modify `apps/server/src/app.ts`（`/api/auth/*` 挂官方 handler；业务面中间件序调整；去 `csrfProtection`）·
  Create `apps/server/src/http/auth-routes.ts`（`GET /api/auth/me` 薄层，形状不变）·
  Delete `auth/session.ts` · `auth/session-middleware.ts` · `auth/csrf.ts`
- **Assert**:
  ① **调用面零改动**编译通过：`requireAuth()` 24 处 · `requireRole()` 1 处 · `ACCOUNT_ROLE.` 32 处/10 文件（**合计 57 处**，design §3 口径）
  ② 4 档判定：超管全放 · admin 档边界（含 SUPER_ADMIN 天然覆盖）· user 档精确 DENY · 未登录 401
  ③ `status` 非 ACTIVE（`PENDING` / `DISABLED` 各 1 例）→ 401 `auth.session_expired`
  ④ `GET /api/auth/me` 形状不变量：`{ user: { id, displayName }, role: number }`
  ⑤ **会话落库 + 进程重启后同一 cookie 仍 200**（缺陷修复实证；对照原 `InMemorySessionStore`）
  ⑥ Origin 校验三态：无 Origin 写请求 403 · 跨源 403 · `AUTH_TRUSTED_ORIGINS` 命中放行
  ⑦ 死符号 grep = 0（`InMemorySessionStore` · `csrfProtection` · `attachSessionCookie`）
- **Commit**: `refactor(server): move session, csrf and rbac onto better-auth`

### T5 令牌面切流（design R7 · §5.3 · §8）
- **Files**: Modify `apps/server/src/http/token-middleware.ts`（改走官方 `verifyApiKey`，服务端直呼）·
  Modify `apps/server/src/http/tokens.ts`（内部官方 create/list/delete，**响应形状不变**）
- **Assert**:
  ① 三端点形状不变量：`POST`（明文一次性返回）· `GET`（列表含 `scope`/`expiresAt`/`revokedAt`）· `DELETE`（幂等 204）
  ② 权限码逐项：范围内 VALID · 超范围 INVALID · **权限不足 vs key 不存在错误码区分**（P7）
  ③ 负例：客户端带 headers 传 `permissions` → 被拒（`SERVER_ONLY_PROPERTY`，P6）
  ④ 存量令牌：迁移后**原明文**可访问业务端点（401 → 200 对照）；错明文 401
  ⑤ 账号 `status` 非 ACTIVE ⇒ 令牌失效
  ⑥ 官方默认限流已关（连续 >10 次调用不被拦）
- **Commit**: `refactor(server): move api tokens onto official api-key plugin`

### T6 设备流四端点 + bearer（design R8 · §8）
- **Files**: Modify `apps/server/src/http/device-routes.ts`（官方四端点契约）· Delete `apps/server/src/auth/device-store.ts` ·
  Modify `apps/server/src/app.ts`（路由挂载调整）
- **Assert**:
  ① 两段式闭环：`POST /device/code` → `GET /device?user_code=` 认领 → `POST /device/approve` → `POST /device/token`（Bearer）
  ② 边界：未认领直接 approve → 400 · 未批准轮询 → `authorization_pending` · 过快轮询 → `slow_down` · 错码 → 不泄露存在性
  ③ 设备 token 调受保护业务端点 200（`bearer` 插件生效）
  ④ 旧契约残留 grep = 0（`DevicePendingStore` · `verificationUri` · `deviceCode:` camelCase 契约字段）
  ⑤ design §8 契约表复验（字段名/状态码逐条对照）
- **Commit**: `refactor(server): adopt official device authorization flow`

### T7 测试 fixture 全量改写 + 新增测试面（design §6）
- **Files**: Modify **15 个测试文件 / 20 处** `sessions.createSession(...)`（范式 A 主 · B 角色 · C 令牌；另 3 处生产调用与 1 处定义随文件删除，见 design §3）·
  Create 新增测试文件（目录插件 · 会话落库/重启 · origin 三态 · 令牌权限码 · 档位一致性 · 迁移断言）
- **Assert**:
  ① `grep -rn 'createSession' apps --include='*.ts'`（排除 dist）= 0
  ② **覆盖不下降**：基线 **475 例**（474 pass / 1 skip）⇒ 迁后 ≥ **515 例** 且 0 fail（新增净增 ≥40）
  ③ 新增 6 类测试面逐类落地（文件级可点名）
  ④ 在 **单库 + 干净 schema + `CI=true`** 条件下跑绿（AGENTS.md 硬规则：不依赖本地自建库、不无条件改写 env）
  ⑤ 断言未放宽：design §8「变更」表逐条有对应用例（含登录/登出/注册/设备流路径变更）
- **Commit**: `test(server): rewrite auth fixtures for better-auth`

### T8 清理 + 规范同步（design §12 · §5.1 收尾）
- **Files**: Create `apps/server/drizzle/0009_*.sql`（删旧表残留/无用列）· Modify `apps/server/src/auth/errors.ts`（错误码映射表改写）·
  Modify `docs/05-identity-access.md`（§3 认证架构 · §3.1 目录通道 · §4.1 状态机 · §5 会话与凭证 · §6.1 平台角色）·
  Modify `docs/08-data-model.md`（§3 用户域 · §8 约束汇总 · Status 表数）· Modify `docs/00-product-direction.md`（§5 M4b-pre 行回写 + M4c/M5 注记）·
  Modify 主 design `2026-09-10-m4b-admin-console-design.md`（§2.3 批件登记表）
- **Assert**:
  ① 运行库表数 = **14**（实测 `psql`）；旧 4 表（`user_account`/`identity_binding`/`local_credential`/`api_token`）不存在
  ② 死代码与旧符号 grep 全 0（含**注释腐化**：引用已删符号/旧模型的注释）
  ③ `05`/`08` 改写后**量化声明逐条实测**（表数/列数/端点/角色档数）；`08` Status 表数 12 → 14
  ④ `docs/00` §5 M4b-pre 行状态回写 + M4c/M5 范围注记同步；主 design §2.3 登记（design/plan 文件名 + 版本 + 状态）
  ⑤ 文档-代码对齐回查（converge 前置）：版本头/修订记录/引用/状态四项
- **Commit**: `docs(m4b-pre): sync specs and drop legacy auth tables`

### T9 门禁 + 收尾（converge + 整体审计）
- **Files**: Modify `docs/designs/2026-09-15-m4b-pre-auth-migration-design.md`（converge 回写）· Create `docs/smoke/2026-09-15-m4b-pre.md`（硬证据记录）· 本 plan（回写）
- **Assert**:
  ① 五门禁逐项 **exit 0**（`typecheck`/`lint`/`format:check`/`build`/`db:migrate`/`test`；test 需用户授权，`CI=true` 单库）
  ② **converge**：design 8 维重评 ≥9 + 全部量化声明实测回写
  ③ **整体审计（十一维全仓扫描）**：findings 逐条登记 + 处置（修 / 订正 / 回填 / 口径登记），**不留未决项**
  ④ 人工确认项交用户：dev 下 5173 非 GET 写请求打通（A1 阻塞解除）实测一次
  ⑤ 批间门**出口五件**逐件登记；`docs/00` §5 M4b-pre 行 → 完成
- **Commit**: `chore(m4b-pre): run gates and close batch`

### 落地记录（2026-09-15 执行回写——实测证据）

**T1 依赖落位 + 官方实例骨架 ✅**

- **落仓**：Create `apps/server/src/auth/roles.ts`（**80 行**）· `apps/server/src/auth/better-auth.ts`（**113 行**）· `apps/server/src/auth/roles.test.ts`（**114 行**）；Modify `apps/server/src/config/env.ts`（+2 项）；`apps/server/package.json` + `bun.lock`
- **依赖**：`better-auth@^1.7.5` + `@better-auth/api-key@1.7.5`（精确版本，防插件与内核半升级漂移；见执行期说明 1）
- **断言实测**：
  ① `git diff apps/server/package.json` = **2 项**（原计划 1 项 → 见执行期说明 1）
  ② `bunx tsc --noEmit` **exit 0** · `bunx tsc -p tsconfig.json`（declaration emit）**exit 0**
  ③ 实例可构造 + `handler` / `api.getSession` 面齐（探针实测）；`options.session.expiresIn` = **28800** · `disableSessionRefresh` = **true** · `options.baseURL` = PUBLIC_BASE_URL
  ④ `SESSION_SECRET` <32 字符仍拒启动 ✓ · `AUTH_TRUSTED_ORIGINS` 默认 `''` → `parseTrustedOrigins` = `[]` ✓ · `SEED_ADMIN_EMAIL` 默认 `admin@local.test` ✓ · 多值解析（含空段）✓ · `disableSignUp` ← `REGISTRATION_ENABLED` 映射 ✓
  ⑤ `bun test src/auth/roles.test.ts` → **9 pass / 0 fail**（39 expect）——含 `ROLE_LEVEL` 键集合 ↔ `ROLES` 键集合一致性、档位单调、未知档名不越权、三档授权面单调包含
  ⑥ 辅助：`bun x auth@latest info` 识别栈（hono 4.13.7 · pg 8.23.0 · drizzle 0.45.2 · better-auth **1.7.5**）✓
- **门禁**：`lint`（server）**0 error**（本批 4 文件零诊断）· `format:check` 236 文件 ✓ · `typecheck` ✓ · `build`（declaration emit）✓
- **提交前补丁（用户 2026-09-15 拍板，含在 T1 提交内）**：① **版本精确化** `better-auth` `^1.7.5` → **`1.7.5`**（与 `@better-auth/api-key@1.7.5` 对齐；依据 = lock 实测插件 peerDeps 要求内核同版本 + 公开参考项目惯例，防 `bun update` 造成内核/插件错配）② **`docs/00` §5 M6 行登记** `SECURITY.md` + `CODE_OF_CONDUCT.md`（对标公开开源仓治理清单；升 **v1.31**）
- **执行期说明 3 项**：
  1. **依赖 2 个而非 1 个**：`apiKey` 插件在独立包 `@better-auth/api-key` —— 实测 better-auth 1.7.5 的 `exports` **无** `./plugins/api-key`、`better-auth/plugins` **不导出** `apiKey`、`@better-auth/*` 未被提升到 workspace 根 ⇒ 必须显式安装同版本。R16 已按实测修正（design v1.4）
  2. **断言③ 拆分**：T1 = 实例可构造 + 实例面齐；`getSession`（空 cookie → null）**归 T2**（官方在**首次 API 调用**即做 schema check，报 `SCHEMA_MISMATCH: Missing tables user, session, account, verification, deviceCode, apikey`）⇒ P4 在**仓内**复现（此前仅沙箱证据）
  3. **类型注记（TS2742 / TS7056）**：`declaration: true` 下「实例/选项的推断类型」不可命名（编译器要求把 zod / better-call 内部类型写进 `.d.ts` 且超长）；把选项注解为官方 `BetterAuthOptions` 也修不掉（`Auth<BetterAuthOptions>` 与实例的 `$context` 逆变不相容，赋值不成立）⇒ 定案 **`AihAuth = Auth` + 构造处单次断言**；代价 = **插件端点**（api-key 的 `createApiKey` / `verifyApiKey`）不在该 `api` 面上 ⇒ **T5 在调用点做局部窄化**（令牌签发本就要求服务端直呼，与 design P6/P7 一致）

## 3. 整体审计（收尾 · 待 T9 回写）

**口径**：承 M4a T17-T26 / M4b-1 惯例（`docs/00` §7 ②）——收尾对全仓跑**十一维覆盖式扫描**（死导出 · i18n 键 ·
已删件残留 · 类串重复 · 越轴值 · token 消费者 · 注释腐化 · 文档数字实测 · 官方件硬规则 · 既有登记项状态 ·
**旧口径/术语指针**），findings 逐条登记 + 处置。**登记表全文 = 本 plan §3（T9 时回写）**。

## 4. 风险与回退

| # | 风险 | 处置 |
|---|------|------|
| 1 | 官方 CLI 生成 schema 的鸡生蛋（P3） | 生成期用独立配置（或临时去 schema import）；产物并入后评审 diff（T2 断言①） |
| 2 | `user` 是 PG 保留字（R2 风险） | drizzle 自动处理；手写 SQL/运维脚本须引号（含 runbook 待办，M6） |
| 3 | 邮箱唯一冲突（迁移与登录两路） | 迁移规则 `COALESCE(lower(email), id\|\|'@local')`；登录侧冲突即拒（T3 断言②） |
| 4 | 目录不可达回退路径绕过状态门 | 回退分支仍走官方会话签发 + `status` 判定（T3/T4 断言交叉覆盖） |
| 5 | 迁移不可逆（forward-only） | 执行前备份为运维动作（runbook 待办）；沙箱已实证 6 表可建表与全流程 CRUD |
| 6 | OIDC 面无可实测 IdP | 本批只做会话签发接缝；验收为「勾选式 + 既有用例不回归」，无新增面 |
| 7 | `test` 依赖已迁移库且写 dev 库 | 每轮跑前取用户授权；`CI=true` 单库 + 干净 schema 口径复现 |

## 5. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-15 | sunxuewen-rush | 初稿：依据 design v1.2（用户整体批准）+ 沙箱实测 X1-X8 立项；T1-T9 任务清单（依赖与实例骨架 / schema 与迁移 0008 / 目录凭证插件 / 会话与档位切流 / 令牌面 / 设备流 / 测试 fixture 全量改写 / 清理与规范同步 / 门禁与收尾） |
| v0.4 | 2026-09-15 | sunxuewen-rush | **T1 提交前补丁（用户拍板）**：① `better-auth` `^1.7.5` → **`1.7.5`**（锁定形态与 `@better-auth/api-key@1.7.5` 一致；依据 = lock 实测插件 peerDeps 要求内核同版本 ⇒ caret 会在 `bun update` 后错配）② `docs/00` §5 M6 行补登记 **`SECURITY.md`** + **`CODE_OF_CONDUCT.md`**（升 **v1.31**）|
| v0.3 | 2026-09-15 | sunxuewen-rush | **T1 落地回写（依赖与官方实例骨架）**：落仓 `roles.ts`（80 行）· `better-auth.ts`（113 行）· `roles.test.ts`（114 行 · 9 pass）· env +2 项；**执行期说明 3 项**（依赖 2 个而非 1 个 → R16 修正 · 断言③ 拆分归 T2（schema check 仓内复现）· TS2742/7056 类型注记 ⇒ 插件端点 T5 局部窄化）；T2 断言补 `getSession`（空 cookie → null）；Status → 执行中（T1 ✅）|
| v0.2 | 2026-09-15 | sunxuewen-rush | **提交前自检换靶轮回修**：① T7 fixture 口径订正（`18 个测试文件 / 24 处` → **15 个测试文件 / 20 处**，对齐 design v1.3 §3）② **T3 补漏** `apps/server/src/auth/ldap.test.ts`（`searchSelf` 属性面变化会牵动其兜底断言）+ 新增断言 ⑦ ③ 沙箱描述去时效（不写仓外临时路径）④ 上游判定同步：design 升 **v1.3**（8 维 **9.44**）· `docs/00` 升 **v1.30** · 主 design 升 **v1.12** |
