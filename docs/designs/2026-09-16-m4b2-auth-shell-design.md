# M4b-2 认证与壳批设计（登录 · 会话 · 角色感知壳）

> Date: 2026-09-16
> Updated: 2026-09-16（**v1.7：T4 落地执行期修正（5 处，用户拍板「按推荐来」）**——① **§6.1 超管组条目数订正**：plan 断言③ 的「2 条真链 + 2 条占位」→ **3 条（1 真 + 2 占位）**（主 design §4 唯一源）② **§6.3 占位条目提示键订正**：`admin.phase2Notice` **仓内不存在** ⇒ **复用 `common.comingSoon`**（零新增键）③ **§6.2 徽章键落定**：`navigation.roleUser`/`roleAdmin`/`roleSuperAdmin`（3 键，用户拍板）④ **§10 键数口径 → 净增 39 键**（补 2 处遗漏键：`navigation.logout` · `admin.settings`——design 要求了 UI 但台账未列）⑤ **§6.1/§6.2 补落地实测值**（四档显隐 · F3 混排计算值 · F4 图标态登记）；**v1.6：T3 落地执行期细化（4 处，用户拍板「按推荐来」）**——① §3.3 路由表补 **T3 形态注**（`/login` `/device` 本批 T3 = `ComingSoon` 独立版式占位，真页 T6/T7 ⇒ **T6/T7 各需 `Modify main.tsx`**）② §10 键数口径 → **净增 34 键**（新增 `common` 组 **+2**：`comingSoon` = 占位页 description · `noPermission` = 守卫 notice 文案；`dashboard.submissions` **随 T3 前移**落仓 ⇒ T8 仅余 `welcome`）· 连锁：§6.2 徽章键 **34 → 37** · device 删键 **34 → 33** ③ §5.4 补落地注（件已落仓；批次号经 **`DEV_BATCH` 常量表** + `import.meta.env.DEV` 门控 ⇒ **生产产物零 `M4b-` 字面量**，build 后 grep 实测）④ §9.5 种子脚本**已落仓并跑通**（运行须 `--env-file=apps/server/.env`——仓库根无 `.env`）⑤ §9.3 dogfood **401 单列**口径（未登录 `/api/auth/me` 探测）；**v1.5：T2 落地执行期细化**——§3.1 件 9 扩为**路由安全单点**（`sanitizeNext` + `PROTECTED_PREFIXES` + `isProtectedRoute`；**零 import** ⇒ `api/client` 单向引用不成环）· §4.2 `invalidateCache(prefix)` 语义写实（**语言无关 path 前缀**）· §4.3 `sanitizeNext` **单参**（`origin` 冗余）+ 补拒**控制字符**（含 `%00`–`%1f`）+ 落点写明；**v1.4：T1 落地执行期登记**——§3.2 件 4 补「`apiPost` + `doFetch` 参数化 + `setUnauthorizedHandler` 已随 T1 落地」（解 T1↔T2 循环依赖 + 防 ESM 循环）· §6.2 登记**角色徽章键与组标题键语义不符**的缺口（T4 定：补 3 键 32 → 35，或徽章只显色不显字）· §10 增**两处待定键**口径（`claimedByOther` 待 T7 实测 · 徽章键待 T4 定；净增 32 为 baseline，T9 实测回填）；**v1.3：grilling 第 3 轮（Q14-Q20）落地**——**Q14 401 判定域写实**（判定 = **当前路由**，非 API 路径；实测全仓 `apiGet` 均为 `/api/...`）· **Q15 守卫包裹与 `minRole` 映射表**（门户 5 条无守卫 / `/dashboard`+`/reviews` = USER(1) / `/admin` = ADMIN(10)；`/admin` 的 `Navigate` 在守卫内）· **Q16 `sanitizeNext` 拒 `\` 与 `%5C`**（开放重定向边界，形态 `^/[^/\\]`）· **Q17 `/dashboard` 消费 `location.state.notice`**（toast + 清 state 防重弹）· **Q18 device 错误体 = OAuth 风格 `{error}`**（适配点 `api/auth.ts`）+ 「他人已认领」态**仓内无据 ⇒ 待 T7 实测、无则删** · **Q19 种子口令 = 单变量 `SMOKE_M4B2_PASSWORD`**；**v1.2：深度档评审修正（D3 + Y1-Y4 + F1-F3 + plan 缺口落档）**——口径 = 三合一 15 维 + 深度 4 维 + **四轮审查法**（四方对账）；§10 补**净增 32 键**口径注 · 图标态措辞写实 · 补 **`/me` 非 401 失败态**与 **`/login` loading 态** · 种子脚本落点写实（表 `user` / `username` / `role` / `status`）· 登记 F1-F3 · **件清单 8 → 9**（补 `src/auth/next.ts`）· Q8 反向守卫边界订正；深度档实测 **9.19 → 9.44**（8 维）/ 三合一 **9.47**；**v1.1：自检订正轮（U1-U5，第七轮换轴体检）**——轴 = **官方件 API 核对 + 上游引用一致性 + 件清单复算**：改造件 **5 → 6 处**（补 `RoleGuard.tsx`）· §4.5 写实 `RoleGuard` 改造三点（删本地 `ROLE` 常量 / **删 `role` prop** / 接三态）· §5.4 按官方件族落位（`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/**`EmptyContent`**）· 补 `SidebarGroupContent` 与 `SidebarMenuSkeleton` · §9.1 措辞「逐字不变」→「行为语义不变 + 类型面加性扩展」；自检 **9.17 → 9.44**）；**v1.0 初稿**：M4b-2 对齐定稿——**grilling 13 项决策**（2026-09-16 两轮 + 1 补问，全部按推荐拍板）+ 上游主 design **v1.20** 契约承接；入口现状 8 项真码实证）
> Status: **定稿**（**8 维 9.44 · 深度档三合一 9.50** ≥9——**实测值**；六轮口径：9.00 → 9.44 → 9.17 → 9.19（深度档评审）→ 9.44（v1.2）→ **v1.3 grilling 第 3 轮后 9.44 / 9.50**；上游主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md` §2.3 的子批之一；主 design 版本随其自身演进，**以其版本头为准**）
> Scope: **仅 M4b-2（认证与壳批）**——登录页 `/login` · 设备授权页 `/device` · `AuthProvider` 会话上下文 · 401 三分类分流 · 角色判定单点 · 登出 · 侧栏三组 + 用户区 · 路由骨架（11 条）· 占位页；**零服务端改动、零新增依赖**
> 引用链：本文档 → 上游主 design（§2.4 决策登记 U1-U3 · §3.1-§3.4 认证与会话 · §4 入口分层与显隐 · §5.1/§5.2 页面与路由 · §6.2 组件树 · §7.1 device 三行 · §11 i18n）→ 规范 `00` §5/§7 · `05` §3/§5/§6 · `07` §3/§4 → M4a design **§4.4**（全站视觉真值 SSOT，引用不复制）

## 1. 背景与批界

### 1.1 位置与依赖链

M4b-pre（认证整车迁移）2026-09-15 收口后，服务端认证面已全量交付；**M4b-2 是 M4b 全部后续批的认证底座**
（M4b-3…6 的每一页都消费本批的 `AuthProvider` / `roles.ts` / 401 分流 / 侧栏壳）。
用户 2026-09-16 拍板顺序：M4b-1（地基）✅ → **M4b-2（本批）** → M4b-3…6。

### 1.2 入口现状（真码实测，2026-09-16）

| # | 项 | 现状 | 依据 |
|---|----|------|------|
| 1 | 登录入口 | 「登录」为**占位 `<span>`**（`cursor-default`，无 `onClick`/`href`） | `components/ui/TopBar.tsx:33-39` |
| 2 | 路由表 | **5 条**（`/` · `/skills` · `/mcps` · `/agents` · `/assets/:slug`），**无 `/login`、无 `*` 兜底** | `main.tsx:32-42` |
| 3 | 认证上下文 | **无**（无 `AuthProvider` / 无 `auth/roles.ts` / 无 `api/auth.ts`） | 目录实测 |
| 4 | API 客户端 | `apiGet` + `ApiError`（**78 行**）；**无 `apiPost`**；响应缓存 Map **未导出** | `api/client.ts:36-78` |
| 5 | `useApi` | 通用薄 hook（三态 + abort，**零认证逻辑**） | `hooks/useApi.ts:17-47` |
| 6 | 侧栏 | 门户 4 条**无组标题平铺** + 底部产品元信息三项 + `APP_VERSION` 死常量 | `SideNav.tsx:18-19,53-58` |
| 7 | i18n | **7 组**（`dashboard` 4 键 / `admin` 6 键 / `review` 5 键 = M4b-1 骨架） | `i18n/zh.ts` |
| 8 | 官方件 | `ui/shadcn/` **33 件**（`card`/`field`/`tabs`/`alert`/`empty`/`avatar`/`spinner`/`sidebar` 等全在） | 目录实测 |

> 用户实测反馈「dev（5173）点登录无响应」经代码核实即第 1 项——**本批闭合**。

### 1.3 批界

**In**：登录与登出（含反向守卫、`next` 白名单）· 会话上下文与首帧 · 401 三分类分流 · 角色判定单点 ·
侧栏三组 + 门户组保留 + 用户区 · 路由骨架 11 条 · 占位页 · 设备授权页 · i18n 两组新增与补键 · 门禁/冒烟/出口件。

**Out（不混入）**：
- 任何业务页面（我的资产/提交/令牌、审核面、标签/审计）→ M4b-3…6
- 服务端任何改动（含「OIDC 可用性探测端点」——本批**不做**，见 §5.1）
- 产品元信息三项的**去处**（Star/文档反馈/版本行 → 删除，展示位归 M6，主 design §14 已登记）
- 自助注册入口（主 design §2.2 Out）· 用户管理面（M4c）· 静默续期 / 草稿保护（主 design U3 已定「已知代价」）

## 2. 拍板结果（本批）

### 2.1 grilling 13 项决策（2026-09-16，用户逐条「按推荐来」）

| # | 议题 | 拍板 |
|---|------|------|
| Q1 | 反向守卫落点 | **优先回合法 `next`**（保住 `/device?user_code=` 深链），无 `next` 才回 `/dashboard` |
| Q2 | OIDC 未启用体验 | **B+：新标签页直跳**（`<a target="_blank" rel="noreferrer">`）；**不做**前置探测；显式口径「`next` 对 OIDC 通道不适用」 |
| Q3 | 门户组组标题 | **不加**（保持 M4a 无标题平铺；零回归硬约束） |
| Q4 | `/device` 交付深度 | **完整实现**（认领 + 批准 + 拒绝 + 四态） |
| Q5 | `/dashboard` 临时页 | **按 role 裁剪**入口（`role >= 10` 才显示审核入口） |
| Q6 | 路由形态切分 | **3 真页 + 1 重定向 + 7 占位** |
| Q7 | 占位页文案 | 中性文案；批次号 **DEV-only 硬编码**（不进生产 i18n 字典） |
| Q8 | 批 plan Task 粒度 | 按能力切 **10 Task**（一事一提交；T5 门户面改动独立成 Task）——**T2 含 `sanitizeNext`（反向守卫的消费点落 T6 `/login`，T2 只提供判定函数与 401 侧 `next` 生成点）** |
| Q9 | 出口件 ④ 人工清单 | **七项**（§9.4） |
| Q10 | dogfood 断言 | **六组** + `NO JS ERRORS`（§9.3） |
| Q11 | 种子数据 | **3 账号** `m4b2_{super,mgr,user}`，口令从 env 读（§9.5） |
| Q12 | 首帧形态 / 第③类消费点 | **壳先渲染 + Skeleton**；401 第③类本批**仅登录表单**（机制预留） |
| Q13 | 是否先出原型 | **不做原型**，直接落真仓（视觉真值已 SSOT、官方件照抄） |

### 2.2 承接主 design 的跨批契约（引用不复制）

- **显隐判定** → 主 design §4（门户组 + 三组矩阵、组级 + 条目级门槛、直访行为）
- **路由与页面职责** → 主 design §5.1/§5.2（11 条；`/device` 行含 device 端点清单）
- **视觉真值** → M4a design **§4.4**（色彩/字阶/组件真值；控制台特有值：表格密度 40 · 抽屉宽 560）
- **设备授权页基址与 dev 口径** → 主 design **§3.4**（`PUBLIC_BASE_URL` 保持 API 源；dev 用 web 源直达 + 手输码）
- **401 三分类与接线点** → 主 design §2.4 **U3**（`PROTECTED_PREFIXES` 4 前缀；单点在 `apiGet` 层；`useApi` 零改动）
- **device 端点契约** → 主 design **§7.1** device 三行 + 错误族注
- **i18n 组清单** → 主 design **§11**（既有 7 组 + 本批新增 2 组）
- **OIDC 通道实测路径** → 主 design §3.1 + §7.2 **G6**（已决 B+）

### 2.3 官方件装配清单（实测齐备，零新增依赖）

| 用途 | 官方件 | 实测 |
|------|--------|:--:|
| 登录卡 | `card` · `field` · `input` · `label` · `button` | ✅ 已落仓 |
| 两 tab | `tabs` | ✅ |
| 错误提示 | `alert` | ✅ |
| 提交中 | `spinner` | ✅ |
| 设备页 | `empty`（占位页复用）· `alert` · `button` · `card` | ✅ |
| 用户区 | `avatar` · `dropdown-menu` · `sidebar`（`SidebarFooter`/`SidebarMenuButton`） | ✅ |
| 首帧 | `skeleton` | ✅ |
| 轻提示 | `sonner`（`Toaster` 单例 M4b-1 已挂根 `main.tsx:45`） | ✅ |

## 3. 件与路由规格

### 3.1 新建件（**9**）

| # | 路径 | 职责 | 关键实现点 |
|---|------|------|-----------|
| 1 | `src/auth/AuthProvider.tsx` | 会话上下文 + 三态 + 401 钩子注册 | context + `useAuth()`；挂载即 `me()`；注册 `onUnauthorized`；`loading` 不外泄 anon |
| 2 | `src/auth/roles.ts` | 角色判定单点 | `ROLE`（0/1/10/100）+ `hasRole(role, min)`；`null/undefined` → `false`；**禁页面散写 `role >= N`** |
| 3 | `src/api/auth.ts` | `login` / `logout` / `me` | `POST /api/auth/sign-in/aih`（**JSON**——`content-type: application/json` + `{username,password}`，实测 `app.test.ts:115-119`）· `POST /api/auth/sign-out` · `GET /api/auth/me`（`cache:false`） |
| 4 | `src/pages/Login.tsx` | `/login` 独立版式 | §5.1 |
| 5 | `src/pages/Device.tsx` | `/device` 独立版式 | §5.2 |
| 6 | `src/pages/Dashboard.tsx` | `/dashboard` 临时落地页 | §5.3（纯静态、role 裁剪） |
| 7 | `src/components/ui/UserMenu.tsx` | 用户区（侧栏底部） | §6.2 |
| 8 | `src/components/console/ComingSoon.tsx` | 占位页（含内容槽） | §5.4 |
| 9 | `src/auth/next.ts` | **路由安全单点**（`sanitizeNext` + `PROTECTED_PREFIXES` + `isProtectedRoute`；v1.2 补件 · **v1.5 扩职责**） | **纯函数 · 零 import**（`api/client` 可单向引用不成环）· `sanitizeNext`：仅接受**单个 `/` 开头的站内相对路径**（拒 `//` / 协议 / 跨源 / `\` / `%5C` / 控制字符）· **支持 query**（保码）· 非法 → `null`；`isProtectedRoute(pathname)`：4 个 **路由**前缀**段边界**匹配（**判定域 = 当前路由**，Q14）· 消费方 = `Login`（反向守卫）/ `Device`（保码）/ `api/client`（401 判定），`AuthProvider` 生成 `next` 时亦复用 |

### 3.2 改造件（6 处）

| # | 文件 | 改什么 | 依据 |
|---|------|--------|------|
| 1 | `components/ui/TopBar.tsx` | **删**「登录」占位 `<span>`（用户区移侧栏底部）｜**删**产品元信息三项与 `TypeIcon` import 残留 | 主 design §4 · P11 |
| 2 | `components/ui/SideNav.tsx` | **新增三组**（官方标准形态 `SidebarGroup` > `SidebarGroupLabel` + **`SidebarGroupContent`** > `SidebarMenu`；无需组标题的门户组保持现形态）｜底部产品元信息三项 → **用户区**｜**删** `APP_VERSION` 死常量 | 主 design §4 · U1 · P11 |
| 3 | `main.tsx` | 路由 **11 条**（`/login` `/device` 独立版式；其余入 `AppShell`）｜模块级 `bootstrapAuth()`（**不 `await`**） | 主 design §5.2 · U3 |
| 4 | `api/client.ts` | 增 **`apiPost`**（复用 `doFetch`）｜**401 单点分流**（`doFetch` 错误分支）｜`ApiGetOptions` 与 `apiPost` 选项各增 **`skipAuthRedirect?: boolean`**（§4.2 ④）｜导出 **`invalidateCache(prefix?)`**｜`sanitizeNext` 落 **`auth/next.ts`**（件 9，不放在本文件）。**执行期登记（T1 落地）**：`apiPost` + `doFetch` 参数化 + **`setUnauthorizedHandler`（401 登记口）** 已随 **T1** 落地（解 T1↔T2 循环依赖；登记口落本文件而非 `AuthProvider` 导出，防 ESM 循环）——401 **四分类消费**仍在 T2 | 主 design U3 · N2 |
| 5 | `i18n/zh.ts` + `i18n/en.ts` | 新增 `login`/`device` 两组；`errors` +9 码；`dashboard` +2 键；`navigation` +3 组标题键 −4 元信息键 | §10 |
| 6 | `components/ui/RoleGuard.tsx` | **删**本地 `ROLE` 常量（真码 `:10`——迁入 `auth/roles.ts`）｜**删 `role` prop**（改内部 `useAuth()`）｜接三态：`loading` → `Skeleton`、`anon` → `/login?next=`、档位不足 → `/dashboard` + `location.state.notice` | §4.5 · 主 design P4/P6 |

> **不改**：`AppShell.tsx`（结构零变更——侧栏/顶栏/`Outlet` 布局原样）· `hooks/useApi.ts`（保持通用薄 hook）·
> `components/ui/{Badge,Pagination,Spinner,EmptyState,ErrorState,MarkdownRenderer,AssetAvatar,LanguageSwitcher}.tsx`（直接复用）。

### 3.3 路由骨架（11 条，本批形态）

| 路径 | 本批形态 | 后续批 |
|------|---------|--------|
| `/login` | **真页**（独立版式，不入 AppShell） | — |
| `/device` | **真页**（独立版式） | — |
| `/dashboard` | **临时落地页**（`ComingSoon` 带内容槽） | M4b-4 换三卡 |
| `/dashboard/assets` | `ComingSoon` 占位 | M4b-4 |
| `/dashboard/submissions` | `ComingSoon` 占位 | M4b-3 |
| `/dashboard/tokens` | `ComingSoon` 占位 | M4b-3 |
| `/reviews/:id` | `ComingSoon` 占位（**不进 `/admin` 段**） | M4b-5 |
| `/admin` | **重定向** → `/admin/reviews` | — |
| `/admin/reviews` | `ComingSoon` 占位 | M4b-5 |
| `/admin/labels` | `ComingSoon` 占位 | M4b-6 |
| `/admin/audit` | `ComingSoon` 占位 | M4b-6 |

**不加 `*` 兜底路由**（与 M4a 现状一致；未知路径落空白——本批不引入新行为）。

> **T3 形态注（v1.6）**：`/login` `/device` 两条在本批 **T3 阶段 = `ComingSoon` 独立版式占位**（不入 `AppShell`），
> **T6/T7 各需 `Modify main.tsx` 把元素换成真页**（原 plan 未列该文件 ⇒ T3 落地时补）；
> 7 条占位路由的 title 复用既有组键、description 统一 `common.comingSoon`；批次号经 `main.tsx` 的
> **`DEV_BATCH` 常量表**在 `import.meta.env.DEV` 下给出（Vite 静态替换 + 常量折叠 ⇒ 生产产物零字面量）。

**守卫包裹与 `minRole` 映射（Q15）**：

| 路由段 | 守卫 | `minRole` | 说明 |
|--------|------|:--:|------|
| `/dashboard` + `/dashboard/*` | `RoleGuard`（**布局路由**，一条包 4 条） | `ROLE.USER`（1） | 未登录 → `/login?next=`；1 档是最低登录档，档位不足不可能 |
| `/reviews/:id` | `RoleGuard` | `ROLE.USER`（1） | 提交人可达（撤回入口）；**不进 `/admin` 段** |
| `/admin` + `/admin/*` | `RoleGuard`（**布局路由**，一条包 4 条） | `ROLE.ADMIN`（10） | 档位不足 → `/dashboard` + `location.state.notice` |
| `/login` · `/device` | **无守卫** | — | 独立版式；`/login` 由**反向守卫**处理（§4.3） |
| 门户 5 条（`/` `/skills` `/mcps` `/agents` `/assets/:slug`） | **无守卫** | — | 公开读面（零回归） |

- **嵌套顺序**：`/admin` 的 `<Navigate to="/admin/reviews" />` **放在守卫内**——未达档先被弹回 `/dashboard`，不白跳一层

## 4. 认证机制规格（本批核心）

### 4.1 `AuthProvider` 三态与首帧

- 状态机 `loading | anon | authed`（主 design U3）；`authed` 携带 `{ user: { id, displayName }, role }`
- **启动**：`main.tsx` 模块级 `bootstrapAuth()`（**不 `await`**，主 design U3「首帧预热」）→ 内部 `me()`；`/me` **禁缓存**（`cache:false`）
- **首帧渲染（Q12 拍板）**：**壳先渲染**（`AppShell` + 门户组 + 内容区照常）——三组与用户区在 `loading` 期渲染 **`Skeleton`**，
  `loading` 结束**就地替换**；**绝不**在首帧渲染「未登录」形态再切换（那就是「闪」）
- `anon` → 三组均不渲染（主 design U1：「`me` 未返回前三组均不渲染」）
- **不做静默续期**；过期由任意请求 401 触发分流（§4.2）
- **`/me` 非 401 失败（网络断 / 5xx）**（Y2 补）：落 **`anon`**（**不阻塞壳渲染**；不自动重试风暴）——已登录用户在断网下会看到未登录形态，**登记为已知代价**；恢复由下一次任意请求触发重新探测

### 4.2 401 三分类分流（接线点：`api/client.ts` 的 `doFetch`）

主 design N2 拍板「**单点在 `apiGet` 层**」——本批落地为 `doFetch`（`apiGet` 与新增 `apiPost` 的共用底层）的 `!res.ok` 分支，
保证「一个拦截点、两条调用路径都覆盖」：

```
doFetch → !res.ok 且 status === 401：
  ① path === '/api/auth/me'          → 交 AuthProvider 自身消费（置 anon，**不跳转**）
  ② 当前路由 ∈ PROTECTED_PREFIXES   → onUnauthorized(path + search) → 置 anon + navigate(`/login?next=${encodeURIComponent(path + search)}`)
  ③ 其余（公开段）                    → 静默当 anon（不跳转；页面自行展示 ErrorState）
  ④ 调用方 opts.skipAuthRedirect=true → 完全跳过分流（401 交调用方 inline 展示）
```

> **Q14 判定域写实（2026-09-16 grilling · 实测事实）**：全仓 `apiGet` 的 path 一律是 **API 路径**
> （`/api/assets` · `/api/labels` · `/api/stats` · `/api/assets/:slug/versions/…`——`api/*.ts` 逐个核过），
> 而 `PROTECTED_PREFIXES` 是**路由前缀** ⇒ 二者**不同域**，拿请求路径匹配**永不命中**（401 分流整体失效）。
> ⇒ **落地口径**：`doFetch` **只负责**「发现 401 + 上抛 `path`/`search`」；**判定发生在 `AuthProvider` 的
> `onUnauthorized(path, search)` 内，取 `window.location.pathname` 匹配 4 个路由前缀**
> （与主 design N2「按路由分流」口径一致）。

- `PROTECTED_PREFIXES`（与主 design §5.2 同源）= `/dashboard` · `/admin` · `/reviews` · `/device`（**4 个**）——
  **语义 = 前端「路由」前缀**（不是 API 路径前缀，见下行 Q14）
- **第 ④ 类本批唯一消费点 = 登录表单**（`auth.invalid_credentials` 等 → 表单内 `Alert`，不退化为全局跳转）
- 缓存：`/me` 禁缓存；**登录/登出清全量**（`invalidateCache()`）；新增**按前缀失效**能力（`invalidateCache(prefix)`）——
  **语义 = 语言无关的 `path` 前缀**（内部缓存键为 `${lang} ${path}`；若按**完整键**前缀匹配会永不命中——
  T2 执行期细化，见批 plan T2 落地记录）

### 4.3 反向守卫 + `sanitizeNext`

- 已登录（`authed`）访问 `/login` → `<Navigate to={sanitizeNext(next, origin) ?? '/dashboard'} replace />`（**Q1：`next` 优先**）
- `sanitizeNext(raw)`：**仅接受以单个 `/` 开头的站内相对路径**（拒 `//`、拒含协议、拒跨源、
  **拒含 `\` 或 `%5C`**——`/\evil.com` 与 `/%5Cevil.com` 会被浏览器解析为**协议相对 URL**（= 开放重定向），
  **Q16 安全边界**；另拒含**控制字符**及其编码形态 `%00`–`%1f`）；**形态约束 = `^/[^/\\]`**（首字符单个 `/`，次字符既非 `/` 也非 `\`）；
  **落点 = `auth/next.ts`（件 9）· 单参**——原签名 `(raw, origin)` 的 `origin` **冗余**（「仅站内相对路径」
  规则已排除一切跨源形态；T2 执行期简化，见批 plan T2 落地记录）；
  **支持 query**（`/device?user_code=XXXX` 回跳不丢码）；非法 → `null`（调用方回落 `/dashboard`）
- 未登录访问受保护路径由 §4.2 ② 生成 `next`；`next` 生成点**唯一**（`doFetch` 401 分支）

### 4.4 登出与会话

- 登出：`POST /api/auth/sign-out`（官方端点，唯一）→ 清会话上下文（置 `anon`）+ `invalidateCache()`（全量）→ `navigate('/')`（U2：登出回首页）
- 会话有效期：服务端 8h（`SESSION_TTL_HOURS`，`better-auth.ts:91` 实测消费）；过期 → 普通 401 → §4.2 分流
- **丢输入为已知代价**（不做草稿保护，主 design U3）

### 4.5 角色判定单点 `auth/roles.ts`

```ts
export const ROLE = { GUEST: 0, USER: 1, ADMIN: 10, SUPER_ADMIN: 100 } as const;
export function hasRole(role: number | null | undefined, min: number): boolean;  // null/undefined → false
```

- 与服务端 `auth/roles.ts` 的 `ROLE_LEVEL`（`user:1` / `admin:10` / `superadmin:100`）**同值**；`GUEST=0` 前端保留但**无特例分支**
- **禁页面散写 `role >= N`**——侧栏组/条目、用户区徽章、`/dashboard` 入口、`RoleGuard` 全部经 `hasRole`
- `RoleGuard`（M4b-1 已交付，`components/ui/RoleGuard.tsx`）**改造三点**：
  ① **删本地 `ROLE` 常量**（真码 `:10`——迁入本批 `auth/roles.ts`，角色常量单点化）
  ② **删 `role` prop**（真码 props 现为 `{minRole, role, children}`、`role` 由调用方传入）→ 改为**内部 `useAuth()` 消费**，
     不再经调用方中转（对齐主 design **P4** 拍板「不保留 `role` prop」）
  ③ **接三态**：`loading` → `Skeleton`；`anon` → `/login?next=<path+search>`；档位不足 → `/dashboard` + `location.state.notice`
- **保留**：`minRole` prop 与 `children ?? <Outlet/>` 语义（布局路由用法不变）；`role === null | undefined` 仍视为未登录

## 5. 页面规格

### 5.1 登录页 `/login`（线框见主 design §12）

- 版式：**独立**（不入 `AppShell`）——顶部品牌 `AI X Hub` + 语言切换器；中部居中 `Card`
- **`loading` 期（`bootstrapAuth` 未返回）**（Y3 补）：渲染**骨架**、**不渲染表单**——避免「表单闪现 → 反向守卫跳走」的竞态闪烁
- **两 tab**（官方 `Tabs`）：「常规登录」/「OAuth 登录」
- 常规登录：`Field` + `Input`（用户名/密码）+ `Button`；`autocomplete="username"` / `"current-password"`；Enter 提交；
  提交中 `disabled` + `Spinner`
- **请求形态**（实测 `app.test.ts:115-139`）：`POST /api/auth/sign-in/aih`，`content-type: application/json`，
  body `{username, password}`；成功 200 `{user, session}` + `Set-Cookie: better-auth.session_token=…`
- **Origin 前提**：浏览器写请求自动带 `Origin` ⇒ **dev 必须配 `AUTH_TRUSTED_ORIGINS`（含 `http://localhost:5173`）**，
  否则 403 `auth.csrf_failed`（主 design §3.1）；⚠ **F2 登记**：`.env.example:36` 现为空值（`AUTH_TRUSTED_ORIGINS=`）⇒ 按样例建 `.env` 会**恒 403**，dev 须显式填入 `http://localhost:5173`（样例注释补 dev 值属**仓库改动**，待批）
- **失败态全部 inline**（`skipAuthRedirect`，§4.2 ④）：401 `auth.invalid_credentials`（错口令）· 403 `auth.csrf_failed` / `auth.ldap_denied`
  / `auth.forbidden` · 429 `auth.rate_limited` · 409 `auth.email_conflict` · 400 `auth.email_missing`——`errors` 表按 code 本地化，未命中兜底
- OAuth tab（Q2 = B+）：说明文案 + `<a target="_blank" rel="noreferrer" href="/api/auth/oidc/authorize">`；
  **未启用时落在独立标签页的 JSON 404**（可关闭、不破坏登录页）；**不做前置探测**（`GET /authorize` 有写 `oidc_state` cookie 的副作用）
- 登录成功：`invalidateCache()` → 重取 `/me` → `navigate(next ?? '/dashboard')`
- **不显示注册入口**；**无侧栏/无用户区**；反向守卫见 §4.3
- 用户名为**中性文案**（不是「邮箱」——企业目录通道用 `sAMAccountName`）

### 5.2 设备授权页 `/device`（线框见主 design §12；基址口径见主 design §3.4）

- 入参：`?user_code=`（预填 + 自动认领）或不带（手输）
- **四态**（Q4 = 完整实现）：

| 态 | 触发 | 呈现 |
|----|------|------|
| ① 输入 | 无有效码 / 码被拒 | `Field` + `Input`（格式提示 `XXXX-XXXX`）+ 「确认」`Button` |
| ② 已认领 | `GET /api/auth/device?user_code=` 200 | `client_id` / 请求范围（`scope` 空 = 全量）/ 有效期（`expires_in` = 30 分钟）+ 「批准」/「拒绝」 |
| ③ 已处理 | 批准/拒绝成功 | 「已批准」/「已拒绝」（终态，不再给动作） |
| ④ 错误 | 无效/过期码 · 网络错 · （他人已认领 —— **待实测**） | 码级错误文案（`Alert`），回到①；**他人已认领分支仓内无据**（Q18②）——T7 实测，若无此态则删 |

- 端点（主 design §7.1 三行）：`GET /api/auth/device?user_code=`（**下划线**）· `POST /api/auth/device/approve` `{userCode}`（**驼峰**）· `POST /api/auth/device/deny` `{userCode}`
  —— **两处命名不同是实现坑**，落到 `api/auth.ts` 内封装，页面不直接拼参数
- 未登录访问 → §4.2 ② 生成 `next=/device?user_code=…`（**保码**，Q1）→ 登录后回跳续流 ✓
- 已处理态**刷新**（URL 仍带 `?user_code=`，F1 登记）：呈现**以服务端返回为准**（可能回已处理/待处理态）——T7 落地实测并记录，不预设
- **错误体形态（Q18① · 实测）**：device 端点错误为 **OAuth 风格 `{error, error_description}`**
  （`http/device-flow.test.ts:26,29`——未认领直接 approve → 400 `DEVICE_CODE_NOT_CLAIMED`），
  **不是本仓的 `{code, message}`** ⇒ `ApiError` 归一读 `body.code` 会**退化为 `http_400`**。
  **适配点 = `api/auth.ts` 的 device 封装**（把 `error` 映射为 `code`，或页面按 `error` 值本地化）——
  **页面不直读 `code`**；`errors` 表按映射后的码本地化
- **「他人已认领」态（Q18② · 仓内无据）**：该文案在服务端**无对应错误码**（`auth/errors.ts` 12 码无 device 专属；
  `grep claimed` 零命中）⇒ **T7 实测确认存在性**；**若无此态则删除该分支与 `claimedByOther` 键**（不臆造契约）
- 本批**不消费** CLI 两端（`/device/code`、`/device/token`）

### 5.3 工作台临时落地页 `/dashboard`（Q5）

- `ComingSoon` 组件的**内容槽形态**（§5.4）：欢迎语（含 `displayName`）+ 入口按钮组
- **按 role 裁剪**（`hasRole`）：`role >= 1` → 我的资产 / 我的令牌；`role >= 10` → 审核队列
- **消费 `location.state.notice`（Q17）**：挂载时读 `state.notice` → `sonner` `toast.warning(...)` →
  立即 `navigate(pathname, { replace: true, state: null })` 清 state（**防刷新重复弹**）——
  **不因此发任何网络请求**（仍属下述「零请求」）
- **纯静态、零请求**（不调 `/api/reviews`、`/api/audit`——那些归 M4b-4 三卡）
- M4b-4 用三卡替换本页（本页即为「不白屏」的过渡形态）

### 5.4 占位页 `ComingSoon`（Q6/Q7）

- **官方件族落位**（真码 `empty.tsx:93` 导出 6 件）：`Empty` > `EmptyHeader`（`EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`）；**内容槽 = `EmptyContent`**（官方 `data-slot="empty-content"`，`/dashboard` 的入口按钮组放此处）
- **两种用法（同件不同 props）**：① 7 条占位路由只传 `title`/`description`（中性文案，无 `EmptyContent`）② `/dashboard` 传 **`EmptyContent` 内容槽**（欢迎语 + 入口按钮组）
- DEV 标注：`import.meta.env.DEV` 门控的小字批次号（如「M4b-3」）——**硬编码、不进生产 i18n 字典**（公开仓纪律）
- 占位页**不发任何业务请求**（主 design P1-P5：「不预埋空业务页」）。
- **落地（v1.6 · T3）**：件 `components/console/ComingSoon.tsx` 已落仓（官方 `Empty` 族 6 件 + `EmptyContent`
  内容槽 + DEV 批次号）；批次号由调用点在 **`DEV_BATCH` 常量表**内以 `import.meta.env.DEV ? {…} : {}` 形式给出
  ⇒ 构建后 `grep -rl 'M4b-' apps/web/dist/` **零命中**（实测）；`ComingSoon` 的 `batch` 为可选 prop。

## 6. 壳与用户区规格

### 6.1 侧栏显隐矩阵（实现锚点；唯一源为主 design §4）

| 组 | 显隐条件 | 条目 | 本批形态 |
|----|---------|------|---------|
| **门户**（M4a 既有） | **恒显示**，**无组标题**（Q3） | 首页 / 技能中心 / MCP / 专家 | 现状保留（零改动源码） |
| **个人** | `authed`（`loading` 期不渲染） | 工作台 / 我的资产 / 我的提交 / 我的令牌 | 4 条全 `Link`（目标页为占位） |
| **管理** | `hasRole(role, 10)` | 审核队列 / 审计浏览 | 同上 |
| **超级管理** | `hasRole(role, 100)` | 标签管理 / 系统设置（占位条目）/ 用户管理（占位条目）——**共 3 条** | 同上 |

- 组级 + 条目级**同取 `hasRole`**；**组内无可见条目 ⇒ 整组不渲染**（主 design §4）
- 图标态（`collapsible="icon"`）：**随官方 `SidebarGroupLabel` 默认行为**（官方默认即真值；**不自写隐藏类**；T4 落地时记录实测值，不预设结论）——主 design U1 已断言「图标态隐藏组标题」，以官方实现为准
- **混排结构（F3 登记）**：门户组（裸 `SidebarMenu`，Q3 零回归）× 三组（`SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu`）在同一 `SidebarContent` 内**间距/分段视觉**未预设 ⇒ **T4 落地实测 + 用户确认观感**（不为统一而改门户组结构）
- **落地实测（v1.7 · T4）**：四档显隐全绿（未登录 = 门户组 only · 1 档 +个人 4 条 · 10 档 +管理 2 条 · 100 档 +超级管理 **3 条**）；
  **F3 计算值** = `SidebarContent` gap **4px** · 门户组底→首组顶 **4px** · 组内 padding **8px** · 组标签高 **32px**（观感待用户确认）
- **F4 登记（v1.7 · T4 实测异常 · 待深挖）**：`collapsible="icon"` 下 `data-state=collapsed` 成立，但**部分
  `group-data-[collapsible=icon]` 变体未生效**——`hidden` **生效**（元素 computed width 0），而 `size-8!`（按钮仍 178px）·
  `-mt-8`/`opacity-0`（组标题 marginTop 0px / opacity 1，**未隐藏**）· `w-[calc(var(--sidebar-width-icon)+…)]`
  （container 仍 204px）**未生效**。已排除：mobile 视口（1440×900 复测同）· 祖先 `.group[data-collapsible=icon]` 缺失
  （`closest()` 命中）· M4b-2 引入（本批未改 `Sidebar`/`SidebarProvider` 配置）

### 6.2 用户区（`SidebarFooter`，`UserMenu.tsx`）

| 状态 | 呈现 |
|------|------|
| `loading` | 行占位骨架（通用 `Skeleton`；官方另有 **`SidebarMenuSkeleton`** 可择用——`sidebar.tsx:687`） |
| `anon` | `SidebarMenuButton` + `Link to="/login"`（`navigation.login` 键**已存在**，无需新增） |
| `authed` | `SidebarMenuButton size="lg"`：`Avatar`（displayName 首字）+ displayName + **角色徽章** + `DropdownMenu`（我的资产 / 我的令牌 / ── / 登出） |

> **落地实测（v1.7 · T4）**：四态齐 —— `loading` 骨架（`sidebar-menu-skeleton`；CDP 注入延迟 `/me` 1.5s 采样序列
> `404ms skeleton → 3406ms authed`，**全程无 ANON 形态** = 「不闪」双证）· `anon` = `Link /login` ·
> `authed` = 菜单 **「我的资产 / 访问令牌 / 登出」**（登出链实测全通：URL → `/` · 用户区 → 「登录」· 三组 → 0 ·
> `/me` → 401）。**徽章键落定** = `navigation.roleUser`/`roleAdmin`/`roleSuperAdmin`（3 键，用户 2026-09-16 拍板）
> —— 图标态表现随 **F4** 登记（部分变体未生效）
| 图标态 | 只留头像（官方 `tooltip`，仅收起态显示） |

- 角色徽章文案取 `navigation` 新增 3 键之一（按档位映射）——⚠ **T1 落地时发现的缺口**：§10 的 3 键是**组标题**（`groupPersonal`/`groupAdmin`/`groupSuperAdmin` = 「个人 / 管理 / 超级管理」），而徽章语义应表达「用户 / 管理员 / 超级管理员」⇒ **3 键不够用**。**T4 落地时定**：补 3 徽章键（`roleUser`/`roleAdmin`/`roleSuperAdmin` ⇒ 净增 **34 → 37**）或 **徽章只显色不显字**（零新增键）
- 侧栏底部**原产品元信息三项删除**（Star / 文档·反馈 / 版本号行）

### 6.3 占位条目交互（P10）

- 「系统设置」「用户管理」为**占位条目**：`<button>`（非 `Link`）+ 点击弹 `sonner` 轻提示（**复用 `common.comingSoon`**
  ——**v1.7 订正**：原写 `admin.phase2Notice`，该键**仓内不存在**（`grep` 零命中），复用既有键零新增）
- **不建路由、不建页面**（防预埋空页）

## 7. 接口变更总览（服务端面）

**本批服务端改动 = 0 行**（主 design R5 / §3.0 载体行）。逐条列明**消费的既有端点**（新增消费，非新增端点）：

| 端点 | 用途 | 阶段来源 |
|------|------|---------|
| `POST /api/auth/sign-in/aih` | 常规登录（自绘目录凭证插件，三路分派） | M4b-pre |
| `POST /api/auth/sign-out` | 登出 | M4b-pre（官方） |
| `GET /api/auth/me` | 会话探测（`{user:{id,displayName}, role}`） | M1（M4b-pre 后为薄层 `http/auth-routes.ts:17-28`） |
| `GET /api/auth/device?user_code=` | 设备授权认领 | M4b-pre（官方 `deviceAuthorization`） |
| `POST /api/auth/device/approve` | 设备授权批准 | M4b-pre（官方） |
| `POST /api/auth/device/deny` | 设备授权拒绝 | M4b-pre（官方） |
| `GET /api/auth/oidc/authorize` | OAuth tab 跳转入口 | M1 阶段二 |

> 契约细节（响应形状 / 错误码 / 错误族）**引用主 design §7.1**（含 device 三行），不复制。

## 8. UI-UX 变动总览（本批用户可见变化）

| 面 | 现状 | 变动 |
|----|------|------|
| 顶栏 | 品牌 + 占位「登录」+ 语言 + 产品元信息 | 品牌 + 侧栏触发钮 + 语言切换器（删占位与元信息） |
| 侧栏 | 门户 4 条平铺 + 底部元信息 | **门户组 + 三组（个人/管理/超级管理）+ 底部用户区** |
| 登录 | **无**（点击无响应） | `/login` 独立页（两 tab + 表单内错误 + `next` 回跳） |
| 设备授权 | **无** | `/device` 独立页（四态） |
| 工作台 | **无** | `/dashboard` 临时落地页（role 裁剪入口，M4b-4 换三卡） |
| 其余 7 路由 | **无**（直访空白） | `ComingSoon` 占位（DEV 小字标批次号） |
| 会话感知 | **无** | 首帧不闪 · 401 三分类 · 过期跳 `/login?next=` · 登录/登出清缓存 |

## 9. 回归面与验证口径

### 9.1 门户零回归（硬约束）

- **四条门户读面行为语义不变**（措辞精确化——非「逐字」）：`useApi` / `apiGet` 的对外**行为语义**（三态 + abort + 语言感知缓存 + 失败不污染缓存）不变；
  **类型面为加性扩展**（`ApiGetOptions` 增**可选** `skipAuthRedirect`，向后兼容）——新逻辑落在 **`doFetch` 的新增分支**（401）与**新增 `apiPost`**，不改 `apiGet` 既有执行路径
- **证据**：`docs/smoke/scripts/m4a-dogfood.ts`（36 条）**重跑全绿** + 门户五路由肉眼零变化

### 9.2 门禁与冒烟顺序（复现 CI）

`bun install --frozen-lockfile` → `typecheck` → `lint` → `format:check` → `build` → `db:migrate` → `test`
（**`CI=true` + 单库 `ai_asset_hub`**；测试库先迁移）；web 侧 = `typecheck` + SSR 渲染冒烟 + Edge headless dogfood（零新增依赖）。

### 9.3 dogfood 六组断言（Q10）

| 组 | 断言 |
|----|------|
| G1 | 未登录：门户组在 · 三组均不渲染 · 用户区显示「登录」入口 |
| G2 | `role=USER`：仅「个人」组 · 直访 `/admin/*` → 弹回 `/dashboard` + 提示 |
| G3 | `role=ADMIN`：+「管理」组 |
| G4 | `role=SUPER_ADMIN`：三组全 + 占位条目（系统设置/用户管理）可见 |
| G5 | 登录 → 用户菜单（displayName + 角色徽章）→ 登出 → 回首页 |
| G6 | 设备授权：输入码 → 认领（`status:'pending'`）→ 批准 → 「已批准」；无效码 → 错误态 |
| — | 全程 **`NO JS ERRORS`**（沿用 M4a 惯例） |

> **401 单列口径（v1.6 · M4b-2 引入）**：未登录门户**必然**发 `/api/auth/me` 会话探测（§4.1：未登录 → `anon`）
> ⇒ console 出现 `401` 网络 log。脚本按 T25 既有机制扩白名单（`netLogs` 404 / **`authNetLogs` 401** 双桶单列），
> **不计入 `errors`**；JS 错误与一切未预期 log 的严格判定不变。

### 9.4 出口件 ④（dogfood/观感）人工清单 —— 七项（Q9，用户实机确认）

① 未登录访 `/admin/reviews` → `/login?next=` → 登录后**回原页** ② 错密码 → **表单内 inline 错误**（不跳页）
③ 登录成功 → 用户区 displayName + 角色徽章；**硬刷新仍在登录态且不闪** ④ 登出 → 回首页、用户区变「登录」
⑤ `role=USER` 直访 `/admin/labels` → 弹回 `/dashboard` + 轻提示 ⑥ **侧栏四档显隐**（未登录 / 1 / 10 / 100）逐档核对
⑦ `/device?user_code=` 认领 → 批准 → 页面转「已批准」

### 9.5 种子数据（Q11，**写库需用户授权**）

- 3 账号：`m4b2_super`（superadmin）· `m4b2_mgr`（admin）· `m4b2_user`（user）
- 口令**从 env 读**（**单一变量 `SMOKE_M4B2_PASSWORD`**——Q19：三账号同口令，脚本 / dogfood / 文档三处一致）——**仓库内不落任何口令**
- 脚本 `docs/smoke/scripts/m4b2-seed-roles.ts`：按前缀 `like` 清理 ⇒ **可重放**（**v1.6：脚本已落仓并跑通**——
  运行须显式 `--env-file=apps/server/.env`（**仓库根无 `.env`**，`DATABASE_URL` 只在 `apps/server/.env`）；
  依赖 `drizzle-orm` **不直接从脚本 import**（`docs/` 非 workspace 包 ⇒ 经 `apps/server/**` 间接解析）
  **落点写实（真码）**：表 **`user`**（`apps/server/src/db/schema/auth.ts:43`）· 按 **`username`**（`:54`）前缀 `m4b2_` 匹配 · 写入 **`role`**（`:56`）与 **`status`**（`:61`，默认 `ACTIVE`）；
  **清理须先删依赖行**（官方 `session` / `account` 表 FK）再删 `user` —— **禁全表 `delete`**（按前缀 `like` 筛子集，可重放）

## 10. i18n 变更规格

**新增 2 组**（`login` **8 键** / `device` **14 键**）；`errors` **+9 码**；`dashboard` **+2 键**；`navigation` **+3 键 / −4 键**（zh 真源 / en 完整对齐，缺键即编译错）。

> **键数口径（单一来源，防两处并读出错）**：新增两组 **22 键**（`login` 8 + `device` 14）+ `errors` **+9 码** + `dashboard` **+2 键**（`submissions` **T3 已落** / `welcome` T8）+ `common` **+2 键**（`comingSoon` + `noPermission`，**T3 落**）+ `navigation` **净 −1**（+3/−4）⇒ **净增 39 键**（**v1.7 更新**：T4 执行期新增 `navigation` 徽章 3 键 + 补 2 处遗漏键 `navigation.logout` /
> `admin.settings`——design 要求了 UI 但本表未列；式 = 22 + 9 + 2 + 2 + 6（navigation：3 组标题 + **3 徽章**）
> − 4（元信息待 T5 删）+ 2（遗漏补缺））。
> 本文件 §13 **v1.0 修订行的「i18n 22 键 + 9 码」是两组新增的窄口径**（史实，不改）——总量以本条为准；T9 落地后按实测回填实际键数。

| 组 | 键 | 说明 |
|----|-----|------|
| `login`（8） | `title` · `tabLocal` · `tabOidc` · `username` · `password` · `submit` · `submitting` · `oidcHint` | 两 tab 与表单 |
| `device`（14） | `title` · `codeLabel` · `codePlaceholder` · `confirm` · `clientLabel` · `scopeLabel` · `scopeAll` · `expiresLabel` · `approve` · `deny` · `approved` · `denied` · `claimedByOther`※ · `invalidCode` | 四态文案（※ **键去留待 T7 实测**——Q18②：若无「他人已认领」态则删键，`device` 组 14 → 13、净增 **34 → 33**） |
| `errors`（+9） | `auth.invalid_credentials` · `auth.user_disabled` · `auth.user_pending` · `auth.ldap_denied` · `auth.email_missing` · `auth.email_conflict` · `auth.csrf_failed` · `auth.session_expired` · `oidc.not_configured` | （`auth.rate_limited` M4a 已落；`auth.forbidden`/`auth.oidc_*` 见主 design §7.2 G6） |
| `common`（**+2**） | `comingSoon` · `noPermission` | **T3 落**：7 条占位页 description + 守卫档位不足 notice |
| `dashboard`（+2） | `submissions`（**T3 落**）· `welcome`（T8） | 侧栏条目 + 临时页欢迎语 |
| `navigation`（+3/−4） | **+** `groupPersonal` · `groupAdmin` · `groupSuperAdmin`；**−** `starRepo` · `footDocs` · `footFeedback` · `versionLine` | 组标题；元信息三项删除 |
| `navigation`（**+4**，T4 落） | `roleUser` · `roleAdmin` · `roleSuperAdmin`（徽章）· `logout`（用户菜单） | T4：角色徽章 3 键（用户拍板）+ 登出项 1 键（遗漏补缺） |
| `admin`（**+1**，T4 落） | `settings` | 超管组「系统设置」条目（遗漏补缺） |

> 文案分层口径（主 design §11）：导航条目用**短词**，页头用**全称**。
> ⚠ **键数口径的两处待定（登记）**：① `device` 组 `claimedByOther` 键去留待 **T7** 实测确认「他人已认领」态存在性（无则删键，14 → 13）② 角色徽章文案键（**T4** 定：补 3 键或零键，见 §6.2 脚注）⇒ **净增 39 键为 v1.7 值**（T4 后；徽章键已定 3 键；仍待 T7 `claimedByOther` 去留，**最终值 T9 实测回填**）。

## 11. 引用文件清单

**上游与规范**
- 主 design：`docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.4 / §3.1-§3.4 / §4 / §5.1-§5.2 / §6.2 / §7.1 / §7.2 G6 / §11 · §12 线框）
- 规范：`docs/00-product-direction.md` §5/§7 · `docs/05-identity-access.md` §3/§5/§6 · `docs/07-i18n-conventions.md` §3/§4
- 视觉：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（SSOT）

**服务端（仅阅读，零改动）**：`apps/server/src/http/auth-routes.ts`（`/me` 薄层）· `auth/plugins/ldap-credentials.ts`（`sign-in/aih`）· `auth/better-auth.ts`（官方实例 / baseURL / 会话 TTL / deviceAuthorization）· `auth/errors.ts`（12 码）· `http/oidc-routes.ts`（OIDC 路径）· `app.ts`（官方 catch-all + 审计包装 + 统一错误出口）· `config/env.ts`（`PUBLIC_BASE_URL` / `AUTH_TRUSTED_ORIGINS`）

**前端（新增 **9** / 改造 6）**：见 §3.1 / §3.2（新增第 9 件 `src/auth/next.ts` 为 v1.2 补）；另 `apps/web/src/components/ui/RoleGuard.tsx`（M4b-1 已交付，本批改造其内部消费）· `components/ui/AppShell.tsx`（零改动）· `components/ui/Toaster.tsx`（M4b-1 已挂根）

**冒烟与脚本**：`docs/smoke/scripts/m4a-dogfood.ts`（重跑作零回归证据）· `docs/smoke/scripts/m4b2-auth-dogfood.ts`（**新建**）· `docs/smoke/scripts/m4b2-seed-roles.ts`（**新建**）

## 12. 8 维自检

> **自检口径（五轮）**：**9.00**（首轮 · 3 处契约错）→ **9.44**（修后）→ **9.17**（第七轮换轴：官方件 API + 件清单复算）→ **9.19**（**深度档评审**：三合一 15 维 + 深度 4 维 + **四轮审查法** + 四方对账 design↔plan↔主 design↔真码）→ 下表为 **v1.2 修正 D3 / Y1-Y4 / F1-F3 后**重评。
>
> ⚠ **口径声明（防同分重报）**：① v1.0 · v1.1 的 **9.44 是窄口径**产物——未扫「i18n 键数总量 / 跨文档落点口径 / 未定义态（`/me` 非 401 失败 · `/login` loading · device 刷新）」三轴，深度档一次实测 **9.19** ② 本版 **9.44 与 v1.1 同值但构成不同**：件清单 **8 → 9**（+`auth/next.ts`）· **4 处未定义态闭合**（Y2/Y3/F1 + 登出链）· §10 键数口径补齐（**净增 32 键**）③ **深度档三口径并列**：三合一 15 维 **9.47** · 深度 4 维 **9.375** · 本仓 8 维 **9.44**（下表）。

| 维度 | 评分 | 说明 |
|------|:--:|------|
| 完整性 | **9.5** | 八件套齐（正文 / 修订记录 / 接口变更总览 / UI-UX 变动 / 线框（引用主 design §12）/ 引用清单 / 状态标记）；入口现状 8 项实证 |
| 一致性 | **9.5** | 3 处契约错已修（登录编码 JSON · Origin 前提 · `skipAuthRedirect` 选项）；§2.1↔§4↔§5 决策链自洽（Q12 壳先渲染 ↔ §4.1；Q6 3+1+7 ↔ §3.3 11 条） |
| 清晰度 | **9.5** | 机制落点写到函数级（`doFetch` 401 分支）· 四态表 · 键清单表 |
| 可实施性 | **9.5** | 实现者可照抄 coding：新建 **9** / 改造 **6** / 不改 4 类清单齐（v1.2 补件 9）· `RoleGuard` 改造三点写实（U2 修）· 请求形态与失败码列全 · 命名坑（`user_code` vs `userCode`）已点明 |
| 设计纯粹性 | **9.5** | 零服务端改动 · 零新增依赖 · 不预埋页面 · **不加 `*` 兜底路由**（明示选择而非遗漏）· 原型不做（Q13） |
| 边界覆盖 | **9.5** | 设备四态 · 侧栏四档 · 401 四分类 · OIDC 未配置（G6）· 登录失败 6 码 · 首帧 loading 形态 |
| 实施精度 | **9.5** | 引用 `file:line` 全部实测 · **官方件族按真码导出逐件落位**（`empty.tsx` 6 件 / `sidebar.tsx` 23 件）· 件清单与改造面复算一致（U1/U3/U4 修） |
| 跨平台 | **9.0** | dev（双源 + `AUTH_TRUSTED_ORIGINS`）vs 生产（反代同源 + `__Secure-` cookie）口径引用主 design §3.4/§3.1；无平台分支代码 |
| **综合** | **9.44** | ✅ 达门（≥9）——`(9.5×7 + 9.0) / 8`（本仓 8 维口径）；**深度档**：三合一 **9.47** · 深度 4 维 **9.375** |

## 13. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v1.7** | 2026-09-16 | sunxuewen-rush | **T4 落地执行期修正（5 处，用户拍板「按推荐来」）**——① **§6.1 超管组条目数订正**：plan T4 断言③ 原写「2 条真链 + 2 条占位」→ **3 条（1 真 + 2 占位）**（主 design §4 为唯一源）② **§6.3 占位条目提示键订正**：`admin.phase2Notice` 仓内不存在 ⇒ **复用 `common.comingSoon`**（零新增键）③ **§6.2 徽章键落定**（用户拍板）：`navigation.roleUser` / `roleAdmin` / `roleSuperAdmin` ⇒ 设计 34 → 37 ④ **§10 键数口径 → 净增 39 键**（**补 2 处遗漏键**：`navigation.logout` · `admin.settings`——均为 design 要求了 UI 而台账漏列）⑤ **§6.1/§6.2 补落地实测**：四档显隐全绿 · UserMenu 四态（loading 采样无 ANON 闪现）· **F3 计算值**（gap 4px / 组内 padding 8px / 标签高 32px）· **F4 登记**（图标态部分 `group-data-[collapsible=icon]` 变体未生效：`hidden` 生效而 `size-8!`/`-mt-8`/`opacity-0`/宽度变体未生效；已排除视口 / 祖先 / 本批引入三因）。⑥ 依据 = 批 plan T4 落地记录（v0.7；含 **T1 件缺陷修复**：`apiPost` 写请求 content-type + `logout` 传 `{}`，sign-out **415/400** 两坑实测全通）。**本版无设计内容改动**（仅口径订正与实测登记） |
| **v1.6** | 2026-09-16 | sunxuewen-rush | **T3 落地执行期细化（4 处，用户拍板「按推荐来」）**——① **§3.3 补 T3 形态注**：`/login` `/device` 本批 T3 = `ComingSoon` 独立版式占位 ⇒ **T6/T7 各需 `Modify main.tsx`**（原 plan 未列该文件，占位元素无法替换）② **§10 键数口径 → 净增 34 键**（新增 `common` 组 +2：`comingSoon` = 7 条占位页 description · `noPermission` = 守卫档位不足 notice；`dashboard.submissions` **T3 前移**落仓 ⇒ T8 仅余 `welcome`）；连锁订正 §6.2 徽章键 **34 → 37** · device 删键 **34 → 33** ③ **§5.4 落地补注**（件已落仓；批次号经 **`DEV_BATCH` 常量表** + `import.meta.env.DEV` 门控 ⇒ **生产产物零 `M4b-` 字面量**，build 后 grep 实测）④ **§9.5 种子脚本已落仓并跑通**（3 账号；`SMOKE_M4B2_PASSWORD`；前缀清理可重放；运行须 `--env-file=apps/server/.env`）⑤ **§9.3 dogfood 401 单列口径**（未登录 `/api/auth/me` 探测；`authNetLogs` 桶，严格性不变）⑥ 依据 = 批 plan T3 落地记录（v0.6：路由 **11 条** · 真浏览器 **4/4** + **role=1 实测** · 门禁四连 · 门户零回归 **36/36**）。**本版无设计内容改动**（仅执行期落地登记与口径写实） |
| **v1.5** | 2026-09-16 | sunxuewen-rush | **T2 落地执行期细化（3 处）**——① **§3.1 件 9 职责扩**：`sanitizeNext` 单点 → **路由安全单点**（+`PROTECTED_PREFIXES` + `isProtectedRoute`）；强调**零 import** （`api/client` 可单向引用**不成环**——`AuthProvider → api/auth → api/client → auth/next` 末段为叶子）；消费方由 3 处改为 `Login` / `Device` / `api/client`（`AuthProvider` 生成 `next` 时复用）② **§4.2 `invalidateCache(prefix)` 语义写实**：按**语言无关的 `path` 前缀**失效（内部键为 `${lang} ${path}`；按**完整键**前缀匹配会**永不命中**）③ **§4.3 `sanitizeNext` 单参 + 落点**：原签名 `(raw, origin)` 的 `origin` **冗余**（相对路径规则已排除跨源）+ 补**拒控制字符**（字面 U+0000–U+001F 与编码形态 `%00`–`%1f`）④ 依据 = 批 plan T2 落地记录（v0.5：**纯函数探针 27/27** · **门户零回归 dogfood 36/36 + NO JS ERRORS**）。**本版无设计内容改动**（仅执行期细化与落点写实） |
| **v1.4** | 2026-09-16 | sunxuewen-rush | **T1 落地执行期登记（批内首个实现 Task 完成）**——① **§3.2 件 4 执行期注**：`apiPost` + `doFetch` 参数化 + **`setUnauthorizedHandler`（401 登记口）** 已随 **T1** 落地：*原因* = 原「`apiPost` 归 T2」造成 **T1 ↔ T2 循环依赖**（T1 的 `login` 需 POST，T2 的 401 分流需 T1 的 `AuthProvider` 钩子）；*登记口落 `api/client.ts` 而非 `AuthProvider` 导出* = 防 `client → auth` 反向 import 形成 **ESM 循环**（§3.1 件 1 语义「`AuthProvider` 为注册发起方」不变）；401 **四分类消费仍在 T2**② **§6.2 登记缺口（归 T4）**：「角色徽章文案取 `navigation` 新增 3 键之一」与 §10 的 3 键**语义不符**（3 键是**组标题**「个人/管理/超级管理」，徽章应表达「用户/管理员/超级管理员」）⇒ T4 定：补 3 徽章键（净增 **32 → 35**）或徽章只显色不显字 ③ **§10 增两处待定键口径**：`claimedByOther` 待 T7 实测存在性 · 徽章键待 T4 定——**净增 32 键为 baseline，T9 实测回填** ④ 依据 = 批 plan T1 落地记录（v0.4）。**本版不含设计内容改动**（仅执行期登记与缺口留痕） |
| **v1.3** | 2026-09-16 | sunxuewen-rush | **grilling 第 3 轮（Q14-Q20）落地**——方法：重算 frontier（前置已定但**未拍板**的实现级决策），**事实全部自查（真码对账）**，7 项逐条按推荐拍板。① **Q14 401 判定域**（★）：`isProtected(path)` 的判定域写实为**当前路由**（`window.location.pathname` 匹配 4 个**路由**前缀）——**实测**全仓 `apiGet` 的 path 一律 `/api/...`（`/api/assets`/`/api/labels`/`/api/stats`/`/api/assets/:slug/versions/…`），与原「按 path 匹配」**不同域 ⇒ 永不命中**（分流整体失效）；`doFetch` 只负责「发现 401 + 上抛 path/search」，判定移入 `AuthProvider.onUnauthorized` ② **Q15 守卫包裹与 `minRole` 映射**（原文档未列，实现者只能猜）：门户 5 条**无守卫** · `/dashboard`+`/dashboard/*` = `USER(1)`（布局路由一条包 4 条）· `/reviews/:id` = `USER(1)` · `/admin`+`/admin/*` = `ADMIN(10)`；**`/admin` 的 `Navigate` 放在守卫内**（未达档先弹 `/dashboard`，不白跳）③ **Q16 `sanitizeNext` 安全边界**：新增**拒含 `\` 或 `%5C`**（`/\evil.com` · `/%5Cevil.com` 会被解析为**协议相对 URL** = 开放重定向）+ 形态约束 `^/[^/\\]` ④ **Q17 `/dashboard` 消费 `location.state.notice`**（原文档只写「纯静态零请求」⇒ 档位不足的提示**会丢失**）：挂载读 state → `toast.warning` → `navigate(replace, state:null)` 清 state 防重弹 ⑤ **Q18 device 端点错误体不同构**（实测 `http/device-flow.test.ts:26,29`）：**OAuth 风格 `{error, error_description}`** 而非本仓 `{code, message}` ⇒ `ApiError` 恒退化 `http_400`、`errors` 本地化对 device 失效 ⇒ **适配点 = `api/auth.ts` 封装**（页面不直读 `code`）；**「他人已认领」态仓内无据**（`auth/errors.ts` 12 码无 device 专属 · `grep claimed` 零命中）⇒ 标 **待 T7 实测、无则删分支 + `claimedByOther` 键** ⑥ **Q19 种子口令 = 单变量 `SMOKE_M4B2_PASSWORD`**（原 `SMOKE_*_PASSWORD` 通配未具名，T10 无法照抄）⑦ **Q20 AGENTS.md 同步**（`AGENTS.md:100` 落后 4 批，见该文件里程碑段）。**自检**：v1.2 **9.44 / 9.47** → 本轮 **9.44 / 9.50**（8 维 / 深度档三合一） |
| **v1.2** | 2026-09-16 | sunxuewen-rush | **深度档评审修正（D3 + Y1-Y4 + F1-F3 + plan 缺口落档）**——口径：**三合一 15 维 + 深度 4 维 + 四轮审查法**（四方对账 design↔plan↔主 design↔真码）。① **D3 键数口径补齐**：§10 增「**净增 32 键**」口径注（22 键为两组新增窄口径）② **Y1**「图标态…落地时实测确认」→ **官方默认即真值**（不自写隐藏类）③ **Y2** 补 **`/me` 非 401 失败 ⇒ 保持 `anon`**（不阻塞壳渲染，登记已知代价）④ **Y3** 补 **`/login` `loading` 期渲染骨架、不渲染表单**（防反向守卫竞态闪烁）⑤ **Y4** 种子脚本落点写实（表 `user` :43 · 前缀匹配 `username` :54 · `role` :56 · `status` :61 · 先删 `session`/`account` 依赖行 · 禁全表 delete）⑥ **登记 3 项**：F1 `/device` 已处理态刷新、F2 `.env.example:36` 空值（dev 恒 403 风险）、F3 侧栏混排结构视觉（T4 实测 + 用户确认）⑦ **件清单 8 → 9**：补 **`src/auth/next.ts`**（`sanitizeNext` 落点，批 plan §1.4 缺口 ⑴ 采纳 A 案）；§3.2 件 4 同步 · §11/§12 件数同步 ⑧ **Q8 边界订正**：T2 的「反向守卫」= 只提供判定函数，**消费点落 T6 `/login`**（批 plan §1.4 缺口 ⑵）。**自检**：深度档实测 **9.19** → 修正后 **9.44**（8 维）/ 三合一 **9.47** |
| **v1.1** | 2026-09-16 | sunxuewen-rush | **自检订正轮（U1-U5 · 第七轮换轴体检）**——① **U1** §3.2 改造件 **5 → 6 处**（补 `components/ui/RoleGuard.tsx`：§4.5 已要求改造却未入件清单，属**自相矛盾**；件清单是批 plan 切分依据，漏列会致实现期漏改）② **U2** §4.5 写实 `RoleGuard` 改造三点（**删本地 `ROLE` 常量**（真码 `:10`，迁 `auth/roles.ts`）· **删 `role` prop**（真码 props `{minRole, role, children}`）改内部 `useAuth()` · 接三态 `loading/anon/档位不足`），承接主 design **P4/P6** ③ **U3** §5.4 改**官方件族落位**（真码 `empty.tsx:93` 导出 6 件：`Empty` > `EmptyHeader`（`EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`）；**内容槽 = `EmptyContent`**）④ **U4** §3.2 补官方标准组形态 **`SidebarGroupContent`**；§6.2 loading 括注 **`SidebarMenuSkeleton`**（`sidebar.tsx:687`——真码导出 **23 件**实测）⑤ **U5** §9.1「行为**逐字**不变」→「**行为语义不变 + 类型面加性扩展**」（`ApiGetOptions` 增可选 `skipAuthRedirect`）。**正证**：批 design 对主 design 的 **14 处章节引用全部有效** · `LanguageSwitcher.tsx:15` 真名 · `SidebarGroup`/`SidebarGroupLabel`/`SidebarMenu` 均在导出清单。**自检**：9.17 → **9.44**（同值但构成不同于 v1.0 自评——v1.0 未扫本轮两轴） |
| **v1.0** | 2026-09-16 | sunxuewen-rush | 初稿：M4b-2 对齐定稿——grilling **13 项决策**（用户逐条按推荐拍板）· 入口现状 **8 项真码实证** · 件规格（新建 8 / 改造 5 / 不复用清单）· 路由 11 条形态切分 · 认证机制（`doFetch` 单点 401 分流 · `sanitizeNext` 支持 query · `hasRole` 单点）· 页面规格（`/login` 两 tab、`/device` 四态、`/dashboard` 临时页、`ComingSoon` 内容槽）· 出口件④ 七项 · dogfood 六组 · i18n 22 键 + 9 码。**自检**：首轮 **9.00**（3 处契约错同轮修）→ 修后 **9.44** |
