# M4b-6 治理批（管理看板 / 资产管理 / 标签定义 / 审计日志）· 验收硬证据

> **本文件 = 本批出口件的证据记录**（批 plan **T10** 步骤 1–7 · 批 design §9.3/§9.4/§9.5）。
> 所有数字一律为**实测产出**（命令 / 脚本 / 真浏览器 CDP / 真库读数），非人工点数；行数一律 `wc -l` 口径。
>
> **状态：✅ 已回填（2026-09-23 执行期）** —— 各节数字均取自当次真实运行输出；**未跑项在 §8 显式登记为未证项**。
> **F206 补记（2026-09-23 晚 · 用户报缺陷）**：侧栏激活判定修缮 + dogfood **G12** 追加 ⇒ §2 / §5 / §6 / §8 已同步（dogfood 全量 **41 → 56 PASS**）。
> **T6⁺ 补记（2026-09-23 深夜 · 用户逐条拍板「看板重做」）**：管理看板一页重做（9 处拍板：删创意四项/类型维度 · 加标签维度两图 · 趋势档位改官方 `Combobox` · 副标题与页脚全清 · 13 色池 · 图表盒子对齐 · 环图换 `Radial Chart - Grid` · 雷达换 `Radar Chart - Grid Circle` · 英雄榜换 `Bar Chart - Label` + 类目名水平换行）· 服务端加 `kpi.downloads7d` 修 **F208** · 排行榜卡加 `isolate` 修 **F208-A** · 门禁补绝对值锚修 **F209** ⇒ dogfood 追加 **G14**（8 条）⇒ §2 / §5.3 / §6 / §7 / §8 同步（全量 **71 → 84 PASS**）· 批 design **v0.32** / 批 plan **v0.8**。
> **F207 补记（2026-09-23 晚 · 用户报缺陷 → 拍板「甲」）**：`TopBar` 删自造路由表（顶栏回归官方 block 形态）+ dogfood **G13** 追加 ⇒ 同步 §2 / §5.2 / §6 / §8（dogfood 全量 **56 → 71 PASS**）· 主 design **v1.67** / 批 design **v0.31** / 批 plan **v0.7**。
>
> **②③ 补记（2026-09-24 · 用户授权写库 + 收口项）**：造数复位（`m4b3-seed-submissions` / `m4b5-seed-reviews` / `m4b6-seed-downloads --clean`→重播）⇒ 零回归 **21 → 2 条**；`m4b4` 两处**断言侧**缺陷修 **F219**（写死条数 → 端点真值 · 「活跃」→「已上线」）+ 夹具复位 ⇒ **89/0**；新增 **G16**（重挂 ⇒ 一级上卷归属 · 6 条 · 含反证）⇒ dogfood 全量 **102 → 108 PASS / 0 FAIL** · 批 design **v0.43** / 批 plan **v0.15**。
> **④ 补记（2026-09-24 · 挂账 ① 收口）**：`m4a` 两条定性为**断言过时**并修 **F220**（真值口径 `+N/−M` 签名 + 真源取证）⇒ `m4a` **58/2 → 60/0** ✅ ⇒ 零回归四脚本 **60/0 · 43/0 · 89/0 · 62/0** 全绿 · **挂账失败项 2 → 0**；批 design **v0.44** / 批 plan **v0.16**。
> **⑤ 补记（2026-09-24 · 挂账 ② 收口）**：证据 §8 item **⑦⑧** 形式缺口闭环（用户授权写库）—— 造 14 个零挂载一级标签 + 1 个「仅挂 `HIDDEN` 资产」标签 ⇒ **真页 + API 22 PASS / 0 FAIL**（⑦ 13 色池 `index % 13` **换圈**已实证 · ⑧ F212「仅挂已隐藏/已归档」第三支文案 + 禁用钮 + **对照组**）· **自清逐项回落**（一级标签 22 → 7 · 资产 54 → 53）· 新增一次性探针脚本 + 3 张留证截图（**§5.8**）；批 design **v0.45** / 批 plan **v0.17**。
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
| 文档体检 ① | `bun docs/smoke/scripts/doc-audit.ts` | **exit 0** —— **113 PASS / 0 FAIL**（F217/F218 后终读数） |
| 文档体检 ② | `bun docs/smoke/scripts/doc-claims-check.ts` | **exit 0** —— **46 PASS / 0 FAIL**（本批新建件，见 §3） |
| 构建 | `bun run build` | **exit 0** —— 4/4 tasks |
| 迁移 | `bun run db:migrate` | **exit 0** —— `[db] migrations applied`（迁移 **0014** 已落） |
| 测试 | `CI=true bun run test` | **exit 0** —— server **598 pass / 1 skip / 0 fail**（53 文件 · 1898 断言） |

> **`lint` 收尾修正（归因逐件核实 · `git log -1 -- <file>`）**：门禁首跑报 2 个 error，**两件均本批引入的文件**：
> ① `AdminAudit.tsx:202 useExhaustiveDependencies`（本批 T9 新建）⇒ `useMemo` 依赖补 `t`
> ② `chart.tsx:89 noDangerouslySetInnerHtml`（本批 T6 **官方 shadcn 图表件转正**）⇒ **保留官方原样代码**，
> 按仓库既有先例加 `/* biome-ignore ... */`（先例 = `apps/web/src/hooks/useApi.ts:43`），并写明理由（仅注入主题 CSS 变量 · 无用户输入）
> 顺带清掉本批文件的 8 条 warning（`AdminBoard.tsx` 未用 import ×2 + `noNonNullAssertion` ×6）。
> **非本批文件（`AppShell.tsx` / `CenterPage.tsx` / `Search.tsx`，最后提交早于本批）当时未动** —— 其中 `noDocumentCookie` 为 warning 级，不影响 exit 0。
> **2026-09-24 补记（③ lint 整理笔）**：全仓既有 warning **138 → 73**（清 65 条）—— (A) 自动修（未用 import / 未用变量 / 字面量键 / 安全可选链，含 `CenterPage.tsx`+`Search.tsx` 两处 `import {} from '…/select'` 空导入）+ (C) `biome.json` 忽略写法迁移（`!…/meta/**` → `!…/meta`）；**5 处类型敏感改写已回退**（会引入 `T | undefined`）；余 **73 条 (B) 类**（noNonNullAssertion 66 · noTemplateCurlyInString 5 · noExplicitAny 1 · noDocumentCookie 1）= **0 error**，登记后置（见 §8）。

## 2. 本批 dogfood（G1–**G16** · design §9.3）· **108 PASS**

**命令**：`bun --env-file=apps/server/.env docs/smoke/scripts/m4b6-governance-dogfood.ts`
**结果**：**PASS 108 · FAIL 0 · CDP 超时 0** · 每段 `NO JS ERRORS`（真浏览器 CDP，非 mock）
（T10 首跑基数 = **41**（G1–G11）⇒ **F206 追加 G12 = 56** ⇒ **F207 追加 G13 = 71** ⇒ **T6⁺ 重写 G3/G4.4/G5 + 追加 G14（8 条）= 84** ⇒ **F210 修 4 条空断言并补齐 G2/G4 = 88** ⇒ **F212 补 G8.5/G8.6（删除确认口径） = 90** ⇒ **F214 补 G8.6 双例 = 91** ⇒ **F215 补 G8.7（解析链）= 92** ⇒ **F216 补 G15 = 97** ⇒ **F217 补 G8.8–G8.10 = 100** ⇒ **F218 改写 G8.8/G8.9 + 补 G8.11/G8.12（真页往返）= 102** ⇒ **① 重挂归属新增 G16（6 条）= 108** —— 末次全量输出：`✅ M4b-6 dogfood: PASS 108 · FAIL 0 · CDP 超时 0`）
（T6⁺ 过程留痕：旧形态断言**先红后绿** —— 首跑 6 条 FAIL（类型图 / 原生 `select` / 创意四项）**全部属故意变更**；期间另修 **3 处新断言自身的探针缺陷**：① CDP `returnByValue` 遇 **DOM 节点数组静默返回 undefined** ② 正则里的反斜杠被模板字符串二次转义（改用 `[0-9]` 规避）③ `rotate` 在 `<text>` **自身**而非父级（两处都查））
（**F210 过程留痕（提交后核验发现）**：4 张看板截图**字节完全相同**（sha256 `9b5cebe88963`）= 状态从未改变的物理证据 ⇒ 逐条回查证实 **G2.2 / G2.3 / G4.1 / G4.2 四条为空断言**（详见 §5.3 F210）；修复后新增/重写断言逐条**正反双证**：反证 1（G2.4 期望翻为「首刻度龄 8–9 天」）⇒ FAIL；反证 2（G4.2 期望柱数 +1）⇒ **3 条全 FAIL**；跑完已还原（脚本 sha256 前后一致）；新截图 `g2-board-trend-7` / `g4-board-rank-label` 与 `g1` **指纹各异** ✓）

| 组 | 面 | 关键断言（实测值） |
|----|----|--------------------|
| G1 | 看板 KPI | 端点 200 · 四卡数字在场 · 副行「全部资产 / 全部账号」在位 |
| G2 | 看板趋势（**F210 重写**） | 趋势卡两图 + 全页 SVG ≥6（实测 **7**）· 题注「截至 YYYY-MM-DD」**≥2 处**且无空态文案 · 默认档 = 近 30 天（首刻度龄 **25** 天）· **档位切换生效**（近 7 天首刻度龄 **6** 天且刻度集不同）· 切回 30 天 |
| G3 | **标签维度两图**（T6⁺ 重写 · **F213 后**取色断言按行序**数据感知**） | 同心环 sector（**= `count>0` 行数**；当前 2 / 一级 4）· 两图**同心网格**（ring 2 / radar 5）· 标题在位 · 雷达轴文字（**= 一级标签行数**；当前 4）· **取色三处一致**（图例 = 行序 · 扇区 = `count>0` 行 · 雷达点 = 全行）· 两图无副标题 · **口径与排行榜同面**（逐条 `count` 相等） |
| G4 | 排行榜三口径（**F210 重写**） | 默认口径 = 人（`data-active`）· 三口径逐个切：`data-active=true` **且榜内柱数 = 端点非零条数**（人 9 / 标签 2 / 资产 4）· 英雄榜两榜在位 · 两处 `Combobox` 在位 |
| G5 | **英雄榜形制**（T6⁺ 重写） | 两榜（员工榜 / 资产榜）· 每榜 **3 竖柱 + 3 柱顶数值** · 类目名**水平多行**（无 -45° 旋转）· 无纵向网格线 · 无副标题/页脚口径行 |
| G6 | 资产管理页 | 表列 = **10**（含操作槽）· `status=ALL` 含非 ACTIVE · 排序接线（URL 出 `sort`/`dir`） · 隐藏描述列后名称列**等比摊开** |
| G7 | 详情抽屉 | 抽屉打开（`dialogs=1`）· 含「归属人」 |
| G8 | 标签定义页（**超管**） | 端点 200 · 上限块在位（`total`/`limit`）· 六列在位 · 首行 ↑ 禁用 · **F212 两条**：出参 `mountCountAny ≥ assetCount` 逐行不变量 · 删除确认（有任一状态挂载 ⇒ 确认钮禁用 + 文案三段口径）· **F214 双例**：按数据特征挑「有子级」与「零子级有挂载」两行，分别断言「子标签」/「已发布资产」文案 + 确认钮禁用 · **F215**：公开面 `zh-CN` 请求下，带 `zh*` 翻译的行逐条返回该中文名（不落 `en`） | · **F218 四条**（改写 F217 的父级断言）：无子级一级**可改**（候选**不含自身**）· **有子级**一级禁用 + 说明 / 二级可用 · 真页往返 a（真对话框挂到一级下 ⇒ 服务端 `parentId` 变更）· 往返 b（改回一级 · **自清**）｜**F217**：409 `label.slug_taken` ⇒ 可见 toast 且弹窗不关闭 |
| G9 | 审计日志页 | 端点 200 · 六列在位 · 匿名兜底键就位 · 快捷三键在位 · 「更多筛选」在位 · **出参带 `actorName`（F204）** · 抽屉含「用户代理」与「原始详情」 |
| G10 | 筛选收窄 | 动作过滤 `version_yank ≤ 全量`（全量 **2607** / `yank` **57**）· 页内计数随筛选变化 |
| G11 | **跨页数字一致** | 资产页页头计数 = 端点 `activeAssets`（**34**）· 看板 KPI 与资产页一致 |
| **G12** | **侧栏激活唯一性**（**F206 追加**） | 13 条导航路径（门户 4 + 个人 4 + 管理 5）各**恰 1 条** `[data-slot=sidebar-menu-button][data-active=true]` 且 href = 该路径 · `/search`（无对应条目）**0 条** · F206 回归专条（`/admin/assets` 下 `/admin` **不激活**） |
| **G13** | **顶栏形态 + 页内标题**（**F207 追加**） | 14 条路径各「顶栏**无** `h1`」**且**「内容区有首个标题」（取值集合 = `[data-slot=card-title], h1, h2, h3` 排除 `header` 内）· 聚合条「顶栏 `h1` 计数 = 0」 |
| **G14** | **看板重做段**（**T6⁺ 追加** · 8 条） | 六段结构顺序 · 已删段落字样不出现 · 出参换靶（`labels[]` 在场 / `creative`+`types` 不在场）· **KPI 副行与趋势档位无关**（30/7/180 三档同值）· 副行 = `kpi.downloads7d` · **层叠守护**（`elementFromPoint` 命中 `HEADER` 非口径按钮）· 排行榜斜排 ≤14 字符且不越出卡片 · 趋势卡无副标题且档位非 ToggleGroup |
| **G15** | **标签写后即见**（**F216 守护** · 5 条） | 全程 **SPA 路由**（禁整页跳转 —— 整页会重建模块、清空响应缓存 ⇒ 测不出本 bug）：① SPA 进标签定义页 ② **真实对话框创建 ⇒ 列表立现（不刷新）** ③ SPA 回门户 ④ **门户 chip 立现（不刷新）** ⑤ 自清临时标签 |

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

> **2026-09-24 造数复位后重读（只读）**：`download_event` 共 **38** 条（近 7 天 **22**）· 种子资产 `m4b6-seed-downloads` **id=12418**（37 事件 · `download_count=37` 与事件一致）· 资产分布 ACTIVE **34** / HIDDEN **16** / ARCHIVED **3** · 标签仍 9 个（用户手动建的 `test`/`public`/`hr` 在内；**「通讯」已按 ② 在页面上被挂到「软件」下** —— 真库现场留痕）。下表为 09-23 首读，保留作对照。

| 端点 | 读数 |
|------|------|
| `/api/admin/overview` | 活跃资产 **33** · 全部资产 **52** · 累计下载 **1521** · 待审 **9** · 有效用户 **331** |
| `/api/admin/trends` | 下载序列 = **0**（0014 已落 ⇒ 数值态；`null` 仅「迁移未落地」过渡态，D52） |
| `/api/admin/rankings` | 三口径（资产 / 员工 / 标签）出参在场；并列稳定键（D53） |
| `/api/audit/actions` | 分组 **8 组**（潜在全集 9；`ldap`/`oidc` 尚未出现） |
| 鉴权（负向 · 实测） | 用户档三端点 **403** · `/api/labels/all` 对 `ADMIN`(10) **403**（仅超管 —— 设计如此） |

## 5. 实施期发现与处置（F203–**F220**）

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F220** | **跨批 dogfood 断言**（`docs/smoke/scripts/m4a-dogfood.ts` · M4a 批脚本） | 本批收口期挂账 ①：「`diff 三型徽章`」+「`diff +/− 行内容`」两条**恒假红**。定性（真页 + 源码双证）= **断言过时**，非夹具缺失：真值口径已从字面词 `MODIFIED/ADDED/DELETED` 改为 **`+N/−M` 签名**（`apps/web/src/components/ui/DiffWorkspace.tsx`：折叠行 = `▸<path>+N −M` 的 `button`；展开后 = `<section aria-label="<path> +N −M">`）⇒ ①恒假；② 原「+− 行内容」取**全页** `innerText`，命中的是右侧「**变更历史**」文案 = **假命中**（同 F219 病灶） | **已修**（2026-09-24）：① 三类变更改按**签名**断言（修改 = 有增有删 / 新增 = 只增 / 删除 = 只删；文件行从 DOM 读，**不写死**文件名与数字）② 先**展开「只增」行**、只在**该文件 diff 区内**取证（含幂等兜底）⇒ `m4a` **58/2 → 60 PASS / 0 FAIL** ✅ · **正反双证**见 §5.7 |
| **F219** | **跨批 dogfood 断言**（`docs/smoke/scripts/m4b4-personal-b-dogfood.ts` · M4b-4 批脚本） | 本批收口期造数复位时发现两条**断言侧**缺陷：① `G20-9` 把 `/skills` 行数**写死 6**（实测 **11** = 公开 ACTIVE 资产随各批夹具累积 ⇒ 数据漂移，与 F213/G3.5 同类）② `G6 三态各一行` 断言 `body.includes('活跃')`，界面真值 `filter.status.active` = 「**已上线**」⇒ **恒假红** | **已修**（2026-09-24）：① 行数改**端点真值**比对（`/api/assets?type=skill&limit=20` → `items.length`）② 文案改「已上线」③ 夹具复位（`m4b4-seed-assets`）修另 4 条（根因 = `m4b4-seed-skill@1.0.0` 被历史跑测打成 `YANKED` + `latest_version_id=null`）⇒ `m4b4` **83/6 → 89/0** ✅ · 固化「**seed → dogfood 成对跑**」口径。详见 **§6 复位留痕** |
| **F218** | 标签定义页 / 服务端标签校验（`labels/service.ts` × `AdminLabels.tsx` × i18n × `docs/06`） | **用户拍板（2026-09-24）**：F217 真页验证成功后逐字「**现在就落2**」。①「**一级不可降级**」硬拒 ⇒ 一级误建后**无法归位**（删除路径在有挂载 `label_in_use` / 有子级 `label.parent.has_children` 时均被拒）；② 前端编辑一级标签时父级下拉被禁用 ⇒ 规则本身无出口 | **已修**（2026-09-24）：服务端硬拒 → **安全重挂**（前置 = 目标必须一级 + **自身无子级**）；前端下拉**放开**（候选 = 一级且**排除自身**；仅「有子级」禁用 + 说明）；i18n `parentHint` 改写 + `parentLockedHint` → `parentHasChildrenHint`；**规范层 `docs/06` v1.7** + **明写相对兄弟仓 SkillHub 契约的偏离 + 理由**；用例 5 步 + dogfood **G8.8/G8.9 改写 + G8.11/G8.12**（含反证）⇒ 全量 **100 → 102**。明细见 **§5.6** |
| **G16** | **标签重挂 ⇒ 看板「一级上卷」归属**（**F218 语义守护** · 6 条 · 2026-09-24 新增） | **端点三态**（重挂前 / 重挂态 / 复原后）逐值对比：① 原子行从一级上卷**消失**（其余行不动）② 零计数目标 ⇒ 新父 count **严格等于**原子 count（有交集时按 `selectDistinct` 去重口径只允许落区间）③ 上卷口径**不丢数据**（零计数目标 ⇒ 严格守恒）④ `rankings.labels` 与上卷**逐条相等** · ⑤ **真页**重挂态下图例行数 = 上卷行数 · ⑥ 复原**逐字段回落**（自清）。**反证**：停掉重挂调用 ⇒ ①②⑥ 三条 FAIL（判别力证实） |
| **F216** | 标签写后刷新（`api/admin.ts`） | **用户报缺陷（2026-09-24）**：「创建标签后不显示，刷新才出现」。根因 = `api/client.ts` **语言感知 Promise 缓存**在标签写面**漏失效**（其他写面均有）⇒ `setTick` 重取命中旧 Promise；整页刷新 = 模块重建才见。影响面四消费者：标签页自身 / 看板标签维度 / 门户 chip / 资产卡内嵌标签名 | **定案（待执行）**：`api/admin.ts` 加 `invalidateLabelCaches()`（`/api/labels` + `/api/admin` + `/api/assets`）在四个写函数**成功后**调用（同 `api/stars.ts` 范式）· 验证 = 缓存级直证 + 真页 E2E（创建→立现→改名→立变→删除→立隐，全程不刷新）+ **反证** + dogfood G15 —— 明细见批 design **§9.8** |
| **F203** | design §4.1 (e)(f) | 两图指向 §5.1，但该处**未列 `types[]` 出参**（实现者会漏取数） | **最小加性补** `overview.types[]`（`admin/overview.ts` + `admin.test.ts` 断言） |
| **F204** | 审计查询 | `select().from(auditLog)` **无 join ⇒ 拿不到「姓名」**（D48 要求工号 + 姓名同列） | 补 `leftJoin` 出 `actorName`（`audit/query.ts`）+ 测试 |
| **F205** | i18n（实现面） | **AdminAssets 19 处 + AdminAudit 9 处**硬编码中文（含 `aria-label` / `title` / `placeholder` / 空态 / 抽屉字段名）+ **1 行 stale DEV 提示**（「状态筛选依赖改动 4，尚未实现」——改动 4 已落，属过期信息） | 全部走 i18n（**新增 17 键**：`admin.assets.*` 8 + `admin.audit.*` 8 + `common.close`）；stale 行**删除**；`doc-claims-check` ⑤ 纳入门禁防复发 |

**i18n 终态实测（口径 = `flatten(zh)` 叶子键计数）**：zh / en 叶子键 **各 536**（差集 **0**）· 本批增量 **+132**（T6⁺ 时为 525 / +121 ⇒ F210–F217 收口轮逐次重算）
（基线 **404** = 批前提交 `c44e348` 同法计数）· `board` 组 **30**（新组）· `admin` 组 **6 → 95**（+89）。
（T6⁺ 本轮净 **−9 键**：删 `creative.*` 9 + `type.*` 2 + `trend.desc` / `label.note` / `rank.sumNote` / `hero.desc` / `hero.foot` + 孤儿键 `trend.empty.downloadsWait`；加 `trend.downloadsNote` / `label.countTitle` / `label.heatTitle` / `hero.title`）

### 5.1 F206 · 侧栏激活唯一性（用户报缺陷 · 2026-09-23 · 含正反双证）

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F206** | 侧栏激活判定（`apps/web/src/components/ui/SideNav.tsx`） | 用户原话：**「先点击管理看板，再点击资产管理，管理看板还是选中的状态」**。根因 = 判定 `EXACT_MATCH_PATHS.has(to) ? pathname === to : pathname.startsWith(to)`（集合 = `/` + `/dashboard`）⇒ **手维护精确集漏 `/admin`**（管理组分区父项）⇒ `/admin/*` 任一子页与父项**双亮**。同坑 M4b-3 T9④ 已在 `/dashboard` 上踩过一次（当时靠往集合里补一条止血）⇒ **形态性复发** | 收敛为**全精确匹配**：删 `navItems.EXACT_MATCH_PATHS` · `isActive = pathname === to` · 门户 `<NavLink to>` 补 `end`（同源 `aria-current` 前缀问题）；dogfood **G12** 常驻断言（防第三次） |

**正证（修后 · 桌面视口 1440）**：`SMOKE_ONLY=G12` ⇒ `✅ PASS 16 · FAIL 0`（15 条 G12 断言 + `NO JS ERRORS`）
```
PASS G12.9  /admin          active=["/admin"]
PASS G12.10 /admin/assets   active=["/admin/assets"]
PASS G12.11 /admin/reviews  active=["/admin/reviews"]
PASS G12.12 /admin/audit    active=["/admin/audit"]
PASS G12.13 /admin/labels   active=["/admin/labels"]
PASS G12.14 /search 无对应条目 ⇒ 0 条激活   active=[]
PASS G12.15 F206 回归：/admin/assets 下「管理看板」不激活
```
**反证（临时改回旧逻辑 · 同脚本同断言）**：`❌ PASS 11 · FAIL 5` —— 5 条**逐条复现双亮**（精确对应根因，非猜测）：
```
FAIL G12.10 /admin/assets   active=["/admin","/admin/assets"]
FAIL G12.11 /admin/reviews  active=["/admin","/admin/reviews"]
FAIL G12.12 /admin/audit    active=["/admin","/admin/audit"]
FAIL G12.13 /admin/labels   active=["/admin","/admin/labels"]
FAIL G12.15 F206 回归：/admin/assets 下「管理看板」不激活   active=["/admin","/admin/assets"]
```
> 反证为**临时改动**：跑完已还原（`sha256` 前后一致）⇒ 工作区只保留修复版。
> 注：`G12.9`（`/admin` 自身）在反证中 **PASS** —— 与根因一致（父项前缀不匹配子页路径），也解释了「只有从看板跳到子页才看得出问题」。
### 5.2 F207 · 顶栏标题漏项（用户拍板「甲」：顶栏回归官方 block 形态）

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F207** | 顶栏标题区（`apps/web/src/components/ui/TopBar.tsx`） | 用户原话：**「点击侧栏『管理看板』『资产管理』，topbar 没有显示对应的名称」**。根因 = `titleOf(pathname)` 是**手维护「路由 → 标题」表**（M4b-2 `9220a72` 建立，只登记 `/admin/reviews|audit|labels` 三条），**漏 `/admin` 与 `/admin/assets`** ⇒ 两页 `return null` ⇒ 标题区整块不渲染。**同族第 2 次**（F206 = 侧栏精确集漏 `/admin`） | **用户拍板「甲」（不补两条，直接删表）**：官方 `registry:ui` 63 件**无** header/topbar 件；顶栏只存在于 **block 示例源码**且标题**写死**（`dashboard-01` 的 `<h1>Documents</h1>` · `sidebar-07` 顶栏 Breadcrumb 每页硬编码）⇒ 官方**无「路由 → 标题」机制**。删 `titleOf` + `<h1>` + `Separator`（原为「触发钮 ↔ 标题」分隔符）⇒ `TopBar.tsx` **110 → 82 行**；页面名只在**页内**（每页均有 `PageHeader`/`<h1>`）；副产物 = 消除「顶栏标题 + 页内标题」同字重复 |

**修复前实测（探针 · 真浏览器 CDP · 超管 · 桌面视口 1440 · 读 `header h1`）**
```
path                  header h1（修前）    内容区标题
/admin                ❌ null（无标题）      管理看板（PageHeader）
/admin/assets         ❌ null（无标题）      资产管理（h1）
/admin/reviews        审核管理 ← 重复        审核管理（PageHeader）
/admin/audit          审计日志 ← 重复        审计日志（h1）
/dashboard/assets     我的资产 ← 重复        我的资产（PageHeader）
/skills · /mcps · …   技能中心 / MCP 中心…   同名（重复）
```
**正证（修后 · 全量）**：`✅ M4b-6 dogfood: PASS 71 · FAIL 0 · CDP 超时 0`；G13 逐路径读数（摘）：
```
PASS G13.10 /admin           bar=null main="管理看板"
PASS G13.11 /admin/assets    bar=null main="资产管理"
PASS G13.12 /admin/reviews   bar=null main="审核管理"     ← 重复消除
PASS G13.15 顶栏 h1 计数 = 0（甲口径：页面名只在页内）
```
**反证（临时把 `TopBar.tsx` 还原为 HEAD 版（含 `titleOf`）· 同脚本同断言）**：`❌ PASS 4 · FAIL 12`
```
FAIL G13.2  /skills         bar="技能中心" main="技能中心"     ← 顶栏 + 页内 同字重复
FAIL G13.6  /dashboard      bar="个人工作台" main="个人工作台"
FAIL G13.12 /admin/reviews  bar="审核管理" main="审核管理"
FAIL G13.15 顶栏 h1 计数 = 0                                ← 旧版顶栏确有 h1
（PASS 4 = /search（官方表本无此项）+ /admin + /admin/assets（正是 F207 两页：旧版顶栏无标题而页内有）
  + NO JS ERRORS ⇒ 说明 G13 的守护对象 = **甲口径**（顶栏不得再有标题），F207 本身以「删机制」闭项）
```
> 反证为**临时改动**：跑完已还原（`sha256` 前后一致）⇒ 工作区只保留「甲」版。

> **收口全量**（修后 · 两次）：F206 后 `PASS 56 · FAIL 0`（G1–G12）· F207 后 `PASS 71 · FAIL 0`（G1–G13）· T6⁺ 后 `PASS 84 · FAIL 0`（G1–G14）—— 均为**非分段**全量。

### 5.3 T6⁺ 管理看板重做（用户逐条拍板 · 2026-09-23 深夜）

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F208** | 看板「累计下载」卡副行（`AdminBoard.tsx` + `admin/overview.ts`） | **自检发现（非用户报）**：副行「近 7 天新增 X 次」由**趋势响应切片**算（`points.at(-8)`）⇒ 用户把时间档位切到「近 7 天」时该序列只有 7 个点 ⇒ `at(-8)` 越界取 0 ⇒ 显示**累计总量**。实测双证：30 天档 `20 次`（正确）· 7 天档 `38 次`（错误，真值 20） | **服务端加固定窗口字段** `kpi.downloads7d`（含今天 7 个自然日 · `Asia/Shanghai` 日界，与趋势曲线同口径 · `countDownloadEventsInLastDays` 复用 `shiftDay`/`shanghaiToday`）；前端副行改读该字段 ⇒ **与档位无关**。落点：`trends.ts`（helper）+ `overview.ts`（查询与出参）+ `api/admin.ts` + `AdminBoard.tsx` + `admin.test.ts`（窗口专条：3 天前 2 条计入 / 30 天前 1 条不计 + 独立复算一致）。dogfood **G14.4/G14.5** 守护 |
| **F208-A** | 排行榜卡头层叠（`AdminBoard.tsx`） | **用户报缺陷**：三口径按钮「人 / 资产 / 标签」**悬浮在顶栏之上**（点击与布局均正常 ⇒ 纯**层叠顺序**缺陷）。根因 = 官方那段按钮类名自带 `relative z-30`（官方 demo 无 sticky 顶栏 ⇒ 无冲突），本仓 TopBar = `sticky top-0 z-20`（F207 定稿形态）⇒ `30 > 20`。全仓实测 `z-30` **仅此一处** | **卡级加 `isolate`**（`isolation:isolate`）把 `z-30` 关进卡片；**官方按钮写法零字符改动**、卡内「按钮压图表」关系保持。正反双证（`elementFromPoint` 同一点）：修前命中 `BUTTON`（`人34`）· 修后命中 `HEADER`。dogfood **G14.6** 守护 |
| **F215** | 标签名解析链（`labels/service.ts::pickDisplayName` + `AdminLabels.tsx::displayNameOf`） | **自测试追根发现（2026-09-24 · 用户可见）**：注释承诺「locale 精确 → **主语言前缀（`zh-CN` → `zh`）** → `en` → slug」，实现第 ② 步只做 `x.locale === primary`（**只认精确 `zh`**）⇒ 管理页写入 `zh-CN`（落库归一 `zh-cn`）后三步全不匹配 ⇒ 中文请求落 `en` ⇒ 门户/市场标签 chip 与卡片标签名**中文界面显示英文**（实测 `agentic`⇒`Agentic`、`software`⇒`software`）；管理页「显示名」列同因回退 | `pickDisplayName` 补 `normLocale` + **主语言前缀**一级（精确优先于前缀）· 前端 `displayNameOf` 同链 · 用例 5 单元 + 1 端到端 · dogfood **G8.7**（真库四行 `zh*` 逐条命中）+ 反证 · **规范层 docs/06 v1.6** |
| **F214** | 标签定义页删除确认（`AdminLabels.tsx`） | **收口复核发现（2026-09-24 · F212 同类）**：服务端 `deleteLabel` 的两条拒绝路径**有序**（① 有子标签 `label.parent.has_children` ② 任一状态挂载 `label.in_use`），UI 只前置了 ② ⇒ 「**有子标签 + 零挂载**」会「说可删、点删被拒」（真库不可复现：唯一父标签 `agentic` 同时有挂载） | `delTarget` 改吃 `TreeRow`（顺带去 2 处 `as unknown as` 双重断言）· 弹窗四支文案（优先级同服务端）· 禁用条件补 `hasChildren` · dogfood **G8.6 数据自适应双例**（按数据特征挑行，不写死行号）· i18n +1 键（叶子键 **527** · 本批 **+123**） |
| **F213** | 门禁脚本 G3.5（`m4b6-governance-dogfood.ts`） | **自测试发现（2026-09-24 · 假红）**：断言「扇区填色 == 图例填色」用**长度相等** ⇒ 真库出现 **0 计数值的一级标签**（手动建的 `software`/`hardware`）时，图例列全行（4）而环图**不渲染 0 长度扇区**（recharts 行为，同「零高柱不渲染 rectangle」族）⇒ 扇区 2 ≠ 图例 4 ⇒ 假红（**非代码回归**） | 改**数据感知**：行序基准 = `overview.labels[]`；扇区期望 = `count > 0` 行的图例色（按序）；补「图例行数 = 一级标签行数」「雷达点数 = 行数」⇒ 更健壮且更强。反证：扇区期望错位 1 位 ⇒ FAIL |
| **F212** | 标签定义页删除确认（`AdminLabels.tsx`）+ `GET /api/labels/all` | **收口复核发现（2026-09-24）**：`assetCount` 改「仅 `ACTIVE`」后与删除守卫（任一状态拒删）之间缺 UI 前置 ⇒ 标签只挂 `HIDDEN`/`ARCHIVED` 时页面显示「未挂载任何资产」、删除钮可点，点删 400 `label.in_use`。**真库现状：该状态 0 条**（实测 SQL）⇒ 潜在缺陷（治理动作会把它变现实） | `/all` 加性补 **`mountCountAny`**（任一状态 · 恒 ≥ `assetCount`）· 标签页禁用条件 + 三段文案 · 服务端用例（仅挂 HIDDEN）· dogfood **G8.5/G8.6**（反证：翻期望 ⇒ FAIL） |
| **F211** | 资产页分页 URL（`AdminAssets.tsx` · design §4.8b） | **收口复核发现（2026-09-24）**：设计 v0.9 拍板「本页跟控制台口径 `limit`/`offset`」，实现走门户 `useMarketQuery` 的 `?page=` ⇒ 拍板未落地 | **改设计**（F211 定案：接受 `?page=`）—— 复用共享 hook 的页码/防抖/竞态/回退同步；强改需给共享 hook 加模式开关 + 回归门户三页，收益远小于风险。§4.2/§4.8b 改写 + 撤回 v0.9 条 + 登记为接受项 |
| **F210** | 门禁脚本（`docs/smoke/scripts/m4b6-governance-dogfood.ts`） | **提交后核验发现（门禁腐化）**：4 张看板截图**字节完全相同** ⇒ 回查证实 **4 条空断言** —— ① G2.2 断言的文案「真库暂无下载历史」已随 T6⁺ 换靶消失（`!includes(...)` **恒真**）② G2.3 用 `document.querySelector('select')` 切档位，而本轮档位已改官方 `Combobox`（页上 `<select>` 数 = **0**）⇒ 切换从未发生，「两图仍在」**恒真** ③④ G4.1/G4.2 用 `textContent.trim() === '标签'` 定位按钮，而按钮文案实测 = 「人34/资产1559/标签3」⇒ 匹配 **0 个**、口径从未切换，「条形 ≥1」**恒真** | ① G2 重写：官方 Combobox 真实换档 + **硬证据**（X 轴首刻度龄 25 → 6 → 25 天）② G2.2 改题注数值态 ③ G4 改 `button[data-active]` + 前缀匹配定位 + 断言「柱数 = 端点非零条数」（零高柱不渲染 rectangle 的口径已注释）④ 截图改拍有区分度的状态（`g2-board-trend-7` / `g4-board-rank-label`）⑤ 两条**反证**（翻期望 ⇒ FAIL）证明判别力 ⑥ 全量 **84 → 88 PASS** |
| **F209** | 门禁脚本（`docs/smoke/scripts/doc-claims-check.ts`） | **自检发现（盲区）**：「i18n 本批新增键数」断言按**声明式措辞锚定**（`本批 **+N 键`）—— 只保证「文档多处写的数一致」，**不校验是否等于真值** ⇒ T6⁺ 删键后文档 `+130 / 各 534 / board 39` 全已漂移，门禁仍 **44/0 假绿** | ① 断言补**绝对值锚**（叶子键「各 N」与 `board` 组「N」两条，真值取 `flatten(zh)` 实数）② 期望值改实测 **+122** ③ 文档 §7.2 改实测值 |

**代码侧 18 维自检（标准档 · `A×0.40 + B×0.30 + C×0.30`）**

| 阶段 | A 基础 | B 深度 | C 工程 | 综合 | 门槛 |
|------|:--:|:--:|:--:|:--:|:--:|
| 重做轮首检（未修） | 8.750 | 8.125 | 8.350 | **8.44** | ✗ 未达 ≥9 |
| 修 F208 / F208-A + 清注释腐化与数字漂移 + 文档同步 + G14 落定后 | 9.000 | 9.250 | 9.150 | **9.14** | ✓ |
| 最高档复审（四轮审查法 + R4 合并刀：上卷口径单点化 / 孤儿键删除） | 9.000 | 9.250 | 9.250 | **9.15** | ✓ |
| **F210 发现后**（提交后核验：4 条空断言被证实）—— C5 下调至 8.5（空断言不计入证据） | 9.000 | 9.250 | **9.200** | **9.14** | ✗ 不达（C5 被下调） |
| **F210 修复后**（G2/G4 换真断言 + 两条反证证明判别力）—— C5 回到 9.0 | 9.000 | 9.250 | 9.250 | **9.15** | ✓ |

首检问题清单（12 项，逐条已闭环）：🔴 F208（档位污染）· 🟡 注释腐化 5 处（文件头 3 + `api/admin.ts` slug 1 + `renderLabelDot` 1）· 🟡 孤儿注释 1 处 · 🟡 数字声明漂移 2 处（`overview.ts`「4 条并行」实为 **10 条**查询 · i18n 键数）· 🟡 前端 3 处 `config`/内联件每渲染重建（已 `useMemo` + 提件 `HeroPanel`）· ⚪ 双重类型断言 1 处（已收单次）· 🟡 文档未同步（本文件 + 批 design/plan + 主 design + `docs/00`）· 🟡 dogfood 6 条旧断言（已重写 + 追加 G14）。
**口径说明**：上一轮给**批 design 文档**的 8 维 **9.50** 与本轮**代码** 18 维不同靶，不构成同分重报；文档侧本轮复评见批 design §11.2 = **9.44**。

### 5.5 F217 · 编辑标签保存不生效且无提示（用户报缺陷 · 2026-09-24 · **已修并验证**）

**现象（用户逐字）**：「编辑标签『通讯』的父级为『软件』的时候，保存不生效，也不提示错误。无法编辑成功」

**根因链（三段 · 逐段有码为证）**：

1. **服务端按设计拒绝**（**该规则已于同日 F218 放开——见 §5.6**）：`labels/service.ts::updateLabel` 首条校验 =「**一级不可降级**」（06 §5.2 锁两级；原 `parentId=null` + 新 `parentSlug` 非空 ⇒ 抛 `label.invalid_parent`），且在**事务之前**抛出 ⇒ 整笔编辑（连改名）都不生效。
   接口实锤（真页 SUPER 会话）：`PATCH /api/labels/communication {parentSlug:'software'}` ⇒ **HTTP 400 `label.invalid_parent`**；
   仅改翻译（不带 `parentSlug`）⇒ **HTTP 200** ✓（说明并非接口坏）。真库复核：`communication`(通讯) `parent_id = NULL`（一级）。
2. **前端静默**：`AdminLabels.tsx::submitForm` / `confirmDelete` 只有 `try { … } finally { setBusy(false) }` —— **无 `catch`** ⇒ 400/409 被吞。
   仓内范式（对照证据）：`StarButton.tsx:69` · `AssetAdminCard.tsx:100` = `toast.error(tErr(err instanceof ApiError ? err.code : 'network'))`。
3. **前端缺前置 + 缺文案**：编辑一级标签时「父级」下拉未禁用；`errors` 组里 `label.*` **只有 `limit_exceeded` 一条有中文**（其余 9 码无文案）。

**修复**：① 两个写函数补 `catch` ⇒ `toast.error(tErr(code))`；② 编辑一级标签 ⇒ 父级下拉 `disabled` + 「一级标签不可降级」说明；
③ 补齐全部 **10 个** `label.*` 错误文案（zh/en）+ `parentHint` 写全两条规则（i18n 叶子键 527 → **536**）。

**验证（真页 · 含反证）**：dogfood **G8.8**（一级禁用 `true` / 二级可用 `false` · 正反同断言）· **G8.9**（说明文案命中）·
**G8.10**（用已存在 slug 创建 ⇒ 409 ⇒ 断言可见 toast「该标识已被占用，请换一个」+ 弹窗不关闭）；
**反证**：去掉 `submitForm` 的 `catch` ⇒ G8.10 `toast=null` **FAIL**（判别力证实，跑完已还原 · 哈希一致）。
⇒ 全量 dogfood **97 → 100 PASS**。

**状态**：**已修并验证**。**边界（如实登记）**：本条只修「不静默 + 前置 + 文案」；
「一级标签能否降级」属**规则本身**（06 §5.2 契约）⇒ 用户当天拍板**放开**，
已由 **F218**（§5.6）落地，规范层 `docs/06` **v1.7** 同步。

### 5.4 F216 · 标签写后刷新（用户报缺陷 · 2026-09-24 · **已修并验证**）

**现象（用户逐字）**：「标签定义--创建标签--标签不显示，需要刷新才显示。」

**根因链（逐环有码为证）**：

1. `apps/web/src/api/client.ts` 有一层**语言感知的 Promise 缓存**：`responseCache: Map<`${lang} ${path}`, Promise>`；
   `apiGet()` 默认走缓存（`opts.cache !== false` 命中即返回旧 Promise），并导出 `invalidateCache(prefix?)` 供写面失效。
2. `fetchAllLabels()` = `apiGet('/api/labels/all', opts)` —— **未传 `cache:false`** ⇒ 走缓存。
3. 标签页写后重取**逻辑本身没错**：`submitForm()` 成功后 `setTick(v=>v+1)` → `useApi(loader,[tick])` 重跑 →
   `fetchAllLabels()` **再次命中同一份缓存 Promise** ⇒ `data` 内容不变 ⇒ `setRows` 拿到旧行集。
4. 整页刷新 = 模块重新初始化（缓存空）⇒ 才拿到新数据 —— 即「要刷新才显示」。
5. **对照证据（决定性）**：仓内其他写面都有失效 —— `api/stars.ts` → `/api/assets` · `pages/Tokens.tsx` → `/api/tokens` ·
   `ReviewDetail/Submissions` → `/api/reviews` · `AssetAdminCard` → `/api/assets` · 登录/登出 → 全量清；
   **唯 `api/admin.ts` 的 `createLabel / updateLabel / deleteLabel / reorderLabels` 零失效调用**。

**影响面（四消费者 · 同源）**：① 标签定义页自身（创建/编辑/删除/排序保存）② 看板标签维度两图（`/api/admin/overview`）
③ 门户筛选 chip 与公开列表（`/api/labels`）④ 资产卡内嵌标签名（`/api/assets`）。

**修复设计（定案）**：落点 `api/admin.ts`（与 `api/stars.ts` 同范式：失效收口在 api 层，覆盖所有调用者），
新增内部 `invalidateLabelCaches()` = `invalidateCache('/api/labels')` + `invalidateCache('/api/admin')` + `invalidateCache('/api/assets')`，
在四个写函数**成功后**调用；服务端零改动 · 无新依赖 · 无新 i18n 键。

**验证方案**：① 缓存级直证（写后 `apiGet` 立即取到新行数）② 真页 E2E（创建→列表立现→改名→行内立变→删除→即刻消失，**全程不刷新**）
③ **反证**（注释掉失效 ⇒ 断言必 FAIL）④ dogfood 新增 G15（写后即见）+ 八步门禁 + 四脚本零回归；临时标签自建自清。

**状态**：**已修并验证**（2026-09-24）。

**落地与验证留档**：
- 代码：`apps/web/src/api/admin.ts` 加 `invalidateLabelCaches()`（三前缀）+ 四个写函数成功后调用（199 行 · 净 +33/−4）。
- 修前复现（真页）：建标签后 **未刷新读 6 条（不含新标签）** · 刷新后 7 条 ⇒ 用户所述「要刷新才显示」实证。
- 修后真页正反双证（**全程 SPA 路由、未整页刷新**）：
  | 断言 | 修复在场 | 反证（失效改空实现） |
  |---|---|---|
  | 标签定义页列表立现 | ✅ `行 6 → 7` | ❌ `6 → 6`（旧值） |
  | 门户 chip 立现 | ✅ 「门户探针」出现（chip 21 → 22） | ❌ 不出现 |
  | 数据层（`/api/labels/all`）新鲜 | ✅ 含新行 | ❌ 不含 |
- 永久守护：dogfood **G15**（5 条 · 全程 SPA 路由 · 提交走对话框 DOM 点击 · 自清临时标签）
  ⇒ 本批断言 **92 → 97 PASS / 0 FAIL**。
- ⚠️ 方法学教训（已记）：临时探针**不要每次重新登录**（登录限流 20 次/15 分钟 · 内存计数 ⇒ 本轮即被打满，
  表现为整段 401 连带失败）；改用「一次登录复用会话」或直接跑 dogfood 段（`SMOKE_ONLY=`）。

### 5.6 F218 · 一级标签可重挂（用户拍板「②」· 2026-09-24 · **已修并验证**）

**背景**：§5.5（F217）只修了「不静默 + 前置 + 文案」；「一级标签能否降级」属**规则本身**（06 §5.2 契约）。
用户真页自测确认 F217 后逐字拍板：**「验证成功了。现在就落2」**。

**规则变更（相对兄弟仓 SkillHub 契约的偏离 · 明写）**：SkillHub 契约 = 「**一级不可降级 / 不可重挂**」；
本仓放开**一级重挂**（原一级 → 挂到另一个一级下变二级），理由 = 一级**误建后原路径只有「删除重建」**，
而删除在**有挂载**（`label_in_use`）或**有子级**（`label.parent.has_children`）时均被拒 ⇒ 运营**无法归位**。
重挂只改结构、不动挂载/翻译/排序，且仍受锁两级约束（目标必须一级、自身必须无子级）。

**落点（4 处）**：
- 服务端 `apps/server/src/labels/service.ts::updateLabel`：删「一级不可降级」硬拒 → **安全重挂**；
  前置 = **自身无子级**（否则 400 `label.parent.has_children` —— 否则会把子级顶到三级/造孤儿）；
  **守卫顺序在 `resolveParent` 之后**（自指 / 目标非一级先报更具体的 `label.invalid_parent`）。
- 前端 `apps/web/src/pages/AdminLabels.tsx`：编辑一级标签的父级下拉**放开**；候选 = 一级标签且
  **排除自身**（服务端 `resolveParent` 拒自指）；仅「**有子级**」的标签禁用 + 说明（与服务端同面）；
  `editing` 改吃 `TreeRow`（读 `hasChildren`）。
- i18n `zh.ts` / `en.ts`：`parentHint` 改「留空=一级；选一个一级=挂在它下面（两级内）」·
  `parentLockedHint` → `parentHasChildrenHint` —— **键数不变**（doc-claims 绝对值锚不动）。
- 规范层 `docs/06-label-system.md` **v1.7**：§5.2 增「一级可重挂」条 + blockquote 偏离说明；修订表 v1.7 行。

**服务端用例（`bun test src/http/labels.test.ts`）· 27 pass / 0 fail**（新增 F218 用例 5 步）：

| 步 | 场景 | 期望 | 实测 |
|----|------|------|------|
| ① | 无子级一级 → 挂到另一个一级下 | 200 · 响应 `parentId` = 新父 slug | ✅ |
| ② | 该标签再 `parentSlug: null` | 200 · 回一级 | ✅ |
| ③ | 目标是**二级**标签 | 400 `label.invalid_parent`（锁两级不变） | ✅ |
| ④ | 自身**有子级** | 400 `label.parent.has_children` | ✅ |
| ⑤ | 重挂后 DB | `parent_id = null`（纯结构变更） | ✅ |

**真页往返（dogfood · 真对话框 · 全 SPA 路由）**：

| 断言 | 修复在场 | 反证（去掉「自身无子级」守卫） |
|---|---|---|
| G8.8 无子级一级：下拉**可用** + 候选**不含自身** | ✅ 候选 `["—","智能体","软件","硬件","测试","公共","人事","通讯"]`（9 个一级 · 无自身） | — |
| G8.9 三态：有子级一级**禁用** + 说明 / 二级**可用** | ✅ `agentic=true hint=true` · `agentic-rag=false` | — |
| G8.11 挂到一级下（真对话框保存） | ✅ 服务端 `parentId` = `agentic` | — |
| G8.12 改回一级（**自清**） | ✅ `parentId = null` | — |
| 服务端用例 ④ | ✅ 400 | ❌ 注入后 **FAIL**（200）：本文件 `25 pass / 2 fail`（连带「删除带子级一级」—— 注入态下 3 级树污染同文件后续用例；跑完已还原 · 哈希一致） |

**收口读数**：全量 dogfood **100 → 102 PASS / 0 FAIL**（G1–G15 · G8 段 14 条）· 八步门禁全绿
（`typecheck` / `lint` / `format:check` / doc-audit **113** / doc-claims **46** / `test` **598 pass · 1 skip · 0 fail**）。
**零回归**：四脚本串行 **`m4a` 58/2 · `m4b3` 38/3 · `m4b4` 83/6 · `m4b5` 52/10** = 逐项等于 T10 基线（零漂移）。

**⚠️ 过程留痕（真库一次留脏 + 已复原 · 如实登记）**：G8.12 首版探针在**已展开**的行上又点了一次
`toggle` ⇒ 反而**折叠** ⇒ 子行不在 DOM ⇒ 复原步骤未执行，真库 `m4b4-seed-privileged` 一度挂在 `agentic` 下。
已用一次性脚本**复原**（`parent_id = null` ✓ · 全表回原状：仅 `agentic-rag` 挂 `agentic` ✓），脚本已删；
探针改**幂等** `openEditBy`（先试开 → 找不到才展开父行）+ 自清失败时打印告警与复原 SQL ⇒ 复跑 **14/14** ✓。
**教训**：**折叠/展开是同一按钮的切换、不幂等** —— 探针必须先判定当前态再决定是否点击。

### 5.7 F220 · `m4a` 两条断言过时（收口轮 · 2026-09-24 · **含正反双证**）

**定性（真页 + 源码双证）**：原断言 ① 找字面词 `MODIFIED`/`ADDED`/`DELETED` ② 全页 `innerText` 含 `searchByPrefix`。
真值已变 —— diff 文件行的**类型标记**由 `+N/−M` **签名**承载（`apps/web/src/components/ui/DiffWorkspace.tsx`：折叠行 = `▸<path>+N −M` 的 `button`；
展开后 = `<section aria-label="<path> +N −M">` 内含真 diff 行）⇒ ① **恒假红**；② 的命中来自右侧「**变更历史**」文案 = **假命中**（同 F219「断言取全文而非真源」病灶）。

**正反双证（同一真页 · 只读 · 一次性探针）**：

| 态 | 观测 | 断言应为 |
|----|------|---------|
| (a) 未展开 diff | 文件区文本长度 **0** | 假 ✓ |
| (b) 展开「**只删**」行（`reference/guide.md +0 −5`） | 该区长度 **69** · 含 `searchByPrefix` = **false** | 假 ✓（证明取样有区分度） |
| (c) 展开「**只增**」行（`scripts/search.mjs +4 −0`） | 该区长度 **136** · 含 `searchByPrefix` = **true** | 真 ✓ |
| (d) 全页 `innerText` | `MODIFIED`/`ADDED`/`DELETED` = **false** · `searchByPrefix` = **true** | 断言①恒假 / 断言②假命中的直接证据 ✓ |

**处置**：① 「三类变更」按**签名**断言（修改 = 有增有删 / 新增 = 只增 / 删除 = 只删 · 文件行从 DOM 读，**不写死**文件名与数字）② 「+− 行内容」改**先展开「只增」行**、只在**该文件 diff 区内**取证（幂等兜底：读不到再点一次）⇒ `m4a` **58/2 → 60 PASS / 0 FAIL** ✅

**扫类（修 1 处 → 扫同类 · 全仓 `docs/smoke/scripts/`）**：① 「断言找**全大写字面词**」同型 = **0 处**（`grep -rnE "includes\\(['\"][A-Z][A-Z_]{3,}['\"]\\)" `）② 全页 `innerText` 取证点 **33 处**（实测），其中本笔已修 1 处；其余多为「整页级别的存在性断言」（导航文案 / 标题 / 按钮），判据 = 「被搜字符串在**同一页是否存在第二个来源**」—— 若只有一个来源则非假命中，故**不逐条改写**。

### 5.8 收口轮 · 证据 §8 item **⑦⑧** 形式缺口闭环（2026-09-24 · **写库已授权** · 造数 → 断言 → **自清**）

**为什么要造数**：两项缺口都是「真库无对应数据 ⇒ 代码分支从未被执行」。只读盘点**实测**：一级标签 **7** 个 · 「仅挂非 `ACTIVE` 资产」的标签 **0** 条 ⇒ 与 §8 item ⑦⑧ 的登记**一致**（缺口为真，非猜测）。

**造数脚本（自带 · 一次性 · 逆序自清）**：`docs/smoke/scripts/m4b6-probe-colorpool-and-hidden-mount.ts`（`--verify` 只读盘点 / `--seed` / `--clean`，共 **196** 行）。
写入 = **14 个零挂载一级标签**（`m4b6-probe-color-01…14`）+ **1 个「仅挂 `HIDDEN` 资产」的标签**（`m4b6-probe-hidden-mount` + 1 个 `HIDDEN` 资产 + 1 条 `asset_label`）；造数后一级标签 **7 → 22** · 资产 **53 → 54**。
**自清后逐项回落**：一级标签 **7** · 我方 0 标签 / 0 资产 / 0 挂载 · 资产 **53** ✅（脚本内建自检：我方条目未归零 ⇒ 退出码非 0）。

**真页 + API 实证（探针 **22 PASS / 0 FAIL** · 在**最终脚本字节**上复跑）**：

| 项 | 断言（真值口径） | 实测 |
|----|------------------|------|
| ⑦-A1 | `overview.labels[]` = 一级标签**全集**（含零挂载） | **22** 行 ✓ |
| ⑦-A3 | 我方 15 行 `count` 全 0（色池不依赖是否有挂载） | ✓ |
| ⑦-B1 | 两图图例各行数 = **22 / 22** | 实拍 44 个色点 ✓ |
| ⑦-B2 | 图例 index `13..21` 取色**换圈** = index `0..8` 同色 | `[13]=var(--chart-1)`=`[0]` · `[21]=var(--ava-4)`=`[8]` ✓ |
| ⑦-B3 | 前 13 行取色**互不相同**（池长确为 13 · `chart-1…5` + `ava-1…8` 全用上） | distinct **13** · 池序逐项等于源码声明 ✓ |
| ⑦-B4 | 第 12 与第 13 行**不同色**（池长下界 = 13，非更短） | `[12]=var(--ava-8)` ≠ `[13]=var(--chart-1)` ✓ |
| ⑦-B5 | 13 色**解析后 rgb** 亦互不相同（令牌无撞色） | distinct **13** ✓ |
| ⑦-B6 | 图例文本与端点行序对齐（index 7..21 = 我方 slug） | `[7]=m4b6-probe-color-01 · 0` ✓ |
| ⑧-A1 | `/api/labels/all` 该标签 `assetCount 0` · `mountCountAny 1`（F212 字段） | ✓ |
| ⑧-B1 | 真页删除弹窗走**第三支**「仍被 1 个资产挂载（含已隐藏/已归档）」 | 逐字命中 ✓ |
| ⑧-B2 | 解挂指引同面「请先在资产上解挂」 | ✓ |
| ⑧-B3 | 「确认删除」钮**禁用** —— `disabled=true` · `opacity 0.5` · `pointer-events:none` | ✓（截图仍显 `destructive` 红底 ⇒ **禁用真值以 DOM 为准，不采目视**） |
| ⑧-B4/5 | **对照组**（零挂载标签）走第四支「该标签未挂载任何资产…」+ 按钮**可用**（`disabled=false` · `opacity 1`） | ✓ 证明文案与禁用按**数据分支**，非固定串 |

**截图（真页 · 造数在位时留证）**：`docs/smoke/m4b6-27-board-22labels.png`（看板图例 22 行）· `docs/smoke/m4b6-27-board-22labels-full.png`（整页）· `docs/smoke/m4b6-27-delete-hidden-branch.png`（删除确认第三支）。

## 6. 零回归（口径 = 无新增失败 · design §9.1）

**执行方式**：**串行逐脚本**（首轮并发无效，见下注）。结果与**逐条定性**：

| 脚本 | 串行实测 | 失败项定性（附证据） |
|------|---------|--------------------|
| `m4b6-governance-dogfood.ts`（本批） | **102 PASS / 0 FAIL / 0 超时**（G1–G15 · **F218 后基数**；零回归当期跑的是 41 基数版本 —— 追加段只新增断言，不覆盖四脚本的断言面） | — |
| `m4a-dogfood.ts` | **58 PASS / 2 FAIL** + `NO JS ERRORS`（**2026-09-24 造数复位后复跑：不变** = 与造数无关） | `diff 三型徽章` / `diff +/− 行内容` —— 变更对比面，需**两份可比版本**前置 ⇒ **数据态** → **2026-09-24 定性并修复（F220）：断言过时（真值口径已改 `+N/−M` 签名）⇒ 修为真值口径 + 真源取证 ⇒ 60 PASS / 0 FAIL ✅** |
| `m4a-chain-smoke.ts` | **`CHAIN SMOKE PASS`**（14s · 全绿） | — |
| `m4b3-personal-a-dogfood.ts` | **38 PASS / 3 FAIL** → **2026-09-24 复位后 43 PASS / 0 FAIL** ✅ | 3 条全为「**无 PENDING 行**」，且脚本自述「**请先重跑造数脚本复位**」⇒ **数据态**（自证） |
| `m4b4-personal-b-dogfood.ts` | **83 PASS / 6 FAIL** → **2026-09-24 夹具复位 + 断言修（F219）后 89 PASS / 0 FAIL** ✅ | ① `G6 ownRows=3 · 全表 rows=5`（断言只认本批 `m4b4-seed-` 行）② `G8 匿名可下载`（无受控下载链）③ `G12 {"del":3,"yank":0}`（**无 PUBLISHED 行可撤回分发**）④ `G12b-1/2` = ③ 的**级联** ⑤ `G20-9 rows:11`（断言期望 6 行）⇒ 全部**数据态**；其中「全表行数」漂移**含本批种子资产**（`m4b6-seed-downloads`）⇒ 属造数叠加，非代码路径 |
| `m4b5-review-dogfood.ts` | **52 PASS / 10 FAIL** → **2026-09-24 复位后 62 PASS / 0 FAIL** ✅ | 10 条全在 `G6`/`G7`（审核详情页动作断言），取值为 `null` / `[]` ⇒ **队列无待审条目**（前轮并发跑已消耗造数）⇒ **数据态** |

> **T6⁺ / F210 之后再跑（2026-09-24 · 串行 · 同一环境）**：四脚本**逐项等于 T10 基线** ——
> `m4a` **58/2** · `m4b3` **38/3** · `m4b4` **83/6** · `m4b5` **52/10**（**零漂移**）⇒ 本批后续改动
> （看板重做 · 服务端 `labels[]` / `downloads7d` · 上卷口径单点化 · F210 门禁脚本修复）**未使这 21 条失败恶化**，
> 也未引入新失败。
>
> **结论（有证据地主张）**：**21 条失败逐条均可归到「前置数据缺失」**（每条附期望/实际差异或脚本自述），
> **无一条指向被本批改动的代码路径**（本批对既有面 = `/api/assets` 管理档加性扩参 · 标签面形态变更零消费者 · 新增表 `download_event` 独立）。
> **仍未做**：`HEAD~14`（本批首笔提交前）的**逐条代码基线对照** ⇒ 形式缺口保留（见 §8 item 4）；
> 其实质结论已由「T6⁺/F210 后再跑逐项等于 T10 基线」给出。
>
> ⚠️ **伪证据提示**：`m4b5-review-dogfood.ts` 输出里那句「`m4a-chain-smoke.ts` · `m4b3` · `m4b4`（各 0 FAIL）」
> 是脚本内的**静态文案**（G9 零回归由外部按序执行，本脚本不内嵌）—— **不是实测**，不得当证据引用。
>
> **并发执行教训（本轮）**：为省时间并行起三个 dogfood ⇒ **共用测试账号 + 登录限流 20/15min** ⇒ 相互挤掉会话，
> 结果不可采信（m4a 直接解析崩、m4b3 27 FAIL）。**正确姿势 = 串行逐脚本**。

> **② 造数复位（2026-09-24 · **写库已获用户授权** · 先只读盘点再写）**：盘点结论 = 夹具态确被历史跑测消耗 ——
> `m4b3-seed-skill@1.0.0` 任务态成 `WITHDRAWN`、m4b5 fixture 任务态漂成 `APPROVED`/`WITHDRAWN`、
> `m4b6-seed-downloads` 种子资产在位（id=10031 · 37 事件）。执行：① `m4b3-seed-submissions` ② `m4b5-seed-reviews`
> ③ `m4b6-seed-downloads --clean` → 重播（新 id=**12418** · 37 事件 · `download_count=37` 与事件数一致）。
> **回读校验**：`review_task` **PENDING 8 → 13**（可测态复位）✓ · **效果**：`m4b3` **38/3 → 43/0** ✅ ·
> `m4b5` **52/10 → 62/0** ✅ · `m4a` **58/2 不变**（与造数无关）· 本批 dogfood **102/0** 复跑不变 ✅ ·
> `m4b4` **83/6 不变**（根因见下）⇒ **21 条失败 → 2 条**。
> **③ 挂账 ① 收口（同日）**：`m4a` 两条定性为**断言过时**（真值口径 = `+N/−M` 签名 · 非字面词）并修 **F220** ⇒ **60/0** ✅；`m4b4` 六条随 **F219** 夹具复位 ⇒ **89/0** ✅ ⇒ **2 条 → 0 条**。
>
> **`m4b4` 6 条根因（只读实锤 · **非本批代码**）**：夹具 `m4b4-seed-skill` 的 **1.0.0 版本已被打成 `YANKED`** 且
> **`latest_version_id = null`**（seed 期望 1.0.0 `PUBLISHED` + 指针指向它）⇒ ① `G8 匿名可下载`（无最新版可下载）
> ② `G12 管理档 yank=0`（无 `PUBLISHED` 行可撤回）③ `G12b-1/2`（级联）④ `G6 三态各一行`；另 1 条 `G20-9`
> （期望 `/skills` **6 行** · 实测 **11 行**）= **断言写死条数**（公开 ACTIVE 资产随各批夹具累积 = 数据漂移，
> 与 F213/G3.5 同类）。**已修**（2026-09-24 · 记为 **F219**）：`G20-9` 改**端点真值**比对 + `G6` 文案改「已上线」
> + 跑 `m4b4-seed-assets` 复位版本态与 latest 指针 ⇒ **`m4b4` 83/6 → 89/0** ✅。
> **口径固化**：`m4b4-seed-assets` → `m4b4-personal-b-dogfood` 必须**成对跑**（该脚本会撤自己的分发/删版本 ⇒
> 只跑 dogfood 会在同一份夹具上二次破坏，实测踩到：单跑 → 4 条 yank 类红）。另：`m4b4` 的 `/skills` 行数、
> `m4b4` 表行数等**一律按端点真值**，不写死条数（本批同类教训 F213 / F219①）。

## 7. 出口件与截图

**件行数（`wc -l` 实测 · T6⁺ 重测）**：`AdminBoard.tsx` **840** · `AdminAssets.tsx` **625** · `AdminLabels.tsx` **574** ·
`AdminAudit.tsx` **565** · `api/admin.ts` **165** · `http/admin.ts` **67** · `http/admin.test.ts` **564** ·
`overview.ts` **169** · `rankings.ts` **135** · `trends.ts` **150** · `labels/service.ts` **708** ·
`chart.tsx` **340** · `combobox.tsx` **283** · `AdminLabels.tsx` **578** · `labels/service.ts` **727** · `api/admin.ts` **170** · `m4b6-governance-dogfood.ts` **948**（F212 + F210 后）· `m4b6-probe-colorpool-and-hidden-mount.ts` **196**（§5.8 ⑦⑧ 一次/度探针，自带自清）·（F218 后重测）`labels/service.ts` **748** · `AdminLabels.tsx` **617** · `labels.test.ts` **600** · `errors.ts` **63** · `i18n/zh.ts` **604** · `m4b6-governance-dogfood.ts` **1247**。

**截图（10 张 · `docs/smoke/`）**：`m4b6-g1-board-kpi.png` · **`m4b6-g2-board-trend-7.png`**（F210 后改拍「近 7 天」态）· **`m4b6-g4-board-rank-label.png`**（F210 后改拍「标签」口径态）·
`m4b6-g6-assets-list.png` · `m4b6-G6-assets-colhidden.png` · `m4b6-G7-assets-drawer.png` · `m4b6-g8-labels-tree.png` ·
`m4b6-g9-audit-list.png` · `m4b6-g10-audit-quick.png` · **`m4b6-g14-board-redesign.png`（T6⁺ 重做后整页）** · **`m4b6-27-board-22labels.png`** / **`m4b6-27-board-22labels-full.png`** / **`m4b6-27-delete-hidden-branch.png`**（§5.8 ⑦⑧ 闭环留证 · 2026-09-24）。

**T6⁺ 方向板与实拍（截图外的对比物料 · 桌面留档，不进仓）**：`~/Desktop/m4b6-board-direction/`（`index.html` 方向板 ·
`board-direction.png` · `board-real-page.png` 重做后真页 · `bug-zindex-overlap.png` F208-A 正反双证）。

**PoC 清理（U7 · T10 步骤 7）**：`apps/web/src/pages/__proto/`（4 页 + 3 数据文件）已删；`apps/server/tmp-dashboard-probe.ts` /
`tmp-label-seed-child.ts` / `tmp-labels-audit-probe.ts` 已删；`main.tsx` 的 DEV 路由与 `ComingSoon` 占位已移除 ⇒
`git status` 无残留。

## 8. 未证项（显式登记 · 不谎报）

| # | 项 | 现状 | 影响 |
|---|----|------|------|
| 1 | ~~`bun install --frozen-lockfile`~~ | ✅ **已补跑**（exit 0 · 无变化） | 已闭合 |
| 2 | ~~`bun run lint`~~ | ✅ **已转绿**（本批文件 2 error + 8 warning 修掉；非本批文件未动） | 已闭合 |
| 3 | ~~`m4a` / `m4b3` / `m4b5` 三脚本串行补跑~~ | ✅ **已补跑**（`m4a` 58/2 · `m4b3` 38/3 · `m4b5` 52/10 · 失败逐条定性见 §6） | 已闭合 |
| 4 | **代码基线对照（`HEAD~14` 同环境跑同脚本）** | **未做** —— 21 条失败**逐条定性为「前置数据缺失」**（附期望/实际差异 + 脚本自述），但「数据态」**不等于**已证「代码无关」 | 方法学缺口（非风险缺口）：结论表述限定为「**未见指向本批代码路径的失败**」 |
| 5 | ~~F206 / F207 修复后零回归四脚本未重跑~~ | ✅ **已重跑**（2026-09-24 串行 · 逐项等于基线：58/2 · 38/3 · 83/6 · 52/10） | 已闭合 |
| 5 | ~~零回归造数复位~~（`m4b3-seed-submissions` / `m4b5-seed-reviews` / `m4b6-seed-downloads --clean`） | ✅ **已执行**（2026-09-24 用户授权后）—— `m4b3` **43/0** · `m4b5` **62/0** · 本批 dogfood **102/0** | 已闭合（余 `m4a` 2 · `m4b4` 6 另有根因，见 §6 复位留痕）→ **2026-09-24 两者均已闭合**：`m4b4` 6 条随 **F219** 夹具复位（**89/0**）· `m4a` 2 条随 **F220** 断言真值化（**60/0**） |
| 6 | ~~T6⁺ / F210 后零回归四脚本未重跑~~ | ✅ **已重跑**（2026-09-24 串行 · 同一环境）—— `m4a` **58/2** · `m4b3` **38/3** · `m4b4` **83/6** · `m4b5` **52/10**，**逐项等于 T10 基线 = 零漂移** ⇒ 看板重做 / `labels[]` / `downloads7d` / 上卷口径单点化 / F210 脚本修复**均未影响**这四个脚本的断言面（实测，非判断） | 已闭合 |
| 7 | ~~**>13 个一级标签的 13 色池循环**~~ | ✅ **已实证**（2026-09-24 · 用户授权写库 · **§5.8**）：真库原 **7** 个一级标签 ⇒ 造 14 个零挂载一级标签（一级标签 **7 → 22**）⇒ 两图图例各 **22** 行，`index 13..21` 取色**换圈**回 `0..8`、前 13 行 **13 色互异**（含解析后 rgb）· 实测后自清回 **7** | 已闭合（一次性探针脚本 + 截图留证） |
| 8 | ~~**F212「仅挂已隐藏/已归档」分支的真页实测**~~ | ✅ **已实证**（2026-09-24 · **§5.8**）：造「仅挂 `HIDDEN` 资产」标签 + 真页删除弹窗 ⇒ **第三支**文案逐字命中 + 「确认删除」钮**禁用**（`disabled` / `opacity 0.5` / `pointer-events:none`）；**对照组**（零挂载）走第四支且按钮可用 ⇒ 分支判别力已证 · 实测后自清 | 已闭合（原服务端用例与 G8.6 覆盖保留） |
| 9 | ~~F218 重挂对看板「一级上卷」成员的影响~~ | ✅ **已证**（2026-09-24）—— 新增 dogfood **G16**（6 条）在**重挂态**下实测：原子行从一级上卷消失 · 零计数目标新父 count **0 → 1** 严格等值 · 上卷 sum **3 → 3** 守恒 · `rankings` 同面 · 真页图例行数对齐 · 复原逐字段回落；**反证**停掉重挂 ⇒ 3 条 FAIL | 已闭合（常驻断言） |
| 10 | **既有 lint warning（B) 类 · 73 条** | **未清**（登记 · 后置）：`noNonNullAssertion` 66（多数应显式判空/类型收窄而非加 `!`，且部分在测试面）· `noTemplateCurlyInString` 5（疑为**有意**的字面量模板串，如正则）· `noExplicitAny` 1 · `noDocumentCookie` 1（shadcn 目录外） | 全部 warning 级（**0 error**，不影响门禁 exit 0）；(A)+(C) 类已于 2026-09-24 清理（138 → 73） |

> ⚠️ **环境备注（2026-09-24 · 自测试 → 追根为 F215 · **已修**）**：真库新增两条一级标签 `software` / `hardware`
> （13:50 由超管账号在管理页创建）⇒ 其 zh 翻译以 **`zh-cn`** 落库（UI 表单写 `zh-CN`，服务端归一为小写）
> ⇒ 当时 `pickDisplayName` 缺**主语言前缀回退** ⇒ 中文请求落 `en` ⇒ 门户 chip 显示英文、`m4a` 两条断言 FAIL（58/2 → 56/4）。
> **F215 修复后复跑：`m4a` 恢复 58 PASS / 2 FAIL = T10 基线**（余下 2 条为本批之前已登记的失败项）✓ —— 该漂移已闭环。

> **未证项的诚实口径**：本批对既有面的**代码级影响面**已实测收窄（`/api/assets` 管理档加性扩参、非管理档逐条相同；
> 标签面形态变更无前端消费者；新增表独立）⇒ 21 条失败**逐条**都能归因到前置数据缺失，**没有一条落在本批改动的代码路径上**。
> **更新（2026-09-24 造数复位后）**：21 条 → **2 条**（m4a）；余 `m4b4` 6 条已定位为「夹具版本态被打成 `YANKED`」= 夹具态，同样非代码。
> **更新（2026-09-24 · 挂账 ① 收口后）**：**2 → 0 条** —— `m4a` 两条定性为**断言过时**（真值口径 = `+N/−M` 签名而非字面词；`searchByPrefix` 原命中来自「变更历史」文案 = 假命中）⇒ 修 **F220** ⇒ `m4a` **60/0** ✅ · 零回归四脚本 **60/0 · 43/0 · 89/0 · 62/0** 全绿。
> 但「看起来是数据态」**不等于**已证「代码无关」—— 要做实需 `HEAD~14` 同环境基线对照（成本：另起旧版 API/web 实例）。
> 该项**本轮未做**，故结论限定为「未见指向本批的失败」，不写「零新增失败 ✅」。

> ⚠️ **本轮操作教训（记账 · 2026-09-23）**：我执行 `git checkout -- docs/smoke` 清截图时，
> **连带回滚了刚写好的本条补记**（证据文件此时已是**已跟踪**文件）⇒ 已重做。
> **正确姿势 = 只回滚 `docs/smoke/*.png` 通配**，绝不整目录 checkout。
