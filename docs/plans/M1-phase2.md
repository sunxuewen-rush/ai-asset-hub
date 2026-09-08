# M1 阶段二 平台 API 与服务扩展实现计划

> Date: 2026-09-07
> Updated: 2026-09-08（v1.5：引用链补 design 决策档案；v1.4：头部元信息回填——工具链迁移同步 bun 1.3.14（修订记录 09-07 已记，头部未随）；v1.3：评审定稿——R1-R9 全部采纳推荐值；v1.2 skillhub 对标 S1-S10 + R2 对齐 + 再审修复；v1.1 自检 P1-P7）
> Status: 定稿（评审拍板 2026-09-07：R1-R9 全部采纳推荐值——R2 对齐 skillhub S1）
> 引用链：本文档 → 设计 docs/designs/2026-09-08-m1-platform-foundation-design.md（决策档案）→ 规范 00 §5 · 05 §3/§5/§6 · 08 §3/§5/§6（引用不复制，字段契约以规范为准）
> 命名约定见 docs/plans/README.md（`<里程碑>-<主题>.md`；本 plan 为 M1 里程碑第二份）

## 1. 目标与范围

**目标**：落地 M1 阶段二（R1 拍板范围，见 00 §5 M1 注记）——平台 API 与服务扩展五板块：
命名空间 HTTP API、对象存储接口、OIDC 授权码流、CLI Device Flow + API Token 签发、审计浏览 API。
前置已就绪：monorepo 骨架 + protocol 三族 schema + db 四域全表迁移/种子 + 认证栈
（本地账号/Session/CSRF/RBAC 判定链/LDAP 通道）——本 plan 在其上扩展，不改既有契约。

| 板块 | 内容 | 依据 | 依赖 |
|------|------|------|------|
| A 命名空间 HTTP API | namespace CRUD + 成员管理（角色/移除）；空间状态治理 | 05 §6.2/§6.4 · 08 §4 | T1-T8 |
| B 对象存储接口 | ObjectStorage SPI + Local 实现（无上传管线，M3 前置） | 08 §5.3（storage_key） | T9-T12 |
| C API Token | 签发/列表/吊销 + Bearer 请求认证中间件 | 05 §5 · 08 §3（api_token） | T13-T18 |
| D 审计浏览 API | audit_log 分页查询（过滤/时间窗），audit:read | 05 §6.4 · 08 §6 | T19-T21 |
| E OIDC 授权码流 | Provider 配置化 + authorize/callback + 自动建号绑定 | 05 §3/§5 · 08 §3（identity_binding） | T22-T28 |
| F CLI Device Flow | device code 授权/轮询 → 签发 API Token（CLI 通道） | 05 §5 · 08 §3 | T29-T34 |

**后置清单（不在本 plan）**：资产上传/下载管线（M2/M3）、空间 OWNER 转让、OIDC 多 Provider
注册表、S3 存储实现、Device Flow 确认网页（M4 web）、审计导出、**账号合并（用户主动触发，
skillhub AccountMerge 同构——OIDC 与本地同 email 双账号是预期行为，S10）**。

**不含**：Web/CLI 业务功能（M4/M5）、资产域管线（M2/M3）、治理扩展表迁移（随服务引入，08 §9）。

## 1.1 决策对标结论（评审吸收，2026-09-07）

对同构数据来源（21-skillhub，Java/Spring 实战注册中心）源码级核对 R1-R9 后吸收：

| # | 对标发现 | 处置 |
|---|---------|------|
| S1 | **空间创建权**：skillhub `canCreateNamespace` = 平台角色（SKILL_ADMIN/SUPER_ADMIN）才能建，普通用户不能（企业管控模型） | **R2 改对齐**：TEAM 由 ASSET_ADMIN/SUPER_ADMIN 创建；GLOBAL 仅 SUPER_ADMIN（05 OWNER=创建者语义保持） |
| S2 | 对象存储 SPI 含 `deleteObjects(List)` 与 `generatePresignedUrl`（下载直链），Local+S3 双实现 | T9 补 batch delete + presigned（前瞻防 M3 返工）；S3 实现后置不变 |
| S3 | DeviceAuthService 注入 ApiTokenService 签 Bearer（`authorization_pending` 语义）——R8 完全同构 | R8 确认无需改 |
| S4 | 审计浏览 = AUDITOR/SUPER_ADMIN + page/size + 过滤（userId/action/requestId/ip/资源/时间窗）——R9 页码分页同构 | R9 确认；T19 过滤字段补 requestId/clientIp（08 字段现成） |
| S5 | skillhub 空间无 FROZEN/ARCHIVED 状态（实体无此枚举）——R3 无实战先例 | 按 05 治理对称原则（资产隐藏/恢复仅超管先例）维持 |
| S6 | OAuth 多 registration 配置驱动（github/gitlab 预置）——多 IdP 门户模型 | 自托管单 IdP 差异合理；T23 工厂参数化留多 provider 路 |
| S7 | Device 确认页 = DeviceAuthWebController + DeviceAuthController 分置 | M4 前端照此分 API/Web 双 controller；M1 API 先行 |
| S8 | skillhub 已有 transferOwnership（转让实现） | 转让仍后置 M2（范围裁剪非能力缺口），T6/T7 注记不变 |
| S9 | ApiToken `parseExpiresAt(null)` → null = 永不过期 | T14「省略 expiresInDays = 不过期」同构确认 |
| S10 | 账号合并 = 用户主动触发（AccountMergeController + 密码验证）；OIDC 建号不按 email 自动合并 | M1 按 provider+subject 建号（双账号预期）；「账号合并」入后置清单 |

## 2. 待拍板决策（评审逐条确认；默认按推荐值执行）

| # | 决策 | 推荐值 | 备选 | 一句话理由 |
|---|------|--------|------|-----------|
| R1 | 板块执行顺序 | **按 §4 编号顺序逐板块执行**（A→B→C→D→E→F，Task 编号即执行序），每板块独立 commit 可独立验证 | 按依赖重排（C/D 先于 B） | 消除执行歧义：§4 编号已按逻辑分组排定，执行按编号顺序最简；B 板块（存储 SPI 4 Task）先行无碍，E/F 内 T26 provision 先于 T25 已注 |
| R2 | 命名空间创建权 | **仅平台角色可建（对齐 skillhub）**：TEAM 由 ASSET_ADMIN/SUPER_ADMIN 创建（创建者自动 OWNER 入 member 行）；GLOBAL 仅 SUPER_ADMIN | 任何 ACTIVE 用户可建 | skillhub 实战同构（`canCreateNamespace`=SKILL_ADMIN/SUPER_ADMIN，企业管控模型）；05 §6.2 OWNER=创建者语义保持（创建者=平台角色账号），2026-09-07 用户拍板对齐 |
| R3 | 空间状态变更（FROZEN/ARCHIVED） | 仅 SUPER_ADMIN（治理最严，对称 asset 隐藏/恢复） | OWNER 可 FROZEN | 05 §6.4 治理面最严先例（隐藏/恢复仅超管） |
| R4 | 对象存储 | 接口 + Local 实现 M1 落地；S3 实现后置 M3 | Local+S3 一并 | 无上传管线，S3 待生产部署需求（skillhub 双 SPI 同构，接口先立） |
| R5 | OIDC 客户端库 | `openid-client`（标准库：discovery/jwks/验证现成） | 手写 discovery+JWKS | 授权码流安全细节多（nonce/jwks），用成熟实现零 native 依赖 |
| R6 | OIDC 最小面 | 单 Provider 配置化；自动建号走公共 provider-provision（复用 LDAP 建号模式）；多 Provider 后置 | 多 Provider 注册表 | YAGNI：一份配置跑通即满足独立部署+单 IdP 场景 |
| R7 | Device Flow 用户确认 | approve 走登录态 API（POST approve，CSRF 保护）；确认网页随 M4 | 自建确认页 | 无前端阶段不造假页面；API 可 curl 冒烟，页面 M4 接 |
| R8 | Device Flow 产出凭证 | approve 成功 → 签 **API Token**（scope=cli）复用 api_token 表 | 独立 CLI 凭证类型 | 05 §5「平台签发 CLI 凭证」落 api_token 最小实现，免新表 |
| R9 | 审计浏览分页 | 页码分页（limit/offset） | 游标分页 | 审计浏览低频；用户偏好简单分页优先（00 演进不预支） |

## 3. 技术基线（引用 M1-platform §3，2026-09-07 本机核实）

- bun 1.3.14（运行时/安装/测试——2026-09-07 工具链从 pnpm 11.20.0/vitest/tsx 迁移）/ Node v22.23.1（tsc 编译）/ Docker 29.7.2+compose v5.4.0；dev PG 宿主 5433
- 包结构：apps/{server,web,cli} + packages/protocol；turbo 全仓 typecheck/test/lint/build 绿
- apps/server：Hono `createApp(deps)` 工厂（db/sessions/audit/rateLimiter/ldap 注入）+ `sessionMiddleware`/`csrfProtection`/`requestContextMiddleware` 装配 + `/api/auth` 路由组 + `RbacService.can` 判定链（SUPER_ADMIN 短路/平台权限/空间角色/空间状态）
- 新增依赖预估：E 板块 `openid-client`（R5）；B 板块无新增（node:fs）；其余复用
- 权限码单源 `src/auth/permissions.ts`（PERMISSIONS 十码）；api_token 表结构已就位（08 §3：token_hash/scope/expires_at/revoked_at）

## 4. Task 清单

### 板块 A 命名空间 HTTP API（T1-T8）

#### T1 鉴权与授权中间件
- **Files**
  - Create: `apps/server/src/http/auth-middleware.ts`——`requireAuth()`（无 principal → 401 `auth.session_expired`）与 `requirePermission(code, {namespaceId?})`（rbac.can false → 403 `auth.forbidden`）与 `requirePlatformRole(roles: RoleCode[])`（用户平台角色命中任一，否则 403——T3 建空间用，skillhub 平台角色判定同构；rbac.ts 暴露 `platformRolesOf(userId)` 查询，重构自 rbac.ts 既有私有 platformGrants（M1 阶段一实现））；错误码补 `auth.forbidden`（errors.ts）
  - Modify: `apps/server/src/auth/errors.ts`（补 `forbidden: 'auth.forbidden'` + httpStatusFor 403 映射）
  - Test: `src/http/auth-middleware.test.ts`
- **Assert**：无 cookie → 401 session_expired；有 cookie 无权限 → 403 forbidden；SUPER_ADMIN 短路放行
- **Commit**: `feat(server): add auth and permission middleware`

#### T2 空间列表 GET /api/namespaces
- **Files**
  - Create: `apps/server/src/http/namespaces.ts`（路由组工厂，deps 注入：db/rbac）——GET 列表：页码分页（limit/offset，limit≤100）+ 过滤（type/status/keyword? 最小：type+分页）；返回全部 ACTIVE 空间 + 我所属空间（无论状态），含 memberCount 与我的角色（myRole）
  - Modify: `apps/server/src/app.ts`（挂 `/api/namespaces` 路由组 + requireAuth）
  - Test: `src/http/namespaces.test.ts`（集成）
- **Assert**：匿名 401；分页默认 limit 20/offset 0；ACTIVE 全量可见 + 成员可见非 ACTIVE；myRole 正确
- **Commit**: `feat(server): add namespace list api`

#### T3 创建空间 POST /api/namespaces
- **Files**
  - 续 Modify: `apps/server/src/http/namespaces.ts`——POST：body {slug, displayName, description?}（slug 复用 protocol slugSchema 校验；type 默认 TEAM）；**权限：requirePlatformRole([ASSET_ADMIN])（SUPER_ADMIN 含在其内）——普通 ACTIVE 用户 403（R2 对齐 skillhub S1）**；type=GLOBAL 仅 SUPER_ADMIN（ASSET_ADMIN 建 GLOBAL → 403）；事务：insert namespace + insert namespace_member(OWNER=创建者)
  - Test: 续 `namespaces.test.ts`
- **Assert**：201 + 空间行 + member 行（OWNER）；slug 非法 400（复用 protocol 错误）；slug 重复 409；**普通 ACTIVE 用户建 TEAM → 403（R2）**；ASSET_ADMIN 建 GLOBAL → 403
- **Commit**: `feat(server): add namespace create api`

#### T4 空间详情与更新 GET/PATCH /api/namespaces/:id
- **Files**
  - 续 Modify: `namespaces.ts`——GET 详情（ACTIVE 全可见；非 ACTIVE 仅成员/超管）；PATCH {displayName?, description?}：namespace:manage（空间 OWNER/ADMIN）或 SUPER_ADMIN；状态列变更不在此端点（T5）
  - Test: 续
- **Assert**：详情可见性正确；改名需权限（MEMBER 403）；404 对不存在/无权限可见性的空间
- **Commit**: `feat(server): add namespace detail and update api`

#### T5 空间状态治理 PATCH /api/namespaces/:id/status
- **Files**
  - 续 Modify: `namespaces.ts`——body {status: FROZEN|ARCHIVED|ACTIVE}：仅 SUPER_ADMIN（R3）；FROZEN 后写操作已被 rbac WRITE_PERMISSIONS 拒（既有判定链）
  - Test: 续（SUPER_ADMIN 冻结 → MEMBER 发布被拒已在 rbac 集成测覆盖，此处断言状态流转 + 权限）
- **Assert**：SUPER_ADMIN 可流转三态；OWNER 不可 → 403；状态落库
- **Commit**: `feat(server): add namespace status governance api`

#### T6 成员列表与添加 GET/POST /api/namespaces/:id/members
- **Files**
  - 续 Modify: `namespaces.ts`——GET 成员列表（角色过滤可选）；POST {userId, role}：namespace:manage；**角色分配链：OWNER 可设 ADMIN/MEMBER；ADMIN 仅可设 MEMBER；OWNER 角色不可经添加产生**（创建者自动 OWNER；转让后置 M2，05 §6.2「可转让」）；目标用户须 ACTIVE；防重复（409）
  - Test: 续
- **Assert**：OWNER/ADMIN 添加 MEMBER 成功；OWNER 添加 ADMIN 成功；ADMIN 设 ADMIN → 403；设 role=OWNER → 400（转让后置）；重复 409；目标不存在 404
- **Commit**: `feat(server): add namespace member manage api`

#### T7 移除成员 DELETE /api/namespaces/:id/members/:userId
- **Files**
  - 续 Modify: `namespaces.ts`——DELETE：namespace:manage；OWNER 本人不可被移除（转让后置 M2，05 §6.2「可转让」表结构已支持，操作面后置）；ADMIN 不可移除 OWNER/同级 ADMIN（仅 OWNER 可）
  - Test: 续
- **Assert**：OWNER 移除 MEMBER/ADMIN 成功；ADMIN 移除 ADMIN → 403；移除 OWNER → 400（转让后置）
- **Commit**: `feat(server): add namespace member removal api`

#### T8 板块 A 集成验证
- **Steps**：A 全端点 curl 冒烟（建空间→加成员→改角色→冻结→成员发布 403 链）+ 全仓 typecheck/test/lint
- **Assert**：板块 A 集成测试全绿；RBAC 负例（MEMBER 管理 403）覆盖
- **Commit**: （并入 T7 后验证，无独立 commit）

### 板块 B 对象存储接口（T9-T12）

#### T9 ObjectStorage SPI 定义
- **Files**
  - Create: `apps/server/src/storage/types.ts`——`ObjectStorage` 接口：`put(key, stream|buffer, {contentType?})` / `get(key): Readable|Buffer` / `delete(key)` / **`deleteMany(keys[])`（批量，S2 对齐）** / `exists(key)` / **`presignedGetUrl(key, {expiresInSec, downloadFilename?})`（下载直链，Local 返回本地 URL 或空实现——S2 对齐，M3 下载面消费）**；key 规则：`{namespaceId}/{assetId}/{versionId}/{filename}` 服务端拼装、禁 `..`/绝对路径/反斜杠——`assertSafeKey(key)` 校验（防路径穿越，M3 上传消费）
  - Test: `src/storage/types.test.ts`（assertSafeKey 正反例）
- **Assert**：`../`、绝对路径、`\`、空 key 全部拒绝；合法嵌套 key 通过
- **Commit**: `feat(server): define object storage spi`

#### T10 Local 实现
- **Files**
  - Create: `apps/server/src/storage/local.ts`——`createLocalStorage(dir)`：put（mkdir -p + writeFile 临时文件原子改名）、get（读流）、delete（unlink）；路径 join 后校验仍以 dir 为根
  - Test: `src/storage/local.test.ts`（tmp dir 内 roundtrip + 越界 key 拒）
- **Assert**：put/get roundtrip 字节一致；delete 幂等；越界 key 抛错不落盘
- **Commit**: `feat(server): add local storage implementation`

#### T11 存储工厂与配置
- **Files**
  - Modify: `apps/server/src/config/env.ts`（补 `STORAGE_DRIVER`（default `local`）+ `STORAGE_DIR`（default `./storage`））
  - Create: `apps/server/src/storage/index.ts`——工厂按 driver 返回（local 现成；s3 分支 throw `not implemented`——R4 后置标注，防静默误配）
  - Modify: `apps/server/src/app.ts`（deps.storage 注入）
  - Test: env 补丁用例（factory 选择正确/未知 driver 拒启）
- **Assert**：STORAGE_DRIVER=local 返回 Local；s3 → 启动报错（not implemented）；缺 STORAGE_DIR 默认 ./storage
- **Commit**: `feat(server): add storage factory and config`

#### T12 板块 B 集成验证
- **Steps**：单测全绿 + typecheck；存储 SPI 无 HTTP 面（M3 上传管线消费），无冒烟项
- **Assert**：storage 测试全绿；`.gitignore` 加 `storage/`（本地存储目录不入库）
- **Commit**: `chore: ignore local storage directory`

### 板块 C API Token（T13-T18）

#### T13 token 生成与哈希工具
- **Files**
  - Create: `apps/server/src/auth/tokens.ts`——`generateTokenSecret()`（crypto 32B base64url → 明文 `aih_<43 chars>`）；`hashToken(plain)`（sha256 hex 64——api_token.token_hash VARCHAR(64) 匹配）；展示掩码 `maskToken(plain)`（`aih_xxxx…末 4`）
  - Test: `src/auth/tokens.test.ts`
- **Assert**：明文不落库（哈希断言）；hash 长度 64；掩码不泄全量
- **Commit**: `feat(server): add api token generation and hashing`

#### T14 签发 POST /api/tokens
- **Files**
  - Create: `apps/server/src/http/tokens.ts`（路由组：requireAuth）——POST {label?, expiresInDays?}：**省略 expiresInDays = 不过期（expiresAt null）**；传值 = 到期天数（1-3650，超限 400）；scope 默认空串（全量，M1 不做 scope 过滤）；落库 token_hash + 返回一次明文 + expiresAt
  - Modify: `apps/server/src/app.ts` 挂载；`auth/permissions.ts` 无需动（签发本人 token 不需权限码：任何 ACTIVE 用户签自己的）
  - Test: `src/http/tokens.test.ts`
- **Assert**：201 明文一次 + 响应只含一次明文；库中仅哈希；过期时间计算正确；**明文不落日志/审计 detail（P6 安全面）**
- **Commit**: `feat(server): add api token issue api`

#### T15 我的 token 列表 GET /api/tokens
- **Files**
  - 续 Modify: `tokens.ts`——GET：仅本人 token（masked 前缀 + label + createdAt + expiresAt + revokedAt 状态）；本人 token 量小，全量返回（分页后置，R9 简单优先）
  - Test: 续
- **Assert**：列表只含本人；掩码格式；吊销状态可见
- **Commit**: `feat(server): add api token list api`

#### T16 吊销 DELETE /api/tokens/:id
- **Files**
  - 续 Modify: `tokens.ts`——DELETE：本人或 SUPER_ADMIN；幂等（已吊销 204）
  - Test: 续
- **Assert**：吊销后 revoked_at 落库；他人 token → 403/404
- **Commit**: `feat(server): add api token revoke api`

#### T17 Bearer 认证中间件
- **Files**
  - Create: `apps/server/src/http/token-middleware.ts`——解析 `Authorization: Bearer <plain>` → hash → join user_account（status ACTIVE）→ revokedAt null + expiresAt 未过 → c.set('principal') + c.set('tokenId')；与 sessionMiddleware 并存：Bearer 显式则以 Bearer 为准，无则回退 session
  - Modify: `app.ts` 装配顺序（token → session）
  - Test: `src/http/token-middleware.test.ts`
- **Assert**：合法 token → principal；吊销/过期/坏格式 → 匿名（401 由 requireAuth 出）；token 用户 DISABLED → 拒
- **Commit**: `feat(server): add bearer token auth middleware`

#### T18 板块 C 集成验证
- **Steps**：签发→Bearer 调 namespace 列表→吊销→再调 401；curl 冒烟
- **Assert**：板块 C 测试全绿；token 通道与 session 通道 RBAC 同判（同一 requirePermission）
- **Commit**: `feat(server): add api token integration coverage`（并入 T17 验证）

### 板块 D 审计浏览 API（T19-T21）

#### T19 审计查询服务
- **Files**
  - Create: `apps/server/src/audit/query.ts`——`queryAudit(db, {limit, offset, action?, targetType?, targetId?, actorId?, **requestId?, clientIp?,** from?, to?})`（过滤面 S4 对齐 skillhub AuditLogController）：drizzle select 组合过滤 + createdAt 倒序 + count 总行数
  - Test: `src/audit/query.test.ts`
- **Assert**：过滤组合正确；分页总数一致；无匹配空列表
- **Commit**: `feat(server): add audit query service`

#### T20 审计浏览路由 GET /api/audit
- **Files**
  - Create: `apps/server/src/http/audit.ts`——requirePermission(PERMISSIONS.auditRead) + 查询参数 zod 解析（limit≤100/offset/action/targetType/targetId/actorId/**requestId/clientIp**/from/to）→ {items, total, limit, offset}
  - Modify: `app.ts` 挂载
  - Test: `src/http/audit.test.ts`
- **Assert**：AUDITOR/SUPER_ADMIN 200；普通用户 403（含 Bearer token 通道同判）；参数非法 400
- **Commit**: `feat(server): add audit browse api`

#### T21 板块 D 集成验证
- **Steps**：触发登录/审计事件 → 审计员查询可见 → 过滤断言
- **Assert**：板块 D 测试全绿；audit:read 权限面闭环
- **Commit**: （并入 T20）

### 板块 E OIDC 授权码流（T22-T28）

#### T22 OIDC 环境配置
- **Files**
  - Modify: `apps/server/src/config/env.ts`——补 `OIDC_ENABLED`（default false）/`OIDC_DISCOVERY_URL`/`OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET`/`OIDC_REDIRECT_URL`（可选，缺省运行时以 `PUBLIC_BASE_URL`（default http://localhost:3000）推导 `/api/auth/oidc/callback`）；OIDC_ENABLED=true 缺必填 → 启动报错（同 LDAP 模式）；**OIDC_DISCOVERY_URL 仅接受 https（localhost 开发例外）——防降级窃听（P6）**
  - Modify: `.env.example` 同步
  - Test: env.test 补丁
- **Assert**：enabled 缺 discovery/clientId → 拒启；disabled 全缺 OK；.env.example 全字段
- **Commit**: `feat(server): add oidc env config`

#### T23 OIDC 客户端工厂
- **Files**
  - 依赖：`bun add openid-client`（apps/server 内执行）
  - Create: `apps/server/src/auth/oidc.ts`——`createOidcClient(oidcConfig)`（**工厂参数化：config 含 discoveryUrl/clientId/clientSecret/redirectUrl——多 provider 即多实例，注册表后置（S6）**）：基于 discovery URL 的 `Issuer.discover` + Client（R5）；导出 `getOidcClient()`（惰性单例，disabled → null）
  - Test: 工厂分支测试（disabled → null；enabled → client 构造——discovery 需网络：该分支单测跳过，冒烟覆盖——**诚实标注：discovery 为真实网络依赖，单测覆盖 disabled 分支与参数校验，enabled 路径冒烟用本地 fake issuer（自签 jwks）手动清单**）
- **Assert**：disabled → null 不触网；参数校验（非法 URL 拒启）
- **Commit**: `feat(server): add oidc client factory`

#### T24 发起授权 GET /api/auth/oidc/authorize
- **Files**
  - Create: `apps/server/src/http/oidc-routes.ts`——GET authorize：OIDC disabled → 404；生成 state（random 32B）与 nonce（PKCE S256，openid-client 内建）→ **state/nonce 存独立 HttpOnly cookie（`oidc_state`，TTL 5min，SameSite=Lax）**——authorize 由未登录访客发起，无 session 可存（不能存 session 内字段）→ 302 provider authorizationUrl
  - Modify: `app.ts` 挂载 /api/auth/oidc
  - Test: 单测（disabled 404；state cookie 写入）——302 跳转断言
- **Assert**：302 带 Location provider；state cookie 落；无 OIDC 404
- **Commit**: `feat(server): add oidc authorize endpoint`

#### T25 回调 GET /api/auth/oidc/callback
- **Files**
  - 续 Modify: `oidc-routes.ts`——callback：code+state 校验（state 与 `oidc_state` cookie 比对，不匹配 403 `auth.oidc_state_mismatch`；比对后清除 cookie）→ `client.callback(redirectUrl, params, {nonce, state})` → claims（sub/email/name/email_verified）→ `provisionExternalUser`（**T26 产物；执行顺序 T26 先于 T25 落地**）→ 自动登录（建 session）→ 302 `PUBLIC_BASE_URL/?oidc=success`（M4 前端接管）
  - 错误码：errors.ts 补 `oidcStateMismatch: 'auth.oidc_state_mismatch'` / `oidcDenied: 'auth.oidc_denied'`（403）
  - Test: 单测（mock oidc client 注入——第三方库 client 注入，非服务模块 mock；state 不匹配分支）
- **Assert**：state 不匹配 403；成功路径 claims → 建号/绑定 → session cookie 落；错误码结构化
- **Commit**: `feat(server): add oidc callback endpoint`

#### T26 公共 provider-provision 服务（抽 LDAP 建号模式）
- **Files**
  - Create: `apps/server/src/auth/provision.ts`——从 auth-service 抽出 `provisionExternalUser(db, {provider, providerSubject, userId, displayName, email?})`：identity_binding(provider+subject) 查已绑定 → 复用账号；未绑定 → 建号/绑定（事务）；供 LDAP（重构复用）+ OIDC 共用——**重构注意：ldap 路径行为不变（回归测试守护）**
  - Modify: `auth-service.ts`（provisionOrSyncLdapUser → provision.ts 服务，保留语义）
  - Test: 回归（LDAP 测试全绿）+ provision 单测（绑定冲突/已存在账号同步）
- **Assert**：LDAP 既有测试不破；OIDC subject 绑定复用逻辑独立可测
- **Commit**: `refactor(server): extract shared external-user provisioning`

#### T27 OIDC 建号与准入
- **Files**
  - 续 Modify: `provision.ts`/`oidc-routes.ts`——准入：M1 ACCESS_POLICY=open 直通 ACTIVE（env 已拒非 open）；email 同步 displayName（缺 displayName 用 email 前缀/sub）
  - Test: 续单测
- **Assert**：open 策略直通；重复登录命中同一绑定不重复建号
- **Commit**: `feat(server): provision oidc users with binding`

#### T28 板块 E 验证
- **Steps**：本地 fake OIDC issuer 冒烟（临时脚本：本地 http 服务签自签 jwks + 授权端点，跑通 authorize→callback→建号全链，验证后删——真实网络依赖不 stub 服务模块）；无 fake 环境时列手动清单
- **Assert**：板块 E 测试全绿；冒烟记录（或手动清单交付）
- **Commit**: （并入 T27 验证，无独立 commit）

### 板块 F CLI Device Flow（T29-T34）

#### T29 device pending store
- **Files**
  - Create: `apps/server/src/auth/device-store.ts`——`DevicePendingStore`（内存 Map，同 Session 模式）：`create({userId?})` 返回 {deviceCode, userCode}（device 32B / user 8 位 base32 无易混字符）；`getByDevice(deviceCode)` / `getByUser(userCode)`；`approve(deviceCode, userId)` / `reject`；TTL 10min 惰性过期清理；user_code 查询限流复用 rateLimiter（T33）
  - Test: `src/auth/device-store.test.ts`
- **Assert**：code 格式（user 8 位免混淆）；TTL 过期失效；approve 幂等边界
- **Commit**: `feat(server): add device flow pending store`

#### T30 请求授权 POST /api/auth/device
- **Files**
  - Create: `apps/server/src/http/device-routes.ts`——POST（**无 session 要求**——CLI 未登录）：生成 device+user code → 返回 {deviceCode, userCode, verificationUri: `${PUBLIC_BASE_URL}/api/auth/device/verify`, expiresIn: 600, interval: 5}；user_code 匿名低频限流（复用 rateLimiter key=userCode）
  - Modify: `app.ts` 挂载（**Device authorize/token 端点豁免 CSRF**——无 cookie 认证通道、Bearer 化 token 无 CSRF 面；实现 = `csrfProtection` 加 `exemptPaths` 参数，回归测试守护）；approve 端点仍在 CSRF 保护内（cookie 通道）
  - Test: 集成（无 Origin 可 200）
- **Assert**：201 code 对返回；重复请求换新码旧码失效；无 Origin 不 403（豁免生效）
- **Commit**: `feat(server): add device authorization endpoint`

#### T31 用户确认 POST /api/auth/device/approve
- **Files**
  - 续 Modify: `device-routes.ts`——POST {userCode}：requireAuth（登录态）+ CSRF 生效（登录态 cookie 通道）→ 查 pending 按 userCode → 绑定 userId → {status: approved}；拒绝/不存在 → 404 `auth.device_code_invalid`；重复 approve 幂等
  - 错误码补 `deviceCodeInvalid: 'auth.device_code_invalid'`（404）
  - Test: 续集成
- **Assert**：登录用户 approve 成功绑定；未登录 401；错码 404；CSRF 双缺失 403（cookie 通道生效）
- **Commit**: `feat(server): add device approval endpoint`

#### T32 CLI 轮询签发 POST /api/auth/device/token
- **Files**
  - 续 Modify: `device-routes.ts`——POST {deviceCode}（无 session，豁免 CSRF 同 T30）：pending 未 approve → 400 `auth.authorization_pending`（RFC 8628 语义，带 retry-after=interval）；approved → 签 API Token（scope=cli，T14 复用）+ 清 pending → {accessToken, tokenType: 'Bearer', expiresIn}；expired → 401 `auth.device_expired`；错码 404
  - 错误码补 `authorizationPending: 'auth.authorization_pending'`（400）/`deviceExpired: 'auth.device_expired'`（401）
  - Test: 续集成
- **Assert**：pending → 400 + retry-after；approve 后轮询 → token 可 Bearer 用（调 /api/auth/me 200）；过期 → 401
- **Commit**: `feat(server): add device token polling endpoint`

#### T33 安全细节
- **Files**
  - 续 Modify: `device-routes.ts`/`device-store.ts`——user_code 尝试限流（每 code 5 次/分钟 → 429，复用 rateLimiter）+ 校验不区分大小写
  - Test: 续
- **Assert**：错码连续 5 次 → 429；userCode 大小写不敏感
- **Commit**: `feat(server): harden device flow rate limiting`

#### T34 板块 F 集成验证
- **Steps**：全流程 curl 冒烟（device → approve（登录 cookie + Origin）→ token → Bearer me）+ 负例；typecheck/test/lint
- **Assert**：板块 F 测试全绿；CLI 全链（authorize→approve→token）冒烟过
- **Commit**: `feat(server): add device flow integration coverage`（并入 T33）

### 板块 G 收尾（T35-T38）

#### T35 文档同步
- **Files**
  - Modify: `docs/00-product-direction.md` §5 M1 行（阶段二完成注记，v 版本修订同步）
  - Modify: `docs/05-identity-access.md`（OIDC/Device Flow/Token 落地 → Status 注记 v1.4；若实现与 05 有偏差先改 05 还是代码——以 05 为契约，偏差回改）
  - Modify: `AGENTS.md` 命令区（如有新命令/依赖说明，如 openid-client 无命令面则不动）
- **Assert**：00 §5 状态如实；05 修订记录同步；grep 无遗留占位
- **Commit**: `docs: sync milestone state with M1 phase two completion`

#### T36 全仓验证 + 冒烟
- **Steps**：turbo 全仓 typecheck/test/lint/build 0 fail → server 起服务冒烟（namespace CRUD + token 签发/Bearer + audit 浏览 + device flow 全链；OIDC 按 T28 记录）
- **Assert**：全仓绿；冒烟清单逐项过
- **Commit**: （无独立 commit，T38 前验证记录）

#### T37 8 维自检
- **Steps**：8 维自检打分表（简洁/极致/正确/一致/安全/前瞻/直白易懂/好维护，≥9 才进入 T38）
- **Assert**：打分 ≥9 留档
- **Commit**: （无）

#### T38 提交与发布
- **Steps**：commit（若 T36/T37 有修正）→ push → **push 后验证同步**（git status ahead 归零 + git ls-remote 比对，不信截断输出）
- **Commit**: `docs: finalize M1 phase two`（如无文档残留则无 commit，直接 push）

## 5. 验收总断言（plan 全绿定义）

- 全仓 `bun run typecheck` 0 error；`bun run test` 0 failed（bun test）；`bun run lint` 0 error；`bun run build` 成功
- 板块 A：命名空间 CRUD/成员管理集成测试全绿；RBAC 负例（普通用户建空间 403（R2）/MEMBER 管理 403 / 非成员 404）
- 板块 B：storage SPI + Local roundtrip 测试全绿；越界 key 拒；`.gitignore` 含 storage/
- 板块 C：token 签发明文一次 + 哈希落库 + Bearer 全链（签发→使用→吊销→401）测试全绿
- 板块 D：AUDITOR 审计浏览 200 / 普通用户 403；过滤组合正确
- 板块 E：OIDC disabled 404 / state 不匹配 403 单测绿；fake issuer 冒烟记录或手动清单（真实网络依赖诚实标注）
- 板块 F：device 全链集成测试绿（请求→approve→token→Bearer 可用）；RFC 8628 语义（authorization_pending/expired）覆盖
- 8 维自检 ≥9（T37 打分表留档）；git 同步验证（status 无 ahead、ls-remote 与本地一致）

## 6. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-07 | sunxuewen-rush | 初稿：M1 阶段二计划（命名空间 API/对象存储/API Token/审计浏览/OIDC/Device Flow 六块 38 Task，R1-R9 待拍板） |
| v1.1 | 2026-09-07 | sunxuewen-rush | 自检 P1-P7：T6 角色分配链（OWNER 不可经添加产生/转让后置）、T14 过期语义（省略=不过期）、T24 state 改独立 HttpOnly cookie（访客无 session）、T25 provision 引用 T26+执行序、§5 断言顺序 A→B→C→D→E→F、T22 discovery https-only（防降级窃听）、T14 明文不落日志断言、T30 CSRF 豁免表述定稿、草稿残留清零 |
| v1.2 | 2026-09-07 | sunxuewen-rush | R1-R9 skillhub 源码对标（§1.1 S1-S8）：R2 用户拍板对齐 skillhub（TEAM 建空间权 = ASSET_ADMIN/SUPER_ADMIN，T1 补 requirePlatformRole、T3 权限与断言更新）；T9 SPI 补 deleteMany/presignedGetUrl（S2）；T19/T20 审计过滤补 requestId/clientIp（S4）；§5 板块 A 断言补建空间 403；再审修复：R1 执行顺序收敛为 §4 编号序（A→B→C→D→E→F）、T1 引用修正（platformGrants 在 rbac.ts 非 T23）、T23 工厂参数化显式化（S6 落地） |
| v1.3 | 2026-09-07 | sunxuewen-rush | 评审定稿：R1-R9 全部采纳推荐值（R2 对齐 skillhub）；§1.1 补 S9/S10（token 永不过期同构、账号合并后置——OIDC 同 email 双账号为预期行为）；后置清单补账号合并 |
| v1.4 | 2026-09-07 | sunxuewen-rush | 工具链迁移同步：pnpm 11/vitest/tsx → bun 1.3.14（install/test/dev；tsc/turbo/biome 保留）；命令引用与 §3 技术基线更新 |
| v1.5 | 2026-09-08 | sunxuewen-rush | M0/M1 复验：头部引用链补 design 决策档案（2026-09-08-m1-platform-foundation-design.md）——本 plan 保持执行记录原貌，决策另存档案（00 §7 ② 约定） |
