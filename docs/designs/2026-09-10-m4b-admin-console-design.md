# M4b 管理后台设计

> Date: 2026-09-10
> Updated: 2026-09-10（**v1.0：按 M4-pre 扁平化模型整体重写**——角色 4 档线性单值（`role >= N`，`/me` 返 `role`）· 空间域整体删除（9 个空间端点 / 2 表 / 空间角色 / `@ns/slug` 坐标全清）· 可见性整体删除（`PATCH /:slug` 与读面可见性出口）· 坐标改全局唯一裸 slug · 端点契约逐条对照 `apps/server/src` 源码重核（§7.1 全表附 file:line 依据）· 组件树/审计动作/线框/引用清单同步 · 头部「⏸ 搁置」声明解除；v0.3：M4a 范本对标补全（视觉参照三元组 / 三族适用性 / 响应式 / 组件补件 / 缺口 G 段编号 / 31 动作分组下拉 / 依赖版本锚）；v0.2：8 维自检修复（端点权限与归属对齐源码、diff 表述矛盾消除、注册入口改「任何登录 + 按角色渲染 tab」、术语统一、测试影响面补全）；v0.1：初稿——立项对齐产物：范围拍板 R1-R9 + R6/R6-a/R6-b 缺口处置（含实证）+ clawhub.ai 官方契约 / 21-skillhub 源码双对标）
> Status: 草稿（v1.0 已按 M4-pre 扁平化模型重写；v0.3 的「⏸ 搁置」状态随本次重写解除——待 8 维自检 ≥9 + grilling → 用户批准定稿）
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
- i18n 机制（I18nProvider + useApi 语言感知缓存）与 tokens.css 全量视觉 token 可直用

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

### 2.1 拍板结果（R1-R9 + R6 衍生，全部已确认）

| # | 议题 | 拍板结果 |
|---|------|---------|
| R1 | 范围档位 | **档 B**：治理闭环（审核/标签/生命周期/审计）+ 运营面（令牌/我的资产与提交），另加认证地基 |
| R2 | 发布/上传流 | **不入首期**（后端端点已齐 `POST /api/assets` + `POST /:slug/versions`；前端 multipart/进度/校验映射基建会稀释治理闭环收敛，单列后置） |
| R3 | 用户管理 | **不入首期**（服务端零 HTTP 面：`UserService` 仅 register/localLogin；角色分配按 M4-pre **P3** 靠 `SEED_ADMIN_*` 首管理员 + 手工 SQL 改 `user_account.role`，**不建用户管理页**） |
| R4 | 登录方式 | 本地账号密码（LDAP 复用同一密码通道，05 §3.1）+ 登出；OIDC 仅保留入口跳转（服务端授权码流已就绪） |
| R5 | 角色感知 | **沿用 M4-pre 已交付契约**：`GET /api/auth/me` → `{ user: { id, displayName }, role: number }`（`role ∈ 0/1/10/100`）；前端按 `role >= N` 显隐。**本项零服务端改动**（重构前拟的「平台角色数组」方案已废弃，§15） |
| R6 | 非 ACTIVE 资产的发现与恢复 | **新增「我可管理的资产」读面**（§7.2 R6）——公开面 `GET /api/assets` 与写面端点**零改动** |
| R6-a | 非 ACTIVE 可见范围 | **owner 本人 / 管理档（`role >= ADMIN`）/ 超管** 可见自己管理域内的 HIDDEN/ARCHIVED 资产（判定同 `canManageAsset`：`owner 本人 ∨ role >= ADMIN`，05 §6.2/§6.4） |
| R6-b | 详情面 | **同步放宽**（R6-a 授权集）：HIDDEN/ARCHIVED 资产详情对该授权集可读；授权集之外仍 404 不泄露存在性（§7.2 R6-b）。**注**：本项修改 05 §6.4 现行的「非 ACTIVE 读面仅超管」行，列入 §14 规范同步项 |
| R7 | 壳与入口 | `/admin/*` 独立路由段 + **复用 AppShell**；SideNav 按 `role >= 10` 显隐「管理」组 |
| R8 | 品牌显示名 | **沿用 M4a 现状「AI X Hub」**（TopBar/Hero 已用；00 §3 D2 正式定名仍待决议，不阻塞 M4b） |
| R9 | 视觉与验证 | **精简版**：tokens 沿用 M4a；仅对管理后台特有形态（数据表格/表单/抽屉/危险操作确认）出风格板 + 交互 demo；不做三变体 sketch |

### 2.2 M4b 边界

**In（档 B）**：

- 认证与会话：登录页（本地+LDAP）/ 登出 / 会话上下文 / 401 拦截 / 角色感知（R5——消费 M4-pre 契约）
- 审核队列：全站单队列列表（status 过滤）+ 审核详情（版本内容预览）+ 通过/拒绝（comment）+ 撤回
- 标签管理：定义 CRUD + 多语言翻译 + 两级树 + 排序 + 上限提示（超管面）
- 资产生命周期：我可管理的资产列表（状态筛选）+ 状态治理 + 版本管理（yank/删除）+
  资产删除 + 标签挂载
- 令牌管理：签发（scope/有效期，明文一次展示）/ 列表 / 吊销
- 审计浏览：日志列表 + 八维过滤
- i18n：新增 `admin` / `review` 资源组（07 §3）
- 服务端最小支撑：R6（`GET /api/me/assets` 新增）+ R6-b（读面授权集扩）

**Out（后置，不混入）**：自助注册入口（服务端 `POST /api/auth/register` 存在，但
`REGISTRATION_ENABLED` 开关**无公开端点暴露**→ 前端无法感知注册是否开启；企业自托管默认
关闭注册、由管理员建号（seed / 用户管理面）；若需开放自助注册，须一并新增开关暴露端点，
属后置议题）· 资产发布/上传流（R2）· 用户管理面（R3）· 提升申请
（`promotion` 权限码与端点均未建，`promotion_request` 表 08 §9 蓝图随对应服务引入）·
排序切换/社交面（M4a 已 out）· 安全扫描面（AIH 版本态 SCANNING 为扫描扩展点，
clawhub 的 scan/moderation 面为独立议题）· 自定义版本通道 stable/beta（M3 明确后置）·
空间管理（M4-pre 已整体删除，无回归议题）

## 3. 认证与会话（R4/R5）

### 3.1 登录页

- 路由 `/login`，独立于 AppShell 的居中版式（复用 tokens：玻璃卡 + 品牌渐变标题）
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
- 角色分配无 UI（M4-pre P3）：靠 seed 首管理员 + 手工 SQL；M4b 不建用户管理页（R3）

## 4. 管理入口与显隐规则

SideNav 新增「管理」分组，条目按 `role` 档位过滤（无管理权限时不渲染整个分组）：

| 入口 | 可见条件 |
|------|---------|
| 审核与提交 `/admin/reviews` | **任何登录用户**（页面内按角色渲染 tab：管理档见「待审核」，所有人见「我提交的」——`GET /api/reviews/mine` 是身份面 `requireAuth`，任何登录者都有；撤回入口在此 tab） |
| 标签管理 `/admin/labels` | `role >= SUPER_ADMIN`（100） |
| 资产管理 `/admin/assets` | 任何登录用户（「我可管理的资产」为空时显示空态引导） |
| 令牌 `/admin/tokens` | 任何登录用户 |
| 审计 `/admin/audit` | `role >= ADMIN`（10） |

顶栏：未登录显示「登录」（沿用 M4a 占位位置）；已登录显示用户菜单（displayName + 登出）。

> 显隐是**体验优化**而非安全边界——所有判定以服务端权限为准（服务端已全量覆盖，§7.1）。

## 5. 页面结构与路由（R7）

```text
/login                       登录（独立版式）
/admin                       概览：待审核数 / 我的资产计数 / 最近审计（角色感知卡片）
/admin/reviews               审核与提交：tab「待审核」（管理档 `role >= 10` 见全站单队列）·
                             tab「我提交的」（所有登录用户；行内「撤回」= 提交人本人）
/admin/reviews/:id           审核详情：版本内容预览 + 通过/拒绝/撤回
/admin/assets                资产管理：我可管理的资产 + 状态筛选 + 行内动作 + 抽屉
/admin/labels                标签管理：两级树 + 编辑 + 翻译 + 排序
/admin/tokens                令牌：列表 + 签发 + 吊销
/admin/audit                 审计：日志表 + 八维过滤
```

- 全部挂在既有 `AppShell` 下（`components/ui/AppShell.tsx` 的 `<Outlet/>` 区），
  M4a 五路由零改动
- query 状态 URL 化（沿用 M4a `useMarketQuery` 同款：`?status=`/`?q=`/`?page=`，
  admin 侧新增 `useAdminQuery` 薄封装，语义同构）
- 抽屉/对话框状态不进 URL（次要状态，同 M4a 版本对比对的处置）

## 6. 前端架构与组件树

### 6.1 依赖

**零新增运行时依赖**。复用 M4a 已批依赖：react-router-dom / react-markdown + remark-gfm
（审核详情渲染 manifest 或文档预览）。**不引入任何 diff 相关依赖**——审核面首期不提供
行级 diff（§6.3），`VersionCompare` 与 Diff 组件群留在 market 面不动。

**版本锚**：沿用 M4a plan 锁定的版本（react-router-dom@7.18.3 / react-markdown@10.1.0 /
remark-gfm@4.0.1），M4b 不引入新依赖、不变更版本。

### 6.2 组件树（新增面）

```text
src/
├── auth/                      新增
│   ├── AuthProvider.tsx       /me 上下文（user + role）+ 401 拦截 + login/logout
│   └── RequireAuth.tsx        路由守卫（未登录 → /login?next=）
├── api/                       新增 admin.ts（ep 分组）+ 既有 client 复用
│   └── admin.ts               me/assets · reviews · labels · tokens · audit
├── hooks/useAdminQuery.ts     新增：admin 页 URL query ↔ 状态（分页/筛选）
├── components/admin/          新增
│   ├── AdminPage.tsx          页头（标题 + 副述 + 右侧动作槽）
│   ├── DataTable.tsx          通用表格（列定义驱动 + 空/载/错态 + 行内动作槽）
│   ├── Drawer.tsx             右侧抽屉（玻璃卡 + 遮罩 blur——复用 FilePreviewDialog 版式纪律）
│   ├── ConfirmDialog.tsx      危险操作确认（HIDDEN/ARCHIVED/删除/yank 前）
│   ├── StatusPill.tsx         资产/版本状态徽章（色值复用 M4a 类型色体系）
│   ├── FilterBar.tsx          筛选条（状态下拉 + 关键词）
│   ├── Toaster.tsx            轻提示（写操作成功/失败反馈——§9；全局单例挂 App）
│   ├── SkeletonLoader.tsx     表格/详情载态骨架（管理面高频列表——优于 Spin 空屏）
│   ├── RoleGuard.tsx          角色级守卫（RequireAuth 之上叠加 `role >= N` 判定，§4 显隐的服务端对齐版）
│   ├── CopyButton.tsx         复制（令牌明文/资产坐标/sha——明文场景关闭即清）
│   ├── reviews/               ReviewQueue.tsx · ReviewDetail.tsx · ReviewActions.tsx
│   ├── labels/                LabelTree.tsx · LabelForm.tsx · LabelTranslations.tsx
│   ├── assets/                AssetAdminTable.tsx · AssetDrawer.tsx · AssetVersionList.tsx
│   ├── tokens/                TokenTable.tsx · TokenIssueDialog.tsx · TokenRevealDialog.tsx
│   └── audit/                 AuditTable.tsx · AuditFilters.tsx · AuditActionSelect.tsx
│                              （action 过滤用**分组下拉**而非自由输入——防拼错；值清单见 §7.3）
└── pages/admin/               路由页（薄装配：AdminOverview/Reviews/ReviewDetail/Assets/
                               Labels/Tokens/Audit）
```

### 6.3 复用与升级边界

- **直接复用**（`components/ui/`，零改动）：AppShell · TopBar · SideNav（增管理组）·
  Badge · Pagination · Spinner · EmptyState · ErrorState · FileTree · FilePreviewDialog ·
  MarkdownRenderer · AssetAvatar · LanguageSwitcher
- **升级到 ui/**（跨面复用确认）：`FileTree` 与 `FilePreviewDialog` 在 M4a 位于
  `components/market/detail/`——M4b 审核详情需同款能力，**迁移到 `components/ui/`**
  （M4a design §4.2 已预留该复用意图：FileTree「M4b 审核复用」、FilePreviewDialog「M4b 复用」）
  ——**迁移影响面**：组件本体零改动，仅需同步更新唯一引用方 `market/detail/FilesTab.tsx:5,7`
  （import 路径），M4a 路由与页面行为不变
- **仍留 market 面**：`VersionCompare` + Diff 组件群——M4a design 原文「审核侧若需行级 diff
  M4b 再升 ui」；M4b 审核详情**首期不提供行级 diff**（审核决策所需的核心是文件清单 +
  内容预览 + manifest，diff 属消费者阅读体验），故不迁移、不改动
- **新增组件一律落 `components/admin/`**（不污染 `ui/` 跨面层）：`ui/` 仅承载 M4a 既有
  跨面原子 + §6.3 迁移项；管理面形态（表格/抽屉/确认/筛选）是后台专属，留在 admin 面利于
  后续替换而不牵动门户

### 6.4 规模预估

8 路由 + ~25 新组件 + 1 hook + 1 provider + 2 i18n 资源组 ≈ 2400-3000 行（含样式），
单文件 ≤200 行。

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
| 资产详情 | `GET /api/assets/:slug` | ACTIVE 匿名；非 ACTIVE **仅超管**（其余含 owner/管理档同 404 `asset.not_found`） | AssetItem + `labels[]` | `http/assets.ts:163-176,290-299` |
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
- **回退口径（若本扩展被否决——保持「非 ACTIVE 仅超管」）**：资产管理页对非 ACTIVE 资产
  仅呈现列表元信息 + 状态动作（恢复/归档），不提供详情预览

### 7.3 页面数据编排

- 概览 `/admin`：并发 3 请求（`/api/reviews?status=PENDING&limit=1` 取 total ∥
  `/api/me/assets?status=ALL&limit=1` 取 total（含隐藏/归档——与线框「含 N 隐藏」一致）∥
  `/api/audit?limit=5`）——按角色裁剪请求（无权限的卡片不发请求，避免必然 403）
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

沿用 M4a（design §7）并补充管理面约束：

- `useApi` 三态 + abort + 语言感知 Map 缓存（键含 lang）
- 分页：**offset 替换式**（管理表格无跨页选中需求）；筛选/搜索变更 → `page` 回落 1
- 危险操作（隐藏/归档/恢复/删除/yank/吊销）→ **ConfirmDialog 二次确认**，
  文案含对象坐标与后果（如「隐藏后该资产对所有非管理员不可见」）
- 写操作成功 → 局部重取 + 轻提示（不整页刷新，保留筛选与滚动位置）
- 错误：`errors` 资源组按 code 本地化；401 → 全局拦截重定向 `/login?next=`
- 403 → 就地提示（不退化为空态，避免"看起来没数据"的误导）

## 10. UI-UX 变动总览

### 10.1 视觉参照与基调（R9：气质沿用 M4a，形态参考 skillhub）

**参照三元组（对标 M4a design §10 的参照纪律——参照系必须先定，风格板才有锚点）**：

| 项 | 取值 |
|----|------|
| **气质（皮肤）** | 沿用 M4a tokens——蓝色科技风 + 毛玻璃（品牌渐变 / 玻璃卡 / 类型色 / 字阶 / 6px 细蓝滚动条）；管理面**零新增色系** |
| **形态（结构）** | 公开参照 **skillhub 管理面**（`21-skillhub/web/src/pages/admin/*` + `shared/ui/*` 的 shadcn 风格 Table/Card/Select/Input/Button）——借其信息组织形态（表格列结构 / 筛选条位序 / 分页 / 确认对话框 / 页头），**不照抄其视觉皮肤** |
| **图标** | lucide（ISC，沿用 M4a 同一来源）；管理面动作图标（抽屉关闭 / 复制 / 排序 / 状态点 / 危险动作）同取 lucide 系 |

**管理后台特有形态（视觉环节补规格）**：

- 数据表格：表头 12/600 灰、行 13/1.6、hover 浅蓝底、状态列右对齐 `tabular-nums`、
  载态用 `SkeletonLoader` 行占位
- 表单控件：输入框玻璃底 + 聚焦蓝边；`Select` 下拉（筛选 / 分组枚举）形态对齐 skillhub
- 右侧抽屉：宽 560px、遮罩 blur3、头部标题 + 关闭；窄屏全宽侧滑
- 危险操作：确认对话框 + 红系 `#cf222e` 语义色（取自 M4a diff tokens 的删除色，色系一致性）
- **待补**：新增状态色号入 `tokens.css`（资产三态 ACTIVE 绿 / HIDDEN 琥珀 / ARCHIVED 灰、
  版本八态的正式色值）——视觉环节定档
- 空/载/错三态沿用 `ui/EmptyState|Spinner|ErrorState`（表格另用 `SkeletonLoader`）

### 10.2 信息架构与交互要点

- **审核详情**是核心工作台：左主列 = manifest 摘要卡 + 文件树（`ui/FileTree`）+
  文件预览对话框；右栏 = task 元信息（坐标/版本/提交人/时间）+ 动作区（通过/拒绝/撤回）
  - **manifest 卡按 type 分型（三族适用性——M4a T15 实证的族协议差异）**：skill 族主文档
    `SKILL.md`（必需）；mcp 族 `mcp.json` / `README.md`（可选）；agent 族 `agent.md` /
    `README.md`（可选）——复用 M4a `OverviewTab` 的分型探测与回退逻辑（大小写归一 + 缺失
    回退结构化摘要），审核人看到的摘要形态随类型自适应，不空窗
- **资产管理抽屉**：状态治理（含恢复）+ 标签挂载 + 版本列表（yank/删除）+
  危险区（删除资产，说明"有已发布/已撤回版本时不可删除"）
- **状态语义可视化**：`StatusPill` 统一呈现资产三态（ACTIVE 绿 / HIDDEN 琥珀 / ARCHIVED 灰）、
  版本八态——色系复用 M4a（新增行补入 tokens）
- 品牌显示名「AI X Hub」沿用（R8）；语言切换器沿用（管理后台与门户共用 i18n 机制）
- **响应式**：管理表格窄屏（<1100px）→ 容器横向滚动（保留列完整，**不做卡片化**——管理场景
  列信息密度优先）；抽屉窄屏 → 全宽侧滑；侧栏 <900px 折叠为图标态（沿用 M4a 断点体系）
- **关键空/错态文案（示例，非硬编码——zh 真源 / en 对齐）**：「暂无待审任务」·
  「未找到匹配的资产 · 试试切换状态筛选」·「该资产有已发布版本，不能删除」·
  「会话已过期，请重新登录」（401 拦截文案）·「标签定义已达上限 100 个」

## 11. i18n 资源规划（07 §3）

新增两组（zh 真源 / en 完整对齐，纪律同 M4a）：

- `admin`：管理后台通用（页标题/表格列名/动作文案/确认对话框/空态文案）
- `review`：审核面专属（队列状态/动作/防自审提示）

既有 `common`/`errors` 复用；服务端新错误码（若有）入 `errors` 组。

## 12. 线框图

管理概览（角色感知卡片）：

```text
┌ AI X Hub                     🌐 中|EN    [👤 孙学文 ▾] ┐
│ ⌂首页 ✦技能中心 ⚙MCP ◈专家                            │
│ ─ 管理 ─────────────────────────────────────────────  │
│  ▤ 概览  ⚖审核  ◫资产  ⌗标签  ⛁令牌  ☰审计            │
├────────────────────────────────────────────────────────┤
│ 管理概览                                                │
│ ┌待审核────┐┌我的资产──┐┌最近审计──────────────┐      │
│ │    3     ││   12     ││ auth.login.success    │      │
│ │ 待处理   ││ 含2隐藏  ││ asset.status_update   │      │
│ │ [去处理] ││ [去管理] ││ asset.version_yank    │      │
│ └──────────┘└──────────┘└───────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

审核详情（核心工作台——坐标 = 全局唯一裸 slug）：

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

资产管理（含状态筛选与恢复——坐标 = 裸 slug，无可见性列）：

```text
│ 资产管理                        [状态: 全部▾] [🔍 搜索]  │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标             类型  状态     版本   更新  动作      ││
│ │ rag-skill        skill ●ACTIVE  1.3.2 09-09 ⋯        ││
│ │ old-tool         mcp   ●HIDDEN  0.9.0 08-21 ⋯        ││
│ │ x-agent          agent ●ARCHIVED 2.1.0 07-30 ⋯       ││
│ └──────────────────────────────────────────────────────┘│
│ 行内 ⋯ → [恢复 ACTIVE][归档][删除][标签挂载]             │
└──────────────────────────────────────────────────────────┘
```

（审核/标签/令牌/审计页线框随视觉环节 bump 补充——本版 §12 覆盖主工作流）

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
- 前端（复用与新增）：`apps/web/src/components/ui/`（AppShell/TopBar/SideNav/FileTree/
  FilePreviewDialog/MarkdownRenderer/AssetAvatar/Badge/Pagination/Spinner/EmptyState/ErrorState）·
  `components/market/detail/`（FileTree/FilePreviewDialog 迁 ui/）· `i18n/`（I18nProvider/lang/zh/en）·
  `hooks/useApi.ts` · `hooks/useMarketQuery.ts` · `styles/tokens.css`
- 被更新测试：`apps/server/src/http/assets.test.ts`（`:421` 授权集断言——R6-b）
- 模型事实源：`docs/designs/2026-09-10-flat-model-refactor-design.md`（M4-pre）
- 对标源：`/Users/xuewensun/04-ws/21-skillhub`（MeController / MySkillAppService /
  controller/admin/* / web/src/pages/dashboard/my-skill-filters.ts）·
  `https://clawhub.ai/api/v1/openapi.json`（2026-09-10 实测，27 端点）
- 视觉参照（公开）：skillhub 管理面——`21-skillhub/web/src/pages/admin/{audit-log,labels,users}.tsx`
  + `shared/ui/*`（shadcn 风格 Table/Card/Select/Input/Button）· `shared/components/`
  （confirm-dialog/pagination/empty-state/skeleton-loader/toaster/dashboard-page-header/role-guard/copy-button）
  ——**形态参照**；视觉皮肤仍为 M4a tokens
- 图标：lucide（ISC，沿用 M4a）
- 评审物料（不进仓）：视觉环节风格板与交互 demo（R9 精简版，随视觉环节 bump）

## 14. 规范同步项

| 规范 | 同步内容 | 时点 |
|------|---------|------|
| `05` §6.4 | **R6-b** 非 ACTIVE 读面授权集注记（owner 本人 / 管理档 / 超管可读）——修改 M4-pre 已同步的「仅超管」行 | M4b 收尾 |
| `08` §7 | ① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）；② **ARCHIVED 语义补实**——当前与 HIDDEN 判定同构（`status !== 'ACTIVE'`），建议写明「HIDDEN = 临时下架/可恢复；ARCHIVED = 长期退役/停止维护」的运营语义分界 | M4b 收尾 |
| `07` §3 | `admin`/`review` 资源组落地注记 | M4b 收尾 |
| `00` §5 | M4b 行完成注记 | M4b 收尾 |
| （后置·非规范） | **审计动作常量集中化**：`audit_log.action` 现为 server 侧散落字面量（25 个），前端过滤清单靠同步维护；建议抽为共享常量（对齐 `auth/token-scopes.ts` 的常量单源模式），消除漂移 | M6 或按需 |

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
| **v1.0** | 2026-09-10 | sunxuewen-rush | **按 M4-pre 扁平化模型整体重写**（解除搁置）：① **角色 4 档线性单值**——`role >= N`（`0 GUEST/1 USER/10 ADMIN/100 SUPER_ADMIN`），R5「平台角色数组」方案废弃，改为**消费 M4-pre 已交付的 `/me → {user, role}` 契约**（本版 **零服务端改动**——原「`/me` 增 platformRoles」R5 章删）；② **删空间域**——「空间管理」章节、`/api/namespaces/**` 9 端点、空间角色（OWNER/ADMIN/MEMBER）、空间状态（FROZEN/ARCHIVED）、`@ns/slug` 坐标、空间三态色号全清；③ **删可见性**——`PATCH /:slug`（可见性修改）、`asset.access_denied`、读面可见性出口全清（读面只由 `asset.status` 决定）；④ 坐标改**全局唯一裸 slug**（组件/线框/契约表全同步）；⑤ **端点契约逐条对照 `apps/server/src` 源码重核**（§7.1 全表附 file:line 依据；§7.2 缺口重核——G1/G2/G3 仍在、**G4 由 M4-pre 闭环**）；⑥ 组件树去 namespaces 组（~27 → ~25 组件、9 → 8 路由）；⑦ 审计动作 31 → **25**（删空间域 5 + 资产可见性 1），联调数据去 FROZEN 空间；⑧ §12 线框去空间条目与可见性列；⑨ §13 引用清单去已删文件（`assets/visibility.ts`/`auth/permissions.ts`），补模型事实源；⑩ §14 规范同步项更新（05 §6.4 改为 R6-b 授权集注记；审计常量集中化对齐 `token-scopes.ts` 模式） |
