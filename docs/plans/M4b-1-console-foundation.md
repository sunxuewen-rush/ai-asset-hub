# M4b-1 地基批（组件归位 + 控制台组件面域）实现计划

> Date: 2026-09-14
> Updated: 2026-09-14（**v0.11：T7 合规清理落地回写**——`FilterStrip` chips → 官方 `ToggleGroup`/`Toggle`
> （`variant="chip"`+`size="chip"` 落官方源码，官方第 ④ 路径）· 根行=组/子行与「全部」= `Toggle` · 原自绘
> 三段模板串常量与 `cls(on)` 整段删除 · 真页面交互回归（`?label=`+收窄+复位）· hover 四态与 chip 观感真值
> 实测 · 5 条执行期说明（`spacing` 标度乘数 · 内距统一 12px · 两处 `!` 提权 · 断言①重界定 · `--radius-2xl` 维持）；
> **v0.10：版本八态映射拍板回写**——`UPLOADED` = warning（对标 21-skillhub 列表页）
> + `YANKED` destructive → secondary（对标 skillhub 详情页）；`StatusPill` 映射与断言④ 复测，
> 主 design 同步升 **v1.7**（执行期说明 2 由「待确认」转「已闭合」）；**v0.9：T6 落地回写**——10 件控制台/跨面件落仓（PageHeader/DataTable/Drawer/ConfirmDialog/StatusPill/FilterBar + Toaster/SkeletonLoader/RoleGuard/CopyButton）+ `main.tsx` 挂 Toaster + i18n 三组骨架键；断言①-⑥ 全绿（临时探针页 `/__probe` 渲染全件实测后删除）；3 条执行期说明（TanStack v9 走官方 `/legacy` 子路径 · design 缺 `UPLOADED` 映射 · 探针期复现后台标签冻结 CSS 退出动画）；**v0.8：T5 落地回写**——面包屑→官方 `Breadcrumb` 全族 · `FileTree` 折叠→官方 `Collapsible` · 分页→官方 `Pagination` 结构；断言①-④ 实测（「翻页回顶」经 grep 核查为契约-代码不一致 → **用户拍板补齐 + 可判定实测**）；**4 条执行期说明**（未用官方 `PaginationLink`（`<a>` 不可聚焦）· 回顶缺项 · `mx-auto` 口径修正 · 面包屑非零变化）；**v0.7：T4 落地回写**——5 件展示件归位官方（Badge 加 success/warning variant + 薄映射 / Avatar+Fallback / Spinner 删除直连 / Empty / Alert）+ 页面级载态改 Skeleton；断言①-⑥ 全绿（真浏览器实测）；**载态口径按实测改写**（Spinner 2 处 + Skeleton 4 处）；**v0.6：T2 回归修复**——`CardHeader`（shadcn v4）的 `container-type: inline-size` 尺寸包含致页头宽度塌陷（实测 `/skills` `/mcps` `/agents` 三页描述 43~64px / 6~12 行 / 卡高 240~357px），补 `flex-1` + 三页 × 两档视口复测 + 门禁四件绿；**v0.5：T3 落地回写**——Dialog/Tabs 归位 + a11y 债清零（焦点陷阱/键盘导航/aria-controls 探针实证）/ 面板可见性缺陷同轮修 / forceMount 请求时点变更登记（详见「落地记录」）；**v0.4：T2 落地回写**——Card 全站归位 **8 处**（实测）/ 断言 ②③④⑤ 全绿 / 「13 处」拆账与官方子件按需使用已登记（详见「落地记录」）；**v0.3：口径统一 + 版本引用去硬值 + 执行回写**——① 官方件口径 → **新落仓 11 件（表列 13 项）**② 依赖口径 → **4 个包 / 3 组** ③ 对上游主 design 的 2 处硬版本引用去值（以版本头为准）④ T1 Files 回写 `login-03` 实际处置（已移除）；**v0.2：术语标准化**（主 design ↔ 批 design）+ 版本头同步；v0.1：初稿——M4b 拆批后首批 **M4b-1** 的 Task 清单（T1-T8）；依据批 design `2026-09-14-m4b1-console-foundation-design.md`（定稿）与上游主 design §2.3）
> Status: **执行中**（**T1-T6 ✅ 2026-09-14（已推送）· T7 ✅ 落地完成，待提交批准**；T8 ⬜）
> 引用链：本文档 → 设计 `docs/designs/2026-09-14-m4b1-console-foundation-design.md`（§N 逐 Task 引用）→ 上游主 design（跨批不变层） `docs/designs/2026-09-10-m4b-admin-console-design.md`（版本以其版本头为准）→ 规范 `00` §5/§7 · M4a design §4.4（视觉 SSOT，引用不复制）
> 命名约定见 `docs/plans/README.md`

## 1. 目标与范围

**目标**：把门户里**手搓的展示件**归位到 shadcn 官方件（14 处），补装官方件（新落仓 **11 件** · 表列 13 项），建立**控制台组件面域**
（6 件）与**跨面基础件**（4 件），并落实官方硬规则带来的**合规清理**（4 项）——为 M4b-2…6 提供
「门户与控制台共用同一套官方件」的单一底座。

**前置已就绪**：M4a 视觉体系切换 ✅（样式单入口 `index.css` + `aih-theme.css`；`.module.css` 归零 ·
五门禁基线 475 例 474/1/0 · dogfood 36/36）· shadcn v4 22 件已落仓（`apps/web/src/components/ui/shadcn/`）·
官方规则已核对（本机 `00-ui/skills/shadcn`）

**不含**（归属相邻批，见 design §1 批界）：
- 任何**路由/页面**（登录页 → M4b-2 · 个人面 → M4b-3/4 · 审核面 → M4b-5 · 治理面 → M4b-6）
- **认证与会话**（`AuthProvider`/401 分流/角色守卫接线 → M4b-2；本批只落 `RoleGuard` **组件件**，不接线）
- **服务端改动**：`GET /api/me/assets` + R6-b（→ M4b-4）· `ReviewListItem.reviewComment`（→ M4b-3）
- 业务域子组件（`console/{reviews,labels,assets,tokens,audit}/**`）

**执行纪律**（沿用 M4a plan + 本批特有）：
- commit 点 = Task 结束（Conventional Commits）；**逐 Task 独立 commit**（便于单件回退）
- **门禁统一在代码落地后跑**（typecheck / lint / format:check / build / test）；test 需 `DATABASE_URL` 指向已迁移库
- **shadcn 一律走 CLI**：`bunx --bun shadcn@latest add|view|docs|search`；**禁手工从 GitHub 抓文件**；
  **未获用户批准禁 `--overwrite`**（官方 Skill 纪律）
- **`className` 只做布局**（内距/尺寸/居中）；颜色/排版走 variant 或 token；条件类用 `cn()`
- 每个 Task 收尾必跑**自检打分**（代码 18 维 + 文档 8 维）≥9 才报告/提交；**自检发现的缺陷同轮修**；
  打分须**换靶**（禁同分重报）
- 浏览器观感由**用户人工确认**（实现侧只报计算值/结构断言）；临时截图不进仓

## 2. Task 清单

### T1 官方件补装 + 依赖落位 ✅（2026-09-14 落地；执行期修正 2 处见「落地记录」）
- **Files**: Modify `apps/web/package.json`（`cmdk` · `react-day-picker` · `date-fns` · `@tanstack/react-table`）·
  `bun.lock` · Create `apps/web/src/components/ui/shadcn/{field,empty,spinner,alert-dialog,popover,alert,toggle,toggle-group,input-group,command,calendar}.tsx` ·
  Create `login-03` block 文件 → **已移除**（执行期修正 1：demo 文件零消费者 + 6 条 a11y 违规；延后 M4b-2 用时 CLI 落地）·
  Modify `apps/web/src/components/ui/shadcn/{badge,card}.tsx`（T4/T6 的变体添加在各自 Task 内做，本 Task 只落官方原样）
- **Assert**:
  ① `bunx --bun shadcn@latest info` 回显 `base=radix` · `tailwindVersion=v4` · `framework=vite` · alias `ui`
  ② 落仓件数 = 补装前 22 + 本批 11 = **33**（`ls apps/web/src/components/ui/shadcn/*.tsx | wc -l`）
  ③ **大小写碰撞检查为空**：`git ls-files apps/web/src/components/ui | sort -f | uniq -di` 无输出
  ④ `bun install` 后 `bun run --filter=@ai-asset-hub/web typecheck` 零错 + `build` 绿
  ⑤ 新增依赖仅上述 4 项（`git diff apps/web/package.json` 逐行核对）；lockfile 变更已暂存
  ⑥ block 文件 import 路径已由 CLI 改写为项目 alias（`grep -rn '@registry/new-york-v4' apps/web/src` = 0）
- **Commit**: `chore(web): add shadcn official components and console deps`

### T2 Card 全站归位 ✅（2026-09-14 落地；design §3.1）
- **Files**: Modify `components/market/Hero.tsx` · `components/market/CenterPage.tsx` · `components/market/FilterStrip.tsx` ·
  `components/market/detail/DetailTabs.tsx` · `components/market/detail/{OverviewTab,FilesTab,VersionCompare,DiffNav,DiffView}.tsx` ·
  `pages/AssetDetail.tsx` · `components/market/AssetCard.tsx`
- **Assert**:
  ① 页面级卡与嵌套卡均改用官方 `Card` **全组合**（`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` 按需），
     禁止「一切塞 `CardContent`」
  ② `grep -rn 'rounded-2xl bg-card' apps/web/src` = **0**（页面级卡 18px 手写串归零）
  ③ **零 `border-0` / 零颜色覆盖**：`grep -rn 'border-0' apps/web/src/components apps/web/src/pages` = 0（针对 Card 相关）
  ④ 实测计算值（真浏览器，1440×900，关过渡）：卡 `border-radius` **14px** · `border-bottom-width` **1px** · 内距与 design §8.2 记录一致
  ⑤ 受影响页三态（载/空/错）与交互零变更
  ⑥ **页头 `CardHeader` 必须显式给宽度上下文（`flex-1`）**：shadcn v4 的 `CardHeader` 自带
     `@container/card-header`（计算样式 `container-type: inline-size`）⇒ 在 `flex` 行内自动宽度解析为 **0**
     ⇒ 描述塌成 min-content（回归实测 240~357px 卡高）。已落地，见「落地记录 · T2 回归修复」
- **Commit**: `refactor(web): adopt shadcn Card across portal surfaces`（回归修复另提 `fix(web): restore center header width`）

### T3 Dialog + Tabs 归位 ✅（2026-09-14 落地；a11y 债清零；design §3.2/§3.3）
- **Files**: Modify `components/market/detail/FilePreviewDialog.tsx` · `components/market/detail/DetailTabs.tsx`
- **Assert**:
  ① `FilePreviewDialog` 改用官方 `Dialog`（`DialogContent` + `DialogHeader` + `DialogTitle`/`DialogDescription`）；
     **标题存在**（可 `sr-only`）；**无手写 `z-*`**（`grep -rn 'z-\[' apps/web/src/components/market/detail/FilePreviewDialog.tsx` = 0）
  ② **焦点陷阱实证**：打开后连续 Tab 焦点**不逃出**对话框（探针记录 activeElement 序列）；关闭后焦点回到触发元素
  ③ Esc / 点遮罩 / ✕ **三路关闭**仍可用；尺寸实测 `w=min(720px,88vw)` · `max-h=76vh`
  ④ `DetailTabs` 改用官方 `Tabs`（`TabsList variant="line"` + `TabsTrigger` + `TabsContent` **`forceMount`**）；
     激活指示为 **实底 `--primary` 2px 下划线**（实测 `backgroundColor` + `height`）
  ⑤ **键盘导航实证**：左右方向键可在 tab 间切换（`aria-selected` 翻转）
  ⑥ **缓存语义不变**：切走再切回**不产生新请求**（网络层 `window.fetch` 插桩计数）
- **Commit**: `refactor(web): adopt shadcn Dialog and Tabs (clear a11y debt)`

### T4 展示件归位（design §3.5-§3.10）
- **Files**: Modify `components/ui/shadcn/badge.tsx`（`cva` 增 `success`/`warning` variant——官方第 ④ 条路径）·
  `components/ui/Badge.tsx`（改为**薄映射**，调用点零改动）· `components/ui/AssetAvatar.tsx`（官方 `Avatar` + `AvatarFallback`）·
  `components/ui/Spinner.tsx` → 官方 `spinner` · `components/ui/EmptyState.tsx` → 官方 `Empty` 结构 ·
  `components/ui/ErrorState.tsx` → 官方 `Alert` + 重试 `Button` · 各页载态改官方 `Skeleton`
- **Assert**:
  ① `Badge` 的 `success`/`warning` 两 variant 使用 `--success`/`--warning` token（**非硬编码色**）；
     3 个消费点（`DiffNav`/`DiffView`/`VersionCompare`）grep 到 `ui/Badge` 的 tone 映射而未出现自绘 span
  ② `AssetAvatar` 渲染链含 `AvatarFallback`（`grep -c 'AvatarFallback' apps/web/src/components/ui/AssetAvatar.tsx` ≥1）
  ③ **载态口径（2026-09-14 实测改写，原写「6 处 `Spinner`」）**：**页面级载态 4 处 → 官方 `Skeleton`**
     （`CenterPage`/`AssetDetail`/`OverviewTab`×2/`FilesTab`）· **局部等待 2 处 → 官方 `Spinner`**
     （`FilePreviewDialog`/`VersionCompare`，`grep -rn "ui/shadcn/spinner" apps/web/src` = 2 文件）——
     依官方用法（`Skeleton` = 页面/列表占位，`Spinner` = 局部等待），`ui/Spinner.tsx` 已删除
  ④ `ErrorState` 结构含 `Alert`/`AlertTitle`/`AlertDescription`；**按 code 本地化与重试行为不变**（dogfood 404 断言复用）
  ⑤ `grep -rn 'animate-pulse' apps/web/src --include='*.tsx' | grep -v 'ui/shadcn/'` = 0（自绘载态归零）
  ⑥ 空态文案两套策略保留（`EmptyState` 调用点断言）
- **Commit**: `refactor(web): migrate display primitives to official components`

### T5 面包屑 + Collapsible + Pagination 归位（design §3.4/§3.11/§3.12）
- **Files**: Modify `pages/AssetDetail.tsx`（面包屑）· `components/market/detail/FileTree.tsx`（`Collapsible`）·
  `components/ui/Pagination.tsx`（官方子件承载 offset 逻辑）
- **Assert**:
  ① 面包屑为官方 `Breadcrumb` 全族结构，层级与链接目标不变
  ② `FileTree` 折叠由 `CollapsibleTrigger`/`CollapsibleContent` 提供（`data-state=open|closed` 断言）；
     层级缩进 / sha 徽章 / 目录计数（i18n `market.fileUnit`）**不变**
  ③ 分页 **offset 语义回归**（2026-09-14 实测改写）：末页禁用 ✓ · 页码文本 ✓ · 结果头「共 N 条」✓ ·
     竞态 abort 由上游 `useApi`/`useMarketQuery` 承担（本 Task 未改）· **「翻页回顶」**：grep 核查确认该口径
     从未落到代码（唯一 `scrollIntoView` 在 `VersionCompare`）→ **用户 2026-09-14 拍板 (b) 补齐**：
     `CenterPage.handlePageChange` 加 `window.scrollTo({ top: 0 })`，已可判定实测（见落地记录 ③-b）
  ④ 分页**居中**实测：nav 中线 369 = 内容中线 368（差 **0**），机制 = 官方 `nav` 的 `justify-center`
     （`mx-auto` 在 `w-full` 下解析为 **0px**，见执行期说明 3）；分页内 `a`/`href` = **0**（零 href 泄漏）；
     控件按用户拍板 **(c)** 用**官方 `PaginationPrevious`/`Next`**（详见执行期说明 1）：渲染为 **`<a>`** ·
     `a[href]` = **0**（零 href 泄漏）· `aria-label` = 官方英文 · **键盘不可达**（实测 `focus()` 不生效）·
     行高 **58**（原 54；随官方 `size="default"` h-9）
- **Commit**: `refactor(web): adopt shadcn breadcrumb, collapsible and pagination`

### T6 控制台组件面域 + 跨面件 + Toaster（design §5）
- **Files**: Create `components/console/{PageHeader,DataTable,Drawer,ConfirmDialog,StatusPill,FilterBar}.tsx` +
  `components/ui/{Toaster,SkeletonLoader,RoleGuard,CopyButton}.tsx` · Modify `main.tsx`（挂 `Toaster`）
- **Assert**:
  ① `DataTable` = 官方 `Table` 全族 + `@tanstack/react-table`（列定义驱动）；表头高 **40**（实测）· 单元格 `p-2`；
     载态 `Skeleton` 行 / 空态 `Empty` / 错态 `Alert` 三态齐
  ② `Drawer` = 官方 `Sheet` 且**必带 `SheetTitle`**；宽 **560**（`sm:max-w-[560px]` 实测）；无手写 `z-*`
  ③ `ConfirmDialog` = 官方 `AlertDialog`（`Title`/`Description` 必填）+ **「需输入原因」变体**存在（`field` + `Textarea`）
  ④ `StatusPill` 资产三态 → `success`/`warning`/`secondary` 映射断言
  ⑤ `Toaster` 单例挂载：`main.tsx` 含 `<Toaster />`；`toast.success()` 调用一次出现一条（探针）
  ⑥ `RoleGuard` 本批**只落组件**（未接线路由）；`CopyButton` 复制成功清空逻辑存在
- **Commit**: `feat(web): add console component layer and cross-surface primitives`

### T7 合规清理（design §6）✅（2026-09-14 落地）
- **Files**: `components/market/FilterStrip.tsx`（chips → 官方 `ToggleGroup`/`Toggle`）·
  `components/ui/shadcn/toggle.tsx`（**加 `variant="chip"` + `size="chip"`**——官方第 ④ 条路径）·
  `components/market/Hero.tsx`（搜索行判据注释）· i18n 三组骨架键（**T6 已落，本 Task 复验**）
- **落地**：根行（「全部」+ 根标签）= 官方 `ToggleGroup type="multiple"` + `ToggleGroupItem`；子行与「全部」
  = 官方 `Toggle`（「全部」= 清空动作而非组内取值 ⇒ 与组并列，`pressed = 无任何选中`）；对外 props 契约
  （`selected`/`onToggle`/`onClearAll`）**零变更**（组回传数组 → 取对称差逐项回调 `onToggle`）；
  原自绘三段模板串常量与 `cls(on)` 三元**整段删除**
- **Assert**（真浏览器实测）:
  - **①** 结构：`data-slot=toggle-group`（`data-variant=chip` · `data-size=chip` · `data-spacing=1.75`）
    + 2×`toggle-group-item` + 2×`toggle`；`grep -c 'CHIP_OFF\|CHIP_ON' FilterStrip.tsx` = **0** ✓；
    **全仓模板串条件类 = 0** ✓（见执行期说明 4）
  - **②** 交互回归（真库真页面 `/skills`，标签 `agentic`/「智能体」）：点标签 → URL **`/skills?label=agentic`** ✓
    + 卡片 **3 → 1** ✓ + 文案「**筛选结果：1**」✓；点「全部」→ URL 复位 `/skills` + 卡片回 **3** + 「共 3 个技能」✓
  - **③** 搜索行判定 = **并列**（`Input` 与提交 `Button` 为同层 flex 兄弟，按钮不在输入框内）⇒
    **保持结构不改**，判据写入 `Hero.tsx` 注释 ✓（`grep -c InputGroup Hero.tsx` = 1 = **注释提及，非消费**）
  - **④** i18n：`^  (dashboard|admin|review): {` 在 `zh.ts`/`en.ts` 各 **3** ✓；语言切换冒烟（中文→EN）
    「标签筛选→LABELS · 全部→All · 共 3 个技能→3 skills」，**裸键泄漏 = 0** ✓
  - **chip 观感真值**（CDP 读计算样式，**读前先关过渡**）：字阶 **12px** · 内距 **px-3(12px)** · 圆角
    **full**（3.35544e7px）· 常态 on = `oklch(0.488 0.243 264.376)`（`--primary` 实底）+ 前景白 + `600`、
    off = `rgb(240,245,255)`（`--secondary`）+ `rgb(100,116,139)`（muted 字）· **hover 四态**
    （`CSS.forcePseudoState` 确定性读）：未选 = 面不变 + 字转 primary + 边 `ring/40`；选中 = 实底 primary +
    前景白 + `600` ✓（组内项与并列 `Toggle` **同形**）· 组内 `gap = 7px` ✓
- **执行期说明 1（`spacing` 是标度乘数，非 px）**：官方 `ToggleGroup` 的 `spacing` 经
  `gap-[--spacing(var(--gap))]` 按 **0.25rem 标度**换算 ⇒ `spacing={7}` 实测得 **28px**；取
  **`1.75` = 7px**（与行 `gap-[7px]` 同值）。且 `spacing={0}` 会触发官方
  `data-[spacing=0]:rounded-none` 破坏胶囊形态 ⇒ **不可用默认值**
- **执行期说明 2（内距 13 → 12px）**：`ToggleGroupItem` 自带 `px-3` 且与本 variant 的 `px-[13px]` 撞车时
  原名值取胜（实测组内 12px / 并列 13px，同文案 chip 宽差 2px）⇒ variant 内距统一取 **`px-3`**，
  与组内项、并列 `Toggle`、子行项同值。**净变化 = 内距 1px 级**（design §8.6「观感目标不变」成立）
- **执行期说明 3（chip 外观落官方源码 = 第 ④ 路径）**：与 T4 `Badge` 同法（官方第 ④ 条路径「改组件源码加
  variant」），零 `className` 覆盖颜色/排版。**两处必须提权**（均为实测，非推测）：① `rounded-full!`——
  base `rounded-md` 与本 variant 同属性撞车时由**样式表定序**决定（与 class 书写顺序无关），实测恒取
  `rounded-md`(8px)；② `data-[state=off]:hover:text-primary!`——base 自带 `hover:bg-muted`/
  `hover:text-muted-foreground` 同特异性取胜，实测「选中态 chip 悬停会翻成灰」⇒ hover 改挂
  `data-[state=off|on]:`（属性选择器提特异性），仅未选态 hover 字色仍需 `!` 收口
- **执行期说明 4（断言 ① 的 `cn(` 项已重界定）**：条件类整块由官方 `data-[state=on]` 承载后，
  `FilterStrip` 内**已无任何条件类**，故「条件类含 `cn(`」无适用场景 ⇒ 以**更强的等价断言**替代：
  全仓 `className` 内模板串三元 **= 0**（`grep -rn '\${.*?.*:' apps/web/src --include=*.tsx`）
- **执行期说明 5**：§6.4 `--radius-2xl`(18px) **本批不改**（消费点仅剩 `SideNav.tsx:71`，登记为
  「潜在零消费者 token」候选，M4b 收尾统一裁剪判定）——维持原登记
- **门禁**（web 侧）：`typecheck` ✅ · `lint` ✅（87 文件 0 诊断）· `format` ✅（232 文件）· `build` ✅
  （CSS **107.77 kB** · JS **638.38 kB**；较 T6 +5.09 kB = `radix-ui` Toggle/ToggleGroup 原语首次进包）
- **Commit**（待用户批准）：`refactor(web): apply shadcn compliance rules (toggle chips + i18n skeletons)`

### T8 门禁 + 冒烟 + 自检 + 文档回写
- **Files**: Modify design（版本头/修订记录/§8/§9 状态）· 本 plan（Task 状态 + 落地记录）· `docs/00` §5 M4b-1 行 ·
  （如需）新建 `docs/smoke/2026-09-14-m4b1-foundation.md`
- **Assert**:
  ① 五门禁全绿（`typecheck`/`lint`/`format:check`/`build`/`db:migrate`/`test`；**test 需用户授权**，
     口径 `CI=true` + 单库 `ai_asset_hub` + `--force`，基线 **475 例 474 pass / 1 skip / 0 fail**）
  ② `m4a-chain-smoke` **PASS** + `m4a-dogfood` **36/36 + NO JS ERRORS**（`SMOKE_SHOT_PREFIX=m4b1-`）
  ③ 生产包 marker 断言：`ReviewControls`/`data-review` = 0（沿用 M4a 口径）
  ④ design §9 六条本批特有断言逐条复验并记录
  ⑤ **观感复看由用户确认**（首页/三中心/详情页/预览/对比）——结论写入记录
  ⑥ 自检打分：代码 18 维 + 文档 8 维 ≥9（换靶：本批靶 = 归位完整性与官方规则合规性）
- **Commit**: `test(web): run m4b-1 gates and smoke`

### 落地记录（2026-09-14 执行回写——实测证据）

**T1 官方件补装 + 依赖落位 ✅**

- 落地：CLI（`bunx --bun shadcn@latest add … -y`）落仓 **11 件**——`field` · `empty` · `spinner` · `alert-dialog` ·
  `popover` · `alert` · `toggle` · `toggle-group` · `input-group` · `command` · `calendar`；
  `components/ui/shadcn/*.tsx` **22 → 33**（`ls | wc -l` 实测）
- 依赖：`apps/web/package.json` 新增 **4 个包（3 组）**——`cmdk@^1.1.1`（command）· `date-fns@^4.4.0` +
  `react-day-picker@^10.0.1`（calendar）· `@tanstack/react-table@9.2.4`（data-table recipe，手动 `bun add`）；
  `bun.lock` 同批更新
- 校验：`shadcn info` 回显 `framework=Vite` · `tailwindVersion=v4` · `style=new-york` · **`base=radix`** ·
  alias `ui` = `@/components/ui/shadcn` ✓ · 大小写碰撞 `sort -f | uniq -di` = **空** ✓
- 门禁（web 侧四连）：`typecheck` 4/4 ✅ · `lint` 4/4 ✅（**web 0 诊断**）· `format:check` 223 文件 ✅ ·
  `build` ✅（CSS 109.00 kB / JS 565.39 kB——较 M4a 收官 86.68 kB / 546 kB 增加，来源 = 新件入包与
  `@tanstack/react-table`；待 T2-T8 归位后复测）

**执行期修正（2 处，均记录理由）**

1. **`login-03` block demo 文件不常驻**（design §4.12 原写「源码落仓」→ 修正为「**M4b-2 用时 CLI 落地并取用**」）：
   CLI 落点的 `src/components/login-form.tsx` **零消费者**且自带 **6 条 a11y 违规**（`useValidAnchor` ×4 的
   `href="#"` 演示锚点 + `noSvgWithoutTitle` ×2）⇒ 本批**移除该文件**，避免「带违规的死 demo 常驻仓库 +
   为其开 lint 例外」；M4b-2 落地登录页时再 `add login-03` 取 `field` 组合（CLI 幂等）
2. **既有 7 件官方源码格式漂移已复原**：CLI 落新件时顺带把 `button/card/dialog/input/label/separator/textarea`
   重写为 registry 原样（双引号 / 无分号）⇒ 补跑 `bun run format` 后残留 diff **仅 import 风格**
   （`import type * as React` → `import * as React`）· **导出行序** · `separator.tsx` 增 `'use client'`；
   **零语义/零视觉影响**（`git diff` 逐 hunk 定性，10 插入 / 8 删除）；保留上游一致写法（7 件已列入 T1 Files）
3. **biome 例外扩展**（沿用 M4a 先例，仅作用 `apps/web/src/components/ui/shadcn/**`）：
   新增 `style.useImportType` off · `suspicious.noDoubleEquals` / `noArrayIndexKey` off ·
   `a11y.useKeyWithClickEvents` off · `assist.actions.source.organizeImports` off
   （依据：官方源码非本仓风格，逐文件改 = 偏离上游且抬高升级成本）

**T2 Card 全站归位 ✅**

- 归位 **8 处**（实测）：`Hero`（`section` → `Card`）· `CenterPage` 页头（+`CardHeader`）· `FilterStrip`
  滤镜条 · `DetailTabs` 卡壳 · `AssetDetail` 头卡 + 右栏下载卡 + 元信息卡 · `AssetCard`（`Link` 内包 `Card`）
- 形态交官方默认：`rounded-xl`(14px) · 1px `border` · `bg-card` · `shadow-sm`——自写的
  `rounded-2xl`/`rounded-xl`/`bg-card`/`shadow-sm` 全删；官方基类 `gap-6 py-6` 按处用 `gap-0`/`py-0` 归零
  （布局类，§3.1「内距用 className 调」授权）；AIH 内距原样保留
- 门禁（web 侧）：`typecheck` ✅ · `lint` ✅（78 文件 0 诊断）· `format`（1 文件重排）· `build` ✅
  （CSS **108.91 kB** / JS **565.67 kB**——较 T1 后 CSS −0.09 kB，自写卡类删除所致）
- **断言②**：`grep -rn 'rounded-2xl bg-card' apps/web/src` = **0** ✓
- **断言③**：`border-0` 余 9 处，逐条定性 = 官方件源码 3（`input-group`/`table`/`input`）+ 原生行/遮罩重置 6
  （`DiffView`/`DiffNav`/`FileTree`/`FilePreviewDialog`）⇒ **Card 相关 = 0** ✓；顺手清 `DetailTabs` tab 按钮的
  `border-0`（Tailwind preflight 已归零，冗余）
- **断言④**（真浏览器 1440×900 计算值实测，8/8 命中「页面级 18→14px + 全站 +1px 描边」= design §8.1）

  | 页 | 卡 | radius | border-b | 内距实测(py/px) | rowGap |
  |----|----|:--:|:--:|:--:|:--:|
  | `/` | hero | **14px** | **1px** | 48 / 40 | 0 |
  | `/skills` | 页头 | 14px | 1px | 22 / 26 | 20 |
  | `/skills` | 滤镜条 | 14px | 1px | 12 / 16 | 12 |
  | `/skills` | `AssetCard` ×3 | 14px | 1px | 18 / 18 | 0 |
  | `/assets/:slug` | 头卡 | 14px | 1px | 24 / 28 | 0 |
  | `/assets/:slug` | `DetailTabs` 壳 | 14px | 1px | 0 / 0 | 0 |
  | `/assets/:slug` | 下载卡 | 14px | 1px | 18 / 20 | 0 |
  | `/assets/:slug` | 元信息卡 | 14px | 1px | 18 / 20 | 0 |

- **断言⑤**（三态/语义）：`/skills?q=zzzzzzzz` 空态下页头卡结构形态不变 ✓ · `role=tab` 3 / `role=tabpanel` 1
  保留 ✓ · `h1`（详情页）与 `h3`（元信息卡）标题语义保留 ✓
- 观感复看：**待用户人工确认**（首页 / 三中心 / 详情页；实现侧只报计算值）

**执行期说明（2 处）**

1. **「13 处」拆账（实测）**：design §3.1 记「嵌套卡 13 处」，按实测 = **8 处真卡容器**（本轮归位）+
   **5~6 处 `bg-secondary` 展示 tile**（Hero 统计条 5 + 中心页计数 1——`Hero.tsx` 原注释已登记「不引
   `ui/shadcn/card`：官方白底在 hero 白卡内不可见、内距过重」）。tile 不属「卡归位」面，保持手搓；
   → **登记为 T8 回写项**（design §3.1 消费点列按此拆账）
2. **官方子件按需使用**：有标题/分区的卡用 `CardHeader` 等子件（`CenterPage` 页头）；无标题的纯内容卡
   `Card` + 子元素直挂（不硬塞 `CardContent`，避免为取消 `px-6` 写无意义覆盖）；**标题元素保持
   `h1`/`h3`**（`CardTitle` 渲染为 `div`，替换会降级标题语义——a11y 优先）

**T2 回归修复 ✅（2026-09-14，用户复看发现）**

- **缺陷**：`CenterPage` 页头 `CardHeader`（shadcn v4，自带 `@container/card-header` ⇒ `container-type:
  inline-size` = 内联尺寸包含）被放进 `Card` 的 `flex flex-row` 当 flex item ⇒ **自动宽度解析为 0**，
  描述文字压到 min-content（**43~64px**）⇒ **6~12 行** · 卡高 **240~357px**
  （`/skills` 240 · `/mcps` 357 · `/agents` 318；1440px 视口同样命中：卡宽 1192 / 页头宽 0）
- **归属**：T2 引入（`git show 45ce805^` 该处为普通 `<div className="relative min-w-0">`，按内容自撑正常）；
  全仓 `CardHeader` 仅此 1 处 ⇒ 影响面 = 3 个中心页
- **修**：补 `flex-1`（显式给 flex item 宽度上下文）；形态零变化（图标 44 / 搜索框 240 / 计数块 97 /
  内距 26·22 均不动）——不构成设计变更
- **复测**（真浏览器，修后）：页头宽 **0 → 682~697**；三页 **1440px 均 1 行 / 卡高 120px** ·
  **1024px 均 2 行 / 卡高 134px** ✓
- **窄屏遗留**：<768px（卡宽 509）固定宽 44+240+97=381 vs 可用 457 ⇒ 仍多行；属「中心页响应式策略」，
  未夹带（用户 2026-09-14 拍板 A；B/C 另议）
- **门禁**（web 侧）：`typecheck` ✅ · `lint` ✅（78 文件 0 诊断）· `format:check` ✅（223 文件）· `build` ✅
- **Commit**: `fix(web): restore center header width (CardHeader size containment)`

**T6 控制台组件面域 + 跨面件 + Toaster ✅（2026-09-14 落地；design §5）**

- 新建 **10 件**：
  - `components/console/`：`PageHeader`（官方 `Card` + `CardAction` 两栏）· `DataTable`（官方 `Table` 全族 +
    `@tanstack/react-table` 列定义驱动）· `Drawer`（官方 `Sheet`；`SheetTitle` 做成**必填 props**）·
    `ConfirmDialog`（官方 `AlertDialog` + `Field`/`Textarea` 原因变体）· `StatusPill`（官方 `Badge` 映射）·
    `FilterBar`（官方 `Select` + `Input`）
  - `components/ui/`：`Toaster`（官方 `Sonner` 封装）· `SkeletonLoader`（官方 `Skeleton` 表格/详情预设）·
    `RoleGuard`（`role >= minRole` + 两条重定向）· `CopyButton`（官方 `Button` `ghost`/`icon-sm` + `Tooltip`）
- `main.tsx` 挂 `<Toaster />`（路由之外 ⇒ 跨页存活）· i18n 新增 `dashboard`/`admin`/`review` 三组骨架键（zh/en 同步）
- 断言实测（真浏览器；**临时探针页 `/__probe` 渲染全部 10 件，验证后已删除**）：
  - **①** `DataTable`：列定义驱动；**表头高 40**（官方 `TableHead` `h-10` 实测 = 40px）· 单元格 `padding: 8px`
    （官方 `p-2`）· 行内动作槽 = 追加列（`sr-only` 表头「行操作」+ 3 个动作单元格）· **三态齐**：
    `state=loading` → 骨架 **10**（5 行 × 2 列）· `empty` → 官方 `Empty` ×1 · `error` → 官方 `Alert` ×1
    （标题「未找到该资源或版本」）
  - **②** `Drawer`：宽 **560**（`sm:max-w-[560px]` 实测）· `SheetTitle` 在位 · `z-index` = **50**（官方值，零手写）·
    官方 ✕ 关闭后组件**卸载** ✓
  - **③** `ConfirmDialog`：`Title`/`Description` 在位 · 确认钮 `data-variant="destructive"` ✓ ·
    **需输入原因变体**：`TEXTAREA` 在位，原因为空 ⇒ 确认钮 `disabled=true`；输入后 ⇒ `disabled=false` ✓ ·
    「取消」关闭后卸载 ✓
  - **④** `StatusPill` 映射实测：`ACTIVE→success` · `HIDDEN→warning` · `ARCHIVED→secondary` ·
    `PUBLISHED→success` · `UPLOADED`/`PENDING_REVIEW→warning` · `SCAN_FAILED`/`REJECTED→destructive` ·
    `YANKED`/`DRAFT`/`SCANNING→secondary`（`UPLOADED`/`YANKED` 两档 = 用户 2026-09-14 拍板后复测值）
  - **⑤** `Toaster`：单例挂载实测（`section[aria-label="Notifications alt+T"]`）；`toast.success('已保存')`
    调用一次 → **1 条** toast（文本命中）✓
  - **⑥** `RoleGuard`：本批**只落组件、未接线路由**（按批约定）；实测 `role=null` → **`/login?next=%2F__probe`**
    （编码正确）· `role=1 < minRole=10` → **`/dashboard`** ✓ · `CopyButton` 点击 → **剪贴板读回 = 写入值** ·
    图标切 ✓ · `aria-live` =「已复制」✓
- **门禁**（web 侧）：`typecheck` ✅ · `lint` ✅（87 文件 0 诊断）· `format` ✅（232 文件）· `build` ✅
  （CSS **106.94 kB** · JS **633.16 kB**；较 T5 +39 kB = `sonner` + `@tanstack/react-table` +
  `sheet`/`alert-dialog`/`select`/`field`/`textarea` 官方件注入）
- **执行期说明 1（TanStack 版本路径）**：本仓 `@tanstack/react-table@9.2.4` 的**原生 API 为特性注册式**
  （`useTable` + `coreRowModel`/`rowSortingFeature` 等特性对象，特性来自**传递依赖** `@tanstack/table-core`
  —— 直接 import 会形成**未声明依赖**）⇒ 采用 v9 **官方 `/legacy` 子路径**（`useLegacyTable` +
  `getCoreRowModel`）：与官方 shadcn data-table recipe 形态一一对应、**零新增依赖**；`flexRender` 取自主入口。
  行类型约束用**本地等价结构类型** `RowDataLike = Record<string, unknown> | unknown[]`
  （等价 `table-core` 的 `RowData`，同样为规避隐藏依赖）
- **执行期说明 2（design 缺口 → 已闭合）**：主 design §10.1 版本八态映射原只列 **7 态**（缺 `UPLOADED`）
  ⇒ 本件初版推断取 `secondary` 并登记待确认；**2026-09-14 用户拍板收口**：`UPLOADED` = **warning**
  （对标 21-skillhub `web/src/pages/dashboard/my-skills.tsx` 列表页 review 档）+ `YANKED` destructive →
  **secondary**（对标 skillhub 详情页 `version-status-badge.tsx` 灰档，且与门户侧代码实况一致）
  ⇒ 主 design 升 **v1.7**、本件映射表与断言④ 同步复测；（被否决的「独立蓝/紫 token」路径不入档）
- **执行期说明 3（探针环境）**：探针期复现「浮层关闭后不卸载」——根因 = **后台标签
  `visibilityState=hidden` 冻结 CSS 退出动画**（Radix `Presence` 等不到 `animationend`）；
  `Page.bringToFront` 后两件（Sheet / AlertDialog）关闭即正常卸载 ✓（**非应用缺陷**）。
  另：叠加层状态曾出现「无操作回初始值」（疑似 remount）—— 归入 T8 待复验项一并观察
- **Commit**（待用户批准）：`feat(web): add console component layer and cross-surface primitives`

**T5 面包屑 + Collapsible + Pagination 归位 ✅（2026-09-14 落地；design §3.4/§3.11/§3.12）**

- 归位 **3 处**：`AssetDetail` 手搓面包屑 → 官方 `Breadcrumb` 全族 · `FileTree` 自绘折叠机 → 官方
  `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`（`asChild` 承接既有 `<button>`，零样式包装）·
  `ui/Pagination` → 官方 `Pagination`(`nav`)/`PaginationContent`(`ul`)/`PaginationItem`(`li`)
- 断言实测（真浏览器）：
  - **①** 面包屑：`nav[aria-label=breadcrumb]` + `OL` 结构；3 项（首页 / 技能中心 / slug）**层级与链接目标
    不变**（`href="/"` · `/skills`，点击实测跳转 `/skills`）；当前项 `SPAN[aria-current="page"]`；
    2 个 `ChevronRight` 分隔符 ✓
  - **②** `FileTree`：`[data-slot=collapsible]`×2 / `trigger`×2 / `content`×2；trigger = `data-state=open` +
    `aria-expanded=true`（Radix 下发）；目录计数「1 文件」· sha 徽章「0f95…712d」· `▶` 字形 · 缩进
    （根行无 `pl-*`、子行 `pl-5`）**均不变**；**收起后** `content` = `closed` + `hidden` + **不可聚焦**
    （focusable **0**）；折叠内文件行点击仍开预览（对话框标题 `lib/embedding.ts`）✓
  - **③** offset 语义：末页判定（7 资产 / 技能 3 条 = 1 页 ⇒ 上一页 + 下一页**双 disabled**）· 页码文本
    行文本 `Previous 1 / 1 · 每页 20 Next` · 两端 `aria-disabled` = true + 独立禁用类 · 结果头「共 3 个技能」✓
  - **③-b 翻页回顶（本 Task 补齐 + 可判定实测）**：用 `PAGE_SIZE=2` 临时探针造多页（**已回滚**）+ 视口压到
    **250px** 造出「第 2 页仍可滚」的条件 ⇒ 点击前 `scrollY=291` / `maxScroll=291`；点击后 **`scrollY=0` 而
    `maxScroll` 仍 = 291** —— 只有本处理器调用 `window.scrollTo` 才可能到 0，**排除浏览器夹取**（文档变短会被
    夹到新 max，而非 0）⇒ **回顶生效** ✓；同轮 URL → `?page=2`、页码文本 → `2 / 2`、卡片 2 → 1（第 2 页 1 条）✓
  - **④** 居中：nav 中线 **369** = 内容中线 **368**（差 0）· `justify-content: center` ✓；分页内 `a`/`href` = **0** ✓
- **外观拍板（用户 2026-09-14 逐条对齐）**：面包屑四项 —— 字阶 **14px**（官方 `text-sm`）· `ChevronRight`
  分隔符 · 链接色 muted（hover→foreground）· 当前项 `BreadcrumbPage` —— **全部按官方保留、不做回退**
  （design §3.12「零变化」属预期误记，批末 converge 回改）
- **门禁**（web 侧）：`typecheck` ✅ · `lint` ✅（77 文件 0 诊断）· `format` ✅ · `build` ✅
  （CSS **106.82 kB** · JS **594.04 kB** —— 含 (c) 版官方 `PaginationPrevious/Next` 注入）
- **执行期说明 1（用户 2026-09-14 拍板 (c)「严格用官方」；两条代价已在拍板前提示并被接受）**：控件用
  **官方 `PaginationPrevious`/`PaginationNext`**（= `PaginationLink` + chevron 图标），代价**实测**：
  - **英文标签硬编码**：行文本实测 `Previous 1 / 2 · 每页 2 Next`、`aria-label` = `Go to previous/next page`；
    官方组件内部字面 children ⇒ **children 无法覆盖** ⇒ 与 07《UI 语言与本地化》双语要求冲突（已知偏离）；
    `common.prev`/`common.next` 两键因此失去消费点，**同批删除**（zh/en 同步，键集保持一致）
    - **用户 2026-09-14 二次拍板**：追问「previous/next 有中文么」→ 核实官方无中文（组件不带文案 props、
      registry 无中文版 item）⇒ 拍板 **(e) 保持现状**：英文标签保留 · 键盘不可达不处理 ·
      `common.prev`/`next` 维持删除
  - **键盘不可达**：`PaginationLink` 渲染 `<a>` 且不接受 `asChild`；无 `href` 的 `<a>` 不进入 Tab 序列
    （实测 `focus()` 后 `activeElement` 非该控件）⇒ 翻页**鼠标可点、键盘不可达**，新增一笔 a11y 债（登记）
  - **禁用表达**：锚点无原生 `disabled` ⇒ 用 `aria-disabled` + **边界端不挂 `onClick`** +
    `pointer-events-none opacity-50`（该 `className` 属**外观覆盖例外**：官方件无 disabled variant，
    不给视觉线索则「禁用」对用户不可见）；实测 `aria-disabled = [true,false]`、独立禁用类仅落在边界端 ✓
  - **尺寸**：随官方 `size="default"`（h-9）⇒ 控件高 **36**、行高 **58**（原 `sm` = h-8 / 行 54）
  - **双向点击链路实测**（`PAGE_SIZE=2` 临时探针，已回滚）：Next → URL `?page=2` · 文本 `2 / 2` ·
    `aria-disabled` 翻转为 `[false,true]` · 卡片 2→1 ✓；Previous → 回 `/skills` · 文本 `1 / 2` · 卡片 1→2 ✓
  - **design §3.11 第二处预期不符**：design 写「`PaginationLink` 渲染为 button（SPA 无 href）」—— 实测渲染为
    **`<a>`**（官方实现即锚点且无 `asChild`），与本批「清 a11y 债」目标冲突（已登记，批末回改 design）
- **执行期说明 2**：**「翻页回顶」原为契约-代码不一致**（M4a T9/T11 与 design 均写明、代码零实现）→
  用户 2026-09-14 拍板 **(b) 补齐**：`CenterPage.handlePageChange` 内 `window.scrollTo({ top: 0 })`（瞬时；3 行），
  实测见断言 ③-b。**探针说明**：dev 库数据 < 1 页 ⇒ 实测用 `PAGE_SIZE=2` 临时探针 + 250px 视口
  （**两者均已回滚**，`git diff HEAD` 复查无残留）
- **待复验项（本 Task 副产物，不在 T5 改动面）**：探针期间观察到 **URL 已更新为 `?page=2` 但视图推进不稳定**
  —— 无仪器裸浏览器运行 3 次：**1 次推进**（`probePage` 1→2 / 文本 `2 / 2` / 卡片 1）/ **2 次未推进**
  （URL 已变、视图仍旧）；而 `?page=2` 硬加载必然正确渲染第 2 页。嫌疑：`react-router-dom@^7.18.3` 的
  transition 导航 × React 19 `StrictMode` 下更新被丢弃。**未定性为应用缺陷** —— 该现象在「`window.scrollTo`
  插桩」与「CDP 视口覆盖」条件下**稳定复现**，且本 Task diff 不触及 URL/状态流转（`Pagination` 仅换结构、
  回调语义未变）⇒ 登记为**待复验**：批末 T8 / 真数据（>20 条）下用**无仪器浏览器**复验，若仍复现则单独立案。
  **探针纪律**：观察滚动行为时**勿替换 `window.scrollTo`**（会干扰视图推进）
- **执行期说明 3**：design §3.11「官方默认 `mx-auto` 居中（原为两端分布）」与实测不符 —— 归位前原实现
  即 `justify-center`（非两端分布），官方 `nav` 因 `w-full` 使 `mx-auto` 解析为 0 ⇒ 居中真值 = `justify-center`，
  行为**零变化**
- **执行期说明 4**：design §3.12 面包屑「⚪ 零变化」与实测不符 —— 官方默认带来 4 处可见差异（字阶 12→**14px** ·
  分隔符 `/`→`ChevronRight` · 链接色 primary→`muted-foreground`/hover `foreground` · 当前项 `<b>`→
  `BreadcrumbPage`）。依 §2.3「官方件默认值即新真值」执行，列入观感复看
- **Commit**（待用户批准）：`refactor(web): adopt shadcn breadcrumb, collapsible and pagination`

**T4 展示件归位 ✅（2026-09-14 落地；design §3.5-§3.10）**

- 归位 **5 件**：`ui/Badge` → 官方 `Badge`（`cva` 增 `success`/`warning` 两 variant，AIH 侧**薄映射**
  `tone`→`variant`，3 消费点零改动）· `ui/AssetAvatar` → 官方 `Avatar` + **`AvatarFallback`** ·
  `ui/Spinner` → **删除**（消费点直连官方件）· `ui/EmptyState` → 官方 `Empty` 结构 ·
  `ui/ErrorState` → 官方 `Alert` + `Button`
- 载态：**页面级 → `Skeleton`（4 文件）· 局部 → `Spinner`（2 文件）**（口径见执行期说明 1）
- 断言实测（真浏览器，1440×900）：
  - **①** `Badge` 运行时 `data-variant`：`MODIFIED`→`warning`（bg `oklch(0.666 0.157 58.3)` = `--warning` ·
    前景 `rgb(255,251,235)` = `--warning-foreground`）· `ADDED`→`success`（bg `oklch(0.627 0.17 149.2)` = `--success`）·
    `DELETED`→`destructive`；`rounded-full`（computed 极大值）· `text-xs` 12px · `mono` 保留 ✓
  - **②** `AvatarFallback` 在渲染链：`/skills` 实测 avatar **3 / fallback 3**；40×40 · 圆角 **10px** ·
    实底 `--ava-N`（`rgb(5,150,105)`/`rgb(124,58,237)`/`rgb(99,102,241)`）· 白字 17px ⇒ **视觉零变化** ✓
  - **③** 官方 `Spinner` 消费点 **2 文件** · 官方 `Skeleton` 消费点 **4 文件**（实测）
  - **④** 错态（`/assets/zzz-no-such-slug`）：`[data-slot=alert]` + `role="alert"` · 标题
    `未找到该资源或版本`（**按 code 本地化不变**）· 重试 `Button` 在 `AlertDescription` · 描边 1px ✓
  - **⑤** `animate-pulse` 自绘归零：非 `ui/shadcn` 命中 **0** ✓
  - **⑥** 空态两套文案保留：`CenterPage` → `EmptyState(message=t('market','noResult'))`；
    `FilesTab`/`OverviewTab`/`VersionCompare` 仍用 `common.empty` ✓
  - **载态骨架**：冷加载 **103ms 采样 = 8 壳**（`h-[166px]` · `rounded-xl` 14px · `bg-accent`
    `rgb(234,241,253)` · `animate-pulse` 2s）· 加载完成归零 ✓
- **门禁**（web 侧）：`typecheck` ✅ · `lint` ✅（77 文件 0 诊断）· `format` ✅ · `build` ✅
  （CSS **106.92 kB**（T2 后 108.91 → **−1.99**）· JS **588.96 kB**（自 T2 起累计 +23.29，含官方 Dialog/Tabs/Avatar 等件注入））
- **执行期说明 1**：载态按官方用法拆分「页面级 `Skeleton` / 局部 `Spinner`」⇒ 计划断言③的「6 处 `Spinner`」
  按实测改写为 **Spinner 2 处 + Skeleton 4 处**；`FilePreviewDialog` 对话框内保留 `Spinner` + 居中容器
  （局部等待语义，非页面载态）
- **执行期说明 2**：`ErrorState` 结构 = `AlertTitle`（错误文案，按 code 本地化）+ `AlertDescription`
  （重试 `Button`）；**未新增 i18n 键**（避免超批范围）
- **Commit**（待用户批准）：`refactor(web): migrate display primitives to official components`

**T3 Dialog + Tabs 归位 ✅**

- `FilePreviewDialog`：自绘浮层（`role="dialog"` + `aria-modal` + 手挂 Esc + 真 button 遮罩 + 手写
  `z-*`）→ 官方 `Dialog`（`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`）；
  **手写 `z-*` 与 Esc 监听整段删除**；标题 = 文件路径（`DialogTitle` → `<h2>`）；尺寸用 className 覆盖
- `DetailTabs`：自绘 `role=tablist/tab/tabpanel` + 手挂激活线 → 官方 `Tabs`（`TabsList variant="line"`
  + `TabsTrigger` + `TabsContent` **`forceMount`**）；激活指示覆盖为 **实底 `--primary` 2px 下划线**
- 门禁（web 侧）：`typecheck` ✅ · `lint` ✅（78 文件 0 诊断）· `format` ✅ · `build` ✅
- **断言①**：`grep 'z-\[' FilePreviewDialog.tsx` = **0** ✓（原注释里出现该串已改写，避免误命中）
- **断言②（探针实证）**：Dialog 打开后连按 Tab ×6，`activeElement` **始终在 dialog 内**（焦点陷阱 ✅）；
  **关闭后焦点归还触发元素 ✅**（见执行期说明 ②）
- **断言③（探针实证）**：**Esc** ✅ · **点遮罩**（边缘点，非中心）✅ · **内置 ✕** ✅ 三路关闭；
  尺寸实测（computed，前台标签）：**w = 658.234px = `min(720px, 88vw)`** · **max-h = 358.72px = 76vh** ·
  `border-width` **1px** · 圆角 **10px**（官方 `rounded-lg`）· **滚动锁** `body overflow: hidden` ✓
- **断言④**：`Tabs`/`TabsList variant="line"`/`TabsTrigger`/`TabsContent forceMount` 齐 ✓；
  激活线 `::after` 计算值 = `oklch(0.488 0.243 264.376)`（= **`--primary`**）· `height: 2px` · `opacity: 1` ✓
- **断言⑤（探针实证）**：Tab 聚焦后派发 **ArrowRight（CDP 可信键）** ⇒ `aria-selected`
  `[true,false,false]` → `[false,true,false]` ✓ · `aria-controls` 已接线 ✓
- **断言⑥（探针实证）**：`window.fetch` 插桩 —— 页面加载 **6** 请求 → 切 versions → **6** → 切回 overview
  → **6**（**增量 0**）✓

**执行期说明（3 处，均含实测证据）**

1. **面板可见性缺陷（同轮修）**：Radix `forceMount` **不下发 `hidden` 属性**（实测三面板
   `display:block` 全可见、叠高至 1995px ⇒ 页面明显损坏）⇒ `TabsContent` 补
   **`data-[state=inactive]:hidden`**；修后实测 **mounted 3 / visible 1** ✓（同时修掉「非激活面板进入
   a11y 树」）——该坑已写入组件注释
2. **焦点归还自补**：触发按钮在 `FileTree` 内、本件**无 `DialogTrigger`** ⇒ Radix 关闭自动归还（依赖
   Trigger）不生效（实测 Esc 后 `activeElement ≠ 触发钮`）⇒ 首渲染捕获打开前焦点、卸载时归还
   （`restoreRef`）；修后实测 **焦点归还 = true** ✓
3. **`forceMount` 的请求时点变更（登记）**：`forceMount` 使 `VersionCompare` 在**页面加载**即挂载 ⇒
   其 compare 请求由「切到 versions 时」提前到「页面加载时」（实测 fetch **5 → 6**，增量即
   `GET /versions/compare?from=1.0.0&to=1.1.0`）。design §3.3 明列 `forceMount`，收益 = **面板内状态
   保留**（对比基/目标选择不因切 tab 丢失）；代价 = 每访问详情页多 1 次 compare 请求。→ **登记为
   T8/收尾复核项**（若判定该代价不可接受，可改为「active 面板才 forceMount」或让 VersionCompare 懒取数）

## 3. 风险与回退

- **回退面**：逐 Task 独立 commit ⇒ 可单件 `git revert`；官方件与手搓件在归位期间**并存同 commit**，无中间态
- **风险 ①（观感）**：A′ 使页面级卡 18→14px + 全站卡加 1px 描边 ⇒ **唯一需要用户复看的项**（design §8.1）
- **风险 ②（a11y 结构变更）**：`Dialog`/`Tabs` 换官方件后 DOM 结构变化 ⇒ 既有 dogfood 若依赖旧选择器需同步调整
  （**只改选择器不改语义**；若出现断言语义冲突 → 停下回 design）
- **风险 ③（依赖新增）**：4 个包（3 组）新增 npm 依赖 ⇒ 落位后必须 `bun install` + lockfile 同批提交 + 全门禁
- **不做**：为归位改测试语义 / 放宽断言（归位是来源变更，测试红 = 越界信号，须查根因）
- **登记（不阻塞）**：`--radius-2xl` 潜在零消费者（design §6.4）· `VersionCompare` 原生 select 保留 ·
  `Hero`/`DiffView`/`DiffNav`/`TypeIcon`/`MarkdownRenderer` 官方无对应件（design §3.13/§3.14）

## 4. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-14 | sunxuewen-rush | 初稿：M4b-1 地基批 Task 清单 **T1-T8**（补装+依赖 → Card → Dialog+Tabs → 展示件 → 面包屑/Collapsible/Pagination → 控制台面域+跨面件+Toaster → 合规清理 → 门禁/冒烟/自检/回写），每 Task 含 Files / Assert（可现场跑）/ Commit；风险与回退、登记项；依据 design `2026-09-14-m4b1-console-foundation-design.md` v1.0 定稿 |
| v0.2 | 2026-09-14 | sunxuewen-rush | **术语标准化（用户定：主 design ↔ 批 design）**——全篇 `umbrella` → **主 design**（2 处）；引用链措辞统一 |
| v0.3 | 2026-09-14 | sunxuewen-rush | **口径统一 + 版本引用去硬值 + 执行回写**：① 官方件口径 → **新落仓 11 件（表列 13 项）**（§1 目标）② 依赖口径 → **4 个包 / 3 组**（落地记录 + §3 风险）③ 对上游主 design 的 2 处硬版本引用去值（版本头 Updated · 引用链）④ T1 Files 的 `login-03` 按执行期修正 1 回写为「已移除」⑤ 本轮文档模型变更 8 维自检记录于主 design v1.6 行（修正前 8.94 → 修正后 **9.50**） |
| v0.4 | 2026-09-14 | sunxuewen-rush | **T2 落地回写**：Card 全站归位 **8 处**（Hero/CenterPage 页头/FilterStrip/DetailTabs 壳/AssetDetail×3/AssetCard）· 断言 ②③④⑤ 全绿（④ = 真浏览器 8/8 卡 14px + 1px 描边实测）· 门禁 web 四连绿（CSS 108.91 kB / JS 565.67 kB）· **执行期说明 2 处**（「13 处」按实测拆账 = 8 卡 + 5~6 tile，登记 T8 回写；官方子件按需使用 + `h1`/`h3` 语义保留） |
| v0.5 | 2026-09-14 | sunxuewen-rush | **T3 落地回写**：`FilePreviewDialog` → 官方 `Dialog`（手写 z 值与 Esc 监听整段删除）· `DetailTabs` → 官方 `Tabs`（`variant="line"` + `forceMount` + 激活线覆盖 `--primary` 2px）· 断言①-⑥ 全绿（②③⑤⑥ 均为真浏览器探针实证：焦点陷阱/三路关闭/键盘左右/切走切回零重拉）· **执行期说明 3 处**（Radix forceMount 不下发 hidden → 补 `data-[state=inactive]:hidden`（此前三面板叠显，页面损坏）· 无 DialogTrigger 时焦点归还自补 · forceMount 使 compare 请求提前，登记 T8 复核） |
| v0.6 | 2026-09-14 | sunxuewen-rush | **T2 回归修复**：`CardHeader` 的 `container-type: inline-size` 致页头宽度塌陷（描述 43~64px → 6~12 行 → 卡高 240~357px，三页实测），补 `flex-1`；三页 × 两档视口复测 + 门禁四件绿。**执行期说明**：窄屏 <768 多行属响应式策略，未夹带（用户拍板 A） |
| v0.7 | 2026-09-14 | sunxuewen-rush | **T4 落地回写**：5 件展示件归位官方（`Badge` 加 `success`/`warning` variant + 薄映射 · `Avatar`+`Fallback` · `Spinner` 删除直连 · `Empty` · `Alert`+`Button`）· 页面级载态改 `Skeleton`（4 文件）· 断言①-⑥ 全绿（真浏览器：token 色值/fallback 链/alert role/骨架 8 壳/自绘 pulse 归零/两套空态文案）· 门禁四件绿 · **执行期说明 2 条**（载态口径按实测改写 = Spinner 2 + Skeleton 4；`ErrorState` 未新增 i18n 键） |
| v0.8 | 2026-09-14 | sunxuewen-rush | **T5 落地回写**：面包屑→官方 `Breadcrumb` 全族 · `FileTree` 折叠→官方 `Collapsible`（零样式包装）· 分页→官方 `Pagination` 全族（控件按用户拍板 (c) 用官方 `PaginationPrevious`/`Next`）· 断言①-④ 实测（居中差 0 / 折叠收起不可聚焦 / 零 href 泄漏 / 末页双禁用）· 门禁四件绿 · **执行期说明 4 条**（(c) 严格用官方 `PaginationLink`：**英文硬编码标签 + 键盘不可达**两条代价实测登记、`common.prev/next` 键删除· **「翻页回顶」原为契约-代码不一致 → 用户拍板 (b) 补齐**（`handlePageChange` 内 `scrollTo`，250px 视口下 `scrollY` 291→0 而 `maxScroll` 仍 291 = 可判定实测；探针已回滚）· `mx-auto` 口径修正（真值 `justify-center`）· 面包屑官方默认非零变化）+ **待复验项 1**（URL 更新但视图推进不稳定：探针环境稳定复现、未定性为应用缺陷，留 T8/真数据无仪器复验） |
| v0.9 | 2026-09-14 | sunxuewen-rush | **T6 落地回写**：新建 10 件（console 6 + ui 4）+ `main.tsx` 挂 `Toaster` + i18n 三组骨架键；断言①-⑥ 全绿（探针页实测：表头 40 / 单元格 p-2 / 三态齐 / 抽屉宽 560 / SheetTitle / 原因必填门 / 状态映射 / toast 单条 / 守卫两跳 / 剪贴板读回）；门禁四件绿（JS 633.16 kB，+39 kB）；**执行期说明 3 条**（TanStack v9 走官方 `/legacy` 子路径避未声明依赖 · design 缺 `UPLOADED` 映射取 secondary 待确认 · 探针期后台标签冻结 CSS 退出动画致「关闭不卸载」已定性为环境非缺陷） |
| v0.10 | 2026-09-14 | sunxuewen-rush | **版本八态映射拍板回写**：`UPLOADED` = **warning**（对标 21-skillhub 列表页 review 档；原 design 只列 7 态、初版推断取 secondary）+ `YANKED` destructive → **secondary**（对标 skillhub 详情页灰档，且与门户侧 `VersionCompare` 代码实况一致）；主 design 同步升 **v1.7**（八态映射缺口闭合 · 执行期说明 2 由待确认转已闭合）；M4a design §4.4 门户侧表述订正 `destructive` → `neutral`（升 v0.25）；本件断言④ 映射复测。**顺带订正**：修订记录 v0.5-v0.9 行序倒挂（历史追加所致）→ 统一升序 |
| v0.11 | 2026-09-14 | sunxuewen-rush | **T7 合规清理落地回写**：`FilterStrip` chips → 官方 `ToggleGroup`/`ToggleGroupItem`（根行）+ `Toggle`（「全部」与子行）；chip 外观落 **官方 `toggle.tsx` 加 `variant="chip"`+`size="chip"`**（第 ④ 路径，同 T4 Badge 法）；原自绘三段模板串常量与 `cls(on)` 删除 ⇒ 全仓模板串条件类 **= 0**；`Hero` 搜索行判定「并列 → 保持」+ 判据注释。断言①-④ 全绿（真浏览器：`/skills?label=agentic` + 卡片 3→1 + 「筛选结果：1」+ 「全部」复位；hover 四态 `forcePseudoState` 确定性读；i18n zh/en 各 3 键 + 切 EN 零裸键）。门禁四件绿（JS 638.38 kB，+5.09 kB = Toggle 原语首次进包）。**执行期说明 5 条**（`spacing` 按 0.25rem 标度 ⇒ 用 1.75 得 7px；内距统一 `px-3` 12px；两处 `!` 提权=`rounded-full!` + 未选态 hover 字色；断言① 的 `cn(` 项重界定为「全仓模板串=0」；`--radius-2xl` 维持不改） |
