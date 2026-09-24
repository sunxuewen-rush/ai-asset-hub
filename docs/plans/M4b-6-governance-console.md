# M4b-6 治理批：管理控制台四页（看板 · 资产管理 · 标签定义 · 审计日志）—— 批计划

> Date: 2026-09-23
> Updated: 2026-09-24（**v0.19：F221 收口 —— M4b-2 三脚本 18 条断言过时** —— 定性 = 断言写死历史结构真值（非本轮引入 · 正反双证）⇒ 新增**共享真值件** `nav-truth.ts`（`navItems.tsx` SSOT）把条数/组集合/图标取 SSOT + 修 3 处脚本缺陷 + 补自带桌面视口 ⇒ 四支复跑 **24/0 · 14/0 · 49/0 · 34/0**（121 断言全绿）；证据 §5.10）
> Updated: 2026-09-24（**v0.18：挂账 ③ 收口 —— (B) 类 lint 清零** —— 实测 **71** 条 → **0**：`noNonNullAssertion` 66（52 条统一走**新增取值器** `http/context-access.ts`；14 条显式收窄）· `noTemplateCurlyInString` 3 · `noExplicitAny` 1 · `noDocumentCookie` 1 ⇒ `bunx biome lint` 三包 **258 文件 0 warning/0 error**；`typecheck`/`format:check`/`test` **599 pass·0 fail** 全绿 + 真页回归（本批 dogfood + 零回归四脚本 · seed→dogfood 成对跑）；证据 §1/§5.9/§8）
> Updated: 2026-09-24（**v0.17：挂账 ② 收口 —— 证据 §8 item ⑦⑧ 闭环** —— 用户授权写库：造 14 个零挂载一级标签 + 1 个「仅挂 `HIDDEN` 资产」标签 ⇒ **22 PASS / 0 FAIL**（13 色池换圈 · F212 第三支 + 对照组）⇒ **自清**回落（22 → 7 · 54 → 53）；一次性脚本 `docs/smoke/scripts/m4b6-probe-colorpool-and-hidden-mount.ts` + 3 张留证截图；证据 §5.8/§7/§8 + 批 design **v0.45** 同步）
> Status: ✅ **已落地（T1–T10）· 看板维重做（T6⁺ · 2026-09-23）** —— 批 design **v0.47**· 四页真页 + 服务端 8 项 + 迁移 0014 · dogfood **G1–G16 = 108/0**（G16 后）· 逐 Task 落地记录见 §7（含 F203–F220）
> 上游：批 design `docs/designs/2026-09-23-m4b6-governance-console-design.md`（**v0.47 · 定稿 · 8 维 9.44**〔§11.2 T6⁺ 复评〕· D1–D55 · 门槛项已清空）
> · 主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（**v1.70**）§2.3 批件登记
> · `docs/00-product-direction.md` §5 M4b-6 行（**v1.94** · ✅ 完成）· 规范 `docs/05` §6（角色）· `docs/06`（label 两级树）· `docs/08`（数据模型）
> 依赖顺序：**M4b-1 ✅ / M4b-2 ✅ / M4b-3 ✅ / M4b-4 ✅ / M4b-5 ✅** ⇒ 本批开工条件已满足；本批之后 = **M4b-8**（发布批）→ **M4b-7**（视觉打磨）

---

## 1. 目标与非目标

**目标**（本批 = **管理控制台四页** + **服务端 8 项改动** + 主 design §2.3 中「资产管理」读面契约落地）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | **管理看板 `/admin`** | `ComingSoon` 占位 → **真页**：4 数字卡（活跃资产 / 全部资产 / 累计下载 / 有效用户）+ **趋势两张小图**（资产累计 / 下载累计）+ **排行榜单卡三口径**（人 / 标签 / 资产 + Top N Combobox）+ ~~创意四项~~（**T6⁺ 已删**）→ **标签维度两图**（标签资产数量同心环 / 标签下载热度雷达 · 数据源 `overview.labels[]`）+ **英雄榜**（单卡两内层分区块：员工榜 / 资产榜）· **入口化 3 处**（D50）· **仅进页拉一次**（D51） |
| 2 | **资产管理 `/admin/assets`** | 全站治理列表（**10 列** · 权重 16/22/8/7/10/7/7/7/8 = **92%** + 操作槽 **8%**）+ **卡片/列表两态** + **详情抽屉**（官方 `Sheet` + 仓内 `console/Drawer` · 宽 560）+ **状态筛选**（四档 · 默认「全部」⇒ 显式 `status=ALL`）+ **排序 3 档**（`newest`/`downloads`/`stars` · URL 状态）+ **列显示**（保护 2 列）+ 搜索折叠 |
| 3 | **标签定义 `/admin/labels`** | 两级严格树（一级缩进 0 / 二级 **28px + 2px 引导线** · chevron 仅有子级 · 默认折叠）+ **上限块**（`total`/`limit` · ≥90% `tone=warn`）+ **行内 ↑↓**（一次 `PUT /order` 提交整组 · 失败回滚 + toast）+ **删除确认**（挂载数 + 后果 + 解挂指引 · 服务端 400 `label.in_use`）+ **创建/编辑表单**（D30 字段 · `visibleInFilter` **默认打开** · slug 创建后禁改 · 翻译**整组提交**） |
| 4 | **审计日志 `/admin/audit`** | 过滤区（**快捷三键**〔近 24 小时 / 版本下架 / 清除筛选〕+ 动作分组下拉〔潜在 9 组 · 实测 7 组 · 未知前缀原样显示〕+ 日期区间默认近 7 天 + 官方 `Calendar` 自定义）+ **「更多筛选」折叠 5 维**（`targetType`/`targetId`/`actorId`/`requestId`/`clientIp` · 上限 64/128/**256**/64/64）+ **表格 6 列**（时间〔`Asia/Shanghai`〕/ 动作〔原始串〕/ 操作者〔工号 + 姓名 · 无 actor ⇒ 「—（匿名）」〕/ 目标 / 来源 IP / 请求 ID）+ **行详情抽屉**（`detail` 美化 + `userAgent` + 完整 IP **不打码**）+ `offset` 分页 |
| 5 | **服务端 8 项** | ①–③ `/api/admin/{overview,rankings,trends}` 新建 · ④ `/api/assets` 加 `status`（`assetStatusSchema ∪ 'ALL'`）/`owner`（**仅管理档** · 非管理档**静默忽略**）· ⑤ `download_event` 表 + 写入（**同事务**）· ⑥ `GET /api/audit/actions` · ⑦ `/api/labels/all` **形态变更**（数组 → `{ items, total, limit }` + 每条 `assetCount`）· ⑧ `DELETE /api/labels/:slug` **有挂载 ⇒ 400** |
| 6 | **迁移** | `apps/server/drizzle/0014_*.sql`：`download_event` **4 列**（`id` / `asset_id` FK / `version_id` 可空 / `created_at`）+ **2 索引**（`created_at` · `asset_id`） |
| 7 | **i18n** | 四页键表（design §6.2 / §6.3 逐条落地 · 复用键**已实测存在**）+ **既有键文案修正**：`assets.filter.status.active` 「活跃」→「**已上线**」（跨批 · 3 消费页自动跟随 · en 保持 `Active`） |
| 8 | **前端数据层** | `apps/web/src/api/admin.ts`（看板 3 端点 + 审计动作全集 + 标签全量） |
| 9 | **复用件（零新件）** | `ui/DataTable` · `ui/Pagination` · `ui/ColumnVisibilityMenu` · `market/{FilterStrip,SortMenu,format}` · `console/{Drawer,StatusPill,asset-stats}` · `ui/AssetAvatar` · 官方 `shadcn/{chart,combobox,select,calendar,popover,collapsible,dialog,sheet,switch}` |
| 10 | **验证** | 造数脚本 + dogfood `m4b6-*`（G1–**G14**）+ 八步门禁 + **零回归四脚本**（`m4a` / `m4b3` / `m4b4` / `m4b5`）|
| 11 | **文档同步 + 换靶脚本** | design §9.6/§9.7 回填 + 主 design / `docs/00` / `docs/05` / `docs/08` 同步（`download_event` 落库同步 `docs/08`）+ **换靶校验脚本进仓** `docs/smoke/scripts/doc-claims-check.ts`（design §3.1/§9.2/§9.4 口径 · 6 类检查）|
| 12 | **PoC 物料清理** | `apps/web/src/pages/__proto/`（4 页 + 数据模块）+ `main.tsx` DEV 路由 + `apps/server/tmp-*.ts` 探针删除（**U7** · 本批收尾） |

**非目标**（不属本批，归属已定）：
- **归属人筛选入口**（服务端 `owner` 参本批交付但**无 UI 入口**）→ **U11**（与 U6 同族）
- **用户管理 / 系统设置**两页 → **U6**（后续批）
- **下载事件表保留策略**（按天快照 / 归档）→ **U5**（后续批；本批只落表与写入）
- **审计导出（CSV / 流式）** → **U14**（后续批）
- **审计「仅看匿名 / 前缀级」筛选参数** → **U13**（暂不加 · 等价入口 = `action=auth.login.failure` 零改动）
- **标签定义权限放宽**（`>= 100` 运营单点）→ **U9**（风险已登记 · 本批不改权限）
- 另：审计页**只读**（无修改/删除）· 看板**不自动轮询**（D51）· 卡片/列表两态与列显示**不持久化**（刷新回默认）

**新增依赖：零**（`@base-ui/react@1.8.0` + `lucide-react` 已随 PoC 落地并经用户批准；`recharts@3.8.0` / `radix-ui@1.6.7` / `cmdk@1.1.1` 为既有）。**零新设计件**（四页均为正式页 + 复用件组合）。

> **登记缺口**：① 服务端 `download_event` 落表后**历史不可回溯**（表建成前的下载无时间戳 ⇒ 累计下载曲线自上线日从 0 长起，design §5.2 已登记，`docs/00` §5 同步）② 「仅看匿名」类筛选需服务端参数（U13）。

---

## 2. Task 总览

**执行序 = 服务端能力先行 → i18n → 前端页（看板 → 资产 → 标签 → 审计）→ 脚本 → 验证 → 文档/清理。**

| # | 归属 | 主题 | 前置 | 出口 |
|---|------|------|------|------|
| **T1** | server | `admin` 三只读端点（改动 **1–3**）：`overview` / `rankings` / `trends` + 路由注册 | — | **`bun test src/http/admin.test.ts`（新建）** + 鉴权矩阵 + `days` 夹值 |
| **T2** | server | `/api/assets` 扩参（改动 **4**）+ `GET /api/audit/actions`（改动 **6**） | — | **`assets.test.ts` + `audit.test.ts`（既有 · 扩充）**：「非管理档传参与不传逐条相同」+ 动作全集出参 |
| **T3** | server | `download_event` 表 + 写入（改动 **5** · 迁移 **0014**） | — | **`download.test.ts`（既有 · 扩充）** + 迁移 exit 0 + 事务回滚（事件失败 ⇒ 计数不增 + 仍放行） |
| **T4** | server | 标签面 2 处（改动 **7–8**）：`/all` 形态变更 + `DELETE` 挂载拦截 | — | 形态断言 + `label.in_use` **400** 断言 + `labels.test.ts` 同步 |
| **T5** | web | **i18n**：四页键表落地 + 复用键声明 + 「已上线」文案修正 | T1–T4（键名定案）| 键数实测 + 双向差集 **0** + 泄漏 0 |
| **T6** | web | 管理看板页 `AdminBoard.tsx` + `api/admin.ts` + `/admin` 换真页（**T6⁺ 重做**：标签维度两图 / 两处 Combobox / 英雄榜换官方 `Bar Chart - Label` / 卡级 `isolate`） | T1 · T5 | dogfood **G1–G5 + G14** 绿（含入口化 3 处） |
| **T7** | web | 资产管理页 `AdminAssets.tsx`（10 列 + 两态 + 抽屉 + 4 入口过滤 + 排序 + 列宽） | T2 · T5 | dogfood **G5–G7** 绿（含列宽归一化实测） |
| **T8** | web | 标签定义页 `AdminLabels.tsx`（两级树 + ↑↓ + 删除 + 表单） | T4 · T5 | dogfood **G8–G9** 绿 |
| **T9** | web | 审计日志页 `AdminAudit.tsx`（过滤 + 更多筛选 + 快捷 + 抽屉） | T2 · T5 | dogfood **G10–G11** 绿 |
| **T10** | script / 验证 / 文档 | 造数 + dogfood 全量 + 八步门禁 + 零回归 + 收尾回填 + 文档同步 + **PoC 清理** | T6–T9 | 八门禁 **exit 0** · 证据归档 · `doc-audit` 全绿 |

---

## 3. Task 明细

### T1 · server：`admin` 三只读端点（改动 1–3）

> 依据 = 批 design **§4.1**（看板四块口径）· **§5.1**（端点契约）· **§7**（改动 1–3）· **D33–D36 / D42 / D43**（平均审核时长 = `avg(reviewed_at − submitted_at)` over `APPROVED`）/ **D44**（标签覆盖度分子分母）/ **D45–D46 / D52–D54**。

1. 新建 `apps/server/src/admin/overview.ts`：`kpi`（`activeAssets` / `allAssets` / `downloads` / `downloads7d` / `pending` / `reviewsTotal` / `activeUsers` / `allUsers`）+ `labels[]`（`id` / `slug` / `name` / `count` / `downloads`）—— **T6⁺ 换靶**：`downloads7d`（固定近 7 个自然日窗口 · F208）与 `labels[]`（一级 + 上卷 + 仅 ACTIVE + 去重）为本次新增；原 `creative` / `types` 出参已删
   口径：**待审** = `review_task.status='PENDING'` 任务数（D33）· **有效用户** = `user.status='ACTIVE'` 账号数（D34 · 与 `/api/stats.totalUsers` 同口径）· **平均审核时长** = `avg(reviewed_at − submitted_at)` over `APPROVED`（空集 ⇒ `null`）· **标签覆盖度** 重复计入（D42）· **沉睡资产** = `status='ACTIVE'` 且上架 ≥30 天且 `download_count = 0`（D45 · 阈值 = 端点常量）
2. 新建 `apps/server/src/admin/rankings.ts`：`people[]` / `labels[]` / `assets[]`（各含名称与计数 · `people` = owner 的 `ACTIVE` 资产数，D46）
   **稳定排序（D53）**：资产榜 `download_count DESC, asset.id DESC` · 员工榜 `ACTIVE 资产数 DESC, user.id ASC` · 标签榜 `资产数 DESC, label.id ASC`
3. 新建 `apps/server/src/admin/trends.ts`：`?days=` ∈ `7/30/180/365`（**越界夹到最近档**，U8 已闭环）· **`Asia/Shanghai` 日切**（D35）· 窗口**含今天**共 N 点（D36）· 资产 = `count(*) WHERE created_at::date <= d::date`；下载 = 按天累计（§5.2）· **`downloads` 两态（D52）**：0014 未落 ⇒ `null`；落地后空表 / 零下载 ⇒ `0`
4. 新建 `apps/server/src/http/admin.ts`（`createAdminRoutes({ db })`）+ `apps/server/src/app.ts` 注册 `/api/admin/*`（`role >= 10` · `requireRole`）
   **实时查询、不加缓存、不加特殊 `Cache-Control`**（D54）

**测试文件**：**新建** `apps/server/src/http/admin.test.ts`（三端点 × 鉴权矩阵 + 聚合口径 + `days` 越界夹值 + 排行榜并列稳定）· 命令 `bun test src/http/admin.test.ts`

**断言 / 门禁**：① 鉴权矩阵：未登录 **401** / 用户档 **403** / 管理档 **200** ② 聚合口径：测试库造数后逐字段断言（含空集 ⇒ `null` / 「—」分支）③ `days` 越界值（`13` / `-1` / `9999`）⇒ **夹到最近档**（不 400）④ 排行榜**并列稳定**：同计数两行顺序在两次请求间一致 ⑤ `typecheck` + `biome` 绿

---

### T2 · server：`/api/assets` 扩参（改动 4）+ `GET /api/audit/actions`（改动 6）

> 依据 = 批 design **§5.4**（D19/D20）· **§5.1**（D23）· **§7**（改动 4 · 6）。

1. `apps/server/src/http/assets.ts`：`listQuerySchema` 增两个**可选**字段 —— `status`（`assetStatusSchema ∪ 'ALL'`）· `owner`（用户 id 精确匹配 · 长度上限同 `AUDIT_FILTER_MAX` = **256**）；**角色门**：管理档（`role >= 10`）透传、**非管理档忽略**（视作未传 ⇒ 等价现状语义 · 无参 = 仅 `ACTIVE`）
   服务层已具备：`listViewableAssets` 已参数化 `status`（缺省 `ACTIVE` · `'ALL'` ⇒ 不加条件）与 `ownerId`（`assets/service.ts`）
2. `apps/server/src/http/audit.ts`：新增 `GET /api/audit/actions` ⇒ `{ groups: [{ prefix, actions[] }] }`；**单源** = 服务端审计动作常量 + 写入点推导（常量导出 vs 静态清单 + 断言测试兜底，实现期定）；`role >= 10`；只读无副作用

**测试文件**：**扩充既有** `apps/server/src/http/assets.test.ts`（扩参三态：无参 / 管理档 `ALL` / 非管理档传参忽略）+ `apps/server/src/http/audit.test.ts`（`/actions` 出参分组）· 命令 `bun test src/http/assets.test.ts src/http/audit.test.ts`

**断言 / 门禁**：① **「非管理档传 `status`/`owner` ⇒ 结果与不传逐条相同」**（静默忽略的正证）② 管理档 `status=ALL` ⇒ 含 `HIDDEN`/`ARCHIVED` 行；**无参 ⇒ 仅 `ACTIVE`**（零回归正证）③ 动作全集出参：前缀分组 + 组内非空 + **实测已知动作在场**（`asset.*` / `review.*` / `label.*` / `token.*` / `auth.*` / `device.*` / **`namespace.*`**）④ `typecheck` + `biome` 绿

---

### T3 · server：`download_event` 表 + 写入（改动 5 · 迁移 0014）

> 依据 = 批 design **§5.2**（D38–D40 · 失败语义 = D39）· **§7**（改动 5）。

1. 新建迁移 `apps/server/drizzle/0014_*.sql`：`download_event`（`id` · `asset_id` FK · `version_id` 可空 · `created_at`）+ 索引 `created_at` · `asset_id`；同步 drizzle schema 定义
2. `apps/server/src/assets/download.ts`：`resolveDownload` 内 —— 授权通过后，`asset.download_count` 自增 **与** 插事件包在**同一 `db.transaction`**（调用点 `http/assets.ts` 现行无事务，需显式加）
   **失败语义（D39 · 保持不变）**：事件写失败 ⇒ **回滚自增 + warn 日志 + 仍放行下载**（不产生「计数 +1 却无事件」的偏账，也不因统计面阻断下载）
3. `apps/server/src/app.ts`：装配写入依赖

**测试文件**：**扩充既有** `apps/server/src/http/download.test.ts`（成功路径 + 失败注入 + 事务回滚）+ 复用 T1 的 `http/admin.test.ts`（趋势 `downloads` 两态）· 命令 `bun test src/http/download.test.ts`

**断言 / 门禁**：① `db:migrate` **exit 0**（`0014` 落库 · `\d download_event` 列数与索引名吻合）② 成功路径：下载一次 ⇒ `download_count` **+1** 且事件表 **+1 行**（`version_id` 取值与请求一致）③ **失败路径（注入）**：事件插入失败 ⇒ `download_count` **不增** + warn + 响应仍成功 ④ 空表 ⇒ `/trends` 的 `downloads` = **0**（D52 数值态）⑤ `typecheck` + `biome` 绿 + 相关测试文件全绿

---

### T4 · server：标签面 2 处（改动 7–8）

> 依据 = 批 design **§5.4** · **§7**（改动 7–8）· **D26–D30**（标签面拍板）· **D32**（`label.in_use` ⇒ **HTTP 400**）· **D41**（权限保持超管独占 `role >= 100` · 运营单点风险见 U9）· **U12 闭环**（`visibleInFilter` 默认打开）。

1. `apps/server/src/http/labels.ts` + `labels/service.ts`：`GET /api/labels/all` **形态变更** —— 数组 → `{ items, total, limit }`，且每条附 `assetCount`（挂载数）；`limit` = env `LABEL_MAX_DEFINITIONS`（现值 **100**）
2. `DELETE /api/labels/:slug`：**有挂载 ⇒ 400** `label.in_use`（错误码新增 1 个，走既有 `LabelError` 穷尽 switch）；**无挂载 ⇒ 正常删除**（级联：翻译行同删）

**测试文件**：**同步既有** `apps/server/src/http/labels.test.ts`（形态变更断言改写 + `label.in_use` **400** 用例）· 命令 `bun test src/http/labels.test.ts`

**断言 / 门禁**：① 形态断言：`items`/`total`/`limit` 三字段在场 + `assetCount` 与真库吻合（真库实测 `agentic` = **2** · `m4b4-seed-privileged` = **1**）② 有挂载删除 ⇒ **400 `label.in_use`**；无挂载 ⇒ **200/204** 且行消失 ③ **`labels.test.ts` 同步形态断言**（测试是上游契约 —— 此处属**有意契约变更**，非「为本地 hack 改测试」）④ 消费者清点：`/api/labels/all` **零生产消费者**（仅测试 + 本批新页 · 实测 grep）⑤ `typecheck` + `biome` 绿

---

### T5 · web：i18n（四页键表 + 复用键声明 + 跨批文案修正）

> 依据 = 批 design **§6.1**（三规则：扁平点号键 · 逐页键表齐 · **声明复用必须 grep 实证**）· **§6.2**（看板 + 资产管理）· **§6.3**（审计 + 标签）· **§3.1**「已上线」修正段。

1. `apps/web/src/i18n/zh.ts` / `en.ts`：按 `design §6.2/§6.3` 逐条落地（**新增键**：看板 `board` 组 / 资产管理 2 键〔`admin.assetsDesc` · `admin['assets.col.owner']`〕/ 审计页组名与列键 / 标签页列与表单键；**复用键**：`assets.*` / `market.*` / `common.*` / `review['col.actions']` / `admin.*`）
2. **跨批文案修正**：`assets.filter.status.active` 「活跃」→「**已上线**」（en 保持 `Active`）；消费页自动跟随（`pages/AssetDetail.tsx` · `pages/Assets.tsx` · 本批资产页）
3. 自检：键存在性 + 双语成对 + 组对称 —— **按 design §3.1 口径**执行（换靶校验脚本 `docs/smoke/scripts/doc-claims-check.ts` **随本批进仓，见 T10**；在此之前用临时脚本核）

**测试面**：**无单测**（仓内 `apps/web` 无 `test` 脚本 · 零测试文件）⇒ 验证 = 本节脚本自检 + `typecheck` + `biome`

**断言 / 门禁**：① 键数实测（脚本输出 · 与 design 声明逐项对上）② **zh/en 双向差集 0** · en 值级泄漏 0 ③ 复用键**逐条实测存在**（防「假复用」—— design §6.1 已登记该类坑）④ `typecheck` + `biome` 绿

---

### T6 · web：管理看板页 + `api/admin.ts` + 路由换真页

> 依据 = 批 design **§4.1**（四块口径 + 线框 §4.5）· **§4.9**（UI 定案）· **§5.1** · **D1–D18**（含 D2 数字卡 / D3 累计口径 / D4 拆两张 / D5 **选择器共享** / D9 轴标签 / D10 密度三级 / D11 英雄榜 / D12 不放 footer / **D13 同心环** / **D14 雷达 Dots** / D17 门槛）/ **D31 · D37（默认近 30 天）· D50 · D51**。

1. 新页 `apps/web/src/pages/AdminBoard.tsx`（**T6⁺ 形态 · 六段**）：页头卡（门户 `CenterPage` 同构 + eyebrow `ADMIN`）+ `Kpi ×4`（**D2**：已发布资产 / 累计下载 / 待审 / 有效用户 · 各带副行 hint；「累计下载」副行取**服务端** `kpi.downloads7d` —— F208）+ 趋势卡（**D3/D4** 累计口径 · 两张小图并排各带纵轴 · **D5 共享一个官方 `Combobox`**〔右上 · 近 7 天 / 近 30 天 / 近半年 / 近一年〕· **D37 默认近 30 天** · 官方 `Area Chart - Axes` + 渐变 · 纵轴自 0 起）+ **标签维度两图**（(c) 同心环 **官方 `Radial Chart - Grid`** · (d) 雷达 **官方 `Radar Chart - Grid Circle`** · 数据源 `overview.labels[]` · 取色 13 色池按行序 · 图下行色点自绘）+ 排行榜单卡（**D6/D7/D8**：`CardTitle` + 紧右 Top N `Combobox`〔10/20/30/50〕+ 右上三口径按钮〔人/资产/标签 · 数字 = 榜内合计〕· 官方 `Bar Chart - Interactive` · **D9** 人 = 工号 + 姓名 · 类目名 **-45° 斜排 + 截断 14 字符** · **卡级 `isolate`**〔F208-A〕）+ 英雄榜单卡（**D11/D12 修订**：外壳卡 + 两内层 muted 分区块 · 官方 `Bar Chart - Label` 竖柱 + 柱顶数值 · 类目名**水平多行**、无副标题/页脚）
2. `apps/web/src/api/admin.ts`：`fetchAdminOverview` / `fetchAdminRankings` / `fetchAdminTrends(days)`
3. `apps/web/src/main.tsx`：`/admin` 占位/重定向 → **真页**（`/admin` 恒为看板 · `/admin/reviews` 仍为 M4b-5 真页）；入口化 3 处（D50：待审卡 → `/admin/reviews` · 已发布资产卡 → `/admin/assets` · 标签挂载数 → `/admin/assets?label=`）

**测试面**：**无单测**（仓内 `apps/web` 零测试基建 —— 前端验证 = 本节 dogfood **端到端**断言〔含 DOM 量值〕+ `typecheck` + `biome`）

**断言 / 门禁**：① dogfood **G1**：4 数字卡数值 = 端点返回值（**「累计下载」副行 = `kpi.downloads7d` 且切四档不变** —— F208 专条）② **G2**：Top N 切换 ⇒ 条数 = `min(N, 实际)` · 三口径切换请求参数正确 ②′ **趋势两图**：档位四项切换 ⇒ 两点位数 = N（含今天）· **默认 = 近 30 天**（D37）· 两图同步 ②″ **标签维度两图在场**：同心环（`PolarGrid gridType="circle"`）与雷达（同心网格 + 轴文字 + 色点）各自成形、无数字标签外溢 · 两图数据源 = `overview.labels[]`（一级/上卷/仅 ACTIVE/去重）· 口径三向一致（`overview.labels[] ↔ rankings.labels ↔ /api/labels/all.assetCount`）③ **G14（T6⁺ 新增段）**：六段结构在位 · 「创意四项」「类型维度」字样**不出现** · 排行榜斜排类目名不越出卡片 · 英雄榜两榜各 3 行且水平多层不越界 · **层叠守护**（卡内 `button[data-active]` 与 TopBar 重叠点 `elementFromPoint` 命中 TopBar）④ `typecheck` + `biome` 绿

---

### T7 · web：资产管理页（全站治理列表）

> 依据 = 批 design **§4.2**（4 入口过滤 / 列集 / 列宽 / 抽屉 / 两态）· **§4.8**（URL 参数）· **D19–D20 · D52–D53**。

1. 新页 `apps/web/src/pages/AdminAssets.tsx`：`DataTable`（`density="default"` + `tableFixed`）**10 列** —— 名称〔保护〕/ 描述 / 类型 / 状态〔文案「已上线 / 已隐藏 / 已归档」〕/ 归属人 / 最新版本 / 下载 / 收藏 / 更新 / 操作〔保护〕
   **列宽 = 权重 16/22/8/7/10/7/7/7/8 = 92% + 操作槽 8%**（运行期归一化：CSS 变量 + 字面量类 `w-[var(--cw-*)]` 规避 Tailwind JIT 扫不到拼串类名）
2. 过滤 4 入口：标签 `FilterStrip`（复用门户件）+ 类型 `Select` + **状态 `Select`（默认「全部」⇒ 显式 `status=ALL`）** + 搜索折叠（`Collapsible` + `InputGroup`）
3. 工具条：列显示（`ColumnVisibilityMenu` · **保护 2 列**〔名称/操作〕· 不持久化）+ 排序（`SortMenu` · `sort`/`dir` 三档白名单 + 列头三列可点同源）+ 卡片/列表 `ToggleGroup` + 分页（`limit`/`offset` 控制台口径）
4. 详情抽屉：官方 `Sheet` + `console/Drawer`（宽 560）· 只读 · 字段含**描述**（`latestDescription` · 空 ⇒ 「—」）；**可达性**：`owner ∨ role >= ADMIN` ⇒ 不 404
5. `main.tsx`：`/admin/assets` 换真页；侧栏「资产管理」条目（M4b-1/2 已落）指向

**测试面**：**无单测**（仓内 `apps/web` 零测试基建 —— 前端验证 = 本节 dogfood **端到端**断言〔含 DOM 量值〕+ `typecheck` + `biome`）

**断言 / 门禁**：① dogfood **G5**：列头逐字 10 项 + 行数 = 接口 total ② **G6**：状态筛选切「已隐藏」⇒ 请求带 `status=HIDDEN` · 默认 ⇒ **`status=ALL`** ③ **G7**：**列宽归一化实测**（隐藏「描述」⇒ 其余数据列按权重摊满 92% · 操作列恒 ≈87px · `scrollWidth = clientWidth`）④ 排序：点「下载/收藏/更新」列头 ⇒ URL `sort`/`dir` 变化且数据真变；其余列头无动作 ⑤ 抽屉：行点开 / 字段齐 / 空描述「—」/ 两态点击行为（列表整行开抽屉 · 卡片进详情页）⑥ 非管理档传参忽略已由 T2 覆盖（前端不额外暴露）⑦ `typecheck` + `biome` 绿

---

### T8 · web：标签定义页（两级树 + 排序 + 表单）

> 依据 = 批 design **§4.3**（含 v0.22 层级视觉定值 · **U12 闭环**）· **§6.3** 键表 · **D26**（列表列集与挂载数可点）/ **D28**（行内 ↑↓ + 一次 `PUT /order`）/ **D29**（翻译两栏 · 保存 = 整组替换）/ **D30**（表单字段 · `visibleInFilter` 默认打开）。

1. 新页 `apps/web/src/pages/AdminLabels.tsx`：页头卡 + **上限块**（数据 = `/all` 的 `total`/`limit` · ≥90% `tone="warn"`）
2. 两级严格树：一级缩进 0 / **二级 28px + 2px 浅色引导线** · **chevron 仅在有子级的一级行** · 默认折叠 · 行集 = 显示名(zh) / slug（mono）/ 类型徽标 / 过滤可见 / **挂载数（可点 → `/admin/assets?label=<slug>`）** / 操作
3. 行内动作：↑↓（**首末禁用** · 一次 `PUT /order` 提交整组〔上限 200〕· 失败回滚本地顺序 + toast）· 编辑 · 删除
4. 删除确认 `Dialog`：**「已挂载 N 个资产」+ 后果 + 「请先在资产上解挂」+ 确认钮禁用**（服务端 400 语义前置）；无挂载 ⇒ 直接确认
5. 创建/编辑 `Dialog`（**同一对话框两态**）：slug（**创建后禁改**）/ 类型（`RECOMMENDED`·`PRIVILEGED` + 内联提示「仅超管可挂」）/ 父级（仅一级 · 提示「应用层锁两级」）/ 中文名 / 英文名 / **`visibleInFilter` 开关（默认打开）**；翻译**整组提交**；`sortOrder` 表单不填
6. `main.tsx`：`/admin/labels` 占位 → 真页

**测试面**：**无单测**（仓内 `apps/web` 零测试基建 —— 前端验证 = 本节 dogfood **端到端**断言〔含 DOM 量值〕+ `typecheck` + `biome`）

**断言 / 门禁**：① dogfood **G8**：树渲染（真库 2 一级 + 1 二级[测试期]）· 折叠/展开 · **二级 `padding-left: 28px` + 引导线 `2px`**（DOM 量值断言）· 上限块数字 = `/all` ② **G9**：↑↓ 顺序变化 ⇒ 请求体 `order[{slug,sortOrder}]` 正确；首末行钮 `disabled`；删除按钮态两分支（有挂载 ⇒ 确认禁用）③ 权限：非超管 ⇒ 守卫弹回 ④ 空态「创建第一个标签」引导 ⑤ 错误映射（400/403/404 ⇒ 既有 `LabelError` 文案）⑥ `typecheck` + `biome` 绿

---

### T9 · web：审计日志页

> 依据 = 批 design **§4.4**（含 v0.20/v0.24/v0.25 三轮校准）· **§4.4b**（动作出参）· **D21**（页面命名「审计日志」）/ **D22**（常显 = 动作分组下拉 + 时间区间 · 5 维折叠）/ **D24**（列集 + 行内「查看」+ 详情抽屉）/ **D25**（日期默认近 7 天 + 快捷四项）/ **D47**（默认全部动作 · 不收窄）/ **D48**（操作者 = 工号 + 姓名 · 无 actor ⇒ 「—（匿名）」）/ **D49**（详情全量原样 · IP 不打码）· **D55/U13/U14** 边界。

1. 新页 `apps/web/src/pages/AdminAudit.tsx`：页头卡（数值 = 审计总行数 + 副行近 7 天）
2. 过滤区（常显）：**快捷三键**〔近 24 小时（`from` = now−24h）· 版本下架（`action=asset.version_yank`）· 清除筛选〕+ **动作分组下拉**（数据 = `/api/audit/actions` · 组名 i18n · **未知前缀原样显示**）+ 日期区间〔今天 / 近 7 天〔默认〕/ 近 30 天 / 自定义〕（自定义 = 官方 `Calendar` · 落 `from`/`to`）
3. 「更多筛选」折叠 5 维：`targetType` / `targetId` / `actorId` / `requestId` / `clientIp`（**上限 64/128/256/64/64** · 输入 `maxLength` 同步）
4. 表格 6 列（+ 操作槽 **8%** · 列宽合计 **92%**：14/20/14/16/12/16）：时间〔**`Asia/Shanghai`** 秒级〕/ 动作〔原始串〕/ 操作者〔工号 + 姓名 · 无 actor ⇒ 「—（匿名）」· 长值 `title`〕/ 目标〔`targetType:targetId`〕/ 来源 IP / 请求 ID
5. 行详情抽屉：`detail` 美化 JSON + `userAgent` + **完整 IP（不打码）**；`offset` 分页（`total > PAGE_SIZE` 才渲染）+ 翻页回顶
6. `main.tsx`：`/admin/audit` 占位 → 真页

**测试面**：**无单测**（仓内 `apps/web` 零测试基建 —— 前端验证 = 本节 dogfood **端到端**断言〔含 DOM 量值〕+ `typecheck` + `biome`）

**断言 / 门禁**：① dogfood **G10**：表头 6 列序对 · 行数与接口一致 · 时间格式 `YYYY-MM-DD HH:mm:ss` 且为**本地（Asia/Shanghai）**② **G11**：动作下拉组数 = 端点实测组数 · 点「版本下架」⇒ 请求 `action=asset.version_yank` · 快捷「近 24 小时」⇒ 请求带 `from` ③ 抽屉：`detail` 全量在场 + `userAgent`/IP 完整（**不打码**断言）④ 权限四档 ⇒ 未登录 401 / 用户档 403 前端守卫 ⑤ 空态 / 错重试 / 长值截断无溢出 ⑥ `typecheck` + `biome` 绿

---

### T10 · script / 验证 / 文档（造数 + dogfood + 门禁 + 收尾 + 清理）

> 依据 = 批 design **§9**（回归面与验证口径）· **§9.3**（dogfood 分组）· **§9.4**（出口件 ④）· **§9.5**（造数）· **§9.6/§9.7**（文档同步与收尾回填）。

1. 造数 `docs/smoke/scripts/m4b6-seed-*.ts`（**写库需授权**）：`download_event` **跨天分布** N 条（覆盖下载曲线分支）+ 少量多状态资产（`HIDDEN`/`ARCHIVED`）+ 标签二级样例（幂等）
2. dogfood `docs/smoke/scripts/m4b6-governance-dogfood.ts`：**G1–G14**（逐页分组 · `SMOKE_ONLY=G5` 分段执行 · 收尾才全量；**G12 = F206 侧栏激活唯一性** · **G13 = F207 顶栏形态 + 页内标题** · **G14 = 看板重做段（T6⁺）** · **F210 = 4 条空断言修复（G2 换官方 Combobox 真换档 / G4 改 data-active + 柱数=端点）**，均 2026-09-23 追加）
3. **换靶校验脚本进仓** `docs/smoke/scripts/doc-claims-check.ts`（design §3.1 / §9.2 / §9.4 口径 · 6 类检查）：① 引用逐条回读（`file:line` + 期望关键词）② 同一量跨节对照 ③ 件表 ↔ 改动号 ↔ 端点表**三向一致** ④ 机制声明实测复核 ⑤ UI 契约 ↔ 真码回读（件路径存在性 / props 形态 / i18n 键覆盖）⑥ **头部版本行不得陈旧或乱序**
4. 八步门禁（§4）逐项 **exit 0**；**零回归四脚本**：`m4a` / `m4b3` / `m4b4` / `m4b5`（口径 = **无新增失败**）
5. 证据归档：本批证据文件 = `docs/smoke/` 下 `2026-09-23-m4b6-governance-console.md`（**T10 交付** · 截图 + 断言输出 + 真库读数）
6. 收尾回填：design **§9.6/§9.7** 实测值（键数 / 端点行数 / 迁移行数 / i18n 组数）+ 主 design §2.3 状态 + `docs/00` §5 M4b-6 行（🔷 → **✅ 完成**）+ `docs/05`/`docs/08` 同步（`download_event`）
7. **PoC 清理（U7）**：删 `apps/web/src/pages/__proto/`（4 页 + `dashboard-data.*` + `labels-data.ts` + `audit-data.ts`）+ `main.tsx` DEV 路由与 import + `apps/server/tmp-labels-audit-probe.ts` / `tmp-label-seed-child.ts` / `tmp-dashboard-probe.ts`；`main.tsx` 复跑确认**零 diff**

**断言 / 门禁**：① dogfood 全量 **PASS / 0 FAIL / 0 超时** + 每段 `NO JS ERRORS` ② 八门禁 **8/8 exit 0**（含 `doc-audit` 全绿）③ 零回归四脚本无新增失败 ④ `main.tsx` 清理后与 HEAD 无差异（`git diff --stat` 为空）⑤ 证据文件归档 + 主 design/`docs/00` 状态回写

---

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```text
bun install --frozen-lockfile → typecheck → lint → format:check →
bun docs/smoke/scripts/doc-audit.ts → build → db:migrate → test
```

逐项 **exit 0** 才算过；顺序**不得调换**（CI 同序）。**每 Task 收尾**先跑本包 `typecheck` + `biome`，**落地前**跑全量八步。
**测试面硬规则（v0.3）**：
- **服务端每个 Task 必带 `bun test` 用例** —— 新建或**按面就近扩充既有文件**（`http/*.test.ts` / `audit/*.test.ts`），文件逐 Task 点名于 §3；命令 `bun test src/<file>`，收尾须 **0 fail**。
- **前端每个 Task 必带 dogfood 断言**（CDP 真浏览器 · 含 DOM 量值断言）—— 仓内 `apps/web` **无 `test` 脚本、零测试文件**（实测），故**不引单测基建**（如需引入应另立批并计依赖）；前端 Task 的最低门 = dogfood 对应分组 + `typecheck` + `biome`。
- 两类之外，**全部 Task** 仍须过八步门禁；「无测试」不构成跳过门禁的理由。**dogfood 逐段跑**（`SMOKE_ONLY=G5`），**收尾才全量**；每段 `NO JS ERRORS` 为硬门。

**跨平台说明（Win / macOS / Linux）**：本批**无平台特定改动** —— 服务端为纯 SQL 聚合 + 一个迁移；前端为页面与件组合；`Asia/Shanghai` 日切统一在服务端实现（不依赖宿主时区）。Windows 侧注意：`bun` 脚本路径分隔符、`db:migrate` 在 Docker 中的执行（与既有批同）。

---

## 5. 造数需求（**写库需用户授权**）

- `docs/smoke/scripts/m4b6-seed-*.ts`（T10 交付）—— **幂等**：
  ① `download_event` 跨天分布（覆盖「下载曲线非空」与「跨天累计」两分支）② 多状态资产（`HIDDEN` / `ARCHIVED` 各 ≥1，供「状态筛选 / 全站 vs 已上线」对比）③ 标签二级样例（供两级树缩进断言）
- **口令只从 env 读**（复用既有约定）；运行方式 `bun --env-file=apps/server/.env …`
- ⚠️ **写库前须获用户明确授权**（本 plan 不代为执行）
- 清理：造数脚本须提供 `--clean`（或文档给出删除 SQL），收尾时按需回滚

---

## 6. 风险与回退

| # | 风险 | 缓解 / 回退 |
|---|------|------------|
| 1 | **`/api/labels/all` 形态变更**（数组 → 对象）漏改消费点 | 消费者已实测清点 = **测试 + 本批新页**（零生产消费者）；`typecheck` + `labels.test.ts` 同步断言兜底 |
| 2 | 状态筛选 / 归属人参数**依赖改动 4** ⇒ 页面先上而参数未落 | T2 先于 T7/T9；页面按「无参 = `ACTIVE`」语义工作（点了不生效不报错）；标注依赖直至 T2 合并 |
| 3 | 下载事件表**历史不可回溯**（曲线从 0 起） | design §5.2 + `docs/00` §5 已登记；UI 空态「—（暂无下载历史）」与 `0` 两态区分（D52） |
| 4 | 迁移 **0014** 在既有库上的**幂等 / 回滚** | 迁移只**新建表 + 索引**（不改既有列）⇒ 向后兼容；`db:migrate` 进八步门禁；异常时 `DROP TABLE download_event` 回退（无消费方依赖旧数据） |
| 5 | 列宽运行期归一化（CSS 变量）在 **Tailwind JIT** 下失效 | 只用**字面量类** `w-[var(--cw-*)]`（运行期拼串类名不生成）；T7 dogfood 有 DOM 量值断言（92% / 操作槽 87px / `scrollWidth = clientWidth`） |
| 6 | **真库 44 资产 / 2,474 审计行**规模下聚合端点慢 | 本批明确**不加缓存**（D54）；真库量级实测可接受；若后续放大 ⇒ 单独批加索引/缓存（不在本批） |
| 7 | 造数污染门户 / 「我的资产」/ 看板数字 | 造数只用**非 `ACTIVE`** 状态 + 专用标签样例；看板数字会变（**预期**）⇒ dogfood 断言取**接口返回值**而非硬编码数字 |
| 8 | **登录限流**（20 次 / 15 分钟）被多轮 dogfood 打满 | `SMOKE_ONLY` 分段 + 会话复用；打满则重启 api（内存计数清零）；已知坑（M4b-5 · F191）|
| 9 | PoC 物料残留误入提交 | T10 清理后 `git status` 复核 + `main.tsx` 零 diff 断言；`.gitignore` 无新增需求（物料本就未跟踪）|

---

## 7. 落地记录（执行期回填）

> 逐 Task 收尾回填：**实测断言数（PASS/FAIL）· 门禁结果 · 发现（F 号）· 偏差申报**。

| Task | 日期 | 实测 | 门禁 | 发现 / 偏差 |
|------|------|------|------|------------|
| **收口复核 Ⅱ** | 2026-09-24 | 自测试 → 真库/真页追根：**F213**（G3.5 假红 · 断言用长度相等较取色）· **F214**（标签删除前置漏「有子标签」）· **F215**（`pickDisplayName` 漏主语言前缀回退 ⇒ 中文界面显示英文；`m4a` 因此 56/4，修复后恢复 58/2）· **F216**（标签写面漏 `invalidateCache` ⇒ 创建后要刷新才显示 · 用户报）· 门禁 8/8 + dogfood **92/0** + 四脚本等于基线 | 八门禁 + doc-audit 111/0 + doc-claims 46/0 | **F213–F216 —— 明细见批 design §9.8**（本表只留一行摘要；登记形态约定见 `docs/designs/README.md`） |
| **③ lint 整理笔（A+C）** | 2026-09-24 | 清既有 warning **138 → 73**：(A) 自动修 44 文件（未用 import/变量/字面量键/安全可选链）+ (C) `biome.json` 忽略写法迁移；**5 处类型敏感改写回退**（`!` → `?.` 会引入 `T | undefined`，typecheck 拦下 4 + 人工审出 1）；修回 1 处被误删的文件头注释（`http/reviews.ts` 权限面说明）；余 73 条 (B) 类登记后置（证据 §8 item 10） |
| **① 重挂归属（G16）** | 2026-09-24 | 把「重挂 ⇒ 看板一级上卷」从**未证项**升为**常驻断言**：新增 G16（6 条）—— 端点三态（原子行消失 · 零计数目标新父 count **0 → 1** 严格等值 · 上卷 sum **3 → 3** 守恒 · `rankings` 逐条同面）+ 真页图例行数对齐 + 复原逐字段回落（自清）· **反证**：停掉重挂 ⇒ ① ② ⑥ 三条 FAIL ⇒ 全量 **102 → 108 PASS / 0 FAIL** · 证据 §8 item 9 闭合 |
| **F221 跨批断言过时（记账轮）** | 2026-09-24 | 补跑口径外四支 ⇒ 契约链 34/0 全绿、M4b-2 三支 **18 条红**；定性 = **断言写死历史结构真值**（侧栏 14/管理 2/顶栏 4 件/占位 toast/`[data-slot="alert"]`/`/admin` 重定向），撞 M4b-4/M4b-6/T11-i/F207/登录落点演进；**非本轮引入**（正反双证：本轮 0 触碰相关文件 + 改动前原文复跑同样红）⇒ 修法 = 新增 `docs/smoke/scripts/nav-truth.ts`（SSOT 解析）把断言取真值 + 修 3 处脚本缺陷（`signIn` inPlace · `[role=alert]` · 占位条目按组定位）+ 补自带桌面视口 | 四支复跑 **24/0 · 14/0 · 49/0 · 34/0** = 121 断言全绿 · NO JS ERRORS | 证据 §5.10 |
| **③-B lint 清零（挂账 ③）** | 2026-09-24 | 实测 **71** 条 → **0**（零行为变更）：`noNonNullAssertion` 66（**52 条 = Hono 上下文取值** ⇒ 新增 `apps/server/src/http/context-access.ts`（`principalOf`/`rbacOf`/`paramOf`，显式取值+缺即抛）；**14 条 = 必然存在的行/索引** ⇒ 逐处显式收窄：`if (!row) throw unreachable` 5 · `?? 兜底`+注释 6 · 循环判空 1 · `findSkillMainEntry` 判空 1 · CRC 表 2）· `noTemplateCurlyInString` 3（模板串 `\${…}`，值等价）· `noExplicitAny` 1（`AnyPgColumn`）· `noDocumentCookie` 1（带理由 ignore：Cookie Store API 非跨浏览器）| `bunx biome lint` 三包 **258 文件 0 warning/0 error** · `typecheck --force` 4/4 · `format:check` 305 · `test --force` **599 pass / 0 fail** · 真页回归**逐项等于基线**（本批 dogfood **108/0** · `m4a` **60/0** · `m4b3` **43/0** · `m4b4` **89/0** · `m4b5` **62/0** · 后三支 seed→dogfood 成对跑） | 证据 §5.9 / §6 |
| **⑦⑧ 形式缺口实证（挂账 ②）** | 2026-09-24 | 用户授权写库：新增一次性探针 `m4b6-probe-colorpool-and-hidden-mount.ts`（`--verify/--seed/--clean`）⇒ 造 14 个零挂载一级标签 + 1 个「仅挂 `HIDDEN` 资产」标签（+1 HIDDEN 资产 +1 挂载）⇒ 真页 + API **22 PASS / 0 FAIL**：⑦ 两图图例各 22 行 · `index 13..21` 取色**换圈**回 `0..8` · 前 13 行 13 色互异（含 rgb 解析）· ⑧ 删除弹窗**第三支**文案 + `disabled`/`opacity 0.5`/`pointer-events:none` + **对照组**第四支可用 ⇒ **自清**回落（一级标签 22 → 7 · 资产 54 → 53） | 探针 22/0 · 自清逐项回落 | 3 张留证截图 + 证据 §5.8 |
| **F220 `m4a` 断言真值化** | 2026-09-24 | 挂账 ① 收口：`m4a` 两条**恒假红**定性为**断言过时**（真值口径已改 `+N/−M` 签名 · 原 `searchByPrefix` = 全页搜索命中「变更历史」的**假命中**）⇒ ① 改为按**签名**断言三类变更（修改/只增/只删 · 文件名与数字从 DOM 读）② 改为**展开「只增」行后在该文件 diff 区内**取证（幂等兜底）⇒ **58/2 → 60/0** ✅；**正反双证**见证据 §5.7 | 零回归四脚本全绿（60/0 · 43/0 · 89/0 · 62/0） | — |
| **F219 跨批断言 + 夹具复位** | 2026-09-24 | 收口期发现 `m4b4` dogfood 两条**断言侧**缺陷（`G20-9` 写死 `/skills` 6 行 · `G6` 用词「活跃」而真值文案是「已上线」）⇒ 修为**端点真值/真值文案**；另 4 条 yank 类红由 `m4b4-seed-assets` 复位修复（夹具 1.0.0 曾被跑测打成 YANKED + latest 指针空）⇒ `m4b4` **83/6 → 89/0** ✅ · 并固化「seed → dogfood **成对跑**」 |
| **② 造数复位（写库）** | 2026-09-24 | 用户授权后执行三脚本：`m4b3-seed-submissions` · `m4b5-seed-reviews` · `m4b6-seed-downloads --clean` → 重播（id 10031 → **12418**）。先只读盘点再写、回读校验（`review_task` PENDING 8 → **13**）⇒ 零回归 **21 → 2 条**（`m4b3` **43/0** · `m4b5` **62/0** · 本批 dogfood **102/0** 复跑不变；`m4a` 2 与 `m4b4` 6 另有根因，已在证据 §6 实锤定位） |
| **F218 一级可重挂** | 2026-09-24 | 用户拍板「②」（F217 自测成功当天的逐字指令）：服务端删「一级不可降级」硬拒 → **安全重挂**（目标必须一级 + **自身无子级** ⇒ 400 `label.parent.has_children`）· 前端下拉放开（候选排除自身 / 有子级禁用 + 说明）· i18n 改写（键数不变）· **规范层 `docs/06` v1.7**（含偏离 skillhub 契约的理由）· 用例 F218（5 步）+ dogfood **G8.8/G8.9 改写 + G8.11/G8.12**（真页往返 + 自清）+ 反证 ⇒ 断言 **100 → 102** · 四脚本零回归零漂移 |
| **T1** | 2026-09-23 | `/api/admin` 三只读端点 + `http/admin.test.ts`（新建 · 14 例）⇒ 全包 **576 pass** | typecheck + biome + `bun test` exit 0 | — |
| **T2** | 2026-09-23 | `/api/assets` 扩 `status`/`owner`（**仅管理档**；非admin传参与不传逐条相同）+ `/api/audit/actions`（含动作目录反漂移测试）⇒ 全包 **586 pass** | 同上 | — |
| **T3** | 2026-09-23 | `download_event` 表 + 迁移 **0014** + **同事务**写入（事件写失败 ⇒ 回滚计数 + warn + 仍放行 · D39）⇒ 全包 **589 pass** | + `db:migrate` exit 0 | 顺带修 `migration-rules.test.ts` 表数守卫 15 → **16** |
| **T4** | 2026-09-23 | `/api/labels/all` 形态变更（`items`/`total`/`limit` + `assetCount`）+ `DELETE /:slug` 有挂载 ⇒ **400** `label.in_use` ⇒ 全包 **590 pass** | 同上 | — |
| **T5** | 2026-09-23 | i18n 四页键表（`board` 新组 + `admin` 扩键 · zh/en 差集 0） | 脚本自检（前端无单测基建，§4 已声明） | 泄漏面当时未复查出 ⇒ 见 T10 **F205** |
| **收口复核** | 2026-09-24 | **F211 / F212**：① F212 标签删除口径前置（`/all` 加性补 `mountCountAny` · 标签页禁用条件 + 三段文案 · 服务端用例 · dogfood G8.5/G8.6 含反证）② F211 资产页分页 URL **定案跟门户 `?page=`**（撤回 v0.9 的 limit/offset 条） | dogfood **88 → 90 PASS / 0 FAIL** · 门禁八步绿 | **F211 / F212** |
| **T6⁺ 收口** | 2026-09-23 | **F210 门禁腐化修复**：dogfood G2 重写（官方 Combobox 真换档 + 首刻度龄硬证据）· G2.2 改题注数值态 · G4 改 `data-active` 定位 + 柱数=端点非零条数 · 两条反证（翻期望⇒FAIL）· 截图换 `g2-board-trend-7` / `g4-board-rank-label` | dogfood 全量 **84 → 88 PASS / 0 FAIL** | **F210** |
| **T6⁺** | 2026-09-23 | **看板维重做（用户逐条拍板）**：删创意四项/类型维度（出参连带）· 加标签维度两图（官方 `Radial Chart - Grid` / `Radar Chart - Grid Circle` · 13 色池按行序）· 趋势档位改官方 `Combobox`（右上）· 排行榜换竖柱 + 斜排截断 + 卡级 `isolate` · 英雄榜换官方 `Bar Chart - Label`（竖柱 + 柱顶数值 + 水平多行类目名）· 副标题/页脚全清 · 服务端加 `kpi.downloads7d` + 标签口径三处同面 | typecheck + biome + dogfood **G14**（8 条） | **F208**（KPI 副行随趋势档位漂移）· **F208-A**（官方按钮 `z-30` 盖住 TopBar）· **F209**（`doc-claims` 键数锚点盲区） |
| **T6** | 2026-09-23 | 看板真页 `AdminBoard.tsx`（645 行）+ `api/admin.ts` + PoC 图表件转正（`chart`/`combobox`）· 冒烟：overview 33/52/1521/9/331 · trends downloads **0** · 用户档 **403** | typecheck + biome + dogfood G1–G5 | **F203**（`overview.types[]` 加性补） |
| **T7** | 2026-09-23 | 资产管理真页（625 行 · 全站治理 10 列 + 状态筛选默认全部 + 详情抽屉）+ 侧栏条目 / 路由 | typecheck + biome + dogfood G6/G7 | i18n 泄漏 ⇒ 见 T10 **F205** |
| **T8** | 2026-09-23 | 标签定义真页（574 行 · 两级树 + ↑↓ + 删除确认 + 创建/编辑对话框 · **仅超管**） | typecheck + biome + dogfood G8 | dogfood G8 初版**选错账号**（管理档 10 被 403）⇒ 改 `m4b2_super`(100) 后全绿 |
| **T9** | 2026-09-23 | 审计日志真页（565 行 · 服务端过滤 + 动作全集下拉 + 详情抽屉）+ `api/audit.ts` 扩 | typecheck + biome + `bun test`（590）+ dogfood G9/G10 | **F204**（审计 `actorName` leftJoin） |
| **T10** | 2026-09-23 | 造数（**37** 事件 / 14 天）· dogfood 全量 **41 PASS / 0 FAIL** · 换靶校验 **43 / 0** · **F205 修缮**（28 处中文 + 17 键 + 1 行 stale）· 证据文件 · PoC 清理零残留 | `doc-audit` **111 / 0** + `doc-claims-check` **43 / 0** · 八步 7 绿（`lint` 预存在红） | **F205** + 未证项 4 条（证据 §8） |
| **T10⁺** | 2026-09-23 | **F206 修缮（用户报缺陷 · 非计划内 · 不占新编号）**：侧栏「管理看板」在 `/admin/*` 任一子页与子页**双亮**（用户实证）⇒ 判定收敛为**路径精确相等**（删 `EXACT_MATCH_PATHS` · 门户 `<NavLink>` 补 `end`）+ dogfood **G12** 追加（15 条断言）⇒ 全量 **56 → 71 PASS / 0 FAIL / 0 超时**（G12 单段 16/0 · **反证**：旧逻辑同段 **5 FAIL**，逐条复现双亮）；**F207 修缮（同日 · 用户拍板「甲」）**：删 `TopBar.titleOf` 自造路由表（漏 `/admin`、`/admin/assets` ⇒ 两页顶栏无名称）⇒ 顶栏回归官方 block 形态（`TopBar.tsx` **110 → 82 行**）+ dogfood **G13** 追加（15 条） | `typecheck` exit 0（4 包）· biome check 两件干净 · dogfood 全量 exit 0 | **F206**（手维护精确集）· **F207**（手维护标题表 · 同族）· **反证双证齐全**；未重跑零回归四脚本（改动不涉其覆盖面 · 证据 §8 登记） |

---

## 8. 自检打分（初稿）

> 本 plan 的 8 维自检（标准 4 + 深度 4）—— **由批 design v0.28（定稿 · 9.50）派生**，Task 可执行性 = 主要判据。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | 9.7 | T1–T10 覆盖 design §1.3 全部 12 项含项（4 页 + 8 处服务端 + 迁移 + i18n + 数据层 + 验证 + 文档 + 清理）；每 Task 带断言 |
| 标准 2 准确性 | 9.6 | 依据 design **v0.28 实测值**（件路径 / 端点契约 / 列宽权重 / 键表 / 真库读数 / 迁移号 0014 / 上限 256）；无估算数字 |
| 标准 3 一致性 | 9.7 | 与 design §3 件表、§5 服务端账（**8 项**）、§6 键表、§9 验证口径逐条对齐；Task 切分属 plan 层（design 不复制）|
| 标准 4 可用性 | 9.6 | 每 Task = 路径 + 步骤 + **可现场复跑的断言**；T10 含清理与回填清单 |
| 深度 1 追溯性 | 9.8 | 每 Task 带 design 章节 + D 号指针；跨批引用（主 design / docs/00 / docs/05 / docs/08）齐 |
| 深度 2 反证 | 9.4 | 非目标 6 条 + 登记缺口 2 条 + 风险回退 9 条；**被否决方案按口径不入档** |
| 深度 3 边界/风险 | 9.6 | 契约形态变更 / 依赖未落 / 历史不可回溯 / 迁移兼容 / JIT 类名 / 规模 / 造数污染 / 限流 / 物料残留 九项均有缓解 |
| 深度 4 维护性 | 9.5 | 服务端能力先行 ⇒ 前端不留待补契约；迁移与清理各自可独立回退；回填全用实测值 |

**初稿均分 = 9.61**（9.7+9.6+9.7+9.6+9.8+9.4+9.6+9.5 = 76.9 ÷ 8）⇒ 达门（≥9）。**执行期换靶复核**：已在 **§8.2** 按「实测值对账 + 断言可跑性」重评回填。

### 8.1 首轮换靶复核（2026-09-23 · 角轮 = **件路径存在性 + plan↔design 数值对账 + 覆盖性 + 打分自洽**）

| 维度 | 初稿 | 缺陷态 | 修完 | 依据 |
|------|:--:|:--:|:--:|------|
| 标准1 完整性 | 9.7 | **9.5** | 9.7 | 缺陷①：`doc-claims-check.ts`（本批交付物）无 Task 归属；**换靶 R2 追加 ④：T6 缺 (e)(f) 两图 + D5/D37 ⇒ 缺陷态降至 9.4** |
| 标准2 准确性 | 9.6 | 9.6 | 9.6 | plan ↔ design **14/14** 数值对账全绿（92% · 10 列 · 0014 · 8 项 · 256 · 560 · 100 · 200 · 64/128/256/64/64 · `Asia/Shanghai` · 「已上线」· 不打码） |
| 标准3 一致性 | 9.7 | **9.5** | 9.7 | 缺陷②：头部自检分 9.60 ≠ §8 结论 9.61 |
| 标准4 可用性 | 9.6 | 9.6 | 9.6 | 10/10 Task 带「依据 + 断言/门禁」；件路径 24 处逐条核（10 存在 / 11 预期新建 / 1 = 缺陷①） |
| 深度1 追溯性 | 9.8 | 9.8 | 9.8 | design 章节指针齐 · 覆盖性 15/15；**换靶 R2 追加 ⑤：12 个 D 号无指针（T9 全缺）⇒ 缺陷态降至 9.5** |
| 深度2 反证 | 9.4 | 9.4 | 9.4 | 非目标 6 + 登记缺口 2 + 风险 9 条 |
| 深度3 边界/风险 | 9.6 | 9.6 | 9.6 | 九类风险各有缓解 |
| 深度4 维护性 | 9.5 | 9.5 | 9.5 | 服务端先行 · 迁移与清理可独立回退 |

**换靶 R1 缺陷态 = 9.56**（76.5 ÷ 8）→ 修完 **9.61**；**换靶 R2 缺陷态 = 9.54**（76.3 ÷ 8）→ 修完 **9.61**（76.9 ÷ 8）⇒ 达门（≥9）。


> **追加发现（2026-09-23 · 换靶第 2 轮 · 角轮 = D 号覆盖审计 + 依赖无环 + 步骤编号）**（**历史记录**：下列 (e)(f) 的**旧名**「类型数量 / 类型下载热度」已于 **T6⁺ 改名为标签维度两图**，见 §3 T6 步骤 1 与批 design §4.1(c)(d)）：
> **④ T6 内容缺口（真）**：design §4.1 **(e) 类型数量（同心环 D13）** 与 **(f) 类型下载热度（雷达 Dots D14）** 两个卡片**未写进 T6 步骤**（实现者会漏做两张图）· **D5 两张小图共享选择器** 与 **D37 趋势默认近 30 天** 亦缺 ⇒ 已补（T6 步骤 1 + 断言 ②′/②″）。
> **⑤ 追溯性缺口（真 · 12 个）**：**T9「依据 =」行完全没有 D 号**（审计页 8 项 D21/D22/D24/D25/D47/D48/D49/D55）+ T8 缺 D26/D28/D29/D30 + T4 缺 D32/D41 + T1 缺 D37/D43/D44 ⇒ 已按面补齐。
> **探针教训（本轮两次失真，均如实记录）**：**① 低估** —— 首次统计不认**区间写法**（`D1–D18` 只数到 D1/D18）⇒ 误报「31 个未引用」；**② 高估** —— 修完探针后吃到 plan 头部那句「**D1–D55**」（那是在描述 design 的决策编号跨度，不是逐 Task 指针）⇒ 误报「0 个未引用」。**真值 = 12 个未引用**。⇒ 口径：**统计「逐 Task 指针」必须只扫 §3 各 Task 的「依据 =」行，并把区间展开、排除头部/修订表里的跨度声明**。
> **追加发现（2026-09-23 · 用户追问「每个 task 都有测试吧？」）③ 测试面逐 Task 未点名** —— 首稿 T1–T3 只写「断言」未指测试文件；T5–T9 未声明「前端无单测 · 靠 dogfood」。已补：**逐 Task 测试点名单**（T1 新建 `http/admin.test.ts` · T2 `assets/audit.test.ts` 扩充 · T3 `download.test.ts` 扩充 · T4 `labels.test.ts` 同步 · T5–T9 声明 dogfood 面）+ **§4 测试面硬规则**。补后完整性/可用性**维持 9.7/9.6**（该发现属「表述不完整」而非「产出缺失」）。
> **本轮教训（已并入 plan 自检口径）**：**交付物必须有 Task 归属** —— 凡 design 声明「进仓」的件（脚本 / 迁移 / 页面 / 端点），plan 必须有明确产出它的 Task；「引用某件」与「创建某件」不得混写。

### 8.2 执行期换靶复核（T10 收尾 · 2026-09-23 · 角轮 = **实测值对账 + 断言可跑性**）

| 维度 | 复核前 | 复核后 | 依据（实测） |
|------|:--:|:--:|------|
| 标准1 完整性 | 9.7 | **9.7** | T1–T10 **全部执行**；T10 额外交付换靶脚本与证据文件（该脚本已在 §3 T10 步骤 3 预登记 ⇒ 属计划内） |
| 标准2 准确性 | 9.6 | **9.7** | §9.7 六项回填**全部用实测值**；`doc-claims-check` §2「同一量跨节对照」**6/6 绿** ⇒ 数字不再依赖人工点数 |
| 标准3 一致性 | 9.7 | **9.7** | 三向一致（件表 19 路径 / 改动号 1..8 / 端点表 8 行）**逐条绿** |
| 标准4 可用性 | 9.6 | **9.7** | Task 断言**可现场复跑**已被实证（八步门禁 + dogfood + 换靶脚本均实际跑通，脚本自身 2 类 bug 当场修正） |
| 深度1 追溯性 | 9.8 | **9.8** | 每 Task「依据 =」行 D 号齐 + 落地记录含 commit 面 |
| 深度2 反证 | 9.4 | **9.4** | 非目标 6 + 缺口登记 + 风险 9 条（未新增反证面） |
| 深度3 边界/风险 | 9.6 | **9.5** | **⬇ 下调理由（真缺口）**：风险清单 9 条**未覆盖「i18n 泄漏残留」**，实施期两页 28 处硬编码中文靠**新建门禁**才捕获（不是计划里的缓解项） |
| 深度4 维护性 | 9.5 | **9.6** | 新增 `doc-claims-check.ts` 为**跨批可复用**门禁（批切换只改 `DOCS`/期望表）；回填全走实测值 |

**执行期复核均分 = 9.64**（9.7+9.7+9.7+9.7+9.8+9.4+9.5+9.6 = 77.1 ÷ 8）⇒ 达门（≥9）。

> **本轮教训（已并入自检口径）**：**「i18n 铁律」必须由脚本守门，不能靠自觉** ——
> 前端 Task 的 dogfood 断言当时只查「键在位 / 功能可用」，**不查「页面是否还有硬编码文案」**；
> 泄漏因此在 T5–T9 全绿的情况下存活到 T10。⇒ 新规则：前端面的**文案类不变量**（零中文泄漏 / 键成对）
> 一律进 `doc-claims-check`，与功能断言并列为门禁。

---

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v0.19** | 2026-09-24 | sunxuewen-rush | **F221 收口：M4b-2 三脚本 18 条断言过时**（收口「记账」轮）—— 新增共享真值件 `nav-truth.ts`（`navItems.tsx` SSOT）· 修 3 处脚本缺陷 · 补自带桌面视口 ⇒ 四支 **24/0 · 14/0 · 49/0 · 34/0** |
| **v0.18** | 2026-09-24 | sunxuewen-rush | **挂账 ③ 收口： (B) 类 lint 清零**（71 → 0 · 零行为变更）—— `noNonNullAssertion` 66（52 条走新增 `http/context-access.ts` 取值器 · 14 条显式收窄）· `noTemplateCurlyInString` 3 · `noExplicitAny` 1 · `noDocumentCookie` 1 ⇒ 三包 258 文件 0 warning；门禁全绿 + 真页回归 |
| **v0.17** | 2026-09-24 | sunxuewen-rush | **挂账 ② 收口：证据 §8 item ⑦⑧ 闭环**（写库已授权）—— 造数 → 真页 + API **22 PASS / 0 FAIL**（13 色池换圈 · F212 第三支 + 对照组）→ **自清**回落；新增一次性探针脚本（自带自清）+ 3 张留证截图 |
| **v0.16** | 2026-09-24 | sunxuewen-rush | **F220 `m4a` 断言真值化（挂账 ① 收口）**：两条断言定性为过时 ⇒ 真值口径（`+N/−M` 签名）+ 真源取证 ⇒ **58/2 → 60/0** ✅（含正反双证）· 零回归四脚本全绿 · 挂账失败项 **2 → 0** |
| **v0.15** | 2026-09-24 | **① 重挂归属已证（G16）**：dogfood 新增 **G16**（6 条 · 重挂 ⇒ 一级上卷归属 · 三态 + 真页 + 自清 + 反证）⇒ **102 → 108 PASS / 0 FAIL**；去重口径纠正（零计数目标做严格等值） |
| **v0.14** | 2026-09-24 | **F219 跨批断言修复 + 夹具复位**：`m4b4` 两处断言侧缺陷（`G20-9` 写死 6 行 → 端点真值；`G6` 「活跃」→「已上线」）+ `m4b4-seed-assets` 复位修另 4 条 ⇒ **89/0**；固化「seed → dogfood 成对跑」；造数复位三脚本 ⇒ 零回归 **21 → 2 条**；本批 dogfood **102/0** |
| **v0.13** | 2026-09-24 | **F218 一级可重挂（用户拍板「②」）**：服务端「一级不可降级」→ **安全重挂**（目标必须一级 + 自身无子级）· 前端下拉放开（候选排除自身 / 有子级禁用 + 说明）· i18n 键改写（键数不变）· **规范层 `docs/06` v1.7**（含相对兄弟仓 SkillHub 契约的偏离与理由）· 用例 **F218（5 步）** + dogfood **G8.8/G8.9 改写 + G8.11/G8.12**（真页往返 + 自清 · 含反证）⇒ 断言 **100 → 102** |
| **v0.12** | 2026-09-24 | **F217 编辑失败不再静默**：`submitForm`/`confirmDelete` 补 `catch`+`toast` · 一级标签父级下拉禁用 + 说明 · 补齐 10 个 `label.*` 错误文案（i18n 527 → 536）· dogfood **G8.8–G8.10**（含反证）⇒ 断言 **97 → 100** |
| **v0.11** | 2026-09-24 | **F216 已修（标签写后即见）**：`api/admin.ts` `invalidateLabelCaches()` 三前缀 + 四写函数挂载；真页正反双证（标签页列表 `行 6 → 7` · 门户 chip 立现 / 反证双双回落）· dogfood **G15**（5 条 · 自清）⇒ 断言 **92 → 97 PASS** |
| **v0.10** | 2026-09-24 | sunxuewen-rush | **收口复核（F211 / F212）** —— ① F212 标签删除口径前置：`/all` 加性补 `mountCountAny`（任一状态挂载数）+ 标签页禁用条件与三段文案 + 服务端用例（仅挂 HIDDEN）+ dogfood G8.5/G8.6（含反证）② F211 资产页分页 URL 定案**跟门户 `?page=`**（撤回 v0.9 的 `limit`/`offset` 条；理由：复用共享 `useMarketQuery`，强改需回归门户三页）③ dogfood 全量 **88 → 90** |
| **v0.9** | 2026-09-23 | sunxuewen-rush | **T6⁺ 收口（F210）** —— ① dogfood 读数 84 → **88**（G2 官方 Combobox 真换档 + 首刻度龄硬证据 · G2.2 题注数值态 · G4 `data-active` 定位 + 柱数=端点非零条数）② 两条反证（翻期望 ⇒ FAIL）证明判别力 ③ 截图换 `g2-board-trend-7` / `g4-board-rank-label`，删 2 张重复旧图 ④ Status/批件指向批 design **v0.33** |
| **v0.8** | 2026-09-23 | sunxuewen-rush | **T6⁺ 管理看板重做（用户逐条拍板）** —— ① 步骤/断言行按当前实现重写 ② dogfood 追加 **G14**（8 条）⇒ 全量 **71 → 84 PASS / 0 FAIL** ③ §7 追加 T6⁺ 行（F208 / F208-A / F209）④ 批 design **v0.32** 同步。**含服务端改动** |
| **v0.7** | 2026-09-23 | sunxuewen-rush | **F207 顶栏标题漏项 → 用户拍板「甲」（非计划内 · 不占新编号）** —— ① 删 `TopBar.titleOf` 自造路由表（官方 `registry:ui` 无 header/topbar 件；顶栏仅存在于 block 示例且标题写死 ⇒ 官方无「路由 → 标题」机制），页面名只在页内 ② dogfood 追加 **G13**（15 条）⇒ 全量 **56 → 71 PASS / 0 FAIL** ③ §7 T10⁺ 行并入 F207 记录 ④ Status 读数同步。**本版零服务端改动** |
| **v0.6** | 2026-09-23 | sunxuewen-rush | **F206 修缮落地（用户报缺陷 · 非计划内 · 不占新编号）** —— ① 侧栏激活判定收敛为**路径精确相等**（删 `EXACT_MATCH_PATHS` · 门户 `<NavLink>` 补 `end`）② dogfood 追加 **G12**（15 条断言）⇒ 全量 **41 → 56 PASS / 0 FAIL / 0 超时** ③ §7 追加 **T10⁺** 行 ④ Status 由「待开工」订正为「已落地」⑤ 头部上游引用版号同步（design v0.30 · `docs/00` v1.91）。**本版零实现语义改动** |
| **v0.5** | 2026-09-23 | sunxuewen-rush | **落地记录 + 执行期换靶复核** —— ① §7 逐 Task 回填实测（T1–T10 · 含 commit 面与 F 号）② 新增 §8.2 执行期复核（**9.61 → 9.64**；深度3 下调至 9.5 = 风险清单未覆盖 i18n 泄漏残留）③ 新规则：文案类不变量进 `doc-claims-check` 门禁。**本版零实现改动** |
| **v0.4** | 2026-09-23 | sunxuewen-rush | **换靶 R2 修复（D 号覆盖审计 · 依赖无环 · 步骤编号）** —— ① T6 补 **(e) 同心环（D13）** + **(f) 雷达（D14）** + D5 选择器共享 + D37 默认近 30 天（步骤 + 断言 ②′/②″）② 追溯补齐：T9（8 项）· T8（4 项）· T4（2 项）· T1（3 项）③ §8.1 追加发现④⑤ + 探针两次失真教训（真值 12 个）④ 缺陷态 **9.54** → 修完 **9.61**。**本版零实现改动** |
| **v0.3** | 2026-09-23 | sunxuewen-rush | **测试面点名 + 硬规则**（用户追问）—— ① 逐 Task 点名测试文件（T1 新建 `http/admin.test.ts` · T2 `assets/audit.test.ts` · T3 `download.test.ts` 扩充 · T4 `labels.test.ts` 同步）② T5–T9 显式声明「**前端无单测基建**（`apps/web` 无 `test` 脚本 · 0 测试文件）⇒ 验证 = dogfood 端到端断言 + `typecheck` + `biome`」③ §4 新增**测试面硬规则** ④ §8.1 追加发现③（属「表述不完整」非产出缺失 ⇒ 分数不变）。**本版零实现改动** |
| **v0.2** | 2026-09-23 | sunxuewen-rush | **首轮换靶复核修复**（角轮 = 件路径存在性 / plan↔design 数值对账 / 覆盖性 / 打分自洽）—— ① 缺陷①：`doc-claims-check.ts` 无 Task 归属 ⇒ T10 补「脚本进仓」步骤（6 类检查）+ §1 #11 补件 + T5 措辞订正 ② 缺陷②：头部自检分 9.60 → **9.61**（统一 · 逐维 76.9 ÷ 8）③ 新增 **§8.1 首轮换靶复核**（缺陷态 **9.56** → 修完 **9.61**）④ 自检口径补一条「**交付物必须有 Task 归属**」。**本版零实现改动** |
| **v0.1** | 2026-09-23 | sunxuewen-rush | **首稿**：由批 design **v0.28（定稿 · 8 维 9.50 · D1–D55 · 未决 U5–U14）** 派生 —— ① §1 目标 12 项 + 非目标 6 条 ② §2 **T1–T10**（Task 切分属 plan 层；较 design 行文初拟的 8 项细化：i18n 与「脚本+验证+文档/清理」独立成 Task）③ §3 逐 Task 明细（依据 + 步骤 + 断言/门禁）④ §4 八步门禁 + 跨平台说明 ⑤ §5 造数（**写库需授权** + `--clean`）⑥ §6 风险回退 9 条 ⑦ §7 落地记录位 ⑧ §8 自检 **9.61**（含换靶复核位）。**本版零实现改动** |
