# M4b-7 发布批：Web 发布流（新建资产 + 单 zip 上传 + 一键链提审）—— 批计划

> Date: 2026-09-28
> Updated: 2026-09-28（**v0.4：第四轮提交前复核（R1）** —— 角轮 = **文档声称的门禁链 vs 真 CI 逐条比对**（含从未跑过的 `format:check`），实测 **9.46** ⇒ 修 1 条：**plan 6 处写「门禁 11 步」**（T9 出口 / 断言③ / §4 硬规则 / §8 准确性 / §8.1 记录 / v0.1 行），而 **CI 现状实测 = 11 步 · 本批交付后（+第五道）= 12 步**，design §9.2 链本就是 **12 项** ⇒ 全部订正为 **12 步（原 11 + 本批新增第五道）**；design §9.2 标题亦标注步数。**验证安全项**：`format:check` 实跑通过（biome `includes` 仅 `**/*.ts`/`**/*.tsx`/`**/*.json` ⇒ **不覆盖 `.md`**）⇒ docs-only 提交在 format 步零风险）
> Updated: 2026-09-28（**v0.3：第三轮提交前复核（Q1/Q2）** —— 角轮 = **门禁自身扫什么 + 批指针面**，实测 **9.24** ⇒ 修 2 条：**Q1（真·高价值 · 推翻前两轮自报读数）** `table-structure-check` / `doc-claims-check` 用 **`git ls-files docs`** 枚举 ⇒ **只扫已跟踪文件** ⇒ 两个新件（design/plan）此前**从未入闸**、「门禁全绿」对它们**空转**；暂存后取真读数 = doc-audit **217/0** · doc-claims **116/0** · head-sink **2/0** · table-structure **39/0（56 份）** ⇒ **硬规则入 design §9.2 + plan §4**（新件先暂存再跑门禁）+ §6 风险 12 · **Q2** `docs/README.md` §6.1 F 号导航表 + `AGENTS.md` 批指针 ⇒ 登记 **design §9.7 ⑧**（时点 = 实现期首条 findings 登记时同批；不列件，先例 M4b-6）⇒ §8.4 复评 **9.50**）
> **头部口径（2026-09-18 起）**：只留最近 1-2 版 · 不复述历史与验收数字；更早版本（**v0.1–v0.2**）见 **§9 修订记录**。
> Status: ⬜ **待实现**（设计已定稿 · 2026-09-28；本 plan 为实现唯一依据）
> 上游：批 design `docs/designs/2026-09-28-m4b7-publish-design.md`（**定稿 · v0.8 · 8 维 9.50** · D1–D49 · C1–C17 · U1–U4/U7 为批外登记项）
> · 主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（**v1.76** · §2.3 批件登记 M4b-7 行 = **已对齐**）· `docs/00-product-direction.md` §5（**v1.100** · M4b-7 行 = 设计定稿）
> · 规范 `docs/07` §3/§4（i18n）· `docs/02` §3.3/§4 · `docs/03` §4/§5 · `docs/04` §5（族上限与错误码表）
> **前置：M4b-6 ✅**（出口五件全绿 · 2026-09-23 完成 · 整体审计 2026-09-25 补记无未决项）· 依赖顺序：**M4b-1 ✅ / M4b-2 ✅ / M4b-3 ✅ / M4b-4 ✅ / M4b-5 ✅ / M4b-6 ✅** ⇒ 本批开工条件已满足；本批之后 = **M4b-8**（控制台视觉打磨批）

---

## 1. 目标与非目标

**目标**（本批 = `/dashboard/publish` 发布页 + 一键链编排 + 三入口 + 1 只读端点 + 2 处上限默认值）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | **发布页 `/dashboard/publish`** | 左栏三段（① 新建资产 ② 上传版本 ③ 提交审核）+ 右栏**流程面板**（三段竖排 + 连接线 + 状态圆点）；**三段同页平铺**（非向导页）；**单按钮一键链**（新建 → 上传 → 提审，**一次点击**） |
| 2 | **一键链编排** | `lib/publish-chain.ts`：三跳顺序与前置 · 失败停点（**不回滚**）· 版本号预填推导（纯函数） |
| 3 | **上传通道** | `apiUpload`（XHR + `upload.onprogress` + `abort`）—— **不替换** `fetch` 客户端（401 四分类 / 错误归一 / `Accept-Language` 全复用） |
| 4 | **两出口** | 「**放弃该资产**」（二次确认 · POST-409 失败面 · **前提 = 本页会话内创建 ∧ 该资产零版本**）· 「**撤回提交**」（完成态 · `POST /api/reviews/:id/withdraw` 204） |
| 5 | **三入口** | 侧栏「个人」组第 5 条「发布」（图标 `Upload`）· 顶栏「发布」（`<1024px` ⇒ 纯图标，不隐藏）· 资产详情页卡片「发布新版本」→ `?slug=` 深链 |
| 6 | **服务端（零写面改动）** | ① **新增** `GET /api/meta/limits`（只读 · **匿名可读** · 出参 `{ packageMaxBytes, fileMaxBytes, maxFiles }`）② `ASSET_PACKAGE_MAX_BYTES` 默认 `10 → 100 MiB` · `ASSET_FILE_MAX_BYTES` 默认 `1 → 10 MiB` ③ **代码侧 6 处**写死字节数的注释 / 用例标题去写死（改引 env 单源） |
| 7 | **i18n** | 新组 `publish`（**55 键**）· `errors` 组 **40 → 66**（20 协议码 + 6 本页可达业务码）· zh/en 零差集 |
| 8 | **规范层回填** | `docs/02` §4 / `docs/03` §4（**新增**码表）/ `docs/04` §5 / `docs/07` §3（`publish` 组落地注记） |
| 9 | **验证基建** | 造数脚本（2 + 1 + 1 夹具）· dogfood **九段**（G1–G9）· **第五道文档门禁** `file-ref-closure-check`（件面 ↔ 引用闭合） |
| 10 | **上限表述全覆盖** | 规范层 3 处 + **代码侧 6 处**（`validate/zip.ts` · `frontmatter.ts` · `http/assets.ts` · `assets.test.ts` · `assets/versions.ts` + `config/env.ts` 注释）随本批同改 |

**非目标（Out）**

| # | 不做 | 归属 |
|---|------|------|
| 1 | 「未发布不可见」新状态（空壳资产新建即公开可读 —— **接受项** C6/D9） | 不引入 |
| 2 | 版本列表页 / 版本删除 UI（用「撤回提交」替代 → 服务端 `PENDING_REVIEW` 属禁删态 D30） | 不引入 |
| 3 | 多文件 / 拖拽 / 断点续传 / 多包批量 | 不引入（单 zip 与 CLI 同格式） |
| 4 | `publish` 组以外的 i18n 组重构 · `dashboard` 资源组补行 | 07 §3 台账（M4b 收尾） |
| 5 | 既有 2 处 `Field` 消费的官方配方统一（U7） | 跨批能力债 |
| 6 | 决策表「落点回指」列（F13） | 风格候选 |
| 7 | 控制台视觉最后一公里（页面色值/节奏） | **M4b-8** |

---

## 2. Task 总览

**执行序 = 服务端能力先行 → i18n → 前端数据层 → 编排 → 官方件 → 页面 → 三入口 → 脚本/验证 → 文档/清理。**

| # | 归属 | 主题（件） | 前置 | 出口 |
|---|------|-----------|------|------|
| **T1** | server | 只读端点 `GET /api/meta/limits`（**N6** `http/meta.ts` + **N7** `meta.test.ts` + **M10** `app.ts` 注册） | — | `bun test src/http/meta.test.ts` + 匿名 200 + 出参三键 ↔ env |
| **T2** | server | 上限默认值 2 处（**M11** `config/env.ts`）+ **代码侧 6 处**去写死（**M17–M21** + M11 注释） | — | `bun test src/http/assets.test.ts` 0 fail · 全仓 `grep 10MiB\|1MiB` 只剩「引用 env 单源」表述 |
| **T3** | web | i18n 键表（**M8** `i18n/zh.ts` + **M9** `i18n/en.ts`）：`publish` 55 键 + `errors` +26 键 | — | 键数实测 **55 / 66** · zh↔en 差集 **0** · 新件零中文硬编码（G9） |
| **T4** | web | 数据层（**M5** `api/client.ts` +`apiUpload` · **M6** `api/assets.ts` +`createAsset` · **M7** `api/versions.ts` +`uploadVersion` · **N3** `api/meta.ts`） | T1 | `typecheck` 绿 · XHR 进度回调与 `abort` 可被 dogfood 观测 |
| **T5** | web | 一键链编排（**N2** `lib/publish-chain.ts`）：三跳 / 停点 / 预填推导 | T4 | 预填**四支**可断言（+1 / 空壳 1.0.0 / `-pre` 剥段 / 撞号 409） |
| **T6** | web | 官方件落仓（**N4** `ui/shadcn/progress.tsx` · **N5** `ui/shadcn/radio-group.tsx`） | — | 与官方 registry 逐字一致（10 子件/6 子件口径见 design §2.3） |
| **T7** | web | 发布页（**N1** `pages/Publish.tsx`）：三段 + 右栏面板 + 四态 + 线框 A–E | T3 · T5 · T6 | dogfood **G3–G7** 绿（形态 / 逐态 / 错误面 / 出口） |
| **T8** | web | 三入口 + 路由（**M1** `main.tsx` · **M2** `navItems.tsx` · **M3** `TopBar.tsx` · **M4** `AssetAdminCard.tsx`） | T7 | dogfood **G1–G2** 绿（侧栏 5 条 / 顶栏位序 / 深链非 `disabled`） |
| **T9** | script | 造数 + dogfood 九段 + 第五道门禁（**N9** · **N8** · **N10**） | T1–T8 | 九段逐段落 PASS · 门禁 **12 步** exit 0（原 11 + 本批新增第五道）· 残留零 |
| **T10** | 文档 / 收尾 | 规范层回填（**M13–M16**）+ §9.7 回填项 + 清理 + 证据归档 | T9 | `docs/02/03/04/07` 改毕 · 键数/行数/断言数回填 · `git status` 清 |

**注**：design §9.6 的 **12 处同步点已于 2026-09-28「定稿」时执行完毕**（主 design **v1.76** · `docs/00` **v1.100** · `AGENTS.md` 已核零改动）⇒ 本 plan **不设对应 Task**（已办事项不重复计工）。

---

## 3. Task 明细

### T1 · server：只读端点 `GET /api/meta/limits`

> 依据 = design **§5.1**（端点契约）· **§5.3**（零写面改动声明）· **C1**（上限来源与回落）· **D18**（上限文案单一真值源）· §3.1 **N6/N7** · §3.2 **M10**。

1. **新建** `apps/server/src/http/meta.ts`：`createMetaRoutes()` —— `app.get('/limits', …)`（**不挂** `requireAuth()`，与 `/api/stats` 同档：平台静态上限、非用户数据）
   出参：`{ packageMaxBytes: number, fileMaxBytes: number, maxFiles: number }`（三值取自 `getEnv()`；**不**回显其他 env）
   语义：只读 · 无副作用 · **不入审计**
2. **改造** `apps/server/src/app.ts`：`app.route('/api/meta', createMetaRoutes())`（与既有 `/api/stats` 注册同位；**零其他改动**）
3. **新建** `apps/server/src/http/meta.test.ts`：用例见下

**测试文件**：**新建** `apps/server/src/http/meta.test.ts` · 命令 `bun test src/http/meta.test.ts`

**断言 / 门禁**：① 匿名（无 cookie）**200**（正证：与 `/api/stats` 同档）② 三键 ↔ `getEnv()` **逐键相等** —— **断言读 env 取值比对，不写死数字**（T2 前实测基线 = `10485760` / `1048576` / `100`；T2 后 = `104857600` / `10485760` / `100`，**用例不随默认值改动**）③ **不被环境变量污染**：注入 `ASSET_*` 后**同一进程内**读回为新值（正证 env 单源），另起进程（默认 env）读回为旧值（反证无写死）④ 出参**只含三键**（键集合精确断言 —— 防后续误加敏感 env）⑤ `typecheck` + `biome` 绿

---

### T2 · server：上限默认值 + 代码侧 6 处去写死

> 依据 = design **§5.2**（上限默认值两处 + 代码侧同步 6 处）· **F1/F5**（腐化面与历史豁免）· **§9.7 ①** · §3.2 **M11 · M17–M21**。

1. **改造** `apps/server/src/config/env.ts`：`ASSET_PACKAGE_MAX_BYTES` 默认 `10 → 100 MiB` · `ASSET_FILE_MAX_BYTES` 默认 `1 → 10 MiB`（`:41` 注释同步为「引用本文件为单源，不写死字节数」）
2. **改造**（同批 · 一律**改引「上限由 `config/env` 单源」+ 去掉写死字节数**）：
   - **M17** `validate/zip.ts`：`:6,7`（默认值注释）· `:194`（「总量 ≤10MiB」）
   - **M18** `validate/frontmatter.ts`：`:24`（「≤1MiB」）
   - **M19** `http/assets.ts`：`:545`（「02 §3.3 10MiB」）
   - **M20** `http/assets.test.ts`：`:351`（**用例标题**「10MiB」—— **行为不变**，仅标题/注释口径）
   - **M21** `assets/versions.ts`：`:27`（「已界 ≤10MiB」）
3. 根 **`.env.example`**（**M12**）：补三项上限（**注释形式** + 注明默认值）；本机 `apps/server/.env` **不动**（D17）
4. **不做**：`docs/plans/M2-assets.md:88,93,169` 与 `docs/plans/M3-governance.md:374` 的旧字节数属**史实** ⇒ **不改**（F5 豁免 · 沿革记 commit）

**测试文件**：**扩充既有** `apps/server/src/http/assets.test.ts`（413 用例注入小上限 ⇒ 仍吃 `asset.package_too_large`；默认值变更**不影响**既有断言的注入式写法）· 命令 `bun test src/http/assets.test.ts`

**断言 / 门禁**：① `bun test` 0 fail（含既有 413 / 校验全链）② **全仓扫残留**：`grep -rn '1MiB\|10MiB' apps packages docs/02* docs/03* docs/04*` 在 M17–M21 改毕后**只剩**「引用 env 单源」语义的表述（历史 plan 命中除外）③ `typecheck` + `biome` 绿 ④ 默认值实测：新进程 `getEnv()` ⇒ `104857600` / `10485760`

---

### T3 · web：i18n 键表（`publish` 55 键 + `errors` 26 键）

> 依据 = design **§6.1–§6.3**（组口径 / 键表 55 行 / `errors` 扩键）· **D31 · D46 · F4 · N1/N6** · 规范 `docs/07` §3（组清单已含 `publish`）/ §4（`code → 消息` 契约）。

1. **改造** `apps/web/src/i18n/zh.ts`：新增组 `publish`（**55 键**，逐条按 design §6.2 表落）+ `errors` 组扩 **26 键**（20 协议码 + 6 本页可达业务码：`asset.slug_taken` / `asset.package_too_large` / `asset.package_layout_invalid` / `asset.package_path_invalid` / `asset.version_conflict` / `asset.version_not_submittable`）
2. **改造** `apps/web/src/i18n/en.ts`：同键成对（**键集合零差集**）
3. **口径（防违约/防硬编码）**：① **错误码文案一律落 `errors` 组**（**不在** `publish` 组另立同义键 —— N1）② 「重新选择」复用 `field.file.choose` · 「发布（重试）」复用 `action.publish`（**不新增键** —— N6）③ 插值语法 = **单花括号 `{name}`**（`I18nProvider.tsx:24-27` 实测）；错误文案一律经 **`tErr(code, vars?)`**（`:53-56`）取，**禁自造查表与中文兜底** —— F4

**测试文件**：**前端无单测**（随仓情：`apps/web/src` 单测文件实测 **0**）⇒ 由 **dogfood G9**（新件源码注释外零中文字面量）+ `typecheck` 覆盖

**断言 / 门禁**：① 键数实测 **55**（`publish`）/ **66**（`errors` 总数）② zh↔en **双向差集 0** ③ 组名 `publish` 与 `docs/07` §3 一致 ④ `typecheck` + `biome` 绿

---

### T4 · web：数据层（`apiUpload` + 三个 API 函数 + `api/meta.ts`）

> 依据 = design **§4.5**（上传通道）· **C1/C13**（上限来源与预检）· **D38**（资产读面 `?q=`）· §3.2 **M5–M7** · §3.1 **N3**。

1. **改造** `apps/web/src/api/client.ts`：加 `apiUpload(url, { file, fields, onProgress, signal })` —— XHR 实现；**复用** 401 四分类（`skipAuthRedirect` 关）· 错误归一 `{code,message}` · `Accept-Language` 头；**不进**语言感知缓存（非 GET）；暴露 `abort()`
2. **改造** `apps/web/src/api/assets.ts`：加 `createAsset({ slug, type })` → `POST /api/assets`（201）
3. **改造** `apps/web/src/api/versions.ts`：加 `uploadVersion(slug, { file, version, changelog }, { onProgress, signal })` → `POST /api/assets/:slug/versions`（multipart · 201 · `status=DRAFT`）
4. **新建** `apps/web/src/api/meta.ts`：`fetchPlatformLimits()` → `GET /api/meta/limits`，失败 ⇒ 前端常量兜底 `100 / 10 / 100`（**仅用于文案**，判定恒在服务端 —— C1）
5. **复用不改**（已实测存在）：`api/me.ts:24 fetchMyAssets`（已支持 `q`/`limit`）· `hooks/useMarketQuery`（搜索防抖与 URL 写入 —— D46/C17）

**测试文件**：**前端无单测** ⇒ dogfood **G5**（一键链 happy）覆盖真实上传与进度；`typecheck` 兜住签名

**断言 / 门禁**：① `typecheck` 绿 ② dogfood 断言：上传期间 `xhr.upload.onprogress` 被调用（② 段进度文案出现）③ `abort()` 后主按钮回可点（G4 执行中分支）④ 401 分类复用：未登录调 `createAsset` 走统一跳登录通路

---

### T5 · web：一键链编排 `lib/publish-chain.ts`

> 依据 = design **§4.4**（三跳语义 · 失败停点 · 出口）· **C3/C11–C17** · **D37/D39/D40–D45** · §3.1 **N2**。

1. **新建** `apps/web/src/lib/publish-chain.ts`（**纯函数**，无 React 依赖）：
   - `deriveNextVersion(latestVersion: string | null): string` —— 新建 / 空壳 ⇒ `1.0.0`；已有 ⇒ `major.minor.(patch+1)`；含 `-pre` ⇒ **剥 pre 段补位**（`2.0.0-pre` ⇒ `2.0.0`）· **不拉版本列表、不做撞号规避**（D37）
   - `runChain(deps, { slug?, type?, file, version, changelog }, hooks)` —— 跳1 注册（仅「新建」支；重试时已创建则**不重复注册**）→ 跳2 上传 → 跳3 提审；**失败停点不回滚**（D5）；每跳 `onStep` 回调驱动右栏状态；返回 `{ assetSlug, version, taskId } | { stopAt, error }`
   - **幂等边界**：以「本页会话内已创建标记」为准，**不做**服务端探测（D39 前提）
2. **不做**：自定义每跳超时（C9 明确不定毫秒数）

**测试文件**：**前端无单测**（**结论已决策化** —— 不新增单测件，F11）⇒ 各支由 **dogfood G4/G6** 点名覆盖

**断言 / 门禁**：① dogfood **预填四支**：正常 `+1` / 空壳 ⇒ `1.0.0` / `-pre` ⇒ 剥段 / 撞号 ⇒ 409 行内（G6 ②）② 跳1 跳过逻辑：`?slug=` 起手 ⇒ **不调** `POST /api/assets`（断言网络：注册请求数 = 0）③ 停点不回滚：跳2 失败后资产仍存在（`/api/me/assets` 可见）④ `typecheck` + `biome` 绿

---

### T6 · web：官方件落仓（`progress.tsx` · `radio-group.tsx`）

> 依据 = design **§2.3**（官方件装配清单）· **D14/D29**（官方件优先 · 禁手搓结构件）· §3.1 **N4/N5**。

1. **新建** `apps/web/src/components/ui/shadcn/progress.tsx`（官方 registry 源码件 · 逐字拷贝）
2. **新建** `apps/web/src/components/ui/shadcn/radio-group.tsx`（同上）
3. **零新依赖**（两件均基于仓内已装原语）
4. **复用不扩**：`field.tsx`（10 子件）/ `empty.tsx`（6 子件）**已在仓** ⇒ 本页**直连**，不扩 `EmptyState` 薄封装（D35/D36）

**测试文件**：无（纯件拷贝）⇒ dogfood **G3** 断言 `[data-slot]` 在位

**断言 / 门禁**：① 与官方 registry 逐字一致（`diff` 零差异；若有本地适配须逐行写明）② `typecheck` + `biome` 绿 ③ dogfood G3：`[data-slot="field-set"]` ×3 · `[data-slot="empty"]` 在位且含 `EmptyContent` · `[data-slot^="combobox"]` 在位（**非**原生 `select`）

---

### T7 · web：发布页 `pages/Publish.tsx`

> 依据 = design **§4.1–§4.9**（页面规格 / 三跳 / 上传 / 错误 / 参数 / 状态表 / 线框）· **D32–D36 · D44–D49** · §3.1 **N1**。

1. **新建** `apps/web/src/pages/Publish.tsx`：
   - **左栏三段**（每段 `<FieldSet>` + `<FieldLegend>`（编号圆点作 legend 子元素）+ `<FieldGroup>` —— D32）：① 二选一 `RadioGroup`（新建 / 选用已有资产；已有支 = 官方 `Combobox` + 选中项下方上下文行 `field.asset.latest`）② 未选文件态 = 官方 `Empty` 完整配方（虚线描边 + `EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`（上限）+ `EmptyContent` 按钮）· 已选态 = 文件名/大小 + 版本号 + 更新说明 ③ 单按钮 `发布`（`size=lg`）+ 卡片外 `flow.note`
   - **右栏流程面板**：三段**竖排** + **连接线 2 条** + 状态圆点（`待办/当前/完成/未通过`）；进度只在 ② 段内（C8）
   - **四态**（§4.8 全 15 行）：起步 / 读面载·空·错 / 执行中（含取消）/ 校验失败 / 冲突 / 失败·已有版本 / 限流倒计时 / 完成 / 已撤回
   - **字段错误联动**（D33）：`<Field data-invalid>` + 控件 `aria-invalid` + `<FieldError>` 三件同批
   - **一键盘语义**：未选文件 ⇒ 主按钮 `disabled`（存在性门）；超总包上限 ⇒ 行内即时提示（**仍可提交**，C13/D40）；429 ⇒ 倒计时 `disabled`（C14/D43）
   - **URL 契约**（D46/C17）：读 `?slug=`（无效 ⇒ 忽略 + 轻提示 `assetNotFound` + 回落「新建」）· 写 `?q=`（复用 `useMarketQuery`）· 其余不落 URL
   - **复位语义**（C15）：完成态「再发布一个」= 清 slug/文件/changelog/版本号 ⇒ 回落「新建」+ `1.0.0`（不清 `?q=`）
   - **卸载即 abort**（C16/D41）：进行中上传在组件卸载时 `abort()`（无 `beforeunload`）
2. **文案**：一律 `t('publish', …)` / `tErr(code, vars)`；**零中文字面量**（G9）

**测试文件**：**前端无单测** ⇒ dogfood **G3–G7** 点名覆盖（形态 / 逐态 / 错误面 / 出口 / 硬编码守卫 G9）

**断言 / 门禁**：① G3 形态：`aside` 1 个且右栏 `left > 左栏 right` · 三段 `top` 递增且 `left` 恒等 · 连接线 2 条 · 链内动作按钮**恰 1 个** ② G4 逐态（**§4.8 全 15 行** · 读圆点 class）含 **读面载 / 读面空（零资产切支）/ 读面错 / 取消上传** 四态 + **预填四支** ③ G6 错误面六项（409 slug / 409 version / 400 issues / 413 / 429 倒计时 / `?slug=` 无效）④ G7 出口两分支（含 **反证**：给资产补一条版本 ⇒「放弃该资产」**不出现**）⑤ G9 零硬编码 ⑥ `NO JS ERRORS` 逐段

---

### T8 · web：三入口 + 路由

> 依据 = design **§4.7**（三入口与未登录回跳）· **D27**（`<1024px` 纯图标）· §2.2（占位机制复用）· §3.2 **M1–M4**。

1. **改造** `apps/web/src/main.tsx`：登录段内加 `<Route path="/dashboard/publish" element={<Publish />} />`（惰性加载体例随既有）；**清 `:110` 原型残留注释**
2. **改造** `apps/web/src/components/ui/navItems.tsx`：个人组末位加第 5 条 `{ to: '/dashboard/publish', text: t('publish','title'), icon: <Upload/> }`（`Upload` 图标全仓零占用 · 实测）
3. **改造** `apps/web/src/components/ui/TopBar.tsx`：右侧加「发布」入口（置于 `AssetSearch` **左侧**）；`<1024px` ⇒ **纯图标**（`size=icon` + `aria-label`，**不隐藏** —— D27）
4. **改造** `apps/web/src/components/console/AssetAdminCard.tsx`：版本组「发布新版本」占位 → `<Link to={/dashboard/publish?slug=…}>`（**保留 `disabled` 判定依据不变**）
5. **复用不改**：未登录点击 ⇒ 既有占位机制（`SideNav.tsx:236,253`：`gate === 'authed'` 判组 + `toast(t('common','comingSoon'))`）+ `auth/next.ts:22` 白名单（`/dashboard` 天然命中）

**测试文件**：**前端无单测** ⇒ dogfood **G1–G2**

**断言 / 门禁**：① G1：侧栏个人组 **5 条**且第 5 条 = 发布（取 `nav-truth` SSOT）· 顶栏「发布」在搜索**左侧** · 卡片不再是 `disabled` 且 `href` 带 `?slug=` ② G2：未登录 ⇒ toast（`publish.loginRequired`）+ 落 `/login?next=/dashboard/publish`（断言 `search`）③ **零回归**：既有 4 页标题与关键元素在位 · 侧栏激活唯一性 ④ `NO JS ERRORS` ⑤ `typecheck` + `biome` 绿

---

### T9 · script：造数 + dogfood 九段 + 第五道门禁

> 依据 = design **§9.2**（门禁顺序）· **§9.3**（九段）· **§9.5**（造数）· §3.1 **N8–N10**。

1. **新建** `docs/smoke/scripts/m4b7-seed-assets.ts`（幂等 · **写库须授权**）：
   - `m4b7-fix-1`（mcp · ACTIVE · **有 1 版本**）⇒ 「选用已有资产」与版本冲突用例
   - `m4b7-fix-2`（mcp · ACTIVE · **0 版本空壳**）⇒ 空壳公开接受项（C6）
   - 一条 DRAFT 版本（`m4b7-fix-1@0.0.1`）⇒ 版本号冲突 409（跳2）
   - 一条 `PENDING` review ⇒ 「撤回提交」出口（G7）
   - 提供 `--clean`（连带审计行清理）
2. **新建** `docs/smoke/scripts/m4b7-publish-dogfood.ts`（**九段** G1–G9 · CDP 真浏览器 · 含 DOM 量值断言）：
   - **上传夹具内联生成**（最小合法 skill 包 = `SKILL.md`（name/description frontmatter + 正文）+ 一个附件 · 总量 **≤10 KiB**）—— **不落二进制入仓**
   - **不造什么**：不造 100 MiB 真包（413 走 env 注入）· 不造 PUBLISHED 版本（止步 `PENDING_REVIEW`）· 不造第二用户（免触登录限流 ⇒ 分段跑）
3. **新建** `docs/smoke/scripts/file-ref-closure-check.ts`（**第五道文档门禁**）：
   - ① §3.1/§3.2 件路径分档断言（`N` 新建：允许不存在 · `M` 改造：**必须已存在**）
   - ② 全文出现的 `apps/**` · `docs/**` · `.env.example` 路径集合 **⊆ 件面 ∪ §9.6 同步点文档 ∪ 历史豁免**（`docs/plans/**` 史实）；未归属路径 ⇒ **FAIL**
4. **接入 CI**（**M22** · `.github/workflows/ci.yml`）：在 `table-structure-check` step 之后、`build` 之前**新增一步** `bun docs/smoke/scripts/file-ref-closure-check.ts`（与既有四道 step 同形态：`working-directory` + `run` + 注释说明本维管什么）—— **不接 CI 等于门禁白装**（P6）

**测试文件**：本 Task 产出即验证件（N8/N9/N10）

**断言 / 门禁**：① 九段逐段 `SMOKE_ONLY=Gn` PASS + 每段 `NO JS ERRORS` ② 收尾**全量**跑一次（分段不得替代全量）③ 门禁 **12 步**逐项 exit 0（原 11 + 本批新增第五道） ④ 造数 `--clean` 后 `/api/me/assets` 与审计零残留（`m4b7-` 前缀）⑤ 夹具未入 `git status`

---

### T10 · 文档 / 收尾：规范层回填 + 回填项 + 清理 + 证据

> 依据 = design **§9.4**（验收清单 14 项）· **§9.7**（收尾回填 ①–⑦）· §3.2 **M13–M16**。

1. **改造** `docs/02-skill-protocol.md`（**M13**）：§4 错误码表补「建议 i18n」列缺项 + 与 `protocolErrorCodes` 对齐；§3.3 上限表述 → 新默认
2. **改造** `docs/03-mcp-bundle-protocol.md`（**M14**）：§4 **新增**族错误码表（现 §4 为凭据安全规则，无码表）；§5 上限表述同步
3. **改造** `docs/04-agent-protocol.md`（**M15**）：§5 错误码表补「建议 i18n」列；上限表述同步
4. **改造** `docs/07-i18n-conventions.md`（**M16**）：§3 `publish` 组落地注记（预留 → 落地 + 键数实测回填）
5. **回填 §9.7 ①–⑧**（实测值，**不预写**）：上限表述全覆盖（规范 3 + 代码 6）· i18n 键数（设计值 55 / 40→66）· 件行数（新建 10 / 改造 22 的 `wc -l`）· dogfood 与门禁读数 · 端点出参 ↔ 页面消费点 · 造数残留 · **findings 起始号 = 现存最大号 + 1**（2026-09-28 实测基线 **F221**）· **⑧ F 号总览 + 批指针**（`docs/README.md` §6.1 + `AGENTS.md` ⇒ 首条 finding 登记时同批）
6. **清理**：原型物料（`apps/web/proto.html` + `src/proto/`）**不上仓**（`.gitignore` 无需新增 · 本就未跟踪）· 清 `main.tsx:110` 注释（T8 已办）· 收尾 `git status` 零无关改动
7. **证据归档**：本批证据文件 = `docs/smoke/` 下 **`2026-09-28-m4b7-publish.md`**（**T10 交付** · 九段读数 + 门禁 exit code + 零回归 + 造数清理；证据文件与截图同批落）

**断言 / 门禁**：① 四道既有文档门禁 + **第五道**全绿 ② §9.4 验收 14 项逐条有读数 ③ 证据文件落仓 ④ 提交前 `typecheck + test` 无新失败

---

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```text
bun install --frozen-lockfile → typecheck → lint → format:check →
bun docs/smoke/scripts/doc-audit.ts → doc-claims-check.ts → head-sink-coverage.ts →
table-structure-check.ts → file-ref-closure-check.ts → build → db:migrate → test
```

> ⚠️ **门禁覆盖面硬规则（Q1 实证 · 2026-09-28）**：`table-structure-check` 与 `doc-claims-check` 用 **`git ls-files docs`** 枚举 ⇒ **只扫已跟踪文件**（`doc-audit` / `head-sink` 走工作区遍历）。⇒ **新建件必须先 `git add`（逐文件）再跑门禁**，否则新件空转（实测：暂存前 54 份 → 暂存后 **56 份**；`doc-claims` 112 → **116**）。

逐项 **exit 0** 才算过；顺序**不得调换**（CI 同序）。**每 Task 收尾**先跑本包 `typecheck` + `biome`，**落地前**跑全量。

**测试面硬规则**：
- **服务端 Task（T1 / T2）必带 `bun test`** —— T1 **新建** `http/meta.test.ts`；T2 **扩充** `http/assets.test.ts`；命令 `bun test src/<file>`，收尾 **0 fail**。
- **前端 Task（T3–T8）必带 dogfood 断言** —— 仓内 `apps/web` **无 `test` 脚本、零测试文件**（2026-09-28 实测 = **0**）⇒ **不引单测基建**（本批已决策化：N2 不配 `publish-chain.test.ts`，其各支由 G4/G6 点名覆盖）；前端 Task 最低门 = **dogfood 对应分组 + `typecheck` + `biome`**。
- **脚本 Task（T9）**：dogfood **逐段跑**（`SMOKE_ONLY=Gn`）· **收尾才全量**；每段 `NO JS ERRORS` 为硬门。
- 两类之外，**全部 Task** 仍须过 **12 步**门禁（原 11 + 本批新增第五道）；「无测试」不构成跳过门禁的理由。

**跨平台说明（Win / macOS / Linux）**：本批**无平台特定改动** —— 前端走浏览器 XHR 与隐藏 `<input type=file>`（非拖拽 API，无沙箱/权限差异）；夹具 zip 由 **Node 脚本内联生成**（不依赖宿主 shell 与路径分隔符）；服务端为只读端点 + env 默认值。Windows 侧注意：`bun` 脚本路径分隔符、`db:migrate` 在 Docker 中执行（与既有批同）。

---

## 5. 造数需求（**写库须用户授权**）

| 族 | 资产态 | task 态 | 用途 |
|---|---|---|---|
| mcp | `m4b7-fix-1`（ACTIVE · 有 1 版本） | — | 「选用已有资产」分支 + 版本冲突用例 |
| mcp | `m4b7-fix-2`（ACTIVE · 0 版本空壳） | — | 空壳公开（C6）接受项实证 |
| — | 一条 DRAFT 版本（`m4b7-fix-1@0.0.1`） | — | 版本号冲突 409（跳2） |
| — | — | 一条 `PENDING` review | 「撤回提交」出口（G7） |
| 夹具 | **上传用 zip 由 dogfood 脚本内联生成**（≤10 KiB 最小 skill 包） | — | G3 / G5 起真包（**不落二进制入仓**） |

- 前缀 `m4b7-` 可识别、**收尾可删**（含连带审计行）
- **不造什么**：不造 100 MiB 真包（413 走 env 注入）· 不造 PUBLISHED 版本 · 不造第二个用户账号（登录 5 次/分 ⇒ 分段跑、每段独立登录，超限即重启 api）
- 口令只从 `apps/server/.env` 读（`SMOKE_M4B2_PASSWORD`），**不落仓**
- ⚠️ **写库前须获用户明确授权**（本 plan 不代为执行）

---

## 6. 风险与回退

| # | 风险 | 缓解 / 回退 |
|---|------|------------|
| 1 | **上限默认值变更**影响既有 413 用例 | T2 同批改注释 + 用例标题；既有断言为**注入式**（不依赖默认值）⇒ 正反双证（注入小上限仍吃 413；默认值实测 = `104857600`） |
| 2 | 只读端点**匿名可读**被误当敏感面 | 出参**键集合精确断言**（只含三键）；与 `/api/stats` 同档；`不做什么` 明确写死不提供 `PATCH` / 角色字段 |
| 3 | 一键链**中途失败留残**（资产已建 / 包已传） | **停点不回滚**（D5）是设计选择 ⇒ 右栏精确显示停点 + 两出口（放弃 / 撤回）+ 文案「版本可能已建」（C7） |
| 4 | 「放弃该资产」误露 ⇒ 绕过撤回的删除口 | **严格前提**（本页会话内创建 ∧ **零版本**，D39）+ dogfood **反证**（补一条版本后按钮不出现） |
| 5 | `useMarketQuery` 写 `?q=` 与 `?slug=` 并存 | URL 契约已订正（D46/C17）；`?slug=` 只读、无效即忽略 + 回落 |
| 6 | 上传中切页 / 刷新致半包 | 卸载即 `abort()`（尽力而为，C16/D41）+ 文案明示；刷新后由用户从「我的资产」核对 |
| 7 | **登录限流**（5 次/分）被分段 dogfood 打满 | `SMOKE_ONLY` 分段 + 会话复用；打满则重启 api（内存计数清零）—— 既有坑（F191） |
| 8 | 原型物料误入提交 | 物料本就**未跟踪**（实测 `?? apps/web/proto.html` · `?? src/proto/`）· 且**未被 gitignore** ⇒ **提交纪律（P1）**：本批提交一律**逐文件 `git add <路径>`**，**禁** `git add -A` / `git commit -a`（前科 `3ab0299` 原型路由误入后回滚）；T10 `git status` 复核 + 不新增 `.gitignore` 规则 |
| 9 | 空壳资产**公开可见**（接受项） | 已登记（C6/D9）+ 页内 `assetCreated.hint` 提示 + §5 造数标注可删 |
| 10 | 新门禁 N10 误报（历史 plan 路径） | 白名单显式含 `docs/plans/**`（史实）；若误报 ⇒ 先核再决定「加白名单」或「真漏件」 |
| 11 | 新门禁**装了但 CI 不跑** | **M22** = CI step 接入（与 N10 同批）；T9 断言含「CI 配置已含该 step」（P6）|
| 12 | **门禁对未跟踪件空转**（Q1 实证） | `table-structure-check` / `doc-claims-check` 用 `git ls-files docs` ⇒ 只扫已跟踪文件 ⇒ **新件必须先 `git add` 再跑门禁**（硬规则入 §4）；CI 侧无此问题 |

---

## 7. 落地记录（执行期回填）

| Task | 状态 | 提交 | 断言读数 | findings |
|------|:--:|:--:|------|------|
| T1 | ⬜ | — | — | — |
| T2 | ⬜ | — | — | — |
| T3 | ⬜ | — | — | — |
| T4 | ⬜ | — | — | — |
| T5 | ⬜ | — | — | — |
| T6 | ⬜ | — | — | — |
| T7 | ⬜ | — | — | — |
| T8 | ⬜ | — | — | — |
| T9 | ⬜ | — | — | — |
| T10 | ⬜ | — | — | — |

---

## 8. 自检打分（初稿）

> 本 plan 的 8 维自检（标准 4 + 深度 4）—— **由批 design v0.8（定稿 · 9.50）派生**，Task 可执行性 = 主要判据。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | 9.6 | T1–T10 覆盖 design §1.3 全部 9 项含项（页面 / 编排 / 上传通道 / 两出口 / 三入口 / 服务端 / i18n / 规范回填 / 验证基建）+ 上限表全覆盖（规范 3 + 代码 6）；每 Task 带断言；**同步点 12 处已办 ⇒ 显式不计工** |
| 标准 2 准确性 | 9.6 | 件路径 **32** 条全部按 design §3.1/§3.2 逐条落（`N1–N10` / `M1–M22`，含 **M22 = CI 接入点**）· 数值取 design 实测（上限 `104857600` / `10485760` / `100` · 键 **55** · `errors` **40→66** · 门禁 **12 步**（原 11 + 本批新增第五道）· dogfood **九段** · 夹具 **≤10 KiB**） |
| 标准 3 一致性 | 9.6 | 与 design §3（件表）/ §5（服务端账）/ §6（键表）/ §9（验证与门禁）逐条对齐；Task 切分属 plan 层（design 不复制）|
| 标准 4 可用性 | 9.5 | 每 Task = 件路径 + 步骤 + **可现场复跑的命令与断言**；§4 含测试面硬规则与跨平台说明 |
| 深度 1 追溯性 | 9.7 | 每 Task「依据 =」带 design 章节点 + D/C 号；跨批引用（主 design / `docs/00` / `docs/02/03/04/07`）齐 |
| 深度 2 反证 | 9.3 | 非目标 7 条 + 风险回退 10 条 + 批外登记项显式（U1–U4 / U7 / F13）；被否决方案不入档 |
| 深度 3 边界/风险 | 9.5 | 上限变更 / 匿名端点 / 中途残留 / 删除口 / URL 并存 / 半包 / 限流 / 抹料残留 / 空壳公开 / 新门禁误报 十项均有缓解 |
| 深度 4 维护性 | 9.5 | 服务端能力先行 ⇒ 前端不留待补契约；每 Task 独立可验；回填全用实测值；夹具内联免二进制 |

**初稿均分 = 9.54**（9.6+9.6+9.6+9.5+9.7+9.3+9.5+9.5 = 76.3 ÷ 8）⇒ 达门（≥9）。**首轮换靶复核**见 §8.1。

### 8.1 首轮换靶复核（2026-09-28 · 角轮 = **件路径存在性 + plan↔design 数值对账 + 覆盖性**）

**复核方式**：① 31 件逐条 `existsSync` 分档断言（`N` 必须**不存在** · `M` 必须**存在**）（**R1 读数 · R2 补 M22 后现值 32/32**，见 §8.2）② plan ↔ design 数值对账（逐值肉眼 + 命令实测）③ 覆盖性 = design §3.1/§3.2 件表 ↔ Task 映射 ④ 门禁实跑。

| 维度 | 初稿 | 缺陷态 | 修完 | 依据 |
|------|:--:|:--:|:--:|------|
| 标准1 完整性 | 9.6 | 9.6 | 9.6 | 覆盖性 **31/31** —— `N1–N10` → T1–T9 · `M1–M21` → T1–T10（含 `.env.example` = M12 → T2）逐条有归属；design §1.3 九项含项全覆盖（**R2 后件面 = 32 → 见 §8.2**） |
| 标准2 准确性 | 9.6 | **9.4** | 9.6 | 缺陷①：T1 断言 ② 写死「实测默认 = `104857600` / `10485760` / `100`」，**但 T1 执行在 T2 之前**（当时真值 = `10485760` / `1048576` / `100`）⇒ 时序误导 ⇒ 已改为「**读 env 取值比对，不写死数字**」并标注两阶段基线。其余对账全绿：件路径分档 **31/31** · 上限表达式实测 = `10 * 1024 * 1024` / `1 * 1024 * 1024` / `100`（`config/env.ts:42,47,52`）· 门禁 **12 步** · dogfood **九段** · 夹具 **≤10 KiB** · 基线 **F221** |
| 标准3 一致性 | 9.6 | 9.6 | 9.6 | plan §3 件 ↔ design §3.1/§3.2 逐条对齐；§4 门禁链与 design §9.2 同序同条数；「同步点已办不计工」显式声明 |
| 标准4 可用性 | 9.5 | **9.3** | 9.5 | 缺陷②：T10 把证据文件写成**完整的 `docs/smoke` + 文件名路径** ⇒ 触发 `doc-audit` **规则 B（死路径）**：该文件 **T10 才产出** ⇒ 实跑 `doc-audit` = **217 PASS / 1 FAIL** ⇒ 已按 M4b-6 惯例改为「`docs/smoke/` 下 `2026-09-28-m4b7-publish.md`（T10 交付）」 |
| 深度1 追溯性 | 9.7 | 9.7 | 9.7 | 每 Task「依据 =」带 design 章节点 + D/C 号；**逐 Task 指针齐**（无“裸 Task”）|
| 深度2 反证 | 9.3 | 9.3 | 9.3 | 非目标 7 条 · 风险回退 10 条 · 批外登记项显式（U1–U4 / U7 / F13）|
| 深度3 边界/风险 | 9.5 | 9.5 | 9.5 | 十项风险各有缓解；含「新门禁误报」自反思条 |
| 深度4 维护性 | 9.5 | 9.5 | 9.5 | 服务端先行 · 每 Task 独立可验 · 回填全用实测值 |

**缺陷态 = 9.49**（75.9 ÷ 8）→ 修完 **9.54**（76.3 ÷ 8）⇒ 达门（≥9）。

> **本轮教训（已并入 plan 自检口径）**：① **计划文档里不得出现「尚未产出的 `.md` 完整路径」** —— 引用未来交付物一律写「目录 + 反引号文件名 +（T* 交付）」，否则撞 `doc-audit` 规则 B（死路径）② **跨 Task 的数值断言必须与执行序自洽** —— 若断言依赖后置 Task 的改动，须写成「读源取值比对」而非写死终值。

### 8.2 提交前换靶复核（2026-09-28 · 批末 push 前体检 · 角轮 = **提交集逐行 + 仓规合规 + 门禁接入点**）

> **复核对象变了**：本轮靶子不是「design 自身」，而是**整个提交集**（2 个改动件 + 2 个新件）。

| 维度 | R1 后 | 体检实测 | 修完 | 依据 |
|------|:--:|:--:|:--:|------|
| 标准1 完整性 | 9.6 | **8.8** | 9.6 | **P6（真漏件）**：`.github/workflows/ci.yml` **逐条显式列出**每道文档门禁 step（`:66 doc-audit` · `:71 doc-claims` · `:79 head-sink` · `:86 table-structure`）⇒「第五道门禁接入 CI」必须改这个文件，而它**不在件面** ⇒ 实现者会漏改 ⇒ **门禁装了但 CI 不跑**。已在 design §3.2 补 **M22**（件面 31 → **32**） |
| 标准2 准确性 | 9.6 | 9.6 | 9.6 | 版本对账：主 design 登记行（design **v0.8** · plan **v0.1**）↔ 实件版本 ✅ · `docs/00` M4b-7 行 ✅ · 件面 / 键数 / 门禁步数 / dogfood 段数 三方一致 ✅ |
| 标准3 一致性 | 9.6 | **9.2** | 9.6 | **P2**：`docs/plans/README.md:6` 要求批 plan 头部写「**前置：M4b-<n-1> ✅**」，而**既有 15 份 plan 无一采用该字面标签**（实测 `grep '^> 前置：'` 空）⇒ 已按 README 补齐（头部加 `> **前置：M4b-6 ✅**`，与既有「依赖顺序」行并存） |
| 标准4 可用性 | 9.5 | 9.5 | 9.5 | 仓规合规实测：命名 ✅（`M4b-<n>-<主题>.md`）· Task 均引 design §N ✅ · 粒度 = 文件级 + 断言 ✅ · 引用链单向 plan→design ✅ |
| 深度1 追溯性 | 9.7 | 9.7 | 9.7 | 头部「上游」三行齐（**回补** · 见缺陷④）后指针完整 |
| 深度2 反证 | 9.3 | 9.3 | 9.3 | 非目标 7 + 风险 **11** 条（新增第 11 条「门禁装了但 CI 不跑」） |
| 深度3 边界/风险 | 9.5 | **9.1** | 9.5 | **P1**：`apps/web/proto.html` 与 `apps/web/src/proto/` **未被 gitignore**（`git check-ignore` 两条均空）⇒ `git add -A` / `git commit -a` 会**误收原型物料**（前科 `3ab0299`）⇒ §6 风险 8 补**提交纪律**（逐文件 add · 禁 `-A`） |
| 深度4 维护性 | 9.5 | 9.5 | 9.5 | 服务端先行 · 每 Task 可独立验 · 回填用实测值 |

**体检缺陷态 = 9.18**（73.4 ÷ 8）→ 修完 **9.50**（76.0 ÷ 8）⇒ 达门（≥9）。

> **自曝（缺陷④ · 过程性）**：修 P2 时我替换头部块**误删了 `Status:` 与「上游」三行**（块替换的 old 串含 4 行、new 串只回 3 行）⇒ **当场 `sed -n '1,12p'` 回读发现并回补**（现状 = Date / Updated×2 / 头部口径 / Status / 上游×3 / 前置 + 依赖顺序，齐）。**教训**：块替换必须逐行比对 old↔new 行数；头部这类多行元信息块改完必须回读。
> **核过且确认无问题的项**：代码面**零改动**（`git diff --name-only | grep -v '^docs/' | wc -l` = **0**）· 四道文档门禁 **217 / 112 / 2 / 37 全 PASS（0 FAIL）** · 件路径分档（R2 后复测）**32/32** · 未跟踪物料归属清晰（design / plan / proto×2）。

### 8.3 第二轮提交前复核（git 层 · 2026-09-28 · 角轮 = **diff 逐行 + git 卫生 + 提交信息惯例 + 状态闭环**）

> **结论：0 实质缺陷**（1 微项已修）。本节的 9.50 = **换靶复核结论**（靶子与 §8.2 不同、检出集不同），**非**同分重报。

| 检查 | 结果 |
|------|------|
| git 卫生 | `git diff --check` **空**（无尾随空白 / 无冲突标记 / 无行尾异常）—— 四文件 `grep '<<<<<<<\\|>>>>>>>'` 亦空 |
| diff 逐行（主 design） | `13 增 / 10 删` 逐行核对：头部 v1.76 + 下沉 v1.74 + 口径行 + §2.1 R2 + 拆批表 + 登记表 + §5.1 + §5.2 + §8 预告 + §14 + §15 行 —— **8 处全部意图内，无意外删除、无内容丢失** |
| diff 逐行（`docs/00`） | `7 增 / 3 删` 同法核对 ✅（v1.100 行 + M4b-7 行 + 口径行 + §8 表行 + 下沉 v1.98） |
| 提交信息惯例 | 仓内近 12 笔实测：`docs: …` / `docs(m4b): …`（`71f6b67`）/ `docs+fix(web): …` / `refactor(web): …` ⇒ 建议 `docs(m4b7): …` **同族合规** |
| 状态闭环 | 全仓「待对齐」仅剩 **M4b-8 行**（合法未开工）·「待办」命中全为 UI 状态名 / 图例 / `state.pending`（合法）· 本批 **无遗留「待执行」** |
| 微项（已修） | design §9.6 第 11 行未标 `✅ 已执行`（与同批第 3/10 行不一致）⇒ 已补齐 |

> **收敛判断（第三次·最强）**：两轮提交前体检 = §8.2（3 条真缺陷）→ §8.3（**0 实质缺陷**）。⇒ **自检已进入零收益区**，建议**立即提交**，不再追加自检轮次。

### 8.4 第三轮提交前复核（门禁覆盖面 · 2026-09-28 · 角轮 = **门禁自身扫什么 + 批指针面**）

> ⚠️ 本轮**推翻了 §8.2/§8.3 的一处自报结论**，故如实单列成节。

| 维度 | R2 后 | 体检实测 | 修完 | 依据 |
|------|:--:|:--:|:--:|------|
| 标准1 完整性 | 9.6 | **9.2** | 9.6 | **Q2**：`docs/README.md` §6.1 **F 号导航表**（含「（当前批）」批指针 + M4b-6 段位行）属**批指针面**，M4b-7 定稿后未纳入同步点 ⇒ 已登记 **design §9.7 ⑧**（时点 = 实现期首条 findings 登记时同批；**不列件** —— 先例 M4b-6 design :766） |
| 标准2 准确性 | 9.6 | 9.6 | 9.6 | 读数改用**真值**（见标准4） |
| 标准3 一致性 | 9.6 | **9.2** | 9.6 | Q2 同源 |
| 标准4 可用性 | 9.5 | **8.9** | 9.5 | **Q1（真·高价值）**：`table-structure-check` / `doc-claims-check` 用 **`git ls-files docs`** 枚举 ⇒ **只扫已跟踪文件** ⇒ 两个新件（design / plan）此前**从未入闸**，「门禁全绿」对它们**空转** ⇒ 已 `git add` 取真读数 + 把**硬规则**写进 design §9.2 与 plan §4（新件先暂存再跑门禁） |
| 深度1 追溯性 | 9.7 | 9.7 | 9.7 | — |
| 深度2 反证 | 9.3 | 9.3 | 9.3 | 风险 **11 → 12** 条（新增「门禁对未跟踪件空转」） |
| 深度3 边界/风险 | 9.5 | **9.2** | 9.5 | Q1 的同类面已写明：**CI 无此问题**（`ls-files` 走 checkout 后的已跟踪文件）；**只有本地体检**会踩 |
| 深度4 维护性 | 9.5 | 9.5 | 9.5 | — |

**体检缺陷态 = 9.24**（73.9 ÷ 8）→ 修完 **9.50**（76.0 ÷ 8）⇒ 达门（≥9）。

> **本轮唯一「推翻自己」的发现**：§8.2/§8.3 报的 `table-structure 37/0`、`doc-claims 112/0` 对两个新件**不成立**（空转）。**真读数（暂存后）** = `doc-audit 217/0` · `doc-claims **116**/0` · `head-sink 2/0` · `table-structure **39**/0（**56 份**）` —— 全绿，但**仅在 `git add` 之后成立**。
> **教训（已入 design §9.2 + 本节 §4 硬规则）**：体检脚本自身的枚举口径要先问「**它扫什么**」再信读数；对**新件**尤其如此。

### 8.5 第四轮提交前复核（门禁链 vs 真 CI · 2026-09-28 · 角轮 = **文档声称的链 vs `.github/workflows/ci.yml` 逐条 + 从未跑过的 `format:check`**）

| 维度 | R3 后 | 体检实测 | 修完 | 依据 |
|------|:--:|:--:|:--:|------|
| 标准1 完整性 | 9.6 | 9.6 | 9.6 | 链项与 CI step **逐条同名同序**（11 项现状 = install / typecheck / lint / format:check / doc-audit / doc-claims / head-sink / table-structure / build / db:migrate / test ⇒ `grep -c 'run: '` = **11** ✓）|
| 标准2 准确性 | 9.6 | **9.3** | 9.6 | **R1 缺陷**：plan **6 处**写「门禁 **11 步**」，而**本批交付后 = 12 步**（原 11 + 新增第五道 `file-ref-closure-check`；design §9.2 链本就是 **12 项**）⇒ 6 处全部订正 + design §9.2 标题标注步数 |
| 标准3 一致性 | 9.6 | **9.3** | 9.6 | R1 同源（plan ↔ design 步数不一致）|
| 标准4 可用性 | 9.5 | 9.5 | 9.5 | **新靶实测**：`bun run format:check` **实跑通过** —— biome `includes` = 仅 `**/*.ts` / `**/*.tsx` / `**/*.json` ⇒ **不覆盖 `.md`** ⇒ docs-only 提交在 format 步零风险（此前从未验证）|
| 深度1 追溯性 | 9.7 | 9.7 | 9.7 | — |
| 深度2 反证 | 9.3 | 9.3 | 9.3 | — |
| 深度3 边界/风险 | 9.5 | 9.5 | 9.5 | CI 侧 `fetch-depth: 0` + `--base ${{ github.event.before }}` 已核（head-sink 需提交区间）；本地体检用 `--base HEAD --head WORKTREE` 语义等价 |
| 深度4 维护性 | 9.5 | 9.5 | 9.5 | — |

**体检缺陷态 = 9.46**（75.7 ÷ 8）→ 修完 **9.50**（76.0 ÷ 8）⇒ 达门（≥9）。

> **本轮性质**：R1 属**纯数字一致性**（不改变任何执行动作）；`format:check` 属**验证补盲**（结果安全）。⇒ 与前几轮相比，本轮两个发现都**不影响交付内容**，是典型的「收尾级」问题。

---

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.4 | 2026-09-28 | sunxuewen-rush | **第四轮提交前复核（R1）** —— 角轮 = **文档声称的门禁链 vs 真 `.github/workflows/ci.yml` 逐条 + `format:check` 补盲**，实测 **9.46**。**R1**：plan **6 处**「门禁 11 步」vs 实况（CI 现状 11 · **本批交付后 12**）⇒ 全部订正为 **12 步（原 11 + 本批新增第五道）**，design §9.2 标题同步标注。**验证安全项**：`format:check` 实跑通过（biome `includes` 不含 `.md`）⇒ docs-only 提交零风险 ⇒ §8.5 复评 **9.50** |
| v0.3 | 2026-09-28 | sunxuewen-rush | **第三轮提交前复核（Q1/Q2）** —— 角轮 = **门禁自身扫什么 + 批指针面**，实测 **9.24**。**Q1（推翻前两轮自报读数）**：`table-structure-check` / `doc-claims-check` 用 `git ls-files docs` 枚举 ⇒ 只扫已跟踪文件 ⇒ 新件未入闸；**暂存后真读数** = 217/0 · **116**/0 · 2/0 · **39**/0（**56 份**）⇒ 硬规则入 design §9.2 + plan §4（新件先暂存再跑门禁）+ §6 风险 12。**Q2**：`docs/README.md` §6.1 F 号导航表（「当前批」指针）+ `AGENTS.md` 批指针 ⇒ 登记 design **§9.7 ⑧**（时点 = 实现期首条 findings 登记时同批 · 不列件）。⇒ §8.4 复评 **9.50**（含「推翻自己」的如实留痕） |
| v0.2 | 2026-09-28 | sunxuewen-rush | **提交前换靶复核（P1/P2/P6）** —— 批末 push 前体检（角轮 = 提交集逐行 + 仓规合规 + 门禁接入点）实测 **9.18** 并修 3 条：**P6** 件面漏 **`.github/workflows/ci.yml`**（CI 逐条列出每道门禁 step ⇒ 第五道门禁的接入点）⇒ 连带 design §3.2 补 **M22**（件面 **31 → 32**）/ Scope / §9.7③ · **P1** 原型物料未 gitignore ⇒ §6 风险 8 补**提交纪律**（逐文件 add · 禁 `git add -A`）· **P2** 头部补 README 要求的「**前置：M4b-6 ✅**」标签 ⇒ §8.2 复评 **9.50**（含自曝 1 条：头部块替换误删 Status/上游，已回补）· **同版含二轮（git 层）复核**（§8.3 · 角轮 = diff 逐行 + git 卫生 + 提交信息惯例 + 状态闭环）：**0 实质缺陷** —— `git diff --check` 空 · 主 design `13 增/10 删` + `docs/00` `7 增/3 删` 逐行核对全意图内 · 提交信息 `docs(m4b7):` 同族合规 · 微项 1（design §9.6 第 11 行补 `✅ 已执行`） |
| v0.1 | 2026-09-28 | sunxuewen-rush | **立批** —— 由批 design `2026-09-28-m4b7-publish-design.md`（**定稿 · v0.8 · 8 维 9.50**）派生：**T1–T10** 文件级 Task（件面 **新建 10 / 改造 22 = 32 件**）· §4 门禁 **12 步**（原 11 + 本批新增第五道 `file-ref-closure-check`）+ 测试面硬规则 + 跨平台说明 · §5 造数（2 + 1 + 1 + 内联夹具）· §6 风险 10 条 · §8 自检初稿 **9.54** + §8.1 首轮换靶 · design §9.6 十二处同步点**已于定稿时执行**（不计工） |
