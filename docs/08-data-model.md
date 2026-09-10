# 数据模型设计

> Date: 2026-09-04
> Updated: 2026-09-10（v1.5：**M4-pre 扁平化重构同步**——§3 用户域删 4 表（role/permission/role_permission/user_role_binding）→ `user_account.role` 4 档单列；§4 空间域整删（留注记保编号）；§5.1 asset 去 `namespace_id`/`visibility`、`UNIQUE(slug)` + `INDEX(status)`；§6 review_task 去 `namespace_id`；§7 读面授权集改「owner/上传者/管理档/超管」；§8 约束表同步；v1.4：M3 实现同步——§5.2 asset_version 补 yank 三列 + bundle 双列、§6 review_task 补 WITHDRAWN 态（withdraw 保留行——version 递增契约优先）、§7 八态补全（REJECTED/YANKED + latest 维护 + 读面分治落地）；v1.3：§7 版本读面可见性补注（DRAFT 授权集 + 400 明示对齐 skillhub——M2 实现同步）；v1.2：实现状态同步——drizzle schema 全表落地；v1.1 schema 蓝图对齐实战模型增补）
> Status: 定稿（M1 已按 v1.1 落地 drizzle schema 四域全表迁移/种子；M2 已按 v1.3 同步 §7 版本读面可见性注记；M3 已按 v1.4 同步八态/asset_version 五列/review_task WITHDRAWN/读面分治；**M4-pre 已按 v1.5 同步扁平化模型——迁移 0005/0006/0007 实落，运行库终态 12 表（§3-§6 表清单；全新建库 0000→0007 按序实测亦为 12 表）**）
> Scope: AI Asset Hub 表结构蓝图 —— 用户/资产/版本/文件/审核/label/审计（M4-pre：空间域已删除）
> 设计来源：以企业实战验证的注册中心数据模型为基准（同构继承），按 00-07 规范资产化/中立化

## 1. 定位与范围

本文档定义平台持久化表结构（PostgreSQL/Drizzle 落地目标）。它是各规范在存储层的落点：

| 规范 | 落点 |
|------|------|
| 01 §3.3 坐标（slug 全局跨类型唯一） | `asset.UNIQUE(slug)` |
| 01 §3.2 元数据投影 | `asset_version.parsed_metadata_json` |
| 02/03/04 族协议 manifest | `asset_version.manifest_json` |
| 05 身份/角色/RBAC | user_account（含 `role` 4 档单列）· identity_binding · local_credential · api_token |
| 06 label 三表 | label_definition / label_translation / asset_label |
| 00 §2.2 治理与生命周期 | asset / asset_version / review_task |

## 2. 通用约定

- **surrogate id**：表自增 BIGINT（`id BIGSERIAL`）；**用户引用一律 VARCHAR(128) 字符串**（05 §2）
- 审计列：`created_by`（user id）/ `created_at` / `updated_by` / `updated_at`
- 状态用**列枚举表达**（ACTIVE/HIDDEN/ARCHIVED…），不引入软删位；治理性隐藏走状态，审计由 audit_log 承担
- 状态/枚举列实现形态 = VARCHAR + 应用层 zod 枚举（单一事实源），不用 PG enum——枚举加值零迁移成本（对齐实战模型）
- 计数冗余：热查询计数（download_count）冗余在主表，落库时事务内自增

## 3. 用户域

```sql
user_account          id VARCHAR(128) PK · display_name · email · avatar_url
                      · status(PENDING/ACTIVE/DISABLED) · created_at/updated_at
                      · role SMALLINT NOT NULL DEFAULT 1
                        -- 平台角色 4 档单列（M4-pre 迁移 0005：0 GUEST/1 USER/10 ADMIN/100 SUPER_ADMIN）
                      -- id 生成：本地注册 usr_<uuid>；外部身份源建号取映射值（05 §2/§3）
identity_binding      provider · provider_subject VARCHAR(256) → user_account_id
                      UNIQUE(provider, provider_subject)   -- OIDC/LDAP 映射（05 §3）
local_credential      user_account_id · username VARCHAR(64) UNIQUE · password_hash
                      · failed_attempts INT · locked_until
                      UNIQUE(user_account_id)
                      -- 本地账号密码；LDAP 用户无此行（05 §3.1 纯 bind 不存密码）
                      -- username 为本地登录名，独立于身份 id；failed_attempts/locked_until
                      -- 行级失败锁定（05 §3.1 防爆破，多实例部署仍生效）
api_token             user_account_id · token_hash · scope · expires_at · revoked_at
```

**M4-pre 变更（迁移 0005）**：原 `user_role_binding` / `role` / `permission` / `role_permission`
四表**整体删除** —— 平台角色改为 `user_account.role` 单列 4 档线性值（05 §6.1）；权限码矩阵取消
（判定统一为 `role >= N` + owner 归属）。Token 凭证 scope 迁入应用层常量 `auth/token-scopes.ts`（非表）。

## 4. 空间域（**已删除** —— M4-pre 扁平化重构）

原 `namespace` / `namespace_member` 两表随空间域整体删除（迁移 0006 `drop_namespace_domain`）：
资产坐标改为**全局唯一裸 slug**，授权轴收敛为「平台角色 4 档 + owner 归属」（05 §6）。
本节保留编号与删除注记，以免打断历史 design/plan 对 08 §N 的既有引用。

## 5. 资产域（核心）

### 5.1 asset —— 资产主表（全局唯一坐标）

```sql
asset                 id · type(skill/mcp/agent) · slug
                      · owner_id → user_account（主要维护人）
                      · latest_version_id → asset_version（冗余指针，免 join）
                      · status(ACTIVE/HIDDEN/ARCHIVED)
                      · download_count BIGINT
                      · created_by/created_at/updated_by/updated_at
                      UNIQUE(slug)      -- 01 §3.3 slug 全局跨类型唯一（type 不在唯一键）
                      INDEX(status)
```

- type 只是行属性，不出现在唯一键——**全局范围内** skill 与 mcp 不得同 slug
- owner 是「主要维护人」；`owner 本人 ∨ role >= 管理` 可管（05 §6.2 / §6.4）
- **M4-pre 变更**（迁移 0005/0006/0007）：删 `namespace_id` · 删 `visibility`（可见性维度整体取消，
  资产对外恒公开，读面仅由 `status` 决定）· `UNIQUE(namespace_id, slug)` → `UNIQUE(slug)` ·
  `INDEX(namespace_id, status)` → `INDEX(status)`

### 5.2 asset_version —— 版本表（内容与投影载体）

```sql
asset_version         id · asset_id → asset · version VARCHAR(64)（semver）
                      · status —— 完整生命周期见 §7
                      · changelog · parsed_metadata_json JSONB · manifest_json JSONB
                      · file_count INT · total_size BIGINT（上传后落库）
                      · published_at · created_by/created_at
                      · yanked_at · yanked_by → user_account · yank_reason（M3：撤回三列）
                      · bundle_storage_key · bundle_sha256（M3：ZIP 原包副本——08 §5.3 双通道闭环）
                      UNIQUE(asset_id, version)
```

- `parsed_metadata_json`：元数据投影（01 §3.2 表落库，name/description/searchText/type/summary）
- `manifest_json`：族协议 manifest 规范化结果（skill frontmatter / mcp servers / agent frontmatter）
- ZIP 本体存对象存储；DB 只存元数据与文件索引（01 §3.2 派生列原则）

### 5.3 asset_file —— 文件索引（完整性校验）

```sql
asset_file            id · version_id → asset_version · file_path · file_size
                      · content_type · sha256 VARCHAR(64) · storage_key
                      UNIQUE(version_id, file_path)
```

- 逐文件 sha256：客户端下载后校验（zip 与逐文件双通道均可用）
- `storage_key` 指向对象存储；删除版本时按 key 清理对象

## 6. 治理域

```sql
review_task           id · asset_version_id → asset_version
                      · status(PENDING/APPROVED/REJECTED/WITHDRAWN) · version INT（重审计数，递增）
                      · submitted_by → user_account · reviewed_by → user_account
                      · review_comment · submitted_at · reviewed_at
                      -- 防自审（05 §6.4）：应用层强制 reviewed_by ≠ submitted_by
                      --（SUPER_ADMIN 例外）；重审 = 原版本号不变、review version+1
                      -- WITHDRAWN（M3）：撤回提审保留行置态（历史留档保 version 递增——
                      -- 非删行——skillhub 删行是其无递增语义的简化，AIH 08 自有契约优先）
                      · 部分唯一索引 UNIQUE(asset_version_id) WHERE status='PENDING'
                      -- DB 硬约束：同版本不允许并发存在多个待审任务

label_definition      id · slug UNIQUE · type(RECOMMENDED/PRIVILEGED)
                      · visible_in_filter · sort_order · parent_id 自引用
                      · created_by/created_at/updated_at          -- 06 §2
label_translation     label_id + locale + display_name · UNIQUE(label_id, locale)
asset_label           asset_id + label_id · UNIQUE(asset_id, label_id)  -- 06（≤10 应用层限）
audit_log             actor_id（可空=匿名）· action · target_type/target_id
                      · request_id · client_ip · user_agent · detail JSONB
                      · created_at                                -- 全链路审计
```

## 7. 状态机（版本生命周期全序）

版本状态（上传 → 发布，扫描态嵌入；参考实战验证的全序；M3 补全八态——REJECTED/YANKED）：

```
DRAFT → SCANNING → SCAN_FAILED ──► （修正后同版本重传回 DRAFT/UPLOADED）
   │        │
   │        ▼
   │     UPLOADED → PENDING_REVIEW ──► PUBLISHED → YANKED（撤回分发——留档禁下载）
   │                      │
   │                      ▼
   │                   REJECTED（留档——修正须新版本号）
   └────────────────────────────────────────┘
```

- `SCANNING`：安全扫描进行中；`SCAN_FAILED`：扫描未过（同版本重传豁免——M3 扫描直通）
- `UPLOADED`：包可下载但未进审核（draft 与 review 之间；withdraw 回退停留态）
- `PENDING_REVIEW` → `PUBLISHED` 需 review_task 通过（防自审见 §6）
- `REJECTED`：审核拒绝留档；修正走新版本号（R5 分治——与 SCAN_FAILED 同版本重传区分）
- `YANKED`：撤回分发——已分发消费者留档（详情公开可读禁下载——`asset.version_yanked`）
- `latest` 指针自动维护：approve 指向 + yank 重算（(published_at, created_at, id) 排序——skillhub 同构）
- 资产状态独立于版本：`ACTIVE/HIDDEN/ARCHIVED`（隐藏/归档作用于资产整体，不作用于单版本）

**版本读面可见性（M2 补注 → M3 八态显式分治 → M4-pre 同步，2026-09-10）**：
`PUBLISHED` 公开（资产无可见性维度——`ACTIVE` 即公开，含匿名）；`YANKED` 曾公开留档（详情公开可读禁下载）；
未公开族（DRAFT/SCANNING/SCAN_FAILED/UPLOADED/PENDING_REVIEW/REJECTED）仅资产 owner / 版本上传者本人 /
管理档（`role >= ADMIN`）/ SUPER_ADMIN 可见——列表过滤 + 详情无预览权 → 400
`asset.version_not_published` 明示（对齐 skillhub `error.skill.version.notPublished`）。

标签通道（01 §4）：`latest` 只读跟随最新 PUBLISHED；自定义标签（stable/beta）
存 `asset_version` 侧标签位（实现期以表 `asset_version_tag` 或列扩展，M3 定）。

## 8. 关键约束汇总

| 约束 | 落点 |
|------|------|
| slug 全局跨类型唯一 | `UNIQUE(slug)`（asset——M4-pre：原 `UNIQUE(namespace_id, slug)`） |
| 用户引用字符串 | 所有 user FK 为 VARCHAR(128) |
| 版本号唯一 | `UNIQUE(asset_id, version)` |
| 文件路径唯一 | `UNIQUE(version_id, file_path)` |
| label 挂载唯一 | `UNIQUE(asset_id, label_id)` |
| 同版本待审唯一 | review_task 部分唯一索引 `UNIQUE(asset_version_id) WHERE status='PENDING'` |
| 防自审 | 应用层（SUPER_ADMIN 例外，不设 DB 硬约束） |

## 9. 与相邻文档关系

- 本文档是 00-07 的存储层落点（§1 对照表）；族协议 manifest 的 JSONB 形状随 02/03/04
- 实现：M1 drizzle schema 按其落地；迁移策略 Flyway 式 forward-only（版本号段预留）
- 治理扩展表（security_audit 扫描结果、promotion_request 提升申请等）不随 M1 首版建表，
  随对应服务引入时以新迁移追加（版本号段预留意义所在，不阻塞平台底座）

## 10. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：用户/空间/资产/版本/文件/治理域表结构 + 版本状态机全序 |
| v1.1 | 2026-09-07 | sunxuewen-rush | §2 状态列实现形态（VARCHAR+应用层 zod 枚举）；§3 local_credential 补 username/failed_attempts/locked_until、user_account.id 生成注明、identity_binding subject 长度、role/permission/role_permission 三表模型；§6 audit_log 补 request_id/client_ip/user_agent、review_task 补 PENDING 部分唯一索引；§8 汇总表同步；§9 治理扩展表演进说明（对齐实战模型增补） |
| v1.2 | 2026-09-07 | sunxuewen-rush | 实现状态同步：M1 drizzle schema 四域全表落地（迁移/种子幂等，docs/01 §6 zod 单源消费） |
| v1.3 | 2026-09-08 | sunxuewen-rush | M2 实现同步：§7 状态机补「版本读面可见性」注记（DRAFT 授权集 owner/上传者/空间 ADMIN+；详情无预览权 400 version_not_published 对齐 skillhub；列表过滤语义） |
| v1.4 | 2026-09-08 | sunxuewen-rush | M3 实现同步：§5.2 asset_version 补 yank 三列（yanked_at/yanked_by/yank_reason）+ bundle 双列（bundle_storage_key/bundle_sha256）；§6 review_task 补 WITHDRAWN 态（withdraw 保留行置态——历史留档保 review version 递增契约，非 skillhub 删行简化）；§7 状态机补全八态（REJECTED 留档新号分治/SCAN_FAILED 同版本重传豁免/YANKED 禁下载留档/latest approve+yank 自动维护）+ 读面可见性改为八态显式分治（授权集含 ASSET_ADMIN） |
| v1.5 | 2026-09-10 | sunxuewen-rush | **M4-pre 扁平化重构同步**：§3 用户域删 `role`/`permission`/`role_permission`/`user_role_binding` 四表（迁移 0005）→ 平台角色改 `user_account.role` 4 档单列（0/1/10/100）+ scope 迁应用层 `token-scopes.ts`；§4 空间域整删（`namespace`/`namespace_member`，迁移 0006；留头注保编号以免打断历史引用）；§5.1 asset 去 `namespace_id`+`visibility`（迁移 0006/0007），唯一键改 `UNIQUE(slug)`、索引改 `INDEX(status)`；§6 review_task 去 `namespace_id`；§7 版本读面授权集改「owner / 上传者 / 管理档 / 超管」；§8 约束汇总同步（删「空间成员唯一」）——design/plan 见 `2026-09-10-flat-model-refactor-design` + `M4-pre-flat-model-refactor.md` |