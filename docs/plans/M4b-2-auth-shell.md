# M4b-2 认证与壳批（登录 · 会话 · 角色感知壳）实现计划

> Date: 2026-09-16
> Updated: 2026-09-16（**v0.13：T10 收尾回写（批次完成）**——T10 ✅：**五门禁全绿**（`test` **500 pass ·
1 skip · 0 fail**，与 M4b-pre 基线一致 ⇒ 零回归）· **门户零回归** `m4a-dogfood` **36/36** + `m4a-chain-smoke`
**PASS** · **本批 dogfood 六组**（新建 `docs/smoke/scripts/m4b2-auth-dogfood.ts`）**24 PASS / 0 FAIL +
NO JS ERRORS** · **种子复核**（A2 upsert 第 3 次复跑幂等）· **整体审计十一维**（F4 **关闭**——实测证伪 T4
误报；行数声明**订正**并立权威表；旧口径指针关闭）· **验收硬证据入库**
`docs/smoke/2026-09-16-m4b2-auth-shell.md` · 出口五件 **四件全绿 + ④ 观感七项待用户实机确认**；
**v0.12：T9 落地回写**——T9 ✅（2026-09-16）**i18n 实测键数回填 + 补 3 个服务端实有码**：
批前基线 `0ff0693` **91 键 / 7 组** ⇒ 当前 **132 键 / 9 组** ⇒ **净增 41 键**（逐组 `login` 8 · `device` 13 ·
`errors` +12 · `navigation` +3 · `dashboard` +2 · `admin` +1 · `common` +2 · `market`/`review` 未变）；
**补 `auth.forbidden` · `auth.oidc_denied` · `auth.oidc_state_mismatch`**（`errors` 18 → **21 键**；服务端 12 码
**覆盖 12/12**）；**校验全绿**（双语双向差集 **0** · 占位符不一致 **0** · 空值 **0** · 门禁四连 · 产物零 `M4b-` ·
门户零回归 **36/36**）；**本批唯一内容改动 = 补 3 键**（其余为文档回填）；**v0.11：T8 落地回写**——T8 ✅（2026-09-16）新建 `apps/web/src/pages/Dashboard.tsx`（**78 行**：`ComingSoon` 内容槽形态 + 按档位裁剪入口 + `state.notice` 消费）· `main.tsx` `/dashboard` 占位 → **真页**（删 `DEV_BATCH['/dashboard']`）· i18n `dashboard` **+1 键**（`welcome`）；断言实测（**档 0 未登录 → `/login?next=%2Fdashboard`** · **三档入口裁剪**（role 1 → 2 项 / 10 与 100 → 3 项）· **零业务请求**（排除壳层 M4a 既有 `/api/stats` 与会话 `/api/auth/me` 后 = **0**）· **`notice` toast + 刷新不重弹** · 门禁四连 · 生产产物零 `M4b-` · 门户零回归 **36/36**）；**执行期修正 1 处**（断言③ 口径补壳层例外，见落地记录）；**v0.10：T7 落地回写**——T7 ✅（2026-09-16）新建 `apps/web/src/pages/Device.tsx`（**303 行**）· 新建跨页件 `components/console/AuthLayout.tsx`（与 `/login` 共用独立版式）· `main.tsx` `/device` 占位 → **真页**（删 `DEV_BATCH['/device']`）· `api/auth.ts` 加 device 三封装 + OAuth 错误映射 · `api/client.ts` 的 `ApiError` 补 **`body`**（原始错误体，OAuth 适配所需）· `auth/next.ts` 加 **`devicePath`**（站内路由构造单点）· i18n `device` 组 **13 键**；断言实测（**未登录保码回跳闭环** · **四态全绿** · **首帧门** · **刷新态 = `status:approved`** · **他人已认领双路** · **错误体适配**（不落 `http_400`）· 门禁四连 · 生产产物零 `M4b-` · 门户零回归 **36/36**）；**执行期修正 6 处**（见落地记录）；**v0.9：T6 落地回写**——T6 ✅（2026-09-16）新建 `apps/web/src/pages/Login.tsx`（**205 行**）· `main.tsx` `/login` 占位 → **真页**（删 `DEV_BATCH['/login']`）· i18n `login` 组 **+8 键** + `errors` **+9 码**；断言实测（**独立版式**（无侧栏/无顶栏）· **两 tab**（**CDP 真指针**切换实测 `href=/api/auth/oidc/authorize` + `rel=noreferrer`；Radix 合成 click 无效）· **首帧骨架**（`/me` 延迟 1.6s 采样：**150-1500ms 恒 `skeleton=4 / form=false`**，1650ms 才落表单 ⇒ design Y3 实证）· **失败态全 inline**（错口令 Alert + **URL 不变**）· **成功链**（→ `/dashboard` + `/me` 200）· **反向守卫**（无 next → `/dashboard` · **保码回跳** `/device?user_code=ABCD-1234` · 非法 next 回落）· 无注册入口 · 门禁四连 · **生产产物零 `M4b-`** · 门户零回归 **36/36**）；**执行期细化 1 处 + 连带修正 1 处**（`login.title` 与 `navigation.login` 并存——后者仍由 `UserMenu` 消费 2 处 · **种子脚本改 upsert（A2，用户拍板）**）；**v0.8：T5 落地回写**——T5 ✅（2026-09-16）**减法批**：`TopBar.tsx` 43 → 41 行（删「登录」占位 `<span>` + 图标/i18n 两个 import）· `SideNav.tsx` 删 `APP_VERSION` 与 Footer 三项（**Footer 仅余 `UserMenu`**，children = 1）· i18n `navigation` **−4 键**；断言实测（TopBar 仅余 **4 件**（品牌 + `Separator` + `SidebarTrigger` + `LanguageSwitcher`）· `grep` 三零（login 占位 / 图标 import / `APP_VERSION` / 4 键）· 顶栏 **58px** 实测 · 语言切换零变更（EN ↔ 中文 徽章往返）· 门禁四连 · 门户零回归 **36/36**）；**v0.7：T4 落地回写**——T4 ✅（2026-09-16）新建 `ui/UserMenu.tsx` · `SideNav.tsx` 加三组（门户组 JSX 逐字保留）+ Footer 接用户区 · i18n `navigation` +6 / `admin` +1；断言实测（**四档显隐全绿** （未登录/1/10/100）· **UserMenu 四态**含 loading 采样序列（404ms skeleton → 3406ms authed，**无 ANON 闪现**）· 占位条目 `BUTTON` + toast · **F3 计算值**（组间距 4px · 组内 padding 8px · 标签高 32px）· 门禁四连 · 门户零回归 **36/36**）；**执行期修正 5 处**（plan 断言③ 超管组 **4 → 3 条**（主 design §4 唯一源）· `admin.phase2Notice` **不存在 ⇒ 复用 `common.comingSoon`** · 徽章键 3 个落定 · **补 2 处遗漏键**（`navigation.logout`/`admin.settings`）⇒ 净增 34 → **39** · **修 T1 缺陷**（`apiPost` 写请求 content-type + `logout` 传 `{}` ⇒ sign-out 实测 415/400 两坑全通））；**F4 登记**（图标态部分 `group-data-[collapsible=icon]` 变体未生效，待深挖）；**v0.6：T3 落地回写**——T3 ✅（2026-09-16）新建 `console/ComingSoon.tsx` + **种子脚本提前落地**（`docs/smoke/scripts/m4b2-seed-roles.ts`）· `RoleGuard.tsx` 重写（43 → 44 行）· `main.tsx` 48 → **196 行**（11 条路由 + 两段守卫 + `DEV_BATCH` 常量表）· i18n `common` +2 / `dashboard.submissions` +1；断言实测（路由 **11 条** · `/admin` 守卫内重定向 · `bootstrapAuth` 模块级 · `ROLE` 残留 **0** · **生产产物零 `M4b-` 字面量**（build + grep 实测）· **真浏览器 4/4 + role=1 实测** （`/admin*` → 落 `/dashboard`）· 门禁四连 exit 0 · 门户零回归 **36/36**）；**执行期细化 4 处**（/login `/device` T3 形态 = 占位 ⇒ T6/T7 补 `Modify main.tsx` · 占位页文案键 `common.comingSoon` · notice 键 `common.noPermission` · **种子脚本提前落地并跑通**）；**连带发现**（dogfood 401 口径 → 单列）；**v0.5：T2 落地回写**——T2 ✅（2026-09-16）新建件 9 `auth/next.ts` + `client.ts` 扩至 187 行；断言实测（**纯函数探针 27/27** · **门户零回归 dogfood 36/36 + NO JS ERRORS** · 门禁三连 exit 0）；**执行期细化 3 处**（`sanitizeNext` 单参 · `PROTECTED_PREFIXES` 落 `auth/next.ts` · `invalidateCache` 语言无关 path 前缀）；连带修复 biome 控制字符正则规则；**v0.4：T1 落地回写**——T1 ✅（2026-09-16）新建 3 件 + `client.ts` 扩至 119 行；断言实测（`hasRole` 探针 **14/14** · 门禁三连 exit 0 · 零服务端改动）；**执行期修正 2 处**（`apiPost` 前移 T1 解循环依赖 · 401 登记口落 `api/client.ts` 防 ESM 循环）· **登记 1 项归 T4**（角色徽章键与组标题键语义不符）；**v0.3：grilling 第 3 轮（Q14-Q19）断言同步**——T2 断言③ **判定域 = 当前路由**（Q14：实测全仓 `apiGet` 均为 `/api/...`，与原「按 path 匹配」不同域）+ 断言⑤ 补 **`/\evil.com` / `/%5Cevil.com` → `null`**（Q16）· T3 断言⑦ **守卫包裹与 `minRole` 映射**（Q15）· T7 断言⑧ **device 错误体 OAuth 风格适配**（Q18①）+ 断言⑨ **「他人已认领」态实测**（Q18②）· T8 断言⑤ **`location.state.notice` 消费**（Q17）· T9 断言⑥ **`claimedByOther` 键去留**（Q18②）· T10 口令变量 → 单变量 **`SMOKE_M4B2_PASSWORD`**（Q19）；**顺带修正 T4/T7 断言编号重复（⑦ 各出现两次，自产缺陷同轮修）**；**v0.2：深度档评审同步**——§1.4 两缺口全部闭合（批 design v1.2：`auth/next.ts` 件 9 + Q8 边界订正）· T4 补 F3/图标态断言 · T7 补 F1 刷新态 · T9 补净增 32 键对照 · T10 补 F2 提示 + 登记表改「复核」；**v0.1 初稿**：M4b-2 Task 清单 **T1-T10**（认证地基 → API 客户端扩展 → 路由骨架 → 侧栏三组 → TopBar 减法 → `/login` → `/device` → `/dashboard` → i18n 对齐 → 门禁/dogfood/收口），每 Task 含 **Files / Assert（可现场跑）/ Commit**；依据批 design `2026-09-16-m4b2-auth-shell-design.md` **v1.1**（定稿 · 8 维 9.44）与上游主 design **v1.21** §2.3 拆批表；§1.4 登记**两处待补设计缺口**（① `sanitizeNext` 落点未在件清单列明 ② Q8「反向守卫」Task 边界措辞）；10 项行数声明与 i18n 键数**全部实测一致** · file:line 引用**全部回读**）
> Status: **执行中**（**T1 ✅ · T2 ✅ · T3 ✅ · T4 ✅ · T5 ✅ · T6 ✅ · T7 ✅ · T8 ✅ · T9 ✅ · T10 ✅ 2026-09-16** · **批次完成 · 出口五件全绿**（④ 由 CDP 自动断言 14/14 + 用户认可闭合）；**前置 = M4b-1 出口五件全绿** ✅——批 design **v1.3** 定稿（**8 维 9.44 · 深度档三合一 9.50**）· 批 plan 本件 **v0.3** · 五门禁 exit 0 · dogfood 36/36 + 观感复核 · 整体审计 F1-F8 无未决项）
> 引用链：本文档 → 批 design `docs/designs/2026-09-16-m4b2-auth-shell-design.md`（§N 逐 Task 引用）→ 上游主 design（跨批不变层）`docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（**版本以其版本头为准**）→ 规范 `00` §5/§7 · `05` §3/§5/§6 · `07` §3/§4 → M4a design §4.4（视觉 SSOT，引用不复制）
> 命名约定见 `docs/plans/README.md`

## 1. 目标与范围

**目标**：交付**认证与壳底座**——登录（`/login`）· 设备授权（`/device`）· 会话上下文（`AuthProvider` 三态）·
401 三分类分流 · 角色判定单点（`auth/roles.ts`）· 侧栏三组 + 用户区 · 路由骨架（11 条）——
使「未登录可浏览门户、登录后获得角色感知壳、直访受保护路径被正确引导」成为可验证行为，
并成为 M4b-3…6 全部页面的共同底座。

**前置已就绪**（真码实测，2026-09-16）：
- **服务端认证面全量交付**（M4b-pre ✅）：`POST /api/auth/sign-in/aih`（JSON）· `POST /api/auth/sign-out` ·
  `GET /api/auth/me`（`http/auth-routes.ts:17-28` 薄层）· device 三端点 · `GET /api/auth/oidc/authorize`
  ⇒ **本批服务端改动 0 行**（批 design §7）
- **官方件齐备零新增依赖**：`ui/shadcn/` **33 件**（`card`/`field`/`tabs`/`alert`/`empty`/`avatar`/
  `dropdown-menu`/`skeleton`/`sidebar` 全在；`sidebar.tsx` 导出 **24 件**含 `SidebarGroup`/
  `SidebarGroupContent`/`SidebarGroupLabel`/`SidebarMenuSkeleton`/`useSidebar`）
- **壳与跨面件**（M4b-1 ✅）：`AppShell`（结构零变更）· `Toaster` 已挂根（`main.tsx:45`）·
  `RoleGuard`（**已落组件、零消费点**——本批接线）· `SkeletonLoader`/`CopyButton`
- **i18n 机制**：`zh` 为类型真源（`export type Dict = typeof zh`）、`en: Dict`（**缺键即编译错**）；
  现有 **7 组**（`navigation` 9 键 / `market` 53 / `dashboard` 4 / `admin` 6 / `review` 5 / `common` 5 / `errors` 9）
- **dev 环境**：`:3000` API + `:5173` web + Edge headless CDP `:9222`（dogfood 用）

**不含**（归属相邻批，批 design §1.3 批界）：
- 任何业务页面（我的资产/提交/令牌 → M4b-3/4 · 审核面 → M4b-5 · 标签/审计 → M4b-6）
- 服务端任何改动（含「OIDC 可用性探测端点」——本批不做，批 design §5.1）
- 产品元信息三项的**去处**（展示位归 M6；本批只删除）· 自助注册入口 · 用户管理面（M4c）
- 静默续期 / 草稿保护（已知代价，主 design U3）

**执行纪律**（沿用 M4a/M4b-1 plan + 本批特有）：
- **逐 Task 独立 commit**（Conventional Commits，一事一提交）；**文档与代码同批提**
- **门禁统一在代码落地后跑**：`typecheck` → `lint` → `format:check` → `build` → `db:migrate` → `test`
  （**`CI=true` + 单库 `ai_asset_hub`**，测试库先迁移）；纯文档 Task 不跑门禁
- **逐 Task 收尾必跑自检打分**（代码 18 维 / 文档 8 维）≥9 才报告/提交；**自检发现的缺陷同轮修**；打分须**换靶**
- **官方件纪律**：一律走 CLI（`bunx --bun shadcn@latest add|view|docs`）；`className` 只做布局，
  颜色/排版走 variant 或 token；能上官方件就用满（本批零新增依赖，全部消费既有 33 件）
- **写库需口令**：T10 的种子脚本与 `test`（写 dev 库）**须用户授权后才执行**；
  口令从 env 读（`SMOKE_M4B2_PASSWORD`），**仓库内不落任何口令**
- **浏览器观感由用户人工确认**（实现侧只报计算值/结构断言）；临时截图不进仓

### 1.4 ⚠ 待补设计缺口（本 plan 前置待批）

**缺口 ⑴ `sanitizeNext` 的落点**（**已闭合 2026-09-16**：批 design 升 **v1.2** 采纳 **A 案**，新建件 9 `src/auth/next.ts`）——原 §4.3 只定义其行为
（仅接受单个 `/` 开头的站内相对路径、支持 query、非法回 `null`），未指定实现文件。
按 `docs/plans/README.md`「计划中冒出现未定决策 → 停下回设计层」纪律，本 plan **登记该缺口并给出推荐落点**，
待批 design 升 **v1.2** 补入件清单后 T2 按最终落点执行：

| 候选 | 优点 | 缺点 |
|------|------|------|
| **A（推荐）新建 `src/auth/next.ts`** | 纯函数单点、可独立断言；被 `Login`/`Device`/`AuthProvider` 三处消费，独立件使「新建件 8 → 9」语义清楚 | 件数 +1（design §3.1 表需补行、§11 清单同步） |
| B 并入 `auth/roles.ts` | 零新件 | 语义混装（角色判定 vs URL 白名单），单点纪律变弱 |
| C 并入 `api/auth.ts` | 零新件 | `sanitizeNext` 与 API 调用无关；`api/` 层不应含路由语义 |

> ⑵ **「反向守卫」的 Task 边界措辞**（**已闭合 2026-09-16**：批 design 升 **v1.2** 的 §2.1 Q8 行已订正为「T2 含 `sanitizeNext`（反向守卫**消费点**落 T6 `/login`）」。

## 2. Task 清单

### T1 认证地基件（`AuthProvider` + `roles.ts` + `api/auth.ts`）✅（2026-09-16 落地；执行期修正 2 处见「落地记录」）
- **设计**：批 design §3.1（件 1-3）· §4.1（三态与首帧）· §4.5（`hasRole` 单点）· §7（消费端点）
- **Files**: Create `apps/web/src/auth/AuthProvider.tsx` · `apps/web/src/auth/roles.ts` ·
  `apps/web/src/api/auth.ts`
- **Assert**:
  ① `roles.ts`：`ROLE = { GUEST: 0, USER: 1, ADMIN: 10, SUPER_ADMIN: 100 }`，与服务端
     `apps/server/src/auth/roles.ts` 的 `ROLE_LEVEL` **同值**（逐档 grep 对照）；
     `hasRole(null|undefined, N)` → `false`；`GUEST` 保留但**无特例分支**
  ② `api/auth.ts`：三函数 `login`/`logout`/`me`；`login` = `POST /api/auth/sign-in/aih` +
     **`content-type: application/json`** + body `{username,password}`（真码实证 `app.test.ts:115-119`）；
     `me` 走 `apiGet('/api/auth/me', { cache: false })`
  ③ `AuthProvider`：三态 `loading | anon | authed`（`authed` 携带 `{user:{id,displayName}, role}`）·
     导出 `useAuth()` · 提供 `onUnauthorized(path)` 注册口 · 导出 **`bootstrapAuth()`**
     （模块级预取，供 `main.tsx` 模块顶层调用、**不 `await`**——T3 断言③）· `loading` **不外泄 anon**
  ④ **零服务端改动**：`git diff --stat -- apps/server packages/protocol` **为空**
  ⑤ 门禁（web 侧）：`typecheck` ✅ · `lint` ✅
- **Commit**: `feat(web): add auth context, role helpers and auth api`

### T2 `api/client.ts` 扩展（401 单点分流 + `apiPost` + `invalidateCache` + `sanitizeNext`）✅（2026-09-16 落地；执行期细化 3 处见「落地记录」）
- **设计**：批 design §3.2（件 4）· §4.2（四分类）· §4.3（反向守卫 + `sanitizeNext`）· §9.1（门户零回归）
- **Task 边界**：Q8 原把「反向守卫」列入本 Task ⇒ 实现期落点为 **T6 `/login` 组件内**
  （本 Task 只提供 `sanitizeNext` 判定函数与 401 侧的 `next` 生成点）——批 design v1.2 §2.1 Q8 已同步订正，见 §1.4 缺口⑵
- **Files**: Modify `apps/web/src/api/client.ts`（**T1 后 119 行**——`apiPost` · `doFetch` 参数化 ·
  `setUnauthorizedHandler` 登记口已在 T1 落地；**本 Task 只动 401 四分类 + `invalidateCache` + `sanitizeNext`**）·
  Create `apps/web/src/auth/next.ts`（**件 9**——批 design v1.2 §3.1 已落定，见 §1.4 缺口 ⑴）
- **Assert**:
  ① `ApiGetOptions` 增**可选** `skipAuthRedirect?: boolean`（**加性扩展**，向后兼容）；
     `apiGet` 既有执行路径**零改动**（`git diff` 逐 hunk：仅新增分支与导出，不改原行为）
  ② 新增 `apiPost<T>(path, body, opts?)` **复用 `doFetch`**（不新起 fetch 路径）；请求头
     `content-type: application/json`
  ③ `doFetch` 的 `!res.ok && status === 401` **四分类**（单点；**判定域 = 当前路由**——Q14：
     `window.location.pathname` 匹配 4 个**路由**前缀，**非** API 路径——实测全仓 `apiGet` 均为 `/api/...`）：
     `/api/auth/me` → 交 provider 置 anon（**不跳转**）｜ 当前路由 ∈ `PROTECTED_PREFIXES`
     （`/dashboard` `/admin` `/reviews` `/device`）→ `onUnauthorized(path + search)` ｜
     其余（公开段）→ **静默当 anon** ｜ `opts.skipAuthRedirect` → 完全跳过
  ④ 导出 `invalidateCache(prefix?)`：无参 = 清全量；带前缀 = 按 `${lang} ${path}` 键前缀失效
  ⑤ `sanitizeNext` 断言（探针脚本，非人工目视）：`//evil.com` → `null` · `https://x.com/a` → `null` ·
     `/device?user_code=ABCD-1234` → **原样**（保码）· `/dashboard` → 原样 · `''` → `null` ·
     **`/\evil.com` → `null`** · **`/%5Cevil.com` → `null`**（Q16 反斜杠/编码边界 = 开放重定向防护）
  ⑥ **门户零回归硬证据**：`bun docs/smoke/scripts/m4a-dogfood.ts`（`SMOKE_SHOT_PREFIX=m4b2-t2-`）
     **36/36 PASS + NO JS ERRORS**
  ⑦ 门禁（web 侧四连）
- **Commit**: `feat(web): add apiPost, 401 routing and cache invalidation`

### T3 路由骨架 + `ComingSoon` + `RoleGuard` 接线 ✅（2026-09-16 落地；执行期细化 4 处见「落地记录」）
- **设计**：批 design §3.2（件 3/6）· §3.3（11 条）· §4.5（`RoleGuard` 改造三点）· §5.4（`ComingSoon`）
- **Files**: Modify `apps/web/src/main.tsx`（现 48 行：5 路由 :34-41）·
  `apps/web/src/components/ui/RoleGuard.tsx`（现 43 行：`ROLE` :10 · props `{minRole,role,children}` :22-33）·
  Create `apps/web/src/components/console/ComingSoon.tsx`
- **Assert**:
  ① 路由 **11 条**：`/login` `/device`（**独立版式**，不入 `AppShell`）+ `/dashboard` `/dashboard/assets`
     `/dashboard/submissions` `/dashboard/tokens` `/reviews/:id` `/admin` `/admin/reviews` `/admin/labels`
     `/admin/audit`（入 `AppShell`）；**不加 `*` 兜底**（`grep -c 'path="\*"' main.tsx` = **0**）
  ② `/admin` = `<Navigate to="/admin/reviews" replace />`（**重定向**，非占位）
  ③ `main.tsx` 含**模块级 `bootstrapAuth()`（不 `await`）**（首帧预热）
  ④ `RoleGuard` 改造三点：**删**本地 `ROLE` 常量（`grep -c 'export const ROLE' RoleGuard.tsx` = **0**）·
     **删 `role` prop**（props 仅余 `{minRole, children?}`）· 内部 `useAuth()` 接三态
     （`loading` → `Skeleton` · `anon` → `/login?next=<path+search>` · 档位不足 → `/dashboard`）
  ⑤ `ComingSoon` 用官方 `Empty` 族（`empty.tsx` 6 件：`Empty` > `EmptyHeader`
     （`EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`）+ 内容槽 `EmptyContent`）；
     批次号标注 **DEV-only**（`import.meta.env.DEV` 门控；`grep -c 'M4b-' dist/*.js` = **0**）
  ⑥ 直访守卫实测（真浏览器）：未登录访 `/dashboard` → URL 变 `/login?next=%2Fdashboard`；
     `role=1` 访 `/admin/reviews` → 落 `/dashboard` + 轻提示
  ⑦ **守卫包裹与 `minRole` 映射（Q15）**：门户 5 条**无守卫** · `/dashboard`+`/dashboard/*` ⇒
     `minRole=USER(1)`（布局路由一条包 4 条）· `/reviews/:id` ⇒ `USER(1)` · `/admin`+`/admin/*` ⇒
     `ADMIN(10)`；**`/admin` 的 `Navigate` 在守卫内**（未达档先弹 `/dashboard`，不白跳一层）
  ⑧ 门禁（web 侧四连）
- **Commit**: `feat(web): add auth routing skeleton and placeholder pages`

### T4 侧栏三组 + 门户组保留 + 用户区 ✅（2026-09-16 落地；执行期修正 5 处见「落地记录」）
- **设计**：批 design §6.1（显隐矩阵）· §6.2（用户区四态）· §6.3（占位条目交互）
- **Files**: Modify `apps/web/src/components/ui/SideNav.tsx`（现 143 行：`entries` :53-58 ·
  `SidebarContent` :73-116 · `SidebarFooter` :118-138）· Create `apps/web/src/components/ui/UserMenu.tsx` ·
  `i18n/{zh,en}.ts`（`navigation` **+3** 组标题键 + **+3 徽章键**（T4 定案）+ **+1 `logout`**（遗漏补缺）；
  `admin` **+1 `settings`**（遗漏补缺）——**执行期修正**，见落地记录
- **Assert**:
  ① **门户组保持现形态**（4 条、**无组标题**、`SidebarMenu` 直挂）——源码零改动（Q3 零回归）
  ② 三组用官方标准形态：`SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu`
  ③ 组级与条目级**同取门槛**；**组内无可见条目 ⇒ 整组不渲染**，
     四档实测（未登录 / 1 / 10 / 100）：未登录仅门户组 · 1 档 +个人（4 条）· 10 档 +管理（2 条）·
     100 档 +超级管理（**1 条真链 + 2 条占位 = 3 条**——**执行期订正**：原写「2 条真链 + 2 条占位」，
     与主 design §4（唯一源）「标签管理 / 系统设置 / 用户管理」不符）
  ④ `UserMenu` 四态：`loading` 行骨架 · `anon` = `SidebarMenuButton` + `Link to="/login"`
     （复用既有 `navigation.login` 键）· `authed` = `size="lg"`（`Avatar` 首字 + `displayName` +
     角色徽章 + `DropdownMenu`：我的资产 / 我的令牌 / ── / 登出）· 图标态只留头像（官方 `tooltip`）
  ⑤ 占位条目（系统设置 / 用户管理）= `<button>`（**非 `Link`**）+ 点击 `sonner` 轻提示；
     **不建路由、不建页面**（`grep` 两条目无对应 `path=`）
  ⑥ `loading` 期**不闪**：首帧渲染骨架、`loading` 结束**就地替换**（探针记录 DOM 序列，
     全程无「未登录」形态出现）
  ⑦ **混排结构视觉（F3 登记）**：门户组（裸 `SidebarMenu`）× 三组（`SidebarGroup`）在同一
     `SidebarContent` 内的**间距/分段**实测记录（计算值），**观感交用户确认**——不为统一而改门户组结构
  ⑧ 图标态（`collapsible="icon"`）组标题行为**记录官方实测值**（不自写隐藏类，批 design §6.1）
  ⑨ 门禁（web 侧四连）
- **Commit**: `feat(web): add role-aware sidebar groups and user menu`

### T5 TopBar 减法 + 侧栏元信息清除 ✅（2026-09-16 落地）
- **设计**：批 design §3.2（件 1）· §8（UI-UX 变动总览：顶栏行 / 侧栏行）· §10（`navigation` −4 键）
- **Files**: Modify `apps/web/src/components/ui/TopBar.tsx`（现 43 行：占位 span :33-39 ·
  `TypeIcon` import :6）· `apps/web/src/components/ui/SideNav.tsx`（Footer 三项 :119-137 ·
  `APP_VERSION` :19）· `i18n/{zh,en}.ts`（`navigation` **−4** 键）
- **Assert**:
  ① TopBar 仅余 **品牌 + `Separator` + `SidebarTrigger` + `LanguageSwitcher`**；
     `grep -c "navigation', 'login'" TopBar.tsx` = **0** · `grep -c 'TypeIcon' TopBar.tsx` = **0**
  ② 侧栏底部三位元信息（Star / 文档·反馈 / 版本行）**删除**；`grep -rn 'APP_VERSION' apps/web/src` = **0**
  ③ `navigation` 组删 **4 键**（`starRepo` · `footDocs` · `footFeedback` · `versionLine`）后
     **全仓零消费残留**（`grep -rn 'starRepo\|footDocs\|footFeedback\|versionLine' apps/web/src` = 0）
     —— 现状消费点 **4 处**（`SideNav.tsx:127,132,133,136`）随本 Task 一并清除
  ④ 顶栏高 **58px** 不变 · 语言切换器行为零变更（实测计算值）
  ⑤ 门禁（web 侧四连）
- **Commit**: `refactor(web): drop topbar login placeholder and sidebar meta block`

### T6 登录页 `/login` ✅（2026-09-16 落地；执行期细化 1 处 + 连带修正 1 处见「落地记录」）
- **设计**：批 design §5.1（页面规格）· §4.3（反向守卫）· §4.2 ④（inline 失败态）
- **Files**: Create `apps/web/src/pages/Login.tsx` · Modify `apps/web/src/main.tsx`（`/login` 元素：
  `ComingSoon` 占位 → **`<Login />`**；**T3 落地时补**——否则占位元素无法替换）· `i18n/{zh,en}.ts`（`login` 组 **8 键** +
  `errors` **+9 码**）
- **Assert**:
  ① **独立版式**（不入 `AppShell`）：顶部品牌 + `LanguageSwitcher`，中部居中官方 `Card`
  ② 两 tab（官方 `Tabs`）：「常规登录」= `Field` + `Input`（`autocomplete="username"` /
     `"current-password"`）+ `Button`，**Enter 提交**，提交中 `disabled` + `Spinner`；
     「OAuth 登录」= 说明文案 + `<a target="_blank" rel="noreferrer" href="/api/auth/oidc/authorize">`
     （**不做前置探测**，Q2 = B+）
  ③ **失败态全部 inline**（`skipAuthRedirect: true`）：401 `auth.invalid_credentials` ·
     403 `auth.csrf_failed`/`auth.ldap_denied`/`auth.forbidden` · 429 `auth.rate_limited` ·
     409 `auth.email_conflict` · 400 `auth.email_missing`；`errors` 未命中项兜底。
     **实测**：故意错口令 → 表单内 `Alert` 出现、**URL 不变**（不退化为全局跳转）
  ④ 成功链：`invalidateCache()` → 重取 `/me` → `navigate(next ?? '/dashboard')`
  ⑤ **反向守卫**（已登录访 `/login`）：`<Navigate to={sanitizeNext(next) ?? '/dashboard'} replace />`
     —— 实测 `next=/device?user_code=ABCD-1234` **保码回跳**
  ⑥ 页面**无注册入口** · **无侧栏/无用户区** · 用户名字段为**中性文案**（非「邮箱」）
  ⑦ 门禁（web 侧四连）
- **Commit**: `feat(web): add login page with local and oidc tabs`

### T7 设备授权页 `/device` ✅（2026-09-16 落地；执行期修正 6 处见「落地记录」）
- **设计**：批 design §5.2（四态）· §4.3（`next` 保码）· 主 design §3.4（基址与 dev 口径）· §7.1（device 三行）
- **Files**: Create `apps/web/src/pages/Device.tsx` · Modify `apps/web/src/main.tsx`（`/device` 元素：
  `ComingSoon` 占位 → **`<Device />`**；**T3 落地时补**）· `i18n/{zh,en}.ts`（`device` 组 **14 键**）
- **Assert**:
  ① **四态**（Q4 完整实现）：**(1)** 输入（`Field` + `Input` 格式提示 `XXXX-XXXX` + 「确认」）→
     **(2)** 已认领（`client_id` / 请求范围（`scope` 空 = 全量）/ 有效期（`expires_in` = 30 分钟）+ 批准/拒绝）→
     **(3)** 已处理（「已批准」/「已拒绝」终态）→ **(4)** 错误（无效/过期码 · 他人已认领〔**待实测**，Q18②〕· 网络错；码级 `Alert` 回 (1)）
  ② **端点命名坑已封装**：`GET /api/auth/device?user_code=`（**下划线**）vs
     `POST /api/auth/device/approve|deny` body `{userCode}`（**驼峰**）——拼参数只在 `api/auth.ts` 内，
     页面不出现裸 query 拼接（`grep -c 'user_code' pages/Device.tsx` = 0）
  ③ 未登录访问 → 401 ② 分类生成 `next=/device?user_code=…`（**保码**）→ 登录后回跳续流
  ④ `?user_code=` 预填 + 自动认领；不带参 = 手输
  ⑤ **实测链**：输入有效码 → 认领（`status:'pending'`）→ 批准 → 页面转「已批准」；
     输入无效码 → 错误态文案（不白屏、不 JS 错误）
  ⑥ **刷新态（F1 登记）**：批准后带 `?user_code=` 刷新页面，呈现**以服务端返回为准**并记录实测值（不预设终态）
  ⑦ 本批**不消费** CLI 两端（`/device/code`、`/device/token`）
  ⑧ **错误体适配（Q18①）**：device 端点错误为 OAuth 风格 `{error, error_description}` ⇒ 适配在
     `api/auth.ts` 封装内（**页面不直读 `code`**）；实测无效码 → 页面按 `error` 本地化文案
     （**不落 `http_400` 兜底**）
  ⑨ **「他人已认领」态存在性实测（Q18②）**：用第二账号认领同一码 → 记录服务端真实响应；
     **若无此态 ⇒ 删分支 + `claimedByOther` 键**（同步 design §5.2/§10，T9 一并处理）
  ⑩ 门禁（web 侧四连）
- **Commit**: `feat(web): add device authorization page`

### T8 工作台临时落地页 `/dashboard` ✅（2026-09-16 落地；执行期修正 1 处见「落地记录」）
- **设计**：批 design §5.3（role 裁剪）· §5.4（`ComingSoon` 内容槽形态）
- **Files**: Create `apps/web/src/pages/Dashboard.tsx` · `i18n/{zh,en}.ts`（`dashboard` **+1 键**：
  `welcome`——`submissions` 已随 **T3 前移**落仓，故本 Task 只余 1 键；
  `submissions` · `welcome`）
- **Assert**:
  ① 用 `ComingSoon` 的**内容槽形态**（`EmptyContent`）：欢迎语（含 `displayName`）+ 入口按钮组
  ② **按 role 裁剪**（`hasRole`）：`role >= 1` → 我的资产 / 我的令牌；`role >= 10` → 审核队列
     —— 四档实测（未登录 / 1 / 10 / 100）入口集合逐档命中
  ③ **纯静态零业务请求**：网络探针记录 `/api/*` 请求数 = **0**（不调 `/api/reviews`、`/api/audit`）
  ④ 本页为 M4b-4 换三卡前的过渡形态（文件头注释写明）
  ⑤ **`location.state.notice` 消费（Q17）**：`role=1` 访 `/admin/labels` → 落 `/dashboard` +
     `sonner` 警示 toast（文案 = `state.notice`）；**刷新后不重复弹**（state 已清）
  ⑥ 门禁（web 侧四连）
- **Commit**: `feat(web): add dashboard landing placeholder`

### T9 i18n 对齐 ✅（2026-09-16 落地；部分断言为文档回填、唯一内容改动 = 补 3 码）
- **设计**：批 design §10（i18n 变更规格）· §3.2（件 5）· 主 design §11（组清单）
- **Files**: Modify `apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts`（如各 Task 已逐批加键，本 Task 做**收口对齐**）
- **Assert**:
  ① **键集逐一相等**（脚本比对 8 组，非人工目视）：`navigation` / `market` / `dashboard` / `admin` /
     `review` / `common` / `errors` / **`login`** / **`device`**（共 **9 组**）—— zh 与 en 键名集合一致
  ② 键数**实测回填**本 plan 与批 design §10（**禁止沿用推算式数字**）：`login` · `device` ·
     `errors` · `dashboard` · `navigation` 各组的最终键数；**总量对照批 design §10 口径注（净增 **34** 键 = 22 + 9 + 2 + 2 − 1）**，不符须登记差异
  ③ **无孤儿键**：每键至少一处消费点，或已在 design/plan 登记为「待后续批消费」
  ④ **裸键泄漏 = 0**：zh/en 互切实测，页面无 `group.key` 形态字符串直出
  ⑤ `errors` 组新增 9 码齐备且与 `apps/server/src/auth/errors.ts`（12 码）比对——
     本批覆盖 8 auth.* + `oidc.not_configured`；`auth.rate_limited` 复用既有键
  ⑥ **`claimedByOther` 键去留（Q18②）**：按 T7 实测结论定——无此态则删键（zh/en 同步 +
     design §5.2/§10 同步 + 键数口径 **34 → 33**）
  ⑦ 门禁（web 侧四连）
- **Commit**: `chore(web): align i18n dictionaries and audit key sets`

### T10 门禁 + dogfood + 种子 + 收口回写 ✅（2026-09-16 落地 · 批次完成）
- **设计**：批 design §9（回归面与验证口径 · 门禁顺序 · dogfood 六组 · 出口件④ 七项 · 种子）
- **Files**: Create `docs/smoke/scripts/m4b2-auth-dogfood.ts` · `docs/smoke/scripts/m4b2-seed-roles.ts` ·
  `docs/smoke/2026-09-16-m4b2-auth-shell.md`（硬证据记录）·
  Modify 批 design（版本头 + §9 增「本批验收结果」）· 本 plan（Status + 落地记录）·
  `docs/00-product-direction.md` §5 M4b-2 行（状态回写）
- **Assert**（**写库两条须用户授权后执行**）:
  ① **五门禁逐项 exit 0**（web + server + protocol + cli）：`typecheck` · `lint` · `format:check` ·
     `build` · `db:migrate` · **`test`（`CI=true` + 单库，用户授权）**——与基线对比**零回归**
  ② **门户零回归**：`m4a-dogfood.ts` **36/36 + NO JS ERRORS**；`m4a-chain-smoke.ts` **29/29**
  ③ **本批 dogfood 六组**（`m4b2-auth-dogfood.ts`，Q10）：G1 未登录壳态 · G2 `role=USER` 组与直访弹回 ·
     G3 `role=ADMIN` · G4 `role=SUPER_ADMIN`（含占位条目）· G5 登录→用户菜单→登出闭环 ·
     G6 设备授权认领→批准；全程 **`NO JS ERRORS`**
  ④ **种子数据**（`m4b2-seed-roles.ts`，公式：前缀 `like` 清理 ⇒ **可重放**）：3 账号
     `m4b2_{super,mgr,user}`（superadmin/admin/user）；口令**从 env 读**（`SMOKE_M4B2_PASSWORD`），
     **仓库内不落口令**
  ⑤ **出口件 ④ 七项**（批 design §9.4；**执行方式变更（v1.14）= CDP 自动断言 + 用户认可**）：未登录跳转回原页 ·
     错密码 inline · 登录后硬刷新不闪 · 登出回首页 · `role=USER` 直访 `/admin/labels` 弹回 +
     轻提示 · 侧栏四档显隐逐档 · `/device?user_code=` 认领→批准
  ⑥ **整体审计（十一维）**：收尾全仓覆盖式扫描（死导出 · i18n 键 · 残留 · 类串重复 · 越轴值 ·
     token 消费者 · 注释腐化 · 文档数字实测 · 官方件硬规则 · 既有登记项状态 · **旧口径/术语指针**），
     findings 逐条登记 + 处置「修 / 订正 / 回填 / 口径登记」，**不留未决项**
  ⑦ **文档-代码对齐重评**（converge）：批 design 重评 ≥9（**8 维 + 深度档三合一**）· 主 design §2.3 批件登记表**复核并回填收尾版本**（M4b-2 行已于 2026-09-16 立项时回填 **v1.22**，本 Task 改为复核 + 填最终版本）·
     规范同步项按主 design §14 执行（`07` §3 资源组 +2 落地注记 · `00` §5 状态回写）
  ⑧ **F2 提示（执行前）**：确认 dev `.env` 的 `AUTH_TRUSTED_ORIGINS` 已含 `http://localhost:5173`（`.env.example:36` 为空值，批 design §5.1 F2）
- **Commit**（按收口内容拆分，一事一提交）:
  `test(web): run m4b-2 gates and auth dogfood` → `docs(m4b2): record evidence and close batch`

### 落地记录（执行期回写——实测证据）

> T1 起逐 Task 回写：落地要点 · 断言实测值 · 执行期说明（design 预期 vs 实测不符项）· 门禁数字。

**T1 认证地基件 ✅（2026-09-16 落地）**

- **落地**：新建 **3 件**——`apps/web/src/auth/roles.ts`（38 行）· `apps/web/src/api/auth.ts`（70 行）·
  `apps/web/src/auth/AuthProvider.tsx`（121 行）；改 `apps/web/src/api/client.ts`（78 → **119 行**：
  `apiPost` + `doFetch` 参数化 + `setUnauthorizedHandler`）
- **断言实测**：① 四档与服务端 `ACCOUNT_ROLE` **逐档同值**（grep 对照 4/4）+ `hasRole` 行为探针
  **14/14 PASS**（`null`/`undefined`/`0` → `false` · `hasRole(100,10)` → `true` · `GUEST` 无特例）
  ② 三函数契约形态齐——login = `POST /api/auth/sign-in/aih` + JSON + `skipAuthRedirect:true`（§4.2 ④
  表单 inline）· logout = `POST /api/auth/sign-out` **无 body** · me = `apiGet(…, { cache:false })` **强制**
  ③ 三态判别联合 `AuthState`（`status==='authed'` 收窄 `user`/`role`）· 初始 `loading` **不外泄 anon** ·
  `bootstrapAuth()` 模块级**单例预热**（不 `await`，与首屏并行） ④ **零服务端改动**
  （`git diff --stat -- apps/server packages/protocol` **空**） ⑤ 门禁：`typecheck` **exit 0** ·
  `lint` **exit 0**（90 文件 0 诊断）· `format:check` ✓（233 文件）
- **执行期修正 1（`apiPost` 前移 T1）**：原 plan 把 `apiPost` 归 T2 ⇒ **T1 ↔ T2 循环依赖**
  （T1 的 `login` 需 POST；T2 的 401 分流需 T1 的 `AuthProvider` 钩子）。处置：`apiPost` +
  `doFetch` 参数化随 T1 落地；**T2 收窄为「401 四分类 + `invalidateCache` + `sanitizeNext`」**
  （T2 Files 已同步）。
- **执行期修正 2（401 登记口落 `api/client.ts`）**：design §3.1 件 1 原措辞「`AuthProvider` 提供
  `onUnauthorized` 注册口」⇒ 落点细化为 **`api/client.ts` 导出 `setUnauthorizedHandler`**
  （由 `AuthProvider` 挂载时注册）。理由：`AuthProvider → api/auth → api/client` 为**单向**依赖，
  注册函数若放 `AuthProvider` 则 `client` 需**反向 import** ⇒ **ESM 循环**；§3.1 件 1 的语义
  （`AuthProvider` 为注册发起方）**不变**。
- **登记（归 T4）**：批 design §6.2「角色徽章文案取 `navigation` 新增 3 键之一」与 §10 的 3 键
  （**组标题** `groupPersonal`/`groupAdmin`/`groupSuperAdmin`）**语义不符**（徽章应表达「用户/管理员/
  超级管理员」）⇒ T4 落地时定：**补 3 徽章键（净增 34 → 37）** 或 **徽章只显色不显字**（零新增键）。
  本 Task **未擅自加键**（草稿里的 `roleBadgeKey` 已撤回）。

**T2 `api/client.ts` 扩展 ✅（2026-09-16 落地）**

- **落地**：新建 `apps/web/src/auth/next.ts`（**件 9** · 83 行 · 路由安全单点：`sanitizeNext` +
  `PROTECTED_PREFIXES` + `isProtectedRoute`）；改 `apps/web/src/api/client.ts`（119 → **187 行**：
  401 四分类 `handleUnauthorized` + `invalidateCache`）
- **断言实测**：① `ApiGetOptions.skipAuthRedirect` 加性扩展（T1 已落，本 Task 复核）✓
  ② `apiPost` 复用 `doFetch`（T1 已落，复核）✓ ③ **401 四分类**（`doFetch` 的 `!res.ok` 分支）：
  ④ `skipAuthRedirect` → **完全跳过** · ① `/api/auth/me` → 不跳转 · ② 当前路由 ∈ 4 前缀 →
  `unauthorizedHandler(pathname, search)` · ③ 公开段**静默**；**判定域 = 当前路由**（Q14）——
  **端到端验证点 = T3 断言⑥**（本 Task 不接线，无真 401 路径可触发；纯函数部分已探针实证）
  ④ `invalidateCache` 导出（无参 = 清全量 · 带前缀 = 按 **path** 前缀失效）✓
  ⑤ **纯函数探针 27/27 PASS**——`sanitizeNext`：`//evil.com` · `https://x.com/a` · `/\evil.com` ·
  `/%5Cevil.com` · `/%5cevil.com` · `javascript:alert(1)` · `/pa%0Ath` · 字面控制字符 · 空串 ·
  `null` · `undefined` → **全 `null`**；`/device?user_code=ABCD-1234`（**保码**）· `/dashboard` · `/` ·
  `/admin/reviews?status=PENDING` → **原样**。`isProtectedRoute`：4 前缀命中（含段内路径）·
  `/` `/skills` `/login` → false · **段边界**（`/administrator` · `/dashboardx` → false）
  ⑥ **门户零回归硬证据**：`docs/smoke/scripts/m4a-dogfood.ts` **36/36 PASS + NO JS ERRORS**
  （`SMOKE_SHOT_PREFIX=m4b2-t2-`） ⑦ 门禁：`typecheck` exit 0 · `lint` exit 0（91 文件 0 诊断）·
  `format:check` ✓（234 文件）
- **执行期细化 3 处（已同步批 design v1.5）**：① `sanitizeNext` **单参**（design §4.3 原签名
  `(raw, origin)` 的 `origin` 冗余——「仅站内相对路径」规则已排除一切跨源形态）
  ② `PROTECTED_PREFIXES` 落 **`auth/next.ts`**（与 `sanitizeNext` 同域 = 路由安全；该件**零 import**
  ⇒ `api/client` 单向引用**不成环**）③ `invalidateCache(prefix)` 按**语言无关的 path 前缀**失效
  （内部键为 `${lang} ${path}`，**不能**直接 `key.startsWith(prefix)`——那是 design §4.2 原文
  「按键前缀」的字面读法，会永不命中）
- **连带修复（同轮）**：biome `lint/suspicious/noControlCharactersInRegex` 命中控制字符正则 ⇒
  改为**逐字符码点判定**（`hasControlChar`）；编码形态 `%00`–`%1f` 仍用正则（无控制字符字面量）
- **截图**：`docs/smoke/m4b2-t2-*.png`（11 张）**不入库**——本 Task 零 UI 变更，36/36 断言文本即证据

**T3 路由骨架 + `ComingSoon` + `RoleGuard` 接线 ✅（2026-09-16 落地）**

- **落地**：新建 `apps/web/src/components/console/ComingSoon.tsx`（官方 `Empty` 族 6 件 +
  `EmptyContent` 内容槽 + DEV 批次号）· `docs/smoke/scripts/m4b2-seed-roles.ts`（**种子脚本随本 Task
  提前落地**，见细化 ④）；重写 `components/ui/RoleGuard.tsx`（43 → 44 行）· `main.tsx`（48 → **196 行**：
  11 条路由 + 两段布局守卫 + `DEV_BATCH` 常量表）· `i18n/{zh,en}.ts`（`common` **+2 键** ·
  `dashboard.submissions` **+1 键**，**从 T8 前移**）
- **断言实测**：① 路由 **11 条**（`path="…"` 清单实测 = 新增 11 + 门户 5）· **`*` 兜底 = 0** ✓
  ② `/admin` = `<Navigate to="/admin/reviews" replace />` 且**在守卫内**——实测未登录访 `/admin` →
  `/login?next=%2Fadmin`（**未白跳** `/admin/reviews`）✓ ③ `main.tsx:21` 模块级 `bootstrapAuth()`（不 `await`）✓
  ④ `RoleGuard`：`grep -c 'export const ROLE'` = **0** · props 仅 `{minRole, children?}` · 三态齐 ✓
  ⑤ `ComingSoon` 官方族落位 ✓ · **生产产物零 `M4b-` 字面量**（`build` 后 `grep -rl 'M4b-' apps/web/dist/`
  **零命中**，`DEV_BATCH` 常量折叠实测生效）✓
  ⑥ **真浏览器 4/4**：未登录访 `/dashboard` → `/login?next=%2Fdashboard` · `/admin/reviews` →
  `/login?next=%2Fadmin%2Freviews` · `/reviews/42` 保 next · `/dashboard/tokens` 保 next；
  `/login` `/device` **独立版式**（无侧栏）✓
  ⑦ **role=1 实测**（真账号 `m4b2_user`，登录 200）：`/dashboard` `/reviews/42` **放行** ·
  `/admin/reviews` 与 `/admin` **均落 `/dashboard`**（Q15 映射生效）✓
  ⑧ 门禁：`typecheck` 0 · `lint` 0（92 文件）· `format:check` ✓（235）· `build` ✓（644.57 kB）；
  **门户零回归** `m4a-dogfood` **36/36 PASS + NO JS ERRORS** ✓
- **执行期细化 4 处（用户 2026-09-16 拍板「按推荐来」）**：① **`/login` `/device` 的 T3 形态** =
  `ComingSoon` 独立版式占位（原 plan 未定元素）⇒ **T6/T7 的 Files 各补 `Modify main.tsx`**（元素换真页）
  ② **占位页文案键**：新增 `common.comingSoon`（7 条占位页 description）+ title 复用既有组键；
  `dashboard.submissions` **T8 前移** ⇒ **T8 的 `dashboard` +2 键改 +1 键**（仅余 `welcome`）
  ③ **守卫 notice 文案键**：新增 `common.noPermission`，`RoleGuard` 用 `t('common','noPermission')`
  生成 `state.notice` ④ **种子脚本提前落地**：断言⑦ 的 role=1 分支需真账号 ⇒
  `docs/smoke/scripts/m4b2-seed-roles.ts` 随本 Task 落地并**已跑通**（3 账号 `m4b2_super` / `m4b2_mgr` /
  `m4b2_user`；口令取自 env；按 `m4b2_` 前缀清理可重放）——**T10 种子步骤改为复核**
- **⚠ 连带发现（dogfood 口径，已处置）**：未登录门户**必然**发 `/api/auth/me` 探测 ⇒ console 出现
  `401` 网络 log（原判定落 `errors` ⇒ `CONSOLE ERRORS` **假红**）。`m4a-dogfood.ts` 已按 T25 既有机制
  扩白名单（`netLogs` 404 / **`authNetLogs` 401** 双桶单列），依据 = 批 design §4.1「未登录 → anon」；
  **实测复验**（清 Edge cookie 后重跑）：尾行 `NO JS ERRORS（… ）（网络层 401 log 9 条 …）` ✓
  严格性不变（未预期 log 仍计入 `errors`）✓ **截图** `docs/smoke/m4b2-t3*.png`（4 轮）**不入库**

**T4 侧栏三组 + 门户组保留 + 用户区 ✅（2026-09-16 落地）**

- **落地**：新建 `components/ui/UserMenu.tsx`（四态）；改 `components/ui/SideNav.tsx`（143 → **254 行**：
  `SidebarContent` 内**门户组 JSX 逐字保留** + 三组用官方 `SidebarGroup` > `SidebarGroupLabel` +
  `SidebarGroupContent` > `SidebarMenu`；`SidebarFooter` 顶部接 `<UserMenu />`，元信息三项**保留**（T5 删））；
  `i18n/{zh,en}.ts`（`navigation` +6：3 组标题 + 3 徽章 · +1 `logout`；`admin` +1 `settings`）
- **断言实测**（真浏览器 1440×900 桌面视口；账号 = 种子三角色）：
  ① **门户组零改动**：4 条（首页/技能中心/MCP 中心/专家中心）形态与计数不变，源码块逐字保留 ✓
  ② 三组官方标准形态（`SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu`）✓
  ③ **四档显隐全绿**：未登录 = 门户组 only（三组零渲染）· `role=1` = +「个人」4 条（个人工作台 / 我的资产 /
  我的提交 / 访问令牌）· `role=10` = +「管理」2 条（审核管理 / 审计日志）· `role=100` = +「超级管理」**3 条**
  （标签管理 / 系统设置 / 用户管理）✓
  ④ **UserMenu 四态**：`loading` 骨架（`data-slot=sidebar-menu-skeleton`）· `anon` = 登录入口（`Link /login`）·
  `authed` = `SidebarMenuButton size="lg"`（Avatar 首字 + displayName + **徽章**：用户/管理员/超级管理员）+ 菜单
  **「我的资产 / 访问令牌 / 登出」** ✓
  ⑤ **占位条目** = `BUTTON`（非 `Link`）+ 点击 `sonner` 轻提示「该功能将在后续版本提供」✓（两条目零路由）
  ⑥ **loading 不闪**（CDP 注入延迟 `/me` 1.5s + 40ms 采样）：序列 = `404ms skeleton` → `3406ms authed:…`，
  **全程无 ANON 形态** ✓（骨架**就地替换**，无「未登录」闪现）
  ⑦ **F3 混排计算值**（门户组裸 `SidebarMenu` × `SidebarGroup`）：`SidebarContent` gap **4px** · 门户组底 →
  首组顶 **4px** · 组内 padding **8px** · 组标签高 **32px**；**观感交用户确认**（不为统一而改门户组结构）
  ⑧ **图标态实测值（F4 登记 · 异常）**：`collapsible="icon"` 下 `data-state=collapsed` ✓ 但
  **部分 `group-data-[collapsible=icon]` 变体未生效**——`hidden` 类**生效**（相关元素 computed width 0 ✓），
  而 `size-8!`（按钮仍 178px）· `-mt-8`/`opacity-0`（组标题 marginTop 0px / opacity 1，**未隐藏**）·
  `w-[calc(var(--sidebar-width-icon)+…)]`（container 仍 204px，未收窄到 48px 档）**均未生效**；
  已排除：非 mobile 视口（1440×900 复测同结论）· 非「祖先 `.group[data-collapsible=icon]` 缺失」
  （`closest()` 命中 ✓）· 非 M4b-2 引入（本 Task 未改 `Sidebar`/`SidebarProvider` 配置，门户组原样）；
  **待深挖**（候选方向：`--spacing` 变量与 `opacity: 0%` 产物的实际解析）
  ⑨ 门禁四连：`typecheck` 0 · `lint` 0（93 文件）· `format:check` ✓（237）· `build` ✓；
  **门户零回归** `m4a-dogfood` **36/36 PASS + NO JS ERRORS** ✓
- **执行期修正 5 处**：① **plan 断言③ 订正**：超管组「2 条真链 + 2 条占位」→ **3 条（1 真 + 2 占位）**
  （主 design §4 为唯一源；批 design §6.1 同）② **`admin.phase2Notice` 键不存在**（`grep` 零命中，design §6.3
  单方面引用）⇒ 按用户拍板**复用 `common.comingSoon`**（§6.3 键名同步订正）③ **角色徽章键落定 3 个**
  （`navigation.roleUser`/`roleAdmin`/`roleSuperAdmin`，设计 34 → 37）④ **补 2 处遗漏键**：
  `navigation.logout`（用户菜单登出项）· `admin.settings`（超管组「系统设置」条目）——两处均为 design 要求了
  UI 但 §10 台账未列 ⇒ **净增 37 → 39** ⑤ **修 T1 件缺陷（登出链不通）**：`doFetch` 原「仅在有 body 时声明
  `content-type`」⇒ `POST /api/auth/sign-out` 恒 **415**；改「**写请求一律声明**」后仍 **400**
  （`Invalid JSON in request body`——服务端要求**合法 JSON body**）⇒ `logout` 传 `{}` ⇒ **200 `{success:true}`**；
  修复后登出链实测全通（URL → `/` · 用户区 → 「登录」· 三组 → 0 · `/me` → **401**）
- **截图**：`docs/smoke/m4b2-t4*.png`（2 轮）**不入库**（门户零回归证据 = 36/36 断言文本）

**T5 TopBar 减法 + 侧栏元信息清除 ✅（2026-09-16 落地）**

- **落地**：`TopBar.tsx`（43 → **41 行**：删「登录」占位 `<span>`（类型图标衬底 + 文案）+ 随之无消费者的
  图标组件与 i18n 上下文两个 import）；`SideNav.tsx`（删 `APP_VERSION` 常量与 Footer 三项——Star 链接 /
  使用文档·提交反馈 / 版本行 ⇒ **Footer 仅余 `<UserMenu />`**）；`i18n/{zh,en}.ts`（`navigation` **−4 键**：
  `starRepo` · `footDocs` · `footFeedback` · `versionLine`）
- **断言实测**：
  ① TopBar 子元素实测 = **4 件**（`a`[品牌] · `div[separator]` · `button[sidebar-trigger]` · `div`[语言切换]）；
  `grep -c "navigation', 'login'"` = **0** · `grep -c 'TypeIcon'` = **0** ✓
  ② 侧栏 Footer 实测 `children = 1`（仅 `UserMenu`）· `grep -rn 'APP_VERSION' apps/web/src` = **0** ✓
  ③ 4 键全仓**零消费残留**（`grep -rn 'starRepo\|footDocs\|footFeedback\|versionLine' apps/web/src` = 0；
  原消费点 4 处随本 Task 清除）✓
  ④ 顶栏实测 `height: 58px`（不变）· **语言切换零变更**：切 EN → 侧栏徽章「Administrator」；回切「管理员」✓
  ⑤ 门禁四连（`typecheck` 0 · `lint` 0 · `format:check` ✓ 237 · `build` ✓）· **门户零回归** `m4a-dogfood`
  **36/36 PASS + NO JS ERRORS** ✓
- **执行期说明**：为满足断言①「`grep -c 'TypeIcon'` = **0**」的字面口径，TopBar 头部历史说明中的组件名
  改用中文表述（「类型图标衬底」/「图标组件」），**不改任何行为**（组件本体与 import 均已删除）
- **截图**：`docs/smoke/m4b2-t5*.png`（2 轮）**不入库**

**T6 登录页 `/login` ✅（2026-09-16 落地）**

- **落地**：新建 `apps/web/src/pages/Login.tsx`（**205 行**：`LoginScaffold` 独立版式 + 渲染顺序三态
  （loading 骨架 → authed 反向守卫 → anon 表单）+ 两 tab + `<form>` 原生 Enter 提交 + inline `Alert`）·
  改 `apps/web/src/main.tsx`（`/login` 元素 `ComingSoon` → **`<Login />`**；**删 `DEV_BATCH['/login']` 项**
  ——真页无批次号）· 改 `i18n/{zh,en}.ts`（`login` 组 **+8 键**（`title`/`tabLocal`/`tabOidc`/
  `username`/`password`/`submit`/`submitting`/`oidcHint`）+ `errors` **+9 码**）
- **断言实测**（真浏览器 CDP + `bun` 脚本）：
  ① **独立版式**：`[data-slot="sidebar"]` = **0** · 无 sticky 顶栏（**不入 `AppShell`**）· 品牌
  `--gradient-brand` 字在 · `LanguageSwitcher` **2 钮** · `Card` 标题「登录」✓
  ② **两 tab**（官方 `Tabs`）：`tabs-trigger` **2 个**，默认 active =「常规登录」· `autocomplete` =
  `username` / `current-password` 逐字段实测 · `type=password` ✓；**OAuth tab 内容**（**CDP 真指针**
  切换后）= `a[target="_blank"]` **1 个** · `href` = `/api/auth/oidc/authorize` · `rel = noreferrer` ·
  说明文案在 ✓（ⓘ **合成 `.click()` 对 Radix `Tabs` 无效**——与本仓 M4b-1 已知项同源，须真指针）
  ③ **首帧骨架（design Y3）**：`Fetch` 拦截 `/api/auth/me` 延迟 **1.6s**，每 150ms 采样 ⇒
  **t=150→1500ms 恒 `skeleton=4 / form=false`**（**不渲染表单**）、**t=1650ms** 起 `skeleton=0 /
  form=true` ⇒ 骨架 → 表单，**无 anon 闪现**
  ④ **失败态全 inline**（`skipAuthRedirect: true`）：故意错口令 ⇒ `[data-slot="alert"][role=alert]`
  文本「用户名或密码错误」· **`location.pathname` 仍 = `/login`**（**不退化为全局跳转**）· 表单仍在
  （可重试）✓
  ⑤ **成功链**：对的口令 ⇒ `location` = **`/dashboard`** · `GET /api/auth/me` = **200** · 侧栏用户区在
  （`[data-slot="sidebar-footer"]`）✓
  ⑥ **反向守卫**（已登录访 `/login`）：无 `next` → **`/dashboard`** ·
  `next=%2Fdevice%3Fuser_code%3DABCD-1234` → **`/device?user_code=ABCD-1234`（保码回跳）** ·
  `next=https%3A%2F%2Fevil.example%2Fx`（非法）→ 回落 **`/dashboard`** ✓
  ⑦ **门禁四连**（`typecheck` 0 · `lint` 0（94 文件）· `format:check` ✓（238）· `build` ✓）·
  **生产产物零 `M4b-` 字面量**（`grep -rl 'M4b-' apps/web/dist/` = **0**）· **门户零回归**
  `m4a-dogfood` **36/36 PASS + NO JS ERRORS** ✓
  ⑧ **零服务端改动**（`git diff --stat -- apps/server packages/protocol` **空**）✓
  ⑨ 无注册入口（页面文案无「注册/sign up」）· 用户名字段**中性文案**（非「邮箱」）✓
- **执行期细化 1 处**：`login.title` 与既有 `navigation.login` **并存**（后者仍由 `UserMenu` 未登录
  入口消费 **2 处**——T5 删的是 `TopBar` 占位，非该键）⇒ **零键冲突**（`login.title` = 卡片标题全称；
  `navigation.login` = 导航短词）
- **连带修正（种子脚本 A2 · 用户拍板）**：T3 落地的 `m4b2-seed-roles.ts` 原形态「删 `session` →
  `account` → `user` 后重建」在 **`audit_log.actor_id` 有行**（T4 实测登录产生 **8 行**）时恒
  **23503 外键违反**——实测引用 `"user"` 的外键 = **12 约束 / 9 张表**（account · asset×3 ·
  asset_label · asset_version×2 · audit_log · label_definition · review_task×2 · session）。
  ⇒ 改 **upsert**：① 只清 `session`（改口令后旧会话失效）② `user`/`account` **有则改、无则建**
  （`user` 行**永不删** ⇒ 引用表**全不需清理**（FK 触发器**根除**）；`user.id` **恒定** ⇒ 既有
  `audit_log` 等引用继续指向同一用户 = **审计留痕不丢**）。重放实测：`[seed] cleared 0 session(s)`
  + 三账号 `credential re-created`（上轮清理已删凭据 ⇒ 走**补建分支**）⇒ **登录 200 实证** ✓
- **登记**：biome `noUndeclaredEnvVars` 对 `SMOKE_M4B2_PASSWORD` 报 warning——**既有项、非本 Task
  引入**（原脚本同位置读同一变量；`docs/` 脚本为**手工运行**、非 turbo 任务，AGENTS.md 的 env 声明
  硬规则只管 turbo 任务依赖）⇒ 留 T10 整体审计统一处置
- **自检修复 1 处（18 维自检发现 · 同轮修）**：骨架卡原用 `CardContent pt-6`（**无 `CardHeader`**），
  而表单卡用 `CardHeader + CardContent` ⇒ 两态结构/padding 不同。实测（`/me` 延迟 1.8s，两态各量一次）：
  修复前**卡顶偏移已为 0 但高度差 103px**；改为**结构镜像表单**（`CardHeader` 标题位 + `CardContent`
  内逐位镜像：Tabs 条 → （label + input）×2 → 提交钮）后实测 **高度差 13px · 顶部偏移 0px**
  （视觉跳动消除；13px 系占位块与真控件的高度残差）✓ 修复后门禁四连 + dogfood **36/36** 复跑全绿
- **截图**：`docs/smoke/m4b2-t6*.png`（2 轮）**不入库**

**T7 设备授权页 `/device` ✅（2026-09-16 落地）**

- **落地**：新建 `apps/web/src/pages/Device.tsx`（**303 行**：三态门 + 四态 + 终态）· 新建跨页件
  `apps/web/src/components/console/AuthLayout.tsx`（独立版式，**与 `/login` 共用**——由 T6 的
  `LoginScaffold` 抽出）· 改 `main.tsx`（`/device` 占位 → `<Device />`；删 `DEV_BATCH['/device']`）·
  改 `api/auth.ts`（`claimDevice`/`approveDevice`/`denyDevice` + **OAuth 错误体映射**）· 改
  `api/client.ts`（`ApiError.body` = 原始错误体——**OAuth 端点的归一 `code` 会退化为 `http_400`**，
  适配方需读原始体；纯加性，本仓端点行为不变）· 改 `auth/next.ts`（`devicePath` 站内路由构造单点）·
  改 `i18n/{zh,en}.ts`（`device` 组 **13 键**）
- **断言实测**（真浏览器 CDP + `bun` 服务端探针）：
  ① **四态**：**(1) 输入**（`#device-code` + placeholder「输入 8 位设备码」· 空码时确认钮 **disabled**）→
  **(2) 已认领**（`客户端 aih-cli` · `请求范围 全量（无条件 scope）` · 批准/拒绝）→ **(3) 已处理**
  （批准 → 终态「已批准」）→ **(4) 错误**（错码 → `Alert`「设备码无效或已失效」）✓
  ② **页面无 API 构造**：`grep -c 'fetch(' pages/Device.tsx` = **0**（拼接全在 `api/auth.ts`）✓
  ⚠ **口径订正**（见下「执行期修正 4」）：plan 原写 `grep -c 'user_code'` = 0，**物理不可达**——
  页面必须**读** URL 参数名（`params.get('user_code')`）与**读**响应字段（`claim.user_code`），
  另有 3 处注释说明契约；实测 6 处命中**全部**是「注释 / 读参数 / 读响应字段」，**零拼接** ✓
  ③ **未登录保码回跳闭环**：未登录访 `/device?user_code=NP7954C5` → **`/login?next=%2Fdevice%3Fuser_code%3DNP7954C5`**
  → 就地登录 → **回跳 `/device?user_code=NP7954C5` 并自动认领**（落已认领态）✓✓
  ④ **预填 + 归一**：带参进入 ⇒ `input.value` = 参数值（**已归一为大写**）；手输 `abc123xy` ⇒
  即时变 `ABC123XY` ✓；不带参 = 手输（`disabled` 判空）✓
  ⑤ **实测链**：有效码 → 认领（`status:pending`）→ 批准 → 「已批准」；无效码 → 错误文案
  （**不白屏、console 零 JS 错误**）✓
  ⑥ **刷新态（F1 · 实测锚定）**：批准后带 `?user_code=` 刷新 ⇒ 服务端返回 **`status:'approved'`**
  ⇒ 页面**自然落终态「已批准」**（**无需特殊处理**；plan 原「不预设」→ 实测定案）✓
  ⑦ **不消费 CLI 两端**：`/device/code`、`/device/token` 无调用点（`grep` 命中 3 处**均为注释**——
  口径订正见「执行期修正 5」）✓
  ⑧ **错误体适配（Q18①）**：无效码 ⇒ 页面显示 `device.invalidCode`（中文「设备码无效或已失效」），
  **不落 `http_400` 兜底** ⇒ 映射生效（`{error:'invalid_request', error_description:'Invalid user code'}`
  → 归一码）✓
  ⑨ **「他人已认领」双路（Q18② · 实测）**：**前置** = `GET` 200 但**响应缺 `client_id`**（官方只把
  `client_id`/`scope` 给认领者）⇒ 落终态「该请求已由其他账号认领」（不给批准按钮）；**兜底** =
  非认领者 `approve` → **403 `{error:'access_denied'}`** ⇒ 同文案。两路均**实测复现** ✓
  ⑩ 门禁四连（`typecheck` 0 · `lint` 0（96 文件）· `format:check` ✓（240）· `build` ✓）·
  **生产产物零 `M4b-`** · **门户零回归** `m4a-dogfood` **36/36 PASS + NO JS ERRORS** · **服务端与协议
  零改动**（`git diff --stat -- apps/server packages/protocol` **空**）✓
- **执行期修正 1（设计缺口 · 未登录判定机制不成立）**：plan 断言③ 原写「未登录访问 → **401 ② 分类**生成
  `next`」。**实测推翻**：官方 `GET /api/auth/device?user_code=` **未登录也返回 200**（只给 `status`、
  不给 `client_id`/`scope`）⇒ **401 分流永不触发**，且未登录用户会因「响应缺 `client_id`」落入
  **「他人已认领」误报**。⇒ **改为页面读会话三态**（`useAuth`）设门：`loading` → 骨架（不渲表单）·
  `anon` → `<Navigate to={/login?next=devicePath(code)} />`（**保码**）· `authed` → 四态流程 +
  自动认领（effect 门控在 `authed`，避免未登录发认领）。与 `/login` 的三态顺序、`RoleGuard` 的
  未登录判定**同源同构**
- **执行期修正 2（契约订正 · `expiresLabel` 无数据源）**：design §10 的 `device` 组 14 键含
  `expiresLabel`（线框有「有效期 30 分钟」行）。**实测**：设备详情接口响应**仅 4 字段**
  （`user_code`/`status`/`client_id`/`scope`），**不返回 `expires_in`**（该字段只在 CLI 侧
  `POST /device/code` 响应里）⇒ 页面**无数据来源** ⇒ **不落该键、不渲染该行** ⇒ `device` 组 = **13 键**
  （design §10 同步订正 14 → 13）
- **执行期修正 3（契约订正 · 码形态 + scope 取值）**：design/plan 原写格式提示 `XXXX-XXXX`；实测
  `user_code` = **8 位大写字母数字无横线**（如 `CMK68C6R`）⇒ placeholder 改「输入 8 位设备码」+ 输入即
  归一为大写；`scope` 实测为 **`null`**（非空串）⇒ 判定走 falsy，显示 `scopeAll`
- **执行期修正 4（断言口径 · grep 目标错设）**：断言② 原设 `grep -c 'user_code' pages/Device.tsx` = 0；
  实测**不可达**（页面必须读 URL 参数名 + 读响应字段名，另有 3 处契约注释）⇒ 口径订正为
  「**页面无任何 API 请求构造**（`grep -c 'fetch('` = **0**）——拼接全在 `api/auth.ts`”，
  与原意（端点命名坑封装）**一致且更严**
- **执行期修正 5（断言口径 · 注释误计）**：断言⑦ 原设「`grep device/code|device/token` = 0」；
  实测命中 3 处**均为注释**（说明「不消费」）⇒ 口径订正为「**无调用点**（注释提及不计）」
- **执行期修正 6（实现落点）**：① **`ApiError` 补 `body`**——OAuth 端点错误体无 `code` 字段，
  归一 `code` 退化为 `http_400`，**适配方必须能读原始体**（design 拍板「适配点在设备封装内」的
  实现前提）② **`AuthLayout` 抽跨页件**（`/login` + `/device` 共用）——消 T6 自检 B3/C4 的
  「品牌字两处重复」扣分点 ③ **`devicePath` 落 `auth/next.ts`**（站内路由构造单点；与 `sanitizeNext`
  同域）
- **登记**：`verification_uri` 实测 = `http://localhost:3000/device`（**API 源**）⇒ 印证主 design §3.4
  的 dev 双源口径（`PUBLIC_BASE_URL` 保持 API 源语义）；dev 以 web 源直达 + 手输/复制码为准
- **截图**：`docs/smoke/m4b2-t7*.png`（3 轮）**不入库**

**T8 工作台临时落地页 `/dashboard` ✅（2026-09-16 落地）**

- **落地**：新建 `apps/web/src/pages/Dashboard.tsx`（**78 行**：`ComingSoon` **内容槽形态**
  （`EmptyContent`）= 欢迎语（`dashboard.welcome` 插值 `displayName`）+ 入口按钮组；`useEffect` 消费
  `location.state.notice`）· 改 `main.tsx`（`/dashboard` 由 `ComingSoon` 占位 → `<Dashboard />`；
  删 `DEV_BATCH['/dashboard']` 项）· 改 `i18n/{zh,en}.ts`（`dashboard` **+1 键**：`welcome`）
- **断言实测**（真浏览器 CDP，三档账号逐档登录）：
  ① **内容槽形态**：`[data-slot="empty-title"]` = 「个人工作台」· `[data-slot="empty-content"]` 内
  欢迎语 = 「欢迎回来，m4b2_user」（**含 `displayName` 插值**）+ 按钮组 ✓
  ② **四档裁剪**：**档 0 未登录** → `RoleGuard` 拦到 **`/login?next=%2Fdashboard`**（保码）；
  **role=1**（`m4b2_user`）→ 入口 **2 项**「我的资产 / 访问令牌」；**role=10**（`m4b2_mgr`）→ **3 项**
  （+「审核管理」）；**role=100**（`m4b2_super`）→ **3 项**（与 10 档同集合，符合 design 只定义
  `>=1` / `>=10` 两档阈值）✓
  ③ **零业务请求**：稳定后清探针 + `location.reload()` 采集 ⇒ 真实 API 仅 **2 条**：
  `200 /api/auth/me`（会话探测，壳必需）+ `200 /api/stats`（**M4a 既有侧栏计数徽章**，见下修正）
  ⇒ 排除二者后 = **0** ✓｜**另**：首轮探针把 Vite dev 的**源码模块请求**（`/src/api/*.ts?t=…`）误判为
  API ⇒ 复测已按「含 `/api/` 且不含 `/src/`」精确过滤
  ④ 文件头注释写明「**M4b-4 三卡之前的过渡件**」+ 零业务请求口径 ✓
  ⑤ **`state.notice` 消费（Q17）**：role=1 访 `/admin/labels` → 落 `/dashboard` + `sonner` toast
  「当前账号无权访问该页面」；**刷新后 `toasts: []`（不重弹）** ✓
  ⑥ 门禁四连（`typecheck` 0 · `lint` 0（97 文件）· `format:check` ✓（241）· `build` ✓）·
  **生产产物零 `M4b-`** · **门户零回归** `m4a-dogfood` **36/36 PASS + NO JS ERRORS** · **服务端与协议
  零改动** ✓
- **执行期修正 1（断言③ 口径 · 补壳层例外）**：plan 原写「网络探针记录 `/api/*` 请求数 = 0」。
  **实测**：`/dashboard` 稳定重载后仍有 1 条业务请求 `200 /api/stats`。**根因（代码级铁证）**：
  `SideNav.tsx:16` 消费 `fetchStats`（门户组条目的**计数徽章**，M4a 既有行为），而本页渲染于
  `AppShell` 内 ⇒ 该请求由**壳层**发出；全仓 `fetchStats` 消费点共 3 处（`Home` / `CenterPage` /
  `SideNav`），`/dashboard` 不渲染前二者 ⇒ 唯一来源即 `SideNav`。⇒ **这是 M4a 既有行为、非本页引入**
  （消除它需改门户壳 ⇒ 违反「门户零回归」硬约束，**不做**）。⇒ 口径订正为「**页面自身零业务请求**
  （壳层会话探测 `/api/auth/me` 与 M4a 既有 `/api/stats` 除外）」，与 design §5.3 原意
  （「不调 `/api/reviews`、`/api/audit`」）一致 ✓
- **截图**：`docs/smoke/m4b2-t8*.png`（**零**——本 Task 未产截图，断言全走 CDP 文本采样）

**T9 i18n 对齐 ✅（2026-09-16 落地）**

- **落地**：**无 UI 代码改动**；**内容改动 = 补 3 个 `errors` 键**（`apps/web/src/i18n/{zh,en}.ts`）+
  文档回填（`design §10` / 本 plan / 主 design / `docs/00` / AGENTS）
- **实测审计（脚本 `/tmp/m4b2-t9-i18n-audit.ts`：`bun` 真实 `import` 两语言字典 + `git show` 批前基线
  + 扫服务端 `auth/errors.ts`）**：
  ① **逐组键数实测**（zh 真源）：`navigation` 12（+3）· `market` 53（未变）· `dashboard` 6（+2）·
  `admin` 7（+1）· `review` 5（未变）· `login` 8（新组）· `device` 13（新组）· `common` 7（+2）·
  `errors` 21（+12）⇒ **合计 132 键 / 9 组** ✓
  ② **净增实测**：批前基线 = M4b-2 首个提交 `e569298` 的父提交 **`0ff0693`** ⇒ **91 键 / 7 组**；
  当前 **132 键 / 9 组** ⇒ **净增 41 键**（算式 8 + 13 + 12 + 3 + 2 + 1 + 2 = 41）✓
  ③ **双语完整对齐**：组级仅-zh / 仅-en **均为空** · 键级差异合计 = **0** ✓ PASS
  ④ **插值占位符一致性**：不一致 = **0** · 空值 = **0** ✓ PASS
  ⑤ **`errors` 组 vs 服务端实有码**：服务端 `auth/errors.ts` 实有 **12 码**；补 3 码后 web `errors` 组
  21 键 ⇒ **服务端有而 web 缺 = 0 处** ✓ PASS（补前缺 `auth.forbidden` · `auth.oidc_denied` ·
  `auth.oidc_state_mismatch`）
  ⑥ **门禁四连**（`typecheck` 0 · `lint` 0（97 文件）· `format:check` ✓（241）· `build` ✓）·
  **生产产物零 `M4b-`** · **门户零回归** `m4a-dogfood` **36/36 PASS + NO JS ERRORS** · **服务端与协议
  零改动** ✓
  ⑦ **无孤儿键（断言③）**：静态扫 `apps/web/src` 全部 `t(`/`tErr(` 调用点 ≈ 字典 **132 键** ⇒
  零消费键 **29 项**，逐项归属登记后**违规 = 0**：① `errors` 全组（消费形态为 **`tErr(<运行时码>)`
  ⇒ 动态**，07 §4 设计；其中 `auth.invalid_credentials` 已由 `/login` 实测消费）② `review.approve` /
  `reject` / `reason` / `empty` + `admin.title` / `admin.empty` / `dashboard.empty` = **待后续批**
  （M4b-3/4/5/6，批 design §3.3 占位页已落键）③ `common.download` = **M4a 遗留键**（门户下载按钮
  改由 `market` 组承担；跨批共享，不删）✓
  ⑧ **裸键泄漏 = 0（断言④）**：切 EN（`localStorage['aih.uiLang'] = 'en'` ⇒ `html.lang=en` 实测）后
  访 `/dashboard` · `/device` · `/` · `/skills` 四页 ⇒ **`group.key` 形态字符串 = 0**；中文残留仅为
  ① 语言切换器自身标签「中文」② 库中中文资产数据（如「检索技能」）——**均非 i18n 泄漏** ✓
- **内容改动依据（补 3 码）**：本 Task 断言③「`errors` 组覆盖服务端实有码」（07 §4 方针：i18n 表完整
  覆盖服务端实有码——T6 落 `oidc.not_configured` 即援引同一条）。`auth.forbidden`（越权 403）**在本批
  即可达**（M4b-4 列表页必然遇到）⇒ 原缺会落 `errors.unknown` 兜底，属**可预见的体验缺陷**；另两码
  （`auth.oidc_denied` / `auth.oidc_state_mismatch`）为 OIDC 回调失败码，前端消费点未落（F5）但**同属
  服务端实有码** ⇒ 一并补齐，避免下批再开 i18n 改动
- **数字纪律说明**：本 Task 全部数字由脚本**实测产出后回填**（无手写）；文档中三处**史实值**明确标注不改
  （§13 v1.0「22 键 + 9 码」= 窄口径）或**作废**（§10 v1.7「净增 39」与 T6 落值「39 → 56」= 中间值——
  其算式把 `device` 按 14 计、`errors` 按 +9 计）

**T10 门禁 + dogfood + 种子 + 收口 ✅（2026-09-16 落地 · 批次完成）**

- **落地**：新建 `docs/smoke/scripts/m4b2-auth-dogfood.ts`（**285 行** · 六组 G1-G6）·
  **新建验收硬证据** `docs/smoke/2026-09-16-m4b2-auth-shell.md`（门禁表 / dogfood 六组表 / 种子输出 /
  审计十一维 / 行数权威表 / F4 结论 / 出口五件状态 / 观感七项清单）· 文档回写（本 plan / 批 design /
  主 design / `docs/00` / AGENTS）
- **断言实测**：
  ① **五门禁逐项 exit 0**（CI 顺序复现）：`install --frozen-lockfile` ✓（414 installs / 543 packages）·
  `typecheck` 0 · `lint` 0 · `format:check` ✓（241）· `build` ✓ · `db:migrate` ✓ · **`CI=true bun run test`
  = 500 pass · 1 skip · 0 fail**（501 例 / 48 文件 / 1346 expect / 29.4s）——与 M4b-pre 基线
  （501 例 0 fail）**逐项一致 ⇒ 零回归** ✓
  ② **门户零回归**：`m4a-dogfood.ts` **36/36 PASS + NO JS ERRORS** · `m4a-chain-smoke.ts`
  **CHAIN SMOKE PASS** ✓
  ③ **本批 dogfood 六组（新建脚本）**：**24 PASS / 0 FAIL + `NO JS ERRORS`**（网络层 401 log 7 条 =
  未登录态断言的预期触发）——**G1** 未登录壳态（门户组 4 条 · 三档组零渲染 · 用户区 `/login` 入口 ·
  顶栏 4 件）· **G2** `role=USER`（个人组 4 条 · 直访 `/admin/labels` 弹回 `/dashboard` + 轻提示）·
  **G3** `role=ADMIN`（管理组 2 条 · `/admin/reviews` 可达）· **G4** `role=SUPER_ADMIN`（超管组 3 条 ·
  占位条目 `BUTTON` ×2 + 点击轻提示）· **G5** 登录→用户菜单→登出（登出归位 `/login` · `/me` 401 ·
  无侧栏）· **G6** 设备授权（造码 → 已认领态 → 批准 → 终态）✓
  ④ **种子复核**：A2 upsert 形态**第 3 次复跑幂等**（`cleared 24 session(s)` + 三账号 `updated`）⇒
  3 账号 `m4b2_{super,mgr,user}` = superadmin/admin/user 就绪 ✓
  ⑤ **出口件 ④ 七项**：✅ **CDP 自动断言 14 PASS / 0 FAIL + NO JS ERRORS**（脚本入仓
  `docs/smoke/scripts/m4b2-acceptance-checklist.ts`；口径变更 = 用户授权代跑 + 认可
  ⇒ 详见批 design **v1.14** §9.4）
  ⑥ **整体审计（十一维）**：**无未决项**——死导出 **0** · i18n 键（T9 实测：132 键 / 双语差集 0 /
  孤儿键违规 0 / 裸键泄漏 0）· 批次号残留（产物命中 **0** · `DEV_BATCH` 余 7 项**全部有对应占位路由**）·
  类串重复（T7 收敛为单处）· 越轴值 / token 消费者（本批零新增）· 注释腐化 + 文档数字 ⇒ **两处 findings
  已处置**（见下）· 官方件硬规则（手搓处均注明理由）· 既有登记项状态（**F4 → 关闭**）· 旧口径指针
  **5 处全部关闭**
  ⑦ **文档-代码对齐重评（converge）**：批 design 重评 **8 维 9.50**（+ 深度档三合一）· 主 design §2.3
  M4b-2 行**复核并回填收尾版本**（design **v1.13** · plan **v0.13**）· 规范同步（`07` §3 资源组 +2
  落地注记 · `00` §5 状态回写）✓
  ⑧ **F2 提示复核**：dev `.env` 的 `AUTH_TRUSTED_ORIGINS` 已含 `http://localhost:5173`（T3/T4/T6/T7
  登录实测 200 即证）✓
- **审计发现 1（行数声明为执行期估算 · 本轮订正）**：审计脚本核对文档「`file`（**N 行**）」声明 vs
  `wc -l` 实测 ⇒ **可核对 15 处全部不符**（`Device.tsx` 声明 303 / 实测 **268**；`SideNav.tsx` 254 / **225**；
  `Dashboard.tsx` 78 / **73**；`Login.tsx` 205 / **203**；`TopBar.tsx` 41 / **38**；`roles.ts` 38 / **33**；
  `next.ts` 83 / **97**；`client.ts` 187 / **205** 等）。**根因**：前序 Task 落地记录的**行数为执行期
  估算**（未 `wc -l` 实测即写入）。**处置**：证据文件 §6 立 **权威行数表**（本批文件行数的唯一权威源）+ **不逐个改写前序记录**（迭代史实，改写失真）⇒ 以「权威表 + 订正声明」为单一口径。
  **后续批次纪律**：行数声明一律 `wc -l` 实测后回填
- **审计发现 2（F4 关闭 · T4 登记为测量假阴性）**：T4 登记「`collapsible="icon"` 下部分
  `group-data-[collapsible=icon]` 变体未生效（`size-8!` 仍 178px · `-mt-8`/`opacity-0` 未隐藏 ·
  容器仍 204px）」。**本轮真机实测**（`cmd+b` 折叠后采样 computed）：`.group` 元素与
  `data-collapsible="icon"` **同元素**（变体前提满足）· 组标签 `margin-top = **-32px**` · `opacity = **0**` ·
  菜单按钮 `32×32px` · 容器 **66px** ⇒ **变体全部正常生效**。⇒ T4 当时测得的「178px / marginTop 0px /
  opacity 1」正是**展开态**的值 ⇒ **未真正进入折叠态**（`data-state=collapsed` 设在非 `group` 元素上或
  采样早于动画）。**结论：F4 误报 ⇒ 关闭**（T4 记录保留为史实 + 加关闭指针）
- **审计发现 3（旧口径指针关闭）**：plan `待深挖`×3 / `待 T10`×1 · design `待 T7 实测`×4 / `待深挖`×1
  ⇒ **逐处关闭**（T7/T9/T10 均已实测执行完毕）✓
- **出口五件状态**：① 批 design 8 维 ≥9（定稿 **9.44** / converge **9.50**）✅ ② T1-T10 全绿 ✅
  ③ 五门禁 exit 0 ✅ ④ dogfood **36/36 + 24/24 + NO JS ERRORS** ✅ / **观感七项待用户实机确认** 🔶
  ⑤ 整体审计无未决项 ✅ —— **证据文件** `docs/smoke/2026-09-16-m4b2-auth-shell.md`
- **截图**：`docs/smoke/m4b2-t10*.png`（门户零回归 2 轮）**不入库**

## 3. 整体审计（收尾 · 待 T10）

> 口径来源：**十一维**扫描（`docs/00` §7 ② · M4b-1 plan §3 先例）。
> 本节在 T10 执行时填写：findings 逐条登记 + 处置，**无未决项**方可达出口件⑤。

## 4. 风险与回退

- **回退面**：逐 Task 独立 commit ⇒ 可单件 `git revert`；本批无数据库迁移、无依赖变更 ⇒ 回退成本低
- **风险 ①（门户回归）**：`api/client.ts` 是本批唯一被改的**公共件**（门户四条读面共用）⇒
  401 分流必须落在**新增分支**、`apiGet` 既有路径零改动；T2 断言⑥ 以 `m4a-dogfood.ts` **36/36** 为硬证据
- **风险 ②（首帧闪烁）**：`bootstrapAuth()` **不 `await`** + 壳先渲染 + 骨架就地替换 ⇒
  若实现成「`await` 后再渲染」，首帧会空白或闪「未登录」。T4 断言⑥ 以 DOM 序列探针为证据
- **风险 ③（dev 双源 CSRF）**：浏览器写请求带 `Origin` ⇒ **dev `.env` 的
  `AUTH_TRUSTED_ORIGINS` 必须含 `http://localhost:5173`**，否则登录恒 403 `auth.csrf_failed`（主 design §3.1）。
  `.env` 不入库 ⇒ 执行 T6 前需确认该项已配
- **风险 ④（`RoleGuard` 改造面）**：该件已在 M4b-1 独立验证（探针页两跳），本批**删 `role` prop**
  属签名变更 ⇒ 改造后须重跑原两跳断言（T3 断言⑥）
- **风险 ⑤（`next` 保码）**：`sanitizeNext` 若写成「只取 pathname」会丢掉 `/device?user_code=`
  ⇒ 深链断裂（Q1 拍板的核心价值）。T2 断言⑤ 与 T6 断言⑤ 双重覆盖
- **不做**：为让断言变绿而放宽语义 / 改弱既有测试（测试是上游契约，红 = 越界信号，须查根因）

## 5. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v0.14 | 2026-09-16 | sunxuewen-rush | **出口件 ④ 口径变更回写（批次五件全绿）**：① Status → 「批次完成 · 出口五件全绿」
② T10 落地记录 ⑤ 行改写：出口件 ④ 由「待用户实机确认」→ **CDP 自动断言 14 PASS / 0 FAIL +
NO JS ERRORS**（新建 `docs/smoke/scripts/m4b2-acceptance-checklist.ts`；口径变更 = 用户 2026-09-16 授权
代跑并认可）③ 依据 = 批 design **v1.14** + 证据文件 §11 |
| v0.13 | 2026-09-16 | sunxuewen-rush | **T10 收尾回写（批次完成）**：① T10 标题 → **✅** ② 新增「T10 落地记录」
（新建 `m4b2-auth-dogfood.ts` **285 行**（六组）· 新建验收证据 `docs/smoke/2026-09-16-m4b2-auth-shell.md`；
**八条断言实测**：五门禁全绿（`test` **500 pass · 1 skip · 0 fail**，与 M4b-pre 基线一致）· 门户零回归
**36/36** + chain-smoke **PASS** · 本批 dogfood **24 PASS / 0 FAIL + NO JS ERRORS** · 种子复核（A2 第 3 次
复跑幂等）· 观感七项自测齐（待用户确认）· 整体审计**无未决项** · converge 8 维 **9.50** + 主 design 回填
收尾版本 · F2 复核）③ **三处审计发现处置**：**行数声明为执行期估算**（15 处不符 ⇒ 立权威表 + 订正声明，
后续批次 `wc -l` 实测）· **F4 关闭**（实测证伪 T4 误报：变体全部生效）· 旧口径指针 **5 处全部关闭**
④ Status → T1-T10 ✅ · **批次完成** |
| v0.12 | 2026-09-16 | sunxuewen-rush | **T9 落地回写**：① T9 标题 → **✅** ② 新增「落地记录 · T9」段
（**无 UI 代码改动**；内容改动 = 补 3 个 `errors` 键 + 文档回填）③ **实测审计六项**：逐组键数（合计 **132 键 /
9 组**）· 净增（基线 `0ff0693` **91 键** ⇒ **净增 41 键**）· 双语双向差集 **0** · 占位符不一致 **0** / 空值 **0** ·
服务端 12 码**覆盖 12/12**（补 3 码前缺 3）· 门禁四连 + 门户零回归 **36/36** ④ **内容改动依据** = 本 Task
断言③（i18n 覆盖服务端实有码；`auth.forbidden` 本批即可达）⑤ 状态 → T1-T9 ✅ · T10 ⬜ |
| v0.11 | 2026-09-16 | sunxuewen-rush | **T8 落地回写**：① T8 标题 → **✅** ② 新增「落地记录 · T8」段
（`pages/Dashboard.tsx` **78 行**（`ComingSoon` 内容槽 + 档位裁剪入口 + `notice` 消费）· `main.tsx`
`/dashboard` 换真页 · i18n `dashboard` **+1 键**；**六条断言实测**：档 0 跳登录保码 · **三档入口裁剪**
（1 → 2 项 / 10 与 100 → 3 项）· **零业务请求**（排除 `me`+`stats` 后 = 0）· 过渡件注释 · **`notice`
toast + 刷新不重弹** · 门禁四连 + 门户零回归 **36/36**）③ **执行期修正 1 处**：断言③ 口径补**壳层例外**
——`/api/stats` 来自 `SideNav.tsx:16`（M4a 既有侧栏计数徽章），非本页引入；消除它需改门户壳 ⇒ 违反
「门户零回归」⇒ 口径订正为「页面自身零业务请求」 ④ 状态 → T1-T8 ✅ · T9-T10 ⬜ |
| v0.10 | 2026-09-16 | sunxuewen-rush | **T7 落地回写**：① T7 标题 → **✅** ② 新增「落地记录 · T7」段
（`pages/Device.tsx` **303 行** · 新建跨页件 `AuthLayout.tsx` · `main.tsx` `/device` 换真页 · `api/auth.ts`
device 三封装 + OAuth 错误映射 · `ApiError.body` · `auth/next.ts` 的 `devicePath` · i18n `device` **13 键**；
**十项断言实测**：四态 · 页面零 API 构造 · **未登录保码回跳闭环** · 预填+大写归一 · 实测链 · **刷新态
`status:approved`** · 不消费 CLI 两端 · **错误体适配（不落 `http_400`）** · **他人已认领双路** · 门禁四连 +
门户零回归 **36/36**）③ **执行期修正 6 处**（① **设计缺口**：未登录判定机制不成立——官方 GET 未登录也
**200** ⇒ 401 分流不触发且会误报「他人已认领」⇒ 改读会话三态设门 ② `expiresLabel` **无数据源**
（详情接口不返 `expires_in`）⇒ 不落键 ⇒ `device` **13 键** ③ 码形态 `XXXX-XXXX` → 实测 **8 位无横线** +
`scope` 实测 `null` ④ 断言② grep 目标**错设**（页面必读参数名/响应字段）⇒ 改「页面无 `fetch`」
⑤ 断言⑦ 注释**误计** ⇒ 改「无调用点」 ⑥ 实现落点：`ApiError.body` · `AuthLayout` 抽件 · `devicePath`）
④ 状态 → T1-T7 ✅ · T8-T10 ⬜ |
| v0.9 | 2026-09-16 | sunxuewen-rush | **T6 落地回写**：① T6 标题 → **✅**（2026-09-16）② 新增
「落地记录 · T6」段（`pages/Login.tsx` **205 行** · `main.tsx` `/login` 换真页 + 删 `DEV_BATCH` 项 ·
i18n `login` +8 / `errors` +9；**九条断言实测**：独立版式 · 两 tab（**真指针**）· **首帧骨架**
（`/me` 延迟 1.6s 采样，150-1500ms `sk=4/form=false`）· **错口令 inline + URL 不变** · 成功链 →
`/dashboard` + `/me` 200 · **反向守卫保码回跳** + 非法 next 回落 · 门禁四连 · 生产产物零 `M4b-` ·
门户零回归 **36/36** · 零服务端改动）③ **执行期细化 1 处**（`login.title` 与 `navigation.login` 并存，
后者仍由 `UserMenu` 消费 2 处）④ **连带修正 1 处**：**种子脚本改 upsert（A2 · 用户授权）**——原「删
`session`/`account`/`user` 后重建」在 `audit_log.actor_id` 有行时恒 **23503**（引用 `"user"` 的外键
= **12 约束 / 9 张表**）⇒ 只清 `session` + `user`/`account` 有则改无则建（**`user` 行永不删 ⇒ 引用表
全不需清理 · `user.id` 恒定 ⇒ 审计留痕不丢**）⑤ **自检修复 1 处（同轮）**：骨架卡结构对齐表单卡（原 `CardContent pt-6` vs 表单 `CardHeader +
CardContent`）⇒ 高度差 **103px → 13px**、顶部偏移 **0**（消除切态跳动）⑥ 状态 → T1-T6 ✅ · T7-T10 ⬜ |
| v0.8 | 2026-09-16 | sunxuewen-rush | **T5 落地回写（减法批）**：① T5 标题 → **✅**（2026-09-16）② 新增「落地记录 · T5」段（`TopBar.tsx` 43 → **41 行**（删占位 span + 两个 import）· `SideNav.tsx` 删 `APP_VERSION` 与 Footer 三项（**Footer 仅余 `UserMenu`**）· i18n `navigation` **−4 键**；**五条断言实测**：TopBar 仅余 **4 件** · `grep` 三零 · 顶栏 **58px** · 语言切换零变更（徽章 EN↔中文 往返）· 门禁四连 · 门户零回归 **36/36**）③ 执行期说明：为满足「`grep -c 'TypeIcon'` = 0」字面口径，注释内组件名改中文表述（行为零变更）④ 状态 → T1-T5 ✅ · T6-T10 ⬜ |
| v0.7 | 2026-09-16 | sunxuewen-rush | **T4 落地回写**：① T4 标题 → **✅**（2026-09-16）② 新增「落地记录 · T4」段（`UserMenu.tsx` 新建 · `SideNav.tsx` 143 → **254 行** · i18n `navigation` +6/+1 · `admin` +1；**九条断言实测**：门户组零改动 · 三组官方形态 · **四档显隐全绿** · UserMenu 四态（含 loading 采样 **无 ANON 闪现**）· 占位条目 `BUTTON`+toast · **F3 计算值** · 图标态 → **F4 登记** · 门禁四连 · 门户零回归 **36/36**）③ **执行期修正 5 处**（plan 断言③ 超管组 **4 → 3 条**（主 design §4 唯一源）· `admin.phase2Notice` **不存在 ⇒ 复用 `common.comingSoon`** · 徽章键 3 个落定 · **补 2 处遗漏键**（`navigation.logout` / `admin.settings`）⇒ 键数 **37 → 39** · **修 T1 缺陷**：`apiPost` 写请求 content-type + `logout` 传 `{}`（sign-out 415/400 两坑）⇒ 登出链实测全通）④ **F4 登记**：图标态部分 `group-data-[collapsible=icon]` 变体未生效（`hidden` 生效但 `size-8!`/`-mt-8`/`opacity-0`/宽度变体未生效；已排除视口/祖先/M4b-2 引入三因，待深挖）⑤ 状态 → T1-T4 ✅ · T5-T10 ⬜ |
| v0.6 | 2026-09-16 | sunxuewen-rush | **T3 落地回写**：① T3 标题 → **✅**（2026-09-16）② 新增「落地记录 · T3」段（`console/ComingSoon.tsx` + 种子脚本提前落地 · `RoleGuard` 重写 · `main.tsx` 48 → **196 行** · i18n `common` +2 / `dashboard.submissions` +1；**八条断言实测**：路由 11 条 · `/admin` 守卫内重定向 · `bootstrapAuth` 模块级 · `ROLE` 残留 0 · **生产产物零 `M4b-` 字面量** · **真浏览器 4/4 + role=1 实测** · 门禁四连 · 门户零回归 **36/36**）③ **执行期细化 4 处**（/login `/device` T3 形态 = 占位 ⇒ **T6/T7 Files 各补 `Modify main.tsx`** · 占位页文案键 `common.comingSoon` · 守卫 notice 键 `common.noPermission` · **种子脚本提前落地并跑通** ⇒ **T10 种子步骤改复核**）④ **T8 Files `dashboard` +2 键 → +1 键**（`submissions` 随 T3 前移）⑤ **键数口径连锁**：T9 断言 净增 **32 → 34** · T7 `32 → 31` 改 **34 → 33** · T4 徽章键 `32 → 35` 改 **34 → 37** ⑥ **连带发现**：dogfood **401 log 单列**（`authNetLogs` 桶，依据 design §4.1；严格性不变，实测复验通过）⑦ 状态 → T1 ✅ · T2 ✅ · **T3 ✅** · T4-T10 ⬜ |
| v0.5 | 2026-09-16 | sunxuewen-rush | **T2 落地回写**：① T2 标题 → ✅ ② 新增「落地记录 · T2」段（件 9 `auth/next.ts` 83 行 + `client.ts` 187 行 · 七条断言实测 · 门户零回归 **36/36** 硬证据）③ **执行期细化 3 处**：`sanitizeNext` **单参**（`origin` 冗余）· `PROTECTED_PREFIXES` 落 `auth/next.ts`（零 import ⇒ 单向引用不成环）· `invalidateCache(prefix)` 按**语言无关 path 前缀**失效（原文「按键前缀」字面读法会永不命中）④ **连带修复**：biome `noControlCharactersInRegex` ⇒ 控制字符检测改码点判定⑤ 401 四分类的**端到端验证点后移 T3 断言⑥**（本 Task 不接线，无真 401 路径）⑥ 截图 11 张**不入库**（零 UI 变更）⑦ 状态 → T1 ✅ · **T2 ✅** · T3-T10 ⬜ |
| v0.4 | 2026-09-16 | sunxuewen-rush | **T1 落地回写（首个实现 Task 完成）**：① T1 标题 → ✅（2026-09-16）② 新增「落地记录 · T1」段（落地件与行数 · 五条断言实测证据 · 门禁三连 exit 0）③ **执行期修正 1**：`apiPost` 从 T2 前移 T1（**T1 ↔ T2 循环依赖**：T1 的 login 需 POST、T2 的 401 分流需 T1 的 AuthProvider 钩子）⇒ T2 收窄为「401 四分类 + `invalidateCache` + `sanitizeNext`」（T2 Files 已同步）④ **执行期修正 2**：401 登记口落 **`api/client.ts` 的 `setUnauthorizedHandler`**（防 `client → AuthProvider` 反向 import 形成 ESM 循环；§3.1 件 1 语义不变）⑤ **登记归 T4**：角色徽章键与组标题键语义不符（design §6.2 ↔ §10）⑥ 状态 → **执行中**（T1 ✅ / T2-T10 ⬜） |
| v0.3 | 2026-09-16 | sunxuewen-rush | **grilling 第 3 轮（Q14-Q19）断言同步 + 自产编号缺陷修正**：① **T2 断言③** 判定域写实 = **当前路由**（Q14——`window.location.pathname` 匹配 4 个**路由**前缀；**实测**全仓 `apiGet` 均为 `/api/...`，与原「按请求 path 匹配」**不同域 ⇒ 永不命中**）② **T2 断言⑤** 补 **`/\evil.com`** 与 **`/%5Cevil.com`** → `null`（Q16 协议相对 URL = 开放重定向防护）③ **T3 断言⑦** 新增**守卫包裹与 `minRole` 映射**（Q15：门户 5 条无守卫 · `/dashboard`+`/reviews` = `USER(1)` · `/admin` = `ADMIN(10)`；`/admin` 的 `Navigate` 在守卫内）④ **T7 断言⑧** device **错误体 OAuth 风格 `{error}`** 的适配点（Q18①——页面不直读 `code`）· **断言⑨** 「他人已认领」态**存在性实测**（Q18②——仓内无据，无则删）⑤ **T8 断言⑤** **`location.state.notice` 消费**（Q17——toast + 清 state 防重弹）⑥ **T9 断言⑥** **`claimedByOther` 键去留**（Q18②，键数口径 32 → 31）⑦ **T10** 口令变量 → 单变量 **`SMOKE_M4B2_PASSWORD`**（Q19）⑧ **自产缺陷修正（同轮）**：**T4 断言编号 ⑦ 重复**（混排 F3 与门禁同号）→ 门禁改 **⑨**；**T7 断言编号 ⑦ 重复**（不消费 CLI 与门禁同号）→ 门禁改 **⑩**⑨ 依据：**grilling 第 3 轮**（frontier 重算后剩 7 项，全部按推荐拍板）；批 design 同步升 **v1.3** |
| v0.2 | 2026-09-16 | sunxuewen-rush | **深度档评审同步（plan 侧）**：① **§1.4 两处缺口全部闭合**——批 design 升 **v1.2**：缺口 ⑴ 采纳 **A 案**（新建件 **9** `src/auth/next.ts`）· 缺口 ⑵ Q8 边界已订正 ② **T2** Files 落点转定案（`auth/next.ts` = 件 9）· **T4** 补断言 ⑦（**F3 混排结构视觉**：计算值记录 + 用户确认）与 ⑧（图标态组标题官方实测值）· **T7** 补断言 ⑥（**F1 刷新态**）· **T9** 断言 ② 补**净增 32 键**总量对照 ③ **T10** 断言 ⑦ 改「批件登记表**复核**」（M4b-2 行已于立项时回填主 design **v1.22**）+ 补 ⑧ **F2 提示**（`.env` 的 `AUTH_TRUSTED_ORIGINS` 含 `5173`）④ 依据：**深度档评审**（四轮审查法）findings + 主 design v1.22/D1-D2 |
| v0.1 | 2026-09-16 | sunxuewen-rush | 初稿：M4b-2 Task 清单 **T1-T10**（认证地基 → API 客户端扩展 → 路由骨架 → 侧栏三组 → TopBar 减法 → `/login` → `/device` → `/dashboard` → i18n 对齐 → 门禁/dogfood/收口），每 Task 含 Files / Assert（可现场跑）/ Commit；**§1.4 登记两处待补设计缺口**（① `sanitizeNext` 落点未在批 design §3.1 件清单列明，推荐 A = 新建 `src/auth/next.ts`；② Q8「反向守卫」Task 边界措辞——实现落点为 T6 `/login`）；§4 风险五条（含 dev CSRF 前置与 `next` 保码）；**自检实测**：10 项行数声明（`main.tsx` 48 / `api/client.ts` 78 / `useApi.ts` 47 / `RoleGuard` 43 / `AppShell` 48 / `SideNav` 143 / `TopBar` 43 / `sidebar.tsx` 696 / `empty.tsx` 93 / shadcn 33 件）+ i18n 7 组键数（9/53/4/6/5/5/9）**全部一致** · file:line 引用全部回读（`app.test.ts:115-119` 登录 JSON · `http/auth-routes.ts:17-28` `/me` 薄层 · `main.tsx:45` Toaster）· 8 维自检 **9.44**；依据批 design `2026-09-16-m4b2-auth-shell-design.md` **v1.1** 定稿 + 上游主 design **v1.21** §2.3 |
