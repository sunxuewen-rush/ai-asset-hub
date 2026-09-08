# M2 资产域实现计划

> Date: 2026-09-08
> Updated: 2026-09-08（v1.0：初稿——design 定稿后 Task 清单化）
> Status: 定稿（design 已定稿 2026-09-08；本 plan 任务清单引用 design §N，评审通过后执行）
> 引用链：本文档 → 设计 docs/designs/2026-09-08-m2-asset-domain-design.md（§N 逐 Task 引用）→ 规范 00 §5 · 01 §2/§3/§5/§6 · 02 §3 · 03 §3/§5 · 04 §3/§4 · 05 §5/§6 · 06 §5.3 · 08 §5/§7（引用不复制，字段契约以规范为准）
> 命名约定见 docs/plans/README.md

## 1. 目标与范围

**目标**：落地 M2 资产域——skill/mcp/agent 三类资产注册 + 族协议校验器 + manifest 解析投影
+ 版本上传（DRAFT）+ 版本/资产管理 + 空间 OWNER 转让 + 审计补全。前置已就绪：asset 三表 +
治理表（M1）、protocol 三族 zod + 错误码表单源、存储 Local SPI、RBAC 判定链 + audit writer。
范围与决策以 design 2026-09-08-m2-asset-domain-design.md 为契约（R1-R9 + Q1-Q5），本 plan 不复制决策。

**不含**（M3 治理管线）：SCANNING→PUBLISHED 流转、审核、搜索、下载/统计、标签挂载、
API Token scope 过滤、已发布资产下线/删除。

## 2. Task 清单

约定：每个 Task 完成 = 断言为真；commit 点为 Task 结束（Conventional Commits）。
代码提交前验证 = typecheck + 相关测试绿；**禁 mock 服务模块**（网络层可 stub 或真实 fake server）。

### 板块 A 资产注册与读面（design §3/§7）

#### T1 资产域服务：createAsset / 读面查询（坐标校验 + slug 冲突）
- **Files**
  - Create: `apps/server/src/assets/service.ts`——`createAsset(db, {namespaceSlug, slug, type, ownerId, visibility})`：
    - namespace 按 slug 查（404 `asset.namespace_not_found`）；type/slug 复用 protocol schema（slug 1-64）
    - `UNIQUE(namespace_id, slug)` 冲突预检 → 409 `asset.slug_taken`（DB 唯一键兜底：23505 捕获）
    - 插入 asset 行（owner_id=创建者，visibility 默认 PUBLIC，status ACTIVE，审计列）
    - `getAsset(db, namespaceSlug, slug)`（按坐标取，含 owner/visibility/status）
    - `listAssets(db, {limit, offset, namespaceSlug?, type?, visibility?})`（分页 + 简单过滤，design §9）
  - Create: `apps/server/src/assets/errors.ts`（新资产域错误码：asset.namespace_not_found / asset.slug_taken / asset.not_found / asset.forbidden / asset.no_published / asset.version_conflict / asset.draft_only）
  - Test: `src/assets/service.test.ts`（DB 集成）
- **Steps**：TDD——正：建空间后注册 skill 资产（坐标/owner/visibility 落位）；反：slug 冲突 409、namespace 不存在 404、slug 非法 400、type 非法 400
- **Assert**：注册行断言（owner_id/visibility 默认 PUBLIC/status ACTIVE）；冲突路径不产生脏行；type/slug 校验错误码正确
- **Commit**: `feat(server): add asset domain service`

#### T2 可见性读面过滤（08 §5.1 语义）
- **Files**
  - Create: `apps/server/src/assets/visibility.ts`——`canViewAsset(principal, asset, namespaceMemberRole?)`：
    - PUBLIC：全站（含匿名——M2 详情端点匿名可读 PUBLIC？design §9 GET 详情「按 visibility」，08 §5.1 PUBLIC=全站可见/匿名浏览（默认，00 §2.3）→ PUBLIC 匿名可读，但列表端点「登录」限定（防爬虫面）
    - NAMESPACE_ONLY：空间成员可读；PRIVATE：owner 或空间 ADMIN+（空间 OWNER 对空间内全部资产有完整管理权，05 §6.2）
    - ACTIVE 之外（HIDDEN/ARCHIVED）：仅 SUPER_ADMIN 可见（隐藏/归档语义，M1 注记）
  - Test: `src/assets/visibility.test.ts`（纯函数矩阵：PUBLIC/NAMESPACE_ONLY/PRIVATE × 匿名/成员/owner/ADMIN/超管）
- **Assert**：矩阵全覆盖；HIDDEN/ARCHIVED 对普通用户不可见（404 不泄露存在性）
- **Commit**: `feat(server): add asset visibility rules`

#### T3 资产 HTTP API：注册/列表/详情
- **Files**
  - Create: `apps/server/src/http/assets.ts`（路由组工厂，deps 注入 db/rbac）——
    - POST /api/assets（body {namespaceSlug, slug, type, visibility?}）：requireAuth + requirePermission(PERMISSIONS.assetPublish) + 空间成员判定（非成员 403，SUPER_ADMIN 绕过——05 §6.4）；空间状态 ACTIVE（FROZEN 拒写由判定链）
    - GET /api/assets：requireAuth（列表含我所属空间资产可见性过滤 + 分页 + nsSlug/type/visibility 过滤）
    - GET /api/assets/{ns}/{slug}：详情（按 §T2 可见性；PUBLIC 匿名可读——挂载在 requireAuth 外/内特殊处理）
  - Modify: `apps/server/src/app.ts`（挂载 /api/assets）
  - Test: `src/http/assets.test.ts`（集成：注册→详情→列表；权限负例）
- **Assert**：注册 201（owner 落位）；slug 冲突 409；非成员注册 403；PUBLIC 详情匿名 200；PRIVATE 详情非 owner 403（access_denied）；ns ARCHIVED 非成员 403（namespace_archived）；HIDDEN 404；FROZEN 空间注册 403
- **Commit**: `feat(server): add asset register list and detail api`

#### T4 资产管理端点：visibility 修改 + 状态治理 + 资产删除（Q3/Q5；05 §6.4 对齐）
- **Files**
  - 续 Modify: `apps/server/src/http/assets.ts`——
    - PATCH /api/assets/{ns}/{slug}（body {visibility}）：判定 `canManageAsset`（owner 或空间 ADMIN+——05 §6.4；超管短路；空间非 ACTIVE 拒写）
    - PATCH /api/assets/{ns}/{slug}/status（body {status: ACTIVE/HIDDEN/ARCHIVED}）：同判定（owner 下架自己资产；ADMIN+ 治理空间内——05 §6.4 明文）
    - DELETE /api/assets/{ns}/{slug}：canManageAsset + **资产无 PUBLISHED 版本**才可删（有 → 400 `asset.has_published`）；事务：删版本行 + asset_file 行 + 存储文件 deleteMany + asset 行（审计埋点）
  - Create: `apps/server/src/assets/manage.ts`——`canManageAsset`（owner/空间 ADMIN+ 组合判定 helper，防 asset:manage 同码误用——M2 对齐项③落地；owner 判定不进角色矩阵）
  - Modify: `apps/server/src/http/assets.ts` deps（db/audit/storage）+ T3 注册端点补审计埋点（asset.register）
  - Test: 续 `assets.test.ts`
- **Assert**：owner 改 visibility/status 成功（200 + 行断言 + 审计行）；MEMBER 改 → 403；FROZEN 空间 owner 改 → 403；无 PUBLISHED 资产可删（连带版本/文件行 + 存储清理断言）；有 PUBLISHED 资产删 → 400；删除审计行存在
- **Commit**: `feat(server): add asset visibility patch and delete api`

### 板块 B 族协议校验器（design §4）

#### T5 依赖与 SPI：validate 模块 + 注册表
- **Files**
  - 依赖：`bun add yauzl js-yaml`（apps/server 内；类型 @types/yauzl 若有）
  - Create: `apps/server/src/validate/types.ts`——`AssetValidator` 接口：
    `validate(input: {type: AssetType, file: Buffer|Blob}) → Promise<ValidationResult>`；
    `ValidationResult = {ok: boolean, errors: ValidationIssue[]}`；
    `ValidationIssue = {code: string, path?: string, message?: string}`（纯 error——族协议契约无 warning 级，design §4）
  - Create: `apps/server/src/validate/registry.ts`——`type → validator` 注册表 + `getValidator(type)`
    （未知 type 抛协议错误）；常量：`MAX_PACKAGE_SIZE`/`MAX_SINGLE_FILE_SIZE`/`MAX_FILE_COUNT`
    （02 §3.3 数值，env 可配 `ASSET_PACKAGE_*`——skillhub properties 同构，默认对齐 02）
  - Test: `src/validate/types.test.ts`（注册表：skill/mcp/agent 注册齐；未知 type 拒）
- **Assert**：注册表三族齐；常量默认值与 02 §3.3 一致（1MiB/10MiB/100）；env 覆盖生效
- **Commit**: `feat(server): define asset validator spi and registry`

#### T6 zip 流式结构校验器（基础：大小/数量/路径安全）
- **Files**
  - Create: `apps/server/src/validate/zip.ts`——yauzl 流式（open → 落临时文件后 fromRandomAccessReader 或直接 buffer 流——实现选型：zip ≤10MiB 上限前置，multipart 接收时先查 Content-Length/累计超限即 413/400）：
    - 条目数 > MAX_FILE_COUNT → `too_many_files`；累计解压大小 > MAX_PACKAGE_SIZE → `package_too_large`；
      单条目 > MAX_SINGLE_FILE_SIZE → `file_too_large`（边读边累计，超限即断——防 zip bomb）
    - 路径安全：条目名归一化（禁 `../`/绝对路径/反斜杠/空路径）→ `invalid_package_path`（zip slip 防护）；
      禁符号链接条目（`unsupported_file_type`）
    - 输出 `entries: {path, size, isDirectory}[]`（逐条读取，不整体解压）
  - Test: `src/validate/zip.test.ts`——fixture zip 构造：合法包 / 超文件数 / 超单文件 / 超总量（构造压缩比大文件实测）/
    路径穿越条目（../evil）/ 反斜杠条目 / 符号链接条目（zip 内 symlink 构造）
- **Assert**：各反例命中预期错误码；合法包 entries 正确；超限中途截断不读全（时间/资源断言可放宽——语义断言为主）
- **Commit**: `feat(server): add streaming zip structural validator`

#### T7 skill 族校验器（zip 布局 + SKILL.md zod）
- **Files**
  - Create: `apps/server/src/validate/skill.ts`——按 02 §3（zip 布局契约，引用不复制）：
    - 主文件根级 `SKILL.md` 存在（缺 → 结构错误 `invalid_package_layout`——带外层目录包如
      my-skill/SKILL.md 同拒，错误指引重新打包；root 级契约 design §4）
    - 扩展名白名单（02 §3.3 表）→ 非白名单扩展名 `unsupported_file_type` error
    - zod manifest 校验（SkillManifestSchema）——未知字段 passthrough 保留（02 兼容生态）
  - Test: `src/validate/skill.test.ts`——fixture：合法 SKILL.md 包 / 缺主文件 / frontmatter 缺 name /
    白名单外扩展名（.exe）/ 带外层目录包
- **Assert**：合法包 ok；缺主文件/非法 frontmatter/白名单外扩展名各命中错误码；外层目录包结构错误拒绝
- **Commit**: `feat(server): add skill family validator`

#### T8 mcp 族校验器（servers 双形态 + 敏感头）
- **Files**
  - Create: `apps/server/src/validate/mcp.ts`——按 03 §3/§5：主文件 manifest（JSON：顶层 manifest.json 或根级键——03 布局以规范为准）→ McpManifestSchema zod 校验（含敏感头 `${VAR}` 规则——03 §4）；
    - stdio 型含 scripts/ 相对路径 → 校验 entry 存在性（command 引用文件在包内）
  - Test: `src/validate/mcp.test.ts`——合法 http/sse/stdio 包 / 敏感头明文（sensitive_header_plaintext）/
    stdio command 引用缺失文件
- **Assert**：合法包 ok；敏感头明文拒绝；stdio command 指向包外/缺失 → error（03 §5 以规范为准）
- **Commit**: `feat(server): add mcp family validator`

#### T9 agent 族校验器 + 注册表接线
- **Files**
  - Create: `apps/server/src/validate/agent.ts`——按 04 §3/§4：主文件根级 `agent.md`（frontmatter）→ AgentManifestSchema zod
  - Modify: `apps/server/src/validate/registry.ts`（注册 skill/mcp/agent 三 validator 实例——三族 validate 入口统一：zip 结构校验 → 族校验）
  - Test: `src/validate/integration.test.ts`（registry 级端到端：三族合法包全过 + 各族反例）
- **Assert**：registry.validate 三族分发正确；错误码统一 protocolErrorCodes
- **Commit**: `feat(server): add agent family validator and wire registry`

### 板块 C manifest 解析与投影（design §5）

#### T10 frontmatter 解析器（skill/agent）+ mcp JSON
- **Files**
  - Create: `apps/server/src/validate/frontmatter.ts`——`parseFrontmatter(text)`：`---` 段提取（首行 `---` 起、闭 `---` 止——容错 BOM/CRLF），js-yaml safeLoad（default schema，禁 prototype 污染）；格式错 → `invalid_skill_frontmatter`/`invalid_agent_frontmatter`（族区分）
  - Test: `src/validate/frontmatter.test.ts`：合法 frontmatter / 无 frontmatter（error）/ 损坏 YAML / `__proto__` 注入载荷（safeLoad 不污染）/ CRLF + BOM
- **Assert**：解析正反例全绿；原型污染载荷安全（不产出继承键）
- **Commit**: `feat(server): add frontmatter parser`

#### T11 投影服务（manifest_json + parsed_metadata_json）
- **Files**
  - Create: `apps/server/src/assets/projection.ts`——`project(type, manifest, parsed)`：
    - manifest_json = 校验后 manifest（序列化快照）
    - parsed_metadata_json = {name, description, searchText, summary?}（01 §3.2：name+description+摘要→searchText；summary 族可选）
  - Test: `src/assets/projection.test.ts`（三族样例投影断言：字段来源/截断边界/JSON 序列化稳定）
- **Assert**：投影字段与 01 §3.2 一致；searchText 截断规则（各族按 01 来源约定）正确
- **Commit**: `feat(server): add metadata projection`

### 板块 D 版本上传（design §6）

#### T12 上传服务：校验→存储→落库事务（先验后落）
- **Files**
  - Create: `apps/server/src/assets/versions.ts`——`createVersion(db, storage, {asset, uploader, file, version, changelog?})`：
    1. 前置：资产存在（404）+ 上传者权限（asset:publish 空间成员——与注册同判定）+ 空间 ACTIVE
    2. 版本冲突预检 `UNIQUE(asset_id, version)` → 409 `asset.version_conflict`
    3. `getValidator(type).validate(file)` → 失败 400（首错误码 + issues 全量返回）
    4. 解析主文件 + `project()` → manifest_json/parsed_metadata_json（失败即整体拒）
    5. 事务：写对象存储（Local put 逐文件：`{namespaceId}/{assetId}/{versionId}/{path}`——M1 key 规则 + assertSafeKey 复验）→ 插 asset_version（DRAFT + file_count/total_size）→ 插 asset_file 行（sha256 计算——边写边算）
    6. 审计 `asset.version_upload`
  - Create: `apps/server/src/validate/index.ts`（zip 校验 + 族校验 + 主文件提取 + 解析 组合入口 `validatePackage(type, file)`）
  - Test: `src/assets/versions.test.ts`（DB + Local tmp storage 集成）：合法 skill 包全链（版本行 DRAFT + file 行 + 存储文件存在 + sha256 一致）/ 校验失败零落库（版本行/文件行/存储全空）/ version 冲突 409 / manifest 投影落库断言
- **Assert**：原子性（失败无孤儿行/文件——断言版本行 0 + 存储目录空）；sha256 与文件实际一致；DRAFT 状态落位
- **Commit**: `feat(server): add atomic version upload with validation`

#### T13 上传 HTTP 端点（multipart + 限流）
- **Files**
  - 依赖：Hono multipart（内置）——文件解析 → Buffer（≤10MiB + multipart 超限拒绝 413 `asset.package_too_large`）
  - 续 Modify: `apps/server/src/http/assets.ts`：POST /api/assets/{ns}/{slug}/versions（multipart fields: file/version/changelog?）
  - Modify: `apps/server/src/config/env.ts`（补 `ASSET_PACKAGE_MAX_*` 三常量 env 覆盖，默认对齐 02 §3.3）
  - 限流：上传按用户窗口限流（复用 rateLimiter，skillhub publish=10 同构——常量上传限流配置）
  - Test: 续集成（multipart 构造：app.request + FormData——bun 支持）
- **Assert**：201 {version, status: DRAFT, files: N}；超限 413；校验失败 400（issues 全量）；限流 429
- **Commit**: `feat(server): add version upload endpoint with rate limit`

### 板块 E 版本管理读面（design §6 Q1/Q2）

#### T14 版本列表/详情（状态可见性过滤）
- **Files**
  - Create: `apps/server/src/assets/version-read.ts`——`listVersions(db, asset, viewer, {limit, offset, status?})`：
    - DRAFT 仅 owner/上传者/空间 ADMIN+（viewer 判定；列表与详情一致，无权 404）
    - PUBLISHED 按资产 visibility（M2 无 PUBLISHED——逻辑留接口，M3 消费）
    - 详情含 manifest_json/parsed_metadata_json/文件清单（sha256/path/size）
  - 续 Modify: http/assets.ts：GET /api/assets/{ns}/{slug}/versions + GET .../versions/{version}
  - Test: 续集成：上传者看自己 DRAFT 200 / 空间外用户看 DRAFT 400 `version_not_published` / owner/ADMIN 可见 / 匿名 400（PUBLIC 资产也 400——skillhub notPublished 对齐明示）
- **Assert**：Q1 可见性矩阵实测（列表过滤与详情三态一致——不存在 404 / 无预览权 400 / 授权 200）
- **Commit**: `feat(server): add version list and detail with draft visibility`

#### T15 版本删除（DRAFT，Q2 判定）
- **Files**
  - 续 Modify: `assets.ts`：DELETE /api/assets/{ns}/{slug}/versions/{version}——判定：上传者本人（created_by）或 owner 或空间 ADMIN+；仅 DRAFT 可删（非 DRAFT → 400 `asset.draft_only`——UPLOADED+ 走 M3）；事务删 asset_file/版本行 + 存储 deleteMany
  - Test: 续集成：上传者删自己 DRAFT 204 / 他人 DRAFT 403 / 非 DRAFT 400 / 连带存储清理断言
- **Assert**：Q2 判定矩阵实测；幂等（已删 404）；审计行
- **Commit**: `feat(server): add draft version delete`

### 板块 F 空间 OWNER 转让（design §7 R3）

#### T16 转让服务 + 端点
- **Files**
  - Create: `apps/server/src/http/namespaces.ts` 扩展——POST /api/namespaces/{ns}/transfer-ownership（body {newOwnerId}）：
    - 仅当前 OWNER 发起（403）；目标须为空间成员（400/404 `namespace.transfer_target_not_member`）
    - 事务：改 namespace_member 角色——newOwner → OWNER；原 OWNER → ADMIN（防空位）
    - 审计 `namespace.transfer_ownership`
  - Test: `src/http/namespaces.test.ts` 续：OWNER 转让成功（双角色变更断言）/ 非 OWNER 403 / 目标非成员 400 / 转让后原 OWNER 移除他人 OWNER 保护生效（T6/T7 语义闭环）
- **Assert**：转让后原 OWNER 为 ADMIN（非空位）；目标角色 OWNER；审计行；OWNER 保护（移除 OWNER 403）延续
- **Commit**: `feat(server): add namespace ownership transfer`

### 板块 G 审计补全（design §8 R9）

#### T17 治理动作审计埋点（namespace/token/device/oidc 补）
- **Files**
  - Modify: `apps/server/src/http/namespaces.ts`——补埋点：namespace.create / member.add / member.remove / member.role_change / namespace.status_change（M1 盲区）
  - Modify: `apps/server/src/http/tokens.ts`——token.issue / token.revoke
  - Modify: `apps/server/src/http/device-routes.ts`——device.approve / device.token_issued
  - Modify: `apps/server/src/auth/routes.ts` 或 provision.ts——oidc.provisioned（建号绑定动作，避免与 login_success 双记：provision 仅首登建号时记）
  - Test: 各集成测试补审计断言（action/actor/target 落位；敏感载荷零落 detail——token 明文断言沿用 M1 纪律）
- **Assert**：动作面审计全覆盖清单核对（grep audit 调用点 vs 清单）；无明文敏感载荷
- **Commit**: `feat(server): backfill governance audit events`

### 板块 H 收尾

#### T18 冒烟 + 全仓验证 + 00 §5 注记 + 规范同步（design §8.1）
- **Files**
  - Modify: `docs/00-product-direction.md` §5（M2 ✅ 注记：板块 A-G 完成；00 v 版本 bump）
  - Modify: `docs/05-identity-access.md`（§6.4 补 DRAFT 删除判定 + asset:publish 加注「含注册与草稿上传」；版本头/修订记录同步）
  - Modify: `docs/08-data-model.md`（§7 补版本可见性语义注记；版本头/修订记录同步）
  - Modify: `docs/designs/2026-09-08-m2-asset-domain-design.md`（Status 同步「已实现」注记——converge 收尾）
- **Steps**：turbo 全仓 typecheck/test/lint/build 0 fail（`--force` 实跑非 cache）→ server 起服务冒烟
  （注册→上传合法 skill zip→版本列表/详情→删除 DRAFT→转让；curl 带 Origin/Host）→ 8 维自检打分表
  ≥9 留档 → 00 §5 注记 commit → push + **push 后验证同步**（git status 归零 + ls-remote 比对，不信截断输出）
- **Assert**：全仓绿；冒烟清单逐项过；00 §5 M2 ✅ + 注记；05/08 同步项落地（§8.1 清单逐项勾）
- **Commit**: `docs: sync milestone and doc state with M2 completion`

## 3. 验收总断言（plan 全绿定义）

- 全仓 `bun run typecheck` 0 error；`bun run test` 0 failed；`bun run lint` 0 error；`bun run build` 成功
- 资产域：注册/列表/详情 + visibility 读面矩阵（PUBLIC 匿名 200 / PRIVATE 非 owner 403 / HIDDEN 404 / ns ARCHIVED 非成员 403）测试全绿
- 校验器：三族 validator 注册表 + zip 结构校验（root 级主文件/白名单扩展名/超限/路径穿越/symlink 反例）全绿
- 上传原子性：失败零孤儿（版本行/文件行/存储全空断言）；sha256 与存储一致；version 冲突 409
- 版本读面：DRAFT 可见性矩阵（owner/上传者/ADMIN+ 200；外 404）；DRAFT 删除判定（上传者本人可删）
- 转让：OWNER 转让双角色变更 + 保护闭环；审计动作面全覆盖（T17 清单核对）
- 8 维自检 ≥9（T18 打分表留档）；git 同步验证（status 无 ahead、ls-remote 与本地一致）

## 4. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-08 | sunxuewen-rush | 初稿：M2 资产域计划——18 Task（板块 A-H：注册读面/校验器/解析投影/版本上传/版本管理/转让/审计补全/收尾），逐 Task 引用 design 2026-09-08-m2-asset-domain-design.md §N |
| v1.1 | 2026-09-08 | sunxuewen-rush | 校验器契约同步（design v1.2）：砍 warnings/confirmWarnings（族协议纯 error）；T5 ValidationResult 去 warnings[]；T7 改 root 级主文件 + 扩展名白名单拒绝（无目录白名单）；T12/T13 删 confirm 流程 |
| v1.2 | 2026-09-08 | sunxuewen-rush | 读面拒绝语义同步（design v1.3）：T3/T4 详情与删除断言 404 → 403 分层（namespace_archived/access_denied） |
| v1.3 | 2026-09-08 | sunxuewen-rush | 管理面同步（design v1.4）：T4 补状态治理端点（PATCH status，05 §6.4 asset:manage ADMIN+/owner 判定）；visibility/status/删除统一 canManageAsset（非仅超管） |
| v1.4 | 2026-09-08 | sunxuewen-rush | 版本读面同步（design v1.5）：T14 详情拒绝 404 隐藏 → 400 version_not_published 明示（skillhub notPublished 对齐拍板）；T15/T16 断言相应更新 |
