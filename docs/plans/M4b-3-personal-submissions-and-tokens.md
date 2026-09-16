# M4b-3 个人面 A：我的提交与我的令牌 —— 批计划

> Updated: 2026-09-16（v0.8：**T10 件表补造数脚本 + T6 未证项关闭**）—— ① **T10 Files 补** `docs/smoke/scripts/m4b3-seed-submissions.ts`（新建 · 可重放造数：幂等 upsert / 零 delete / 前缀 `m4b3-seed-%`；重跑复位，供 G2/G3/G4/G15 复用）② T10 步骤补「**造数**」一条（放在 dogfood 前）③ T6 断言 ③（撤回成功链）**已用真实账号 + 真实后端 + 服务端落库复核关闭**（撤回后 task `WITHDRAWN` · version 退 `UPLOADED`）；**v0.7：**T6 落地 —— 件表补正（+i18n 两件 + main.tsx 路由）+ 键缺口补登**—— ① **T6 Files 1 件 → 4 件**（+`i18n/zh.ts` + `i18n/en.ts` + `main.tsx`）：断言 ②-⑦ 全为浏览器可达类，页面必须先有键可渲染、有路由可直达 ⇒ `submissions` 组键随 T6 落地（T8 相应收窄）、`/dashboard/submissions` 路由随 T6 切换（T9 收窄）② **键缺口 2 处**：`action.view`（查看图标无键）· `common.cancel`（`ConfirmDialog.cancelLabel` 必填）⇒ `submissions` 25 → **26**、`common` **+1**、净增 72 → **74**③ T6 断言 8 → **10**（+分页条件 · +键数）④ 同轮修 1 处**自产缺陷**（`Pagination` 未按 design「仅 `total > limit`」渲染）⑤ 与批 design **v1.15** 同源；**v0.6：**T5 落地 —— 件表补正 + token/variant 落点定死**（用户 2026-09-16 拍板 **A**：渐变 token 落 **C 品牌渐变层**、名 `--gradient-rejected`）—— ① **T5 Files 1 件 → 3 件**（+`aih-theme.css` + `badge.tsx`）：design §3.2#7 的硬约束「渐变须落 token/variant，**禁 className 覆盖外观**」使另两件成为必需（改 1 件就只能把渐变写进消费点 className = 违规）② T5 步骤 2 → **4 条**（+token 落 C 层白名单 3 → 4 · +`badge.tsx` 加 `rejected` variant = 官方第 ④ 条路径，M4b-1 §3.5 授权先例）③ T5 断言 +2（④ 落层可验 · ⑤ **真渲染实测**：编译产物 CSS 规则 + 浏览器计算值，不靠 typecheck 推断）④ 与批 design **v1.14** 同源；**v0.4：**名称必填 + 令牌私有**（用户 2026-09-16 逐条对齐拍板）—— ① T2 路由层 `issueBodySchema` 的 `name` 改 **必填** `trim().min(1).max(32)`（缺 / 空 / 纯空白 ⇒ 400）；T2 断言 ⑦ 由「201 且 null」改 **400** ② T3 的 `name` 同步 **必填**（清空 / 缺失 ⇒ 400，「不发 name 保持原名」作废）③ T7 补「名称必填：空 / 纯空白 ⇒ 提交禁用」④ **新增**：`DELETE /api/tokens/:id` 超管分支收回（**仅本人**）—— 与批 design **v1.11** 同源；v0.3：**T2 实现期官方源码复核订正**（用户 2026-09-16 拍板）—— ① T2 步骤 4 由「1 行配置」改为 **3 行**（`charactersLength: 12` + `enableMetadata: true` + 钉定 `maximumNameLength: 32`）② T2 步骤 3 补「名称 `trim` 后为空 ⇒ 省略字段」（官方 `minimumNameLength` 默认 1）
> ③ T2 步骤 5（新）「签发写 `metadata.tail` = create 后补 `updateApiKey`」，**两次官方调用**（明文由官方内部生成，无法预知）④ T2 断言补「空 / 纯空白名称 ⇒ 201 且 name null」「落库形态 = 单层 JSON 文本」⑤ T3 步骤补「名称 `trim ≤32`；清空 ⇒ 不发 `name`（保持原名）」+ 断言补空名回归；v0.2：**补自检打分段（8 维 9.61）**）；v0.1：**立项**——依据批 design `2026-09-16-m4b3-submissions-and-tokens-design.md` **定稿**
> （8 维自检 **9.81** ≥9 · 用户 2026-09-16 批准）与主 design `2026-09-10-m4b-admin-console-and-auth-design.md` **v1.33**；本批 = M4b 拆批第 3 批「个人面 A」）
> Status: **待执行**（T1-T10 ⬜ · 批 design 已定稿 · 出口五件见 §4 · **自检 8 维 9.61**（最新 **v0.8 复评 9.83**）见 §9）
> 上游：批 design（定稿，版本以其版本头为准）· 主 design §2.3 拆批表与批件登记表 · `docs/00` §5
> 依赖顺序：**M4b-1 / M4b-2 已完成** ⇒ 本批开工条件已满足

## 1. 目标与非目标

**目标**（两页从占位页变真页 · 首次含服务端加性改动）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | **我的提交** `/dashboard/submissions` | 6 列（资产 · **类型** · 状态 · 提交时间 · 拒绝原因 · 操作）；操作列 **[👁 查看][↩ 撤回]** 图标化；状态筛选（含 `WITHDRAWN`）；URL 状态化；三态 + 两种空态；分页 |
| 2 | **我的令牌** `/dashboard/tokens` | 6 列（名称 · **Key 掩码** · 权限范围 · 创建时间 · 最后使用 · 操作）；**[✎ 编辑][🗑 删除]** 同色图标；只显有效令牌；**创建** Dialog 两态（明文一次性 + 误关防护）；编辑（改名 + 改权限）；删除（去红二次确认） |
| 3 | **服务端加性改动** | `reviewComment` + `assetType`（读面）· `name` / `start` / `tail` / `lastRequest`（读面）· **新增 `PATCH /api/tokens/:id`** · `charactersLength: 12` · 签发写 `metadata.tail`（**零迁移 · 零 schema**） |
| 4 | **i18n** | 新建 `submissions`（**26 键**）· `tokens`（41 键）· `errors` +6 码 · `common` **+1** ⇒ **净增 74 键** |

**非目标（Out）**：
- 详情页 `/reviews/:id` 的内容（**归 M4b-5**；本批只做入口 —— 用户 2026-09-16 定 A）
- 我的资产 / 工作台三卡（**M4b-4**）· 审核队列 + 裁决（**M4b-5**）· 标签/审计（**M4b-6**）
- token `scope` 策略扩展 · 关键词搜索（YAGNI，量小）· **全站去红**（登记 **M4b-7**）
- 有效期展示（一律永不过期，**不显示** —— 用户定）

---

## 2. Task 总览

| Task | 标题 | 主要文件 | 断言数 | 依赖 |
|------|------|---------|-------|------|
| **T1** | 服务端：review 读面加性（`reviewComment` + `assetType`） | `review/query.ts` | 4 | — |
| **T2** | 服务端：令牌读面加性 + 掩码配置 | `auth/api-keys.ts` · `http/tokens.ts` · `auth/better-auth.ts` | 6 | — |
| **T3** | 服务端：新增 `PATCH /api/tokens/:id` | `http/tokens.ts` · `auth/api-keys.ts` | 6 | T2 |
| **T4** | 前端：api 层（`apiDelete` + `reviews.ts` + `tokens.ts`） | `api/client.ts` · `api/reviews.ts` · `api/tokens.ts` | 4 | — |
| **T5** | 前端：`StatusPill` 加性扩展 `kind="task"` | `components/console/StatusPill.tsx` | 3 | — |
| **T6** | 前端：我的提交页（+`submissions` 组键 + 路由） | `pages/Submissions.tsx` · `i18n/*` · `main.tsx` | 10 | T1/T4/T5 |
| **T7** | 前端：我的令牌页（含创建两态 / 编辑 / 删除） | `pages/Tokens.tsx` | 10 | T2/T3/T4 |
| **T8** | i18n：**收窄为** `tokens` 组 + `errors` 6 码（`submissions` 组 + `common.cancel` 已随 T6 落地） | `i18n/zh.ts` · `i18n/en.ts` | 4 | — |
| **T9** | 路由接线（两条真路由 + DEV_BATCH 删 2 项） | `main.tsx` · `pages/Dashboard.tsx` | 4 | T6/T7 |
| **T10** | 验证收尾（dogfood G1-G15 + 出口五件 + 证据文件） | `docs/smoke/**` | 6 | T1-T9 |

**顺序说明**：T1-T3（服务端）与 T4/T5/T8（前端基建）可并行；T6/T7 依赖各自前置；T9 收口路由；T10 收尾。

---

## 3. Task 明细

### T1 · 服务端：review 读面加性

**Files**：`apps/server/src/review/query.ts`

**步骤**：
1. `ReviewListItem` 接口加 `reviewComment: string | null` 与 `assetType: AssetType`
2. `LIST_SELECT` 加 `reviewComment: reviewTask.reviewComment` 与 `assetType: asset.type`
   （⚠️ `asset` 表**已在** `baseQuery` 的 join 里 —— `query.ts:82`，**无需加 join**）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/server typecheck` exit 0
② 剔除后读 `GET /api/reviews/mine` ⇒ 每行含 `reviewComment`（`string|null`）与 `assetType`（`skill|mcp|agent`）
③ 驳回一条后：该行 `reviewComment === '原因原文'`；未裁决行 `=== null`
④ `assetType` 与该版本所属资产类型一致（构造 skill/mcp 各一，断言分别命中）
```

⚠️ **注意**：`reviewComment` 列自**迁移 0000** 起存在（`db/schema/governance.ts:49`）、写入 M3 已实现
（`review/service.ts:183,238`）⇒ **本 Task 只把已有列读出**；`assetType` 同理由既有 join 提供 ⇒ **零迁移**。

---

### T2 · 服务端：令牌读面加性 + 掩码配置

**Files**：`apps/server/src/auth/api-keys.ts` · `apps/server/src/http/tokens.ts` · `apps/server/src/auth/better-auth.ts` · `apps/server/src/http/tokens.test.ts`（新增断言；v0.3 补登记）

**步骤**：
1. `ApiKeyRow` 加 `name: string|null` · `start: string|null` · `tail: string|null` · `lastRequest: Date|null`
2. `listApiKeys` 的 `SELECT` 补 `name` / `start` / `metadata` / `lastRequest`；回填时把 `metadata.tail` 解出为 `tail`
3. `createApiKey` 窄化声明加 `name?` / `metadata?`；`issueApiKey` 透传 `name`（**底层保持可选**——内部通道友好）；
   **路由层** `issueBodySchema` 限定 **必填**：`name: z.string().trim().min(1).max(32)`（缺 / 空 / 纯空白 ⇒ 400，不进官方；v0.4）
4. ★ **签发写 `metadata.tail` = create 后补一次 `updateApiKey`**（`metadata: { tail: 明文.slice(-4) }`）——
   明文由官方 `createApiKey` 内部 keyGenerator 生成（`dist/index.mjs:802-808`）⇒ **create body 无法预知 tail**
   ⇒ **两次官方调用**；官方 update body 确收 `metadata`（⚠️ 明文**只在本函数内可取**；**禁止**写入日志/审计 detail）
5. `better-auth.ts` 的 `apiKey({...})` 加 **3 行配置**：
   `startingCharactersConfig: { charactersLength: 12 }` · **`enableMetadata: true`**（★ 官方默认关闭——不开则签发传
   metadata 抛 `METADATA_DISABLED`，`dist/index.mjs:767-770`）· **`maximumNameLength: 32`**（钉定官方默认，防上游漂移）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/server typecheck` exit 0；`git diff --stat -- apps/server/drizzle packages/` 为空（零迁移）
② 签发带 name ⇒ 列表项 `name` 回显；不带 ⇒ `null`
③ 签发后列表项 `start` 长度 === 12（`charactersLength` 生效）
④ 列表项 `tail` === 明文后 4 位（断言仅用 `明文.endsWith(tail)`，**不回显明文**）
⑤ `lastRequest` 字段存在（值为 `Date|null`；未使用过为 `null`）
⑥ 既有测试零修改且全绿（无严格字段集断言）
⑦ **缺 `name` / 空串 / 纯空白 ⇒ 400 `request.invalid`**（v0.4 契约变更：名称必填）
⑧ 名称上限 32：32 字受理 / 33 字 ⇒ 400（官方 `maximumNameLength` 钉定生效；v1.10 加）
⑨ `metadata` 列**实读**形态 = 单层 JSON 文本 `{"tail":"…"}` 且 `tail === 明文.slice(-4)`（v1.10 加）
⑩ `DELETE /api/tokens/:id`：**超管删他人 token ⇒ 404**（令牌彻底私有；v0.4 加）
```

⚠️ **注意**：`start` 是官方**自动写**（`shouldStore` 默认 true）；旧令牌（M4b-pre 迁移前）两者皆 `null`
⇒ 前端须兜底「—」。**审计 detail 仍零明文**（既有 T17 断言保持）。

---

### T3 · 服务端：新增 `PATCH /api/tokens/:id`

**Files**：`apps/server/src/http/tokens.ts` · `apps/server/src/auth/api-keys.ts`

**步骤**：
1. `ApiKeyEndpoints.updateApiKey` 窄化声明加 `name?: string` / `permissions?: Record<string,string[]> | null` /
   `metadata?`（T2 已用同一字段写 `tail`）
2. 新增 `PATCH /api/tokens/:id`：body `{ name, scope? }`（zod；**`name` 必填**：`trim().min(1).max(32)`——与新建同口径（v0.4）；
   `scope` 5 码子集可选）
   - 授权：**本人**（`referenceId === principal.userId`）；他人 token ⇒ **404**（防枚举，同 DELETE 口径）
   - `scope` 空数组 ⇒ 按**全量**处理（对齐签发语义）；`permissions` 透传官方 `updateApiKey`
   - 审计：`token.update`（detail 零明文）
   - 响应：200 单条 `ApiKeyRow`（与列表 item 同形）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/server typecheck` exit 0；`PATCH /api/tokens/:id` 已注册（`app.routes` 含该路径与方法）
② 改名：`{name:'CI 发布用'}` ⇒ 200 且列表回显新名
③ 改权限：`{scope:['audit:read']}` ⇒ 200 且 `scope === 'audit:read'`；`{scope:[]}` ⇒ `''`（全量语义）
④ 越权：他人 token ⇒ **404**（非 403，防枚举）
⑤ 不存在的 id ⇒ 404
⑥ 审计写入 `token.update`，且 detail 无明文
⑦ 名称**缺失 / 清空 / 纯空白** ⇒ **400 `request.invalid`**（v0.4：编辑与新建同口径，名称必填）
⑧ 名称 **33 字 ⇒ 400**（官方 `maximumNameLength` 32 上限；v1.10 加）
```

---

### T4 · 前端：api 层

**Files**：`apps/web/src/api/client.ts` · `apps/web/src/api/reviews.ts`（新建）· `apps/web/src/api/tokens.ts`（新建）

**步骤**：
1. `client.ts`：新增 `apiDelete<T>` **与 `apiPatch<T>`**（与 `apiPost` 同形，复用 `doFetch` —— 401 分流/语言头/错误归一自动继承）+ **空体守卫**（204 / 空体 ⇒ `undefined`；删除令牌服务端回 204）
2. `api/reviews.ts`：`fetchMyReviews({status,limit,offset}, signal)` · `withdrawReview(id, signal)`
3. `api/tokens.ts`：`fetchTokens(signal)` · `createToken({name,scope?}, signal)` · `updateToken(id,{name,scope?}, signal)`（走 `apiPatch`）· `deleteToken(id, signal)`（**`name` 必填** —— v0.4 口径）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/web typecheck` exit 0；`apiDelete` **与 `apiPatch`** 导出存在且复用 `doFetch`（grep 断言）
② 四个令牌封装与两个 review 封装导出齐全
③ 类型与批 design §4.2 / §7.1 一致（`ApiKeyRow` 含 9 字段）
④ 既有 `apiGet`/`apiPost` 消费点零改动（门户零回归前置）
```

---

### T5 · 前端：`StatusPill` 加性扩展 `kind="task"`

**Files**：`apps/web/src/components/console/StatusPill.tsx` · `apps/web/src/styles/aih-theme.css` ·
`apps/web/src/components/ui/shadcn/badge.tsx`

> ⚠️ **v0.6 件表补正**：原只列 `StatusPill.tsx` **1 件**。design §3.2#7 写死「渐变须落 **token/variant**，
> **禁 className 覆盖外观**」⇒ 只改 1 件就必然把渐变写进消费点 `className`（违规）；另两件为**硬约束倒逼**，
> 非扩张。用户 2026-09-16 拍板 **A**：token 落 **C 品牌渐变层**、名 **`--gradient-rejected`**。

**步骤**：
1. `StatusPill.tsx` 加 `TASK_STATUS_VARIANT`（类型源 = `api/reviews.ts` 的 `ReviewStatus`，与 `08 §6` 同轴）：
   `PENDING`=warning · `APPROVED`=success · **`REJECTED`=`rejected`**（实色蓝→紫渐变 + 白字）· `WITHDRAWN`=secondary
2. `kind` 联合类型加 `'task'`；`status` 联合加 `keyof typeof TASK_STATUS_VARIANT`；**asset/version 两分支零改动**
3. **token 落 C 品牌渐变层**：`aih-theme.css` 增 `--gradient-rejected: linear-gradient(96deg, #6a6dff 0%, #b85eff 100%)`；
   层注释白名单 **3 → 4** 同步；**不注册** `@theme --color-*`（渐变值塞 `background-color` **永不渲染**）
4. **variant（官方第 ④ 条路径「改组件源码加 variant」，M4b-1 §3.5 授权先例 = 同件加 `success`/`warning`）**：
   `badge.tsx` 的 `cva` 增 `rejected` = `bg-[image:var(--gradient-rejected)] text-white [a&]:hover:brightness-105`
   （**只增不改**；hover 用 `brightness` —— 渐变底会吃掉 `[a&]:hover:bg-x/90`，照抄官方 `destructive` = **假反馈**）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/web typecheck` exit 0；`bun run --filter=@ai-asset-hub/web lint` exit 0；
  根 `bun run format:check` exit 0；`kind="task"` 可用，既有 `asset`/`version` 两 kind 零行为变化
  （该件**全仓零消费点** —— grep 实测，属结构性保证）
② 四态映射可区分：PENDING→warning / APPROVED→success / REJECTED→rejected / WITHDRAWN→secondary（grep 四行）
③ 无红色：task 分支 `grep destructive` = **0**（版本族的 REJECTED 仍 destructive，保持不变）
④ token/variant 落层可验：`grep -rn linear-gradient apps/web/src` 仅命中 `aih-theme.css`（4 token + 1 注释）；
  `badge.tsx` 仅**引用** `var(--gradient-rejected)`；C 层白名单注释 = **4 个**
⑤ **真渲染实测**（不靠 typecheck 推断 CSS 生效）：`bun run build` 产物含
  `.bg-\[image\:var\(--gradient-rejected\)\]{background-image:var(--gradient-rejected)}`；
  浏览器（dev :5173）注入该 class 实测 `backgroundImage = linear-gradient(96deg, rgb(106,109,255) 0%, rgb(184,94,255) 100%)`
  + `color = rgb(255,255,255)`；hover 规则 `a.…brightness-105:hover{filter:brightness(105%)}` 在样式表中
```

---

### T6 · 前端：我的提交页

**Files**：`apps/web/src/pages/Submissions.tsx`（新建）· `apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts` · `apps/web/src/main.tsx`

> ⚠️ **v0.7 件表补正（方案阶段先声明）**：原只列页面 1 件。断言 ②-⑦ 均为**浏览器可达**类 ⇒ 页面必须① 有键可渲染（`submissions` **26 键** + `common.cancel`；T8 原为此设，现随本 Task 落地）② 有路由可直达（`/dashboard/submissions` 由 `ComingSoon` 换真页 + `DEV_BATCH` 删该项；T9 原为此设，现收窄）。

**步骤**（组件树见批 design §4.4.1）：`PageHeader` + 官方 `Select`（状态筛选，5 项）+
`DataTable`（6 列 · `rowActions`）+ `Pagination` + 撤回 `ConfirmDialog`
- 列序：**资产 → 类型 → 状态 → 提交时间 → 拒绝原因 → 操作**
- 类型列 = `TypeIcon` + 短文案；拒绝原因 = `max-w-[280px] truncate` + `title`
- 操作列 = [👁 查看]（`navigate('/reviews/'+taskId)`）+ [↩ 撤回]（**仅 PENDING** 渲染）
- 筛选/分页 **URL 状态化**（`useSearchParams`：`?status=&limit=&offset=`）；变更时 `scrollTo(0,0)`
- 「全部」= **不传 status**（服务端非法值静默忽略 ⇒ 不可传 `ALL`/空串）
- 空态两文案：**从未提交** = 页面级 `Empty`（`empty.none` + `empty.noneHint`）· **筛选无结果** = `DataTable.emptyMessage`（`empty.filtered`）
- `Pagination` **仅 `total > limit`** 时渲染（design §4.4.1 末行；单页不显「1 / 1」）
- 行类型 `MyReviewItem` 须 **type 别名**（`interface` 无隐式索引签名 ⇒ 进不了 `DataTable` 行约束）

**验收断言**：
```
① `bun run typecheck` / `bun run lint` / `bun run format:check` exit 0
② 真浏览器：列表 6 列、列序正确；类型列渲染 TypeIcon SVG + 短文案
③ 撤回：仅 PENDING 行有按钮 ⇒ 点击弹确认 ⇒ 确认后行消失（或状态变更）+ toast
④ 筛选：切「已驳回」⇒ 请求带 status=REJECTED；切「全部」⇒ **不带** status 参数（断言请求 URL）
⑤ URL 状态化：刷新后筛选/页码保持；浏览器后退可回上一筛选
⑥ 三态：载（Skeleton）· 错（ErrorState + 重试）· 空（两种文案随是否有筛选变化）
⑦ 「查看」→ URL 变为 `/reviews/:taskId`
⑧ 门户零回归 36/36（`m4a-dogfood.ts`；**T6 实测 PASS 36/36 + NO JS ERRORS**）
⑨ 分页条件：`total <= limit` 无分页控件 · `total > limit` 出现「1 / 2 · 每页 20」（真浏览器实测两条）
⑩ 键数实测：`submissions` **26**（含 `action.view`）· `common.cancel` 被 `ConfirmDialog.cancelLabel` 消费（grep）
```

---

### T7 · 前端：我的令牌页

**Files**：`apps/web/src/pages/Tokens.tsx`（新建）

**步骤**（组件树见批 design §4.4.1）：
- 列（6）：名称 · Key（`aih_` 前 12 + `*****` + 后 4；旧数据「—」）· 权限范围 · 创建时间 · 最后使用（超 3 月 `text-warning`）· 操作
- `data = items.filter(r => r.revokedAt === null)`（**只显有效**）
- 创建 Dialog **两态**：表单（名称**必填**：空 / 纯空白 ⇒ 提交禁用 + 权限范围 `ToggleGroup multiple`）→ 明文态（`aih_…` + `CopyButton clearOnUnmount` + 强提示）
- **关闭逻辑单一入口** `requestClose()`（四条路径共用：Esc / 遮罩 / ✕ / 按钮）；**明文态隐藏 ✕**
- 复制标记：页内 `<div onClickCapture>`（**零改共享件**）
- 编辑 Dialog（改名 + 改权限；名称**必填**、初值 = 当前名）· 删除 `ConfirmDialog`（**`destructive=false`** 去红；**仅本人**）
- 关闭后复位：`step → 'form'` · `copiedOnce → false`

**验收断言**：
```
① `bun run typecheck` / `bun run lint` / `bun run format:check` exit 0
② 列表 6 列；Key 列掩码形态正确（新令牌）；旧令牌显「—」
③ 只显有效：库里存在已吊销令牌时，列表中**不出现**
④ 创建：填名称 + 勾 2 个权限 ⇒ 提交 ⇒ 切明文态（明文可见 + 复制按钮）
⑤ 误关防护：未复制时按 Esc / 点遮罩 / 点 ✕ / 点关闭 ⇒ **先弹确认**；取消 ⇒ 留在明文态
⑥ 复制后关闭 ⇒ **直接关闭**（不弹确认）
⑦ 关闭后再次打开 ⇒ 回到表单态（**不复用上次明文/复制标记**）
⑧ 编辑：改名 + 改权限 ⇒ 保存 ⇒ 列表回显新值 + toast
⑨ 删除：确认按钮**非红色**（primary）；确认后该行从列表消失
⑩ Last Used 超 3 个月的行文字为 warning 色；门户零回归 36/36
```

---

### T8 · i18n：三组键

**Files**：`apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts`

**步骤**：
1. ~~新建组 `submissions`（26 键）~~ **v0.7：已随 T6 落地**（含 `action.view`；`common` 组 `cancel` 同批）⇒ 本 Task 只剩下面两件
2. 新建组 `tokens`（**41 键**：`col.*` 7 + `scope.full` + `uses.never` + `create.*` 9 + `edit.*` 7 + `delete.*` 4 + `plain.*` 9 + 空态 2 + `error.load`）
3. `errors` 组 **+6 码**：`review.not_found` / `already_pending` / `not_pending` / `self_review` / `comment_required` / `access_denied`

**验收断言**：
```
① `bun run typecheck` exit 0；zh/en 两组键**完全对称**（键集合一致）
② 键数实测：submissions **26** · tokens 41 · errors 22 → 28 · common +1 ⇒ **净增 74**
③ 无重复键；无未使用的孤儿键（grep 消费点）
④ 页头标题复用既有 `dashboard.submissions` / `dashboard.tokens`（不新建 `title` 键）
```

---

### T9 · 路由接线

**Files**：`apps/web/src/main.tsx` · `apps/web/src/pages/Dashboard.tsx`（如涉及入口文案）

**步骤**：
1. 两条路由由 `ComingSoon` → 真页（`/dashboard/submissions` → `Submissions` **已在 T6 完成**；本 Task 只做 `/dashboard/tokens` → `Tokens`）
2. `DEV_BATCH` 删项（T6 已删 `'/dashboard/submissions'` ⇒ 本 Task 删 `'/dashboard/tokens'`，**余 5 项**）
3. 侧栏条目**零改动**（M4b-2 已交付）；`/reviews/:id` 保持占位（M4b-5）

**验收断言**：
```
① `bun run typecheck` / `bun run lint` exit 0；路由 11 条不变（只换两条的 element）
② `DEV_BATCH` 键数 7 → 5；生产产物零 `M4b-` 字面量（grep 构建产物）
③ 直访 `/dashboard/submissions` 未登录 ⇒ 跳 `/login?next=…`（保码）
④ 侧栏「我的提交」「访问令牌」高亮正确
```

---

### T10 · 验证收尾

**Files**：`docs/smoke/scripts/m4b3-personal-a-dogfood.ts`（新建）· `docs/smoke/2026-09-16-m4b3-personal-a.md`（新建）· `docs/smoke/scripts/m4b3-seed-submissions.ts`（**新建 · 可重放造数**；v0.8 补 —— 已落地并被 T6 实证使用）

**步骤**：dogfood **G1-G15** 全组 + 出口五件 + 证据文件（含**权威行数表**：后续行数一律 `wc -l` 实测）

**验收断言**：
```
① `bun docs/smoke/scripts/m4b3-personal-a-dogfood.ts`（登录态传入方式沿用 M4b-2 脚本）⇒ G1-G15 全绿 + `NO JS ERRORS`（清单见批 design §9.3）
② 出口五件：批 design 8 维 ≥9（已 9.81）· T1-T10 全绿 · 五门禁 exit 0 ·
   dogfood/观感（合规则核对，审美归 M4b-7）· **整体审计**（十一维无未决项）
③ 证据文件含：门禁输出 · dogfood 输出 · 权威行数表（`wc -l` 实测）· 出口件状态
④ 全量测试：`CI=true bun run test` 零新失败（基线 500 pass / 1 skip / 0 fail）
⑤ 门户零回归：`m4a-dogfood.ts` 36/36 · `m4a-chain-smoke.ts` PASS
⑥ `git diff --stat -- apps/server/drizzle packages/` 为空（**零迁移**）
```

---

## 4. 门禁与冒烟顺序（复现 CI，硬规则）

```
bun install --frozen-lockfile → typecheck → lint → format:check → build → db:migrate → test
```
- **逐 Task**：只跑**本包** typecheck + lint（快）
- **落地后**：跑**全量**五门禁（与 CI 同序）
- **纯文档 Task**（无代码）：不跑门禁
- 硬规则见 `AGENTS.md`「测试与 CI 约定」（测试文件禁无条件改 `process.env` · turbo env 声明 · 测试只依赖自己造的数据 · 单库复现）

## 5. 造数需求（**写库需用户授权**）

| 用途 | 内容 | 备注 |
|------|------|------|
| 提交页数据 | 2-4 条 review task（覆盖 PENDING / APPROVED / REJECTED（带 comment）/ WITHDRAWN；类型含 skill + mcp 各≥1） | 走 `POST /api/reviews/:id/...` 真接口造，**不直写 DB** |
| 令牌页数据 | 2 条令牌（一条有效带 name · 一条已吊销） | 走真接口签发 + 删除 |
| 账号 | 复用 M4b-2 种子（`m4b2_user` / `m4b2_mgr` / `m4b2_super`） | 口令从 env 读，仓库零痕迹 |

⚠️ **任何直写 DB / 删库操作须先获用户口令**。dogfood 优先用真接口造数。

## 6. 风险与回退

| # | 风险 | 处置 |
|---|------|------|
| 1 | 改共享件 `StatusPill`（加 kind） | **加性**：既有两 kind 不动；断言「既有消费点零行为变化」 |
| 2 | 改共享件 `client.ts`（加 `apiDelete`） | **加性**：复用 `doFetch`，既有 `apiGet`/`apiPost` 零改动 |
| 3 | `PATCH` 越权信息泄露 | 他人 token ⇒ **404**（非 403）+ 测试固化 |
| 4 | 明文泄露（日志/审计） | 明文只在签发响应与 `metadata.tail`（4 位）；审计 detail **零明文**（既有断言保持） |
| 5 | 掩码片段存储改变「仅存哈希」现状 | 已在批 design §4.2 论证（影响极小）+ `05 §5` 同步一句 |
| 6 | 旧令牌 `start`/`metadata` 为 `null` | 前端兜底「—」；不可回填 |

## 7. 落地记录（执行期回填）

_（待执行）_

| Task | 提交 | CI | 断言结果 | 备注 |
|------|------|----|---------|------|
| — | — | — | — | — |

## 9. 自检打分（初稿）

> 依据 `self-review-scoring`（AIH 口径：文档 **8 维 = 标准 4 + 深度 4**）；**换靶自检**（禁同分重报）；
> 与批 design 定稿同源（design 侧 8 维 **9.54**）。打分前**实测**，非复述。

| 维度 | 评分 | 证据 |
|------|:--:|------|
| 完整性 | 9.5 | 8 节齐备（目标/非目标 · Task 总览 · T1-T10 明细 · 门禁顺序 · 造数需求 · 风险回退 · 落地台账 · 修订） |
| 一致性 | **10** | ★ 与批设计**逐项实测一致 15/15**：列数 6 · 列序（资产→类型→状态）· 令牌 6 列 · 键数 26/41/74 · `PATCH /api/tokens/:id` · 审计 `token.update` · `charactersLength` · 渐变去红 · 零迁移 |
| 清晰度 | 9.6 | 每 Task 四段（Files / 步骤 / 验收断言 / 注意）；**断言 10/10 含完整可跑命令** |
| 可实施性 | 9.6 | 依赖明确（T1-T3 服务端 ∥ T4/T5/T8 前端基建；T6/T7 各自前置；T9 收口）；坑写明（零迁移 · 旧数据兜底 · 越权 404 · 明文不回显） |
| 设计纯粹性 | 9.5 | 零注水；Task 拆分维度 = 依赖顺序 + 可独立交付 + 服务端改动隔离 |
| 边界覆盖 | 9.5 | 风险 6 条（共享件加性 · 越权 · 明文泄露 · 掩码存储 · 旧令牌 · 回退）· 造数授权门 |
| 实施精度 | 9.6 | 命令级（`bun run --filter=… typecheck`）· 路径级（14 个引用全解析）· 契约级（PATCH body / 权限口径 / 审计事件） |
| 跨平台 | N/A | 控制台 UI + 服务端读写，无平台差异（按 skill 剔除，分母 7） |

综合：**9.61 / 10** ✅ 达门（≥9）

> **v0.3 复评（2026-09-16，T2 实现期订正后）**：8 维 **9.69** —— 完整性 **9.7**（T2 补 3 条断言 + Files 补测试件）·
> 一致性 **10**（与批 design v1.10 逐项对照 18/18：上限 32 · `enableMetadata` · 两次调用 · 空名省略 · 单层 JSON）·
> 清晰度 **9.6** · 可实施性 **9.7** · 设计纯粹性 **9.5** · 边界覆盖 **9.6**（+空名 / 上限 / 失败语义）·
> 实施精度 **9.7**（官方源码行号 + 失败语义写明）；跨平台 N/A（分母 7）
> 换靶角度 = **官方包源码逐条复核**（`METADATA_DISABLED` / `maximumNameLength` / `minimumNameLength` 三条约束）
> + **断言可跑性**（每条含完整命令）。

> **v0.4 复评（2026-09-16，名称必填 + 令牌私有 订正后）**：8 维 **9.74** —— 完整性 **9.8**（T2 断言 +⑩ · T3/T7 同步）· 一致性 **10**（与批 design v1.11 逐项 **20/20**：必填口径 · 400/404 断言 · 仅本人 · `requireName` 不用）· 清晰度 **9.6** · 可实施性 **9.8** · 设计纯粹性 **9.5** · 边界覆盖 **9.7** · 实施精度 **9.8**；跨平台 N/A（分母 7）。

**自检实测证据**（本段数字均为真跑所得）：

```
① plan ↔ design 关键量逐条比对 ......... 15/15 一致
② plan 引用的 14 个文件 ................ 10 存在 + 4 为「本批新建件」（标注正确）
③ 断言命令覆盖率（每 Task 验收断言块）.. 10/10
④ 量化声明 26 / 41 / 74 键 · Task 10 ... 与批设计 §6 及实测一致
⑤ 与 design 的差异点 .................. 0（无 plan 单方面新决策）
```

> **v0.6 复评（2026-09-16，T5 件表补正 + token/variant 落点定死后）**：8 维 **9.77** —— 完整性 **9.9**（T5 Files 1 → **3 件** 补正 + 断言 3 → **5 条**）· 一致性 **10**（与批 design **v1.14** 逐项 **22/22**：token 名 · C 层归属 · variant 名 · 白名单条数 · 双轴 REJECTED · 件数 11）· 清晰度 **9.6** · 可实施性 **9.9**（token 值 / variant 类串 / 消费点全定死 ⇒ 实现照抄）· 设计纯粹性 **9.5** · 边界覆盖 **9.8**（+两条**静默失效**坑入档：`--color-*` 不可注册渐变 · hover 反馈）· 实施精度 **9.9**（断言含 grep 与真渲染两条实跑法）；跨平台 N/A（分母 7）。
> 换靶角度（本轮新增）：**件表差异**（plan Files 是否够容纳 design 的硬约束 ⇒ 1 件 vs 3 件）· **断言可实证性**（CSS 类是否**真发出**：编译产物 + 浏览器计算值双验）。
> **v0.7 复评（2026-09-16，T6 件表补正 + 键缺口补登后）**：8 维 **9.81** —— 完整性 **9.9**（T6 Files 1 → **4 件** + 断言 8 → **10** ⇒ 「断言可跑」不再依赖尚未落地的前置件）· 一致性 **10**（与批 design **v1.15** 逐项 **26/26**：键 26 + `action.view` + `common.cancel` + 净增 74 · 空态两文案落点 · 分页条件 · 路由时点 · type 别名口径）· 清晰度 **9.7**（+空态/分页/行类型三条实现级定死）· 可实施性 **9.9** · 设计纯粹性 **9.5** · 边界覆盖 **9.8**（+「未证项：真实 PENDING 撤回成功归 T10 造数」标注）· 实施精度 **9.9**（断言含真浏览器两条实测法与 grep 法）；跨平台 N/A（分母 7）。
> 换靶角度（本轮新增）：**断言的「前置件」依赖审计**（一条断言要求浏览器可达，Files 却只列了页面 ⇒ 抓出 3 件缺列）· **键覆盖回读**（design 写死的控件是否都有键消费 ⇒ 抓出 2 键缺口）。
> **v0.8 复评（2026-09-16，造数脚本落地 + T6 未证项关闭后）**：8 维 **9.83** —— 完整性 **9.9**（T10 件表补造数脚本 + 步骤补「造数」）· 一致性 **10**（与批 design **v1.16** 逐项对照：造数路径 / 前缀纪律 / G 项映射 / 复位语义）· 清晰度 **9.7** · 可实施性 **9.9**（造数命令与前置写明，可一条命令重放）· 设计纯粹性 **9.5** · 边界覆盖 **9.9**（造数**授权**与幂等/复位入档；写库范围限于 `m4b3-seed-%`）· 实施精度 **9.9**；跨平台 N/A（分母 7）。
> 换靶角度（本轮新增）：**写库脚本的纪律审计**（是否有 delete / 是否越前缀 / 重跑是否复位）· **未证项闭环**（T6 断言 ③ 由「待造数」转「已实证」）。

⚠️ **本轮自检的换靶角度**（均为上一轮 design 自检未用的）：① 全量 file 引用解析性（含「待创建」标注判定）
② 断言命令覆盖率（逐 Task 统计）③ **plan ↔ design 交叉一致性**（跨文档，非单文档内）

## 8. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.8 | 2026-09-16 | sunxuewen-rush | **T10 件表补造数脚本 + T6 未证项关闭**（用户 2026-09-16 授权写 dev 库）① T10 Files +`m4b3-seed-submissions.ts`·步骤 +「造数」② T6 断言 ③ 已实证关闭（真实账号 + 真实后端 + 落库复核：task `WITHDRAWN` · version 退 `UPLOADED`）③ 与批 design **v1.16** 同源；8 维 **9.81 → 9.83** |
| v0.7 | 2026-09-16 | sunxuewen-rush | **T6 落地：件表补正 + 键缺口补登**—— ① T6 Files 1 → **4 件**（+i18n 两件 + `main.tsx`；「断言可跑」倒逼，方案阶段先声明）② 键缺口：`action.view` + `common.cancel` ⇒ `submissions` **26** · 净增 **74**；T8 收窄（只剩 `tokens` + `errors`）；T9 收窄（只剩 tokens 路由）③ T6 断言 8 → **10** ④ 同轮修 1 处**自产缺陷**（`Pagination` 条件）⑤ 与批 design **v1.15** 同源；8 维 **9.77 → 9.81** |
| v0.6 | 2026-09-16 | sunxuewen-rush | **T5 落地：件表补正 + token/variant 落点定死**（用户 2026-09-16 拍板 **A**）① **T5 Files 1 件 → 3 件**（+`aih-theme.css` + `badge.tsx`）—— design 「渐变须落 token/variant、禁 className」硬约束倒逼；**已按纪律在方案阶段先声明件表差异**（不执行到一半才说）② 步骤 2 → **4 条**（token 落 C 层 + `badge.rejected` variant）③ 断言 3 → **5 条**（+④ 落层可验 · +⑤ 真渲染实测：编译产物规则 + 浏览器计算值）④ 与批 design **v1.14** 同源；8 维 **9.61 → 9.77** |
| v0.5 | 2026-09-16 | sunxuewen-rush | **T4 落地注记**：① T4 步骤 1 补 **`apiPatch`** 与 **空体守卫**（204 ⇒ `undefined`）② 步骤 3 的签名同步 `name` **必填**、`updateToken` 走 `apiPatch` ③ 断言 ① 加 `apiPatch` ④ 与批 design **v1.13** 同源；**无口径变更**（8 维 **9.74** 不变） |
| v0.4 | 2026-09-16 | sunxuewen-rush | **名称必填 + 令牌私有**（用户 2026-09-16 逐条对齐拍板；与代码 / 测试 / 批 design v1.11 / 主 design v1.34 同批）① T2：路由层 `name` **必填**（`trim().min(1).max(32)`；缺/空 ⇒ 400）；断言 ⑦ 改 400；**+⑩ 超管删他人 token ⇒ 404** ② T3：`name` **必填**、断言 ⑦ 改 400 ③ T7：名称必填（提交禁用 + 初值预填）· 删除标注「仅本人」④ 依据 = 规范层 `05 §5`「Token 签发 / 吊销 = 本人」（代码此前超出规范）+ 兄弟仓 new-api 私有口径 |
| v0.3 | 2026-09-16 | sunxuewen-rush | **T2 实现期官方源码复核订正**（用户 2026-09-16 拍板：名称上限「官方默认 32，我们就改成 32」；文档订正与 T2 代码同批）① **T2 步骤 4（原）→ 3/4/5 三条**：`issueApiKey` 透传 name（空 ⇒ 省略）· **签发写 `metadata.tail` = create 后补 `updateApiKey`（两次官方调用）** · `better-auth.ts` **3 行配置**（`charactersLength: 12` + **`enableMetadata: true`** + 钉定 `maximumNameLength: 32`）② **T2 Files 补测试件**（`http/tokens.test.ts`）③ **T2 断言 +3**（⑦ 空名 ⇒ 201 且 name null · ⑧ 上限 32（33 字 ⇒ 400）· ⑨ metadata 落库形态 = 单层 JSON 文本）④ **T3 步骤 + 断言**：名称 `trim ≤32`；**清空 ⇒ 不发 `name`（保持原名）**；断言补⑦⑧两条回归 ⑤ 与批 design **v1.10** 同源（官方源码实证：`METADATA_DISABLED` `:767-770` · 更新静默忽略 `:1511` · `maximumNameLength` 默认 32 `:2328`）| 
| v0.2 | 2026-09-16 | sunxuewen-rush | **补「自检打分」段**（用户追问「这个 plan 检查打分了？」）—— 查项目惯例：M4b-1 plan:42 / M4b-2 plan 初稿修订行均要求「**plan 初稿也做 8 维自检**」⇒ 本 plan v0.1 **漏做该项**（自检疏漏，如实登记）；本轮补齐并**实测**：8 维 **9.61**（一致性满分 10 —— 与 design 逐项 15/15 一致）；新增 §9 自检打分段（含 5 条实测证据 + 换靶角度说明） | 
| v0.1 | 2026-09-16 | sunxuewen-rush | **立项**——依据批 design（**定稿** · 8 维 **9.81**）与主 design **v1.33**；T1-T10 + 每 Task 可跑验收断言；出口五件见 §4 与批 design §9 |
