# M4b-4 个人面 B：我的资产与工作台 landing —— 批计划

> Date: 2026-09-18
> Updated: 2026-09-18（**v0.18：验收期 UI 调整轮（T11-d · 代码 18 维 9.59）** —— ① §7.5 增 **T11-d** 行 ② §7.6 追加验收期 UI 三连 ③ 落地记录 dogfood **58 → 60**（G14b +2 · G18 改口径）④ **无产品行为破坏**（星标纯展示后收藏入口收敛到详情页）)
> v0.17（2026-09-18）：**T11-c 覆盖补测轮（代码 18 维 9.64）** —— ① §7.5 增 **T11-c** 行 ② §7.6 追加 **F65/F66** ③ §7 落地记录同步：门禁 `test` **537 → 551** · dogfood **53 → 58** · 新增**覆盖探针**行（全仓 95.60/96.28 · `http/assets.ts` 90.97 → 95.96）· 截图 **7 张** ④ 运行顺序恒为 **seed → dogfood**（G12b 改库）)
> v0.16（2026-09-18）：**T8 作废散点订正（14 处 · 文档 15 维 9.22）** —— 用户追问「文档也都对应修改了么？」自查：T8 作废后**活口径散点 14 处**未跟 —— **首轮谓词抓 8 处**（批 plan 7：§1 目标表 #2/#3 · §1 缺口段 · §2-T16 行依赖与件列 · T7 步骤 · T12 件表 ×2；主 design 1：§9/§12 段）· **换靶精修谓词再挖 6 处**（批 design 5：§2.1d 依赖表 U6 行 · §3.1 件 11「三处共用」· §5.1 ⑧「三处共用」· §9.2 交付物表 ×2；主 design 1：§2.4 U5 操作列「快速预览」）⇒ **逐处订正**；**F64 登记**（审计脚本只查关键字不判语义 = 盲区，已补「活口径谓词」）· 打分见 §7.5）
> v0.15（2026-09-18）：**T11 收尾完成（本批末件）** —— ① Status → **✅ 全绿** ② §7 落地记录**逐项回填**（提交链待口令 / 八步门禁 / dogfood 53 PASS / i18n 323 键 / 权威行数表指针 / 出口五件 / 未证项 8 条）③ §7.5 补 **T11** 行④ 件表计数（新建 **16** / 改造 **19**）已在批 design §3 回填（本文档零重复）)
> v0.14（2026-09-18）：**T6 实现期回写** —— §7.5 补 **T6 均分 9.43**；§7.6 追加 **F61–F63**（卡形态偏离设计字面 / 欢迎语与 `state.notice` 保留 / 会话未就绪零请求）；**代码侧剩余 = T11 收尾**）
> v0.13（2026-09-18）：**T16 实现期回写** —— §7.5 补 **T16 均分 9.41**；§7.6 追加 **F58–F60**（含 G15 语义口径订正：幂等以 **API 两次 PUT** 判，非 UI 连点）；件表新建 +2（`api/stars.ts` · `StarButton.tsx`）—— 计数回填见批 design §9.7 ⑥）
> v0.12（2026-09-18）：**T12 实现期回写** —— ① §7.5 补 **T12** 行并**订正 T7/T14 误记 ⬜**（F51）② 新增 **§7.6** 记录实现期发现 **F48–F57**（明细见批 design §11.9）③ 头部与 §8 的 design 分数改「以版本头为准（现行 **9.69**）」（F52）④ **件表计数变化**（新建 **16** / 改造 **19**）—— 回填点见批 design §9.7 ⑥，本文档不重复数字）
> v0.11（2026-09-18）：**逐 Task 收口打分落地（新纪律）** —— 新增 **§7.5**（每 Task 收尾即自测 + 打分）· 修 F38/F41/F42/F43
> v0.10（2026-09-18）：**T15 实现期发现同步** —— F36 形状 SSOT 订正（protocol → web `api/types.ts`）· F37 T4 补并发/级联用例 · **T15 已实现并全绿**）
> v0.9（2026-09-18）：抽屉取消 → T8 作废 · T7 改为「直跳详情」
> v0.8（2026-09-18）：star 最小集并入 → 新增 T15/T16（star 服务端先行）
> v0.7（2026-09-18）：原型评审收口（R1–R23）→ 新增 T12–T14 + T7/T8/T9/T11 口径更新；其后
> **落档一致性轮**（用户「先检查修改并打分」）修 **P6 散点旧口径 7 处** + **P7 均分自算** ⇒ 本计划 **8 维 9.6**，见 §8.2）
> v0.6（2026-09-18）：UI 评审 5 条全闭（条②③④⑤ 落档）→ T7 ⑨ + T8 ⑪⑫
> Status: **✅ 全绿（2026-09-18）**（**T1–T16** 全绿 · **T8 作废**；T11 收尾已完成：造数 + G1–G19 **53 PASS / 0 FAIL** + 五门禁 exit 0 + 证据回填）；其中 **T8 作废**；**执行序 = T15 最先** —— star 能力先行，再消费面）—— 上游批 design 已**定稿**（8 维**以批 design 版本头为准**（现行 **9.69**）；v1.7 原型评审收口）
> **换靶复核（用户要求「先检查并打分」）**：3 项新发现已修（分页**换算公式 + 渲染条件** · me 面 schema **上限口径** ·
> `Drawer` 宽度措辞）；**旧分 9.66 已撤回**（窄口径产物）⇒ 换靶口径下修前 **9.60** / 修后 **9.66**，见 §8.1
> 上游：批 design `docs/designs/2026-09-18-m4b4-personal-b-design.md`（**定稿**）· 主 design
> `2026-09-10-m4b-admin-console-and-auth-design.md` §2.3 拆批表与批件登记表 · `docs/00` §5 M4b-4 行
> 依赖顺序：**M4b-1 ✅ / M4b-2 ✅ 已完成**（两批出口五件全绿）⇒ 本批开工条件已满足
> **批间门（出口五件）**：① 批 design 8 维 ≥9 ② **T1–T16**（**T8 已作废**）全绿 ③ 五门禁逐项 exit 0 ④ dogfood/观感
> ⑤ **整体审计**（收尾全仓覆盖式扫描：findings 逐条登记 + 处置，不留未决项）

---

## 1. 目标与非目标

**目标**（本批 = M4b 中**唯一含读面语义改动**的批）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | 工作台 landing `/dashboard` | 过渡形态（`ComingSoon` 内容槽）→ **角色感知三卡**（`role ≥ 10` 三卡三请求 / `role < 10` 单卡单请求） |
| 2 | 我的资产 `/dashboard/assets` | 占位页 → **九列真页**（状态筛选**显式 `status=ALL`** + q 搜索 + 分页 + **无行菜单**；操作列 = **`Eye` 图标钮「打开详情」**（`Button asChild` + `Link` **真链接直跳** `/assets/:slug`）） |
| 3 | ~~资产管理抽屉~~ ⇒ **作废（v0.9 · 用户取消抽屉）** | **不交付**：列表操作列 `Eye` 真链接**直跳完整详情页**（列表 ↔ 详情零中间态）；管理动作**全部**归详情页管理区（**T12**）—— 收益与留痕见批 design **§4.3** |
| 4 | 服务端 **R6** | 新增 `GET /api/me/assets`（owner-only · 含全状态 · `status` 默认 `'ALL'` · `q` · 分页） |
| 5 | 服务端 **R6-b** | `assertAssetReadable` 授权集 = {owner 本人 / 管理档 / 超管}；**集外仍 404** |
| 6 | 服务端重构 | `ListAssetsOptions` **增量扩 `ownerId?`/`status?`**（参数化同一查询函数）· `assetItem` 抽中性模块 |
| 7 | 测试更新 | 2 处既有断言更新 + 授权集三档对照 + **分层四面对照** + 新端点用例 + **公开面回归锁** |
| 8 | i18n | 新组 `assets` + `dashboard` 补 8 键 + `common` +1 + `errors` **+7** |
| 9 | 规范同步 | `05` §6.4（授权集行 + 超管行措辞）· `08` §7（读面注记 + **ARCHIVED 运营语义补实**） |

**非目标**（不属本批，各自归属已定）：发布/上传流（**M4b-8**）· 管理档全站治理页（**M4b-6**）·
审核队列/详情/文件预览（**M4b-5**）· 标签 CRUD/审计页（**M4b-6**）· **视觉打磨**（**M4b-7**）·
**迁移**（本批零迁移）· 新增依赖（**零新增**）。

> **登记缺口（本批显式不做）**：**提审入口**（列表与详情页**均无上传 UI** ⇒ 提审端点已在但链路接不上；
> 随 **M4b-8** 发布批交付）· **PRIVILEGED 标签的 × 不做禁用特判**（详情 `labels[]` 只返 slug ⇒ 不可判定；
> 服务端 `label.access_denied` 兜底 + toast；精确禁用归 **M4b-6**）。

---

## 2. Task 总览

| # | Task | 层 | 前置 | 关键文件 |
|---|------|----|------|---------|
| **T1** | `ListAssetsOptions` 参数化 + `assetItem` 抽件（**零行为变化重构**） | server | — | `assets/service.ts` · `http/asset-item.ts`（新）· `http/assets.ts` |
| **T2** | **R6-b**：`assertAssetReadable` 授权集扩展 | server | — | `http/assets.ts` |
| **T3** | **R6**：新件 `http/me.ts` + 挂载 `/api/me` | server | T1 | `http/me.ts`（新）· `app.ts` |
| **T4** | 服务端测试：2 处更新 + 三档/四面对照 + 新端点 + 回归锁 | server | T1-T3 | `http/assets.test.ts` · `http/me.test.ts`（新） |
| **T5** | 前端：api 封装**三件** + `useMarketQuery` 可选 `status` 维度 | web | T3 | `api/me.ts`（新）· `api/audit.ts`（新）· `api/reviews.ts`（加队列函数）· `hooks/useMarketQuery.ts` |
| **T6** | 工作台三卡 landing | web | T5 | `pages/Dashboard.tsx` |
| **T7** | 我的资产列表页 + 路由换真页（**九列** · 类型去色 · **`Eye` 图标钮真链接直跳详情** · 无菜单 · **无抽屉**） | web | T5,T13 | `pages/Assets.tsx`（新）· `main.tsx` |
| **T8** | ~~资产管理抽屉 = 纯预览~~ ⇒ **作废（v0.9 · 用户取消抽屉）** —— 列表操作列改为**真链接直跳详情页**（并入 T7） | web | — | ~~`components/console/AssetDrawer.tsx`（新）~~ |
| **T9** | i18n：新组 `assets` + `dashboard` / `common` / `errors` | web | — | `i18n/zh.ts` · `i18n/en.ts` |
| **T10** | 规范同步：`05` §6.4 + `08` §7（**随本批即改**） | 规范 | T2 | `docs/05-identity-access.md` · `docs/08-data-model.md` |
| **T11** | 验证收尾：dogfood **G1-G19** + 五门禁 + 证据 + 收尾回填 | 全 | T1-T16 | `docs/smoke/scripts/m4b4-*.ts`（新）· `docs/smoke/2026-09-18-m4b4-personal-b.md`（新） |
| **T12** | **资产详情页管理区**（改 M4a 已交付页 · 按权限显隐）+ 4 新建件 | web | T5,T9 | `pages/AssetDetail.tsx` · `lib/asset-permissions.ts`（新）· `components/console/AssetAdminCard.tsx`（新）· `components/console/LabelCard.tsx`（新）· `components/console/asset-stats.tsx`（新） |
| **T13** | `DataTable` **加性** prop `rowActionsHeader?`（可见操作列表头） | web | — | `components/console/DataTable.tsx` |
| **T14** | **`labels` 形状升级**（服务端返结构体 + **web 响应类型** · D5/D7 根治） | server + web | T1,T3 | `apps/web/src/api/types.ts` · `labels/service.ts` · `http/asset-item.ts` · `http/me.ts` · `http/assets.ts` |
| **T15** | **star 服务端**（迁移 + 表 + 幂等端点 + 读面 · **执行序最先**） | server | — | `db/schema/assets.ts` · `drizzle/00xx_*.sql` · `assets/stars.ts`（新）· `http/assets.ts` · `http/asset-item.ts` · `packages/protocol` · `docs/08-data-model.md` |
| **T16** | **star 前端接线**（列表列 / 详情页头卡 / 门户卡） | web | T7,T12,T15 | `api/stars.ts`（新）· `components/market/StarButton.tsx`（新）· `pages/Assets.tsx` · `pages/AssetDetail.tsx` · `components/market/AssetCard.tsx`（~~`components/console/AssetDrawer.tsx`~~ 随 T8 作废移除 · v0.16） |

**执行序（依赖链）**：`T1 → T2 → T3 → T4`（服务端闭环，先绿）→ `T9`（键先落，页面才有文案）
→ `T5 → T6/T7 → T8` → `T10` → `T11`。**T1/T2 相互独立可并行**；T9 不阻塞服务端。

---

## 3. Task 明细

### T1 · 服务端：`ListAssetsOptions` 参数化 + `assetItem` 抽件（零行为变化重构）

**Files**：`apps/server/src/assets/service.ts` · `apps/server/src/http/asset-item.ts`（**新建**）· `apps/server/src/http/assets.ts`

**步骤**：
1. `http/asset-item.ts`（新）：把 `assets.ts:111-134` 的 `assetItem()` 与 `service.ts:40-53` 的 `AssetItemMeta`
   **原样迁出**（不改字段、不改序），导出两件；`assets.ts` 与后续 `me.ts` 共同 import
2. `service.ts` 的 `ListAssetsOptions`（`:30-38`）**增量扩两字段**：`ownerId?: string` · `status?: AssetStatus | 'ALL'`
3. `listViewableAssets`（`:173-242`）条件数组首项（`:177` 硬编码 `eq(asset.status,'ACTIVE')`）改为**按 `status` 组装**：
   `'ALL'` ⇒ 不加条件 · `{ACTIVE,HIDDEN,ARCHIVED}` ⇒ 等值条件 · **缺省 ⇒ `ACTIVE`（= 现状行为）**；
   追加 `ownerId` 存在时 `eq(asset.ownerId, opts.ownerId)`
4. **不动**：`type` / `q` / `labelSlugs` 三个既有过滤 · 排序（`updated_at desc, id desc`）· 返回值形状（裸 rows）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/server typecheck` exit 0
② 零行为变化：`bun test apps/server/src/http/assets.test.ts` 全绿（**未改测试的前提下**）
③ `git diff` 中 `assetItem` 的字段名与顺序**零变化**（逐字段比对迁出前后；**实测 15 字段**——13 基础 + `starCount` + `starredByMe`，2026-09-18 复核）
④ 参数化实测：`status:'ALL'` ⇒ 返回含 HIDDEN/ARCHIVED；缺省 ⇒ 仅 ACTIVE；`ownerId` ⇒ 只含该 owner 的资产
```

⚠️ **注意**：本 Task 是**纯重构**——**任何断言都不许改**；若 `assets.test.ts` 需改动才绿，说明
行为变了 ⇒ 回查 T1 而非改测试（**测试是上游契约**）。

---

### T2 · 服务端：**R6-b** `assertAssetReadable` 授权集扩展

**Files**：`apps/server/src/http/assets.ts`（`:163-175`）

**步骤**：
1. 判定改为：

   ```ts
   if (viewer.isSuperAdmin) return viewer;
   const inAuthorizedSet = row.ownerId === viewer.viewerId || viewer.isPlatformReviewer;  // owner 本人 ∨ 管理档
   if (row.status !== 'ACTIVE' && !inAuthorizedSet) throw new AssetError(assetErrorCodes.notFound);
   return viewer;
   ```

2. **不动**授权集外的 404 语义（`asset.not_found` —— 不泄露存在性，主 design §7.1）
3. 复核调用点自动受益（**实测 8 处**，2026-09-18：详情 · 版本列表 · 版本对比 · 版本详情 · 文件 · `PUT/DELETE .../star`（T15 新增）· 下载）
4. **不加**「版本上传者本人」（Q5 A）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/server typecheck` exit 0
② 手工探针（造数后）：HIDDEN 资产 ⇒ owner 200 / 管理档 200 / 非 owner 登录 404 / 匿名 404 / 超管 200
③ 同上四档在 `/versions`、`/versions/:v/files/*`、`/versions/:v/download` 三面**行为一致**
④ 既有测试按 T4 更新后全绿；**未更新前**预期仅 `assets.test.ts:418`/`:844-857` 两处红（其余全绿）
```

⚠️ **注意**：本 Task **必然**使 2 处既有断言转红（`:418` 的 `member → 404`、`:856` 的 owner 404）——
这是**需求变更驱动的契约更新**（已获准，主 design §2.1 补充锁定 ⑤），**不是**回归；处置见 T4。

---

### T3 · 服务端：**R6** 新件 `http/me.ts` + 挂载 `/api/me`

**Files**：`apps/server/src/http/me.ts`（**新建**）· `apps/server/src/app.ts`

**步骤**：
1. 新 `createMeRoutes({ db })`（**形状照抄 `http/tokens.ts` 的独立 router 惯例**）
2. `GET /api/me/assets`（`requireAuth()` —— 定义 `http/auth-middleware.ts:96`）：
   `meQuerySchema.safeParse`（**上限口径逐项对齐公开面 `listQuerySchema`**：`limit` int 1..**100** 默认 **20** ·
   `offset` int ≥0 默认 **0** · `status` 默认 **`'ALL'`** · `q` trim 1..**100** 可选；
   非法 `status` ⇒ 400 `request.invalid` —— 已落码，`validate/base.ts:32` 兜底）
   → `listViewableAssets({ ownerId: principal.userId, status, q, limit, offset })`
   → ★ **`loadAssetItemMeta(db, items)` 批注入** → `items.map((i) => assetItem(i, metas.get(i.id)))`
   → `c.json({ items, total, limit, offset })`
3. `app.ts` 挂载：`app.route('/api/me', createMeRoutes({ db: deps.db }))`（挂载表新增 1 行）
4. `ownerId` **恒取会话**（`principal.userId`），**不接受客户端传入**

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/server typecheck` exit 0
② `GET /api/me/assets` 带会话 ⇒ 200 `{items,total,limit,offset}`；**未登录 ⇒ 401**
③ ★ 每行 **15 字段齐**（实测：13 基础 + `starCount`/`starredByMe`）且 `latestVersion` / `latestName` / `ownerDisplayName` **非 null**（证明批注入已接）
④ owner-only：造一条他人资产 ⇒ **不出现在**响应
⑤ `status=ALL` 含三态；缺省（不传 status）⇒ **含三态**（默认 `ALL`）；`status=HIDDEN` ⇒ 只含 HIDDEN
⑥ `status=bogus` ⇒ 400 `request.invalid`
```

⚠️ **注意**：**第 2 步的 ★ 批注入不可省** —— `listViewableAssets` 返回**裸 `AssetRow[]`**（`service.ts:242`，
**不含 meta**）；公开列表路由正是在此处做 `loadAssetItemMeta`（`http/assets.ts:279-287`）。漏掉 ⇒ ③ 失败。

---

### T4 · 服务端测试：2 处更新 + 三档/四面对照 + 新端点 + 回归锁

**Files**：`apps/server/src/http/assets.test.ts`（改）· `apps/server/src/http/me.test.ts`（**新建**）

**步骤**：
1. **更新 2 处**（`assets.test.ts`）：
   - `:418`「HIDDEN 资产：登录用户 404」⇒ `member`（**fixture 的 owner**，`:143`）改断言 **200**；
     **保留** `superAdmin → 200`；**新增** 非 owner 登录用户（`owner2`/`outsider`）→ **404**
   - `:844-857`「owner 治理 → HIDDEN 后」⇒ `:856` owner 断言改 **200**；**保留**匿名 404；
     **注释去腐化**（`:854`「owner 亦不可读（详情语义）」→「授权集内可读、集外 404」）
2. **授权集三档对照**（并入①的同一 `it`）：owner / 管理档 / 非 owner 登录 / 匿名 四档并列
3. **分层四面对照**（新增断言）：同一 HIDDEN 资产在 `GET /:slug` · `/:slug/versions` ·
   `/:slug/versions/:v/files/*` · `/:slug/versions/:v/download` 四面 —— 授权集内 **200** / 集外 **404**
4. **新端点用例**（`me.test.ts`）：未登录 401 · owner-only 集合 · `status=ALL` 三态 · `status=HIDDEN` 过滤 ·
   分页（`limit`/`offset`/`total`）· `q` 检索 · 非法 `status` 400
5. **公开面回归锁**（Q4 参数化的唯一风险点）：`GET /api/assets`（不传新参）⇒ 仍只返 `ACTIVE` + 字段集不变
6. **必须原样保留（防「改弱测试」）**：`assets.test.ts:442-450`（匿名列表不含 HIDDEN）· `:694`（HIDDEN 文件匿名 404）·
   `download.test.ts:212`（陌生人下载 404）· `stats.test.ts`（统计不计 HIDDEN）

**验收断言**：
```
① `CI=true bun run test` ⇒ **0 fail**；用例数 **≥ 基线 + 新增数**（基线见 §7 权威行数表）
② `git diff apps/server/src/http/assets.test.ts` 中：**只有** :418 与 :844-857 两处断言语义翻转
   + 三档/四面对照新增；**无**删除既有 `it` 的痕迹（`git diff` 逐行核对）
③ `me.test.ts` 七组用例全绿
④ 回归锁：公开列表在**不传新参**时返回行全部 `status === 'ACTIVE'`
⑤ 逐文件运行（避免并发迁移竞态）：`bun test apps/server/src/http/assets.test.ts apps/server/src/http/me.test.ts`
```

⚠️ **注意**：测试**只依赖自己造的数据**（不写「库里只有本文件数据」的断言）；**禁止无条件改写
`process.env`**（用 `??=` 兜底）；新增 fixture 只在 `beforeAll` 内建、幂等。

---

### T5 · 前端：api 封装三件 + `useMarketQuery` 可选 `status` 维度

**Files**：`apps/web/src/api/me.ts`（**新建**）· `apps/web/src/api/audit.ts`（**新建**）·
`apps/web/src/api/reviews.ts`（**加队列函数**）· `apps/web/src/hooks/useMarketQuery.ts`

**步骤**：
1. `api/me.ts`：`getMyAssets({ status, q, page, limit })` 封装（照 `api/assets.ts` 形制），
   返回 `{ items, total, limit, offset }`
2. **`api/audit.ts`（新建）**：`fetchAudit({ limit, offset })` 封装 `GET /api/audit`
   （工作台「最近审计」卡用；**M4b-6 审计页复用**）—— **§2.1c 条① P1**
3. **`api/reviews.ts`（改造）**：加 `fetchReviewQueue({ status, limit, offset })`（`GET /api/reviews?…`）
   —— 现有**仅** `fetchMyReviews`（`/api/reviews/mine`，`:67`）；工作台「待审核」卡用，**M4b-5 队列页复用**。**§2.1c 条① P1**
4. `useMarketQuery`（现 **104 行**）：加**可选** `status` 维度 —— 签名扩为
   `useMarketQuery(opts?: { status?: { defaultValue: string } })`：
   - **不传 `opts`** ⇒ **不读、不写 `status` param** ⇒ 门户中心页（`CenterPage.tsx:119`）**零 diff、零行为变化**
   - 传 `opts.status` ⇒ 增 `status` 读写（默认 `'ALL'`，写 URL 即时，同 `page` 语义）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/web typecheck` exit 0
② `git diff apps/web/src/components/market/CenterPage.tsx` **为空**（门户调用点零改动）
③ 门户零回归（本 Task 收尾即跑）：`bun docs/smoke/scripts/m4a-dogfood.ts` ⇒ **36/36 + NO JS ERRORS**
④ 本页语义：默认 URL 无 `status` ⇒ 组件发 `status=ALL`（显式）；切「已隐藏」⇒ URL `?status=HIDDEN`
⑤ 参数互不干扰：`?q=&status=&page=` 三者可共存，切换 `status` ⇒ `page` 回落 1
⑥ `api/audit.ts` / `api/reviews.ts` 队列函数各返回预期形状；**页面/组件层仍零直调 `apiGet`**（`grep` 复核）
```

⚠️ **注意**：门户是本批**最脆的回归面**——`useMarketQuery` 是共享 hook，**必须保持缺省即旧行为**；
若做不到「不传即零变化」，改用「本页自建薄 hook」并由你在批内拍板（**不许**直接改共享 hook 的缺省行为）。

---

### T6 · 前端：工作台三卡 landing

**Files**：`apps/web/src/pages/Dashboard.tsx`（现 **73 行** → 改造；路由不变）

**步骤**：
1. `PageHeader`（标题复用 `dashboard.title`）+ 三卡栅格（3 列；**单卡态保持 1/3 列宽左对齐**）
2. **请求裁剪（Q9 A）**：`role ≥ 10` ⇒ **3 请求并发**；`role < 10` ⇒ **只发 `/api/me/assets?status=ALL&limit=1`**，
   只渲染「我的资产」卡
3. 卡内容：待审核 = 全站队列 `total` → `/admin/reviews` · 我的资产 = 我名下全集 `total` → `/dashboard/assets` ·
   审计 = 5 行（**时间 + `action` 原文枚举 + `targetType`/`targetId`，不含操作人**）→ `/admin/audit`
4. **每卡独立三态 + 独立重试**（`Skeleton` / `ErrorState(onRetry 只重取该卡)`）
5. **零值照常显示「0」**；卡级 403 ⇒ **就地 `ErrorState`**（不退化为空态）
6. 结构：整卡 `<Link>` 覆盖层 + 内层 CTA 用**非 anchor** 样式化 `<span>`（`aria-hidden`）

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/web typecheck` + `bun run lint` exit 0
② `role < 10`（造数 role=1）：**只渲染 1 卡**；**页面自身业务请求数 = 1**（排除壳层 `me`/`stats`）
③ `role ≥ 10`：**3 卡 + 3 请求**；审计卡 5 行且**不含操作人字段**
④ 无嵌套锚点：`document.querySelectorAll('a a').length === 0`
⑤ 零值：`total = 0` ⇒ 显示「0」**而非**空态
⑥ 单卡 403（探针构造）⇒ **该卡** ErrorState，另两卡正常
⑦ 生产产物零 `M4b-` marker；门户 `m4a-dogfood.ts` **36/36**
```

⚠️ **注意**：`/dashboard` **已是真页**（M4b-2 T8 的过渡形态）⇒ 本 Task 是**替换实现**，不是新建路由；
过渡形态的「按档裁剪入口」逻辑可复用，`ComingSoon` 用法一并撤除。

---

### T7 · 前端：我的资产列表页 + 路由换真页

**Files**：`apps/web/src/pages/Assets.tsx`（**新建**）· `apps/web/src/main.tsx`

**步骤**：
1. **九列**（U5 v1.51 修订）：**名称**（`latestName` 回退 `slug` + slug 副行）· 类型（**无色 `TypeIcon`(16px) + 文案**，禁色底）· 状态（`StatusPill kind="asset"`）· **标签**（chips 2 + `+N`）· **下载** · **收藏**（star 依赖 · 未落地不渲染）·
   版本（`latestVersion`，`null` ⇒ `—`，`tabular-nums`）· 更新（`updatedAt` 短格式，`tabular-nums`）· 操作（`⋯`）
2. `FilterBar`：状态下拉（**默认「全部」⇒ 显式发 `status=ALL`**）+ q（debounce 300ms）
3. `useMarketQuery({ status: { defaultValue: 'ALL' } })` ⇒ `?status=&q=&page=`；筛选/搜索变更 ⇒ `page` 回落 1。
   **URL 写法零改动**（条⑤ P4，沿 hook 既有）：`q` 防抖 + `replace` 写 · `page` 即时写、`page=1` ⇒ **删参数** · 筛选变更**删 `page`**
4. 分页：**offset 替换式**（`ui/Pagination` 既有件）—— **双语义换算**（组件吃 `offset`、URL 用 `?page=`）：
   `offset={(page - 1) * limit}` · `onPageChange={(o) => setPage(o / limit + 1)}`（先例 `components/market/CenterPage.tsx:238-240`）；
   ★ **仅 `total > limit` 时渲染**（跨批契约 M4b-3 批 design §4.4.1 口径 —— 否则出「1 / 1」空控件）
5. ~~`⋯` 菜单~~ ⇒ **作废（v0.7 去菜单 · v0.9 去抽屉）**：列表**无行菜单、无抽屉**；操作列 = `Eye` 图标钮 **真链接直跳** `/assets/:slug`
   —— **按钮集与禁用与详情页管理区同一矩阵**（Q6 连带；抽屉已取消 · v0.16）
6. 空态**两套**（从未有资产 / 筛选无结果）；`< 1100px` ⇒ 容器**横向滚动不卡片化**
7. `main.tsx`：`/dashboard/assets` 的 `ComingSoon` → 真页 `<Assets />`；**删** `DEV_BATCH['/dashboard/assets']`（`:55`）
8. ~~接入 `AssetDrawer`~~ ⇒ **作废（v0.9）**：无抽屉；操作列 `Link` 直跳详情页（无 URL 中间态）

**验收断言**：
```
① typecheck + lint exit 0
② `grep -c "DEV_BATCH\['/dashboard/assets'\]" apps/web/src/main.tsx` = **0**；生产产物 marker 0
③ **九列**表头文案逐列命中（zh/en 各一次）
④ 默认加载：**实际请求 URL 含 `status=ALL`**（CDP 网络断言，非目测）
⑤ 切「已隐藏」⇒ URL `?status=HIDDEN` + 行集合变化；q 输入 300ms 后才写 URL 并请求
⑤b 分页：`total > limit` ⇒ 控件出现且页码 = `floor(offset / limit) + 1`；翻页 ⇒ URL `?page=2` 且行集合替换；
   **`total ≤ limit` ⇒ 控件不渲染**（防「1 / 1」空控件 —— 跨批口径）
⑥ 空态两套文案可分别触发且**不同**
⑦ `< 1100px`（视口收窄）⇒ `scrollWidth > clientWidth` 且**列不消失**
⑧ 门户 `m4a-dogfood.ts` 36/36 + `NO JS ERRORS`
⑨ **壳层零 diff**：`git diff --stat` 中 `components/ui/AppShell.tsx` / `SideNav.tsx` / `TopBar.tsx` **无改动**
   （壳层本批零改动 —— 批 design §2.1c 条④ P1–P4）
```

⚠️ **注意**：无数据时**不要**用「空态」替代「0 行」的合法结果——**只有筛选生效且确实无行**才算「筛选无结果」
空态（两套文案的判据 = 是否存在生效筛选）。

---

### T8 · ~~前端：资产管理抽屉~~ ⇒ **作废（v0.9）**

> **用户 2026-09-18**：「我们简单一点，这个抽屉不做了，取消，一点预览，直接进入完整详情」。
> ⇒ **本 Task 整条作废**：不新建 `AssetDrawer.tsx`；列表操作列的图标钮改为**真链接**（`Button asChild` + `Link`）
> **直跳 `/assets/:slug`**（该改动并入 **T7**）。连带：i18n 键少 6 个（T9 口径）、dogfood G7/G8 改为直跳断言（T11 口径）。
> 编号**保留占位**（不重排 T9–T16，避免引用错位）。

### T9 · i18n：新组 `assets` + `dashboard` / `common` / `errors` 补键

**Files**：`apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts`

**步骤**：按批 design §6 的**逐键表**落码：
1. 新组 **`assets`**（§6.1 **v1.7 口径全表**：页头 / **9 列** / 筛选 / 空态 3 / **无行菜单** / 标签 / 版本（**含 8 态徽章键**）/ 管理区 / toast）
2. `dashboard` **+8 键**（三卡标题与 CTA · 审计卡列头 · `viewAll`）；**卡标题复用既有 `myAssets`**
3. `common` **+1**（`loadMore`）；`errors` **+7 码**（6 个资产/标签码 + **`label.access_denied`**）
4. **不预支** M4b-6 的标签 CRUD 码

**验收断言**：
```
① `bun run --filter=@ai-asset-hub/web typecheck` exit 0（`Dict` 类型约束 ⇒ 缺键即编译错）
② 双语**双向差集 = 0**（脚本实测；zh 组数 = en 组数 = **12**）
③ **键数实测回填**（脚本）—— 禁用预估值；回填到批 design §6 与本 plan §7
④ 本批消费的 **7 个错误码**全部有文案（逐码 grep 命中）
⑤ 新增键**零孤儿**（每键至少一处引用）
⑥ 占位符一致性检查通过
```

⚠️ **注意**：本仓 i18n 计数**必须按顶层缩进解析**（嵌套对象计入会得假值——M4b-1 审计 F6 教训）；
落码后**立刻**跑脚本实测并把数字回填（AI 写的数字 = 声明，不是事实）。

---

### T10 · 规范同步（`05` §6.4 + `08` §7 · **随本批即改**，Q11 A）

**Files**：`docs/05-identity-access.md` §6.4 · `docs/08-data-model.md` §7（原地改写 + 版本头 + 修订记录）

**步骤**：
1. `05` §6.4:187：「非 ACTIVE 资产（HIDDEN/ARCHIVED）读面 = **仅超管**」→ **{owner 本人 / 管理档（`role ≥ 10`）/ 超管}**
2. `05` §6.4:161：超管行「全部权限（含非 ACTIVE 资产读面）」→ 去「含」的独占暗示
3. `08` §7：① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）② **ARCHIVED 运营语义补实**：
   `HIDDEN = 临时下架/可恢复` · `ARCHIVED = 长期退役/停止维护`（本批「恢复」动作的判据依据）
4. 两文档**版本头 + 修订记录**各加一行

**验收断言**：
```
① `bun docs/smoke/scripts/doc-audit.ts` exit 0（含 A 组版本头一致性 + 中立性检查）
② `05` §6.4 读面行新文本含三档表述，且**该行不再出现「仅超管」**
③ `08` §7 含 `HIDDEN`/`ARCHIVED` 运营语义分界句（grep 命中）
④ 两文档版本头最新版**在各自修订记录内**（doc-audit A 组）
⑤ 中立性：无公司名 / 内部仓编号 / 本机绝对路径（doc-audit 检查项）
```

⚠️ **注意**：规范层是**契约层** —— 改动**必须**与 T2 的实现语义逐字一致（授权集三档），
**不得**出现「规范写三档、代码四档」类漂移；改完**回读**该节全文（不只改的那一行）。

---

### T11 · 验证收尾（dogfood + 五门禁 + 证据 + 收尾回填）

**Files**：`docs/smoke/scripts/m4b4-seed-assets.ts`（**新建** · 造数）·
`docs/smoke/scripts/m4b4-personal-b-dogfood.ts`（**新建**）· `docs/smoke/2026-09-18-m4b4-personal-b.md`（**新建** · 证据）

**步骤**：
1. **造数**（**写库须用户授权**；口令从 env 读，仓库不落）：3 角色 + owner 三态资产 + **他人 ACTIVE 资产** +
   含 `PUBLISHED` / 仅 `DRAFT` 的版本 + 标签挂载（批 design §9.5）
2. **dogfood G1–G19** 全组（清单见批 design §9.3；登录态传入方式沿用既有脚本）
3. **五门禁**（同 CI 序，见 §4）+ 门户零回归 + chain-smoke
4. **证据文件**（含**权威行数表**：后续行数一律 `wc -l` 实测）
5. **收尾回填**（批 design §9.7）：主 design §11 键数实测 · 主 design §2.3 登记表本批行 ·
   `docs/00` §5 M4b-4 行状态 · 本文档 §7 落地记录
6. **出口五件**逐条判定（含第 ⑤ 件**整体审计**：全仓覆盖式扫描，findings 逐条登记 + 处置，不留未决项）

**验收断言**：
```
① `bun docs/smoke/scripts/m4b4-personal-b-dogfood.ts` ⇒ **G1-G19 全绿 + NO JS ERRORS**
② 五门禁逐项 **exit 0**（install --frozen-lockfile → typecheck → lint → format:check → doc-audit → build
   → db:migrate → CI=true bun run test；`test` **0 fail**，用例数 ≥ 基线 + 新增）
③ 门户零回归：`m4a-dogfood.ts` **36/36** · `m4a-chain-smoke.ts` **PASS**
④ `git diff --stat -- apps/server/drizzle packages/` **为空**（**零迁移**、零协议改动）
⑤ 证据文件含：门禁输出 · dogfood 输出 · 权威行数表 · 造数记录 · 出口五件状态 · 观感合规核对结论
⑥ 收尾回填四处**全部落地**（逐处 grep 命中新值），键数为**脚本实测值**
⑦ 整体审计 findings **逐条登记 + 处置**，无未决项
```

⚠️ **注意**：**观感只做合规核对**（有无错位/溢出/串色/异常），**审美定稿归 M4b-7**；
不要在本批做美化。dogfood 截图必须来自**真跑的真浏览器**（禁合成图当证据）。

---

> **实现期前置发现（T7 收尾侦察，2026-09-18）** —— 开工 T12 前须先补 **2 类件**（否则权限单点件 = 死代码）：
> 1. **`hooks/useViewer`（会话/档位读取）缺失** —— web 侧现无 `useSession`/viewer 抽象（`hooks/` 仅 `use-mobile`/`useApi`/`useMarketQuery`；`api/auth.ts` 为 better-auth 客户端）⇒ **按权限显隐的前提件**。
> 2. **写操作 wrappers 缺失** —— `api/assets.ts` 仅 3 导出（list/detail/params）· `api/labels.ts` 仅 `fetchLabels`
>    ⇒ 需补 `patchAssetStatus` · `deleteAsset` · `deleteVersion` · `yankVersion` · `attachLabel` · `detachLabel`。
> 3. `pages/AssetDetail.tsx`（M4a 只读页）**现零管理动作、零权限逻辑** ⇒ `lib/asset-permissions.ts` 必须与
>    `AssetAdminCard` + 版本行内动作**同批落**（单独落 = 无消费点死件）。
>
> ⇒ **T12 件数 = 原 4 新建件 + 上述 2 类补件**（**件表 新建 14 → 16**，实现时同步）。

### T12 · 前端：**资产详情页管理区**（改 M4a 已交付页 `pages/AssetDetail.tsx`）

**目标**：把「全部管理动作」落到**唯一完整视图**上，**逐动作按服务端守卫显隐**（批 design §4.6）。

**新建件（4）**
| 件 | 职责 |
|----|------|
| `lib/asset-permissions.ts` | **前端权限判定单点**：`canManage(viewer, asset)` / `canYank(role)` / `canPrivileged(role)` / `deletableStatuses(role)` —— 逐条对齐服务端真码（`assets/manage.ts:19` `canManageAsset` · `canYank` · 删版本状态门分治） |
| `components/console/AssetAdminCard.tsx` | 管理卡：资产状态（`action.hide`/`action.archive`/`action.restore`）/ 版本（`发布新版本` **占位** + yank）/ 审核（**占位**，M4b-5）/ 危险区（`danger.delete`）—— **整卡无可见动作 ⇒ 整卡不渲染** |
| `components/console/LabelCard.tsx` | 标签卡（**抽屉取消后唯一消费点 = 详情页右栏** · v0.16）：chips（`displayName`）+ × + 添加标签（`Popover`+`Command`）+ 特权标签（仅超管） |
| `components/console/asset-stats.tsx` | 下载/收藏展示小件（图标 + `compactCount` · **图标一律无色** · 收藏态表达可开关）—— 列表列 / 详情页元信息卡**两处共用**（~~抽屉统计行~~ 随抽屉取消 · v0.16） |

**改造 `pages/AssetDetail.tsx`**
1. 头卡：`h1` + `StatusPill` + **`[下载 vX.Y.Z]`**（主按钮，复用既有下载逻辑与 `market.dlLatest`）+ **`[收藏 N]`**（次级；**star 批未落地 ⇒ 不渲染**）+ 下载规则小字 + 标签行
2. 右栏：元信息卡补 **图标（下载/收藏，一律无色）**；插入 **`LabelCard`**；插入 **`AssetAdminCard`**
3. 主列「版本」Tab：行内加 **删除**（owner 2 态 / 管理档 4 态）与 **撤回分发**（仅管理档，仅 `PUBLISHED` 行）
4. 动作成功 ⇒ **局部重取**（详情重取 + `invalidateCache('/api/assets')`）

**断言**
① 访客 / 登录非 owner ⇒ **两卡均不渲染**（`document` 内无「管理」「标签+-」卡）② owner ⇒ 管理卡无「撤回分发」、无「特权标签」③ 管理档 ⇒ 有「撤回分发」、无「特权标签」④ 超管 ⇒ 有「特权标签」⑤ 版本 Tab：owner 视图「删除」仅 `DRAFT`/`SCAN_FAILED` 行 ⑥ 门户公开面（匿名）**零回归**（三 Tab 能力不变）⑦ 无 JS 错误

### T13 · 前端：`DataTable` 加性 prop `rowActionsHeader?`

**目标**：操作列可显**可见表头**（「操作」），不传 ⇒ 维持 `sr-only` 现状（**M4b-3 两页零回归**）。

1. `DataTable` props 加 `rowActionsHeader?: string`；表头渲染 `rowActionsHeader ?? <span className="sr-only">{rowActionsLabel}</span>`
2. 断言：① 本批列表页表头含「操作」② `Submissions.tsx` / `Tokens.tsx` **零 diff**（全仓 grep：仅本批传该 prop）

### T14 · 服务端 + 协议：**`labels` 形状升级为结构体**（Q14 = B · D5/D7 根治）

**目标**：标签随资产返回**结构体**（`{slug,type,displayName,parentId}`，对齐 skillhub `SkillLabelDto`）⇒ 前端零 join；
顺带闭合 **D5**（前端类型谎言）与 **D7**（门户 chips 空文案）。

1. `apps/web/src/api/types.ts`：标签形状类型改写（**v1.10 订正**：实测资产响应形状**不在** protocol，而在 web `api/types.ts` ⇒ 该处为形状 SSOT）
2. `labels/service.ts`：新增**批量** `labelsOfAssets(db, assetIds, locale)`（一次 `inArray` join `label_definition` + `label_translation`，**防 N+1**）；单资产 `labelsOfAsset` **保留**
3. `http/asset-item.ts`：`assetItem()` 增**可选** `labels` 形参（不传 ⇒ 不下发 ⇒ 公开列表面形状零变化）
4. `http/me.ts`：meta 批注入之外**并列一次批量 labels 查询**
5. `http/assets.ts` **详情路由**（`:294` 一带）传入 labels ⇒ D7 修复点
6. `apps/web`：`AssetItem.labels` 类型同步结构体；`AssetDetail.tsx:200-208` 改读 `displayName ?? slug`
7. `displayName` 语种 = `Accept-Language` 首段（与 `GET /api/labels` 同源）

**断言**
① 列表标签 chip 文案 = `displayName`（≠ slug）② 详情面 `labels[]` 为对象数组且含 `type`/`parentId` ③ 中文 `Accept-Language` ⇒ 「智能体」，`en` ⇒ 「Agentic」④ 批量查询**无 N+1**（SQL 计数断言）⑤ 门户详情 chips **不再空白**（D7 反证）⑥ 公开列表面响应形状（`assetItem` 14 字段）**零变化**

### T15 · 服务端 + 协议：**star 最小集**（**执行序最先** —— 能力先行）

**目标**：收藏关系 + 热度计数 + 读面 + 幂等端点（契约见批 design **§5.1 ⑧**）。

1. `db/schema/assets.ts`：新表 `assetStar`（`assetId`/`userId` 双向 FK `ON DELETE CASCADE` · `createdAt` · **`UNIQUE(assetId,userId)`**）
   + `asset` 增 `starCount: integer('star_count').notNull().default(0)`
2. `bun run db:migrate` 生成迁移（**生成物入库**；`meta/**` 沿既有 format 排除口径）
3. `assets/stars.ts`（新）：`starAsset` / `unstarAsset` —— **同事务**内 `INSERT ... ON CONFLICT DO NOTHING`（仅真正新增时 `star_count + 1`）
   / `DELETE`（仅真正删除时 `- 1`）⇒ 返回 `{ starCount, starred }`
4. 路由（`http/assets.ts`，`requireAuth`）：`PUT` / `DELETE /api/assets/:slug/star`（前置 `loadAssetBySlug` + **`assertAssetReadable`** ⇒ 授权集外 404）
5. 读面：`assetItem()` 增 `starCount`（读冗余列）与 `starredByMe`（**需登录态**；匿名 ⇒ `false`）⇒ `http/assets.ts` 列表/详情 + `http/me.ts` 三处传入
6. `apps/web/src/api/types.ts`：字段类型（**v1.10 订正**：形状 SSOT = web 类型；protocol 零改动）· `docs/08-data-model.md`：表 + 列（**Q11 A 随批即改**；T15 已落）
7. 测试（新 `http/stars.test.ts`）：幂等（两次 PUT ⇒ 计数 +1）· 两次 DELETE ⇒ 归零 · **匿名 401** · 授权集外 404 · `starredByMe` 三态

**断言**：① 两次 `PUT` ⇒ `starCount` +1 且 `starred=true` ② 两次 `DELETE` ⇒ 回基线 ③ 匿名 `PUT` ⇒ 401 ④ 他人收藏 ⇒ `starredByMe=false` 而计数 +1 ⑤ 非 ACTIVE 且我无权 ⇒ 404 ⑥ 全量测试无新红

### T16 · 前端：**star 接线**（四处消费 · T15 之后）

1. `api/stars.ts`（新）：`starAsset(slug)` / `unstarAsset(slug)`（写后 `invalidateCache`）
2. `components/market/StarButton.tsx`（新）：**详情页头卡**（门户卡不共用 —— 2026-09-18 改纯展示，见批 design F67）（已收藏 ⇒ 星形填充 · 未登录 ⇒ toast + `/login?next=`）
3. `pages/Assets.tsx`：列表「收藏」列接 `asset-stats`（`starCount`）
4. ~~`AssetDrawer` 统计行接 `starCount`~~ ⇒ **作废（v0.9 抽屉取消）**：star 在列表列 + 详情页头卡两处消费
5. `pages/AssetDetail.tsx` 头卡：`StarButton` 接 `starredByMe` / `starCount`
6. `components/market/AssetCard.tsx`：门户卡元信息行加**纯展示**收藏数（`AssetStat kind="star"`，与下载同件同款 —— **不响应点击** · 2026-09-18 用户拍板，见批 design **F67**）

**断言**：① 收藏数字一致 —— **G17 = 列表「收藏」列 = 详情页头卡 = 接口 `starCount`**（抽屉取消后为**两处 UI + 接口**）② 未登录点收藏 ⇒ **不发写请求** + 跳 `/login?next=`（**G18** · 入口 = **详情页头卡**）③ 幂等以 **API 两次 `PUT`** 判（**G15** —— 原「UI 连点两次」口径属歧义，已作废见 **F60**）④ 门户零回归 = **`m4a-dogfood` 36/36** 实跑基线（+ 本批 **G14b**：门户卡星标纯展示 + 点击穿透）

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```
bun install --frozen-lockfile
  → bun run typecheck → bun run lint → bun run format:check
  → bun docs/smoke/scripts/doc-audit.ts        # 文档体检（纯只读不连库）
  → bun run build → bun run db:migrate         # 本批零迁移，仍跑（守门）
  → CI=true bun run test
```

- 测试库口径 = **单库 + 干净 schema + `CI=true`**（CI 只建一个库，本地自建库在 CI 不存在）
- 测试**禁止无条件改写 `process.env`**（用 `??=` 兜底）；**只依赖自己造的数据**
- 单包快跑：`bun run --filter=@ai-asset-hub/server typecheck` / `--filter=@ai-asset-hub/web typecheck`
- 本批**不新增**任务依赖 env（`turbo.json` 无需改动）

## 5. 造数需求（**写库需用户授权**）

见批 design §9.5（6 类数据）；脚本 `docs/smoke/scripts/m4b4-seed-assets.ts`（**幂等 upsert · 可重放**）。
**star 造数（v0.8 追加）**：他人收藏 owner 资产 1 次 + owner 自己收藏 1 条 ⇒ 覆盖 G15/G16/G17。
**档位需求（v0.7 追加 · T12/G11 依赖）**：`owner 本人` / `管理档（role 10）` / `超管（role 100）` / **匿名** 四档账号
—— 详情页管理区**逐档断言**需要三档已登录账号（口令走 env，仓库不落）。
要求：口令从 **env** 读（`SMOKE_*_PASSWORD` 惯例）；**仓库内不落任何口令 / 连接串**；首次写库**先取授权**。

## 6. 风险与回退

| # | 风险 | 触发信号 | 回退 / 处置 |
|---|------|---------|------------|
| R1 | **门户回归**（`useMarketQuery` 共享 hook 被改坏） | `m4a-dogfood.ts` < 36/36 或 `CenterPage.tsx` 出现 diff | 立即回退 hook 改为「本页自建薄 hook」；**门户零回归优先** |
| R2 | **公开面参数化语义漂移** | 公开列表返回非 ACTIVE 行 / 字段集变化 | 检查条件组装分支；回归锁断言（T4 ⑤）必须绿才继续 |
| R3 | **R6-b 授权集过宽** | 非 owner 非管理档能读非 ACTIVE（404 变 200） | 回查 `assertAssetReadable` 判定表达式；三档对照断言必须逐档命中 |
| R4 | **抽屉 latest 投影全空**（漏批注入） | 九列「名称」显示 slug、「版本」列全 `—` | 补 `loadAssetItemMeta` 调用（T3 步骤 2 的 ★ 步） |
| R5 | **既有断言被「改弱」而非「契约更新」** | `git diff` 出现删除既有 `it` / 放宽无关断言 | 逐行 `git diff` 核对（T4 ②）；**只允许** :418 与 :844-857 语义翻转 |
| R6 | 造数写库影响既有数据 | — | **必须先授权**；脚本幂等 upsert；不删既有数据 |

## 7. 落地记录（执行期回填）

> 待执行。模板（对齐 M4b-1/M4b-3 先例）：

| 项 | 内容 |
|----|------|
| 提交链 | **待提交（本地攒 commit，等用户 push/commit 口令）** —— 本批代码与文档同批提交，commit 号于提交后回填 |
| 门禁 | 八步全 **exit 0**：`install --frozen-lockfile`（no changes）· `typecheck` · `lint`（1 条**预存在** warning）· `format:check` · `doc-audit`（**64 PASS / 0 FAIL**）· `build`（4/4）· `db:migrate`（零迁移守门）· `CI=true bun run test`（**server 551** / protocol 27，**0 fail** —— 含 T11-c 补测 14 例）· **覆盖探针** `bun test --coverage`（全仓 **95.60/96.28** · `http/assets.ts` **90.97 → 95.96**）|
| dogfood | **G1–G19 + G12b + G14b = 60 PASS / 0 FAIL / CDP 超时 0** + **`NO JS ERRORS`**；门户零回归 `m4a-dogfood` **36/36** + `m4a-chain-smoke` **PASS**；截图 **7 张** · ⚠️ 顺序恒为 **seed → dogfood**（G12b 会真撤回）|
| i18n 键数 | **12 组 · zh = en = 323 键**（双向差集 0）· `assets` **79** · `errors` **35** · **en 值级中文泄漏 0**（脚本实测）|
| 权威行数表 | 见证据文件 §7（14 个文件 `readFileSync` 计数；dogfood 脚本 **709** 行 / 种子 **313** 行）|
| 出口五件 | ① design 8 维 **9.69** ✅ ② **T1–T16 全绿** ✅ ③ 五门禁 exit 0 ✅ ④ dogfood **53/0** + 门户 36/36 ✅（观感待用户实机 ⬜）⑤ 整体审计**无未决项** ✅ |
| 未证项 | 8 条（证据文件 §10）：提审入口归 M4b-8 · 两个禁用占位（发布新版本/审核）· 特权标签占位归 M4b-6 · 12 个未消费键 · 上传者例外面 UI 不可达 · 术语待定 · 原型 toast · 视觉归 M4b-7 |

### 7.4 T15 实现期发现（v0.10）

- **F36 订正**：批 design §5.1 ⑦/⑧ 的「`packages/protocol` 增字段（协议 = SSOT）」**失真** —— 资产响应形状实际在
  `apps/web/src/api/types.ts`（协议无此形状）⇒ 本 plan **T14/T15/T16 的 Files 与步骤已同步**（T15 类型列 `server + protocol` → **`server`**）
- **F37 登记**：T4 补「并发双向写入 / 用户删除级联」用例（T15 已实现 9 用例，覆盖幂等/语义/守位）

## 8. 自检打分（初稿）

> 门禁 = 8 维 ≥9（标准 4 + 深度 4），口径同批 design。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.7** | 11 个 Task 覆盖批 design 全部 9 项交付（服务端 4 · web 5 · 规范 1 · 收尾 1）；每 Task 含 Files / 步骤 / **验收断言** / ⚠️ 注意；含门禁顺序 · 造数 · 风险回退 · 落地记录 · 修订记录 |
| 标准 2 准确性 | **9.6** | Task 内的 `file:line` 与行数均**实测**（`service.ts:30-38`/`:177`/`:242` · `assets.ts:111`/`:163-175`/`:279-287` · `main.tsx:55` · `labels/service.ts:573` · `Dashboard.tsx` 73 行 · `useMarketQuery` 104 行）；断言为可执行命令或可断言的 DOM/网络事实 |
| 标准 3 一致性 | **9.7** | 与批 design §3–§9 逐条对应（件表 / 页面规格 / 服务端改动 / 测试面 / i18n / dogfood G1-G15）；命名合规（`M4b-4-me-assets-and-console.md`，与批 design backlog 预期名一致） |
| 标准 4 可用性 | **9.7** | 执行者按序照做即可：T1 纯重构（断言不许改）→ T2 改判定 → T3 新端点 → T4 测试 → T9 键 → T5-T8 前端 → T10 规范 → T11 收尾；每步有可判定的绿/红 |
| 深度 1 追溯性 | **10** | 每 Task 带 `file:line` 与「改前/改后」；断言带命令；缺口（提审入口 / PRIVILEGED）显式登记并注归属批 |
| 深度 2 反证 | **9.4** | 含「未改测试前预期仅 2 处红（不是回归）」的**反证式**说明 · 风险与回退 6 条 · T1「若需改测试则回查 T1 而非改测试」的自我约束；**扣分 = 未展开被否决选项对照**（按用户口径**有意**不入档） |
| 深度 3 边界/风险 | **9.6** | 六类风险及回退（门户回归/参数漂移/授权过宽/漏批注入/改弱测试/造数授权）；「禁用 vs 不占位」易混点显式提示；`< 1100px`、加载中禁用、零值显示等边界断言齐 |
| 深度 4 维护性 | **9.6** | 收尾回填四处显式列出；权威行数表纪律写明；T9 键数**禁预估值**；证据文件与 `docs/smoke/` 惯例一致 |

**初稿均分 = 9.66**（窄口径自报）

### 8.1 换靶复核（v0.2 · 2026-09-18 · **不重复上轮角度**）

> 换靶角度：**机制声明的实测复核**（件 props 是否真支持声明的用法）· **跨批契约承接检查** · **可执行性回读**（断言能否照写）。

| # | 严重度 | 位置 | 新发现 | 处置 |
|---|:------:|------|--------|------|
| **P1** | 🟡 | T7 步骤 4 · T3 步骤 2 | **`Pagination` 是 `offset` 语义、URL 是 `?page=`**（实测 `Pagination.tsx:33-41`）—— 原稿只写「换算」，实现者可能直传 `page`；且**漏承接「仅 `total > limit` 渲染」**（M4b-3 已修的「1 / 1 空控件」缺陷） | ✅ **已补**（换算公式 + 先例 + 渲染条件 + 断言 ⑤b） |
| **P2** | 🟡 | T3 步骤 2 | me 面 schema **上限未声明**（公开面实为 `limit ≤100` / `q ≤100`） | ✅ **已补**（逐项对齐 + 引 `validate/base.ts:32`） |
| **P3** | ⚪ | T8 步骤 1 | 「宽覆盖 `sm:max-w-[560px]`」措辞失真（`Drawer` **无宽度 prop**、560 已在件内） | ✅ **已改**（标明勿改件） |

**换靶实测通过项**：`DataTable.rowActions(row)` · `FilterBar.statusOptions`+`q` · `ConfirmDialog.requireReason`（`onConfirm(reason?)`）·
`StatusPill` 的 `ASSET_STATUS_VARIANT`/`VERSION_STATUS_VARIANT` 四件 props 与 plan 用法**逐项吻合**；
`request.invalid` 已落码且 `errors` 有文案。

**复评（换靶口径 · 修前 → 修后）**

| 维度 | 修前 | 修后 | 依据 |
|------|:----:|:----:|------|
| 标准 1 完整性 | 9.7 | **9.7** | 3 项新发现闭合后无已知缺口 |
| 标准 2 准确性 | 9.5 | **9.6** | 件能力与 schema 上限按真码订正 |
| 标准 3 一致性 | 9.5 | **9.6** | 补承接跨批 `Pagination` 口径 |
| 标准 4 可用性 | 9.6 | **9.7** | 换算公式 + 渲染条件可照写 |
| 深度 1 追溯性 | 9.9 | **10** | 补 `requireAuth` 落点 |
| 深度 2 反证 | 9.4 | **9.4** | 不变（被否决选项不入档） |
| 深度 3 边界/风险 | 9.6 | **9.7** | 空控件 / 上限边界已承接 |
| 深度 4 维护性 | 9.6 | **9.6** | 不变 |
| **均分** | **9.60** | **9.66** | ≥9 ⇒ **达门** ✅ |
**撤回声明**：上轮自报 **9.66** 系窄口径产物（未做件能力实测与跨批承接检查），**旧分撤回**。

### 8.2 原型轮复核（v0.7 · 2026-09-18 —— **角度 = 批次映射完整性 / 依赖闭环 / 断言可执行性**）

> 本轮检验：批 design v1.7 的**新增面**（详情页管理区 · labels 结构体 · 共用件）在**计划侧**是否全部有 Task 承接、
> 断言是否可执行、依赖是否闭环。

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **P1** | 🟡 | §2 Task 总览 | 批 design 新增 4 个共用件 + `AssetDetail` 改造后，**计划侧无 Task 承接**（T1–T11 只覆盖到抽屉） | ✅ **已补 T12**（含 4 新建件与改造清单 + 7 条断言） |
| **P2** | 🟡 | §2 Task 总览 | `DataTable` 加性 prop 无 Task（T7 会隐式依赖） | ✅ **已补 T13** + T7 依赖改为 `T5,T13` |
| **P3** | 🟡 | §2 Task 总览 | `labels` 结构体化（含协议 + 5 处服务端落点）无 Task | ✅ **已补 T14**（依赖 `T1,T3`）· T8 依赖补 `T12` |
| **P4** | ⚪ | §5 造数 | 详情页管理区断言需 **3 档已登录账号**，造数口径未说明 | ✅ **已补**档位需求（口令走 env，仓库不落） |
| **P5** | ⚪ | §7 落地记录 / §6 R4 | 仍写「G1-G13」「六列」旧口径 | ✅ **已改** G1-G15 / 九列 |
| **P6** | 🔴 | §1 目标表 · §2 Task 总览 · T7 步骤1/断言③ · T8 标题 · T9 步骤1 · T11 · §8 | **旧口径散点 7 处**（六列 / 四段抽屉 / `⋯` 行菜单 / G1–G13）—— 主口径已在 §2 更新，**散点未跟** ⇒ 实现者按 T7/T8 照抄会**做回旧形态**（最严重：T7 步骤 1 明写「六列（类型色块）」） | ✅ **已修 7 处**（九列 / 纯预览 / 无行菜单 / G1–G15；T8 步骤 9 行菜单入口**作废并留痕**） |
| **P7** | ⚪ | §8 初稿 / §8.2 | 均分自算核对：初稿 8 维 77.3 ÷ 8 = **9.66** ✓（算术正确）；本轮 8 维表 76.8 ÷ 8 = **9.6** | ✅ **已核**并写明依据（不预填为已证值） |

**维度复评（v0.7 · 8 维口径 —— 与 §8 同维集）**

| 维度 | 分数 | 依据（含本轮变动） |
|------|:----:|------|
| 标准 1 完整性 | **9.7** | T1–T16 与批 design 件表一一对应（服务端 5 + star 2 · web 8 · 规范 1 · 收尾 1 —— **v0.8 star 并入后**） |
| 标准 2 准确性 | **9.6** | 行数 / `file:line` 实测；本轮发现 1 类散点（P6）已修 |
| 标准 3 一致性 | **9.6** ↓ | **本轮暴露**：T7/T8/T9/T11 与 §1 目标表**共 7 处**仍写旧口径（六列 / 四段 / 行菜单 / G1–G13）⇒ 已修，如实下调 9.7 → 9.6 |
| 标准 4 可用性 | **9.6** ↓ | T7 步骤 1 曾写「六列（类型色块）」⇒ 实现者会照抄旧形态（已修）；仍 2 项待拍板 + **star 依赖**（3 处 UI 断言需 star 批落地后才可跑） |
| 深度 1 追溯性 | **9.8** | R 编号 ↔ Task 双向可查；每 Task 带 `file:line` 与改前/改后 |
| 深度 2 反证 | **9.4** | 含反证式说明与自我约束；被否决选项按用户口径不入档 |
| 深度 3 边界/风险 | **9.6** | 六类风险及回退 + 禁用/不占位易混点 + 响应式与状态边界断言 |
| 深度 4 维护性 | **9.5** ↓ | **本轮暴露流程缺陷**（口径变更未做全文散点扫）⇒ 下调；纪律补在批 design §9.7 |
| **均分** | **9.6** | 9.7+9.6+9.6+9.6+9.8+9.4+9.6+9.5 = 76.8 ÷ 8 = **9.6** ⇒ ≥9 **达门** ✅ |

> ⚠️ 分数**不预填为已证值**：实现期以实际断言结果为准（批 design §9.7 收尾回填口径）。

### 8.3 star 并入后复核（v0.8 · 2026-09-18 —— **角度 = 需求变更的容量吸收 / 执行序**）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **P8** | 🔴 | §2 Task 总览 | star 并入后**计划侧无 Task**（批 design v1.8 已加 §5.1 ⑧ 契约 + 件表 3 新件 / 2 改造） | ✅ **已补 T15（服务端·最先）+ T16（前端接线）**，依赖链写明 |
| **P9** | 🟡 | 全局 | **执行序**：用户意图「先做 star」在并入后必须由 **Task 顺序**承载（不再有前置批） | ✅ **已写明**：首批动作 = **T15** → T13 → T9 → T12/T7/T8 → T16 → T1–T4/T14（服务端原计划）… |
| **P10** | ⚪ | §5 造数 / §4 门禁 / 头部 | 造数、批间门、状态行仍是并入前口径 | ✅ **已改**（star 造数行 / T1–T16 / 执行序说明） |

**维度复评（v0.8 · 8 维）**：完整性 **9.7**（T1–T16 ↔ 批 design 件表一一对应）· 准确性 **9.7** · 一致性 **9.6**（保持）·
可用性 **9.7**（T15/T16 步骤与断言可照做）· 追溯 **9.8** · 反证 **9.4** · 边界 **9.6** · 维护性 **9.5**
⇒ **均分 9.63**（9.7+9.7+9.6+9.7+9.8+9.4+9.6+9.5 = 77.0 ÷ 8 = 9.625 ≈ 9.63）

### 8.4 抽屉取消后复核（v0.9 · 2026-09-18 —— **角度 = 承重 Task 退役 / 编号稳定性**）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **P11** | 🟡 | §2 Task 总览 · §3 T8 明细 | 抽屉取消 ⇒ **T8 失去交付物** | ✅ **已作废**（明细节保留为「作废说明」，不删锚点）；**编号保留占位**（不重排 T9–T16 ⇒ 零引用错位） |
| **P12** | 🟡 | T7 步骤 2 · 断言 | 操作列仍是「开抽屉」语义（`ScanEye` + `setDrawerOpen`） | ✅ **已改**：`Eye` 图标钮 + `Link` 真跳转；断言 = `<a href>` + 点击后 `pathname` + **全站无 `[data-slot="sheet-content"]`** |
| **P13** | ⚪ | §4 门禁顺序 / §5 造数 / §7 落地记录 | 无变化（抽屉不涉门禁与造数） | ✅ 已核（**零改动**，如实登记） |

**维度复评（v0.9 · 8 维）**：完整性 **9.7** · 准确性 **9.7** · 一致性 **9.7** · 可用性 **9.7** · 追溯 **9.8** ·
反证 **9.4** · 边界 **9.6** · 维护性 **9.5** ⇒ **均分 9.64**（9.7+9.7+9.7+9.7+9.8+9.4+9.6+9.5 = 77.1 ÷ 8 = 9.6375 ≈ 9.64）

### 7.5 逐 Task 自检打分（2026-09-18 起 · 每 Task 收尾即做）

> 用户明确纪律：**每个 Task 做完即自测 + 自检打分**（不留到批收尾）。逐 Task 均分与扣分依据见
> 批 design **§11.9**（同表维护，避免双份）。

| Task | 状态 | 均分 | 门禁 |
|------|:---:|:--:|------|
| T1 / T2 / T3 / T4（服务端读面） | ✅ 已实现 | 9.58 / 9.71 / 9.70 / 9.65 | typecheck ✓ · 536 tests / 0 fail ✓ |
| T5（api + hook）· T9（i18n）· T10（规范）· T13（prop） | ✅ 已实现 | 9.62 / **9.42** / 9.56 / 9.63 | typecheck ✓ · doc-audit 64/0 ✓ |
| T15（star 服务端） | ✅ 已实现 | 9.55 | 迁移 0012 落库 ✓ · stars.test 9/9 ✓ |
| T7（列表页）· T14（labels 结构体） | ✅ 已实现 | 9.46 / 9.47 | 明细见批 design §11.9（F51 订正：本表原误记 ⬜）|
| **T12**（详情页管理区 + 6 新建件 + 3 处 api wrappers） | ✅ 已实现 | **9.43** | typecheck ✓ · lint ✓（1 条**预存在** warning）· format:check ✓ · build ✓ · 门户 dogfood **36/36 + NO JS ERRORS** ✓ · 匿名详情页 CDP 实测 ✓（认证四档归 T11）|
| **T16**（star 接线：`api/stars` + `StarButton` + 两处消费） | ✅ 已实现 | **9.41** | 匿名路径 CDP 实测 ✓（零写请求 + 跳登录 + toast）· 门户 dogfood **36/36** 复跑 ✓（认证态写路径归 T11）|
| **T6**（工作台三卡 landing） | ✅ 已实现 | **9.43** | typecheck/lint/format:check/build ✓ · 匿名 G1 归位实测 ✓（认证态 3 卡/请求数归 T11 dogfood）|
| **T11-d**（验收期 UI 调整轮：卡片图标/版本号/星标三连） | 代码 18 维 | **9.59** | 门户卡：下载图标统一 `AssetStat` · 去版本号 · 星标改**纯展示**（与下载同款）+ 位置移下载右侧；`StarButton` 收敛单一形态（撤 `compact`/`form`）；卡片改覆盖层 Link；dogfood **G18 改口径 + G14b 新增** ⇒ **60 PASS / 0 FAIL**；F67 登记 |
| **T11-c**（覆盖补测轮：yank 路由 14 例 + dogfood G12b） | 代码 18 维 | **9.64** | 新增 `http/yank-route.test.ts`（14 例全绿）+ dogfood **G12b**（58 PASS）；`http/assets.ts` lines **90.97 → 95.96**（683-713 由 0 → 覆盖）· 全仓 **95.60/96.28** · 测试 **537 → 551**；F65（审计缺覆盖探针）/F66（web 零测试基建 ⇒ 归 M4b-7）登记 |
| **T11-b**（T8 作废散点订正轮 · 文档面） | 文档 15 维 | **9.22** | **14 处**活口径散点订正（首轮 8 + **换靶精修谓词再挖 6**；含跨文档 `asset-stats` / star 读面「三处 → 两处」口径收敛）+ F64 登记 + 两份审计脚本（关键字谓词 + **活口径谓词**）；**口径撤回**：上轮「整体审计无未决项」为**关键字口径**产物 ⇒ 改判「关键字残留 0 · **语义散点 14 处**」并逐处订正。扣分处 = ④文档-代码对齐 **8.5** · ⑪内部一致 **8.5** · ⑫系统一致 **8.6**（散点复发 + 首轮漏项）|
| **T11**（验证收尾：造数 + G1–G19 + 五门禁 + 证据） | ✅ 已完成 | —（验证件，不单列均分） | 造数 4 账号/4 资产/6 版本/2 标签/2 star · dogfood **53 PASS / 0 FAIL / NO JS ERRORS** · 八步门禁 exit 0 · 证据 `docs/smoke/2026-09-18-m4b4-personal-b.md` 已回填 |

### 7.6 T12 实现期发现（v0.12 · 明细见批 design §11.9）

- **F48** `VersionCompare` 加性 `rowActions?`（§3.2 改造件未列 ⇒ 改造件 +1）· **F49** `asset-stats` 消费点收敛为「列表 + 详情」两处并回改 `pages/Assets.tsx`
- **F50** 5 个「禁用 + 说明」族键成死键（Q1 拍「不渲染」）⇒ T11 收尾列「未消费键」清单
- **F51/F52** 计划表 T7/T14 误记 ⬜ + design 分数漂移（本轮订正）
- **F53** 「特权标签」按钮本批**禁用占位**（候选源恒不含 PRIVILEGED ⇒ 归 M4b-6）· **F54** i18n **补 14 键**（§6 键表未列确认框文案 ⇒ `ConfirmDialog` 无法落码）· **F55** `en.ts` **3 值中文泄漏**（T9 落码缺陷，已修）
- **F56** 版本级 yank 仅落**行内动作**（管理卡内无对象）· **F57** `api/client.ts` 补 **`apiPut`**
- **T16 追加（v0.13）**：**F58** 门户卡 `<Link>` 收窄（防收藏按钮嵌 `<a>`）· **F59** 收藏按钮两形态（详情文字 / 门户紧凑）· **F60** **G15 语义订正** —— 幂等判据 = **API 两次 `PUT`**（**不是** UI 连点两次；UI 为切换语义，连点 = 收藏后取消）
- **T11-d 追加（v0.18）**：用户验收期逐条拍板三条 UI 调整（下载图标一致 / 去版本号 / 星标纯展示 + 位置）⇒ 连带 `StarButton` 形态收敛（撤 `compact`/`form`，避免死代码）· 收藏交互唯一入口 = 详情页 · dogfood G18 改指详情页 + 新增 G14b（纯展示反证 + 点击穿透）· 期自身一处脚本缺陷留痕（G14b-2 锚点用了「首卡」而非「含 h3 的资产卡」）
- **T11-c 追加（v0.17）**：**F65** 整体审计**缺「覆盖探针」维度**（skill 明列角度未用）· **F66** `yank` 路由层整段零覆盖（本批 T12 首接 UI 入口）+ **web 包零测试基建**（归 M4b-7/另立项）；补测期自身两缺陷留痕 = 清理链序（`asset_version.asset_id` FK 无 onDelete ⇒ 先删版本）+ 对话框探测器（官方 `AlertDialog`）
- **T6 追加（v0.14）**：**F61** 卡形态取「内容即 `<Link>`」（非设计字面的覆盖层 —— 覆盖层吞掉独立重试按钮的点击）· **F62** 欢迎语作页头副述 + `state.notice` 链路保留 · **F63** 会话未就绪**零业务请求** + 整块骨架（保 G2/G3 请求数断言稳定）

> 执行期判断项（用户未逐条拍板，主动申报）：**F53** 的 tooltip 复用 `label.privileged`；**F56** 的落点选择；**T7 已落文件回改**（F49，纯重构）。

## 9. 修订记录

| **v0.18** | 2026-09-18 | sunxuewen-rush | **验收期 UI 调整轮（T11-d · 代码 18 维 9.59）** —— 用户逐条拍板：① 门户卡下载图标与详情一致（`⇣` → `AssetStat`）② 去卡片版本号 ③ 星标**纯展示**（与下载同件同款）+ 移到下载右侧；连带 `StarButton` 收敛单一形态、收藏唯一入口 = 详情页、卡片改覆盖层 Link、dogfood **G14b 新增 + G18 改口径** ⇒ **60 PASS / 0 FAIL**；F67 登记 |
| **v0.17** | 2026-09-18 | sunxuewen-rush | **T11-c 覆盖补测轮（代码 18 维 9.64）** —— 用户追问「自测完成并做过 coverage 了么？」⇒ ① **F65**：整体审计**缺「覆盖探针」维度**（skill 明列换靶角度未用）② **F66**：`POST /:slug/versions/:version/yank` **路由层整段零覆盖**（`http/assets.ts:683-713`；服务层 100%；本批 T12 首接 UI 入口）⇒ 补 `yank-route.test.ts` **14 例** + dogfood **G12b**（真点击 ⇒ 状态翻转/下载 400/重复 400）；**web 包零测试基建** ⇒ 归 **M4b-7 / 另立项** ③ 实测：测试 **537 → 551**（0 fail）· dogfood **53 → 58** · 覆盖 `http/assets.ts` **90.97 → 95.96** · 全仓 **95.60/96.28** ④ §7.5/§7.6/§7 落地记录同步 ⑤ **无产品代码改动**（纯测试 + 脚本 + 文档）|
| **v0.16** | 2026-09-18 | sunxuewen-rush | **T8 作废散点订正（14 处 · 文档 15 维自检 9.22）** —— ① 订正：§1 目标表 #2 操作列（「快速预览」→ `Eye`「打开详情」真链接）· #3 抽屉行标**作废** · §1 缺口段表述（去「抽屉」）· §2-T16 行**去 `T8` 依赖与 `AssetDrawer.tsx` 件列** · T7 步骤（「与抽屉同一矩阵」→「与详情页管理区同一矩阵」）· T12 件表 LabelCard（去「与抽屉段同件」）与 asset-stats（**三处 → 两处共用**）② **F64 登记**：作废件残留审计**只查关键字不判语义** ⇒ 无「作废」字样的活口径行被漏扫；`m4b4-audit-scan.sh` 已加「活口径谓词」③ **口径撤回**：T11「整体审计无未决项」为关键字口径产物 ⇒ 改判「关键字残留 0 · 语义散点 8 处已订正」（证据 §5/§6 A4 同步）④ 头部补回 v0.11 行（原仅存于修订表）⑤ **换靶再挖**：精修「活口径谓词」（裸「抽屉」噪声过大 → 收窄为交付物形状词）后补抓 **批 design 5 处 + 主 design 1 处** ⇒ 合计 **14 处**；打分由 9.28 **下修 9.22** ⑥ 无代码改动 |
| **v0.15** | 2026-09-18 | sunxuewen-rush | **T11 收尾完成（本批末件）** —— ① Status → **✅ 全绿**（T1–T16 · T8 作废）② §7 落地记录回填：八步门禁 **exit 0**（`test` server 537 / protocol 27 · 0 fail）· dogfood **G1–G19 = 53 PASS / 0 FAIL / NO JS ERRORS** · 门户零回归 **36/36** + chain-smoke **PASS** · i18n **323 键 / 12 组** · 权威行数表指针（证据 §7）· 出口五件全 ✅（观感待用户实机 ⬜）· 未证项 8 条 ③ §7.5 补 T11 行 ④ 造数（已获用户授权）· 证据 = `docs/smoke/2026-09-18-m4b4-personal-b.md` ⑤ **提交待用户口令**（本地攒 commit）|
| **v0.14** | 2026-09-18 | sunxuewen-rush | **T6 实现期回写** —— ① §7.5 补 **T6 均分 9.43** ② §7.6 追加 **F61–F63** ③ Status：代码侧仅剩 **T11**（依赖 = 造数写库授权 + `SMOKE_M4B2_PASSWORD`；两脚本已落仓）④ 本轮门禁实测：typecheck / lint / format:check / build exit 0 · doc-audit **64 PASS / 0 FAIL** |
| **v0.13** | 2026-09-18 | sunxuewen-rush | **T16 实现期回写** —— ① §7.5 补 **T16 均分 9.41** ② §7.6 追加 **F58–F60**（**F60 = G15 语义订正**：幂等以 API 两次 PUT 判 —— 防 T11 用 UI 连点误红）③ Status 行待做收窄为 **T6 / T11** |
| **v0.12** | 2026-09-18 | sunxuewen-rush | **T12 实现期回写** —— ① §7.5 补 **T12 均分 9.43** + **订正 T7/T14 误记 ⬜**（F51）② 新增 **§7.6** 记录 **F48–F57**（含 🔴 F54 i18n 缺口 14 键 / 🟡 F55 en 3 值中文泄漏）③ Status 行 ⬜ → **🔵 执行中**（已实现 11 项）④ 头部分数改「以版本头为准（现行 9.69）」（F52）⑤ 件表计数（新建 **16** / 改造 **19**）回填点 = 批 design §9.7 ⑥（本文档零重复）|
| **v0.11** | 2026-09-18 | sunxuewen-rush | **逐 Task 收口打分落地（新纪律）** —— 新增 **§7.5**（每 Task 收尾即自测 + 打分）；T1–T5/T9/T10/T13/T15 均分 9.42–9.71（明细见批 design §11.9）；本轮修 **F38/F41/F42/F43**（含 🔴 漏 3 键）—— 本版为**实现期回写** |
| **v0.10** | 2026-09-18 | sunxuewen-rush | **T15 实现期发现同步** —— ① **F36**：T14/T15/T16 的 Files 与步骤订正（形状 SSOT = `apps/web/src/api/types.ts`，protocol 零改动；T15 类型列改 **`server`**）② **F37**：T4 补并发/级联用例（登记）③ 新增 **§7.4** 记录实现期发现 ④ **T15 已实现并通过**（527 tests / 0 fail · 迁移 0012 落库）—— 本版为**实现期回写** |
| **v0.9** | 2026-09-18 | sunxuewen-rush | **抽屉取消（用户「简单一点，抽屉不做了，取消，一点预览，直接进入完整详情」）** —— ① **T8 整条作废**（保留编号占位，不重排 ⇒ 零引用错位）② **T7 口径改**：操作列 = `Eye` 图标钮 **`Link` 真链接**直跳 `/assets/:slug`；断言改「`<a href>` + `pathname` + 全站无 sheet 反证」③ 批间门 / 状态行注明 **T8 作废** ④ **§8.4 复核 P11–P13** ⇒ **均分 9.64**（77.1 ÷ 8）⑤ 本版**零实现改动** |
| **v0.8** | 2026-09-18 | sunxuewen-rush | **star 最小集并入 → 新增 T15/T16（用户「不要单独开 M4-star」→ 确认并入）** —— ① **T15 star 服务端（执行序最先）**：schema + 迁移 + `assets/stars.ts`（同事务幂等计数）+ `PUT`/`DELETE` 端点 + `starCount`/`starredByMe` 读面 + 协议 + `08` 规范 + 新测试文件 ② **T16 star 前端接线**：`api/stars.ts` + `StarButton`（门户/详情共用）+ 列表列 + 抽屉统计 + 门户卡 ③ 批间门 **T1–T16** · 状态行写明**执行序 = T15 最先** ④ §5 造数补 star 行 ⑤ **§8.3 复核 P8–P10 三项处置** ⇒ **均分 9.63**（77.0 ÷ 8）⑥ 本版**零实现改动** |
| **v0.7** | 2026-09-18 | sunxuewen-rush | **原型评审收口（R1–R23）**（含 §8.2 原型轮复核 P1–P5 + **落档一致性轮 P6–P7** · 8 维重打 **9.6**） —— ① 新增 **T12**（详情页管理区 + 4 新建件：`asset-permissions` / `AssetAdminCard` / `LabelCard` / `asset-stats`）② 新增 **T13**（`DataTable` 加性 prop `rowActionsHeader?`）③ 新增 **T14**（`labels` 结构体化 · Q14 = B · D5/D7 根治）④ **T7** 口径改九列 + 类型去色 + `ScanEye` 图标钮（依赖 T13）⑤ **T8** 改「抽屉 = 纯预览」⑥ **T11** dogfood 改 **G1–G15**（新增管理区 5 档权限矩阵 / 结构体渲染 / star 降级断言）、依赖改 T1–T14 ⑦ 状态仍 **⬜ 未开工** ⑧ 本版**零实现改动** |
| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v0.6** | 2026-09-18 | sunxuewen-rush | **UI 评审 条⑤（跨面交互约定）落档 → 5 条全闭（用户「全按推荐」）**：① **T8 补步骤 7/8** —— **分段三态**（详情失败 ⇒ 整抽屉 ErrorState；版本段失败 ⇒ 段内 ErrorState + 段内重试）· **写后重取范围**（状态治理 ⇒ `invalidateCache('/api/assets')` + 详情重取 · 列表 `retryTick++` · 版本删除 ⇒ 只重取版本段）② **T7 步骤 3 补 URL 写法零改动**（`q` replace / `page=1` 删参数 / 筛选变更删 `page`）③ **D11/D12**（响应式口径文档 vs 真码）登记 → 批 design §2.1c 条⑤ ④ **R9** 版本 `REJECTED` 仍红：与去红范围不冲突（全站归 M4b-7）⑤ 本版**零实现改动** |
| **v0.5** | 2026-09-18 | sunxuewen-rush | **UI 评审 条④（壳与导航）落档（用户「按推荐来」）**：① **壳层零改动确认** —— 本批对 `AppShell` / `SideNav` / `TopBar` 应**零 diff**（断言 = **T7 ⑨**）② `DEV_BATCH` **只删本路由表项**（机制保留，T7 步骤 4 已写）③ 页内**不加**返回/面包屑 ④ 顶栏 h1 与页头同字重复**登记 → M4b-7**（**D9/D10/R8** 见批 design §2.1c 条④）⑤ 本版**零实现改动** |
| **v0.4** | 2026-09-18 | sunxuewen-rush | **UI 评审 条②③ 落档（用户「按推荐来」）**：① **T8 四处同步**——段② chips 文案 = 候选表 **join `displayName`**（回退 slug）· 段③ `changelog=null` ⇒ **弱化色 `—`** · 段④ 判定范围 = **已加载页（提示性守卫）+ 服务端 400 兜底**（分页盲区登记）· 候选表与详情**同批取** ② 断言补 **⑪（chips 中文名）/⑫（`null` ⇒ `—` + 快速切换 abort）** ③ 依据 = 批 design **v1.4**（§2.1c 条③ + findings D6/D7/D8/R5/R7）④ **D7 🔴 门户详情页标签 chips 空文案** 为**既有缺陷**（非本批引入）⇒ **登记，不在本批修**，归属 M4b-6 / 待指令 ⑤ 本版**零实现改动** |
| **v0.3** | 2026-09-18 | sunxuewen-rush | **UI 逐条评审条① 落档（用户「按推荐来」）**：① **T5 扩为 api 封装三件** —— 新增 `api/audit.ts`（新建）+ `api/reviews.ts` 加**队列函数**（`fetchReviewQueue`）⇒ 件表 **新建 7→8 / 改造 10→11**（批 design §2.1c 条① **P1**；依据 = 实测 `pages/`+`components/` 层零直调 `apiGet`）② T5 步骤扩为 4 步 · 断言补 ⑥（零直调复核）③ §2 Task 总览 T5 行同步 ④ 连带：R1 请求数断言排壳层（并入 G2）· R2 审计数据缺口（并入批 design §9.5）⑤ 本版零实现改动 |
| **v0.2** | 2026-09-18 | sunxuewen-rush | **换靶复核 3 项（用户要求「先检查并打分」）**：① **P1** T7 补 `?page=` ↔ 组件 `offset` **换算公式**（`offset=(page-1)*limit` / `onPageChange: o => setPage(o/limit+1)`，先例 `CenterPage.tsx:238-240`）+ ★ **仅 `total > limit` 渲染**（跨批契约漏承接）+ 断言 ⑤b ② **P2** T3 补 me 面 schema **上限口径**（`limit ≤100` / `q ≤100`）+ `requireAuth` 落点 ③ **P3** T8 订正 `Drawer` 宽度措辞（560 已硬编码在件内、无宽度 prop） ④ **撤回旧分 9.66**（窄口径）⇒ 换靶口径修前 **9.60** / 修后 **9.66**（§8.1）⑤ 本版零实现改动 |
| **v0.1** | 2026-09-18 | sunxuewen-rush | **立项**：T1-T11 切分（服务端 4 · web 5 · 规范 1 · 收尾 1）· 每 Task 带 Files / 步骤 / **验收断言** / ⚠️ 注意 · §4 门禁顺序 · §5 造数 · §6 风险回退 6 条 · §8 8 维自检 **9.66** · 依据 = 批 design `docs/designs/2026-09-18-m4b4-personal-b-design.md`（**定稿 · 复评 9.69**）+ 主 design §2.3 拆批表。**本版零实现改动** |

