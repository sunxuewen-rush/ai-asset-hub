# M3 治理管线实现计划

> Date: 2026-09-08
> Updated: 2026-09-09（v0.3：D1-D8 对标修正收尾注——label 域对齐 skillhub（06 v1.4/design v1.6）；v0.2：T1-T15 全完成 + T16 收尾执行注——规范同步 00 v1.11/01 v1.6/05 v1.7/08 v1.4 + 冒烟手册见 §6；v0.1：初稿——design v1.2 定稿后 Task 清单化）
> Status: 定稿（2026-09-08：design v1.2 定稿后起草，用户评审批准；16 Task 按 §3 顺序执行——每 Task 完成 = 断言为真 + 18 维自检 ≥9 + 用户批准后 commit）
> 引用链：本文档 → 设计 docs/designs/2026-09-08-m3-governance-pipeline-design.md（v1.2，§N 逐 Task 引用）→ 规范 00 §5 · 01 §3/§4 · 05 §5/§6 · 06 §1-§6 · 08 §5/§6/§7/§9（引用不复制，字段契约以规范与 design 为准）
> 命名约定见 docs/plans/README.md

## 1. 目标与范围

**目标**：落地 M3 治理管线——版本六态 → 八态补全（REJECTED/YANKED）的状态推进（提交/扫描 SPI/审核/
撤回）+ 预览权扩展 + 已发布治理（yank/删除条件）+ 标签管线 + 搜索 + 下载/统计 + API Token scope 过滤。
前置已就绪：review_task/label 三表（M1）、上传落 DRAFT + 逐文件存储（M2）、RBAC 判定链 + isSelfReview +
canManageAsset（M1/M2）、storage SPI presigned/deleteMany（M1）、assets 错误码域（M2）。
范围与决策以 design v1.2 为契约（R1-R15 + Q1-Q3），本 plan 不复制决策论证。

**不含**（后置清单，design §2 R1）：promotion 提升申请、stable/beta 通道挂载面、CLI 端点面、
security_audit 表（design §3.2 R3）、真扫描规则（直通 SPI）、审核/门户 UI（M4）。

**执行纪律**：测试 = `bun test src/`（apps/server 内，真 PG ai_asset_hub_test@localhost:5433 密码 aih）；
提交前验证 typecheck + 相关测试绿；**禁 mock 服务模块**（网络层 stub/fake server 例外）；
测试数据清理 afterAll 前缀 like 清，禁全表 delete；drizzle 条件组合必须 and()/or()；
错误码穷尽 switch（httpStatusForAsset 新增码漏映射即编译错——assets/errors.ts 迁移 draft_only 时
同步清理引用与测试）。

## 2. Task 清单

约定：每个 Task 完成 = 断言为真；commit 点为 Task 结束（Conventional Commits）。

### 板块 A 状态推进与审核管线（design §3）

#### T1 schema 扩展与迁移：八态枚举 + asset_version 五列
- **Files**
  - Modify: `apps/server/src/db/schema/assets.ts`——`versionStatusSchema` 补 `'REJECTED'/'YANKED'`
    （08 §7 六态 → 八态，design §3.4/§4.1 R5/R9；text 列 + zod 枚举——**零 DB 迁移**）；
    `asset_version` 加 `yankedAt/yankedBy/yankReason/bundleStorageKey/bundleSha256` 五列
    （varchar/text 可空——yank 留痕与 bundle 双通道，design §3.4/§4.1/§7.1 R9/R13）
  - Create: `apps/server/drizzle/<NNNN>_m3_governance_columns.sql` 或 drizzle-kit 生成迁移
    （forward-only，bundle/yank 列 add column——M3 首个迁移，08 §9 版本号段预留兑现）
  - Test: `src/db/schema/assets.test.ts` 或迁移验证（迁移后列存在断言）
- **Steps**：TDD——改 zod 枚举 → 跑迁移 → 断言五列存在且可空、八态常量导出
- **Assert**：迁移幂等（fresh 库跑全链迁移绿）；versionStatusSchema 含八态；旧行 bundle/yank 列为
  null 不破坏（本地库 asset_version 为空——已验证，无存量负担）
- **Commit**: `feat(server): extend version status to eight states with governance columns`

#### T2 扫描器 SPI + 直通实现（design §3.2 R3）
- **Files**
  - Create: `apps/server/src/scanner/types.ts`——`Scanner` 接口：`scan({type, manifestJson, files}) →
    Promise<ScanResult>`；`ScanResult = {ok: boolean, findings: ScanFinding[]}`；
    `ScanFinding = {code, path?, message?}`（纯 error/finding，无 warning 级——design §3.2）
  - Create: `apps/server/src/scanner/pass-through.ts`——直通实现（恒 ok，findings 空数组）
  - Create: `apps/server/src/scanner/registry.ts`——`scanner` 单实现注册 + `getScanner()`
    （M3 直通唯一实现；真规则 M6 扩展点——design §3.2）
  - Test: `src/scanner/registry.test.ts`（直通恒过、空 findings）
- **Steps**：TDD——接口 + 直通 + 注册表；纯函数无需 DB
- **Assert**：直通 ok=true 且 findings=[]；契约类型齐
- **Commit**: `feat(server): add governance scanner spi with pass-through`

#### T3 review 域服务：submit（design §3.1 R2）
- **Files**
  - Create: `apps/server/src/review/errors.ts`——review 域错误码：`review.not_found`(404) /
    `review.already_pending`(400) / `review.not_pending`(400) / `review.self_review`(403) /
    `review.comment_required`(400)（design §9；独立 errors.ts 分域——assets/errors.ts 先例）
    + `httpStatusForReview` 穷尽 switch + `ReviewError`
  - Create: `apps/server/src/review/service.ts`——`submitVersion(db, {asset, versionRow, submitterId,
    namespaceRole})`：
    - 判定：`review:submit` can()（owner 本人/空间 ADMIN/OWNER/ASSET_ADMIN/SUPER_ADMIN——
      05 §6.4）+ **上传者本人例外**（versionRow.createdBy === submitterId——design §3.1 R2，05 同步项）
    - 前态校验：仅 DRAFT/UPLOADED 可提（否则 400 `asset.version_not_submittable`——assets 域码）
    - 同版本已 PENDING 预检 → 400 `review.already_pending`（DB 部分唯一索引 23505 兜底）
    - review version：该版本历史 task 最大 version + 1（首次 1——design §3.3 R4 重审语义）
    - 事务：版本 status → PENDING_REVIEW + 插 review_task（submitted_by/submitted_at/version）
  - Test: `src/review/service.test.ts`（DB 集成：正例——owner/上传者本人/空间 ADMIN 提审成功；
    反例——非 owner 非上传者 403、PENDING 重复提 already_pending、PUBLISHED/REJECTED 前态错 400；
    重审 version 递增断言）
- **Steps**：TDD；先读现有 assets 服务错误/事务风格对齐（M2 先例）
- **Assert**：状态与 task 行断言（version+1 正确）；防并发唯一索引兜底不产生双 PENDING
- **Commit**: `feat(server): add review submit service`

#### T4 review 域服务：approve/reject/withdraw（design §3.3-§3.5 R4/R6）
- **Files**
  - 续 Modify: `apps/server/src/review/service.ts`——
    - `approveReview(db, {taskId, reviewerId, comment?, nsCtx})`：can(review:approve)（空间
      ADMIN/OWNER/ASSET_ADMIN/SUPER_ADMIN）+ `isSelfReview(submittedBy, reviewerId, isSuperAdmin)`
      （防自审 403 `review.self_review`——SUPER_ADMIN 例外由 isSuperAdmin 放行）→ **条件更新**
      （UPDATE review_task SET status=APPROVED/reviewed_by/review_comment/reviewed_at WHERE id AND
      status='PENDING' RETURNING——0 行 → 400 `review.not_pending` 并发结案）→ 事务内：版本
      →PUBLISHED + published_at=now + **asset.latest_version_id = 该版本**（design §3.3 R4）
    - `rejectReview(db, ...)`：同判定 + comment **必填**（空 → 400 `review.comment_required`）→
      条件更新 REJECTED → 版本 → REJECTED（design §3.4 R5）
    - `withdrawReview(db, {taskId, actorId, nsCtx})`：权限 = 提交人本人（submitted_by === actorId）
      or asset owner or 空间 ADMIN/OWNER（design §3.5 R6）→ 版本 → UPLOADED + 删 PENDING task 行
      （08 review_task 无 ON DELETE——显式删行；version 递增语义留给下次 submit，T3 已实现）
    - 审计埋点：review.approve / review.reject / review.withdraw（detail: comment 含敏感不落？
      comment 是审核内容可落——M2 纪律敏感载荷不落，comment 非敏感；target_type review_task）
  - Test: 续 `src/review/service.test.ts`（approve 正例含 latest 指针断言/published_at；reject
    comment 必填 400；防自审 403（本人审自己的 task——SUPER_ADMIN 例外可过）；并发双审——条件
    更新后第二人 not_pending；withdraw 回 UPLOADED + task 删行 + 再 submit version+1）
- **Steps**：TDD；事务与条件更新为并发核心断言
- **Assert**：latest_version_id 与 published_at 落位；审计行存在；withdraw 后 task 表无 PENDING
- **Commit**: `feat(server): add review approve reject withdraw`

#### T5 review 读面：队列/我的提交/详情（design §3.6-§3.7 R7/R8）
- **Files**
  - Create: `apps/server/src/review/query.ts`——`listReviews(db, {status?, namespaceSlug?, viewer,
    limit, offset})`（审核队列：can(review:approve) 面全见——非审核角色仅见自己的提交？design §9
    「review:approve 面 / 本人」——实现：approve 面见全部（按 ns/status 过滤），普通用户见
    submitted_by=self）· `listMyReviews(db, userId, {status?})` · `getReviewDetail(db, taskId,
    viewer)`（授权：review:approve 面 or submitted_by=本人；含版本 manifest/文件清单 sha256——
    审核预览 R7 消费 version 读面查询复用 assets/version-read.ts 扩展后函数）
  - Test: `src/review/query.test.ts`（DB：队列可见面矩阵——ASSET_ADMIN 全见/空间 ADMIN 见本空间/
    MEMBER 仅自己的提交；详情含 manifest）
- **Steps**：TDD；详情内容复用 T6（预览权重构后）的版本读面函数——本 Task 排在 T6 之后执行
  （见 §3 执行顺序）
- **Assert**：可见面矩阵全绿；他人 task 详情 403 `review.access_denied`（对齐 skillhub
  ReviewPortalAppService 的 review.no_permission——DomainForbiddenException 源码实证 + AIH 明示
  哲学；review.not_found 仅任务不存在时用）；**access_denied 为 design §9 补项——本 Task 实现时
  同步 design 错误码表 + 修订记录一行（plan 纪律：冒现决策显式回 design）**
- **Commit**: `feat(server): add review query endpoints service`

#### T6 预览权重构：version-read 态分类（design §3.6 R7）
- **Files**
  - Modify: `apps/server/src/assets/version-read.ts`——**重构白名单假设陷阱**（design §3.6 注记：
    `canViewDraft`/`draftVisibleWhere` 现为「status ≠ DRAFT → 全可见」——八态下会泄露未公开族）：
    显式态分类函数——授权集（owner/上传者/空间 ADMIN/OWNER/ASSET_ADMIN/SUPER_ADMIN）全见未公开族
    （DRAFT/SCAN_FAILED/REJECTED/UPLOADED/PENDING_REVIEW）；非授权者仅见曾公开族
    （PUBLISHED/YANKED）。VersionViewer 扩展 isPlatformReviewer（ASSET_ADMIN/SUPER_ADMIN——
    现 isSuperAdmin 已有；ASSET_ADMIN 需新增判定——viewer 结构加字段或调用方注入）
  - Modify: `apps/server/src/http/assets.ts`（版本列表/详情端点 viewer 组装——ASSET_ADMIN 角色
    注入）；`src/http/assets.test.ts` 扩展（未公开族泄露回归测试：MEMBER 非授权者见 PUBLISHED/
    YANKED 不见 UPLOADED 等）
- **Steps**：先写回归测试（现行为 vs 八态期望——泄露断言），再重构实现转绿
- **Assert**：非授权者列表不见未公开族；ASSET_ADMIN/上传者/owner/空间 ADMIN 全见；YANKED 对
  非授权者可见（详情留档）；详情 400 version_not_published 语义维持
- **Commit**: `fix(server): refactor version read visibility for eight states`

#### T7 review HTTP API（design §9 R8）
- **Files**
  - Create: `apps/server/src/http/reviews.ts`（路由组工厂 deps db/rbac/audit）——
    `GET /api/reviews`（status/namespaceSlug 过滤 + 分页，requireAuth + 可见面判定）·
    `GET /api/reviews/mine` · `GET /api/reviews/{id}`（详情——权限同 T5）·
    `POST /api/reviews/{id}/approve`（body {comment?}）· `POST /api/reviews/{id}/reject`
    （body {comment} 必填）· `POST /api/reviews/{id}/withdraw`
  - Modify: `apps/server/src/app.ts`（挂载 /api/reviews）
  - Modify: `apps/server/src/http/assets.ts`（POST .../versions/{version}/submit 端点——review:submit
    + 上传者例外判定、路径版本号解析）
  - Test: `src/http/reviews.test.ts` + 续 assets.test.ts（集成：submit→队列可见→approve→详情
    PUBLISHED→latest；reject→REJECTED；withdraw→UPLOADED；防自审 403 明示）
- **Steps**：集成测试先行（域服务已单测，路由层薄）
- **Assert**：全链 curl 语义通（错误格式 07 §4）；审计动作行存在（review.*）
- **Commit**: `feat(server): add review api routes`

### 板块 B 已发布资产治理（design §4）

#### T8 yank 撤回分发（design §4.1 R9）
- **Files**
  - Create: `apps/server/src/assets/yank.ts`（或入 manage.ts）——`yankVersion(db, storage?, audit,
    {assetId, versionRow, actorId, reason})`：
    - 判定：ASSET_ADMIN/SUPER_ADMIN（can('asset:manage') + 平台角色检查——05 §6.4「撤回已发布
      版本」行；**非 owner/空间 ADMIN**——平台治理面最严，design §4.1 R9）
    - 仅 PUBLISHED 可 yank（否则 400 `asset.version_not_published`？——非 PUBLISHED 状态错码：
      `asset.version_not_yankable` 或复用——design 未列此码，实现用 400 version_not_submittable
      语义不符——**新增码 asset.version_not_yankable（400）**，errors.ts + switch 同步）
    - reason 必填（400 review.comment_required？——独立校验：400 `request.invalid` 或加码——实现
      定：`asset.yank_reason_required`（400）或复用 review.comment_required 不合适——**加码
      asset.yank_reason_required（400）**）
    - 事务：版本 → YANKED + yanked_at/yanked_by/yank_reason 落位；**latest 指针重算**（命中 latest
      时：剩余 PUBLISHED 取 published_at 最大 → created_at → id，无则置空——design §4.1 排序同构）
    - 审计 `asset.version_yank`（detail: {reason, version}）
  - Modify: `apps/server/src/http/assets.ts`（POST .../versions/{version}/yank 端点 + 错误码映射）；
    `assets/errors.ts` 加两码 + switch
  - Test: `src/assets/yank.test.ts`（DB：PUBLISHED 可 yank 断言三列 + latest 重算（多 PUBLISHED/
    单 PUBLISHED 置空两分支）；非 PUBLISHED 400；MEMBER/owner 403（非平台面）；reason 空 400；
    审计行；yank 后下载拒——T14 联动测试放 T14）
- **Steps**：TDD
- **Assert**：yank 全断言绿；latest 重算排序正确（publishedAt 最大者）
- **Commit**: `feat(server): add version yank with latest re-pointing`

#### T9 删除面放宽 + 资产删除条件升级（design §3.4/§4.2 R5/R10）
- **Files**
  - Modify: `apps/server/src/assets/errors.ts`——`draft_only` → `version_not_deletable`
    （语义迁移：禁删态明示；删除面放宽）；httpStatusForAsset switch 更新 + 新码
    `asset.has_yanked`（400——资产删除增 YANKED 检查）
  - Modify: `apps/server/src/assets/versions.ts`（deleteVersion 扩展）——可删判定分治（design §3.4
    R5）：上传者本人可删自己 DRAFT/SCAN_FAILED；owner/空间 ADMIN+ 可删 DRAFT/SCAN_FAILED/
    REJECTED/UPLOADED；PENDING_REVIEW/PUBLISHED/YANKED → 400 `version_not_deletable`；
    SCAN_FAILED 删除连带无 review_task（无历史）；REJECTED/UPLOADED 删除前清 review_task 行
    （skillhub 同构——deleted task 的审核事件仍在 audit_log）
  - Modify: `apps/server/src/assets/service.ts`（deleteAsset 条件升级）——无 PUBLISHED **且无
    YANKED** 才可删（有 YANKED → 400 `asset.has_yanked`）；代码落点查 assets.ts DELETE 端点现状
    （条件在服务层 or 路由层——M2 T4 实现位置对齐）
  - Modify: `apps/server/src/assets/versions.ts` 上传预检（T13 顺带？SCAN_FAILED 重传豁免在 T13
    上传扩展做——本 Task 只删除面）
  - Test: 续 `assets/versions.test.ts`/`service.test.ts`（删除矩阵：上传者删 DRAFT/SCAN_FAILED 成功、
    REJECTED 403（非管理面）；owner 删 REJECTED/UPLOADED 成功连带 task 清行；PENDING_REVIEW 删
    400 version_not_deletable；资产删——有 YANKED 400 has_yanked；draft_only 引用清理）
- **Steps**：TDD；draft_only 码迁移需全局搜引用（测试 + 路由）一并清理
- **Assert**：删除矩阵全绿；旧码无残留引用（grep draft_only 空）
- **Commit**: `feat(server): broaden version delete scope and guard asset delete`

### 板块 C 标签管线（design §5 R11）

#### T10 label 域服务 + 管理 API（design §5；06 §2/§3/§5.2）
- **Files**
  - Create: `apps/server/src/labels/errors.ts`——label 域码：`label.not_found`(404) /
    `label.parent.has_children`(400) / `label.slug_taken`(409) / `label.limit_exceeded`(400) /
    `label.invalid_parent`(400——锁两级校验错)（design §9；06 §5.2 规则落地，slug_taken 为 06 补码）
    + switch + LabelError
  - Create: `apps/server/src/labels/service.ts`——定义 CRUD：createLabel（slug/type/parentId 按
    slug 解析/translations[]/visibleInFilter/sortOrder；锁两级：parent 须一级、不自指、slug 全局
    唯一预检 409——DB 23505 兜底）· updateLabel（二级可换域、一级不可降级）· deleteLabel
    （带子级拒 has_children——DDL RESTRICT 兜底；级联删 asset_label——搜索 join 实时无重建，
    design §5）· reorder（sortOrder 批量落位）· listPublicLabels（RECOMMENDED + visible_in_filter，
    displayName 回退 locale→slug，parentId slug 化）· 翻译随定义一次写全（locale UNIQUE 冲突
    更新 or 删重建——实现定：upsert）
  - Create: `apps/server/src/http/labels.ts`（SUPER_ADMIN 面：POST /api/labels / PATCH
    /api/labels/{slug} / DELETE /api/labels/{slug} / PUT /api/labels/order——requirePlatformRole
    SUPER_ADMIN；公开 GET /api/labels 匿名）
  - Modify: `apps/server/src/app.ts`（挂载）
  - Test: `src/labels/service.test.ts` + `src/http/labels.test.ts`（两级树校验矩阵：parent 非一级
    拒/自指拒/二级挂二级拒/换域成功；删父带子拒；翻译回退链；公开列表只含 RECOMMENDED+visible；
    slug 冲突 409）
- **Steps**：TDD
- **Assert**：06 §5.2 校验矩阵全绿；审计 label.* 埋点（create/update/delete）
- **Commit**: `feat(server): add label management api`

#### T11 资产挂载 API + 详情 labels（design §5；06 §3/§5.3）
- **Files**
  - Modify: `apps/server/src/labels/service.ts`（或新 attach.ts）——`attachLabel(db, {assetId,
    labelSlug, actorId, nsRole, isSuperAdmin})`：label type 分判——RECOMMENDED：canManageAsset
    （owner/空间 ADMIN+）+ 超管短路；PRIVILEGED：仅超管（06 §3）；≤10 上限（超 → 400
    label.limit_exceeded）；重复挂幂等 200（UNIQUE 兜底——已存在即返回成功，design §5 R11）；
    `detachLabel`（同权限）
  - Modify: `apps/server/src/http/assets.ts`——`PUT/DELETE /api/assets/{ns}/{slug}/labels/
    {labelSlug}`（requireAuth + canManageAsset 组装 + 超管短路——挂载端点 viewer 上下文复用）；
    资产详情响应补 `labels[]`（挂载 slug 全量——join asset_label；列表项不含，design §5）
  - Test: `src/http/assets.test.ts` 扩展（RECOMMENDED：owner/MEMBER-owner/空间 ADMIN 成功；
    MEMBER 非 owner 挂他人资产 403；PRIVILEGED 非超管 403；>10 上限 400；重复挂幂等 200；
    详情 labels[] 断言；审计 asset.label_attach/detach）
- **Steps**：TDD
- **Assert**：挂载矩阵全绿；详情 labels 与挂载一致
- **Commit**: `feat(server): add asset label attach api`

### 板块 D 搜索（design §6 R12）

#### T12 GET /api/assets 搜索扩展（q/label 过滤）
- **Files**
  - Modify: `apps/server/src/http/assets.ts`——listQuerySchema 扩展：`q`（string ≤128——name/
    description/searchText 三字段 ILIKE %q%，drizzle `ilike` 或 sql lower like；转义 %/_——
    实现用 ilike + escape）· `label`（多值 slug 数组——query 重复键 or 逗号分隔——实现定：重复键
    `c.req.queries('label')`；asset_label join + inArray 命中任一即中（06 §4 多值 OR——前端负责
    父级后代展开））
  - Modify: `apps/server/src/assets/service.ts`——listViewableAssets 扩展（q 条件 and() 组合 +
    label join；分页排序 `updated_at desc` 默认；既有 nsSlug/type/visibility/登录限定维持——
    design §6 R12；条件组合 and()/or() 铁律——drizzle 实证 bug 防再犯）
  - Test: `src/http/assets.test.ts` + `service.test.ts` 扩展（q 命中 name/description/searchText；
    % 转义；label 单值/多值 OR；q+label+type 组合；无结果分页 total 0）
- **Steps**：TDD；先读 listViewableAssets 现签名（M2 读面过滤——扩展前置）
- **Assert**：组合过滤断言全绿；旧过滤参数行为不回归
- **Commit**: `feat(server): add asset search with label filter`

### 板块 E 下载与统计（design §7 R13）

#### T13 上传顺存 bundle 副本（design §7.1）
- **Files**
  - Modify: `apps/server/src/assets/versions.ts`——createVersion 扩展：校验通过后原 zip buffer
    put bundle（key `{namespaceId}/{assetId}/{versionId}/bundle.zip` 或同族约定——**key 与
    bundleStorageKey 列一致**）+ 计算 `bundle_sha256`（原包整体 hash——08 §5.3 zip 双通道承诺，
    design §7.1 R13）+ 落列；**SCAN_FAILED 同版本重传豁免**（design §3.4 R5：版本存在且
    status='SCAN_FAILED' 时豁免版本冲突预检——覆写行内容 + 重新 put 文件 + 状态回 DRAFT——
    事务内删旧 asset_file 行 + 存储 deleteMany 旧 key 或复用——实现定：删旧行/旧文件后按
    createVersion 主流程重建）
  - Modify: `apps/server/src/db/schema/assets.ts` 已在 T1（列已备）
  - Test: 续 `src/assets/versions.test.ts`（上传后 bundle_storage_key/bundle_sha256 落位断言 +
    bundle key 对象存在（storage exists）；SCAN_FAILED 版本重传成功回 DRAFT + 同号不再 409；
    PENDING_REVIEW/PUBLISHED 同号重传仍 409）
- **Steps**：TDD；createVersion 主流程重构注意事务边界（存储孤儿容忍纪律 M2 已定）
- **Assert**：bundle 双通道落位；SCAN_FAILED 豁免矩阵绿
- **Commit**: `feat(server): store bundle copy on upload with scan-failed resubmit`

#### T14 下载端点（design §7.2）
- **Files**
  - Modify: `apps/server/src/http/assets.ts`——`GET .../versions/{version}/download`：
    - 授权五档（design §7.2 R13）：PUBLISHED 按资产可见性（PUBLIC 匿名可下——匿名路径处理同
      详情）· UPLOADED/PENDING_REVIEW 预览授权集（owner/上传者/空间 ADMIN+/ASSET_ADMIN/
      SUPER_ADMIN——T6 态分类复用）· DRAFT/SCAN_FAILED/REJECTED → 400 version_not_published ·
      YANKED → 400 `asset.version_yanked`
    - bundle 取流：bundle_storage_key null → 400 `asset.bundle_missing`（理论不可达防御）——
      Local → storage.get 流式 pipe（Content-Disposition attachment filename=slug-version.zip）；
      S3（presignedGetUrl 非 null）→ 302 跳转（M1 SPI 双路径，design §7.1）
    - `download_count` 事务自增（授权通过即 ++——asset 行 update 自增）
    - 下载限流：独立 rateLimiter 实例 **60 次/分钟·IP**（env `DOWNLOAD_RATE_LIMIT_*` 可配——
      design §7.2 R13；app.ts 装配）
  - Test: `src/http/download.test.ts`（五档授权矩阵——匿名 PUBLIC 200/匿名 PRIVATE 403（资产读面
    access_denied）；YANKED 400 version_yanked；DRAFT 400 version_not_published；UPLOADED owner
    200/MEMBER 400；count 自增断言（两次下载 +2）；流式响应体与上传 zip 一致（byte 比对））
- **Steps**：TDD；先读 M2 上传端点 multipart/响应形态与 assets.ts viewer 组装
- **Assert**：授权矩阵全绿；下载字节一致；count 精确
- **Commit**: `feat(server): add version download with rate limit and counter`

### 板块 F API Token scope 过滤（design §8 R14）

#### T15 scope 注入 + 签发扩展 + 授权出口交集
- **Files**
  - Modify: `apps/server/src/http/token-middleware.ts`——token select 加 scope 列；scope 非空非
    'cli' 时解析（逗号分隔 permission code——trim 去空）注入 principal/context
    （`tokenScopes: Set<string> | null`——null = 全量（''/'cli'/无 scope））
  - Modify: `apps/server/src/http/tokens.ts`——POST body 扩展 `scope?`（校验：空或 permission code
    列表（ALL_PERMISSIONS 单源校验——非法码 400 request.invalid）；签发落库）
  - Modify: 授权出口收口（design §8 R14）——`scopeGate(required, tokenScopes)` helper（null 全量
    / 集合含码）：requirePermission 判定后 + **canManageAsset owner 分支 + 上传者本人例外路径**
    （visibility/status/资产删除/版本管理端点 = asset:manage；submit/withdraw = review:submit；
    yank 平台面 = asset:manage；label 挂载 = asset:manage——超管 + 收窄 scope = 收窄生效）
    ——落点：assets.ts 各端点管理判定处 + review 端点；**读面不 scope 化**（详情/版本读面/下载
    身份面——design §8）
  - Test: `src/http/token-middleware.test.ts` 扩展 + `src/http/assets.test.ts`（Bearer scope
    ''/cli 全量行为零回归；scope='asset:publish' token 上传 200、改 visibility 403；scope 空校验；
    非法码 400；owner + 收窄 scope 被拦——防白设断言）
- **Steps**：TDD；M1 token 测试（scope='' 断言）保持绿——兼容铁律
- **Assert**：M1 既有 token 行为零变化（回归绿）；收窄生效矩阵绿
- **Commit**: `feat(server): enforce api token scope on authorization`

### 板块 G 收尾（converge 前）

#### T16 冒烟 + 全量验证 + 规范同步项清单
- **Files**
  - 冒烟（本地 dev 库——真 PG 5433 + 登录态 API curl；三角色视角：上传者（MEMBER 建空间成员）、
    owner、审核（空间 ADMIN/ASSET_ADMIN）——用户会实跑验证，给分步手册）：
    上传 zip（DRAFT）→ 上传者本人 submit →（空间 ADMIN）队列可见 → approve → PUBLISHED +
    latest 指针 → 匿名下载 200 + count 增 → yank（ASSET_ADMIN）→ YANKED + 禁下载 → 资产删
    （有 YANKED 400 has_yanked）→ 标签挂载/搜索/scope token 收窄验证
  - 全量：`bun run --filter=@ai-asset-hub/server typecheck` + `bun test src/` 全绿 + `bun run lint`
  - 错误码穷尽检查：httpStatusForAsset/Review/Label switch 无漏（编译保证）+ grep 旧码
    draft_only 零残留
  - 规范同步项执行（design §13——M3 收尾 bump，随本 commit 或收尾 commit 一起）：
    00 §5 M3 行完成注记 + 治理语义（八态补全）· 01 §4 通道注记 · 05 §6.4（review:submit 上传者
    例外/隐藏行残留修正/scope 注记/防自审运营注记）· 06 Status + §5.2 搜索重建措辞简化 ·
    08 §7（八态 + 预览权授权集 + 五列进 §5.2 + 通道尾注）+ §9 security_audit 注记维持
- **Steps**：冒烟手册给用户分步执行（预期结果含）；全量验证绿后 converge 重评
- **Assert**：全量测试零新失败；冒烟手册每步预期命中；规范同步项 5 文件 bump 完成（版本头 +
  修订记录同步）
- **Commit**: `docs: close out M3 with spec sync`（或随冒烟验证后分 commit——按验证结果定）

## 3. 执行顺序与依赖

T1 → T2 → T3 → T4 → T6（预览权重构先行）→ T5（读面消费 T6）→ T7（HTTP 装配）→ T8 → T9 →
T10 → T11 → T12 → T13 → T14 → T15 → T16。
依赖注记：T5 实现前先 T6（详情含 version 读面复用）；T14 依赖 T13（bundle）与 T6（授权集复用）。

## 4. 验收断言（里程碑级）

- 全链：上传 DRAFT → submit → PENDING_REVIEW → approve → PUBLISHED（latest 指向）→ 匿名下载
  （count++）→ yank → YANKED（禁下载/latest 重算）→ 资产删除被拒（has_yanked）——冒烟手册全步
  预期命中
- 审核：防自审 403（本人审自己）、并发双审仅一人成功、withdraw 回 UPLOADED 再提交 version+1
- 读面：非授权者仅见 PUBLISHED/YANKED（未公开族零泄露——T6 回归断言）
- scope：M1 token（''/cli）零行为回归；收窄 token 写面被拦、读面可过
- 全量：server typecheck 0 + bun test 全绿（401 pass 基线 + 新增无回归）

## 5. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-08 | sunxuewen-rush | 初稿：M3 治理管线计划——design v1.2 定稿后 Task 清单化（板块 A-G 16 Task：八态迁移/扫描 SPI/review 域服务与读面/预览权重构/yank/删除面/标签/搜索/下载/scope/收尾） |
| v0.2 | 2026-09-08 | sunxuewen-rush | 执行完成注记：T1-T15 全绿（server 514 tests + typecheck 0，M2 401 基线零回归）；T16 规范同步 5 文件 bump（00 v1.11 M3 行完成 / 01 v1.6 八态注 / 05 v1.7 审核管线+scope+运营注 / 06 v1.3 标签管线落地 / 08 v1.4 八态+列+WITHDRAWN）；M3 实现实证修复 M1 bug ×2（asset.latest_version_id / label.parent_id bigserial 误用——迁移 0002/0003）+ design 矛盾 1（R4/R6 withdraw 删行 vs version 递增 → WITHDRAWN 保留行方案）；冒烟手册 §6（分步 curl 验证——用户实跑）；仓级欠账注：lint 全绿不达（biome 默认规则 vs M1/M2 既有 `!` 断言风格 + 全仓 format 未归一——非 M3 引入，待独立 chore/M6 对齐 biome 配置） |
| v0.3 | 2026-09-09 | sunxuewen-rush | 复盘修正收尾注：converge（scope owner 分支收窄全覆盖/下载限流 env 化/q 上限统一/audit 测试并发脆弱修复——design v1.5）+ label 对标 21-skillhub D1-D8（定义上限 env 化 LABEL_MAX_DEFINITIONS/管理面 slug 契约/翻译整组替换/locale 归一与预检/回退确定性/parent_id 索引 0004——06 v1.4/design v1.6）+ 二次复盘 R2 修正（blank 码 400 化——label.translation.blank）——520 tests 全绿 |

## 6. 冒烟手册（M3 手动验证——分步 curl，预期结果含）

前置：dev 库起（`docker compose up -d db`）+ `.env` 就绪 + `bun run db:migrate` + `bun run --filter=@ai-asset-hub/server dev`（:3000）；seed 首管理员（`SEED_ADMIN_USERNAME/PASSWORD`）。三角色：上传者（空间 MEMBER）/ owner / 审核（空间 ADMIN 或 ASSET_ADMIN 平台角色）。

1. **上传 → 提交审核**（上传者视角）：登录取 cookie → 建空间成员资产（坐标 POST /api/assets 需 asset:publish）→ 上传 zip（multipart POST versions/1.0.0，10MiB 内合法 skill 包）→ 预期 201/200 版本 DRAFT + bundle 顺存 → POST versions/1.0.0/submit → 预期 201 `{taskId, reviewVersion:1}`，版本态 PENDING_REVIEW
2. **审核队列 → 通过**（审核视角）：GET /api/reviews（审核面）→ 预期含该 task；POST /api/reviews/{id}/approve → 预期 200；资产详情（GET asset）→ `latest_version_id` 指向刚批版本；列表排序靠前（updated_at bump）
3. **公开下载**（匿名）：GET assets/{ns}/{slug}/versions/1.0.0/download → 预期 200 zip（content-disposition attachment）+ 资产 download_count +1；非授权者访问未公开族版本 → 400 version_not_published；PRIVATE 资产非成员 → 403 access_denied
4. **撤回分发**（ASSET_ADMIN）：POST versions/1.0.0/yank（body `{reason}`）→ 200 YANKED + latest 重算（多版本场景指回上一 PUBLISHED）；YANKED 下载 → 400 version_yanked；资产删除（DELETE asset）→ 400 has_yanked
5. **审核撤回**（提交人本人）：submit 后 withdraw → 204，版本回 UPLOADED；再 submit → reviewVersion 2（递增——WITHDRAWN 留档生效）
6. **标签**（SUPER_ADMIN）：POST /api/labels 建定义（RECOMMENDED + zh 翻译）→ 201；PUT assets/.../labels/{slug} 挂载（owner）→ 204；GET /api/labels（匿名）→ displayName 按 Accept-Language 回退；GET /api/assets?q=...&label=a → 过滤命中
7. **Token scope**：POST /api/tokens `{scope:['audit:read']}` → 201；Bearer 调 GET /api/audit → 200；调资产写面 → 403（交集拒）；缺省签发（''）与 Device Flow（cli）token → 全量行为不变（M1 回归）
8. **防自审/并发**：提交人本人 approve 自己 → 403 review.self_review；双审核人并发 approve 同一 task → 仅一人 200 另一人 400 review.not_pending

预期终点：以上每步状态码/响应字段与预期命中；错误码与文档 §9 一致（无 internal_error 500 路径）。
