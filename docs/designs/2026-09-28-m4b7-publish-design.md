# M4b-7 发布批：Web 发布流（新建资产 + 单 zip 上传 + 一键提审）—— 批设计

> Date: 2026-09-28
> Updated: 2026-09-30（**v0.18：M4b-7 批次完成** —— 出口五件全绿（观感 ✅ 用户 2026-09-30 实机确认）· 整体审计无未决项 · findings F259–F261）
> Updated: 2026-09-30（**v0.17：M4b-7 整体审计（十一维）· findings F259–F261 · 无未决项** —— F259 已修 · F260/F261 登记不修）
> Updated: 2026-09-30（**v0.16：F246 闭合（跨档文档事故修复）** —— §9.8 F246 行标注**已修复**（用户拍板 1B）· §11.12 门槛行改「**无未修项 · 无挂账**」（F246/F255/F256/F257/F258 全闭合）；修复实体 = M4b-2 轮 **27 处**断尾行归位合并回单行（`docs/00` 7 · M4b-2 设计 14 · M4b-2 计划 6）· **内容零改动**（204 条续行逐条校验仍是文件子串）· 顺带补门禁判据 + 仓规例外显式化。**零代码改动**）
> 头部口径（2026-09-18 起）：只留最近 1-2 版 · 不复述历史与验收数字；更早版本见 §12 修订记录
> Status: **定稿**（**2026-09-28 用户批准**）· 6 轮换靶自检 + grilling 4 轮（13 条逐条拍板）+ 提交前体检 **4 轮**（末轮 9.46 → 修毕 9.50）· 文档 8 维 = **9.48**（**v0.14 回填轮** · §11.12；定稿当时为 **9.50** · §11.11 —— 口径差异见 §11.12 说明）· **未修项 0** · 已回填主 design（**v1.75 → v1.76**）与 `docs/00`（**v1.99 → v1.100**）（§9.6 十二处全部落地）· 批 plan = `docs/plans/M4b-7-publish.md`（**v0.4**）⇒ **后续实现以批 plan 为准**
> Scope: 本批 = `docs/00` §5「M4b-7」行（发布批）—— 件面 **新建 10 / 改造 25 = 35 件**（代码/规范/CI/账目件 · §3.1/§3.2）· 另有**同步点文档 2 份**（主 design · `docs/00`，§9.6 单列不计入件面）· 服务端 **1 项只读端点新增 + 2 处上限默认值**（§5 · **零写面改动**）
> 引用链: 上游主 design `2026-09-10-m4b-admin-console-and-auth-design.md`（§2.1 R2 · §2.3 拆批表/预登记/批件登记 · §4 入口 · §5.1 职责 · §5.2 路由 · §8 预告）· 规范 `docs/07` §3/§4（i18n）· `docs/02` §4 / `docs/04` §5（族错误码表）· 前序批 M4b-1（组件底座）/ M4b-2（认证底座）

## 1. 背景与批界

### 1.1 位置与依赖链

M4b（管理后台）拆八批中的第 7 批。前序 M4b-1…M4b-6 已交付（壳 / 认证 / 提交与令牌 / 个人面 / 审核台 / 治理面）。
本批 = **把「发布」收进 Web 产品内**：不装 CLI 也能发布 —— 新建资产 + 传单个 zip → 走完提审。
依赖：M4b-1（控制台组件底座：`PageHeader` / 表格族 / 官方件层）· M4b-2（认证底座：会话、`RoleGuard`、`?next=` 回跳、`Toaster`）。
下游：M4b-8（视觉收口层覆盖本页，见主 design §2.3 视觉收口层边界）。

### 1.2 入口与靶件现状（真码实测，2026-09-28）

| 事实 | 证据（`file:line`） |
|---|---|
| `/dashboard/publish` **无路由**；登录段 = `RoleGuard minRole=USER` 包 `AppShell`，内含 `/dashboard` · `/dashboard/assets` · `/dashboard/submissions` · `/dashboard/tokens` · `/reviews/:id` | `apps/web/src/main.tsx:137-153` |
| 侧栏「个人」组 **4 条**（工作台 / 我的资产 / 我的提交 / 我的令牌），**无「发布」** | `apps/web/src/components/ui/navItems.tsx:88-117` |
| 占位机制现成：条目 `to === undefined` ⇒ 渲染 `<button>` + `sonner` 轻提示（先例 = 管理组「系统设置 / 用户管理」） | `apps/web/src/components/ui/navItems.tsx:33-36`（接口注释） |
| 顶栏现 = `SidebarTrigger` + 右侧（`AssetSearch` `w-[320px]` `<lg` 隐藏 + `LanguageSwitcher`），**无「发布」** | `apps/web/src/components/ui/TopBar.tsx:58-82` |
| `AssetAdminCard` 版本组「发布新版本」= **禁用占位**，注释点名归本批 | `apps/web/src/components/console/AssetAdminCard.tsx:148-160` |
| web 写面缺口：`api/assets.ts` **无** `createAsset` · `api/versions.ts` **无** `uploadVersion` | `apps/web/src/api/assets.ts`（5 个导出）· `api/versions.ts`（4 个导出） |
| 撤回通道**已存在可复用**：`POST /api/reviews/:id/withdraw`（PENDING → UPLOADED，**204**）· 前端 `withdrawReview` 已在 M4b-3 落仓 | `apps/server/src/http/reviews.ts:140` · `apps/web/src/api/reviews.ts`（`Submissions.tsx:183` 消费） |
| 三端点（M2/M3 已交付）：注册 `POST /api/assets`（**201**）· 上传 `POST /api/assets/:slug/versions`（multipart，**201**）· 提审 `POST /api/assets/:slug/versions/:version/submit`（**201**，返回 `{ taskId, reviewVersion, status:'PENDING_REVIEW' }`） | `apps/server/src/http/assets.ts:209` · `:503` · `:647`（响应体 `:693-696`） |
| 上传后**版本状态 = `DRAFT`**（校验同步、无异步 SCANNING 分支）；提审前态门 = 仅 `DRAFT`/`UPLOADED` 可 submit ⇒ **一键链第二跳无状态竞态** | `apps/server/src/assets/versions.ts:100,160`（`status:'DRAFT'`）· `errors.ts:19` |
| 上限默认值（代码真值，env 可覆盖）：总包 **10 MiB** · 单文件 **1 MiB** · 文件数 **100** | `apps/server/src/config/env.ts:42-52` |
| **无** `GET /api/meta/*` 任何端点；路由注册表 = `/api/{auth,assets,me,tokens,reviews,labels,stats,audit,admin}` | `apps/server/src/app.ts:127-214`（无 `api/meta` 行） |
| i18n `errors` 组现状 **40 键**（zh/en 各 40，成对）；`publish` 组**名已预留、字典内无该组** | `apps/web/src/i18n/zh.ts:554-` · `en.ts:554-` · `docs/07-i18n-conventions.md:31` |
| 协议错误码全集 **20**（`protocolErrorCodes`）· 资产域业务码全集 **18**（`assetErrorCodes`） | `packages/protocol/src/errors.ts:7-32` · `apps/server/src/assets/errors.ts:8-42` |
| 落地位置名已预登记：`2026-09-28-m4b7-publish-design.md` / `M4b-7-publish.md` | 主 design §2.3:154,168 · `docs/00` §5:106 |
| 无 `apps/server/.env.example`；**根** `.env.example` 存在 | `ls .env.example`（根） |

### 1.3 批界

**In（本批交付）**

1. **发布页 `/dashboard/publish`**：新建资产（`slug`/`type`）或选用已有资产 → 单 zip 上传（XHR 进度通道）→ **一键链**（新建 → 上传 → 提审）
2. **页面形态**：左 = 操作（三段同页平铺）· 右 = 流程面板（上传 → 自识别 → 发布 竖排 + 连接线 + 逐态）
3. **三入口**：侧栏「个人」组第 5 条「发布」+ 顶栏「发布」+ 资产卡片「发布新版本」（占位 → 真链接 `?slug=`）
4. **上传通道**：`apiUpload`（XHR + `upload.onprogress` + `abort`，**不替换** `fetch` 客户端）
5. **错误面**：413 超限 / 429 限流 / 400 `issues[]` 包校验 / 400 `request.invalid` / 403 CSRF / 404 / 409 slug 冲突 / 409 版本号冲突
6. **服务端 1 项只读端点** `GET /api/meta/limits` + **2 处上限默认值**（总包 10 → 100 MiB · 单文件 1 → 10 MiB）
7. **i18n**：新组 `publish`（**55 键**）+ `errors` 组扩 26 键（20 协议 + 6 本页可达业务码）
8. **规范层回填**：`docs/02` §4 / `docs/03` §4 / `docs/04` §5 错误码表（族码建议 i18n / 缺表补齐）
9. **dogfood 分组九段 + 造数脚本**（写库须授权，见 §9.5）

**Out（不在本批）**

1. **CLI 发布通道**（归 M5）——本批只做 Web 通道，两条通道不混
2. **三段同页平铺 + 单按钮**（表单与流程同屏：右侧流程面板给**逐态**，**不设分步向导**）
3. **UI 可配上限**（上限的界面化配置归 **M4c**，与 `ACCESS_POLICY` 合并；本批只落默认值 + 只读端点）
4. **资产管理 / 生命周期动作**（`patchStatus` / 删除 / yank —— M2/M3/M4b-6 已交付，本批只**复用**，不改行为）
5. **资产详情页整页改版**（只把卡片内「发布新版本」占位换成真链接）
6. **「提交后自动清理空资产」类自动回收**（原型轮已定：失败即停 + 显式出口「放弃该资产」+「撤回提交」）

## 2. 拍板结果（本批）

> 口径：只记**拍板结果**；被否决方案不入档（用户口径「污染」）。来源 = 对齐轮（逐条口头拍板）+ 线框 v2（「方向 ok」）+ 可点原型 7 轮（逐轮口头修正）。

### 2.1 本批全部拍板结果（D1–D26）

| # | 决策 | 结果 |
|---|---|---|
| D1 | 页面形态 | **单页三段**：上传 / 自识别 / 发布 同页平铺，**不折叠、不翻页、无「下一步」**（原型轮第 3 轮修正） |
| D2 | 流程面板位置 | 流程（上传 → 自识别 → 发布）**显示在右侧**：竖排三段 + 连接线 + 逐态文字；**非**逐行与左栏对齐（第 5 轮方案已撤回） |
| D3 | 点击次数 | **单按钮一次点击**（第 4 轮定）：`发布` 一条链跑完（后端三跳 = 新建 → 上传 → 提审；页面文案不外显该链 —— T14） |
| D4 | 提审口径（**翻转**） | 原文「上传落 DRAFT + **手动**提审 · 不做自动提审」**作废** ⇒ 一键链自动提审；「可撤回」改由完成态「撤回提交」承担（同步点见 §9.6） |
| D5 | 失败语义 | 任一跳失败 ⇒ **停在该步**（右栏该步「未通过」+ 左栏就地错误），**不自动回滚** |
| D6 | 残留出口 | ① 资产已建而上传失败 ⇒ 左栏「**放弃该资产**」（二次确认 → `DELETE /api/assets/:slug`）② 已提审 ⇒ 完成态「**撤回提交**」（→ `POST /api/reviews/:id/withdraw`） |
| D7 | 发布对象二选一 | 「新建」与「**选用已有资产**」两件都做（选已有 = 给资产发新版本） |
| D8 | 选已有的入口 | ① 页内下拉（读**真实** `GET /api/me/assets`）② 资产卡片「发布新版本」→ `/dashboard/publish?slug=`（占位换真链接） |
| D9 | 空壳公开 | **接受**「新建即公开空壳」（`asset.status` 默认 `ACTIVE`、读面不要求有版本）⇒ 页内给提示 + 登记为接受项（§2.4） |
| D10 | 版本号预填 | 新建 = `1.0.0`；已有资产 = 其最新版**补丁号 +1**（撞号继续 +1 直到空缺）· 前端**只判非空** |
| D11 | 前端预校验 | **不做**格式预校验（`slug` 形态 / semver / zip 结构一律交服务端判定） |
| D12 | changelog | 纳入（官方 `Textarea`，可选，≤4096） |
| D13 | 上传通道 | 新增 `apiUpload`（XHR，**私有复用** `doFetch` 的 401 四分类与错误归一语义）· **不替换** `fetch` 客户端；`apiPost` 等既有写面不动 |
| D14 | 进度件 | 落**官方** `progress.tsx`（`radix-ui` 已在依赖内，**零新依赖**） |
| D15 | 取消 | 支持取消（`xhr.abort`），文案明示**尽力而为**（详见 §4.5） |
| D16 | 上限值（**变更**） | 总包 `10 MiB → 100 MiB` · 单文件 `1 MiB → 10 MiB` · 文件数 100 **不变** |
| D17 | 上限默认值落点 | 只落**代码** `config/env.ts` 的 `.default()`（出厂真值家）+ 补**根** `.env.example` 三项；**不写进** `apps/server/.env` |
| D18 | 前端上限来源 | 读 **`GET /api/meta/limits`**（新只读端点），失败回落前端常量 `100 MiB`；**UI 可配**归 M4c |
| D19 | issues 展示 | 摘要（`Alert`：共 N 处 + 资产已创建提示）+ **前 5 条** + 「展开全部 N 条」 |
| D20 | 409 展示 | **字段级行内**错误（官方 `FieldError`），不用 toast |
| D21 | i18n 组 | 新建 `publish` 组（选已有 / 流程 / 错误面全量）；`errors` 组扩 26 键 |
| D22 | 侧栏入口 | 「个人」组**第 5 条**（末位）· 图标 `Upload`（全仓零占用）· 文案 `publish.title` |
| D23 | 顶栏入口 | 图标 + 文字 ghost 变体，置于**搜索左侧**（`<lg` 与搜索同段隐藏口径另见 §4.7） |
| D24 | 未登录点击 | 轻提示 toast（`publish.loginRequired`）+ 跳 `/login?next=/dashboard/publish`（白名单 `/dashboard` 前缀**已覆盖**，零改动） |
| D25 | 评审两步走 | 线框（HTML）→ 可点原型（独立 dev 入口）→ 本 design 定稿；原型物料**不进仓**，评审后删 |
| D26 | dogfood 口径 | 止步 **PENDING_REVIEW**（不 PUBLISHED）· 造数可删 · 零回归换靶（§9.3） |
| D27 | 顶栏入口窄屏口径（**grilling 1A-2**） | `<1024px` **不隐藏**，收敛为**纯图标**按钮（`size="icon"` + `aria-label`）——理由：入口可达性；未登录用户看不到顶栏入口就丢掉了「点击 → 回登录」提示 |
| D28 | 右栏「当前步」可回退（**grilling 2A-2**） | **不做**：与 D5「停点不回滚」冲突（回退需处理「资产已建 / 包已传」残留）；若要，另批设计 |
| D29 | 官方件 2 只（**grilling 3A-1**） | 确认新增 `progress.tsx` / `radio-group.tsx`（官方 registry 源码件 · **零新依赖**），依既有口径「官方件优先、禁手搓结构件」 |
| D30 | 撤回通道（**grilling 4A-1**） | 确认「撤回提交」= `POST /api/reviews/:id/withdraw`（PENDING → UPLOADED · **204** · M4b-3 已落仓复用）——**不是**删版本（PENDING_REVIEW 属禁删态） |
| D31 | `publish` 组键表（**grilling 5A-1**） | 按 §6.2 表落（**55 键** —— v0.5 归一键 1 处：错误码文案不进本组，见 §6.2 注）；实现期**复用优先**（`common` 组已有等价键则以复用为准），键数实测后回填（§9.7 ②） |
| D32 | 三段容器结构（**官方件轮 1A**） | 每段 = 官方 **`FieldSet` + `FieldLegend`**（`<FieldGroup>` 包字段），外层加官方 **`Card`** 作视觉边界（T14）；**段图例 = 状态记号 + 段名 + 右侧状态徽标**（T14 去数字 —— 原「编号圆点注入」作废，与右栏流程面板同形态）——**废**自造「编号 + `<h2>`」分组标题（依既有口径「官方件优先、禁手搓结构件」） |
| D33 | 字段错误联动（**官方件轮 2A**） | 字段级错误一律 **`<Field data-invalid>` + 控件 `aria-invalid` + `<FieldError>`** 三件同批（官方「Field」页配方）；缺 `data-invalid` 官方错误样式不生效 |
| D34 | 上传「未选文件」呈现（**官方件轮 3A**） | 用官方 **`Empty` 完整配方**：`Empty`（`className="border border-dashed"`）+ `EmptyHeader`（`EmptyMedia variant="icon"` = `Upload` + `EmptyTitle` + `EmptyDescription` = 上限文案）+ `EmptyContent`（「选择 zip 文件」按钮）——**直连** `empty.tsx`，不经 `EmptyState` 薄封装 |
| D35 | 「选用已有资产」零资产空态（**官方件轮 4A** · **F2 订正按钮语义**） | 用官方 **`Empty` + 动作出口**：`EmptyContent` 内**单按钮 = 改用「新建」支**（**页内切支**，零外链 —— 原拟「去首页 / 用 CLI」作废：CLI 归 M5 **未交付**、帮助页不存在，指过去是死路）|
| D36 | `EmptyState` 薄封装是否扩（**官方件轮 5A**） | **不扩**：本页直连官方 `Empty`，保持 `EmptyState`（只吃 `message`）与 **8 处既有消费零回归**；扩它属跨批重构，另批议 |
| D37 | 版本号预填与撞号（**grilling 第 1 轮 G1**） | **只按 `latestVersion` 推 patch+1**（**不**拉该资产版本列表）；撞号 **409 ⇒ 字段行内提示交用户手改**（不做自动重试 / 不做自动规避）⇒ **同时订正 D10 措辞**（原「撞号继续 +1 到空缺」作废）· 含 `-pre` ⇒ **剥 pre 段补位**（`2.0.0-pre` ⇒ `2.0.0`） · **T15/D25 取代数据源口径**：改读**真实占号集合**（`GET /assets/{slug}/versions` · 排除 `SCAN_FAILED`）⇒ 增量 design **v2.1** §3.4 · **F252**；其余（不自动重试 / 409 交用户手改 / `-pre` 剥段）不变 |
| D38 | 资产选择器取数（**grilling 第 1/2 轮 G2**） | 用官方 **`Combobox`**（仓内已有）替代 `Select`；输入 **300ms 防抖**走服务端 `GET /api/me/assets?q=`；空查询拉 `limit=100`（服务端上限）⇒ **单次查询上限 100 条**（撤回对齐轮「不写死条数」的说法） |
| D39 | 「放弃该资产」可见边界（**grilling 第 1 轮 G3**） | **严格**：仅当「**本页会话内创建** ∧ **该资产零版本**」时显示（只服务失败停点）—— 理由：服务端 `DELETE /api/assets/:slug` 会**连带删掉全部版本与 review_task 行**且只拦 PUBLISHED/YANKED（`http/assets.ts:451-500` 实测）⇒ 提审后露出该按钮 = 绕撤回的删除口 |
| D40 | 客户端大小预检（**grilling 第 1 轮 G4**） | **预检 + 即时行内提示**（用 `GET /api/meta/limits` 的 `packageMaxBytes` 比对选中文件 `size`），**仍允许提交**，最终以服务端 413 为准；**单文件大小**客户端不可知 ⇒ 不预检 |
| D41 | 上传中离开页面（**grilling 第 1 轮 G5**） | 组件**卸载即 `abort()`**（切页 / 刷新 / 关标签）—— 与「取消上传」同一通路；**不做** `beforeunload` 拦截；文案沿用 C7「尽力而为」 |
| D42 | 失败态「资产已有版本」的出口（**grilling 第 2 轮 G6**） | **不给**「放弃该资产」⇒ 改文案 `error.versionedAssetHint` 引导去**「我的资产」**自行删除（那里有删除入口 + 服务端拦 PUBLISHED/YANKED） |
| D43 | 429 限流时主按钮（**grilling 第 2 轮 G7**） | **倒计时禁用**：秒数取响应 `retryAfterSec`，文案 `error.rateLimitedCountdown`（`{seconds}`）；倒计时结束自动恢复；期间不发新请求 |
| D44 | 撤回成功后的页面态（**grilling 第 2 轮 G8**） | 结果块就地改 **「已撤回」**（`done.withdrawn`）+ 保留「再发布一个」；**不整页复位、不跳转**（版本回 `UPLOADED`，后续去「我的资产」处理） |
| D45 | `?slug=` 无效（**grilling 第 2 轮 G9**） | **忽略参数、回落「新建」** + 轻提示 `assetNotFound`（资产不存在 / 不在我名下 / 已删的旧链接） |
| D46 | 资产搜索的 URL 口径（**grilling 第 3 轮 G10**） | **复用** `useMarketQuery`（零新代码）⇒ 本页 URL **读 `?slug=`、写 `?q=`**；§4.8 的 URL 契约同步订正（原「无状态参数写入 URL」作废）· 否决「给共享 hook 加开关」（回归面 = 门户三页 + 个人面两页） |
| D47 | 选中资产的上下文行（**grilling 第 3 轮 G11**） | 选中项下方显示一行小字 **`field.asset.latest`「当前最新版 {version}」**；`latestVersion === null`（空壳）⇒ `field.asset.latestNone`「暂无版本」 · **T15/D26 取代取值**：`latestVersion === null` ⇒「暂无版本」**仅当占号集合为空**时成立；含在途版本 ⇒「在途 {version}」（**F253**） |
| D48 | 「版本数」是否展示（**grilling 第 4 轮 G12**） | **去掉**：列表读面 `AssetItem` **无版本数字段**（实测 `types.ts:45-65` · `asset-item.ts:43-45`），**不为它破本批「零写面改动」** 口径 |
| D49 | 空壳资产预填（**grilling 第 4 轮 G13**） | 选中资产 `latestVersion === null` ⇒ 预填 **`1.0.0`**（与「新建」同） |

### 2.2 承接主 design 的跨批契约（引用不复制）

| 契约 | 出处 | 本批处置 |
|---|---|---|
| 页面职责：`/dashboard/publish` = 新建资产 + 单 zip 上传（进度）+ 提审 · 任何登录用户 | 主 design §5.1:374 · §5.2:396 | ✅ **已执行**（2026-09-28 定稿回填）：职责行与路由行措辞已改「**一键链**提审」+ 两出口（§9.6 · 主 design **v1.76**） |
| 三端点 + 归属（注册 / 上传 / 提审） | 主 design §5.2:396 · §8:674 | 复用，**不改契约** |
| `?next=` 白名单 = `/dashboard` `/admin` `/reviews` `/device` | `apps/web/src/auth/next.ts` | **零改动**（`/dashboard/publish` 天然命中） |
| 视觉体系 SSOT = M4a design §4.4 | 主 design §2.3 视觉职责边界 | 本页不另立视觉；收口归 M4b-8 |
| 角色四档 / 判定 `role >= N` | 主 design §2.1 | 本页门槛 = **任何登录用户**（`ROLE.USER`） |
| 占位条目形态（`to` 缺省 ⇒ `<button>` + 轻提示） | `navItems.tsx:33-36`（接口注释）· **`SideNav.tsx:236,253`（实现：`gate === 'authed'` 判组 · `toast(t('common','comingSoon'))`）** | 复用为「未登录点击 = 轻提示」的现成形态依据（N5 补实现落点） |

### 2.3 官方件装配与复用清单

| 件 | 处置 | 依据 |
|---|---|---|
| `field.tsx`（**官方全量 10 子件已在仓**：`FieldSet` / `FieldLegend` / `FieldGroup` / `Field` / `FieldContent` / `FieldLabel` / `FieldTitle` / `FieldDescription` / `FieldSeparator` / `FieldError` · 232 行 = 官方逐件拷贝） | **复用**（**本批首次用满**：`FieldSet`+`FieldLegend` 分组 · `Field data-invalid` 联动 · `Field orientation` 横向排版 —— D32/D33） | 三段容器 + 字段错误 + 二选一横向排版（官方「Field」页配方） |
| `empty.tsx`（**官方全量 6 子件已在仓**：`Empty` / `EmptyHeader` / `EmptyMedia` / `EmptyTitle` / `EmptyDescription` / `EmptyContent` · 93 行） | **复用**（本页**直连完整配方**：`EmptyMedia variant="icon"` + `EmptyContent` 动作 —— D34/D35） | 上传「未选文件」+「零资产」两处空态（含动作出口） |
| `EmptyState.tsx`（console 薄封装：只吃 `message`，**无** `EmptyMedia`/`EmptyTitle`/`EmptyContent`） | **不扩**（D36） | 扩它影响 8 处既有消费 ⇒ 本页直连官方件，薄封装留待另批 |
| `alert.tsx` · `button.tsx` · `skeleton`/`spinner`（载态） | **复用** | issues 摘要 / 动作 / 读面载态 |
| `progress.tsx` | **新增**（官方 registry · **用户 2026-09-28 拍板 3A-1**） | D14；`radix-ui` 单包已含 Progress ⇒ **零新依赖** |
| `radio-group.tsx` | **新增**（官方 registry · **用户 2026-09-28 拍板 3A-1**） | 「新建 / 选用已有资产」= 结构件 ⇒ 依既有口径「官方件优先、禁手搓结构件」（原型用原生 `input[type=radio]` 属评审临时态） |
| `sonner`（toast）· `ConfirmDialog` | **复用** | 轻提示 / 「放弃该资产」「撤回提交」二次确认 |
| `PageHeader`（`components/console/`） | **复用** | 页面标题区（体例同控制台各页） |
| 「发布新版本」按钮 | **改造**（`AssetAdminCard.tsx:148`，占位 → `<Link>`） | D8 |

> **零新依赖**：本批不新增任何 npm 包（`progress` / `radio-group` 走官方 registry 源码件）。

### 2.4 数据口径与交互默认值

| # | 项 | 值 / 口径 |
|---|---|---|
| C1 | 上限来源与回落 | `GET /api/meta/limits` → `{ packageMaxBytes, fileMaxBytes, maxFiles }`；请求失败 ⇒ 前端常量 `100 MiB / 10 MiB / 100`（**仅用于文案**，判定恒在服务端） |
| C2 | 文案单位 | 前端把字节**换算成 MiB** 展示（`≤ {package} MiB`），不显示原始字节 |
| C3 | 版本号预填算法（**v0.4 订正**） | 新建 = `1.0.0`；已有资产 = 取列表项的 `latestVersion` → `major.minor.(patch+1)`；`latestVersion === null`（空壳）⇒ `1.0.0`；含 `-pre` ⇒ 剥段补位；**撞号（409）⇒ 行内提示用户手改**（**不**自动重试、**不**拉版本列表做规避 —— D37） · **T15/D25 取代数据源**（`latestVersion` → 真实占号集合 · 增量 design v2.1 §3.4 · **F252**） |
| C4 | 版本号格式门 | 前端只判**非空**；格式（`^\d+\.\d+\.\d+(-pre)?(\+build)?$`）由服务端判 → 400 `request.invalid` |
| C5 | `slug` 格式门 | 前端只判**非空**；形态由服务端判（注册 400 `request.invalid`）· 冲突 = 409 `asset.slug_taken`（**字段级行内**） |
| C6 | 空壳公开（**接受项**） | 新建成功的资产在**有版本前**即对公开读面可见（`status=ACTIVE` 默认 + 读面不要求版本）——本批**不引入**「未发布不可见」新状态；页内以 `assetCreated.hint` 提示，并在 §9.5 造数里登记可删 |
| C7 | 上传「取消」语义 | `abort()` = 客户端停止发送；若字节已送达且服务端已开始写库，**版本可能已建** ⇒ 文案明示，且取消后页面**重取**一次 `GET /api/assets/:slug/versions` 判定真实态（不做断言式删除） |
| C8 | 进度条归属 | 进度落 **① 段（上传）**（`Progress` + `upload.progress` · T13）；右栏流程行**不含进度**（原行内进度条件与 `panelStates` 取值域不相交 ⇒ 该分支**已删** —— **F255** · 1B · 2026-09-29） |
| C9 | 每跳超时 | 上传/提审沿用客户端既有默认（`doFetch` 期）；**不新增**自定义超时（本批不定毫秒数，避免幻数） |
| C10 | 三跳的审计副作用 | 注册 `asset.register` · 上传 `version.*` · 提审 `review.*`（服务端既有行为，本批不改） |
| C11 | 资产选择器取数（D38） | 官方 `Combobox` + `useMarketQuery` 的 `q`（300ms 防抖）⇒ `GET /api/me/assets?q=&limit=100`；空查询 = `limit=100`；**单次查询上限 100 条**（服务端 `limit` 上限） |
| C12 | 选中资产上下文行（D47/D48） | 一行小字 `field.asset.latest`「当前最新版 {version}」/ 空壳 ⇒ `field.asset.latestNone`；**不含版本数**（D48） · **T15/D26 扩写**：取值源加**占号集合** ⇒ 含在途版本显示「在途 {version}」（新增键 `field.asset.inflight` · **F253**） |
| C13 | 客户端预检（D40） | 仅预检**总包**（`packageMaxBytes` vs `file.size`）⇒ 超限**行内即时提示**、**不禁用提交**；单文件/文件数不预检（客户端不可知） |
| C14 | 限流倒计时（D43） | 429 ⇒ 主按钮 `disabled` + `error.rateLimitedCountdown{seconds}`；倒计时归零自动恢复可用；倒计时期间不发请求 |
| C15 | 复位语义（D45 补充） | 「再发布一个」= 清 `slug` / 文件 / `changelog` / 版本号 ⇒ 回落「新建」+ `1.0.0`（不复选已有资产、不清 `?q=` 搜索词） |
| C16 | 卸载语义（D41） | 组件卸载 ⇒ `abort()` 进行中的上传（与「取消上传」同一通路）；无 `beforeunload` |
| C17 | 本页 URL 契约（D46） | **读** `?slug=`（深链预选）· **写** `?q=`（`useMarketQuery` 管理）· 其余状态（步骤态/文件/版本号）**不落 URL** |

## 3. 件与路由规格

### 3.1 新建件（10）

| # | 文件 | 职责 |
|---|---|---|
| N1 | `apps/web/src/pages/Publish.tsx` | 发布页（左栏三段 + 右栏流程面板；消费 N2 的链编排） |
| N2 | `apps/web/src/lib/publish-chain.ts` | **一键链编排**：三跳顺序与前置、失败停点、版本号预填推导（纯函数）。**测试口径（F11 决策化）**：**不新增单测件** —— 实测 `apps/web/src` 单测文件数 = **0**（web 侧零单测先例），预填推导各支由 **dogfood G4/G6 点名覆盖**（正常 +1 / 空壳 `1.0.0` / `-pre` 剥段 / 撞号 409） |
| N3 | `apps/web/src/api/meta.ts` | `fetchPlatformLimits()`（读 `GET /api/meta/limits`，常量兜底） |
| N4 | `apps/web/src/components/ui/shadcn/progress.tsx` | 官方件（D14） |
| N5 | `apps/web/src/components/ui/shadcn/radio-group.tsx` | 官方件（§2.3） |
| N6 | `apps/server/src/http/meta.ts` | `createMetaRoutes()`：`GET /limits`（只读 · 匿名可读，理由见 §5.1） |
| N7 | `apps/server/src/http/meta.test.ts` | 端点用例（出参形状 + 三键值与 env 一致 + 不被环境变量污染） |
| N8 | `docs/smoke/scripts/m4b7-publish-dogfood.ts` | 本批 dogfood（**九段**，§9.3） |
| N9 | `docs/smoke/scripts/m4b7-seed-assets.ts` | 造数脚本（§9.5；写库须授权） |
| N10 | `docs/smoke/scripts/file-ref-closure-check.ts` | **第五道文档门禁（F 方案①）**：**件面 ↔ 引用闭合**双向核对 —— ① §3.1/§3.2 每个路径按 N/M 分档断言（N 为新建：允许不存在；M 为改造：**必须已存在**）② 全文出现的 `apps/**` · `docs/**` · `.env.example` 路径集合 **⊆ 件面 ∪ §9.6 同步点文档 ∪ 历史豁免白名单**（`docs/plans/**` 史实）⇒ 未归属路径即 FAIL。用途：一类「改了口径忘了加件」的残留**机器拦**（本轮 F7 即此类） |

### 3.2 改造件（25）

| # | 文件 | 改动 |
|---|---|---|
| M1 | `apps/web/src/main.tsx` | 加 `<Route path="/dashboard/publish" element={<Publish />} />`（登录段内）· 惰性加载体例随既有；**清 :110 原型残留注释** |
| M2 | `apps/web/src/components/ui/navItems.tsx` | 个人组末位加 `{ to:'/dashboard/publish', text: t('publish','title'), icon:<Upload/> }` |
| M3 | `apps/web/src/components/ui/TopBar.tsx` | 右侧加「发布」入口（图标 + 文字 ghost，置于 `AssetSearch` 左侧；窄屏口径见 §4.7） |
| M4 | `apps/web/src/components/console/AssetAdminCard.tsx` | 版本组「发布新版本」占位 → `<Link to={/dashboard/publish?slug=…}>`（保留 `disabled` 判定依据不变） |
| M5 | `apps/web/src/api/client.ts` | 加 `apiUpload`（XHR；复用 401 四分类 + `{code,message}` 归一 + `Accept-Language`） |
| M6 | `apps/web/src/api/assets.ts` | 加 `createAsset({slug,type})` |
| M7 | `apps/web/src/api/versions.ts` | 加 `uploadVersion(slug, {file,version,changelog}, {onProgress,signal})` |
| M8 | `apps/web/src/i18n/zh.ts` | 新组 `publish`（**55 键**）+ `errors` 组扩 26 键 |
| M9 | `apps/web/src/i18n/en.ts` | 同上（en 侧成对，键集合须与 zh **零差集**） |
| M10 | `apps/server/src/app.ts` | 注册 `app.route('/api/meta', createMetaRoutes())` |
| M11 | `apps/server/src/config/env.ts` | `ASSET_PACKAGE_MAX_BYTES` 默认 `10 → 100 MiB` · `ASSET_FILE_MAX_BYTES` 默认 `1 → 10 MiB`（注释同步） |
| M12 | `.env.example`（根） | 补三项上限（**注释形式** + 注明默认值） |
| M13 | `docs/02-skill-protocol.md` | §4 错误码表：补「建议 i18n」列缺项 + 与 `protocolErrorCodes` 对齐 |
| M14 | `docs/03-mcp-bundle-protocol.md` | §4 **新增**族错误码表（现 §4 = 凭据安全规则，无码表） |
| M15 | `docs/04-agent-protocol.md` | §5 错误码表：补「建议 i18n」列 |
| M16 | `docs/07-i18n-conventions.md` | §3 `publish` 组落地注记（预留 → 落地，键数回填） |
| M17 | `apps/server/src/validate/zip.ts` | **F1 代码侧同步**：`:6,7` 默认值注释 + `:194`「总量 ≤10MiB」⇒ 改「上限由 `config/env` 单源」+ 去写死字节数 |
| M18 | `apps/server/src/validate/frontmatter.ts` | **F1**：`:24`「≤1MiB」同改法 |
| M19 | `apps/server/src/http/assets.ts` | **F1**：`:545`「02 §3.3 10MiB」同改法 |
| M20 | `apps/server/src/http/assets.test.ts` | **F1**：`:351` **用例标题**「10MiB」去写死（行为不变，仅标题/注释口径） |
| M21 | `apps/server/src/assets/versions.ts` | **F1**：`:27`「已界 ≤10MiB」同改法 |
| M22 | `.github/workflows/ci.yml` | **门禁接入点（P6 补）**：在 `table-structure-check` step 之后、`build` 之前**新增一步** `bun docs/smoke/scripts/file-ref-closure-check.ts`（与既有四道 step 同形态：`working-directory` + `run` + 注释说明本维管什么）—— 否则第五道门禁**装了但 CI 不跑** |
| M23 | `docs/smoke/scripts/doc-claims-check.ts` | **行号锚点随代码迁移更新（F224 + F233）**：`app.ts` 的 `createAdminRoutes` `214 → 217`（T1 插入 3 行）· `main.tsx` 的 `/admin/assets` `158 → 159`（T8 插入 2 行）；断言意图均不变 |
| M24 | `apps/web/src/components/ui/shadcn/README.md` | **F228（T6 补）**：vendored 账目计数 `33 → **38**`（既有漂移：实测 36 + 本批 2） |
| M25 | `THIRD-PARTY-NOTICES.md` | **F228（T6 补）**：许可账目同上 `33 → 38` —— 与 **N4/N5**（`progress.tsx` / `radio-group.tsx`）同批 |

> **件面口径（**F9** 明确）**：本表 = **代码 / 规范 / CI / 账目件**；§9.6 的 **2 份同步点文档**（主 design · `docs/00`）**单列不重复计入**；`AGENTS.md` 为登记项（零改动，§9.6 #12）。**M17–M21 与 M11 同批**（同一处口径变更的连带面）· **M22 与 N10 同批**（第五道门禁的**实现 + 接入点**，缺一即等于白装 —— P6 补）· **M23 随 T1 落地**（门禁锚点维护 —— F224）· **M24/M25 与 N4/N5 同批**（vendored 与许可账目随件数更新 —— F228）。

### 3.3 路由形态

- 路径：`/dashboard/publish`（**登录用户**；`RoleGuard minRole=ROLE.USER`，与同段 4 页同一条布局路由）
- 查询参数：`?slug=<资产 slug>`（可选）——有值则二选一控件默认落「选用已有资产」并预选该资产；无值 ⇒ 默认「新建」
- 未登录访问：由 `RoleGuard` 既有行为处理（跳 `/login?next=/dashboard/publish`），本批零改动

## 4. 页面规格（本批核心）

### 4.1 形态总览

```
┌─ 左列 max-w-2xl（672px @1440 视口）──────────┐   ┌─ 右栏 320px（lg:sticky）───┐
│ ┌ ① 上传  [✓ 完成] ────────────────────────┐ │   │ ┌ 识别摘要 ──────────────┐ │
│ │ 单行文件行（文件名 · 大小 · ×）           │ │   │ │ 标识 / 类型 / 版本      │ │
│ └──────────────────────────────────────────┘ │   │ └────────────────────────┘ │
│ ┌ ② 自识别  [● 当前] ──────────────────────┐ │   │ ┌ 流程 ──────────────────┐ │
│ │ 新建 / 选用已有资产 · 标识 · 类型 · 版本号  │ │   │ │ ✓ 上传      完成        │ │
│ └──────────────────────────────────────────┘ │   │ │ ● 自识别    当前        │ │
│ ┌ ③ 发布  [○ 待办] ────────────────────────┐ │   │ │ ○ 发布      待办        │ │
│ │ 更新说明 + [ 发布 ]                       │ │   │ └────────────────────────┘ │
│ └──────────────────────────────────────────┘ │   │                            │
└──────────────────────────────────────────────┘   └────────────────────────────┘
```

- 栅格：`lg:grid-cols-[minmax(0,1fr)_320px]` + `gap-6`（左列 `max-w-2xl` 收宽上限 · 右栏 **320px** 两卡）
- `<1024px`：**退化为上下堆叠**（左列在上、右栏在下）——两栏在窄屏会挤扁表单（评审已确认接受）
- 右栏 `lg:sticky lg:top-6`（左列随字段增长，右栏粘住）
- 页头走官方 `PageHeader`（`publish.title` + **副标题两态** `publish.subtitle` / `publish.subtitle.empty` —— T11/D22）；内容区宽 1138px @1440
- **段容器（T14）**：每段 = 官方 `Card`（`gap-4 px-6 py-5`）包**保留**的 `FieldSet` + `FieldLegend`；段图例 = **状态记号**（✓ / 实心圆点 / 空心圆点）+ 段名 + 右侧**状态徽标**（`Badge` · 复用 `state.*` · 取值源 = 右栏同一 `panelStates`）
- **主行动唯一入口** = ③ 段卡内按钮（右栏不设主按钮卡）；**未给包 ∧ 未选定资产 ⇒ 只渲染 ① 段**（T11 渐进披露 · D21）

### 4.2 左栏：三段

| 段 | 内容 | 态与禁用 |
|---|---|---|
| ① 上传（`step.upload`） | **未选文件态** = 官方 `Empty` 配方（`Empty` + `className="border border-dashed"` · `EmptyMedia variant="icon"` **圆形品牌底**（静默 `bg-primary/10 text-primary` ⇒ 拖拽 `bg-primary text-primary-foreground` + `scale-110`）· `EmptyTitle` = **动作号召**（`field.file` · 拖拽态切 `field.file.dropActive`）· `EmptyDescription` = 拖拽引导（`field.file.drop`）· `EmptyContent` 内 = 实底 `default/lg`「选择 zip 文件」+ **上限 chips 行**（`Badge variant=secondary` `.zip` + 三项 `field.file.limit.*`）—— D34 · **T13 方向 A 聚焦式**）；**拖拽区 = 本段 `FieldSet` 本身**（四个拖拽事件绑在此 · **常驻**，`Empty` 只承担视觉高亮 —— D1）；**已选态** = 文件名/大小回显（与空态**同轴**）+ 右侧 `ghost/icon-sm` + `X` 移除按钮（`field.file.remove` —— T7/D12）；点选与拖入**同落点**（同一个隐藏 `<input type="file" accept=".zip">`） | 一键链执行中（`running`）：文件名行右侧出「取消上传」（`action.cancelUpload`）+ 段内 `Progress`（`upload.progress`）+ `upload.cancelNote`；已完成（`done`）：字段只读；**未选文件 ⇒ 主按钮 `disabled`**（存在性门，非格式门 —— 与 D11「不做格式预校验」不冲突）· 选中文件**超总包上限 ⇒ 行内即时提示**（**仍可提交** —— C13/D40）· **429 ⇒ 本段 `Alert`（`error.rateLimitedCountdown`）+ 主按钮倒计时禁用**（D43/C14 · F250） |
| ② 自识别（`step.detect`） | **新建 / 选用已有资产**二选一 `RadioGroup`（官方「单选」配方：`<Field orientation="horizontal">` + `<RadioGroup>` + `<FieldLabel>`）；**新建支**：`slug`（`Input` + `FieldDescription` 形态提示 + `FieldError` 409 行内）· `type`（`Select`：技能 / MCP Server / Agent）· **版本号**（`Input` · 预填按 C3）；**已有支**：资产 = 官方 `Combobox`（C11/D38：输入 **300ms 防抖**走 `GET /api/me/assets?q=`，空查询 `limit=100`，**单次上限 100 条**）+ 选中项下方一行上下文小字 `field.asset.latest`「当前最新版 {version}」/ 空壳 ⇒ `field.asset.latestNone`（C12/D47）· **T15**：上下文小字取值源改**占号集合**（在途版本 ⇒「在途 {version}」· D26/F253），版本号预填改读**真实占号集合**（D25/F252）+ 采集失败**静默回落**旧口径 | 字段级错误（`asset.slug_taken` / `asset.version_conflict`）= 行内三联动（`Field data-invalid` + `aria-invalid` + `FieldError`）· **占号前置提示** `field.version.occupied`（T15/F253）· 读面载态 = 骨架/文案 `field.asset.loading`；读面**失败** = 同页 `ErrorState` + 重试；读面**空** = 官方 `Empty` + 动作出口（D35：**单按钮改用「新建」支**，页内切支；键 `field.asset.emptyAction`）；`?slug=` 命中 ⇒ 预选该项，**无效 ⇒ 忽略参数 + 轻提示 `assetNotFound` + 回落「新建」**（D45） |
| ③ 发布（`step.publish`） | **更新说明**（`Textarea`，可选 ≤4096 —— T14 由 ① 段迁入，与主按钮同段）+ 单按钮 **「发布」**（`size=lg` · `action.publish` 改值去括号 —— T14）；失败停点按钮文案**复用 `action.publish`**（N6） | 执行中：按钮置「执行中…」+ `disabled`；**失败面**（非字段级错误）= 本段 `Alert`（413 / `issues[]` 列表 + 展开 / 提审失败 / 403 / 404 —— §4.6）；失败态按 **D39** 出「放弃该资产」（**前提 = 本页会话内创建 ∧ 该资产零版本**；已有版本 ⇒ 改文案 `error.versionedAssetHint` 引导去「我的资产」，**D42**）；完成态整段替换为结果块（见 §4.4） |

**三段容器（T14 改写 · v2.0 §3.3 · 落地形 2026-09-29）**：每段外层 = 官方 `Card`（`gap-4 px-6 py-5`）作**视觉边界**，**内层保留** `FieldSet` + `FieldLegend`（a11y 语义分组 + dogfood 既有读点落点）—— 段图例 = 状态记号 + 段名 + 右侧状态徽标（`Badge` · 三值复用 `state.*` · 取值源 = 同一 `panelStates`）；段内字段仍用 `FieldGroup` / `Field` / `FieldLabel` / `FieldDescription` / `FieldError`（官方件优先、禁手搓结构件口径不变）。**去数字**：段卡标题不再渲染编号（编号位改状态记号）；**字段归属迁移**：版本号 → ② 段 · 更新说明 → ③ 段（唯一源 = 增量 design `2026-09-28-publish-drag-upload-design.md` **v2.0** §3.3）。

**三段同页平铺**：无「下一步」、无翻页、**不折叠**；**T11 渐进披露** —— 未给包 ∧ 未选定资产 ⇒ ②③ 段**不渲染**（只留 ① 段），给包或选定资产后三段同屏（D21）；已渲染段的控件可用性由一键链统一裁决，不做逐段禁用。

### 4.3 右栏：流程面板
- **两卡**（T14 改写 · 增量 design v2.0 §3.3）：① `识别摘要`（新键 `summary.title`）—— 3 行 `dl`（标识 `field.slug` / 类型 `field.type` / 版本 `field.version` · 类型值走 `t('assets', TYPE_KEY[...])` 而非原始 type id），**只列该阶段客户端已知的值**（未给包 ⇒ 三值「—」）；② `流程`（`flow.title`）
- 段宽 **320px**（`lg:grid-cols-[minmax(0,1fr)_320px]` · `lg:sticky lg:top-6`）；左列加宽上限 `max-w-2xl`（672px）
- 流程卡：三段竖排，每段 = **状态记号**（完成 ✓ / 当前 实心圆点 / 待办 空心圆点 / 未通过 `!` —— **不渲染编号数字**）+ 段名（`step.upload` / `step.detect` / `step.publish`）+ **态文字**（`state.pending/active/done/failed`）+ 段间**竖连接线**
- `active` 段额外显示该段 hint（`step.*.hint`）；**执行中进度条落 ① 段**（`Progress` + `upload.progress` · T13）；右栏流程行**不含进度**（原行内进度条件 `step.n === 2 ∧ 面板 active` 不可达 ⇒ 该分支**已删** —— F255 · 1B；右栏回归「状态记号 + 段名 + 态文字 + hint」单一职责）
- 主行动唯一入口 = ③ 段卡内按钮（**右栏不设主按钮卡**；空态 ③ 段不渲染 ⇒ 无主按钮，与 D21 一致）
- 记号与徽标视觉：`done` 实心底 + ✓ · `active` 实心点（描边）· `failed` 红 `!` · `pending` 空心点（**图标一律 SVG/字符，不用 emoji**）


### 4.4 一键链语义（三跳 · 失败停点 · 出口）

点击「发布」（主按钮在 ③ 段）
 ├─ 跳1 新建（仅「新建」支）：POST /api/assets {slug,type}                       → 201
 │      └ 失败：409 asset.slug_taken → ② 段 `slug` 字段行内 FieldError（停在第 1 步，无残留）
 ├─ 跳2 上传：POST /api/assets/:slug/versions（multipart, XHR 进度）             → 201（status=DRAFT）
 │      └ 失败：
 │         413 asset.package_too_large → ③ 段 Alert（文案带上限；① 段已按 C13 行内预提示过）
 │         400 issues[]               → ③ 段 Alert（摘要 + 前 5 + 展开）
 │                                      · 资产已创建 ⇒ 出「放弃该资产」（**前提 = 本页会话内创建 ∧ 零版本**，D39）
 │         409 asset.version_conflict  → ② 段 `version` 字段行内（交用户手改，不自动重试 —— D37）
 │         429 auth.rate_limited      → ① 段 Alert + **主按钮倒计时禁用**（秒数 = `retryAfterSec`，D43/C14）
 │         网络/取消                    → ③ 段 Alert（可重试；重试 = 重新点击「发布」，已存在则跳1 跳过；① 段进度条随 `abort` 停止）
 └─ 跳3 提审：POST /api/assets/:slug/versions/:version/submit                    → 201 {taskId}
        └ 失败：400 asset.version_not_submittable / 403 → ③ 段 Alert（版本仍是 DRAFT，可在「我的资产」处理）

失败态的出口二分支（D39/D42）
  · 资产「零版本」且本页创建 ⇒ 显示「放弃该资产」（二次确认 → DELETE /api/assets/:slug）
  · 资产「已有版本」        ⇒ **不给**该按钮；改文案 `error.versionedAssetHint` 引导去「我的资产」删

右栏面板（`panelStates` · D19 用户视角 · 与链**有意解绑**）
  · 未选文件   ⇒ ① 当前 / ②③ 待办
  · 已选未点   ⇒ ①② 完成 / ③ 待办
  · 执行中     ⇒ ①② 完成 / ③ 当前（`running`）
  · 成功       ⇒ ③ 完成（`submitted`）
  · 链失败     ⇒ ③ 记「未通过」（`stopAt` —— 字段级行内错误仍按停点归属，见 §7⑪）

完成态（三跳全 done）：③ 段替换为结果块
  ✓ 已提交审核 · 版本 {version} · 审核中
  可在「我的提交」查看进度或撤回
  [ 再发布一个 ]  [ 撤回提交 ]   ← 「再发布一个」= **复位（C15）**：清 slug / 文件 / changelog / 版本号
                                  ⇒ 回落「新建」支 + 预填 `1.0.0`（不复选已有资产；`?q=` 搜索词不清）
                                  ← 撤回 = POST /api/reviews/{taskId}/withdraw（204）
                                  成功后就地改「已撤回」态（`done.withdrawn`）+ 保留「再发布一个」
                                  （D44：**不整页复位、不跳转**；版本回 `UPLOADED`，后续去「我的资产」处理）
                                  （**D30 确认**：不是删版本 —— PENDING_REVIEW 属禁删态）

**设计要点**

1. **跳1 跳过逻辑**：「选用已有资产」支**不调**注册端点；重试时若资产已创建（本页已持有 slug）也**不重复注册**（幂等边界：以本页会话内「已创建标记」为准，不做服务端探测）。
2. **停点不自动回滚**（D5）：三步各自可见，右栏精确显示停在哪一步。
3. **两种残留各有出口**：资产空壳 ⇒「放弃该资产」；已提审 ⇒「撤回提交」。二者都**要二次确认**。
4. **`taskId` 来源**：提审响应体 `{ taskId, reviewVersion, status }`（`http/assets.ts:693-696`）⇒ 页面持有 `taskId`，撤回无需再查列表。
5. **预检与真实判定的分工**（C13/D40）：客户端只对**总包大小**做即时提示（值来自 `GET /api/meta/limits`），**不阻止提交**；`slug` 形态 / semver / zip 结构一律以服务端为准（D11 不变）。
6. **卸载即 abort**（C16/D41）：上传进行中切页/刷新/关标签 ⇒ `abort()`；文案沿用 C7「尽力而为（版本可能已建）」。
7. **限流不堵死**（C14/D43）：429 只**临时**禁用主按钮（倒计时 = `retryAfterSec`），归零自动恢复，不清空已填字段。

### 4.5 上传通道（XHR 进度与取消）

| 项 | 规格 |
|---|---|
| 实现落点 | `api/client.ts` 新增 `apiUpload`（**不得**另起 fetch 路径）；`api/versions.ts` 的 `uploadVersion` 薄封装 |
| 请求 | `POST /api/assets/:slug/versions`，`multipart/form-data`（`file` zip + `version` + 可选 `changelog`）——**不设** `content-type`（由 `FormData` 自带 boundary） |
| 语义复用 | 401 四分类（`skipAuthRedirect` 关）· 错误归一 `{code,message}` · `Accept-Language` 头 · **不进** 语言感知缓存（上传非 GET） |
| 进度 | `xhr.upload.onprogress` → `loaded/total` → 百分比（`Progress` + `upload.progress`） |
| 取消 | 暴露 `abort()`；UI = 文件名行内「取消上传」；文案 `upload.cancelNote`（尽力而为，见 C7） |
| 客户端预检 | 用 `packageMaxBytes` 比对选中文件 `size` ⇒ 超限**行内即时提示**（**不禁用提交** —— C13/D40）；单文件/文件数不预检 |
| 卸载语义 | 组件卸载（切页 / 刷新 / 关标签）⇒ `abort()` 进行中的上传（与「取消上传」同一通路 —— D41/C16）；**无** `beforeunload` |
| 同源 | `Origin` 由浏览器自带 ⇒ `origin-guard` 天然通过（与 `fetch` 通道一致）；403 `auth.csrf_failed` 仍进错误矩阵 |
| 413 前置 | 服务端在 `parseBody` 前按 `rawFile.size` 判 `ASSET_PACKAGE_MAX_BYTES`（`http/assets.ts:545-549`）⇒ **判定恒在服务端**；前端只做**不阻止提交**的即时提示（C13/D40） |

### 4.6 错误矩阵

| `asset.slug_taken` | 409 | 跳1 注册 | **② 段** `slug` 字段行内 | **`errors.asset.slug_taken`**（走 `errors` 组 —— 遵 `docs/07` §4「`code → 当前语言消息`」契约，**不在** `publish` 组另立同义键） |
| `request.invalid` | 400 | 跳1/2 参数非法（slug 形态 / semver / changelog 超长；**缺 file 不可达** —— 未选文件时主按钮 `disabled`） | **③ 段** Alert | `errors.request.invalid`（**回填**） |
| `asset.package_too_large` | 413 | 跳2 包体超总包上限 | **③ 段** Alert（① 段另有 C13 行内预提示，**不阻断提交**） | `errors.asset.package_too_large`（回填，含上限） |
| 族校验 `issues[]` | 400 | 跳2 zip 校验 | **③ 段** Alert（摘要 + 前 5 + 展开） | 逐 `issue.code` 查 `errors` 表；未命中 ⇒ 兜底（§6.3） |
| `auth.rate_limited` | 429 | 跳2 限流（10 次/分/用户） | **① 段** Alert（含 `retryAfterSec`）+ 主按钮**倒计时禁用** | `errors.auth.rate_limited`（已有）· 句文案 = `publish.error.rateLimitedCountdown`（**F250** 转活） |
| `auth.csrf_failed` | 403 | 跨源/异常来源 | **③ 段** Alert | `errors.auth.csrf_failed`（已有） |
| `asset.version_conflict` | 409 | 跳2 版本号重复 | **② 段** `version` 字段行内（+ 占号**前置**提示 `field.version.occupied` · T15） | `errors.asset.version_conflict`（回填） |
| `asset.version_not_submittable` | 400 | 跳3 前态不符 | **③ 段** Alert | `errors.asset.version_not_submittable`（回填） |
| `auth.forbidden` | 403 | 跳2 非 owner 非管理档 | **③ 段** Alert | `errors.auth.forbidden`（已有） |
| `asset.not_found` | 404 | slug / 版本不存在 | **③ 段** Alert（提示刷新） | `errors.asset.not_found`（已有） |

**行内错误联动（官方配方 · D33）**：字段级错误（`asset.slug_taken` / `request.invalid` / `asset.version_conflict`）一律 **`<Field data-invalid>` + 对应控件 `aria-invalid` + `<FieldError>`** 三者同批出现 —— 缺 `data-invalid` 时官方错误样式不生效（**仓内既有 2 处** `Field` 消费 = `Tokens.tsx` / `ConfirmDialog.tsx`，**均未用**该联动；`src/proto/PublishProto.tsx` 属原型**不上仓**，不计入 —— N4 实测订正）。

**兜底规则**（`docs/07` §4）：未命中 `errors` 表的 code ⇒ 显示 `操作失败（code）` —— **永不空白**。（**取法 · F4**：一律经 **`tErr(code, vars?)`** —— `apps/web/src/i18n/I18nProvider.tsx:53-56`；**不自造查表、不写中文兜底**。）

**与状态面的联动（v0.4 补）**：429 ⇒ 主按钮按 C14 **倒计时禁用**（不弹 toast）；409 `asset.version_conflict` ⇒ ② 段 `version` 字段**行内**（交用户手改）；`?slug=` 无效 ⇒ 轻提示 `assetNotFound` + 回落「新建」（D45）；失败态「已有版本」⇒ 文案 `error.versionedAssetHint` 引导去「我的资产」（D42）。

### 4.7 三入口与未登录回跳

| # | 入口 | 位置 | 未登录行为 |
|---|---|---|---|
| 1 | 侧栏「发布」 | 「个人」组**第 5 条**（末位）· 图标 `Upload` | **可见**（个人组由 `gate:'authed'` 控制显示，未登录整组不渲染）⇒ 故「未登录可见」由**顶栏**入口承担 |
| 2 | 顶栏「发布」 | 右侧，置于 `AssetSearch` **左侧**（图标 + 文字 ghost）；`<1024px` ⇒ **纯图标**（`size="icon"` + `aria-label={t('publish','title')}`，**不隐藏** —— D27 / grilling 1A-2） | **渲染**（顶栏不随登录态隐藏本入口）→ 点击 = toast `publish.loginRequired` + `navigate('/login?next=/dashboard/publish')` |
| 3 | 资产卡片「发布新版本」 | `AssetAdminCard` 版本组（占位 → `<Link ?slug=>`） | 该卡片只在个人面/管理面出现（均已登录）= 天然不涉及未登录 |

**回跳**：`next.ts` 白名单 `['/dashboard','/admin','/reviews','/device']` **已覆盖** `/dashboard/publish` ⇒ **零改动**（本批只验证，不改）。

### 4.8 页面状态与 URL 规格

| 起步·未给包 | 进入（无 `?slug=`） | **只渲染 ① 段**（T11 渐进披露 · ②③ 不渲染）；二选一落「新建」；右栏 ①=当前，②③=待办 · 摘要三值「—」 | 拖入或点选资产包 |
| 起步·选已有 | `?slug=` 有值 / 手选「选用已有资产」 | **② 段** Combobox 预选该资产 + 上下文行「当前最新版 x.y.z」（空壳 ⇒ 暂无版本 · 有在途版本 ⇒「在途 x.y.z」—— T15）；版本号按 **C3** 预填（读**真实占号集合** —— T15） | 改选资产 · 选文件 · 点「发布」 |
| 读面载态 | 选已有资产时 `GET /api/me/assets` 进行中 | 下拉位显示载态文案 | 其余字段可填 |
| 读面空 | 我的资产 0 条 | 官方 `Empty` 完整配方（`EmptyMedia variant="icon"` + 标题/说明 + `EmptyContent` 按钮 —— D35） | 「选用已有资产」项禁用（RadioGroup）· 可用「新建」支 |
| 读面错 | 读面失败 | 同页 `ErrorState` + 重试 | 可切回「新建」支 |
| `?slug=` 无效 | 深链资产不存在 / 非我名下 / 已删 | 忽略参数 + 回落「新建」（轻提示 `assetNotFound`） | 照常填表（D45） |
| 未选文件（默认态） | 进入页面 · 点「移除所选包」后 · 复用「选择 zip 文件」（`field.file.choose` —— N6） | **① 段** = 官方 `Empty` 配方（虚线大区 + 圆形品牌底图标 + 动作号召 + 上限 chips + 「选择 zip 文件」按钮 —— D34/**T13**） | 选择文件（主按钮 `disabled` 直到文件已选） |
| 执行中 | 点击「发布」 | **① 段**段内进度条（`Progress` + `upload.progress`）；右栏 ①② 完成 / ③ 当前；按钮「执行中…」禁用 | 取消上传（跳2 期间） |
| 校验失败 | 跳2 400 issues | **③ 段** Alert + 列表（前 5/展开） | 重选文件重试 · 放弃该资产 |
| 冲突 | 跳1 409 / 跳2 409 | 字段行内错误（**② 段**：`slug` / `version`） | 改字段重试（**不**自动改号/自动重试 —— D37） |
| 失败·已有版本 | 跳2 失败但该资产已有版本 | **③ 段** Alert；**不**出「放弃该资产」 | 文案 `error.versionedAssetHint` 引导去「我的资产」删（D42） |
| 限流倒计时 | 429 | **① 段** Alert + 主按钮 `disabled` + 倒计时文案（`{seconds}`） | 倒计时归零自动恢复（D43/C14） |
| 完成 | 三跳全绿 | **③ 段**结果块（已提交审核） | 再发布一个（**复位按 C15**：清 slug/文件/changelog/版本号 ⇒ 回落「新建」+ `1.0.0`）· 撤回提交（二次确认） |
| 已撤回 | 完成态点「撤回提交」成功（204） | 结果块**就地**改「已撤回」+ 保留「再发布一个」 | 再发布一个 · 去「我的资产」处理该版本（D44） |

**URL 约定**（**v0.4 订正 · D46/C17**）：本页 **读 `?slug=`**（深链预选；无效 ⇒ 忽略 + 轻提示）· **写 `?q=`**（资产搜索复用 `useMarketQuery` 的 300ms 防抖）—— 其余状态（步骤态 / 文件 / 版本号 / changelog）**不落 URL**，刷新即复位（不做 `?step=` 持久化——避免与「三段同页平铺」形态冲突）。

### 4.9 线框图（ASCII）

```
状态 A：起步 · 未给包（T11 渐进披露 —— 只渲染 ① 段）              视口 1440
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 发布                                                                            │
│ 把打包好的 zip 包拖进来或点选上传 —— 系统会识别出资产与版本，确认后一次发布        │
│                                                                                 │
│ ┌ ① 上传  [● 当前] ──────────────────────────┐   ┌ 识别摘要 ───────────────────┐│
│ │ ┌ ─ ─ ─ 官方 Empty（虚线大区）─ ─ ─ ─ ─ ┐  │   │ 标识   —                     ││
│ │ │              ( ◉ )                    │  │   │ 类型   —                     ││
│ │ │           先上传资产包                 │  │   │ 版本   —                     ││
│ │ │   把 zip 包拖到此处，或点下方按钮选择    │  │   └──────────────────────────────┘│
│ │ │          [ 选择 zip 文件 ]             │  │   ┌ 流程 ───────────────────────┐│
│ │ │  [.zip] 单包≤100 MiB · 单文件≤10 MiB   │  │   │ ● 上传      当前             ││
│ │ │        · 文件数≤100                   │  │   │ ○ 自识别    待办             ││
│ │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │   │ ○ 发布      待办             ││
│ └─────────────────────────────────────────────┘   └──────────────────────────────┘│
│                              ← 左列 max-w-2xl（672px）· 右栏 320px · sticky        │
└─────────────────────────────────────────────────────────────────────────────────┘

状态 B：已选包 · 三段同屏（未点「发布」）
┌──────────────────────────────────────────────┐  ┌ 识别摘要 ───────────────────┐
│ ① 上传  [✓ 完成]                             │  │ 标识  my-skill             │
│   my-skill-1.0.0.zip · 3.2 MB           [×]  │  │ 类型  技能                  │
│ ② 自识别  [● 当前]                           │  │ 版本  1.0.0                │
│   (●) 新建      ( ) 选用已有资产              │  └─────────────────────────────┘
│   标识 slug  [ my-skill                  ]   │  ┌ 流程 ───────────────────────┐
│   类型       [ 技能 ▾ ]                      │  │ ✓ 上传      完成             │
│   版本号     [ 1.0.0                    ]   │  │ ● 自识别    当前             │
│ ③ 发布  [○ 待办]                             │  │ │   自动识别：资产·标识·版本号 │
│   更新说明   [（可选，≤4096）             ]   │  │ ○ 发布      待办             │
│   [ 发布 ]                                  │  └─────────────────────────────┘
└──────────────────────────────────────────────┘

状态 C：一键执行中（跳2 · 上传 62%）
┌──────────────────────────────────────────────┐  ┌ 识别摘要 ───────────────────┐
│ ① 上传  [✓ 完成]                             │  │ 标识  my-skill              │
│   my-skill-1.0.0.zip · 3.2 MB [取消上传]     │  │ 类型  技能                   │
│   ▓▓▓▓▓▓▓░░░ 上传 62%                        │  │ 版本  1.0.0                 │
│  取消是尽力而为：若字节已送达…版本可能已建     │  └─────────────────────────────┘
│ ② 自识别  [✓ 完成]                           │  ┌ 流程 ───────────────────────┐
│   (●) 新建 …                                 │  │ ✓ 上传      完成             │
│ ③ 发布  [● 当前]   [ 执行中… ]                │  │ ✓ 自识别    完成             │
└──────────────────────────────────────────────┘  │ ● 发布      当前             │
                                                  └─────────────────────────────┘

状态 D：完成（三跳全绿）
┌──────────────────────────────────────────────┐  ┌ 识别摘要 ───────────────────┐
│ ① 上传  [✓ 完成]                             │  │ 标识  my-skill              │
│ ② 自识别  [✓ 完成]                           │  │ 类型  技能                   │
│ ③ 发布  [✓ 完成]                             │  │ 版本  1.0.0                 │
│   ✓ 已提交审核　版本 1.0.0 · 审核中           │  └─────────────────────────────┘
│   可在「我的提交」查看进度或撤回               │  ┌ 流程 ───────────────────────┐
│   [ 再发布一个 ]  [ 撤回提交 ]                │  │ ✓ 上传      完成             │
│                                              │  │ ✓ 自识别    完成             │
│                                              │  │ ✓ 发布      完成             │
└──────────────────────────────────────────────┘  └─────────────────────────────┘

状态 E：选用已有资产（官方 Combobox + 上下文行 —— C11/C12）
┌──────────────────────────────────────────────┐  ┌ 识别摘要 ───────────────────┐
│ ① 上传  [✓ 完成]                             │  │ 标识  my-skill              │
│ ② 自识别  [● 当前]                           │  │ 类型  技能                   │
│   ( ) 新建      (●) 选用已有资产              │  │ 版本  1.2.1                 │
│   资产  [ my-skill ▾ ]  ← 可输入即搜          │  └─────────────────────────────┘
│   当前最新版 1.2.0（在途 1.2.1 ⇒ 预填 1.2.2） │  ┌ 流程 ───────────────────────┐
│   版本号 [ 1.2.2 ]                           │  │ ✓ 上传      完成             │
│ ③ 发布  [○ 待办]  [ 发布 ]                    │  │ ● 自识别    当前             │
│                                              │  │ ○ 发布      待办             │
└──────────────────────────────────────────────┘  └─────────────────────────────┘
```

> 图例：`✓` 完成 · `●` 当前（实心圆点）· `○` 待办（空心圆点）· `!` 未通过 · `[ ]` 按钮 · `(●)/( )` 单选 · `▾` 下拉 · `▓░` 进度 · `┌ ─ ┐` = **官方 `Empty`（虚线大区）** · `[✓ 完成]` = 段卡右侧状态徽标。
> 线框与 §4.2/§4.3 的行内描述、§4.8 的状态表**三向一致**（同一元素三处同标记）；**未给包 ⇒ 只 ① 段**（A 态）与 D21 的展开判据一致。

## 5. 服务端改动规格

### 5.1 新增只读端点 `GET /api/meta/limits`

| 项 | 规格 |
|---|---|
| 路由 | `apps/server/src/http/meta.ts` · `createMetaRoutes()`；`app.ts` 注册 `app.route('/api/meta', …)` |
| 鉴权 | **匿名可读**（平台静态上限，非用户数据）——与 `/api/stats` 同档；**不**挂 `requireAuth()` |
| 出参 | `{ packageMaxBytes: number, fileMaxBytes: number, maxFiles: number }`（三值取自 `getEnv()`，**不**回显其他 env） |
| 语义 | 只读、无副作用、不入审计 |
| 理由 | D18：前端上限文案必须有**单一真值源**；写死常量会与运维改 env 后脱节（M4c 的 UI 可配也将复用本端点） |
| 不做什么 | **不**暴露任何可写配置；**不**提供 `PATCH`；**不**含角色/策略类字段（`ACCESS_POLICY` 属 M4c） |

> ⚠️ **口径变更登记**：主 design §8:674 原文「本批**零服务端改动**」按本表订正为「**零写面改动 + 1 只读端点**」（同步点 §9.6）。

### 5.2 上限默认值（两处）

| 键 | 现默认 | 新默认 | 落点 |
|---|---|---|---|
| `ASSET_PACKAGE_MAX_BYTES` | `10 * 1024 * 1024` | `100 * 1024 * 1024` | `apps/server/src/config/env.ts:42-46`（`.default()`）+ 注释同步 |
| `ASSET_FILE_MAX_BYTES` | `1 * 1024 * 1024` | `10 * 1024 * 1024` | `apps/server/src/config/env.ts:47-51` |
| `ASSET_MAX_FILES` | `100` | **不变** | — |

- 根 `.env.example` 补三项（**注释掉** + 注明默认值）——本机 `apps/server/.env` **不动**（D17）
- 族协议上限文档同步：`docs/02` §3.3 / `docs/03` §5 / `docs/04` §5 中「单文件 ≤1MiB / 总包 ≤10MiB」表述**须同批订正**（否则规范与真值相反）→ 列入 §9.7 收尾回填项 **①**
- **代码侧同步 6 处（F1 补 · 否则改完默认值当场腐化）**：`validate/zip.ts:6,7`（默认值注释）· `zip.ts:194`（「总量 ≤10MiB」）· `validate/frontmatter.ts:24`（「≤1MiB」）· `http/assets.ts:545`（「02 §3.3 10MiB」）· `http/assets.test.ts:351`（**用例标题**「10MiB」）· `assets/versions.ts:27`（「已界 ≤10MiB」）—— 一律改为**引用「上限由 `config/env` 单源」+ 去掉写死字节数**（防下次再腐化）
- 记录性影响：单文件上限放宽后，**单包 100 MiB 的 zip 可能含 10 MiB 单文件** ⇒ 校验器逐文件判定不变（仅阈值变）

### 5.3 零写面改动声明

本批**不新增/不修改任何写端点**：注册 / 上传 / 提审 / 撤回**全部复用**既有端点（`http/assets.ts` · `http/reviews.ts`），请求体与响应体形状**零变化**。
⇒ 契约向后兼容（§7 逐行声明）；`packages/protocol` 的 zod schema **零改动**。

### 5.4 测试面

| 面 | 用例 |
|---|---|
| `meta.test.ts`（新） | ① 出参三键齐 + 类型 ② 三值 == `getEnv()` 实测（`> 0` 且等于配置）③ 改 env 注入后端点跟随（**不被缓存**）④ 匿名可读（无 cookie 200）⑤ 响应**不含** `ACCESS_POLICY`/`STORAGE_*` 等无关键（防越界回显） |
| 上限默认值 | `env.test.ts`（若存在）断言两处新默认；**413 用例改注入 env**（不造 100 MiB 真包——见 §9.5） |
| 既有上传用例 | 因上限放宽 ⇒ 检查是否有「10 MiB 拒」类断言依赖旧默认（**实证：无**——现有用例用 `ASSET_PACKAGE_MAX_BYTES` 注入式；实现期复核） |
| 零回归 | `http/assets.test.ts` · `review` 族用例全量跑（§9.1） |

## 6. i18n 变更规格

### 6.1 组口径

- 新组 **`publish`**（`docs/07` §3 已预留组名「发布流」）——本批**落地**，与 `market`/`admin` 同层（叶子键平铺，`t('publish','<key>')`）
- `errors` 组：**42 → 68**（+26 = 20 协议码 + 6 本页可达业务码；**F225 订正**：原写 40 → 66 只数了带点键，漏 `network` / `unknown` 两枚简单叶子键）
- zh / en 键集合**零差集**（`doc-claims-check` 与 i18n 计数脚本守）
- **取法（F4 补）**：本页文案一律 `t('publish', '<key>', vars?)`；**错误文案一律 `tErr(code, vars?)`**（`apps/web/src/i18n/I18nProvider.tsx:53-56`）—— `interpolate` 支持 `{name}` 单花括号占位（`:24-27`，实测已核）；未命中的 code 由 `tErr` 内部兜底模板处理（含 `{code}`）⇒ **实现期禁自造查表与中文兜底**

### 6.2 `publish` 组键表（**64 键**（T15 实测口径 · zh/en 逐键回读）· 原设计 55 键 → 验收期增量：`field.file.notZip`〔T1〕· `field.file.remove`〔T7〕· `subtitle.empty`〔T11〕· `field.file.dropActive` + `field.file.limit.*`×3〔T13〕· **`summary.title`**〔T14〕· **`field.asset.inflight` + `field.version.occupied`**〔T15 · F252/F253〕；**退役**：`field.file.hint`〔T13〕· **`flow.note`**〔T14 · F251〕；**改名**：`step.create` → `step.detect` · `step.submit` → `step.publish` + 三 hint 改名〔T10 · D20〕；**改值**：`field.file.drop`〔T12/T13〕· `field.file`〔T13〕· `subtitle`〔T11 · F247〕· **`action.publish`**〔T14〕 ⇒ 净 **64**）

| # | 键 | zh | en |
|--:|---|---|---|
| 1 | `title` | 发布 | Publish |
| 2 | `subtitle` | 核对识别出的资产详情，确认后发布 | Review the detected asset details, then publish |
| 3 | `subtitle.empty` | 把打包好的 zip 包拖进来或点选上传 —— 系统会识别出资产与版本，确认后一次发布 | Drop your zip package in, or pick one — the asset and version are detected automatically, then publish in one go |
| 4 | `flow.title` | 流程 | Flow |
| 5 | `step.upload` | 上传 | Upload |
| 6 | `step.detect` | 自识别 | Auto-detect |
| 7 | `step.publish` | 发布 | Publish |
| 8 | `step.upload.hint` | 选一个 zip 包（可拖入） | Choose one zip package (or drop it) |
| 9 | `step.detect.hint` | 自动识别：资产 · 标识 · 版本号 | Auto-detected: asset, slug and version |
| 10 | `step.publish.hint` | 一次提交，进入审核队列；可撤回 | One submit into the review queue; withdrawable |
| 11 | `state.pending` | 待办 | Pending |
| 12 | `state.active` | 当前 | Current |
| 13 | `state.done` | 完成 | Done |
| 14 | `state.failed` | 未通过 | Failed |
| 15 | `summary.title` | 识别摘要 | Detected summary |
| 16 | `mode.new` | 新建 | Create new |
| 17 | `mode.existing` | 选用已有资产 | Use an existing asset |
| 18 | `field.slug` | 标识 slug | Slug |
| 19 | `field.slug.placeholder` | my-awesome-skill | my-awesome-skill |
| 20 | `field.slug.hint` | 小写字母 / 数字 / 单连字符 · 1–64 位 | Lowercase letters, digits and single hyphens · 1–64 chars |
| 21 | `field.type` | 类型 | Type |
| 22 | `field.asset` | 资产 | Asset |
| 23 | `field.asset.placeholder` | 选择要发布新版本的资产 | Choose the asset to publish a new version for |
| 24 | `field.asset.hint` | 从资产详情页「发布新版本」进入时会自动选中 | Arrives pre-selected from the asset's “Publish new version” action |
| 25 | `field.asset.loading` | 读取「我的资产」… | Loading your assets… |
| 26 | `field.asset.empty` | 暂无可发布新版本的资产 | No asset available to publish a new version for |
| 27 | `field.asset.emptyAction` | 改用「新建」发布第一个资产 | Switch to Create and publish your first asset |
| 28 | `field.file` | 先上传资产包 | Upload the asset package first |
| 29 | `field.file.drop` | 把 zip 包拖到此处，或点下方按钮选择 | Drop a zip package here, or use the button below |
| 30 | `field.file.dropActive` | 松手即上传 | Release to upload |
| 31 | `field.file.limit.package` | 单包 ≤ {package} MiB | Package ≤ {package} MiB |
| 32 | `field.file.limit.file` | 单文件 ≤ {file} MiB | File ≤ {file} MiB |
| 33 | `field.file.limit.count` | 文件数 ≤ {count} | Files ≤ {count} |
| 34 | `field.file.none` | 未选择 | none selected |
| 35 | `field.file.choose` | 选择 zip 文件 | Choose zip file |
| 36 | `field.file.notZip` | 请选择 .zip 包（不支持文件夹或其它格式） | Please choose a .zip package (folders and other formats are not supported) |
| 37 | `field.file.remove` | 移除所选包（可重新选择或拖入） | Remove the selected package (choose or drop again) |
| 38 | `field.version` | 版本号 | Version |
| 39 | `field.version.hint` | 新建 = 1.0.0；已有资产 = 最新版补丁号 +1 | New asset: 1.0.0 · existing asset: latest patch + 1 |
| 40 | `field.changelog` | 更新说明 | Changelog |
| 41 | `field.changelog.placeholder` | （可选，≤4096） | (optional, ≤4096) |
| 42 | `action.publish` | 发布 | Publish |
| 43 | `action.publishing` | 执行中… | Running… |
| 44 | `action.cancelUpload` | 取消上传 | Cancel upload |
| 45 | `action.again` | 再发布一个 | Publish another |
| 46 | `action.withdraw` | 撤回提交 | Withdraw submission |
| 47 | `action.abandon` | 放弃该资产 | Discard this asset |
| 48 | `upload.progress` | 上传 {percent}% | Uploading {percent}% |
| 49 | `upload.cancelNote` | 取消是尽力而为：若字节已送达且服务端已开始写库，版本可能已建 | Cancel is best-effort: if the bytes were delivered and the server started writing, the version may already exist |
| 50 | `error.issues.title` | 包校验未通过（共 {count} 处）· 资产已创建，未上传 | Package validation failed ({count} issues) · asset created, nothing uploaded |
| 51 | `error.issues.expand` | 展开全部 {count} 条 | Show all {count} |
| 52 | `error.issues.collapse` | 收起 | Collapse |
| 53 | `done.title` | 已提交审核 | Submitted for review |
| 54 | `done.hint` | 可在「我的提交」查看进度或撤回 | Check the progress or withdraw it in My submissions |
| 55 | `loginRequired` | 请先登录后再发布 | Please sign in to publish |
| 56 | `assetCreated.hint` | 资产已创建；未上传版本前公开面不可下载 | The asset was created; nothing is downloadable until a version is uploaded |
| 57 | `assetNotFound` | 找不到该资产（可能已删除，或不在你名下） | Asset not found (it may be deleted, or not yours) |
| 58 | `error.versionedAssetHint` | 该资产已有版本：请到「我的资产」删除，或继续上传新版本 | This asset already has versions — delete it in My assets, or keep uploading a new version |
| 59 | `error.rateLimitedCountdown` | 操作过于频繁，请 {seconds} 秒后重试 | Too many requests — retry in {seconds}s |
| 60 | `done.withdrawn` | 已撤回提交 | Submission withdrawn |
| 61 | `field.asset.latest` | 当前最新版 {version} | Latest version {version} |
| 62 | `field.asset.latestNone` | 暂无版本 | No versions yet |
| 63 | `field.asset.inflight` | 在途 {version} | In flight {version} |
| 64 | `field.version.occupied` | {version} 已被占用（{state}），建议改 {suggested} | {version} is taken ({state}) — try {suggested} |

> 复用优先：`取消`/`新建` 等若 `common` 组已有等价键，实现期**以复用为准**（本表给全量以免实现期漏键）；键数实现后回填（§9.7 ②）。（**D31 / grilling 5A-1**：键表按本表落。）
> **不新增键的两处文案（N6 处置）**：「重新选择」（② 段未选文件态）复用 `field.file.choose`；「发布（重试）」（失败停点主按钮）复用 `action.publish` —— **禁**临时字面量（前科：M4b-6 F205 曾留 28 处硬编码中文）。
> **本组不承载错误码文案（N1 处置）**：`asset.slug_taken` 等**一切服务端码**的文案归 `errors` 组（`docs/07` §4 契约「`code → 当前语言消息`」）⇒ `publish` 组只放**本页自有**文案。

### 6.3 `errors` 组扩键（26 = 20 协议 + 6 业务）

**协议码 20**（全集 = `protocolErrorCodes`，`packages/protocol/src/errors.ts:7-32`）：
`invalid_skill_frontmatter` `invalid_agent_frontmatter` `missing_name` `invalid_name` `missing_description` `description_too_long` `missing_body` `unsupported_file_type` `file_too_large` `too_many_files` `package_too_large` `sensitive_header_plaintext` `enabled_required` `stdio_requires_command` `url_required` `url_must_be_http` `conflicting_url_with_stdio` `conflicting_command_with_url` `command_backslash` `servers_empty`

**本页可达业务码 6**：`asset.slug_taken` `asset.package_too_large` `asset.package_layout_invalid` `asset.package_path_invalid` `asset.version_conflict` `asset.version_not_submittable`

（资产域业务码**全集 18**，另 12 码属生命周期/下载面，M4b-6 及更早批已覆盖或另批承接 ⇒ 本批只补本页可达 6 个。）

**命名区分（必须写清，防文案撞车）**：`package_too_large`（**协议码**，族校验：zip 内总解压/清单判定）与 `asset.package_too_large`（**业务码**，HTTP 413：multipart 原始包体超 `ASSET_PACKAGE_MAX_BYTES`）是**两个码**、两条文案，展示位置也不同（前者随 `issues[]` 落 **③ 段** Alert 列表，后者单独 Alert）。

### 6.4 规范层回填（02 / 03 / 04）

| 文档 | 现状（实测） | 本批动作 |
|---|---|---|
| `docs/02` §4 | 表 4 行，覆盖 **9** 个 skill 族码；含「建议 i18n」列，但 `description_too_long` 等未列 | 补缺码行 + 与 `protocolErrorCodes` 逐码对齐 |
| `docs/03` §4 | §4 = **凭据安全规则**，**无**独立错误码表（mcp 族 10 码只在代码里） | **新增**「校验错误码」表（列 `code \| 含义 \| 建议 i18n`） |
| `docs/04` §5 | 表 4 行，覆盖 **8** 个 agent 族码；无「建议 i18n」列 | 补列 + 补缺码行 |

> 实测口径：02 ∪ 04 现覆盖 **10** 个码（含斜杠合并行）；与 20 码全集差集 = **10 码**无族表载明（`description_too_long` + mcp 族 9 码）⇒ 对齐轮记的「11 行」按实测订正为 **10 码 + 1 处命名区分说明**（§6.3 末）。

## 7. 接口变更总览（服务端面）

| # | 端点 | 方法 | 变化 | 鉴权 | 兼容性 |
|--:|---|:--:|---|---|---|
| 1 | `/api/meta/limits` | `GET` | **新增**（只读） | 匿名 | 新路径，**零破坏** |
| — | `/api/assets` | `POST` | 无变化（复用） | 会话 | 兼容 |
| — | `/api/assets/:slug/versions` | `POST` | 无变化（复用；**上限默认值变更**见 §5.2） | 会话 | 兼容（阈值放宽 = 更宽，不拒旧客户端） |
| — | `/api/assets/:slug/versions/:version/submit` | `POST` | 无变化（复用） | 会话 | 兼容 |
| — | `/api/reviews/:id/withdraw` | `POST` | 无变化（复用） | 会话 | 兼容 |

> 主 design §8 预告行（「零服务端改动」）**按本表订正**：本批 = **零写面改动 + 1 只读端点 + 2 处默认值放宽**。

## 8. UI-UX 变动总览（本批用户可见变化）

1. **新页面** `/dashboard/publish`（登录用户）：左操作 / 右流程，一键发布三跳
2. **侧栏**「个人」组新增第 5 条「发布」（图标 `Upload`）——组内顺序：工作台 / 我的资产 / 我的提交 / 我的令牌 / **发布**
3. **顶栏**右侧新增「发布」入口（搜索左侧）；未登录点击 = 轻提示 + 登录页回跳
4. **资产卡片**（个人面 / 管理面）版本组「发布新版本」由**禁用占位** → **可用链接**（带 `?slug=` 预选）
5. **上限文案**全站观感变化：引用上限处由「10 MiB」变为「100 MiB」（前端文案从端点取值）
6. 零视觉体系改动（体系 SSOT = M4a design §4.4；收口归 M4b-8）

## 9. 回归面与验证口径

### 9.1 零回归（硬约束）

- 既有 4 个个人面页（`/dashboard` · `/dashboard/assets` · `/dashboard/submissions` · `/dashboard/tokens`）行为与文案不变
- 侧栏激活唯一性（`isActive = pathname === to`）：新增 1 条个人组条目后，**任一导航路径仍恰 1 条激活**（dogfood 守）
- 门户读面（`/api/assets` 无参）语义不变；`/api/meta/limits` **不**改任何既有端点
- 上传端点行为不变（仅阈值放宽）⇒ 既有 `assets.test.ts` / `review` 族用例全绿
- 未登录 / 非登录用户访问 `/dashboard/publish` ⇒ 仍按既有 `RoleGuard` 弹出，不出现空白页

### 9.2 门禁与冒烟顺序（复现 CI · **本批交付后 = 12 步**：原 11 + 新增第五道）

`install --frozen-lockfile → typecheck → lint → format:check → doc-audit → doc-claims-check → head-sink-coverage → table-structure-check → **file-ref-closure-check** → build → db:migrate → test`

（后两道文档门禁为 2026-09-28 新增 —— 见 `ai-asset-hub` skill §CI/文档门禁现状。**第五道 `file-ref-closure-check`（F 方案①）本批交付**：件面 ↔ 引用闭合双向核对，机器拦「改口径忘加件」类残留；管线位置 = `table-structure-check` 之后、`build` 之前。）

> ⚠️ **门禁覆盖面实证（Q1 · 2026-09-28 实测 · 必读）**：`table-structure-check` 与 `doc-claims-check` 用 **`git ls-files docs`** 枚举文件 ⇒ **只扫 git 已跟踪文件**；`doc-audit` / `head-sink-coverage` 走工作区遍历 ⇒ 未跟踪件也扫。**实操后果**：**新建件在 `git add` 之前跑门禁 = 空转**（本轮实测：暂存前 `table-structure` 报 54 份，暂存后 **56 份 / 39 PASS**；`doc-claims` 112 → **116**）⇒ **硬规则：提交前必须先把新件 `git add`（逐文件）再跑门禁**，否则读数对未跟踪件不成立。

### 9.3 本批 dogfood 分组（**九段** · 新建 `m4b7-publish-dogfood.ts`）

| 段 | 断言要点 |
|---|---|
| G1 入口 | 侧栏个人组 5 条且第 5 条 = 发布（取 `nav-truth` SSOT）· 顶栏「发布」在位且在搜索**左侧** · 卡片「发布新版本」不再是 `disabled` 且 `href` 带 `?slug=` |
| G2 未登录 | 顶栏「发布」可见 → 点击出 toast（`publish.loginRequired`）+ 落到 `/login?next=/dashboard/publish`（断言 `search` 参数） |
| G3 形态 | 左/右两栏在位（`aside` 1 个 · 右栏 `left > 左栏 right`）· 右栏三段**竖排**（top 递增、left 恒等）+ 连接线 2 条 · 链内动作按钮**恰 1 个**（**主按钮唯一入口 = ③ 段卡内** —— T14；`flow.note` 已退役 · F251）· **官方件在位（D32–D35）**：三段外层 `[data-slot="field-set"]` ×3 且段名 `[data-slot="field-legend"]` ×3 · 未选文件态 `[data-slot="empty"]` 在位且含 `EmptyContent` 按钮 · **资产选择器 = 官方 `Combobox`**（`[data-slot^="combobox"]` 在位 · **非**原生 `select` —— C11/D38） |
| G4 逐态（**F10/F11 扩写：§4.8 全 15 行**） | 右栏三段状态序列与 **§4.8 表逐行一致**（读圆点 class，不读文案）：起步·空表单 / 起步·选已有 / **读面载态** / **读面空（零资产空态 ⇒ 断言 `EmptyContent` 按钮在位且点击后**切到「新建」支**）** / **读面错（`ErrorState` + 重试可点）** / `?slug=` 无效 / 未选文件 / 执行中（**含「取消上传」⇒ 断言 `abort` 后按钮回可点**）/ 校验失败 / 冲突 / 失败·已有版本 / 限流倒计时 / 完成 / 已撤回 · **预填四支点名（F11）**：正常 `+1` / 空壳 ⇒ `1.0.0` / `-pre` ⇒ 剥段补位 / 撞号 ⇒ 见 G6 ② |
| G5 一键链 happy | 起真包（造数）→ 点「发布」→ 三跳全绿；终态断言：`my submissions` 出现该条 PENDING（**止步 PENDING_REVIEW**）· **G5⑩/G5⑪（F257 补 · 2026-09-29）**：① 段含 `[data-slot=progress]` ∧ `aria-label` = 「上传 N%」（MutationObserver 抓窗口）· **右栏不含**进度条 ∧ 右栏两卡在位（反证式 · 注入 `n===3` ⇒ ⑪ FAIL 实证） |
| G6 错误面 | ① 409 slug 冲突（复用已有 slug）⇒ **② 段** `slug` 字段行内 `FieldError` ② 409 版本冲突 ⇒ **② 段** `version` 行内 ③ 400 issues ⇒ **③ 段** Alert 列表 + 「展开全部」可点 ④ 413 ⇒ 注入小上限 env 后吃 413（**不造 100 MiB 包**）⑤ **429** ⇒ 主按钮 `disabled` + 倒计时文案（**① 段** Alert 同键）⑥ **`?slug=` 无效** ⇒ 回落「新建」+ 轻提示（D45） |
| G7 出口 | 「放弃该资产」（二次确认 → 资产消失于 `/api/me/assets`）· 「撤回提交」（204 → 我的提交不再 PENDING 且结果块切「已撤回」态 —— D44）—— 两条均**自清**；**反证**：给该资产补一条版本后再触发失败 ⇒ 「放弃该资产」按钮**不出现**（D39 守护）· 已有版本时出现引导文案（D42） |
| G8 零回归 | 侧栏激活唯一性（全导航路径）· 既有 4 页标题与关键元素在位 · `NO JS ERRORS` 逐段 |
| G9 硬编码守卫（**F6 补**） | 静态扫描本批新件源码（`pages/Publish.tsx` · `lib/publish-chain.ts`）：**注释之外零中文字面量**（正则 `[\u4e00-\u9fa5]`，剔除注释行）—— 防 F205 类（28 处硬编码中文）复发；**反证**：临时插入一句中文字面量 ⇒ 该段 FAIL |

### 9.4 出口件 ④（本批验收清单）

1. `/dashboard/publish` 真页（三段 + 右栏流程，形态同 §4.9）
2. 三入口齐（侧栏 / 顶栏 / 卡片）· 未登录 toast + 回跳
3. 一键链三跳可达（happy path 实测）+ 失败停点 + 两出口（放弃该资产 / 撤回提交）
4. 上传通道 XHR 进度可见 + 可取消（含 C7 语义文案）
5. 错误矩阵 10 行逐条可达（§4.6）
6. `GET /api/meta/limits` 端点 + `meta.test.ts` 全绿 + §5.2 两处默认值生效
7. i18n：`publish` 组落地 · `errors` 42 → 68 · zh/en 零差集
8. 规范层回填（02/03/04 错误码表）+ `docs/07` §3 落地注记
9. dogfood **九段**全绿（§9.3）· 零回归（§9.1）
10. 文档同步点 §9.6 全落地（口径翻转不留旧义）
11. **官方件配方采纳**（D32–D36）：三段 `FieldSet`/`FieldLegend` 在位 · 字段错误 `data-invalid` + `aria-invalid` 联动 · 上传「未选文件」与「零资产」两处空态走官方 `Empty` 完整配方（含动作出口）· `EmptyState` 薄封装零改动
12. **F 轮三条硬项**：**上限表述同步全覆盖**（F1：规范层 3 处 + **代码侧 6 处**）· **零硬编码中文**（F6：dogfood G9 段）· **上传夹具内联生成**（F3：脚本造包，不落二进制）
13. **件面闭合（F7/F9）**：§3.2 **M17–M21**（F1 代码侧 5 件）随 M11 同批 · 件面口径（代码/规范件 ↔ §9.6 同步点文档单列）已写明 · **第五道门禁 `file-ref-closure-check`（N10）落地并进 CI**
14. **断言闭合（F10/F11/F12）**：§4.8 **全 15 行状态逐行有断言**（新增 读面载/空（零资产切支）/错 + 取消上传）· **预填四支点名覆盖**（正常 +1 / 空壳 1.0.0 / `-pre` 剥段 / 撞号 409）· 「再发布一个」复位语义（ **C15**）在 §4.4/§4.8 可见 · **不新增 web 单测件**（口径随仓情，见 N2）

### 9.5 造数需求（写库须授权）

| 族 | 资产态 | task 态 | 用途 |
|---|---|---|---|
| mcp | `m4b7-fix-1`（ACTIVE · 有 1 版本） | — | 「选用已有资产」分支 + 版本冲突用例 |
| mcp | `m4b7-fix-2`（ACTIVE · 0 版本空壳） | — | 空壳公开（C6）接受项实证 |
| — | 一条 DRAFT 版本（`m4b7-fix-1@0.0.1`） | — | 版本号冲突 409（跳2） |
| — | — | 一条 `PENDING` review | 「撤回提交」出口（G7） |

- 前缀 `m4b7-` 可识别、**收尾可删**（含连带审计行）
- **上传夹具（F3 补）**：dogfood 用的合法 zip **由脚本内联生成**（最小 skill 包 = `SKILL.md`（含 name/description frontmatter + 正文，走 skill 族校验）+ 一个附件；总量 **≤10 KiB**）—— **不落二进制入仓**；G3 / G5 均用它
- **不造什么**：不造 100 MiB 真包（413 走 env 注入）；不造 PUBLISHED 版本（dogfood 止步 PENDING_REVIEW）；不造第二个用户账号（免触登录限流：登录 5 次/分 ⇒ dogfood 分段跑、每段独立登录，超限即重启 api）；**不落二进制夹具入仓**（夹具内联生成）
- 口令只从 `apps/server/.env` 读（`SMOKE_M4B2_PASSWORD`），**不落仓**

### 9.6 口径翻转与登记同步（**12 处** · 行号为 2026-09-28 实测 · **✅ 已于 2026-09-28「定稿」时全部执行**）

> 两类变更：**①「手动提审」→「一键链」**（用户 2026-09-28 原型轮拍板，推翻主 design §2.1 R2 原文）· **②「零服务端改动」→「零写面改动 + 1 只读端点 + 2 处默认值」**。

| # | 落点 | 行号 | 动作 |
|--:|---|:--:|---|
| 1 | `docs/00` §5「M4b-7」行 | :106 | 「上传落 `DRAFT` + **手动**提审」→「**一键链**（新建 → 上传 → 提审）」；「零服务端改动」→「零写面改动 + 1 只读端点」 |
| 2 | `docs/00` §5 子批口径编排句 | :109 | 复核（依赖链 `1→…→8` 不变）——无改动则登记「已核」 |
| 3 | `docs/00` 头部 `Updated:` + §8 修订记录 | 头部 / §8 | ✅ **已执行**：加 **v1.100** 行；头部下沉 v1.98（口径行下界 → `v1.1–v1.98`）；头部版本行 2（≤3 门禁通过） |
| 4 | 主 design §2.1 R2 | :59 | 「+ **手动**提审」→「+ **一键链**提审」；保留「入册 = 归 M4b-7」与三入口描述 |
| 5 | 主 design §2.3 拆批表 M4b-7 行 | :124 | 范围列同步（一键链 / 零写面改动 + 1 只读端点） |
| 6 | 主 design §5.1 页面职责矩阵行 | :374 | 「上传后**手动**「提交审核」· 撤回」→ 一键链 + 两出口 |
| 7 | 主 design §5.2 路由清单行 | :396 | 「新建资产 + 单 zip 上传（进度）+ **手动**提审（M4b-7）」→ 一键链 |
| 8 | 主 design §8 接口变更总览「M4b-7 预告」 | :674 | 「**零服务端改动**」→「零写面改动 + 1 只读端点 `GET /api/meta/limits` + 2 处默认值放宽」 |
| 9 | 主 design §14 规范同步项（`publish` 组落地注记） | :1011 | 时点由「M4b-7 收尾」→ 落地；键数回填 |
| 10 | 主 design 头部 `Updated:` + §15 修订记录 | 头部 / §15 | ✅ **已执行**：加 **v1.76** 行（实测基线 **v1.75** —— 原估 v1.72 已过时，定稿时按实测订正）；头部下沉 v1.74（口径行下界 → `v0.1–v1.74`） |
| 11 | 主 design §2.3 批件登记表 M4b-7 行 | :168 | ✅ **已执行**：`—` / ⬜ 待对齐 → 定稿件名 + design **v0.8** + plan **v0.4** + ✅ 已对齐 |
| 12 | `AGENTS.md` 快照行 | :122 | **已核**：实测该行只记「下一批 = M4b-7（发布批）」，**无「手动」字样** ⇒ 零改动（复核结论登记） |

> 顺序：**先改主 design（4–11），再改 `docs/00`（1–3）**（追踪表引用主 design 版本号）；改完跑文档门禁四道（§9.2）。

> **执行结果（2026-09-28 定稿）**：**12 处全部落地** —— 主 design （4–11） ⇒ **v1.75 → v1.76**；`docs/00` （1–3） ⇒ **v1.99 → v1.100**；第 12 处 `AGENTS.md` **已核零改动**（该行只记「下一批 = M4b-7（发布批）」，无「手动」字样）。**两处口径词全仓清零**：「手动提审」与 M4b-7 语境下的「零服务端改动」在 `docs/00` / 主 design / 本 design 三处**均已改为一键链 / 零写面改动**（残留命中仅历史修订记录行，属史实）。

### 9.7 收尾回填项

| # | 回填项 | 口径 |
|--:|---|---|
| ① | 上限表述同步（**F1 扩面**）· **✅ 实测完成** | **规范层**：`docs/02` §3.3 / `docs/03` §5 / `docs/04` §5 的「单文件 ≤1MiB / 总包 ≤10MiB」→ 新默认（与 §5.2 同批）。**代码侧 6 处**：`validate/zip.ts:6,7,194` · `validate/frontmatter.ts:24` · `http/assets.ts:545` · `http/assets.test.ts:351` · `assets/versions.ts:27` ⇒ 改「引用 env 单源 + 去写死字节数」。**历史豁免（F5）**：`docs/plans/M2-assets.md:88,93,169` 与 `docs/plans/M3-governance.md:374` 的旧字节数属**史实**，按仓规（历史 plan 不回改）**不动**。⇒ **本批实测**：规范层 3 件已改为 10/100 MiB（`docs/02` §3.3+§4.1 · `docs/03` §4.1+§5 · `docs/04` §5）+ 代码侧 6 处改「引用 `config/env` 单源」⇒ **全仓零旧值**（`grep '10MiB\|1MiB'` 仅剩史实 plan） |
| ② | i18n 键数实测 · **✅ 实测完成** | `publish` 组实落键数（**设计值 55** = 50 − 1 归一 + v0.4 新增 6）· `errors` 组新旧总数（**实测 42 → 68** —— 设计原写 40 → 66，F225 订正）· zh/en 差集（0）· 复用键数 |
| ③ | 件行数 · **✅ 实测完成** | **新建 10 件 = 1678 行** · **改造 25 件 = 6955 行**（逐件 `wc -l` 见证据文件 §3） |
| ④ | dogfood / 门禁读数 · **✅ 实测完成** | **九段**逐段 PASS/FAIL · 门禁逐道 exit code · 零回归换靶条数 |
| ⑤ | 端点出参 ↔ 页面消费点 · **✅ 实测完成** | `GET /api/meta/limits` 三键 ↔ ② 段上限文案（C1/C2 链路） |
| ⑥ | 造数残留 · **✅ 实测完成** | `m4b7-` 前缀资产 / 版本 / review / 审计行清理结果（零残留） |
| ⑦ | findings 起始号 · **✅ 实测完成** | 起始 = **现存最大号 + 1**⇒ **本批实际起始号 = F222**（实测基线最大 = F221）· 实际登记 **F222–F237（16 条）** |
| ⑧ | **F 号总览 + 批指针（Q2 补 · 时点 = 实现期首条 findings 登记时同批）** | ① `docs/README.md` §6.1 F 号导航表：新增 **M4b-7 行**（段位自起始号起）+ **「（当前批）」标注由 M4b-6 行移至 M4b-7 行** ② `AGENTS.md` 批指针：**「下一批 = M4b-7」→「当前批 = M4b-7 · 下一批 = M4b-8」**（该文件受写入保护 ⇒ 实现期须用户当场批准）—— **不列件**（先例：M4b-6 design :766「两份 README 无需批件登记」） |

### 9.8 实施期发现与处置（起始号 = 现存最大号 + 1）

> 明细主家 = 本节；批 plan §7 与证据文件只放指针/一行摘要（约定见 `docs/designs/README.md`）。

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F222** | server / 测试 | **design §5.2 的断言不实**（实现期实证）：原文称「既有 413 用例为**注入式**（不依赖默认值）」；**实测** `http/assets.test.ts:351` 用 11 MiB 包 + **默认** 10 MiB 总包上限触发 ⇒ **依赖默认值**。上限放宽后该包落在总包限内、改由单文件限触发 ⇒ 断言码 `asset.package_too_large` 不再成立 | 改**注入式**：`ASSET_PACKAGE_MAX_BYTES=64KiB` + `resetEnvCache()`，载荷降为解压后 128 KiB（`finally` 还原 env + 缓存）；用例标题去写死数字（随 **M20**）。实测 **101 pass / 0 fail** |
| **F223** | server / 注释 | `validate/zip.ts:6-8` 注释里的 env 键名写成 **`AHT_*`**，而真键 = **`ASSET_*`**（`defaultZipLimits` 实读 `ASSET_*`）—— **既有漂移**，非本批引入 | 随 **M17** 同批订正为 `ASSET_*`，并统一改为「数值真源 = `config/env`，注释不写死字节数」 |
| **F224** | server / 门禁锚点 | **T1 插入 3 行**（`app.ts` 的 import + 注释 + `app.route('/api/meta', …)`）⇒ M4b-6 登记的门禁锚点 `doc-claims-check.ts` 里 `app.ts:214 createAdminRoutes` **漂移**（实为 **217**），`doc-claims-check` 首轮实测报 FAIL | 锚点 `214 → 217` + 就地注释说明迁移原因（**M23**）；断言意图（改动 1–3 挂载点存在）不变。**候选**：锚点健壮化（按关键词搜索、免行号）—— 跨批改门禁语义，不在本批 |
| **F225** | i18n / 键数口径 | 设计写「`errors` 组 **40 → 66**」，**实测改前叶子键 = 42**（40 个带点码 + `network` / `unknown` 两枚简单键——设计计数只数了带点键）⇒ 真值 **42 → 68** | 订正 design §1.3/§6.1/§9.7②（+ 冻结前置清单）与 plan 3 处为 **42 → 68**；`publish` 组 **55 键**实测与设计一致 ✅ |
| **F226** | web / 客户端复用面 | `client.ts` 的 `doFetch` 在 **2xx 但响应体非 JSON** 时 `JSON.parse` 抛 `SyntaxError`（**非 `ApiError`** ⇒ 调用方无法按统一口径归一）；对照本次 `apiUpload` 实现（其 onload 内已 try/catch 归一为 `ApiError('invalid_response')`）时发现 —— **既有问题，非本批引入** | **登记不修**：改 `doFetch` 属**跨件行为变更**（影响全部读面消费点的错误形态）⇒ 不在本批；`apiUpload` 侧已按新口径实现（无悬挂风险） |
| **F227** | web / 件面漏项 | **设计漏了跳 3 的前端封装**：design §4.4 的跳 3 必须调 `POST /api/assets/:slug/versions/:version/submit`，但 §3.2 **M7** 行只写了 `uploadVersion` ⇒ 前端**此前全仓零 submit 封装**（grep 零命中）——否则 T5 编排无可用调用面 | 在**同一件**（`api/versions.ts` = M7）补 **`submitVersion` + `SubmitVersionResult`**，**不开新件** ⇒ 件面保持闭合；契约照服务端（`{}` body · 201 `{taskId,reviewVersion,status}`） |
| **F228** | web / vendored 账目 | **T6 加件暴露既有漂移**：`shadcn/README.md` 与 `THIRD-PARTY-NOTICES.md` 均写「**33 components**」，而实测目录 `.tsx` = **36**（历史加件未同步账目）—— 本批再 +2 ⇒ 正确值 **38** | 两处 `33 → 38`（**M24/M25**）并登记；**沿革**：+3 漂移的成因未追（不在本批时间线内）· 顺带确立「加 vendored 件须同批更新两处账目」 |
| **F229** | web / 读面参数 | **T8 冒烟实证**：`fetchMyAssets({ q: market.committedQ })` 在搜索词为空时发出 **`?q=`**，而服务端 `meQuerySchema.q = min(1)` ⇒ **400 `request.invalid`** ⇒ 点「选用已有资产」整块退化成 `ErrorState`（实测） | 调用点归一：空串 ⇒ **省略 q**；>100 字符 ⇒ 按服务端上限截断（`slice(0,100)`）；就地注释说明 |
| **F230** | web / 占位符名 | **T8 冒烟实证**：`field.file.hint` 键内占位符是 **`{count}`**，而调用点传的是 `maxFiles` ⇒ 页面原样渲染「文件数 ≤ **{count}**」（实测）—— 正是 **T3 B2** 登记的那类「占位符 ↔ 调用点参数名不一致」风险，本轮**实锤** | 调用点改 `count:`（**不改字典**：55 键为设计冻结）；就地注释；**候选**：把该一致性纳入 T9 dogfood 静态断言（B2 残留项） |
| **F231** | web / 深链功能 | **T8 冒烟实证（真功能缺陷）**：`?slug=` 深链**从未生效** —— 取数条件只看 `mode === 'existing'`，而深链进入时 mode 还是默认的 `new` ⇒ 解析分支不可达；浏览器里看到的「回落新建」实为**默认态**而非深链结果（设计 §4.8「`?slug=` 有值 ⇒ 预选」未实现） | 加 `deepLinkResolved` 状态：无参数即视为已解析；有参数 ⇒ 即使「新建」支也取一次数，命中 ⇒ 切「已有」+ 预选，无效 ⇒ 轻提示 + 保持「新建」 |
| **F232** | web / 选择器回显 | **T8 冒烟实证**：选中资产后 Combobox 输入框**不回显 slug**（输入框绑的是 `?q=` 草稿）⇒ 用户看不出选的是哪个（上下文行只给「暂无版本」） | 拆成两个态：`displayQuery`（显示：选中 ⇒ slug / 输入 ⇒ 草稿）+ `market.q`（服务端搜索，300ms 防抖）；重新输入即清空选中 |
| **F233** | web / 门禁锚点（二） | **T8 在 `main.tsx` 个人段插入 2 行**（路由注释 + `/dashboard/publish` 路由）⇒ `doc-claims-check.ts` 里 `main.tsx:158 /admin/assets` 锚点**再次漂移**（实为 **159**）——与 **F224** 同源同类（行号锚点随插入失效；本批第 2 次） | 锚点 `158 → 159` + 就地注释（**复用 M23** —— 同一件，不新开）；**候选升级**：把该锚点改为**关键词搜索**（免行号），否则每批加路由都要改一次 |
| **F234** | 门禁自身（N10） | **第五道门禁首跑实测**：规格（N10 行）只说豁免「§9.6 同步点 + `docs/plans/**`」，实跑扫出 **17 条未归属** —— 逐条归类：**归一化类**（`docs/02`/`03`/`04`/`07` 等简写，实为 M13–M16 的真路径）· **目录泛称**（`apps/web/src` · `apps/server/src/http/`）· **证据引用**（`reviews.ts` · `next.ts` · `PageHeader.tsx` · `designs/README.md` —— 只读不改）· **原型物料**（3 件，设计明示不上仓）· **否定断言**（`apps/server/.env.example` = 「无该文件」）。**其中真·漏件 = 0**（件面闭合成立，反向验证 F7 类已清零） | 按 4 类校准门禁：① `docs/NN` **归一化**（非豁免 —— 仍须命中件面）② 目录泛称天然豁免 ③ 显式 `EVIDENCE_ALLOWLIST`（**人工评审维护**）④ 否定断言入 `EXEMPT_EXACT`；复跑 **35 PASS / 0 FAIL** |
| **F235** | 造数 / 与 §9.5 字面偏离 | design §9.5 写 `ACTIVE` 且「**不造 PUBLISHED 版本**」，但同处又要求 `m4b7-fix-1`「**有 1 版本**」且 G4 点名「预填正常 +1 分支」——**后者只有已发布版本才可达**（`latestVersion` 只来自已发布版本）⇒ 字面自相矛盾 | 取两全：① 资产态用 **`HIDDEN`**（零门户污染，对齐 `m4b5-seed-*` 先例；「选用已有资产」走 `/api/me/assets` 不受影响）② `m4b7-fix-1` **确造 1 条 PUBLISHED 1.0.0**（= latest） |
| **F236** | 造数集 / 覆盖缺口 | §9.5 的造数集（2 资产 + 1 DRAFT + 1 PENDING）**不足以覆盖 G4 点名的第三支**「`-pre` ⇒ 剥段补位」—— 无任何夹具的 `latestVersion` 带 `-pre` 段 ⇒ 该分支不可达 | 补 **`m4b7-fix-3`**（mcp · HIDDEN · `2.0.0-pre` PUBLISHED = latest ⇒ 预填 `2.0.0`）；**真机实测三支**：`fix-1` 1.0.1 · `fix-2` 1.0.0 · `fix-3` 2.0.0 ✓ |
| **F237** | 实现期踩坑（自产） | 造数脚本首版 cleanup 用**猜的列名** `audit_log.payload` ⇒ 实跑 **42703（列不存在）**；真列为 `detail`（jsonb）+ `target_id` / `target_type` | 读 schema 后改 `target_type='asset' and target_id = any(...)` + `detail::text like '%slug%'` 双通路；教训：**写 SQL 前先读 schema，不猜列名** |
| **F238** | 件面 ↔ 实现文件名 | **T10 收尾实测**：design §3.1 **N8** 写的是 `docs/smoke/scripts/m4b7-publish-dogfood.ts`，而实现期我落成 `m4b7-dogfood.ts` ⇒ **件面路径与实现不符**（第五道门禁的 ①c 只对「已存在」的 N 件查同形 ⇒ **未拦住**本类） | ① `mv` 改名对齐件面 + 先例（`m4b6-governance-dogfood.ts`）；② **改名后重跑九段**（47 PASS / 0 FAIL）保证证据对得上最终工件；③ **候选**：第五道门禁补「N 件名未命中件面路径」的反查（跨批改语义，不在本批） |
| **F239** | 规范层回填形态 | **T10 实做偏离**：§3.2 的 M13–M16 描述为「§4 错误码表**补『建议 i18n』列**」，但实测 `docs/02` §4 表为 3 列、逐行加列需重排全表（且与 `docs/03` §4 **无码表**的现状不对称）⇒ 改**增量块**落地：`docs/02` §4.1 / `docs/03` §4.1 / `docs/04` §5 注记 + `docs/07` §3.1，键名映射 = **直用码**（零转换） | 采用**增量块**（信息等价、改动面更小、便于 diff 复核）；已在 plan §7.1 的 T10 行如实标注 B2 扣分理由 |
| **F240** | 文档纯度（深度档抓到） | design §4 硬口径第 2 条残留**否决方案措辞**（「原型轮已否决：分步向导…」）—— 违反仓规「**否决方案不入文档**（视为污染），只记拍板结果」（`docs/README.md` 纪律要点 + F195 同类） | 改写为**正面陈述拍板结果**（「三段同页平铺 + 单按钮，不设分步向导」）；全仓复扫：新增/改动 md 内**零否决方案**（余下命中均为纪律条文本体或**历史修订行**） |
| **F241** | web / 错误呈现 | **页面丢弃服务端原文**：`Publish.tsx` 的 issue 行只渲染 `path + 本地化码`，丢掉 `issue.message`；而 `package_layout_invalid` 这条**只有 message、没有 path**（`validate/skill.ts:57`）⇒ 用户只看到族码文案「包结构不符合协议要求」，零信息量（**用户 2026-09-28 实机报告**） | issue 行改为 **path（若有）· 本地化码文案 · 服务端原文 `message`（若有）**；② 段上传区加静态提示「主文件需在包**最外层**（压缩时别套文件夹）」；dogfood 断言必查（断 ③ 显示原文） |
| **F242** | server / 协议容错（zip 归一化） | **协议容错缺口（用户拍板 B）**：`docs/02` §2 要求主文件「root 级」，用户/常见打包方式（macOS 右键压缩）会套一层同名目录 ⇒ 合法内容被拒；实测 `skill-ucts-report.zip` 即此形态（`skill-ucts-report/SKILL.md`） | **服务端归一化**（用户 2026-09-28 拍板「B+」）：zip 内全部条目同处**唯一**顶层目录 `X/` ⇒ **剥 1 层**后再跑全部校验与入库（`asset_file.file_path` 存**剥后**路径 ⇒ 下载/安装结构干净）。边界：**只剥 1 层**（套两层仍拒，报错注明「已尝试剥一层」）· 剥后仍无主文件 ⇒ 按原规则拒 · macOS 元数据 `__MACOSX/` 与 `.DS_Store` **忽略**（OS 元数据不罚用户）· **`__pycache__` / `*.pyc` 一并忽略**（用户 2026-09-28 追加拍板「按推荐」：Python 自动产物与 `.DS_Store` 同类；**忽略 = 不入库**，包更干净）。协议同步：`docs/02` §2 + `docs/03`/`docs/04` 同规则 |
| **F243** | web / 按钮状态（实现缺陷） | **失败停点后主按钮永久禁用**（实现缺陷 · 用户 2026-09-29 实测报告「纠正错误后按钮还是 disable」）：`canPublish` 含 `stopAt === null`（`Publish.tsx:272`）⇒ 任一跳失败即置位 `stopAt`，用户**就地改正字段**（slug / 版本号）只清 `fieldError`、**全仓无任何路径复位 `stopAt`**（仅 `publish()` / `resetForm()` / 文件 `onChange` 三处会清）⇒ 主按钮永久 `disabled`，唯一出路是重选文件或整页复位 —— 与 design §4.8/N6「失败停点按钮**复用 `action.publish`**（= 重试）」**直接冲突** | **删掉该门**（用户 2026-09-29 拍板「A」）：失败后主按钮立即可点 = 重试；`publish()` 内部已 `setStopAt(null)` 刷新右栏失败态，跳1 幂等由 `createdSlug` 兜住（D39，不重复注册资产）。备选 B/C（「改字段隐式复位失败态」）**不做** —— 显式点击重试比隐式状态复位可预测。验收：dogfood **G6①b**（失败后按钮可点）+ **G6①c**（点它确实重跑 ⇒ 再次 409 行内 · 零重复注册） |
| **F244** | web / 版本号（实现缺陷） | **版本号在「已有 → 新建」切换时不回落**（实现缺陷 · 2026-09-29 由 T9 的 G4㉔ 断言暴露）：`Publish.tsx` 的版本号 `useEffect` 首行 `if (mode !== 'existing') return;` ⇒ 从「选用已有资产」切回「新建」后版本号**残留 `latest+1`**（实测 1.0.1，应为 `1.0.0`）；初始值靠 `useState` 初始化器兜住，故只在「切回」路径暴露 —— 本轮之前无任何断言覆盖该路径 | **改为两模式都派生**：`setVersion(deriveNextVersion(mode === 'existing' ? (picked?.latestVersion ?? null) : null))` ⇒ 新建 `1.0.0` / 已有 `latest+1`。回归守卫 = dogfood **G4㉔**（自动切「已有」后点 × ⇒ 模式回「新建」+ 版本回 `1.0.0`） |
| **F245** | 文档面 / 提交前体检 | **拖拽增量批末提交前体检抓出 6 类文档结构缺陷（4 类已入库）**：① 头部**同号重复版本行** 2 处（`docs/00` **v1.101 ×2** · 主 design **v1.77 ×2** —— 「落地回填」轮把上一版号一并改成了新号）② §9.8 **F232 行粘连**（F228 的「问题/处置」两 cell 被重复粘在行尾 ⇒ **7 separators**，**已入库**）③ §9.8 **F241–F244 缺「面」列**（本轮自产：3 cells ↔ 表头 4 列）④ 主 design §2.3 **M4b-7 登记行两处残留**（`errors` **40 → 66** 未随 **F225** 订正 ⇒ 实测 **42 → 68**；末列仍「⬜ 实现待办」而状态列已写「已落地入库」）⑤ 表格**未转义 `\|`** 2 处（主 design v1.58 行描述「` \| ` 数」字面 · 批 design §9.6 `code \| 含义 \| 建议 i18n`）⑥ `docs/07` §3.1 行内 `grep -rn step.create\|step.submit` 未转义 | 逐条订正：① 恢复 **v1.100** / **v1.76**；② 截断重复段；③ 补「面」列 4 行；④ 改 **42 → 68**（基线实测于 `e638392`：`errors` 叶子键 **42** · 现状 **68**）+ 末列改实；⑤⑥ 转义为 `\|`。**扫类** = 7 份改动文档全表跑「数据行 cells == 表头」+ 修订表版本号唯一性 + 头部 Updated 行唯一性 ⇒ 复跑 **0 异常** |
| **F246** | 文档面 / 历史档案 | **扫类时实测「截断表格行」27 处**（行首 `\|` 起但行尾**无 `\|`** ⇒ 行后半内容丢失）：`2026-09-16-m4b2-auth-shell-design.md` **14 行** · `M4b-2-auth-shell.md` **6 行** · `docs/00` §8 **7 行**（v1.47–v1.53 · 2026-09-16 · 均止于半句，如「…出口件 ④ 由」）。**实证非本轮引入**：12 个近期提交中该 7 行长度**零变化** ⇒ M4b-2 轮事故遗留；前两件属**已收口批档案** | **本轮处置**：本批 design **D49 行**（同族第 28 处）**已补收尾** `\|`（行内语义完整）；跨批 27 处 **登记不修** —— 回改已收口批档案违反仓规「历史 design/plan 不回改（唯一例外 = 后继变更指针）」⇒ 回填方案（引入前历史逐行恢复 vs 留指针不恢复）**待用户拍板**。**探针**：全 `docs/**/*.md` 扫「行首 `\|` ∧ 行尾无 `\|`」 ⇒ 现读数 **27**（docs/00 7 属活文档、可随拍板修）。**✅ 已修复（2026-09-30 · 用户拍板 1B）**：**实测订正** —— 27 处**全部为「表格行未闭合 + 续文游离表外」**（**27 处续文均在文件内**：19 处紧邻断尾行 · 8 处块位置错位 ⇒ 判归属后搬移；非「内容丢失」· **零考古零编造**）；修复 = 续文**归位并合并回单行**（读回探针 27 → 0）；顺带**加门禁判据**（`table-structure-check`：行首 `\|` 起 ∧ 行尾无 `\|` ⇒ FAIL + 反证实证）+ 仓规例外显式化（`docs/README.md` 纪律要点「修复文档事故」，非改写结论）；同批修订行 = `docs/00` **v1.111** · M4b-2 设计 **v1.31** · M4b-2 计划 **v0.24** |
| **F247** | web / 文案陈旧（T10 落地遗漏） | **页头副标题与 IA 改名脱节**：`apps/web/src/i18n/zh.ts:253` 仍写「填好资产与版本包，点一次「发布」：**新建 → 上传 → 提交审核** 一次完成」（`en.ts:254-255`（实测行号 · 原稿误写 257-258，本轮总检订正）同源同病：`create, upload and submit in one go`），而 T10 已把三段改为「上传 → 自识别 → 发布」—— 由 T11 设计期回读页头渲染点（`Publish.tsx:486` 取 `publish.subtitle`）时发现 | 随 **T11** 落地订正：`publish.subtitle` **改值**为「核对识别出的资产详情，确认后发布」（照搬 ClawHub `publish.tsx:812` 语义）+ 新增 `publish.subtitle.empty`（未给包时的上传引导）⇒ `publish` 组 **57 → 58**；`docs/07` §3.1 键数随 T11 同步 |
| **F248** | 文档 / 跨件指代漂移（T10 落地遗漏） | **T10 把左栏三段重排为「① 上传 → ② 自识别 → ③ 发布」，全仓「② 段 = 上传」的旧指代未跟着扫**（T11 设计期 Step 0「读全文」发现；不修的后果 = T11 的「展开/隐藏」会把**拖拽区**写成会被藏起来的段）：增量 design **11 处**现状描述 · 增量 plan **4 处** · **批 design §4.1 线框 + §4.2 左栏三段 + §4.3/§4.6/§4.8 段号**（仍写 ① 新建资产 / ② 上传版本 / ③ 提交审核）· **批 plan §3/§7 两处**（「② 段进度」）。真码现值 = `Publish.tsx` 三段 legend `1/2/3` + `step.upload/detect/publish`，且 dogfood **G3⑦** 已断言 DOM 顺序 = 上传 → 自识别 → 发布 | **已订正**：增量 design **11 处** + 增量 plan **4 处**（现状描述全改「① 段（上传）」· `slug` 所在段改「② 段（自识别）」）；**史实行保留原貌**（v1.2 / §7⑥ / §8 旧行）⇒ 两份修订行各加一句「更早行中的『② 段』= 重排前的上传段」澄清。**批 design 全量回填 = T11 尾实测展开**：逐行枚举后**改动面 40+ 处**（§4.1 形态线框 · §4.2 左栏段表 · §4.3 · **§4.4 右栏映射**（链三跳 ↔ 面板段号）· §4.6 错误矩阵 · §4.8 状态表 · **§4.9 五态 ASCII 线框**（含 T11 新形态）· §6.2/§7/§9.3/§11 引用点）+ 批 plan §3/§7 ⇒ **超 T11 尾部预算** ⇒ 拆为独立一笔（原「段号/文案级」备选未采纳） | **✅ 已处置（2026-09-29 · 用户拍板 2A 整批回填）**：**40+ 处**全部落地（含 §4.9 **五态线框重写** · §4.4 面板映射新写 · §4.6 矩阵 10 行 · §4.8 状态表 14 行 · §6.2 键表按 `zh.ts`/`en.ts` 逐键回读订正 **4 处键名 + 4 处值** · §1.3/§2.1 D1·D2·D3·D32/§2.4 C8 · §9.3 G3/G6）；批 design 升 **v0.14** · **§11.12 复评 9.48**（回填前复核读数 9.25 —— 该 40+ 处漂移此前从未被计分）· 批 plan `M4b-7-publish.md` 同步升 **v1.6** |
| **F249** | 文档 / 三向不一致（T12 抓出） | **批 design §4.2 的 `EmptyTitle` 文案与真码 / 键表三向不一致**：§4.2 写「还没有选择包」，而真码走 `field.file` 渲染「包文件」（`Publish.tsx:555`）、同文档 §6.2 键表第 27 行也写「包文件」—— 三处两说（由 T12「照搬 ClawHub 空态」回读渲染点时抓出；同族 = **F247/F248** 的「改名/改文案未回扫」） | **已修（T12）**：§4.2 改为「`EmptyTitle` = 动作号召（`field.file` ⇒「先上传资产包」）」+ `EmptyDescription` 换 `field.file.drop` + 上限下沉说明 ⇒ 三向一致（真码 = §4.2 = §6.2 键表） |
| **F250** | web / 文案键孤儿（T13 事实核查） | **`error.rateLimitedCountdown` 是孤儿键 + 文档声明与实现两说**：批 design **D43 / C14** 声明「429 ⇒ 主按钮文案 = `error.rateLimitedCountdown`（`{seconds}`）」，而实现（`Publish.tsx:853`）取的是 `tErr('auth.rate_limited')`（**无秒数**），秒数另用一条 `FieldDescription` 承载 ⇒ 两说并存；该键全仓 **零消费**（grep 实证：仅 zh/en 定义 + 本文档引用）—— 由 T13「① 段视觉重做」回读 429 呈现点时抓出 | **已修（T13）**：① 段内 `Alert` 与主按钮标签**统一取 `error.rateLimitedCountdown`**（孤儿键转活）+ ③ 段重复的 `FieldDescription` 撤除（同屏去重）；主按钮倒计时禁用语义**不变**（D43 不撤销）|
| **F251** | web / 文案陈旧（T10 遗留 · T14 抓出） | **`flow.note` 文案与页面三段 IA 语义相撞**：「一次点击依次执行三步；任一步失败即停在该步」中的「三步」指**后端链路**（创建资产 / 上传包 / 提交审核），而 T10 之后页面自身也有三段（上传 / 自识别 / 发布）—— 同屏两套「三步」，读者必然混淆（同族 = **F247** / **F249** 的「改名 / 改文案未回扫」）。由 T14 整页重做回读 ③ 段渲染点时抓出 | **处置（T14 · 设计已定 · 实现待办）**：随整页版式重做**撤除该句显示位** ⇒ 键**退役**（zh/en 各删 1）· `publish` 组 **62 → 62**（净 0：+`summary.title` / −`flow.note` / 改值 `action.publish`）· 唯一源 = 增量 design **v2.0** §3.3 |
| **F252** | web / **数据源口径**（用户实测报缺陷 · T15 抓出） | **「自识别版本号」在存在未发布版本时算错**（用户原话：「『该版本号已被占用，请换一个』有个问题，前面有待审核的版本时，自识别的版本号是错误的」）：客户端数据源（`apps/server/src/http/asset-item.ts:45` 只下发 `latestVersion` = 最新**已发布**版本投影）↔ 服务端占号检查（`apps/server/src/assets/versions.ts:55-61` = 同资产 `(asset_id, version)` **跨全状态**唯一 · **唯一豁免** `SCAN_FAILED`）⇒ 预填的号**撞在在途版本上**。现场（真库 · 真页面**只读**实测）：**用户自有资产** `skill-ucts-report` 压着 `DRAFT 1.0.0` + `PENDING_REVIEW 1.0.1/1.0.2` 而 `latest_version_id = NULL` ⇒ 页面预填 `1.0.0`（必 409）；同类样本 `m4b7-dogfood-mumj6cnk`（在审 1.0.0 · 未发布）同病。反证面：`m4b7-fix-1`（`PENDING 0.0.1` + `PUBLISHED 1.0.0` ⇒ 1.0.1）与 `m4b7-fix-3`（`2.0.0-pre` ⇒ 2.0.0）**取值不变** ⇒ 新口径**向后兼容**（既有 G4③④⑤ 断言零改写） | **已修（T15 · D25）**：数据源改 `GET /api/assets/{slug}/versions?limit=100` ⇒ **真实占号集合**（`status !== 'SCAN_FAILED'`）⇒ 取最大号 +1（`-pre` 剥段保留）；**三入口同源**（深链 / 手动选中 / **拖包自动判定** —— 用户点名要求）· 拉取失败静默回落 · `versionTouched` 保护 · 序号竞态保护；**D37 仅「不拉版本列表」一条作废**（不自动重试 / 409 交用户手改 / `-pre` 剥段一律不变）· 唯一源 = 增量 design **v2.1** §3.4/D25 |
| **F253** | web / **文案不实**（同根 · 用户同报 · T15 抓出） | **两张与 F252 同根的脸**：① 资产上下文行在「未发布但压着在途版本」时显示「**暂无版本**」（**不实** —— `skill-ucts-report` 实际压着 3 个版本；根因同 F252 = 取值只有 `latestVersion`）② 撞号后只给「该版本号已被占用，请换一个」，**不说原因、不给建议号**（用户只能盲猜；同族 = **F247/F249/F251** 的「文案未跟随能力演进」） | **已修（T15 · D26/D27）**：① 新增 `field.asset.inflight`「在途 {version}」（取值源 = 占号集合；无在途但有占号 ⇒ 沿用 `field.asset.latest`；集合为空 ⇒ `field.asset.latestNone` —— 此时**为真**）② 版本号字段**前置**行内提示 `field.version.occupied`（含 `{state}` 与建议号；状态词**复用既有 `version.status.*` 八键**，零新增状态文案）⇒ `publish` 组 **62 → 64**（+2 新增 · 零退役 · 零改值）；服务端 409 文案**保留为兜底**（并发 / 他页改动） |
| **F254** | web / **死导出**（提交前体检轮抓出 · T15 自产） | **`compareVersions()` 导出但仓内零消费者**：`publish-chain.ts` 新增该导出，实测 `grep -rn compareVersions apps/web/src` 的非本文件命中 = **0** ⇒ 属「死导出 / 空壳件」（同族 = 仓规 D4①「第二处消费出现再抽」）。由**提交前体检**的换靶角度「**死导出 / 零消费者扫描**」抓出 | **已修（T15 体检轮）**：去 `export` 收敛为**模块内函数**（`maxVersion` / `nextAvailableVersion` 消费）· 附「不导出 + 将来第二处消费再提为公共件」说明；导出面复核 = `deriveNextVersion` / `occupiedVersionsOf` / `maxVersion` / `nextAvailableVersion` / `deriveSlugFromFileName` 五项，**逐项有仓内消费者** |
| **F255** | web / **死条件**（F248 回填轮抓出 · 静态反证） | **右栏流程行的行内进度从不渲染**：`Publish.tsx:1313-1319` 的条件 = `step.n === 2 && state === 'active' && running`，而 `panelStates`（`:682-691`）在 `running` 分支恒返回 `['done','done','active']` ⇒ **面板 active 永远落在第 3 行（`step.publish`）**，与 `step.n === 2` 不相交 ⇒ 该分支不可达。后果 = 右栏那一行进度条与其百分比**从未出现**（进度实际只在 **① 段**段内可见，T13 已落 —— 用户可见面不缺，属**死代码 / 冗余条件**）。同族 = 仓规 D4①「第二处消费出现再抽」的反面：**条件成立域为空**。真值来源 = 真码逐行回读 + `panelStates` 取值域穷举（五分支中 `active` 只出现在「未选文件」与「执行中」，二者互斥） | **已修（用户拍板 **1B** · 2026-09-29）**：**删该分支**（`Publish.tsx` −8 行）⇒ 右栏回归「状态记号 + 段名 + 态文字 + hint」单一职责，进度只留 **① 段**（T13 既有）。**验证** = 条件不可达性静态反证（`panelStates` 穷举）+ **dogfood 全量十段 102 PASS / 0 FAIL** 复跑 + typecheck **4/4** / lint **4/4** / format **325 files** / build **4/4**。**残留已闭**：该删除的**正向守卫** = **G5⑪**（上传中右栏不含 `[data-slot=progress]` ∧ 右栏两卡在位 —— 反证式，注入 `n===3` ⇒ FAIL 实证） |
| **F256** | 文档 / 头部陈旧（F248 回填轮回读抓出） | **`docs/plans/M4b-7-publish.md` 头部 `Status: ⬜ 待实现`**（原文「待实现（设计已定稿 · 2026-09-28；本 plan 为实现唯一依据）」）与其**自身修订记录**（v1.5 = 「T10 完成（收尾）· 十 Task 全绿 · 均分 9.56」）**相反** ⇒ 落地后头部未随修订记录更新（同族 = 批 design §2.1 D-行的「口径未跟随能力演进」） | **已修（本轮）**：订正为「✅ **T1–T10 全绿并已入库**（2026-09-28 · 均分 9.56）—— T11–T15 验收期增量另见 `M4b-7-drag-upload.md`」；批 plan 升 **v1.6** |
| **F257** | 文档 / **断言声明无实体**（F255 修复轮抓出） | **批 plan §3 T4 的断言声明在脚本里找不到实体**：原文称「dogfood 断言：上传期间 `xhr.upload.onprogress` 被调用（② 段进度文案出现）」，而实测 `docs/smoke/scripts/m4b7-publish-dogfood.ts`（**1833 行**）**零** `progress` / `percent` / `进度` 命中（`rg -ni` 全 `docs/smoke/scripts/` 仅 1 处无关命中，在 m4b3 脚本）⇒ 属**未实证断言**（同族 = 自检体系「未实证断言复核」换靶角度 ④）。**危害**：读取者会以为进度条有回归网（实际没有）；F255 的删除也因此没有正向守卫（右栏无 `progressbar` / ① 段有，均未被断言） | **已订正文案（本轮）**：批 plan T4 断言改为「**未断言**：① 段进度条 / `upload.progress` 文案（手工截图存证 `docs/smoke/m4b7-G5-running.png`）」；**已补（用户 2026-09-29「1A 也做」）**：G5 **+2 断言** —— ⑩ ① 段进度条 ∧ 文案「上传 N%」（**MutationObserver** 抓 <100ms 窗口；细读 DOM 会漏 —— 反证轮实测）· ⑪ 右栏无进度条 ∧ 两卡在位；**反证实证**：临时注入 `n===3`（把进度移回右栏）⇒ ⑪ **FAIL**（`asideProgSeen=1`）而 ⑩ 仍 PASS，撤除 ⇒ 十段 **104/0** ⇒ 守卫**非空转且只抓它该抓的** |
| **F258** | script / **注释腐化**（F255 修复轮抓出） | **dogfood 脚本头 run recipe 指向不存在的文件**：`m4b7-publish-dogfood.ts` 头部第 12 行写 `bun … docs/smoke/scripts/m4b7-dogfood.ts`，而该文件已随 **F238** 更名为 `m4b7-publish-dogfood.ts`（`ls` 实测仅后者存在）⇒ **照头注释跑必 file not found**（同族 = 换靶角度 ③「注释腐化」：改名只改实体、未回扫注释） | **已修（本轮）**：头部 run recipe 订正为 `m4b7-publish-dogfood.ts`；全仓复扫 `rg 'm4b7-dogfood\.ts'` 余 **2 处均为史实行**（§9.8 F238 更名记录 · 批 plan T9 落地行）⇒ 按「史实保留」不动 |
| **F259** | web / **注释腐化 + 零消费者面**（整体审计抓出 · 2026-09-30） | `ComingSoon.tsx` 注释仍写「调用点必须在 `import.meta.env.DEV` 门控下给出（`main.tsx` 的 `DEV_BATCH` 常量表）」，而该表**已随 M4b-6 清空**；同件 `batch?: string` prop **全仓零调用点**（`batch=` 命中 0）⇒ 注释指向已删实体 + 死可选面 | **已修**：删 `batch` prop 及其渲染分支（−3 行）+ 注释订正为「DEV 批次号表已于 M4b-6 删除 · 本件不再带批次标记」；复跑 typecheck / lint / build 全绿 |
| **F260** | 全仓 / **死导出**（整体审计扫类 · 2026-09-30） | 全仓导出扫（404 个导出）实测**真死 6 个**（`FilterBar` · `FILTER_ALL` · `translationInputSchema` · `userRelations` · `sessionRelations` · `accountRelations`）+ **导出冗余 38 个**（仅本文件消费）—— **全部为既有件、非本批引入**（本批件零死导出；F254 已收敛 `compareVersions`） | **口径登记（登记不修）**：真死 6 个中 3 个属 Drizzle `relations()` 面（`import *` / schema 聚合消费存在**假阳风险**）⇒ 单立**专职清理轮**处置；冗余 38 个多为「有意可测面」（权限判定函数等），保留 export 属设计选择，本轮已复核 |
| **F261** | web / **类串重复**（整体审计扫类 · 2026-09-30） | 同一文件内重复 ≥3 次的 className 串实测 **16 处**；其中**非原型件且属本批改动面**的 = `AssetAdminCard.tsx` 的 `mb-2 text-[11px] font-medium text-muted-foreground` **×3**（卡内三段小标题） | **口径登记（登记不修）**：三处语义一致、串长仅 40 字符，抽 preset/件的**间接层代价 > 可读性收益**；沿用仓内同级既有做法（`text-xs text-muted-foreground` 类就地写法） |

**首稿已自查在案、随实现期一并处置的候选（不占 F 号，属本批规格内）**：

1. `main.tsx:110` 原型残留注释清理（M1 同批）
2. `AssetAdminCard.tsx` 头注 `| 版本 | 发布新版本（**占位** → M4b-7） |` 需同步为真链接（M4）
3. `styles/diff-tokens.css:81` 注释「登记 M4b-8」= 视觉收口层，**本批不动**（复核项）

## 10. 引用文件清单

| 文件 | 用途 |
|---|---|
| `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md` §2.1:59 · §2.3:124,140,154,168 · §4:331,343,348 · §5.1:374 · §5.2:396 · §8:674 · §14:1011 | 上游跨批契约与登记位（本批同步回填） |
| `docs/00-product-direction.md` §5:106,107,109 · §8 | 里程碑行与修订记录 |
| `docs/07-i18n-conventions.md` §3:31 · §4 | i18n 组与错误码本地化 |
| `docs/02` §4 · `docs/04` §5 · `docs/03` §4/§5 | 族错误码表与上限表述（本批回填） |
| `apps/server/src/http/assets.ts:209,451,503,588,647` | 注册 / 删除资产 / 上传 / 删版本 / 提审（复用面） |
| `apps/server/src/http/reviews.ts:140` | 撤回提审（复用面） |
| `apps/server/src/assets/errors.ts:8-42` | 资产域业务码全集（18）与 HTTP 映射 |
| `packages/protocol/src/errors.ts:7-32` | 协议码全集（20） |
| `apps/server/src/config/env.ts:42-52` | 上限三键现状（本批改两处默认） |
| `apps/server/src/app.ts:127-214` | 路由注册表现状（本批加 `/api/meta`） |
| `apps/web/src/main.tsx:110,137-153` | 登录段路由与原型残留注释 |
| `apps/web/src/components/ui/navItems.tsx:33-36,88-117` | 占位机制 / 个人组 4 条现状 |
| `apps/web/src/components/ui/TopBar.tsx:58-82` | 顶栏构成现状 |
| `apps/web/src/components/console/AssetAdminCard.tsx:10,148-160` | 「发布新版本」占位 |
| `apps/web/src/api/{client,assets,versions,me,reviews}.ts` | 客户端写面现状与复用点 |
| `apps/web/src/auth/next.ts` | 回跳白名单（已覆盖，零改动） |
| `apps/web/src/i18n/{zh,en}.ts:554-` | `errors` 组现状（40 键） |
| `apps/web/src/components/ui/shadcn/{field,empty}.tsx`（**官方全量**：10 子件 / 6 子件） | 本批**首次用满**官方配方（D32–D36） |
| `apps/web/src/components/console/PageHeader.tsx` · `components/ui/{StatusPill,EmptyState}` · `hooks/useApi.ts` | 复用件（`EmptyState` 薄封装本批**不扩** —— D36） |
| 原型物料（**不进仓**）：`apps/web/proto.html` · `apps/web/src/proto/main.tsx` · `apps/web/src/proto/PublishProto.tsx` · `~/04-ws/24-ai-asset-hub-wireframes/m4b7-publish-wireframe.html` · `.../shots/R1–R6.png` | 形态来源（定稿后删原型目录） |

## 11. 8 维自检

### 11.1 首稿自检（口径：8 维等权算术平均 = 标准 4 维 + 深度 4 维）

| 维度 | 评分 | 说明 |
|------|:--:|------|
| 完整性（标准） | 9.5/10 | 骨架 12 段齐（元信息/批界/拍板/件与路由/页面/服务端/i18n/接口总览/UI 变动/回归/引用/自检）· 拍板 **D1–D26** 闭合有序 · 页面 §4.1–§4.9 含**逐态表 + 四态线框** · 错误矩阵 **10 行** · i18n 键表 **50 行**（**首稿口径** · 现值见 §6.2 = 55）· 同步点 **12 处**（含行号与动作）· 造数 §9.5 含「不造什么」 |
| 一致性（标准） | 9.0/10 | 线框 ↔ 行内描述 ↔ 状态表三向同标记（`●/✓/!/[ ]`）· 术语统一（「一键链」「流程面板」「跳1/2/3」）· 口径翻转在两处显式登记（头部 + §9.6）· 扣分项 = §6.4 规范覆盖数（9/8/10）与对齐轮记的「11 行」不一致（**已按实测订正并写明**）× 实施期键数/行数仍属回填（§9.7） |
| 清晰度（标准） | 9.5/10 | 每条决策带具体值（上限字节 / 键名 / 端点 / 行号 / 桩文案）· 三跳的每跳端点、状态码、失败展示位置逐行写明 · `taskId` 来源指名到响应体行号 |
| 可实施性（标准） | 9.5/10 | 件面 25 件（新建 9 / 改造 16）**（首稿口径 · 现值 = 新建 10 / 改造 25 = 35 件，见 §3.1/§3.2）** 逐件给职责与改动 · 服务端 1 端点出参定名 + 5 条用例 · 客户端 `apiUpload` 复用面逐项列出 · dogfood 八段可写**（首稿口径 · 现值九段，见 §9.3）** · 造数可执行 |
| 设计纯粹性（深度） | 9.5/10 | 单按钮一次点击（3 次点击已压成 1）· 三段同页平铺（无向导页）· 进度只在一处（右栏 ②，不重复占左栏）· 上限文案**单一真值源**（端点）+ 常量兜底 · 复用最大化（25 件里仅 2 只新增官方件、零新依赖）**（首稿口径 · 现值 35 件，官方件仍 2 只、零新依赖 —— §3.1/§3.2）** · 「放弃该资产」/「撤回提交」= 两出口分工不重叠 |
| 边界覆盖（深度） | 9.0/10 | 覆盖：空表单 / 选已有 / 读面载·空·错 / 执行中（含取消）/ 四类失败（409·413·400·429）/ 完成 / 二次确认 / 空壳公开接受项 / 取消的尽力而为语义 / 窄屏堆叠 / `<lg` 顶栏隐藏 / 未登录三入口分别行为 · 未覆盖（登记）：每跳自定义超时（C9 明确不定）、M4c 的 UI 可配上限 |
| 实施精度（深度） | 9.5/10 | 路径全部给出（含新建件落 `apps/web/src/lib/` 与 `apps/server/src/http/`）· 端点方法/状态码/响应体写明 · env 键名与默认值精确到字节 · i18n 键名全量列出 · dogfood 段与造数 fixture 可辨识（`m4b7-` 前缀）· findings 起始号 = 现存最大号 + 1（实测基线 **F221**） |
| 跨平台（深度） | 9.5/10 | 纯 Web + 服务端只读端点，无平台分支；上传走浏览器 XHR（三平台同构）；文件选择用隐藏 `<input type=file>`（非拖拽 API）⇒ 无沙箱/权限差异；无路径/编码依赖 |
| **综合** | **9.38/10** | 逐维相加 **75.0 ÷ 8 = 9.38** —— **未达 9 门槛的维度已在 §11.2 逐条处置**，处置后重评见 §11.3 |

### 11.2 首稿发现与处置（🔴/🟡/⚪）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:--:|------|------|------|
| S1 | 🔴 | §6.4 ↔ 对齐轮记录 | 对齐轮记「11 码建议 i18n 回填」，**实测** 02∪04 覆盖 10 码、差集 10 码 ⇒ 数字站不住 | **撤回旧数**：§6.4 按实测写「差集 10 码 + 1 处命名区分说明」并在正文写明订正；对齐轮记录不再引用 |
| S2 | 🟡 | §4.2 ① 段 | 「选用已有资产」但**我的资产为 0** 时的空态未定义（原型仅禁用 radio） | 补空态键 `field.asset.empty` / `field.asset.emptyAction`（键表 25/26）+ §4.2 空态行 |
| S3 | 🟡 | §4.4 跳2 失败 | 「取消上传」后页面如何判定真实态未写 | 新增 C7（取消尽力而为 + 重取版本列表判定），§4.5 表格同步 |
| S4 | ⚪ | §4.8 | 状态参数是否写 URL 未定 | 明确「无 `?step=`，瞬时态刷新复位」（避免与三段平铺形态冲突） |
| S5 | ⚪ | §2.3 | 「新建 / 选用已有」用原生 radio 还是官方件未定 | 定官方 `radio-group.tsx`（依既有「官方件优先」口径），记入新建件 N5 |
| S6 | ⚪ | §5.2 ↔ 规范层 | 上限放宽后 `docs/02/03/04` 的字节表述会与真值相反 | 列入 §9.7 回填项 ①（与 §5.2 同批改） |
| S7 | ⚪ | §4.2 ② 段 | 「进度条位置」在原型里曾同时出现在左右两栏（第 4/5 轮） | 定「只落右栏 ② 段」（C8），线框与状态表同步 |
| S8 | 🟡 | §9.6 | 同步点数量「3~4 处」为口语估计 | 实测列 **12 处**（含行号 + 动作 + 1 处「已核零改动」） |
| S9 | ⚪ | §9.5 | 413 用例若造 100 MiB 真包则不可行 | 定「跳2 413 走 env 注入小上限」（G6 ④），并写入「不造什么」 |

### 11.3 处置后重评

| 维度 | 首稿 | 处置后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.5 | — |
| 一致性 | 9.0 | 9.5 | +0.5（🔴 S1 撤回旧数 + §6.4 实测订正） |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 9.5 | — |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.0 | 9.5 | +0.5（S2 空态 / S3 取消语义 / S4 URL 口径 补齐） |
| 实施精度 | 9.5 | 9.5 | — |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.38** | **9.50** | **+0.12**（75.0 → 76.0；口径未变 ⇒ **不撤回旧分**，属同口径迭代） |

> 升分构成说明：全部来自**矛盾消解（S1）与边界补齐（S2/S3/S4）**，非口径放宽；被否决方案（「下一步」向导 / 逐行对齐 / UI 可配上限 / 自动回收空资产）**不入档**，相应维度**不为它们加分**。

### 11.4 未决 / 缺口登记（含归属）

| # | 项 | 归属 |
|---|---|---|
| U1 | 上限的**界面可配**（与 `ACCESS_POLICY` 合并，优先级 DB > env > 代码默认） | **M4c**（本批只落默认值 + 只读端点） |
| U2 | 上传/提审的**自定义超时** | 不做（C9；若要，另批给统一客户端超时口径） |
| U3 | 「资产空壳自动回收」 | 不做（D5/D6 显式出口替代） |
| U4 | `/api/meta/*` 后续扩展面（如特性开关） | 未定；本批只 `limits`，扩展需另立契约 |
| U5 | ~~顶栏「发布」入口的 `<lg` 口径~~ | ✅ **2026-09-28 结案（grilling 1A-2）**：**纯图标**（不隐藏）⇒ 落 **D27** + §4.7 |
| U6 | ~~右栏「当前步」是否可点回退~~ | ✅ **2026-09-28 结案（grilling 2A-2）**：**不做** ⇒ 落 **D28** |
| U7 | **仓内既有 2 处** `Field` 消费（`Tokens.tsx` / `ConfirmDialog.tsx`）**未用**官方 `FieldSet` / `FieldLegend` / `data-invalid` 联动 | **不在本批**（本批只在新页用满官方配方）；若要统一，另批扫 —— 属跨批能力债，登记为候选（**N4 实测订正**：原写「3 处」，第 3 处 `src/proto/PublishProto.tsx` 属原型不上仓） |

### 11.5 grilling 轮复评（2026-09-28 · 用户逐条拍板 5 条后）

| 维度 | 处置后 | grilling 后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.5 | — |
| 一致性 | 9.5 | 9.5 | — |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 9.5 | — |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 9.5 | 9.5 | — |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.50** | **0.00** |

> **不上调说明**：本轮 5 条拍板（D27–D31）**均为既有挂点结案与已定项的确认**（U5/U6 收敛 + 官方件 / 撤回通道 / 键表确认），**未引入新面、未消解新矛盾** ⇒ 分数不变；若按「补齐即加分」的宽松口径把 U5/U6 结案折算 +0.1，会与 §11.2–§11.3 的严格口径不一致 ⇒ **如实保持 9.50**（防同口径漂移与自夸）。
> **门槛**：≥9 ✅（口径 = 8 维等权算术平均 = 76.0 ÷ 8）。**待用户「定稿」口令**（口令后执行 §9.6 同步点 12 处）。

### 11.6 官方件配方复评（2026-09-28 · 用户「按推荐来」后）

| 维度 | grilling 后 | 官方件轮后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.5 | — |
| 一致性 | 9.5 | 9.5 | — |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 9.5 | — |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 9.5 | 9.5 | — |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.50** | **0.00** |

> **不上调说明**：D32–D36 确有**实质改善** —— 消除两处自造结构件、把官方 `Field`/`Empty` 配方用满、补上此前缺失的 `data-invalid` 联动；但改幅**不足半档**，且本轮与 §11.2–§11.5 **同口径** ⇒ **如实保持 9.50**（若为此 +0.1，会形成「每轮都涨一点」的观感，与本仓「防同口径漂移 / 防自夸」纪律冲突）。
> **本轮暴露的跨批能力债（非本批缺陷）**：仓内 `field.tsx`（10 子件）与 `empty.tsx`（6 子件）的**部分成员此前零消费**（`FieldSet` / `FieldLegend` / `data-invalid` / `EmptyMedia` / `EmptyTitle` / `EmptyContent`）⇒ 本批在本页**首次用满**；回头扫既有 3 处 `Field` 消费**不在本批**（登记 **U7**）。

### 11.7 grilling 4 轮复评（2026-09-28 · 13 条拍板后）

| 维度 | 官方件轮后 | grilling 后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.5 | — |
| 一致性 | 9.5 | 9.5 | — |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 9.5 | — |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 9.5 | 9.5 | — |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.50** | **0.00** |

> **不上调说明（含自纠）**：本轮 grilling 抓出 **1 条 🔴 真矛盾**（D10「撞号自动 +1 到空缺」↔ C3「409 交用户手改」，已按 **D37** 统一）与 **5 个此前未覆盖的分支**（`?slug=` 无效 / 失败态「已有版本」出口 / 429 限流行为 / 撤回后页面态 / 卸载语义），另订正 2 处契约（URL 口径 D46/C17 · 键数 50 → **56**）。
> ⚠️ 这 5 个分支**正是 §11.6 评分时漏覆盖的**（那一版对「边界覆盖」偏宽）⇒ 本轮补完只是回到 9.50 的实至名归，**不另加分**。
> **自纠登记**：上一轮我随口给的选项「limit 提到 200」**不合法** —— 服务端 `limit` 上限 = **100**（`http/me.ts:25`）⇒ 已在正文撤回该选项（撤回的选项不入档，此处只留一句依据）。
> **门槛**：≥9 ✅（8 维等权算术平均 = 76.0 ÷ 8）。**grilling 前沿已空**；待用户「定稿」口令。

### 11.8 换靶自检与修复复评（2026-09-28 · N1–N7）

**第一步：换靶实测（修复前）—— 撤回旧分**

| 维度 | §11.7 旧报 | 换靶实测 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.0 | −0.5 |
| 一致性 | 9.5 | 8.5 | −1.0 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 8.5 | −1.0 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 9.5 | 8.5 | −1.0 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.06** | **−0.44（撤回旧分）** |

> **撤回说明**：§11.7 的 9.50 是**窄口径**产物 —— 只查了「文档内部自洽 + 我自己的改动是否落地」。换靶口径（**引用语义回读 · 计数跨节对照 · 冗余机制并行 · 未实证断言复核 · 修订声明回查**）实测 **9.06** ⇒ **撤回 9.50**。

**第二步：修 N1–N7 后复评**

| 维度 | 换靶实测 | 修复后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.0 | 9.5 | +0.5 |
| 一致性 | 8.5 | 9.5 | +1.0 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 8.5 | 9.5 | +1.0 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 8.5 | 9.5 | +1.0 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.06** | **9.50** | **+0.44** |

> ⚠️ **分数构成说明（防「同分重报」观感 · 必读）**：本节 9.50 与 §11.7 旧报**巧合同分，但不是沿用** ——
> ① 旧 9.50 是**窄口径虚高**：当时 §4.6 的文案家冲突（违约 `docs/07` §4）、3 处「50 键」失真、D6↔D39 交叉引用漂移、Field 消费计数不实**都已在文档里**，却未被查出；
> ② 本 9.50 是**换靶发现 7 条真缺陷并全部修掉后**的读数（8 维逐维相加 76.0 ÷ 8）。
> **升分构成**：全部来自**缺陷消解**（N1 契约违约 / N2 数字失真 / N3 引用漂移 / N4 计数不实 / N5 引用落点 / N6 无键文案 / N7 历史口径标注），**非**口径放宽。
> **本轮核过且确认无问题的项**（列出示已核）：retryAfterSec 字段名 ✓ · 上传限流 10 次/分 ✓ · 「未登录 ⇒ 个人组不渲染」✓ · 回跳白名单 ✓ · 提审响应体 ✓ · `Upload` 图标零占用 ✓ · EmptyState 消费 8 处 ✓ · 占位机制 ✓。
> **门槛**：≥9 ✅ · **未修项 = 0**；剩 U1–U4 / U7 为「不在本批」登记项，键数/件行数按仓规归实现期回填（§9.7）。

### 11.9 第 4 轮换靶自检与修复复评（2026-09-28 · F1–F6）

**第一步：换靶实测（修复前）—— 撤回上轮分**

| 维度 | §11.8 复评 | 本轮换靶实测 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.0 | −0.5 |
| 一致性 | 9.5 | 8.5 | −1.0 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 9.0 | −0.5 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.0 | −0.5 |
| 实施精度 | 9.5 | 8.5 | −1.0 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.06** | **−0.44（撤回）** |

> **本轮换靶角度（此前未用）**：**上限变更 blast radius 全仓扫描** · **i18n 插值语法对照** · **空态语义三向（D35 ↔ §4.2 ↔ 键表）** · **造数 ↔ dogfood 依赖闭合** · **accessor 落点**。
> ⚠️ 本节 9.06 与 §11.8 的 9.06 **巧合同值，但靶不同、缺陷集零重叠**（上轮 = 键表数漂移 / 文案家违约；本轮 = 代码侧腐化 / 空态语义 / 夹具缺口）⇒ 两轮**分开留痕，不合并报**。

**第二步：修 F1–F6 后复评**

| 维度 | 换靶实测 | 修复后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.0 | 9.5 | +0.5 |
| 一致性 | 8.5 | 9.5 | +1.0 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.0 | 9.5 | +0.5 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.0 | 9.5 | +0.5 |
| 实施精度 | 8.5 | 9.5 | +1.0 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.06** | **9.50** | **+0.44** |

> **升分构成**：全部来自**缺陷消解** —— F1 代码侧腐化面（6 处）· F2 空态语义矛盾（键 26 / D35 / §4.2 三向归一）· F3 夹具缺口 · F4 accessor 落点 · F5 史实豁免口径 · F6 硬编码守卫；**非**口径放宽。
> ⚠️ **偏离声明（必读）**：F2 的落修**偏离了我上一轮给的措辞** —— 原拟「用 CLI 发布 / 查看打包规范」，落修改为**页内切支**（改用「新建」）：**CLI 归 M5 未交付**、「打包规范」**无公开页** ⇒ 原措辞会造死链。偏离已写入 **D35 + 键 26 + §4.2**（属「全修」授权范围内按更优解落地，特此声明）。
> **门槛**：≥9 ✅ · **未修项 = 0 ⇒ 可冻结**。
> **冻结前置清单（用户「定稿」口令后即执行）**：① §9.6 同步点 12 处回填（先主 design v1.72→v1.73，再 `docs/00` v1.99→v1.100）② §9.7 ①–⑦ 回填口径落实 ③ 键表 55 / `errors` **42→68** 实测核对（**已核**：T3 实测 55 ✅ / 68 ✅） ④ 文档门禁四道复跑。

### 11.10 第 5 轮换靶自检与修复复评（2026-09-28 · F7–F9 + 方案①）

**第一步：换靶（件面闭合性 / 施工可完成性）—— 撤回上轮分**

| 维度 | §11.9 复评 | 本轮换靶实测 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.0 | −0.5 |
| 一致性 | 9.5 | 8.5 | −1.0 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 8.5 | −1.0 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 9.5 | 9.0 | −0.5 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.13** | **−0.37（撤回）** |

> **本轮新靶角度（此前未用）**：**件面闭合性（照这份文档能否真把活干完）** · **端点规格落地完备性（鉴权/用例/落点）** · **计数连带面自动扫**。
> ⚠️ **收敛观察（重要）**：R1–R4 缺陷数 = 9 / 7 / 6 / 6，本轮 **3** 条；且 **F7 / F8 都是我上一轮修复留下的次生残留**（F1 只写进 §5.2/§9.7 同步点、**未加进件面**；段数口径漏改 2 处）⇒ **设计本体在收敛**，「**改一处口径 → 连带面扫不净**」是**流程**漏洞 ⇒ 本轮同时落 **方案①（N10）** 用机器守。

**第二步：修 F7–F9 + 落方案① 后复评**

| 维度 | 换靶实测 | 修复后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.0 | 9.5 | +0.5 |
| 一致性 | 8.5 | 9.5 | +1.0 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 8.5 | 9.5 | +1.0 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.5 | — |
| 实施精度 | 9.0 | 9.5 | +0.5 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.13** | **9.50** | **+0.37** |

> **升分构成**：F7 件面补 **M17–M21**（5 件，F1 代码侧连带面）· F9 件面口径写明（代码/规范件 ↔ §9.6 同步点文档单列）· F8 段数三处归位 · **方案① = N10 第五道门禁**（把该类残留从「靠人回查」转为「机器拦」）。
> **纪律声明**：方案① 的脚本**不在本轮落地** —— 仓内 tracked 文件属**实现期交付物**，设计阶段零改码（用户「全修」已按此解读；若要立即写脚本，需另发口令）。已落成 **N10 件 + §9.2 第五道门禁 + §9.4 验收 13**。
> **门槛**：≥9 ✅ · 未修项 0 ⇒ **可冻结**。
> **若继续第 6 轮自检的预期（诚实预判）**：只可能剩「本轮修复自身的连带面」一类残留，而该类**已被 N10 机器守卫覆盖** ⇒ **建议就此冻结**，把精力放到「定稿」后的 §9.6 十二处同步点。

### 11.11 第 6 轮换靶自检与修复复评（2026-09-28 · F10–F12 + F13 登记）

**第一步：换靶（决策→落点映射 / 断言覆盖矩阵）—— 撤回上轮分**

| 维度 | §11.10 复评 | 本轮换靶实测 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.5 | 9.0 | −0.5 |
| 一致性 | 9.5 | 9.0 | −0.5 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.5 | 9.0 | −0.5 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.5 | 9.0 | −0.5 |
| 实施精度 | 9.5 | 9.0 | −0.5 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.50** | **9.19** | **−0.31（撤回）** |

> **本轮新靶角度**：**决策→落点映射（孤儿决策检测）** · **断言覆盖矩阵（§4.8 全 15 行 × dogfood 九段）** · **测试件口径实证**（`apps/web/src` 单测文件数实测 = **0**）。
> ⚠️ **本轮 3 条全属「已定案但未落到页面/断言」的落地型漏项，无一条要求重新决策设计** ⇒ 与 §11.10 收敛观察一致：**设计本体已稳定**。

**第二步：修 F10–F12 后复评**

| 维度 | 换靶实测 | 修复后 | 变化 |
|------|:--:|:--:|:--:|
| 完整性 | 9.0 | 9.5 | +0.5 |
| 一致性 | 9.0 | 9.5 | +0.5 |
| 清晰度 | 9.5 | 9.5 | — |
| 可实施性 | 9.0 | 9.5 | +0.5 |
| 设计纯粹性 | 9.5 | 9.5 | — |
| 边界覆盖 | 9.0 | 9.5 | +0.5 |
| 实施精度 | 9.0 | 9.5 | +0.5 |
| 跨平台 | 9.5 | 9.5 | — |
| **综合** | **9.19** | **9.50** | **+0.31** |

> **升分构成**：**F10** 断言覆盖闭合（§4.8 **全 15 行**逐行有断言，补 读面载态 / 读面空（零资产空态切支）/ 读面错 / 取消上传）· **F11** 预填**四支点名覆盖** + N2「可单测」**口径决策化**（结论 = **不新增 web 单测件**，随仓情：web 零单测先例）· **F12** 「再发布一个」复位语义（**C15**）落到 §4.4 / §4.8。
> **F13 处置（登记不修）**：§2.1 中 **16 条 D**（D2/3/7/9/12/13/15/16/19–25/29）除表外零引用，读者需自找落点 —— 属**风格**非缺陷（落点确实在 §4/§5，只是未回指）；为 49 行表加「落点」列收益低于噪音 ⇒ **不修，留候选**。
> **门槛**：≥9 ✅ · 未修项 0。**冻结建议（再次）**：R4 / R5 / R6 三轮新增发现**全部为落地 / 口径型**，本轮已把「覆盖」这最后一类也闭合（断言矩阵 + 件面闭合 + 口径决策化）⇒ **继续自检的边际收益 ≈ 0，建议立即定稿**。

### 11.12 F248 全量回填轮复评（2026-09-29 · 用户拍板 **2A 整批回填** · 口径 = 文档 8 维）

**本轮靶**：**跨件指代与真值一致性**（T10 IA 重排后未回扫的段号 / 键名 / 落点）—— 靶面 = §1.3 · §2.1（D1/D2/D3/D32）· §2.4（C8）· §4.1–§4.9 · §6.2/§6.3 · §9.3（G3/G6）+ 批 plan `M4b-7-publish.md` §3 与头部。

**改动面（实测 40+ 处）**：§4.1 形态总览（线框 + 6 条）· §4.2 三段表**重排 + 字段归属迁移** · §4.3 右栏规格 · §4.4 链图**面板映射新写** · §4.6 矩阵 10 行「展示位置」列 · §4.8 状态表 14 行 · **§4.9 五态线框全重写** · §2.1 D1/D2/D3/D32 · §2.4 C8 · §1.3 ×2 · §6.2 表头 + **4 处旧键名 + 4 处旧值**（`step.create`/`step.submit` → `step.detect`/`step.publish` + 三 hint + `subtitle` / `field.file` / `action.publish`）· §6.3 ×1 · §9.3 G3/G6 · 批 plan §3 ×3 + 头部 Status。

**改动面精确读数（行级实测 · 2026-09-29）**：逐条枚举 **69 个位置**（§1.3×2 · §2.1 D1/D2/D3/D32×4 · §2.4 C8×1 · §4.1×7 · §4.2×6 · §4.3×5 · §4.4 整块 · §4.6×10 · §4.8×14 · §4.9 整块 · §6.2×10 · §6.3×1 · §9.3×2 · 批 plan×4 + F 登记行），行级 = **+201 / −147**（6 份文档 · `git diff --numstat` 实测）。原文「40+ 处」= 登记时的下界口径，本轮按实测数订正为 **69 位置**。

**真值来源（逐条实测，不采信设计声明）**：`apps/web/src/i18n/zh.ts` / `en.ts`（64 键逐键回读）· `apps/web/src/pages/Publish.tsx`（三段 `step.*` 顺序 · `panelStates` 五分支 · 429 落 ① 段 · 失败面 `Alert` 落 ③ 段 · 字段级 `FIELD_OF_CODE` = `slug`/`version`）· 增量 design `2026-09-28-publish-drag-upload-design.md` **v2.1** §3.3/§3.4。

| 维度 | 回填前（v0.13 复核读数） | 回填后（v0.14） | 变化 | 依据 |
|------|:--:|:--:|:--:|------|
| 标准1 完整性 | 9.5 | 9.5 | — | 骨架 12 段齐 · §4.1–§4.9 全量含 **5 态线框** · 错误矩阵 **10 行** · 键表 **64 行逐键回读** |
| 标准2 准确性 | 9.0 | 9.5 | +0.5 | 回填前 §6.2 有 **4 处旧键名 + 4 处旧值**（与 zh/en 实测不符）· 段名与错误落点按 T1–T10 旧 IA 写 ⇒ 现全部按真码 / i18n 改写 |
| 标准3 一致性 | 8.2 | 9.5 | +1.3 | 回填前同一 IA **三处自相矛盾**（§4.2 表 / §4.9 线框 / §1.3·§2.1 段名）且与批 plan 不同步 ⇒ 现**三向一致**（表 ↔ 线框 ↔ 状态表）+ 批 plan 同步 |
| 标准4 可用性 | 9.5 | 9.5 | — | 段名即 i18n 键名 · 落点带真码文件 / 变量名 · 错误矩阵给「段 + 位置」双坐标 |
| 深度1 追溯性 | 9.5 | 9.5 | — | 每处带 T/D/C/F 号 + 唯一源指针（增量 design v2.0/v2.1 §3.3/§3.4） |
| 深度2 反证 | 9.4 | 9.4 | — | **F255** 给静态反证（`panelStates` 取值域与 `step.n === 2` 不相交）；线框按真码结构写、**未逐像素对真页截图** ⇒ 保留 0.6 扣分 |
| 深度3 边界/风险 | 9.5 | 9.5 | — | 空态（渐进披露）/ 读面载·空·错 / 执行中 / 校验失败 / 冲突 / 限流 / 完成 / 已撤回 全覆盖 |
| 深度4 维护性 | 9.4 | 9.4 | — | 单一真源（键名 + 增量 design）· §4.9 为手工 ASCII（无生成器），IA 若再动仍需手工扫 ⇒ 保留 0.6 扣分 |

**回填后综合 = 9.48**（75.8 ÷ 8）· 回填前复核读数 **9.25**（74.0 ÷ 8）。

> **口径说明（必须写清）**：§11.11 的 **9.50** 成文于 **v0.8（定稿当时）**，其后的 **T10（IA 重排）/ T11–T15** 只回填了各自的「触碰面」，未对本批 design 复评 ⇒ 那 **40+ 处漂移从未被计分**。本轮按同一 8 维口径把 **v0.13 复核为 9.25**、回填后为 **9.48** —— 分数不是「越改越高」，而是把一直存在的漂移**先计分、再修掉**。

**本轮新登记**：

- **F255**（web / 死条件）：右栏流程行的行内进度条件 `step.n === 2 ∧ state === 'active' && running` 与 `panelStates`（`running ⇒ ['done','done','active']`，见 `Publish.tsx:682-691`）**不相交 ⇒ 从不渲染**（进度实际只在 ① 段可见）⇒ **已修（用户拍板 1B）**：删该分支（`Publish.tsx` −8 行）⇒ 进度只留 ① 段；**dogfood 全量十段 104/0** 复跑 + typecheck/lint/format/build 全绿；**正向守卫 = G5⑪**（本轮补装）。
- **F256**（文档 / 头部陈旧）：`docs/plans/M4b-7-publish.md` 头部 `Status: ⬜ 待实现` 与其自身修订记录（v1.5 = T10 完成 · 均分 9.56）**相反** ⇒ 本轮订正为「T1–T10 全绿并已入库」。
- **F257**（文档 / 断言声明无实体）：批 plan T4 声称「dogfood 断言 ① 段进度文案出现」，实测脚本**零进度断言** ⇒ **已补真断言**：G5⑩（① 段进度条 + 文案）· G5⑪（右栏无进度条）—— 声明不再空头，且为 F255 的删除装上守卫（含反证实证）。
- **F258**（script / 注释腐化）：dogfood 脚本头 run recipe 仍写旧名 `m4b7-dogfood.ts` ⇒ **已修**（照抄跑必失败）。

> **门槛**：≥9 ✅ · **无未修项 · 无挂账** —— **F246 / F255 / F256 / F257 / F258 全闭合**（F246 = M4b-2 轮 27 处表格行断尾，2026-09-30 全量修复：续文归位合并回单行 · 内容零改动 · 探针 27 → 0；详见 §9.8 F246 行）。

## 12. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v0.18** | 2026-09-30 | sunxuewen-rush | **M4b-7 批次完成（出口五件全绿）** —— 出口件 ④ **观感 ✅（用户 2026-09-30 实机确认）** ⇒ 五件全绿（① 8 维 9.48 ② T1-T15 全绿 ③ 五门禁 exit 0 ④ dogfood/观感 ✅ ⑤ 整体审计无未决项）；§5 M4b-7 行状态 = **✅ 完成（2026-09-30）**；**零代码改动** |
| **v0.17** | 2026-09-30 | sunxuewen-rush | **M4b-7 整体审计（十一维 · 批收尾）** —— findings **F259**（`ComingSoon` 注释腐化 + 死 prop `batch` ⇒ **已修**）· **F260**（全仓死导出：真死 6 / 冗余 38 · 非本批引入 ⇒ 登记不修）· **F261**（类串重复 ⇒ 登记不修）· 十一维逐维读数见增量 plan §8 第 26 行 · **无未决项** |
| **v0.16** | 2026-09-30 | sunxuewen-rush | **F246 闭合（跨档文档事故修复 · 非改写结论）** —— §9.8 F246 行标注「已修复（用户拍板 1B）」+ 实测订正（27 处全部为「行未闭合 + 续文游离」，非内容丢失 · 零编造）· §11.12 门槛行改「**无未修项 · 无挂账**」；修复实体 = `docs/00` 7 + M4b-2 设计 14 + M4b-2 计划 6 = **27 处**续文归位并合并回单行 · 探针 **27 → 0** · 内容零改动 · 门禁补判据（表格行未闭合 ⇒ FAIL · 含反证）· 仓规例外入 `docs/README.md`。**零代码改动** |
| **v0.15** | 2026-09-29 | sunxuewen-rush | **F255 修复（用户拍板 1B · 删死分支）+ F257/F258 登记** —— §2.4 C8 / §4.3：右栏行内进度条件不可达 ⇒ **删该分支**（`Publish.tsx` −8 行）· §9.8 补 **F257**（批 plan T4 断言声明无实体 ⇒ **已补 G5⑩/G5⑪ 真断言**）· **F258**（dogfood 脚本头旧名 · 已修）· **G5 +2 断言 ⇒ 十段 104/0**（含反证实证）|
| **v0.14** | 2026-09-29 | sunxuewen-rush | **F248 全量回填（用户拍板 2A · 40+ 处）** —— 段名/段序按 T10 收敛（① 上传 / ② 自识别 / ③ 发布）· §4.1–§4.9 全量（含**五态线框重写** · §4.4 面板映射 · §4.6 矩阵 10 行 · §4.8 状态表 14 行）· §6.2 键表订正 **4 键名 + 4 值** · §1.3/§2.1 D1·D2·D3·D32/§2.4 C8 · §6.3 · §9.3 G3/G6 · 批 plan 同步 ⇒ **§11.12 复评 9.48**；新登记 **F255/F256** |
| v0.13 | 2026-09-29 | sunxuewen-rush | **T15 提交前体检**：换靶抓出 **F254**（`compareVersions()` 死导出 ⇒ 去 `export` 收敛为模块内函数）+ 声明-实体回查三项（键表 64 / F252+F253 两行 / 键数 62 → 64）。**零服务端改动** |
| v0.12 | 2026-09-29 | sunxuewen-rush | **T15 同步面回填**（版本号自识别缺陷修复 · 用户实测报缺陷）：**§6.2 键表 62 → 64**（+`field.asset.inflight` +`field.version.occupied` · 零退役零改值）· **§9.8 登记 F252**（数据源口径：客户端只有「已发布」版本 ↔ 服务端占号跨全状态）**/ F253**（同根文案不实：上下文行「暂无版本」+ 409 无因由）· **D37/C3/D47 数据源口径指针**（改为真实占号集合）· §4.2 ① 段行上下文小字指针。**零服务端改动**（实现随 T15） |
| v0.11 | 2026-09-29 | sunxuewen-rush | **T14 同步面回填**：§4.3 右栏规格改写为**两卡**（识别摘要 + 流程 · 240 → 320px · **主按钮卡撤除** · 状态记号替代编号）· §4.2 ③ 段行（`action.publish` **改值** ⇒「发布」· 撤 `flow.note`）+ 三段容器改**官方 `Card`**（`FieldSet`/`FieldLegend` 本页退役）+ T14 触碰面指针 · **§6.2 键表换行**（退役 `flow.note` · 新增 `summary.title` ⇒ **62 键** 净 0）· **F251** 登记。**零服务端 / 零代码改动**（实现随 T14） |
| v0.10 | 2026-09-29 | sunxuewen-rush | **T13 同步面回填**：§4.2 ① 段配方按**方向 A 聚焦式**改写 · **§6.2 `publish` 键表 59 → 62 键**（+4 / **退役 `field.file.hint`** / 改值 `field.file.drop`）· **F250** 已在 §9.8 登记。**零服务端 / 零代码改动** |
| v0.9 | 2026-09-29 | sunxuewen-rush | **T12 同步面回填**：§4.2 上传段行（行名 ② 上传版本 → **① 上传** + `Empty` 配方改写为 T12 三层照搬 ClawHub）· **§6.2 键表 55 → 59 键**（补齐 `field.file.notZip`〔T1〕/`field.file.remove`〔T7〕/`subtitle.empty`〔T11〕/`field.file.drop`〔T12〕四行并重编号）· **F249 登记**（§4.2 `EmptyTitle` 文案与真码/键表**三向不一致** ⇒ 随 T12 修至一致）· §4.2 表后加 **F248 待回填指针**。**零服务端 / 零代码改动** |
| v0.8 | 2026-09-28 | sunxuewen-rush | **第 6 轮换靶自检修复（F10–F12，F13 登记）** —— 换靶口径 = **决策→落点映射 / 断言覆盖矩阵 / 测试件口径实证**，实测 **9.19** 并撤回上轮 9.50。修复：**F10** 断言覆盖缺口 —— §4.8 全 15 行中 **读面载态 / 读面空（零资产空态切支）/ 读面错 / 取消上传** 无断言 ⇒ **G4 扩写为「逐行」**（含切支点击与 abort 断言；段数保持九段，无计数连带）· **F11** `N2`「（纯函数，可单测）」为空头承诺（`apps/web/src` 单测文件实测 **0**）⇒ **口径决策化：不新增 web 单测件**，预填**四支**（正常 +1 / 空壳 `1.0.0` / `-pre` 剥段 / 撞号 409）由 **G4/G6 点名覆盖** · **F12** 「再发布一个」复位语义（**C15**）补入 §4.4 完成态块与 §4.8「完成」行 · **F13** §2.1 中 16 条 D 无落点回指 ⇒ **登记不修**（风格项，留候选）· §9.4 增验收 14 ⇒ §11.11 复评 **9.50**（**再次建议立即定稿**）。**零实现改动** |
| v0.7 | 2026-09-28 | sunxuewen-rush | **第 5 轮换靶自检修复（F7–F9 + 方案①）** —— 换靶口径 = **件面闭合性 / 施工可完成性 / 计数连带面**，实测 **9.13** 并撤回上轮 9.50。修复：**F7** 件面漏 5 件（F1 代码侧连带面：`validate/zip.ts` · `validate/frontmatter.ts` · `http/assets.ts` · `http/assets.test.ts` · `assets/versions.ts`）⇒ 补 **M17–M21**（改造件 16 → **21**；件面 25 → **31**；头部 Scope / §3.2 / §9.7③ / §11.1 四处计数连带订正）· **F8** dogfood 段数口径漏改 2 处（N8 行 · §9.4 第 9 项）⇒ 九段 · **F9** 件面**计数口径写明**（代码/规范件 ↔ §9.6 同步点文档 2 份单列）· **方案①** = 新增 **N10 `docs/smoke/scripts/file-ref-closure-check.ts`** + §9.2 **第五道文档门禁**（件面 ↔ 引用闭合双向核对；`M` 必须已存在、`N` 允许不存在、路径集合须 ⊆ 件面 ∪ 同步点 ∪ 历史豁免）+ §9.4 验收 13 ⇒ §11.10 复评 **9.50**（含收敛观察：本轮 3 条中 2 条为上轮修复的次生残留 ⇒ 建议就此冻结）。**零实现改动** |
| v0.6 | 2026-09-28 | sunxuewen-rush | **第 4 轮换靶自检修复（F1–F6 全修）** —— 换靶实测 **9.06**（与 §11.8 同值但**靶不同、缺陷集零重叠**）并撤回上轮 9.50。修复：**F1** 上限变更的**代码侧 6 处**腐化面（`validate/zip.ts:6,7,194` · `frontmatter.ts:24` · `http/assets.ts:545` · `http/assets.test.ts:351` · `assets/versions.ts:27`）纳入 §5.2 + §9.7①，改法 = 「引用 env 单源 + 去写死字节数」· **F2** 零资产空态按钮语义三向归一（键 26「改用「新建」发布第一个资产」+ D35 + §4.2；**页内切支、零外链**）· **F3** 上传夹具**脚本内联生成**（≤10 KiB，不落二进制入仓）（§9.5）· **F4** 错误文案取法点名 `tErr(code, vars?)`（`I18nProvider.tsx:53-56`；插值 `{name}` 已实测核）（§4.6/§6.1）· **F5** 历史 plan 旧字节数**豁免口径**入 §9.7① · **F6** dogfood 加 **G9 硬编码守卫**（九段 + 反证）⇒ §11.9 复评 **9.50**（含 1 条偏离声明）。**零实现改动** |
| v0.5 | 2026-09-28 | sunxuewen-rush | **换靶自检修复（N1–N7 全修）** —— 换靶实测 **9.06** 并**当场撤回** §11.7 的 9.50（窄口径虚高）。修复：**N1** `asset.slug_taken` 文案归一 `errors` 组（遵 `docs/07` §4 `code → 消息` 契约；删 `publish.error.slugTaken` ⇒ 键 **56 → 55**，§6.2 增两条口径注）· **N2** 「50 键」残留 3 处（§1.3 / D31 / M8）· **N3** §4.2 ③ 改引 **D39** + 两前提 + 失败停点按钮复用 `action.publish` · **N4** 「既有 3 处 `Field` 消费」实测订正为 **2 处**（§4.6 / §11.4 U7）· **N5** 占位机制补实现落点（`SideNav.tsx:236,253`）· **N6** 「重新选择」复用 `field.file.choose` · **N7** §11.1 键表读数加「首稿口径」标注 ⇒ §11.8 复评 **9.50**（含构成说明 · 未修项 0）。**零实现改动** |
| v0.4 | 2026-09-28 | sunxuewen-rush | **grilling 4 轮收口（用户逐条拍板 13 条）** —— 补 **D37–D49**：版本号预填与撞号（**订正 D10**：只按 `latestVersion` patch+1、409 交用户手改、pre 剥段、空壳 1.0.0）· 资产选择器 = 官方 `Combobox` + 服务端 `q=`（300ms 防抖，单次上限 100）· 「放弃该资产」**严格边界**（本页创建 ∧ 零版本 —— 堵死绕撤回的删除口）· 客户端大小预检（提示不禁用）· 卸载即 `abort()` · 失败态「已有版本」的出口（文案引导）· 429 倒计时禁按钮 · 撤回后就地改「已撤回」态 · `?slug=` 无效回落 + 轻提示 · 搜索复用 `useMarketQuery`（**订正 URL 契约**：读 `?slug=` 写 `?q=`）· 选中资产上下文行 · **去掉版本数**（列表读面无该字段）⇒ 同步 §2.4 **C11–C17** 与 C3 订正 · §4.2 / §4.4 / §4.5 / §4.6 / §4.8 / §4.9（新增状态 E 线框）· §6.2 键表增 6 键 · §9.3 G3/G6/G7 断言补强 · §9.7 ② 设计值 · §11.7 复评 **9.50**（同口径 · 不虚增 · 含自纠 1 条）。**零实现改动** |
| v0.3 | 2026-09-28 | sunxuewen-rush | **官方件配方采纳（用户「按推荐来」）** —— 核对官方 `Field` / `Empty` 两页后落 **D32–D36**：① 三段容器 = 官方 `FieldSet` + `FieldLegend`（**废**自造「编号 + `<h2>`」分组标题）② 字段错误补官方 `<Field data-invalid>` + 控件 `aria-invalid` 联动 ③ 上传「未选文件」= 官方 `Empty` 完整配方（虚线描边 + `EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`（上限）+ `EmptyContent` 按钮）④ 「零资产」空态 = 官方 `Empty` + 动作出口 ⑤ **不扩** `EmptyState` 薄封装（8 处既有消费零回归）⇒ 同步 §2.3 官方件清单（实情：`field.tsx` 10 子件 / `empty.tsx` 6 子件**均已在仓**，零新增件零新依赖）· §4.2 / §4.6 / §4.8 / §4.9 线框 A · §9.3 G3 断言 · §9.4 验收项 11 · §11.6 复评 **9.50**（同口径 · 不虚增）· §11.4 增 **U7**。**零实现改动** |
| v0.2 | 2026-09-28 | sunxuewen-rush | **grilling 轮封口** —— 用户逐条拍板 5 条 ⇒ 补 **D27–D31**（顶栏入口 `<1024px` = 纯图标不隐藏 · 右栏「当前步」不可回退 · 官方件 2 只确认 · 撤回走 `POST /api/reviews/:id/withdraw` 确认 · `publish` 组 50 键表按表落）· §11.4 **U5/U6 结案** · §11.5 grilling 复评 **9.50**（无实质变化 · 不虚增）。**零实现改动** |
| v0.1 | 2026-09-28 | sunxuewen-rush | **首稿** —— 由对齐轮（D1–D26）+ 线框 v2 + 可点原型 7 轮收敛落笔。含两处口径翻转登记（**手动提审 → 一键链** · **零服务端改动 → 零写面改动 + 1 只读端点 + 2 处默认值**）与同步点 **12 处**（§9.6）。首稿自检 8 维 **9.38**，当场处置 🔴1/🟡3/⚪5 后重评 **9.50**（§11.2–§11.3） |
