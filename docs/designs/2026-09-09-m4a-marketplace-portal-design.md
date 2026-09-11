# M4a 市场门户设计

> Date: 2026-09-09
> Updated: 2026-09-11（**v0.23：阶段 1 完成 + converge（plan T26）**——T17-T25 全部 ✅（详情页 / 中心页换皮 · design 正文语义回写 18 行 · 删旧层 · 五门禁 **475 例 474 pass / 1 skip / 0 fail** · dogfood **36/36 + NO JS ERRORS** · 用户观感确认 OK）→ 本文档**三向同步**（版本头 / 修订记录 / 引用 / 状态）+ **8 维重评 9.56**（标准 4 + 深度 4）；§4.2 目录树与 §4.4 ⑦ 状态随「旧层已删」同步；**v0.22：M4-pre 语义回写（plan T23）**——正文 **18 行**旧模型表述（`@ns` 坐标 / `/assets/:nsSlug/:slug` / `PUBLIC` 可见性维度 / 元信息卡「命名空间·可见性」列 / §9 线框 5 行）按扁平模型终态重写；§12 历史修订记录段保留旧表述（史实不改）；**v0.21：阶段 0 出口达成**——用户 2026-09-11 三判通过（**气质 / 密度 / 类型色 三项 OK**）→ §8「阶段 0 探针切片」的出口条件全部满足（三判 ✅ + 门禁全绿 ✅ + 回退面干净 ✅）；**评审控件已撤除**（`dev/ReviewControls.tsx` 删除 + `main.tsx` 两处引用移除，grep 断言 0）；阶段 1（剩余页换皮 + 17 处 M4-pre 语义回写）据此启动；**v0.20：统计条改「卡片形态 + 撑满 hero」**——5 项各一枚 tile（淡蓝底 `bg-secondary` #f0f5ff + 泛蓝细边 + `rounded-xl` 14px；数字 26px / 标签 13px），`w-full` + `flex-1` 等分 → 实测**行宽 1112px = hero 内容区 100%**、每枚 **213px 等宽**；**v0.19：去 hero 中间分割线**（`border-t border-border pt-6` 整组移除，hero 内水平分隔线候选归零，间距 44px）；**v0.18/v0.18b：hero 上下与侧栏浮层对齐 + 去硬编码**——`main` `pt-4 pb-9` → **`py-2`**（与侧栏 `p-2` gutter 同值，实测两侧面板均 `66 → 892`）；随后「撑满一屏」职责**上移到壳**（`main` `flex min-h-[calc(100vh-58px)] flex-col` + 页 `flex-1`）→ 消除派生和 `74`，只剩 `58` 一个常量；**v0.17：搜索栏加长 `max-w-[900px]` + 统计条「原生类型」→「用户数量」（含 `/api/stats` 新增 `totalUsers` 后端契约变更）**；**v0.16：hero 撑满一屏（卡自身 `min-h`）+ 删「进入技能中心」CTA + 统计条拆三族计数（技能/专家/MCP）**；**v0.15：首页精简为「纯 hero 落地页」（用户拍板 A：删「按类型探索」+「最新发布」，hero 撑满一屏居中，死链 CTA 删除）**；**v0.14：选型边界（对标 21-skillhub 三条纪律）+ 品牌渐变层（3 token 白名单，原「拒渐变」部分翻转）**；**v0.13：阶段 0 板块 C（T8-T12 首页换皮）落地回写**——六件重写 + `aih-theme.css` 增 `--animate-rise`；令牌 15 项运行时审计全中；hero 光斑/渐变归零；**坑⑥ 第二实例**（旧 `tokens.css` `--ava-*`/`--tint-*` 静默压过 AIH 值 → 已删并立「同名变量只住一层」纪律）；包体 JS → 563.6 kB（风险③ 累积）；**v0.12：侧栏收起/展开（shadcn `Sidebar` 原语接入）**——用户 2026-09-11 拍板「做，按推荐」：① §3 应用壳行补**侧栏可收起**（`SidebarTrigger` + `⌘B`/`Ctrl+B` + cookie 持久化 + <768px Sheet 抽屉）② §4.4 ③ sidebar 行改为**原语真值 + 4 处 AIH 覆盖**（展开宽 `204px` 覆盖官方 `16rem` · 图标态 `3rem` · 移动 `18rem` · 圆角 `2xl` 覆盖 floating `lg` · 定位 `top-[58px] bottom-0` 留在顶栏之下）③ §8 阶段 0 板块 2 登记为**阶段 0 增补**（起因与「一次做到位」理由入档）；**性质说明**：属结构/行为变更（非纯视觉），共享壳正在换皮故并入，M4b 控制台可直接复用；v0.11：阶段 0 实施回写（T1-T7 落地）——基建 + 共享壳四件已落仓并实测：① 坑清单 4→**6 条**（+⑤ CLI 生成物与本仓 biome 冲突 → 生成物目录规则例外 +⑥ **无层声明压过 Tailwind 全部工具类** → 旧层降级）；② T4 实测 `main` padding `0px`→`16/22/36`、`body` 底色→`#f8faff`（`global.css` 交出 reset/body 三属性）；③ T5-T7 实测（顶栏 58px·白底·`#e3eaf6` 细边·品牌实底 `#1447e6`；侧栏 204px·`#f6f9ff`·激活 `#eaf1fd`；语言控件**保 pill**（2026-09-11 用户拍板）选中实底 primary）；④ 登记：plan T6 断言的「<900px 图标态」在旧实现中**不存在**（无 `@media`）→ 按「结构零变更」不补；⑤ T3 断言措辞修正（产物压缩后为 `html[data-base=aih]`，引号被去）；v0.10：AIH blue 基色层（用户 2026-09-11 拍板）**——官方 7 个 base color 全为中性/暖中性（实测）→ **自建 blue 基色层**（15 值，与官方 neutral 逐项对照）+ **解耦纪律**（AIH 层独立文件、在官方生成块后 import；覆盖 theme 层的 `secondary`）；沙箱对照已验证（`:5199` 官方 ↔ AIH 一键切换，tsc 零错 + build 绿）；§4.4 ①/②/⑦ · §8 · §12 同步。**暗色档明确不做**（同轮拍板）；v0.9：视觉体系切换（用户 2026-09-11 拍板）——全站统一 **shadcn 蓝科技**：气质基线改「纯白底 + `#e5e5e5` 细边 + 单一 primary 蓝 + 极轻阴影」，毛玻璃 / 品牌渐变 / 氛围光斑 / 半像素字阶全部废弃；技术落法 = **真上 shadcn/ui**（Tailwind v4 + shadcn CLI，base=radix）；**§4.4 重写为全站视觉真值 SSOT**（色值/圆角轴/字阶/组件真值 + token 映射表 + AIH 补丁表）；§4.1 依赖换栈；§8 新增阶段 0 探针切片；§9 线框标注 / §10 引用 / §11 同步项 / §12 修订同步。**顺序翻转**：原 2026-09-10 拍板「先控制台面」→ 本次「先门户」（阶段 0 探针切片先行，理由见 §12 v0.9）；v0.8：claude-design 环节补走——slop 自检 3.5→1.5 的 polish 增量回写：类型入口卡 icon 左置 + 真实计数（R7）/ 最新发布行式升级（R5/R6 字段）/ 光斑 alpha≤0.1 / 字体栈 MiSans 优先 / 动效 posture 规范（rise stagger + lift + reduced-motion）/ 数字 tabular-nums——§4.4/§8/§12 更新）
> Status: 定稿·**视觉体系切换（v0.9，2026-09-11 用户批准定稿）**（v0.8 已于 2026-09-09 定稿并 converge：R1-R9 全部拍板 + 视觉环节收敛（风格板→demo→sketch→skillhub/GitHub 对标）+ grilling A-I 闭环 + 8 维重评 ≈9.3 ≥9 + 三族适用性实证）。**v0.9 定稿依据**：8 维自检 **9.31 ≥9** + 用户 2026-09-11 批准。**实现出口**（经 `docs/plans/M4a-visual-shadcn.md` 驱动）：阶段 0 探针切片交付 → 用户三判「气质 / 密度 / 类型色」→ 门禁全绿（typecheck/lint/format:check/build/test + SSR 冒烟）→ 剩余页换皮收尾（含 17 处 M4-pre 语义回写）→ converge 重评
> Scope: M4a（00 §5）——公开市场门户：类型化浏览（skill/mcp/agent）· 搜索（q + label 筛选）· 资产详情（内容体验：skill.md 正文/文件树浏览预览/版本历史与行级对比/latest 下载）· 资产**恒公开**（读面仅看 `status`，匿名可读） · zh/en 双语
> 引用链：本文档 → 规范 00 §2/§5/§7 · 01 §3 · 06 §2/§4/§5 · 07 全 · 08 §5/§7（引用不复制，字段与规则以规范为准）

## 1. 背景与文档定位

M0-M3 后端全部闭环（server 520 tests + typecheck 0 绿，HEAD 8761577）。M4 前端拆两子里程碑
（用户拍板）：**M4a 消费者视角公开门户先立，M4b 管理后台（审核队列 UI/标签管理/资产发布流）
后置并复用 M4a 组件基建**——发布/上传/审核 UI 一律不进 M4a（§2 边界）。

前置已就绪（代码实证）：apps/web 空壳基座（React 19 + Vite 6 + TS strict）；server 读面 API
（§5 实测契约表；错误 `{code,message}` 07 §4；camelCase）；资产匿名读/下载已成立（M4-pre 后**无可见性维度**，恒公开读面）；
packages/protocol zod 消费单源；GET /api/labels 公开含 displayName 回退链。

流程定位：design（R1-R9 决策档案 + 视觉拍板 v0.3-v0.7）→ 视觉环节（portal-ui-design 编排：
风格板 → demo 迭代 → sketch 卡片三变体 → 详情页 skillhub 对标 + GitHub diff 细节）→
8 维自检/grilling → 定稿 → M4a plan → 编码测试 → converge。被否决方案不写入（v0.2 起纪律）。

## 2. 里程碑范围（R1——已拍板锁定，v0.7 详情内容体验扩入）

**M4a 边界（消费者视角，全程可匿名，只读门户）**：
- 首页介绍页：**纯 hero 落地页**（**hero 卡撑满一屏**——v0.18b 起由**壳**承担（`main` 撑满 + 页 `flex-1`，
  页内禁自算 `calc(100vh - N)`）+ 内容垂直居中；**v0.15 起删**「按类型探索」与「最新发布」；v0.16 删
  「进入技能中心」CTA、统计条改三族计数；v0.17 搜索栏加长至 `max-w-[900px]`、统计条「原生类型」→
  「用户数量」；v0.18 hero 上下与侧栏浮层对齐（`main` `py-2`）；v0.19 去中间分割线；v0.20 统计条改
  **卡片形态 + 撑满 hero 内容区**）
- 类型化浏览：技能/mcp/专家 三中心页（类型即路由）——无任何发布/上传入口
- 搜索：首页 hero 全局搜索 + 中心页类型内搜索 + 标签筛选条（横置）
- **资产详情页（v0.7 内容体验扩入）**：
  - 总览 tab = **主文档 markdown 渲染 + manifest 摘要回退**（v0.7 分型：skill 族 SKILL.md
    必需；mcp/agent 族 README.md 可选——存在渲染、缺失回退 mcp.json/agent.md 结构化摘要；
    原「README 渲染后置」决定**翻转**——消费者阅读正文是详情页主体体验，但 mcp/agent 包
    无 README 时以 manifest 摘要兜底不空窗）
  - 文件 tab = **目录树（可折叠）+ 文件点击预览对话框**（文本预览，G7）
  - 版本 tab = 版本历史 + **行级版本对比**（双下拉 base⇄head + 变更文件导航 + 行级 unified diff，G8——skillhub 完整对标 + GitHub 视觉细节）
  - 右栏：下载 latest 卡 + 元信息卡（**作者 / 更新时间 / 累计下载**——v0.22 按实测渲染回写；M4-pre 后**无**「命名空间 / 可见性」两列）
- zh/en 双语（07 §2/§5）；标签/状态只读展示
- **含服务端最小支撑改动**：R4 匿名列表 / R5 展示字段 / R6 ownerDisplayName / R7 stats /
  R8 文件内容 / R9 版本 compare——见 §6（非纯前端）

**M4a out（后置，不混入）**：M4b（审核队列/标签管理/生命周期管理动作 UI + 资产发布流 +
真实登录——写操作与权限面；消费者只见状态徽章与标签展示）；M5 CLI；排序切换（下载/热度）；
社交面（star/评分/收藏）。

## 3. 页面结构与路由（R2——定案，v0.7 详情页更新）

五路由 + 状态 URL 化，类型即路由（TypeTabs 退役）：

```text
/                        首页（介绍）：**纯 hero 落地页**（v0.15）
/skills                  技能中心（type=skill：页头 + 搜索 + 筛选条 + 卡片网格）
/mcps                    MCP 中心（type=mcp 同构）
/agents                  专家中心（type=agent 同构）
/assets/:slug           资产详情：三 Tab（总览/文件/版本）+ 右栏下载·元信息
```

query：`?q=`/`?label=`（多值 OR）/`?page=`；版本 tab 对比对走组件内状态（URL 化可后置——
对比对为次要状态，M4a 保持组件内，share 语义弱）。路由库 react-router v7 ✓。

**中心页结构（v0.4 定稿）**：CenterHeader → 横置两级标签筛选条 → result-head → 4 列 × 5 行
卡片网格（20/页，对齐服务端默认 limit 20）→ 分页；响应式降列 <1200→3/<900→2。

**详情页结构（v0.7 定稿——skillhub 详情对标）**：
- 面包屑：首页 / 类型中心 / `slug`
- 头部：名称 + 标签行（**M4-pre 后无可见性 pill / @命名空间徽章**；作者只在右栏元信息卡）
- 主体宽版双栏：左主列三 Tab 卡（shadcn `Card`；总览/文件/版本）+ 右栏 320px 粘性（下载卡 + 元信息卡）
- 应用壳（AppShell，v0.3 定稿；**v0.12 增侧栏收起**）：顶栏通用（**左端为品牌字**，其右依次为**竖分隔** +
  **侧栏开合触发钮** `SidebarTrigger`，另支持快捷键 `⌘B`/`Ctrl+B`）+ 侧栏功能（**可收起为 48px 图标轨**，收起态悬停出 tooltip；状态 cookie 持久化；<768px 移动端
  自动为 Sheet 抽屉）+ 底部开源出口

## 4. 前端架构与组件树（R3——定案，v0.7 依赖破例 + 组件扩展）

### 4.1 依赖选型（v0.7 破例更新；v0.9 样式体系换栈）

**样式体系（v0.9 换栈——用户拍板「真上 shadcn/ui，一步到位省的返工」）**：`tailwindcss` v4 +
`@tailwindcss/vite` v4（**Vite 插件形态，不写 postcss 配置**）+ **shadcn CLI**（`style: new-york`，
`base=radix` 由 style 推导）。组件以**源码**形式落仓（`src/components/ui/shadcn/`——可自由改，不锁
`node_modules`）。运行期依赖增量：`class-variance-authority` · `cn`（shadcn 官方 `clsx+tailwind-merge`
替代包）· `radix-ui` · `lucide-react`（图标，ISC，沿用）· `sonner`（轻提示）· `next-themes`（暗色档）；
devDeps：`tw-animate-css` · `@types/node`。

**版本锚（2026-09-11 实装实测——`bun.lock` 锁定值）**：tailwindcss **4.3.3** · @tailwindcss/vite **4.3.3** ·
vite **6.4.3** · react / react-dom **19.3.0** · `cn` **0.2.6** · radix-ui **1.6.7** · sonner **2.0.8** ·
next-themes **0.4.6** · class-variance-authority **0.7.1** · lucide-react **1.44.0** · tw-animate-css
**1.4.0**；shadcn CLI **4.21.0**（`bunx` 实跑输出，非项目依赖，故不在 `bun.lock`）。落仓后以本仓
`bun.lock` 为准回填。

**六个坑（已实测定位根因，实施必带）**：
① `components.json` **禁写 `base` 字段**——CLI 的 `rawConfigSchema` 是 `.strict()` 且无该字段
（`00-ui` `packages/shadcn/src/registry/schema.ts:28-62`），base 由 style 推导（`utils/get-config.ts:320-326`）；
写了直接报 `Invalid configuration`（CLI 只回一句通用错误、不给 Zod 明细）→ 以 `shadcn info` 回显为准。
② `@import "tw-animate-css"` 需**自补装**（它是 CLI 的 devDep；手写 CSS 入口时必踩）——否则 build 报
`Can't resolve 'tw-animate-css'`。
③ **批量 `add` 必带 `--overwrite`**——遇「文件已存在」CLI 开交互提示，答不了则**后续 item 全部被吞**。
④ **用 CLI 装，禁手抄源码**——v4 组件 import `{ cn } from "cn"`（非 `@/lib/utils`），手抄缺该转换。
⑤ **CLI 装完必跑一次 `bun run format` + `bunx biome check --write`**（2026-09-11 T2 实测）——CLI 按
自身风格生成（双引号/无分号），与本仓 biome 配置冲突 → 不跑则 `format:check`（23 文件）与 `lint`
（16 处 `useImportType`）双红；**且官方源码会命中本仓 recommended 规则**（`suspicious/noDocumentCookie`
· `correctness/useExhaustiveDependencies` · `a11y/useFocusableInteractive|useSemanticElements|noRedundantRoles`）
→ 处置 = 根 `biome.json` 加**仅作用于 `apps/web/src/components/ui/shadcn/**` 的规则例外**（保持组件与
registry 一致 → 未来 `shadcn add --overwrite` 升级 diff 干净），**不手改官方源码**。
⑥ **无层声明压过一切层内声明**（CSS Cascade Layers；2026-09-11 T4 实测）——Tailwind 工具类住
`@layer utilities`，而换皮期并存的旧 CSS（`tokens.css`/`global.css`）**无 `@layer`** → 其 `* { margin:0;
padding:0 }` reset 与 `body { background/font/color }` 会**压掉全部 Tailwind 工具类**（实测 `main`
padding 计算值 `0px`，而 `.px-\[22px\]` 规则确实已生成且在 utilities 层内）。处置 = 旧层**降级为
「只保留 Tailwind 不提供的项」**：reset 交 Preflight（`box-sizing/margin/padding/border` 等价）、
`body` 三属性交 Tailwind base（`bg-background`/`text-foreground`/`--font-sans`），旧层只留
`font-smoothing`/`min-height`/滚动条/玻璃工具类/`keyframes`。**纪律：换皮期内旧 CSS 不得再引入任何
与工具类同属性的无层声明**（否则该属性静默失效）。
**第二实例（2026-09-11 T10 实测，同根因）**：AIH 层与 `tokens.css` 的 `:root` **同特异性**时，**源序**决定
胜负（`tokens.css` 后 import）→ 旧 `--ava-1..8` 渐变**静默压过** AIH 实底值（头像实测仍渲染
`linear-gradient(...)`），`--tint-skill|mcp|agent` 同病。**处置 + 纪律**：同名变量只允许在**一层**声明——
AIH 语义补丁（`--ava-*` / `--tint-*` / `--type-*` / `--success` / `--warning`）**只住 `aih-theme.css`**，
旧 `tokens.css` 内**禁声明同名变量**（已就地写明）；基色层走属性选择器（0,1,1）不受此限。

**选型边界（v0.14 新增——用户 2026-09-11 拍板「对标 21-skillhub 使用 shadcn」）**

对标对象 = 兄弟项目 `21-skillhub`（**实测**：`AGENTS.md:464` 明文「shadcn/ui is NOT used as a library —
only Radix primitives + utility composition」；`web/src/shared/ui/` 10 件**全部为交互件** · 引用 **249 处** ·
**零死件**；`web/src/shared/components/` 承接手搓展示件）。据此立**三条纪律**：

① **只有交互件装原生、展示件手搓**——skillhub 手搓 `empty-state`/`pagination`/`namespace-badge`/
   `skeleton-loader`/`confirm-dialog`；本仓手搓 `EmptyState`/`Pagination`/`Badge`/`Spinner`/`AssetAvatar`
   → **已事实对齐**，存量手搓件**不换**原生。
② **新装件必须当场用上**——skillhub 10 装 10 用；本仓 22 装 7 用。**存量 16 个零引用件不卸**：
   M4b 控制台 design 实测用件频次（`label` 24 · `table` 11 · `dialog` 16 · `badge` 8 · `select` 7 ·
   `sonner` 5 · `switch` 3 · `avatar` 3 · `textarea` 1 · `tabs` 1）证明其属「**还没轮到**」而非「多余」；
   卸掉 → M4b 重装 = 净负收益。今后**不得先囤后用**。
③ **需要 AIH 特有变体时就地「只增不改」加 cva variant 并配一件 `.test`**——skillhub 把
   `bg-brand-gradient` 写进 `button.tsx` 的 cva，并以 `button.test.ts` 断言变体 class 契约。
   **本仓现状（实测）**：`apps/web` **零测试文件 + `package.json` 无 test script**，且 §4.4 ② 明文
   「组件源码零改动」→ 本条与 ② 存在张力（「零改动」vs「只增不改」）。**登记为待拍板项**：启用需同时定
   ① 是否给 `apps/web` 引入测试基建 ② §4.4 ② 措辞是否放宽为「**既有变体零改动**，AIH 新增变体允许
   就地追加」。**未拍板前：一切定制走 token 层 / 任意值，不碰 `components/ui/shadcn/**`。**

**不采纳项（skillhub 的形态差异，非优劣）**：`tailwindcss` v3.4 + `style: "default"` +
`hsl(var(--x))`（本仓 v4 + `new-york` + `oklch`/`@theme inline`，不回退）· 暗色全套（本仓已定不做）·
组件落点 `shared/ui`（本仓 `components/ui/shadcn/`，已解决 `Badge.tsx`/`badge.tsx` 大小写碰撞）·
两边**都无 `registries` 配置**（同吃默认官方 registry，天然一致）。

**第七个坑（2026-09-11 v0.16/v0.17 实测——**flex 容器内 `mx-auto` 令子项退化为 fit-content**）**：
容器由 block 改 `flex flex-col` 后，子项的 `mx-auto`（交叉轴 auto margin）会**吸收剩余空间** → 该项宽度
退化为 **fit-content**，`max-w-[Npx]` 只封顶、不再撑开。实证：hero 卡 v0.16 转 `flex flex-col` 后，
搜索行 `mx-auto max-w-[700px]` 实测仅 **248px**（输入框 180px）——观感「搜索栏太小气」的**真因**（非设计值问题）。
**处置/纪律**：flex 容器内凡「居中 + 限宽」的子项**必须显式 `w-full`**（`mx-auto w-full max-w-[Npx]`）；
改父容器 display 时须复测子项**实测宽度**（不能只看类名）。

**其余依赖不变（v0.7 破例的两条保留）**：**react-router-dom**（路由）+ **react-markdown + remark-gfm**
（skill.md 正文渲染——skillhub 同构 markdown 方案；GFM 表格/列表）。行级 diff **零库**：hunks 由服务端
G8/G9 计算返回（skillhub 同构 server 侧）。数据 `useApi` 自研；i18n 自研；类型消费 `packages/protocol`；
图标 lucide 系 ISC。

**双栈共存期（v0.9 明确边界；v0.11 补降级纪律）**：换皮期间**新面走 Tailwind/shadcn、未换页保持
`.module.css`**；剩余页换完即删 CSS Modules 与 `tokens.css`（删除前照 §4.4 ⑦ 映射表逐项迁移）。
测试/门禁不因换栈改变口径。**降级纪律（坑⑥，实测驱动）**：旧层 CSS **无 `@layer`** ⇒ 无层声明优先于
一切层内声明，会压掉 Tailwind 全部工具类 → 旧层须降级为「**只保留 Tailwind 不提供的项**」，且换皮期内
不得再引入与工具类同属性的无层声明（否则该属性静默失效）。

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
│   │   ├── Hero.tsx（`TypeEntryCard.tsx` 于 v0.15 随首页精简删除）
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
└── styles/  aih-theme.css（AIH 层：语义补丁 / 基色 / 品牌渐变 / 动效 / 旧层迁移面）
    ⤷ 旧 `tokens.css` / `global.css` 已于 **T24 删除**；`src/index.css` = 样式**单入口**（Tailwind v4 + tw-animate-css + 官方 token 层 → `@import` AIH 层）
```

复用边界：ui/ 跨面（M4b 直接消费——FileTree/FilePreviewDialog/MarkdownRenderer/AssetAvatar
等）；market/detail 面专属（VersionCompare 及 Diff 组件，审核侧若需行级 diff M4b 再升 ui）。

### 4.3 规模预估（v0.7 更新；v0.9 影响注记）

五路由 + ~24 组件 + 4 hook（+content/compare api 面）+ 2 i18n 资源 + markdown 样式
≈ 3200-3800 行（含样式），单文件 ≤200 行。

**v0.9 影响**：ui/ 原子层改由 **shadcn 源码承接**（22 组件落仓 `components/ui/shadcn/`），自写原子件
净减；换皮本身是**逐件重写**（26 个 `.module.css` → Tailwind 类）——总行数的净变化在**阶段 0 结束后
实测回填**（不预估）。

### 4.4 视觉体系与 tokens（v0.9 重写——**全站视觉真值 SSOT**）

> **本节 = 全站视觉真值单一源**：M4b 控制台面 design 只**引用**本节（其 §10.1 仅记控制台特有形态：
> 表格密度 / 抽屉宽），色值与字阶一律不复制（引用不复制，防漂移）。
> **拍板依据**：2026-09-11 用户拍板——全站统一 **shadcn 蓝科技**；技术落法 = **真上 shadcn/ui**
> （Tailwind v4 + shadcn CLI，`base=radix`）——原话「一步到位，省的返工」。
> **顺序**：门户先行（阶段 0 探针切片 → 三判 → 剩余页）→ 再 M4b；相对 2026-09-10「先控制台面」的翻转见 §12 v0.9。
> **出处（可回查）**：`00-ui`（shadcn/ui 官方仓 fork）`apps/v4/app/globals.css:99-141`（neutral 基色 + 圆角轴）·
> `apps/v4/registry/themes.ts:556-575`（blue preset light/dark）· CLI 实装组件源码（换皮落仓后以本仓
> `src/components/ui/shadcn/**` 为准）。

**气质基线（v0.10 起）**：**淡蓝底 `#f8faff` + 泛蓝细边 `#e3eaf6` + 白卡 `#ffffff`** + 单一 primary 蓝
+ 极轻阴影 + 底色变化型 hover。

**废弃（v0.3-v0.8 旧语法，实现期一律清除）**：毛玻璃 `--glass-*` · 品牌渐变 `--grad-*` · 氛围光斑
（hero halo）· 半像素字阶（10.5/11.5/12.5/13.5/14.5/15.5）· 蓝色投影 `--shadow-card/--shadow-btn` ·
hover 位移 -3px · 遮罩 blur。

**① 色彩 token —— 两层结构：基色层（**AIH 自建**）+ 主题层（官方 blue preset 原值）**

**（1）基色层 = AIH blue（自建 base color）**——官方 7 个 base color（Neutral/Stone/Zinc/Mauve/Olive/
Mist/Taupe）**全为中性/暖中性、无蓝调**（2026-09-11 实测确认），故自建：与官方 neutral 逐项对照
（左官方值 / 右 AIH 值；`--destructive` 不变——语义色不属基色）：

| token | 官方 neutral | **AIH blue** | 说明 |
|-------|-------------|-------------|------|
| `--background` | #ffffff | **#f8faff** | 淡蓝底（M4a `--bg #f4f8ff` 同族收敛，略提白给白卡留对比） |
| `--foreground` | #000000 | **#0f172a** | M4a `--ink` 原值（slate-900，比纯黑柔和） |
| `--card` / `--popover` | #ffffff | **#ffffff**（不变） | **白卡浮在淡蓝底上**——观感核心 |
| `--card-foreground` / `--popover-foreground` | #000000 | **#0f172a** | 同 foreground |
| `--secondary` / `--secondary-foreground` | #f4f4f5 / oklch(0.21 0.006 285.885) | **#f0f5ff** / **#0f172a** | 淡蓝中性面（**覆盖 theme 层的同名值**，见下注） |
| `--muted` / `--muted-foreground` | #f5f5f5 / #737373 | **#f1f5fb** / **#64748b** | 表头/次要面（slate-500） |
| `--accent` / `--accent-foreground` | #f5f5f5 / oklch(0.205 0 0) | **#eaf1fd** / **#0f172a** | hover/选中底（比 muted 深一档蓝） |
| `--border` / `--input` | #e5e5e5 | **#e3eaf6** | 泛蓝细边（M4a `--line-soft rgba(37,99,235,.10)` 实底等价） |
| `--ring` | #a1a1a1 | **#3b82f6** | 焦点环走品牌蓝（组件用 `ring-ring/50` → 50% 蓝） |
| `--sidebar` / `--sidebar-foreground` | #fafafa / #000000 | **#f6f9ff** / **#0f172a** | 侧栏比页面更浅一档（层级感） |
| `--sidebar-accent` / `-foreground` | #f5f5f5 / oklch(0.205 0 0) | **#eaf1fd** / **#0f172a** | 侧栏选中底 |
| `--sidebar-border` / `--sidebar-ring` | #e5e5e5 / #a1a1a1 | **#e3eaf6** / **#3b82f6** | 同 border / ring |

> **覆盖机制说明**：官方 blue preset **也**定义 `--secondary`/`--secondary-foreground`
> （`themes.ts:556-575`）→ AIH 基色层用 **属性选择器 `html[data-base="aih"]`**（特异性 0,1,1）压过
> 官方 `:root`（0,1,0），**与声明顺序无关**；AIH 层**禁写 `:root` 覆盖值**（那才会退化成顺序依赖）。

**（2）主题层 = 官方 blue preset（原值照抄）**

| token | 值 | 出处 |
|-------|-----|------|
| `--primary` / `--primary-foreground` | `oklch(0.488 0.243 264.376)` = **#1447e6** / `oklch(0.97 0.014 254.604)` = #eff6ff | themes.ts:556 |
| `--sidebar-primary` / `-foreground` | `oklch(0.546 0.245 262.881)` = **#155dfc** / `oklch(0.97 0.014 254.604)` | themes.ts:556 |
| `chart-1..5` | `#8ec5ff` `#2b7fff` `#155dfc` `#1447e6` `#193cb8` | themes.ts:556 |
| `--destructive` | `oklch(0.577 0.245 27.325)` = **#e7000b** | globals.css:115 |

> **暗色档 = 明确不做**（2026-09-11 用户拍板：不做亮/暗切换）——`.dark` 变量段可保留备用，
> **UI 不提供开关**；组件内 28 处 `dark:` 变体不生效（无害）。将来若要启用，需另立规格：
> AIH 补丁层的暗色值 + diff 内容色暗色档（GitHub 亮色系浅底在暗底不成立）。

**② AIH token 补丁（shadcn 官方无此语义；2026-09-11 用户拍板登记为 AIH 补丁）**

| 补丁 token | 值 | 语义 |
|-----------|-----|------|
| `--success` / `--success-foreground` | `oklch(0.627 0.17 149.2)`≈#16a34a / #f0fdf4 | 资产 ACTIVE · 版本 PUBLISHED · 审核通过 |
| `--warning` / `--warning-foreground` | `oklch(0.666 0.157 58.3)`≈#d97706 / #fffbeb | 资产 HIDDEN · 版本 PENDING_REVIEW · 待处理 |
| `--type-skill` / `--type-mcp` / `--type-agent` | #2563eb / #0e7490 / #6d28d9 | **类型色相沿用 v0.3**（AIH 原生语义） |
| `--tint-skill` / `--tint-mcp` / `--tint-agent` | `rgba(37,99,235,.10)` / `rgba(14,116,144,.10)` / `rgba(109,40,217,.10)` | 类型衬底（tile 底 / 悬停底） |
| `--ava-1..8`（**实底**，hash→色序不变） | #f59e0b #0891b2 #7c3aed #0ea5e9 #e11d48 #6366f1 #2563eb #059669 | 由 v0.6 渐变改实底（去渐变、色相不变） |

- **官方依据与姿势**：shadcn 文档「Adding New Tokens」——**值与其 `@theme inline` 映射同文件、紧邻
  成对**（`:root { --warning: … }` → `@theme inline { --color-warning: var(--warning) }` → 即可
  `bg-warning`）；Tailwind v4 会收集**被 `@import` 文件**里的 `@theme`（本仓实测：AIH 文件独立持映射时
  `bg-success` / `bg-ava-*` 工具类照常生成）——**标准姿势，非私有 hack**
- **落位（v0.10 修正版）**：**AIH 层 = `src/styles/aih-theme.css`，映射 + 值成对同文件**（新增 AIH token
  只改这一处）；**官方层 = `src/index.css` 单入口**，只含官方内容（可被 `shadcn apply --preset` 安全
  重写），由它 `@import` AIH 层
- **覆盖机制 = 选择器特异性，不依赖声明顺序**：基色层走 `html[data-base="aih"]`（0,1,1）压过官方
  `:root`（0,1,0）；**AIH 层禁写 `:root` 覆盖值** —— **组件源码零改动**（变量层解耦，沙箱对照 +
  本仓 `@theme inline` 编译实证）

**②bis 品牌渐变（v0.14 新增——用户 2026-09-11 拍板「我们的主题也需要蓝色渐变」；原 v0.9
「拒玻璃/渐变」在此项上**部分翻转**）**

| 渐变 token | 值 | 落点 |
|-----------|-----|------|
| `--gradient-brand` | `linear-gradient(96deg, #1447e6 0%, #2563eb 46%, #3b82f6 100%)` | 品牌字：顶栏 `AI X Hub` + hero 96px 主标（`bg-clip-text` + `text-transparent`） |
| `--gradient-cta` | `linear-gradient(180deg, #2563eb 0%, #1447e6 100%)` | 主 CTA 按钮（叠在 `bg-primary` 之上保实底兜底；`hover:brightness-[1.07]` 保 hover 反馈） |
| `--gradient-page` | `linear-gradient(180deg, #f8faff 0%, #eff4ff 100%)` | 页面底（`background-attachment: fixed` 随视口不随滚动） |

- **消费方式**：`bg-[image:var(--gradient-*)]`（Tailwind v4 任意值）——**不注册 `@theme` 映射**
  （避免与 `--color-*` 生成的 `bg-*` 工具类撞命名空间）；**值只住 `aih-theme.css`**，组件内不得出现
  裸渐变字面量。
- **白名单 = 上表 3 个**；换皮范围内**不得**出现其它 `linear-gradient`（plan T13 断言口径据此修正）。
- **页面底渐变的层位**：写进 AIH 层的 `@layer base`（`html[data-base="aih"] body`，0,1,2 压过官方层
  base 的 `body` 0,0,1）——**层内规则** ⇒ 仍可被 utilities 覆盖，**不违反坑⑥「旧层禁无层声明」纪律**。
- **不翻转项（明确保持废弃）**：毛玻璃 `backdrop-filter` · 氛围光斑（`bg-glow` 节点 / hero
  `::before/::after`）· 类型色 tile 与头像仍**实底**（渐变只回品牌字 / 主 CTA / 页面底三处）。
- **与 skillhub 的范式差异（登记）**：skillhub 的 `bg-brand-gradient` 是**组件 cva 变体**（就地改
  `button.tsx` + 配 test）；本仓走 **token 层 + 任意值消费**（组件源码零改动）。是否允许「只增不改」
  就地加 AIH 变体 → 见 §4.1 选型边界 ③（**待拍板**）。

- **类型 icon tile**：44px · 圆角 13px（沿用 v0.8，AIH 值不成轴）· **实底类型色**（白图标 22px）
  ——替代 v0.8 的 44px 渐变 tile；
  入口卡其余结构（icon 左置横向 grid / col1 跨行 / 真实计数 R7 / hover 箭头）沿用 v0.8。
- **状态语义映射**：资产 `ACTIVE=success` / `HIDDEN=warning` / `ARCHIVED=muted-foreground`；版本八态完整
  映射归 M4b（控制台 `StatusPill`）；门户侧只渲染 PUBLISHED / YANKED 徽章（success / destructive）。
- **diff 内容色不并入 UI 语义色（语义修正）**：行级 diff 沿用 GitHub 视觉系（新增 #1a7f37 / 底 #e6ffec ·
  删除 #cf222e / 底 #ffebe9）——它是**代码内容渲染色**，与 UI 语义色（`--destructive` #e7000b、`--success`）
  分工不同；合一会同时损坏两处语义。

**③ 组件真值（CLI 实装照抄，new-york / radix）**

| 组件 | 关键值 |
|------|--------|
| table | 表头 `h-10 px-2 text-sm font-medium`（40px）· 单元格 `p-2` · 行 `border-b hover:bg-muted/50` |
| button | default `h-9 px-4` · sm `h-8 px-3` · lg `h-10 px-6` · icon `size-9` · `rounded-md` · 焦点 `ring-[3px]` |
| input / select | `h-9 px-3 rounded-md border-input shadow-xs` |
| badge | `rounded-full px-2 py-0.5 text-xs`（变体 default/secondary/destructive/outline/ghost/link） |
| card | `rounded-xl bg-card py-6 shadow-sm`（内容 `px-6`） |
| dialog / sheet | 遮罩 `bg-black/50`（**无 blur**）· dialog `rounded-lg p-6 sm:max-w-lg` · sheet 右滑 `w-3/4 sm:max-w-sm` |
| sidebar | **AIH 采用 shadcn `Sidebar` 原语**（`collapsible="icon"` + `variant="floating"`，2026-09-11 用户拍板）：展开宽 **AIH 覆盖 `204px`**（`--sidebar-width`；官方默认 `16rem`/256px）· 图标态 `3rem`(48px) · 移动 Sheet `18rem` · 面板圆角 **AIH `2xl`(18px)**（覆盖官方 floating `lg`10px）· 定位 **覆盖 `top-[58px] bottom-0`**（留在 58px 顶栏之下，保 §3「顶栏通用」布局） |
| skeleton | `animate-pulse rounded-md bg-accent` |

**④ 圆角轴**：`--radius: 0.625rem`(10px) → sm 6 · md 8 · lg 10 · xl 14 · 2xl 18（globals.css:100）

**⑤ 字阶（实测口径：`tokens.css` **定义 23 档** / 代码**实际使用 19 档** → 收敛为 **9 档**；Tailwind
`@theme` 为载体）**——v0.8 的半像素档在 Tailwind 体系里是噪音：

| 新档 | 合并的旧档（实测使用值） | 用途 |
|------|------------------------|------|
| `text-[11px]` | 10.5 / 11 / 11.5 | 辅助 mono、徽章内字 |
| `text-xs` 12 | 12 / 12.5 | 元信息、表格列头 |
| `text-[13px]` | 13 / 13.5 | 卡片描述、正文小档 |
| `text-sm` 14 | 14 / 14.5 / 15 / 15.5 | 正文、按钮 |
| `text-base` 16 | 16 / 17 | 小标题 |
| `text-lg` 18 | 18 / 19 | 区块标题 |
| `text-xl` 20 | 21（降 1px 归位） | 页标题小档 |
| `text-[22px]` | 22 / 23 | 页标题 |
| `text-2xl` 24 | 24 | 页标题大档 |
| hero 主标 `--fs-hero` 96px（`tokens.css:92`） | — | **实底 primary**（替 v0.8 渐变大字） |

> 收敛后轴 = 11 / 12 / 13 / 14 / 16 / 18 / 20 / 22 / 24（其中 20 档暂无来源、留作备位）；
> 未使用的旧档（10 / 16.5 / 25 / 26）随文件删除，不再迁移。

**⑥ 阴影 / 动效 / 字体栈 / 滚动条（在新体系下继续有效）**
- 阴影：卡 `shadow-sm` · 浮层 `shadow-lg`（取消蓝色投影）
- 动效：`prefers-reduced-motion: reduce` 全关（沿用 v0.8）；hover = **底色变化**（`bg-muted/50`），不做位移/阴影升
- 字体栈：不变——`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'MiSans', 'Segoe UI', …`（内网零外字体）
- 滚动条：6px 细滚动条沿用（值迁入 `@theme`）；顶栏高 `58px`（AIH 值，保持 v0.8 不变）
- 数字 `font-variant-numeric: tabular-nums`（统计/计数/下载量对齐，沿用 v0.8）
- **壳几何（v0.18/v0.18b 定值）**：`AppShell` `main` = `flex min-h-[calc(100vh-58px)] min-w-0 flex-1 flex-col
  px-[22px] py-2` —— 纵向内边距 **`py-2`（8/8）** 与侧栏浮层面板的 `p-2` gutter 同值（实测两侧面板与
  hero 卡均 `top 66 → bottom 892`，h 826 @1440×900）；**「撑满一屏」由壳承担**（`main` 撑满 + 页面用
  `flex-1` 顶满）——**页内禁自算 `calc(100vh - N)` 派生和**（顶栏高或 gutter 一改即静默错位且不报错），
  现只剩 `58` 一个常量。**副作用（已登记）**：未换皮的中心页 / 详情页顶部间距 16 → 8、底部 36 → 8
  （原值非为浮层侧栏设计，一并对齐）。**移动端 `100vh` 不做**（用户 2026-09-11「先不用考虑移动端」，
  不引 `svh`/`dvh`）。
- **统计 tile（v0.20 真值——手搓展示件，非 shadcn 件）**：tile = `min-w-[96px] flex-1 rounded-xl
  border border-border bg-secondary px-4 py-4`（淡蓝底 + 泛蓝细边 + 圆角 14px）；数字
  `text-[26px] font-bold tracking-[-0.5px] tabular-nums` + 标签 `text-[13px] font-medium text-muted-foreground`；
  行容器 = `mt-11 flex w-full flex-wrap justify-center gap-3`（**等分铺满 hero 内容区**，实测
  5×213px / 间距 12px / tile 高 90px @1440×900）。**中间无分割线**（v0.19）。

**⑦ token 映射表（旧 → 新；迁移期照抄，换完即删旧文件）** —— ✅ **T24 已执行**：`src/styles/tokens.css` + `global.css` 已整体删除（样式单入口 = `index.css` + `aih-theme.css`）；表内 44 项旧 token **真实消费者 = 0**（实测，2026-09-11）

| 旧 token（`tokens.css`） | 新 | 处置 |
|---|---|---|
| `--brand` #2563eb | `--primary` | 替换 |
| `--brand-2` / `--brand-3` | — | **删**（渐变源） |
| `--ink` #0f172a | `--foreground` **#0f172a** | 替换（同值，柔和墨色） |
| `--text-2` #475569 · `--text-3` #94a3b8 | `--muted-foreground` **#64748b** | 合并（slate-500，AIH blue 基色档） |
| `--bg` #f4f8ff | `--background` **#f8faff** | 替换（浅蓝底 → AIH blue 基色的淡蓝底） |
| `--glass*` / `--grad*` / `--topbar-bg` / `--topbar-blur` | — | **删** |
| `--line-faint` / `--line-soft` / `--line-strong` | `--border` **#e3eaf6** / `--border` #e3eaf6 / `--ring` **#3b82f6** | 合并（泛蓝细边 + 品牌蓝焦点环） |
| `--ring-focus` | `--ring` | 替换 |
| `--shadow-card` / `--shadow-pop` / `--shadow-btn` | `shadow-sm` / `shadow-lg` / — | 替换 / 删 |
| `--tint-row` | `bg-muted/50` | 替换 |
| `--c-skill/mcp/agent` | `--type-skill/mcp/agent` | 改名 |
| `--ava-1..8`（渐变） | `--ava-1..8`（实底） | 去渐变 |
| `--fs-*`（实测定义 23 档 / 实用 19 档） | ⑤ 字阶表 9 档 | 收敛 |
| `--font-sans` / `--font-mono` | `@theme --font-sans/--font-mono` | 同值迁入 |
| `--topbar-h` 58px | 保留 | 不变 |

**⑧ 阶段 0 出口条件**：见 §8（用户三判 + 门禁全绿）——通过后按本节执行剩余页换皮。

## 5. API 消费面（实测契约 + 缺口处置 R4-R9）

### 5.1 读面端点实测表（v0.7：+G7/G8 呈请后定案）

labels（扁平含 parentId 可组树）/ assets（q·label 多值·type·limit≤100 默认 20·
offset·默认 updated_at desc）/ assets 详情（assetItem+labels）/ versions（曾公开族全见）/
version 详情 / download（302/200；YANKED 400；限流 429）——全匿名（R4 后列表）。stats（R7）。
错误 `{code,message}`。**R8/R9 新增端点见 §5.2 契约形状（定案）**。

### 5.2 契约缺口与处置（R4-R9 全部定案）

- **G1 匿名列表断点** → R4：GET /api/assets 撤 requireAuth + 列表恒 `status = ACTIVE` 面
  （`assets/service.ts:170-177` 实证：`conditions = [eq(asset.status, 'ACTIVE')]`；与 viewer 身份
  **无关**——M4-pre 删可见性后无 viewer 输入，匿名 / 登录 / 管理档列表一致）
- **G2/G3 列表展示字段/latest 版本** → R5：assetItem 补 latestVersion/latestName/
  latestDescription（join latest_version_id）
- **G4 排序参数** → 撤销后置：默认 updated_at desc 实测满足首页最新发布
- **G6 首页统计条** → R7：GET /api/stats 公开聚合——`{totalAssets, totalDownloads,
  typeCounts: Record<AssetType, number>, totalUsers}`（协议类型枚举驱动动态键）；资产侧聚合语义同
  匿名列表面（**仅 `status = ACTIVE`**，HIDDEN/ARCHIVED 不计——防泄露）；**v0.17 增 `totalUsers`**
  （口径 `user_account.status = 'ACTIVE'`，排除 PENDING/DISABLED；**与资产侧不同层**——用户规模是注册量
  而非「公开内容派生量」，属**主动披露项**，2026-09-11 用户拍板在首页展示「用户数量」）
- **G5 作者展示** → R6：assetItem 补 ownerDisplayName（join user_account.displayName——05 §3.1
  实证 LDAP 建号 userId=sAMAccountName 映射（工号）+ displayName 同步）；卡片/详情脚注渲染
  「displayName · userId」当 userId 为工号形态（非 `usr_` 前缀）；本地账号只显姓名
- **G7 单文件内容读取** → **R8（v0.7 定案）**：GET /assets/:ns/:slug/versions/:version/
  files/:path（path URL 编码，含目录分隔）→ 200 `{path, size, binary, truncated, content?}`
  （文本文件 content + truncated 阈值截断；二进制 binary=true 无 content——预览 UI 区分提示）。
  服务端从版本存储按 path 取单文件（**T1 实证定案：assetFile 逐文件顺存 + storageKey 直读——
  db 参数化查 (versionId,filePath) uq 列 → ObjectStorage.get(storageKey)，零解压**；
  显式 `..` 先拒 400；fileSize 先行判定截断；contentType + utf8 试解码判 binary）。
  **总览主文档按族解析（v0.7 补——族协议实证 docs/02/03/04）**：skill 族主文档 = SKILL.md
  （必需，root）；mcp/agent 族 = README.md（可选）——存在则渲染 markdown，不存在则前端回退
  manifest 结构化摘要（mcp.json/agent.md 字段卡）；总览组件按 type 分型取主文档 path
- **G8 版本行级对比** → **R9（v0.7 定案——用户拍板 M4a 即要行级 diff）**：
  GET /assets/:ns/:slug/versions/compare?from=&to= → `{ files: [{ path, changeType:
  ADDED|MODIFIED|DELETED, binary, hunks?: [{ lines: [{type: ADD|DELETE|CONTEXT,
  oldLineNumber, newLineNumber, content}] }] }] }`——服务端 diff 计算（文本文件行级 hunks，
  skillhub 同构），前端零 diff 库；二进制/截断标注。目录聚合为清单级（dir 项不入行 diff）
- 匿名/安全：R8/R9 均在公开读面（资产**恒公开**；非 ACTIVE 治理访问仅 SUPER_ADMIN——M4-pre D6），YANKED 版本 400（同下载语义）

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

- R4：GET /api/assets 撤 requireAuth + 列表恒 `status = ACTIVE` 面（与 viewer 身份无关——M4-pre 删可见性；登录态零变化）
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
- **首页 v0.15（2026-09-11 用户拍板 A）**：首页精简为**纯 hero 落地页**——删「按类型探索」（连带删
  `TypeEntryCard.tsx` 与其 8 个独有 i18n 键）与「最新发布」（连带删首页 `fetchAssetList` 消费及
  该区 Skeleton/ErrorState 三态）；hero 改**撑满一屏垂直居中**（`min-h-[calc(100vh-110px)]`，
  110 = 顶栏 58 + `main` 上下 padding 52）；原 hero 第二枚 CTA「了解资产类型」锚点 `#explore-types`
  随区块失效 → **整枚删除**；§3 / §4.2 / §9 同轮回写
- **首页 v0.16（2026-09-11 用户拍板，三项）**：① **hero 卡撑满浏览器**——`min-h-[calc(100vh-110px)]`
  由 `Home` 包装层**下移到 `Hero` 自身**（+ `flex flex-col justify-center` 内容卡内垂直居中），
  实测 1440×900：卡高 **790px** = 900 − 110（top 74 / bottom 864）、`document.documentElement.scrollHeight`
  = 900 ⇒ **恰好一屏、无纵向滚动条** ② **「进入技能中心」CTA 整枚删除**（`browseMarket` 键随删、
  `Link` 导入移除）——删后 `main` 内 `<a>` 数为 **0** ③ **统计条：「资产总数」拆分为
  「技能总数 / 专家总数 / MCP 总数」**（源 = R7 `stats.typeCounts` 枚举驱动键，顺序按用户给定
  技能→专家→MCP；实测 `3 / 0 / 1`）；「累计下载」「原生类型」**按原样保留**（用户未要求改动，
  ⚠ 若嫌 5 项拥挤或「原生类型 3」与三族计数重复，可再删）；`Home.tsx` 随之退化为直接
  `return <Hero />`（包装层不再需要）
- **首页 v0.17（2026-09-11 用户拍板）**：搜索行 `max-w-[700px]` → **`max-w-[900px]`**；统计条「原生类型」→
  「用户数量」（`/api/stats` 新增 `totalUsers`，口径 `user_account.status = 'ACTIVE'`——契约与披露见 §5.2 G6）
- **首页 v0.18/v0.18b（2026-09-11 用户拍板「hero 上下需与 sidebar 上下一致」）**：`AppShell` `main` 纵向
  内边距 `pt-4 pb-9`（16/36）→ **`py-2`（8/8）**，与侧栏浮层面板 `p-2` gutter 同值 → 实测 hero 卡与侧栏
  面板**同为 `top 66 → bottom 892`**（h 826 @1440×900，错位消除）；随后**去硬编码**：撑满职责由
  「Hero 自算 `100vh-74`（= 58 + 8×2 派生和）」上移为「**壳撑满 + 页 `flex-1`**」（`main` 加
  `flex min-h-[calc(100vh-58px)] flex-col`）——几何零变化（三档视口复验同值），只剩 `58` 一个常量；
  **副作用登记**：未换皮的中心页 / 详情页顶部间距 16 → 8、底部 36 → 8
- **首页 v0.19（2026-09-11 用户拍板）**：**去 hero 中间分割线**——统计条上方 `border-t border-border pt-6`
  整组移除（`pt-6` 依附该线存在）；实测 `borderTopWidth 0px` + 全 hero 子树扫描**水平分隔线候选 = 0**，
  搜索行 → 统计条间距 **44px**（`mt-11`）。**保留**顶栏「品牌字 ↕ 侧栏触发钮」的**竖**分隔（不同层，见 §4.4 ③）
- **首页 v0.20（2026-09-11 用户拍板）**：**统计条改「卡片形态 + 宽度撑满 hero」**——5 项各一枚 tile
  （淡蓝底 `bg-secondary` #f0f5ff + 泛蓝细边 `border-border` + `rounded-xl` 14px；数字 26px 粗体 +
  标签 13px `muted-foreground`）；行容器 `w-full` + `flex-1` 等分 → 实测**行宽 1112px = hero 内容区
  100%（左右 flush 0/0）**、5 枚**各 213px 等宽**、间距 12px（对照搜索行 900px，统计行明显更宽）；
  按 §4.1 纪律 1 **手搓展示件**（不引 `ui/shadcn/card`：默认白底在 hero 白卡内不可见 + 24px 内距过重，
  且 §4.4 ② 组件源码零改动）——`card.tsx` 留待 M4b
- **详情页（v0.7）**：头部（名 + 标签行）→ 双栏（三 Tab 主列 + 320px 右栏
  下载卡/元信息卡）；总览 = skill.md markdown 正文；文件 = 折叠树 + 预览对话框；版本 =
  历史 + 双下拉行级对比（GitHub 细节：文件头 +N−M/折叠、行号双列、行色 #1a7f37/#cf222e）
  ——**头部与元信息卡已按 M4-pre 终态回写（v0.22）**：无可见性 pill / @命名空间徽章；
  元信息卡 = 作者 / 更新时间 / 累计下载
- 类型色体系/品牌显示名（AI X Hub，00 D2 同步待定）/滚动条：沿用 v0.3（**色值口径以 v0.9 §4.4 为准**——
  类型色相不变、渐变改实底）
- 语义修正记录（**v0.22 按扁平模型重写**）：作者 = `ownerDisplayName`·`userId` 归元信息卡
  （05 §3.1）。**原 v0.7 记录的另两条已于 M4-pre 整体失效**——「@命名空间 ≠ 作者」随坐标改全局
  唯一裸 `slug` 失效（命名空间维度删除）、「PUBLIC = 可见性独立维度」随可见性字段删除失效
  （资产恒公开；读面仅看 `status`）。回写清单见 §11

- **阶段 1 换皮完成（v0.23，2026-09-11）**：详情页（三 Tab 卡 / 右栏 · 总览 markdown · 文件树 + 预览 + 嵌套预览 · 版本对比 + 行级 diff）· 中心页（页头 + 计数 + 搜索 + 筛选条 + 4×5 网格）全量 Tailwind 化 ⇒ `.module.css` 存量 **12 → 0** · 4 个共享原子件（`Badge`/`Spinner`/`EmptyState`/`ErrorState`）随 T20 增补归一 · T24 删旧层（双栈共存期结束）· 五门禁 + 全态冒烟（13 态）+ 观感用户确认 ✅；硬证据见 `docs/smoke/2026-09-11-m4a-visual-s1.md`（11 张 `s1-*.png`）。**视觉体系切换（阶段 0 + 阶段 1）至此完成**，共享壳与 token 体系可供 M4b 直接生长（无混搭期）

**阶段 0 探针切片（v0.9 新增——用户 2026-09-11 拍板「先看效果再全量」）**

切片范围 = 三块（先看效果，不一次换 26 个 CSS Modules）：

1. **基建落仓**：`tailwindcss` v4 + `@tailwindcss/vite`（Vite 插件，不写 postcss）· shadcn CLI 落
   `components.json`（`style: new-york`，**禁写 `base` 字段**——CLI schema `.strict()` 无该字段）·
   样式入口（`@import "tailwindcss"` + `@import "tw-animate-css"` + `@theme inline` + `:root` token，
   值取 §4.4）· `vite.config.ts` alias `@` · `tsconfig.json` paths ·
   **shadcn 组件落仓目录 `src/components/ui/shadcn/`**——避开与既有 PascalCase 原子件的**大小写碰撞**
   （`badge.tsx` vs `Badge.tsx`、`pagination.tsx` vs `Pagination.tsx`：APFS 大小写不敏感 +
   `git core.ignorecase=true` 下是**同一路径**）
   ＋ **AIH 层文件** `src/styles/aih-theme.css`（基色层 + 补丁层，**独立文件、官方生成块后 import**——
   解耦纪律见 §4.4 ②；断言：组件源码零改动）
2. **共享壳换皮**：`AppShell` · `TopBar` · `SideNav` · `LanguageSwitcher` 四件——壳是门户与控制台
   **共用**的，先换壳才能消掉 M4b 的混搭期（原「只换控制台面」在物理上不成立）；**其中 `SideNav` 接入
   shadcn `Sidebar` 原语**（收起/展开：`collapsible="icon"` 图标轨 + `SidebarTrigger`/`⌘B` + cookie 持久化 +
   移动端 Sheet）——2026-09-11 用户拍板「做，按推荐」（起因：用户提出「点一下收起、再点展开」，虽属结构/
   行为变更、超出「纯视觉」原始范围，但共享壳此刻正在换皮，一次做到位优于日后返工，故作**阶段 0 增补**）
3. **首页换皮**：`Home` · `Hero` · `AssetCard` · `Pagination` 四件（`TypeEntryCard` 于 v0.15 随
   首页精简删除）——气质判断的
   决定性页面（白底细边单蓝 vs 玻璃渐变，全在此页可见）

交付与出口：
- 交付：真实站点可点（真数据）· 换皮前后对照截图 · 本机浏览器观感**由用户人工确认**（实现侧沙箱
  无法亲验渲染：Edge headless 不稳 → 硬证据只有 `tsc` + `vite build` + `dev` 200 三层）
- **出口 = 用户三判「气质 / 密度 / 类型色」全部 OK**（**✅ 2026-09-11 达成**——用户结论「现在看起来 OK」，
  三项均通过）→ 继续剩余页换皮；不 OK → 调 §4.4 token 后复看；
  回退面 = 壳 + 首页 + 基建（干净）
- 评审控件（阶段 0 期间用于逐页对比的临时开关）→ **出口后撤除**，不留进终态
  ——**✅ 已撤除（2026-09-11 三判通过后）**：删 `apps/web/src/dev/ReviewControls.tsx`（`git rm`）+
  `main.tsx` 两处引用（import + 渲染守卫）；断言 `grep -rn 'ReviewControls' apps/web/src` = **0**；
  生产包 marker 复核仍全 **0**（该控件全程 `import.meta.env.DEV` 双守卫，生产从未进包）
- 门禁：typecheck / lint / format:check / build / test（全量）+ SSR 渲染冒烟（沿用 M4a 既有脚本）。
  换皮是**视觉变更**、行为契约不变——测试红 = 越界信号，须查根因，不调测试

## 9. 线框图（v0.3-v0.7；示意数据非设计硬值）

首页（**纯 hero 落地页**——v0.18b：**hero 卡撑满一屏**（撑满由壳承担：`main` + 页 `flex-1`；实测 826px
@1440×900 = 900 − 顶栏 58 − `main` 上下 padding 16）+ 内容垂直居中；「按类型探索」「最新发布」
「进入技能中心」CTA 均已删；v0.19 无中间分割线；v0.20 统计条 = 撑满内容区的 5 枚淡蓝 tile）：

```text
┌ AI X Hub                                   🌐 中|EN    [👤 登录] ┐
│ ⌂首页 ✦技能中心 3 ⚙MCP中心 1 ◈专家中心 0   ★ GitHub…            │
├──────────────────────────────────────────────────────────────────┤
│ （hero 白卡撑满：视口 900 − 顶栏 58 − main 上下 padding 16 = 826） │
│                                                                  │
│                 AI X Hub（主标 96px 蓝渐变）                     │
│             发现和分享AI资源（24px 主句）                        │
│         使用AI X Hub构建强大的AI Agent（18px 灰）                │
│        [ 🔍 搜索技能、MCP、Agent…            ] [搜索]            │
│                    （间距 44px，无分割线）                        │
│  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐              │
│  │   3    ││   0    ││   1    ││ 1,502  ││   6    │  ← 5×213px   │
│  │技能总数││专家总数││MCP 总数││累计下载││用户数量│    等分撑满   │
│  └────────┘└────────┘└────────┘└────────┘└────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

中心页（技能中心示意；MCP/专家同构——筛选条上移 + 4×5 网格）：

```text
│ ✦ 技能中心 Skill Center                     [🔍搜…] [5,203]     │
│ 可复用 agent 技能包…                                            │
│ 标签筛选: [全部][检索类●][开发类][数据类]  [rag●][embedding]…    │
│ 共 N 个技能                         排序：最近更新 ↓             │
│ ┌──────┐┌──────┐┌──────┐┌──────┐                               │
│ │◼L 卡片名││…    ││…     ││…     │   （4 列 × 5 行 = 20 卡/页）  │
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
│ 首页 / 技能中心 / langgraph-rag                          │
│ LangGraph RAG 检索技能                                   │
│ #rag #official #retrieval                                │
│ ┌ Tab 卡（shadcn Card）─────────────────┬ 右栏 320px ────┐│
│ │ [总览●][文件][版本]                   │ 下载卡：        ││
│ │ skill.md v1.3.2·Apache-2.0…meta条    │ ⬇下载 latest    ││
│ │ # LangGraph RAG 检索技能             │ v1.3.2（主按钮）││
│ │ > 引言…  ## 特性 - 列表… 代码块       │ 1.3.2.zip·318KB ││
│ │ 文件: [▼reference/] [SKILL.md→弹预览]│ 60次/分限流      ││
│ │ 版本: [双下拉 base⇄head]             │ ────────────────││
│ │  SKILL.md MOD +2−1 ▼ 行级diff…       │ 元信息卡：      ││
│ │  [左导航:文件+徽章] [右行级diff区]     │ 作者 林晓峰·882015││
│ │                                     │ 更新时间 09-10   ││
│ │                                     │ 累计下载 1,502   ││
│ └─────────────────────────────────────┴──────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## 10. 引用文件清单

- 规范：00 §2/§5/§7 · 01 §3/§6 · 06 §2.3/§4 · 07 全 · 08 §5/§7
- 代码：apps/server http/assets.ts · assets/service.ts · assets/version-read.ts ·
  http/labels.ts · labels/service.ts · db/schema/users.ts · packages/protocol/src
- 视觉参照（公开）：**shadcn/ui**（v4，MIT；本机对照仓 `00-ui` = 官方仓 fork）——语义 token 与组件
  真值源（`apps/v4/app/globals.css` · `apps/v4/registry/themes.ts` · CLI 实装组件）；skillhub
  （Apache-2.0）——首页/卡/详情页形态、skill-version-compare 双下拉 + 文件导航 + 行级 diff、
  FileTree 折叠、MarkdownRenderer；GitHub commit diff 视觉（文件头 +N−M/行号双列/行色）——
  用户指定参照 commit 8761577
- 图标：lucide（ISC）；MCP 官方标识（mcp 造型 Clean Room 自绘）
- 流程：`portal-ui-design`（编排）+ `shadcn-ui-project`（消费侧：CLI 装法 / 四个坑 / 组件真值表）
  · 原 `sketch`（v0.4 卡片三变体）已收口
- 评审物料（不进仓，`/tmp` 会丢）：阶段 0 落仓后**以本仓代码为准**——`/tmp/m4b-shadcn-spike`
  （shadcn 真身 9 视图 + 评审控件，dev :5199；技术可行性实证）· `/tmp/m4a-styleboards/demo-m4a.html`
  （v0.8 玻璃版对照基准）+ `cd-polish-home.html`

## 11. 规范同步项

- 00 §5：M4 行注记拆 M4a/M4b（收尾时）
- 00 §3 D2：UI 显示名 AI X Hub 走视觉；正式定名确认后同步（定稿评审确认）
- 07：navigation 组首期文案 + 详情 tab 文案（总览/文件/版本）demo 拍板；agent 中文「专家」
- 05：R6 实证 §3.1 已覆盖 displayName 同步，无需变更；ownerDisplayName 为读面投影
- 01/02-04：族协议主文档名（skill.md 及 mcp/agent 对应主文档）——G7 path 约定 plan 实证后
  如需规范表述回写族协议
- 卡片/tokens/diff 视觉不进规范层（实现细节，tokens.css → v0.9 起迁入 Tailwind `@theme`；**T24 后 tokens 面单点收敛于 `styles/aih-theme.css`**）
- ✅ **M2 design 失效标注（T26，表 15）**：`2026-09-08-m2-asset-domain-design` 头部已加失效标注行（坐标 / 可见性 / nsSlug / 空间角色随 M4-pre 失效；正文按史实不改）
- ✅ **旧层文件引用三处修正（T26，表 16）**：本文件 §4.2 目录树 · m4b design 两处 `tokens.css` 复用点 → `styles/aih-theme.css`
- **视觉 token 无规范层归属**（`07` 实测无 token / 视觉章节，2026-09-11 核）：tokens 真值住 design 层
  §4.4（本仓惯例）→ §4.4 ② 的 AIH 补丁（success/warning/类型色）**不加规范同步行**
- ✅ **M4a design 的 M4-pre 语义回写（v0.9 发现 → v0.22 已执行 = plan T23）**：正文 **18 行**旧模型
  表述已按扁平模型终态重写——`@ns` 坐标 / `/assets/:nsSlug/:slug` / `PUBLIC` 可见性维度 /
  元信息卡「命名空间 · 可见性」两列 / §9 线框图 5 行（卡片 `@ns` · 面包屑 `@ns/slug` ·
  头部 `[PUBLIC] [@ns]` · 元信息卡 2 行）。**v0.9 登记的「17 处」系当时 grep 清单且行号已漂移**，
  本轮按「自产量化声明铁律」**重新实测** = **18 行**（多出 §9 面包屑行）。
  事实源 = `2026-09-10-flat-model-refactor-design`（坐标裸 `slug` · 可见性整体删除 · 非 ACTIVE
  治理访问仅 SUPER_ADMIN = D6）；服务端实证 = `http/assets.ts` `listQuerySchema` 无 `nsSlug` ·
  `assets/service.ts:170-177` 列表 `conditions = [eq(asset.status, 'ACTIVE')]` 与 viewer 无关；
  前端实证 = `pages/AssetDetail.tsx`（面包屑「首页 / 类型中心 / slug」· 头部「名称 + 标签行」·
  元信息卡）+ `i18n/zh.ts:52-54`（作者 / 更新时间 / 累计下载）。
  **§12 修订记录段保留旧表述（史实不改）**。
  ⚠ **顺带发现（登记，未改）**：`apps/server/src/http/assets.ts:285` 行内注释仍写
  `GET /api/assets/{ns}/{slug}（T3：详情——PUBLIC 匿名可读）`——**注释腐化**（同 M4-pre F17 一类），
  属**代码注释**（非 design 范围）→ 建议随 **T24 删旧层**同批清（届时一次改完，避免零散提交）

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
| **v0.10** | 2026-09-11 | sunxuewen-rush | **AIH blue 基色层（用户拍板）**：① **事实**：官方 7 个 base color（Neutral/Stone/Zinc/Mauve/Olive/Mist/Taupe）全为中性/暖中性，**无蓝调**（实测）→ 需求「更多蓝」在官方 preset 里无旋钮 ② **决策**：**自建 AIH blue 基色层**（15 值：淡蓝底 `#f8faff` / 泛蓝边 `#e3eaf6` / 白卡不变 / accent `#eaf1fd` / 侧栏 `#f6f9ff` / focus ring `#3b82f6` / 墨色 `#0f172a`），与官方 neutral 逐项对照入档；Theme 层仍用**官方 blue preset 原值**（`#1447e6`）→ §4.4 ① 重构为**两层结构**（基色层 + 主题层）③ **解耦纪律**：AIH 层独立成文件、官方生成块**之后** import（防 `shadcn apply` 覆盖 + 保覆盖顺序；含覆盖 theme 层 `--secondary`），**组件源码零改动**——沙箱对照已验证（`:5199` 官方↔AIH 一键切换、tsc 零错、build 绿）④ **暗色档明确不做**（同轮拍板：不做亮/暗切换；`.dark` 段保留备用、UI 不开口）⑤ 官方依据补录：shadcn 文档「Adding New Tokens」= 我们补丁层做法的官方标准姿势（② 新增两条纪律 bullet）⑥ §4.4 ⑦ 映射表目标值更新（`--bg`→#f8faff / `--line-*`→#e3eaf6+#3b82f6 / `--text-2·3`→#64748b）· §8 阶段 0 基色层落位 · 头部 Updated 同步 ⑦ 备注：**值基线定死，落地后按真站点观感微调**（用户 2026-09-11） |
| **v0.9** | 2026-09-11 | sunxuewen-rush | **视觉体系切换（用户拍板）——shadcn 蓝科技落地**：① **气质级变更**：v0.3 起的「蓝色科技风 + 毛玻璃 + 品牌渐变」整体废弃（毛玻璃/渐变/光斑/蓝色投影/hover 位移/遮罩 blur/半像素字阶全清）→ 纯白底 + `#e5e5e5` 细边 + 单一 primary 蓝 `#1447e6` + 极轻阴影 ② **§4.4 重写为全站视觉真值 SSOT**：语义色 token 全规格（含出处行号）+ **AIH token 补丁表**（`--success`/`--warning`/类型色——shadcn 官方仅 destructive，2026-09-11 拍板登记）+ 组件真值表 + 圆角轴 + 字阶收敛（实测定义 23 档 / 实用 19 档 → 9 档）+ **token 映射表**（旧 `tokens.css` → 新，迁移照抄）③ 类型色处理：**保留三类型色相、渐变改实底**（依用户「拒玻璃/渐变」偏好），头像 8 色板同步去渐变 ④ **语义修正**：diff 内容色（GitHub 系 #1a7f37/#cf222e）**不并入** UI 语义色（`--destructive` #e7000b）——分工不同 ⑤ §4.1 依赖换栈（Tailwind v4 + shadcn CLI + `cn` 等 6 包）+ **四个 CLI 坑**（禁写 base / tw-animate-css 自补 / 批量 add 带 --overwrite / 禁手抄源码）+ 双栈共存期边界 ⑥ §8 新增 **阶段 0 探针切片**（基建 + 共享壳 4 件 + 首页 5 件；出口 = 用户三判「气质/密度/类型色」）；**顺序翻转**：原 2026-09-10 拍板「先控制台面」→ 本次「先门户」——理由：共享壳（AppShell/TopBar/SideNav）为门户与控制台共用，先换壳可消除 M4b 混搭期；且门户的类型色/卡片/hero 是 shadcn 体系里最难落的一块（前置解决），M4b 亦可在已实证体系上生长 ⑦ §10 引用（+shadcn/ui 与 00-ui 真值源、流程 +shadcn-ui-project）/ §11（token 无规范层归属；**登记发现：本文件 17 处 `@ns`/`PUBLIC` 旧模型残留（§1/§3/§5.1-5.3/§8/§9）需按 M4-pre 回写**——处置：阶段 0 收尾同轮回写，用户 2026-09-11 定）/ §12 同步 ⑧ 技术可行性实证：沙箱 spike（CLI 4.21.0 + tailwind 4.3.3 + vite 6.4.3，22 组件，tsc 零错 + build 绿），**浏览器观感由用户人工确认**（沙箱无法亲验渲染） |
| **v0.11** | 2026-09-11 | sunxuewen-rush | **阶段 0 实施回写（计划 T1-T7 落地）**：① **坑清单 4 → 6 条**——⑤ CLI 生成物按自身风格生成（双引号/无分号），与本仓 biome 冲突 → 装完必跑 `format` + `check --write`，且官方源码命中本仓 recommended 规则（`noDocumentCookie`/`useExhaustiveDependencies`/a11y×3）→ 根 `biome.json` 加**仅作用 `components/ui/shadcn/**` 的规则例外**（保与 registry 一致，升级 diff 干净；不手改官方源码）；⑥ **无层声明压过一切层内声明**（CSS Cascade Layers）——旧 `tokens.css`/`global.css` 无 `@layer` ⇒ 其 `* { margin/padding }` reset 与 `body { background/font/color }` 压掉**全部 Tailwind 工具类**（实测 `main` padding 计算值 `0px`）→ 旧层**降级为「只保留 Tailwind 不提供的项」**（reset 交 Preflight、body 三属性交 Tailwind base）② §4.1 双栈共存期补**降级纪律**（换皮期内旧层不得再引入与工具类同属性的无层声明）③ **实测登记**：T4 后 `main` padding `0px→16px 22px 36px`、`body` 底色 `rgb(244,248,255)→rgb(248,250,255)`（=AIH 淡蓝底），产物含 `html[data-base=aih]` 基色块 + `--success` + Preflight + 工具类；T5 顶栏（58px / 白底 / `#e3eaf6` 下边 / 品牌实底 primary / 无 `backdrop-filter`）、T6 侧栏（204px / `#f6f9ff` / 激活 `#eaf1fd` / 5 条目）、T7 语言控件（2 钮 / `aria-pressed` / `localStorage aih.uiLang` 持久化 + 重载复现）④ **报告面**：单入口与浏览器观感仍由用户人工确认（本轮沙箱真浏览器已可读渲染与计算值，但**观感**不作实现侧断言）⑤ 登记项：plan T6 断言的「<900px 图标态」在旧实现中不存在（`SideNav.module.css` 零 `@media`）→ 按结构零变更不补；语言控件形态**保 pill**（2026-09-11 用户拍板；plan T7 原措辞 DropdownMenu 与「纯视觉变更」纪律冲突，以纪律为准） |
| **v0.12** | 2026-09-11 | sunxuewen-rush | **侧栏收起/展开 —— 接入 shadcn `Sidebar` 原语（用户拍板「做，按推荐」）**：① **需求**：用户 2026-09-11 提出「点一下收起、再点一下展开」；核实 **shadcn 原生支持**（`apps/web/src/components/ui/shadcn/sidebar.tsx` 696 行已于 T2 落仓；`collapsible="icon"\|"offcanvas"\|"none"` + `SidebarProvider/SidebarTrigger/SidebarRail/useSidebar` + cookie `sidebar_state` 7 天 + `⌘B`/`Ctrl+B` + 移动端 Sheet）② **拍板四项**（用户「按推荐」）：档位 = **`icon`**（收起保留图标轨，导航不消失）· 展开宽 **保持 204px**（覆盖 `--sidebar-width`，不引入额外汇度变化）· 触发钮 = **顶栏左端**（品牌字前）+ `⌘B`/`Ctrl+B` · 移动端 **要** Sheet 抽屉 ③ **性质**：结构 + 行为变更（非纯视觉）——`SidebarProvider` 包裹 AppShell、侧栏内容重构为 `SidebarMenu*`、`useLocation` 判定激活（替代 NavLink 渲染函数）；因共享壳正在换皮、M4b 控制台要复用同壳，作**阶段 0 增补** ④ §3 应用壳行 / §4.4 ③ sidebar 行 / §8 板块 2 同步 ⑤ **AIH 覆盖清单**（4 处，均入 §4.4 ③）：展开宽 204px · 图标态 48px · 面板圆角 2xl(18px)（覆盖 floating 的 lg 10px）· 定位 `top-[58px] bottom-0`（留在 58px 顶栏之下，保「顶栏通用」）⑥ 导航条目 / 路由 / 计数逻辑**零变更** |
| **v0.13** | 2026-09-11 | sunxuewen-rush | **阶段 0 板块 C（T8-T12 首页换皮）落地回写**：① 六件重写（`Hero`/`Home`/`TypeEntryCard`/`AssetCard`/`AssetAvatar`/`Pagination`）+ 删 6 个 `.module.css` + 新增 dev-only `ReviewControls`（出口后删）② `aih-theme.css` 增 `--animate-rise` 与 keyframes（原住 `global.css`，收尾删旧层后由 AIH 层自持）③ **实测审计**：令牌 15 项逐值命中 §4.4；hero 光斑/渐变归零（`::before/::after` 均 none）；搜索框按 shadcn 真值 **36px**；tile 44/13/#2563eb；卡 r14 + 白底；头像实底；分页 h32；三态齐；评审控件**不进生产包** ④ **坑⑥ 第二实例（实测驱动）**：旧 `tokens.css` `:root` 的 `--ava-1..8` 渐变**静默压过** AIH 实底值（头像仍渐变）→ 处置 = 从旧层**删除** `--ava-*`/`--tint-*` 并立「同名变量只住一层」纪律（§4.1 坑⑥ 已扩写）⑤ 包体 JS 474.6 → 563.6 kB（卡/头像/分页换 shadcn 原语；**已知风险③ 大包体**累积，阶段 1 评估 code-split） |
| **v0.14** | 2026-09-11 | sunxuewen-rush | **选型边界 + 品牌渐变（两项用户拍板）**：① **选型边界（「对标 21-skillhub 使用 shadcn」）**——对标实测（`AGENTS.md:464` 明文「非库、只 Radix 原语 + 工具组合」；10 件全交互件 / 249 处引用 / 零死件；展示件在 `shared/components/` 手搓）→ 立三条纪律：**① 只有交互件装原生、展示件手搓**（本仓已事实对齐）**② 新装件必须当场用上**（存量 16 个零引用件**不卸**——M4b 实测用件频次证明属「还没轮到」）**③ 需 AIH 特有变体时就地「只增不改」加 cva variant + 配 test**（与 §4.4 ②「组件源码零改动」存在张力 → **登记为待拍板项**；未拍板前不碰 `components/ui/shadcn/**`）；不采纳项 = v3.4/`hsl()` 代差 · 暗色 · 组件落点 · 两边都无 `registries`（天然一致）② **品牌渐变（原 v0.9「拒玻璃/渐变」部分翻转）**——§4.4 新增 **②bis 品牌渐变态**（3 token 白名单：`--gradient-brand` / `--gradient-cta` / `--gradient-page`，值住 `aih-theme.css`，消费走 `bg-[image:var(--gradient-*)]` 任意值不注册 `@theme` 映射）；页面底走 AIH 层 `@layer base`（**层内** ⇒ 不违反坑⑥ 无层声明纪律）；**光斑/毛玻璃/类型色与头像实底仍保持废弃** ③ plan T13 断言口径同步修正（`linear-gradient` 由「零残留」改为「仅白名单 3 token」）④ 代码落点 = `aih-theme.css`（token）· `TopBar.tsx`（品牌字）· `Hero.tsx`（主标 + 2 枚主 CTA），其余零改动 |
| **v0.15** | 2026-09-11 | sunxuewen-rush | **首页精简为「纯 hero 落地页」（用户拍板 A）**——**IA 变更（非换皮）**：① **用户提案**「首页上只保留 hero，其他的都去掉」→ 逐项列代价后拍板 **A**（删「按类型探索」+「最新发布」；hero 撑满一屏垂直居中）② **落地**：`Home.tsx` **110 → 30 行**（仅 `fetchStats` + `<Hero>`）；删 `components/market/TypeEntryCard.tsx`（残留引用 0）；删 i18n 独有键 **8 个**（zh/en 同步）；`centerTitle*`/`centerDesc*` 被 CenterPage/AssetDetail 共用→**保留** ③ **撑满一屏为配套必须项**：`min-h-[calc(100vh-110px)]` + 垂直居中（110 = 顶栏 58 + `main` padding 16+36）——不做则 hero 卡下留 ~280px 空白 = 观感「页面没做完」 ④ **死链处置**：hero 第二枚 CTA「了解资产类型」锚点 `#explore-types` 随区块失效 → **整枚删除**，不另指定向 ⑤ **冒烟同步**（`m4a-dogfood.ts`）：删「最新发布含 demo」；「统计 资产总数」去 `最新发布` 条件；新增**负向断言**（首页仅 hero）+ **死链断言**（`a[href="#explore-types"] === null`）；「入口 href 三中心」改名「三中心 href 可达（侧栏导航）」 ⑥ 决策依据：hero 内已有「搜索 + 进入技能中心 + 三项真实统计」⇒「怎么进去」「库里有多少」均由 hero 承担；被删两块的计数与 hero 统计语义重复，独有价值仅「三族一句话解释」与「内容新鲜度」（用户判定可舍） ⑦ §3 / §4.2 组件树 / §8 UI 变动总览 / §9 线框图 同轮回写 |
| **v0.16** | 2026-09-11 | sunxuewen-rush | **hero 撑满一屏 + 删 CTA + 统计条拆三族计数（用户拍板三项）**：① **hero 卡撑满浏览器**——`min-h-[calc(100vh-110px)]` 从 `Home` 包装层**下移到 `Hero` 自身** + `flex flex-col justify-center`（内容卡内居中；`py-12` 仅作短视口留白下限）；实测 1440×900 卡高 **790px**（= 900 − 110：顶栏 58 + `main` `pt-4` 16 + `pb-9` 36）、卡内 top **74** / bottom **864**、`scrollHeight` = **900** ⇒ 恰好一屏**无纵向滚动条**；`Home.tsx` 退化为 `return <Hero />` ② **「进入技能中心」CTA 整枚删除**（`browseMarket` i18n 键随删、`Link` 导入移除）——实测 `main` 内 `<a>` 数 **0** ✓ ③ **「资产总数」拆分为「技能总数 / 专家总数 / MCP 总数」**（数据源 R7 `stats.typeCounts`，顺序按用户给定；实测 **3 / 0 / 1**），同排「累计下载」「原生类型」**按原样保留**（用户未要求改动；已登记冗余提示）→ 统计条实现改为 `statsItems` 数组驱动（`value: null` 时渲染 `—`）④ 冒烟断言同步：「首页统计 资产总数」→「首页统计 三族计数」 |
| **v0.17** | 2026-09-11 | sunxuewen-rush | **搜索栏加长 + 「原生类型」→「用户数量」（用户拍板；含后端契约变更）**：① **搜索栏加长**——Hero 搜索行 `max-w-[700px]` → **`max-w-[900px]`**（用户参考 google.com 宽度观感；输入框行内 `flex-1` 随行宽放大；高度仍按 §4.4 真值 `h-9` 36px 不变）② **「原生类型」删除 → 换「用户数量」**：`statTypes`（原硬编码 3）删、新增 `statUsers`；**后端契约变更** = `apps/server/src/assets/stats.ts` 加 `totalUsers`（`count(*) from user_account where status = 'ACTIVE'`，与资产查询 `Promise.all` 并行）+ `apps/server/src/http/stats.test.ts` 增**口径断言**（baseline 后建 2 ACTIVE + 1 DISABLED ⇒ 增量必须 = 2，锁死「仅 ACTIVE 计入」）；**不动 `packages/protocol`**（实测 stats 形状不在协议包——仅 server `PublicStats` 与 web `StatsResponse` 两处镜像）；前端同步 `api/types.ts` / `Hero.tsx` / i18n zh+en ③ **口径披露**：`status = 'ACTIVE'` 由实现侧选定（1 行谓词可切全量）；用户规模**不属于**资产侧「防泄露」的「公开内容派生量」→ 属**主动披露项**（用户拍板展示）④ 实测：`curl localhost:3000/api/stats` → `{"totalAssets":4,"totalDownloads":1502,"typeCounts":{"skill":3,"mcp":1},"totalUsers":6}`（`bun --watch` 自动重载 ✓）⑤ ⚠ **后端改动须跑测试**（按纪律需 DB 授权） |
| **v0.18** | 2026-09-11 | sunxuewen-rush | **hero 上下与侧栏浮层对齐 + 撑满职责上移到壳（用户拍板「hero 的上下需要和 sidebar 上下一致」）**：① **实测错位**——侧栏浮层面板 `66 → 892`（h 826）vs hero `74 → 864`（h 790）；根因 = `AppShell` `main` 纵向内边距 `pt-4 pb-9`（16/36）是**换皮前旧值**，未随「浮层侧栏自带 `p-2`（8px）gutter」更新 ② 处置：`main` → **`py-2`（8/8）** + `Hero` `min-h` `100vh-110` → `100vh-74` → 复验 **`aligned: true`**（两侧均 `66 → 892`） ③ **副作用登记**：未换皮的中心页 / 详情页顶部 16 → 8、底部 36 → 8（一并对齐） ④ **v0.18b 去硬编码（同轮）**：`74` 是「顶栏 58 + gutter 8×2」的**派生和**（顶栏或 gutter 一改即静默错位且不报错）→ 撑满职责**上移到壳**（`main` 加 `flex min-h-[calc(100vh-58px)] flex-col`、`Hero` 改 **`flex-1`**）；几何零变化（1440×900 / 1920×1080 / 1366×768 实测同值），**只剩 `58` 一个常量** ⑤ **分辨率矩阵 13 档实测**：对齐全成立；标题三档 96/72/52 + 搜索框收缩 + 统计条换行 + 极矮视口（1366×500）优雅降级出滚动条不裁切 ⑥ **登记待定**：**大屏留白**（1440×560 空白 1% → 1440×900 42% → 2560×1440 **65%**）——用户 2026-09-11「先这样」暂停；**移动端 `100vh` 不做**（用户「先不用考虑移动端」，不引 `svh`/`dvh`） |
| **v0.19** | 2026-09-11 | sunxuewen-rush | **去 hero 中间分割线（用户拍板）**：① **对象** = 统计条上方的 `border-t border-border pt-6`（hero 内唯一纯水平分隔线）② **处置** = **整组移除**（`pt-6` 是依附该线存在的内边距，一并去掉）→ 间距由 `mt-11`（44px）承担 ③ **实测**：统计条 `borderTopWidth 0px` / `paddingTop 0px`；**全 hero 子树扫描「只有上下边框、无左右边框」的元素 = 0 个**（分隔线归零）；搜索行 → 统计条间距 **44px**（原 68 = 44 + 24）；统计条高 82 → **57px** ④ **不变**：顶栏「品牌字 ↕ 侧栏触发钮」之间的**竖**分隔保留（不同层，出处见 v0.12 / §4.4 ③） |
| **v0.20** | 2026-09-11 | sunxuewen-rush | **统计条改「卡片形态 + 宽度撑满 hero」（用户拍板）**：① **形态** = 每项一枚 tile：`min-w-[96px] flex-1 rounded-xl border border-border bg-secondary px-4 py-4`（**淡蓝底 #f0f5ff + 泛蓝细边 #e3eaf6 + 圆角 14px**，与 §4.4 ①（1）基色层同源）；数字 `text-[26px] font-bold tabular-nums` + 标签 `text-[13px] text-muted-foreground`；行容器 `mt-11 flex w-full flex-wrap justify-center gap-3` ② **实测（1440×900）**：**行宽 1112px = hero 内容区 100%**（左右 flush **0 / 0**）、5 枚**各 213px 等宽**、间距 12px、tile 高 90px；对照搜索行 **900px** ⇒ 统计行真正「撑满」 ③ **实现选择（§4.1 纪律 1）**：**手搓展示件**，不引 `ui/shadcn/card`——其默认白底在 hero 白卡内不可见、`py-6` 24px 内距过重（需多处覆盖），且受 §4.4 ②「组件源码零改动」约束；`card.tsx` 留 M4b ④ 门禁 4/4 绿（typecheck/lint/format:check/build）+ T13 渐变白名单复核（组件层裸 `linear-gradient` **0 处**） |
| **v0.21** | 2026-09-11 | sunxuewen-rush | **阶段 0 出口达成（三判通过 + 撤控件）**：① **用户三判 ✅**——气质 / 密度 / 类型色 **三项 OK**（真站点 + 真数据逐页看；观感判据由用户给）；② **评审控件撤除**——`git rm apps/web/src/dev/ReviewControls.tsx` + `main.tsx` 两处引用（import + 渲染守卫），`grep -rn 'ReviewControls' apps/web/src` = **0**；浏览器复核：`★ 评审` 钮消失、hero 与 5 枚统计 tile 正常渲染；撤后门禁复跑全绿（`format:check` 212 文件）+ 生产包 marker 仍全 **0**；③ §8「阶段 0 探针切片」出口三条件全部满足（三判 ✅ / 门禁 ✅ / 回退面干净 ✅）→ **阶段 1 启动**（范围 = §8 剩余页换皮 + 17 处 M4-pre 语义回写，见 plan §3） |
| **v0.22** | 2026-09-11 | sunxuewen-rush | **M4-pre 语义回写（plan T23）——正文 18 行按扁平模型终态重写**：① **对象（重新实测）**：§1 Scope + 前置（2）· §2 右栏元信息卡列（1）· §3 路由表 / 面包屑 / 头部（3）· §5.1 列表参数（1）· §5.2 R4 决议 2 行 + 匿名安全行（3）· §6 R4（1）· §8 详情页头部 + 段尾补注（2）· §8 语义修正记录（1）· §9 线框图 5 行（卡片 `@ns` / 面包屑 / 头部 `[PUBLIC] [@ns]` / 元信息卡 2 行）② **重写口径**：`@ns` 坐标 → 全局唯一裸 `slug` · `/assets/:nsSlug/:slug` → `/assets/:slug` · `PUBLIC` 可见性维度 → **删除**（资产恒公开；读面仅看 `status`；非 ACTIVE 治理访问仅 SUPER_ADMIN = M4-pre D6）· 元信息卡「命名空间 / 可见性」→ **实测渲染**「作者 / 更新时间 / 累计下载」③ **证据链**：事实源 `2026-09-10-flat-model-refactor-design`（R3 可见性删除 / R5 坐标裸 slug）· `http/assets.ts` `listQuerySchema` 无 `nsSlug` · `assets/service.ts:170-177` 列表 `conditions = [eq(asset.status, 'ACTIVE')]` 与 viewer 无关 · `pages/AssetDetail.tsx` 面包屑/头部/元信息卡 + `i18n/zh.ts:52-54` ④ **史实不改**：§12 旧行保留 ⑤ **登记（未改）**：`http/assets.ts:285` 注释腐化（仍写 `{ns}/{slug}` + `PUBLIC`）→ 建议随 T24 清 ⑥ §11 登记项改 ✅ |
| **v0.23** | 2026-09-11 | sunxuewen-rush | **阶段 1 完成 + converge（plan T26）**：① **三向同步**——版本头升 v0.23 · §4.2 目录树 `styles/` 终态改 `aih-theme.css`（+ 单入口说明）· §4.4 ⑦ 加 ✅（旧层已删、44 项零消费者实测）· §8 补「阶段 1 换皮完成」段（含硬证据链接）· §11 状态同步 ② **跨文档处置**：`2026-09-08-m2-asset-domain-design` 加**失效标注行**（正文不改，史实不改）· `2026-09-10-m4b-admin-console-design` 两处 `tokens.css` 复用点改指 `styles/aih-theme.css`（原引用会指向已删文件）③ **8 维重评 9.56**（标准 4：完整 9.5 / 一致 9.5 / 清晰 10 / 可实施 9.5；深度 4：设计纯粹 9.5 / 边界 9.5 / 实施精度 9.5 / 跨平台 9.5）④ 出口：阶段 1 四项条件全达成 |
