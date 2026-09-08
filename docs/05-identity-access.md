# 用户与权限设计

> Date: 2026-09-04
> Updated: 2026-09-08（v1.5：M0/M1 复验——§6.2 MEMBER 行措辞收紧，与 §6.4 review:submit 判定区分；v1.4：M1 阶段二实现同步——OIDC 授权码流/Device Flow/API Token 落地；v1.3 实现状态同步——M1 认证按本文档落地；v1.2 §6.4 防自审/namespace:manage）
> Status: 定稿（M1 已实现：本地账号/Session/RBAC 判定链/LDAP 企业通道/OIDC 授权码流/Device Flow/API Token，docs/05 §3.1 流程）
> Scope: AI Asset Hub 的身份、准入、会话凭证与 RBAC 授权体系
> 设计来源：企业实战验证的注册中心认证方案（设计决策继承，命名与实现中立化/资产化）

## 1. 定位与范围

定义平台的身份与授权体系：用户如何登录、谁被允许进入、进入后能做什么。

- 产品自带完整用户体系（本地账号 + OIDC/SSO 适配），可独立部署（见 `00` D7）
- 与既有内部注册中心的用户打通是**部署期集成选项**，非产品代码
- 授权模型 = 平台角色 × 命名空间角色（双轴 RBAC），支持开放协作（非 owner 提交走审核）

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
│ Layer 5: Authorization     │  RBAC（平台角色 ∪ 命名空间角色）
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
- LDAP 建号后账号状态直接 `ACTIVE`（目录身份可信）；默认无平台角色，
  权限仅来自命名空间成员关系（与普通用户一致）
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

权限判定 = 平台角色权限 ∪ 命名空间角色（namespace_member.role）。平台角色按最小权限拆分：

### 6.1 平台角色

| 角色 | 职责 |
|------|------|
| `SUPER_ADMIN` | 全部权限，硬判定短路 |
| `ASSET_ADMIN` | 全局空间审核、提升审核、隐藏/恢复资产、撤回已发布版本 |
| `USER_ADMIN` | 准入审批、封禁/解封、角色分配（不可分配 SUPER_ADMIN） |
| `AUDITOR` | 审计日志只读 |

一个用户可持有多个平台角色；普通用户无平台角色，仅经命名空间成员关系获权。

### 6.2 命名空间角色与状态

| 角色 | 权限 |
|------|------|
| `OWNER` | 创建者；可转让；对空间内全部资产有完整管理权 |
| `ADMIN` | 审核空间内发布、管理成员、管理空间内全部资产 |
| `MEMBER` | 可在空间内发布新资产（走审核）；提交已有版本进审核的判定见 §6.4（owner 本人 / ADMIN+） |

空间状态：`ACTIVE` 正常 / `FROZEN` 冻结（只读，拒绝写操作）/ `ARCHIVED` 归档（对外不可见）。

### 6.3 判定链

1. 取当前用户 → 2. 检查账号状态（DISABLED → 拒绝全部）→ 3. 查平台角色
   → 4. SUPER_ADMIN 短路 → 5. 涉及命名空间资源时查空间角色 → 6. 检查空间状态
   （FROZEN → 拒写）→ 7. 合并平台权限 + 空间角色判定

### 6.4 操作 × 权限矩阵

| 操作 | 所需权限 | 判定 |
|------|---------|------|
| 发布资产包 | `asset:publish` | 普通用户须为目标空间成员；SUPER_ADMIN 可绕过成员校验直发 |
| 提交已有版本进审核 | `review:submit` | owner 本人，或空间 ADMIN/OWNER，或 ASSET_ADMIN/SUPER_ADMIN |
| 管理资产（归档/版本） | `asset:manage` | 空间 ADMIN 以上，或 owner 本人 |
| 空间间提升（如到全局） | `asset:promote` | 空间 ADMIN 以上，或 owner 本人 |
| 审核发布 | `review:approve` | 空间 ADMIN/OWNER，或 ASSET_ADMIN/SUPER_ADMIN |
| 管理空间成员/角色 | `namespace:manage` | 空间 OWNER / ADMIN |
| 审核提升申请 | `promotion:approve` | ASSET_ADMIN / SUPER_ADMIN |
| 隐藏/恢复资产 | `asset:manage` | 仅 SUPER_ADMIN（治理面最严） |
| 撤回已发布版本 | `asset:manage` | ASSET_ADMIN / SUPER_ADMIN |
| 管理用户角色 | `user:manage` | USER_ADMIN / SUPER_ADMIN |
| 审批用户准入 | `user:approve` | USER_ADMIN / SUPER_ADMIN |
| 查看审计日志 | `audit:read` | AUDITOR / SUPER_ADMIN |

**防自审规则**（开放协作核心）：审核人不得是提交人本人；本人提交的 review task
仅 `SUPER_ADMIN` 可审核自己——从机制上杜绝「自提自审」。

### 6.5 权限主轴与离职场景

- **命名空间角色是权限主轴**：空间 ADMIN 对空间内全部资产有完整管理权，不受 owner 限制
- owner 语义为「主要维护人」，owner 离职后空间 ADMIN 仍能完整管理全部资产（人员流动可维护）

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
