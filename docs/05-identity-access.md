# 用户与权限设计

> Date: 2026-09-04
> Status: Draft（未动代码）
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
│ Layer 1: OIDC/本地登录      │  授权码模式；本地账号密码兜底
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
| `MEMBER` | 可在空间内发布/提交资产（走审核） |

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
| 审核提升申请 | `promotion:approve` | ASSET_ADMIN / SUPER_ADMIN |
| 隐藏/恢复资产 | `asset:manage` | 仅 SUPER_ADMIN（治理面最严） |
| 撤回已发布版本 | `asset:manage` | ASSET_ADMIN / SUPER_ADMIN |
| 管理用户角色 | `user:manage` | USER_ADMIN / SUPER_ADMIN |
| 审批用户准入 | `user:approve` | USER_ADMIN / SUPER_ADMIN |
| 查看审计日志 | `audit:read` | AUDITOR / SUPER_ADMIN |

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
