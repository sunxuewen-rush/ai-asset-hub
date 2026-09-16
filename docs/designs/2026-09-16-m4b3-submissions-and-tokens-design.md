# M4b-3 个人面 A：我的提交与我的令牌 —— 批设计（定稿）

> Updated: 2026-09-16（**v1.18：T8 落地 —— `errors` 补 7 码 + 订正一处基线数字**）—— ① **`errors` 组实测 21 → 28 键**：design 指定的 6 个 `review.*` + **+1 `token.not_found`**（T7 令牌页消费；实测 `http/tokens.ts` 四处返回该码）② **订正数字错误**：§6.3 原文写「errors **22** → 28」，**实测基线 = 21**（`asset.*`×5 + `auth.*`×11 + `oidc.*`×1 + `request.invalid` + `network` + `unknown`）⇒ 本批净增 **81 → 82 键** ③ **登记可达性结论**：`token.not_found` 从 UI **不可达**（服务端吊销**幂等**：已吊销再删 ⇒ 204，实测）⇒ 该码属**防御性映射**，端到端机制已由 `review.not_pending` 一次性证成（陈旧页点撤回 ⇒ 400 该码 ⇒ toast 走新文案）④ §11 复评 **9.92**；**v1.17：T7 落地实证 + tokens 键表补登 7 键**）—— ① **`tokens` 组 41 → 48 键**：**+5 个 scope 说明**（Q13「每项两行 = 码名 + 中文说明小字」而 §6.2 原只给 `scope.full` ⇒ 5 码无键可消费）+ **2 个成功提示**（`edit.success`「已保存」/ `delete.success`「已删除」—— 断言 ⑧ 与 §4.2 删除流要求 toast 而键表漏列）⇒ 本批净增 **74 → 81 键** ② §4.2 补 **T7 落地注记**（关闭单入口实现 / 复制标记包裹范围 / 明文形态**实测 47 位** / 只显有效实测 12/13）③ §9.3 补**令牌探针**说明（`m4b3-seed-stale` 置 120 天前 · `m4b3-seed-legacy` 置 `start`/`metadata` null）④ §11 复评 **9.91** + **登记 1 条未证项**（明文态「遮罩点击」关闭路径 —— Radix 的 outside-pointer 判定需真实指针事件，本次工具通道受限未驱动；其余三路径（Esc / 按钮 / ✕-不存在）与「复制后直接关」均已实证）⑤ T9 后续处置 = 并入 T10（登记于批 plan v0.9）；**v1.16：造数脚本落地 + T6 最后一条未证项关闭（真实数据实测）**）—— ① 新增**可重放造数脚本**`docs/smoke/scripts/m4b3-seed-submissions.ts`（纯 upsert、**零 delete**、只碰 `m4b3-seed-%` 前缀；重跑即把被 dogfood 改过的行复位）—— 覆盖映射：G2/G3 ← `m4b3-seed-skill@1.0.0`（PENDING）· G4 ← `m4b3-seed-skill@0.9.0`（REJECTED 带 `review_comment`）· G15 ← 双类型 `skill`/`mcp` ② **T6「撤回成功链」未证项关闭**：真账号 `m4b2_user` + 真实后端实测 —— 撤回弹窗 → 确认 → `POST /api/reviews/1369/withdraw`（204）→ toast「已撤回」→ 列表刷新 → 行状态 `待审核` → **`已撤回`** 且该行「撤回」按钮消失；**服务端落库复核**：`review_task.status` = `WITHDRAWN` **且 `asset_version.status` 退回 `UPLOADED`**（= 规范语义「退回草稿」实证）③ 造数重跑后 PENDING **复位**实测 ✓（幂等可重放）④ 真实数据下 **列渲染/徽章/拒绝原因 `title`** 亦复验（不再依赖夹具）⑤ §4.4.1 注记第 4 条「未证项」已改写为**已关闭**；**v1.15：T6 落地实证 + i18n 键缺口补登**）—— ① **键表补 2 键**：`submissions` 25 → **26**（+ `action.view`，组件树里「查看」图标原无文案键）· **`common` 组 +1**（`cancel`，`ConfirmDialog.cancelLabel` 消费点，T7 三个弹窗复用）⇒ 本批**净增 72 → 74 键** ② §4.4.1 补 **T6 落地注记**：空态两文案落点（从未提交 = 页面级 `Empty` 两行 / 筛选无结果 = `DataTable.emptyMessage`）· `Pagination` **仅 `total > limit`** 渲染（自检发现实现首版漏此条件，同轮修）· 行类型须 **type 别名**（`interface` 无隐式索引签名 ⇒ 进不了 `DataTable` 行约束）③ §3.2#1/#3/#2 落地注记（路由时点 / 键数）④ §11 补实测记录（门户 dogfood **36/36 + NO JS ERRORS** · 真浏览器 8 项验证）⑤ **登记 1 条既有缺陷（非本批引入）**：`m4a-dogfood.ts` 的「资产数 < limit ⇒ 无分页控件」断言**假 PASS**（选择器 `aria-label*="分页"` 永不匹配官方 `aria-label="pagination"`）⇒ 归 **M4b-7/T10 收尾**复核；**v1.14：REJECTED 渐变 token 命名与落层订正（2026-09-16 用户拍板 A）**）—— ① token 名 **`--rejected` → `--gradient-rejected`**、落层 = **C 品牌渐变层**（白名单 **3 → 4**；与 `--gradient-brand/cta/page` 同层同纪律：值只住 `aih-theme.css`、消费走 `bg-[image:var(--…)]` 任意值、**不注册 @theme `--color-*` 映射**）；**否决 B 选项**（忠于旧名 `--rejected` 入 A 语义补丁层）——理由 = A 层不变式是「实色值 + 成对 `@theme` 注册」，渐变两条都不满足（渐变塞 `background-color` 永不渲染）② 消费路径 = 官方 `badge.tsx` 的 **`rejected` variant**（官方第 ④ 条路径 · M4b-1 批 design §3.5 已授权先例 = 同件加 `success`/`warning`）⇒ `StatusPill kind="task"` **零 className 覆盖**（§3.2#7 硬约束）③ **件表补正**：T5 改动 1 件 → **3 件**（+`aih-theme.css` + `badge.tsx`），§3.2 改造件 **9 → 11** ④ 落点 5 处（D12 · §3.2#7 · §3.2#9/#10/#11 · §4.4 表格 · §4.4 色彩体系）⑤ 同步 M4a design §4.4 ②bis 渐变白名单；**v1.11：名称必填 + 令牌彻底私有（2026-09-16 用户逐条对齐拍板）**）—— ① **`name` 由可选改必填**（新建与编辑皆不可为空；`trim()` 后 1..32 字；缺名/空串/纯空白 ⇒ 400 `request.invalid`；**旧令牌**（历史无 name 行）列表仍回「—」）② **令牌彻底私有**：`DELETE /api/tokens/:id` 的 **SUPER_ADMIN 分支收回** ⇒ 列表/编辑/删除一律**仅本人**，他人（**含超管**）视同 404 —— **对齐规范层 `05 §5`「Token 签发 / 吊销 = 本人」**（代码此前超出规范，本轮收回；如需超管治理 ⇒ M4b-6/M4c 候选）③ 编辑权限「全不勾 = 全量」并在弹窗给同一提示；权限改动**保存即生效**、界面**不加额外提示**（用户定）④ 同步主 design §7.1（DELETE 授权行）+ 批 plan v0.4；v1.10：T2 实现期官方源码复核订正（用户 2026-09-16 拍板「官方默认 32，我们就改成 32」）—— ① 名称上限 **≤64 → ≤32**（对齐官方默认 `maximumNameLength: 32`，落点 7 处：D6 / Q11 / §3.2#6 / §4.2 创建流 / §4.2 编辑流 / §5.1 / §7 接口表）
> ② **官方 `metadata` 默认关闭** ⇒ `better-auth.ts` 必须显式 `enableMetadata: true`（官方源码：签发时传 metadata 且未开启 ⇒ 抛 `METADATA_DISABLED`（`@better-auth/api-key` `dist/index.mjs:767-770`）；更新时**静默忽略**（`:1511`））—— 该文件配置 **1 行 → 3 行**（+ `enableMetadata` + 钉定 `maximumNameLength`）
> ③ **签发写 `metadata.tail` 需两次官方调用**（明文由官方 `createApiKey` 内部 keyGenerator 生成 ⇒ create body 无法预知 tail，改为 create 后补一次 `updateApiKey`；官方 update body 确收 `metadata`）
> ④ 空/纯空白名称 ⇒ **省略 name 字段**（官方 `minimumNameLength` 默认 1，传空串会 400）；T3 编辑流同理（清空 ⇒ 不发 name = 保持原名，官方无置空语义）
> ⑤ 落库形态**实测** = 单层 JSON 文本 `{"tail":"…"}`（`parseTail` 另留官方 `parseDoubleStringifiedMetadata` 同款双串化容错）；v1.9：提交前打分订正（8 项））—— 按 `self-review-scoring`（8 维）实测复评 **8.57 < 9 未达门** ⇒ **当场撤回 v1.8 的 9.81**（口径过窄：只扫 §4/§6/§9，漏扫 §3 件表）；订正 = **§3 件表同步 v1.5-v1.7**（3 处**直接矛盾**：`StatusPill` REJECTED=destructive vs 蓝紫渐变 · `FilterBar` vs 官方 Select · i18n 24/28 键 vs 实测 25/41）+ 5 项缺漏（`updateToken` · `assetType` · `start`/`tail` · `PATCH` · 术语「删除」）⇒ 复评 **9.57**；**v1.8：转定稿**）—— 用户 2026-09-16 批准（「1原型删除 2批准」）：① 8 维自检 **9.81** ≥9 ✅
> ② 原型物料**已删除**（`pages/__proto/M4b3Preview.tsx` + `main.tsx` 的 dev-only 路由 ⇒ 工作区零残留）
> ③ 详情页边界入档（用户定 **A**：归 **M4b-5**，本批只做入口）④ 主 design §2.3 双表 + §7.1 契约表 + §5.1 职责矩阵 + `docs/00` §5 同步回写；
> **v1.7：我的提交新增「类型」列**（列序 = 资产 → 类型 → 状态…））—— 用户 2026-09-16 定：「列再加 类型」；数据面**已在手边**（`asset` 表本就在 `baseQuery` 的 join 里 ⇒ 服务端**只 +1 行 SELECT**）；呈现 = `TypeIcon`（M4a 既有件，Clean Room 自绘）+ 短文案；新增 4 个 i18n 键（`col.type` / `type.*`）；**v1.6：行点击 → 操作列「查看」图标**）—— 用户 2026-09-16 定：「加一个查看」⇒ **推翻** U7 的「整行可点」（与令牌页操作列形态统一为**图标化**；**共享件零改动**，不需要 `DataTable.onRowClick`）；「**令牌 UI 已确认 OK**」；**v1.5：令牌页原型评审结论全部落地**）—— 经**可点原型**（`/dashboard/__proto/m4b3`，真仓真件 + 假数据 + 状态开关）多轮迭代，用户**逐条看效果拍板**；令牌页成型为「**6 列**（名称·Key·权限范围·创建时间·最后使用·操作）· **只显有效令牌** · Key = `aih_9fK2mQ4p*****3ba3` 掩码（前 12 + 后 4） · 图标化操作（编辑/删除**同色**，不用红）· 编辑 = 改名 + 改权限 · 删除确认**去红** · Last Used 超 3 个月标 warning」；「已驳回」徽章 = **实色蓝→紫渐变 + 白字**（对标 21-skillhub 品牌渐变，与「已通过」同构）；**范围 = 只做本批两页 + 全站去红登记 M4b-7**；新增 §2.1d 原型评审记录 · 清理 §2.1 重复编号 · 服务端改动面扩至 4 文件（含新增 `PATCH /api/tokens/:id`）；**v1.4：UI 逐条评审（①-⑤）落地 —— frontier 已空**）——按 `ui-design-review-walkthrough` （清单公式 = 页面×壳×跨面）逐条汇报并逐条拍板：① 我的提交 ② 我的令牌 ③ 创建 Dialog 两态 ④ 跨面交互约定 ⑤ 壳与导航。本轮处置 **23 条 findings**（含 4 处自产缺陷订正：`pagination.prev/next` 多余键 · 两组 `title` 键语义重复 · `client.ts` 无 DELETE 封装 · 主 design §7.1 契约表字段待同步）。**关键落值**：删 3 键 + 补 6 个 `review.*` 码 · URL 状态化约定 · 明文态四路径统一防护 + 隐藏 ✕ · 复制标记走页内 `onClickCapture` · `apiDelete` 新增 · 标题键复用 `dashboard.*`；**v1.3：补强 §4.4「UI 结构与组件树」**——新增组件树（两页）×线框差异声明×表格密度 40 落点×交互态×状态徽章与空值约定；过程中**新发现 3 处设计点**：① `StatusPill` 需**加性扩展 `kind="task"`**（原只支持 asset/version，无 review task 状态）② **不用 `FilterBar`**（该件强制带搜索框，本批只需状态维度 ⇒ 直用官方 `Select`）③ 令牌状态**用官方 `Badge`** 不扩 StatusPill（凭证状态与三族不同轴）；改造件 6 → **7**（+`StatusPill.tsx`）；**v1.2：grilling 轮 2 落地（Q9-Q14）**——令牌**名称可选**/不要求唯一/不限字符集（trim 判空，≤64）· 名称与 id **合并为一列**（列表 8 → 7 列）· scope 选项**两行排版**（码名 + 中文说明）· **不做**预设快捷；新增 §2.1b grilling 两轮决策记录段；**v1.1：grilling 轮 1 落地**——订正 2 处事实错误（`apikey.name` / `lastRequest` **列存在**，只是读面未取）+ 落 Q1-Q8 决策（**令牌命名全链支持** / 露最后使用时间 / `ToggleGroup` 多选 / 资产列链接 / `retryTick` 刷新 / `error.load` 保留 / 有效期前后端同限 / 隐藏已吊销不做）；v1.0：初稿——现状核对（真码实测）+ 10 项设计决策按推荐定案）
> Status: **定稿**（8 维自检 ≥9 ✅ —— 定稿轮 **9.81** · v1.9 订正复评 **9.57** · v1.10 实现期订正复评 **9.79** · v1.11 复评 **9.86** · **v1.14 命名订正复评 9.89** · **v1.15 T6 落地复评 9.90** · **v1.16 造数+实证复评 9.94** · **v1.17 T7 落地复评 9.91** · **v1.18 T8 落地复评 9.92**；用户 **2026-09-16 批准**）—— 批 plan 见 `docs/plans/M4b-3-personal-submissions-and-tokens.md`；本批出口五件见 §9 与 `docs/00` §5
> Scope: M4b-3（`docs/00` §5 子行 / 主 design §2.3 拆批表）——个人面 A：**我的提交**（`/dashboard/submissions`）
> + **我的令牌**（`/dashboard/tokens`）+ 服务端 **R6-c**（`reviewComment` 加性）
> 引用链：本文档 → 主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.3 拆批 · §2.4 U7 ·
> §4 显隐矩阵 · §5.1/§5.2 路由 · §7.1 端点契约 · §8 R6-c · §10.1 状态映射 · §12 线框）→
> 规范 `00` §5/§7 · `05` §5/§6.4 · `08` §6 → M4a design §4.4（视觉 SSOT，引用不复制）

---

## 1. 背景与批界

### 1.1 位置与依赖链

M4b 拆 7 批（主 design §2.3）：**顺序 1 → 2 → 3 → 4 → 5 → 6 → 7**；本批 = **第 3 批（个人面 A）**。
前置 = **M4b-1 ✅ / M4b-2 ✅**（两批出口五件全绿）；后继 = M4b-4（个人面 B：我的资产 + 工作台三卡）。

**与前三批的关键差异**：M4a / M4b-1 / M4b-2 均**零服务端改动**；**本批首次动服务端**（加性字段，见 §5）。

### 1.2 入口现状（真码实测，2026-09-16）

| # | 现状 | 证据（file:line / 命令） |
|---|------|--------------------------|
| 1 | 两页现为占位页，`DEV_BATCH` 标注 `'M4b-3'` | `apps/web/src/main.tsx:52-53`（表）+ `:109-117`（`/dashboard/submissions` 路由）/ `:118+`（`/dashboard/tokens`） |
| 2 | **前端无 review / token 的 API 封装** | `apps/web/src/api/` 实际 9 件：`assets` `auth` `client` `compare` `content` `labels` `stats` `types` `versions` ⇒ 无 `reviews.ts` / `tokens.ts` |
| 3 | 「我的提交」读面**已存在**（无需新建端点） | `apps/server/src/http/reviews.ts:69` `app.get('/mine', requireAuth(), …)` → `{ items, total, limit, offset }`；`status` 可选过滤（`:74`）· 分页 `PAGE_SCHEMA`（`:71`） |
| 4 | 撤回端点**已存在** | `apps/server/src/http/reviews.ts:146` `app.post('/:id/withdraw', requireAuth(), …)` |
| 5 | 令牌三端点**已存在** | `apps/server/src/http/tokens.ts:48`（POST 创建）· `:86`（GET 列表）· `:94`（DELETE 吊销）；`app.ts:204` 挂载 `/api/tokens` |
| 6 | ★ `review_comment` **列早已存在**（迁移 0000 起），**写入早已实现** | 列：`apps/server/src/db/schema/governance.ts:49` \`reviewComment: text('review_comment')\`；写：`apps/server/src/review/service.ts:183,238`（驳回时写） |
| 7 | ★ 读面**只缺 SELECT**：`LIST_SELECT` 无该字段 | `apps/server/src/review/query.ts:52-62`（9 字段，无 `reviewComment`） |
| 7b | ★ **订正（v1.1）**：官方 `apikey` 表**有 `name` 列**（`db/schema/auth.ts:150`）与 **`lastRequest` 列**（`:165`）——**不是「没有」，而是读面未取**（`auth/api-keys.ts:146-152` 的 SELECT 仅 6 字段）⇒ 令牌**可以**命名、「最后使用时间」**可以**露出 |
| 7c | ★ 官方 `createApiKey` body **支持可选 `name`** | `node_modules/.bun/@better-auth+api-key@1.7.5+…/dist/index-BeAW0fNP.d.mts:264,268`（`name: ZodOptional<ZodString>`）⇒ 命名可走官方原生通道（本仓 `auth/api-keys.ts:28-35` 的窄化接口需补 1 字段） |
| 8 | 现有 review 测试**无严格字段集断言** ⇒ 加字段不破测试 | `apps/server/src/review/*.test.ts` · `http/reviews.test.ts` 内 `ReviewListItem`/`Object.keys`/`toEqual({` 检索命中 = 0 |
| 9 | 可复用件**齐全**（零新增通用件） | `components/console/` 8 件（`DataTable` `StatusPill` `ConfirmDialog` `FilterBar` `PageHeader` `Drawer` `AuthLayout` `ComingSoon`）· `components/ui/` 17 件（含 `EmptyState` `ErrorState` `SkeletonLoader` `Pagination` `CopyButton` `Toaster`） |
| 10 | i18n 现状 | `dashboard` 组 **6 键**（`title` `welcome` `myAssets` `submissions` `tokens` `empty`）· `review` 组 **5 键** · `admin` 组 **7 键** |

**⇒ 核对结论**：本批**唯一服务端改动 = 读面加 1 字段**（§5）；`review_comment` 的**迁移与写入都已就位**
⇒ 「加性」的实际体量 ≈ **产品代码 3 行**。

### 1.3 批界

**In**：
- 我的提交页 `/dashboard/submissions`（真页）：「我的提交」读面消费（`GET /api/reviews/mine`）+ 状态筛选 +
  撤回（`POST /api/reviews/:id/withdraw`）+ 拒绝原因露出 + 整行跳共享详情
- 我的令牌页 `/dashboard/tokens`（真页）：列表（`GET /api/tokens`）+ 创建（`POST /api/tokens`，明文一次性）
  + 吊销（`DELETE /api/tokens/:id`）
- 服务端 R6-c：`ReviewListItem` / `LIST_SELECT` 增 `reviewComment`（加性、向后兼容）+ 测试线索
- i18n：新增 `submissions` / `tokens` 两个**页面级独立组**（zh/en 双向）

**Out（不混入）**：
- 我的资产列表 / 资产管理抽屉 / 工作台三卡 → **M4b-4**
- 审核详情页内容（`/reviews/:id` 页面）→ **M4b-5**（本批只保证**跳得过去**，详情页当前仍是占位）
- 审核队列 / 标签管理 / 审计浏览 → **M4b-5 / M4b-6**
- **令牌创建后改名**（官方 `updateApiKey` 支持）→ 本批不做（YAGNI；命名在创建时一次性确定）
- **令牌页「隐藏已吊销」过滤**（Q8）→ 本批不做（量小，久了再说）
- 令牌明文回流（**永不可能**：库中只有哈希；命名 ≠ 明文，见 §4.2 订正说明）
- 令牌的 scope 策略扩展（不新增码、不改判定链）→ 沿用 `05` §5 既有 5 码
- 视觉打磨（节奏/密度/层次）→ **M4b-7**（本批只做「视觉合规核对」）

---

## 2. 拍板结果（本批）

### 2.1 10 项设计决策（2026-09-16，用户「按推荐来」逐项定案）

| # | 决策项 | 定案 |
|---|--------|------|
| D1 | 我的提交**列集合** | 资产（slug + 版本）· 状态（`StatusPill`）· 提交时间 · 拒绝原因 · 操作（撤回）；**不展示** `taskId` / `reviewVersion`（内部 id 无用户价值） |
| D2 | 拒绝原因形态 | 列内**单行截断** + 悬停看全文（`title` 属性）；仅 `REJECTED` 行有值，其余显「—」 |
| D3 | **详情入口（v1.6 改）** | **不做整行可点**，改为操作列加 **[👁 查看] 图标**（`aria-label="查看"`）⇒ 与令牌页操作列**形态统一**（皆图标化）；**共享件零改动**（不需要 `DataTable.onRowClick`）· a11y 天然正确（图标按钮 + `aria-label`）<br>⚠️ 原 U7 的「整行可点 + 撤回 `stopPropagation`」**已推翻**（用户 2026-09-16） |
| D4 | 撤回成功后 | 列表**局部刷新** + toast「已撤回」；失败（并发已被裁决等）→ toast 显示服务端 message + 刷新列表 |
| D5 | 我的令牌**列集合**（Q12 合并后 **7 列**） | ① **令牌**（名称/id **合并一列**：主行 = 有 `name` 显 `name`、否则显 id 首 8 位 + `…`；副行 = 另一者，mono 小字）② 权限范围（`scope`：空 = 「全量」，否则码徽章）③ 创建时间 ④ **最后使用**（`lastRequest`，`null` = 「从未使用」）⑤ 有效期（`expiresAt`：`null` = 「永不过期」）⑥ 状态（`revokedAt`：`null` = 有效 / 非 null = 「已吊销」+ 时间副行）⑦ 操作（有效行 = 吊销；已吊销行 = 「—」）|
| D6 | 创建表单字段 | ① **名称**（Q9 **必填**（**v1.11**：用户 2026-09-16 定「新建和编辑名字都不能为空」）—— 空/纯空白不可提交（前端禁用提交 + 服务端 400 双保险）；Q11 **不限字符集**——允许中文/空格/符号，`trim()` 后判空，长度 **≤32**（官方 `maximumNameLength` 默认上限，**v1.10 订正**：原 ≤64 会被官方拒）；Q10 **不要求唯一**——同一用户可重名，前端**不做**重复校验）② 有效期天数（留空 = 永不过期；服务端 1..3650，**前端同限**、越界禁用提交）③ scope 多选 —— 控件 = **官方 `ToggleGroup type="multiple"`**（已落仓；官方 `checkbox` **未落仓**，不为此新增件）；**每项两行排版**（Q13：第一行码名 mono `asset:publish` + 第二行中文说明小字，取 `05` §5 码表「覆盖操作」列）；全不勾 = 全量 |
| D7b | 表格与控件落点（v1.3） | **密度 40 沿用官方默认**（表头 `h-10` + 单元格 `p-2`，零覆盖）· 操作列用 `DataTable.rowActions`（自动右对齐）· **筛选不用 `FilterBar`**（该件强制带搜索框）⇒ 直用官方 `Select` |
| D7c | 状态徽章归属（v1.3） | 我的提交 4 态 = **`StatusPill` 加性扩展 `kind="task"`**（M4b-5 共享）· 令牌状态 = **官方 `Badge` 直映**（凭证状态与 asset/version/task 三族不同轴，不扩第四族） |
| D8 | **URL 状态化（v1.4）** | 两页筛选 + 分页**写进 URL**（`?status=&limit=&offset=`，经 `useSearchParams`）——与门户列表先例（`useMarketQuery`）一致；**本约定立此供 M4b-4/5/6 遵循** |
| D9 | **错误呈现分工（v1.4）** | **读面错误 = `ErrorState`**（内容区 + 重试）· **写操作错误 = toast**（sonner，操作已离开原处）；401 由 `doFetch` 四分类分流，**页内零处理** |
| D10 | **标题键来源（v1.4）** | 页头标题**复用** `dashboard.submissions` / `dashboard.tokens`（侧栏条目同源）⇒ 新组**不设** `title` 键（同一文案单一来源，防两处漂移）；页头副标题用新组 `subtitle` |
| D6b | 不做项（Q8/Q14） | **不做**「隐藏已吊销」过滤（量小，久了再说）· **不做** scope 常用预设快捷（YAGNI，5 码手动勾选成本极低） |
| D11 | 令牌页一揽子（v1.5，详见 §4.2） | 列 = **6 列**（名称 · Key · 权限范围 · 创建时间 · 最后使用 · 操作）· **只显有效令牌**（已删除的不出现）· Key = `start` 掩码（前 12）+ `*****` + `metadata.tail`（后 4）· 操作 = **图标化**（[✎ 编辑] [🗑 删除]，**同色**不用红）· 编辑 = **改名 + 改权限**（官方 `updateApiKey` 原生支持）· 创建 = **2 字段**（名称 + 权限范围；有效期一律永不过期且不显示）· 删除确认**去红** · Last Used 超 3 个月标 warning |
| D12 | 语义色新增（v1.5） | §4.4 色彩体系**加 1 个语义色 token `--gradient-rejected`**（v1.14 订正：命名随 C 层惯例 = `--gradient-*`，**落 C 品牌渐变层**（值只住 `aih-theme.css`）；**否决**入 A 语义补丁层 —— 该层不变式 = 实色值 + 成对 `@theme` 注册，渐变两条都不满足）= 实色**蓝→紫渐变**（#6A6DFF → #B85EFF，对标 21-skillhub 品牌渐变）⇒ 「已驳回」徽章 = **实底紫 + 白字**（与「已通过」的实底绿 + 白字**同构**）；「已撤回」保持 `secondary` 灰（用户 2026-09-16 定）· **全站去红**属体系级口径 ⇒ 登记 **M4b-7**（本批只覆盖两页） |
| D18 | **类型列（v1.7）** | 我的提交**新增「类型」列**（列序：**资产 → 类型 → 状态**…，用户 2026-09-16 定）：`TypeIcon`（M4a 既有件）+ 短文案（技能 / MCP / 专家）· 数据源 = `LIST_SELECT` 加 `assetType: asset.type`（**asset 表本就在 join 里** ⇒ 服务端**只 +1 行**，零 join 改动 · 零迁移）· i18n 新增 4 键 |
| D13 | **明文一次性呈现**（本批关键 UX，原 D7） | 创建成功后**同 Dialog 切「明文态」**：明文 `aih_…` mono 大字 + `CopyButton` + 强提示「**只显示这一次，关闭后无法再次查看**」；**关闭时若未复制 → 二次确认**（防误丢） |
| D14 | 删除确认（原 D8「吊销确认」，v1.5 措辞） | 官方 `ConfirmDialog` 二次确认（**`destructive=false`——去红**）+ 成功后刷新 + toast；文案 =「确认删除？」/「删除后「xxx」立即失效，且不可恢复。」/「确认删除」（服务端语义仍为吊销：`revokedAt` 写入、行不删） |
| D15 | i18n 组归属（原 D9） | 新建**两个页面级独立组** `submissions` / `tokens`（与 M4b-2 的 `login`/`device` 先例一致）；不在 `dashboard` 组内堆键 |
| D16 | 三态与空态（原 D10） | `EmptyState` + `ErrorState` + `Skeleton` 三态齐；空态**区分两种文案**：「从未提交」vs「筛选无结果」 |

### 2.1b grilling 决策记录（2026-09-16 · 两轮 · 用户逐条「按推荐来」）

> 方法（`grilling` skill）：决策映射为设计树，按 **frontier 轮次**推进 —— 每轮只问「前置已定」的决策；
> **事实由 AI 自查**（不问用户），**决策交用户**。本轮共 **14 项**（Q1-Q14），其中 **2 项由 AI 自产事实订正**引出。

| 轮 | 项 | 决策 |
|----|----|------|
| 1 | Q1 | **令牌命名全链支持** —— 官方 `createApiKey` 原生支持可选 `name`（`dist/index-BeAW0fNP.d.mts:268`）⇒ 服务端**加性**改动 |
| 1 | Q2 | **露最后使用时间**（`lastRequest` 列已存在，纯读面加 SELECT） |
| 1 | Q3 | scope 控件 = 官方 **`ToggleGroup type="multiple"`**（官方 `checkbox` 未落仓 ⇒ 不为此新增件） |
| 1 | Q4 | 提交页**资产列链接** `/assets/:slug`（实测路由名；新标签页打开，不丢当前上下文） |
| 1 | Q5 | 写后刷新 = **`invalidateCache()` + `retryTick++`**（M4a `AssetDetail` 既有模式） |
| 1 | Q6 | **保留 `error.load`** 新键（「加载失败」≠「网络异常」）+ 复用既有 `common.retry` |
| 1 | Q7 | 有效期**前后端同限 1..3650**（越界禁用提交，减少往返失败） |
| 1 | Q8 | **不做**「隐藏已吊销」过滤 |
| 2 | Q9 | 名称**必填**（**v1.11**：用户 2026-09-16 定「新建和编辑名字都不能为空」；空/纯空白不可提交） |
| 2 | Q10 | 名称**不要求唯一**（官方无唯一约束；前端不校验重复） |
| 2 | Q11 | 名称**不限字符集**（允许中文/空格/符号），`trim()` 判空，长度 ≤32（官方默认上限；**v1.10 订正**） |
| 2 | Q12 | **名称与 id 合并为一列**（列表 8 → **7 列**，消除高度重复的一行文本） |
| 2 | Q13 | scope 选项**两行排版**（码名 mono + 中文说明小字） |
| 2 | Q14 | **不做** scope 预设快捷 |

**AI 自查并订正的事实（2 处，留痕不抹）**：
1. `apikey.name` 列**存在**（`db/schema/auth.ts:150`）—— v1.0 曾误写「无 name 列」；真相 = 读面未取
2. `apikey.lastRequest` 列**存在**（`:165`）—— 同上，读面未取

⇒ **frontier 已空**（状态/筛选/撤回/刷新/三态/空态/分页/校验/列集合/控件/命名链 全部有定论，无隐藏假设）。

### 2.1c UI 逐条评审记录（2026-09-16 · `ui-design-review-walkthrough`）

> 方法：清单公式 = **页面 × 壳 × 跨面**；每条**四段式**（设计真值 / 现状实测 / 拍板点 / 风险与文档缺陷）；
> **逐条汇报逐条拍板**（用户逐条「按推荐来」）；汇报轮**只读不写**。共 5 条，findings **R1-R23**。

| 条 | 面 | 拍板结果（要点） | findings |
|----|----|----------------|---------|
| ① | 页面 · 我的提交 | 列序 = 资产·状态·提交时间·拒绝原因·操作 · 徽章 warning/success/secondary（**「已驳回」v1.5 起改为实色蓝→紫渐变，不再用 destructive**）· 拒绝原因 `max-w-[280px]` truncate + title · 分页按组件默认 · **操作列 [👁 查看][↩ 撤回] 图标化**（v1.6：原「整行可点」被推翻） | R1（详情落点是占位页 —— 接受，M4b-5 补齐）· **R2 删 `pagination.prev/next`**（官方件硬编码英文，无消费点）· R3（非法 status 静默忽略 ⇒ 前端「全部」须不传参） |
| ② | 页面 · 我的令牌 | 列序 = 令牌·权限范围·创建时间·最后使用·有效期·状态·操作 · scope 空 = 「全量」Badge、多码 = outline 小 Badge · **有效期留空 = 永不过期** · 吊销 ConfirmDialog | **R5 新增 `apiDelete`**（`client.ts` 原只有 GET/POST）· R6（明文「未复制即关」判定见 ③-2）· R7 ✓ 分隔符 = `,`（实测）· R8 ✓ `lastRequest` 由官方 verify 路径写入（实测）· R9 ✓ 令牌列表无分页 · R10（历史 id 形状差异需兜底） |
| ③ | 页内重型交互 · 创建 Dialog 两态 | 同一 Dialog `step: form \| plain` · **复制标记走页内 `<div onClickCapture>`**（守住 8 件改造面）· **明文态四路径统一拦 `onOpenChange`** · **明文态隐藏 ✕** · scope 两行排版 + 「不选 = 全量」动态说明 · 提交中 disabled + Spinner · **关闭明文态后才刷新列表** | R11（`CopyButton` 无 `onCopied` 回调 ⇒ 二选一，取页内捕获）· R12（**仅拦「关闭按钮」会漏 Esc/遮罩** ⇒ 统一拦 `onOpenChange`）· R13（明文态隐藏 ✕）· R14（剪贴板被覆盖 = 可接受残留）· R15 ✓ ToggleGroupItem 用官方默认视觉 |
| ④ | 跨面交互约定 | **URL 状态化**（D8）· 三态全走 `DataTable` props · 写后 `invalidateCache()` + `retryTick++` · 状态徽章归属照 §4.4.5 · **错误呈现分工**（D9）· 响应式照主 design（表格 <1100px 横向滚动） | R16（**主 design §7.1 契约表 3 行待同步** —— 定稿回写时一并改）· R17（URL 状态化**立约定**）· R18 ✓ 撤回权限无需分支 · **R19 补 6 个 `review.*` 码** · R20（空态只给文案，引导指向右上按钮） |
| ⑤ | 壳与导航 | **标题键复用 `dashboard.*`**（D10，新组不设 `title`）· 保留 `subtitle` · **零侧栏改动**（条目 M4b-2 已交付）· DEV_BATCH 删 2 项 · 直访守卫零改动 · **不引入 `document.title`**（全站未做）· 筛选/翻页变更时 `scrollTo(top:0)` | R21（**两组 `title` 键与侧栏键语义重复** ⇒ 删）· R22 ✓ 本条零代码面 · R23（`/dashboard/assets` 与 `/dashboard` 仍为占位/临时页 ⇒ 属预期，M4b-4 收口） |

**⇒ frontier 已空**（页面 × 壳 × 跨面五条全覆盖；每条一~四段式结论齐；findings 全部登记并处置）。

### 2.1d 令牌页原型评审记录（2026-09-16 · 可点原型 · 用户逐条看效果拍板）

> 动机（用户原话）：**「全部都是 UI 的工作，直接聊天交流我无法准确对齐」** ⇒ 先产出**可点原型**再定稿。
> 做法沿用 M4b 立项原型的纪律：**真仓真件 + 假数据 + 状态开关**，物料**不进仓**（评审后删除）。
> 入口：`/dashboard/__proto/m4b3`（DEV-only 门控；在 `AppShell` 内 ⇒ 真壳与真实内容宽度）。

| 轮 | 用户指令 | 落地 |
|----|---------|------|
| 1 | 去「有效期」列 + 操作图标化 + 对标 DeepSeek api_keys | ⚠️ DeepSeek 需登录（302 `/sign_in`）⇒ **改为对标 new-api**（本地仓 `features/keys` 真码）· 删有效期列 · [✎][🗑] 图标 |
| 2 | 删除图标不要红色（与编辑同色） | 去 `text-destructive` ⇒ 同色 ✓ |
| 3 | 已删除/已吊销的不显示；创建后自动 active ⇒ 状态列也不显示 | 列 7 → **6**（删状态列）· 列表**前端过滤** `revokedAt === null` ✓ |
| 4 | 令牌**名称 / Key 分两列** | 拆「令牌」为「名称」+「Key」两列 ✓ |
| 5 | Key 显示形如 `sk-3260d*****f1b4` | ★ 查实载体：前缀 = 官方 `apikey.start`（`charactersLength` 默认 6 → **提到 12**）；后缀 = 官方 `apikey.metadata`（`createApiKey` body 原生接受 `metadata`，零迁移）⇒ `aih_9fK2mQ4p*****3ba3` ✓ |
| 6 | Last Used 超 3 个月标 warning（对标 new-api） | 跟 ✓ |
| 7 | 「已驳回」用**蓝渐变的紫色** | 对标 **21-skillhub** 品牌渐变（`--accent` = Violet `#B85EFF` · `--brand-gradient` = `#6A6DFF → #B85EFF`）；首版淡底深字**被判形态不符** ⇒ 改为**实色渐变底 + 白字**，与「已通过」同构 ✓ |
| 8 | 确认删除不要红色；整体蓝色科技风尽量不用红 | 删除确认 `destructive=false` ✓ · 「已驳回」去红 ✓ · **全站去红登记 M4b-7** ✓ |
| 9 | 已驳回 OK；**已撤回保持现状**（灰） | 定案 ✓ |

**AI 自查发现并修的 8 处（原型自身问题）**：① 权限项无可选控件（a11y）⇒ 加 Check 图标 / 空方框 ② Dialog 无高度上限 ⇒ `max-h-[85vh]` + 内滚
③ 有效期 placeholder 与 helper 重复 ⇒ 去重 ④ 字段分组间距偏小 ⇒ gap 4→5 ⑤ 底部按钮区无分隔 + 文案不统一 ⇒ 加 `border-t` + 统一
⑥ 权限项文字贴边 ⇒ 加内距 ⑦ 「全量」灰底像纯文本 ⇒ 改 outline 胶囊 ⑧ 令牌列副行截断规则不一致 ⇒ 统一

**事实查证（3 条，均为真码/DB 实测）**：
1. 官方 `createApiKey` body 支持可选 `name`（`ZodOptional<ZodString>`，dist `index-BeAW0fNP.d.mts:268`）
2. 官方 `updateApiKey` body 支持 `name` **与 `permissions`**（同文件 `:689-701`）⇒ 改名 + 改权限**官方原生**
3. `apikey.start` 由官方**自动写**（`:807-808`，`shouldStore` 默认 true、`charactersLength` 默认 6）；DB 现有 2 行为
   **M4b-pre 迁移前旧数据**（`start`/`metadata` 均 null）⇒ Key 列需**兜底显示「—」**

### 2.2 承接主 design 的跨批契约（引用不复制）

- **§2.4 U7（我的提交）**：状态列 = review task 状态（**PENDING / APPROVED / REJECTED / WITHDRAWN**，中文自然语）；
  筛选含 `WITHDRAWN`；**撤回仅 `PENDING` 行可用** + `AlertDialog` 二次确认；列表露**拒绝原因**；
  详情入口 = **操作列 [👁 查看] 图标** ⇒ `/reviews/:id`
  ⚠️ **U7 原「整行可点」条目已由 D3（v1.6，2026-09-16 用户定）修订** —— 改为操作列「查看」图标
- **§4 显隐矩阵**：「个人」组三页（`/dashboard/assets` · `/dashboard/submissions` · `/dashboard/tokens`）=
  **任何登录用户**可访问（无 `role >= N` 门槛）；未登录整组不渲染
- **§7.1 端点契约**：`GET /api/reviews/mine` · `POST /api/reviews/:id/withdraw` · `/api/tokens` 三端点（均已交付，本批只消费）
- **§8 R6-c**：`review/query.ts` 的 `LIST_SELECT` 增 `reviewComment`（加性；对既有响应向后兼容）
- **§10.1 状态映射**：本批新增的 **review task 状态**（PENDING/APPROVED/REJECTED/WITHDRAWN）与版本八态**不同轴**
  —— 后者归 M4b-4/5 的资产/版本面；本批状态只用于「我的提交」列

### 2.3 官方件装配清单（复用，**零新增依赖**）

| 用途 | 复用件（M4b-1 已落仓） |
|------|----------------------|
| 表格（含三态） | `components/console/DataTable.tsx` |
| 状态徽章 | `components/console/StatusPill.tsx`（本批需**新增 review task 状态映射**，见 §4.1） |
| 状态筛选 | 官方 `Select`（**不用 `FilterBar`** —— 该件强制带搜索框，见 §4.4.2） |
| 二次确认 | `components/console/ConfirmDialog.tsx`（官方 `AlertDialog` 封装） |
| 页头 | `components/console/PageHeader.tsx` |
| 对话框 | `components/ui/shadcn/` 的 `Dialog`（创建/明文态） |
| 复制 | `components/ui/CopyButton.tsx` |
| 三态 | `components/ui/EmptyState.tsx` · `ErrorState.tsx` · `SkeletonLoader.tsx` |
| 分页 | `components/ui/Pagination.tsx` |
| 轻提示 | `components/ui/Toaster.tsx`（`sonner`） |

---

## 3. 件与路由规格

### 3.1 新建件（4）

| # | 文件 | 职责 |
|---|------|------|
| 1 | `apps/web/src/api/reviews.ts` | `fetchMyReviews({ status, limit, offset })` · `withdrawReview(id)`（走 `apiGet`/`apiPost`，自动带会话与 401 分流）—— **命名与批 plan T4 一致**；`MyReviewItem` 用 **type 别名**（非 `interface`）——`DataTable` 行约束 `Record<string, unknown> | unknown[]` **不吃 interface 的隐式索引签名**（T6 执行期实证；官方 data-table recipe 同为 `type X`） |
| 2 | `apps/web/src/api/tokens.ts` | `fetchTokens()` · `createToken({ name, scope? })` · **`updateToken(id, { name, scope? })`**（编辑）· `deleteToken(id)`（删除）—— 走 `apiGet`/`apiPost`/**`apiPatch`**/**`apiDelete`**（后两者为本批给 `client.ts` 的加性新增；`name` **必填**、`scope` 省略 / `[]` 语义见 T3 契约） |
| 3 | `apps/web/src/pages/Submissions.tsx` | 我的提交页（`PageHeader` + **官方 `Select` 状态筛选**（**不用 `FilterBar`** —— 该件强制带搜索框，见 §4.4.2）+ `DataTable`（**6 列**：资产·类型·状态·提交时间·拒绝原因·操作）+ 操作列 **[👁 查看][↩ 撤回]** + `Pagination`）· 筛选与分页 **URL 状态化**（§2.1 D8）· 三态 + 两种空态；**T6 落地注记**：数据 hook = `useApi(() => fetchMyReviews({status,limit,offset}), [status,limit,offset,retryTick])` · 空态两文案落点 =「从未提交」页面级 `Empty`（`empty.none` + `empty.noneHint` 两行）/「筛选无结果」`DataTable.emptyMessage`（`empty.filtered`） · `Pagination` **仅 `total > limit`** 时渲染 · 撤回后 `invalidateCache('/api/reviews')` + `retryTick++` |
| 4 | `apps/web/src/pages/Tokens.tsx` | 我的令牌页（**6 列**：名称·Key·权限范围·创建时间·最后使用·操作；**只显有效令牌**（前端过滤已吊销）+ **创建 Dialog 两态**（表单态 → 明文态，含误关防护）+ **编辑 Dialog**（改名 + 改权限）+ **删除确认**（去红））；**T7 落地注记**：数据 hook = `useApi(() => fetchTokens(), [retryTick])` · `rows = items.filter(r => r.revokedAt === null)`（实测 12/13 只显有效） · **不做分页** · 空态两行 = 页面级 `Empty`（`empty.none` + `empty.noneHint`） · 写成功/失败统一 `invalidateCache('/api/tokens')` + `retryTick++` |

### 3.2 改造件（11）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `apps/web/src/main.tsx` | 两条路由 `ComingSoon` → 真页；`DEV_BATCH` 删 `'/dashboard/submissions'` / `'/dashboard/tokens'` 两项（**v1.15 落地时点**：`/dashboard/submissions` 随 **T6** 切换 —— 该 Task 断言 ②-⑦ 均为浏览器可达类，不切路由无法实测；`/dashboard/tokens` 随 **T7/T9** 收尾） |
| 2 | `apps/web/src/i18n/zh.ts` | 新建 `submissions`（**26 键**）与 `tokens`（**48 键**）两组 + `errors` 组 **+7 码**（`review.*`×6 + `token.not_found`）+ 既有 `common` 组 **+1**（`cancel`）—— 净增 **82 键**（**§6 为键数真值**，逐行实测；v1.15：`submissions` +`action.view`；**v1.17：`tokens` +5 scope 说明 +2 成功提示**；**v1.18：`errors` +`token.not_found`、基线订正 22 → 21**） |
| 3 | `apps/web/src/i18n/en.ts` | 同上（英文对译，键集合**逐一对应**） |
| 4 | `apps/server/src/review/query.ts` | `ReviewListItem` + `reviewComment: string \| null` **与 `assetType: AssetType`**；`LIST_SELECT` + `reviewComment: reviewTask.reviewComment` **与 `assetType: asset.type`**（⚠️ `asset` 表**已在 `baseQuery` 的 join 里**（`apps/server/src/review/query.ts:82`）⇒ **无需加 join**） |
| 5 | `apps/server/src/http/reviews.test.ts`（或 `review/service.test.ts`） | **新增**断言：`/mine` 与队列列表响应含 `reviewComment`（驳回后非空、未驳回为 `null`）**与 `assetType`（值 ∈ skill/mcp/agent，与所提交资产一致）**——**不修改既有断言** |
| 6 | `apps/server/src/auth/api-keys.ts` + `apps/server/src/http/tokens.ts` | **① 命名全链**：`ApiKeyEndpoints` 窄化接口补 `name?: string` · `issueApiKey` 透传（**`trim()` 后为空 ⇒ 省略字段**——官方 `minimumNameLength` 默认 1） · `issueBodySchema` 补 `name: z.string().trim().max(32).optional()` **② 读面加性**：`listApiKeys` 的 SELECT 补 `name` / **`start`** / **`metadata`** / **`lastRequest`**，回填 `name` / `start` / **`tail`（解 `metadata.tail`，双串化容错）** / `lastRequest` **③ 掩码配置**：`better-auth.ts` 加 `startingCharactersConfig: { charactersLength: 12 }` + **`enableMetadata: true`**（★ 官方默认关闭，不开则写 metadata 必失败：签发抛 `METADATA_DISABLED` / 更新静默忽略） + **`maximumNameLength: 32`**（钉定官方默认） **④ 签发写 `metadata.tail`** = 明文后 4 位（★ **两次官方调用**：明文由官方 `createApiKey` 内部生成 ⇒ create body 无法预知 tail，改为 create 后补一次 `updateApiKey`；明文只在本函数内可取；审计 detail 零明文）**⑤ 新增 `PATCH /api/tokens/:id`**（`{name?, scope?}`；本人 ∨ 他人 404 防枚举；透传官方 `updateApiKey`；审计 `token.update`）—— **零迁移 · 零 schema** |
| 7 | `apps/web/src/components/console/StatusPill.tsx` | **加性扩展**：`kind` 增 `'task'` + `TASK_STATUS_VARIANT`（PENDING=warning / APPROVED=success / **REJECTED=实色蓝→紫渐变 + 白字**（`#6A6DFF → #B85EFF`，对标 21-skillhub 品牌渐变，**去红**，与「已通过」实底白字同构）/ WITHDRAWN=secondary）—— 既有 asset/version 两 kind **零改动**（`M4b-5` 审核面同样消费）；渐变须落 **token/variant**（v1.14 定死：token = `--gradient-rejected`（`aih-theme.css` C 层） + variant = 官方 `badge.tsx` 的 `rejected`（`bg-[image:var(--gradient-rejected)] text-white [a&]:hover:brightness-105`）；**禁 className 覆盖外观**） |
| 8 | `apps/web/src/api/client.ts` | **加性**：新增 `apiDelete<T>(path, opts)` **与 `apiPatch<T>(path, body, opts)`**（皆与 `apiPost` 同形、复用 `doFetch`）—— 原仅 `apiGet`/`apiPost`：删除令牌需 `DELETE`、**编辑令牌需 `PATCH`**（**v1.13 补登记**：此前只记了 `apiDelete`，而 T7 编辑走 PATCH，缺它页面发不出请求）；另补 **空体守卫**（204 / 空体 ⇒ `undefined` —— 原先 `res.json()` 在 204 上抛 `SyntaxError`） |
| 9 | `apps/server/src/auth/better-auth.ts` | 官方 `apiKey()` 配置 + **3 行**：① `startingCharactersConfig: { charactersLength: 12 }`（Key 掩码前缀 6 → 12；官方默认 6 只留 2 位随机，辨识度不足）② **`enableMetadata: true`**（★ 官方**默认关闭** `dist/index.mjs:2328-2330`；不开则签发传 metadata 抛 `METADATA_DISABLED`（`:767-770`）、更新**静默忽略**（`:1511`）——本批 `metadata.tail` 写入的前提）③ **`maximumNameLength: 32`**（钉定官方默认，防上游漂移；同文件先例 = 设备流参数显式钉定） |
| 10 | `apps/web/src/styles/aih-theme.css` | **加性**：C 品牌渐变层增第 4 个 token **`--gradient-rejected`** = `linear-gradient(96deg, #6a6dff 0%, #b85eff 100%)`（M4b-3 批 design D12 v1.14，用户拍板 A）—— 层注释白名单 **3 → 4** 同步；**不注册** `@theme --color-*`（渐变值塞 `background-color` 永不渲染）⇒ 消费只走任意值 `bg-[image:var(--gradient-rejected)]` |
| 11 | `apps/web/src/components/ui/shadcn/badge.tsx` | **加性**（官方第 ④ 条路径「改组件源码加 variant」；M4b-1 §3.5 已授权先例 = 同件加 `success`/`warning`）：`cva` 增 **`rejected`** variant = `bg-[image:var(--gradient-rejected)] text-white [a&]:hover:brightness-105`（**只增不改**：base 串与既有 variant 零改动）；hover 用 `brightness`（渐变底会吃掉 `bg-*/90` 反馈 ⇒ 照抄官方 `destructive` 的 `[a&]:hover:bg-x/90` 是**假反馈**） |

### 3.3 路由（本批形态）

| 路径 | 现状 | 本批 |
|------|------|------|
| `/dashboard/submissions` | `ComingSoon`（占位） | **真页 `Submissions`** |
| `/dashboard/tokens` | `ComingSoon`（占位） | **真页 `Tokens`** |
| 其余 9 条 | 不变 | 不变（`DEV_BATCH` 余 **5 项**） |

⇒ 路由总数 **11 条不变**（本批零新增路由，只把两条占位替换为真页）。

---

## 4. 页面规格（本批核心）

### 4.1 我的提交 `/dashboard/submissions`

**数据源**：`GET /api/reviews/mine?status=&limit=&offset=`（服务端已支持；`status` 省略 = 全部）

**列集合**（D1 · **v1.7 起 6 列**）：
| 列 | 取值 | 呈现 |
|----|------|------|
| 资产 | `assetSlug` + `assetVersion` | slug 主行 + 版本次行（mono） |
| **类型**（v1.7 新增） | `assetType`（**本批新增到读面**，值域 `skill`/`mcp`/`agent`） | `TypeIcon`（M4a 既有件）+ 短文案（技能 / MCP / 专家）；**列序在「资产」之后**（用户 2026-09-16 定：类型与名称换位） |
| 状态 | `status` | `StatusPill` + 本批**新增 review task 状态映射**：`PENDING`=warning「待审核」·`APPROVED`=success「已通过」·**`REJECTED`=实色蓝→紫渐变 + 白字「已驳回」**（v1.5 去红）·`WITHDRAWN`=secondary「已撤回」 |
| 提交时间 | `submittedAt` | 本地化日期时间 |
| 拒绝原因 | `reviewComment`（**本批新增字段**） | 单行截断 + `title` 全文（D2）；非 `REJECTED` 行显「—」 |
| 操作 | — | **[👁 查看] + [↩ 撤回]**（纯图标 + `aria-label` + `title`；**撤回仅 `PENDING` 行渲染**，其余行只有查看）—— 「查看」→ `/reviews/:taskId`（D3 v1.6） |

**筛选**（官方 `Select`，**不用 `FilterBar`**）：全部 / 待审核 / 已通过 / 已驳回 / 已撤回 —— 「全部」= **不传 `status`**（服务端非法值静默忽略 ⇒ 不可传 `ALL`/空串）。

**撤回流**（D3/D4）：
```
点 [↩ 撤回] → ConfirmDialog（标题「确认撤回？」+ 说明「撤回后该版本将退回草稿，可修改后重新提交」；**`destructive=false`** 去红）
  → 确认 → POST /api/reviews/:id/withdraw → 成功：列表局部刷新 + toast「已撤回」
  → 失败：toast 服务端 message + 刷新列表（并发已被裁决的场景）
```

**查看入口**（D3 v1.6）：操作列 [👁 查看] → `navigate(`/reviews/${taskId}`)`（详情页当前为**占位**，属 M4b-5；本批只保证跳转可达）。
⚠️ **不做整行可点** —— 用户 2026-09-16 明确「加一个查看」；好处：共享件零改动 + 无「整行可点」的键盘可达难题。
⚠️ **详情页的细化设计归 M4b-5**（用户 2026-09-16 定 **A**：层次保持编排，不做设计前移）——
   本批**只做入口**；详情页的既有依据 = 主 design §12 线框（第 8 张「审核详情」）· §2.3 M4b-5 范围 ·
   §5.1 路由契约（共享路由：管理档 ∨ 提交人本人）· 服务端能力**已全部交付**（`GET /api/reviews/:id` ·
   `approve`/`reject`/`withdraw` · 版本文件树与预览端点）。
   ⇒ 细化批 design（分型 manifest 卡 ×3 族 · 文件树 · 预览 · 三动作 · 防自审交互）随 **M4b-5** 立。

**三态/空态**（D10）：加载 = `Skeleton` 行；错误 = `ErrorState`（可重试）；空 = 分两种文案（从未提交 / 筛选无结果）。

**分页**：官方 `Pagination` + `limit`/`offset`（服务端已支持）。

### 4.2 我的令牌 `/dashboard/tokens`

**数据源**：`GET /api/tokens` → `{ items: ApiKeyRow[] }`（无分页参数 ⇒ 本页**不做分页**）
`ApiKeyRow`（本批扩展后）= `{ id, scope（码串）, name, start, tail, expiresAt, revokedAt, createdAt, lastRequest }`
（`auth/api-keys.ts`；`start`/`lastRequest`/`name` 自官方 `apikey` 列读出，`tail` 自 `metadata.tail`）

**列表口径（D11）**：**只显示有效令牌** —— 前端过滤 `revokedAt === null`（**零服务端改动**；本人令牌量小）。
⇒ 已删除（吊销）的令牌**不出现**在列表中 ⇒ 操作列恒为「[✎ 编辑] [🗑 删除]」，无「—」分支。

**列集合（6 列，D11）**：

| 列 | 取值 | 呈现 |
|----|------|------|
| **名称** | `name` | 有值显名称；**无值显「—」**（`text-muted-foreground`） |
| **Key** | `start` + `tail` | ★ **掩码形态**：`aih_9fK2mQ4p` + `*****` + `3ba3`（mono 小字、`text-muted-foreground`、`truncate`、`title` 给 `id`）<br>⚠️ 旧令牌（`start` 为 null）⇒ 显「—」（无法回填） |
| 权限范围 | `scope` | 空串 = 「全量」（**outline 胶囊**）；否则按 `,` 拆成码胶囊（`font-mono`） |
| 创建时间 | `createdAt` | 本地化日期时间 |
| **最后使用** | `lastRequest` | 本地化日期时间；`null` = 「从未使用」；★ **早于 3 个月 ⇒ `text-warning`**（对标 new-api 的僵尸令牌提示） |
| 操作 | — | `[✎ 编辑]` `[🗑 删除]` —— **纯图标 + `aria-label` + `title`**，**两图标同色**（`ghost`，**不用红**） |

> ⚠️ **有效期不显示**（D11 · 用户 2026-09-16 定）：一律按**永不过期**创建（创建不传 `expiresInDays`）⇒ 列表**无有效期列**。
> ⚠️ **Key 明文不可回流**：库中只有 `base64url(sha256(明文))`（不可逆）⇒ 「点击取回明文」（new-api 的做法）**本仓做不到**，
> 这是**更强的安全模型**。可展示的只有官方 `start`（明文前 N 位，本批配 `charactersLength: 12`）与
> `metadata.tail`（明文后 4 位，创建时写入）⇒ 合计 16 位明文片段，**安全影响极小**（明文全长 47 位）。
> ⇒ `05 §5` 需补一句「库中可存明文**首尾片段**用于掩码展示」。

**创建流**（D13/D11）：
```text
「创建令牌」→ Dialog（**表单态，仅 2 字段**）：
   名称        [text，**必填**（v1.11）；**≤32 字符**（官方 `maximumNameLength` 默认上限）；
                不限字符集（中文可用）；占位「例如：CI 发布用」
                —— 空 / 纯空白 ⇒ **提交按钮禁用**（前端）+ 服务端 400（双保险）；不校验重名；
                旧令牌（历史无名称行）列表仍显「—」]
   权限范围    [ToggleGroup type="multiple" × 5 项；**每项两行**：码名（mono）+ 中文说明小字；
                选中显 ✓、未选显空方框；全不勾 = 全量]
   ⚠️ **无「有效期」字段** —— 一律永不过期（不传 `expiresInDays`）
  → 提交 → POST /api/tokens { name?, scope? } → 201 { id, token, expiresAt }
  → ★ 同 Dialog 切「明文态」（同一 Dialog 内 `step: 'form' | 'plain'`，单 open 状态）：
       「请立即复制你的令牌」· aih_…（mono 大字 `break-all`）· [CopyButton **clearOnUnmount**]
       ⚠️ 「令牌只显示这一次，关闭后无法再次查看。」· [我已保存，关闭]
       **明文态隐藏 ✕**（少一个误触面）
  ★ **误关防护（四条关闭路径统一拦截）**：Esc / 遮罩 / ✕ / 自绘按钮 —— 一律经根组件 `onOpenChange`
     （Radix 所有关闭路径都触发它）⇒ **一处拦全**：`copiedOnce === false` 时先开 `ConfirmDialog`（`destructive=false`）
  ★ **复制标记**：`CopyButton` 无 `onCopied` 回调（`copied` 为内部 state）⇒ 页内包一层
     `<div onClickCapture={() => setCopiedOnce(true)}>`（**零改共享件**）
  → 关闭明文态**之后**再刷新列表（`invalidateCache()` + `retryTick++`）
```

> **术语说明（v1.5）**：UI 文案统一用「**创建令牌**」（原「签发令牌」——用户 2026-09-16 定）；
> **服务端审计事件名保持 `token.issue`**（真码 `http/tokens.ts:76`，英文内部符号，与 UI 措辞解耦）
> ⇒ 前端「创建」/ 审计「`token.issue`」二者不冲突；**不改真码事件名**（会动既有测试 2 处断言与历史数据语义）。

> **★ 实现期须知（v1.5 · 原型实证的两条坑）**：
> ① **关闭逻辑必须单一入口**：原型期曾出现「明文态的『我已保存，关闭』按钮自己写死了弹确认」⇒ 与
>    `onOpenChange` 的拦截逻辑**不一致**（按钮路径绕过了复制标记判断）。⇒ 实现期须把四条路径**收敛到同一个
>    `requestClose()`**（按钮 `onClick` 与 `onOpenChange` 都调它），**禁止两处各写一套分支**。
> ② **关闭后必须复位**：`step → 'form'` 与 `copiedOnce → false` 都要清（原型期实测：不复位会导致再次打开
>    仍停留在上次的明文态 / 复制标记残留 ⇒ 第二次创建时「未复制即关」的防护失效）。

> **T7 落地注记（v1.17，实现期实证）**：
> 1. **关闭逻辑单一入口**：四条路径（Esc / 遮罩 / ✕ / 自绘按钮）确实全部收敛到 `requestClose()`（`onOpenChange` 与按钮 `onClick` 同调它）——**实测**：明文态未复制时按 Esc ⇒ 弹「还没有复制，确定关闭吗？」且**留在明文态** ✓；点自绘「我已保存，关闭」（未复制）⇒ 同样弹确认 ✓；点「返回」⇒ 确认关闭、明文态保留 ✓；点「确定关闭」⇒ 弹窗真关 ✓。
> 2. **复制标记的包裹范围 = 只包「明文 + CopyButton」**，**不包**「我已保存，关闭」（否则点关闭会顺手置位 `copiedOnce` ⇒ 防护形同失效）——落在页内 `<div onClickCapture>`（零改共享件）。**实测**：点复制后再点「我已保存，关闭」⇒ **无确认、直接关闭** ✓ + 列表出现新令牌（关闭后刷新）✓。
> 3. **明文形态实测**：`aih_` 前缀 · **全长 47 位**（与 §4.2 的「明文全长 47 位」一致）· `start` 前 12 + `metadata.tail` 后 4 ⇒ 列表掩码 `aih_xxxxxxxx*****xxxx`；明文态 `showCloseButton={false}` ⇒ **✕ 实测计数 = 0** ✓。
> 4. **只显有效实测**：造数后库中 **13 行**（12 有效 + 1 已吊销）⇒ 列表渲染 **12 行** ✓（吊销行保留、前端过滤）。
> 5. **未证项（工具通道受限，非跳过）**：明文态「**点遮罩**」关闭路径未驱动 —— Radix 的 outside-pointer 判定需**真实指针事件**，本次 CDP 原生输入通道间歇超时（合成事件不足以触发该判定）⇒ 登记待 T10 dogfood（脚本用 `clickReal()` 真指针）复验；其余三路径 + 「复制后直接关」均已实证。

**编辑流**（D11，**本批新增**）：
```text
[✎ 编辑] → Dialog：
   名称        [text，初值 = 当前 name；**≤32**；**必填**（v1.11：清空 / 纯空白 ⇒ 提交按钮禁用 + 服务端 400）]
   权限范围    [ToggleGroup multiple × 5 项（同创建那套）；全不勾 = 全量]
  → 保存 → PATCH /api/tokens/:id { name?, scope? } → 200 → 关闭 + 刷新 + toast「已保存」
  ⇒ 服务端透传官方 `updateApiKey`（**官方原生支持 name + permissions**，见 §5.1）
```

**删除流**（D14）：
```text
[🗑 删除] → ConfirmDialog（**destructive=false ⇒ 确认按钮走 primary 蓝，不用红**）
   标题「确认删除？」· 说明「删除后「{name}」立即失效，且不可恢复。」· 确认「确认删除」
  → DELETE /api/tokens/:id（幂等 204）→ 关闭 + 刷新（该行从列表消失）+ toast「已删除」
  ⚠️ **仅本人**（v1.11）：本人以外（**含超管**）⇒ 404 —— 令牌彻底私有，对齐 `05 §5`；超管无令牌管理页
  ⚠️ 服务端语义 = **吊销**（`revokedAt` 写入、行不删、审计 `token.revoke`）；前端措辞用「删除」（用户视角一致）
```

**三态/空态**：同 §4.1（`DataTable` 内建）；空态文案 = 「还没有访问令牌」+ 一句用途说明（引导指向右上「创建令牌」按钮）。

### 4.3 全局交互约定

- 两页均渲染于 `AppShell` 内（侧栏 + 顶栏 + 用户区），**不新增壳层改动**（M4b-2 已完成）
- 所有请求走 `apps/web/src/api/client.ts` 的 `apiGet`/`apiPost` ⇒ **自动继承**会话、401 四分类分流、
  语言感知缓存（无新接线点）
- 语言切换：两页文案随 `I18nProvider` 即时切换（i18n 组独立，见 §6）

---

### 4.4 UI 结构与组件树（v1.3 补强 —— 落实「实现照抄零二次决策」）

> 本节补强动机：v1.2 只有「列集合 + 交互流」的文字规格，缺**组件树 / 线框差异声明 / 表格与态落点**。
> 写法对齐 M4b-2 批 design §5.1 的粒度（版式 + 件选型 + 逐态映射 + 实测值）。
> **本节全部结论均来自实际件的 props 实测**（2026-09-16 读源）。

#### 4.4.1 组件树

**`Submissions.tsx`**
```text
Submissions (page)
├─ PageHeader                 title / description（i18n）；无 actions
├─ 筛选行 <div className="mb-3 flex flex-wrap items-center gap-3">
│   └─ Select（官方 ui/shadcn/select）+ Label      ← 状态筛选 5 项；ALL 哨兵映射为「不带 status」
│        ⚠ 不用 FilterBar —— 见 4.4.2
├─ DataTable<SubmissionRow>
│   props：columns · data · getRowId={r => String(r.taskId)} · loading · error · onRetry
│           · emptyMessage（i18n）· rowActions · rowActionsLabel
│   rowActions = (row) => (
│     <div className="flex items-center justify-end gap-0.5">
│       <Button size="icon-sm" variant="ghost" aria-label="查看" title="查看详情"
│               onClick={() => navigate(`/reviews/${row.taskId}`)}>
│         <Eye className="size-4" />          ← 与「撤回」同色（不用红）
│       </Button>
│       {row.status === 'PENDING' ? (
│         <Button size="icon-sm" variant="ghost" aria-label="撤回" title="撤回"
│                 onClick={() => setWithdrawRow(row)}>
│           <Undo2 className="size-4" />      ← 同色
│         </Button>
│       ) : null}
│     </div>)
│   ⚠️ 无行点击（D3 v1.6）
│   └─ （DataTable 内建：载态 SkeletonLoader variant="table" · 错态 ErrorState + onRetry · 空态官方 Empty）
├─ ConfirmDialog              撤回二次确认（**destructive={false} ⇒ 确认按钮走 primary 蓝，不用红**；title/description/confirmLabel 走 i18n）
└─ Pagination（官方 ui/Pagination）        仅 total > limit 时渲染
```

> **T6 落地注记（v1.15，实现期实证）**：
> 1. **空态两文案的落点**（design 要求「从未提交 / 筛选无结果」两种）：**从未提交**走**页面级** `Empty`（`EmptyTitle` = `empty.none` + `EmptyDescription` = `empty.noneHint` 两行）；**筛选无结果**走 `DataTable.emptyMessage`（`empty.filtered`）—— `DataTable` 的 `emptyMessage` 是单字符串，两行形态只能由页面承载。
> 2. **`Pagination` 条件**：实现首版写 `data ? <Pagination/>`，实测**单页也显示「1 / 1 · 每页 20」**（与本树末行的「仅 `total > limit` 时渲染」不符）⇒ **同轮修为 `data.total > limit`**；真浏览器复验：`total=4/limit=20` 无控件 ·`total=25/limit=20` → 「Previous · 1 / 2 · 每页 20 · Next」。
> 3. **实测记录**（真浏览器 + 真后端）：6 列表头与列序 ✓ · `TypeIcon` SVG 每行 1 枚 ✓ · 四态徽章 `data-variant` = `warning`/`success`/**`rejected`（实底 `linear-gradient(96deg, rgb(106,109,255) 0%, …)` + 白字）**/`secondary` ✓ · 操作列 PENDING 行 `[查看, 撤回]` 其余 `[查看]` ✓ · 拒绝原因 `title` 全文 + `text-overflow: ellipsis` ✓ · 筛选「全部」**不带 `status`** / 「已驳回」带 `status=REJECTED` ✓ · 非法 `status=BOGUS` 回落「全部」✓ · 刷新保持筛选 ✓ · 后退可回 ✓ · 载态 25 个骨架 ✓ · 错态 `role=alert` + 重试 ✓ · 撤回失败（**真后端 404**） toast「操作失败，review.not_found」+ 列表刷新 ✓。
> 4. ~~未证项（数据缺位）~~ ⇒ **v1.16 已关闭**：经**可重放造数脚本**（`docs/smoke/scripts/m4b3-seed-submissions.ts`）给 `m4b2_user` 造出真实提交后实测 —— 撤回成功链（弹窗 → 204 → toast → 行 `待审核`→`已撤回`、按钮消失）+ 服务端落库（`review_task` = `WITHDRAWN` · `asset_version` 退回 `UPLOADED`）+ 真实数据列渲染（双类型 / 渐变徽章 / 拒绝原因 `title`）**全部通过**。

**`Tokens.tsx`**
```text
Tokens (page)
├─ PageHeader                 title / description；actions = <Button>创建令牌</Button>
├─ DataTable<TokenRow>        data = items.filter(r => r.revokedAt === null)   ← 只显有效
│   props 同 Submissions；getRowId={r => r.id}
│   rowActions = (row) => (        ← 恒有，无「—」分支
│     <div className="flex items-center justify-end gap-0.5">
│       <Button size="icon-sm" variant="ghost" aria-label="编辑" title="编辑">
│         <SquarePen className="size-4" />          ← 与删除**同色**（不用红）
│       </Button>
│       <Button size="icon-sm" variant="ghost" aria-label="删除" title="删除">
│         <Trash2 className="size-4" />             ← 同色
│       </Button>
│     </div>)
│   └─ Dialog（创建，**两态**，见 4.2）
│        ├─ 表单态：Field(名称 Input) · Field(权限范围 ToggleGroup)      ← **无有效期字段**
│        └─ 明文态：<code className="font-mono text-lg break-all">aih_…</code>
│                    + CopyButton（**clearOnUnmount**）· 警告文案 · 「我已保存，关闭」· **隐藏 ✕**
│   └─ Dialog（**编辑**，见 4.2）：Field(名称 Input) · Field(权限范围 ToggleGroup)
├─ ConfirmDialog              删除确认（**destructive=false**，「确认删除」）
└─ ConfirmDialog（复用同件）   明文态「未复制即关闭」二次确认（destructive=false）
```

#### 4.4.2 线框 ↔ 批 design 差异声明（**以批 design 为准**）

| 线框（主 design §12） | 批 design 定案 | 依据 |
|----------------------|---------------|------|
| 无「拒绝原因」列 | **有**该列 | U7（2026-09-14 拍板）+ R6-c |
| 状态列显原始码（`PENDING_REVIEW`） | 中文自然语（待审核 / 已通过 / 已驳回 / 已撤回） | U7 |
| 令牌列以 `scope` 打头 | 以**名称**打头 + **Key** 列（掩码）；无有效期列、无状态列 | D11（v1.5） |
| 令牌页「过期 ⚠」提示行 | **删除**（一律永不过期） | D11（v1.5） |
| 状态列显示原始码 | 中文自然语（`REJECTED` 用蓝紫渐变实底徽章） | U7 + D12（v1.5） |
| 令牌页无创建表单与明文态细节 | §4.2 给完整两态规格（含误关防护） | Q7 |

> 线框自身已标「示意数据非设计硬值」（主 design §12 头部）⇒ 差异处以本文档 §4 为准。
> **另：筛选控件不用 `FilterBar`** —— 该件**强制渲染搜索框**（`q` / `onQChange` / `qPlaceholder` 均为必填 props，
> `apps/web/src/components/console/FilterBar.tsx:30-36`），而本批只需「状态」一个维度 ⇒ 直接消费官方 `Select`，**零改造共享件**。

#### 4.4.3 表格规格（沿用官方默认，**零外观覆盖**）

- **密度 40**（主 design §10.1 落值）：表头 `h-10`（官方 `TableHead` 自带）+ 单元格 `p-2`（官方 `TableCell` 自带）
  ⇒ **不覆盖**（`apps/web/src/components/console/DataTable.tsx:34-35` 注释已声明「两项均为官方默认，本件零 className 外观覆盖」）
- **操作列**：由 `DataTable.rowActions` **自动追加**（表头 `sr-only` + 单元格右对齐 `text-right`，`apps/web/src/components/console/DataTable.tsx:110`）
  ⇒ 调用方**不手拼**操作列
- **列对齐**：资产 / 权限范围 / 时间 / 状态 = 左对齐；操作列 = 右对齐（内建）
- **拒绝原因截断**：`<span className="block max-w-[280px] truncate" title={fullText}>`（单行截断 + 原生 tooltip；仅 `REJECTED` 行有值）
- **长 id 截断**：`<span className="font-mono" title={id}>{id.slice(0, 8)}…</span>`
- **宽度策略**：不设列宽，交给 `Table` 自动分配（官方默认 `w-full`）；仅「拒绝原因」给 `max-w` 上限

#### 4.4.4 交互态

| 元素 | 态 | 约定 |
|------|----|------|
| 行 | hover | 官方 `TableRow` hover；可点行加 `cursor-pointer` |
| 行 | 点击 | 整行 → `/reviews/:taskId`；**撤回按钮 `stopPropagation`**（D3） |
| 按钮 | loading | 提交中 `disabled` + 官方 `Spinner`（M4b-2 登录钮同款） |
| 按钮 | disabled | 有效期越界（<1 或 >3650）时「创建」禁用（Q7） |
| Dialog | 明文态未复制即关 | 触发 `ConfirmDialog`（`destructive=false`）—— 防误丢（D7） |
| CopyButton | 明文场景 | 传 **`clearOnUnmount`**：卸载时若剪贴板仍是该值则清空（该件为此场景设计，`apps/web/src/components/ui/CopyButton.tsx:35-48`） |
| toast | 位置/时长 | 沿用 `Toaster`（sonner）默认；文案全部走 i18n |

#### 4.4.5 状态徽章与空值约定

| 场景 | 呈现 | 落点 |
|------|------|------|
| 我的提交状态（4 态） | `PENDING`=warning「待审核」· `APPROVED`=success「已通过」· **`REJECTED`=实底蓝→紫渐变 + 白字「已驳回」**（★ v1.5，**不用红**）· `WITHDRAWN`=secondary「已撤回」（用户定：保持灰） | ★ `StatusPill` **新增 `kind="task"`** + `TASK_STATUS_VARIANT`（加性扩展；`M4b-5` 审核面同样消费）<br>★ `REJECTED` 需新语义色（见下） |
| ~~令牌状态~~ | **本批删除**（v1.5） | 令牌**不再显示状态**（创建即有效；已删除的不出现在列表）⇒ 无需徽章 |
| **★ 新增语义色（v1.5 · 命名订正 v1.14）** | **`--gradient-rejected`** = 实色**蓝→紫渐变**（`#6A6DFF → #B85EFF`，对标 21-skillhub 的 `--brand-gradient`） | §4.4 色彩体系**加 1 个 token**（**落 C 品牌渐变层**，白名单 3 → 4；值只住 `aih-theme.css`）；消费 = `badge` 的 **`rejected` variant**（`StatusPill kind="task"` 只做映射，**零 className 覆盖**）；「已驳回」= 实色渐变底 + **白字**，与「已通过」（实底绿 + 白字）**同构**<br>⚠️ 全站去红属体系级口径 ⇒ 其余落点登记 **M4b-7**<br>⚠️ **同名不同轴**：版本八态的 `REJECTED` 仍 = `destructive`（版本族口径，本批不动） |
| 无拒绝原因 | 「—」（`text-muted-foreground`） | 单元格 |
| 从未使用 | 「从未使用」（`text-muted-foreground`） | 单元格 |
| **最后使用超 3 个月** | 文字 `text-warning`（不是徽章） | 单元格（对标 new-api） |
| 令牌无名称 | 「—」（`text-muted-foreground`） | 名称列 |
| 令牌 Key 无掩码（旧数据） | 「—」（`text-muted-foreground`，`title` 给 `id`） | Key 列 |

## 5. 服务端改动规格（R6-c，加性）

### 5.1 改动点（v1.5：4 个文件）

| 文件 | 改动 | 行数量级（**T1/T2 落地后实测回填**） |
|------|------|---------|
| `apps/server/src/review/query.ts` | ① `ReviewListItem` + `reviewComment: string \| null` ② `LIST_SELECT` + `reviewComment` ③ `ReviewListItem` + `assetType` ④ `LIST_SELECT` + `assetType: asset.type`（**asset 表已在 `baseQuery` 的 join 里**） | **+8**（代码 5 + 注释 3） |
| `apps/server/src/auth/api-keys.ts` | ③ `createApiKey` 窄化接口 + `name?` / `metadata?` ④ `issueApiKey` 透传 `name`（空 ⇒ 省略）+ **写入 `metadata.tail`**（★ create 后补 `updateApiKey`，两次官方调用）⑤ `listApiKeys` SELECT 补 `name` / `start` / `metadata` / `lastRequest`（+ `ApiKeyRow` 回填，含 `tail` 解析）⑥ `updateApiKey` 窄化接口 + `name?` / `permissions?` / `metadata?` ⑦ `parseJsonText`/`parseTail` 容错解析 | **+70 / −8** |
| `apps/server/src/http/tokens.ts` | ⑦ `issueBodySchema` + `name`（**必填**：`trim().min(1).max(32)`，缺/空 ⇒ 400；v1.11）+ **DELETE 超管分支收回**（仅本人）⑧ **新增 `PATCH /api/tokens/:id`**（body `{ name?, scope? }`；校验 + 透传 `updateApiKey` + 审计 `token.update`） | **+6 / −1**（PATCH 待 T3） |
| `apps/server/src/auth/better-auth.ts` | ⑨ **3 行配置**：`startingCharactersConfig: { charactersLength: 12 }` + **`enableMetadata: true`** + **`maximumNameLength: 32`**（v1.10） | **+17**（含源码实证注释） |
| **合计**（产品代码 4 件） | | **+101 / −9**（其中注释 **42 行** 实测）· 测试件另 **+176**（`reviews.test.ts +93` · `tokens.test.ts +83`） |

**为什么这么小**：`review_comment` 列自**迁移 0000** 起存在（`db/schema/governance.ts:49`），
写入路径 M3 已实现（`review/service.ts:183,238`）⇒ 本批**只把已有列读出到列表读面**。

### 5.2 契约影响（向后兼容论证）

- **加性**：响应**新增**字段，既有字段名/类型/顺序**零变化** ⇒ 既有消费方无感
- **作用面**：`LIST_SELECT` 同时服务 `listQueue`（队列）与 `listMine`（我的提交）⇒ **两处都露出 `reviewComment`**
  —— 队列露出对 M4b-5（审核面）有利（审核人能看到上次驳回原因），故**不拆分**为「仅 mine」分支
- **`getReviewDetail`**：`ReviewDetailItem extends ReviewListItem` ⇒ 详情自动获得该字段（M4b-5 可直接消费）
- **`PATCH /api/tokens/:id` 的加性论证**：新端点（不改既有端点形状）；body 两字段**均可选**
  （`{ name?, scope? }`）⇒ 无破坏；响应 200 单条 `ApiKeyRow`（与列表 item 同形，前端可直接回填）
  · **授权**：本人 token（`userId` 取自会话）—— 与 DELETE 同口径（他人 token 视同 404 防枚举）
  · ⚠️ **scope 语义**：`permissions` 传 `null` = 全量（与创建一致）；空数组按「全量」处理（对齐 `scopeSchema` 空集语义）
- **`startingCharactersConfig` 的影响面**：只影响**新创建**令牌的 `start` 长度（掩码可辨识度）
  ⇒ 对既有令牌/校验/明文**零影响**；官方默认 `shouldStore: true` 未被我们覆盖
- **`metadata.tail` 的影响面**：新增写入（创建时）⇒ 库里多 4 位明文片段；**不参与校验**（校验仍走哈希）✓
- ★ **官方侧 3 条实证约束（v1.10：T2 实现期逐行复核官方源码）**：
  ① `metadata` **默认关闭**（`enableMetadata` 默认 false，`@better-auth/api-key` `dist/index.mjs:2330`）⇒ 必须显式开启；
     否则签发传 metadata **抛** `METADATA_DISABLED`（`:767-770`）、更新则**静默忽略**（`:1511`）
  ② 名称上限官方**默认 32**（`maximumNameLength`，`:2328`）⇒ 本批上限由 ≤64 **订正为 ≤32** 并显式钉定（防上游漂移）
  ③ 名称下限官方默认 1（`minimumNameLength`，`:2329`）⇒ **本批在路由层限定「必填」**（v1.11：`trim().min(1)`，
     空/纯空白 ⇒ 400 不进官方）；**不用官方 `requireName` 开关**（该开关会作用于内部签发通道 ⇒ 误伤风险；
     我们只在自己接口层校验，行为明确可控）；④ 见下条（作用面）
  ④ ★ **作用面（v1.10 补登记）**：`issueApiKey` 亦被**设备流**复用（`apps/server/src/http/device-routes.ts:93`）⇒
     设备令牌同样会获得 `tail` 并各自多一次 `updateApiKey` 调用（**行为零变化**：明文/校验/过期语义不变，成本可忽略；
     设备令牌本就在 `/api/tokens` 列表中可见 ⇒ 掩码一致反而是加分）
- ★ **`metadata.tail` 的写入 = 两次官方调用**（create 拿明文 → 补 `updateApiKey` 写 tail）：明文由官方内部
  keyGenerator 生成（`:802-808`）⇒ create 的 body **无法预知** tail。**失败语义**：追加写失败 ⇒ 请求 500，
  该 token 行已存在但无 tail（前端兜底「—」）；同库同链路 ⇒ 概率极低，**接受并登记**
- ★ **读面容错**：`metadata` 为 JSON 文本 ⇒ `parseTail` 按官方 `parseDoubleStringifiedMetadata`（`:25-29`）
  同款「单层 → 双串」容错；**落库形态实测 = 单层 JSON** `{"tail":"…"}`（T2 测试断言，兼作契约哨兵）
- ★ **T3 编辑的落库形态（v1.12，实现期实证）**：① `name` **必填**后，官方「无任何变更」错误
  `NO_VALUES_TO_UPDATE`（`dist/index.mjs:1526`）**不再可达**（路由层 zod 先拦缺名/空名）② **全量回写**（`scope: []`）
  = 官方 `permissions` 列写**文本 `"null"`**（`JSON.stringify(null)`，`:1525`）——**不是 SQL NULL**；读面
  `parsePermissions('null')` → `null` ⇒ `scope === ''`（全量）⇒ 与历史全量行（SQL NULL）**两种形态并存、读面归一**
  ③ PATCH 审计 detail = `{ fields: ['name' | 'scope'] }`（**字段名清单**，零明文 / 零值回显；M4b-6 审计浏览消费）
  ④ 200 响应复用 `readApiKeyRow`（新公共读面 —— 与列表 item **同形**，投影列/映射单源 `API_KEY_SELECT` + `toApiKeyRow`）
- **无迁移 / 无 schema 改动 / 无新依赖**：`git diff --stat -- apps/server/drizzle packages/` 应为空
  （`05 §5` 需补一句「库中可存明文**首尾片段**用于掩码展示」——属规范层同步，非 schema 改动）

### 5.3 测试面

- **reviews 面**：`apps/server/src/http/reviews.test.ts` 增断言
  ① 驳回后 `GET /api/reviews/mine` 对应行 `reviewComment === '原因原文'` ② 未裁决行为 `null`
  ③ `GET /api/reviews/mine` 每行含 `assetType`（值 ∈ `skill`/`mcp`/`agent`，与所提交资产类型一致）
- **tokens 面**（新增用例）：
  ① 创建带 `name` ⇒ 列表项 `name` 回显；不带 ⇒ `null`
  ② 创建返回的 `start` 长度 = 12（`charactersLength` 生效）· `metadata.tail` = 明文后 4 位
     ⚠️ 测试内**不得回显明文**（只断言长度与 `明文.endsWith(tail)`）
  ③ `PATCH /api/tokens/:id` 改名 ⇒ 列表回显新名；改 `scope` ⇒ 回显新码串；他人 token ⇒ **404**
  ④ `GET /api/tokens` 含 `lastRequest` 字段（值可为 `null`）
  ⑤ **缺 `name` / 空串 / 纯空白 ⇒ 400 `request.invalid`**（**v1.11 契约变更**：名称必填；原「201 且 name null」作废）
  ⑥ 名称上限 32：32 字受理 / 33 字 ⇒ 400（官方 `maximumNameLength` 钉定生效；v1.10 加）
  ⑦ `metadata` 列**实读**形态 = 单层 JSON 文本 `{"tail":"…"}` 且 `tail === 明文.slice(-4)`（v1.10 加，兼作契约哨兵）
- **既有断言零修改**：实测无严格字段集断言（§1.2 #8）⇒ 加字段不破测试

---

## 6. i18n 变更规格

### 6.1 新建组 1：`submissions`（**26 键** —— v1.7：+4（`col.type` / `type.skill` / `type.mcp` / `type.agent`）；**v1.15：+1 `action.view`**）

> v1.4：删 3 键 —— `pagination.prev` / `pagination.next`（官方 `PaginationPrevious/Next` **硬编码英文**，无消费点，R2）· `title`（**复用** `dashboard.submissions`，单一来源，D10/R21）。

| 键 | zh | en |
|----|----|----|
| `subtitle` | 你提交的资产版本与审核进展 | Your submitted asset versions and review progress |
| `col.type` | 类型 | Type |
| `type.skill` | 技能 | Skill |
| `type.mcp` | MCP | MCP |
| `type.agent` | 专家 | Agent |
| `col.asset` | 资产 | Asset |
| `col.status` | 状态 | Status |
| `col.submittedAt` | 提交时间 | Submitted |
| `col.rejectReason` | 拒绝原因 | Rejection reason |
| `col.actions` | 操作 | Actions |
| `filter.label` | 状态筛选 | Status |
| `filter.all` | 全部 | All |
| `status.pending` | 待审核 | Pending |
| `status.approved` | 已通过 | Approved |
| `status.rejected` | 已驳回 | Rejected |
| `status.withdrawn` | 已撤回 | Withdrawn |
| `action.view` | 查看 | View |
| `action.withdraw` | 撤回 | Withdraw |
| `withdraw.title` | 确认撤回？ | Withdraw this submission? |
| `withdraw.desc` | 撤回后该版本将退回草稿，可修改后重新提交。 | The version returns to draft and can be resubmitted after changes. |
| `withdraw.confirm` | 确认撤回 | Withdraw |
| `withdraw.success` | 已撤回 | Withdrawn |
| `empty.none` | 还没有提交记录 | No submissions yet |
| `empty.noneHint` | 提交资产版本后，可在此查看审核进展。 | Submit an asset version to track its review progress here. |
| `empty.filtered` | 当前筛选下没有记录 | No records for this filter |
| `error.load` | 加载失败，请重试 | Failed to load, please retry |

### 6.2 新建组 2：`tokens`（**48 键** —— v1.1：+5；v1.4：−1（`title` 复用 `dashboard.tokens`）；v1.5：按令牌页最终形态重算；**v1.17：+7**（5 个 scope 说明 + `edit.success` + `delete.success`））

| 键 | zh | en |
|----|----|----|
| `subtitle` | 用于 CLI、脚本与自动化访问平台 API | For CLI, scripts and automation |
| `col.name` | 名称 | Name |
| `col.key` | Key | Key |
| `col.scope` | 权限范围 | Scope |
| `col.createdAt` | 创建时间 | Created |
| `col.lastUsed` | 最后使用 | Last used |
| `col.actions` | 操作 | Actions |
| `scope.full` | 全量 | Full access |
| `uses.never` | 从未使用 | Never used |
| `create.button` | 创建令牌 | Issue a token |
| `create.title` | 创建访问令牌 | Issue an access token |
| `create.desc` | 为 CLI、脚本或自动化创建一把长期凭证。 | Create a long-lived credential for CLI, scripts or automation. |
| `create.nameLabel` | 名称 | Name |
| `create.nameHint` | 便于识别用途（必填，最多 32 字） | A label to identify it (required, up to 32 characters) |
| `create.scopeLabel` | 权限范围 | Scope |
| `create.scopeHintNone` | 不选 = 全量权限（可访问所有端点） | None selected = full access (all endpoints) |
| `create.scopeHintSome` | 已选 {n} 项（与操作码求交集，未含的操作会被拒绝） | {n} selected (intersected with each operation; others are denied) |
| `create.submit` | 创建令牌 | Issue token |
| `edit.button` | 编辑 | Edit |
| `edit.title` | 编辑令牌 | Edit token |
| `edit.desc` | 修改名称与权限范围。 | Update the name and scope. |
| `edit.nameLabel` | 名称 | Name |
| `edit.scopeLabel` | 权限范围 | Scope |
| `edit.scopeHint` | 与创建时同一套语义：全不选 = 全量权限。 | Same semantics as issuing: none selected = full access. |
| `edit.submit` | 保存 | Save |
| `delete.button` | 删除 | Delete |
| `delete.title` | 确认删除？ | Delete this token? |
| `delete.desc` | 删除后「{name}」立即失效，且不可恢复。 | Once deleted, "{name}" stops working immediately and cannot be restored. |
| `delete.confirm` | 确认删除 | Delete |
| `plain.title` | 请立即复制你的令牌 | Copy your token now |
| `plain.copy` | 复制令牌 | Copy token |
| `plain.copied` | 已复制 | Copied |
| `plain.warning` | 令牌只显示这一次，关闭后无法再次查看。 | This token is shown only once and cannot be viewed again. |
| `plain.close` | 我已保存，关闭 | I have saved it, close |
| `plain.closeTitle` | 还没有复制，确定关闭吗？ | Not copied yet — close anyway? |
| `plain.closeDesc` | 关闭后无法再次查看该令牌明文，只能重新创建。 | Once closed, the token cannot be viewed again — you would have to issue a new one. |
| `plain.closeConfirm` | 确定关闭 | Close anyway |
| `plain.closeCancel` | 返回 | Back |
| `empty.none` | 还没有访问令牌 | No access tokens yet |
| `empty.noneHint` | 创建一个令牌，供 CLI 或脚本调用平台 API。 | Issue a token so CLI or scripts can call the platform API. |
| `error.load` | 加载失败，请重试 | Failed to load, please retry |

> **v1.17 补登 7 键（T7 落地暴露的缺口）**：
> | 键 | zh | en |
> |----|----|----|
> | `scope.publish` | 资产注册与草稿上传 | Register assets & upload drafts |
> | `scope.manage` | 资产管理（状态、删除、撤回） | Manage assets (status, delete, yank) |
> | `scope.submit` | 提交审核与撤回提交 | Submit versions and withdraw |
> | `scope.approve` | 审核裁决（通过 / 拒绝） | Approve or reject submissions |
> | `scope.audit` | 审计浏览 | View the audit log |
> | `edit.success` | 已保存 | Saved |
> | `delete.success` | 已删除 | Deleted |
>
> ① 前 5 键：design §4.2/§4.4.1 写死「scope 每项**两行** = 码名 mono + **中文说明小字**」（Q13）而键表只给了 `scope.full` ⇒ 5 个码的说明文字**无键可消费**；文案对齐规范 `05 §6.4`，**单一映射** `SCOPE_KEY: Record<TokenScopeCode, string>` 落码。
> ② 后 2 键：断言 ⑧（保存 ⇒ toast）与 §4.2 删除流（⇒ toast「已删除」）都要求成功提示，键表漏列。

### 6.3 既有组 `errors` 补 **7 码**（实测 **21 → 28 键**，R19 + v1.18 补 1）

> 依据：本仓方针「`errors` 组**覆盖服务端实有码**」（M4b-2 T9 已按此补 3 个 `auth.*` 码）。
> 服务端 `review/errors.ts:6-19` 实有 **6 码**，前端**零命中** ⇒ 撤回失败会落兜底「操作失败，review.not_pending」。
> ⇒ 本批**一次补全 6 码**（M4b-5 审核面同样消费，免二次改）。

| 键 | zh | en |
|----|----|----|
| `review.not_found` | 未找到该审核任务 | Review task not found |
| `review.already_pending` | 该版本已在审核中，请勿重复提交 | This version is already under review |
| `review.not_pending` | 该提交已被处理，无法再操作 | This submission has already been processed |
| `review.self_review` | 不能审核自己提交的版本 | You cannot review your own submission |
| `review.comment_required` | 请填写驳回原因 | A rejection reason is required |
| `review.access_denied` | 无权查看或操作该审核任务 | You do not have access to this review task |

> **v1.18（T8 落地）**：
> 1. **+1 码 `token.not_found`**（未找到该访问令牌 / Token not found）：键表原只列 6 个 `review.*`，但 T7 令牌页的编辑/删除失败面同样消费错误码；实测 `apps/server/src/http/tokens.ts:137/140/175/179` 四处返回该码 ⇒ 同批补上（免兜底串外露）。
> 2. **基线订正**：原文写「errors **22** → 28」——**逐行实测为 21 → 28**（`asset.*`×5 · `auth.*`×11 · `oidc.not_configured` · `request.invalid` · `network` · `unknown`）。净增口径不受影响（按**新增键数**计：26 + 48 + 7 + 1 = **82**）。
> 3. **可达性（实测结论）**：`token.not_found` **从 UI 不可达** —— 服务端吊销**幂等**（对已吊销令牌再删 ⇒ **204**，非 404），页面唯一能造陈旧态的路径（他处先删 + 本地再点）因此返回成功 ⇒ 该码是**防御性映射**。**验证改为**：服务端探针（DELETE/PATCH **不存在的 id** ⇒ 404 该码 ✓）+ 键存在性与 zh/en 对称 ✓ + 映射机制已由 `review.not_pending` 端到端证成 ✓。

**双向纪律**：zh/en **键集合逐一对应**（实测口径：双向差集 = 0）；本批净增 **82 键**
（新组 `submissions` **26** + `tokens` **48** = 74，另 `errors` 组 **+7**、既有 `common` 组 **+1**（`cancel`）；键表**逐行实测核对**，见 §11 准确性依据）。

> **v1.15 补登 2 键（T6 落地暴露的缺口）**：① `submissions.action.view`（组件树的「查看」图标原只写中文 `aria-label`/`title`，无键可消费）② `common.cancel`（`ConfirmDialog.cancelLabel` **必填**，而既有 `common` 组无取消键 —— 实测 grep 只有 `device.confirm`）。两键**一次补足**：T7 的删除/编辑/明文态三个弹窗共用 `common.cancel`。

---

## 7. 接口变更总览（服务端面）

| 端点 | 方法 | 变更 | 归属 |
|------|------|------|------|
| `/api/reviews/mine` | GET | **加性**：响应 item 增 `reviewComment` | 本批（R6-c） |
| `/api/reviews`（队列） | GET | **加性**：同上（共用 `LIST_SELECT`） | 本批（R6-c 连带） |
| `/api/reviews/:id`（详情） | GET | **加性**：同上（`ReviewDetailItem extends ReviewListItem`） | 本批（R6-c 连带） |
| `/api/reviews/:id/withdraw` | POST | 无变更（消费既有） | M3 已交付 |
| `/api/tokens` | POST | **契约变更（破坏性）**：body `name` **必填**（`trim().min(1).max(32)`；缺/空 ⇒ 400；响应形状不变（`{ id, token, expiresAt }`） | 本批 |
| `/api/tokens` · `/api/tokens/:id` | GET / DELETE | **加性**（GET）：列表 item 增 `name` / `start` / `tail` / `lastRequest`；**DELETE 授权收紧（v1.11）**：本人 ∨ SUPER_ADMIN → **仅本人**（他人含超管 ⇒ 404） | 本批 |
| `/api/tokens/:id` | **PATCH**（新增） | body `{ name?, scope? }` ⇒ 200 单条 `ApiKeyRow`；本人 token；他人视同 404；审计 `token.update` | **本批（新增）** |

⇒ **零迁移 · 零 schema 改动 · 零新端点 · 零新依赖**。

---

## 8. UI-UX 变动总览（本批用户可见变化）

| # | 变化 | 影响面 |
|---|------|--------|
| 1 | `/dashboard/submissions` 占位 → 可用页（列表/筛选/撤回/拒绝原因/跳详情） | 所有登录用户 |
| 2 | `/dashboard/tokens` 占位 → 可用页（列表/创建/明文一次性/吊销） | 所有登录用户 |
| 3 | 侧栏「个人」组两条目的 `DEV_BATCH` 标记消失（dev 环境不再显示批次角标） | dev 环境 |
| 4 | 语言切换覆盖两个新页 | zh/en |

**视觉口径**：本批**不新增视觉值**，全部使用 M4a §4.4 既有 token 与官方件默认；页面仅做**视觉合规核对**
（有无错位/溢出/串色）；节奏/密度/层次的打磨归 **M4b-7**（主 design §2.3 职责边界）。

---

## 9. 回归面与验证口径

### 9.1 门户零回归（硬约束，每 Task 收尾必跑）

`SMOKE_SHOT_PREFIX=… bun docs/smoke/scripts/m4a-dogfood.ts` ⇒ **36/36 PASS + NO JS ERRORS**（不得下降）。
本批**不碰**门户读面（`useApi`/`apiGet` 语义不变）、**不碰**共享壳（`AppShell`/`TopBar`/`SideNav`）⇒ 预期零回归。

### 9.2 门禁与冒烟顺序（复现 CI）

`bun install --frozen-lockfile` → `typecheck` → `lint` → `format:check` → `build` → `db:migrate` → `test`
（`test` 用 `CI=true` + 单库 `ai_asset_hub`；基线 = M4b-2 收口的 **500 pass · 1 skip · 0 fail**，
本批新增断言后应为 **50x pass · 1 skip · 0 fail**，以实测回填）

### 9.3 本批 dogfood 分组（新建脚本 `docs/smoke/scripts/m4b3-personal-a-dogfood.ts`）

> **数据构造（v1.16 已落地）**：`docs/smoke/scripts/m4b3-seed-submissions.ts` —— 幂等 upsert（零 `delete`；只碰 `m4b3-seed-%` 前缀），一行三覆盖：`m4b3-seed-skill@1.0.0`（`PENDING_REVIEW` + task `PENDING` ⇒ **G2/G3**）· `m4b3-seed-skill@0.9.0`（`REJECTED` + `review_comment` ⇒ **G4**）· `m4b3-seed-mcp@2.1.0`（task `WITHDRAWN` ⇒ **G15** 双类型）。运行：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b3-seed-submissions.ts`（前置 = 目标账号已建，见 `m4b2-seed-roles.ts`）；**重跑即复位**（dogfood 撤回过 ⇒ 再跑回 `PENDING`）。

> **令牌探针（v1.17，随 T7 增）**：脚本末尾对**已存在**的两条同名令牌做形态复位（令牌本身需先经**产品路径**创建 —— 脚本不建令牌）：
> `m4b3-seed-stale` → `last_request` 置 **120 天前**（验「最后使用」超 3 个月的 `text-warning`；实测 `oklch(0.666 0.157 58.3)` ✓）·
> `m4b3-seed-legacy` → `start` / `metadata` 置 **null**（验旧令牌 Key 列「—」兜底；实测 ✓）。无同名令牌时命中 0 行，属正常。

| 组 | 覆盖 |
|----|------|
| G1 | 我的提交：空态文案（区分两种） |
| G2 | 我的提交：有数据（构造一条 PENDING）→ 列渲染 + 撤回可用 + 徽章文案 |
| G3 | 撤回链：确认 → 成功 toast → 行状态变「已撤回」+ 撤回按钮变「—」 |
| G4 | 我的提交：`REJECTED` 行露拒绝原因（需先构造驳回记录 → **依赖种子/探针造数**） |
| G5 | 我的令牌：空态 + 创建（明文态出现 `aih_` 前缀 + CopyButton + 警告文案） |
| G6 | 令牌吊销：确认 → 状态变「已吊销」+ 操作变「—」 |
| G7 | 权限面：未登录直访两页 → 归位登录（保 next） |
| G8 | **URL 状态化**（D8）：切换筛选/翻页后 URL 变更；**刷新后筛选与页码保持**；浏览器 back 回上一筛选 |
| G9 | **明文态误关防护**（R12）：明文态按 Esc / 点遮罩 → 弹确认；确认后再关；列表在关闭后才刷新 |
| G10 | **Key 掩码**：新创建令牌的 Key 列 = `aih_` + 8 位 + `*****` + 4 位（前 12 + 后 4；旧数据显「—」） |
| G11 | **编辑**：改名 + 改权限 → 保存后列表回显新值；toast「已保存」 |
| G12 | **删除**：删除弹窗**无红色**（确认按钮为 primary 蓝）；删除后该行**从列表消失**（不再显示） |
| G13 | **Last Used**：早于 3 个月的令牌，其「最后使用」文字为 `warning` 色；其余为默认色 |
| G14 | **查看跳转**：提交页操作列 [👁 查看] → URL 变为 `/reviews/:taskId`；非 PENDING 行只有「查看」图标 |
| G15 | **类型列**：提交页**第 2 列**为「类型」（列序：资产 → 类型 → 状态…），每行渲染 `TypeIcon` SVG + 短文案（技能 / MCP / 专家），值与所提交资产一致 |

### 9.4 出口件 ④（本批验收清单）

沿用 M4b-2 v1.14 口径：**功能项走 CDP 自动断言**（脚本入仓、可重放、口令从 env 读）+ 用户**认可结论**；
⚠️ **审美面不在本批范围**（归 M4b-7）。清单在实现期定稿（预计 **16-20 条断言**）。

### 9.5 造数需求（**写库需用户授权**）

G3/G4/G6 需要可重放的数据构造：「有 PENDING 提交」「有 REJECTED 提交（带原因）」「有令牌」。
候选形态：扩展现有 `docs/smoke/scripts/m4b2-seed-roles.ts`（A2 upsert，幂等）或**新建** `m4b3-*` 造数脚本；
**复用 `m4b2_*` 三账号**（super/mgr/user）以避免账号膨胀。⇒ 具体形态在 plan 阶段定，**执行前须授权**。

---

## 10. 引用文件清单

| 类别 | 文件 |
|------|------|
| 主 design | `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.3 · §2.4 U7 · §4 · §5.1 · §5.2 · §7.1 · §8 R6-c · §10.1 · §12） |
| 规范 | `docs/00-product-direction.md`（§5 · §7）· `docs/05-identity-access.md`（§5 会话与凭证 · §6.4 scope 码表）· `docs/08-data-model.md`（§6 审核） |
| 视觉 SSOT | `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` §4.4（引用不复制） |
| 前序批件 | `docs/designs/2026-09-16-m4b2-auth-shell-design.md` · `docs/plans/M4b-2-auth-shell.md` |
| 服务端（消费） | `apps/server/src/http/reviews.ts:69,146` · `apps/server/src/http/tokens.ts:48,86,94` · `apps/server/src/review/query.ts:52` · `apps/server/src/auth/api-keys.ts:144` · `apps/server/src/auth/token-scopes.ts:13` |
| 服务端（改动） | `apps/server/src/review/query.ts` |
| 前端（新建） | `apps/web/src/api/reviews.ts` · `apps/web/src/api/tokens.ts` · `apps/web/src/pages/Submissions.tsx` · `apps/web/src/pages/Tokens.tsx` |
| 前端（改造） | `apps/web/src/main.tsx` · `apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts` |
| 复用件 | `components/console/{DataTable,StatusPill,ConfirmDialog,FilterBar,PageHeader}.tsx` · `components/ui/{EmptyState,ErrorState,SkeletonLoader,Pagination,CopyButton,Toaster}.tsx` |
| 冒烟 | `docs/smoke/scripts/m4a-dogfood.ts`（门户零回归）· `m4b2-auth-dogfood.ts`（M4b-2 基线）· `m4b3-personal-a-dogfood.ts`（本批新建） |

---

## 11. 8 维自检（2026-09-16 · **v1.2 定评** · 均分 **9.56 ≥9 ⇒ 达门**）

> 门禁 = 8 维自检 ≥9（标准 4 维 + 深度 4 维）；未达门先修后重评（先例：主 design v1.6 自检 8.94 → 9.50）。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.7** | 13 段骨架齐（对齐 M4b-2 批 design）· 决策齐（D1-D6b + **§2.1b grilling 14 项**） · 件/路由/服务端/i18n/验证口径齐；**线框无缺口** —— 主 design §12（10 张 / 11 视图）已含本批两页且归属标注 `→ M4b-3`（引用不复制） |
| 标准 2 准确性 | **9.8** | 现状核对 **12 条真码实测**（file:line，含 v1.1 新增 7b/7c）；键数**实测**：`submissions` 24 / `tokens` 33 / 净增 57（脚本核对一致）；契约来自 6 个真码文件 + 官方包（`@better-auth/api-key` dist 类型定义）；扣 0.2 = v1.0 曾有 2 处事实误述（`name`/`lastRequest` 列），经 grilling 自查订正 —— **留痕不抹** |
| 标准 3 一致性 | **9.5** | 与主 design §2.4 U7 / §4 / §7.1 / §8 R6-c 逐条对齐；命名合规（`YYYY-MM-DD-m4b3-<主题>-design.md`，功能自描述）；结构与 M4b-2 批 design 同构 |
| 标准 4 可用性 | **9.8** | 实现者**照抄零二次决策**：列集合（含列合并后的 7 列）/ 交互流 / 空态 / 控件选型（`ToggleGroup`）/ 键名（33+24）/ 改动点 / 测试面全部定死；唯一「待实测」= 门禁 pass 数（已标以实测回填，不写预估值） |
| 深度 1 追溯性 | **10** | 现状表 10 条带 `file:line`；契约引用带 § 号；决策带日期与「按推荐来」来源；服务端改动带「为何这么小」的实证链（列自迁移 0000 起存在） |
| 深度 2 反证 | **9.0** | 含向后兼容论证（加性/作用面/详情继承）· 否决留痕 2 处（不新增 `name` 列 —— 理由 = 安全必然 + 避免迁移；不拆分 `LIST_SELECT` 为「仅 mine」—— 理由 = 队列受益）；扣分点 = 未展开「为何不新建端点」 |
| 深度 3 边界/风险 | **9.5** | Out 清单显式（5 类）· 造数**写库须授权**前置声明 · 撤回并发失败分支 · 明文丢失风险 + 误关防护（D7）· 空态两种文案区分 |
| 深度 4 维护性 | **9.5** | 引用不复制（主 design / 规范 / §4.4 全走指针）· i18n 键表可直接落码 · 修订记录 + 自检段齐 · 服务端改动面可被 `git diff --stat` 验证 |

**v1.5 重评 = (9.9 + 9.9 + 9.8 + 9.9 + 10 + 9.6 + 9.7 + 9.7) / 8 = 9.81** ✅

**v1.10 复评（2026-09-16，T2 实现期官方源码复核订正后）= 9.79** ✅ —— 完整性 **9.7** · 准确性 **9.8**
（3 处前版误述由本轮订正并留痕：配置行数 1 → **3 行** · 名称上限 64 → **32** · `metadata.tail` 单次写入 → **两次调用**）·
一致性 **9.7**（与批 plan v0.3 逐项 18/18）· 可用性 **9.8** · 追溯性 **10**（新增声明全部带官方源码 `file:line`）·
反证 **9.7**（+「为何必须两次调用」+「为何钉定官方默认」+ 失败语义）· 边界 **9.8**（+空名 400 / 上限 400 / 追加写失败）·
维护性 **9.8**（官方行号可复查 ⇒ 上游升级可再验）。
⚠️ 表内分值为 v1.2 / v1.5 两轮留档（定稿时为 9.81，v1.9 曾因口径过窄撤回并复评为 9.57）——**最新以本段与修订记录为准**。
换靶角度（本轮新增）：**官方包源码逐条复核**（`METADATA_DISABLED` / `maximumNameLength` / `minimumNameLength`）·
**落库形态实测**（单层 JSON）· **跨文档契约对照**（design ↔ plan 18/18）。

**v1.11 复评（2026-09-16，名称必填 + 令牌私有 订正后）= 9.86** ✅ —— 完整性 **9.8** · 准确性 **9.9**（+2 处口径收回：
`name` 可选 → **必填** · DELETE 超管分支 → **仅本人**，均已同步代码 / 测试 / 主 design）· 一致性 **10**（与批 plan v0.4 逐项 20/20）·
可用性 **9.8** · 追溯性 **10** · 反证 **9.8**（+「为何不用官方 `requireName`」+「为何收回超管口子——规范层原文本就是本人」）·
边界 **9.8**（+ 缺名 400 / 超管 404 / 旧令牌「—」）· 维护性 **9.8**。
（v1.5：**原型驱动**定案 —— 令牌页全部 UI 决策经**可点原型多轮迭代 + 用户逐条看效果拍板**，落地零歧义；
完整性 +原型评审记录（§2.1d）· 一致性 +语义色 token 归属明确 · 边界 +「旧令牌 Key 兜底」「明文片段安全权衡」显式登记）（v1.4：UI 五条逐条评审 + findings 23 条全处置 ⇒ 完整性/准确性/一致性/可用性/反证/边界/维护 全面提升；**反证 9.0→9.5**：新增 4 处自产缺陷订正留痕）

**v1.14 复评（2026-09-16，REJECTED 渐变 token 命名/落层订正后）= 9.89** ✅ —— 完整性 **9.9**（件表补正：改造件 9 → **11**，消除 v1.9 同类「件表少列」缺陷）· 准确性 **9.9**（token 名 / 色值 / 落层 / variant 名与真码逐条实测：`aih-theme.css` C 层 + `badge.tsx`；构建产物实证 `.bg-\[image\:var\(--gradient-rejected\)\]{background-image:var(--gradient-rejected)}` 已发出）· 一致性 **10**（命名随 `--gradient-*` 族；与 M4a design §4.4 ②bis 白名单同步；与 `badge` 既有 `success`/`warning` 同构造）· 可用性 **9.9**（token 名 + variant 名 + 消费类串全定死，实现照抄）· 追溯性 **10**（授权出处 = M4b-1 §3.5「官方第 ④ 条路径」；用户拍板 **A** 留痕）· 反证 **9.9**（两选项对照 + 否决 B 的理由：破坏 A 层「实色 + 成对 `@theme`」不变式）· 边界 **9.8**（入档两条**静默失效**坑：渐变不可注册 `--color-*` · 渐变底吃掉 `bg-*/90` hover ⇒ 改 `brightness`）· 维护性 **9.9**（白名单条数 + 审计 grep 写入）。
换靶角度（本轮新增）：**官方件定制路径授权回查**（改官方源码前先 grep 该路径是否已被上游批 design 授权 ⇒ M4b-1 §3.5 先例）· **样式层「真值注册表」同步**（M4a §4.4 白名单是跨批真值，留假条数会在收尾审计暴露）· **编译产物 + 真浏览器计算值双验**（不靠 typecheck 推断 CSS 生效）。

**v1.15 复评（2026-09-16，T6 落地 + 键缺口补登后）= 9.90** ✅ —— 完整性 **9.9**（键表补 2 键；§4.4.1 补落地注记 ⇒ 「空态落点 / 分页条件 / 未证项」不再靠实现期默契）· 准确性 **9.9**（键数 26 / 41 / +6 / +1 = **74** 与 i18n 真码逐键实测一致；T6 实证结论逐条回填，含 1 处**自产缺陷**〔分页条件〕与 1 处**数据缺位**的明确标注）· 一致性 **10**（与 plan v0.7 逐项对照；与 §4.4.1 组件树、§6 键表三向一致）· 可用性 **9.9** · 追溯性 **10**（每条实证带命令或浏览器读数；缺口键带「为何 design 漏」的成因）· 反证 **9.9**（+「为何用 type 别名而非改共享件」否决留痕）· 边界 **9.8**（新登记 1 条**既有**缺陷：M4a dogfood 分页断言假 PASS）· 维护性 **9.9**（键数真值单点 §6 + 各处指针已对齐）。
> ⚠️ **量级说明（防同分重报观感）**：v1.14 的 9.89 来自 **token 命名/落层订正**；本轮 9.90 来自 **键缺口补登 + 落地实证入档**——构成不同：本轮 完整性/准确性 的增量由「§6 键表 2 键 + §4.4.1 注记」贡献，而 边界 因**新发现既有缺陷**（假 PASS 断言）留在 9.8 不升。
> 换靶角度（本轮新增）：**契约→实现的键覆盖回读**（design 写死的交互控件是否都有键可消费 ⇒ 抓出 2 键缺口）· **条件类断言的实现回读**（「仅 total > limit 渲染」这类条件句最易被实现漏掉）· **既有 dogfood 断言有效性抽检**（选择器与实际 DOM 属性是否真能匹配 ⇒ 抓出假 PASS）。

**v1.16 复评（2026-09-16，造数脚本落地 + 未证项关闭后）= 9.94** ✅ —— 完整性 **9.9**（§9.3 补数据构造路径与 G 项映射；§4.4.1 注记第 4 条由「未证」改写为「已关闭」）· 准确性 **10**（T6 全部断言均**实证**：真实账号 + 真实后端 + 服务端落库复核；此前标注的「数据缺位未证」已清零）· 一致性 **10** · 可用性 **9.9** · 追溯性 **10**（每条结论带命令/浏览器读数/DB 复核）· 反证 **9.9** · 边界 **9.9**（造数幂等与复位实测；剩余未覆盖面仅 T7/T8 的令牌侧）· 维护性 **9.9**。
> 换靶角度（本轮新增）：**「未证项」闭环**（上一轮自己标注的缺口逐条回访，禁让它悄悄烂掉）· **造数脚本的幂等性实测**（重跑必须可复现同一前置态）· **服务端落库反查**（UI 结果与 DB 终态双向核对，防「前端看着对」）。

**v1.17 复评（2026-09-16，T7 落地 + 键表补登 7 键后）= 9.91** ✅ —— 完整性 **9.9**（键表 +7；§4.2 补落地注记；§9.3 补令牌探针）· 准确性 **9.9**（键数 48 实测；明文 47 位 / 只显有效 12-13 / 探针形态逐条实测）· 一致性 **10**（与 plan v0.9 对照；§4.2 ↔ §4.4.1 ↔ §6.2 三向一致）· 可用性 **9.9** · 追溯性 **10** · 反证 **9.9** · 边界 **9.8**（**新登记 1 条未证项**：明文态遮罩关闭路径 —— 工具通道受限，转 T10 真指针复验）· 维护性 **9.9**（键数真值单点仍是 §6）。
> 换靶角度（本轮新增）：**键表 ↔ UI 规格的字面回读**（「每项两行」要求说明小字 ⇒ 抓出 5 键缺口；「toast」要求 ⇒ 抓出 2 键缺口）· **单一入口的实现回读**（四条关闭路径是否真共用一个函数，而非「按钮路径各写一套」）· **响应形态实测**（明文长度/掩码位数与文档声明逐项对账）。

**v1.18 复评（2026-09-16，T8 落地：`errors` 补 7 码 + 基线数字订正后）= 9.92** ✅ —— 完整性 **9.9** · 准确性 **10**（基线 21 实测订正；键数 26/48/28/8 逐组实测；净增 82 三向一致：§6.3 ↔ §3.2 ↔ 真码）· 一致性 **10** · 可用性 **9.9** · 追溯性 **10** · 反证 **9.9**（幂等吊销的实测反证推翻我原先「陈旧态 ⇒ 404」的假设）· 边界 **9.9**（可达性 + 防御性映射写明）· 维护性 **9.9**。
> 换靶角度（本轮新增）：**「声明数字 ↔ 逐行实测」对账**（抓出 errors 基线 22 vs 21）· **「键可达性」审计**（键存在 ≠ 路径可达——幂等写语义会消灭路径）。

---

## 12. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v1.18** | 2026-09-16 | sunxuewen-rush | **T8 落地：`errors` 补 7 码 + 基线数字订正**（与代码 / 批 plan v0.10 同批）—— ① `errors` **21 → 28 键**（6 个 `review.*` + **+1 `token.not_found`**）⇒ 本批净增 81 → **82** ② **订正**原「22 → 28」的基线错（实测 21）③ 登记 `token.not_found` **UI 不可达**（吊销幂等 ⇒ 204）⇒ 防御性映射，验证 = 服务端探针 + 键对称 + `review.not_pending` 端到端证成 ④ §11 复评 **9.92** |
| **v1.17** | 2026-09-16 | sunxuewen-rush | **T7 落地：tokens 键表补登 7 键 + §4.2 实证注记**（与代码 / 批 plan v0.9 同批）—— ① `tokens` 41 → **48 键**（+5 scope 说明 = Q13 两行排版的说明小字缺键 · +`edit.success`/`delete.success` = 断言 ⑧ 与删除流要求的 toast 缺键）⇒ 净增 74 → **81** ② §4.2 补 T7 落地注记（关闭单入口 / 复制标记包裹范围 / 明文 47 位 / 只显有效 12-13 / **遮罩路径未证登记**）③ §9.3 补令牌探针（stale 120 天 · legacy `start`+`metadata` null）④ §11 复评 **9.91** ⑤ T9 处置 = 并入 T10（批 plan v0.9） |
| **v1.16** | 2026-09-16 | sunxuewen-rush | **造数脚本 + T6 未证项关闭**（授权：用户 2026-09-16「授权」写 dev 库）—— ① 新增 `docs/smoke/scripts/m4b3-seed-submissions.ts`（幂等 upsert / 零 delete / 前缀 `m4b3-seed-%`；重跑复位）② 真实数据实测：撤回链（204 → toast → 行 `已撤回`、按钮消失）+ 落库复核（task `WITHDRAWN` · version 退 `UPLOADED`）+ 双类型列渲染 + 拒绝原因 `title` ③ §4.4.1 注记第 4 条改写为「已关闭」· §9.3 补数据构造说明 ④ §11 复评 **9.94** |
| **v1.15** | 2026-09-16 | sunxuewen-rush | **T6 落地：键缺口补登 + §4.4.1 实证注记**（与代码 / 批 plan v0.7 同批）—— ① 键表 `submissions` 25 → **26**（+`action.view`）· `common` **+1**（`cancel`）⇒ 净增 **72 → 74**（落点 §3.2#2 · §6.1 标题+表 · §6.3）② §4.4.1 新增 **T6 落地注记**（空态两文案落点 / `Pagination` 条件与**自产缺陷**同轮修 / 真浏览器 8 项实证 / 未证项标注）③ §3.1#1 补 `MyReviewItem` 用 type 别名的原因 · §3.1#3 补数据 hook 与撤回刷新口径 · §3.2#1 补路由切换时点（submissions 随 T6）④ §11 复评 **9.90** ⑤ **登记既有缺陷**：`m4a-dogfood.ts`「资产数 < limit ⇒ 无分页控件」为**假 PASS**（选择器 `aria-label*="分页"` 永不匹配官方 `aria-label="pagination"`）⇒ 归 M4b-7/T10 复核 |
| **v1.14** | 2026-09-16 | sunxuewen-rush | **T5 落地：REJECTED 渐变 token 命名/落层订正（用户 2026-09-16 拍板 A）**—— ① token `--rejected` → **`--gradient-rejected`**、落 **C 品牌渐变层**（白名单 3 → 4；不注册 `@theme --color-*`）② 消费 = 官方 `badge.tsx` 新增 **`rejected` variant**（第 ④ 条路径，M4b-1 §3.5 授权先例）⇒ `StatusPill` 零 className ③ **件表补正**：T5 Files 1 → **3 件**，§3.2 改造件 **9 → 11**（+`aih-theme.css` + `badge.tsx`）④ 落点 5 处（D12 · §3.2#7 · §3.2#10/#11 新增两行 · §4.4 表格 · §4.4 色彩体系）⑤ 同步 **M4a design §4.4 ②bis** 渐变白名单⑥ §11 复评 **9.89** ⑦ 与批 plan **v0.6**、M4a design **v0.26** 同批 |
| **v1.13** | 2026-09-16 | sunxuewen-rush | **T4 落地注记（实现期实证）**—— ① **`apiPatch` 补登记**：§3.2#8 原仅记 `apiDelete`，而 T7「编辑令牌」走 `PATCH /api/tokens/:id`（T3 已交付）⇒ 无 `apiPatch` 则页面发不出请求（用户 2026-09-16 点头补）② **`doFetch` 空体守卫**：204 / 空体 ⇒ `undefined`（原先 `res.json()` 在 204 上抛 `SyntaxError`，非 `ApiError` ⇒ 与错误面形态不一致；`deleteToken` 依赖此守卫）③ §3.1#2 的 tokens.ts 签名同步 `{ name }` **必填**（v1.11 口径）④ web 侧**无测试框架**（脚本仅 dev/build/typecheck/lint）⇒ T4 验证 = typecheck + lint + format:check，真实行为在 **T6/T7 浏览器 dogfood** 覆盖。**无口径变更** ⇒ 8 维评分不变（**9.86**） |
| **v1.12** | 2026-09-16 | sunxuewen-rush | **T3 落地注记（实现期实证）**—— §5.2 新增「T3 编辑的落库形态」条：① 官方 `NO_VALUES_TO_UPDATE`（`:1526`）因 `name` 必填**不再可达** ② **全量回写 = `permissions` 列文本 `"null"`**（非 SQL NULL；读面归一 ⇒ `scope === ''`） ③ 审计 detail = `{ fields: [...] }`（零明文） ④ 200 响应复用新公共读面 `readApiKeyRow`（`API_KEY_SELECT` + `toApiKeyRow` 单源投影）。**无口径变更** ⇒ 8 维评分不变（**9.86**；本轮为纯实现注记，非重评） |
| **v1.11** | 2026-09-16 | sunxuewen-rush | **名称必填 + 令牌彻底私有**（用户 2026-09-16 逐条对齐拍板 ①/③；与代码 / 测试 / 主 design / 批 plan 同批提交）—— ① **`name` 必填**（新建 + 编辑；`trim().min(1).max(32)`；缺名 / 空串 / 纯空白 ⇒ 400；前端提交按钮禁用 + 服务端 400 双保险；旧令牌列表仍「—」）；**不用官方 `requireName` 开关**（该开关会作用于内部签发通道 ⇒ 误伤）② **令牌彻底私有**：`DELETE /api/tokens/:id` 的 **SUPER_ADMIN 分支收回** ⇒ **仅本人**（他人含超管 ⇒ 404）—— 依据 = 规范层 `05 §5`「Token 签发 / 吊销 **本人**」（**代码此前超出规范**，本轮收回）+ 兄弟仓 new-api 同款私有口径（`model/token.go:364-375` 按 userId 过滤；超管无令牌管理页、无全站令牌接口）；如需超管治理 ⇒ 登记 M4b-6/M4c 候选 ③ 编辑权限语义 =「全不勾 = 全量」并在弹窗给同一提示；权限改动**保存即生效、界面不加提示**（用户定）④ 落点：§2.1 D6 · §2.1b Q9 · §4.2 三流 · §5.1 · §5.2 ③ · §5.3 ⑤ · §6.2 两键文案 · §7 两行（POST / DELETE）· §11 复评 **9.86**；同步主 design §7.1 + 批 plan v0.4 |
| **v1.10** | 2026-09-16 | sunxuewen-rush | **T2 实现期官方源码复核订正**（用户 2026-09-16 拍板：「官方默认 32，我们就改成 32」；文档与 T2 代码同批提交）—— ① **名称上限 ≤64 → ≤32**（7 处落点：D6 · Q11 · §3.2#6 · §4.2 创建流/编辑流 · §5.1 · §7），依据 = 官方 `maximumNameLength` **默认 32**（`@better-auth/api-key` `dist/index.mjs:2328`）——原 ≤64 会被官方 400 拒 ② **`enableMetadata: true` 新增**（★ 官方 `enableMetadata` **默认 false**（`:2330`）⇒ 不开启则签发传 metadata **抛** `METADATA_DISABLED`（`:767-770`）、更新**静默忽略**（`:1511`）；`better-auth.ts` 配置 **1 行 → 3 行**，第 3 行为显式钉定 `maximumNameLength: 32` 防上游漂移）③ **`metadata.tail` 写入 = 两次官方调用**（明文由官方内部 keyGenerator 生成（`:802-808`）⇒ create body 无法预知 tail，改为 create 后补 `updateApiKey`；失败语义登记 = 500 + 行无 tail，前端兜底「—」）④ **空 / 纯空白名称 ⇒ 省略 `name` 字段**（官方 `minimumNameLength` 默认 1 会拒空串；T3 编辑流同口径 = 保持原名，官方无置空语义）⑤ **`parseTail` 双串化容错**（对齐官方 `parseDoubleStringifiedMetadata` `:25-29`）+ **落库形态实测 = 单层 JSON** `{"tail":"…"}`（T2 测试断言兼作契约哨兵）⑥ §5.1 行数**实测回填**（产品代码 4 件 +101/−9，注释 42 行；测试件 +176）⑦ §5.2 新增「官方侧 3 条实证约束」段 · §5.3 测试面 +3 断言 · §11 复评 **9.79**（9.57 → +0.22）；同步批 plan **v0.3**（T2 步骤 3/4/5 + 断言 ⑦⑧⑨ · T3 步骤与断言补空名口径） |
| **v1.9** | 2026-09-16 | sunxuewen-rush | **提交前打分订正（8 项）**——`self-review-scoring` 8 维实测复评 **8.57 < 9 未达门** ⇒ **撤回 v1.8 的 9.81**（自检口径过窄，漏扫 §3）① 修 **3 处直接矛盾**：§3.2#7 `StatusPill` `REJECTED` destructive → **实色蓝紫渐变 + 白字** · §3.1#3 `FilterBar` → **官方 Select** · §3.2#2 i18n 24/28 → **25/41** ② 修 5 项缺漏：§3.1#2 补 `updateToken`+去 `expiresInDays` · §3.1#4 术语「吊销」→「删除」+补 6 列/编辑/只显有效 · §3.2#4/#5 补 `assetType` · §3.2#6 补 `start`/`metadata.tail`/`PATCH` · §3.1#1 命名与 plan 统一 · §3.2#7 渐变须走 token（禁 className） ⇒ 复评 **9.57 ≥9** | 
| **v1.8（定稿）** | 2026-09-16 | sunxuewen-rush | **转定稿**：用户 2026-09-16 批准（「1原型删除 2批准」）① 原型物料**已删除**（`pages/__proto/M4b3Preview.tsx` + `main.tsx` 的 dev-only 路由 ⇒ 工作区零残留）② 8 维自检 **9.81** ≥9 ✅ ③ 详情页边界入档（用户定 **A**：归 M4b-5，本批只做入口）④ 主 design §2.3 登记表 + §7.1 契约表 + §5.1 职责矩阵 + `docs/00` §5 同步回写 | 
| **v1.7** | 2026-09-16 | sunxuewen-rush | **我的提交新增「类型」列**（用户：「列再加 类型」）① 列集合 5 → **6**（类型列插在「资产」之后 —— 用户定「类型和名称位置换一下」）② 数据面：`LIST_SELECT` + `assetType: asset.type`（**asset 表本就在 join 里** ⇒ 服务端只 +1 行，零 join/迁移改动）；`ReviewListItem` 同步 +1 字段 ③ i18n `submissions` 组 21 → **25 键**（`col.type` + `type.skill`/`type.mcp`/`type.agent`），净增 68 → **72** ④ 呈现 = M4a 既有件 `TypeIcon`（Clean Room 自绘）+ 短文案 ⑤ dogfood +G15；原型实测：表头 `["资产","类型","状态","提交时间","拒绝原因","操作"]` · 类型列（第 2 列）`["技能","技能","技能","MCP"]` + 4 个 SVG ✓ | 
| **v1.6** | 2026-09-16 | sunxuewen-rush | **行点击 → 操作列「查看」图标**（用户：「不是这个意思，加一个查看总行了吧？」）① **推翻 U7 的「整行可点」** ⇒ 改为操作列 **[👁 查看][↩ 撤回] 图标化**（D3 改写）② 收益：**共享件零改动**（不需要 `DataTable.onRowClick` ⇒ 改造件维持 9）· a11y 天然正确 · 与令牌页操作列形态统一 ③ 同步 §4.1 列集合/撤回流/查看入口 · §4.4.1 组件树 · §2.1c 评审记录 · dogfood +G14 ④ 原型实测：`[查看, 撤回]` / `[查看]` 逐行正确，点「查看」URL → `/reviews/1024` ✓ ⑤ 「**令牌 UI 已确认 OK**」（用户 2026-09-16）| 
| **v1.5** | 2026-09-16 | sunxuewen-rush | **令牌页原型评审结论全部落地**（用户：「全部都是 UI 的工作，直接聊天交流我无法准确对齐」⇒ 先做可点原型）'① **新增 §2.1d 原型评审记录**（9 轮迭代 + 8 处 AI 自查修复 + 3 条事实查证）② **§4.2 整段重写**：列 7 → **6**（名称 · Key · 权限范围 · '创建时间 · 最后使用 · 操作）· **只显有效令牌**（前端过滤）· Key = `aih_9fK2mQ4p*****3ba3`（`start` 前 12 + `metadata.tail` 后 4）'· 生效**无有效期列/无状态列** · 操作**图标化**（编辑/删除**同色**）· **新增编辑流**（改名 + 改权限）· 删除确认**去红**'· Last Used 超 3 个月 `warning` ③ **新增 D11（令牌页一揽子）· D12（语义色 `--rejected` = 蓝→紫渐变）**；清理 §2.1 **重复编号**'（旧 D7 删、旧 D8/D9/D10 → D14/D15/D16）④ **「已驳回」= 实色蓝→紫渐变 + 白字**（对标 21-skillhub `--brand-gradient`，与「已通过」同构；'「已撤回」保持灰 —— 用户定）⑤ **服务端改动面 3 行 → 约 44 行 / 4 文件**：+ `PATCH /api/tokens/:id` · `updateApiKey` 窄化扩 '`name`+`permissions` · `startingCharactersConfig.charactersLength: 12` · 创建写 `metadata.tail`（**仍零迁移**）'⑥ i18n：`tokens` 组 32 → **41 键**、净增 59 → **68**（键表逐行实测）⑦ dogfood +G10-G13 ⑧ §11 重评 **9.81** |
| **v1.4** | 2026-09-16 | sunxuewen-rush | **UI 逐条评审（①-⑤）落地 · frontier 已空**（方法 = `ui-design-review-walkthrough`，清单 = 页面×壳×跨面，四段式，逐条汇报逐条拍板）① **新增 §2.1c 评审记录段**（5 条 × 拍板要点 × findings R1-R23）② **新增 D8（URL 状态化约定）· D9（错误呈现分工）· D10（标题键复用）** ③ **4 处自产缺陷订正**：删 `pagination.prev/next`（官方件硬编码英文，无消费点）· 删两组 `title` 键（与侧栏键语义重复）· **新增改造件 `apiDelete`**（`client.ts` 原只有 GET/POST，吊销需 DELETE）· 登记「主 design §7.1 契约表 3 行待同步」④ **补 6 个 `review.*` 码**（新增 §6.3；`errors` 22 → 28）⑤ **明文态防护升级**（§4.2）：四路径统一拦 `onOpenChange` · 隐藏 ✕ · 复制标记走页内 `onClickCapture`（零改共享件）· 关闭后才刷新列表 ⑥ 键数：`submissions` 24 → **21** · `tokens` 33 → **32** · 净增 57 → **59**（= 53 新组 + 6 errors）· 改造件 7 → **8** ⑦ dogfood 补 G8/G9 · §11 重评 **9.75** |
| **v1.3** | 2026-09-16 | sunxuewen-rush | **补强 §4.4「UI 结构与组件树」（用户指令「补」）**：新增 5 子节 —— 4.4.1 组件树（两页，含件嵌套与 props）· 4.4.2 线框↔批 design 差异声明（4 行，**以批 design 为准**）· 4.4.3 表格规格（密度 40 = 官方默认零覆盖 · 操作列自动右对齐 · 截断与宽度策略）· 4.4.4 交互态（hover/点击/loading/disabled/明文误关防护/`CopyButton.clearOnUnmount`）· 4.4.5 状态徽章与空值约定（5 类空值）。**过程中新发现 3 处设计点**（显著标注）：① `StatusPill` 只支持 asset/version ⇒ 需**加性扩展 `kind="task"`** ② `FilterBar` 强制带搜索框 ⇒ **不用**，改官方 `Select` ③ 令牌状态用官方 `Badge` 不扩 StatusPill。改造件 6 → **7**（+`StatusPill.tsx`）· §2.1 补 D7b/D7c 两行 · §11 完整性 9.6 → **9.7**、可用性 9.6 → **9.8** ⇒ 均分 **9.60** | 
| **v1.2** | 2026-09-16 | sunxuewen-rush | **grilling 轮 2 落地（Q9-Q14）**：① 令牌名称 **Q9 可选**（留空允许提交）· **Q10 不要求唯一** · **Q11 不限字符集**（trim 判空，≤64）② **Q12 名称与 id 合并为一列**（列表 8 → **7 列**）③ **Q13** scope 选项**两行排版**（码名 mono + 中文说明）④ **Q14** 不做预设快捷 · 新增 **D6b 不做项**行 ⑤ **新增 §2.1b「grilling 决策记录」段**（两轮 14 项 + 2 处 AI 自产事实订正留痕 + frontier 已空声明）⑥ §11 完整性 9.5 → **9.6**、可用性 9.5 → **9.6** ⇒ 均分 **9.56** ⑦ 键数**不变**（Q 项不加键；仍 24 + 33 = 57）| 
| **v1.1** | 2026-09-16 | sunxuewen-rush | **grilling 轮 1 落地**：① **订正 2 处事实错误**（§1.2 新增 7b/7c 行）——`apikey.name` 与 `lastRequest` **列存在、读面未取**（v1.0 误写「无 name 列」）；官方 `createApiKey` 支持可选 `name` ② **落 Q1-Q8 决策**：Q1=**令牌命名全链支持**（官方原生通道）· Q2=**露最后使用时间** · Q3=scope 控件用 **`ToggleGroup type="multiple"`**（官方 `checkbox` 未落仓，不为此新增件）· Q4=资产列**链 `/assets/:slug`**（新标签页）· Q5=刷新走 **`invalidateCache()` + `retryTick++`** · Q6=**保留 `error.load`** · Q7=有效期**前后端同限 1..3650**· Q8=隐藏已吊销**不做** ③ 服务端改动面 3 行 → **约 13 行**（仍零迁移）· 改造件 5 → **6** · `tokens` 组 28 → **33 键**、净增 52 → **57**（键表逐行实测）④ §11 准确性重评 9.8（含扣分留痕）| 
| v1.0 | 2026-09-16 | sunxuewen-rush | 初稿：现状核对 10 条（真码实测：两页占位 / 前端无封装 / read 面已存在 / ★`review_comment` 列已存在⇒纯读面加性 / 可复用件齐 / i18n 现状）+ 10 项设计决策（用户「按推荐来」）+ 页面规格（两页逐列/逐流）+ 服务端改动规格（R6-c ≈3 行 + 向后兼容论证 + 测试面）+ i18n 规格（新建 `submissions` 24 键 / `tokens` 28 键）+ 验证口径（门户零回归 · 门禁顺序 · dogfood 七组 · 出口件④口径）+ 造数需求（写库须授权）|
