# M4b 管理后台设计

> Date: 2026-09-10
> Updated: 2026-09-10（**v1.3：视觉体系切换对齐（用户 2026-09-11 拍板）**——全站统一 **shadcn 蓝科技**，**视觉真值 SSOT 移交 M4a design §4.4**（本文件 §10.1 改为引用 + 只记控制台特有值）；§6.1 依赖/§6.2 组件树（shadcn 原语落位）/§3.1/§10.2/§13/§14/§15 同步；**顺序翻转**：原「先控制台面」→ 现「先门户换皮 → 再 M4b」（M4b 依赖 M4a 视觉体系切换先行，故本文件本期只做**对齐**、不动实现）；控制台特有值 2 项（表格密度 / 抽屉宽）**待拍板**，本版不落值；**v1.2：范围调整（用户 2026-09-10 拍板 A）**——§2.1 **R3 翻转**（用户管理移出 → M4c「账号与权限治理」）· §2.2 In/Out 与 §3.0 阶段对照 · §14 同步项与漂移登记 · §15 记录；v1.1：入口分层修正（恢复已拍板两层架构）+ 环节 0 收口 + 8 维自检 9.4**——`/dashboard/*` 个人面 + `/admin/*` 治理面 · 共享详情 `/reviews/:id` · 组件面域 `console/` · 新增 §5.1 页面职责矩阵 + §12 第 8 张线框；**详细变更见 §15**。v1.0：按 M4-pre 扁平化模型整体重写；v0.3/v0.2/v0.1：见 §15）
> Status: 草稿（v1.3：**视觉体系对齐**——视觉真值 SSOT 移交 **M4a design §4.4**（全站 shadcn 蓝科技），本文件 §10.1 只留控制台特有值；**依赖 M4a 视觉体系切换先行**（阶段 0 探针切片 → 三判 → 剩余页换皮），M4b **尚不进入实现**。v1.2：**范围调整**——用户管理移出 → **M4c**（`docs/00` §5 已新增 M4c 行「账号与权限治理」）；R3 翻转为 R3′。**定稿条件**（对标 M4a Status 纪律）：① **视觉体系收敛**——由 M4a design **v0.20** §4.4 承载（全站 SSOT；**版本随 M4a 演进，以 M4a design 版本头为准**）+ 控制台特有值 2 项**待拍板**（表格密度 40/48 · 抽屉宽 384/560）；② **三族适用性实证**（审核详情 manifest 卡分型随原型实证）；③ grilling 已闭环（R1-R9 + 本轮补充锁定 5 条全锁定，v1.1 8 维自检 9.4）——三项齐备后由用户批准定稿）
> Scope: M4b（00 §5）——管理与治理后台：审核队列 · 标签管理 · 资产生命周期 · 令牌 · 审计浏览；真实登录与会话（角色感知）；zh/en 双语；复用 M4a 组件基建
> 引用链：本文档 → 规范 00 §5/§7 · 05 §3/§6 · 06 §5 · 07 全 · 08 §5/§7（引用不复制，字段与规则以规范为准）；模型事实源 = `2026-09-10-flat-model-refactor-design.md`（M4-pre）

## 1. 背景与文档定位

M4a 市场门户已收官（2026-09-09：portal design v0.8 定稿落地，T1-T19 全绿 538 tests，
dogfood 记录 `docs/smoke/2026-09-09-m4a-t18.md`）。00 §5 将 M4 拆为两子里程碑：
M4a 消费者视角公开门户（已交付）→ **M4b 管理后台**（本文档），复用 M4a 组件基建。

**M4-pre 扁平化重构已完成（2026-09-10，00 §5 已加 M4-pre ✅ 行）**——角色 4 档线性单值、
空间域整体删除、可见性整体删除、坐标改全局唯一裸 slug（事实源
`docs/designs/2026-09-10-flat-model-refactor-design.md`）。本文档 v0.3 的「平台角色数组」契约、
空间管理章节、空间角色判定与可见性字段**随之全部作废**，v1.0 按新模型重写。

**前置已就绪（代码实证，非文档推断）**：

- 服务端治理端点已由 M3 全量铺完（审核/标签/生命周期/令牌/审计——§7.1 逐端点实测表），
  M4b 以**消费既有端点为主体**，仅补 2 处缺口（§7.2）
- **角色感知契约已由 M4-pre 交付**：`GET /api/auth/me` 现返 `{ user: { id, displayName }, role }`
  （`auth/routes.ts:115-122`）——前端显隐直接按 `role >= N`，**M4b 零服务端改动**（R5，§3.3）
- `apps/web` 已有五路由公开门户 + `components/ui/` 跨面原子层（AppShell/TopBar/SideNav/
  FileTree/FilePreviewDialog/MarkdownRenderer/AssetAvatar/Badge/Pagination/EmptyState/
  ErrorState）——M4a 收官时按「M4b 直接复用层」设计（M4a design §4.2）
- i18n 机制（I18nProvider + useApi 语言感知缓存）与 **`styles/aih-theme.css`**（AIH 层视觉 token：语义补丁 / 基色 / 品牌渐变 / 动效 / 旧层迁移面）可直用——⚠ **原 `styles/tokens.css` 已于 T24 删除**（2026-09-11），引用请改指 `aih-theme.css`

**流程定位**（沿用 M4a 全链）：design（决策档案 + 拍板表）→ 视觉环节（精简版，R9）→
8 维自检 ≥9 / grilling → 定稿 → M4b plan → 编码测试 → converge（00 §7 ②）。

**对标依据（本设计的两个外部参照）**：

- **21-skillhub 源码**（Apache-2.0，本地 `/Users/xuewensun/04-ws/21-skillhub`）：
  管理动作走独立 `/api/v1/admin/*` 端点面（AdminSkillController/UserManagementController/
  AdminLabelController/AuditLogController）；「发现非活跃技能」走 `GET /api/v1/me/skills?filter=`
  个人面（MeController + MySkillAppService.MySkillFilter 六值枚举，HIDDEN 分支服务层校验
  SUPER_ADMIN，前端 HIDDEN tab 超管专属）；公开面 `SkillSearchController` 零 status 参数
- **clawhub.ai 官方契约**（`/api/v1/openapi.json`，OpenAPI 3.1，27 端点，2026-09-10 实测）：
  **无 hide/archive 语义**——用户侧仅 `DELETE /skills/{slug}`（summary 原文 "Soft delete skill"）
  + `POST /skills/{slug}/undelete`；平台侧为 moderation 轴（`isSuspicious`/`isMalwareBlocked`/
  `isHiddenByMod`/`isRemoved` + `scanStatus: clean|suspicious|malicious|pending|not-run`）；
  `archived`/`admin` 在整份契约中**零出现**。**M4-pre 后 AIH 的模型形态（扁平 + 4 档角色 +
  无空间）与 clawhub 同构**，差异化收敛为治理能力（审核/标签/审计/生命周期）

## 2. 里程碑范围（拍板表）

### 2.1 拍板结果（R1-R9 + R6 衍生 + R3′ 翻转，全部已确认）

| # | 议题 | 拍板结果 |
|---|------|---------|
| R1 | 范围档位 | **档 B**：治理闭环（审核/标签/生命周期/审计）+ 运营面（令牌/我的资产与提交），另加认证地基 |
| R2 | 发布/上传流 | **不入首期**（后端端点已齐 `POST /api/assets` + `POST /:slug/versions`；前端 multipart/进度/校验映射基建会稀释治理闭环收敛，单列后置） |
| R3′ | 用户管理 | **不入 M4b —— 已移出至 M4c「账号与权限治理」**（2026-09-10 用户拍板 A 翻转原 R3）：服务端用户管理 HTTP 面为零（`UserService` 仅 register/localLogin，`auth/users.ts:45-164`），且改角色/启停/建号需与「准入策略 `ACCESS_POLICY`（现仅实现 `open`，`config/env.ts:95-96`）/ 重置密码 / 强制登出（Session 按用户吊销）」一并设计——同属**新机制**，打包 M4c（`docs/00` §5 已加行；**范围档位候选见该行**，M4c 立项时定档）。数据侧无需迁移（`user_account.status/role` 与索引已就绪，`db/schema/users.ts:49-68`）。**M4b 内不建用户管理页**；M4c 落地前角色分配仍靠 `SEED_ADMIN_*` + 手工 SQL（M4-pre P3） |
| R4 | 登录方式 | 本地账号密码（LDAP 复用同一密码通道，05 §3.1）+ 登出；OIDC 仅保留入口跳转（服务端授权码流已就绪） |
| R5 | 角色感知 | **沿用 M4-pre 已交付契约**：`GET /api/auth/me` → `{ user: { id, displayName }, role: number }`（`role ∈ 0/1/10/100`）；前端按 `role >= N` 显隐。**本项零服务端改动**（重构前拟的「平台角色数组」方案已废弃，§15） |
| R6 | 非 ACTIVE 资产的发现与恢复 | **新增「我可管理的资产」读面**（§7.2 R6）——公开面 `GET /api/assets` 与写面端点**零改动** |
| R6-a | 非 ACTIVE 可见范围 | **owner 本人 / 管理档（`role >= ADMIN`）/ 超管** 可见自己管理域内的 HIDDEN/ARCHIVED 资产（判定同 `canManageAsset`：`owner 本人 ∨ role >= ADMIN`，05 §6.2/§6.4） |
| R6-b | 详情面 | **同步放宽**（R6-a 授权集）：HIDDEN/ARCHIVED 资产详情对该授权集可读；授权集之外仍 404 不泄露存在性（§7.2 R6-b）。**注**：本项修改 05 §6.4 现行的「非 ACTIVE 读面仅超管」行，列入 §14 规范同步项 |
| R7 | 壳与入口 | **两层（2026-09-10 用户拍板 A）**：`/dashboard/*` 个人面（所有登录用户）+ `/admin/*` 治理面（`role >= ADMIN`；标签超管）——均复用 AppShell；SideNav 新增「个人」（已登录）与「管理」（`role >= 10`）两组，组级显隐 + 条目级 role 门槛——**明细以 §4 为唯一源** |
| R8 | 品牌显示名 | **沿用 M4a 现状「AI X Hub」**（TopBar/Hero 已用；00 §3 D2 正式定名仍待决议，不阻塞 M4b） |
| R9 | 视觉与验证 | **视觉体系 = M4a design §4.4 全站 SSOT（引用不复制）**；控制台面只定特有形态（数据表格密度/抽屉宽/状态映射，**特有值 2 项待拍板见 §10.1**）；产出 = **全页可点原型**（9 视图 + 评审控件；**2026-09-11 用户扩大产出范围**——原「1 版风格板 + 2 交互 demo」）；不做三变体 sketch；技术落法 = 真上 shadcn/ui（Tailwind v4 + CLI，base=radix，2026-09-11 拍板） |

**本轮对齐补充锁定（2026-09-10，随 R7 分层修正一并定案）**：

- 概览页归 `/dashboard`（个人工作台 landing），**不设 `/admin` 概览**——原「管理后台赘页 + 对无管理权限用户必然 403」的问题随分层消失
- 标签排序交互 = **行内上/下移按钮**（零新增依赖；改序后批量提交 `PUT /api/labels/order`）——不做拖拽
- 标签翻译 locale = **固定 `zh-CN` / `en` 两行**（服务端契约仍支持任意 BCP47，UI 只暴露双语）
- web 验证策略 = **沿用 M4a**（typecheck + SSR 渲染冒烟 + Edge headless dogfood，零新增依赖）——不建 vitest / testing-library
- R6-b 触及既有测试 `assets.test.ts:421`，属**需求变更驱动的契约更新**（已获准，§7.2）

### 2.2 M4b 边界

**In（档 B）**：

- 入口分层（R7）：`/dashboard/*` 个人工作台 + `/admin/*` 治理面 + 共享审核详情 `/reviews/:id`
  ——**可见条件清单以 §4 为唯一源**、路由清单以 §5 为唯一源（此处不复制，防三写漂移）
- 认证与会话（**前端层**——服务端认证栈已于 M1 阶段一/二交付，本里程碑**零服务端改动**，R4/R5）：登录页（本地+LDAP 同一密码通道）/ 登出 / 会话上下文 / 401 拦截 / 角色感知（消费 M4-pre 契约）——**能力 × 阶段归属见 §3.0**
- 个人工作台：角色感知卡片 landing（待审数 / 我的资产 / 最近审计，按角色裁剪请求）
- 审核面：全站单队列列表（status 过滤）+ 审核详情（版本内容预览）+ 通过/拒绝（comment）+
  我提交的列表与撤回
- 标签管理：定义 CRUD + 多语言翻译（固定 `zh-CN`/`en`）+ 两级树 + 行内上/下移排序 + 上限提示（超管面）
- 资产生命周期：我可管理的资产列表（状态筛选）+ 状态治理 + 版本管理（yank/删除）+
  资产删除 + 标签挂载
- 令牌管理：签发（scope/有效期，明文一次展示）/ 列表 / 吊销
- 审计浏览：日志列表 + 八维过滤
- i18n：新增 `dashboard` / `admin` / `review` 资源组（07 §3；`dashboard` 组随两层分层引入，登记 §14）
- 服务端最小支撑：R6（`GET /api/me/assets` 新增）+ R6-b（读面授权集扩）

**Out（后置，不混入）**：自助注册入口（服务端 `POST /api/auth/register` 存在，但
`REGISTRATION_ENABLED` 开关**无公开端点暴露**→ 前端无法感知注册是否开启；企业自托管默认
关闭注册、由管理员建号（seed / 用户管理面）；若需开放自助注册，须一并新增开关暴露端点，
属后置议题）· 资产发布/上传流（R2）· **用户管理面（R3 → 已移出至 M4c「账号与权限治理」**：列表/改角色/启停/建号 + 准入策略 `ACCESS_POLICY` + 重置密码 + 强制登出；`docs/00` §5 M4c 行）· 提升申请
（`promotion` 权限码与端点均未建，`promotion_request` 表 08 §9 蓝图随对应服务引入）·
排序切换/社交面（M4a 已 out）· 安全扫描面（AIH 版本态 SCANNING 为扫描扩展点，
clawhub 的 scan/moderation 面为独立议题）· 自定义版本通道 stable/beta（M3 明确后置）·
空间管理（M4-pre 已整体删除，无回归议题）· **Device Flow 确认网页**（user_code 输入页——`M1-phase2` plan 原记「M4 web」，2026-09-10 决策改为 **M4c 或随 M5 CLI**；漂移已登记 §14）

## 3. 认证与会话（R4/R5）

### 3.0 认证能力 × 阶段归属（防跨里程碑重复提问与 plan↔design 漂移）

| 能力 | 阶段 | 状态 |
|------|------|------|
| 认证栈地基：本地账号 · Session · CSRF · RBAC 判定链 · LDAP 通道 | **M1 阶段一** platform-core | ✅ |
| OIDC 授权码流 · Device Flow（API）· API Token 签发-Bearer · 审计浏览 API | **M1 阶段二**（五板块） | ✅ |
| 登录页 `/login` · 会话上下文 · 登出 · 401 拦截 · 角色感知 | **M4b**（本里程碑，前端层） | ⬜ |
| 用户管理（列表/改角色/启停/建号）· 准入策略 `ACCESS_POLICY` · 重置密码 · 强制登出 | **M4c**「账号与权限治理」 | ⬜ |
| Device Flow 确认网页（`user_code` 输入） | **M4c 或 M5 CLI**（2026-09-10 决策） | ⬜ |
| 自助注册入口 | 后置（须先暴露 `REGISTRATION_ENABLED` 端点） | ⬜ |

依据：`docs/00` §5 M1 行（✅ 阶段一 + 阶段二五板块）· `docs/plans/M1-phase2.md:13-14`（**认证栈前置已就绪、本 plan 不改既有契约**）· 服务端 `apps/server/src/auth/routes.ts:46-122`（login/logout/me 已交付）· M4b 零服务端改动；`docs/00` §5 **M4c 行**（2026-09-10 新增）。

### 3.1 登录页

- 路由 `/login`，独立于 AppShell 的居中版式（shadcn `Card` + `--primary` 标题——视觉值取 M4a §4.4）
- 通道：本地账号密码（`POST /api/auth/login`）——LDAP 企业通道经同一密码路径解析
  （05 §3.1：保留账号短路 → LDAP bind → 回退本地），前端**无需分支**
- OIDC：`GET /api/auth/oidc/authorize` 入口跳转（服务端授权码流已落地 M1 阶段二）
- 错误码本地化：`auth.*` 系列入 `errors` 资源组（07 §4）
- CSRF：写请求携 Origin（服务端 `csrfProtection` 中间件，M1 已配）

### 3.2 会话上下文

- 新增 `AuthProvider`（web 层）：应用启动拉 `GET /api/auth/me` → 注入 `{ user, role }`
- 未登录（401）→ 受保护路由重定向 `/login?next=<path>`；登录成功后回落 `next`
- 登出：`POST /api/auth/logout` → 清上下文 + 回首页
- 会话有效期：服务端 8h（05 §5，`SESSION_TTL_HOURS` 默认 8），过期由任意请求 401 触发重定向

### 3.3 权限感知（R5 契约）

```
GET /api/auth/me     （requireAuth 语义不变——未登录仍 401 auth.session_expired）
  200 { user: { id, displayName }, role: number }
       role ∈ { 0 GUEST / 1 USER / 10 ADMIN / 100 SUPER_ADMIN }
         ——常量单源 db/schema/users.ts:29-34（ACCOUNT_ROLE）
       判定统一 role >= minRole（超管 100 天然覆盖全部，无短路分支）
```

- **由 M4-pre 交付**（`auth/routes.ts:115-122`）：M4b 直接消费，**零服务端改动**
- 向后兼容：既有字段 `user` 形状不变，仅增 `role`（M4a 门户未消费 `/me`，零影响）
- 角色分配无 UI（M4-pre P3）：靠 seed 首管理员 + 手工 SQL；M4b 不建用户管理页（**R3′ → 归 M4c**，§2.1）

## 4. 入口分层与显隐规则（R7）

**分层（2026-09-10 用户拍板 A）**：`/dashboard/*` **个人面**（所有登录用户）+ `/admin/*` **治理面**（角色限定）——
对标 skillhub（`pages/dashboard.tsx` 源码注释 "Default dashboard landing page for authenticated users" +
独立 `/admin/*` 三页）与 new-api（`section-registry` 的 `adminOnly` 标记 + `use-sidebar-view` 组级显隐）
两家共识：**个人事务与平台治理在导航上分组，个人事务绝不放进 admin**。空间域已随 M4-pre 删除，
个人面收敛为「我的资产 / 我的提交 / 我的令牌」三项，无空间角色判定 → 个人面显隐只需「已登录」，
治理面只需 `role >= 10`（M4-pre 交付的 `/me → role` 契约足够，零服务端改动）。

SideNav 新增两组，组级显隐 + 条目级 role 门槛（机制同 new-api `use-sidebar-view`）：

| 组 | 组级显隐 | 条目 | 条目可见条件 |
|----|---------|------|-------------|
| **个人** | 已登录（未登录整组不渲染） | 工作台 `/dashboard` | 任何登录用户 |
| | | 我的资产 `/dashboard/assets` | 任何登录用户 |
| | | 我的提交 `/dashboard/submissions` | 任何登录用户 |
| | | 我的令牌 `/dashboard/tokens` | 任何登录用户 |
| **管理** | `role >= ADMIN`（10；未达整组不渲染） | 审核队列 `/admin/reviews` | `role >= ADMIN`（10） |
| | | 标签管理 `/admin/labels` | `role >= SUPER_ADMIN`（100） |
| | | 审计浏览 `/admin/audit` | `role >= ADMIN`（10） |

顶栏：未登录显示「登录」（沿用 M4a 占位位置）；已登录显示用户菜单（displayName + 登出）。

> 显隐是**体验优化**而非安全边界——所有判定以服务端权限为准（服务端已全量覆盖，§7.1）。
> 组级显隐与条目级门槛同取 `role >= N` 线性判定（M4-pre §2.2）；超管 100 天然覆盖全部，无短路分支。
>
> **直访行为（守卫落点，实现契约定死）**：直接访问 `/admin/*` 而权限不足 → `RoleGuard` 拦截：
> 未登录 → `/login?next=<path>`；已登录但 `role < 10` → **重定向 `/dashboard`** + 轻提示
> 「该页面需要管理权限」——不渲染管理页内容。服务端各端点仍独立判定（403 `auth.forbidden` /
> `review.access_denied`），前端守卫只是体验层，双保险不依赖它生效。

## 5. 页面结构与路由（R7）

### 5.1 页面职责矩阵（环节 0 一页纸——「这页干什么、谁用、点哪、调什么」）

| 路由 | 页面职责 | 用户 | 关键动作 | 主要接口 |
|------|---------|------|---------|---------|
| `/login` | 认证 | 未登录 | 本地/LDAP 登录 · OIDC 入口跳转 | `POST /api/auth/login` · `GET /api/auth/oidc/authorize` |
| `/dashboard` | 工作台 landing | 任何登录用户 | 三项计数卡 → 跳对应列表（`role < 10` 只发「我的资产」1 个请求） | `GET /api/reviews?status=PENDING&limit=1` · `GET /api/me/assets?status=ALL&limit=1` · `GET /api/audit?limit=5` |
| `/dashboard/assets` | 我的资产（我可管理的集合） | 任何登录用户 | 状态筛选 · 恢复/隐藏/归档 · 标签挂载 · 版本删除/yank · 删资产（全在抽屉内） | `GET /api/me/assets`（R6 新增）· `PATCH /:slug/status` · `PUT`/`DELETE /:slug/labels/:labelSlug` · `DELETE /:slug/versions/:version` · `POST /:slug/versions/:version/yank` · `DELETE /:slug` |
| `/dashboard/submissions` | 我的提交 | 任何登录用户 | 看自己的提审 · **撤回**（仅本人/owner/管理档） | `GET /api/reviews/mine` · `POST /api/reviews/:id/withdraw` |
| `/dashboard/tokens` | 我的令牌 | 任何登录用户 | 签发（明文仅一次）· 吊销 | `GET`/`POST /api/tokens` · `DELETE /api/tokens/:id` |
| `/reviews/:id` | 审核详情（**共享路由**） | 管理档 ∨ 提交人本人 | manifest 分型卡 + 文件树 + 预览 · 通过/拒绝/撤回 | `GET /api/reviews/:id` · `GET /api/assets/:slug/versions/:version/files/*` · `POST /api/reviews/:id/approve`／`reject`／`withdraw` |
| `/admin` | 重定向 | 管理档 | → `/admin/reviews`（治理面无 landing） | — |
| `/admin/reviews` | 审核队列（全站单队列） | `role >= 10` | 状态过滤 · 分页 · 进详情 | `GET /api/reviews?status=` |
| `/admin/labels` | 标签管理 | 超管（100） | 两级树 CRUD · 翻译（zh-CN/en）· 上/下移排序 | `GET /api/labels/all` · `POST`/`PATCH`/`DELETE /api/labels` · `PUT /api/labels/order` |
| `/admin/audit` | 审计浏览 | `role >= 10` | 八维过滤 · 分页 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=` |

> **入口可见性（谁在导航上看得到）以 §4 为唯一源**；本节只定义页面职责与数据来源（防两处漂移）。

### 5.2 路由清单（除 `/login` 外均在既有 AppShell 的 `<Outlet/>` 区）

```text
/login                        登录（独立版式，不进 AppShell 分组）
/dashboard                    个人工作台 landing（角色感知卡片——§7.3 编排）
/dashboard/assets             我的资产：列表 + 状态筛选 + 抽屉
/dashboard/submissions        我的提交：列表 + 撤回
/dashboard/tokens             我的令牌：列表 + 签发 + 吊销
/reviews/:id                  审核详情（共享：管理档自队列进、提交人自我的提交进）
/admin                        → 重定向 /admin/reviews
/admin/reviews                审核队列
/admin/labels                 标签管理
/admin/audit                  审计浏览
```

- 除 `/login` 外全部挂在既有 `AppShell` 下（`components/ui/AppShell.tsx` 的 `<Outlet/>` 区），
  M4a 五路由零改动
- **审核详情为共享路由**（不进 `/admin` 段）：`GET /api/reviews/:id` 的授权面本身就是
  「管理档 ∨ 提交人本人」（`http/reviews.ts:89-98`）——若挂在 `/admin` 段，提交人（`role < 10`）
  将被组级守卫挡住，而撤回动作恰恰只有提交人/owner/管理档可执行 → **撤回在 UI 上不可达**
  （v1.0 单层方案的隐性缺陷即源于此）
- query 状态 URL 化（**复用扩展** M4a `useMarketQuery`：参数化 `status` 维度，
  `?status=`/`?q=`/`?page=`；**不新建 hook**，语义同构——§6.3）
- **响应式断点（写在路由段——对齐 M4a 范本特质）**：控制台表格 <1100px → 容器**横向滚动**
  （保留列完整，不做卡片化——控制台列信息密度优先）；抽屉 <1100px → 全宽侧滑；
  SideNav <900px 折叠为图标态（沿用 M4a 断点体系）
- 抽屉/对话框状态不进 URL（次要状态，同 M4a 版本对比对的处置）

## 6. 前端架构与组件树

### 6.1 依赖（v1.3：样式体系**引用** M4a §4.1，不复制）

**样式/组件栈 = M4a design §4.1 + §4.4（引用不复制）**：Tailwind v4 + shadcn CLI（base=radix）+
`cn` / `class-variance-authority` / `radix-ui` / `lucide-react` / `sonner` / `next-themes`；shadcn
组件以源码落仓 `src/components/ui/shadcn/`；token 值一律取 §4.4（**本文件不得复制色值/字阶**）。
M4b 在**已换皮的门户体系**上生长（M4a 视觉体系切换先行）→ **无双栈混搭期**、无 CSS Modules 残留。

**版本锚**：`react-router-dom@7.18.3` / `react-markdown@10.1.0` / `remark-gfm@4.0.1`（M4a plan 锁定）
+ M4a 换皮实际锁定的 Tailwind / shadcn 版本（以 M4a `bun.lock` 为准）。**不引入任何 diff 相关依赖**
——审核面首期不提供行级 diff（§6.3），`VersionCompare` 与 Diff 组件群留在 market 面不动。

**控制台面特有依赖 = 无**：表格 / 抽屉 / 对话框 / 下拉 / 徽章 / 轻提示全部由 shadcn 原语覆盖
（`Table` · `Sheet` · `Dialog` · `Select` · `DropdownMenu` · `Badge` · `Sonner` · `Skeleton`）。

**验证策略（2026-09-10 锁定）**：沿用 M4a——`typecheck` + **SSR 渲染冒烟**（`docs/smoke/scripts/`，
断言权限显隐 / 空态 / 表格行渲染）+ Edge headless dogfood。**不建 vitest / testing-library**。

### 6.2 组件树（新增面）

```text
src/
├── auth/                      新增
│   ├── AuthProvider.tsx       /me 上下文（user + role）+ 401 拦截 + login/logout
│   └── RequireAuth.tsx        路由守卫（未登录 → /login?next=）
├── api/                       新增 auth.ts / console.ts（ep 分组）+ 既有 client 复用
│   ├── auth.ts                login · logout · me
│   └── console.ts             me/assets · reviews · labels · tokens · audit
├── hooks/useMarketQuery.ts    扩展（**不新建**）：参数化 status 维度——市场面与控制台面共用（§6.3）
├── components/ui/             跨面基础件（既有 + shadcn 原语目录）
│   ├── shadcn/                ← shadcn CLI 落仓目录（Table/Sheet/Dialog/Select/DropdownMenu/
│   │                            Badge/Card/Input/Switch/Skeleton/Sonner/Tooltip/Tabs…；**与既有
│   │                            PascalCase 原子件同目录但大小写分离**——`badge.tsx` vs `Badge.tsx`）
│   ├── Toaster.tsx            轻提示 = shadcn `Sonner` 封装（写操作成功/失败反馈——§9；全局单例挂 App）
│   ├── SkeletonLoader.tsx     载态骨架 = shadcn `Skeleton` 组合（表格/详情载态——优于 Spin 空屏）
│   ├── RoleGuard.tsx          角色级守卫（RequireAuth 之上叠加 `role >= N` 判定，§4 显隐的守卫版）
│   ├── CopyButton.tsx         复制（令牌明文/资产坐标/sha——明文场景关闭即清）
│   ├── FileTree.tsx           ← 自 components/market/detail/ 迁入（§6.3；本体零改动）
│   └── FilePreviewDialog.tsx  ← 自 components/market/detail/ 迁入（§6.3；本体零改动）
├── components/console/        新增面域（个人面 + 治理面共用）
│   ├── PageHeader.tsx         页头（标题 + 副述 + 右侧动作槽）
│   ├── DataTable.tsx          通用表格 = shadcn `Table` 封装（列定义驱动 + 空/载/错态 + 行内动作槽）
│   ├── Drawer.tsx             右侧抽屉 = shadcn `Sheet` 封装（宽度取值**待拍板**——§10.1）
│   ├── ConfirmDialog.tsx      危险操作确认（HIDDEN/ARCHIVED/删除/yank/吊销前）
│   ├── StatusPill.tsx         资产/版本状态徽章（色值取 M4a §4.4 ② 补丁 token——不复制）
│   ├── FilterBar.tsx          筛选条（状态下拉 + 关键词）
│   ├── reviews/               ReviewQueue.tsx · ReviewDetail.tsx · ReviewActions.tsx
│   ├── labels/                LabelTree.tsx · LabelForm.tsx · LabelTranslations.tsx
│   ├── assets/                AssetAdminTable.tsx · AssetDrawer.tsx · AssetVersionList.tsx
│   ├── tokens/                TokenTable.tsx · TokenIssueDialog.tsx · TokenRevealDialog.tsx
│   └── audit/                 AuditTable.tsx · AuditFilters.tsx · AuditActionSelect.tsx
│                              （action 过滤用**分组下拉**而非自由输入——防拼错；值清单见 §7.3）
└── pages/                     路由页（薄装配）
    ├── Login.tsx              /login（独立版式）
    ├── dashboard/             Dashboard.tsx（工作台 landing）· MyAssets.tsx ·
    │                          MySubmissions.tsx · MyTokens.tsx
    ├── reviews/               ReviewDetail.tsx（共享详情）
    └── admin/                 Reviews.tsx（队列）· Labels.tsx · Audit.tsx
```

### 6.3 复用与升级边界

- **直接复用**（`components/ui/`，零改动）：AppShell · TopBar · SideNav（增「个人」「管理」两组）·
  Badge · Pagination · Spinner · EmptyState · ErrorState · MarkdownRenderer · AssetAvatar ·
  LanguageSwitcher（`FileTree`/`FilePreviewDialog` **不在本列**——见下条迁移项）
- **升级到 ui/**（跨面复用确认）：`FileTree` 与 `FilePreviewDialog` 在 M4a 位于
  `components/market/detail/`——M4b 审核详情需同款能力，**迁移到 `components/ui/`**
  （M4a design §4.2 已预留该复用意图：FileTree「M4b 审核复用」、FilePreviewDialog「M4b 复用」）
  ——**迁移影响面**：组件本体零改动，仅需同步更新唯一引用方 `market/detail/FilesTab.tsx:5,7`
  （import 路径），M4a 路由与页面行为不变
- **hook 复用扩展（不新建）**：`useMarketQuery`（M4a）**参数化扩展 `status` 维度**，市场面与控制台面
  共用——两者语义同构（URL query ↔ 状态 + 防抖 + 筛选变更 page 回落 1），差异只是维度集合；
  一套 hook 免双份漂移（v1.0/v1.1 拟新建 `useAdminQuery`/`useConsoleQuery`，本版取消）
- **仍留 market 面**：`VersionCompare` + Diff 组件群——M4a design 原文「审核侧若需行级 diff
  M4b 再升 ui」；M4b 审核详情**首期不提供行级 diff**（审核决策所需的核心是文件清单 +
  内容预览 + manifest，diff 属消费者阅读体验），故不迁移、不改动
- **新增组件按「跨面 vs 面域」二分落位**：
  · `components/ui/` —— **跨面基础件**（任何面都可能用）：`Toaster`（全局单例挂 App）·
    `SkeletonLoader` · `RoleGuard` · `CopyButton` ＋ §6.3 迁移项（`FileTree`/`FilePreviewDialog`）
  · `components/console/` —— **M4b 控制台面专属形态**（页头/表格/抽屉/确认/状态徽章/筛选条 +
    各域子目录），与 M4a `components/market/` 同构（面级目录）；后台形态变化不牵动门户
  —— 二分规则取代 v1.0 的「一律落 admin/」：分层后个人面与治理面**共用同一批控制台组件**，
  留在 `admin/` 会造成「个人面的组件住在 admin 目录」的语义错位

### 6.4 规模预估

10 条路由条目（含 1 重定向 + 1 独立登录版式）+ ~26 新组件 + 1 provider + 3 i18n 资源组
（hook 为扩展非新建），≈ 2600-3200 行（含样式），单文件 ≤200 行。

## 7. API 消费面

### 7.1 复用端点实测契约表（全部经源码核对，2026-09-10）

| 功能 | 端点 | 权限 | 关键响应形状 | 源码依据 |
|------|------|------|-------------|---------|
| 审核队列 | `GET /api/reviews?status=&limit=&offset=` | 管理档 `role >= ADMIN`（**全站单队列**，无空间过滤参数；不足 → 403 `review.access_denied`） | `{items:[{taskId,status,reviewVersion,submittedBy,submittedAt,assetSlug,assetVersion,versionStatus,versionId}],total,limit,offset}` | `http/reviews.ts:46-66` · `review/query.ts:24-44` |
| 我的提交 | `GET /api/reviews/mine?status=&limit=&offset=` | 登录（身份面） | 同上 items 形状 | `http/reviews.ts:69-86` |
| 审核详情 | `GET /api/reviews/:id` | 管理档 ∨ 提交人本人（否则 403 `review.access_denied`；不存在 404 `review.not_found`） | `ReviewListItem + {manifestJson, files:[{filePath,fileSize,sha256}]}` | `http/reviews.ts:89-98` · `review/query.ts:46-50` |
| 通过/拒绝 | `POST /api/reviews/:id/approve`（`{comment?}`）· `POST /:id/reject`（`{comment}` 必填） | 管理档 `role >= ADMIN` + 防自审（05 §6.4，超管例外） | 200 `{taskId,status,version}` | `http/reviews.ts:101-143` · `auth/rbac.ts:53-60` |
| 撤回提审 | `POST /api/reviews/:id/withdraw` | 提交人本人 / asset owner / 管理档（服务内判定） | 204 | `http/reviews.ts:146-160` |
| 标签公开列表 | `GET /api/labels` | 匿名 | `Label[]`（displayName 回退 Accept-Language→en→slug） | `http/labels.ts:65-69` |
| 标签全量 | `GET /api/labels/all` | `role >= SUPER_ADMIN` | `ManagedLabel[]`：`{id,slug,type,visibleInFilter,sortOrder,parentId(父 slug),translations:[{locale,displayName}]}` | `http/labels.ts:72-75` |
| 标签 CRUD | `POST /api/labels` · `PATCH /api/labels/:slug` · `DELETE /api/labels/:slug` | `role >= SUPER_ADMIN` | 同上单条；删除带子级 → `label.parent.has_children` | `http/labels.ts:77-121` |
| 标签排序 | `PUT /api/labels/order` | `role >= SUPER_ADMIN` | 204 | `http/labels.ts:123-131` |
| 标签挂载 | `PUT`/`DELETE /api/assets/:slug/labels/:labelSlug` | RECOMMENDED = `canManageAsset`（owner 本人 ∨ `role >= ADMIN`）；PRIVILEGED = 超管 | 幂等（重复挂 204 / 移除不存在 204）；≤10 → `label.limit_exceeded` | `http/assets.ts:709-763` · `assets/manage.ts:19-22` |
| 令牌列表 | `GET /api/tokens` | 登录（仅本人） | `{items:[{id,scope,expiresAt,revokedAt,createdAt}]}`（库中仅 sha256，无掩码字段） | `http/tokens.ts:87-102` |
| 令牌签发 | `POST /api/tokens`（`{scope?:string[], expiresInDays?}`） | 登录 | 201 `{id,token,expiresAt}`——**明文仅此一次** | `http/tokens.ts:41-82` |
| 令牌吊销 | `DELETE /api/tokens/:id` | 本人 ∨ `role >= SUPER_ADMIN`；幂等 204；他人 token 视同 404 防枚举 | 204 | `http/tokens.ts:105-141` |
| 审计 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=&limit=&offset=` | 管理档 `role >= ADMIN`（token scope `audit:read` 交集） | `{items:[audit_log 全列],total,limit,offset}`，createdAt desc + id desc 稳定分页 | `http/audit.ts:45-55` |
| 公开统计 | `GET /api/stats` | 匿名 | 公开聚合（活跃资产计数等） | `http/stats.ts:11-14` |
| 资产列表 | `GET /api/assets?limit=&offset=&type=&q=&label=` | **匿名**（读面恒「活跃资产」面，与 viewer 无关） | `{items:AssetItem[],total,limit,offset}`；项含 latest 投影 + ownerDisplayName | `http/assets.ts:75-83,256-283` · `assets/service.ts:173-177` |
| 资产注册 | `POST /api/assets`（`{slug,type}`） | 登录（`role >= USER`；token scope `asset:publish`） | 201 单条 AssetItem | `http/assets.ts:92-95,221-253` |
| 资产详情 | `GET /api/assets/:slug` | ACTIVE 匿名；非 ACTIVE **当前仅超管**（其余含 owner/管理档同 404 `asset.not_found`）——**R6-b 后扩为授权集，见 §7.2** | AssetItem + `labels[]` | `http/assets.ts:163-176,290-299` |
| 版本列表 | `GET /api/assets/:slug/versions?limit=&offset=` | 资产读面前置 + 未公开族授权过滤（DRAFT 仅授权集可见） | `{items:[{id,version,status,fileCount,totalSize,changelog,createdAt}],total,limit,offset}` | `http/assets.ts:304-315` |
| 版本详情 | `GET /api/assets/:slug/versions/:version` | 授权集（owner/上传者/管理档/超管）全见，其他仅 PUBLISHED；无预览权 400 `asset.version_not_published` | 单版本（含 manifest 投影 + 文件清单） | `http/assets.ts:346-355` · 08 §7 |
| 版本对比 | `GET /api/assets/:slug/versions/compare?from=&to=` | 匿名（ACTIVE 读面） | `{files:[…]}` | `http/assets.ts:320-340` |
| 文件内容 | `GET /api/assets/:slug/versions/:version/files/*` | 下载判定同语义（PUBLISHED 公开 / 预览集 / YANKED 400） | 文件内容 | `http/assets.ts:360-379` |
| 包下载 | `GET /api/assets/:slug/versions/:version/download` | 五档判定；限流 60/分·IP；S3 302 直链 / Local 200 流 | zip 字节流 | `http/assets.ts:770-824` |
| 状态治理 | `PATCH /api/assets/:slug/status`（`{status}`） | `canManageAsset`（owner 本人 ∨ `role >= ADMIN`）+ token scope `asset:manage` | 单条 AssetItem | `http/assets.ts:383-416` · `assets/manage.ts:19-22` |
| 版本上传 | `POST /api/assets/:slug/versions`（multipart） | `canManageAsset`（owner ∨ 管理档）+ scope `asset:publish`；限流 10/分·用户 | 201 版本 | `http/assets.ts:473-551` |
| 版本删除 | `DELETE /api/assets/:slug/versions/:version` | 管理档删 DRAFT/SCAN_FAILED/REJECTED/UPLOADED；上传者本人删 DRAFT/SCAN_FAILED；scope `asset:manage` | 204 | `http/assets.ts:558-611` |
| 提审 | `POST /api/assets/:slug/versions/:version/submit` | owner 本人 / 上传者本人 / 管理档（`canSubmitReview`）+ scope `review:submit` | 201 `{taskId,reviewVersion,status}` | `http/assets.ts:617-665` |
| 版本撤回 | `POST /api/assets/:slug/versions/:version/yank`（`{reason}` 必填） | 管理档 `role >= ADMIN`（治理最严面）+ scope `asset:manage` | 200 `{status:'YANKED',latestVersionId}` | `http/assets.ts:671-703` |
| 资产删除 | `DELETE /api/assets/:slug` | `canManageAsset`（owner ∨ 管理档）+ scope `asset:manage`；有 PUBLISHED → 400 `asset.has_published`；有 YANKED → 400 `asset.has_yanked` | 204 | `http/assets.ts:421-467` |
| 登录/登出/当前用户 | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | — | me = `{user:{id,displayName}, role}`（§3.3） | `auth/routes.ts:115-122` |

> 错误契约统一 `{code,message}`（07 §4；`app.ts:82-100` 统一出口）；前端 `errors` 资源表按
> code 映射（未命中兜底）。**注意**：可见性删除后读面**无 403 出口**——ACTIVE 即公开、
> 非 ACTIVE 走 404（`asset.access_denied` 已不存在）。

### 7.2 契约缺口与处置（R6 系列）

**缺口清单（G 段——呈请编号；对标 M4a design §5.1/§5.2 的「G 呈请 → R 处置」两段式）**：

| # | 缺口 | 处置 |
|---|------|------|
| G1 | 非 ACTIVE 资产不进任何列表（匿名/owner/管理档/超管一致——`listViewableAssets` 硬条件 `status='ACTIVE'`） | R6：新增「我可管理的资产」读面 |
| G2 | HIDDEN/ARCHIVED 详情**仅超管**可读（owner 与 管理档 同 404） | R6-b：读面授权集分层扩展 |
| G3 | 列表无 owner / status 过滤参数（`?ownerId`/`?owner`/`?status` 被 zod 静默忽略） | R6：新端点带 status 过滤；公开面契约不动 |
| G4 | 前端无从感知角色档位 | **已由 M4-pre 闭环**——`/me` 现返 `role`（`auth/routes.ts:115-122`），前端直接按 `role >= N` 显隐；重构前拟的「平台角色数组」方案（R5）随之废弃 |

**缺口实证（2026-09-10 重核，源码实证为主）**：

- 列表面：`listViewableAssets` 硬编码 `eq(asset.status, 'ACTIVE')`（`assets/service.ts:177`）
  → HIDDEN/ARCHIVED 资产不进任何列表
- 详情面：`assertAssetReadable` 在超管短路后判定 `status !== 'ACTIVE' → 404 asset.not_found`
  （`http/assets.ts:163-176`）→ owner 本人亦 404（既有测试 `assets.test.ts:421` 已固化
  「HIDDEN 资产：登录用户 404；SUPER_ADMIN 200」）
- 过滤面：`listQuerySchema`（`http/assets.ts:75-83`）无 owner / status 参数
  （`?ownerId=`/`?owner=`/`?status=` 被静默忽略）
- 恢复通道**已存在**：`PATCH /:slug/status` 走 `loadAssetBySlug`（按坐标取，不判 status）+
  `assertManageable` → owner 可直接恢复，**无需先读详情**（`http/assets.ts:383-416`）

**处置 R6：新增「我可管理的资产」读面**

```
GET /api/me/assets?status=ACTIVE|HIDDEN|ARCHIVED|ALL&q=<kw>&limit=&offset=
  （requireAuth；默认 status=ACTIVE、limit=20、offset=0）
  200 { items: AssetItem[], total, limit, offset }
```

- **集合语义** = 我可管理的资产（`canManageAsset`（`assets/manage.ts:19-22`）同源，
  05 §6.2/§6.4）：owner 本人 ∪（`role >= ADMIN` → 全站）
- **status 语义**：`ACTIVE` 正常活跃面；`HIDDEN`/`ARCHIVED`/`ALL` 返回授权集合内的对应状态
  （同一集合内按 status 过滤，无额外权限分支——授权已在集合层收敛）
- 响应项复用既有 `assetItem` 形状（含 `latestVersion`/`latestName`/`latestDescription`/
  `ownerDisplayName`）——前端表格零适配
- **公开面 `GET /api/assets` 零改动**（对标 skillhub：公开搜索面保持无 status 参数的干净契约）
- **坐标一致性**：资产坐标为全局唯一裸 `slug`（M4-pre §2.3）——端点无空间段参数

**处置 R6-b：读面授权集扩展（详情面）**

- `assertAssetReadable`（`http/assets.ts:163-176`）的 `status !== 'ACTIVE' → 404` 改为
  **授权集分层**：非 ACTIVE 时，若 viewer ∈ {owner 本人，`role >= ADMIN`（管理档），超管}
  → 放行；其余（含匿名、其他用户）**维持 404**（不泄露存在性对"外部人"依然成立）
- 同时作用于该端点族：`GET /api/assets/:slug` · `.../versions` · `.../versions/:version` ·
  `.../files/*` · `.../download` · `.../versions/compare`（同一 `assertAssetReadable` 前置链，
  单点修改全体生效；下载面沿用 YANKED 400 等既有语义）
- **规范影响**：本项修改 05 §6.4 现行的「非 ACTIVE 读面仅超管」行 + 08 §7 读面注记
  → 列入 §14 规范同步项
- **测试影响（需求变更驱动，非弱化契约）**：`assets.test.ts:421`
  「HIDDEN 资产：登录用户 404；SUPER_ADMIN 200」按新授权集更新为
  「owner 200 / 管理档 200 / 非授权登录用户 404 / 匿名 404」；**新增对照断言**：管理档与
  outsider 两档（授权集全覆盖）。**不受影响**：`stats.test.ts`（HIDDEN 不计入公开统计——
  公开聚合语义未变）

### 7.3 页面数据编排

- 工作台 `/dashboard` landing：并发 3 请求（`/api/reviews?status=PENDING&limit=1` 取 total ∥
  `/api/me/assets?status=ALL&limit=1` 取 total（含隐藏/归档——与线框「含 N 隐藏」一致）∥
  `/api/audit?limit=5`）——**按角色裁剪**（`role < 10` 不发审核/审计两请求，避免必然 403；
  只渲染「我的资产」卡）
- 列表页：单请求 + `useApi` 语言感知缓存；筛选变更 → 重置 offset=1 页（沿用 M4a 修复录
  「筛选/搜索 page 回落 1」纪律）
- 审核详情：单请求（`GET /api/reviews/:id` 已含 manifest + 文件清单）→ 文件点击经既有
  `GET .../versions/:version/files/*` 拉内容进预览对话框（`useApi` 缓存复用）
- 资产管理：列表请求 + 抽屉内动作后**局部重取**（不整页刷新）；版本列表懒加载
- 审计页：过滤面 8 组全暴露（`action`/`targetType`/`targetId`/`actorId`/`requestId`/`clientIp`/
  `from`/`to`——对标 skillhub admin audit-log 页同款 8 过滤器）；**`action` 用分组下拉**
  （防自由输入拼错），值清单 = 服务端现有 **25** 个（按域前缀分组）：
  · `asset.*`（9）：register · delete · status_update · version_upload · version_submit ·
    version_delete · version_yank · label_attach · label_detach
  · `review.*`（3）：approve · reject · withdraw
  · `label.*`（4）：create · update · delete · reorder
  · `auth.*`（4）：login.success · login.failed · logout · register
  · `token.*`（2）：issue · revoke　· `device.*`（2）：approve · token_issued　· `oidc.*`（1）：provisioned
  （空间域 5 个动作与资产可见性动作随 M4-pre 删除，故 31 → 25；清单源为 server 侧 `action`
  字面量；新增 action 需同步前端常量——集中化登记见 §14）
- **实现期联调数据需求（dogfood）**：多角色（`SUPER_ADMIN` / `ADMIN` / 普通 `USER`）+
  各状态资产（ACTIVE / HIDDEN / ARCHIVED）+ 三族各至少一条 + 待审任务 + 两级标签树
  ——seed 直插（沿用 M4a T18 模式，前缀 like 清理）

## 8. 接口变更总览（服务端面）

| # | 变更 | 端点/位置 | 说明 |
|---|------|----------|------|
| R6 | 新增 | `GET /api/me/assets` | 「我可管理的资产」读面（§7.2 契约）；公开面零改动 |
| R6-b | 修改 | `assertAssetReadable` 授权集 | 非 ACTIVE 详情/版本/文件/下载面：授权集（owner 本人 / 管理档 / 超管）放行，其余仍 404（§7.2；§14 同步 05 §6.4 + 08 §7） |

> **R5 不属本表**：`/me` 的角色感知已由 M4-pre 交付（`auth/routes.ts:115-122`），
> M4b 零服务端改动——重构前拟的「`/me` 增平台角色数组」方案随之废弃。

均落 server + 补测试（M4-pre 后全量测试基线 + 新用例）；实现细则归 M4b plan。

## 9. 数据获取与状态约定

沿用 M4a（design §7）并补充控制台面（个人面 + 治理面）约束：

- `useApi` 三态 + abort + 语言感知 Map 缓存（键含 lang）
- 分页：**offset 替换式**（管理表格无跨页选中需求）；筛选/搜索变更 → `page` 回落 1
- 危险操作（隐藏/归档/恢复/删除/yank/吊销）→ **ConfirmDialog 二次确认**，
  文案含对象坐标与后果（如「隐藏后该资产对所有非管理员不可见」）
- 写操作成功 → 局部重取 + 轻提示（不整页刷新，保留筛选与滚动位置）
- 错误：`errors` 资源组按 code 本地化；401 → 全局拦截重定向 `/login?next=`
- 403 → 就地提示（不退化为空态，避免"看起来没数据"的误导）

## 10. UI-UX 变动总览

### 10.1 视觉基线（R9：**引用 M4a design §4.4 为全站视觉真值 SSOT**）

**视觉体系 = M4a design v0.20 §4.4（引用不复制；版本随 M4a 演进，以 M4a design 版本头为准）**——色彩 token / 圆角轴 / 字阶 / 阴影 / 字体栈 /
滚动条 / 组件真值 / **AIH token 补丁表**（`--success` / `--warning` / 类型色）/ token 映射表的
**唯一源在 M4a §4.4**。本文件只记**控制台面特有的取值与形态**；归属分工如下（双写即漂移）：

| 项 | 归属 |
|----|------|
| 色彩 token · 圆角轴 · 字阶 · 阴影 · 字体栈 · 滚动条 · 组件真值 | **M4a §4.4（SSOT）** |
| 状态语义映射（资产三态 + 版本八态 → token）与 `StatusPill` 规格 | 本文档（控制台特有） |
| 表格密度（表头高 / 单元格 padding） | 本文档（**待拍板**：40 vs 48） |
| 抽屉宽 | 本文档（**待拍板**：384 vs 560） |

**控制台面特有形态（个人面与治理面共用）**：

- **数据表格**（`DataTable` = shadcn `Table` 封装）：两档真值备选——shadcn 档（表头 `h-10 px-2`
  = 40px · 单元格 `p-2`）vs skillhub 档（表头 `h-12 px-4` = 48px · 单元格 `p-4`）；
  **取档待拍板**（差异 = 一屏行数 vs 覆盖 class 数量）。状态列右对齐 `tabular-nums`；
  载态用 shadcn `Skeleton` 行占位
- **表单控件**：shadcn `Input` / `Select` / `Textarea` / `Switch`（真值见 M4a §4.4 ③）——
  **不再自写玻璃底样式**
- **右侧抽屉**：shadcn `Sheet`（真值 `w-3/4 sm:max-w-sm` = 384px 上限；取 560px 时覆盖为
  `sm:max-w-[560px]`）——**待拍板**；遮罩 `bg-black/50`（无 blur）
- **危险操作**：shadcn `Dialog` 二次确认 + `--destructive`（#e7000b）+ `Button variant="destructive"`
  ——**不再引 M4a diff 的 #cf222e**（diff 内容色与 UI 语义色分工不同，见 M4a §4.4 ②）
- **状态徽章**：`Badge variant="outline"` + `border-success/30 bg-success/10 text-success` 组合
  （shadcn 无 success/warning 变体 → 走 M4a §4.4 ② 补丁 token）
- **空/载/错三态**：载态 shadcn `Skeleton`；空/错沿用既有 `EmptyState`/`ErrorState`（换皮为
  shadcn 语法）
- **版本八态 → token 映射**（控制台特有，实现期随 plan 定死）：PUBLISHED = success；PENDING_REVIEW =
  warning；SCAN_FAILED / REJECTED / YANKED = destructive；DRAFT / SCANNING = muted-foreground
- **控制台特有值待拍板 2 项**（2026-09-11 定：本轮不落值）：① 表格密度 40 / 48
  ② 抽屉宽 384 / 560

**视觉环节产出（R9 修订，2026-09-11 用户扩大范围）**：由「1 版风格板 + 2 交互 demo」改为
**全页可点原型**（9 视图 + 评审控件：角色 4 档 / 页面三态正常·空·载·403 / ★待拍板标注 / 中|EN）
——用户要求逐页亲眼确认后再对齐。技术可行性实证：沙箱 spike（shadcn 真身，不进仓）；
**M4a 换皮落地后以本仓代码为准**。不做三变体 sketch。

### 10.2 信息架构与交互要点

- **审核详情**是核心工作台：左主列 = manifest 摘要卡 + 文件树（`ui/FileTree`）+
  文件预览对话框；右栏 = task 元信息（坐标/版本/提交人/时间）+ 动作区（通过/拒绝/撤回）
  - **manifest 卡按 type 分型（三族适用性——M4a T15 实证的族协议差异）**：skill 族主文档
    `SKILL.md`（必需）；mcp 族 `mcp.json` / `README.md`（可选）；agent 族 `agent.md` /
    `README.md`（可选）——复用 M4a `OverviewTab` 的分型探测与回退逻辑（大小写归一 + 缺失
    回退结构化摘要），审核人看到的摘要形态随类型自适应，不空窗
- **资产管理抽屉**：状态治理（含恢复）+ 标签挂载 + 版本列表（yank/删除）+
  危险区（删除资产，说明"有已发布/已撤回版本时不可删除"）
- **标签管理**：两级树 + 定义 CRUD + 翻译（**固定 `zh-CN`/`en` 两行**）+ **行内上/下移**排序
  （改序后批量提交 `PUT /api/labels/order`；不做拖拽——零新增依赖）
- **个人工作台**：角色感知卡片（见 §7.3 编排）+ 卡片动作槽跳转对应列表页
- **状态语义可视化**：`StatusPill` 统一呈现资产三态（ACTIVE = success / HIDDEN = warning /
  ARCHIVED = muted-foreground）、版本八态——**色值取 M4a §4.4 ② 补丁 token**（不复制，映射表见 §10.1）
- 品牌显示名「AI X Hub」沿用（R8）；语言切换器沿用（控制台面与门户共用 i18n 机制）
- **响应式**：控制台表格窄屏（<1100px）→ 容器横向滚动（保留列完整，**不做卡片化**——控制台场景
  列信息密度优先）；抽屉窄屏 → 全宽侧滑；侧栏 <900px 折叠为图标态（沿用 M4a 断点体系）
- **关键空/错态文案（示例，非硬编码——zh 真源 / en 对齐）**：「暂无待审任务」·
  「未找到匹配的资产 · 试试切换状态筛选」·「该资产有已发布版本，不能删除」·
  「会话已过期，请重新登录」（401 拦截文案）·「标签定义已达上限 100 个」

## 11. i18n 资源规划（07 §3）

新增三组（zh 真源 / en 完整对齐，纪律同 M4a）：

- `dashboard`：个人工作台（工作台卡片 / 我的资产 / 我的提交 / 我的令牌 / 对应空态文案）
- `admin`：治理面通用（页标题 / 表格列名 / 动作文案 / 确认对话框 / 标签与审计空态文案）
- `review`：审核面专属（队列状态 / 动作 / 防自审提示 / 共享详情页文案）

既有 `common`/`errors` 复用；服务端新错误码（若有）入 `errors` 组。

## 12. 线框图

个人工作台 `/dashboard`（角色感知卡片；治理卡片仅 `role >= 10` 渲染）：

```text
┌ AI X Hub                     🌐 中|EN    [👤 孙学文 ▾] ┐
│ ⌂首页 ✦技能中心 ⚙MCP ◈专家                            │
│ ─ 个人 ─────────────────────────────────────────────  │
│  ▤ 工作台  ◫ 我的资产  ⇪ 我的提交  ⛁ 我的令牌          │
│ ─ 管理 ─（role>=10 才渲染）──────────────────────────  │
│  ⚖ 审核队列  ⌗ 标签管理  ☰ 审计浏览                    │
├────────────────────────────────────────────────────────┤
│ 工作台                                                  │
│ ┌待审核────┐┌我的资产──┐┌最近审计──────────────┐      │
│ │    3     ││   12     ││ auth.login.success    │      │
│ │ 待处理   ││ 含2隐藏  ││ asset.status_update   │      │
│ │ [去处理] ││ [去管理] ││ asset.version_yank    │      │
│ └──────────┘└──────────┘└───────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

审核详情 `/reviews/:id`（共享路由——坐标 = 全局唯一裸 slug）：

```text
│ 首页 / 审核队列 / #1024                                 │
│ langgraph-rag  v1.3.2   提交人 林晓峰                    │
│ ┌ 主列 ───────────────────────────────┬ 右栏 320px ────┐│
│ │ [manifest 摘要卡]                    │ 状态 PENDING    ││
│ │ name/version/license/description…    │ 提交 09-10 14:02││
│ │ ─────────────────────────────────    │ task#1024 v1    ││
│ │ [文件树]  ▼ reference/               │ ─────────────── ││
│ │           SKILL.md  sha a1b2…  [预览]│ [✔ 通过]        ││
│ │           agent.md  4.2KB            │ [✘ 拒绝]        ││
│ └──────────────────────────────────────┴─────────────────┘│
└──────────────────────────────────────────────────────────┘
```

我的资产 `/dashboard/assets`（含状态筛选与恢复——坐标 = 裸 slug，无可见性列）：

```text
│ 我的资产                        [状态: 全部▾] [🔍 搜索]  │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标             类型  状态     版本   更新  动作      ││
│ │ rag-skill        skill ●ACTIVE  1.3.2 09-09 ⋯        ││
│ │ old-tool         mcp   ●HIDDEN  0.9.0 08-21 ⋯        ││
│ │ x-agent          agent ●ARCHIVED 2.1.0 07-30 ⋯       ││
│ └──────────────────────────────────────────────────────┘│
│ 行内 ⋯ → [恢复 ACTIVE][归档][删除][标签挂载]             │
└──────────────────────────────────────────────────────────┘
```

审核队列 `/admin/reviews`（全站单队列 + 状态过滤）：

```text
│ 审核队列                              [状态: 待审核▾]       │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标            版本    类型   提交人   提交时间      ││
│ │ rag-skill      1.3.2  skill  林晓峰  09-10 14:02   →││
│ │ old-tool       0.9.1  mcp    赵敏    09-10 11:30   →││
│ └──────────────────────────────────────────────────────┘│
│ 共 2 条        [‹ 上一页]  1/1  [下一页 ›]              │
```

标签管理 `/admin/labels`（超管面：两级树 + 编辑 + 翻译 + 上/下移）：

```text
│ 标签管理                                    [+ 新建标签]   │
│ ┌ 定义树 ──────────────────┬ 编辑（retrieval）──────────┐│
│ │ ▼ 检索类 (retrieval)     │ 类型  RECOMMENDED ▾         ││
│ │     ● rag      [↑][↓][⋯] │ 筛选中展示  [✓]             ││
│ │     ● embedding[↑][↓][⋯] │ 翻译                        ││
│ │ ▼ 开发类 (dev)           │   zh-CN  检索类             ││
│ │     ● sdk      [↑][↓][⋯] │   en     Retrieval          ││
│ │  (定义 12 / 上限 100)    │ [保存] [删除]（有子级→阻断） ││
│ └──────────────────────────┴─────────────────────────────┘│
```

我的令牌 `/dashboard/tokens`（签发明文仅一次）：

```text
│ 我的令牌                                     [+ 签发令牌]   │
│ ┌──────────────────────────────────────────────────────┐│
│ │ scope          签发时间   过期      状态      动作    ││
│ │ asset:manage   09-01      12-01    ●有效     [吊销]  ││
│ │ (未设)         08-20      —        ○已吊销   —       ││
│ └──────────────────────────────────────────────────────┘│
│ ⚠ 明文仅在签发时展示一次，关闭后不可再查看                 │
```

审计 `/admin/audit`（八维过滤全暴露）：

```text
│ 审计日志                                                  │
│ [动作▾][对象类型▾][对象ID][操作人ID][请求ID][IP][从][到]   │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 时间          动作                  操作人   对象      ││
│ │ 09-10 14:02   asset.status_update   孙学文   rag-skill││
│ │ 09-10 11:31   auth.login.success    赵敏      —       ││
│ └──────────────────────────────────────────────────────┘│
│ 共 N 条        [‹ 上一页]  1/N  [下一页 ›]              │
```

我的提交 `/dashboard/submissions`（提交人视角——撤回入口；任务状态取源码真值）：

```text
│ 我的提交                              [状态: 全部▾]        │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标            版本    状态            提交时间 动作 ││
│ │ langgraph-rag  1.4.0  ●PENDING_REVIEW  09-10 09:20 撤回││
│ │ old-tool       0.9.1  ●REJECTED        09-09 15:02 撤回││
│ │ rag-skill      1.3.0  ●APPROVED       09-08 10:11  —  ││
│ └──────────────────────────────────────────────────────┘│
│ 共 3 条        [‹ 上一页]  1/1  [下一页 ›]              │
```

> §12 覆盖**全部 8 个页面**（示意数据非设计硬值）。视觉环节产出（tokens 全规格 → §10.1、
> 语义修正记录 → §8）随定稿条件 ① 回写。
> 语义修正记录 → §8）随定稿条件 ① 回写。

## 13. 引用文件清单

- 规范：`docs/00-product-direction.md` §2/§5/§7 · `docs/05-identity-access.md` §3/§5/§6 ·
  `docs/06-label-system.md` §3/§5 · `docs/07-i18n-conventions.md` 全 · `docs/08-data-model.md` §5/§7
- 服务端（消费与改动）：`apps/server/src/http/assets.ts`（`assertAssetReadable`、
  `listQuerySchema`、管理端点族）· `assets/service.ts`（`listViewableAssets`）·
  `assets/manage.ts`（`canManageAsset`）· `http/reviews.ts` + `review/query.ts` ·
  `http/labels.ts` + `labels/service.ts` · `http/tokens.ts` · `http/audit.ts` +
  `audit/query.ts` · `http/stats.ts` · `http/auth-middleware.ts`（`requireRole`）·
  `auth/routes.ts`（`/me`）· `auth/rbac.ts`（`roleOf`/`hasRole`/`isSelfReview`）·
  `auth/token-scopes.ts`（token 凭证 scope 码）· `db/schema/users.ts`（`ACCOUNT_ROLE`）
- 前端（复用与新增）：`apps/web/src/components/ui/`（既有 AppShell/TopBar/SideNav/MarkdownRenderer/
  AssetAvatar/Badge/Pagination/Spinner/EmptyState/ErrorState ＋ 迁入 FileTree/FilePreviewDialog ＋
  新增 Toaster/SkeletonLoader/RoleGuard/CopyButton）· `components/console/`（M4b 新增面域：
  PageHeader/DataTable/Drawer/ConfirmDialog/StatusPill/FilterBar + reviews/labels/assets/tokens/audit
  子域）· `components/market/detail/FilesTab.tsx`（迁移引用方）· `auth/`（AuthProvider/RequireAuth）·
  `pages/`（Login/dashboard/*/reviews/*/admin/*）· `i18n/`（I18nProvider/lang/zh/en）·
  `hooks/useApi.ts` · `hooks/useMarketQuery.ts`（控制台面参数化扩展——**不新建 hook**）· `styles/aih-theme.css`（**T24 后为唯一样式文件**；原 `tokens.css` 已删）
- 被更新测试：`apps/server/src/http/assets.test.ts`（`:421` 授权集断言——R6-b）
- 模型事实源：`docs/designs/2026-09-10-flat-model-refactor-design.md`（M4-pre）
- 对标源：`/Users/xuewensun/04-ws/21-skillhub`（MeController / MySkillAppService /
  controller/admin/* / web/src/pages/dashboard/my-skill-filters.ts）·
  `https://clawhub.ai/api/v1/openapi.json`（2026-09-10 实测，27 端点）
- 视觉参照（公开）：**shadcn/ui**（v4，MIT；本机对照仓 `00-ui` = 官方仓 fork）——**视觉体系真值源**，
  取值见 M4a design §4.4（引用不复制）；skillhub 管理面——`21-skillhub/web/src/pages/admin/{audit-log,labels,users}.tsx`
  + `shared/ui/*`（Table/Card/Select/Input/Button）· `shared/components/`
  （confirm-dialog/pagination/empty-state/skeleton-loader/toaster/dashboard-page-header/role-guard/copy-button）
  ——**形态参照**（信息组织形态：表格列结构 / 筛选条位序 / 分页 / 确认对话框 / 页头）
- 图标：lucide（ISC，沿用 M4a 同一来源）
- 流程：`portal-ui-design`（编排：环节 0 线框 → 1 风格板 → 2 高保真 → 3 tokens 定档）+
  `shadcn-ui-project`（shadcn v4 消费侧：CLI 装法 / 四个坑 / 组件真值表）；
  **不做 sketch 三变体**（R9）；线框见 §12
- 评审物料（不进仓，`/tmp` 会丢）：全页可点原型（shadcn 真身，dev :5199）——**M4a 换皮落地后
  以本仓代码为准**

## 14. 规范同步项

| 规范 | 同步内容 | 时点 |
|------|---------|------|
| `05` §6.4 | **R6-b** 非 ACTIVE 读面授权集注记（owner 本人 / 管理档 / 超管可读）——修改 M4-pre 已同步的「仅超管」行 | M4b 收尾 |
| `08` §7 | ① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）；② **ARCHIVED 语义补实**——当前与 HIDDEN 判定同构（`status !== 'ACTIVE'`），建议写明「HIDDEN = 临时下架/可恢复；ARCHIVED = 长期退役/停止维护」的运营语义分界 | M4b 收尾 |
| `07` §3 | `dashboard`/`admin`/`review` 资源组落地注记（§3 资源组清单新增 `dashboard` 个人工作台组——两层分层引入，与 `admin` 治理面组并置） | M4b 收尾 |
| `00` §5 | M4b 行完成注记 | M4b 收尾 |
| `05` §6.4 | 补 **列表 / 启用·禁用** 两行（管理档 `role >= 10`）；**改角色沿用既有「角色分配 = 超管」行**（05 §6.1 明文，不重复新增）+ **末位超管保护**（禁止把最后一个 ACTIVE 超管降级/禁用）与**禁止自我降级 / 自我禁用**注记 | **M4c** 立项时 |
| `00` §5 | M4c 行（2026-09-10 已新增 ⬜）+ M4b 行范围注记（用户管理移出） | **已同步** 2026-09-10 |
| `00` §5 · `M1-phase2` plan | **Device Flow 确认页归属漂移登记**：`M1-phase2` plan 原记「M4 web」，2026-09-10 决策改为「M4c 或随 M5 CLI」——M5 立项时二次确认；**不改写已收尾的 M1 plan**（历史完成注记不改），改在 M5 plan 内注记归属变更并引用本条 | **M4c/M5** 立项时 |
| `2026-09-10-flat-model-refactor-design` **P3**（:120）· §2.5（:285） | **用户管理 / 角色分配旧注修订**：P3 与 §2.5 写「用户管理能力（未实现）将来落地按 `role >= ADMIN` 判定」→ M4c 立项时以 **05 §6.1/§6.4 为准**（**改角色 = 超管**；列表/启用·禁用 = 管理档），并在 M4c design 写明该修订 | **M4c** 立项时 |
| （后置·非规范） | **审计动作常量集中化**：`audit_log.action` 现为 server 侧散落字面量（25 个），前端过滤清单靠同步维护；建议抽为共享常量（对齐 `auth/token-scopes.ts` 的常量单源模式），消除漂移 | M6 或按需 |
| `2026-09-09-m4a-marketplace-portal-design` **§4.4** | **全站视觉真值 SSOT 引用**：M4b 控制台面视觉基线指向该节（色彩 token / 圆角轴 / 字阶 / 组件真值 / AIH 补丁表）；本文件 §10.1 只记控制台特有值（表格密度 / 抽屉宽 / 状态映射）——**双写即漂移，改动只动 SSOT** | M4b 实现期（引用即生效） |
| （后置·非规范） | **AIH token 补丁（`--success` / `--warning` / 类型色）无规范层归属**：`07` 实测无 token / 视觉章节（2026-09-11 核）→ 补丁表登记于 M4a §4.4 ②，规范层不新增行；若将来新增视觉规范文档，补丁表随之迁入 | 按需 |
| `00` §5 | M4a 行「视觉体系切换进行中」+ M4b 行「依赖 M4a 视觉体系切换先行」+ M5 行 **Device Flow 确认页归属**注记 | **已同步** 2026-09-11 |

> ARCHIVED 语义补实的依据：clawhub 契约**无 archive 概念**，skillhub 的 `SkillStatus.ARCHIVED`
> 语义分界亦弱——AIH 保留三态（改枚举代价 > 收益），但应在规范层写实差异，
> 消除"两个状态行为完全一致"的规范空白。

## 15. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-10 | sunxuewen-rush | 初稿：立项对齐产物——范围拍板 R1-R9（档 B/发布流后置/用户管理后置/本地+LDAP 登录/`/me` 补角色/`/admin/*` 复用壳/品牌沿用/精简视觉流程）；R6 缺口实证（探针 9/9）与处置（新增 `GET /api/me/assets` + 详情面授权集放宽 R6-b）；对标 21-skillhub 源码（admin 面/MeController filter 枚举/HIDDEN 超管校验）与 clawhub.ai 官方契约（无 hide/archive，soft delete + moderation 轴） |
| v0.2 | 2026-09-10 | sunxuewen-rush | 8 维自检修复（8.6 → 重评）：🔴4 + 🟡8 全修——① `POST /api/namespaces` 权限对齐源码（`ASSET_ADMIN` 平台角色，非 asset:publish）② `canManageAsset` 归属修正（`assets/manage.ts`）③ §6.1 依赖段与 §6.3 的 diff 表述矛盾消除（明确不引入 diff 依赖、组件群不迁移）④ `/admin/reviews` 入口改「任何登录用户 + 按角色渲染 tab」，消除 `reviews/mine`（`requireAuth`）与入口条件（`ASSET_ADMIN`）的矛盾（撤回入口随之可达）；自助注册显式 out（含 `REGISTRATION_ENABLED` 无公开端点的影响说明）；术语统一（待审核）与线框/契约对齐（概览 `status=ALL`）；`platformRoles` 顺序不作契约；FileTree 迁移影响面说明（`FilesTab.tsx` import）；测试影响面补全（`:495` + `:990` 段两处）；拼写修正 |
| v0.3 | 2026-09-10 | sunxuewen-rush | M4a 范本对标补全（学 M4a design 12 段 + 6 特质后回查缺口，11 项全补）：① **视觉参照三元组**（气质=M4a tokens / 形态=skillhub 管理面公开源 / 图标=lucide ISC——用户拍板）；② **三族适用性**（审核详情 manifest 卡按 type 分型，复用 M4a `OverviewTab` 分型探测）；③ 响应式断点（表格 <1100px 横向滚动 / 抽屉全宽 / 侧栏 <900px 图标态）；④ 组件补件（`Toaster`/`SkeletonLoader`/`RoleGuard`/`CopyButton`/`AuditActionSelect`——skillhub `shared/components` 对标发现）；⑤ 缺口 **G 段呈请编号**（G1-G4 → R5/R6/R6-b 两段式）；⑥ 审计页 8 过滤器全暴露 + **31 个 action 分组下拉**（清单列全，集中化登记 §14）；⑦ 联调数据需求（多角色/各状态/三族/FROZEN 空间）；⑧ 依赖版本锚；⑨ 关键空/错态文案示例；⑩ 评审物料时点修正；⑪ 规模预估更新（~27 组件） |
| ⏸ 搁置 | 2026-09-10 | sunxuewen-rush | 因 **M4-pre 扁平化重构**搁置（用户 2026-09-10 拍板）：角色改 4 档单值（`user_account.role`）、空间整体删除、可见性删除、权限码归零 → 本文档 `platformRoles` 契约（R5/§6/§4）与空间管理章节**作废**；待 M4-pre S4（T13）按新模型重写为 v1.0。搁置前的 8 维 9.4 评价对其余章节（审核队列/标签/资产/令牌/审计 + 视觉体系）仍有效 |
| **v1.0** | 2026-09-10 | sunxuewen-rush | **按 M4-pre 扁平化模型整体重写**（解除搁置）：角色 4 档线性单值 `role >= N`（R5 改为消费 M4-pre 已交付的 `/me → {user, role}`，本版**零服务端改动**）· 删空间域（9 端点/2 表/空间角色/FROZEN 态/`@ns/slug` 坐标全清）· 删可见性（`PATCH /:slug` 与读面可见性出口）· 坐标改全局唯一裸 slug · §7.1 契约表逐条对照源码重核（附 file:line）· G4 由 M4-pre 闭环 · 组件 ~27→~25 · audit 动作 31→25 · §12/§13/§14 同步 |
| **v1.1** | 2026-09-10 | sunxuewen-rush | **入口分层修正（恢复已拍板决策）+ 环节 0 收口 + 8 维自检修复**：① `/dashboard/*` 个人面 + `/admin/*` 治理面（v0.1-v1.0 把个人事务全塞进 `/admin/*`，属分层缺失）② R7 改写（组级显隐 + 条目级 role 门槛）③ **共享审核详情 `/reviews/:id`**（否则提交人被 `/admin` 组级守卫挡住 → 撤回不可达）④ 章节同步 §4/§5/§6.2/§6.3/§6.4/§7.3/§10.2/§11/§12/§13 ⑤ 组件面域 `components/admin/` → `components/console/`，跨面基础件归 `ui/` ⑥ 补充锁定 5 条入 §2.1 ⑦ §7.1 端点契约逐条复核源码，全表吻合（audit action 实测 25）⑧ 8 维自检 8.8 → 修复后 9.4 ⑨ M4a 范本对标修复（断点入路由段/Status 补定稿条件/§13 补流程行/删被否决残余/线框补 4 页）⑩ **环节 0 收口**：新增 §5.1 页面职责矩阵 + §12 第 8 张线框；§15/头部按体量纪律压缩 |
| **v1.2** | 2026-09-10 | sunxuewen-rush | **范围调整（用户拍板 A：登录留 M4b + 用户管理移出）**：① §2.1 **R3 → R3′**：用户管理移出至 **M4c「账号与权限治理」**（同属新机制：改角色/启停/建号 + `ACCESS_POLICY` 准入策略 + 重置密码 + 强制登出）——原「不入首期」理由（服务端零 HTTP 面）保留为实证，新增数据侧已就绪（`user_account.status/role` + 索引）与 M4c 依赖 M4b 组件基建的注记 ② §2.2 In 明确「认证与会话 = **前端层**，服务端 M1 已交付 → 本里程碑零服务端改动」；Out 用户管理行与 Device Flow 确认页改指 M4c ③ **新增 §3.0「认证能力 × 阶段归属」对照表**（M1 ✅ / M4b ⬜ / M4c ⬜ / M5 ⬜） ④ §14 新增三行：`05` §6.4 用户管理行（M4c 时点）· `00` §5 M4c 行（已同步）· **Device Flow 确认页 plan↔design 漂移登记** ⑤ 依据：服务端与规范实测（`auth/routes.ts:46-122` · `db/schema/users.ts:49-68` · `config/env.ts:95-96` · `docs/00` §5 v1.15）⑥ M4b 范围与两项定稿条件不变 ⑦ **自检修复（同日整合，8 维 9.2 → 见下轮重评）**：§3.3 旧编号 `（R3）`→`R3′` · §14 措辞去重（`05` §6.4 改角色沿用既有「角色分配 = 超管」行，只补 列表/启停）· §14 Device 行改为**不改写已收尾的 M1 plan** · §14 **新增 M4-pre P3/§2.5 旧注修订登记**（旧文「按 `role >= ADMIN` 判定」→ 改角色 = 超管）· `00` §5 M4b 行版本号 v1.1→v1.2 + M4c 行补**范围档位候选** |
| **v1.3** | 2026-09-11 | sunxuewen-rush | **视觉体系切换对齐（用户拍板）**——全站统一 **shadcn 蓝科技**，本文件做**引用级对齐**（不复制、不落实现）：① **视觉真值 SSOT 移交 M4a design v0.9 §4.4**——§10.1 标题/主体重写为「引用 + 归属分工表」，控制台面只留特有项（状态语义映射 / 表格密度 / 抽屉宽）；§10.2 与 §6.2 的色值表述同步改引用 ② **§6.1 依赖重写**：删「零新增运行时依赖」→ 样式/组件栈 = M4a §4.1 + §4.4（Tailwind v4 + shadcn CLI + `cn` 等），控制台面特有依赖 = 无（Table/Sheet/Dialog/Select/DropdownMenu/Badge/Sonner/Skeleton 原语全覆盖）③ **§6.2 组件树落位**：新增 `components/ui/shadcn/` 目录（**大小写碰撞规避**：`badge.tsx` vs 既有 `Badge.tsx`、`pagination.tsx` vs `Pagination.tsx`）；Toaster→`Sonner` 封装、SkeletonLoader→`Skeleton` 组合；DataTable→`Table` 封装、Drawer→`Sheet` 封装 ④ **§3.1 登录页**：玻璃卡 + 品牌渐变标题 → shadcn `Card` + `--primary` ⑤ **危险操作语义修正**：色值 `#cf222e`（M4a diff 内容色）→ `--destructive` #e7000b（UI 语义色，两者分工不同）⑥ **R9 改写**：产出范围由「1 版风格板 + 2 交互 demo」→ **全页可点原型**（9 视图 + 评审控件；用户扩大范围）；技术落法 = 真上 shadcn/ui（用户拍板 B「一步到位省的返工」）⑦ **§14 新增三行**（SSOT 引用纪律 / AIH 补丁无规范层归属 / `00` §5 三处注记已同步）· §13 引用（+shadcn/ui 与 `shadcn-ui-project` 流程）⑧ **顺序翻转**：原 2026-09-10 拍板「先控制台面」→ 现「**先门户换皮 → 再 M4b**」（理由：共享壳为门户与控制台共用、门户类型色是 shadcn 体系最难落的一块；M4a design 升 v0.9 承载）⑨ **控制台特有值 2 项待拍板**（表格密度 40/48 · 抽屉宽 384/560）——本版**刻意不落值**（未拍板不写成契约） |
