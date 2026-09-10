# M4-pre 扁平化重构设计（角色 4 档 · 无空间 · 无可见性）

> Date: 2026-09-10
> Updated: 2026-09-10（v0.3：S1 执行偏离回写（D1 `can()` 过渡态保留 / D2 新增 `auth/token-scopes.ts` / D3 `global` 空间种子时点归 S2）——落地于 §2.1 R4 · §3 · §4.1 · §7 S1；**深度档四轮审查补正**（F3 §11 引用清单补 3 项 + 迁移文件行 · F4 `roleOf` 主入口口径 · F5 §3/§7 测试数字改实测 15 · F6 §7 S1 过渡语义注 · **F8/F9 §6 测试策略 15 个 + `can()` 过渡态非「语义消失」 · F10 §3/§5 迁移拆 0005/0006/0007 · F15 §3/§10 删除列数 2→3**）；v0.2：grilling Round 1 闭环（P1-P7）+ 00 多租户表述逐行定位（§12 落实到行）+ 迁移冲突/赋权途径/回归范围落定；v0.1：初稿——立项对齐产物：J1-J3 拍板 + 全链路影响实扫（14 服务端源文件 / 39 空间判定点 / 10 前端文件 / 4 schema 表）+ 六拍板项 R1-R6）
> Status: **定稿**（v0.3 · 2026-09-10 用户批准：8 维自检 9.3 ≥9 + grilling Round 1（P1-P7）闭环；v0.3 为 S1 执行偏离回写，**拍板语义不变**）
> Scope: M4-pre（M4b 前置重构）——平台权限模型扁平化：角色 4 档线性 · 空间概念整体删除 · 可见性整体删除 · 坐标改裸 slug
> 引用链：本文档 → 规范 01 §3.3 · 05 §6 · 08 §4/§5/§7 · 00 §2.2/§3（引用不复制）；M4b design 待本重构后按新模型重写

## 1. 背景与文档定位

### 1.1 触发与决策链

M4b（管理后台）立项对齐过程中，用户提出「**角色太复杂**」的判断，经三轮对标与逐级拍板，
最终决定**彻底扁平化**（理由：AIH 是开源项目，简洁的模型对社区贡献者友好）：

| 轮次 | 议题 | 结论 |
|------|------|------|
| 对标 | 21-skillhub（双轴 RBAC + 空间自治）· clawhub.ai（**无空间、无可见性、无角色分权**，扁平个人注册中心）| 三系统对比表见 §2.4 |
| 决策 | 角色模型 | **只保留 4 档线性**：未登录 / 用户 / 管理 / 超管（J1） |
| 决策 | 空间概念 | **彻底删除**（表/列/端点/坐标维度全删）（J1、J2） |
| 决策 | 可见性 | **只保留 PUBLIC**，字段与判定整体删除（F2 升级） |
| 决策 | 权限码 | **整体删除**（10 码 + 3 张权限表） |
| 决策 | 坐标 | `@namespace/slug` → **裸 `slug`**（全局唯一）（J2） |
| 决策 | 范围 | 作为 **M4-pre**（M4b 前置）独立实施，M4b 顺延（J3） |

### 1.2 为什么先做重构再做 M4b

M4b design v0.3 的角色/空间/可见性章节在本重构后**全部作废**；先重构可避免 design 写两遍，
且管理后台的显隐逻辑（`role >= N`）依赖新的 `/me` 契约。故本重构定名 **M4-pre**。

### 1.3 与 M4a 的关系（必须知晓）

M4a 已收官（538 tests 全绿）。本重构**会改动 M4a 的坐标链路**（前端 10 文件 + 路由 + 4 个 api 模块），
相关测试断言按新契约同步改写——属**需求变更驱动的测试更新**，非弱化契约（纪律见 §6）。

## 2. 目标模型（拍板表 R1-R6）

### 2.1 拍板结果

| # | 议题 | 拍板结果 |
|---|------|---------|
| R1 | 角色模型 | **4 档线性单值**：`0 未登录 GUEST` < `1 用户 USER` < `10 管理 ADMIN` < `100 超管 SUPER_ADMIN`；判定 `role >= N` |
| R2 | 空间 | **彻底删除**：`namespace`/`namespace_member` 表 · `asset.namespace_id`/`review_task.namespace_id` 列 · 9 个 HTTP 端点 · 5 个审计动作 · 坐标维度 |
| R3 | 可见性 | **彻底删除**：`asset.visibility` 列 · `assets/visibility.ts` 判定 · `PATCH /api/assets/:ns/:slug` 端点（所有资产公开） |
| R4 | 权限码 | **彻底删除**：10 个权限码 + `permission`/`role_permission` 表 + `user_role_binding` 表；`requirePermission`/`rbac.can` 判定链改角色层级（**执行注记见 §4.1 D1/D2**：`can()` 过渡态保留至 S2；token 凭证 scope 码迁入 `auth/token-scopes.ts`——scope ≠ 权限码，见 §3 注） |
| R5 | 坐标 | `@namespace/slug` → **裸 `slug`**，唯一键 `UNIQUE(slug)`（全局唯一）；`assets/:nsSlug/:slug` 路由 → `assets/:slug` |
| R6 | 存量迁移 | 从 `user_role_binding` **取最高档**回填 `user_account.role`（超管→100；ASSET_ADMIN/USER_ADMIN/AUDITOR→10） |

### 2.2 目标权限模型

```
【角色】唯一轴，单值层级（user_account.role SMALLINT NOT NULL DEFAULT 1）
  0    未登录  GUEST         匿名访问者（常量占位，不可分配）
  1    用户    USER          登录即得：浏览 · 下载 · 注册资产 · 管理自己的资产
  10   管理    ADMIN         平台管理全部：审核发布 · 标签管理 · 审计浏览 · 治理他人资产
  100  超管    SUPER_ADMIN   全权（角色分配 + 硬判定短路）

【判定】两层
  ① 平台能力    role >= N
  ② 资产所有权  asset.owner_id === viewer.userId（owner 管理自己的资产）
```

**权限对照表（05 §6.4 重写形态）**：

| 操作 | 判定 |
|------|------|
| 浏览 / 下载公开资产 | 未登录+（全部匿名可读） |
| 注册资产（含草稿版本上传） | `用户`+ |
| 管理自己的资产（状态/删除/版本 yank） | `owner 本人` 或 `管理`+ |
| 管理他人资产 | `管理`+ |
| 提交版本进审核 | `owner 本人` 或 `管理`+ |
| 审核发布（approve/reject） | `管理`+ |
| 撤回自己的提交（withdraw） | 提交人本人（业务例外，非权限码） |
| 标签定义管理 | `超管` |
| 审计浏览 | `管理`+ |
| 角色分配 | `超管` |
| Token 签发/吊销 | 本人（登录面） |

### 2.3 目标坐标与数据模型

```
坐标：<slug>（全局唯一，UNIQUE(slug)）
  · slug 规则不变（01 §3.3 slugSchema：`[a-z0-9]([a-z0-9-]*[a-z0-9])?`，1-64，无连续 `--`）
  · 资产表不再有 namespace 维度；跨类型唯一（skill/mcp/agent 不得同 slug）

asset 表（变更）
  删：namespace_id · visibility
  改：UNIQUE(namespace_id, slug) → UNIQUE(slug)
       index(namespace_id, status) → index(status)
  留：id · type · slug · owner_id · latest_version_id · status · download_count · 审计列

review_task 表（变更）
  删：namespace_id
  改：index(namespace_id, status) → index(status)

删除的表（6）
  namespace · namespace_member · role · permission · role_permission · user_role_binding
```

### 2.4 三系统定位对比（本重构后的相对位置）

| | clawhub | skillhub | **AIH（重构后）** |
|---|---------|----------|------------------|
| 命名空间 | ❌ 无 | ✅ 双轴（team/global） | ❌ **无**（对齐 clawhub） |
| 坐标 | `slug` | `@ns/slug` | **`slug`** |
| 可见性 | ❌ 无 | ✅ PUBLIC/… | ❌ **无** |
| 角色 | 4 档线性（Guest/User/Admin/SuperAdmin） | 多角色 + 空间角色 | **4 档线性**（对齐 clawhub 形态） |
| 治理 | moderation + soft delete | 审核 + 治理中心 | **审核 + 标签 + 审计 + 生命周期**（唯一差异化） |

→ 重构后 AIH 的差异化**收敛为一处**：**治理能力**（审核管线/标签体系/审计/资产生命周期），
   模型形态与 clawhub 同构（扁平 + 4 档角色 + 无空间）。

### 2.5 实施拍板（grilling Round 1 · P1-P7）

| # | 议题 | 拍板结果 |
|---|------|---------|
| P1 | 阶段划分 | **S1 → S2 → S3 → S4** 顺序执行；**S2 不拆分**（服务端与前端同期改，保坐标链路一致性） |
| P2 | 跨空间同名冲突 | 迁移**中止 + 输出冲突清单**，人工改名后重跑（资产身份是产品决策，脚本不代劳） |
| P3 | 超管/管理赋权途径 | 首期**不加 UI**：`SEED_ADMIN_*`（首管理员）+ 手工 SQL 改 `user_account.role`；M4b 不建用户管理页 |
| P4 | M4a 回归范围 | S2 完成后**全量重跑 M4a dogfood**（Edge headless，5 路由走查） |
| P5 | `role` 数值 | `0 / 1 / 10 / 100`（留插值空间，为将来可能的中间档铺路） |
| P6 | 迁移 down 策略 | **不做 down**（forward-only）；删表属破坏性 DDL，回退靠备份，避免"可安全回滚"的错觉 |
| P7 | 定稿节奏 | 先补 00 表述定位（§12 落实到行）→ 再进 S1 实现 |

## 3. 影响面总览（实扫量化）

| 类别 | 数量 | 明细 |
|------|:---:|------|
| 服务端源文件（引用 `namespaceId`） | **14**（含测试 33） | `assets/{service,stats,versions}.ts` · `auth/rbac.ts` · `db/schema/{assets,governance,namespaces}.ts` · `http/{assets,auth-middleware,namespaces,reviews}.ts` · `review/{query,service}.ts` · `storage/types.ts` |
| 空间角色判定点（`namespaceRole`/`namespaceMember`） | **39 处 / 9 文件** | `assets/{manage(2),visibility(5),service(8),version-read(3),download(2)}.ts` · `review/service.ts(6)` · `http/reviews.ts(3)` · `http/assets.ts(10)` |
| 前端文件（引用 `nsSlug`） | **10** | `main.tsx` 路由 · `api/{assets,versions,compare,content}.ts` · 5 个详情组件 |
| rbac 判定链 | `rbac.can` 调用点 12+ 处（含 `requirePermission` 内部） | `namespaces.ts`×3 · `assets.ts`×5 · `reviews.ts` · `audit.ts` |
| 中间件 | 2 个 | `requirePermission`（删，双职责拆分）· `requirePlatformRole` → **`requireRole(minRole, { scope? })`**（角色层级 + token scope 叠加）；细粒度 scope 点仍用 `assertTokenScoped` |
| schema 文件 | **4** | `assets.ts` · `governance.ts`（review_task）· `namespaces.ts`（删除）· `users.ts`（删 4 表 + 加 role 列） |
| HTTP 端点 | **删 10 个** | 9 个 `/api/namespaces/**` + `PATCH /api/assets/:ns/:slug` |
| 权限码（角色判定） | 10 → **0** | `auth/permissions.ts` 整文件删除。**执行注记 D2**：token 凭证 scope 码另立 `auth/token-scopes.ts`（5 码，取值与 M3 逐字一致 → 存量 `api_token.scope` 零迁移）——scope 是**凭证级**约束，与角色正交，不计入权限码 |
| 测试文件 | **15 改**（S1 实测；原估 21）+ **2 整删**（`namespaces.test.ts` 883 行 / `assets/visibility.test.ts`） | 约 1/3 测试集 |
| 规范 | 6+ 处 | 01 §3.3 · 05 §6.1/§6.2/§6.4/§6.5 · 08 §4/§5.1/§5.2/§7 · 00 §2.2/§3 相关行 |
| 迁移 | 新增 **3 个**（S1 `0005_flatten_role_model.sql` **已执行** · S2 `0006_*` · S3 `0007_*`） | 加 `role` 列 + 回填 + 删 6 表 + 删 **3 列**（asset 2 + review_task 1）+ 索引改（asset / review_task 各一组，详见 §5） |

## 4. 全链路改造清单

### 4.1 服务端

| 文件 | 改动 |
|------|------|
| `auth/rbac.ts` | **重写**：`roleOf(userId)` → 4 档（**主入口**——调用点统一 `(await roleOf(...)) ?? GUEST` 后比较，因多数点需 role 原值算 `isSuperAdmin`）+ `hasRole(minRole)`（便捷判定 API，当前仅测试消费）+ **删** `platformRolesOf()`/`NS_ROLE_*_PERMS`/`WRITE_PERMISSIONS`；保留 `isSelfReview`。**⚠️ 执行注记 D1**：`can()` 与 `getNamespaceRoles()` **保留为过渡态**——`can()` 内部耦合空间状态检查（FROZEN/ARCHIVED）与空间角色查询，S1 删除会连带动空间逻辑（属 S2 职责）从而破坏「板块绿点」。处置：平台侧改 `role >= ADMIN`（与旧实现**逐行核对等价**：旧 `platformPermissions.has(perm)` 与今 `role >= ADMIN` 同为空间状态检查前的短路），空间侧语义不变；**S2（T6）随空间一并删除**，代码内有 ⚠️ 过渡态警示注释 |
| `auth/permissions.ts` | **整文件删除**（角色判定权限码单源消失）。**执行注记 D2**：新增 `auth/token-scopes.ts`（5 码：`asset:publish`/`asset:manage`/`review:submit`/`review:approve`/`audit:read`）承载 token 凭证 scope 交集——原实现用权限码做交集，权限码删除后需替代落点；取值逐字一致故存量 token 零迁移 |
| `auth/routes.ts`（`/me`） | 返回 `{ user: { id, displayName }, role: number }`（现状无角色信息；首次引入 `role`） |
| `http/auth-middleware.ts` | `requirePermission` **删**（双职责拆分）；`requirePlatformRole(roles)` → **`requireRole(minRole, { scope? })`**（层级比较；可选 `scope` 承接原 `requirePermission` 的 token 凭证 scope 门，`assertTokenScoped` 保留供细粒度调用点） |
| `http/namespaces.ts` | **整文件删除**（617 行） |
| `http/assets.ts` | 路由 `/:nsSlug/:slug` → `/:slug`（含 versions/files/download/compare 子路由）；删 `listQuerySchema.nsSlug`、`createBodySchema.namespaceSlug`；删 `PATCH /:ns/:slug`（visibility）；注册判定改 `requireRole(USER)` |
| `http/reviews.ts` | 删 `namespaceSlug` 必填分支与空间审核判定 → `requireRole(ADMIN)` |
| `http/audit.ts` | `requirePermission(auditRead)` → `requireRole(ADMIN)` |
| `assets/service.ts` | 删 `namespace 按 slug 寻址`（`:120`）；`registerAsset` 去 namespace 维度；列表查询去 `ns.status`/`asset.status` 双条件中的 ns 部分；序列化去 `namespaceSlug` |
| `assets/manage.ts` | `canManageAsset(ownerId, viewerId, role)` → owner 本人 ∨ `role >= ADMIN` |
| `assets/visibility.ts` | **整文件删除** |
| `assets/version-read.ts` | 版本读面授权：`role >= ADMIN` ∨ 上传者/owner；删空间角色分支 |
| `assets/download.ts` | 同上简化 |
| `assets/stats.ts` · `bundle.ts` · `versions.ts` · `errors.ts` | 去 namespace 维度 + 删空间错误码 |
| `review/service.ts` · `review/query.ts` | 审核判定改 `role >= ADMIN`；删 `review_task.namespace_id` 读写 |
| `db/schema/{assets,governance,namespaces,users,index}.ts` | 按 §2.3 变更；`namespaces.ts` 整删 |
| `db/seed.ts` | 删 4 角色 / 10 权限 / `role_permission` 矩阵（整块移除，**S1 已完成**）；删 `global` 空间种子（**时点 S2**——空间表 S1 仍在，坐标锚点须留，见 §7 S1 注）；**保留** `SEED_ADMIN_*` 建号逻辑，改为直写 `role = 100`（SUPER_ADMIN） |
| `app.ts` | 摘除 `/api/namespaces` 挂载；**路由顺序注意**：`/api/assets/:slug` 与既有列表/子路由不冲突（子资源均为 `:slug/<子段>`） |

### 4.2 前端（含 M4a 适配）

| 文件 | 改动 |
|------|------|
| `main.tsx:35` | `<Route path="/assets/:nsSlug/:slug">` → `/assets/:slug` |
| `api/assets.ts` | `fetchAssetDetail(slug)` · 列表参数删 `nsSlug` · 注册 body 删 `namespaceSlug` |
| `api/{versions,compare,content}.ts` | 删 `nsSlug` 形参，路径 `/api/assets/${slug}/…` |
| `components/market/detail/{OverviewTab,FilesTab,FilePreviewDialog,VersionCompare}.tsx` | 删 `nsSlug` prop 透传 |
| `pages/AssetDetail.tsx` | 从 `useParams` 取 `slug`（原 `nsSlug`+`slug`） |
| `i18n/zh.ts` · `en.ts` | 删命名空间相关词条（若有） |

### 4.3 协议与规范

- **`packages/protocol/src/slug.ts`**：注释「跨类型唯一坐标 `@namespace/slug` 的 slug 段」→ 「全局唯一坐标 `slug`」；`slugSchema` 规则**不变**
- **01 §3.3**：「寻址：`@namespace/slug`」→「寻址：`slug`（全局唯一）」；「同 namespace 下」措辞改为「全站」
- **05**：§6.1（4 档角色表）· §6.2（命名空间角色与状态 → **删除**）· §6.4（矩阵重写，见 §2.2）· §6.5（空间角色主轴 → **删除**，改「平台角色是唯一权限主轴」）
- **08**：§4（空间域 → **删除**）· §5.1（asset 表去 namespace_id/visibility；owner 注记改写）· §5.2/§5.3（去 namespace 引用）· §7（版本读面授权集合改）
- **00**：§2.2/§2.3/§3 中涉及多租户/命名空间/空间的表述需同步（具体行待定稿时逐条核）

## 5. 数据迁移

```
迁移文件（**按阶段分 3 个**；forward-only，drizzle-kit 生成后人工复核）：
  0005_flatten_role_model.sql（S1 · **已执行**）= 步骤 1-2 + 删 4 权限表（permission/role_permission/role/user_role_binding）
  0006_*.sql（S2）= 步骤 3 的 asset/review_task 列与索引 + 删 2 空间表（namespace/namespace_member）
  0007_*.sql（S3）= 删 asset.visibility（S2 时该列仍在；S3 才归零）

步骤：
  1) ALTER TABLE user_account ADD COLUMN role SMALLINT NOT NULL DEFAULT 1
  2) 回填（R6 取最高档）：
       UPDATE user_account u SET role = 100
         WHERE EXISTS (SELECT 1 FROM user_role_binding b JOIN role r ON r.id=b.role_id
                       WHERE b.user_id=u.id AND r.code='SUPER_ADMIN');
       UPDATE user_account u SET role = 10
         WHERE role <> 100 AND EXISTS (SELECT 1 FROM user_role_binding b JOIN role r ON r.id=b.role_id
                       WHERE b.user_id=u.id AND r.code IN ('ASSET_ADMIN','USER_ADMIN','AUDITOR'));
  3) 删列/改索引：
       ALTER TABLE asset DROP COLUMN namespace_id, DROP COLUMN visibility;
       ALTER TABLE asset DROP CONSTRAINT uq_asset_namespace_slug;   -- unique 是**约束**非索引（0000 迁移实证）
       DROP INDEX idx_asset_namespace_status;
       CREATE UNIQUE INDEX uq_asset_slug ON asset(slug);
       CREATE INDEX idx_asset_status ON asset(status);
       ALTER TABLE review_task DROP COLUMN namespace_id;
       DROP INDEX idx_review_task_namespace_status;
       CREATE INDEX idx_review_task_status ON review_task(status);
  4) DROP TABLE namespace_member, namespace, role_permission, permission, role, user_role_binding;

数据校验（迁移前后断言）：
  · 迁移前【关键】：SELECT slug, count(*) FROM asset GROUP BY slug HAVING count(*) > 1   → 期望 0
    （跨空间同名会让 UNIQUE(slug) 失败——这是唯一的硬性前置）
  · 迁移前【信息】：资产空间分布统计（**实测 dev 库**：`global`=0 + `smoke-ns`=4）
    —— 迁移**不依赖空间归属**，只依赖 slug 唯一性；非 `global` 空间的资产同样直接并入扁平坐标
  · 迁移后：SELECT count(*) FROM user_account WHERE role NOT IN (1,10,100)               → 期望 0
  · 迁移前【信息】：角色绑定分布（**实测 dev 库**：`SUPER_ADMIN` × 2 → 回填 `role=100`）
```

⚠️ **风险点**：若部署实例存在「不同空间下的同名 slug」，`UNIQUE(slug)` 会失败。
判别式已给（上述【关键】断言），迁移脚本须**先校验后执行**，冲突时中止并输出冲突清单。

**策略（P2 / P6）**：
- 冲突处置 = **中止 + 输出清单**，人工改名后重跑（脚本不自动改名——资产身份是产品决策）
- **不写 down 迁移**（forward-only 纪律）：回退路径 = 备份恢复；删表属破坏性 DDL，
  提供 down 会制造"可安全回滚"的错觉

## 6. 测试改写策略

| 类型 | 处置 |
|------|------|
| `http/namespaces.test.ts`（883 行） | **整文件删除**（端点已删） |
| `assets/visibility.test.ts` | **整文件删除**（可见性已删） |
| 含 `ASSET_ADMIN`/`AUDITOR`/`USER_ADMIN`/`SUPER_ADMIN` 断言的 **15** 个文件（S1 实测；原估 21） | 角色断言改 4 档（`SUPER_ADMIN` 保留；`ASSET_ADMIN`/`AUDITOR` → `ADMIN`；普通用户断言改 `role=1`）；坐标断言去 `ns` 段 |
| `auth/rbac.test.ts` | **重写**（测 `roleOf` / `hasRole` 四档层级；**`can()` 过渡态语义保留断言**——§4.1 D1：`can()` 未删，故非「语义消失」） |
| 集成测试的 seed/装配辅助 | 去 `insertNamespace`/`namespaceMember`；`insertAsset` 去 `namespaceId`/`visibility` 形参 |
| 纪律 | 断言按**新契约**写，不为通过而放宽；`afterAll` 保持前缀 like 清理（禁全表 delete） |

## 7. 分阶段实施（边界与验收口径；Task 清单归 plan）

| 阶段 | 边界 | 验收口径 |
|------|------|---------|
| **S1 角色模型** | `user_account.role` + 迁移回填 + 删 4 权限表 + 重写 `rbac.ts`（`can()`/`getNamespaceRoles()` **过渡态保留**，S2 删）+ 删 `permissions.ts` + 新增 `token-scopes.ts` + `requireRole` + `/me` 返回 `role` + **15** 测试角色断言改写（实测；原估 21） | 全仓 `typecheck` + `test` 绿；`requireRole` 层级负例覆盖（未登录/用户/管理/超管） |
| **S2 空间删除** | 删 9 端点 + `namespaces.ts`/`.test.ts` + 2 表 + `asset/review_task.namespace_id` + 坐标改裸 slug（14 服务端源文件 / 39 判定点 + 10 前端文件）+ 审计动作/错误码清理 | 同上；坐标全链路回归（注册→详情→版本→文件→下载→对比）；**M4a 全量 dogfood 重跑（P4，Edge headless 5 路由）** |
| **S3 可见性删除** | 删 `asset.visibility` 列 + `visibility.ts` + `PATCH /:ns/:slug` 端点 + 测试矩阵 | 同上；公开读面全匿名可达；非 ACTIVE 语义（R6-b 授权集）单测保留 |
| **S4 收尾** | 规范同步（01/05/08/00）+ 全量回归 + converge（00 §7 ②） | 文档-代码对齐；8 维重评 ≥9；M4b design 按新模型重写 |

**每阶段独立 commit**（Conventional Commits），阶段内测试绿方可进入下一阶段；S2 为最大风险段。

> **S1 过渡语义（F6/D3）**：注册/发布仍经 `can()` 的空间路径（普通用户须为空间成员）——
> §2.2 表中「注册资产 = `用户`+」由 **S2/T5** 兑现；`global` 空间种子同理**保留至 S2**
> （空间表彼时仍存在）。S1 不越界改判据（板块绿点纪律）。

## 8. 接口变更总览

| 变更 | 端点 | 说明 |
|------|------|------|
| **删除** | `GET/POST /api/namespaces` · `GET/PATCH /api/namespaces/:id` · `PATCH /:id/status` · `GET/POST /:id/members` · `DELETE /:id/members/:userId` · `POST /:id/transfer-ownership` | 9 个空间端点 |
| **删除** | `PATCH /api/assets/:nsSlug/:slug` | visibility 变更端点（可见性取消） |
| **改路径** | `GET /api/assets/:nsSlug/:slug` → `GET /api/assets/:slug` | 及其子路由（versions / files / download / compare） |
| **改参数** | `POST /api/assets` body 删 `namespaceSlug` | 服务端不再需要空间定位 |
| **改参数** | `GET /api/assets` query 删 `nsSlug` | 同上 |
| **改响应** | `GET /api/auth/me` → `{ user: { id, displayName }, role: number }` | 现状为 `{ user: { id, displayName } }`（`auth/routes.ts:114`，**无任何角色信息**）；本重构首次引入 `role` 单值——原 M4b 计划中的 `platformRoles: string[]` 方案随之废弃 |
| **改响应** | 资产序列化删 `namespaceSlug` | 坐标回显自足性由 `slug` 承担 |

## 9. UI-UX 变动总览

- **M4a 门户**：路由参数变化（`/assets/:slug`）；资产展示不再出现命名空间前缀；列表筛选去掉空间维度
- **M4b（顺延）**：按新模型设计——侧栏显隐 `role >= requires`；无空间条目；无可见性字段；
  组级显隐 = `role >= 10`
- **不变**：M4a 的视觉体系（tokens/组件/交互）零改动

## 10. 影响声明（决策后果，如实记录）

1. **产品定位收窄**：AIH 从「多租户自治治理平台」变为「**无空间扁平注册中心 + 平台级治理**」。
   多租户（团队空间隔离、空间自治审核、空间成员管理）能力**移除**，与 clawhub 形态对齐。
2. **空间 ADMIN 场景消失**：05 §6.4「双人互审团队空间」运营注记随之废止（无空间角色）。
3. **AUDITOR 只读审计角色消失**：审计浏览并入 `管理`。
4. **USER_ADMIN 角色消失**：用户管理能力（未实现）并入 `管理`；将来落地时按 `role >= ADMIN` 判定。
5. **不可逆性**：6 张表 + **3 列**（asset: `namespace_id`/`visibility`；review_task: `namespace_id`）删除属破坏性 DDL；如需回退须从备份恢复（迁移脚本不做 down）。
6. **扩展余地**：若将来恢复多租户，需重新引入空间表/角色/坐标维度——本设计不保留占位。

## 11. 引用文件清单

- 规范：`docs/01-asset-protocol.md` §3.3 · `docs/05-identity-access.md` §6.1-§6.5 · `docs/08-data-model.md` §4/§5/§7 · `docs/00-product-direction.md` §2.2/§3
- 服务端（改）：`auth/{rbac,permissions,routes}.ts` · `http/{auth-middleware,namespaces,assets,reviews,audit,tokens,labels,token-middleware}.ts` · `assets/{service,manage,visibility,version-read,download,stats,versions,bundle,errors}.ts` · `review/{service,query}.ts` · `db/schema/{assets,governance,namespaces,users,index}.ts` · `db/seed.ts` · `storage/types.ts` · `app.ts`
- 服务端（新增）：`auth/token-scopes.ts`（D2）
- 服务端（删）：`http/namespaces.ts` · `auth/permissions.ts` · `assets/visibility.ts` · `db/schema/namespaces.ts`
- 迁移（新增）：`drizzle/0005_flatten_role_model.sql`（S1 已执行）· `0006_*`（S2）· `0007_*`（S3）；`drizzle/meta/_journal.json` + 快照随生成
- 前端（改）：`main.tsx` · `api/{assets,versions,compare,content}.ts` · `components/market/detail/{OverviewTab,FilesTab,FilePreviewDialog,VersionCompare}.tsx` · `pages/AssetDetail.tsx`
- 协议包：`packages/protocol/src/slug.ts`
- 测试（删）：`http/namespaces.test.ts` · `assets/visibility.test.ts`
- 对标源：`/Users/xuewensun/04-ws/21-skillhub`（双轴模型参照）· `https://clawhub.ai/api/v1/openapi.json`（扁平模型参照，2026-09-10 实测）

## 12. 规范同步项

| 规范 | 改动 | 时点 |
|------|------|------|
| 01 §3.3 | 坐标改裸 slug（全局唯一） | S4 |
| 05 §6.1 | 4 档角色表（含未登录档的地位说明） | S4 |
| 05 §6.2 | **删除**（命名空间角色与状态） | S4 |
| 05 §6.4 | 权限矩阵重写为「角色 × 操作」（§2.2 形态） | S4 |
| 05 §6.5 | **删除**「空间角色是权限主轴」；改为「平台角色是唯一权限主轴」 | S4 |
| 08 §4 | **删除**（空间域） | S4 |
| 08 §5.1 | asset 表去 namespace_id/visibility；owner 注记改写 | S4 |
| 08 §5.2/§5.3/§7 | 去 namespace 引用；版本读面授权集合改 | S4 |
| 00 §2.2 **L50** | `命名空间坐标 @namespace/slug：团队空间 + 全局空间，slug 跨类型唯一` → `坐标 slug：全局唯一（跨类型），无命名空间维度` | S4 |
| 00 §2.2 **L51-52** | 开放协作审核主体 → `owner / 平台管理员`（去「空间管理员」「全局空间由平台管理员治理」） | S4 |
| 00 §5 **L96** | M4 行改写：M4a ✅ 注记保留 + **新增 M4-pre 行**（本次重构）+ M4b 范围更新（管理后台待立项） | S4 |
| 00 §6 **L105** | `多租户 SaaS、计费/额度体系` → `多租户/空间隔离、计费/额度体系（不做）` | S4 |
| 00 §8 | 修订记录加 v1.13（本次扁平化重构） | S4 |

> 不改的历史注记：`00 §5 L93`（M1「命名空间 HTTP API」）与 `L94`（M2「空间 OWNER 转让」）
> 是**已发生事实的完成注记**，不篡改历史；重构记录由 M4-pre 行承担。

## 13. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-10 | sunxuewen-rush | 初稿：J1-J3 拍板落地（先重构后 M4b / 坐标裸 slug / 命名 M4-pre）+ R1-R6 拍板表（4 档角色 / 无空间 / 无可见性 / 无权限码 / 裸 slug / 取最高档迁移）+ 全链路实扫影响面（14 服务端源文件 · 39 空间判定点 · 10 前端文件 · 4 schema 表 · 10 端点 · 6 表 2 列）+ 迁移脚本与校验断言（含 dev 库实测数据）+ 四阶段实施边界 + 影响声明 |
| v0.2 | 2026-09-10 | sunxuewen-rush | grilling Round 1 闭环：新增 §2.5 实施拍板（P1-P7——阶段划分不拆 S2 / 冲突中止不自动改名 / 赋权靠 seed+SQL 不加 UI / M4a 全量 dogfood 回归 / role 值 0-1-10-100 / 不做 down / 先补 00 定位）；§5 补 P2/P6 策略；§7 S2 验收补 P4 回归口径；§12 规范同步落实到行（00 L50/L51-52/L96/L105 + §8 修订记录，并注明 L93/L94 历史注记不改） |
| v0.3 | 2026-09-10 | sunxuewen-rush | S1 执行偏离回写（plan v0.2 同源）：**D1** §4.1/§7 —— `can()`/`getNamespaceRoles()` 保留为过渡态（S1 删除会连带动空间逻辑破坏板块绿点；平台侧 `role >= ADMIN` 已逐行核对与旧语义等价，S2/T6 随空间删）；**D2** §2.1 R4/§3/§4.1 —— 权限码 10→0 但 token 凭证 scope 另立 `auth/token-scopes.ts`（5 码，取值逐字一致 → 存量零迁移）；**D3** §4.1/§7 —— `global` 空间种子删除时点归 S2；§4.1 `requireRole(minRole, { scope? })` 双参形态落定。**深度档四轮审查补正**：F3 §11 引用清单补 3 项（`token-scopes.ts`/`http/tokens.ts`/`http/labels.ts`）+ 迁移文件行；F4 `roleOf` 主入口口径（`hasRole` 仅测试消费）；F5 §3/§7 测试数字改实测 15；F6 §7 S1 过渡语义注（注册语义待 S2/T5）。**第二轮四轮审查一次收口**（治根因：design 系实现前估计、逐点补=打地鼠）：**F8** §6:233 测试文件 21→15（涟漪漏 §6）· **F9** §6:234「`can()` 语义消失」与 D1 矛盾 → 改「过渡态语义保留断言」· **F10** §3/§5 迁移由「单个 0005」改「按阶段 3 个」（0005 已执行 / 0006 S2 / 0007 S3 + 各自职责）· **F15** §3/§10「删 2 列」→「**3 列**」（asset: namespace_id/visibility；review_task: namespace_id——§5 step 3 自身列了 3 条 DROP COLUMN）。F11 撤回（§7 `/:ns/:slug` 简写全文一致，非残留） |
| — | 2026-09-10 | sunxuewen-rush | **定稿**（用户批准；出口标准：8 维自检 9.3 ≥9 + grilling Round 1 闭环）。实施由 `docs/plans/M4-pre-flat-model-refactor.md` 承接。 |
