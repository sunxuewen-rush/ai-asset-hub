# M4b-2 认证与壳批（登录 · 会话 · 角色感知壳）实现计划

> Date: 2026-09-16
> Updated: 2026-09-16（**v0.3：grilling 第 3 轮（Q14-Q19）断言同步**——T2 断言③ **判定域 = 当前路由**（Q14：实测全仓 `apiGet` 均为 `/api/...`，与原「按 path 匹配」不同域）+ 断言⑤ 补 **`/\evil.com` / `/%5Cevil.com` → `null`**（Q16）· T3 断言⑦ **守卫包裹与 `minRole` 映射**（Q15）· T7 断言⑧ **device 错误体 OAuth 风格适配**（Q18①）+ 断言⑨ **「他人已认领」态实测**（Q18②）· T8 断言⑤ **`location.state.notice` 消费**（Q17）· T9 断言⑥ **`claimedByOther` 键去留**（Q18②）· T10 口令变量 → 单变量 **`SMOKE_M4B2_PASSWORD`**（Q19）；**顺带修正 T4/T7 断言编号重复（⑦ 各出现两次，自产缺陷同轮修）**；**v0.2：深度档评审同步**——§1.4 两缺口全部闭合（批 design v1.2：`auth/next.ts` 件 9 + Q8 边界订正）· T4 补 F3/图标态断言 · T7 补 F1 刷新态 · T9 补净增 32 键对照 · T10 补 F2 提示 + 登记表改「复核」；**v0.1 初稿**：M4b-2 Task 清单 **T1-T10**（认证地基 → API 客户端扩展 → 路由骨架 → 侧栏三组 → TopBar 减法 → `/login` → `/device` → `/dashboard` → i18n 对齐 → 门禁/dogfood/收口），每 Task 含 **Files / Assert（可现场跑）/ Commit**；依据批 design `2026-09-16-m4b2-auth-shell-design.md` **v1.1**（定稿 · 8 维 9.44）与上游主 design **v1.21** §2.3 拆批表；§1.4 登记**两处待补设计缺口**（① `sanitizeNext` 落点未在件清单列明 ② Q8「反向守卫」Task 边界措辞）；10 项行数声明与 i18n 键数**全部实测一致** · file:line 引用**全部回读**）
> Status: **计划已立**（T1-T10 ⬜ 待执行；**前置 = M4b-1 出口五件全绿** ✅——批 design **v1.3** 定稿（**8 维 9.44 · 深度档三合一 9.50**）· 批 plan 本件 **v0.3** · 五门禁 exit 0 · dogfood 36/36 + 观感复核 · 整体审计 F1-F8 无未决项）
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

### T1 认证地基件（`AuthProvider` + `roles.ts` + `api/auth.ts`）⬜
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

### T2 `api/client.ts` 扩展（401 单点分流 + `apiPost` + `invalidateCache` + `sanitizeNext`）⬜
- **设计**：批 design §3.2（件 4）· §4.2（四分类）· §4.3（反向守卫 + `sanitizeNext`）· §9.1（门户零回归）
- **Task 边界**：Q8 原把「反向守卫」列入本 Task ⇒ 实现期落点为 **T6 `/login` 组件内**
  （本 Task 只提供 `sanitizeNext` 判定函数与 401 侧的 `next` 生成点）——批 design v1.2 §2.1 Q8 已同步订正，见 §1.4 缺口⑵
- **Files**: Modify `apps/web/src/api/client.ts`（现 78 行：`apiGet` :36-52 · `doFetch` :54-78 私有 ·
  `responseCache` :28 未导出）· Create `apps/web/src/auth/next.ts`（**件 9**——批 design v1.2 §3.1 已落定，见 §1.4 缺口 ⑴）
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

### T3 路由骨架 + `ComingSoon` + `RoleGuard` 接线 ⬜
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

### T4 侧栏三组 + 门户组保留 + 用户区 ⬜
- **设计**：批 design §6.1（显隐矩阵）· §6.2（用户区四态）· §6.3（占位条目交互）
- **Files**: Modify `apps/web/src/components/ui/SideNav.tsx`（现 143 行：`entries` :53-58 ·
  `SidebarContent` :73-116 · `SidebarFooter` :118-138）· Create `apps/web/src/components/ui/UserMenu.tsx` ·
  `i18n/{zh,en}.ts`（`navigation` **+3** 组标题键）
- **Assert**:
  ① **门户组保持现形态**（4 条、**无组标题**、`SidebarMenu` 直挂）——源码零改动（Q3 零回归）
  ② 三组用官方标准形态：`SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu`
  ③ 组级与条目级**同取 `hasRole`**；**组内无可见条目 ⇒ 整组不渲染**，
     四档实测（未登录 / 1 / 10 / 100）：未登录仅门户组 · 1 档 +个人（4 条）· 10 档 +管理（2 条）·
     100 档 +超级管理（2 条真链 + 2 条占位）
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

### T5 TopBar 减法 + 侧栏元信息清除 ⬜
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

### T6 登录页 `/login` ⬜
- **设计**：批 design §5.1（页面规格）· §4.3（反向守卫）· §4.2 ④（inline 失败态）
- **Files**: Create `apps/web/src/pages/Login.tsx` · `i18n/{zh,en}.ts`（`login` 组 **8 键** +
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

### T7 设备授权页 `/device` ⬜
- **设计**：批 design §5.2（四态）· §4.3（`next` 保码）· 主 design §3.4（基址与 dev 口径）· §7.1（device 三行）
- **Files**: Create `apps/web/src/pages/Device.tsx` · `i18n/{zh,en}.ts`（`device` 组 **14 键**）
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

### T8 工作台临时落地页 `/dashboard` ⬜
- **设计**：批 design §5.3（role 裁剪）· §5.4（`ComingSoon` 内容槽形态）
- **Files**: Create `apps/web/src/pages/Dashboard.tsx` · `i18n/{zh,en}.ts`（`dashboard` **+2 键**：
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

### T9 i18n 全量对齐 + 键集审计 ⬜
- **设计**：批 design §10（i18n 变更规格）· §3.2（件 5）· 主 design §11（组清单）
- **Files**: Modify `apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts`（如各 Task 已逐批加键，本 Task 做**收口对齐**）
- **Assert**:
  ① **键集逐一相等**（脚本比对 8 组，非人工目视）：`navigation` / `market` / `dashboard` / `admin` /
     `review` / `common` / `errors` / **`login`** / **`device`**（共 **9 组**）—— zh 与 en 键名集合一致
  ② 键数**实测回填**本 plan 与批 design §10（**禁止沿用推算式数字**）：`login` · `device` ·
     `errors` · `dashboard` · `navigation` 各组的最终键数；**总量对照批 design §10 口径注（净增 32 键 = 22 + 9 + 2 − 1）**，不符须登记差异
  ③ **无孤儿键**：每键至少一处消费点，或已在 design/plan 登记为「待后续批消费」
  ④ **裸键泄漏 = 0**：zh/en 互切实测，页面无 `group.key` 形态字符串直出
  ⑤ `errors` 组新增 9 码齐备且与 `apps/server/src/auth/errors.ts`（12 码）比对——
     本批覆盖 8 auth.* + `oidc.not_configured`；`auth.rate_limited` 复用既有键
  ⑥ **`claimedByOther` 键去留（Q18②）**：按 T7 实测结论定——无此态则删键（zh/en 同步 +
     design §5.2/§10 同步 + 键数口径 **32 → 31**）
  ⑦ 门禁（web 侧四连）
- **Commit**: `chore(web): align i18n dictionaries and audit key sets`

### T10 门禁 + dogfood + 种子 + 收口回写 ⬜
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
  ⑤ **出口件 ④ 七项人工清单**（批 design §9.4，**用户实机确认**）：未登录跳转回原页 ·
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
| v0.3 | 2026-09-16 | sunxuewen-rush | **grilling 第 3 轮（Q14-Q19）断言同步 + 自产编号缺陷修正**：① **T2 断言③** 判定域写实 = **当前路由**（Q14——`window.location.pathname` 匹配 4 个**路由**前缀；**实测**全仓 `apiGet` 均为 `/api/...`，与原「按请求 path 匹配」**不同域 ⇒ 永不命中**）② **T2 断言⑤** 补 **`/\evil.com`** 与 **`/%5Cevil.com`** → `null`（Q16 协议相对 URL = 开放重定向防护）③ **T3 断言⑦** 新增**守卫包裹与 `minRole` 映射**（Q15：门户 5 条无守卫 · `/dashboard`+`/reviews` = `USER(1)` · `/admin` = `ADMIN(10)`；`/admin` 的 `Navigate` 在守卫内）④ **T7 断言⑧** device **错误体 OAuth 风格 `{error}`** 的适配点（Q18①——页面不直读 `code`）· **断言⑨** 「他人已认领」态**存在性实测**（Q18②——仓内无据，无则删）⑤ **T8 断言⑤** **`location.state.notice` 消费**（Q17——toast + 清 state 防重弹）⑥ **T9 断言⑥** **`claimedByOther` 键去留**（Q18②，键数口径 32 → 31）⑦ **T10** 口令变量 → 单变量 **`SMOKE_M4B2_PASSWORD`**（Q19）⑧ **自产缺陷修正（同轮）**：**T4 断言编号 ⑦ 重复**（混排 F3 与门禁同号）→ 门禁改 **⑨**；**T7 断言编号 ⑦ 重复**（不消费 CLI 与门禁同号）→ 门禁改 **⑩**⑨ 依据：**grilling 第 3 轮**（frontier 重算后剩 7 项，全部按推荐拍板）；批 design 同步升 **v1.3** |
| v0.2 | 2026-09-16 | sunxuewen-rush | **深度档评审同步（plan 侧）**：① **§1.4 两处缺口全部闭合**——批 design 升 **v1.2**：缺口 ⑴ 采纳 **A 案**（新建件 **9** `src/auth/next.ts`）· 缺口 ⑵ Q8 边界已订正 ② **T2** Files 落点转定案（`auth/next.ts` = 件 9）· **T4** 补断言 ⑦（**F3 混排结构视觉**：计算值记录 + 用户确认）与 ⑧（图标态组标题官方实测值）· **T7** 补断言 ⑥（**F1 刷新态**）· **T9** 断言 ② 补**净增 32 键**总量对照 ③ **T10** 断言 ⑦ 改「批件登记表**复核**」（M4b-2 行已于立项时回填主 design **v1.22**）+ 补 ⑧ **F2 提示**（`.env` 的 `AUTH_TRUSTED_ORIGINS` 含 `5173`）④ 依据：**深度档评审**（四轮审查法）findings + 主 design v1.22/D1-D2 |
| v0.1 | 2026-09-16 | sunxuewen-rush | 初稿：M4b-2 Task 清单 **T1-T10**（认证地基 → API 客户端扩展 → 路由骨架 → 侧栏三组 → TopBar 减法 → `/login` → `/device` → `/dashboard` → i18n 对齐 → 门禁/dogfood/收口），每 Task 含 Files / Assert（可现场跑）/ Commit；**§1.4 登记两处待补设计缺口**（① `sanitizeNext` 落点未在批 design §3.1 件清单列明，推荐 A = 新建 `src/auth/next.ts`；② Q8「反向守卫」Task 边界措辞——实现落点为 T6 `/login`）；§4 风险五条（含 dev CSRF 前置与 `next` 保码）；**自检实测**：10 项行数声明（`main.tsx` 48 / `api/client.ts` 78 / `useApi.ts` 47 / `RoleGuard` 43 / `AppShell` 48 / `SideNav` 143 / `TopBar` 43 / `sidebar.tsx` 696 / `empty.tsx` 93 / shadcn 33 件）+ i18n 7 组键数（9/53/4/6/5/5/9）**全部一致** · file:line 引用全部回读（`app.test.ts:115-119` 登录 JSON · `http/auth-routes.ts:17-28` `/me` 薄层 · `main.tsx:45` Toaster）· 8 维自检 **9.44**；依据批 design `2026-09-16-m4b2-auth-shell-design.md` **v1.1** 定稿 + 上游主 design **v1.21** §2.3 |
