# M4b-4 个人面 B 批（我的资产 / 工作台 landing / 详情页管理区 / star）· 验收硬证据

> **本文件 = 本批出口件的证据记录**（批 plan T11 断言①-⑦ · 批 design §9.3/§9.4/§9.5）。
> 所有数字一律为**实测产出**（命令 / 脚本 / 真浏览器 CDP），非人工点数；行数一律 `wc -l` 口径。
>
> **状态：✅ 已回填（2026-09-18 执行期）** —— 各节数字均取自当次真实运行输出；未跑项在 §10 显式登记为未证项。
>
> ⚠️ **口令纪律**：脚本口令一律从 env 读（`SMOKE_M4B2_PASSWORD`，四个测试账号共用），**仓库内零口令 / 零连接串**（本文件亦不含值；`apps/server/.env` 已被 `.gitignore` 忽略）。

## 1. 五门禁（CI 顺序复现 · 断言②）

| 步骤 | 命令 | 结果 |
|------|------|------|
| 依赖 | `bun install --frozen-lockfile` | **exit 0** —— `Checked 414 installs across 543 packages (no changes)` |
| 类型 | `bun run typecheck` | **exit 0** |
| 静态 | `bun run lint` | **exit 0** —— 1 条 **预存在** warning（`AppShell.tsx:55 noDocumentCookie`；已用 HEAD 版文件单独跑 biome 反证：同样 1 warning ⇒ 非本批引入） |
| 格式 | `bun run format:check` | **exit 0** —— `Checked 267 files` |
| 文档体检 | `bun docs/smoke/scripts/doc-audit.ts` | **exit 0** —— **64 PASS / 0 FAIL**（= 基线 64） |
| 构建 | `bun run build` | **exit 0** —— `Tasks: 4 successful, 4 total` |
| 迁移 | `bun run db:migrate` | **exit 0** —— `[db] migrations applied`（本批**零迁移**，仍跑守门） |
| 测试 | `CI=true bun run test` | **exit 0** —— `server: Ran 551 tests across 51 files`（= 基线 537 + 本批补测 **14**）· `protocol: Ran 27 tests across 6 files` · **0 fail** |
| **提交链 · CI** | 三个 commit 已推送 `origin/main`（`a918930..f2485aa`）：`e78c200`（T12+T16）· `9973d6b`（T6）· `f2485aa`（测试 + 脚本 + 证据 + 文档）；GitHub Actions run `35366866235` **success**（12 步全 success）| ✅ 本批**已交付** |
| **覆盖探针**（T11-c 新增维度 · 仓库原无此基建） | `cd apps/server && bun test --coverage src/` | **全仓 95.60% funcs / 96.28% lines**；本批服务端面：`assets/yank.ts` **100/100** · `assets/stars.ts` **100/100** · `http/me.ts` **100/100** · `http/asset-item.ts` **100/100** · `assets/manage.ts` **100/100** · `labels/service.ts` 100/92.62 · **`http/assets.ts` 90.97 → 95.96 lines**（`POST /:slug/versions/:version/yank` 路由 683-713 由 **0 → 覆盖**） |

## 2. 门户零回归 + 链冒烟（断言③）

| 项 | 结果 |
|----|------|
| `m4a-dogfood.ts` | **36 PASS / 0 FAIL + NO JS ERRORS**（本批跑了 **3 次**：T12 后 · `AssetCard` DOM 改动后 · 收尾复跑；三次同值） |
| `m4a-chain-smoke.ts` | **`CHAIN SMOKE PASS`** |
| `CenterPage.tsx` diff | **为空**（`git status --porcelain` 无输出 —— 共享 hook `useMarketQuery` 的加性维度未触达门户调用点） |

## 3. 本批 dogfood：G1-G19（断言① · `docs/smoke/scripts/m4b4-personal-b-dogfood.ts`）

> ⚠️ **v1.22 起为 G1–G21** —— 本节表内 G1–G19 为 T11 收尾态（**53 PASS**）；本轮追加 **G20（视图切换 ×10）+ G21（折叠搜索 ×6）**
> ⇒ 现行 **77 PASS / 0 FAIL**（实跑记录见 **§13.2**）。

**总结果：`✅ PASS 60 · FAIL 0 · CDP 超时 0` + `NO JS ERRORS`**（53 → 58 = T11-c 补测 **G12b** 五条；58 → **60** = 验收期 UI 轮 **G14b** 两条，且 G18 改指详情页）

| 组 | 断言 | 实测证据（原样摘录） |
|----|------|---------------------|
| **G1** | 未登录访两页 ⇒ 重定向 `/login?next=<带码路径>` | ✅ `/dashboard → /login?next=%2Fdashboard` · `/dashboard/assets → /login?next=%2Fdashboard%2Fassets` |
| **G2** | `role = 1` 工作台：只渲染 1 卡 + 只发 1 请求 | ✅ 卡链接 = `["/dashboard/assets"]` · 业务请求 **1 条**（`/api/me/assets?status=ALL&limit=1`） |
| **G3** | `role = 10` 工作台：3 卡 + 3 请求；审计卡 5 行不含操作人 | ✅ 卡 = `["/admin/reviews","/dashboard/assets","/admin/audit"]` · 请求 **3 条** · 审计 `rows=5` · 列头 = `时间,动作,对象`（无「操作人」） |
| **G4** | 我的资产默认「全部」⇒ 请求含 `status=ALL` | ✅ `/api/me/assets?status=ALL&limit=20&offset=0` |
| **G5** | owner-only 集合：他人资产不出现 | ✅ `含 other=false`（`m4b4-seed-other` 不出现；行数 = 3 = 我名下三态） |
| **G6** | 九列齐 + 三态值正确 + 类型列无色 | ✅ 表头 = `名称,类型,状态,标签,版本,下载,收藏,更新,操作` · `rows=3`（活跃/已隐藏/已归档）· `bg-type-*` 色块 **0** |
| **G7** | 操作列 = 真链接；点击直跳；全站无 sheet | ✅ `href=/assets/m4b4-seed-skill` · 点击后 `pathname=/assets/m4b4-seed-skill` · `[data-slot="sheet-content"]` 计数 **0**（反证抽屉已取消） |
| **G8** | 详情页为唯一视图 + 匿名可下载 | ✅ `h1=m4b4-seed-skill`（无过渡态）· 下载链 `a[href=/api/assets/m4b4-seed-skill/versions/1.0.0/download]` |
| **G9** | 标签 chip 文案 = `displayName`（≠ slug） | ✅ chips 含「**特权示例**」（PRIVILEGED，zh 译名）与「智能体」（`agentic`）；无 `m4b4-seed-*` 字面 |
| **G10** | 列表 下载/收藏 数值 = 接口值 | ✅ 接口 `dl=0 star=1`；行文本含 `0` / `1`（同刻） |
| **G11** | 详情页管理区 **5 档权限矩阵** | ✅ ①访客：管理区/标签卡均**不渲染** ②登录非 owner（`m4b4_outsider`）：同 ① ③owner：两卡渲染 · 无「特权标签」· **PRIVILEGED chip 的 × 禁用**（`locked=1`） ④管理档：两卡渲染 · 无「特权标签」 ⑤超管：**有「特权标签」按钮** · `locked=0`（× 可点） |
| **G12** | 版本 Tab 行内动作：owner 2 态 / 管理档 4 态 + yank | ✅ 访客 `{del:0,yank:0}` · owner `{del:1,yank:0}`（仅 `DRAFT` 行）· 管理档 `{del:3,yank:1}`（`DRAFT`/`REJECTED`/`UPLOADED` + 仅 `PUBLISHED` 行 yank） |
| **G12b**（T11-c 补） | **撤回分发「UI → 端点」端到端**（真点击，非仅渲染断言） | ✅ 五连：① 点行内「撤回分发」⇒ 官方 `AlertDialog` 打开 + 填原因 + 提交 ② 端点真被调用：版本 `1.0.0` **PUBLISHED → YANKED** ③ 行内入口消失（非 PUBLISHED 不再可撤）④ 已撤回版本下载 ⇒ **400 `asset.version_yanked`** ⑤ 重复撤回 ⇒ **400 `asset.version_not_yankable`**（明示非幂等契约）· ⚠️ **本段会改库** ⇒ 顺序恒为 **seed → dogfood** |
| **G13** | 筛选/搜索 ⇒ `page` 回落 + URL 同步 | ✅ `?page=2` + 切「已隐藏」⇒ `/dashboard/assets?status=HIDDEN`（**page 已删** · 行数收窄为 1）· q 输入 ⇒ `?q=m4b4` |
| **G14** | 门户零回归（+ 详情页收藏入口） | ✅ §2 的 `m4a-dogfood` **36/36**（T11 收尾态；**现行 37/37** —— F69/F75） + 详情页收藏入口存在（`aria-label` = `收藏 N`）· ⚠️ **门户卡已改纯展示**（2026-09-18 用户拍板）⇒ 见 **G14b** |
| **G14b-1**（T11-d 新增） | **门户卡星标 = 纯展示**（两枚同款 stat：下载 + 收藏 · 卡内 `button[aria-pressed]` = 0） | ✅ 实测两 stat 度量完全一致：font `11px` · color `rgb(100,116,139)` · icon `14×14`（同款由「同为 `AssetStat` 件」结构性保证）|
| **G14b-2**（T11-d 新增） | **点卡片星标处 ⇒ 穿透到整卡热区**（进详情页，非收藏动作） | ✅ 真坐标点击后 `pathname` = `/assets/*` |
| **G15** | star 幂等（**API 两次 `PUT` 口径**，F60） | ✅ `base=1 → 2 → 2`（两次 PUT 只 +1，`starred` 恒 true）· 两次 DELETE ⇒ `1 → 1` 回基线 |
| **G16** | `starredByMe` 语义 | ✅ 本收藏后 `true` · **他人收藏** ⇒ 我仍 `false` 且计数回基线 `{"s":1,"me":false}` · 我收藏他人资产 ⇒ `{"s":1,"me":true}` · 匿名 ⇒ `false` |
| **G17** | star 读面三处一致 | ✅ 列表列 = `1` · 详情头卡 = `收藏 1` · 接口 = `1` |
| **G18** | 未登录点收藏 ⇒ **不发写请求** + 跳登录 | ✅ `star 写请求 0 条` · 落点 `/login?next=%2Fskills` |
| **G19** | 全场景 `NO JS ERRORS` | ✅ `Runtime.exceptionThrown` / `console.error` 全程 **0** 命中 |

**截图（真浏览器，`docs/smoke/m4b4-*.png`）**：`01-dashboard-user`(44 KB) · `02-dashboard-admin`(83 KB) · `03-my-assets`(87 KB) · `04-detail-owner`(113 KB) · `05-detail-manager`(129 KB) · `06-detail-super`(111 KB)

> **执行期踩坑（脚本自身，已修 · 留痕防复现）**：① 复用既有 CDP tab 会命中历史遗留的僵死页 ⇒ **必须 `PUT /json/new` 新建 tab**（首跑 4 次 `Runtime.evaluate` 超时全由此而来）；② dev server 把 `apps/web/src/api/*.ts` 以 `/api/<name>.ts` 提供 ⇒ 宽松 `includes('/api/reviews')` / `includes('/star')` 会把**源码模块请求**计成业务请求（首跑误判「未登录发了收藏写请求」）⇒ 一律「端点正则 + 非 `.ts`」。

## 4. 造数（可重放 · 断言①/④ 的前提）

```
$ bun --env-file=apps/server/.env docs/smoke/scripts/m4b2-seed-roles.ts
[seed] cleared 58 session(s) · m4b2_super/mgr/user updated (password reset) · done — 3 accounts ready
$ bun --env-file=apps/server/.env docs/smoke/scripts/m4b4-seed-assets.ts
[seed] m4b4_outsider created (role=user, status=ACTIVE)
M4b-4 造数完成（4 账号 / 4 资产 / 6 版本 / 2 标签挂载 / 2 star）：
  m4b4-seed-agent  status=ARCHIVED  star_count=0
  m4b4-seed-mcp    status=HIDDEN    star_count=0
  m4b4-seed-other  status=ACTIVE    star_count=1   （owner = m4b2_mgr · G5 反证物）
  m4b4-seed-skill  status=ACTIVE    star_count=1   （owner = m4b2_user · 4 版本：PUBLISHED/DRAFT/REJECTED/UPLOADED）
```

- **写库授权**：用户 2026-09-18 明确授权（批 design §9.5 前置）；形态 = **全 upsert · 幂等可重放 · 零 `delete`**，只碰 `m4b4-seed-*` 与 `m4b4_outsider`。
- ⚠️ **运行顺序恒为 `seed → dogfood`**：dogfood 的 **G12b 会真撤回**（`m4b4-seed-skill` 的 `1.0.0` → `YANKED`）⇒ 重跑 dogfood 前先重跑 seed 复位（幂等）。
- 标签：`agentic`（既有 RECOMMENDED）+ `m4b4-seed-privileged`（本脚本建 · **PRIVILEGED** · zh「特权示例」/ en「Privileged sample」）两条挂到 `m4b4-seed-skill`。
- star：`m4b2_mgr`→`m4b4-seed-skill`（他人收藏对照）· `m4b2_user`→`m4b4-seed-other`（本人收藏正证）；`star_count` 由关系表**重算**（不 ±1 ⇒ 重跑不漂移）。

## 5. 整体审计（出口件 ⑤ · 全仓覆盖式扫描）

扫描脚本：`bash docs/smoke/scripts/m4b4-audit-scan.sh`（只读）+ `bun docs/smoke/scripts/m4b4-measure.ts`（只读）。

| 维度 | 结果 | 处置 |
|------|------|------|
| 已删/作废件残留（`__proto` / `AssetDrawer` / `ScanEye` / `asset-actions`） | **代码：`apps/web/src` 命中 0** ✅ · **文档关键字**：命中全在历史节（批 design §2.1c/§2.1d/§4.3/§9.7 与各修订记录）✅ —— **但关键字口径 ≠ 语义口径**：用户追问「文档也都对应修改了么？」后复查，抓出 **14 处「活口径仍按有抽屉写」** —— **首轮 8 处**（批 plan 7：§1 目标表 #2/#3 · §1 缺口段 · §2-T16 行依赖与件列 · T7 步骤 · T12 件表 ×2；主 design 1：§9/§12 段）· **换靶精修谓词再挖 6 处**（批 design 5：§2.1d 依赖表 U6 行 · §3.1 件 11 · §5.1 ⑧ · §9.2 ×2；主 design 1：§2.4 U5 操作列）| ⚠️ **口径撤回**：上表原记「残留 0 / 未决项 0」为**关键字口径**产物 ⇒ 改判「**关键字残留 0 · 语义散点 14 处**」并**逐处订正**（批 plan v0.16 / 主 design v1.55 / 批 design v1.19）· 审计脚本已补「活口径谓词」（F64）|
| 原型物料清理 | `apps/web/src/pages/__proto/` **已删**（2 文件 / 720 行）；`main.tsx` 原型路由行早已于 `3ab0299` 清除 ⇒ 全仓 `__proto` 引用 = 0 | ✅ 已执行 |
| 抽屉时代旧口径散点 | 命中集中在 §2.1c/§2.1d 过程记录 + 早期 F 行；§2.1 **Q6/Q7 决策行**仍含「⋯ 菜单 / 抽屉」字面 | **登记**：该节已被 §2.1c 顶部指针（「现行口径以 §4.2/§4.3/§4.6 为准」）+ §2.1d 覆盖 ⇒ 留作决策沿革，不追改 |
| 未消费 i18n 键（新键死键） | **实测 12 键**：`version.deleteDisabled` · `version.yankDisabled` · `admin.noPermission` · `status.current` · `section.labels` · `market.versionPublished` · `market.versionYanked` · `version.col.version` · `version.col.status` · `version.col.created` · `version.col.files` · `version.empty` | **如实登记**（不静默删键 —— 前 2 键归「禁用+说明」形态、后 5 键归**已取消的抽屉**版本段、`section.labels` 与 `market.labelsTitle` 同义二选一）· 归 **M4b-6/M4b-7** 触碰时收敛 |
| 死导出（12 个新导出全扫） | **0 死导出**（`AssetStat`6 · `canYank`4 · `canPrivileged`3 · `deletableStatuses`2 · `isVersionDeletable`2 · `useViewer`8 · `StarButton`7 · `starAsset`2 · `unstarAsset`2 · `apiPut`4 …） | — |
| 门户调用点零 diff | `CenterPage.tsx` / `FilterStrip.tsx` **未改** | ✅（**T11 收尾态** —— v1.22 T11-e 已改 `CenterPage.tsx`（视图切换/折叠搜索）⇒ 现行契约 = 门户**行为**零回归，见 §13.2）|
| 文档数字实测 | i18n 键数（§7）· 行数表（§7）· 测试用例数（537）均以脚本实测回填；批 design §6.1「65 → 79」与实测 **79** 一致 | ✅ |
| **覆盖探针**（T11-c 新增维度） | 仓库原**无覆盖率基建**（无 `coverage` 脚本 · CI 不跑 · 文档未要求）⇒ 本轮以 `bun test --coverage` 实测：全仓 **95.60/96.28**；发现 `http/assets.ts` 的 **yank 路由整段零覆盖**（683-713）⇒ **已补测**（见 §6 A5） | ✅ 建立可复跑命令 |
| 未决项 | **0**（本表 3 条为「登记留存」，均写明归属批） | ✅ |

## 6. 审计发现（诚实清单）

| # | 类 | 内容 | 处置 |
|---|----|------|------|
| A1 | 🟡 数字订正 | F50 原登记「5 个死键」实为 **12 键**（审计扫描实测） | ✅ 订正（批 design §11.9 F50 + 本文件 §5） |
| A2 | ⚪ 文档沿革 | §2.1 Q6/Q7 决策行含已被推翻的「⋯ 菜单 / 抽屉」字面 | 留存 + 指针（不追改历史决策行） |
| **A4** | 🟡 **审计口径** | **作废件残留审计只查关键字、不判语义**（首轮据此判「0 残留」）⇒ T8 作废后 **14 处活口径散点**被漏扫（首轮 8 + 换靶精修谓词再挖 6） | ✅ **已订正 + 已修脚本**（`m4b4-audit-scan.sh` 加「活口径谓词」：命中行不含 作废/取消/~~/修订记录 标记 ⇒ 报警；F64）|
| A3 | ⚪ 环境 | 原型环境 **toast 不渲染**（sonner 容器在、`[data-sonner-toast]` = 0） | 登记（**不影响形态评审**；真页 dogfood 的 toast 文案经 DOM 断言佐证） |
| **A5** | 🟡 **审计维度 + 覆盖** | ① T11 收尾的「整体审计」**缺「覆盖探针」维度**（skill 明列该换靶角度，未用）⇒ 直到用户追问才实测 ② 实测即暴露 `POST /:slug/versions/:version/yank` **路由层整段零覆盖**（`http/assets.ts:683-713`；服务层 `assets/yank.ts` 本就 100%）——而 **M4b-4 T12 把它接成「撤回分发」唯一 UI 入口** ③ **web 包零测试基建** ⇒ 本批 14 个前端新/改文件单测覆盖 = **0**（仅 dogfood 行为断言代跑） | ✅ ①② **本轮已补**：新增 `apps/server/src/http/yank-route.test.ts`（**14 例**：鉴权 4 档 / reason 边界 / 状态门 / 坐标 404 / 形态守卫 / token scope 正反）+ dogfood **G12b** 真点击端到端 ⇒ `http/assets.ts` lines **90.97 → 95.96**、测试 **537 → 551**、dogfood **53 → 58**（其后验收期 UI 轮再 **→ 60**：G14b 两条 + G18 改口径）；③ **登记**归 **M4b-7 / 另立项**（vitest+RTL 独立一笔，不并入本批）· 见批 design **F65/F66** |

## 7. 权威行数表（`readFileSync` 计数 = `wc -l` 口径 · **本表 = 本批文件行数的唯一权威源**）

| 文件 | 行数 |
|------|-----:|
| `apps/web/src/hooks/useViewer.ts` | 47 |
| `apps/web/src/lib/asset-permissions.ts` | 71 |
| `apps/web/src/components/console/asset-stats.tsx` | 28 |
| `apps/web/src/components/console/LabelCard.tsx` | 191 |
| `apps/web/src/components/console/AssetAdminCard.tsx` | 213 |
| `apps/web/src/components/market/StarButton.tsx` | 88 |
| `apps/web/src/api/stars.ts` | 38 |
| `apps/web/src/pages/AssetDetail.tsx`（改） | 464 |
| `apps/web/src/pages/Assets.tsx`（改） | 273 |
| `apps/web/src/pages/Dashboard.tsx`（改 · 原 73） | 270 |
| `apps/web/src/components/market/detail/VersionCompare.tsx`（改） | 239 |
| `apps/web/src/components/market/AssetCard.tsx`（改） | 80 |
| `docs/smoke/scripts/m4b4-seed-assets.ts` | 313 |
| `docs/smoke/scripts/m4b4-personal-b-dogfood.ts` | 709 |

**i18n 实测（脚本）**：**12 组 · zh = en = 323 键**（双向差集 0）；`assets` 组 **79** · `errors` 组 **35** · `market` 组 59；**en 值级中文泄漏 = 0 处**（T11 新增值级守卫 —— 键集相等 ≠ 值已翻译，F55 教训）。

## 8. 出口五件状态

| # | 件 | 状态 |
|---|----|------|
| ① | 批 design 8 维 ≥9 | ✅ **定稿 9.69**（v1.10）+ **执行期 converge 重评见 §9** |
| ② | **T1–T16**（**T8 已作废**）Task 全绿 | ✅ 15/15（逐 Task 均分 **9.41–9.71**；本轮 T12 9.43 / T16 9.41 / T6 9.43） |
| ③ | 五门禁逐项 exit 0 | ✅ §1（8 步全绿） |
| ④ | dogfood / 观感（合规核对，审美归 M4b-7） | ✅ §3（G1–G19 + **G12b** + **G14b** = **60 PASS / 0 FAIL / NO JS ERRORS**）+ ✅ **用户实机观感**（2026-09-20「观感 ok」—— 排序控件 / 可点列头 / 「更新」列）；**现行 = G1–G22 = **89** PASS / 0 FAIL**（T11-j 门户笔：−G22-6 · +G20-10 · G22-3 四档→两档）（T11-f · §14.2；T11-e 时点 **G1–G21 = 77** · §13.2）|
| ⑤ | 整体审计 | ✅ §5 —— **关键字残留 0**；**语义散点 14 处已订正**（F64 · 口径已撤回，见 §5 / §6 A4 · **换靶第二轮** 补抓 6 处）；4 条登记留存均写明归属 |

## 9. 文档-代码对齐重评（converge）

| 面 | 回查项 | 结果 |
|----|--------|------|
| design ↔ 代码 | §4.6 权限矩阵 5 档 | ✅ 逐档被 G11 命中（访客/非 owner 不渲染 · owner 无 yank · 管理档 yank · 超管特权标签） |
| design ↔ 代码 | §5.1 ⑧ star 契约（幂等 / `starredByMe` / 三读面） | ✅ G15–G17 全绿；`star_count` 冗余列与关系表一致性由种子重算保证 |
| design ↔ 代码 | §4.2 九列集合 | ✅ G6/G10 命中（列头逐字比对） |
| design ↔ 代码 | §4.1 工作台请求裁剪 | ✅ G2/G3（1 请求 / 3 请求，脚本按网络事件计数） |
| design ↔ 代码 | §6 i18n 逐键表 | ✅ assets 79（表 62 → 实现期 +14 → +3(F46) 已同步）· en 值级泄漏 0 |
| plan ↔ 代码 | T1–T16 断言 | ✅ 除 T11 的 3 项未证（§10）外全数落地 |
| 规范 ↔ 代码 | `05 §6.4` 授权集 / `08 §7` ARCHIVED 语义 | ✅ T10 已改并复查（与 `canManageAsset` 同集） |
| 主 design ↔ 实现 | §2.3 登记表 · §11 键数 · D2/D3 线框订正 | ⬜ **本轮回填**（见 commit 说明；收尾回填项 §9.7 ①-⑥ 逐条执行） |

**converge 8 维重评（执行期口径）**：批 design 8 维 **9.69**（v1.10 口径不变；本轮新增 F48–F63 已全部处置，无未决项）· 批 plan 8 维 **9.66**（v0.14 口径；口径变更后已做全文散点扫，见 §5）。

### 9.5 T11-f / T11-g 收口轮 converge（2026-09-20 · **换靶角度 = 「活口径 vs 历史留痕」**）

**方法**：改一处数字后，逐文档 grep 旧值反查 **「当值处」**（§ / Status / 表格 / 任务明细）；**修订记录行一律保留**
（历史留痕，不算陈旧）。批 design 自身当值处已干净（§4.7.3 与 §9.3 均为「实测 14 条」）。

| # | 位置 | 陈旧值 | 现真值 |
|---|------|--------|--------|
| 1 | 批 plan §3 f4（标题 + 步骤 1 + 断言①） | `G22 ×13` · 合计 **90** | `G22 ×14` · 合计 **91** |
| 2 | 批 plan §7.5 T11-f 行 | `G22 ×13` · dogfood **90/0** | `G22 ×14` · **91/0** |
| 3 | 批 plan Status 行 | 「T11-f 已立项 —— 实现中」·「提交待用户口令」 | 「T11-f 全绿落地 + T11-g 全绿」·「已提交推送」 |
| 4 | `docs/00` §5 M4b-4 行 + 头部 | **90 PASS** · **3 图** · v1.28 · 头部 v1.76（修订表已有 v1.77） | **91** · **5 图** · v1.29 + T11-g · 头部补至 v1.78 |
| 5 | 证据 §10 出口件 ④ 行 | 现行 **90 PASS** ＋⬜ 用户实机观感 | **91 PASS** ＋✅ 观感（用户 2026-09-20「观感 ok」） |

**出口五件终态（本批 M4b-4）**：① 批 design 8 维 **9.69 ≥9**（自身当值处无陈旧，复评维持）② **T1–T16 全绿**
（T8 作废）+ **T11-f / T11-g 全绿** ③ 五门禁 exit 0（`CI=true bun run test --force` **562 pass / 0 fail**；
⚠️ 真跑 vs 缓存回放口径见 **F92**）④ dogfood **91/0** + **观感已由用户确认** ⑤ 整体审计 = 本轮（**F93**：5 处活口径
已订正；关键字残留 0；语义散点历史轮次已清）。

**CI**：三笔推送 `72e48db` → `434043b` → `ced0d6a`；run **`35499952284`** = **success**（12 步全 success）。

## 10. 未证项 / 登记项（诚实清单）

| # | 项 | 归属 / 说明 |
|---|----|------------|
| 1 | 「提交审核」入口（提审端点已在，上传无 UI ⇒ 链路不闭合） | **M4b-8** 发布批（R2 已翻转入册） |
| 2 | **「发布新版本」按钮 = 禁用占位** · 「审核」动作 = 禁用占位 | **M4b-8** / **M4b-5**（批 design §4.6 占位登记） |
| 3 | **「特权标签」按钮 = 禁用占位**（候选源 `GET /api/labels` 恒不含 PRIVILEGED ⇒ 无数据可挂） | **M4b-6** 标签定义批（F53） |
| 4 | **12 个未消费 i18n 键** | §5 登记（M4b-6 / M4b-7 触碰时收敛） |
| 5 | 版本删除守卫的**上传者例外面** UI 不可达（`VersionListItem` 无 `createdBy`） | 提示性守卫 + 服务端 400 兜底（批 design §2.1c 条③ P3） |
| 6 | **状态文案** `活跃` vs 对标 skillhub 的 `正常`；版本 8 态措辞 3 处差异 | 待定（术语对标，登记） |
| 7 | 原型环境 toast 不渲染 | 登记（§6 A3） |
| 8 | 视觉/审美定稿（页头与顶栏 h1 同字 · 全站去红 · `TopBar.section` 死数据 · 断点口径订正） | **M4b-7**（本批零改动，登记） |
| 9 | **web 包零测试基建** ⇒ 本批 14 个前端新/改文件单测覆盖 = **0**（行为面仅 dogfood 代跑） | **M4b-7 / 另立项**（vitest + RTL 属独立工程）；见 §6 A5 · 批 design F66 |

## 11. 人工验收（**待用户实机**）

⬜ **待回填**：用户实机结论 + 日期。本批**只做合规核对**（有无错位 / 溢出 / 串色 / 异常），**审美面不在本批范围**（归 M4b-7）。
可交给用户看的落点：`http://localhost:5173/assets/m4b4-seed-skill`（owner = `m4b2_user`；同资产在 `m4b2_mgr` / `m4b2_super` 下管理区按钮集不同）· `http://localhost:5173/dashboard`（`role < 10` 单卡 / `role ≥ 10` 三卡）。

## 12. 原型评审（DEV-only · **物料不进仓**）

| 项 | 值 |
|----|----|
| 评审方式 | 可点原型（真仓真件 + **假数据** · 零 API 请求）· 用户逐条指令微调 |
| 轮次 | **1 轮收口**（2026-09-18）· 用户结论：「**ui 部分差不多了**」 |
| 逐条决定 | **R1–R23** —— 明细与沿革见批 design **§2.1d**（含作废留痕：`⋯` 菜单 / 四段抽屉 / `标签挂载` 段名等） |
| 形态覆盖 | 列表 9 列（**操作列 = `Eye` 真链接直跳详情页**；~~抽屉~~ **v1.9 取消**）· 详情页（头卡 [下载][收藏] + 右栏 元信息/标签+-/管理卡）· 管理区 **5 档权限** |
| 物料清理 | ✅ **已执行**（`apps/web/src/pages/__proto/` 已删；`main.tsx` DEV 路由行已于 `3ab0299` 清除；全仓 `__proto` 引用 = 0） |


**原「留待明确口令的项」处置（2026-09-18 用户拍板）**

| # | 项 | 处置 |
|---|----|------|
| 1 | 管理区**动作层**显隐取「不渲染」还是「禁用 + `title` 说明」 | ✅ **取「不渲染」**（用户 2026-09-18 拍板）—— 跨档无权限与状态门挡住**一律不渲染**；整卡无可见动作 ⇒ 整卡不渲染 |
| 2 | `labels` 带 `type` 后 **PRIVILEGED 的 ×** 是否升级为精确禁用 | ✅ **升级为「禁用 + `title` 说明」**（用户 2026-09-18 拍板）：文案 `label.privileged`；服务端 `label.access_denied` 兜底**不变**（双保险）—— G11 实测佐证（owner `locked=1` / 超管 `locked=0`） |
| 3 | 状态文案 `活跃` vs `正常` · 版本 8 态 3 处措辞 | ⬜ 待定（§10 第 6 项） |
| 4 | ~~star 能力依赖~~ | ✅ 依赖消解（v1.8 并入本批；T15/T16 已交付，G15–G17 绿） |


## 13. 验收期第二笔：门户视图切换 + 折叠搜索（**T11-e** · 2026-09-18 · v1.22）

> 用户逐条拍板：① 门户三页加「卡片 ⇄ 列表」切换 ② 参考 ClawHub「切换钮左侧的搜索」做折叠搜索 ③ **删页头搜索框**（「title 上的搜索就重复设计了」）。
> 本节为**追加证据**（§1–§12 记录的是 T11 收尾态；本轮数字以本节为准）。

### 13.1 门禁（本轮实跑 · 全绿）

| 步骤 | 命令 | 结果 |
|------|------|------|
| 类型 | `bun run typecheck` | **exit 0** |
| 静态 | `bun run lint` | **exit 0** —— 1 条**预存在** warning（`AppShell.tsx:55 noDocumentCookie`）|
| 格式 | `bun run format:check` | **exit 0** —— `Checked 270 files`（删 `item.tsx` 后 271 → 270）|
| 文档体检 | `bun docs/smoke/scripts/doc-audit.ts` | **exit 0** —— **64 PASS / 0 FAIL**（= 基线）|
| 构建 | `bun run build` | **exit 0** —— 4/4 successful |
| 测试 | `CI=true bun run test` | **exit 0** —— server **550 pass / 1 skip / 0 fail**（Ran **551** tests across 51 files）· 1577 expect() calls |

### 13.2 行为断言（本轮新增 16 条 · 实测）

| 脚本 | 结果 |
|------|------|
| `m4b4-personal-b-dogfood.ts` | **77 PASS / 0 FAIL / 0 CDP 超时 / NO JS ERRORS**（原 60 + **G20×10** + **G21×6** + G20-4b）|
| `m4a-dogfood.ts`（门户零回归） | **37 PASS / 0 FAIL**（原 36 → 37：搜索入口断言由「页头输入框」改「折叠面板触发钮 + 点开出现输入框」—— **F69 跨批口径变更**）|

### 13.3 观感/形态实测真值（浏览器 CDP）

| 项 | 实测值 |
|----|--------|
| 视图切换钮 | 官方 `ToggleGroupItem` 单钮 **42×32**（icon 16px）· `aria-label` = 网格视图/列表视图 · `data-state` on/off（**无 `aria-pressed`**，官方以 `data-state` 表达）|
| 折叠搜索触发钮 | **32×32**（官方 `Button` ghost `icon-sm`）· 位于视图切换钮**左侧**（实测 x 586 vs 672 @748 视口）· `aria-expanded` 由官方 `CollapsibleTrigger` 给出 |
| 折叠面板 | 工具条**下方**、宽度与工具条**等宽**（实测 693 / 693 · 面板高 36）· 两枚 `InputGroupAddon` + 关闭钮 **24px** · 展开**自动聚焦**（`document.activeElement` = 输入框）|
| 列表行（官方 `Table`） | 行高 **55**（单行描述）· 长描述 **93**（描述块 60 = 3 行）· 表头高 **40**（官方 `h-10`）· 单元格 `padding: 16px/8px`（`py-4` 覆写 + 官方 `px-2`）|
| 列宽 @1440 | 名称 **294** / 描述 **339** / 作者 **226** / 下载 **135** / 收藏 **135**（百分比列宽 26/30/20/12/12）|
| 整行热区 | 首列 `<Link>` + `after:absolute after:inset-0` ⇒ 点描述列 `elementFromPoint` 命中的是该链接（实测）· 行内 **0 button** |
| 去卡化 | 面板 `border: 0` · 背景透明 · 页面底 `rgb(248,250,255)` ⇒ 表格落在页底上，仅靠官方行分隔线与表头底纹划结构 |
| 页头搜索 | **已移除** —— hero 卡内 `input` 数 **0** · 折叠态全页可见 input **0**、展开态 **1** |

### 13.4 i18n 与造数（实测）

- **i18n 329 键 / 12 组**（T11-e **+6**：`viewGrid` / `viewList` / `colName` / `colDesc` / `colDownload` / `searchClose`）· 双语双向差集 **0** · en 值级中文泄漏 **0** · **未消费键 12 = 基线**（新键 6 个**全部有消费者**）
- 造数 **+21 条 ACTIVE `mcp` 分页占位**（`m4b4-seed-page-01`…`-21` · owner = 管理档）⇒ `/mcps` **2 → 23**（> `PAGE_SIZE` 20）出第二页；`/skills` 保持 **6**（不动既有基线）· 运行顺序恒为 **seed → dogfood**（dogfood 会真撤回版本）

### 13.5 本轮发现的缺陷（**F68–F73** · 明细见批 design §11.9）

| # | 级 | 摘要 | 处置 |
|---|:--:|------|------|
| **F68** | 🟡 | 官方 `item.tsx` **落仓后弃用**（观感判「逐行成卡 ⇒ 碎/松」）⇒ 改 `Table` | ✅ **删除**（零消费点 grep 实证）；**官方注册表无 `list` 件**（64 件实测核对）留痕防复现 |
| **F69** | 🟡 | `m4a-dogfood` 搜索入口断言口径变更（**跨批交付物**） | ✅ 改写为折叠面板两步断言 · 36 → **37** |
| **F70** | 🟡 | 探针**四处自伤**：模板字符串内反引号截断 · 两个 `h1` 致锚点错 · 徽章文案带空格致正则失配 · 漏带 `pagination` 字段（`undefined === false` 恒假） | ✅ 全部修 + 写进脚本注释 |
| **F71** | 🟡 | **登录限流** 15min/20 次（`auth/better-auth.ts:64`）⇒ 连跑两遍即撞（症状 `me=401:anon`） | ✅ 写进脚本头（处置 = 重启 api）；双证：配置存在 + 重启后 **77/0** |
| **F72** | 🟡 | i18n 键数漂移（主 design §11 记 323） | ✅ 同补 **329 键** 行（主 design） |
| **F73** | ⚪ | `m4b4-measure.ts` 文件清单缺新件 | ✅ 补 `AssetList.tsx` |

### 13.6 权威行数（本轮新增/改动 · `wc -l` 口径）

| 文件 | 行数 |
|------|-----:|
| `apps/web/src/components/market/AssetList.tsx`（**新件**） | **138**（**F76 订正**：133 → 135 → **138** —— 两次注释增行；本表数值**一律以 `m4b4-measure.ts` 实跑为准**，提交前重跑回填）|
| `apps/web/src/components/market/CenterPage.tsx`（改造） | **361** |
| `apps/web/src/i18n/zh.ts` / `en.ts` | **385 / 380** |
| `docs/smoke/scripts/m4b4-personal-b-dogfood.ts` | **1119** |
| `docs/smoke/scripts/m4b4-seed-assets.ts` | **380** |
| `docs/smoke/scripts/m4a-dogfood.ts` | **523** |

### 13.7 未决 / 待用户拍板

- **观感三项**（本轮已给建议，待拍板）：① 行 hover 口径（列表行 = 官方 `accent/50` vs 网格卡 = `muted/50`）② 表头是否加浅底纹（官方 `TableHeader` 无底色）③ 行高是否换档（55 / 48 / 63）
- **F6 相关联**：`item.tsx` 已删（本轮）；`m4a-dogfood` 跨批改动已留痕
- **提交**：本轮代码 + 文档 + 证据 + 2 张新图待**用户口令**后提交（拆分见批 plan §7 落地记录）

## 14. 验收期第三笔：资产排序（**T11-f** · 2026-09-20 · **v1.27**）

> 用户 2026-09-20：「资产排序的设计——收藏/下载/作者/名称 支持排序」+「列表视图表头可点排序，我的倾向是做」。
> 本笔**唯一含服务端契约变更**的验收期笔（`GET /api/assets` / `GET /api/me/assets` 加白名单 `sort` + `dir`）。
> 本节为**追加证据**（§13 记录的是 T11-e 态；本轮数字以本节为准）。

### 14.1 门禁（本轮实跑 · 全绿）

| 步骤 | 命令 | 结果 |
|------|------|------|
| 类型 | `bun run typecheck` | **exit 0**（4/4 tasks）|
| 静态 | `bun run lint` | **exit 0** —— 1 条**预存在** warning（`AppShell.tsx:55`）+ 服务端 139 warning / 5 info（**均为基线既有**，本笔 0 新增）|
| 格式 | `bun run format:check` | **exit 0** —— `Checked 270 files` |
| 文档体检 | `bun docs/smoke/scripts/doc-audit.ts` | **exit 0** —— **64 PASS / 0 FAIL**（= 基线）|
| 构建 | `bun run build` | **exit 0** —— 4/4 successful |
| 测试 | `CI=true bun run test` | **exit 0** —— server **562 pass / 1 skip / 0 fail**（Ran **563** tests across 51 files）· **1620 expect() calls** · protocol **27 / 0 fail**（82 expect）· ⚠️ **口径（F92）**：机器链路上该行**常为 turbo 缓存回放**（`Cached: 4/4` · real 0.107s）；本笔已用 `CI=true bun run test --force` 补**真跑** = real **32.6s** · 562 pass / 0 fail（同上）|
| 活口径谓词 | `bash docs/smoke/scripts/m4b4-live-quarter-scan.sh` | **合计 = 0**（0 方可提交）|

### 14.2 行为断言（本轮新增 13 条 · 实测）

| 脚本 | 结果 |
|------|------|
| `m4b4-personal-b-dogfood.ts` | **89 PASS / 0 FAIL / 0 CDP 超时 / NO JS ERRORS**（**T11-j 后** —— 原 91：−G22-6 · +G20-10 · G22-3 四档→两档）**（T11-f 时 = 91 = 原 77 + G22×14**；T11-g 后：**SMOKE_ONLY=G22 ⇒ 45.6s** 命中 14 条 + 命中检查 + G19 · 全跑 **2m59s** · 真登录 **9 → 4**）|
| `m4a-dogfood.ts`（门户零回归） | **38 PASS / 0 FAIL**（原 37 → 38：原 1 条「中心排序栏」静态文本断言拆为 **2 条**（旧文本退役 + 控件形态 —— **`j6` 起 = 纯图标无框钮**（`aria-label=排序` · **32×32** · `border 0px` · 无文案））—— **F85 跨口径变更**，**v1.27 随形态再改 1 次**）|
| 服务端用例 | **+12 例**：`assets/service.test.ts` **+8**（五档真值 / `dir` 反向 / 非法回落 / tiebreaker / 零 join 形状）· `http/assets.test.ts` **+3**（白名单放行 / 非法回落逐项一致 / 计数单调）· `http/me.test.ts` **+1**（不传 ⇒ 现状序 + 只改序不改集合）|

**G22 明细（13 条 · 全绿）**：G22-1 默认档干净 URL + 纯图标无框钮（32×32 · border 0 · 无文案）+ 菜单三档勾「最新」 · G22-2 默认序 = 接口默认序 · G22-3 ×**2**（下载量/星标数两档 = URL + 列表序与接口**逐项一致** · T11-j j3 收敛）· G22-4 改排序**回第 1 页**（`?page=2` → `?sort=stars`）· G22-5 非法值静默回落 + chip 归一 · ~~G22-6 列头同列两态~~（随 T11-j j3 **整条删除** —— 同列反向由 G22-6c 承载）· G22-6b 点异列**首点 `desc`**（F84 口径）· G22-7 **三列可点 / 描述 · 名称 · 作者不可点** · G22-8 双视图同序 · G22-9 **匿名可用**（本段全程 `me=401`）· **G22-6c** 点「更新」列 ⟺「最新」档（URL 无 `sort=updated` · **菜单仍勾「最新」**（`j6` 起）· 同列 `desc→asc→desc` 序与接口一致）。

### 14.3 观感/形态实测真值（浏览器 CDP）

| 项 | 实测值 |
|----|--------|
| 排序控件（**v1.28 `j6` 起 = 纯图标无框钮 + 官方 `DropdownMenu`**；v1.27 曾为官方 `Select`） | **`Button variant="ghost" size="icon-sm"` + lucide `ArrowUpDown`** · **实测 32×32 · `border 0px` · 钮内无文案** · `aria-label=排序` · 点开官方 `DropdownMenu`（**`RadioGroup` 三档** · 当前档 `aria-checked=true`）· **当前档靠 tooltip（`排序 · 最新`）+ 菜单勾选**（无框纯图标 ⇒ 不再常驻显示档位 —— 选型矩阵**已登记**代价）· 计数行内右侧控件群**首项**（容器承担 `ml-auto`）· 常驻宽 **160 → 32px**（省 128px）· 换档点击仍 **2 次**（用户 2026-09-21 线框三方向取「方向 1 纯图标」）|
| 列头按钮 | 官方 `Button` ghost `size=sm` + 图标（未排 `ArrowUpDown` / 降 `ArrowDown` / 升 `ArrowUp`）· `th[aria-sort]` = `none ｜ ascending ｜ descending` · **描述列无按钮** |
| 两态语义 | **首点该列 ⇒ `desc`**（含异列）· **再点同列 ⇒ `asc`** ⇒ URL `?sort=downloads&dir=desc → …&dir=asc` |
| 方向真值（排序入口驱动 · URL 无 `dir` —— `j6` 换件后**语义不变**） | `?sort=downloads` ⇒ 下载列 `aria-sort=descending`；`?sort=stars` ⇒ 星标列 `descending`（**三档固有方向均为 `desc`** —— T11-j j3 收敛后 `asc` 固有方向已无档位）|
| 非法值 | `?sort=bogus` ⇒ **菜单归一勾「最新」**（`j6` 起 · 原为 `Select` 显示「最新」）· 顺序 = 接口默认序 · **200**（不 400 / 不空白）|
| 双语宽度（**F87**） | 定宽 **160px**：zh（最长「星标数」42px）与 EN（最长 `Most downloads` **106px**）均 `clipped:false`；**104px 版在 EN 下截断**（`scrollWidth 106 > clientWidth 54`）|
| 展开态 | 点触发钮 ⇒ `[role=option]` 面板 **五档齐**（最新/下载量/星标数/名称/作者）· 选中项高亮 |
| 双视图 | 列表视图改排序 → 切回网格 ⇒ URL + chip 选中 + 顺序**均保持**（同一状态）|

### 14.4 i18n 与造数（实测）

- **i18n 335 键 / 12 组**（T11-f：`market` **+6** + `colUpdated`（**「更新」列**） —— `sortLabel`（**v1.27 随 `Select` 新增**）+ `sortNewest`/`sortDownloads`/`sortStars`/`sortName`/`sortAuthor`，**退役 `sortRecent`**）· 双语双向差集 **0** · en 值级中文泄漏 **0** · **未消费键 12 = 基线**（退役键原**有消费者** ⇒ 清单不变；6 个新键全部有消费点）
- 造数沿用 §13 的 **21 条 ACTIVE `mcp` 分页占位**（排序样本天然可用：下载/星标值递变）· 运行顺序恒为 **seed → dogfood**

### 14.5 本轮发现的缺陷（**F82–F91** · 明细见批 design §4.7.6 / §11.9）

| # | 级 | 摘要 | 处置 |
|---|:--:|------|------|
| **F82** | 🟡 | 契约行（主 design §7.1/§7.2 R6）**只登记 `sort`、漏 `dir`** —— 若不落服务端，列头升序只作用于**当前页** | ✅ 主 design **v1.57** 补 `&dir=` + §4.7.5 补字段 |
| **F83** | 🔴 | §4.7.5 写 `sort: z.enum(...).default('newest')` —— **非法值会 400**，与 §4.7.1 #4「静默回落」**自相矛盾** | ✅ 改 `.catch('newest')` / `dir: ….optional().catch(undefined)`（缺省与非法**同一条回落路径**）|
| **F84** | 🟡 | §4.7.5「点异列 = 该列**固有方向**」与 §4.7.2/§4.7.3「首点 ⇒ `desc`」**同文档互相矛盾** | ✅ 实现取**首点 `desc`**（官方配方同口径）⇒ 订正 §4.7.5 + G22-6b 钉死 |
| **F85** | 🟡 | `m4a-dogfood`「中心排序栏」断言依赖**被取代的静态文本**（跨批交付物改动）；**连带**该脚本产出的 M4a 证据图（`1-home` / `2-skills` / `2b` / `2c` / `7-locale-en` 5 张）随形态变更**重生成**（工作区显示 M）| ✅ 断言改写为 2 条（旧文本退役反证 + 五档 chips 形态）⇒ 37 → **38**；证据图**按当前态重生成**（二进制差异不可人工核读 ⇒ 图内观感归用户人眼）|
| **F88** | 🟡 | §14.7 权威行数表**先写估值**（CenterPage 451 / zh 391 / en 386 / dogfood 1303 / m4a 553）| **F76 同类第 4 次复发** —— 「行数类数字提交前必跑 `m4b4-measure.ts`」纪律已在 v0.20+ 立档，本笔仍先估 | ✅ 立即以 `wc -l` 实测回填（438 / 390 / 385 / 1307 / 552）并逐格标注；**纪律加固**：把 `CenterPage`/`zh`/`en`/两 dogfood 脚本纳入 measure 清单（F73 已补 4 件）|
| **F87** | 🟡 | `Select` 触发器定宽 **104px** 只按**中文选项**（≤3 字）估宽，未按 **EN 最长选项**实测 ⇒ EN `Most downloads`（**106px**）被截断（`scrollWidth 106 > clientWidth 54`）| ✅ 改 **160px**（沿控制台 `#assets-status-filter` 同宽先例）· 实测两语 `clipped:false` |
| **F86** | ⚪ | 覆盖探针口径陷阱：`bun test --coverage`（不带路径）会把 **`dist/**` 陈旧编译产物**一并当测试跑 ⇒ 状态型用例**重复执行**（限流 / device code）⇒ **7 例假失败** | ✅ 反证：`--coverage src/` = **562 pass / 0 fail** + 单文件 11/11；本笔文件零涉 auth 面 ⇒ 归**测试基建口径**（与 F66 同族，建议 coverage 跑前清 `dist`）|

### 14.6 覆盖探针（判据 = **不降**）

| 范围 | 本轮 | 基线（T11-e 态） | 判定 |
|------|:----:|:----:|:----:|
| 全仓 `--coverage src/` | **95.60 funcs / 96.29 lines** | 95.60 / 96.22 | ✅ 持平 / **+0.07** |
| `src/http/assets.ts` | **96.36 / 95.98** | 96.36 / 95.96 | ✅ +0.02 |
| `src/assets/service.ts`（本笔新逻辑） | **100.00 / 97.49** | — | ✅（未覆盖 201-205 = 既有分支）|
| `src/http/me.ts` | **100.00 / 100.00** | — | ✅ |

### 14.7 权威行数（本轮新增/改动 · `wc -l` 口径）

| 文件 | 行数 |
|------|-----:|
| `apps/server/src/assets/service.ts` | **317** |
| `apps/server/src/assets/service.test.ts` | **355** |
| `apps/server/src/http/assets.ts` | **844** |
| `apps/server/src/http/assets.test.ts` | **1216** |
| `apps/server/src/http/me.ts` | **82** |
| `apps/server/src/http/me.test.ts` | **248** |
| `apps/web/src/hooks/useMarketQuery.ts` | **171** |
| `apps/web/src/api/assets.ts` | **62** |
| `apps/web/src/components/market/AssetList.tsx` | **286**（T11-f 六列 + `COLUMN_SORT`；**实测回填**）|
| `apps/web/src/components/market/CenterPage.tsx` | **442**（`Select` + `handleHeaderSort`；**实测**）|
| `apps/web/src/i18n/zh.ts` / `en.ts` | **391 / 386**（+`sortLabel`/`sortNewest`…/`colUpdated`；**实测**）|
| `docs/smoke/scripts/m4b4-personal-b-dogfood.ts` | **1518**（T11-g 分段守卫 + 会话复用 + 分段警示；**实测** — 1507 → 1511 → **1518** 三次订正，F88 同类自查：**行数一律落笔前重测**）|
| `docs/smoke/scripts/m4a-dogfood.ts` | **856**（T11-i ×11 断言后实测：552 → 663 → **856**）|
| `apps/web/src/components/market/Hero.tsx`（**跨批** · M4a 交付物） | **166**（两态 + v0.25 聚焦判据；**实测**）|

新增证据图 **5 张**（v1.27 命名对齐内容；**`j6` 起首张改名** `m4b4-24-sort-icon.png`，见 §14.16）：`docs/smoke/m4b4-24-sort-icon.png`（默认纯图标钮收起态）· `m4b4-25-sort-bogus-fallback.png` · `m4b4-26-sort-header-desc.png` · `m4b4-27-sort-grid-preserved.png` · `m4b4-28-sort-updated-column.png`（「更新」列 ⟺ 最新档）。
> ⚠️ 脚本每次运行都会重写 §12/§13 时点的旧图 ⇒ 本笔收尾**已把已跟踪旧图恢复为各节时点态**（`git checkout`），故它们**不入本笔 diff**；本笔只新增上述 4 张。
> ⚠️（**v1.32 追加**）T11-h v0.25 收尾同法处理：`2-skills` / `2b-skills-search` / `2c-skills-filter` / `7-locale-en` 四张**已恢复时点态**；**仅 `1-home.png` 保留新态** —— 首页搜索形态确实变更（右钮两态 + 聚焦判据）⇒ 该图新态即当前真值。

### 14.9 验证效率实测（T11-g · 2026-09-20）

| 指标 | 改进前 | 改进后 | 口径 |
|------|:------:|:------:|------|
| 分段跑（`SMOKE_ONLY=G22`） | 3.5~5 分（只能全跑） | **45.6s** | `time bun … m4b4-personal-b-dogfood.ts` 实测 |
| 全跑（不带变量） | **3m32s** | **2m59s** | 同一命令实测（省 ≈33s = 5 次登录） |
| 一轮真登录次数 | **9** | **4** | `前置：以 X 登录` 行计数（复用 6 次 · `extra` 标注路径） |
| 组名打错 | 无此能力 | **3.1s FAIL** + 列出 22 个可选段 | `SMOKE_ONLY=G99` 实测 |
| 全跑断言总数 | 91 | **91**（零行为变化） | 同口径对照 |

- **归因（严谨版 · 2026-09-20 重做）**：会话库时间戳归因**只能给量级** —— 该库有重复行（当日剔重 **982** 条）且
  时间戳**非单调**（按 id 配对会算出负值）。按「按时间戳排序 + 全量去重 + 单一口径 + >15 分钟空隙单列 idle」重算：
  工作时段 **368 分** = **用户侧 149.5** · **工具执行 129.3**（其中 dogfood 类 **90.2** ≈ 70%）· **我的生成 89.0**，
  另有 **idle 66.9**（人离开的长空隙）。
- ⚠️ **口径自曝（同一批统计内部就不自洽）**：脚本调用计数 **77** 次 × 单轮 179s ≈ **230 分**，**大于**工具总时长
  129 分 ⇒ 计数与耗时**互不吻合**，两者都受会话库质量限制 ⇒ **本组数字不得作结论，只保留「dogfood 是大头」这一方向**。
- **可信硬证据（直接 `time` 实测，不受上述口径影响）**：单轮全跑 **179s**（改前 **212s**）· 分段 **45.6s** ·
  `seed` **0.34s** · 真登录 **4** / 复用 **6** · 断言 **91/0** · 组名打错 3.1s FAIL。
- **已撤口径**：早前报告的「工作时段 441 分 = 输入/审批 201 · 工具 156 · 出字 84 · dogfood ~110 分」——
  同一批数据两版口径互相矛盾（441 vs 368）⇒ **撤回**，不参与任何评分与结论。
- 已知边界：**会话复用的失败回落分支未实测**（只跑过命中路径 —— 见批 design §11.9 T11-g 行 A1 扣分）；
  `docs/` 脚本不在 turbo lint 图内（**F91**）。

### 14.10 T11-h 首页搜索形态对齐（2026-09-20 实跑）

| 项 | ① 空态·未聚焦 | ② 聚焦·空输入（**v0.25**） | ③ 有输入（`rag`） |
|----|------|------|----------------|
| `data-variant` | `ghost` | `default` | `default` |
| `aria-disabled` | `true`（点击/回车无反应） | **`true`（点亮但不可提交）** | 移除 |
| 按钮底色 | `rgba(0, 0, 0, 0)`（透明） | **`oklch(0.488 0.243 264.376)`** = `--primary` 实底 | 同 ② |
| 图标色 | `oklch(0.488 0.243 264.376)`（主色描边） | `oklch(0.97 0.014 254.604)`（主色前景 = 白） | 同 ② |
| 圆角 / 尺寸 | `3.35544e+07px`（全胶囊）/ 32×32 · 容器高 **44** | 同左 | 同左 |
| 触发 / 结果 | — | **真指针点入 input** ⇒ 点亮（`URL` 不变） | 点击 ⇒ `/skills?q=rag` |

- **判据（v0.25）**：`lit = focused || hasQuery` —— **点亮 = 聚焦 或 有输入**；**可提交只看输入** ⇒ 点亮 ⟷ 可提交**解耦**
- **断言**：`m4a-dogfood` **46 PASS / 0 FAIL**（基线 38 + **T11-h ×8**）· 实现 50s 全跑 · `NO JS ERRORS`
- ⚠️（**v1.33 追加**）该数值已被 **T11-i** 推进为 **57 PASS / 0 FAIL**（+11 条）—— 见 **§14.11**
- **证据图 3 张**：`docs/smoke/m4b4-29-home-search-idle.png`（空态·未聚焦）· `m4b4-30-home-search-focus.png`（聚焦·空输入）· `m4b4-31-home-search-typed.png`（有输入）
  · **像素复核**（Pillow，右钮区）：未聚焦图近主色 **0%**（仅描边 161px）· 聚焦 / 有输入两张各 **2794 px** 精确 `(20,71,230)` = `#1447E6`
- ⚠️ **F95**：判定**聚焦类交互必须用真指针** —— 后台 tab 里 `element.focus()` 会设上 `activeElement` 却**不派发 `focus` 事件**（探针同一份输出里 `activeElement === input` 为真而 `data-variant` 仍 `ghost`）⇒ React `onFocus` 不触发 ⇒ 假红；换 **CDP 真指针**（`clickReal`）即成立。与 **F94**（过渡不推进）同属「后台 tab 副作用」家族、成因不同
- ⚠️ **F94**：读「类切换后的计算样式」必须先 `transition:none`（本笔实测：hidden tab 里过渡不推进 ⇒ 读到起点值 `oklab(0 0 0 / 0)` 而误判实底未生效）
- **范围**：只改首页 —— 门户三页折叠搜索与控制台筛选框零改动

### 14.11 T11-i 全资产搜索 + 侧栏命令面板（2026-09-20 实跑）

> ⚠️ **本节 B 部分（侧栏命令面板 · `CommandDialog` 弹窗）已于同日被 **B′ 一体形态**取代** —— 现行实现与实测见 **§14.12**；A 部分（顶栏小搜索 + `/search` 结果页 + 抽公共件）**仍为现行**（下述 i18n **347 键** 与 **B 5 枚** 的记述属当时口径，现行 = **346 键**）。

**A 顶栏小搜索 + `/search` 跨类型结果页**

| 项 | 实测 |
|----|------|
| 顶栏搜索框 | `sm` 档 **h=36** · 宽 **固定 320** · 占位符「搜索技能、MCP、Agent…」· 提交钮在框内右侧 |
| 顶栏位置（**2026-09-20 观感调整后**）| **靠右**：`box.left=1008 > header 中线 848`（`rightHalf=true`）· **在语言切换器左侧**：`箱右 1328 ≤ 切换钮左 1339`（`gapToSwitcher=11`）|
| 放大镜 `stroke` | **4**（lucide 默认 2 ⇒「加粗一倍」）· **A/B 对照**（同一裁切框 · 运行时改回 2 再拍）：圆内白墨 **141 → 334** 像素 = **2.37×** |
| 顶栏提交「m4a」 | URL **`/search?q=m4a`** · 输入**保留**（顶栏常驻）|
| 窄屏行为 | **900px** 视口 ⇒ 顶栏搜索 `display: none`；1440px ⇒ `block` |
| `/search` 页形态 | 标题「搜索结果」· 计数「共 25 个结果」· 类型 chips **全部 / 技能 / MCP / 专家** · 排序 `#search-sort` · 首屏卡片 **20** |
| 类型 chips | 切「技能」⇒ `?q=seed&type=skill` · 卡片 **20 → 3**（**反证 `all` 档 = 跨类型**）|
| 首页 Hero 提交 | 「seed」⇒ **`/search?q=seed`**（原 `/skills?q=` 口径**作废**）|

**B 侧栏命令面板**（官方 `CommandDialog`）

| 项 | 实测 |
|----|------|
| 侧栏入口 | 文案「搜索…」+ 徽标「⌘K」· `aria-haspopup="dialog"` · 位于品牌块正下方（门户组之前）|
| 点入口 | 面板 `data-state=open` · 分组「页面」· 条目 **首页 / 技能中心 / MCP 中心 / 专家中心**（**未登录 = 恰 4 条** ⇒ 角色过滤生效）|
| `Esc` | 面板关闭且**节点卸载**（`[role=dialog] === null`）|
| `⌘K` / `Ctrl+K` | 面板打开（壳层一处监听）|
| 兜底行 | 输入「seed」⇒ 末行「**在全部资产里搜「seed」**」⇒ 回车跳 **`/search?q=seed`** |

**断言 / 数据**

- `m4a-dogfood`（门户）：**57 PASS / 0 FAIL**（基线 46 + T11-i **11 条**）· 73s · `NO JS ERRORS`
- 本批 dogfood：**91 PASS / 0 FAIL**（**零回归**）· 179s
- i18n **347 键 / 12 组**（335 → **+12**：A 7 枚 + B 5 枚）· 双向差集 0 · **en 值级泄漏 0**
- 证据图 3 张：`m4b4-32-topbar-search.png`（顶栏聚焦点亮）· `m4b4-33-search-all-page.png`（跨类型结果页）· `m4b4-34-command-palette.png`（面板 + 兜底行）
- ⚠️ **旧图策略**：本笔**只保留 `1-home.png`**（主体 = 首页搜索形态，确随本笔变更）；其余 **24 张**被 dogfood 复跑重写的旧图**已恢复为各笔时点态**（顶栏虽新增搜索件，但旧图是**各笔留痕**，不随壳层变更重刷 —— 与 T11-f/T11-h 同法）
- **零后端改动 / 零迁移**（`type` 本就可选）

**本笔新发现（F98 / F99 / F100）**

- **F98**：**后台 tab 里 SPA 路由切换的 DOM 不提交** —— URL 已变而页面内容仍是旧路由（`Page.bringToFront` 激活后立刻正常）；与 **F94**（过渡不推进）/ **F95**（focus 不派发）同族 ⇒ 凡断言「导航后的页面内容」须先激活 tab；只断言 URL 不受影响。
- **F99**：**壳层新增件与页面级选择器撞车** —— 顶栏搜索件带 `aria-label="搜索"`（与门户折叠搜索触发钮同名）· `[data-slot="input-group"]` · `input[aria-label]`，且**顶栏在 `sidebar-inset` 内** ⇒ 本批 dogfood 原 `CONTENT` 级查找命中顶栏 ⇒ **G13 + G21 共 5 条断言失败**；新增 **`PAGE` 作用域**（`[data-slot="sidebar-inset"] > div` · 排除顶栏）后 **91/0 全绿**。
- **F100**：**修订表版本序（F96/F97 同族 · 第三例 · 本笔自伤后自修）** —— ① **M4a §12** 的「降序尾块 + 升序表头」自相矛盾 ⇒ 改为**全表升序**，并修正表内 **`v0.10`/`v0.9` 颠倒**（**字典序陷阱**：字面比较会误判 `v0.9 > v0.10`，须按**数值**）② **批 design §12 · 批 plan §9**：本笔插入锚点低了一行（`v1.35` 落到 `v1.31` 之下 · `v0.34` 落到 `v0.30` 之下）⇒ 一行移位归位；复核四表**内部自洽**（违规 **0 处**）③ 本笔新增行的**局部归位**也修了 docs/00（`v1.79` → `v1.78` 之下）
- **F100-b（未修 · 待拍板）**：**docs/00 §8 修订表方向混用**（82 行 · **39 处违规**）⇒ 建议统一「**降序 · 最新在上**」（与主 design / 批 design / 批 plan 一致），需重排 82 行，属**独立文档整理笔**；拟议的 `doc-audit`「修订表完整性」检查须**按文档配置方向**（否则 docs/00 长期假红）
### 14.12 T11-i B′ 侧栏一体搜索（2026-09-20 实跑 · 形态 = 官方 `Combobox` · Base UI 原语）

> ⚠️ **本节（B′ 一体形态）为同日试稿，已被 **B″** 取代** —— 用户复审后拍板「还是官方站的对话框更适合一些」⇒ 现行形态 = **框样触发器 → 官方 `CommandDialog`**，见 **§14.13**；其依赖 `@base-ui/react` 已撤除、i18n 回 **347 键**（本节所述的 346 键属当时口径）。

**门禁（实跑）**：`m4a-dogfood` **57 PASS / 0 FAIL**（B 段 6 条重写 · 含「无 `dialog` / 无 `cmdk`」回归锁）·
本批 dogfood **91 PASS / 0 FAIL**（壳层改动**零回归**）· web `typecheck` / `biome` 绿。

**行为真值（CDP 真指针 + 真按键 · 视口 1440×900）**

| 项 | 实测 |
|----|------|
| 输入框 | `input[role=combobox]` · 占位「搜索页面或输入以跳转…」· 高 **32px** · 右侧 `⌘K` 徽标 · **`[role=dialog]` = 0 / `[cmdk-root]` = 0**（弹窗形态确已退役）|
| 点入 | `aria-expanded` false → **true** · `aria-controls` = `_r_1_`（目标节点存在）|
| 面板几何 | 与输入框容器**同宽 236 = 236** · `gap 6px`（`sideOffset=6`）· 左对齐（Base UI 包含块换算带来**恒 3px** 偏移 · 观感不可辨）|
| 条目 | 匿名 **4 条**（门户组：首页 / 技能中心 / MCP 中心 / 专家中心 · 含路由路径）· 组标题「门户」|
| 登录态（真登录 `m4b2_user` · role=1） | 组标题 = **门户 + 个人** · **8 条**（+ 个人工作台 / 我的资产 / 我的提交 / 访问令牌）· **无管理面** ✓ |
| 输入 `seed` | 页面 0 命中 ⇒ 空态「没有匹配的页面」+ 兜底行「在全部资产里搜「seed」」· `autoHighlight` 落在兜底行 |
| `Enter` | 跳 `/search?q=seed` ✓ · **输入框清空**（`value === ''`）· 面板收起 |
| `⌘K` | **焦点进框**（`document.activeElement` = 该 input）+ 展开 ✓（真按键 `modifiers=4`）|
| `Esc` | `aria-expanded=false`（面板节点保留但隐藏 —— 官方 `data-closed`）|

**依赖与偏离**：`@base-ui/react@1.8.0`（**MIT** · +8 包 · 仅 `apps/web`）· vendored `shadcn/combobox.tsx` **308 行** ·
偏离 **3 处**（件头登记：import 路径 / 图标件换 lucide / `ComboboxContent` 增 `width` 变体）。

**i18n**：**346 键 / 12 组**（`pages` 键退役 · zh=en=346 · 双向差集 0 · `m4b4-measure.ts` 实测）。

**权威行数（`m4b4-measure.ts` 实测 · `wc -l` 口径）**：`ui/SidebarSearch.tsx` **289** · `ui/shadcn/combobox.tsx` **308** ·
`ui/SideNav.tsx` **265**（换件后）· `ui/navItems.tsx` **133** · `ui/TopBar.tsx` **109** · `m4a-dogfood.ts` **962** · 本批 dogfood **1528**。

**证据图**：`docs/smoke/m4b4-34-sidebar-search-open.png`（展开态）· `m4b4-35-sidebar-search-fallback.png`（兜底行）。
（**作废**：`m4b4-34-command-palette.png` —— 弹窗形态退役后该图不再对应现行实现，待删。）

**本轮缺陷（明细见批 design §4.7.6）**：**F101**（Base UI 选中把条目 value 写回输入框 ⇒ 改「不控 `inputValue` + `key` 重挂载」）·
**F102**（壳层新件抢探针 ⇒ T11-h 三条假红 · **F99 同族第三例** ⇒ `PAGE` 作用域）·
**F103**（`w-(--anchor-width)` 简写在 Tailwind 4.3.3 不生成 ⇒ 面板塌成内容宽 154px ⇒ 改任意值类）·
**F104**（**视口须在导航前设定**，否则 React 按移动端挂载、侧栏不渲染）。

**观感待看（人工）**：浮层压住下方导航列表（正常浮层行为 · clawhub 同）· 下拉是否显示路由路径（现显示）· 面板底部键盘提示行（现无 · 小样有）。


### 14.13 T11-i B″ 侧栏搜索定稿（2026-09-20 实跑 · 框样触发器 → 官方 `CommandDialog`）

**形态（A 案 · 用户复审拍板）**：侧栏入口 = **看起来像常驻输入框的按钮** —— 依据 = **shadcn 官方站同款实测配方**
（`button[data-slot=dialog-trigger]` · `bg-muted` · `border-none` · `shadow-none` · `justify-start` + 内嵌 `⌘K`）⇒ 点击 / `⌘K` 开官方 `CommandDialog`。

**触发器实测（CDP · 1440×900 真指针）**

| 项 | 实测 |
|----|------|
| 几何/样式 | 高 **32px** · 宽 **224**（= 侧栏内容宽）· 底色 `rgb(241, 245, 251)`（`--muted`）· 边 **0px** · 圆角 **10px** |
| 内容 | 放大镜（`strokeWidth=4`）+ 文案「搜索页面或输入以跳转…」+ 右侧 `⌘K` 徽标（`data-slot=sidebar-menu-button` · `aria-haspopup="dialog"`）|
| 点击前 | `[role=dialog]` 计数 = **0**（入口不是常驻面板）|
| 点击后 | `role=dialog` 出现 · `data-state=open` · `[cmdk-input]` 存在 · 条目 **4 条**（匿名：首页 / 技能中心 / MCP 中心 / 专家中心）· 组标题「页面」|

**断言（`m4a-dogfood` · 全部 PASS）**

```
B″-① 侧栏触发器（框样 · 占位文案 + 快捷键徽标 + aria-haspopup=dialog）  :: {"ok":true,"text":"搜索页面或输入以跳转…|⌘K","kbd":true}
B″-② 点触发器 ⇒ CommandDialog 打开（data-state=open）· 门户 4 条 · 未登录不加管理面 :: {"state":"open","items":[4 条],"heading":["页面"]} anon=true
B″-③ Esc ⇒ 面板关闭
B″-④ ⌘K/Ctrl+K ⇒ 面板打开
B″-⑤ 兜底行出现（「在全部资产里搜「seed」」）  :: ["在全部资产里搜「seed」"]
B″-⑥ 兜底行回车 ⇒ 跳 /search?q=seed
```

**回退账（同日 B′ → B″ · 实测核对）**：删件 **2**（`ui/SidebarSearch.tsx` · `ui/shadcn/combobox.tsx`）· 撤依赖 **1**
（`@base-ui/react` · 实测 `apps/web/package.json` 无 `@base-ui` 残留）· 恢复件 **1**（`ui/CommandPalette.tsx` **120** 行）·
i18n **346 → 347 键 / 12 组**（`pages` 复回 · measure 实测 zh=en=347）· `THIRD-PARTY-NOTICES.md` vendored shadcn **33 件**
（实测重生成）。

**门禁（实跑）**：`m4a-dogfood` **57 PASS / 0 FAIL** · 本批 dogfood **91 PASS / 0 FAIL**（零回归）·
web typecheck / biome 绿 · 后续 CI 同序八步见本轮报告。

**权威行数（`m4b4-measure.ts` 实测 · `wc -l` 口径）**：`ui/CommandPalette.tsx` **120** · `ui/SideNav.tsx` **293** ·
`ui/AppShell.tsx` **99** · `ui/navItems.tsx` **133** · `i18n/zh.ts` **405** · `m4a-dogfood.ts` **904** · 本批 dogfood **1528**。

**缺陷登记**：**F103 / F104 保留**（Tailwind 变量简写不生成 / 视口须先设 —— 工具链与探针事实，与形态无关）；
**F101 / F102 同日撤回**（对象 = B′ 一体形态，已退役）—— F102 的 `PAGE` 作用域修复**保留在脚本中**（防御性 · 复跑通过）。

**证据图**：`docs/smoke/m4b4-34-command-palette.png`（框样触发器 + 打开的命令面板 · 重拍）。
**作废（待删）**：`m4b4-34-sidebar-search-open.png` · `m4b4-35-sidebar-search-fallback.png`（B′ 试稿图）。


### 14.14 T11-i B″ 观感收尾（2026-09-20 实跑 · 用户「只做 B」+「侧边栏搜索图标的颜色要浅一些」）

**触发**：用户把 **shadcn 官方文档站命令面板截图**放入仓库根（未跟踪文件 `dialog` · PNG 1104×900 · 无扩展名）
⇒ 核官方仓实现：`apps/v4/components/command-menu.tsx` **642 行**（实测下载核对）—— 该面板是**站点应用层**自行拼装，
注册表 `command` 件（我仓 vendored = 官方 `new-york-v4` 档，逐字比对差异 **41 行且全为 biome 格式 + import 路径**）
**无 footer 槽位**；底栏右侧那半 = `⌘C pnpm dlx shadcn@latest add <comp>`（组件库专有动作，我方无对应物）。

**决策过程**：出 **5 屏对照小样**（取数全为实测 · 见 §14.14 附注）⇒ 用户**拍板「只做 B」**：仅取**条目前缀箭头**一项；
官方站的**底栏提示栏**与 nova 档**容器几何**未采纳（登记 M4a §8.13 ⑦）。

| 项 | 定值（实测真值） |
|----|------------------|
| 条目形态 | **页面**条目 = `→` + 页面名（lucide `ArrowRight`）· 尺寸 **16px** · 色 `rgb(100, 116, 139)`（= `--muted-foreground`）· `stroke-width=2`；**4 条各 1 枚**（跨条目一致）|
| 尺寸 / 色来源 | **官方 `CommandItem` 内建规则**：`[&_svg:not([class*=size-])]:size-4` + `[&_svg:not([class*=text-])]:text-muted-foreground` ⇒ 本仓**零 className 覆盖** |
| 兜底行 | 「在全部资产里搜「rag」」**无 `svg`**（`querySelector('svg') === null`）—— 搜索语义 ≠ 跳转 |
| 触发器放大镜 | `--foreground` `rgb(15, 23, 42)` → **`--muted-foreground` `rgb(100, 116, 139)`**；与同块文案、`⌘K` 徽标**三处同色**（逐个 `getComputedStyle(...).color` 实测）· `stroke-width=4` 不变（T11-i 既有口径）|

**断言（+3 ⇒ `m4a-dogfood` 60 PASS / 0 FAIL）**：① 触发器取色 = `--muted-foreground` 且 ≠ `--foreground`
（**取色对照 = 临时探针元素解 token**，不写死 hex ⇒ 换肤后仍成立）② 页面条目 4 条**各 1 枚** 16px svg 且同色
③ 兜底行**无** svg。本批 dogfood **91 PASS / 0 FAIL** 零回归（复跑）。

**复核发现（本轮自查）**：
- **F105 · 注释腐化**：`docs/smoke/scripts/m4a-dogfood.ts` 的 `PAGE` 作用域注释仍称壳层件为 **`SidebarSearch`**
  （该件已随 B″ 回退**退役**）⇒ 改述为「顶栏全资产搜索件（常驻）」+ 历史注记（**注释里的已删对象须同步**）。
- **F106 · 文档行数陈旧**：批 design §4.9「落地记录」5 处行数与该轮后续改动脱节 ——
  `AssetSearch` **79 → 81** · `CommandPalette` **116 → 128** · `TopBar` **108 → 109** · `SideNav` **291 → 293** ·
  `AppShell` **98 → 99**（全部 `m4b4-measure.ts` 实测回填）。**纪律**：件被再次触碰时，回扫**所有引用其行数的活口径**。

**行数（`m4b4-measure.ts` 实测 · `wc -l` 口径）**：`ui/CommandPalette.tsx` **128**（**+8**：import 1 + JSX 3 + 注释 4）·
`ui/SideNav.tsx` **293**（单行改 · 计数不变）· `m4a-dogfood.ts` **975**（904 → +71：3 条断言 + 注释订正 + biome 格式化换行）·
i18n **347 键 / 12 组**（**本笔零改动**）· `THIRD-PARTY-NOTICES.md` 仍 **33 件**（**零新依赖**）。

**门禁**：八步 CI 同序见本轮报告（typecheck / lint / format:check / doc-audit / build / db:migrate / `CI=true test --force`）·
`m4a-dogfood` **60/0** · 本批 dogfood **91/0**。

**证据图**：`docs/smoke/m4b4-34-command-palette.png`（重拍 · 含条目箭头与浅色触发器图标）·
`m4b4-32-topbar-search.png` / `m4b4-33-search-all-page.png` 随壳层变更由 dogfood 复跑重拍。

### 14.15 T11-j 门户笔（表格族统一 · `j1`–`j5` · 2026-09-21 实跑）

**门禁（CI 同序八步 · 全绿）**：`typecheck` / `lint` / `format:check`（276 文件）/ **`doc-audit` 66 PASS** / `build` / `db:migrate`（含新迁移 `0013_good_wolverine.sql`）/ `CI=true test` **559 pass · 1 skip · 0 fail**（T11-j 前 562 ⇒ −3 = 被删 3 个排序用例，逐一对上）。

**行为断言（实跑）**：
| 脚本 | 结果 | 说明 |
|------|------|------|
| `m4b4-personal-b-dogfood.ts` | **89 PASS / 0 FAIL / 0 CDP 超时 / NO JS ERRORS** | T11-j 后：**−G22-6**（随 j3 删）· **+G20-10**（操作列真链接）· **G22-3 四档→两档** · `G20-3` 改真值口径（**1 锚点 / 0 button**）· `G20-4` **6 → 7 格** · `G22-7` **五列 → 三列** · `G6` 改**本批前缀锚定**（`m4b4-seed-`，隔离 m4b3 夹具） |
| `m4a-dogfood.ts` | **60 PASS / 0 FAIL · exit 0** | 门户卡 / 网格面**零回归**（与 T11-i 基线 60/0 逐项一致） |
| `m4b3-personal-a-dogfood.ts` | **39 PASS / 0 FAIL**（j1 轮） | 控制台三页零回归（原 38/1 —— `G6` 假红随判据订正消失） |

**观感 / 形态真值（CDP 实测）**：列表形态 **7 列** `["名称","描述","作者","下载","收藏","更新","操作"]` · 表头底纹 `rgba(0,0,0,0)`（**D3 去底纹**）· `table-fixed` + 名称列 **251/1140 = 22.0%** · 表头 **40** / 行高 **65**（`h-10` + `py-4`）· 行内 **恰 1 个进详情锚点 / 0 个 `button`** · 默认档 ⇒ **更新列 `aria-sort=descending`**（D5：列 ⟷ 档由 `meta.sortKey` 携带）· 点「下载」列 ⇒ `?sort=downloads&dir=desc` 且 `aria-sort` 迁移 · 载态 = 表头 7 列 + 3 排序钮 + 骨架 5 行（`colSpan=7`）· 点操作钮 ⇒ `/assets/:slug`。

**i18n**：**347 键 / 12 组**（`j2` +2 `colActions`/`actionOpen` 与 `j3` −2 `sortName`/`sortAuthor` **相抵 = 净零**）· zh/en **双向差集 0**（脚本实测）。

**索引（`j4` · 20 万行独立表 · 残留 0）**：三档 `LIMIT 20` **8.666/7.944/9.013 ms → 0.020/0.030/0.030 ms**（≈265–433×）· `status+type` 前缀**命中**（6.290 → 0.016 ms）· `count(*)` 与「owner + `status=ALL`」**不受益**（与登记口径一致）· 建三条索引 **93.1 ms** · 真库 `\d asset` = **6 条**索引。

**本轮缺陷（F-10…F-18 / F109…F118 族 · 明细见批 design §13 与批 plan §7.6）**：F-10（勾选框无 a11y 名）· F-11（`m4b3 G6` 假失败）· F-12（`rowProps` 类型不放行 `data-*`）· F-13（操作钮断言真值 = 1 锚点 / 0 button）· F-14（载态取样不能用慢网）· F-15（`assets.test.ts` 白名单清单 7 → 4）· F-16（实验须自证数据入表）· F-17（小表 `Seq Scan` 是规划器自由选择）· F-18（档名级陈旧引用）· **F-19**（`m4b4 G6` 按全表行数断言 ⇒ 被 m4b3 跨批夹具污染 ⇒ 改本批前缀锚定）· F111（`doc-audit` 头部判据假绿）。

**证据图（本轮重拍 · 变化图）**：`m4b4-20-mcps-list-view.png`（**列表 7 列**）· `m4b4-20-skills-list-view-anon.png`（匿名列表）· `m4b4-03-my-assets.png` / `m4b4-28-sort-updated-column.png`（排序头）· 原 `26-sort-header-desc.png` **不再产出**（G22-6 删除）。

### 14.16 T11-j `j6` 追加笔（工具条去框化 + 名称列色块 · 2026-09-21 实跑）

**两条用户拍板**：①「**列显示不要外框（和搜索没有外框一样）** · **简化排序成图标的形式，也没有外框**」⇒ 出**线框三方向**（`/tmp/aih-table-alignment/j6-styleboard-v2.html` + 3 张实拍）对比后取 **方向 1「纯图标」**；②「**资产名称列除了文字，可以像卡片一样加一下图标么**」⇒ 按推荐 = **色块 24px · 列宽不动**（控制台名称列归 `T11-k`）。

**断言 / 门禁（实测）**

| 项 | 真值 |
|----|------|
| `m4b4-personal-b-dogfood.ts` | **89 PASS / 0 FAIL**（脚本 **1546 → 1585**：`G22-1` / `G22-3` / `G22-5` / `G22-6c` / `G22-8` 五条改口径 · `G21-3` 工具条容器上移一层 · 新增 `closeMenu` 助手）|
| `m4a-dogfood.ts`（门户零回归） | **60 PASS / 0 FAIL**（**979 行**：中心排序栏 + `/search` 排序钮两条改口径）|
| 运行期探针（去框化） | **8 PASS / 0 FAIL** —— 三枚动作钮 **`border 0px` · 各 32×32** · 排序钮**无文案** · 视图切换**保留 1px 框** · 控件群右边缘 **1416 恒定** · 真指针开菜单 = **3 档 radio（勾「最新」）** · 点「下载量」⇒ **`?sort=downloads`（不带 `dir`）** · 网格态列显示**不渲染** |
| 运行期探针（色块） | **5 PASS / 0 FAIL** —— 名称格 **24×24 · `aria-hidden=true`** · 名称格**零 `a`** · 名称 span `overflow hidden` 且**格内不溢列宽**（`scrollWidth − clientWidth = 0`）· **同资产卡片/列表同色**（`rgb(8,145,178)` / `rgb(245,158,11)` / `rgb(5,150,105)` 三例逐项一致）· 卡片仍 **40px** |
| 页内快速门禁 | `typecheck` / `format:check` / `lint` 全绿（`format` 覆盖 **278** 文件）|
| i18n | **+3 键**（`colShow` / `colRequired` / `colReset`）⇒ 实测 **350 键**（zh ⇄ en 同数 · 12 组 · `market` 组 **81**）|

**证据图**：`docs/smoke/m4b4-24-sort-icon.png`（改名自 `m4b4-24-sort-select.png`）· `m4b4-25-sort-bogus-fallback.png` · `m4b4-27-sort-grid-preserved.png` · `m4b4-28-sort-updated-column.png`（随形态重生成）；线框与探针图共 5 张落**仓外**（`/tmp/aih-table-alignment/`，原型物料不进仓）。

**本轮新发现（编号对齐 plan §7.6）**：**F121** 单一源清单漏「操作」槽列（菜单 6 项 ≠ 拍板七项）· **F122** 控件群多一层容器 ⇒ `G21-3` 工具条宽度探针抓内层（171 ≠ 1129）· **F123** 探针模板串内注释带反引号 ⇒ 字符串截断（**与 F70 同族复发**）。

---

### 14.17 T11-k 控制台笔 `k1`（2026-09-21 实跑 · 含两次追加拍板）

**范围**：控制台「我的资产」（**路由真值 `/dashboard/assets`**）——`k1` 主体（排序头 + 列开关 + 名称列色块）+ 两次用户追加（**视图切换**「能也支持卡片和列表切换显示么」· **搜索对齐门户**「搜索也对齐一下门户的搜索」）。

**实测真值（三支探针 · 全绿）**

| 探针 | 断言 | 关键真值 |
|------|------|----------|
| `k1`（11 条） | 表头 9 列 · 「操作」**可见** · 仅 下载/收藏/更新 可点 · 点列头 ⇒ `?sort=downloads&dir=desc` + `aria-sort=descending` + 序与接口逐项一致 · 同列再点 ⇒ `dir=asc` | 两态 URL 与接口序**逐项一致** |
| `k1`（续） | 列开关 **9 项** · **全 9 项 checked**（保护列「已勾选 + 置灰」= M-A 语义）· 置灰 **2** + 「必显」×2 · 勾掉「类型」⇒ 表头/表体各少一列 + **角标 1** · 重置 ⇒ 回 9 · 名称列**关不掉** | 角标 = `j6` 声称能力的补齐（**F124**） |
| `k1`（续） | 名称列色块 **20×20** · `aria-hidden` · 不溢列宽 · **A/B：临时隐藏色块 ⇒ 行高不变（53/53）** · **跨面同色**（控制台 20px ⇄ 门户 24px 同资产 `rgb(8,145,178)`） | 行高由**名称两行内容**驱动（非色块） |
| 搜索对齐（5 条） | 默认收起（`aria-expanded=false` · 面板不渲染）· 点钮 ⇒ 展开 + **自动获焦** + 宽 **1081px** · 输入 300ms 防抖 ⇒ `?q=mcp`（列表只剩 2 行）· 关闭钮 ⇒ 清空 + 收起 | 形态与门户 `T11-e` 逐字同构 |
| 视图切换（6 条） | 默认**列表**（表头 9 · 列显示钮在 · **排序钮不渲染**）· 切网格 ⇒ 卡片渲染 + 列显示钮消失 + 排序钮出现 + **色块 40px** + 状态徽标 · 卡片态排序 ⇒ 三档菜单（勾「最新」）⇒ `?sort=stars` · 切回列表 ⇒ 表头回 · **刷新回到列表**（不记忆） | 两态入口互斥 · 徽标来自 `AssetCard` 新增 `status` 槽 |

**i18n**：本笔 **+0 键**（复用 `market.colShow/colRequired/colReset/searchBtn/searchClose/viewGrid/viewList` = **7 键跨组复用**）⇒ 总 **350 键**不变。**页内快速门禁**（typecheck / format / lint）全绿。**真图 3 张**（`/tmp/aih-table-alignment/`：`k1-01` 控制台列表 · `k1b-search-panel` 搜索展开 · `k1c-console-grid` 卡片视图 = 仓外原型/探针物料）。

**本轮新发现**：**F124**（`j6` 角标：设计/计划声称已落而**代码未落** ⇒ 本轮补齐 + 登记）· **F125**（URL 带**越界** `page` ⇒ **页面级空态**、`thead` 不渲染、文案「从未有资产」· **预存行为** ⇒ 语义偏差 + 使「从第 2 页改排序回第 1 页」在控制台端到端不可达 ⇒ 该断言按**同源**记：`dropPage` 在 hook 内，控制台与门户共用同一函数，门户 `G22-4` 已覆盖）。

**`k2` 实测（2026-09-21 · 已落地）**：`Submissions` / `Tokens` 各 **+1 `rowActionsHeader`**（零新增键 ⇒ **三页可见「操作」齐**）· `m4b3-personal-a-dogfood.ts`（**891 → 1049 行**）新增 **`G16`–`G19`**（表头/可点列 · 列头两态 + URL 同步 + **序与接口逐项一致** · 列开关 9 项/保护 2/角标 1/重置/关不掉 · 视图切换 + 搜索对齐）⇒ 首跑 **4 FAIL 如实留痕**（`G2`×2/`G3` = 未重 seed；`G19` = `MenuItem`「重置」后多点了触发钮 ⇒ 菜单复开、点击被遮罩吃掉）⇒ 修完复跑 **43 PASS / 0 FAIL**（**39 → 43 = +4** 逐项对上 · **零回归**）· 新图 `docs/smoke/m4b3-05-console-grid.png` · **F126** 登记。

---

### 14.8 未决 / 待用户拍板

- **观感**（须人眼）：① **排序控件形态已定**（用户线框四案对比后拍板官方 `Select`）② 待看余项 = 列头按钮与表头左对齐（官方 `Button` 自带内距）· 方向图标尺寸 · ~~排序 `Select` 与搜索/视图钮的视觉重量平衡~~（**`j6` 已收口** —— 三枚动作钮统一无框图标 · 视图切换独占边框 ⇒ §14.16）
- **登记后续**（非目标 · 见批 design §4.7.2）：控制台「我的资产」UI 排序（`DataTable` legacy 面加性接法已实证可行）· 排序索引（`download_count`/`star_count` 无索引）· 名称 `COLLATE`（中文 collation 按 code point 序）· 排序**记忆**
- **F86 关联**：`test --coverage` 全量口径会跑 `dist/**`；建议后续清 `dist` 或加 ignore（归测试基建，与 F66 同族）
- **提交**：✅ **已提交推送 3 笔**（`72e48db` `feat(server)` → `434043b` `feat(web)` → `ced0d6a` `test(docs)`）· CI run **`35499952284`** = **success**（12 步全 success）；收口审计的活口径订正（**F93**）随第 4 笔 `docs(m4b4)` 落地
