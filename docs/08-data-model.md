# 数据模型设计

> Date: 2026-09-04
> Status: Draft（未动代码；M1 drizzle schema 按其落地）
> Scope: AI Asset Hub 表结构蓝图 —— 用户/空间/资产/版本/文件/审核/label/审计
> 设计来源：以企业实战验证的注册中心数据模型为基准（同构继承），按 00-07 规范资产化/中立化

## 1. 定位与范围

本文档定义平台持久化表结构（PostgreSQL/Drizzle 落地目标）。它是各规范在存储层的落点：

| 规范 | 落点 |
|------|------|
| 01 §3.3 坐标（slug 跨类型唯一） | `asset.UNIQUE(namespace_id, slug)` |
| 01 §3.2 元数据投影 | `asset_version.parsed_metadata_json` |
| 02/03/04 族协议 manifest | `asset_version.manifest_json` |
| 05 身份/角色/RBAC | user_account / identity_binding / namespace_member / user_role_binding |
| 06 label 三表 | label_definition / label_translation / asset_label |
| 00 §2.2 治理与生命周期 | asset / asset_version / review_task |

## 2. 通用约定

- **surrogate id**：表自增 BIGINT（`id BIGSERIAL`）；**用户引用一律 VARCHAR(128) 字符串**（05 §2）
- 审计列：`created_by`（user id）/ `created_at` / `updated_by` / `updated_at`
- 状态用**列枚举表达**（ACTIVE/HIDDEN/ARCHIVED…），不引入软删位；治理性隐藏走状态，审计由 audit_log 承担
- 计数冗余：热查询计数（download_count）冗余在主表，落库时事务内自增

## 3. 用户域

```sql
user_account          id VARCHAR(128) PK · display_name · email · avatar_url
                      · status(PENDING/ACTIVE/DISABLED) · created_at/updated_at
identity_binding      provider + provider_subject → user_account_id
                      UNIQUE(provider, provider_subject)   -- OIDC/LDAP 映射（05 §3）
local_credential      user_account_id · password_hash · UNIQUE(user_account_id)
                      -- 本地账号密码；LDAP 用户无此行（05 §3.1 纯 bind 不存密码）
api_token             user_account_id · token_hash · scope · expires_at · revoked_at
user_role_binding     user_account_id + role_id   -- 平台角色（05 §6.1）
role / role_permission  -- 角色-权限表（内置四角色随迁移种子，permission 面可扩展）
```

## 4. 空间域

```sql
namespace             id · slug UNIQUE · display_name · type(GLOBAL/TEAM)
                      · description · avatar_url · status(ACTIVE/FROZEN/ARCHIVED)
                      · created_by/created_at/updated_at
namespace_member      namespace_id + user_id + role(OWNER/ADMIN/MEMBER)
                      UNIQUE(namespace_id, user_id)          -- 05 §6.2
```

- 全局空间 `global`（平台治理面）；TEAM 空间由成员自发创建
- FROZEN 空间拒绝写（05 §6.2 判定链第 6 步）

## 5. 资产域（核心）

### 5.1 asset —— 资产主表（跨类型唯一坐标）

```sql
asset                 id · namespace_id → namespace · type(skill/mcp/agent)
                      · slug · owner_id → user_account（主要维护人）
                      · latest_version_id → asset_version（冗余指针，免 join）
                      · visibility(PUBLIC/NAMESPACE_ONLY/PRIVATE) DEFAULT PUBLIC
                      · status(ACTIVE/HIDDEN/ARCHIVED)
                      · download_count BIGINT
                      · created_by/created_at/updated_by/updated_at
                      UNIQUE(namespace_id, slug)   -- 01 §3.3 slug 跨类型唯一（type 不在唯一键）
```

- type 只是行属性，不出现在唯一键——同一个 namespace 下 skill 与 mcp 不得同 slug
- owner 是「主要维护人」，空间 ADMIN 对空间内资产完整管理权（05 §6.5 权限主轴）

### 5.2 asset_version —— 版本表（内容与投影载体）

```sql
asset_version         id · asset_id → asset · version VARCHAR(64)（semver）
                      · status —— 完整生命周期见 §7
                      · changelog · parsed_metadata_json JSONB · manifest_json JSONB
                      · file_count INT · total_size BIGINT（上传后落库）
                      · published_at · created_by/created_at
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
review_task           id · asset_version_id → asset_version · namespace_id
                      · status(PENDING/APPROVED/REJECTED) · version INT（重审计数，递增）
                      · submitted_by → user_account · reviewed_by → user_account
                      · review_comment · submitted_at · reviewed_at
                      -- 防自审（05 §6.4）：应用层强制 reviewed_by ≠ submitted_by
                      --（SUPER_ADMIN 例外）；重审 = 原版本号不变、review version+1

label_definition      id · slug UNIQUE · type(RECOMMENDED/PRIVILEGED)
                      · visible_in_filter · sort_order · parent_id 自引用
                      · created_by/created_at/updated_at          -- 06 §2
label_translation     label_id + locale + display_name · UNIQUE(label_id, locale)
asset_label           asset_id + label_id · UNIQUE(asset_id, label_id)  -- 06（≤10 应用层限）
audit_log             actor_id · action · target_type/target_id · detail JSONB
                      · created_at                                -- 全链路审计
```

## 7. 状态机（版本生命周期全序）

版本状态（上传 → 发布，扫描态嵌入；参考实战验证的全序）：

```
DRAFT → SCANNING → SCAN_FAILED ──► （修正后回 DRAFT/UPLOADED）
   │        │
   │        ▼
   │     UPLOADED → PENDING_REVIEW → PUBLISHED → （下线/归档）
   │                                        │
   └────────────────────────────────────────┘
```

- `SCANNING`：安全扫描进行中；`SCAN_FAILED`：扫描未过（可修正重新提交）
- `UPLOADED`：包可下载但未进审核（draft 与 review 之间）
- `PENDING_REVIEW` → `PUBLISHED` 需 review_task 通过（防自审见 §6）
- 资产状态独立于版本：`ACTIVE/HIDDEN/ARCHIVED`（隐藏/归档作用于资产整体，不作用于单版本）

标签通道（01 §4）：`latest` 只读跟随最新 PUBLISHED；自定义标签（stable/beta）
存 `asset_version` 侧标签位（实现期以表 `asset_version_tag` 或列扩展，M3 定）。

## 8. 关键约束汇总

| 约束 | 落点 |
|------|------|
| slug 跨类型唯一 | `UNIQUE(namespace_id, slug)`（asset） |
| 用户引用字符串 | 所有 user FK 为 VARCHAR(128) |
| 版本号唯一 | `UNIQUE(asset_id, version)` |
| 文件路径唯一 | `UNIQUE(version_id, file_path)` |
| 空间成员唯一 | `UNIQUE(namespace_id, user_id)` |
| label 挂载唯一 | `UNIQUE(asset_id, label_id)` |
| 防自审 | 应用层（SUPER_ADMIN 例外，不设 DB 硬约束） |

## 9. 与相邻文档关系

- 本文档是 00-07 的存储层落点（§1 对照表）；族协议 manifest 的 JSONB 形状随 02/03/04
- 实现：M1 drizzle schema 按其落地；迁移策略 Flyway 式 forward-only（版本号段预留）

## 10. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：用户/空间/资产/版本/文件/治理域表结构 + 版本状态机全序 |
