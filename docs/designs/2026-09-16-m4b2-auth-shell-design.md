# M4b-2 认证与壳批设计（登录 · 会话 · 角色感知壳）

> Date: 2026-09-16
> Updated: 2026-09-17（**v1.30：原型删除闭环**（用户授权「授权删原型」）—— ① 删前核实代码零引用（import 0 · `main.tsx` 挂载 0）② 删除 `apps/web/src/pages/__proto/`（`M4b2UiProto.tsx` 29,307 B）⇒ 代码侧 `__proto` **零命中** ③ §12.2「原型删除后零残留」一项**自此成立**；批 plan §3 F3 → **已闭环** ④ 门禁 + dogfood 36/36 + 断言 49/0 复跑全绿；v1.29：M4b-2 收尾二次审计 + 状态收口**—— ① 背景：批内首次审计在 T10（2026-09-16）；其后又落 T11-T15（UI 视觉重做）与 2026-09-17 五组补充改动 ⇒ 按批间门补做**覆盖最新状态的收尾审计**（findings 表 = 批 plan §3）② 审计合计：**修 4 处**（注释腐化 2 · 旧口径历史行加推翻指针 3，落 4 文件）· **维持 7 类** ⇒ **无未决项** ③ 关键实测：死导出 **0** · i18n **11 组 / 222 键 / 差集 0** · 官方件与 HEAD **0 差异**（源码从未改造）· 无孤儿 token · 无出轴值 ④ 状态收口：本文件状态声明 → 自检 **9.88** + 断言 **49/0**；批 plan Status → **✅ 完成**；docs/00 §5 M4b-2 行 → **✅ 完成 2026-09-17**；主 design §2.3 登记表 M4b-2 行 → **✅ 完成（T1-T15）** ⑤ 自检：文档 **9.90**（§12.2 收尾轮次重评）；v1.28：滚动条「两项遗留」对齐 —— 只留一套机制 · 清死代码与孤儿 token（用户 2026-09-17 拍板）**—— ① 遗留一：`::-webkit-scrollbar*` 定制与标准属性 `scrollbar-width`/`scrollbar-color` **并存**，规范上前者被后者忽略 ⇒ **死代码**；遗留二：`--scroll-track: transparent` 已**无活跃消费者**。② 处置：**整块删除** `::-webkit-scrollbar` / `-track` / `-thumb` / `-thumb:hover` 四块；**删除孤儿 token** `--scroll-track` / `--scroll-thumb` / `--scroll-thumb-hover`；token 组由**四值收敛为单值**（仅留 `--scroll-color`）；`html` 改为 `scrollbar-width: thin; scrollbar-color: var(--scroll-color) transparent;`（轨道**显式**透明）。③ 特性：**纯删除、零行为变化** —— 实测 `scrollbar-color` 计算值仍 `rgba(37,99,235,0.35) rgba(0,0,0,0)`、侧栏滚动条占位仍 15px、`scrollbar-gutter: stable` 保留。④ 注释保留历史说明（记明「曾有两套、前者从未生效」），避免后来者疑问「为什么没有 webkit 定制」。⑤ 回归：dogfood **36/36** · 断言 **49 PASS / 0 FAIL** · 门禁 exit 0 ⑥ 自检：代码 **9.94** / 文档 **9.88**；v1.27：滚动条轨道去底色（用户 2026-09-17 拍板「滚动条不要背景色」）**—— ① `--scroll-track` `rgba(37,99,235,0.06)` → **`transparent`**（轨道不再铺色，露出其下方容器底色；滑块 `--scroll-color` 不变）② 实测：滚动条轨道像素 = **`#f6f9ff`**（= 侧栏面板底，透明透出）· 滑块 `#adc5f8`；`scrollbar-color` 计算值 = `rgba(37,99,235,0.35) rgba(0,0,0,0)` ③ 回归：dogfood **36/36** · 断言 **49 PASS / 0 FAIL** · 门禁 exit 0 ④ 自检：代码 **9.88** / 文档 **9.83**；v1.26：登录默认落点 `/dashboard` → `/`（首页）（用户 2026-09-17 拍板「按推荐」）**—— ① 改点 = `pages/Login.tsx:94` 的 `destination` 默认值（**唯一改点**；同一条链同时喂「已登录访 `/login` 的反向守卫」与「登录成功跳转」⇒ 二者行为天然一致）② **`next` 仍优先**（被拦截后登录回原页不变）③ `RoleGuard` 无权限弹回点**保持 `/dashboard`**（语义不同：那是『权限不足』的安全落点）④ 断言 **47 → 49 PASS / 0 FAIL**（新增 **C10**：已登录访 `/login` 无 `next` ⇒ 落 `/`）⑤ 门禁 exit 0；v1.25：官方结构 + 官方 SiteHeader 对齐 + 图标态闭环（用户拍板「对齐官方骨架」）**—— ① 结构 `SidebarProvider > SideNav + SidebarInset` ⇒ 顶栏不再全宽（宽 = 视口 − 侧栏 = **1184**）· 侧栏回官方 `inset-y-0`（顶到最上）· 官方 container 右缘 **1px 分隔线**自动出现 ⇒ **AIH 覆盖点 2 → 1 处**（仅剩宽度变量）② 顶栏照官方 `blocks/dashboard-01` SiteHeader 逐项对齐（`h-[var(--header-height)]` · 内层容器 `gap-1 px-4 lg:px-6` · `Separator mx-2` · 标题改 **`<h1>`** · `shrink-0`+`transition` · **图标态保持 58** 不收矮）③ 品牌由顶栏移入**侧栏顶部 `SidebarHeader`**（常态渐变字 / 图标态 `A` 方块，几何居中偏差 **0**）④ **图标态闭环**：官方件 `group-data-[collapsible=icon]:w-(--sidebar-width-icon)` 在 **tw 4.3.3 未生成**（CSSOM 0 命中，即 M4b-2 **F4** 真因）⇒ 改**受控 open + 状态驱动宽度**（256↔48）；`@source inline` 官方机制尝试**未生效**（已删）⑤ 收起态**单层底色**（槽 32×32 铺满按钮；14 条按钮宽 `uniq=[32]`）⑥ hover 提示**统一纯中文** ⑦ 滚动条方案 ② `scrollbar-gutter:stable`（条目宽 239 → **224**）；发现 `scrollbar-width:thin` 致全站 `::-webkit-scrollbar` 定制失效 ⑧ 断言 **39 → 47 PASS / 0 FAIL**（+C2b/C2c/C2d/C2e/C2f/C2g/C8b/C8c）⑨ i18n 零净变化（首页脱壳试验含 `enterConsole` 已整体回退，未落地）；**v1.24：侧栏宽 256 + 面板圆角对齐官方（用户 2026-09-17 拍板：① 保留 ② 保留 ③ 回退）**—— ① 侧栏展开宽 **204 → 256**（官方 16rem；面板内宽 240）⇒ 条目宽 162 → **214** · 内容区起点 x 204 → **256** ② **面板圆角覆盖撤除**（`[&>[data-slot=sidebar-inner]]:rounded-2xl` 18px 删除）⇒ 官方 floating 形态：`rounded-lg` **10px** + `border-sidebar-border` 1px + `shadow-sm` ③ **滚动条保持 AIH**（6px 细蓝 · 属视觉体系 §4.4 ⑥，不随官方原生 15px）④ **AIH 覆盖点由 3 处降为 2 处**（定位 `top-[58px] bottom-0 h-auto` + 宽度变量；圆角覆盖退役）⑤ 实测：`sidebarW=256` · `radius=10px` · `border=1px` · `shadow-sm` 生效 · 条目 `uniqW=[214]` · 滚动条回 6px（矮屏实测 `offsetWidth-clientWidth=6`）⑥ 断言同步 **39 PASS / 0 FAIL**（C1/C2/C4b/C9 值更新）⑦ 截图 04/05 重出；v1.23：门户组加组标题 + 14 条全中性底（用户 2026-09-17 拍板二条）**—— ① **加组标题「门户」**（新键 `navigation.groupPortal`）⇒ 原 Q3「不加」**翻转**，四组自此**结构同构**（`SidebarGroup > Label + Content > Menu`）② **14 条衬底全中性**：门户组资产类型色衬底（`--tint-*`/`--type-*`）撤除 ⇒ 常态一律 `bg-muted` / 激活一律 `bg-primary`（主题 token 保留）③ **实测**：组标题 **4**（门户/个人/管理/超级管理）· 14 条 `uniqH=[32] uniqW=[162] uniqSlot=[22x22]` · 常态衬底**种类 = 1** `rgb(241,245,251)`（13 条）· 激活 1 条 = `primary` ④ 断言 **38 → 39 PASS / 0 FAIL**（C3 改 4 组 · 新增 **C4c** 衬底统一）⑤ i18n **221 → 222 键**（`navigation` 13 → 14）⑥ 主 design 同步 **v1.42**；**v1.22：侧栏 14 条条目形态统一（用户 2026-09-17 拍板）**—— ① 用户指出门户组 4 条与三组 10 条风格不一致，实测硬差 **5 维**（行高 **51 vs 32** · 图标槽 **22 有衬底 vs 20 透明** · 双行 vs 单行 · 宽 **178 vs 162** · 字重 **500 vs 400**）② 拍板 = 收敛为官方标准形态（行高 32 · 宽 162 · 槽 22×22 · 单行）+ 英文副标**降级 hover tooltip** + 门户保类型色衬底 / 三组中性衬底 ③ 实测 14 条 `uniqH=[32] uniqW=[162] uniqSlot=[22x22]` · `em=0` · tooltip = `首页 · Home` ④ 断言 **37 → 38 PASS / 0 FAIL**（+C4b）⑤ **门户组条目自 M4a 后首次改动**（登记见 §14.6 P7）；**v1.21：UI 重做落地收口（§14 定稿 · T11-T15 ✅ · 断言 37/0）**—— ① **§14 转定稿**（用户口令「定稿」）：实现落地 = 登录页双栏/无白卡/撤 tab/无 `AuthLayout` 页头 · 设备页单列居中 + 品牌小方块 · 壳（侧栏 **14 条 SVG** + 顶栏页面标题区 Q7 + 「管理看板」占位条目 §14.7）· **删件 `AuthLayout.tsx`**② **验收**：`docs/smoke/scripts/m4b2-ui-redo-assertions.ts` ⇒ **37 PASS / 0 FAIL**（§14.5 的 29 条 + 8 子项）+ `NO JS ERRORS`；截图 **5 张**留证③ **i18n 实测订正**：本批**净增 10 键**（`login` 8→16 · `device` 13→14 · `navigation` 12→13）⇒ **当前全仓 221 键 / 11 组**（前版写的 135/44 系**错基线**，已订正）④ **两处设计值被实测推翻并回写**：内容区 padding = `AppShell` 既有 `8px 22px`（非 24）· 图标态 = `--sidebar-width-icon 48px`（面板 50 / 容器 64，既有行为）⑤ 原型一次性件挂载已从 `main.tsx` 移除（文件本体待授权删除）；**v1.20：⬠Q9/Q10 闭环（用户「按推荐来」）· 自检 9.65**—— ① **Q9 撤两 tab**（登录页 = 单表单 + 底部「使用 OAuth 登录」链接 + 备用面板）⇒ §14.4 A 写实 · §14.5 断言 **+3（A10/A11/B5）** · **§10 `login` 组 8 → 10 键**（删 `tabLocal` · 增 `subtitle`/`oidcOpen`/`backToForm` · `tabOidc`→`oidcLink`）⇒ 全仓 **134 键 / 净增 43**（史实值保留、以本条为准）② **Q10 去 `AuthLayout` 页头**（登录/设备改**全屏版式** · `min-h-svh` · 语言切换落**右栏右上角**）⇒ **删件 `AuthLayout.tsx`** · §3.2 改造件 **6 → 9 处**（+Login/Device 重写 + 删件）③ §12.2 F1/F2 标 **已闭**、综合 **9.61 → 9.65**；Status/§14.6 结案表同步（Q9/Q10 入表）④ 本版**零实现改动**（实现待定稿口令）；**v1.19：全文换靶复读 —— 14 处口径修复 + §12.2 本轮 8 维自检（9.61）+ 2 项开口项 ⬠**—— ① **通读全篇（读入基线 899 行 ⇒ 落档后 939 行）后换靶**（表/图/真码三向 · 跨节对照 · 修订声明回查 · 引用回读 · 死键扫描）⇒ 抓 **14 处**（F1-F14，见 §12.2 实证表），其中 **2 处真矛盾**：**§5.1「居中 `Card`/无侧栏无顶栏」× §14.4「双栏 · 无白卡」**（同一页两套版式）与 **§2.1 Q2·§5.1「两 tab」× §14.4「单表单 + OAuth 链接」**（同一能力两种交互）② §5.1/§5.2 加「**视觉以 §14.4 为准 · 功能契约不变**」分界；§8/§12/§14.6/Status 四处指针同步；§14.4 高度基准写实（`-57px` 系原型控制条）· 顶栏字标改真仓渐变字 · Q13 加原型例外注③ **新增 §12.2 本轮 8 维自检 = 9.61**（全文口径；M4b-2 实现轮 9.44 仍适用 §1-§11）④ **⚠️ 2 项开口项须用户终判**：**⬠Q9** 两 tab→单表单 + OAuth 链接（连带 i18n `login` 8→7 键）· **⬠Q10** `AuthLayout` 页头去留 —— **闭合前不写实现代码**⑤ 本版**零实现改动**；**v1.18：§14.4 落地规格 + §14.5 验收断言回填（§14 全段落齐）**—— ① **§14.4 落地规格**：登录页（双栏 42/58 · 列宽 336 · 输入 48/圆角 28/`bg-muted`+`border-input` · 按钮 42 胶囊 · 间距 22 · 无白卡）/ 设备页（单列居中 · 授权码 `letter-spacing 2.52px`）/ 壳（顶栏 58 · 侧栏 204/48 · `floating` 圆角 18 内缩 8 · 组标题 11px · 条目 32 · 用户区 65 · 内容 24）——**全部实测值、零新增 token**（原型硬编码色值已 token 化：`#f9fafb`→`bg-muted` · `#adb2b8`→`placeholder:text-muted-foreground/60` · `#2563eb`→`text-primary`）② **§14.5 验收断言**：A 登录页 **9** 条 / B 设备页 **4** 条 / C 壳 **9** 条 / D 通用 **4** 条 = **26 条**（几何量值 + 字符串 + `NO JS ERRORS` + 门户零回归）③ §14 状态声明改为「**定稿候选**」；**v1.17：grilling 第 1 轮 8 项全部拍板（用户「按推荐来」）+ 三判回填**—— ① **§14.3 三判填定**（气质 = **V1 浅蓝·品牌承载**；密度 / 类型色 = **沿用**）② §14.6 **P1-P6 全部结案**（含 **P4 纠正**：门户组**保持不加标题**——上轮助手推荐给反，与主 design §4「门户组不加组标题」既定 + 门户面零回归相冲，用户拍板按既定）③ §14.7 i18n 键名定名 `navigation.adminBoard` / en「Admin Dashboard」④ 原型同步：门户组去标题（对齐真码裸菜单）· 侧栏切 `variant="floating"`（对齐 `SideNav.tsx:139`）+ 个人组文案对齐真码（「个人工作台」/「访问令牌」）⑤ 本版**零实现改动**（回写真仓待 §14.4 定稿后统一进行）；**v1.16：UI 重做评审留痕 + 「管理看板」归属登记**—— ① 新增 **§14.6 评审留痕**（逐屏：登录页 ✅ 确认 ok / 设备授权页 ✅ 确认 ok / 应用壳 🔵 评审中；含**侧栏图标映射 14 条**与**待拍板项 P1-P6**）② 新增 **§14.7「管理看板」登记**（用户拍板：**归属 M4b-6** · **内容清单本批不认可、待该批对齐时讨论**；本批只落占位条目）③ §14.2–§14.5 仍 ⬜ 待回填 ⇒ 本版**不主张 §14 完成**；④ 同步主 design §2.3/§2.4；**v1.15：UI 视觉设计段开立（回炉开局版）**）—— 用户 2026-09-17 定：**不另立批**，UI 重设计直接在本批 design 内升版；范围 = 本批三面（登录页 / 设备授权页 / 壳），M4b-3 两页与工作台落地页**不动**，全站最终打磨仍归 M4b-7。新增 **§14「UI 视觉设计（重做）」**：§14.1 = **现状与问题真值**（1440×900 实测 12 条：卡片 384×345 @ y=78 ⇒ 下留白 477px 不居中 · `box-shadow` 全 0 · 标题 16px · 控件 36px/圆角 8px · 顶栏元素 40×24 贴边 · 壳门户组×三组混排 F3 遗留）；§14.2 方向 · §14.3 三判 · §14.4 落地规格 · §14.5 验收断言 = **⬜ 待原型评审回填**。流程（用户定）= 2–3 方向可点原型 → 三判 → 回填 → 定稿 → 实现 → 真浏览器验收；v1.13：T10 收尾回写（批次完成 · converge 重评 9.50）**——§9 补「本批验收结果」
（五门禁全绿含 `test` **500 pass·1 skip·0 fail** · 门户零回归 **36/36** + chain-smoke · 本批 dogfood 六组
**24 PASS/0 FAIL + NO JS ERRORS** · 种子复核幂等 · **整体审计无未决项**）；**F4 关闭**（真机实测证伪 T4 的
「变体未生效」= 测量假阴性：`-mt-8 → -32px` · `opacity-0 → 0` · `size-8! → 32×32` · 容器 **66px**）；
**行数声明订正**（前序记录为执行期估算 ⇒ 权威表见 `docs/smoke/2026-09-16-m4b2-auth-shell.md` §6）；
**v1.12：T9 落地回写（i18n 实测键数回填）**——§10 全量改为**实测口径**
（批前基线 `0ff0693` **91 键 / 7 组** ⇒ 当前 **132 键 / 9 组** ⇒ **净增 41 键**）；`errors` 组
**+9 → +12 码**（**补 3 个服务端实有码**：`auth.forbidden` · `auth.oidc_denied` · `auth.oidc_state_mismatch`
⇒ 18 → **21 键**，服务端 12 码**覆盖 12/12**）；`device` 组 **14 → 13**（T7 删 `expiresLabel`，本版同步算式）；
**v1.11：T8 落地回写**——§5.3 补落地注（内容槽形态 · **三档入口裁剪实测**
（role 1 → 2 项 / 10 与 100 → 3 项）· `notice` toast + 刷新不重弹 · **零业务请求口径补壳层例外**）+
**「零请求」行口径订正**（实测 `/api/stats` 由 `SideNav.tsx:16` 发出 = M4a 既有侧栏计数徽章，
非本页引入 ⇒ 订正为「**页面自身**零业务请求」）；**v1.10：T7 落地回写 + 4 处契约订正**——① **§5.2 未登录判定机制重写**：官方
`GET /device?user_code=` **未登录也返回 200**（实测）⇒ plan 原「401 ② 分类」**不成立**，且会误报
「他人已认领」⇒ 改为**读会话三态设门**（`loading` 骨架 / `anon` 跳登录**保码** / `authed` 四态）
② **§5.2 四态表订正**：② 行去「有效期」（详情接口**不返** `expires_in`）· ① 行码形态改**实测 8 位无横线** ·
④ 行「他人已认领」改写为 **② 的变体**（前置 = GET 响应缺 `client_id`；兜底 = approve 403 `access_denied`）
③ **§10 `device` 组 14 → 13 键**（去 `expiresLabel`，无数据源） ④ **§5.2 补落地注**（四态 + 保码闭环 +
刷新态 + 预填归一全实测）；**v1.9：T6 落地回写**——① **§9.5 种子形态改写为 upsert（A2）**：原「删
`session`/`account`/`user` 后重建」在 `audit_log.actor_id` 有行时恒 **23503**（实测引用 `"user"` 的
外键 = **12 约束 / 9 张表**）⇒ 只清 `session` + `user`/`account` **有则改、无则建**（`user` 行**永不删**
⇒ 引用表全不需清理 · `user.id` **恒定** ⇒ 审计留痕不丢）② **§5.1 补 T6 落地注 + F5 缺口登记**
（OIDC 成功 `/?oidc=success` 门户面零消费 ⇒ 交 M4b 收尾 / M4c）③ **§10 补 T6 落值**：`login` **8 键**
+ `errors` **9 码**已落（9 码逐条有服务端依据）⇒ 键数 **39 → 56**（T9 回填）+ **跨面共享码（暂零消费）
登记**（`oidc.not_configured` · `auth.session_expired`）④ 依据 = 批 plan T6 落地记录（**v0.9**：
六项断言 + 门禁四连 + 门户零回归 **36/36** · 生产产物零 `M4b-`）；**v1.8：T5 落地回写（减法批）**——§3.2 件 1（`TopBar`）与件 2（`SideNav`）补落地注（顶栏**仅余 4 件**、侧栏 Footer **仅余 `UserMenu`**；`navigation` **−4 键已落** ⇒ 键数口径与其算式自洽）；**v1.7：T4 落地执行期修正（5 处，用户拍板「按推荐来」）**——① **§6.1 超管组条目数订正**：plan 断言③ 的「2 条真链 + 2 条占位」→ **3 条（1 真 + 2 占位）**（主 design §4 唯一源）② **§6.3 占位条目提示键订正**：`admin.phase2Notice` **仓内不存在** ⇒ **复用 `common.comingSoon`**（零新增键）③ **§6.2 徽章键落定**：`navigation.roleUser`/`roleAdmin`/`roleSuperAdmin`（3 键，用户拍板）④ **§10 键数口径 → 净增 39 键**（补 2 处遗漏键：`navigation.logout` · `admin.settings`——design 要求了 UI 但台账未列）⑤ **§6.1/§6.2 补落地实测值**（四档显隐 · F3 混排计算值 · F4 图标态登记）；**v1.6：T3 落地执行期细化（4 处，用户拍板「按推荐来」）**——① §3.3 路由表补 **T3 形态注**（`/login` `/device` 本批 T3 = `ComingSoon` 独立版式占位，真页 T6/T7 ⇒ **T6/T7 各需 `Modify main.tsx`**）② §10 键数口径 → **净增 34 键**（新增 `common` 组 **+2**：`comingSoon` = 占位页 description · `noPermission` = 守卫 notice 文案；`dashboard.submissions` **随 T3 前移**落仓 ⇒ T8 仅余 `welcome`）· 连锁：§6.2 徽章键 **34 → 37** · device 删键 **34 → 33** ③ §5.4 补落地注（件已落仓；批次号经 **`DEV_BATCH` 常量表** + `import.meta.env.DEV` 门控 ⇒ **生产产物零 `M4b-` 字面量**，build 后 grep 实测）④ §9.5 种子脚本**已落仓并跑通**（运行须 `--env-file=apps/server/.env`——仓库根无 `.env`）⑤ §9.3 dogfood **401 单列**口径（未登录 `/api/auth/me` 探测）；**v1.5：T2 落地执行期细化**——§3.1 件 9 扩为**路由安全单点**（`sanitizeNext` + `PROTECTED_PREFIXES` + `isProtectedRoute`；**零 import** ⇒ `api/client` 单向引用不成环）· §4.2 `invalidateCache(prefix)` 语义写实（**语言无关 path 前缀**）· §4.3 `sanitizeNext` **单参**（`origin` 冗余）+ 补拒**控制字符**（含 `%00`–`%1f`）+ 落点写明；**v1.4：T1 落地执行期登记**——§3.2 件 4 补「`apiPost` + `doFetch` 参数化 + `setUnauthorizedHandler` 已随 T1 落地」（解 T1↔T2 循环依赖 + 防 ESM 循环）· §6.2 登记**角色徽章键与组标题键语义不符**的缺口（T4 定：补 3 键 32 → 35，或徽章只显色不显字）· §10 增**两处待定键**口径（`claimedByOther` 待 T7 实测 · 徽章键待 T4 定；净增 32 为 baseline，T9 实测回填）；**v1.3：grilling 第 3 轮（Q14-Q20）落地**——**Q14 401 判定域写实**（判定 = **当前路由**，非 API 路径；实测全仓 `apiGet` 均为 `/api/...`）· **Q15 守卫包裹与 `minRole` 映射表**（门户 5 条无守卫 / `/dashboard`+`/reviews` = USER(1) / `/admin` = ADMIN(10)；`/admin` 的 `Navigate` 在守卫内）· **Q16 `sanitizeNext` 拒 `\` 与 `%5C`**（开放重定向边界，形态 `^/[^/\\]`）· **Q17 `/dashboard` 消费 `location.state.notice`**（toast + 清 state 防重弹）· **Q18 device 错误体 = OAuth 风格 `{error}`**（适配点 `api/auth.ts`）+ 「他人已认领」态**仓内无据 ⇒ 待 T7 实测、无则删** · **Q19 种子口令 = 单变量 `SMOKE_M4B2_PASSWORD`**；**v1.2：深度档评审修正（D3 + Y1-Y4 + F1-F3 + plan 缺口落档）**——口径 = 三合一 15 维 + 深度 4 维 + **四轮审查法**（四方对账）；§10 补**净增 32 键**口径注 · 图标态措辞写实 · 补 **`/me` 非 401 失败态**与 **`/login` loading 态** · 种子脚本落点写实（表 `user` / `username` / `role` / `status`）· 登记 F1-F3 · **件清单 8 → 9**（补 `src/auth/next.ts`）· Q8 反向守卫边界订正；深度档实测 **9.19 → 9.44**（8 维）/ 三合一 **9.47**；**v1.1：自检订正轮（U1-U5，第七轮换轴体检）**——轴 = **官方件 API 核对 + 上游引用一致性 + 件清单复算**：改造件 **5 → 6 处**（补 `RoleGuard.tsx`）· §4.5 写实 `RoleGuard` 改造三点（删本地 `ROLE` 常量 / **删 `role` prop** / 接三态）· §5.4 按官方件族落位（`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/**`EmptyContent`**）· 补 `SidebarGroupContent` 与 `SidebarMenuSkeleton` · §9.1 措辞「逐字不变」→「行为语义不变 + 类型面加性扩展」；自检 **9.17 → 9.44**）；**v1.0 初稿**：M4b-2 对齐定稿——**grilling 13 项决策**（2026-09-16 两轮 + 1 补问，全部按推荐拍板）+ 上游主 design **v1.20** 契约承接；入口现状 8 项真码实证）
> Status: **定稿**（**8 维 9.44 · 深度档三合一 9.50** ≥9——**实测值**；六轮口径：9.00 → 9.44 → 9.17 → 9.19（深度档评审）→ 9.44（v1.2）→ **v1.3 grilling 第 3 轮后 9.44 / 9.50**；上游主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md` §2.3 的子批之一；主 design 版本随其自身演进，**以其版本头为准**） · **UI 视觉重做：§14 定稿并落地（v1.21）**——T11-T15 ✅ · 断言 **37/0** · 门禁 exit 0 · 门户零回归 36/36
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
| 6 | 侧栏 | 门户 4 条**无组标题平铺** + 底部产品元信息三项 + `APP_VERSION` 死常量（⚠️ **2026-09-17 起**：门户组加组标题「门户」· 全 14 条改中性底 —— 见 §14.6 P4/P7） | `SideNav.tsx:18-19,53-58` |
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
| Q1 | 反向守卫落点 | **优先回合法 `next`**（保住 `/device?user_code=` 深链），无 `next` 才回 **`/`（首页）**——2026-09-17 用户拍板「按推荐」由 `/dashboard` 改 |
| Q2 | OIDC 未启用体验 | **B+：新标签页直跳**（`<a target="_blank" rel="noreferrer">`）；**不做**前置探测；显式口径「`next` 对 OIDC 通道不适用」 |
| Q3 | 门户组组标题 | **不加**（保持 M4a 无标题平铺；零回归硬约束）——⚠️ **2026-09-17 用户拍板翻转 ⇒ 改为「加组标题『门户』」**（见 §14.6 P4/P7；本行保留为历史拍板） |
| Q4 | `/device` 交付深度 | **完整实现**（认领 + 批准 + 拒绝 + 四态） |
| Q5 | `/dashboard` 临时页 | **按 role 裁剪**入口（`role >= 10` 才显示审核入口） |
| Q6 | 路由形态切分 | **3 真页 + 1 重定向 + 7 占位** |
| Q7 | 占位页文案 | 中性文案；批次号 **DEV-only 硬编码**（不进生产 i18n 字典） |
| Q8 | 批 plan Task 粒度 | 按能力切 **10 Task**（一事一提交；T5 门户面改动独立成 Task）——**T2 含 `sanitizeNext`（反向守卫的消费点落 T6 `/login`，T2 只提供判定函数与 401 侧 `next` 生成点）** |
| Q9 | 出口件 ④ 人工清单 | **七项**（§9.4） |
| Q10 | dogfood 断言 | **六组** + `NO JS ERRORS`（§9.3） |
| Q11 | 种子数据 | **3 账号** `m4b2_{super,mgr,user}`，口令从 env 读（§9.5） |
| Q12 | 首帧形态 / 第③类消费点 | **壳先渲染 + Skeleton**；401 第③类本批**仅登录表单**（机制预留） |
| Q13 | 是否先出原型 | **不做原型**，直接落真仓（视觉真值已 SSOT、官方件照抄）——⚠️ **2026-09-17 UI 重做例外**：三面**出可点原型**评审后落规格（见 §14），本行仅适用 M4b-2 首轮 |

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

### 3.2 改造件（**UI 重做后 9 处**：原 6 + 重写 2 + 删件 1）

| # | 文件 | 改什么 | 依据 |
|---|------|--------|------|
| 1 | `components/ui/TopBar.tsx` | **删**「登录」占位 `<span>`（用户区移侧栏底部）｜**删**产品元信息三项与图标组件 import 残留 —— **已落（T5）**：43 → **41 行**，顶栏仅余 **4 件**（品牌 · `Separator` · `SidebarTrigger` · `LanguageSwitcher`） | 主 design §4 · P11 |
| 2 | `components/ui/SideNav.tsx` | **新增三组**（官方标准形态 `SidebarGroup` > `SidebarGroupLabel` + **`SidebarGroupContent`** > `SidebarMenu`；无需组标题的门户组保持现形态）｜底部产品元信息三项 → **用户区**｜**删** `APP_VERSION` 死常量 —— **已落（T4+T5）**：三组 + 用户区随 T4；元信息三项与 `APP_VERSION` 随 **T5** 删除 ⇒ Footer **仅余 `<UserMenu />`**（`children = 1` 实测） | 主 design §4 · U1 · P11 |
| 3 | `main.tsx` | 路由 **11 条**（`/login` `/device` 独立版式；其余入 `AppShell`）｜模块级 `bootstrapAuth()`（**不 `await`**） | 主 design §5.2 · U3 |
| 4 | `api/client.ts` | 增 **`apiPost`**（复用 `doFetch`）｜**401 单点分流**（`doFetch` 错误分支）｜`ApiGetOptions` 与 `apiPost` 选项各增 **`skipAuthRedirect?: boolean`**（§4.2 ④）｜导出 **`invalidateCache(prefix?)`**｜`sanitizeNext` 落 **`auth/next.ts`**（件 9，不放在本文件）。**执行期登记（T1 落地）**：`apiPost` + `doFetch` 参数化 + **`setUnauthorizedHandler`（401 登记口）** 已随 **T1** 落地（解 T1↔T2 循环依赖；登记口落本文件而非 `AuthProvider` 导出，防 ESM 循环）——401 **四分类消费**仍在 T2 | 主 design U3 · N2 |
| 5 | `i18n/zh.ts` + `i18n/en.ts` | 新增 `login`/`device` 两组；`errors` +9 码；`dashboard` +2 键；`navigation` +3 组标题键 −4 元信息键 | §10 |
| 7 | `pages/Login.tsx` | **视觉重写**照 §14.4 A（双栏 42/58 · 无白卡 · 无 tab · 无 `AuthLayout` 页头 · 语言切换右上角）——**功能契约不变**（请求形态 / 失败码 / 反向守卫 / 保码） | 批 design §14.4 A |
| 8 | `pages/Device.tsx` | **视觉重写**照 §14.4 B（单列居中 · 品牌小方块 · 无页头 · 四态不变） | 批 design §14.4 B |
| 9 | `components/console/AuthLayout.tsx` | **删件**（Q10）：登录/设备改全屏版式后无消费方 ⇒ 退役；语言切换落各页右上角 | 批 design §14.4 A/B |
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
  ⚠️ **视觉重做（2026-09-17）**：本节视觉部分（`Card` 版式 · 两 tab **⬠Q9** · 页头 **⬠Q10**）**以 §14.4 为准**；功能契约（请求形态 / 失败码 / 反向守卫 / 保码）不变
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
- 登录成功：`invalidateCache()` → 重取 `/me` → `navigate(next ?? '/')`
- **不显示注册入口**；**无侧栏/无用户区**；反向守卫见 §4.3
- 用户名为**中性文案**（不是「邮箱」——企业目录通道用 `sAMAccountName`）
- **落地（v1.9 · T6）**：件 `pages/Login.tsx`（**205 行**）已落仓；`main.tsx` 的 `/login` 占位改真页
  （`DEV_BATCH['/login']` 项**删除**）。**六项断言全实测通过**：独立版式（无侧栏/无顶栏）·
  **两 tab**（OAuth 侧 **CDP 真指针**切换后 `href=/api/auth/oidc/authorize` + `rel=noreferrer`；
  ⓘ 合成 `.click()` 对 Radix `Tabs` 无效）· **首帧骨架**（`/me` 延迟 1.6s：150-1500ms
  `skeleton=4 / form=false`，1650ms 落表单 ⇒ **Y3 实证**）· **错口令 inline + URL 不变** ·
  **成功链**（→ `/dashboard` + `/me` 200）· **反向守卫保码回跳**（`/device?user_code=ABCD-1234`）
  与非法 `next` 回落 `/dashboard`）
- **自检修复（v1.9 · 同轮）**：骨架卡结构**镜像表单卡**（`CardHeader` 标题位 + `CardContent` 逐位镜像
  Tabs 条 → （label + input）×2 → 提交钮）——原 `CardContent pt-6` 无 `CardHeader` ⇒ 实测高度差
  **103px → 13px**、顶部偏移 **0px**（消除 loading → anon 的切态跳动）
- **登记（F5 · 本批不处理的已知缺口）**：OIDC 成功 302 **`/?oidc=success`（不经 `next`）** 落门户首页，
  而门户面**零 `oidc` 消费点**（2026-09-16 实测 `apps/web/src` grep 零命中）⇒ 会话 Cookie 已建但
  `AuthProvider` 不知情（用户需刷新才见登录态）。**消费点落门户面会碰 M4a 零回归硬约束** ⇒ 交
  **M4b 收尾 / M4c**（主 design §7.2 G6 缺口的延续）

### 5.2 设备授权页 `/device`（线框见主 design §12；基址口径见主 design §3.4）

> ⚠️ **视觉重做（2026-09-17）**：视觉部分（卡式版式 · 页头 **⬠Q10**）**以 §14.4 为准**；四态与端点契约不变。

- 入参：`?user_code=`（预填 + 自动认领）或不带（手输）
- **四态**（Q4 = 完整实现）：

| 态 | 触发 | 呈现 |
|----|------|------|
| ① 输入 | 无有效码 / 码被拒 | `Field` + `Input`（placeholder 提示码形态 —— **实测 8 位大写字母数字无横线**，
如 `CMK68C6R`；T7 订正，原写 `XXXX-XXXX`）+ 「确认」`Button` |
| ② 已认领 | `GET /api/auth/device?user_code=` 200 **且响应含 `client_id`** | `client_id` / 请求范围
（`scope` 为 **`null`** = 全量；T7 实测订正，原写「空」）+ 「批准」/「拒绝」。**无「有效期」行**——
该接口**不返回** `expires_in`（T7 实测；该字段只在 CLI 侧 `POST /device/code` 响应里） |
| ③ 已处理 | 批准/拒绝成功，**或刷新后返回终态** | 「已批准」/「已拒绝」（终态，不再给动作）。
**实测**：批准后 `GET` 返回 `status:'approved'`（deny 后 `'denied'`）⇒ 刷新**自然落本态** |
| ② 变体 · **他人已认领** | 前置：`GET` 200 但**响应缺 `client_id`**（官方只把 `client_id`/`scope` 给
认领者）；兜底：非认领者 `POST /approve` → **403 `{error:'access_denied'}`** | 终态「该请求已由其他账号
认领」（**不给批准按钮**——调用方不可能是认领者）。**Q18② 实测定案**：此态**存在**，且**不是** ④ 码级
错误（T7 订正），`claimedByOther` 键**保留** |
| ④ 错误 | `invalid_request`（错码 / 已处理 / 未认领）· `expired_token`（过期）· 网络错 | 码级错误文案
（`Alert`），回到①。**错误体为 OAuth 风格 `{error, error_description}`**（唯一例外：缺参走本仓
`{code:'VALIDATION_ERROR'}`）⇒ 适配在 `api/auth.ts` 封装内（`ApiError.body`） |

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
- **未登录判定（T7 实测修正）**：**不能依赖 401 分流**——官方 `GET /device?user_code=` **未登录也返回 200**
  （只给 `status`、不给 `client_id`/`scope`）⇒ 401 分类**永不触发**，且未登录用户会因「响应缺 `client_id`」
  落入**「他人已认领」误报**。⇒ 页面**读会话三态设门**（`useAuth`，与 `/login` 顺序、`RoleGuard` 未登录
  判定同源）：`loading` → 官方 `Skeleton` 骨架（**不渲染表单**）· `anon` →
  `<Navigate to={/login?next=devicePath(user_code)} />`（**保码**，Q1）· `authed` → 四态流程 + 自动认领
  （自动认领的 effect **门控在 `authed`**）。**实测闭环**：未登录访 `/device?user_code=NP7954C5` →
  `/login?next=%2Fdevice%3Fuser_code%3DNP7954C5` → 登录 → **回跳并自动认领** ✓
- **落地（v1.10 · T7）**：件 `pages/Device.tsx`（**303 行**）已落仓；`main.tsx` 的 `/device` 占位改真页
  （`DEV_BATCH['/device']` 项**删除**）；独立版式由跨页件 **`components/console/AuthLayout.tsx`** 提供
  （与 `/login` 共用，T7 从 T6 的 `LoginScaffold` 抽出）。**十项断言全实测通过**：四态 · 保码闭环 ·
  预填（含大写归一）· 实测链 · **刷新态 = 终态** · 错误体适配（不落 `http_400`）· **他人已认领双路** ·
  门禁四连 · 生产产物零 `M4b-` · 门户零回归 **36/36**
- 本批**不消费** CLI 两端（`/device/code`、`/device/token`）

### 5.3 工作台临时落地页 `/dashboard`（Q5）

- `ComingSoon` 组件的**内容槽形态**（§5.4）：欢迎语（含 `displayName`）+ 入口按钮组
- **按 role 裁剪**（`hasRole`）：`role >= 1` → 我的资产 / 我的令牌；`role >= 10` → 审核队列
- **消费 `location.state.notice`（Q17）**：挂载时读 `state.notice` → `sonner` `toast.warning(...)` →
  立即 `navigate(pathname, { replace: true, state: null })` 清 state（**防刷新重复弹**）——
  **不因此发任何网络请求**（仍属下述「零请求」）
- **纯静态、页面自身零业务请求**（不调 `/api/reviews`、`/api/audit`——那些归 M4b-4 三卡）。
  ⚠️ **T8 实测口径补正**：`/dashboard` 渲染于 `AppShell` 内 ⇒ 壳层必然发出 ① `/api/auth/me`（会话探测）
  ② **`/api/stats`**（`SideNav.tsx:16` 的门户组计数徽章，**M4a 既有行为**——消除它需改门户壳，违反
  「门户零回归」⇒ 不做）⇒ 「零请求」的准确含义 = **页面自身**不发（实测除上述两条外 = **0**）
- M4b-4 用三卡替换本页（本页即为「不白屏」的过渡形态）
- **落地（v1.11 · T8）**：件 `pages/Dashboard.tsx`（**78 行**）已落仓；`main.tsx` 的 `/dashboard` 占位改真页
  （`DEV_BATCH['/dashboard']` 项**删除**）；`i18n` 的 `dashboard` 组 **+1 键**（`welcome` = 欢迎语，
  插值 `displayName`）。**六条断言全实测通过**：**档 0 未登录 → `RoleGuard` 拦到 `/login?next=%2Fdashboard`** ·
  **三档入口裁剪**（role=1 → 2 项「我的资产/访问令牌」；role=10 与 100 → 3 项，+「审核管理」）·
  **零业务请求**（排除壳层 `me`+`stats` 后 = 0）· 过渡件注释 · **`notice` toast 且刷新不重弹** ·
  门禁四连 + 门户零回归 **36/36**

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
| **门户**（M4a 既有） | **恒显示**，**带组标题「门户」**（2026-09-17 用户拍板翻转 Q3 · 与三组结构同构） | 首页 / 技能中心 / MCP / 专家 | 条目形态与三组统一（§14.6 P7） |
| **个人** | `authed`（`loading` 期不渲染） | 工作台 / 我的资产 / 我的提交 / 我的令牌 | 4 条全 `Link`（目标页为占位） |
| **管理** | `hasRole(role, 10)` | 审核队列 / 审计浏览 | 同上 |
| **超级管理** | `hasRole(role, 100)` | 标签管理 / 系统设置（占位条目）/ 用户管理（占位条目）——**共 3 条** | 同上 |

- 组级 + 条目级**同取 `hasRole`**；**组内无可见条目 ⇒ 整组不渲染**（主 design §4）
- 图标态（`collapsible="icon"`）：**随官方 `SidebarGroupLabel` 默认行为**（官方默认即真值；**不自写隐藏类**；T4 落地时记录实测值，不预设结论）——主 design U1 已断言「图标态隐藏组标题」，以官方实现为准
- **混排结构（F3 登记）**：门户组（裸 `SidebarMenu`，Q3 零回归）× 三组（`SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu`）在同一 `SidebarContent` 内**间距/分段视觉**未预设 ⇒ **T4 落地实测 + 用户确认观感**（不为统一而改门户组结构）
- **落地实测（v1.7 · T4）**：四档显隐全绿（未登录 = 门户组 only · 1 档 +个人 4 条 · 10 档 +管理 2 条 · 100 档 +超级管理 **3 条**）；
  **F3 计算值** = `SidebarContent` gap **4px** · 门户组底→首组顶 **4px** · 组内 padding **8px** · 组标签高 **32px**（观感待用户确认）
- **F4 ~~登记~~ 已关闭（v1.13 · T10 实测证伪）**：**T10 真机实测证明变体全部正常生效**——`.group` 与
  `data-collapsible="icon"` 同元素；折叠后组标签 `margin-top = -32px`（`-mt-8`）、`opacity = 0`、菜单按钮
  `32×32px`（`size-8!`）、容器 `66px`。T4 当时测得的「178px / marginTop 0px / opacity 1」= **展开态的值**
  ⇒ 未真正进入折叠态（**测量假阴性**）。原文保留如下（史实）：
- **F4（史实 · v1.7 · T4 实测异常）**：`collapsible="icon"` 下 `data-state=collapsed` 成立，但**部分
  `group-data-[collapsible=icon]` 变体未生效**——`hidden` **生效**（元素 computed width 0），而 `size-8!`（按钮仍 178px）·
  `-mt-8`/`opacity-0`（组标题 marginTop 0px / opacity 1，**未隐藏**）· `w-[calc(var(--sidebar-width-icon)+…)]`
  （container 仍 204px）**未生效**。已排除：mobile 视口（1440×900 复测同）· 祖先 `.group[data-collapsible=icon]` 缺失
  （`closest()` 命中）· M4b-2 引入（本批未改 `Sidebar`/`SidebarProvider` 配置）
  ⇒ **T10 实测证伪 ⇒ 本项关闭**（变体全部正常生效）：详见本文件 v1.13 修订行 +
  `docs/smoke/2026-09-16-m4b2-auth-shell.md` §7

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

> **UI 视觉重做（2026-09-17）**：本批三面（登录 / 设备 / 壳）的**视觉设计**见 **§14**（§14.4 落地规格 = 实现唯一依据；**§5.1/§5.2 的功能契约不变、视觉部分以 §14.4 为准**）。

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

### 9.4 出口件 ④（dogfood/观感）清单 —— 七项（Q9）

> **执行方式（v1.14 口径变更，用户 2026-09-16 授权代跑 + 认可）**：七项全为**功能/行为项**（是/否二值）
> ⇒ 改为 **CDP 自动断言**（脚本 `docs/smoke/scripts/m4b2-acceptance-checklist.ts`，可重放），
> 实测 **14 PASS / 0 FAIL + NO JS ERRORS**；原「用户实机逐项确认」不再逐条手工执行，
> 人工价值收敛为「**认可结论**」。⚠️ **审美面不在本批范围**（视觉打磨归 **M4b-7**）。

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
  **形态 = upsert（2026-09-16 T6 修正为 A2，用户拍板）**——原「删 `session`/`account` 再删 `user` 后重建」
  在 **`audit_log.actor_id` 有行**时恒 **23503 外键违反**（**实测引用 `"user"` 的外键 = 12 约束 / 9 张表**：
  `account` · `asset`×3 · `asset_label` · `asset_version`×2 · `audit_log` · `label_definition` ·
  `review_task`×2 · `session`；T3 落脚本时只清了 `session`/`account`，**T4 实测登录产生 8 条审计行后暴露**）。
  现形态：① **只清 `session`**（本前缀用户）——改口令后旧会话必须失效 ② `user`/`account` **有则改、无则建**
  （`user` 行**永不删除** ⇒ 引用表**全不需清理**，把 FK 触发器**根除**而非逐个补漏；`user.id` **恒定** ⇒
  既有 `audit_log` 等引用继续指向同一用户 = **审计留痕不丢**。**禁全表 `delete`** 不变（会话清理按前缀
  `like` 筛子集，可重放）；账号**改名**不在本脚本能力内（无删除面）——改名需手工清理旧行

### 9.6 本批验收结果（T10 收尾 · 2026-09-16 实测）

> 全部数字为实测产出；**完整证据**（门禁表 / dogfood 六组明细 / 种子输出 / 审计十一维 / 行数权威表 /
> F4 结论 / 观感清单）= `docs/smoke/2026-09-16-m4b2-auth-shell.md`。

| 件（§9.1-9.5 口径） | 结果 |
|---------------------|------|
| **门户零回归**（§9.1） | ✅ `m4a-dogfood` **36/36 + NO JS ERRORS** · `m4a-chain-smoke` **PASS** |
| **五门禁**（§9.2） | ✅ 逐项 exit 0 —— `install --frozen-lockfile` · `typecheck` · `lint` · `format:check` · `build` · `db:migrate` · **`CI=true bun run test` = 500 pass · 1 skip · 0 fail**（501 例 / 48 文件；与 M4b-pre 基线逐项一致 ⇒ **零回归**） |
| **dogfood 六组**（§9.3） | ✅ **24 PASS / 0 FAIL + NO JS ERRORS**（G1 未登录壳态 4/4 · G2 `role=USER` 6/6 · G3 `role=ADMIN` 4/4 · G4 `role=SUPER_ADMIN` 4/4（占位条目 ×2 + 轻提示）· G5 登录→菜单→登出 4/4 · G6 设备授权认领→批准 2/2） |
| **出口件 ④ 七项**（§9.4） | ✅ **CDP 自动断言 14 PASS / 0 FAIL + NO JS ERRORS**（用户授权代跑 + 认可；口径变更见 §9.4；证据文件 §11） |
| **种子数据**（§9.5） | ✅ A2 upsert **第 3 次复跑幂等**（`cleared 24 session(s)` + 三账号 `updated`）⇒ 3 账号就绪 |

**整体审计（十一维）**：无未决项 —— 死导出 0 · i18n 键（132 / 双语差集 0 / 孤儿键违规 0 / 裸键泄漏 0）·
批次号残留（产物 0 / `DEV_BATCH` 余 7 项均有占位路由）· 类串重复（T7 收敛）· 越轴值 / token（零新增）·
**F4 关闭**（实测证伪测量假阴性）· 旧口径指针 5 处关闭 · **行数声明订正**（立权威表，后续批次 `wc -l` 实测）。

## 10. i18n 变更规格

**新增 2 组**（`login` **8 键** / `device` **13 键**）；`errors` **+12 码**（T9 实测）；`dashboard` **+2 键**；`admin` **+1 键**；`navigation` **+3 键 / −4 键**（zh 真源 / en 完整对齐，缺键即编译错）。

> **UI 重做轮实测订正（2026-09-17 · T15 脚本真实 import 产出）**：① `login` 组 **8 → 16 键**（删 `tabLocal` · `tabOidc` → `oidcLink` 改名改值 · 增 `subtitle`/`oidcOpen`/`backToForm` + **左栏品牌面板 5 键** `brandTagline`/`heroTitle`/`heroDesc`/`feature1-3`）② `device` 组 **13 → 14 键**（`subtitle`）③ `navigation` 组 **12 → 13 键**（`adminBoard` = 「管理看板」/「Admin Dashboard」，§14.7）⇒ **本批 UI 重做净增 11 键**（+`navigation.groupPortal`）；**当前全仓 222 键 / 11 组**（含 M4b-3 的 `submissions` 25 / `tokens` 47）· **双语双向差集 0** · 占位符不一致 **0**。**史实值（下方 T9 的 132 键 / 净增 41）保留不改，以本条为准**（沿用 v1.12「史实保留 + 以本条为准」纪律）；证据 = `docs/smoke/2026-09-17-m4b2-ui-redo.md` §3。另 **Q10** 连带：删件 `components/console/AuthLayout.tsx`（零 i18n 影响）。
>
> **键数口径（单一来源，防两处并读出错 · T9 实测定案）**：**T9 实测回填（2026-09-16）**：数字全部由审计脚本从 `apps/web/src/i18n/zh.ts` **真实 import** 产出
（非人工点数）。批前基线 = M4b-2 首个提交 `e569298` 的父提交 **`0ff0693`**（**91 键 / 7 组**）⇒ 当前
**132 键 / 9 组** ⇒ **净增 41 键**。逐组：`login` **8**（新组）· `device` **13**（新组）· `errors` **+12**
（18 → **21**）· `navigation` **+3**（9 → 12）· `dashboard` **+2**（4 → 6）· `admin` **+1**（6 → 7）·
`common` **+2**（5 → 7）· `market` **53**（未变）· `review` **5**（未变）。算式 = 8 + 13 + 12 + 3 + 2 + 1 + 2
= **41** ✓
> 三处史实值**不改、以本条为准**：① §13 **v1.0** 的「i18n 22 键 + 9 码」= 两组新增的**窄口径**
> ② §10 **v1.7** 的「净增 39 键」= `device` 仍按 14 计 + `errors` 仍按 +9 计的**中间值**（T7 删
> `expiresLabel`、T9 补 3 码后失效）③ §10 **T6 落值**曾写「键数 39 → 56」，同为中间值（**作废**）。
> ④ **v1.10/v1.12 的「跨面共享码（暂零消费）」登记不变**：`oidc.not_configured` 与
> `auth.session_expired` 在本批内仍无消费点（收尾整体审计**勿判死键**）

| 组 | 键 | 说明 |
|----|-----|------|
| `login`（**10**） | `title` · **`subtitle`**（新）· `username` · `password` · `submit` · `submitting` · **`oidcLink`**（原 `tabOidc` 改名 · 值改「使用 OAuth 登录」）· `oidcHint` · **`oidcOpen`**（新 · 「打开统一认证页」）· **`backToForm`**（新 · 「返回密码登录」） | **UI 重做轮（2026-09-17 Q9）**：撤两 tab ⇒ 删 `tabLocal`；新增 3 键、改名 1 键 ⇒ **8 → 10 键** |
| `device`（**13**） | `title` · `codeLabel` · `codePlaceholder` · `confirm` · `clientLabel` · `scopeLabel` ·
`scopeAll` · `approve` · `deny` · `approved` · `denied` · `claimedByOther` · `invalidCode` | 四态文案。
**T7 落定**：① ~~`expiresLabel`~~ **删除**（详情接口不返 `expires_in` ⇒ 无数据源）⇒ 14 → **13 键**
② `claimedByOther` **保留**（Q18② 实测：此态存在，判定 = GET 响应缺 `client_id` / approve 403）|
| （`errors` 组） | 无新增 | device 错误经 `api/auth.ts` 归一到 `device.invalidCode` /
`device.claimedByOther` ⇒ **走 `device` 组文案**（不占 `errors` 组） |
| `errors`（**+12**） | 本批新增：`auth.invalid_credentials` · `auth.user_disabled` · `auth.user_pending` ·
`auth.ldap_denied` · `auth.email_missing` · `auth.email_conflict` · `auth.csrf_failed` · `auth.session_expired` ·
`oidc.not_configured`（**T6 落 9 码**）+ **`auth.forbidden` · `auth.oidc_denied` · `auth.oidc_state_mismatch`**
（**T9 补 3 码**） | 组规模 **18 → 21 键**。**T9 实测：服务端 `auth/errors.ts` 实有 12 码 ⇒ 覆盖 12/12、
缺失 0**（`auth.rate_limited` M4a 已落）。补 3 码依据 = 本 plan 断言③「`errors` 组覆盖服务端实有码」——
`auth.forbidden` 是**真实可达**的用户可见错误（越权 403），原缺 ⇒ 落 `errors.unknown` 兜底，体验不佳 |
| `common`（**+2**） | `comingSoon` · `noPermission` | **T3 落**：7 条占位页 description + 守卫档位不足 notice |
| `dashboard`（+2） | `submissions`（**T3 落**）· `welcome`（T8） | 侧栏条目 + 临时页欢迎语 |
| `navigation`（+3/−4） | **+** `groupPersonal` · `groupAdmin` · `groupSuperAdmin`；**−** `starRepo` · `footDocs` · `footFeedback` · `versionLine` —— **增删均已落**（+3 随 T4 · −4 随 **T5**，`grep` 四键零残留） | 组标题；元信息三项删除 |
| `navigation`（**+4**，T4 落） | `roleUser` · `roleAdmin` · `roleSuperAdmin`（徽章）· `logout`（用户菜单） | T4：角色徽章 3 键（用户拍板）+ 登出项 1 键（遗漏补缺） |
| `admin`（**+1**，T4 落） | `settings` | 超管组「系统设置」条目（遗漏补缺） |

> 文案分层口径（主 design §11）：导航条目用**短词**，页头用**全称**。
>
> **T9 实测定案（v1.12 · 全量）**：**T9 实测回填（2026-09-16）**：数字全部由审计脚本从 `apps/web/src/i18n/zh.ts` **真实 import** 产出
（非人工点数）。批前基线 = M4b-2 首个提交 `e569298` 的父提交 **`0ff0693`**（**91 键 / 7 组**）⇒ 当前
**132 键 / 9 组** ⇒ **净增 41 键**。逐组：`login` **8**（新组）· `device` **13**（新组）· `errors` **+12**
（18 → **21**）· `navigation` **+3**（9 → 12）· `dashboard` **+2**（4 → 6）· `admin` **+1**（6 → 7）·
`common` **+2**（5 → 7）· `market` **53**（未变）· `review` **5**（未变）。算式 = 8 + 13 + 12 + 3 + 2 + 1 + 2
= **41** ✓
>
> **T9 校验全绿**（审计脚本实测）：① 双语**双向差集 = 0**（组级 + 键级）② 插值占位符**不一致 = 0**
> ③ 空值 = **0** ④ `errors` 组 vs 服务端 `auth/errors.ts`：**实有 12 码覆盖 12/12**（缺 0）⑤ 门禁四连 + 
> 生产产物零 `M4b-` + 门户零回归 **36/36**。
>
> **T9 补 3 码（本批唯一内容改动）**：`auth.forbidden` · `auth.oidc_denied` · `auth.oidc_state_mismatch`
> ——依据 = plan 断言③「`errors` 组覆盖服务端实有码」（07 §4 方针）；原表把三者推给主 design §7.2 G6，
> 但 `auth.forbidden` 在**本批即可达**（越权 403）⇒ 不补则落 `errors.unknown` 兜底。
>
> **T6 落值（v1.9 · 史实）**：`login` 组 **8 键** + `errors` **9 码**（`auth/errors.ts` 12 码取其中 8 个 +
> `oidc.not_configured`——后者见 `http/oidc-routes.ts:98,127` 的 404 体，**服务端确有、非臆造**）。
> **跨面共享码（暂零消费）登记**：`oidc.not_configured` 与 `auth.session_expired` 在 M4b-2 内**无消费点**
> （OAuth tab 零前置探测 ⇒ 404 落独立标签页；401 已被 §4.2 全分流）——落键依据 = 完整覆盖服务端实有码，
> 消费点随后续批出现（**收尾整体审计勿判死键**）。
>
> ⚠ **口径待定项已全部关闭（T9 收口）**：① `device.claimedByOther` **保留**（T7 实测该态存在）
> ② 角色徽章 3 键 **T4 已落** ③ `device` 组 **13 键**（T7 删 `expiresLabel`）

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

### 12.2 §14 UI 重做轮自检（2026-09-17 · **全文换靶复读**口径）

> **方法**：按 Step 0「读全文」要求**通读全篇（读入基线 899 行 ⇒ 落档后 939 行）**后打分（非只看 §14）；换靶探针 = ① 表/图/真码三向一致 ② 同一量跨节对照 ③ 修订记录声明回查实体 ④ 引用语义回读（`file:line` 打真码）⑤ 死键/孤儿键扫描。
> **本轮抓到并同轮修复 = 14 处 + 开口项 2 项已闭环**（F1-F14 · Q9/Q10），其中 **2 处真矛盾**（🔴）：**§5.1「中部居中 `Card` / 无侧栏无顶栏」× §14.4「双栏 · 无白卡」（同一页两套版式）** · **§2.1 Q2/§5.1「两 tab」× §14.4「单表单 + OAuth 链接」（同一能力两种交互）**；其余为口径漂移（§8 指针 · Status 行 · §14.6 色值/条目名/回写状态 · Q13 原型例外 · 高度基准写实）。

| 维度 | 评分 | 说明 |
|------|:--:|------|
| 完整性 | **9.7** | §14 七段齐（现状 / 方向 / 三判 / 落地规格 / 验收断言 / 评审留痕 / 登记）· 断言 **26 条**分面 · 2 项开口项以 ⬠ 显式标注（不藏） |
| 一致性 | **9.7** | 🔴 两处真矛盾已打通且 **⬠Q9/Q10 均已闭环**（§5.1/§5.2 分界 · §10 键数订正 · §14.4/§14.6 写实 · §8/§12/Status 指针同步） |
| 清晰度 | **9.6** | 三面规格 = 层 × 规格 × 令牌三列；开口项集中在 §14.4 表尾一条 |
| 可实施性 | **9.6** | 实现者可照抄（尺寸档 / 令牌名 / 组件落位 / 验收阈值 **29 条**齐）；登录/设备版式基准（全屏 · 无页头）已定 |
| 设计纯粹性 | **9.7** | 零新增 token（原型硬编码值已 token 化）· 未采纳方向不落档 · 原型 DEV-only 定稿即删 |
| 边界覆盖 | **9.6** | 四态 / 图标态 / loading 骨架 / 错误 inline / 无白卡 / 无「验证码」· 新增独立版式页头边界（⬠Q10） |
| 实施精度 | **9.7** | 引用行号逐条回读（`SideNav.tsx:105/139-140/167` · `TopBar.tsx:25` · `AuthLayout.tsx:17`）· 几何/令牌值全实测（无估算） |
| 跨平台 | **9.6** | 无平台分支；图标 SVG 三平台一致；原型删除后零残留 |
| **综合** | **9.65** | ✅ 达门（≥9）——`(9.7+9.7+9.6+9.6+9.7+9.6+9.7+9.6)/8`（Q9/Q10 闭环后重算；缺口项已消）。**附**：M4b-2 实现轮（v1.2 口径）**9.44** 仍适用于 §1-§11 的功能/契约部分（本轮未改其内容，仅加指针） |


**§14 收口重评（converge · 2026-09-17 · v1.21 定稿+落地）**：实现落地与验收回写后重评 **8 维 = 9.73**（完整性 9.7 · 一致性 9.8 · 清晰度 9.7 · 可实施性 9.8 · 设计纯粹性 9.7 · 边界覆盖 9.7 · 实施精度 9.8 · 跨平台 9.6）。**提分来源**：① 两处设计值与真码不一致被实测推翻并回写（内容区 `8px 22px` · 图标态 `--sidebar-width-icon 48px`/面板 50/容器 64）② i18n 口径由「错基线的 135/44」纠正为实测 **221 键 / 11 组 · 本批净增 10** ③ 断言 **37/0** 与门禁 exit 0 的实测证据入档（设计规格可被照抄并被执行验证）。**扣分点**：`/assets/:slug` 顶栏标题区因无既有键而不渲染（零新增键纪律的已知取舍）。

**§14 补充轮次重评（2026-09-17 · v1.22 侧栏条目形态统一）**：8 维 **9.74**（完整性 9.8 · 一致性 9.8 · 清晰度 9.7 · 可实施性 9.8 · 设计纯粹性 9.7 · 边界覆盖 9.7 · 实施精度 9.8 · 跨平台 9.6）。**提分来源**：① 用户观感反馈驱动出新规格「形态统一」，5 维硬差 → **14 条逐项相同**（实测背书：`uniqH/uniqW/uniqSlot` 各仅一个值）② 门户面改动**显式登记 P7**（不偷改）③ 断言随规格同步扩容（29 → **30 条**，+C4b）。**扣分点**：门户组英文副标由「常显」变「hover 可见」（信息密度换视觉一致性，用户拍板取舍）。

**§14 补充轮次 2 重评（2026-09-17 · v1.23 门户组加标题 + 全中性底）**：8 维 **9.75**（完整性 9.8 · 一致性 9.8 · 清晰度 9.8 · 可实施性 9.8 · 设计纯粹性 9.7 · 边界覆盖 9.7 · 实施精度 9.8 · 跨平台 9.7）。**提分来源**：① 原 Q3 拍板**翻转**在四处（§2 现状 / §2 Q3 / §6.1 矩阵 / §14.4 分组）**同步登记**，无悬空旧口径 ② 衬底统一后「形态 + 色」二维全对齐（`uniqH/uniqW/uniqSlot` + 常态衬底种类 = 1）③ 断言随规格扩到 31 条（+C4c）。**开口项**：**P8**（收起态图标几何居中，偏右 7px）⬜ 待用户拍板。

**§14 补充轮次 3 重评（2026-09-17 · v1.24 侧栏宽/圆角对齐官方）**：8 维 **9.78**（完整性 9.8 · 一致性 9.8 · 清晰度 9.8 · 可实施性 9.8 · 设计纯粹性 9.7 · 边界覆盖 9.7 · 实施精度 9.9 · 跨平台 9.7）。**提分来源**：① 与官方 registry 逐字符比对（去格式差异后等价）作为**决策依据入档** ⇒ 「对齐官方」不再靠印象 ② AIH 覆盖点**收敛记录**（3 → 2 处，圆角覆盖退役）③ 断言随新值同步（C1/C2/C4b/C9 四处）并重跑 **39/0**。**扣分点**：滚动条保留 AIH 自定义 ⇒ 与官方原生不一致（**用户明示取舍**：视觉体系优先）。

**本轮换靶实证（供复审）**

| # | 位置 | 问题 | 处置 |
|---|------|------|------|
| F1 | 🔴 §5.1 × §14.4 | 同一页两套版式（居中 `Card` vs 双栏无卡） | ✅ **已闭**：§5.1 加「视觉以 §14.4 为准」分界 + **Q10 定去页头** |
| F2 | 🔴 §2.1 Q2 / §5.1 × §14.4 | 两 tab vs 单表单 + OAuth 链接（同一能力两种交互） | ✅ **已闭**：Q9 拍板撤 tab（§5.1 加分界 · §10 键数订正 · §14.4 规格写实） |
| F3 | 🟡 §14.6 | 登录页行仍写 `#f9fafb`/`black/10`（token 化前值） | 改 `bg-muted` / `border-input` |
| F4 | 🟡 §14.6 | 映射表条目名「我的令牌」≠ 真码 `dashboard.tokens`「访问令牌」 | 订正 |
| F5 | 🟡 §14.6 | 壳状态仍「🔵 评审中」/「回写真仓 = 待拍板」 | 改 ✅ 已定（P1-P6 结案） |
| F6 | 🟡 §8 尾注 | 「§14 回炉中，待回填」→ 已回填 | 改指 §14.4 |
| F7 | 🟡 Status 行 | 「UI 视觉重做中（v1.15 回炉）」 | 改「§14 定稿候选（v1.19，⬠2 项）」 |
| F8 | 🟡 §2.1 Q13 | 「不做原型」与本轮出原型冲突 | 加例外注 |
| F9 | 🟡 §14.4 A/B | 高度 `calc(100svh-58px)` 系**原型控制条**，非实现基准 | 改「视口余量 + ⬠Q10」 |
| F10 | 🟡 §14.4 C 顶栏 | 原型字标曾写 `text-primary` ≠ 真仓渐变字 | 改真仓形态（`TopBar.tsx:25`） |
| F11-F14 | 🟡 | 映射表条目名 / 回写状态 / §5.2 视觉指针 / §14.4 开口项块 | 同轮修 |


## 14. UI 视觉设计（重做 · 2026-09-17 用户拍板：本批内升版，不另立批）

> **范围（用户 2026-09-17 定）**：仅 **本批交付面** —— 登录页 `/login` · 设备授权页 `/device` · 应用壳（侧栏 / 顶栏 / 用户区）。
> **非范围**：M4b-3 已交付两页（我的提交 / 我的令牌）与工作台落地页**本轮不动**；全站最终打磨仍归 **M4b-7**。
> **视觉体系 SSOT**：`M4a design §4.4`（令牌/色板/渐变白名单）+ 主 design §10.1（控制台特有值：表格密度 40 / 抽屉宽 560）—— **本段只记本批页面的视觉规格与令牌语义，不复制体系值**（防漂移）。
> **流程（用户 2026-09-17 定）**：① 出 **2–3 个方向的可点原型**（真件 + 假数据 + 浏览器实拍截图）② 用户 **三判**（气质 / 密度 / 类型色）③ 回填 §14.3/§14.4 ④ 定稿（本仓 8 维 ≥9）⑤ 实现 → 真浏览器逐条验收。

### 14.1 现状与问题（真值 · 2026-09-17 实测）

**实测口径**：headless Edge（Edg/153）桌面视口 **1440×900** · `getComputedStyle` + `getBoundingClientRect` 取值；登录页可匿名访问 ⇒ 真机实拍 + 量值；`/device` 与壳需登录态 ⇒ 本次仅取**结构真值**（视觉待原型期用假数据复现）。

| # | 面 | 现状实测 | 问题 |
|---|----|---------|------|
| 1 | 登录页 · 卡片位置 | `Card` **384×345 @ (528, 78)** ⇒ 下方留白 **477px** | **不垂直居中**，视觉重心上浮 ✗ |
| 2 | 登录页 · 卡片层次 | `border: rgb(227,234,246)` · `box-shadow` **全 0** · `radius 14px` | 卡片**无投影** ⇒ 层次全靠描边，观感偏「表单盒」而非「登录卡」✗ |
| 3 | 登录页 · 标题层级 | 卡内主标题 `font-size: **16px**`（= 正文同级） | 标题**层级不足** ✗ |
| 4 | 登录页 · 控件密度 | 输入框/主按钮高 **36px** · 圆角 **8px** · 输入字号 **14px** | 密度偏紧（大屏空旷 + 小控件）✗ |
| 5 | 登录页 · 页宽利用 | 卡内内容宽 **334px**（视口 1440 ⇒ 两侧留白 ~1100px） | 空旷，无品牌/图形承载 ✗ |
| 6 | 登录页 · 顶部区 | 品牌 **68×26 @ (24,26)** · 语言切换器 **40×24 @ (1339,27)** | 顶部元素**极小且贴边**（无顶栏节奏）✗ |
| 7 | 登录页 · 卡内间距 | `Card` padding = **`24px 0px`**（水平 0 ⇒ 内容靠内层 25px） | 内距**两级混用不统一** ✗ |
| 8 | 全局 · 底色与主色 | page bg `rgb(248,250,255)` · 主色按钮 `oklch(0.488 0.243 264.376)`；主色仅出现在主按钮与语言切换激活态 | 蓝科技基调**成立但承载弱**（无渐变/无图形/无品牌层次）✗ |
| 9 | 设备授权页 | 结构真值（§5.2 四态：输入码 / 待确认 / 成功 / 失败，卡内表单）· **与登录页同一卡式版式** | 问题 1–7 **同构** ✗ |
| 10 | 壳 · 侧栏 | 结构真值（§6.1 · T4/T10 实测）：门户组（裸 `SidebarMenu`）与三组（`SidebarGroup`）**混排**；`SidebarContent` gap **4px** · 组标签高 **32px** · 折叠容器 **66px** | 混排节奏未定（F3 遗留）+ 两类条目**形态不统一** ✗ |
| 11 | 壳 · 顶栏 | 结构真值（§3.2/§8）：品牌 + 侧栏触发钮 + 语言切换（删占位与元信息后） | 顶栏**仅功能性** ⇒ 无页面标题/面包屑/环境标识，信息密度低 ✗ |
| 12 | 壳 · 用户区 | 结构真值（§6.2）：四态（骨架 / 登录入口 / 头像+名+角色徽章+菜单 / 图标态只留头像） | 与侧栏条目的**视觉权重关系未定** ✗ |

### 14.2 设计方向（风格板）✅ 已评审（2026-09-17）

> 每方向一句话气质 + 真实公开产品参照 + **差异轴**（❌ 仅换主色不算方向）；用户拍板 1 个方向后做高保真可点原型。

**结论**：原型给出 3 个方向（V1 浅蓝·品牌承载 / V2 深蓝·指挥舱 / V3 浅色·紧凑效率），经原型评审**采纳 V1**（规格见 §14.4）；**未采纳方向不落档**（用户既有纪律：被否决方案不进文档）。

### 14.3 拍板结果（三判）✅ 已定（2026-09-17）

| 判 | 拍板值 | 依据 |
|----|--------|------|
| 气质 | ✅ **V1 浅蓝·品牌承载**（左品牌面板渐变 + 右表单；表单**无白卡**、整体居中） | 用户 2026-09-17「按推荐来」（= 其已确认的登录页形态即 V1）· V2 深蓝·指挥舱 / V3 浅色·紧凑效率**不采纳** |
| 密度 | ✅ **沿用**（输入 **48** · 主按钮 **42** · 字段间距 **22**；表格密度 **40** = 控制台既有值） | 同上；本轮只重做观感，不动体系值 |
| 类型色 | ✅ **沿用 `M4a §4.4`**（skill / mcp / agent 三类型色 + 状态语义色）——零改动 | 同上（类目色属体系层，本批不动） |

### 14.4 落地规格 ✅（2026-09-17 回填）

> **面 × 规格**：登录页 / 设备页 / 壳。**纪律**：只记**令牌语义 + 尺寸档**，色值只住 `aih-theme.css`；新语义色须入体系 token（本规格**零新增 token**）。
> **实现基线**：下表全部来自**原型实测**（headless Edge · 视口 **1440×900** · `getComputedStyle` / `getBoundingClientRect`）；实现件**照抄，零二次决策**。原型为 DEV-only 一次性件，定稿后删除。

#### A. 登录页 `/login`（方向 V1）

| 层 | 规格 | 令牌 / 依据 |
|----|------|------------|
| 容器 | 双栏 `grid-cols-[minmax(0,42%)_minmax(0,58%)]` · 高 = **视口**（`min-h-svh`）——**不套 `AuthLayout`**（**Q10 已定**：该件退役 ⇒ `components/console/AuthLayout.tsx` 删件；**无页头**，品牌只落左栏） | 42% 实测 = **600px** @1440 |
| 左栏 | `p-12`（**48**）· `flex flex-col justify-between` 三段：① 字标 **17px/700** tracking **-0.3px** + 副标 **12px** `white/70` ② H1 **34px/700** + 描述 **14px** `white/80` `max-w-md` + 特性 `ul` **14px** `white/85`（`mt-8 space-y-3`）③ 版权 **12px** `white/60`「Apache 2.0 · 可自托管」 | 底 = **`--gradient-brand`**（C 层，品牌渐变）· 白阶 = white/70 · /80 · /85 · /60 |
| 右栏 | `flex items-center justify-center px-12` ⇒ 表单列在右栏内**水平 + 垂直居中** | 实测偏移 **0 / 0**（列心 1015 = 右栏心 1015） |
| 表单列 | `w-full max-w-[336px]` | 实测宽 **336** |
| 标题 | `h2` **24px/600** tracking **-0.2px** `text-center` | 文案「登录 AI X Hub」 |
| 副文案 | `p` **13px** `text-muted-foreground` `text-center` `mt-1` | 文案「**使用企业目录账号登录**」（无「或本地账号」） |
| 字段 | 高 **48**（`h-12`）· 圆角 **28px**（`rounded-[28px]`）· `px-4` · 字号 **14px** · 底 `bg-muted` · 描边 `border-input` · 占位 `placeholder:text-muted-foreground/60` · 聚焦 `focus-visible:border-primary/40` | **零新 token**（实测底 `#f1f5fb` / 描边 `#e3eaf6` 即既有 `--muted` / `--input`） |
| 字段间距 | form `gap-[22px]` ⇒ **22px**；标题块 ↔ 表单 **24**（`mt-6`） | 对标 DeepSeek 实测行距 |
| 主按钮 | 全宽 **336** × 高 **42**（`h-[42px]`）· 胶囊 `rounded-full` · `variant="default"`（`bg-primary`） | 字号 14 / 字重 500 |
| 错误态 | **inline `<p role="alert">`**（**非** Alert 块）· **13px** / `leading-[22px]` / `text-destructive` / `px-1` | 位置 = 密码字段与主按钮之间 |
| 底部 | 仅「**使用 OAuth 登录**」文本按钮（**13px** `text-muted-foreground`）⇒ 切**备用面板**（OAuth 说明 + 「打开统一认证页」按钮 + 「返回密码登录」链接；**Q9 已定：撤两 tab**） | 无第三方图标行 · 无 `Tabs` 组件 |
| 语言切换 | **右栏右上角**（页面级绝对定位；Q10 连带） | 原在 `AuthLayout` 页头右侧 |
| 禁止项 | **不套 `Card`**（无白卡 · 表单直落页面底）· **无「验证码登录」** | 对标 DeepSeek 实测形态 |
| ⬠ **开口项** | ✅ **已闭环（2026-09-17 用户「按推荐来」）**：**Q9** 撤两 tab（单表单 + 底部 OAuth 链接 + 备用面板）· **Q10** 去 `AuthLayout` 页头（该件退役删件 · 语言切换落右栏右上角）—— 连带 i18n `login` 组 **8 → 10 键**（见 §10 订正）| — |

#### B. 设备授权页 `/device`

> **轻量家族对齐**（与登录页同语言；不做深设计）——`approve` 只能由人在浏览器完成 ⇒ 页面不可撤；CLI 侧消费者归 M5。

| 层 | 规格 | 令牌 / 依据 |
|----|------|------------|
| 容器 | 单列居中 `flex min-h-svh items-center justify-center p-12`（**不套 `AuthLayout`**，同 A · Q10） | 无左品牌面板（区别于登录页） |
| 品牌块 | **28×28**（`size-7`）圆角 `rounded-md` 方块 · `--gradient-brand` 底 · 白字标 | 复用 C 层渐变 |
| 标题 / 副文案 | **24px/600** 居中 · **13px** `text-muted-foreground` 居中 | 副文案「在 CLI 中粘贴下方授权码后，回到此处确认」 |
| 语言切换 | **右上角**（同 A · Q10 连带） | — |
| 授权码输入 | 与登录页字段**同规格**（48 / 28 / 14 / `bg-muted` / `border-input`）+ **`letter-spacing: 2.52px`**（等宽手感）· 占位「粘贴授权码（8 位）」 | 8 位码 + 粘贴切分（先例：M5 契约） |
| 主按钮 | **336×42** 胶囊「确认授权」 | 同 A 主按钮 |
| 四态 | 输入码 / 待确认 / 成功 / 失败（骨架态复用 `Skeleton`；错误复用 inline 通知） | 不新增组件（沿用官方件） |

#### C. 应用壳（顶栏 / 侧栏 / 内容区 / 用户区）

| 层 | 规格 | 令牌 / 依据 |
|----|------|------------|
| 顶栏 | **官方 `SiteHeader` 形态**（2026-09-17 拍板对齐）：高 `h-[var(--header-height)]`（= **58**；变量见 `aih-theme.css` · 官用简写本仓未生成 ⇒ 方括号等价形式）· `shrink-0` + `transition-[width,height]` · **宽 = 内容区宽**（视口 − 侧栏 = **1184**，**不再横跨全宽**）· **内层容器** `div.flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6`（内距归它）· 左→右：`SidebarTrigger`（`-ml-1`）→ `Separator`（`mx-2`）→ **语义 `<h1 class="text-base font-medium">`**（当前路由标题；未知路由不渲染）→ 右侧 `ml-auto`（语言切换）· **图标态保持 58**（跟 `dashboard-01`，撤除 58→42 收矮）· **品牌已移出**（落侧栏顶部） | ⚠️ 保留 AIH 差异：`sticky top-0 z-20 bg-card`（官方不 sticky；本仓内容随文档滚动，去掉会连带滚走 = 功能性保留）· 原「标题 + 分区」自绘撤除 |
| 侧栏 | **官方默认 `variant="sidebar"`**（实心贴边 · 不套壳 · 2026-09-17 用户拍板）：展开宽 **256**（= 官方 `16rem`）· 收起态 `--sidebar-width` 切至 **48**（**面板 47** · 容器 **48** · 顶到最上 `inset-y-0`）· 圆角/边框/阴影均为 **0/0/none** · 官方 container 右缘 **1px** `--sidebar-border` 分隔线 · 顶部品牌区 `SidebarHeader` 与底部用户区 `SidebarFooter` **均无自定义底色**（继承面板底 `--sidebar` `#f6f9ff`；2026-09-17 曾试两版自定义底色，用户要求**还原**）· **滚动条轨道无底色**（`html` 的 `scrollbar-color` 第二值**显式透明**，用户拍板「滚动条不要背景色」；滑块 `--scroll-color` 不变）；机制**只一套**（标准属性） | **AIH 覆盖点收为 1 处**（仅两个宽度变量）· 定位覆盖与圆角覆盖**均已退役** |
| 分组 | **4 组**：门户 / 个人 / 管理 / 超级管理 —— **四组均有组标题**（2026-09-17 用户拍板加「门户」）· 组标题 **11px** `uppercase` tracking **0.88px** · 高 **32** · 四组结构同构（`SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu`） | 门户加标题 = 用户 2026-09-17 拍板**翻转原 Q3**（登记 §14.6 P4） |
| 条目 | **14 条同款**（2026-09-17 拍板统一）：高 **32** · 宽 **224**（= 239 − 滚动条槽 15）· 圆角 **8** · 字号 **14** · 图标 **16** · 展开态图标槽 **22×22**（圆角 6px）· **收起态**：按钮 **32×32** + 衬底槽 **32×32 铺满按钮**（`-m-2` 抵 `p-2`）⇒ **单层底色**（选中 `bg-primary`/常态 `bg-muted`，无第二层）· 文字与计数按 **`collapsed` 状态隐藏** · 单行 + `truncate` | 激活态 = `isActive`（`EXACT_MATCH_PATHS` = `/` + `/dashboard`）· hover 提示 = **纯中文**（与三组同款；原「中文 · 英文」撤除）· 收起态不套壳/不收矮顶栏 |
| 用户区 | `SidebarFooter` 高 **65** · `p-2`（8）· 上边框 · `Avatar` **32**（`size-8 rounded-lg`）+ 名称 **14px/500** `truncate` + 角色 `Badge variant="secondary"` + `ChevronDown` **16**；下拉四项：我的账号 / 我的资产 / 访问令牌 / 登出 | 形态照真仓 `UserMenu.tsx`（四态：骨架 / 登录入口 / 用户菜单 / 图标态只留头像） |
| 内容区 | `SidebarInset`（官方件）+ 内层 `div` 承载 padding **8px 22px**（实测 `innerPad=8px 22px`）· 起点 `x = 256`（随侧栏宽）· 撑满 `min-h-[calc(100svh-var(--header-height))]` + `flex-1`（去硬编码口径不变） | ⚠️ **订正（v1.25）**：`main` 已由自定义容器改为官方 `SidebarInset`（顶栏移入其内）⇒ padding 落「直接子 div」（断言 C9 取样点随之更新） |

### 14.5 验收断言 ✅（2026-09-17 回填）

> **口径**：沿用 §9.2（五门禁）+ §9.3（dogfood）；本段视觉类断言 = **真浏览器几何量值 + 截图留证**（执行方式沿用 §9.4：CDP 自动断言脚本入仓 `docs/smoke/scripts/`，人工侧只保留「观感认可」）。

**A. 登录页**

| # | 断言 | 阈值 / 判据 |
|---|------|------------|
| A1 | 表单列宽 = **336** | ±0 |
| A2 | 表单列在右栏内水平 + 垂直居中 | `|dx| ≤ 1` 且 `|dy| ≤ 1` |
| A3 | 标题 `h2` 字号 = **24px** 且居中 | `text-align: center` · 列心偏差 ≤ 1 |
| A4 | 副文案含「使用企业目录账号登录」且**不含**「本地账号」 | 字符串断言 |
| A5 | 输入框：高 **48** · 圆角 **28px** · 底 = `--muted` · 描边 = `--input` | 计算值全等 |
| A6 | 主按钮：**336 × 42** · 胶囊（`border-radius ≥ 9999px`）· 底色 = `primary` | — |
| A7 | 字段间距 = **22px**（±1） | 相邻字段 rect 差 |
| A8 | 错误态 = inline `<p role="alert">` 且 `[data-slot="alert"]` 数 = **0** | 切「错误」态后断言 |
| A9 | 页面 `[data-slot="card"]` 数 = **0**（无白卡）· 全文不含「验证码」 | — |
| A10 | **无 `Tabs`**（`[role="tab"]` 数 = **0**）· 底部存在「使用 OAuth 登录」文本按钮，点击切**备用面板**（Q9） | — |
| A11 | **无 `AuthLayout` 页头**（页面内无 `px-6 py-6` 页头块）· 语言切换位于**右栏右上角**（Q10） | — |

**B. 设备授权页**

| # | 断言 | 阈值 / 判据 |
|---|------|------------|
| B1 | 单列居中：输入框水平居中（`|dx| ≤ 1`）· 无左品牌面板 | — |
| B2 | 授权码输入 `letter-spacing ≥ 2px` · 高 48 · 圆角 28 | 计算值 |
| B3 | 主按钮「确认授权」= **336 × 42** 胶囊 | — |
| B4 | 四态可切（输入码 / 待确认 / 成功 / 失败）且无 JS 异常 | `NO JS ERRORS` |
| B5 | **无 `AuthLayout` 页头** · 语言切换在右上角（Q10） | — |

**C. 应用壳**

| # | 断言 | 阈值 / 判据 |
|---|------|------------|
| C1 | 侧栏宽 **256**（展开 · = 官方 16rem）/ 图标态 = `data-state=collapsed` + `--sidebar-width-icon=48px`（面板 50 · 容器 64） | ±0 |
| C2 | 侧栏 `variant="floating"`：面板圆角 **10px**（官方 `rounded-lg`）· 内缩 **8px** | 计算值 |
| C3 | 组标题数 = **4** 且顺序固定 = **门户 / 个人 / 管理 / 超级管理** | `[data-slot="sidebar-group-label"]`（2026-09-17 翻转原「不含门户」） |
| C4 | 侧栏条目数 = **14** 且**每条含 SVG**（`svg` 数 = 条目数） | 含门户 4 / 个人 4 / 管理 3 / 超管 3 |
| C4b | **14 条形态统一**：行高 **32** · 宽 **214** · 图标槽 **22×22** · 字号 **14** · **无英文副标 `em`** | 实测 `uniqH=[32]` `uniqW=[214]` `uniqSlot=[22x22]` · `em` 数 = **0**（副标已降级 tooltip） |
| C4c | **衬底统一**：常态 **13 条同色中性**（非类型色）· 激活 **1 条**落 `primary` | 实测常态衬底种类 = **1**（`rgb(241,245,251)` = `--muted`）· 激活 = `primary` |
| C5 | 图标逐条匹配 §14.6 映射表（lucide 类名断言 + 门户三枚 = `TypeIcon` 形状：24×24/1 path · 20×20/3 paths · 24×24/1 path+1 circle） | — |
| C6 | 门户「首页」**不含 `⌂` 字形**（`textContent` 断言） | 换 SVG 后 |
| C7 | 用户区贴底：`|footerBottom − 面板 bottom| ≤ 12` · 下拉四项文案齐 | 真指针点击展开 |
| C8 | 顶栏高 = **58** 且含页面标题区（标题 + 分区） | — |
| C9 | 内容区 `padding = 8px 22px` · 起点 `x = 256`（随侧栏宽） | `padding` 沿用 `AppShell` 既有值（不改） |

**D. 通用**

| # | 断言 | 阈值 / 判据 |
|---|------|------------|
| D1 | i18n 键 `navigation.adminBoard` zh/en 齐（en = "Admin Dashboard"）· `navigation` 组键数对称 | 脚本比键 |
| D2 | 路由 `/admin` → `ComingSoon`（批次标 **M4b-6**）· 侧栏点击有反馈（toast） | 真机 |
| D3 | 全程 `NO JS ERRORS`（控制台无 error） | 沿用 §9.3 |
| D4 | 门户面**零回归**：`m4a-dogfood` 36/36 + `m4a-chain-smoke` PASS | 沿用既有冒烟（本批不得回归） |

> **取证**：断言脚本 + 截图入 `docs/smoke/`（沿用 §9 证据文件形态）。


### 14.6 评审留痕（逐屏 · 进行中 · 2026-09-17）

> 原型入口 `apps/web/src/pages/__proto/M4b2UiProto.tsx`（**DEV-only 一次性件，定稿后随原型一并删除**）；
> 控制条切 Variant（v1/v2/v3）× Surface（登录页 / 设备授权页 / 应用壳）。**结论只落本表，原型不留代码。**

| # | 屏 | 结论 | 已定项（实测 · 视口 1440×900） |
|---|----|------|--------------------------------|
| 1 | 登录页 `/login` | ✅ **确认 ok（2026-09-17 用户）** | 当前原型按 **V1（浅蓝·品牌承载）** 呈现并经确认：**无白卡**（表单直落页面）· 右栏**水平 + 垂直居中**（表单列 336 宽，偏移 **0/0**）· 输入 `h-12` radius **28px** 底 `bg-muted` 描边 `border-input`（原型硬编码值已 token 化） · 主按钮 `h-[42px]` 胶囊 · **字段间距 22px** · 标题「登录 AI X Hub」与副文案居中 · 副文案 =「**使用企业目录账号登录**」（去「或本地账号」）· 错误为 **inline `<p role="alert">`**（非 Alert 块）· 底部仅 OAuth 浅色链接 · 无「验证码登录」 |
| 2 | 设备授权页 `/device` | ✅ **确认 ok（2026-09-17 用户）** | **轻量家族对齐**（与登录页同语言；不做深设计）——依据：`approve` 只能由人在浏览器完成 ⇒ 页面不可撤；CLI 侧消费者归 **M5**（`apps/cli/src` 现仅 `index.ts`）⇒ 当前无真实使用者 |
| 3 | 应用壳（侧栏 / 顶栏 / 用户区） | ✅ **已定（2026-09-17 P1-P7 结案）**（`floating` + 条目形态统一均已复看确认） | 已按用户指令落：**侧栏图标全部 SVG**（14 条）· 侧栏底部**用户区**（Avatar 首字母 + 名称 + 角色 `Badge` + 下拉四项：我的账号 / 我的资产 / 访问令牌 / 登出；贴底实测 927 ≈ 预览框底 928）· 「管理看板」占位条目（见 §14.7）· 收起态 **48px** 复验通过 · 几何：官方 `Sidebar` 根为 `fixed inset-y-0` ⇒ 预览框需 `contain: paint` + 复用真仓 `SideNav.tsx:140` 的 `top-[58px] bottom-0 h-auto` 覆盖 |

**侧栏图标映射（14 条 · 原型已落 · 供过目）**：

| 组 | 条目 | 原型图标 | 真仓现状 |
|----|------|---------|---------|
| 门户 | 首页 | lucide `House`（24×24 · 2 path） | **字形 `⌂`**（`SideNav.tsx:167`，非 SVG） |
| 门户 | 技能中心 / MCP 中心 / 专家中心 | `TypeIcon`（wrench / 自绘互锁链 / user） | **既有件直接复用**（`components/ui/TypeIcon.tsx`）——原型即真件，零差异 |
| 个人 | 工作台 | `LayoutDashboard` | **零图标**（纯文本） |
| 个人 | 我的资产 | `Package` | **零图标** |
| 个人 | 我的提交 | `Send` | **零图标** |
| 个人 | 访问令牌 | `KeyRound` | **零图标**（与真仓 `UserMenu` 下拉同款） |
| 管理 | 管理看板 | `Gauge` | **尚不存在**（本批新增占位条目，见 §14.7） |
| 管理 | 审核队列 | `ClipboardCheck` | **零图标** |
| 管理 | 审计浏览 | `ScrollText` | **零图标** |
| 超级管理 | 标签管理 / 系统设置 / 用户管理 | `Tags` / `Settings` / `Users` | **零图标** |

> 图标源 = **lucide-react ^1.44.0**（本仓 `apps/web` 直接依赖，逐名实源核过）；官方 `sidebar` 件**不自带导航图标**（唯一 lucide 引用 = `PanelLeftIcon` 收起钮）⇒ 图标由使用方传入，符合官方惯例。
> ⚠️ **真仓现状差**（本轮真值）：`SideNav.tsx:105` 三组条目字段 = `{ to?: string; text: string }` ⇒ **个人 / 管理 / 超级管理三组当前零图标**。**回写真仓**：P1/P2 已拍板「做」（见下表）。

**评审项结案（2026-09-17 用户「按推荐来」⇒ 全部按下表结论定）**：

| # | 项 | 说明 | 结论（2026-09-17 拍板） |
|---|----|------|---------|
| P1 | 三组条目补图标（含上表映射） | 真仓零图标（`SideNav.tsx:105`）；**主 design §12 线框其实已画图标**（▤◫⇪⛁ ⚖☰ ⌗⚙☺）⇒ 属**补齐既定形态** | ✅ **做**（随实现件回写） |
| P2 | 门户「首页」`⌂` 字形 → lucide `House` | 全侧栏仅此一处非 SVG（`SideNav.tsx:167`） | ✅ **换**（随实现件回写） |
| P3 | 顶栏「页面标题区」（品牌 + 触发钮 + 页面标题 / 分区 + 语言） | 原型新增信息位；**主 design §12 线框顶栏现无标题位** ⇒ 属**新增**（非回归） | ✅ **加**——⚠️ **主 design §12 线框 + §10.2 需同步**（随 §14.4 落地规格一并改，防三向漂移） |
| P4 | 「门户」组是否加**组标题** | 真仓 = 门户组裸菜单无标题；主 design §4 = 2026-09-16 grilling 拍板「不加」 | 🔄 **翻转：加（2026-09-17 用户直接拍板）**——“1-门户 4 条加组标题「门户」”；新键 `navigation.groupPortal`（zh 门户 / en Portal）⇒ 四组结构同构；主 design §4 注同步 **v1.42** |
| P5 | 门户组条目的**英文副标 + 右侧计数**是否保留 | 真仓条目 = 中文名 + 英文小字（`Skills` / `MCP Servers` / `Agents`）+ 计数（`/api/stats` 的 `typeCounts`）；原型为单行中文（探索态） | ✅ **保留**（既有信息 ⇒ 零改动，避免回归） |
| **Q9** | 登录页交互：两 tab → **单表单 + 底部 OAuth 链接 + 备用面板** | 真仓 `Login.tsx:131-132` 为 `Tabs`；原型（用户确认）无 tab | ✅ **撤 tab**（连带 i18n `login` 8 → 10 键 · 见 §10） |
| **Q10** | `AuthLayout`（品牌页头 `px-6 py-6`）去留 | 原型为全屏双栏无页头；保留则「左栏大品牌 + 页头小品牌」重复 | ✅ **去页头**（`AuthLayout` 退役删件 · 语言切换落右栏右上角） |
| **P13** | 滚动条方案（用户：「显示不自然，对标官方」） | 实测矮屏溢出时原生 **15px** 滚动条挤出内容 ⇒ 条目宽跳变；查证：官方 34 件**零**滚动条定制（同样会掉原生条） | ✅ **方案 ②**（用户选）`[data-slot=sidebar-content]{scrollbar-gutter:stable}` ⇒ 两高度条目宽恒 **224**（不抖动）；**未采纳** ① 修 `scrollbar-width` 冲突（发现该属性致全站 `::-webkit-scrollbar` 定制失效 = 原生 15px） |
| **P12** | 收起态**选中图标看不清** / 提示语不一致 | 用户：「收缩后选中图标很浅看不清」+「提示要一致，门户那几个直接中文」 | ✅ ① 根因 = 我为居中加的 `bg-transparent` 抹掉蓝底（白图标落浅蓝底）② 改**单层底色**（槽 32 铺满按钮）③ hover 提示**统一纯中文**（原「中文 · 英文」撤除）· 断言 **+C2f/+C2g** |
| **P11** | 顶栏是否有官方件／是否对齐 | 用户：「看看 titlebar 在 shadcn 有官方组件或 block 么」→「要对齐官方，相信官方积累」 | ✅ 查证：官方**无** titlebar 组件；最接近 = `blocks/dashboard-01` 的 **`SiteHeader`** ⇒ 按之逐项对齐 6 项（§14.4 顶栏行）· 断言 **+C8c** |
| **P10** | 应用壳结构是否改官方形态 | 用户问「AppShell 作用是什么？可以不用么」⇒ 选 **B（换官方结构）** | ✅ `SidebarProvider > SideNav + SidebarInset`（顶栏入内）· 顶栏宽 **1184** · 侧栏 `inset-y-0` · 官方 `border-r` 自动出现 · **AIH 覆盖点 2 → 1 处** · 断言 **+C2b/+C8b** |
| **P9** | 侧栏宽 / 面板圆角 / 滚动条是否对齐官方 | 2026-09-17 用户要求「按官方值看一下」：原 204px（AIH）+ 圆角 18px（AIH 覆盖 `rounded-2xl`）+ 6px 细蓝滚动条 | ✅ **① 宽 256（官方 16rem）保留 · ② 圆角 10px（官方 `rounded-lg` + border + `shadow-sm`）保留 · ③ 滚动条回退 AIH 6px**——AIH 覆盖点 3 → **2 处**（实测 `sidebarW=256` `radius=10px` `border=1px` `shadow-sm` 生效 · 条目宽 214） |
| **P8** | 收起态图标是否需与图标轨**几何居中** | 实测原为图标中心 `cx=40` vs 面板中心 `33` ⇒ 偏右 7px | ✅ **已闭环**（用户 2026-09-17「收起态图标也按官方来」）—— 撤 `SidebarContent` 的 AIH `px-1` + 槽收起态 32 铺满 ⇒ 实测 14 条图标偏差 **≤1px**（断言 C1b） |
| **P7** | 侧栏 **14 条条目形态统一** | 实测硬差 5 维（行高 51 vs 32 · 槽 22 衬底 vs 20 透明 · 双行 vs 单行 · 宽 178 vs 162 · 字重 500 vs 400）⇒ 用户指「**很不协调**」 | ✅ **统一为官方标准形态**（行高 32 · 宽 162 · 槽 22×22 · 单行 · 副标降级 hover tooltip）；**门户组条目自 M4a 后首次改动**——用户拍板解除原「Q3 零改动」（后经 **P4** 进一步翻转为「加组标题」+ 全中性底） |
| P6 | 侧栏 `variant` | 真仓 = **`floating`** + 面板圆角 `2xl`（`SideNav.tsx:139-140`）；原型原为官方默认（实心贴边） | ✅ **跟真仓 `floating`**——**原型已切**（实测 `variant=floating` · 面板圆角 **18px** · 内缩 **8px** · 贴底差 **10px**）⇒ **待用户复看一轮** |

### 14.7 「管理看板」登记（2026-09-17 用户拍板）

| 项 | 值 |
|----|-----|
| **归属** | **M4b-6 治理批**——页面本体 **+** 内容清单；**内容清单本批不认可、待 M4b-6 对齐时讨论**（本批**不预设任何内容**，原型正文已占位化） |
| 本批（M4b-2）范围 | 侧栏「管理」组加**占位条目**「管理看板」（与「系统设置」同款：`to` 缺省 ⇒ `toast(comingSoon)`）· i18n 键 `navigation.adminBoard`（zh「管理看板」/ en「Admin Dashboard」；**2026-09-17 用户拍板定名**）· 图标 `Gauge`。**本批不改路由表**——`/admin` 维持既有**重定向 → `/admin/reviews`**（占位条目无路由 ⇒ 无需 `DEV_BATCH` 项）；**真页面 + `/admin` 路由（含替换该重定向）归 M4b-6** |
| 门槛 | 与「审核队列 / 审计浏览」同组 ⇒ `role >= 10`（`hasRole` 单点，禁散写阈值） |
| 交互现状 | 侧栏「管理」组现为两条**真页面**；本条目为**占位**（同组内真页 + 占位并存，先例 = 「超级管理」组「系统设置 / 用户管理」占位条目） |

**§14 补充轮次 4 重评（2026-09-17 · v1.25 官方结构 + SiteHeader 对齐 + 图标态闭环）**：8 维 **9.81**（完整性 9.8 · 一致性 9.9 · 清晰度 9.8 · 可实施性 9.9 · 设计纯粹性 9.7 · 边界覆盖 9.8 · 实施精度 9.9 · 跨平台 9.7）。**提分来源**：① **F4 遗留项真因闭环**（官方件规则在 tw 4.3.3 未生成，实证 CSSOM 命中 0 ⇒ 改状态驱动等效实现）② 与官方 `SiteHeader` / `SidebarInset` **逐项对齐并留「唯一 AIH 差异」声明**（sticky）③ 覆盖点持续收敛（2 → 1 处）④ 断言 39 → **47**（+8 条，覆盖结构/顶栏/图标态/居中/单层色/tooltip）⑤ **已回退的试验不入档**（首页脱壳，用户判「改得不对」）。**扣分点**：图标态走「状态驱动」而非官方纯 CSS 路径（工具链所限，已记录 `@source inline` 未生效）；滚动条方案 ②「始终预留 15px」有常驻留白代价。

**§12.2 收尾轮次重评（2026-09-17 · v1.29 收尾二次审计 + 状态收口）**：8 维 **9.90**（完整性 9.9 · 一致性 9.9 · 清晰度 9.9 · 可实施性 9.9 · 设计纯粹性 9.9 · 边界覆盖 9.9 · 实施精度 9.9 · 跨平台 9.8）。**提分来源**：① 补做**覆盖最新状态**的十一维审计（findings 表入批 plan §3）② 跨文档旧口径**加推翻指针**（史实值保留、结论不悬空）③ 状态四处收口（状态表回归唯一源）。**扣分点**：跨平台仅 Edge(mac) 实测。

> **本版状态声明**：§14 **定稿（2026-09-17 用户口令「定稿」）** —— §14.1 现状 · §14.2 方向 · §14.3 三判 · §14.4 落地规格 · §14.5 验收断言 · §14.6 评审留痕 · §14.7 登记；自检 **9.88**（§12.2 收尾轮次重评 · 滚动条收敛后）；**收尾二次审计无未决项**（批 plan §3 · 2026-09-17）；**§14.5 断言 49 PASS / 0 FAIL**（最新；含 v1.25-v1.28 各轮增量）。**实现已落地并验收**（T11-T15 + 侧栏形态统一 + 门户组标题/中性底）：**§14.5 断言 47 PASS / 0 FAIL**（含子项）· 门禁 exit 0（`typecheck`/`lint`/`format:check` 实测 0）· 门户零回归 **36/36 + chain-smoke PASS** · `NO JS ERRORS`；证据 = `docs/smoke/2026-09-17-m4b2-ui-redo.md`。

## 13. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v1.30** | 2026-09-17 | sunxuewen-rush | **原型删除闭环**（用户授权）—— ① 删前核实：代码 import 引用 0 · `main.tsx` 挂载 0 ② 删除 `apps/web/src/pages/__proto/` ⇒ 代码侧零命中 ③ §12.2「原型删除后零残留」成立 · 批 plan §3 F3 → 已闭环 ④ 门禁/dogfood/断言复跑全绿 |
| **v1.29** | 2026-09-17 | sunxuewen-rush | **M4b-2 收尾二次审计 + 状态收口**（批间门第五件）—— ① 补做覆盖最新状态的十一维审计（findings 表 = 批 plan §3）② **修 4 处**：`aih-theme.css` 过时注释 + 「6px 细蓝」旧口径在 3 处历史行加**推翻指针**（主 design v1.43 / docs/00 v1.64 / 证据轮次 3）③ **维持 7 类**（死导出 0 · i18n 222/差集 0 · 原型待授权删除 · 无出轴值 · 无孤儿 token · 官方件 0 差异 · 生成物既有登记）④ 状态四处收口（本文件 / 批 plan / docs/00 / 主 design 登记表）⑤ 自检 文档 **9.90** |
| **v1.28** | 2026-09-17 | sunxuewen-rush | **滚动条两项遗留对齐：只留一套机制 · 清死代码 + 孤儿 token**（用户拍板）—— ① 删 `::-webkit-scrollbar*` 四块（与 `scrollbar-width/color` 并存但被忽略 = 死代码）② 删孤儿 token `--scroll-track` / `--scroll-thumb` / `--scroll-thumb-hover`（仅死代码引用）⇒ token 组**四值 → 单值** ③ `html { scrollbar-width: thin; scrollbar-color: var(--scroll-color) transparent }` ④ **纯删除、零行为变化**（实测计算值与占位不变）⑤ dogfood 36/36 · 断言 49/0 · 门禁 exit 0 ⑥ 自检 代码 9.94 / 文档 9.88 |
| **v1.27** | 2026-09-17 | sunxuewen-rush | **滚动条轨道去底色**（用户拍板「滚动条不要背景色」）—— ① `--scroll-track` → **`transparent`**（滑块 `--scroll-color` 不变）② 实测轨道像素 `#f6f9ff`（= 面板底，透明透出）· 滑块 `#adc5f8` ③ dogfood 36/36 · 断言 49/0 · 门禁 exit 0 ④ 自检 代码 9.88 / 文档 9.83 |
| **v1.26** | 2026-09-17 | sunxuewen-rush | **登录默认落点改为首页**（用户拍板「按推荐」）—— ① `pages/Login.tsx:94` `?? '/dashboard'` → `?? '/'`（唯一改点）② `next` 优先不变 ③ `RoleGuard` 弹回点保持 `/dashboard`（权限语义）④ §4.3 反向守卫行 + §5.1 成功链同步 ⑤ 断言 **49 PASS / 0 FAIL**（+C10/C10b）⑥ 门禁 exit 0 |
| **v1.25** | 2026-09-17 | sunxuewen-rush | **官方结构 + 官方 SiteHeader 对齐 + 图标态闭环（用户拍板「先对齐官方骨架」，并点示「相信官方积累」）**——① **结构**：`SidebarProvider > SideNav + SidebarInset`（顶栏入 Inset · 宽 1184）· 侧栏 `inset-y-0` · 官方 container `border-r` 1px 自动出现 · **AIH 覆盖点 2 → 1 处** ② **SiteHeader 逐项对齐**（6 项：变量高度 / 内层容器 / `mx-2` / `<h1>` / `shrink-0`+`transition` / 图标态保持 58）③ **品牌位移**至侧栏顶部 `SidebarHeader` ④ **图标态闭环**=F4 真因（官方规则 tw 4.3.3 未生成 ⇒ 受控 open + 状态驱动 256↔48；`@source inline` 未生效已删）⑤ 收起态**单层底色**（槽 32 铺满；按钮宽 uniq=[32]）⑥ tooltip 统一纯中文 ⑦ 滚动条方案 ②（`scrollbar-gutter:stable` ⇒ 条目宽 224）⑧ 断言 **39 → 47/0** ⑨ 主 design 同步 **v1.44** |
| **v1.24** | 2026-09-17 | sunxuewen-rush | **侧栏宽 256 + 面板圆角对齐官方（用户拍板 ① 保留 ② 保留 ③ 回退）**——① `--sidebar-width` 204 → **256**（官方 16rem；条目宽 162 → 214 · 内容区 x 204 → 256）② 撤除 `[&>[data-slot=sidebar-inner]]:rounded-2xl` ⇒ 官方 floating（圆角 **10px** + 1px border + `shadow-sm`）③ 滚动条**回退 AIH 6px 细蓝**（不随官方原生 15px）④ **AIH 覆盖点 3 → 2 处** ⑤ 实测 `sidebarW=256` `radius=10px` `shadow-sm` 生效 ⑥ 断言同步 **39 PASS / 0 FAIL**（C1/C2/C4b/C9）⑦ 截图 04/05 重出 ⑧ 决策依据 = 与官方 registry 逐字符比对（差异仅格式项） |
| **v1.23** | 2026-09-17 | sunxuewen-rush | **门户组加组标题 + 14 条全中性底（用户拍板二条）**——① 用户口令「1-门户 4 条加组标题『门户』 2-14 条全用中性底」② 落地：门户组改 `SidebarGroup` 结构 + `SidebarGroupLabel`（新键 `navigation.groupPortal`）· 撤除 `ICON_BY_TYPE` 类型色衬底（`--tint-*`/`--type-*` token 保留）⇒ 常态 `bg-muted` / 激活 `bg-primary` ③ 实测：组标题 **4**（门户/个人/管理/超级管理）· 14 条 `uniqH=[32] uniqW=[162] uniqSlot=[22x22]` · 常态衬底种类 **1**（13 条）· 激活 1 条 primary ④ 断言 **38 → 39 PASS / 0 FAIL**（C3 改 4 · 新增 C4c）⑤ i18n **221 → 222 键**（`navigation` 13 → 14）⑥ **Q3 翻转**登记四处（§2 现状表 / §2 Q3 / §6.1 矩阵 / §14.4 分组）+ §14.6 **P4** 翻转留痕 ⑦ 主 design 同步 **v1.42**（§4 注 + §11 键数 222）⑧ 截图 04/05 重出 ⑨ 遗留 **P8** ⬜ |
| **v1.22** | 2026-09-17 | sunxuewen-rush | **侧栏 14 条条目形态统一（用户拍板 · 补充轮次）**——① 用户观感反馈：门户组 4 条与三组 10 条「很不协调」，实测硬差 **5 维**（行高 **51 vs 32** · 图标槽 **22 有衬底 vs 20 透明** · 双行（英文副标） vs 单行 · 宽 **178 vs 162** · 常态字重 **500 vs 400**）② **拍板**：方向 ② 收敛为**官方标准形态** + Q1① 英文副标**降级进 hover tooltip** + Q2① 门户保类型色衬底 / 三组用中性衬底 ③ **落地**（`SideNav.tsx`）：14 条 行高 **32** · 宽 **162** · 图标槽 **22×22**（圆角 6px）· 字号 14 · 字重循官方默认 · 单行 + `truncate` ④ **实测**：`uniqH=[32]` `uniqW=[162]` `uniqSlot=[22x22]` · `em` 数 **0** · 收起态 tooltip = `首页 · Home` ⑤ 断言 **37 → 38 PASS / 0 FAIL**（新增 **C4b** 形态统一）⑥ **门户面登记**：门户组**条目级**形态自 M4a 后首次改动（§14.6 **P7**；原「Q3 零改动」范围澄清为结构与文案）⑦ 主 design 同步 **v1.41** |
| **v1.21** | 2026-09-17 | sunxuewen-rush | **UI 重做落地收口（§14 定稿 · T11-T15 ✅）**——① 实现落地（登录 / 设备 / 壳 三面 + 删件 `AuthLayout.tsx`）② 断言 **37 PASS / 0 FAIL** + 五门禁 exit 0（`test` 517/1/0）+ 门户零回归 36/36 · chain-smoke PASS ③ i18n 实测订正：本批 **净增 10 键** ⇒ 全仓 **221 键 / 11 组**（前版 135/44 作废）④ 两处设计值订正（内容区 `8px 22px` · 图标态 `--sidebar-width-icon 48px`/面板 50/容器 64）⑤ 证据 = `docs/smoke/2026-09-17-m4b2-ui-redo.md` + 截图 5 张|
| **v1.20** | 2026-09-17 | sunxuewen-rush | **⬠Q9/Q10 闭环（用户「按推荐来」）+ 自检 9.65**——① Q9 撤 tab ⇒ 登录页 = 单表单 + OAuth 链接 + 备用面板；§10 `login` **8 → 10 键**（全仓 **134** · 净增 **43**，史实值与本条并列）② Q10 去 `AuthLayout` 页头 ⇒ 登录/设备全屏版式 + 语言切换右上角 + **删件 `AuthLayout.tsx`**；§3.2 改造件 **6 → 9 处**③ §12.2 F1/F2 标已闭、综合 **9.65**；§14.5 断言 **26 → 29**；§14.6 结案表补 Q9/Q10 ④ 零实现改动|
| **v1.19** | 2026-09-17 | sunxuewen-rush | **全文换靶复读 · 14 处修复 + §12.2 本轮 8 维自检 9.61 + ⬠2 开口项**——① 通读全篇换靶抓 **F1-F14**（含 🔴 两处真矛盾：§5.1×§14.4 两套版式 · Q2/§5.1×§14.4 两 tab vs OAuth 链接）② §5.1/§5.2 加「视觉以 §14.4 为准 · 功能契约不变」分界；§8/§12/§14.6/Status 指针同步；§14.4 高度基准写实 · 顶栏字标照真仓渐变字 · Q13 加原型例外③ **新增 §12.2**（全文口径 8 维 = **9.61**，实证表 F1-F14）④ **开口项 ⬠Q9/Q10 待用户终判**（闭合前不写实现代码）⑤ 零实现改动|
| **v1.18** | 2026-09-17 | sunxuewen-rush | **§14.4 落地规格 + §14.5 验收断言回填（§14 全段落齐）**——① 三面规格（登录页 / 设备页 / 壳）全实测值 · 零新增 token · 原型硬编码色值 token 化（`bg-muted` / `placeholder:text-muted-foreground/60` / `text-primary`）② 验收断言 **26 条**（A9 / B4 / C9 / D4，含几何量值 + 官方件计数 + 门户零回归）③ §14 状态声明 → **定稿候选**（自检 8 维通过 + 用户定稿后才允许实现）|
| **v1.17** | 2026-09-17 | sunxuewen-rush | **grilling 第 1 轮 8 项拍板 + 三判回填**——① **§14.3 三判填定**（气质 = V1 浅蓝·品牌承载；密度 / 类型色 = 沿用）② **§14.6 P1-P6 结案**（P1/P2/P3 做 · P4 **纠正为保持不加标题**——上轮推荐与主 design §4 既定 + 门户面零回归相冲 · P5 零改动 · P6 原型已切 floating）③ §14.7 i18n 键名定名 ④ 原型同步：门户组去标题 · 切 `floating` · 个人组文案对齐真码（「个人工作台」/「访问令牌」）⑤ **零实现改动**（回写真仓待 §14.4 定稿后进行）|
| **v1.16** | 2026-09-17 | sunxuewen-rush | **UI 重做评审留痕 + 「管理看板」归属登记**——① 新增 **§14.6 评审留痕**（逐屏：登录页 ✅ / 设备授权页 ✅ / 应用壳 🔵 评审中；含侧栏图标映射 **14 条** + **待拍板项 P1-P6**）② 新增 **§14.7「管理看板」登记**（用户拍板：归属 **M4b-6**、内容清单本批不认可待该批讨论；本批只落占位条目）③ §14.2–§14.5 仍 ⬜ 待回填 ⇒ **不主张 §14 完成** ④ 同步主 design **v1.38**（§2.3/§2.4）|
| **v1.14** | 2026-09-16 | sunxuewen-rush | **出口件 ④ 口径变更 + 批次五件全绿（用户授权代跑并认可）**——
① **§9.4 执行方式变更**：由「用户实机逐项确认」改为 **CDP 自动断言**（七项全为功能/行为项 ⇒ 自动化更
可重放、更可留证；脚本入仓 `docs/smoke/scripts/m4b2-acceptance-checklist.ts`），**实测 14 PASS / 0 FAIL +
NO JS ERRORS**；人工价值收敛为「认可结论」；⚠️ **审美面不在本批范围**（归 M4b-7）② **§9.6 验收结果表**
④ 行 🔶 → **✅** ③ 依据 = 用户 2026-09-16「认可」+ 验收脚本实测输出。**⇒ M4b-2 出口五件全绿**
（①②③④⑤）。本版不含功能/契约改动（验证口径）|
| **v1.15** | 2026-09-17 | sunxuewen-rush | **UI 视觉设计段开立（回炉开局版）**——用户定「不另立批，直接在本批 design 加 UI 设计」：① 新增 **§14**（范围/非范围 · 视觉体系 SSOT 引用 · 流程）+ **§14.1 现状与问题真值**（1440×900 实测 12 条：登录卡 **384×345 @ y=78（下留白 477px）** · `box-shadow` 全 0 · 标题 **16px** · 控件 **36px**/圆角 8px · 顶栏元素 **40×24** 贴边 · 壳「门户组 × 三组」混排 F3 遗留）② §14.2–§14.5 = ⬜ 待原型评审回填 ③ §8 加指针 ④ 本版**不主张** §14 已完成，回填后按本仓 8 维口径重评 ⑤ **版本号注记**：原拟用 v1.14，落地时发现该号已被 2026-09-16 的「出口件 ④ 口径变更」行占用（且该行未累计入头部 `> Updated` —— 史实保留不动）⇒ 本行改用 **v1.15** |
| **v1.13** | 2026-09-16 | sunxuewen-rush | **T10 收尾回写（批次完成 · converge 重评 8 维 9.50）**——
① **§9 补「本批验收结果」**：五门禁逐项 exit 0（CI 顺序复现；**`CI=true bun run test` = 500 pass · 1 skip ·
0 fail**（501 例 / 48 文件），与 M4b-pre 基线逐项一致 ⇒ **零回归**）· **门户零回归** `m4a-dogfood` **36/36**
+ `m4a-chain-smoke` **PASS** · **本批 dogfood 六组**（新建 `docs/smoke/scripts/m4b2-auth-dogfood.ts`）
**24 PASS / 0 FAIL + NO JS ERRORS** · 种子复核（A2 upsert 第 3 次复跑幂等）· **整体审计十一维无未决项** ·
验收硬证据入库 `docs/smoke/2026-09-16-m4b2-auth-shell.md` ② **F4 关闭（★ 实测证伪）**：T4 登记的
「`group-data-[collapsible=icon]` 变体未生效」为**测量假阴性**——T10 真机 `cmd+b` 折叠后实测：`.group`
与 `data-collapsible="icon"` **同元素**（变体前提满足）· 组标签 `margin-top = **-32px**` · `opacity = **0**` ·
菜单按钮 **32×32px** · 容器 **66px** ⇒ **全部生效**；T4 测得的值（178px / 0px / 1）= **展开态** ⇒ 当时未
真正进入折叠态 ③ **行数声明订正（★ 审计发现）**：文档「`file`（**N 行**）」声明 vs `wc -l` 实测
**15 处全部不符**（`Device.tsx` 303→**268** · `SideNav.tsx` 254→**225** · `Dashboard.tsx` 78→**73** ·
`Login.tsx` 205→**203** · `TopBar.tsx` 41→**38** · `roles.ts` 38→**33** · `next.ts` 83→**97** ·
`client.ts` 187→**205** …）——根因 = **前序 Task 的行数为执行期估算**（未实测即写入）⇒ 立 **权威行数表**
（证据文件 §6）+ 不改写史实 + **后续批次一律 `wc -l` 实测** ④ **旧口径指针 5 处全部关闭**（plan
`待深挖`×3 / `待 T10`×1 · design `待 T7 实测`×4 / `待深挖`×1）⑤ **出口五件**：①②③⑤ ✅ · ④ dogfood ✅ /
观感七项**待用户实机确认**（证据文件 §11）⑥ 依据 = 批 plan **v0.13** |
| **v1.12** | 2026-09-16 | sunxuewen-rush | **T9 落地回写（i18n 实测键数回填 · 本批唯一内容改动）**——
① **§10 全量改实测口径**：批前基线（M4b-2 首个提交 `e569298` 的父 `0ff0693`）**91 键 / 7 组** ⇒ 当前
**132 键 / 9 组** ⇒ **净增 41 键**；逐组 `login` 8 · `device` 13 · `errors` +12（18 → 21）· `navigation` +3
（9 → 12）· `dashboard` +2（4 → 6）· `admin` +1（6 → 7）· `common` +2（5 → 7）· `market` 53（未变）·
`review` 5（未变）；算式 8+13+12+3+2+1+2 = **41** ✓（数字全部由审计脚本**真实 import `zh.ts`** 产出，
非人工点数）② **`errors` 组 +9 → +12 码**：**补 3 个服务端实有码** `auth.forbidden` · `auth.oidc_denied` ·
`auth.oidc_state_mismatch`（组规模 18 → **21 键**；服务端 `auth/errors.ts` 12 码**覆盖 12/12、缺失 0**）
——依据 = plan 断言③「`errors` 组覆盖服务端实有码」（07 §4 方针）；`auth.forbidden` 本批即可达（越权 403），
原缺会落 `errors.unknown` 兜底 ③ **§10 首行** `device` 14 → **13**（T7 删 `expiresLabel`，本版同步算式）+
`errors` +9 → **+12** + 补 `admin` **+1** 行 ④ **三处史实值订正声明**：§13 v1.0「22 键 + 9 码」= 窄口径；
§10 v1.7「净增 39」与 T6 落值「39 → 56」= **中间值（作废）** ⑤ **§10 口径待定项全关闭**（`claimedByOther`
保留 · 徽章 3 键已落 · `device` 13 键）⑥ **T9 校验全绿**：双语双向差集 **0** · 占位符不一致 **0** · 空值 **0** ·
服务端码覆盖 **12/12** · 门禁四连 · 产物零 `M4b-` · 门户零回归 **36/36**。依据 = 批 plan **v0.12** |
| **v1.11** | 2026-09-16 | sunxuewen-rush | **T8 落地回写 + 1 处口径订正**——① **§5.3 补落地注**：件已落仓 ·
`main.tsx` `/dashboard` 换真页 · `dashboard` 组 **+1 键**（`welcome`）· 六条断言实测（档 0 跳登录保码 ·
**三档入口裁剪**（role=1 → 2 项；10/100 → 3 项）· `notice` toast + 刷新不重弹 · 零业务请求 · 门禁四连 ·
门户零回归 **36/36**）② **「零请求」行口径订正（★ 实测发现）**：`/dashboard` 稳定重载后仍有 1 条业务请求
`200 /api/stats` ⇒ **根因（代码级）**：`SideNav.tsx:16` 消费 `fetchStats`（门户组**计数徽章**，M4a 既有
行为）；全仓 `fetchStats` 消费点仅 3 处（`Home` / `CenterPage` / `SideNav`），本页不渲染前二者 ⇒
来源即**壳层**。**非本页引入**，且消除它需改门户壳 ⇒ 违反「门户零回归」硬约束（**不采纳**）⇒ 口径订正为
「**页面自身**零业务请求（壳层 `/api/auth/me` 会话探测 + M4a 既有 `/api/stats` 除外）」，与本行原意
（不调 `/api/reviews`、`/api/audit`）一致 ③ 依据 = 批 plan **v0.11** T8 落地记录（含**探测口径修正**：
首轮把 Vite dev 源码模块请求 `/src/api/*.ts?t=…` 误判为 API ⇒ 复测按「含 `/api/` 且不含 `/src/`」过滤 +
「稳定后 reload」消除在途竞态）|
| **v1.10** | 2026-09-16 | sunxuewen-rush | **T7 落地回写 + 4 处契约订正（用户 2026-09-16 拍板「按推荐来」）**——
① **§5.2 未登录判定机制重写**（★设计缺口）：官方 `GET /device?user_code=` **未登录也返回 200**
（dev 真机实测：`{user_code, status:'pending'}`，仅缺 `client_id`/`scope`）⇒ plan 原「未登录 → 401 ② 分类
生成 `next`」**不成立**（401 永不触发），且未登录用户会因「响应缺 `client_id`」**误落「他人已认领」终态**
⇒ 改为页面**读会话三态设门**（`useAuth`；与 `/login` 顺序、`RoleGuard` 同源）⇒ **保码回跳闭环实测通过**
② **§5.2 四态表订正**：② 行**删「有效期」**（详情接口不返 `expires_in`——该字段只在 CLI 侧
`POST /device/code` 响应里）· ① 行码形态 `XXXX-XXXX` → **实测 8 位大写字母数字无横线** · ④ 行
「他人已认领」**改判为 ② 的变体**（前置 = GET 响应缺 `client_id`；兜底 = approve 403
`{error:'access_denied'}`——`device-flow.test.ts:346` + dev 真机双证）· ④ 行补**错误体形态**（OAuth 风格
`{error, error_description}`，唯一例外 = 缺参走本仓 `{code:'VALIDATION_ERROR'}`）③ **§10 `device` 组
14 → 13 键**（去 `expiresLabel`）· `claimedByOther` **保留**（Q18② 实测存在）· 补「device 错误经封装归一到
`device` 组文案，**不占 `errors` 组**」 ④ **§5.2 补落地注**（十项断言：四态 · 保码闭环 · 预填+大写归一 ·
刷新态 = 终态 · 错误体适配不落 `http_400` · 他人已认领双路 · 门禁四连 · 门户零回归 **36/36**）
⑤ **实现落点 3 处**：`ApiError` 补 **`body`**（OAuth 适配前提——归一 `code` 会退化 `http_400`）·
`AuthLayout` **抽跨页件**（消 T6 自检 B3/C4 的「品牌字重复」扣分）· `devicePath` 落 `auth/next.ts`
（站内路由构造单点）。依据 = 批 plan **v0.10** T7 落地记录（含 6 处执行期修正）|
| **v1.9** | 2026-09-16 | sunxuewen-rush | **T6 落地回写 + 种子形态改写（A2，用户拍板）**——
① **§9.5 种子段重写**：形态由「删 `session`/`account`/`user` 后重建」→ **upsert**（只清 `session` +
`user`/`account` 有则改无则建）。**根因实证**：原形态在 **`audit_log.actor_id` 有行**时恒 **23503**——
实测引用 `"user"` 的外键 = **12 约束 / 9 张表**（`account` · `asset`×3 · `asset_label` ·
`asset_version`×2 · `audit_log` · `label_definition` · `review_task`×2 · `session`），T3 落脚本时只清了
`session`/`account`，**T4 实测登录产生 8 条审计行后暴露**。**A2 收益**：`user` 行永不删 ⇒ 引用表全不需
清理（FK 触发器**根除**）· `user.id` **恒定** ⇒ 既有 `audit_log` 引用继续指向同一用户（**审计留痕不丢**，
删审计日志属治理底线）· 真幂等（可无限重放）。**未采纳**：C 案（保持删+建、补清 `audit_log`）——
补漏式、随业务表增长复发 ② **§5.1 补 T6 落地注**（件已落仓 · 六项断言实测：独立版式 · 两 tab（**真指针**）·
**首帧骨架**（`/me` 延迟 1.6s，150-1500ms `sk=4/form=false`，1650ms 落表单 ⇒ **Y3 实证**）· 错口令
**inline + URL 不变** · 成功链 → `/dashboard` + `/me` 200 · 反向守卫**保码回跳**与非法 next 回落）+
**F5 缺口登记**（OIDC 成功 `/?oidc=success` **不经 `next`** 落门户面、门户零 `oidc` 消费 ⇒ 会话已建但
`AuthProvider` 不知情；消费点落门户面会碰 M4a 零回归 ⇒ 交 M4b 收尾 / M4c） ③ **§10 补 T6 落值 +
跨面共享码登记**：`login` **8 键** + `errors` **9 码**（**逐条有服务端依据**，含 `oidc.not_configured`
= `http/oidc-routes.ts:98,127` 实测）⇒ 键数 **39 → 56**（T9 回填）；`oidc.not_configured` /
`auth.session_expired` **暂零消费**（落键 = i18n 覆盖服务端实有码 · 07 §4 方针；**勿判死键**）
④ **自检修复 1 处（18 维自检发现 · 同轮修）**：骨架卡结构对齐表单卡（原 `CardContent pt-6` 无
`CardHeader` ⇒ 实测高度差 **103px**；改为 `CardHeader` + `CardContent` 逐位镜像后 **13px**、顶部偏移
**0px**）⑤ 依据 = 批 plan **v0.9** T6 落地记录（门禁四连 · 生产产物零 `M4b-` · 门户零回归 **36/36** ·
零服务端改动） |
| **v1.8** | 2026-09-16 | sunxuewen-rush | **T5 落地回写（减法批）**——① **§3.2 件 1**（`TopBar`）补落地：43 → **41 行**，删「登录」占位 `<span>` + 图标组件/ i18n 上下文两个 import ⇒ 顶栏**仅余 4 件**（品牌 · `Separator` · `SidebarTrigger` · `LanguageSwitcher`），实测 `height: 58px` 不变、语言切换零变更 ② **§3.2 件 2**（`SideNav`）补落地：元信息三项与 `APP_VERSION` 随 T5 删除 ⇒ Footer **仅余 `UserMenu`**（`children = 1` 实测）③ **§10 `navigation`（+3/−4）增删均已落**（+3 随 T4 · **−4 随 T5**；四键 `grep` 零残留 ⇒ 与 39 键算式自洽）。④ 依据 = 批 plan T5 落地记录（v0.8：门禁四连 · 门户零回归 **36/36**）。**本版无设计内容改动**（落地注与口径自洽） |
| **v1.7** | 2026-09-16 | sunxuewen-rush | **T4 落地执行期修正（5 处，用户拍板「按推荐来」）**——① **§6.1 超管组条目数订正**：plan T4 断言③ 原写「2 条真链 + 2 条占位」→ **3 条（1 真 + 2 占位）**（主 design §4 为唯一源）② **§6.3 占位条目提示键订正**：`admin.phase2Notice` 仓内不存在 ⇒ **复用 `common.comingSoon`**（零新增键）③ **§6.2 徽章键落定**（用户拍板）：`navigation.roleUser` / `roleAdmin` / `roleSuperAdmin` ⇒ 设计 34 → 37 ④ **§10 键数口径 → 净增 39 键**（**补 2 处遗漏键**：`navigation.logout` · `admin.settings`——均为 design 要求了 UI 而台账漏列）⑤ **§6.1/§6.2 补落地实测**：四档显隐全绿 · UserMenu 四态（loading 采样无 ANON 闪现）· **F3 计算值**（gap 4px / 组内 padding 8px / 标签高 32px）· **F4 登记**（图标态部分 `group-data-[collapsible=icon]` 变体未生效：`hidden` 生效而 `size-8!`/`-mt-8`/`opacity-0`/宽度变体未生效；已排除视口 / 祖先 / 本批引入三因）。⑥ 依据 = 批 plan T4 落地记录（v0.7；含 **T1 件缺陷修复**：`apiPost` 写请求 content-type + `logout` 传 `{}`，sign-out **415/400** 两坑实测全通）。**本版无设计内容改动**（仅口径订正与实测登记） |
| **v1.6** | 2026-09-16 | sunxuewen-rush | **T3 落地执行期细化（4 处，用户拍板「按推荐来」）**——① **§3.3 补 T3 形态注**：`/login` `/device` 本批 T3 = `ComingSoon` 独立版式占位 ⇒ **T6/T7 各需 `Modify main.tsx`**（原 plan 未列该文件，占位元素无法替换）② **§10 键数口径 → 净增 34 键**（新增 `common` 组 +2：`comingSoon` = 7 条占位页 description · `noPermission` = 守卫档位不足 notice；`dashboard.submissions` **T3 前移**落仓 ⇒ T8 仅余 `welcome`）；连锁订正 §6.2 徽章键 **34 → 37** · device 删键 **34 → 33** ③ **§5.4 落地补注**（件已落仓；批次号经 **`DEV_BATCH` 常量表** + `import.meta.env.DEV` 门控 ⇒ **生产产物零 `M4b-` 字面量**，build 后 grep 实测）④ **§9.5 种子脚本已落仓并跑通**（3 账号；`SMOKE_M4B2_PASSWORD`；前缀清理可重放；运行须 `--env-file=apps/server/.env`）⑤ **§9.3 dogfood 401 单列口径**（未登录 `/api/auth/me` 探测；`authNetLogs` 桶，严格性不变）⑥ 依据 = 批 plan T3 落地记录（v0.6：路由 **11 条** · 真浏览器 **4/4** + **role=1 实测** · 门禁四连 · 门户零回归 **36/36**）。**本版无设计内容改动**（仅执行期落地登记与口径写实） |
| **v1.5** | 2026-09-16 | sunxuewen-rush | **T2 落地执行期细化（3 处）**——① **§3.1 件 9 职责扩**：`sanitizeNext` 单点 → **路由安全单点**（+`PROTECTED_PREFIXES` + `isProtectedRoute`）；强调**零 import** （`api/client` 可单向引用**不成环**——`AuthProvider → api/auth → api/client → auth/next` 末段为叶子）；消费方由 3 处改为 `Login` / `Device` / `api/client`（`AuthProvider` 生成 `next` 时复用）② **§4.2 `invalidateCache(prefix)` 语义写实**：按**语言无关的 `path` 前缀**失效（内部键为 `${lang} ${path}`；按**完整键**前缀匹配会**永不命中**）③ **§4.3 `sanitizeNext` 单参 + 落点**：原签名 `(raw, origin)` 的 `origin` **冗余**（相对路径规则已排除跨源）+ 补**拒控制字符**（字面 U+0000–U+001F 与编码形态 `%00`–`%1f`）④ 依据 = 批 plan T2 落地记录（v0.5：**纯函数探针 27/27** · **门户零回归 dogfood 36/36 + NO JS ERRORS**）。**本版无设计内容改动**（仅执行期细化与落点写实） |
| **v1.4** | 2026-09-16 | sunxuewen-rush | **T1 落地执行期登记（批内首个实现 Task 完成）**——① **§3.2 件 4 执行期注**：`apiPost` + `doFetch` 参数化 + **`setUnauthorizedHandler`（401 登记口）** 已随 **T1** 落地：*原因* = 原「`apiPost` 归 T2」造成 **T1 ↔ T2 循环依赖**（T1 的 `login` 需 POST，T2 的 401 分流需 T1 的 `AuthProvider` 钩子）；*登记口落 `api/client.ts` 而非 `AuthProvider` 导出* = 防 `client → auth` 反向 import 形成 **ESM 循环**（§3.1 件 1 语义「`AuthProvider` 为注册发起方」不变）；401 **四分类消费仍在 T2**② **§6.2 登记缺口（归 T4）**：「角色徽章文案取 `navigation` 新增 3 键之一」与 §10 的 3 键**语义不符**（3 键是**组标题**「个人/管理/超级管理」，徽章应表达「用户/管理员/超级管理员」）⇒ T4 定：补 3 徽章键（净增 **32 → 35**）或徽章只显色不显字 ③ **§10 增两处待定键口径**：`claimedByOther` 待 T7 实测存在性 · 徽章键待 T4 定——**净增 32 键为 baseline，T9 实测回填** ④ 依据 = 批 plan T1 落地记录（v0.4）。**本版不含设计内容改动**（仅执行期登记与缺口留痕） |
| **v1.3** | 2026-09-16 | sunxuewen-rush | **grilling 第 3 轮（Q14-Q20）落地**——方法：重算 frontier（前置已定但**未拍板**的实现级决策），**事实全部自查（真码对账）**，7 项逐条按推荐拍板。① **Q14 401 判定域**（★）：`isProtected(path)` 的判定域写实为**当前路由**（`window.location.pathname` 匹配 4 个**路由**前缀）——**实测**全仓 `apiGet` 的 path 一律 `/api/...`（`/api/assets`/`/api/labels`/`/api/stats`/`/api/assets/:slug/versions/…`），与原「按 path 匹配」**不同域 ⇒ 永不命中**（分流整体失效）；`doFetch` 只负责「发现 401 + 上抛 path/search」，判定移入 `AuthProvider.onUnauthorized` ② **Q15 守卫包裹与 `minRole` 映射**（原文档未列，实现者只能猜）：门户 5 条**无守卫** · `/dashboard`+`/dashboard/*` = `USER(1)`（布局路由一条包 4 条）· `/reviews/:id` = `USER(1)` · `/admin`+`/admin/*` = `ADMIN(10)`；**`/admin` 的 `Navigate` 放在守卫内**（未达档先弹 `/dashboard`，不白跳）③ **Q16 `sanitizeNext` 安全边界**：新增**拒含 `\` 或 `%5C`**（`/\evil.com` · `/%5Cevil.com` 会被解析为**协议相对 URL** = 开放重定向）+ 形态约束 `^/[^/\\]` ④ **Q17 `/dashboard` 消费 `location.state.notice`**（原文档只写「纯静态零请求」⇒ 档位不足的提示**会丢失**）：挂载读 state → `toast.warning` → `navigate(replace, state:null)` 清 state 防重弹 ⑤ **Q18 device 端点错误体不同构**（实测 `http/device-flow.test.ts:26,29`）：**OAuth 风格 `{error, error_description}`** 而非本仓 `{code, message}` ⇒ `ApiError` 恒退化 `http_400`、`errors` 本地化对 device 失效 ⇒ **适配点 = `api/auth.ts` 封装**（页面不直读 `code`）；**「他人已认领」态仓内无据**（`auth/errors.ts` 12 码无 device 专属 · `grep claimed` 零命中）⇒ 标 **待 T7 实测、无则删分支 + `claimedByOther` 键** ⑥ **Q19 种子口令 = 单变量 `SMOKE_M4B2_PASSWORD`**（原 `SMOKE_*_PASSWORD` 通配未具名，T10 无法照抄）⑦ **Q20 AGENTS.md 同步**（`AGENTS.md:100` 落后 4 批，见该文件里程碑段）。**自检**：v1.2 **9.44 / 9.47** → 本轮 **9.44 / 9.50**（8 维 / 深度档三合一） |
| **v1.2** | 2026-09-16 | sunxuewen-rush | **深度档评审修正（D3 + Y1-Y4 + F1-F3 + plan 缺口落档）**——口径：**三合一 15 维 + 深度 4 维 + 四轮审查法**（四方对账 design↔plan↔主 design↔真码）。① **D3 键数口径补齐**：§10 增「**净增 32 键**」口径注（22 键为两组新增窄口径）② **Y1**「图标态…落地时实测确认」→ **官方默认即真值**（不自写隐藏类）③ **Y2** 补 **`/me` 非 401 失败 ⇒ 保持 `anon`**（不阻塞壳渲染，登记已知代价）④ **Y3** 补 **`/login` `loading` 期渲染骨架、不渲染表单**（防反向守卫竞态闪烁）⑤ **Y4** 种子脚本落点写实（表 `user` :43 · 前缀匹配 `username` :54 · `role` :56 · `status` :61 · 先删 `session`/`account` 依赖行 · 禁全表 delete）⑥ **登记 3 项**：F1 `/device` 已处理态刷新、F2 `.env.example:36` 空值（dev 恒 403 风险）、F3 侧栏混排结构视觉（T4 实测 + 用户确认）⑦ **件清单 8 → 9**：补 **`src/auth/next.ts`**（`sanitizeNext` 落点，批 plan §1.4 缺口 ⑴ 采纳 A 案）；§3.2 件 4 同步 · §11/§12 件数同步 ⑧ **Q8 边界订正**：T2 的「反向守卫」= 只提供判定函数，**消费点落 T6 `/login`**（批 plan §1.4 缺口 ⑵）。**自检**：深度档实测 **9.19** → 修正后 **9.44**（8 维）/ 三合一 **9.47** |
| **v1.1** | 2026-09-16 | sunxuewen-rush | **自检订正轮（U1-U5 · 第七轮换轴体检）**——① **U1** §3.2 改造件 **5 → 6 处**（补 `components/ui/RoleGuard.tsx`：§4.5 已要求改造却未入件清单，属**自相矛盾**；件清单是批 plan 切分依据，漏列会致实现期漏改）② **U2** §4.5 写实 `RoleGuard` 改造三点（**删本地 `ROLE` 常量**（真码 `:10`，迁 `auth/roles.ts`）· **删 `role` prop**（真码 props `{minRole, role, children}`）改内部 `useAuth()` · 接三态 `loading/anon/档位不足`），承接主 design **P4/P6** ③ **U3** §5.4 改**官方件族落位**（真码 `empty.tsx:93` 导出 6 件：`Empty` > `EmptyHeader`（`EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`）；**内容槽 = `EmptyContent`**）④ **U4** §3.2 补官方标准组形态 **`SidebarGroupContent`**；§6.2 loading 括注 **`SidebarMenuSkeleton`**（`sidebar.tsx:687`——真码导出 **23 件**实测）⑤ **U5** §9.1「行为**逐字**不变」→「**行为语义不变 + 类型面加性扩展**」（`ApiGetOptions` 增可选 `skipAuthRedirect`）。**正证**：批 design 对主 design 的 **14 处章节引用全部有效** · `LanguageSwitcher.tsx:15` 真名 · `SidebarGroup`/`SidebarGroupLabel`/`SidebarMenu` 均在导出清单。**自检**：9.17 → **9.44**（同值但构成不同于 v1.0 自评——v1.0 未扫本轮两轴） |
| **v1.0** | 2026-09-16 | sunxuewen-rush | 初稿：M4b-2 对齐定稿——grilling **13 项决策**（用户逐条按推荐拍板）· 入口现状 **8 项真码实证** · 件规格（新建 8 / 改造 5 / 不复用清单）· 路由 11 条形态切分 · 认证机制（`doFetch` 单点 401 分流 · `sanitizeNext` 支持 query · `hasRole` 单点）· 页面规格（`/login` 两 tab、`/device` 四态、`/dashboard` 临时页、`ComingSoon` 内容槽）· 出口件④ 七项 · dogfood 六组 · i18n 22 键 + 9 码。**自检**：首轮 **9.00**（3 处契约错同轮修）→ 修后 **9.44** |
