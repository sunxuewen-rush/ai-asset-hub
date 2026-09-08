# M1 平台底座设计

> Date: 2026-09-08（回溯补档——M1 完成后按体系约定 00 §7 ② 补 design 层足迹；决策本体于 2026-09-07 评审拍板）
> Updated: 2026-09-08（v1.2：7 段骨架适配——删任务清单段、M2 对齐项入正文 §6.7；v1.1：追加阶段二决策档案；v1.0：阶段一决策档案初稿）
> Status: 定稿（决策均已执行验证：M1-platform 27 Task + M1-phase2 38 Task 全绿，2026-09-08 全仓 216 用例）
> Scope: M1 平台底座（00 §5）两阶段的架构与决策档案——工程基线/数据模型实现形态/认证授权/平台 API 扩展
> 设计来源：21-skillhub（iflytek/skillhub，Apache-2.0 公开注册中心）源码级对标 S1-S10 吸收；决策与实施记录完整保留于 M1-platform.md / M1-phase2.md（本文件为决策档案，不复制 plan Task 细节）
> 引用链：本文件 ← docs/plans/M1-platform.md · M1-phase2.md；→ 规范 00 §5/§7 · 01 §2/§6 · 02-04 · 05 · 06 §5.3 · 08

## 1. 背景与文档定位

M1 = 平台底座（00 §5）：schema/用户认证/命名空间/对象存储/审计。分两阶段执行：
阶段一 platform-core（monorepo + 协议 schema 单源 + drizzle 四域全表 + 认证服务核心），
阶段二平台 API 与服务扩展（命名空间 HTTP API / 对象存储 SPI / API Token / 审计浏览 /
OIDC 授权码流 / Device Flow）。

本文档记录两阶段的关键设计决策（拍板结论 + 理由 + 对标吸收），作为设计层档案。
执行期间的 Task 级改动、验收断言与修订过程见两份 plan（执行记录原貌保留，本文不复制）。

## 2. 里程碑切分与执行纪律

- **两阶段切分语义**：阶段一 platform-core 完成后 00 §5 M1 行只注记「进行中」，**不翻 ✅**——
  出口标准要求 M1 描述内容全部完成才可翻转，不伪造完成（R1）。
- **后置清单原则**：表结构先就位、服务随里程碑引入（治理扩展表 security_audit/promotion_request
  等不随 M1 建，08 §9 版本号段预留）——平台底座不为未定服务预支建表（D7）。

## 3. 工程基线与工具链决策

- **仓库形态**：单仓库 monorepo——`packages/protocol`（协议 schema 单源）+ `apps/{server,web,cli}`
  （web/cli 为最小占位，业务功能 M4/M5）；turbo 全仓编排 typecheck/test/lint/build（R7）。
- **协议即代码**：每类资产协议 = 一份 zod schema（01 §6），dev 依赖消费源码、build 产物仅发布用。
- **代码风格**：biome 单工具（lint + format），零配置心智（R7）。
- **测试纪律**：禁 mock 服务模块——网络层 stub 或真实 fake server（LDAP 用 ldapjs 本地 fake server、
  OIDC 用本地 fake issuer 冒烟）；测试连真实 PG（迁移后的测试库）。
- **工具链演进（执行期决策）**：2026-09-07 从 pnpm 11/vitest/tsx 迁移到 **bun 1.3.14**
  （install/test/dev；tsc/turbo/biome 保留）——bun 单二进制含运行时+测试器，依赖安装与测试提速，
  迁移原因与命令形态记录于 M1-phase2 v1.4 修订与 AGENTS.md 命令区；M1-platform 保留执行时
  pnpm 形态并加迁移注记（执行记录不改写）。

## 4. 数据模型实现形态（08 落地决策）

drizzle schema 按 08 蓝图 v1.1 全量落地，关键形态决策：

| 决策 | 拍板结论 | 理由 |
|------|---------|------|
| 枚举列形态 | **VARCHAR + 应用层 zod 枚举**（不建 PG enum type） | 枚举加值零迁移成本（D1，对齐实战模型） |
| 登录凭证 | local_credential 独立 `username` UNIQUE + `failed_attempts`/`locked_until` 行级失败锁定 | 登录名独立于身份 id；行级锁多实例部署仍生效（D2） |
| 用户 id | 本地注册 `usr_<uuid>`；外部身份源建号取映射值 | 稳定字符串主键契约（05 §2，D3） |
| 权限模型表 | role / permission / role_permission 三表（code + is_system；permission 独立表） | 权限码独立承载扩展面（D4） |
| 审计可调查性 | audit_log 含 request_id / client_ip / user_agent | 事后可调查（D5） |
| 防并发双待审 | review_task 部分唯一索引 `UNIQUE(asset_version_id) WHERE status='PENDING'` | DB 硬约束兜底（D6） |
| 迁移 | drizzle-kit generate + migrate（forward-only，产物入库） | schema 单源自动生成 SQL 防手写漂移（R5） |
| 首管理员 | SEED_ADMIN_* env 显式建 SUPER_ADMIN（可选） | 避免「先到先得超管」竞态；显式安全（R6） |

资产域三表（asset/asset_version/asset_file）+ 治理表随 M1 落表但**无业务管线**——
slug 跨类型唯一键 `UNIQUE(namespace_id, slug)`（type 不入键，01 §3.3）与版本六态状态机
zod（08 §7）先行就位，供 M2/M3 管线消费。

## 5. 认证与授权架构（按 05）

### 5.1 认证落地面与密码

- **落地子集**：本地账号 + Session + RBAC 判定基础设施 + LDAP 企业通道全流程进 M1；
  OIDC 授权码流后置阶段二（identity_binding 表先备，provider 抽象留接口）（R2）。
- **密码哈希**：node:crypto scrypt 自定格式 `$scrypt$N$r$p$salt$hash`
  （N=2^17 r=8 p=1，maxmem 256MiB 显式传参），比较走 timingSafeEqual（R3）。
  零 native 依赖——内网机/离线安装无 node-gyp/prebuilt 风险。
- **防账号枚举**：用户名无凭据时也执行一次 dummy scrypt verify，抹平响应耗时差（D9）。

### 5.2 Web Session 与 CSRF

- Session 存**进程内内存 store**（Map + TTL 8h 惰性清理 + 定期扫）；多实例共享存储为
  部署期配置项（接口预留）（R4）——08 表蓝图无 session 表，单实例默认场景够用，
  不为未定多实例需求扩 schema。
- CSRF（cookie session 通道标配）：cookie `SameSite=Lax`（+Secure 按环境）；
  non-GET 校验链 = Origin 同源 → 缺失查 Referer → 两者皆缺拒绝（安全默认）；
  无 cookie 认证面（Bearer/Device 匿名端点）走豁免白名单（D8）。

### 5.3 LDAP 企业通道（默认关闭）

05 §3.1 全流程落地：多 DC 故障转移、auto 模式三重身份尝试（UPN → CN+base → 裸名）、
目录侧禁用/锁定拒绝且不回退本地、网络类失败回退本地、自动建号（userId = 映射属性）、
保留本地账号逃生通道、密码纯绑定验证不双写。

### 5.4 RBAC 判定链与审计

- 权限码十枚单源常量（05 §6.4）+ 角色绑定矩阵由种子消费——防常量/种子漂移；
  SUPER_ADMIN 硬判定短路不绑行（05 §6.3）。
- 判定链 1-7 步全实现：账号状态 → 平台权限 → SUPER_ADMIN 短路 → 命名空间角色 →
  空间状态（FROZEN 拒写/ARCHIVED 拒一切）→ 合并。
- 防自审助手（05 §6.4）：审核人不得是提交人，SUPER_ADMIN 例外由调用方显式放行。
- M1 审计写入 = 认证域 4 事件（register/login_success/login_failed/logout），
  明文密码不落日志/审计 detail；治理域审计写入随 M2 管线补齐（00 §2.2 全链路审计）。

## 6. 阶段二平台 API 扩展决策

### 6.1 命名空间 API（对齐 skillhub 建空间权）

- 建空间权仅平台角色：TEAM = ASSET_ADMIN/SUPER_ADMIN（创建者自动 OWNER 入 member 行）；
  GLOBAL 仅 SUPER_ADMIN（S1/R2）。空间状态治理（FROZEN/ARCHIVED）仅 SUPER_ADMIN，
  治理最严对称资产隐藏/恢复（S5/R3）。
- 角色分配链：OWNER 可设 ADMIN/MEMBER、ADMIN 仅可设 MEMBER、OWNER 不可经添加产生；
  OWNER 转让后置 M2（05 §6.2「可转让」表结构已支持，操作面后置）。
- 列表语义：ACTIVE 空间全量可见 + 我所属空间无论状态（含 memberCount/myRole）。

### 6.2 对象存储 SPI（无上传管线，M3 前置）

- `ObjectStorage` 接口含 `put/get/delete/deleteMany/exists/presignedGetUrl`——
  batch delete 与 presigned 下载直链先行定义，防 M3 下载面返工（S2）；S3 实现后置 M3。
- Local 实现（原子写 + 越界 key 拒绝）；key 规则 `{namespaceId}/{assetId}/{versionId}/{filename}`
  服务端拼装 + `assertSafeKey` 防路径穿越（禁 `..`/绝对路径/反斜杠）。

### 6.3 API Token 与 Bearer 认证

- 签发即明文一次 + sha256 落库（token_hash VARCHAR(64)），明文不落日志/审计；
  省略 expiresInDays = 永不过期（S9）；scope 默认空串全量，scope 过滤随治理面后置。
- Bearer 中间件与 session 并存但**显式通道不回退**：带 Authorization 头即以 Bearer 为准，
  无效也不降级回 cookie——防凭证混淆/降级攻击。
- 吊销幂等；吊销他人 token 404 防枚举；SUPER_ADMIN 治理面可吊销他人。

### 6.4 审计浏览

- 页码分页（limit/offset，limit≤100）+ 全过滤面
  （action/targetType/targetId/actorId/requestId/clientIp/时间窗）+ createdAt desc + id desc
  稳定排序（S4/R9）；audit:read 组级守卫（AUDITOR/SUPER_ADMIN，Bearer 通道同判）。

### 6.5 OIDC 授权码流

- 客户端库 openid-client（discovery/jwks/nonce/PKCE 现成，授权码安全细节多不手写）（R5）。
- 单 Provider 配置化（R6）：OIDC_ENABLED 默认关闭；discovery 仅接受 https
  （localhost 开发例外）防降级窃听；缺必填配置启动即拒。
- authorize 由**未登录访客**发起 → state/nonce 存独立 HttpOnly cookie（非 session 内字段，
  访客无 session 可存）；callback 校验 state 后清除。
- 建号走**公共 provider-provision 服务**（从 LDAP 建号模式抽出）：identity_binding
  (provider+subject) 查已绑定 → 复用账号；未绑定 → 事务建号/绑定——LDAP/OIDC 共用，
  重构由 LDAP 回归测试守护。
- 多 Provider 注册表与账号合并后置（S6/S10：OIDC 与本地同 email 双账号为预期行为，
  合并需用户主动触发）。

### 6.6 Device Flow（RFC 8628，CLI 通道）

- 无前端阶段不造假确认页：approve 走登录态 API（CSRF 保护内），确认网页随 M4（R7）。
- 产出凭证 = **API Token（scope=cli）** 复用 api_token 表，不设独立 CLI 凭证类型（R8/S3）。
- 匿名端点（请求/轮询）豁免 CSRF（无 cookie 认证面），approve 保持保护。
- user_code 8 位免混淆 base32（无 0/O/1/I/8/B），大小写不敏感输入；
  尝试限流（每 code 5 次/分钟）+ TTL 10min 惰性清理 + 轮询一次性消费；
  RFC 8628 语义：pending → 400 authorization_pending + retry-after、过期 → 401。

### 6.7 后置延伸（M2 对齐项，2026-09-08 复验产出）

本 design 无未竟任务（实现状态见头部 Status）。M2 起草须携带的对齐项：
- 治理域审计写入面：M1 audit_log 只覆盖 auth 4 动作，namespace/token/oidc/device
  治理操作零审计——00 §2.2「全链路审计」落差，M2 管线落地时接入 audit writer
- API Token scope 过滤：M1 签发 scope=''/cli 仅标注不强制（Bearer 中间件不过滤）——
  scope 过滤随治理面落地（05 §5「可设 scope」措辞已超前实现）
- asset:manage 同码三判定（管理/隐藏恢复仅超管/撤回 ASSET_ADMIN+）靠业务层细分——
  M2/M3 实现不可只查 can('asset:manage')

## 7. 接口变更总览

M1 交付的 HTTP API 面（前缀 `/api`，响应统一结构化 `{code, message}`，07 §4）：

| 方法与路径 | 权限 | 说明 |
|-----------|------|------|
| GET /healthz | 匿名 | 存活探针 |
| POST /api/auth/register · /login · /logout · GET /api/auth/me | 注册开关/登录态 | 本地 + LDAP 编排（login 限流 429） |
| GET /api/namespaces | 登录 | 列表（分页/type 过滤/memberCount/myRole） |
| POST /api/namespaces | ASSET_ADMIN+（GLOBAL 仅超管） | 建空间（slug 校验/OWNER 落 member） |
| GET/PATCH /api/namespaces/:id | 登录 / namespace:manage | 详情可见性 / 改名 |
| PATCH /api/namespaces/:id/status | 仅 SUPER_ADMIN | FROZEN/ARCHIVED/ACTIVE 治理 |
| GET/POST /api/namespaces/:id/members | namespace:manage | 成员列表 / 添加（角色链） |
| DELETE /api/namespaces/:id/members/:userId | namespace:manage | 移除成员 |
| POST /api/tokens · GET /api/tokens · DELETE /api/tokens/:id | 登录（本人） | 签发（明文一次）/ 列表（掩码）/ 吊销（幂等） |
| GET /api/audit | audit:read | 审计浏览（分页 + 过滤面） |
| POST /api/auth/device | 匿名（CSRF 豁免） | Device 请求（device/user code） |
| POST /api/auth/device/approve | 登录（CSRF 保护） | 用户确认（user_code 免混淆/限流） |
| POST /api/auth/device/token | 匿名（CSRF 豁免） | 轮询签发（scope=cli token） |
| GET /api/auth/oidc/authorize · /callback | 访客 | OIDC 授权码流（state cookie/302） |

认证装配序：Bearer 显式优先 → 无则回退 session cookie（token → session）。

## 8. UI-UX 变动总览

**无前端交付**（M1 为纯后端里程碑）。Device Flow 确认页与 OIDC 成功跳转面随 M4 web；
本文档不含 UI-UX 变更。

## 9. 线框图

认证装配与 CSRF 豁免面（原创自绘；判定链语义见 05 §3/§6.3 规范原文）：

```text
请求 → /api/*
  │
  ├─ Authorization: Bearer 存在？── 是 ──► token-auth（sha256→未吊销/未过期/ACTIVE）
  │                                    │  无效也不回退 cookie（显式通道锁定）
  ├─ 无 Bearer ────────────────────► session cookie → principal
  │
  ▼
csrfProtection（exemptPaths: /api/auth/device · /api/auth/device/token）
  ├─ 豁免路径 ──► 放行（匿名凭证面）
  ├─ non-GET：Origin 同源 → 缺失查 Referer → 皆缺拒绝 403
  ▼
路由层：requireAuth / requirePermission(code) / requirePlatformRole(roles)
```

RBAC 判定链（can 实现序）：账号状态 → 平台权限 → SUPER_ADMIN 短路 → 空间角色 →
空间状态（FROZEN 拒写 / ARCHIVED 拒一切）→ 合并判定。

## 10. 引用文件清单

- 规范层：docs/00-product-direction.md §5/§7 · docs/01-asset-protocol.md §2/§3/§6 ·
  docs/02/03/04-*.md（族协议 manifest 契约）· docs/05-identity-access.md §3-§6 ·
  docs/06-label-system.md §5.3（/api 前缀）· docs/07-i18n-conventions.md §4（错误码）·
  docs/08-data-model.md §2-§9
- 计划层：docs/plans/M1-platform.md（阶段一执行记录）· docs/plans/M1-phase2.md（阶段二执行记录）
- 对标源：21-skillhub（iflytek/skillhub，Apache-2.0）认证/命名空间/审计/Token 契约
  （S1-S10 明细见 M1-phase2 §1.1）
- 代码落点：apps/server/src/{auth,audit,config,db/schema,http,storage}/ ·
  packages/protocol/src/{slug,type,errors,skill,mcp,agent}

## 11. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-08 | sunxuewen-rush | 回溯补档初稿：M1 阶段一决策档案（里程碑切分/工程基线/数据模型形态/认证授权，决策本体 2026-09-07 评审拍板，R1-R7/D1-D9） |
| v1.1 | 2026-09-08 | sunxuewen-rush | 追加阶段二决策档案（命名空间 API/存储 SPI/API Token/审计浏览/OIDC/Device Flow，R1-R9/S1-S10）；补接口总览/线框/引用清单/任务状态（同主题迭代追加，00 §7 ②） |
| v1.2 | 2026-09-08 | sunxuewen-rush | 7 段骨架适配（体系修正 00 §7 ②）：删除任务清单段（实现状态已由头部 Status 承载，Task 细则归属 plan）；M2 对齐项移入正文 §6.7 后置延伸 |
