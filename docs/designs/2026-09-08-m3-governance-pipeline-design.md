# M3 治理管线设计

> Date: 2026-09-08
> Updated: 2026-09-08（v1.6：复盘对标修正 label D1-D8；v1.5：converge 修正——§3.5 R6/§9 withdraw 语义从「删 PENDING 行」改「保留行置 WITHDRAWN」（T4 实现拍板——08 §6 重审递增契约优先于 skillhub 删行简化）；v1.4：T8 实现同步——version_not_yankable/yank_reason_required 补入错误码表（skillhub YankRequest 实证）；v1.3：T5 同步 access_denied；v1.2：Q1-Q3 拍板；v1.1：G8-G10 + 8 维 9.1；v1.0：R1-R15，见修订记录）
> Status: 定稿（2026-09-08：R1-R15 + grilling G1-G10/Q1-Q3 + 8 维自检 9.1；v1.3-v1.6 实现同步 + converge 重评 ≥9 + skillhub 对标修正——v1.6）
> Scope: M3 治理管线（00 §5）——SCANNING→PUBLISHED 六态推进（扫描/审核/发布）+ 已发布资产治理 + 标签管线 + 搜索 + 下载/统计 + API Token scope 过滤
> 对标源：21-skillhub（iflytek/skillhub，Apache-2.0）skillhub-domain/skillhub-app/skillhub-auth 源码级核对：SkillVersionStatus（八态 enum）· ReviewService / ReviewPortalAppService（提交/审核/撤回）· SkillGovernanceService（yank/withdraw/deleteVersion）· ApiTokenScopeService / RouteSecurityPolicyRegistry（scope 过滤）· 14-skill-lifecycle.md（状态语义参考——**发现文档-代码漂移：withdraw 文档写 PENDING_REVIEW→DRAFT，代码实际 →UPLOADED，以代码为准**）
> 引用链：本文档 → 规范 00 §2/§5/§7 · 01 §3/§4/§5 · 05 §5/§6 · 06 §1-§6 · 08 §2/§5/§6/§7/§9（引用不复制，字段与规则以规范为准）

## 1. 背景与文档定位

M2 已落地资产域闭环：坐标注册、三族校验器、上传即 DRAFT + 版本读面/删除、OWNER 转让、审计补全——
**08 §7 六态在 M2 只走到 DRAFT**。M3 承接 DRAFT 之后的状态推进与分发面。

前置已就绪（M1/M2 落库，M3 消费）：
- 表：`review_task`（PENDING 部分唯一索引防并发双待审）· `label_definition/translation/asset_label` 三表 · `asset.latest_version_id`（无 DB FK，应用层回填）· `asset.download_count` · `audit_log`（08 §2/§5/§6）
- 判定链：`RbacService.can`（05 §6.3 七步）+ `isSelfReview` 助手（05 §6.4，SUPER_ADMIN 例外由调用方放行）+ `canManageAsset`（M2，owner/空间 ADMIN+ 组合）
- 错误码：`assets/errors.ts` + `httpStatusForAsset` 穷尽 switch（新增码漏映射即编译错）
- 存储：`ObjectStorage` SPI 含 `presignedGetUrl`（Local 返回 null → 服务端流式兜底）+ `deleteMany`；上传逐文件存 `{namespaceId}/{assetId}/{versionId}/{path}`（M2 key 规则）

流程定位：本 design（决策档案，R1-R15）→ docs/plans/M3-governance.md（任务清单，引用本文 §N）→ 编码测试
→ 收尾 converge。被否决方案不写入本文档（拍板后清理论证残留）。

**对标基线（skillhub 源码实证结论）**：skillhub `SkillVersionStatus` 实为八态 enum——
`DRAFT/SCANNING/SCAN_FAILED/UPLOADED/PENDING_REVIEW/PUBLISHED/REJECTED/YANKED`，**前六态与 AIH 完全同源**。
AIH 六态缺的是同源八态的后两位（REJECTED/YANKED）——M3 的归置是**补全**而非引入外部模型。
`ReviewService.submitReview` 源码注释「Support both DRAFT (legacy) and UPLOADED (new flow) status」
——AIH 的 UPLOADED 恰为 skillhub 新流前态，六态建模与 skillhub 演进方向一致。

## 2. 里程碑范围（R1）

**M3/M4 边界**：M3 = 后端治理管线全 API（审核队列/标签/搜索/下载/scope 均为 API 面，登录态可 curl
冒烟——M1 R7 先例：无前端阶段不造假页面）；市场门户与审核 UI 归 M4 web。
**后置清单（不在本 plan）**：promotion 提升申请（05 §6.4 asset:promote/promotion:approve 权限行已
在，`promotion_request` 表 08 §9 随对应服务引入——后置，M3 行未点名）；stable/beta 自定义通道挂载
管理面（R15 定：M3 只落 latest 自动维护，挂载面后置）；CLI 端点面（M5）。

**00 §5 文案（随 M3 收尾 bump）**：M3 行完成注记 + 治理语义展开。

## 3. 版本状态推进（六态 → 八态补全，审核管线）

### 3.1 提交时序（R2）

- 上传仍落 DRAFT（M2 遗产不推翻）。M3 新增显式**提交审核**动作：
  `DRAFT/UPLOADED → PENDING_REVIEW`（单事务：版本状态 + review_task 行，PENDING 部分唯一索引兜底并发）。
  skillhub 同构：submit 合法前态 = DRAFT(legacy)/UPLOADED(new flow)。
- **UPLOADED 的产生路径（R2 拍板已定）**：M2 只走 DRAFT；M3 中 UPLOADED 由**撤回提审**
  回退产生（3.5——曾提交、内容定稿、当前不在审核队列的停留态，可再次 submit 或保持）；未来
  真扫描器引入后增加第二条路径（DRAFT → SCANNING 通过 → UPLOADED 等待显式提审——08 §7 图
  主链）。M3 直通扫描下仅 withdraw 一个入口；UPLOADED 的读面/下载权按 08 §7「包可下载但未进
  审核」语义落地（R7/R13）。
- **扫描位置**：提交动作内同步执行 `Scanner` SPI（见 R3）。M3 内置直通实现（恒通过）——
  单事务内跃迁直写 PENDING_REVIEW，**SCANNING/SCAN_FAILED 不落中间态行**（无观察窗口不落库；
  状态位与读面契约保留，供未来异步真扫描器（M6 安全扩展）使用——届时 SCANNING 为外部可见
  进行中态，SCAN_FAILED 为失败留档态，读面/错误码已备）。
- **重复提交边界**：同版本已 PENDING（部分唯一索引防并发双待审）再次 submit → 业务预检 400
  `review.already_pending`（DB 23505 兜底，不落第二行）。
- 权限（review:submit，05 §6.4）：owner 本人 / 空间 ADMIN/OWNER / ASSET_ADMIN/SUPER_ADMIN
  ——**补例外**：版本上传者本人可提交自己的 DRAFT/UPLOADED 版本（开放协作闭环：MEMBER 贡献
  的草稿不能卡死在提审权上；与 M2「DRAFT 上传者本人可删」对称，05 §6.4 收尾同步）。

### 3.2 扫描器 SPI（R3）

- 定义 `Scanner` SPI（validate 模块同构扩展）：`scan({ type, manifestJson, files }) → { ok, findings[] }`，
  注册表 `scanner` 单实现直通（记录 findings 空数组）。契约纯 error/finding 数组，无 warning 级。
- `security_audit` 表**不随 M3 落库**（08 §9「随对应服务引入」= 真扫描器引入时；M3 直通扫描无
  findings 可落，不为空转机制造表——M2 v1.2 砍 warnings 先例同精神）。

### 3.3 审核判定与防自审（R4）

- 审核人池 = 具 `review:approve` 者（空间 ADMIN/OWNER 或 ASSET_ADMIN/SUPER_ADMIN——05 §6.4）。
  无指派模型（skillhub 同构：任何可审者可审 PENDING 任务，部分唯一索引防并发双审）。
- approve：`PENDING_REVIEW → PUBLISHED` + review_task APPROVED（reviewed_by/comment/时间落位）+
  `published_at = now` + **`asset.latest_version_id = 该版本`**（skillhub 14 §4.2 同构：审核通过
  即指针指向；发布时序即最新，yank 时重算）。
- reject：`PENDING_REVIEW → REJECTED`（R5）+ review_task REJECTED；comment 必填（skillhub
  RejectReviewRequest 同构——拒绝须给理由，修正方据理由改）。
- 防自审：approve/reject 前 `isSelfReview(submittedBy, reviewedBy, isSuperAdmin)` 判定——
  SUPER_ADMIN 例外由调用方显式放行（05 §6.4；M1 助手已备，此处消费）。
- **事务与并发边界**：approve/reject 为单事务（review_task 状态 + 版本状态 + latest 指针原子）；
  双审核人并发以**条件更新**防竞态（UPDATE review_task SET … WHERE id=? AND status='PENDING'
  RETURNING——0 行即 400 `review.not_pending`，另一审核人已结案）。
- **review version 重审语义**（08 §6「重审计数递增」）：同版本 withdraw 后再 submit → 新
  review_task.version = 该版本历史 task 最大 version + 1（首次 submit = 1）；approve/reject 落
  当前 task.version。

### 3.4 审核拒绝与扫描失败后的版本去向（R5）

- **REJECTED = 版本态补全**（08 §7 六态 → 八态，skillhub 同源补全；状态列 VARCHAR + zod 枚举
  **加值零迁移**——08 §2 实现形态先例）。REJECTED 版本保留留档（审核历史可查：review_task
  REJECTED + comment；重审 version 递增语义见 R4）。
- **修正路径分治（R5 拍板已定）**：08 §7 图「SCAN_FAILED 修正后回 DRAFT/UPLOADED」语义忠实 + 审核
  留档防篡改两权分治）：
  - `SCAN_FAILED`（无审核历史——scan 在 submit 事务内、失败未建 review_task）→ **同版本修正
    重传**：上传端点对 SCAN_FAILED 版本豁免版本冲突预检（M2 版本不可覆写仅约束已发布/在审
    内容——扫描失败内容零历史，覆写无篡改风险；重传后状态回 DRAFT 再提审）。
  - `REJECTED`（有 review_task 留档）→ **修正 = 新版本号重传**（覆写会篡改审核留档指向的
    内容）；原被拒版本留档，管理面可删腾号后同号重传由删除路径覆盖。
- **删除权（M2「DRAFT 上传者本人可删」例外的分治扩展）**：
  - 版本上传者本人可删：`DRAFT / SCAN_FAILED`（未进审核流程的草稿族——M2 例外 + 对称扩展，
    开放协作撤回语义）；
  - owner/空间 ADMIN+（canManageAsset）可删：`DRAFT / SCAN_FAILED / REJECTED / UPLOADED`
    （REJECTED 留档删除 = skillhub deleteVersion 可删面同构——审核**事件**仍在 audit_log 长存
    （review.reject 动作），review_task 流程实体随版本删（删前按版本清任务行——08 无 ON DELETE，
    skillhub 同构注释「review history FK must not outlive the version」）；UPLOADED = M2 遗产
    「进 UPLOADED+ 后删除回管理面」）；
  - 禁删：`PENDING_REVIEW`（审核中禁删——skillhub deleteVersion 同构：先 withdraw 回 UPLOADED
    或审核结案；防审核时内容蒸发）· `PUBLISHED/YANKED`（已分发留档，4.1/4.2）。
  - M2 `asset.draft_only` 码语义过窄 → M3 迁移为 `asset.version_not_deletable`（400，禁删态
    明示；权限面不足仍走 403 access_denied）。

### 3.5 撤回提审（R6）

- withdraw：`PENDING_REVIEW → UPLOADED`（skillhub 代码实证——14 文档写 DRAFT 是漂移，以代码
  为准；UPLOADED = 「包可下载但未进审核」中间带，与 AIH 六态语义精确吻合）+ review_task
  **保留行置 WITHDRAWN**（converge 修正——T4 实现拍板：初版按 skillhub 删 PENDING 行，但删行会
  清空历史导致 08 §6「重审计数递增」（依赖历史行 max）落空——AIH 自有契约优先，改保留行置
  WITHDRAWN 四态（zod 加值零 DB 迁移）；部分唯一索引仍只锁 PENDING 防并发双待审；审核留档增强）。
- 权限：提交人本人（skillhub 同构：withdraw-review 仅提交人）+ asset owner + 空间 ADMIN/OWNER
  （管理面可撤空间内任意待审——防提交人失联卡队列；withdraw 非破坏可逆，管理面宽放无碍）。

### 3.6 审核预览权（R7/08 §7 补注兑现「UPLOADED 起预览权同构扩展」）

- 授权集扩展（**元数据读面** = 详情/manifest/文件清单预览；zip 下载权独立分层见 §7.2——
  两权分离；M2 注「UPLOADED 起预览权同构扩展」指读面）：
  - `UPLOADED/PENDING_REVIEW`（+ SCAN_FAILED/REJECTED，未公开留档族）= 资产 owner + 版本
    上传者（提交人）+ 空间 ADMIN/OWNER + ASSET_ADMIN/SUPER_ADMIN（审核人池）；
    其余 → 列表过滤 + 详情 400 `asset.version_not_published` 明示（M2 同语义维持）。
  - 实现注：扩展集 = M2 DRAFT 授权集 ∪ 平台审核角色（空间 ADMIN/OWNER 已在 DRAFT 集内）。
    **现有实现陷阱（M2 version-read.ts 源码实证）**：`canViewDraft`/`draftVisibleWhere` 目前是
    「status ≠ DRAFT → 全可见」白名单假设（M2 只有 DRAFT/PUBLISHED 两态故成立）——M3 八态下该
    假设会让 UPLOADED/PENDING_REVIEW/SCAN_FAILED/REJECTED 对可读资产者全泄露；实现须重构为
    显式态分类：授权者全见 / 非授权者仅 PUBLISHED+YANKED（YANKED 详情公开留档并入曾公开族）。
- 审核详情（review 详情端点）含版本 manifest/文件清单 sha256——审核人可见待审包内容（skillhub
  ReviewSkillDetailAppService 同构：审核人预览权）。

### 3.7 审核队列 API（R8）

- skillhub ReviewPortalAppService 读面形态：listReviews(status, namespace) / listPendingReviews
  (namespace) / listMySubmissions / getReviewDetail —— AIH 对应（§9 接口表）。

## 4. 已发布资产治理

### 4.1 撤回分发 yank（R9）

- **YANKED = 版本态补全**（八态末位；skillhub 同源）。动作：`PUBLISHED → YANKED`，仅
  ASSET_ADMIN/SUPER_ADMIN（05 §6.4「撤回已发布版本」行——平台治理面最严；owner 下线自己资产
  走资产级 HIDDEN，M2 T4 已可，语义分界见 4.3）。
- 迁移：asset_version 加三列 `yanked_at / yanked_by / yank_reason`（skillhub SkillVersion 同构——
  撤回留痕）；reason 必填（调用方校验）。
- **latest 指针重算**（yank 命中 latest 时）：剩余 PUBLISHED 中取 `published_at` 最大 → `created_at`
  → `id`（skillhub findLatestPublishedVersionId 排序同构）；无 PUBLISHED → 置空。
- 审计 `asset.version_yank`（detail: reason）——skillhub YANK_SKILL_VERSION 对齐。
- 读面：YANKED 版本详情**公开留档**（曾发布内容不静默消失，列表可见带状态标注）但**不可下载**
  （skillhub downloadReady=false 语义等价）；错误码新加（§9 错误码表）。
- 存储清理：yank 不删文件（留档）；资产删除才清（4.2）。

### 4.2 资产删除治理出口（R10）

- M2 条件「仅无 PUBLISHED 版本可删」升级为「**无 PUBLISHED 且无 YANKED**」（曾分发的版本
  一律禁删，防下载史/审计断链）——新错误码 `asset.has_yanked`（400，穷尽 switch 编译保护）。
- 治理出口 = 资产级 `ARCHIVED`（canManageAsset 已可，M2 T4）+ 版本级 YANKED——物理删除仅限
  纯草稿族资产（DRAFT/SCANNING 等未公开族），与 skillhub「无容器删除、靠归档」同方向。

### 4.3 资产级 vs 版本级治理分界（规范同步项 05 §6.4 隐藏行）

- 资产级 `HIDDEN/ARCHIVED`（作用于整体读面，M2 T4 已实现判定 canManageAsset = owner/空间
  ADMIN+——含隐藏/归档/恢复）。
- 版本级 `YANKED`（从分发通道移除单个版本）——平台治理面 ASSET_ADMIN/SUPER_ADMIN。
- 05 §6.4「隐藏/恢复资产 = 仅 SUPER_ADMIN」行是 M2 v1.4 判定修正（状态治理归 ADMIN+/owner）后
  的**残留**（M2 converge 未清）——M3 收尾规范同步删除该行或改为「平台级隐藏（跨空间）」措辞，
  消除规范-实现张力（挂账项 H 闭环）。

### 4.4 版本通道（R15：08 §7 尾注「M3 定」落实）

- `latest` 自动通道：只读跟随最新 PUBLISHED（01 §4）——M3 通过两处自动维护：approve →
  latest 指向新发布版本（3.3）；yank 命中 latest → 重算/置空（4.1）。存储 = `asset.latest_version_id`
  列（M1 已备，无 DB FK 应用层回填），**零新表**。
- `stable/beta` 等自定义通道挂载管理面（含存储形态 asset_version_tag 或列扩展的选择）**后置**
  （M4 前端/M5 CLI 有消费面再立，届时按需加迁移）——08 §7 尾注「M3 定」落实为：M3 定案 =
  通道只做 latest 自动维护、自定义通道后置（08 尾注同步改写，不留「待定」）。
- 回滚语义（01 §4「回滚走自定义标签」）：M3 期间的版本回退 = yank 新版本（回退到旧 PUBLISHED
  由 latest 重算自动完成——yank 新版后 latest 自动指回旧版，消费端无感回退）。

## 5. 标签管线（R11：06 全量落地）

- 管理 API（SUPER_ADMIN——硬判定短路即可，**零新权限码**；06 §3 与 05 角色矩阵核对无缺口）：
  label 定义 CRUD + 翻译随定义一次写全（body 带 `translations: {locale, displayName}[]`，**提供即整组替换**
  ——skillhub replaceTranslations 同构，删未列 locale 使移除翻译可达——D3 对标修正）+
  `PUT /api/labels/order` 批量排序。校验规则按 06 §5.2：锁两级（parent 须一级、不自指、一级不
  可降级、二级可换域）、删一级带子级拒 `label.parent.has_children`、parent 不存在
  `label.not_found`（06 码）。**定义总数上限 100**（skillhub label.max-definitions:100 同构——
  `label.definition_limit_exceeded`——D1 对标补）。翻译入参 locale 归一（_→- 小写 07 BCP47 +
  同批重复预检 `label.translation.locale_duplicate`——D4/D8）。管理面响应 `parentId` = **父 slug**
  （skillhub LabelDefinitionResponse 同构——入参/响应 slug 契约自洽——D2）。
- 公开 `GET /api/labels`（06 §5.1：仅 RECOMMENDED + visible_in_filter；displayName 回退链
  locale → slug——07 §4 语义；parentId 用父 slug 字符串）。
- 资产挂载 `PUT/DELETE /api/assets/{ns}/{slug}/labels/{labelSlug}`（06 §5.3）：
  - RECOMMENDED：判定 = canManageAsset（owner/空间 ADMIN+ 组合，M2 helper 复用）+ SUPER_ADMIN
    短路；PRIVILEGED：仅 SUPER_ADMIN。层级无关（06 §3 注：只看 label.type）。
  - 上限 ≤10（06 §1——超限 400 `label.limit_exceeded`）；UNIQUE(asset_id, label_id) 兜底；
    重复挂 = **200 幂等**（已挂即返回成功——避免前端竞态，语义与 06「挂载面宽」一致）。
- 搜索联动：挂载 join 实时生效（无独立索引）——06 §5.2「删 label 触发搜索文档重建」在 AIH =
  **级联删 asset_label 行即完成，无重建步骤**（06 措辞为索引型思维残留，收尾 bump 简化）。
- 审计：label 定义 CRUD + 挂载/移除全部埋点（00 §2.2 全链路——M2 §8 纪律延续）。
- 资产详情响应补 `labels[]`（挂载 slug 全量——06 §5.1 注：PRIVILEGED 不混入公开列表但详情
  chip 按实际挂载生效）；列表项 M3 不含 labels（分页聚合面 M4 前端需求再补，防过度设计）。

## 6. 搜索（R12）

- 形态：**PG 内实现**，不引外部索引（skillhub 独立 skillhub-search 模块是重索引架构——
  AIH 自托管轻量定位下的有意裁剪：searchText ≤500 的规模 PG 足够；查询收在服务层，将来可替换
  索引不动 API）。
- `GET /api/assets` 扩展参数：`q`（name/description/searchText 三字段 ILIKE %q%，q 超长截断至
  100 字符——schema max(100) 防滥用）、
  `label`（多值 OR——06 §4「选中节点 + 全部后代」展开由前端合并传多值，后端接收 slug 数组做
  asset_label join inArray 命中任一即中）。既有 nsSlug/type/visibility 过滤保留（and() 组合——
  drizzle 条件组合铁律）。分页 limit/offset 沿用。排序：`updated_at desc`（默认，保持简单；
  相关度排序 M4 前端有需求再议）。
- 列表/搜索登录限定维持 M2 拍板（防爬虫面）；PUBLIC 详情匿名可读不变（00 §2.3）。

## 7. 下载与统计（R13）

### 7.1 下载组装

- M2 上传只存逐文件（`{ns}/{asset}/{version}/{path}`），未留原 zip。M3 下载需要 zip 包：
  - 方案：**上传时顺存 bundle 副本**——M2 上传端点已持有完整 zip Buffer（multipart 原包，
    createVersion file: Buffer），零额外压缩成本地多一次 put；`asset_version` 加列
    `bundle_storage_key` + `bundle_sha256`（迁移；不用约定 key——防包内同名文件冲突，列最直白；
    **bundle_sha256 = zip 整体哈希——08 §5.3「zip 与逐文件双通道均可用」的 zip 通道校验承诺**，
    上传时对原包 buffer 计算落列，客户端下载后可验 zip 完整性）。
  - 下载 = 单对象转出：Local → 服务端流式（storage.get 读流 pipe）；S3 部署 → `presignedGetUrl`
    302 直链（M1 SPI 已备，Local 返回 null 走流式兜底——双路径路由层统一）。
  - skillhub 单 bundle 存储（buildBundleStorageKey）是它的形态；AIH 逐文件（M2 拍板遗产）+
    bundle 副本 = 双通道（逐文件 sha256 仍可核对，bundle 直下）——skillhub 亦是 bundle + 逐文件
    sha256 索引双通道，结构对齐。

### 7.2 授权与计数

- 下载授权（zip 分档——08 §7 状态语义忠实落地）：
  - `PUBLISHED`：按资产可见性公开下载（PUBLIC 匿名可下——00 §2.3「公开资产匿名可浏览/下载」）
  - `UPLOADED`：08 §7「包可下载但未进审核」落地——预览授权集可下载（withdraw 回退的定稿
    内容供自查/备份）
  - `PENDING_REVIEW`：预览授权集可下载（审核人需取真包审内容——文件清单 sha256 验结构不验
    内容；上传者/管理面自查同）
  - `DRAFT / SCAN_FAILED / REJECTED`：禁下载 → 400 `version_not_published`（未公开留档族——
    M2 明示语义维持；自查走详情端点 manifest/文件清单，M2 T14 已供）
  - `YANKED`：禁下载 → 400 `asset.version_yanked`（曾公开但已撤回分发；详情留档只读）
- `download_count` 事务自增时机：授权通过即 ++（同一下载请求内事务——08 §2 计数冗余纪律）。
- 防刷：下载限流——rateLimiter 独立实例，**默认 60 次/分钟·IP**（匿名公开下载面；env 可配
  `DOWNLOAD_RATE_LIMIT_*`——skillhub DownloadRateLimitProperties 可配同构；M2 上传限流先例）。
- 下载动作**不入 audit_log**（audit_log = 治理审计非访问日志；统计由 download_count 冗余列承担，
  08 §2 计数冗余纪律；skillhub 亦不因下载刷审计）。

## 8. API Token scope 过滤（R14，M1 R7 挂账清账）

- **兼容基线**：M1 已签发/新签发默认 `scope = ''`（空串注释语义 = 全量，M1 拍板承诺）；
  Device Flow CLI token `scope = 'cli'`（仅标注）。**空与 'cli' 维持全量**（M1 行为零变化——
  过滤开启不破坏既有 token）；新增能力 = 签发时可设收窄 scope（POST /api/tokens body 扩展
  `scope?`）。
- **scope 值域**：逗号分隔 permission code（`asset:publish,review:submit`…——PERMISSIONS 十码
  单源，非 skillhub JSON 数组+端点白名单模式——AIH 是 permission + 业务判定模型，白名单式
  重构推翻 M1 RBAC 判定链，大手术不做；permission 交集与既有判定链融合是贴 AIH 的最小面）。
- **过滤规则**：Bearer 请求且 scope 非空（非 ''/cli）时，**授权出口取交集**：
  ① `requirePermission` 判定（can() 结果 && scope 含对应 permission）；② **owner 业务分支**
  （canManageAsset 的 owner 路径、上传者本人例外路径）要求 scope 含该端点核心权限码
  （visibility/status/删除 = `asset:manage`；submit/withdraw = `review:submit`；yank 平台面 =
  `asset:manage`；挂载 RECOMMENDED = `asset:manage`；PRIVILEGED/管理 API 超管面 =
  SUPER_ADMIN 无 scope 概念 → token 的权限 = user 权限 ∩ scope，超管 + 收窄 scope = 收窄生效）
  ——不覆盖 owner 分支则 scope 收窄形同虚设（对标 skillhub 白名单天然拦 owner 端点，此处是
  等价效果的最小实现）。
- **读面不 scope 化**：详情/版本读面/下载 = 身份面（token 即身份——M1 认证语义），收窄仅作用于
  写/管理动作（scope 挂账动机 = 「泄露=全量权限」，权限指写面；读面随身份是 M1 已有泄露面，
  不在本挂账范围——端点白名单式读面收窄超 M3 收益，不造）。
- 落点：tokenAuthMiddleware 读 token.scope 注入 principal；权限判定收口函数统一加 scope 校验
  （canManageAsset 等 helper 签名扩展或包装层——实现细则归 plan）。

## 9. 接口变更总览（M3 新增/扩展，前缀 /api 维持无版本化）

| 方法与路径 | 权限 | 说明 |
|-----------|------|------|
| POST /api/assets/{ns}/{slug}/versions（扩展） | asset:publish（空间成员） | 新增 SCAN_FAILED 同版本重传豁免（冲突预检豁免 → 覆写回 DRAFT，R5） |
| DELETE /api/assets/{ns}/{slug}/versions/{version}（扩展） | 上传者本人 / owner/空间 ADMIN+ | 可删面放宽：DRAFT/SCAN_FAILED（上传者本人）+ REJECTED/UPLOADED（owner/空间 ADMIN+）；PENDING_REVIEW/PUBLISHED/YANKED → 400 `version_not_deletable`（替代 M2 draft_only，R5） |
| POST /api/assets/{ns}/{slug}/versions/{version}/submit | review:submit（+ 上传者本人例外，R2） | DRAFT/UPLOADED → PENDING_REVIEW；同步扫描直通；建 review_task；非前态 400 `version_not_submittable` |
| GET /api/reviews | review:approve 面 / 本人 | 审核队列（status/namespaceSlug 过滤 + 分页——R8 三视图） |
| GET /api/reviews/{id} | review:approve 面 / 本人（submitted_by） | 审核详情：版本 manifest/文件清单 sha256（预览权 R7）+ review 历史（含重审 version 链） |
| GET /api/reviews/mine | 登录 | 我的提交（状态过滤） |
| POST /api/reviews/{id}/approve | review:approve + 防自审 | → PUBLISHED + latest 更新；comment 可空 |
| POST /api/reviews/{id}/reject | review:approve + 防自审 | → REJECTED；comment 必填 |
| POST /api/reviews/{id}/withdraw | 提交人本人/owner/空间 ADMIN+（R6） | PENDING_REVIEW → UPLOADED；review_task 保留行置 WITHDRAWN（留档保重审 version 递增） |
| POST /api/assets/{ns}/{slug}/versions/{version}/yank | ASSET_ADMIN/SUPER_ADMIN（05 §6.4） | PUBLISHED → YANKED；reason 必填；latest 重算 |
| GET /api/assets/{ns}/{slug}/versions/{version}/download | 按版本状态+资产可见性（R13） | zip 流出/直链；计数；限流 |
| DELETE /api/assets/{ns}/{slug}（条件升级） | canManageAsset | 增 YANKED 检查（R10：`asset.has_yanked` 400） |
| GET /api/labels | 公开 | 06 §5.1：RECOMMENDED + visible_in_filter |
| POST/PATCH /api/labels{/{slug}} | SUPER_ADMIN | 定义 CRUD（translations 随定义）+ 锁两级校验 |
| PUT /api/labels/order | SUPER_ADMIN | 批量排序 |
| PUT/DELETE /api/assets/{ns}/{slug}/labels/{labelSlug} | canManageAsset / 超管（06 §3） | 挂载/移除（RECOMMENDED vs PRIVILEGED 分判） |
| GET /api/assets（扩展 q/label） | 登录 | 搜索（R12） |
| POST /api/tokens（扩展 scope?） | 登录 | 签发可设收窄 scope（R14）；空/省略 = 全量兼容 |

错误码新增（分域单源：review/labels 域新 errors.ts，assets/errors.ts 扩 asset.* 族；protocol
同步面）：
- asset.*：`asset.has_yanked`（400——有曾分发版本禁删资产）· `asset.version_yanked`（400——
  YANKED 下载拒）· `asset.version_not_submittable`（400——submit 前态不符）·
  `asset.version_not_deletable`（400——PENDING_REVIEW/PUBLISHED/YANKED 禁删态；**替代 M2
  `asset.draft_only`**——删除面已放宽为 DRAFT/SCAN_FAILED 上传者可删 + REJECTED/UPLOADED 管理面
  可删，draft_only 语义过窄，实现期迁移清理）· `asset.bundle_missing`（400——bundle 缺失防御，
  M3 起上传恒有值，null 为理论不可达态——防 500 明示）· `asset.version_not_yankable`（400——
  yank 仅 PUBLISHED 生效，T8 实现补入）· `asset.yank_reason_required`（400——yank 理由必填，
  skillhub YankRequest 同构，T8 实现补入）
- review.*：`review.not_found`（404）· `review.already_pending`（400——同版本重复 submit）·
  `review.not_pending`（400——非 PENDING 不可审/撤/已被并发结案）· `review.self_review`
  （403——防自审；权限违背族，与 M2 access_denied 同层）· `review.comment_required`（400——
  reject 无 comment）· `review.access_denied`（403——审核详情/队列越权可见；对齐 skillhub
  review.no_permission（ReviewPortalAppService DomainForbiddenException 实证）——T5 实现补入）
- label.*（06 族）：`label.not_found` / `label.parent.has_children` / `label.slug_taken` /
  `label.limit_exceeded`（每资产 ≤10 挂载）/ `label.invalid_parent`（锁两级拒——parent 非一级/
  自指/一级降级/挂二级之下）/ `label.access_denied`（403——管理面非 SUPER_ADMIN 或 PRIVILEGED 挂载
  非超管——06 §3）/ `label.definition_limit_exceeded`（400——定义总数 ≤100——skillhub
  max-definitions 同构）/ `label.translation.locale_duplicate`（400——同批翻译 locale 重复——D4）

认证装配沿用 M1（Bearer 显式优先 → session 回退）；错误格式 07 §4；审计动作全部埋点（新增面：
asset.version_submit / review.approve / review.reject / review.withdraw / asset.version_yank /
label.* / asset.label_attach / asset.label_detach——skillhub REVIEW_*/YANK_SKILL_VERSION 对齐，
AIH 小写点分风格）。

## 10. UI-UX 变动总览

**无前端交付**（M3 后端里程碑，审核队列/搜索/详情交互 UI 随 M4 web 统一落地）；
本设计不含 UI-UX 变更。

## 11. 线框图

版本提交流转（原创自绘；状态机语义见 08 §7 + 本 design §3/§4；六态 → 八态补全）：

```text
DRAFT ──submit（同步扫描直通，SCANNING 瞬态）──► PENDING_REVIEW ──approve──► PUBLISHED ──yank──► YANKED
  ▲                                                    │          （ASSET_ADMIN+）        （末位态：详情留档、
  │                                                     │                                 禁下载、latest 重算）
  │（SCAN_FAILED 同版本修正重传：上传端点豁免冲突预检）    ├─reject（comment 必填）──► REJECTED
  │                                                     │                              （留档可查；
  │                                                     ▼                              修正 = 新版本号）
  │                                            （withdraw：提交人本人/owner/空间 ADMIN+）
  │                                                     │
  │                                                     ▼
  │                                               UPLOADED（退回停留态：可再次 submit；
  │                                                授权者可下载——08 §7「包可下载但未进审核」；
  │                                                未来真扫描器经此态等待显式提审）
SCAN_FAILED ◄── 扫描失败（未来真扫描器；M3 直通扫描不可达，契约保留）
（上传者本人/管理面可删）
```

状态/读面语义（授权集 = owner / 上传者 / 空间 ADMIN/OWNER / ASSET_ADMIN/SUPER_ADMIN）：
- 未公开族（DRAFT/SCAN_FAILED/REJECTED/UPLOADED/PENDING_REVIEW）：授权集可见（R7）；非授权者
  列表过滤 + 详情 400 version_not_published
- 曾公开族（PUBLISHED/YANKED）：按资产可见性公开详情；YANKED 禁下载（400 asset.version_yanked）
- zip 下载分档（§7.2）：PUBLISHED 公开 / UPLOADED·PENDING_REVIEW 授权集 / DRAFT·SCAN_FAILED·
  REJECTED·YANKED 禁下

scope 过滤判定链（R14）：

```text
Bearer token ──► tokenAuthMiddleware 读 token.scope
   scope = '' | 'cli' ──► 全量（M1 兼容，零变化）
   scope = 'a,b'  ──► principal.tokenScopes = {a,b}
授权出口（requirePermission / canManageAsset owner 分支 / 上传者例外）：
   出口所需码 ∈ tokenScopes 或 scope 全量 ──► 放行；否则 403 access_denied
```

## 12. 引用文件清单

- 规范层：docs/00-product-direction.md §2/§5/§7 · docs/01-asset-protocol.md §3/§4/§5 ·
  docs/05-identity-access.md §5/§6 · docs/06-label-system.md §1-§6 · docs/08-data-model.md
  §2/§5/§6/§7/§9
- 计划层：docs/plans/M3-governance.md（任务清单，实现时引用本文 §N——拍板后立）
- 前序档案：docs/designs/2026-09-08-m2-asset-domain-design.md（M2 后置清单/边界）·
  docs/plans/M2-assets.md（后置清单）· docs/designs/2026-09-08-m1-platform-foundation-design.md
  §6.7（scope 挂账 R7）
- 对标源：21-skillhub（iflytek/skillhub，Apache-2.0）：
  `server/skillhub-domain/.../domain/skill/SkillVersionStatus.java`（八态 enum）·
  `domain/review/ReviewService.java`（submit 前态/approve/reject）·
  `domain/skill/service/SkillGovernanceService.java`（yank/withdraw/deleteVersion/latest 重算）·
  `skillhub-app/.../service/ReviewPortalAppService.java`（审核队列动作+审计动作名）·
  `server/skillhub-auth/.../token/ApiTokenScopeService.java` + `ApiTokenScopeFilter.java`
  （scope 端点白名单模型——AIH 取 permission 交集最小面，差异见 §8）·
  `docs/14-skill-lifecycle.md`（语义参考；withdraw 漂移已以代码校正）
- 代码落点（M3 新建/扩展）：apps/server/src/review/（域服务：submit/approve/reject/withdraw/
  queue + errors.ts）· apps/server/src/scanner/（SPI + 直通）· apps/server/src/labels/（域服务 +
  errors.ts）· apps/server/src/http/{reviews,labels}.ts（路由组）· apps/server/src/http/assets.ts
  （submit/yank/download/label 挂载/搜索扩展/删除条件）· apps/server/src/assets/version-read.ts
  （预览权扩展——**前置：先读现有授权函数签名再改**，M2 T14 对齐先例）·
  apps/server/src/assets/{service,manage}.ts（删除条件/latest 回填/scope 收口）·
  apps/server/src/assets/errors.ts（draft_only → version_not_deletable 码迁移）·
  apps/server/src/http/token-middleware.ts + tokens.ts（scope 注入与签发扩展）·
  apps/server/src/db/schema/assets.ts（zod 枚举 + bundle/yank 列迁移）

## 13. 规范同步项（M3 收尾随 00 §5 注记一起 bump，不零敲碎打）

- 00 §5：M3 行完成注记 + 治理语义（八态补全已落）
- 01 §4：标签通道注记同步（latest 自动维护已落；stable/beta 挂载面后置——R15）
- 05 §6.4：review:submit 补「上传者本人可提交自己的 DRAFT/UPLOADED」例外（R2）；
  「隐藏/恢复资产仅 SUPER_ADMIN」残留行修正（4.3）；scope 行注记（§8 语义）；
  防自审运营注记（互审团队空间至少 2 个 ADMIN 级成员或平台审核人兜底；单人自托管 = seed
  首管理员 SUPER_ADMIN 例外放行——grilling Q1 拍板）
- 06：Status 定稿→管线已落地；§5.2「搜索文档重建」措辞简化（§5）
- 08 §7：六态 → 八态（REJECTED/YANKED 补注）+ 预览权授权集注记（R7）+
  yank 三列/bundle_storage_key/bundle_sha256 列进 §5.2 表 + 版本通道尾注同步（R15）；§9 治理
  扩展表注记（security_audit 仍后置）

## 14. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.6 | 2026-09-08 | sunxuewen-rush | 复盘对标 21-skillhub 源码修正（D1-D8）：§5 label 定义上限 100（definition_limit_exceeded）、翻译整组替换（PUT 语义——删未列 locale）、管理面响应 parentId = 父 slug（LabelDefinitionResponse 同构）、locale 归一与去重预检（_→- 小写/translation.locale_duplicate）；§9 label 码表补全（invalid_parent/access_denied/definition_limit_exceeded/translation.locale_duplicate——复盘发现 2 实现码未回写 + 对标补 2 新码） |
| v1.5 | 2026-09-08 | sunxuewen-rush | converge 修正：§3.5 R6 与 §9 接口表 withdraw 语义从「删 PENDING 行」改「保留行置 WITHDRAWN」（T4 实现拍板方案 A——08 §6 review version 递增契约（历史行 max）优先于 skillhub 删行简化；zod 四态零 DB 迁移；部分唯一索引仍只锁 PENDING；审核历史留档增强——对齐代码 review/service.ts withdrawReview 与 08 §6 v1.4） |
| v1.4 | 2026-09-08 | sunxuewen-rush | T8 实现同步：asset.version_not_yankable / asset.yank_reason_required 补入 §9 错误码表（yank 非 PUBLISHED 拒 + reason 必填——skillhub YankRequest 实证） |
| v1.3 | 2026-09-08 | sunxuewen-rush | T5 实现同步：review.access_denied（403——审核详情/队列越权可见；skillhub review.no_permission 源码实证对齐）补入 §9 错误码表 |
| v1.2 | 2026-09-08 | sunxuewen-rush | grilling 用户轮 Q1-Q3 拍板：审核运营模型确认（单人自托管 SUPER_ADMIN 例外闭环/互审团队空间 ≥2 ADMIN 级——05 同步项补运营注记）；label 不预置种子（运营数据）；asset.bundle_missing 防御码入错误码表 |
| v1.1 | 2026-09-08 | sunxuewen-rush | grilling 修复：G8 接口表 reviews/{id} 权限列精确化（review:approve 面 / 本人 submitted_by）；G9 下载限流补默认值（60 次/分钟·IP，env 可配）；G10 bundle 副本补 bundle_sha256 列（08 §5.3 zip 双通道校验承诺闭环）。体系对齐：8 维自检 9.1（简洁 9/极致 9.5/正确 9.5/一致 9/安全 9/前瞻 9/直白易懂 9/好维护 9——门禁措辞按 00 §7 8 维档） |
| v1.0 | 2026-09-08 | sunxuewen-rush | 评审拍板：R1-R15 全部采纳推荐值（无调整项）——拍板前草案迭代（v0.1）：对标 skillhub 源码实证（八态同源补全 REJECTED/YANKED、submit 前态、withdraw 回 UPLOADED、yank latest 重算、scope 白名单→permission 交集差异）+ 15 维自检 8.43→9.04 修复（UPLOADED 产生路径与 zip 下载分档、SCAN_FAILED 同版本修正重传 vs REJECTED 新版本号分治、删除权分治 + PENDING_REVIEW 禁删、审核并发与重审 version、错误码分域 + draft_only 迁移、幂等收敛、version-read 白名单陷阱标注） |
