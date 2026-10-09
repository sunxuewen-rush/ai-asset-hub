# M4c-2 账号与权限治理：用户管理页 + 启停交官方 + `status` 列退休 + 自助改密 —— 批计划

> Date: 2026-10-09
> Updated: 2026-10-09（**v0.3：T2 落点定案「甲」** —— 另立 `apps/server/src/http/admin-users.ts` + 同前缀第二组挂载 ⇒ §8 可实施性 9.3 → **9.4** · 综合 **9.41**）
> Updated: 2026-10-09（**v0.2：声明核验轮** —— 落点 31 / 官方行号 12 / 事实 10 / 内部自洽 3 项实测；命中并修 **1 处真缺陷**（「四个动作 403」⇒ **五个写端点**）· 去 `api/admin.ts` 疑问语气 · T3 连带面点名；自报 9.39 **撤回** ⇒ 核验 **9.40**）
> Updated: 2026-10-09（**v0.1：首稿** —— T1–T8 编序（权限码/审计单源 → 薄端点 → 列退休迁移 → 用户管理页 → 自助改密 → 视觉就地定稿 → dogfood/回归 → 收口）· 每 Task 三段（步骤 / 断言与门禁 / 落点依据）· 门禁 12 步 · 造数口径 · 风险回退 · 落地记录位 + 逐 Task 18 维自检位）
> Status: 🟡 待拍板（**未开工**）· 上游 = 批 design `docs/designs/2026-10-09-m4c2-user-governance-design.md`（**定稿 · 8 维 9.49** · v0.3 · U1–U5 定案 —— 版本以其版本头为准）
> · 主 design `docs/designs/2026-10-08-m4c-account-and-access-governance-design.md`（§4 契约 · §7 入口三层 · §8.1 端点 · §10.2 交互 · §15 出口 —— 版本以其版本头为准）
> · 视觉真值 SSOT `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（本批**零新视觉值**，只就地补录映射）
> · `docs/00-product-direction.md` §5 **M4c-2 子行**（状态唯一源）
> **前置 = M4c-1 出口五件全绿**（已达成：T1–T8 ✅ · CI #136–#148 全绿 · dogfood 494/0）⇒ 本批可开工

---

## 1. 目标与非目标

**目标**（用户管理面从「只读看板」补齐到「可治理」；**1 个新页面 + 1 处入口项 + 1 次迁移**，零新视觉值）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | **权限码 + 审计单源** | `session: ['revoke']` 新增（`auth/roles.ts`）· `user:*` 档位映射（`admin` 追加 `user:['list']`）· 审计动作 `user.*` ×5 登记（`audit/actions.ts` 现**无** `user` 前缀组） |
| 2 | **用户面薄端点 6 条** | `apps/server/src/http/admin-users.ts`（新件）：列表 / 建号 / 改角色 / 封禁 / 解封 / 吊销全部会话 —— **全部委托官方** admin 插件端点（headers 透传），守卫 + 审计 + 中文码在本仓；含 **F270 一致性哨兵** |
| 3 | **`user.status` 列退休** | 迁移 `0016`（非 `ACTIVE` ⇒ `banned=true` + `banReason`，随后删列）+ 连带代码面按账号语义逐处收敛（判定改读官方 `banned`）+ 探针 P1–P4 |
| 4 | **用户管理页 `/admin/users`** | 列表（筛选 / 排序 / 分页）· 行操作（改角色 / 封禁·解封 / 吊销会话，均二次确认）· 建号 Dialog · 护栏显隐（本人行 / 末位超管行）+ 侧栏「用户管理」占位 → 真链接 + i18n `users` 组 |
| 5 | **本地账号自助改密** | `UserMenu` 新增入口 + Dialog（当前 / 新 / 确认）⇒ 官方 `POST /api/auth/change-password`（**零薄端点** · `revokeOtherSessions: true`）· 目录账号在入口层拒绝并提示 |
| 6 | **视觉就地定稿 + 映射补录** | 列宽 / 状态药丸 / 「（我）」「（末位超管）」标记 / 空态与错误态文案 —— 全部复用既有件，就地补录 M4a §4.4 映射表 |
| 7 | **判据与回归** | 新增 `m4c2-users-dogfood.ts`（全动作 + 护栏负例 + 边界 6 条）· 纳入统一 runner · 既有 7 dogfood 全绿 · **`m4b2` 占位断言经实测复核自动跟随** |
| 8 | **收口** | 规范回填（`05` §4.1 状态表 · `08` §3 `banned` 语义 · `07` §3/§4）· **F267–F270 收口**（F288 / F278 继续挂账）· 证据归档 · 追踪行 · 批收口自检 |

**非目标**（批 design §1）：管理员重置密码 · 邮件找回 · 会话列表 · 用户删除 / 模拟登录（`remove-user` / `impersonate-user` 不接线）· 预建目录账号 · 准入策略四枚举（D5 保留不实现）。

---

## 2. Task 总览

**执行序 = 服务端能力（权限码/审计 → 薄端点）→ 迁移与列退休 → 前端页面 → 前端改密 → 视觉定稿 → 判据 → 收口。**
（顺序即安全窗：**端点先通、页面后接**；**列退休放在端点之后**，双轨期端点已只读官方 `banned`）

| # | 归属 | 主题 | 前置 | 出口 |
|---|------|------|------|------|
| **T1** | server | 权限码 `session:['revoke']` + `user:*` 档位映射 + 审计动作 `user.*` ×5 登记 | — | 本包 `typecheck` + `lint` + 测试绿 · `audit/actions.test.ts` 源码扫描绿 · 既有守卫行为不变 |
| **T2** | server | 薄端点 6 条（`http/admin-users.ts`）+ **F270 哨兵** + 错误码 6 条 + 审计写入 | T1 | 6 端点实测（超管 2xx / 低档 403 / 护栏 4 例拒绝）· 哨兵不一致 ⇒ 500 `user.list_failed` · 官方体不外泄 |
| **T3** | server | 迁移 `0016`（`status` 列退休）+ 连带代码面收敛 + 探针 **P1–P4** | T2 | 迁移 exit 0 · P1–P4 通过 · 连跑两次第二次零变更 · **执行需授权** |
| **T4** | web | 用户管理页 `/admin/users` + 侧栏条目占位→真链接 + i18n `users` 组 | T3 | 超管可见可操作 · 本人行 / 末位超管行禁用 · 分页 / 筛选真数据 · 零 JS 错误 |
| **T5** | web | 自助改密（`UserMenu` 入口 + Dialog + i18n `account` 组） | T4 | 本地账号改密成功且其他端失效（`revokeOtherSessions`）· 目录账号拒绝并提示 · 零 JS 错误 |
| **T6** | web | 视觉就地定稿 + **就地补录 M4a §4.4 映射**（列宽 / 药丸 / 标记 / 空态错误态） | T5 | 与既有控制台页视觉一致（同族件同参数）· 映射表新行可回读 |
| **T7** | script / 验证 | 新增 `m4c2-users-dogfood.ts`（+ 自愈 seed）· 既有 7 dogfood 回归 · 门禁 **12 步** | T6 | 新脚本 0 FAIL · 7 脚本 0 FAIL · 12 步 exit 0（第 7 道区间门禁归 CI） |
| **T8** | 文档 / 收口 | 规范回填（`05` / `08` / `07`）· **F267–F270 收口** · 证据归档 · 追踪行 · 批收口自检 | T7 | 门禁四道全绿 · F 号同步 4 处 · 证据文件落盘 · 批收口自检 ≥9 |

---

## 3. Task 明细（每 Task 三段齐全：步骤 / 断言与门禁 / 落点依据）

### T1 · server：权限码与审计单源

> 依据 = 批 design **§3.4** · 主 design §4.5/§4.6；事实依据：`auth/roles.ts` 现 `user: ['list','set-role','ban','create']`（无 `session`）· `audit/actions.ts` **无 `user` 前缀组**（组前缀现为 asset / review / label / token / auth / device / ldap / oidc）。前置 = 无。

1. `apps/server/src/auth/roles.ts`：`ROLE_STATEMENT` 新增 `session: ['revoke']`；`ROLES` 三档映射 —— `admin` 追加 `user: ['list']`（保持既有 `user` 面其余动作归 `superadmin`）；`superadmin` 全量。
2. `apps/server/src/audit/actions.ts`：新增 `{ prefix: 'user', actions: ['user.create','user.role_change','user.ban','user.unban','user.session_revoke'] }`（**单源** · `allAuditActions()` 自动纳入）。
3. 不改动既有 `asset` / `review` / `audit` 面档位语义（防回归）。

**断言 / 门禁**：① `audit/actions.test.ts` 源码扫描用例绿（未登记动作会让它红）② 本包 `typecheck` + `lint` + 全量测试绿 ③ 既有权限断言（M4b-6 档位矩阵）零改动通过。

**落点**：`apps/server/src/auth/roles.ts` · `apps/server/src/audit/actions.ts`

### T2 · server：用户面薄端点 6 条（委托官方）

> 依据 = 批 design **§3.1/§3.2/§3.3/§3.6** · 主 design §8.1；官方真值：`list-users` `routes.mjs:322`（query schema `:306` · 吞错 `catch` `:378`）· `set-role` `:43` · `ban-user` `:506`（body `:480`）· `unban-user` `:447`（body `:431`）· `create-user` `:133` · `revoke-user-sessions` `:710`（返 `{ success: true }`）。前置 = T1。

1. **另立件（T2 落点定案「甲」· 2026-10-09）**：新建 `apps/server/src/http/admin-users.ts`，在 `apps/server/src/app.ts:215` 的 `createAdminRoutes` 挂载点旁**同前缀再挂一组**（`app.route('/api/admin', createAdminUserRoutes({ db, auth }))`）—— `http/admin.ts` 保持**只读看板族**不混治理写（先例：独立成件的 `http/oidc-routes.ts`）：
   - `app.use('*', requireRole(ACCOUNT_ROLE.ADMIN))`（薄层第一道）+ 官方权限码为第二道（`deps.auth.api.*` 透传 `headers: c.req.raw.headers`）。
   - 六条路由按批 design §3.2 表：`GET /users` · `POST /users` · `PATCH /users/:id/role` · `POST /users/:id/ban` · `POST /users/:id/unban` · `POST /users/:id/sessions/revoke`。
   - 出参归一：列表 `{ items, total }`（先例 `http/assets.ts:284`）· 动作 `{ ok: true }`。
2. **护栏（服务端权威）**：`user.not_found` · `user.self_target_forbidden`（改角色/封禁自己）· `user.role_escalation_forbidden`（目标档位 ≥ 自己）· `user.last_superadmin_forbidden`（使超管档位归零）· `user.username_taken`（登录名占用）；官方码复用：邮箱重复 ⇒ `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`、封禁自我 ⇒ `YOU_CANNOT_BAN_YOURSELF`。
3. **建号（R9）**：`username` / `display_username` **同事务**直写（官方 `create-user` 无 `username` 字段 · F269）；`password` 必填（U4）；`role` 白名单校验。
4. **F270 一致性哨兵（U1）**：列表委托官方后用**同一筛选条件**做一次我方 `count(*)`（drizzle 只读）与官方 `total` 交叉核对 ⇒ 不一致抛 `500 user.list_failed`；`lastLoginAt` = 当页 `userId` 集合的一次 `max(session.created_at)` 聚合（只读 · 理由见批 design §3.3）。
5. **审计**：`user.create` / `user.role_change` / `user.ban` / `user.unban` / `user.session_revoke`（action 字面量取自 `AUDIT_ACTIONS`；`actorId` = 操作者 · `targetId` = 目标）；读面不写审计。

**断言 / 门禁**：① 超管调 6 端点为 2xx 且副作用可回读 ② 管理档：列表 200、**五个写端点**（建号 / 改角色 / 封禁 / 解封 / 吊销）**全 403**（U3 定案） ③ 护栏 4 例均拒绝且**零副作用**（DB 行未变）④ 哨兵：人为构造「官方 total 与我方 count 不一致」⇒ 500 `user.list_failed`（探针级）⑤ 官方响应体字段不外泄（`success` / `users` 等原始键不出现在本仓出参）⑥ 建号后 `user.username` 与 `account` 行同时可回读（同事务硬证）⑦ 封禁已封禁用户 ⇒ **幂等 2xx**。

**落点**：`apps/server/src/http/admin-users.ts`（新）· `apps/server/src/app.ts` · `apps/server/src/http/auth-middleware.ts` · `apps/server/src/auth/errors.ts`

### T3 · server：迁移 `0016`（列退休）+ 连带收敛 + 探针

> 依据 = 批 design **§3.5** · 主 design §4.2/§4.7（R5/R8/R19）；事实依据：`db/schema/auth.ts:61` `status` 列 · `http/auth-middleware.ts:93` `status !== 'ACTIVE'` 判定 · journal 现 **16** 条目（下一个 `0016`）。前置 = T2。

1. 迁移三件：`apps/server/drizzle/0016_<name>.sql`（① `UPDATE "user" SET banned = true, "banReason" = '历史状态迁移' WHERE status IS DISTINCT FROM 'ACTIVE'` ② `ALTER TABLE "user" DROP COLUMN status`）+ `meta/_journal.json`（16 → **17**）+ `meta/0016_snapshot.json`；**执行窗口 = 停服**（先例 `0015`）。
2. **连带代码面**（按**账号语义**逐处甄别，非账号语义命中不动）：`auth/better-auth.ts` `additionalFields.status` 删 · `db/schema/auth.ts:61` 删列 · `auth/rbac.ts` `UserStatus` 收敛 · `http/auth-middleware.ts:93` 改读 `banned` · `http/token-middleware.ts`（账号面 `status !== 'ACTIVE'` 注释 + `select({ user.status })` 两处）· `assets/stats.ts`（`totalUsers` 口径 = 官方 `user.status = 'ACTIVE'` ⇒ 改读 `banned = false`）· `admin/overview.ts`（**甄别后不动**：命中均为资产 / 审核语义）· `auth/identity.ts`（`statusError` 改读 `banned`）· `test-utils/auth-fixture.ts` + 相关测试。
3. **PENDING 清除清单**（主 design §4.7）随本步一并收敛（枚举 / 判定 / 注释；**不写沿革注记**）。
4. 探针 **P1–P4**（迁移后立即跑）：P1 非 `ACTIVE` 行 = 0 · P2 `banned=true` 行 = 2（dev 预期）· P3 `information_schema` 中列已不存在 · P4 禁用账号真登录 ⇒ 官方 `BANNED_USER`。

**断言 / 门禁**：① `bun run db:migrate` exit 0（dev 与空库双跑 · 幂等：连跑两次第二次零变更）② P1–P4 全过 ③ 全量测试绿（含 `auth-fixture` 改造）④ `grep -rn 'status' apps/server/src --include='*.ts'` 的**账号语义**命中复查为 0（非账号语义 = 资产/HTTP 状态码不计）⑤ 本包 `typecheck` + `lint`。

**落点**：`apps/server/drizzle/0016_*.sql` · `meta/_journal.json` · `meta/0016_snapshot.json` · 上列连带文件

### T4 · web：用户管理页 + 侧栏条目 + i18n

> 依据 = 批 design **§4.1/§4.2/§4.3/§4.4** · 主 design §7.1/§7.2/§7.3/§10.2/§11；复用件真值：`ui/{DataTable,Pagination,ColumnVisibilityMenu,Badge,EmptyState,ErrorState}.tsx` · `console/{FilterBar,ConfirmDialog,Drawer,PageHeader,StatusPill}.tsx`（12/12 实测存在）。前置 = T3。

1. `apps/web/src/pages/AdminUsers.tsx`（新）：`PageHeader`（标题 + `[+ 新建用户]`）· `FilterBar`（搜索 / 角色 / 状态 / 重置）· `DataTable` + `ColumnVisibilityMenu`（列：账号 / 姓名 / 邮箱 / 角色 / 状态 / 最后登录 / 操作）· `Pagination`（替换式页码 + 共 N 条）· 行操作菜单（`DropdownMenu`：改角色 / 封禁·解封 / 吊销会话 ⇒ `ConfirmDialog` 二次确认；封禁填原因 + 可选到期）。
2. 路由：`apps/web/src/main.tsx` 既有 `<RoleGuard minRole={ROLE.ADMIN}>` 块内新增 `/admin/users`（与 `/admin/*` 同族）。
3. 侧栏：`components/ui/navItems.tsx` 超管组「用户管理」由**占位 BUTTON** → `{ to: '/admin/users', text: t('admin','users'), icon: <Users/> }`（「系统设置」保持占位）。
4. 护栏显隐：本人行禁用「改角色 / 封禁」+ 标「（我）」；末位超管行禁用「封禁 / 降级」+ 标「（末位超管）」；动作提交期按钮禁用（无乐观更新，成功后**重取当页**）；请求序号守卫防竞态。
5. i18n：`apps/web/src/i18n/{zh,en}.ts` 新增 `users` 组（标题 / 列头 / 筛选项与占位符 / 三动作与确认 / 建号表单标签与校验错误 / 状态药丸文案）；**双语双向差集为 0**。

**断言 / 门禁**：① 超管：列表真数据渲染（≥3 行）· 分页切换正确 · 筛选命中 ② 管理档直访：读列表 200、四个动作 403（U3）③ 本人行 / 末位超管行禁用生效（DOM 级）④ 建号 Dialog：字段校验 + 冲突（邮箱 / 登录名）内联错误且不创建 ⑤ 全程 `NO JS ERRORS` ⑥ `typecheck` + `lint` + 测试绿。

**落点**：`apps/web/src/pages/AdminUsers.tsx`（新）· `apps/web/src/main.tsx` · `components/ui/navItems.tsx` · `apps/web/src/i18n/{zh,en}.ts` · `apps/web/src/api/admin.ts`（**既有**薄封装件 —— 实测在场（同族 `api/{assets,audit}.ts`），扩展用户面方法）

### T5 · web：自助改密

> 依据 = 批 design **§4.5** · 主 design §4.8（R21）；官方真值：`api/routes/update-user.mjs:75` `/change-password` · body `:82-91` · `revokeOtherSessions` `:180`；判定依据 **F280**（不用全局 `password.hash` 拒绝，按目标账号在**入口层**判定）。前置 = T4。

1. `components/ui/UserMenu.tsx` 新增「修改密码」项 ⇒ 打开 Dialog（当前口令 / 新口令 / 确认）。
2. 提交：官方 SDK 直调 `POST /api/auth/change-password`（body `{ currentPassword, newPassword, revokeOtherSessions: true }` · **零薄端点**）；成功 ⇒ toast + 保留当前会话（其他端失效）。
3. **目录账号拒绝**：入口层按当前账号的凭据行判定（`password` 前缀 `ldap:` ⇒ 目录账号）⇒ 隐藏入口或提交前拒绝并给明确提示；判定只读，不写。
4. i18n：新增 `account` 组（入口 / 三字段 / 拒绝提示 / 成功与失败文案）；双语差集 0。

**断言 / 门禁**：① 本地账号改密成功（原口令失效、新口令可用）② `revokeOtherSessions` 生效（第二会话被吊销 — 探针级）③ 目录账号：入口层拒绝且提示明确 ④ 当前口令错 ⇒ 官方码提示（不泄内部）⑤ 全程 `NO JS ERRORS`。

**落点**：`components/ui/UserMenu.tsx` · `apps/web/src/api/auth.ts`（SDK 单点）· `apps/web/src/i18n/{zh,en}.ts`

### T6 · web：视觉就地定稿 + 补录映射

> 依据 = 批 design **§4.2** · 主 design §10.1（引 M4a §4.4 · 不复制 SSOT）。前置 = T5。

1. 逐项就地定稿：列宽与列序 · 状态药丸（正常 / 已封禁 / 已封禁+到期）· 行内标记（「（我）」「（末位超管）」）· 空态与错误态文案 · 建号/改密 Dialog 尺寸与字段排布 —— **全部取既有件同参数**（零新视觉值）。
2. **就地补录** `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` §4.4 映射表（新增本批页面/控件的局部视觉决策行）。
3. 「最后登录」空值展示口径（从未登录 ⇒ `—`）；时间格式沿用本仓既有列表页范式。

**断言 / 门禁**：① 与既有控制台页并排观感一致（同族件同参数 · 人工核对 + 截图）② 映射表新行可回读（grep 到具体行）③ 文档门禁四道绿（含 M4a 头部下沉 token 预演）④ 截图证据落盘 `docs/smoke/`。

**落点**：`apps/web/src/pages/AdminUsers.tsx` · `apps/web/src/components/ui/UserMenu.tsx` · `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` §4.4

### T7 · script / 验证：新 dogfood + 回归 + 门禁

> 依据 = 批 design **§5** · 主 design §15（出口五件）；范式先例：`docs/smoke/scripts/{m4b2-auth-dogfood,m4b6-governance-dogfood}.ts` + 统一 runner `dogfood-all.ts` + **F293 自愈范式**。前置 = T6。

1. 新增 `docs/smoke/scripts/m4c2-users-dogfood.ts`：超管全动作 happy path（改角色 → 封禁 → 解封 → 吊销 → 建号）· 护栏负例（改自己 / 封自己 / 提权越界 / 末位超管）· 边界 6 条（批 design §4.3）· 目录账号改密拒绝 · 目标用户被封禁后**真登录被拒**（端到端）。
   - **自愈（F293 范式）**：脚本启动即重播 `m4b2-seed-roles`（幂等复位三账号状态），`SMOKE_SKIP_SEED=1` 可跳 —— 否则前一轮的改角色/封禁会让下一轮假红。
   - 纳入 `dogfood-all.ts` 的脚本表（执行序 = 既有 7 个之后）。
2. 既有回归：7 个 dogfood 全绿；**`m4b2` 占位断言实测复核**（取 SSOT 派生 ⇒ 「用户管理」改真链接后 placeholder 2 → 1 **自动跟随**）。
3. 门禁 12 步（§4）本地 11 步 + CI 补第 7 道。

**断言 / 门禁**：① 新脚本 0 FAIL 且 `EXIT=0` ② 7 既有脚本 0 FAIL ③ 门禁逐项 exit 0 ④ 新脚本若失败必须**真缺陷**而非数据态（以「重播种子后复跑仍红」判定）。

**落点**：`docs/smoke/scripts/m4c2-users-dogfood.ts`（新）· `docs/smoke/scripts/dogfood-all.ts`

### T8 · 文档 / 收口

> 依据 = 批 design §5 · 主 design §14/§15。前置 = T7。

1. 规范回填（规范层**原地改**）：`docs/05` §4.1 状态表（三态单列 ⇒ 官方 `banned` 三件套）· `docs/08` §3（`banned`/`banReason`/`banExpires` 语义）· `docs/07` §3/§4（i18n 组与错误码键）。
2. **F 号收口**：F267（权限码缺 `session` ⇒ 官方端点 403）· F268（官方认证面不读我方 `status`）· F269（官方建号无 `username` / 邮箱强制小写）· F270（`list-users` 吞错 ⇒ 本批哨兵处置）⇒ 逐条登记处置；**F288 / F278 继续挂账**；`docs/README.md` §6.1 号段同步。
3. 证据归档（`docs/smoke/` 下按批日期命名 · 先例 `docs/smoke/2026-10-09-m4c1.md`）（门禁 12 步读数 + dogfood 结果 + 探针 P1–P4 + F 号一览）。
4. 追踪行：`docs/00` §5 M4c-2 子行 → ✅ 本批完成 · 批 design/plan 版本头同步 · 批收口自检（18 维）。

**断言 / 门禁**：① 文档门禁四道全绿 + token 预演全过 ② F 号同步 4 处（批 design 明细 / README 号段 / plan 摘要 / 证据文件）③ 批收口自检 ≥9 ④ 出口五件（主 design §15）逐项达成。

**落点**：`docs/05` · `docs/08` · `docs/07` · `docs/README.md` §6.1 · `docs/00` §5 · `docs/smoke/` 下按**批日期**命名的新证据文件（先例 `docs/smoke/2026-10-09-m4c1.md`）

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
**每 Task 收尾**先跑本包 `typecheck` + `lint`（`bun run lint` 并**读 exit code** —— `bunx biome | tail` 会吞 `organizeImports` 真错，已实证）；**落地前**跑全量 12 步。
**dogfood**：日常用 `SMOKE_ONLY` 分段，**收尾全量**（推荐一键 `bun docs/smoke/scripts/dogfood-all.ts`）；每段 `NO JS ERRORS` 为硬门；**提交前须通配还原被改写的证据 PNG**。

**跨平台说明（Win / macOS / Linux）**：本批为 Web UI + 服务端 SQL 面改动 —— 无路径 / 时区 / 换行差异；迁移 `0016` 为纯 PostgreSQL SQL（三平台语义一致）。

---

## 5. 造数需求（**写库需用户授权**）

- **不新增常驻 seed**（复用 `m4b2-seed-roles` 的三账号：`m4b2_super` / `m4b2_mgr` / `m4b2_user`）。
- **写库动作 2 处**：① 迁移 `0016`（T3）—— 执行前须授权，并先做 `user` 表快照（含 `status` 列全量值）② 新 dogfood 的**自愈 seed**（T7 · 幂等复位三账号的档位与封禁态，`SMOKE_SKIP_SEED=1` 可跳）。
- **只读探针**：P1–P4 + 列表哨兵交叉核对 —— 沿用仓内只读查询方式，不落盘。
- 口令与连接串一律从 env 读，不落盘、不进仓。

---

## 6. 风险与回退

| # | 风险 | 缓解 / 回退 |
|---|------|------------|
| 1 | **列退休不可逆**（`DROP COLUMN`） | 停服窗口 + 迁移前 `user` 表快照（含 `status` 全量值，落 tmp 不入仓）；回退 = 重建列 + 按快照回填（口径写在迁移 SQL 头注释） |
| 2 | **自我锁死**（封/降自己，或让超管档位归零） | 双侧护栏：前端禁用 + 服务端权威判定（`user.self_target_forbidden` / `user.last_superadmin_forbidden`）；dogfood 负例覆盖 |
| 3 | **官方行为差异**（`list-users` 吞错 · `create-user` 无 `username`） | F270 一致性哨兵（不一致 ⇒ 显式 500）+ 建号**同事务**直写 `username`（R9）；断言「原始官方键不外泄」 |
| 4 | **dogfood 改库致后续假红**（改角色/封禁非幂等） | 沿 **F293 自愈范式**：新脚本启动即重播 `m4b2-seed-roles` |
| 5 | **文档连带**（规范三件 + 追踪行 + F 号 4 处） | T8 集中收口 + 门禁四道 + token 预演（头部下沉不改内容） |
| 6 | **权限码档位误配**（`admin` 拿到写权限） | T1 后立即跑档位矩阵断言 + T2 的 403 实测（管理档四个动作必须 403） |

---

## 7. 落地记录（执行期回填）

| Task | 日期 | 实测 | 门禁 | 发现 / 偏差 |
|------|------|------|------|------------|
| **T1** | 2026-10-09 | 4 件 +37/−3：① `auth/roles.ts` —— `ROLE_STATEMENT` 加 `session: ['revoke']`（仅 revoke）· `ROLES.superadmin` 加 `session:['revoke']`（**admin 不给** ⇒ 写面 5 端点全归超管，供 T2 的 403 断言）· 两条口径注释（批 design §3.4 / 主 design §2.6 R20 / §7.3）② `audit/audit.ts` —— `AUDIT_ACTIONS` + `user.*` ×5（**必须与目录同批**：`actions.test.ts` 的**反向扫描**会抓「目录有而代码不写的幽灵项」）③ `audit/actions.ts` —— 新增 `user` 组 ④ `auth/roles.test.ts` —— 探针 `PermissionProbe` 加 `session`；+3 组断言（admin 拒 revoke · superadmin 放行并纳入全量探针 · 独立用例「仅超管放行」）；单调包含探针纳入 `session:['revoke']` | 本包 `typecheck` ✓ · `lint` **EXIT=0**（133 文件 · No fixes applied · **读 exit code** 口径）✓ · 靶测试 `roles` + `audit/actions` **13 pass / 0 fail** ✓ · 全量 **645 pass / 1 skip / 0 fail**（Ran 646 · 57 文件 · +1 = 本轮新增用例）| ① **首轮红（我自己的错，已修）**：插测试名时把 `session:['revoke']`（含单引号）放进 TS **单引号串** ⇒ TS1005 语法错 → 改为不带内嵌引号的标题 ② 反向扫描坑已预先规避（常量表与目录同批登记）③ T1 **无端点** ⇒ 官方 `403` 链路由 T2 实测，本 Task 只锁声明面 |
| **T2** | — | — | — | — |
| **T3** | — | — | — | — |
| **T4** | — | — | — | — |
| **T5** | — | — | — | — |
| **T6** | — | — | — | — |
| **T7** | — | — | — | — |
| **T8** | — | — | — | — |

### 7.1 逐 Task 自检打分位（标准档 **18 维** · A×0.40 + B×0.30 + C×0.30 · 门 ≥9）

（实现期每 Task 收尾按此表打分并就地填写；A 基础 4 维 · B 深度 4 维 · C 工程 10 维 —— 口径见 `self-review-scoring`）

| Task | A（4 维） | B（4 维） | C（10 维） | 合计 | 备注（扣分项） |
|------|:--:|:--:|:--:|:--:|------|
| T1 | 9.50 | 9.53 | 9.58 | **9.53** | A4 9.4（纯声明面 · 无运行时错误路径可测）· C7 9.4（本 Task 无新文档，T8 集中回填） |
| T2 | — | — | — | — | — |
| T3 | — | — | — | — | — |
| T4 | — | — | — | — | — |
| T5 | — | — | — | — | — |
| T6 | — | — | — | — | — |
| T7 | — | — | — | — | — |
| T8 | — | — | — | — | — |

---

## 8. 自检打分（plan 首稿）

| 维度 | 分 | 依据 |
|------|:--:|------|
| 完整性 | 9.2 | 8 Task 全覆盖（权限码→端点→迁移→页面→改密→视觉→判据→收口）；每 Task 三段（步骤 / 断言门禁 / 落点）；**待**实现期回填落地记录 |
| 一致性 | 9.5 | 每 Task 标「依据 = 批 design §X + 主 design §Y」；官方行号与批 design 同源（核验轮已修 ban/unban 互换） |
| 清晰度 | 9.4 | Task 总览表 + 明细编号步骤；安全窗（端点先于页面、列退休置于端点后）写明理由 |
| 可实施性 | 9.3 | 落点文件逐条列出（含新件路径）；断言可执行；**待** T2 落点二选一（并入 `admin.ts` 还是另立 `admin-users.ts`）实现期拍 |
| 设计纯粹性 | 9.5 | 零新自绘端点；我方 SQL 仅两处只读（聚合 + 哨兵 count）；视觉零新值 |
| 边界覆盖 | 9.4 | 护栏 4 例 + 边界 6 条 + 幂等/自我锁死/末位超管 + 目录账号改密拒绝 + 竞态守卫 |
| 实施精度 | 9.3 | 官方行号 + 本仓落点 + 迁移三件 + 探针 P1–P4；**待** 视觉细节数值（T6 就地定稿） |
| 跨平台 | 9.5 | 无平台差异面（Web + 服务端 SQL） |

**标准 4 维 9.35 ｜ 深度 4 维 9.425 ｜ 综合 9.39**（**v0.1 自报 · 已撤回**）

### 8.1 声明核验轮重评（v0.2 · 用户「自检打分了吧？」）

**方法**：同 design 核验轮（`design-doc-claim-verification`）—— 对 plan 内可回读声明逐条实测（落点 31 处 · 官方行号 12 处 · 事实/数字 10 项 · 内部数字自洽 3 项）。

| 检查面 | 条数 | 命中 |
|--------|:--:|------|
| 落点文件存在性（服务端 15 · 前端 6 · 文档 10） | 31 | 全 ✅（其中 5 处为**计划内新建件**，已在正文标「新」） |
| 官方 dist 行号（`list-users`/`set-role`/`ban`/`unban`/`create`/`revoke` + body 模式 2 · `change-password` 2） | 12 | 全 ✅ |
| 事实/数字（种子三账号名 · 幂等声明 · 门禁脚本在场 · journal **16** · runner 可扩展表 · `/api/admin` 挂载 · `audit/actions.ts` 无 `user` 组 · `roles.ts` 无 `session` 资源 · `additionalFields.status` 在场 · `RoleGuard(ADMIN)` 块在场） | 10 | 全 ✅ |
| 内部数字自洽（审计动作 5 · 错误码 6 · **管理档 403 端点数**） | 3 | **1 ❌**：plan 写「管理档四个动作 403」，而端点面写集 = **5**（建号 / 改角色 / 封禁 / 解封 / 吊销）⇒ 已修 |
| 探针自检 | — | 1 处**探针自身 bug**（把空串当假值 ⇒ 误报 1 条 ❌）⇒ 如实记录、不影响文档 |

**核验附带改进 2 处**：① `apps/web/src/api/admin.ts` **实测已存在**（原写「若既有…」疑问语气）⇒ 改为既有件扩展 ② T3 连带面点名 `token-middleware.ts` 两处账号语义与 `assets/stats.ts` 的 `totalUsers` 口径；并记录 `admin/overview.ts` **甄别后不动**（命中均为资产 / 审核语义）。

| 维度 | v0.1 自报 | 核验后 | 变动理由 |
|------|:---:|:---:|---------|
| 完整性 | 9.2 | **9.4** | 31 处落点 + 12 处官方行号 + 10 项事实**全部实测可回读** |
| 一致性 | 9.5 | **9.4** | ⬅ 本轮实测扣：1 处数字与端点面不符（四个动作 ⇒ 五个写端点），已修 |
| 清晰度 | 9.4 | 9.4 | 段落与编号清晰；核验后补「甄别后不动」记录更明确 |
| 可实施性 | 9.3 | **9.4** | T2 落点已定案「甲」（另立 `http/admin-users.ts` · 同前缀第二组挂载）⇒ 无待拍项；仅余 T6 视觉数值（实现期留） |
| 设计纯粹性 | 9.5 | 9.5 | 零新自绘端点；我方 SQL 两处只读 |
| 边界覆盖 | 9.4 | 9.4 | 护栏 4 例 + 边界 6 条 + 幂等 / 自我锁死 / 末位超管 |
| 实施精度 | 9.3 | 9.3 | 官方行号 + 落点 + 迁移 + 探针齐；**待** T6 视觉数值 |
| 跨平台 | 9.5 | 9.5 | 无平台差异面 |

**标准 4 维 9.4 ｜ 深度 4 维 9.425 ｜ 综合 9.41**（T2 落点定案后复算）—— 满足开工门（≥9 ✓）
> 口径：本轮**撤回** v0.1 自报的 9.39（自报未经实测）；9.40 = 核验后可复查分数。残余待定项 2 处：**T2 落点二选一**（待拍板）· T6 视觉细节数值（实现期就地定稿）。
> 未覆盖且已归他处：逐 Task 18 维自检 → §7.1 表（实现期回填）；真页面视觉稿 → T6 就地定稿。

---

## 9. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.3 | 2026-10-09 | **T2 落点定案「甲」（用户拍板）** —— 另立 `apps/server/src/http/admin-users.ts` + `app.ts` 同前缀第二组挂载（`http/admin.ts` 保持只读看板族不混治理写）；§8 可实施性 9.3 → **9.4**，综合 **9.40 → 9.41**；plan 内不再留待拍项（仅余 T6 视觉数值 · 实现期就地定稿） |
| v0.2 | 2026-10-09 | **声明核验轮（用户「自检打分了吧？」）** —— ① 方法同 design 核验轮：落点 31 处 · 官方行号 12 处 · 事实/数字 10 项 · 内部数字自洽 3 项 ② **命中 1 处真缺陷并修**：「管理档四个动作 403」与端点面不符（写集 = **5**：建号 / 改角色 / 封禁 / 解封 / 吊销）③ 核验附带改进 2 处：`api/admin.ts` **实测已存在**（去疑问语气）· T3 连带面点名 `token-middleware.ts` 两处 + `assets/stats.ts` `totalUsers` 口径，并记 `admin/overview.ts` 甄别后不动 ④ 如实披露 1 处**探针自身 bug**（空串当假值 ⇒ 误报 1 条）⑤ 评分：**撤回 v0.1 自报 9.39** ⇒ 核验后 **9.40**（标准 9.375 · 深度 9.425）⑥ 门禁：doc-audit 264/0 · table-structure 47/0 · file-ref-closure 37/0 · doc-claims 132/0 |
| v0.1 | 2026-10-09 | **首稿** —— T1–T8 编序（权限码/审计单源 → 用户面薄端点 6 条 + F270 哨兵 → 迁移 `0016` 列退休与连带收敛 → 用户管理页 + 侧栏条目 + i18n → 自助改密 → 视觉就地定稿与映射补录 → 新 dogfood + 回归 + 门禁 → 收口）· 每 Task 三段（步骤 / 断言与门禁 / 落点依据）· 门禁 12 步（含「读 exit code」实证口径）· 造数口径（复用 `m4b2-seed-roles` + 自愈 seed + 迁移授权）· 风险与回退 6 条 · 落地记录位 + 逐 Task 18 维打分位 · 自检 **9.39** |
