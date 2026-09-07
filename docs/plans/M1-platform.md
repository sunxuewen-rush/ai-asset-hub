# M1 平台底座实现计划

> Date: 2026-09-07
> Updated: 2026-09-07（v1.1：实战对标吸收——08 蓝图增补至 v1.1 后同步修正 T11-T14/T16/T19-T24；新增 §1.1 对照表；v1.2：评审定稿 R1-R7 采纳推荐值）
> Status: 定稿（评审拍板 2026-09-07：R1-R7 全部采纳推荐值）
> 注：本文档为 M1 阶段一执行记录（当时工具链 pnpm 11/vitest/tsx）；2026-09-07 已迁移 bun 1.3.14（install/test/dev，见 AGENTS.md 命令区与 M1-phase2 v1.4）——下文命令为执行时形态
> 引用链：本文档 → 规范 00 §5/§7 · 01 §6 · 05 · 08（引用不复制，字段契约以规范为准）
> 命名约定见 docs/plans/README.md（`<里程碑>-<主题>.md`）

## 1. 目标与范围

**目标**：落地 M1 平台底座（第一阶段）——monorepo 骨架 + 协议 schema 单源（三族 manifest zod）+ 数据模型（drizzle 全表按 08 + forward-only 迁移 + 种子）+ 认证服务（本地账号 + Session + LDAP 企业通道 + RBAC 判定基础设施，按 05）。

| 板块 | 内容 | 依据 |
|------|------|------|
| monorepo 骨架 | pnpm workspaces（apps/{server,web,cli} + packages/protocol）+ 工具链 + 全仓 typecheck/test 绿 | 00 D4 · AGENTS.md |
| packages/protocol | slug/AssetType/校验错误码共享 + skill/mcp/agent 三族 manifest zod schema | 01 §2/§6 · 02 §3 · 03 §3 · 04 §3 |
| drizzle schema | 用户/空间/资产/治理四域全表（08 §3-§6），含 §8 关键约束 | 08 |
| 迁移与种子 | 版本化 forward-only 迁移；种子 = 四平台角色 + 权限码 + global 空间 + 初始管理员 | 08 §9 · 05 §6.1/§6.4 · 08 §4 |
| 认证服务 | 本地注册/登录 + 服务端 Session + LDAP 通道（默认关）+ RBAC 判定链 + 认证审计 | 05 §3-§6 |

**后置清单（不在本 plan，表结构仍先就位）**：命名空间/空间成员 HTTP API、对象存储接口（无资产上传，M3 前置）、OIDC 授权码流、CLI Device Flow、API Token 签发、审计浏览 API、资产上传管线、治理扩展表（security_audit 扫描结果 / promotion_request 提升申请，见 08 §9，随对应服务引入时加迁移）。→ 00 §5 M1 状态更新方式见 R1。

**不含**：Web/CLI 业务功能（M4/M5）、资产域管线（M2/M3）、前端 i18n 资源（M4，07 生效）。

## 1.1 实战对标结论（评审前吸收，2026-09-07）

对同构数据来源（企业实战验证的注册中心，Java/Spring，45 个 Flyway 迁移）做了源码级对照，
08 蓝图按实战增补至 v1.1，本 plan 对应 Task 同步修正：

| # | 对照发现 | 处置 |
|---|---------|------|
| D1 | 状态/枚举列实战用 VARCHAR + 应用层枚举（非 PG enum），枚举加值零迁移 | 08 §2 v1.1 定形态 → T11-T14 落地 |
| D2 | local_credential 含 username UNIQUE（登录名独立于身份 id）+ failed_attempts/locked_until（行级失败锁定，多实例生效） | 08 §3 v1.1 → T11/T20/T22 |
| D3 | 本地注册身份 id = `usr_<uuid>`，外部身份源建号取映射值 | 08 §3 v1.1 注明 → T20 |
| D4 | role/permission/role_permission 三表（code+is_system，permission 独立表=扩展面） | 08 §3 v1.1 → T11/T16/T23 |
| D5 | audit_log 含 request_id/client_ip/user_agent（可调查性） | 08 §6 v1.1 → T14/T24 |
| D6 | review_task 部分唯一索引（同版本防并发双 PENDING，DB 硬约束） | 08 §6/§8 v1.1 → T14 |
| D7 | security_audit / promotion_request 蓝图缺口（无对应服务） | 不进 M1，留后置清单（08 §9 演进说明） |
| D8 | 会话 CSRF 防护（cookie session 通道标配） | → T19 补 CSRF |
| D9 | 登录防时序枚举（用户名不存在也执行一次慢哈希 verify） | → T22 补 dummy verify |

## 2. 待拍板决策（评审逐条确认；默认按推荐值执行）

| # | 决策 | 推荐值 | 备选 | 一句话理由 |
|---|------|--------|------|-----------|
| R1 | 本轮范围与 00 §5 更新语义 | 本 plan = M1 第一阶段（core）；命名空间 API/对象存储/OIDC/Device Flow/Token/审计浏览 = M1 第二阶段（另立 plan）。00 §5 M1 行更新为「进行中（阶段一 platform-core 完成）」**不翻 ✅** | 收紧 00 M1 定义仅含本 plan 范围后翻 ✅ | 出口标准要求 M1 描述内容全部完成才 ✅；不伪造完成 |
| R2 | 认证落地子集 | 本地账号 + Session + RBAC 判定基础设施 + **LDAP 通道全流程**（05 §3.1）进 M1；OIDC 授权码后置（identity_binding 表已备，provider 抽象留接口） | OIDC 也进 M1 | LDAP 规范 §3.1 已细化到可执行；OIDC 通用流工作量大且无 IdP 依赖面，后置不阻塞认证主链 |
| R3 | 密码哈希 | **node:crypto scrypt**（`$scrypt$N$r$p$salt$hash` 自定格式，参数 N=2^17 r=8 p=1）+ timingSafeEqual | argon2（PHC 格式） | 零 native/零依赖——内网机与离线安装无 node-gyp/prebuilt 风险；OWASP 认可 scrypt |
| R4 | Web Session 存储 | **内存 SessionStore**（进程内 Map + TTL 8h 惰性清理 + 定期扫）；多实例共享存储为部署期配置项（接口预留，后接 Redis/DB） | 08 增 session 表（DB session） | 08 表蓝图无 session 表；自托管单实例默认场景够用，避免为未定多实例需求扩 schema |
| R5 | 迁移工具链 | **drizzle-kit generate + migrate** 标准流程：schema 单源自动生成 SQL（防手写漂移），时间戳版本天然 forward-only、无并发冲突 | 手写编号 SQL（0001_…）+ 自研 runner | 08 §9「Flyway 式 forward-only（版本号段预留）」语义 = 只增不改纪律；drizzle 官方主流做法与「schema 单源」哲学一致 |
| R6 | 首管理员引导 | **SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD env**（可选）：设置则种子建 SUPER_ADMIN；未设置时启动打 warning，注册通道开放（REGISTRATION_ENABLED=true 默认） | 首个注册用户自动 SUPER_ADMIN | 显式安全；避免「先到先得超管」竞态与安全隐患 |
| R7 | 工具链 | pnpm workspaces + **turbo**（typecheck/test/lint/build 编排）+ **vitest**（root workspace projects）+ **biome**（lint+format 单工具） | 纯 pnpm --filter；eslint+prettier | .gitignore 已备 .turbo/；biome 零配置心智；vitest 对 Hono app + zod 测试友好 |

> **评审结论（2026-09-07 拍板）**：R1-R7 全部采纳推荐值，无调整项。

## 3. 技术基线（2026-09-07 本机核实）

- Node v22.23.1（engines `>=22`）· pnpm 11.20.0 · Docker 29.7.2 + compose v5.4.0
- 包前缀 `@ai-asset-hub/*`；workspace：`packages/protocol` · `apps/server` · `apps/web` · `apps/cli`
- dev 依赖消费源码（`exports` 指向 `src/index.ts`），build 产物仅发布用（M1 不发布）
- DB：PostgreSQL（dev 用根 `docker-compose.yml` 起 `postgres:17-alpine`，db `ai_asset_hub`，端口 5432）
- 依赖安装断流 → 走 china-network-dependency-mirrors 技能的镜像方案（不猜测 registry）

## 4. Task 清单

约定：每个 Task 完成 = 断言为真；建议 commit 点为 Task 结束（Conventional Commits）。
代码提交前验证 = typecheck + 相关测试绿；**禁 mock 服务模块**（网络层可 stub 或真实 fake server）。

### 阶段一 monorepo 骨架（T1-T5）

#### T1 根工程：workspace 声明与 task 编排
- **Files**
  - Create: `package.json`（root，private，scripts 走 turbo）、`pnpm-workspace.yaml`、`turbo.json`、`tsconfig.base.json`（strict + `moduleResolution: bundler` + `paths` 映射 `@ai-asset-hub/*`）、`.npmrc`（engine-strict 等）、`.env.example`（根，见 T17 env 清单）
  - Modify: `.gitignore`（补 `*.local`、`migrations` 不需要——迁移入库）
- **Steps**：写 package.json（engines node>=22）→ pnpm-workspace（`packages: [apps/*, packages/*]`）→ turbo.json pipeline（typecheck/test/lint/build，依赖拓扑）→ 安装
- **Assert**
  - `pnpm install` 退出 0
  - `pnpm -r list --depth -1` 输出 4 个 workspace 包名
- **Commit**: `chore: scaffold pnpm workspace with turbo pipeline`

#### T2 代码风格：biome
- **Files**
  - Create: `biome.json`（linter + formatter 推荐集，TS/TSX，organize imports）
  - Modify: root `package.json`（lint / format scripts）
- **Assert**
  - `pnpm lint` 退出 0（空仓无错误）
  - `pnpm format:check` 退出 0
- **Commit**: `chore: add biome lint and format config`

#### T3 packages/protocol 工程骨架
- **Files**
  - Create: `packages/protocol/package.json`（name `@ai-asset-hub/protocol`，`exports`/`types` → `./src/index.ts`）、`packages/protocol/tsconfig.json`（extends base）、`packages/protocol/src/index.ts`（临时导出占位）、`packages/protocol/src/slug.test.ts`（占位断言，验证 vitest 通）
  - Create: root `vitest.workspace.ts`（projects: packages/*、apps/server；环境 node）
- **Steps**：装 dev 依赖（typescript/vitest/@types/node）→ 跑通首测试
- **Assert**
  - `pnpm --filter @ai-asset-hub/protocol test` → 1 passed
  - `pnpm --filter @ai-asset-hub/protocol typecheck` → 0 error
- **Commit**: `chore(protocol): scaffold package with vitest harness`

#### T4 apps/server 骨架 + 健康检查
- **Files**
  - Create: `apps/server/package.json`（`@ai-asset-hub/server`，deps: hono · zod；dev: tsx · @types/node）、`apps/server/tsconfig.json`、`apps/server/src/app.ts`（Hono app 工厂 + `GET /healthz` → `{status:"ok"}`）、`apps/server/src/index.ts`（serve 入口）、`apps/server/src/app.test.ts`（`app.request('/healthz')` 断言 200）
  - Create: root `docker-compose.yml`（postgres:17-alpine + healthcheck）
- **Steps**：装依赖 → 测试 → `pnpm --filter @ai-asset-hub/server typecheck`
- **Assert**
  - `pnpm --filter @ai-asset-hub/server test` → 1 passed
  - `docker compose up -d db` 后 `docker compose ps` 显示 healthy
- **Commit**: `feat(server): scaffold hono app with healthz`

#### T5 apps/web / apps/cli 最小占位
- **Files**
  - Create: `apps/web/package.json`（react@19 + react-dom + vite + @vitejs/plugin-react）、`apps/web/index.html`、`apps/web/vite.config.ts`、`apps/web/src/main.tsx`（渲染 `AI Asset Hub` 静态文案，无业务）、`apps/web/tsconfig.json`
  - Create: `apps/cli/package.json`（private，`exports` 指向 src）、`apps/cli/src/index.ts`（导出包版本号占位）、`apps/cli/tsconfig.json`
- **Assert**
  - `pnpm --filter @ai-asset-hub/web build` 成功产出 dist
  - `pnpm --filter @ai-asset-hub/cli typecheck` 0 error
  - root `pnpm typecheck`（turbo 全仓）0 error
- **Commit**: `chore(apps): add web and cli minimal skeletons`

### 阶段二 packages/protocol 三族 schema（T6-T9）

#### T6 共享原语：slug / AssetType / 校验错误码
- **Files**
  - Create: `packages/protocol/src/slug.ts`——`SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`（01 §3.3）+ zod：结构 regex + refine 禁 `--` + length 1-64
  - Create: `packages/protocol/src/type.ts`——`AssetType = z.enum(['skill','mcp','agent'])`（01 §2 登记表，`z.infer` 导出）
  - Create: `packages/protocol/src/errors.ts`——错误码常量/联合：族协议表合并去重（02 §4 + 04 §5：`invalid_skill_frontmatter` / `invalid_agent_frontmatter` / `missing_name` / `invalid_name` / `missing_description` / `missing_body`；包结构类共享：`unsupported_file_type` / `file_too_large` / `too_many_files` / `package_too_large`；mcp 专属：`sensitive_header_plaintext`（03 §4））
  - Modify: `src/index.ts` 全量导出
- **Steps**：TDD——先写 `slug.test.ts` 参数化正反例（`my-skill`✓ / `A`✗ / `a--b`✗ / 65 字符✗ / `_x`✗ / `a`✓）
- **Assert**
  - protocol test 全绿；typecheck 0 error
- **Commit**: `feat(protocol): add slug asset-type and error-code primitives`

#### T7 skill manifest schema
- **Files**
  - Create: `packages/protocol/src/skill/manifest.ts`——`SkillManifestSchema`（02 §3.1）：`name` = slugSchema（必）、`description` = 非空 ≤1024（必）、其余字段 **passthrough**（OpenSkills/Claude 生态未知字段向前兼容：allowed-tools、metadata 等），导出 `SkillManifest = z.infer`
  - Test: `src/skill/manifest.test.ts`
- **Steps**：示例即契约（01 §6）——正例用真实可读 SKILL.md frontmatter（含生态未知字段验证保留）；反例：缺 name / 非法 name（大写、下划线）/ 缺 description / 超 1024
- **Assert**
  - 正例解析 `success=true` 且未知字段保留在 output
  - 反例各返回对应错误（missing_name / invalid_name / missing_description / description 超长）
- **Commit**: `feat(protocol): add skill manifest schema`

#### T8 mcp manifest schema（最重）
- **Files**
  - Create: `packages/protocol/src/mcp/manifest.ts`——按 03 §3/§4：
    - 顶层：`name`（必，slug）· `description`（必 ≤1024）· `servers`（必非空）· passthrough（03 §7 `tools` 可选声明保留）
    - 兼容导入（03 §3.1）：zod preprocess——顶层取 `servers ?? mcpServers ?? mcp`（三方键名归一）
    - `ServerEntry`：`type` enum `stdio/http/sse`（必）· `enabled` boolean（必）· stdio 组 `command/args/env/timeout` · http/sse 组 `url/headers`
    - refine 互斥与必填（03 §3.3）：`stdio` → 必有 `command` 且不得有 `url`；`http/sse` → 必有合法 http(s) `url` 且不得有 `command`；`command` 非空、不含反斜杠；`headers`/`env` 值字符串
    - 敏感头强制 `${VAR}` 引用（03 §4）：`authorization` / `x-api-key` / `api-key` / `x-api-token`（键名大小写不敏感）值须匹配 `^\$\{[A-Za-z0-9_]+\}$`，违规报 `sensitive_header_plaintext`
  - Test: `src/mcp/manifest.test.ts`
- **Steps**：正例 4 组（http 远程含 `${GITHUB_TOKEN}` 头 / sse / stdio 本地 scripts/ 引用 / `mcpServers` 键导入归一）；反例 6 组（敏感头明文、`stdio` 带 url、`http` 无 url、空 servers、缺 enabled、command 带 `\`）
- **Assert**
  - 正例全过且 `mcpServers` 键导入后 output.servers 归一成功
  - 反例各自命中预期 code（issue 含 path 定位到具体 server 条目）
- **Commit**: `feat(protocol): add mcp manifest schema with secret rules`

#### T9 agent manifest schema
- **Files**
  - Create: `packages/protocol/src/agent/manifest.ts`——按 04 §3.1：`name`（必，slug）· `description`（必 ≤1024）· 可选组 `label`(≤64) / `icon` / `color` / `category` / `keywords`(string[]) · 未知字段 passthrough（04 §3.1 未知忽略 = 校验不报错且保留，与 skill 同策略）
  - Test: `src/agent/manifest.test.ts`
- **Steps**：正例含全部可选字段 + x-aih- 扩展；反例：缺 name / description / 非法 keywords 元素类型 / description 超长
- **Assert**：正例过；反例各自命中错误；未知字段（如消费端自定义键）保留
- **Commit**: `feat(protocol): add agent manifest schema`

### 阶段三 DB 层（T10-T16）

#### T10 db 连接与 drizzle 配置
- **Files**
  - Create: `apps/server/src/config/env.ts`（T17 细化前最小集：`DATABASE_URL` / `PORT`，zod parse）、`apps/server/src/db/client.ts`（pg Pool + drizzle，schema 注册；**惰性初始化**——连接池首次查询才建立，不阻塞 healthz）、`apps/server/drizzle.config.ts`（schema 入口 + migrations 输出 + dialect pg）
- **Assert**
  - `pnpm --filter @ai-asset-hub/server typecheck` 0 error
- **Commit**: `chore(server): add drizzle client and config`

#### T11 schema：用户域
- **Files**
  - Create: `apps/server/src/db/schema/users.ts`——08 §3（v1.1）落地（drizzle pgTable；**枚举列 = VARCHAR + 应用层 z.enum 常量**（08 §2 形态，不建 PG enum type），审计列按 08 §2 适用性补）：
    - `user_account`：id VARCHAR(128) PK（05 §2 字符串主键；本地注册生成 `usr_<uuid>`，外部源建号取映射值）· display_name · email · avatar_url · status(PENDING/ACTIVE/DISABLED) · created_at/updated_at
    - `identity_binding`：provider · provider_subject VARCHAR(256) · user_account_id FK · **UNIQUE(provider, provider_subject)** · 审计列
    - `local_credential`：user_account_id FK · username VARCHAR(64) **UNIQUE**（本地登录名，独立于身份 id）· password_hash · failed_attempts INT · locked_until · created_at/updated_at
    - `api_token`：user_account_id FK · token_hash · scope · expires_at · revoked_at
    - `user_role_binding`：user_account_id + role_id · UNIQUE(user_account_id, role_id)
    - `role`：code VARCHAR(64) UNIQUE（种子值大写蛇形 05 §6.1）· name · description · is_system · 审计列
    - `permission`：code VARCHAR(128) UNIQUE · name · group_code（独立表 = 权限扩展面）
    - `role_permission`：role_id + permission_id · PRIMARY KEY(role_id, permission_id)
  - Create: `apps/server/src/db/schema/index.ts`（聚合导出）
- **Assert**：typecheck 0 error；VARCHAR 列与 z.enum 常量命名对照 08 §3/05 一致（PENDING/ACTIVE/DISABLED、code 'SUPER_ADMIN' 等）；**无 PG enum type 生成**
- **Commit**: `feat(server): add users domain drizzle schema`

#### T12 schema：空间域
- **Files**
  - Create: `apps/server/src/db/schema/namespaces.ts`——08 §4（枚举列 VARCHAR + z.enum 常量同 T11 形态）：
    - `namespace`：slug UNIQUE · display_name · type(GLOBAL/TEAM) · description · avatar_url · status(ACTIVE/FROZEN/ARCHIVED) · created_by/created_at/updated_at
    - `namespace_member`：namespace_id + user_id FK · role(OWNER/ADMIN/MEMBER) · **UNIQUE(namespace_id, user_id)**
- **Assert**：typecheck 0 error
- **Commit**: `feat(server): add namespaces domain drizzle schema`

#### T13 schema：资产域
- **Files**
  - Create: `apps/server/src/db/schema/assets.ts`——08 §5（本 plan 只落表，无业务管线；枚举列 VARCHAR + z.enum 常量）：
    - `asset`：namespace_id FK · type(skill/mcp/agent) · slug · owner_id FK · latest_version_id（冗余指针，先可空）· visibility(PUBLIC/NAMESPACE_ONLY/PRIVATE) · status(ACTIVE/HIDDEN/ARCHIVED) · download_count · 审计列 · **UNIQUE(namespace_id, slug)**（slug 跨类型唯一，type 不入键）
    - `asset_version`：asset_id FK · version VARCHAR(64) · status 六态(DRAFT/SCANNING/SCAN_FAILED/UPLOADED/PENDING_REVIEW/PUBLISHED)（08 §7）· changelog · parsed_metadata_json JSONB · manifest_json JSONB · file_count · total_size · published_at · created_by/created_at · **UNIQUE(asset_id, version)**
    - `asset_file`：version_id FK · file_path · file_size · content_type · sha256 VARCHAR(64) · storage_key · **UNIQUE(version_id, file_path)**
- **Assert**：typecheck 0 error；约束注释对照 08 §8 表逐条可查
- **Commit**: `feat(server): add assets domain drizzle schema`

#### T14 schema：治理域
- **Files**
  - Create: `apps/server/src/db/schema/governance.ts`——08 §6（枚举列 VARCHAR + z.enum 常量）：
    - `review_task`：asset_version_id FK · namespace_id FK · status(PENDING/APPROVED/REJECTED) · version INT（重审计数递增）· submitted_by / reviewed_by FK · review_comment · submitted_at/reviewed_at · **部分唯一索引 UNIQUE(asset_version_id) WHERE status='PENDING'**（D6：防并发双待审，DB 硬约束）
    - `label_definition`：slug UNIQUE · type(RECOMMENDED/PRIVILEGED) · visible_in_filter · sort_order · parent_id 自引用 FK · 审计列
    - `label_translation`：label_id + locale + display_name · UNIQUE(label_id, locale)
    - `asset_label`：asset_id + label_id · UNIQUE(asset_id, label_id)
    - `audit_log`：actor_id（可空=匿名）· action · target_type/target_id · **request_id · client_ip · user_agent**（D5）· detail JSONB · created_at（索引 created_at、target_type+target_id）
- **Assert**：typecheck 0 error；全部 UNIQUE 约束与 08 §8 汇总表逐条对应
- **Commit**: `feat(server): add governance domain drizzle schema`

#### T15 迁移生成与约束验证
- **Files**
  - Create（drizzle-kit generate 产物，**提交入库**）：`apps/server/drizzle/*.sql`（初始全表 + 索引 + 约束）
  - Create: root scripts `db:migrate` / `db:studio`（package.json scripts）
- **Steps**：起 PG（T4 compose）→ `pnpm db:migrate`（首次建全表）→ 二次运行（断言幂等：0 新迁移）→ psql 抽查约束
- **Assert**
  - 二次 migrate 输出 applied 0
  - 约束抽查脚本断言全真（`psql -c` 查 pg_constraint / pg_indexes）：`asset(namespace_id,slug)` 唯一 · `asset_version(asset_id,version)` · `asset_file(version_id,file_path)` · `namespace_member(namespace_id,user_id)` · `identity_binding(provider,provider_subject)` · `local_credential(user_account_id)` / `local_credential(username)` 唯一 · `role_permission(role_id,permission_id)` 复合 PK · `review_task` 部分唯一索引（indexdef 含 `WHERE status = 'PENDING'`）
- **Commit**: `feat(server): add initial forward-only migration`

#### T16 种子：角色/权限/global 空间/管理员
- **Files**
  - Create: `apps/server/src/db/seed.ts`——幂等 upsert（role/permission 按 code，namespace 按 slug）：
    - 四平台角色（05 §6.1，code 大写蛇形 + is_system=true：`SUPER_ADMIN` / `ASSET_ADMIN` / `USER_ADMIN` / `AUDITOR`）
    - permission 十码（05 §6.4 + group_code 归类：asset:publish/review:submit/asset:manage/asset:promote → group asset；review:approve → review；namespace:manage → namespace；promotion:approve → promotion；user:manage/user:approve → user；audit:read → audit）
    - role_permission 绑定按角色职责（05 §6.4 矩阵：ASSET_ADMIN=asset 组+review:approve+promotion:approve；USER_ADMIN=user 组；AUDITOR=audit:read；SUPER_ADMIN 不绑行——硬判定短路 05 §6.3）
    - global 空间（08 §4，type=GLOBAL）
    - SEED_ADMIN_* env 存在 → 建本地账号（id=`usr_<uuid>` + local_credential.username=SEED_ADMIN_USERNAME）并绑 SUPER_ADMIN 角色（R6）
  - Create: root scripts `db:seed`
- **Assert**
  - `pnpm db:seed` 跑两遍：第二遍 0 报错（幂等）；psql 查 role 表 4 行、permission 表 10 行、global 空间 1 行
  - env 设 SEED_ADMIN 时 user_account 出现对应用户且 user_role_binding 指向 code='SUPER_ADMIN' 的角色
- **Commit**: `feat(server): add seed for roles permissions and global namespace`

### 阶段四 认证服务（T17-T24，按 05）

#### T17 env 配置全集（zod）
- **Files**
  - Modify: `apps/server/src/config/env.ts`——05 §3.1 + §5 对应：
    - 基础：`NODE_ENV` / `PORT` / `DATABASE_URL`
    - 会话：`SESSION_SECRET`（必，≥32 字符校验）· `SESSION_TTL_HOURS`（默认 8，05 §5）
    - 注册/准入：`REGISTRATION_ENABLED`（默认 true）· `ACCESS_POLICY`（默认 open，05 §4 策略枚举，M1 实现 open + email_domain 常量预留）
    - LDAP 组（05 §3.1 全组，默认关闭）：`LDAP_ENABLED`（默认 false）· `LDAP_URLS`（逗号分隔多 DC）· `LDAP_BIND_MODE`（默认 auto）· `LDAP_USER_BASE` · `LDAP_USER_ID_ATTR`（默认 sAMAccountName）· `LDAP_TIMEOUT_MS`（默认 5000）
    - 种子：`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`（可选，R6）
  - Create: `.env.example` 同步全清单（根，T1 已建则补全）
- **Steps**：TDD——`env.test.ts`：缺 DATABASE_URL 拒绝 / SESSION_SECRET 过短拒绝 / LDAP_ENABLED=true 但 LDAP_URLS 空拒绝 / 合法全集通过
- **Assert**：env 测试全绿；typecheck 0 error
- **Commit**: `feat(server): add zod env config for auth stack`

#### T18 密码哈希（R3）
- **Files**
  - Create: `apps/server/src/auth/password.ts`——`hash(password)` / `verify(password, stored)`：node:crypto scrypt（N=2^17 r=8 p=1），存储格式 `$scrypt$N$r$p$<salt b64>$<hash b64>`，比较走 timingSafeEqual；格式解析失败返回 false（不抛）
    - **maxmem 必传**：N=2^17 r=8 内存需求 128·N·r ≈ 128MiB > Node 默认 maxmem 32MiB（不显式设置会运行时报错）——scrypt 调用统一传 `maxmem: 256MiB`（常量，2 倍裕量）
- **Steps**：TDD——`password.test.ts`：hash 非明文 / verify 对 / verify 错（篡改 hash 或密码）false / 同一密码两次 hash salt 不同 / 畸形存储串 verify false 不抛异常
- **Assert**：password 测试全绿
- **Commit**: `feat(server): add scrypt password hashing`

#### T19 Session store 与 cookie 中间件（R4，含 D8 CSRF）
- **Files**
  - Create: `apps/server/src/auth/session.ts`——`SessionStore` 接口（create/get/revoke）+ `InMemorySessionStore`（Map + createdAt/expiresAt，惰性过期清理，8h TTL 可配）；`SessionManager`（签发：session id 随机 ≥32B；校验：存在且未过期）
  - Create: `apps/server/src/auth/session-middleware.ts`——Hono 中间件：读 `aih_session` cookie → 解析 → `c.set('principal', …)`；无效/过期 → 匿名（不 401，由路由判定）；登出 = revoke + Set-Cookie 过期
  - Create: `apps/server/src/auth/csrf.ts`——CSRF 防护（D8，cookie session 通道标配）：cookie 设 `SameSite=Lax`（+Secure 按 NODE_ENV）；non-GET/HEAD/OPTIONS 校验链：有 Origin → 与 Host 同源校验；Origin 缺失 → 查 Referer 同源；**两者都缺失 → 拒绝**（安全默认；非浏览器客户端须显式带 Origin，或走后续无 cookie 通道/白名单），失败 403 `auth.csrf_failed`；API Token/Device Flow 通道豁免白名单可配
  - Test: `src/auth/session.test.ts` + `src/auth/csrf.test.ts`
- **Steps**：TDD——session：create→get 命中 / 过期（注入短 TTL）get null / revoke 后 get null / 中间件带/不带 cookie 的 principal 状态；csrf：同源 non-GET 放行 / 异源 Origin 403 / 无 Origin 且无 Referer 的 non-GET 403 / GET 豁免
- **Assert**：session + csrf 测试全绿；typecheck 0 error
- **Commit**: `feat(server): add session store cookie middleware and csrf`

#### T20 本地账号 service（register/localLogin）
- **Files**
  - Create: `apps/server/src/auth/users.ts`——05 §4/§4.1（D2/D3 吸收）：
    - `register({username, password, displayName?, email?})`：**username 归一与格式校验**（trim + lowercase；`^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$` 1-64，非法 → `auth.username_invalid`）→ username 冲突 → `auth.username_taken`；REGISTRATION_ENABLED=false → `auth.registration_disabled`；密码策略（最小长度 8 常量）→ 建 user_account(id=`usr_<uuid>`，status=ACTIVE，OPEN 准入默认) + local_credential(username UNIQUE, password_hash, failed_attempts=0)
    - `localLogin(username, password)`：入参同规则归一（lowercase）→ 按 **local_credential.username** 查凭据（登录名独立于身份 id，D2）→ verify；失败 failed_attempts+1，超阈值（如 5 次/15 分钟，常量）置 locked_until；登录成功重置 failed_attempts=0；账号状态判定：DISABLED → `auth.user_disabled`（05 §4.1 拒绝全部）；PENDING → 无 Session（`auth.user_pending`）；locked_until 未过 → `auth.user_locked`
    - 审计：register / login_success / login_failed 事件（T24 audit service，先留调用点）
  - Test: `src/auth/users.test.ts`（DB 集成，T15 迁移后的测试库）
- **Assert**：注册（user_account.id 前缀 `usr_`）→ 非法 username 拒绝 → 重名拒绝 → 登录成功（大小写输入归一命中）→ 错密码失败计数 → 超阈值锁定 → 锁定过期自动解锁 → DISABLED 拒绝 全绿
- **Commit**: `feat(server): add local user service`

#### T21 LDAP 通道 service（05 §3.1）
- **Files**
  - Create: `apps/server/src/auth/ldap.ts`（deps: ldapjs 纯 JS）——按 05 §3.1：
    - 连接解析：`LDAP_URLS` 多 DC，bind 失败按序故障转移
    - `authenticate(username, password)`：auto 模式三重身份尝试（UPN `user@domain` → `CN=user,<LDAP_USER_BASE>` → 裸名搜索 bind）；`LDAP_TIMEOUT_MS` 单次超时
    - 目录侧禁用/锁定（LDAP 错误码 533/701 等）→ 拒绝且**不回退**本地（`auth.ldap_denied`）；网络不可达/超时 → `{ unreachable: true }` 由编排层回退本地（05 §3.1 第 4 步）
    - 建号：`LDAP_USER_ID_ATTR` 取值 → user_account（status=ACTIVE，无平台角色），同步 displayName
  - Test: `src/auth/ldap.test.ts`——**真实 fake LDAP server**（ldapjs 起本地 server，注入用户条目）：bind 成功 / 密码错 / 用户禁用码 / 多 DC 故障转移（首 DC 不可达 → 次 DC 成功）/ 超时（不可达地址短超时）
- **Steps**：起 fake server 于随机端口 → 各分支断言（网络层真实请求，禁 mock 服务模块）
- **Assert**：ldap 测试全绿（LDAP_ENABLED 关时 service 不可用路径也覆盖）
- **Commit**: `feat(server): add ldap channel with failover and auto-provision`

#### T22 认证编排 + auth routes（本地+LDAP 汇合）
- **Files**
  - Create: `apps/server/src/auth/auth-service.ts`——登录编排（05 §3.1 第 1-5 步全序，D2/D9 吸收）：
    1. username 存在 **local_credential**（保留本地账号，如 seed admin）→ 跳过 LDAP 走本地（逃生通道）
    2. LDAP enabled → bind（三重 × 多 DC，超时兜底）
    3. 目录禁用 → 403 `auth.ldap_denied`，**不回退**
    4. 网络类失败 → 回退本地（该 username 存在 local_credential 时）；无本地凭据 → `auth.invalid_credentials`
    5. 成功 → 自动建号（id = LDAP_USER_ID_ATTR 映射值，D3）或同步 displayName → 签 Session
    - 纯本地模式 = 跳过 2-4 直走本地校验
    - **dummy verify（D9）**：本地校验前 username 无凭据时也执行一次 scrypt verify（预置 DUMMY_HASH 常量），抹平「用户不存在 vs 密码错」的响应耗时差，防账号枚举（05 §3.1 安全边界）
  - Create: `apps/server/src/auth/routes.ts`——`POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`（06 §5.3 前缀 `/api`；响应 JSON 统一 `{code, message}`，07 §4 结构化错误码）
  - Create: `apps/server/src/auth/rate-limit.ts`——登录限流（05 §3.1 安全边界）：内存滑动窗口按 username+IP，超阈值 429 `auth.rate_limited`（不锁死账号防 DoS，行级锁定职责在 T20 local_credential）
  - Test: `src/auth/auth-service.test.ts` + `src/auth/routes.test.ts`（DB 集成 + app.request 全链路）
- **Steps**：集成用例——注册→登录→me→登出→me 401；错密码 401 且审计落 login_failed；LDAP on（fake server）→ LDAP 用户自动建号登录成功；保留本地账号（local_credential 存在）逃生；禁用目录用户 403 不回退；限流触发 429
- **Assert**：routes 集成测试全绿；审计表行断言存在
- **Commit**: `feat(server): add auth service orchestration and routes`

#### T23 RBAC 判定基础设施（05 §6）
- **Files**
  - Create: `apps/server/src/auth/permissions.ts`——权限码常量（05 §6.4 十码字符串字面量联合 + group 归类），**seed 与 RBAC 共用此单源**（防常量/种子漂移）
  - Create: `apps/server/src/auth/rbac.ts`——
    - `getPlatformRoles(userId)`：user_role_binding → role → role_permission → permission 三表 join 返回 code 集
    - `getNamespaceRoles(userId, namespaceId)`：namespace_member join
    - `can({principal, permission, namespaceId?})` 实现判定链（05 §6.3 第 1-7 步）：账号状态（DISABLED 拒全部）→ 平台角色 → role code 含 `SUPER_ADMIN` 短路 → 命名空间角色（涉及空间资源时）→ 空间状态（FROZEN 拒写类权限）→ 合并判定
    - `isSelfReview(submittedBy, reviewedBy)` 助手（05 §6.4 防自审：相等即拒，SUPER_ADMIN 例外由调用方传参放行）
  - Test: `src/auth/rbac.test.ts`
- **Steps**：种子四角色权限矩阵样例（user_role_binding 直插）+ 判定链用例：SUPER_ADMIN 短路全权限 / 普通用户无平台权限 / MEMBER 在空间内可 asset:publish / 非成员不可 / FROZEN 空间拒写 / DISABLED 拒全部 / 防自审助手
- **Assert**：rbac 测试全绿；typecheck 0 error
- **Commit**: `feat(server): add rbac decision chain`

#### T24 审计 service 与认证埋点
- **Files**
  - Create: `apps/server/src/audit/audit.ts`——`writeAudit({actorId?, action, targetType?, targetId?, requestId?, clientIp?, userAgent?, detail?})` 落 audit_log（actor_id 可空=匿名；request_id/client_ip/user_agent 由中间件上下文注入，D5）
  - Modify: T20/T22 调用点补齐审计事件（register / login_success / login_failed / logout），登录失败 detail 记 username（不含密码——密码只在验证路径内存中流转 05 §3.1）
  - Test: `src/audit/audit.test.ts`
- **Assert**：写入断言（actor/action/detail 正确落库；**request_id/client_ip/user_agent 由中间件上下文注入并落库**，D5）；认证失败路径不产生含密码的日志/响应（断言响应体与审计 detail 均无明文密码）
- **Commit**: `feat(server): add audit service with auth events`

### 阶段五 收尾（T25-T27）

#### T25 文档同步与命令区填充
- **Files**
  - Modify: `AGENTS.md`（「命令」区 M1 后填充 → 填入已实跑命令：pnpm install / typecheck / test / lint / build / db:migrate / db:seed / docker compose up -d db）
  - Modify: `README.md`（开发起步段：clone → install → compose → migrate → seed → dev；一句话项目说明保持）
  - Modify: `docs/01-asset-protocol.md` §2 类型登记表——清除 03/04 行「（待写）」残留（漂移修复：03/04 已 v1.x 定稿；加修订记录 v1.3 行）
- **Assert**：grep 无「待写」残留；README 命令与真实跑通一致
- **Commit**: `docs: fill command section and fix protocol registry drift`

#### T26 全仓验证 + 8 维自检
- **Steps**：turbo 全仓 typecheck + test（0 fail）→ lint → build → 起 server 冒烟（healthz + register/login/me/logout curl 手动清单；**non-GET curl 带 `-H 'Origin: http://localhost:<port>'`** 过 CSRF 同源校验，T19）→ **8 维自检打分表**（简洁/极致/正确/一致/安全/前瞻/直白易懂/好维护，≥9 才进入 T27 提交）
- **Assert**：`pnpm typecheck` 0 error · `pnpm test` 0 failed · `pnpm lint` 0 error · 冒烟清单逐项过
- **Commit**: （无独立 commit，作为 T27 提交前验证记录）

#### T27 里程碑状态更新与发布
- **Files**
  - Modify: `docs/00-product-direction.md` §5 M1 行——按 R1 拍板语义更新（状态注记：M1 阶段一 platform-core 完成；阶段二待另立 plan），版本 v1.5 修订记录同步
  - （plan 自身定稿标注已于 2026-09-07 评审拍板时完成：Status 定稿 + §2 拍板结论 + 修订记录 v1.2，无需重复）
- **Steps**：commit → push → **push 后验证同步**（`git status` ahead/behind 归零 + `git ls-remote origin` 比对 HEAD，不信被截断输出）
- **Commit**: `docs: update M1 milestone status to phase-one complete`

## 5. 验收总断言（plan 全绿定义）

- 全仓 `pnpm typecheck` 0 error；`pnpm test` 0 failed；`pnpm lint` 0 error；`pnpm build`（web/protocol）成功
- 迁移幂等：`pnpm db:migrate` 二次运行 0 新迁移；约束抽查脚本全真
- 种子幂等：`pnpm db:seed` 二次运行 0 报错
- 认证冒烟：注册→登录→me→登出 全链路 200/401 语义正确；LDAP 开关 on/off 双路径覆盖
- 8 维自检 ≥9（T26 打分表留档）
- git 同步：push 后 status 无 ahead、ls-remote HEAD 与本地一致

## 6. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-07 | sunxuewen-rush | 初稿：M1 平台底座计划（monorepo/protocol/drizzle/认证四板块，R1-R7 待拍板） |
| v1.1 | 2026-09-07 | sunxuewen-rush | 实战对标（§1.1 D1-D9）：08 增补至 v1.1；T11-T14 枚举列 VARCHAR+z.enum、role/permission 三表、audit_log 网络字段、review_task 部分唯一索引；T16 种子三表+大写 code；T19 补 CSRF（D8）；T20/T22 吸收 usr_uuid/行级锁定/dummy verify（D2/D3/D9）；T23 权限码单源；后置清单补治理扩展表（D7） |
| v1.2 | 2026-09-07 | sunxuewen-rush | 自检 P1-P8 修复（scrypt maxmem/CSRF 双缺失分支/T15 抽查清单/评审记录表述/username 规则/审计字段断言等）后 8 维重评 9.3；评审定稿：R1-R7 全部采纳推荐值 |
