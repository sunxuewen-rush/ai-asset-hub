# M4b-6 治理批：管理看板 + 资产管理 + 标签定义 + 审计日志 —— 批设计

> Date: 2026-09-23
> Updated: 2026-09-23（**v0.31：F207 顶栏标题漏项 —— 用户拍板「甲」：顶栏回归官方 block 形态** —— ① 撤除 `TopBar` 自造 `titleOf` 路由表（官方 `registry:ui` **无** header/topbar 件；顶栏仅存在于 block 示例源码且标题**写死** ⇒ 官方无「路由 → 标题」机制）② §9.3 追加 dogfood **G13**（14 路径「顶栏无 `h1` 且内容区有标题」+ 1 聚合 = 15 条）⇒ §9.7 分组 PASS **56 → 71** ③ §9.7 追加 **F207** ④ §9.4 验收清单补「顶栏形态 + 页内标题」⑤ 主 design **v1.67** 同步（§2.4 U1 / §4 顶栏行 / §10 变更清单 / §12 线框）。**本版零服务端改动**）
> Updated: 2026-09-23（**v0.30：F206 侧栏激活唯一性修缮（用户报缺陷）** —— ① 激活判定由「`EXACT_MATCH_PATHS` 精确 + 其余前缀」收敛为**路径精确相等**（`SideNav.tsx` 删集合 · 门户 `<NavLink>` 补 `end`）② §9.3 追加 dogfood **G12**（13 导航路径 + `/search` 零态 + F206 回归专条 = **15 条断言**）⇒ §9.7 分组 PASS **41 → 56** ③ §9.7 追加 **F206**（含正反双证）④ §9.4 验收清单补「侧栏激活唯一性」。**本版零设计语义改动** —— 口径取代 M4b-2/M4b-3 文档中的 `EXACT_MATCH_PATHS` 表述）
> Status: **定稿**（**2026-09-23 用户批准**）· **实现已落地（T1–T10 · 2026-09-23）**—— 8 维 **9.50** · 换靶 5 轮 + grilling 4 轮 · 门槛项已清空 · 已回填 `docs/00` §5（v1.89）与主 design §2.3（v1.65）；后续实现以批 plan 为准
> Scope: 本批 = `docs/00` §5「M4b-6」行（治理批四项交付物）· 服务端改动 **8 项**（见 §7）：4 个只读端点新建 + 2 处出参扩 + 1 处语义收紧 + 1 张表/写入（实现期）
> 引用链: 上游主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（拍板表 / 页面职责矩阵）· 规范 `docs/05` §6（角色）· `docs/06`（label 两级树）· `docs/08`（数据模型）· 前序批 M4b-5 `docs/designs/2026-09-21-m4b5-review-workbench-design.md`

## 1. 背景与批界

### 1.1 位置与依赖链

M4b（管理后台）拆八批中的第 6 批，前序 M4b-1…M4b-5 已交付（壳/认证/提交与令牌/个人面/审核台）。
本批 = **治理面**：把 M4b-2 只落了**占位条目/占位页**的四处换成真页面（管理看板 `/admin` · 标签定义 `/admin/labels` ·
审计日志 `/admin/audit`）+ 新增一处侧栏子项与读面（资产管理）。依赖：M4b-5 的审核台（看板「待审」与之同源）、
`docs/06` 标签模型（M4b-4 已落标签挂载面）。

### 1.2 入口现状（真码实测，2026-09-23）

| 事实 | 证据（`file:line`） |
|---|---|
| `/admin` 恒重定向到 `/admin/reviews`（真页，M4b-5 交付） | `apps/web/src/main.tsx:121` |
| `/admin/labels` 与 `/admin/audit` 是**占位页**，`DEV_BATCH` 标 `M4b-6` | `apps/web/src/main.tsx:61-62`、`:125-142` |
| `/admin` 与 `/admin/*` 守卫 = `ROLE.ADMIN` | `apps/web/src/main.tsx:75` |
| 侧栏「管理」组（gate `ROLE.ADMIN`）= 管理看板（**占位**：无 `to` ⇒ 轻提示）/ 审核管理 / 审计日志 | `apps/web/src/components/ui/navItems.tsx:104-121` |
| 侧栏「超管」组（gate `ROLE.SUPER_ADMIN`）= 标签定义 / 系统设置 / 用户管理（后两项占位） | `apps/web/src/components/ui/navItems.tsx:125-131` |
| i18n `admin` 组现有键：`reviews` / `audit` / `labels` / `users` / `settings` / `empty` | `apps/web/src/i18n/zh.ts:302-309`（`en.ts` 同构） |
| 服务端已有只读面：`/api/stats`（匿名公开统计，首页 hero 用）、`/api/audit` `GET /`、`/api/labels` `GET /` + `GET /all` | `apps/server/src/http/stats.ts:11`、`http/audit.ts:47`、`http/labels.ts:66,73` |
| 服务端**无** `/api/admin/*` 任何端点 | `grep -rn "api/admin" apps/server/src` ⇒ 0 命中；路由注册表见 `apps/server/src/app.ts:123-211` |
| 迁移序号已用 **0000–0013** ⇒ 新增迁移从 **0014** 起 | `ls apps/server/drizzle/*.sql` 末位 `0013_good_wolverine.sql` |
| 官方件目录内 **36 个 `.tsx`**（含本轮 PoC 新引入的 `chart.tsx` / `combobox.tsx`，**尚未跟踪**） | `ls apps/web/src/components/ui/shadcn/*.tsx \| wc -l` ⇒ 36（`chart.tsx` 373 行 · `combobox.tsx` 282 行） |
| 看板 PoC 物料（**不进仓**）：`DashboardProto.tsx` 1047 行 + 真库数据 2062 行 | `apps/web/src/pages/__proto/`（DEV 路由 `/__proto/dashboard`） |

### 1.3 批界

**In（本批交付）**
1. 管理看板 `/admin`（真页面 + 真数据；侧栏「管理看板」占位条目转真链接）
2. 标签定义 `/admin/labels`（两级树 CRUD + zh-CN/en 翻译 + 行内上/下移 + 上限提示）
3. 审计日志 `/admin/audit`（多维过滤 + `action` 分组下拉 + 官方 `Calendar` 日期区间）
4. 资产管理 `/admin/assets`（全站资产治理列表；侧栏「管理」组新增子项）
5. 服务端：**8 项改动**（编号 SSOT = §7 表 `#` 列）：改动 1–3 只读端点新建（`/api/admin/overview` · `/rankings` · `/trends`）· 改动 4 `/api/assets` 扩参（管理档全站资产）· 改动 5 `download_event` 表 + 写入（实现期）· 改动 6 `GET /api/audit/actions` · 改动 7–8 标签定义面（`/api/labels/all` 出参扩 + `DELETE` 有挂载拦截）

**Out（不在本批）**
1. 标签定义的**资产侧挂载交互**（已在 M4b-4 交付，本批只做定义面）
2. 审核动作与详情面（M4b-5 已交付）
3. 用户管理 / 系统设置（仍占位，归属后续批）
4. 下载数据**历史回填**（表建成前的存量无法追溯 —— 见 §5.2 已知局限）

## 2. 拍板结果（本批）

> 口径：只记**拍板结果**；被否决方案不入档（用户口径「污染」）。看板面全部来自 2026-09-22/23 两轮 PoC 观感评审（用户逐轮口头拍板）。

### 2.1 本批全部拍板结果（看板形制 + 三页交互 + 通用 · 用户逐轮拍板）

| # | 决策 | 结果 |
|---|---|---|
| D1 | 看板内容清单 | 4 张数字卡 + 趋势图 + 排行榜 + 英雄榜 + 4 项创意小卡 |
| D2 | 数字卡 | 已发布资产 / 累计下载 / 待审 / 有效用户（各带副行 hint） |
| D3 | 趋势口径 | **累计**资产数 / 累计下载数（**不是**每日量） |
| D4 | 趋势形制 | 官方 `Area Chart - Interactive` 形态，但**拆成两张独立小图**（各自纵轴）—— 两条序列量级差约 50 倍，同图会把小的一条压成贴底直线 |
| D5 | 趋势时间范围 | 近 7 天 / 近 30 天 / 近半年 / 近一年，**两张小图共享一个选择器**（同信息只放一处） |
| D6 | 排行榜控件 | **单卡**：卡头固定「排行榜」+ 紧右 **Top N Combobox**；右上**三个口径按钮「人 / 标签 / 资产」**，按钮下**不显示数字** |
| D7 | Top N 值域 | Top 10 / 20 / 50 / 100，**实际条数不足按实际条数展示** |
| D8 | 排行榜图型 | 官方 `Bar Chart - Interactive`（竖向柱，无 Y 轴） |
| D9 | 轴标签口径 | 「人」= **工号 + 姓名**（`59901001 张伟`）；「标签」= 标签名；「资产」= 资产名（超 12 字截断）；全名走 tooltip |
| D10 | 轴标签密度 | 站得下水平排 → 站不下 **45° 斜排** → 斜排仍站不下才抽稀（三级策略，宽度按容器实测） |
| D11 | 英雄榜 | **两张卡**（资产榜 / 员工榜），官方 `Bar Chart - Custom Label`：横条 + 柱内名称 + 柱外数值，两条坐标轴全隐藏 |
| D12 | 英雄榜 footer | **不放**（官方示例那行是「本月涨 X%」结论，本页不放结论） |
| D13 | 类型数量 | 官方 `Radial Chart - Label` **同心环**（`endAngle=270` · 内→外 = 小→大 · 环内不放字 · 名字与数量进自绘图例，降序） |
| D14 | 类型下载热度 | 官方 `Radar Chart - Dots`；**图上与图下都不放数字**，数值走 tooltip |
| D15 | 创意四项 | 平均审核时长 / 下载集中度 / 标签覆盖度 / 沉睡资产 |
| D16 | 下载曲线数据源 | **B = 新增「下载事件表」**（1 迁移 + 下载端点写一行 + 趋势查询读它）；**本批仅入设计，实现期落**（用户 2026-09-23 拍板「下载事件先写进 design」） |
| D17 | 管理档门槛 | 看板 / 资产管理 / 审计日志 = `role >= 10`；标签定义 = `role >= 100`（超管） |
| D18 | 数据源形态 | 服务端 3 个**只读**端点（`overview` / `rankings` / `trends`），前端不直连库 |
| D19 | 资产管理读面 | **复用 `GET /api/assets` 增量扩参**：加 `status`（`ALL\|ACTIVE\|HIDDEN\|ARCHIVED`）与 `owner`，**仅管理档（`role >= 10`）生效**；无参调用 = 现状 `ACTIVE` 面（门户零变化）；**非管理档传入 ⇒ 静默忽略**（不报错、不泄露存在性） |
| D20 | 资产管理页形态 | 列（8）= 资产（名称 + slug）/ 类型 / 状态 / 归属人 / 最新版本 / 下载数 / 更新于 / 操作；过滤 = `q` · 状态 · 类型 · 标签 · 归属人；行内**只留「查看」**（管理动作集中在详情页管理区）；`offset` 分页沿用仓内 `DataTable` 口径 |
| D21 | 页面命名 | 侧栏条目与页面标题统一为「**审计日志**」（`admin.audit` 现值）；`docs/00` §5 / `docs/05` 的「审计浏览」措辞随本批收尾同步 |
| D22 | 过滤区布局 | 常显 = `action` **分组下拉** + 时间区间（官方 `Calendar` ⇒ `from`/`to`）；其余 5 维（`targetType` / `targetId` / `actorId` / `requestId` / `clientIp`）收进「更多筛选」折叠 |
| D23 | `action` 下拉数据源 | **新增只读端点 `GET /api/audit/actions`**（返按前缀分组的动作全集，服务端单源；前端不双写清单） |
| D24 | 表格与详情 | 列 = 时间 · 动作 · 操作者 · 目标（`targetType:targetId`）· 来源 IP · 请求 ID；行内**只留「查看」**⇒ 详情用既有 `Dialog`/`Sheet` 展示 `detail` JSON + `userAgent`；`action` 列显示**原始串**（可对代码追溯） |
| D25 | 日期区间 | 默认**近 7 天** + 快捷项〔今天 / 近 7 天 / 近 30 天 / 自定义〕 |
| D26 | 标签上限提示 | `GET /api/labels/all` 出参扩为 `{ items, total, limit }`（`limit` = `LABEL_MAX_DEFINITIONS` env 现值）⇒ 页头显示「已用 N / 上限 M」，**不由前端硬编码** |
| D27 | 删标签语义 | 服务端补「**有挂载则拒绝删除**」（新错误码 `label.in_use` ⇒ 400，与既有 `parent.has_children` 同族）+ `GET /all` 每条带**挂载数** ⇒ 前端二次确认显示「已挂载 N 个资产」；`asset_label` 的级联清挂载**不再可被误触** |
| D28 | 树操作与排序 | 行内 **↑↓** 移动（`docs/00` 已定）+ 一次 `PUT /order` **批量提交**（不逐条 PATCH） |
| D29 | 翻译编辑 | 两栏 inline（zh-CN / en），保存 = **整组替换**（`docs/06` v1.4 语义）；en 缺失时列表按服务端回退（`Accept-Language → en → slug`）展示 |
| D30 | 创建/编辑表单 | slug（创建后禁改）· type（`RECOMMENDED` / `PRIVILEGED`，选 `PRIVILEGED` 提示「仅超管可挂载」）· 父级（仅一级标签）· **`visibleInFilter` 开关（创建与编辑对话框均有 · 默认打开）** · 翻译两栏；`sortOrder` 由 ↑↓ 决定、表单不填。**v0.23 定**（U12 闭环）：开关放回创建 + 编辑对话框、**默认打开**（列 `default true` ⇒ 零服务端改动） |
| D31 | 数字卡副行去重 | 「累计下载」卡副行**不再放 Top10 占比**（与创意项「下载集中度」重复）⇒ 改为「**近 7 天新增 X 次**」（前端由 §5.1 `trends` 切片算 `cum[今天] − cum[7 天前]`，**零服务端改动**）；真库无下载事件时显示「—（暂无下载历史）」，与趋势卡下载空态一致 |
| D32 | 错误码状态映射 | 新增 `label.in_use` ⇒ **HTTP 400**（与既有 `parent.has_children`「删除被拒」同族；用户 2026-09-23 确认） |

### 2.2 承接主 design 的跨批契约（引用不复制）

| 契约 | 本批用法 |
|---|---|
| 角色 4 档线性单值（未登录 / 用户 1 / 管理 10 / 超管 100），判定一律 `role >= N` | 看板三页 `>= 10`、标签定义 `>= 100`；**不新增权限码矩阵**（已整体删除） |
| `GET /api/auth/me` ⇒ `{ user: { id, displayName }, role }` | 前端路由守卫复用既有 `AuthProvider` 三态，不新增会话面 |
| 资产可见性：资产恒公开，读面只看 `status` | 资产管理页治理语义 = **全站资产**（含 `HIDDEN`/`ARCHIVED`），与门户只读 `ACTIVE` 不同面 —— 见 §5.3 |
| label 两级树（`docs/06`）+ 挂载面已交付 | 标签定义页只做**定义**（增删改 / 上下移 / 翻译 / 上限），不复用资产挂载 UI |
| 官方件硬规则：能上官方件就用 | 见 §2.3 |

### 2.3 官方件装配与复用清单

| 件 | 来源 | 用在哪 |
|---|---|---|
| `chart.tsx`（`ChartContainer` / `ChartTooltip*` / `ChartLegend*`） | 官方 registry 厂商化（**本轮 PoC 新引入**，373 行） | 看板全部图表；本批把 PoC 版落进仓 |
| `combobox.tsx`（`@base-ui/react` 新版件） | 官方 registry 厂商化（**本轮 PoC 新引入**，282 行，新增依赖 `@base-ui/react`） | 排行榜 Top N 选择 |
| `select.tsx` | 仓内既有（官方件） | 趋势时间范围选择器 |
| `card.tsx` / `badge.tsx` / `button.tsx` | 仓内既有（官方件，官方 `CardHeader/CardDescription/CardTitle` 全套） | 全部卡片 |
| `calendar.tsx` | 仓内既有（官方件） | 审计日志日期区间 |
| `table.tsx` + 自抽 `DataTable` | 官方 `table` + 仓内自抽件（登记于主 design §4.4 映射） | 标签定义 / 审计日志 / 资产管理列表 |
| `area` / `bar` / `radial` / `radar` 图型 | recharts 3.8.0（经由 `chart.tsx`） | 见 §4.1（**本批不用 Line**：趋势形态为 Area，Line 方案已在评审中撤） |

**新依赖（已批准）**：`@base-ui/react` —— Combobox 官方新版件的底座，用户已拍板 1-B 安装；PoC 阶段已实测可用。

### 2.4 数据口径与交互默认值（grilling 轮拍板 D33–D51 · 2026-09-23）

> 口径：本轮用 grilling 技能把「看板/三页」里被默认假设的口径逐条摆上台面拍板；**事实由实现侧自查后给推荐**，决策由用户给。所有推荐均获「按推荐来」。

| # | 决策 | 结果（附实测依据） |
|---|---|---|
| D33 | 「待审」口径 | = `review_task.status = 'PENDING'` 的**任务数**（与 M4b-5 审核台同源）。⚠️ 原稿误写为 `asset.status = 'PENDING_REVIEW'` —— 实测 `assetStatusSchema = ['ACTIVE','HIDDEN','ARCHIVED']`（`db/schema/assets.ts:27`）**不存在该值**；版本级 `PENDING_REVIEW` 只存在于 `asset_version.status`（同文件 `:36`），会造成「同一资产多版本重复计」故不取 |
| D34 | 「有效用户」口径 | = `user.status = 'ACTIVE'` 的账号数；「全部账号」= `user` 行总数。**复用既有 `/api/stats.totalUsers` 同口径**（`assets/stats.ts:7,35`）—— 实现侧原推荐 `banned = false` 已**撤回**（会让同一「用户数」在 hero 与看板两处两义）；`user.status` 三态真值 = `['PENDING','ACTIVE','DISABLED']`（`db/schema/auth.ts:40`） |
| D35 | 时区与日切 | 按 **`Asia/Shanghai`** 日切（写死常量，不用请求头时区）；单测断言日切点（跨日边界样例） |
| D36 | 窗口含今天 | 近 N 天 = **N 个点**（`D-(N-1) … D`，含今天）；「近 7 天新增」= `cum[D] − cum[D-7]`（最近 7 个自然日的完整增量） |
| D37 | 趋势默认窗口 | **近 30 天** |
| D38 | 下载事件表字段 | **4 列**：`id` / `asset_id` / `version_id` / `created_at`（趋势只需 `created_at`；「按资产下载」用现成的 `asset.download_count` 故 `asset_id`/`version_id` 留作扩展）⇒ **不预埋** `user_id` / `client_ip_hash` / `source`（当前零消费者，IP 哈希另带合规成本） |
| D39 | 事件写入事务语义 | 自增与插事件**同事务**；事件写失败 ⇒ **回滚自增 + warn 日志 + 仍放行下载**（不产生「计数 +1 却无事件」的偏账，也不因统计面阻断业务） |
| D40 | 事件写入落点 | `apps/server/src/assets/download.ts` 的 `resolveDownload` 内（调用点 `http/assets.ts:826` 实测**当前无事务包裹**，需显式 `db.transaction`） |
| D41 | 标签定义权限 | 保持**超管独占**（`role >= 100`，服务端零改动）；「运营单点」风险显式登记（见 U9，后续批判评估下放） |
| D42 | 「按标签」榜计数 | **保留重复计入**（同一资产挂多标签在各标签下各计一次 = 标签热度/曝光语义），卡内给一行口径说明 |
| D43 | 平均审核时长 | `avg(reviewed_at − submitted_at)`，样本 = `review_task.status = 'APPROVED'`（两列均在 —— `db/schema/governance.ts:47,48`）；**空集显示「—」** |
| D44 | 标签覆盖度 | 分子 = 至少挂 1 个标签的 `ACTIVE` 资产；分母 = `ACTIVE` 资产数（与「已发布资产」同面） |
| D45 | 沉睡资产 | = **上架 ≥30 天且 `download_count = 0`** 的 `ACTIVE` 资产（阈值 30 天 = 端点常量；`asset` 表无「最后下载时间」列，故不用时间窗） |
| D46 | 员工榜口径 | = 该用户 **`owner`** 的 `ACTIVE` 资产数（「他名下上架了多少」）；**排除** `reviewed_by` 维度（否则语义变成审核绩效榜） |
| D47 | 审计默认动作过滤 | **全部动作**（不收窄；线框里的 `[动作 asset ▾]` 仅为示意） |
| D48 | 审计「操作者」列 | **工号 + 姓名**（与看板「人」轴 D9 同口径，可对代码/工单追溯）；无 `actor_id` 的行（登录失败等）显示 **「—（匿名）」** |
| D49 | 审计详情展示 | **全量原样**：`detail` 美化 JSON + `userAgent` + `client_ip` **完整 IP**（不打码）。依据：14 个审计写入点逐条实测，`detail` **不含凭据**（只有 `slug`/`type`/`provider`/`expiresAt`/`count`/`status` 等） |
| D50 | 看板入口化 | ① 「待审」卡 → `/admin/reviews` ② 「已发布资产」卡 → `/admin/assets` ③ 标签定义的「挂载数」列 → `/admin/assets?label=<slug>`（资产管理页接受 `label` 初值） |
| D51 | 看板刷新策略 | **仅进入页面时拉一次**（不做自动轮询，也不加刷新按钮） |
| D52 | 趋势 `downloads` 两态 | **0014 落地后一律数值**（空表 / 零下载 ⇒ `0`）；`null` 仅作「迁移未落地」过渡态 ⇒ 前端 `null ⇒「—」`、`0 ⇒ 画 0 线`（grilling R4-Q1） |
| D53 | 排行榜稳定排序 | 资产榜 `download_count DESC, asset.id DESC` · 员工榜 `ACTIVE 资产数 DESC, user.id ASC` · 标签榜 `资产数 DESC, label.id ASC`（并列不跳位，grilling R4-Q2） |
| D54 | 管理三端点缓存 | **实时查询、不加缓存**（不加特殊 `Cache-Control`）—— 低频 + 小数据量，缓存复杂度不成比例（grilling R4-Q5） |
| D55 | 审计导出 | **本批不做**（后续批按需，须走服务端流式导出）⇒ 登记 U14（grilling R4-Q6） |

> 附注：本轮同时定下 ① **定稿后立 plan**（Task 切分属 plan 层，本设计不复制 — 见 `docs/designs/README` 分层规则）② **换靶校验脚本进仓** `docs/smoke/scripts/doc-claims-check.ts`（落点见 §3.1 / §9.2 / §9.4）。

## 3. 件与路由规格

### 3.1 新建件

| 件 | 路径 | 说明 |
|---|---|---|
| 看板页 | `apps/web/src/pages/AdminBoard.tsx` | `/admin` 真页（PoC `DashboardProto.tsx` 的正式版：去 `?demo` 示意开关、接真端点）。前缀 `Admin` 用于**与门户同名页区分**（`Assets.tsx` 已存在） |
| 资产管理页 | `apps/web/src/pages/AdminAssets.tsx` | `/admin/assets`（全站治理列表） |
| 标签定义页 | `apps/web/src/pages/AdminLabels.tsx` | `/admin/labels`（占位页换真页；当前占位件见 `main.tsx:125-142`） |
| 审计日志页 | `apps/web/src/pages/AdminAudit.tsx` | `/admin/audit`（占位页换真页） |
| 前端数据层 | `apps/web/src/api/admin.ts` | 管理面只读端点的调用封装（看板 3 个 + 审计动作全集 1 个 + 标签全量） |
| 服务端看板路由 | `apps/server/src/http/admin.ts` | `createAdminRoutes({ db })` ⇒ `/api/admin/*`（改动 1–3） |
| 服务端聚合查询 | `apps/server/src/admin/overview.ts` · `rankings.ts` · `trends.ts` | 聚合语义集中在此，路由只做鉴权与出参 |
| 下载事件迁移 | `apps/server/drizzle/0014_<slug>.sql` | `download_event` 表 + 2 索引（改动 5；序号实测已用到 0013） |
| 图表件落地 | `apps/web/src/components/ui/shadcn/chart.tsx` | PoC 版转正（**当前未跟踪**） |
| Combobox 落地 | `apps/web/src/components/ui/shadcn/combobox.tsx` | 同上（**当前未跟踪**；底座 `@base-ui/react`） |
| 文档换靶校验脚本 | `docs/smoke/scripts/doc-claims-check.ts` | 与 `doc-audit.ts` 并列进门禁：引用逐条回读（`file:line` + 期望关键词）· 同一量跨节对照 · 件表↔改动号↔端点表三向一致 · 机制声明实测复核 · **UI 契约 ↔ 真码回读**（件路径存在性 / props 形态 / i18n 键覆盖）· **头部版本行不得陈旧或乱序**（既有 `doc-audit` 只查「版本行 ≤3」，对「陈旧+乱序」不设防 —— 2026-09-23 v0.15 实测发现的盲区） |

### 3.2 改造件（行号 = §5 改动号）

| 件 | 改动 | 改动号 |
|---|---|---|
| `apps/web/src/main.tsx` | `/admin` 由「重定向到 `/admin/reviews`」改为真看板；`/admin/labels` `/admin/audit` 由占位页换真页；**新增 `/admin/assets`**；清理 `DEV_BATCH` 里 M4b-6 的三条 | — |
| `apps/web/src/components/ui/navItems.tsx` | 「管理看板」占位条目补 `to: '/admin'`；「管理」组新增「资产管理」子项 | — |
| `apps/web/src/i18n/{zh,en}.ts` | 新建 `board` 组 + `admin` 组扩（见 §6） | — |
| `apps/server/src/app.ts` | 注册 `/api/admin`；`download_event` 写入装配 | 1–3 · 5 |
| `apps/server/src/http/assets.ts` | `listQuerySchema` 增 `status` / `owner` 两个可选参数 + 角色门（管理档透传、非管理档忽略） | 4 |
| `apps/server/src/assets/download.ts` | 授权通过、`download_count` 自增后**同一事务**插 `download_event` 一行 | 5 |
| `apps/server/src/http/audit.ts` | 新增 `GET /actions`（返回按前缀分组的动作全集）+ 该路由的鉴权复用既有 `requireRole` | 6 |
| `apps/server/src/http/labels.ts` | `GET /all` 出参改 `{ items, total, limit }`（每条含 `assetCount`） | 7 |
| `apps/server/src/labels/service.ts` | `listManagedLabels` 扩 `total`/`limit`/`assetCount`；`deleteLabel` 增「有挂载 ⇒ 拒绝」 | 7 · 8 |
| `apps/server/src/labels/errors.ts` | 新增错误码 `label.in_use` + 穷尽 switch 补映射（400） | 8 |

### 3.3 路由形态

| 路由 | 守卫 | 内容 |
|---|---|---|
| `/admin` | `role >= 10` | 管理看板（本批真页） |
| `/admin/assets` | `role >= 10` | 资产管理（全站资产治理列表） |
| `/admin/audit` | `role >= 10` | 审计日志 |
| `/admin/reviews` | `role >= 10` | 审核管理（M4b-5 已交付，本批零改动） |
| `/admin/labels` | `role >= 100` | 标签定义 |

## 4. 页面规格（本批核心）

### 4.1 管理看板 `/admin`

**布局（自上而下）**：4 张数字卡 → 趋势卡（两小图）→ 排行榜卡 → 英雄榜两卡 → 创意四项。

**（a）数字卡 × 4**（`grid sm:grid-cols-2 lg:grid-cols-4`）

| 卡 | 主值 | 副行 hint |
|---|---|---|
| 已发布资产 | `asset.status = 'ACTIVE'` 计数（卡**可点** → `/admin/assets`，D50） | 全部资产 N 个（含 `HIDDEN`/`ARCHIVED`） |
| 累计下载 | `sum(asset.download_count)` | **近 7 天新增 X 次**（由 `trends` 切片算：`cum[D] − cum[D-7]`；真库无下载事件时显示「—（暂无下载历史）」）—— 原「Top10 占比」与创意项「下载集中度」重复，已删（D31/F1） |
| 待审 | **`review_task.status = 'PENDING'` 的任务数**（D33；卡**可点** → `/admin/reviews`，D50） | 累计审核 N 件（`review_task` 全部行） |
| 有效用户 | **`user.status = 'ACTIVE'` 账号数**（D34；与首页 hero `totalUsers` 同口径复用） | 全部账号 N（`user` 行总数，含 `PENDING`/`DISABLED`） |

**（b）趋势卡**「资产数和下载数趋势」（一张卡 · 两张小图 · 共享时间范围）

- 卡头：`CardTitle` + `CardDescription`（写明「两条序列各占一张小图、各自纵轴；纵轴按所选窗口取值，非 0 起」）+ 右侧官方 `Select`（近 7 天 / 近 30 天 / 近半年 / 近一年）
- 每张小图：左上序列名（「累计资产数」/「累计下载数」）+ 右上「截至 `<day>`：`<当前累计值>` 个/次」+ 官方 `Area Chart - Interactive` 形态（渐变 `5% → 95%`、`type="natural"`、`cursor={false}`、`indicator="dot"`）；单序列 ⇒ **不放图例**
- 纵轴：4 档**等距整档**刻度（步长按 1 / 1.5 / 2 / 2.5 / 3 / 4 / 5 / 7.5 / 10 档向上试，直到 4 档覆盖数据 + 10% 余量）；数据非负时下限夹 0；**不用** recharts 自选刻度（实测会出 `79,541.48` 这类小数与 `20k/50k/80k/100k` 这类末档不等距）
- X 轴：短窗口 `MM-DD`、长窗口 `YY-MM`；长窗口用「每月首日」显式 `ticks`（否则抽稀后会留下同月重复刻度）
- **空态**：某序列在窗口内**全为 null**（真库当前 = 下载数）⇒ 该小图不画空轴，改虚线框占位：「下载历史待补：已新增「下载事件表」（§5.2），实现前真库画不出这条曲线」+ 右上角说明「真库暂无下载历史（下载不入审计，只有累计计数）」
- 口径：**累计值**（`count(*) WHERE created_at::date <= d::date` / 下载事件按天累计）；**按 `Asia/Shanghai` 日切**（D35）
- 窗口：近 N 天 = **含今天的 N 个点**（`D-(N-1) … D`，D36）；默认 **近 30 天**（D37）

**（c）排行榜卡**（单卡）

- 卡头：固定 `CardTitle`「排行榜」+ 紧右 **Top N Combobox**（popup 形态：按钮触发 + 面板内搜索框；选项 Top 10/20/50/100）；右上**三按钮「人 / 标签 / 资产」**（`data-[active=true]:bg-muted` 选中底；**按钮下无数字**）
- 图：官方 `Bar Chart - Interactive`（竖向柱、无 Y 轴、`CartesianGrid vertical={false}`、`ChartTooltip cursor={false}`）
- 柱色：按口径取 `--chart-1/2/3`
- 轴标签：见 D9/D10（三级密度策略）；标签宽度与容器宽按 `ResizeObserver` 实测，不写死
- 三口径对应数据集：按人 = 每人**已发布资产数**；按标签 = 每标签**资产数**（同一资产挂多标签**重复计入** —— 热度语义，保留；D42）；按资产 = 每资产**下载数**
- 卡内一行口径说明（D42）：「按标签计数时，同一资产挂多个标签会在各标签下各计一次」
- 条数：`min(Top N, 实际条数)`

**（d）英雄榜**（两张卡并排 `sm:grid-cols-2`）

- 资产榜 = 下载数 Top 3（`asset.download_count`）/ 员工榜 = **该用户 `owner` 的 `ACTIVE` 资产数** Top 3（D46）
- 官方 `Bar Chart - Custom Label`：`layout="vertical"`、`YAxis type="category"` + `XAxis type="number"` 均 `hide`、`Bar radius={4}`（**不设 `barSize`**，官方自适应）、`margin={{ right: 16 }}`、柱内名称（`insideLeft` · `fill-(--color-label)` · `offset 8`）+ 柱外数值（`right` · `fill-foreground` · `offset 8`）
- **无 footer**（D12）

**（e）类型数量**（同心环）·**（f）类型下载热度**（雷达 Dots）：按 D13/D14，口径与出参见 §5.1。

**（g）创意四项（口径已定 · D43–D45）**

| 项 | 口径 | 空集/边界 |
|---|---|---|
| 平均审核时长 | `avg(reviewed_at − submitted_at)`，样本 = `review_task.status='APPROVED'` | 无已审任务 ⇒ 显示「—」（不显示 0） |
| 下载集中度 | Top10 资产下载数 ÷ `sum(download_count)`（与「累计下载」卡**不同信息**：一个是总量、一个是集中度） | 总下载为 0 ⇒ 「—」 |
| 标签覆盖度 | 至少挂 1 个标签的 `ACTIVE` 资产 ÷ `ACTIVE` 资产数 | 无 `ACTIVE` 资产 ⇒ 「—」 |
| 沉睡资产 | 上架 ≥30 天 且 `download_count = 0` 的 `ACTIVE` 资产数（阈值 = 端点常量） | — |

### 4.2 资产管理 `/admin/assets`（已对齐 2026-09-23 · UI 定案见 §4.9）

> **对齐基线 = 技能中心 / MCP 中心**（`market/CenterPage.tsx` + `market/AssetList.tsx` 三页同构）：页头卡语法、标签筛选件、工具条（结果计数 + `ml-auto` 控件群 + 折叠搜索）、列与单元格语法、`Pagination` 件、三态件**全部复用门户同件**；仅「类型筛选」与「类型 / 状态两列」为本页特有。

| 项 | 结果 |
|---|---|
| 权限 | `role >= 10`；侧栏「管理」组新增子项「资产管理」（`navItems.tsx` 管理组内，排在「管理看板」后） |
| 页头 | 门户 `CenterPage` 同构页头卡：44px 圆角 icon tile（`rounded-[13px]`）+ `h1 text-xl font-bold tracking-[-0.4px]` + 大写 eyebrow `ADMIN`（11px / `tracking-[1px]`）+ 13px 描述 + 右侧**计数块**（`rounded-xl border bg-secondary px-5 py-2.5`；数值 = `/api/stats.totalAssets`，标签 =「**已上线资产**」，`text-[22px] tabular-nums text-primary`）。⚠️ **口径实测**：`/api/stats` 是**公开匿名端点**且聚合恒 `status = ACTIVE`（`assets/stats.ts:4-5,33`；「防泄露：HIDDEN/ARCHIVED 一律不计入」）⇒ 真库 = **29（已上线）**，而全站含隐藏/归档 = **44**（仅管理端点可得）⇒ 标签**不能写「全站资产」**，否则与列表默认 `status=ALL` 的条数打架（v0.17 修正） |
| 过滤（4 入口） | ① **标签**：复用门户同件 `FilterStrip`（`selected/onToggle/onClearAll`）② **类型**：官方 `Select`（本页特有 —— 门户按类型分路由故无此筛选）③ **状态**：官方 `Select` 四档〔全部 / 已上线 / 已隐藏 / 已归档〕，**默认「全部」⇒ 显式传 `status=ALL`**（服务端无参缺省 `ACTIVE`，故「全部」必须显式传；§4.8(b) · D20）。⚠️ **实测（2026-09-23）**：`status` 属本批服务端**改动 4**（尚未实现）⇒ 当前 DEV 环境下该参被既有 schema 丢弃、点了不生效（**预期**，非缺陷；原型上已标注依赖） —— 治理场景「只看隐藏 / 归档」的主入口（服务端 `status` 参本批交付）④ **搜索**：**折叠面板**（ghost 图标钮 + 官方 `Collapsible` 撑满 `InputGroup`，默认收起、展开自动聚焦；**不是常驻输入框**；占位文案复用既有 `assets.filter.search`「搜索名称或 slug」，**实测 `q` 匹配面更宽** = `asset.slug` + 版本投影 `name` / `description` / `searchText`（`assets/service.ts:249-266`）⇒ 文案保守无害，不新增键）。**归属人筛选本批不做**（需选人组件 + 用户搜索面 ⇒ U11） |
| 工具条 | 左侧结果计数文案（无筛选「共 N 条」/ 有筛选「筛选结果 N」）· 右侧 `ml-auto` 控件群：类型 `Select` → 列显示 `ColumnVisibilityMenu` → 排序 `SortMenu` → 搜索钮 |
| 列（10） | 名称（`AssetAvatar` 24 + 名称 truncate，权重 **16**）· **描述**（`latestDescription`，`line-clamp-2` + `whitespace-normal text-muted-foreground` + **原生 `title` 全文 tooltip**，权重 **23** —— 与门户列表「描述」列同语法；**空值显「—」**，与抽屉同口径）· 类型（官方 `Badge`，权重 7）· 状态（权重 7）· 归属人（`ownerText`，权重 10）· **最新版本**（治理保留列，门户无此列，权重 7）· 下载（`AssetStat kind="download"`，列头可排序 `sortKey='downloads'`，权重 7，**右对齐**）· **收藏**（`AssetStat kind="star"`，列头可排序 `sortKey='stars'`，权重 7，**右对齐** —— 与门户列表「收藏」列同件同款）· 更新（`formatDate`，列头可排序 `sortKey='newest'`，权重 8）· 操作（槽列，权重 **8**）。**权重合计 100**（数据列 92 + 操作槽 8）；**宽度如何落地见下一行**（不在列定义里写死百分比类） |
| **列宽自适应（隐藏列后归一化）** | 列宽 = **权重 + 运行期归一化**：可见数据列按权重摊满 **92%**，余 8% 归操作槽（该列无宽度类 ⇒ 自动吸收，实测恒 ≈87px）。**权重表（实现依据，代码常量 `COL_WEIGHTS`）= 名称 16 · 描述 23 · 类型 7 · 状态 7 · 归属人 10 · 最新版本 7 · 下载 7 · 收藏 7 · 更新 8（合计 92）**；实现 = **CSS 变量 + 字面量任意值类** `w-[var(--cw-*)]`（Tailwind JIT 扫不到运行期拼接类名 ⇒ 用变量绕开；`table-fixed` 保留）· **零件改动、无新依赖**。实测（隐藏列逐步加压）：隐藏「描述」⇒ 名称 16.0% → **21.4%**（= 16/69 × 92）、类型/状态 7% → 9.3% · 归属人 10% → 13.3% · 操作列**不变**；再隐藏「类型」「状态」⇒ 名称 23.8% → **26.7%**、归属人 16.7%，**每步均铺满无留白** |
| **排序（3 档）** | 服务端白名单**三档** = `newest` / `downloads` / `stars`（`ASSET_SORT_VALUES`；`name`/`author` 已下线）⇒ 表中**恰好三列可点**：「更新」⟷ `newest` · 「下载」⟷ `downloads` · 「收藏」⟷ `stars`（其余列头纯文本）。**两个入口同源**：① 列头可点（同档反向 / 异档首点降序，与门户 `handleHeaderSort` 同口径）② 工具条「排序」图标钮 + `DropdownMenu` 三档（当前档打勾 + tooltip 示当前档，门户 `SortMenu` 同件）；两者**都只写同一份 URL `sort`/`dir`** ⇒ 永远一致 |
| 状态呈现（列表态） | **`ACTIVE` 走轻字**（`text-muted-foreground`「**已上线**」，不再 20 行重复浅徽标）· `HIDDEN`/`ARCHIVED` 才用醒目徽标 ⇒ 高信噪比。**文案与键一律复用既有 `assets.filter.status.{active,hidden,archived}`**（「已上线 / 已隐藏 / 已归档」—— 单一文案源；**本批顺带把该键 zh 文案由「活跃」修正为「已上线」**，见 §6.2 影响面） |
| **视图切换** | 官方 `ToggleGroup`（`type="single"` `variant="outline"` `size="sm"` `spacing={0}` · 图标钮 `LayoutGrid`/`List`）放在工具条控件群**最右**（门户同位）；**默认「列表」**（操作态，同控制台「我的资产」口径）· 切换**不落 URL、不落存储** ⇒ 刷新/离开即回列表；列显示入口**仅列表态渲染**（卡片无列的概念 —— 门户口径） |
| 卡片态 | 复用门户同件 `AssetGrid` + `AssetCard`（含**状态徽标槽** `StatusPill kind="asset"`）；载态 = 门户同款 8 槽 `Skeleton h-[166px]`；断点 4 列；筛选无结果 = 卡片态 `Empty`。⚠️ **两态状态呈现有意不同**：卡片态由门户件**原样**渲染徽标（`ACTIVE` 也显）· 列表态走上面的轻字口径 —— **不为此改门部件**（Q4 拍板） |
| 行交互 | **列表态**：**整行可点** → 右侧详情抽屉（`DataTable.rowProps` 挂 `onClick`）；操作列同款「查看」图标钮（`Eye`）开抽屉 —— 两个等价入口。**卡片态**：整卡热区 = `AssetCard` 自带覆盖层 `Link` ⇒ **点卡片进资产详情页**（门户原生行为 · 零件改动）；两态行为差异已登记 **U10** |
| 详情抽屉 | 复用仓内既有 **`console/Drawer`**（**官方 `Sheet` 的薄封装** —— 主 design §6.3 已定「宽 560 + 必带 `SheetTitle`」）；**只读**：字段 = slug / 类型 / 状态 / 归属人 / 最新版本 / 下载 / 收藏 / 更新于 / **描述**（`latestDescription` —— 与门户列表「描述」列、卡片描述**同字段**，零新增请求；空值显「—」；整段 `whitespace-pre-wrap` 不截断，抽屉正文 `overflow-y-auto` 可滚动）+ footer「关闭 · **打开详情**」（文案复用既有 `assets.action.open`；真链接 `/assets/{slug}`）。⚠️ **可达性实测**：详情面 `assertAssetReadable`（`http/assets.ts:135,159`）授权集 = **owner 本人 ∨ 管理档（`isPlatformReviewer` = `role >= ACCOUNT_ROLE.ADMIN`）**，超管短路 ⇒ **管理档从治理页点进 `HIDDEN`/`ARCHIVED` 资产详情不会 404**（集外才 404）⇒ 按钮**恒显**，不按状态隐藏；**管理动作仍归资产详情页管理区**（零口径漂移） |
| 密度 | `density="default"`（控制台操作态 `p-2`；门户阅读态是 `comfortable`/`py-4` —— 本页取操作态） |
| 列显示 | `ColumnVisibilityMenu` + **保护列 2**（名称 / 操作，`meta.hidable=false`）—— 与 M4b-5 审核队列同口径；**状态不持久化**（刷新/离开即回默认全显，与门户中心页、审核队列同口径 —— Q9 拍板，不落 URL 也不落 localStorage）。菜单文案复用既有 `market.colShow`「列显示」· `market.colRequired`「**必显**」· `market.colReset`「**重置为默认**」（实测文案，勿自造「保护列 / 重置」） |
| 分页 | 共享 `Pagination` 件，**仅 `total > PAGE_SIZE` 时渲染** + 翻页回顶；URL 用 `limit`/`offset`（**控制台口径**，与 M4b-5 审核队列同款 —— 见 §4.8(b)） |
| 三态 | 载态 `loadingVariant="keepHeader"`（表头保留 + 5 行骨架）· 空态 `EmptyState` · 错态 `ErrorState` + 重试 |
| 服务端 | 见 §5.3（复用公开面 + 仅管理档生效的 2 个加性参数，**不新建端点**） |

### 4.3 标签定义 `/admin/labels`（已对齐 2026-09-23）

| 项 | 结果 |
|---|---|
| 权限 | `role >= 100`（SUPER_ADMIN；服务端 `assertSuperAdmin` —— `http/labels.ts:58-63`；`docs/06 §3`） |
| 服务端 | 端点**齐备**：`GET /`（公开）· `GET /all`（超管全量）· `POST /` · `PATCH /:slug` · `DELETE /:slug` · `PUT /order`（批量排序）；本批只做 **2 处改动**（§5.4：`/all` 出参加性扩 + 删除拦截） |
| 页面结构 | 两级严格树（一级为分组行；应用层锁两级）· 行首展开/折叠 · 每行：显示名(zh) · slug · type 徽标 · 过滤可见 · **挂载数（可点 → `/admin/assets?label=<slug>`，D50）** · 操作<br>**层级视觉（v0.22 定值 = 原型实测）**：一级缩进 **0** · 二级缩进 **28px** + **左侧 2px 浅色引导线**（`border-l-2 border-border`）· **chevron 仅在有子级的一级行渲染**（二级无 chevron）· **默认折叠**（`expanded` 初始为空）<br>真库样例（2026-09-23 实测）：`agentic`（智能体）→ `agentic-rag`（RAG 检索），二级 `padding-left: 28px` / 引导线 `2px` ✓ |
| 上限提示 | 页头「已用 N / 上限 M」（数据来自 `GET /all` 的 `total`/`limit`，`limit` = env 现值）；用量 ≥90% 时用 `tone="warn"` 色调 |
| 新建/编辑 | 表单字段见 D30；翻译两栏**整组提交**（D29）；slug 创建后禁改（服务端 `PATCH` 也不接受 slug —— `UPDATE_BODY.slug = z.never()`）；**`visibleInFilter` 开关在创建与编辑对话框均保留、默认打开**（v0.23 定 · U12 闭环；列 `default true` ⇒ 零服务端改动） |
| 排序 | 行内 ↑↓ 逐条移动；一次 `PUT /order` 提交整组（`order[{slug,sortOrder}]`，上限 200）；失败回滚本地顺序 + toast |
| 删除 | 二次确认弹窗：**「已挂载 N 个资产」+ 写明后果**；服务端「有挂载 ⇒ 拒绝」（`label.in_use`）⇒ 前端提示「请先在资产上解挂」（D27） |
| `type` 语义 | `RECOMMENDED`（owner / 管理档可挂）· `PRIVILEGED`（**仅超管可挂** —— 表单内联提示） |
| 错误出口 | 复用既有 `LabelError` 映射（`labels/errors.ts` 穷尽 switch）；本批新增 **1 个码** `label.in_use` |
| 空态 | 无标签时给「创建第一个标签」引导（沿用既有 `admin.empty` 键风格） |

### 4.4 审计日志 `/admin/audit`（已对齐 2026-09-23）

> 页面命名：侧栏与标题统一「审计日志」（D21）；`docs/00` §5 原措辞「审计浏览」收尾同步。

| 项 | 结果 |
|---|---|
| 权限 | `role >= 10`；服务端面已由 `requireRole(ACCOUNT_ROLE.ADMIN, { scope: TOKEN_SCOPES.auditRead })` 把守（`http/audit.ts:45`，M1 交付） |
| 服务端 | **过滤面已齐备，本批零改动**（除 D23 新增的 `GET /api/audit/actions` 供下拉取全集） |
| 过滤区（常显） | `action` 分组下拉（按点号前缀分组，组内列动作全集，组名走 i18n；**默认 = 全部动作**，D47）+ 时间区间（官方 `Calendar`，落 `from`/`to`）<br>**组名 = 潜在全集 9 个**：`asset` / `review` / `label` / `token` / `auth` / `device` / **`namespace`** / `ldap` / `oidc`。<br>⚠️ **实测校准（2026-09-23 补原型时）**：真库当前**已出现 7 组** = `asset` / `auth` / `device` / `label` / **`namespace`** / `review` / `token`（`ldap` / `oidc` 尚未出现）—— 故**实现期组名以 `GET /api/audit/actions` 实测全集为准**；前端对**未知前缀原样显示**兜底（不丢动作） |
| 过滤区（折叠「更多筛选」） | `targetType` · `targetId` · `actorId` · `requestId` · `clientIp`（5 个精确匹配输入，长度上限对齐服务端 schema：64/128/256/64/64） |
| 日期区间 | 默认近 7 天；快捷项〔今天 / 近 7 天 / 近 30 天 / 自定义〕（D25） |
| 表格列 | 时间（按 **`Asia/Shanghai`** 展示，与 D35 日切口径同源；接口返回 ISO 8601（UTC），前端按时区格式化） · 动作（原始串）· **操作者（工号 + 姓名；无 actor 行显「—（匿名）」，D48）** · 目标（`targetType:targetId`）· 来源 IP · 请求 ID<br>**列宽口径（v0.25 定 · 对齐资产管理页 §4.2）**：时间 **14** · 动作 **20** · 操作者 **14** · 目标 **16** · 来源 IP **12** · 请求 ID **16**（合计 **92%**）+ **操作槽 8%** = 100%。⚠️ 原先 6 列合计 100% ⇒ **操作列被挤成 0 宽**、查看钮溢出单元格、表格横向溢出（实测 `scrollWidth 1121 > clientWidth 1081`）；改 92% 后实测 操作列 **87px**、`scrollWidth = clientWidth = 1081`、钮在格内 ✓ |
| 行内动作 | **只留「查看」** ⇒ `Dialog`/`Sheet` **全量原样**展示 `detail`（jsonb 美化）+ `userAgent` + `client_ip` **完整 IP（不打码）**（D49；依据：写入点实测 `detail` 不含凭据） |
| 分页 | `offset` 口径（R9 已拍板：审计低频、简单优先） |
| **与资产中心表格的对齐取舍（v0.25）** | **已一致（同件同参，无需改）**：同用 `ui/DataTable` + `density="default"` + `tableClassName="table-fixed"` + `loadingVariant` 骨架 + `EmptyState`/`ErrorState` 三态 + 行内图标动作钮 + 共享 `Pagination` + 件内 `sticky` 表头。<br>**不对齐 3 项（各有理由）**：① **排序** —— 服务端 `queryAudit` 固定 `createdAt desc, id desc`（无排序参数），审计按时间倒序本就唯一合理序 ② **列显示菜单** —— 资产页有 10 列才需要隐藏入口，本页 6 列均为排查必需（IP / 请求 ID 虽常空但缺一不可）③ **操作者头像** —— 仓内先例（审核队列「提交人」）不带头像，本页跟随 |
| `action` 语义 | 服务端 = **精确匹配**（`audit/query.ts:31` `eq`）⇒ 下拉必须给全集（故有 D23）；动作全集实现期以 `AUDIT_ACTIONS` 常量 + 字面量写入点实测为准，**本稿不复制动作条数** |
| **快捷筛选（v0.24 加）** | 〔近 24 小时〕〔版本下架〕〔清除筛选〕三键（对标兄弟仓「一键筛选」+「清除筛选」）；**只映射既有参数**（`from` = now−24h / `action` = `asset.version_yank`）⇒ **零服务端改动**；「仅看匿名 / 前缀级（`asset.*`）」**暂不做**（`actorId`/`action` 均只精确匹配 ⇒ 需新参数），理由与替代入口见 **U13** |
| **兄弟仓对标（兄弟仓 SkillHub `web/src/pages/admin/audit-log.tsx` · 264 行，2026-09-23 真读源码）** | 兄弟仓更简单朴素，**逐条取舍**：<br>① **吸收 = 「一键筛选」快捷按钮**（其做法 = `action` + `resourceType` 组合一键）⇒ 本批版 = **〔近 24 小时〕〔版本下架〕〔清除筛选〕** 三键，且**只映射既有参数** ⇒ **零服务端改动**<br>② **不吸收 = 「详情摘要列」**（它把 detail 挤进列内 `max-w-md truncate`、无详情承载）⇒ 本页已有行内「查看」+ 抽屉全量，摘要列会加宽且真库 detail 多为小对象（如 `{"via":"local"}`）<br>③ **不跨仓统一 = 分页参数**（它 `page/size` 0 起；本页 `limit`/`offset` 与同壳的 M4b-5 审核队列一致）<br>④ **反向印证本页两处选择更优**：其 `action` 下拉是**前端硬编码 18 项常量**（漏一个动作就查不到）⇒ 本页改为**端点动态出全集**；其过滤 8 控件全常显 ⇒ 本页常显 2 + 折叠 5（D22） |

### 4.4b D23 端点出参（`GET /api/audit/actions`）

```jsonc
{
  "groups": [
    { "prefix": "asset",  "actions": ["asset.delete", "asset.register", "..."] },
    { "prefix": "review", "actions": ["review.approve", "review.reject", "review.withdraw"] }
    // …
  ]
}
```

- 鉴权：`role >= 10`（同 `/api/audit`）；只读、无副作用
- 单源：由服务端审计动作常量 + 写入点推导（实现期确定生成方式：常量导出 vs 静态清单 + 断言测试兜底）
- 前端：`board`/`admin` 组的 i18n 只负责**组名与展示**，动作串原样呈现（可对代码追溯）

### 4.5 UI 结构与组件树（管理看板）

```
AdminDashboard
├─ KpiCard ×4
├─ Card（趋势）
│  ├─ CardHeader（Title + Description + Select 时间范围）
│  └─ CardContent（grid gap-5）
│     ├─ TrendPanel（累计资产数）  ← 标题行 + ChartContainer(AreaChart)
│     └─ TrendPanel（累计下载数）  ← 同上；序列空 ⇒ EmptyPanel
├─ Card（排行榜）
│  ├─ CardHeader（CardTitle「排行榜」+ Combobox Top N + 三口径按钮组）
│  └─ CardContent（ChartContainer(BarChart)）
├─ HeroBar ×2（资产榜 / 员工榜 · 各一张官方 Card）
└─ CreativeKpi ×4
```

### 4.6 全局交互约定

- 时间范围与 Top N 都是**单点控件**：趋势的时间范围被两张小图共享；排行榜的 Top N 与口径按钮只作用于本卡
- 数值一律走 `toLocaleString()`；「累计」与「当日」两种口径的文案不得混用（标题/副标题必须写明口径与窗口）
- 空态优先于空图：任何序列无数据 ⇒ 占位文案，不画空坐标轴
- **看板入口化**（D50）：三处可点（待审卡 → `/admin/reviews` · 已发布资产卡 → `/admin/assets` · 标签挂载数列 → `/admin/assets?label=<slug>`）
- **刷新策略**（D51）：看板仅进入页面时拉一次数据（无轮询、无刷新按钮）；需要新数据 = 重新进入页面
- **空集显示「—」而非 0**（创意四项 · D43）

### 4.7 线框（本批四页，每页一张）

**（a）管理看板 `/admin`**

```
┌─ 管理看板 ────────────────────────────────────────────────────────────────┐
│ [已发布资产 N] [累计下载 N] [待审 N] [有效用户 N]      ← 4 数字卡（各带副行）│
├───────────────────────────────────────────────────────────────────────────┤
│ 资产数和下载数趋势                              [ 近 30 天 ▾ ]            │
│  累计资产数                        截至 YYYY-MM-DD：N 个                  │
│  ╭─ 渐变面积图（4 档整刻度纵轴 · X 轴 MM-DD / YY-MM）─────────────────╮  │
│  ╰─────────────────────────────────────────────────────────────────────╯  │
│  累计下载数                        截至 YYYY-MM-DD：N 次 / 空态占位        │
│  ╭─ 渐变面积图 ────────────────────────────────────────────────────────╮  │
│  ╰─────────────────────────────────────────────────────────────────────╯  │
├───────────────────────────────────────────────────────────────────────────┤
│ 排行榜   [Top 10 ▾]                            [ 人 | 标签 | 资产 ]       │
│  ╭─ 竖向柱状图（无 Y 轴；轴标签水平 / 45° 斜排 / 抽稀）────────────────╮  │
│  ╰─────────────────────────────────────────────────────────────────────╯  │
├───────────────────────────────────┬───────────────────────────────────────┤
│ 资产榜（下载数 Top 3）            │ 员工榜（发布通过数 Top 3）            │
│  ╭ 🥇 name ████████████  N ╮      │  ╭ 🥇 name ████████  N ╮              │
│  ╰─────────────────────────╯      │  ╰──────────────────────╯             │
├───────────────────────────────────┴───────────────────────────────────────┤
│ [平均审核时长] [下载集中度] [标签覆盖度] [沉睡资产]   ← 创意四项            │
└───────────────────────────────────────────────────────────────────────────┘
```

**（b）资产管理 `/admin/assets`**

```
┌─ 资产管理 ────────────────────────────────────────────────────────────────┐
│ [关键词 q] [状态 ALL ▾] [类型 ▾] [标签 ▾] [归属人 ▾]      ← 过滤行         │
├───────────────────────────────────────────────────────────────────────────┤
│ 资产(名称/slug) │ 类型 │ 状态  │ 归属人 │ 版本 │ 下载 │ 更新于 │ 操作      │
│ ▸ name / slug   │ skill│ACTIVE │ 张伟   │1.2.0 │ 1313 │ 09-22  │ [查看]    │
│ ▸ name / slug   │ mcp  │HIDDEN │ 李娜   │0.9.0 │  207 │ 09-20  │ [查看]    │
├───────────────────────────────────────────────────────────────────────────┤
│ 共 N 条 · 每页 20 · offset 分页                           [上一页][下一页] │
└───────────────────────────────────────────────────────────────────────────┘
（行内只留「查看」⇒ 隐藏/归档/删除等管理动作集中在资产详情页管理区）
```

**（c）审计日志 `/admin/audit`**

```
┌─ 审计日志 ────────────────────────────────────────────────────────────────┐
│ [动作 asset ▾] [ 今天 | 近 7 天 | 近 30 天 | 自定义 ]  [更多筛选 ▾]       │
│   └ 展开：targetType · targetId · actorId · requestId · clientIp           │
├───────────────────────────────────────────────────────────────────────────┤
│ 时间 │ 动作 │ 操作者 │ 目标 │ 来源 IP │ 请求 ID │ 操作                    │
│ 09-23 10:02 │ asset.version_yank │ 张伟 │ asset:12 │ … │ … │ [查看]       │
├───────────────────────────────────────────────────────────────────────────┤
│ 共 N 条 · offset 分页                                     [上一页][下一页] │
└───────────────────────────────────────────────────────────────────────────┘
（「查看」⇒ 弹窗展示 detail JSON（美化）+ userAgent；action 列显示原始串）
```

**（d）标签定义 `/admin/labels`**

```
┌─ 标签定义 ──────────────────────────────── 已用 12 / 上限 100 ────────────┐
│ [+ 新建标签]                                                              │
├───────────────────────────────────────────────────────────────────────────┤
│ 显示名(zh) │ slug     │ 类型        │ 过滤可见 │ 挂载数 │ 操作            │
│ ▼ 软件     │ software │ RECOMMENDED │ 是       │   8    │ [↑][↓][编辑][删除]│
│   ├ 通讯   │ comm     │ RECOMMENDED │ 是       │   3    │ [↑][↓][编辑][删除]│
│   └ 数据库 │ db       │ PRIVILEGED  │ 否       │   1    │ [↑][↓][编辑][删除]│
├───────────────────────────────────────────────────────────────────────────┤
│ 删除确认：「已挂载 8 个资产，删除后这些挂载会一并移除且不可恢复」          │
└───────────────────────────────────────────────────────────────────────────┘
（两级严格树 · 行内 ↑↓ 排序一次 PUT /order 提交 · 翻译两栏整组提交）
```

### 4.8 页面状态与 URL 规格（`portal-ui-design` 环节 0 收口）

> 口径：四页的**过滤/排序/分页**状态一律 **URL 化**（可分享、可回退、刷新不丢）；组件内部态（弹窗开合、树展开）不进 URL。
> 多值参数用**重复键**（`?label=a&label=b`），与服务端 `z.array` 解析对齐；空值/默认值**不写进 URL**（保持地址干净）。

**（a）`/admin` 管理看板**

| 参数 | 取值 | 默认（无参时） |
|---|---|---|
| `range` | `7` / `30` / `180` / `365` | `30`（D37） |
| `rankBy` | `people` / `label` / `asset` | `people`（D6：三口径顺序 人→标签→资产） |
| `rankN` | `10` / `20` / `50` / `100` | `10` |

**（b）`/admin/assets` 资产管理**

| 参数 | 取值 | 默认 |
|---|---|---|
| `q` | 1–100 字符 | 无（不检索） |
| `status` | `ALL` / `ACTIVE` / `HIDDEN` / `ARCHIVED` | `ALL`（D20；管理档才生效，D19） |
| `type` | `skill` / `mcp` / `agent` | 无（全部类型） |
| `label` | 标签 slug（可重复） | 无 |
| `owner` | 用户 id 精确匹配 | 无 |
| `sort` / `dir` | 既有 `assetSortQueryFields` 档位与方向 | `newest`（服务端兜底） |
| `limit` / `offset` | `limit` 1–100；`offset ≥ 0` | `20` / `0` |

> **分页参数口径（实测两套并存，本页取控制台口径）**：门户中心页用 `?page=`（`market/CenterPage` + `useMarketQuery`），
> **控制台列表用 `?limit=` + `?offset=`**（`pages/ReviewQueue.tsx` 注释「筛选与分页 URL 状态化（`?status=&limit=&offset=`）」）。
> 本页在 `/admin/*` 控制台壳内 ⇒ 跟**控制台口径**（`limit`/`offset`），与 M4b-5 审核队列**同款**；分页控件仍是共享 `Pagination` 件（门户同一件）。
> **对齐门户的范围** = 页头卡 / `FilterStrip` / 工具条与折叠搜索 / 列与单元格语法 / `Pagination` 件 / 三态件；**URL 分页参数跟控制台** —— 这是唯一一处「不跟门户」的取舍。
> **UI 暴露面（v0.16）**：`status` **暴露**（状态 Select，默认「全部」= 本表默认值）· `owner` **服务端交付但本批无 UI 入口**（登记 U11：需选人组件 + 用户搜索面，归 U6 范畴）。

**（c）`/admin/audit` 审计日志**

| 参数 | 取值 | 默认 |
|---|---|---|
| `action` | 动作原始串（精确匹配，D47 默认全部） | 无（全部动作） |
| `targetType` / `targetId` | 精确匹配 | 无 |
| `actorId` | 用户 id | 无 |
| `requestId` / `clientIp` | 精确匹配 | 无 |
| `from` / `to` | ISO8601（带时区） | 近 7 天（D25 快捷项：今天/近 7 天/近 30 天/自定义） |
| `offset` / `limit` | 同上 | `0` / `20` |

**（d）`/admin/labels` 标签定义**

| 参数 | 说明 |
|---|---|
| 无 | 树展开态、编辑弹窗均为组件内部态（不进 URL）；唯一入参是外部跳转带入的 `?label=`（用于从看板跳资产管理，不作用于本页） |

**（e）通用约定（四页一致）**

1. **变更粒度**：过滤/排序/分页变更 ⇒ `push`（可回退）；搜索框输入 ⇒ `debounce` 后 `push`（避免逐键污染历史）
2. **竞态防护**：参数变更时 **abort 上一个在途请求**（慢响应覆盖新查询是经典 bug；技能防坑清单）
3. **翻页回顶**：分页/过滤变更后列表回到顶部
4. **三态齐**：加载（骨架）/ 空（占位文案）/ 错误（本地化消息 + 兜底「操作失败（code）」，永不空白）
5. **详情态**：审计详情 = `Dialog`/`Sheet`（组件态，不进 URL，D24）；资产管理的「查看」= **跳既有资产详情页**（当前口径）—— 若方向板采纳「列表 + 抽屉」立场，则改为就地抽屉并同步本节（见 §4.9）

### 4.9 UI 定案（`portal-ui-design` 环节 1–4 · 2026-09-23 用户拍板）

> 环节 1–3 已走完：**真读对标源码**（官方公开 blocks `dashboard-01`（含 `data-table.tsx`）/ `sidebar-07` + 仓内门户 `market/CenterPage` / `market/AssetList`）+ **真组件实跑**（DEV-only 原型，真库数据，Edge CDP 截图）+ 三个立场变体评审。
> **拍板结果**：立场 = **③ 详情抽屉 + ② 紧凑密度**；「最新版本」列**保留**；抽屉**只读**；状态徽标只对异常态醒目；分页 URL 取**控制台口径**。
> 被否决方向**不入档**（文档铁律），只记本节拍板结果。

**（a）定案形态**：见 §4.2（页头卡 + 三入口过滤 + 工具条 + **列表 / 卡片两态** + **10 列表格**（含「描述」「收藏」）+ 三档排序（列头 / 排序菜单同源）+ 详情抽屉 + 分页）。
两态实测（真库 · Edge CDP）：列表态 `tbody tr = 20` · 页高 1539；点视图切换 ⇒ 卡片态 `[data-slot=card] = 22` · 页高 1366 · **4 列网格**；点卡片 ⇒ 导航 `/assets/<slug>`（门户原生）。

**（b）件复用清单（零新件、零新依赖）**

| 用途 | 件 | 来源 |
|---|---|---|
| 页头卡 / 工具条 / 折叠搜索 | `Card`/`CardHeader` · `Collapsible` · `InputGroup` · `Button` | 官方件（仓内已厂商化） |
| 标签筛选 | `market/FilterStrip` | 门户同件 |
| 排序入口 | `market/SortMenu` | 门户同件 |
| 列表 / 卡片 | `ui/DataTable`（`density` / `tableClassName` / `loadingVariant` / `rowProps` / `rowActions` / `columnVisibility`）· `market/AssetGrid` + `market/AssetCard`（含 `status` 槽） | 仓内自抽统一件 + 门户同件 |
| 视图切换 | `ui/shadcn/toggle-group`（`ToggleGroup` / `ToggleGroupItem`） | 官方件（门户 / 控制台「我的资产」同款） |
| 状态徽标 | `console/StatusPill`（`kind="asset"`） | 仓内自取件（控制台「我的资产」同款） |
| 单元格语法 | `ui/AssetAvatar` · `console/asset-stats`（`AssetStat`）· `market/format`（`formatDate`/`ownerText`） | 门户同件 |
| 列显示 | `ui/ColumnVisibilityMenu` | 门户 / 审核队列同件 |
| 详情抽屉 | `console/Drawer` = **官方 `Sheet` 薄封装**（宽 560 + 必带 Title） | 仓内既有件（主 design §6.3 已落值） |
| 分页 / 三态 | `ui/Pagination` · `ui/EmptyState` · `ui/ErrorState` | 仓内既有件 |

> **官方件口径说明**：右侧详情面板用官方 `Sheet`（`components/ui/shadcn/sheet.tsx`）—— 它就是 shadcn 官方的侧边面板件；官方另有一个基于 **`vaul`** 的 `Drawer` 件，但它是**底部上滑**形态、且需新增依赖 `vaul` ⇒ **不采用**。故本页抽屉 = 官方 `Sheet` + 遵主 design 已定的仓内封装规格，**不自造新抽屉件**。

**（c）tokens 语义（本批零新增）**：沿用既有语义色与版式令牌 —— `bg-primary`（页头 icon tile）· `bg-secondary` + `border-border`（计数块）· 文本档 `text-xl`/`text-[22px] tabular-nums`/`text-[13px]`/`text-[11px]`（`tracking-[1px]` eyebrow）· 圆角 `rounded-[13px]`（icon tile）/`rounded-xl`（计数块）· 状态徽标 = 既有 `Badge` 的 `variant` 组合（`secondary`/`destructive`）。**不引入任何新 CSS 变量**。

**（d）原型与证据（物料不进仓）**：DEV-only 路由 `/__proto/admin-assets`；截图 `/tmp/m4b6-assets-final.png`（整页）· `/tmp/m4b6-assets-final-drawer.png`（抽屉开态）；实测 = 真库 20 行 / 共 29 条 / 分页 `1 / 2 · 每页 20` / 页高 1539 / 抽屉可开；`tsc=0` · biome 干净。

## 5. 服务端改动规格

> **编号口径（SSOT）**：本文所称「改动 N」= **§7 表 `#` 列**（共 8 项）。小节 ↔ 改动号映射：§5.1 = 1–3 · §5.2 = 5 · §5.3 = 4 · §5.4 = 7–8 · §5.4b = 6；§5.5 契约影响 · §5.6 测试面。**改动号不随小节顺序漂移**。

### 5.1 管理看板三只读端点（改动 1–3 · 新建 · `role >= 10`）

| 端点 | 出参（顶层） | 口径要点 | 数据来源 |
|---|---|---|---|
| `GET /api/admin/overview` | `kpi`（`activeAssets` / `allAssets` / `downloads` / `pending` / `reviewsTotal` / `activeUsers` / `allUsers`）+ `creative`（`reviewSpeed` / `concentration` / `labelCoverage` / `sleeping`） | `pending` = **`review_task.status='PENDING'`**（D33）· `activeUsers` = **`user.status='ACTIVE'`**（D34，同 `/api/stats.totalUsers` 口径）· `creative` 四项 = D43–D45（空集返 `null`，由前端显「—」） | `asset` / `review_task` / `user` 聚合 |
| `GET /api/admin/rankings` | `people[]` / `labels[]` / `assets[]`（各含名称与计数） | 三口径见 §4.1(c)；`people` = owner 的 `ACTIVE` 资产数（D46）；`labels` 重复计入（D42） | 同上 + `asset_label` |
| `GET /api/admin/trends?days=N` | `[{ day, assets, downloads }]`（**累计**值；`downloads` 在无事件表时 = `null`） | **`Asia/Shanghai` 日切**（D35）· 窗口含今天共 N 个点（D36）· 资产：`count(*) WHERE created_at::date <= d::date`；下载：下载事件按天累计（§5.2） | 资产 / `download_event` |

鉴权口径：管理档 `role >= 10`（复用既有守卫工具）；只读、无副作用、无审计写入。
`days` 取值域 = `7 / 30 / 180 / 365`（与前端选择器一致；越界值服务端**夹到最近档** —— U8 已闭环，见 §11.3）。

- **`downloads` 的 `null` → 数值切换（Q1 · v0.27）**：迁移 **0014 落地后**，**空表 / 零下载 ⇒ 各点 `0`（数值）**；`null` 仅作「**迁移未落地**」的过渡态保留（前端两分支：`null ⇒ 「—」` · `0 ⇒ 画 0 线`）—— 两态均由断言覆盖，避免「有表却仍显示暂无下载历史」。
- **排行榜稳定排序（Q2 · v0.27）**：三口径均补**主键稳定键** ⇒ 资产榜 `download_count DESC, asset.id DESC` · 员工榜 `ACTIVE 资产数 DESC, user.id ASC` · 标签榜 `资产数 DESC, label.id ASC`（并列时顺序确定，重复刷新 / 翻页不跳位）。
- **缓存（Q5 · v0.27）**：`/api/admin/*` 三端点**实时查询、不加缓存**（也不加特殊 `Cache-Control`）。理由：管理档低频 + 数据量小（真库 44 资产 / 2,474 审计行），加缓存引入的失效复杂度与收益不成比例；与 D51（前端仅进页拉一次）配合已足够。
`activeUsers` 与首页 hero 的 `totalUsers` **同口径复用**（不同页面不同受众，不构成重复展示）。

### 5.2 下载事件表（改动 5 · **用户 2026-09-23 拍板 B：入设计 · 实现期落**）

| 项 | 内容 |
|---|---|
| 表 | `download_event`：**`id` · `asset_id`（FK）· `version_id`（可空）· `created_at`**（D38 —— 4 列；**不预埋** `user_id` / `client_ip_hash` / `source`） |
| 写入点 | `apps/server/src/assets/download.ts` 的 `resolveDownload` 内（D40）—— 授权通过后，`asset.download_count` 自增 **与** 插事件包在**同一 `db.transaction`**（D39；调用点 `http/assets.ts:826` 现行无事务，需显式加） |
| 失败语义 | 事件写失败 ⇒ **回滚自增 + warn 日志 + 仍放行下载**（D39）：不产生「计数 +1 却无事件」的偏账，也不因统计面阻断下载 |
| 索引 | `created_at`（趋势按天聚合）+ `asset_id`（单资产维度扩展用） |
| 迁移 | `apps/server/drizzle/` 新增 **0014**（当前已用 0000–0013 —— 实测 `0008…0013` 已被前序批占用） |
| 与 R13 的关系 | R13 拍板「下载**不入审计**」保持不变；本表是**统计面**，不复用 `audit_log` 语义 |
| 读面 | 仅 `/api/admin/trends` 使用；门户与资产详情不读 |
| ⚠️ 已知局限 | **历史不可回溯** —— 表建成前无任何带时间戳的下载记录 ⇒ 真库「累计下载数」曲线只能从上线日起从 0 长；`docs/00` §5 与本节均登记该局限 |
| 保留策略 | 待对齐（是否需要按天快照/定期归档 ⇒ 见未决登记 U5） |

### 5.3 资产管理读面（改动 4 · **复用公开面扩参** · 用户拍板 1A / 2A2）

**现状（真码）**
- 服务层**已具备**全站能力：`listViewableAssets` 已参数化 `status`（缺省 `ACTIVE`；`'ALL'` ⇒ 不加条件）与 `ownerId`
  —— `apps/server/src/assets/service.ts:242-250`；`ListAssetsOptions` 见 `:87-110`（M4b-4 T1 为个人面所加）
- 公开面 `GET /api/assets` **未暴露**这两个参数：`listQuerySchema` = `limit/offset/type/q/label/sort/dir`
  —— `apps/server/src/http/assets.ts:78-89`、处理器 `:242-275`（列表恒 `status = ACTIVE`，与 viewer 身份无关）
- 个人面注释里已留本批钩子（`apps/server/src/http/me.ts:5`）：「`ownerId` 恒取会话…**管理档看全站走 M4b-6，不在此面**」

**改法（加性 + 角色门）**
1. `listQuerySchema` 增两个**可选**字段：`status`（`assetStatusSchema ∪ 'ALL'`）、`owner`（用户 id 精确匹配，长度上限同 `AUDIT_FILTER_MAX` 口径）
2. 处理器按会话角色门控：`principal.role >= ACCOUNT_ROLE.ADMIN` ⇒ 透传给 `listViewableAssets`；
   **非管理档传入 ⇒ 忽略**（视作未传，等价现状语义）
3. **不新建端点、不新增鉴权中间件**（公开面仍匿名放行；管理语义只体现在这两个可选参数上，注释须写明角色门）

**契约影响（向后兼容论证）**
- 无参调用 ⇒ `status` 缺省 `ACTIVE` ⇒ 与现状**逐字等价**（门户/搜索/标签面零变化）
- 仅新增可选入参与「管理档可见的全状态结果」，无破坏性字段变更
- 与个人面 `/api/me/assets` 的关系：个人面 `ownerId` 恒取会话（拒绝客户端传入）**保持不变**——管理档看全站只走公开面这两个新参数

**测试面**
- 鉴权矩阵：匿名 / 用户档 / 管理档 三态 ×（传 `status=ALL`、传 `owner`、都不传）
- 断言「非管理档传管理档参数 ⇒ 结果与不传**逐条相同**」（静默忽略的正证）
- 断言「管理档 `status=ALL` ⇒ 含 `HIDDEN`/`ARCHIVED` 行」；「无参 ⇒ 仅 `ACTIVE`」（零回归正证）

### 5.4 标签定义面（改动 7–8 · 用户拍板 ①A ②C）

**改动 7｜`GET /api/labels/all` 出参扩（加性，但形态变更）**
- 现状：`listManagedLabels(db)` 返回**裸数组** `ManagedLabel[]`（`labels/service.ts:436-462`），无 `total` / `limit` / 挂载数
- 改法：出参 → `{ items, total, limit }`，且每条 `item` 增 `assetCount`（每标签的挂载数）
  - `limit` = `getEnv().LABEL_MAX_DEFINITIONS`（env 现值，默认 100 —— `config/env.ts:60`）
  - `assetCount` = 一次 `GROUP BY label_definition_id` 聚合（防 N+1）
- ⚠️ **形态变更（数组 → 对象）**：实测**前端零消费者**（`grep "labels/all" apps/web/src` ⇒ 0 命中）⇒ 破坏半径 = 0；本批新页是**首个消费者**，登记之

**改动 8｜`DELETE /api/labels/:slug` 语义变更（有挂载则拒绝）**
- 现状：`deleteLabel` **只拦「有子标签」**（`labels/service.ts` `parentHasChildren`）；而 `asset_label.label_definition_id` 外键是 **`onDelete: 'cascade'`**（`db/schema/governance.ts:112`）
  ⇒ 现状删一个被挂载的标签会**静默清掉全站该挂载**（不可逆、无提示）—— 本轮实测发现的真实数据风险
- 改法：删除前先查 `asset_label` 引用数，>0 ⇒ 抛新码 **`label.in_use`**；状态映射 = **400**（与既有 `parent.has_children` 删除被拒同族，用户 2026-09-23 确认；`labels/errors.ts` 穷尽 switch ⇒ 必须同批补映射，否则编译失败）
- 前端：二次确认弹窗显示「已挂载 N 个资产」（N 来自改动 7 的 `assetCount`），并给「请先在资产上解挂」指引

### 5.4b 审计动作端点（改动 6 · 新建只读 · `role >= 10`）

- 端点：`GET /api/audit/actions` —— 返回按**点号前缀**分组的动作全集（出参示例见 §4.4b）
- 鉴权：复用 `/api/audit` 同一把守（`requireRole(ACCOUNT_ROLE.ADMIN, { scope: TOKEN_SCOPES.auditRead })` —— `http/audit.ts:45`）
- 数据来源（**单源，不双写**）：服务端审计动作常量（`audit/audit.ts` `AUDIT_ACTIONS`）+ 字面量写入点；实现期二选一并以断言测试兜底
  1. 常量模块导出分层清单（`{prefix, actions[]}`）直接出参
  2. 静态清单 + 单测断言「清单与全仓 `action:` 字面量 + `AUDIT_ACTIONS` 全集一致」（防漂移）
- 缓存：可加短 TTL 或直接实时（动作集近静态；实现期取实时，最简）
- 契约影响：新增只读面 ⇒ 零影响；**不含**任何写操作

### 5.5 契约影响与向后兼容

- 四个 `admin` 端点（含 `GET /api/audit/actions`）为**新增只读面** ⇒ 对既有端点零影响
- `GET /api/assets` 扩 `status`/`owner` 为**加性入参**（无参 = 现状 ACTIVE 面） ⇒ 旧调用方无需改动；非管理档传参 ⇒ 忽略
- 下载事件表为**新表 + 新写入** ⇒ 对既有读面零影响；`download_count` 语义不变
- `GET /api/labels/all` 出参**形态变更**（数组 → 对象 + `assetCount`） ⇒ 当前零消费者（见 §5.4），破坏半径 0
- `DELETE /api/labels/:slug` **语义收紧**（有挂载 ⇒ 400 `label.in_use`） ⇒ 行为变更；既有前端无消费者（标签定义页本批新建），登记为「由更安全语义替换」

### 5.6 测试面

- 服务端
  1. `admin` 三端点：鉴权矩阵（未登录 401 / 用户 403 / 管理 200）+ 聚合口径（测试库造数断言）+ `days` 越界夹值
  2. `GET /api/audit/actions`：鉴权矩阵 + 分组结构（组内动作全为 `<prefix>.` 前缀）+ 与常量全集一致性断言
  3. `GET /api/assets` 扩参：非管理档传 `status`/`owner` ⇒ 结果与不传**逐条相同**；管理档 `status=ALL` ⇒ 含 `HIDDEN`/`ARCHIVED`；无参 ⇒ 仅 `ACTIVE`
  4. 下载事件：写入成功 + 事务回滚不落行 + 趋势聚合计入
  5. `/api/labels/all`：出参形状 + `total`/`limit`/`assetCount` 数值口径
  6. `DELETE /api/labels/:slug`：有挂载 ⇒ 400 `label.in_use`；无挂载 ⇒ 204；有子标签 ⇒ 仍 400 `parent.has_children`（回归）
- 前端
  7. 看板：4 数字卡 / 两张小图 / 榜单柱数 = `min(Top N, 实际)` / 英雄榜两卡；空态分支（下载序列全 null）
  8. 资产管理：过滤生效（状态/类型/标签/归属人）+ 行内只 1 个动作
  9. 审计日志：四档日期快捷 + 动作下拉分组 + 「更多筛选」5 维提交
  10. 标签定义：↑↓ 后 `PUT /order` 载荷正确 + 删除确认弹窗显示挂载数 + 上限提示文案

## 6. i18n 变更规格

### 6.1 组口径

- 新建组 `board`：管理看板专用文案（标题、口径说明、空态、按钮文案、Top N 标签）
- `admin` 组扩：`assets`（资产管理条目）+ 三页页面文案
- 键名以实现期落定为准，**键数不作为本节承诺值**（按 §9.6 在实现期回填实测）
- **组内用扁平点号键**（对齐 `assets` / `review` 组既有风格：`'col.name'`、`'status.pending'`、`'filter.status.active'`）—— 不新造嵌套组
- **四页逐页键表齐**（看板 · 资产管理 · 标签定义 · 审计日志；§6.2 + §6.3）—— 页面元素必须有键可依，不留「键从哪来」的实现期决策
- **声明「复用」的键必须实测存在**（`grep zh.ts`）—— 2026-09-23 v0.15/v0.16 实测抓到过一次假复用（`assets.status.*` 不存在）⇒ 已改为 `assets.filter.status.*`
- **本节键表的实测校验结论（v0.19 换靶第 4 轮 · 逐条机器核对）**：复用键 **34/35 在 zh+en 双侧存在**（唯一「未命中」的 `admin.assets` 属本表**新增项**，非复用声明）· 新增键 **16 项与既有零重名** · zh/en 顶层组 **完全对称（12 组）** · 「需落键」表中的键**不要求**预先存在（探针首版误把它当复用声明 ⇒ 48 条假缺陷，教训已记）
- **键写法两种**（踩坑记录）：含点的键在 i18n 里**带引号**（`'col.name':`），纯标识符键**不带**（`sortLabel:`）⇒ 任何校验脚本必须两种都认，否则会误报缺失（本轮探针因此误报 17 条）

### 6.2 需落键（口径示例，zh/en 成对）

| 组.键 | zh | en |
|---|---|---|
| `board.title` | 管理看板 | Dashboard |
| `board.trend.title` | 资产数和下载数趋势 | Assets and downloads trend |
| `board.trend.assets` | 累计资产数 | Cumulative assets |
| `board.trend.downloads` | 累计下载数 | Cumulative downloads |
| `board.trend.range.7` / `.30` / `.180` / `.365` | 近 7 天 / 近 30 天 / 近半年 / 近一年 | Last 7 days / … |
| `board.trend.empty.downloads` | 真库暂无下载历史（下载不入审计，只有累计计数） | … |
| `board.rank.title` | 排行榜 | Rankings |
| `board.rank.byPeople` / `.byLabel` / `.byAsset` | 人 / 标签 / 资产 | People / Labels / Assets |
| `board.hero.assets` / `.people` | 资产榜 / 员工榜 | Top assets / Top contributors |
| `admin.assets` | 资产管理 | Asset management |
| `board.kpi.assetsHint` / `.downloads7dHint` / `.pendingHint` / `.usersHint` | 全部资产 N 个 / 近 7 天新增 X 次 / 累计审核 N 件 / 全部账号 N | … |
| `board.creative.reviewSpeed` / `.concentration` / `.labelCoverage` / `.sleeping` | 平均审核时长 / 下载集中度 / 标签覆盖度 / 沉睡资产 | … |
| `admin['assets.desc']` | 全站资产治理列表（含隐藏 / 归档）；管理动作集中在资产详情页管理区 | All assets (incl. hidden / archived); admin actions live on the asset detail page |
| `admin['assets.col.owner']` | 归属人 | Owner |

**资产管理页的复用键声明（逐键实测存在，v0.16 重核 · 零新增）**
- **列名**：名称 `assets['col.name']` · 描述 `market['colDesc']` · 类型 `assets['col.type']` · 状态 `assets['col.status']` · 最新版本 `assets['col.version']` · 下载 `assets['col.download']` · 收藏 `assets['col.star']` · 更新 `assets['col.updated']` · 操作 `assets['col.actions']`；**归属人 = 上表新增**（`market.author` 语义为「作者/展示名」，与治理口径的「归属人（工号+姓名）」不同 ⇒ 不蹭键）
- **状态文案**：`assets['filter.status.active' | '.hidden' | '.archived']` = **已上线 / 已隐藏 / 已归档**（⚠️ 旧稿误写 `assets.status.*` —— **该键不存在**，已修）
  - **跨批文案修正（v0.18 · 用户 2026-09-23 拍板「已上线」）**：`zh.ts` 的 `assets.filter.status.active` 由「活跃」→「**已上线**」（**en 保持 `Active`** —— active/hidden/archived 是英文行业标准词，`Effective` 偏「生效日期」）。理由：① 「活跃」描述**活动量**、与 `ACTIVE`（对使用者开放）语义偏一层 ② 「已发布」**不可用** —— 已被**版本级** `version.status.published` / `versionLive` 占用，且**详情页同屏**（`AssetDetail.tsx:310` 资产状态徽标 vs 版本行）③「启用」撞 MCP `enabled` /「公开」撞已删的可见性维度。**影响面 = 3 个消费页**（`pages/AssetDetail.tsx:54`、`pages/Assets.tsx:98`（筛选 + 卡片/列表徽标）、本批资产管理页）+ 本设计内 8 处措辞；**零服务端影响、零新键**
- **类型文案**：`assets['type.skill' | '.mcp' | '.agent']`
- **搜索 / 空态 / 抽屉 footer**：`assets['filter.search']`（搜索名称或 slug）· `assets['empty.filtered']`（没有符合条件的资产）· `assets['action.open']`（打开详情）
- **排序 / 列菜单 / 视图 / 分页**：`market.sortLabel·sortNewest·sortDownloads·sortStars` · `market.colShow·colRequired·colReset` · `market.viewGrid·viewList` · `common.pageOf`
- 页头 eyebrow「ADMIN」= **语言中立常量**（不取 i18n，对齐门户 `TYPE_EYEBROW` 做法）
**本页新增键合计 = 2**：`admin['assets.desc']` · `admin['assets.col.owner']`（旧稿曾列 6 个新增 ⇒ 实测后压到 2 个）

### 6.3 审计日志页 / 标签定义页 键清单（v0.16 补 · 复用优先，逐键实测存在）

**（a）审计日志 `/admin/audit`**（组 `admin`，前缀 `audit.`）

| 元素 | 键 | zh | en |
|---|---|---|---|
| 侧栏 / 页头标题 | **复用** `admin.audit` | 审计日志 | Audit log |
| 页头描述 | 新增 `admin['audit.desc']` | 全站操作留痕（只读）；时间区间默认近 7 天 | Read-only activity trail; defaults to the last 7 days |
| 列·时间 | 新增 `admin['audit.col.time']` | 时间 | Time |
| 列·动作 | 新增 `admin['audit.col.action']` | 动作 | Action |
| 列·操作者 | 新增 `admin['audit.col.actor']` | 操作者 | Actor |
| 列·目标 | 新增 `admin['audit.col.target']` | 目标 | Target |
| 列·来源 IP | 新增 `admin['audit.col.ip']` | 来源 IP | Source IP |
| 列·请求 ID | 新增 `admin['audit.col.requestId']` | 请求 ID | Request ID |
| 列·操作 | **复用** `review['col.actions']` | 操作 | Actions |
| 匿名操作者行 | 新增 `admin['audit.anonymous']` | —（匿名） | — (anonymous) |
| 动作下拉默认项 | 新增 `admin['audit.actionAll']` | 全部动作 | All actions |
| 动作组名（**潜在全集 9 组** · 新增） | 新增 `admin['audit.group.asset' \| '.review' \| '.label' \| '.token' \| '.auth' \| '.device' \| '.namespace' \| '.ldap' \| '.oidc']` | 资产 / 审核 / 标签 / 令牌 / 登录 / 设备 / **命名空间** / LDAP / OIDC | Assets / Reviews / Labels / Tokens / Auth / Devices / **Namespaces** / LDAP / OIDC |
| 日期快捷 4 项 | 新增 `admin['audit.range.today' \| '.7' \| '.30' \| '.custom']` | 今天 / 近 7 天 / 近 30 天 / 自定义 | Today / Last 7 days / Last 30 days / Custom |
| 「更多筛选」开关 | 新增 `admin['audit.more']` | 更多筛选 | More filters |
| 维度标签 | 新增 `admin['audit.field.targetType' \| '.targetId' \| '.clientIp']`（目标类型 / 目标 ID / 来源 IP）；**复用** `audit.col.actor` · `audit.col.requestId` | 目标类型 / 目标 ID / 来源 IP | Target type / Target ID / Source IP |
| 详情抽屉字段 | 新增 `admin['audit.field.userAgent' \| '.detail']`（用户代理 / 原始详情）；其余复用 `review['detail.*']` 对应项 | 用户代理 / 原始详情 | User agent / Raw detail |
| 空态 / 分页 / 取消 | **复用** `admin.empty` · `common.pageOf` · `common.cancel` | 暂无数据 / {n} / {total} · 每页 {size} / 取消 | — |

**（b）标签定义 `/admin/labels`**（组 `admin`，前缀 `labels.`）

| 元素 | 键 | zh | en |
|---|---|---|---|
| 侧栏 / 页头标题 | **复用** `admin.labels` | 标签定义 | Label definitions |
| 页头描述 | 新增 `admin['labels.desc']` | 两级标签树（应用层锁两级）；仅超级管理员可维护 | Two-level label tree; super-admin only |
| 上限提示 | 新增 `admin['labels.quota']` | 已用 {used} / 上限 {limit} | {used} of {limit} used |
| 列·显示名 / slug / 类型 / 过滤可见 / 挂载数 | 新增 `admin['labels.col.name' \| '.slug' \| '.type' \| '.visible' \| '.count']` | 显示名 / slug / 类型 / 过滤可见 / 挂载数 | Display name / slug / Type / In filters / Attached |
| 列·操作 | **复用** `review['col.actions']` | 操作 | Actions |
| 新建按钮 | 新增 `admin['labels.create']` | 创建标签 | Create label |
| 类型徽标 | 新增 `admin['labels.type.RECOMMENDED' \| '.PRIVILEGED']` | 推荐 / 特权 | Recommended / Privileged |
| 表单字段（D30） | 新增 `admin['labels.field.slug' \| '.type' \| '.parent' \| '.visibleInFilter' \| '.nameZh' \| '.nameEn']` | slug / 类型 / 父级 / 过滤可见 / 中文名 / 英文名 | slug / Type / Parent / In filters / Name (zh) / Name (en) |
| 删除确认 | 新增 `admin['labels.delete.title' \| '.inUse' \| '.detachHint' \| '.ok']` | 删除该标签？ / 已挂载 {n} 个资产 / 请先在资产上解挂 / 确认删除 | Delete this label? / Attached to {n} asset(s) / Detach it from assets first / Delete |
| 空态 | 新增 `admin['labels.empty']` | 还没有标签，创建第一个标签 | No labels yet — create the first one |
| 取消 / 重试 | **复用** `common.cancel` · `common.retry` | 取消 / 重试 | Cancel / Retry |

> 两页新增键合计 = **24**（审计 16 + 标签 8 组簇）；其余全部复用既有键。键**数量**按 §9.6 实现期回填实测。

## 7. 接口变更总览（服务端面）

| # | 端点 | 类型 | 鉴权 | 归属 |
|---|---|---|---|---|
| 1 | `GET /api/admin/overview` | 新建（只读） | `role >= 10` | 本批 |
| 2 | `GET /api/admin/rankings` | 新建（只读） | `role >= 10` | 本批 |
| 3 | `GET /api/admin/trends` | 新建（只读） | `role >= 10` | 本批 |
| 4 | `GET /api/assets`（扩参） | 加性 | 门户不变 + 管理档全状态 | 本批 |
| 5 | `download_event` 表 + 写入 | 新建表 | 无（内部） | 本批（实现期） |
| 6 | `GET /api/audit/actions` | 新建（只读 · D23） | `role >= 10` | 本批 |
| 7 | `GET /api/labels/all` | **形态变更**（数组 → `{ items, total, limit }` + 每条 `assetCount` · D26/D27） | `role >= 100`（不变） | 本批 |
| 8 | `DELETE /api/labels/:slug` | **语义收紧**（有挂载 ⇒ 400 `label.in_use` · D27） | `role >= 100`（不变） | 本批 |

## 8. UI-UX 变动总览（本批用户可见变化）

1. 侧栏「管理看板」占位条目 → 真链接 `/admin`（不再轻提示）
2. 侧栏「管理」组新增「资产管理」子项
3. `/admin` 由重定向改为真看板；`/admin/labels` `/admin/audit` 占位页 → 真页
4. 新增一处空态样式（趋势下载序列无数据时的虚线占位）
5. 无权限用户看不到管理组（既有守卫语义不变；**不渲染灰按钮**）

## 9. 回归面与验证口径

### 9.1 零回归（硬约束）

- `/admin/reviews` 与 `/reviews/:id`（M4b-5 交付）行为不变
- 门户只读面（`/api/assets` 无参调用）语义不变
- 未登录 / 用户档访问 `/admin*` ⇒ 仍按既有守卫弹出，不出现空白页

### 9.2 门禁与冒烟顺序（复现 CI）

`install --frozen-lockfile → typecheck → lint → format:check → doc-audit → doc-claims-check → build → db:migrate → test`

### 9.3 本批 dogfood 分组

新建 `docs/smoke/scripts/m4b6-governance-dogfood.ts`，支持 `SMOKE_ONLY=<组>`；分组：① 权限矩阵（三档 × 五路由）② 看板数据面（三端点数值与页面一致）③ 控件交互（时间范围四档 / Top N 四档 / 三口径切换）④ 空态与稀疏（下载无数据、真库小样本）⑤ 标签定义 CRUD ⑥ 审计日志过滤 ⑦ 资产管理列表（**2026-09-23 F206 追加**：**⑧ 侧栏激活唯一性** —— 13 条导航路径各**恰 1 条** `[data-active=true]` + `/search` 零态 + F206 回归专条 = **15 条**；**2026-09-23 F207 追加**：**⑨ 顶栏形态 + 页内标题** —— 14 条路径「顶栏无 `h1` **且** 内容区有标题」+ 1 聚合条「顶栏 `h1` 计数 = 0」= **15 条**）

### 9.4 出口件 ④（本批验收清单）

看板（4 卡 + 两小图 + 单卡榜单 + 两英雄榜卡 + 创意四项）· 三页真页面 · 权限矩阵 · 零回归 · 服务端测试全绿 · `doc-claims-check.ts` 进仓并进门禁 · **侧栏激活唯一性**（G12：任一路径恰 1 条激活）· **顶栏形态 + 页内标题**（G13：顶栏无标题区 + 每页页内标题在位）。

### 9.5 造数需求（写库须用户授权）

为覆盖「下载曲线有数据」分支，需造 N 条 `download_event`（含跨天分布）+ 少量多状态资产（`HIDDEN`/`ARCHIVED`）。
脚本进仓，口令不落库。

### 9.6 规范与文档同步

- `docs/00` §5 M4b-6 行：状态 → **🔵 计划已立**（立项时回填 design 版本 + plan 版本 + Task 数）
- 主 design §2.3 批件登记表：补本批 design/plan 文件名与版本
- 两份 README（`docs/README.md` · `docs/designs/README.md`）**无需登记**：实测二者**都不含逐份文档清单**（分别是入口地图与设计层规则）⇒ 本批全部登记点 = `docs/00` §5 行 + 主 design §2.3 批件登记表 **两处**
- `docs/08` 数据模型：`download_event` 表落库时同步
- 本设计 §5.2 的「历史不可回溯」局限须同时登记到 `docs/00` §5 注记

### 9.7 收尾回填项（已由实现期实测填入 · 2026-09-23）

| # | 回填项 | 实测值（口径 / 出处） |
|---|--------|----------------------|
| 1 | 三端点出参 ↔ 页面消费点 | `overview`（KPI 5 + `types[]` · F203 加性补）↔ 看板四卡 + 同心环/雷达 · `trends`（`assets`/`downloads` 序列）↔ 趋势两张小图 · `rankings`（三口径 + 稳定键）↔ 排行榜单卡 + 英雄榜 ×2 · `/api/audit/actions`（8 组）↔ 动作分组下拉 |
| 2 | i18n 键数 | zh / en 叶子键 **各 534**（差集 **0**）· 本批 **+130 键**（404 → 534）· `board` 组 **39**（新组）· `admin` 组 **6 → 95**（+89，含 F205 补的 17 键） |
| 3 | 件行数（`wc -l`） | `AdminBoard` **645** · `AdminAssets` **625** · `AdminLabels` **574** · `AdminAudit` **565** · `api/admin.ts` **165** · `http/admin.ts` **68** · `http/admin.test.ts` **566** · `overview` **200** · `rankings` **116** · `trends` **134** · `chart.tsx` **340** · `combobox.tsx` **283** |
| 4 | dogfood 分组 PASS 数 | **PASS 71 / FAIL 0 / 超时 0**（G1–**G13** · 每段 `NO JS ERRORS`）· 首跑（T10 · 41 条基数）= 41/0 ⇒ **F206 追加 G12（15 条）41 → 56** ⇒ **F207 追加 G13（15 条）56 → 71** |
| 5 | 迁移 **0014** | `0014_simple_blizzard.sql` · **11 行** · 表 `download_event` · 索引 `idx_download_event_created_at` / `idx_download_event_asset_id`（2 条）· 迁移后表数 **16** |
| 6 | PoC 清理（U7） | `apps/web/src/pages/__proto/`（4 页 + 3 数据文件）· `tmp-dashboard-probe.ts` / `tmp-label-seed-child.ts` / `tmp-labels-audit-probe.ts` 已删；`main.tsx` DEV 路由与 `ComingSoon` 已移除 ⇒ `git status` 零残留 |

**实施期发现与处置（2026-09-23 · 实现批 T1–T10 期间）**

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F203** | §4.1 (e)(f) | 两图指向 §5.1，但该处未列 `types[]` 出参（实现者会漏取数） | 最小加性补 `overview.types[]`（`admin/overview.ts` + `admin.test.ts` 断言） |
| **F204** | 审计查询（§4.4 D48） | `select().from(auditLog)` 无 join ⇒ 拿不到「姓名」（D48 要求工号 + 姓名同列） | 补 `leftJoin` 出 `actorName`（`audit/query.ts`）+ 测试 |
| **F207** | 顶栏标题区（`TopBar.tsx`） | **用户报缺陷（2026-09-23）**：点侧栏「管理看板」/「资产管理」，**顶栏不显示对应名称**。根因 = `titleOf(pathname)` 是**手维护「路由 → 标题」表**（M4b-2 建立，只登记 reviews/audit/labels 三条），漏 `/admin` 与 `/admin/assets` ⇒ 两页 `return null` ⇒ 标题区整块不渲染（同族：与 F206 同为「手维护清单漏条」） | **用户拍板「甲」：删表**而非补两条 —— 事实基础：官方 `registry:ui` **无** header/topbar 件（63 件），顶栏只存在于 **block 示例源码**且标题**写死**（`dashboard-01` 的 `<h1>Documents</h1>`、`sidebar-07` 顶栏 Breadcrumb 每页硬编码）⇒ 官方无「路由 → 标题」机制；顶栏只留 `SidebarTrigger` + 右侧动作（`TopBar.tsx` **110 → 82 行**），页面名只在**页内**渲染（每页均有 `PageHeader`/`<h1>`，逐路由实测）；副产物：消除「顶栏标题 + 页内标题」同字重复。守护断言 = dogfood **G13**（正反双证：旧版 **12 FAIL** / 新形态 **16/0**） |
| **F206** | §4.1 形制 / 侧栏激活（`SideNav.tsx`） | **用户报缺陷（2026-09-23）**：点「管理看板」→ 再点「资产管理」，「管理看板」**仍为选中态**。根因 = 判定为「`EXACT_MATCH_PATHS`（`/` + `/dashboard`）精确、其余 `pathname.startsWith(to)` 前缀」⇒ **手维护精确集漏 `/admin`**（管理组分区父项）⇒ `/admin/*` 任一子页与父项**双亮**（同坑 M4b-3 T9④ 已在 `/dashboard` 上踩过一次 ⇒ 形态性复发） | 收敛为**全精确匹配**：删 `EXACT_MATCH_PATHS`（`navItems.tsx`）· `isActive = pathname === to`（`SideNav.tsx`）· 门户 `<NavLink>` 补 `end`（同源 `aria-current` 前缀问题）；dogfood **G12** 常驻断言防复发（正反双证：旧逻辑 **5 FAIL** / 新逻辑 **16 PASS**） |
| **F205** | §6 i18n（实现面） | 两页共 **28 处**硬编码中文（`aria-label` / `title` / `placeholder` / 空态 / 抽屉字段名）+ 1 行 stale DEV 提示 | 两页文案全部走 i18n（**F205 新增键 17 个**）；stale 行删除；`doc-claims-check` ⑤ 纳入门禁防复发 |

> 证据文件：`docs/smoke/2026-09-23-m4b6-governance-console.md`（门禁 · dogfood · 换靶校验 · 真库读数 · 未证项 4 条）。

## 10. 引用文件清单

| 文件 | 用途 |
|---|---|
| `apps/web/src/pages/__proto/DashboardProto.tsx`（1047 行） | 看板 PoC 形制来源（**不进仓**，真页落成后删） |
| `apps/web/src/pages/__proto/dashboard-data.ts`（2062 行） | 真库实测数据（PoC 静态喂入） |
| `apps/server/tmp-dashboard-probe.ts` | 真库聚合探针（临时，**不进仓**） |
| `apps/web/src/main.tsx:121,125-142` | 路由与占位页现状 |
| `apps/web/src/components/ui/navItems.tsx:104-131` | 侧栏管理组 / 超管组现状 |
| `apps/web/src/i18n/zh.ts:302-309` · `en.ts` 同构 | `admin` 组现状键 |
| `apps/server/src/app.ts:123-211` | 路由注册表现状 |
| `apps/server/src/http/{stats,audit,labels,assets}.ts` | 既有只读面 |
| `apps/server/src/assets/download.ts` | `download_count` 自增点（下载事件表写入位置） |
| `apps/web/src/components/ui/shadcn/chart.tsx` · `combobox.tsx` | 本轮引入的官方件 |
| `docs/06-label-system.md` · `docs/08-data-model.md` · `docs/05-identity-access.md` §6 | 标签模型 / 表家族 / 角色档 |

## 11. 8 维自检

### 11.1 自检与复评（第 7 轮 · UI 定案后）

> 口径：**8 维等权算术平均**（标准 4 维 + 深度 4 维）。本轮为**换靶**重评（角度：件表↔服务端改动↔端点表三向一致 · 修订记录声明回查实体 · 引用逐条回读 · 机制声明实测复核）。

| 维度 | 评分 | 说明 |
|------|:--:|------|
| 完整性（标准） | 9.5/10 | 四页规格齐（含 §4.7 四页线框 + **§4.9 UI 定案**）· 决策表 **D1–D51** 闭合且有序 · 服务端 8 项改动逐条给改法且 §3/§5/§7 三向对齐 · **数据口径与默认值 19 项封口（§2.4）** · **页面状态 URL 规格（§4.8）** · **资产管理页 i18n 键表齐（v0.15 补 6 新增键 + 复用声明）**；扣分项 = 下载事件表保留策略（U5，归属后续批）无口径 |
| 一致性（标准） | 9.5/10 | 「改动 N」编号 SSOT 化 · 术语统一「审计日志」· 自检节与未决登记随各轮刷新（F1/F2/U1–U4/U10 闭环 · U9/U11 登记）· 角色与主 design 一致 · §4.2 列宽口径统一（v0.15）· **键表组形式唯一（v0.19：删 §6.2 旧行，`audit.anonymous` 统一归 `admin['…']`）** |
| 清晰度（标准） | 9.5/10 | 每条决策带具体值（档位/阈值/口径/上限）；线框逐块对应 §4.1–§4.4；小节顺序有映射行兜底，不依赖位置 |
| 可实施性（标准） | 9.5/10 | 四页 + 服务端 8 项均可直接编码（含实测坑：小数刻度 / 末档不等距 / 负刻度 / 空态 / 级联误删 / 详情面授权集）；`label.in_use` = 400；列宽权重表 + CSS 变量写法内联；状态筛选默认值与 URL 默认对齐（D20）；**键表逐条机器核对（复用 34/35 · 新增零重名）** |
| 设计纯粹性（深度） | 9.5/10 | 单点控件（趋势时间范围 / 榜单 Top N / 页内折叠搜索）；同信息不重复（F1 闭环）；**件复用最大化：UI 定案 9 类件全部复用既有件，零新件零新依赖**（§4.9b）；状态徽标信噪比收敛（ACTIVE 轻字） |
| 边界覆盖（深度） | 9.5/10 | 覆盖：空态 / 稀疏数据 / 长窗口刻度 / 条数不足 / 权限四档 / 删标签级联风险 / 上限超限 / 排序失败回滚 / 非管理档传参 / 数组→对象形态变更破坏半径 / **跨日边界（`Asia/Shanghai` 日切断言）· 空集显「—」（创意四项 + 平均审核时长）· 匿名审计行 · 沉睡阈值假阳性（上架 <30 天不计）**；**v0.27 新增覆盖：`downloads` 两态（`null` 过渡态 / `0` 数值）· 排行榜并列稳定键**；未覆盖：下载事件表保留策略（U5）· 审计导出（U14） |
| 实施精度（深度） | 9.5/10 | 件路径与改动号逐行对应 · 迁移号 0014 与索引已定 · 出参字段定名 · 四页键表齐且**复用键逐条机器核对（34/35，v0.19）** · 列宽权重表 + 状态筛选默认值 + 抽屉可达性有实测依据；剩余仅「键数量 / SQL 行数」这类**非决策性**回填 |
| 跨平台（深度） | 9.5/10 | 纯前端 + 服务端聚合，无平台分支；按天聚合**已定为 `Asia/Shanghai` 常量**（D35，不再留「实现期再定」） |
| **综合** | **9.50/10** | 逐维相加 **76.0 ÷ 8 = 9.50**（v0.19 修完回归）（口径：8 维等权算术平均）。历史：9.25（换靶体检修完 15 条）→ 9.38（grilling 口径封口）→ **9.44**（UI 定案）→ **缺陷态 9.13**（换靶重查实测 73.0 ÷ 8 —— **该分只出现在对话报告里、未写入本文档，属流程偏差，已在 v0.15 修订行如实登记**）→ 9.44（v0.15 修完 4 项）→ 9.50（v0.16 键表实测重核）→ **缺陷态 9.31**（v0.19 换靶第 4 轮实测 74.5 ÷ 8：同键两形式 + 与 §6.1 组口径冲突 —— 修完回归）→ **9.50（v0.19）** → 历史续：**9.50（v0.16：grilling 第 3 轮 Q1–Q9 全落 · 键表实测重核 + 状态筛选 + 逐页键表齐，实施精度 9.0 → 9.5）**。**分数已同步（逐维 · 综合 · 修订记录；头部不含分数为既定口径）**；仍待用户定稿口令 |

### 11.2 自检发现与处置（首稿当场处置）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:--:|------|------|------|
| F1 | ✅ 已闭环 | §4.1(a)/(g) | 「累计下载」卡副行「Top10 占比」与创意项「下载集中度」是**同一数字两处展示**（违反「同信息只存一处」） | 用户 2026-09-23 拍板 **4C**：副行改为「近 7 天新增 X 次」（不重复、四卡形态保持一致）；「下载集中度」只留在创意项（D31） |
| F2 | ✅ 已闭环 | §4.4 | 审计日志「八维过滤」的八个维度未列清单，既有 `/api/audit` 过滤参数覆盖度未核 | 已实测核对：`auditQuerySchema` 八维齐备（`http/audit.ts:23-42`）⇒ §4.4 逐维列出，服务端**零改动**，仅补 `GET /api/audit/actions`（U2 闭环） |
| F3 | 🟡 | §5.2 | 下载事件表保留策略未定（无归档口径 ⇒ 长期无条件增长） | 已登记待拍板；本批先不做归档 |
| F4 | ✅ 已闭环 | §2.3 | `@base-ui/react` 为新依赖，需用户批准 | 用户已拍板 1-B（装 `@base-ui/react` 用官方新版 Combobox）⇒ §2.3 已改为「已批准」 |
| F5 | 🟡 | §5.1 | `days` 越界行为（夹值 vs 400）未拍板 | 已给推荐（夹到最近档，与前端选择器一致）⇒ **已闭环（v0.27：夹到最近档）**，正文 §5.1 落地 + 断言（§9.4 第 1 项 `days` 越界夹值） |

### 11.3 未决 / 缺口登记（含归属）

| # | 项 | 归属 |
|---|---|---|
| ~~U1~~ | ~~标签定义页交互（树操作形态 / 上限值来源 / 删除二次确认 / 翻译回退展示）~~ | ✅ **2026-09-23 已对齐**（D26–D30 · §4.3/§5.4） |
| ~~U2~~ | ~~审计日志八维过滤清单 + `action` 分组口径 + 日期区间默认值~~ | ✅ **2026-09-23 已对齐**（D21–D25 · §4.4/§4.4b）；服务端过滤面本已齐备，唯一新增 = `GET /api/audit/actions` |
| ~~U3~~ | ~~资产管理列定义 / 过滤维度 / 行内动作 / 分页形态~~ | ✅ **2026-09-23 已对齐**（D19/D20 · §4.2/§5.3） |
| ~~U4~~ | ~~F1 重复数字删哪一处~~ | ✅ **2026-09-23 已闭环**（用户「4C」⇒ D31） |
| U5 | 下载事件表保留策略（是否需要按天快照/归档） | 归属后续批（本批不做） |
| U6 | 用户管理 / 系统设置两页（仍占位） | 后续批 |
| U7 | PoC 物料（`__proto/` + DEV 路由）清理时机 | 本批实现收尾（§9.7 第 6 项） |
| U8 | ✅ **闭环**（2026-09-23 用户拍板 · v0.27） | `days` 越界值 ⇒ **夹到最近档**（`7/30/180/365` 中最近一档）；理由：该端点是**只读聚合**，选择器本身只出这 4 档，400 对前端无收益。正文 §5.1 已按此写 | 已闭环 |
| U9 | **运营单点**：标签定义仅超管（`>= 100`）⇒ 若环境中只有一个超管，标签改名/翻译/排序全压一人 | 风险已登记（D41 决定本批不改权限）；后续批判评估下放 |
| U10 | ✅ **闭环**（2026-09-23 用户拍板 **A**）：**维持门户原生** —— 列表态 = 整行可点开抽屉（操作态）· 卡片态 = 点卡片进详情页（`AssetCard` 自带覆盖层 `Link`，浏览态）；**`AssetCard` 不加 `onOpen` 槽**（零件改动） | 本批已定 |
| U11 | 资产管理页**归属人筛选无 UI 入口**（服务端 `owner` 参本批已交付）—— 需要选人组件 + 用户搜索面（属用户管理范畴） | 后续批（与 U6 同族） |
| U12 | ✅ **闭环**（2026-09-23 用户拍板） | 标签 `visibleInFilter` 的维护入口 = **创建 + 编辑对话框内的开关，默认打开**（不做列表列内切换）；服务端零改动（列 `default true` + 既有 `PATCH` 已接受该字段） | 已闭环 |
| U13 | 审计「仅看匿名操作 / 前缀级筛选」是否需要新服务端参数 | 实测：`actorId` 只能**精确匹配**（`audit/query.ts:34` `if (q.actorId) conds.push(eq(...))`），无法表达**为空**；`action` 同样只能精确匹配 ⇒ 「仅看匿名」「所有 `asset.*`」需各加 1 个可选参数。**推荐：本批不加** —— 匿名行绝大多数来自登录失败 ⇒ 用 `action=auth.login.failure`（零改动）即可覆盖等价排查；真库近 20 条实测**无匿名行**、亦无前缀级查询需求（YAGNI；后续批出现需求再加，改动仅 ~2 行 + 断言） | 暂不加（后续批按需） |
| U14 | 审计日志导出（CSV / 批量导出） | 兄弟仓审计页无导出、本页亦无入口；**推荐本批不做** —— 真要做得走**服务端流式导出**（而非前端拼 CSV，后者会被 limit 上界截断）。归后续批按需评估 | 后续批 |

## 12. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| **v0.31** | 2026-09-23 | **F207 顶栏标题漏项 → 用户拍板「甲」：顶栏回归官方 block 形态** —— ① 删 `TopBar.titleOf` 路由表（官方无「路由 → 标题」机制，见 §9.7 F207）· 顶栏构成 5 → **4 件** ② §9.3 追加 dogfood **G13**（15 条）⇒ §9.7 PASS **56 → 71** ③ §9.7 追加 **F207**（含正反双证）④ §9.4 补验收项 ⑤ 主 design **v1.67** 同步四处。**本版零服务端改动** |
| **v0.30** | 2026-09-23 | **F206 侧栏激活唯一性修缮**（用户报缺陷 · 提交面） —— ① 判定收敛为**路径精确相等**（删 `EXACT_MATCH_PATHS` · 门户 `<NavLink>` 补 `end`）② §9.3 追加 dogfood **G12**（15 条断言）⇒ §9.7 分组 PASS **41 → 56** ③ §9.7 追加 **F206**（根因 + 修法 + 正反双证）④ §9.4 补验收项。**本版零设计语义改动**（口径取代 M4b-2/M4b-3 旧文档的 `EXACT_MATCH_PATHS` 表述） |
| **v0.29** | 2026-09-23 | **实现落地回填（T1–T10）** —— ① §9.7 六项回填填实测值 ② 追加**实施期发现 F203–F205**（`overview.types[]` 加性补 · 审计 `actorName` leftJoin · 两页 28 处 i18n 泄漏 + 17 键）③ Status 补「实现已落地」④ 证据文件 `docs/smoke/2026-09-23-m4b6-governance-console.md`。**本版零设计语义改动** |
| v0.28 | 2026-09-23 | **定稿**（用户口令）：Status → 定稿（2026-09-23 批准）· 回填 `docs/00` §5 + 主 design §2.3（服务端 1 → **8 项**；范围补管理看板）· 跨文档版本 = docs/00 **v1.89** / 主 design **v1.65** |
| v0.27 | 2026-09-23 | grilling R4（含收口复核：Status 门槛清空 · 未决表重排 U5–U14）：Q1 `downloads` 两态 · Q2 排行稳定键 · Q5 三端点无缓存 · Q6 新增 U14（导出）· Q7 **U8 闭环**（夹值）；**Q3/Q4 撤回**（Q3 与 D45 重复 · Q4 与 D39 冲突） |
| v0.26 | 2026-09-23 | 定稿前体检：换靶第 5 轮（版本锚点/跨文档/映射/中立性/原型终态）· 未决表按编号重排 · Status → **定稿待口令**（门槛项仅 U8）· 无内容缺陷 |
| v0.25 | 2026-09-23 | 审计表格对齐资产中心：列宽改 **92% + 操作槽 8%**（修「操作列 0 宽 + 表横向溢出」）· §4.4 补「列宽口径」「对齐取舍」· 自纠 v0.20 时区注记误落 §6.3 文案列 |
| v0.24 | 2026-09-23 | 审计页**兄弟仓对标（SkillHub）** + 快捷三键〔近 24 小时/版本下架/清除筛选〕（零服务端改动）· 新增 U13（匿名/前缀筛选参数，暂不加） |
| v0.23 | 2026-09-23 | `visibleInFilter` 放回创建+编辑对话框（**默认打开** · 服务端零改动）· §6.3 表单键 5→6 · **U12 闭环**（不做列表列内切换） |
| v0.22 | 2026-09-23 | 二级标签层级视觉定值：缩进 22→**28px** + 二级 **2px 引导线**（实测校准，dev 库插 `agentic-rag` 样例）· §4.3 层级视觉行 |
| v0.21 | 2026-09-23 | 标签创建/编辑表单去 `visibleInFilter`（默认可见 · 零服务端改动）· §6.3 表单键去 `.visibleInFilter` · 新增 U12（可见性维护入口） |
| v0.20 | 2026-09-23 | 原型↔文档对齐同步：§4.4 组名清单补 `namespace`（潜在全集 9 · 实测 7）· §6.2 补 `admin['audit.group.namespace']` · §4.4「时间」列补 `Asia/Shanghai` 时区口径 |
| v0.19 | 2026-09-23 | 换靶第 4 轮修复：删 §6.2 旧行 `audit.anonymous`（同键两形式 ⇒ 统一 `admin['audit.anonymous']`）· §6.1 补机器核对结论与两类探针教训 · 复评 9.31 → **9.50** |
| v0.18 | 2026-09-23 | **状态文案定为「已上线」**（用户拍板）：`zh.ts` `assets.filter.status.active` 「活跃」→「已上线」（en 保持 `Active`）；排除项如实登记（「已发布」撞版本级且详情页同屏 ·「启用」撞 MCP `enabled` ·「公开」撞已删可见性维度）；影响面 = 3 消费页零代码改动 + 本设计措辞同步 + §6.2 跨批修正登记 |
| v0.17 | 2026-09-23 | 原型补齐 + 口径修正（用户「补」）：状态筛选（第 4 入口）落原型并真环境实测（`status` 依赖改动 4 ⇒ 当前不生效，属预期；「全部」显式传 `ALL`）· 页头计数块标签 →「**活跃资产**」（`/api/stats` 恒 ACTIVE 口径，实测 29 vs 全站 44）· 原型状态/类型文案对齐既有键 · 截图与依赖标注留档 |
| v0.16 | 2026-09-23 | grilling 第 3 轮 Q1–Q9 全落：键复用面实测重核（`assets.status.*` 不存在 ⇒ `assets.filter.status.*`；新增键 6→2）· 新增 `admin['assets.col.owner']` · 状态文案统一「活跃」· 两态呈现差异写明 · 状态筛选入口（默认「全部」= D20）· `q` 匹配面 · 抽屉可达性实测 · **§6.3 审计页/标签页键清单（四页键表齐）** · 列显示不持久化 · U11 登记 · 复评 9.44 → **9.50**（逐维 76.0 ÷ 8） |
| v0.15 | 2026-09-23 | 换靶重查修复轮（新角度：UI 契约 ↔ 真码回读 / 件路径存在性 / i18n 键覆盖 / 头部版本行）：§4.2「列（10）」行静态百分比类 → **权重** · 列宽行**内联权重表**（实现依据）· 头部删 stale **v0.3** 行（发现 `doc-audit` 盲区：只查版本行 ≤3、不查陈旧/乱序 ⇒ 已写进换靶脚本规则）· §6.2 补资产管理页 **6 新增键** + 复用键声明 · §3.1 脚本规则补两条 · **如实登记流程偏差**：缺陷态评分 9.13 仅报告未落文档（现补齐）· 复评 **9.44**（逐维 75.5 ÷ 8，修完回到 UI 定案水平） |
| v0.14 | 2026-09-23 | **列宽自适应**（用户追加）：隐藏列后可见列按权重**等比例摊开**（原行为实测 = 余量独吞给操作槽 87→335px）；实现 = CSS 变量 + 字面量 `w-[var(--cw-*)]` + 运行期归一化（可见列摊满 92%，操作槽 8%）；**零件改动**；实测：隐藏「描述」⇒ 名称 21.4% / 类型 9.3% / 归属人 13.3% / 操作恒 87px；隐藏「类型」「状态」后名称 23.8% → 26.7%，每步铺满 |
| v0.13 | 2026-09-23 | 补「收藏」列 + **排序接线**（用户报「缺星标列 / 排序混乱」）：列集 9 → **10 列**；`sort`/`dir` 改为 URL 状态并做白名单归一，**列头 ↔ 工具条排序菜单同源**（门户 `handleHeaderSort` 同口径）；根因如实记录 = 此前原型 `sorting` 为硬编码空回调 ⇒ 列头有排序图标但点击无效；实测三档：下载 desc（首行 `LangGraph RAG 检索技能 1.3K`）/ 下载 asc / 收藏 desc（`aria-sort` 同步） |
| v0.12 | 2026-09-23 | 列表态补「描述」列（用户追加）：列集 8 → **9 列**（名称/描述/类型/状态/归属人/最新版本/下载/更新/操作），列宽重排（名称 17 / 描述 25 / 类型 8 / 状态 8 / 归属人 12 / 版本 8 / 下载 8 / 更新 9 = 95% + 操作槽）+ 门户同列语法（`line-clamp-2` + **原生 `title` 全文 tooltip**）；**空值显「—」**（与抽屉同口径）；列显示菜单同步加「描述」项（可隐藏）；实测表宽 1081 / 描述列 **270px** / `line-clamp=2` / 空描述行显「—」 |
| v0.11 | 2026-09-23 | 抽屉补「描述」字段（`latestDescription`，与门户列表描述列同字段）· **U10 闭环**（用户拍板 A：维持门户原生两态点击行为，`AssetCard` 不加槽）· 实测抽屉描述渲染（真库 `m4b4-seed-page-21`） |
| v0.10 | 2026-09-23 | 补「卡片 / 列表」视图切换（用户追加）：官方 `ToggleGroup`（工具条最右 · 门户同位）+ 复用门户同件 `AssetGrid`/`AssetCard`（`status` 槽）/ `StatusPill`；默认列表 · 切换不落 URL/存储 · 列显示仅列表态；两态实测与截图留档；**两态点击行为差异登记 U10** |
| v0.9 | 2026-09-23 | UI 定案：立场 = ③ 详情抽屉 + ② 紧凑密度 · 对齐技能中心/MCP 中心语法（§4.2 重写）· 分页参数改回控制台 `limit`/`offset`（§4.8b，**撤回 Q5 原推荐 `?page=`**，依据：同壳 M4b-5 审核队列用 offset）· §4.9 改为 UI 定案（件复用 9 类 / tokens 零新增 / 官方 Sheet 口径 / 原型证据）· 复评 9.44 |
| v0.8 | 2026-09-23 | UI 设计编排：新增 §4.8（页面状态与 URL 规格 · 环节 0 收口）+ §4.9（UI 方向板 · 环节 1–3 · 待拍板）；§11.1 完整性行补记 UI 层未定稿 |
| v0.7 | 2026-09-23 | grilling 轮：新增 §2.4（D33–D51 · 19 项口径/默认值）· 修 §4.1(a) 待审口径错（`asset.status` 无 `PENDING_REVIEW`）· §4.1(b)(c)(d)(g) 口径补齐 · §4.2 初值参数 · §4.3 挂载数列可点 · §4.4 默认动作/操作者列/详情不脱敏 · §4.6 入口化与刷新策略 · §5.1/§5.2 改法更新（4 列表 + 事务回滚语义 + `Asia/Shanghai`）· §3.1/§9.2/§9.4 校验脚本进仓 · U9 运营单点登记 · 复评 **9.38**（逐维 75.0 ÷ 8；含本轮微调：边界覆盖 9 → 9.5 = 新增跨日边界/空集「—」/匿名审计行/沉睡阈值假阳性四类覆盖 · 跨平台行改为「已定 `Asia/Shanghai`」） |
| v0.6 | 2026-09-23 | 换靶体检修复轮：§3.1/§3.2 件表重写（4 页 + 9 服务端件 + 改动号列）· §5 编号 SSOT 化（`#` 列 = 改动号，补 §5.4b 改动 6）· §1.3 服务端 8 项对齐 · §9.6 删错误登记声明 · D26–D32 归位 · 术语统一「审计日志」（12 处）· §11.1 整表重写 + F1/F2/F4/U4 闭环 + U8 新增 · 8 维复评 8.31 → **9.25** |
| v0.5 | 2026-09-23 | 数字卡副行去重收口：D31（副行改「近 7 天新增」）/ D32（`label.in_use` = 400）· §4.1(a) 表改写 · F1 闭环 |
| v0.4 | 2026-09-23 | 标签定义面逐条对齐收口：D26–D30 · §4.3 改写 · §5.4 新增（改动 7/8：`/all` 出参扩 + 删除拦截）· §7 行 7/8 · §4.7 四页线框齐 · 未决 U1 闭环 · 8 维复评 9.13 |
| v0.3 | 2026-09-23 | 审计日志面逐条对齐收口：命名统一（「审计日志」）· 过滤区布局（常显 2 + 折叠 5）· `GET /api/audit/actions` 新端点（§4.4b 出参 + §7 行 6）· 表格 6 列与详情弹窗 · 日期默认近 7 天 · 未决 U2 闭环 |
| v0.2 | 2026-09-23 | 资产管理面逐条对齐收口：**读面 = 复用公开面扩 `status`/`owner` 两参（仅管理档生效、非管理档静默忽略）** · 页面形态（8 列 / 5 项过滤 / 行内只留「查看」/ `offset` 分页）· §5.3 改写为加性改法 + 测试面 · 未决 U3 闭环 |
| v0.1 | 2026-09-23 | 首稿：看板形制定稿落档（趋势拆两张小图 / 排行榜单卡三口径 + Top N Combobox / 英雄榜两张官方卡无 footer / 同心环 + 雷达 Dots / 创意四项）· 服务端 3 只读端点 + 1 处列表读面 + 下载事件表（拍板 B：仅入设计、实现期落）· 另三页范围已定交互待对齐 · 首稿 8 维自检（综合 ∉ 门槛，待对齐后重评） |
