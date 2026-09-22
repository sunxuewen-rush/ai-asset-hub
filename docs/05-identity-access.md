# 用户与权限设计

> Date: 2026-09-04
> Updated: 2026-09-22（**v1.11：M4b-5 审核批同步 · §6.4 审核人放开（R2）** —— 原防自审规则（审核人 ≠ 提交人本人 · 仅超管自审例外）**彻底移除** ⇒ 管理档可审自己的提交；§6.4 补 **偏离登记**（代价 = 失去四眼制衡 · 复归点唯一）+ 审核运营模型改写（不再要求 ≥2 管理档）。**头部补登记**：内容随 M4b-5 已落 §8 v1.11 行，头部漏登）
> Updated: （**v1.10：非 ACTIVE 资产读面授权集扩面（M4b-4 R6-b）**——§6.4 矩阵行由「仅超管」改为 **{owner 本人 · 管理档 · 超管}**；超管行去独占暗示（与 `canManageAsset` 同集 ⇒ 「管得住的人读得到」）。依据 = 主 design §2.1 补充锁定 ⑤ · 批 design `2026-09-18-m4b4-personal-b-design` §5.1 R6-b）
> v1.9（M4b-pre 认证整车迁移同步）——§3 五层图的身份映射层改官方 `account` 表 + 落地实现注（better-auth 1.7.5 实例）· §3.1 安全边界去「行级失败锁定」（随 `local_credential` 删除，防爆破由登录限流承担）· §4.1 状态机补落库口径（官方 `user.status`）· §5 会话与凭证**按 M4b-pre 实测重写**（会话落库 8h 绝对过期 / 设备流官方两段式 / 令牌 = 官方 api-key 插件 **；**v1.8：M4-pre 扁平化重构同步**· §6 双轴改单轴 4 档线性 · §6.1/§6.2/§6.3/§6.4/§6.5 重写（迁移 0005/0006/0007**）
> **头部口径（2026-09-18 起）**：只留最近 1-2 版 · 不复述历史与验收数字；完整历史见 **8 修订记录**。
> Status: 定稿（M1 已实现：本地账号/Session/RBAC 判定链/LDAP 企业通道/OIDC 授权码流/Device Flow/API Token，docs/05 §3.1 流程；M2 已按 v1.6 同步 §6.4 DRAFT 上传者删除例外 + asset:publish M2 语义；M3 已按 v1.7 同步审核管线/withdraw/scope 交集/运营注记；**M4b-pre 已按 v1.9 同步认证整车迁移后的实测形态**——认证内核/会话/令牌/设备流/起源校验均走官方件，自留面仅企业目录凭证插件与业务读面中间件）
> Scope: AI Asset Hub 的身份、准入、会话凭证与 RBAC 授权体系
> 设计来源：企业实战验证的注册中心认证方案（设计决策继承，命名与实现中立化/资产化）

## 1. 定位与范围

定义平台的身份与授权体系：用户如何登录、谁被允许进入、进入后能做什么。

- 产品自带完整用户体系（本地账号 + OIDC/SSO 适配），可独立部署（见 `00` D7）
- 与既有内部注册中心的用户打通是**部署期集成选项**，非产品代码
- 授权模型 = **平台角色单轴（4 档线性）** + 资源归属（owner 本人）——M4-pre 扁平化后无命名空间维度；
  支持开放协作（非 owner 提交走审核）

## 2. 身份标识约束

- `userId` 必须是**稳定的字符串标识**，全链路主契约（认证、授权、审计、资源 owner 判定）
- 外部身份源的 `subject`、企业 SSO UID、工号型字符串可原样或经确定性映射进入系统；
  禁止压缩成自增整数再作为正式用户主键传播
- DB 内部 surrogate key 仅作实现细节，不进入 API/审计契约

## 3. 认证架构（五层）

```
请求进入
  │
  ▼
┌────────────────────────────┐
│ Layer 1: OIDC/本地登录      │  授权码模式；本地账号密码兜底（密码通道可接 LDAP，见 §3.1）
└─────────────┬──────────────┘
              │ 身份 claims / 本地凭据
              ▼
┌────────────────────────────┐
│ Layer 2: Access Policy     │  准入策略（认证成功 ≠ 有权使用）
└─────────────┬──────────────┘
              │ 准入通过
              ▼
┌────────────────────────────┐
│ Layer 3: Identity Mapping  │  外部身份 → 平台用户（官方 account 表）
└─────────────┬──────────────┘
              │ PlatformPrincipal
              ▼
┌────────────────────────────┐
│ Layer 4: Session / Token   │  Web Session · CLI Device Flow · API Token
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ Layer 5: Authorization     │  RBAC（平台角色 4 档单轴 + owner 归属）
└────────────────────────────┘
```

- 本地账号模式（无 IdP 的独立部署/开发）：账号密码直接走 Layer 2 准入（注册开关配置）
- OIDC 模式：标准授权码流，Provider 可扩展（GitHub/企业 IdP 等），准入与 Provider 无关

**落地实现（M4b-pre，2026-09-15）**：Layer 1/3/4 由**官方认证内核** `better-auth@1.7.5` 承担
（实例 + 薄适配层；表结构照官方默认：`user`/`session`/`account`/`verification`/`device_code`/`apikey`）；
企业目录通道以**自定义凭证插件**接入（本层唯一自绘件，理由见批 design §1.4）；
Layer 5 判定链与业务读面中间件仍为本仓实现（判定数据源改为官方 `user.role`/`user.status`）。

### 3.1 LDAP/AD 认证（可选企业通道）

企业目录账号经「密码登录」接入（与本地账号同路径，在 Layer 2 前解析身份源）。
**默认关闭**（`LDAP_ENABLED=false`，独立部署不受影响），企业部署按配置启用：

| 配置 | 说明 |
|------|------|
| `LDAP_URLS` | 目录服务器列表（多 DC 故障转移） |
| `LDAP_BIND_MODE` | `auto`（UPN → `CN=user,base` → 裸名三重身份尝试）或固定模式 |
| `LDAP_USER_BASE` | 用户搜索基准 DN |
| `LDAP_USER_ID_ATTR` | 建号 userId 来源属性（惯例 `sAMAccountName`/`uid`，可配置） |
| `LDAP_TIMEOUT_MS` | 单次绑定超时（默认 5000） |

登录流程：

1. `username` 命中保留本地账号（如 `admin`）→ 跳过 LDAP 直接本地密码（逃生通道，
   避免必然失败的目录绑定）
2. LDAP bind 验证：三重身份尝试 × 多 DC 故障转移，超时兜底
3. 目录侧锁定/禁用 → **拒绝且不回退**本地（403；禁用语义以目录为准）
4. 其他失败（不可达/超时/网络）→ 回退本地密码（该用户名存在本地账号时）
5. 成功 → 首次登录**自动建号**（userId = 映射属性），同步 displayName

安全边界：

- 密码只在验证路径内存中流转：不落盘、不进日志、不进响应体
- 登录限流（匿名低频窗口，防爆破）；**M4b-pre**：原「行级失败锁定」列（`failed_attempts`/
  `locked_until`）随 `local_credential` 表删除 ⇒ 爆破防护**统一由限流承担**（官方内核限流 + 本仓登录限流）
- LDAP 建号后账号状态直接 `ACTIVE`（目录身份可信）；默认档位 = `用户`（1）——与本地注册账号同档
  （M4-pre：原「默认无平台角色，权限仅来自命名空间成员关系」随空间域删除；档位提升由 `超管` 配置）
- 平台不存目录密码，纯绑定验证（无密码双写，目录是唯一密码权威）

## 4. 准入策略（Access Policy）

认证成功仅代表身份可信，准入在创建平台用户前判定：

| 策略 | 判定依据 | 说明 |
|------|---------|------|
| `OPEN` | 无限制 | 所有登录用户自动准入（独立部署默认） |
| `PROVIDER_ALLOWLIST` | provider | 仅允许指定 Provider |
| `EMAIL_DOMAIN` | email + emailVerified | 仅允许已验证邮箱且域名匹配 |
| `SUBJECT_WHITELIST` | provider + subject | 按白名单预添加 |

准入结果：`ALLOW`（继续）/ `DENY`（拒绝，不建 Session）/ `PENDING_APPROVAL`（等管理员审批）。

- **实现状态（M4b-pre 止）**：仅 `OPEN` 已实现（独立部署默认；`ACCESS_POLICY` 取其它值**启动即拒**），
  其余三种策略与其审批流归 **M4c「账号与权限治理」**（追踪表 `00` §5）；本表为规范目标形态

### 4.1 账号状态机

| 状态 | 语义 | Session |
|------|------|---------|
| `PENDING` | 待准入审批（PENDING_APPROVAL 创建） | 无（安全边界：待审批账号绝无业务 Session） |
| `ACTIVE` | 正常 | 有 |
| `DISABLED` | 封禁/停用 | 无（拒绝所有操作） |

- **落库**：状态三态为**单列**（官方 `user.status`，additionalFields；M4b-pre 起不用官方 `ban` 列），
  默认 `ACTIVE`；判定在会话解析处统一执行（非 `ACTIVE` ⇒ 会话失效 → 401）
- **无 `LOCKED` 态**：原实现的行级失败锁定（`local_credential.locked_until`）随表删除，
  防爆破由**登录限流**承担（§3.1）；`auth.user_locked` 错误码随之删除（M4b-pre T7）

## 5. 会话与凭证

| 通道 | 机制（M4b-pre 实测形态） | 说明 |
|------|--------------------------|------|
| Web | **服务端会话落库**（官方 `session` 表；绝对过期 `SESSION_TTL_HOURS` 默认 **8h**，**不滑动续期**） | 登录态经 `HttpOnly` Cookie（`better-auth.session_token`，`SameSite=Lax`）；会话在服务重启后**存活**（旧实现在内存，重启即全员登出） |
| CLI | **OAuth 2.0 Device Flow（官方两段式）**：`POST /api/auth/device/code`（带 `client_id`）→ 用户在 **`${PUBLIC_BASE_URL}/device`** 认领（`GET /api/auth/device?user_code=`）并确认（`POST /api/auth/device/approve` / 拒绝 `…/deny`）→ `POST /api/auth/device/token` 取令牌 | 换取的是**平台会话令牌**（Bearer；官方 `bearer` 插件将其还原为会话）⇒ 与 Web 会话同一有效期语义。设备码 30 分钟 · 轮询下限 5s（过快 → `slow_down`）· 未批准 → `authorization_pending` · 过期/拒绝/错码各有 OAuth 标准错误体 |
| API Token | **官方 api-key 插件**（`apikey` 表；明文**只展示一次**；可设 scope 与到期；吊销 = `enabled=false`） | 自动化与兼容层用；库中只存 `base64url(sha256(明文))`（服务端不可反推）；过期令牌在校验时由官方清理 |

**起源校验（CSRF）**：官方平面（`/api/auth/*`）由官方按 `AUTH_TRUSTED_ORIGINS` 白名单校验；
业务面（其余 `/api/*`）由本仓**同源守卫**以官方**同构语义**校验（带会话 cookie 且非安全方法才校验），
拒绝出口沿用 `auth.csrf_failed`。Bearer 显式通道不做起源校验（非浏览器通道）——且**不降级**回 cookie 会话。

**API Token scope 码**（`resource:action`；与官方 `permissions` **1:1** 映射；空 scope = 全量）：

| 码 | 覆盖操作 | 判定落点 |
|----|---------|---------|
| `asset:publish` | 资产注册 · 草稿版本上传 | `POST /api/assets` · `POST /api/assets/:slug/versions` |
| `asset:manage` | 资产管理（状态迁移 / 删除 / yank / 版本操作） | `PATCH`·`DELETE`·`POST …/yank`·版本面 |
| `review:submit` | 提交版本进审核 / 撤回自己的提交 | `POST …/submit` · `POST …/withdraw` |
| `review:approve` | 审核裁决（通过 / 拒绝） | `POST /api/reviews/:id/approve` · `POST /api/reviews/:id/reject` |
| `audit:read` | 审计浏览 | `GET /api/audit` 面 |

- 令牌 scope 非空时与**操作码求交集**（未含该码 → 403）；空 scope/全量令牌恒过（M1 兼容语义保留）

## 6. RBAC 授权

权限判定 = **平台角色（单值层级）** × **资源归属**（owner 本人）——M4-pre 扁平化重构后无命名空间维度：
原「平台角色权限 ∪ 命名空间角色」双轴合并为单轴，落库于**官方 `user.role`**（文本档名：
`user`/`admin`/`superadmin`；数值档位由 `auth/roles.ts` 的 `ROLE_LEVEL` 单点映射 ⇒ 调用面零改动）。

### 6.1 平台角色（4 档）

| 档位 | 值 | 职责 |
|------|:--:|------|
| `GUEST`（未登录） | 0 | 公开读面：浏览 / 搜索 / 详情 / 版本 / 文件 / 下载（常量占位，不可分配） |
| `USER`（用户） | 1 | 登录即得：注册资产（含草稿版本上传）· 管理自己名下资产 · 提交版本进审核 |
| `ADMIN`（管理） | 10 | 审核发布 · 全站治理（状态/删除/yank 他人资产）· 审核队列 · 审计浏览 |
| `SUPER_ADMIN`（超管） | 100 | 全部权限（**含非 ACTIVE 资产读面**——与 owner / 管理档同集，超管非唯一可读者）+ 角色分配；硬判定短路 |

- 档位是**线性层级**，判定统一为 `role >= minRole`（超管天然覆盖全部，无额外短路分支）
- 「未登录」不是数据库取值——匿名请求按 0 档处理；账号非 `ACTIVE`（DISABLED/PENDING）与不存在同权
  （`roleOf()` 返回 `null`）

### 6.2 资源归属与 owner 语义

资产 owner（`asset.owner_id`，「主要维护人」）是**档位外业务判定**：

- owner 本人对自己名下资产有完整管理权（状态治理 / 删除 / 版本操作 / 上传新版本）
- owner 判定与档位**取并集**：`owner 本人 ∨ role >= 管理` —— 他人资产由管理档兜底治理
- 原「命名空间 OWNER/ADMIN 对空间内资产完整管理权」语义**随空间域删除**（人员流动可维护性由管理档承担：
  owner 离职后资产仍可被管理档接管）

### 6.3 判定链

1. 取当前用户（匿名 → 档位 0）→ 2. 检查账号状态（非 `ACTIVE` → 按 0 档处理）→ 3. 读
   **官方 `user.role`**（文本档名 → `ROLE_LEVEL` 数值）→ 4. 层级比较 `role >= minRole`
   → 5. 资源级：命中 owner 本人时按 owner 语义放行

### 6.4 操作 × 角色矩阵

| 操作 | 判定 |
|------|------|
| 公开读面（列表/详情/版本/文件/下载） | **未登录+**（ACTIVE 资产即公开——可见性维度已删） |
| 非 ACTIVE 资产（HIDDEN/ARCHIVED）读面 | **{owner 本人 · 管理档（`role ≥ 10`）· `超管`}**（2026-09-18 M4b-4 R6-b 扩面；集外——含匿名与其他登录用户——同 404） |
| 注册资产（含草稿版本上传） | `用户`+ |
| 管理自己的资产（状态 / 删除 / 版本 yank） | `owner 本人` 或 `管理`+ |
| 上传草稿版本（`POST /:slug/versions`） | `owner 本人` 或 `管理`+ |
| 管理他人资产 | `管理`+ |
| 提交版本进审核 | `owner 本人` 或 `管理`+ |
| 审核发布（approve/reject） | `管理`+ |
| 撤回自己的提交（withdraw） | 提交人本人（业务例外，非档位判定） |
| 撤回已发布版本（yank） | `管理`+ |
| 标签定义管理 | `超管` |
| 审计浏览（audit:read 面） | `管理`+ |
| 角色分配 | `超管` |
| Token 签发 / 吊销 | 本人（登录面） |

**审核人 = 提交人：已放开（M4b-5 · **R2** · 2026-09-21 用户拍板）** —— 原**防自审规则**（审核人不得是
提交人本人；本人提交的 review task 仅 `SUPER_ADMIN` 可审核自己）**已彻底移除**：服务端删
`isSelfReview` / `isSuperAdmin` 传参 / `review.self_review` 错误码 ⇒ **管理档可审核自己的提交**。
**这是对四眼原则的有意偏离**（单人自托管 / 小团队下该制衡正是死锁源）；代价 = 失去「自提自审」的机制
制衡；**复归点唯一** = 恢复 `isSelfReview` 判定 + `review.self_review` 码即可。实现细则见 M4b-5 批 design §4.6.1。

**审核运营模型（R2 后）**：**不再要求 ≥2 个管理档账号** —— 单人自托管 = 首管理员自审闭环（无需
`SUPER_ADMIN` 例外）；多人协作仍**建议**分工互审，但属运营姿势、非机制约束。

### 6.5 权限主轴与离职场景

- **平台角色是唯一权限主轴**（M4-pre：原「命名空间角色是权限主轴」随空间域删除）
- owner 语义为「主要维护人」；owner 离职后资产由 `管理`+ 兜底治理（人员流动可维护）

## 7. 相邻文档关系

- `00` D7（用户体系自含）本文件展开；`06-label-system.md` 定义 label 挂载权限（超管 CRUD、
  RECOMMENDED 挂载面）
- 审核流（review task 归属/状态机）在治理设计详述，本文件只定义谁能审

## 8. 修订记录

| v1.10 | 2026-09-18 | sunxuewen-rush | **非 ACTIVE 资产读面授权集扩面（M4b-4 T10 随批即改 · Q11 A）**：§6.4 矩阵行「非 ACTIVE 资产（HIDDEN/ARCHIVED）读面 **仅超管**」→ **{owner 本人 · 管理档（`role ≥ 10`）· 超管}**（集外同 404，无 403 出口）；§6.4 超管行「全部权限（含非 ACTIVE 资产读面）」补「与 owner/管理档同集 ⇒ 非唯一可读者」；实现 = `http/assets.ts` `assertAssetReadable`（T2），6 个调用点（详情/版本列表/版本详情/文件/下载/预览）单点传导，测试四面对照锁定 |
| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：身份约束/五层认证/准入/凭证/RBAC 双轴矩阵 |
| v1.1 | 2026-09-04 | sunxuewen-rush | 补 §3.1 LDAP/AD 认证企业通道（三重 bind/故障转移/自动建号/逃生/回退，默认关闭） |
| v1.2 | 2026-09-04 | sunxuewen-rush | §6.4 补防自审规则与 namespace:manage；§3 图注 LDAP 通道 |
| v1.3 | 2026-09-07 | sunxuewen-rush | 实现状态同步：M1 认证服务按本文档落地（本地账号/scrypt/行级锁定/CSRF/Session/RBAC/LDAP 多 DC 故障转移） |
| v1.4 | 2026-09-08 | sunxuewen-rush | 实现状态同步：M1 阶段二落地——API Token 签发/Bearer（§5）、审计浏览 audit:read（§6.4）、OIDC 授权码流（§3/§5，provision 公共建号/binding 复用）、Device Flow 签发 cli scope token（§5，RFC 8628） |
| v1.5 | 2026-09-08 | sunxuewen-rush | M0/M1 复验：§6.2 MEMBER 行措辞收紧——「发布新资产（走审核）」独立表达，提交已有版本进审核（review:submit）判定明确指向 §6.4，消除「提交资产」与 §6.4 判定列的阅读张力 |
| v1.6 | 2026-09-08 | sunxuewen-rush | M2 实现同步：§6.4 asset:manage 补「DRAFT 版本删除可由上传者本人执行（未进审核撤回，Q2）」例外；asset:publish 行加注 M2 语义（含资产注册与草稿上传，Q4） |
| v1.7 | 2026-09-08 | sunxuewen-rush | M3 实现同步：§6.4 注记——review:submit/approve 码面落地审核管线（submit/approve/reject/withdraw HTTP API + 队列读面）；withdraw 权限（提交人本人/owner/空间 ADMIN/OWNER——业务例外非权限码）；token scope 交集（R14——''/cli 全量兼容）；运营注记：互审团队空间至少 2 个 ADMIN 级成员（单人自托管 SUPER_ADMIN 自审例外闭环——Q1 决议）；converge 修正：§6.4「隐藏/恢复资产仅 SUPER_ADMIN」残留行改 canManageAsset 面（owner/空间 ADMIN/OWNER/超管——M2 v1.4 判定修正后的规范-实现张力闭环，design §4.3） |
| v1.9 | 2026-09-15 | sunxuewen-rush | **M4b-pre 认证整车迁移同步（规范层原地改写）**：① §3 五层图 Layer 3 身份映射改**官方 `account` 表**（`identity_binding` 已删）+ 新增「落地实现」注（Layer 1/3/4 = 官方 `better-auth@1.7.5` 实例；自留面仅企业目录凭证插件 + Layer 5 判定）② §3.1 安全边界：原「行级失败锁定」列随 `local_credential` 删除 ⇒ 防爆破**统一由登录限流承担**；`auth.user_locked` 码删除 ③ §4.1 补**落库口径**（官方 `user.status` 单列三态；无 `LOCKED` 态）④ **§5 会话与凭证按实测重写**——Web = 会话**落库** + 8h 绝对过期（不滑动；顺带修「重启即全员登出」）· CLI = 官方两段式 Device Flow（换取**会话令牌**，设备码 30 分钟/轮询 5s/标准 OAuth 错误体）· API Token = 官方 api-key 插件（明文一次 · 库中仅 `base64url(sha256)` · 吊销 = `enabled=false` · 过期校验时清行）；新增**起源校验（CSRF）**段与 **scope 码表**（5 码 ↔ 官方 `permissions` 1:1 + 判定落点）⑤ §6/§6.3 落库表名 `user_account.role` → **官方 `user.role`**（文本档名 + `ROLE_LEVEL` 数值映射）；迁移见批 plan `M4b-pre-auth-migration.md`，选型与契约见批 design `2026-09-15-m4b-pre-auth-migration-design.md` |
| v1.11 | 2026-09-22 | sunxuewen-rush | **M4b-5 审核批同步 · §6.4 审核人放开（R2）**：原**防自审规则**（审核人 ≠ 提交人本人 · 仅超管自审例外）**彻底移除** ⇒ 管理档可审自己的提交；**偏离登记**（代价 = 失去四眼制衡 · **复归点唯一**）+ **审核运营模型改写**（不再要求 ≥2 管理档）|
| v1.8 | 2026-09-10 | sunxuewen-rush | **M4-pre 扁平化重构同步**：§6 由「平台角色 ∪ 命名空间角色」双轴改为**单轴 4 档线性**（`user_account.role` 0/1/10/100，判定 `role >= N`）；§6.1 角色表重写为 4 档；§6.2 内容替换为「资源归属与 owner 语义」（原命名空间角色 + 空间状态域删除）；§6.3 判定链去空间角色/空间状态步；§6.4 矩阵重写为「操作 × 角色」（含非 ACTIVE 读面**仅超管**）；§6.5 主轴改「平台角色是唯一权限主轴」（小节编号保持不变以免打断历史引用）——迁移 0005/0006/0007，design/plan 见 `2026-09-10-flat-model-refactor-design` + `M4-pre-flat-model-refactor.md` |
