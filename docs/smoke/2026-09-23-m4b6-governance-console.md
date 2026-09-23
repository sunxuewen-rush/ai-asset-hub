# M4b-6 治理批（管理看板 / 资产管理 / 标签定义 / 审计日志）· 验收硬证据

> **本文件 = 本批出口件的证据记录**（批 plan **T10** 步骤 1–7 · 批 design §9.3/§9.4/§9.5）。
> 所有数字一律为**实测产出**（命令 / 脚本 / 真浏览器 CDP / 真库读数），非人工点数；行数一律 `wc -l` 口径。
>
> **状态：✅ 已回填（2026-09-23 执行期）** —— 各节数字均取自当次真实运行输出；**未跑项在 §8 显式登记为未证项**。
>
> ⚠️ **口令纪律**：脚本口令一律从 env 读（`SMOKE_M4B2_PASSWORD`，测试账号共用），**仓库内零口令 / 零连接串**
> （本文件亦不含值；`apps/server/.env` 已被 `.gitignore` 忽略）。

## 1. 八步门禁（CI 顺序复现 · design §9.2）

| 步骤 | 命令 | 结果 |
|------|------|------|
| 依赖 | `bun install --frozen-lockfile` | **exit 0** —— `Checked 480 installs across 609 packages (no changes)` |
| 类型 | `bun run typecheck` | **exit 0** —— 4/4 tasks |
| 静态 | `bun run lint` | **exit 0** —— 4/4 tasks（**收尾修正后转绿**，见下注） |
| 格式 | `bun run format:check` | **exit 0** —— `Checked 302 files` |
| 文档体检 ① | `bun docs/smoke/scripts/doc-audit.ts` | **exit 0** —— **111 PASS / 0 FAIL** |
| 文档体检 ② | `bun docs/smoke/scripts/doc-claims-check.ts` | **exit 0** —— **44 PASS / 0 FAIL**（本批新建件，见 §3） |
| 构建 | `bun run build` | **exit 0** —— 4/4 tasks |
| 迁移 | `bun run db:migrate` | **exit 0** —— `[db] migrations applied`（迁移 **0014** 已落） |
| 测试 | `CI=true bun run test` | **exit 0** —— server **590 pass / 0 fail**（53 文件 · 1869 断言 · 基线 562 + 本批 **28**） |

> **`lint` 收尾修正（归因逐件核实 · `git log -1 -- <file>`）**：门禁首跑报 2 个 error，**两件均本批引入的文件**：
> ① `AdminAudit.tsx:202 useExhaustiveDependencies`（本批 T9 新建）⇒ `useMemo` 依赖补 `t`
> ② `chart.tsx:89 noDangerouslySetInnerHtml`（本批 T6 **官方 shadcn 图表件转正**）⇒ **保留官方原样代码**，
> 按仓库既有先例加 `/* biome-ignore ... */`（先例 = `apps/web/src/hooks/useApi.ts:43`），并写明理由（仅注入主题 CSS 变量 · 无用户输入）
> 顺带清掉本批文件的 8 条 warning（`AdminBoard.tsx` 未用 import ×2 + `noNonNullAssertion` ×6）。
> **非本批文件（`AppShell.tsx` / `CenterPage.tsx` / `Search.tsx`，最后提交早于本批）未动** —— 其中 `noDocumentCookie` 为 warning 级，不影响 exit 0。

## 2. 本批 dogfood（G1–G11 · design §9.3）

**命令**：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-governance-dogfood.ts`
**结果**：**PASS 41 · FAIL 0 · CDP 超时 0** · 每段 `NO JS ERRORS`（真浏览器 CDP，非 mock）

| 组 | 面 | 关键断言（实测值） |
|----|----|--------------------|
| G1 | 看板 KPI | 端点 200 · 四卡数字在场 · 副行「全部资产 / 全部账号」在位 |
| G2 | 看板趋势 | SVG ≥4（实测 **7**）· 下载态 = **数值**（非「暂无下载历史」⇒ 0014 已落）· 范围切换后两图仍在 |
| G3 | 类型两图 | 同心环 sector 在场（**2**）· 雷达 polygon 在场（**1**）· 两图标题在位 |
| G4 | 排行榜三口径 | 切「标签」/「资产」口径条形均在场（**6 / 6**）· 英雄榜两卡 + Top N 下拉在位 |
| G5 | 创意四项 | 四项标题在位 · 三项为数值或 `null`（契约）· 沉睡资产为数值 · 类型级聚合出参在场 |
| G6 | 资产管理页 | 表列 = **10**（含操作槽）· `status=ALL` 含非 ACTIVE · 排序接线（URL 出 `sort`/`dir`） · 隐藏描述列后名称列**等比摊开** |
| G7 | 详情抽屉 | 抽屉打开（`dialogs=1`）· 含「归属人」 |
| G8 | 标签定义页（**超管**） | 端点 200 · 上限块在位（`total`/`limit`）· 六列在位 · 首行 ↑ 禁用 |
| G9 | 审计日志页 | 端点 200 · 六列在位 · 匿名兜底键就位 · 快捷三键在位 · 「更多筛选」在位 · **出参带 `actorName`（F204）** · 抽屉含「用户代理」与「原始详情」 |
| G10 | 筛选收窄 | 动作过滤 `version_yank ≤ 全量`（全量 **2607** / `yank` **57**）· 页内计数随筛选变化 |
| G11 | **跨页数字一致** | 资产页页头计数 = 端点 `activeAssets`（**34**）· 看板 KPI 与资产页一致 |

> **账号纪律（一次真失败 ⇒ 已修）**：G8（标签定义）需 **`SUPER_ADMIN`(100)** —— 初版误用 `m4b2_mgr`(ADMIN=10)，
> 4 条断言 FAIL（页面行为正确，是**脚本选错账号**）⇒ 改为 `m4b2_super` 后全绿。已在脚本内注释该角色门槛（U9）。

## 3. 换靶校验（`doc-claims-check.ts` · 本批新建件 · design §3.1）

`doc-audit.ts`（形式体检：版本头 ≤3 / 死路径 / 中立性）之外，本批新增**断言回读**层，6 类检查：
① 引用逐条回读（`file:line` + 期望关键词锚点）② 同一量跨节对照 ③ 件表 ↔ 服务端改动号 ↔ 端点表**三向一致**
④ 机制声明**实测复核**（源码里真在）⑤ UI 契约 ↔ 真码回读（件路径 / 路由 / i18n 键成对 / **页面零中文泄漏**）
⑥ 头部版本行**陈旧或乱序**。

- 终态：**43 PASS / 0 FAIL**（脚本 411 行）
- **首跑 37 PASS / 7 FAIL ⇒ 全部处置**：脚本自身 **5 处口径问题**（数值正则过宽抓到 before→after 叙述 · 中文泄漏检查漏「纯 JSX 文本行」 · 头部版号误取承接文档版号 · 扩展名交替序 `ts|tsx` 使 `.tsx` 永不可达 · 零填充号 `0014` 转 Number 变 `14`）+ **2 类真缺陷**（见 §5）
- **价值实证**：本脚本首跑即抓出 **2 页 28 处硬编码中文 + 1 行 stale DEV 提示**（既有门禁/单测全绿也漏）⇒ 已修并纳入门禁

## 4. 真库读数（管理面冒烟 · 2026-09-23）

| 端点 | 读数 |
|------|------|
| `/api/admin/overview` | 活跃资产 **33** · 全部资产 **52** · 累计下载 **1521** · 待审 **9** · 有效用户 **331** |
| `/api/admin/trends` | 下载序列 = **0**（0014 已落 ⇒ 数值态；`null` 仅「迁移未落地」过渡态，D52） |
| `/api/admin/rankings` | 三口径（资产 / 员工 / 标签）出参在场；并列稳定键（D53） |
| `/api/audit/actions` | 分组 **8 组**（潜在全集 9；`ldap`/`oidc` 尚未出现） |
| 鉴权（负向 · 实测） | 用户档三端点 **403** · `/api/labels/all` 对 `ADMIN`(10) **403**（仅超管 —— 设计如此） |

## 5. 实施期发现与处置（F203–F205）

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F203** | design §4.1 (e)(f) | 两图指向 §5.1，但该处**未列 `types[]` 出参**（实现者会漏取数） | **最小加性补** `overview.types[]`（`admin/overview.ts` + `admin.test.ts` 断言） |
| **F204** | 审计查询 | `select().from(auditLog)` **无 join ⇒ 拿不到「姓名」**（D48 要求工号 + 姓名同列） | 补 `leftJoin` 出 `actorName`（`audit/query.ts`）+ 测试 |
| **F205** | i18n（实现面） | **AdminAssets 19 处 + AdminAudit 9 处**硬编码中文（含 `aria-label` / `title` / `placeholder` / 空态 / 抽屉字段名）+ **1 行 stale DEV 提示**（「状态筛选依赖改动 4，尚未实现」——改动 4 已落，属过期信息） | 全部走 i18n（**新增 17 键**：`admin.assets.*` 8 + `admin.audit.*` 8 + `common.close`）；stale 行**删除**；`doc-claims-check` ⑤ 纳入门禁防复发 |

**i18n 终态实测**：zh / en 叶子键 **各 534**（差集 **0**）· 本批增量 **+130**（404 → 534）· `board` 组 **39**（新组）·
`admin` 组 **6 → 95**（+89）。

## 6. 零回归（口径 = 无新增失败 · design §9.1）

| 脚本 | 结果 | 备注 |
|------|------|------|
| `m4b6-governance-dogfood.ts`（本批） | **41 PASS / 0 FAIL / 0 超时** | 收尾全量 |
| `m4b4-personal-b-dogfood.ts` | **83 PASS / 6 FAIL** | 6 条失败逐条为**种子数据态断言**（期望精确行数/按钮在场） |
| `m4a-dogfood.ts` | 首跑（并发）**崩**：`JSON Parse error: Unexpected identifier "none"`；**串行重跑 = 58 PASS / 2 FAIL** + `NO JS ERRORS` | 2 条失败 = `diff 三型徽章` / `diff +/− 行内容`（**变更对比**面 · 数据态依赖，需两份可比版本）；**未做 HEAD 基线对照** ⇒ 不宣称与本批无关 |
| `m4b3-personal-a-dogfood.ts` | 并发跑 **16 PASS / 27 FAIL**（**无效**，同上） | 该批另有独立造数脚本（`m4b3-seed-submissions.ts`），数据态依赖强 |
| `m4b5-review-dogfood.ts` | 并发跑 **53 PASS / 9 FAIL**（**无效**，同上） | 同上（`m4b5-seed-reviews.ts`） |

> **并发执行教训（本轮）**：为省时间并行起三个 dogfood ⇒ **共用测试账号 + 登录限流 20/15min** ⇒ 相互挤掉会话，
> 结果不可采信（m4a 直接解析崩）。**正确姿势 = 串行逐脚本**（记忆里已有该坑，本轮仍踩 ⇒ 已写进结论）。
>
> **口径现状**：本批对既有面的影响面 = `/api/assets` **管理档加性扩参**（非管理档传参与不传**逐条相同**，T2 用例锁定）
> + 标签面形态变更（实测**前端零消费者**）⇒ 风险面窄；但 **HEAD 基线对照未做** ⇒ 三脚本的 `FAIL` 数
> **不能宣称为「本批无关」**，按纪律在 §8 登记为未证项。

## 7. 出口件与截图

**件行数（`wc -l` 实测）**：`AdminBoard.tsx` **645** · `AdminAssets.tsx` **625** · `AdminLabels.tsx` **574** ·
`AdminAudit.tsx` **565** · `api/admin.ts` **165** · `http/admin.ts` **68** · `http/admin.test.ts` **566** ·
`overview.ts` **200** · `rankings.ts` **116** · `trends.ts` **134** · `chart.tsx` **340** · `combobox.tsx` **283**。

**截图（9 张 · `docs/smoke/`）**：`m4b6-g1-board-kpi.png` · `m4b6-g2-board-trend-180.png` · `m4b6-g4-board-rank.png` ·
`m4b6-g6-assets-list.png` · `m4b6-G6-assets-colhidden.png` · `m4b6-G7-assets-drawer.png` · `m4b6-g8-labels-tree.png` ·
`m4b6-g9-audit-list.png` · `m4b6-g10-audit-quick.png`。

**PoC 清理（U7 · T10 步骤 7）**：`apps/web/src/pages/__proto/`（4 页 + 3 数据文件）已删；`apps/server/tmp-dashboard-probe.ts` /
`tmp-label-seed-child.ts` / `tmp-labels-audit-probe.ts` 已删；`main.tsx` 的 DEV 路由与 `ComingSoon` 占位已移除 ⇒
`git status` 无残留。

## 8. 未证项（显式登记 · 不谎报）

| # | 项 | 现状 | 影响 |
|---|----|------|------|
| 1 | ~~`bun install --frozen-lockfile`~~ | ✅ **已补跑**（exit 0 · 无变化） | 已闭合 |
| 2 | ~~`bun run lint`~~ | ✅ **已转绿**（本批文件 2 error + 8 warning 修掉；非本批文件未动） | 已闭合 |
| 3 | `m4a` / `m4b3` / `m4b5` 三脚本 | 首轮**并发执行无效**（登录限流互挤）；**m4a 已串行补跑**（**58 PASS / 2 FAIL** · 失败 = `diff` 两条）；`m4b3`/`m4b5` 串行结果**本轮未取得** | 零回归「无新增失败」口径**未完全闭合** |
| 4 | `m4b4` 6 条 FAIL / `m4b5` 9 条 FAIL / `m4b3` 27 条 FAIL | 现象均集中**种子数据态断言**（期望精确行数/按钮在场/前缀锚定行数）；**未做 HEAD 基线对照** | **未证「与本批无关」** —— 按纪律不宣称 |

> **未证项的诚实口径**：本批对既有面的**代码级影响面**已实测收窄（`/api/assets` 管理档加性扩参、非管理档逐条相同；
> 标签面形态变更无前端消费者）⇒ 失败项「看起来」与数据态有关，但**「看起来」不是证据**。要做实需：
> ① 串行补跑三脚本 ② 在 `HEAD~13`（本批首笔提交前）同一环境跑同一脚本做基线对照。**两者均未完成**，登记为未证。
