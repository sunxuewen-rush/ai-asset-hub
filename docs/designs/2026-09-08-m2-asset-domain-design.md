# M2 资产域设计

> Date: 2026-09-08
> Updated: 2026-09-08（v1.4：管理面判定对齐 05 §6.4（状态治理 ADMIN+/owner，非仅超管）；v1.3：读面拒绝语义对标 skillhub 修正（404 防枚举 → 403 明示分层）；v1.2：砍 warnings/confirmWarnings 机制——族协议契约纯 error、root 级布局语义补入；v1.1：grilling Q1-Q5 修复；v1.0：R1-R9 评审拍板落档初稿）
> Status: 定稿（评审拍板 2026-09-08：R1-R9 锁定 + grilling Q1-Q5 通过；8 维自检 ≥9）
> Scope: M2 资产域（00 §5）——skill/mcp/agent 三类资产坐标注册 + 族协议校验器/解析器 + 版本上传（DRAFT）+ 版本管理 + 空间 OWNER 转让 + 审计补全
> 对标源：21-skillhub（iflytek/skillhub，Apache-2.0）SkillPublishController / ZipPackageExtractor / NamespaceController.transferOwnership / TokenController 源码级核对
> 引用链：本文档 → 规范 00 §5/§7 · 01 §2/§3/§5/§6 · 02 §3（skill 包契约）· 03 §3/§5（mcp 包契约）· 04 §3/§4（agent 包契约）· 05 §5/§6 · 06 §5.3 · 08 §5/§7（引用不复制，字段与规则以规范为准）

## 1. 背景与文档定位

M2 在 M1 已落基础上落地资产域能力：表结构（asset/asset_version/asset_file + 治理表，08 §5/§6）、
protocol 三族 manifest zod schema、对象存储 SPI + Local 实现（M1）均已就位——M2 是管线与域服务，
**不是建表**（08 全表随 M1 落库，M2 零 schema 变更预期；发现缺口回写 08 走规范 bump）。

流程定位：本 design（决策档案）→ docs/plans/M2-assets.md（任务清单，引用本文 §N）→ 编码测试
→ 收尾 converge。M2 决策仅记拍板结果（R1-R9），被否决选项不写入。

## 2. 里程碑范围（R1/R2）

- **M2/M3 边界（R1）**：M2 = 资产域能力闭环——坐标注册 + 上传 zip（multipart）→ 族协议校验
  → manifest 解析投影 → 落 asset_version(DRAFT) + asset_file 逐文件索引 + 对象存储 + DRAFT
  版本管理（列表/详情/删除）+ 空间 OWNER 转让 + 审计补全。
  M3 = 治理管线：SCANNING→PENDING_REVIEW→PUBLISHED 状态推进（扫描/审核/发布）、标签、搜索、
  下载/统计、API Token scope 过滤——**08 §7 六态在 M2 只走到 DRAFT**，后续流转归 M3。
  （对标注：skillhub publish 一体上传即入流；AIH 六态模型（08 §7 拍板）天然拆分上传与治理，
  拆分是有意设计——上传/校验是资产域能力，审核/发布是治理流程。）
- **00 §5 文案（R2）**：M2 行改为「资产域：skill/mcp/agent 三类 + 族协议校验器/解析器 +
  资产注册与版本上传(DRAFT)」；M3 行注记治理语义——随 M2 收尾 bump 00（不零敲碎打）。

## 3. 资产坐标与版本语义

- **坐标**：@namespace/slug 跨类型唯一（01 §3.3 / 08 §5 `UNIQUE(namespace_id, slug)`，type 不入键）——
  注册冲突 409（DB 唯一键兜底 + 业务层预检给友好错误）；asset 行 = type + slug + owner_id
  （创建者 = 主要维护人，05 §6.2）+ visibility 注册可带（默认 PUBLIC，08 §5.1 语义）+
  status ACTIVE。
- **版本号（semver）**：上传请求携带显式 version，格式 semver（01 §3「版本号：semver，
  族协议可附加限定」；`^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$`，1-64 字符）+ 可选 changelog；
  `UNIQUE(asset_id, version)` 重复 → 409——**版本不可覆写**（修订以新版本号发布，防历史篡改）。
- **latest_version_id**：只读跟随最新 PUBLISHED（01 §4 标签通道语义）——M2 全 DRAFT 期间
  保持空，M3 首次发布时更新（latest 不指向 DRAFT，防消费端拿到未审版本）。

## 4. 族协议校验器（R4/R5）

- **落点**：apps/server/src/validate/（新模块）——AssetValidator 接口 + `type → validator`
  注册表（01 §5）：`validate({ type, zipEntries }) → { ok, errors[] }`；
  manifest 结构校验复用 packages/protocol zod（protocol 保持纯 schema 单源，zip/IO 是服务端能力）。
- **zip 解压（R5）**：yauzl 流式读取，边读边累计——天然防 zip bomb；上限常量（总量/单文件/文件数，
  数值以 02 §3.3 校验规则表为契约，env 可配——skillhub properties 配置化同构）。
- **路径安全**：条目路径归一化后禁 `../`/绝对路径/反斜杠（zip slip 防护——ZipPackageExtractor
  同构 + M1 storage `assertSafeKey` 先例）；禁符号链接条目。
- **两级校验**：zip 结构校验（布局/白名单/大小/文件数）→ 解出主文件（skill 根 SKILL.md /
  mcp manifest / agent 根 agent.md）→ protocol zod 结构校验 → 错误码复用 protocolErrorCodes
  （errors.ts 单源：file_too_large/too_many_files/package_too_large/unsupported_file_type/
  invalid_*_frontmatter/sensitive_header_plaintext 等）。
- **zip 布局（root 级契约）**：主文件（skill 根 SKILL.md / mcp 根 mcp.json / agent 根 agent.md）
  须在包根——03 §3.1 / 04 §3 明文 root 级；带外层目录（如 my-skill/xxx）的包 → 结构错误直接
  拒绝（错误信息指引重新打包）；族协议契约无自动提升语义。
- **纯 error 校验（无 warning 级）**：02/03/04 契约无 error/warning 分级——白名单外扩展名
  （02 §3.3 扩展名白名单）→ `unsupported_file_type` error 拒绝；校验结果 = `{ok, errors[]}`，
  无 warnings/confirm 二次确认面（族协议无对应场景，不为空转机制造接口）。
- **上传限流**：上传端点按用户限流（skillhub publish authenticated=10 同构，复用 M1 rateLimiter）。

## 5. manifest 解析与投影

- 解析：js-yaml safeLoad（skill/agent frontmatter `---` 段，防原型污染）+ JSON.parse（mcp）；
  解析失败 → 结构化错误码（invalid_skill_frontmatter 等，errors.ts 已有）。
- 投影（01 §3.2 / 08 §5.2）：`manifest_json` = 校验后完整 manifest（版本快照）；
  `parsed_metadata_json` = 检索投影（name/description/searchText，各族按 01 §3.2
  来源约定截断；summary 等扩展字段随族协议可选——供 M3 搜索/M4 展示）。
- **失败即拒**：上传事务中校验/解析任一失败 → 整体失败，不落版本行/文件（见 §6 原子性）。

## 6. 版本上传流程（DRAFT）

- 端点 POST /api/assets/{nsSlug}/{slug}/versions，multipart（file=zip + version + changelog?）；权限：asset:publish（05 §6.4：MEMBER 可在空间内发布新资产）+
  空间状态 ACTIVE（FROZEN 拒写沿用 M1 rbac 判定链）。
- **事务原子性**：先验后落——流式解压校验全过 → 写对象存储 → 落 asset_version(DRAFT) +
  asset_file 逐文件行（sha256/storage_key/content_type/size，UNIQUE(version_id, file_path)）——
  任一失败全回滚（校验失败不产生孤儿文件/行）。
- DRAFT 版本管理：列表（分页 + 状态过滤）、详情（manifest/投影/文件清单 sha256 可核对）、
  删除。**版本读面按状态过滤（Q1）**：DRAFT 仅 owner/上传者/空间 ADMIN+ 可见（列表与详情一致，
  无权限者 404——不泄露存在性）；将来 PUBLISHED 按资产 visibility 公开（08 §5.1）。
- **DRAFT 删除权（Q2）**：上传者本人可删自己的 DRAFT（未提交草稿撤回，开放协作撤回语义）；
  owner/空间 ADMIN+ 可删空间内任一 DRAFT；删除连带存储文件清理（deleteMany）。
  已进 UPLOADED+（提交/审核）后删除回 owner/空间 ADMIN+ 管理面（M3 治理）。

## 7. 权限与治理判定（M2 对齐项落地）

- **asset:manage 同码细分**（M1 design §6.7 对齐项③，业务层实现，不可只查 can）：
  a) 资产管理面（visibility 修改、资产删除、状态治理——Q3/Q5）——判定 = `canManageAsset`
  （owner 或空间 ADMIN+，05 §6.4 明文「空间 ADMIN 以上，或 owner 本人」；SUPER_ADMIN 短路；
  空间非 ACTIVE 拒写——FROZEN 只读/ARCHIVED 归档，05 §6.3 判定链第 6 步对齐）；
  b) 撤回/下线已发布版本——随 M3 治理（本 design 不含）。
- **资产删除（Q5，纠错非治理）**：DELETE /api/assets/{ns}/{slug}——owner 或空间 ADMIN+；
  **仅当资产无 PUBLISHED 版本**（无版本/全 DRAFT）可删（连带版本行 + 存储清理）；
  有 PUBLISHED 后删除走 M3 治理（下线/归档），防止已分发资产被静默移除。
- **visibility 修改（Q3）**：owner 或空间 ADMIN+ 可改（PUBLIC/NAMESPACE_ONLY/PRIVATE，
  08 §5.1 语义）；读面过滤按 08 §5.1：PUBLIC 全站/匿名（默认）、NAMESPACE_ONLY 空间成员、
  PRIVATE owner+空间 ADMIN——注册可带（默认 PUBLIC）。
- **读面拒绝语义（2026-09-08 对标修正——明确性优先拍板）**：资产详情对无权者不再 404 隐藏，
  对齐 skillhub（SkillQueryService.getSkillDetail）分层——坐标不存在/资产非 ACTIVE（HIDDEN/
  ARCHIVED 对普通用户）→ 404 `asset.not_found`；ns ARCHIVED 且非成员 → 403 `asset.namespace_archived`
  （error.namespace.archived 对齐，明示空间归档）；ACTIVE 但 visibility 拒（PRIVATE/
  NAMESPACE_ONLY）→ 403 `asset.access_denied`（error.skill.access.denied 对齐，明示存在但无权）。
  权衡记录：403 泄露资源存在性（匿名亦同）——协作申请流体验优先（skillhub 实证），版本级 DRAFT
  读面（Q1 404 不泄露）维持，T14 实现时对照 skillhub assertPreviewAccessible 复核。
- **空间 OWNER 转让（R3）**：POST /api/namespaces/{ns}/transfer-ownership（请求体 newOwnerId）
  ——仅当前 OWNER 发起、目标须为空间成员；转让后原 OWNER 自动降为 ADMIN（防空位，
  05 §6.2「可转让」落地；skillhub NamespaceController.transferOwnership 同构）。
  转让为 M1 T6/T7「OWNER 不可经添加产生/不可被移除」注记的闭环途径。

## 8. 审计补全（R9，00 §2.2 全链路审计收口）

M2 补齐治理动作审计写入（audit writer M1 已备）：
- 资产域：注册 / 版本上传 / 版本删除 / 归档-隐藏-恢复
- namespace 治理补埋点（M1 盲区）：建空间 / 成员增删 / 改角色 / 状态治理 / OWNER 转让
- 凭证动作补埋点：token 签发/吊销 / device approve / device 轮询签发 / oidc 建号绑定
- 既有纪律延续：敏感载荷不落 detail（token 明文/密码零落库）

### 8.1 规范同步项（M2 收尾随 00 §5 注记一起 bump，不零敲碎打）

- 05 §6.4：asset:manage 判定补「DRAFT 版本可由上传者本人删除（未进审核）」（Q2）；
  asset:publish 行加注「发布资产包含资产注册与草稿上传（M2 语义）」（Q4）
- 08 §7：版本可见性语义补注（DRAFT 仅 owner/上传者/空间 ADMIN+；PUBLISHED 按资产 visibility）（Q1）
- 00 §5：M2 行文案修正（R2）+ 状态注记

## 9. 接口变更总览（M2 新增，前缀 /api 维持无版本化——R8）

| 方法与路径 | 权限 | 说明 |
|-----------|------|------|
| POST /api/assets | asset:publish（空间成员） | 注册资产（nsSlug/slug/type/visibility? 默认 PUBLIC）→ 201；slug 冲突 409 |
| GET /api/assets | 登录 | 资产列表（limit/offset + nsSlug/type/visibility 过滤；非 M3 搜索） |
| GET /api/assets/{ns}/{slug} | 按 visibility（08 §5.1） | 资产详情；读面拒绝语义：坐标不存在/非 ACTIVE → 404；ns ARCHIVED 非成员 → 403 `namespace_archived`；visibility 拒 → 403 `access_denied`（skillhub 对齐，§7） |
| PATCH /api/assets/{ns}/{slug} | owner 或空间 ADMIN+ | 修改 visibility（Q3） |
| DELETE /api/assets/{ns}/{slug} | owner 或空间 ADMIN+ | 删除资产（Q5：仅无 PUBLISHED 版本；连带存储清理） |
| PATCH /api/assets/{ns}/{slug}/status | owner 或空间 ADMIN+（asset:manage，05 §6.4） | ACTIVE/HIDDEN/ARCHIVED 状态治理（owner 下架自己资产；ADMIN+ 治理空间内） |
| POST /api/assets/{ns}/{slug}/versions | asset:publish（空间成员） | 上传 zip（multipart）→ DRAFT；限流 |
| GET /api/assets/{ns}/{slug}/versions | 按版本状态 | 版本列表（Q1：DRAFT 仅 owner/上传者/空间 ADMIN+） |
| GET /api/assets/{ns}/{slug}/versions/{version} | 按版本状态 | 版本详情（Q1 同上；manifest/投影/文件清单） |
| DELETE /api/assets/{ns}/{slug}/versions/{version} | 上传者本人/owner/空间 ADMIN+ | 删除 DRAFT（Q2；连带存储清理） |
| POST /api/namespaces/{ns}/transfer-ownership | OWNER | 空间转让（新 OWNER 为成员；原降 ADMIN） |

认证装配沿用 M1（Bearer 显式优先 → session 回退）；错误格式 07 §4；审计动作全部埋点（§8）。

## 10. UI-UX 变动总览

**无前端交付**（M2 后端里程碑）。校验失败的错误码/issue 展示交互随 M4 web；本设计不含 UI-UX 变更。
本设计不含 UI-UX 变更。

## 11. 线框图

版本上传流程（原创自绘；状态机语义见 08 §7）：

```text
POST /api/assets/{ns}/{slug}/versions（multipart: file=zip + version + changelog?）
  │ asset:publish 判定 + 空间 ACTIVE + 限流
  ▼
yauzl 流式解压 ── 结构校验（root 级主文件/白名单扩展名/总量/单文件/文件数/路径安全）
              ── 拒绝 → 400（错误码 + issues）
  │ 通过
  ▼
读主文件 → protocol zod 校验（manifest）── 拒绝 → 400（invalid_* 错误码）
  │ 通过
  ▼
写对象存储（{namespaceId}/{assetId}/{versionId}/{path}）→ 落 asset_version(DRAFT) +
asset_file 逐文件行（sha256）——事务：任一失败全回滚（无孤儿文件/行）
  ▼
201 { version, status: DRAFT, files: N }
```

状态边界：M2 生命周期 = 注册(ACTIVE) → 上传(DRAFT) → 删除（DRAFT 上传者/管理面可删；
资产无 PUBLISHED 时 owner/ADMIN+ 可删整体）→ 归档/隐藏（超管）。
DRAFT → SCANNING/PUBLISHED 流转、版本下线与已发布资产治理 = M3 管线。

## 12. 引用文件清单

- 规范层：docs/00-product-direction.md §5/§7 · docs/01-asset-protocol.md §2/§3/§5/§6 ·
  docs/02-skill-protocol.md §3 · docs/03-mcp-bundle-protocol.md §3/§5 ·
  docs/04-agent-protocol.md §3/§4 · docs/05-identity-access.md §5/§6 ·
  docs/06-label-system.md §5.3 · docs/07-i18n-conventions.md §4 · docs/08-data-model.md §5/§7
- 计划层：docs/plans/M2-assets.md（任务清单，实现时引用本文 §N）
- 前序档案：docs/designs/2026-09-08-m1-platform-foundation-design.md §6.7（M2 对齐项出处）
- 对标源：21-skillhub（iflytek/skillhub，Apache-2.0）SkillPublishController /
  ZipPackageExtractor / NamespaceController / TokenController
- 代码落点（M2 新建）：apps/server/src/validate/ · apps/server/src/http/{assets,versions}.ts ·
  apps/server/src/assets/（域服务）· apps/server/src/http/namespaces.ts（转让扩展）·
  apps/server/src/audit/（埋点扩展）

## 13. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-08 | sunxuewen-rush | 初稿：M2 资产域设计——R1-R9 评审拍板全锁（范围切分/坐标版本语义/校验器架构/解析投影/上传流程/权限细分/转让/审计/端点形态）；对标 21-skillhub 源码（配置化上限/transferOwnership/上传限流吸收） |
| v1.1 | 2026-09-08 | sunxuewen-rush | grilling Q1-Q5 修复：版本读面按状态过滤（DRAFT 仅 owner/上传者/空间 ADMIN+，08 §7 可见性补注同步）；DRAFT 上传者可删自己草稿（05 §6.4 补判定同步）；visibility 修改端点（owner/ADMIN+，注册可带）；资产删除端点（仅无 PUBLISHED，纠错非治理）；规范同步项 8.1 |
| v1.2 | 2026-09-08 | sunxuewen-rush | 校验器契约修正：砍 warnings/confirmWarnings 机制（族协议 02/03/04 纯 error 无 warning 级——skillhub 单根目录提升场景在 AIH root 级契约下不存在，不为空转机制造接口）；补 zip root 级主文件布局与白名单扩展名拒绝语义 |
| v1.3 | 2026-09-08 | sunxuewen-rush | 读面拒绝语义对标修正（T3 实现期对标 skillhub SkillQueryService）：不可见 404 防枚举 → 403 明示分层（namespace_archived / access_denied 新码，error.namespace.archived / error.skill.access.denied 对齐；明确性优先拍板，权衡 403 泄露存在性已记录）；版本级 DRAFT 读面 Q1 维持，T14 复核 assertPreviewAccessible |
| v1.4 | 2026-09-08 | sunxuewen-rush | 管理面判定契约修正（T4 实现期发现）：§7b 状态治理「仅超管」与 05 §6.4 明文（asset:manage = 空间 ADMIN+/owner，含归档/版本）冲突 → 对齐 05：三端点（visibility/status/删除）统一 `canManageAsset`（owner 或 ADMIN+ + 超管短路 + 空间非 ACTIVE 拒写） |
