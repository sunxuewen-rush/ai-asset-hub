# M4c 账号与权限治理设计（主 design）

> Date: 2026-10-08
> Updated: 2026-10-09（**v0.24：M4c-1 批完成（T1–T8 ✅）回填** —— ① dogfood 7 脚本 **494 PASS / 0 FAIL**（**F293**：`m4b4`/`m4b5` 顺序依赖 ⇒ 跑前重播种子）② 门禁 11 步 EXIT=0 · 全量 **644 pass / 1 skip / 0 fail** ③ §15 等价判据三层实测通过（签名逐字同 · 21 调用点 · `signInAih` grep=0）④ 规范回填 `05` **v1.13** / `08` **v1.11** / `07` **v1.12** ⑤ 证据 `docs/smoke/2026-10-09-m4c1.md` · F 号至 **F293** · 批收口自检 **9.52**）
> Updated: 2026-10-09（**v0.23：M4c-1 T7 落地回填 + §4.6 归属口径订正（F291）** —— ① §4.6 错误码收敛表补**归属注**：本表为**终态**，M4c-1 落 4 枚、另 3 枚归 M4c-3（`email_conflict` / `oidc_state_mismatch` / `oidc_denied`；生产点在保留件 `oidc-routes.ts` / `identity.ts`）② 已封禁 = 官方 `BANNED_USER` + 中文 `bannedUserMessage`（状态门 `statusError` 落地）③ 自助注册默认 `false`（R3 落地））
> Status: **定稿**（**主 design（跨批不变层）** —— 保留里程碑范围 / 认证与身份源契约 / 权限与账号契约 / 路由清单 / 视觉基线归属 / 拆批表 §2.3 / 决策登记 §2.1+§2.6 / 接口变更总览 §8；批内决策另立**批 design**，实现细则落各批 plan）。
> **定稿条件（三项已全闭合）**：① **文档 8 维自检 ≥9** —— **9.4**（标准 4 维 9.50 · 深度 4 维 9.38；轨迹 9.50窄口径撤回 → 9.06 → 9.44 → 9.44补章）✅ ② **决策登记闭环** —— §2.1 **D1–D14** + §2.6 **R1–R22**（grilling 4 轮 + 完整性体检 1 轮）全部已确认 ✅ ③ **整体检查零未决项** —— 读全文 + 量化声明实测 + 引用件真实性 + 决策跨节一致性 四靶（5 项缺陷已修 · 26 处补章）✅ ⇒ **2026-10-08 用户批准转定稿**。
> 视觉归属：**随批就地定稿**（引 M4a §4.4 · 2026-09-28 拍板 · 2026-10-08 复核维持）。本文为**纯设计语言**（意图与契约）。
> Scope: M4c（`00` §5）—— **账号与权限治理：管「人」不管「资产」**。含认证层统一到官方 + 用户管理面 + 外部身份源接入；**不含**资产面任何功能。
> 引用链：本文档 → 规范 `00` §5/§7 · `05` §3/§4/§6 · `07` §3 · `08` §5（**引用不复制**，字段与规则以规范为准）。
> 关联：`2026-09-10-m4b-admin-console-and-auth-design.md`（**视觉收口层边界**：M4c 新增页随本批就地定稿 · 见其 §2.3 编排说明）· `2026-09-09-m4a-marketplace-portal-design.md` §4.4（**全站视觉真值 SSOT**）。

## 1. 背景与文档定位

M4b 管理后台八批（M4b-1…M4b-8）已于 2026-09-30 收口（出口五件全绿 · 兼跑完整 converge，11 份 design 8 维重评全 ≥9）。
`00` §5 中 M4c「账号与权限治理」原列四件事：用户管理（列表 / 改角色 / 启用·禁用 / 管理员建号）· 准入策略 `ACCESS_POLICY`（PENDING → 审批）· 重置密码 · 强制登出（Session 按用户吊销）。

M4b-pre 已把认证整车迁到 **better-auth**（官方件）并把 4 档角色用官方 admin 插件表达 ⇒ 上面四件事里的**大半由官方件承担**；本批据此重估范围（§2.1）。

**本文档定位**：M4c 的**主 design（跨批不变层）**——保留里程碑范围 / 认证与身份源契约 / 权限与账号契约 / 路由清单 / 视觉基线归属 / 拆批表 §2.3 / 决策登记 §2.4 / 接口变更总览 §8。**批内决策另立批 design**（命名与迁移规则见 `docs/designs/README.md`）。

## 2. 里程碑范围（拍板表）

### 2.1 拍板结果（14 条 · 2026-10-08 逐条对齐产物，全部已确认）

| # | 决策 | 依据 / 锚点 |
|---|------|------------|
| D1 | **范围档 = A+ 加强制登出**：用户列表 · 改角色 · 启用/禁用 · 管理员建号 + 按用户吊销 Session | 官方 admin 插件已提供大部分能力；`00` §5 M4c 行 |
| D2 | **不含重置密码**（密码归企业目录） | 同上；`05` §3.1 —— **本轮补**：**本地账号自助改密纳入**（§2.6 R21 · §4.8）⇒ D2 仅指**管理员重置** |
| D3 | **账号启停 = 官方封禁三件套**（`banned` / `banReason` / `banExpires`）；我方 `status` 列**退休** | 真值单一；白拿「封禁即吊销会话 + 到期自动解封」。**推翻 M4b-pre R5** |
| D4 | **PENDING 状态废除** | 官方无此概念；将来准入按官方范式「建号前拦 + 申请记录」 |
| D5 | `ACCESS_POLICY` 开关与四种枚举**保留但不实现**（未来收口旋钮）；**准入策略本批不做** | 口子留存，避免将来再动服务端契约 |
| D6 | **管理员建号保留**（并入 D1） | 产品需要（`00` §5） |
| D7 | **总方针：完全沿用 better-auth 官方做法** | 项目原则「能给官方的一律给官方；凡仍自绘的部分，理由必须写在文档里」 |
| D8 | **前端三层全用官方 SDK**（调用层 / 会话层 / 交互层）+ 基于 SDK 扩展 | 同上 |
| D9 | **拆三批**：M4c-1 / M4c-2 / M4c-3（不立 `M4c-pre`） | 依赖顺序 + 一件事一批 |
| D10 | **目录口令校验 = 官方 `password.verify` 分支**（不新增自绘登录端点） | 见 §3.2；关键约束见 §3.3 |
| D11 | **D10 随 M4c-1 落地**（认证层同批统一，前端登录只改一次） | 见 §2.3 编排说明 |
| D12 | **分层归属**：L1 目录协议 = 自写 · L2 登录端点 = 官方 · L3 会话/Cookie/CSRF/错误码 = 官方 | 官方对 LDAP 零支持 —— 实测：`@better-auth/core` 全目录 grep `ldap` = **0**，同法阳性对照 `wechat`=6 / `github`=18（**必须查 core 包且带阳性对照**；旧锚点「dist 250 个 `.mjs`」查法不严谨，已订正）⇒ 仅 L1 属"官方无此能力" |
| D13 | **身份源抽象 = 显式共享模块**，被官方钩子调用（非替代官方） | 见 §3.4 |
| D14 | **企业 IdP = Microsoft Entra ID**（云托管 Managed · 单租户 · 无外部联邦） | 域发现端点实测（M4c-3 按 OIDC 接入，不需要 SAML） |

### 2.2 M4c 边界

- **管「人」不管「资产」**：本批不新增/不改动任何资产面（发布 / 审核 / 生命周期 / 标签 / 审计浏览）功能。
- **服务端面**：以"委托官方 + 薄端点"为主；除启停列退休（1 次迁移）与凭证行补齐（1 次数据迁移）外，**不新增业务表**。
- **默认值契约变更**：`REGISTRATION_ENABLED` 默认由 `true` 改为 `false`（自助注册默认关闭，显式开启才允许，§2.6 R3）。
- **本轮补入的能力（完整性体检）**：**本地账号自助改密**（官方 `change-password` · §2.6 R21 · §4.8）——**不推翻 D2**（D2 仅指「管理员重置密码」）；列表「最后登录」取数改由薄端点聚合（§2.6 R22）。
- **视觉归属（2026-09-28 拍板，引 M4b §2.3 编排说明）**：M4c 新增页**随本批就地定稿** —— 引 M4a design §4.4（视觉 SSOT）+ 就地补录映射；**不设第二扇打磨窗口**。
- **UI 流程（铁律）**：新增页与登录页改造走「真读对标源码 → 方向板 + 截图 → 停下等拍板 → design 增量 → 自检 → 才动码」；本主 design 只定**交互契约与线框**，不定新视觉值。

### 2.3 子批拆批（2026-10-08 拆三批 · 逐批对齐与实现）

> 拆分维度 = **依赖顺序 + 可独立交付 + 服务端改动隔离**。每批走同构流程：
> 对齐（逐条过 UI 与契约）→ 该批 design 定稿（8 维 ≥9）→ 立 plan → 实现 + 自检 ≥9 → 门禁/冒烟 → 追踪表注记。

| 批 | 主题 | 范围要点 | 服务端改动 | 前置 |
|----|------|---------|-----------|------|
| **M4c-1** | **认证层统一到官方** | 前端三层改官方 SDK（调用层 / 会话层 / 交互层）+ 基于 SDK 扩展 · 档位适配（官方 role 文本 ↔ 本仓数值档）· 字段适配（官方 `name` ↔ 本仓 `displayName`）· 401 分流口径保留 · 后端：目录用户**凭据委派行** + 官方 `password.verify` 分支 + **不短路的首登建号钩子** + 身份源共享模块 + `accountId` 语义统一 · **退役自绘端点 `signInAih`** | **中**：1 次数据迁移（凭据行补齐 + `accountId` 归一）+ 认证配置面 + 1 处薄层退役 | — |
| **M4c-2** | **账号与权限治理** | 用户管理页 `/admin/users`（列表 / 筛选 / 分页 · 改角色 · 封禁·解封 · **强制登出** · 管理员建号 · **本地账号自助改密**（R21 · 用户区入口））+ 权限码表扩展 + 侧栏「管理」组条目 + i18n 新组 | **小**：启停列退休（1 次迁移）+ 权限码扩展 + 用户面薄端点（内部委托官方）+ 列表「最后登录」聚合（R22） | M4c-1 |
| **M4c-3** | **外部身份源接入** | 社交 provider（名单见 §2.6 R10）· **官方件替自绘 OIDC**（内置 Entra ID provider · 退役 `oidc-routes.ts` + `signInAihOidc`）· 账号链接策略统一（经 §3.4 共享模块）· 登录页 provider 入口 | **小–中**：认证配置面 + 1 处薄层退役 + （不采 SSO 插件 ⇒ 无自带模型迁移） | M4c-1 |

**编排说明**：

- 顺序即依赖链 **1 → 2 / 1 → 3**（M4c-1 是认证底座：M4c-2 的用户管理页依赖官方 SDK 的会话/权限显隐，M4c-3 的 provider 入口依赖官方 SDK 的登录调用层）⇒ **先 1 后 2/3 只写一次、零返工**。
- **文档形态**：**主 design**（本文件）保留范围 / 契约 / 路由 / 视觉归属；**每批另立 design + plan**
  （命名 `docs/designs/YYYY-MM-DD-m4c<n>-<主题>-design.md` / `docs/plans/M4c-<n>-<主题>.md`）。
- **出口口径**：见 §15「出口标准与批间门」（**出口五件全绿**）。
- **完整 converge** 放 M4c **全部子批收尾**（避免三次重评），与末批同批收口。
- **视觉职责边界**：引 M4b §2.3 编排说明（体系层 = M4a §4.4 · 页面视觉定稿层 = 各批就地补录 · 逐批落地层只做合规核对）——M4c 新增页**就地定稿**，不设第二扇打磨窗口。
- **`docs/00` §5**：M4c 行下加 **M4c-1 / M4c-2 / M4c-3** 子行（状态唯一源不变）。
- **批间门（gate）**：上一批**出口五件**全绿才启下一批；未达标不进入下一批。
- **批内内容迁移规则**：某批对齐时把该批专属内容从本文件**迁出到该批 design**，本文件留指针（不双写）。

**各批预期产出物与对齐要点（粗粒度 backlog —— 不预建空文件，到批才立）**

| 批 | 预期 design | 预期 plan | 对齐要点（立项时逐条过） |
|----|------------|----------|------------------------|
| M4c-1 | `2026-10-08-m4c1-auth-layer-unification-design.md`（**已立 · 定稿** · 8 维 **9.50** · **v0.12** · 批内对齐 B1–B10 全部确认 · 迁移 `0015` 幂等 SQL（语句 ⓪ 回填 `username = lower(account_id)` 以保全存量登录名 · F284）+ 执行窗口口径 + P1–P3 探针） | `M4c-1-auth-layer-unification.md`（**已立** · **v0.11** · T1–T8 · **执行中：T1 ✅ · T2 ✅ · T3 ✅ 2026-10-09**） | 官方 SDK 三层落点清单 · 档位/字段两处适配 · 401 四分类保留口径 · 凭据委派行数据契约 · `verify` 分支行为 · 建号钩子时序 · `accountId` 迁移脚本口径 · `signInAih` 退役的调用点切换顺序 · 时序侧信道 |
| M4c-2 | `2026-MM-DD-m4c2-account-governance-design.md` | `M4c-2-account-governance.md` | 用户管理页交互（§10.2 状态-动作表）· 列表筛选/分页契约 · 建号 Dialog 字段与校验 · 权限门槛分档 · 启停列退休改动面 · 自我操作护栏（不能封自己 / 不能降自己）· **自助改密 Dialog 与目录账号拒绝口径（R21）** · **最后登录聚合取数（R22）** |
| M4c-3 | `2026-MM-DD-m4c3-external-identity-design.md` | `M4c-3-external-identity.md` | 三个 provider（Google/GitHub/WeChat）开关范式 · 官方内置 Entra ID provider 接入（§2.6 R4）· 账号链接策略（§2.6 R1）· 占位邮箱口径（§2.6 R11）· 登录页 provider 入口交互 · provider 不可达降级 |

### 2.4 对齐决策登记

本批分三段登记：**① 立项对齐** = 逐条对齐 14 条拍板 + 1 条事实确认（§2.1 D1–D14）；**② grilling** = 4 轮 20 问（§2.6 R1–R20，含立项期板项 W1–W7 的收口）；**③ 完整性体检** = 1 轮 2 问（§2.6 R21–R22：本地账号密码生命周期 · 列表「最后登录」取数）。
两段均按「编号选项 + 一行推荐 + 一行代价 → 用户短答」推进；被否决的候选方案**不写入本文档**（只记拍板结果），沿革交 commit message。

### 2.5 立项期已核实事实（明细随各批 design 登记 F 号）

> 规则（`docs/designs/README.md`）：F 号全局连续 · 明细主家 = **批 design 的「实施期发现与处置（F…）」** 小节；
> 本表只作立项期收口清单，**不代替**批 design 明细。新号自**下一个可用号**起分配（现上界 **F290**），登记时同步 `docs/README.md` §6.1 号段行。

| 面 | 已核实事实（真码/实测锚点） | 待落批次 |
|----|--------------------------|---------|
| 权限码 | 权限码表缺 `session` 资源与 `set-password` ⇒ 官方 `list-user-sessions` / `revoke-user-sessions` 开箱 403 | M4c-2 |
| 认证门 | 官方认证面不读本仓 `status` 列（`apps/server/src/app.ts:148` 无状态门） | M4c-1 |
| 建号 | 官方 `create-user` body **无 `username` 字段**（`email` 必填且强制小写）；`password` **可选**（不传则该用户不建凭据行）；官方 username 插件**无 `set-username` 端点**（仅 `is-username-available` / `sign-in/username`，实测 `dist/plugins/username/index.mjs`） | M4c-2 |
| 列表 | 官方 `list-users` 异常吞错返空列表；`searchField` 需白名单 | M4c-2 |
| 规范 | `05` §4 缺「策略 → 准入结果」映射表 | M4c-2 |
| 文档 | `docs/plans/M4b-4-me-assets-and-console.md:395` 措辞不实 | 本批收尾 |
| 账号行 | 本仓凭据行 `accountId = 工号`（`apps/server/src/db/seed.ts:59`），官方口径 `accountId = user.id`（`dist/db/internal-adapter.mjs:652-668`）⇒ 官方 `sign-in/username` 对本仓既有种子账号返 401 | M4c-1 |
| 建号路径 | 目录建号走直写 drizzle（`apps/server/src/auth/plugins/ldap-credentials.ts:200-215`），绕过官方 `databaseHooks` / username 规范化 / 邮箱小写 | M4c-1 |
| 钩子时序 | 官方 before 钩子运行在**端点自身中间件之前** ⇒ 钩子内短路返回会**绕过**官方 Origin/CSRF 校验 | M4c-1 |
| 钩子限制 | 官方 after 钩子只能改写响应体与响应头，**改不了 HTTP 状态码**（`dist/api/dispatch.mjs` 失败路径） | M4c-1 |
| 上游位置 | **provider 实现不在 `better-auth/dist`，在 `@better-auth/core/dist/social-providers/`**（**36** 个 provider：目录 37 个 `.mjs` − 1 个聚合出口 `index.mjs`；含 google/github/gitlab/**wechat**/microsoft-entra-id）⇒ 查上游必须查 core 包且带阳性对照 | M4c-3 |
| 上游能力 | 官方 **36 个内置 provider**（`social-providers/` 目录 37 个 `.mjs`，其中 `index.mjs` 为聚合出口），WeChat 开箱可用（`wechat.mjs` 实测，端点 `open.weixin.qq.com/connect/qrconnect`） | M4c-3 |
| 无邮箱身份 | WeChat 无邮箱 ⇒ 官方合成 `<unionid或openid>@wechat.placeholder.invalid`（RFC 6761 保留域）且 `emailVerified:false` ⇒ **不触发自动链接**；官方留 `mapProfileToUser` 覆盖点 | M4c-1/M4c-3 |
| 封禁挂点 | 官方封禁判定 = `databaseHooks.session.create.before`：已过 `banExpires` ⇒ **自动解封**并放行；否则抛 `FORBIDDEN` + `code:'BANNED_USER'` + 可配 `bannedUserMessage` | M4c-2 |
| 封禁联动 | `ban-user` 会 `deleteUserSessions(userId)`；官方**已有** `YOU_CANNOT_BAN_YOURSELF` 与 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` 等码 | M4c-2 |
| 吊销返回 | `revoke-user-session(s)` 返回 **`{ success: true }`（不含数量）**；两者权限码均只需 `session:['revoke']`（`list` 仅在 `list-user-sessions` 用到） | M4c-2 |
| 注册默认 | `env.ts:35` `REGISTRATION_ENABLED` 默认 **true** + `better-auth.ts:80` `disableSignUp: !env.REGISTRATION_ENABLED` ⇒ 官方 sign-up 端点默认开放 | M4c-1 |
| 自助改密 | 官方 `/change-password`：POST body `{ currentPassword, newPassword, revokeOtherSessions? }` · 门槛 = `sensitiveSessionMiddleware`（**仅要求有效会话，无新鲜度要求** —— 实测 `dist/api/routes/session.mjs:304-311`）· 返回 `{ status: true }`（吊销其他会话时另返新 token） | M4c-2 |
| 审计单源 | 审计动作名单源 = `apps/server/src/audit/actions.ts`（`AUDIT_ACTION_GROUPS`），由 `audit/actions.test.ts` 源码扫描兜底 ⇒ **新增 `user.*` 动作必须登记该表，否则测试红** | M4c-2 |
| 数据分布 | **dev 库实测（2026-10-08 · 只读查询 · 脚本用完即删）**：`user.status` = `ACTIVE` **562** / `DISABLED` **2** / `NULL` **0**（共 **564** 行）；`banned=true` 现值 **0** ⇒ R8 迁移**实测命中 2 行**（官方封禁列**首次启用**）；非 `ACTIVE` 行来自 **`0009` 历史数据搬迁**（旧表 `user_account` 三态原样搬入，`0009_...sql:31,49`），**非现役代码写入** | M4c-1 / M4c-2 |

**待坐实**（原 2 项已于 2026-10-08 全部收口：① 运行库 `user.status` 分布 → **已坐实**，见上表「数据分布」行 ② `@better-auth/sso` 门槛 → **不适用**，§2.6 R4）：

| 面 | 待坐实项 | 落到 |
|----|---------|------|
| 依赖 | ~~`@better-auth/sso` 的账号链接门槛与可覆盖性~~ —— **不适用**（§2.6 R4 选定官方内置 Entra ID provider，不采 SSO 插件） | M4c-3 |

### 2.6 决策登记（R1–R22 · 2026-10-08，全部已确认）

> 方式：grilling 4 轮（R1–R20）+ 完整性体检 1 轮（R21–R22）——每轮前沿 = 前置已落定的决策；每问带一行推荐 + 一行代价 ⇒ 用户短答。
> 本轮起，立项期板项（原 W1–W7）**全部落定**并归入本表；被否决候选不写入本文档（沿革交 commit message）。

| # | 问题 | 拍板 | 影响面 |
|---|------|------|--------|
| R1 | 账号链接策略（跨三通道） | **自动链接**（官方默认：撞邮箱且邮箱已验证 ⇒ 合并为同一账号） | §3.4 共享模块唯一实现处 |
| R2 | 管理员建号的账号类型 | **只建本地账号**（邮箱 + 姓名 + 角色 + 初始口令）；目录账号由首登自动建号 | §4.4 |
| R3 | 自助注册是否收敛 | **`REGISTRATION_ENABLED` 默认改 `false`**（显式开启才允许自助注册） | 契约变更 → §8 / §14 |
| R4 | 企业身份源接入形态 | **官方内置 provider `microsoft`（Entra ID）**（`@better-auth/core/dist/social-providers/microsoft-entra-id.mjs` · 支持固定 `tenantId` · 无新表 · **不走 `genericOAuth`**）；不采 SSO 插件 | §5.2 |
| R5 | **用户 PENDING 的处置** | **彻底清除**：枚举值 / 错误码 / 分支 / 类型 / 注释 / i18n / 规范表述**全部删除**（不保留该概念、不写沿革注记） | §2.5 / §4 全域 / §14 |
| R6 | 审核任务的 PENDING | **不动**（`review_task.status='PENDING'` + 资产 `PENDING_REVIEW` 属审核流，与用户准入无关；同名易误伤故显式确认） | — |
| R7 | 准入结果 `PENDING_APPROVAL` | **删** ⇒ 准入结果收敛为二元 `ALLOW` / `DENY`；三个策略枚举（provider_allowlist / email_domain / subject_whitelist）**保留**（门槛 ≠ 待审批态） | §14 |
| R8 | 存量非 ACTIVE 行的处置 | 迁移条件 **`status IS DISTINCT FROM 'ACTIVE'`**（防 `NULL` 静默漏行 —— `user.status` 列**可空**，`0008_icy_argent.sql:82` 无 `NOT NULL`；本库 `NULL=0`，属健壮性）⇒ 命中置 `banned=true` + `banReason='历史状态迁移'`（**语句零 PENDING 字样**；**dev 库实测命中 2 行**） | §3.5 / §4.2 |
| R9 | 建号时 `username` 落法 | 官方 `create-user` 建号后，由本仓薄端点**直写规范化后的 `username` + `displayUsername`**（规则照官方 `normalizer` 对齐） | §4.4 |
| R10 | 社交 provider 首批名单 | **Google + GitHub + WeChat** | §5.1 |
| R11 | WeChat 无邮箱怎么办 | **接受官方占位邮箱** + 共享模块识别 `.placeholder.invalid` 为"无邮箱身份"（跳过邮箱唯一性判定、保留 `emailVerified:false`、UI 显示「—」） | §3.4 / §5.1 |
| R12 | **改密拒绝机制** | **拒绝目录账号改密**（自助 / 管理均然）⇒ 明确错误码；**落点 = 入口层按目标账号判定**，`password.hash` 保持本仓 `hashPassword` 不变（原口径「`password.hash` 分支 = 显式拒绝」机制错：全局单参函数拿不到账号 ⇒ 会失效所有设密路径，含 R21；**F280** · 实现归 M4c-2） | §3.2 · §4.8 |
| R13 | 登录页 provider 入口形态 | 现有右栏表单**下方加分隔线 + 按钮组**（不改页面结构） | §5.1 / §10.2 |
| R14 | 本地账号登录名口径 | **也用工号**（`username` = 工号，与目录账号统一单入口） | §3.1 / §4.4 |
| R15 | `accountId` 语义归一载体 | **正式 drizzle 迁移**（幂等）：`credential` 行 `account_id: 工号 → user.id` + 目录账号补标记行 | §3.5 |
| R16 | M4c-1 等价完成判据 | 三层硬判据：① `hasRole/useAuth` 对外签名不变（调用点 **21 处** · 10 文件；口径见批 design §12）② 401 四分类 + 反向守卫 + `next` 白名单断言全绿 ③ 登录态 7 个 dogfood 全绿 + `signInAih` 调用点归零（grep 断言） | §15 |
| R17 | 并发竞态（同时改同一用户） | **不引入乐观锁**：以到达顺序胜出，前端提交后重取；并发覆盖不算缺陷 | §9 |
| R18 | 旧错误码清算 | 收敛表：删 `user_pending` / `user_disabled` / `invalid_credentials` / `ldap_denied` / `email_conflict` / `oidc_state_mismatch` / `oidc_denied`；**保留** `email_missing` / `rate_limited` / `csrf_failed` / `session_expired` / `forbidden` | §4.6 |
| R19 | 封禁用户的登录提示 | **跟随官方**：明确提示「账号已被停用」（配中文 `bannedUserMessage`）；其余登录失败仍统一码（不泄露存在性） | §6.2 |
| R20 | 会话可见性 | **只给动作、不给列表**：行内「吊销全部会话」即可 ⇒ 权限码**只扩 `session:['revoke']`**（`list` 不扩）；会话明细登记为后续候选 | §4.1 / §4.3 / §4.5 |
| R21 | 本地账号的密码生命周期 | **补「已登录自助改密」**（官方 `/change-password` · **零新权限码** · 零薄端点，仅给入口）。管理员重置密码**仍不做**（D2 不动）⇒ 补掉「本地账号忘记口令 = 死账」缺口 | §4.8 / §4.1 / §8 / §11 |
| R22 | 列表「最后登录」列的取数 | **薄端点内聚合** `max(session.created_at)`（`session_userId_idx` 已有索引 · 不接线官方 `list-user-sessions`，R20 不动） | §8.1 / §10.2 |

### 2.7 跨批件清单与规模（条目级 · 逐件细目与行数级预估以各批 design/plan 为准）

| 批 | 新增件 | 改造件 | 退役项 | 迁移 | 新增薄端点 / 审计动作 |
|----|-------|-------|-------|------|--------------------|
| **M4c-1** | 1：身份源共享模块 `apps/server/src/auth/identity.ts` | 9：后端 `auth/better-auth.ts` · `auth/plugins/ldap-credentials.ts` · `auth/errors.ts` · `auth/rbac.ts` · `db/schema/auth.ts`；前端 `auth/AuthProvider.tsx` · `auth/roles.ts` · `auth/next.ts` · `api/client.ts` | 1：端点 `POST /api/auth/sign-in/aih` | **1**：凭据行 `accountId` 归一 + 目录标记行补齐 | 0 / 0 |
| **M4c-2** | 2：`apps/server/src/http/admin-users.ts` · `apps/web/src/pages/AdminUsers.tsx` | 6：`auth/roles.ts`（权限码）· `audit/actions.ts` · `components/ui/navItems.tsx` · i18n `zh/en` · `db/schema/auth.ts`（删列）· 用户区入口 | 1：`user.status` 列 | **1**：非 `ACTIVE` → `banned` + 删列 | **5** / **5** |
| **M4c-3** | 0 | 3：`auth/better-auth.ts`（provider 装配）· `pages/Login.tsx` · i18n | 2：`http/oidc-routes.ts` 文件 + 端点 `signInAihOidc` | 0 | 0 / 0 |

**规模量级（条目级）**：新增件 **3**（1+2+0）· 改造件 **18**（9+6+3）· 退役项 **4**（1+1+2）· 迁移 **2** · 新增薄端点 **5** · 新增审计动作 **5**（各列 = 三批之和）。
**跨批复用**：控制台组件基建（M4b 已交付）全量复用 · 视觉体系引 M4a §4.4（零新视觉值）· 会话 / CSRF / 限流 / 错误码由官方承担。

## 3. 认证层统一到官方（M4c-1）

### 3.0 认证能力 × 阶段归属（防跨里程碑重复提问与 plan↔design 漂移）

> 本节只作**能力 → 批**的一处归属判定（防跨里程碑重复提问）；能力的内容契约见 §3.1–§5.3，批的范围见 §2.3。

| 能力 | 归属 | 说明 |
|------|------|------|
| 口令登录（本地账号） | **M4c-1** | 官方 `sign-in/username`（`signInAih` 本地分支退役） |
| 口令登录（企业目录账号） | **M4c-1** | 官方端点 + 本仓 `password.verify` 分支（§3.2） |
| 前端会话与权限显隐 | **M4c-1** | 官方 SDK 会话层（§3.1） |
| **自助改密（本地账号）** | **M4c-2** | 官方 `change-password`（§4.8 · R21） |
| 目录首登自动建号 | **M4c-1** | 不短路的官方钩子（§3.3） |
| 用户管理（列表/改角色/启停/建号/强制登出） | **M4c-2** | 官方 admin 插件 + 本仓薄端点（§4） |
| OIDC 企业身份源 | **M4c-3** | 官方件替自绘（内置 Entra ID provider · §5.2） |
| 社交 provider | **M4c-3** | 官方 `socialProviders`（§5.1） |
| 设备授权流（`/device`） | 已交付（M4b-2 / M4b-pre） | 本批仅回归 |
| CLI 令牌面 | 已交付（M4b-3） | 本批不动（仅回归） |

### 3.1 前端：官方 SDK 三层

| 层 | 官方件 | 本仓落点 | 关键点 |
|----|-------|---------|--------|
| 调用层 | **官方 React 入口 `better-auth/react`** 的 `createAuthClient`（`signIn` / `signOut` / `useSession`） | 替换 `apps/web/src/api/auth.ts` 的端点封装 | 基址 `/api/auth` + `credentials: include` **必须**与 dev 的 CSRF 同源守卫、`AUTH_TRUSTED_ORIGINS` 白名单对齐（须含 `http://localhost:5173`），否则 dev 写请求 403 |
| 会话层 | SDK **`useSession`**（React hook；跨标签页同步经 client core） | 替换 `apps/web/src/auth/AuthProvider.tsx` 的内部实现，**保留三态**（loading / anon / authed）对外契约 | **服务端**维持既有 `disableSessionRefresh`（不延长过期）⇒ 前端**不依赖静默续期**；SDK 的 `refetch` 语义为"重读状态"，与之一致 |
| 交互层 | SDK 的 `fetchOptions` 钩子 | 保留本仓 **401 四分类分流 + 反向守卫 + `next` 白名单**（现集中于 `apps/web/src/api/client.ts`） | SDK 的 `redirectPlugin` **只处理 `{url, redirect}` 响应体、不拦截 401**（实测）⇒ 本仓 401 口径可在 SDK 钩子内原样实现 |

**两处适配（须新建）**：

| 适配 | 方向 | 说明 |
|------|------|------|
| 档位适配 | 官方 role 文本（`user` / `admin` / `superadmin`）↔ 本仓数值档（1 / 10 / 100） | 单点落在前端 `apps/web/src/auth/roles.ts`，保持 `hasRole(role, min)` 对外签名不变（调用点 **21 处** · 10 文件不动） |
| 字段适配 | 官方 `user.name` ↔ 本仓 `displayName` | 会话用户形状适配；`/api/auth/me` 薄层契约保持不变（`{ user, role }`） |

**登录名单入口（§2.6 R14）**：统一为**工号**（`username`）——本地账号与目录账号同走官方 `sign-in/username`，登录页保持单一输入框。
**自助注册（§2.6 R3）**：默认关闭（`disableSignUp` 生效）；建号入口收敛为「管理员建号 + 目录首登自动建号」两个。

**改动面（立项期实测，供批 design 细化）**：认证相关源文件 3 个（`auth/AuthProvider.tsx` · `auth/next.ts` · `auth/roles.ts`）· 认证消费点 **14** 文件（实测查询式：**从 `auth/{AuthProvider,roles,next}` 导入**的模块数） · `useAuth()` / `hasRole()` 调用 **21** 处（10 文件；`grep` 命中 34 行 = 21 调用 + 11 注释 + 2 定义） · 涉及登录态的 dogfood 脚本 7 个。

### 3.2 目录口令校验：官方 `password.verify` 分支

**数据契约（M4c-1 新增）**：目录账号在 `account` 表补齐一行**凭据委派行**：

| 字段 | 值 | 说明 |
|------|-----|------|
| `providerId` | `credential` | 官方 `findCredentialAccount` 的三条件之一 |
| `accountId` | **`user.id`** | 官方口径（非工号）；与 §3.5 的语义统一一致 |
| `password` | **`ldap:<工号>`** | **非空标记**（非密文）——把登录名带进 `verify`；官方在该值为空时直接返 401，故必须非空 |
| `userId` | 用户内部 id | — |

**校验契约**：以本仓函数替换官方 `emailAndPassword.password.verify`，按存值前缀分派：

| 存值形态 | 处理 |
|---------|------|
| 以 `ldap:` 开头 | 解析出登录名（工号）⇒ 走本仓目录 `bind`（`apps/server/src/auth/ldap.ts`）⇒ 返回布尔 |
| 其他（**本仓 scrypt 哈希**） | **保留本仓 `verifyPassword`**（`$scrypt$N$r$p$saltB64$hashB64` 自描述）—— ⚠️ **不得**委托官方 `better-auth/crypto` 的 `verifyPassword`：官方（`saltHex:keyHex` · N=16384 · r=16 · dkLen=64 · NFKC）与本仓（`$scrypt$…` · N=131072 · r=8 · dkLen=32）格式参数**互不认**，实测官方 verify 在本仓哈希上**抛 `Invalid password hash`** ⇒ 存量本地账号全 500（**F279**） |

**收益**：登录**热路径全程官方** —— 官方端点自带 Origin/CSRF 校验、会话签发、限流、错误码与钩子链，本仓只提供一个**官方文档化的配置函数**。

**边界**：`password.hash` **保持本仓 `hashPassword` 不变**（库内单一格式）；「拒绝目录账号改密」**落入口层按目标账号判定** —— `password.hash(password)` 是**全局单参函数、拿不到目标账号** ⇒ 不能在此拒绝（原口径会失效所有设密路径，含本设计 §4.8 的自助改密；**F280**，实现归 M4c-2）。

### 3.3 首登建号：不短路的官方钩子

目录账号**首次登录**时本仓尚无对应用户 ⇒ 官方端点在用户查找阶段即结束（到不了 §3.2 的校验）。故建号落在官方 `sign-in/username` 的 **before 钩子**内：

| 步骤 | 行为 |
|------|------|
| 触发条件 | 登录名在本仓无对应用户（有用户则不介入，直接放行） |
| 动作 | 目录 `bind` 校验口令 ⇒ 成功后经 **§3.4 共享模块**建号 + 补凭据委派行（§3.2） |
| 返回 | **不返回响应**（不短路）⇒ 官方端点中间件（含 Origin/CSRF）照常执行，随后官方端点按常规流程完成登录 |

**关键约束（决定本设计形态）**：官方 **before 钩子运行在端点自身中间件之前** ⇒ 若在钩子内短路返回响应，将**绕过**官方 Origin/CSRF 校验。本设计**明确要求钩子不短路**，以保住官方安全链。

**Origin / CSRF 实测口径**：官方在本仓自绘端点退役后，登录面只剩官方端点 —— 官方**核心** `sign-in` / `sign-up` 端点自带 `formCsrfMiddleware`，而 `username` 插件端点（本批采纳）**未挂** ⇒ 由插件 `hooks.before` 首条复用官方件补齐（**F283** · 批 design §5.3）。断言三态须显式 `advanced.disableOriginCheck: false`：官方测试环境默认跳过校验（`context/create-context.mjs`：`skipOriginCheck = isTest() ? true : false` —— 即 `isTest()` 为真时跳过）；跨源 ⇒ 403 `INVALID_ORIGIN`，跨站导航（`Sec-Fetch-Site: cross-site` + `Mode: navigate`）⇒ 403 `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED`。

**失败语义**：目录 `bind` 失败 ⇒ 不建号、不返回响应 ⇒ 由官方端点给出统一的登录失败响应（不泄露账号存在性，见 §6.2）。

### 3.4 身份源抽象：共享建号 / 链接模块

**一个共享模块**，承载两条以上身份源通道**共用的产品规则**（现雏形 = `ensureDirectoryUser`，`apps/server/src/auth/plugins/ldap-credentials.ts:166`）：

| 职责 | 说明 |
|------|------|
| 身份复用与漂移同步 | 同一 `(providerId, accountId)` 再次登录 ⇒ 复用账号 + 同步显示名 |
| 邮箱归一化与必填（**目录通道**） | 邮箱统一小写；缺失即拒（不合成）——目录身份可信、邮箱为真值 |
| 占位邮箱识别（**社交通道**） | 以 `.placeholder.invalid` 结尾 ⇒ 判为「无邮箱身份」：跳过邮箱唯一性判定、**保留 `emailVerified:false`**、UI 显示「—」（§2.6 R11） |
| 显示名与默认档 | 显示名取自目录属性；默认档 = 用户档 |
| **账号链接策略** | 撞邮箱时的处置 = **自动链接**（§2.6 R1）——**唯一实现处** |
| 审计 | 登录来源与结果事件 |

**两个调用入口（均为官方扩展点）**：

| 入口 | 官方件 | 调用者 |
|------|-------|--------|
| 目录通道 | 官方 `sign-in/username` 的 before 钩子（§3.3） | 本仓钩子 |
| 重定向通道（OIDC / 社交） | 官方**内置 provider 的建号流程**（Entra ID / Google / GitHub / WeChat） | 本仓在官方扩展点内调用 |

**定位声明**：本模块**不是**与官方并行的第二套建号机制，而是**挂在官方钩子下游**的规则实现 —— 两个入口都是官方的。

### 3.5 迁移项（M4c-1）

| 迁移 | 内容 | 风险与口径 |
|------|------|-----------|
| 账号行语义归一 | `account` 表 `providerId='credential'` 的行，`accountId` 由「工号」改为 **`user.id`** | 载体 = **正式 drizzle 迁移（幂等）**（§2.6 R15）；不归一 ⇒ 官方 `sign-in/username` 对既有账号一律 401（含种子管理员）；**不改口令哈希** |
| 目录凭据委派行补齐 | 为既有目录账号补 §3.2 的标记行 | 只补缺，不覆盖已存在的本仓本地口令行 |
| 自绘端点退役 | 下线 `POST /api/auth/sign-in/aih`（本地 + 目录分支） | 前端调用点须**同批**切到官方 SDK；退役后 CLI/设备流不受影响（走官方） |
| 邮箱规则 | 目录通道保留「邮箱必填、不合成」；社交通道按 §3.4 占位邮箱口径 | 两条通道规则不同，**共享模块内分流**，不互相污染 |
| 回滚口径 | 三条迁移（`accountId` 归一 / 目录标记行补齐 / 非 `ACTIVE`→`banned`）**均为 forward-only 且幂等**；不做自动回滚（符合仓库迁移惯例），失败即停并保留现场供人工处置 | 迁移前对 `account` / `user` 两张表做一次快照备份；`status` 删列**最后执行**，便于回查 |
| `status` 列 | **本批不动**（归 M4c-2，见 §4.2） | 本批只做认证层；避免同批混两次迁移。M4c-2 侧条件 = `IS DISTINCT FROM 'ACTIVE'`（防 NULL），**dev 库实测命中 2 行** |

## 4. 账号与权限治理（M4c-2）

### 4.1 官方 admin 插件承担面

| 能力 | 官方端点 | 本仓薄端点（挂 `/api/admin`，沿用既有 `createAdminRoutes` 惯例） | 本仓处置 |
|------|---------|------------------------------------------|---------|
| 用户列表 | `list-users` | `GET /api/admin/users` | 委托（守卫 / 审计 / 中文错误码在本仓） |
| 改角色 | `set-role` | `PATCH /api/admin/users/:id/role` | 同上；**护栏**：不能改自己档位、不能把他人提到超过自己的档位 |
| 封禁 / 解封 | `ban-user` / `unban-user` | `POST /api/admin/users/:id/ban` · `…/unban` | 同上；形态见 §4.2 |
| 管理员建号 | `create-user` | `POST /api/admin/users` | 同上；口径见 §4.4 |
| 吊销会话（**全部**） | `revoke-user-sessions` | `POST /api/admin/users/:id/sessions/revoke` | 同上；**不给会话列表** ⇒ **不接线** `list-user-sessions`（§2.6 R20） |
| **自助改密**（仅本地账号） | `change-password` | —（前端经官方 SDK 直调，**零薄端点**） | 目录账号**拒绝**并明确提示（R21 · §4.8） |

### 4.2 账号启停：官方封禁三件套（`status` 列退休）

| 项 | 决策 |
|----|------|
| 真值 | 官方 `banned` / `banReason` / `banExpires`（`banned=false` = 正常） |
| 挂点 | 封禁判定 = 官方 `databaseHooks.session.create.before`：**已过 `banExpires` ⇒ 自动解封并放行**；否则抛 `FORBIDDEN` + `code:'BANNED_USER'`（§2.5 实测）；配合 `ban-user` 的 `deleteUserSessions` ⇒ 立即失效 |
| 白拿 | 官方**已有** `YOU_CANNOT_BAN_YOURSELF`；我方仅需补「不可提权到高于自己档位」「不可使超管档位归零」 |
| 本仓 `status` 列 | **退休**（含删列迁移）；判定一律改读 `banned` |
| 契约变更 | **推翻 M4b-pre R5**（该轮结论为"用本仓 status 单值列、不用官方 ban 列"）；`05` §4.1「三态单列」表述须同步 |
| 改动面（起点实测 · **语义甄别归批 design**） | 原始 `grep -c status` 命中：`auth/rbac.ts` **5** · `http/auth-middleware.ts` **6** · `http/token-middleware.ts` **3** · `auth/plugins/ldap-credentials.ts` **16** · `admin/overview.ts` **10** · `assets/stats.ts` **5** · `auth/errors.ts` **1** —— 以上**含非账号语义命中**（资产状态 / HTTP 状态码 / 其他 `status`），逐处甄别见 §2.5 待坐实；`http/oidc-routes.ts` 实测**零命中**（早年清单误列，已更正）+ i18n zh/en **各 2 条**（实测）+ `grep -rl status apps/server/src --include='*.test.ts'` 命中 **32** 个测试文件（`status` **大小写敏感**匹配；含资产 / HTTP 等非账号语义命中，同需甄别）+ 1 次删列迁移 |
| 数据 | 迁移口径（§2.6 R8）：`status IS DISTINCT FROM 'ACTIVE'` 的行 ⇒ `banned=true` + `banReason='历史状态迁移'`（语句零 PENDING 字样），随后删列。**dev 库实测命中 2 行**（§2.5「数据分布」）⇒ **非空操作**。写入路径订正：现役代码对 `user.status` **只写 `'ACTIVE'`**（建号钩子 `auth/plugins/ldap-credentials.ts:206` · `db/seed.ts:50`），**无写 `PENDING`/`DISABLED` 的代码路径**；库中非 `ACTIVE` 行来自 **`0009` 历史数据搬迁** |

### 4.3 强制登出（按用户吊销 Session）

| 项 | 契约 |
|----|------|
| 能力 | **仅**按用户吊销全部会话（官方 `revoke-user-sessions`）；**不接线** `list-user-sessions`（§2.6 R20） |
| 反馈 | 官方返回 **`{ success: true }`（实测：不含数量）** ⇒ 前端只给「已吊销」toast，**不给会话数量** |
| 必要性前提 | 本仓会话为**有状态会话**（不透明 token + 数据库行，无 JWT 会话）⇒ 吊销即生效 |
| 权限码 | 需**新增** `session: ['revoke']`（**仅 revoke**，`list` 不扩；§4.5） |
| UI | 行操作菜单入口 + 二次确认；成功后目标用户下次请求即失效 |

### 4.4 管理员建号

| 项 | 契约 |
|----|------|
| 账号类型 | **只建本地账号**（邮箱 + 姓名 + 角色 + 初始口令，§2.6 R2）；目录账号由首登自动建号 |
| 字段来源 | 官方 `create-user` body 为 `{ email, password?, name, role?, data? }`；**无 `username` 字段**（事实见 §2.5） |
| 登录名处置 | 本仓以**工号 = 登录名**（`05` §3.1）；官方 **无 `set-username` 端点**（username 插件仅 `is-username-available` 与 `sign-in/username`，实测）⇒ 落法 = **直写规范化**（§2.6 R9） |
| 无口令建号 | 官方 `create-user` 的 `password` **可选**（不传即不建凭据行）⇒「预建目录账号」路径可行；但**须同批补 §3.2 的凭据委派行**，否则官方端点找不到凭证行、登录走不到 `verify` |
| 邮箱 | 必填、强制小写（官方行为） |

### 4.5 权限码表扩展

| 动作 | 现状 | 本批 |
|------|------|------|
| `user: ['list','set-role','ban','create']` | 已有（`apps/server/src/auth/roles.ts:55-60`） | 沿用 |
| `session: ['revoke']` | **缺** | **新增**（强制登出所需）；`session:['list']` **不新增**（不给会话列表，§2.6 R20） |
| `user: ['set-password']` | 缺 | **不新增**（D2 仅指管理员重置；本地账号自助改密走官方 `change-password`，**不需**该权限码 · R21 / §4.8） |
| `user: ['delete','impersonate','get','update']` | — | **不新增**（本批无此操作） |
| `asset` / `review` / `audit` | 已有 | 沿用 |

档位 → 权限集合维持「用户 / 管理 / 超管」三档线性语义；用户管理面的**可见门槛**沿用现状（侧栏条目门槛 = 超管，`apps/web/src/components/ui/navItems.tsx`）。

### 4.6 审计事件与错误码

**审计事件**（沿用既有 `<资源>.<动作>` 惯例）：`user.role_change` · `user.ban` · `user.unban` · `user.create` · `user.session_revoke`。
⚠️ **新增动作必须同步登记** `apps/server/src/audit/actions.ts`（`AUDIT_ACTION_GROUPS` 单源），否则 `audit/actions.test.ts` 的源码扫描用例红（§2.5 实测）。

**错误码收敛（§2.6 R18 · 认证层统一后的终态）**：

| 处置 | 错误码 | 说明 |
|------|--------|------|
| **删除** | `auth.user_pending` | 随用户 PENDING 彻底清除（§2.6 R5） |
| **删除** | `auth.user_disabled` | 改由官方 `BANNED_USER` 承担（§2.6 R19） |
| **删除** | `auth.invalid_credentials` · `auth.ldap_denied` | 登录失败统一为官方错误码（不泄露存在性） |
| **删除** | `auth.email_conflict` | 链接策略改自动链接（§2.6 R1）后不再拒绝冲突 |
| **删除** | `auth.oidc_state_mismatch` · `auth.oidc_denied` | M4c-3 自绘 OIDC 退役后随之消失 |
| **保留** | `auth.email_missing` | 目录通道专用（邮箱必填、不合成） |
| **保留** | `auth.rate_limited` · `auth.csrf_failed` · `auth.session_expired` · `auth.forbidden` | 框架/权限面 |

**本批新增的我方错误码**（薄端点护栏，沿用 `<域>.<原因>`）：

| 场景 | 错误码 |
|------|--------|
| 目标用户不存在 | `user.not_found` |
| 目标为自己（且该操作不允许自我） | `user.self_target_forbidden` |
| 提权越界（目标档位不低于自己） | `user.role_escalation_forbidden` |
| 不可使超管档位归零 | `user.last_superadmin_forbidden` |
| 建号登录名已占用 | `user.username_taken` |

（建号邮箱重复 ⇒ 复用官方 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`；封禁自我 ⇒ 复用官方 `YOU_CANNOT_BAN_YOURSELF`）

> **归属口径（M4c-1 T7 实测订正 · F291）**：上表是**终态**。M4c-1 落 4 枚（`user_pending` / `user_disabled` / `invalid_credentials` / `ldap_denied` —— 已删）；
> `email_conflict` / `oidc_state_mismatch` / `oidc_denied` 三枚的**客户端可见生产点**全在**保留至 M4c-3** 的 `http/oidc-routes.ts`（+ `auth/identity.ts` 的建号规则）
> ⇒ 随 R1 自动链接与自绘 OIDC 退役一并删（**终态 5 = 12 − 4 − 3**）。已封禁提示 = 官方 `BANNED_USER` + 中文 `bannedUserMessage`（本批已落）。

### 4.7 用户 PENDING 清除清单（§2.6 R5 · 立项期普查产物）

> 口径：**彻底删除**（概念、枚举、码、分支、注释、文案、规范表述全清；**不写沿革注记**，沿革交 commit message）。
> ⚠️ 同名的**审核任务 PENDING 不在本清单内**（§2.6 R6：`review_task.status='PENDING'` / 资产 `PENDING_REVIEW` 保留）。

| 面 | 位置 | 处置 |
|----|------|------|
| Schema | `apps/server/src/db/schema/auth.ts` | `userStatusSchema` 删 `'PENDING'` 枚举值（随列退休一并收敛） |
| 错误码 | `apps/server/src/auth/errors.ts` | 删 `userPending` 条目与对应 case |
| 端点 | `apps/server/src/auth/plugins/ldap-credentials.ts` | 删 `statusError` 的 PENDING 分支 |
| 类型/判定 | `apps/server/src/auth/rbac.ts` | `UserStatus` 与取值校验删 PENDING |
| 端点 | `apps/server/src/http/oidc-routes.ts` | 删 `'auth.user_pending'` 引用 |
| 注释 | `auth/better-auth.ts` · `http/auth-middleware.ts` · `http/token-middleware.ts` · `admin/overview.ts` | 注释里 PENDING 字样随删（**防注释腐化**） |
| 测试 | `test-utils/auth-fixture.ts` · `auth/session-lifecycle.test.ts` | 状态枚举与用例名同步删 |
| 文案 | `apps/web/src/i18n/zh.ts` · `en.ts` | 删 `auth.user_pending` 各 1 条 |
| 规范 | `docs/05` §4.1 状态表 · `docs/00` §5 M4c 行 | 见 §14 规范同步项 |

### 4.8 本地账号自助改密（§2.6 R21）

| 项 | 契约 |
|----|------|
| 触发 | 已登录用户**自助**改密；**仅本地账号** —— 目录账号口令归企业目录 ⇒ **拒绝并明确提示**（按**目标账号**在**入口层**判定；**不**用全局 `password.hash` 拒绝，见 **F280**） |
| 官方件 | `/change-password`：POST `{ currentPassword, newPassword, revokeOtherSessions? }`（§2.5 实测）；本仓**零薄端点**，前端经官方 SDK 直调 |
| 权限 | **零新权限码**（官方端点按**会话身份**校验，非 admin 权限码；`user:['set-password']` 仍不新增，§4.5） |
| 界面 | 用户区入口 + Dialog（当前口令 / 新口令 / 确认）；视觉随 §2.2 铁律就地定稿（批 design） |
| 会话处置 | 本批选择 `revokeOtherSessions: true` —— 口令泄露场景不残留旧会话（官方支持，实测 `dist/api/routes/update-user.mjs:180`） |
| 不做 | 管理员重置（D2 不动）· 邮件找回（无邮件服务） |

## 5. 外部身份源接入（M4c-3）

### 5.1 社交 provider

| 项 | 契约 |
|----|------|
| 官方件 | `socialProviders`（官方 **36** 个内置 provider，实现位于 `@better-auth/core/dist/social-providers/`） |
| 名单 | Google + GitHub + WeChat（§2.6 R10） |
| 开关范式 | 沿用本仓既有 env 范式（`OIDC_ENABLED` / `LDAP_ENABLED` 同款）：**默认关闭 + 逐 provider 开关**，独立部署不受影响 |
| 入口 | 登录页 provider 入口形态见 §2.6 R13（表单下方按钮组） |
| WeChat 特例 | 无邮箱 ⇒ 官方占位邮箱 + `emailVerified:false`（不参与自动链接）；共享模块识别 `.placeholder.invalid`（§2.6 R11） |
| 降级 | provider 不可达（企业内网常见）须有明确表现（入口禁用或失败提示），不留"点了没反应" |

### 5.2 官方件替自绘 OIDC（内置 Entra ID provider）

| 项 | 契约 |
|----|------|
| 现状 | 自绘 OIDC 授权码流：`apps/server/src/http/oidc-routes.ts` + 端点 `signInAihOidc`（`plugins/ldap-credentials.ts:400`）+ env `OIDC_*` |
| 目标 | 走官方件；企业 IdP 为 **Managed 单租户** ⇒ 官方**内置 Entra ID provider** 即可承载，按 **OIDC** 接入即可，**不需要 SAML**（官方 SSO 插件虽亦覆盖 SAML，本批不采） |
| 形态选择 | 官方**内置 provider `microsoft`**（Entra ID：文件 `microsoft-entra-id.mjs` · 导出符号 `microsoft` · 配置含 `tenantId`）（§2.6 R4）；不采 SSO 插件、不走 `genericOAuth` |
| 退役 | `oidc-routes.ts` + `signInAihOidc` 随之退役（同批切前端调用点） |

### 5.3 账号链接策略

| 项 | 契约 |
|----|------|
| 目标 | LDAP / OIDC / 社交三通道**同一份**链接策略（实现处 = §3.4 共享模块），不出现"一条通道自动合并、另一条拒绝"的分裂 |
| 拍板 | 自动链接（§2.6 R1） |
| 依赖事实 | 官方重定向通道的默认行为是「撞邮箱按已验证邮箱自动链接」（`oauth2/link-account.mjs`：三道门槛、可整体关闭）——**已核实**；官方 SSO 插件那条**不适用**（本批不采该插件 · §2.5） |

## 6. 安全与合规

### 6.1 时序侧信道

交付前须保留/补足**等价耗时处理**：目录 `bind` 的耗时显著高于本地 scrypt 校验 ⇒ 不能凭响应时间区分"目录账号 / 本地账号 / 账号不存在"。本仓自绘端点已有同款处理（`plugins/ldap-credentials.ts:393` 的固定假哈希校验），认证层统一后**该处理必须跟着迁移**，不得随端点退役而丢失。

### 6.2 错误码与防枚举

| 项 | 契约 |
|----|------|
| 登录失败 | 用户不存在 / 口令错 ⇒ **同一官方码**（不泄露存在性） |
| 已封禁用户 | **明确告知**「账号已被停用」（官方 `BANNED_USER` + 配中文 `bannedUserMessage`）——企业内网取向：告知同事优于隐瞒（§2.6 R19） |
| 连带改动 | 前端 i18n 错误码映射与涉及登录失败的 dogfood 断言随批更新 |
| 账号不存在性 | 首登建号失败（§3.3）不得返回"账号是否存在"的差异化信息 |

### 6.3 公开仓不泄内部信息

本仓为公开仓（**Apache 2.0**）⇒ 企业域名 / 租户标识 / 企业邮箱 / 内部主机名**一律不得进仓**（docs、design、plan、smoke 证据、测试夹具、示例配置**全部适用**）。企业身份源一律以**配置占位**（`OIDC_*` 同款范式）表达，文档只写"企业 IdP = Entra ID（OIDC）"这类非敏感描述。

## 7. 页面结构与路由

### 7.1 页面职责矩阵（环节 0 一页纸）

| 页面 | 谁用 | 干什么 | 调什么 |
|------|------|-------|--------|
| `/admin/users`（**新增**） | 超管 | 用户列表（筛选 / 分页）· 改角色 · 封禁·解封 · 强制登出 · 管理员建号 | 用户面薄端点（内部委托官方 admin 插件） |
| `/login`（**改造**） | 匿名 | 口令登录 + provider 入口（§5.1） | 官方 SDK 登录动作 |
| `/dashboard` · `/admin/*` 等既有页 | 登录用户 | 不变 | 不变；本批只随会话层切换做回归 |

### 7.2 路由清单（真码实测 2026-10-08：现 17 条）

`/login` · `/device` · `/` · `/search` · `/assets/:slug` · `/dashboard` · `/dashboard/assets` · `/dashboard/submissions` · `/dashboard/tokens` · `/dashboard/publish` · `/reviews/:id` · `/admin` · `/admin/reviews` · `/admin/assets` · `/admin/labels` · `/admin/audit`（+ 类型化入口由 `path={path}` 生成）

**本批新增**：`/admin/users`（M4c-2 · 超管门槛 · 侧栏「管理」组新增子项「用户管理」）。
**本批退役**：无路由退役（`signInAih` / `signInAihOidc` 是端点，非路由）。

### 7.3 入口与显隐规则（三层门槛）

| 层 | 规则 | 依据 |
|----|------|------|
| 侧栏入口 | 「管理 → **用户管理**」条目门槛 = **超管**（沿用现状：管理组条目门槛均为超管） | `apps/web/src/components/ui/navItems.tsx` |
| 路由 | `/admin/users` 直访：档位不足 ⇒ 挡回 `/dashboard` + 轻提示（**路由级 403 档**） | §9 两档口径 |
| 数据面 | 列表读面 = `user:['list']`（**管理档 +**）· 改角色 / 封禁·解封 / 建号 = 超管权限码 · 吊销全部会话 = `session:['revoke']` | `auth/roles.ts` 实测映射 |
| 动作面 | 行内按权限显隐，**服务端复核**（前端禁用不替代服务端判定） | §4.6 / §10.2 |

**实测映射（`auth/roles.ts`）**：`user`(1) = 资产发布 + 提交审核 · `admin`(10) = 追加资产管理 / 审核裁决 / 审计浏览 / **用户列表只读** · `superadmin`(100) = 全量（含改角色 / 封禁 / 建号）。

## 8. 接口变更总览（服务端面）

| 变更 | 类型 | 批 | 说明 |
|------|------|----|------|
| `POST /api/auth/sign-in/aih` | **退役** | M4c-1 | 本地 + 目录登录改由官方 `sign-in/username` 承担 |
| `POST /api/auth/sign-in/aih/oidc` | **退役** | M4c-3 | 改由官方内置 Entra ID provider（`microsoft`）承担 |
| `account` 行语义 | **数据迁移** | M4c-1 | 凭据行 `accountId` → `user.id`；目录账号补标记行（幂等） |
| 用户面薄端点 | **新增** | M4c-2 | 列表 / 改角色 / 封禁·解封 / 建号 / **吊销全部会话**（**不提供会话列表** · §2.6 R20）；内部委托官方，守卫与审计在本仓 |
| 权限码 `session` | **新增** | M4c-2 | `session: ['revoke']`（**仅 revoke**，`list` 不扩 · §2.6 R20） |
| `POST /api/auth/change-password` | **新增采用**（官方端点） | M4c-2 | 本地账号自助改密（§2.6 R21）；前端经官方 SDK 直调，**零本仓薄端点** |
| 用户列表 `lastLoginAt` | **新增数据** | M4c-2 | 薄端点内聚合 `max(session.created_at)`（§2.6 R22） |
| `user.status` 列 | **删除** | M4c-2 | 判定改读官方 `banned`（含删列迁移） |
| `ACCESS_POLICY` | **不变** | — | 枚举与默认值保留、不实现（D5）；准入结果收敛为 `ALLOW`/`DENY`（§2.6 R7） |
| `REGISTRATION_ENABLED` 默认值 | **变更** | M4c-1 | 默认 `true` → **`false`**（自助注册默认关闭，§2.6 R3） |
| 认证错误码 | **收敛** | M4c-1 | 删 7 个自绘码、留 5 个（§2.6 R18 · §4.6） |
| `OIDC_*` env | **沿用同款开关范式** | M4c-3 | §2.6 R4 选内置 provider ⇒ 保持 `OIDC_*` 默认关闭 + 配置化范式（不做插件配置模型适配） |

### 8.1 用户面端点契约（薄端点 → 官方端点）

| 薄端点 | 方法 | 入参 | 出参 | 委托官方 | 权限码 | 审计 |
|--------|------|------|------|---------|--------|------|
| `/api/admin/users` | GET | `limit` · `offset` · `q`（工号 / 姓名 / 邮箱）· `role` · `status`（`active` / `banned`）· `sort` · `dir` | `{ items: [{ userId, username, name, email, role, banned, banReason, banExpires, lastLoginAt }], total }` | `list-users` | `user:['list']` | —（读面不写） |
| `/api/admin/users` | POST | `{ email, name, role, username, password? }` | `{ userId }` | `create-user` + 直写 `username` / `displayUsername`（R9） | `user:['create']` | `user.create` |
| `/api/admin/users/:id/role` | PATCH | `{ role }` | `{ ok: true }` | `set-role` | `user:['set-role']` | `user.role_change` |
| `/api/admin/users/:id/ban` | POST | `{ reason?, expiresAt? }` | `{ ok: true }` | `ban-user` | `user:['ban']` | `user.ban` |
| `/api/admin/users/:id/unban` | POST | — | `{ ok: true }` | `unban-user` | `user:['ban']` | `user.unban` |
| `/api/admin/users/:id/sessions/revoke` | POST | — | `{ ok: true }` | `revoke-user-sessions`（官方返 `{ success: true }` ⇒ 归一） | `session:['revoke']` | `user.session_revoke` |

- 分页参数名沿用本仓列表族惯例（实测：`limit` / `offset`，服务端分页）；出参形状沿用 `{ items, total }`（实测 `http/assets.ts:284-285`）。
- 官方返回体不外泄（`{ success: true }` ⇒ `{ ok: true }`）；**异常不得吞错返空列表**（§9）。
- `lastLoginAt` = 薄端点内聚合 `max(session.created_at)`（§2.6 R22）。

## 9. 数据获取与状态约定

- 用户列表：沿用 M4b 列表族契约（服务端分页 + 排序键 + 筛选参数白名单）；**异常不得吞错返空列表**（官方 `list-users` 有此行为，薄端点须在委托层纠正并保留可诊断信息）。
- 状态覆盖（用户管理页）：空列表（无用户/无筛选命中）· 加载 · 请求失败 · **403 两档**（路由级 = 档位不足挡回 `/dashboard` + 轻提示；数据级 = 就地错误态、不退化空态 —— 引 M4b 立项口径 §5）。
- 乐观更新：**不做**。改角色 / 封禁 / 吊销均为"提交 → 等待 → 以服务端结果为准重取"。
- 并发竞态（§2.6 R17）：**不引入乐观锁**——并发改同一用户时以到达顺序胜出，前端提交后重取列表；并发覆盖不视为缺陷。

## 10. UI-UX 变动总览

### 10.1 视觉基线

引 `2026-09-09-m4a-marketplace-portal-design.md` §4.4（**全站视觉真值 SSOT**）—— **不复制**。M4c 新增页/改造页随本批**就地定稿**并就地补录 §4.4 映射（局部视觉决策），不设第二扇打磨窗口。

### 10.2 信息架构与交互要点

**用户管理页 —— 账号状态 × 可用操作（三列）**：

| 状态 | 展示效果 | 可用操作 |
|------|---------|---------|
| 正常 | 状态药丸「正常」 | 改角色（有护栏）· 封禁 · 吊销会话 |
| 已封禁（永久） | 状态药丸「已封禁」+ 原因摘要 | 解封 · 吊销会话 |
| 已封禁（到期自动解封） | 状态药丸「已封禁」+ 到期时间 | 解封 · 吊销会话 |
| **当前操作者本人所在行** | 同行样式 + 「（我）」标记 | **禁用**改角色 / 封禁（防自我锁死） |
| **最后一个超管**所在行 | 同行样式 + 「（末位超管）」标记 | **禁用**封禁 / 降级（防全站失管） |

**列表行**：账号（工号）· 姓名 · 邮箱 · 角色 · 状态 · 最后登录 · 操作（行尾菜单）。「最后登录」= 薄端点内聚合 `max(session.created_at)`（§2.6 R22）。
**操作菜单**：改角色 · 封禁/解封 · 吊销会话 —— 三项均二次确认；封禁需填原因（可选到期时间）。
**建号**：Dialog（字段与校验见 §4.4；账号类型 = 只建本地账号，§2.6 R2）。
**护栏**：不可改自己档位；不可把他人提到高于自己档位；不可封禁自己；不可使超管档位归零。

**边界场景**：① 封禁 / 降级**最后一个超管** ⇒ 拒绝（`user.last_superadmin_forbidden`）② 吊销**自己**的会话 ⇒ 允许，但二次确认并在成功后立即登出 ③ 建号时邮箱已存在 / 登录名已占用 ⇒ 表单内联错误，不创建 ④ 提交期连点 ⇒ 动作按钮提交期禁用（结合 §9「不做乐观更新」）⑤ 对已封禁用户再次封禁 ⇒ **幂等成功**（不报错，状态不变）⑥ 到期自动解封的时间点由服务端判定，前端只展示，不自行倒计时解锁。

## 11. i18n 资源规划（`07` §3）

| 组 / 面 | 内容 |
|---------|------|
| 新增 `users` 组 | 页面标题 · 列头 · 筛选项 · 三个动作与确认文案 · 建号表单标签与校验错误 |
| `auth` 组 | 登录失败错误码映射随 §6.2 调整；provider 入口文案 |
| 新增 `account` 组 | 自助改密 Dialog（入口 / 三字段 / 目录账号拒绝提示 / 成功与失败文案 · §4.8） |
| 移除项 | ① 与 `status` 三态相关的文案（随 §4.2 退休）② 收敛删除的 7 个错误码文案（`auth.user_pending` / `auth.user_disabled` / `auth.invalid_credentials` / `auth.ldap_denied` / `auth.email_conflict` / `auth.oidc_state_mismatch` / `auth.oidc_denied`，zh/en 各 1 条 · §2.6 R18） |

## 12. 线框图

**用户管理页 `/admin/users`**

```text
┌─ AppShell ─────────────────────────────────────────────────────────────────┐
│ TopBar（品牌 / 搜索 / 用户区）                                              │
├─ SideNav ───┬─ 主区 ───────────────────────────────────────────────────────┤
│ 管理         │ 用户管理                                    [ + 新建用户 ]    │
│  资产治理    │ ┌─ 筛选行 ───────────────────────────────────────────────┐   │
│  审核管理    │ │ [搜索 工号/姓名/邮箱]   [角色 ▾]   [状态 ▾]            │   │
│  标签定义    │ └───────────────────────────────────────────────────────┘   │
│  审计日志    │ ┌─ 表 ─────────────────────────────────────────────────────┐ │
│ ★用户管理    │ │ 账号      │ 姓名  │ 邮箱   │ 角色 │ 状态    │最后登录│操作│ │
│  （新增）    │ ├───────────┼───────┼────────┼──────┼─────────┼────────┼───┤ │
│              │ │ 59901934  │ 孙学文│ …@…    │ 超管 │ 正常    │ 10-08  │ ⋮ │ │
│ 个人         │ │ 60012345⁽我⁾│ 张三 │ …@…    │ 用户 │ 正常    │ 10-08  │ ⋮ │ │
│  …           │ │ 60067890  │ 李四  │ …@…    │ 用户 │ 已封禁  │ 09-30  │ ⋮ │ │
│              │ └───────────────────────────────────────────────────────┘  │
│              │ ‹ 1 2 3 ›       共 N 条                                  │
└──────────────┴──────────────────────────────────────────────────────────┘
操作菜单（⋮）：改角色 · 封禁/解封 · 吊销会话      本人行：三项禁用
```

**登录页（M4c-3 provider 入口；形态 = 表单下方按钮组，§2.6 R13）**

```text
┌─ 左：品牌栏 ─────────────┬─ 右：表单栏 ────────────────────┐
│ 品牌字 / tagline / 许可   │  登录                            │
│                          │  账号 [________________]         │
│                          │  口令 [________________]         │
│                          │  [        登录        ]          │
│                          │  ──────── 或 ────────            │
│                          │  [ G Google ] [ ⌥ GitHub ]        │
└──────────────────────────┴─────────────────────────────────┘
```

## 13. 引用文件清单

**规范层**：`docs/00-product-direction.md` §5（里程碑）/ §7 · `docs/05-identity-access.md` §3（身份源）/ §4（账号状态）/ §6（权限矩阵）· `docs/07-i18n-conventions.md` §3 · `docs/08-data-model.md` §5
**设计层**：`2026-09-10-m4b-admin-console-and-auth-design.md`（主 design 先例 · 视觉收口层边界）· `2026-09-15-m4b-pre-auth-migration-design.md`（认证整车迁移结论 · R5 被 D3 推翻）· `2026-09-09-m4a-marketplace-portal-design.md` §4.4（视觉 SSOT）· `2026-09-10-flat-model-refactor-design.md`（4 档角色模型）
**代码锚点**：`apps/server/src/auth/better-auth.ts`（admin 插件装配）· `apps/server/src/auth/roles.ts:55-60`（权限码表）· `apps/server/src/auth/plugins/ldap-credentials.ts`（目录凭证插件 / 退役对象）· `apps/server/src/auth/ldap.ts`（目录 bind）· `apps/server/src/db/schema/auth.ts`（账号三态）· `apps/server/src/db/seed.ts:59`（凭据行口径）· `apps/web/src/api/auth.ts` · `apps/web/src/auth/{AuthProvider.tsx,next.ts,roles.ts}` · `apps/web/src/api/client.ts`（401 分流）
**上游事实**（`better-auth@1.7.5`）：`dist/plugins/username/index.mjs`（`sign-in/username` 链路）· `dist/db/internal-adapter.mjs:652-668`（`findCredentialAccount` 三条件）· `dist/api/dispatch.mjs`（钩子时序与状态码）· `dist/crypto/*`（`verifyPassword` 导出面）

## 14. 规范同步项

| 规范 | 同步内容 | 触发批 |
|------|---------|-------|
| `05` §4.1 | 账号状态「三态单列」→ 官方封禁三件套（`status` 退休） | M4c-2 |
| `05` §4 | 补「策略 → 准入结果」映射表（`ACCESS_POLICY` 四枚举 × 结果） | M4c-2 |
| `05` §3.1 | 目录通道命名口径：**企业目录口令验证**（非 SSO） | M4c-1 |
| `05` §6.4 | 操作 × 角色矩阵补用户管理面操作 | M4c-2 |
| `08` §5 | `account` 行 `accountId` 语义与凭据委派标记列口径 | M4c-1 |
| `05` §4 | 准入结果**删 `PENDING_APPROVAL`** ⇒ 收敛为 `ALLOW` / `DENY`（§2.6 R7） | M4c-2 |
| `05` §4.1 | 账号状态表删 `PENDING` 行（§2.6 R5/R6） | M4c-2 |
| `05` §4 | 「其余三种策略与审批流归 M4c」表述订正：**审批流废除**，三策略枚举保留不实现（D5） | M4c-2 |
| `05` §3.1 | 目录通道邮箱规则保留 + 社交通道占位邮箱例外（§2.6 R11） | M4c-1 |
| `07` §4 | 错误码收敛后的映射表（删 7 留 5，§2.6 R18） | M4c-1 |
| `00` §5 | **M4c 行订正**：删「PENDING → 审批」字样 · 范围收敛 **A+（不含管理员重置密码）** · 准入策略本批不做 · 档位候选收敛 · 加 **M4c-1 / M4c-2 / M4c-3** 子行 | M4c-2 |
| `05` §3.1 | 补「**本地账号自助改密**（官方 `change-password`）· 目录账号改密拒绝」口径（§2.6 R21） | M4c-2 |

## 15. 出口标准与批间门

每批出口 = **五件全绿**：① 批 design 8 维 ≥9 定稿 ② 批 plan Task 全绿 ③ 五门禁（typecheck / lint / format / build / test）④ dogfood / 观感（新增页含用户观感复判）⑤ 整体审计（收尾全仓覆盖式扫描：findings 逐条登记 + 处置「修 / 订正 / 回填 / 口径登记」，不留未决项）。
**完整 converge** 与 M4c 末批同批收口。

**M4c-1「等价完成判据」（§2.6 R16）**：① `hasRole(role,min)` / `useAuth()` 对外签名不变（调用点 **21 处** · 10 文件零改签名）② 401 四分类 + 反向守卫 + `next` 白名单的既有断言全绿 ③ 涉及登录态的 7 个 dogfood 脚本全绿 + `signInAih` 调用点 grep 归零。

**开工硬前置**：① **重启 dev**（进程新鲜度：现 dev 进程启动时间早于末次提交 ⇒ 视觉/探针工作前必须重启，否则看的是旧码）② 新增文件后同样重启（样式扫描集不含新文件）。

## 16. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.24 | 2026-10-09 | **M4c-1 批完成（T1–T8 ✅）回填** —— ① dogfood 7 脚本 **494 PASS / 0 FAIL** + 等价判据三层实测（本件 §15 R16）② 门禁 11 步 EXIT=0 · 全量 **644 pass / 1 skip / 0 fail** ③ 规范回填：`05` **v1.13**（§3.1 实现口径 + F292 订正）· `08` **v1.11**（§3 凭据委派行）· `07` **v1.12**（T7）④ 依赖登记复核一致 · 证据 `docs/smoke/2026-10-09-m4c1.md` ⑤ **F293**（dogfood 顺序依赖）登记 · 收口自检 **9.52** · M4c-1 出口五件（本件 §15）全部达成 |
| v0.23 | 2026-10-09 | **M4c-1 T7 落地回填 + §4.6 归属口径订正（F291）** —— ① §4.6 补**归属注**（终态 vs 本批：4 枚本批 / 3 枚归 M4c-3）② 状态门 `identity.ts` 统一改抛官方 `BANNED_USER` + `admin({ bannedUserMessage })` 中文 ③ 前端删重映射表 ⇒ 官方码直通 `errors` 组（+5 键 / 删 4 条）④ `REGISTRATION_ENABLED` 默认 `false`（R3）⑤ 实测：防枚举**四态同码 401** · 全量 **644/1/0** · 码集合 **8**（12→8）|
| v0.22 | 2026-10-09 | **M4c-1 T6 收口（dogfood 7/7 全绿）+ F289/F290 登记** —— ① dogfood 7 脚本 **494 PASS / 0 FAIL**（24/64/43/89/62/108/104 · 全 EXIT=0 · 含真 200 登录与设备流）② **F289** 4 个 smoke/seed 脚本凭据行 `account_id` 写登录名 ⇒ 官方 `findCredentialAccount` 查不到 ⇒ 401（已修 + 重跑 seed）③ **F290** dogfood 按 `url.includes('5173')` 复用陈旧标签 ⇒ 侧栏断言假红（加固归 T8）④ §2.5 上界 **F288 → F290** |
| v0.21 | 2026-10-09 | **M4c-1 T6 落地回填 + F286–F288 登记** —— ① **F286** 登录面语义化码收窄（`auth.ldap_denied` 零生产点 ⇒ T7 清理；`email_missing` / `email_conflict` 保留至 M4c-3 退役 OIDC）② **F287** 登录限流承接变更（自绘 20 次/15 分钟（键 = 登录名\|IP）→ 官方 `rateLimit`（默认 `enabled = isProduction` · 内置 `/sign-in*` 10 秒/3 次 · 键 = IP\|path）；**dev/test 默认无登录限流** ⇒ T7 复核 + 规范回填）③ **F288** `audit_log.actor_id` FK = NO ACTION ⇒ 存在审计行的用户无法删除（实测 23503）⇒ 归 M4c-2 ④ §2.5 上界 **F285 → F288** |
| v0.20 | 2026-10-09 | sunxuewen-rush | **M4c-1 T5 落地回填 + F285 登记** —— ① 前端三层：调用层 `createAuthClient`（`better-auth/react`）+ **客户端插件 `usernameClient()`** · 会话层 SDK `useSession`（三态契约不变）· 交互层 401 四分类经 SDK `fetchOptions.onError` **回注单点**（`client.ts` 的 `notifyUnauthorized`）② 依赖：`apps/web` 显式声明 `better-auth@1.7.5`（exact；lock 单一 1.7.5 条目；`THIRD-PARTY-NOTICES.md` 预期不变）③ 实测：真页面 e2e（`get-session` + `sign-in/username` + `me` 三请求 · 错口令 inline「用户名或密码错误」· 路由不跳）④ §2.5 上界 → **F285**（设计 §3 未列客户端插件清单）⑤ **F282**（登录审计面）：T6 退役 `signInAih` 后 `auth.login.success` / `auth.login.failed` 零消费点 ⇒ 归 **T6** ⑥ 连带：批 design **v0.15** · plan **v0.15** · `docs/00` **v1.130** |
| v0.19 | 2026-10-09 | sunxuewen-rush | **M4c-1 T4 执行期发现 F284 + 迁移增语句 ⓪** —— ① **F284**：`0015` §6.1 把 `credential.account_id` 归一为 `user.id` 时，`user.username IS NULL` 的存量本地账号会**失去登录名**（其登录名只存在 `account_id`；官方 `/sign-in/username` 只按 `username` 查）⇒ 归一后不可逆地 401；dev 库取证：368 个 NULL username 中 365 已是随机 token 夹具（`account_id` = `user.id`，无影响）、真正受影响 3 个（`admin`/`smoke-uploader`/`smoke-admin`）、本机无真员工账号 ② **本批已修**：批 design **§6.0 语句 ⓪**（**早于 ①** 回填 `username = lower(a.account_id)` · `display_username` 原样 · `IS DISTINCT FROM u.id` 排除夹具行）+ 探针 **P5** ③ 连带：批 design **v0.14** · plan **v0.13** · `docs/00` **v1.128** |
| v0.18 | 2026-10-09 | sunxuewen-rush | **M4c-1 T3 CSRF 平价落地 + F283 定案「甲」** —— ① F283 精确化：核心 `api/routes/sign-in.mjs` / `sign-up.mjs` **自带** `formCsrfMiddleware`，缺口仅在 `username` 插件端点（本批采纳端点）② 闭环：插件 `hooks.before` **首条**复用官方件 `formCsrfMiddleware`（`matcher` `/sign-in/*`，**先于建号钩子** ⇒ 不通过零副作用）③ **实测口径订正**：官方测试环境 `skipOriginCheck = isTest() ? true : false` ⇒ 原「跨源实测 200」**不成立**；显式 `advanced.disableOriginCheck: false`（仓内先例 `app.test.ts:165`）后实测 403 两种官方码 + 零建号 ④ 连带：批 design **v0.13** · plan **v0.12** · `docs/00` **v1.127** |
| v0.17 | 2026-10-09 | sunxuewen-rush | **M4c-1 T3 落地回填 + F282/F283 登记**（承接 v0.15 的 T2 口径：`password.hash` 保持本仓 scrypt，其 `hash` 为全局单参函数、拿不到账号身份 ⇒ 改密拒绝落入口层）—— ① §2.5 上界 **F281 → F283**（F282 = 登录审计零消费点（T6 退役后）→ 归 T6 · F283 = 官方登录端点 cookieless Origin/CSRF 缺口 ⇒ 跨源 200，甲/乙/丙待拍板）② §2.3 backlog 表 M4c-1 行 → 批 plan **v0.11**（执行中 T1 ✅ · T2 ✅ · T3 ✅）· 批 design **v0.12** ③ 连带 `docs/00` **v1.126** |
| v0.16 | 2026-10-09 | **M4c-1 T2 落地回填 + F281 登记** —— ① §2.5 上界 **F280 → F281**（**F281**：官方 `username` 默认校验器 `/^[a-zA-Z0-9_.]+$/`（3–30 · 不收 `-`；真码 `dist/plugins/username/index.mjs:12-14,31-40`）⇒ 既有账号登录名含其他字符被官方 `sign-in/username` **422 `INVALID_USERNAME`** 拒；工号形态安全；处置建议 = T4 加合规探针）② §2.3 backlog 表 M4c-1 行批 plan → **v0.8**（**执行中：T1 ✅ · T2 ✅ 2026-10-09**；T2 = 存值前缀分派 `password-verify.ts`（71 行）+ 11 例直测 + 门禁全绿）③ 批 design **v0.11** · `docs/00` **v1.125** |
| v0.15 | 2026-10-09 | **T2 契约口径订正回填（F279/F280）** —— ① §3.2 表「其他（官方 scrypt 哈希）⇒ 委托官方 `better-auth/crypto`」订正为**「其他（本仓 scrypt 哈希）⇒ 保留本仓 `verifyPassword`」**：官方 `saltHex:keyHex`（N=16384 r=16 dkLen=64 + NFKC）与本仓 `$scrypt$N$r$p$saltB64$hashB64`（N=131072 r=8 dkLen=32）**格式参数互不认**，实测**反控**：官方 verify 在本仓哈希上 **THREW `Invalid password hash`** ⇒ 原口径照做 = 存量本地账号（seed/夹具/生产）**一律 500** + 违反 R10 零重置（**F279**）② §3.2 边界行 + **§2.6 R12** + §4.8 触发行：`password.hash` **保持本仓 `hashPassword`**；「拒绝目录账号改密」**落入口层按目标账号判定**（原「`password.hash` 分支 = 显式拒绝」机制错：官真实码 `ctx.context.password.hash(newPassword)` 单参、拿不到账号 ⇒ 一刀拒 = 失效所有设密路径，含 R21 自助改密；**F280**）③ §2.5 规则行上界 **F278 → F280** ④ 批 design **v0.10** · `docs/00` **v1.124** · plan **v0.7** |
| v0.14 | 2026-10-09 | **M4c-1 T1 落地回填** —— ① §2.5 规则行上界 **F277 → F278**（新号 **F278**：建号写 `username = subject`，官方 `user_username_unique` 全局唯一 ⇒ 跨通道同 subject 串撞车时既有兜底不覆盖 ⇒ 原始 23505 = **500**；由 T1 模块直测稳定照出；处置归 **M4c-3**）② §2.3 backlog 表 M4c-1 行批 plan → **v0.6**（执行中：T1 ✅ 新建 `auth/identity.ts` 194 行 · 调用方 430→295 · 逐字搬移两函数 0 差异 · 18 维 9.43 → C5 补齐后重评）③ 批 design **v0.9**（§5.4 隐含约束行 + §13 F278）· `docs/00` **v1.123**。**F278 非本批修复项**（T1 = 零行为变化） |
| v0.13 | 2026-10-08 | **官方安装页对账回填** —— ① §3.1 / §3.2 表两行**入口订正为官方 React 入口 `better-auth/react`**（官文 `/docs/installation` 点名 React；实测 `exports["./react"]` → `dist/client/react/index.mjs`，`useSession` 为 React hook（`react-store.mjs` = `nanostores` + `useSyncExternalStore`）+ 导出 `useStore`；vanilla `better-auth/client` 的 `useSession` 实为 `Atom<{data,error,isPending}>`）② §2.3 backlog 表 M4c-1 行批 plan → **v0.5**（官方安装页对账轮：依赖安装形态（exact + `bun.lock` 同批）· 客户端入口 · 建表 CLI 口径（零 schema 变更 ⇒ 不跑 `auth generate`）· env 命名映射 · notices 复核）③ 批 design **v0.8** · `docs/00` **v1.122**。**零实现改动** |
| v0.12 | 2026-10-08 | **批 plan R4 承接补齐回填** —— ① §2.3 backlog 表 M4c-1 行批 plan → **v0.4 · 自检 9.31（成立）**（复核轮命中 **R4**：**B10「零新页面 / 登录页视觉不动」无 Task 承接、无断言**；v0.3 的「B10 显式 ✅」系头部串「B1–B10」误命中的探针假阳性 ⇒ 实测 9.29）② 批 design **v0.7**（§10 补「承接（plan）」指针）③ `docs/00` **v1.121**。**零实现改动** |
| v0.11 | 2026-10-08 | **批 plan 第二轮抽查修复回填** —— ① §2.3 backlog 表 M4c-1 行批 plan → **v0.3 · 自检 9.31**（第二轮换靶 10 类命中 **R1–R3**：🟡 R1 plan 头部三处硬版本引用（批 design v0.4 / 主 design v0.8 ≠ 实体 v0.5 / v0.10）⇒ 改「版本以各件版本头为准」· 🟡 R2 批 design §8 防枚举/口令流转 + §9 `REGISTRATION_ENABLED` 默认值 **在 plan 零承接** ⇒ 并入 T7（新步骤 4 + 断言 ②③④）· ⚪ R3 `lint` 与 `biome check` 同物措辞）② 批 design **v0.6**（§8/§9 补「承接（plan）」指针）③ `docs/00` **v1.120**。**零实现改动** |
| v0.10 | 2026-10-08 | **批 plan 抽查修复回填 + 调用点口径坐实** —— ① §2.3 backlog 表 M4c-1 行批 plan → **v0.2 · 自检 9.26**（抽查换靶命中 P1–P4）② 「34 处调用点」口径全篇坐实（§2.6 R16 · §2.5 改动面 · §3.x 档位适配行 · §7 等价判据行）→「调用点 **21 处 / 10 文件**（8 + 13）；grep 34 行 = 21 + 11 注释 + 2 定义」③ §2.5 规则行上界 **F266 → F277**（**F277** 已登记：手写迁移未登记 `_journal.json`）④ 批 design **v0.5** · `docs/00` **v1.119**。**零实现改动** |
| v0.9 | 2026-10-08 | **M4c-1 批 plan 已立** —— 新建 `docs/plans/M4c-1-auth-layer-unification.md`（**v0.1** · **T1–T8** · §8 自检 **9.23** · 门禁 12 步 · 造数=无新脚本（迁移执行需授权）· 风险 7 条）；§2.3 backlog 表 M4c-1 行「预期 plan」→ **已立**（v0.1 · T1–T8）；`docs/00` §5 子行同步（**v1.118**）。**零实现改动** |
| v0.8 | 2026-10-08 | **M4c-1 批 design 检查修复轮（换靶 6 条）** —— 跨文件修复：① 本文件 v0.7 行「333 行」→ **删去行数声明**（改记版本号，防行数漂移）：批 design 现为 **v0.4 · 18 节 · 8 维 9.50**（**不再记行数** —— 行数随编辑漂移，登记行只记版本与读数） ② §2.3 批件登记行版本 v0.3 → **v0.4** ③ `docs/00` §5 **M4c-1 子行**状态由「⬜ 待对齐」→ **✅ 设计定稿（2026-10-08）**（§5 为状态唯一源）④ 批 design 同轮修：新增 §14.2 规范同步项 · §17.4 未决行改已闭环 · 章节结构对齐先例（§1 分 1.1/1.2/1.3 · §2 更名「拍板结果（本批）」）· 清除否决路线点名。**零实现改动** |
| v0.7 | 2026-10-08 | **M4c-1 批 design 已立并定稿** —— ① 新建 `docs/designs/2026-10-08-m4c1-auth-layer-unification-design.md`（**定稿** · 18 节 · 8 维 **9.44**：首稿 8.94 → 骨架补齐 9.38 → §6 补全 9.44）② 批内对齐 **B1–B10** 全部确认（/me 薄层保留 · 401 四分类经 SDK `fetchOptions` 注入 · 迁移 `0015` drizzle SQL · 凭据委派行两侧同源 · `signInAih` 两步退役 · 时序侧信道随迁 · 共享模块落 `auth/identity.ts` · 档位/字段适配单点 · 本批零新页面）③ §2.3 backlog M4c-1 行回填实际件名 + 状态 ④ **F267–F276 明细登记于该批 design §13**，`docs/README.md` §6.1 号段行同步（M4b-8 行转「已收口」）。**零实现改动** |
| v0.6 | 2026-10-08 | **dev 库实测回填（只读查询 · 授权后执行）** —— `user.status` 分布坐实：`ACTIVE` **562** / `DISABLED` **2** / `NULL` **0**（共 564 行）· `banned=true` 现值为 **0**（官方封禁列首次启用）⇒ R8 迁移**实测命中 2 行**；迁移条件订正为 **`status IS DISTINCT FROM 'ACTIVE'`**（成因：`user.status` 列可空（`0008_icy_argent.sql:82` 无 `NOT NULL`），SQL 中 `NULL <> 'ACTIVE'` 判为 UNKNOWN ⇒ 会静默漏行）；§4.2「代码内 `status` 零写入路径」订正为「**现役代码只写 `'ACTIVE'`**（建号钩子 `ldap-credentials.ts:206` · `seed.ts:50`）· 非 `ACTIVE` 行来自 **`0009` 历史数据搬迁**」；§2.5 待坐实项清零。**零契约改动 · 查询脚本用完即删（未入仓）** |
| v0.5 | 2026-10-08 | **转定稿（用户批准）** —— 三项定稿条件全闭合：① 文档 8 维自检 **9.4**（标准 4 维 9.50 · 深度 4 维 9.38；唯一扣分点 = 边界覆盖 9.0，原因 = 交互边界三项按 §2.2 归批 design 就地定稿）② 决策登记闭环（§2.1 D1–D14 + §2.6 R1–R22）③ 整体检查零未决项（四靶扫描 · 5 缺陷已修 · 26 处补章）⇒ **Status 草案 → 定稿**；视觉口径复核维持「随批就地定稿」。**零内容改动** |
| v0.4 | 2026-10-08 | **完整性体检补章**（骨架对同仓先例 M4b 主 design + 需求/契约闭环 + 三刀法）：新增 **R21 本地账号自助改密**（官方 `/change-password` · 用 `sensitiveSessionMiddleware`（无新鲜度要求，实测）· `revokeOtherSessions: true` · 零新权限码 · D2 不动）· **R22「最后登录」取数 = 薄端点聚合 `max(session.created_at)`** · 新增 **§2.7 跨批件清单与规模**（新增件 3 / 改造件 18 / 退役项 4 / 迁移 2 / 薄端点 5 / 审计动作 5）· **§4.8 自助改密** · **§7.3 入口与显隐规则**（三层门槛 + roles.ts 实测映射）· **§8.1 用户面端点契约表**（6 条 · 参数名与出参形状按本仓实测惯例）· §14 补 `00` §5 与 `05` §3.1 两项 · §3.0 声明分工去重。 |
| v0.3 | 2026-10-08 | 整体检查（通读全篇 + 量化声明实测 + 引用件真实性 + 决策跨节一致性）缺陷修复：§8 与 R20 矛盾对齐 · M4c-3 接入件由「`genericOAuth` 的 Entra ID helper」订正为**官方内置 provider `microsoft`（Entra ID）**（实测 `microsoft-entra-id.mjs` 导出 `microsoft`、含 `tenantId`、不含 `genericOAuth`）并同步 §2.3/§3.0/§3.4/§5.2/§5.3/§8/§16 的「官方 SSO 插件」主题词 · provider 数 **37 → 36**（原数为文件数，含聚合出口 `index.mjs`）· §4.2 测试文件数由不可复现的 17 改为**实测口径 32（含查询式）** · §3.1 补 14 文件的查询式。 |
| v0.2 | 2026-10-08 | grilling 收官回填：**R1–R20 全落定**（§2.6）—— 自动链接 / 只建本地账号 / 自助注册默认关闭 / 官方内置 Entra ID provider / **用户 PENDING 彻底清除**（枚举·码·分支·文案·规范）· 存量按 `status <> 'ACTIVE'` 映射 banned · 建号直写规范化 username · provider = Google+GitHub+WeChat · 占位邮箱口径 · `password.hash` 显式拒绝 · 登录页按钮组 · 工号单入口 · 正式 drizzle 迁移 · 三层等价判据 · 不引入乐观锁 · 错误码删 7 留 5 · 封禁明确告知 · **会话只给动作（权限仅扩 `revoke`）**；新增立项期已核实事实 8 条；规范同步项扩至 10 条。 |
| v0.1 | 2026-10-08 | 初稿：M4c 立项对齐产物 —— 14 条拍板结果（D1–D14）+ 边界 + 三批拆批表与编排说明 + 立项期已核实事实 10 条 / 待坐实 2 条 + 待批板项 7 条（W1–W7）+ M4c-1 认证层统一（官方 SDK 三层 / `verify` 分支 / 不短路建号钩子 / 身份源共享模块 / 迁移项）+ M4c-2 账号治理（官方 admin 插件 / 封禁三件套 / 强制登出 / 建号 / 权限码）+ M4c-3 外部身份源（社交 / 官方 SSO 替自绘 OIDC / 链接策略）。 |
