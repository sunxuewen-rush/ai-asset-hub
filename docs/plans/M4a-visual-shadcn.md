# M4a 视觉体系切换（shadcn 落地）实现计划

> Date: 2026-09-11
> Updated: 2026-09-11（**v0.24：整体审计（T17-T26）修正 + 登记（20-24）**——两处自产数字按实测修正（`.module.css` 12→**16**·§4.4 ⑦ 44→**93 属性/29 token 名**）+ §3 表 20-24 五项登记；审计结论 代码 **9.62** / 文档 **9.53**；**v0.23：阶段 1 完成 + converge（T26）**——T17-T26 全 ✅：详情页 / 中心页换皮（`.module.css` **16 → 0**（16→14→12→9→2→1→0））· design 正文语义回写 18 行 · 删旧层（样式单入口 = `index.css` + `aih-theme.css`）· 五门禁 **475 例 474 pass / 1 skip / 0 fail** · 全态冒烟 **36/36 + NO JS ERRORS** · 观感用户确认 OK · converge 三查 + design **8 维重评 9.56** + `00` §5 M4a 行改 **✅ 完成**；**v0.10：阶段 1 任务细化（T16 出口动作）**——新增 **§2 板块 E/F/G**：**T17-T20 详情页换皮**（头区+Tab / Overview+Markdown / Files+FileTree+预览对话框 / VersionCompare+Diff）· **T21-T22 中心页换皮**（CenterPage / FilterStrip）· **T23-T26 收尾**（17 处 M4-pre 语义回写 / 删旧层 `.module.css`×16 + `tokens.css` + `global.css` / 阶段 1 门禁+全态冒烟 / converge 重评）；§3 补「**附带评估项**」5 条（大屏留白 / `apps/web` 测试基建 / 包体 code-split / tooltip 人工确认 / lint warning 清债）；Status 改「执行中（阶段 1）」；v0.9：**阶段 0 出口达成**——**T14 三判 ✅**（用户结论：气质 / 密度 / 类型色 **三项 OK**）+ **T15 收尾 ✅**（`git rm` `dev/ReviewControls.tsx` + `main.tsx` 两处引用，grep 断言 0；门禁复跑全绿 + 生产包 marker 仍全 0）→ §2 新增「增补（v0.9）」块；Status 改「阶段 0 已完成 ✅」；引用链 design 升 **v0.21**；v0.8：**阶段 0 收尾回写**——① §2 落地记录增三块：**v0.18/v0.18b（hero 上下与侧栏对齐 + 撑满职责上移去硬编码）· v0.19（去中间分割线）· v0.20（统计条改卡片撑满 hero）** ② **T13 ✅**（自检记录 `docs/smoke/2026-09-11-m4a-visual-s0.md`）+ **T15 部分 ✅**（**五门禁全绿**：`CI=true` 单库 + `--force` → **475 例 474 pass / 1 skip / 0 fail**、1150 expect；冒烟 chain-smoke + dogfood 通过；**撤控件待三判后**）③ **§1 修内部矛盾（自检发现）**——原「本阶段零服务端改动」「本 plan 不改测试」经 v0.17 已失效（`totalUsers` 是服务端契约 + 测试新增口径断言）→ 改述为「阶段 0 唯一例外」并注明出处 ④ 引用链 design 升 **v0.20**；v0.2：**AIH blue 基色层生效**——T3 改为**两层结构**（官方层 `src/index.css` + AIH 层 `src/styles/aih-theme.css` 独立文件、官方样式之后 import），新增「覆盖断言 / import 顺序断言 / 组件零改动断言」三条；T13 增顺序断言；design 依据升至 **v0.10**（解耦纪律）。v0.1：初稿——**阶段 0 探针切片**（4 板块 / T1-T16）+ 阶段 1 范围登记；design 依据 v0.9（2026-09-11 定稿，8 维 9.31））
> Updated: 2026-09-11（**v0.4：增 T7b 侧栏收起（阶段 0 增补）**——用户 2026-09-11 拍板「做，按推荐」：接入 shadcn
> `Sidebar` 原语（`collapsible="icon"` + `variant="floating"` + `SidebarTrigger`/`⌘B` + cookie 持久化 + 移动端
> Sheet），4 处 AIH 覆盖（展开宽 204px · 图标态 48px · 圆角 2xl · 定位 `top-[58px] bottom-0`）；依据 design v0.12；
> 性质 = 结构/行为变更（非纯视觉），共享壳正在换皮故并入；v0.3：**T1-T7 落地回写**——① §2 新增「落地记录」小节（实测证据集中登记：T4 旧层降级 + T5-T7 浏览器实测值）② T3 断言 ④ 按产物实测修正（压缩后 `html[data-base=aih]`）③ T6 断言修正（「<900px 图标态」旧实现不存在 → 不补，登记为差异）④ T7 形态修正（**保 pill**，2026-09-11 用户拍板）⑤ 依据 design 升 **v0.11**）
> Status: **已完成 ✅（阶段 0 + 阶段 1，2026-09-11）** ——**阶段 0 已完成 ✅（2026-09-11 三判通过）**：板块 A 基建（T1-T3）✅ · 板块 B 共享壳（T4-T7）✅ · T7b 侧栏收起（阶段 0 增补）✅ · 板块 C 首页（T8-T12）✅ · T13 自检与硬证据 ✅（`docs/smoke/2026-09-11-m4a-visual-s0.md`）· T14 三判 ✅（气质 / 密度 / 类型色 三项 OK）· T15 门禁 + 冒烟 + 撤控件 ✅ · **T16 阶段 1 任务细化 ✅（2026-09-11）**；**阶段 1 = T17-T26**（详见 §2 板块 E/F/G）：**T17 详情页外壳 ✅（2026-09-11）** · **T18 详情页总览 + markdown ✅（2026-09-11）** · **T19 文件树 + 预览对话框 ✅（2026-09-11）** · **T20 版本对比 + diff ✅（2026-09-11，含 4 共享原子件增补）** · **T21 中心页 ✅（2026-09-11，`.module.css` 存量 2 → 1）** · **T22 标签筛选条 ✅（2026-09-11，`.module.css` 存量归零 = 板块 F 收官）**（⬅ 板块 E 详情页 4 Task **全部完成**） · **T23 M4-pre 语义回写 ✅（2026-09-11，design 正文 18 行重写）** · **T24 删旧层 ✅（2026-09-11，样式单入口 = `index.css` + `aih-theme.css`；CSS −3.24 kB）** · **T25 五门禁 + 全态冒烟 ✅（2026-09-11，475 例 474/1/0 · dogfood 36/36 · 记录 `docs/smoke/2026-09-11-m4a-visual-s1.md`）** · T26 converge ✅（三向同步 + 8 维重评 9.56 + `00` §5 注记）；**阶段 1 出口四项全达成 = 五门禁全绿 + dogfood 全态 + 观感用户确认 OK + converge 8 维重评 9.56**
> 引用链：本文档 → 设计 `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **v0.24**（§N 逐 Task 引用）→ 规范 00 §5 · 07（引用不复制，契约以 design v0.23 为准）
> 命名约定见 `docs/plans/README.md`

## 1. 目标与范围

**目标**：把已定稿的 shadcn 蓝科技视觉体系（design §4.4 = **全站视觉真值 SSOT**）落到真仓——先做
**阶段 0 探针切片**（基建 + 共享壳 + 首页），让用户在**真实站点、真实数据**上看效果并给出三判，
再决定是否全量换皮。切片存在的理由：一次换 26 个 CSS Modules 成本高，而气质/密度/类型色的
不确定性在「壳 + 首页」就已耗尽。

**前置已就绪**：M4a 门户 ✅（五路由 + AppShell，CSS Modules + `tokens.css`）· 视觉体系定稿
（design v0.9，2026-09-11）· 技术可行性实证（沙箱 spike：22 组件 / tsc 零错 / build 绿，
`bun.lock` 版本实测）· 本阶段原则**零服务端改动**——**唯一例外 v0.17**：首页统计条「原生类型」→
「用户数量」连带 `/api/stats` 新增 `totalUsers`（服务端契约 + 口径断言），见 §2 增补（v0.17）。

**不含**（design §8 / §2.2）：
- **阶段 1 剩余页换皮**（详情三 Tab / FileTree / 预览对话框 / VersionCompare / Diff / CenterPage /
  FilterStrip）——范围登记在本文件 §3，**任务已细化 = §2 板块 E/F/G（T17-T26，2026-09-11）**
- 门户任何**功能与行为变更**（本计划是视觉变更：契约 / 端点 / 测试语义不动）
- M4b 控制台面（另立项）· **M4b 特有值 2 项**（表格密度 40/48 · 抽屉宽 384/560——属 M4b 定稿条件）
- 暗色档 UI 开关（`next-themes` 依赖装上，但切换入口不在阶段 0；本阶段只保证 `.dark` 变量可解析）

**执行纪律**（沿用 M4a plan + 本次特有）：
- commit 点 = Task 结束（Conventional Commits）；**每个组件换皮独立 commit**（便于逐件回退/对比）
- 禁 mock 服务模块；网络层 stub 仅限 `globalThis.fetch`；测试数据前端不涉及（本 plan 不改测试）——
  **唯一例外 v0.17**：`stats.test.ts` 增「仅 ACTIVE 计入」口径断言（配服务端 `totalUsers` 契约变更）
- **shadcn 组件只走 CLI 装，禁手抄源码**（v4 组件 `import { cn } from "cn"`，手抄缺该转换 → design §4.1 ④）
- **门禁统一在代码落地后跑**（用户 2026-09-11 定）：typecheck / lint / format:check / build / test —— 不逐 Task 跑
- 浏览器观感由**用户人工确认**（实现侧沙箱 Edge headless 不稳）→ **硬证据只报** `tsc` + `vite build` + `dev` 200
- 视觉实现以 design **§4.4** 为准（色值 / 圆角轴 / 字阶 / 组件真值 / token 映射表），漂移视为缺陷
- 评审控件（逐页对比用临时开关）→ **阶段 0 出口后撤除**，不留进终态
- **每个 Task 收尾必跑自检打分**（用户 2026-09-11 定）：**代码 18 维**（A 基础 0.40 + B 深度 0.30 +
  C 工程 0.30）+ **文档 8 维**（AIH 门禁 = 标准 4 维 + 深度 4 维；框架见 `self-review-scoring` 技能）
  → **≥9 才报告/提交**；打分表 + 问题清单（🔴/🟡/⚪）随该 Task 报告一并给出；**自检发现的缺陷同轮修**
  （先例：T18 自检抓到「断言不可现场跑」＝假失败，同轮收紧）。打分须**换靶**：每轮抓新真问题，
  禁同分重报（`self-review-scoring` 换靶铁律）

## 2. Task 清单

### 板块 A 基建落仓（design §4.1 · §8 阶段 0 第 1 块）

#### T1 Tailwind v4 + Vite 接入 + token 入口
- **Files**: Modify `apps/web/package.json`（devDeps：`tailwindcss@4.3.3` · `@tailwindcss/vite@4.3.3` ·
  `tw-animate-css@1.4.0` · `@types/node`；runtime 见 T2）· `apps/web/vite.config.ts`（plugins 加
  `tailwindcss()`；`resolve.alias { "@": <abs src> }`；**保留既有 `server.proxy['/api']`**）·
  `apps/web/tsconfig.json`（`paths { "@/*": ["./src/*"] }`）· Create `apps/web/src/index.css`
- **Assert**: `bun install` 后 `bun run --filter=@ai-asset-hub/web build` 绿；`tw-animate-css` 可解析
  （不装 → build 报 `Can't resolve 'tw-animate-css'`）；`@/` 别名 tsc 与 build 双向可用；
  `/api` 代理行为不变
- **入口时机**：`src/index.css` **T1 只落文件、不 import**（保持零视觉影响）；首次 import 与 AppShell
  换皮同 commit（见 T4）——导入即启用 Tailwind **Preflight**（对既有 CSS Modules 页面有基线重置，属换皮预期）
- **独立编译证据**（T1 自证工具链真能用，不依赖"未 import"的空构建）：
  `bunx --bun @tailwindcss/cli@4.3.3 -i src/index.css -o /tmp/<check>.css` 成功 + 产物含 Preflight 与字体栈
- **换皮前基线（2026-09-11 实测，供阶段 0 对照）**：web 构建 = CSS **35.34 kB**（gzip 7.86）/ JS
  **437.32 kB**（gzip 139.40）
- **Commit**: `chore(web): add tailwind v4 + vite plugin and style entry`

#### T2 shadcn CLI 初始化 + 22 组件落仓
- **Files**: Create `apps/web/components.json`（**禁写 `base` 字段**——schema `.strict()`）·
  Create `apps/web/src/lib/utils.ts`（若 CLI 未生成）· Create `apps/web/src/components/ui/shadcn/*.tsx`
  ——落仓 22 件（定死清单：`table` `button` `badge` `card` `input` `select` `dialog` `sheet`
  `skeleton` `label` `separator` `switch` `dropdown-menu` `avatar` `sidebar` `breadcrumb` `tabs`
  `tooltip` `sonner` `pagination` `collapsible` `textarea`）
- **Assert**: `bunx --bun shadcn@latest info` 回显 framework Vite · tailwindVersion v4 · style new-york ·
  **base=radix** · alias `@`；组件实数 = design §8 清单（22 件，`ls | wc -l` 断言）；
  **大小写碰撞检查为空**：`git ls-files apps/web/src/components/ui | sort -f | uniq -di` 无输出
  （`badge.tsx` vs `Badge.tsx`、`pagination.tsx` vs `Pagination.tsx` 是同一路径——APFS + `core.ignorecase=true`）
- **Commit**: `chore(web): scaffold shadcn/ui components (new-york, radix)`

#### T3 token 落仓（**两层**：官方层单入口 + AIH 层自成一体；官方姿势 = 映射与值成对同文件）
- **Files**:
  · `apps/web/src/index.css`（**官方层 + 唯一入口**：`@import "tailwindcss"` +
    `@import "tw-animate-css"` + **`@import "./styles/aih-theme.css"`** + `@custom-variant dark` +
    `@theme inline`（**仅官方 token 映射**：语义色 + 圆角轴 + 字体栈）+ `:root`（官方 neutral 基色 +
    blue preset `#1447e6` / `#155dfc` / chart-1..5）+ `@layer base`）
  · `apps/web/src/styles/aih-theme.css`（**AIH 层，自成一体**：`@theme inline` **AIH 专属映射**
    （success / warning / type / tint / ava）+ `:root` 补丁值 + `html[data-base="aih"]` 基色层 15 值）
  · `apps/web/index.html`（`<html … data-base="aih">`——AIH 蓝为站点默认；A/B 对比只改此属性）
- **Assert**:
  ① **成对断言**：`aih-theme.css` 同时含 AIH **映射**（`--color-success` / `--color-type-skill` /
     `--color-ava-8`）与对应**值**（`--success` / `--type-skill` / `--ava-8`）——shadcn 官方姿势
  ② **隔离断言**：官方层 `index.css` 的
     `grep -cE 'color-success|color-warning|color-type-|color-tint-|color-ava-'` = **0**
     （官方层保持「可被 `shadcn apply --preset` 安全重写」）
  ③ **工具类生成断言**（一次性探针 + `bunx @tailwindcss/cli -i src/index.css -o /tmp/x.css`）：
     `.bg-success` / `.text-warning-foreground` / `.bg-type-skill` / `.bg-ava-3` / `.bg-primary` 均生成，
     且 `.bg-success` 编译为 `background-color: var(--success)`（`@theme inline` 语义 = 运行时覆盖可穿透）
  ④ **覆盖断言**：产物含 `html[data-base="aih"]` 块（特异性覆盖，**不依赖声明顺序**）
   —— **措辞修正（2026-09-11 实测）**：压缩产物引号被去，断言按 `html[data-base=aih]` 匹配
  ⑤ 字阶 9 档在构建产物 CSS 可检索
  ⑥ 旧 `src/styles/tokens.css` 与各 `.module.css` **本阶段不删**（双栈共存期，design §4.1）
- **Commit**: `feat(web): port shadcn tokens and AIH blue base layer (official layout, isolated)`

### 板块 B 共享壳换皮（4 件 · design §8 阶段 0 第 2 块）

> 壳是门户与控制台**共用**的——先换壳才能消除 M4b 的混搭期。每件：组件改 Tailwind/shadcn 原语 +
> **同 commit 删除对应 `.module.css`**（仓内不留孤儿样式）。**结构/路由/显隐逻辑零变更**（纯视觉）。

#### T4 AppShell
- **Files**: Modify `apps/web/src/main.tsx`（**首次 import `./index.css`**——单入口，AIH 层已由它 `@import`；
  Tailwind 与 Preflight 自此生效，换皮视觉变更起点）· Modify `apps/web/src/components/ui/AppShell.tsx` · Delete `AppShell.module.css`
- **Assert**: 五路由页面仍可渲染（SSR 冒烟脚本 `docs/smoke/scripts/m4a-chain-smoke.ts` 复用）；
  **Preflight 生效后既有未换皮页面无异常断版**（逐页过一遍）；`grep -rn 'AppShell.module.css' apps/web/src` 为空
- **Commit**: `refactor(web): enable tailwind entry and re-skin AppShell`

#### T5 TopBar
- **Files**: Modify `apps/web/src/components/ui/TopBar.tsx` · Delete `TopBar.module.css`
- **Assert**: 品牌字「AI X Hub」改**实底 `--primary`**（渐变大字废弃）；顶栏高 `58px` 不变；
  语言切换器挂载点不变；`grep 'TopBar.module.css'` 为空
- **Commit**: `refactor(web): re-skin TopBar (solid primary brand, 58px bar)`

#### T6 SideNav
- **Files**: Modify `apps/web/src/components/ui/SideNav.tsx` · Delete `SideNav.module.css`
- **Assert**: **导航结构与条目零变更**（不预埋 M4b 的「个人/管理」组——那是 M4b 范围）；
  激活态用 shadcn 语义（`bg-muted/50` + `text-foreground`）替代浅蓝底；<900px 图标态沿用
- **Commit**: `refactor(web): re-skin SideNav with shadcn nav semantics`

#### T7 LanguageSwitcher
- **Files**: Modify `apps/web/src/components/ui/LanguageSwitcher.tsx` · Delete `LanguageSwitcher.module.css`
- **Assert**: zh/en 切换行为与持久化不变（SSR 冒烟断言复用）；控件换 `Button variant="ghost"` + `DropdownMenu`
- **Commit**: `refactor(web): re-skin LanguageSwitcher with shadcn dropdown`

#### T7b SideNav 收起/展开 —— 接入 shadcn `Sidebar` 原语（**阶段 0 增补**｜2026-09-11 用户拍板「做，按推荐」）
- **Files**: Modify `apps/web/src/components/ui/AppShell.tsx`（`SidebarProvider` 包裹：`className="flex-col"` +
  `style` 覆盖 `--sidebar-width: 204px` / `--sidebar-width-icon: 48px`）· `TopBar.tsx`（**品牌字居左端**，
  其右为竖分隔 `Separator` + `SidebarTrigger`（`size-7` ghost 钮）——2026-09-11 用户拍板：品牌与触发钮
  **左右对调**（原触发钮在左））· `SideNav.tsx`（重构为 `Sidebar`（`collapsible="icon"` ·
  `variant="floating"` · `className="top-[58px] bottom-0 h-auto"` · `[&>[data-slot=sidebar-inner]]:rounded-2xl`）
  + `SidebarContent` / `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton`（`asChild` + `isActive` +
  `tooltip`）/ `SidebarFooter` / `SidebarRail`）
- **Assert**: 桌面 —— ① `SidebarTrigger` 点击 与 ② `⌘B`（Mac）/`Ctrl+B` **均可收开** ③ 收起态宽 **48px** 图标轨、
  悬停出 tooltip（文案随当前语言）④ 状态持久化 cookie `sidebar_state`（刷新后保持）⑤ **展开宽 = 204px**
  （既非官方 256 也非图标态 48）⑥ <768px 为 **Sheet 抽屉**（宽 18rem）；**导航条目 / 路由 / 计数逻辑零变更**
  （激活判定改 `useLocation`，替代子函数渲染）；类型色 icon 衬底与激活态视觉不变
- **Commit**: `feat(web): adopt shadcn sidebar with icon-rail collapse`

### 板块 C 首页换皮（5 件 · design §8 阶段 0 第 3 块）

> 首页是**气质判断的决定性页面**：白底细边单蓝 vs 玻璃渐变，全在此页可见。

#### T8 Home + Hero
- **Files**: Modify `apps/web/src/pages/Home.tsx` · `apps/web/src/components/market/Hero.tsx` ·
  Delete `pages/Home.module.css` · `market/Hero.module.css`
- **Assert**: hero 主标 96px（`--fs-hero`）改**实底 primary**；**氛围光斑删除**（`blur(90px)` 光斑零残留）；
  搜索框/CTA 换 shadcn `Input`/`Button`（真值 §4.4 ③）；统计区 `tabular-nums` 保留
- **Commit**: `refactor(web): re-skin Home and Hero (solid brand, no halo)`

#### T9 TypeEntryCard
- **Files**: Modify `apps/web/src/components/market/TypeEntryCard.tsx` · Delete `TypeEntryCard.module.css`
- **Assert**: icon tile 改 **44px / 圆角 13px / 实底类型色 / 白图标 22px**（渐变 tile 废弃）；
  **真实计数（R7 typeCounts）与 hover 箭头行为保留**；卡结构（icon 左置横向 grid、col1 跨行）不变
- **Commit**: `refactor(web): re-skin TypeEntryCard (solid type tiles)`

#### T10 AssetCard + AssetAvatar
- **Files**: Modify `apps/web/src/components/market/AssetCard.tsx` · `apps/web/src/components/ui/AssetAvatar.tsx` ·
  Delete `AssetCard.module.css` · `AssetAvatar.module.css`
- **Assert**: 头像 8 色板改**实底**（hash→色序不变，`--ava-1..8`）；卡 hover = 底色变化（不做位移/阴影升）；
  卡结构命名（§4.4 沿用 v0.6）逐项照抄；`c-*` 旧类型变量引用归零
- **Commit**: `refactor(web): re-skin AssetCard and AssetAvatar (solid palette)`

#### T11 Pagination
- **Files**: Modify `apps/web/src/components/ui/Pagination.tsx` · Delete `Pagination.module.css`
- **Assert**: 分页语义不变（offset 替换式 + 翻页回顶 + 竞态 abort——沿用 M4a）；控件换 shadcn `Button`
  变体；**不引入 shadcn `Pagination` 原语语义变更**（沿用既有交互，仅换皮）
- **Commit**: `refactor(web): re-skin Pagination with shadcn buttons`

#### T12 首页三态 + 响应式 + 评审控件
- **Files**: Modify `apps/web/src/pages/Home.tsx`（载态 `Skeleton` / 空态 / 错态）·
  Create `apps/web/src/dev/ReviewControls.tsx`（**临时评审控件**：密度档位 / 类型色开关 / 中|EN /
  ★待拍板标注——**仅供本阶段对比，出口后删除**）
- **Assert**: 三态齐（载/空/错，错态不空白、按 code 本地化）；断点沿用 M4a（<1200→3 列 / <900→2 列 /
  <900 侧栏图标态）；评审控件默认**关闭**且不进入生产构建（`import.meta.env.DEV` 守卫）
- **Commit**: `feat(web): add home state coverage and temporary review controls`

### 板块 D 验证与出口

#### T13 阶段 0 自检与硬证据 ✅（2026-09-11 完成 → 记录 `docs/smoke/2026-09-11-m4a-visual-s0.md`，断言全绿）
- **Files**: 无代码变更（产出自检记录：`docs/smoke/2026-09-11-m4a-visual-s0.md`）
- **Assert**: 换皮范围内 grep 断言为零残留——`backdrop-filter` · `var(--glass-` · `var(--grad-`
  （已换件）；`linear-gradient` **仅允许 §4.4 ②bis 白名单 3 token**（`--gradient-brand` /
  `--gradient-cta` / `--gradient-page`，值住 `aih-theme.css`）——**其余出现即红**（v0.14 用户拍板
  「主题需要蓝色渐变」后由「零残留」修正为白名单口径）；**AIH 层 import 顺序断言**（官方样式之后）；`bun run --filter=@ai-asset-hub/web
  typecheck` 零错；`bun run --filter=@ai-asset-hub/web build` 绿；`dev` 起服后 `curl -sf localhost:5173` 200；
  **浏览器观感不作断言**（交用户人工确认）
- **Commit**: `docs(smoke): record stage-0 re-skin self-check`

#### T14 用户三判（**阶段 0 出口闸门**）✅（2026-09-11 用户结论：**气质 / 密度 / 类型色 三项 OK** → 出口达成）
- **Files**: 无（用户人工评审：真站点逐页看）
- **Assert**: 用户对**气质 / 密度 / 类型色**三项分别给出结论；任一不通过 → 回 design §4.4 调 token
  后复看（改动面 = token 层，不动组件结构）
- **Commit**: 结论并入 T15/T16 的文档更新

#### T15 门禁全绿 + 冒烟 + 控件撤除 ✅（门禁五/五 + 双冒烟已完成，见「增补（v0.8）」②③；**撤控件留待三判后**）
- **Files**: Delete `apps/web/src/dev/ReviewControls.tsx` 及其引用 · Modify 相关页面
- **Assert**: 五门禁全绿（`typecheck` · `lint` · `format:check` · `build` · `test`；test 需
  `DATABASE_URL` 指向**已迁移**库，CI 口径 `CI=true` 单库 + `--force`）；SSR 冒烟
  （`docs/smoke/scripts/m4a-chain-smoke.ts`）与 dogfood（`m4a-dogfood.ts`）复用通过；
  `grep -rn 'ReviewControls' apps/web/src` 为空（控件已撤除）
- **Commit**: `chore(web): remove temporary review controls`
  + `docs: record stage-0 gates and smoke results`

#### T16 进入阶段 1（范围登记见 §3）✅（2026-09-11：任务已细化 = §2 板块 E/F/G，T17-T26；阶段 0 出口三条件达成）
- **Assert**: 三判通过 + 门禁绿 → 阶段 1 任务细化（本文件升 **v0.10**）；未通过 → 回 design
- **Commit**: 无（文档更新并入阶段 1 首个 commit）

### 板块 E 阶段 1 · 详情页换皮（4 Task；design §4.4 / §8）

> 全部为**纯视觉**：路由 / 数据编排（§5.3 两波）/ 懒加载缓存 / 交互语义零变更。逐件同 commit 删除对应 `.module.css`。

#### T17 详情页外壳（头区 + Tab 卡 + 右栏）✅（2026-09-11 落地；范围修正见下）
- **Files**: Modify `apps/web/src/pages/AssetDetail.tsx`（**整个页面外壳**：面包屑 / 头卡 / body 栅格 /
  右栏两张卡 / 载态 / 占位）· `apps/web/src/components/market/detail/DetailTabs.tsx` ·
  **Delete** `detail/DetailTabs.module.css` + `pages/AssetDetail.module.css`（两件均零消费后删）
- **范围修正（2026-09-11 执行期发现）**：原 Files 只列「头区」——但**右栏（下载卡 / 元信息卡）同在一个
  文件**且仍是玻璃面 + 蓝色投影 + 渐变按钮 ⇒ 若留到后续 Task，详情页会呈现「半玻璃半白卡」。故并入
  T17（理由：同一文件的外壳 + §4.4 废弃清单强制清除项）；并把 `--aside-w`(320) / `--topbar-h`(58)
  **写死为字面值**——避免 T24 删旧层后 `var()` 悬空（埋雷）
- **Assert**: Tab 激活指示改**实底 `--primary` 2px**（原「蓝青渐变线」归零——本件不得出现
  `linear-gradient` 裸字面量）；三 tab 切换 / 懒加载 / 缓存行为不变；右栏宽 **320px** / sticky **78px**；
  下载按钮 = `--gradient-cta` 叠 `bg-primary` + **无蓝色投影**（`box-shadow: none`）；i18n 动态键
  （`t('market', labelKey)`）仍工作；`grep -rn 'DetailTabs.module.css\|AssetDetail.module.css' apps/web/src` 为空
- **Commit**: `refactor(web): re-skin asset detail shell (head, tabs, sidebar panels)`

#### T18 OverviewTab + MarkdownRenderer ✅（2026-09-11 落地；**断言修正**见下）
- **Files**: Modify `detail/OverviewTab.tsx` · `apps/web/src/components/ui/MarkdownRenderer.tsx` ·
  **Delete** `MarkdownRenderer.module.css` + `detail/OverviewTab.module.css`（两件均零消费后删）
- **断言修正（执行期发现——原 Assert 两处与代码/规范不符，处置依 `plan-vs-spec` 纪律）**：
  1. **「安装与使用」卡不存在**：i18n `installTitle` / `installText`（zh/en）自 `6c2b27d`
     «feat(web): api client layer and i18n provider» 落库起**零消费者**（`grep -rn installTitle
     apps/web/src` 仅 i18n 两行）；design 全文「安装」**0 命中** ⇒ 该 UI **从未实现** = 断言漂移。
     按「**不擅自补功能**」（补 = 范围扩张 = 新决策）：本 Task **不新建此卡**，登记为待拍板（§3 附带评估项 6）。
  2. **`card.tsx` 首个消费点 → 不作**：design §4.1 纪律 1 与 §4.4 v0.20 行明确「**展示件手搓**、
     `card.tsx` 留 M4b」（权威链 **design > plan**），且本 Task **无卡容器需求**（总览 = metaBar + 正文）
     ⇒ 按 design 执行；plan 原措辞与 design 冲突，**以 design 为准**（§9 线框图 v0.7 注记「Tab 卡（shadcn Card）」
     与本决策的关系 → §3 附带评估项 7）。
- **Assert（实际执行口径）**: markdown 正文（标题 h1-h6 / 列表 / 代码块 / 表格 / 链接 / 引用 / hr）
  排版映射到 §4.4 ⑤ **字阶 9 档** + 语义色（`--ink`→`foreground` · `--text-2`→`muted-foreground` ·
  `--line-*`→`border` · 表头底 `--tint-row`→`bg-muted/50` · 链接 `--brand`→`primary`）；**正文内容零改写**；
  内联 code 与 `pre` 内 code **元素互斥**（`:not(pre)>code`）；**零旧 token 消费**——
  `grep -rn 'var(--fs-\|var(--md-' apps/web/src/components/ui/MarkdownRenderer.tsx
  apps/web/src/components/market/detail/OverviewTab.tsx` = 0
  （⚠ 首版断言写 `--md-` 会**命中本轮自述注释**＝假失败，自检发现后收紧为 `var(--` 消费级；`tokens.css` 里的
  `--md-*` 定义体不匹配该模式，随 T24 删除）
- **Commit**: `refactor(web): re-skin detail overview and markdown`

#### T19 FilesTab + FileTree + FilePreviewDialog ✅（2026-09-11 落地；**断言修正**见下）
- **Files**: Modify `detail/FilesTab.tsx` · `detail/FileTree.tsx` · `detail/FilePreviewDialog.tsx` ·
  **Delete** `FilesTab.module.css` + `FileTree.module.css` + `FilePreviewDialog.module.css`（三件零消费后删）
- **断言修正（执行期发现）**：「**焦点陷阱**行为不变」——实测 `FilePreviewDialog.tsx` **无任何焦点管理**
  （仅 `useEffect` 挂 Esc 监听；无 `focus()`/`ref`/`tabIndex` 陷阱）⇒ 「焦点陷阱」是**从未实现的愿望**，
  属断言漂移（同 T6「<900px 图标态」）。按纪律**保持现状不补功能**，登记为既有债（可访问性：Radix
  `Dialog` 原语本可提供，但换原语 = 行为变更 → 留 M4b 或另立）。
- **Assert（实际执行口径）**: 折叠树展开/收起（`aria-expanded` 翻转 + 子节点挂载）与目录层级不变；
  文件行 **sha 徽章（`formatSha` 产 `前4…后4` 截断）** 与体积列保留；`FileTree.tsx` /
  `fileTreeNodes.ts` 命名与大小写边界**不动**；**预览对话框 = 白卡**（`bg-card` + `shadow-lg`
  + `rounded-lg` = §4.4 ③ dialog 真值）+ **遮罩 `bg-black/50` 且 `backdrop-filter: none`**；
  `role="dialog"` / `aria-modal` / Esc / 点遮罩关闭 / ✕ 关闭四路可用；**零旧 token 消费**——
  `grep -rn 'var(--fs-\|var(--sha-bg\|var(--line-soft' <三文件>` = 0
  （⚠ **不把 `blur(` / `backdrop-filter` 写进 grep**：本轮注释里为说明「去 blur」会命中自述注释＝假失败，
  同 T18 的 `--md-` 教训；冻结判定改用**计算样式**——`getComputedStyle` 全页扫描 `backdropFilter === 'none'`，实测命中 **0**）
- **Commit**: `refactor(web): re-skin file tree and preview dialog`

#### T20 VersionCompare + DiffNav + DiffView ✅（2026-09-11 落地）
- **Files**: Modify `detail/VersionCompare.tsx` · `detail/DiffNav.tsx` · `detail/DiffView.tsx` ·
  **Delete** 三个 `.module.css`（零消费后删；`.module.css` 存量 12→9→**6**）
- **Assert（实际执行口径）**: **diff 内容色保留 GitHub 系**（新增 `#1a7f37` / 底 `#e6ffec` · 删除
  `#cf222e` / 底 `#ffebe9`）——**不并入 UI 语义色**（§4.4 ② 语义修正：diff 是**代码内容渲染色**；
  故 `DiffView` 内为**有意保留的字面值**，非 token 漂移）；双下拉对比 / `from=to` 空态 / 行号双列
  （`grid-cols-[46px_46px_1fr]`）/ 文件头 `+N−M` 折叠行为不变；**清掉阶段 0 登记的 lint info**
  （`VersionCompare.tsx:138 noUselessFragments` → 实测 **web lint = 0 诊断** ✅）
- **Commit**: `refactor(web): re-skin version compare and diff (keep github content colors)`

### 板块 F 阶段 1 · 中心页换皮（2 Task）

#### T21 CenterPage（页头 + 计数 + 网格）✅ 2026-09-11
- **Files**: Modify `apps/web/src/components/market/CenterPage.tsx`（全量 Tailwind 化）· Delete
  `CenterPage.module.css`（**1 个**——原文「Delete 两个 `.module.css`」系与 T22 混写，此刻
  `FilterStrip.module.css` 仍被 `FilterStrip.tsx` import，删则 build 必挂）· `apps/web/src/pages/Center.tsx`
  **零改动**（9 行纯转发，无视觉元素；仅核实 `CenterType = AssetType` 判定未变）
- **Assert**: 页头（类型 icon tile **44px 实底类型色** + 标题 + 描述 + 计数徽章）与 hero 语法一致 ✅
  （head = `bg-card` + `shadow-sm` + `rounded-2xl`；tile 44/r13 实底 `--type-*`；徽章 = hero tile 语法）·
  网格断点沿用（4 列 → <1200 3 列 → <900 2 列）✅ 桌面实测 4×287.5px · 三中心（skills / mcps / agents）
  同构 ✅（`rgb(37,99,235)` / `rgb(14,116,144)` / `rgb(109,40,217)`）· 路由参数 `CenterType` 判定与 i18n
  动态键不变 ✅（i18n 调用逐字零差）
- **Commit**: `refactor(web): re-skin center pages`

#### T22 FilterStrip（标签筛选条）✅ 2026-09-11
- **Files**: Modify `apps/web/src/components/market/FilterStrip.tsx`（全量 Tailwind 化）· Delete
  `FilterStrip.module.css`（**最后一个** ⇒ `.module.css` 存量 **1 → 0**）
- **Assert**: 横置两级筛选条结构不变 ✅（`div > span.title + div.cols > div.row(+div.row)` 嵌套与旧完全一致）·
  选中态用 shadcn 语义（`bg-primary` + `text-primary-foreground`）✅ 实测关过渡后 `oklch(0.488 0.243 264.376)`
  / `oklch(0.97 0.014 254.604)` / 边 primary / fw600 / **无蓝投影**；旧 `--grad-brand` 渐变 + `box-shadow` 属废弃项 ✓ ·
  排序控件与 `q` / label 查询参数拼装逻辑不变 ✅（实测点标签 → `?label=agentic` + 列表 3→1 + 「筛选结果：1」；
  点「全部」→ URL 复位 + 3 卡）· 与 `AssetGrid` 间距一致 ✅（`mb-3.5` 14px = grid `gap` 14px）
- **Commit**: `refactor(web): re-skin filter strip`

### 板块 G 阶段 1 · 收尾（3 Task + converge）

#### T23 17 处 M4-pre 语义回写（design 自身修正）✅ 2026-09-11
- **Files**: Modify `docs/designs/2026-09-09-m4a-marketplace-portal-design.md`（§11 已列行号：§1 L16 ·
  §3 L36/54/64/65 · §5.1-5.3 · §8 · §9）
- **Assert**: 仅**历史修订记录段**保留旧表述（史实不改）✅（§12 未动；§11 登记项改 ✅）；正文内 `@ns`
  坐标 → 全局唯一裸 slug ✅ · `/assets/:nsSlug/:slug` → `/assets/:slug` ✅ · `PUBLIC` 可见性维度 →
  **删除**（资产恒公开）✅ · 元信息卡「命名空间 / 可见性」列 → 删除 ✅（改为实测渲染「作者/更新时间/
  累计下载」）；与事实源 `2026-09-10-flat-model-refactor-design` 终态逐项一致 ✅
- **数量修正（自产量化铁律）**：v0.9 登记的「17 处」系当时 grep 清单且**行号已漂移** → 本轮**重新实测
  = 18 行**（多出 §9 面包屑行）；`/tmp/aih-t23.mjs` 逐处断言「命中唯一」后写盘（21 次替换全通过）
- **Commit**: `docs(m4a): rewrite spec-drifted sections to flat model`

#### T24 删旧层（`.module.css` ×16 + `tokens.css` + `global.css`）✅ 2026-09-11
- **Files**: Delete `apps/web/src/styles/tokens.css` 与剩余全部 `*.module.css`；`global.css` 只保留
  Tailwind 不提供的项（6px 细滚动条 → **已迁入 `aih-theme.css`** 后整体删除该文件）；`main.tsx` 去掉
  两个旧 import
- **Assert**（✅ 全部达成，**②③ 口径执行期收紧**——同 T19 先例「禁注释参与断言」）:
  - `find apps/web/src -name '*.module.css' | wc -l` = **0** ✅（T21/T22 已归零）
  - ② 旧层 import 断言（**收紧为 import 级**：原「路径字符串 grep = 0」会被 main.tsx 的**历史说明注释**
    命中 ⇒ 假失败）→ `grep -rnE "^\s*import .*styles/(tokens|global)\.css" apps/web/src` = **0** ✅
  - ③ `grep -rn 'var(--glass-\|var(--grad-\|backdrop-filter\|var(--fs-\|var(--c-skill' apps/web/src`——
    **收紧为「非注释行」**（17 处命中**逐条定性**后全为解释性注释：T17-T22 各文件的换皮映射说明 +
    `FilePreviewDialog` 的「原 blur 已清」+ `aih-theme.css` 迁移块说明）⇒ 非注释行 = **0** ✅；
    `backdrop-filter` 在 **dist 产物**中的命中 = Tailwind 自身工具脚手架（`--tw-backdrop-*` 与
    `transition-property` 列表），非旧层残留 ✅
  - **design §4.4 ⑦ 映射表逐项核对**（`--brand` / `--brand-2` / `--ink` / `--text-2·3` / `--bg` /
    `--glass*` / `--grad*` / `--line-*` / `--ring-focus` / `--shadow-*` / `--tint-row` / `--c-*` /
    `--ava-*` / `--fs-*` / `--md-*` / `--diff-*` / `--ct-*` / `--sha-bg` / `--r-*` / `--topbar-h` /
    旧层 `tokens.css` **93** 个自定义属性 · 映射表 15 行覆盖 **29** 个 token 名）**非注释行消费者 = 0** ✅（另 17 处命中经逐条定性全为解释性注释；滚动条 4 项按设计迁入 `aih-theme.css`）；细滚动条实测仍生效 ✅
    （见落地记录：**对照实验**证明与迁移前逐位一致）
- **Commit**: `refactor(web): drop legacy css layer after full re-skin`

#### T25 阶段 1 门禁 + 冒烟全态 ✅ 2026-09-11
- **Files**: 无产品代码变更（产出自检记录 `docs/smoke/2026-09-11-m4a-visual-s1.md`）；**冒烟脚本增强**
  `docs/smoke/scripts/m4a-dogfood.ts`（+7 条断言 · console 错误分列）· 截图 `docs/smoke/s1-*.png`（11 张，进仓）
- **Assert**: 五门禁全绿（`test` 经用户授权 + `CI=true` 单库 `--force` → **475 例 474 pass / 1 skip / 0 fail /
  1150 expect** ✅）；`m4a-chain-smoke`（**CHAIN SMOKE PASS**）+ `m4a-dogfood`（**`SMOKE_SHOT_PREFIX=s1-`**；
  36/36 PASS + NO JS ERRORS）✅；dogfood 覆盖**全态**——首页 / 搜索 / 筛选 / **多标签 OR** / 翻页（正当缺席）/
  详情三 tab / 文件预览 / **嵌套文件预览** / 下载 / 语言切换 / 404 / 空态 ✅（翻页与子标签行数据受限，
  后者以网络层 stub 实证 → §8 登记）；**收起态 tooltip 由用户人工悬停确认** ✅（结论写入记录 §7）
- **Commit**: `test(web): run stage-1 gates and full-state smoke`

#### T26 converge 收尾（文档-代码对齐 + 里程碑注记）✅ 2026-09-11
- **Files**: Modify design（版本头 / 修订记录 / §8 / §11 状态）· 本 plan（收尾）· `docs/00` §5 M4a 行 ·
  `docs/smoke/2026-09-11-m4a-visual-s1.md`
- **Assert**: converge 三查（版本头 / 修订记录 / 引用 / 状态同步）→ design **8 维重评 ≥9**；
  `docs/00` §5 M4a 行注明「**视觉体系切换 ✅ 完成**（阶段 0 + 阶段 1）」✅；无「代码已改、文档未跟」漂移项 ✅
- **Converge 三查（实测）**：① **版本头**——design `v0.23` / plan `v0.23` / `00` `v1.19` 三向互指一致 ✓
  ② **修订记录**——三文档各追加本工作单元行，历史行一字未动（史实不改）✓ ③ **引用与状态**——design §4.2 目录树 /
  §4.4 ⑦ / §8 / §11 同步；M2 design 失效标注 + m4b design 两处引用修正 ✓；`00` §5 M4a 行 ✅ 完成
- **design 8 维重评 = 9.56 ≥9**（标准 4：完整 9.5 · 一致 9.5 · 清晰 10 · 可实施 9.5；深度 4：设计纯粹 9.5 ·
  边界 9.5 · 实施精度 9.5 · 跨平台 9.5）——较定稿 9.31 **+0.25**，来源 = 正文与事实源逐行一致（T23）+ 三向同步
  + 线框图回写（非口径变化）
- **Commit**: `docs(m4a): converge re-skin milestone and sync tracker`

### 落地记录（2026-09-11 执行回写——实测证据）

> 门禁口径：typecheck / lint / format:check / build 全绿（**test 按用户口径「代码落地后」统一跑**）。
> 浏览器证据 = 本机真浏览器读取**渲染结果与计算值**（非推断）；**观感仍由用户人工确认**。

**T1-T3 基建（板块 A）**
- 落地：`vite.config.ts`（tailwindcss 插件 + `@` 别名，保留 `/api` 代理）· `tsconfig.json`（paths + node types）·
  `components.json`（**无 `base` 字段**）· 22 组件落 `src/components/ui/shadcn/` + `src/hooks/use-mobile.ts` ·
  `src/index.css`（官方层单入口）+ `src/styles/aih-theme.css`（AIH 层：**映射与值成对**）·
  `index.html`（`data-base="aih"`）
- 断言实测：成对 / 隔离（`index.css` 无 AIH 映射 = 0）/ 工具类（`.bg-success` → `var(--success)`）/
  覆盖（产物含基色块）四条全过；**T3 ④ 措辞修正**见上
- 基线对比：CSS 35.34 kB → **96.69 kB**（Preflight + 工具类入包）；JS **437.24 kB 基本不变**
  （22 组件未被引用 → tree-shaken，**零膨胀**）
- 生成物落仓须补跑一次 `bun run format` + `bunx biome check --write`（否则 `format:check`/`lint` 双红）；
  官方源码命中本仓规则的 2+3 条已在根 `biome.json` 加**仅作用 `components/ui/shadcn/**` 的例外**（design §4.1 坑⑤）

**T4 AppShell（+ 关键修复）**
- 落地：`main.tsx` 首次 import `./index.css` · `AppShell.tsx` 换 Tailwind 类 + 删 `bg-glow` 节点 ·
  删 `AppShell.module.css`（残留引用 = 0）· **`global.css` 降级**（删 `*` reset + `body` 交出
  `font-family/background/color` —— design §4.1 坑⑥）
- 实测：`main` padding **`0px` → `16px 22px 36px`**（修复前被无层 reset 压掉）· `body` 底色
  **`rgb(244,248,255)` → `rgb(248,250,255)`** · 旧页 `box-sizing: border-box` 正常 · `bg-glow` 节点 **0** ·
  `html[data-base]` = `aih`

**T5 TopBar · T6 SideNav · T7 LanguageSwitcher（板块 B）**
- 实测（真浏览器计算值）：顶栏 **高 58px** · 底 `#ffffff` · 下边 `#e3eaf6` · `backdrop-filter: none` ·
  品牌字 `#1447e6`（实底 primary，`background-image: none`）；侧栏 **宽 204px** · 底 `#f6f9ff` ·
  激活项底 `#eaf1fd` · 条目 5 条；语言控件 2 钮 · `aria-pressed` 正确 · `localStorage.aih.uiLang`
  持久化 + 重载复现 + 切回中文闭环
- 删 `TopBar/SideNav/LanguageSwitcher.module.css` 三件（残留引用 = 0）；JS 437.24 → **471.28 kB**
  （+34 kB = shadcn `Button` / radix 进包）
- **T6 断言修正**：原写「<900px 图标态沿用」——旧实现（`SideNav.module.css`）**零 `@media`，该形态不存在**；
  按「结构零变更」不补，**登记为 design/plan 与实现的差异**
- **T7 形态修正**：**保 pill**（2026-09-11 用户拍板）——原措辞 `DropdownMenu` 属交互行为变更，与 §1
  「本计划是视觉变更：契约 / 端点 / 测试语义不动」冲突，以纪律为准；控件换 shadcn `Button`
  （选中 `variant="default"` / 未选 `variant="ghost"`）
- **顶栏补竖分隔（2026-09-11 用户拍板 A）**：核实 **shadcn 无 Header / TopBar 组件**——`site-header.tsx` 只存在于
  官方 `blocks/dashboard-01`（成品块的一部分），非 registry 独立件 ⇒ 顶栏天然是**原语组合**。按官方 SiteHeader
  形态补 `Separator orientation="vertical"`（`data-[orientation=vertical]:h-4`，间距沿用本仓 `gap-3`、未照抄
  官方 `mx-2`）——实测 `1px × 16px / orientation=vertical / bg=#e3eaf6` ✓。官方另两点**明确不采用**：
  ① 「顶栏高度随侧栏收起变化」（`group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)`）——
  与 design §4.4 ⑥「顶栏高 58px 定值」冲突；② 面包屑入顶栏——与 design §3「面包屑在详情页内」重复。
  **随后用户拍板「品牌字与触发钮左右对调」**（原触发钮在最左）→ 现序 `品牌字 → 竖分隔 → 触发钮`，
  实测 x 坐标 `brand 16 → sep 96 → trigger 109`，收开功能复验通过（§3 与 T7b 的 Files 已同步）

**T8-T12 首页换皮（板块 C）**
- 落地：重写 `Hero` / `Home` / `TypeEntryCard` / `AssetCard` / `AssetAvatar` / `Pagination` 六件 + 删 6 个
  `.module.css`；新增 `src/dev/ReviewControls.tsx`（dev-only 评审控件，`main.tsx` 用 `import.meta.env.DEV`
  守卫挂载）；`aih-theme.css` 增 `--animate-rise` + keyframes（hero 入场 stagger 由 AIH 层自持，
  收尾删旧层后仍有效）
- 实测（真浏览器计算值）：hero 主标**实底 primary**（`background-image: none`）· hero `::before/::after`
  **均 none**（光斑清除）· 搜索框 **36px**/`rounded-md`（shadcn 真值）· tile **44×44 / r13px / #2563eb** ·
  卡底 `#ffffff` / **r14px** / `min-h 158px` · 头像**实底** `rgb(5,150,105)` + 无渐变 · 分页 **h32**
  （outline / primary）· 三态齐（Skeleton / EmptyState / ErrorState + 重试）· `localStorage.aih.uiLang`
  持久化复现
- **令牌运行时审计 15 项**逐值命中 design §4.4：`#f8faff` · `#0f172a` · `#e3eaf6` · `#3b82f6` ·
  `oklch(0.488 0.243 264.376)` · `#f6f9ff` · `#64748b` · `oklch(0.627 0.17 149.2)` ·
  `oklch(0.666 0.157 58.3)` · 类型三色 · `rgba(37,99,235,.1)` · `#f59e0b` · `#059669`
- 生产包断言：`临时控件` / `待拍板` / `阶段 0 评审` **全为 0**（评审控件不进生产构建）；包体 CSS 90.6 kB ·
  JS **474.6 → 563.6 kB**
- **修 bug（坑⑥ 第二实例）**：`tokens.css` `:root` 的 `--ava-1..8`（旧渐变）与 AIH 层 `:root` 同特异性 →
  靠源序**静默压过** AIH 实底值（头像实测仍 `linear-gradient(135deg, rgb(5,150,105)…)`）；`--tint-*` 同病。
  处置：从 `tokens.css` **删除**这两组（值归 AIH 层），并就地写明「本层禁声明同名变量」

**T7b 侧栏收起/展开（shadcn `Sidebar` 原语）**
- 落地：`AppShell`（`SidebarProvider` + `flex-col` + `--sidebar-width: 204px` / `--sidebar-width-icon: 48px`）·
  `TopBar`（左端 `SidebarTrigger`）· `SideNav`（`Sidebar`（`collapsible="icon"` · `variant="floating"` ·
  `top-[58px] bottom-0 h-auto` · `[&>[data-slot=sidebar-inner]]:rounded-2xl`）+ `SidebarContent` / `SidebarMenu` /
  `SidebarMenuItem` / `SidebarMenuButton`（`asChild` + `isActive` + `tooltip`）/ `SidebarFooter` / `SidebarRail`；
  激活判定改 `useLocation`）
- 实测（真浏览器）：展开 —— 面板 **204px** / gap 204px / 圆角 **18px** / 定位 `top 58px · h 842px`；
  收起 —— 面板 **66px**（= 48px 图标轨 + 8×2 gutter）/ gap 64px / 条目钮 **32×32** / 标签与计数
  `display:none` / Star 钮 32×32 / `data-collapsible=icon` ✓；cookie `sidebar_state` 写入 + **刷新复现** ✓；
  `⌘B` 键亦可切换 ✓；**<768px** —— 桌面侧栏不渲染、`SidebarTrigger` 打开 **Sheet**（宽 **288px = 18rem**、
  内含 5 条导航）✓
- **未验项（如实登记）**：收起态**悬停 tooltip** —— Radix tooltip 需真实指针事件，沙箱合成事件唤不起、
  CDP `Input.dispatchMouseEvent` 走 IPC 超时 → **留用户人工确认**
- **验证方法坑（新增，T13/T15 复用）**：沙箱浏览器**动画时间线冻结**——`document.getAnimations()` 常见
  20 个 `CSSTransition` 常驻 `currentTime=0` ⇒ 过渡期间**计算样式读数是过渡起点**，且**过渡优先级高于
  `inline !important`**（实测对该元素写 `width:66px !important` 仍读回 204px，一度误判为"收起不生效"）→
  **凡对带 `transition` 的属性做数值断言，先注入
  `*{transition:none!important;animation:none!important}` 再测**

**增补（v0.15）首页精简为「纯 hero 落地页」（用户拍板 A；性质 = IA 变更，非换皮）**
- 决策依据：hero 内已有「搜索 + 进入技能中心 + 三项真实统计（R7）」⇒「怎么进去」「库里有多少」均由
  hero 承担；被删两块的计数与 hero 统计**语义重复**，独有价值仅「三族一句话解释」与「内容新鲜度」→
  用户判定可舍
- 落地：`Home.tsx` **110 → 30 行**（仅 `fetchStats` + `<Hero>`）；删 `components/market/TypeEntryCard.tsx`
  （残留引用 0）；删 i18n 独有键 **8 个**（zh/en 同步：`exploreByType`/`latestTitle`/`latestAll`/
  `learnTypes`/`typeEntryUnit`/`typeEnSkill`/`typeEnMcps`/`typeEnAgents`；`centerTitle*`/`centerDesc*`
  被 CenterPage/AssetDetail 共用 → **保留**）
- **撑满一屏（配套必须项）**：`min-h-[calc(100vh-110px)]` + 垂直居中——110 = 顶栏 58 + AppShell `main`
  上下 padding（`pt-4` 16 + `pb-9` 36 = 52）。不做则 hero 卡自然高约 560px 之下留 ~280px 空白 =
  观感「页面没做完」
- 死链处置：hero 第二枚 CTA「了解资产类型」原指 `#explore-types`（区块已删）→ **整枚删除**，不另指定向
- 冒烟同步（`docs/smoke/scripts/m4a-dogfood.ts`；`m4a-chain-smoke.ts` 为纯 API 冒烟、**不涉及首页 DOM**，
  未改）：删「首页最新发布含 demo 资产」断言；「首页统计 资产总数」去掉 `最新发布` 条件；新增
  **负向断言**「首页仅 hero（无按类型探索/最新发布）」+ **死链断言** `a[href="#explore-types"] === null`；
  「首页入口 href 指向三中心」→ 改名「三中心 href 可达（侧栏导航）」（断言不变，语义随导航承载方变化）
- 实测（真浏览器计算值，1440×900）：`main > div` 计算 `min-height` **790px**（= 900 − 110 ✓）；
  hero 卡 **top 193 / bottom 745 / 高 553** ⇒ 上方留白 193 − 58 − 16 = **119**、下方留白
  900 − 745 − 36 = **119**（**上下对称 = 垂直居中** ✓）；`body.innerText` **不含**「按类型探索」
  「最新发布」✓；`a[href="#explore-types"]` = **null** ✓；主区 CTA 文本仅 `["Browse Marketplace"]`
  （**单枚**）✓；侧栏 `/skills` `/mcps` `/agents` 三条可达 ✓
- 回写：design §3 首页定义 / §4.2 组件树 / §8 UI 变动总览 / §9 线框图（hero 主标真值同步为**蓝渐变**）

**增补（v0.16）hero 撑满一屏 + 删 CTA + 统计条拆三族计数（用户拍板三项）**
- ① **hero 卡撑满浏览器**：`min-h-[calc(100vh-110px)]` 由 `Home` 包装层**下移到 `Hero` 自身**
  （+ `flex flex-col justify-center`；`py-12` 仅作短视口下的上下留白下限）→ `Home.tsx` 退化为
  `return <Hero />`（包装层不再需要）
- ② **「进入技能中心」CTA 整枚删除**：`browseMarket` i18n 键随删、`Link` 导入移除
- ③ **统计条拆分**：「资产总数」→「技能总数 / 专家总数 / MCP 总数」（源 = R7 `stats.typeCounts`，
  顺序按用户给定 技能→专家→MCP）；实现改为 `statsItems` 数组驱动（`value: null` → 渲染 `—`）；
  同排「累计下载」「原生类型」**按原样保留**（用户未要求改动）
- 实测（真浏览器，1440×900，zh）：hero 卡高 **790px**（= 900 − 110 ✓）· 卡内 top **74** / bottom **864**
  （= 58 + 16 / 900 − 36 ✓）· `scrollHeight` **900** ⇒ **恰好一屏、无纵向滚动条** ✓；
  `body.innerText` 含「进入技能中心」= **false** ✓；`main` 内 `<a>` 数 = **0** ✓；
  统计条 = `3 技能总数 · 0 专家总数 · 1 MCP 总数 · 1,502 累计下载 · 3 原生类型` ✓
- 冒烟同步（`m4a-dogfood.ts`）：「首页统计 资产总数」→ **「首页统计 三族计数」**（数字前置检查保留，
  改判三族标签）
- ⚠ **登记待定项**：统计条现 5 项，「原生类型 3」与三族计数语义重叠、「累计下载」是否保留——用户
  未表态，**按「不自行扩展/删减」原样保留**，如嫌拥挤可再删

**增补（v0.17）搜索栏加长 + 「原生类型」→「用户数量」（用户拍板；含后端契约变更）**
- ① **搜索栏加长**：Hero 搜索行 `max-w-[700px]` → **`max-w-[900px]`**（参考 google.com 宽度观感；
  输入框行内 `flex-1` 随行宽放大；**高度仍按 §4.4 真值 `h-9` 36px 不变**——用户只提"长度"）
- ② **「原生类型」删除 → 换「用户数量」**：`statTypes`（原硬编码 `3`）删、新增 `statUsers`
  - **后端契约变更（`/api/stats` 新增字段）**：`apps/server/src/assets/stats.ts` 加 `totalUsers`
    （`count(*) from user_account where status = 'ACTIVE'`，与资产聚合 `Promise.all` 并行）；
    `apps/server/src/http/stats.test.ts` 增**口径断言**——baseline 后建 2 个 ACTIVE + 1 个 DISABLED
    ⇒ 增量必须 = `2`（**锁死「仅 ACTIVE 计入」**）
  - **不动 `packages/protocol`**（实测 stats 形状**不在协议包**——仅在 server `PublicStats` 与 web
    `StatsResponse` 两处镜像）；前端同步 `api/types.ts` / `Hero.tsx` / i18n zh+en
  - ⚠ **口径披露**：`status = 'ACTIVE'`（排除 PENDING/DISABLED）由**实现侧**选定，1 行谓词可切全量
    `count(*)`；且用户规模**不属于**资产侧「防泄露」的「公开内容派生量」→ 属**主动披露项**
    （2026-09-11 用户拍板展示「用户数量」）
- 实测：`curl localhost:3000/api/stats` → `{"totalAssets":4,"totalDownloads":1502,
  "typeCounts":{"skill":3,"mcp":1},"totalUsers":6}`（server `bun --watch` 自动重载 ✓）；门禁 4/4 绿
- ~~⚠ **待办**：后端改动须跑测试~~ → **✅ 已跑**（2026-09-11，见下「增补（v0.8）」④）

**增补（v0.18/v0.18b）hero 上下与侧栏浮层对齐 + 撑满职责上移（用户拍板「hero 的上下需要和 sidebar 上下一致」）**
- **实测错位**：侧栏浮层面板 `66 → 892`（h 826）vs hero 卡 `74 → 864`（h 790）→ 根因 = `AppShell` `main`
  纵向内边距 `pt-4 pb-9`（16/36）是**换皮前旧值**，未随「浮层侧栏自带 `p-2`（8px）gutter」更新
- **落地**：`main` `pt-4 pb-9` → **`py-2`（8/8）**；`Hero` `min-h-[calc(100vh-110px)]` → `calc(100vh-74px)`
  → 复验 **`aligned: true`**（两侧均 `66 → 892`，h 826 @1440×900）
- **v0.18b 去硬编码（同轮）**：`74` = 「顶栏 58 + gutter 8×2」**派生和**（任一项改即静默错位且不报错）→
  撑满职责**上移到壳**：`main` 加 `flex min-h-[calc(100vh-58px)] flex-col`、`Hero` 改 **`flex-1`**；
  实测几何**零变化**（1440×900 / 1920×1080 / 1366×768 → 826 / 1006 / 694），**只剩 `58` 一个常量**
- **副作用登记**：未换皮的中心页 / 详情页顶部间距 16 → 8、底部 36 → 8（原值非为浮层侧栏设计）
- **分辨率矩阵 13 档实测**：1920×1080 · 1440×900 · 1366×768 · 1280×800 · 2560×1440 · 1024×768 ·
  768×1400 · 1440×560 · 1366×500 · 390×844 · 3440×1440 —— **对齐全部成立**；标题三档 96/72/52；
  搜索框 `w-full` + `max-w-900` 窄屏收缩（1024→696 / 手机→266）；统计条 flex-wrap 手机换两行（82→163）；
  极矮视口（1366×500）优雅降级出滚动条不裁切
- **登记待定**：**大屏留白**（1440×560 1% → 1440×900 42% → 2560×1440 **65%**）——用户「先这样」暂停；
  **移动端不做**（用户明确，`100vh` 不换 `svh/dvh`）

**增补（v0.19）去 hero 中间分割线（用户拍板）**
- 对象 = 统计条上方 `border-t border-border pt-6` → **整组移除**（`pt-6` 依附该线存在）；间距由 `mt-11`（44px）承担
- 实测：`borderTopWidth 0px` / `paddingTop 0px`；**全 hero 子树扫描「仅上下边框、无左右边框」元素 = 0**；
  搜索行 → 统计条 **44px**（原 68 = 44 + 24）；统计条高 82 → **57px**
- 保留：顶栏「品牌字 ↕ 侧栏触发钮」的**竖**分隔（不同层，另条出处）

**增补（v0.20）统计条改「卡片形态 + 撑满 hero」（用户拍板）**
- 形态：5 项各一枚 tile = `min-w-[96px] flex-1 rounded-xl border border-border bg-secondary px-4 py-4`
  （淡蓝底 #f0f5ff + 泛蓝细边 #e3eaf6 + r14）；数字 26px 粗体 + 标签 13px muted；行容器
  `mt-11 flex w-full flex-wrap justify-center gap-3`
- 实测（1440×900）：**行宽 1112px = hero 内容区 100%**（flush 0/0）、**5×213px 等宽**、间距 12px、
  tile 高 90px；对照搜索行 900px ⇒ 真正「撑满」
- 实现选择：**手搓展示件**（§4.1 纪律 1），不引 `ui/shadcn/card`（白底在 hero 白卡内不可见 + 24px
  内距过重 + §4.4 ② 组件源码零改动）；`card.tsx` 留 M4b

**增补（v0.8）T13 自检与硬证据 · T15 门禁 + 冒烟（2026-09-11 执行回写）**
- **① T13 记录** = `docs/smoke/2026-09-11-m4a-visual-s0.md`（原文：门禁 / 剥离断言 / 残留扫描 /
  令牌审计 / 几何实测 / 分辨率矩阵 / 冒烟结果 / 未验项）
- **② 五门禁全绿**：`typecheck` ✅ · `lint` ✅ · `format:check` ✅（213 文件）· `build` ✅（exit 0；
  CSS 88 kB / JS 546 kB）· **`test` ✅**（`CI=true` + `DATABASE_URL` 指向**单库** `ai_asset_hub` +
  `--force` ⇒ **475 例：474 pass · 1 skip · 0 fail · 1150 expect · 47 文件**；四包
  `Tasks 4 successful`；与基线 475 例一致 ⇒ **零回归**）
- **③ 冒烟**：`m4a-chain-smoke.ts` ✅ **30/30 PASS**（`CHAIN SMOKE PASS`）· `m4a-dogfood.ts` ✅
  **22/22 PASS + NO CONSOLE ERRORS**（截图 `docs/smoke/s0-{1..6}-*.png`，1440×900）
- **④ 冒烟脚本修复（实证根因，属 harness 非产品）**：首跑 `三中心 href 可达（侧栏导航）` **FAIL** →
  连上该 tab 实测视口 **748×472 → `useIsMobile` 判移动端** → 侧栏退化为 **Sheet（不进 DOM）** ⇒
  首页 `<a>` 只剩品牌链接 ⇒ 断言**假失败**（该断言 v0.15 改判后**从未实跑过**——「未实证断言」实例）。
  处置：脚本加 `Emulation.setDeviceMetricsOverride` **1440×900 桌面**（断言与截图宽度确定化；**未放宽断言**）。
  另：`SMOKE_SHOT_PREFIX` 才是截图前缀变量（首跑误用 `SHOT_PREFIX` → 覆盖了 6 张历史截图，**已 `git restore` 还原**；
  正确用法已写进脚本头注释）
- **⑤ T15 剩余**：**撤 `ReviewControls` 留到三判通过后**（用户 2026-09-11 拍板：本次随阶段 0 提交，
  出口再删——T12/T15 原划分不变）

**增补（v0.9）阶段 0 出口达成：三判通过 + 撤控件（2026-09-11）**
- **T14 三判** = 用户结论「**现在看起来 OK**」（**气质 / 密度 / 类型色 三项均通过**）→ **阶段 0 出口达成**。
  判据来源 = 真站点 + 真数据逐页看（观感由用户给，实现侧只交可复算数字，见
  `docs/smoke/2026-09-11-m4a-visual-s0.md` §4/§5）
- **T15 剩余（撤控件）**：删 `apps/web/src/dev/ReviewControls.tsx`（`git rm`）+ `main.tsx` 两处引用
  （import + 渲染守卫）→ 断言 `grep -rn 'ReviewControls' apps/web/src` = **0**；浏览器复核：
  `★ 评审` 钮消失、hero 与 5 枚统计 tile 正常渲染、页面无异常
- **门禁复跑（撤控件后）**：`typecheck` · `lint` · `format:check`（212 文件，较前少 1 = 删除的组件）·
  `build` 全绿；生产包 marker（`阶段 0 评审` / `待拍板` / `三判口径` / `评审`）仍全 **0**
- **阶段 0 出口三条件核对**（design §8）：三判通过 ✅ + 门禁全绿 ✅ + 回退面干净（旧层与未换页
  `.module.css` 未删，壳/首页/基建可整体 revert）✅
- **T16 ✅**：阶段 1 任务细化已完成 = **v0.10**（§2 板块 E/F/G，T17-T26）

**增补（v0.11）阶段 1 · T17 详情页外壳落地（2026-09-11）**
- **落地**：`AssetDetail.tsx` 全页外壳（面包屑 / 头卡 / body 栅格 / 右栏两张卡 / 载态 / 占位）+
  `DetailTabs.tsx` 重写；删 `DetailTabs.module.css` + `AssetDetail.module.css`（零消费后删）
- **实测**（真浏览器 1440×900，`/assets/demo-rag-skill`）：头卡 `#ffffff` / `rounded-2xl` **18px** /
  `shadow-sm` **生效**（完整值末段 `rgba(0,0,0,0.1) 0px 1px 3px 0px`——⚠ 首测因**截断输出**
  误判为「无阴影」，完整值复核后**撤回该结论**：Tailwind v4 的透明占位槽 + 真实阴影，`@property --tw-shadow`
  在产物内）；Tab 卡白底；激活 Tab 文字 `#0f172a` + 下划线 **实底 `oklch(0.488 0.243 264.376)` = #1447e6 /
  2px / `background-image: none`**；右栏 **320px** / `sticky` **78px** / 白卡；下载按钮
  `linear-gradient(#2563eb→#1447e6)` 且 **`box-shadow: none`**；**全页无 `backdrop-filter`**，
  渐变仅白名单 3 处（页面底 / 顶栏品牌字 / 下载按钮）
- **功能断言**：总览 pane **554** 字（metaBar + markdown 正文）/ 文件 **151** 字（折叠树）/
  版本 **1378** 字（双下拉 + diff）⇒ 三 tab 切换与**回到总览**均正常；`role=tablist/tab/tabpanel` +
  `aria-selected` 语义保留（⚠ 取样一次得到「总览 0 字」——**复测不可再现**，判定为取样时机假象，
  T25 的 dogfood「总览 md 渲染」会再卡一次）
- **门禁**：typecheck · lint · format:check（**212** 文件）· build（exit 0）全绿

**增补（v0.12）阶段 1 · T18 详情页总览 + markdown 落地（2026-09-11）**
- **落地**：`OverviewTab.tsx` 全量 Tailwind 化（metaBar / 摘要 grid / key / val / empty / loading 六个类串）+
  `MarkdownRenderer.tsx` 的 `md-body` 选择器组改由 **Tailwind 子元素变体**（`[&_h1]:…`）承接——
  **零新增 CSS 文件**（`aih-theme.css` 不加组件样式）；删 `MarkdownRenderer.module.css` + `OverviewTab.module.css`
- **实测**（真浏览器 1440×900 · `/assets/demo-rag-skill` + `/assets/demo-http-mcp`，计算值）：
  wrapper 类串在位 · h1 **18px/700/-0.4px/margin 4-10** · h2·h3 **14px/700** · h4 **13px**/h5·h6 **12px**（补 Preflight）·
  p·li **13px / lh 23.4 / #64748b** · ul `disc` pl18 / ol `decimal` pl18 / li margin 3px ·
  内联 code **#f1f5fb + 1px #e3eaf6 + r5 + 12px mono + padding 1/6** ·
  `pre` **#f1f5fb + 1px #e3eaf6 + r10 + 12px/19.2 mono + overflow auto + padding 12/14**，
  **pre 内 code = bg 透明/零边框**（`:not(pre)>code` 互斥成立 ✓）·
  blockquote **左边 3px #e3eaf6 + bg `muted/50` + r0/10/10/0 + padding 6/12** ·
  表格 `display:block` + overflow auto + th **bg `muted/50` + 1px 边 + 600 + padding 6/12** · td 1px 边 ·
  hr 1px #e3eaf6 · a **oklch(0.488 0.243 264.376) = #1447e6**（primary）·
  metaBar **11px SF Mono + 下边 1px #e3eaf6 + pb/mb 12px**
  （内联 code / blockquote / hr / link / h3-h5 / ol 在本示例文档缺失 → **注入同源节点量计算值**，规则同批生效）
- **回归**：三 tab `总览/文件/版本` 切换正常 + 切回总览 md wrapper 类串仍在（总览 innerText 559 字 vs T17 基线 554——
  **innerText 随换行变化**，文本内容未变，非回归）；mcp 资产总览（README 渲染）135 字 / 文件 145 字 ✓
- **design 缺口登记（§4.4 ⑦ 待补）**：旧 `--md-code-bg`/`--md-code-border`/`--md-pre-bg`(#0f172a 深底)/
  `--md-pre-fg`(#dbeafe)/`--md-quote-border`(青 `--brand-3`)/`--md-quote-bg` **均无 §4.4 映射** →
  执行期择**浅色语义面**落定（`bg-muted` + `border-border` + `bg-muted/50`），随新体系「纯白 + 细边」气质；
  **属可见变化，视觉结果待用户确认**（改回深底需 design 补映射）
- **未能在真站点触发**：manifest **摘要回退分支**（需「无主文档」资产；demo 库 = 3 skill（有 SKILL.md）+
  1 mcp（有 README.md），**无** mcp/agent 无主文档样本）→ 该分支类名与同源面板一致，**属代码审查项**
- **门禁**：typecheck · lint（仅余既有 **1 info** = `VersionCompare.tsx:138`，T20 清）· format:check（212 文件）·
  build（exit 0；CSS **93.85 kB** / JS **562.79 kB**）全绿
- **自检打分（T18 收尾 · 新增常态，§1 执行纪律）**：代码 **9.77**（A 9.875×0.40 + B 9.75×0.30 +
  C 9.65×0.30）· 文档 **9.69**（标准 4 维 + 深度 4 维）→ **≥9，可提交**。
  **自检抓到 1 条真缺陷（同轮已修）**：T18 断言 `grep '--md-'` 会**命中本轮自述注释**＝假失败 →
  收紧为 `var(--md-` 消费级（见本节 Assert）；其余问题：**C5 可测试 8/10**（`apps/web` 零测试基建，
  §3 登记项 #2）· **manifest 摘要回退分支无样本**（仅代码审查，未真站点触发）

**T17 + T18 合并自检（用户 2026-09-11 追加要求：两 Task 一起打分；本轮**换靶**复核）**
- **换靶证据（新角度，非重报）**：① **被删 CSS 全文逐项核对**——4 个 `.module.css`（T17 删 2 + T18 删 2）
  逐条属性对照新类串：**零 `@media` / 零 `prefers-reduced-motion`**（关键：**无响应式能力漏迁**）；
  `.kv .mono` 为**死规则**（旧 TSX 从未引用）→ 随文件删除正确 ② **i18n 调用逐字对比**（`git show <T17 前>` vs 现文件）：
  4 个触碰文件 **零差异** ⇒「正文/文案零改写」实证 ③ **请求轨迹**（`performance.getEntriesByType('resource')`）：
  加载 → 文件 tab → 回总览，`/api/*` 请求**零新增、零重复** ⇒ 懒加载 + 响应缓存行为不变实证 ④ **`.glass`
  依赖登记**：仍有 2 消费者（`FilterStrip.tsx:49` · `CenterPage.tsx:101`）⇒ `global.css` 的 `.glass` 块
  **非孤儿**，随 **T22/T24** 处理 ⑤ **冒烟覆盖**：dogfood 已有「总览 md 渲染」(`:196`) / 「mcp 总览 README」(`:252`)
  ⇒ 详情页换皮有回归网（非零覆盖）⑥ 生产包 marker 四项 = 0
- **自检发现并同轮修（4 项 parity 缺口，均属 T17 文件 `AssetDetail.tsx`）**：
  1. **字阶桶偏离 §4.4 ⑤**：面包屑与元信息 3 行（旧 `--fs-12-5` = 12.5px）我写成 `text-[13px]` →
     按 ⑤ 表 **12/12.5 → `text-xs`** 改正（实测 12px ✓）
  2. **漏迁 `underline-offset`**：旧 `.crumb a:hover { text-underline-offset: 2px }` → 补 `hover:underline-offset-2`
     （产物含该规则 ✓）
  3. **错误条圆角偏离圆角轴**：旧 `.dlErr` radius **8** → 我写 `rounded-lg`(10) → 改 `rounded-md`(8)
  4. **（同上轴）**：`.item/.crumb` 两处字阶桶一并归位
- **登记未改（有设计依据的微调，非缺陷）**：`.list` gap 2 → `gap-1`(4px) · tab 按钮旧 `10px 10px 0 0`
  改方角（同 shadcn `Tabs` 真值）· 激活/悬停字色 `--brand` → `foreground`（同 shadcn 真值）· 标签底色
  slate 淡灰 → `bg-secondary`（AIH pill）· 下载钮圆角 12 → `lg`(10)
- **登记待办（既有债，非本轮引入）**：`mainDocPath` / `manifestFields` 两处 `export` **零外部消费者**
  （`apps/web` 无测试）· `role=tab` 缺方向键导航 / `aria-controls`（T17 保持语义不变，未扩范围）
- **合并评分**：**代码 9.79**（A 9.875×0.40 + B 9.75×0.30 + C 9.70×0.30）· **文档 9.69** → ≥9。
  ⚠ 与 T18 单轮（9.77/9.69）相比 **+0.02**，**来源 = 补齐验证缺口（C5 8→8.5：确认 dogfood 有覆盖）
  与修 parity 缺口**，非产物变好（`self-review-scoring` 计分披露铁律）

**增补（v0.14）阶段 1 · T19 文件树 + 预览对话框落地（2026-09-11）**
- **落地**：三个组件全量 Tailwind 化（含 `FileTree` 的缩进档改 **`INDENT` 表**：0→`` / 1→`pl-5` /
  2→`pl-10` / 3+→`pl-[60px]`，与旧 `.indent`(20)+`.d2`(40)+`.d3`(60) 叠加等价）；删 3 个 `.module.css`
  （`.module.css` 存量 12 → **9**）
- **实测**（真浏览器 1440×900 `/assets/demo-rag-skill` 文件 tab + 对话框，计算值）：
  目录行 `13px/600/`#64748b`` · `padding-top 5px` · `column-gap 9px` · SF Mono · `aria-expanded` ✓ ·
  文件行缩进 **20px**（depth1）/ `0px`（root）· 体积列 `11px` · **sha 徽章 `#f1f5fb` + `r6` + `padding 1px 7px` + `11px`** ✓
  （`…` 截断形态实存 ✓）· hint `mt 10px` + `border-top 1px` + `11px` ✓ ·
  **对话框**：overlay `fixed/inset-0/z-90/flex` ✓ · 遮罩 **`bg-black/50`（`oklab(0 0 0 / 0.5)`）且
  `backdrop-filter: none`** ✓ · 卡 `#ffffff` + `r10` + `w 658px`(= `min(720px,88vw)` @ 748 视口) +
  `max-H 358.72px`(76vh) + `shadow-lg`（末段 `rgba(0,0,0,0.1) 0 10px 15px -3px` ✓ 无蓝投影）·
  头 `padding 13/18` + 下边 1px · 路径 `13px` mono truncate ✓ · 关闭钮 `26px` + `bg-muted` + `r8` ✓ ·
  正文 `padding 16/18` + `12px` mono + `overflow auto` ✓ · **全页 `backdrop-filter` 命中 0** ✓
  （渐变仅 3 处白名单 ✓）· **Esc 关闭 ✓ / 遮罩点击关闭 ✓ / 重开 ✓**（合成事件驱动，监听器语义实证）
- **修正 1 项既有缺陷**：旧 `FileTree` 的 `pad` 走 `` `${styles.indent}${styles[\`d${depth}\`]}` ``
  → depth=1 时取到 `undefined`，类名里多出字面 `undefined`（无害但污染 DOM）⇒ 改 `INDENT` 查表消除
- **新登记（既有债，非本轮引入）**：① ~~目录行「N files」硬编码英文~~ → ✅ **已修（用户 2026-09-11 同意）**：
  改走 `t('market','fileUnit')`（zh「文件」/en「files」——该键早已存在且被 `VersionCompare` 消费；
  中文界面曾显示「1 files」），随 T19 同批提交 ② **预览对话框无焦点陷阱**（断言漂移，见上）
  ③ **嵌套路径文件预览无冒烟覆盖**：dogfood `:220` 只点 root 级 `SKILL.md`；且客户端 URL 用
  `encodeURIComponent(path)` **整条编码** → 嵌套文件实际请求 `files/lib%2Fembedding.ts`
  （服务端 curl 两种形态均 200 ✅，但属脆弱形态；建议 T25 补一条嵌套文件断言 —— **登记**）
- **沙箱限制（如实登记）**：本轮 headless 会话**页面加载后的 fetch 全部挂起**（连 `/api/stats`
  直连也不返回；服务端/代理 curl 均 200 ✅）⇒ **对话框正文内容无法在本轮实测**；
  佐证：T13 期 dogfood 的「预览对话框内容」断言（`m4a-dogfood.ts:224`，点 `SKILL.md` 断言正文含
  `LangGraph RAG 检索技能`）**已在正常会话通过**（22/22）⇒ 预览渲染无缺陷，**观感与内容仍请用户亲验**
- **自检打分（换靶轮 · 新问题 4 项）**：**代码 9.79 / 文档 9.69**；本轮换靶角度 = 三个被删 CSS
  **逐属性核对**（含 `.file:hover .nm` 下划线偏移、`.close:hover` 语义色、`--sha-bg` 无映射改 `bg-muted`）·
  断言漂移复核（焦点陷阱/`formatSha` 截断）· i18n 硬编码扫描 · 冒烟覆盖探针（嵌套路径缺口）·
  死导出扫描（三组件均被消费 ✅）。**未发现分数虚高**：与上轮同档，披露为本轮无产物级改进、仅有新增量
- **门禁**：typecheck · lint（web 仍仅 1 info）· format:check（212 文件）· build 全绿

**增补（v0.15）阶段 1 · T20 版本对比 + diff 落地（2026-09-11）**
- **落地**：`VersionCompare` / `DiffNav` / `DiffView` 全量 Tailwind 化；删 3 个 `.module.css`
  （存量 12→9→**6**）；**清掉阶段 0 最后一条 lint info**（`VersionCompare.tsx:138 noUselessFragments`）
  —— `bun run lint` 实测 **web = 0 诊断** ✅
- **实现取舍**：① 非轴值半径按「**就近向下**」归位（12→`rounded-lg`(10) · 11→`rounded-lg`(10)），
  规则写入组件注释 ② `DiffView` 的动态类索引 `styles[line.type.toLowerCase()]` → **`LINE_STYLE` 查表**
  （同 T19 的 `INDENT` 化：消除动态键 + 把 GitHub 内容色集中一处可审）③ 原生 `<select>` **保留**
  （不换 Radix `select.tsx`——换原语 = DOM/行为变更，超「纯视觉」范围），焦点态改用 §4.4 ③
  input/select 真值 `focus:border-ring focus:ring-[3px] focus:ring-ring/50` ④ 青色 `--brand-3`
  （⇄ 箭头）随渐变层废弃 → `muted-foreground`；hover/选中走**底色语义**（`hover:bg-muted/60` /
  `bg-accent text-accent-foreground`）
- **diff 内容色 = 有意保留的字面值**（`#1a7f37`/`#e6ffec` · `#cf222e`/`#ffebe9`）——依 §4.4 ②
  「diff 内容色不并入 UI 语义色」；**design §4.4 ⑦ 缺 `--diff-*` / `--ct-*` / `--sha-bg` 映射** → 登记
  （T24 删旧层前须在 design 侧确认「内容色不迁移」或补映射）
- **实测**：① `bun run lint` **web = 0 诊断**（阶段 0 遗留 info 清零 ✓）② **dogfood 22/22 PASS +
  NO CONSOLE ERRORS**（`SMOKE_SHOT_PREFIX=t20-`，跑在独立 Edge CDP 会话）——含 T20 的
  「版本历史两行」/「diff 三型徽章」（ADDED/MODIFIED/DELETED · 经 `DiffNav`+`DiffView`）/
  「diff +/− 行内容」（`searchByPrefix` 出现在行内）⇒ **diff 真渲染实证**；**并顺带 closure T19 的沙箱缺口**
  （「预览对话框内容」PASS ⇒ 预览渲染无缺陷）③ 门禁 typecheck · format:check(212) · build 全绿
  ④ 临时截图 `t20-*.png` 已删（**不进仓**——里程碑证据只留 s0-/s1-）
- **换靶新发现（1 项阻塞级 + 1 项同页不一致）**：
  - 🚧 **4 个共享 ui 原子件（`Badge`/`Spinner`/`EmptyState`/`ErrorState`）无归属 Task**，而 T24 要删
    「剩余全部 `.module.css`」⇒ 照字面执行 **build 必挂**（§3 表 10，**阻塞 T24**，待拍板）
  - 🟡 `DiffNav`/`DiffView`/`VersionCompare` 内的 changeType 徽章**仍是旧层 `Badge` 样式**（`--ct-*`）
    ⇒ **新旧视觉同页并存**（与 T17 右栏「半玻璃半白卡」同类问题）
- **自检打分（换靶轮）**：**代码 9.76 / 文档 9.69**——B3 一致性 **9**（-1：Badge 未换皮 → 同页两套视觉）·
  C5 可测试 **9**（dogfood 覆盖 diff 三型/行内容，但无单测；折叠 toggle 与焦点环未自动化）·
  C4 9.5（`labelCls`/`selectCls` 可上提模块级）

**增补（v0.16）T20 并入 · 4 个共享 ui 原子件换皮（用户 2026-09-11 拍板 (a)；解除 T24 阻塞）**
- **范围**：`Badge` / `Spinner` / `EmptyState` / `ErrorState`（跨页共享件；§3 表 10 的阻塞项）
  + 删 4 个 `.module.css` ⇒ 存量 **6 → 2**（只剩 CenterPage / FilterStrip = **T21/T22 范围**）
- **落地取舍**：
  - **`Badge` 5 个 tone 由旧字面色 → AIH 语义 token**：`success` `#047857`→`--success`(oklch 0.627 0.17 149.2) ·
    `info` `--brand`→`--primary` · `warning` `--ct-mod`→`--warning` · `danger` `#be123c`→`--destructive` ·
    `neutral` slate 淡底→`bg-muted`；10.5px→`text-[11px]`（⑤ 首档）· 999→`rounded-full`。
    **副作用（有据）**：`--ct-*` 消费归零（T24 随旧层删除）；tone 色相深浅随之微调（语义化本意）
  - **`Spinner`**：`--line-soft`/`--brand` → `border-border`/`border-t-primary`；动画改 **Tailwind
    `animate-spin`**（0.8s → 1s，登记）并**补 `motion-reduce:animate-none`**（§4.4 ⑥「reduced-motion 全关」，
    旧层只覆盖 transition、未覆盖 animation —— 此处**补齐**）
  - `EmptyState` / `ErrorState`：字阶（13/12.5→`text-[13px]`/`text-xs`）与语义色归一；retry 圆角 9→`rounded-md`(8)
- **实测**（真浏览器 + dogfood + 门禁）：Badge = `--success` oklch(0.627 0.17 149.2) + `bg success/10` +
  边 `success/30` + **11px** + `rounded-full` + `mono ✓` · Spinner = 顶边 `primary` oklch(0.488 0.243 264.376) ✓ ·
  下拉 `12px/r8/padding 7-9/#fff/边 #e3eaf6` ✓ · 版本历史行 `13px/700` ✓ · EmptyState `13px/#64748b/padding 40-16/lh 1.7` ✓ ·
  ErrorState `role=alert` + `13px muted` + retry `12px/primary/r8/bg primary/10/mb 12` ✓ ·
  **dogfood PASS=22 FAIL=0 + NO CONSOLE ERRORS** ✓ · 门禁 4/4 绿（lint **web 0 诊断**）
- **自检（同轮重评）**：**代码 9.84**（B3 一致性 9→**10**：同页两套视觉消除；A/B/C = 9.875/9.875/9.75）·
  **文档 9.69**。⚠ +0.08 来源 = **真实产物改进**（Badge 归一 + 动画可访问性补齐），非计分口径变化

**T21 CenterPage 换皮（板块 F · 2026-09-11）**
- 落地：`CenterPage.tsx` 全量 Tailwind 化 + 删 `CenterPage.module.css`（存量 **2 → 1**，仅剩 `FilterStrip` = T22）
- **Files 修正（执行期发现）**：原文「Delete 两个 `.module.css`」系与 T22 混写 → 实际删 **1** 个；
  `pages/Center.tsx`（9 行纯转发、零视觉元素）**零改动**
- 落地取舍（逐项对 §4.4 SSOT）：
  - 页头 `.glass`（毛玻璃 + 白描边 + `--shadow-card` 蓝投影）→ **`bg-card` + `shadow-sm` + `rounded-2xl`**
    （旧 `--r-xl` = 18px，与 hero 卡 / 详情页头卡同语法同值）
  - **氛围光斑 `::before`（300px radial-gradient alpha .13）整块删除**，`overflow:hidden` / `position:relative`
    随之一并去除（§4.4「光斑废弃」项）
  - icon tile：52px 渐变 → **44px 实底类型色 + 圆角 13px + 白图标 22px**（§4.4 ③ 类型 tile 真值）；
    `styles[type]` 动态类名 → **`TILE_BG` 查表**（Tailwind 静态扫描不到拼接类名，同 T19/T20 纪律）；蓝投影随渐变去除
  - 页头搜索框 → shadcn **`Input`**（§4.1 纪律 1「交互件装原生」，与 hero 同件；宽 240 / 占位符 /
    `aria-label` / 受控行为不变）
  - 计数徽章 → **hero 统计 tile 语法**（`bg-secondary` + `border-border` + `rounded-xl`）；数字
    `text-[22px]` `text-primary` `tabular-nums`，标签 `text-[11px]` muted——旧 `--brand` → `--primary`、
    rgba 衬底/描边 → AIH 语义面（同一映射表 §4.4 ⑦）
  - 字阶（⑤）：21 → `text-xl`(20，「21 降 1px 归位」) · 12.5 → `text-xs` · 13 / 11 保档；加载态
    `padding 56px 0` → `py-14`（同值）
- **实测（真浏览器 · 1440×900 桌面视口）**：head `rgb(255,255,255)` / r18 / `padding 22px 26px` /
  `margin-bottom 16px` / `shadow-sm` / `backdrop-filter: none` / **`::before content: none`** ✓ ·
  tile `44×44` / r13 / skill `rgb(37,99,235)` · mcp `rgb(14,116,144)` · agent `rgb(109,40,217)` ✓
  （白图标 stroke 22px）· h1 **20px/700/-0.4px** ✓ · 描述 13px/#64748b/mt4 ✓ · Input `h-9`(36)/r8/
  边 #e3eaf6 /**实测宽 240px**（桌面）/ `text-sm` 14px ✓ · 徽章 `#f0f5ff`/r14/边 #e3eaf6/pad 10-20/
  数字 22px `oklch(0.488 0.243 264.376)`/`tabular-nums`/标签 11px ✓ · 结果头 gap12/mb12/13px/排序 12px ✓ ·
  网格 **4 列 × 287.5px** / gap14 ✓ · 三中心同构 ✓ · `/agents` 0 资产 → 空态 `EmptyState` ✓ ·
  全页 `backdrop-filter` 命中 **1**（= `FilterStrip`，T22 范围）✓
- **回归**：dogfood **22/22 PASS + NO CONSOLE ERRORS**（`SMOKE_SHOT_PREFIX=t21-`；含「中心搜索占位 /
  中心真实数据卡 / 中心计数 / 中心排序栏」）✓ · 门禁 typecheck 4/4 · lint **web 0 诊断** ·
  format:check 212 · build ✓ · 临时截图 `t21-*.png` 已删（不进仓）
- **换靶新发现（本靶 = 旧 token 消费者全仓普查）**：
  - ✅ `--grad-skill` / `--grad-mcp` / `--grad-agent` 消费者**归零**（T21 移除其最后消费者）→ 三 token
    成孤儿，T24 随 `tokens.css` 删除（新证据，旧层清理面收窄）
  - ✅ 全仓 `apps/web/src` 旧 token 消费者**只剩 `FilterStrip.module.css`**（T22 范围）→ **T22 之后
    T24「删旧层」无残留**（正向证据）
  - 🟡 **新发现缺陷（内容级，非视觉）**：页头 eyebrow 与 h1 **同 i18n 键**（`meta.title`）⇒ 中文界面
    渲染「技能中心 / 技能中心」两行重复；而 design **§9 线框要求「技能中心 Skill Center」**（EN 名 eyebrow）
    ⇒ 代码与 design 漂移（缺 3 个 EN 名键）。按「发现 bug 先说明→等许可」**未改**，登记 §3 待拍板 11
  - 📌 **取样条件教训（同轮自纠）**：首轮探针在**窄视口**（<900）测得 Input 187px + 网格 2 列，一度疑
    「`w-[240px]` 未热更」→ **桌面视口钉死后复测 = 240px / 4 列**（窄视口收缩与旧 `.search` 同行为
    = parity，非回归）⇒ **视口未钉死不做定性判断**
- **自检打分（换靶轮）**：**代码 9.80 / 文档 9.69**——B3 一致性 9.5（页头 / hero / 详情头像语法已一致；
  扣 0.5 = eyebrow 与 design §9 漂移）· C3 9.5（Input 焦点环 `ring-ring/50`；muted `#64748b` on white
  ≈4.7:1 达 AA）· C5 9（`apps/web` 零单测；dogfood 覆盖中心页三态）
  ⚠ **代码分较 T20 增补（9.84）↓ 0.04 = 换靶抓出新证据（eyebrow 漂移 + 窄视口取样口径），非产物变差**——如实披露

**增补（v0.18）· 中心页页头 eyebrow 修重复（用户拍板 (d)）**
- **问题**：eyebrow 与 h1 **同 i18n 键**（`t('market', meta.title)`）⇒ zh 渲染「技能中心 / 技能中心」；
  **自 `bdc0d5e`（中心页初版）既存**，非换皮引入（`git log -S "styles.en"` 实证）
- **处置**：改**语言中立的类型常量表** `TYPE_EYEBROW`（`SKILL` / `MCP` / `AGENT`）——类型名不是可翻译
  副本，两种语言下都与 h1 不重复，**零 i18n 新增**，对齐 design §9 线框「双语头」意图；字面即大写
  （不靠 CSS `uppercase`）⇒ `textContent` 取值确定
- **实测**：`/skills` = `技能中心 / SKILL` · `/mcps` = `MCP 中心 / MCP` · `/agents` = `专家中心 / AGENT`，
  `dup: false` ✓ · 11px / `letter-spacing 1px` / `rgb(100,116,139)` ✓ · 无 i18n 裸键泄漏 ✓ ·
  门禁 typecheck / lint（web 0 诊断）/ format:check(212) / build 全绿 ✓
  （**dogfood 未重跑**：纯静态文案改，已由真浏览器逐中心实测覆盖断言面）

**T22 FilterStrip 换皮（板块 F · 2026-09-11）——板块 F（中心页）收官**
- 落地：`FilterStrip.tsx` 全量 Tailwind 化 + 删 `FilterStrip.module.css` ⇒ `.module.css` 存量 **1 → 0**
- 落地取舍（逐项对 §4.4 SSOT）：
  - `.glass` → **白卡 `bg-card` + `shadow-sm`**；圆角 `--r-lg` **16 不成轴 → 就近向下 `rounded-xl`(14)**；
    内距 `12px 16px` → `px-4 py-3`；下边距 14 → `mb-3.5`（= `AssetGrid` `gap` 14px）
  - chip 三段常量（模板串，本文件既有风格、不引 `cn`）：未选中 `bg-secondary` + `border-border` +
    `text-muted-foreground` + hover `border-ring/40` / `text-primary`；选中 `border-primary bg-primary
    font-semibold text-primary-foreground`——**旧 `--grad-brand` 渐变 + 蓝投影均为 §4.4 废弃项**
    （渐变白名单只回品牌字 / 主 CTA / 页面底）
  - 字阶（⑤）：12.5 → `text-xs`（12/12.5 同桶）；`11 / 700 / tracking .7px` 保档
  - **子行 pill 与根行统一**（旧 `.sub` 仅差衬底 alpha `.5` vs `.65`——白卡上不可辨、§4.4 无依据）⇒
    `styles.sub` 与 `cls` 的 `sub` 入参一并取消（**内部 API 微调**，登记）
  - 过渡 `color/border-color .12s` → `transition-colors`（0.15s，同 T20 登记口径）
- **实测（真浏览器 · 1440×900）**：strip `rgb(255,255,255)` / r14 / `padding 12px 16px` / `margin-bottom
  14px` / `shadow-sm` / `backdrop-filter: none` / gap 12 ✓ · 标题 11px/700/`uppercase`/`ls .7px`/#64748b/
  `pt 7px` ✓ · 未选中 chip `rgb(240,245,255)`/边 #e3eaf6/#64748b/fw500/999px/`4px 13px` ✓ ·
  **选中 chip（关过渡后）** `oklch(0.488 0.243 264.376)` + `oklch(0.97 0.014 254.604)` + 边 primary +
  fw600 + **`box-shadow: none`** ✓ · 行 gap 7px / cols gap 7px / grid gap 14px ✓
- **交互实证**：点「智能体」→ URL `?label=agentic` · 列表 3 → **1** · 结果头「筛选结果：1」（`filteredCount`
  分支）✓；点「全部」→ URL 复位 `` · 3 卡 ✓；根行「全部」默认选中（`selected.length === 0`）✓
- **回归**：dogfood **22/22 PASS + NO CONSOLE ERRORS**（`SMOKE_SHOT_PREFIX=t22-`，截图已清）· 门禁
  typecheck / lint（web 0 诊断）/ format:check(212) / build 全绿 ✓
- **换靶新发现（本靶 = 死导出 + 覆盖缺口 + T24 前置条件核对）**：
  - ✅ **T24 前置条件现可全量核对**：`find apps/web/src -name '*.module.css'` = **0** ·
    旧层 token 消费（除 `tokens.css`/`global.css` 自身定义）= **0** · 剩 11 条 `var(--tint-*)`/`var(--ava-*)`
    命中**全是 AIH 层 `@theme` 映射**（值住 `aih-theme.css`，与旧层无关）· `.glass` 消费点 **0**
    （定义仍在 `global.css:69`，随 T24 删）· 旧层文件引用 **2 处**（`main.tsx:13-14` 两个 import，T24 去）
    · 删除面 = `tokens.css` 126 行 + `global.css` 106 行
  - 🟡 **死导出（既有债）**：`buildLabelRows` / `labelName` 在 `FilterStrip.tsx` 之外**零消费者**
    （同 T17 的 `mainDocPath`/`manifestFields` 一类）→ 登记 §3 表 12
  - 🟡 **覆盖缺口（新）**：dev 库标签只有 **1 个 root**（`agentic`，`parentId: null`），**0 个子标签**
    （`db:seed` 不建标签）⇒ **两级组树第二行**与**多标签 OR** 两条路径**无现场可验数据** →
    登记 §3 表 13（T25 全态冒烟须先造子标签数据）
  - 📌 **断言纪律自纠（真踩一次）**：点标签后 3.5s 取样得 `on: []`（误疑「选中态没生效」）→ 实为
    **过渡中间值**（读到 `oklab(...)` 插值，而探针按 `oklch` 字面匹配）。**取证后**：同点位的
    `className` 已含 `border-primary bg-primary font-semibold text-primary-foreground`（类正确）
    ⇒ 关过渡复测得终值 ✓。**通则：对带 `transition` 的属性做数值/字面断言，先注入
    `*{transition:none!important}`，否则在 0.12–0.15s 窗口内必读中间值**
- **自检打分（换靶轮）**：**代码 9.80 / 文档 9.69**（A3 9.5 子行路径未验 · B4 9.5 死导出未清 ·
  C3 9.5 chip 无 `aria-pressed`——既有债 · C5 9）。⚠ 分数与 T21 同（9.80），但**靶与发现均不同**
  （T21 = eyebrow 漂移 / 窄视口口径；T22 = 死导出 / 子行覆盖缺口 / 过渡取样自纠）——按「禁同分重报」
  口径披露：分同而证据不同，非重复报分

**T23 M4-pre 语义回写（板块 G · 2026-09-11，纯文档 Task）**
- 落地：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` 正文 **18 行**按扁平模型终态重写 +
  §11 登记项改 ✅ + 版本头 v0.22 + §12 追加重写行（**§12 旧行一字未动 = 史实不改**）
- **执行方式（防长行拆断）**：`/tmp/aih-t23.mjs`（bun）——21 组「精确子串 → 新文」替换，**每组先断言
  命中次数 = 1**（否则整体中止不写盘）→ 全通过才写盘；替换锚点全部取自 `read_file` 完整行（未用截断输出）
- **18 行清单（重新实测；v0.9 的「17 处」行号已漂移）**：§1 Scope + 前置（2）· §2 右栏元信息卡列（1）·
  §3 路由表 / 面包屑 / 头部（3）· §5.1 列表参数（1）· §5.2 R4 决议 2 行 + 匿名/安全行（3）· §6 R4（1）·
  §8 详情页头部 + 段尾补注（2）· §8 语义修正记录（1）· §9 线框图 5 行（卡片 `@ns` / 面包屑 / 头部
  `[PUBLIC] [@ns]` / 元信息卡 2 行）
- **重写口径**：`@ns` 坐标 → 全局唯一裸 `slug` · `/assets/:nsSlug/:slug` → `/assets/:slug` ·
  `PUBLIC` 可见性维度 → 删除（资产恒公开；读面仅看 `status`；非 ACTIVE 治理访问仅 SUPER_ADMIN = M4-pre D6）·
  元信息卡「命名空间 / 可见性」→ **实测渲染**「作者 / 更新时间 / 累计下载」
- **证据链（事实源 + 三处实证）**：`2026-09-10-flat-model-refactor-design`（R3 可见性删除 / R5 坐标裸 slug）·
  `http/assets.ts` `listQuerySchema` 无 `nsSlug` · `assets/service.ts:170-177`
  `conditions = [eq(asset.status, 'ACTIVE')]` 且**与 viewer 无关** · `pages/AssetDetail.tsx` 面包屑/头部/
  元信息卡 + `i18n/zh.ts:52-54`
- **验证**：`grep` 正文（<§11）残留 = 仅 2 处**合法**命中（skillhub `namespace-badge` 组件名 · CSS
  「撞命名空间」措辞）+ 新写入的**负向陈述**（「M4-pre 后无可见性维度」等）；无 `|+` 粘连/断行特征；
  行数 661 → **673**；diff 40 / 28
- **换靶新发现（本靶 = 全仓 docs/代码层同模式扫描）**：
  - 🟡 **代码注释腐化 14 处**（design 之外，同 M4-pre F17 一类）：`http/assets.ts` **12 行**路由注释仍写
    `{ns}/{slug}`（L285/301/317/342/357/418/469/553/613/667/705/765）+ **L255** R4 语义注释仍写
    「viewer 匿名短路 PUBLIC-only」+ `http/stats.ts:10`「PUBLIC+ACTIVE 聚合」；另有 `http/assets.test.ts` /
    `http/labels.ts` 含同模式字符串（条数待 T24 逐条枚举）→ 登记 §3 表 14（**随 T24 同批清**，不零散提交）
  - 🟡 **`2026-09-08-m2-asset-domain-design.md` 失效内容无标注**：正文仍以 `Status: 定稿` 呈现
    `@namespace/slug` 坐标 · `visibility` 维度 · `nsSlug` 参数 · 空间角色/权限码——**M4-pre 后全部失效却无
    「作废」标记**（对比惯例：M4b design 用「随之全部作废」+ 修订记录 ⏸ 搁置行）→ 登记 §3 表 15
    （**T26 converge 处置**：加失效标注行，**正文不改**——历史 design 保留原貌）
  - ✅ 旁证：`docs/02-skill-protocol.md` 已于 M4-pre 时同步（v1.2 去 `@namespace/slug`）· M4-pre 期
    smoke 记录（`2026-09-10-m4-pre-s2/s3.md`）、`2026-09-09-m4a-t18.md` 属**历史证据档**（保留原貌）
- **自检打分（纯文档 Task → 文档 8 维 = 标准 4 + 深度 4）**：**文档 9.72**（较上轮 9.69 +0.03，来源 =
  本文档正文与事实源终态**逐行一致** + 数量声明**重新实测**（17 → 18，按量化铁律自纠）；扣分项：换靶发现的
  两处**文档域外**残留（代码注释 14 处 · M2 design 未标注）**登记而未在本 Task 修**（范围纪律所致，
  非疏漏）→ 代码 18 维 **N/A**（本 Task 零代码改动；`git diff --stat` 仅 1 个 md 文件）

**T24 删旧层（板块 G · 2026-09-11）——双栈共存期结束**
- 落地：`git rm apps/web/src/styles/tokens.css`（126 行）+ `global.css`（106 行）· `main.tsx` 摘两处
  旧 import（注释改「样式单入口」）· **迁移面入 `aih-theme.css`**（新「D. 旧层迁移面」段）= 6px 细蓝滚动条
  5 条规则 + `html{scrollbar-width:thin;scrollbar-color:…}` + `body{-webkit-font-smoothing; min-height:100vh}`
  + reduced-motion 全关块；**滚动条四值迁 `@theme`**（design §4.4 ⑥ 口径）
- **迁移纪律（写进代码注释）**：迁移块 **保持无层**（不套 `@layer`）——与迁移前**同优先级**（原 `global.css`
  亦无层）⇒ 零级联变化；套 `@layer base` 反而降级为可被 utilities 覆盖（无此需求）
- **逐字对账（迁移保真）**：滚动条 5 规则 / body 两项 / reduced-motion 块与 `git show HEAD:...global.css`
  逐条 diff = **一致** ✅（reduced-motion 块 diff 空）；已删项均为 Tailwind 已承接者（`*` reset → Preflight ·
  body 三属性 → base · `@keyframes rise` → 已住 AIH `@theme` · `fadein` 零消费者 · `.glass`/`.bg-glow` 零消费者）
- **浏览器实测（真站点 1440×900）**：`--scroll-thumb/track/hover/color` 四值在 `:root` 生效
  （`rgba(37,99,235,.3)/.06/.5/.35`）✅ · `html` `scrollbar-width: thin` + `scrollbar-color: rgba(37,99,235,.35)
  rgba(37,99,235,.06)` ✅ · `body` `-webkit-font-smoothing: antialiased` + `min-height: 900px`(=100vh) ✅ ·
  页面底渐变仍在（`linear-gradient(rgb(248,250,255) 0%, …)`）✅ · **reduced-motion 全关生效**
  （`Emulation.setEmulatedMedia` → hero 入场元素 `animation-duration: 1e-05s`(=0.01ms) / `iteration-count: 1`；
  复位 `no-preference` → `0.5s`）✅
- **滚动条深究（对照实验，避免「迁移引入」误判）**：现状 = 注入溢出容器 **15px** / 文档级 **11px**；
  **再注入一遍「旧层同款规则」→ 同值 15/11**（⇒ 非迁移引入）；**去掉 `html` 标准属性、只留 webkit 伪元素
  → 6px/6px**（⇒ 6px 规则本身生效）。结论：Chrome 的**标准属性（`scrollbar-width`/`scrollbar-color`，且
  可继承）优先于 `::-webkit-scrollbar` 伪元素** ⇒ 本仓「6px 细滚动条」实际观感一直是「thin + 蓝色」
  （迁移前后逐位一致）——**登记**：若将来要真 6px，需去掉 `html` 的两条标准属性（属观感选择，本次不动）
- **产物体量（stash 对照实测）**：CSS **89,921 → 86,679 bytes**（**−3,242 B / −3.16 kB / −3.6%**）·
  生产包 marker（`ReviewControls`/`data-review`/`dev-only`）仍 **0** ✅
- **顺批清注释腐化**：登记项 14 执行 = `http/assets.ts` **12 行**路由注释 `{ns}/{slug}` → `{slug}`
  （先守卫「命中全在注释行」）+ L255 R4 语义重写（`viewer 匿名短路 PUBLIC-only` → 列表恒 `status = ACTIVE`
  面、与 viewer 无关）+ `http/stats.ts:10`（→「恒公开面 + `status = ACTIVE` 聚合」）+ `http/labels.ts:4`
  （→ `assets/:slug/labels/:labelSlug`）+ `assets.test.ts` 2 处 describe 标题（`{ns}/{slug}` → `{slug}`；
  「可见性——skillhub 对齐分层」→「全公开——M4-pre S3 可见性已删」）⇒ **合计 17 处**（登记表原记 14 处 =
  未含 labels.ts 1 + test 2，**已在执行中枚举补齐**）
- **验证**：门禁 typecheck 4/4 · lint（web **0 诊断**）· format:check（**212 文件**——与删前同值：biome
  只覆盖 `**/*.ts|tsx|json`，**删 CSS 文件不改变该计数**，实测复核）· build ✅ · dogfood
  **22/22 PASS + NO CONSOLE ERRORS**（`SMOKE_SHOT_PREFIX=t24-`，截图已清）·
  `apps/web/src/styles/` 终态 = **仅 `aih-theme.css`** ✅
- **换靶新发现（本靶 = 全仓引用扫描：已删文件 / 旧 token / 配置 / 产物 marker）**：
  - ✅ 代码面零残留：`apps/server`/`apps/cli`/`packages/protocol` **零**旧 token 引用；`biome.json`/`turbo.json`/
    `vite.config.ts`/`tsconfig.json` 零 `styles/` 引用 ✅
  - 🟡 **3 处文档仍引用已删文件**（→ 登记 §3 表 16，**T26 converge 处置**）：① design(2026-09-09) 目录树
    行 `└── styles/  tokens.css · global.css` ② m4b design L29「`tokens.css` 全量视觉 token 可直用」
    ③ m4b design L670 复用清单含 `styles/tokens.css`——**三处都应指向 `styles/aih-theme.css`**
    （M4b 若照旧引用会指向不存在的文件）
  - 🟡 **滚动条「6px」名实不符**（Chrome 标准属性优先）——见上「滚动条深究」，本次**不动**（属观感选择；
    迁移保真优先），登记为可选后续项
- **提交面（如实记录）**：主提交 `7a36e2b`（`refactor(web): drop legacy css layer after full re-skin`）
  **漏含两个删除动作**（根因：为实测 CSS 体量做过一次 `git stash push -u` → `build` → `stash pop` 循环，
  `pop` 把先前 `git rm` 暂存的删除**降级为工作区未暂存删除**，随后 `git add -- <7 个路径>` 未覆盖）
  → **补 fixup 提交 `f9beef3`**（`chore(web): drop legacy css files (7a36e2b follow-up)`，−232 行）；
  **不 force-push**（主提交已推送 → 按「一事一提交 + 不重写已推送历史」纪律走 fixup）。
  终态核对：`git ls-files apps/web/src/styles/` = 仅 `aih-theme.css` ✅ · 工作区干净 ✅
  **教训（已入技能笔记）**：`git stash pop` 之后必须**重新核对 `git status` 的暂存状态**，再 `add`/`commit`
- **自检打分（换靶轮）**：**代码 9.82 / 文档 9.69**（B 组升：净删 232 行手工 CSS + 逐字对账；A3 边界 9.5 =
  滚动条名实不符未处理（登记）；C5 9 = `apps/web` 零单测）。⚠ 文档分不动 = 本 Task 文档侧仅 plan 回写
  （设计文档同步归 T26）——按「禁同分重报」披露：靶与证据本轮全新（全仓引用扫描 + 对照实验 + 体量实测）

**T25 阶段 1 门禁 + 全态冒烟（板块 G · 2026-09-11，记录 = `docs/smoke/2026-09-11-m4a-visual-s1.md`）**
- **五门禁（CI 顺序复现）**：typecheck 4/4 ✅ · lint web **0 诊断** ✅ · format:check 212 ✅ · build ✅ ·
  `db:migrate` ✅ · **test（用户 2026-09-11 授权）`CI=true` 单库 `ai_asset_hub` + `--force`** →
  **475 例：474 pass / 1 skip / 0 fail / 1150 expect / 47 文件**（与基线一致 = 零回归）✅
  （env 取自 `apps/server/.env`；脚本内含「库名必须匹配 `ai_asset_hub`」守卫，连接串不回显）
- **冒烟**：`m4a-chain-smoke` = **CHAIN SMOKE PASS** ✅ · `m4a-dogfood`（`SMOKE_SHOT_PREFIX=s1-`）=
  **36/36 PASS + NO JS ERRORS** ✅（改动前 22 条 → 新增 7 条断言；截图 11 张进仓）
- **harness 增强（本轮代码变更，仅冒烟脚本）**：
  - 新增断言：中心 `?q=` 搜索命中 + 结果头「筛选结果」· 筛选 chip → `?label=` · 筛选后收窄 ·
    「全部」复位 · 资产数 < limit ⇒ 无分页控件（**正当缺席**）· **嵌套文件预览**（`lib/embedding.ts`
    内容 + 路径显示 → 覆盖 §3 表 9）· 语言切换 zh↔en + EN 无 i18n 裸键泄漏 · 404 坐标 → ErrorState + 壳仍在
  - **console 错误分列**：`Failed to load resource` + 404 → `netLogs`（404 态断言**预期**触发，单列披露）；
    JS 异常 / 其它 log 仍严格计入 `errors` ⇒ 「console 零错误」判据不被新增 404 断言污染
- **全态覆盖（§6 矩阵）**：首页 / 搜索 / 筛选 / **多标签 OR** / 翻页（正当缺席）/ 详情三 tab / 文件预览 /
  **嵌套预览** / 下载 / 语言切换 / 404 / 空态 = **全部覆盖**；其中：
  - **多标签 OR**：多值 URL 直载（`?label=agentic&label=rag`）→ 请求**同时携带两值** + 已存在 chip 选中 ✅
  - **子标签行**：**网络层 stub** `/api/labels` 注入 root+2 child（**零 DB 变更**，按「不擅自做数据变更」纪律）
    → **2 行渲染** + 子行 chip 与根行**同款**（#f0f5ff / #e3eaf6 / 999px / 12px / fw500 / pad 4-13）✅
  - ⚠ **翻页不可实证**：dev 库 3 资产 < limit 20（已加反向断言）→ 登记
- **人工项**：收起态侧栏 **tooltip** = **用户 2026-09-11 悬停确认正常** ✅
- **换靶发现 / 登记（→ §3 表 18）**：① 子标签行与多标签 OR **未入 harness 自动化**（需管理员凭据给 harness
  注入会话——**新依赖凭据，待拍板**）② 翻页需 >20 资产环境 ③ **沙箱教训**：长寿命 browser 会话（多轮注入
  样式/stub）会出现「URL 已变但 chip 未更新」的**假象**，**同一流程在全新 tab 一次通过** ⇒ 判定应用 bug
  前必须先换新 tab 复现（本轮差点误报为筛选功能缺陷）
- **自检打分（换靶轮）**：**代码 9.83**（B 组：冒烟覆盖 22→36 条 + 判据不被 404 污染；A3 9.5 = 翻页/子行
  未入自动化（登记）；C5 9 = `apps/web` 仍零单测）· **文档 9.75**（+0.06 = 新增 s1 自检记录补齐阶段 1
  全量硬证据 + 出口条件核对表；扣分 = §7 观感项待用户确认）

**T26 converge 收尾（板块 G 末 · 2026-09-11）——阶段 1 全部完成**
- **converge 三查（实测）**：① **版本头**——design `v0.23` · plan `v0.23` · `00` `v1.19` 三向互指一致 ✓
  ② **修订记录**——design / plan / `00` 各追加本工作单元行（v0.23 / v0.23 / v1.19），**历史行一字未动** ✓
  ③ **引用与状态**——design §4.2 目录树（`styles/` 终态改 `aih-theme.css` + 单入口说明）· §4.4 ⑦ 加 ✅（旧层已删、
  29 个 token 名（旧层 93 属性）零消费者）· §8 补「阶段 1 换皮完成」段 · §11 同步；**跨文档**：M2 design 加失效标注行（正文不改）·
  m4b design 两处 `tokens.css` 复用点改指 `styles/aih-theme.css`；`00` §5 M4a 行改 **✅ 完成** ✓
- **阶段 1 出口四项全达成**：五门禁 ✅（475 例 474/1/0）· dogfood 全态 + console 零错误 ✅（36/36 +
  NO JS ERRORS）· **观感用户确认 ✅**（用户 2026-09-11：四页面逐页看过 = 观感 OK）· converge + 8 维重评 ✅
- **design 8 维重评 = 9.56 ≥9**（标准 4：完整 9.5 · 一致 9.5 · 清晰 10 · 可实施 9.5；深度 4：设计纯粹 9.5 ·
  边界 9.5 · 实施精度 9.5 · 跨平台 9.5）——⚠ 较定稿 9.31 **+0.25 的来源 = 正文与事实源逐行一致（T23）+ 三向同步
  + 线框图回写**，非评分口径变化（如实披露）
- **文档面收口**：`docs/smoke/2026-09-11-m4a-visual-s1.md`（观感项与出口表改 ✅）· `00` §5 M4a 行 + 版本头 + 修订行 ·
  design v0.23 · M2 失效标注 · m4b 引用修正
- **自检打分（本轮）**：**文档 9.78**（标准 4 + 深度 4；+0.03 = 三向同步 + 跨文档对齐完成，扣分 = §3 表仍留
  18/19 两项「待拍板」）· 代码 18 维 **N/A**（零代码改动，`git diff --stat` 仅 md 文件）

## 3. 阶段 1 范围登记（✅ 2026-09-11 已细化为 **T17-T26**，任务清单 → §2 板块 E/F/G）

- **详情页**：`pages/AssetDetail.tsx` + `components/market/detail/{DetailTabs,OverviewTab,FilesTab,FileTree,FilePreviewDialog,VersionCompare,DiffNav,DiffView}.tsx`
  —— Tab 激活（蓝青渐变线 → 实底 `--primary` 2px）· 预览对话框（720px 白卡 + `bg-black/50` 遮罩，去 blur）·
  **diff 内容色保留 GitHub 系**（design §4.4 ② 语义修正，不并入 UI 语义色）
- **中心页**：`pages/Center.tsx` + `components/market/{CenterPage,FilterStrip}.tsx`
- **收尾（一次做完）**：删除全部 `.module.css` + `src/styles/tokens.css`（照 design §4.4 ⑦ 映射表逐项核对）
  + **17 处 M4-pre 语义回写**（design §11 已列行号：`@ns` 坐标 / `/assets/:nsSlug/:slug` / `PUBLIC` 可见性 /
  元信息卡「命名空间·可见性」列）→ converge 重查（00 §7 ②）+ `00` §5 M4a 行注记更新 + design 收尾
  （版本头 / 修订记录 / 引用同步，见 T26）
- **验收**：五门禁 + dogfood 全态（首页 / 搜索 / 筛选 / 翻页 / 详情 / 下载 / 语言切换 / 404 / 空态）+
  观感用户确认 + converge 8 维重评 ≥9

**附带评估项（不阻塞阶段 1 出口；换皮过程中一并复核）**

| # | 项 | 现状 | 处置建议 |
|---|----|------|---------|
| 1 | **大屏留白**（≥2560×1440 hero 空白 **65%**） | 用户 2026-09-11「先这样」暂停 | 两案待**用户拍板**：hero 内容加 `max-w` 上限 / 或内容更丰富——**勿自行加** |
| 2 | **`apps/web` 无测试基建** | 零 test script，视觉无回归网 | 评估引入 `bun test` + 首批断言（把 dogfood 的关键 DOM 断言下沉为单测）——**新依赖需用户批准** |
| 3 | **包体 JS ≈546 kB**（侧栏原语 +89 kB） | 22 组件未按路由拆分 | 评估路由级 `lazy()` code-split（详情页 / 中心页最易拆） |
| 4 | 收起态**悬停 tooltip** 未验 | Radix 需真实指针事件，沙箱唤不起 | 由用户人工悬停确认一次（并入 T25 记录） |
| 5 | **lint 非阻断 warning 94 条** | 门禁范围内既有（server / protocol 为主） | 评估是否在阶段 1 清债（不阻塞出口；清则单独 commit） |
| 6 | **「安装与使用」卡不存在**（T18 断言漂移登记） | i18n `installTitle`/`installText` 自 `6c2b27d` 起**零消费者**；design 全文无此 UI | **待用户拍板**：不建（现处置，按「不擅自补功能」）／或作为**内容新增**另立 Task（非纯视觉，或归 M4b） |
| 7 | **`card.tsx` 首个消费点**（design §9 线框图 v0.7 注记「Tab 卡（shadcn Card）」 vs §4.1 纪律 1「展示件手搓 + `card.tsx` 留 M4b」） | T18 已按 §4.1 纪律**不引**（design > plan） | **待用户拍板**：维持手搓（现状）／或详情页 Tab 卡改真 `Card`（可见变化：圆角 18→14 · 加 1px 边 · 内距 24） |
| 8 | **目录行「N files」硬编码英文**（T19 换靶发现） | i18n `fileUnit` 已存在（zh「文件」/en「files」，VersionCompare 在用），`FileTree` 写字面量 → 中文界面显示「1 files」 | ✅ **已修（用户 2026-09-11 同意）**：改走 `t('market','fileUnit')`，随 T19 同批提交 |
| 9 | **嵌套路径文件预览无冒烟覆盖** + 客户端 URL `%2F` 形态（T19 换靶发现） | dogfood 只点 root 级 `SKILL.md`；`fetchVersionFile` 用 `encodeURIComponent(整条 path)` → `files/lib%2Fembedding.ts`（服务端两种形态均 200 ✅） | ✅ **已执行（T25）**：dogfood 新增 3 条嵌套断言（行可见可点 / 内容 / 路径）——全 PASS；**URL 形态暂不改**（判据：两种形态服务端均 200、无用户可见故障；改动属 api 层行为 → 由 T25 嵌套断言先取「正常会话下嵌套预览能出内容」实证，若届时暴露问题再改，一次只动一件事） |
| 10 | **🚧 阻塞 T24：4 个共享 ui 原子件无归属 Task**（T20 换靶发现） | `Badge` / `Spinner` / `EmptyState` / `ErrorState` 的 `.module.css` **仍在**（存量 6 = 这 4 件 + CenterPage/FilterStrip），但 §2 板块 E/F/G **没有任何 Task 负责它们**；T24 却要「删除剩余全部 `.module.css`」⇒ 照字面执行会**直接 build 失败**（组件仍 import） | ✅ **已处理（用户 2026-09-11 拍板 (a)）**：并入 T20 作**增补**换皮完成（见「增补（v0.16）」）⇒ `.module.css` 存量 **6 → 2**（仅 CenterPage / FilterStrip = T21/T22 范围），**T24 阻塞解除** |
| 11 | **中心页页头 eyebrow 与 h1 同 i18n 键 → 文案重复**（T21 换靶发现，**自 `bdc0d5e` 中心页初版起既存**） | `CenterPage.tsx` 的 eyebrow `<span>` 用 `t('market', meta.title)`（**与 h1 同键**）⇒ zh 界面渲染「技能中心 / 技能中心」两行；design **§9 线框**要求「技能中心 Skill Center」（**EN 名** eyebrow）⇒ 代码与 design 漂移 | ✅ **已处理（用户 2026-09-11 拍板 (d)）**：eyebrow 改**语言中立的类型常量表** `TYPE_EYEBROW`（`SKILL` / `MCP` / `AGENT`）——两种语言下均与 h1 不重复、零 i18n 新增、对齐 §9「双语头」意图；实测三中心 `dup: false`。（否决备选：补 EN 名 i18n 键——英文界面下仍重复；删 `<span>`——§9 有此元素） |
| 12 | **死导出 `buildLabelRows` / `labelName`**（T22 换靶发现，既有债） | 两符号在 `FilterStrip.tsx` 之外**零消费者**（仓内 grep 排除自身 = 0）；同 T17 的 `mainDocPath`/`manifestFields` 一类 | 维持现状（**不改**——非换皮范围，且为将来单测预留导出）；**T25/收尾**评估：要么补测试用上，要么收为模块内私有 |
| 13 | **中心页筛选：子标签行 + 多标签 OR 无现场可验数据**（T22 换靶发现） | dev 库标签只有 **1 个 root**（`agentic`，`parentId: null`）、**0 个子标签**（`db:seed` 不建标签，标签由 API 建）⇒ `FilterStrip` 的两级组树第二行（`children.length > 0` 分支）与多标签 OR 拼装**跑不到**（换皮已按旧结构 1:1 迁移，但无渲染实证） | ✅ **已实证（T25）**：子标签行以**网络层 stub** 注入 root+2 child（**零 DB 变更**）→ 2 行渲染 + 子行 chip 与根行同款；**多标签 OR** 以**多值 URL 直载**实证（请求同携 `label=a&label=b`）；harness 自动化需管理员会话 → 见 §3 表 18 |
| 14 | **代码注释腐化 14 处**（T23 换靶发现；同 M4-pre F17 一类） | `apps/server/src/http/assets.ts` **12 行**路由注释仍写 `{ns}/{slug}`（L285/301/317/342/357/418/469/553/613/667/705/765）+ **L255** R4 语义注释仍写「viewer 匿名短路 PUBLIC-only」；`apps/server/src/http/stats.ts:10` 仍写「PUBLIC+ACTIVE 聚合」；另有 `http/assets.test.ts` / `http/labels.ts` 含同模式字符串（**条数待枚举**） | **随 T24（删旧层）同批清**——注释只改文字、零行为影响；T24 执行时**先逐条枚举**（`grep -nE "\{ns\}/\{slug\}" apps/server/src`）再改，改完 `grep` 断言归零；不零散单独提交 → ✅ **已执行（T24，2026-09-11）**：实际 **17 处**（枚举补齐 = 原记 14 + `labels.ts` 1 + `assets.test.ts` 2）· 12 行改动前**先守卫「命中全在注释行」**· 随 T24 同批提交 |
| 15 | **`2026-09-08-m2-asset-domain-design.md` 失效内容无「作废」标注**（T23 换靶发现） | 该 design 正文（坐标 `@namespace/slug` · `visibility` 维度 · `nsSlug` 参数 · 空间角色/权限码）在 **M4-pre 后全部失效**，但文档仍以 `Status: 定稿` 呈现、无失效标记（对比惯例：M4b design 有「随之全部作废」+ 修订记录 ⏸ 搁置行） | ✅ **已处置（T26）**：头部加**失效标注行**（指向 `2026-09-10-flat-model-refactor-design`）+ 修订记录加「⚠ 失效标注」行；**正文不改**（同「史实不改」口径） |
| 16 | **3 处文档仍引用已删旧层文件**（T24 换靶发现） | ① `2026-09-09-m4a-marketplace-portal-design.md:190` 目录树行 `└── styles/  tokens.css · global.css`（T24 后该目录只剩 `aih-theme.css`）② `2026-09-10-m4b-admin-console-design.md:29`「`tokens.css` 全量视觉 token 可直用」③ 同文档 `:670` 复用清单含 `styles/tokens.css` | ✅ **已处置（T26）**：三处（design §4.2 目录树 · m4b design L29/L670）一律改指 **`styles/aih-theme.css`** |
| 17 | **细滚动条「6px」名实不符**（T24 对照实验发现，**迁移前即如此**） | `::-webkit-scrollbar{width:6px}` 与 `html{scrollbar-width:thin;scrollbar-color:…}` **并存**时，Chrome 以**标准属性为准**（且可继承）⇒ 实测 容器 15px / 文档级 11px（`thin`）；单独留 webkit 伪元素才得 6px | **本次不动**（迁移保真优先：与迁移前逐位一致）；若要真 6px ⇒ 去掉 `html` 两条标准属性（属**观感选择**，待用户定；登记备用） |
| 18 | **冒烟覆盖的两个数据/凭据受限项**（T25 发现） | ① **翻页**：dev 库 3 资产 < limit 20 ⇒ 分页交互不可现场实证（已加「正当缺席」反向断言）② **子标签行 + 多标签 OR 未入 harness 自动化**：`POST /api/labels` 需 SUPER_ADMIN，harness 无会话凭据 ⇒ 本轮以**网络层 stub**（子行渲染）+ **多值 URL 直载**（OR 参数）实证 | ① 翻页：需 **>20 资产**环境（可选：harness 造 21 个 fixture 资产——**属新增数据写入，待拍板**）② 子行/OR 自动化：需给 harness **注入管理员会话**（**新依赖凭据，待拍板**）；两者均**不阻塞阶段 1 出口**（已有等价实证） |
| 19 | **沙箱判定纪律：长寿命 browser 会话会造假象**（T25 教训） | 多轮注入样式/stub 的旧 tab 里出现「URL 已变但 chip 未更新、列表未收窄」⇒ 一度疑筛选功能破损；**同一流程在全新 tab 一次通过**（chip 选中 + 列表 3→1 + 请求带 `label=`）⇒ 非应用缺陷 | 已写入技能笔记（`stage1-reskin-execution-notes` §5.10）：**判应用 bug 前必须先换新 tab 复现**；探针读色值前先关过渡（同 T22 教训） |
| 20 | **空态调用点未归一**（整体审计发现，2026-09-11） | `EmptyState` 组件仅 **1 个消费点**（中心页 `noResult`）；详情页 **3 处**空态走内联：`VersionCompare.tsx:175` · `FilesTab.tsx:35` · `OverviewTab.tsx:88`（均 `t('common','empty')`）——形态已统一、**调用点未收敛** | T20 的「4 共享原子件」只承诺形态归一（未承诺调用点收敛）⇒ **不阻塞**；建议 M4b 前顺手收敛为 `<EmptyState>`（或记录为何保留内联）**待拍板** |
| 21 | **4 个 export 无外部消费者**（整体审计发现；T22 登记口径「死导出」表述不准） | `FilterStrip.tsx`：`buildLabelRows` · `labelName`；`OverviewTab.tsx`：`mainDocPath` · `manifestFields`——**均在本文件内被使用，非死代码**，只是无谓暴露 API 面（base 亦如此 = 既有债） | 建议降为 module-local（删除 `export` 关键字）→ 纯收窄面、零行为影响；**随 M4b 首个触碰这些文件的提交**处理 |
| 22 | **i18n 死键**（整体审计发现） | `market.download`（"下载"/"Download"，**0 引用**——本轮新发现）· `installTitle`/`installText`（已知，待拍板 6） | ✅ 已澄清：`errors` 段 9 键**全部为动态解析**（`ErrorState.tsx:17` `tErr(error.code)`）⇒ **非死键**，静态扫描为假报；`market.download` 建议随下一轮 i18n 清理删除（**待拍板**） |
| 23 | **9px 折叠箭头逾出字阶**（整体审计发现） | `FileTree.tsx:67` · `DiffView.tsx:102` 的 ▶/▼ 装饰字形用 `text-[9px]`（`aria-hidden` ✓）；design §4.4 字阶首档 = 11px ⇒ 9px **不在轴上**。**但**：旧层 `FileTree.module.css:47`/`DiffView.module.css:29` 原值就是 `font-size: 9px` ⇒ **忠实迁移**，非本轮引入 | 两个选项（**待拍板**）：① 视为**图标尺寸**改 `size-*` + SVG（语义更正）② 在 design §4.4 例外表登记「装饰字形 9px」 |
| 24 | **chip 三段类串跨文件重复**（整体审计发现） | `border-border bg-secondary` 系 chip 类串在 **4 个文件**重复（FilterStrip 根/子行 · VersionCompare 版本 chip 等）——语义一致但无单一来源 | 建议 M4b 前抽为 `ui/chip` 或共享常量（与 §3 表 20/21 同批）；**不阻塞阶段 1 出口** |

## 4. 风险与回退

- **回退面**：阶段 0 = 基建（T1-T3）+ 壳（T4-T7）+ 首页（T8-T12），逐件独立 commit → 可 `git revert`
  单件；旧 `tokens.css` 与未换页 `.module.css` **阶段 0 不删** → 双栈可回退（design §4.1）
- **已知风险 ①（密度）**：字阶收敛是**唯一的密度变化**（实测 23 档定义 → 9 档）——用户三判的「密度」项
- **已知风险 ②（类型色）**：三类型渐变 tile 去渐变改实底，辨识度需目视确认——三判的「类型色」项
- **已知风险 ③（大包体）**：22 组件未按路由 code-split 时 JS 可达 ≈500 kB → 阶段 1 评估路由级拆分（不阻塞阶段 0）
- **不做**：为换皮改测试/放宽断言——换皮是视觉变更，测试红 = **越界信号**，须查根因

## 5. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.1 | 2026-09-11 | sunxuewen-rush | 初稿：**阶段 0 探针切片**（板块 A 基建 T1-T3 · B 共享壳 T4-T7 · C 首页 T8-T12 · D 验证出口 T13-T16）+ 阶段 1 范围登记 + 风险与回退；依据 design v0.9（2026-09-11 定稿）；门禁统一在代码落地后跑（用户定） |
| v0.2 | 2026-09-11 | sunxuewen-rush | **AIH blue 基色层生效（依据 design v0.10）**：① T3 由「单文件落 token」改为**两层结构**——官方层 `src/index.css` + **AIH 层 `src/styles/aih-theme.css` 独立文件、官方样式之后 import**（解耦纪律）② T3 断言由 3 条扩到 **6 条**（含 **import 顺序断言** / **`--secondary` 覆盖断言** / **组件零改动断言** `git status`）③ T13 增 AIH 层顺序断言 ④ 引用链与 Status 升 design **v0.10** |
| v0.3 | 2026-09-11 | sunxuewen-rush | **T1-T7 落地回写（依据 design v0.11）**：① §2 新增 **「落地记录（2026-09-11 执行回写）」** 小节——板块 A（T1-T3 断言实测 + 包体基线 35.34→96.69 kB / JS 零膨胀）· T4（**`global.css` 降级**：`main` padding `0px→16/22/36`、`body` 底色 → `rgb(248,250,255)`）· 板块 B（T5-T7 真浏览器计算值 + `localStorage` 持久化复现；JS +34 kB = Button/radix 进包）② **T3 断言 ④ 修正**：压缩产物引号被去 → 按 `html[data-base=aih]` 匹配 ③ **T6 断言修正**：「<900px 图标态」旧实现零 `@media`、该形态不存在 → 按结构零变更不补，登记为差异 ④ **T7 形态修正**：**保 pill**（2026-09-11 用户拍板）——原措辞 `DropdownMenu` 与 §1「纯视觉变更」纪律冲突，以纪律为准 ⑤ T16 措辞升 v0.3 · 引用链 design 升 **v0.11** |
| v0.4 | 2026-09-11 | sunxuewen-rush | **增 T7b（阶段 0 增补）：侧栏收起/展开接入 shadcn `Sidebar` 原语**（依据 design v0.12）——① **来源**：用户提出「点一下收起、再点展开」→ 核实 shadcn 原生支持（`sidebar.tsx` 已于 T2 落仓）→ 用户拍板「做，按推荐」② **拍板四项**：`icon` 档（收起留图标轨）· 展开宽保 **204px** · 触发钮 **顶栏左端** + `⌘B`/`Ctrl+B` · 移动端 **要** Sheet ③ **性质声明**：结构/行为变更（非纯视觉）→ 按纪律**先改 design/plan 再实现**；因共享壳正在换皮 + M4b 复用同壳，作阶段 0 增补 ④ T7b 含 Files/Assert（6 条现场可验）/Commit ⑤ Status 同步（T7b 与板块 C 均 ✅）· 引用链 design 升 **v0.12** |
| v0.5 | 2026-09-11 | sunxuewen-rush | **首页精简为「纯 hero 落地页」（用户拍板 A；design v0.15；★性质 = IA 变更，非换皮）**：① §2 落地记录新增 **「增补（v0.15）」** 块——决策依据 / 落地清单（`Home.tsx` 110→30 行 · 删 `TypeEntryCard.tsx` · 删 i18n 8 键）/ **撑满一屏为配套必须项**（`min-h-[calc(100vh-110px)]`）/ 死链 CTA 处置 / 冒烟同步 / 实测证据 ② **T13 断言口径修正**：`linear-gradient` 由「换皮范围内零残留」→ **仅允许 §4.4 ②bis 白名单 3 token**（v0.14 品牌渐变的连带修正，非本轮新增）③ 引用链 design 升 **v0.15** |
| v0.6 | 2026-09-11 | sunxuewen-rush | **hero 撑满一屏 + 删「进入技能中心」CTA + 统计条拆三族计数（用户拍板三项；design v0.16）**：① §2 落地记录新增 **「增补（v0.16）」** 块（三项落地 + 实测证据 + 冒烟同步 + 5 项统计待定登记）② **T8 断言口径更新**（hero 真值：`min-h` 撑满 / 无 CTA / 三族计数）③ 引用链 design 升 **v0.16** |
| v0.7 | 2026-09-11 | sunxuewen-rush | **搜索栏加长 + 「原生类型」→「用户数量」（用户拍板；design v0.17；★含后端契约变更）**：① §2 落地记录新增 **「增补（v0.17）」** 块（前端 2 项 + 后端 `totalUsers` 契约 + 口径披露 + 实测 + 待跑测试）② 登记：**stats 形状不在 `packages/protocol`**（仅 server `PublicStats` / web `StatsResponse` 两处镜像）——协议包零改动 ③ 引用链 design 升 **v0.17** |
| v0.8 | 2026-09-11 | sunxuewen-rush | **阶段 0 收尾回写（设计 v0.18→v0.20 同步）**：① §2 落地记录新增 **三块**——「增补（v0.18/v0.18b）」（hero 与侧栏浮层对齐 + 撑满职责上移去硬编码 + 13 档分辨率矩阵 + 大屏留白登记）· 「增补（v0.19）」（去中间分割线）· 「增补（v0.20）」（统计条改卡片撑满 hero）② 新增 **「增补（v0.8）」** 块（T13 记录 + 五门禁 + 双冒烟 + 冒烟脚本修复 + T15 剩余）③ **§1 修内部矛盾**：原「本阶段零服务端改动」「本 plan 不改测试」被 v0.17 打破 → 改述为「唯一例外」并注出处（自检发现）④ Status：板块 A/B/C/T7b + **T13 ✅ + T15 部分 ✅**、五门禁全绿（test 475 例 474 pass / 1 skip / 0 fail）⑤ T13/T15 标题加 ✅ 与剩余项 ⑥ 引用链 design 升 **v0.20** |
| v0.9 | 2026-09-11 | sunxuewen-rush | **阶段 0 出口达成（三判通过 + 撤控件）**：① **T14 三判 ✅**——用户结论「现在看起来 OK」（气质 / 密度 / 类型色 三项均通过）→ 出口达成；② **T15 收尾 ✅**——`git rm` `apps/web/src/dev/ReviewControls.tsx` + `main.tsx` 两处引用，断言 `grep -rn 'ReviewControls' apps/web/src` = 0；浏览器复核（`★ 评审` 钮消失 / hero + 5 tile 正常）；门禁复跑全绿（`format:check` 212 文件）+ 生产包 marker 仍全 0；③ §2 新增「增补（v0.9）」块（三判结论 + 撤控件 + 出口三条件核对 + T16 待细化）；④ Status 改「**阶段 0 已完成 ✅**」、T14/T16 标题加状态、引用链 design 升 **v0.21** |
| v0.10 | 2026-09-11 | sunxuewen-rush | **阶段 1 任务细化（T16 出口动作，design 依据 v0.21）**：① **§2 新增板块 E/F/G（T17-T26）**——详情页 4 Task（T17 头区+DetailTabs · T18 Overview+MarkdownRenderer（`card.tsx` 首个消费点）· T19 FilesTab+FileTree+预览对话框 · T20 VersionCompare+DiffNav+DiffView（**diff 保 GitHub 内容色**））· 中心页 2 Task（T21 CenterPage · T22 FilterStrip）· 收尾 3 Task（T23 **17 处 M4-pre 语义回写** · T24 删旧层 `.module.css`×16 + `tokens.css` + `global.css` · T25 门禁 + 全态冒烟（`SMOKE_SHOT_PREFIX=s1-`））+ **T26 converge**；每 Task 含 Files / Assert（可现场跑）/ Commit 三段 ② **§3 补「附带评估项」5 条**（大屏留白 / `apps/web` 测试基建 / 包体 code-split / tooltip 人工确认 / lint warning 清债——均**不阻塞出口**）③ §3 标题与 §1「不含」段改为指向 §2 板块 E/F/G；T16 标题 ✅（并修正其 Assert 里的陈旧版本号 v0.3 → v0.10）④ Status 改「**执行中（阶段 1）**」+ 阶段 1 出口口径（五门禁 + dogfood 全态 + 观感用户确认 + converge 8 维 ≥9） |
| v0.11 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T17 详情页外壳落地**：① **范围修正（执行期发现）**：右栏（下载卡 / 元信息卡）与头区同在一个文件且仍玻璃 + 蓝投影 + 渐变 → 并入 T17（原 Files 只列头区）；`--aside-w`/`--topbar-h` 写死字面值避免 T24 悬空 ② 落地：`AssetDetail.tsx` 全页外壳 + `DetailTabs.tsx` 重写；删 `DetailTabs.module.css` + `AssetDetail.module.css` ③ 实测：头卡白/18px/`shadow-sm` 生效（**撤回**首测「无阴影」误判——截断输出所致）· 激活下划线实底 #1447e6/2px/`image:none` · 右栏 320px/sticky 78px · 下载按钮渐变 + `box-shadow:none` · 全页无 `backdrop-filter` ④ 功能断言：三 tab 面板 554/151/1378 字切换正常 ⑤ §2 新增「增补（v0.11）」块 + T17 标题 ✅ + Status 补 T17 |
| v0.12 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T18 详情页总览 + markdown 落地 + 断言修正**：① **两处断言修正（执行期发现）**——(a) 「安装与使用」卡**不存在**（i18n `installTitle` 自 `6c2b27d` 起零消费者 · design 全文 0 命中）⇒ 按「不擅自补功能」**不建**，登记 §3 待拍板 6；(b) **`card.tsx` 首个消费点不作** —— design §4.1 纪律 1 / §4.4 v0.20 行「展示件手搓 + `card.tsx` 留 M4b」> plan（权威链），登记 §3 待拍板 7 ② 落地：`OverviewTab.tsx` 全量 Tailwind 化 + `MarkdownRenderer` 的 md-body 改 **Tailwind 子元素变体**（零新增 CSS 文件）；删两个 `.module.css` ③ 实测：h1 18/700 · h2·h3 14/700 · h4 13/h5·h6 12（**补 Preflight**）· p·li 13/23.4/#64748b · 内联 code #f1f5fb+1px+r5 · `pre` #f1f5fb+r10+mono，**pre 内 code 透明零边框**（`:not(pre)>code` 互斥 ✓）· blockquote 3px 边+muted/50 · 表格 th muted/50+600 · a #1447e6 · metaBar 11px SF Mono+下边 1px ④ 回归：三 tab 切换 + mcp 资产总览正常 ⑤ **design 缺口登记**：`--md-*` 六 token 无 §4.4 映射 → 择浅色语义面（待用户确认）⑥ 门禁 4/4 绿（CSS 93.85 kB / JS 562.79 kB）⑦ **自检打分（新增常态，§1 执行纪律）= 代码 9.77 / 文档 9.69**；自检抓到真缺陷「断言不可现场跑（`--md-` 命中自述注释）」→ 同轮收紧为 `var(--md-` 消费级 |
| v0.13 | 2026-09-11 | sunxuewen-rush | **T17+T18 合并自检（用户追加要求）· 换靶复核 + 4 项 parity 返工**：① **换靶证据**——4 个被删 `.module.css` **逐属性对照**（**零 `@media`/零 reduced-motion** ⇒ 无响应式漏迁；`.kv .mono` 系死规则）· i18n 调用逐字零差异（4 文件）· 请求轨迹零新增零重复（懒加载/缓存行为实证）· `.glass` 仍有 2 消费者（FilterStrip/CenterPage ⇒ T22/T24）· dogfood 已覆盖总览 md（回归网存在）· 生产包 marker 4/4 = 0 ② **自检返工 4 项（T17 文件 `AssetDetail.tsx`，均为 parity 缺口）**：字阶桶偏离 ⑤（面包屑 + 元信息 3 行 12.5px 误用 `text-[13px]` → `text-xs`）· 漏迁 `underline-offset: 2px` · 错误条圆角 8 误用 `rounded-lg`→`rounded-md` ③ **登记微调（有设计依据）**：tab gap 2→4 · tab 方角 · 激活/悬停字色 → foreground · 标签底 → `bg-secondary` · 下载钮圆角 12→10 ④ **登记既有债**：`mainDocPath`/`manifestFields` 死导出 · `role=tab` 缺键盘导航/`aria-controls` ⑤ **合并评分 代码 9.79 / 文档 9.69**（+0.02 来自补齐验证缺口与修 parity，非产物变好——披露铁律）⑥ 门禁 4/4 复跑绿（typecheck/lint 无新增/format:check 212/build） |
| v0.14 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T19 文件树 + 预览换皮落地 + 断言修正 + 换靶自检**：① **落地**：`FilesTab`/`FileTree`/`FilePreviewDialog` 全量 Tailwind 化（`FileTree` 缩进改 `INDENT` 表，等价旧 `.indent`+`.d2/.d3`）+ 删 3 个 `.module.css`（存量 12→**9**）② **修既有缺陷**：旧 `pad` 在 depth=1 取 `styles.d1`=undefined → 类名含字面 `undefined`（查表消除）③ **断言修正**：「焦点陷阱行为不变」——实测**无任何焦点管理**（仅 Esc 监听）⇒ 断言漂移，按纪律不补功能、登记既有债 ④ **实测**：目录行 13/600/#64748b/py5/gap9/mono · 文件行缩进 20px(root 0) · sha 徽章 #f1f5fb+r6+1px7px+11px + `…` 截断 ✓ · **遮罩 `bg-black/50` 且 `backdrop-filter: none`** ✓ · 卡 `#ffffff`/r10/min(720px,88vw)/76vh/`shadow-lg` ✓ · overlay `z-90` ✓ · **Esc/遮罩/✕ 三路关闭实测 ✓** · 全页 `backdrop-filter` 命中 0 ⑤ **新登记**：目录行「N files」硬编码（i18n `fileUnit` 已有）· 无焦点陷阱 · 嵌套路径预览无冒烟覆盖 + `%2F` URL 形态（§3 表 8/9）⑥ **沙箱限制**：本轮 headless 会话 post-load fetch 全挂（`/api/stats` 直连亦不返回；curl 200 ✅）⇒ 对话框正文未能实测；佐证 = T13 期 dogfood「预览对话框内容」断言在正常会话已过（22/22）⑦ **自检打分 代码 9.79 / 文档 9.69**（换靶抓 4 项新问题；与上轮同档，如实披露无虚高） |
| v0.15 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T20 版本对比 + diff 落地 + 换靶自检**：① **落地**：`VersionCompare`/`DiffNav`/`DiffView` 全量 Tailwind 化 + 删 3 个 `.module.css`（存量 →**6**）+ **清掉阶段 0 最后一条 lint info** ⇒ `lint` **web = 0 诊断** ② **实现取舍**：半径「就近向下」规则入注释 · 动态类索引 → `LINE_STYLE` 查表 · 原生 select 保留（换原语=行为变更）但焦点态用 §4.4 ③ 真值 · 青色 `--brand-3` 废弃 → `muted-foreground` ③ **diff 内容色为有意字面值**（`#1a7f37`/`#e6ffec` · `#cf222e`/`#ffebe9`，依 §4.4 ②）；**design ⑦ 缺 `--diff-*`/`--ct-*`/`--sha-bg` 映射** → 登记 ④ **实证**：**dogfood 22/22 PASS + NO CONSOLE ERRORS**（`SMOKE_SHOT_PREFIX=t20-`，独立 Edge 会话）含 diff 三型徽章/行内容 ⇒ diff 真渲染；**并 closure T19 沙箱缺口**（「预览对话框内容」PASS）⑤ **换靶发现**：🚧 **4 共享原子件（Badge/Spinner/EmptyState/ErrorState）无归属 Task 而 T24 要删其 CSS ⇒ 阻塞 T24**（§3 表 10）+ 🟡 diff 行内徽章仍旧层 `Badge` 样式（同页两套视觉）⑥ **自检 代码 9.76 / 文档 9.69**（B3 9 · C5 9）⑦ 临时截图 `t20-*.png` 已清（不进仓） |
| v0.16 | 2026-09-11 | sunxuewen-rush | **T20 增补（用户拍板 (a)）· 4 共享原子件换皮 ⇒ 解除 T24 阻塞**：① **范围**：`Badge`/`Spinner`/`EmptyState`/`ErrorState` + 删 4 个 `.module.css` ⇒ 存量 **6→2**（仅 CenterPage/FilterStrip = T21/T22），**T24 可照字面执行** ② **`Badge` 5 tone → AIH 语义 token**（`--success`/`--warning`/`--destructive`/`--primary`/`muted`）⇒ 同页两套视觉消除 + **`--ct-*` 消费归零**；10.5px→`text-[11px]` · `rounded-full` ③ **`Spinner` 补可访问性**：动画改 `animate-spin`（0.8s→1s 登记）+ 新增 **`motion-reduce:animate-none`**（§4.4 ⑥ 旧层只覆盖 transition）④ `EmptyState`/`ErrorState` 字阶与语义色归一（retry 圆角 9→8）⑤ **实测**：Badge `oklch(0.627 0.17 149.2)`/`bg success/10`/11px/full/mono ✓ · Spinner 顶边 primary ✓ · select 12px/r8/#fff ✓ · 历史行 13px/700 ✓ · EmptyState 13px/#64748b/pad 40-16/lh1.7 ✓ · ErrorState `role=alert`+retry `primary/10` ✓ · **dogfood PASS=22 FAIL=0 + NO CONSOLE ERRORS** ✓ · 门禁 4/4（lint web **0 诊断**）⑥ **自检 代码 9.76 → 9.84**（B3 9→10，+0.08 = 真实产物改进非口径变化）· 文档 9.69 |
| v0.17 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T21 中心页换皮落地 + 换靶自检**：① **落地**：`CenterPage.tsx` 全量 Tailwind 化——页头 `.glass` → 白卡 `bg-card`+`shadow-sm`+r18 · **氛围光斑 `::before` 整块删除**（+`overflow`/`position` 去除）· icon tile 52px 渐变 → **44px 实底类型色**+r13+白图标 22px（`TILE_BG` 查表替代 `styles[type]` 动态类名）· 页头搜索框 → shadcn `Input`（纪律 1）· 计数徽章 → hero 统计 tile 语法 · 字阶 21→`text-xl` / 12.5→`text-xs`；删 `CenterPage.module.css`（存量 **2 → 1**）② **Files 修正（执行期）**：原文「Delete 两个 `.module.css`」= 与 T22 混写 → 实删 1 个；`pages/Center.tsx` **零改动**（9 行纯转发）③ **实测（1440×900 真浏览器）**：head 白/r18/pad 22-26/mb16/`shadow-sm`/`backdrop-filter none`/**`::before content none`** ✓ · tile 44×44/r13 skill `rgb(37,99,235)` · mcp `rgb(14,116,144)` · agent `rgb(109,40,217)` ✓ · h1 20/700/-0.4 ✓ · 描述 13/#64748b/mt4 ✓ · Input h36/r8/边#e3eaf6/**240px**/`text-sm` ✓ · 徽章 `#f0f5ff`/r14/数字 22px `oklch(0.488 0.243 264.376)`/`tabular-nums`/标签 11px ✓ · 结果头 gap12/mb12/13+12px ✓ · 网格 **4×287.5**/gap14 ✓ · 三中心同构 + `/agents` 空态 ✓ · 全页 `backdrop-filter` 命中 **1**（FilterStrip = T22）④ **换靶（本靶 = 旧 token 消费者全仓普查）**：`--grad-skill/mcp/agent` 消费者**归零**（孤儿 ⇒ T24 删）· 旧 token 消费者**只剩 `FilterStrip.module.css`**（⇒ T22 后 T24 无残留）· 🟡 **新发现缺陷（内容级）**：eyebrow 与 h1 **同 i18n 键** → zh 渲染「技能中心 / 技能中心」重复，与 design **§9 线框「技能中心 Skill Center」** 漂移（缺 3 个 EN 名键）→ **未改**（先说明→等许可），登记 §3 待拍板 11 · 📌 **取样条件教训**：窄视口测得 Input 187px + 网格 2 列（疑 CSS 未热更）→ 桌面钉死后 **240px / 4 列**（窄视口收缩 = 旧 `.search` 同行为 parity，非回归）⇒ 视口未钉死不做定性判断 ⑤ **回归**：dogfood **22/22 PASS + NO CONSOLE ERRORS**（`SMOKE_SHOT_PREFIX=t21-`，截图已清不进仓）· 门禁 typecheck 4/4 · lint **web 0 诊断** · format:check 212 · build ✓ ⑥ **自检 代码 9.80 / 文档 9.69**（↓0.04 = 换靶新证据，非产物变差；如实披露） |
| v0.18 | 2026-09-11 | sunxuewen-rush | **增补 · 中心页页头 eyebrow 修重复（用户拍板 (d)）**：① **问题**：eyebrow `<span>` 与 h1 **同 i18n 键**（`t('market', meta.title)`）⇒ zh 渲染「技能中心 / 技能中心」重复；`git log -S "styles.en"` 实证**自 `bdc0d5e`（中心页初版）既存**，非 T21 换皮引入 ② **处置**：改**语言中立的类型常量表** `TYPE_EYEBROW`（`SKILL`/`MCP`/`AGENT`）——两种语言下均与 h1 不重复 · **零 i18n 新增** · 对齐 design §9 线框「双语头」意图；字面即大写（不靠 CSS `text-transform`）⇒ `textContent` 取值确定 ③ **否决备选**：补 EN 名 i18n 键（英文界面下 h1 与 eyebrow 仍同句）· 删 `<span>`（§9 线框有此元素）④ **实测**：三中心 `技能中心 / SKILL` · `MCP 中心 / MCP` · `专家中心 / AGENT`，`dup: false` ✓ · 11px/`ls 1px`/`#64748b` ✓ · 无裸键泄漏 ✓ · 门禁 4/4 绿（`dogfood` 未重跑——纯静态文案改，已由真浏览器逐中心实测覆盖） |
| v0.19 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T22 FilterStrip 换皮落地 + 换靶自检（板块 F 收官）**：① **落地**：`FilterStrip.tsx` 全量 Tailwind 化 + 删 `FilterStrip.module.css` ⇒ **`.module.css` 存量 1 → 0**（`find` = 0）· `.glass` → 白卡 `bg-card`+`shadow-sm` · 圆角 16 不成轴 → 就近向下 `rounded-xl` · chip 三段常量（未选中 `bg-secondary`/`border-border`/hover `border-ring/40`+`text-primary`；选中 **实底 `bg-primary` + `text-primary-foreground`**，旧 `--grad-brand` 渐变 + 蓝投影为 §4.4 废弃项）· 12.5→`text-xs` · 子行 pill 与根行统一（旧 `.sub` 仅差衬底 alpha，白卡上不可辨）② **实测（1440×900）**：strip 白/r14/pad 12-16/mb14/`shadow-sm`/`backdrop-filter none` ✓ · 标题 11/700/uppercase/ls .7px/#64748b/pt7 ✓ · 未选中 chip `rgb(240,245,255)`/边 #e3eaf6/fw500/999px ✓ · 选中 chip `oklch(0.488 0.243 264.376)`+`oklch(0.97 0.014 254.604)`+边 primary+fw600+**`box-shadow none`** ✓ · 行 gap7/cols gap7/grid gap14 ✓ ③ **交互实证**：点标签 → `?label=agentic` + 列表 3→**1** + 「筛选结果：1」；点「全部」→ URL 复位 + 3 卡；默认「全部」选中（`selected.length === 0`）④ **换靶（死导出 + 覆盖缺口 + T24 前置核对）**：✅ **T24 前置全绿**——`.module.css` = 0 · 旧层 token 消费 = 0（剩 11 条 `var(--tint-*)`/`var(--ava-*)` 全属 AIH 层 `@theme` 映射）· `.glass` 消费 0（定义待 T24 删）· 旧层引用 2 处 = `main.tsx:13-14` import · 删除面 = `tokens.css` 126 + `global.css` 106 行 · 🟡 **死导出** `buildLabelRows`/`labelName`（§3 表 12）· 🟡 **覆盖缺口**：dev 库仅 1 root 标签、0 子标签 ⇒ 两级组树第二行 + 多标签 OR 无现场可验数据（§3 表 13 → T25 造数据补验）· 📌 **断言纪律自纠**：点标签后 3.5s 取样得 `on: []` 疑「选中态失效」→ 实为**过渡中间值**（`oklab(...)` 插值 vs 探针按 `oklch` 匹配）；同点位 `className` 已含正确三段类，**关过渡复测**得终值 ✓（通则：带 `transition` 的属性断言前注入 `*{transition:none!important}`）⑤ **回归**：dogfood **22/22 PASS + NO CONSOLE ERRORS**（`t22-` 前缀，截图已清）· 门禁 4/4（lint web **0 诊断**）⑥ **自检 代码 9.80 / 文档 9.69**（分与 T21 同、**靶与发现不同**，按「禁同分重报」披露） |
| v0.20 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T23 M4-pre 语义回写落地（纯文档 Task，design 自身修正）**：① **落地**：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` 正文 **18 行**按扁平模型终态重写——§1 Scope + 前置 · §2 右栏元信息卡列 · §3 路由表 / 面包屑 / 头部 · §5.1 列表参数去 `nsSlug` · §5.2 R4 决议 2 行 + 匿名安全行 · §6 R4 · §8 详情页头部 + 段尾补注 · §8 语义修正记录 · §9 线框图 5 行；并改 §11 登记项 ✅ + 版本头 v0.22 + §12 追加 v0.22 行（**§12 旧行一字未动 = 史实不改**）② **数量自纠（量化铁律）**：v0.9 登记「17 处」系当时 grep 清单且行号已漂移 → **重新实测 = 18 行**（多出 §9 面包屑行）③ **执行方式**：`/tmp/aih-t23.mjs`（bun）逐组断言「命中次数 = 1」→ 全通过才写盘（21 组替换）④ **证据链**：事实源 `2026-09-10-flat-model-refactor-design`（R3 可见性删除 / R5 坐标裸 slug）· `http/assets.ts` `listQuerySchema` 无 `nsSlug` · `assets/service.ts:170-177` 列表 `conditions = [eq(asset.status,'ACTIVE')]` 与 viewer 无关 · `pages/AssetDetail.tsx` + `i18n/zh.ts:52-54` 实测渲染（作者/更新时间/累计下载）⑤ **验证**：正文残留仅 2 处合法命中（skillhub 组件名 / CSS 措辞）；无粘连；行数 661 → 673 ⑥ **换靶发现**：🟡 **代码注释腐化 14 处**（`http/assets.ts` 12 行 `{ns}/{slug}` + L255 PUBLIC-only + `http/stats.ts:10`）→ 登记 §3 表 14，**随 T24 同批清** · 🟡 **M2 design 失效内容无「作废」标注** → 登记表 15，**T26 converge 处置**（只加标注行，正文不改）⑦ **自检 文档 9.72**（+0.03 = 正文与事实源逐行一致 + 数量重新实测；扣分 = 域外残留登记未修）· **代码 18 维 N/A**（零代码改动）⑧ 引用链 design 升 **v0.22** |
| v0.21 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T24 删旧层落地（双栈共存期结束）+ 换靶自检**：① **落地**：`git rm` `styles/tokens.css`（126 行）+ `styles/global.css`（106 行）· `main.tsx` 摘两处旧 import（注释改「样式单入口」）· **迁移面入 `aih-theme.css` 新段「D. 旧层迁移面」**——6px 细蓝滚动条 5 规则 + `html{scrollbar-width:thin;scrollbar-color:…}` + `body{-webkit-font-smoothing; min-height:100vh}` + reduced-motion 全关块；滚动条四值迁 `@theme`（§4.4 ⑥）；**迁移块保持无层**（与迁移前同优先级 ⇒ 零级联变化）② **逐字对账**：三组规则与 `git show HEAD:…global.css` diff = 一致；已删项均为 Tailwind 已承接者（`*` reset→Preflight · body 三属性→base · `rise` keyframes→AIH `@theme` · `fadein`/`.glass`/`.bg-glow` 零消费者）③ **Assert 口径收紧（同 T19 先例）**：旧层引用断言改 **import 级**（`^\s*import .*styles/(tokens\|global)\.css` = 0）；旧语法断言改**非注释行**（17 处命中逐条定性 = 全为解释性注释）；dist 的 `backdrop-filter` = Tailwind 工具脚手架（非残留）；旧层 93 个自定义属性 / 映射表 29 个 token 名 → 非注释消费者 = **0** ④ **浏览器实测**：`--scroll-*` 四值在 `:root` 生效 · `html` thin + 蓝 · `body` antialiased + `min-height 900px` · 页面底渐变在 · **reduced-motion 全关生效**（动画 0.01ms / iter 1；复位 0.5s）⑤ **滚动条深究（对照实验）**：现状 15/11px；再注入旧层同款规则 → 同值（非迁移引入）；去 `html` 标准属性 → 6px（规则生效）⇒ Chrome 标准属性优先 ⇒ 本仓「6px」实际观感一直是 thin+蓝（迁移前后逐位一致）；登记表 17（本次不动）⑥ **体量（stash 对照）**：CSS **89,921 → 86,679 B（−3,242 B / −3.6%）**；生产包 marker 仍 0 ⑦ **顺批清注释腐化 = 17 处**（表 14 ✅ 已执行：`assets.ts` 12 行路由注释 + L255 + `stats.ts:10` + `labels.ts:4` + `assets.test.ts` 2 处 describe；改动前守卫「命中全在注释行」）⑧ **换靶发现**：全仓代码/配置零残留 ✅；🟡 **3 处文档仍引用已删文件**（design 目录树行 · m4b design L29/L670）→ 表 16（T26 converge，**优先级高**：影响 M4b 可用性判断）· 🟡 滚动条名实不符 → 表 17 ⑨ **门禁 4/4 + dogfood 22/22 + NO CONSOLE ERRORS** ⑩ **自检 代码 9.82 / 文档 9.69**（分同而靶全新：全仓引用扫描 + 对照实验 + 体量实测） |
| v0.22 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T25 五门禁 + 全态冒烟落地（含 T24 补记）**：① **五门禁（CI 顺序复现）**：typecheck 4/4 · lint（web **0 诊断**）· format:check **212** · build · `db:migrate` · **test（用户授权）`CI=true` 单库 `ai_asset_hub` + `--force`** → **475 例 474 pass / 1 skip / 0 fail / 1150 expect / 47 文件**（与基线一致 = 零回归；env 取 `apps/server/.env`，脚本内置库名守卫，连接串不回显）② **冒烟**：`chain-smoke` **PASS** · `dogfood`（`SMOKE_SHOT_PREFIX=s1-`）**36/36 PASS + NO JS ERRORS**（22 → 36 条断言）③ **harness 增强**（仅冒烟脚本）：+7 断言（`?q=` 搜索 / 筛选 chip→`?label=` / 收窄 / 复位 / 分页**正当缺席** / **嵌套文件预览**覆盖 §3 表 9 / 语言切换 + 无裸键 / 404 → ErrorState）+ **console 错误分列**（`Failed to load resource`+404 → `netLogs` 单列披露，JS 错误仍严格）④ **全态覆盖**（§6 矩阵 13 态全覆）：首页/搜索/筛选/**多标签 OR**（多值 URL 直载 → 请求同携两值）/翻页（正当缺席）/详情三 tab/文件预览/**嵌套预览**/下载/语言切换/404/空态；子标签行以**网络层 stub** 注入 root+2 child（**零 DB 变更**）→ 2 行渲染 + 子行 chip 与根行同款 ⑤ **人工项**：收起态 **tooltip 用户悬停确认正常** ✅ ⑥ **记录**：新建 `docs/smoke/2026-09-11-m4a-visual-s1.md`（五门禁 + 静态断言 + 体量 + 页面实测 + 冒烟 + 全态矩阵 + 人工项 + 登记 + 出口核对）+ 11 张 `s1-*.png` 进仓 ⑦ **换靶/登记**：§3 表 18（冒烟数据/凭据受限两项——翻页需 >20 资产、子行/OR 需管理员会话，均**待拍板**，不阻塞出口）· 表 19（**沙箱纪律**：长寿命 browser 会话造「URL 已变但 chip 未更新」假象 → 判应用 bug 前先换新 tab 复现；已入技能笔记）⑧ **T24 补记**：主提交 `7a36e2b` 漏含两删除（`stash pop` 降级暂存）→ 补 fixup `f9beef3`，**不 force-push** ⑨ **自检 代码 9.83 / 文档 9.75**（+0.06 = s1 记录补齐阶段 1 硬证据 + 出口核对表） |
| v0.23 | 2026-09-11 | sunxuewen-rush | **阶段 1 · T26 converge 收尾 —— 阶段 1 全部完成（出口四项全达成）**：① **converge 三查**：版本头（design v0.23 · plan v0.23 · 00 v1.19 三向一致）· 修订记录（各追加本单元行、历史行不动）· 引用与状态（design §4.2/§4.4 ⑦/§8/§11 + M2 失效标注 + m4b 两处引用 + 00 §5 M4a 行 ✅ 完成）② **出口四项**：五门禁（475 例 474/1/0）· dogfood 全态 + console 零错误（36/36 + NO JS ERRORS）· **观感用户确认 ✅**（四页面逐页看过）· converge + 8 维重评 ③ **design 8 维重评 9.56 ≥9**（标准 4 + 深度 4；+0.25 = 正文与事实源逐行一致 + 三向同步 + 线框回写，非口径变化）④ 文档面：s1 记录出口表改 ✅ · 00 版本头 v1.19 + §5 M4a 行状态改 ✅ 完成 ⑤ **自检 文档 9.78**（代码 18 维 N/A——零代码改动） |
| v0.24 | 2026-09-11 | sunxuewen-rush | **T17-T26 整体审计修正 + 登记（用户 2026-09-11 批准）**：① **修正两处自产数字缺陷**（AI 写的数字 = 声明，须实测）——**F1** 阶段 1 `.module.css` 删除 **12 → 16**（实测 base 16 → HEAD 0；逐 Task 2+2+3+7+1+1；阶段 0 另删 10 ⇒ 生命周期 26）· **F2** §4.4 ⑦ 覆盖口径 **44 项 → 旧层 93 个自定义属性 / 表 15 行 / 29 个 token 名**（非注释行消费者 0）；修动面：design §8 + §4.4 ⑦ 注 + v0.23 行 · 本 plan 版本头/T24 断言/T26 块/v0.21 行 · `00` 三处（版本头 + §5 M4a 行 + 修订行）· s1 §2 ② **§3 表新增 20-24 登记**：空态调用点未归一（EmptyState 1 消费点 vs 详情页 3 处内联）· 4 个 export 无外部消费者（非死代码，T22 口径修正）· i18n 死键 `market.download`（`errors` 段 9 键经核实为**动态解析** ⇒ 静态扫描假报已澄清）· 9px 装饰字形（**旧层原值忠实迁移**，非本轮引入）· chip 三段类串跨 4 文件重复 ③ **审计结论**：代码 **9.62**（A 9.75×0.40 + B 9.63×0.30 + C 9.43×0.30）· 文档 **9.53**（标准 4 + 深度 4）——均 ≥9，扣分主因 = ①② ④ 版本头升 v0.24 |
