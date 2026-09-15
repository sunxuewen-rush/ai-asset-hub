# M4b-pre 认证整车迁移设计（better-auth）

> Date: 2026-09-15
> Updated: 2026-09-15（v1.6：**迁移时序与 Task 边界重划（用户 2026-09-15 批准方案 A）**——① §5.1 由「`RENAME` 一次性搬迁」改为**建表与搬迁分离**：`0008` 纯结构（建 6 表 · 零数据）· `0009` 用户域搬迁（随认证面切流同批）· `0010` 令牌搬迁（随令牌面切流同批）· `0011` 收口（13 条 FK 重指向 + 删旧 4 表）⇒ **任一时刻只有一个真值源**（无冻结快照、无双写）② §7 阶段范围/出口与 §5.4 回滚边界同步 ③ §10 R7 补「过渡期零消费」口径 ④ 重划依据（实测）：旧表消费面 `user_account` **52 处/10 文件**（含 13 条 FK 定义）· `identity_binding` 8/2 · `local_credential` 26/4 · `api_token` 27/4（合计 **113 处 / 12 文件**）——`RENAME` 会让 7 个生产文件当轮编译失败；且「会话签发 ↔ 档位判定 ↔ 令牌鉴权」是一条链，分批切流必产生「一端写新表、一端读旧表」的不可运行中间态 ⑤ plan 同步升 **v0.5**；v1.5：**T1 提交前补丁**——R16 定稿为**两包均精确钉定**（`better-auth@1.7.5` + `@better-auth/api-key@1.7.5`；依据 = lock 实测插件 peerDeps 要求内核同版本，caret 会在 `bun update` 后错配；用户 2026-09-15 拍板）；v1.4：**T1 落地修正**——① R16 依赖数「1 个包」→ **2 个包**（`better-auth` + `@better-auth/api-key`，实测官方不导出 `apiKey`）② 类型注记（`declaration: true` 下实例类型不可命名 ⇒ `AihAuth = Auth` + 插件端点调用点局部窄化）③ P4 仓内复现（首次 API 调用即 schema check ⇒ `getSession` 断言归 T2）；**自检换靶轮（提交前）**——靶 = 数字可验证性 + 跨文档一致 + 指针时效性；回修 **2 类数字错 + 1 类时效指针 + 1 处流程缺口**（认证面测试 14→**16 文件** · fixture 触点 18 文件/24 处→**15 文件/20 处** · 正文硬写的仓外临时路径去时效 · M4b-pre 立项登记同步 `docs/00` **v1.30** + 主 design **v1.12**）⇒ 逐维重评 **9.44**（v1.2 9.38；⚠ 提高因补齐验证缺口 + 立项登记，非产物变好）；**用户整体批准 + 批准后实测修正（X8）**——① Status 改「定稿（用户 2026-09-15 整体批准）」· §2.1 待批表转「已批准」② **R13 邮箱值修正**：`admin@local` → **`admin@local.test`**（实测：官方 CLI 对 `admin@local` 直接拒 `Invalid email address.`；RFC 6761 保留 TLD `.test` 明确「不可投递」语义）③ **seed 落地姿势定案**：官方 `create-admin` **非幂等**（同 email 二次执行 → `Error: User already exists. Use another email.`，**`--force` 亦不覆盖**）⇒ seed 保留自建幂等路径（官方 API 服务端直呼），`create-admin` 定位为**一次性运维工具**（不入选种子链路）④ §2.3 增 **X8**（官方 CLI 实测：`create-admin` 落点 = user + credential account · `--role` 接受自定义档名 `superadmin` · `--data` 可写额外字段）；v1.1：**8 维自检修订轮**（v1.0 初稿 → 逐维复核 → 回修 6 类缺陷 + 补 1 项实证）——① **数字订正**：生产调用面口径（`requireRole()` 3 → **1** · `ACCOUNT_ROLE.` 33/7 文件 → **32/10 文件**；合计 57 处不变）· HTTP 面处置（保留 1 → **2**）· 净变化估算（新增 500–620 → **500–590**；净减 ~470–590 → **498–588**）· §1.1 写路由口径改实测（24 写路由 / 14 处解析 JSON 体）② **文件清单补漏 5 项**（`db/schema/users.ts` · `db/schema/index.ts` · `auth/token-scopes.ts` · `auth/tokens.ts` · `http/oidc-routes.ts` ⇒ 新增「保持不变」节）+ 删「登出兼容别名（若批准保留）」待定措辞 → 定案不保留 ③ **新增 X7 实证**（存量令牌迁移规则端到端：§5.3 的 SQL 公式写回 `apikey.key` 后**原明文仍可被官方验证**，错明文被拒）+ §5.3 补 `rate_limit_enabled`/`start`/`prefix` 与权限码 JSON 的 SQL 处理方式 ④ §2.2 补 cookie 实测属性（`better-auth.session_token` · HttpOnly · SameSite=Lax）；⑤ §8 补登录/注册的响应体与入参差异、§10 补 I4（依赖清洁室声明）；⑥ §12 配置归属订正（`AUTH_TRUSTED_ORIGINS` 挂 `05 §5`）；v1.0：初稿——spike 结论（X1-X6）转入选型定稿）
> Status: **定稿（用户 2026-09-15 整体批准）**——8 维自检 **9.44** ≥9（**提交换靶轮实测值**：v1.1 9.38 → v1.3 9.44；逐维证据见 §13）；依据 = 沙箱实测 **X1-X8 全通过**（记录不入库）+ 本仓实扫量化（两轮独立实测核对）；实施由 `docs/plans/M4b-pre-auth-migration.md` 承接
> Scope: M4b-pre（认证整车迁移）——把自研认证面（会话 / CSRF / 令牌 / 设备流 / 角色判定）迁到 better-auth（MIT · 官方件），含企业目录自定义凭证插件 · 会话落库 · 4 档角色用官方 admin 插件表达 · 设备流按官方两段式契约
> 引用链：本文档 → 规范 01 §3.3 · 05 §3/§4.1/§5/§6 · 08 §3/§8 · 00 §5（引用不复制）；M4b 主 design（批件登记表与批间门）→ `2026-09-10-m4b-admin-console-design` §2.3

## 1. 背景与文档定位

### 1.1 触发与决策链

M4b 拆六批后（M4b-1 组件地基 ✅），M4b-2「认证与壳」对齐期发现两件事：

1. **自研 CSRF 加固无官方可选件**——逐仓实查后确认 JS/Hono 生态没有等价整车：hono 官方 `csrf()` 只拦表单三件套 content-type（实测：本仓业务面写路由 **24** 个，其中 **14** 处显式解析 JSON 体 ⇒ 换官方 `csrf()` 后这些请求在服务端不再被校验），Hono 官方 middleware 全清单（25 件）除 `csrf` 外无任何 origin/security 类件，`validator('json')` 在 content-type 不匹配时是跳过而非拒绝（实测）。这一轮把「CSRF 怎么加固」逼成了「**认证底座要不要换整车**」。
2. **既有会话存储是进程内内存**（`auth/session.ts:25-29` `InMemorySessionStore`：Map + TTL）——多实例不共享、**重启即全员登出**。这与「用不用官方」无关，是我们自身的真实缺陷。

随后按用户原则「**能用官方的就用官方的，不要自己造轮子**」做整体评估，并在沙箱（仓外，记录不入库）跑完六项实测（X1-X6，见 §2.3）——**全项通过**，故立本批。命名查证：原拟 M4c 与既有 M4c（账号与权限治理）撞名，改定 **M4b-pre**（镜像 M4-pre 前置批命名）。

### 1.2 为什么是「前置批」而不是继续 M4b-2

M4b-2 = 「认证 + 壳」两半。若采纳整车，「认证」那一半（登录/登出 API 路径与响应体 · 设备授权页 · 会话态读取 · CSRF 面）几乎全部改写，而「壳」那一半（SideNav / TopBar / 401 分流 / 角色单点）不受影响。当前 M4b-2 **零代码**，是全项目最便宜的决断时刻。

### 1.3 与 M4b 六批的关系

| 批 | 受本批影响 | 说明 |
|----|-----------|------|
| M4b-1 地基 | **无** | 已交付的组件面域 / 跨面件 / 官方件均不复用认证实现 |
| M4b-2 认证与壳 | **有（范围重估）** | 壳面不变；认证面改为消费本批产物（会话上下文取 `/api/auth/me`，形状不变，见 §8 R14）；设备授权页归本批落地 |
| M4b-3 个人面 A | 无（依赖 M4b-2） | 我的令牌消费 `/api/tokens`（形状不变） |
| M4b-4 个人面 B | 无 | 仅消费会话与角色 |
| M4b-5 审核批 | 无 | 角色判定语义不变（`role >= N`） |
| M4b-6 治理批 | 无 | — |
| M4c 账号与权限治理 | **有（范围收窄）** | 用户列表 / 改角色 / 会话吊销由官方 admin 插件承接；封禁走我方单值状态列（见 R5） |
| M5 CLI | **有（契约定档）** | 设备流契约为官方两段式（§8）；CLI 现为 2 行占位，零既有消费方 |

### 1.4 官方件边界声明（交底）

本批的判定规则：**能给官方的一律给官方**；凡本批仍自绘的部分，理由必须写在本文档里（不留给后人猜）。

| 槽位 | 归属 | 理由 |
|------|------|------|
| 会话签发 / 校验 / cookie | 官方 | 官方整车内建（`better-auth.session_token`，DB 落库） |
| CSRF / Origin 校验 | 官方 | 官方内建 `validateOrigin` 语义（Origin→Referer 回退 · cookie 门 · null Origin 拒绝 · trustedOrigins 通配）；本批删除自研 `csrf.ts` |
| 密码哈希 | 官方**注入点** + 我方算法 | 官方提供 `emailAndPassword.password.hash/verify` 官方配置项；算法沿用我方既有 scrypt 参数 ⇒ 存量密码零重置（见 R10） |
| 角色与权限码 | 官方 | 官方 admin 插件 `createAccessControl` + 自定义 roles |
| API 令牌 | 官方 | 官方 api-key 插件（官方 sha256 存储、权限码、过期、吊销） |
| 设备流 | 官方 | 官方 device authorization 插件（两段式 · 轮询语义 · `slow_down`） |
| **企业目录凭证** | **自绘**（唯一大块自绘面） | **官方零支持**（官方文档 16 页 grep `ldap` 零命中、发行包零命中、npm 无官方 LDAP 包）⇒ 官方文档化的扩展点内自绘插件（`createAuthEndpoint` + `internalAdapter` + `setSessionCookie`），非改核心 |
| **OIDC 通道编排** | **自绘（保留）** | 见 R11：通道默认关闭且无可实测 IdP；编排用的是标准库 `openid-client`（非自造协议实现）；迁移收益（多 provider / 账号链接）非本期需求 |
| 登录入口分派 | 自绘（薄） | 单表单需要「保留账号 → 官方密码 / 否则目录 / 目录不可达回退」三路分派，官方端点无处安放该策略（见 R15） |

## 2. 目标架构与拍板表

### 2.1 拍板结果

**已确认**（用户 2026-09-15 拍板：采纳整车方向 + 前置 + spike 先行）

| # | 决策 | 依据 |
|---|------|------|
| R1 | 选型 **better-auth `^1.7.5`**（stable · MIT · 与目标数据模型同族） | 官方 stable 发行版；drizzle adapter 官方提供；spike X1-X6 全通过 |
| R2 | 集成形态 = **官方实例 + 薄适配层**，改动锁在 auth 模块内 | 官方 Hono 接缝与既有会话中间件近乎同构（`app.on(['POST','GET'],'/api/auth/*', c => auth.handler(c.req.raw))` + `auth.api.getSession({headers})`），spike 实证 |
| R14 | **外契约稳定**：`/api/auth/me` 与 `/api/tokens`（路径 + 响应形状 + `role` 数值语义）**保持不变** | 前端（M4b 面）与既有测试断言零改动；变更集中在无既有消费方的设备流 |

**已批准**（用户 2026-09-15 整体批准；下表 14 项全部生效）

| # | 决策 | 推荐理由 |
|---|------|---------|
| R3 | 表结构**采用官方默认表名/列名**（`user` `session` `account` `verification` `device_code` `apikey`） | 长期维护（官方 schema 演进 / 官方 CLI 后续可用）+ 无需永久维护一张名字映射表；PG 的 FK 按 OID 引用，`RENAME` 后自动跟随（13 条引用零重建，实测见 §3） |
| R4 | 角色模型 = **官方 admin 插件表达 4 档**；`user.role` 存**档名文本**（`user`/`admin`/`superadmin`）；新增 `ROLE_LEVEL` 数值映射单点；`RbacService.roleOf()` **签名不变** | 生产 57 处调用（`requireAuth()` 24 + `requireRole()` 1 + `ACCOUNT_ROLE.` 数值判定 32 · 散 10 文件）**零改动**；档位序是我们已拍板的产品语义（M4-pre §2.2 四档线性），官方插件提供的是权限码表达——两者以「`ROLE_LEVEL` 键集合 === `ac.roles` 键集合」的测试锁定一致 |
| R5 | 账号状态 = **单值三态** `status`（`additionalFields`，`input:false`，默认 `ACTIVE`）；**不使用**官方 ban 端点 | 官方 `banned` 是布尔，表达不了我们的 `PENDING`（05 §4.1 三态 + M4c 准入策略依赖它）；双真值（`status` 与 `banned`）必然漂移。封禁由 M4c 自绘 `setStatus`（官方 `listUsers`/`setRole`/会话吊销仍白拿） |
| R6 | 会话落库（官方 `session` 表）；`expiresIn = 28800`（8h）+ `disableSessionRefresh: true` | 8h 是 05 §5 已定稿的安全档位（不因换整车而放宽）；关闭滑动刷新 = 绝对过期，与现状语义一致（官方配置项，非自造） |
| R7 | 令牌 = 官方 api-key 插件；**`rateLimit` 关闭**；REST 端点形状不变（内部服务端直呼签发） | 官方 api-key 默认带 10 次/24h 限流，会与我们既有语义（无令牌级限流，限流在下载/上传面）冲突 ⇒ 显式关闭。签发必须服务端直呼（带 headers 时 `permissions` 属 server-only 属性，否则 400 `SERVER_ONLY_PROPERTY`，spike 实证） |
| R8 | 设备流 = 官方契约（`POST /device/code` → `GET /device?user_code` 认领 → `POST /device/approve` → `POST /device/token`）+ 启用官方 `bearer` 插件 | 官方设备 token 是 Bearer 形式，不加 `bearer` 插件则受保护端点 401（spike 实证）；两段式是官方要求（未认领直接 approve → 400） |
| R9 | 删自研 `csrf.ts`（62 行），Origin 校验交官方；dev 白名单经 env（`AUTH_TRUSTED_ORIGINS`） | 官方 origin 校验在跑（spike 实证：无 Origin 的写请求 → 403 `MISSING_OR_NULL_ORIGIN`）；同时原生解掉 A1（dev 5173 非 GET 被 403 的阻塞） |
| R9a | **业务面同源守卫**（T3 收尾补）：新增 `http/origin-guard.ts`，cookie 写请求经官方 `auth.$context.isTrustedOrigin()` 校验（**与官方同一白名单**，不重写比较逻辑）；出口沿用 `auth.csrf_failed`（07 §4） | 官方 origin 校验只覆盖 `/api/auth/*`；业务面不然只剩 cookie `SameSite=Lax`（挡跨站、挡不住「同站跨源」）⇒ 相对迁移前是防线回归。语义与官方 `validateOrigin` 同构：安全方法跳过 · Bearer 显式通道跳过 · 无 `cookie` 头跳过 · `origin → referer` 回退 · 缺 Origin 即 403 |
| R10 | 密码哈希 = **注入我方既有 `hashPassword`/`verifyPassword`**（scrypt N=2^17, r=8, p=1） | 官方提供配置化注入点；沿用既有算法 ⇒ 存量 `local_credential.password_hash` **原样可验**，无密码重置 |
| R11 | OIDC 通道**保留既有 `openid-client` 编排**，仅把「会话签发」接官方 | ① 通道默认关闭（`OIDC_ENABLED=false`）且**无可实测 IdP**——改到官方 `genericOAuth` 会引入无法验收的面（用户明确厌恶未验证声明）② 编排用标准库、不是自造协议 ③ 迁移收益（多 provider / 账号链接）非本期需求。**此条可翻转**（用户若要求「尽量官方」，则改为 `genericOAuth` 并接受该面测不了） |
| R12 | 目录邮箱：**优先 `mail`，取不到即拒**（`auth.email_missing`），绝不按规则拼 | 实测：主收信域 ≠ AD 域 ⇒ 拼不出；官方 `user.email` 是 `NOT NULL + UNIQUE` 硬约束（非偏好）；合成邮箱会污染账号真值并造成唯一键错配 |
| R13 | 逃生通道：保留本地账号逃生（纯 LDAP 不落本地密码 + bootstrap 账号），命中保留名单则跳过目录走官方密码通道；**bootstrap 账号需合成邮箱**（`SEED_ADMIN_EMAIL`，默认 **`admin@local.test`**）· 种子链路**自建幂等**（官方 `create-admin` 不入选） | 纯 LDAP 禁止落本地密码（既有硬约束）⇒ 逃生账号只能来自本地凭证通道；该账号无目录来源，合成邮箱是**本设计唯一的合成点**，须显式登记。**实测修正（X8）**：官方 CLI 拒 `admin@local`（`Invalid email address.`）⇒ 取 RFC 6761 保留 TLD `.test`；官方 `create-admin` 同 email 二次执行报错且 `--force` 不覆盖 ⇒ 破坏既有「种子幂等」契约，故仅作一次性运维工具 |
| R15 | 登录入口 = 自绘插件端点 `POST /api/auth/sign-in/aih`（单表单）；官方 `/sign-in/email` 保留供内部/测试/兼容 | 三路分派（保留账号 → 官方密码校验；否则目录绑定；目录不可达且本地有该账号 → 回退本地）无官方端点承载；分派策略是我们产品语义（05 §3.1 五条流程） |
| R16 | 依赖影响面 = **运行时新增 2 个包**（`better-auth@1.7.5` + `@better-auth/api-key@1.7.5`，**两者均精确钉定**），**不引入任何其它运行时依赖** | **落地实测修正（T1 · v1.4）**：`apiKey` 插件在**独立包**内——better-auth 1.7.5 的 `exports` 无 `./plugins/api-key`、`better-auth/plugins` 不导出 `apiKey`、`@better-auth/*` 未被提升 ⇒ 必须显式安装**同版本**（**两包均精确钉定**——lock 实测插件 `peerDependencies` 要求 `better-auth: ^1.7.5` / `@better-auth/core: ^1.7.5` / `better-call: 1.4.0`，故内核若用 caret 会在 `bun update` 后与插件错配；用户 2026-09-15 拍板按公开参考项目惯例全精确，见 `apps/server/package.json`）；`openid-client` 与 `ldapjs` 保留（LDAP 通道与 OIDC 编排继续用）；删掉的自研面不产生新依赖 |
| R17 | 会话存储位置 = **官方 `session` 表**（DB），本批删除 `InMemorySessionStore` | 顺带修掉「重启即全员登出」真实缺陷（spike 实证：重启进程后同一 cookie 仍 200） |

### 2.2 迁移后认证架构

```
请求进入 /api/*
  │
  ├─ 非 /api/auth/* 业务面
  │    ├─ Bearer 在场？ → 官方 api-key 校验（verifyApiKey，权限码 = permissions）→ principal
  │    └─ 否则            → 官方 getSession(cookie)  → principal（DB 落库会话）
  │        └─ 账号 status !== ACTIVE → 401 auth.session_expired（官方 banned 不参与判定）
  │
  └─ /api/auth/* → 官方 auth.handler ← 官方整车接管
       ├─ 官方 origin 校验（Origin→Referer→拒绝 · trustedOrigins 白名单）
       ├─ 官方内建端点：sign-in/sign-up/sign-out · session · device/* · api-key/*
       └─ 自绘插件端点（唯一扩展面）
            └─ POST /sign-in/aih  单表单三路分派
                 ① 保留本地账号（bootstrap 逃生）→ 官方密码校验（注入的 verify）
                 ② 其他 → 目录 bind（多 DC 故障转移 · 三重身份尝试）→ 取 mail/name → 建号 → 会话
                 ③ 目录不可达且该标识有本地凭证 → 回退本地密码
            会话产出统一走官方 setSessionCookie（cookie 名/TTL/属性全官方；实测形态：`better-auth.session_token` · HttpOnly · SameSite=Lax）

授权（业务面）
  ├─ 档位序（读面精细判定）：`ROLE_LEVEL = { user: 1, admin: 10, superadmin: 100 }` 单点
  │    └─ RbacService.roleOf() 签名不变（内部：官方 user.role 文本 → ROLE_LEVEL；status 非 ACTIVE → null）
  └─ 权限码（凭证面）：官方 ac statements（asset/review/audit/user）× 档位 = 与 ROLE_LEVEL 键集合一致性由测试锁定
```

### 2.3 spike 实测依据（X1-X7，全通过）

沙箱在**仓外临时环境**（不进仓、跑完即弃），测试库独立（不碰 dev 库）。结论与行号级依据：

| 项 | 结论 |
|----|------|
| X1 企业目录自定义凭证插件 | 通。官方文档化扩展点（`createAuthEndpoint` + `internalAdapter` + `setSessionCookie`）可完成 bind → 建号 → 会话 → cookie；负例齐（错密码 401 · 目录禁用账号 401 · 缺字段 400） |
| X2 会话落库 | 通。`session` 表落库；**重启进程后同一 cookie 仍 200**（对照现状：重启即全员登出） |
| X3 4 档角色 + 权限判定 | 通。超管全放；`user` 档按声明精确 DENY/ALLOW；`listUsers`/`setRole`/封禁端点全通 |
| X4 设备流 | 通。两段式闭环；**官方 origin 校验实证在跑**（无 Origin 写请求 → 403 `MISSING_OR_NULL_ORIGIN`）；设备 token 需官方 `bearer` 插件才被解析 |
| X5 令牌权限映射 | 通。我们的 `resource:action` scope ↔ 官方 `permissions` 1:1；超范围 INVALID；客户端带 headers 提权被拦（`SERVER_ONLY_PROPERTY`） |
| X6 测试 fixture 范式 | 通。`signUpEmail({asResponse:true})` 取 `Set-Cookie` → 测试 `headers:{cookie}`（全程真实端点） |
| X7 存量令牌迁移规则 | 通。官方签发 key → 算出旧库形态 `sha256(明文)` 的 hex → 用 §5.3 的 SQL 公式写回 `apikey.key` → **原明文 `verifyApiKey` = valid**，错明文被拒（正反对照） |
| X8 官方 CLI 能力 | 通。`create-admin`：落点 = `user` + `account`（`provider_id='credential'`）· `--role superadmin` 接受**自定义档名** · `--data` 可写额外字段（实测 `employeeId` → `employee_id`）· 邮箱需过官方校验（`admin@local` 被拒）· **非幂等**（二次执行报错、`--force` 不覆盖）。`generate`/`migrate`/`init`/`secret`/`info`/`upgrade` 同在（§7 S1 落地姿势） |

**已知坑（8 条，实现期必须带着走）**

| # | 坑 | 影响 |
|---|----|------|
| P1 | `internalAdapter.findUserByEmail` 返回 `{ user, accounts }`，不是 user 本体 | 直取 `.id` = undefined → `createSession(undefined)` → `session.user_id NOT NULL` 违约（沙箱已踩） |
| P2 | 官方把 email **小写化** | 邮箱比对/白名单须大小写不敏感；迁移搬迁须同步归一 |
| P3 | 官方 CLI 生成 schema 时用 jiti 加载配置 | 生成期配置里 `import schema`（尚未生成）会加载失败（沙箱已踩）⇒ 生成期用独立配置或临时去 import |
| P4 | 运行时 drizzle 实例必须带 schema | 否则 `BetterAuthError(SCHEMA_MISMATCH)`（adapter 做 schema check） |
| P5 | 列名 camelCase → snake_case（`user_id` / `expires_at`） | 手写 SQL 与运维脚本注意 |
| P6 | api-key 的 `permissions` 是 server-only 属性 | 带 headers 的调用不得传（400）；签发/校验必须服务端直呼 |
| P7 | 权限不足与 key 不存在共用同一错误码 | 错误码映射须显式区分（否则会泄露 key 存在性） |
| P8 | 官方 api-key 默认限流 10 次/24h | 不显式关闭会把既有令牌语义改掉（见 R7） |

**T3 实施期新增坑（P9-P14，全部实测，代码内已留注记）**

| # | 实测现象（源码/实证依据） | 处置 |
|---|--------------------------|------|
| P9 | 官方 `NODE_ENV=test` 下**默认跳过 Origin 校验**（`context/create-context.mjs:211`：`skipOriginCheck = isTest() ? true : false`） | 生产/开发默认开启（无需配置）；测试要断言 Origin 三态须显式 `advanced: { disableOriginCheck: false }`（`AuthRuntimeDeps.advanced` 透传位已备） |
| P10 | better-call `ctx.json(json, { status })` 在 HTTP 路由下**不设状态码**（`context.mjs:70-76`：`asResponse=false` 时只回 `json`，`routerResponse` 仅 `asResponse` 调用生效） | 定制错误状态必须 `throw ctx.error(...)` / `throw new APIError(status, body, headers)`；实证：登录限流曾静默返回 200 |
| P11 | 全局 `originCheckMiddleware` **仅当请求带 cookie 时才校验 Origin**（`api/middlewares/origin-check.mjs:108`：`if (!(forceValidate \|\| useCookies)) return`） | 自绘登录端点必须挂官方 `formCsrfMiddleware`（官方内建 sign-in/sign-up 同款）：它在「有 Origin/Referer 但无 cookie」时也强校验 |
| P12 | 官方 `hooks.after` 在 `/sign-out` 路径**取不到会话**（会话行已先删，实测 `ctx.context.session` 为空） | 登出审计改由 `app.ts` 官方 handler 包装层承担（先 `getSession` → 转发 → 补审计）；注册审计仍走官方 `databaseHooks.user.create.after` ✓ |
| P13 | drizzle-kit 生成的「FK 重指向 + 删旧表」迁移**顺序不可直接采用**：先 `DROP TABLE … CASCADE` 会连带删除依赖约束，随后的 `DROP CONSTRAINT` 报「约束不存在」 | 迁移 SQL 手工定序：摘旧约束 → 挂新约束 → 删旧表；journal/snapshot 描述终态，不受定序影响 |

**T4 实施期新增坑（P15-P18，全部实测，代码内已留注记）**

| # | 实测现象（源码/实证依据） | 处置 |
|---|--------------------------|------|
| P15 | 官方 api-key `keyExpiration` 边界以**天**为单位：`minExpiresIn` 默认 **1 天** ⇒ **设备流 1h 令牌签发被拒**（`EXPIRES_IN_IS_TOO_SMALL`，实测 400）；`maxExpiresIn` 默认 **365 天** ⇒ 既有 `expiresInDays ≤ 3650` 契约被拒 | 显式配置 `keyExpiration: { maxExpiresIn: 3650, minExpiresIn: 1/24 }`（官方配置项）；用户签发下限仍由路由层 zod（`≥1` 天）收紧 |
| P16 | 官方 `apikey.permissions` 是 **`text`**（源码 `create-api-key.ts:810` `JSON.stringify(permissions)`），**不是 jsonb**；且**单层** `jsonb_object_agg` 在「同 resource 多 action」（`asset:publish,asset:manage`）时**静默只留最后一项**（实测 `{"asset": "manage"}`——publish 被丢弃，**不报错**）⇒ 属静默改权，比报错更危险 | 迁移 SQL 用 `jsonb_object_agg(res, acts)::text` 的**两层聚合**（`jsonb_agg` per resource → `object_agg` per row）；常驻用例锁定「SQL 表达式 ⇔ `token-scopes.ts` 映射」等价 |
| P17 | 官方 `verifyApiKey` 对**过期**令牌抛 `KEY_EXPIRED` 并**删除该行**（`validate-api-key` 路径）⇒ 列表语义随之变化（旧实现保留过期行）；`enabled=false`（吊销）**保留行** | design §8 登记为变更；吊销仍走 `enabled=false`（列表可见 `revokedAt`），与旧契约一致 |
| P18 | 官方 create/update 的 server-only 判定 = `ctx.request \|\| ctx.headers`（`create-api-key.ts:733`）⇒ **服务端直呼不得带 `headers`**；带 headers 传 `permissions` → 400 `SERVER_ONLY_PROPERTY`。`verifyApiKey` 端点本身为 `createAuthEndpoint.serverOnly` | 令牌面统一走 `auth/api-keys.ts` 薄适配层（不带 headers；`body.userId` 归属）；常驻用例覆盖 `SERVER_ONLY_PROPERTY` 负例 |

**T5 实施期新增坑（P19-P20，全部实测，代码内已留注记）**

| # | 实测现象（源码/实证依据） | 处置 |
|---|--------------------------|------|
| P19 | 设备流端点有**强制请求字段**：`POST /device/code` 的 `client_id` 必填（无 grant 配置时）；`POST /device/token` 三字段全必填 `grant_type`（**字面量** `urn:ietf:params:oauth:grant-type:device_code`）+ `device_code` + `client_id`——缺字段时官方返回 `{message, code:'VALIDATION_ERROR'}`（**不是** OAuth 体），只有进入业务校验才回 `{error, error_description}`（实测：`slow_down`/`authorization_pending`/`expired_token`/`access_denied`/`invalid_grant`，一律 **400**） | 契约按 §8 登记（含两种错误体形态）；测试按完整三字段轮询；CLI（M5）契约定在此 |
| P20 | 设备令牌 = **官方会话 token**（`/device/token` 返回 `access_token = session.token`，`bearer` 插件把 Bearer 还原为会话 cookie）⇒ 与「API Token（api-key）走 Bearer」共用同一请求头；且官方 `bearer` 插件对**无效** Bearer 静默跳过（不抛错）⇒ 若不处理会「无效 Bearer + 有效 cookie = 降级成功」 | 会话中间件在 `authVia='bearer'` 时**剥掉 cookie 头**再解析会话：既放行设备流会话 Bearer，又保留「不降级」语义（旧 `csrf.ts`/T17 口径）；常驻用例：他人 cookie + 设备令牌 ⇒ 解析为令牌归属者 || P14 | 官方 `isTrustedOrigin` 是**上下文对象上的方法**（内部读 `this.trustedOrigins`，`context/create-context.mjs:143`）——`const { isTrustedOrigin } = await auth.$context` 解构后调用直接 `TypeError: undefined is not an object`（实测：业务面守卫首跑 500） | 必须以方法形式调用（`const ctx = await auth.$context; ctx.isTrustedOrigin(url, …)`）；同族注意：凡官方上下文方法读 `this` 者（`$context` 面）都不得解构 |

## 3. 影响面总览（实扫量化）

| 面 | 实测 | 本批处置 |
|----|------|---------|
| 服务端认证核心 `apps/server/src/auth/**`（非测试） | **16 文件 / 1492 行** | 增 3 · 改 2 · 保留 4 · 删 10（§4.1） |
| 服务端认证 HTTP 面 | **6 文件 / 669 行**（`auth-middleware` 80 · `token-middleware` 85 · `tokens` 144 · `device-routes` 154 · `oidc-routes` 178 · `request-context` 28） | 改/改写 4 · 保留 2（`oidc-routes` · `request-context`） |
| 认证面测试 | **16 文件 / 2471 行**（`auth/**` **10** 文件 1051 行 + `http/**` 6 文件 1420 行） | 全量改写 fixture（§6） |
| 测试 fixture 触点 | **15 个测试文件 / 20 处** `createSession`（另：生产调用 **3 处**——`auth/routes.ts`×2 · `http/oidc-routes.ts`×1，随文件删除；定义 **1 处**——`auth/session.ts`，随文件删除） | 按 §6 范式替换 |
| 生产调用面 | `requireAuth()` **24 处** · `requireRole()` **1 处** · `ACCOUNT_ROLE.` 数值判定 **32 处 / 10 文件**（assets 8 · reviews 11 · schema/users 4 · tokens 2 · labels 2 · audit 1 · review/service 1 · assets/manage 1 · auth/routes 1 · db/seed 1）＝ **合计 57 处** | **零改动**（R4/R14） |
| 全量测试规模 | **47 个测试文件**（基线 475 例 · 474 pass / 1 skip，记自 `docs/00` §5 M4b-1 行） | 不得下降；新增 ≥40 例 |
| 数据层 | 运行库 **12 表**（实测）；`user_account` 被 **13 条 FK** 引用（业务表 10 + 用户域内部 3） | `RENAME` 自动跟随（PG 按 OID，实测约束清单见 §5.1） |
| 迁移文件 | **8 个**（`0000`–`0007`） | 新增 2（`0008` 结构 + 搬迁 · `0009` 清理） |
| CLI | `apps/cli/src/index.ts` **2 行**（占位，M5 未实现） | 设备流契约变更**零既有消费方** |
| 前端 | 无登录页 / 无会话上下文（M4b-2 未动工；M4b-1 组件面受本批影响 = 0） | 仅 M4b-2 计划受影响 |
| 规范层 | `05` §3/§3.1/§4.1/§5/§6.1 · `08` §3/§8/Status | 原地改写（§12） |

## 4. 全链路改造清单

### 4.1 服务端（文件级）

**新增**

| 文件 | 预估 | 职责 |
|------|------|------|
| `apps/server/src/auth/better-auth.ts` | 80–120 行 | 官方实例装配：drizzle adapter（带 schema）· `baseURL`/`secret` ← 既有 env · `emailAndPassword`（注入我方 hash/verify + `disableSignUp` ← `REGISTRATION_ENABLED`）· `session`（R6）· `trustedOrigins`（R9）· plugins：`admin`(ac/roles) · `deviceAuthorization` · `apiKey`(rateLimit 关) · `bearer` · `username` |
| `apps/server/src/auth/roles.ts` | ~40 行 | `ROLE_LEVEL` 数值映射单点 + `createAccessControl` statements + `ac.newRole` 三档声明（键集合与 `ROLE_LEVEL` 一致） |
| `apps/server/src/auth/plugins/ldap-credentials.ts` | 150–200 行 | 自绘凭证插件：三路分派（R15）· bind → 取 mail/name → 建号（`role` = 默认档 · `status` = ACTIVE）· 错误码映射 |
| `apps/server/src/db/schema/auth.ts` | ~170 行 | 官方 CLI 生成产物并入（6 表 + 关系）；`status` 作为 `additionalFields` 落列 |
| `apps/server/src/http/auth-routes.ts` | ~60 行 | 薄层：`GET /api/auth/me`（形状不变，R14）。**不做旧登出别名**——官方 `sign-out` 是唯一登出端点（前端未实现，零迁移成本） |
| `apps/server/src/http/origin-guard.ts` | ~70 行 | **业务面同源守卫**（R9a，T3 收尾补）：`/api/*` 除官方平面外的 cookie 写请求 → 官方 `auth.$context.isTrustedOrigin()`（同一 `trustedOrigins`）；出口 `auth.csrf_failed`（07 §4） |
| `apps/server/src/auth/api-keys.ts` | ~165 行 | **官方 api-key 薄适配层**（T4）：`issueApiKey`/`revokeApiKey`/`verifyApiKey`/`listApiKeys`/`findApiKey`——统一「服务端直呼（不带 headers）」姿势与 scope ⇔ permissions 映射 |

**改造**

| 文件 | 现状 | 改法 |
|------|------|------|
| `auth/rbac.ts` | 67 行 | 内部实现改读官方 `user.role` 文本 → `ROLE_LEVEL`；`status` 判定不变；**导出签名不变** |
| `auth/ldap.ts` | 162 行 | 通道实现保留；`searchSelf` 属性集 **+1**（取 `mail`） |
| `http/auth-middleware.ts` | 80 行 | `requireAuth()`/`requireRole()` 签名与语义不变；principal 来源改官方 `getSession`；token scope 判定改官方权限码 |
| `auth/errors.ts` | 89 行 | **T7**：删 8 个已死错误码 + 对应状态分支（自研注册 4 · 行级锁定 1 · 设备流 3），原地留「删除理由块」；**保留码字面量零改动**（前端映射零影响） |
| `http/token-middleware.ts` | 85 行 | 改走官方 `verifyApiKey`（serverOnly 端点 · 服务端直呼）；`authVia='bearer'` 语义保留（防凭证降级）；scope 由官方 `permissions` 派生（`NULL` = 全量）；账号 `status` 门保留（官方不看该列） |
| `http/tokens.ts` | 144 行 | 内部改官方（`auth/api-keys.ts`）：create/update 服务端直呼（R7）；**响应形状不变**（`id` 文本主键、`scope` 归一 → §8 登记）。**执行期偏离**：list 直读官方表（官方 `GET /api-key/list` 需会话 cookie，而本端点允许令牌通道 ⇒ 只读同表，形状可精确映射） |
| `auth/tokens.ts` | 45 行 | 退化为**只剩明文生成器** `generateTokenSecret`（注入官方 `customKeyGenerator` ⇒ 明文形态逐字不变）；`hashToken`/`maskToken` 随切流删除 |
| `http/device-routes.ts` | 154 行 | 按官方四端点契约改写（两段式，R8） |
| `config/env.ts` | — | 增 `AUTH_TRUSTED_ORIGINS`（空 = 仅同源）· `SEED_ADMIN_EMAIL`；既有 `SESSION_SECRET` / `SESSION_TTL_HOURS` / `PUBLIC_BASE_URL` / `REGISTRATION_ENABLED` / LDAP 与 OIDC 组**全部保留**（映射进官方配置） |
| `db/schema/users.ts` | 129 行 | 用户域表定义整体移交 `db/schema/auth.ts`（本文件退化为空——随 S5 删除）；`ACCOUNT_ROLE` 常量拆到 `auth/roles.ts`（数值档位单点） |
| `db/schema/index.ts` | 5 行 | re-export 调整为 `auth.ts`（保持既有 import 路径不变） |
| `db/seed.ts` | — | bootstrap 账号改官方建号路径（服务端直呼官方 API，保持**幂等契约**：存在性检查 → 不存在才建）；合成邮箱按 R13（`SEED_ADMIN_EMAIL`，默认 `admin@local.test`）；**不调用官方 `create-admin`**（非幂等，实测 X8） |
| `app.ts` | — | 装配序调整：`/api/auth/*` → 官方 handler（置于业务中间件之前）· 业务面 `tokenAuthMiddleware` → **`trustedOriginGuard`** → 官方 `getSession` 薄封装 → 路由（`csrfProtection` 挂载删除，防线由 `origin-guard.ts` 以官方同源语义补回）· **官方 handler 包装层**承担官方端点缺失的审计（登出 + T5 的设备 approve/deny/token；`AppDeps.publicBaseUrl` 随设备路由删除而下线——设备 `verification_uri` 由官方按 `baseURL` 推导）· 设备路由挂载删除（T5） |
| `http/request-context.ts` | 28 行 | 保留（审计与限流仍取 clientIp/UA）；官方会话同时记录 `ip_address`/`user_agent`（列已存在） |

**删除**

| 文件 | 行数 | 理由 |
|------|------|------|
| `auth/csrf.ts` | 62 | 交官方 origin 校验（R9）；**业务面缺口由 `http/origin-guard.ts` 补回**（R9a：原实现按 `Host` 比对，dev 跨端口必 403 = A1 根因；新守卫按官方 `trustedOrigins` 判定） |
| `auth/session.ts` | 87 | 官方 `session` 表 + cookie（R17） |
| `auth/session-middleware.ts` | 55 | 官方 `getSession` 薄封装替代（cookie 名/TTL 官方管） |
| `auth/device-store.ts` | 113 | 官方 `device_code` 表接管 pending 状态 |
| `auth/auth-service.ts` | 180 | 官方端点 + 自绘插件替代（编排逻辑迁移进插件） |
| `auth/provision.ts` | 131 | 自动建号逻辑迁移进插件（`internalAdapter` 路径） |
| `auth/users.ts` | 168 | 注册/登录/锁定官方承接（保留的只有校验常量，迁入插件） |
| `auth/routes.ts` | 138 | 官方端点替代 + 薄层 `http/auth-routes.ts`（仅留 `/me`） |
| `auth/password.ts` | 75 | **函数体保留**，迁入 `better-auth.ts` 的注入配置（文件删除） |
| `auth/errors.ts` | 79 | 错误码表改写为「官方错误 → 我方 `{code,message}`」映射表（净减） |
| `db/schema/users.ts` | 34（T3 后） | 过渡期文件：用户域已交 `auth.ts`（T3），余下的 `api_token` 表定义随 **T4 的 `0011`** 删除（文件与表同批下线） |
| `http/device-routes.ts` | 149 | **T5**：设备流整体交官方 `deviceAuthorization` 插件（四端点 + deny）；自研路由与限流实例删除 |
| `auth/device-store.ts` | 113 | **T5**：内存 pending 存储由官方 `device_code` 表接管（0008 建表，含 `status`/`pollingInterval`/`lastPolledAt`） |

**保持不变**（本批零改动）

| 文件 | 行数 | 说明 |
|------|------|------|
| `auth/ldap.ts` 的通道实现 | 162 | 只加 1 个属性（取 `mail`），bind/故障转移/禁用识别逻辑不动 |
| `auth/oidc.ts` | 69 | OIDC 客户端编排保留（R11） |
| `http/oidc-routes.ts` | 178 | 授权/回调路由保留，仅会话签发接官方 |
| `auth/token-scopes.ts` | 28 | scope 码表保留（新签发按官方 `permissions` 表达；注释口径改为映射说明） |
| `auth/tokens.ts` | 25 | 明文生成/哈希工具保留（迁移 re-encode 断言复用；新签发走官方） |
| `auth/rate-limit.ts` | 53 | 业务面限流保留（官方限流只覆盖 `/api/auth/*`，R8） |

净变化：删约 **1088 行**，新增约 **500–590 行**（含插件 150–200）⇒ **认证面源码净减 498–588 行**，且密码学/会话/CSRF/限流/设备流状态机全部从「自研」改为「官方 + 配置」。

### 4.2 数据层

见 §5（表级映射与列级规则）。

### 4.3 配置（env 变化总览）

| 变量 | 变化 | 说明 |
|------|------|------|
| `DATABASE_URL` | 不变 | 官方 adapter 复用同一连接 |
| `SESSION_SECRET` | 不变（≥32 字符） | 映射为官方 `secret` |
| `SESSION_TTL_HOURS` | 不变（默认 8） | 映射为官方 `session.expiresIn`（秒） |
| `PUBLIC_BASE_URL` | 不变 | 映射为官方 `baseURL`（回调/设备 verification_uri 推导） |
| `REGISTRATION_ENABLED` | 不变 | 映射为官方 `emailAndPassword.disableSignUp` |
| `AUTH_TRUSTED_ORIGINS` | **新增**（逗号分隔，空 = 仅 `PUBLIC_BASE_URL` 同源） | **认证面（官方）与业务面（`origin-guard.ts`）共用同一白名单**；dev 填 `http://localhost:5173`（不填则前端 cookie 写请求 403——两平面同时生效）；**生产留空**（反代同源，官方自动纳入 `baseURL`） |
| `SEED_ADMIN_EMAIL` | **新增**（默认 **`admin@local.test`**） | bootstrap 账号合成邮箱（R13；`.test` = RFC 6761 保留 TLD，明确不可投递；`admin@local` 会被官方校验拒） |
| LDAP 组 / OIDC 组 / 限流组 | 不变 | 通道实现与限流落点不动（§4.1） |

## 5. 数据迁移

### 5.1 表级映射与迁移时序（现状 12 表 → 迁后 14 表）

**时序原则（防冻结快照 / 单真值源）**：搬迁 SQL 与**其消费面的切流同批落地**——`0008` 只建结构（零数据）·
`0009` 用户域搬迁 + **`0010` 13 条 FK 重指向与旧 3 表删除**（**随认证面切流同批**，T3）·
`0011` 令牌搬迁与收口（随令牌面切流，T4）。任一时刻的读写真值源**只有一处**（旧表或新表），既无冻结快照，也无双写（§10 R7）。
**FK 必须随切流批重指向**（非留到收口批）：新账号只写官方 `user`，业务表若仍引用 `user_account`，新用户的资产/审计写入会被外键直接拒绝——单真值源不允许两批之间悬空。
依据 = 实测：旧表消费面合计 **113 处 / 12 文件**（`user_account` 52/10 · `identity_binding` 8/2 · `local_credential` 26/4 · `api_token` 27/4），
且「会话签发 ↔ 档位判定 ↔ 令牌鉴权」不可分批切流。

| 现状表 | 迁后 | 动作 |
|--------|------|------|
| `user_account` | `user` | `0008` **建新表**（列调整：`display_name`→`name` · `avatar_url`→`image` · `role` `smallint`→`text` 档名 · `email` 补 `NOT NULL + UNIQUE` · 新增 `email_verified`/`username`/`display_username`/`banned`/`ban_reason`/`ban_expires`）→ **`0009` 搬迁**（`INSERT … SELECT` + 列级规则见 §5.2）→ **`0010` 重指向 11 条 FK + 删本表**（另 2 条随 `identity_binding`/`local_credential` 删除 ⇒ 合计 13 条） |
| `identity_binding` | `account` | `0008` **建新表** → **`0009` 搬迁**（`provider`→`provider_id` · `provider_subject`→`account_id`；补官方 token 列，本批全 NULL） |
| `local_credential` | `account` | **合入 `account`**（同上批）：`password_hash`→`password` · `username`→`account_id` · `provider_id='credential'`；`id` 由脚本生成文本主键；`failed_attempts`/`locked_until` 由官方限流语义承接 ⇒ **不迁**（记入 §10 I2） |
| `api_token` | `apikey` | `0008` **建新表** → **`0011` 搬迁**（列映射与 re-encode 见 §5.3；随令牌面切流，T4） |
| — | `session` | `0008` 新建（无存量：现为进程内内存 ⇒ **迁移即全员登出**，见 §10 I1） |
| — | `verification` · `device_code` | `0008` 新建（无存量） |
| 残留 | — | `0010`（**切流批，已完成**）：**11 条 FK 重指向新 `user` 表**（另 2 条随 `identity_binding`/`local_credential` 删除 ⇒ 合计 13 条）+ 删旧 3 表（`user_account`/`identity_binding`/`local_credential`）；`0011`（收口批）：删 `api_token` 空壳 + 无用列/旧索引清理 |

### 5.2 列级规则

| 规则 | 表达 |
|------|------|
| 角色（0/1 → 档名） | `1 → 'user'` · `10 → 'admin'` · `100 → 'superadmin'`（`0` 不入库，现状亦派生） |
| 邮箱归一 | 全部 `lower(email)`（对齐官方写入路径 P2） |
| 邮箱缺失（历史本地账号） | `email IS NULL → id || '@local'`（确定性、唯一）；该批账号在管理面标记「无目录邮箱」，**不参与目录通道** |
| 状态 | `status` 原值保留（`text` 三态）；`banned` 恒 `false`（不由判定消费，R5） |
| 工号 | `username` = 原 `identity_binding.provider_subject`（目录身份 subject）；`display_username` 同值 |
| 显示名 | `name` = 原 `display_name` |

### 5.3 存量凭证处理（逐条断言）

| 凭证 | 处理 | 断言（验收口径） |
|------|------|-----------------|
| 本地密码 | **零重置**：`account.password` = 原 `local_credential.password_hash`（格式自描述，注入的 verify 直接可验，R10） | 迁移后该账号**用原密码**登录成功；错误密码仍 401 |
| API 令牌 | **re-encode 迁移**（明文不变 ⇒ 持有者无感）：官方存储 = `base64url(sha256(明文))`（源码依据 `@better-auth/api-key/dist/index.mjs:2310-2313` 默认 hasher），我方存储 = `sha256(明文)` 的 **hex** ⇒ 同一字节串换编码 | SQL：`translate(rtrim(encode(decode(token_hash,'hex'),'base64'),'='), '+/', '-_')`；迁后**原明文 token** 仍可访问业务端点——**T4 已端到端实证**（克隆库：SQL 产物 `=== base64url(sha256(明文))` 字节相等 + 官方 `verifyApiKey` 判 valid；错明文 invalid） |
| 令牌权限码 | `scope`（逗号串）→ 官方 `permissions`（`asset:publish` → `{asset:['publish']}`） | 非空 scope 的 token 超范围访问仍 403；`''`/`cli`（全量）→ `permissions = NULL` |
| 令牌行其它列 | `config_id='default'` · `reference_id` = 原 `user_id` · `enabled` = `revoked_at IS NULL` · `rate_limit_enabled = false`（对齐 R7 全局关闭）· `rate_limit_time_window`/`rate_limit_max` = 官方默认（86400000/10，因行级关限流不参与判定）· `start`/`prefix` = `NULL`（官方仅用于展示，现状本就无明文前缀 ⇒ 展示口径不变）· 时间列按 **naive UTC** 归一（官方表为 `timestamp`；旧表 `timestamptz` ⇒ `AT TIME ZONE 'UTC'`） | 迁后令牌列表不显示前缀（与现状一致）；不因官方默认限流被意外拦截；`id` 由自增整数变官方**文本主键**（§8 变更表登记） |
| 权限码转换方式 | 在 **`0011`** 迁移 SQL 内用 `split_part(scope, ':', 1/2)` + **两层聚合**（`jsonb_agg` per resource → `jsonb_object_agg` per row）生成 `permissions` **文本**（`jsonb_object_agg(...)::text`；**不引一次性脚本**，保持前向迁移单一路径）。**列型订正**：官方 `apikey.permissions` 是 **`text`**（源码 `JSON.stringify(permissions)`），**非 jsonb**（初稿误写）；单层聚合会**静默丢弃**同 resource 的其它 action（实测：`asset:publish,asset:manage` → `{"asset":"manage"}`，v2.1 订正——初稿误写为「报 duplicate key」） | 迁移后 `permissions` 与 scope 逐项等价——**T4 已实测**：SQL 表达式 ⇔ `token-scopes.ts` 映射逐条等价（含 `''`/`'cli'` → NULL、多码同 resource 归并、畸形码跳过），常驻用例锁定 |
| 会话 | **不迁**（现为进程内内存，无持久化形态） | 迁移执行后所有既有会话失效（用户需重登一次）——影响声明固定一条 |
| 设备流令牌（历史 `scope='cli'` 行） | 随同一批搬迁（`permissions = NULL` = 全量）；**签发点**自 T4 起直接走官方 api-key | 设备令牌 TTL 1h ⇒ 官方 `keyExpiration.minExpiresIn` 必须放宽到 `1/24` 天（P15），否则签发被拒 |

### 5.4 回滚边界

`forward-only`（仓库既有纪律）：`0008` 建表 · `0009` 用户域搬迁 · `0010` FK 重指向与删旧 3 表 · `0011` 令牌搬迁与删 `api_token` **均不入回滚脚本**（每一步都是前向；「回退」= 恢复备份）；**执行前备份**为运维动作（记入 runbook 待办，M6）。沙箱已实证官方 6 表可建表并可完成 CRUD 全流程（记录不入库）。

## 6. 测试改写策略

**fixture 范式**（spike X6 实证）

| 范式 | 用法 | 替代对象 |
|------|------|---------|
| A（主） | `auth.api.signUpEmail({ body, asResponse: true })` → 取 `Set-Cookie` → 测试内 `headers: { cookie }` | **15 个测试文件 / 20 处** `sessions.createSession(...)` |
| B | 需按档位断言时：直接改 `user.role`/`status` 后复用同一 cookie | 角色 fixture |
| C | 令牌类断言走服务端直呼（不传 headers） | `api_token` 直接入库造数据 |

**断言口径（不放宽）**

- 测试是上游契约：响应形状变化**逐条核对** §8 变更表；未列入变更表的字段差异一律视为实现缺陷。
- 错误码映射须覆盖全部既有码（含设备流 `authorization_pending` / `slow_down` 与 P7 的「权限不足 vs key 不存在」区分），且**保留既有语义**（登录类统一 401 防枚举等）。
- 覆盖口径（**v0.8/plan 重定，v1.9 同步**）：批前基线 **475 例**；T3 删除 4 个被替代测试文件（≈40 例，断言落点逐条登记）⇒ 本批目标 = **≥500 例且 0 fail**，且下列六类新增测试面**逐类可点名**。（实测轨迹：T3 后 466 例 → T4 后 **480 例**，含 `auth/api-keys.test.ts` 新增 15 例。）
- 迁移规则已在沙箱端到端跑通（X7：SQL 公式写回后**原明文仍可被官方验证**，错明文被拒）⇒ 迁移脚本按同公式落地，落地后以「原明文可访问 / 错明文 401」作对账断言。
- 新增测试面：① 目录插件（真 ldapjs server，网络层真实 bind——沿用仓内既有做法）② 会话落库 + 进程重启存活 ③ origin 校验（无 Origin / 跨源 / 白名单命中 三态）④ 令牌权限码逐项（含超范围与提权被拦）⑤ `ROLE_LEVEL` 键集合 ↔ `ac.roles` 键集合一致性 ⑥ 迁移断言（原密码登录 · 原明文 token 可用 · 状态/档位映射）。

## 7. 分阶段实施（边界与验收口径；Task 清单归 plan）

| 阶段 | 范围 | 出口口径 |
|------|------|---------|
| S1 骨架与数据层 | 装依赖 · `db/schema/auth.ts`（官方 CLI `generate --adapter drizzle --dialect pg` 产物并入）· 迁移 `0008`（**纯结构**，走我们既有 drizzle-kit 流程入库）· `better-auth.ts` 实例 · `roles.ts` · env 新增项（`auth secret` / `info` 可作辅助校验） | 冷库 `0000→0008` 按序迁移成功 · 6 表结构与约束实测齐 · **旧 4 表与既有测试零变化**（本阶段搬迁尚未发生）· 门禁绿 |
| S2 目录凭证插件 | 插件三路分派 · `ldap.ts` 取 mail · 错误码映射 · bootstrap 种子改道 | X1 同级负例全绿（错密码 401 · 目录禁用 401 · 缺字段 400 · 邮箱缺失拒 · 邮箱冲突拒）· 原密码登录通（R10） |
| S3 业务面切流 | 目录插件 + `0009` 用户域搬迁（**与切流同批**）· `0010` 13 条 FK 重指向 + 删旧 3 表（**同批**）· `rbac.ts`/`auth-middleware`/`token-middleware`（用户查询面）改造 · 删 `csrf.ts`/`session.ts`；令牌面 `tokens.ts` + **`0011` 搬迁**随其后同批（T4） | 生产 57 处调用面**零改动**编译通过 · 授权断言（超管全放 · user 档精确 DENY/ALLOW）· 令牌三端点形状不变 · 令牌全流程（签发/列表/吊销/超范围 403） |
| S4 设备流与 CLI 契约 | 官方四端点契约 · `bearer` 插件 · CLI 契约定档（实现归 M5） | 两段式闭环 + 未认领 approve 400 + 轮询 `authorization_pending`/`slow_down` + Bearer 可达业务端点 · 旧 device 契约残留 grep = 0 |
| S5 清理与规范同步 | 删旧表（**T3 `0010` 已删用户域 3 表；T4 `0011` 已删 `api_token`**）· 删死代码（`db/schema/users.ts` 已随 T4 删除）· 05/08 原地改写 · `docs/00` §5 回写 | 死代码 grep = 0（旧符号：`InMemorySessionStore`/`csrfProtection`/`DevicePendingStore`/`sessions.createSession`）· 文档-代码对齐（数字实测）· 五门禁绿 |
| S6 收尾 | converge（8 维重评）+ **整体审计**（十一维全仓扫描） | 批间门五件全闭合 · findings 逐条登记无未决 |

## 8. 接口变更总览

**保持不变的（外契约，R14）**

| 端点 | 形状 | 说明 |
|------|------|------|
| `GET /api/auth/me` | `{ user: { id, displayName }, role }`（`role` 仍为数值 4 档） | 前端与既有断言零改动；服务端内部取官方会话 + `ROLE_LEVEL` 映射 |
| `POST /api/tokens` · `GET /api/tokens` · `DELETE /api/tokens/:id` | 原形状（含 `token` 明文一次性返回、`expiresAt`、`revokedAt`） | 内部改官方 api-key（服务端直呼） |
| 业务面全部端点 | 不变 | 鉴权实现替换，语义不变 |

**变更的**

| 能力 | 现状 | 迁移后 | 变更性质 |
|------|------|--------|---------|
| 登录 | `POST /api/auth/login` `{username,password}` → `{user:{id,displayName}}` | `POST /api/auth/sign-in/aih`（同入参语义）→ 官方会话响应 | 路径 + 响应体变更（前端属 M4b-2 未动工 ⇒ 零既有消费方）；**会话读取统一走 `/api/auth/me`**（形状不变） |
| 登出 | `POST /api/auth/logout` → 204 | `POST /api/auth/sign-out` → 官方响应 | 路径变更 |
| 注册 | `POST /api/auth/register` `{username,password,displayName?,email?}` | 官方 `sign-up/email`（开关 ← `REGISTRATION_ENABLED` → 官方 `disableSignUp`） | 路径 + 入参变更（官方以 email 为标识；无前端消费方） |
| 设备授权请求 | `POST /api/auth/device` → `{deviceCode,userCode,verificationUri,expiresIn,interval}`（**201**） | `POST /api/auth/device/code` `{client_id}`（**必填**）→ `{device_code,user_code,verification_uri,verification_uri_complete,expires_in,interval}`（**200**） | 契约变更（路径/字段名/状态码/新增 `verification_uri_complete`；`client_id` 为官方强制字段，无消费方依赖） |
| 设备批准 | `POST /api/auth/device/approve {userCode}` 单步 | **`GET /api/auth/device?user_code=` 认领** + `POST /api/auth/device/approve {userCode}` | **两段式**（官方要求；未认领直接 approve → 400 `invalid_request`，含 `DEVICE_CODE_NOT_CLAIMED` 文案） |
| 设备拒绝 | 无 | `POST /api/auth/device/deny {userCode}` → `{success:true}` | **新增端点**（官方能力；审计 `device.deny`） |
| 设备轮询 | `POST /api/auth/device/token {deviceCode}` → `{accessToken,tokenType,expiresIn}` | `POST /api/auth/device/token` `{grant_type:'urn:ietf:params:oauth:grant-type:device_code', device_code, client_id}`（**三字段均必填**）→ `{access_token,token_type:'Bearer',expires_in,scope}` | 字段名 + 请求形态（RFC 8628 标准）；错误 = **400** + OAuth 体 `{error, error_description}`：`authorization_pending`/`slow_down`/`expired_token`/`access_denied`/`invalid_grant`/`invalid_request`（旧契约 `{code,message}` + 401/404 形态不再有） |
| 设备 token 形态 | 我方 API Token（`scope='cli'`） | **官方会话 token**（Bearer；由 `bearer` 插件还原为会话） | 凭证形态变更（全量语义与现状 `'cli'` 一致；会话有效期 = `SESSION_TTL_HOURS` 8h，旧实现设备令牌 1h，见下） |
| 设备码/令牌时效 | 设备码 TTL **10 分钟** · 轮询下限 5s · 令牌 1 小时 | 设备码 TTL **30 分钟**（官方默认，显式钉定）· 轮询下限 5s · 令牌 = 会话 8h | 时效变更（设备码窗口变宽、令牌变长；均为官方配置项，M5 CLI 契约以本节为准） |
| 认领页地址 | `${PUBLIC_BASE_URL}/api/auth/device/verify`（自研路径） | `${baseURL}/device`（官方 `verificationUri` 缺省值 ⇒ 由 `PUBLIC_BASE_URL` 推导） | 路径变更；**页面本体归 M4b-2**（本批只定契约） |
| CSRF | 自研 Origin/Referer 链 | 官方 origin 校验 + `trustedOrigins` | 实现替换 + dev 白名单机制 |
| 令牌 `id` 形态 | `api_token.id`（自增整数） | 官方 `apikey.id`（**文本主键**：迁移行为原数字串，新签发为随机串） | 类型变更（删除端点 `:id` 校验放宽为通用 id 形态；无前端消费方） |
| 令牌 `scope` 回显 | `''` 或 `'cli'` 各自原样 | 迁移后同为 `permissions NULL` ⇒ 列表统一回 `''` | 取值归一（语义等价：均表示全量） |
| 过期令牌在列表中的去留 | 过期行保留（仅 `expiresAt` 过期） | **官方校验遇到过期即删除该行** ⇒ 过期令牌不再出现在列表 | 官方行为（`KEY_EXPIRED` 清行）；吊销行仍保留（`enabled=false`） |
| 审计 `target_type` | `api_token` | `api_key`（表已换） | 枚举值更新（`token.issue`/`token.revoke`/`device.token_issued` 动作名不变） |
| OIDC | `GET /api/auth/oidc/authorize` · `/callback` | **不变**（R11：编排保留，仅会话签发接官方） | 无 |

## 9. UI-UX 变动总览

视觉基线**不变**（`M4a design §4.4` = 全站视觉真值 SSOT，本批不动样式层）；本批只定交互契约，UI 落地在 M4b-2：

| 面 | 交互契约 |
|----|---------|
| 登录页 | 单表单（标识 + 密码）→ `POST /api/auth/sign-in/aih`；错误码按 `07 §4` 映射文案（`auth.email_missing` / `auth.email_conflict` 为新增码，需在 i18n 资源登记） |
| 设备授权页（**契约归本批，页面归 M4b-2**） | 两段式：URL 带 `user_code` → 先 `GET /api/auth/device?user_code=` 认领（未登录 → 先登录再回跳）→ 展示确认页（客户端/范围/有效期）→ `POST /api/auth/device/approve`（拒绝走 `/deny`）；码错误/过期给出重取路径。地址由官方 `verification_uri` 给出 = `${PUBLIC_BASE_URL}/device`（**前端需提供该路由**，T5 起契约即此值；错误体为 OAuth 风格 `{error,error_description}`，前端需映射文案） |
| 401 分流 | 不变（M4b-2 契约） |
| 用户菜单 / 角色感知 | 不变（消费 `GET /api/auth/me` 形状不变） |

## 10. 影响声明与风险

| # | 影响 / 风险 | 处置 |
|---|------------|------|
| I1 | **迁移即全员登出一次**（会话原为进程内内存，无持久化形态可迁） | 固定影响，公告式记录；此后重启不再登出（缺陷一并修掉） |
| I2 | 本地凭证的行级失败锁定列（`failed_attempts`/`locked_until`）**不迁**，防爆破交官方限流语义 | 记入声明；若官方限流粒度不足（按 IP 而非按账号），S2 补一层我方账号级限流（出口断言覆盖） |
| I3 | bootstrap 账号**合成邮箱**（唯一合成点） | 显式登记（R13）；`SEED_ADMIN_EMAIL` 可覆盖 |
| I4 | 新增第三方依赖（better-auth · MIT） | Clean Room 满足：**只调公开 API + 自写插件，不复制其源码进仓**；插件实现须原创（同 M1 design §9 对自研件的标注纪律） |
| R1 | 官方版本演进（1.7.x → 未来大版本） | 锁 `^1.7.5`；跨大版本升级走独立设计评审 |
| R2 | `user` 是 PG 保留字 | 手写 SQL / 运维脚本须引号（drizzle 自动处理）；记入 runbook 待办 |
| R3 | 官方 CLI 生成 schema 的鸡生蛋（P3） | 生成期用独立配置；生成产物并入 `db/schema/auth.ts` 后评审 diff |
| R4 | OIDC 通道无可实测 IdP（`OIDC_ENABLED=false`） | 本批对该通道只做「会话签发接缝」最小改动；勾选式验收（R11 可翻转） |
| R5 | 目录插件是本批最大自绘面（150–200 行） | 官方零支持已交底（§1.4）；插件只消费官方文档化扩展点，不改官方核心 |
| R6 | 设备流契约变更 | 无既有消费方（CLI 2 行占位）；M5 按新契约实现 |
| R7 | 迁移期**不做双写** | 明确不做：双写会让两套真值并存，与「一事一提交 / 前向迁移」纪律冲突。过渡形态 = `0008` 后新表**存在但零消费**（`session`/`verification`/`device_code` 除外——它们无旧表对应，是纯增量）；`0009`/`0010` 各自与对应消费面的切流**同批**执行，切完即该域单真值源；`0011` 收口删旧表（含备份动作） |
| R8 | 既有下载/上传限流与官方限流并存 | 职责切分：官方限流只覆盖 `/api/auth/*`；业务面限流保留（`rate-limit.ts` 不动） |

## 11. 引用文件清单

**本仓（现状，实扫）**：`apps/server/src/auth/`（`auth-service.ts` `csrf.ts` `device-store.ts` `errors.ts` `ldap.ts` `oidc.ts` `password.ts` `provision.ts` `rate-limit.ts` `rbac.ts` `routes.ts` `session-middleware.ts` `session.ts` `token-scopes.ts` `tokens.ts` `users.ts`）· `apps/server/src/http/`（`auth-middleware.ts` `token-middleware.ts` `tokens.ts` `device-routes.ts` `oidc-routes.ts` `request-context.ts`）· `apps/server/src/db/schema/users.ts` · `apps/server/src/config/env.ts` · `apps/server/src/app.ts` · `apps/server/src/db/seed.ts` · `apps/server/drizzle/0000..0007` · `apps/cli/src/index.ts`（占位）

**外部依据**：官方发行版 `better-auth@1.7.5`（MIT）及其文档站页面（introduction / installation / basic-usage / security / plugins / hooks / hono / device / cli / database / adapter / api-key reference / email-password / client / options / username / session / cookies）；官方包内源码（`@better-auth/api-key` 默认 hasher · `internal-adapter.findUserByEmail` 返回形状 · device authorization 端点）；沙箱实测记录（X1-X8 + 8 条坑；**仓外，不入库**）

## 12. 规范同步项

| 规范 | 章节 | 同步内容 |
|------|------|---------|
| `05 用户与权限` | §3 认证架构（五层） | 层次与职责不变；**实现载体**改写（Layer 1/4 由官方整车承载，标注哪些是官方件、哪些是自绘插件） |
| | §3.1 LDAP/AD 认证 | 流程五条保留；补「登录入口分派（保留账号逃生 → 目录 → 回退）」与「邮箱取值规则（缺则拒，取不到即拒）」 |
| | §4.1 账号状态机 | 三态语义不变；补「状态为唯一真值列，不使用官方封禁列」的边界 |
| | §5 会话与凭证 | 表更新：Web 会话（8h，落库，cookie 由官方签发）· CLI（官方设备流两段式）· API Token（官方 api-key 语义 + 权限码）；补 origin 白名单配置项 `AUTH_TRUSTED_ORIGINS`（dev 用，生产留空） |
| | §6.1 平台角色（4 档） | 档位序不变；补「库中存档名文本，数值序由映射单点提供」 |
| `08 数据模型` | §3 用户域 | 表清单换为 6 张官方模型表（`user`/`session`/`account`/`verification`/`device_code`/`apikey`）+ 列语义；状态与档位列说明 |
| | §8 关键约束汇总 | 用户域唯一约束（email / username / token key）与 FK 引用表 |
| | Status | 运行库表数 **12 → 14**（实测后回写） |
| `00 产品定位` | §5 追踪表 | M4b-pre 行状态回写（评估中 → 完成）+ M4c/M5 范围注记同步 |

## 13. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-15 | sunxuewen-rush | 初稿：spike 结论（X1-X6 全通过 + 8 条坑）转入选型定稿；**17 项拍板**（R1-R17；其中 R1/R2/R14 已确认，其余待批）（实扫量化：认证核心 16 文件/1492 行 · HTTP 面 6 文件/669 行 · 测试 16 文件/2471 行 · `createSession` 触点 15 测试文件/20 处 + 生产 3 处 · 调用面 57 处 · 运行库 12 表 · 13 条 FK）|
| v2.2 | 2026-09-15 | sunxuewen-rush | **T7 落地回写（清理 + 规范层同步）**：① §4.1 改造表补 `auth/errors.ts` 行（删 8 个已死错误码：自研注册 4 / 行级锁定 1 / 设备流 3 —— 各自的上游下线时点与替代面在行内点名）② **规范层同步状态登记**：`05` → **v1.9**（本批实测形态：会话落库 8h 绝对过期 · 设备流官方两段式 · 令牌 api-key + scope 码表 · 状态机落库口径 · 五层图身份映射层）· `08` → **v1.6**（用户域整节重写 = 官方六表 + 搬迁规则四条 + 约束表官方 6 行 + 表数 12→14）· `00` → **v1.32** · 主 design → **v1.13** ③ 全仓四类扫描（旧表名/旧模块符号/旧契约字段/已删错误码）**真腐化 7 处修复**，其余命中判定为合法留痕（口径同 T3）④ 文档 8 维自检 **9.5** |
| v2.1 | 2026-09-15 | sunxuewen-rush | **T6 测试收口 + 一处事实订正**：① **P16/§5.3 口径订正**——单层 `jsonb_object_agg` 的失效形态**不是报 duplicate key，而是静默只留最后一项**（实测 `asset:publish,asset:manage` → `{"asset":"manage"}`，publish 被丢弃且不报错）⇒ 属静默改权，两层聚合为**必要**而非「顺便」（原表述 v1.9/v2.0 已就地订正，v1.9 行加注）② §6 覆盖口径落地实测：T6 后 **501 例 0 fail**（新增 `auth/session-lifecycle.test.ts` 12 例 · `db/migration-rules.test.ts` 11 例 · 设备流 +4 · 令牌 +3）③ §6 六类新增测试面**逐类点名到文件**（见 plan T6 记录）④ §8「变更」表逐行 ↔ 用例对照表落 plan |
| v2.0 | 2026-09-15 | sunxuewen-rush | **T5 落地回写（设备流整体交官方）**：① §8 设备面**全量重写**为实测契约（`client_id` 必填 · token 三字段含 `grant_type` 字面量 · 一律 400 + OAuth 体 `{error,error_description}` · 新增 `/device/deny` 与 `verification_uri_complete` · 设备码 TTL 10m→30m · 令牌 = 会话 8h · `verification_uri` = `${baseURL}/device`）② §4.1 删除表补 `http/device-routes.ts` + `auth/device-store.ts`；`app.ts` 行补「官方 handler 包装层补审计 + `publicBaseUrl` 下线」③ §2.3 增 **P19-P20**（强制字段与两种错误体 · 设备令牌=会话 token 且官方 bearer 插件不拒无效 Bearer ⇒ 必须剥 cookie 防降级）④ §9 设备授权页行明确「契约归本批、页面归 M4b-2」+ 前端需提供 `/device` 路由与 OAuth 错误文案映射 |
| v1.9 | 2026-09-15 | sunxuewen-rush | **T4 落地回写（令牌面切流）**：① §5.3 **列型订正**——官方 `apikey.permissions` 是 **`text`**（`JSON.stringify`）而非 jsonb；迁移需**两层聚合**（单层 `jsonb_object_agg` 同 resource 多 action 会 duplicate key——**v2.1 订正：实为静默丢 action**）；补 `rate_limit_time_window`/`max` 官方默认值、时间列 naive-UTC 归一、`id` 文本主键说明 ② §5.1/§5.4/§7 的 `0010`/`0011` 归属**全量订正**（0010 = FK 重指向 + 删用户域 3 表；0011 = 令牌搬迁 + 删 `api_token`）③ §2.3 增 **P15-P18**（`keyExpiration` 边界按天：min 默认 1 天会拒设备流 1h 令牌、max 默认 365 天会拒既有 3650 天契约 · permissions 为 text + 两层聚合 · 官方校验遇过期即删行 · server-only 判定 = `ctx.request \|\| ctx.headers`）④ §4.1 三表补 `auth/api-keys.ts`（新增）/`token-middleware`·`tokens`·`auth/tokens.ts`（改造）/`db/schema/users.ts`（删除）⑤ §6 覆盖口径重定（≥500 例；实测 T4 后 **480 例** 0 fail）⑥ §8 变更表补令牌面 4 行（`id` 文本主键 · `scope` 归一 · 过期行去留 · 审计 `target_type`） |
| v1.8 | 2026-09-15 | sunxuewen-rush | **T3 收尾补丁回写（用户 2026-09-15 批准）**：① 新增 **R9a 业务面同源守卫**（`http/origin-guard.ts`：官方 `$context.isTrustedOrigin` 判定，不重写比较逻辑；出口 `auth.csrf_failed`）+ §4.1 新增/改造/删除三表同步（`app.ts` 装配序、`csrf.ts` 删除理由订正为「按 `Host` 比对是 A1 根因」）② §2.3 增 **P14**（官方上下文方法读 `this`，不可解构——首跑 500 实证）③ **§5.1 时序原则按 v1.7 口径订正**（`0009` 用户域搬迁 · **`0010` FK 重指向 + 删旧 3 表（随认证面切流）** · `0011` 令牌面收口）+ 表内 `user_account`/`api_token` 两行同步 ④ §12 `AUTH_TRUSTED_ORIGINS` 说明补「认证面与业务面共用同一白名单」 |
| v1.7 | 2026-09-15 | sunxuewen-rush | **T3 落地回写（认证面整体切换）**：① §2.3 补 **P9-P13**（T3 实施期实测坑：官方 test 环境默认跳过 Origin 校验 · `ctx.json` 不设状态码 · 全局 origin 校验仅带 cookie 时生效 · 官方 `hooks.after` 在 sign-out 取不到会话 · drizzle-kit 迁移定序陷阱）② **§5.1 时序再收紧**：13 条外键的**重指向**由收口批提前到**切流批**（`0010`）——硬约束：新账号只写官方 `user`，业务表若仍引用 `user_account`，新用户的资产/审计写入会被外键直接拒绝（单真值源不允许两批之间悬空）③ 依赖透传位补充：`AuthRuntimeDeps.advanced`（测试断言 Origin 三态用）；口令哈希函数体随 §4.1 迁入 `better-auth.ts`（`password.ts` 已删）④ 覆盖口径：删除 4 个被替代测试文件（`csrf`/`session`/`users`/`provision`），当前 **465 例**（464 pass · 1 skip · 0 fail），缺口与新增测试面（令牌权限码 · 迁移对账 · 无 Origin 三态已补）由 T6 收口对齐 design §6 |
| v1.6 | 2026-09-15 | sunxuewen-rush | **迁移时序与 Task 边界重划（用户 2026-09-15 批准方案 A）**：① §5.1 表级映射改「建表/搬迁分离 + 迁移时序原则」——`0008` 建 6 表（零数据）· `0009` 用户域搬迁 · `0010` 令牌搬迁 · `0011` FK 重指向 + 删旧表；搬迁一律**与消费面切流同批**（防冻结快照，单真值源）② §5.3 权限码转换迁移文件 `0008` → **`0010`** · §5.4 回滚边界按四步改写 · §7 S1/S3/S5 范围与出口同步 · §10 R7 补「过渡期零消费」口径 ③ 重划依据（实测，2026-09-15）：旧表消费面 **113 处 / 12 文件**（`user_account` 52/10 含 13 条 FK 定义 · `identity_binding` 8/2 · `local_credential` 26/4 · `api_token` 27/4）⇒ `RENAME` 会让 7 个生产文件当轮编译失败；且认证链（会话↔档位↔令牌）分批切流必产生不可运行中间态 ④ 方案对照：保持原边界（接受中间态不可运行）与被否决的「官方 adapter 表名映射套用既有表」（推翻已批准 R3 + 永久映射层）均已评估 ⑤ plan 同步升 **v0.5** |
| v1.5 | 2026-09-15 | sunxuewen-rush | **T1 提交前补丁（用户拍板）**：R16 由「`better-auth@^1.7.5` + 插件精确」改为**两包均精确钉定**（`better-auth@1.7.5` + `@better-auth/api-key@1.7.5`）——依据 = lockfile 实测插件 `peerDependencies` 要求 `better-auth: ^1.7.5` / `@better-auth/core: ^1.7.5` / `better-call: 1.4.0`，内核用 caret 时 `bun update` 会造成内核/插件错配；对标公开参考项目（其 better-auth 系列 5 包全精确）。同轮：`docs/00` §5 M6 行补登记 `SECURITY.md` + `CODE_OF_CONDUCT.md`（升 **v1.31**）|
| v1.4 | 2026-09-15 | sunxuewen-rush | **T1 落地修正（依赖数与实例类型注记）**：① **R16 修正**「新增 1 个包」→ **2 个包**（`better-auth` + `@better-auth/api-key` 同版本）——实测 better-auth 1.7.5 不导出 `apiKey`（`exports` 无 `./plugins/api-key`、`plugins` 面不含、`@better-auth/*` 未提升）② **类型注记**：`declaration: true` 下实例/选项推断类型不可命名（TS2742/TS7056；选项注解为官方 `BetterAuthOptions` 亦不成立——`Auth<BetterAuthOptions>` 与实例 `$context` 逆变不相容）⇒ 定案 `AihAuth = Auth` + 构造处单次断言，**插件端点（api-key）调用点局部窄化**（T5；与 P6/P7「服务端直呼」一致）③ **P4 仓内复现**：官方在首次 API 调用即做 schema check ⇒ `getSession` 断言归 T2（此前仅沙箱证据）|
| v1.3 | 2026-09-15 | sunxuewen-rush | **自检换靶轮（提交前）**——靶 = 数字可验证性 + 跨文档一致 + 指针时效性；**回修 2 类数字错 + 1 类时效指针 + 1 处流程缺口**，均来自「上一轮未穷尽核验」：① **测试文件数错**：认证面测试「14 文件」→ **16 文件**（`auth/**` **10** 文件 1051 行——上轮漏计 `ldap.test.ts` 179 行；+ `http/**` 6 文件 1420 行；**行数 2471 不变**）② **fixture 触点口径错**：「18 源文件 / 24 处」→ **15 个测试文件 / 20 处**（原 24 处含生产调用 3 处与定义 1 处，不属 fixture 改写面）③ **时效指针**：正文硬写仓外临时目录路径 → 改「仓外临时环境」（committed 文档不该指向会被清理的路径）④ **流程缺口补齐**：M4b-pre 立项后须同步 `docs/00` §5 追踪表（状态唯一源）+ 主 design §2.3 批件登记表（主↔批唯一源）⇒ 本轮同步升 `docs/00` **v1.30** · 主 design **v1.12**⑤ **逐维**：简洁 9.5 · 极致 9.5 · 正确 9.5 · 一致 9.5 · 安全 9.0 · 前瞻 9.5 · 直白易懂 9.5 · 好维护 9.5 ⇒ **均值 9.44**（⚠ v1.2 的 9.38 → 9.44 的提高**因补齐验证缺口与立项登记，非产物变好**；上一轮「正确 9.5」含未穷尽核验——本轮回测出 2 处数字错，如实登记）|
| v1.2 | 2026-09-15 | sunxuewen-rush | **整体批准 + 批准后实测修正（X8）**：① Status 定稿（用户 2026-09-15 整体批准）· §2.1 待批表 14 项全部生效 ② **R13 邮箱值修正** `admin@local` → **`admin@local.test`**（官方 CLI 实测拒前者：`Invalid email address.`；`.test` = RFC 6761 保留 TLD，语义即「不可投递」）③ **seed 落地姿势定案**：官方 `create-admin` **非幂等**（二次执行报错 + `--force` 不覆盖）⇒ 不入选种子链路，seed 走自建幂等路径（服务端直呼官方 API）；`create-admin` 定位为一次性运维工具 ④ §2.3 增 **X8**（官方 CLI 能力实测：落点/自定义档名/`--data` 额外字段/邮箱校验/幂等行为）⑤ §7 S1 落地姿势按官方 CLI 写明（`generate` 产物并入 + 走我们 drizzle-kit 入库纪律）|
| v1.1 | 2026-09-15 | sunxuewen-rush | **8 维自检修订轮**（v1.0 初稿 → 逐维复核 → 回修 6 类缺陷 + 补 1 项实证），自评 **9.25 → 9.38**：① **数字订正**：生产调用面口径（`requireRole()` 3 → **1** · `ACCOUNT_ROLE.` 33/7 文件 → **32/10 文件**，合计 57 处不变）· HTTP 面处置（保留 1 → **2**）· 净变化估算（新增 500–620 → **500–590**；净减 ~470–590 → **498–588**）· §1.1 写路由口径改实测（**24** 写路由 / **14** 处解析 JSON 体）② **文件清单补漏 5 项**（`db/schema/users.ts` · `db/schema/index.ts` · `auth/token-scopes.ts` · `auth/tokens.ts` · `http/oidc-routes.ts`）并新增「**保持不变**」节（6 项零改动件逐条登记）；删「登出兼容别名（若批准保留）」待定措辞 → **定案不做别名**（官方 `sign-out` 唯一）③ **新增 X7 实证**（存量令牌迁移规则端到端：官方签发 key → 取旧库 hex 形态 → 用 §5.3 的 SQL 公式写回 `apikey.key` → **原明文 `verifyApiKey` = valid**，错明文被拒——把 §5.3 由「推理」升为「实证」）+ §5.3 补 `config_id`/`reference_id`/`enabled`/`rate_limit_enabled`/`start`/`prefix` 六列与权限码 JSON 的 SQL 转换方式 ④ §2.2 补 cookie 实测属性（`better-auth.session_token` · HttpOnly · SameSite=Lax） ⑤ §8 补登录/注册的响应体与入参差异 · §10 补 **I4 依赖清洁室声明** ⑥ §12 配置归属订正（`AUTH_TRUSTED_ORIGINS` 由 `§3.1` 改挂 `§5`）。**逐维**：简洁 9.5 · 极致 9.0 · 正确 9.5 · 一致 9.5 · 安全 9.0 · 前瞻 9.5 · 直白易懂 9.5 · 好维护 9.5 ⇒ **均值 9.38**（扣分项：极致——S1 出口未列逐表对账清单；安全——cookie `secure` 由官方 `baseURL` 推导、生产 HTTPS 场景未实测；正确——`permissions` 的 `jsonb_object_agg` 转换未在 PG 实跑，已标注为实现期断言）|
