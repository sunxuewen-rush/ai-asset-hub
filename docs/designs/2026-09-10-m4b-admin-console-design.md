# M4b 管理后台设计

> Date: 2026-09-10
> Updated: 2026-09-10（v0.3：M4a 范本对标补全——视觉参照三元组（气质 M4a tokens / 形态 skillhub 管理面 / 图标 lucide）、三族适用性（审核详情 manifest 分型）、响应式断点、组件补件（Toaster/SkeletonLoader/RoleGuard/CopyButton/AuditActionSelect）、缺口 G 段呈请编号、审计 31 动作分组下拉、联调数据需求、依赖版本锚；v0.2：8 维自检修复——4🔴+8🟡 全修：端点权限/归属对齐源码（`POST /api/namespaces`=ASSET_ADMIN、`canManageAsset`=`assets/manage.ts`）、§6.1 与 §6.3 的 diff 表述矛盾消除、`/admin/reviews` 入口改「任何登录 + 按角色渲染 tab」（撤回入口随之可达）、注册显式 out、术语与线框/契约对齐、测试影响面补全；v0.1：初稿——立项对齐产物：范围拍板 R1-R9 + R6/R6-a/R6-b 缺口处置（含实证）+ clawhub.ai 官方契约 / 21-skillhub 源码双对标）
> Status: ⏸ **搁置（2026-09-10）**——M4-pre 扁平化重构（`docs/designs/2026-09-10-flat-model-refactor-design.md`）已定：角色 4 档单值 · 空间整体删除 · 可见性删除 · 权限码归零。本文档**已被作废的章节**：`platformRoles` 契约（R5 / §6 接口 / §4 AuthProvider）、空间管理条目、侧栏按 `platformRoles` 显隐——待 M4-pre **S4（T13）** 按新模型重写为 v1.0 后再实施（未定稿前不写实现）。
> Status（原）: 草稿（v0.3：8 维自检修复 + M4a 范本对标补全完成，待重评 ≥9 + grilling → 用户批准定稿）
> Scope: M4b（00 §5）——管理与治理后台：审核队列 · 标签管理 · 资产生命周期 · 空间管理 · 令牌 · 审计浏览；真实登录与会话（RBAC 感知）；zh/en 双语；复用 M4a 组件基建
> 引用链：本文档 → 规范 00 §5/§7 · 05 §3/§6 · 06 §5 · 07 全 · 08 §5/§7（引用不复制，字段与规则以规范为准）

## 1. 背景与文档定位

M4a 市场门户已收官（2026-09-09：portal design v0.8 定稿落地，T1-T19 全绿 538 tests，
dogfood 记录 `docs/smoke/2026-09-09-m4a-t18.md`）。00 §5 将 M4 拆为两子里程碑：
M4a 消费者视角公开门户（已交付）→ **M4b 管理后台**（本文档），复用 M4a 组件基建。

**前置已就绪（代码实证，非文档推断）**：

- 服务端治理端点已由 M3 全量铺完（审核/标签/生命周期/空间/令牌/审计——§7.1 逐端点实测表），
  M4b 以**消费既有端点为主体**，仅补 2 处缺口（§7.2）
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
  `archived`/`visibility`/`admin` 在整份契约中**零出现**

## 2. 里程碑范围（拍板表）

### 2.1 拍板结果（R1-R9 + R6 衍生，全部已确认）

| # | 议题 | 拍板结果 |
|---|------|---------|
| R1 | 范围档位 | **档 B**：治理闭环（审核/标签/生命周期/审计）+ 运营面（空间管理/令牌/我的资产与提交），另加认证地基 |
| R2 | 发布/上传流 | **不入首期**（后端端点已齐 `POST /api/assets` + `POST .../versions`；前端 multipart/进度/校验映射基建会稀释治理闭环收敛，单列后置） |
| R3 | 用户管理（USER_ADMIN） | **不入首期**（服务端零 HTTP 面：`UserService` 仅 register/localLogin；对标 skillhub 该面为完整独立 admin 板块，需独立里程碑） |
| R4 | 登录方式 | 本地账号密码（LDAP 复用同一密码通道，05 §3.1）+ 登出；OIDC 仅保留入口跳转（服务端授权码流已就绪） |
| R5 | 权限感知 | 扩展 `GET /api/auth/me` → 增 `platformRoles`（改一处、向后兼容） |
| R6 | 非 ACTIVE 资产的发现与恢复 | **新增「我可管理的资产」读面**（§7.2 R6）——公开面 `GET /api/assets` 与写面端点**零改动** |
| R6-a | 非 ACTIVE 可见性范围 | **owner / 空间 ADMIN/OWNER / 超管**可见自己管理域内的 HIDDEN/ARCHIVED 资产（比 skillhub 宽松：AIH 的 owner 本身就有隐藏权，05 §6.5 命名空间角色为权限主轴） |
| R6-b | 详情面 | **同步放宽**（R6-a 授权集）：HIDDEN/ARCHIVED 资产详情对该授权集可读；授权集之外仍 404 不泄露存在性（§7.2 R6-b） |
| R7 | 壳与入口 | `/admin/*` 独立路由段 + **复用 AppShell**；SideNav 按 `platformRoles` 显隐「管理」组 |
| R8 | 品牌显示名 | **沿用 M4a 现状「AI X Hub」**（TopBar/Hero 已用；00 §3 D2 正式定名仍待决议，不阻塞 M4b） |
| R9 | 视觉与验证 | **精简版**：tokens 沿用 M4a；仅对管理后台特有形态（数据表格/表单/抽屉/危险操作确认）出风格板 + 交互 demo；不做三变体 sketch |

### 2.2 M4b 边界

**In（档 B）**：

- 认证与会话：登录页（本地+LDAP）/ 登出 / 会话上下文 / 401 拦截 / 角色感知（R5）
- 审核队列：队列列表（status 过滤）+ 审核详情（版本内容预览）+ 通过/拒绝（comment）+ 撤回
- 标签管理：定义 CRUD + 多语言翻译 + 两级树 + 排序 + 上限提示（SUPER_ADMIN 面）
- 资产生命周期：我可管理的资产列表（状态筛选）+ 可见性/状态治理 + 版本管理（yank/删除）+
  资产删除 + 标签挂载
- 空间管理：空间列表/创建 + 状态治理（超管）+ 成员管理（增删/角色）+ OWNER 转让
- 令牌管理：签发（scope/有效期，明文一次展示）/ 列表 / 吊销
- 审计浏览：日志列表 + 八维过滤
- i18n：新增 `admin` / `review` 资源组（07 §3）
- 服务端最小支撑：R5（`/me` 扩展）+ R6（`/api/me/assets` 新增）+ R6-b（读面授权集扩）

**Out（后置，不混入）**：自助注册入口（服务端 `POST /api/auth/register` 存在，但
`REGISTRATION_ENABLED` 开关**无公开端点暴露**→ 前端无法感知注册是否开启；企业自托管默认
关闭注册、由管理员建号（seed / 用户管理面）；若需开放自助注册，须一并新增开关暴露端点，
属后置议题）· 资产发布/上传流（R2）· 用户管理面（R3）· 提升申请
（`promotion:approve` 码已种、端点与 `promotion_request` 表均未建，08 §9 定义随服务引入）·
排序切换/社交面（M4a 已 out）· 安全扫描面（AIH 版本态 SCANNING 为扫描扩展点，
clawhub 的 scan/moderation 面为独立议题）· 自定义版本通道 stable/beta（M3 明确后置）

## 3. 认证与会话（R4/R5）

### 3.1 登录页

- 路由 `/login`，独立于 AppShell 的居中版式（复用 tokens：玻璃卡 + 品牌渐变标题）
- 通道：本地账号密码（`POST /api/auth/login`）——LDAP 企业通道经同一密码路径解析
  （05 §3.1：保留账号短路 → LDAP bind → 回退本地），前端**无需分支**
- OIDC：`GET /api/auth/oidc/authorize` 入口跳转（服务端授权码流已落地 M1 阶段二）
- 错误码本地化：`auth.*` 系列入 `errors` 资源组（07 §4）
- CSRF：写请求携 Origin（服务端 `csrfProtection` 中间件，M1 已配）

### 3.2 会话上下文

- 新增 `AuthProvider`（web 层）：应用启动拉 `GET /api/auth/me` → 注入 `{user, platformRoles}`
- 未登录（401）→ 受保护路由重定向 `/login?next=<path>`；登录成功后回落 `next`
- 登出：`POST /api/auth/logout` → 清上下文 + 回首页
- 会话有效期：服务端 8h（05 §5），过期由任意请求 401 触发重定向

### 3.3 权限感知（R5 契约）

```
GET /api/auth/me     （requireAuth 语义不变——未登录仍 401 auth.session_expired）
  200 { user: { id, displayName }, platformRoles: string[] }
       platformRoles ⊆ {SUPER_ADMIN, ASSET_ADMIN, USER_ADMIN, AUDITOR}
       **顺序不作契约**（前端按集合成员判断，不依赖下标/顺序）；空数组 = 无平台角色
```

- 向后兼容：既有字段 `user` 形状不变，仅增字段（M4a 门户未消费 `/me`，零影响）
- 命名空间角色不进首期（按需在空间详情页单独拉 `GET /api/namespaces/:id` 的 `myRole`）

## 4. 管理入口与显隐规则

SideNav 新增「管理」分组，条目按 `platformRoles` 过滤（无平台角色时不渲染整个分组）：

| 入口 | 可见条件 |
|------|---------|
| 审核与提交 `/admin/reviews` | **任何登录用户**（页面内按角色渲染 tab：审核面见「待审核」，所有人见「我提交的」——`GET /api/reviews/mine` 是身份面 `requireAuth`，任何登录者都有；撤回入口在此 tab） |
| 标签管理 `/admin/labels` | `SUPER_ADMIN` |
| 资产管理 `/admin/assets` | 任何登录用户（「我可管理的资产」为空时显示空态引导） |
| 空间管理 `/admin/namespaces` | 任何登录用户（列表按可见性；创建/治理按钮按 `myRole`/`platformRoles` 显隐） |
| 令牌 `/admin/tokens` | 任何登录用户 |
| 审计 `/admin/audit` | `AUDITOR` ∨ `SUPER_ADMIN` |

顶栏：未登录显示「登录」（沿用 M4a 占位位置）；已登录显示用户菜单（displayName + 登出）。

> 显隐是**体验优化**而非安全边界——所有判定以服务端权限为准（服务端已全量覆盖，§7.1）。

## 5. 页面结构与路由（R7）

```text
/login                       登录（独立版式）
/admin                       概览：待审核数 / 我的资产计数 / 最近审计（角色感知卡片）
/admin/reviews               审核与提交：tab「待审核」（平台审核面为全局队列；空间 ADMIN/OWNER
                             以 `?ns=<slug>` 查看本空间队列）· tab「我提交的」
                             （所有登录用户；行内「撤回」= 提交人本人）
/admin/reviews/:id           审核详情：版本内容预览 + 通过/拒绝/撤回
/admin/assets                资产管理：我的资产（owner 视角）+ 状态筛选 + 行内动作 + 抽屉
/admin/labels                标签管理：两级树 + 编辑 + 翻译 + 排序
/admin/namespaces            空间列表 + 创建
/admin/namespaces/:id        空间详情：成员管理 + 角色分配 + OWNER 转让 + 状态治理（超管）
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
│   ├── AuthProvider.tsx       /me 上下文 + 401 拦截 + login/logout
│   └── RequireAuth.tsx        路由守卫（未登录 → /login?next=）
├── api/                       新增 admin.ts（ep 分组）+ 既有 client 复用
│   └── admin.ts               me/assets · reviews · labels · namespaces · tokens · audit
├── hooks/useAdminQuery.ts     新增：admin 页 URL query ↔ 状态（分页/筛选）
├── components/admin/          新增
│   ├── AdminPage.tsx          页头（标题 + 副述 + 右侧动作槽）
│   ├── DataTable.tsx          通用表格（列定义驱动 + 空/载/错态 + 行内动作槽）
│   ├── Drawer.tsx             右侧抽屉（玻璃卡 + 遮罩 blur——复用 FilePreviewDialog 版式纪律）
│   ├── ConfirmDialog.tsx      危险操作确认（HIDDEN/ARCHIVED/删除/yank 前）
│   ├── StatusPill.tsx         资产/版本/空间状态徽章（色值复用 M4a 类型色体系）
│   ├── FilterBar.tsx          筛选条（状态下拉 + 关键词 + 命名空间）
│   ├── Toaster.tsx            轻提示（写操作成功/失败反馈——§9；全局单例挂 App）
│   ├── SkeletonLoader.tsx     表格/详情载态骨架（管理面高频列表——优于 Spin 空屏）
│   ├── RoleGuard.tsx          角色级守卫（RequireAuth 之上叠加 platformRoles 判定，§4 显隐的服务端对齐版）
│   ├── CopyButton.tsx         复制（令牌明文/资产坐标/sha——明文场景关闭即清）
│   ├── reviews/               ReviewQueue.tsx · ReviewDetail.tsx · ReviewActions.tsx
│   ├── labels/                LabelTree.tsx · LabelForm.tsx · LabelTranslations.tsx
│   ├── assets/                AssetAdminTable.tsx · AssetDrawer.tsx · AssetVersionList.tsx
│   ├── namespaces/            NamespaceTable.tsx · NamespaceMembers.tsx · NamespaceForm.tsx
│   ├── tokens/                TokenTable.tsx · TokenIssueDialog.tsx · TokenRevealDialog.tsx
│   └── audit/                 AuditTable.tsx · AuditFilters.tsx · AuditActionSelect.tsx
│                              （action 过滤用**分组下拉**而非自由输入——防拼错；值清单见 §7.3）
└── pages/admin/               路由页（薄装配：AdminOverview/Reviews/ReviewDetail/Assets/
                               Labels/Namespaces/NamespaceDetail/Tokens/Audit）
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

9 路由 + ~27 新组件 + 1 hook + 1 provider + 2 i18n 资源组 ≈ 2800-3400 行（含样式），
单文件 ≤200 行。

## 7. API 消费面

### 7.1 复用端点实测契约表（全部经源码核对，2026-09-10）

| 功能 | 端点 | 权限 | 关键响应形状 |
|------|------|------|-------------|
| 审核队列 | `GET /api/reviews?status=&namespaceSlug=&limit=&offset=` | `review:approve`（平台审核员全局；否则须带 `namespaceSlug` + 空间 ADMIN/OWNER，缺则 403 `review.access_denied`） | `{items:[{taskId,status,reviewVersion,submittedBy,submittedAt,namespaceSlug,assetSlug,assetVersion,versionStatus,versionId}],total,limit,offset}` |
| 我的提交 | `GET /api/reviews/mine?status=&limit=&offset=` | 登录（身份面） | 同上 items 形状 |
| 审核详情 | `GET /api/reviews/:id` | 审核面 ∨ 提交人本人（否则 403 `review.access_denied`；不存在 404 `review.not_found`） | `ReviewListItem + {manifestJson, files:[{filePath,fileSize,sha256}]}` |
| 通过/拒绝 | `POST /api/reviews/:id/approve`（`{comment?}`）/ `POST /:id/reject`（`{comment}` 必填） | `review:approve` + 防自审（05 §6.4，超管例外） | 服务统一 `{code,message}` 错误面 |
| 撤回提审 | `POST /api/reviews/:id/withdraw` | 提交人本人 / owner / 空间 ADMIN/OWNER | 同上 |
| 标签全量 | `GET /api/labels/all` | `SUPER_ADMIN` | `ManagedLabel[]`：`{id,slug,type,visibleInFilter,sortOrder,parentId(父 slug),translations:[{locale,displayName}]}` |
| 标签 CRUD | `POST /api/labels` · `PATCH /api/labels/:slug` · `DELETE /api/labels/:slug` | `SUPER_ADMIN` | 同上单条；删除带子级 → `label.parent.has_children` |
| 标签排序 | `PUT /api/labels/order` | `SUPER_ADMIN` | 204 |
| 标签挂载 | `PUT`/`DELETE /api/assets/:ns/:slug/labels/:labelSlug` | RECOMMENDED = owner/空间 ADMIN+/超管；PRIVILEGED = 超管 | 幂等（重复挂 200 / 移除不存在 204）；≤10 → `label.limit_exceeded` |
| 空间列表 | `GET /api/namespaces?type=&limit=&offset=` | 登录 | `{items:[{id,slug,displayName,description,type,status,memberCount,myRole}],total,...}`——**可见性已含「我成员的非 ACTIVE 空间」**（`visibleWhere`） |
| 创建空间 | `POST /api/namespaces` | **`ASSET_ADMIN` 平台角色**（源码 `requirePlatformRole(['ASSET_ADMIN'])`——TEAM 空间需 ASSET_ADMIN+，GLOBAL 空间仅 `SUPER_ADMIN`） | 201 单条；slug 冲突 409 |
| 空间详情/更新 | `GET`/`PATCH /api/namespaces/:id` | 详情 = 可见空间（成员/ACTIVE）；更新 = `namespace:manage`（空间 OWNER/ADMIN 或超管） | 单条 namespaceItem |
| 空间状态 | `PATCH /api/namespaces/:id/status` | `SUPER_ADMIN` | ACTIVE/FROZEN/ARCHIVED |
| 成员管理 | `GET`/`POST /api/namespaces/:id/members` · `DELETE /:id/members/:userId` | `namespace:manage`（OWNER/ADMIN；OWNER 不可经添加产生） | `{items:[{userId,role,joinedAt,displayName}],total}` |
| OWNER 转让 | `POST /api/namespaces/:id/transfer-ownership`（`{newOwnerId}`） | 当前 OWNER | 原 OWNER 自动降 ADMIN |
| 令牌列表 | `GET /api/tokens` | 登录（仅本人） | `{items:[{id,scope,expiresAt,revokedAt,createdAt}]}`（库中仅 sha256，无掩码字段） |
| 令牌签发 | `POST /api/tokens`（`{scope?:string[], expiresInDays?}`） | 登录 | 201 `{id,token,expiresAt}`——**明文仅此一次** |
| 令牌吊销 | `DELETE /api/tokens/:id` | 本人 ∨ `SUPER_ADMIN`；幂等 204；他人 token 视同 404 防枚举 | 204 |
| 审计 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=&limit=&offset=` | `audit:read`（`AUDITOR`/`SUPER_ADMIN`） | `{items:[audit_log 全列],total,limit,offset}`，createdAt desc + id desc 稳定分页 |
| 资产详情/版本 | `GET /api/assets/:ns/:slug` · `.../versions` · `.../versions/:version` · `.../files/*` | 按 08 §7 读面分治 | 见 M4a design §5；**版本列表项**：`{id,version,status,fileCount,totalSize,changelog,createdAt}` |
| 可见性/状态治理 | `PATCH /api/assets/:ns/:slug`（`{visibility}`）· `PATCH .../status`（`{status}`） | `asset:manage`（owner ∨ 空间 ADMIN+ ∨ 超管；空间非 ACTIVE 拒写） | 单条 assetItem |
| 版本撤回/删除 | `POST .../versions/:version/yank`（`{reason}`）· `DELETE .../versions/:version` | yank = `ASSET_ADMIN`/`SUPER_ADMIN`；删除 = 上传者本人/owner/空间 ADMIN+ | 见 M3 design §9 |
| 资产删除 | `DELETE /api/assets/:ns/:slug` | `asset:manage`；有 PUBLISHED/YANKED → 400 `asset.has_yanked` | 204 |
| 登录/登出/当前用户 | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | — | me 形状见 §3.3（R5 扩展后） |

> 错误契约统一 `{code,message}`（07 §4）；前端 `errors` 资源表按 code 映射（未命中兜底）。

### 7.2 契约缺口与处置（R6 系列）

**缺口清单（G 段——呈请编号；对标 M4a design §5.1/§5.2 的「G 呈请 → R 处置」两段式）**：

| # | 缺口 | 处置 |
|---|------|------|
| G1 | 非 ACTIVE 资产不进任何列表（匿名/owner/超管一致——`listViewableAssets` 硬条件） | R6：新增「我可管理的资产」读面 |
| G2 | HIDDEN/ARCHIVED 详情对 owner 亦 404（授权者读不到自己的资产） | R6-b：读面授权集分层扩展 |
| G3 | 列表无 owner / status 过滤参数（`?ownerId`/`?owner`/`?status` 被 zod 静默忽略） | R6：新端点带 status 过滤；公开面契约不动 |
| G4 | 前端无从感知平台角色（`/me` 仅返回 id/displayName） | R5：`/me` 增 `platformRoles` |

**缺口实证（2026-09-10，真 PG + 真路由探针 9/9 通过，跑完即删）**：

- 列表面：`listViewableAssets` 硬编码 `ns.status='ACTIVE' AND asset.status='ACTIVE'`
  → HIDDEN/ARCHIVED 资产不进任何列表
- 详情面：`assertAssetReadable` 在超管短路后判定 `status !== 'ACTIVE' → 404 asset.not_found`
  → owner 本人亦 404（既有测试 `assets.test.ts:495` 已固化该行为）
- 过滤面：`listQuerySchema` 无 owner / status 参数（`?ownerId=`/`?owner=`/`?status=` 被静默忽略）
- 恢复通道**已存在**：`PATCH .../status` 走 `loadAssetBySlugs`（按坐标取，不判 status）+
  `assertManageable` → owner 可直接恢复，**无需先读详情**（探针实测 200）

**处置 R6：新增「我可管理的资产」读面**

```
GET /api/me/assets?status=ACTIVE|HIDDEN|ARCHIVED|ALL&ns=<slug>&q=<kw>&limit=&offset=
  （requireAuth；默认 status=ACTIVE、limit=20、offset=0）
  200 { items: AssetItem[], total, limit, offset }
```

- **集合语义** = 我可管理的资产（`canManageAsset`（`assets/manage.ts:20`）同源，05 §6.4/§6.5）：
  owner 本人 ∪ 我具 OWNER/ADMIN 的角色空间内资产 ∪（`SUPER_ADMIN` → 全平台）
- **status 语义**：`ACTIVE` 正常活跃面；`HIDDEN`/`ARCHIVED`/`ALL` 返回授权集合内的对应状态
  （同一集合内按 status 过滤，无额外权限分支——授权已在集合层收敛）
- 响应项复用既有 `assetItem` 形状（含 R5/R6 注入的 `latestVersion`/`latestName`/
  `latestDescription`/`ownerDisplayName`）——前端表格零适配
- **公开面 `GET /api/assets` 零改动**（对标 skillhub：公开搜索面保持无 status 参数的干净契约）
- **内部一致性论据**：namespaces 列表已是同款模式——`visibleWhere` = 「ACTIVE 全量 ∪
  我成员的非 ACTIVE」（`http/namespaces.ts`），R6 是同一可见性纪律在资产侧的落地

**处置 R6-b：读面授权集扩展（详情面）**

- `assertAssetReadable` 的 `status !== 'ACTIVE' → 404` 改为**授权集分层**：
  非 ACTIVE 时，若 viewer ∈ {owner 本人，该空间 ADMIN/OWNER，SUPER_ADMIN} → 放行；
  其余（含匿名、其他用户）**维持 404**（不泄露存在性对"外部人"依然成立）
- 同时作用于该端点族：`GET /api/assets/:ns/:slug` · `.../versions` · `.../versions/:version` ·
  `.../files/*` · `.../download` · `.../versions/compare`（同一 `assertAssetReadable` 前置链，
  单点修改全体生效；下载面沿用 YANKED 400 等既有语义）
- **测试影响（需同步更新，属需求变更驱动而非弱化契约——共 2 处断言）**：
  · `assets.test.ts:495`「HIDDEN 资产：登录用户 404；SUPER_ADMIN 200」——该用例的"登录用户"
    正是 owner，断言按新授权集更新为「owner 200 / 非授权登录用户 404 / 匿名 404」
  · `assets.test.ts:990` 段（`:1000-1006`）「owner 状态治理 → HIDDEN 后 owner 亦不可读」——
    同一授权集更新
  · **新增对照断言**：空间 ADMIN 与 outsider 两档（授权集全覆盖）
  · **不受影响**：`stats.test.ts:84`（HIDDEN 资产不计入公开统计——公开聚合语义未变）

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
  （防自由输入拼错），值清单 = 服务端现有 31 个（按域前缀分组）：
  · `asset.*`（10）：register · delete · visibility_update · status_update · version_upload ·
    version_submit · version_delete · version_yank · label_attach · label_detach
  · `review.*`（3）：approve · reject · withdraw
  · `label.*`（4）：create · update · delete · reorder
  · `namespace.*`（5）：create · status_change · member_add · member_remove · transfer_ownership
  · `auth.*`（4）：login.success · login.failed · logout · register
  · `token.*`（2）：issue · revoke　· `device.*`（2）：approve · token_issued　· `oidc.*`（1）：provisioned
  （清单源为 server 侧 `action` 字面量；新增 action 需同步前端常量——集中化登记见 §14）
- **实现期联调数据需求（dogfood）**：多角色（`SUPER_ADMIN` / `ASSET_ADMIN` / 空间 ADMIN /
  普通 MEMBER）+ 各状态资产（ACTIVE / HIDDEN / ARCHIVED）+ 三族各至少一条 + 待审任务
  + 两级标签树 + 一个 FROZEN 空间——seed 直插（沿用 M4a T18 模式，前缀 like 清理）

## 8. 接口变更总览（服务端面）

| # | 变更 | 端点/位置 | 说明 |
|---|------|----------|------|
| R5 | 扩展 | `GET /api/auth/me` | 增 `platformRoles: string[]`（既有 `user` 字段不变，向后兼容） |
| R6 | 新增 | `GET /api/me/assets` | 「我可管理的资产」读面（§7.2 契约）；公开面零改动 |
| R6-b | 修改 | `assertAssetReadable` 授权集 | 非 ACTIVE 详情/版本/文件/下载面：授权集（owner/空间 ADMIN·OWNER/超管）放行，其余仍 404 |

均落 server + 补测试（538 基线 + 新用例）；实现细则归 M4b plan。

## 9. 数据获取与状态约定

沿用 M4a（design §7）并补充管理面约束：

- `useApi` 三态 + abort + 语言感知 Map 缓存（键含 lang）
- 分页：**offset 替换式**（管理表格无跨页选中需求）；筛选/搜索变更 → `page` 回落 1
- 危险操作（HIDDEN/ARCHIVED/删除/yank/吊销/转让）→ **ConfirmDialog 二次确认**，
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

**管理后台特有形态（视觉环节补规格——v0.3+ 待补清单）**：

- 数据表格：表头 12/600 灰、行 13/1.6、hover 浅蓝底、状态列右对齐 `tabular-nums`、
  载态用 `SkeletonLoader` 行占位
- 表单控件：输入框玻璃底 + 聚焦蓝边；`Select` 下拉（筛选 / 分组枚举）形态对齐 skillhub
- 右侧抽屉：宽 560px、遮罩 blur3、头部标题 + 关闭；窄屏全宽侧滑
- 危险操作：确认对话框 + 红系 `#cf222e` 语义色（取自 M4a diff tokens 的删除色，色系一致性）
- **待补**：新增状态色号入 `tokens.css`（资产三态 ACTIVE 绿 / HIDDEN 琥珀 / ARCHIVED 灰、
  版本八态、空间三态的正式色值）——视觉环节定档
- 空/载/错三态沿用 `ui/EmptyState|Spinner|ErrorState`（表格另用 `SkeletonLoader`）

### 10.2 信息架构与交互要点

- **审核详情**是核心工作台：左主列 = manifest 摘要卡 + 文件树（`ui/FileTree`）+
  文件预览对话框；右栏 = task 元信息（坐标/版本/提交人/时间）+ 动作区（通过/拒绝/撤回）
  - **manifest 卡按 type 分型（三族适用性——M4a T15 实证的族协议差异）**：skill 族主文档
    `SKILL.md`（必需）；mcp 族 `mcp.json` / `README.md`（可选）；agent 族 `agent.md` /
    `README.md`（可选）——复用 M4a `OverviewTab` 的分型探测与回退逻辑（大小写归一 + 缺失
    回退结构化摘要），审核人看到的摘要形态随类型自适应，不空窗
- **资产管理抽屉**：可见性切换 + 状态治理（含恢复）+ 标签挂载 + 版本列表（yank/删除）+
  危险区（删除资产，说明"有已发布/已撤回版本时不可删除"）
- **状态语义可视化**：`StatusPill` 统一呈现资产三态（ACTIVE 绿 / HIDDEN 琥珀 / ARCHIVED 灰）、
  版本八态、空间三态——色系复用 M4a（新增行补入 tokens）
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
│  ▤ 概览  ⚖审核  ◫资产  ⌗标签  ⬡空间  ⛁令牌  ☰审计     │
├────────────────────────────────────────────────────────┤
│ 管理概览                                                │
│ ┌待审核────┐┌我的资产──┐┌最近审计──────────────┐      │
│ │    3     ││   12     ││ user.login            │      │
│ │ 待处理   ││ 含2隐藏  ││ asset.status_update   │      │
│ │ [去处理] ││ [去管理] ││ asset.version_yank    │      │
│ └──────────┘└──────────┘└───────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

审核详情（核心工作台）：

```text
│ 首页 / 审核队列 / #1024                                 │
│ @global/langgraph-rag  v1.3.2   提交人 林晓峰·882015     │
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

资产管理（含状态筛选与恢复）：

```text
│ 资产管理                        [状态: 全部▾] [🔍 搜索]  │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标             类型 可见性  状态    版本  更新  动作 ││
│ │ @global/rag-skill skill PUBLIC  ●ACTIVE 1.3.2 09-09 ⋯ ││
│ │ @global/old-tool  mcp  PUBLIC  ●HIDDEN  0.9.0 08-21 ⋯ ││
│ │ @team/x-agent    agent PRIVATE ●ARCHIVED 2.1.0 07-30 ⋯││
│ └──────────────────────────────────────────────────────┘│
│ 行内 ⋯ → [恢复 ACTIVE][归档][删除][标签挂载]             │
└──────────────────────────────────────────────────────────┘
```

（审核/标签/空间/令牌/审计页线框随视觉环节（v0.2+）bump 补充——本版 §12 覆盖主工作流）

## 13. 引用文件清单

- 规范：00 §2/§5/§7 · 05 §3/§5/§6 · 06 §3/§5 · 07 全 · 08 §5/§7
- 服务端（消费与改动）：`apps/server/src/http/assets.ts`（`assertAssetReadable`、
  `listQuerySchema`、管理端点族）· `assets/service.ts`（`listViewableAssets`）·
  `assets/manage.ts`（`canManageAsset`）· `assets/visibility.ts`（`canViewAsset`）·
  `http/reviews.ts` + `review/query.ts` · `http/labels.ts` +
  `labels/service.ts` · `http/namespaces.ts` · `http/tokens.ts` · `http/audit.ts` +
  `audit/query.ts` · `auth/routes.ts` · `auth/rbac.ts` · `auth/permissions.ts`
- 前端（复用与新增）：`apps/web/src/components/ui/`（AppShell/TopBar/SideNav/FileTree/
  FilePreviewDialog/MarkdownRenderer/AssetAvatar/Badge/Pagination/Spinner/EmptyState/ErrorState）·
  `market/detail/`（FileTree/FilePreviewDialog 迁 ui/）· `i18n/`（I18nProvider/lang/zh/en）·
  `hooks/useApi.ts` · `styles/tokens.css`
- 被更新测试：`apps/server/src/http/assets.test.ts`（:495 授权集断言——R6-b）
- 对标源：`/Users/xuewensun/04-ws/21-skillhub`（MeController / MySkillAppService /
  controller/admin/* / web/src/pages/dashboard/my-skill-filters.ts）·
  `https://clawhub.ai/api/v1/openapi.json`（2026-09-10 实测，27 端点）
- 视觉参照（公开）：skillhub 管理面——`21-skillhub/web/src/pages/admin/{audit-log,labels,users}.tsx`
  + `shared/ui/*`（shadcn 风格 Table/Card/Select/Input/Button）· `shared/components/`
  （confirm-dialog/pagination/empty-state/skeleton-loader/toaster/dashboard-page-header/role-guard/copy-button）
  ——**形态参照**；视觉皮肤仍为 M4a tokens
- 图标：lucide（ISC，沿用 M4a）
- 评审物料（不进仓）：视觉环节风格板与交互 demo（R9 精简版，随 v0.3+ bump）

## 14. 规范同步项

| 规范 | 同步内容 | 时点 |
|------|---------|------|
| 05 §6.4 | R6-b 读面授权集扩展注记（非 ACTIVE 资产详情：owner/空间 ADMIN·OWNER/超管可读） | M4b 收尾 |
| 08 §7 | ① 读面可见性补注（授权集，与 R6-b 一致）；② **ARCHIVED 语义补实**——当前仅有名称，与 HIDDEN 判定同构（`status !== 'ACTIVE'`），建议写明「HIDDEN = 临时下架/可恢复；ARCHIVED = 长期退役/停止维护」的运营语义分界 | M4b 收尾 |
| 07 §3 | `admin`/`review` 资源组落地注记 | M4b 收尾 |
| 00 §5 | M4b 行完成注记 | M4b 收尾 |
| （后置·非规范） | **审计动作常量集中化**：`audit_log.action` 现为 server 侧散落字面量（31 个），前端过滤清单靠同步维护；建议抽为共享常量（对齐 `auth/permissions.ts` 的 `PERMISSIONS` 模式），消除漂移 | M6 或按需 |

> ARCHIVED 语义补实的依据：clawhub 契约**无 archive 概念**（`archived` 零出现），
> skillhub 的 `SkillStatus.ARCHIVED` 语义分界亦弱——AIH 保留三态（改枚举代价 > 收益），
> 但应在规范层写实差异，消除"两个状态行为完全一致"的规范空白。

## 15. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-10 | sunxuewen-rush | 初稿：立项对齐产物——范围拍板 R1-R9（档 B/发布流后置/用户管理后置/本地+LDAP 登录/`/me` 补角色/`/admin/*` 复用壳/品牌沿用/精简视觉流程）；R6 缺口实证（探针 9/9）与处置（新增 `GET /api/me/assets` + 详情面授权集放宽 R6-b）；对标 21-skillhub 源码（admin 面/MeController filter 枚举/HIDDEN 超管校验）与 clawhub.ai 官方契约（无 hide/archive，soft delete + moderation 轴） |
| v0.2 | 2026-09-10 | sunxuewen-rush | 8 维自检修复（8.6 → 重评）：🔴4 + 🟡8 全修——① `POST /api/namespaces` 权限对齐源码（`ASSET_ADMIN` 平台角色，非 asset:publish）② `canManageAsset` 归属修正（`assets/manage.ts`）③ §6.1 依赖段与 §6.3 的 diff 表述矛盾消除（明确不引入 diff 依赖、组件群不迁移）④ `/admin/reviews` 入口改「任何登录用户 + 按角色渲染 tab」，消除 `reviews/mine`（`requireAuth`）与入口条件（`ASSET_ADMIN`）的矛盾（撤回入口随之可达）；自助注册显式 out（含 `REGISTRATION_ENABLED` 无公开端点的影响说明）；术语统一（待审核）与线框/契约对齐（概览 `status=ALL`）；`platformRoles` 顺序不作契约；FileTree 迁移影响面说明（`FilesTab.tsx` import）；测试影响面补全（`:495` + `:990` 段两处）；拼写修正 |
| v0.3 | 2026-09-10 | sunxuewen-rush | M4a 范本对标补全（学 M4a design 12 段 + 6 特质后回查缺口，11 项全补）：① **视觉参照三元组**（气质=M4a tokens / 形态=skillhub 管理面公开源 / 图标=lucide ISC——用户拍板）；② **三族适用性**（审核详情 manifest 卡按 type 分型，复用 M4a `OverviewTab` 分型探测）；③ 响应式断点（表格 <1100px 横向滚动 / 抽屉全宽 / 侧栏 <900px 图标态）；④ 组件补件（`Toaster`/`SkeletonLoader`/`RoleGuard`/`CopyButton`/`AuditActionSelect`——skillhub `shared/components` 对标发现）；⑤ 缺口 **G 段呈请编号**（G1-G4 → R5/R6/R6-b 两段式）；⑥ 审计页 8 过滤器全暴露 + **31 个 action 分组下拉**（清单列全，集中化登记 §14）；⑦ 联调数据需求（多角色/各状态/三族/FROZEN 空间）；⑧ 依赖版本锚；⑨ 关键空/错态文案示例；⑩ 评审物料时点修正；⑪ 规模预估更新（~27 组件） |
| ⏸ 搁置 | 2026-09-10 | sunxuewen-rush | 因 **M4-pre 扁平化重构**搁置（用户 2026-09-10 拍板）：角色改 4 档单值（`user_account.role`）、空间整体删除、可见性删除、权限码归零 → 本文档 `platformRoles` 契约（R5/§6/§4）与空间管理章节**作废**；待 M4-pre S4（T13）按新模型重写为 v1.0。搁置前的 8 维 9.4 评价对其余章节（审核队列/标签/资产/令牌/审计 + 视觉体系）仍有效 |
