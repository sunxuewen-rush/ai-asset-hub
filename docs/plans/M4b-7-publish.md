# M4b-7 发布批：Web 发布流（新建资产 + 单 zip 上传 + 一键链提审）—— 批计划

> Date: 2026-09-28
> Updated: 2026-09-28（**v1.5：T10 完成（收尾）** —— 规范层回填 M13–M16 · §9.7 ①–⑧ 实测回填 · 证据文件 `docs/smoke/2026-09-28-m4b7-publish.md` 落仓 · 清理复核（proto 不上仓 · 造数零残留）⇒ **本批十 Task 全绿，均分 9.56**）
> Updated: 2026-09-28（**v1.4：T9 完成（造数 + dogfood 九段 + 第五道门禁）** —— **N8 dogfood 九段 47 PASS / 0 FAIL**（全量一次跑：入口/未登录/形态/逐态/一键链真上传/错误面/两出口含真撤回/零回归/G9 中文守卫）· **N9 造数**（3 夹具 · 幂等 + `--clean` 实测）· **N10 第五道门禁 36/0 并已接 CI（M22）**；**收尾清理零残留**（10 资产 + 21 审计行）；9 张截图。⇒ §7.1 补 T9 分 · 均分 **9.57**）
> **头部口径（2026-09-18 起）**：只留最近 1-2 版 · 不复述历史与验收数字；更早版本（**v0.1–v1.3**）见 **§9 修订记录**。
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
| 7 | **i18n** | 新组 `publish`（**55 键**）· `errors` 组 **42 → 68**（20 协议码 + 6 本页可达业务码 · F225 订正）· zh/en 零差集 |
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
5. **回填 §9.7 ①–⑧**（实测值，**不预写**）：上限表述全覆盖（规范 3 + 代码 6）· i18n 键数（**实测 55 / 42→68**）· 件行数（新建 10 / 改造 25 的 `wc -l`）· dogfood 与门禁读数 · 端点出参 ↔ 页面消费点 · 造数残留 · **findings 起始号 = 现存最大号 + 1**（2026-09-28 实测基线 **F221**）· **⑧ F 号总览 + 批指针**（`docs/README.md` §6.1 + `AGENTS.md` ⇒ 首条 finding 登记时同批）
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

> ⚠️ **门禁覆盖面硬规则（Q1 实证 · 2026-09-28）**：`table-structure-check` 与 `doc-claims-check` 用 **`git ls-files docs`** 枚举 ⇒ **只扫已跟踪文件**（`doc-audit` / `head-sink` 走工作区遍历）。⇒ **新建件必须先 `git add`（逐文件）再跑门禁**，否则新件空转（实测：新件入闸后 `doc-claims 112→116` · `table-structure 54→56` 份）。

> ⚠️ **表格/清单编辑三查（本批过程教训 · 同类手误 4 次）**：① **改前先回读该表当前行集合**（禁凭记忆写 `old_string`）② 插入/替换**必须限定段落边界** —— 同一 `| **T<n>** |` 形态在 §2 总览与 §7.1 打分表**两处出现**，全文正则会在错处命中 ③ 改后**回读并断言行序/行数**（升序、无重复行）。已发生：T3/T4 各留重复行 · F228 覆盖 F227 · T6 分数行落入 §2。

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
| T1 | ✅ | 待末批 push | `bun test src/http/meta.test.ts` **4 pass / 0 fail**（匿名 200 · 键集合精确 · 三键↔env · env 单源正反证）· typecheck **4/4** · biome **0** · 文档门禁四道 **217/116/1/39 全 0 FAIL** | **F224**（`app.ts` 插入 ⇒ 门禁锚点 214→217 + **M23**）· docs/README §6.1 F 号总览同步（F222–F224 · 当前批 → M4b-7） |
| T2 | ✅ | 待末批 push | 受影响三文件 `bun test`（assets + zip + meta）**101 pass / 0 fail** · typecheck **4/4** · biome **0** · 默认值实测 `100 * 1024 * 1024` / `10 * 1024 * 1024` / `100` | **F222**（413 用例注入式化）· **F223**（`AHT_*` 注释漂移订正） |
| T3 | ✅ | 待末批 push | `publish` 组 **55 键**（zh/en 集合相等）· `errors` **42 → 68**（+26）· typecheck **4/4** · biome **0 warning** · 文档门禁四道全绿 | **F225**（`errors` 计数口径 40→66 实为 **42→68**）· `\u0024` 规避写法（`${VAR}` 文案触发 `noTemplateCurlyInString` + `noUselessEscapeInString`） |
| T4 | ✅ | 待末批 push | 4 件落位：`client.ts` +**`apiUpload`（XHR）** · `assets.ts` +**`createAsset`** · `versions.ts` +**`uploadVersion`** + 本地 `CreatedVersion` · **新建 `api/meta.ts`**（`fetchPlatformLimits` + 兜底常量 + `toMiB`）· typecheck **4/4** · biome **0** · 契约照服务端实证（multipart `file`/`version`/`changelog` · create → 201 `AssetItem` · upload → 201 `CreatedVersion{DRAFT}`） | **F226**（`doFetch` 的 2xx 非 JSON 体 ⇒ 抛 `SyntaxError` 而非 `ApiError`；对照 `apiUpload` 实现时发现 ⇒ 跨件行为变更，**登记不修**）· 决策：`CreatedVersion`/`PlatformLimits` **随件定义不进 `types.ts`**（保件面 4 件闭合；归并集中式 = 候选）· `toMiB` 不复用 `components/ui/fileTreeNodes.formatBytes`（层级倒挂 + 小数/MB 单位不符上限文案，见 §7.2） |
| T5 | ✅ | 待末批 push | **新建 `lib/publish-chain.ts`**：`deriveNextVersion`（预填真值表 6 行 · C3/D37）+ `runChain`（三跳/停点不回滚/跳1 幂等跳过/进度透传）+ 同件补 **`submitVersion`**（F227）· typecheck **4/4** · biome **0** · 契约照服务端（提交 201 `{taskId,reviewVersion,status}` · body `{}`） | **F227**（设计件面漏跳 3 的前端 submit 封装 ⇒ 同件补齐不开新件）· 决策：hooks **不报 `failed`**（失败态由页面按 `stopAt` 推导 = 单一真源）· 签名照 plan（`deps` 前置可省略） |
| T6 | ✅ | 待末批 push | **官方件落仓 2 只**（CLI `bunx --bun shadcn@latest add progress radio-group`）：`shadcn/progress.tsx` · `shadcn/radio-group.tsx` ⇒ 目录 **36 → 38 件**；import 走 **`radix-ui` 单体包 + `cn`**（与既有 20 件同族）⇒ **零新依赖成立**（`package.json` / `bun.lock` 无 diff）· typecheck **4/4** · biome/format 绿 | **F228**（`shadcn/README.md` + `THIRD-PARTY-NOTICES.md` 账目写 33、实测 36 ⇒ 本批 +2 后订正 **38**，**M24/M25**） |
| T7 | ✅ | 待末批 push | **新建 `pages/Publish.tsx`（782 行）**：三段同页平铺（FieldSet/FieldLegend/FieldGroup）· 二选一 RadioGroup · 官方 Combobox（`useMarketQuery` 300ms 防抖）· 官方 Empty 两处配方（未选文件 / 零资产）· 右栏流程面板（四态圆点 + 进度）· 错误矩阵（字段行内三联动 / issues 列表前 5+展开 / 429 倒计时）· 两出口（放弃该资产 / 撤回提交）· 结果块 + 复位（C15）。**验证**：typecheck **4/4** · lint **4/4** · format **320 files** · **Vite 模块级冒烟 5 件全 HTTP 200**（页/链路/api·meta/两官方件）；G9 预检 = 注释外零中文字面量 ✓ | 自检发现并修 2 条：①「选用已有资产」未选中仍可点（空 slug 必 400）⇒ `canPublish` 加选中门 ②`request.invalid` 未按**停点**归属字段 ⇒ 跳1→`slug` / 跳2→`version`（§4.6 行内规则） · **渲染与交互验证落 T8/T9** |
| T8 | ✅ | 待末批 push | 四处入口：`main.tsx` +路由（并清原型残留注释）· `navItems.tsx` 个人组**第 5 条「发布」**· `TopBar.tsx` 顶栏入口（搜索**左侧** · `<lg` 纯图标）· `AssetAdminCard.tsx` 占位 → `Link ?slug=`。**浏览器真机验证（1440 视口）**：侧栏个人组 = 工作台/我的资产/我的提交/访问令牌/**发布** ✓ · 顶栏在搜索左侧 ✓ · 三段 legend + 右栏三态 ✓ · 官方件挂载（RadioGroup×2 / Combobox / Empty）✓ · 服务端搜索命中 → 选中 ⇒ 上下文行「暂无版本」+ 预填 `1.0.0` ✓ · 无效 `?slug=` ⇒ 轻提示 + 回落「新建」✓ · 卡片链接 `?slug=m4b4-seed-agent` ✓ · **零 JS 错误** · 既有页零回归（/dashboard · /dashboard/tokens） | **F229–F232**（4 条真缺陷 + UX 缺陷，全部由本冒烟抓出并当场修 —— 见 design §9.8）· §7.2 决策⑤ |
| T9 | ✅ | 待末批 push | **N8/N9/N10 三件落地并全量跑绿**：`m4b7-seed-assets.ts`（3 夹具 · 幂等 + `--clean`）· `m4b7-dogfood.ts`（**九段 47 PASS / 0 FAIL**，全量一次跑）· `file-ref-closure-check.ts`（**36/0**，已接 CI = M22）。**收尾清理实测零残留**：10 个 `m4b7-*` 资产（3 夹具 + 7 次 dogfood 自产）+ 21 审计行全回收（含补的 `CLEAN_PREFIX=m4b7-`）。**未覆盖（有意）**：⑥ 的 **413 / 429** 需注入 env / 打满 10 次每分钟限流（不重启 API）⇒ 手工探针，脚本头注明。9 张截图落 `docs/smoke/m4b7-*.png` | F234–F237（+ 实现期三处踩坑：视口 748px / `role=dialog` vs `alertdialog` / 清理前缀缺口） |
| T10 | ✅ | 待末批 push | **规范层回填**（M13–M16）：`docs/02` §4.1 建议 i18n 表 + §3.3 上限 · `docs/03` §4.1 **族错误码表（新增）** + §5 上限 · `docs/04` §5 上限 + i18n 注记 · `docs/07` §3.1 `publish` 组落地注记。**§9.7 ①–⑧ 实测回填**（上限全覆盖 / i18n 55·42→68 / 件行数 **新建 10=1678 行 · 改造 25=6955 行** / dogfood 47/0 / 端点链路 / 造数零残留 / findings 起始号 F222 / 总览 F222–F237）。**证据文件落仓** `docs/smoke/2026-09-28-m4b7-publish.md`（12 步门禁 + 九段 + 行数 + 清理 + 截图 + §9.4 十四项指针） | — |

---

### 7.1 逐 Task 自检打分（标准档 **18 维** · A×0.40 + B×0.30 + C×0.30 · 门 ≥9）

| Task | A 基础 | B 深度 | C 工程 | **总分** | 扣分项（逐条证据） |
|------|:--:|:--:|:--:|:--:|------|
| **T1** | 9.75 | 9.75 | 9.70 | **9.73** | A4 9（只读无业务异常路径；env 解析失败仅走 `onError` 500，未设专门用例）· C3 9（无日志）· C7 9（键集精确断言 ⇒ 加第四键须改断言，有意严格化）· C10 9（无重试语义）· ⚪ `PlatformLimits` 零外部消费者（保留作文档化出参契约） |
| **T2** | 9.75 | 9.75 | 9.50 | **9.68** | A3 9（**改动了既有测试用例** —— 413 用例注入式化，必要且已登记 **F222**）· C3 9（无新增日志）· C6 9（默认值是行为变更 ⇒ 回滚=改回两行，影响已文档化）· **C8 9**（上限放宽改变既有 413 语义 ⇒ 已 F222 处置）· **C9 8**（**规范层 `docs/02/03/04/07` 回填排在 T10，完成前 docs 与真值不一致**）· C10 10 |
| **T3** | 9.50 | 9.25 | 9.50 | **9.43** | A2 9（`\u0024{VAR}` 写法牺牲可读性 ⇒ 已补就地注释）· A4 9（文案表无异常路径）· **B2 8**（插值占位符 `{package}/{file}/{count}/{version}/{seconds}` 与**调用点参数名的一致性无断言**）· B4 9 · C3 9 · **C5 8**（i18n 无单测 —— 设计已决策「web 不引单测件」⇒ 已知限制，覆盖靠 dogfood + `Dict` 类型 + 键集脚本）· C9 9 / C10 9 |
| **T4** | 9.75 | 9.75 | 9.50 | **9.68** | **C5 7**（**零执行验证**：前端无单测件 + dogfood 断言（G5 进度 / G4 abort / 401 分类复用）落在 **T9** ⇒ 本轮只有 typecheck/biome 兜住；T9 兑现后 C5 可回 9）· A1 9（契约照服务端实证，但三个行为路径尚未真跑）· B2 9（无超时——长上传有意不设，已注释）· C3 9 · C10 9 |
| **T5** | 9.75 | 9.25 | 9.40 | **9.50** | **C5 7**（预填四支与三跳路径**均未执行**：web 无单测件（F11 决策）+ dogfood 落 T9 ⇒ 同 T4 口径如实扣）· A1 9（真值表逐行有 C3/D37 依据，但未跑）· **B3 9**（**偏离**：hooks 不报 `failed` —— 失败态由页面按 `stopAt` 推导以免双真源，已在 §7.2 记录）· B2 9（`slug` 未收窄时显式兜底；无超时属 C9 决策）· B4 9 · C10 9 |本）· C9 9 / C10 9 |
| **T6** | 9.63 | 9.50 | 9.50 | **9.55** | A1 9.5（**T8 冒烟已证**：`radio-group` 实际挂载 ✓；`progress` 待 T9 上传流）· A4 9 · B2 9 / B4 9（无本地逻辑）· C3 9 · C5 8（无单测；覆盖靠 T8/T9 真机断言）· C9 9（两处账目已同步）· C10 9 |
| **T7** | 9.63 | 9.50 | 9.20 | **9.46** | **C5 8**（**T8 真机冒烟已兑现渲染 + 交互**：三段/右栏/官方件/搜索选中/预填/深链；剩余 = T9 dogfood 的链与失败面）· A1 9.5（同上）· A4 9（10 条码覆盖）· **B2 8.5**（冒烟后修 4 条：F229–F232）· C2 9 · C3 9 · C4 9（782 行单文件）· C9 9 · C10 9 |
| **T8** | 9.63 | 9.50 | 9.50 | **9.55** | A1 9.5（真机验证四入口 + 页面渲染 + 交互；未验：卡片 `?slug=` 的**端点落地效果**（链接已验）与**未登录**路径（当前会话已登录）⇒ T9 dogfood G2）· A4 9 · **B3 9**（**偏离**：`<lg` 用 `hidden lg:inline` 隐标签替代 D27 字面的 `size=icon` 双按钮 —— §7.2 决策⑤）· B2 9.5 · B4 9.5 · C2 10 · C3 9 · C5 8.5（真机冒烟，但非 dogfood 脚本化）· C7 9 · C9 9 · C10 9.5 |
| **T9** | 9.50 | 9.63 | 9.55 | **9.55** | **A2 9**（三个脚本不在任何 tsconfig 的覆盖内 —— `docs/smoke/scripts/**` 不参与 `typecheck`，仅靠运行时暴露类型错 ⇒ 已知口径）· A1 9.5（九段真机全绿含真上传；413/429 为有意的手工探针）· A4 9.5 · B2 9.5（三处实现期踩坑已修）· C3 9（G7 留有诊断输出行——有意的可观测）· C5 9.5（dogfood 自证）· 其余 9.5/10 |
| **T10** | 9.50 | 9.50 | 9.50 | **9.50** | A1 9.5（回填值全为实测；413/429 明示手工探针）· B2 9.5（规范层 4 件为**增量块**而非逐行加列 —— 见 design §9.8 F239）· C5 9.5（证据文件可复跑自证）· 其余 9.5 |

**逐 Task 均分 = 9.56**（十 Task 合计 95.63 ÷ 10）⇒ 达门 ✅⇒ 达门（≥9）✅

> **残留项（不占 F 号 · 已知且已排期）**：① T2 C9 的规范层回填 = **T10 计划内**（完成前 docs 与真值不一致，属已知窗口）② T3 B2 的占位符一致性 ⇒ 候选（可并入 T9 dogfood 断言或静态检查）③ T3 C5 的 i18n 无单测 = **设计已决策**的已知限制 ④ **T4 C5 的「零执行验证」= T9 dogfood 兑现**（进度/abort/401 复用三条断言落地后，T4 C5 由 7 回 9 —— 届时须在 §7.1 更新该行，不得静默改分）。
> **验证环境教训（实测归因 · 重要）**：裸跑 `bun test` 会把 `apps/server/dist/**/*.test.js`（上一次 `tsc -p` 的**陈旧编译产物**，gitignored）一并捡起 ⇒ 本地曾报 **8 fail + 3 errors**（全为陈旧产物，非本批代码）。**限定源码目录的真读数 = 602 pass / 1 skip / 0 fail**；HEAD 基线 worktree 实测 **598 pass / 0 fail** ⇒ **+4 = T1 新增用例，零回归成立**。**纪律：服务端测试用 `bun test src`**（或先清 `dist`）；本机 `apps/server/dist` 已清（`bun run build` 可重建）· CI 侧无此问题（干净检出无 dist）。

---

### 7.2 T4 决策记录（类型归属与工具复用）

> 记录两条**实现期决策**（非缺陷，属设计未写到时实现者必须定的口径）—— 供收口复核与后续批次参照。

| # | 决策 | 理由 | 反方案与否决原因 |
|---|------|------|------|
| 1 | **`CreatedVersion` / `PlatformLimits` 随件定义**（放 `api/versions.ts` / `api/meta.ts`），**不进 `api/types.ts`** | 批 design §3.2 件面只列 M5/M6/M7 + N3（4 件）⇒ 进 `types.ts` 会**动未列件**，破坏件面闭合（本批已因件面漏件吃过 **F7/P6** 两次） | 反方案 = 归并 `types.ts` 集中式（仓内既有惯例）⇒ 需加 M24 并连带 5 处计数；**候选**（若用户偏好集中式，一行口令即可改） |
| 2 | **`toMiB(bytes)` 不复用** `components/ui/fileTreeNodes.ts` 的 `formatBytes` | ① **层级倒挂**：`api/* → components/*` 是反向依赖（api 层应是最底层）② 语义不符：`formatBytes` 是「12.4 MB」一档小数 + MB 单位，而上限文案要**整数 MiB**（`field.file.hint` 的 `{package}/{file}`） | 反方案 = 把 `formatBytes` 提到共享 utils 再复用 ⇒ 跨件重构（改 3 个既有消费点），非本批 |
| 5 | **顶栏 `<lg` 形态**：单一 `Button size="sm"` + `<span className="hidden lg:inline">` + `aria-label`（**不**用 D27 字面的 `size="icon"` 双按钮） | 双按钮方案要复制一份 `onClick`/`Link` ⇒ 两条可达路径需同步维护；本方案视觉等价（内距差 2px）且 `aria-label` 已兜图标态可达性 | 反方案 = `<Button size="icon" className="lg:hidden">` + `<Button size="sm" className="hidden lg:inline-flex">` 各一份 —— 观感与 D27 字面一致，但**重复两个入口** |
| 4 | **页壳不加 `max-w-5xl` 包裹**（design §4.1「页宽 max-w-5xl」为**原型**实测值） | 兄弟页（`Tokens` / `Submissions` / `AssetDetail`）一律直接返回 `<><PageHeader/>…</>`，宽度由 `AppShell` 的 `main`（`px-[22px]`）承担 —— 再加一层限制会与宿主的 gutters 打架 | 反方案 = 照 §4.1 加 `mx-auto max-w-5xl p-6`（原型 `PublishProto` 的独立壳）⇒ 嵌入后**双重内边距** + 宽度被压窄 |
| 3 | **`onStep` 只报 `active` / `done`**（不报 `failed`）· `runChain(deps, input, hooks)` 签名按 plan | 失败态由页面按返回值的 `stopAt` **一次性推导** —— 单一真源，避免「链与页面各持一份状态」漂移（design §4.8 的「未通过」态只有一个置位点） | 反方案 = 链内回调 `failed` ⇒ 页面需同时消费回调与返回值两条信息，易漂移 |

> 本 plan 的 8 维自检（标准 4 + 深度 4）—— **由批 design v0.8（定稿 · 9.50）派生**，Task 可执行性 = 主要判据。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | 9.6 | T1–T10 覆盖 design §1.3 全部 9 项含项（页面 / 编排 / 上传通道 / 两出口 / 三入口 / 服务端 / i18n / 规范回填 / 验证基建）+ 上限表全覆盖（规范 3 + 代码 6）；每 Task 带断言；**同步点 12 处已办 ⇒ 显式不计工** |
| 标准 2 准确性 | 9.6 | 件路径 **35** 条全部按 design §3.1/§3.2 逐条落（`N1–N10` / `M1–M25`，含 **M22 = CI 接入点** / **M23 = 门禁锚点**）· 数值取 design 实测（上限 `104857600` / `10485760` / `100` · 键 **55** · `errors` **42→68** · 门禁 **12 步**（原 11 + 本批新增第五道）· dogfood **九段** · 夹具 **≤10 KiB**） |
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
| 标准1 完整性 | 9.6 | 9.6 | 9.6 | 覆盖性 **31/31** —— `N1–N10` → T1–T9 · `M1–M21` → T1–T10（含 `.env.example` = M12 → T2）逐条有归属；design §1.3 九项含项全覆盖（**R2 后 32 · T1 补 M23 后 = 33**） |
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
| **v1.5** | 2026-09-28 | sunxuewen-rush | **T10 完成（收尾）** —— 规范层回填 M13–M16 · §9.7 ①–⑧ 实测 · 证据文件落仓 · 清理复核 ⇒ **十 Task 全绿 · 均分 9.56** |
| **v1.4** | 2026-09-28 | sunxuewen-rush | **T9 完成** —— dogfood 九段 **47/0**（全量）· 造数 3 夹具（幂等 + `--clean`）· 第五道门禁 36/0 + 接 CI（M22）· 清理零残留 · 9 截图 ⇒ 均分 **9.57** |
| **v1.3** | 2026-09-28 | sunxuewen-rush | **T9 进行中（造数 + 第五道门禁）** —— N10 门禁 35/0 + 接入 CI（M22）；N9 造数 3 夹具（幂等 + `--clean` 实测）；夹具真机验证预填三支 ✓。⚠️ **N8 dogfood 九段未写 ⇒ T9 未完成**。F234–F237 |
| **v1.2** | 2026-09-28 | sunxuewen-rush | **T8 落地（三入口 + 路由）+ 真机冒烟** —— 四入口落位 + 清原型残留注释；真机验证：侧栏 5 条 / 页面渲染 / 官方件 / 搜索选中 / 预填 / 无效深链提示 / 卡片链接 / **零 JS 错误** / 既有页零回归。**修 4 条真缺陷（F229–F232）**：`q=` 空串 400 · `{count}` 名不符 · **深链失效** · 选中不回显 ⇒ 均分 **9.57** · §7.2 决策⑤ |
| **v1.1** | 2026-09-28 | sunxuewen-rush | **T7 落地（发布页主体）** —— 新建 `pages/Publish.tsx`（782 行）：三段平铺 · RadioGroup 二选一 · 官方 Combobox（300ms 防抖）· Empty ×2 · 右栏流程面板 · 错误矩阵 · 两出口 · 结果块 + 复位。typecheck 4/4 · lint 4/4 · format 320 · Vite 冒烟 5/5 200。自检修 2（选中门 / `request.invalid` 停点归属）· §7.2 决策④ · §7.1 均分 **9.56** |
| **v1.0** | 2026-09-28 | sunxuewen-rush | **T6 落地（官方件落仓）** —— CLI 装 `progress` / `radio-group` ⇒ `shadcn/` 36 → **38 件**；import `radix-ui` + `cn` ⇒ **零新依赖**（package.json/bun.lock 无 diff）；typecheck 4/4 · biome/format 绿。**F228** 两处账目 33 → **38**（M24/M25 ⇒ 件面 33 → 35）· §7.1 均分 **9.59** |
| **v0.9** | 2026-09-28 | sunxuewen-rush | **T5 落地（一键链编排）** —— 新建 `lib/publish-chain.ts`（`deriveNextVersion` 预填真值表 6 行 · `runChain` 三跳/停点不回滚/跳1 幂等跳过/进度透传/abort 同通路）+ 同件补 `submitVersion`（跳 3 调用面）。typecheck **4/4** · biome **0** · format **317 files**。**F227**（design M7 漏 submit 封装 ⇒ 同件补齐）· §7.2 决策③ · §7.1 均分 **9.60** |
| **v0.8** | 2026-09-28 | sunxuewen-rush | **T4 落地（web 数据层）** —— `client.ts` +`apiUpload`（XHR：进度 + `abort()` + 401 四分类 + `{code,message}` 归一 + `Accept-Language`；**不设 content-type**以保 multipart boundary）· `assets.ts` +`createAsset` · `versions.ts` +`uploadVersion` + 随件 `CreatedVersion` · **新建 `api/meta.ts`**（`fetchPlatformLimits` + `PLATFORM_LIMITS_FALLBACK` + `toMiB`）。typecheck **4/4** · biome **0**。行为断言落 T9 ⇒ T4 **C5 = 7**（零执行验证，如实扣）。**F226** 登记（`doFetch` 2xx 非 JSON ⇒ `SyntaxError`，跨件变更不修）· **§7.2** 两条实现期决策 · §7.1 均分 **9.63** |
| **v0.7** | 2026-09-28 | sunxuewen-rush | **T1–T3 逐 Task 自检打分（18 维）** —— 补 §7.1：T1 **9.73** / T2 **9.68** / T3 **9.43** ⇒ 均分 **9.61**；残留项 3（T2 C9 规范层回填 = T10 计划内 · T3 B2 占位符一致性无断言 = 候选 · T3 C5 i18n 无单测 = 设计决策）。**环境实测归因**：裸 `bun test` 捡 `dist/**/*.test.js` 陈旧产物 ⇒ 误报 8 fail/3 errors；`bun test src` = **602/1skip/0 fail**，HEAD 基线 **598/0** ⇒ +4 = T1 新增，**零回归成立**；dist 已清 |
| **v0.6** | 2026-09-28 | sunxuewen-rush | **T3 落地（i18n）** —— `publish` 组 **55 键** + `errors` **+26（42 → 68）** 落 zh/en（键集零差集 · `Dict` 类型强制）· typecheck **4/4** · biome **0 warning** · 文档门禁四道绿。**F225**：设计「40 → 66」只数带点键 ⇒ 实测 **42 → 68**（7 处订正）· `${VAR}` 文案改 `\u0024{VAR}` 写法（规避 `noTemplateCurlyInString` + `noUselessEscapeInString`） |
| **v0.5** | 2026-09-28 | sunxuewen-rush | **T1 + T2 落地** —— T1 `GET /api/meta/limits`（`http/meta.ts` 新建 · `app.ts` 注册 · `meta.test.ts` 4 用例）· T2 上限默认值 `10→100 MiB` / `1→10 MiB` + 代码侧 5 件去写死（M17–M21）+ `.env.example` 三键。实测：`bun test` **101 pass / 0 fail**（assets + zip + meta）· typecheck **4/4** · biome **0**。**F222**：design §5.2 称「既有 413 用例为注入式」**不实**（实测依赖默认 10 MiB）⇒ 改注入式（`resetEnvCache` + 64 KiB）· **F223**：`validate/zip.ts:6-8` 注释键名 `AHT_*` 漂移 ⇒ 随 M17 订正为 `ASSET_*` · **F224**：门禁锚点 `app.ts:214→217` ⇒ **M23** |
| **v0.4** | 2026-09-28 | sunxuewen-rush | **第四轮提交前复核（R1）** —— 角轮 = **文档声称的门禁链 vs 真 `.github/workflows/ci.yml` 逐条 + `format:check` 补盲**，实测 **9.46**。**R1**：plan **6 处**「门禁 11 步」vs 实况（CI 现状 11 · **本批交付后 12**）⇒ 全部订正为 **12 步（原 11 + 本批新增第五道）**，design §9.2 标题同步标注。**验证安全项**：`format:check` 实跑通过（biome `includes` 不含 `.md`）⇒ docs-only 提交零风险 ⇒ §8.5 复评 **9.50** |
| v0.3 | 2026-09-28 | sunxuewen-rush | **第三轮提交前复核（Q1/Q2）** —— 角轮 = **门禁自身扫什么 + 批指针面**，实测 **9.24**。**Q1（推翻前两轮自报读数）**：`table-structure-check` / `doc-claims-check` 用 `git ls-files docs` 枚举 ⇒ 只扫已跟踪文件 ⇒ 新件未入闸；**暂存后真读数** = 217/0 · **116**/0 · 2/0 · **39**/0（**56 份**）⇒ 硬规则入 design §9.2 + plan §4（新件先暂存再跑门禁）+ §6 风险 12。**Q2**：`docs/README.md` §6.1 F 号导航表（「当前批」指针）+ `AGENTS.md` 批指针 ⇒ 登记 design **§9.7 ⑧**（时点 = 实现期首条 findings 登记时同批 · 不列件）。⇒ §8.4 复评 **9.50**（含「推翻自己」的如实留痕） |
| v0.2 | 2026-09-28 | sunxuewen-rush | **提交前换靶复核（P1/P2/P6）** —— 批末 push 前体检（角轮 = 提交集逐行 + 仓规合规 + 门禁接入点）实测 **9.18** 并修 3 条：**P6** 件面漏 **`.github/workflows/ci.yml`**（CI 逐条列出每道门禁 step ⇒ 第五道门禁的接入点）⇒ 连带 design §3.2 补 **M22**（件面 **31 → 32**）/ Scope / §9.7③ · **P1** 原型物料未 gitignore ⇒ §6 风险 8 补**提交纪律**（逐文件 add · 禁 `git add -A`）· **P2** 头部补 README 要求的「**前置：M4b-6 ✅**」标签 ⇒ §8.2 复评 **9.50**（含自曝 1 条：头部块替换误删 Status/上游，已回补）· **同版含二轮（git 层）复核**（§8.3 · 角轮 = diff 逐行 + git 卫生 + 提交信息惯例 + 状态闭环）：**0 实质缺陷** —— `git diff --check` 空 · 主 design `13 增/10 删` + `docs/00` `7 增/3 删` 逐行核对全意图内 · 提交信息 `docs(m4b7):` 同族合规 · 微项 1（design §9.6 第 11 行补 `✅ 已执行`） |
| v0.1 | 2026-09-28 | sunxuewen-rush | **立批** —— 由批 design `2026-09-28-m4b7-publish-design.md`（**定稿 · v0.8 · 8 维 9.50**）派生：**T1–T10** 文件级 Task（件面 **新建 10 / 改造 25 = 35 件**）· §4 门禁 **12 步**（原 11 + 本批新增第五道 `file-ref-closure-check`）+ 测试面硬规则 + 跨平台说明 · §5 造数（2 + 1 + 1 + 内联夹具）· §6 风险 10 条 · §8 自检初稿 **9.54** + §8.1 首轮换靶 · design §9.6 十二处同步点**已于定稿时执行**（不计工） |
