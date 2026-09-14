# M4b-1 地基批 · 五门禁与全态冒烟自检（T8）

> Date: 2026-09-14
> 范围：`docs/plans/M4b-1-console-foundation.md` T8 —— 五门禁 + 双冒烟 + marker + 批 design §9 六条 + 观感复看交用户
> （T1 官方件新落仓 11 件 + 依赖 4 个包 · T2 `Card` 全站归位 · T3 `Dialog`/`Tabs` · T4 展示件归位 · T5 面包屑/折叠/分页 ·
> T6 控制台面域 6 件 + 跨面 4 件 · T7 合规清理）
> 口径：**硬证据 = 真跑命令的输出 + 真浏览器读到的计算值/请求 URL**；**观感不作实现侧断言**（交用户确认）
> 关联：批 design `2026-09-14-m4b1-console-foundation-design` **v1.5**（§8/§9；同批收尾收敛订正后）· 批 plan `M4b-1-console-foundation` **v0.12** ·
> **收尾整体审计见 §8**（口径 = M4a T17-T26 惯例；登记表全文 = 批 plan §3；证据文档按习惯固定版本：批 design **v1.6** · 批 plan **v0.13**）·
> 主 design §10.1 版本八态映射（v1.7）· 截图 `docs/smoke/m4b1-{1,2,2b,2c,3,4,4b,5,6,7,8}-*.png`（**11 张**）

## 1. 五门禁（顺序 = `.github/workflows/ci.yml`；逐项 exit code 实测）

| # | 门禁 | 命令 | 结果 |
|---|------|------|------|
| 1 | typecheck | `bun run typecheck` | ✅ exit 0（4 包全通过） |
| 2 | lint | `bun run lint` | ✅ exit 0（web **87** / server 113 / protocol 16 / cli 1 文件，**0 诊断**） |
| 3 | format:check | `bun run format:check` | ✅ exit 0 `Checked 232 files … No fixes applied` |
| 4 | build | `bun run build` | ✅ exit 0（web CSS **107.77 kB** · JS **638.36 kB**） |
| 5 | db:migrate | `bun run db:migrate` | ✅ exit 0 `[db] migrations applied`（无新迁移；迁移 0000-0007 已在位） |
| 6 | test | `CI=true bun run test --force` | ✅ exit 0 —— protocol **27 pass**；server **475 例：474 pass · 1 skip · 0 fail**（1150 expect · 47 文件） |

- **test 复现 CI 条件**（经用户 2026-09-14 明确授权跑）：`CI=true`（turbo 严格 env 模式）+ 单库
  **`ai_asset_hub`**（与 CI 同名；env 取自 `apps/server/.env`，连接串不回显）+ `--force`（绕 turbo 缓存）
  ⇒ 与基线 **475 例 474 / 1 / 0** 完全一致 = **零回归**。
- 唯一 skip = `oidc 客户端工厂（T23）> enabled → discovery 构造`（真实网络依赖，历史既有，非本批引入）。
- `apps/web` 无 test script（组件视觉/交互变更无单测网）⇒ 验证靠 §3 冒烟 + §4 浏览器实测。

## 2. 静态断言（归位零残留 + 生产包 marker）

| 断言 | 命令 | 结果 |
|------|------|------|
| 已删手搓件零引用 | `grep -rn "ui/Spinner"` | ✅ **0**（`ui/Spinner.tsx` 于 T4 git rm） |
| 旧手搓样式层 | `find apps/web/src -name '*.module.css'` | ✅ **0**；`apps/web/src/styles/` 仅剩 **`aih-theme.css`** |
| 手搓 chip 常量 | `grep -c 'CHIP_OFF\|CHIP_ON' FilterStrip.tsx` | ✅ **0** |
| 全仓模板串条件类 | `grep -rn '\${.*?.*:' apps/web/src --include=*.tsx` | ✅ **0**（硬规则 13） |
| 官方覆盖层手写 `z-*` | `grep -rn 'z-\[' apps/web/src \| grep -v ui/shadcn` | ✅ **0**（唯一 `z-50` 命中为 `Drawer.tsx` **注释**） |
| `ToggleGroup` 结构 | item 全在 group 内 | ✅ `ToggleGroup`/`ToggleGroupItem` = 1 组 + 2×item（`FilterStrip`；`Field` 6 处在 `ConfirmDialog`） |
| 生产包 marker | `grep -c 'data-review' apps/web/dist/assets/*.js` | ✅ **0**；`ReviewControls` = **0**；`apps/web/src/dev/ReviewControls.tsx` **已删** |

## 3. 冒烟（真浏览器 · `SMOKE_SHOT_PREFIX=m4b1-`）

| 冒烟 | 命令 | 结果 |
|------|------|------|
| 契约全链（API） | `bun docs/smoke/scripts/m4a-chain-smoke.ts` | ✅ **29/29 PASS** → `CHAIN SMOKE PASS` |
| 浏览器全态 | `SMOKE_SHOT_PREFIX=m4b1- bun docs/smoke/scripts/m4a-dogfood.ts` | ✅ **36/36 PASS** + **NO JS ERRORS**（网络层 404 log 2 条 = 404 态断言**预期**触发，单列披露） |

## 4. 批 design §9 六条本批特有断言（逐条复验）

| # | 断言 | 复验结果 |
|---|------|---------|
| ① | 归位件**零残留** | ✅ 见 §2（已删件引用 0 · `.module.css` 0 · 手搓 chip 常量 0） |
| ② | 官方覆盖层上**无手写 `z-*`** | ✅ `z-[…]` 0；唯一 `z-50` 命中为注释 |
| ③ | `Dialog`/`Sheet` **均有 Title**；`Avatar` **均带 Fallback** | ✅ `SheetTitle`（`Drawer`）· `DialogTitle`（`FilePreviewDialog` 等）· `Avatar`:`AvatarFallback` = 1:1（`AssetAvatar` 封装） |
| ④ | `ToggleGroup`/`InputGroup`/`Field` 使用点符合官方结构 | ✅ `ToggleGroupItem` 在 `ToggleGroup` 内 · `Field`+`FieldError` 在 `ConfirmDialog` · **`InputGroup` 零消费**（T7 判定搜索行为「并列」⇒ 按 §6.2 保持不改） |
| ⑤ | **offset 语义不变**（翻页回顶 / 竞态 abort / 末页判定） | ✅ **canonical 实测沿用 T5 探针**（`PAGE_SIZE=2` 探针：回顶 `scrollY 291→0` 而 `maxScroll` 仍 291 = 可判定；末页双禁用；零 `href` 泄漏）；**真数据下不可达** —— 库内 3 资产 < limit(20) ⇒ 分页控件**正当缺席**（dogfood 同名断言 PASS） |
| ⑥ | **Tabs 缓存语义不变**（切回不重新请求） | ✅ **活体复验**：`performance.getEntriesByType('resource')` —— 点「文件」→「总览」→「文件」，`/api` 请求 **13 → 13 → 13**，files 族恒 3 条，**零新增请求**（`forceMount` 生效） |

## 5. 本批连带修复：冒烟脚本的**输入保真**（T8 实证，断言一字未改）

> 现象：首次 dogfood **32/36**（4 FAIL：文件树目录行 · sha 徽章 · diff 三型徽章 · mcp 单版本）。定性 = **脚本输入手段与 T3 归位后的官方件不匹配**，非应用回归。

- **根因 ①（tab 激活）**：官方 `Tabs`（radix-ui `TabsPrimitive.Trigger`）激活在 **`onMouseDown`/`onFocus`** 路径；
  页内合成 `el.click()` **不激活**。实测三连：合成 `click` 事件**确已派发**到 `document`（计数 1）但 `aria-selected`/
  panel 不变 → 补 `mousedown`+`mouseup`+`click` 即正常 → CDP **可信鼠标**同正常。历史对照：`git show 2b4d432^:DetailTabs.tsx:49`
  为手搓 `<button onClick={…}>`，故 M4a 基线时代旧写法可用（T3 归位后失效）。
- **根因 ②（对话框关闭）**：官方 `Dialog` 内置 ✕ **无 `aria-label`**（`sr-only` 文本 = `Close`），旧脚本的
  `button[aria-label="关闭"]` 自 T3 起**恒 null 且静默失效**（`evalJs` 吞异常）⇒ 旧「关闭」实为 no-op；
  仅因后续断言恰好仍过而未暴露。真指针点 tab 时，**未关的遮罩吞掉点击** → 版本 tab 连带 3 条 FAIL。
- **修法（断言 36 条零改动，仅输入保真）**：① 新增 `clickReal()`（CDP `Input.dispatchMouseEvent` 真指针 +
  「目标须为该点最顶层元素」守卫）替换 **3 处 tab 激活**；② 新增 `closeDialog()`（Esc → 兜底官方 ✕ → 轮询消失）
  替换 **2 处**旧关闭写法；③ 文件头登记两条机制口径。修后 **36/36**。

## 6. 观感复看（交用户确认，实现侧不代看）

| # | 面 | 结论 |
|---|----|------|
| 1 | 首页 `/`（hero + 统计条） | ✅ 用户 2026-09-14 复核通过（原话：ok） |
| 2 | 三中心 `/skills`·`/mcps`·`/agents`（卡片/筛选条/计数） | ✅ 用户 2026-09-14 复核通过（原话：ok） |
| 3 | 详情页三 tab（总览 / 文件树 / 版本对比 diff） | ✅ 用户 2026-09-14 复核通过（原话：ok） |
| 4 | 文件预览对话框 | ✅ 用户 2026-09-14 复核通过（原话：ok） |
| 5 | 版本对比（双下拉 + 行级 diff） | ✅ 用户 2026-09-14 复核通过（原话：ok） |
| 附 | **补充探针**：分页控件三态（首页 1/3 · 中间 2/3 · 末页 3/3 双禁用态）+ 筛选条两行形态 + chip 四态 | ✅ 用户原话「探针 OK」（临时页 `/__probe-t8`：分页三态 · chip 两行/四态；验后已删、零残留） |

物料：`docs/smoke/m4b1-*.png`（11 张）+ 本地 `:5173` 实机 + 临时探针页 `/__probe-t8`（已删）。

> **登记口径**：观感结论**由用户给出、实现侧不代看也不代填**；上表按用户口头结论逐项登记（原话：「ok」、「探针 OK」）。
> 探针覆盖的两处**真数据下不可见**项（分页控件：库内资产 < limit ⇒ 正当缺席；筛选条子行：库内仅 1 个根标签）为本次专门补验。

## 7. 登记与遗留

- **T5 副产物（观察项）**：曾 2/3 复现「URL 更新但视图未重渲染」（疑 RRv7 transition × React 19 StrictMode）。
  本 Task 两组独立浏览器跑（dogfood 五路由 + 三 tab 交互、§9 ⑥ 请求计数）**均未复现**，且 `NO JS ERRORS`
  ⇒ 保留为观察项，**未定性为缺陷**。
- **`common.close` 孤儿键已清**：T3 归位后零消费（官方内置 ✕ 用 `sr-only` `Close`）⇒ `zh/en` 各删 1 键，
  `common` 组键集由 6 → **5**，两侧对齐（同 T5 `common.prev/next` 先例）。
- **批 design 三处预期列已收敛订正**（✅ 同批收尾完成，用户 2026-09-14 拍板 a）：§3.7 `Spinner` / §3.11 分页 / §3.12 面包屑
  —— 三处「预期列 vs 实测」不符均按实测值订正，**实现侧零改动**（批 design 升 **v1.5**；订正依据见批 plan T4/T5 执行期说明）。
- **版本八态映射缺口已闭合**：`UPLOADED` = warning · `YANKED` = secondary（用户 2026-09-14 拍板，主 design v1.7）。
- **分页控件英文硬编码 / 键盘不可达**：用户 2026-09-14 拍板「保持现状（严格用官方）」，登记不修。

## 8. 整体审计（收尾 · 2026-09-14）

**口径**：承 M4a 先例（`docs/smoke/2026-09-11-m4a-visual-s1.md` §9「审计修订」T17-T26）—— 收尾对全仓跑一轮**覆盖式扫描**，
findings 逐条登记 + 处置（修 / 订正 / 回填 / 口径登记）。**登记表全文 = 批 plan §3**；本批 design/plan 版本：批 design **v1.6** · 批 plan **v0.13**。

**十维扫描结果**（findings **8 项**，无未决）

| # | 维度 | 结果（实测） |
|---|------|--------------|
| F1 | 注释腐化 | ⚠️ 1 处 → **已修**：`market/FilterStrip.tsx:39` 文档注释 `spacing={7}` ≠ 真值 `spacing={1.75}`（7px；标度是 0.25rem 乘数）。复测残留 = **0** |
| F2 | 既有登记项 | ⚠️ 1 处 → **已订正**：批 design §6.4 `--radius-2xl`「潜在零消费者」候选与**同表「现状」列**（消费点 `SideNav.tsx:71`，经 `rounded-2xl` utility）自相矛盾 ⇒ 从候选剔除；M4a plan §3 表 25 同类项**挂账**（留待六批收尾完整 converge 复核） |
| F3 | 类串重复 | ✅ **回填**：M4a 审计第 24 项（chip 类串跨 4 文件重复）⇒ 本批已收敛（chip 外观落官方 `toggle.tsx` `variant="chip"`，`FilterStrip` 零手搓类串） |
| F4 | 死导出 | 口径登记：本批新增件零外部消费 = console **6** 件 + 跨面 **4** 件 + i18n 三组 **15** 键 ⇒ 地基批「落件不接线」预期形态（消费点 M4b-2..6），**非死代码** |
| F5 | 越轴值 | 口径登记：`h-[120px]` · `w-[240px]` · `w-[180px]` · `max-w-[560px]`（契约值）均为**布局级**（官方允许 className 做布局）；`text-[11px]` **在轴上**（§4.4 首档） |
| F6 | i18n 键 | ✅ 六组键 zh/en **全对齐**（common 5 · market 53 · dashboard 4 · admin 6 · review 5 · errors 2）。**方法教训**：计数须按**顶层缩进**匹配——宽松正则把嵌套键计入 ⇒ 曾出 market 假阳性「53/58」 |
| F7 | 死导出（既有） | 维持：`buildLabelRows` / `labelName` 零外部消费（M4a 审计 21 已澄清「文件内使用」） |
| F8 | 残留 / 硬规则 / 数字 | ✅ 全绿：已删件残留 **8 类全 0** · 官方件硬规则 **6 项 0 违规** · 文档量化声明 **8 项实测一致**（11 件 / 13 项 / 14 处 / 4 项 / 6 件 / 4 件 / 4 包 / 33 件） |

**门禁复跑（F1 注释变更后）**：`typecheck` · `lint` · `format:check`（232 文件）· `build` 逐项 **exit 0**；
产物 **CSS 107.77 kB（gzip 18.06）· JS 638.36 kB（gzip 202.83）** = 与 T8 终态**持平**（注释变更零产物影响）。
`test`（475 例）**未重跑**：F1 为 TS 注释、零行为面；如需可另行授权补跑。

**流程定案（本轮回写）**：「整体审计」立为**批次收尾固定环**——主 design §2.3 批间门 **出口四件 → 出口五件**（新增第 ⑤ 件 `整体审计`）；
`docs/00` §5 M4b 子批口径每批流程 + §7 ② 设计层 converge 口径同步补该环 ⇒ **M4b-2..6 收尾照跑**（防再漏）。
