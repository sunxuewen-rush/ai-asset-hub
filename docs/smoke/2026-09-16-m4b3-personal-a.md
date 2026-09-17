# M4b-3 个人面 A 批（我的提交 / 我的令牌）· 验收硬证据（2026-09-16）

> **本文件 = 本批出口件的证据记录**（批 plan T10 断言①-⑥ · 批 design §9.3/§9.4）。所有数字均为**实测产出**
> （命令 / 脚本 / 浏览器），非人工点数。运行环境：macOS · dev 三件在线（`:3000` API · `:5173` web · Edge CDP `:9222`）·
> DB 容器 `24-ai-asset-hub-db-1`（postgres · healthy）。
>
> ⚠️ **口令纪律**：脚本口令一律从 env 读（`SMOKE_M4B2_PASSWORD`），**仓库内零口令**（本文件亦不含值）。
> 本轮因 M4b-2 种子口令不在执行者手上，dogfood 走**「复用现有登录态」分支**（脚本支持两分支；见 §3 口径说明）。

## 1. 五门禁（CI 顺序复现 · 断言③）

| 步骤 | 命令 | 结果 |
|------|------|------|
| 依赖 | `bun install --frozen-lockfile` | ✓ 414 installs / 543 packages（no changes） |
| 类型 | `bun run typecheck` | ✓ exit 0 |
| 静态 | `bun run lint` | ✓ exit 0 |
| 格式 | `bun run format:check` | ✓ **249 files** · No fixes applied |
| 构建 | `bun run build` | ✓ exit 0（FULL TURBO） |
| 迁移 | `bun run db:migrate` | ✓ `migrations applied` · exit 0 |
| 测试 | `CI=true bun run test` | ✓ **517 pass · 1 skip · 0 fail**（518 例 / 48 文件 / 1443 expect / 29.47s） |

> 口径：`DATABASE_URL` 指向 dev 库（单库 `ai_asset_hub`）+ `CI=true`（复现 CI）。测试基线 = M4b-2 收尾（500 pass / 1 skip / 0 fail，501 例）
> ⇒ 本批 **+17 例**（T1/T2/T3 新增断言）· **零新失败** ✓

## 2. 门户零回归 + 链冒烟（断言⑤）

| 项 | 命令 | 结果 |
|----|------|------|
| 门户 dogfood | `SMOKE_SHOT_PREFIX=… bun docs/smoke/scripts/m4a-dogfood.ts` | ✓ **36/36 PASS** + `NO JS ERRORS`（网络层 404 log 2 条 = 404 态断言的预期触发） |
| 链冒烟 | `bun docs/smoke/scripts/m4a-chain-smoke.ts` | ✓ **CHAIN SMOKE PASS** |

> 本批**顺手修了门户 dogfood 的 3 处断言缺陷**（见 §7）⇒ 本轮的 36/36 是「修后」口径。

## 3. 本批 dogfood：G1-G15（断言① · 新建 `docs/smoke/scripts/m4b3-personal-a-dogfood.ts`）

**结果：39 PASS / 0 FAIL / CDP 超时 0 + `NO JS ERRORS`**

**登录口径说明（诚实声明）**：本轮 M4b-2 种子口令不在执行者手上 ⇒ 以**专用账号 `m4b3_dogfood`**
（经**产品注册端点** `/api/auth/sign-up/email` 创建，`role=user`，**零直写库**）为目标账号，
并用 `curl` 登录取**服务端签发的会话 cookie** 注入浏览器；dogfood 走「复用现有登录态」分支。
脚本对两种口径都支持：`SMOKE_M4B2_PASSWORD=… SMOKE_USERNAME=<user>` 即走标准登录路径。

| 组 | 覆盖 | 关键实测 |
|----|------|---------|
| **G1** 空态两种 | 「从未提交」两行文案（标题 + 用途说明）· 筛选无结果 ⇒ 单行且**文案不同** | ✓ 2/2（前者用浏览器侧空响应夹具：当前账号已有造数数据 ⇒ 脚本内已注明） |
| **G2** 有数据列渲染 | 列头 6 列且**顺序正确**（资产/类型/状态/提交时间/拒绝原因/操作）· 三态徽章文案 · PENDING 行 `[查看,撤回]`、其余仅 `[查看]` · `已驳回` = **`rejected` 变体（实底蓝→紫渐变）** | ✓ 5/5 |
| **G3** 撤回链 | 确认框（含后果说明）→ 成功 toast「已撤回」→ 行状态变「已撤回」+ **撤回按钮消失** | ✓ 3/3 |
| **G4** 拒绝原因 | 已驳回行露全文（`title`）+ 显示 `text-overflow: ellipsis` · `max-width: 280px` | ✓ 1/1 |
| **G5** 令牌创建两态 | 表单态（名称 + **5 项 scope 两行排版** + 空名禁用提交）→ 明文态（`aih_` 前缀 · **全长 47 位** · `CopyButton` · 一次性警告 · **✕ 计数 0 = 已隐藏**） | ✓ 2/2 |
| **G6** 只显有效 | 自造「已吊销」探针（真接口签发 + 真接口删除）⇒ 接口 `revokedAt !== null` 的行**零泄漏**、有效行**零缺失**、列表数 == 有效数 · **本页无「状态」列**（与 §4.2 最终设计一致） | ✓ 1/1 |
| **G7** 未登录直访 | `/dashboard/submissions` 与 `/dashboard/tokens` ⇒ 归位 `/login` 且**保 `next`** · 会话复原可行 | ✓ 4/4 |
| **G8** URL 状态化 | 切筛选 ⇒ `?status=REJECTED` · **刷新后 Select 回显保持** · 浏览器后退可回 · 「全部」不带 `status` | ✓ 4/4 |
| **G9** 明文态误关防护 | Esc ⇒ 弹「还没有复制，确定关闭吗？」且**留在明文态** · 「返回」⇒ 确认关闭、明文保留 · **点遮罩 ⇒ 同样弹确认**（真指针 · 运行时自选命中 overlay 的点）· 复制后「我已保存，关闭」⇒ **无确认直接关** · 列表在**关闭后**才刷新（明文态期间未出现新行） | ✓ 5/5 |
| **G10** Key 掩码 | 新令牌 Key 列 = **前 12 + `*****` + 后 4**（与明文前 12/后 4 逐位一致）· 旧令牌（`start`/`metadata` = null）显「—」 | ✓ 2/2 |
| **G11** 编辑 | 弹窗**初值回显**当前名 → 改名 + 保存 ⇒ toast「已保存」+ 列表回显新名 | ✓ 1/1 |
| **G12** 删除 | 确认按钮为 **`bg-primary` 蓝、非 destructive** ⇒ toast「已删除」+ 该行**从列表消失** | ✓ 2/2 |
| **G13** Last Used | 超 3 个月 ⇒ `text-warning`（实测 `oklch(0.666 0.157 58.3)`）· 未使用 ⇒ `text-muted-foreground` | ✓ 1/1 |
| **G14** 查看跳转 | 提交页 [查看] ⇒ URL 变 `/reviews/:taskId`（实测 `/reviews/1370`） | ✓ 1/1 |
| **G15** 类型列 | 第 2 列为「类型」· 每行 `TypeIcon` SVG + 短文案（技能 / MCP）· **双类型覆盖** | ✓ 2/2 |
| 前置 | 登录态可用 · **写通道探针**（对已撤回 task 再撤回 ⇒ 400 `review.not_pending`，无状态变更） | ✓ 2/2 |

**运行命令**（二选一）：
`SMOKE_M4B2_PASSWORD=… SMOKE_USERNAME=<user> bun docs/smoke/scripts/m4b3-personal-a-dogfood.ts`（标准）
`bun docs/smoke/scripts/m4b3-personal-a-dogfood.ts`（复用现有登录态）

**脚本自带护栏**（本轮踩坑沉淀）：① **必须** `Emulation.setDeviceMetricsOverride 1440×1000`（否则对话框内按钮落在视口外，真指针点空 ⇒ 表现为「写请求没反应」）
② `send()` 12s 超时护栏（CDP 偶发无响应不挂死整脚本）③ 逐条进度落盘 `/tmp/m4b3-dogfood-progress.log`（stdout 重定向为块缓冲，否则看不到实时进度）④ 真键盘输入（`Input.dispatchKeyEvent`）驱动受控输入；页内 `setter+input` 在本环境实测不可靠。

## 4. 造数（可重放 · 断言②的前提）

```bash
SMOKE_TARGET_USERNAME=m4b3_dogfood bun --env-file=apps/server/.env docs/smoke/scripts/m4b3-seed-submissions.ts
# M4b-3 造数完成（账号 m4b3_dogfood）：
#   m4b3-seed-skill@1.0.0  version=PENDING_REVIEW  task=PENDING      ⇒ G2/G3
#   m4b3-seed-skill@0.9.0  version=REJECTED        task=REJECTED     ⇒ G4（review_comment 带原因）
#   m4b3-seed-mcp@2.1.0    version=UPLOADED        task=WITHDRAWN    ⇒ G15（双类型）
#   令牌探针：stale 命中 1 行（last_request 置 120 天前）· legacy 命中 1 行（start/metadata 置 null）
```

✓ **幂等可重放**：`ON CONFLICT` upsert，**零 `delete`**，只碰 `m4b3-seed-%` 前缀；重跑即复位（撤回过的 PENDING 回 `PENDING`）
✓ **令牌探针**：两条令牌经**产品接口**创建（脚本不建令牌），脚本只对**已存在**的同名令牌做形态复位（`enabled` 行限定）
✓ 测试账号 `m4b3_dogfood` 经**注册端点**创建（口令为临时值，仅落 `/tmp`，**未入仓、未改任何既有账号口令**）

## 5. 整体审计（断言③/⑥ · 十一维扫描）

| 维度 | 结果 |
|------|------|
| 死导出 | 本批新建件扫描 ⇒ **0 孤儿**：`fetchMyReviews`/`withdrawReview`（Submissions 消费）· `fetchTokens`/`createToken`/`updateToken`/`deleteToken`/`TOKEN_SCOPE_CODES`（Tokens 消费）· `apiPatch`/`apiDelete`（api 层消费）· `StatusPill kind="task"`（**T5 时零消费点 ⇒ T6 起被 Submissions 消费，该项关闭**） |
| i18n 键 | ✓ 本批新增 **80 键**（2026-09-17 订正：`error.load` ×2 删除）（`submissions` **25** · `tokens` **47** · `errors` +7 · `common` +1）· 双语差集 **0** · **孤儿键 0**（`error.load` 处置见 §6 #1）· 裸键泄漏 0（门户 dogfood 覆盖） |
| 批次号残留 | `DEV_BATCH` 表余 **5 项**（`/dashboard/submissions` 与 `/dashboard/tokens` 已随 T6/T7 移除）· 生产产物命中 0 |
| 品牌渐变白名单 | C 层 = **4** 条（本批 +`--gradient-rejected`）· 值只住 `aih-theme.css`（组件用任意值消费 · `apps/web/src` 内 `linear-gradient` 命中 **0**） |
| 越轴值 | 本批零新增硬编码色值/间距（全部 token / 官方件默认）；新增 token 仅 §4.4 白名单内 1 条 |
| 注释腐化 | 本批注释均带 design 行号或实测值；`wc -l` 权威表见 §8 |
| 官方件硬规则 | 手搓处均有理由：`Tokens.tsx` 的「✓/□」指示（官方 `ToggleGroup` 无勾选指示位，按 design §4.2 逐字落地）· 页内 `ScopePicker`（官方无对应复合件）✓ |
| 既有登记项状态 | **T5「StatusPill 零消费点」→ 关闭**（T6 消费 ✓）· **T7「遮罩关闭路径未证」→ 关闭**（G9 真指针补验 ✓）· **`token.not_found` UI 不可达**（登记保留：防御性映射） |
| 零迁移 | `git diff --stat -- apps/server/drizzle packages/` ⇒ **空** ✓ |
| 文档数字 | 行数表（§8）`wc -l` 实测 · 键数 25/47/28/8 逐组实测 · `errors` 基线 21（订正 §6） |
| 环境类问题 | 见 §7：vite 长跑代理 + CDP 退化 ⇒ **跑 dogfood 前重启三件**（已写进脚本头部说明） |

## 6. ⚠ 审计发现 1：孤儿键清理 + 一处数字订正

| # | 发现 | 处置 |
|---|------|------|
| 1 | **`error.load` ×2 零消费**（`submissions`/`tokens` 各 1）—— `ErrorState` 已用 `tErr(error.code)` 本地化 + 兜底含 code（`ErrorState.tsx:7/20`），该键在当前实现下**不被渲染** | ✅ **已处置（2026-09-17 用户拍板 ②：删键）**—— 判据订正：该键与 `errors.network` 是**同一次载入失败的两个说法**（互斥非互补）⇒ 接了只换文案不增信息；载入失败统一走 `ErrorState` 的 `tErr(code)`（`common.retry` 已复用 ✓）。落地 = 4 行删除（zh/en 对称）⇒ 键数实测 **25 / 47 / 28 / 8**；记账 = 批 design **v1.21**（§2.1 Q6 改判）· 批 plan **v0.13** · 主 design **v1.37** · `docs/00` **v1.58** |
| 2 | design §6.3 原文「`errors` **22** → 28 键」的基线**声明错误** | 实测基线 = **21**（`asset.*`×5 + `auth.*`×11 + `oidc.*`×1 + `request.invalid` + `network` + `unknown`）⇒ **已订正**（T8 同轮，design v1.18） |
| 3 | `token.not_found` **从 UI 不可达**（服务端吊销**幂等**：已吊销再删 ⇒ 204 而非 404） | 保留为**防御性映射**（防兜底串外露）；验证改为「服务端探针（不存在 id ⇒ 404 ✓）+ 键对称 ✓ + 映射机制由 `review.not_pending` 端到端证成 ✓」 |

## 7. ⚠ 审计发现 2：门户 dogfood 三处断言缺陷（本批顺手修，非本批引入）

| # | 断言 | 缺陷 | 处置 |
|---|------|------|------|
| 1 | 「资产数 < limit ⇒ 无分页控件」 | **假 PASS**：选择器 `nav[aria-label*="分页"]` 永不匹配（官方 `Pagination` 的 `aria-label` 是英文 `pagination`）⇒ 恒真 | 修选择器 + 补**非空洞条件**（同页真实卡已渲染）；**顺带修真根因**：`CenterPage` 原**无条件**渲染分页（3 资产也出「1 / 1」）⇒ 补 `total > PAGE_SIZE` 条件（与批 design §4.4.1 同口径）⇒ 复跑 **36/36** ✓ |
| 2 | 「中心计数 共 3 个技能」 | **数据依赖**：硬编码 3 ⇒ 造数新增 skill 后误报失败（AGENTS.md：测试只依赖自己造的数据） | 改为**与 `/api/stats` 的技能数对账**（Node 侧闭包 ⇒ 用绝对 URL）⇒ 复跑 **36/36** ✓ |
| 3 | （执行期事故，诚实记录） | 我的一次脚本改写（Python 链式赋值误用）把 `m4a-dogfood.ts` 写坏（只剩 5 行） | **`git checkout` 从已提交版本恢复**（含 #1 修复）后重新施加 #2 ⇒ 无内容丢失；教训：脚本改写后必须 `wc -l`/`bun run` 复核 |

## 8. 权威行数表（`wc -l` 实测 · 本表为本批文件行数的唯一权威源）

| 文件 | 实测行数 |
|------|---------|
| `apps/server/src/review/query.ts` | **169** |
| `apps/server/src/auth/api-keys.ts` | **303** |
| `apps/server/src/http/tokens.ts` | **195** |
| `apps/web/src/pages/Submissions.tsx` | **289** |
| `apps/web/src/pages/Tokens.tsx` | **536** |
| `apps/web/src/components/console/StatusPill.tsx` | **84** |
| `apps/web/src/api/tokens.ts` | **102** |
| `docs/smoke/scripts/m4b3-seed-submissions.ts` | **186** |
| `docs/smoke/scripts/m4b3-personal-a-dogfood.ts` | **885** |
| `docs/smoke/scripts/m4a-dogfood.ts`（本批修 2 处断言） | **509** |
| `docs/smoke/2026-09-16-m4b3-personal-a.md`（本文件） | **198** |
| `docs/designs/2026-09-16-m4b3-submissions-and-tokens-design.md` | **865** |
| `docs/plans/M4b-3-personal-submissions-and-tokens.md` | **457** |

> 前序 Task 落地记录中的行数为**执行期估算** ⇒ **本表为权威源**，前序记录不改写（迭代史实）。
> **后续批次纪律**：行数声明一律 `wc -l` 实测后回填。

## 9. 出口五件状态（批 plan §3 / `docs/00` §7 ②）

| 件 | 状态 | 证据 |
|----|------|------|
| ① 批 design **8 维 ≥9** 定稿 | ✅ | **v1.19 = 9.93**（收口后 **v1.21 = 9.95**）（§10） |
| ② 批 plan **Task 全绿**（T1-T10） | ✅ | T1-T10 逐 Task 落地记录 + 本文件（T10 §7 台账已回填） |
| ③ **五门禁** exit 0 | ✅ | §1 |
| ④ **dogfood / 观感** | ✅ | dogfood **39/39 + NO JS ERRORS** ✅；**观感 = 用户 2026-09-17 人眼复核通过**（6 张真截图；审美深挖归 M4b-7） |
| ⑤ **整体审计** | ✅ | §5-§8（无未决项：孤儿键清除 · 3 处门户断言修复 · 行数权威表 · 登记项状态逐条关闭/保留） |

## 10. 文档-代码对齐重评（converge）

**批 design 重评**：**v1.21 = 9.95**（2026-09-17 收口：T9④/T8③ 结论入档 + Q6 改判留痕 + 键数重测；此前 **v1.19 = 9.93**；见批 design §11 修订记录）
**批 plan 复评**：**v0.13 = 9.89**（2026-09-17 收口：断言 69/69 + 键数订正落点；此前 **v0.11 = 9.87**）
**主 design §2.3 批件登记表**：M4b-3 行回填收尾版本 ✓
**规范同步**：`05 §5`（Token 签发/吊销 = 本人 ✓ M4b-3 引用一致）；`07 §`（本地化键数口径）无变更需求 ✓

## 11. 未证项 / 登记项（诚实清单）

| # | 项 | 状态 |
|---|----|------|
| 1 | `token.not_found` 从 UI 不可达 | **登记保留**（防御性映射；可达性结论已入 design v1.18/§6.3） |
| 2 | 「资产 > 20 的真翻页」（分页控件正向用例） | **未证**：dev 库资产数 < pageSize，无数据可测（登记，M4a 面） |
| 3 | 审美/观感 | **✅ 已过（2026-09-17 用户人眼复核通过）**（深挖归 M4b-7）；本批 6 张真截图已供过目 |
| 4 | ~~本轮 dogfood 走「复用登录态」分支~~ | **✅ 已闭环（2026-09-17）**：用户以口令登录**实机复核通过**（即 §12）；该分支同时**暴露了登录端点缺陷**（§13 #1）|
| 5 | dev 库残留 | 测试账号 `m4b3_dogfood` + 其造数行（3 review task / 3 令牌）· 另 `probe-check@example.invalid`（探测注册端点开放性的空壳账号）⇒ 可一行 SQL 清理（**未清，等用户口令**）；**2026-09-17 用户两次授权改库 1 行**（同一行）：`account.account_id` 由 `user.id` → 登录名 `m4b3_dogfood` —— 第一次供人工验收、**已回滚**；第二次供 §14 #2 的真机 4 路径实测（**本次用完即回滚**，§13 #1 修复后该绕过彻底退役）|
| 6 | `error.load` 孤儿键 ×2 | ✅ **已闭环（2026-09-17）**：用户拍板 **② 删键** ⇒ 4 行删除、键数**实测** 25/47/28/8（zh=en 对称）、全仓引用 **0**（见 §6 #1）|
| 7 | 侧栏**激活语义**（T9④） | ✅ **已定案 + 已实测（2026-09-17 用户拍板 ①）**：`/dashboard` 走**精确匹配**（`SideNav.tsx` `EXACT_MATCH_PATHS` = `/` + `/dashboard`）⇒ 停子页时「工作台」不再常亮。**真机 4 路径实测**（桌面视口 1440×900 · 读官方 `[data-active="true"]`）：`/dashboard` ⇒ **个人工作台** · `/dashboard/assets` ⇒ **我的资产** · `/dashboard/submissions` ⇒ **我的提交** · `/dashboard/tokens` ⇒ **访问令牌** —— **四路径均恰 1 条激活** ✓；**反证（同法实测）**：临时改回旧逻辑（前缀匹配）⇒ `/dashboard/submissions` 读到 **["个人工作台","我的提交"]（2 条 ✗）**、`/dashboard/tokens` ⇒ **["个人工作台","访问令牌"]（2 条 ✗）**、`/dashboard` ⇒ 1 条 ✓（与根因一致：仅子页路径触发双亮）⇒ 正反双证齐全 ✓|
| 8 | `submissions`/`tokens` 两组中「间接消费」的键（`type.*`/`status.*`/`scope.*` 共 13 键） | 经**单点映射**（`TYPE_KEY`/`STATUS_KEY`/`SCOPE_KEY`）消费 ⇒ 字面 grep 不可见，**已人工逐键核对**（G2/G15 实测徽章文案与类型文案正确 ⇒ 非孤儿）✓ |

## 12. 人工验收（2026-09-17 · 用户实机 · 结论 = **验证通过** ✅）

| 项 | 内容 |
|----|------|
| 入口 | `http://localhost:5173/login` · 账号 **`m4b3_dogfood`** · 口令（dev 专用，见用户处，仓库零痕迹）|
| 环境 | 我起 web dev `:5173` + 用户常驻 API `:3000` + dev 库（用户常驻）|
| 覆盖 | 提交页 10 项 · 令牌页 10 项 · 跨面 3 项（侧栏高亮 / 未登录直访 / 门户零回归）· 观感（人眼）|
| 结论 | 用户回「**验证通过**」⇒ 出口件 ④「dogfood/观感」闭合；审美深挖仍归 **M4b-7** |
| 状态回写 | 批 design **v1.20** · 批 plan **v0.12** · 主 design **v1.36** · `docs/00` **v1.57** |

> 口径说明：本次为**人工实机验收**（用户在真浏览器逐条点），与 §3 的 **CDP 自动断言**（dogfood 39/39）互补 —— 自动断言覆盖分支与边界，人工验收覆盖观感与整体可用性。

## 13. 验收期发现（缺陷登记 · 诚实清单）

| # | 项 | 事实 | 归属与处置 |
|---|----|------|-----------|
| 1 | **登录端点「本地账号短路」查错列** | 页面端点 `POST /api/auth/sign-in/aih` 按 `account.provider_id='credential' AND account.account_id = 归一登录名` 查凭据行；而**产品注册口径**（官方 `sign-up/email`，`better-auth/dist/api/routes/sign-up.mjs:245`）写入 `account_id = user.id` ⇒ 注册口径建号的账号**一律 401 `auth.invalid_credentials`**（与「口令错」同码 ⇒ UI 显示「用户名或密码错误」）。实证：同一口令 `/sign-in/username`（官方，按 `user.username` 定位）**200** ↔ `/sign-in/aih` **401** | **归属 M4b-pre `fb7b4a7`**（本批零触碰该文件）· **另立 `fix:` 件**（口径按 `docs/05 §3.1`「`username` 命中保留本地账号」= `user.username`，并兼容 seed 老口径 `account_id`）· 本次仅**一行数据对齐**临时解锁（可回滚）· 该缺陷同时影响路径③「目录不可达回退本地」 |
| 2 | 自查 SQL 用错 join 列（本助手执行失误，自纠） | 首轮核对用 `join asset_version av on av.id = rt.version` —— `review_task.version` 实为**重审计数**，FK 是 `asset_version_id` ⇒ 三条提交行的资产列被错配成 `smoke-skill` | **当场自纠**：改 `rt.asset_version_id` 后实测 = `m4b3-seed-skill@1.0.0`(skill·PENDING) / `@0.9.0`(skill·REJECTED) / `m4b3-seed-mcp@2.1.0`(mcp·WITHDRAWN)；**数据本身无问题**，仅核对口径错 · 未影响任何已入库证据（服务端 API 用正确外键）|

> **未闭环项（2026-09-17 收口后）**：① §13 #1 登录端点缺陷的**修复**（`fix:` 件，用户定「第②条先别做」⇒ 待重新立项）② §11 #8 侧栏高亮的**真机 4 路径实测**（代码已落地，待可登录会话）。**已闭环**：`error.load`（§11 #6 → 删键）· 观感（§11 #3）· 口令登录分支（§11 #4）· 遮罩路径（§11 #2）。

## 14. 批后收口（2026-09-17 · 两条未闭环断言）

| # | 项 | 拍板 | 落地 | 实测 |
|---|----|------|------|------|
| 1 | T8③ `error.load` 孤儿键（§11 #6） | **② 删键**（用户） | `zh.ts`/`en.ts` 各删 2 行（4 行，zh/en 对称）+ Q6 改判记账（批 design v1.21 §2.1） | 键数**脚本实测** `submissions 25 · tokens 47 · errors 28 · common 8`（zh=en 全对称）· 全仓 `error.load` 引用 **0** |
| 2 | T9④ 侧栏激活语义（§11 #8） | **① 工作台精确匹配**（用户） | `SideNav.tsx`：`EXACT_MATCH_PATHS = new Set(['/', '/dashboard'])`；判定 `has(to) ? pathname === to : startsWith(to)` | **真机 4 路径实测 ✅**（桌面视口 1440×900 · 读官方 `[data-active="true"]`）：`/dashboard` ⇒ 个人工作台 · `assets` ⇒ 我的资产 · `submissions` ⇒ 我的提交 · `tokens` ⇒ 访问令牌 —— **均恰 1 条** |

> **实测口径注记（踩坑）**：headless 浏览器默认视口 < 768px 时，官方 `Sidebar` 退化为**移动端 Sheet**（未展开 ⇒ 侧栏条目不入 DOM，`[data-active]` 读不到）⇒ 侧栏类断言**必须先 `Emulation.setDeviceMetricsOverride` 到桌面宽度**（与 `m4a-dogfood.ts` 头部同款护栏）。
> **会话前提**：本次实测需可登录会话 —— 当日由**一行数据对齐**临时解锁（§11 #5），**用完即回滚**。

> 数字口径：本批新增键由 **82 → 80**（`submissions` 26 → 25 · `tokens` 48 → 47）；`errors` +7 与 `common` +1 不变。
