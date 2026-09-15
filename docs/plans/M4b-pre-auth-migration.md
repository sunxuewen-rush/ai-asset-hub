# M4b-pre 认证整车迁移实现计划（better-auth）

> Date: 2026-09-15
> Updated: 2026-09-15（v0.6：**T2 落地回写**（实测证据见 §2 末「落地记录」）；v0.5：**Task 边界重划（用户 2026-09-15 批准方案 A）**——依据实测「旧表消费面 113 处 / 12 文件 + 认证链不可切片」，T2 收窄为**纯结构**（官方 schema + `0008`）；原 T3+T4 合并为「认证面整体切换」（含 `0009` 搬迁）；后续顺延：T4 令牌面（`0010` 搬迁）· T5 设备流 · T6 测试收口 · T7 清理与规范（`0011`）· T8 门禁与收尾。v0.4：T1 提交前补丁（`better-auth` 精确 `1.7.5` + `docs/00` M6 登记）；v0.3：T1 落地回写 + 自检换靶回修；v0.1：初稿）
> Status: **执行中**（**T1 ✅ 2026-09-15** · **T2 ✅ 2026-09-15（落地记录见 §2 末）** · T3-T8 待执行；design 已定稿批准（v1.6）· 8 维自检 **9.44**）
> 引用链：本文档 → design `docs/designs/2026-09-15-m4b-pre-auth-migration-design.md`（§N 逐 Task 引用）→ 规范 `05` §3/§4.1/§5/§6 · `08` §3/§8 · `00` §5（引用不复制）
> 命名约定见 `docs/plans/README.md`

## 1. 目标与范围

**目标**：把自研认证面（会话 / CSRF / 令牌 / 设备流 / 角色判定）迁到 **better-auth**（MIT · 官方件），
交付可验收的六件事：① 官方实例与角色模型（4 档用官方 admin 插件表达）② 6 张官方表 + 存量数据搬迁
③ 企业目录自定义凭证插件（官方零支持槽位，官方扩展点内自绘）④ 会话落库（顺带修掉「重启即全员登出」）
⑤ 令牌改官方 api-key（存量令牌 re-encode 迁移，持有者无感）⑥ 设备流按官方两段式契约。

**前置已就绪**：M4b-1 地基批 ✅（组件面域已交付）· design 定稿批准（8 维 9.38 → v1.6）· 沙箱实测 X1-X8 全通过（**仓外临时环境**，不进仓）· 官方文档存档 22 页 + 官方包源码核对

**v0.5 边界重划依据（实测，2026-09-15）**：详见 §4 风险 8 —— ① 旧表消费面 = `user_account` 52 处/10 文件（含 13 条 FK 定义）· `identity_binding` 8/2 · `local_credential` 26/4 · `api_token` 27/4 ⇒ 若 `0008` 用 `RENAME`，7 个生产文件当轮编译失败；② 「会话签发 ↔ 档位判定 ↔ 令牌鉴权」是一条链，分批切流必然出现「一端写新表、一端读旧表」的不可运行中间态。

**不含**（归属相邻批次）：
- **设备授权页 UI**（本批只出契约；UI 落地 → M4b-2）· **登录页 / 会话上下文组件 / 401 分流**（→ M4b-2）
- **用户管理面**（listUsers/setRole 由官方承接，UI 与封禁端点 → M4c）
- **CLI 实现**（`apps/cli/src/index.ts` 现为 2 行占位；本批只**定契约**，实现 → M5）
- **OIDC 通道改官方 `genericOAuth`**（R11 决定保留既有编排，仅接缝；如需翻转另立决议）

**执行纪律**（沿用 M4b-1 + 本批特有）：
- commit 点 = Task 结束（Conventional Commits）；**逐 Task 独立 commit**（便于单件回退）
- **逐 Task 门禁绿**：每个 Task 收尾 `typecheck → lint → format:check → build` 必须 exit 0，且**全量测试不因本 Task 变红**
  ⇒ 「删除/替换生产代码」的 Task **必须同批改写其受影响测试**（切流与测试改写不可分离；全仓 fixture 统一收口仍在 T6）
- **搬迁与切流同批（防快照过期）**：搬迁 SQL 与其消费面的切流写在**同一 Task**——`0009` 随 T3、`0010` 随 T4；
  任一时刻**只有一个真值源**（旧表或新表），不做双写（design §10 R7）
- **跑 `test` 会写 dev 库 ⇒ 必须先取得用户授权**；不得为本地 hack 改弱测试（测试是上游契约）
- 每个 Task 收尾必跑**自检打分**（代码 18 维 + 文档 8 维）≥9 才报告/提交；自检发现的缺陷**同轮修**；打分须**换靶**
- **官方件纪律**：能用官方用官方；本批新增自绘只有 1 处（目录凭证插件），理由已写死在 design §1.4
- **官方 CLI 用法写死**：`generate --adapter drizzle --dialect pg` 产 schema 定义；**迁移文件仍走我们既有
  drizzle-kit 流程入库**（forward-only 纪律不破；不用官方 `migrate` 命令做变更）；`create-admin` 仅作一次性运维工具
- **中立铁律**：仓内文档与代码不引用任何内部/公司系统；沙箱与实测细节记录**不入库**
- 迁移 **forward-only**；已推送的漏项补 fixup，**不 force-push**

**阶段映射**（design §7 分阶段口径 ↔ 本 plan Task 粒度）——
S1 骨架与数据层 = **T1/T2** · S2 目录凭证插件 + S3 业务面切流 = **T3**（一条链不可切）· S3 令牌面 = **T4** ·
S4 设备流与 CLI 契约 = **T5** · S5 清理与规范同步 = **T6/T7** · S6 收尾 = **T8**

## 2. Task 清单

### T1 依赖落位 + 官方实例骨架 ✅（2026-09-15 落地；执行期说明 3 项见「落地记录」）（design §4.1 · §4.3）
- **Files**: Modify `apps/server/package.json`（+ `better-auth@1.7.5` + `@better-auth/api-key@1.7.5`；R16 = **2 个**直接依赖）·
  `bun.lock` · Create `apps/server/src/auth/roles.ts`（`ROLE_LEVEL` 数值映射单点 + `createAccessControl` statements + `ac.newRole` 三档）·
  Create `apps/server/src/auth/better-auth.ts`（drizzle adapter 带 schema · `baseURL`/`secret`/`session`/`trustedOrigins` ·
  plugins：admin/deviceAuthorization/apiKey(rateLimit 关)/bearer/username · `emailAndPassword` 注入我方 hash/verify）·
  Modify `apps/server/src/config/env.ts`（+ `AUTH_TRUSTED_ORIGINS` · `SEED_ADMIN_EMAIL`，默认 `admin@local.test`）·
  Create `apps/server/src/auth/roles.test.ts` · `apps/server/src/auth/better-auth.test.ts`
- **状态**：✅ 已提交（`fd58de0`）

### T2 官方 schema + 迁移 0008（纯结构）（design §4.1 · §5.1）
- **Files**: Create `apps/server/src/db/schema/auth.ts`（官方 CLI 产物并入：6 表 + 关系 + `status` 额外字段）·
  Create `apps/server/src/db/schema/auth.test.ts`（结构 + 实例面断言）·
  Modify `apps/server/src/db/schema/index.ts`（re-export `./auth.js`）·
  Create `apps/server/drizzle/0008_*.sql`（**仅建 6 张官方表，零数据搬迁**）· Modify `apps/server/drizzle/meta/**`
- **Assert**:
  ① **CLI 产物一致性**：`bun x auth@latest generate --adapter drizzle --dialect pg --output <仓外临时>` 与我方 `auth.ts` 逐字段对照，
     差异**仅**为格式/注释（`status` 额外字段、`username`/`displayUsername`、`deviceCode`/`apikey` 表须在产物中出现）
  ② **冷库 `0000→0008` 按序迁移成功**（全新建库实测，不复用 dev 库——防「dev 库已手工建过表」掩盖缺列）
  ③ **结构断言（实测 `information_schema`/`pg_constraint`）**：6 表存在（`user`/`session`/`account`/`verification`/`device_code`/`apikey`）；
     `user.email` `NOT NULL + UNIQUE` · `user.role` 为 `text` · `user.status` 默认 `ACTIVE` · `user.username` 唯一 ·
     `account.provider_id`/`account_id` 存在 · `apikey.key` 有官方索引（**非唯一约束**——官方产物如此，key 存哈希、唯一性由生成算法保证；不额外加约束以免偏离官方形态）· `session.token` 唯一
  ④ **零行为变化**：旧 4 表（`user_account`/`identity_binding`/`local_credential`/`api_token`）**仍在且定义未动**
     （`git diff` 不含 `db/schema/users.ts` / `assets.ts` / `governance.ts`）· 全量测试基线不变（475 例 · 0 fail）
  ⑤ **`getSession`（空 cookie）→ `null`**：官方在首次 API 调用即做 schema check（T1 实测 `SCHEMA_MISMATCH`）⇒ 6 表落地后转正（P4 仓内复现）
  ⑥ 门禁：`typecheck` / `lint` / `format:check` / `build` + `bun run db:migrate`（dev 库执行——已获用户授权 2026-09-15）
- **Commit**: `feat(db): add better-auth tables as migration 0008`

### T3 目录凭证插件 + 认证面整体切换（design §1.4 · §2.2 · R4/R5/R6/R9/R12/R13/R15 · §4.1）
> 合并原 T3+T4：登录、会话、档位判定是一条链，不可切片（§1 依据②）
- **Files**: Create `apps/server/src/auth/plugins/ldap-credentials.ts`（三路分派 · 建号 · 错误码映射）·
  Create `apps/server/src/http/auth-routes.ts`（`GET /api/auth/me` 薄层，形状不变）·
  Create `apps/server/drizzle/0009_*.sql`（**用户域搬迁**：`user_account`→`user` · `identity_binding`+`local_credential`→`account`；列级规则 design §5.2）·
  Modify `apps/server/src/auth/ldap.ts`（`searchSelf` 属性集 + `mail`）· `apps/server/src/db/seed.ts`（bootstrap 走官方 API，**保持幂等**；
  **不调用官方 `create-admin`**——实测非幂等）· `apps/server/src/auth/rbac.ts`（内部读官方 `user.role` 文本 → `ROLE_LEVEL`；**导出签名不变**）·
  `apps/server/src/http/auth-middleware.ts`（principal 来源改官方 `getSession`；token scope 判定改官方权限码）·
  `apps/server/src/http/token-middleware.ts`（用户查询改官方 `user` 表；令牌存储面**不动**，归 T4）·
  `apps/server/src/app.ts`（`/api/auth/*` 挂官方 handler · 中间件序调整 · 去 `csrfProtection`）·
  `apps/server/src/auth/ldap.test.ts`（属性面变化同步断言）+ 认证面测试改写（原 `sessions.createSession` 范式 A/B 部分）
  Delete `auth/auth-service.ts` · `auth/provision.ts` · `auth/users.ts` · `auth/routes.ts` · `auth/password.ts`（函数体迁入实例注入配置）·
  `auth/session.ts` · `auth/session-middleware.ts` · `auth/csrf.ts`
- **Assert**:
  ① 三路分派各 1 例（真 ldapjs server，**网络层真实 bind**）：保留账号 → 本地密码；目录账号 → bind 建号；目录不可达 + 本地有凭证 → 回退
  ② 负例：错密码 401 · 目录禁用 401 · 缺字段 400 · 邮箱缺失 400 `auth.email_missing` · 邮箱冲突（同 mail 两账号）拒
  ③ **存量密码零重置**：`0009` 前入的本地凭证行，迁后**原密码**登录成功；错误密码仍 401
  ④ 建号落点：`user`（`role` = 默认档 · `status` = `ACTIVE`）+ `account`（`provider_id='ldap'` · `account_id` = 工号）
  ⑤ **搬迁对账（`0009`）**：`user` 行数 = `user_account` 行数 · `account` 行数 = `identity_binding` + `local_credential` 行数（逐组相等）·
     `user.email` 无 NULL（缺失行按 `id || '@local'` 补齐）· `select distinct role` ⊆ {user, admin, superadmin} · 工号/显示名逐列抽样相等
  ⑥ **seed 幂等**：连跑 2 次不报错、`user` 行数不变
  ⑦ 密码不落盘/不进日志断言（`grep -rn 'password' <日志/审计写点>` 无明文）· `ldap.test.ts` 兜底路径全绿
  ⑧ **调用面零改动编译通过**：`requireAuth()` 24 处 · `requireRole()` 1 处 · `ACCOUNT_ROLE.` 32 处/10 文件（合计 57 处）
  ⑨ 4 档判定：超管全放 · admin 档边界 · user 档精确 DENY · 未登录 401；`status` 非 `ACTIVE` → 401 `auth.session_expired`
  ⑩ `GET /api/auth/me` 形状不变量：`{ user: { id, displayName }, role: number }`
  ⑪ **会话落库 + 进程重启后同一 cookie 仍 200**（缺陷修复实证；对照原 `InMemorySessionStore`）
  ⑫ Origin 校验三态：无 Origin 写请求 403 · 跨源 403 · `AUTH_TRUSTED_ORIGINS` 命中放行
  ⑬ 死符号 grep = 0（`InMemorySessionStore` · `csrfProtection` · `attachSessionCookie`）· 门禁四项 exit 0
- **Commit**: `refactor(server): move auth chain onto better-auth with directory plugin`

### T4 令牌面切流（design R7 · §5.3 · §8）
- **Files**: Create `apps/server/drizzle/0010_*.sql`（**令牌搬迁**：`api_token`→`apikey`，含 re-encode + `permissions` 转换）·
  Modify `apps/server/src/http/token-middleware.ts`（改走官方 `verifyApiKey`，服务端直呼）·
  `apps/server/src/http/tokens.ts`（内部官方 create/list/delete，**响应形状不变**）· 令牌类测试改写
- **Assert**:
  ① 三端点形状不变量：`POST`（明文一次性返回）· `GET`（含 `scope`/`expiresAt`/`revokedAt`）· `DELETE`（幂等 204）
  ② 权限码逐项：范围内 VALID · 超范围 INVALID · **权限不足 vs key 不存在错误码区分**（P7）
  ③ 负例：客户端带 headers 传 `permissions` → 被拒（`SERVER_ONLY_PROPERTY`，P6）
  ④ **搬迁对账（`0010`）**：`apikey` 行数 = `api_token` 行数 · `apikey.key ~ '^[A-Za-z0-9_-]+$'` 且长度 **43** ·
     `permissions` 与原 `scope` 逐项等价（非空 scope 超范围仍 403）· `reference_id` = 原 `user_id` · `enabled` = `revoked_at IS NULL`
  ⑤ 存量令牌：迁后**原明文**可访问业务端点（401 → 200 对照）；错明文 401
  ⑥ 账号 `status` 非 ACTIVE ⇒ 令牌失效
  ⑦ 官方默认限流已关（连续 >10 次调用不被拦）· 门禁四项 exit 0
- **Commit**: `refactor(server): move api tokens onto official api-key plugin`

### T5 设备流四端点 + bearer（design R8 · §8）
- **Files**: Modify `apps/server/src/http/device-routes.ts`（官方四端点契约）· Delete `apps/server/src/auth/device-store.ts` ·
  Modify `apps/server/src/app.ts`（路由挂载调整）· 设备流测试改写
- **Assert**:
  ① 两段式闭环：`POST /device/code` → `GET /device?user_code=` 认领 → `POST /device/approve` → `POST /device/token`（Bearer）
  ② 边界：未认领直接 approve → 400 · 未批准轮询 → `authorization_pending` · 过快轮询 → `slow_down` · 错码 → 不泄露存在性
  ③ 设备 token 调受保护业务端点 200（`bearer` 插件生效）
  ④ 旧契约残留 grep = 0（`DevicePendingStore` · `verificationUri` · `deviceCode:` camelCase 契约字段）
  ⑤ design §8 契约表复验（字段名/状态码逐条对照）· 门禁四项 exit 0
- **Commit**: `refactor(server): adopt official device authorization flow`

### T6 测试收口（fixture 全量 + 新增测试面）（design §6）
- **Files**: Modify 剩余测试文件（`sessions.createSession(...)` 改写收尾——T3/T4/T5 各带本面；本 Task 兜底全仓清零）·
  Create 新增测试面（目录插件 · 会话落库/重启 · origin 三态 · 令牌权限码 · 档位一致性 · 迁移断言）
- **Assert**:
  ① `grep -rn 'createSession' apps --include='*.ts'`（排除 dist）= 0
  ② **覆盖不下降**：基线 **475 例**（474 pass / 1 skip）⇒ 迁后 ≥ **515 例** 且 0 fail（新增净增 ≥40）
  ③ 新增 6 类测试面逐类落地（文件级可点名）
  ④ 在 **单库 + 干净 schema + `CI=true`** 条件下跑绿（AGENTS.md 硬规则：不依赖本地自建库、不无条件改写 env）
  ⑤ 断言未放宽：design §8「变更」表逐条有对应用例（含登录/登出/注册/设备流路径变更）
- **Commit**: `test(server): close out better-auth fixture migration`

### T7 清理 + 规范同步（design §12 · §10 R2）
- **Files**: Create `apps/server/drizzle/0011_*.sql`（**13 条 FK 重指向新 `user` 表 + 删旧 4 表** + 无用列/索引清理）·
  Delete `apps/server/src/db/schema/users.ts`（用户域定义已整体移交 `auth.ts`）·
  Modify `apps/server/src/db/schema/auth.test.ts`（**旧表断言翻转**：「旧 4 表仍在 + 13 条 FK」→「旧 4 表不存在 + FK 指向新 `user` 表」）·
 `apps/server/src/auth/errors.ts`（错误码映射表改写）· `docs/05-identity-access.md`（§3 · §3.1 · §4.1 · §5 · §6.1）·
  `docs/08-data-model.md`（§3 用户域 · §8 约束汇总 · Status 表数）· `docs/00-product-direction.md`（§5 M4b-pre 行回写 + M4c/M5 注记）·
  主 design `2026-09-10-m4b-admin-console-design.md`（§2.3 批件登记表）
- **Assert**:
  ① 运行库表数 = **14**（实测 `psql`）；旧 4 表不存在；13 条 FK 指向新 `user` 表（`pg_constraint` 实测）
  ② 死代码与旧符号 grep 全 0（含**注释腐化**：引用已删符号/旧模型的注释）
  ③ `05`/`08` 改写后**量化声明逐条实测**（表数/列数/端点/角色档数）；`08` Status 表数 12 → 14
  ④ `docs/00` §5 M4b-pre 行状态回写 + M4c/M5 范围注记同步；主 design §2.3 登记（design/plan 文件名 + 版本 + 状态）
  ⑤ 文档-代码对齐回查（converge 前置）：版本头/修订记录/引用/状态四项
- **Commit**: `docs(m4b-pre): sync specs and drop legacy auth tables`

### T8 门禁 + 收尾（converge + 整体审计）
- **Files**: Modify `docs/designs/2026-09-15-m4b-pre-auth-migration-design.md`（converge 回写）· Create `docs/smoke/2026-09-15-m4b-pre.md`（硬证据记录）· 本 plan（回写）
- **Assert**:
  ① 五门禁逐项 **exit 0**（`typecheck`/`lint`/`format:check`/`build`/`db:migrate`/`test`；test 需用户授权，`CI=true` 单库）
  ② **converge**：design 8 维重评 ≥9 + 全部量化声明实测回写
  ③ **整体审计（十一维全仓扫描）**：findings 逐条登记 + 处置（修 / 订正 / 回填 / 口径登记），**不留未决项**
  ④ 人工确认项交用户：dev 下 5173 非 GET 写请求打通（A1 阻塞解除）实测一次
  ⑤ 批间门**出口五件**逐件登记；`docs/00` §5 M4b-pre 行 → 完成
- **Commit**: `chore(m4b-pre): run gates and close batch`

### 落地记录（2026-09-15 执行回写——实测证据）

**T1 依赖落位 + 官方实例骨架 ✅（`fd58de0`）**

- **落仓**：Create `apps/server/src/auth/roles.ts`（**80 行**）· `apps/server/src/auth/better-auth.ts`（**113 行**）· `apps/server/src/auth/roles.test.ts`（**114 行**）· `apps/server/src/auth/better-auth.test.ts`（**47 行**）；Modify `apps/server/src/config/env.ts`（+2 项）；`apps/server/package.json` + `bun.lock`
- **依赖**：`better-auth@1.7.5` + `@better-auth/api-key@1.7.5`（**两包均精确钉定**，防插件与内核半升级漂移；见执行期说明 1）
- **断言实测**：
  ① `git diff apps/server/package.json` = **2 项**（原计划 1 项 → 见执行期说明 1）
  ② `bunx tsc --noEmit` **exit 0** · `bunx tsc -p tsconfig.json`（declaration emit）**exit 0**
  ③ 实例可构造 + `handler` / `api.getSession` 面齐（探针实测）；`options.session.expiresIn` = **28800** · `disableSessionRefresh` = **true** · `options.baseURL` = PUBLIC_BASE_URL
  ④ `SESSION_SECRET` <32 字符仍拒启动 ✓ · `AUTH_TRUSTED_ORIGINS` 默认 `''` → `parseTrustedOrigins` = `[]` ✓ · `SEED_ADMIN_EMAIL` 默认 `admin@local.test` ✓ · 多值解析（含空段）✓ · `disableSignUp` ← `REGISTRATION_ENABLED` 映射 ✓
  ⑤ 单测：`roles.test.ts` **9 pass** + `better-auth.test.ts` **6 pass** = **15 pass / 0 fail**（47 expect）
  ⑥ 辅助：`bun x auth@latest info` 识别栈（hono 4.13.7 · pg 8.23.0 · drizzle 0.45.2 · better-auth **1.7.5**）✓
- **门禁**：`lint`（server）**0 error** · `format:check` 236 文件 ✓ · `typecheck` ✓ · `build`（declaration emit）✓
- **提交前补丁（用户 2026-09-15 拍板，含在 T1 提交内）**：① **版本精确化** `better-auth` `^1.7.5` → **`1.7.5`**（与 `@better-auth/api-key@1.7.5` 对齐；依据 = lock 实测插件 peerDeps 要求内核同版本 + 公开参考项目惯例，防 `bun update` 造成内核/插件错配）② **`docs/00` §5 M6 行登记** `SECURITY.md` + `CODE_OF_CONDUCT.md`
- **执行期说明 3 项**：
  1. **依赖 2 个而非 1 个**：`apiKey` 插件在独立包 `@better-auth/api-key` —— 实测 better-auth 1.7.5 的 `exports` **无** `./plugins/api-key`、`better-auth/plugins` **不导出** `apiKey`、`@better-auth/*` 未被提升到 workspace 根 ⇒ 必须显式安装同版本。R16 已按实测修正（design v1.4）
  2. **断言③ 拆分**：T1 = 实例可构造 + 实例面齐；`getSession`（空 cookie → null）**归 T2**（官方在**首次 API 调用**即做 schema check，报 `SCHEMA_MISMATCH: Missing tables user, session, account, verification, deviceCode, apikey`）⇒ P4 在**仓内**复现
  3. **类型注记（TS2742 / TS7056）**：`declaration: true` 下「实例/选项的推断类型」不可命名 ⇒ 定案 `authOptions()` 注解为官方 `BetterAuthOptions` + `AihAuth = Auth`（**无需断言**）；代价 = **插件端点**（api-key 的 `createApiKey` / `verifyApiKey`）不在该 `api` 面上 ⇒ **T4 在调用点做局部窄化**（令牌签发本就要求服务端直呼，与 design P6/P7 一致）


**T2 官方 schema + 迁移 0008（纯结构）✅**

- **落仓**：Create `apps/server/src/db/schema/auth.ts`（**191 行**，官方 CLI 产物并入）· `apps/server/src/db/schema/auth.test.ts`（**119 行 / 5 例**）·
  `apps/server/drizzle/0008_icy_argent.sql`（**104 行**）· `apps/server/drizzle/meta/0008_snapshot.json` + `_journal.json`（生成物）；
  Modify `apps/server/src/db/schema/index.ts`（+1 行 re-export）
- **生成姿势**（写死在 `auth.ts` 文件头，可复现）：临时配置 `export const auth = betterAuth(authOptions())` → `bun x auth@latest generate --config <临时> --adapter drizzle --dialect pg --output <仓外> -y` → 产物并入（单引号/biome 风格）+ 回填官方 `/* @__PURE__ */` 注记；迁移 SQL 由本仓 `bun x drizzle-kit generate` 产出（forward-only 流程不破）
- **断言实测**：
  ① **CLI 产物一致性**：归一化 diff 后差异 = **import 顺序（biome 组织）+ 我方新增文档注释**，**零语义差异**；产物含 `status`（来自 `additionalFields`）· `username`/`display_username` · `device_code` · `apikey` ✓
  ② **冷库 `0000→0008` 按序迁移成功**（全新建库 `aih_t2_cold`，实测后已 DROP）：**18 表** · 迁移记录 **9 条** · `user.email` `NOT NULL` + 唯一约束 ✓
  ③ **结构断言**：6 表齐（`user`/`session`/`account`/`verification`/`device_code`/`apikey`）· `user.email` NO+UNIQUE · `user.role` = `text` · `user.status` 默认 `'ACTIVE'::text` · `user.username` 唯一 · `session.token` 唯一 · `deviceCode_deviceCode_uidx`/`deviceCode_userCode_uidx`/`apikey_key_idx` 到位 · 官方表 FK **2 条**（`account`/`session` → `user`）
  ④ **零行为变化**：旧 4 表仍在（dev 库实测）· **13 条 FK 仍指向 `user_account`**（冷库同值）· `git diff` 不含 `db/schema/users.ts`/`assets.ts`/`governance.ts` · **全量测试 495 pass / 1 skip / 0 fail**（基线 475 + T1 15 + T2 5 = 495，精确对齐）
  ⑤ **`getSession`（空 cookie）→ `null`**：常驻用例通过 ⇒ P4（`SCHEMA_MISMATCH`）在仓内**转正**
  ⑥ 门禁：`typecheck` ✓ · `lint` 0 error ✓ · `format:check` **238 文件** ✓ · `build`（含 declaration emit）✓ · `db:migrate`（dev 库，已获授权）✓ · `test`（`CI=true` 单库）✓
- **自检换靶轮（本轮，换靶 = 官方产物忠实度 + 跨批联动 + 断言真值）**：代码 **18 维 = 9.45**（A 9.50 / B 9.38 / C 9.45）；
  **同轮修 3 项**：① 初版转录丢失官方 `/* @__PURE__ */` 注记 4 处 → 核对时回填（现零语义差异）② 断言③原写「`apikey.key` 唯一」与官方产物不符（官方只建普通索引，不加约束）→ 断言改真值 ③ **跨批联动缺口**：`auth.test.ts` 的「旧 4 表仍在」断言会在 T7（`0011` 删旧表）撞红 → plan T7 已补「旧表断言翻转」条目
- **登记项（不改）**：`auth.ts` 的 3 个 `relations` 导出在仓内**零消费者**（全仓无 `db.query` 用法）——保留理由 = 官方产物形态 + design §4.1 明写「6 表 **+ 关系**」；文件头已说明
- **未跑项（如实声明）**：`bun run db:seed` 未在本 Task 跑（种子改道归 T3）· cookie **正路径**（持有有效会话）未验（归 T3 断言⑪）· `permissions` 的 `jsonb_object_agg` 转换未跑（归 T4）

## 3. 整体审计（收尾 · 待 T8 回写）

**口径**：承 M4a T17-T26 / M4b-1 惯例（`docs/00` §7 ②）——收尾对全仓跑**十一维覆盖式扫描**（死导出 · i18n 键 ·
已删件残留 · 类串重复 · 越轴值 · token 消费者 · 注释腐化 · 文档数字实测 · 官方件硬规则 · 既有登记项状态 ·
**旧口径/术语指针**），findings 逐条登记 + 处置。**登记表全文 = 本 plan §3（T8 时回写）**。

## 4. 风险与回退

| # | 风险 | 处置 |
|---|------|------|
| 1 | 官方 CLI 生成 schema 的鸡生蛋（P3） | 生成期用独立配置（或临时去 schema import）；产物并入后评审 diff（T2 断言①） |
| 2 | `user` 是 PG 保留字（R2 风险） | drizzle 自动处理；手写 SQL/运维脚本须引号（含 runbook 待办，M6） |
| 3 | 邮箱唯一冲突（迁移与登录两路） | 迁移规则 `COALESCE(lower(email), id\|\|'@local')`；登录侧冲突即拒（T3 断言②） |
| 4 | 目录不可达回退路径绕过状态门 | 回退分支仍走官方会话签发 + `status` 判定（T3 断言交叉覆盖） |
| 5 | 迁移不可逆（forward-only） | 执行前备份为运维动作（runbook 待办）；沙箱已实证 6 表可建表与全流程 CRUD |
| 6 | OIDC 面无可实测 IdP | 本批只做会话签发接缝；验收为「勾选式 + 既有用例不回归」，无新增面 |
| 7 | `test` 依赖已迁移库且写 dev 库 | 每轮跑前取用户授权；`CI=true` 单库 + 干净 schema 口径复现 |
| 8 | **Task 边界与代码耦合不匹配**（v0.5 重划）：① `RENAME` 会让 7 个生产文件当轮编译失败 ② 认证链（会话/档位/令牌）分批切流产生不可运行中间态 | 已按方案 A 重划：T2 纯结构（`0008`）· 切流按「一条链一个 Task」· **搬迁与切流同批**（`0009` 随 T3 · `0010` 随 T4 · `0011` 收口）⇒ 每 Task 门禁可绿且单真值源 |
| 9 | 搬迁 SQL 与切流分处两批 ⇒ 快照过期（新表只映搬迁时刻的旧表数据） | 由风险 8 的处置消除：搬迁与切流**同批**落地；`0011` 在全部消费面切换后才删旧表 |

## 5. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-15 | sunxuewen-rush | 初稿：依据 design v1.2（用户整体批准）+ 沙箱实测 X1-X8 立项；T1-T9 任务清单 |
| v0.2 | 2026-09-15 | sunxuewen-rush | **提交前自检换靶轮回修**：① T7 fixture 口径订正（`18 个测试文件 / 24 处` → **15 个测试文件 / 20 处**）② **T3 补漏** `ldap.test.ts` + 新增断言 ⑦ ③ 沙箱描述去时效 ④ 上游判定同步：design **v1.3** · `docs/00` **v1.30** · 主 design **v1.12** |
| v0.3 | 2026-09-15 | sunxuewen-rush | **T1 落地回写**：落仓 4 文件 + env；**执行期说明 3 项**（依赖 2 个 → R16 修正 · 断言③ 拆分归 T2 · TS2742/7056 类型注记）；Status → 执行中（T1 ✅） |
| v0.4 | 2026-09-15 | sunxuewen-rush | **T1 提交前补丁（用户拍板）**：① `better-auth` → **`1.7.5`** ② `docs/00` M6 行补登记 `SECURITY.md` + `CODE_OF_CONDUCT.md`（升 **v1.31**） |
| v0.6 | 2026-09-15 | sunxuewen-rush | **T2 落地回写**：官方 CLI 产物并入 `db/schema/auth.ts`（191 行）+ `0008`（104 行，纯结构）+ `auth.test.ts`（5 例）；**实测全绿**（冷库 18 表/9 迁移 · 旧表与 13 条 FK 未动 · 全量 **495 pass / 0 fail** · 五项门禁 exit 0）；**自检换靶 18 维 9.45**，同轮修 3 项（`@__PURE__` 注记回填 · 断言③ 改真值（官方 `apikey.key` 为普通索引）· T7 补 `auth.test.ts` 旧表断言翻转）；登记 1 项（`relations` 零消费者，保留理由已写）+ 未跑项 3 项（seed / cookie 正路径 / `permissions` 转换，各归 T3/T4）|
| v0.5 | 2026-09-15 | sunxuewen-rush | **Task 边界重划（用户批准方案 A）**：依据实测「旧表消费面 113 处/12 文件 + 认证链不可切片」——① **T2 收窄**为官方 schema + `0008` **纯结构**（原搬迁/对账断言移出）② 原 T3+T4 **合并**为「目录凭证插件 + 认证面整体切换」（含 `0009` 用户域搬迁 + 调用面/会话/origin 断言）③ 后续顺延：T4 令牌面（`0010` 搬迁）· T5 设备流 · T6 测试收口 · T7 清理与规范（`0011`：FK 重指向 + 删旧表）· T8 门禁与收尾（原 T7-T9）④ 新增纪律：**逐 Task 门禁绿** + **搬迁与切流同批**（防快照过期，单真值源）⑤ 缺陷登记：原 T2 的搬迁断言与切流分处两批会导致冻结快照 ⇒ 由重划消除；design 同步升 **v1.6** |
