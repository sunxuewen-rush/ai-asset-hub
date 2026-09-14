# M4b-1 地基批（组件归位 + 控制台组件面域）实现计划

> Date: 2026-09-14
> Updated: 2026-09-14（**v0.3：口径统一 + 版本引用去硬值 + 执行回写**——① 官方件口径 → **新落仓 11 件（表列 13 项）**② 依赖口径 → **4 个包 / 3 组** ③ 对上游主 design 的 2 处硬版本引用去值（以版本头为准）④ T1 Files 回写 `login-03` 实际处置（已移除）；**v0.2：术语标准化**（主 design ↔ 批 design）+ 版本头同步；v0.1：初稿——M4b 拆批后首批 **M4b-1** 的 Task 清单（T1-T8）；依据批 design `2026-09-14-m4b1-console-foundation-design.md`（定稿）与上游主 design §2.3）
> Status: **执行中**（**T1 ✅ 2026-09-14**；T2-T8 ⬜）
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

### T2 Card 全站归位（design §3.1）
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
- **Commit**: `refactor(web): adopt shadcn Card across portal surfaces`

### T3 Dialog + Tabs 归位（a11y 债清零；design §3.2/§3.3）
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
  ③ 6 处 `Spinner` 消费点全部指向官方 `spinner`（`grep -rn "components/ui/shadcn/spinner" apps/web/src | wc -l` = 6）
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
  ③ 分页 **offset 语义回归**：翻页回顶 · 竞态 abort · 末页禁用 · 「共 N 条」文本 —— 逐条复验（沿用 M4a T11 口径）
  ④ 分页**居中**实测（`mx-auto` 生效）；`PaginationLink` 渲染为 `button`（无 `href` 泄漏）
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

### T7 合规清理（design §6）
- **Files**: Modify `components/market/FilterStrip.tsx`（`ToggleGroup`/`Toggle` + `cn()`）·
  门户搜索行（`Hero.tsx`：按判定用 `InputGroup` **或**保持并列）· 全仓手写模板串条件类 → `cn()` ·
  `apps/web/src/i18n/{zh,en}.ts`（三组骨架键）
- **Assert**:
  ① `FilterStrip` 固定集合用 `ToggleGroup`+`ToggleGroupItem`；动态标签用 `Toggle`；条件类含 `cn(`；
     `grep -c 'CHIP_OFF\|CHIP_ON' apps/web/src/components/market/FilterStrip.tsx` = 0
  ② 筛选交互回归：点标签 → `?label=` 生效 + 列表收窄 + 「筛选结果：N」；点「全部」→ 复位（沿用 M4a T22 断言）
  ③ 输入框内按钮（若判定为「框内」）用 `InputGroup` + `InputGroupInput`/`InputGroupAddon`；**若为并列则不改**并在注释写明判据
  ④ i18n 三组骨架键在 `zh`/`en` **成对存在**（`grep` 计数相等）；无裸键泄漏（语言切换冒烟复用）
- **Commit**: `refactor(web): apply shadcn compliance rules and i18n skeletons`

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
