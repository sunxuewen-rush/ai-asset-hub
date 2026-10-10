# M4c-2 账号与权限治理 · 批设计（用户管理页 + 启停交官方 + 列退休 + 自助改密）

> Date: 2026-10-09
> Updated: 2026-10-10（**v0.9：F296 收尾（4 条失败逐条查清）+ F298 登记** —— `m4a` 2 条 = **降级实例假红**（全新自管实例上隔离/全量均 **64 PASS / 0 FAIL** 复现全绿）；`m4b2` 2 条 = G5 断言**锁竞态**（写死 `path === '/login'`，与 §4.4/§9.3「登出 → 回首页」相反）⇒ 按**设计契约**加固；新登记 **F298**（登出落点不确定 · 产品侧待拍板）+ **F299**（runner 浏览器生命周期泄漏 ⇒ 实例被下一轮静默复用 = **F297 生成机制** · **已修**：成功路径 `process.exit(0)` · 实测自发退出 + 零泄漏））
> Updated: 2026-10-09（**v0.8：F296/F297 登记** —— dogfood 标签清理 × 不自建标签 ⇒ 0 标签秒退（已兜底）· 无头调试 Edge 老化 ⇒ CDP 僵死（烧满 900s 超时 · 激活无效）⇒ 重启换 profile 处置中）
> Updated: 2026-10-09（**v0.7：F295 登记** —— `docs/smoke/scripts` 的原生 SQL 不在静态检查面；T3 删列后 4 个种子仍读写 `status`（3/4 原生 SQL）⇒ dogfood 前置 exit 2；已修，处置待拍板）
> Status: **定稿**（2026-10-09 · 8 维 **9.49**（标准 9.50 · 深度 9.48 · **声明核验轮后**）· grilling 轮 U1–U5 全定案 · 门 ≥9 ✓；实现细则落批 plan）· 上游 = 主 design `2026-10-08-m4c-account-and-access-governance-design.md`（§2.3 拆批 · **§4 契约** · §7.1/§7.2/§7.3 · §8.1 · §10.2 · §11 · §12；版本以其版本头为准）
> Scope: `/admin/users` 用户管理（列表 / 筛选 / 分页 · 改角色 · 封禁·解封 · 强制登出 · 管理员建号）· 权限码 `session:['revoke']` · `user.status` **列退休**（迁移 `0016`）· 本地账号**自助改密** · 侧栏「管理」组条目与 i18n

## 1. 目标与非目标

| 类 | 项 |
|----|----|
| **目标（本批交付）** | ① `/admin/users` 页（列表 · 筛选 · 分页 · 行操作：改角色 / 封禁·解封 / 强制登出 · 建号 Dialog）② 5 个薄端点（委托官方）③ `session:['revoke']` 权限码 ④ `user.status` 列退休（迁移 `0016` + 判定改读官方 `banned`）⑤ 本地账号自助改密（官方 `/change-password`，用户菜单入口）⑥ 审计动作 `user.*` 5 项 + 错误码 5 项 ⑦ 侧栏「用户管理」条目由**占位**变**真链接** |
| **非目标（明确不做）** | 管理员重置密码（D2 不动）· 邮件找回（无邮件服务）· 会话列表（R20）· 用户删除 / 模拟登录（`remove-user` / `impersonate-user` 不接线）· 预建目录账号（只建本地账号 · 对齐 2 甲）· 准入策略四枚举（保留不实现 · D5） |

## 2. 批内对齐拍板结果（2026-10-09 · 用户「全按推荐来」逐条确认）

| # | 议题 | 拍板 | 代价 / 备注 |
|--:|------|------|-------------|
| 1 | 批形态 | **单批**（服务端治理面 + UI + 迁移 + 文档同批） | 批体量大（预计 6–8 Task）；换来「无半成品入口」 |
| 2 | 预建目录账号 | **不做**（只建本地账号；目录账号由首登自动建号） | 少一个便利项，范围收敛（主 design §4.4 两项任选） |
| 3 | 建号登录名 | 建号后**同事务**直写 `user.username`（= 工号）与 `display_username` | 官方无 `set-username`（F269）⇒ R9「直写规范化」 |
| 4 | 自助改密入口 | **用户菜单**（侧栏底部 `UserMenu`）新增「修改密码」+ Dialog | 单 Dialog 承载（R21 最小面），零新路由 |
| 5 | 用户管理页 | **新增 `/admin/users`**；视觉随批**就地定稿**（复用控制台件，零新视觉值） | 本批唯一新页 + i18n 一组键 |
| 6 | 列表取数 | **官方 `list-users` 直取** + 我方薄层补守卫 / 审计 / 中文码；**服务端分页** | 受官方分页与过滤能力约束（F270 见 §3.3） |
| 7 | F 号承接 | 本批收口 **F267 / F268 / F269 / F270**；**F288**（审计 FK ⇒ 删号受阻）与 **F278**（跨通道同 subject 撞 unique）**继续挂账**（不做删号 / 归 M4c-3） | 少一个管理动作（主 design §4.5 本就不含 delete） |
| 8 | 立项产物序 | **批 design → grilling → 定稿 → plan → 实现** | 多一轮对齐；M4c-1 的 grilling 曾抓出 4 处契约缺口 |

## 3. 服务端设计

### 3.1 薄端点范式：委托官方 + headers 透传

- 落点 `apps/server/src/http/admin-users.ts`（新件），沿用 `http/admin.ts` 的 `createAdminRoutes` 家族：`app.use('*', requireRole(...))` + Hono 路由 + zod 入参校验（先例 `http/admin.ts:34-66`）。
- **调用官方**：服务端直呼官方插件端点（先例 `http/oidc-routes.ts` 直呼 `api.signInAihOidc`），但**必须透传调用方 headers** —— 官方 admin 端点的 `adminMiddleware` 靠会话 + 权限码判定（真码 `plugins/admin/routes.mjs` 各端点 `use: [adminMiddleware]`）：
  `deps.auth.api.listUsers({ headers: c.req.raw.headers, query })`
- **出参一律归一**：官方体不外泄（`revoke-user-sessions` 官方返 `{ success: true }`（`routes.mjs:710` 段）⇒ 本仓归一 `{ ok: true }`）；列表类统一 `{ items, total }`（本仓惯例 `http/assets.ts:284-285`）。
- **双保险**：本仓 `requireRole` 先判档位（快速失败 + 中文码），官方 `user:*` / `session:['revoke']` 权限码为**第二道**（R16 精神：前端禁用不替代服务端判定）。

### 3.2 端点契约（细化主 design §8.1 · 全部挂 `/api/admin`）

| 端点 | 方法 | 入参 | 出参 | 委托官方 | 权限码 | 审计 |
|------|------|------|------|---------|--------|------|
| `/api/admin/users` | GET | `limit`（默认 20 · 上限 100）· `offset` · `q`（关键词）· **`field`（搜索字段：`username` 工号 / `name` 姓名 / `email` 邮箱 · 默认 `username`）** · `role`（档名）· `status`（`active`/`banned`）· `sort`（`username`/`name`/`email`/`role`/`createdAt`）· `dir` | `{ items: [{ userId, username, name, email, role, banned, banReason, banExpires, lastLoginAt }], total }` | `list-users`（`routes.mjs:322`） | `user:['list']` | —（读面不写） |
| `/api/admin/users` | POST | `{ username, name, email, role, password }`（**四项必填** · 初始口令管理员手填 · U4 定案） | `{ userId }` | `create-user`（`routes.mjs:133`）+ 同事务直写 `username`/`display_username` | `user:['create']` | `user.create` |
| `/api/admin/users/:id/role` | PATCH | `{ role }` | `{ ok: true }` | `set-role`（`routes.mjs:43`） | `user:['set-role']` | `user.role_change` |
| `/api/admin/users/:id/ban` | POST | `{ reason?, expiresIn? }` | `{ ok: true }` | `ban-user`（`routes.mjs:506`） | `user:['ban']` | `user.ban` |
| `/api/admin/users/:id/unban` | POST | — | `{ ok: true }` | `unban-user`（`routes.mjs:447`） | `user:['ban']` | `user.unban` |
| `/api/admin/users/:id/sessions/revoke` | POST | — | `{ ok: true }` | `revoke-user-sessions`（`routes.mjs:710`） | `session:['revoke']` | `user.session_revoke` |

### 3.3 列表取数与 F270 处置

- **筛选映射（2026-10-09 订正 · F294 · 用户拍板「A」）**：官方 `list-users` 单次**最多**一组 search（`searchField` 被官方 **z.enum 限死 `email`\|`name`**）+ 一组 filter（任意字段/操作符），二者 **AND** 组合，**不支持跨字段 OR** ⇒ UI 改为**「字段选择器 + 关键词」**，服务端按 `field` 分派：
  | `field` | 官方入参 |
  |---------|---------|
  | `username`（工号 · **默认**） | `filterField:'username'` + `filterOperator:'contains'` + `filterValue:q` |
  | `name`（姓名） | `searchValue:q` + `searchField:'name'`（`searchOperator` 默认 `contains`） |
  | `email`（邮箱） | `searchValue:q`（`searchField` 官方默认即 `email`） |
  `role` ⇒ `filterField:'role'` + `filterOperator:'eq'` · `status` ⇒ `filterField:'banned'` + `filterValue:true|false`（官方 schema 允许布尔）· `sort`/`dir` ⇒ `sortBy`/`sortDirection`（真码 `listUsersQuerySchema` `routes.mjs:306-320`）。
  ⚠️ **限制须知（F294）**：`field` 与 `role` 同用且 `field=username` 时二者争**同一个 filter 位** ⇒ 服务端规则 = **`field=username` 时忽略 `role` 筛选**（`field=name|email` 时 `role` 仍生效）；UI 对 `field=username` **禁用角色下拉**并提示。
- **`lastLoginAt`**：官方 `list-users` **不返回**该字段 ⇒ 本仓薄层对当页 `userId` 集合做**一次只读聚合** `max(session.created_at)`（`group by user_id`）。
  > **为何此处仍是「我方自绘」**（原则要求写明理由）：官方件不提供该字段，而主 design R22 要求展示「最后登录」；本处**只做聚合读**，不替代官方数据面（列表主体仍来自官方），且**不做任何写**。
- **F270 处置 = 「一致性哨兵」（定案 · grilling U1 甲）**：官方 `list-users` 的 `catch` 把查询异常吞成 `{users:[],total:0}`（真码 `routes.mjs:378`）⇒ 空列表不可区分真伪。本仓薄层用**同一筛选条件**做一次 `count(*)`（我方 drizzle **只读**）与官方 `total` 交叉核对：**不一致 ⇒ 500 + `user.list_failed`**（新码）。**代价 = 每次列表多 1 次 count**（可接受：列表页低频、count 走既有索引）。
  > 该哨兵**不替代官方数据面**（列表主体仍来自官方 `list-users`），只在官方吞错时把「静默空列表」变成**显式失败**。
- **分页**：服务端分页（`limit`/`offset`），前端**替换式页码**（非追加式）⇒ 与官方 `total` 天然对齐（`Pagination.tsx` 既有实现）。

### 3.4 权限码与审计动作

- **权限码**（`apps/server/src/auth/roles.ts`，现 `user: ['list','set-role','ban','create']`）：**新增 `session: ['revoke']`**；`user:['set-password']`/`delete`/`impersonate` **不新增**（主 design §4.5）。档位映射：`admin` = 追加 `user:['list']`；`superadmin` = 全量（改角色 / 封禁 / 建号 / 吊销会话）。
- **审计动作**（单源 `apps/server/src/audit/actions.ts` —— 现无 `user` 前缀组，**必须新增**，否则源码扫描用例红）：`user.create` · `user.role_change` · `user.ban` · `user.unban` · `user.session_revoke`。
- **主动作与目标**：`actorId` = 操作者 · `targetType='user'` · `targetId` = 目标用户 · `detail` 记变更前后（角色：`from`/`to`；封禁：`reason`/`expiresIn`）。
  > ⚠️ **F288 关联**：`audit_log.actor_id` 为 NO ACTION 外键 ⇒ 本批**不做删号**（否则被审计行阻塞）；删号与 FK 策略归后续。

### 3.5 迁移 `0016`（`status` 列退休）

- 载体三件：`apps/server/drizzle/0016_<name>.sql` + `meta/_journal.json`（16 → **17** 条目）+ `meta/0016_snapshot.json`（`prevId` = `0015` 快照 id）；**执行窗口 = 停服**（先例 `0015`）。
- 语句（幂等）：
  1. `UPDATE "user" SET banned = true, "banReason" = '历史状态迁移' WHERE status IS DISTINCT FROM 'ACTIVE'`（**dev 库实测命中 2 行** · 主 design §2.5）
  2. `ALTER TABLE "user" DROP COLUMN status`
- **连带代码面**（主 design §4.2 已给起点 grep 计数，逐处甄别归本批）：`auth/better-auth.ts` 的 `additionalFields.status` 删 · `db/schema/auth.ts:61` 删列 · `auth/rbac.ts` 的 `UserStatus` 收敛 · `http/auth-middleware.ts:93` 判定改读 `banned` · `http/token-middleware.ts` / `admin/overview.ts` / `assets/stats.ts` 的账号语义命中逐处改 · `auth/identity.ts` 的 `statusError`（M4c-1 T7 刚收敛为官方 `BANNED_USER`）改读 `banned` · `test-utils/auth-fixture.ts` + 相关测试。
- **探针（迁移后立即复核）**：P1 非 ACTIVE 行数 = 0 · P2 `banned=true` 行数 = 2（dev）· P3 列已不存在（`information_schema`）· P4 禁用账号登录 ⇒ 官方 `BANNED_USER`（真实端点）。

### 3.6 错误码（`apps/server/src/auth/errors.ts` 家族 + 主 design §4.6）

新增（我方，薄层护栏）：`user.not_found` · `user.self_target_forbidden` · `user.role_escalation_forbidden` · `user.last_superadmin_forbidden` · `user.username_taken` · **`user.list_failed`**（F270 哨兵不一致时返回 · 定案）。
复用官方码：建号邮箱重复 ⇒ `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`；封禁自我 ⇒ `YOU_CANNOT_BAN_YOURSELF`（`admin.mjs` 家族）；封禁态登录 ⇒ `BANNED_USER`（`admin.mjs:47`）。

## 4. 前端设计

### 4.1 页面与入口

| 层 | 规则 |
|----|------|
| 路由 | `/admin/users` 落在 `main.tsx` 既有 `<RoleGuard minRole={ROLE.ADMIN}>` 块（与 `/admin/*` 同族） |
| 侧栏 | 「超级管理 → 用户管理」条目 **占位 BUTTON ⇒ 真链接** `to='/admin/users'`（`components/ui/navItems.tsx`）；「系统设置」保持占位 |
| 入口门槛 | 侧栏条目 = **超管**（`gate: ROLE.SUPER_ADMIN` · 现状沿用）；数据面 = `user:['list']`（管理档 +）⇒ **管理档直访 = 读列表 200 + 动作 403**（U3 定案）；动作按权限码显隐并由服务端复核 |
| 改密入口 | `components/ui/UserMenu.tsx` 新增「修改密码」项（所有登录用户可见） |

### 4.2 复用件清单（**零新视觉值**）

`DataTable.tsx`（表身 + 列显隐 `ColumnVisibilityMenu.tsx`）· `Pagination.tsx` · `console/FilterBar.tsx`（筛选行）· `console/ConfirmDialog.tsx`（三动作二次确认）· `Drawer.tsx` / Dialog（建号 + 改密表单）· `console/PageHeader.tsx`（标题 + `[+ 新建用户]`）· `console/StatusPill.tsx`（状态药丸）· `EmptyState.tsx` / `ErrorState.tsx` · `Badge.tsx` · `Toaster`（成功/失败 toast）。
视觉局部决策（列宽 / 药丸文案 / 行内「（我）」「（末位超管）」标记样式）**随批就地定稿**并**就地补录 M4a §4.4 映射表**（U5 定案 · 不复制 SSOT）。

### 4.3 交互与边界（细化主 design §10.2）

- **状态 × 操作矩阵**（沿主 design §10.2 五行）：正常 = 改角色 / 封禁 / 吊销；已封禁（永久/到期）= 解封 / 吊销；**本人行** = 改角色与封禁禁用（标「（我）」）；**末位超管行** = 封禁与降级禁用（标「（末位超管）」）。
- **护栏**：不可改自己档位 · 不可把他人提到高于自己档位 · 不可封禁自己 · 不可使超管档位归零（服务端权威 · 前端同步禁用）。
- **边界 6 条**（主 design §10.2）：封禁/降级末位超管 ⇒ 拒 · 吊销自己 ⇒ 允许 + 成功后立即登出 · 建号冲突（邮箱/登录名）⇒ 表单内联错误且**不创建** · 提交期连点 ⇒ 按钮禁用 · 对已封禁再封禁 ⇒ **幂等成功** · 到期自动解封由服务端判定（前端不自行倒计时）。
- **不做乐观更新**（先例 §9）：动作成功后**重取当页**。

### 4.4 分页模式

**替换式页码**（`‹ 1 2 3 ›` + 「共 N 条」）：URL 不承载分页态（与既有 `/skills` 列表的查询参数范式一致者优先）；跨页选中不做（无批量操作）。→ `list-pagination-patterns` 的替换式分支，注意竞态（请求序列号守卫，先例 `hooks/useApi.ts`）。

### 4.5 自助改密 Dialog

三字段（当前口令 / 新口令 / 确认）+ 提交 ⇒ 官方 `POST /api/auth/change-password`（`update-user.mjs:75`）· body `{ currentPassword, newPassword, revokeOtherSessions: true }`（`update-user.mjs:82-91,180`）。
**仅本地账号**：目录账号（凭据委派行 `password='ldap:<工号>'`）在**入口层**按目标账号判定 ⇒ 拒绝并明确提示（**不用全局 `password.hash` 拒绝**，见 **F280**）；判定数据源 = 本仓 `account` 行前缀（我方只读）。
改密成功 ⇒ 提示 + 保留当前会话（`revokeOtherSessions` 只吊销其他端）。

### 4.6 i18n（`07` §3/§4）

| 组 | 内容 |
|----|------|
| 新增 `users` | 页标题 · 列头（账号 / 姓名 / 邮箱 / 角色 / 状态 / 最后登录 / 操作）· 筛选项与占位符 · 三个动作 + 确认文案 · 建号表单标签与校验错误 · 状态药丸文案 |
| 新增 `account` | 改密入口 / 三字段 / 目录账号拒绝提示 / 成功与失败文案 |
| `admin` | 「用户管理」条目已存在（`t('admin','users')`）；无新增 |
| 移除 | 与 `status` 三态相关文案（随 §3.5 列退休）；错误码文案按 §3.6（新增码 + 官方码键） |

## 5. 判据与回归面

| 类 | 判据 |
|----|------|
| 新 dogfood | **新增 `docs/smoke/scripts/m4c2-users-dogfood.ts`**（超管全动作 happy path + 护栏负例 + 边界 6 条 + 首页可见性）；纳入统一 runner `dogfood-all.ts` 的脚本表 |
| 既有回归 | 7 个既有 dogfood 全绿（`dogfood-all.ts` 一键跑）；**连带经实测复核**：`m4b2-auth-dogfood` 的占位断言取**SSOT 派生**（`navPlaceholderCount('超级管理')`，判据 = `placeholder >= SSOT`，只数 `BUTTON` 节点且文本匹配 `系统设置\|用户管理`）⇒ 「用户管理」改真链接后 placeholder **2 → 1 与 SSOT 同步**、**断言自动跟随（无需改脚本）**，仅需回归确认 |
| 门禁 | 12 步（CI 同序）逐项 exit 0；`db:migrate` 在 dev 与空库双跑（迁移幂等） |
| 探针 | §3.5 P1–P4 |
| 出口 | 主 design §15 五件（design 8 维 ≥9 · plan Task 全绿 · 五门禁 · dogfood · 整体审计） |

## 6. grilling 轮定案（U1–U5 · 2026-10-09 · 用户「全按推荐来」）

| # | 项 | 定案 | 否决项（不入正文 · 纪律） |
|--:|----|------|------------------|
| U1 | F270 处置 | **甲 一致性哨兵**（§3.3 · 新码 `user.list_failed`） | 乙 不消解只留观 |
| U2 | 分页模式 | **甲 替换式页码**（§4.4 · 与官方 `total` 对齐） | 乙 追加式「加载更多」 |
| U3 | 管理档直访 | **甲 读列表 200 + 动作 403**（§4.1） | 乙 管理档整页挡回 |
| U4 | 建号初始口令 | **甲 管理员必填**（§3.2） | 乙 允许留空 |
| U5 | 视觉补录 | **甲 就地补录 M4a §4.4 映射表**（§4.2） | 乙 本设计另附小节 |

## 7. 接口变更总览（服务端面）

| 变更 | 类型 | 说明 |
|------|------|------|
| `GET /api/admin/users` | **新增** | 列表（筛选 / 排序 / 分页）· 委托官方 `list-users` |
| `POST /api/admin/users` | **新增** | 建号（本地账号）· 委托官方 `create-user` + 同事务直写 username |
| `PATCH /api/admin/users/:id/role` | **新增** | 改角色（含护栏） |
| `POST /api/admin/users/:id/ban` · `…/unban` | **新增** | 启停（官方封禁三件套） |
| `POST /api/admin/users/:id/sessions/revoke` | **新增** | 强制登出（**不提供会话列表** · R20） |
| `POST /api/auth/change-password` | **新增采用**（官方端点） | 自助改密 · **零本仓薄端点** |
| 权限码 `session:['revoke']` | **新增** | 仅 revoke |
| `user.status` 列 | **删除** | 迁移 `0016`；判定改读官方 `banned` |
| 审计动作 `user.*` ×5 | **新增** | 单源 `audit/actions.ts` |
| 我方错误码 ×5（+1 可选） | **新增** | §3.6 |

## 8. UI-UX 变动总览

| 面 | 变动 |
|----|------|
| 新页 | `/admin/users`（列表 + 筛选 + 分页 + 行操作 + 建号 Dialog） |
| 既有页 | `UserMenu`（+「修改密码」项 + Dialog）；「用户管理」侧栏条目占位 ⇒ 真链接 |
| 视觉 | **零新视觉值**（全部复用控制台件）；局部决策随批就地定稿并补录 M4a §4.4 |
| 未涉及 | `/login` 视觉（M4c-3）· 既有控制台各页不变 |

## 9. 线框图

**用户管理页 `/admin/users`**（同主 design §12 形态 —— 本批落地的真值版）

```text
┌─ AppShell ─────────────────────────────────────────────────────────────────┐
│ TopBar（品牌 / 搜索 / 用户区[+修改密码]）                                   │
├─ SideNav ───┬─ 主区 ───────────────────────────────────────────────────────┤
│ 超级管理     │ 用户管理                                    [ + 新建用户 ]    │
│  标签定义    │ ┌─ 筛选 ──────────────────────────────────────────────────┐   │
│  系统设置    │ │ [字段 ▾ 工号/姓名/邮箱] [关键词]  [角色 ▾]  [状态 ▾] [重置]│   │
│ ★用户管理    │ └─────────────────────────────────────────────────────────┘   │
│              │ ┌─ 表 ─────────────────────────────────────────────────────┐ │
│ 管理         │ │ 账号       │姓名 │邮箱 │角色 │状态    │最后登录│操作│列显隐│ │
│  资产治理    │ ├────────────┼─────┼─────┼─────┼────────┼────────┼────┼─────┤ │
│  审核管理    │ │ 59901934   │孙学文│…    │超管 │正常    │10-08   │ ⋮  │     │ │
│  审计日志    │ │ 60012345 我│张三 │…    │用户 │正常    │10-08   │ ⋮(禁用改角色/封禁)│ │
│              │ │ 60067890   │李四 │…    │用户 │已封禁  │09-30   │ ⋮  │     │ │
│ 个人         │ └─────────────────────────────────────────────────────────┘ │
│  …           │ ‹ 1 2 3 ›                            共 N 条                │
└──────────────┴───────────────────────────────────────────────────────────┘
行操作菜单（⋮）：改角色 · 封禁/解封 · 吊销会话（均二次确认；封禁填原因/可选到期）
末位超管行：封禁 与 降级 禁用并标「（末位超管）」
```

**自助改密 Dialog（用户菜单入口）**

```text
┌─ 修改密码 ───────────────────────────┐
│ 当前口令  [                        ]  │
│ 新口令    [                        ]  │
│ 确认新口令[                        ]  │
│ ⓘ 目录账号口令由企业目录管理 ⇒ 请走  │
│   企业目录（本地账号方可在此修改）    │
│                    [ 取消 ] [ 确定 ]  │
└──────────────────────────────────────┘
```

## 10. 引用文件清单

**上游（官方件 · `better-auth@1.7.5`）**：`plugins/admin/admin.mjs`（`:16` `bannedUserMessage` · `:33-47` 封禁检查与 `BANNED_USER`）· `plugins/admin/routes.mjs`（`:306-320` `listUsersQuerySchema` · `:322` `listUsers` · `:378` 吞错 `catch` · `:43` `setRole` · `:506` `banUser`（body 模式 `:480`）· `:447` `unbanUser`（body 模式 `:431`）· `:133` `createUser` · `:710` `revokeUserSessions` · `:753` `removeUser`（**不接线**））· `api/routes/update-user.mjs`（`:75` `/change-password` · `:82-91` body · `:180` `revokeOtherSessions`）

**本仓（服务端）**：`apps/server/src/http/admin.ts`（薄层范式先例）· `apps/server/src/http/oidc-routes.ts`（服务端直呼官方 api 先例）· `apps/server/src/http/auth-middleware.ts`（`requireRole`）· `apps/server/src/auth/roles.ts`（权限码 statement）· `apps/server/src/audit/actions.ts`（审计单源）· `apps/server/src/auth/errors.ts` · `apps/server/src/auth/better-auth.ts`（`admin({ bannedUserMessage })` · `additionalFields.status`）· `apps/server/src/db/schema/auth.ts:61` · `apps/server/src/auth/rbac.ts` · `apps/server/src/auth/identity.ts`（`statusError`）· `apps/server/src/db/seed.ts` · `apps/server/drizzle/0015_auth_credential_delegation.sql`（迁移载体范式）

**本仓（前端）**：`apps/web/src/main.tsx`（路由）· `components/ui/navItems.tsx` · `components/ui/UserMenu.tsx` · `components/ui/{DataTable,Pagination,ColumnVisibilityMenu,Badge,EmptyState,ErrorState}.tsx` · `components/console/{FilterBar,ConfirmDialog,Drawer,PageHeader,StatusPill}.tsx` · `apps/web/src/api/auth.ts`（SDK 单点）· `apps/web/src/i18n/{zh,en}.ts`

**规范/设计**：`docs/05` §3.1 / §4.1 · `docs/08` §3 · `docs/07` §3/§4 · 主 design `2026-10-08-m4c-account-and-access-governance-design.md` §4/§7/§8/§10/§11/§12 · `2026-09-09-m4a-marketplace-portal-design.md` §4.4（视觉 SSOT）

## 11. 8 维自检（首稿 + grilling 后重评）

| 维度 | 分 | 依据 |
|------|:--:|------|
| 完整性 | 8.5 | 目标/非目标 · 8 条拍板 · 端点契约 · 迁移 · 前端 · 判据 · 线框 · 引用齐；**缺** grilling 轮坐实（U1–U5）与 Task 级拆分（归 plan） |
| 一致性 | 9.5 | 与主 design §4/§7/§8/§10/§11/§12 逐条对齐；权限码与档位映射实测一致 |
| 清晰度 | 9.0 | 契约表化；「我方自绘理由」单列（F270 · `lastLoginAt`） |
| 可实施性 | 8.5 | 落点/入参/出参/委托目标/官方行号齐；**待** U1–U5 收口后可直落 plan |
| 设计纯粹性 | 9.5 | 零新自绘端点（全部委托官方）；唯一我方 SQL = 只读聚合（理由已写明） |
| 边界覆盖 | 8.5 | 状态×操作矩阵 5 行 + 边界 6 条 + 幂等/自我锁死/末位超管；**待** U1/U3 定案 |
| 实施精度 | 9.0 | 官方 dist 行号 + 本仓落点 + 迁移三件 + 探针 P1–P4 |
| 跨平台 | 9.5 | 无平台差异面（纯 Web + 服务端）；迁移为纯 SQL |

**标准 4 维 8.875 ｜ 深度 4 维 9.125 ｜ 综合 9.00**

### 11.1 grilling 轮处置后重评（v0.2 · 定稿）

| 维度 | 首稿 | 重评 | 变动理由 |
|------|:---:|:---:|---------|
| 完整性 | 8.5 | **9.5** | U1–U5 全定案（F270 哨兵 / 分页 / 直访 / 初始口令 / 视觉补录落点） |
| 一致性 | 9.5 | 9.5 | 与主 design 契约逐条一致；定案未引入相悖项 |
| 清晰度 | 9.0 | **9.5** | 我方自绘两处（`lastLoginAt` 聚合 · F270 哨兵）**理由与边界**单列且写死 |
| 可实施性 | 8.5 | **9.5** | 落点 / 入参 / 出参 / 委托目标 / 官方行号齐 ⇒ plan 可直落 |
| 设计纯粹性 | 9.5 | 9.5 | 零新自绘端点；我方 SQL 仅「只读聚合 + 只读 count 哨兵」 |
| 边界覆盖 | 8.5 | **9.5** | 矩阵 5 行 + 边界 6 条 + 幂等 / 自我锁死 / 末位超管 / 到期瞬间（重取即得，不做本地定时解锁） |
| 实施精度 | 9.0 | **9.5** | 官方 dist 行号 + 本仓落点 + 迁移三件 + 探针 P1–P4 |
| 跨平台 | 9.5 | 9.5 | 无平台差异面 |

**标准 4 维 9.50 ｜ 深度 4 维 9.50 ｜ 综合 9.50**（v0.2 自报）

### 11.2 声明核验轮重评（v0.3 · 定稿后复检 —— **撤回 11.1 的自报分**）

**方法**：按 `design-doc-claim-verification`（含「上游引用件三查」）对文档内**全部可量化声明**逐条回读真码（29 条）。

| 检查面 | 条数 | 命中 |
|--------|:--:|------|
| 官方 dist 行号/符号/返回体（`admin.mjs` · `routes.mjs` · `update-user.mjs`） | 18 | **1 ❌**：`banUser` / `unbanUser` 行号**互换**（已修：`:506` / `:447`，并补 body 模式行 `:480` / `:431`） |
| 本仓落点与事实（`assets.ts:284` · `auth-middleware.ts:93` · `roles.ts` · `audit/actions.ts` · `schema/auth.ts:61` · `journal` 16 · 复用件 12/12 · F267–F270 登记） | 9 | 全 ✅ |
| 数字/连带声明（`m4b2` 占位断言 · dev 库 2 行归属） | 2 | **1 ❌**：`m4b2` 占位断言实为 **SSOT 派生 ⇒ 自动跟随**（非「须同步改脚本」）⇒ 已改述；`dev 库 2 行` = 引主 design §2.5（归属已标注） |

| 维度 | 11.1 自报 | 核验后 | 变动理由 |
|------|:---:|:---:|---------|
| 完整性 | 9.5 | 9.5 | 29 条声明全部可回读；零缺章 |
| 一致性 | 9.5 | 9.5 | 与主 design 逐条一致；核验未发现相悖项 |
| 清晰度 | 9.5 | 9.5 | 自绘两处理由 + 边界单列 |
| 可实施性 | 9.5 | 9.5 | 修正行号错位后，实现者可直接照引 |
| 设计纯粹性 | 9.5 | 9.5 | 零新自绘端点；只读 SQL 两处理由写明 |
| 边界覆盖 | 9.5 | 9.5 | 矩阵 + 边界 6 条 + 静默空列表转显式失败 |
| **实施精度** | 9.5 | **9.4** | ⬅ **本轮实测扣**：「dev 库命中 2 行」为**引用上游立项期实测**，本设计未自测（迁移 Task 内 P2 复核） |
| 跨平台 | 9.5 | 9.5 | 无平台差异面 |

**标准 4 维 9.50 ｜ 深度 4 维 9.48 ｜ 综合 9.49** —— 满足定稿门（≥9 ✓）
> 口径：本轮**撤回** 11.1 的自报 9.50（自报未经真码核验）；9.49 = 核验后可复查分数。残余 1 项（上游实测引用）已在正文标注归属，并列为迁移 Task 的探针复核项。
> 未覆盖且已归他处：Task 级拆分与行数预估 → 批 plan；真页面视觉稿 → 实现期随批就地定稿（本仓惯例）。

## 12. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.9 | 2026-10-10 | **F296 收尾（新会话专查 · 用户拍板「按 1 来」）** —— ① **4 条剩余失败逐条查清**：在**全新自管实例**上 `m4a` 隔离 **64/0** · 全量 **64/0**、`m4b2` 全量 **24/0** ⇒ 515/4 里那 4 条**全部不可复现**，性质 = **降级实例假红**（F297 同族；两处指纹与判读件见 §13 F296 行）② **`m4b2` G5 断言口径修正**（= F298）：原写死 `path === '/login'`（前提「守卫保码归位」）与 §4.4/§9.3「登出 → 回首页」**相反** ⇒ 改按**设计契约**（不留在受保护路由 + 三档角色面归零 + 用户区回「登录」入口 + `/me` 401），判定复用应用侧单点 `apps/web/src/auth/next.ts` 的 `isProtectedRoute`（**不复制前缀清单**）③ **`m4a` 断言语义不动**（16px 物理尺寸这道视觉闸保留），仅把 `getComputedStyle` **布局值**与物理值并列进 `::` 明细 ④ 新登记 **F298**（登出落点不确定 · 产品侧待拍板）· §13 F296 行改写为「已关 + 残余（`m4b3` 找现成标签，不构成失败依赖）」⑤ **新登记 F299**（runner **浏览器生命周期泄漏**：唯一清理钩子 `process.on('exit')` 永不执行 ⇒ 实例泄漏 + 下一轮**静默复用旧实例** = **F297 的生成机制**；已确诊清理；**代码侧已修**（成功路径 `process.exit(0)` · 实测**自发退出** + 零泄漏 · 提交 `48372b4`）） |
| v0.8 | 2026-10-09 | **T7 实施期：F296/F297 登记（dogfood 工具链与环境两处缺陷）** —— ① 清理会清空 `5173` 标签而 `m4b2`/`m4b3` 不自建标签 ⇒ 0 标签秒退（已兜底绕过）② 长期运行的无头调试 Edge ⇒ CDP 僵死（卡 `about:blank` 不导航 · 烧满 900s 超时 · 激活无效）⇒ 重启 + 换新 profile 处置中 |
| v0.7 | 2026-10-09 | **T7 实施期：F295 登记（脚本目录静态检查盲区）** —— T3 删 `user.status` 后 4 个种子脚本仍读写该列（3/4 为原生 SQL ⇒ tsc 原理上抓不到）⇒ 全量 dogfood 前置体检 `exit 2`，由新 dogfood 的 F293 自愈前置暴露；本轮已修全部 4 处，处置待拍板 |
| v0.6 | 2026-10-09 | **T5 落地 + R21 处置定案（A 案 · 用户拍板）** —— ① 实测缺口：目录账号判定信息在 web 侧不可得（官方 `get-session` 无 account/provider 信息）⇒ 处置 = 给**既有薄层** `/api/auth/me` 出参 **+1 只读字段 `hasLocalPassword`**（判定 = 凭据行 `password` 不以 `ldap:` 开头）⇒ 前端据此隐藏改密入口（严格满足「入口层拒绝」）；原「`/api/auth/me` 形状逐字不变」口径随之**局部放宽**（其余字段与语义不变）② 落地件：`ChangePasswordDialog`（自绘 UI · 官方端点直调）+ `UserMenu` 条件入口 + `AuthProvider.hasLocalPassword` + i18n `account` 组 |
| v0.5 | 2026-10-09 | **T4 落地后的设计订正（实测 vs 设计偏差 2 处）** —— ① 复用件清单：`FilterBar` **未采用**（其契约仅容「状态 + 关键词」两控；本页需 4 控 ⇒ 改就地 `shadcn Select/Input`，与 `AdminAudit` 同法）② **列显隐（`ColumnVisibilityMenu`）本批不做**（非主 design §7.1 契约项，属我自列的复用候选 ⇒ 收口为「零新增交互」）|
| v0.4 | 2026-10-09 | **T2 实施期：F294 订正（用户拍板「A」）** —— 官方 `list-users` 单次仅容一组 search（字段限 `email`\|`name`）+ 一组 filter 且 AND 组合 ⇒ 跨字段 OR 不可直给；改为**「字段选择器 + 关键词」**（`field` ∈ username/name/email ⇒ 分派官方 filter/search 通道）· 定 `field=username` 与 `role` 冲突规则 · 新增 **§13 实施期发现与处置（F294）** · §3.2 / §3.3 / 线框三处同步 |
| v0.3 | 2026-10-09 | **声明核验轮（定稿后复检 · 用户「先检查并打分」）** —— ① 方法：按 `design-doc-claim-verification` 三查（件在哪个包 / 导出符号 / 计数单位）+ 本仓落点回读，共 **29 条可量化声明** ② **命中 2 处真缺陷并修**：官方 `banUser` / `unbanUser` 行号**互换**（真值 `:506` / `:447`；补 body 模式 `:480` / `:431`）· `m4b2` 占位断言连带口径失真（实为 **SSOT 派生 ⇒ 自动跟随**）③ 复验两条全过 ④ 评分：**撤回 v0.2 自报 9.50**（自报未验）⇒ 核验后 **9.49**（标准 9.50 · 深度 9.48 · 残余 = 上游实测引用未自测）⑤ 门禁：doc-audit 259/0 · table-structure 46/0 · file-ref-closure 37/0 · doc-claims 130/0 |
| v0.2 | 2026-10-09 | **定稿** —— grilling 轮 U1–U5 全部定案（用户「全按推荐来」）：① **F270 处置 = 一致性哨兵**（同一筛选条件我方 `count(*)` 与官方 `total` 交叉核对 · 不一致 ⇒ 500 `user.list_failed` · 代价 = 每次列表多 1 次 count）② 分页 = 替换式页码 ③ 管理档直访 = 读列表 200 + 动作 403 ④ 建号初始口令必填 ⑤ 视觉补录就地入 M4a §4.4 映射表；§6 未决项 → 定案表（否决项只记一行 · 不入正文）；8 维重评 **9.00 → 9.50** |
| v0.1 | 2026-10-09 | **首稿** —— 立项对齐 8 条拍板结果（用户「全按推荐来」）· 服务端薄层委托范式（headers 透传 + 出参归一 + 双保险）· 端点契约 6 条（含官方 dist 行号）· 列表取数与 **F270** 处置（甲/乙待定）· `lastLoginAt` 我方只读聚合（**理由已写明**）· 迁移 `0016`（`status` 列退休 + 探针 P1–P4）· 权限码 `session:['revoke']` · 审计动作 `user.*` ×5 · 前端零新视觉值（复用件清单 · 就地补录 M4a §4.4）· 线框两幅 · 判据（新 dogfood + 既有回归 + 连带 `m4b2` 占位条目断言）· 未决项 U1–U5 待 grilling · 8 维首稿 **9.00** |

## 13. 实施期发现与处置（F…）

| F | 类 | 发现（实测） | 处置 |
|---|----|------------|------|
| **F294** | 官方件能力边界 | 官方 `list-users`（`plugins/admin/routes.mjs:306-320`）单次只容**一组 search**（`searchField` 被 z.enum 限死 `email`\|`name`）+ **一组 filter**（任意字段/操作符），二者 **AND** 组合 ⇒ **跨字段 OR 搜索不可直给**（§3.2 原写「`q` 跨工号/姓名/邮箱」无法表达） | **T2 实施期已定案「A」**（用户拍板）：UI 改**「字段选择器 + 关键词」**，按 `field` 分派到官方 search/filter 两通道（§3.3 映射表）；并定 `field=username` 与 `role` 同用时的冲突规则（忽略 role + UI 禁用）。**零我方 SQL**；§3.2 / §3.3 / 线框已同步 |
| **F295** | 工具链盲区 | **`docs/smoke/scripts` 的原生 SQL 字符串不在任何静态检查面** —— T3 删 `user.status` 列后，**4 个种子脚本**仍读写该列（`m4b2-seed-roles`（1 处 drizzle insert + 1 处 `db.$client.query` 原生 SQL）· `m4b4-seed-assets` · `m4b5-seed-reviews` · `m4b6-seed-downloads`（查询 `where status='ACTIVE'`））⇒ 全量 dogfood **前置体检 exit 2**（`42703: column "status" … does not exist`），由 T7 新脚本的 F293 自愈前置暴露。**为何 T3 漏**：① `apps/server/tsconfig.json` 的 `include: ["src"]` ⇒ 脚本目录**不在 tsc 覆盖面**；② 即便纳入 tsc，4 处里 **3 处是原生 SQL 字符串** ⇒ 类型检查**原理上**抓不到 | **T7 已修全部 4 处**（复查零残留；全量 dogfood 前置体检转绿）· **处置待拍板**：甲 = 批末强制「已删列名全仓 grep（含 `docs/smoke`）」+ CI 加一条轻量「已删列名不得出现在脚本 SQL」检查；乙 = 仅登记 + 批末人工 grep；丙 = 暂不处置 |
| **F296** | 工具链盲区 | **`dogfood-all` 的标签清理会关掉所有含 `5173` 的标签**，而 `m4b2`/`m4b3` 只会「取现成 page 标签」（`targets.find(url.includes('5173')) ?? targets.find(type==='page')`）—— **自身不建标签** ⇒ 清完标签数 = 0 时**开场秒退**（`error: 无可用浏览器 tab（Edge CDP :9222）` · 实测 `0 PASS / 0 FAIL · EXIT=1 · 0.0s`；`m4a`/`m4b4` 有自建标签能力故不受影响）。临时兜底 = 预置一个**非 5173** 的干净标签供其兜底选用 | **T7 本轮已用兜底绕过并实证**（run5 不再秒退）；**根因处置待拍板**：建议 `m4b2`/`m4b3` 改为**一律自建标签**（与 `m4a`/`m4b4` 既有做法对齐），而非依赖环境里恰好有标签 **⏳ 未关（本轮两轮尝试均未收敛 · 已全部回退 · 2026-10-09）**：根因已缩小到三层 —— ① `dogfood-all` 清理关掉所有 `5173` 标签 × `m4b2`/`m4b3` 只「找现成标签」⇒ 0 标签开场秒退（+ 兜底标签可绕过）② 旧逻辑会**捡 `m4a` 遗留的 `/dashboard` 标签** ⇒ 通过与否**依赖前序脚本遗留状态** ③ `m4b2` 的 G5 登出断言**前提 = 应用处于受保护路由**（该脚本自身不导航到受保护路由）。**尝试记录（含负结果）**：第一轮「自建标签 + 直落 `${APP}/`」⇒ 单跑 24/0 但 runner 内仍 22/2；第二轮「+ runner 每脚本前重置浏览器状态（清 cookies/origin 存储）+ 起始 URL 改 `${APP}/dashboard`」⇒ 隔离验证 24/0，但**全量退化到 4/8**（`m4b4`/`m4b5`/`m4b7` **超时**）⇒ **判定该方向有害，已全部回退**（`git checkout` 三个脚本文件至 HEAD，即今日实测 **8/8 · 519/0** 的基线）。**结论**：现有实现「靠前序脚本遗留标签」虽然耦合丑陋，但**是当前全量绿的既成事实**；改它需成体系重做（脚本自建+自清+受保护路由起步，逐个验证），故**留待专批**，不在本批末尾仓促改。**归因修正（2026-10-09）**：在**重启无头调试实例**的新鲜环境上复跑，**回退后的 HEAD 脚本 = 519 PASS / 0 FAIL · 8/8** ⇒ 当日「4/8 退化」与两次 `22/2` **主因是 CDP 老化（F297）**，非任一改动；回退保留（未验证方向不入树），但归因已更正。**✅ 已关（2026-10-10 · 新会话专查 · 用户拍板「按 1 来」）**：三层逐层落定 —— ① **秒退层**：runner **自管浏览器实例 + 每脚本健康探针**（`8bc2a12`）⇒ 恒有 page 标签 ⇒ 不可能「0 标签」（**注**：但「每轮真拿到全新实例」**不总成立** —— 见 **F299**：清理钩子不触发时会静默复用上一轮实例）；`m4b3` 自带 `?? find(type==='page')` 兜底且**自设视口**（`setDeviceMetricsOverride`）⇒ 无前序视口依赖 ② **遗留标签层**：`m4b2` 已改**自建标签**（`c22ccea`）；`m4b3` 仍「找现成标签」（残余耦合，见下）③ **断言前提层**：G5 断言写死落点 = 锁竞态 ⇒ 已按 design 契约加固（= **F298**）。**实测（全新自管实例 · 正反双证）**：`m4a` **隔离 64/0**（82.5s）· **全量 64/0**（77.6s —— 同序同脚本，此前全量报 62/2）· `m4b2` **全量 24/0**（45.7s，此前 22/2）⇒ **515/4 的 4 条全部不可复现**，性质 = **降级实例假红**（与 F297 同族）。**耗时口径**：上列耗时取自 runner **实时汇总（stdout）· 未落盘** ⇒ 事后仅 PASS 计数可复核（本笔已逐份 `.log` 正则计数核对 = **64 / 24 / 43 / 89 / 62 / 108 / 104 / 25 = 519** ✓）。**两处假红的可判读指纹（本轮固化）**：① 进场动画定格 `zoom-in-95` ⇒ 箭头**物理 15.2 → 打整 15px**，而**布局值仍 16px** —— 本轮已把 `getComputedStyle` 布局值并列进 `m4a` 的 `::` 明细（无需重跑即可判「环境 or 真回归」）② 退场动画不结束 ⇒ Radix `Presence` 不卸载节点 ⇒ 「`Esc` 关面板」假红。**`m4a` 断言语义不动**（16px 物理尺寸这道视觉闸必须留：入场动画真坏导致**永久缩小**属真缺陷，不能为迁就降级实例而放宽）。**残余（如实）**：`m4b3` 仍「找现成标签」（会捡前序脚本遗留标签）—— 实测**不构成失败依赖**（page 兜底 + 自设视口 + 断言不依赖前序页状态）；建议随工具链专批统一为「自建 + 自清」（与 `m4b2` 对齐），不阻塞本批 |
| **F297** | 环境/工具链 | **长期运行的无头调试 Edge 会让 CDP 僵死** —— 实测该实例（`--headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/edge-m4b5-t8`）已连续运行 **1 天 4 小时**、profile 位于 `/tmp`；症状 = 浏览器脚本卡在 `about:blank` **不导航** · CPU 0.0% · 每次**烧满 runner 的 900s/脚本超时**（`EXIT=null（超时）`）；**激活标签无效**（实测 `/json/activate` 后 90s 仍不动）。旁证：API 级 `m4c2-users-dogfood` 在同环境下 **2.5s / 25 PASS 0 FAIL** ⇒ 与代码无关，**纯环境**。附带事实：runner **自带 900s/脚本超时** ⇒ 卡住会自走，**无需人工 kill**（本轮曾误判为「必须 kill」） | **T7 本轮执行**：停该实例 → 换新 profile（`/tmp/edge-m4c2-t7`）重启 → 单跑 `m4b2` 3 分钟验证 → 通过再跑全量。**生成机制见 F299**（清理钩子永不触发 ⇒ 上一轮实例被静默复用 ⇒ 实例持续老化；故「重启」须**停掉旧实例**才有效） |
| **F298** | 设计 ⇄ 实现偏差（登出落点） | **登出落点不确定**：批 design **§4.4** 明文「清会话上下文（置 `anon`）+ `invalidateCache()` + `navigate('/')`（U2：登出回首页）」· **§9.3 G5 验收行**「登出 → 回首页」· **§5.1 T4 实测记录**「URL → `/`」，应用侧 `UserMenu.tsx:88` 亦为 `navigate('/', { replace: true })`；**但实测两态都有**（**2026-10-10 逐份 `.log` 回读订正**：原写「健康实例（隔离 + 全量，共 3 次）落 **`/login`** 与实物不符 —— 实为 **1 次**落 `/login`，且那是**换断言前**的全量跑 `f296-full`〔`sidebar=0` · 独立版式〕）—— **换新断言后 3 次**跑（`f296-final` · `f296-final2` · `runB2`）**均落 `/`**（公开首页 · 门户 4 条在）· 降级实例（515/4 那次）亦落 **`/`**。两侧代码都在场：`UserMenu` 末句 `navigate('/')` 与「anon 落受保护路由」的两条路径（`RoleGuard.tsx:38` · `api/client.ts` 401 分流 §4.2 ②）⇒ **「哪条最后生效」属执行序竞态，机制未定论（未加探针实测）**。**此即 515/4 中 `m4b2` 那 2 条的成因**：原 G5 断言写死 `path === '/login'` ⇒ 锁的正是**竞态结果**，落 `/`（**恰为 §4.4 明文口径**）反被判红 | **本轮处置 = 断言侧（不动产品代码）**：`m4b2` G5 改按**设计真正保证的契约** —— 「登出后**不留在受保护路由**」（判定复用应用侧单点 `apps/web/src/auth/next.ts` 的 `isProtectedRoute` ⇒ **不复制前缀清单**）+ 三档角色面（个人 / 管理 / 超级管理）归零 + 用户区回「登录」入口（落 `/login` 独立版式无壳时免）+ `/me` 401；实测落点（含 `search`）写入 `::` 明细。**验证**：全新自管实例全量 `m4b2` **24 PASS / 0 FAIL** ✓（断言**条数不变** = 24，零计数漂移）。**产品侧待拍板（本轮未改）**：是否让登出落点**确定化**（对齐 §4.4「回首页 `/`」）—— 需动 `UserMenu` / `AuthProvider`，建议归 **M4c-3**（属产品行为变更，不在测试基础设施范围内） |
| **F299** | 工具链缺陷（浏览器生命周期） | **`dogfood-all.ts` 自管实例的清理路径永不执行** —— 唯一的清理钩子是 `process.on('exit', killBrowser)`，而 `spawn()` 的 Edge 子进程**持有事件循环**（**隔离双证实测**：不 `unref` **2.032s** · `unref()` **2.035s** ⇒ **连 `unref()` 在 Bun 1.3.14 都不生效** · `kill` 子进程 **0.033s** · `process.exit` **0.020s**） ⇒ 主进程打印完汇总**不退出**（实测：两个 runner 分别存活 **19:33 / 17:38**，且**只有全绿路径会泄漏** —— 失败路径显式 `process.exit(1)` 反而触发钩子）⇒ ① 自己起的 Edge 永不被清（本轮两轮各泄漏 1 个实例）② **下一轮 runner 新起的 Edge 绑不上 9333**（端口已被上一轮占用；实测一轮落 **IPv4**、下一轮落 **IPv6**），而各脚本一律连 `127.0.0.1`（IPv4）⇒ **静默复用上一轮实例**（本轮实测：full 跑实际用的是 runA 的 `edge-dogfood-Hv472x`；其打印的「清理陈旧 `5173` 标签 1 个」即该实例的遗留标签）⇒ **实例持续老化 = F297 的生成机制**；且「每轮全新 profile」的干净基线承诺不成立（复用旧 profile ⇒ 旧 `localStorage` / 历史标签）③ 推论：runner 的「探针失败 ⇒ **重启浏览器实例**」路径同样失效（新实例绑不上端口 ⇒ 探针仍连旧实例、脚本照旧跑在旧实例上）—— 与 F297 行「当时见效的是**手工**停实例」互为印证 | **本轮处置（确诊后清理）**：按 pid 停掉 2 个泄漏 runner（`SIGTERM` ⇒ 其信号钩子生效 ⇒ 连带清掉 2 个 Edge）⇒ 9333 空出 · 零 profile 残留（实测）⇒ 其后 **runB2** 才拿到**真·全新实例**（开场「`5173` 标签已是干净态」；**注**：`runB` 是导入路径写错导致的秒退跑，非有效跑 —— 见证据 §3.3）。**✅ 代码侧已修（2026-10-10 · 用户批准后落地）**：成功路径**显式退出**（`process.exit(0)` —— 与失败路径同法，退出钩子随即 `killBrowser()`）⇒ 使「自管自灭」真正成立；**实测生效**：runner **自发退出**（`EXIT=0`、**不再需要人工 `SIGTERM`**）· 9333 已释放 · **零**泄漏进程 / 临时 profile（提交 `48372b4`）；⚠ **不要用 `browserProc.unref()`**（隔离实测**无效**，见本行「持有事件循环」处四个读数） |
