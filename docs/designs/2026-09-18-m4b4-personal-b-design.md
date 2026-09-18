# M4b-4 个人面 B：我的资产与工作台 landing —— 批设计

> Date: 2026-09-18
> Updated: 2026-09-18（**v1.7：可点原型评审收口（R1–R23 逐条拍板）** —— §2.1d 原型评审记录；**列表 6 → 9 列**（名称/类型/状态/标签/版本/下载/收藏/更新/操作）· **抽屉改纯预览**· 管理动作全部归**资产详情页 owner/管理区（按权限显隐 · §4.6）**· 段名 `标签+-` · 侧栏条目 `标签定义` · 件表 **新建 11 / 改造 11 + 2 文档** · star 依赖登记（用户决定 UI 收尾后先做 star））
> Status: **定稿**（8 维自检 **9.66 ≥9** ✅ —— 换靶复核后复评，见 §11.3；**旧分 9.69 已撤回**：
> 该分系窄口径产物，换靶口径下修前实测 9.60。累计 findings **13 项**全部闭合：§11.2 八项 + §11.3 五项）
> Scope: M4b-4（`docs/00` §5 子行 / 主 design §2.3 拆批表）——个人面 B：**工作台 landing**
> （`/dashboard`）+ **我的资产**（`/dashboard/assets`）+ **资产管理抽屉** + 服务端
> **R6**（`GET /api/me/assets` 新增）+ **R6-b**（非 ACTIVE 读面授权集扩展）
> 引用链：本文档 → 主 design `2026-09-10-m4b-admin-console-and-auth-design.md`
> （§2.1 R6/R6-a/R6-b · §2.3 拆批与批件登记 · §2.4 **U4/U5/U6** · §4 入口显隐 · §5.1/§5.2 路由 ·
> §6.2 组件树 · §7.1 端点契约 · §7.2 **R6 系列** · §7.3 页面数据编排 · §8 接口变更总览 ·
> §10.1 状态映射 · §11 i18n · §12 线框）→ 规范 `00` §5/§7 · `05` §6.4 · `08` §7 →
> M4a design §4.4（视觉 SSOT，引用不复制）

---

## 1. 背景与批界

### 1.1 位置与依赖链

M4b 拆 8 批（主 design §2.3）：**顺序即依赖链 1 → 2 → 3 → 4 → 5 → 6 → 8 → 7**；本批 = **第 4 批（个人面 B）**。
前置 = **M4b-1 ✅ / M4b-2 ✅**（两批出口五件全绿）；后继 = M4b-5（审核批）。

**与前三批的关键差异**：M4a / M4b-1 / M4b-2 均**零服务端改动**；M4b-3 为**加性**字段；
**本批是 M4b 中唯一含「读面语义改动」的批** —— R6 新增 owner-only 读面，R6-b **放宽**既有读面授权集
（改的是判定本身，不是加字段）。故本批的**测试影响面**与**规范同步面**均为 M4b 内最大（§5.3 / §9）。

### 1.2 入口现状（真码实测，2026-09-18）

| # | 现状 | 证据（file:line / 命令） |
|---|------|--------------------------|
| 1 | `/dashboard/assets` 仍是**占位页**，`DEV_BATCH` 标注 `'M4b-4'` | `apps/web/src/main.tsx:55`（表）· `:104-111`（路由渲染 `ComingSoon` + `batch={DEV_BATCH['/dashboard/assets']}`） |
| 2 | `/dashboard` **已是真页**，但为**过渡形态**（`ComingSoon` 内容槽 + 按档裁剪入口），非三卡 | `apps/web/src/pages/Dashboard.tsx`（**73 行**，`wc -l` 实测）· `main.tsx:102`；主 design §2.3 登记「M4b-4 替换为三卡」 |
| 3 | 前端**无 `me` 面 API 封装** | `apps/web/src/api/` 实 **11 件**：`assets` `auth` `client` `compare` `content` `labels` `reviews` `stats` `tokens` `types` `versions` ⇒ 无 `me.ts` |
| 4 | 「我名下的资产」读面**不存在** | `apps/server/src/app.ts:187-206` 挂载表**无** `/api/me`；`assets/service.ts:173-177` `listViewableAssets` 硬编码 `eq(asset.status, 'ACTIVE')` |
| 5 | ★ **非 ACTIVE 读面现状仅超管** | `http/assets.ts:163-175` `assertAssetReadable`：`if (viewer.isSuperAdmin) return viewer;` → `if (row.status !== 'ACTIVE') throw AssetError(notFound);` |
| 6 | ★ 序列化器 `assetItem` **未导出** | `http/assets.ts:111-134`（14 字段：`id`/`slug`/`type`/`status`/`ownerId`/`latestVersionId`/`latestVersion`/`latestName`/`latestDescription`/`ownerDisplayName`/`downloadCount`/`createdAt`/`updatedAt`）⇒ 新 router 复用前须先抽件 |
| 7 | 可复用件**齐全**（零新增通用件） | `components/console/` **7 件**：`DataTable`(**139** 行 —— 本批加性 prop 已落，净 +6；原始 133) · `Drawer`(50) · `ConfirmDialog`(94，**已含 `requireReason` 变体**) · `StatusPill`(84，含 `ASSET_STATUS_VARIANT`/`VERSION_STATUS_VARIANT`) · `FilterBar`(61，含 `FILTER_ALL='ALL'`) · `PageHeader`(42) · `ComingSoon`(54) |
| 8 | 共享 hook `useMarketQuery` **无 `status` 维度**；唯一消费方 = 门户中心页 | `hooks/useMarketQuery.ts`（**104 行**）· 消费方 `components/market/CenterPage.tsx:119`（门户读面 ⇒ 本批改动须**零回归**） |
| 9 | i18n 现状 **222 键 / 11 组**（zh=en，双向差集 **0**） | 脚本实测（按顶层缩进解析）：`market` 53 · `tokens` 47 · `errors` 28 · `submissions` 25 · `login` 16 · `navigation` 14 · `device` 14 · `common` 8 · `dashboard` **6** · `admin` 6 · `review` 5 |
| 10 | ★ 抽屉**必然消费的 6 个错误码全部缺失** | 逐条 grep 零命中：`asset.has_published` · `asset.has_yanked` · `asset.version_not_deletable` · `asset.version_not_yankable` · `asset.yank_reason_required` · `label.limit_exceeded` ⇒ §6.3 补 |
| 11 | 主 design §11 键数为 **M4a 期史实值**（`navigation` 9 · `market` ~50 · `common` 5 · `errors` 9），与实测不符 | 该节自注「M4a 落」；本批收尾一并回填**实测值**（登记 §12 修订记录） |
| 12 | 既有测试 **2 处断言**将被 R6-b 打破 | `http/assets.test.ts:418`（fixture 的 owner 恰为 `member`）· `:844-857`（注释「owner 亦不可读」+ 断言）——详见 §5.3 |
| 13 | 标签候选端点为公开读面，**天然不含 PRIVILEGED** | `GET /api/labels`（匿名，`labels/service.ts:395` 只返 `RECOMMENDED` + `visibleInFilter`）⇒ 抽屉标签段零新端点 |
| 14 | 服务端写面**全齐**（本批零新增写端点） | `PATCH /:slug/status`（`assets.ts:384`）· `PUT`/`DELETE /:slug/labels/:labelSlug`（`:710`/`:738`）· `DELETE /:slug`（`:422`）· `DELETE /:slug/versions/:version`（`:559`）· `POST /:slug/versions/:version/yank`（`:672`） |

### 1.3 批界

**In（本批做）**

- **工作台 landing `/dashboard`**：角色感知三卡（待审核 / 我的资产 / 最近审计）+ 按档裁剪请求（U4 · Q1 · Q9）
- **我的资产 `/dashboard/assets`**：**九列**列表 + 状态筛选（显式 `status=ALL`）+ q 搜索 + 分页（U5 **v1.51 修订** · Q1 · Q2 · §2.1d）
- **资产管理抽屉 = 快速预览**（宽 560）：描述 / 标签+- / 统计行 / 「完整详情 ↗」（U6 **v1.51 改写** · §2.1d）—— **管理动作全部归资产详情页管理区**（§4.6）
- **服务端 R6**：新增 `GET /api/me/assets`（owner-only · 含全状态 · status 过滤 · 分页）（§7.2 处置 R6）
- **服务端 R6-b**：`assertAssetReadable` 授权集 = {owner 本人 / 管理档 / 超管}（§7.2 处置 R6-b）
- **查询参数化**：`listViewableAssets` 加 `ownerId?` / `status?`，一份 SQL 逻辑服务三个面（Q4 ①-1）
- **测试更新**：2 处既有断言 + 分层四面对照 + 新端点用例 + 公开面回归锁（§5.3 · Q12 A–D）
- **规范同步**：`05` §6.4 读面授权集行（+ 超管行措辞连带）· `08` §7 读面注记 + ARCHIVED 运营语义补实（Q11 A）
- **i18n**：新组 `assets` + `dashboard` 补键 + `common` 补键 + `errors` 补 6 码（§6）
- **dogfood / 造数**：进仓造数脚本 + dogfood 脚本（§9.3/§9.5 · Q12 E）

**Out（不在本批做，各自归属已定）**

- **发布 / 上传流** → **M4b-8**（R2 已于 2026-09-18 翻转入册；主 design §2.1/§2.3）
- **管理档全站资产治理页「资产管理」** → **M4b-6**（U8；本批 R6 端点**保持 owner-only 语义、不回退**）
- 审核队列 / 审核详情 / 文件树与预览 / 防自审 → **M4b-5**
- 标签管理 CRUD / 审计页八维过滤 / 管理看板 → **M4b-6**
- **视觉打磨与审美定稿** → **M4b-7**（本批出口 `dogfood/观感` 只做**合规核对**：有无错位 / 溢出 / 串色 / 异常）
- 我的提交 / 我的令牌 → M4b-3 ✅（已交付）
- **登记缺口（不表达）**：抽屉**无「提交审核」入口** —— 提审端点已在（`:618`），但上传无 UI ⇒ 链路接不上；
  R2 已翻转入 M4b-8 ⇒ 提审入口随发布批一并交付（本批**显式登记**，防将来审计追问「草稿怎么提审」）

## 2. 拍板结果（本批）

### 2.1 grilling 决策表（2026-09-18 · 用户逐条「按推荐来」）

| # | 议题 | 拍板结果 |
|---|------|---------|
| **Q1** | 我的资产卡口径 | **A**：卡片发 `status=ALL`、**不加副文案**（与列表默认「全部」同源 ⇒ 卡片数与列表行数不跳变；不动后端） |
| **Q2** | 查询状态承载 | **A**：**扩共享 `useMarketQuery` 加 `status` 维度**（可选，不传时行为零变化）+ 本页用 `?page=`；门户零回归用断言锁 |
| **Q4** | R6 落点 / 序列化器 / 查询 | **A + a2 + ①-1**：独立 `http/me.ts` 挂 `/api/me` · 序列化器抽中性模块 `http/asset-item.ts` · **参数化同一查询函数**（`ownerId?`/`status?`，原硬编码 ACTIVE 降为默认值）⇒ 一份 SQL 逻辑服务公开面 / 我名下 /（M4b-6）管理档全站三面 |
| **Q5** | R6-b 授权集是否纳入「版本上传者本人」 | **A 不纳入**（上传者 ⊆ {owner, 管理档} 实测；纳入无现实可达新能力，代价是多一次 EXISTS + 存在性语义变宽）。**登记夹缝边界**：降级管理档 + 资产非 ACTIVE + 自己上传的草稿 ⇒ UI 不可达（服务端能力在，由 owner/管理档代办收口），**接受** |
| **Q6** | 抽屉状态治理动作矩阵 | **C 统一 3×2**：「**每态给出另外两态各一个按钮**」—— ACTIVE→[隐藏][归档] · HIDDEN→[恢复][归档] · ARCHIVED→[恢复][隐藏]。**与服务端能力 1:1**（无「UI 比服务端更严」的隐形规则）；列表行 ⋯ 菜单**同用该矩阵**；全部走 `ConfirmDialog` |
| **Q7** | 标签段 + 危险区（7 条） | 全按推荐：① 标签候选**恒用公开列表** `GET /api/labels`（超管亦不给 PRIVILEGED 候选）② 已挂 chips 取**资产详情** `labels[]` ③ 已挂 PRIVILEGED 标签的 × **一律可点**（**Q13 = A**：本批不做 type 特判——详情 `labels[]` 只返 slug 不可判定；非超管点击 ⇒ 服务端拒绝 ⇒ toast 显示 `label.access_denied` 文案；精确禁用需给详情加 `type`，**缺口登记 → M4b-6**） ④ chips ≥10 ⇒ 候选**禁用 + 说明** ⑤ 标签挂/卸**不做二次确认**（不在 §9 危险清单、可一键复原）⑥ 删除禁用取自**版本列表**，加载中**保持禁用**（防闪变）+ 服务端 400 兜底 toast ⑦ 行菜单「标签挂载」= 打开抽屉并**滚至标签段**（③ 已按 **Q13 = A** 裁定，见上） |
| **Q8** | 版本管理段（6 条） | 全按推荐：**A** 抽屉打开即并发 2 请求（详情 + 版本列表），不做滚动触发 **B** 版本行紧凑单行（版本号 mono · 状态徽章 · 创建时间 · 文件数+体积 · changelog **截断一行** + `title` 全文）**C** 可删 4 态显示 [删除]，禁删 3 态（`PENDING_REVIEW`/`PUBLISHED`/`YANKED`）**禁用 + 说明** **D** yank 仅 `PUBLISHED` 行显示（非该态**不占位**）；`role < 10` **禁用 + Tooltip**；点击 `ConfirmDialog requireReason` **E** 抽屉内分页 = 首屏 **20** + 「**加载更多**」**追加式** **F** 不做文件预览/详情跳转（归 M4b-5）；**本批确认弹窗统一去红**（对齐 M4b-3 先例，是否恢复红色语义留 M4b-7 裁决） |
| **Q9** | 工作台三卡（6 条） | 全按推荐：**A** `role ≥ 10` 发 **3 请求并发** / `role < 10` 发 **1 请求**；**每卡独立三态 + 独立重试** **B** 卡内容与跳转（待审核=全站队列 total→`/admin/reviews` · 我的资产=我名下 total→`/dashboard/assets` · 审计=5 行 [时间+动作原文枚举+对象]**不含操作人**→`/admin/audit`）**C** 零值**照常显示「0」**（不做空态替换）**D** 整卡 `<Link>` 覆盖层 + 内层 CTA 用**非 anchor** 样式化 `<span>`（**无嵌套 `<a>`**）；单卡态**保持 1/3 列宽左对齐** **E** 卡级 403 ⇒ **就地 ErrorState**（不退化为空态）**F** 审计 `action` 用**原文枚举**（中文映射归 M4b-6 一并裁决） |
| **Q10** | i18n 落点（5 条） | 全按推荐：**A** 新组名 **`assets`** · **B** `dashboard` 补三卡标题/CTA/审计卡列头（`viewAll` 归 `dashboard`）· **C** `errors` **只补本批消费的码**（**6 → 7**：Q13 拍板 A 后增 `label.access_denied`；M4b-6 的标签 CRUD 码仍不预支）· **D** 键表用**逐键表**、**总数由实现期实测回填**（不硬编码）· **E** 审计 action 不加中文名 |
| **Q11** | 规范同步时点 | **A 随本批落地即改**（收敛原「M4b-4 落地后 / 统一于 M4b 收尾」双口径）：`05` §6.4:187 授权集行 + `:161` 超管行措辞 + `08` §7 ①读面注记 ②ARCHIVED 运营语义补实；先例 = M4b-pre 规范层原地改写 |
| **Q12** | 测试更新边界 + 造数 | **A** 2 处 owner 断言 404→200 **并在同 `it` 内补齐授权集三档对照** · **B** §7.2 声明的**四面对照**（详情/版本/文件/下载，授权集内 200、集外 404）· **C** 新端点用例 `http/me.test.ts` · **D** **公开面回归锁**（不传参时默认 `status='ACTIVE'`）· **E** 进仓造数脚本 `m4b4-seed-assets.ts`（**写库须授权**） |

> **决策来源**：2026-09-18 三轮 grilling（Q1–Q12），用户逐条回复「按推荐来」「全按推荐」；
> 议题清单与选项/推荐的完整推演过程属**执行过程记录**（不入库），本表只留**拍板结果**（用户口径：被否决方案不进文档）。

### 2.1c UI 逐条评审记录（2026-09-18 · `ui-design-review-walkthrough`）

> ⚠️ **本节为过程记录**（条①–⑤ 当时口径）：其中「六列」「四段抽屉」「`⋯` 菜单」等**已被 §2.1d 原型评审推翻** ——
> **现行口径一律以 §4.2 / §4.3 / §4.6 为准**。

> 方法：清单公式 = **页面 × 壳 × 跨面**；每条**四段式**（设计真值 / 现状实测 / 拍板点 / 风险与文档缺陷）；
> **逐条汇报逐条拍板**（用户「按推荐来」）；**汇报轮只读不写**（缺陷先登记、不顺手改）。
> **进度：① ② ③ ④ ⑤ ✅ **全闭**（5 条）· 下一步 = **抽屉可点原型**（§2.1d 待建）。

**条 ① · 页面 · 工作台 landing `/dashboard`（三卡）** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 两个缺失前端封装怎么补 | **补封装**：`api/reviews.ts` 加**队列读面**函数（`/api/reviews?status=`）· **新建 `api/audit.ts`** ⇒ 件表 **新建 7 → 8 / 改造 10 → 11**。依据（实测）：`pages/` + `components/` 层**零直调 `apiGet`**（两种写法零命中）⇒「一律经 `api/` 封装」是硬惯例 |
| **P2** 「最近审计」卡保留否 | **保留 3 卡**（U4 已拍 + §7.3 已定 3 请求 + `/admin/audit` 占位路由 M4b-2 已交付，点得到） |
| **P3** 审计卡空数据态 | **行内空态文案（复用 `dashboard.empty`）+ 卡仍渲染**（不隐卡 —— 防「有权限却无入口」） |
| **P4** 首帧不闪 | **`loading` 期间整块骨架、不按默认态渲染**（沿 U1「防首帧闪烁」口径） |

**条 ① 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D1** | 🔴 | **件表漏项**：§3.1 原只列 `api/me.ts`，漏列**队列 reviews / audit 两个前端封装**（实测 `api/reviews.ts:67` 仅 `fetchMyReviews`；`api/` 无 `audit.ts`）⇒ 按原设计开工 **T6 会卡住** | ✅ **已随 P1 修正**（件表 7/10 → **8/11**） |
| **D2** | 🟡 | **线框与拍板冲突（三向不一致）**：主 design §12 `/dashboard` 线框画着「**含2隐藏**」，但 **U4:206** 明拍「**省略**「含 N 隐藏」副文案」 | **登记**（仓纪律：史实不顺手改）→ 本批**收尾回填**时订正主 design |
| **D3** | 🟡 | **过期引用**：主 design §7.3:624 写「与线框『含 N 隐藏』一致」—— 该依据已在 U4 作废 | **登记** → 同上 |
| **R1** | 🟡 | **请求数断言口径**：`role < 10` 断言「页面自身业务请求 = 1」须**排除壳层**（`SideNav` 的 `/api/stats` + 认证 `/auth/me`）—— M4b-2 已有同款先例（「零请求」→「**页面自身**零请求」） | ✅ 已并入 dogfood **G2** 口径 |
| **R2** | ⚪ | **数据面缺口**：审计卡需库里真有 **≥5 条审计** | ✅ 已并入 §9.5 造数需求 |

**条 ② · 页面 · 我的资产 `/dashboard/assets`（六列）** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 类型列的表格形态 | **`TypeIcon`（16px）+ 文案**，色底用 `--type-*` 的小方底；**具体尺寸随抽屉原型一并看效果定**（无表格内紧凑形态先例，须视觉定稿） |
| **P2** `⋯` 菜单与抽屉矩阵**防漂移** | **抽共享「动作集」函数**（新件 `components/console/asset-actions.ts`，纯逻辑无 JSX —— 沿用 `auth/roles.ts` 的「单点」模式）⇒ **列表与抽屉共用**（语义收敛）／件表 **新建 8 → 9** |
| **P3** 分页参数族 | **本批照主 design §5.2 用 `?page=`**；「与 Submissions 的 `?offset=` 族不同」**登记**（不动 M4b-3 已交付件） |
| **P4** 空态判据 | **沿用** Submissions 判据（**是否有生效筛选**）：无筛选 0 行 → 页面级两行空态；有筛选 0 行 → `DataTable.emptyMessage` |

**条 ② 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D4** | 🟡 | **线框 §12 与 U5/Q6 三处不符**：菜单写 `[恢复 ACTIVE][归档][删除][标签挂载]`（**缺「打开抽屉」「隐藏」**、未体现 3×2 矩阵）· 列头写「**坐标**」（U5 = 资产名 + slug 副行）· 类型列画成**纯文本**（U5 = 类型色小块 + 文案） | **登记** → 收尾回填时**随 D2/D3 一并订正**主 design |
| **D5** | 🟡 | **`AssetItem.labels` 类型谎言**（**既有缺陷，非本批引入**）：前端类型声明 `labels` **必填**，但服务端**列表响应不含 labels**（仅详情补，`http/assets.ts:297`）⇒ 列表消费方访问得 `undefined` 且 TS 不报错 | **登记** → 归属 **M4b-5 / M4b-6 触碰时修**（本批六列不展示标签，不受影响） |
| **R3** | 🟡 | 分页参数族不一致（Submissions `?offset=` vs 本批 `?page=`） | 见 P3（**登记**，不在本批统一） |
| **R4** | ⚪ | `<1100px` 横向滚动需**实测**断言（`scrollWidth > clientWidth` 且**列不消失**） | ✅ 并入 dogfood 口径（可复用 M4a 分辨率矩阵做法） |

**条 ③ · 壳内重型交互 · 资产管理抽屉（四段 · 560）** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 已挂 chips 的文案来源 | **候选表 join 出 `displayName`**，**join 不到则回退 slug**（详情只返 slug —— `labels/service.ts:584`，名字无处可取）；候选表（`api/labels.ts` 既有件）与详情**同批取** |
| **P2** `Popover` + `Command` 形态（实测**零消费者**，无先例可抄） | **进可点原型定稿**（落点 `/dashboard/__proto/m4b4`，沿 M4b-3 §2.1d 惯例：真仓真件 + 假数据，**物料不进仓**）；原型须含「无匹配」「已达 10 上限」两态 |
| **P3** 段④ 删除禁用真值 × 版本列表**分页** | **UI 只依「已加载页」判定（提示性守卫）+ 服务端 400 兜底 toast + 显式登记该边界**（见 D6）；**不加全量查询、零后端改动** |
| **P4** 段② 无二次确认 vs 段③ 有确认 | **维持**（按主 design §9 危险操作清单划分 —— 含隐藏/归档/恢复/删除/yank/吊销，**不含标签挂卸**） |

**条 ③ 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D6** | 🟡 | **分页 × 删除守卫的判定缝**（**设计逻辑缝，非既有缺陷**）：服务端 `DELETE /:slug` 守卫为**全量**判定（存在 `PUBLISHED`/`YANKED` 即拒），UI 只看**已加载 20 条** ⇒ 第二页才有 `PUBLISHED` 时 UI 会**误放行** | **接受 + 登记**（见 P3）：UI 为**提示性**守卫，最终以服务端 400 + toast 为准；§4.3 段④ 已写明 |
| **D7** | 🔴 | **门户资产详情页标签 chips 文案为空**（**既有缺陷，非本批引入**）：服务端详情 `labels` = **`string[]`（仅 slug）**（`labels/service.ts:584`），前端类型却声明 `{slug,displayName}[]`（`api/types.ts:42`）且 `AssetDetail.tsx:207` 用 `label.displayName ?? label.slug` ⇒ 运行时两属性皆 `undefined` ⇒ **chips 有底色边框、无文案**。反证：`fetchAssetDetail` 无任何映射（`api/assets.ts:29-31` 直通 `apiGet`）；`labelsOfAsset` JSDoc 亦写「slug 列表」 | **登记**（**先不改**：M4a 门户已交付件）→ 最小修法 = 前端 join `/api/labels` 做 slug→displayName 映射；归属 **M4b-6**（标签治理批）或另立小 fix —— **待指令** |
| **D8** | 🟡 | 「yank **不占位**（非 `PUBLISHED` 行不渲染）」与「删除**占位但禁用**（禁删 3 态）」两分类**易混**，实现期易写反 | **登记**（§4.3 段③ + 批 plan T8 ⚠️ 已带提示，复核成立，不另改） |
| **R5** | 🟡 | `VersionListItem.changelog` **可 `null`**（`api/types.ts:101`），版本行第 5 元素渲染口径未定 | ✅ **已定**：`null` ⇒ 渲染**弱化色 `—`**（保行高与列对齐）—— **本项为助手判断、非用户显式拍板**，落 §4.3 |
| **R7** | ⚪ | 抽屉内**快速切换资产** ⇒ 旧请求可能覆盖新数据 | ✅ 并入 §4.4（复用 `useApi` 既有 **abort** 口径）；**编号跳 R6** 以避与服务端读面「R6/R6-b」混淆 |

**条 ④ · 壳 · 壳与导航** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 顶栏 `<h1>` 与页内 `PageHeader` **同字重复** | **本批照 M4b-3 先例保留页头标题（不动已交付件）**；**「顶栏 h1 与页头同字」登记为全站议题 → M4b-7 视觉收尾统一**（届时可选「页头去 title、只留 description/actions」） |
| **P2** 页内「返回工作台」/面包屑 | **不加**（顶栏已有标题 + 侧栏高亮已定位；加则需新件 + 新键） |
| **P3** `DEV_BATCH` 表项 | **只删本路由表项（`/dashboard/assets`），机制保留**（该表 `import.meta.env.DEV` 门控、他批仍在用；批 plan T7 已写） |
| **P4** M4b-8「发布」入口接缝 | **本批不动，仅留指认**（主 design §4 已登记侧栏「发布」+ 顶栏入口，归 **M4b-8**） |

**条 ④ 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D9** | 🟡 | **`TopBar.titleOf` 的 `section` 为死数据**：8 处赋值、全仓**零消费**（v1.44 撤「分区副标」后的遗留；返回类型仍声明 `{title, section?}`） | **登记** → 随 **M4b-7** 或触碰 `TopBar` 时清理（本批零改动） |
| **D10** | 🟡 | **`TopBar.tsx:47-49` 注释过期且与上游口径相抵**：注释写「标题 = **页面全称** / 分区 = 所属组」，真码 = 标题取**导航短词**（与 `SideNav` 同键）、分区已撤 —— 与主 design §11「导航短词 · 页头全称」不符 | **登记** → 同上 |
| **R8** | ⚪ | **零 `document.title` 机制**（全仓 grep 零命中）⇒ 浏览器标签页标题全站不随路由变化 | **登记**（非本批议题） |

> **本组「无缺陷」的实测反证（2 条，防漏报）**：① 侧栏高亮 `EXACT_MATCH_PATHS` 含 `/dashboard` ⇒
> **无「父子项双高亮」**（若缺该集合，`/dashboard/assets`.startsWith(`/dashboard`) 会令两项同亮）；
> ② `titleOf` 的匹配顺序把 `/dashboard/assets` 排在 `/dashboard` **之前** ⇒ **不会误配成工作台标题**。
> 两条均为真码回读结论（`SideNav.tsx:90,145` · `TopBar.tsx:51-61`），非推断。

**条 ⑤ · 跨面 · 跨面交互约定** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 抽屉「2 请求」的三态合并 | **分段三态**：详情失败 ⇒ 整抽屉 `ErrorState` + 重试；详情成功、版本段失败 ⇒ **段内** `ErrorState` + **段内重试**（另两段照常可用）；「版本未就绪 ⇒ 危险区禁用」口径不变（条③ P3） |
| **P2** 写后重取的范围与手法 | **① 状态治理成功 ⇒ `invalidateCache('/api/assets')` + 抽屉内详情重取 ② 列表 `retryTick++`（返回列表即新数据）③ 版本删除成功 ⇒ 只重取版本段**；三卡计数（异页）**不主动重取**（手法先例 = M4b-3 `Submissions.tsx` 的 `invalidateCache` + `retryTick` 双件） |
| **P3** 响应式断点口径 | **以真码为准**（抽屉 `<640px` 全宽 / `≥640px` 560 · SideNav `<768px` 官方 Sheet）：**本批不改 `Drawer` 件、不引断点逻辑**；**登记订正主 design §5.2/§10**（**D11/D12**）。§4.2「`<1100px` 横向滚动不卡片化」本批**按文档实现**（与真码无冲突，M4a 已验证） |
| **P4** URL 状态化写法 | **沿用 `useMarketQuery` 既有写法零改动**（`q` 防抖 + `replace` 写 · `page` 即时写、`page=1` ⇒ 删参数 · 筛选变更删 `page`）；本批 `status` 维度沿 `label` 口径（即时写） |

**条 ⑤ 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D11** | 🟡 | **主 design §5.2 响应式口径与真码不符（抽屉）**：文档「抽屉 `<1100px` → 全宽侧滑」，真码 `Drawer.tsx:40` = `w-full … sm:max-w-[560px]` ⇒ 真值 **`<640px` 全宽、`≥640px` 560**（Tailwind `sm` = 640px） | **登记** → 收尾回填时**随 D2/D3/D4 一并订正**主 design（本批零改动） |
| **D12** | 🟡 | **同上（侧栏）**：文档「SideNav `<900px` 折叠为图标态」，真码 = shadcn 官方 `useIsMobile()`（**768px**）⇒ `<768px` 自动 **Sheet**（非图标态）；**图标态由用户手动切换 + cookie 持久化，无 900px 断点** | **登记** → 同上 |
| **R9** | ⚪ | 版本徽章 `REJECTED` 真色仍为 `destructive`（红） | **不冲突**：本批「去红」仅指 `ConfirmDialog`；**全站去红归 M4b-7**（M4b-3 已登记，口径一致） |

> **自证一条（防误报留痕）**：`errors` 键数先用正则算得 **26**，**逐行回读实为 28** —— `network` / `unknown`
> 两个**非点号键**未被该正则捕获 ⇒ 批 design 的「28 键 / 本批后 35」**正确**，非缺陷。
>
> **★ 五条评审全闭**：清单 = 页面 × 壳 × 跨面（① 工作台三卡 · ② 我的资产六列 · ③ 资产管理抽屉 ·
> ④ 壳与导航 · ⑤ 跨面交互约定）；累计 findings **D1–D12 + R1–R9**（🔴 2 = D1 件表漏项[已修] / D7 门户 chips 空文案[登记]）。
> **下一步 = 抽屉可点原型**（落点 `/dashboard/__proto/m4b4`，沿 M4b-3 §2.1d 惯例：真仓真件 + 假数据，**物料不进仓**）。

### 2.1d 原型评审记录（2026-09-18 · 可点原型两视图）

> 纪律同 M4b-3 §2.1d：**真仓真件 + 假数据 + 状态开关**；物料**不进仓**（`__proto/` 两文件 + `main.tsx` 的 DEV 路由行，评审收尾即删）。
> 入口：列表/抽屉视图 `/__proto/m4b4` · **详情页管理区视图** `/__proto/m4b4/detail`。

**净结果（相对 §4 初稿的差异 —— 以下为现行口径）**

| 面 | 初稿 → 定稿 |
|----|------------|
| 列表列集合 | 6 列 → **9 列**：`名称 · 类型 · 状态 · 标签 · 版本 · 下载 · 收藏 · 更新 · 操作` |
| 类型列 | ~~`--type-*` 色块 + 文案~~ → **无色图标（16px）+ 文案**（`TypeIcon` 无 `className` prop ⇒ **外层 `span` 定色**） |
| 操作列 | ~~`⋯` 下拉菜单~~ → **单个 `ScanEye` 图标钮**（快速预览；文案由 `aria-label`/`title` 承载） |
| 抽屉 | 四段 → **纯预览**：工具行（状态徽章 + 「快速预览」定位 + 「完整详情 ↗」）+ **下载/收藏统计行** + **描述** 段 + **标签+-** 段 |
| 管理动作 | 抽屉内 → **资产详情页管理区**（§4.6 · **按权限显隐**） |
| 段名 | `标签挂载` →（`标签增删`）→ **`标签+-`**（沿革留痕，见 R10） |
| 动词 | `挂载` 退役 → **添加 / 移除**（回归 §6.1 既有键 `label.add`；与 skillhub 对齐） |
| 侧栏条目 | `标签管理` → **`标签定义`**（`admin.labels` **键名保留**、值变更；3 个消费点一次到位） |
| 详情页 | 头卡承载 **[下载] [收藏]**（原右栏下载卡移除）；右栏 = 元信息卡（下载/收藏图标**无色**）+ **标签+- 卡（独立）** + **管理卡** |

**逐条记录（可追溯）**

| # | 用户指令 | 处置与留痕 |
|---|---------|-----------|
| R1 | 列信息 + 标签 | 新增「标签」列（chips 最多 2 + `+N`，`title` 挂全量） |
| R2 | 列名「资产」→「名称」 | `col.name` 文案变更（zh/en 同步） |
| R3 | `⋯` 列名改「操作」 | `DataTable` 加**加性 prop `rowActionsHeader?`**（不传 ⇒ 维持 `sr-only` 表头 ⇒ M4b-3 两页零回归；实测全仓**仅本批传**） |
| R4 | 不要用 menu，直接「打开详情」 | `⋯` 菜单作废 ⇒ **共享动作集件 `asset-actions.ts` 随之作废**（列表无矩阵 ⇒ 无「双写漂移」风险）· `menu.*` 6 键**删 5**（仅留 `menu.open`，拟更名 `action.open`） |
| R5 | 「打开详情」换 svg 图标 | `Eye` → **`ScanEye`**（快速浏览语义；与 M4b-3「操作列图标化」口径一致） |
| R6 | 抽屉 = 快速浏览（理解确认） | 抽屉定位改写：**快速预览 + 唯一出口「完整详情 ↗」**（跳 `/assets/:slug`） |
| R7 | 文案「就地管理」→「快速预览」 | 工具行文案定稿 |
| R8 | 抽屉加「描述」删「状态治理」 | 段集合变更（状态治理动作并入详情页管理区；状态徽章保留在工具行为**信息**） |
| R9 | 「+挂载标签」→「添加标签」 | 按钮 + 3 处 toast 文案统一（原「挂载」系我自写偏离，非设计决定） |
| R10 | 「标签挂载」→「标签增删」→「标签+-」 | 段名沿革：`标签挂载`（初稿）→ `标签管理`（中间版，作废）→ `标签增删`（作废）→ **`标签+-`（现行）** |
| R11 | 列里需要「下载」「star」 | 列表加两列；**star 依赖 star 能力（未实现）** ⇒ 见「依赖登记」 |
| R12 | 抽屉也显示「下载」「star」 | 抽屉加统计行（与列表同口径：`compactCount` + 图标） |
| R13 | star 列中文「收藏」· 英文「star」 | `col.star` **中英刻意不对称**（用户指定） |
| R14 | 类型图标不要颜色 | 类型列去色（作废条② P1 的「色底」一半） |
| R15 | 抽屉「版本管理」「危险区」都不要，做到完整详情 | 两段整体移出 + 连带清理（版本假数据/常量/确认框/开关） |
| R16 | 详情页管理区承接**全部** + **按权限显示** | §4.6 管理区规格 + 权限矩阵（逐动作对照**服务端真码守卫**） |
| R17 | 标签用单独的 card | 详情页右栏：标签卡**独立**（位于元信息卡与管理卡之间） |
| R18 | 元信息卡「下载」「收藏」数字前有图标 | 加 `Download` / `Star` 图标 |
| R19 | 元信息卡的收藏图标不要有颜色 | 元信息卡图标**一律** `text-muted-foreground`（收藏态由头卡按钮表达） |
| R20 | 还得有「收藏」「下载」button | 成对出现：**移到头卡右侧**（下载 = 主按钮 · 收藏 = 次级按钮，已收藏 ⇒ 星形填充 warning） |
| R21 | 放 title card 好看些 | 头卡两栏：左 = 名称 + 状态徽章；右 = 两按钮；下载规则小字下移一行 |
| R22 | 管理区做进原型 + 位置按推荐 | 新视图 `/__proto/m4b4/detail`（右栏粘性列 · 对齐真页 `sticky top-[78px]`）；**5 档权限开关** + 「隐藏 / 禁用+说明」两形态可对比 |
| R23 | 原信息的收藏图标不要颜色 | 列表 star 列 + 详情页元信息卡图标**均无色**；仅**交互按钮**保留收藏态表达 |

**依赖登记（本批无法独立完成项）**

| 项 | 依赖 | 处置 |
|----|------|------|
| 列表 `收藏` 列 · 抽屉收藏统计 · 详情页「收藏」按钮 | **star 能力全链路未实现**（实测：`db/schema` 14 表无 star 表 · `http/assets.ts` 15 路由无 star 端点 · `packages/protocol` 无 star 字段） | 用户 2026-09-18 决定：**UI 收尾提交后先做 star**（建议立 `M4-star` 批、执行序在 M4b-4 之前）；本批相应 UI 标「依赖 star 批」 |
| 详情页「发布新版本」入口 | M4b-8 发布批 | 本批**仅占位**（真入口归 M4b-8） |
| 详情页「审核」动作 | M4b-5（用户标注「还在讨论」） | 本批**占位 + 登记** |
| 详情页管理区（改 M4a 已交付件 `pages/AssetDetail.tsx`） | — | **本批承接**（批件不追改；先例 = M4b-2 改 M4a 已交付件） |

**顺带发现（登记，不阻塞）**
- **口径冲突**：`docs/00` §2.2「任何人可向任意资产提交更新」 vs 真码 `POST /:slug/versions` 要求 `canManageAsset`（owner ∨ 管理档）⇒ 登录非 owner **无法上传** ⇒ 归 **M4b-8 立项时定**。
- **可议**：owner 删版本权限（2 态）小于管理档（4 态）—— UI 照实体现，待议。
- **环境**：原型内 toast 不渲染（sonner 容器存在、`[data-sonner-toast]` 命中 0；列表页既有路径同样如此）⇒ 待查，不影响形态评审。
- **术语对标（skillhub 真仓实测）**：状态文案它用「**正常**」而我们用「活跃」（待定）；版本 8 态文案差异 3 处（`SCANNING` 安全扫描中 · `UPLOADED` 已上传 · `REJECTED` 已拒绝）。

### 2.2 承接主 design 的跨批契约（引用不复制）

| 契约 | 主 design 落点 | 本批用法 |
|------|---------------|---------|
| U4 工作台三卡 | §2.4 **U4** | 直接实施（三卡集合 / 整卡链接 / 单卡三态 / 待审核数 = 队列 total） |
| U5 我的资产（**owner-only · 含全部状态**） | §2.4 **U5**（v1.51 修订） | 集合语义与**九列**集合；列表面 ≠ 可见范围（§2.1 R6-a） |
| U6 资产管理抽屉 = **快速预览**（560） | §2.4 **U6**（v1.51 改写） | 纯预览段集合（描述 / 标签+- / 统计行）+ **管理动作归详情页管理区**（§4.6 · 逐动作按真码守卫显隐） |
| 入口显隐 | §4 表 + 显隐组合锚点 | 本批**零入口改动**（两页均已在「个人」组，任何登录用户可见） |
| 路由 | §5.1 / §5.2 | 两路由**已存在**（`/dashboard` 真页过渡形态 · `/dashboard/assets` 占位），本批只换实现 |
| 端点契约 | §7.1 表 | 标签公开列表 / 资产详情 / 版本列表 / 状态治理 / 版本删除 / yank / 资产删除 / 标签挂卸 —— **逐行照抄，零新契约** |
| R6 系列缺口与处置 | §7.2（G1–G3 + 处置 R6/R6-b） | 本批实施对象（§5） |
| 页面数据编排 | §7.3 | 工作台 3/1 请求裁剪 · 抽屉动作后**局部重取** · 版本列表懒加载 |
| 状态语义映射 | §10.1（`ASSET_STATUS_VARIANT` / `VERSION_STATUS_VARIANT` 已落 M4b-1） | 直接用 `StatusPill`，**不新增映射** |
| 线框 | §12（`/dashboard` 与 `/dashboard/assets` 两张，归属 **M4b-4**） | **引用不复制**；本批只补「抽屉四段」的段内结构（§4.3） |
| 视觉真值 | M4a design §4.4（全站 SSOT） | 引用不复制；本批特有值 = 表格密度 40 / 抽屉宽 560（主 design §10.1 已落值） |

### 2.3 官方件装配清单（复用，**零新增依赖**）

| 用途 | 官方件 / 已落件 | 关键真值 |
|------|----------------|---------|
| 列表 | `console/DataTable`（shadcn `Table` 封装） | 表头 `h-10 px-2` = 40px · 单元格 `p-2` · `loading`/`error`/`onRetry`/`emptyMessage`/`skeletonRows`/`rowActions` 齐 |
| 抽屉 | `console/Drawer`（shadcn `Sheet` 封装） | **宽已由件内固定 = 560**（`Drawer.tsx:40` `w-full gap-0 p-0 sm:max-w-[560px]`，**无宽度 prop** ⇒ 本批**零改动**，勿再「覆盖」）· `title`/`description`/`footer`；**必带 `SheetTitle`**（硬规则 4） |
| 二次确认 | `console/ConfirmDialog` | **已含 `requireReason` 变体**（yank 直接复用）· `destructive` 本批**统一 false**（去红） |
| 状态徽章 | `console/StatusPill` | `ASSET_STATUS_VARIANT` / `VERSION_STATUS_VARIANT`（M4b-1 已落，**本批不改映射**） |
| 筛选条 | `console/FilterBar` | `statusOptions` / `status` / `q` + **`FILTER_ALL='ALL'`** 常量（显式 `status=ALL` 的载体） |
| 页头 | `console/PageHeader` | `title` / `description` / `actions` |
| 标签选择器 | shadcn `Popover` + `Command`（+`cmdk`，**M4b-1 已落仓**） | 可搜索候选 + chips × 移除 |
| 分页 | `ui/Pagination` | 组件 props = `{ total, limit, offset, onPageChange(offset) }` —— **组件吃 `offset`、URL 用 `?page=`** ⇒ **双语义换算点**（唯一实现口径）：`offset = (page - 1) * limit` · `onPageChange: (o) => setPage(o / limit + 1)`；**先例** `components/market/CenterPage.tsx:238-240`。★ **仅 `total > limit` 时渲染**（跨批契约：M4b-3 批 design §4.4.1 口径 —— 否则 3 条数据也出「1 / 1」空控件，该缺陷已在 M4b-3 T6 修过） |
| 加载 / 空 / 错 | `Skeleton` 组合（`DataTable` 内置）· `ui/EmptyState` · `ui/ErrorState` | 三态 + `onRetry` |

> **官方件硬规则**（主 design §2.4「官方件规则（全批适用）」16 条）对本批同样生效：`className` 只做布局 ·
> 变体/token/CSS 变量/加 variant/包组件五级顺序 · `Dialog`/`Sheet` 必带 Title · 覆盖层禁手写 z-index ·
> 条件类一律 `cn()` · CLI-only 纪律。**本批不新增任何依赖**。

## 3. 件与路由规格

### 3.1 新建件（**12**）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `apps/server/src/http/me.ts` | 新 router（`createMeRoutes`），挂 `/api/me`；本批 **1 端点**：`GET /assets`（`requireAuth`） |
| 2 | `apps/server/src/http/asset-item.ts` | **中性序列化器** —— `assetItem()` + `AssetItemMeta` 自 `assets.ts:111` 迁出（**Q4 a2**：不把 `me` 面绑到 `assets.ts` 的私有件上） |
| 3 | `apps/web/src/api/me.ts` | 前端封装 `GET /api/me/assets`（与 server `http/me.ts` **同构命名**；`api/` 现有 11 件的同族） |
| 4 | `apps/web/src/pages/Assets.tsx` | **我的资产**列表页（替换 `main.tsx:104-111` 的占位） |
| 5 | `apps/web/src/components/console/AssetDrawer.tsx` | **资产管理抽屉**（四段 · 560） |
| 6 | `docs/smoke/scripts/m4b4-seed-assets.ts` | 造数脚本（幂等 upsert；**写库须授权** —— §9.5） |
| 7 | `docs/smoke/scripts/m4b4-personal-b-dogfood.ts` | dogfood 脚本（多角色 / 多状态 —— §9.3） |
| 8 | `apps/web/src/api/audit.ts` | 前端封装 `GET /api/audit`（工作台「最近审计」卡用；**M4b-6 审计页复用**）—— **§2.1c 条① P1 追加** |
| 9 | `apps/web/src/components/console/AssetAdminCard.tsx` | **详情页管理区卡**（§4.6）：按权限显隐的动作组（资产状态 / 版本 / 审核占位 / 危险区）—— **§2.1d R16** |
| 10 | `apps/web/src/components/console/LabelCard.tsx` | **标签卡 / 标签段共用件**（chips × + `Popover`+`Command` 选择器 + 上限禁用）—— 抽屉「标签+-」段与详情页标签卡**同一件**，防两处漂移（**R9 / R17**） |
| 11 | `apps/web/src/components/console/asset-stats.tsx` | **下载/收藏展示小件**（图标 + `compactCount` · 图标**一律无色** · 收藏态表达可开关）—— 列表列 / 抽屉统计行 / 详情页元信息卡**三处共用**（**R11 / R12 / R18 / R19 / R23**） |
| 12 | `apps/web/src/lib/asset-permissions.ts` | **前端权限判定单点**（`canManage` / `canYank` / `canPrivileged` / 可删版本态集 —— **逐条对齐服务端真码守卫**，矩阵见 §4.6）—— **R16** |
| — | ~~`components/console/asset-actions.ts`~~ | **作废**（R4：列表无 `⋯` 菜单 ⇒ 无「列表与抽屉同矩阵」需求 ⇒ 无双写漂移风险） |

### 3.2 改造件（**11** 代码 + 2 文档）

| # | 文件 | 改造内容 |
|---|------|---------|
| 1 | `apps/web/src/pages/Dashboard.tsx`（现 **73 行**） | 过渡形态（`ComingSoon` 内容槽 + 按档裁剪入口）→ **三卡 landing**（§4.1） |
| 2 | `apps/web/src/main.tsx` | `/dashboard/assets` 占位 → 真页 `Assets`；**删** `DEV_BATCH['/dashboard/assets']` 条目（`:55`） |
| 3 | `apps/web/src/hooks/useMarketQuery.ts`（现 **104 行**） | 加**可选** `status` 维度 —— **不传时行为零变化**（不读不写 `status` param）⇒ 门户中心页 `CenterPage.tsx:119` **零 diff** |
| **4** | `apps/web/src/api/reviews.ts` | 加**队列读面**函数 `fetchReviewQueue`（`GET /api/reviews?status=&limit=&offset=`）—— 现有仅 `fetchMyReviews`（`/api/reviews/mine`，`:67`）⇒ 工作台「待审核」卡与 **M4b-5 队列页**共用。**§2.1c 条① P1 追加** |
| 5 | `apps/server/src/assets/service.ts`（现 **243 行**） | `listViewableAssets` **参数化**（`ownerId?` / `status?`；原硬编码 `ACTIVE` 降为默认值） |
| 6 | `apps/server/src/http/assets.ts`（现 **828 行**） | ★ **R6-b**：`assertAssetReadable` 授权集扩展（§5.1 ④）；`assetItem` 改 `import`（迁出后） |
| 7 | `apps/server/src/app.ts` | 挂载 `app.route('/api/me', createMeRoutes({ db: deps.db }))` |
| 8 | `apps/web/src/i18n/zh.ts` + `en.ts` | 新组 `assets` + `dashboard` 补键 + `common` +1 + `errors` +7（§6） |
| 9 | `apps/server/src/http/assets.test.ts` | 2 处断言更新 + 授权集三档对照 + 四面对照 + 公开面回归锁（§5.3） |
| 10 | 规范 `05-identity-access.md` · `08-data-model.md` | **Q11 A**：原地改写（§9.6） |
| 11 | 主 design `2026-09-10-m4b-admin-console-and-auth-design.md` | 收尾回填：§11 键数**实测值** · §2.3 批件登记表本批行 · **D2/D3 订正**（§9.7） |
| 12 | `apps/web/src/components/console/DataTable.tsx` | 加**加性** prop `rowActionsHeader?: string`（传入 ⇒ 渲染**可见**操作列表头；不传 ⇒ 维持 `sr-only` 现状）—— **R3**（M4b-3 两页零回归，实测全仓**仅本批传**） |
| 13 | `apps/web/src/pages/AssetDetail.tsx`（**M4a 已交付页** · 现 **287 行**） | **详情页改造**（§4.6）：头卡加 `[下载] [收藏]`（+ 下载规则小字）· 右栏加 **标签+- 卡** 与 **管理卡**（按权限显隐）· 取档位用既有 `useAuth`；**不改**三 Tab 既有能力 —— **R16–R21** |

> 附注：侧栏条目更名「标签定义」= **i18n 值变更**（`admin.labels` 键名保留；zh/en 各 1 行，已在改造件 #8 覆盖，**不新增文件**）；3 个消费点（`SideNav` / `TopBar` / `main.tsx` 占位标题）随键值一次到位。

### 3.3 路由（本批形态）

| 路由 | 形态变化 |
|------|---------|
| `/dashboard` | **已存在**（真页）⇒ 本批**换内容**（过渡形态 → 三卡），路由表零改动 |
| `/dashboard/assets` | **已存在**（占位）⇒ 本批**换真页** + 删 `DEV_BATCH` 条目 |

> 两路由的**入口显隐**（「个人」组 · 任何登录用户）与**守卫**（`RoleGuard` `ROLE.USER`，`main.tsx:71-72`）
> 均已由 M4b-2 交付 ⇒ **本批零路由新增、零入口改动**（主 design §4/§5.2 为唯一源，引用不复制）。

## 4. 页面规格（本批核心）

### 4.1 工作台 landing `/dashboard`

**结构**：`PageHeader`（标题复用 `dashboard.title`）+ 三卡栅格（`grid` 3 列 → 窄屏收敛；单卡态**保持 1/3 列宽左对齐**）。

| 卡 | 数据源 | 内容 | CTA → |
|----|--------|------|-------|
| **待审核** | `GET /api/reviews?status=PENDING&limit=1` → `total`（**全站队列**） | 大数字 + `dashboard.card.pending.title` | `/admin/reviews`（`去处理`） |
| **我的资产** | `GET /api/me/assets?status=ALL&limit=1` → `total`（**我名下全集**） | 大数字 + `dashboard.myAssets`（**标题复用既有键**） | `/dashboard/assets`（`去管理`） |
| **最近审计** | `GET /api/audit?limit=5` | 5 行 = **时间 + 动作（原文枚举）+ 对象（`targetType`/`targetId`）**，**不含操作人** | `/admin/audit`（`查看全部`） |

**请求口径（Q9 A · U4）**
- `role ≥ 10` ⇒ **3 请求并发**；`role < 10` ⇒ **1 请求**（只 `/api/me/assets`），只渲染「我的资产」卡
  （不发必然 403 的请求）
- **每卡独立三态 + 独立重试**：一卡失败不拖累另两卡；`ErrorState` 的 retry **只重取该卡**
- **零值照常显示「0」**（0 是有效信息，不做空态替换）
- 卡级 403 ⇒ **就地 `ErrorState`**（不退化为空态，对齐主 design §9「403 → 就地提示」）

**结构 / 无障碍（Q9 D）**
- 整卡 = `<Link>` 覆盖层；内层 CTA 用**非 anchor** 的样式化 `<span>`（`aria-hidden`）
  ⇒ **屏幕阅读器只读「整卡链接」，无嵌套 `<a>`**
- 每卡 `Skeleton` 载态（`DataTable`/`Skeleton` 组合，零新件）

### 4.2 我的资产 `/dashboard/assets`

**列集合（固定 9 列 · U5 修订 —— §2.1d R1/R2/R3/R11/R13/R14）**

| 列 | 内容 | 对齐 / 形态 |
|----|------|------------|
| **名称** | 资产名（`latestName` 回退 `slug`）+ **slug 副行**（`mono`） | 左对齐（`col.name` = 名称/Name —— R2） |
| **类型** | **无色 `TypeIcon`(16px) + 文案**（`type.*` 复用 `market` 组既有键） | 左对齐；**禁色底**（R14）；`TypeIcon` 无 `className` prop ⇒ **外层 `span` 定色** |
| **状态** | `StatusPill kind="asset"`（`ASSET_STATUS_VARIANT` 已落）· 文案取 `assets.filter.status.*`（3 态复用筛选键，先例 = M4b-3 `STATUS_KEY`） | 左对齐 |
| **标签** | chips：**最多 2 个 + `+N`**，`title` 挂全量；无标签 ⇒ `—` | 左对齐；**数据形状见 §5.2（Q14 = B）** |
| **版本** | `latestVersion`（`null` ⇒ `—`） | **`tabular-nums`** |
| **下载** | `asset-stats` 件（`Download` 图标 + `compactCount`）—— **零服务端改动**（`AssetItem.downloadCount` 已在响应） | **`tabular-nums`** · 图标无色 |
| **收藏** | `asset-stats` 件（`Star` 图标 + `compactCount`，已收藏 ⇒ 填充 warning）—— **依赖 star 能力（未实现）**，见 §2.1d「依赖登记」 | **`tabular-nums`** · 列头 = `col.star`（zh「收藏」/ en「star」，**刻意不对称** R13） |
| **更新** | `updatedAt`（本地化短格式） | **`tabular-nums`** |
| **操作** | **单个 `ScanEye` 图标钮**（快速预览 ⇒ 打开抽屉；`aria-label`/`title` = `menu.open` 文案） | 右对齐；**无下拉菜单**（R4/R5） |

> 列表**不再承载任何治理动作**（R4/R15/R16）：所有管理动作集中在资产详情页管理区（§4.6）。
> 列宽变化 ⇒ `< 1100px` 横向滚动阈值不变（图标钮 32px 比原下拉更窄）。

**筛选与状态**
- `FilterBar`：状态下拉（**默认「全部」⇒ 显式发 `status=ALL`** —— U5 硬约束，防「名实不符」）+ q 搜索
- URL 化：`?status=&q=&page=`（**复用扩展 `useMarketQuery`**，Q2 A）
- q **debounce 300ms** 后写 URL 才发请求（沿 M4a 纪律）；筛选/搜索变更 ⇒ **`page` 回落 1**
- 分页：**offset 替换式**（管理表格无跨页选中需求，主 design §9）· **`?page=` ↔ 组件 `offset` 换算公式**与**渲染条件（仅 `total > limit`）**见 §2.3 分页行（唯一口径，不在此复写）

**三态与响应式**
- 载态 = `DataTable` 内置 `Skeleton` 行占位；空态**两套文案**（U5）：① 从未有资产 → `assets.empty.title` + `hint` ② 筛选无结果 → `assets.empty.filtered`
- `< 1100px` ⇒ 容器**横向滚动**（保留列完整，**不卡片化** —— 控制台列信息密度优先，主 design §5.2）

### 4.3 资产管理抽屉 = **快速预览**（宽 **560** · §2.1d R6–R10/R12/R15）

> **定位**（用户 2026-09-18）：抽屉**不是第二个详情页** —— **完整视图只有资产详情页一处**；抽屉只做
> 「**快速预览** + **唯一出口『完整详情 ↗』**」。**管理动作一律不在抽屉内**（全部归 §4.6 详情页管理区）。

**打开即 1 请求**：`GET /api/assets/:slug`（状态 + 描述 + 下载/收藏统计 + `labels[]`）—— 原 Q8 A 的「并发 2 请求（+ 版本列表）」随版本段移出而**作废**（纯预览不再需要版本数据）。

| 区 | 内容 |
|----|------|
| **工具行** | 左：`StatusPill kind="asset"`（状态 = **信息**，非治理动作）+ 文案「`section.previewHint`（快速预览；完整信息看资产详情页）」；右：**「完整详情 ↗」**（`Button asChild` + `Link` → `/assets/:slug`，`ArrowUpRight` 图标） |
| **统计行** | `asset-stats` 件：`⇣ compactCount(downloadCount) 次下载 · ★ compactCount(starCount) 收藏`（图标无色；收藏态表达见 R23） |
| **① 描述** | `asset.description`；为空 ⇒ 弱化色「`assets.desc.empty`（暂无描述）」 |
| **② 标签+-** | **`LabelCard` 共用件**（与详情页标签卡同件）：已挂 chips（× 移除）+ `Popover`+`Command` 可搜索候选 + `chips ≥ 10 ⇒ 候选禁用 + 说明`；挂/卸**无二次确认**（Q7 ⑤）· 已挂 PRIVILEGED 的 × **一律可点**、非超管点击由服务端抛 `label.access_denied` ⇒ toast 显示码文案（**Q13 = A**） |

**移出项与去向（作废留痕）**：
- ~~段① 状态治理（3×2 矩阵 + `ConfirmDialog`）~~ ⇒ **详情页管理区**（§4.6）
- ~~段③ 版本管理（行级删除 / yank / changelog / 加载更多）~~ ⇒ **详情页管理区 + 主列「版本」Tab 行内动作**（§4.6）
- ~~段④ 危险区（删除资产 + 版本态禁用判定）~~ ⇒ **详情页管理区**（§4.6）
- 连带作废：`ExpandableVersionList` 式追加加载（Q8 E）· truncate `changelog` 口径（**R5**）· 「已加载页判定删除禁用」口径（**条③ P3 / D6**）· 段②「无确认」与段③「有确认」的对照（**条③ P4**）

**段内状态报告缺口（原登记，现归详情页）**：版本列表项**无 `createdBy`** ⇒ 详情页版本行按 owner/管理档口径渲染可删集（owner 可删集 ⊇ 上传者可删集）；非 owner 上传者属 **Q5 同一夹缝**（登记，不为此加字段）。



### 4.4 全局交互约定

- **危险操作**（隐藏/归档/恢复/删除资产/删除版本/yank）→ **`ConfirmDialog` 二次确认**，文案含对象坐标与后果
  （主 design §9）；**本批统一 `destructive={false}`（去红）**，是否恢复红色语义**留 M4b-7 裁决**（Q8 F）
  —— **适用面随管理区迁移**（v1.7）：确认框**统一出自资产详情页管理区**（§4.6），抽屉内**零确认框**（纯预览）
- **写操作成功** → **局部重取 + 轻提示 `Toaster`**（不整页刷新，保留筛选与滚动位置）
- **错误** → `errors` 组按 code 本地化；401 ⇒ 按 U3 三分类分流（本批两页均在受保护前缀内 ⇒ 走 `/login?next=`）；
  **403 ⇒ 就地提示**（不退化为空态）
- **抽屉内快速切换资产** ⇒ 旧请求 **abort**（复用 `useApi` 既有 abort 口径），防旧响应覆盖新数据（**条③ R7**；编号跳 R6 —— 避与服务端读面「R6/R6-b」混淆）
- **语言切换** ⇒ `useApi` 语言感知缓存键含 `lang`（沿用 M4a），本批零改动

### 4.5 UI 结构与组件树（本批两页）

```text
pages/Dashboard.tsx（改造）
└─ PageHeader(title=dashboard.title)
└─ div.grid（3 列；单卡态保持 1/3 宽）
   ├─ DashboardCard（待审核）    ─ Link → /admin/reviews   [Skeleton | ErrorState(retry)]
   ├─ DashboardCard（我的资产）  ─ Link → /dashboard/assets [Skeleton | ErrorState(retry)]
   └─ DashboardCard（最近审计）  ─ 5 行 + Link → /admin/audit [Skeleton | ErrorState(retry)]

pages/Assets.tsx（新建）
└─ PageHeader(title=assets.title)
└─ FilterBar(status∈{ALL,ACTIVE,HIDDEN,ARCHIVED} · q · placeholder)
└─ DataTable（9 列 · rowActions=ScanEye 图标钮 + rowActionsHeader="操作" · loading/error/empty/skeleton）
└─ Pagination（?page= ↔ offset 换算）
└─ AssetDrawer（受控 open/onOpenChange；无 URL 状态）

components/console/AssetDrawer.tsx（新建 · 纯预览）
└─ Drawer（Sheet 封装 · sm:max-w-[560px] · 必带 title）
   ├─ 工具行：StatusPill + 「快速预览」文案 + [完整详情 ↗]（Link → /assets/:slug）
   ├─ 统计行：asset-stats（下载 · 收藏）
   ├─ 段 ① 描述（空 ⇒ 弱化色「暂无描述」）
   └─ 段 ② 标签+-：LabelCard（chips × + Popover>Command 选择器）

pages/AssetDetail.tsx（改造 · M4a 已交付页 —— 唯一完整视图 + 管理区）
└─ 面包屑 → 头卡（名称 + StatusPill + [下载][收藏] 按钮 + 下载规则小字 + 标签行）
└─ grid [1fr_320px]
   ├─ 主列：Tabs（总览 / 文件 / 版本）
   │    └─ 版本 Tab 行内动作：删除（owner 2 态 / 管理档 4 态）· 撤回分发（仅管理档，仅 PUBLISHED 行）
   └─ 右栏 aside（sticky top-[78px]）
        ├─ 元信息卡（作者 / 更新时间 / 下载 / 收藏 —— 图标一律无色）
        ├─ LabelCard（独立「标签+-」卡）
        └─ AssetAdminCard（管理区 · 按权限显隐：资产状态 / 版本 / 审核[占位] / 危险区）
```

> **抽屉/对话框状态不进 URL**（次要状态，同 M4a 版本对比对的处置；主 design §5.2 已定）。

### 4.6 资产详情页管理区（改 M4a 已交付页 · §2.1d R16–R21）

> **定位**：详情页是**唯一完整视图**，同时承载**全部管理动作**（用户 2026-09-18 拍板：「管理区承接全部，
> 包含『标签+-』『发布新版本』『状态治理』『版本管理』，**根据用户权限来显示**」）。
> 页面上仍是公开面（匿名可读）⇒ 管理动作**逐条按权限显隐**，不是整块一刀切。

**版式**（对齐真页真码：面包屑 → 头卡 → `grid grid-cols-[1fr_320px] items-start gap-4`）

| 区 | 内容 | 可见性 |
|----|------|--------|
| **头卡** | `h1` 名称 + `StatusPill` + **`[下载 vX.Y.Z]`（主按钮）** + **`[收藏 N]`（次级按钮；已收藏 ⇒ 星形填充）** + 下载规则小字（匿名可下载 · 限流 60/分·IP） + 标签行（只读 chips） | 全公开（消费者面） |
| **主列三 Tab** | 总览 / 文件 / 版本 —— **不改 M4a 既有能力**；仅「版本」Tab **行内新增动作** | 行内动作按权限 |
| **右栏 · 元信息卡** | 作者 / 更新时间 / 下载 / 收藏 —— **图标一律无色**（R18/R19/R23） | 全公开 |
| **右栏 · 标签+- 卡（独立）** | `LabelCard` 共用件（chips × + 添加标签 + 特权标签按钮） | 按权限（R17） |
| **右栏 · 管理卡** | `AssetAdminCard`：资产状态 / 版本 / 审核（占位）/ 危险区 | **按权限**（下表） |

**权限矩阵（逐条对齐**服务端真码守卫** —— 前端单点 `lib/asset-permissions.ts`；判定源 `assets/manage.ts:19` `canManageAsset`）**

| 动作 | 服务端真源（真码实测） | owner | 管理档 ≥10 | 超管 ≥100 | 登录非 owner | 访客 |
|------|----------------------|:---:|:---:|:---:|:---:|:---:|
| 状态治理（隐藏/归档/恢复） | `PATCH /:slug/status` → `assertManageable` | ✅ | ✅ | ✅ | ✗ | ✗ |
| 删除资产 | `DELETE /:slug` → `assertManageable` | ✅ | ✅ | ✅ | ✗ | ✗ |
| **发布新版本** | `POST /:slug/versions` → `canManageAsset` + scope `asset:publish` | ✅ | ✅ | ✅ | ✗ | ✗ |
| 提交审核 | `POST .../submit` → owner ∨ 管理档 + scope `review:submit` | ✅ | ✅ | ✅ | ✗ | ✗ |
| **撤回分发（yank）** | `POST .../yank` → **`role ≥ ADMIN`**（`canYank`）+ 原因必填 + scope `asset:manage` | **✗** | ✅ | ✅ | ✗ | ✗ |
| **删除版本** | `DELETE .../versions/:v` → **状态门分治**（上传者/owner 仅 `DRAFT`/`SCAN_FAILED`；管理档 +`REJECTED`/`UPLOADED`）+ scope `asset:manage` | ✅（**2 态**） | ✅（**4 态**） | ✅（4 态） | ✗ | ✗ |
| 标签+-（RECOMMENDED） | `PUT/DELETE .../labels/:slug` → `canManageAsset` + scope `asset:manage` | ✅ | ✅ | ✅ | ✗ | ✗ |
| 标签+-（**PRIVILEGED**） | 同上（短路） | ✗ | ✗ | ✅ | ✗ | ✗ |
| 审核（通过/拒绝/撤回） | `/api/reviews/*`（**M4b-5 待做**） | ✗ | ✅ | ✅ | ✗ | ✗ |

**显隐口径（两层 · 需分开处理）**：
- **卡层**：`AssetAdminCard` / `LabelCard` 若**整卡无任何可见动作** ⇒ **整卡不渲染**（避免空卡；访客与「登录非 owner」即此情形）；
  仅当**有可见动作、个别动作被禁**时才用「禁用 + `title` 说明」形态（对齐主 design §9「403 → 就地提示」）
- **动作层**：无权限 ⇒ **不渲染**（默认）或 **禁用 + `title` 说明** —— 原型两形态均已做出，**实现期取一**（登记：待拍板）
- `admin.noPermission` 文案**仅用于**「实现期选了禁用形态且整卡进入降级」时的说明句

**占位（登记不实现）**：
- 「**发布新版本**」按钮**仅占位**（真入口归 **M4b-8** 发布批；本批不接发布流）
- 「**审核**」动作**仅占位**（归 **M4b-5**；用户标注「还在讨论」）
- 「**收藏**」按钮依赖 **star 能力**（未实现，见 §2.1d 依赖登记）⇒ **降级口径**：star 批未落地时，
  **列表「收藏」列 · 抽屉收藏统计 · 详情页收藏按钮 三处一律不渲染**（**不显示恒为 0 的死数**，避免假 UI）；
  star 批落地后按 §4.2/§4.3/§4.6 补回

**并发/一致性**：管理区动作成功后 ⇒ **局部重取**（`invalidateCache` + 详情重取；列表页 `retryTick++`），不整页刷新（§4.4）；抽屉内跳详情走 `Link`（路由切换，天然重取）。

## 5. 服务端改动规格（R6 + R6-b）

### 5.1 改动点（**6 个文件** + 2 份规范；**无迁移**）

**① `assets/service.ts` —— `listViewableAssets` 参数化（Q4 ①-1）**

- **接口是既有件**：`ListAssetsOptions`（`service.ts:30-38`）现已含 `limit: number` / `offset: number`（**必填**）·
  `type?: AssetType` · `q?: string` · `labelSlugs?: string[]` ⇒ 本批**增量扩两字段**（不新建接口、不改既有字段）：

  ```ts
  + ownerId?: string;                 // 缺省 = 不限 owner（公开面）
  + status?: AssetStatus | 'ALL';     // 缺省 = 'ACTIVE'（公开面行为零变化）
  ```

- **条件数组首项**（`:177` 硬编码 `eq(asset.status, 'ACTIVE')`）改为**按 `status` 组装**：
  `'ALL'` ⇒ 不加状态条件 · `{ACTIVE,HIDDEN,ARCHIVED}` ⇒ 加等值条件 · 缺省 ⇒ 加 `ACTIVE`（= 现状）
- **q 语义零改动**（`:182-204`：slug `ILIKE` ∪ 版本投影 `name`/`description`/`searchText`）；`type`/`labelSlugs`
  两个既有过滤**保留**（me 面不暴露，见 §5.2）
- 返回值形状不变：`{ items: AssetRow[]; total: number }`（**裸 rows、不含 meta** —— 见 ③）
- 一份 SQL 逻辑服务**三面**：公开面（默认）· 我名下（`ownerId`）·（**M4b-6**）管理档全站（不传 `ownerId` + 任意 `status`）

**② `http/asset-item.ts`（新建）** —— `assetItem()` + `AssetItemMeta` 自 `http/assets.ts:111` **原样迁出**；
`assets.ts` 与 `me.ts` 共同 import（14 字段响应形状**零变化**）。

**③ `http/me.ts`（新建）** —— `createMeRoutes({ db })`，挂 `/api/me`：

```text
GET /api/me/assets   （requireAuth）
  1) meQuerySchema.safeParse（自有 schema · **上限口径与公开面 `listQuerySchema` 逐项一致**：
     `limit` int 1..**100** 默认 **20** · `offset` int ≥0 默认 **0** · `status` 默认 **`'ALL'`** · `q` trim 1..**100**）
     非法 `status` ⇒ 400 `request.invalid`（沿用公开面错误体形制 —— 该码为**已落码**，`validate/base.ts:32` 兜底）
  2) listViewableAssets({ ownerId: principal.userId, status, q, limit, offset })
  3) ★ loadAssetItemMeta(db, items)      —— 批注入（两条 inArray 防 N+1）
  4) items.map((i) => assetItem(i, metas.get(i.id)))
  → { items: AssetItem[], total, limit, offset }
```

- ★ **第 3 步不可省**：`listViewableAssets` 返回**裸 `AssetRow[]`**（`service.ts:242`，**不含 meta**）；
  公开列表路由正是在此处做 `loadAssetItemMeta` 批注入（`http/assets.ts:279-287`）。漏掉 ⇒ `latestVersion` /
  `latestName` / `ownerDisplayName` 全为 `null` ⇒ 「名称」列退化为 slug、「版本」列全 `—`（**九列**口径见 §4.2）。
- **owner-only**：`ownerId` 恒取会话 `principal.userId`，**不接受客户端传入**（防越权；U5 集合语义）
  —— `principal` 由中间件注入：`requireAuth()` 定义于 `http/auth-middleware.ts:96`（取用形制照 `http/tokens.ts`）
- 响应形状与公开面列表**同构**（`assetItem` 全 14 字段，**含 `status`** ⇒ 「状态」列有值）；**另加 `labels`**（⑦ · 有意扩展项）

**④ `http/assets.ts` —— `assertAssetReadable` 授权集扩展（R6-b · 本批唯一改判定的地方）**

现状（`:163-175`）：`超管 → 放行`；其余 `status !== 'ACTIVE' → 404`。改为：

```ts
if (viewer.isSuperAdmin) return viewer;
const inAuthorizedSet =
  row.ownerId === viewer.viewerId || viewer.isPlatformReviewer;   // owner 本人 ∨ 管理档
if (row.status !== 'ACTIVE' && !inAuthorizedSet) throw new AssetError(assetErrorCodes.notFound);
return viewer;
```

- **一处判定，自动覆盖 6 个调用点**：详情 `:294` · 版本列表 `:308` · 版本详情 `:332` · 文件 `:351` · 下载 `:371` · 预览 `:778`
- **授权集外仍 404**（`asset.not_found`）⇒ 「不泄露存在性」原则（§7.1）**保持**
- 授权集 = **{owner 本人，管理档（`role ≥ 10`），超管}**（与 `canManageAsset` 同源；**不含**「版本上传者本人」—— Q5 A）

**⑤ `app.ts`** —— `app.route('/api/me', createMeRoutes({ db: deps.db }))`（挂载表新增 1 行）

**⑥ 规范同步（Q11 A，随本批即改）** —— 见 §9.6

**⑦ `labels` 形状升级 = 服务端返**结构体**（Q14 = B · §2.1d）**

> 背景：列表新增「标签」列（R1）；而既有 **D5**（前端类型谎言：`AssetItem.labels` 声明对象数组、服务端返
> `string[]`）与 **D7**（门户详情页标签 chips **渲染空白**）**同源** —— 根因都是「服务端只返 slug、文案无处可取」。
> 本批按 **skillhub 真仓做法**一次根治（对标实测：其 `SkillLabelDto = { slug, type, displayName, parentId }`）。

- **形状**（对齐 skillhub）：
  ```ts
  labels: Array<{ slug: string; type: 'RECOMMENDED' | 'PRIVILEGED';
                  displayName: string | null; parentId: number | null }>
  ```
- **`displayName` 语种口径**：与公开候选面 `GET /api/labels` **同源** —— 取 `Accept-Language` 首段
  （`http/labels.ts:66` 既有写法）⇒ 同页面内「已挂标签」与「候选标签」**语言一致**（不中英混排）
- **落点（4 处）**：
  1. `packages/protocol` —— 标签形状类型改写（**协议 = SSOT，先改这里**）
  2. `labels/service.ts` —— 新增**批量** `labelsOfAssets(db, assetIds, locale)`（一次 `inArray` join
     `label_definition` + `label_translation`，**防 N+1**）；既有单资产 `labelsOfAsset`（返 `string[]`）**保留**
  3. `http/asset-item.ts` —— `assetItem()` 增**可选** `labels` 形参（不传 ⇒ 不下发 ⇒ 公开**列表**面形状零变化）
  4. `http/me.ts` —— meta 批注入之外**并列一次批量 labels 查询**（仍无 N+1）
  5. `http/assets.ts` **详情路由**（`:294` 一带）—— 传入批查到的 labels ⇒ **D7 在同一处修好**（公开详情面随之改形状）
- **偏离登记（如实）**：**skillhub 的列表不返回标签**（实测 `SkillSummaryResponse` 无 `labels` 字段，标签只在详情面）
  ⇒ 本批「列表带标签」= **有意扩展**；形状与它详情面**保持一致**，不自创第二套
- **D5 / D7 处置**：D5 ⇒ 前端 `AssetItem.labels` 类型改结构体数组（与协议一致）· D7 ⇒ `AssetDetail.tsx:200-208`
  改读 `label.displayName ?? label.slug`（**服务端已给名字，前端零 join**）⇒ **两缺陷同批闭合**
- **兼容面实测**：`labels` 元素类型 `string → object` 的唯一**仓内消费者** = `AssetDetail.tsx:200-208`（正被本批修）；
  `apps/cli` / `packages/protocol` 其余消费点 **0**（grep 实证）⇒ 破坏面收敛到「本批修的那一处」

### 5.2 契约影响（向后兼容论证）

| 变更 | 类型 | 影响面 |
|------|------|-------|
| `GET /api/me/assets` | **纯新增** | 无既有消费方；公开面零改动 |
| `listViewableAssets` 参数化 | **内部函数签名** | 调用方（`http/assets.ts:257` 公开列表）**不传新参** ⇒ 走默认值 ⇒ **响应零变化**（Q12 D 用断言锁） |
| `assetItem` 迁文件 | **内部重构** | 导出面扩大（`assets.ts` → 中性模块），**响应形状零变化** |
| `assertAssetReadable` 授权集 | **读面放宽** | 唯一行为变化 = **owner / 管理档**对非 ACTIVE 资产：404 → 200；**匿名与其他登录用户不变（仍 404）**；超管不变 |

**非目标（本批明确不做）**：不改公开列表口径（`GET /api/assets` 默认仍只返 `ACTIVE`）· 不给 `me/assets`
加 `labels` 字段（标签取详情，Q7 ②）· 不给版本列表项加 `createdBy`（Q5/Q8 C 登记）· 不动 token scope 组合 · **me 面不暴露 `type`/`label` 过滤**
（U5 只要求状态 + q ⇒ 最小面）。

### 5.3 测试面（Q12 A–D）

**① 更新既有断言 2 处**（`http/assets.test.ts`，均属**需求变更驱动的契约更新**，已获准）

| 位置 | 现状 | 更新为 |
|------|------|--------|
| `:418` | fixture `insertAsset('ast-hidden','agent',**member**,'HIDDEN')`（`:143`）⇒ 断言 `member → 404` | `member`（**= owner**）→ **200**；**保留** `superAdmin → 200`；**新增** 非 owner 登录用户 → 404 |
| `:844-857` | `:854` 注释「owner 亦不可读（详情语义）」+ `:856` 断言 owner 404 | owner → **200**；**保留**匿名 404；**注释去腐化**（改为「授权集内可读，集外 404」） |

**② 授权集三档对照**（在①的同一 `it` 内补齐）：owner **200** / 管理档 **200** / 非 owner 登录 **404** / 匿名 **404**。

**③ 分层四面对照**（§7.2 声明「详情 / 版本 / 文件 / 下载」四面同步放宽 ⇒ 四面各一条断言）：
`GET /:slug` · `GET /:slug/versions` · `GET /:slug/versions/:v/files/*` · `GET /:slug/versions/:v/download`
—— 对同一 HIDDEN 资产，**授权集内 200 / 集外 404**。

**④ 新端点用例**（新建 `http/me.test.ts`）：未登录 **401** · **owner-only 集合**（他人资产不出现）·
`status=ALL` 含三态 · `status=HIDDEN` 过滤 · 分页（`limit`/`offset`/`total`）· `q` 检索 · 非法 `status` → 400。

**⑤ 公开面回归锁**（Q4 参数化的唯一回归风险点）：`GET /api/assets`（**不传新参**）⇒ 仍只返 `ACTIVE`、
响应字段集不变。

**⑥ 必须原样保留（防「改弱测试」）**：匿名列表不含 HIDDEN（`:442-450`）· HIDDEN 文件匿名 404（`:694`）·
陌生人下载 404（`download.test.ts:212`）· 统计不计 HIDDEN（`stats.test.ts`）—— **一个字不动**。

## 6. i18n 变更规格

> **口径**（Q10 D）：本节给**逐键表**（zh 真源 + en 逐条对齐）；**总键数不预写**，由实现期**实测回填**
> （防「AI 自报数字」漂移）。纪律：双语**双向差集 = 0** · 占位符一致 · `Dict` 类型约束（缺键即编译错）。
> 现状基线：**222 键 / 11 组**（2026-09-18 实测，双向差集 0）；本批新增/变更见 §6.1–§6.4，**总数实现期实测回填**。

### 6.1 新建组 `assets`（逐键表 · v1.7 修订口径）

> v1.7 变更（§2.1d）：`col.name` 值改「名称」· **新增 3 列键**（`col.labels` / `col.download` / `col.star`）·
> `menu.open` → **`action.open`**（列表去菜单）· **删 5 键**（`menu.restore/hide/archive/labels/delete`）·
> **删 `section.status`**（状态治理段移出抽屉，改由 `admin.statusGroup` 表达）· 段名 `标签+-` ·
> 新增抽屉预览键（`section.previewHint` / `desc.*` / `stat.*`）与**详情页管理区键**（`admin.*`）·
> **补版本 8 态徽章键**（F14：§6.1 原缺 —— `StatusPill` 的 `label` 为**必填 prop**）

| 键 | zh | en |
|----|----|----|
| `title` | 我的资产 | My assets |
| `description` | 管理你名下的资产（含隐藏与归档） | Manage the assets you own, including hidden and archived |
| `col.name` | **名称** | Name |
| `col.type` | 类型 | Type |
| `col.status` | 状态 | Status |
| `col.labels` | **标签** | Labels |
| `col.version` | 版本 | Version |
| `col.download` | **下载** | Downloads |
| `col.star` | **收藏** | **star** |
| `col.updated` | 更新 | Updated |
| `col.actions` | 操作 | Actions |
| `filter.status.all` | 全部 | All |
| `filter.status.active` | 活跃 | Active |
| `filter.status.hidden` | 已隐藏 | Hidden |
| `filter.status.archived` | 已归档 | Archived |
| `filter.search` | 搜索名称或 slug | Search name or slug |
| `empty.title` | 你还没有资产 | You have no assets yet |
| `empty.hint` | 通过 CLI 或发布页上传你的第一个资产 | Upload your first asset via the CLI or the publish page |
| `empty.filtered` | 没有符合条件的资产 | No assets match the filter |
| `action.open` | **打开详情** | Open details |
| `drawer.title` | 资产管理 | Manage asset |
| `section.previewHint` | **快速预览；完整信息看资产详情页** | Quick preview — see the asset page for full details |
| `desc.title` | **描述** | Description |
| `desc.empty` | **暂无描述** | No description |
| `stat.downloads` | **{n} 次下载** | {n} downloads |
| `stat.stars` | **{n} 收藏** | {n} stars |
| `section.labels` | **标签+-** | Labels (+/-) |
| `label.add` | 添加标签 | Add label |
| `label.search` | 搜索标签 | Search labels |
| `label.empty` | 没有匹配的标签 | No matching labels |
| `label.limit` | 已达到 10 个标签上限 | Label limit reached (10) |
| `label.privileged` | 仅超级管理员可移除特权标签 | Only super admins can remove privileged labels |
| `admin.title` | **管理** | Manage |
| `admin.statusGroup` | **资产状态** | Asset status |
| `admin.versionGroup` | **版本** | Versions |
| `admin.reviewGroup` | **审核（形态待讨论）** | Review (to be discussed) |
| `admin.dangerGroup` | **危险区** | Danger zone |
| `admin.noPermission` | **当前身份无管理权限** | You do not have permission to manage this asset |
| `status.current` | 当前状态 | Current status |
| `action.restore` | 恢复 | Restore |
| `action.hide` | 隐藏 | Hide |
| `action.archive` | 归档 | Archive |
| `version.col.version` | 版本 | Version |
| `version.col.status` | 状态 | Status |
| `version.col.created` | 创建时间 | Created |
| `version.col.files` | 文件 | Files |
| `version.empty` | 该资产还没有版本 | This asset has no versions yet |
| `version.delete` | 删除 | Delete |
| `version.yank` | 撤回分发 | Yank |
| `version.deleteDisabled` | 该状态不可删除 | This version cannot be deleted |
| `version.yankDisabled` | 仅管理档可撤回已发布版本 | Only admins can yank a published version |
| `version.status.draft` | 草稿 | Draft |
| `version.status.scanning` | 扫描中 | Scanning |
| `version.status.scan_failed` | 扫描失败 | Scan failed |
| `version.status.uploaded` | 待提交 | Uploaded |
| `version.status.pending_review` | 审核中 | Pending review |
| `version.status.published` | 已发布 | Published |
| `version.status.rejected` | 已驳回 | Rejected |
| `version.status.yanked` | 已撤回 | Yanked |
| `danger.delete` | 删除资产 | Delete asset |
| `danger.hasPublished` | 该资产有已发布版本，不能删除 | This asset has published versions |
| `danger.hasYanked` | 该资产有已撤回版本，不能删除 | This asset has yanked versions |
| `toast.statusUpdated` | 状态已更新 | Status updated |
| `toast.labelAttached` | 标签已添加 | Label added |
| `toast.labelDetached` | 标签已移除 | Label removed |
| `toast.versionDeleted` | 版本已删除 | Version deleted |
| `toast.versionYanked` | 版本已撤回 | Version yanked |
| `toast.assetDeleted` | 资产已删除 | Asset deleted |

> **删键留痕**（v1.7）：`menu.restore` / `menu.hide` / `menu.archive` / `menu.labels` / `menu.delete`（列表去 `⋯` 菜单）·
> `section.status`（段移出）· `danger.deleteChecking` / `danger` 的「版本列表未就绪」口径（纯预览不再需要）。
> **资产 3 态徽章文案**：复用 `filter.status.*`（先例 = M4b-3 `STATUS_KEY` 同时供筛选与徽章）。

### 6.2 既有组 `dashboard` 补键（现 **6 键**）

> **优先复用既有键**：我的资产卡标题用 `dashboard.myAssets`（不新增）；空态用既有 `dashboard.empty`。

| 键 | zh | en |
|----|----|----|
| `card.pending.title` | 待审核 | Pending review |
| `card.pending.cta` | 去处理 | Review |
| `card.assets.cta` | 去管理 | Manage |
| `card.audit.title` | 最近审计 | Recent activity |
| `card.audit.col.time` | 时间 | Time |
| `card.audit.col.action` | 动作 | Action |
| `card.audit.col.target` | 对象 | Target |
| `card.audit.viewAll` | 查看全部 | View all |

### 6.3 既有组 `common` +1 · `errors` +7 码

| 组 | 键 | zh | en |
|----|----|----|----|
| `common` | `loadMore`（**跨面通用** —— 抽屉版本段与未来列表共用） | 加载更多 | Load more |
| `errors` | `asset.has_published` | 该资产存在已发布版本，无法删除 | This asset has published versions and cannot be deleted |
| `errors` | `asset.has_yanked` | 该资产存在已撤回版本，无法删除 | This asset has yanked versions and cannot be deleted |
| `errors` | `asset.version_not_deletable` | 当前状态的版本不可删除 | A version in this state cannot be deleted |
| `errors` | `asset.version_not_yankable` | 仅已发布版本可撤回分发 | Only published versions can be yanked |
| `errors` | `asset.yank_reason_required` | 请填写撤回原因 | A yank reason is required |
| `errors` | `label.limit_exceeded` | 标签数量已达上限（10） | Label limit reached (10) |
| `errors` | `label.access_denied`（**Q13 = A 引入** —— 非超管移除 PRIVILEGED 标签的服务端拒绝码） | 没有权限操作该标签 | You do not have permission to modify this label |

> **不预支**：M4b-6 的标签 CRUD 错误码（如 `label.slug_taken`）**本批不补**（Q10 C）。
> **`errors` 组现状 28 键**（脚本实测）⇒ 本批后 **35 键**（28 实测 + 7 新增；**实现期以脚本实测回填**，不视为已证值）。

### 6.4 既有组 `market` 补键（详情页改造 · §4.6）

> 详情页头卡 [下载] / [收藏] 与右栏标签卡文案 —— **优先复用既有键**（`market.dlLatest` / `market.downloads`
> 用于下载按钮与元信息「下载」行），仅补下列 4 键：

| 键 | zh | en |
|----|----|----|
| `market.star` | 收藏 | Star |
| `market.starred` | 已收藏 | Starred |
| `market.starLoginRequired` | 登录后可收藏 | Sign in to star this asset |
| `market.labelsTitle` | 标签+- | Labels (+/-) |

## 7. 接口变更总览（服务端面）

| # | 变更 | 类型 | 位置 | 说明 | 归属 |
|---|------|------|------|------|------|
| **R6** | 新增 | `GET /api/me/assets` | 「**我名下的资产**」读面（owner-only · `status` 默认 `'ALL'` · `q` · 分页）；响应形状与公开面列表同构 | 本批 |
| **R6-b** | **修改** | `http/assets.ts` `assertAssetReadable` | 非 ACTIVE 读面授权集 = {owner 本人 / 管理档 / 超管}；**集外仍 404**（不泄露存在性） | 本批 |
| — | 内部 | `assets/service.ts` `ListAssetsOptions` | **+ `ownerId?` / `status?`**（默认值保公开面行为零变化） | 本批 |
| — | 内部 | `http/asset-item.ts`（新件） | `assetItem` + `AssetItemMeta` 迁出为中性模块（`assets.ts` / `me.ts` 共用） | 本批 |
| — | 内部 | `app.ts` | 挂载 `/api/me`（1 行） | 本批 |
| — | 迁移 | — | **零迁移**（无 schema 改动） | — |
| 规范 | 修改 | `05` §6.4:187 + `:161` · `08` §7 | 读面授权集行 + 超管行措辞 · 读面注记 + **ARCHIVED 运营语义补实** | 本批（Q11 A） |

## 8. UI-UX 变动总览（本批用户可见变化）

| 面 | 变动 |
|----|------|
| `/dashboard` | 过渡形态（`ComingSoon` 内容槽）→ **三卡 landing**：三张计数/列表卡 + 卡内 CTA + 审计卡 5 行（`role ≥ 10` 才渲染后两卡） |
| `/dashboard/assets` | 占位页 → **真页**：**九列**列表 + 状态筛选 + q 搜索 + 分页（**无行菜单**；操作列 = 单个「快速预览」图标钮） |
| 新件 | **资产管理抽屉 = 快速预览**（右侧 `Sheet` · 宽 **560** · 描述 / 标签+- / 统计行 / 「完整详情 ↗」）· **资产详情页管理区**（改 M4a 页 · §4.6） |
| 入口与导航 | **零变动**（两条目已在「个人」组；本批不新增入口、不改显隐） |
| 视觉 | **零新 token、零新依赖** —— 全部消费 M4a §4.4（SSOT）+ 主 design §10.1 控制台特有值（表格密度 **40** / 抽屉宽 **560**，均已落值） |
| 空 / 载 / 错态 | 列表：骨架行 + **两套空态文案**；三卡：**每卡独立三态 + 独立重试**；抽屉：段内载态（危险区在版本列表就绪前**保持禁用**） |
| 无障碍 | 整卡 `<Link>` 覆盖层 + 内层 CTA 用**非 anchor** `<span>`（**无嵌套 `<a>`**）；`Drawer`/`ConfirmDialog` 必带 title/description |
| i18n | 新组 `assets`（逐键表 §6.1）+ `dashboard` 补 8 键 + `common` +1 + `errors` **+7** |

## 9. 回归面与验证口径

### 9.1 门户零回归（**硬约束 —— 每 Task 收尾必跑**）

- **`m4a-dogfood.ts` 36/36 + `NO JS ERRORS`**（M4a 四条门户读面行为语义不变）
- **`m4a-chain-smoke.ts` PASS**
- **`CenterPage.tsx` 零 diff**：`useMarketQuery` 的 `status` 维度为**可选参数**，门户调用点（`CenterPage.tsx:119`）**不传** ⇒ 不读不写 `status` param ⇒ 行为零变化（**本批唯一的门户风险点已在设计上消除**）
- 生产产物 **零 `M4b-` marker**（DEV_BATCH 条目随真页删除）

### 9.2 门禁与冒烟顺序（**复现 CI**，AGENTS.md 硬规则）

```
bun install --frozen-lockfile → typecheck → lint → format:check → 文档体检(doc-audit)
  → build → db:migrate → CI=true bun run test
```

- 测试库口径 = **单库 + 干净 schema + `CI=true`**（CI 只建一个库）；测试**禁止无条件改写 `process.env`**（沿用 `??=` 兜底）
- `turbo.json` 环境变量声明：**本批不新增**任务依赖 env
- `db:migrate` 独立步骤先跑（消除多文件 `beforeAll` 并发迁移竞态）；**本批零迁移**但仍跑（守门）

### 9.3 本批 dogfood 分组（新建 `docs/smoke/scripts/m4b4-personal-b-dogfood.ts`）

| # | 断言组 |
|---|-------|
| G1 | **未登录**访 `/dashboard` 与 `/dashboard/assets` ⇒ 重定向 `/login?next=<带码路径>`（保码） |
| G2 | `role = 1` 工作台：**只渲染 1 卡** + **只发 1 请求**（排除壳层 `me`/`stats`） |
| G3 | `role = 10` 工作台：**3 卡 + 3 请求**；审计卡 5 行且**不含操作人** |
| G4 | 我的资产默认「全部」⇒ **实际请求 URL 含 `status=ALL`**（防名实不符） |
| G5 | **owner-only 集合**：造数的「他人资产」**不出现**在我的列表 |
| G6 | **九列**齐 + 状态列值正确（ACTIVE/HIDDEN/ARCHIVED 各一行）+ **类型列无色**（反证：容器内 `[class*="bg-type-"]` 计数 = 0） |
| G7 | 抽屉**打开即 1 请求**；段集合 = **描述 + 标签+-**（反证：抽屉内无「隐藏/归档/恢复/删除资产/删除版本/撤回分发」按钮 —— 纯预览，R8/R15） |
| G8 | 抽屉工具行「**完整详情 ↗**」`href` = `/assets/<slug>`（R6） |
| G9 | 标签 chip 文案 = **`displayName`**（结构体渲染；反证：chips 文本 ≠ slug，Q14 = B）· chips ≥ 10 ⇒ 候选禁用 + 说明 |
| G10 | 列表 star/下载两列数值 = 接口 `downloadCount` / `starCount` —— **star 批落地后启用**（未落地 ⇒ 三处均不渲染，§4.6 降级口径） |
| G11 | **详情页管理区 5 档权限矩阵**逐档断言：访客 / 登录非 owner（两卡均不渲染）· owner（无 yank / 无特权标签）· 管理档（有 yank）· 超管（+ 特权标签） |
| G12 | 详情页版本 Tab 行内动作：**owner 视图「删除」仅 2 态、管理档 4 态**；yank 仅 `PUBLISHED` 行且仅管理档（真码守卫对照） |
| G13 | 筛选 / 搜索变更 ⇒ `page` **回落 1** + URL 同步（`?status=&q=&page=`） |
| G14 | 门户零回归 **36/36** + chain-smoke PASS（§9.1） |
| G15 | 全场景 **`NO JS ERRORS`** |

### 9.4 出口件 ④（本批验收清单）

沿用 M4b-2 口径（**CDP 自动断言 + 用户认可**）：出口件 ④ = 上表 **G1–G15** 逐组实测 + 用户实机认可结论；
**审美面不在本批范围**（视觉打磨归 **M4b-7**，本批只做**合规核对**：有无错位 / 溢出 / 串色 / 异常）。

### 9.5 造数需求（**写库须用户授权**；脚本进仓，口令不落库）

`docs/smoke/scripts/m4b4-seed-assets.ts`（**幂等 upsert**）：

| 类别 | 内容 | 用途 |
|------|------|------|
| 角色 | 3 账号：普通 `USER` / 管理档 `ADMIN` / 超管 `SUPER_ADMIN` | G2/G3/G7/G9 按档断言 |
| owner 名下**三态资产** | `ACTIVE` / `HIDDEN` / `ARCHIVED` 各 ≥1（三族各一条更佳） | G6 状态列 · R6 集合含三态 |
| **他人**名下资产 | 非当前 owner 的 `ACTIVE` 资产 ≥1 | **G5 owner-only 集合断言**（关键） |
| 版本 | 每个资产 ≥1 版本；**含 `PUBLISHED` 的资产** 与 **仅 DRAFT 的资产** 各一 | G8 危险区禁用真值 · G9 可删/禁删 |
| 标签 | 复用既有种子标签；挂 ≥1 个到 owner 资产 | G10 chips 与候选差集 |
| **审计** | **≥5 条**审计记录（由造数动作自然产生，或直插 `audit_log`） | 工作台「最近审计」卡 5 行（**§2.1c 条① R2**） |

- 口令从 **env** 读（`SMOKE_*_PASSWORD` 惯例）；**仓库内不落任何口令 / 连接串**
- **首次写库前须用户明确授权**（先例：M4b-2/M4b-3 造数）；幂等 ⇒ 可重放

### 9.6 规范同步（Q11 A —— 随本批即改）

| 文件 | 改动 |
|------|------|
| `05-identity-access.md` §6.4 | `:187` 授权集行：「非 ACTIVE 资产读面 = **仅超管**」→ **{owner 本人 / 管理档 / 超管}**；`:161` 超管行措辞连带（「全部权限（含非 ACTIVE 资产读面）」→ 去「含」的独占暗示） |
| `08-data-model.md` §7 | ① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）；② **ARCHIVED 运营语义补实**：`HIDDEN = 临时下架/可恢复` · `ARCHIVED = 长期退役/停止维护`（本批「恢复」动作的判据依据） |

### 9.7 收尾回填项（本批遗留的「写数字」动作，全部用**实测**）

> **v1.7a 追加（F27/F30 纪律）**：口径变更后须做**全文散点扫**（`grep` 旧称：列数 / 段集合 / 菜单 / Task 区间 / 断言区间），
> 并把扫描结果（命中处数 + 处置）回填本节 —— 依据 = §11.5 揭示的 20 处散点漏改。

1. 主 design **§11 i18n 键数**：回填实测值（现状为 M4a 期史实值，§1.2 #11）
2. 主 design **§2.3 批件登记表**：回填本批 design/plan 实际文件名 + 版本 + 状态 + 出口五件
3. `docs/00` **§5 M4b-4 行**：状态 ⬜ → 🔵 → ✅（按批间门五件）
4. 本文档 **§6 键表总数**：脚本实测回填（Q10 D）
5. **主 design 文档缺陷订正（§2.1c 条① D2/D3 登记项）**：§12 `/dashboard` 线框去掉 stale 的「含2隐藏」副文案；
   §7.3:624「与线框『含 N 隐藏』一致」改为与 U4 拍板一致（**省略副文案**）
6. **件表追加回写**：`api/audit.ts`（新建）· `api/reviews.ts` 队列函数（改造）—— 同步主 design §2.3 登记表与 `docs/00` §5 的件规格计数

## 10. 引用文件清单

**代码（本批改动面 —— 读/改均以这些为准）**

| 层 | 文件 |
|----|------|
| server 路由 | `http/me.ts`（新）· `http/asset-item.ts`（新）· `http/assets.ts`（`:111`/`:163-175` 改 · `:255-290` 参照）· `app.ts`（挂载） |
| server 服务 | `assets/service.ts`（`:30-38` 接口 · `:173-242` 查询）· `assets/version-read.ts`（版本级授权参照）· `assets/manage.ts`（`canManageAsset` 同源）· `labels/service.ts`（`:573` `labelsOfAsset`） |
| server 测试 | `http/assets.test.ts`（`:418`/`:844-857` 改 · `:442-450`/`:694` 保留）· `http/me.test.ts`（新）· `http/download.test.ts:212` · `http/stats.test.ts`（保留） |
| web 页面 | `pages/Dashboard.tsx`（改）· `pages/Assets.tsx`（新）· `main.tsx`（路由 + DEV_BATCH） |
| web 件 | `components/console/AssetDrawer.tsx`（新）· `console/{DataTable,Drawer,ConfirmDialog,StatusPill,FilterBar,PageHeader}`（复用）· `hooks/useMarketQuery.ts`（扩可选参数）· `api/me.ts`（新）· `i18n/zh.ts` + `en.ts` |
| 脚本 | `docs/smoke/scripts/m4b4-seed-assets.ts`（新）· `m4b4-personal-b-dogfood.ts`（新）· `m4a-dogfood.ts`/`m4a-chain-smoke.ts`/`doc-audit.ts`（回归） |

**文档（引用不复制）**

- 主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.1 R6/R6-a/R6-b · §2.3 · §2.4 U4/U5/U6 · §4 · §5.1/§5.2 · §6.2 · §7.1 · §7.2 · §7.3 · §8 · §9 · §10.1 · §11 · §12）
- 规范 `docs/05-identity-access.md` §6.4 · `docs/08-data-model.md` §7 · `docs/06-*.md`（标签挂载权限）· `docs/07-i18n-conventions.md` §3
- 视觉 SSOT：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（引用不复制）
- 追踪表：`docs/00-product-direction.md` §5/§7

## 11. 8 维自检

### 11.1 复评（2026-09-18 · 门禁 = 8 维 ≥9，口径 = 标准 4 维 + 深度 4 维）

> ⚠️ **历史快照**（v1.1 口径）：本节依据列中的「件表（新建 9 / 改造 11）」「四段抽屉」「6 列」等为**当时值**，
> **现行值以 §3 件表（新建 12 / 改造 11+2 文档）· §4.2（9 列）· §4.3（纯预览抽屉）为准**（v1.7 原型评审收口后）。

> 初评 **9.63**（当时含 1 项未闭合决策 F1）→ 用户拍板 **Q13 = A** 后**复评 9.69**
> ⚠️ **该分已于 v1.2 换靶复核后撤回**（窄口径产物）—— **现行分见 §11.3 = 9.66**；delta 见本节末。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.7** | 12 段骨架齐（对齐 M4b-3）· 决策齐（**Q1–Q13 全闭合**）· 件表（新建 **9** / 改造 **11**）· 服务端改动点逐条（含现状与改法）· 测试面 6 组 · i18n 逐键表 · 验证口径（门禁 / dogfood G1–G13 / 出口件 / 造数 / 规范同步 / 收尾回填）齐 |
| 标准 2 准确性 | **9.6** | §1.2 **十四条真码实测**（`file:line` + `wc -l` + 脚本实测键数）· 契约逐条对主 design §7.1 · i18n 基线 **222 键 / 11 组**（脚本实测，双向差集 0）· 服务端改动**贴现状代码**（`service.ts:30-38`/`:177`/`:242`） |
| 标准 3 一致性 | **9.7** | 与主 design §2.1/§2.4/**§7.1/§7.2/§7.3**/§8/§10.1/§11/§12 逐条对齐；与 `docs/00` §5 M4b-4 行一致（R6 + R6-b 两处）；命名合规（`YYYY-MM-DD-m4b4-<主题>-design.md`，功能自描述）；与 M4b-3 批 design 同构 |
| 标准 4 可用性 | **9.7** | 实现者**照抄零二次决策**：列集合 / 抽屉四段每段内容与禁用真值 / 请求口径（3 vs 1）/ 键名 / 服务端改动骨架（含既有接口形状与改法）/ 测试面全部定死；**无待拍板项**（Q13 闭合后连 PRIVILEGED 路径也给了确定实现与错误码） |
| 深度 1 追溯性 | **10** | 每条现状带 `file:line`；每个决策带 Q 编号 + 日期 + 来源（「按推荐来」）；规范同步带 `05:187`/`:161` 行号；测试影响带到行 |
| 深度 2 反证 | **9.4** | 含向后兼容论证（4 行表）· 非目标清单 · Q5 夹缝登记 · Q8 C「不加 `createdBy`」登记 · 「提审入口」缺口显式登记；**扣分 = 未展开被否决选项的对照**（按用户口径「被否决方案不进文档」，**有意**不复述 ⇒ 如实扣分） |
| 深度 3 边界/风险 | **9.7** | R6-b 边界（**集外仍 404** 保持）· 参数化回归风险 + **回归锁断言** · 删除禁用「闪变」防护 + 服务端兜底 · 权限降级夹缝 · 加载态保持禁用 · 旧语义被替换点（测试注释腐化）· 零迁移 · 未登录 / 降级 / 403 三类分支 · **Q13 缺口已登记并明确归属 M4b-6** |
| 深度 4 维护性 | **9.6** | 引用不复制（主 design / 规范 / 线框 / 视觉全走指针）· 键表可直接落码 · **收尾回填项显式列出（§9.7）** · 修订记录 + 自检段齐 · 与主 design 的双向查询点（§2.3 登记表）在 §9.7 挂钩 |

**v1.1 均分 = 9.69** ⇒ 达门 ✅（9.7+9.6+9.7+9.7+10+9.4+9.8+9.6 = 77.5 ÷ 8）
⚠️ **窄口径自报值，已撤回** —— 现行分 = §11.3 **9.66**。

**复评 delta**：完整性 9.5 → **9.7**（Q13 决策闭合）· 可用性 9.5 → **9.7**（零待拍板项）·
边界 9.7 → **9.8**（Q13 缺口登记 + 服务端兜底路径明确）；准确性 / 一致性 / 追溯性 / 反证 / 维护性**不变**
（**反证如实保持 9.4**：被否决选项按用户口径不入档 ⇒ 不因本轮而升）。

### 11.2 自检发现与处置（首稿自检当场处置 6 项 + 未决 1 项）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **F1** | 🔴 | §4.3 段② · §2.1 Q7 ③ | **「PRIVILEGED 标签的 × 禁用」在现状契约下不可判定**：chips 来源 = 资产详情 `labels[]`，而 `labelsOfAsset` 返回 **`string[]`（仅 slug，不含 `type`）**（`labels/service.ts:573`）⇒ UI 无从知道哪个已挂标签是 PRIVILEGED | ✅ **已闭合（Q13 = A，2026-09-18 用户拍板）**：本批不做特判（× 一律可点 · 服务端拒绝 ⇒ toast 码文案）；**缺口登记 → M4b-6** —— ⚠️ **v1.7 更新**：**Q14 = B** 后 `labels` 携带 `type`（§5.1 ⑦）⇒ 该缺口**技术上已可在本批闭合**（非超管 ⇒ PRIVILEGED 的 × 可精确「禁用 + 说明」）；本批**默认仍按 Q13 = A 口径**，是否升级为精确禁用 **待用户拍板**（登记） |
| F2 | 🔴 | §5.1 ③ | 漏写 **`loadAssetItemMeta` 批注入**步骤 ⇒ `latestVersion`/`latestName` 全 `null`，六列「资产名」「版本」列退化 | ✅ **已补**（§5.1 ③ 第 3 步 + 写明漏掉的后果） |
| F3 | 🔴 | 头部 Status | 首稿误写「**定稿** + 用户已批准」（**未发生的事实**） | ✅ **已改**「待用户确认（初评）」 |
| F4 | 🟡 | §5.1 ① | 原写「新建 `ListAssetsOptions`」，实为**既有接口**（`service.ts:30-38`，`limit`/`offset` **必填**）⇒ 应「增量扩两字段」 | ✅ **已改**并补条件组装 / 返回值口径（裸 rows） |
| F5 | 🟡 | §6.3 | 「本批后 34 键」是**推算值**（28 实测 + 新增）却按已证口吻写 | ✅ **已标**「实现期实测回填，不视为已证值」 |
| F6 | 🟡 | §5.2 | 非目标清单漏「me 面不暴露 `type`/`label` 过滤」⇒ 最小面未声明 | ✅ **已补** |
| F7 | ⚪ | §4.1 | 三卡取数未写明「我的资产卡 `total` 口径 = **我名下全集**（含 HIDDEN/ARCHIVED）」 | ✅ **已补**（数据源列显式标注） |
| **F8** | 🟡 | §6.3 | **`label.access_denied` 未在 `errors` 组**（实测：`errors` 现 **28 键中无任何 `label.*` 码**）⇒ Q13 = A 的服务端兜底路径**无法本地化 toast** | ✅ **已补**（`errors` +7 码；并回改 §2.1 Q10 C · §3.2 #7 · §6.3 · §8 四处计数口径） |

**F1 处置后的登记（Q13 = A）**

- **本批口径**：chips 的 × **一律可点**；非超管移除 PRIVILEGED 标签 ⇒ 服务端 **`label.access_denied`** ⇒ **toast 显示码文案**
- **缺口与归属**：精确的「× 禁用 + 说明」需资产详情返回标签 `type` —— **登记 → M4b-6**（标签治理批 · 标签面契约的天然归属批）
- **依据**：本批「不动后端优先」；为单个禁用态做契约扩张收益不成比例
- **连带**：本项引入 `errors` 补码 **1 个**（`label.access_denied`）⇒ §6.3 由 +6 改 **+7**

### 11.3 换靶复核（v1.2 · 2026-09-18 —— **不重复上轮角度**）

> 换靶角度：**⑥ 引用语义回读**（`file:line` 打印真码逐条比对）· **⑪ 机制声明的实测复核**（件 props 是否真支持我声明的用法）·
> **⑦ 同一量跨节对照** · **跨批契约承接检查**（本仓既有批已修的缺陷，本批是否复现）。**不做**上轮已做的自检项。

| # | 严重度 | 位置 | 新发现 | 处置 |
|---|:------:|------|--------|------|
| **F9** | 🟡 | §2.3 分页行 · §4.2 | **跨批契约漏承接**：`Pagination` 须**仅 `total > limit` 时渲染**（M4b-3 批 design §4.4.1 口径；该「1 / 1 空控件」缺陷已在 M4b-3 T6 修过）—— 本批原稿未承接 ⇒ 会复现 | ✅ **已补**（§2.3 分页行标 ★ + §4.2 指向唯一口径） |
| **F10** | 🟡 | §2.3 分页行 · §4.2 | **双语义换算点未写明**：组件 props 吃 `offset`，URL 用 `?page=`（实测 `Pagination.tsx:33-41`）—— 原稿只写「换算」，实现者易直传 `page` | ✅ **已补**（写出公式 + 先例 `CenterPage.tsx:238-240`） |
| **F11** | 🟡 | §5.1 ③ | **me 面 schema 上限口径缺失**：公开面 `listQuerySchema` 实为 `limit 1..100 default 20` · `offset ≥0` · `q` trim 1..**100**（`http/assets.ts:75-83`）—— 原稿只写默认值 | ✅ **已补**（逐项对齐上限；并注明 `request.invalid` 为已落码 `validate/base.ts:32`） |
| **F12** | 🟡 | §2.3 官方件表 | **件能力声明失真**：`console/Drawer` **无宽度 prop**、560 已**硬编码在件内**（`Drawer.tsx:40`）—— 原稿写「覆盖为 `sm:max-w-[560px]`」会误导实现者去改件 | ✅ **已改**（标明「零改动，勿再覆盖」） |
| **F13** | ⚪ | §5.1 ③ | `requireAuth()` 落点未引（实现者需知 `principal` 从哪来） | ✅ **已补**（`http/auth-middleware.ts:96`） |

**换靶实测通过项**（非缺陷，留作证据）：`request.invalid` 为已落码且 `errors` 组有文案 · `assetItem` 14 字段含 `type`/`status`/`latestVersion` ⇒ 六列数据源齐 ·
`labelsOfAsset` 返 `string[]`（F1/Q13 的判定前提**复核成立**）· `DataTable` 的 `rowActions(row)` / `FilterBar` 的 `statusOptions`+`q` / `ConfirmDialog` 的 `requireReason` 三件 props 与用法声明**逐项吻合**。

**复评（换靶口径 · 修前 → 修后）**

| 维度 | 修前 | 修后 | 依据 |
|------|:----:|:----:|------|
| 标准 1 完整性 | 9.7 | **9.7** | 13 项 findings 全闭合后无已知缺口 |
| 标准 2 准确性 | 9.5 | **9.6** | `Drawer` 宽度等件能力声明按真码订正 |
| 标准 3 一致性 | 9.5 | **9.6** | 补承接 M4b-3 的 `Pagination` 渲染口径 |
| 标准 4 可用性 | 9.6 | **9.7** | 换算公式 + 渲染条件定死 ⇒ 实现零猜测 |
| 深度 1 追溯性 | 9.9 | **10** | 补 `requireAuth` 落点 |
| 深度 2 反证 | 9.4 | **9.4** | 不变（被否决选项按用户口径不入档） |
| 深度 3 边界/风险 | 9.6 | **9.7** | 空控件边界已承接 |
| 深度 4 维护性 | 9.6 | **9.6** | 不变 |
| **均分** | **9.60** | **9.66** | ≥9 ⇒ **达门** ✅ |

### 11.4 原型轮换靶复核（v1.7 · 2026-09-18 —— **角度 = 原型可点性 / 权限矩阵 / 依赖完整性**）

> 换靶口径（同 v1.2）：**不重复上轮角度**。本轮检验的是「**原型做出来后，规格是否自洽**」——
> 即：UI 已按 R1–R23 改过，文字规格有没有跟上；跨面依赖有没有写全；权限矩阵有没有对着真码。

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **F15** | 🟡 | §4.4 | 「危险操作 → `ConfirmDialog`」的**适用面**随管理区迁移后未更新（读起来仍像抽屉内动作） | ✅ **已改**：明确「确认框统一出自详情页管理区（§4.6），抽屉内零确认框」 |
| **F21** | 🟡 | §4.6 | **卡层显隐**与**动作层显隐**混为一谈 ⇒ 「访客看到一张空管理卡」这种边界未定义 | ✅ **已补**：整卡无可见动作 ⇒ **整卡不渲染**；仅「有可见动作 + 个别禁用」才用「禁用 + `title`」形态；`admin.noPermission` 仅用于降级场景 |
| **F22** | 🔴 | §5.1 ⑦ | 只写了 `http/me.ts` 侧落点，**漏公开详情面调用点**（`http/assets.ts:294` 一带）⇒ D7 会在「详情面仍返 slug」时复发 | ✅ **已补**第 5 落点（详情路由传入 labels） |
| **F23** | 🟡 | §4.6 | star 未落地时三处 UI 的**降级口径**未定 ⇒ 可能上线恒为 0 的「死数」 | ✅ **已补**：star 批未落地 ⇒ **三处一律不渲染**（不显示死数）；落地后按 §4.2/§4.3/§4.6 补回 |
| **F24** | ⚪ | `docs/smoke/2026-09-18-m4b4-personal-b.md` | 证据文件缺「**原型评审**」节（R1–R23 结论 + 用户实机确认记录） | ✅ **已补**（该文件新增 §原型评审） |
| **F25** | ⚪ | §3.1/§3.2 | 件表新增 4 件（`AssetAdminCard` / `LabelCard` / `asset-stats` / `asset-permissions`）后，**与 plan Task 的一一映射**尚未同步 | ✅ **已同步**（批 plan **v0.7** 新增 Task 12–14 覆盖详情页改造与共用件） |

**顺带实证（反证 3 条 · 防误报）**
- `labels` 元素类型 `string → object` 的仓内消费者 **仅 1 处**（`AssetDetail.tsx:200-208`，正被本批修）；`apps/cli` 与 `packages/protocol` **0 命中**（grep 实证）
- `SkillSummaryResponse` **无 `labels` 字段**（skillhub 列表不带标签）⇒ 「列表带标签」属**有意扩展**，非对齐项
- skillhub `skill` 表 **含 `star_count integer` 冗余列**（+ `download_count` / `rating_*` / `subscription_count`）⇒ 「star 用冗余列」有**自有规范 + 对标实现 双证**

**维度复评（v1.7）**

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.7** | 新增 §2.1d（R1–R23 + 依赖登记）· §4.6（管理区规格 + 权限矩阵）· §5.1 ⑦（labels 形状）· §6.4（market 补键）· §9.3 G1–G15 |
| 标准 2 准确性 | **9.7** | 权限矩阵**逐条对服务端真码守卫**（`PATCH/status` `assertManageable` · `canYank` 仅 ADMIN · 删版本状态门分治）· skillhub 对标实测（`SkillSummaryResponse` / `SkillLabelDto` / `skill.star_count`）· 兼容面 grep 实证 |
| 标准 3 一致性 | **9.7** | 列表 9 列 / 抽屉纯预览 / 详情页管理区**三处口径互指且无重复定义**；作废项逐条留痕（`⋯` 菜单 · 共享动作集 · 四段抽屉 · `menu.*` 键） |
| 标准 4 可用性 | **9.6** | 实现者照抄：列集合 / 抽屉段 / 管理区矩阵 / 键表全定死；**扣分 = 2 项留待拍板**（动作层显隐取「渲染 or 禁用」· PRIVILEGED 是否升级精确禁用）+ 1 项外部依赖（star 批） |
| 深度 1 追溯性 | **10** | 每条留 R 编号 + 用户原话；对标结论带文件与字段名；权限矩阵带端点与守卫函数名 |
| 深度 2 反证 | **9.5** | 升 0.1：本轮新增 3 条**反证实证**（消费者 grep · skillhub 负例 · 冗余列正例）；被否决选项仍按用户口径**不入档** |
| 深度 3 边界/风险 | **9.7** | 新增边界：整卡显隐 · star 降级 · 兼容面收敛 · 具名依赖（star 批 / M4b-8 / M4b-5）逐条登记 |
| 深度 4 维护性 | **9.6** | 段名沿革与作废留痕可追溯；共用件（`LabelCard` / `asset-stats`）防三处漂移；§6 键表可直接落码 |

**v1.7 维度表实测均分 = 9.6875 ≈ 9.69**（9.7+9.7+9.7+9.6+10+9.5+9.7+9.6 = 77.5 ÷ 8）⚠️ **本条自报 9.66 系沿用旧值的算错**
（未自算）⇒ 已于 §11.5 换靶轮**撤回该值**并重新打分（现行分见 §11.5）

### 11.5 落档一致性换靶复核（v1.7a · 2026-09-18 —— **角度 = 事实一致性（行数 / 行号 / 跨文档数字）**）

> 换靶口径（同前）：**不重复上轮角度**。本轮只问两件事：① 文档里的**可实测事实**（文件行数、`file:line` 引用、跨文档数字）
> 是否与真码一致；② **同一口径**在五份文档里是否处处一致（主口径改了 ⇒ 正文散点有没有跟上）。

| # | 严重度 | 位置 | 新发现（实测） | 处置 |
|---|:------:|------|---------------|------|
| **F26** | 🟡 | §1.2 可复用件表 | **`DataTable` 行数过期**：文档写 `133 行`，`wc -l` 实测 **139**（本批加性 prop 已落 ⇒ 净 +6）。同批核对的其余 5 项（`assets.ts` 828 · `service.ts` 243 · `Dashboard.tsx` 73 · `useMarketQuery.ts` 104 · `AssetDetail.tsx` 287）**全部吻合** ✓ | ✅ **已修**（改 `139`，并注明含本批加性 prop） |
| **F27** | 🔴 | 批 design §1.3/§2.2/§7 · 批 plan §1/T7/T8/T9/T11/§8 | **正文散点旧口径 20 处**（「六列」「四段抽屉/状态治理·标签挂载·版本管理·危险区」「`⋯` 行菜单」「T1-T11」「G1–G13」）—— 主口径已在 §4.2/§4.3/§4.6 改写，**但散点未跟** ⇒ 实现者按 §1.3/T7 照抄会**做回旧形态** | ✅ **已修（14 处文档编辑）**：批 design 6 处 + 批 plan 7 处（**含 T7 步骤 1「六列→九列」与 T8 步骤 9 行菜单作废**）+ 证据文件 1 处；§2.1c/§11.1 等**历史节**加「现行口径见 §4.2/§4.3/§4.6」指针，**不追改历史** |
| **F28** | 🔴 | 主 design §2.3 批件登记表 | M4b-4 **两行**仍写 `v0.1 / T1-T11 / 件规格（新建 9）/ G1–G13`、「我的资产六列」「抽屉四段」⇒ **登记表是全批唯一索引面**，错值影响面最大 | ✅ **已修**（`v0.7 / T1–T14 / 新建 12 / 改造 11+2 文档 / G1–G15` · 补「详情页 owner 管理区」「`labels` 结构体」）+ 头部删 v1.49 历史行（头部口径 1-2 版） |
| **F29** | ⚪ | 证据文件 §3/§8 | G6 仍写「六列齐」· 出口件② 仍写 `T1-T11` | ✅ **已修**（九列 / T1–T14） |
| **F30** | 🟡 | §11.4 | **均分算错**：维度表 8 项实为 77.5 ÷ 8 = **9.6875 ≈ 9.69**，却自报 **9.66**（沿用旧值未自算） | ✅ **已修 + 撤回**：§11.4 末段订正为 9.69 并声明撤回；**现行分按本轮重新打分 = 9.66（依据不同，见下）** |

**换靶实测通过项（非缺陷 · 留作证据）**：`file:line` 引用 **5/5 吻合** —— `assets/manage.ts:19`（`canManageAsset` 定义）·
`http/labels.ts:66`（`accept-language` 首段）· `AssetDetail.tsx:200-202`（labels chips）· `http/assets.ts:291-294`（详情路由 +
`assertAssetReadable` 调用点）· `labels/service.ts:573`（`labelsOfAsset` 返 `string[]`）。

**维度复评（v1.7a · 现行）**

| 维度 | 分数 | 依据（含本轮变动） |
|------|:----:|------|
| 标准 1 完整性 | **9.7** | 段骨架 / 决策 / 件表 / 服务端 / 键表 / 验证口径齐 |
| 标准 2 准确性 | **9.7** | 本轮行数 6 项核对（1 项过期已修）+ 行号 5/5 吻合 + 对标实测 |
| 标准 3 一致性 | **9.6** ↓ | **本轮暴露**：主口径改写后正文散点大面积未跟（20 处）—— 修后虽一致，**同类风险未机制化** ⇒ 如实下调 9.7 → 9.6 |
| 标准 4 可用性 | **9.6** | 实现指令（T7/T8）曾含旧口径 ⇒ 已修；仍 2 项待拍板 + star 依赖 |
| 深度 1 追溯性 | **10** | 每条带 R 编号 / Q 编号 / `file:line` |
| 深度 2 反证 | **9.5** | 3 条反证实证；被否决选项按用户口径不入档 |
| 深度 3 边界/风险 | **9.7** | 具名依赖 + 降级口径 + 卡层/动作层显隐边界 |
| 深度 4 维护性 | **9.5** ↓ | **本轮暴露流程缺陷**：口径变更未做「主口径 + 全文散点扫」⇒ 下调并补纪律（见下） |
| **均分** | **9.66** | 9.7+9.7+9.6+9.6+10+9.5+9.7+9.5 = 77.3 ÷ 8 = **9.6625 ≈ 9.66** ⇒ ≥9 **达门** ✅ |

> **旧值撤回声明**：v1.7 自报 **9.66**（沿用 v1.2 值、未自算）与中间值 **9.69**（算错的维度表和）
> **一并撤回**；**现行 9.66 由本轮 8 维表独立推出**（一致性/维护性各下调 0.1）—— 数值同而**依据不同**，如实记录。

**补的纪律（本批执行期适用）**：**口径变更 = 主口径改写 + 全文散点扫**（`grep` 旧称全仓，含 plan T 步骤 / §1 目标表 / §7 总览 /
证据文件 / 跨文档登记表），并把扫描结果写进收尾回填（§9.7）。

## 12. 修订记录

| **v1.7a** | 2026-09-18 | sunxuewen-rush | **落档一致性换靶复核（用户「先检查修改并打分」）** —— ① **新增 §11.5**：角度 = 事实一致性，**F26–F30 五项**全修（`DataTable` 行数 133→**139** · **正文散点旧口径 20 处**（批 design 6 + plan 7 + 证据 1 + 主 design 登记表 4 类）· 证据文件 G6/出口② · **均分算错**）② **主 design 补 v1.51a**（§2.3 登记表口径 + 头部删历史行）③ **分数撤回 + 重打**：v1.7 自报 9.66（沿用旧值）与中间值 9.69（算错）**一并撤回** ⇒ **现行 9.66**（8 维表独立推出：一致性 9.7→**9.6**、维护性 9.6→**9.5**）④ **补纪律**：口径变更 = 主口径改写 + **全文散点扫**（写入 §9.7）⑤ 本版**零实现改动** |
| **v1.7** | 2026-09-18 | sunxuewen-rush | **可点原型评审收口（R1–R23 逐条拍板 · 用户「ui 部分差不多了」）** —— ① **新增 §2.1d 原型评审记录**：两视图原型（`/__proto/m4b4` 列表+抽屉 · `/__proto/m4b4/detail` 详情管理区）· **R1–R23 逐条处置与留痕** · **依赖登记**（star 能力 / M4b-8 发布 / M4b-5 审核 / 详情页改造归属本批）· 顺带发现 4 条（规范 vs 实现「开放协作」冲突 · owner 删版本权限小于管理档 · toast 不渲染环境问题 · skillhub 术语对标 3 处措辞差异） ② **列表 6 → 9 列**（`名称/类型/状态/标签/版本/下载/收藏/更新/操作`；类型列**去色** · 操作列 `ScanEye` 图标钮 · **去 `⋯` 菜单**）③ **抽屉改纯预览**（工具行 + 下载/收藏统计 + 描述 + 标签+-；**状态治理/版本管理/危险区整体移出**）+ 连带作废（`asset-actions.ts` 共享动作集 · `menu.*` 5 键 · Q8 A「并发 2 请求」· Q8 E 追加加载 · 条③ P3/P4/R5） ④ **新增 §4.6 资产详情页管理区**（改 M4a 已交付件）：头卡 [下载][收藏] + 右栏元信息/标签卡/管理卡 · **权限矩阵逐条对服务端真码守卫**（`assertManageable` / `canYank` 仅 ADMIN / 删版本状态门分治）· 5 档显隐 ⑤ **Q14 = B**：§5.1 ⑦ 新增「`labels` 形状升级为结构体」（对齐 skillhub `SkillLabelDto`）⇒ **D5 + D7 同批根治**，并**如实登记「skillhub 列表不返标签 ⇒ 本批为有意扩展」** ⑥ 件表 **新建 12 / 改造 11 + 2 文档**（+`AssetAdminCard`/`LabelCard`/`asset-stats`/`asset-permissions`；`DataTable` 加性 prop `rowActionsHeader?`；`AssetDetail` 改造） ⑦ §6 i18n 键表 v1.7 口径（`action.open` 更名 · 删 6 键 · **补版本 8 态徽章键 = F14 闭合** · 新增 `admin.*`/`desc.*`/`stat.*`）+ 新增 §6.4（`market` 补 4 键） ⑧ §9.3 dogfood **G1–G15**（新增管理区权限矩阵 / 结构体渲染 / star 降级断言） ⑨ **§11.4 原型轮换靶复核**：F15/F21–F25 六项处置 + 反证实证 3 条 ⇒ **复评 9.66 持平**（完整性/反证各升 0.1 · 可用性因 2 项登记下调 0.1） ⑩ 本版**零实现改动** |
| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v1.6** | 2026-09-18 | sunxuewen-rush | **UI 逐条评审 · 条 ⑤（跨面交互约定）落档 → 5 条全闭（用户「全按推荐」）**：① **P1 分段三态**（详情失败 ⇒ 整抽屉 ErrorState；版本段失败 ⇒ **段内** ErrorState + 段内重试）② **P2 写后重取范围**（状态治理 ⇒ `invalidateCache('/api/assets')` + 详情重取 · 列表 `retryTick++` · 版本删除 ⇒ 只重取版本段；三卡计数不主动重取）③ **P3 响应式以真码为准** + 登记订正主 design §5.2/§10 ④ **P4 URL 写法沿用 `useMarketQuery` 零改动** ⑤ **条⑤ findings**：**D11** 抽屉「<1100px 全宽」vs 真码 `<640px`（登记）· **D12** SideNav「<900px 图标态」vs 真码 `<768px` 官方 Sheet（登记）· **R9** 版本 `REJECTED` 徽章仍红（与去红范围不冲突，全站去红归 M4b-7）⑥ 新增**防误报自证 1 条**（`errors` 28 键 —— 正则漏算 `network`/`unknown`，逐行回读纠正）⑦ **五条评审全闭**：累计 findings **D1–D12 + R1–R9**（🔴 2 = D1 已修 / D7 登记）⑧ 下一步 = **抽屉可点原型**（`/dashboard/__proto/m4b4`）⑨ 本版**零实现改动** |
| **v1.5** | 2026-09-18 | sunxuewen-rush | **UI 逐条评审 · 条 ④（壳与导航）落档（用户「按推荐来」）**：① **P1** 顶栏 `<h1>` 与页内 `PageHeader` **同字重复** ⇒ 本批照 M4b-3 先例保留页头标题（不动已交付件），**登记为全站议题 → M4b-7 统一** ② **P2** 页内不加「返回工作台」/面包屑 ③ **P3** `DEV_BATCH` **只删本路由表项、机制保留** ④ **P4** M4b-8「发布」入口**本批不动、仅留指认** ⑤ **条④ findings**：**D9** `TopBar.titleOf` 的 `section` 死数据（8 赋值 / 0 消费，登记 → M4b-7）· **D10** `TopBar.tsx:47-49` 注释过期且与主 design §11 口径相抵（登记）· **R8** 零 `document.title`（登记，非本批）⑥ **新增实测反证 2 条**（无父子双高亮 · `titleOf` 匹配顺序不误配 —— 真码回读）⑦ 本版**零实现改动** |
| **v1.4** | 2026-09-18 | sunxuewen-rush | **UI 逐条评审 · 条 ② ③ 落档（用户「按推荐来」）**：① **条②（我的资产六列）拍板 P1–P4**（v1.3 行已记，本行补其 findings 归属口径）② **条③（资产管理抽屉）拍板 P1–P4**：chips 文案 = **候选表 join `displayName`**（回退 slug）· `Popover`+`Command`（**实测零消费者**）**进可点原型定稿**（`/dashboard/__proto/m4b4`，物料不进仓）· 段④ 判定为**提示性守卫**（已加载页 + 服务端 400 兜底）· 段② 无确认维持 ③ **条③ findings 5 项**：**D6** 分页×删除守卫判定缝（登记）· **D7 🔴** 门户详情页**标签 chips 文案为空**（既有缺陷，登记 → M4b-6 / 待指令）· **D8** yank 不占位 vs 删除禁用易混（登记）· **R5** `changelog=null` ⇒ `—`（助手判断，已落 §4.3）· **R7** 抽屉切换 abort（并入 §4.4）④ §4.3/§4.4 + 件表口径同步 ⑤ 本版**零实现改动** |
| **v1.3** | 2026-09-18 | sunxuewen-rush | **UI 逐条评审 · 条 ① 落档（用户「按推荐来」）**：① 新增 **§2.1c UI 逐条评审记录**（方法 = `ui-design-review-walkthrough`；清单公式 页面 × 壳 × 跨面；逐条四段式）② **条①（工作台三卡）拍板 P1–P4**：补两封装（**新建 8 / 改造 11**）· 保留 3 卡 · 审计卡行内空态 · `loading` 整块骨架 ③ **条① findings 5 项**：**D1** 件表漏项 🔴（已随 P1 修）· **D2** 线框「含2隐藏」与 U4 拍板冲突（登记 → 收尾订正）· **D3** §7.3 过期引用（登记）· **R1** 请求数断言须排壳层（并入 G2）· **R2** 审计数据缺口（并入 §9.5）④ §3.1/§3.2 件表 + §9.5 造数 + §9.7 收尾项同步 ⑤ **条②（我的资产六列）拍板 P1–P4**：类型列 = `TypeIcon`(16px) + `--type-*` 方底（尺寸随原型定）· **抽共享动作集 `components/console/asset-actions.ts`**（列表与抽屉同一 3×2 矩阵，**件表 新建 8 → 9**）· 本批照 `?page=`（参数族差异登记）· 空态沿用「是否有生效筛选」判据 ⑥ **条② findings**：**D4** 线框与 U5/Q6 三处不符（登记 → 收尾订正）· **D5** `AssetItem.labels` 类型谎言（**既有缺陷**，登记 → M4b-5/6 触碰时修）· **R3** 参数族差异 · **R4** 横向滚动实测口径 ⑦ 本版零实现改动 |
| **v1.2** | 2026-09-18 | sunxuewen-rush | **换靶复核 5 项（用户要求「先检查并打分」）**：① **F9** 补 `Pagination` **仅 `total > limit` 渲染**（跨批契约漏承接 —— M4b-3 已修过的「1 / 1 空控件」缺陷本批原会复现）② **F10** 补 `?page=` ↔ 组件 `offset` 的**换算公式 + 先例** ③ **F11** 补 me 面 schema **上限口径**（限 1..100 / q ≤100）④ **F12** 订正 `Drawer` 宽度措辞（560 已硬编码在件内、**无宽度 prop**，本批零改动）⑤ **F13** 补 `requireAuth()` 落点 ⑥ **撤回旧分**：上轮自报 **9.69** 系**窄口径**产物（未做 `file:line` 语义回读与跨批承接检查）⇒ 换靶口径下修前 **9.60**、修后复评 **9.66**（见 §11.3）⑦ 本版零实现改动 |
| **v1.1** | 2026-09-18 | sunxuewen-rush | **Q13 闭合 → 定稿（用户拍板 A）**：① **Q13 = A** —— 本批**不做 PRIVILEGED 的 × 禁用特判**（详情 `labels[]` 只返 slug 不可判定 type）；非超管移除 ⇒ 服务端 **`label.access_denied`** ⇒ toast 码文案；精确禁用 **缺口登记 → M4b-6**。落点：§2.1 Q7 ③ · §4.3 段② · §11.2 F1 ② **连带补码**：`errors` **+6 → +7**（新增 `label.access_denied` —— 实测 `errors` 现 28 键中**无任何 `label.*` 码**）；口径同步 §2.1 Q10 C · §3.2 #7 · §6.3 · §8 四处 ③ 8 维**复评 9.69**（初评 9.63 → 完整性 / 可用性 ↑，delta 见 §11.1）④ 状态转 **定稿**；本版**零实现改动** |
| **v1.0** | 2026-09-18 | sunxuewen-rush | **首稿 + 自检修订**：① 立项对齐产物落档（§1 批界与 14 条真码现状 · §2.1 **Q1–Q12 决策表** · §2.2 跨批契约引用 · §2.3 官方件装配）② 页面规格（§4）· 服务端改动规格（§5，含现状代码与改法）· i18n 逐键表（§6）· 接口变更总览（§7）· UI-UX 变动（§8）· 回归与验证口径（§9，含 dogfood **G1–G13** / 造数 / 规范同步 / 收尾回填）③ **首稿自检处置 6 项**（§11.2：F2 补 `loadAssetItemMeta` 批注入 · F3 撤未成事实的「定稿/已批准」 · F4 接口改为增量扩字段 · F5 推算值标注 · F6 补非目标 · F7 补卡口径）④ **未决 1 项** = **F1**（PRIVILEGED × 禁用不可判定）待用户拍板 ⑤ 本版**零实现改动** |

