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
| **G14** | 门户零回归（+ 详情页收藏入口） | ✅ §2 的 `m4a-dogfood` **36/36** + 详情页收藏入口存在（`aria-label` = `收藏 N`）· ⚠️ **门户卡已改纯展示**（2026-09-18 用户拍板）⇒ 见 **G14b** |
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
| 门户调用点零 diff | `CenterPage.tsx` / `FilterStrip.tsx` **未改** | ✅ |
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
| ④ | dogfood / 观感（合规核对，审美归 M4b-7） | ✅ §3（G1–G19 + **G12b** + **G14b** = **60 PASS / 0 FAIL / NO JS ERRORS**）+ ⬜ **用户实机观感**（§11） |
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
