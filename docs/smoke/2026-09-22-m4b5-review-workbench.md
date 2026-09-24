# M4b-5 审核批（审核工作台：队列 + 共享详情）· 验收硬证据

> **本件为收口后补档（2026-09-25）**：本批收口（2026-09-22）时**未单独立件**（六批中唯一 —— 当时证据散在批 design §9.8
> 与批 plan §7）。跨批体检确认该例外后补立本件。
> **口径**：§1 读数为**归纳**（逐条标注来源，**非本轮重跑**）· §2 整体审计 = **本轮实跑**（2026-09-25）· §3 截图 · §4 未证项。

## 1. 读数汇总（来源 = 批 plan §7 落地记录 / 批 design §9.8 实测回填）

| 项 | 读数 | 来源 |
|----|------|------|
| 八步门禁（CI 同序） | **8/8 exit 0** —— `install` · `typecheck` 4/4 · `lint` 0 error（138 warn）· `format:check` 285 件 · `doc-audit` **70/0** · `build` 4/4 · `db:migrate` · `test` **562 pass · 0 fail** | 批 plan §7 **T11** |
| 本批 dogfood | **62 PASS / 0 FAIL / 0 超时**（全量 · 含 `G10⑭` 门户侧同件）· 分段 `SMOKE_ONLY=G10` **15/15** | 同上 |
| 零回归 | `m4a` **34/0** · `m4b3` **43/0** · `m4b4` **89/0**（88/1 → 修探针后归零 · **F193**） | 同上 |
| i18n | **404 键 / 12 组**（`review` 组 **61**）· 双语双向差集 **0** · en 值级中文泄漏 **0** | 批 plan §7 **T4/T11** |
| 契约变更 | `CompareFile.hunks[]` → **`patch: string`**（**破坏性替换** · 消费者 7 处 · 本仓首个 `alias()` 用法）· 读面 **2 加性字段**（`submittedByName` · `latestVersion`）· **R2** 移除防自审 | 批 design §5.5 · 批 plan §7 **T1–T3** |
| diff 观感 | **字号 12px · 行高 20px**（字号对标 GitHub 真浏览器实测；行高**有意偏离**：GitHub 用 24px，本面 755px 窄列下过疏）· 两处挂载点一并生效 | 批 plan §7「追加（diff 观感）」· **F195/F196** |
| 构建期体积 | 按需装配 gzip **54.6KB**（估算偏差 **2.5%**）· `refractor` 注册 **21** 语言 · 高亮 **555 span / 6 色** ↔ 关 **0** | 批 plan §7 **T5+T6** |
| 截图 | **12 张**（见 §3） | `docs/smoke/m4b5-g*.png` |

## 2. 整体审计（十一维 · **本轮实跑 · 2026-09-25**）

> **为何补做**：出口五件第 ⑤ 件在本批收口时**无留痕**（批 plan 把 ⑤ 写成「定稿条件② 证据」，与本仓口径
> ⑤ = 整体审计**不是同一件**；批 design §2 只写了该口径的定义）⇒ 跨批体检（2026-09-25）补跑。
> 口径 = 全仓覆盖式扫描（`docs/00` §7 ② 十一维）· findings 逐条登记 + 处置。

| # | 维度 | 本轮结果（命令 / 证据） | 处置 |
|---|------|------------------------|------|
| 1 | 文档门禁（两道） | `bun docs/smoke/scripts/doc-audit.ts` → **全绿**（修后）· `bun docs/smoke/scripts/doc-claims-check.ts` → **46 PASS / 0 FAIL** | 本轮已绿 |
| 2 | **修订表行结构**（本轮新增维） | 检出 **2 处行粘连**：M4a design `:934/:935` · M4b-1 design `:217/:218`（同为 2026-09-22「M4b-5 指针」笔的**截断锚点**残留 —— 半行掉出表体 + 相邻两版拼进一行）。A/A2 均漏（正则只取行首版号 ⇒ **假绿**） | **修**（结构修复 + 表内按版本升序校正 + 头部版号补同步）· `doc-audit` 增 **[F]** 常驻检查（**正反双证**：修前 2 FAIL → 修后 0 FAIL） |
| 3 | 文档数字 / 版本指针 | 批间门**台账**（主 design §2.3「批件登记表——每批落地后回填」）M4b-5 / M4b-6 两行长期停「⬜ 待落地回填」，与 Status 头 + `docs/00` §5 的 ✅ 互斥；M4b-1 行 design v1.6（真值 **v1.8**）· M4b-2 行 `T1-T10`（真值 **`T1-T15`**）· 本批 plan Status 仍写「**待提交**」（真值：4 笔已推送） | **修 / 回填**（本轮 · 主 design **v1.70**） |
| 4 | 已删件残留 | 代码面定向 grep：`DiffNav` / `DiffView` 各 **2** 处 = **退役留痕注释**（`ui/Badge.tsx:13` · `market/detail/VersionCompare.tsx:181` 均自述「已退役」）· `AuthLayout` **3** 处同型（`main.tsx:66` · `pages/Login.tsx:5` · `pages/Device.tsx:4`）· `__proto` **4** 处 = 转正来源说明 + 原型污染单测载荷 · `ReviewControls` / `SidebarSearch` **0** | **无需动作**（沿革留痕，非残留） |
| 5 | 注释腐化 | 与第 4 维同扫 —— 命中项全部是**显式声明已退役 / 已迁移**的留痕注释（写「已删件」「已退役」「M4b-5 F156」），无「以已删件为活体」的表述 | **无需动作** |
| 6 | 死导出 | 全仓符号探针（`apps` + `packages` · 文本口径 `\bsymbol\b` ≤1）：**9 个零消费者导出候选** —— `cliVersion`（CLI 待 M5 消费）· drizzle `userRelations` / `sessionRelations` / `accountRelations` · `translationInputSchema` · `RoleLevel` · `ProtocolErrorCode` · **`FilterBar` + `FILTER_ALL`（整件零消费者）**；另 `buildLabelRows` / `labelName` = M4b-1 审计**既有登记项**（仅同文件内消费，状态不变） | **口径登记**（承 M4b-1 F4/F7「地基批有意零消费」口径）· `FilterBar` 归 **M4b-7** 收敛 |
| 7 | i18n 键 | `bun docs/smoke/scripts/m4b4-measure.ts`（只读）→ **13 组 · zh = en = 536 键** · 双向差集 **0** · **en 值级中文泄漏 0** | **无需动作** |
| 8 | 既有登记项状态 | `doc-audit` [E] → **缺陷总览 §6.1 覆盖全部已出现的 F 号（208 个）** + 「未登记」空洞确为零命中 | **无未决项** |
| 9 | 官方件硬规则 | 定向 grep：`fixed inset-0` 手搓遮罩在 `components/ui/` 之外 **0 命中** | **无需动作** |
| 10 | 旧口径 / 术语指针 | `worker` 全仓 **1 命中** = 批 design §307 的 **Web Worker 技术词**（非已退役的 `worker` 角色旧称）⇒ **零违规**；`PRIVILEGED` **83** 处 = **在册标签类型**（非已删概念）；`命名空间` / `可见性` / `权限码` 命中全部为**历史沿革与「已删除」表述**（M4-pre 扁平化记录） | **无需动作** |
| 11 | 越轴值 / token 消费者 / 类串重复 | **本轮未做** —— 需对照 M4a design §4.4 轴值表与 token 清单逐项判定（属**视觉收口探针面**） | **登记 → M4b-7**（见 §4） |

> **结论**：可跑维度全部处置完毕、无未决项；余第 11 维按「归属下一批」登记（非本批遗留）。

## 3. 截图（12 张 · `docs/smoke/`）

`m4b5-g1-queue` · `m4b5-g3-detail-skill` · `m4b5-g4-detail-mcp` · `m4b5-g5-detail-agent` · `m4b5-g6-after-actions` ·
`m4b5-g7-member-view` · `m4b5-g8-b1-preview` · `m4b5-g8-rejected` · `m4b5-g10-container-narrow` ·
`m4b5-g10-diff-highlight-on` · `m4b5-g10-portal-diff-split` · `m4b5-g10-samever-empty`（`.png`）

## 4. 未证项（显式登记 · 不谎报）

| # | 项 | 现状 | 归属 |
|---|----|------|------|
| 1 | §1 全部读数（门禁 / dogfood / 零回归） | **本轮未重跑** —— 复跑需库 + CDP + 登录限流（20 次 / 15 分钟），逐条来源已标注 | 随下次批末门禁一并做 |
| 2 | 整体审计第 11 维（越轴值 / token 消费者 / 类串重复） | 需对照 M4a design §4.4 轴值表逐项判定 | **M4b-7** |
| 3 | 单文件 diff 耗时阈值 · patch 长度上界 | 批 design §9.8 已登记「未实测 2 项」 | 随 M4b-7 |
| 4 | 死导出候选 9 个（含 `FilterBar` 整件） | 口径登记（未删 / 未改） | **M4b-7** 收敛 |
