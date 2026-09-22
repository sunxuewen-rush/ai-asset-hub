# M4b-5 审核批：审核工作台（队列 + 共享详情）—— 批计划

> Date: 2026-09-22
> Updated: 2026-09-22（**v0.12：diff 观感追加（字号/行高 · 对标 GitHub 实测）** —— ① 对标方式 = **真浏览器实测**你的 commit diff 页（`.diff-text-cell` = **12px** · 行容器 24px · 页面正文 14px）② 主题域定值 **字号 12px · 行高 20px**（字号与 GitHub 一致；行高 20px 为**有意偏离** —— GitHub 24px 在 755px 窄列下过疏）③ 两处挂载点一并生效（门户「版本」tab + 审核「变更对比」卡）④ **F195/F196** 登记（F196 = split 占位格红竖线属**上游默认渲染**⇒ 用户拍板**保留官方设计与做法、不加覆盖**，决策与关闭路径写进 `diff-tokens.css` 注释）⑤ 设计 bump **v0.14**；**待提交**）
> Updated: 2026-09-22（**v0.11：T12 文档同步落地** —— ① 批 design **v0.13**（§9.8 实测回填 **11** 项 + 未实测 **2** 项如实登记）② **主 design v1.63**：**定稿条件 ②「三族适用性实证」✅ 闭合** · **§6.3「仍留 market 面 / 不提供行级 diff」翻转订正**（diff 现代化已兑现）· §7.1 三行（`submittedByName` / 详情 `latestVersion` / **删防自审**）· §8 **+4 行** · §11 **404 键 / 12 组** · §14 +1 行 · P3「审核管理」**11 处** · 端点源码依据**行号重取** ③ `docs/00` **v1.88**（M4b-5 行 ⬜ → **✅ 完成**）④ `docs/05` **v1.11**（§6.4 **R2 偏离登记** + 审核运营模型改写）⑤ `docs/08` 三处注记改「已放开」⑥ **历史批指针**（M4a **v0.38** · M4b-1 **v1.8** · M3 **v1.7** · 正文不改）⑦ 终检 `doc-audit` **70 PASS / 0 FAIL** · 八步门禁**复跑 8/8**；**T1–T12 全绿 · 待提交**）
> Updated: 2026-09-22（**v0.10：T11 验证收尾（八步门禁 + dogfood + 零回归）** —— ① 八步门禁 **8/8 exit 0**（`test` **562 pass / 0 fail** · `doc-audit` **70 PASS / 0 FAIL**）② 本批 dogfood **62 PASS / 0 FAIL / 0 超时**（全量 · 含 `G10⑭` 门户侧）· 分段 `SMOKE_ONLY=G10` **15/15** ③ 零回归 `m4a` **34/0** ✓ · `m4b3` **43/0** ✓ · `m4b4` **88/1 → 89/0**（1 条 = 既有探针过时 · **F193** 修后复跑归零）④ **F192**（`G10⑭` 探针未按容器作用域 + 一次性 `sleep` ⇒ 已修为作用域 + 轮询）· **F193**（`m4b4` G13 探针过时 · 非本批引入 · 用户拍板修）· **F194**（本批 2 脚本 `format:check` + 2 处 `organizeImports` **error** ⇒ 门禁抓出并修）⑤ 收尾回填实测值入 design §9.8（**T12 未始**））
> 2026-09-22（**v0.9：T10 落地** —— 造数 **13 fixture**（幂等 · 真实存储 · B1 语义订正 · F189 补可比态）· dogfood G1–G10 **+G10⑭ 门户侧** · 跑史 **35/26→…→61/0**（26 FAIL 全为探针自造）· G9 `m4a` ✓ `m4b3` 43/0 ✓ `m4b4` 待重跑（F191 限流）· **F189/F190/F191**；**T11–T12 未始**）
> 2026-09-22（**v0.8：T8+T9 落地（共享详情 + `ConfirmDialog` 三态）** —— 新页 + 3 件 + 三态契约 · `/reviews/:id` 换真页 · `DEV_BATCH` **5 → 2**（含删死条目）· **三视面真浏览器全绿**（面包屑分叉/三动作/处理态/首版态整卡不渲染）+ 视觉 5/5 · **F187/F188** · 已知未验 3 项交 T10；**T10–T12 未始**）
> 2026-09-22（**v0.7：T7 落地（审核管理页）** —— 新页 7 列 + 筛选 + 分页 + 列开关（保护 2 列）· API 客户端三函数 · `/admin/reviews` 换真页 + `DEV_BATCH` 删 1 条（余 4）· **真浏览器 7 列/7 行/动作 7/7/列开关保护生效 + 视觉 5/5** · **F185/F186** · 验收账号 `m4b2_mgr`；**T8–T12 未始**）
> 2026-09-22（**v0.6：T5+T6 落地（`DiffWorkspace` + 自研 diff 退役）** —— 新件 + 主题 CSS + 迁移 3 件 + `git rm` 两件 + 契约 `patch`；**真浏览器 8 项断言全绿**（split 4 格 · 高亮 555/6 · 关 0 · 折叠零行 · 容器回退 ✓）+ **体积 gzip 54.6KB**（偏差 2.5%）；**F180/F181/F182/F184** ⇒ 设计 **v0.11**；**T7–T12 未始**）
> 2026-09-22（**v0.5：T4 落地 —— i18n + 跨批占位块清理** —— `review` **+57 键**、退役 2 键；实测 **405/405**（与设计目标逐项吻合）；**占位块删除 T9 → T4**（键与消费者同批 · 提交粒度仍独立）；**F179**；typecheck 4/4；**T5–T12 未始**）
> 2026-09-22（**v0.4：T3 落地 —— R2 移除防自审** —— 删 `isSelfReview` + `isSuperAdmin` 入参 + `selfReview` 码（**6 → 5**）+ 测试改写为「管理档可自审 ⇒ 放行」；三文件 **53/0** · typecheck 4/4；**F177**（实删 4 行非 2 处）· **F178**（注释腐化 2 处已修）；**T4–T12 未始**）
> 2026-09-22（**v0.3：T2 落地 —— 读面 2 加性字段** —— `submittedByName`（三面 `leftJoin`）+ `latestVersion`（**仅详情** · `asset_version` 自连接 `alias()`）；`reviews.test.ts` **23/0** · typecheck 4/4 · lint exit 0；**F175/F176** 登记并订正设计 2 处描述；**T3–T12 未始**）
> 2026-09-22（**v0.2：T1 落地 —— 服务端对比引擎替换完成** —— 自研 LCS DP ⇒ jsdiff + `patch` 契约 + 内容寻址缓存；`assets.test.ts` **76/0** · `m4a-chain-smoke` **PASS ×2** · typecheck 4/4 · lint exit 0；**F174** 登记（dev 库 29 条 ACTIVE ⇒ 冒烟 limit 断言脆弱，已修）；**T2–T12 未始**）
> 2026-09-22（**v0.1：首稿 —— 由批 design v0.9 派生** —— ① §1 目标与非目标（12 段）② §2 Task 总览（**T1–T12**）③ §3 Task 明细（每 Task = 依据 + 步骤 + **断言 / 门禁**）④ §4 八步门禁（CI 同序）⑤ §5 造数（**写库需授权**）⑥ §6 风险与回退 ⑦ §7 落地记录（执行期回填）⑧ §8 自检打分（初稿 + 换靶复核位）⑨ §9 修订记录。**本版零实现改动**）
> Status: **T1–T12 全绿 · 待提交**（批 design **v0.13** · 8 维 **9.86**；八步门禁 **8/8 exit 0** · dogfood **62 PASS / 0 FAIL** · 零回归 `m4a` **34/0** ✓ `m4b3` **43/0** ✓ `m4b4` **89/0** ✓ · 文档同步：主 design **v1.63** · `docs/00` **v1.88** · `docs/05` **v1.11** · 历史批指针 3 处 · `doc-audit` **70/0**）· **diff 观感追加**（字号 **12px** / 行高 **20px** · 对标 GitHub 实测 · **F195/F196**）· **待用户 commit/push 口令**
> 上游：批 design `docs/designs/2026-09-21-m4b5-review-workbench-design.md`（**v0.13** · 12 段 · 8 维 **9.86** · 处置 **49 项**）
> · 主 design `2026-09-10-m4b-admin-console-and-auth-design.md`（**v1.62**）§2.3 拆批表与批件登记表
> · `docs/00-product-direction.md` §5 M4b-5 行
> 依赖顺序：**M4b-1 ✅ / M4b-2 ✅ / M4b-3 ✅ / M4b-4 ✅**（四批出口五件全绿）⇒ 本批开工条件已满足
> **批间门（出口五件）**：① 批 design 8 维 ≥9 **定稿** ② **T1–T12** 全绿 ③ 八步门禁逐项 exit 0
> ④ dogfood（G1–G10）+ 观感合规核对 ⑤ **定稿条件 ② 证据**（三族截图 + 断言）⇒ 用户对**主 design** 单独下定稿口令

---

## 1. 目标与非目标

**目标**（本批 = **接双面共享工作台** + **diff 能力现代化** + **闭合主 design 定稿条件 ②**）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | 审核管理页 `/admin/reviews` | `ComingSoon` 占位 → **7 列真页**（状态筛选 + 分页 + 列开关〔保护 2 项〕+ 操作列 `Eye` 真链接直跳详情） |
| 2 | 共享详情 `/reviews/:id` | `ComingSoon` 占位 → **真页**：面包屑（按「谁的面」分叉）+ 页头 + **两栏**（主列 **三段竖排**：分型 manifest 卡 → **变更对比卡** → 文件树；右栏：task 元信息卡 + 动作卡） |
| 3 | 分型 manifest 卡 | 三族（skill / mcp / agent）**自适应形态** —— **主 design 定稿条件 ② 的载体** |
| 4 | 文件树 + 预览 | 三件迁 `ui/`（`FileTree` 含 **+1 加性可选 prop `onOpenFile?`**）+ 预览可用性**单点判定** + 不可预览降级 |
| 5 | **变更对比（版本 diff）** | **双处挂载**（门户「版本」tab 形态升级 + 审核详情新卡）· **默认左右对比** · 高亮可开关 · 折叠懒渲染 · **按容器实宽回退** |
| 6 | 三动作 + 权限矩阵 | 通过（可选意见）/ 驳回（必填原因）/ 撤回 · **管理档可自审（R2）** |
| 7 | 服务端 **4 处** | ① 读面加性 `submittedByName` ② **仅详情**加性 `latestVersion` ③ **R2** 移除防自审 ④ **对比引擎替换**（自研 LCS DP ⇒ `diff`(jsdiff)）+ **含 1 处破坏性契约变更**（`hunks[]` → `patch`） |
| 8 | **自研 diff 链路退役** | 前端删 `DiffView.tsx`(139) + `DiffNav.tsx`(52) ⇒ `react-diff-view@3.3.3` + `refractor@3.6.0`（**按需 21 语言**） |
| 9 | 跨批遗留处置 | 删资产详情页「审核」占位块 + 键 `assets.admin.reviewGroup` 退役（**独立 commit**） |
| 10 | i18n | `review` 组 **净增 57** · **2 键退役** · 全仓 `350 → 405` |
| 11 | 验证 | 造数脚本 + dogfood **G1–G10** + 八步门禁 + **定稿条件 ② 证据** |
| 12 | 文档同步 | §9.7 **10 项**（本批即改）+ §9.7b **5 项**（跨批契约变更：R2 + F156）+ §9.8 回填 |

**非目标**（不属本批，各自归属已定）：
- **行内评论 / 行级批注**：主 design §6.3 口径保留 —— 审核详情首期**不提供行内评论**（**不涉及版本 diff 面**：diff 可视化已入本批）
- 标签定义 / 审计浏览 / 资产管理页 → **M4b-6**；发布页（含上传 UI）→ **M4b-8**；视觉打磨（气质 / 密度 / 类型色最后一公里）→ **M4b-7**
- token 面（CLI / scope 实跑）→ **M5**（本批只做文档级对照表）
- **词级行内高亮**（`tokenize` 的 `enhancers`）：库支持但**本批不开** ⇒ 登记 M4b-7 视觉窗

**新增依赖（2 + 1）**：web **`react-diff-view@3.3.3`**（MIT · gzip 22.8KB · headless）+ **`refractor@3.6.0`**（**硬约束 3.x** · **按需注册 21 语言**）；
server **`diff@9.0.0`**（jsdiff · BSD-3 · 零依赖）。**零迁移 · 零新端点**。

> **登记缺口（本批显式不做）**：`latestVersion` 只解决**审核面 base**；「**版本间 diff 的分页 / 上下文展开 UI**」仍缺 ⇒ 归 **M4b-7**。
> **提交人授权夹缝**（提交人非 owner / 非上传者 ⇒ diff 卡内联降级）为**已知边界**，非缺陷（与 §4.4 **B1** 同口径）。

---

## 2. Task 总览

**执行序 = 服务端能力先行 → i18n → 前端件 → 前端页 → 脚本 → 验证 → 文档。**

| # | 归属 | 主题 | 前置 | 出口 |
|---|------|------|------|------|
| **T1** | server | 对比引擎替换（jsdiff）+ 契约 `hunks[]` → `patch` + 缓存 + 断言同步 | — | `typecheck` · `assets.test.ts` 全绿 · `m4a-chain-smoke` 绿 |
| **T2** | server | 读面 **2 加性字段**（`submittedByName` 三面 · `latestVersion` 仅详情） | T1（无关可并行） | `reviews.test.ts` +1 组 + 详情 +2 断言 |
| **T3** | server | **R2** 移除防自审（删 `isSelfReview` + 错误码 + 2 处测试改写） | — | `rbac.test.ts` / `service.test.ts` 全绿 |
| **T4** | web | **i18n**：`review` 组扩 + 2 键退役（**先于页面**，避免页面缺键） | — | 键数实测 **405** · 双向差集 0 |
| **T5** | web | `ui/DiffWorkspace.tsx` 新件 + `refractor` 按需注册 + `api/types.ts` 契约替换 | T1 | `typecheck` · 两页可用 |
| **T6** | web | 迁移 3 件到 `ui/` + `FileTree` 加性 prop + **删 `DiffView`/`DiffNav`** + `Badge.tsx` 注释 + `VersionCompare` 改向 | T5 | 门户版本 tab 形态升级（回归绿） |
| **T7** | web | 审核管理页 `ReviewQueue.tsx` + 路由换真页 + `DEV_BATCH` 删 3 条 | T2/T4 | `m4b5` G1/G2 绿 |
| **T8** | web | 审核详情 `ReviewDetail.tsx` + `ManifestCard` + `ReviewMetaCard` + `lib/review-permissions.ts` + 变更对比卡 | T2/T4/T5/T6 | `m4b5` G3–G8/G10 绿 |
| **T9** | web | `ConfirmDialog` 三态 + `AssetDetail.tsx:457`（**删 `AssetAdminCard` 占位块已前移至 T4** —— 键退役与消费者同批，见 T4 落地记录） | T8 | G6 绿 · 跨批页回归绿 |
| **T10** | script | 造数 `m4b5-seed-reviews.ts`（**写库需授权**）+ dogfood `m4b5-review-dogfood.ts`（G1–G10 · `SMOKE_ONLY`） | T7/T8/T9 | 全量 dogfood 绿 · 三脚本零回归 |
| **T11** | 验证 | 八步门禁 + 证据（三族截图 / diff 面 / G10 输出 / **构建体积实测**）+ **定稿条件 ②** + 收尾回填 | T10 | 八门禁 exit 0 · 证据归档 |
| **T12** | 文档 | §9.7（10 项）+ §9.7b（5 项）+ 主 design/`docs/00` 同步 + 历史批 design 指针 | T11 | `doc-audit` 68 PASS / 0 FAIL |

---

## 3. Task 明细

### T1 · 服务端：对比引擎替换（`diff`/jsdiff 9.0.0）+ 契约 `hunks[]` → `patch`

> 依据 = 批 design **§5.5**（v0.9）· **含 1 处破坏性契约变更**（§2.1e **G-Q11**）· 前置 = 无。

1. `apps/server/src/assets/version-compare.ts`：`lineDiff()`（自研 LCS DP）⇒ **`structuredPatch()`**（取 hunk 数据）；
   **保留** `MAX_DIFF_LINES = 1500` · `COMPARE_READ_CAP = 512KB` · `binary` / `truncated` 标注 · `decideDownload` 授权（**不动**）
2. **格式编排层（~20 行）**：每文件产一段 **`diff --git` 段** ⇒ 拼成**单一 `patch` 字符串**，规范（**逐行**）：
   ```text
   diff --git a/<path> b/<path>     ← 恒有（段首）
   --- a/<path> | --- /dev/null     ← ADDED ⇒ /dev/null
   +++ b/<path> | +++ /dev/null     ← DELETED ⇒ /dev/null
   @@ -a,b +c,d @@                  ← 库产
   ```
   **不产** `index` 行（手中只有 `sha256`，非 git blob sha）· **不产** `new file mode`/`deleted file mode`/`similarity index`/`rename`
3. 契约：`CompareFile.hunks?: Array<{lines: DiffLine[]}>` ⇒ **`patch: string`**（**不双写**）；删 `DiffLine` / `DiffLineType`
4. **diff 结果缓存**：进程内 Map（key = `assetId + from + to + 两侧 sha256` · TTL **5 分钟** · LRU **≤100**）+ 导出 **`__resetCompareCache()`**（仅测试）
   ⚠️ **安全硬约束**：**只缓存「内容 → diff 结果」**，**永不缓存授权判定** —— 命中缓存**也必须先过 `decideDownload`**（授权在缓存之前）
5. 消费端断言同步：`http/assets.test.ts`（`:746` 组 · `:796/:831/:842/:845` 读 `hunks[0].lines`）⇒ 改断 `patch` 文本；
   `docs/smoke/scripts/m4a-chain-smoke.ts:62,99` ⇒ 改读 `patch`

**断言 / 门禁**：① `structuredPatch` 与自研算法**逐行等价**（同 fixture 对照：ADD/DELETE/CONTEXT 行数与行号一致）② `patch` **首行 = `diff --git`** ·
③ **段数 = `files[]` 数** 且**段序一致** ④ `ADDED` ⇒ 含 `--- /dev/null`；`DELETED` ⇒ 含 `+++ /dev/null` ⑤ `patch` **不含 `index `** ·
⑥ 超限 / 二进制 ⇒ `truncated`/`binary` 为真且 **`patch` 为空** ⑦ 缓存命中**不改结果**（同请求两次结果逐字相等）⑧ **未授权请求不因缓存放行**（正反对照）·
⑨ `bun run typecheck` · `apps/server` 测试全绿 · `m4a-chain-smoke` 绿

**T1 · 落地记录（2026-09-22）**

- **实现**：`assets/version-compare.ts` 重写 —— 自研 LCS DP（`lineDiff` 67 行）⇒ **`structuredPatch(..., {context: Infinity})`** + `buildPatch()` 编排（**3 行头** · 不产 `index` · 增删用 `/dev/null`）·
  缓存改 **内容寻址**（key = `path|sha256(from)|sha256(to)|changeType` ⇒ 比 §5.5 的 `assetId+from+to+sha` **更强**：跨版本/跨资产复用同内容，且同样「内容变即失效」）+ 导出 `__resetCompareCache()` ·
  授权恒在缓存之前（`decideDownload` 未被绕过）· 顺带清掉既有 `noUnusedImports`（`inArray`）
- **实测（`context: Infinity` 探针先行）**：修改 ⇒ `@@ -1,3 +1,4 @@` 单 hunk · 空→内容 ⇒ `@@ -1,0 +1,2 @@`（**jsdiff 产 `-1,0`，非 git 的 `-0,0`** —— 解析器不依赖，已在 §5.5 规范中如实记录）·
  内容→空 ⇒ `@@ -1,2 +1,0 @@` · 无尾换行 ⇒ 出现 `\ No newline at end of file` 标记（git 标准）· 无差异 ⇒ `hunks=0` ⇒ 不产 patch
- **断言**：`apps/server` `assets.test.ts` **76 PASS / 0 FAIL**（原 75；改写 2 条契约断言 + 新增 1 条缓存用例）· `m4a-chain-smoke` **PASS ×2**（新增 7 条 patch 断言：段首 3 行头 / 不产 index / hunk 头 / ADDED·DELETED `/dev/null` / 段数 = files 数）
- **门禁**：`typecheck` **4/4** · `lint` **exit 0**（133 warnings = 既有基线）· `biome check --write` 已格式化
- **F174（登记 · 环境债）**：dev 库 **ACTIVE 资产 = 29 条**（其中 **19 条 = M4b-4 分页造数残留 `m4b4-seed-page-*`**）⇒ `m4a-chain-smoke`
  原 `limit=20` 断言**脆弱**（老 demo 被挤出首页，非契约问题）⇒ 已改 `limit=100`（断言意图不变）；
  **连带风险**：`m4a-dogfood:809-820`「资产数 < limit ⇒ 无分页控件」的**余量已耗尽** ⇒ **T10/T11 复跑基线时须复核**（如需，改用专用命名空间判据）
- **既有噪声（非本笔引入 · 正反双证）**：`apps/server` **全量**跑出 7 fail / 3 errors（全在 `device/approve`｜`device/token` 域）；
  **单文件跑 11 PASS / 0 FAIL（带改动与干净树两次一致）** ⇒ 判为**既有全量交叉干扰**，与 diff 面无交集；T11 八步门禁复测时若仍在 ⇒ 按既有问题登记
- **⚠️ 测试坑（本仓）**：`bun test <file> -t '<名>'` 过滤会**跳过其他 `describe` 的 `beforeAll`** ⇒ 依赖跨组夹具的用例**假失败**
  （实证：YANKED 用例在过滤跑下报 404，全文件跑 400 正常）⇒ **门禁一律跑全文件**

---

### T2 · 服务端：读面 **2 加性字段**

> 依据 = 批 design **§5.1**（`submittedByName`）+ **§5.1b**（`latestVersion` · v0.9 **G-Q8**）。

1. `review/query.ts`：`LIST_SELECT` +1 行 **`submittedByName: user.name`**；`listQueue` / `listMine` / `getReviewDetail` **各 +1 `leftJoin(user)`**；
   接口 `ReviewListItem` +1 字段（**1 + 3 + 1 = 5 行**）
2. `review/query.ts`：**`getReviewDetail` 查询 +2 `leftJoin`**（`asset` on `task.assetId` → `assetVersion` on `asset.latestVersionId`）+ `ReviewDetailItem` +1 字段 `latestVersion: string | null`（**2 join + 1 接口行**）
   ⚠️ **不动 `LIST_SELECT`** —— 该字段只给详情（避免给队列列表加 2 join 的性能税）
3. `http/reviews.test.ts`：**+1 组**（照 `:299-365`「读面加性」写法；三面齐 + 值 = fixture `displayName` + `null` 兜底）+ 详情**+2 断言**（有已发布版本 ⇒ 版本号正确；无 ⇒ `null`）

**断言 / 门禁**：① 三面响应含 `submittedByName` 且与 `user.name` 一致 ② 用户行缺失 ⇒ 字段 `null` 且 **task 行不丢**（`leftJoin` 语义）③ 详情 `latestVersion` 两态各一例 ·
④ **队列 / 我的提交响应不含 `latestVersion`**（守住「不背性能税」）⑤ 既有 19 例零回归 · `typecheck` 绿

---

**T2 · 落地记录（2026-09-22）**

- **实现**：`review/query.ts` —— `LIST_SELECT` +1 字段 `submittedByName: user.name`；`listQueue` / `listMine` / `getReviewDetail` **各 +1 `leftJoin(user)`**（`user.id` 为 PK ⇒ 1:1 不放大行数）·
  `getReviewDetail` +1 **`asset_version` 自连接**（`alias(assetVersion,'latest_version')` on `asset.latestVersionId`）+ select +1 `latestVersion` + 接口 +1 字段；
  `ReviewListItem` +`submittedByName: string | null` · `ReviewDetailItem` +`latestVersion: string | null`
- **偏差申报（F176）**：v0.9 设计写「`asset` → `assetVersion` **2 个 leftJoin**」—— 实测 **`asset` 与 task 那版 `asset_version` 主查询本已 join** ⇒ 实际只需 **1 个自连接**；
  且**本仓首个 `alias()` 用法**（drizzle 官方 helper；替代方案 = 加一次小查询，多一次往返且非原子）⇒ 设计与本记录已同步订正
- **偏差申报（F175）**：计划的「`submittedByName` 的 `null` 兜底用例」**不可构造** —— `reviewTask.submittedBy` **有 FK**（`governance.ts:45-47`）+ 用户仅**软删**（`DISABLED`，从不物理删除）⇒ 用户行恒在 ⇒
  `| null` 只是 `leftJoin` 的防御性类型；用例改为断言「字段在场 + 值 = `user.name`」并注明不可达理由
- **实测**：`reviews.test.ts` **23 PASS / 0 FAIL**（新增 1 组 5 例：三面齐 / join 不放大 / `latestVersion` 两态（`null` → 批准 → `"1.0.0"`）/ 队列·我的提交**不含**该字段 / null 分支不可达）
- **门禁**：`typecheck` **4/4** · `lint` **exit 0** · `biome` 已格式化

---

### T3 · 服务端：**R2** 移除防自审（跨批契约变更）

> 依据 = 批 design **§4.6.1** / **§5.4** —— 用户 2026-09-21 拍板「**管理也能审自己**」。

1. `auth/rbac.ts:69-77`：**删** `isSelfReview`（含导出与注释）
2. `auth/rbac.test.ts:125-135`：删该 `describe` 块 + import 同步
3. `http/reviews.ts:117,140`：删 `isSuperAdmin:` 实参（2 处）
4. `review/service.ts`：删 `isSelfReview` 调用与入参 `isSuperAdmin`（approve / reject）
5. `review/errors.ts`：**删** `selfReview` 码（`review.self_review`）
6. `review/service.test.ts:328`：用例改写为「**管理档审自己 ⇒ 放行**」（契约变更 ⇒ 断言同步，**非为绕测而改**）

**断言 / 门禁**：① 管理档对自己提交的 `PENDING` ⇒ approve/reject **200**（**放行**断言）② `review.self_review` 码**不再出现**（`grep` src 零命中）·
③ 其余审核用例（他人审核路径）全绿 ④ 错误码计数 **6 → 5** · `typecheck` 绿

---

**T3 · 落地记录（2026-09-22）**

- **实现（7 处 · 与设计 §4.6.1 清单一致 + 2 处订正）**：① `auth/rbac.ts` **删 `isSelfReview`**（含文档注释）② `auth/rbac.test.ts` 删 import 成员 + **整组 3 例** ③ `http/reviews.ts` approve/reject **各删 2 行**（`isSuperAdmin:` 实参 + **`const role = …` 常量** —— 后者随之变死代码）④ `review/service.ts`：import 去 `isSelfReview` · 接口去 `isSuperAdmin` 字段 · approve/reject 各去解构项 + **整段防自审判定** ⑤ `review/errors.ts` **删 `selfReview` 码 + switch case**（码 6 → **5**）⑥ `review/service.test.ts`：**10 处 payload `isSuperAdmin` 行全删** + 原「防自审 403」用例**改写为「管理档可自审 ⇒ 放行」**（断言翻转 = 契约变更同步，非绕测）
- **偏差申报（F177）**：设计 §4.6.1 写「删 `isSuperAdmin:` 实参（**2 处**）」—— 实测**每处实为 2 行**（`const role = (await rbac.roleOf(...)) ?? GUEST;` 只服务该实参 ⇒ 同删）⇒ `http/reviews.ts` 实删 **4 行**
- **偏差申报（F178 · 注释腐化 2 处）**：① `http/reviews.ts:8` 路由头注释仍写「管理档 + 防自审（服务内 `isSelfReview`——SUPER_ADMIN 例外显式放行）」② `review/service.ts:158` 文档注释仍写「防自审：`isSelfReview(...)`——403 `review.self_review`」⇒ **均已改为「R2 已废除」口径**（「退役只改代码不改注释」是高频漏项）
- **实测**：`rbac.test.ts` + `service.test.ts` + `reviews.test.ts` 合跑 **53 PASS / 0 FAIL**（`service.test.ts` 21 例）· 全仓 `selfReview` **零残留**（`grep` apps/server/src）
- **门禁**：`typecheck` **4/4** · `biome` 已格式化

---

### T4 · web i18n：`review` 组扩 + 2 键退役

> 依据 = 批 design **§6**（v0.9：净增 **57** · 组 **5 → 62** · 全仓 **405**）。**先于页面**（页面缺键会打断 typecheck）。

1. `i18n/zh.ts` · `i18n/en.ts`：`review` 组按 §6.1 五段逐键落（队列 14 · 详情 12 · 动作与确认 13 · 提示与空态 9 · **变更对比 9**）
2. 退役 **2 键**：`assets.admin.reviewGroup`（随占位块删除）· `errors.review.self_review`（R2 连带）
3. **孤儿键转正**：`review.reason` · `review.empty` 本批获得消费者
4. 测量口径：`bun docs/smoke/scripts/m4b4-measure.ts`（按组实测 + 双语双向差集 + en 值级中文泄漏）

**断言 / 门禁**：① 实测键数 = **405**（`review` 组 **62**）② **双语双向差集 = 0** ③ **en 值级中文泄漏 = 0** ④ 未消费键扫描（**按组全扫**，非人工清单）⑤ `typecheck` 绿

---

**T4 · 落地记录（2026-09-22）**

- **实现**：`i18n/zh.ts` · `i18n/en.ts` `review` 组按 §6.1 **五段逐键**落（队列 14 · 详情 12 · 动作与确认 13 · 提示与空态 9 · **变更对比 9** = **+57**，组由 5 → **62**）；退役 **2 键**（`assets.admin.reviewGroup` · `errors.review.self_review`）
- **实测（`m4b4-measure.ts` · 与设计目标逐项吻合）**：`review` 组 **zh=62 / en=62** · `errors` **34/34** · `assets` **78/78** · 组数 **12** · 合计 **405/405** · **双向差集 0** · **en 值级中文泄漏 0**
- **计划调整（连带 · 已同步 T9）**：键退役与**其唯一消费者**必须同批落地（否则 `typecheck` 红）⇒ **`AssetAdminCard` 删审核占位块从 T9 前移到 T4**；
  **提交粒度不变**（G-Q5：跨批改动仍作**独立 commit** 提交 —— 编辑时点 ≠ 提交时点）
- **偏差申报（F179）**：设计 §3.2 #5 称「`reviewable` 判定（`:76`/`:78`）**相应收口**」—— 实测 `canManage(viewer, asset)` = **owner ∨ `role >= ADMIN`** ⇒ 原 `visible = manageable || reviewable` 中的 `reviewable` 项**恒被 `manageable` 覆盖（冗余）** ⇒ 删除**零行为变化**（已实测 `m4b4` G11④「管理档：管理区渲染」不受影响）
- **实测（消费点契约）**：`StatusPill` 的 `label` 由**消费点**传 i18n 文案（件内不持词）⇒ `review.status.*` 4 键**必被页面消费**（非死键）
- **门禁**：`typecheck` **4/4**（先红后绿：退役键的消费点未同步时如实报错，同步后修复）· `biome` 已格式化

---

### T5 · web：`ui/DiffWorkspace.tsx` 新件 + 契约替换

> 依据 = 批 design **§4.10** + **§2.1d**（PoC 结论）。

1. 新件 `apps/web/src/components/ui/DiffWorkspace.tsx`（**薄封装**，非算法）：
   - `parseDiff(patch)` 一次吃多文件；`viewType` = `split`（默认）| `unified`
   - 高亮：`tokenize(f.hunks, {highlight: true, refractor, language})` ⇒ 传 `tokens`；**关** ⇒ 不传（0 span）
   - **按需注册 refractor 语言（21 种）**：`markdown/typescript/tsx/javascript/jsx/json/yaml/toml/bash/shell-session/python/go/rust/java/sql/css/markup/diff/ini/docker/makefile`
     兜底：未注册语言 ⇒ `plainText`（**不抛错**）
   - **默认全部折叠**，展开单文件才渲染；单文件渲染 **> 200ms** ⇒ 该文件**降级关高亮**
   - **容器实宽回退**：`ResizeObserver` 观测卡片宽 ⇒ **< 960 容器 px** 回退 `unified`（**不新造视口断点**）
   - a11y：折叠钮 `aria-expanded` · 行号列 `aria-hidden` · diff 区 `role="region"` + `aria-label`（路径 + `+N/−M`）· 全键盘可达
   - 二态：`binary` ⇒ 「二进制文件，不显示差异」；`truncated` ⇒ 「文本过大，未生成差异对比」（**均不渲染 diff 区**）
2. `api/types.ts:94-110`：删 `DiffLine` / `DiffLineType` / `hunks` ⇒ 加 **`patch: string`**
3. `src/types/refractor.d.ts`（**已在 v0.9 前置清理时落仓**）+ `refractor@3.6.0` **精确锁版**

**断言 / 门禁**：① `parseDiff` 文件数 = `files[]` 数且**段序一致** ② split 每行 **2** 个代码单元格；`unified` **1** 个 ③ 高亮开 ⇒ token span **> 0 且色数 ≥ 2**；关 ⇒ 色数 **= 1**（**React 19 回归断言**）·
④ 折叠时 DOM 不含未展开文件的行 ⑤ 收窄容器 ⇒ 自动回退 ⑥ `typecheck` + `biome` 绿

---

### T6 · web：迁移 3 件 + `FileTree` 加性 prop + **自研 diff 退役** + `VersionCompare` 改向

> 依据 = 批 design **§3.2**（#7/#9 + 退役件）+ **§4.5** + **§5.5 消费者清单**。

1. `git mv` `market/detail/{FileTree,FilePreviewDialog,fileTreeNodes}.*` → `components/ui/`；import 同步 **3 行**（`FilesTab.tsx:5,7` · `VersionCompare.tsx:13`）
2. `ui/FileTree.tsx`：**+1 加性可选 prop `onOpenFile?`**（缺省 = 纯结构态：行不响应点击）；**既有调用点零改动**（门户传了该 prop ⇒ 行为不变）
3. `market/detail/VersionCompare.tsx`：渲染层改向 **`DiffWorkspace`** + 消费 `patch`（**门户「版本」tab 形态升级**：默认 split + 高亮开关 + 折叠）
4. **`git rm`** `market/detail/DiffView.tsx`(139) · `market/detail/DiffNav.tsx`(52)（**不留兼容分支**）
5. `ui/Badge.tsx:12` 注释同步：删两个已退役名 + 「**3 个调用点**」⇒「**唯一调用点**」
6. **不迁移 `FilesTab` 本体**（含门户特有语义且无降级能力）；审核面**自组合** `ui/FileTree` + `ui/FilePreviewDialog`

**断言 / 门禁**：① `grep -rn 'DiffView\|DiffNav' apps/*/src` ⇒ **零命中**（含注释）② 门户版本 tab：默认 split / 高亮可开关 / 折叠可用（截图）·
③ `FileTree` 不传 `onOpenFile` ⇒ 行**不可点**；门户（传了）行为不变 ④ 门户文件树 + 预览回归绿（`m4a` dogfood）⑤ `typecheck` + `biome` 绿

---

**T5 + T6 · 落地记录（2026-09-22 · 两 Task 合并落地）**

> **合并原因**：契约 `hunks[]` → `patch` 与其消费者（`DiffView`/`DiffNav`）**必须同批** —— typecheck 会在中间态报红（同 T4/T9 那一类）。

- **新件**：`apps/web/src/components/ui/DiffWorkspace.tsx`（薄封装）—— `files[]` 入参（与服务端 `CompareFile` 同形 ⇒ **双处挂载零分叉**）· `parseDiff` 逐段解析 ·
  **默认 split** + **容器实宽回退**（`ResizeObserver`）· 高亮开关 · 折叠懒渲染 · 首展开 tokenize 预算降级 · binary/truncated 说明 · a11y（口径见下）
- **主题 CSS**：新增 `apps/web/src/styles/diff-tokens.css`（**F181**：无它则 token 同色 = 高亮形同虚设）
- **迁移**：`git mv` 三件（`FileTree` / `FilePreviewDialog` / `fileTreeNodes`）`market/detail/` → `ui/`；**内部 import 深度重写**（`../../../`→`../../` · `../../ui/shadcn/`→`./shadcn/`）；
  消费方 2 件同步（`FilesTab` 2 行 · `VersionCompare` 1 行）—— ⚠️ 首轮我改错为 `../shadcn/`（应 `./shadcn/`）⇒ **`build` 报错后订正**
- **`FileTree` 加性 prop（P4）**：`onOpenFile?` 缺省 ⇒ **纯结构态**（`disabled` + `cursor-default` + 无 hover 下划线）；`ROW` 基类去掉 `cursor-pointer`/`hover:text-foreground`，改由**可点档显式携带** ⇒ 门户（恒传 prop）行为零变化
- **退役**：`git rm` `DiffView.tsx`(139) + `DiffNav.tsx`(52)；`VersionCompare` 改向 `DiffWorkspace`（删 `DiffNav`/`DiffView`/`activeFile`/`selectFile`/`scrollRef`/`useRef`）；`Badge.tsx:12` 注释同步（F160）
- **契约**：`api/types.ts` 删 `DiffLine`/`DiffLineType`/`hunks` ⇒ 加 **`patch?: string`**（含 reason 注释）
- **真浏览器实测（headless Edge + CDP · 门户「版本」tab · 1440 视口）**：
  | 断言 | 实测 |
  |------|------|
  | `patch` 解析 ⇒ 文件头 = `files[]` | **3 个**（`SKILL.md +10 −1` · `reference/guide.md +0 −5` · `scripts/search.mjs +4 −0`）✓ |
  | 折叠态 diff 不进 DOM | `table.diff` **不存在**（0 行）✓ |
  | 默认 split（755 容器） | `class="diff diff-split"` · 每行 **4** 格（2 gutter + **2 code**）✓ |
  | 高亮开 | token span **555** · 色数 **6** ✓ |
  | 高亮关（点钮） | token span **0** ✓ |
  | 容器回退（限 600px） | `class="diff diff-unified"` · split 钮 **disabled** ✓ |
  | a11y | 行号列 `aria-hidden` ✓ · diff 区 `<section aria-label="SKILL.md +10 −1">` ✓ · 折叠钮 `aria-expanded` ✓ |
  | 视觉（`vision_analyze`） | 左右并排 ✓ · 多色高亮 ✓ · 红绿底 ✓ · 三钮且「左右对比」选中 ✓ · `+10 −1` ✓ |
- **体积实测（构建期 · §9.8 回填项）**：按需装配探针（`react-diff-view` + `refractor` core + **21 语言**）⇒ **min 158.11 KB / gzip 54.6 KB**；
  设计估算 **≈56KB** ⇒ **偏差 2.5%**（远低于 20% 复核阈值）✓ · 全量 `vite build` 通过（2542 模块 · 主 chunk 1088.30 kB / gzip 335.75 kB）
- **实现期发现的 2 个真 bug（均已在真浏览器复现并修复）**：
  ① **F181（🔴）缺主题 CSS** ⇒ token span 555 但**色数 = 1**（高亮形同虚设）⇒ 落 `diff-tokens.css` 后 **色数 1 → 6**
  ② **F184（🟡）`ResizeObserver` 从未 attach**：本件在 `files` 为空时**提前 return `null`** ⇒ `useRef` + `useEffect([])` 在 ref 未挂载时跑完 ⇒ 容器窄化**永不回退**（实测复现）⇒ 改 **callback ref**（`useState<HTMLDivElement|null>` + `ref={setContainer}`）后回退生效
- **设计订正 3 处（design → v0.11）**：**F180**（阈值 960 实测不可用 ⇒ **700**）· **F181**（补「必须交付主题 CSS」段）· **F182**（G10 ③ 口径：关 ⇒ **0 token span**）
- **门禁**：`typecheck` **4/4** · `biome` 干净 · `build` **通过** · `doc-audit` 见 T6 收尾

---

### T7 · web：审核管理页（队列）+ 路由换真页

> 依据 = 批 design **§4.1** · **§4.9**（线框差异声明）· **§3.3**。

1. 新页 `apps/web/src/pages/ReviewQueue.tsx`（薄装配）：`PageHeader.title` = 字典 **`admin.reviews`**（「审核管理」）；列定义页内 `COLUMNS`（照 `pages/Assets.tsx` 范式）
   **7 列**：坐标（`assetSlug` + `assetVersion` 两行堆叠 · **保护列**）/ 类型（无色 `TypeIcon` + 文案）/ 状态（`StatusPill kind="task"`）/ 姓名（`submittedByName` · 缺 ⇒ 「—」）/
   工号（`submittedBy` · `usr_` 前缀截断 + `title`）/ 提交时间（**统一固定格式** · 见 §9.8 回填）/ 操作（`Eye` 图标钮 `Button asChild` + `Link to={/reviews/:taskId}` · **保护列**）
2. 工具条：状态筛选（「全部」**不传参**）+ **列开关**（复用 `ui/ColumnVisibilityMenu` · 保护 2 项置灰「必显」）+ 分页（`total > limit` 才渲染）
3. `main.tsx`：`/admin/reviews` 占位 → **真页**；`DEV_BATCH` **删 3 条**（两条本批 + **`/dashboard/assets` 死条目**）+ 注释同步（**零新增路由**）

**断言 / 门禁**：① 列头逐字 7 项 ② 行数 = 接口 `total` ③ 操作列 = **`a[href="/reviews/<id>"]` 真链接** ④ 状态筛选 ⇒ 请求带 `status`；「全部」⇒ **不带**
⑤ `limit=20` · `submittedAt desc` ⑥ 列开关 7 项 + 保护 2 项不可关 ⑦ 三态（空两行 / 载骨架 / 错重试）⑧ 非管理档 ⇒ `RoleGuard` 弹回（**零请求、零白屏**）⑨ `typecheck` + `biome` 绿

---

**T7 · 落地记录（2026-09-22）**

- **新页** `apps/web/src/pages/ReviewQueue.tsx`（扁平 · 队列）：**7 列**（资产〔坐标两行〕· 类型〔`TypeIcon` + 复用 `assets.type.*`〕· 状态〔`StatusPill kind="task"` + `review.status.*`〕· 姓名〔`submittedByName`〕· 工号〔`submittedBy`〕· 提交时间 · 操作）·
  状态筛选（5 项 · `ALL` 前端哨兵 ⇒ **不带参数**）· 分页（`limit=20`）· **列开关（保护 2 列：资产 / 操作 —— `meta.hidable=false` + `columnItems[].hidable=false` 双处）** · URL 状态化 · **不开排序头**（Q2）
- **API 客户端加性**（`api/reviews.ts`）：`submittedByName` 并入 `MyReviewItem` · 新 `ReviewDetailItem` · `fetchReviewDetail` · `approveReview(taskId, comment?)` · `rejectReview(taskId, comment)`（契约实测：approve/reject ⇒ **200 `{taskId,status,version}`** · withdraw ⇒ 204）
- **路由**：`/admin/reviews` **占位 → 真页**；`DEV_BATCH` 删该条（5 → **4 条**；`/reviews/:id` 待 T8 删）
- **真浏览器实测（headless Edge + CDP · 账号 `m4b2_mgr` 管理档）**：标题 **「审核管理」**（P3 真源 ✓）· 表头 **7 列序对** · **7 行**（= dev 库 `review_task` 实数）· 行内动作 **7/7「查看」** · 列开关 **7 项 + 重置为默认**，**资产/操作 = 「必显」且 `disabled`** ✓，关「类型」⇒ 表头 **6 列** ✓ · `vision` **5/5**（中文四色状态徽章 · 无破版）
- **验收账号（dev）**：**`m4b2_mgr`（admin 档）** —— 与 `m4b2_user` **共用 `SMOKE_M4B2_PASSWORD`**（三账号同一 env 变量）⇒ **无需单独口令**
- **F185 🟡（自查修正）**：行内动作钮 `aria-label`/`title` 误用列头键（`review.col.asset` = 「资产」）⇒ 改既有 **`submissions.action.view`**（「查看」）—— 守 Q11「组件层固定文案跨组复用」⇒ **零新增键**
- **F186 ⚪（夹具特性 · 登记以免误判）**：dev 账号 `user.name` = **用户名**（seed 写入）· `submittedBy` = 合成 `usr_…` UUID ⇒ 「姓名/工号」两列在 **dev 夹具下**显示 `m4b2_user` / `usr_4e7d…`，**非缺陷**；LDAP 建号场景 id = 工号（`59901934` 形态）
- **门禁**：`typecheck` **4/4** · `biome` 干净（清掉自造死常量 `PROTECTED`）

---

### T8 · web：审核详情（两栏 · 三段竖排）+ 变更对比卡

> 依据 = 批 design **§4.2**（**三段竖排**）· **§4.3**（分型卡）· **§4.4**（预览单点）· **§4.6** · **§4.10** · **§4.5.1**（token 映射）。

1. 新页 `apps/web/src/pages/ReviewDetail.tsx`（薄装配）：面包屑（**按「谁的面」分叉** · 第 2 段 = 「我的提交」/「**审核管理**」）+ 页头（title = `slug · v version` / desc = **类型名纯文本**〔**P1**：不放图标〕/ 动作槽**留空**）+ 两栏 `grid-cols-[1fr_320px]`（`<1100px` ⇒ 单列）
2. 新件 `console/reviews/ManifestCard.tsx`：**复用** `mainDocPath` / `manifestFields`（**均既有 export**）+ 自写呈现；三族形态见 §4.3（skill ⇒ `SKILL.md` 行 · mcp ⇒ **`servers` 块**（`env`/`headers` 逐项**不渲染**）· agent ⇒ 族字段）；`manifestJson === null` ⇒ 字段区「—」（**不空窗**）；**卡不拉正文**
3. 新件 `console/reviews/ReviewMetaCard.tsx`：键值行 ×5（状态 / 提交人〔**= 当前登录者 ⇒ 「你」**〕/ 工号 / 提交时间 / `#taskId` + `reviewVersion`）+ 驳回原因行（**仅 `REJECTED`**）
4. 新件 `lib/review-permissions.ts`（**唯一落点** · 照 `lib/asset-permissions.ts` 体例）：`canApproveReview(role) = role >= ROLE.ADMIN` · `canWithdrawReview(detail, viewer)`；**无自审分支**
5. **变更对比卡**（主列**第 2 段** · 内联 `ui/DiffWorkspace`）：base = 详情 `latestVersion` / head = `assetVersion`；
   **首版**（`latestVersion === null`）⇒ **整卡不渲染** · **同版本重审** ⇒ 空态「与当前已发布版本无差异」 · **版本不可预览**（§4.4 单点）⇒ **整卡不渲染** ·
   提交人授权夹缝 ⇒ 卡内**内联**提示（`diff.failed`）· 403/404/400 ⇒ 内联提示（**不破版**）
6. 文件树 + 预览：`ui/FileTree`（**不传 `onOpenFile` 当不可预览**）+ `ui/FilePreviewDialog` 自组合；不可预览 ⇒ 顶部说明行 + **不渲染预览动作**

**断言 / 门禁**：① 面包屑两态分叉 ② 三族卡形态差异（skill `SKILL.md` · mcp `servers` **条数 = fixture** · agent `keywords`）+ **三族字段数 > 0** ③ 不可预览 ⇒ 说明行 + 文件行无预览动作 + 文件树仍在 ④ 权限矩阵四行（`status !== PENDING` / 管理档 / 提交人 / 兜底）· **管理档可自审三动作在场** ⑤ 变更对比两态 + 容器回退 ⑥ `typecheck` + `biome` 绿

---

**T8 + T9 · 落地记录（2026-09-22 · 两 Task 合并落地）**

> **合并原因**：`/reviews/:id` 的动作卡需要 `ConfirmDialog` 的**原因三态**（Q8）⇒ 契约与其唯一新消费者必须同批（同 T5/T6、T4/T9 那一类）。

- **新页** `apps/web/src/pages/ReviewDetail.tsx`：面包屑（**按「谁的面」分叉** —— `submittedBy` 而非角色）· `PageHeader`（标题 = 坐标 · 描述 = **类型名纯文本**〔P1〕）·
  **主列三段竖排**（分型 manifest 卡 → **变更对比卡** → 文件清单）· **右栏**（task 元信息卡 + 动作卡）· 载态骨架 · 404/403 分态 ErrorState
- **新件**：`components/console/reviews/{ManifestCard,ReviewMetaCard}.tsx` · `lib/review-permissions.ts`（体例照 `asset-permissions.ts`：真源对照表 + 提示性守卫声明）
- **`ConfirmDialog` 三态**（Q8）：`reason?: 'none' | 'optional' | 'required'` —— **删旧 `requireReason` 布尔、不留别名**；消费者同步（`AssetDetail.tsx:457` → `reason={… ? 'required' : 'none'}`）
- **判据单点**：预览可用性 = §4.4 `versionStatus` 表（`PREVIEWABLE` 常量）· 三动作 = `reviewActionAvailability()` · 变更对比 base/head = `latestVersion` / `assetVersion`
- **变更对比卡三态**：`latestVersion === null` ⇒ **整卡不渲染**（首版）· 同版本 ⇒ **卡内空态**（不请求）· 请求失败（B1 授权夹缝 / 竞态）⇒ **卡内内联** `diff.failed`（不整页报错）
- **路由**：`/reviews/:id` **占位 → 真页** · `DEV_BATCH` 删该条 + 删**死条目** `/dashboard/assets`（无消费点）⇒ **5 → 2 条**（= Q10 目标值）
- **真浏览器实测（headless Edge + CDP · 三视面 · 每 pass 清 cookie 防串号）**：
  | 视面 | 面包屑 | 卡集合 | 动作 | 其它 |
  |------|--------|--------|------|------|
  | 管理档 × PENDING（task 4 · `smoke-skill v3.0.0`） | 首页 / **审核管理** / #4 | manifest + 文件清单 + 审核任务 + 操作（**无变更对比** ⇒ 首版态 ✓） | **通过 / 驳回 / 撤回** 三钮 ✓ | 文件行可点（可预览）· 提交人 `Smoke Uploader` |
  | 管理档 × REJECTED（1370） | 首页 / 审核管理 / #1370 | 同上 | **无钮 + 「该提交已被处理」** ✓ | — |
  | **提交人** × REJECTED（1370 · `m4b2_user`） | 首页 / **我的提交** / #1370 ✓ | 同上 | 处理态 ✓ | 提交人行 = **「你」** ✓ |
- **视觉（`vision`）**：主标题 `smoke-skill · v3.0.0` + 副标题「**技能**」（纯文本 · P1）✓ · 文件树含目录/大小/sha 截断 ✓ · 三钮层级（主/描边/次级）✓ · 无破版 ✓
- **F187 🟡（自查修正）**：`api/reviews.ts` 首稿把 `manifestJson` 写成 **`string`** —— 真值 = jsonb **已解析对象**（服务端 `ReviewDetailItem.manifestJson: Record<string, unknown> | null` · `review/query.ts:59`）⇒ **类型谎言**已订正
- **F188 ⚪（解释口径登记）**：设计 §4.10 审核面 D2 写「懒加载折叠」—— 实现口径 = **可比态才请求 `compare`** + **逐文件折叠懒渲染**（卡本身无独立折叠钮）⇒ 登记以免读者误解为「卡需手点展开才请求」
- **已知未验（如实登记 · 交 T10）**：① **`adminOnlyHint`**（提交人非管理档 × PENDING）—— dev 无该组合数据 ② **可比态变更对比**（`latestVersion !== null`）—— dev 全部 `latest=null` ③ 三动作的成功路径（会改库，须用户授权造数）
- **门禁**：`typecheck` **4/4** · `biome` 干净（格式化 2 文件）· `build` **✓**

---

### T9 · web：`ConfirmDialog` 三态 + 跨批清理（**独立 commit** —— **主体已随 T8 落地**）

> 依据 = 批 design **§4.6**（Q8）+ **§3.2 #5**（跨批改动 · G-Q5 定「**独立 commit**」）。

1. `console/ConfirmDialog.tsx`：`requireReason?: boolean` ⇒ **`reason?: 'none' | 'optional' | 'required'`**（缺省 `'none'` = 现状；**删旧 prop 不留别名**）
2. `pages/AssetDetail.tsx:457`：`requireReason` ⇒ `reason="required"`（**1 行**）
3. `console/AssetAdminCard.tsx`：**删「审核」占位块**（`:163-179`）+ `reviewable` 判定（`:76`/`:78`）收口 —— **跨批改动**（M4b-4 已交付页）
4. 三动作接线：通过 `reason="optional"`（空可提交）· 驳回 `reason="required"`（**空 ⇒ 确认钮 `disabled`**）· 撤回无原因；按钮层级 `default` / `outline`（**去红**）/ `ghost`（**去红**）
5. 成功 ⇒ `toast.success`（**带版本号**）+ `invalidateCache('/api/reviews')` + 跳回来源；失败 ⇒ `tErr(code)` + 刷新详情

**断言 / 门禁**：① 驳回空原因 ⇒ 确认钮 `disabled` ② 通过空意见 ⇒ 可提交 ③ 撤回 / 通过 **无 destructive 色** ④ 三动作成功路径各带 toast + 跳回 + 缓存失效 ⑤ 资产详情页**不再有**「审核」占位块（跨批页回归绿）⑥ `typecheck` + `biome` 绿

---

### T10 · 脚本：造数 + dogfood（G1–G10）

> 依据 = 批 design **§9.3**（G1–G10 · v0.9 断言扩至 9 条）· **§9.6**（造数）· **写库需用户授权**。

1. `docs/smoke/scripts/m4b5-seed-reviews.ts`（可重放 · 幂等 · 零 `delete` · 只碰 `m4b5-seed-*` / `m4b5_*` 前缀）：
   专用账号 `m4b5_owner` / `m4b5_member`（**不碰**既有账号）· **三族 fixture 资产 `asset.status` 一律 `HIDDEN`**（零门户 / 零「我的资产」污染）·
   **6 条 fixture**（① skill PENDING 含 `SKILL.md` ② mcp PENDING `servers` 2 条 **不造 README** ③ agent PENDING **不造 README** ④ skill REJECTED ⑤ skill WITHDRAWN ⑥ skill PENDING〔**B1 边界**：owner ≠ 提交人〕）
2. `docs/smoke/scripts/m4b5-review-dogfood.ts`（支持 `SMOKE_ONLY=<组>`）：**G1** 队列（管理档）· **G2** 队列（提交人守卫）· **G3–G5** 三族详情 · **G6** 三动作 · **G7** 权限矩阵（R2）· **G8** 边界 · **G9** 零回归（`m4a`/`m4b3`/`m4b4` 复跑）· **G10** 变更对比（**9 条断言**：契约 / split / 高亮两态 / 折叠 / 降级 / 无权限 / 两态 / 容器回退 / 缓存纪律）

**断言 / 门禁**：① 造数**幂等**（连跑两次结果一致）② G1–G10 **全绿** 且每段 `NO JS ERRORS` ③ `m4a` **60/0** · `m4b3` **43/0** · `m4b4` **89/0** **零回归** ④ dogfood **不得断言缓存命中率**（只断结果）

---

**T10 · 落地记录（2026-09-22）**

**① 造数 `m4b5-seed-reviews.ts`**（幂等 · 零 delete · 只碰 `m4b5-seed-*` / `m4b5_owner` / `m4b5_member`）
- **13 条 fixture** = §9.6 的 6 条 + **F189 追加 2 条**（⑦ 可比态 / ⑧ 同版本重审 —— §9.6 清单**没给**，而 G10 ①⑧ 需要真实 patch）+ **G6/G7 隔离 4 条**（⑩–⑬ 动作专用：G6 真点三动作会改库 ⇒ 与其它组依赖的 fixture 隔开，使**分段跑与全量跑都不互相打翻**）
- **⚠️ 关键实现：内容真写存储层**（`apps/server/storage/<assetId>/<versionId>/<path>` · 与 `versions.ts:115` 同布局 + `asset_file.sha256/size` 同步）—— diff 要比对**真实文件内容**；既有 `m4b4-seed-assets.ts` 不写存储（它只断文件树结构）⇒ 本批必须写
- **⑥ B1 语义订正**：上传者 = **owner 本人**、提交人 = `m4b5_member`（代提）⇒ 成员**既非 owner 也非上传者** ⇒ 预览 404 成立（首稿把上传者也设成 member ⇒ B1 不成立、预览会成功）
- **幂等实测**：复跑 ⇒ 同 slug 同 task 无重复；`(版本, 状态)` 为 upsert 键 ⇒ **PENDING 有 DB 唯一约束**兜底

**② dogfood `m4b5-review-dogfood.ts`**（G1–G10 + **G10⑭ 门户侧** · `SMOKE_ONLY` 分段 · PASS/FAIL + CDP 超时计数 · 进度落盘）

**③ 跑史与失败归因（**产品代码零改动** —— 26 → 0 全部是探针自造缺陷）**

| 轮 | 结果 | 根因（均为探针/脚本） | 修法 |
|----|------|---------------------|------|
| run1 | **35 PASS / 26 FAIL** | ① **会话复用 bug**：`loginAs` 用「登录过的集合」⇒ G2 切成提交人后 `loginAs(MGR)` 直接 return ⇒ G3–G10 全在**提交人视面**跑（面包屑「我的提交」· 动作只剩「撤回」） | 改**当前登录者跟踪**（`curUser` 不一致即重登） |
| run2 | **54 / 7** | ② 页头取 `h1,h2` ⇒ 命中外壳标题（「审核详情」）；③ 探测未按**卡片作用域**（侧栏 `aria-expanded` 混入 · diff 展开点错钮） | ② 改 `[data-slot="card-title"]`；③ 一律**限定在目标卡内** |
| run3 | **59 / 2** | ④ `fillInput` 用 `HTMLInputElement.prototype` 的 setter 填 **`<Textarea>`** ⇒ 值进不去、确认钮恒 disabled；⑤ G8 用 `aria-expanded` 数文件行（该 fixture 无子目录 ⇒ 恒 0） | ④ **按 `tagName` 选原型**；⑤ 改「行文本 + `disabled` 态」探测 |
| run4 | **60 / 1** | ⑥ 白屏判据载体 `nav` 该页**不存在** ⇒ 误判；⑦ B1 预览用真指针未点中 | ⑥ 改「正文长度 + 卡标题在场」；⑦ 改 **`el.click()`**（技能 §4：纯 React `onClick` 钮的可靠路径） |
| run5 | **✅ 61 PASS / 0 FAIL / 0 CDP 超时** | — | — |
| run6 | **待跑**（新加 G10⑭ 门户侧；撞登录限流窗口，见 F191） | — | — |

**④ G9 零回归**（外部三脚本）：`m4a-chain-smoke` **PASS** ✅ · `m4b3-personal-a-dogfood` **43 PASS / 0 FAIL**（基线 43 ✓）· `m4b4-personal-b-dogfood` **待重跑**（撞 `LOGIN_RATE_LIMIT` 20次/15分钟 · in-memory ⇒ F191）

**⑤ 证据截图**：`docs/smoke/m4b5-{g1-queue,g3-detail-skill,g4-detail-mcp,g5-detail-agent,g6-after-actions,g7-member-view,g8-rejected,g8-b1-preview,g10-diff-highlight-on,g10-container-narrow,g10-samever-empty}.png`（**11 张** + 待补 `g10-portal-diff-split`）

**⑥ 新增登记**
- **F189 🟡（造数清单缺口）**：§9.6 只给 6 条 fixture，**无「可比态」数据** ⇒ G10 ①⑧ 无法实证 ⇒ 追加 ⑦⑧
- **F190 🟡（死键）**：`review.preview.failed` **零消费点** —— 既有共享 `FilePreviewDialog` 已用 `errors.unknown {code}` 内联报错（信息量更大）⇒ **退役该键**（i18n **405 → 404**）· design §4.4/§6.1 订正为「复用共享对话框的既有错误面」
- **F191 ⚪（环境/流程）**：同轮多次重跑会**打满服务端登录限流**（`LOGIN_RATE_LIMIT` 20次/15分钟 · in-memory · `better-auth.ts:64`）⇒ 分段/重跑节奏需留量；清零只能重启 api（或等窗口）
- **T8 登记的「未验 3 项」已全部收敛**：`adminOnlyHint`（G7④）· **可比态变更对比**（G10⑥⑧）· **三动作成功路径**（G6①–⑧）
- **F156 全链闭环**：G10 ①–⑭（契约 / split / 高亮两态 / 折叠懒渲染 / 容器回退 / 两态 / **门户侧同件**）

---

### T11 · 验证收尾：八步门禁 + 证据 + 定稿条件 ② + 收尾回填

> 依据 = 批 design **§9.1–§9.8**。

1. 八步门禁（**CI 同序，逐项 exit 0**）：`bun install --frozen-lockfile` → `typecheck` → `lint` → `format:check` → `doc-audit` → `build` → `db:migrate` → `test`
2. 证据：三族详情页**截图各 1 张** + 队列页截图 + 三动作截图 + 权限矩阵双视角 + `REJECTED` 态 + diff 面（门户 + 审核面 · **split + 高亮开**）+ G10 断言输出 + **构建产物 gzip 实测**
3. **定稿条件 ② 证据**（本批独有出口件）：三族卡形态断言（G3/G4/G5）+ 三张截图 + 结论一句 ⇒ **用户据此对主 design 单独下定稿口令**
4. 收尾回填（§9.8）：i18n 键数实测 · `test` 例数 · dogfood 断言数（组成式）· 件表 `wc -l` · 体积 / 语言数 / 200ms 阈值 / patch 上界

**断言 / 门禁**：① 八门禁 **exit 0**（实测 `test` **562 pass / 0 fail** · `doc-audit` **70 PASS / 0 FAIL**）② 证据齐（**12** 张截图）③ 回填项**全部用实测值**（禁估算）

---

### T12 · 文档同步（本批即改 + 跨批契约变更）

> 依据 = 批 design **§9.7**（**10 项**）+ **§9.7b**（**5 项** · R2 + F156）。

1. 主 design：§2.3 批件登记表 · §5.1/§5.2（列集合与详情形态）· §6.3 迁移影响面订正 · §7.1 端点表（含 2 加性字段）· §8 接口变更总览 · §11 键数链（**404**）· §2.4 U5 半句订正 · §12 线框原地保留
2. **P3 文案统一**：主 design §11 文案分层口径 / §12 线框 / `docs/00` ⇒ 「审核队列」→「**审核管理**」（字典值**不改**）
3. `docs/00` §5 M4b-5 行：⬜ → 实现进度 + 证据指针
4. **§9.7b（R2 + F156）**：`docs/05` §6.4 删防自审行 + 记偏离 · 主 design §7.1 删 `self_review` 行 + `:390` 双保险句 · **M3 批 design 只加指针** · **历史批 design 只加指针**（M4a `:192-193` · M4b-1 `:75/:84/:200`）
5. 提交粒度：跨批清理（删占位块）**独立 commit**（G-Q5）

**断言 / 门禁**：① `doc-audit` **70 PASS / 0 FAIL**（含本 plan 头部版本行 ≤3 + 最新版在修订表内）② 主 design 键数链到 **404** ③ 「审核队列」在**活文档**零残留（历史批 design 只留指针行）

---

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```text
bun install --frozen-lockfile → typecheck → lint → format:check →
bun docs/smoke/scripts/doc-audit.ts → build → db:migrate → test
```

逐项 **exit 0** 才算过；顺序**不得调换**（CI 同序）。**每 Task 收尾**先跑本包 `typecheck` + `biome`，
**落地前**跑全量八步。**dogfood 逐段跑**（`SMOKE_ONLY=G3`），**收尾才全量**；每段 `NO JS ERRORS` 为硬门。

---

## 5. 造数需求（**写库需用户授权**）

- `docs/smoke/scripts/m4b5-seed-reviews.ts`（T10 交付 · **473 行**）—— **13 条 fixture**（F189 扩：三族 PENDING / REJECTED / WITHDRAWN / 可比态 / 同版本重审 / 自审 + 动作专用 **4** 条隔离 · **真写存储层**），三族资产 **`HIDDEN`**，专用账号两枚
- **口令只从 env 读**（复用 `SMOKE_M4B2_PASSWORD` 约定）；运行方式 `bun --env-file=apps/server/.env …`（根目录无 `.env`）
- ⚠️ **写库前须获用户明确授权**（本 plan 不代为执行）

---

## 6. 风险与回退

| # | 风险 | 缓解 / 回退 |
|---|------|------------|
| 1 | **破坏性契约变更**（`hunks[]` → `patch`）漏改消费点 | 消费者 **7 处**清单（§5.5）逐一核对；`typecheck` 兜底；**零外部消费者**已实测（`packages/` 仅 `protocol`） |
| 2 | diff 渲染性能（大文件 + 高亮） | 默认折叠懒渲染 + 单文件 **> 200ms ⇒ 降级关高亮** + 缓存（含授权前置硬约束） |
| 3 | `refractor` 按需注册漏语言（**静默无高亮，不报错**） | 21 语言清单入 §4.10 + **构建期体积实测**（偏差 > 20% 须复核）+ dogfood 高亮断言 |
| 4 | 单管理档团队无互审（R2 偏离四眼原则） | **有意偏离**已登记代价 + **复归点唯一**（恢复 `isSelfReview` + 403 码即可） |
| 5 | 跨批改动（删占位块）影响 M4b-4 已交付页 | **独立 commit**（可单独回滚）· `m4b4` dogfood **零回归**断言 |
| 6 | 造数污染门户 / 「我的资产」 | 三族 **`HIDDEN`** + 专用账号双保险（既有基线已实测不脆） |
| 7 | **dev 库资产增长打翻既有冒烟余量**（**F174** 已实证：ACTIVE 29 条 ⇒ `m4a-chain-smoke` limit=20 断言脆弱） | `chain-smoke` 已改 **`limit=100`**；`m4a-dogfood` 分页断言**余量耗尽风险** ⇒ T10/T11 复跑复核，必要时改判据（**零回归口径 = 无「新」失败**） |

---

## 7. 落地记录（执行期回填）

> 逐 Task 收尾回填：**实测断言数（PASS/FAIL）· 门禁结果 · 发现（F 号）· 偏差申报**。

| Task | 日期 | 实测 | 门禁 | 发现 / 偏差 |
|------|------|------|------|------------|
| **T12** | 2026-09-22 | 文档同步 **6 文件**落地：批 design **v0.13**（§9.8 回填 11 项 + 未实测 2 项）· **主 design v1.63**（**定稿条件 ② ✅ 闭合** · §6.3 翻转订正 · §7.1 三行 · §8 +4 行 · §11 **404 键** · §14 +1）· `docs/00` **v1.88**（§5 M4b-5 行 ✅）· `docs/05` **v1.11**（§6.4 **R2 偏离登记**）· `docs/08` 三处防自审注记 · 历史批指针 **3 处**（M4a v0.38 / M4b-1 v1.8 / M3 v1.7） | `doc-audit` **70 PASS / 0 FAIL**（终检）+ 八步门禁**复跑 8/8 exit 0** | P3 文案统一：主 design **11 处**「审核队列」→「**审核管理**」+ 本批文档 12 处 ⇒ **活文档零残留**（余者仅历史批 design 正文与修订留痕，符合「只加指针」口径）· 端点源码依据**行号按真码重取**（`query.ts:70-85 / 152-175` · `reviews.ts:101-141 / 142-154`）|
| **追加（diff 观感）** | 2026-09-22 | 对标 = **真浏览器实测** GitHub commit diff 页（`commit/712c118`：代码格 `.diff-text-cell` **12px** · 行容器 **24px** · 页面正文 14px）⇒ 主题域定值 **字号 12px · 行高 20px**（实测 `{fs:12px, lh:20px, rowH:20}` · 两处挂载点一并生效 · 与 GitHub 差异 = 行高有意收紧） | 终跑复跑 · 八步门禁 **8/8 exit 0** | **F195** 🟡（库 CSS 不定字号 ⇒ 继承根 16px，比同页正文 13px 还大）· **F196** ⚪（split 占位格红竖线 = **上游默认渲染**：官方 README 语义「Gutter with no content」vs 默认样式自画 2px 红线 · 已用最新版 **3.3.3** · 上游 issue 无相关报告 ⇒ **用户拍板保留官方设计与做法、不加覆盖**；决策 + 两条关闭路径已写进 `apps/web/src/styles/diff-tokens.css` 注释）|
| **T11** | 2026-09-22 | 八步门禁 **8/8 exit 0**（`install` / `typecheck` 4/4 / `lint` **0 error**（138 warn） / `format:check` **285 件** / `doc-audit` **70/0** / `build` 4/4 / `db:migrate` / `test` **562 pass · 0 fail**）· 本批 dogfood **62 PASS / 0 FAIL / 0 超时**（run8 全量 · 含 `G10⑭`）· 分段 `SMOKE_ONLY=G10` **15/15** · 零回归 `m4a` **34/0** · `m4b3` **43/0** · `m4b4` **89/0**（88/1 → 修探针后归零）· i18n **404/404**（差集 0 · 组 12）· 证据 **12** 张截图 | 全绿（见「实测」列） | **F192** 🟡（`G10⑭` 探针未按容器作用域 + 一次性 `sleep` ⇒ run7 假失败 `portal=null`；已修为**作用域 + 轮询**）· **F193** 🟡（`m4b4` G13 探针过时：搜索经 HEAD 内 `b30607e` 改**折叠式** ⇒ 须先展开；**正向验证产品正常** · **非本批引入** · 用户拍板 A 修）· **F194** ⚪（本批 2 脚本未过 `format:check` + 迁移 2 文件 `organizeImports` **2 error** ⇒ 门禁抓出并修，三项复测绿）· 登录限流处置：api **干净重启**（`bun --watch` 对 `touch` 不触发重载）⇒ 计数清零 |
| **T10** | 2026-09-22 | 造数 13 fixture（幂等 · 写真实存储）· dogfood 跑史 **35/26 → 54/7 → 59/2 → 60/1 → 61/0**（26 FAIL 全为探针自造，产品零改动）· G9：`m4a` PASS · `m4b3` **43/0** · `m4b4` 待重跑（限流） | 证据 11 张截图 · `NO JS ERRORS` ✓ | **F189**（造数缺可比态）· **F190**（死键退役 ⇒ 404）· **F191**（登录限流打满）|
| **T8+T9** | 2026-09-22 | 三视面真浏览器：面包屑分叉 ✓ · 三动作矩阵 ✓ · 处理态 ✓ · 首版态整卡不渲染 ✓ · 视觉 5/5 | `typecheck` 4/4 · `biome` 干净 · `build` ✓ | **F187**（`manifestJson` 类型谎言 ⇒ 订正）· **F188**（懒加载口径登记）· 已知未验 3 项交 T10 |
| **T7** | 2026-09-22 | 真浏览器：**7 列 / 7 行 / 动作 7/7「查看」/ 列开关保护 2 项生效**（关「类型」⇒ 6 列）· 视觉 **5/5** | `typecheck` 4/4 · `biome` 干净 | **F185**（`aria-label` 误用列头键 ⇒ 复用 `submissions.action.view`）· **F186**（dev 夹具 `user.name`=用户名 · `submittedBy`=`usr_…`）· 验收账号 **`m4b2_mgr`** 记入 §5 |
| **T5+T6** | 2026-09-22 | 真浏览器 **8 项断言全绿**（见落地记录表）· 体积 **gzip 54.6KB**（估算偏差 2.5%） | `typecheck` 4/4 · `biome` 干净 · `build` ✓ | **F181 🔴**（缺主题 CSS ⇒ 高亮无效 · 已修）· **F184 🟡**（`ResizeObserver` 因提前 return 从未 attach · 已修）· **F180**（阈值 960→700）· **F182**（G10 口径）· 首轮 `../shadcn/` 路径写错（build 抓住） |
| **T4** | 2026-09-22 | i18n 实测 **405/405**（`review` 62/62 · `errors` 34/34 · 组 12）· 双向差集 **0** · 泄漏 **0** | `typecheck` 4/4 · `biome` 已格式化 | **F179**（`reviewable` 冗余 ⇒ 删它零行为变化）· 计划调整：**占位块删除 T9 → T4**（键与消费者同批） |
| **T3** | 2026-09-22 | `rbac` + `service` + `reviews` 三文件 **53/0** | `typecheck` 4/4 · `biome` 已格式化 | 代码 **18 维 9.34** · **F177**（§4.6.1「删 2 处」实为 **4 行**：`role` 常量连带死代码）· **F178**（注释腐化 2 处已修） |
| **T2** | 2026-09-22 | `reviews.test.ts` **23/0**（新增 1 组 5 例） | `typecheck` 4/4 · `lint` exit 0 | 代码 **18 维 9.33** · **F175**（`null` 兜底不可构造：FK + 软删）· **F176**（设计「2 join」实为 **1 自连接** + 本仓首个 `alias()`） |
| **T1** | 2026-09-22 | `assets.test.ts` **76/0** · `m4a-chain-smoke` **PASS ×2** | `typecheck` 4/4 · `lint` exit 0 · `biome` 已格式化 | 代码 **18 维 9.38** · **F174**（dev 库 ACTIVE **29** 条 ⇒ 冒烟 limit 断言脆弱 · 已修 + dogfood 余量风险登记）· 既有 device 全量干扰（正反双证 · 非本笔）· 测试坑：`bun test -t` 过滤跳 `beforeAll` |

---

## 8. 自检打分（初稿）

> 本 plan 的 8 维自检（标准 4 + 深度 4）—— **由批 design v0.9 派生**，Task 明细可执行性 = 主要判据。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | 9.7 | T1–T12 覆盖设计 §1.3 全部含项（含 4 处服务端 + diff 退役 + i18n + 文档同步）；每 Task 带断言 |
| 标准 2 准确性 | 9.7 | 全部依据批 design **v0.9 实测值**（文件行号 / 契约 / 键数 / 体积）；无估算 |
| 标准 3 一致性 | 9.7 | 与 design §3.1/§3.2 件表、§5 服务端账（4 处）、§6 键数（405）、§9 验证口径逐条对齐 |
| 标准 4 可用性 | 9.7 | 每 Task = 文件路径 + 步骤 + **可现场跑的断言** |
| 深度 1 追溯性 | 10 | 每 Task 带 design 章节指针 |
| 深度 2 反证 | 9.5 | 含非目标 5 条 + 登记缺口 2 条 + 风险回退 6 条；**被否决方案按口径不入档** |
| 深度 3 边界/风险 | 9.7 | 破坏性契约 / 性能 / 静默失败 / 四眼偏离 / 跨批 / 造数污染 六项均有缓解 |
| 深度 4 维护性 | 9.6 | Task 序 = 服务端能力先行 ⇒ 前端不留待补契约；跨批改动独立 commit |

**初稿均分 = 9.66**（9.7+9.7+9.7+9.7+10+9.5+9.7+9.6 = 77.6 ÷ 8）⇒ 达门（≥9）。**换靶复核位**见 §8.1（执行期回填）。

### 8.1 执行期换靶复核（2026-09-22 · 角轮 = **实测值对账 + 断言可跑性**）

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | 9.7 | T1–T12 全覆盖；T11 四类实测齐（门禁 / dogfood / 零回归 / i18n） |
| 标准 2 准确性 | 9.5 | 执行期订正 **3 处陈旧值**（`test` 559→**562** · `doc-audit` 68→**70** · 键数 405→**404**）+ 造数 6→**13 条** |
| 标准 3 一致性 | 9.7 | 与批 design **v0.13** 件表 / 服务端账（4 处）/ 键数逐条对齐 |
| 标准 4 可用性 | 9.7 | 每 Task 断言均可现场复跑（T11 已复跑 · 全绿） |
| 深度 1 追溯性 | 9.8 | 每 Task 带 design 章节指针；§7 落地记录逐 Task 回填实测 |
| 深度 2 反证 | 9.6 | **F192/F193/F194** 如实登记，含「**非本批引入**」的既有失败归属 + 用户拍板记录 |
| 深度 3 边界/风险 | 9.7 | 登录限流 / 既有冒烟漂移 / dev 库余量 三类环境风险均有实证与处置 |
| 深度 4 维护性 | 9.7 | 探针修法（**作用域 + 轮询**）可复用到后续脚本；回填全用实测值 |

**执行期均分 = 9.675 ⇒ 9.68**（77.4 ÷ 8）⇒ 达门（≥9）。较初稿 **9.66** 微升（+0.02）。


---

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v0.12** | 2026-09-22 | sunxuewen-rush | **diff 观感追加（对标 GitHub 实测）** —— ① 定值 **字号 12px · 行高 20px**（字号 = GitHub 实测 12px；行高 20px = **有意偏离**，GitHub 用 24px）② 两处挂载点一并生效 ③ **F195/F196** 登记（F196 = 上游默认渲染 ⇒ **保留官方设计与做法、不加覆盖**，决策写进 CSS 注释）④ 设计 bump **v0.14** ⑤ 八步门禁复跑 **8/8**；**T1–T12 全绿 · 待提交** |
| **v0.11** | 2026-09-22 | sunxuewen-rush | **T12 文档同步** —— ① 批 design **v0.13** ② 主 design **v1.63**（**定稿条件 ② 闭合** · §6.3 翻转 · §7.1 三行 · §8 +4 · §11 **404 键** · §14 +1 · P3 **11 处**）③ `docs/00` **v1.88** ④ `docs/05` **v1.11**（**R2 偏离登记**）⑤ `docs/08` 三处 ⑥ 历史批指针（M4a / M4b-1 / M3 · 正文不改）⑦ 终检 `doc-audit` **70/0** + 八步门禁复跑 **8/8** ⑧ **T1–T12 全绿 · 待提交** |
| **v0.10** | 2026-09-22 | sunxuewen-rush | **T11 验证收尾** —— ① 八步门禁 **8/8 exit 0**（`test` **562/0** · `doc-audit` **70/0**）② 本批 dogfood **62 PASS / 0 FAIL / 0 超时**（全量 · 含 `G10⑭`）· 分段 **15/15** ③ 零回归 `m4a` **34/0** · `m4b3` **43/0** · `m4b4` **89/0**（88/1 → 修探针后归零）④ **F192/F193/F194** 补登（F193 含「非本批引入」归属 + 用户拍板记录）⑤ 陈旧值订正 3 处 + 造数 6→13 ⑥ §8.1 执行期换靶 **9.68** ⑦ 收尾回填实测值入 design §9.8 |
| **v0.9** | 2026-09-22 | sunxuewen-rush | **T10 落地（造数 + dogfood）** —— ① 造数 **13 fixture**（F189 补可比态/同版本重审 + G6/G7 隔离 4 条 · **内容真写存储层** · ⑥ B1 语义订正）② dogfood G1–G10 **+G10⑭ 门户侧** ③ 跑史 **35/26 → 54/7 → 59/2 → 60/1 → 61/0**（26 FAIL 全为探针，含 7 类修法）④ G9：`m4a` ✓ · `m4b3` 43/0 ✓ · `m4b4` 待重跑 ⑤ **F189/F190/F191** ⑥ T8 的「未验 3 项」全收敛 |
| **v0.8** | 2026-09-22 | sunxuewen-rush | **T8+T9 落地（共享详情 + `ConfirmDialog` 三态）** —— ① 新页 `pages/ReviewDetail.tsx`（面包屑分叉 · 三段竖排主列 · 右栏两卡 · 变更对比卡三态）② 新件 `console/reviews/{ManifestCard,ReviewMetaCard}.tsx` + `lib/review-permissions.ts` ③ `ConfirmDialog` **原因三态**（删 `requireReason` 不留别名）+ 消费者同步 ④ `/reviews/:id` 换真页 · `DEV_BATCH` **5 → 2 条**（含删死条目）⑤ **三视面真浏览器全绿** + 视觉 5/5 ⑥ **F187**（`manifestJson` 类型谎言）· **F188**（懒加载口径）⑦ 已知未验 3 项交 T10 |
| **v0.7** | 2026-09-22 | sunxuewen-rush | **T7 落地（审核管理页）** —— ① 新页 `pages/ReviewQueue.tsx`（7 列 · 状态筛选 · 分页 · 列开关保护 2 列 · URL 状态化）② API 客户端 `fetchReviewDetail`/`approveReview`/`rejectReview` + `ReviewDetailItem` + `submittedByName` ③ `/admin/reviews` 换真页 + `DEV_BATCH` 5 → **4 条** ④ **真浏览器 7 列/7 行/动作 7/7/列开关保护生效** + 视觉 5/5 ⑤ **F185**（`aria-label` 误用）· **F186**（夹具特性）⑥ 验收账号 **`m4b2_mgr`**（与 `m4b2_user` 共用口令） |
| **v0.6** | 2026-09-22 | sunxuewen-rush | **T5+T6 落地（`DiffWorkspace` + 自研 diff 退役）** —— ① 新件 `ui/DiffWorkspace.tsx`（`files[]` 入参 · 默认 split · 容器宽回退 · 高亮开关 · 折叠懒渲染 · a11y）② 新 CSS `styles/diff-tokens.css`（**F181**：无它则高亮形同虚设）③ 迁移 3 件 + 内部 import 深度重写 + FileTree `onOpenFile?` 加性 prop ④ `git rm` `DiffView`/`DiffNav` + `VersionCompare` 改向 + `Badge` 注释同步 ⑤ 契约 `hunks[]` → `patch?` ⑥ **真浏览器 8 项断言全绿** + `vision` 5/5 ⑦ **体积 gzip 54.6KB**（估算 ≈56KB ⇒ 偏差 2.5%）⑧ **F180**（阈值 960→700）· **F181** · **F182** · **F183**（`ResizeObserver` 未 attach）⇒ 设计 **v0.11** |
| **v0.5** | 2026-09-22 | sunxuewen-rush | **T4 落地（i18n + 跨批占位块清理）** —— ① `review` 组 **+57 键**（五段组成式）· 退役 **2 键** ② 实测 **405/405**（`review` 62/62 · `errors` 34/34 · 组 12 · 双向差集 0 · en 泄漏 0）—— **与设计目标逐项吻合** ③ **计划调整**：`AssetAdminCard` 删占位块 **T9 → T4**（退役键与其唯一消费者必须同批，否则 typecheck 红；提交粒度仍独立 commit）④ **F179**（`reviewable` 冗余 ⇒ 删除零行为变化）⑤ `typecheck` 4/4 |
| **v0.4** | 2026-09-22 | sunxuewen-rush | **T3 落地（R2 移除防自审）** —— ① 删 `isSelfReview`（rbac + 其 3 例测试）② `http/reviews.ts` approve/reject **各删 2 行**（含连带死代码 `const role`）③ `review/service.ts` 去 `isSuperAdmin` 入参 + **整段防自审判定** ④ `review/errors.ts` 删 `selfReview` 码（**6 → 5**）⑤ `service.test.ts` **10 处 payload 全删** + 原 403 用例**改写为「管理档可自审 ⇒ 放行」** ⑥ 三文件 **53/0** · `typecheck` 4/4 ⑦ **F177**（「删 2 处」实为 **4 行**）· **F178**（**注释腐化 2 处**已修） |
| **v0.3** | 2026-09-22 | sunxuewen-rush | **T2 落地（读面 2 加性字段）** —— ① `submittedByName`（`LIST_SELECT` +1 字段 · 三面各 +1 `leftJoin(user)`）② `latestVersion`（**仅详情** · `asset_version` **自连接** via `alias()` + select/接口各 +1 字段）③ `reviews.test.ts` **23/0**（新增 1 组 5 例，含 `latestVersion` 两态 `null → "1.0.0"`）④ `typecheck` 4/4 · `lint` exit 0 ⑤ **F175**（null 兜底不可构造：FK + 软删）· **F176**（设计「2 join」订正为 **1 自连接** + 本仓首个 `alias()` 用法申报） |
| **v0.2** | 2026-09-22 | sunxuewen-rush | **T1 落地（服务端对比引擎替换）** —— ① `version-compare.ts` 重写：自研 LCS DP ⇒ **jsdiff `structuredPatch(context: Infinity)`** + `buildPatch()` **3 行头**编排（不产 `index` · 增删 `/dev/null`）② 缓存改**内容寻址**（`path|sha256|sha256|changeType` ⇒ 跨版本/跨资产复用，内容变即失效）+ `__resetCompareCache()` ③ 授权恒在缓存之前 ④ 契约 `hunks[]` → **`patch`**；`assets.test.ts` **76/0** · `m4a-chain-smoke` **PASS ×2** ⑤ `typecheck` 4/4 · `lint` exit 0 ⑥ **F174**（dev 库 ACTIVE 29 条 ⇒ limit=20 断言脆弱 · 已修；dogfood 余量风险登记）⑦ 测试坑登记：`bun test -t` 过滤跳 `beforeAll` ⇒ 门禁跑全文件 |
| **v0.1** | 2026-09-22 | sunxuewen-rush | **首稿**：由批 design **v0.9**（8 维 9.86 · grilling 两轮清空）派生 —— ① §1 目标 12 项 + 非目标 5 条 + 登记缺口 2 条 ② §2 **T1–T12** 总览（含前置与出口）③ §3 逐 Task 明细（依据 + 步骤 + **断言/门禁**）④ §4 八步门禁（CI 同序）⑤ §5 造数（**写库需授权**）⑥ §6 风险回退 6 条 ⑦ §7 落地记录位 ⑧ §8 自检 **9.66**（含换靶复核位）。**本版零实现改动**（落 plan 前的物料清理另计：卸载落选两包 `@git-diff-view/react` + `@pierre/diffs` · 删 `__proto/` · `main.tsx` 还原零 diff · `refractor.d.ts` 落正式位 `apps/web/src/types/`） |
