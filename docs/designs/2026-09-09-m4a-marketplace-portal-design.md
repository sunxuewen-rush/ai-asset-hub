# M4a 市场门户设计

> Date: 2026-09-09
> Updated: 2026-09-09（v0.8：claude-design 环节补走——slop 自检 3.5→1.5 的 polish 增量回写：类型入口卡 icon 左置 + 真实计数（R7）/ 最新发布行式升级（R5/R6 字段）/ 光斑 alpha≤0.1 / 字体栈 MiSans 优先 / 动效 posture 规范（rise stagger + lift + reduced-motion）/ 数字 tabular-nums——§4.4/§8/§12 更新）
> Status: 定稿（2026-09-09：R1-R9 全部拍板 + 视觉环节收敛（风格板→demo→sketch→skillhub/GitHub 对标）+ grilling A-I 闭环 + 8 维重评 ≈9.3 ≥9 + 三族适用性实证——用户批准定稿；实现经 docs/plans/M4a-marketplace.md 驱动，里程碑收尾 converge 重评）
> Scope: M4a（00 §5）——公开市场门户：类型化浏览（skill/mcp/agent）· 搜索（q + label 筛选）· 资产详情（内容体验：skill.md 正文/文件树浏览预览/版本历史与行级对比/latest 下载）· PUBLIC 资产匿名可看 · zh/en 双语
> 引用链：本文档 → 规范 00 §2/§5/§7 · 01 §3 · 06 §2/§4/§5 · 07 全 · 08 §5/§7（引用不复制，字段与规则以规范为准）

## 1. 背景与文档定位

M0-M3 后端全部闭环（server 520 tests + typecheck 0 绿，HEAD 8761577）。M4 前端拆两子里程碑
（用户拍板）：**M4a 消费者视角公开门户先立，M4b 管理后台（审核队列 UI/标签管理/资产发布流）
后置并复用 M4a 组件基建**——发布/上传/审核 UI 一律不进 M4a（§2 边界）。

前置已就绪（代码实证）：apps/web 空壳基座（React 19 + Vite 6 + TS strict）；server 读面 API
（§5 实测契约表；错误 `{code,message}` 07 §4；camelCase）；PUBLIC 资产匿名读/下载已成立；
packages/protocol zod 消费单源；GET /api/labels 公开含 displayName 回退链。

流程定位：design（R1-R9 决策档案 + 视觉拍板 v0.3-v0.7）→ 视觉环节（portal-ui-design 编排：
风格板 → demo 迭代 → sketch 卡片三变体 → 详情页 skillhub 对标 + GitHub diff 细节）→
8 维自检/grilling → 定稿 → M4a plan → 编码测试 → converge。被否决方案不写入（v0.2 起纪律）。

## 2. 里程碑范围（R1——已拍板锁定，v0.7 详情内容体验扩入）

**M4a 边界（消费者视角，全程可匿名，只读门户）**：
- 首页介绍页：品牌 hero（居中版式）+ 按类型探索 + 最新发布
- 类型化浏览：技能/mcp/专家 三中心页（类型即路由）——无任何发布/上传入口
- 搜索：首页 hero 全局搜索 + 中心页类型内搜索 + 标签筛选条（横置）
- **资产详情页（v0.7 内容体验扩入）**：
  - 总览 tab = **主文档 markdown 渲染 + manifest 摘要回退**（v0.7 分型：skill 族 SKILL.md
    必需；mcp/agent 族 README.md 可选——存在渲染、缺失回退 mcp.json/agent.md 结构化摘要；
    原「README 渲染后置」决定**翻转**——消费者阅读正文是详情页主体体验，但 mcp/agent 包
    无 README 时以 manifest 摘要兜底不空窗）
  - 文件 tab = **目录树（可折叠）+ 文件点击预览对话框**（文本预览，G7）
  - 版本 tab = 版本历史 + **行级版本对比**（双下拉 base⇄head + 变更文件导航 + 行级 unified diff，G8——skillhub 完整对标 + GitHub 视觉细节）
  - 右栏：下载 latest 卡 + 元信息卡（作者/命名空间/可见性/时间/下载量）
- zh/en 双语（07 §2/§5）；标签/状态只读展示
- **含服务端最小支撑改动**：R4 匿名列表 / R5 展示字段 / R6 ownerDisplayName / R7 stats /
  R8 文件内容 / R9 版本 compare——见 §6（非纯前端）

**M4a out（后置，不混入）**：M4b（审核队列/标签管理/生命周期管理动作 UI + 资产发布流 +
真实登录——写操作与权限面；消费者只见状态徽章与标签展示）；M5 CLI；排序切换（下载/热度）；
社交面（star/评分/收藏）。

## 3. 页面结构与路由（R2——定案，v0.7 详情页更新）

五路由 + 状态 URL 化，类型即路由（TypeTabs 退役）：

```text
/                        首页（介绍）：hero + 按类型探索 + 最新发布
/skills                  技能中心（type=skill：页头 + 搜索 + 筛选条 + 卡片网格）
/mcps                    MCP 中心（type=mcp 同构）
/agents                  专家中心（type=agent 同构）
/assets/:nsSlug/:slug    资产详情：三 Tab（总览/文件/版本）+ 右栏下载·元信息
```

query：`?q=`/`?label=`（多值 OR）/`?page=`；版本 tab 对比对走组件内状态（URL 化可后置——
对比对为次要状态，M4a 保持组件内，share 语义弱）。路由库 react-router v7 ✓。

**中心页结构（v0.4 定稿）**：CenterHeader → 横置两级标签筛选条 → result-head → 4 列 × 5 行
卡片网格（20/页，对齐服务端默认 limit 20）→ 分页；响应式降列 <1200→3/<900→2。

**详情页结构（v0.7 定稿——skillhub 详情对标）**：
- 面包屑：首页 / 类型中心 / @ns/slug
- 头部：名称 + 可见性 pill + @命名空间徽章（独立，非作者）+ 标签行
- 主体宽版双栏：左主列三 Tab 玻璃卡（总览/文件/版本）+ 右栏 320px 粘性（下载卡 + 元信息卡）
- 应用壳（AppShell，v0.3 定稿）：顶栏通用 + 侧栏功能 + 底部开源出口——不变

## 4. 前端架构与组件树（R3——定案，v0.7 依赖破例 + 组件扩展）

### 4.1 依赖选型（v0.7 破例更新）

运行时依赖增量（R3 原「仅 react-router-dom」→ v0.7 按详情内容体验破例扩两条，plan 期锁定
版本）：**react-router-dom**（路由）+ **react-markdown + remark-gfm**（skill.md 正文渲染——
skillhub 同构 markdown 渲染方案；GFM 表格/列表支持）。diff 无库：**行级 hunks 由服务端 G8
计算返回**（skillhub 同构 server 侧），前端零 diff 依赖。数据 useApi 自研；样式 CSS Modules +
tokens；i18n 自研；类型消费 packages/protocol；图标 lucide 系 ISC。

### 4.2 组件树（v0.7：详情组件群入树）

```text
src/
├── main.tsx / api/（client/types/assets/labels/stats|content|compare）/ i18n/（zh|en）/
│   hooks/（useApi|useMarketQuery）
├── components/
│   ├── ui/                 跨面原子（M4b 直接复用层）
│   │   ├── AppShell.tsx · TopBar.tsx · SideNav.tsx
│   │   ├── TypeIcon.tsx · LanguageSwitcher.tsx · Badge.tsx · Pagination.tsx
│   │   ├── Spinner.tsx | EmptyState.tsx | ErrorState.tsx
│   │   ├── AssetAvatar.tsx（资产首字母方块 logo——名称 hash 取色，v0.6 正名）
│   │   ├── MarkdownRenderer.tsx（react-markdown 封装，skill.md/文档渲染；M4b 复用）
│   │   ├── FileTree.tsx（目录折叠树——文件/目录两级态；M4b 审核复用）
│   │   └── FilePreviewDialog.tsx（文件预览对话框；M4b 复用）
│   ├── market/
│   │   ├── Hero.tsx · TypeEntryCard.tsx
│   │   ├── CenterPage.tsx（type 参数化单组件）· CenterHeader.tsx · FilterStrip.tsx
│   │   ├── AssetCard.tsx（§4.4 结构命名）· VersionList.tsx
│   │   └── detail/          详情页专属
│   │       ├── DetailTabs.tsx（总览/文件/版本切换）
│   │       ├── OverviewTab.tsx（skill.md 正文 + meta 条）
│   │       ├── FilesTab.tsx（FileTree + FilePreviewDialog 编排）
│   │       └── VersionCompare.tsx（双下拉 + DiffWorkspace）
│   │           ├── DiffNav.tsx（变更文件导航 + changeType 徽章）
│   │           └── DiffView.tsx（文件头 +N−M 统计/折叠 + 行级 unified diff）
├── pages/  Home.tsx · Center.tsx · AssetDetail.tsx
└── styles/  tokens.css · global.css
```

复用边界：ui/ 跨面（M4b 直接消费——FileTree/FilePreviewDialog/MarkdownRenderer/AssetAvatar
等）；market/detail 面专属（VersionCompare 及 Diff 组件，审核侧若需行级 diff M4b 再升 ui）。

### 4.3 规模预估（v0.7 更新）

五路由 + ~24 组件 + 4 hook（+content/compare api 面）+ 2 i18n 资源 + markdown 样式
≈ 3200-3800 行（含样式），单文件 ≤200 行。

### 4.4 视觉基调与 tokens（v0.3 定档 + v0.6 卡命名 + v0.7 diff 细节）

气质：蓝色科技风 + 毛玻璃。核心 token 见 v0.3（品牌渐变/玻璃/类型色/字阶/6px 细蓝滚动条）。
类型图标与资产卡规格沿用 v0.3/v0.6（AssetAvatar 8 色板 + 卡结构命名一步到位）。

**详情页 tokens（v0.7）**：
- Tab 卡：玻璃卡 + 无下划线 tab 激活 = 底部 2px 蓝青渐变线（.tab-btn.on::after）
- Markdown 正文（总览）：正文 13.5/1.8 · h1 19/700 · h2 15/700 · code 内联浅蓝底 5px 圆角 ·
  pre 深色块 `#0f172a`/`#dbeafe` 12px mono · blockquote 左侧 3px 青边浅青底
- 文件树：目录行可折叠（▶ 旋转 90°）+ 文件行 sha 小徽章；mono 全树
- 预览对话框：居中白卡 720px/76vh + 遮罩 blur3 + mono 内容 pre-wrap
- **行级 diff（GitHub 视觉系）**：文件 section 头（chevron + 路径 mono + changeType 徽章 +
  右侧 `+N −M` 统计——GitHub 亮色系）；行三列 grid（old 行号 46px | new 行号 46px | 内容），
  行首 +/-/空格符号；新增行 `#1a7f37`（#e6ffec 底）删除行 `#cf222e`（#ffebe9 底）上下文灰——
  行级布局纪律：外层纵向排列 + 行内 grid 三列（防 grid 项错排重叠——v0.7 实证修复）
- changeType 徽章色：ADDED 绿 / MODIFIED 琥珀 / DELETED 红（浅底深字）

**首页 polish 增量（v0.8——claude-design 环节回写，slop 3.5→1.5 实证）**：
- 类型入口卡：icon 左置 44px 圆角 13 横向 grid（col1 跨行 + col2 内容——非上置居中）；
  卡内含真实资产计数（R7 typeCounts）+ 描述 + hover 箭头浮现
- 最新发布（竖排行式）：类型色点 8px → 名称 13.5/600 + @坐标·版本 mono → 右端 mono 元数据
  （⇣ 下载 + 作者·工号——R5/R6 数据源）
- 氛围光斑收敛：hero halo alpha ≤0.1（衬底不抢戏）
- 字体栈：`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'MiSans', 'Segoe UI', …`
  （内网零外字体，中文优先系统栈）
- 动效 posture：入场 rise 0.5s stagger ≤0.2s（hero 子元素）· hover lift -3px + 阴影升 ·
  `prefers-reduced-motion: reduce` 全关（demo 静态为主，实现期按此规范）
- 数字 `font-variant-numeric: tabular-nums`（统计/计数/下载量对齐）

## 5. API 消费面（实测契约 + 缺口处置 R4-R9）

### 5.1 读面端点实测表（v0.7：+G7/G8 呈请后定案）

labels（扁平含 parentId 可组树）/ assets（q·label 多值·type·nsSlug·limit≤100 默认 20·
offset·默认 updated_at desc）/ assets 详情（assetItem+labels）/ versions（曾公开族全见）/
version 详情 / download（302/200；YANKED 400；限流 429）——全匿名（R4 后列表）。stats（R7）。
错误 `{code,message}`。**R8/R9 新增端点见 §5.2 契约形状（定案）**。

### 5.2 契约缺口与处置（R4-R9 全部定案）

- **G1 匿名列表断点** → R4：GET /api/assets 撤 requireAuth + viewer 匿名化短路 PUBLIC-only
  （service.ts 实证：匿名 userId=null → 成员子查询空 → or() 坍缩 PUBLIC-only——参数化既有过滤）
- **G2/G3 列表展示字段/latest 版本** → R5：assetItem 补 latestVersion/latestName/
  latestDescription（join latest_version_id）
- **G4 排序参数** → 撤销后置：默认 updated_at desc 实测满足首页最新发布
- **G6 首页统计条** → R7：GET /api/stats 公开聚合——`{totalAssets, totalDownloads,
  typeCounts: Record<AssetType, number>}`（协议类型枚举驱动动态键）；聚合语义同匿名列表面
  （PUBLIC+ACTIVE），防泄露
- **G5 作者展示** → R6：assetItem 补 ownerDisplayName（join user_account.displayName——05 §3.1
  实证 LDAP 建号 userId=sAMAccountName 映射（工号）+ displayName 同步）；卡片/详情脚注渲染
  「displayName · userId」当 userId 为工号形态（非 `usr_` 前缀）；本地账号只显姓名
- **G7 单文件内容读取** → **R8（v0.7 定案）**：GET /assets/:ns/:slug/versions/:version/
  files/:path（path URL 编码，含目录分隔）→ 200 `{path, size, binary, truncated, content?}`
  （文本文件 content + truncated 阈值截断；二进制 binary=true 无 content——预览 UI 区分提示）。
  服务端从版本存储按 path 取单文件（实现路径：zip 解包索引或顺存对象，plan 实证选路）。
  **总览主文档按族解析（v0.7 补——族协议实证 docs/02/03/04）**：skill 族主文档 = SKILL.md
  （必需，root）；mcp/agent 族 = README.md（可选）——存在则渲染 markdown，不存在则前端回退
  manifest 结构化摘要（mcp.json/agent.md 字段卡）；总览组件按 type 分型取主文档 path
- **G8 版本行级对比** → **R9（v0.7 定案——用户拍板 M4a 即要行级 diff）**：
  GET /assets/:ns/:slug/versions/compare?from=&to= → `{ files: [{ path, changeType:
  ADDED|MODIFIED|DELETED, binary, hunks?: [{ lines: [{type: ADD|DELETE|CONTEXT,
  oldLineNumber, newLineNumber, content}] }] }] }`——服务端 diff 计算（文本文件行级 hunks，
  skillhub 同构），前端零 diff 库；二进制/截断标注。目录聚合为清单级（dir 项不入行 diff）
- 匿名/安全：R8/R9 均走 PUBLIC+ACTIVE 同面可见性（R4 语义），YANKED 版本 400（同下载语义）

### 5.3 详情页数据编排（v0.7 修正——两波，非 3 并发）

- 波 1（并发 2 请求）：资产详情 ∥ 版本列表——主面板与版本 tab 先渲染
- 波 2（1 请求）：latest 版本详情（文件清单/统计——依赖波 1 的 latestVersion，天然串行；
  原「3 请求并发」表述不成立已修正）
- 总览 tab：默认展示 latest 的 skill.md 正文 → G7 请求（path=SKILL.md；族协议主文档名——
  mcp/agent 族对应主文档约定，plan 实证）；tab 懒加载 + 缓存
- 文件 tab：目录树来自版本详情文件清单（含 sha/size/目录聚合）；文件点击 → G7 按 path 拉内容
  进预览对话框（已拉缓存）
- 版本 tab：历史列表（波 1/2 数据）；「对比」→ G8 compare（from/to 下拉变化即发）；
  变更文件导航点击滚动到对应 diff section
- 错误码本地化覆盖首期读面全集；R8/R9 4xx（YANKED/不存在/越权路径）本地化归组

## 6. 接口变更总览（R4-R9 全部定案，服务端面）

- R4：GET /api/assets 撤 requireAuth + viewer 匿名化短路 PUBLIC-only（登录态零变化）
- R5：assetItem 补 latestVersion/latestName/latestDescription
- R6：assetItem 补 ownerDisplayName（join user_account.displayName）
- R7：新增 GET /api/stats（聚合端点）
- R8：新增版本文件内容读取端点（G7 契约 §5.2）
- R9：新增版本 compare 端点（G8 契约 §5.2——diff hunks 服务端计算）

均落 server + 补测试（520 基线 + 新用例）；实现细则归 M4a plan。

## 7. 数据获取与状态约定（前端工程约束）

useApi 三态 + abort；分页 offset 替换式；搜索防抖 300ms 写 URL；空/错/载三件套；语言切换
即时 + 持久化 + 新请求携新 Accept-Language；详情页 tab/对比懒加载 + 响应缓存（useApi 层
Map<url, data> 简单缓存，防重复 G7 请求）；对比对非法自动调换（base 旧 → head 新）。

## 8. UI-UX 变动总览（v0.3-v0.7 全量）

- AppShell / 首页 / 中心页（筛选条 + 4×5 网格）/ 资产卡：沿用 v0.3-v0.6 定稿（§3/§4.4）；
  首页 v0.8 polish：入口卡 icon 左置 + 真实计数（R7）/ 最新发布行式升级 / 光斑收敛 / 动效
  posture（详 §4.4 polish 段）
- **详情页（v0.7）**：头部（名 + 可见性 + @ns 徽章 + 标签）→ 双栏（三 Tab 主列 + 320px 右栏
  下载卡/元信息卡）；总览 = skill.md markdown 正文；文件 = 折叠树 + 预览对话框；版本 =
  历史 + 双下拉行级对比（GitHub 细节：文件头 +N−M/折叠、行号双列、行色 #1a7f37/#cf222e）
- 类型色体系/品牌显示名（AI X Hub，00 D2 同步待定）/滚动条：沿用 v0.3
- 语义修正记录：@命名空间 ≠ 作者（作者=ownerDisplayName·userId 归元信息卡）；PUBLIC=可见性
  独立维度——demo v0.7 实证修正

## 9. 线框图（v0.3-v0.7；示意数据非设计硬值）

首页（居中 hero + 类型入口 + 最新发布）：

```text
┌ AI X Hub                                   🌐 中|EN    [👤 登录] ┐
│ ⌂首页 ✦技能中心 5,203 ⚙MCP中心 3,118 ◈专家中心 1,091  ★GitHub… │
├──────────────────────────────────────────────────────────────────┤
│                  AI X Hub（96px 渐变大字）                       │
│             发现和分享AI资源（24px 主句）                        │
│         使用AI X Hub构建强大的AI Agent（18px 灰）                │
│        [ 🔍 搜索技能、MCP、Agent…            ] [搜索]            │
│           [浏览市场] [了解资产类型]                              │
│        资产总数 · 累计下载 · 原生类型（stats API）               │
│        按类型探索（三入口卡：技能/MCP/专家）                     │
│        最新发布（skill/mcp/agent 三行）                          │
└──────────────────────────────────────────────────────────────────┘
```

中心页（技能中心示意；MCP/专家同构——筛选条上移 + 4×5 网格）：

```text
│ ✦ 技能中心 Skill Center                     [🔍搜…] [5,203]     │
│ 可复用 agent 技能包…                                            │
│ 标签筛选: [全部][检索类●][开发类][数据类]  [rag●][embedding]…    │
│ 共 N 个技能                         排序：最近更新 ↓             │
│ ┌──────┐┌──────┐┌──────┐┌──────┐                               │
│ │◼L 名 @ns││…    ││…     ││…     │   （4 列 × 5 行 = 20 卡/页）  │
│ │⇣1.3K v1.3││      ││      ││      │                           │
│ │描述两行…││      ││      ││      │                           │
│ │作者·工号││      ││      ││      │                           │
│ └──────┘└──────┘└──────┘└──────┘                               │
│ [‹ 上一页] 1 / N [下一页 ›]                                     │
```

详情页（v0.7 三 Tab + 右栏）：

```text
┌ AI X Hub                            🌐 中|EN    [👤 登录] ┐
│ ⌂首页 ✦技能 ●MCP ◈专家                              │
├──────────────────────────────────────────────────────────┤
│ 首页 / 技能中心 / @langchain/langgraph-rag                │
│ LangGraph RAG 检索技能  [PUBLIC] [@langchain]             │
│ #rag #official #retrieval                                │
│ ┌ 玻璃 Tab 卡 ──────────────────────────┬ 右栏 320px ────┐│
│ │ [总览●][文件][版本]                   │ 下载卡：        ││
│ │ skill.md v1.3.2·Apache-2.0…meta条    │ ⬇下载 latest    ││
│ │ # LangGraph RAG 检索技能             │ v1.3.2（主按钮）││
│ │ > 引言…  ## 特性 - 列表… 代码块       │ 1.3.2.zip·318KB ││
│ │ 文件: [▼reference/] [SKILL.md→弹预览]│ 60次/分限流      ││
│ │ 版本: [双下拉 base⇄head]             │ ────────────────││
│ │  SKILL.md MOD +2−1 ▼ 行级diff…       │ 元信息卡：      ││
│ │  [左导航:文件+徽章] [右行级diff区]     │ 作者 林晓峰·882015││
│ │                                     │ 命名空间@langchain││
│ │                                     │ PUBLIC/更新/下载 ││
│ └─────────────────────────────────────┴──────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## 10. 引用文件清单

- 规范：00 §2/§5/§7 · 01 §3/§6 · 06 §2.3/§4 · 07 全 · 08 §5/§7
- 代码：apps/server http/assets.ts · assets/service.ts · assets/version-read.ts ·
  http/labels.ts · labels/service.ts · db/schema/users.ts · packages/protocol/src
- 视觉参照（公开）：skillhub（Apache-2.0）——首页/卡/详情页形态、skill-version-compare
  双下拉 + 文件导航 + 行级 diff、FileTree 折叠、MarkdownRenderer；GitHub commit diff 视觉
  （文件头 +N−M/行号双列/行色）——用户指定参照 commit 8761577
- 图标：lucide（ISC）；MCP 官方标识（mcp 造型 Clean Room 自绘）
- 流程：portal-ui-design · sketch（卡片三变体）
- 评审物料（不进仓）：/tmp/m4a-styleboards/demo-m4a.html（v0.8：首页 polish + 详情内容体验
  全功能可交互）+ cd-polish-home.html（claude-design polish 对照版）

## 11. 规范同步项

- 00 §5：M4 行注记拆 M4a/M4b（收尾时）
- 00 §3 D2：UI 显示名 AI X Hub 走视觉；正式定名确认后同步（定稿评审确认）
- 07：navigation 组首期文案 + 详情 tab 文案（总览/文件/版本）demo 拍板；agent 中文「专家」
- 05：R6 实证 §3.1 已覆盖 displayName 同步，无需变更；ownerDisplayName 为读面投影
- 01/02-04：族协议主文档名（skill.md 及 mcp/agent 对应主文档）——G7 path 约定 plan 实证后
  如需规范表述回写族协议
- 卡片/tokens/diff 视觉不进规范层（实现细节，tokens.css）

## 12. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-09 | sunxuewen-rush | 草稿：范围（R1）/路由（R2）/架构组件树（R3）/API 消费面 + 缺口呈请（R4/R5）/i18n/线框 |
| v0.2 | 2026-09-09 | sunxuewen-rush | R2-R5 拍板按推荐定案；被否决选项清理 |
| v0.3 | 2026-09-09 | sunxuewen-rush | 视觉收敛：蓝科技毛玻璃/五路由/AppShell/hero/类型色/图标/品牌显示名/G4 后置/tokens |
| v0.4 | 2026-09-09 | sunxuewen-rush | 中心页+卡片定稿：筛选条横置/4×5 网格/卡终版（sketch V2×V3）/Avatar/G5 呈请 |
| v0.5 | 2026-09-09 | sunxuewen-rush | G5 定案（R6）：LDAP 实证 ownerDisplayName；三中心同构确认 |
| v0.6 | 2026-09-09 | sunxuewen-rush | 8 维自检修复：G6→R7（stats 聚合端点）；Avatar 色板入档；资产卡正式结构命名一步到位 |
| v0.7 | 2026-09-09 | sunxuewen-rush | 详情页内容体验定稿：总览=skill.md markdown 正文（README 后置翻转）；文件树折叠+预览对话框；版本行级对比（skillhub+GitHub 细节）；G7→R8（单文件内容端点）、G8→R9（compare hunks 端点）双契约 §5.2；依赖破例 +react-markdown/remark-gfm（diff 零库，服务端 hunks）；组件树 detail 群 + FileTree/FilePreviewDialog/MarkdownRenderer ui 化；§5.3 两波编排修正；线框 §9 更新 |
| v0.8 | 2026-09-09 | sunxuewen-rush | claude-design 环节补走（流程完整性）：首页 polish 增量回写——类型入口卡 icon 左置 44px + 真实计数（R7 typeCounts）；最新发布竖排行式（类型点 + 坐标 mono + ⇣下载/作者——R5/R6 数据源）；氛围光斑收敛 alpha≤0.1；字体栈 MiSans 中文优先；动效 posture 规范（rise stagger 0.5s ≤0.2 / hover lift -3px / reduced-motion 关）；数字 tabular-nums。slop 自检 3.5→1.5 实证留档 |
