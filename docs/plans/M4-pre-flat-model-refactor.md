# M4-pre 扁平化重构实施计划

> Date: 2026-09-10
> Updated: 2026-09-10（v0.3/v0.3.1：**板块 B（S2 空间删除）执行完成回填**——T5-T9 ✅ + 迁移 0006 实测（含 P2 守卫实证）+ 执行偏离 D4（**用户已拍板 2026-09-10**）/D5 + 用例账（570→521 全可解释）+ dogfood 21/21 + 全链冒烟 24/24 + 深挖自测 **9.32**（F17-F20）；**板块 B 代码 commit `9d6ac57`**（本文档为紧随的 docs 回填 commit——同板 A 惯例）；v0.2：板块 A（T1-T4）执行完成回填——任务状态 ✅ + 断言实测 + 执行偏离注记（D1 `can()` 过渡态保留 / D2 新增 `auth/token-scopes.ts` / D3 `global` 空间种子时点归 S2）+ 深度档自检（18 维 + 四轮审查法，三轮）**8.77 → 9.10**（修复项 F1-F16 见各 Task 修复录 + 修订记录）；四门禁 `--force` 真跑留证（typecheck 4/4 · test 570 · lint 0 · build 4/4）+ F7 测试覆盖口径澄清；**板块 A 代码 commit `59164c1`**（本文档为紧随的 docs 回填 commit——仓库惯例同 M4a 的 `docs: M4a plan mark TN done`；hash 无法自指，故不用 amend））
> Status: 🔄 执行中（板块 A · S1 ✅ 代码 commit `59164c1`；**板块 B · S2 空间删除：T5-T9 ✅ 四门禁绿（typecheck 4/4 · test 521 = server 494 + protocol 27（1 skip）· lint 0 · build 4/4；均 `--force` 0 cached）+ dogfood 21/21 + 全链冒烟 24/24 + 自检 9.32** · 代码 commit `9d6ac57`；板块 C→D 未开工；板块顺序 A→B→C→D）
> 引用链：本文档 → 设计 `docs/designs/2026-09-10-flat-model-refactor-design.md`（v0.3 定稿，§N 逐 Task 引用）→ 规范 01 §3.3 · 05 §6 · 08 §4/§5/§7 · 00 §2.2/§5/§6（引用不复制）
> 命名约定见 docs/plans/README.md

## 1. 目标与范围

**目标**：落地 M4-pre 扁平化重构——角色 4 档线性（`0 未登录 / 1 用户 / 10 管理 / 100 超管`）、
空间概念整体删除（表/列/端点/坐标维度）、可见性整体删除（只保留 PUBLIC）、权限码整体删除、
坐标改裸 `slug`（全局唯一 `UNIQUE(slug)`）。design §2 为目标模型单一事实源。

**前置基线**：M4a 已收官（server 538 tests + protocol 27 全绿）；dev db 可迁移
（`docker compose up -d db` + `bun run db:migrate`，:5433/aih）；dev 库实测现状——
空间 `global`(0 资产) + `smoke-ns`(4 资产)，**无跨空间同名 slug**，角色绑定 `SUPER_ADMIN`×2。

**不含**（design out）：M4b 管理后台（本重构后另立项）；用户管理面；角色分配 UI（P3）；
多租户能力恢复（design §10.6 明确不保留占位）。

**执行纪律**：
- **绿点 = 板块边界**：本重构为**破坏性重构**（改一处即连锁编译失败），故验收单元为
  **板块**（A/B/C/D 每板块结束：全仓 `bun run typecheck` + `bun run test` 全绿后才 commit）；
  板块内 Task 是工作分解，不单独作为绿点
- 服务端测试 = `bun test src/`（真 PG `ai_asset_hub_test`@5433 密码 `aih`）；提交前验证
  `typecheck` + 全量测试无新失败
- **禁 mock 服务模块**（网络层 stub 例外）；测试数据清理 `afterAll` 前缀 like 清，
  **禁全表 delete**；drizzle 条件组合必 `and()`/`or()`（23505 看 `err.cause.code`）
- **迁移先校验后执行**（design §5）：跨空间同名 slug 检测不为 0 → 中止输出清单（P2）
- **不写 down 迁移**（P6，forward-only）；删表属破坏性 DDL，回退靠备份
- 断言按**新契约**写，不为通过而放宽（design §1.3/§6：属需求变更驱动的测试更新）
- turbo 缓存会掩盖 lint 债——门禁终验用 `--force` 真跑

## 2. Task 清单

### 板块 A · S1 角色模型（design §2.1 R1/R4 · §4.1 · §5 · §6）

#### T1 schema 与迁移 0005（design §2.3 · §5）
- **Files**: Modify `apps/server/src/db/schema/users.ts`（`userAccount` 加 `role` 列
  `smallint NOT NULL DEFAULT 1`；删 `role`/`permission`/`rolePermission`/`userRoleBinding`
  四表定义与 `roleCodeSchema`）；Create `apps/server/drizzle/0005_*.sql`（drizzle-kit 生成 +
  人工插入回填 SQL，**位于 DROP TABLE 之前**）
- **数值约定**（design §2.5 P5）：`0 未登录 / 1 用户 / 10 管理 / 100 超管`——留插值空间，
  新注册默认 `1`
- **Steps**: 改 schema → `bun run db:migrate` 生成 → 人工插入回填两步
  （`SUPER_ADMIN`→100；`ASSET_ADMIN`/`USER_ADMIN`/`AUDITOR`→10）→ dev 库执行 → 抹平
- **Assert**: `user_account.role` 存在且默认 1；四表已删；dev 库回填后
  `role NOT IN (1,10,100)` 计数为 0；原 `SUPER_ADMIN`×2 落 100（design §5 实测基线）
✅ 完成（2026-09-10）。**迁移 0005 已手工重排**为「加列 → 回填 → 删表」（drizzle-kit 生成稿把 DROP
  排在 ADD 之前，回填不可能执行）；**dev 库实测**回填 `admin`/`smoke-admin` = 100、其余 8 账号 = 1，
  `role NOT IN (1,10,100)` = 0 行，4 表已 DROP，`idx_user_account_role` 已建。
  **修复录（18 维 A2/B3）**：`user_account.role` 补 `.$type<AccountRole>()`——自检抓出类型断言泄漏
  （`smallint` 无 `$type` 逼出 `rbac.ts` 的 `as AccountRole`），修正后连带暴露 2 处测试助手松类型
  （`setRole(userId, role: number)` → `AccountRole`）。断言全部保持原契约，未放宽。
- **Commit**: `feat(server): add 4-tier role column and drop permission tables`

#### T2 rbac 判定内核 + 中间件 + 调用点迁移（design §2.2 · §4.1）
- **Files**: Modify `apps/server/src/auth/rbac.ts`（重写：`roleOf(userId)` → 4 档 + `hasRole(minRole)`；
  删 `platformRolesOf()`/`NS_ROLE_*_PERMS`/`WRITE_PERMISSIONS`；**`can()`/`getNamespaceRoles()`
  过渡态保留**（空间面兼容，S2 随空间删——见 D1）；保留 `isSelfReview`）；Delete
  `apps/server/src/auth/permissions.ts`；Modify `apps/server/src/http/auth-middleware.ts`
  （删 `requirePermission`；`requirePlatformRole(roles)` → `requireRole(minRole)`）；
  Modify 调用点 12 处（`http/{namespaces,assets,reviews,audit}.ts` 的 `rbac.can` /
  `requirePermission` / `requirePlatformRole`）
- **Steps**: 重写内核 → 改中间件 → 逐调用点替换为 `requireRole(N)` 或 `roleOf()` 手写判定
  （空间端点的 `namespaceManage` 判定暂以 `requireRole(ADMIN)` 承接，板块 B 随端点一并删除）；
  **`can()` 过渡态不动**（其平台侧已随本次换为 `role >= ADMIN`，空间侧留待 S2）
- **Assert**: typecheck 无残留引用（`grep -rn "PERMISSIONS\.\|platformRolesOf\|requirePlatformRole"`
  apps/server/src 为空；`rbac.can(` **过渡态保留故不在清零清单**——见 D1）；判定语义等价（超管短路保留）
✅ 完成（2026-09-10）。残留三项 grep 实证：`PERMISSIONS.` / `platformRolesOf` / `requirePlatformRole`
  均 **0 命中**（`rbac.can(` 仍有 8 处生产调用点——**过渡态属 D1，不在清零清单**）；原权限码引用改指
  `TOKEN_SCOPES`（5 码，D2）；typecheck 60 错 → 0 错。
  **过渡期语义注（F6）**：注册/发布仍经 `can()` 的空间路径（普通用户须为空间成员）——design §2.2
  「注册资产 = `用户`+」由 S2/T5 兑现，S1 不越界改判据（板块绿点纪律）。
  **执行偏离注记**（design 同步回写，见 design §3/§4.1/§7）：
  - **D1 · `can()` 保留为过渡态**：design §4.1 原写「删 `can()`/`getNamespaceRoles()`」。实际保留
    ——`can()` 内部耦合空间状态检查（FROZEN 拒写 / ARCHIVED 拒绝）与空间角色查询，S1 删它会连带
    动空间逻辑（S2 职责），破坏「板块绿点」纪律。处置：**平台侧**改 `role >= ADMIN`（已与旧实现
    逐行核对等价——旧 `platformPermissions.has(perm)` 与今 `role >= ADMIN` 同为空间状态检查前的
    短路），**空间侧**语义不变，S2（T6）随空间一并删除；`can()` 顶部有 ⚠️ 过渡态警示注释。
  - **D2 · 新增 `auth/token-scopes.ts`（5 码）**：design §2.1 原写「`permissions.ts` 整文件删除，
    权限码 10 → 0」。角色判定码确为 0，但 token 凭证级 scope 需替代落点（原用权限码做交集）——
    scope 是**凭证级**约束（"这把钥匙能开哪扇门"），与角色（"这个人有多高权限"）正交，不做进 4 档。
    取值与 M3 **逐字一致** → 存量 `api_token.scope` **零迁移**。
- **Commit**: `refactor(server): replace permission codes with 4-tier role checks`

#### T3 `/me` 契约 + seed 简化（design §8 · §4.1）
- **Files**: Modify `apps/server/src/auth/routes.ts`（`/me` → `{ user: { id, displayName },
  role: number }`）；Modify `apps/server/src/db/seed.ts`（删 4 角色/10 权限/`role_permission`
  矩阵；`global` 空间种子**时点归 S2**——空间表 S1 仍在，锚点保留；保留 `SEED_ADMIN_*`
  建号并直写 `role = 100`）
- **赋权途径**（design §2.5 P3）：首期**不加 UI**——首管理员走 `SEED_ADMIN_*`；
  后续赋权为**手工 SQL**（`UPDATE user_account SET role = 10 WHERE username = '...'`），
  在 README/runbook 留一行说明（M6 交付物）
- **Assert**: `GET /api/auth/me` 返回 `role` 数值；`bun run db:seed` 幂等跑通（无权限表依赖）；
  未登录仍 401 `auth.session_expired`
✅ 完成（2026-09-10）。`/me` → `{ user: { id, displayName }, role }`（未登录 401 不变）；
  seed 删 4 角色/10 权限/`role_permission` 矩阵，`global` 空间种子**保留**（空间本体属 S2 范围），
  `SEED_ADMIN_*` 改直写 `role = SUPER_ADMIN`。**兼容性实据**：`grep -rn "platformRoles" apps/web/src
  apps/cli` 为空 + 全仓 typecheck 4/4 通过 → 前端/CLI 零破坏。
  **执行偏离注记 D3**：`global` 空间种子**保留至 S2**（空间表在 S1 仍存在，提前删种子会让
  dev 库无坐标锚点）——design §4.1 该行的「删」已随标注时点为 S2（§7 S1 同注）。
- **Commit**: `feat(server): expose role in me endpoint and simplify seed`

#### T4 测试改写（design §6）
- **Files**: Modify **15** 个含角色/权限断言的测试文件（实测口径；design §3 的「21」为估算）
  （`ASSET_ADMIN`/`AUDITOR`/`USER_ADMIN` → `ADMIN`；普通用户断言 → `role=1`）；**重写**
  `apps/server/src/auth/rbac.test.ts`
  （`can()` 语义消失 → 测 `roleOf` + `requireRole` 层级）；Modify 集成测试 seed/装配辅助
  （去角色绑定插入，改直写 `user_account.role`）
- **Assert**: 全仓 `bun run typecheck` + `bun run test` 绿；`requireRole` 层级负例覆盖四档
  （未登录 401 / 用户 403 / 管理 200 / 超管短路 200）
✅ 完成（2026-09-10）。codemod v2 批量改 14 文件（v1 有副作用——import 注入被自身替换污染 +
  `ensureRole` 调用点未删，错误数反升 48→69；回滚后 v2 降至 27）→ 手工重写 3 文件
  （`rbac.test.ts`/`auth-middleware.test.ts`/`audit.test.ts`）。**结果**：typecheck 0 错；
  `bun test src/` **542 pass / 1 skip / 0 fail**（基线 538 → +4 层级负例）；`bun run lint` exit 0
  （`biome --write` 清掉本次引入的 19 个格式 error，余 135 warnings 为存量）。
  **覆盖探针（F16 批次留证）**：15 个改写文件逐项对比 HEAD ↔ 工作树——用例 **242 → 247**、
  断言 **572 → 590**，**零下降**（`rbac.test.ts` 11→15 用例 / 21→37 断言；
  `auth-middleware.test.ts` 7→8 / 12→14）→ codemod **只换角色装配、未动任何断言**，
  「测试是上游契约」实证。另：`ensureRole` 在 HEAD 两文件计数 = 1（仅定义行，无调用）→ 删除无损。
- **Commit**: `test(server): update role assertions for 4-tier model`

**板块 A 验收**：全仓 typecheck + test 全绿；`role >= N` 判定语义全覆盖；迁移回填数据正确。

---

### 板块 B · S2 空间删除（design §2.1 R2/R5 · §4.1/§4.2 · §5 · §7）

#### T5 服务端坐标链路（design §2.3 · §4.1）
- **Files**: Modify `apps/server/src/assets/service.ts`（删 `namespace 按 slug 寻址`；
  `registerAsset` 去 namespace 维度；列表查询去 `ns.status` 条件）；Modify
  `apps/server/src/http/assets.ts`（路由 `/:nsSlug/:slug` → `/:slug` 含 versions/files/
  download/compare 子路由；`listQuerySchema` 删 `nsSlug`；`createBodySchema` 删
  `namespaceSlug`；序列化删 `namespaceSlug`）；Modify `apps/server/src/db/schema/assets.ts`
  （**本板块只删 `namespaceId` 列与两处 ns 索引**，`visibility` 列留待板块 C；改为
  `UNIQUE(slug)` + `idx_asset_status`）；Create `apps/server/drizzle/0006_*.sql`
- **Steps**: 改 schema → `bun run db:migrate` 生成 0006（移列/删约束/建新约束）→ 服务端逐处去 ns 维度
- **Assert**: `GET /api/assets` 列表无 ns 维度；`GET /api/assets/:slug` 详情可达；
  注册 body 无 `namespaceSlug` 亦 201；slug 冲突 409
✅ 完成（2026-09-10）。**迁移 0006 手工重排 3 处**（drizzle-kit 生成稿的坑）：① `DROP TABLE … CASCADE`
  排在 `DROP CONSTRAINT` 之前 → 约束已被级联删除故 ALTER 报错（与 0005 同类顺序坑）→ 重排为「校验 →
  删索引/约束/列 → 建新键 → 最后删表」；② 补 design §5 **P2 前置校验**（`DO $$` 块：跨空间同名 slug →
  `RAISE EXCEPTION` 中止 + 输出 `@ns/slug` 清单）；③ 唯一键保持 `ADD CONSTRAINT uq_asset_slug` 形态
  （改成 CREATE UNIQUE INDEX 会让后续 generate 误判漂移）。**dev 库实测**：asset = 12 列无 `namespace_id`；
  `uq_asset_slug UNIQUE (slug)`；4 资产坐标存活；`drizzle-kit generate` → *No schema changes*（快照零漂移）。
  代码面：14 路由 `/:slug…`（codemod 15 路径 / 14 参数行 / 13 加载点）、`getAsset(db, slug)`、`assetItem`
  去 `namespaceId`/`namespaceSlug`、存储 key 去空间段（存量旧 key 不受影响——key 存 DB）。
- **Commit**: `refactor(server): flatten asset coordinate to global slug`

#### T6 空间端点与表删除（design §4.1 · §8）
- **Files**: Delete `apps/server/src/http/namespaces.ts`（617 行）·
  `apps/server/src/db/schema/namespaces.ts`；Modify `apps/server/src/app.ts`（摘除
  `/api/namespaces` 挂载）；Modify `apps/server/src/db/schema/governance.ts`
  （`review_task` 删 `namespaceId` + 索引改）；Modify `apps/server/src/assets/errors.ts`
  （删 `namespace.*` 错误码）；审计动作 5 个（`namespace.create`/`member_add`/`member_remove`/
  `status_change`/`transfer_ownership`）**随 `http/namespaces.ts` 整删**——实测其为该文件内字面量，
  `audit.ts` 无中央动作枚举（故除删文件外无枚举项需清）
- **Assert**: `grep -rn "/api/namespaces" apps/server/src` 为空；`namespace`/`namespace_member`
  表已 DROP；`review_task` 无 `namespace_id`
✅ 完成（2026-09-10）。`http/namespaces.ts`(617 行) + `db/schema/namespaces.ts` 整删 + `app.ts` 摘挂载；
  `grep /api/namespaces` 源码 = **0**；运行库 `\dt` = 12 表（两空间表消失）；`review_task.namespace_id`
  列计数 = 0；2 个空间错误码删；`db/seed.ts` 的 `global` 空间种子删（**D3 兑现**）；审核队列改
  **全站单队列**（`QueueFilters` 去 namespaceId、`ReviewListItem` 去 namespaceSlug）。源码层仅剩 2 处
  **说明性注释**提及 namespace。
- **Commit**: `refactor(server): remove namespace domain entirely`

#### T7 判定链去空间角色（design §4.1 · §3）
- **Files**: Modify `assets/manage.ts`（`canManageAsset` → owner ∨ `role >= ADMIN`）·
  `assets/versions.ts` · `assets/stats.ts` · `assets/version-read.ts` · `assets/download.ts` ·
  `assets/bundle.ts` · `review/service.ts` · `review/query.ts` · `http/reviews.ts`
  （删 `namespaceSlug` 必填分支；审核改 `requireRole(ADMIN)`）· `storage/types.ts`
- **Assert**: 39 处判定点全部去空间角色（`grep -rn "namespaceRole\|namespaceMember" apps/server/src`
  结果为空）；审核队列单一路径（`role >= ADMIN`）；`grep -rn "namespaceId" apps/server/src`
  为空
✅ 完成（2026-09-10）。`canManageAsset({ownerId, viewerId, viewerRole})` → owner 本人 ∨ `role >= ADMIN`；
  `canViewAsset`/`VersionViewer`/`DownloadViewer` 去 `nsStatus`/`namespaceRole`；`canWithdrawReview` 改
  `viewerRole`；`http/reviews.ts` 队列/详情/审批/撤回全改管理档；`auth/rbac.ts` **删 `can()` /
  `getNamespaceRoles()` / 空间状态门 → D1「过渡态」正式兑现**。非测试源码 `namespaceRole|namespaceId|nsSlug`
  = 0；非测试 typecheck = 0 错。
  **执行偏离 D4**：`POST /:slug/versions`（上传草稿版本）判据由「空间成员 ∨ 平台权限码」改为 **owner
  本人 ∨ 管理档**——design §2.2 未单列该端点，按「版本级操作归 owner/管理」对齐；放开为「用户+」会让
  任意用户往他人资产挂版本（安全漏洞），故不采纳。**用户拍板（2026-09-10）：同意该收口。**
  **执行偏离 D5**：`auth/rbac.test.ts` 的 `can()` 过渡态 describe（7 例）中**空间侧 3 例**（空间 MEMBER
  可发布 / 空间 ADMIN 管成员 / FROZEN 拒写）随 `can()` 源码删除一并移除（需求变更驱动，非弱化）；
  **平台侧 4 例改测 `hasRole`**（等价断言保留）→ 净 −3 用例 / −10 断言（计入用例账）。
- **Commit**: `refactor(server): drop namespace roles from authorization chain`

#### T8 前端适配（design §4.2）
- **Files**: Modify `apps/web/src/main.tsx`（路由 `/assets/:slug`）·
  `api/{assets,versions,compare,content}.ts`（删 `nsSlug` 形参）·
  `components/market/detail/{OverviewTab,FilesTab,FilePreviewDialog,VersionCompare}.tsx`
  （删 prop 透传）· `pages/AssetDetail.tsx`（`useParams` 取 `slug`）· i18n 词条（若有）
- **Assert**: `bun run typecheck` 绿 + **`bun run build` 绿**（web **无 `test` 脚本**，见 §3 覆盖口径 F7
  ——build + T9 dogfood 才是 web 的实际闸门）；`grep -rn "nsSlug" apps/web/src` 为空（或仅 test）；
  详情页可打开、版本对比/文件树/预览可用
✅ 完成（2026-09-10）。17 文件（+33/−88）：`main.tsx` 路由 `/assets/:slug`；`api/{assets,versions,
  compare,content,types}.ts` 去 nsSlug 形参/字段；4 个详情组件去 prop 透传；`AssetDetail.tsx`+`Home.tsx`
  +`AssetCard.tsx` 坐标改裸 slug（移除 @ns 徽标/pill/元信息行）；i18n zh/en 同步删词条（Dict 类型对齐）。
  **我复核的清尾**：2 处死 CSS（`AssetCard .ns` / `AssetDetail .nsPill`）。**实证**：web typecheck exit 0 ·
  build 绿 · `grep "nsSlug\|namespaceSlug\|namespaceId\|namespace"` = **0**（含裸词）· 清 CSS 后 build 复跑仍绿。
- **Commit**: `refactor(web): drop namespace segment from asset routes`

#### T9 M4a 全量 dogfood 回归（design §7 P4）
- **Files**: 无代码变更；走查 `docs/smoke/scripts/m4a-dogfood.ts`（Edge headless CDP :9222）
- **Assert**: 5 路由走查全过（首页/三中心/详情）+ 详情三 tab + 版本对比；零 console error；
  记录入 `docs/smoke/2026-09-10-m4-pre-s2.md`
✅ 完成（2026-09-10）。**浏览器 dogfood 21/21 PASS + NO CONSOLE ERRORS**（Edge headless CDP :9222；
  新增反证断言「空间前缀已消失」）+ **契约全链冒烟 24/24 PASS**（匿名面：列表→详情→版本→文件→下载→
  对比→stats→labels，坐标全裸 slug 打通）。脚本同步适配：dogfood 参数化 `SMOKE_BASE_URL` /
  `SMOKE_SHOT_PREFIX`（避覆盖历史截图）；chain-smoke 9 处 URL 去 `smoke-ns/`。记录 + 6 张截图入
  `docs/smoke/2026-09-10-m4-pre-s2.md`（含环境口径：:3000 = 既有 watch 实例热重载新代码、web = :5174）。
- **Commit**: `chore(docs): record m4-pre s2 dogfood`

**板块 B 验收**：全仓绿（`--force` 四门禁）；坐标全链路回归通过（注册面 = 单测 73 例；匿名链 = 全链冒烟
24/24；浏览器 = dogfood 21/21）；`namespace*` 在非测试源码零残留（仅 2 处说明性注释）。**用例账**：
570 → 521（−49 = `namespaces.test.ts` 整删 46 + `can()` 空间侧 3，见 D5）；逐文件静态对比 HEAD
**零静默下降**（`rbac.test.ts` 37→27 同因；`service.test.ts` 28→29、`assets.test.ts` 166→167 微增）。

---

### 板块 C · S3 可见性删除（design §2.1 R3）

#### T10 可见性删除（design §2.3 · §4.1）
- **Files**: Modify `apps/server/src/db/schema/assets.ts`（删 `visibilitySchema` +
  `visibility` 列）+ Create `apps/server/drizzle/0007_*.sql`；Delete
  `apps/server/src/assets/visibility.ts`；
  Modify `apps/server/src/http/assets.ts`（删 `PATCH /api/assets/:slug`（原改 visibility 的端点）；
  列表/详情判定去 visibility 分支）；Modify `assets/{service,version-read,download}.ts`
  （去 visibility 形参与判定）
- **Assert**: `asset` 表无 `visibility` 列；公开读面**全匿名可达**（含详情/版本/文件/下载）；
  `grep -rn "visibility\|NAMESPACE_ONLY\|PRIVATE" apps/server/src` 仅余无关命中
- **Commit**: `refactor(server): remove asset visibility entirely`

#### T11 测试矩阵改写（design §6）
- **Files**: Delete `apps/server/src/assets/visibility.test.ts`；Modify 相关读面断言
  （去掉 visibility 维度；补匿名可达断言）；保留非 ACTIVE（HIDDEN/ARCHIVED）语义断言
  （R6-b 授权集——owner/管理可读，其余 404）
- **Assert**: 全仓绿；匿名读面五端点（列表/详情/版本/文件/下载）全 200；HIDDEN 语义矩阵保留
- **Commit**: `test(server): update read-face assertions after visibility removal`

**板块 C 验收**：全仓绿；公开读面全匿名；非 ACTIVE 授权集语义不变。

---

### 板块 D · S4 收尾（design §12 · §7）

#### T12 规范同步（design §12 逐行）
- **Files**: Modify `docs/01-asset-protocol.md`（§3.3 坐标）；`docs/05-identity-access.md`
  （§6.1 四档表 / §6.2 删 / §6.4 矩阵重写 / §6.5 删）；`docs/08-data-model.md`
  （§4 删 / §5.1 / §5.2-§5.3 / §7）；`docs/00-product-direction.md`（§2.2 **L50** ·
  **L51-52** · §5 **L96**（新增 M4-pre 行）· §6 **L105** · §8 修订记录 v1.13）；
  `packages/protocol/src/slug.ts`（注释）
- **Assert**: 五处规范改动逐行核对（design §12 表）；`L93`/`L94` 历史注记**未被改动**；
  全仓 `grep -rn "@namespace/slug\|命名空间" docs/*.md` 仅余历史注记与 M4-pre 文档自身
- **Commit**: `docs: sync specs with flat model`

#### T13 converge 与 M4b 重写（design §7 S4 · 00 §7 ②）
- **Files**: 无代码；跑文档-代码对齐回查 + 8 维重评；重写
  `docs/designs/2026-09-10-m4b-admin-console-design.md`（角色/空间/可见性章节按新模型，
  v0.3 → v1.0）
- **Assert**: converge 回查通过（版本头/修订记录/引用/状态同步）；8 维重评 ≥9；
  00 §5 M4-pre ✅ + M4b 行更新；M4b design 引用新模型无残留旧概念
- **Commit**: `docs: converge m4-pre and rewrite m4b design on flat model`

**板块 D 验收**：规范与代码对齐；M4b design 就绪；00 §5 状态翻转。

---

## 3. 全量验收（出口标准）

| 项 | 断言 |
|----|------|
| 角色 | `user_account.role` 单列；权限码**代码引用**清零（`grep -rn "PERMISSIONS\.\|platformRolesOf\|requirePlatformRole" apps/server/src` = 0；注释与外部错误码名不计，如 skillhub `review.no_permission`、`token-scopes.ts` 头注）；四档判定负例全覆盖 |
| 空间 | `namespace*` 表/列/端点/代码引用**全部消失**；坐标裸 `slug` + `UNIQUE(slug)` |
| 可见性 | `visibility` 列/判定/端点**全部消失**；公开读面全匿名 |
| 测试 | 全仓 `bun run typecheck` + `bun run test` + `bun run lint` + `bun run build` 绿（`--force` 真跑，**不信 turbo 缓存**）。**覆盖口径（F7）**：`bun run test` 实覆盖 **server（543：542 pass + 1 skip）+ protocol（27）**；`apps/web` **无 `test` 脚本**、`apps/cli` 为 `--pass-with-no-tests` 空跑 → 二者以 `typecheck` + `build` 兜底（web 另加 T9 dogfood）——**勿把「全仓 test 绿」当成 web 回归证据** |
| M4a | 5 路由 dogfood 全过 + 坐标链路回归 |
| 文档 | 01/05/08/00 同步完成 + converge 8 维 ≥9 + M4b design 按新模型重写 |
| 迁移 | dev 库迁移跑通、数据回填正确；不留 down；冲突校验断言在脚本内 |

## 4. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-10 | sunxuewen-rush | 初稿：承接 design v0.2 定稿——板块 A-D 共 13 Task（角色/空间/可见性/收尾）+ 每 Task Files/Steps/Assert/Commit + 板块绿点纪律（破坏性重构的验收单元适配）+ 全量出口标准 |
| v0.2 | 2026-09-10 | sunxuewen-rush | 板块 A（T1-T4）执行完成回填：任务状态 ✅ + 断言实测（迁移回填 / `/me` 兼容实据 / 四门禁 `--force` 真跑：typecheck 4/4 · test 570 · lint 0 · build 4/4）+ 执行偏离注记 D1（`can()` 过渡态保留，S2 删）· D2（新增 `token-scopes.ts` 5 码，取值逐字一致 → token 零迁移）· D3（`global` 空间种子保留至 S2）+ 修复录（`role` 补 `.$type<AccountRole>()` 消断言泄漏）+ 深度档自检（18 维 + 四轮审查法，两轮）修复 F1（T3 Files 矛盾 → D3 登记）· F2（T2/§3 断言改可实测口径）· F5（测试文件数 21 → 实测 15）· F6（T2 补过渡期注册语义注）· **F7（§3 覆盖口径——web 无 bun test，改以 typecheck+build+dogfood 兜底；T8 Assert 补 build）**· **F12（T2 Files/Steps 仍写「删 `can()`」→ 改标过渡态保留，与其自身 D1 对齐）**· **F13（`accountRoleSchema` 零消费者 → 保留 + 注释：08 §2 形态的写入侧校验器，M4b 消费）**· **F14（M4b design 加搁置声明 + 修订记录行；`platformRoles`/空间管理章节作废指向 S4/T13）**。Status 转执行中 |
| v0.3 | 2026-09-10 | sunxuewen-rush | **板块 B（S2 空间删除）执行完成回填**：T5-T9 ✅ + 断言实测（迁移 0006 手工重排 3 处 + P2 前置校验 + dev 库 DB 断言 + drizzle 零漂移；web typecheck/build/grep 0；dogfood 21/21 + 全链冒烟 24/24）+ 执行偏离 **D4**（`POST /:slug/versions` 判定改 owner ∨ 管理——design 未单列，按「版本级操作归 owner/管理」；放宽为「用户+」有漏洞）· **D5**（`rbac.test.ts` 的 `can()` 空间侧 3 例随源码删除，平台侧 4 例改测 `hasRole`）+ 用例账（570→521 全部可解释，逐文件零静默下降）+ 冒烟记录 `docs/smoke/2026-09-10-m4-pre-s2.md` |
| v0.3.1 | 2026-09-10 | sunxuewen-rush | **板块 B 整体自测（深挖轮）修复录 F17-F20**（用户要求「再次整体自测」，换靶：全仓广度 + 注释腐化类 + 未实证断言）：**F17（类）注释腐化**——26 处源码注释仍描述已删语义/引用**已删函数 `rbac.can()`**/已删角色名（`ASSET_ADMIN`/`AUDITOR`）/已删坐标 `{ns}`（分布 `http/assets.ts` 14 · `assets/{yank,version-read,versions}.ts` 6 · `http/audit.ts` 1 · `review/{query,service}.ts` 2 · `labels/service.ts` 1 · 等）→ 全部改写为「原…（已随空间删除）」历史说明式；根因=codemod 只改代码不改注释 + 上轮只修 1 处（**扫类不足**）；**F18** design §4.1 与 §7/本 plan T10 矛盾——`PATCH /:slug`（visibility）删除归属 S2 vs S3（代码现状=仍在，与 S3 一致）→ 已按 S3 修正 design；**F19** 本 plan T6「审计动作删 5 个」表述不精确 → 精确化为「5 个字面量随 `http/namespaces.ts` 整删；`audit.ts` 无中央动作枚举」；**F20（验证方法学）** P2 守卫此前**从未被实证**——首轮脚手架用 `psql` 无 `ON_ERROR_STOP`（出错仍返回 0）+ 种子误用不存在的 `user_account.username` 列 → **假 PASS**；严格重测确认守卫有效（冲突 → 中止 exit 3 + 输出 `@nsA/dup-slug`·`@nsB/dup-slug` 清单 + 表/列未半途破坏 + 消除冲突后成功=归因对照）。**新增已实证断言**：全新建库按序 0000→0006 跑通且终态正确（0 空间表 / 0 `asset.namespace_id` / `UNIQUE(slug)`） |
