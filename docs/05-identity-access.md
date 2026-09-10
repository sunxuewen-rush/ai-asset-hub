# 用户与权限设计

> Date: 2026-09-04
> Updated: 2026-09-08（v1.7：M3 实现同步——审核管线落地注 + withdraw 权限例外 + token scope 交集 + 运营注记 + 隐藏行残留收敛修正；v1.6：M2 实现同步——§6.4 asset:manage 补 DRAFT 上传者删除例外（Q2）、asset:publish 行加 M2 语义注（Q4）；v1.5：M0/M1 复验——§6.2 MEMBER 行措辞收紧，与 §6.4 review:submit 判定区分；v1.4：M1 阶段二实现同步——OIDC 授权码流/Device Flow/API Token 落地；v1.3 实现状态同步——M1 认证按本文档落地；v1.2 §6.4 防自审/namespace:manage）
> Status: 定稿（M1 已实现：本地账号/Session/RBAC 判定链/LDAP 企业通道/OIDC 授权码流/Device Flow/API Token，docs/05 §3.1 流程；M2 已按 v1.6 同步 §6.4 DRAFT 上传者删除例外 + asset:publish M2 语义；M3 已按 v1.7 同步审核管线/withdraw/scope 交集/运营注记）
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
│ Layer 3: Identity Mapping  │  外部身份 → 平台用户（identity_binding）
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
- 登录限流（匿名低频窗口，防爆破）
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

### 4.1 账号状态机

| 状态 | 语义 | Session |
|------|------|---------|
| `PENDING` | 待准入审批（PENDING_APPROVAL 创建） | 无（安全边界：待审批账号绝无业务 Session） |
| `ACTIVE` | 正常 | 有 |
| `DISABLED` | 封禁/停用 | 无（拒绝所有操作） |

## 5. 会话与凭证

| 通道 | 机制 | 说明 |
|------|------|------|
| Web | 服务端 Session（过期可配，默认 8h） | 登录态经 HttpOnly Cookie |
| CLI | OAuth Device Flow → 平台签发 CLI 凭证 | 桌面/CLI 客户端标准做法 |
| API Token | 平台通用凭证（可设 scope/到期） | 自动化与兼容层用；密钥只展示一次（可吊销） |

## 6. RBAC 授权

权限判定 = **平台角色（单值层级）** × **资源归属**（owner 本人）——M4-pre 扁平化重构后无命名空间维度：
原「平台角色权限 ∪ 命名空间角色」双轴合并为单轴，落库于 `user_account.role` 四档线性值。

### 6.1 平台角色（4 档）

| 档位 | 值 | 职责 |
|------|:--:|------|
| `GUEST`（未登录） | 0 | 公开读面：浏览 / 搜索 / 详情 / 版本 / 文件 / 下载（常量占位，不可分配） |
| `USER`（用户） | 1 | 登录即得：注册资产（含草稿版本上传）· 管理自己名下资产 · 提交版本进审核 |
| `ADMIN`（管理） | 10 | 审核发布 · 全站治理（状态/删除/yank 他人资产）· 审核队列 · 审计浏览 |
| `SUPER_ADMIN`（超管） | 100 | 全部权限（含非 ACTIVE 资产读面）+ 角色分配；硬判定短路 |

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
   `user_account.role` → 4. 层级比较 `role >= minRole` → 5. 资源级：命中 owner 本人时按 owner 语义放行

### 6.4 操作 × 角色矩阵

| 操作 | 判定 |
|------|------|
| 公开读面（列表/详情/版本/文件/下载） | **未登录+**（ACTIVE 资产即公开——可见性维度已删） |
| 非 ACTIVE 资产（HIDDEN/ARCHIVED）读面 | **仅 `超管`**（其余——含 owner 与 管理——同 404） |
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

**防自审规则**（开放协作核心）：审核人不得是提交人本人；本人提交的 review task 仅 `SUPER_ADMIN`
可审核自己——从机制上杜绝「自提自审」。

**审核运营模型**：单人自托管 = seed 首管理员 `SUPER_ADMIN` 自审例外闭环；多人协作需 **≥2 个管理档账号**
（若同伴仅用户档则无 approve 权——会死锁——机制不加特例，运营姿势由账号配置保证）。

### 6.5 权限主轴与离职场景

- **平台角色是唯一权限主轴**（M4-pre：原「命名空间角色是权限主轴」随空间域删除）
- owner 语义为「主要维护人」；owner 离职后资产由 `管理`+ 兜底治理（人员流动可维护）

## 7. 相邻文档关系

- `00` D7（用户体系自含）本文件展开；`06-label-system.md` 定义 label 挂载权限（超管 CRUD、
  RECOMMENDED 挂载面）
- 审核流（review task 归属/状态机）在治理设计详述，本文件只定义谁能审

## 8. 修订记录

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
| v1.8 | 2026-09-10 | sunxuewen-rush | **M4-pre 扁平化重构同步**：§6 由「平台角色 ∪ 命名空间角色」双轴改为**单轴 4 档线性**（`user_account.role` 0/1/10/100，判定 `role >= N`）；§6.1 角色表重写为 4 档；§6.2 内容替换为「资源归属与 owner 语义」（原命名空间角色 + 空间状态域删除）；§6.3 判定链去空间角色/空间状态步；§6.4 矩阵重写为「操作 × 角色」（含非 ACTIVE 读面**仅超管**）；§6.5 主轴改「平台角色是唯一权限主轴」（小节编号保持不变以免打断历史引用）——迁移 0005/0006/0007，design/plan 见 `2026-09-10-flat-model-refactor-design` + `M4-pre-flat-model-refactor.md` |
