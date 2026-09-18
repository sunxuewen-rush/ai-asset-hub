# M4b-1 地基批设计（组件归位 + 控制台组件面域）

> Date: 2026-09-14
> Updated: 2026-09-17（**v1.7：D′ 项「输入框内按钮改 `InputGroup`」收口** —— 该合规项原以「hero 搜索行为 `Input`+`Button` 并列 ⇒ 官方硬规则 5 不适用」豁免；用户 2026-09-17 拍板改为**框内形态**并已落地（M4a 门户 design **v0.29** §8.9），豁免口径作废）
> **头部口径（2026-09-18 起）**：只留最近 1-2 版 · 不复述历史与验收数字；完整历史见 **§11 修订记录**。
> SSOT：自检分 → 对应 design 的自检节 · 实测值与断言数 → `docs/smoke/` 证据文件 · Task 状态 → 本文件 §2（若适用）。
> Status: **定稿**（8 维自检 **9.63** ≥9——**实测值**，2026-09-14 按维表逐维打分；上游主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md` §2.3 的子批之一；主 design 版本随其自身演进，**以其版本头为准**）
> Scope: **仅 M4b-1（地基批）**——把手搓展示件归位到 shadcn 官方件 + 补装官方件 + 建控制台面域组件与跨面件 + 合规清理；**零路由新增、零页面新增、零服务端改动**
> 引用链：本文档 → 上游主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（模型/契约/路由/视觉基线/拆批表；**版本随主 design 演进，以其版本头为准**）→ 规范 `00` §5/§7 · `07` · M4a design **§4.4**（全站视觉真值 SSOT，引用不复制）；官方硬规则源 = 本机 `~/04-ws/00-ui/skills/shadcn`（SKILL.md + rules/*，2026-09-14 实测）

## 1. 背景与批界

**为什么要拆批**：主 design 的 M4b 原为「9 视图 + ~26 组件 + 2 处服务端改动」的单块，一次立 plan 会导致
任务清单过长、对齐/实现粒度失控。用户 2026-09-14 拍板拆为 **M4b-1 … M4b-6** 六个子里程碑，
**一个一个对齐 → 立 plan → 实现 → 收敛**（拆批表见 主 design §2.3）。

**M4b-1 在依赖链的位置**：本地基批是其余五批的**共同前置**——门户与后续控制台都在同一批官方件上生长，
故必须在任何新页面之前完成（否则会出现「门户手搓件 vs 控制台官方件」的双栈混搭期，
这正是 M4a 视觉体系切换要消灭的状态）。

**本批性质**：**重构（组件来源归位）+ 基建（新增组件面域）**，**不是**视觉重设计。
除下文 §8 明列的观感变化外，**页面结构、路由、数据编排、交互语义零变更**。

**批界（In / Out）**：

- **In**：14 处手搓件的官方件归位 · 官方件补装 · `components/console/**` 面域创建 · `components/ui/**` 跨面件 4 件 ·
  合规清理 4 项 · i18n 资源组骨架（键结构占位）
- **Out**（相邻批，不在本批）：任何**路由/页面**（→ M4b-2…6）· **认证与会话**（→ M4b-2）·
  **服务端改动**（R6/R6-b → M4b-4；`reviewComment` 投影 → M4b-3）· 控制台各业务域子组件
  （`console/{reviews,labels,assets,tokens,audit}/**` → 各自批次）

## 2. 拍板结果（本批）

### 2.1 组件形态拍板（用户 2026-09-14）

| # | 议题 | 拍板结果 |
|---|------|---------|
| **A′** | `Card` 归位形态 | **接受官方默认**（`rounded-xl`(14px) + 1px `border` + `py-6 gap-6` + `CardContent px-6`）；**不做**调用点覆盖。AIH 页面级卡原 18px 无边框随之收敛为 14px 有描边（见 §8） |
| **B′** | `Dialog` 归位形态 | **接受官方默认**（含 1px 描边与内置 ✕）；**尺寸用 `className` 覆盖**（属布局，官方允许） |
| **C′** | 筛选条 chip 形态 | **固定小集合 → `ToggleGroup`（+`ToggleGroupItem`）**；**动态数量的标签 → `Toggle` + `cn()`**（不引手搓三段常量） |
| **D′** | 其余合规项 | `ErrorState` 壳改官方 **`Alert`** · 输入框内按钮改 **`InputGroup`**（**✅ 已落地 2026-09-17**：首页 hero 搜索行改官方 `InputGroup` 框内形态 —— 用户拍板；原「并列 ⇒ 不适用」豁免口径**作废**，见 M4a 门户 design **v0.29** §8.9） · 条件类统一 **`cn()`** · 补装 `toggle`/`toggle-group`/`input-group`/`alert`（**零新 npm 依赖**） |
| **E** | 依赖清单 | 按已授权执行（`cmdk` / `react-day-picker`+`date-fns` / `@tanstack/react-table`）；`command`+`calendar` 实战消费点在 M4b-4/6（本批仅落位） |
| **F** | 工具纪律 | **本批起 registry 情报与落地一律走 CLI**（`bunx --bun shadcn@latest search|view|docs|add|add --dry-run|add --diff`）；**禁手工从 GitHub 抓文件**；未获用户批准**禁 `--overwrite`** |

### 2.2 官方硬规则（本批起适用，引用不复制）

shadcn 官方 Agent Skill（本机 `~/04-ws/00-ui/skills/shadcn`）的 16 条硬规则已沉淀为
技能 reference `shadcn-ui-v4-adoption/references/official-skill-hard-rules.md`。本批**强相关**的五条：

1. **`className` 只做布局**（`max-w-*`/`mx-auto`/内距），禁覆盖颜色与排版 → 改外观走
   ① 内置 variant ② 语义 token ③ CSS 变量（主题层）④ **改组件源码加 variant** ⑤ 包装组件
2. 2–7 个选项的切换 → `ToggleGroup`；输入框内带按钮 → `InputGroup`
3. callout → `Alert`；空态 → `Empty`；载态 → `Skeleton`/`Spinner`；徽章 → `Badge`
4. `Dialog`/`Sheet` **必须带 Title** · `Avatar` **必须带 `AvatarFallback`** · 覆盖层**禁手写 z-index**
5. 条件类用 `cn()`（禁手写模板串三元）

### 2.3 归位判据（为何「不自己画」在替换中仍成立）

归位 = **组件来源从「自绘」变为「官方件 + 官方扩展机制」**，因此：

- 官方件**默认值**就是新真值（A′/B′），不再用 className 把官方件「掰」回旧值；
- 站点级差异（AIH 的 `--success`/`--warning`、类型色）走**官方认可的 token / 变体路径**（§3.5、§3.10）；
- 业务语义（状态映射、坐标、文案）仍属 AIH，登记在 主 design §10.1，不在本批改写。

## 3. 组件归位规格（14 处）

> 「消费点」= 当前引用处（实测）；「视觉净变化」= 归位后用户可见差异（无 = parity）。

| # | AIH 手搓件 | 官方件 | 消费点 | 归位方式 | 视觉净变化 |
|---|-----------|-------|--------|---------|-----------|
| 3.1 | 各页手写卡容器（`rounded-2xl bg-card shadow-sm` / `rounded-xl …`） | `Card` + `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` | `Hero.tsx:54` · `CenterPage.tsx:143` · `AssetDetail.tsx:177` + 嵌套卡 13 处 + `FilterStrip.tsx:72` · `DetailTabs.tsx:35` | **官方全组合结构**，内距用 className 调（布局允许） | 🔴 页面级卡 **18→14px** + 全站卡 **+1px 描边** |
| 3.2 | `market/detail/FilePreviewDialog`（自绘 overlay + `role="dialog"` + 手挂 Esc） | `Dialog`（`DialogContent`） | `FilesTab` | 官方件 + className 覆盖尺寸（`w-[min(720px,88vw)]` / `max-h-[76vh]`） | 🟡 **+1px 描边**（B′）；行为增强：**焦点陷阱 / 滚动锁 / 内置 ✕** |
| 3.3 | `market/detail/DetailTabs`（自绘 `role=tablist/tab/tabpanel`） | `Tabs` + `TabsList variant="line"` + `TabsTrigger` + `TabsContent` | `AssetDetail` | 官方件；激活指示覆盖为 AIH 真值（**实底 `--primary` 2px 下划线**）；`TabsContent` 加 **`forceMount`** 保留「切过的面板缓存」语义 | 🟡 激活指示样式**需覆盖**（`line` 变体非下划线原生）；行为增强：**键盘左右切换 / `aria-controls`** |
| 3.4 | `market/detail/FileTree`（自绘 `aria-expanded` 折叠） | `Collapsible`（+`CollapsibleTrigger`/`Content`） | `FilesTab` | 官方件（**零样式包装**），层级/缩进仍由 AIH 逻辑生成 | ⚪ **零变化** |
| 3.5 | `ui/Badge`（自持 5 tone） | `Badge`（**源码加 variant**：`success` / `warning`） | `DiffNav` · `DiffView` · `VersionCompare` | 官方 `badge.tsx` 的 `cva` 增两 variant（用 `--success`/`--warning` token，官方第 ④ 条路径）；AIH 侧保留**薄映射**（`tone` → `variant`）以零改调用点 | 🟢 形态：`rounded-full` + `px-2 py-0.5 text-xs`（原 10.5→11px 已归位，本批复核） |
| 3.6 | `ui/AssetAvatar`（类型色实底字母） | `Avatar` + `AvatarFallback` | `AssetCard` | 官方件；尺寸/圆角用 className；**必须带 Fallback**（硬规则） | ⚪ 零变化（8 色板 hash→色序不变） |
| 3.7 | `ui/Spinner` | `Spinner`（官方 15 行）+ `Skeleton` | 原 **6 处**（`AssetDetail` · `CenterPage` · `FilePreviewDialog` · `OverviewTab` · `FilesTab` · `VersionCompare`） | 官方件替换；按钮内 loading 走 `Spinner` + `data-icon` + `disabled`（硬规则） | 🟡 **载态形态按官方用法拆分**（T4 实测：原「6 处 `Spinner`」口径推翻 ⇒ **页面级 `Skeleton` 4 文件**〔`CenterPage` 8 卡壳 · `AssetDetail` 头卡+正文 · `OverviewTab` 4 行×2 · `FilesTab` 4 行〕+ **局部 `Spinner` 2 文件**〔对话框内 · 版本对比内〕）；`ui/Spinner.tsx` **整件删除**（git rm） |
| 3.8 | `ui/EmptyState` | `Empty`（+`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent`） | `CenterPage` | 官方结构；文案与「空态两套文案」策略保留 | 🟢 结构官方化；形态以官方为准 |
| 3.9 | `ui/ErrorState`（自绘错误条） | `Alert` + `AlertTitle` + `AlertDescription` + `Button`（重试） | `AssetDetail` · `CenterPage` · `OverviewTab` | 官方 `Alert` 作壳，重试逻辑与按 code 本地化保留 | 🟡 形态官方化（描边由 `Alert` 决定） |
| 3.10 | 各页载态（手搓 padding/占位） | `Skeleton` | 各列表/详情载态 | 官方 `Skeleton`；色值 `bg-accent` 若与 AIH 面不一致 → **走 token（主题层）而非逐点覆盖** | 🟢 载态骨架官方化 |
| 3.11 | `ui/Pagination`（手搓 + 官方 Button） | `Pagination` + `PaginationContent`/`Item`/`Link`/`Previous`/`Next`/`Ellipsis` | `CenterPage` | 官方子件承载 **offset 替换式** 逻辑（翻页回顶 / 竞态 abort / 末页判定**不变**） | 🟡 **居中** = 真值 **`justify-center`**（非 `mx-auto`：`w-full` 下 `mx-auto` 解析为 0px，T5 实测）；控件 = 官方 `PaginationPrevious`/`Next`（**用户 2026-09-14 拍板 (c) 严格用官方**）渲染 **`<a>`** · 无 `href`/`asChild` ⇒ **鼠标可点、键盘不可达** · 标签与 `aria-label` **英文硬编码**（两条代价已登记）；尺寸 = 官方 `size=default`（控件高 **36** / 行高 **58**，原 h-8/54）；末页表达 = `aria-disabled` + 不挂 `onClick` + `pointer-events-none opacity-50`；**「翻页回顶」原为契约-代码不一致 ⇒ 补实现**（`window.scrollTo({top:0})`） |
| 3.12 | `AssetDetail` 手搓面包屑 | `Breadcrumb` + `BreadcrumbList`/`Item`/`Link`/`Page`/`Separator` | `AssetDetail` | 官方件替换 | 🟡 **非零变化**（T5 实测 4 处，官方默认为新真值 · **用户 2026-09-14 拍板「全按官方」**）：字阶 12→**14px**（`text-sm`）· 分隔符 `/` → **`ChevronRight`**（14px · `aria-hidden`）· 链接色 `#1447e6`（primary/500）→ **`#64748b`**（slate-500/400）+ hover 变深且去下划线 · 当前项 `<b>` → **`BreadcrumbPage`**（`span` + `role=link` + `aria-current=page`）；项间距 `gap-10px` |
| 3.13 | `VersionCompare` 双原生 `<select>` | **本批不动**（原生 select 是 M4a 有意保留：换原语 = 行为变更） | — | 保留 + 注释说明；如需换另立 | ⚪ 零变化 |
| 3.14 | `market/Hero` / `DiffView` / `DiffNav` / `ui/TypeIcon` / `ui/MarkdownRenderer` | **官方无对应件** | — | **保留手搓**（官方 registry 63 件实测无 hero/diff/type-icon/markdown 件；sidebar-11 仅作文件树参照） | ⚪ 零变化 |

## 4. 官方件补装清单（新落仓 **11 件** · 表列 13 项）

> 落点 = `apps/web/src/components/ui/shadcn/`（项目 alias `ui`，见 `components.json`）。
> 「性质」= **源码落仓**（写文件进仓，不动 lockfile）／**新增 npm 依赖**（动 `apps/web/package.json` + `bun.lock`）。
>
> **计数口径（2026-09-14 修正）**：本表按**表列项**编号共 **13 项**；其中**新落仓源码件 = 11 件**（§4.1–§4.10，`toggle` + `toggle-group` 计两件）· **新增依赖 = 4 个包 / 3 组**（§4.9 `cmdk` · §4.10 `react-day-picker` + `date-fns` · §4.11 `@tanstack/react-table`）· §4.11 = 官方 recipe（无源码件）· §4.12 `login-03` **延后至 M4b-2** · §4.13 的 9 件 M4a 已在仓，本批**首次消费**。

| # | 件 | npm 依赖 | 性质 | 本批用途 / 后续消费批 |
|---|----|---------|------|---------------------|
| 4.1 | `field` | 无（`cn`） | 源码落仓 | 本批落位；消费 → M4b-2 登录 / M4b-4 抽屉 / M4b-6 标签编辑 |
| 4.2 | `empty` | 无 | 源码落仓 | 本批（§3.8） |
| 4.3 | `spinner` | 无 | 源码落仓 | 本批（§3.7） |
| 4.4 | `alert-dialog` | 无（`radix-ui`） | 源码落仓 | 本批落位；消费 → M4b-3 撤回 / M4b-4 危险动作（`ConfirmDialog`） |
| 4.5 | `popover` | 无（`radix-ui`） | 源码落仓 | 本批落位；消费 → M4b-4 标签选择器 / M4b-6 日期 |
| 4.6 | `alert` | 无 | 源码落仓 | 本批（§3.9） |
| 4.7 | `toggle` + `toggle-group` | 无（`radix-ui`） | 源码落仓 | 本批（§6.1 FilterStrip） |
| 4.8 | `input-group` | 无 | 源码落仓 | 本批落位；消费 → M4b-2 Hero/门户搜索行（§6.2） |
| 4.9 | `command` | **`cmdk`** | **新增 npm** | 本批落位；消费 → M4b-4 标签选择器（可搜索） |
| 4.10 | `calendar` | **`react-day-picker` + `date-fns`** | **新增 npm** | 本批落位；消费 → M4b-6 审计日期区间 |
| 4.11 | Data Table recipe（`@tanstack/react-table`） | **`@tanstack/react-table`** | **新增 npm** | 本批落位；消费 → M4b-1 §5.2 `DataTable` 及 M4b-3…6 全部表格 |
| 4.12 | `login-03` **block** | 无 | **M4b-2 用时 CLI 落地**（T1 曾落仓后移除——见 plan 落地记录执行期修正 1：demo 文件零消费者 + 自带 6 条 a11y 违规，不宜常驻） | 取 `field` 组合作登录页基座；消费 → M4b-2 |
| 4.13 | `breadcrumb` / `card` / `tabs` / `pagination` / `collapsible` / `avatar` / `badge` / `dialog` / `skeleton` | 无 | **已在仓**（M4a T2 落位，本批首次消费） | 本批（§3） |

**依赖纪律**：新增 npm 依赖 **4 个包 / 3 组**（`cmdk` · `react-day-picker`+`date-fns` · `@tanstack/react-table`）——
用户 2026-09-14 已授权；落位后必须跑 `bun install` + 全门禁，且 **`bun.lock` 同批提交**。

## 5. 控制台面域组件与跨面件规格（6 + 4）

### 5.1 `components/console/` —— 面域组件（个人面 + 治理面共用）

| 件 | 官方件组合 | 规格真值 |
|----|-----------|---------|
| `PageHeader` | 无官方对应（`Card` 内组合） | 标题（`text-xl font-semibold`）+ 副述（`text-sm text-muted-foreground`）+ 右侧动作槽（`CardAction` 语义） |
| `DataTable` | `Table` 全族 + `@tanstack/react-table`（官方 recipe 模式） | 列定义驱动；**表头高 40 / 单元格 `p-2`**（主 design §10.1 待拍板项，本批沿用 40 档）；载态 `Skeleton` 行；空态 `Empty`；错态 `Alert`；行内动作槽 |
| `Drawer` | `Sheet` 封装 | **宽 560**（`sm:max-w-[560px]`，主 design §10.1 待拍板项取 560）；**必须带 `SheetTitle`**；遮罩 `bg-black/50`；**禁手写 z-index** |
| `ConfirmDialog` | `AlertDialog` 封装（官方 customization §4 示例形态） | 危险确认专用；`AlertDialogTitle` + `AlertDialogDescription` 必填；确认钮 `variant="destructive"`；**支持「需输入原因」变体**（`field` + `Textarea`，对应 yank 的服务端 `reason` 必填） |
| `StatusPill` | `Badge`（`variant="success"｜"warning"｜"destructive"｜"secondary"`） | 资产三态 → ACTIVE=`success` / HIDDEN=`warning` / ARCHIVED=`secondary`；版本八态映射见 主 design §10.1 |
| `FilterBar` | `Select` + `Input` +（可选）`Calendar` | 状态下拉 + 关键词；粒度与位序见各消费批（M4b-3…6） |

### 5.2 `components/ui/` —— 跨面件（4 件）

| 件 | 官方件组合 | 规格 |
|----|-----------|------|
| `Toaster` | `Sonner` 封装 | **全局单例**挂 App 根（M4b 首个可见反馈载体，M4b-2 起消费） |
| `SkeletonLoader` | `Skeleton` 组合 | 表格/详情两类骨架预设 |
| `RoleGuard` | 无官方件（`Outlet` 包装 + 重定向） | `role >= N` 判定；未登录 → `/login?next=`；已登录不足 → `/dashboard` + 轻提示（主 design §4） |
| `CopyButton` | `Button variant="ghost" size="icon-sm"` + `Tooltip` | 复制坐标/令牌明文/sha；明文场景**关闭即清** |

### 5.3 i18n 资源组骨架

`dashboard` / `admin` / `review` 三组键结构落位（zh 真源 + en 对齐）；本批**只落骨架键**（页标题/通用动作/空态），
业务文案随各批补。规范依据：主 design §11 · `07` §3。

## 6. 合规清理项（4）

| # | 项 | 现状 | 处置 |
|---|----|------|------|
| 6.1 | `market/FilterStrip` chips | 自绘三段常量（`CHIP`/`CHIP_OFF`/`CHIP_ON` 模板串拼接） | 固定集合 → `ToggleGroup` + `ToggleGroupItem`；动态标签 → `Toggle`；条件类走 `cn()`（官方硬规则 2/5） |
| 6.2 | 门户搜索行（输入框 + 按钮） | 并列布局 | 若按钮位于输入框内 → `InputGroup` + `InputGroupInput`/`InputGroupAddon`（官方硬规则 2）；**若为并列则保持**（不制造无谓嵌套） |
| 6.3 | 全仓手写模板串条件类 | 散落 | 统一 `cn()`（官方硬规则 5） |
| 6.4 | `--radius-2xl`(18px) | 归位后消费点仅剩 `SideNav.tsx:71`（侧栏内层；**经 `rounded-2xl` utility 消费**） | **本批不改**。原登记「潜在零消费者 token」候选 —— **整体审计（v1.6）复核：该登记不成立**：「现状」列已记 1 个消费点（utility 感知下 token 确被消费），与「潜在零消费者」自相矛盾 ⇒ **从候选剔除**（M4a plan §3 表 25 的同类项仍以 M4a plan 为准，未被本批反驳） |

## 7. 接口变更总览（服务端面）

**本批：零服务端改动**（无新增/修改端点、无 schema/迁移、无测试语义变更）。

**登记（不属本批，防漂移）**：

| 变更 | 端点/位置 | 归属批 | 来源 |
|------|----------|-------|------|
| 新增「**我名下的资产**」读面（2026-09-18 修正为 owner-only） | `GET /api/me/assets?status&q&limit&offset` | **M4b-4** | 主 design §7.2 R6 |
| 非 ACTIVE 读面授权集扩展 | `assertAssetReadable`（含 `.../versions`/`files`/`download` 族） | **M4b-4** | 主 design §7.2 R6-b |
| `ReviewListItem` 增 `reviewComment` 字段（列表露拒绝原因） | `review/query.ts` 的 `LIST_SELECT` | **M4b-3** | 2026-09-14 用户拍板 D34（推荐采纳） |

## 8. UI-UX 变动总览（本批用户可见变化）

| # | 变化 | 范围 | 性质 |
|---|------|------|------|
| 8.1 | **页面级卡 18px → 14px + 全站卡新增 1px 描边** | `Hero` · `CenterPage` · `AssetDetail` 头卡 / 右栏 + 嵌套卡 13 处 | 🔴 观感变化（A′ 拍板结果）——**需用户人工复看** |
| 8.2 | 卡内距由官方结构接管，AIH 内距以 className 保留（布局级） | 同上 | 🟡 细微 |
| 8.3 | 文件预览对话框：+1px 描边；**新增焦点陷阱 / 滚动锁 / 内置 ✕ 可点** | `FilePreviewDialog` | 🟢 行为增强（清 M4a a11y 债） |
| 8.4 | 详情页 Tab：**新增键盘左右切换 + `aria-controls`** | `DetailTabs` | 🟢 行为增强（清 M4a a11y 债） |
| 8.5 | 分页控件**居中**（原两端分布） | `CenterPage` | 🟡 布局变化 |
| 8.6 | 筛选条 chip 结构改 `ToggleGroup`/`Toggle`（形态保持 chip 观感） | `FilterStrip` | 🟡 结构变化，观感目标不变 |
| 8.7 | 空态 / 错误态 / 载态 / 徽章 结构官方化 | 门户各处 | 🟡 细微 |

**观感复看清单（交用户人工确认，实现侧不代看）**：首页 · 三中心 · 详情页三 tab · 文件预览 · 版本对比 —— **T8 结论：✅ 用户 2026-09-14 复核通过**（原话「ok」；另补探针「分页三态 · chip 两行/四态」用户原话「探针 OK」）。

## 9. 回归面与验证口径

- **受影响页面**：首页 `/` · 三中心 `/skills|/mcps|/agents` · 详情页 `/assets/:slug`（三 tab）· 文件预览 · 版本对比
- **门禁**：`typecheck` → `lint` → `format:check` → `build` → `db:migrate` → `test`（CI 口径：`CI=true` + 单库 `ai_asset_hub` + `--force`；基线 **475 例 474 pass / 1 skip / 0 fail**）
- **冒烟**：`m4a-chain-smoke`（29 断言）+ `m4a-dogfood`（36/36 + NO JS ERRORS）
- **本批验收结果（T8 · 2026-09-14）**：五门禁逐项 exit 0（test 475 例 474/1/0 = 与基线一致）· chain **29/29** ·
  dogfood **36/36 + NO JS ERRORS** · marker 0 · §9 六条逐条复验（⑥ 活体：切走切回零新增请求）·
  - **观感复看（T8 结果 ✅）**：用户 2026-09-14 复核通过（五面 + 补充探针：分页三态 · chip 两行/四态）
  —— **硬证据记录**：`docs/smoke/2026-09-14-m4b1-foundation.md`（含冒烟脚本输入保真修复的根因与实证）
- **回归断言（本批特有）**：
  ① 归位件**零残留**：`grep -rn "<已删手搓件名>" apps/web/src` = 0
  ② **无 `z-*` 手写在官方覆盖层上**（`Dialog`/`Sheet`/`Popover`）
  ③ `Dialog`/`Sheet` **均有 Title**；`Avatar` **均带 Fallback**
  ④ `ToggleGroup`/`InputGroup`/`Field` 使用点符合官方结构（Item 在 Group 内等）
  ⑤ **offset 语义不变**：分页「翻页回顶 / 竞态 abort / 末页判定」断言保持（沿用 M4a T11 口径）
  ⑥ **Tabs 缓存语义不变**：切过的面板切回**不重新请求**（`forceMount` 生效断言）

## 10. 引用文件清单

- 上游**主 design**：`docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.3 拆批表 / §2.4 对齐决策登记 / §10.1 视觉基线；**版本以其版本头为准**）
- 视觉 SSOT：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（色彩 token / 圆角轴 / 字阶 / 组件真值 / AIH 补丁表）
- 规范：`docs/00-product-direction.md` §5/§7 · `docs/07-i18n-conventions.md` §3
- 官方规则源（本机）：`~/04-ws/00-ui/skills/shadcn/{SKILL.md,rules/*.md}`
  + `apps/v4/registry/new-york-v4/{ui,blocks}`；沉淀副本 = 技能 `shadcn-ui-v4-adoption/references/official-skill-hard-rules.md`
- 前端（改动）：`apps/web/src/components/ui/**`（`EmptyState`/`Spinner`/`ErrorState`/`Badge`/`AssetAvatar`/`Pagination`/`TypeIcon`）
  · `apps/web/src/components/market/**`（`Hero`/`AssetCard`/`CenterPage`/`FilterStrip`）
  · `apps/web/src/components/market/detail/**`（`DetailTabs`/`FileTree`/`FilePreviewDialog`/`OverviewTab`/`FilesTab`/`VersionCompare`/`DiffNav`/`DiffView`）
  · `apps/web/src/pages/AssetDetail.tsx` · `apps/web/src/main.tsx`（Toaster 挂载）
  · 新增 `apps/web/src/components/ui/shadcn/**` · `apps/web/src/components/console/**` · `apps/web/src/components/ui/{Toaster,SkeletonLoader,RoleGuard,CopyButton}.tsx`
  · `apps/web/src/i18n/{zh,en}.ts`（三组骨架）
- 配置：`apps/web/components.json`（alias `ui` = `@/components/ui/shadcn`）· `apps/web/package.json`（4 个包 / 3 组新增依赖）
- 测试/冒烟（复用，不改语义）：`docs/smoke/scripts/{m4a-chain-smoke,m4a-dogfood}.ts`

## 11. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-14 | sunxuewen-rush | 初稿：M4b 拆批首批（M4b-1 地基批）对齐定稿——拍板 A′-F（Card/Dialog 接受官方默认；chip 改 `ToggleGroup`/`Toggle`；`Alert`/`InputGroup`/`cn()` 合规清理；依赖清单；CLI 纪律）· 组件归位 **14 处**规格（含每处消费点与视觉净变化）· 官方件补装 **13 件**（含 3 项新增 npm 依赖与落点）· 控制台面域 **6 件** + 跨面 **4 件** + i18n 骨架 · 合规清理 **4 项** · 接口变更「本批零服务端改动 + 3 项登记归属」· UI 变动 **7 条**与观感复看清单 · 回归面与 6 条本批特有断言；依据：用户 2026-09-14 对齐逐条拍板 + shadcn 官方 Agent Skill 硬规则（本机 `00-ui/skills/shadcn` 实测）；8 维自检 **9.56**（⚠ **自产数字，未实测**——同轮按维表实测修正为 **9.63**，见 v1.1 行） |
| v1.1 | 2026-09-14 | sunxuewen-rush | **T1 执行回写（2 处执行期修正）**：① §4.12 `login-03` 落仓方式修正（demo 文件不常驻 → M4b-2 用时 CLI 落地；理由：零消费者 + 6 条 a11y 违规）；② §4 补 biome 例外扩展记录（`shadcn/**` 增 `useImportType`/`noDoubleEquals`/`noArrayIndexKey`/`useKeyWithClickEvents`/`organizeImports` off——沿用 M4a 先例）+ 既有 7 件格式漂移定性（纯 import 风格，零语义）；实测：落仓 22 → **33 件** · 新增依赖 4 项 · 门禁四连绿（web lint 0 诊断）· 详见 plan「落地记录（2026-09-14）」 ④ **自检数字修正**：v1.0 头部原写「8 维自检 9.56」系**未实测的自产数字**（照抄他文档），同轮按维表逐维实测修正为 **9.63**（标准 4 + 深度 4，逐维证据见本轮报告） |
| v1.2 | 2026-09-14 | sunxuewen-rush | **术语标准化（用户 2026-09-14 定：主 design ↔ 批 design）**——本文件全篇 `umbrella` → **主 design**（12 处）；定位表述改为「本文件 = **M4b-1 批 design**，上游 = `2026-09-10-m4b-admin-console-and-auth-design.md`（**主 design**，跨批不变层）」 |
| v1.3 | 2026-09-14 | sunxuewen-rush | **口径统一 + 版本引用去硬值 + 执行回写**：① 官方件口径 → **新落仓 11 件（表列 13 项）**（§4 标题 + 版本头；并补「计数口径」说明行；v1.0 行原「补装 13 件」为当时口径，语义以本条为准）② 依赖口径 → **4 个包 / 3 组**（§4 依赖纪律 · §10 配置行；原「3 项」按组计数）③ 对上游主 design 的 3 处硬版本引用去值（版本头 Status · 引用链 · §10 引用文件清单）④ T1 Files 回写 `login-03` 实际处置（执行期修正 1：已移除）⑤ 本轮文档模型变更 8 维自检记录于主 design v1.6 行（修正前 8.94 → 修正后 **9.50**） |
| v1.4 | 2026-09-14 | sunxuewen-rush | **T8 收尾（批完成）：门禁/冒烟/§9 复验结果登记** —— ① 五门禁逐项 exit 0（typecheck / lint / format:check / build / db:migrate / test：`CI=true` + 单库 `ai_asset_hub` + `--force`，**475 例 474 pass / 1 skip / 0 fail** = 与基线一致、零回归；经用户 2026-09-14 授权）② 双冒烟：chain-smoke **29/29** · dogfood **36/36 + NO JS ERRORS**（`SMOKE_SHOT_PREFIX=m4b1-`，11 张截图）③ marker：`data-review` 0 · `ReviewControls` 0 · `dev/ReviewControls.tsx` 已删 ④ §9 六条逐条复验（③ `SheetTitle`/`DialogTitle`/`Avatar`+`Fallback` 齐备 · ④ `InputGroup` 零消费属 §6.2「并列则保持」· ⑤ 分页真数据 < limit 正当缺席、canonical 实测沿用 T5 探针 · ⑥ `forceMount` 缓存**活体复验**：`/api` 请求 13→13→13 零新增）⑤ **连带修复冒烟脚本输入保真**：官方 `Tabs` 激活走 `onMouseDown` ⇒ 页内合成 `el.click()` 不激活（实测：click 已派发但 `aria-selected` 不变；补 mousedown 即正常；历史对照 `git show 2b4d432^:DetailTabs.tsx:49` 为手搓 `onClick`）；官方 `Dialog` 内置 ✕ 无 `aria-label`（`sr-only` = `Close`）⇒ 旧 `button[aria-label="关闭"]` 自 T3 起恒 null 且静默失效、未关遮罩吞掉真指针点击。修法 = 新增 `clickReal()`（CDP 真指针 + 最顶层守卫，替换 3 处 tab 激活）+ `closeDialog()`（Esc → 官方 ✕ 兜底 → 轮询消失，替换 2 处），**36 条断言零改动**；修后 36/36。⑥ `common.close` 孤儿键清理（T3 起零消费；`common` 组 6 → 5 键，zh/en 对齐）⑦ T5 副产物「URL 更新但视图未重渲染」本 Task **未复现** ⇒ 保留观察项（未定性为缺陷）⑧ **观感复看 ✅ 用户复核通过**（五面 + 补充探针）—— 硬证据记录：`docs/smoke/2026-09-14-m4b1-foundation.md` |
| v1.5 | 2026-09-14 | sunxuewen-rush | **收尾 converge：三处「预期列 vs 实测」订正（批 design 收敛，用户 2026-09-14 拍板 a）** —— ① **§3.7 `Spinner`**：预期「⚪ 零变化（同为环形）」**不符** ⇒ 实测载态按官方用法拆分：「6 处 `Spinner`」口径推翻，改为 **页面级 `Skeleton` 4 文件**（`CenterPage` 8 卡壳 · `AssetDetail` 头卡+正文 · `OverviewTab` 4 行×2 · `FilesTab` 4 行）+ **局部 `Spinner` 2 文件**（对话框内 · 版本对比内），`ui/Spinner.tsx` **整件删除**（T4 实测）② **§3.11 分页**：预期「官方默认 `mx-auto` 居中 / `PaginationLink` 渲染为 button」**两处不符** ⇒ 真值 **`justify-center`**（`w-full` 下 `mx-auto` 解析 0px）+ 控件渲染 **`<a>`**（无 `href`/`asChild` ⇒ 鼠标可点、**键盘不可达**）+ 英文 `Previous`/`Next` 与 `aria-label` 硬编码（用户拍板 (c) 「严格用官方」的两条已登记代价）+ 尺寸 官方 `size=default`（控件高 36 / 行高 58）+ 末页 `aria-disabled` 表达；并补记「**翻页回顶」原为契约-代码不一致 → 补实现**（`window.scrollTo({top:0})`，用户拍板 b）③ **§3.12 面包屑**：预期「⚪ 零变化」**不符** ⇒ 实测 4 处官方默认差异（字阶 12→14px · 分隔符 `/`→`ChevronRight` · 链接色 `#1447e6`→`#64748b`+hover 变深去下划线 · 当前项 `<b>`→`BreadcrumbPage` `span`+`role=link`+`aria-current=page`），用户拍板「全按官方」④ **性质**：仅订正预期列为实测值，**实现侧零改动**；订正依据 = 批 plan T4/T5 各 Task「执行期说明」的实测证据（真浏览器计算值 / grep 计数）⑤ 本批收尾项据此清零 |
| **v1.7** | 2026-09-17 | sunxuewen-rush | D′ 项「输入框内按钮改 `InputGroup`」收口**—— 该合规项原以「hero 搜索行为 `Input`+`Button` 并列 ⇒ 官方硬规则 5 不适用」豁免；用户 2026-09-17 拍板改为**框内形态** ⇒ 已落地（M4a 门户 design **v0.29** §8.9），豁免口径作废。本版**零实现改动**）；**v1.6：收尾整体审计（承 M4a T17-T26 惯例）—— findings 8 项逐条处置（修 1 · 订正 1 · 回填 1 · 口径登记 5）**：① **F1 注释腐化（修）**`market/FilterStrip.tsx:39` 文档注释仍写 `spacing={7}`（真值 `1.75` = 7px，标度为 0.25rem 乘数）② **F2 既有登记项不成立（订正）**§6.4 `--radius-2xl` 从「潜在零消费者」候选剔除（`rounded-2xl` utility 有 1 消费点 `SideNav.tsx:71`）③ **F3 回填** M4a 审计第 24 项（chip 类串跨 4 文件重复）**本批已收敛**（chip 外观落官方 `toggle.tsx` `variant="chip"`，`FilterStrip` 零手搓类串）④ **F4/F5 口径登记** 地基批「有意零消费」清单（console **6** 件 + 跨面 **4** 件 + i18n 三组 **15** 键 → 消费点 M4b-2..6）· 越轴任意值清单（布局级，官方允许 className 做布局）⑤ **F6 方法教训** i18n 键计数须按**顶层缩进**匹配（宽松正则把嵌套键计入 → market 假阳性 53/58；顶层键重算 **53/53 对齐**）⑥ **F7** 既有死导出 2 个（`buildLabelRows`/`labelName`）状态不变 ⑦ **F8 无需动作**（已删件残留 8 类全 0 · 官方件硬规则 6 项 0 违规 · 文档量化声明 8 项实测一致）；**v1.5：收尾 converge —— §3.7/§3.11/§3.12 三处「预期列 vs 实测」订正（批 design 收敛）**—— |
| v1.6 | 2026-09-14 | sunxuewen-rush | **收尾整体审计（承 M4a T17-T26 惯例，用户 2026-09-14 拍板「按建议处置」）**—— 十维覆盖式扫描（死导出 · i18n 键 · 已删件残留 · 类串重复 · 越轴值 · token 消费者 · 注释腐化 · 文档数字实测 · 官方件硬规则 · 既有登记项状态）⇒ **findings 8 项**：**F1 修**（`FilterStrip.tsx:39` 注释 `spacing={7}` → `1.75`，真值 7px）· **F2 订正**（§6.4 `--radius-2xl` 从「潜在零消费者」候选剔除：`rounded-2xl` utility 有 1 消费点 `SideNav.tsx:71`，与同表「现状」列自相矛盾）· **F3 回填**（M4a 审计第 24 项 chip 类串重复 → 本批落官方 `toggle.tsx` `variant="chip"` 已收敛）· **F4/F5 口径登记**（地基批「有意零消费」：console 6 件 + 跨面 4 件 + i18n 三组 15 键 → 消费点 M4b-2..6；越轴任意值：`h-[120px]`/`w-[240px]`/`w-[180px]`/`max-w-[560px]` 为布局级，`text-[11px]` 在轴上）· **F6 方法教训**（i18n 键计数须按顶层缩进；嵌套计入致 market 假阳性 53/58 → 顶层键重算 53/53 对齐）· **F7 维持**（`buildLabelRows`/`labelName` 状态不变）· **F8 无需动作**（残留 8 类全 0 · 硬规则 6 项 0 违规 · 文档数字 8 项实测一致：11 件 / 13 项 / 14 处 / 4 项 / 6 件 / 4 件 / 4 包 / 33 件）；**无未决项**。登记表全文见批 plan §3 |
