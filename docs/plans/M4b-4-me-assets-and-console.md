# M4b-4 个人面 B：我的资产与工作台 landing —— 批计划

> Date: 2026-09-18
> Updated: 2026-09-21（**v0.43：`j3` 排序档收敛 5 → 3 落地** —— ① 服务端 `ASSET_SORT_VALUES` / 固有方向 / `sortOrderBy` 三处收敛（**两条相关子查询消失**）· 前端 `SORT_OPTIONS` + `SortKey` + `SORT_LABEL_KEYS` 同步 · i18n **净零**（**347 键** 实测 · 差集 0）② 测试 **动 4 用例**（`:306` 换档实取 `downloads` · `:341` 整条作废）+ **F115**（`assets.test.ts:485` 清单 **7 → 4** —— 设计清单外，grep「五档」捞出）③ 实测：三档序 / `?sort=name` **200 且等价 newest** / `dir` 两态 / **CI 同序七步全绿**（`test` **559 pass · 1 skip · 0 fail**；562 → 559 = **−3** 与被删用例对上）④ 依据 = 批 design **v1.14**（8 维 **9.33**））
> Updated: 2026-09-21（**v0.42：`j2` 门户 preset 收敛落地** —— ① 落地记录：`AssetList` **286 → 172**（门户 preset）· 两消费点改传 `items` · `SortKey` 归位 `sortOptions` · 退役 5 项**残留 0** ② 运行期探针 **10 PASS / 0 FAIL**（7 列 / 表头无底纹 / `table-fixed` 名称列 **22.0%** / 行内 **1 锚点 0 button** / 默认档 ⇒ 更新列 `descending` / 点下载列 ⇒ `?sort=downloads&dir=desc` / 载态 3 排序钮 + 骨架 5 行）③ **F112**（`rowProps` 不放行 `data-*` ⇒ 补口）· **F113**（操作钮断言真值 ⇒ 订正 design §7.1）· **F114**（载态取样改 CDP `Fetch`）④ web 四门禁 exit 0 ⑤ 依据 = 批 design **v1.13**（8 维 **9.32**））
> Updated: 2026-09-21（**v0.41：F111 门禁修复 + `j1` 验证通过** —— ① **F111**：`doc-audit` 头部判据原**只读第一行** ⇒ 假绿（头部堆 10 行照样 PASS）⇒ 改**整块统计**；**修好即抓出 4 份违规文档**（`docs/00` 7 行 / M4a 9 行 / 主 design 4 行 / M4b-4 批 9 行）⇒ 同批**头部收敛**（各 3 条 + 指针 · **零内容丢失**机器核：18 个被移除版本在修订表全有行）· **门禁自证能报红**（临时 4 行文档 ⇒ 67/1） ② §5 增 **跑前必复位** 纪律（`m4b3` dogfood 前跑 seed）③ **`j1` 验证 = `m4b3` 39 PASS / 0 FAIL**（原 38/1）④ **CI 同序门禁全绿**（含 `test` **562 pass / 0 fail**））
> 更早版本（**v0.1–v0.40**）摘要见 **§9 修订记录** —— 头部只留最近 3 条（2026-09-21 头部卫生 · 用户拍板）
> Status: **✅ 全绿（2026-09-18）**（**T1–T16** 全绿 · **T8 作废**；T11 收尾已完成：造数 + G1–G19 **53 PASS / 0 FAIL** + 五门禁 exit 0 + 证据回填；**v0.20 验收期第二笔 T11-e 已实现**（G20/G21 新增 ⇒ **77 PASS / 0 FAIL**）· 文档回写完成 · **已提交推送**（`39d1b21` · `9219069`））；**验收期第三笔 T11-f（资产排序）2026-09-20 全绿落地**（`f1 9.35 · f2 9.46 · f3 9.46 · f4 9.47` · 服务端 `sort`/`dir` 契约变更 · 零迁移）· **T11-g（验证效率）全绿**（代码 18 维 `9.49`）· **验收期第六笔 T11-j（表格族统一 · 门户笔）执行中**（`j1` ✅ 已提交 `ce969cb` · `j2` ✅ `0b2d2f2`（门户 preset **286 → 172** · 代码 18 维 **9.48** · 探针 **10/0**）· `j3` ✅（档收敛 **5 → 3** · i18n **净零 347 键** · `test` **559/0**）· `j4`–`j5` ⬜）· **三笔已提交推送**（`72e48db` / `434043b` / `ced0d6a`））；其中 **T8 作废**；**执行序 = T15 最先** —— star 能力先行，再消费面）—— 上游批 design 已**定稿**（8 维**以批 design 版本头为准**（现行 **9.69**）；v1.7 原型评审收口）
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
**迁移**：**原批零迁移**；**v0.38 追加 T11-j 起含 1 次迁移**（3 条部分索引 —— 见 T11-j · j4 / 跨批 design §1.6）· 新增依赖（**零新增**）。

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
| **T11** | 验证收尾：dogfood **G1-G19**（v0.20 后为 **G1-G21**） + 五门禁 + 证据 + 收尾回填 | 全 | T1-T16 | `docs/smoke/scripts/m4b4-*.ts`（新）· `docs/smoke/2026-09-18-m4b4-personal-b.md`（新） |
| **T12** | **资产详情页管理区**（改 M4a 已交付页 · 按权限显隐）+ 4 新建件 | web | T5,T9 | `pages/AssetDetail.tsx` · `lib/asset-permissions.ts`（新）· `components/console/AssetAdminCard.tsx`（新）· `components/console/LabelCard.tsx`（新）· `components/console/asset-stats.tsx`（新） |
| **T13** | `DataTable` **加性** prop `rowActionsHeader?`（可见操作列表头） | web | — | `components/console/DataTable.tsx` |
| **T14** | **`labels` 形状升级**（服务端返结构体 + **web 响应类型** · D5/D7 根治） | server + web | T1,T3 | `apps/web/src/api/types.ts` · `labels/service.ts` · `http/asset-item.ts` · `http/me.ts` · `http/assets.ts` |
| **T15** | **star 服务端**（迁移 + 表 + 幂等端点 + 读面 · **执行序最先**） | server | — | `db/schema/assets.ts` · `drizzle/00xx_*.sql` · `assets/stars.ts`（新）· `http/assets.ts` · `http/asset-item.ts` · `packages/protocol` · `docs/08-data-model.md` |
| **T16** | **star 前端接线**（列表列 / 详情页头卡 / 门户卡） | web | T7,T12,T15 | `api/stars.ts`（新）· `components/market/StarButton.tsx`（新）· `pages/Assets.tsx` · `pages/AssetDetail.tsx` · `components/market/AssetCard.tsx`（~~`components/console/AssetDrawer.tsx`~~ 随 T8 作废移除 · v0.16） |
| **T11-f** | 验收期第三笔：**资产排序**（服务端 `sort` 白名单 + 门户 `Select` / 列头可点） | server + web | — | `assets/service.ts` · `http/assets.ts` · `http/me.ts` · `hooks/useMarketQuery.ts` · `api/assets.ts` · `components/market/CenterPage.tsx` · `components/market/AssetList.tsx` · `i18n/zh.ts` · `i18n/en.ts` |
| **T11-g** | 验证效率：dogfood **分段执行**（`SMOKE_ONLY`）+ **会话复用**（免重复登录） | 工具 | — | `docs/smoke/scripts/m4b4-personal-b-dogfood.ts`（头部 + 结构：段守卫 / 探针上提 / 登录复用）|
| **T11-i** | **搜索与跳转**（**A** 顶栏常驻小搜索框 + `/search` 跨类型结果页 + 首页搜索抽公共件 · **B″ 侧栏框样触发器 → 官方命令面板**（`⌘K`）） | web | — | **A 新建 3**：`components/search/AssetSearch.tsx` · `pages/Search.tsx` · `components/market/sortOptions.ts`（常量上提）· **A 改造 4**：`ui/TopBar.tsx` · `market/Hero.tsx`（提交目标改 `/search?q=`）· `market/CenterPage.tsx`（改 import）· `main.tsx`（+1 路由）· **B″ 终态件**：`ui/CommandPalette.tsx`（官方 `CommandDialog`）· `ui/navItems.tsx`（导航清单上提 · 单一事实源）· `ui/SideNav.tsx`（**框样触发器** · 侧栏条目仍 14）· `ui/AppShell.tsx`（挂面板 + `⌘K` 监听）· **依赖 ±0**（B′ 曾引入的 `@base-ui/react` 已随同日回退撤除）· i18n（A 7 + B″ 5 枚 ⇒ **347 键**）· 两套 dogfood 断言 |
| **T11-h** | 首页搜索**形态对齐**（**点亮判据 = 聚焦 或 有输入**：空态主色描边不可用 ⇄ 点亮实底主色 + 提交；焦点在即亮） | web | — | `components/market/Hero.tsx`（两态 + **v0.25 聚焦判据** + 空输入守卫 + 沿革 v0.25）· `docs/smoke/scripts/m4a-dogfood.ts`（**+8 断言**）|

| **T11-j** | **表格族统一（门户笔）**：统一件扩展 + 迁 `ui/` · 门户 preset 收敛 · **排序档收敛 5 → 3**（名称 / 作者下线）· **3 条部分索引迁移** | server + web | — | `components/console/DataTable.tsx`（**迁** → `components/ui/DataTable.tsx`）· `components/market/AssetList.tsx` · `components/market/CenterPage.tsx` · `pages/Search.tsx` · `assets/service.ts` · `assets/service.test.ts` · `db/schema/assets.ts` + `drizzle/0013_*.sql`（生成物）· `components/market/sortOptions.ts` · `i18n/{zh,en}.ts` · `components/ui/shadcn/checkbox.tsx`（新 · 行选择副作用）· `m4b4-personal-b-dogfood.ts` |
| **T11-k** | **表格族统一（控制台笔）**：「我的资产」排序头 + 列开关 · 存量两页表头统一（`rowActionsHeader`） | web | **T11-j 全绿**（D0-2 逐笔可回滚） | `pages/Assets.tsx` · `pages/Submissions.tsx` · `pages/Tokens.tsx` · `m4b3-personal-a-dogfood.ts`（重跑 + 新增）· 证据件 |

**执行序（依赖链）**：`T1 → T2 → T3 → T4`（服务端闭环，先绿）→ `T9`（键先落，页面才有文案）
→ `T5 → T6/T7 → T8` → `T10` → `T11`。**T1/T2 相互独立可并行**；T9 不阻塞服务端。
**T11-f（验收期第三笔）步序 = `f1 → f2 → f3 → f4`**（服务端先行 ⇒ 门户接线 ⇒ 实测回填 ⇒ 验证；详见 §3）。
**T11-g（验证效率 · 工具）步序 = `g1 → g2 → g3`**（分段守卫 ⇒ 会话复用 ⇒ 实测回填；详见 §3）。
**T11-j / T11-k（表格族统一 · 两笔）步序 = `j1 → j2 → j3 → j4 → j5`（门户笔）⇒ 验证绿 ⇒ `k1 → k2`（控制台笔）**
（D0-2「**逐笔可回滚**」· 控制台笔不得先于门户笔验证绿；详见 §3）。

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
③ 门户零回归（本 Task 收尾即跑）：`bun docs/smoke/scripts/m4a-dogfood.ts` ⇒ **38/38（现行 · T11-f 后）+ NO JS ERRORS**
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
⑦ 生产产物零 `M4b-` marker；门户 `m4a-dogfood.ts` **38/38**
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
⑧ 门户 `m4a-dogfood.ts` **38/38** + `NO JS ERRORS`
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
2. **dogfood G1–G21（现行）** 全组（清单见批 design §9.3；登录态传入方式沿用既有脚本）
3. **五门禁**（同 CI 序，见 §4）+ 门户零回归 + chain-smoke
4. **证据文件**（含**权威行数表**：后续行数一律 `wc -l` 实测）
5. **收尾回填**（批 design §9.7）：主 design §11 键数实测 · 主 design §2.3 登记表本批行 ·
   `docs/00` §5 M4b-4 行状态 · 本文档 §7 落地记录
6. **出口五件**逐条判定（含第 ⑤ 件**整体审计**：全仓覆盖式扫描，findings 逐条登记 + 处置，不留未决项）

**验收断言**：
```
① `bun docs/smoke/scripts/m4b4-personal-b-dogfood.ts` ⇒ **G1-G21 全绿（**77 PASS**） + NO JS ERRORS**
② 五门禁逐项 **exit 0**（install --frozen-lockfile → typecheck → lint → format:check → doc-audit → build
   → db:migrate → CI=true bun run test；`test` **0 fail**，用例数 ≥ 基线 + 新增）
③ 门户零回归：`m4a-dogfood.ts` **38/38（现行 · T11-f 后）** · `m4a-chain-smoke.ts` **PASS**
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

**断言**：① 收藏数字一致 —— **G17 = 列表「收藏」列 = 详情页头卡 = 接口 `starCount`**（抽屉取消后为**两处 UI + 接口**）② 未登录点收藏 ⇒ **不发写请求** + 跳 `/login?next=`（**G18** · 入口 = **详情页头卡**）③ 幂等以 **API 两次 `PUT`** 判（**G15** —— 原「UI 连点两次」口径属歧义，已作废见 **F60**）④ 门户零回归 = **`m4a-dogfood` 全量 PASS**（T16 时点 36/36；**现行 37/37** —— F69/F75）（+ 本批 **G14b**：门户卡星标纯展示 + 点击穿透）

### T11-f · 验收期第三笔：**资产排序**（服务端 `sort` + 门户 `Select` / 列头可点 · 2026-09-20 立项）

> 依据 = 批 design **§4.7**（v1.23：口径 10 条 · UI 规格 · 断言口径 · 实现落点 / ORDER BY 映射表）。
> 契约行 = 主 design **§7.1 / §7.2 R6**（v1.56）。**零迁移 · 零新依赖 · 新建件 0** · 归属 M4b-4。

**f1 · 服务端：`sort` 白名单 + 映射 + 两路由 schema + 单测**

1. `assets/service.ts`：导出 `ASSET_SORT_VALUES = ['newest','downloads','stars','name','author'] as const` + `AssetSort` 类型；`ListAssetsOptions` 增 `sort?: AssetSort`
2. `listViewableAssets` 按白名单切 `orderBy`（**全档带 tiebreaker**；`name` 取 latest 版本元数据（`asset.latest_version_id` → 投影 `name`，空名回退 `slug`）· `author` 取 owner 显示名（空名回退用户名）—— **实现取相关子查询（零 join ⇒ 返回形状/行数不变）**）+ `dir` 方向覆盖（缺省 ⇒ 档位固有方向）
3. **非法 / 缺省 ⇒ `newest` 分支**（静默回落，**不 400**）
4. 两路由 query schema **各 spread `...assetSortQueryFields`**（单点复用，防两处漂移）⇒ `sort: z.enum(ASSET_SORT_VALUES).catch('newest')` · `dir: z.enum(ASSET_SORT_DIRS).optional().catch(undefined)` —— **v0.23 订正（F83）**：原写 `.default('newest')` 在非法值上会 400，与「静默回落」矛盾 ⇒ 用 `.catch()`（缺省/非法同一路径）
5. `assets/service.test.ts` 新用例：五档顺序真值 · 非法值回落 · tiebreaker 稳定

**f1 断言 / 门禁**：① 五档逐档首条 = 期望 slug ② `?sort=bogus` ⇒ 200 且等价 `newest` ③ 缺省 ⇒ 等价 `newest` ④ 同 `updated_at` 按 `id DESC` 稳定 ⑤ `me` 面**不传** `sort` ⇒ 仍 `updated_at desc`（既有 G4–G6 零影响）⑥ 服务端 `test` 无新红 · `typecheck` / `lint` exit 0

**f2 · 门户 UI：官方 `Select` + 列头可点 + hook 维度 + i18n**

1. `hooks/useMarketQuery.ts`：**加性** `sort` 维度（照 `status` 先例 —— 不给 `opts.sort` ⇒ 不读不写）+ `dir`；`setSort` 内 `dropPage`（回第 1 页）+ **清 `dir`**；默认档 ⇒ 删 URL 参数
2. `api/assets.ts`：`fetchAssetList` 透传 `sort` / `dir`（不在前端做默认判定）
3. `components/market/CenterPage.tsx`：搜索钮**左侧**插官方 **`Select`**（`Label「排序」` + `SelectTrigger#market-sort` `size="sm"` `w-[160px]` · 5 × `SelectItem` —— **v0.26 订正：用户线框对比后拍板「方案 B」**，取代 v0.24 的 chips ×5）· 删静态文本 `sortRecent` · 向 `AssetList` 传 `sortKey` / `dir` / `onSortChange`
4. `components/market/AssetList.tsx`：props **显式透传**（**不用 context**）· **六个列头**（名称 / 描述 / 作者 / 下载 / 收藏 / **更新** · v0.27）· **五个可点**（名称 / 作者 / 下载 / 收藏 / **更新 ⟷ `newest` 档** —— 导出 `COLUMN_SORT` 作列→档单一事实源）官方 `Button variant="ghost" size="sm"` + `ArrowUpDown` / `ArrowUp` / `ArrowDown` + `th[aria-sort]`（`none ｜ ascending ｜ descending`）· **点同列 = 切 `dir`；点异列 = `desc`（首点降序）** —— **v0.24 订正（F84）**：原写「点异列 = 固有方向」，与 design §4.7.2/§4.7.3 断言矛盾；方向判定落在 `AssetList`（单一事实源）
5. `i18n/zh.ts` · `en.ts`：**+6 键**（五档 + `sortLabel`）/ **退役 `sortRecent`**（§6.6 键表 ⇒ 实测 **334 键**）

**f2 断言 / 门禁**：① `?sort=downloads` 直链 ⇒ `Select` 显示档名 + 列表顺序 = 接口顺序 ② 换档 ⇒ URL **无 `page`** 且 `dir` 清空 ③ 点同列 ⇒ `asc ↔ desc` 翻转（`aria-sort` 同步）④ 点异列 ⇒ 该列固有方向 ⑤ 默认档 ⇒ URL **无 `sort`** ⑥ 网格 / 列表**两视图同序**（同一状态） · web `typecheck` / `lint` / `format:check` / `build` exit 0

**f3 · 契约与文档回填（实现期实测）**

1. 主 design §7.1 / §7.2 R6 契约行 · 批 design §4.7 / §6.6 / §9.3 · `docs/00` §5 —— **立项期已落**（v1.56 / v1.23），本步**只做实测回填**
2. **行数类数字**跑 `m4b4-measure.ts` 回填（纪律：提交前必跑 —— F76 三连复发）；i18n 键数实测（预期 333 / 未消费 12 不变 ⇒ 实测为准）

**f3 断言 / 门禁**：① `m4b4-measure.ts` 输出行数 ↔ 文档逐项一致 ② i18n 实测 = 文档 ③ `doc-audit` **64 PASS / 0 FAIL** · `format:check` exit 0

**f4 · 验证（G22 ×14 + 双面回归 + 五门禁 + 证据）**

1. 本批 dogfood 追加 **G22 ×14**（口径 = 批 design §4.7.3；含匿名可用 / 深链 / `me` 面零影响反证 / 点「更新」列 ⟺「最新」档 = G22-6c）
2. `m4a-dogfood` 全量复跑（**零回归 38/38**）
3. 五门禁按 §4 顺序跑全；**覆盖探针不降**（`http/assets.ts` 基线 95.96）
4. 证据回填 `docs/smoke/2026-09-18-m4b4-personal-b.md` §13 + 截图（预期值一律**实测回填**）

**f4 断言 / 门禁**：① G22 全绿（本批合计 **91** = 77 + G22×14，**实测**）② `m4a` **38/0** ③ 五门禁逐项 exit 0 · `test` 无新红 ④ 证据文档无占位符

---

### T11-g · 验证效率：dogfood 分段执行 + 会话复用（**工具** · 2026-09-20 追加）

**由来**：用户 2026-09-20「连续几条任务时间都有点长，耗时点在哪里？」—— 结论 = **dogfood 复跑是工具时间的
大头**；**硬证据只有直接实测项**（单轮 `time`：全跑 179s / 分段 45.6s / `seed` 0.34s）。
⚠️ 会话库时间戳的**分桶数字已撤**：该库有重复行（当日剔重 982 条）且时间戳非单调 ⇒ 两版口径互相矛盾
（441 vs 368 分）、调用计数与耗时互不吻合（77 × 179s > 工具总时长）⇒ 只存量级意义。
严谨版重算 + 口径自曝见证据 **§14.9**。

**Files**：`docs/smoke/scripts/m4b4-personal-b-dogfood.ts`（头部 + 结构；**零产品码改动**）

**步骤**：
1. **g1 分段执行**：新增 `SMOKE_ONLY=<组>`（段粒度 = 段头 banner token · 逗号多选）；14 段各包
   `if (want(...))` 守卫 ⇒ 未命中**整段跳过**（不止跳过断言）；`G19`（无 JS 错误）不参与分段（永远执行）；
   末尾**命中检查**（组名打错 ⇒ FAIL + 列出可选段，不静默）；段头加 `/* 段选：… */` 注明可选中它的组
2. **g2 会话复用**：`jar`（账号 → cookie + `me.user.id`）；`mustLogin` 三级 —— 同账号当前已登录 ⇒ 直用 ·
   曾登录过 ⇒ 还原 cookie 并核 `me.user.id`（`/api/auth/me` 面**无 `username`** ⇒ 以 id 为判据）· 否则真登录；
   跨段共享探针（`DetailSnap` / `detailSnapshot` / `snapDetail` / `openVersionsTab` / `snapVersionActions` / `snap`）
   **上提到顶层**（段整块跳过后 block 作用域不再成立）；顶层补 `await logout()`（浏览器 profile 可能残留会话）
3. **g3 实测回填**：段选 **45.6s**（原 3.5~5 分）· 全跑 **2m59s** · 真登录 **9 → 4** · 全跑 **91/0**（= 基线）

**验收断言**：
```
① `SMOKE_ONLY=G22` ⇒ 45.6s · 命中 14 条 + 命中检查 + G19，0 FAIL（原全跑 3.5~5 分）
② 不带变量全跑 ⇒ 91 PASS / 0 FAIL / 0 超时（= 基线，行为零变化）· 真登录 4 次（原 9）
③ 组名打错（`SMOKE_ONLY=G99`）⇒ FAIL「未命中 G99（可选段：…）」+ 3.1s 快速返回
④ 五门禁 exit 0 · `format:check` 270 文件 · `doc-audit` **64 PASS** · 显式 `biome check` 本文件
   （docs/ 不在 turbo lint 图内 —— **F91**）基线 11 warning ⇒ 12（新增 1 条同类：`SMOKE_ONLY` 未登记 turbo env）
```

⚠️ **注意**：分段是**迭代期**口径 —— **提交前 / 收口必须不带 `SMOKE_ONLY` 全跑**（脚本头部已写明）；
**攒批口径**：纯文案 / 文档改动不跑本脚本，交互 / 样式改动只跑相关段，多层改动攒到收口一次全跑。

---

### T11-h · 首页搜索**形态对齐**（**只改首页** · 2026-09-20 追加）

**Files**：`apps/web/src/components/market/Hero.tsx` · `docs/smoke/scripts/m4a-dogfood.ts` · 文档（M4a design §8.10 / 本 plan / 批 design §4.8 / `docs/00` §5 / 证据 §14.10）

**步骤**：
1. **h1 实现**：右钮 `variant={hasQuery ? 'default' : 'ghost'}` + `aria-disabled={!hasQuery}` + `rounded-full`（空态另加 `text-primary cursor-default`）；`onSubmit` 加 `if (!q) return`
2. **h2 文档**：规格落 **M4a §8.10 + §8.11**（Hero 属 M4a 交付物）· 批 design **§4.8** + **F94/F95** · `docs/00` §5 补注 · 证据 **§14.10**（**三态**实测 + **3 图**）
3. **h3 验证**：`m4a-dogfood` 全跑 **46/0**（基线 38 + T11-h **×8**）· web `typecheck` / `format:check` / `lint` · **三态** CDP 实测（**读样式先关过渡** —— F94；**判定聚焦必用真指针** —— F95）

**验证断言**：
```
① 空态：`data-variant=ghost` · `aria-disabled=true` · 底透明（`rgba(0,0,0,0)`）· 图标色 = `--primary` · 圆角 = 全胶囊
② 空态点击 ⇒ URL 不变（不跳 `/skills`）
③ 聚焦（**真指针点入 input**）：`data-variant=default` · 底色 = 主色实底 · 图标 = 主色前景白 · **`aria-disabled` 仍在**（点亮 ≠ 可提交）· URL 不变
④ 失焦（**真指针点 h1**）：复位 `ghost` + 主色描边 + `aria-disabled=true`
⑤ 有输入：`data-variant=default` · `aria-disabled` 移除 · 底色 = 主色实底（读前 `transition:none`）
⑥ 有输入点击 ⇒ `/search?q=m4a`（**T11-i 口径变更**：Hero 提交目标由 `/skills?q=` 改 `/search?q=` —— 见本 plan T11-i 段与 M4a design §8.12 ⑤）
```

⚠️ **注意**：**只动首页** —— 门户三页折叠搜索与控制台筛选框**零改动**（G21 ×6 与门户搜索断言已逐条核为无影响）；
`Hero.tsx` 属 **M4a 交付物** ⇒ 规格落 M4a §8.10，本批只记口径（引用不复制）。
### T11-i · **搜索与跳转**（**A** 顶栏快速通道 + `/search` 结果页 + 搜索件抽取 · **B** 侧栏 `⌘K` 命令面板 · 2026-09-20 追加）

**Files**：**A** —— `apps/web/src/components/search/AssetSearch.tsx`（**新建**）· `apps/web/src/pages/Search.tsx`（**新建**）· `apps/web/src/components/market/sortOptions.ts`（**新建** · 常量上提）· `apps/web/src/components/ui/TopBar.tsx` · `apps/web/src/components/market/Hero.tsx` · `apps/web/src/components/market/CenterPage.tsx` · `apps/web/src/main.tsx` · i18n（A **7 键** · M4a §8.12 ③-b 定名）；**B** —— `apps/web/src/components/ui/CommandPalette.tsx`（**新建**）· `apps/web/src/components/ui/navItems.ts`（**新建** · 导航清单上提）· `apps/web/src/components/ui/SideNav.tsx` · `apps/web/src/components/ui/AppShell.tsx` · i18n（B **5 键** · M4a §8.13 ④ 定名）；**测试 / 文档** —— `docs/smoke/scripts/m4a-dogfood.ts` + `docs/smoke/scripts/m4b4-personal-b-dogfood.ts` · 文档（M4a design **§8.12 + §8.13** / 主 design §4 + §12 / 本 plan / 批 design §4.9 / `docs/00` §5 / 证据 §14.11）

**步骤**：
1. **h1 抽件（A）**：`Hero.tsx` 的搜索行抽为 `AssetSearch`（`size` / `placeholder` / `onSubmit` / `className`）· Hero 改消费（`size="lg"` · **提交 `/search?q=`**）
2. **h2 顶栏（A）**：`TopBar` 在标题右侧、`ml-auto` 之前接入 `AssetSearch`（`size="sm"` · `max-w-[320px]` · `<lg` 隐藏 · 提交 `/search?q=` · 保留输入）
3. **h3 结果页（A）**：`Search.tsx`（标题 + 官方 `ToggleGroup` 类型 chips + 计数 + 排序 `Select` + 视图切换 + 网格 / 列表 + `Pagination`）· `sortOptions.ts` 常量上提（`CenterPage` 改 import · 零行为变化）· `main.tsx` 加 `/search` 路由
4. **h4 导航清单上提（B）**：`SideNav` 的 `entries` + `navGroups`（含 gate 门槛）提为 `ui/navItems.ts` ⇒ `SideNav` 改 import（**零行为变化**）· 面板与侧栏**同源消费**
5. **h5 侧栏一体搜索（B′）**：`ui/shadcn/combobox.tsx`（**官方 vendoring** · Base UI 原语 · 偏离 3 处登记）+ `ui/SidebarSearch.tsx`（常驻输入框 + 紧邻下拉 · 分组 = `navItems` 同源 · 兜底行）· `SideNav` **换入搜索件**（**条目回到 14**）· `AppShell` 撤面板挂载与 `⌘K` 监听（迁入本件）· **删** `ui/CommandPalette.tsx`（弹窗退役）· **新增依赖** `@base-ui/react`
6. **h6 文档**：M4a **§8.12 + §8.13（v0.35 重写）** · 主 design §4（顶栏 **4 → 5 件** · 侧栏**搜索为常驻件、条目 14 条**）+ §12 线框 · 批 design §4.9（含 B′ 段）· `docs/00` §5 · 证据 **§14.11 + §14.12**
7. **h7 验证**：两套 dogfood 全跑 · 五门禁（`format:check` / `lint` / `typecheck` / `doc-audit` / `build` / `CI=true test --force`）· 顶栏 / 结果页 / 面板 CDP 实测（**真指针** —— F95）

**验证断言**：
```
A（顶栏 + 结果页）
① 顶栏：输入框存在（`size="sm"` · **固定 `w-[320px]`** · **靠右（语言切换器左侧）** · 放大镜 **`stroke=4`**）· 空态右钮 `ghost` 描边（沿 v0.25 判据）
② 顶栏提交「rag」⇒ URL = `/search?q=rag`（**跨类型**结果页）· 输入保留
③ 顶栏 `<lg`（1024px 视口）⇒ 整条隐藏（该断点下不渲染 / 不可见）
④ 结果页默认 `type=all` ⇒ 列表含 **≥2 种类型**（跨类型实证）；切「技能」chips ⇒ 结果**只含 skill**
⑤ 结果页排序切档 ⇒ URL 写 `?sort=downloads` · 分页仅 `total > 20` 渲染
⑥ 首页 Hero 提交「rag」⇒ `/search?q=rag`（**原 `/skills?q=` 口径作废**）
⑦ 门户三页折叠搜索**零回归**（G21 ×6 原断言全绿 · `/skills?q=` 页内过滤仍生效）
B（侧栏命令面板）
⑧ 侧栏条目存在（文案「搜索…」+ 平台徽标）· 收起态（48px）⇒ 只留图标钮
⑨ 点条目 ⇒ 官方对话框出现（`role=dialog`）
⑩ 按 `⌘K` / `Ctrl+K` ⇒ 同样打开 · `Esc` ⇒ 关闭
⑪ 未登录：面板**只列门户 4 条**（无「个人 / 管理」组）—— 角色过滤
⑫ 输入关键词 ⇒ 列表末尾出现「在全部资产里搜「xxx」」⇒ 回车跳 `/search?q=xxx`
⑬ 面板条目点击 ⇒ 导航到该路由且对话框关闭
⑭ 侧栏三组条目与门户组**零回归**（原 14 条断言 / 形态全绿）
```

⚠️ **注意**：**只加不回退** —— 门户三页折叠搜索与控制台筛选框**不改**（语义不同，非重复）；侧栏**组结构不动**（只加 1 条独立块）；**零后端改动 / 零迁移**。

**落地记录（2026-09-20 实跑）**：**件** = 新建 **5**（`components/search/AssetSearch.tsx` **79** · `pages/Search.tsx` **251** · `components/market/sortOptions.ts` **31** · `components/ui/CommandPalette.tsx` **116** · `components/ui/navItems.tsx` **133**）+ 改造 **6**（`ui/TopBar.tsx` **108** · `ui/SideNav.tsx` **291** · `ui/AppShell.tsx` **98** · `market/Hero.tsx` **128** · `market/CenterPage.tsx` **424** · `main.tsx` +1 路由）；**i18n +12 键**（347 键 / 12 组 · 双向差集 0）；**断言** = `m4a-dogfood` **57/0**（+11）· 本批 dogfood **91/0**；**证据** = 证据文档 **§14.11** + 3 图；**行数一律 `m4b4-measure.ts` 实测回填**（新件已入 measure 清单）。

**落地记录续（2026-09-20 · **T11-i B′** 侧栏一体搜索）**：**件** = 新建 **2**（`components/ui/SidebarSearch.tsx` **289** · `components/ui/shadcn/combobox.tsx` **308**（官方 vendoring））+ **删 1**（`components/ui/CommandPalette.tsx`）+ 改造 **3**（`ui/SideNav.tsx` **265** · `ui/AppShell.tsx`（撤面板与 `⌘K` 监听）· `ui/navItems.tsx` **133** 保留）；**新增依赖** = `@base-ui/react@1.8.0`（MIT · 仅 `apps/web` · +8 包）；**i18n −1 键**（`pages` 退役 ⇒ **346 键 / 12 组** · measure 实测 zh=en=346）；**断言** = `m4a-dogfood` **57/0**（B 段 6 条重写）· 本批 dogfood **91/0** 零回归；**证据** = 证据文档 **§14.12** + 第 **34/35** 图。

**落地记录定稿（2026-09-20 · **T11-i B″** 侧栏框样触发器 → 官方命令面板）**：**形态** = 入口为**看起来像常驻输入框的按钮**（shadcn 官方站同款配方 · 实测 h32 / `#f1f5fb` / 无边框 / 圆角 10 / 内嵌 `⌘K`）⇒ 点击开官方 `CommandDialog`；**回退账** = 删 `ui/SidebarSearch.tsx` + `ui/shadcn/combobox.tsx` · 撤依赖 `@base-ui/react`（实测 `apps/web/package.json` 无残留）· i18n 回 **347 键 / 12 组** · notices 回 **33 件** · 恢复 `ui/CommandPalette.tsx` **120** 行；**改造件行数**：`ui/SideNav.tsx` **293** · `ui/AppShell.tsx` **99** · `ui/navItems.tsx` **133**；**断言** = `m4a-dogfood` **57/0**（B″ 六条 · 文件 **904** 行）· 本批 dogfood **91/0** 零回归；**自检** = 代码 **9.48** / 文档 **9.45**。

**观感收尾（2026-09-20 · T11-i B″ · 用户「只做 B」+「侧边栏搜索图标的颜色要浅一些」）**：依据 = 用户放入仓库根的**官方站命令面板截图**（未跟踪文件 `dialog` · PNG 1104×900）⇒ 核官方仓 `apps/v4/components/command-menu.tsx`（**642 行** · 站点**应用层**实现）后出 **5 屏对照小样**，用户拍板**只做 B**：① `ui/CommandPalette.tsx` 页面条目加 `→` 前缀（lucide `ArrowRight` · 尺寸 / 色值走官方 `CommandItem` 内建规则 ⇒ **零 className 覆盖**）· **兜底行不加**（搜索语义）② `ui/SideNav.tsx` 触发器放大镜改 **`text-muted-foreground`**（原 = 无 className ⇒ 继承 `--foreground` `#0f172a`）⇒ 与同块文案 / `⌘K` 徽标**三处同色**。**未采纳**（用户看小样后未选）：官方站**底栏操作提示栏**（右半 = 复制安装命令 · 组件库专有）· nova 档**容器几何**（官方站自身皮肤）—— 登记于 M4a §8.13 ⑦。**行数**：`ui/CommandPalette.tsx` **120 → 128**（`ui/SideNav.tsx` **293** 不变 · 单行改）· **断言** `m4a-dogfood` **57 → 60/0**（+3）· 本批 **91/0** 零回归 · **自检** = 代码 **9.55** / 文档 **9.60**。

### T11-j · 表格族统一（**门户笔**）：统一件 + 门户 preset + 排序档收敛 + 3 条部分索引（2026-09-21 立项）

> 依据 = **跨批 design** `docs/designs/2026-09-21-table-family-alignment-design.md`（**v1.9 定稿** · 8 维 **9.31** · 无待拍项）。
> 契约行 = 主 design §6.3 / §10.1（表格密度 40 · 复用边界）· 批 design §3.1 #17 / §4.7（门户 `AssetList` 与排序规格）。
> **含服务端契约变更**（`ORDER BY` 白名单收缩 · schema + 迁移）⇒ 立 Task（判据 = 技能 `ai-asset-hub` 的 addon-task 档：纯前端笔才只进 §7.5）。
> **两笔之一**（D0-2）· **零新依赖** · **新建件 1**（官方 `checkbox` · 行选择预置副作用）· 迁移文件 = 生成物。

**j1 · 统一件扩展 + 迁位（`components/console/DataTable.tsx` → `components/ui/DataTable.tsx`）**

1. `git mv` 保历史；**4 处 import 更新**（`pages/Assets.tsx:25` · `pages/Submissions.tsx:32` · `pages/Tokens.tsx:34` + 件自身路径注释）
2. 加性 prop **5 个**：`density`（`compact` = 40 / `p-2` ⇄ `comfortable`）· `loadingVariant`（`rows` / `keepHeader`）· `tableClassName`（**只准放布局类** —— 纪律）· `rowProps`（挂 `data-asset-row`）· `sorting`（`{ sortKey, dir, onSortChange }`）
3. 列定义 `meta` 约定（design §2.3）：`sortKey`（**直接给档位** —— D5）· `headClassName`（列宽类）· `hidable`（列开关白名单）
4. 排序头渲染：官方 `Button variant="ghost" size="sm"` + `ArrowUpDown` / `ArrowUp` / `ArrowDown` + `th[aria-sort]` 两态；**不传 `sorting` ⇒ 纯文本降级**
5. **预置能力（件内有、页面不挂）**：`columnVisibility` / `onColumnVisibilityChange`（D0-7）· `enableRowSelection` / `rowSelection` / `onRowSelectionChange`（D0-3）· `selectionLabels`（**v0.40 · F110** / design **F-10**：选择列 **a11y 名** · **可选** · 缺省 ⇒ 不写 `aria-label`）⇒ 副作用 = 装官方 `components/ui/shadcn/checkbox.tsx`（design §13 F-5 · **v1.12 已装 · 26 行 · 零新依赖**）
6. 载态骨架按**可见列数**（Q3）· `rowActionsHeader ?? sr-only` 既有兜底不动

**j1 断言 / 门禁**：① `git mv` 后 `git status` 记重命名 ② 件内**零观感覆盖**（无 `bg-*`；表头 `h-10` 保持）③ web `typecheck` / `lint` / `format:check` exit 0 ④ 三页既有 dogfood 复跑零变化 ⑤ 行选择能力以 **单测 / 探针**验证（**不挂页面**）

**j2 · 门户 preset 收敛（`components/market/AssetList.tsx` 286 → 约 160）**

1. 手写表格 → 消费统一件；列定义 **7 列**（名称 / 描述 / 作者 / 下载 / 收藏 / 更新 / **操作**）
2. 列宽走 `meta.headClassName`（**22 / 24 / 14 / 10 / 10 / 12 / 8**）· `table-fixed` 走 `tableClassName` · 描述 3 行（`line-clamp-3` + `whitespace-normal`）
3. **去底纹**（删 `bg-muted/50` · 只留官方 `[&_tr]:border-b` · D3）· 去整行 stretched link（`relative` / `cursor-pointer` 退役 · D6）
4. 名称列纯文本 + **操作列**（`Eye` 图标钮**真 `Link`** → `/assets/:slug` + 可见「操作」表头）
5. `density="comfortable"` · `loadingVariant="keepHeader"`（载态表头与真表同形**且可点** · U3）· `rowProps` 挂 `data-asset-row`
6. `COLUMN_SORT` / `DEFAULT_DIR` 退役；列头回调直落 URL（`CenterPage` 与 `Search.tsx` 两处同步）

**j2 断言 / 门禁**：① 7 列 + 行内**恰 1 个进详情入口**（**v0.42 · F113 订正**：真值 = `a[href^="/assets/"]` **1 个** + `button` **0 个** —— `Button asChild` 渲染为 `<a>`）② 点操作钮 ⇒ `pathname = /assets/:slug` ③ 表头**无底纹**（`getComputedStyle` 背景透明）④ `table-fixed` + 名称列 22% 生效 ⑤ 载态表头含排序钮（U3）⑥ web 四门禁 exit 0

**落地记录（2026-09-21 · `j2`）**：**件** = `market/AssetList.tsx` **286 → 172**（门户 preset：列定义 7 列 + preset 参数，渲染交统一件）· `market/CenterPage.tsx` **424 → 427** · `pages/Search.tsx` **251 → 253**（两消费点：由「渲染子元素」改为传 `items`；载态改走统一件 `keepHeader`）· `market/sortOptions.ts` **+8**（`SortKey` **归位** —— 原住 UI 件 ⇒ 反向依赖）· `ui/DataTable.tsx` **416 → 422**（**F112** 类型补口）· `i18n/{zh,en}.ts` **+2 键**（`colActions` / `actionOpen` —— **j2 是消费者，先落**；`j3` 再 −2 ⇒ 最终**净零**）。**退役**：`AssetListRow` / `AssetListLoading` / `COLUMN_SORT` / `DEFAULT_DIR` / `SortColumn`（**全仓残留 0**）。
**实测（运行期探针 · 10 PASS / 0 FAIL）**：7 列 `["名称","描述","作者","下载","收藏","更新","操作"]` · 表头底纹 `rgba(0,0,0,0)`（D3 生效）· `table-fixed` 名称列 **251/1140 = 22.0%** · 表头 **40** / 行高 **65**（`h-10` + `py-4`）· 行内 **1 锚点 / 0 button** · 默认档 `newest` ⇒ 仅「更新」列 `descending` · 点「下载」列 ⇒ `?sort=downloads&dir=desc` 且 `aria-sort` 迁移 · 载态表头 7 列 + 3 排序钮 + 骨架 5 行 `colSpan=7` · 点 `Eye` ⇒ `/assets/:slug`。
**门禁** = web 四门禁 exit 0（typecheck / lint / format:check / build）。
**纪律沉淀（F114）**：**载态取样禁用慢网** —— 4s 延迟会把 JS 一起拖住 ⇒ SPA 未挂载（真值全空、看着像「表头丢了」）⇒ 假红；正解 = **CDP `Fetch` 只拦 `/api/assets`**（页面已挂载 + 数据未到）。

**j3 · 排序档收敛（服务端 / 前端 / i18n 五面 · D0-8）**

1. `assets/service.ts`：`ASSET_SORT_VALUES` **5 → 3**（`newest` / `downloads` / `stars`）· `ASSET_SORT_DEFAULT_DIR` 删 2 行 · `sortOrderBy` 删 `name` / `author` 两 case（**两条相关子查询消失** · `:75-77`）
2. `assets/service.test.ts` 按三档重算 —— **动 4 个用例**（`:280` name 档 **删** · `:291` author 档 **删** · `:301` 内的 `:306` name **换档** —— **v0.43 落地实取 `downloads`**（`desc`+`asc` 双向 · `:319` 半保留）· `:341` 两档零 join 循环 **整条作废**）+ **保留 4 个用例**（`:254` 缺省 · `:260` downloads · `:270` stars · `:330` 静默回落）；**+ F115**：`http/assets.test.ts:485` 白名单清单 **7 → 4**（**设计清单外的活口径**）
3. `sortOptions.ts`：`SORT_OPTIONS` 5 → 3 · `SORT_LABEL_KEYS` −2 键
4. `i18n/{zh,en}.ts`：−2（`sortName` / `sortAuthor`）· **净零**（+2 `colActions` / `actionOpen`）⇒ **347 键 / 12 组保持**（实测回填）
5. 契约行只**回填实测**：主 design §7.1 / §7.2 R6 · 批 design §4.7

**j3 断言 / 门禁**：① 三档逐档首条 = 期望 slug ② `?sort=name` ⇒ **200 且等价 `newest`**（静默回落 · **不 400**）③ `dir` 两态仍绿 ④ i18n 双向差集 0 + **347 键**实测 ⑤ 服务端 `test` 无新红

**落地记录（2026-09-21 · `j3`）**：**件** = `assets/service.ts` **317 → 312**（`ASSET_SORT_VALUES` 5 → 3 · 固有方向表 5 → 3 · `sortOrderBy` 删 `name`/`author` 两 case ⇒ **两条相关子查询消失**）· `assets/service.test.ts` **355 → 324**（**动 4 用例**：删 2 条档位用例 + `:306` 换档实取 **`downloads`** + `:341` 整条作废 · 删处留痕注释）· `http/assets.test.ts`（**F115**：白名单放行清单 **7 → 4**）· `market/sortOptions.ts` **34**（`SORT_OPTIONS` 5 → 3 · `SortKey` 5 → 3 · `SORT_LABEL_KEYS` −2）· `i18n/{zh,en}.ts` **−2 键**（`sortName` / `sortAuthor`）⇒ 与 `j2` 的 **+2** 相抵 = **净零**。
**实测**：i18n **347 键 / 12 组 · 双向差集 0**（脚本实测）；三档逐档序正确；`?sort=name` ⇒ **200 且与缺省序一致**（静默回落不 400 · 活接口 `:3000` 实测）；`?sort=name&dir=asc` ⇒ 档位回落但 **`dir` 独立生效**（既有语义，非缺陷）；**「五档」活口径全仓清零**（仅留「原五档」历史注 —— 靠此 grep 捞出 **F115**）。
**门禁** = **CI 同序七步全绿**：`typecheck` / `lint` / `format:check` / `doc-audit` **66 PASS** / `build` / `db:migrate` / `CI=true test` **559 pass · 1 skip · 0 fail**（562 → 559 = **−3**，与被删 **3** 个 `it` 逐一对上）。

**j4 · 索引迁移（3 条部分索引 · D0-6 / design §1.6）**

1. `db/schema/assets.ts` +3 部分索引（`(updated_at DESC, id DESC) WHERE status='ACTIVE'` · `download_count` / `star_count` 同式）；`idx_asset_status` **保留** ⇒ 净 **+3**
2. `bun run db:migrate` ⇒ 生成 `0013_*.sql` 入库（forward-only · **普通 `CREATE INDEX`** · 锁窗口 ≈0.13 s —— B6 / R5）
3. 迁移**动手前**补 F-6 对照实测：`status=? AND type=?` 的索引命中（数字回填 design §1.6 B5）
4. 补 B3 实测：20 万行 **owner 收窄 + `status=ALL`**（控制台默认态 · 数字回填）

**j4 断言 / 门禁**：① `\d asset` 实见 **6 条**索引（既有 3 + 新 3）② `EXPLAIN` 三档查询命中部分索引 ③ `count(*)` **不受益**（不误判为收益）④ `db:migrate` 二次执行不产新文件 ⑤ 实验表**零残留**（`pg_class` 计数 0）⑥ **反证分支**：若 `status + type` 前缀实测**不命中** ⇒ 只做 **design §1.6 登记**（**不临时改列序、不加第 4 条索引**），实测数字照样回填

**j5 · 验证与回填（门户面）**

1. `m4b4-personal-b-dogfood.ts`：`G20-3` 改（0 → **恰 1 个 button**）· `G20-4` 改（**6 格 → 7 格** + 列头加 `|操作` + 链接断言 `tds[0]` → `tds[6]`）· **新增 `G20-10`**（点操作钮 ⇒ 跳 `/assets/:slug`）· `G22` **3 改 1 删**（`G22-3` 四档循环 → **两档** · `G22-6` 删 · `G22-7` 五列 → **三列**）
2. `m4a-dogfood` 全量复跑（**零回归**）· 五门禁 + `doc-audit` · 覆盖探针**不降**
3. 证据 `docs/smoke/2026-09-18-m4b4-personal-b.md` 回填（`?sort=name` 举例订正 + 截图重拍）

**j5 断言 / 门禁**：① 本批 dogfood 全绿（**数字实测回填**）② `m4a-dogfood` 零回归 ③ 五门禁逐项 exit 0 ④ 证据无占位符 ⑤ `doc-audit` 全 PASS

---

### T11-k · 表格族统一（**控制台笔**）：「我的资产」排序头 + 列开关 + 存量两页表头（**前置 = T11-j 全绿**）

> 依据 = 同一跨批 design（v1.9 定稿）· **前置 = T11-j 验证绿**（D0-2 逐笔可回滚）· 归属 M4b-4。

**k1 · 「我的资产」排序 + 列开关（D2=② / D0-7 / D7）**

1. `pages/Assets.tsx`：`useMarketQuery` 加 `sort` 维度（`{ defaultValue: 'newest' }`）⇒ URL `?sort=` / `?dir=`；向统一件传 `sorting`（列定义 **3 列**加 `meta.sortKey`）；`onHeaderSort` 内**重置 `page`**（Q2）
2. 列开关入口 = 表头右上**图标钮**（lucide `Columns3` · `ghost` + `icon-sm`）⇒ 官方 `DropdownMenu` 逐列 `CheckboxItem`（D7 · **件内不渲染**）· 保护「名称 + 操作」两列 · **不持久化**（D0-7）
3. 列定义补 `hidable`

**k1 断言 / 门禁**：① 点列头 ⇒ URL 出现 `sort` / `dir` 且**回第 1 页** ② `aria-sort` 两态 ③ 列表序与接口**逐项一致** ④ 取消勾选 ⇒ 该列消失；名称 / 操作**不可关** ⑤ 载态骨架列数 = **可见列数** ⑥ web 四门禁 exit 0

**k2 · 存量两页表头统一 + 控制台断言**

1. `pages/Submissions.tsx:240` · `pages/Tokens.tsx:303` 各 **+1 `rowActionsHeader`**（复用既有 i18n 键 · D6b=②）
2. `m4b3-personal-a-dogfood.ts`：`G5` **重跑**（表头文案由 `sr-only` 变**可见**）· 新增 **`G16`–`G18`**（`G16` 列头两态 / `G17` URL 同步 + 序一致 / `G18` 列开关）
3. 证据件控制台截图重拍

**k2 断言 / 门禁**：① 两页表头**可见「操作」**（`sr-only` 兜底不再生效）② `G16`–`G18` 全绿 ③ `m4b3` 既有断言**零回归** ④ 五门禁 + `doc-audit` exit 0 / 全 PASS

---

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```
bun install --frozen-lockfile
  → bun run typecheck → bun run lint → bun run format:check
  → bun docs/smoke/scripts/doc-audit.ts        # 文档体检（纯只读不连库）
  → bun run build → bun run db:migrate         # **T11-j 起有 1 次迁移**（3 条部分索引），仍守门跑
  → CI=true bun run test
```

- 测试库口径 = **单库 + 干净 schema + `CI=true`**（CI 只建一个库，本地自建库在 CI 不存在）
- 测试**禁止无条件改写 `process.env`**（用 `??=` 兜底）；**只依赖自己造的数据**
- 单包快跑：`bun run --filter=@ai-asset-hub/server typecheck` / `--filter=@ai-asset-hub/web typecheck`
- 本批**不新增**任务依赖 env（`turbo.json` 无需改动）
- **脚本 env 不走 turbo**：`docs/smoke/scripts/**` 无对应 turbo 任务 ⇒ `SMOKE_*` 不进 `turbo.json`（`SMOKE_ONLY` 沿既有 `SMOKE_*` 同族 —— **F91**；该目录只受 `format:check` 与显式 `biome check` 约束）

## 5. 造数需求（**写库需用户授权**）

见批 design §9.5（6 类数据）；脚本 `docs/smoke/scripts/m4b4-seed-assets.ts`（**幂等 upsert · 可重放**）。
**star 造数（v0.8 追加）**：他人收藏 owner 资产 1 次 + owner 自己收藏 1 条 ⇒ 覆盖 G15/G16/G17。
**分页占位（v0.20 追加 · T11-e 依赖）**：**21 条 ACTIVE `mcp`**（`m4b4-seed-page-01`…`-21`，owner = 管理档、各带 `PUBLISHED` 版本）
—— `/mcps` 由 **2 → 23 条**（> `PAGE_SIZE` 20）⇒ G20 翻页断言可跑。⚠️ **不用 skill 类型**（会打翻 `m4a-dogfood` 的
「/skills < limit ⇒ 无分页」+「首屏含 LangGraph 卡」两条基线）· **不挂 owner 名下**（会污染 G5/G6 的 3 行断言）。
**档位需求（v0.7 追加 · T12/G11 依赖）**：`owner 本人` / `管理档（role 10）` / `超管（role 100）` / **匿名** 四档账号
—— 详情页管理区**逐档断言**需要三档已登录账号（口令走 env，仓库不落）。
要求：口令从 **env** 读（`SMOKE_*_PASSWORD` 惯例）；**仓库内不落任何口令 / 连接串**；首次写库**先取授权**。

⚠️ **跑前必复位（v0.41 · 实测教训）**：跑 `m4b3-personal-a-dogfood` **之前**必须先跑 `bun --env-file=apps/server/.env docs/smoke/scripts/m4b3-seed-submissions.ts`（幂等 · 重跑即复位）—— `G3` 撤回链会**消耗 PENDING 行**，不复位则 `G2`（徽章三态）/ `G2`（撤回钮）/ `G3` **必红 3 条**（症状 = 徽章 `["已撤回","已驳回","已撤回"]` · 无 PENDING 行）。本轮 `j1` 验证即先踩后修（详见 §7.6 F111 同轮记录）。

## 6. 风险与回退

| # | 风险 | 触发信号 | 回退 / 处置 |
|---|------|---------|------------|
| R1 | **门户回归**（`useMarketQuery` 共享 hook 被改坏） | `m4a-dogfood.ts` 任一断言失败（**基线现行 38/38**；v1.22 起「`CenterPage.tsx` 零 diff」**不再是信号** —— T11-e 已改该页，**F74**） | 立即回退 hook 改为「本页自建薄 hook」；**门户零回归优先** |
| R2 | **公开面参数化语义漂移** | 公开列表返回非 ACTIVE 行 / 字段集变化 | 检查条件组装分支；回归锁断言（T4 ⑤）必须绿才继续 |
| R3 | **R6-b 授权集过宽** | 非 owner 非管理档能读非 ACTIVE（404 变 200） | 回查 `assertAssetReadable` 判定表达式；三档对照断言必须逐档命中 |
| R4 | **抽屉 latest 投影全空**（漏批注入） | 九列「名称」显示 slug、「版本」列全 `—` | 补 `loadAssetItemMeta` 调用（T3 步骤 2 的 ★ 步） |
| R5 | **既有断言被「改弱」而非「契约更新」** | `git diff` 出现删除既有 `it` / 放宽无关断言 | 逐行 `git diff` 核对（T4 ②）；**只允许** :418 与 :844-857 语义翻转 |
| R6 | 造数写库影响既有数据 | — | **必须先授权**；脚本幂等 upsert；不删既有数据 |
| R7 | **迁移写放大 / 锁窗口**（T11-j · v0.38 追加） | 三条索引使下载 +1 / 收藏 ±1 / 资产更新各命中一条写路径；迁移期持 SHARE 锁（阻塞写、不阻塞读 · 实测 ≈0.13 s） | 索引可 `DROP INDEX` 回滚（**不回写迁移文件** · forward-only）；数据量跨阈值（≈>1000 万行）或要求零停机 ⇒ 改手写非事务 `CONCURRENTLY`（跨批 design §1.6 **R5**） |

## 7. 落地记录（执行期回填）

> 待执行。模板（对齐 M4b-1/M4b-3 先例）：

| 项 | 内容 |
|----|------|
| 提交链（验收期第三笔 · 2026-09-20） | **已推送** `9219069..ced0d6a` —— `72e48db` `feat(server): add whitelisted sorting to the asset list endpoints` · `434043b` `feat(web): add the market sort control and the updated column` · `ced0d6a` `test(docs): cover asset sorting and speed up the dogfood runs` |
| CI（验收期第三笔） | **全绿**：run `35499952284` **success**（12 步全 success）|
| 提交链 | **已推送（2026-09-18）** —— `e78c200` `feat(web): add the owner admin surface and star wiring on the asset detail page`（T12+T16）· `9973d6b` `feat(web): rebuild the console dashboard as three role-scoped cards`（T6）· `f2485aa` `test(m4b4): cover the version yank route and land the batch verification set`（T11·b/c/d：测试 + 脚本 + 证据 + 文档）；远端 `a918930..f2485aa` → `origin/main` |
| CI | **全绿**：run `35366866235` **success**（12 步全 success —— 安装依赖 / typecheck / lint / format:check / 文档体检 / build / db:migrate / test）|
| 门禁 | 八步全 **exit 0**：`install --frozen-lockfile`（no changes）· `typecheck` · `lint`（1 条**预存在** warning）· `format:check` · `doc-audit`（**64 PASS / 0 FAIL**）· `build`（4/4）· `db:migrate`（零迁移守门）· `CI=true bun run test`（**server 551** / protocol 27，**0 fail** —— 含 T11-c 补测 14 例）· **覆盖探针** `bun test --coverage`（全仓 **95.60/96.28** · `http/assets.ts` **90.97 → 95.96**）|
| dogfood | **现行 = G1–G22 = 91 PASS / 0 FAIL / CDP 超时 0 + `NO JS ERRORS`**（T11-f 追加 **G22×14**（含 G22-6c）· T11-g 起**真登录 9 → 4**（会话复用）· 分段跑 **45.6s** / 全跑 **2m59s**；T11-e 时点 **G1–G21 = 77**）· **T11-d 时点值**：**G1–G19 + G12b + G14b = 60 PASS / 0 FAIL / CDP 超时 0** + **`NO JS ERRORS`**；门户零回归 `m4a-dogfood` **现行 38/38**（T11-f 后；T11-d 时点 36/36）+ `m4a-chain-smoke` **PASS**；截图 **7 → 10 张**（T11-f +3） · ⚠️ 顺序恒为 **seed → dogfood**（G12b 会真撤回）|
| i18n 键数 | **12 组 · zh = en = 323 键**（双向差集 0）· `assets` **79** · `errors` **35** · **en 值级中文泄漏 0**（脚本实测）|
| 权威行数表 | 见证据文件 §7（14 个文件 `readFileSync` 计数；dogfood 脚本 **709** 行 / 种子 **313** 行）|
| 出口五件 | ① design 8 维 **9.69** ✅ ② **T1–T16 全绿** ✅ ③ 五门禁 exit 0 ✅ ④ dogfood **现行 G1–G22 = 91 PASS / 0 FAIL** + 门户 **38/38** ✅（T11 时点 53/0 · 36/36）· 观感：T11-d 三连已获认可；**T11-e 三项待拍板 ⬜**（hover 口径 / 表头底纹 / 行高档位 —— 表头底纹已按建议落地、待验）⑤ 整体审计**无未决项** ✅ |
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
| **T11**（验证收尾：造数 + **G1–G21**（现行 77） + 五门禁 + 证据） | ✅ 已完成 | —（验证件，不单列均分） | 造数 4 账号/4 资产/6 版本/2 标签/2 star · dogfood **现行 77 PASS / 0 FAIL / NO JS ERRORS**（T11 时点 53） · 八步门禁 exit 0 · 证据 `docs/smoke/2026-09-18-m4b4-personal-b.md` 已回填 |
| **T11-e**（验收期 UI 调整轮第二笔：门户视图切换 + 折叠搜索） | 代码 18 维 | **9.24**（提交前自检）| 官方 `ToggleGroup` 视图切换（组件 state · 不记忆）+ 官方 `Table` 列表形态（`py-4` 行高 55 · 描述 `line-clamp-3`）+ 官方 `Collapsible`+`InputGroup` 折叠搜索 + 删页头搜索（去重复入口）；**C9 文档 5.5**（落档前最大扣分项）· A1 9.3（探针四处自伤 F70）· 行为断言 16 条全绿（dogfood **77 PASS / 0 FAIL**）· `m4a-dogfood` **37/0** 零回归 · 零服务端改动 |
| **T11-f**（验收期第三笔：资产排序 `sort` + 门户 pieces） | 代码 18 维 / 文档 8 维 | **f1 9.35 · f2 9.46 · f3 9.46 · f4 9.47** ✅ 全绿 | 立项期四证：v9 `manualSorting` 存在（递归 grep）· legacy 面类型探针 `typecheck` exit 0 · 运行期 A/B 探针「manual 不重排（`rows=[b,a,c]`）」· 官方列头配方（`Button`+`ArrowUpDown` 两态）；**已落地**：服务端白名单单测 **+12 例** · **G22 ×14**（本批 dogfood **91/0**）· 双面回归（`m4a-dogfood` **38/0** · 匿名 CDP 六组）· 覆盖探针 **不降** · 收尾打分（明细见批 design §4.7 / §11.9 · 证据 §14）|
| **T11-g**（验证效率：dogfood 分段 + 会话复用 · 立项 2026-09-20） | ✅ 已全绿 | **9.49** | T11-g 全绿：`SMOKE_ONLY` 分段（14 段守卫 + 命中检查）· 会话复用（jar + `me.user.id` 判据） · 实测 45.6s / 2m59s · 真登录 9→4 · 全跑 **91/0**（行为零变化）—— 代码 18 维 **9.49** |
| **T11-i**（全资产搜索 A + 侧栏命令面板 B） | 代码 18 维 | **9.52** | 逐维打分（A **9.50** ×0.40 / B **9.48** ×0.30 / C **9.59** ×0.30）；**B2 9.2**（输入法组合期点亮未抑制 —— 继承 v0.25 边界）· **C3 9.2**（无运行时可观测标记，靠 DOM 属性探）· **A3 9.4**（Hero 提交目标属**有意**行为变更，已拍板 + 留痕）· **C8 9.5**（跨批改动 M4a 交付物 Hero + 壳层 SideNav/TopBar，均已留痕且本批 dogfood 零回归）· 依据 = **实测**：`m4a-dogfood` **57/0**（+11 条）· 本批 dogfood **91/0** · 五门禁全绿 · i18n **347 键** · 3 图 · **F98/F99 两条自伤已登记并修复** |
| **T11-h**（首页搜索形态对齐 · **v0.25 聚焦判据**） | 代码 18 维 | **9.51** | 逐维重打（A **9.58** ×0.40 / B **9.38** ×0.30 / C **9.55** ×0.30 = **9.51**；与上轮**同分不同构成**：产物增强项 **+4 断言 ⇒ C5 ↑** 与保留扣分 **B2 9.0**（输入法组合期即时点亮未抑制）· **C3 9.0**（无运行时可观测标记）相抵）· 只改首页（门户/控制台零改动 · 逐条核断言无影响）· 官方件零覆写（`variant` 切换，不赌 `cn` 冲突合并）· 色走 `--primary` token · **点亮 ⟷ 可提交解耦**（空输入守卫 `if (!q) return` 不变）· **新增 8 条 dogfood 断言**（46/0）· **C8 9.5**（跨批改动 M4a 交付物，已留痕）|
| **T11-i B′**（侧栏搜索改「一体」形态 · 官方 Combobox） | 代码 18 维 / 文档 8 维 | **9.40** / **9.41** | 代码：A **9.38** ×0.40 · B **9.38** ×0.30（**B2 9.2**：列表限高依赖未生成的 nova 简写 · 未做窄屏实跑）· C **9.45** ×0.30（**C5 9.6**：+6 条断言 + 2 条真登录验证；**C3 9.0**：纯 UI 无可观测标记）｜文档 8 维 **9.41**（**边界覆盖 9.2**）。**本笔抓到两个真缺陷**：F101（Base UI 选中回写哨兵值 ⇒ 改「不控 `inputValue` + `key` 重挂载」）· F103（`w-(--anchor-width)` 简写在 TW 4.3.3 不生成 ⇒ 改任意值类）|
| **T11-i B″**（侧栏搜索定稿：框样触发器 → 官方命令面板 · 同日回退） | 代码 18 维 / 文档 8 维 | **9.48** / **9.45** | 回退干净（件删 2 / 依赖撤 1 / i18n 复回 / notices 回 33 件）· 触发器**照官方站实测配方**（非手搓）· **C6 9.7** 零迁移可回退 · **C8 9.6** 依赖归零无残留 · 两套 dogfood 57/0 · 91/0 |
| **T11-i B″ 观感收尾**（条目 `→` 前缀 + 触发器图标取色） | 代码 18 维 / 文档 8 维 | **9.55** / **9.60** | 只取**条目前缀箭头**一项（用户拍板「只做 B」）；尺寸 / 色走官方 `CommandItem` 内建规则（零 className 覆盖）· 兜底行不加（搜索语义）· 触发器放大镜 `text-muted-foreground` ⇒ **三处同色实测** · **+3 断言 ⇒ 60/0**（触发器取色 / 条目箭头 / 兜底行无箭头）· 复核发现 **F105**（注释腐化）· **F106**（§4.9 落地记录 5 处行数陈旧，已订正）|
| **T11-j**（表格族统一 · **门户笔**：统一件 + 门户 preset + 排序档收敛 + 3 条部分索引） | 🔵 **执行中**（`j1` ✅ `ce969cb` · `j2` ✅ `0b2d2f2` · `j3` ✅ · `j4`–`j5` ⬜） | `j1` **9.34** · `j2` **9.48** · `j3` **9.47** | 依据 = 跨批 design **v1.14**（8 维 **9.33**）· 步序 **j1→j5** · 含 **1 次迁移**（`0013_*`）· 零新依赖 · 新建件 1（官方 `checkbox` · **已装 26 行**）· **`j1` 门禁** = 四门禁 **exit 0** + 探针 **30/0** + dogfood 对照（干净 HEAD **38/1** ⇄ 带 `j1` **38/1**）**零回归** ⇒ 已提交 `ce969cb`｜**`j2` 门禁** = 四门禁 **exit 0** + 运行期探针 **10/0** ⇒ 已提交 `0b2d2f2`｜**`j3` 门禁** = CI 同序七步全绿（`test` **559 pass / 0 fail**）· 三档序 / `?sort=name` 回落 / i18n **347 键** 实测 · **待提交**（用户口径：攒到门户收口一起 push）|
| **T11-k**（表格族统一 · **控制台笔**：「我的资产」排序 + 列开关 + 存量两页表头） | 📋 **已立案（未动工）** | — | **前置 = T11-j 全绿**（D0-2 逐笔可回滚）· 步序 **k1→k2** · 新增断言 **G16–G18** + `G5` 重跑 |

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
- **T11-e 追加（v0.20）**：**F68** 官方 `item.tsx` 落仓后弃用（观感判「逐行成卡 ⇒ 碎/松」）⇒ **删除**（零消费点实证；官方注册表**无 `list` 件** —— 64 件核对）· **F69** `m4a-dogfood` 搜索入口断言口径变更（**跨批交付物改动**：36 → 37）· **F70** 探针锚点四处自伤（模板字符串内反引号 / 两个 h1 / 徽章文案带空格 / 漏带字段）· **F71** 登录限流 15min/20 次 ⇒ 连跑撞限流（症状 `me=401:anon`；处置重启 api —— 已写进脚本头）· **F72** i18n 键数漂移（323 → **329**）· **F73** `m4b4-measure.ts` 文件清单缺新件（已补）
- **T11-e 换靶订正（v0.20+ · 用户「检查并打分」轮）**：**F74** 契约散点 4 处（「`CenterPage.tsx` 零 diff」在 §9.1/T3 步骤/留证/证据仍作活口径 ⇒ 订正为**「零回归」**）· **F75** 基线数字散点 7 处（`m4a-dogfood` **36 → 37**，含 **§6 R1 风险信号行** —— `< 36/36` 作触发线时实际 37 永不触发）· **根因** = 补档轮漏做「扫变更口径」第二步（F64 同类复发）⇒ 批 design §9.7 增 **v1.22 散点扫记录**

- **F76（v0.20+ 检查轮）**：证据行数表 `AssetList.tsx` 记 **133** ⇒ 实测 **135** ⇒ 同轮注释订正后再测 **138**（两次增行未回填）—— **同类第三次** ⇒ 纪律入档：**提交前必跑 `m4b4-measure.ts` 回填行数**（本轮已按该纪律回填，并把 `CenterPage`/`zh`/`en`/`Home`/`m4a-dogfood` 补进 measure 清单）

- **第三轮检查（v0.20+ · 换靶角度 ③⑤⑪）**：**F77** 注释腐化 4 处（`CenterPage.tsx` 删页头搜索后 3 处 + 件头 1 组自相矛盾）· **F78** 「唯一搜索入口」范围未限定（首页 `Hero` 胶囊搜索仍在）· **F79** `AssetList.tsx` 件头「零外观覆盖」与真码/行内注释矛盾 ⇒ 全部订正；**覆盖探针**：dogfood **+16 / −0** 断言、`m4a` **+1 / −0** ⇒ **零静默削弱** ✓
- **收口审计（v0.29 · 2026-09-20）**：**F93** —— 收口 converge 换靶「活口径 vs 历史留痕」，抓出 **5 处当值陈旧**（本文件 §3 f4 标题/步骤/断言① 的 `G22 ×13`+**90** · §7.5 T11-f 行 的 `×13`+**90/0** · Status 行的「实现中」「提交待口令」；`docs/00` §5 行的 **90**/**3 图**/v1.28 + 头部 v1.76 落后修订表；证据 §10 出口件 ④ 行 **90**）⇒ 全部订正，修订记录行按纪律保留
- **T11-g 追加（v0.28）**：**F90** `send()` 回的是**整条 CDP 消息**（`{id,result}`）⇒ 按 `res.cookies` 取值恒 `undefined`、`?? []` 静默吞掉（会话复用**静默失效**：全绿但复用永不命中）· **F91** `docs/smoke/scripts/**` **不在** `bun run lint` 的 turbo 图内（只受 `format:check` 与显式 `biome check`）· **F92** 门禁 `test` 可能是 turbo **缓存回放**（`FULL TURBO`·`Cached: 4/4`·real 0.107s）⇒ 报门禁数字须标注「真跑/回放」，收口用 `--force`
- **T11-f 「更新」列 + F89（v0.27）**：用户要求「资产列加一个『更新』对应更新时间，和我们的『排序-最新』相对应」⇒ 列表 **5 → 6 列**、列头可点 **4 → 5 列**（更新 ⟷ `newest`）；**F89** = `handleHeaderSort` 把列名当档位（`?sort=updated`，白名单外 ⇒ 序与档位脱钩）⇒ 导出 `COLUMN_SORT` 译档；dogfood **G20-4 六列** + **G22-6c** ⇒ **91 PASS / 0 FAIL**；f2 复评 **9.46**
- **T11-f 形态变更（v0.26 · 用户拍板）**：排序控件 **chips ×5 → 官方 `Select`**（线框四案对比后选「方案 B」）⇒ **F87** 104px 定宽在 EN `Most downloads`（106px）下**截断** ⇒ 沿控制台 `#assets-status-filter` 同宽先例改 **160px**（中英均不截断）；G22 断言随形态同步（Select 显示 + `160x32` 真值）· 仍 **90/0**
- **T11-f f4 收口（v0.25）**：**F85** `m4a-dogfood`「中心排序栏」断言依赖被取代的静态文本 ⇒ 改写 2 条（**37 → 38**）· **F86** `bun test --coverage`（不带路径）跑进 **`dist/**` 陈旧产物** ⇒ 状态型用例重复执行 **7 例假失败** ⇒ 用 `--coverage src/` 反证（**562 pass / 0 fail**）并登记（与 F66 同族）
- **T11-f f2 实现期纠错（v0.24）**：**F84** §4.7.5 原写「列头点异列 ⇒ 该列**固有方向**」，与同文档 §4.7.2「两态（首点 ⇒ `desc`）」+ §4.7.3 断言「点名称列 ⇒ 首点 `descending`」**自相矛盾**（根因：未对「点名称列」这条断言做路径推演）⇒ 实现取**首点 `desc`**（官方配方 `toggleSorting(false)` 同口径）并订正 design
- **T11-f f1 实现期纠错（v0.23）**：**F82** 契约行（主 design §7.1/§7.2 R6）**只登记 `sort` 漏 `dir`** ⇒ 若不落服务端，列头升序只作用于**当前页**（已补契约行 v1.57 + §4.7.5 字段）· **F83** §4.7.5 原写 `sort: z.enum(...).default('newest')` **在非法值上 400**，与「静默回落」口径矛盾 ⇒ 订正 `.catch('newest')`。**纪律沉淀**：写「回落」类口径时，必须推演**缺省 / 非法**两条路径是否同源
- **T11-f 立项期纠错（v0.21 · 实质是两处「判断错误」）**：**F80**「v9 **没有** manual*」—— 根因 `grep dist/*.d.ts` **非递归**（选项在 `dist/features/**`）；**F81**「控制台接排序需把 legacy 升到 v9 原生面」—— 根因**未做探针就下结论**（类型探针 + 运行期 A/B 探针证明 legacy 面**加性**可用）。**纪律沉淀**：涉及库能力的结论，必须 ①递归扫 d.ts ②写类型探针 ③跑运行期 A/B —— 三条未做不得说「没有/不支持」（明细见批 design §4.7.6）

> 执行期判断项（用户未逐条拍板，主动申报）：**F53** 的 tooltip 复用 `label.privileged`；**F56** 的落点选择；**T7 已落文件回改**（F49，纯重构）。

- **T11-j/k 立项轮（v0.38 · 2026-09-21）**：**F107** —— §7.5 表**两行结构畸形**（历史遗留：**T11-g** 行只有「Task + 日期 + 一段话」**3 格**、**T11-i** 行末多一个竖线成 **5 格**），表头为 4 格 ⇒ 渲染时列错位、末格落空。**发现方式 = 表格列数一致性机器核**（`doc-audit` **不查表结构** —— 与 F64/F93 同族盲区）⇒ 两行已按「Task / 状态 / 均分 / 门禁」归位（**零语义改动**）。
**排序样本（v0.21 追加）**：见批 design §9.5「排序样本」行（21 条占位写递变 `star_count = i` / `download_count = i×3`）—— 本节不复述。

- **提交前检查（v0.39 · 2026-09-21）**：**F108** —— j3 步骤 2 原写 `service.test.ts` 排序改动「**6 处**」，与自身枚举（**5 个行号**）**对不上**；真身 8 个排序相关 `it` 块逐块点清 ⇒ 正确口径 = **动 4 个用例 + 保留 4 个用例**（`:280` / `:291` / `:301`（内 `:306`）/ `:341` 动；`:254` / `:260` / `:270` / `:330` 保留）。与 design **E20** 同源，同批订正。**纪律沉淀**：凡写「N 处 / N 条 / N 个」必须能与紧随的枚举**逐项对上** —— 对不上即错。

- **T11-j `j1` 落地（v0.40 · 2026-09-21）**：**F109** —— `m4b3-personal-a-dogfood` 的 **`G6` 是长期假失败**（**pre-existing**：干净 HEAD 同样红）：探针 `rowKey()` 在行无 `start` 时返回**占位符 `—`**（**把占位符当身份**）⇒ 与「有效行无 `start` 时页面显示 `—`」相撞 ⇒ **恒判泄漏**。**实库双证**：已吊销无 `start` **2** 行 × 有效无 `start` **4** 行（6 行全为 `m4b3-seed-legacy` 造数行）⇒ 观察到的假泄漏数组**恰 2 个元素**、与 2 条行一一对上。**处置（用户 2026-09-21「按 A 走」）**：判据订正（无 `start` ⇒ `null`；两个 filter 只比**有身份**的行）· **净判据「页面行数 == 有效行数」不动 ⇒ 覆盖不降**；属**跨批交付物改动**（先例 **F69**）⇒ 本行登记 + 批 design §13 **F-11** 对齐。**F110** —— 行选择预置的勾选框**无 a11y 名**（读屏只念「复选框」，不知是哪一行）⇒ 批 design **F-10** 增**可选** prop `selectionLabels`（用户 2026-09-21「**认**」）；plan 侧同步 §3 `j1` 步骤 5。

- **门禁修复（v0.41 · 2026-09-21）**：**F111** —— `doc-audit` 的 **头部检查是假绿**：原实现 `lines.find((l) => l.startsWith('> Updated:'))` **只取第一行** ⇒「头部版本数 ≤3」恒 ≤1（头部堆到 10 行照样 PASS）、`[C]` 头部长度也只量第一行（与 **F64 / F93** 同族盲区）。**用户 2026-09-21「修」** ⇒ 两条判据改为**整块统计**（`headLines` = 全部 `Updated:` 行 · 版本行数 ≤3 · 每条都量长度 1500）。**修好即抓出 4 份文档在假绿底下压着**：`docs/00`（7 行）· M4a design（9 行）· 主 design（4 行）· M4b-4 批 design（9 行）⇒ 同批**头部收敛**（各留最近 3 条 + 1 行指针 · **白名单删行**：只删 `> Updated:` 行、绝不连带续行 —— 上次头部卫生的教训）；**零内容丢失**已机器核（被移除 **18** 个版本在每个文件的修订表内**全部有行**：4 + 7 + 1 + 6）。**门禁自证能报红**：造一份 4 行头部的临时文档 ⇒ `doc-audit` **67 PASS / 1 FAIL**（删掉 ⇒ 66/0）。

- **T11-j `j2` 落地（v0.42 · 2026-09-21）**：**F112** —— `rowProps` 的类型 `ComponentProps<'tr'>` **不放行 `data-*`**（TS 只在 JSX 字面量认 `data-` 前缀），而该 prop 的语义就是「门户挂 `data-asset-row`」⇒ **口子传不进去**、落地时 `typecheck` 当场红 ⇒ 补口为 `& { [key: `data-${string}`]: string | undefined }`（**只放行 `data-*` 这一类**）。**F113** —— 批 design §7.1 原拟把操作钮断言写成 `rowButtons === 1`，但 `Button asChild` 渲染的是 **`<a>`** ⇒ **真值 = 1 锚点 / 0 button**（探针实测）⇒ 已按真值订正（**照原口径改 j5 必红**）。**F114** —— **载态取样禁用慢网**：`Network.emulateNetworkConditions`（4s）会把 JS 一起拖住 ⇒ SPA 未挂载、真值全空（假红）⇒ 改 **CDP `Fetch` 只拦 `/api/assets`**。

- **T11-j `j3` 落地（v0.43 · 2026-09-21）**：**F115** —— **设计清单外的活口径**：`http/assets.test.ts:485` 的「白名单放行」用例**硬编码 7 项**（含 `sort=name` / `sort=author`）；两档下线后它们**仍返 200**，但语义已从「**放行**」变成「**回落**」⇒ 用例名不再成立（留着 = 覆盖名不符）。**发现方式 = 落地后 grep「五档」扫活口径** ⇒ 同批订正清单 **7 → 4** + 加注「回落口径由专职用例覆盖」。**纪律沉淀**：**枚举/档位类收敛**落地后必须 grep 该枚举的**中文自然语言表述**（断言清单 · `describe` 标题 · 注释都会藏）；**数字类 grep 要逐处看同一行内的全部命中**（本轮 plan Status 行内两个 `9.49`，首轮被误当 T11-g 的分数跳过 ⇒ 已订正）。

## 9. 修订记录

| **v0.43** | 2026-09-21 | sunxuewen-rush | **`j3` 排序档收敛 5 → 3 落地回填（零行为决策 · 仅登记）** ① §3 `j3` 补**落地记录**（服务端三处收敛 · 前端常量 · i18n **净零 347 键** · 测试动 4 用例实取 `downloads`）② §7.6 登记 **F115**（`assets.test.ts:485` 清单 **7 → 4** —— 设计清单外，靠 grep「五档」捞出）③ §3 `j3` 步骤 2 同批订正（换档实取档位）④ §7.5 `T11-j` 行 → `j3` ✅（代码 **9.47**）⑤ 头部 +本行 ⑥ **Status 行两处订正**（j2 分数 `9.49` → **`9.48`** —— 同轮 grep 误判为 T11-g 的分数）⑦ 依据 = 批 design **v1.14**（8 维 **9.33**）。**实测** = CI 同序七步全绿 · `test` **559 pass / 1 skip / 0 fail** |
| **v0.42** | 2026-09-21 | sunxuewen-rush | **`j2` 门户 preset 收敛落地回填（零行为决策 · 仅登记）** ① §3 `j2` 补**落地记录**（件行数 286→172 / 424→427 / 251→253 / sortOptions +8 / DataTable 416→422 / +2 键 · 退役 5 项**残留 0**）+ 探针 **10/0** 真值 + 门禁 ② §7.6 登记 **F112**（`rowProps` 类型不放行 `data-*` ⇒ 补口）· **F113**（操作钮断言真值 = **1 锚点 / 0 button** ⇒ 订正 design §7.1 —— 防 j5 必红）· **F114**（载态取样改 CDP `Fetch` 拦 API）③ §3 `j2` 断言① 口径同批订正 ④ §7.5 `T11-j` 行 → `j2` ✅（代码 **9.48**）⑤ 头部 +本行 ⑥ 依据 = 批 design **v1.13**（8 维 **9.32**）。**实测** = 运行期探针 **10 PASS / 0 FAIL** · web 四门禁 exit 0 |
| **v0.41** | 2026-09-21 | sunxuewen-rush | **F111 门禁修复 + 4 份文档头部收敛 + `j1` 验证通过（零实现改动 · 仅门禁与文档）** ① **F111**：`doc-audit` 头部两条判据原只读**第一行**（`lines.find`）⇒ 假绿；改为**整块统计**（版本行 ≤3 · 逐行量长度） ② **修好即抓出 4 份违规**（`docs/00` 7 行 · M4a design 9 行 · 主 design 4 行 · M4b-4 批 design 9 行）⇒ **同批头部收敛**（各 3 条 + 1 行指针 · 零内容丢失机器核：18 个被移除版本在各自修订表**全部有行**） ③ **门禁自证**：临时 4 行头部文档 ⇒ **67 PASS / 1 FAIL**（删掉 ⇒ 66/0）④ §5 增**跑前必复位**纪律（`m4b3` dogfood 前跑 seed —— `G3` 会消耗 PENDING 行，本轮先踩后修） ⑤ **`j1` 验证通过**：`m4b3` dogfood **39 PASS / 0 FAIL**（原 38/1 · `G6` 假失败随 **F109** 判据订正消失 · `revokedLeaked:[]` + `domCount == enabledTotal`） ⑥ **CI 同序门禁全绿**：typecheck / lint / format:check / **doc-audit 66 PASS** / build / `db:migrate` / `CI=true test` **562 pass / 1 skip / 0 fail** |
| **v0.40** | 2026-09-21 | sunxuewen-rush | **实现期 `T11-j · j1` 开工回填（零实现改动 · 仅登记）** ① §3 `j1` 步骤 5 补 `selectionLabels`（**F110** · 选择列 a11y 名 · 可选 · 缺省不写 `aria-label`）+ 标注官方 `checkbox` 件 **v1.12 已装** ② §7.6 登记 **F109**（`m4b3` dogfood **`G6` 假失败** —— 探针把占位符 `—` 当身份 ⇒ **跨批交付物改动** · 先例 **F69**）· **F110**（design **F-10** 契约口增补 · 用户「认」） ③ §7.5 `T11-j` 行 📋 → **🔵 执行中**（`j1` ✅ 代码 **9.34**）④ 头部 +本行 ⑤ 依据 = 跨批 design **v1.12**（8 维 **9.31**）。**零实现改动**；实测 = `j1` 门禁 `typecheck` / `lint` / `format:check` / `build` 全 exit 0 · 运行期探针 **30 PASS / 0 FAIL** · 对照实验（干净 HEAD **38/1** ⇄ 带 `j1` **38/1** 逐项相同）= **零回归** |
| **v0.39** | 2026-09-21 | sunxuewen-rush | **提交前检查轮（换靶 = 把未提交改动当提交件审）** ① 查出 **F108** —— j3 步骤 2 的「6 处」与自身枚举**对不上** ⇒ 订正为 **动 4 用例 + 保留 4 用例**（`:280`/`:291`/`:301`（内 `:306`）/`:341` 动 · `:254`/`:260`/`:270`/`:330` 保留；与 design **E20** 同源）② **头部卫生复核**：被删 **29 条** token 级**零丢失**（裸 token 在正文其他处全命中；首轮 2 条命中系我正则的反引号边界**假阳性**）③ 结构复核：表格 **15 块 0 错位** · `doc-audit` **66 PASS** · `format:check` PASS ④ 重评 **9.49**（8 维 **75.9 ÷ 8** · 准确性 9.5 → 9.4）。**零实现改动** |
| **v0.38** | 2026-09-21 | sunxuewen-rush | **验收期第六笔「表格族统一」立项（T11-j / T11-k · 两笔）** —— 用户 2026-09-21「任务清单落点--追加到M4b-4」⇒ ① §2 Task 总览增 **T11-j（门户笔）** / **T11-k（控制台笔）** 两行 + 执行序（`j1→j5` 验绿 ⇒ `k1→k2` · D0-2 逐笔可回滚）② **§3 新增两块明细**（j1–j5 / k1–k2，各带 文件 / 动作 / 验收断言 / 门禁）③ **§1 非目标「本批零迁移」口径订正** —— 本笔**含 1 次迁移**（3 条部分索引 · `0013_*`）④ **§4 门禁 `db:migrate` 注释同步**（原「本批零迁移，仍跑（守门）」现为假）⑤ **§6 风险 +R7**（迁移写放大 / 锁窗口 · 回退 = `DROP INDEX`）⑥ §7.5 增两行（📋 已立案）⑦ 依据 = **跨批 design** `2026-09-21-table-family-alignment-design.md`（**v1.9 定稿** · 8 维 **9.31** · 无待拍项）；**零实现改动** · 文档面 8 维自检 **9.50**（完整性 9.6 · 准确性 9.5 · 一致性 9.6 · 可用性 9.4 · 追溯 9.5 · 反证 9.4 · 边界 9.4 · 维护性 9.6 = 76.0 ÷ 8 = 9.50）· 顺手订正 **F107**（§7.5 两行表结构）⑧ **头部卫生**（用户拍板「要」）：头部**只留最近 3 条**（v0.38 / v0.37 / v0.36）+ 1 行指针；更早 **30 条（v0.1–v0.35）**自头部移除（**摘要已在 §9，零内容丢失** —— **v0.39 复核：被删 29 条裸 token 在正文其他处全命中**）|
| **v0.37** | 2026-09-20 | sunxuewen-rush | **T11-i B″ 观感收尾**（用户「只做 B」+「侧栏搜索图标要浅一些」）① 面板**页面条目加 `→` 前缀**（尺寸 / 色走官方件内建规则 ⇒ 零 className 覆盖）· **兜底行不加**（搜索语义）② 触发器放大镜 **`text-muted-foreground`**（与文案 / `⌘K` 三处同色）③ §3 补落地记录 · §7.5 增行（代码 **9.55** / 文档 **9.60**）④ 断言 `m4a-dogfood` **60/0**（+3）· 本批 **91/0** 零回归 ⑤ **F105**（注释腐化）/ **F106**（5 处陈旧行数）登记并订正 |
| **v0.36** | 2026-09-20 | sunxuewen-rush | **T11-i B″ 定稿：侧栏搜索回到官方对话框**（用户复审拍板「还是官方站的对话框更适合一些」）① 入口 = **框样触发器**（像常驻输入框的按钮 · shadcn 官方站同款配方）② **B′ 一体形态 + 依赖 `@base-ui/react` 退役**（依赖归零 · notices 回 33 件 · i18n 回 **347 键**）③ §2 件表行改写 · §3 补定稿落地记录 · §7.5 增行（代码 **9.48** / 文档 **9.45**）④ 断言 `m4a-dogfood` **57/0** · 本批 **91/0** |
| **v0.35** | 2026-09-20 | sunxuewen-rush | **T11-i B′：侧栏搜索改「一体」形态** ① §2 件表行改写（**B′ 新建 2 / 删 1 / 改造 3 / 新增依赖 1** · 条目 **15 → 14**）② §3 补 B′ 落地记录（实测行数 + 断言 + 证据图）③ §7.5 增打分行（代码 **9.40** / 文档 **9.41**）④ i18n **347 → 346**（`pages` 退役）|
| **v0.34** | 2026-09-20 | sunxuewen-rush | **T11-i 观感微调回填（用户 2026-09-20）**：① 顶栏小搜索 **靠右、置于语言切换器左侧** ② 宽 **固定 `w-[320px]`** ③ 放大镜 **`strokeWidth=4`**（加粗一倍）—— §3 T11-i A-① 断言收紧为「`w=320` + 靠右 + 切换钮左侧 + `stroke=4`」· 实测 `m4a-dogfood` **57/0**（+11 条不变）· 本批 dogfood **91/0** 零回归 |
| **v0.33** | 2026-09-20 | sunxuewen-rush | **T11-i 落地回填** ① §3 T11-i 补**落地记录**（件 = 新建 5 / 改造 6 · i18n +12 键 · 两套 dogfood 实测）② §7.5 增 T11-i 打分行（代码 18 维 **9.52**）③ 实测：`m4a-dogfood` **46 → 57/0**（+11 断言）· 本批 dogfood **91/0 零回归** · i18n **347 键 / 12 组** ④ 零后端改动 / 零迁移 |
| **v0.32** | 2026-09-20 | sunxuewen-rush | **T11-i 全资产搜索立项（用户拍板 A1 + B1 + C3 + 「Hero 对齐」）** ① §2 件表增 **T11-i**（新建 3 / 改造 4）② §3 增 T11-i：五步（抽件 → 顶栏 → 结果页 → 文档 → 验证）+ **七条断言**（含跨类型实证 · `<lg` 隐藏 · Hero 口径变更 · 门户零回归）③ 规格落 **M4a §8.12** ④ 零后端改动 / 零迁移 |
| **v0.31** | 2026-09-20 | sunxuewen-rush | **T11-h v0.25（点亮判据扩为「聚焦 或 有输入」· 用户拍板「鼠标一点击输入的地方、焦点在的时候就变」）** ① §2 件表：Hero 沿革 **v0.25** + 断言 +4 ② §3 T11-h：验证断言改 **六条**（两态 → **三态**）· 实测 **46/0** · 真指针 ③ §7.5 重打 **9.51**（**同分不同构成**：C5 ↑ / B2 · C3 保留）④ **F95**（后台 tab `element.focus()` 不派发 `focus` ⇒ 探针假红；聚焦类交互必用真指针）⑤ 规格落 **M4a §8.11** |
| **v0.30** | 2026-09-20 | sunxuewen-rush | **T11-h 首页搜索形态对齐（只改首页 · 用户「只做形态对齐 / 空态没反应」）** ① 两态：空态 `ghost` + 主色描边 + `aria-disabled`（点击/回车无反应）/ 有输入 `default` 实底主色 + 白图标 + 提交 ② 空输入**不再跳 `/skills`**（原口径作废）③ `m4a-dogfood` **+4 断言 ⇒ 42/0**（基线 38）④ **F94**（探针把过渡中间态当终值 —— 已沉淀固定写法）⑤ 规格落 **M4a §8.10**（Hero 属 M4a 交付物）⑥ 门户三页与控制台**零改动** |
| **v0.29** | 2026-09-20 | sunxuewen-rush | **M4b-4 收口审计（converge）** ① 换靶「**活口径 vs 历史留痕**」⇒ 本文件 3 处当值陈旧订正（§3 f4 ×13/90 → ×14/91 · §7.5 T11-f 行 → 91/0 · Status → 全绿落地 + 已提交）② **F93** 登记（§7.6）③ §7 落地记录补**验收期第三笔提交链**（`72e48db`/`434043b`/`ced0d6a`）+ **CI run `35499952284` success** ④ 零实现改动 |
| **v0.28** | 2026-09-20 | sunxuewen-rush | **T11-g（验证效率）落地 —— 用户「连续几条任务时间都有点长，耗时点在哪里？」** ① **归因 = dogfood 复跑为工具时间大头**（硬证据 = 单轮 `time` 实测 212s/179s/45.6s；会话库分桶数字**已撤** —— 重复行 + 时间戳非单调、两版口径互相矛盾，见证据 §14.9 口径自曝）② **分段执行** `SMOKE_ONLY`（14 段守卫 · G19 常驻 · 命中检查）③ **会话复用**（jar + `me.user.id` 判据 · 跨段探针上提 · 顶层登出）④ 实测：段选 **45.6s** / 全跑 **2m59s** ·真登录 **9 → 4** · 全跑 **91/0**（零行为变化）⑤ **F90**（`send()` 回整条 CDP 消息 ⇒ cookie 取错键静默失效）·**F91**（`docs/` 脚本不在 turbo lint 图内）· **F92**（门禁 `test` 行可能是 turbo **缓存回放** ⇒ 报数须标真跑/回放；已 `--force` 补真跑 32.6s · 562/0）⑥ §7.5 增 **T11-g 行（代码 18 维 9.49）** ⑦ 证据 §14.9 新增 |
| **v0.27** | 2026-09-20 | sunxuewen-rush | **列表加「更新」列（⟷「最新」档）+ F89 订正** —— ① `AssetList` **六列**（末位「更新」= `formatDate(updatedAt)` `YYYY-MM-DD`；列宽 24/26/16/11/11/12；`colSpan` 6）② **五列可点**（`更新 ⟷ newest`；导出 `COLUMN_SORT` = 列→档单一事实源）③ **F89**：列名当档位 ⇒ `?sort=updated`（序与档位脱钩，因 `dir` 仍生效）⇒ `CenterPage.handleHeaderSort` 先译档 ④ i18n **+`colUpdated` ⇒ 335 键** ⑤ dogfood **G20-4 → 六列** + **G22-6c 新增** ⇒ **91 PASS / 0 FAIL** · `m4a-dogfood` **38/0** ⑥ f2 复评 **9.46** |
| **v0.26** | 2026-09-20 | sunxuewen-rush | **T11-f 排序控件形态定稿 = 官方 `Select`（用户线框四案对比后拍板「方案 B」）** —— ① 控件：`Label「排序」+ SelectTrigger#market-sort`（`size="sm"` · `w-[160px]` · `role=combobox`）取代 chips ×5 ⇒ 常驻宽 **274 → 160px**、换档点击 **1 → 2 次** ② **F87**：104px 定宽在 EN `Most downloads`（106px）下截断 ⇒ 沿控制台 `#assets-status-filter` 同宽先例改 160 ③ i18n **+`sortLabel` ⇒ 334 键**（实测）④ G22 断言随形态同步 + `160x32` 尺寸真值 ⇒ **90 PASS / 0 FAIL** · `m4a-dogfood` **38/0** ⑤ f2 复评 **9.40** |
| **v0.25** | 2026-09-20 | sunxuewen-rush | **T11-f 收口（f3 文档回填 + f4 验证）** —— ① **F85**（`m4a-dogfood` 排序栏断言随形态变更改写 ⇒ **38/0**）② **F86**（覆盖探针口径含 `dist/**` ⇒ 7 例假失败；`--coverage src/` 反证 **562/0**）③ **G22×13** 落地 ⇒ 本批 dogfood **77 → 90 PASS / 0 FAIL / 0 超时 / NO JS ERRORS** ④ 覆盖 **不降**（95.60/96.29 · lines +0.07）⑤ 证据 `docs/smoke/2026-09-18-m4b4-personal-b.md` **§14** + 3 图 ⑥ 打分 f3 **9.46** / f4 **9.47** | 
| **v0.24** | 2026-09-20 | sunxuewen-rush | **T11-f f2（门户 UI 排序）实现完成** —— ① **五档 chips**（官方 `ToggleGroup variant="chip" size="chip"` · 计数行内**搜索钮左侧** · 取代静态文本）② **列表列头可点**（`AssetList` 新增 `SortableHead`：官方 `Button ghost/sm` + 方向图标 + `th[aria-sort]`；**描述列不可点**）③ `useMarketQuery` **加性** `sort`/`dir` 维度（`setSort` 清 `dir` + `dropPage`；默认档删参数）④ `api/assets.ts` 透传 ⑤ i18n **+5 / 退役 `sortRecent`** ⇒ **实测 333 键**（12 组 · en 零中文泄漏）⑥ **F84** 登记 + design 订正（列头首点恒 `desc`）⑦ 匿名 CDP 实测 6 组全绿 · `doc-audit` 64/0 · 活口径 0 · f2 自检 **9.37** | 
| **v0.23** | 2026-09-20 | sunxuewen-rush | **T11-f f1（服务端排序）实现完成** —— ① `assets/service.ts`：`ASSET_SORT_VALUES` / `ASSET_SORT_DIRS` / 类型守卫 / `assetSortQueryFields`（单点）+ 白名单 `orderBy` 映射（全档带 tiebreaker；`name`/`author` 相关子查询零 join）+ `ListAssetsOptions` 增 `sort`/`dir` ② `http/assets.ts` + `http/me.ts`：schema spread 复用 + 透传 ③ 测试：`service.test.ts` **+8 例**（五档真值 / `dir` 反向 / 非法回落 / tiebreaker / 零 join 形状）· `http/assets.test.ts` **+3 例**（白名单放行 / 非法回落逐项一致 / 计数单调）· `http/me.test.ts` **+1 例**（不传 ⇒ 现状序反证 + 只改序不改集合）④ 顺带修 `service.test.ts` 清理链序（`asset_version` FK 无级联 ⇒ 先删版本，23503 复现）⑤ **F82**（契约漏 `dir`）/ **F83**（`.default` 写法会 400）登记 + 规格订正 |
| **v0.22** | 2026-09-20 | sunxuewen-rush | **T11-f 任务清单补档（零实现改动）** —— 用户追问「design 和 plan 都写完了么？」自查：design §4.7 六小节已全（v1.23），**plan 缺实现任务清单**（仅 §7.5/§7.6 立项与留痕行）⇒ ① §2 增 **T11-f 行**（层 = server + web）② §2 执行序补 f1→f4 ③ **§3 新增 T11-f 明细**（四子步各带 文件 / 动作 / 验收断言 / 门禁）④ §7.5 T11-f 状态 → 📋 已立案 ⑤ §9 本行；**根因** = 沿用了 T11-d/T11-e「验收期笔不进 §3」先例，而本笔**含服务端契约变更**（跨包 + 改 ORDER BY）⇒ 按 `docs/plans/README.md`「文件级任务 + 验收断言」职责应立 Task，且出口件② 判据需 Task 存在 · 文档面 8 维自检 **9.47**（完整性 9.5 · 一致性 9.5 · 清晰度 9.5 · 可实施性 9.4 · 设计纯粹性 9.5 · 边界覆盖 9.5 · 实施精度 9.4 · 跨平台 9.5）|
| **v0.21** | 2026-09-20 | sunxuewen-rush | **验收期第三笔 T11-f「资产排序」立项（零实现改动）** —— ① §7.5 增 T11-f 行（实现中）② §7.6 追加 **F80/F81** 纠错留痕 + 纪律沉淀③ §5 增排序样本指针④ §9 本行⑤ 步序 f1→f4（服务端 → 门户 chips/列头 → 契约 → 验证 G22 ×7）；**含服务端契约变更 · 零迁移 · 新建件 0** |
| **v0.20** | 2026-09-18 | sunxuewen-rush | **验收期 UI 调整轮第二笔（T11-e · 门户视图切换 + 折叠搜索）** —— ① **视图切换**（官方 `ToggleGroup` · 组件 state **不记忆** ⇒ 同页翻页保持、离开回网格）② 列表形态 **Item → Table**（官方 `Table` · 5 列 · 列宽百分比 · `py-4` 行高 55 · 描述 `line-clamp-3` 最长 93 · 首列 stretched link 整行热区）③ **去卡化**（面板除边框/白底）④ **折叠搜索**（官方 `Collapsible`+`InputGroup` · 工具条下方撑满 · 展开自动聚焦）⑤ **删页头搜索**（去重复入口）⑥ 件表 **新建 17 / 改造 20** · **§9.1「CenterPage 零 diff」改为「零回归」** ⑦ i18n **+6 ⇒ 329 键** ⑧ 造数 **+21 条 mcp 占位** ⑨ dogfood **77 PASS / 0 FAIL** · `m4a` **37/0** ⑩ **F68–F73** 登记 ⑪ 提交前自检 9.24 / 文档 5.25（补档后重评） |
| **v0.19** | 2026-09-18 | sunxuewen-rush | **提交与 CI 回填** —— 本批三 commit 已推送 `origin/main`（`a918930..f2485aa`）· GitHub Actions run `35366866235` **success**（12 步全过）；§7 落地记录「提交链」回填实号 + 新增 CI 行。零实现改动 |
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

