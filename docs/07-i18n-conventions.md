# UI 语言与本地化约定

> Date: 2026-09-04
> Updated: 2026-10-09（**v1.13：新增 `users` 组（60 键）· `account` 组（13 键）** —— M4c-2 账号与权限治理：`/admin/users` 页 + 自助改密 Dialog · zh/en 成对差集 0）
> Updated: 2026-10-09（v1.12：**§4 补「官方认证码直通」口径 + 本批增删（M4c-1 T7）** —— 登录面全交官方后，`errors` 资源表**按官方码建键**（与族协议码键同范式），前端**不**维护「官方码 → 我方码」重映射表；**防枚举**由「同一官方码 ⇒ 同一文案」保证。本批：删 `auth` 4 条（`invalid_credentials` / `ldap_denied` / `user_disabled` / `user_pending`）· 增官方码 5 条（`BANNED_USER` / `INVALID_USERNAME` / `INVALID_USERNAME_OR_PASSWORD` / `USERNAME_TOO_LONG` / `USERNAME_TOO_SHORT`）· 限流仍归一保留码 `auth.rate_limited`）
> Updated: 2026-09-30（v1.11：**§3 资源组清单补 `dashboard` 组 + 新增 §3.2 落地注记** —— M4b-8 T10 回填 · 主 design §14「M4b 收尾」欠账收口：§3 正文补 `dashboard`（个人工作台 · **M4b-4 已落地：14 键**）；新 §3.2 表列 **14 键**实测 + zh/en 零差集 + 归属（M4b-1 骨架 / M4b-4 落地）+ 消费点 `pages/Dashboard.tsx`；**顺带订正** §3 正文 `publish` 键数 **57 → 64**（与 §3.1 表对齐，正文落后）。**零实现改动**）
> **头部口径（2026-09-18 起）**：只留最近 1-2 版 · 不复述历史与验收数字；完整历史见 **§8 修订记录**。
> Status: 定稿（M0 评审通过；M4a 门户资源已落地，M4b 管理后台资源随其实现铺开）
> Scope: 前端界面语言机制 —— 支持语言、默认跟随系统、手动切换、错误码本地化、API 语言契约

## 1. 定位

定义市场门户与管理后台的界面语言机制（i18n）。产品 UI 为双语起步（简体中文 / 英文），
**默认跟随系统语言**，用户可**手动切换**（偏好覆盖系统默认）。

注：本文件只管「界面语言」；服务端数据侧多语言（label displayName）见 `06` §2.3。
两者共用同一判定源（客户端 `Accept-Language`），但回退终点各自独立：
UI 资源回退英文（§2），label 数据回退 slug（06 §2.3）。

## 2. 语言模型

| 项 | 决策 |
|----|------|
| 支持语言 | `zh-CN` / `en`（起步双语；资源结构支持后续扩语言） |
| 默认 | 跟随系统语言（客户端 Accept-Language / 系统语言检测） |
| 用户切换 | 界面提供语言切换器；选择持久化（用户偏好），覆盖系统默认 |
| 回退 | UI 资源缺失 → 英文（最小公分母，开源兜底）；系统语言非 zh/en → 英文 |
| 生效 | 切换后立即生效（不要求整页重载）；偏好持久化下次启动沿用 |

语言判定优先级：**用户偏好（若显式选择） > 系统语言（Accept-Language 链）> 默认 en**。

## 3. UI 资源组织

- 资源按界面域分组：`navigation` / `market`（列表/搜索/详情）· `publish`（发布流 · **M4b-7 已落地：64 键** —— 见 §3.1 落地注记）·
  `dashboard`（个人工作台 · **M4b-4 已落地：14 键** —— 见 §3.2 落地注记）·
  `review`（审核）· `admin`（管理后台）· `common`（通用）· `errors`（错误码消息）
- 客户端 i18n 框架加载当前语言资源包；语言切换即换资源包
- 资产自身内容（作者写的 description/正文/README）**不翻译**——那是内容属性，
  平台不提供机器翻译；与 UI 语言严格分离

### 3.2 `dashboard` 组落地注记（M4b-8 T10 回填 · 2026-09-30）

| 项 | 实测值（2026-09-30） |
|---|---|
| 键数 | **14** —— `title` · `welcome` · `myAssets` · `submissions` · `tokens` · `empty` + `card.pending.title` / `card.pending.cta` / `card.assets.cta` / `card.audit.title` / `card.audit.col.time` / `card.audit.col.action` / `card.audit.col.target` / `card.audit.viewAll`；zh 14 / en 14 逐键回读 · **零差集**（由 `Dict = typeof zh` 类型 + 脚本双验） |
| 归属 | **M4b-1**（三层骨架）· **M4b-4**（落地：工作台 landing 三项计数卡） |
| 消费点 | `pages/Dashboard.tsx`（角色感知卡片 —— `role < 10` 只发「我的资产」1 个请求） |

## 4. 错误码本地化

- 服务端返回结构化 `code`（各族协议错误码见 02/03/04；业务错误码随实现定义），
  **不返回面向用户的成品文案**（或返回英文开发性 message 兜底）
- 前端维护 `errors` 资源表：`code → 当前语言消息`（02 §4 错误码表直接映射）
- 未命中资源表的 code → 显示兜底消息（「操作失败，code」），保证永不空白
- **官方认证码直通**（M4c-1 T7）：登录面全交官方件后，`errors` 资源表**按官方码直接建键**
  （如 `INVALID_USERNAME_OR_PASSWORD` · `BANNED_USER`，与 02/03/04 族协议码键同范式）——
  前端**不**维护「官方码 → 我方码」重映射表；**防枚举**由「同一官方码 ⇒ 同一文案」保证
  （用户不存在 / 口令错 / 目录 bind 失败一律 `INVALID_USERNAME_OR_PASSWORD` ⇒ 同一条消息）
- **例外**：官方限流（生产 10s/3）的 429 响应体不带我方码 ⇒ 前端按**状态码**归一为保留码
  `auth.rate_limited`（`apps/web/src/api/auth.ts`）

## 5. API 语言契约

- 前端所有请求携带**当前 UI 语言**：统一走 `Accept-Language` 头（与 `06` label
  displayName 服务端解析链一致）
- 服务端按 `Accept-Language` 解析多语言数据（label displayName 等）；无头/无法识别 → 回退链
- 语言切换后，前端以新语言发起后续请求（旧响应缓存按语言区分或直接失效）

## 6. 边界与后续

- 首期 UI 语言：zh-CN / en；label 数据多语言同上（06 已定义）
- 资产内容语言：不翻译、不入平台多语言体系（内容作者自负责；可后续加
  `content_language` 元数据辅助筛选，后置）
- 管理后台与门户共用同一 i18n 机制与资源结构

## 7. 与相邻文档关系

- `06` §2.3/§5.1：label displayName 多语言解析链（API 契约对齐 §5）
- `01` §5：校验错误 code 结构化返回（本文件 §4 定义前端本地化落地）

## 8. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.13 | 2026-10-09 | sunxuewen-rush | 新增 **`users` 组（60 键）** 与 **`account` 组（13 键）**（zh / en **成对 · 差集 0**）—— M4c-2 账号与权限治理：`/admin/users` 用户管理页（列表 / 字段选择器筛选 / 建号 / 行操作）+ 自助改密 Dialog（批 design §4.2 / §4.5 R21） |
| v1.12 | 2026-10-09 | sunxuewen-rush | **§4 补「官方认证码直通」口径 + 本批增删（M4c-1 T7）** —— ⓐ 新增两条规则：官方码**直通**建键（不设重映射表）· 官方 429 归一保留码 `auth.rate_limited`；ⓑ 键面变更：删 4 条 `auth.*`（`invalid_credentials` / `ldap_denied` / `user_disabled` / `user_pending`）· 增 5 条官方码键（`BANNED_USER` / `INVALID_USERNAME` / `INVALID_USERNAME_OR_PASSWORD` / `USERNAME_TOO_LONG` / `USERNAME_TOO_SHORT`，后四条**同文案 = 防枚举**）；ⓒ zh/en 双向差集 **0**（`doc-claims-check` 实测） |
| v1.11 | 2026-09-30 | sunxuewen-rush | **§3 资源组清单补 `dashboard` 组 + 新增 §3.2 落地注记**（M4b-8 T10 回填）—— §3 正文补 `dashboard`（个人工作台 · **M4b-4 已落地：14 键**）；**§3.2 新表**逐条列 14 键 + zh/en 零差集 + 归属（M4b-1 骨架 / M4b-4 落地）+ 消费点（`pages/Dashboard.tsx`）；**顺带订正** §3 正文 `publish` **57 → 64**（与 §3.1 表对齐）。**零实现改动** |
| v1.10 | 2026-09-29 | sunxuewen-rush | `publish` 组 **62 → 64**（+2 新增 · 零退役 · 零改值）—— **T15 版本号自识别缺陷修复**（用户实测报缺陷）：`field.asset.inflight`「在途 {version}」（资产上下文行；原「暂无版本」在压着在途版本时**不实** ⇒ **F253**）· `field.version.occupied`「{version} 已被占用（{state}），建议改 {suggested}」（占号**前置**提示 · 状态词**复用** `version.status.*`）|
| v1.9 | 2026-09-29 | sunxuewen-rush | `publish` 组 **62 → 62（净 0）**（T14 整页版式重做 · 方向 B 双栏工作台）：**+1 键**（`summary.title`「识别摘要」—— 右栏识别摘要卡标题）· **退役** `flow.note`（③ 段按钮下方小字撤除：句中「三步」= 后端链路，与页面三段相撞 ⇒ **F251**）· **改值** `action.publish`（「发布（新建 → 上传 → 提交审核）」→「发布」）· 摘要三行标签与段卡状态徽标**复用**既有键（`field.slug` / `field.type` / `field.version` / `state.*`）|
| v1.8 | 2026-09-29 | sunxuewen-rush | `publish` 组 **59 → 62**（T13 ① 段视觉重做 · 方向 A 聚焦式）：+4 键（`field.file.dropActive` / `field.file.limit.package` / `.file` / `.count`）· **退役** `field.file.hint` · 改值 `field.file.drop`；`error.rateLimitedCountdown` 转活（**F250**） |
| v1.7 | 2026-09-29 | sunxuewen-rush | `publish` 组 **58 → 59**（T12 ① 段（上传）空态照搬 ClawHub）：`field.file` **改值**（「包文件」→「先上传资产包」· 计数不变）+ 新增 `field.file.drop`（拖拽引导「把 zip 包拖到此处。」· zip 语义 - ClawHub 原文为 skill **folder**）；上限文案 `field.file.hint` 未改值、仅下沉到按钮下方 |
| v1.6 | 2026-09-29 | sunxuewen-rush | `publish` 组 **57 → 58**（T11 渐进披露）：`publish.subtitle` **改值**（**F247** —— 原文案与 T10 改名后的 IA 脱节）+ 新增 `subtitle.empty`（未展开态上传引导）· zh/en 各 58 |
| v1.5 | 2026-09-29 | sunxuewen-rush | `publish` 组 **键名换血**（M4b-7 T10 信息架构重组）：`step.create/step.upload/step.submit` → `step.upload/step.detect/step.publish`（键数净 0 · 仍 57） |
| v1.4 | 2026-09-29 | sunxuewen-rush | `publish` 组键数 56 → **57**：验收期第 2 键 `field.file.remove`（已选态 × 移除 · M4b-7 T7 · 文案键 = × 的 `aria-label` / `title`） |
| v1.3 | 2026-09-29 | sunxuewen-rush | `publish` 组键数订正 55 → 56：M4b-7 验收期拖拽上传新增 `field.file.notZip`（zh/en 各 56 · 零差集）· 复议结论「原 55 值正确，+1 来自增量」 |
| v1.2 | 2026-09-09 | sunxuewen-rush | M4a 市场门户双语资源落地注记：zh 真源 + en 完整对齐四组字典；lang 系统跟随 + localStorage（实现见 `M4a-marketplace.md` T8） |
| v1.1 | 2026-09-07 | sunxuewen-rush | 实现状态同步：文档定稿标注（M1 无前端，UI 资源随 M4 铺开） |
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：zh/en 双语、默认跟随系统、手动切换、错误码本地化、API 语言契约 |

### 3.1 `publish` 组落地注记（M4b-7 T10 回填 · 键数经 M4b-7 验收期复议）

| 项 | 实测值（2026-09-28 · 键数行 2026-09-29 复议） |
|---|---|
| 键数 | **64**（设计值 55 + 验收期增量 **9 键**：`field.file.notZip`（非 zip 提示）· `field.file.remove`（× 移除）· **`subtitle.empty`**（T11 未展开态的上传引导）· **`field.file.drop`**（T12 ① 段空态的拖拽引导）· **`field.file.dropActive` + `field.file.limit.package` / `.file` / `.count`**（T13 视觉重做；同批**退役** `field.file.hint`）；zh 62 / en 62 逐键回读 · 零差集，由 `Dict = typeof zh` 类型 + 脚本双验） + **T14 净 0**（+`summary.title` · 退役 `flow.note`〔**F251**〕· 改值 `action.publish`） + **T15 +2**（`field.asset.inflight`〔D26/F253〕· `field.version.occupied`〔D27/F253〕） |
| `errors` 组联动 | **42 → 68**（新增 26 = 20 族协议码 + 6 业务码） |
| 占位符 | `{package}` `{file}` `{count}` `{version}` `{seconds}` —— **键内名与调用点参数名必须一致**（M4b-7 F230 实锤：曾因 `maxFiles` ≠ `{count}` 原样渲染） |
| 本地化归属 | 码 = 契约（服务端/协议），文案 = **客户端本地化**（AIH 独家；CLI 只透码） |
| 键名变更（v1.5） | `step.*` 三族键名随 IA 重组换血：`step.create`/`step.submit` **删除**、`step.upload` **改值**（「上传版本」→「上传」）、新增 `step.detect`/`step.publish`（+ 三 hint 改写）⇒ **总数不变（57）**；旧键名**代码面零残留**（`grep -rn 'step\.create\|step\.submit' apps/web/src` = 0 —— 本文档仅保留变更留痕） |
| T11 增量（v1.6） | `publish.subtitle` **改值**（原文案「新建 → 上传 → 提交审核」与 T10 改名后的 IA 脱节 ⇒ **F247**）为「核对识别出的资产详情，确认后发布」+ 新增 `publish.subtitle.empty`（未展开态 ⇒ 上传引导）⇒ 键数 **57 → 58** |
| T12 增量（v1.7） | ① 段（上传）空态照搬 ClawHub（`publish.tsx:1011-1031` 三层：动作号召 + 拖拽引导 + 落点按钮）—— `publish.subtitle` 不动 · `field.file` **改值**（「包文件」→「先上传资产包」· **计数不变**，该键全仓单点消费）· 新增 `field.file.drop` = 「把 zip 包拖到此处。」（**zip 语义** —— ClawHub 原文是 *Drop a **skill folder** here.*，AIH 只收 zip ⇒ **不照搬字面**）· 硬上限 `field.file.hint` 仅**改位置**（描述位 → 按钮下方官方 `FieldDescription`）⇒ 键数 **58 → 59** |
| T13 增量（v1.8） | ① 段视觉重做（方向 A 聚焦式 · design v1.9 D23）—— 新增 `field.file.dropActive`（拖拽态标题「松手即上传」）· `field.file.limit.package` / `.file` / `.count`（上限 chips 行三项 · 占位符同名纪律照旧）· 改值 `field.file.drop`（补「或点下方按钮选择」）· **退役** `field.file.hint`（上限由整串小字改三项 chips ⇒ 无第二消费点）· （原设计的①段第二出口按钮已随落地期收敛**取消** ⇒ `mode.existing` 仅由 ② 段单选消费）· 429 文案统一 `error.rateLimitedCountdown`（**F250** 孤儿键转活）⇒ 键数 **59 → 62** |
| T14 增量（v2.0） | 整页版式重做（方向 **B 双栏工作台** · 增量 design v2.0 D24）—— 新增 `summary.title`（右栏识别摘要卡标题「识别摘要」/ `Detected summary`）· **退役** `flow.note`（③ 段按钮下方小字撤除：句中「三步」= 后端链路，与页面三段相撞 ⇒ **F251**）· **改值** `action.publish`（「发布（新建 → 上传 → 提交审核）」→「发布」—— 旧括号描述旧链路）· 摘要三行标签与段卡状态徽标**复用**既有键（`field.slug` / `field.type` / `field.version` / `state.*`）⇒ 键数 **62 → 62（净 0）** |
| T15 增量（v2.1） | 版本号自识别缺陷修复（增量 design **v2.1** D25–D27 · **F252/F253**）—— 新增 `field.asset.inflight`（「在途 {version}」/ `In flight {version}`：资产上下文行在「压着在途版本」时不再谎报「暂无版本」）· 新增 `field.version.occupied`（「{version} 已被占用（{state}），建议改 {suggested}」/ `{version} is taken ({state}) — try {suggested}`：占号**前置**提示）⇒ 键数 **62 → 64**；`{state}` **复用**既有 `version.status.*` 八键（零新增状态文案）|
