# M4b 管理后台与认证设计

> Date: 2026-09-10
> Updated: 2026-09-20（**v1.57：契约行补 `dir`（F82 · 实现期订正）** —— f1 发现列头升降序须服务端消费（否则只作用于当前页）⇒ ① §7.1 资产列表行补 `&dir=` ② §7.2 me 面契约块 + R6 行补 `dir` ③ 依据 = 批 design §4.7.6 F82）
> v1.56（2026-09-20）：**T11-f 资产排序契约行** —— 用户 2026-09-20 立项（M4b-4 验收期第三笔）⇒ ① **§7.1 资产列表**行补 `&sort=`（值 `newest`(默认)/`downloads`/`stars`/`name`/`author` · 不传 = 现状 `updated_at desc, id desc` 零变化 · 非法值静默回落默认）② **§7.2 `R6`** 行补「与公开面同参数」③ 依据 = 批 design **v1.23 §4.7**（口径 10 条 · UI 规格 · 基础面实证）；**本版为契约登记，零实现改动**）
> v1.55（M4b-4 T8 作废散点订正（文档面）** —— 用户追问「文档也都对应修改了么？」自查：v1.53 声称同步 §9/§12，但其中「**资产管理抽屉**」段仍是活口径 ⇒ **本轮订正**（「资产管理（~~抽屉~~ 已取消）+ 全部动作归详情页管理区 + 入口 = 列表 `Eye` 真链接」）；并**登记 F64**（作废件残留审计**只查关键字不判语义** ⇒ 活口径行漏扫；**合计 14 处**已订正：批 plan 7 · 本文件 2（§9/§12 段 + §2.4 U5 操作列）· 批 design 5 · v0.16/v1.19）)
> v1.54（2026-09-18）：**M4b-4 收尾回填** —— ① §2.3 批件登记表 M4b-4 行：⬜ → **✅ 五件已执行**（8 维 **9.69** · T1–T16 全绿 · 五门禁 exit 0（test 537/0）· dogfood **53 PASS / 0 FAIL** · 整体审计无未决项）；件规格订正 **新建 16 / 改造 19 + 3 文档**② §11 i18n **键数实测回填**：全仓 **323 键 / 12 组**（双语差集 0 · **en 值级泄漏 0**）③ **D2/D3 订正落地**：§12 `/dashboard` 线框去 stale 的「含2隐藏」· §7.3 该处引用改为与 U4 拍板一致（省略副文案）④ 发现：本批实现期 **F38–F63** 全部处置（明细见批 design §11.9 + 证据文件）)
> v1.53（2026-09-18）：**资产管理抽屉取消（用户「简单一点，这个抽屉不做了，取消，一点预览，直接进入完整详情」）** ——
> ① **§2.4 U6 整条作废**（保留原文作沿革留痕）：**不做抽屉** ⇒ 列表（U5）「操作」列 = **`Eye` 图标钮真链接**，
> 点击**直接进入完整详情页**（`/assets/:slug`，与 M4b-3 操作列同款）；**列表 ↔ 详情零中间态** ② §2.3 拆批表 M4b-4 行 /
> 批件登记表 预期产出物 / §4 路由表行 / §9 数据流 / §12 线框 / §11 归属批 逐处同步（去抽屉、改直跳）③ 件表 **新建 15 → 14**
> （~~`AssetDrawer.tsx`~~）· i18n 删 6 键（批 design §6.1）；`console/Drawer` **件本身保留**（控制台通用形态，视觉基线 §10.1 不变）
> ④ 真值落批 design **v1.9**（§4.3 取消 · §11.7 复评 9.69）与批 plan **v0.9**（T8 作废 · T7 改直跳 · 9.64）⑤ 本版零实现改动）
> v1.52（2026-09-18）：star 最小集并入 M4b-4（用户确认「不要单独开 M4-star」）——
> ① §2.3 拆批表 **M4b-4 行**改写：批界 = 「个人面 B + **star 最小集**」，**含 1 次迁移 + 2 端点**，交付物补 9 列列表 / 纯预览抽屉 /
> **资产详情页 owner 管理区** / star 能力 ② **§7.1 端点表新增 2 行**（`PUT`/`DELETE /api/assets/:slug/star` · 权限 = **任意登录用户**（社交动作，
> 不受 `canManageAsset`）· 幂等 · 授权集外 404）；资产详情行标注 **`labels[]` 元素改结构体**（v1.8） ③ §4 路由表 `/dashboard/assets` 行：
> 动作列改为「管理动作全在资产详情页 owner 管理区」+ 收藏端点 ④ §2.3 ④ **star 从「后置（未排期）」撤出** ⇒ 并入本批 ⑤ `docs/00` 升 **v1.74** 同步
> ⑥ **本版零实现改动**）
> v1.51（2026-09-18）：M4b-4 原型评审收口 —— U5/U6 改写 · 侧栏条目更名「标签定义」· star 前置 ——
> ① **§2.4 U5**：列表列集合 **6 → 9 列**（名称/类型/状态/标签/版本/下载/收藏/更新/操作；类型去色 · 操作列
> 改「快速预览」图标钮 · **去 `⋯` 菜单**）② **§2.4 U6**：抽屉 **四段 → 纯预览**，管理动作**统一归资产详情页
> owner 管理区**（`pages/AssetDetail.tsx` 改造 · 逐动作按服务端真码守卫显隐）③ **侧栏条目「标签管理」→
> 「标签定义」**（超管组；`admin.labels` 键名保留、值变更；§4 入口表 / §5.2 路由表 / §12 线框 / §7 能力清单共 7 处；
> 已收尾批件〔M4b-2 design〕**不追改**，如实登记）④ star 一度排为前置批 ⇒ **已被 v1.52 取代**（改为并入 M4b-4 · 见下）
> ⑤ 依据 = 批 design **v1.7** ⑥ **本版零实现改动**）
> v1.50（2026-09-18）：star/收藏登记 backlog + 首期非目标口径订正 ——
> ① §2.3 backlog 表下新增 **④ 后置（未排期）功能项**：**资产 star / 收藏**（`starCount` 读面 +
> 收藏动作 `PUT/DELETE /api/assets/:slug/star` + 门户卡/详情收藏按钮 + **一次迁移**〔新表 `asset_star`，
> 可选冗余列 `asset.star_count`〕；配套待定 = 是否写审计 / 是否限流 / 未登录语义）—— 依据 = 用户
> 2026-09-18 拍板「**登记 backlog**」② 连带 `docs/00` §6 首期非目标行改写（**消除口径冲突**：M4a design §2
> 已列「社交面（star/评分/收藏）」后置，而 `00` §6 原措辞「只保留下载统计与收藏所需最小集」易被读成
> 首期保留收藏）· 并写明**下载统计已交付**（M4a，无需重做）③ 本版**零实现改动**）
> v1.48（2026-09-18）：发布批立项 —— R2 翻转 ⇒ 新立 **M4b-8**（排 M4b-6 后 · M4b-7 前；零服务端改动）；
> 三入口（侧栏「个人」组「发布」· 顶栏「发布」· 未登录轻提示 + `/login?next=` 回跳）。详见 §15
> v1.47（2026-09-18）：资产治理入口 —— 个人面/治理面分工修正（我的资产 = owner-only · 含全部状态；
> 管理档全站治理独立成页「资产管理」→ M4b-6）
> ④ **本版零实现改动**）
> v1.46（2026-09-17）：M4b-2 收尾二次审计 + 登记表状态收口（完整历史见 §15）
> **头部口径（2026-09-18 起）**：只留最近 1-2 版 · 不复述历史与验收数字；完整历史见 **§15 修订记录**。
> SSOT：里程碑状态 → 本文档 **§5** 与 §2.3 批件登记表 · 自检分 → 各批 design §12.2 · 实测值与断言数 → `docs/smoke/` 证据文件。
> Status: 草稿（**主 design（跨批不变层）**——拆批后本文件只保留跨批不变层（里程碑范围 / 模型与角色契约 / 路由清单 / 视觉基线归属 / 拆批表 §2.3 / 决策登记 §2.4 / 接口变更总览 §8）；批内决策另立**批 design**（命名与迁移规则见 `docs/designs/README.md`）。**主 design 定稿条件**：① **视觉体系收敛 ✅ 已闭合**（视觉真值 SSOT = M4a design §4.4，版本随 M4a 演进、以其版本头为准；控制台特有值已落值：表格密度 **40** / 抽屉宽 **560**）② **三族适用性实证 ⬜ 随 M4b-5**（审核详情分型 manifest 卡）③ **grilling ✅ 已闭环**（R1-R9 + 补充锁定 5 条）⇒ ② 闭合后由用户批准转定稿。**当前进度（2026-09-17 回写）**：**M4b-1 ✅ · M4b-2 ✅（UI 视觉重做 §14 = 定稿候选，自检 **9.65**，⬠Q9/Q10 已闭环）· M4b-3 ✅ · M4b-pre ✅** ⇒ **下一批 = M4b-4（个人面 B）**；**M4b-2 的 UI 重做**待用户定稿口令后写实现代码（新增改造件 3 处 / 删件 1 处，见批 design §3.2）；其余各批批件版本与状态以 §2.3 登记表为准，批间门见 §2.3）
> Scope: M4b（00 §5）——管理与治理后台：审核队列 · 标签定义 · 资产生命周期 · 令牌 · 审计浏览；真实登录与会话（角色感知）；zh/en 双语；复用 M4a 组件基建
> 文件名沿革：本文件原名 `2026-09-10-m4b-admin-console-design.md`，2026-09-16 经用户拍板更名为 **`2026-09-10-m4b-admin-console-and-auth-design.md`**（原名只覆盖「管理后台」，未含认证与壳——M4b-pre 认证迁移 / M4b-2 登录·设备授权；全仓历史引用已一并更新为新名，见 §15 v1.21）。
> 引用链：本文档 → 规范 00 §5/§7 · 05 §3/§6 · 06 §5 · 07 全 · 08 §5/§7（引用不复制，字段与规则以规范为准）；模型事实源 = `2026-09-10-flat-model-refactor-design.md`（M4-pre）

## 1. 背景与文档定位

M4a 市场门户已收官（2026-09-09：portal design v0.8 定稿落地，T1-T19 全绿 538 tests，
dogfood 记录 `docs/smoke/2026-09-09-m4a-t18.md`）。00 §5 将 M4 拆为两子里程碑：
M4a 消费者视角公开门户（已交付）→ **M4b 管理后台**（本文档），复用 M4a 组件基建。

**M4-pre 扁平化重构已完成（2026-09-10，00 §5 已加 M4-pre ✅ 行）**——角色 4 档线性单值、
空间域整体删除、可见性整体删除、坐标改全局唯一裸 slug（事实源
`docs/designs/2026-09-10-flat-model-refactor-design.md`）。本文档 v0.3 的「平台角色数组」契约、
空间管理章节、空间角色判定与可见性字段**随之全部作废**，v1.0 按新模型重写。

**前置已就绪（代码实证，非文档推断）**：

- 服务端治理端点已由 M3 全量铺完（审核/标签/生命周期/令牌/审计——§7.1 逐端点实测表），
  M4b 以**消费既有端点为主体**，仅补 2 处缺口（§7.2）
- **角色感知契约已由 M4-pre 交付**：`GET /api/auth/me` 现返 `{ user: { id, displayName }, role }`
  （`http/auth-routes.ts:17-28`）——前端显隐直接按 `role >= N`，**M4b 零服务端改动**（R5，§3.3）
- `apps/web` 已有五路由公开门户 + `components/ui/` 跨面原子层（AppShell/TopBar/SideNav/
  FileTree/FilePreviewDialog/MarkdownRenderer/AssetAvatar/Badge/Pagination/EmptyState/
  ErrorState）——M4a 收官时按「M4b 直接复用层」设计（M4a design §4.2）
- i18n 机制（I18nProvider + useApi 语言感知缓存）与 **`styles/aih-theme.css`**（AIH 层视觉 token：语义补丁 / 基色 / 品牌渐变 / 动效 / 旧层迁移面）可直用——⚠ **原 `styles/tokens.css` 已于 T24 删除**（2026-09-11），引用请改指 `aih-theme.css`

**流程定位**（沿用 M4a 全链）：design（决策档案 + 拍板表）→ 视觉环节（精简版，R9）→
8 维自检 ≥9 / grilling → 定稿 → **批 plan（逐批立；命名见 §2.3）** → 编码测试 → converge（00 §7 ②）。

**对标依据（本设计的两个外部参照）**：

- **skillhub 源码**（Apache-2.0，skillhub 源码（Apache-2.0，本地参考仓））：
  管理动作走独立 `/api/v1/admin/*` 端点面（AdminSkillController/UserManagementController/
  AdminLabelController/AuditLogController）；「发现非活跃技能」走 `GET /api/v1/me/skills?filter=`
  个人面（MeController + MySkillAppService.MySkillFilter 六值枚举，HIDDEN 分支服务层校验
  SUPER_ADMIN，前端 HIDDEN tab 超管专属）；公开面 `SkillSearchController` 零 status 参数
- **clawhub.ai 官方契约**（`/api/v1/openapi.json`，OpenAPI 3.1，27 端点，2026-09-10 实测）：
  **无 hide/archive 语义**——用户侧仅 `DELETE /skills/{slug}`（summary 原文 "Soft delete skill"）
  + `POST /skills/{slug}/undelete`；平台侧为 moderation 轴（`isSuspicious`/`isMalwareBlocked`/
  `isHiddenByMod`/`isRemoved` + `scanStatus: clean|suspicious|malicious|pending|not-run`）；
  `archived`/`admin` 在整份契约中**零出现**。**M4-pre 后 AIH 的模型形态（扁平 + 4 档角色 +
  无空间）与 clawhub 同构**，差异化收敛为治理能力（审核/标签/审计/生命周期）

## 2. 里程碑范围（拍板表）

### 2.1 拍板结果（R1-R9 + R6 衍生 + R3′ 翻转，全部已确认）

| # | 议题 | 拍板结果 |
|---|------|---------|
| R1 | 范围档位 | **档 B**：治理闭环（审核/标签/生命周期/审计）+ 运营面（令牌/我的资产与提交），另加认证地基 |
| R2 | 发布/上传流 | **入册 —— 归 M4b-8「发布批」（2026-09-18 用户拍板，推翻原「不入首期」）**：Web 端发布流（新建资产 + 单 zip 上传 + **手动**提审）落 `/dashboard/publish` + 侧栏「个人」/顶栏「发布」入口；**零服务端改动**（注册 / 上传 / 提审三端点 M2/M3 已交付）；范围见 §2.3 拆批表 M4b-8 行 |
| R3′ | 用户管理 | **不入 M4b —— 已移出至 M4c「账号与权限治理」**（2026-09-10 用户拍板 A 翻转原 R3）：服务端用户管理 HTTP 面为零（M1 期实现：`UserService` 仅 register/localLogin——**该文件已随 M4b-pre T3 迁移删除**），且改角色/启停/建号需与「准入策略 `ACCESS_POLICY`（现仅实现 `open`，`config/env.ts:36,104-105`）/ 重置密码 / 强制登出（Session 按用户吊销）」一并设计——同属**新机制**，打包 M4c（`docs/00` §5 已加行；**范围档位候选见该行**，M4c 立项时定档）。数据侧无需迁移（`user_account.status/role` 与索引已就绪，`db/schema/auth.ts`（官方 6 表）+ 08 §3）。**M4b 内不建用户管理页**；M4c 落地前角色分配仍靠 `SEED_ADMIN_*` + 手工 SQL（M4-pre P3） |
| R4 | 登录方式 | 本地账号密码（LDAP 复用同一密码通道，05 §3.1）+ 登出；OIDC 仅保留入口跳转（服务端授权码流已就绪） |
| R5 | 角色感知 | **沿用 M4-pre 已交付契约**：`GET /api/auth/me` → `{ user: { id, displayName }, role: number }`（`role ∈ 0/1/10/100`）；前端按 `role >= N` 显隐。**本项零服务端改动**（重构前拟的「平台角色数组」方案已废弃，§15） |
| R6 | 非 ACTIVE 资产的发现与恢复 | **新增「我名下的资产」读面**（§7.2 R6；**2026-09-18 修正为 owner-only** —— 原「我可管理」口径含 `role >= ADMIN` 全站，与页面名不符）——公开面 `GET /api/assets` 与写面端点**零改动** |
| R6-a | 非 ACTIVE 可见范围（**详情/版本/文件面**） | **owner 本人 / 管理档（`role >= ADMIN`）/ 超管** 可见 HIDDEN/ARCHIVED 资产（判定同 `canManageAsset`：`owner 本人 ∨ role >= ADMIN`，05 §6.2/§6.4）。**口径说明（2026-09-18）**：本条 = **按坐标读单个**非 ACTIVE 资产的授权，**不随** R6 列表面收窄（列表面「我的资产」= owner-only，见 §2.4 U5/U8）—— 两者不同面：管理档需能读他人非 ACTIVE 资产才能治理（05 §6.4「管理他人资产 = 管理+」） |
| R6-b | 详情面 | **同步放宽**（R6-a 授权集）：HIDDEN/ARCHIVED 资产详情对该授权集可读；授权集之外仍 404 不泄露存在性（§7.2 R6-b）。**注**：本项修改 05 §6.4 现行的「非 ACTIVE 读面仅超管」行，列入 §14 规范同步项 |
| R7 | 壳与入口 | **两层（2026-09-10 用户拍板 A）**：`/dashboard/*` 个人面（所有登录用户）+ `/admin/*` 治理面（`role >= ADMIN`；标签超管）——均复用 AppShell；SideNav 新增「个人」（已登录）、「管理」（`role >= 10`）、「超级管理」（`role >= 100`）**三组**（2026-09-16 修订），组级显隐 + 条目级 role 门槛——**明细以 §4 为唯一源** |
| R8 | 品牌显示名 | **沿用 M4a 现状「AI X Hub」**（TopBar/Hero 已用；00 §3 D2 正式定名仍待决议，不阻塞 M4b） |
| R9 | 视觉与验证 | **视觉体系 = M4a design §4.4 全站 SSOT（引用不复制）**；控制台面只定特有形态（数据表格密度/抽屉宽/状态映射，**特有值 2 项已落值见 §10.1**）；产出 = **全页可点原型**（11 视图 + 评审控件；**2026-09-11 用户扩大产出范围**——原「1 版风格板 + 2 交互 demo」）；不做三变体 sketch；技术落法 = 真上 shadcn/ui（Tailwind v4 + CLI，base=radix，2026-09-11 拍板） |

**本轮对齐补充锁定（2026-09-10，随 R7 分层修正一并定案）**：

- 概览页归 `/dashboard`（个人工作台 landing），**不设 `/admin` 概览**——原「管理后台赘页 + 对无管理权限用户必然 403」的问题随分层消失
- 标签排序交互 = **行内上/下移按钮**（零新增依赖；改序后批量提交 `PUT /api/labels/order`）——不做拖拽
- 标签翻译 locale = **固定 `zh-CN` / `en` 两行**（服务端契约仍支持任意 BCP47，UI 只暴露双语）
- web 验证策略 = **沿用 M4a**（typecheck + SSR 渲染冒烟 + Edge headless dogfood，零新增依赖）——不建 vitest / testing-library
- R6-b 触及既有测试 `assets.test.ts:421`，属**需求变更驱动的契约更新**（已获准，§7.2）

### 2.2 M4b 边界

**In（档 B）**：

- 入口分层（R7）：`/dashboard/*` 个人工作台 + `/admin/*` 治理面 + 共享审核详情 `/reviews/:id`
  ——**可见条件清单以 §4 为唯一源**、路由清单以 §5 为唯一源（此处不复制，防三写漂移）
- 认证与会话（**前端层**——服务端认证栈已于 M1 阶段一/二交付，本里程碑**零服务端改动**，R4/R5）：登录页（本地+LDAP 同一密码通道）/ 登出 / 会话上下文 / 401 拦截 / 角色感知（消费 M4-pre 契约）——**能力 × 阶段归属见 §3.0**
- 个人工作台：角色感知卡片 landing（待审数 / 我的资产 / 最近审计，按角色裁剪请求）
- 审核面：全站单队列列表（status 过滤）+ 审核详情（版本内容预览）+ 通过/拒绝（comment）+
  我提交的列表与撤回
- 标签定义：CRUD + 多语言翻译（固定 `zh-CN`/`en`）+ 两级树 + 行内上/下移排序 + 上限提示（超管面）
- 资产生命周期（**个人面 = 我名下的资产**，2026-09-18 拍板修正；管理档的**全站**资产治理另立
  治理面页「资产管理」→ **M4b-6**，见 §2.4 U8）：我的资产列表（我名下 · 状态筛选）+
  状态治理 + 版本管理（yank/删除）+ 资产删除 + 标签挂载
- 令牌管理：签发（scope/有效期，明文一次展示）/ 列表 / 吊销
- 审计浏览：日志列表 + 八维过滤
- 资产发布流（**R2 → M4b-8**）：`/dashboard/publish`（新建资产 + 单 zip 上传 + XHR 进度 + **手动**提审）·
  侧栏「个人」组「发布」条目 + 顶栏「发布」入口（未登录 = 轻提示 + `/login?next=` 回跳）——
  **零服务端改动**，详见 §2.3 M4b-8 行
- i18n：**既有 7 组**（`navigation` / `market` / `common` / `errors` + **M4b-1 已落骨架的** `dashboard` / `admin` / `review`）之上，M4b-2 新增 `login` / `device` **两组**（07 §3；2026-09-16 按真码 `i18n/zh.ts` 实测订正——原「新增五组」口径作废，登记 §14）
- 服务端最小支撑：R6（`GET /api/me/assets` 新增）+ R6-b（读面授权集扩）

**Out（后置，不混入）**：自助注册入口（M4b-pre 后注册端点为官方 `sign-up/email`，由
`REGISTRATION_ENABLED` 控制——`better-auth.ts:79-80` `disableSignUp: !REGISTRATION_ENABLED`；
**该开关无公开端点暴露** ⇒ 前端无法感知注册是否开启；**真码默认 `true`（开启）**——`env.ts:35`
与 `.env.example:19` 均为 `true`（2026-09-16 实测；原「默认关闭」表述订正），企业自托管按惯例置
`false`、由管理员建号（seed / 用户管理面）；若需开放自助注册，须一并新增开关暴露端点，
属后置议题）· **用户管理面（R3 → 已移出至 M4c「账号与权限治理」**：列表/改角色/启停/建号 + 准入策略 `ACCESS_POLICY` + 重置密码 + 强制登出；`docs/00` §5 M4c 行）· 提升申请
（`promotion` 权限码与端点均未建，`promotion_request` 表 08 §9 蓝图随对应服务引入）·
排序切换/社交面（M4a 已 out）· 安全扫描面（AIH 版本态 SCANNING 为扫描扩展点，
clawhub 的 scan/moderation 面为独立议题）· 自定义版本通道 stable/beta（M3 明确后置）·
空间管理（M4-pre 已整体删除，无回归议题）· ~~Device Flow 确认网页~~ —— **已改判归 M4b-2**（2026-09-16 用户拍板；原「M4c 或随 M5 CLI」口径作废，见 §3.0/§5.1/§5.2）

### 2.3 子里程碑拆批（2026-09-14 拆六批 · 2026-09-16 增 M4b-7 · 2026-09-18 增 M4b-8 —— 共八批，逐批对齐与实现）

> 拆分维度 = **依赖顺序 + 可独立交付 + 服务端改动隔离**。每批走同构流程：
> 对齐（逐条过 UI 与契约）→ 该批 design 定稿（8 维 ≥9）→ 立 plan → 实现 + 自检 ≥9 → 门禁/冒烟 → 追踪表注记。

| 批 | 主题 | 范围要点 | 服务端改动 | 前置 |
|----|------|---------|-----------|------|
| **M4b-1** | **地基批：组件归位 + 控制台组件面域** | 手搓展示件 → 官方件 14 处 · 官方件**新落仓 11 件（表列 13 项）** · `components/console/` 6 件 · 跨面 4 件 · 合规清理 4 项 · i18n 骨架 | **零** | — |
| **M4b-2** | 认证与壳批 | 登录页（官方 `Card`+`Field` 装配 + 常规/OAuth 两 tab；`login-03` demo **不落仓**）· 设备授权页 `/device` · `AuthProvider`（loading/anon/authed）· 401 三分类分流 + 反向守卫 + `sanitizeNext` · 角色判定单点 `auth/roles.ts` · 登出 · `next` 白名单 · SideNav **三组** + 条目级门槛 · 路由骨架（11 条 + `ComingSoon` 占位；`/dashboard` 先落**临时落地页**——与 `ComingSoon` **同一件**、内容由 props 决定，M4b-4 替换为三卡）· 直访守卫 · **用户区（侧栏底部）**· 「系统设置」/「用户管理」占位条目 | **零** | M4b-1 |
| **M4b-3** | 个人面 A | 我的提交（**类型列 + 资产 + task 状态 + 提交时间 + 拒绝原因**；操作列 **[👁 查看][↩ 撤回]** 图标化，撤回仅 PENDING + 二次确认 · 类型与状态筛选 · 分页）· 我的令牌（**6 列**：名称/Key 掩码/权限范围/创建时间/最后使用/操作（**[✎ 编辑][🗑 删除]** 同色图标）· 创建（明文一次性 + 误关防护）/ 编辑（改名 + 改权限）/ 删除（去红）；只显有效令牌） | **加性**：`ReviewListItem` + **`reviewComment` / `assetType`**（§8 R6-c + v1.7）· **`ApiKeyRow` + `name` / `start` / `tail` / `lastRequest`** · **新增 `PATCH /api/tokens/:id`** · `better-auth` 配 `charactersLength: 12` · 签发写 `metadata.tail`（**零迁移**） | M4b-1/2 |
| **M4b-4** | 个人面 B + **star 最小集**（**唯一含读面改动**；v1.8 起**含 1 次迁移**） | `GET /api/me/assets`（R6）+ R6-b 授权集扩展 + 测试更新 · 我的资产列表（**9 列**）· ~~资产管理抽屉~~ **取消（列表操作列直跳详情页）** · **资产详情页 owner 管理区**（管理动作全在此 · 按权限显隐）· **star 最小集**（`asset_star` + `star_count` + 幂等端点 + 读面）· 工作台 landing | **2 处读面 + 1 次迁移 + 2 端点**（§8 R6/R6-b · 批 design §5.1 ⑧） | M4b-1/2 |
| **M4b-5** | 审核批 | `/admin/reviews` 队列 · `/reviews/:id` 共享详情（分型 manifest 卡 + 文件树 + 预览 + 通过/拒绝/撤回 + 防自审交互） | **零** | M4b-1/2 |
| **M4b-6** | 治理批 | **资产管理**（全站资产治理列表；侧栏「管理」组新增子项「资产管理」——2026-09-18 用户拍板，见 §2.4 U8）· 标签定义（两级树 CRUD + zh-CN/en 翻译 + 行内上/下移 + 上限提示）· 审计浏览（八维过滤 + `action` 分组下拉 + 日期区间用官方 `Calendar`） | **1 处**（管理档全站资产列表读面——契约待该批对齐时定；本批不改 R6 端点语义） | M4b-1/2 |
| **M4b-8** | **发布批**（2026-09-18 用户拍板新增 —— R2 翻转） | `/dashboard/publish` 发布页 = **新建资产 + 上传版本页内一步向导**：新建（`slug`/`type`）→ **单 zip** 上传（与 CLI 同一包格式，零服务端改动）· **XHR 进度通道**（不替换 `fetch` 客户端）· 上传落 **`DRAFT`** + **手动「提交审核」**（两步可见可撤回，不做自动提审）· 错误映射（413 超限 / 限流 / zip 校验 `issues` 数组）· **三入口**：侧栏「个人」组「发布」条目 + 顶栏「发布」· 未登录点击 = 轻提示 toast + `/login?next=/dashboard/publish` 回跳 · i18n 新组 `publish`（`07` §3 已预留组名）· **页面原型评审**（R9 的 11 视图不含本页 ⇒ 本批自补） | **零**（注册/上传/提审端点 M2/M3 已交付） | M4b-1/2 |
| **M4b-7** | **控制台视觉打磨批（收尾）** | 控制台面的**视觉最后一公里**——节奏 / 密度 / 视觉层次 / 微交互 / **全态一致性**（正常·空·载·403）· **控制台三判**（气质 / 密度 / 类型色）；**镜像 M4a 视觉体系切换的做法**（探针切片 → 用户三判 → 全量打磨）；**体系仍以 M4a design §4.4 为 SSOT（引用不复制）** ⇒ 本批只做「**应用体系的最后一公里**」，**不重新设计**；**与「完整 converge」同批收口**（见编排说明） | **零** | **M4b-1…6 + M4b-8 全绿** |

**编排说明**：
- 顺序即依赖链 **1 → 2 → 3 → 4 → 5 → 6 → 8 → 7**（M4b-1 是所有批的组件底座；M4b-2 是所有页面的认证底座；**M4b-8 = 发布批**（2026-09-18 增）插在治理批之后、视觉收尾之前；
  **M4b-7 是收尾打磨批**——不改功能依赖，只在全部功能批落定后做视觉收口）；3/4 与 5/6 之间可微调先后
- **文档形态**：**主 design**（本文件）保留模型/契约/路由/视觉基线；**每批另立 design 块 + plan 文件**
  （命名 `docs/designs/YYYY-MM-DD-<批>-design.md` / `docs/plans/<批>-<主题>.md`）
- **出口口径**：见下行「批间门」（**五件全绿**）；**完整 converge 放到 M4b 全部子批收尾**（避免六次重评）
  ⇒ **与 M4b-7 同批收口**（打磨批收尾时文档/代码一起对齐）
- **视觉职责边界（2026-09-16 用户拍板 A · 新增 M4b-7 时一并明确）**：① **体系层** = M4a design §4.4（全站
  视觉真值 SSOT，**已完成**，各批引用不复制）② **页面视觉定稿层** = M4b 立项对齐产出的**全页可点原型**
  （11 视图 + 评审控件；R9）③ **逐批落地层** = 各批出口的 `dogfood/观感` 只做**合规核对**（有无异常 /
  是否符合 §4.4），**不做审美定稿** ④ **视觉收口层** = **M4b-7**（唯一的美化/打磨窗口）⇒ 由此「各批出口
  观感」与「全站美化」职责分离，避免每批重复对齐；某批若引入**新组件/新交互**（如 M4b-5 文件树+预览卡 ·
  M4b-6 官方 `Calendar`）⇒ 在**该批内就地补录 §4.4 映射**（局部视觉决策，不等 M4b-7）
- **`docs/00` §5**：M4b 行下加 M4b-1…M4b-8 子行（状态唯一源不变）
- **批间门（gate）**：上一批**出口五件**全绿才启下一批 —— `批 design 8 维 ≥9 定稿` + `批 plan Task 全绿` + `五门禁` + `dogfood/观感` + **`整体审计`**（收尾全仓覆盖式扫描：findings 逐条登记 + 处置「修 / 订正 / 回填 / 口径登记」，不留未决项）；未达标不进入下一批（各批 plan §1「前置」引用本条；先例 M4a T17-T26 · M4b-1 批 plan §3）
- **批内内容迁移规则**：某批对齐时把该批专属内容（拍板 / 规格 / UI 变动 / 线框）从本文件**迁出到该批 design**，本文件留指针；§2.4 决策登记同规则（落地即转指针，不复制内容）

**各批预期产出物与对齐要点（粗粒度 backlog——不预建空文件，到批才立）**

| 批 | 预期 design | 预期 plan | 对齐要点（立项时逐条过） |
|----|------------|----------|------------------------|
| M4b-2 | `YYYY-MM-DD-m4b2-auth-shell-design.md` | `M4b-2-auth-shell.md` | 登录页两 tab（官方 `Tabs` + `field`）· **设备授权页 `/device`** · `AuthProvider` 三态与首帧不闪 · 401 三分类分流 + 反向守卫 · 角色判定单点 · SideNav **三组** + 组标题 + 条目门槛 · 路由骨架 + `ComingSoon` · 直访守卫与轻提示 · **用户区（侧栏底部）** · 占位条目交互 · **`/login` / `/device` 线框补图** |
| M4b-3 | `2026-09-16-m4b3-submissions-and-tokens-design.md`（**定稿** · 8 维 **9.81**） | `M4b-3-personal-submissions-and-tokens.md`（**v0.1** · T1-Tn） | 我的提交列集合（**含类型列**）与 **task 状态**文案 · **操作列 [👁 查看][↩ 撤回] 图标化**（v1.6 推翻「整行可点」）· 撤回仅 PENDING + `AlertDialog`（去红）· `reviewComment` + **`assetType`** **加性字段**（服务端 + 用例）· 令牌 **6 列**（含 Key 掩码 `aih_xxx*****xxxx`）/ 创建（明文一次性 + 误关防护）/ 编辑（改名 + 改权限 ⇒ **新增 `PATCH /api/tokens/:id`**）/ 删除（去红）· 表格三态 · 键数净增 **72** |
| M4b-4 | `YYYY-MM-DD-m4b4-personal-b-design.md` | `M4b-4-me-assets-and-console.md` | **R6 端点契约**与分页 · **R6-b 授权集**与测试更新 · 工作台三卡与角色裁剪 · 我的资产**九列**（显式 `status=ALL`）· ~~抽屉（纯预览）~~ **取消（v1.9：列表直跳详情）** · **资产详情页 owner 管理区**（管理动作全在此 · 按权限显隐）· `labels` 结构体（D5/D7 根治）· dogfood 多角色数据准备 |
| M4b-5 | `YYYY-MM-DD-m4b5-review-workbench-design.md` | `M4b-5-review-workbench.md` | 队列列集合与状态过滤 · 共享详情路由与权限面 · **分型 manifest 卡（三族）** · 文件树 + 预览（官方 `Dialog`）· 三动作 + 防自审交互 · 拒绝必填原因 · 端点权限与 token scope 交叉验证 |
| M4b-6 | `YYYY-MM-DD-m4b6-governance-design.md` | `M4b-6-labels-and-audit.md` | **`/admin` 管理看板（2026-09-17 用户拍板归属本批；内容清单待本批对齐时讨论——本表不预设）** · **资产管理（全站资产治理 + 侧栏「管理」组新条目；2026-09-18 用户拍板归属本批——路由路径与页面形态待本批对齐时定）** · 标签两级树 CRUD + 固定 zh-CN/en 翻译 + 行内上/下移（`PUT /order`）+ 上限 100 提示 · 审计八维过滤 + `action` 分组下拉（27 个动作）+ 日期区间（官方 `Calendar`）· 分页 |
| M4b-8 | `YYYY-MM-DD-m4b8-publish-design.md` | `M4b-8-publish.md` | **发布页信息架构与向导步序**（新建 → 上传 → 提审）· **上传通道与进度**（XHR 通道接线点，不替换 `fetch` 客户端）· **zip 校验错误面**（服务端 `issues` 数组 → 行内错误映射）· **错误矩阵**（413 / 限流 / 400 / 409 slug 冲突）· **三入口与未登录回跳**（`next` 白名单已含 `/dashboard`）· **i18n `publish` 组键表** · **页面原型评审**（补 R9 第 12 视图）· dogfood 含上传真包验证 |
| M4b-7 | `YYYY-MM-DD-m4b7-console-visual-polish-design.md` | `M4b-7-console-visual-polish.md` | **打磨范围与验收口径**（控制台三判项：气质 / 密度 / 类型色）· **探针切片选型**（共享壳 + 代表页，镜像 M4a 阶段 0 做法）· **全态清单**（正常 / 空 / 载 / 403）· **与 §4.4 的偏差审计**（区分「应用未到位」vs「体系待补」——后者才回改 §4.4）· **打磨项逐条留痕**（改前 / 改后）· **组件层一致性收敛**（表格密度 40 / 抽屉宽 560 的落地核对）· **不进本批**：功能逻辑 / 服务端 / 新增页面 |

**批件登记表（实际落地件与状态——每批落地后回填）**

| 批 | 批 design（实际文件名） | 批 plan（实际文件名） | 版本 | 状态 | 批间门（五件） |
|----|------------------------|----------------------|------|------|----------------|
| **M4b-pre** | `2026-09-15-m4b-pre-auth-migration-design.md` | `M4b-pre-auth-migration.md` | design **v2.4**（批次收口后） · plan **v0.14** | ✅ **完成（2026-09-15）**——spike **✅ X1-X8 全通过** · design 定稿并整体批准（8 维 **9.44**；T2-T8 落地回写至 **v2.3**）· 九个提交 `fd58de0`/`a7ce23e`/`fb7b4a7`/`7b8ea11`/`b76e978`/`a6c2c5a`/`50b0c52`/`52f8156` + T8，**CI #41-#49 全绿**；全量测试 **501 例 0 fail**；批内自绘面 = 企业目录凭证插件 + 业务面同源守卫 + api-key 适配层 + `/me` 薄层（理由见 design §1.4/§2.3 P14/P6-P7） | ✅ **五件全绿** ① design 8 维 ≥9（converge **9.5**）② T1-T8 全绿 ③ 五门禁逐项 exit 0 ⑤ 整体审计十一维无未决项（修 8 / 口径登记 6）· **④ dogfood/观感 = 本批不适用（移交 M4b-2）**——零 UI 改动且登录面未交付（`TopBar` 占位件 + 无 `/login` 路由），登记为 M4b-2 出口件 |
| **M4b-1** | `2026-09-14-m4b1-console-foundation-design.md` | `M4b-1-console-foundation.md` | design **v1.6** · plan **v0.14** | ✅ 批完成 2026-09-14 | ✅ 五件全绿 —— ① design 8 维 ≥9（定稿 9.63 / 审计轮 9.81）② T1-T8 全绿 ③ 五门禁逐项 exit 0 ④ dogfood 36/36 + NO JS ERRORS + 观感复核通过 ⑤ 整体审计 F1-F8（无未决） |
| **M4b-2** | `2026-09-16-m4b2-auth-shell-design.md` | `M4b-2-auth-shell.md` | design / plan **版本以其版本头为准** | ✅ **完成（2026-09-17）**——**批内进度：T1-T15 ✅**（**批次完成** · 收尾二次审计无未决项 · 断言 **49/0**）·**前置已满足（M4b-pre ✅ 2026-09-15）**；grilling **13 项决策**（Q1-Q13 逐条按推荐拍板）· 入口现状 **8 项真码实证** · 件规格（新建 **9** / 改造 **6** / 不改 4 类）· 路由 **11 条**（3 真页 + 1 重定向 + 7 占位）· 认证机制（`doFetch` 单点 401 四分类 · `sanitizeNext` 保码 · `hasRole` 单点）· 出口件④ **七项** · dogfood **六组** · i18n **键数以其 §10 口径为准**（+9 码）。**立项对齐必核现状项（M4b-pre 移交）**：`TopBar.tsx:33-39` 的「登录」是**占位 `<span>`（无 `onClick`/`href`）**、路由表**无 `/login`** ⇒ 本批入口改造 = 占位件 → 真认证入口 + `/login` 页 + `AuthProvider`；**出口件 ④（dogfood/观感）自 M4b-pre 移交本批** | ✅ **五件已执行**：① design 8 维 ≥9（定稿 9.44 / converge **9.50**）② T1-T10 全绿 ③ 五门禁 exit 0（含 `test` **500 pass · 1 skip · 0 fail**）④ dogfood **36/36 + 24/24 + NO JS ERRORS** ✅ / **出口件 ④ 七项 = CDP 自动断言 14/14 + 用户认可** ✅ ⑤ 整体审计无未决项（F4 关闭 · 旧指针关闭 · 行数订正）——证据 `docs/smoke/2026-09-16-m4b2-auth-shell.md` · **UI 视觉重做 ✅ 2026-09-17**（用户「本批内升版」→ 批 design **§14 定稿**）：T11-T15 落地（登录页双栏/无白卡/撤 tab · 设备页单列 · 壳 14 条 SVG 图标 + 顶栏页面标题区 + 「管理看板」占位条目 · 删件 `AuthLayout.tsx`）· 断言 **37 PASS / 0 FAIL** · 门户零回归 **36/36 + chain-smoke PASS** · 证据 `docs/smoke/2026-09-17-m4b2-ui-redo.md`（截图 5 张）|
| **M4b-3** | `2026-09-16-m4b3-submissions-and-tokens-design.md` | `M4b-3-personal-submissions-and-tokens.md` | design **v1.19** · plan **v0.11** | ✅ **完成（2026-09-16）** · **人工验收 ✅（2026-09-17）**——**批内进度：T1-T10 ✅**（T9 并入 T10）· 前置已满足（M4b-2 ✅ 2026-09-16）· 提交链 `02cb290`(T1)→`64a742e`(T2)→`25e60bf`(T2-rev)→`a72b7a1`(T3)→`511f040`(T4)→`44ddc8f`(T5)→`b7cc466`(T6)→`d780723`(fix market)→`056475e`(T7)→`1d4a609`(造数)→`3b5d7fe`(T8)→T10 收尾提交 · 键表净增 **80 键**（2026-09-17 订正：`error.load` ×2 删除）（`submissions` 25 · `tokens` 47 · `errors` +7 · `common` +1）· **零迁移** | ✅ **五件全绿** —— ① 批 design 8 维 **9.93** ② **T1-T10 全绿** ③ 五门禁逐项 exit 0（`test` **517 pass / 1 skip / 0 fail**）④ dogfood **39/39 + `NO JS ERRORS`**（G1-G15 · 误关防护四路径含真指针点遮罩 · 只显有效集合对账 · 门户 36/36 零回归）· 观感截图 6 张待人眼 ⑤ 整体审计无未决项（`error.load` 孤儿键**登记待拍板** · 门户 dogfood 3 处断言缺陷顺带修）|
| **M4b-4** | `2026-09-18-m4b4-personal-b-design.md`（**定稿** · 8 维 **9.69**；findings 全闭合〔§11.2 八项 + §11.3 五项 + §11.4 六项 + §11.5 五项 + **实现期 F38–F63**〕） | `M4b-4-me-assets-and-console.md`（**T1–T16** · **T8 作废**） | design / plan **版本以其版本头为准** | ✅ **已收尾（2026-09-18）**——grilling **Q1–Q14** + **原型评审 R1–R23** + **star 并入**（v1.8）逐条拍板 · 件规格（**新建 16** / **改造 19 + 3 文档**）· 服务端 **R6 + R6-b + `labels` 结构体 + star 端点与读面**（M4b 中**唯一含读面语义改动**的批；**含 1 次迁移**）· dogfood **G1–G19 = 53 PASS / 0 FAIL / NO JS ERRORS** · 证据 `docs/smoke/2026-09-18-m4b4-personal-b.md`（+ 截图 6 张）| ✅ **五件已执行**：① design 8 维 ≥9（**9.69**）② **T1–T16 全绿**（逐 Task 均分 9.41–9.71）③ 五门禁逐项 exit 0（`test` **537 pass / 0 fail**）④ dogfood **53 PASS / 0 FAIL / NO JS ERRORS** + 门户零回归 **36/36** + chain-smoke **PASS** ⑤ 整体审计无未决项（3 条登记留存均写明归属批）|
| M4b-5 · M4b-6 · M4b-8 | ⬜ 待落地回填 | ⬜ 待落地回填 | — | ⬜ 待对齐 | ⬜ |

> **说明**：① 上表「各批预期产出物」= 立项时的**计划名**，主题词可在落地时按实际范围微调；
> **实际名以本表为准**——本表即「主 ↔ 批」的双向查询点（查「这批的 design/plan 到底叫什么、几点几版、什么状态」）。
> ② M4b-1 落档早于本 backlog 表（拆批时即定稿），故 backlog 无其行，其名亦以本表为准。
> ③ 本表同时是**批间门执行台账**（第五件 = 整体审计，口径见 §2.3 上条与 `docs/00` §5/§7 ②）。
>
> ④ **后置（未排期）功能项**（不属任何已立批；新增须用户拍板）—— **当前无在册项**
> （原在册项「**资产 star / 收藏**」已于 **2026-09-18 并入 M4b-4**：用户先拍「UI 收尾后先做 star·建议 `M4-star`」，
> **同日改为「并入 M4b-4」** ⇒ 契约落 **批 design v1.8 §5.1 ⑧** · Task 落 **批 plan v0.8 T15/T16（T15 最先）** ·
> 端点落 **§7.1**；下列实现面描述**保留作对照**）：实现面 = `starCount` / `starredByMe` 读面 + 收藏动作
> `PUT` / `DELETE /api/assets/:slug/star` + 门户卡与详情页收藏按钮 + **一次迁移**（新表
> `asset_star(userId, assetId, createdAt)`，可选冗余列 `asset.star_count` 或纯 `COUNT` 聚合）；
> 配套待定 = 是否写审计（下载不入审计，star 是否同口径）· 是否限流 · 未登录语义。
> **已交付、无需重做**：**下载统计**（`asset.download_count` · 授权即原子增量 · `assetItem()` 带出 ·
> 门户卡/详情页展示 —— M4a 交付）。**以上 star 实现面已并入 M4b-4（v1.8）** ⇒ 本项**不在册**。

### 2.4 对齐决策登记（2026-09-14 逐条对齐产物）

> 本表登记**跨批的壳/交互决策**（逐条经用户拍板）；各批 design 只引用、不复制。

**U1 壳与导航**（→ M4b-2；**2026-09-16 修订：两组 → 三组 + 用户区落侧栏底部**）：`SidebarGroup` + `SidebarGroupLabel` **三组**（「个人」/「管理」/「超级管理」）·
未登录「个人」组整组不渲染 · 图标态隐藏组标题 · `AuthProvider` 为本批最先落地的基建（`Toaster` 已于 M4b-1 落仓并挂根——`main.tsx:45`）·
「管理」组 `role >= 10`（**管理看板**（占位条目 → 页面归 **M4b-6**；2026-09-17 拍板）+ **审核队列 + 审计浏览 + 资产管理**（全站资产治理，2026-09-18 拍板；条目与页面**同批落 M4b-6**，本批不预埋条目——见 U8））· 「超级管理」组 `role >= 100`（**标签定义 + 系统设置 + 用户管理**）——
**标签定义 = 超管（2026-09-14 修正回超管，服务端 `labels.ts:56-62 assertSuperAdmin` 为硬门）**；「系统设置」为占位条目：
仅显示 + 点击弹 Phase 2 提示，不建页面；「用户管理」→ M4c ·
`me` 未返回前三组均不渲染（防首帧闪烁）· **用户区（未登录「登录」入口 / 已登录用户菜单）落侧栏底部 `SidebarFooter`**
（2026-09-16 用户拍板）——顶栏只留品牌 + 侧栏触发钮 + 语言切换器（**2026-09-17 Q7 追加：+ 页面标题区** = 页面标题 14px/600 + 分区 12px）；侧栏底部同时**移除**产品元信息三项。**⚠️ v1.44 更新（2026-09-17）**：顶栏改官方 `SiteHeader` 形态 ⇒ ① **宽 = 内容区宽**（不再横跨全宽）② **品牌移出**顶栏（落侧栏顶部 `SidebarHeader`）③ 标题改语义 **`<h1 class="text-base font-medium">`**（原「标题 + 分区」自绘撤除）④ 高度取 `--header-height` 变量；**真值 = 批 design §14.4 顶栏行**（引用不复制）
（Star on GitHub / 文档·反馈 / 版本号行）

**U2 登录页**（→ M4b-2）：`/login` 独立版式居中卡 · **两个 tab：常规登录 / OAuth 登录**（OIDC 恒显示）·
语言切换器保留 · 失败 = 表单内 inline 错误条 · Enter 提交 + 提交中 `disabled` + `Spinner` ·
`autocomplete` 正确 · 用户名为中性文案 · 不显示注册入口 · `next` 白名单回跳 · 登出回首页

**U3 会话与 401**（→ M4b-2）：`AuthProvider` 状态机 `loading | anon | authed` ·
**401 按路由分流**（公开路由静默当 anon；仅受保护路由 `→ /login?next=`）· `/me` 禁缓存 +
登录/登出清缓存 · 新增「按前缀失效缓存」能力 · **不做静默续期** · **受保护前缀清单**（`PROTECTED_PREFIXES`，与 §5.2 路由清单同源）= `/dashboard` · `/admin` · `/reviews` · `/device`（**4 个**；其余（M4a 五路由 + `/login`）为公开段，401 静默当 anon）· **401 接线点（2026-09-16 拍板；M4b-2 落地细化）**：分流**单点落在 `api/client.ts` 的 `doFetch` 层**（`apiGet` 与新增 `apiPost` 的共用底层——N2 拍板的「单点」在 M4b-2 的落点，见批 design §4.2）——拦截 401 后调由 `AuthProvider` 注册的 `onUnauthorized` 钩子；`useApi` **保持通用薄 hook、零改动**（`useApi.ts:17-47` 现状仅三态 + abort，不掺认证逻辑）· `sanitizeNext` **支持带 query 的站内相对路径**（`/device?user_code=…` 回跳不丢码；落点 `auth/next.ts`——批 design v1.2）· 角色判定单点 `auth/roles.ts`
（禁页面散写 `role >= N`）· **反向守卫**（已登录访问 `/login` → **优先回合法 `next`**——保住 `/device?user_code=` 等深链，无 `next` 才回 `/dashboard`；2026-09-16 grilling 拍板）· **`sanitizeNext`**（仅站内相对路径，非法回落 `/dashboard`）· **首帧预热**（`main.tsx` 模块级 `bootstrapAuth()` 不 `await`）· 过期跳转丢输入为**已知代价**（不补草稿机制）

**U4 工作台**（→ M4b-4）：三卡（待审核 / 我的资产 / 最近审计）；`role < 10` 只发 1 个请求、只渲染「我的资产」卡 ·
省略「含 N 隐藏」副文案（不动后端）· 整卡为链接（内层 CTA 非嵌套 `<a>`）· 审计卡 5 行不可点 + 「查看全部」·
单卡左对齐同列宽 · 每卡独立三态（Skeleton / ErrorState）· 待审核数 = 全站队列 total

**U5 我的资产**（→ M4b-4）：**集合 = 我名下的资产（`asset.ownerId` = 我本人；含 ACTIVE / HIDDEN / ARCHIVED 全部状态）—— 2026-09-18 用户拍板修正**（原口径「我可管理的集合」含 `role >= 10` 全站，与页面名不符；非 ACTIVE 不进公开列表 ⇒ 本面是 owner 找回并恢复自己隐藏资产的唯一 UI 入口）· 列集合固定 **9 列**（**名称**（名+slug）/ 类型（**无色图标**）/ 状态 / **标签** / 版本 / **下载** / **收藏** / 更新 / 操作（**单个 `Eye`「打开详情」图标钮** —— `Button asChild` + `Link` **真链接直跳** `/assets/:slug`；抽屉取消后无中间态 · v1.55）—— 2026-09-18 原型评审收口，原 6 列 + `⋯` 菜单口径**作废**，见批 design §2.1d）·
类型列 = 类型色小块 + 文案 · **筛选默认「全部」须显式发 `status=ALL`**（防名实不符）·
`?status=&q=&page=` URL 化（复用 `useMarketQuery`，不新建 hook）· debounce 300ms · 空态两套文案 ·
操作列 = **`Eye` 图标钮 · 真链接直跳详情页** · `<1100px` 横向滚动不卡片化（~~`⋯` 菜单~~ 已废）

⛔ **U6 已取消（v1.53 · 用户 2026-09-18「我们简单一点，这个抽屉不做了，取消，一点预览，直接进入完整详情」）**：
**不做抽屉** —— 列表（U5）「操作」列的图标钮 = **`Eye` 真链接**，点击**直接进入完整详情页**（`/assets/:slug`）；
管理动作全归**详情页管理区**（批 design §4.6）。以下 U6 原文保留作**沿革留痕**（不复述）：

~~**U6 资产管理抽屉 = 快速预览**（→ M4b-4；**2026-09-18 原型评审收口改写**）：**纯预览**（工具行（状态徽章 + 「快速预览」定位 + 「完整详情 ↗」）/ 下载·收藏统计行 / 描述 / 标签+-）——~~四段（状态治理 / 标签挂载 / 版本列表 / 危险区）~~ **作废**：管理动作（状态治理 / 版本管理 / 危险区 / 标签+-）**统一归资产详情页 owner 管理区**（`pages/AssetDetail.tsx` 改造 · 按权限显隐，见批 design §4.6）· 原「状态治理 = 按当前状态给动作按钮」口径**并入详情页管理区** ·
标签 = `Popover` + `Command` 可搜索（+`cmdk`）+ chips × 移除 + 10 个上限 · 版本列表紧凑 + 懒加载 ·
危险区常驻但按守卫禁用 · 宽 **560** · 写后局部重取 + Toaster；**三处服务端守卫须在 UI 体现**：
yank 需 **输入原因**（`reason` 必填）· **owner 不可 yank**（仅 `role ≥ 10`）· 版本删除按状态禁用
（PUBLISHED/PENDING_REVIEW/YANKED 禁删）

**U7 我的提交**（→ M4b-3）：状态列 = **review task 状态**（PENDING/APPROVED/REJECTED/WITHDRAWN 中文自然语）·
筛选含 WITHDRAWN · **撤回仅 PENDING 行可用**（其余「—」）+ `AlertDialog` 二次确认 ·
列表露出**拒绝原因**（服务端加性字段，§8 R6-c）· 整行可点进 `/reviews/:id`

**U8 资产治理入口（→ M4b-6 · 2026-09-18 用户拍板）**：U5 经修正为 **owner-only** 后，管理档治理
**全站**资产的 UI 入口独立成页 —— **侧栏「管理」组新增子项「资产管理」**（组级门槛沿用 U1 的
`role >= 10`）· **归属批 = M4b-6**（与「管理看板」同批）· **本批（M4b-4）不预埋占位条目**（入口与
页面同批落，避免空条目）· 路由路径与页面形态待该批对齐时定 · 服务端**写面**能力已在
（`canManageAsset` + 管理端点族，05 §6.4 不变）；**读面需新增「管理档全站资产列表」**（本批 R6 端点
保持「我名下」语义、不回退）—— 该读面归 M4b-6 对齐时定契约（§2.3 服务端改动列已记 **1 处**）

**P1-P5 用户管理（→ M4c）**：对标 new-api / skillhub 源码后定档 **A+**（列表 + 改角色 + 启停 + 管理员建号）·
重置密码形态 = 超管直接设新密码（一次性展示）· 解绑身份进首期菜单 · **不做批量操作**；
M4b 内**只在侧栏登记条目与门槛（超管）**，点击同「系统设置」→ Phase 2 提示；**不预埋空页面**

**官方件规则（全批适用）**：shadcn 官方 Agent Skill 的 16 条硬规则（`className` 只做布局 ·
变体/ token / CSS 变量 / 加 variant / 包装组件 五级顺序 · `ToggleGroup`/`InputGroup`/`Field`/`Alert`/`Empty`/
`Skeleton`/`Spinner` 必用 · `Dialog`/`Sheet` 必带 Title · 覆盖层禁手写 z-index · 条件类 `cn()` ·
CLI-only 纪律）——沉淀副本见技能 `shadcn-ui-v4-adoption/references/official-skill-hard-rules.md`，
**M4b-1 design §2.2 为落地版引用**

## 3. 认证与会话（R4/R5）

### 3.0 认证能力 × 阶段归属（防跨里程碑重复提问与 plan↔design 漂移）

| 能力 | 阶段 | 状态 |
|------|------|------|
| 认证栈地基：本地账号 · Session · CSRF · RBAC 判定链 · LDAP 通道（**实现载体见下行**） | **M1 阶段一** platform-core | ✅ |
| OIDC 授权码流 · Device Flow（API）· API Token 签发-Bearer · 审计浏览 API | **M1 阶段二**（五板块） | ✅ |
| **认证栈实现载体**：官方 better-auth 整车（handler 挂 `/api/auth/*`）+ 自绘目录凭证插件 + 业务面同源守卫 | **M4b-pre** | ✅ |
| 登录页 `/login` · 会话上下文 · 登出 · 401 拦截 · 角色感知 | **M4b**（本里程碑，前端层） | ⬜ |
| 用户管理（列表/改角色/启停/建号）· 准入策略 `ACCESS_POLICY` · 重置密码 · 强制登出 | **M4c**「账号与权限治理」 | ⬜ |
| Device Flow 确认网页（设备授权页 `/device`，`user_code` 输入 + 认领/批准/拒绝） | **M4b-2**（2026-09-16 用户拍板；原「M4c 或 M5 CLI」口径作废） | ⬜ |
| 自助注册入口 | 后置（须先暴露 `REGISTRATION_ENABLED` 端点） | ⬜ |

依据：`docs/00` §5 M1 行（✅ 阶段一 + 阶段二五板块）· `docs/plans/M1-phase2.md:13-14`（**认证栈前置已就绪、本 plan 不改既有契约**）· 服务端认证面（M1 交付、**M4b-pre 已整体迁 better-auth**）：官方 handler 挂 `/api/auth/*` + 自绘目录凭证插件 `auth/plugins/ldap-credentials.ts`（`sign-in/aih`）+ 薄层 `http/auth-routes.ts:17-28`（`/me`）· M4b 零服务端改动；`docs/00` §5 **M4c 行**（2026-09-10 新增）。

### 3.1 登录页

- 路由 `/login`，独立于 AppShell 的居中版式（shadcn `Card` + `--primary` 标题——视觉值取 M4a §4.4）
- 通道：`POST /api/auth/sign-in/aih`（**M4b-pre 交付的自绘目录凭证插件**，三路分派：保留本地账号短路 → 目录 bind → 回退本地；05 §3.1）——本地账号与 LDAP 企业通道**共用同一入口**，前端**无需分支**
- OIDC：`GET /api/auth/oidc/authorize` 入口跳转（服务端授权码流已落地 M1 阶段二）——**实测路径（`http/oidc-routes.ts`，2026-09-16）**：未配置（默认 `OIDC_ENABLED=false`）→ **404 JSON `oidc.not_configured`**（authorize 与 callback 同）；callback state 缺失/不匹配 → `auth.oidc_state_mismatch`；授权被拒 / exchange 校验失败 / 建号失败 → `auth.oidc_denied`（`auth.email_missing`/`auth.email_conflict`/`auth.user_disabled`/`auth.user_pending` 四码透传）——**均为服务端 JSON 错误体（统一出口），不由前端承接回跳**；**成功 → 302 回落 `${PUBLIC_BASE_URL}/?oidc=success`**（服务端定死，**不经 `next`**）⇒ `/login` 只负责发起跳转。UI 友好化（未启用时的按钮前置提示 / 错误承接页）为 **M4b-2 批内决策项**（登记 §7.2 G6）
- 错误码本地化：`auth.*` 系列入 `errors` 资源组（07 §4）
- CSRF：写请求携 Origin——**M4b-pre T3 起交官方 origin 校验**（`trustedOrigins` 白名单）+ **业务面同源守卫** `http/origin-guard.ts`
  （自研 `csrfProtection` 中间件已删除）；dev 需配 `AUTH_TRUSTED_ORIGINS`（否则前端 cookie 写请求 403 `auth.csrf_failed`）

### 3.2 会话上下文

- 新增 `AuthProvider`（web 层）：应用启动拉 `GET /api/auth/me` → 注入 `{ user, role }`
- 未登录（401）→ 受保护路由重定向 `/login?next=<path>`；登录成功后回落 `next`
- 登出：`POST /api/auth/sign-out`（**官方端点**；M4b-pre T3 起为唯一登出端点，无旧别名）→ 清上下文 + 回首页
- 会话有效期：服务端 8h（05 §5，`SESSION_TTL_HOURS` 默认 8）——**M4b-pre T3 起官方 `session` 表落库**（重启不再全员登出），过期由任意请求 401 触发重定向

### 3.3 权限感知（R5 契约）

```
GET /api/auth/me     （requireAuth 语义不变——未登录仍 401 auth.session_expired）
  200 { user: { id, displayName }, role: number }
       role ∈ { 0 GUEST / 1 USER / 10 ADMIN / 100 SUPER_ADMIN }
         ——常量单源 `apps/server/src/auth/roles.ts` 的 `ROLE_LEVEL`（档名 ↔ 数值映射；`db/schema/users.ts` 已随 M4b-pre 删除）
       判定统一 role >= minRole（超管 100 天然覆盖全部，无短路分支）
```

- **由 M4-pre 交付**（`http/auth-routes.ts:17-28`）：M4b 直接消费，**零服务端改动**
- 向后兼容：既有字段 `user` 形状不变，仅增 `role`（M4a 门户未消费 `/me`，零影响）
- 角色分配无 UI（M4-pre P3）：靠 seed 首管理员 + 手工 SQL；M4b 不建用户管理页（**R3′ → 归 M4c**，§2.1）

### 3.4 设备授权页基址与 dev 口径（`/device`）

设备流页面地址由**服务端推导**，前端不自造：官方 `deviceAuthorization` 以 `env.PUBLIC_BASE_URL` 为
`baseURL`（`better-auth.ts:73`），`verificationUri` 缺省 `/device`（`better-auth.ts:140`）⇒ CLI 拿到的
`verification_uri` = `${PUBLIC_BASE_URL}/device`；`verification_uri_complete` 另带 `?user_code=`。

- **基址口径（2026-09-16 用户拍板 A）**：`PUBLIC_BASE_URL` **保持 API 源语义不变**——它同时是官方
  `baseURL`、OIDC 回调推导源与 `trustedOrigins` 自动项，**不为 dev 双源妥协**。
- **同类环境（生产）**：web 与 API 经同一反代同源 ⇒ `${PUBLIC_BASE_URL}/device` 即真实页面，无需处理。
- **dev 双源（API `:3000` / web `:5173`）**：`verification_uri` 指向 API 源下**不存在的页面** ⇒ 开发期以
  **web 源直达 + 手输/复制码**为准（`http://localhost:5173/device?user_code=XXXX-XXXX`）。
- **不采纳项（留痕）**：① dev 改 `PUBLIC_BASE_URL` 指向 web 源——会连带把 OIDC 回调带偏，须同时显式配
  `OIDC_REDIRECT_URL`，副作用大于收益；② API 侧代管该页——违反本里程碑「**零服务端改动**」（§2.2 R5）。
- 前端页面只需处理两种入参：带 `?user_code=`（直达，自动预填/预校验）或不带（手输）——见 §5.1 `/device` 行与 §12 线框。

## 4. 入口分层与显隐规则（R7）

**分层（2026-09-10 用户拍板 A）**：`/dashboard/*` **个人面**（所有登录用户）+ `/admin/*` **治理面**（角色限定）——
对标 skillhub（`pages/dashboard.tsx` 源码注释 "Default dashboard landing page for authenticated users" +
独立 `/admin/*` 三页）与 new-api（`section-registry` 的 `adminOnly` 标记 + `use-sidebar-view` 组级显隐）
两家共识：**个人事务与平台治理在导航上分组，个人事务绝不放进 admin**。空间域已随 M4-pre 删除，
个人面收敛为「我的资产 / 我的提交 / 我的令牌」三项，无空间角色判定 → 个人面显隐只需「已登录」，
治理面只需 `role >= 10`（M4-pre 交付的 `/me → role` 契约足够，零服务端改动）。

SideNav 在**既有门户组**（首页 `/` · 技能中心 `/skills` · MCP `/mcps` · 专家 `/agents`——M4a 交付；⚠️ **2026-09-17 起**：门户组**带组标题「门户」**、条目形态与三组统一 —— 见下方注）之上，新增**三组**
（**2026-09-16 用户拍板：两组 → 三组**），组级显隐 + 条目级 role 门槛
（机制同 new-api `use-sidebar-view`；Den 的「组内无可见条目 ⇒ 整组不渲染」同构）：
> **门户组组标题（2026-09-16 grilling「不加」⇒ 2026-09-17 用户拍板「加」）**：原拍板理由 = 保持 M4a 无标题平铺的「门户 = 一级入口 / 三组 = 登录后分区」语义，加标题会动门户面（违「零回归」硬约束）。**2026-09-17 用户直接拍板翻转**：加组标题「门户」（新键 `navigation.groupPortal`）⇒ 四组结构**同构**；同时 14 条衬底统一中性（资产类型色衬底撤除）。依据 = 批 design **v1.23**（§14.4 分组行 · §14.6 **P4/P7**）。
> **范围澄清（2026-09-17 用户拍板）**：上条的「零回归」约束**限于结构与文案**（组标题 / 条目文案 / 显隐门槛均不变）；**条目级形态**经用户拍板**统一**——门户 4 条由 **51px 双行**收敛为 **32px 单行**（图标槽统一 **22×22** 衬底 · 英文副标降级 hover tooltip），与三组 10 条逐项相同（实测 `uniqH=[32] uniqW=[162] uniqSlot=[22x22]`）。依据 = 批 design **v1.22** §14.4 C / §14.6 **P7**。

| 组 | 组级显隐 | 条目 | 条目可见条件 |
|----|---------|------|-------------|
| **门户**（M4a 既有，**保留**） | **恒显示**（未登录亦显示） | 首页 `/` · 技能中心 `/skills` · MCP `/mcps` · 专家 `/agents` | 任何访客 |
| **个人** | 已登录（未登录整组不渲染） | 工作台 `/dashboard` | 任何登录用户 |
| | | 我的资产 `/dashboard/assets` | 任何登录用户 |
| | | 我的提交 `/dashboard/submissions` | 任何登录用户 |
| | | 我的令牌 `/dashboard/tokens` | 任何登录用户 |
| | | **发布** `/dashboard/publish`（条目落 **M4b-8**；2026-09-18 拍板新增） | 任何登录用户 |
| **管理** | `role >= ADMIN`（10；未达整组不渲染） | 管理看板（占位条目 → 页面归 **M4b-6**；2026-09-17 拍板） | `role >= ADMIN`（10） |
| | | 审核队列 `/admin/reviews` | `role >= ADMIN`（10） |
| | | 审计浏览 `/admin/audit` | `role >= ADMIN`（10） |
| | | **资产管理**（全站资产治理 → 页面归 **M4b-6**；2026-09-18 拍板，见 §2.4 U8） | `role >= ADMIN`（10） |
| **超级管理** | `role >= SUPER_ADMIN`（100；未达整组不渲染） | 标签定义 `/admin/labels` | `role >= SUPER_ADMIN`（100） |
| | | 系统设置（占位条目：点击弹提示，不建页面） | `role >= SUPER_ADMIN`（100） |
| | | 用户管理（占位条目 → M4c） | `role >= SUPER_ADMIN`（100） |

> **显隐组合（表 / §12 线框 / 真码三向一致锚点）**：未登录 = 门户组 + 侧栏底部「登录」入口（三组全不渲染）
> **+ 顶栏「发布」入口**（**M4b-8** 起；未登录亦显示，点击 → 轻提示 + `/login?next=/dashboard/publish`；§12 顶栏线框随该批补）；`role = 1` = 门户 + 「个人」+ 用户菜单；`role = 10` = + 「管理」；`role = 100` = + 「超级管理」。

顶栏（**构成以真码为准**：`SidebarTrigger` + `Separator` + 页面标题 `<h1>` + 右侧 `LanguageSwitcher`
——`TopBar.tsx:82-92`，**品牌已移出顶栏**、落侧栏顶部 `SidebarHeader`；本行原「只留品牌 + …」表述为
v1.44 前的**旧漂移**，随本版订正）+ **「发布」入口**（2026-09-18 用户拍板，**归 M4b-8**；未登录点击 = 轻提示 toast + `/login?next=/dashboard/publish` 回跳）。**用户区落侧栏底部 `SidebarFooter`**（2026-09-16 用户拍板）——
未登录显示「登录」入口（`Link to="/login"`）；已登录显示用户菜单（官方 `Avatar` 首字 + displayName + 角色徽章 +
我的资产/我的令牌 + 登出）；**图标态（collapsed）只留头像**（`SidebarMenuButton size="lg"` + 官方 tooltip，仅收起态显示）。
侧栏底部**移除**产品元信息三项（Star on GitHub / 文档·反馈 / 版本号行）。

> 显隐是**体验优化**而非安全边界——所有判定以服务端权限为准（服务端已全量覆盖，§7.1）。
> 组级显隐与条目级门槛同取 `role >= N` 线性判定（M4-pre §2.2）；超管 100 天然覆盖全部，无短路分支。
>
> **直访行为（守卫落点，实现契约定死）**：直接访问 `/admin/*` 而权限不足 → `RoleGuard` 拦截：
> 未登录 → `/login?next=<path>`；已登录但 `role < 10` → **重定向 `/dashboard`** + 轻提示
> 「该页面需要管理权限」——不渲染管理页内容。服务端各端点仍独立判定（403 `auth.forbidden` /
> `review.access_denied`），前端守卫只是体验层，双保险不依赖它生效。

## 5. 页面结构与路由（R7）

### 5.1 页面职责矩阵（环节 0 一页纸——「这页干什么、谁用、点哪、调什么」）
> **归属批（2026-09-14 拆批）**：`/login` → **M4b-2** · `/dashboard` → **M4b-4** · `/dashboard/assets` → **M4b-4** · `/dashboard/submissions` → **M4b-3** · `/dashboard/tokens` → **M4b-3** · `/reviews/:id` → **M4b-5** · `/admin`（重定向）与 `/admin/reviews` → **M4b-5** · `/admin/labels` → **M4b-6** · `/admin/audit` → **M4b-6** · `/dashboard/publish` → **M4b-8**


| 路由 | 页面职责 | 用户 | 关键动作 | 主要接口 |
|------|---------|------|---------|---------|
| `/login` | 认证 | 未登录 | 本地/LDAP 登录 · OIDC 入口跳转 | `POST /api/auth/sign-in/aih` · `GET /api/auth/oidc/authorize` |
| `/dashboard` | 工作台 landing | 任何登录用户 | 三项计数卡 → 跳对应列表（`role < 10` 只发「我的资产」1 个请求） | `GET /api/reviews?status=PENDING&limit=1` · `GET /api/me/assets?status=ALL&limit=1` · `GET /api/audit?limit=5` |
| `/dashboard/assets` | 我的资产（**我名下的资产**，含全部状态——2026-09-18 修正；管理档全站治理见 §2.4 U8） | 任何登录用户 | 列表（**9 列**）· **点操作列图标钮直跳完整详情页** · **管理动作全在资产详情页 owner 管理区**（2026-09-18 原型评审改写）· **收藏 / 取消收藏** | `GET /api/me/assets`（R6 新增）· **`PUT`/`DELETE /api/assets/:slug/star`** · `PATCH /:slug/status` · `PUT`/`DELETE /:slug/labels/:labelSlug` · `DELETE /:slug/versions/:version` · `POST /:slug/versions/:version/yank` · `DELETE /:slug` |
| `/dashboard/submissions` | 我的提交 | 任何登录用户 | 看自己的提审 · **撤回**（仅本人/owner/管理档） | `GET /api/reviews/mine` · `POST /api/reviews/:id/withdraw` |
| `/dashboard/tokens` | 我的令牌 | 任何登录用户 | 创建（明文仅一次）· **编辑（改名 + 改权限）** · 删除 | `GET`/`POST /api/tokens` · **`PATCH`**/`DELETE /api/tokens/:id` |
| `/dashboard/publish` | 发布（**新建资产 + 上传版本 + 提审**）→ **M4b-8** | 任何登录用户 | 新建资产（`slug`/`type`）· 单 zip 上传（XHR 进度）· 上传后**手动**「提交审核」· 撤回 | `POST /api/assets` · `POST /api/assets/:slug/versions` · `POST /api/assets/:slug/versions/:version/submit` |
| `/reviews/:id` | 审核详情（**共享路由**） | 管理档 ∨ 提交人本人 | manifest 分型卡 + 文件树 + 预览 · 通过/拒绝/撤回 | `GET /api/reviews/:id` · `GET /api/assets/:slug/versions/:version/files/*` · `POST /api/reviews/:id/approve`／`reject`／`withdraw` |
| `/admin` | 重定向 | 管理档 | → `/admin/reviews`（治理面无 landing） | — |
| `/admin/reviews` | 审核队列（全站单队列） | `role >= 10` | 状态过滤 · 分页 · 进详情 | `GET /api/reviews?status=` |
| `/admin/labels` | 标签定义 | 超管（100） | 两级树 CRUD · 翻译（zh-CN/en）· 上/下移排序 | `GET /api/labels/all` · `POST`/`PATCH`/`DELETE /api/labels` · `PUT /api/labels/order` |
| `/admin/audit` | 审计浏览 | `role >= 10` | 八维过滤 · 分页 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=` |
| `/device` | 设备授权确认（CLI 设备流） | 任何登录用户 | 输入/校验 user_code → 认领 → 批准 / 拒绝 | `GET /api/auth/device?user_code=` · `POST /api/auth/device/approve`／`deny` |

> **入口可见性（谁在导航上看得到）以 §4 为唯一源**；本节只定义页面职责与数据来源（防两处漂移）。
> `/device` 的**页面基址与 dev 口径**见 §3.4（引用不复制）。

### 5.2 路由清单（除 `/login` 外均在既有 AppShell 的 `<Outlet/>` 区）
> **归属批（2026-09-14 拆批）**：同 §5.1 逐行映射（登录 → M4b-2；submissions/tokens → M4b-3；dashboard/** → M4b-4；审核两路由 → M4b-5；labels/audit → M4b-6；`/dashboard/publish` → **M4b-8**）


```text
/login                        登录（独立版式，不进 AppShell 分组）
/device                       设备授权确认（独立版式；`?user_code=` 或手输）
/dashboard                    个人工作台 landing（角色感知卡片——§7.3 编排）
/dashboard/assets             我的资产：列表 + 状态筛选（点图标 → 详情页）
/dashboard/submissions        我的提交：列表 + 撤回
/dashboard/tokens             我的令牌：列表 + 签发 + 吊销
/dashboard/publish            发布：新建资产 + 单 zip 上传（进度）+ 手动提审（M4b-8）
/reviews/:id                  审核详情（共享：管理档自队列进、提交人自我的提交进）
/admin                        → 重定向 /admin/reviews
/admin/reviews                审核队列
/admin/labels                 标签定义
/admin/audit                  审计浏览
```

- **M4b-6 待补（2026-09-18 登记）**：治理面「**资产管理**」页（全站资产治理；侧栏「管理」组新条目，
  见 §4 / §2.4 U8）—— 路由路径与页面形态待该批对齐时定，故本清单暂不列该行（**已知缺口，非漏项**）
- 除 `/login` 外全部挂在既有 `AppShell` 下（`components/ui/AppShell.tsx` 的 `<Outlet/>` 区），
  M4a 五路由零改动
- **审核详情为共享路由**（不进 `/admin` 段）：`GET /api/reviews/:id` 的授权面本身就是
  「管理档 ∨ 提交人本人」（`http/reviews.ts:89-98`）——若挂在 `/admin` 段，提交人（`role < 10`）
  将被组级守卫挡住，而撤回动作恰恰只有提交人/owner/管理档可执行 → **撤回在 UI 上不可达**
  （v1.0 单层方案的隐性缺陷即源于此）
- query 状态 URL 化（**复用扩展** M4a `useMarketQuery`：参数化 `status` 维度，
  `?status=`/`?q=`/`?page=`；**不新建 hook**，语义同构——§6.3）
- **响应式断点（写在路由段——对齐 M4a 范本特质）**：控制台表格 <1100px → 容器**横向滚动**
  （保留列完整，不做卡片化——控制台列信息密度优先）；抽屉 <1100px → 全宽侧滑；
  SideNav <900px 折叠为图标态（沿用 M4a 断点体系）
- 抽屉/对话框状态不进 URL（次要状态，同 M4a 版本对比对的处置）

## 6. 前端架构与组件树

### 6.1 依赖（v1.3：样式体系**引用** M4a §4.1，不复制）

**样式/组件栈 = M4a design §4.1 + §4.4（引用不复制）**：Tailwind v4 + shadcn CLI（base=radix）+
`cn` / `class-variance-authority` / `radix-ui` / `lucide-react` / `sonner` / `next-themes`；shadcn
组件以源码落仓 `src/components/ui/shadcn/`；token 值一律取 §4.4（**本文件不得复制色值/字阶**）。
M4b 在**已换皮的门户体系**上生长（M4a 视觉体系切换先行）→ **无双栈混搭期**、无 CSS Modules 残留。

**版本锚**：`react-router-dom@7.18.3` / `react-markdown@10.1.0` / `remark-gfm@4.0.1`（M4a plan 锁定）
+ M4a 换皮实际锁定的 Tailwind / shadcn 版本（以 M4a `bun.lock` 为准）。**不引入任何 diff 相关依赖**
——审核面首期不提供行级 diff（§6.3），`VersionCompare` 与 Diff 组件群留在 market 面不动。

**控制台面特有依赖 = 无**：表格 / 抽屉 / 对话框 / 下拉 / 徽章 / 轻提示全部由 shadcn 原语覆盖
（`Table` · `Sheet` · `Dialog` · `Select` · `DropdownMenu` · `Badge` · `Sonner` · `Skeleton`）。

**验证策略（2026-09-10 锁定）**：沿用 M4a——`typecheck` + **SSR 渲染冒烟**（`docs/smoke/scripts/`，
断言权限显隐 / 空态 / 表格行渲染）+ Edge headless dogfood。**不建 vitest / testing-library**。

### 6.2 组件树（新增面）

```text
src/
├── auth/                      新增
│   ├── AuthProvider.tsx       /me 上下文（user + role）+ 401 拦截 + login/logout
│   └── roles.ts               角色判定单点（`ROLE` 常量 + `hasRole`；`null` → false）——禁页面散写 `role >= N`
├── api/                       新增 auth.ts / console.ts（ep 分组）+ 既有 client 复用
│   ├── auth.ts                login · logout · me
│   └── console.ts             me/assets · reviews · labels · tokens · audit
├── hooks/useMarketQuery.ts    扩展（**不新建**）：参数化 status 维度——市场面与控制台面共用（§6.3）
├── components/ui/             跨面基础件（既有 + shadcn 原语目录）
│   ├── shadcn/                ← shadcn CLI 落仓目录（Table/Sheet/Dialog/Select/DropdownMenu/
│   │                            Badge/Card/Input/Switch/Skeleton/Sonner/Tooltip/Tabs…；**与既有
│   │                            PascalCase 原子件同目录但大小写分离**——`badge.tsx` vs `Badge.tsx`）
│   ├── Toaster.tsx            轻提示 = shadcn `Sonner` 封装（写操作成功/失败反馈——§9；全局单例挂 App）
│   ├── SkeletonLoader.tsx     载态骨架 = shadcn `Skeleton` 组合（表格/详情载态——优于 Spin 空屏）
│   ├── RoleGuard.tsx          角色级守卫（`minRole=USER` 即「已登录守卫」——**不单建 RequireAuth**，2026-09-16 拍板；`role >= N` 判定，§4 显隐的守卫版）
│   ├── CopyButton.tsx         复制（令牌明文/资产坐标/sha——明文场景关闭即清）
│   ├── UserMenu.tsx           用户区（侧栏底部：未登录「登录」入口 / 已登录用户菜单——2026-09-16）
│   ├── FileTree.tsx           ← 自 components/market/detail/ 迁入（§6.3；本体零改动）
│   └── FilePreviewDialog.tsx  ← 自 components/market/detail/ 迁入（§6.3；本体零改动）
├── components/console/        新增面域（个人面 + 治理面共用）
│   ├── PageHeader.tsx         页头（标题 + 副述 + 右侧动作槽）
│   ├── DataTable.tsx          通用表格 = shadcn `Table` 封装（列定义驱动 + 空/载/错态 + 行内动作槽）
│   ├── Drawer.tsx             右侧抽屉 = shadcn `Sheet` 封装（宽 **560**——2026-09-14 落值，§10.1）
│   ├── ConfirmDialog.tsx      危险操作确认（HIDDEN/ARCHIVED/删除/yank/吊销前）
│   ├── StatusPill.tsx         资产/版本状态徽章（色值取 M4a §4.4 ② 补丁 token——不复制）
│   ├── FilterBar.tsx          筛选条（状态下拉 + 关键词）
│   ├── reviews/               ReviewQueue.tsx · ReviewDetail.tsx · ReviewActions.tsx
│   ├── labels/                LabelTree.tsx · LabelForm.tsx · LabelTranslations.tsx
│   ├── assets/                AssetAdminTable.tsx · AssetVersionList.tsx（~~AssetDrawer.tsx~~ —— v1.53 抽屉取消）
│   ├── tokens/                TokenTable.tsx · TokenIssueDialog.tsx · TokenRevealDialog.tsx
│   ├── ComingSoon.tsx         占位页（官方 `Empty` + 中性文案；DEV 下小字标批次号）——承载 9 条占位路由 + `/dashboard` 临时落地页（**同件不同 props**）
│   └── audit/                 AuditTable.tsx · AuditFilters.tsx · AuditActionSelect.tsx
│                              （action 过滤用**分组下拉**而非自由输入——防拼错；值清单见 §7.3）
└── pages/                     路由页（薄装配）
    ├── Login.tsx              /login（独立版式）
    ├── Device.tsx             /device（设备授权确认；独立版式）
    ├── dashboard/             Dashboard.tsx（工作台 landing）· MyAssets.tsx ·
    │                          MySubmissions.tsx · MyTokens.tsx
    ├── reviews/               ReviewDetail.tsx（共享详情）
    └── admin/                 Reviews.tsx（队列）· Labels.tsx · Audit.tsx
```

### 6.3 复用与升级边界

- **直接复用**（`components/ui/`，零改动）：AppShell ·
  Badge · Pagination · Spinner · EmptyState · ErrorState · MarkdownRenderer · AssetAvatar ·
  LanguageSwitcher（`FileTree`/`FilePreviewDialog` **不在本列**——见下条迁移项）
- **改造件**（复用载体 + 按 §2.4 U1 施工，**非零改动**——2026-09-16 订正：原「零改动」清单误列）：
  `TopBar`（**删**产品元信息三项与 `TypeIcon` 残留 → 最终形态 = `SidebarTrigger` + `Separator` + 页面标题 `<h1>` + 右侧 `LanguageSwitcher`——**构成以真码为准**（`TopBar.tsx:82-92`；品牌已移出顶栏、落侧栏顶部 `SidebarHeader`）；**M4b-8** 再追加「发布」入口，见 §4）·
  `SideNav`（**在既有门户组之上**新增「个人」/「管理」/「超级管理」三组 + 组标题 + 侧栏底部用户区；
  同时移除 `APP_VERSION` 死常量（`SideNav.tsx:18-19`）与产品元信息三项）
- **升级到 ui/**（跨面复用确认）：`FileTree` 与 `FilePreviewDialog` 在 M4a 位于
  `components/market/detail/`——M4b 审核详情需同款能力，**迁移到 `components/ui/`**
  （M4a design §4.2 已预留该复用意图：FileTree「M4b 审核复用」、FilePreviewDialog「M4b 复用」）
  ——**迁移影响面**：组件本体零改动，仅需同步更新唯一引用方 `market/detail/FilesTab.tsx:5,7`
  （import 路径），M4a 路由与页面行为不变
- **hook 复用扩展（不新建）**：`useMarketQuery`（M4a）**参数化扩展 `status` 维度**，市场面与控制台面
  共用——两者语义同构（URL query ↔ 状态 + 防抖 + 筛选变更 page 回落 1），差异只是维度集合；
  一套 hook 免双份漂移（v1.0/v1.1 拟新建 `useAdminQuery`/`useConsoleQuery`，本版取消）
- **仍留 market 面**：`VersionCompare` + Diff 组件群——M4a design 原文「审核侧若需行级 diff
  M4b 再升 ui」；M4b 审核详情**首期不提供行级 diff**（审核决策所需的核心是文件清单 +
  内容预览 + manifest，diff 属消费者阅读体验），故不迁移、不改动
- **新增组件按「跨面 vs 面域」二分落位**：
  · `components/ui/` —— **跨面基础件**（任何面都可能用）：`Toaster`（全局单例挂 App）·
    `SkeletonLoader` · `RoleGuard` · `CopyButton` ＋ §6.3 迁移项（`FileTree`/`FilePreviewDialog`）
  · `components/console/` —— **M4b 控制台面专属形态**（页头/表格/抽屉/确认/状态徽章/筛选条 +
    各域子目录），与 M4a `components/market/` 同构（面级目录）；后台形态变化不牵动门户
  —— 二分规则取代 v1.0 的「一律落 admin/」：分层后个人面与治理面**共用同一批控制台组件**，
  留在 `admin/` 会造成「个人面的组件住在 admin 目录」的语义错位

### 6.4 规模预估

11 条路由条目（含 1 重定向 + 2 独立版式 `/login` / `/device`）+ ~26 新组件 + 1 provider + 2 i18n 资源组（`login`/`device`；M4b-1 已落 `dashboard`/`admin`/`review` 骨架）
（hook 为扩展非新建），≈ 2600-3200 行（含样式），单文件 ≤200 行。

## 7. API 消费面

### 7.1 复用端点实测契约表（全部经源码核对；业务面 2026-09-10 · 认证面 2026-09-16 重核）

| 功能 | 端点 | 权限 | 关键响应形状 | 源码依据 |
|------|------|------|-------------|---------|
| 审核队列 | `GET /api/reviews?status=&limit=&offset=` | 管理档 `role >= ADMIN`（**全站单队列**，无空间过滤参数；不足 → 403 `review.access_denied`） | `{items:[{taskId,status,reviewVersion,submittedBy,submittedAt,assetSlug,assetVersion,versionStatus,versionId}],total,limit,offset}` | `http/reviews.ts:46-66` · `review/query.ts:24-44` |
| 我的提交 | `GET /api/reviews/mine?status=&limit=&offset=` | 登录（身份面） | 同上 items 形状 + **`reviewComment` / `assetType`**（M4b-3 加性） | `http/reviews.ts:69-86` |
| 审核详情 | `GET /api/reviews/:id` | 管理档 ∨ 提交人本人（否则 403 `review.access_denied`；不存在 404 `review.not_found`） | `ReviewListItem + {manifestJson, files:[{filePath,fileSize,sha256}]}` | `http/reviews.ts:89-98` · `review/query.ts:46-50` |
| 通过/拒绝 | `POST /api/reviews/:id/approve`（`{comment?}`）· `POST /:id/reject`（`{comment}` 必填） | 管理档 `role >= ADMIN` + 防自审（05 §6.4，超管例外）；token scope `review:approve`（`auth/token-scopes.ts:17`） | 200 `{taskId,status,version}` | `http/reviews.ts:101-143` · `auth/rbac.ts:70` |
| 撤回提审 | `POST /api/reviews/:id/withdraw` | 提交人本人 / asset owner / 管理档（服务内判定） | 204 | `http/reviews.ts:146-160` |
| 标签公开列表 | `GET /api/labels` | 匿名 | `Label[]`（displayName 回退 Accept-Language→en→slug） | `http/labels.ts:65-69` |
| 标签全量 | `GET /api/labels/all` | `role >= SUPER_ADMIN` | `ManagedLabel[]`：`{id,slug,type,visibleInFilter,sortOrder,parentId(父 slug),translations:[{locale,displayName}]}` | `http/labels.ts:72-75` |
| 标签 CRUD | `POST /api/labels` · `PATCH /api/labels/:slug` · `DELETE /api/labels/:slug` | `role >= SUPER_ADMIN` | 同上单条；slug 冲突 → 409 `label.slug_taken`；**定义总数上限 100** → `label.definition_limit_exceeded`；删除带子级 → `label.parent.has_children`（三码见 `labels/errors.ts:9,11,19`） | `http/labels.ts:77-121` |
| 标签排序 | `PUT /api/labels/order` | `role >= SUPER_ADMIN` | 204 | `http/labels.ts:123-131` |
| 标签挂载 | `PUT`/`DELETE /api/assets/:slug/labels/:labelSlug` | RECOMMENDED = `canManageAsset`（owner 本人 ∨ `role >= ADMIN`）；PRIVILEGED = 超管 | 幂等（重复挂 204 / 移除不存在 204）；≤10 → `label.limit_exceeded` | `http/assets.ts:709-763` · `assets/manage.ts:19-22` |
| 令牌列表 | `GET /api/tokens` | 登录（仅本人） | `{items:[{id,scope,expiresAt,revokedAt,createdAt,`**`name`**`,`**`start`**`,`**`tail`**`,`**`lastRequest`**`}]}`（M4b-3 加性；库中仍仅 sha256，**`start` = 明文前 12 位**（官方写入）· **`tail`** 自 `metadata.tail` = 明文后 4 位（签发时记） ⇒ 仅够掩码展示） | `http/tokens.ts:87-102` |
| 令牌签发 | `POST /api/tokens`（`{scope?:string[], expiresInDays?, `**`name?`**`}`） | 登录 | 201 `{id,token,expiresAt}`——**明文仅此一次** | `http/tokens.ts:41-82` |
| **令牌编辑（M4b-3 新增）** | **`PATCH /api/tokens/:id`**（`{name?, scope?}`） | 本人（他人视同 404 防枚举，同 DELETE 口径） | 200 单条 `ApiKeyRow`；透传官方 `updateApiKey`（原生支持 `name` + `permissions`）；审计 **`token.update`** | 本批新增 |
| 令牌吊销 | `DELETE /api/tokens/:id` | **仅本人**（**v1.34**：`SUPER_ADMIN` 分支已收回——令牌彻底私有，对齐 `05 §5`；他人**含超管**视同 404 防枚举）；幂等 204 | 204 | `http/tokens.ts:98-126` |
| 审计 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=&limit=&offset=` | 管理档 `role >= ADMIN`（token scope `audit:read` 交集） | `{items:[audit_log 全列],total,limit,offset}`，createdAt desc + id desc 稳定分页 | `http/audit.ts:45-55` |
| 公开统计 | `GET /api/stats` | 匿名 | 公开聚合（活跃资产计数等） | `http/stats.ts:11-14` |
| 资产列表 | `GET /api/assets?limit=&offset=&type=&q=&label=&sort=&dir=` | **匿名**（读面恒「活跃资产」面，与 viewer 无关） | `{items:AssetItem[],total,limit,offset}`；项含 latest 投影 + ownerDisplayName | `http/assets.ts:75-83,256-283` · `assets/service.ts:173-177` |
| 资产注册 | `POST /api/assets`（`{slug,type}`） | 登录（`role >= USER`；token scope `asset:publish`） | 201 单条 AssetItem | `http/assets.ts:92-95,221-253` |
| 资产详情 | `GET /api/assets/:slug` | ACTIVE 匿名；非 ACTIVE **当前仅超管**（其余含 owner/管理档同 404 `asset.not_found`）——**R6-b 后扩为授权集，见 §7.2** | AssetItem + `labels[]`（**v1.8：元素改结构体 `{slug,type,displayName,parentId}`**） | `http/assets.ts:163-176,290-299` |
| **收藏** | `PUT /api/assets/:slug/star` | **任何登录用户**（社交动作，**不受 `canManageAsset`**）；前置 `assertAssetReadable`（授权集外 404） | `{ starCount, starred: true }`（**幂等**） | **M4b-4（v1.8）** `assets/stars.ts` · `http/assets.ts` |
| **取消收藏** | `DELETE /api/assets/:slug/star` | 同上 | `{ starCount, starred: false }`（**幂等**） | 同上 |
| 版本列表 | `GET /api/assets/:slug/versions?limit=&offset=` | 资产读面前置 + 未公开族授权过滤（DRAFT 仅授权集可见） | `{items:[{id,version,status,fileCount,totalSize,changelog,createdAt}],total,limit,offset}` | `http/assets.ts:304-315` |
| 版本详情 | `GET /api/assets/:slug/versions/:version` | 授权集（owner/上传者/管理档/超管）全见，其他仅 PUBLISHED；无预览权 400 `asset.version_not_published` | 单版本（含 manifest 投影 + 文件清单） | `http/assets.ts:346-355` · 08 §7 |
| 版本对比 | `GET /api/assets/:slug/versions/compare?from=&to=` | 匿名（ACTIVE 读面） | `{files:[…]}` | `http/assets.ts:320-340` |
| 文件内容 | `GET /api/assets/:slug/versions/:version/files/*` | 下载判定同语义（PUBLISHED 公开 / 预览集 / YANKED 400） | 文件内容 | `http/assets.ts:360-379` |
| 包下载 | `GET /api/assets/:slug/versions/:version/download` | 五档判定；限流 60/分·IP；S3 302 直链 / Local 200 流 | zip 字节流 | `http/assets.ts:770-824` |
| 状态治理 | `PATCH /api/assets/:slug/status`（`{status}`） | `canManageAsset`（owner 本人 ∨ `role >= ADMIN`）+ token scope `asset:manage` | 单条 AssetItem | `http/assets.ts:383-416` · `assets/manage.ts:19-22` |
| 版本上传 | `POST /api/assets/:slug/versions`（multipart） | `canManageAsset`（owner ∨ 管理档）+ scope `asset:publish`；限流 10/分·用户 | 201 版本 | `http/assets.ts:473-551` |
| 版本删除 | `DELETE /api/assets/:slug/versions/:version` | 管理档删 DRAFT/SCAN_FAILED/REJECTED/UPLOADED；上传者本人删 DRAFT/SCAN_FAILED；scope `asset:manage` | 204 | `http/assets.ts:558-611` |
| 提审 | `POST /api/assets/:slug/versions/:version/submit` | owner 本人 / 上传者本人 / 管理档（`canSubmitReview`）+ scope `review:submit` | 201 `{taskId,reviewVersion,status}` | `http/assets.ts:617-665` |
| 版本撤回 | `POST /api/assets/:slug/versions/:version/yank`（`{reason}` 必填） | 管理档 `role >= ADMIN`（治理最严面）+ scope `asset:manage` | 200 `{status:'YANKED',latestVersionId}` | `http/assets.ts:671-703` |
| 资产删除 | `DELETE /api/assets/:slug` | `canManageAsset`（owner ∨ 管理档）+ scope `asset:manage`；有 PUBLISHED → 400 `asset.has_published`；有 YANKED → 400 `asset.has_yanked` | 204 | `http/assets.ts:421-467` |
| 登录/登出/当前用户 | `POST /api/auth/sign-in/aih` · `POST /api/auth/sign-out` · `GET /api/auth/me` | — | me = `{user:{id,displayName}, role}`（§3.3） | `http/auth-routes.ts:17-28` |
| 设备授权·认领 | `GET /api/auth/device?user_code=`（**带会话**） | 登录（会话） | 200 `{user_code,status:'pending',client_id,scope}` | `app.ts:145-185`（官方 `deviceAuthorization` 直通）· `http/device-flow.test.ts:156-165` |
| 设备授权·批准 | `POST /api/auth/device/approve`（`{userCode}`） | 登录（会话）；**须先认领**，否则 400 `DEVICE_CODE_NOT_CLAIMED` | 200 `{success:true}` | `better-auth.ts:142` · `app.ts:148-171`（审计 `device.approve`） |
| 设备授权·拒绝 | `POST /api/auth/device/deny`（`{userCode}`） | 登录（会话） | 200 `{success:true}` | 同上（审计 `device.deny`） |

> **设备流其余两端为 CLI 侧**（`/device` 页不消费）：`POST /api/auth/device/code`（`{client_id}` **必填**）→ `{device_code,user_code,verification_uri,verification_uri_complete,expires_in,interval}`（snake_case）；`POST /api/auth/device/token`（`{device_code}`）→ `{access_token,token_type:'Bearer',expires_in,scope}`。**轮询错误族**：`authorization_pending` / `slow_down` / `expired_token` / `access_denied` / `invalid_grant`（官方 OAuth 设备流语义；`http/device-flow.test.ts:23-30`）。
>
> 错误契约统一 `{code,message}`（07 §4；`app.ts:101-119` 统一出口）；前端 `errors` 资源表按
> code 映射（未命中兜底）。**注意**：可见性删除后读面**无 403 出口**——ACTIVE 即公开、
> 非 ACTIVE 走 404（`asset.access_denied` 已不存在）。

### 7.2 契约缺口与处置（R6 系列）

**缺口清单（G 段——呈请编号；对标 M4a design §5.1/§5.2 的「G 呈请 → R 处置」两段式）**：

| # | 缺口 | 处置 |
|---|------|------|
| G1 | 非 ACTIVE 资产不进任何列表（匿名/owner/管理档/超管一致——`listViewableAssets` 硬条件 `status='ACTIVE'`） | R6：新增「**我名下的资产**」读面（2026-09-18 修正为 owner-only） |
| G2 | HIDDEN/ARCHIVED 详情**仅超管**可读（owner 与 管理档 同 404） | R6-b：读面授权集分层扩展 |
| G3 | 列表无 owner / status 过滤参数（`?ownerId`/`?owner`/`?status` 被 zod 静默忽略） | R6：新端点带 status 过滤；公开面契约不动 |
| G4 | 前端无从感知角色档位 | **已由 M4-pre 闭环**——`/me` 现返 `role`（`http/auth-routes.ts:17-28`），前端直接按 `role >= N` 显隐；重构前拟的「平台角色数组」方案（R5）随之废弃 |
| G5 | **设备授权页契约未入本表**（本页 §5.1/§11/§12 三处指向 §7.1，但原表无 device 行——2026-09-16 查出） | **已补**：§7.1 增「设备授权·认领/批准/拒绝」三行 + CLI 两端与轮询错误族注（2026-09-16） |
| G6 | **OIDC 通道成败路径与 `/login` 前端约定的缺口**：未配置 → JSON 404 `oidc.not_configured`（非跳转）；回调失败 → JSON 错误体（`auth.oidc_state_mismatch` / `auth.oidc_denied` 等）；成功 → 服务端 302 `${PUBLIC_BASE_URL}/?oidc=success`（**不经 `next`**）——而 U2 拍板「OIDC 恒显示」+「登录成功后回落 `next`」 | ✅ **已决（2026-09-16 grilling）**：**B+ 新标签页直跳**（`<a target="_blank" rel="noreferrer">`）——未配置时 404 JSON 落在**可关闭的独立标签页**，不破坏登录页；**不做前置探测**（`GET /authorize` 有写 state cookie 副作用，本批不为此加复杂度）；显式口径：**`next` 对 OIDC 通道不适用**（服务端定死 `/?oidc=success`） |

**缺口实证（2026-09-10 重核，源码实证为主）**：

- 列表面：`listViewableAssets` 硬编码 `eq(asset.status, 'ACTIVE')`（`assets/service.ts:177`）
  → HIDDEN/ARCHIVED 资产不进任何列表
- 详情面：`assertAssetReadable` 在超管短路后判定 `status !== 'ACTIVE' → 404 asset.not_found`
  （`http/assets.ts:163-176`）→ owner 本人亦 404（既有测试 `assets.test.ts:421` 已固化
  「HIDDEN 资产：登录用户 404；SUPER_ADMIN 200」）
- 过滤面：`listQuerySchema`（`http/assets.ts:75-83`）无 owner / status 参数
  （`?ownerId=`/`?owner=`/`?status=` 被静默忽略）
- 恢复通道**已存在**：`PATCH /:slug/status` 走 `loadAssetBySlug`（按坐标取，不判 status）+
  `assertManageable` → owner 可直接恢复，**无需先读详情**（`http/assets.ts:383-416`）

**处置 R6：新增「我名下的资产」读面**（2026-09-18 修正为 owner-only —— 原「我可管理的资产」措辞作废，见下方集合语义）

```
GET /api/me/assets?status=ACTIVE|HIDDEN|ARCHIVED|ALL&q=<kw>&limit=&offset=&sort=&dir=
  （requireAuth；默认 status=ACTIVE、limit=20、offset=0；`sort`/`dir` 与公开面**同参数、同默认、同回落**）
  200 { items: AssetItem[], total, limit, offset }
```

- **集合语义** = **我名下的资产**（`asset.ownerId` = 当前用户）——**2026-09-18 用户拍板修正**：
  原「我可管理的资产（`canManageAsset`（`assets/manage.ts:19-22`）同源：owner ∪ `role >= ADMIN` 全站）」
  与页面名不符（个人面语义 = 「我拥有的」，不是「我能管的」）
- **含全部状态**（ACTIVE / HIDDEN / ARCHIVED）：非 ACTIVE 不进公开列表 ⇒ 本面是 owner 找回并恢复
  自己隐藏资产的**唯一 UI 入口**（G1 的本意）
- **管理档的全站资产治理不在本面**：另落治理面（§2.3 M4b-6「资产管理」子项 · §2.4 U8）——
  服务端 `canManageAsset`（05 §6.4「管理他人资产 = 管理+」）能力不变，本项只是 **UI 入口分工**
- **status 语义**：`ACTIVE` 正常活跃面；`HIDDEN`/`ARCHIVED`/`ALL` 返回授权集合内的对应状态
  （同一集合内按 status 过滤，无额外权限分支——授权已在集合层收敛）
- 响应项复用既有 `assetItem` 形状（含 `latestVersion`/`latestName`/`latestDescription`/
  `ownerDisplayName`）——前端表格零适配
- **公开面 `GET /api/assets` 零改动**（对标 skillhub：公开搜索面保持无 status 参数的干净契约）
- **坐标一致性**：资产坐标为全局唯一裸 `slug`（M4-pre §2.3）——端点无空间段参数

**处置 R6-b：读面授权集扩展（详情面）**

- `assertAssetReadable`（`http/assets.ts:163-176`）的 `status !== 'ACTIVE' → 404` 改为
  **授权集分层**：非 ACTIVE 时，若 viewer ∈ {owner 本人，`role >= ADMIN`（管理档），超管}
  → 放行；其余（含匿名、其他用户）**维持 404**（不泄露存在性对"外部人"依然成立）
- **口径说明（2026-09-18）**：本项**不随** R6 列表面的 owner-only 修正而收窄 ——
  R6 列表面是**集合范围**（我的资产 = 我名下），本项是**按坐标读单个非 ACTIVE 资产**的授权；
  管理档需能读他人非 ACTIVE 资产才能治理（05 §6.4「管理他人资产 = 管理+」）。**两者是不同面，勿混同**
- 同时作用于该端点族：`GET /api/assets/:slug` · `.../versions` · `.../versions/:version` ·
  `.../files/*` · `.../download` · `.../versions/compare`（同一 `assertAssetReadable` 前置链，
  单点修改全体生效；下载面沿用 YANKED 400 等既有语义）
- **规范影响**：本项修改 05 §6.4 现行的「非 ACTIVE 读面仅超管」行 + 08 §7 读面注记
  → 列入 §14 规范同步项
- **测试影响（需求变更驱动，非弱化契约）**：`assets.test.ts:421`
  「HIDDEN 资产：登录用户 404；SUPER_ADMIN 200」按新授权集更新为
  「owner 200 / 管理档 200 / 非授权登录用户 404 / 匿名 404」；**新增对照断言**：管理档与
  outsider 两档（授权集全覆盖）。**不受影响**：`stats.test.ts`（HIDDEN 不计入公开统计——
  公开聚合语义未变）

### 7.3 页面数据编排
> **归属批（2026-09-14 拆批）**：工作台 `/dashboard` 编排 → **M4b-4** · 列表页通用约定 → 跨批 · 审核详情 → **M4b-5** · 资产管理（含懒加载版本列表）→ **M4b-4** · 审计页八维过滤 → **M4b-6** · dogfood 数据需求 → **M4b-4 起**


- 工作台 `/dashboard` landing：并发 3 请求（`/api/reviews?status=PENDING&limit=1` 取 total ∥
  `/api/me/assets?status=ALL&limit=1` 取 total（含隐藏/归档 —— 与 **U4 拍板**一致：**省略「含 N 隐藏」副文案**；线框该副文案已随本批订正，见 §12）∥
  `/api/audit?limit=5`）——**按角色裁剪**（`role < 10` 不发审核/审计两请求，避免必然 403；
  只渲染「我的资产」卡）
- 列表页：单请求 + `useApi` 语言感知缓存；筛选变更 → 重置 offset=1 页（沿用 M4a 修复录
  「筛选/搜索 page 回落 1」纪律）
- 审核详情：单请求（`GET /api/reviews/:id` 已含 manifest + 文件清单）→ 文件点击经既有
  `GET .../versions/:version/files/*` 拉内容进预览对话框（`useApi` 缓存复用）
- 资产管理：列表请求 + **详情页管理区动作后**局部重取（不整页刷新）；版本列表懒加载
- 审计页：过滤面 8 组全暴露（`action`/`targetType`/`targetId`/`actorId`/`requestId`/`clientIp`/
  `from`/`to`——对标 skillhub admin audit-log 页同款 8 过滤器）；**`action` 用分组下拉**
  （防自由输入拼错），值清单 = 服务端现有 **27** 个（按域前缀分组；2026-09-16 实测）：
  · `asset.*`（9）：register · delete · status_update · version_upload · version_submit ·
    version_delete · version_yank · label_attach · label_detach
  · `review.*`（3）：approve · reject · withdraw
  · `label.*`（4）：create · update · delete · reorder
  · `auth.*`（4）：login.success · login.failed · logout · register
  · `device.*`（3）：approve · deny · token_issued　· `token.*`（2）：issue · revoke　· `ldap.*`（1）：provisioned　· `oidc.*`（1）：provisioned
  （空间域 5 个动作与资产可见性动作随 M4-pre 删除 ⇒ 31 → 25；M4b-pre 增 `device.deny` 与 `ldap.provisioned`（`device.approve`/`device.token_issued`/`oidc.provisioned` 三处散落字面量收敛入常量表）⇒ **27**；清单源为 server 侧 `action`
  字面量；新增 action 需同步前端常量——集中化登记见 §14）
- **实现期联调数据需求（dogfood）**：多角色（`SUPER_ADMIN` / `ADMIN` / 普通 `USER`）+
  各状态资产（ACTIVE / HIDDEN / ARCHIVED）+ 三族各至少一条 + 待审任务 + 两级标签树
  ——seed 直插（沿用 M4a T18 模式，前缀 like 清理）

## 8. 接口变更总览（服务端面）
> **归属批（2026-09-14 拆批）**：逐行归属：**R6 / R6-b → M4b-4**（唯一含读面改动的批）· **R6-c（`reviewComment` 加性）→ M4b-3** · R5 不属本表（M4-pre 已交付）


| # | 变更 | 端点/位置 | 说明 |
|---|------|----------|------|
| R6 | 新增 | `GET /api/me/assets` | 「**我名下的资产**」读面（§7.2 契约；**2026-09-18 修正为 owner-only**）；公开面零改动；**T11-f 起同支持 `sort` + `dir`（与公开面同参数、同默认、同回落 —— v1.57 补 `dir`，见批 design §4.7.6 F82）** |
| R6-b | 修改 | `assertAssetReadable` 授权集 | 非 ACTIVE 详情/版本/文件/下载面：授权集（owner 本人 / 管理档 / 超管）放行，其余仍 404（§7.2；§14 同步 05 §6.4 + 08 §7） |

> **M4b-6 预告（2026-09-18）**：新增「**管理档全站资产列表**」读面（§2.4 U8 · §2.3 服务端改动列已记
> 1 处），契约在该批对齐时定；本批 R6 端点不回退为全站集合。
>
> **M4b-8 预告（2026-09-18）**：发布批（R2 翻转）**零服务端改动** —— 注册 `POST /api/assets` /
> 上传 `POST /api/assets/:slug/versions` / 提审 `POST /api/assets/:slug/versions/:version/submit`
> 三端点已由 M2/M3 交付（挂载于 `app.ts` 的 `/api/assets`）；本批只新增前端发布页与上传通道
> （XHR 进度，不替换 `fetch` 客户端）。本表 R6 / R6-b 两行**不变**。
>
> **R5 不属本表**：`/me` 的角色感知已由 M4-pre 交付（`http/auth-routes.ts:17-28`），
> M4b 零服务端改动——重构前拟的「`/me` 增平台角色数组」方案随之废弃。

| R6-c | 修改（**加性**） | `review/query.ts` `LIST_SELECT` 增 `reviewComment` | 「我的提交」列表露出拒绝原因（2026-09-14 用户拍板；对既有响应向后兼容） | **M4b-3** |

均落 server + 补测试（M4-pre 后全量测试基线 + 新用例）；实现细则归 **批 plan**（逐批立，命名见 §2.3）。

## 9. 数据获取与状态约定

沿用 M4a（design §7）并补充控制台面（个人面 + 治理面）约束：

- `useApi` 三态 + abort + 语言感知 Map 缓存（键含 lang）
- 分页：**offset 替换式**（管理表格无跨页选中需求）；筛选/搜索变更 → `page` 回落 1
- 危险操作（隐藏/归档/恢复/删除/yank/吊销）→ **ConfirmDialog 二次确认**，
  文案含对象坐标与后果（如「隐藏后该资产对所有非管理员不可见」）
- 写操作成功 → 局部重取 + 轻提示（不整页刷新，保留筛选与滚动位置）
- 错误：`errors` 资源组按 code 本地化；401 → **按 §2.4 U3 三分类分流**（公开段静默 anon / 受保护段 `/login?next=` / 表单写操作内联）
- 403 → 就地提示（不退化为空态，避免"看起来没数据"的误导）

## 10. UI-UX 变动总览

### 10.1 视觉基线（R9：**引用 M4a design §4.4 为全站视觉真值 SSOT**）

**视觉体系 = M4a design §4.4（引用不复制；版本随 M4a 演进，以 M4a design 版本头为准）**——色彩 token / 圆角轴 / 字阶 / 阴影 / 字体栈 /
滚动条 / 组件真值 / **AIH token 补丁表**（`--success` / `--warning` / 类型色）/ token 映射表的
**唯一源在 M4a §4.4**。本文件只记**控制台面特有的取值与形态**；归属分工如下（双写即漂移）：

| 项 | 归属 |
|----|------|
| 色彩 token · 圆角轴 · 字阶 · 阴影 · 字体栈 · 滚动条 · 组件真值 | **M4a §4.4（SSOT）** |
| 状态语义映射（资产三态 + 版本八态 → token）与 `StatusPill` 规格 | 本文档（控制台特有） |
| 表格密度（表头高 / 单元格 padding） | 本文档（**已落值 40**：表头 `h-10` / 单元格 `p-2`——2026-09-14） |
| 抽屉宽 | 本文档（**已落值 560**：`sm:max-w-[560px]`——2026-09-14） |

**控制台面特有形态（个人面与治理面共用）**：

- **数据表格**（`DataTable` = shadcn `Table` 封装）：两档真值对照（**已定档：shadcn 档**）——shadcn 档（表头 `h-10 px-2`
  = 40px · 单元格 `p-2`）vs skillhub 档（表头 `h-12 px-4` = 48px · 单元格 `p-4`）；
  **已取 shadcn 档 = 40**（表头 `h-10 px-2` · 单元格 `p-2`——2026-09-14 拍板；备选 skillhub 档 `h-12 px-4` = 48px **不采纳**）。状态列右对齐 `tabular-nums`；
  载态用 shadcn `Skeleton` 行占位
- **表单控件**：shadcn `Input` / `Select` / `Textarea` / `Switch`（真值见 M4a §4.4 ③）——
  **不再自写玻璃底样式**
- **右侧抽屉**：shadcn `Sheet`（真值 `w-3/4 sm:max-w-sm` = 384px 上限；取 560px 时覆盖为
  `sm:max-w-[560px]`）——**已取 560**（2026-09-14 拍板）；遮罩 `bg-black/50`（无 blur）
- **危险操作**：shadcn `Dialog` 二次确认 + `--destructive`（#e7000b）+ `Button variant="destructive"`
  ——**不再引 M4a diff 的 #cf222e**（diff 内容色与 UI 语义色分工不同，见 M4a §4.4 ②）
- **状态徽章**：`Badge variant="outline"` + `border-success/30 bg-success/10 text-success` 组合
  （shadcn 无 success/warning 变体 → 走 M4a §4.4 ② 补丁 token）
- **空/载/错三态**：载态 shadcn `Skeleton`；空/错沿用既有 `EmptyState`/`ErrorState`（换皮为
  shadcn 语法）
- **版本八态 → token 映射**（控制台特有，**2026-09-14 用户拍板定死**——对标 skillhub）：`PUBLISHED`
  = success；`UPLOADED` / `PENDING_REVIEW` = warning；`SCAN_FAILED` / `REJECTED` = destructive；
  `YANKED` = secondary（灰——同 skillhub 详情页 `VersionStatusBadge` 与门户侧实况）；
  `DRAFT` / `SCANNING` = muted-foreground
- **控制台特有值已落值（2026-09-14 用户拍板）**：① 表格密度 **40**（`DataTable` 表头高 40 / 单元格 `p-2`）
  ② 抽屉宽 **560**（`Drawer` = `Sheet` 封装，`sm:max-w-[560px]`）——落位见 `2026-09-14-m4b1-console-foundation-design.md` §5.1

**视觉环节产出（R9 修订，2026-09-11 用户扩大范围）**：由「1 版风格板 + 2 交互 demo」改为
**全页可点原型**（11 视图 + 评审控件：角色 4 档 / 页面三态正常·空·载·403 / ★待拍板标注 / 中|EN）
——用户要求逐页亲眼确认后再对齐。技术可行性实证：沙箱 spike（shadcn 真身，不进仓）；
**M4a 换皮落地后以本仓代码为准**。不做三变体 sketch。

### 10.2 信息架构与交互要点
> **归属批（2026-09-14 拆批）**：审核详情（核心工作台）→ **M4b-5** · 资产管理动作（**详情页管理区**）→ **M4b-4** · 标签定义 → **M4b-6** · 个人工作台 → **M4b-4** · 状态语义可视化（`StatusPill` 落件于 M4b-1、各批消费）→ **跨批** · 品牌/语言切换 · 响应式 · 空错态文案 → **跨批**


- **审核详情**是核心工作台：左主列 = manifest 摘要卡 + 文件树（`ui/FileTree`）+
  文件预览对话框；右栏 = task 元信息（坐标/版本/提交人/时间）+ 动作区（通过/拒绝/撤回）
  - **manifest 卡按 type 分型（三族适用性——M4a T15 实证的族协议差异）**：skill 族主文档
    `SKILL.md`（必需）；mcp 族 `mcp.json` / `README.md`（可选）；agent 族 `agent.md` /
    `README.md`（可选）——复用 M4a `OverviewTab` 的分型探测与回退逻辑（大小写归一 + 缺失
    回退结构化摘要），审核人看到的摘要形态随类型自适应，不空窗
- **资产管理**（~~抽屉~~ 已取消 · M4b-4 v1.9）：状态治理（含恢复）+ 标签增删 + 版本列表（yank/删除）+
  危险区（删除资产，说明"有已发布/已撤回版本时不可删除"）—— **全部动作归资产**详情页**管理区**（入口 = 列表操作列 `Eye` 真链接直跳）
- **标签定义**：两级树 + CRUD + 翻译（**固定 `zh-CN`/`en` 两行**）+ **行内上/下移**排序
  （改序后批量提交 `PUT /api/labels/order`；不做拖拽——零新增依赖）
- **个人工作台**：角色感知卡片（见 §7.3 编排）+ 卡片动作槽跳转对应列表页
- **状态语义可视化**：`StatusPill` 统一呈现资产三态（ACTIVE = success / HIDDEN = warning /
  ARCHIVED = muted-foreground）、版本八态——**色值取 M4a §4.4 ② 补丁 token**（不复制，映射表见 §10.1）
- 品牌显示名「AI X Hub」沿用（R8）；语言切换器沿用（控制台面与门户共用 i18n 机制）
- **顶栏「页面标题区」（2026-09-17 Q7；v1.44 更新）**：顶栏在「触发钮 → 语言」之间渲染**当前屏标题**；**v1.44 起**改语义 `<h1 class="text-base font-medium">`、撤「分区副标」、**品牌不在顶栏**（落侧栏顶部）、顶栏**宽 = 内容区宽**；**信息架构真值 = M4b-2 批 design §14.4 C**（引用不复制）
- **登录 / 设备页版式（2026-09-17 Q9/Q10）**：两页为**全屏独立版式**（`min-h-svh`）——**不套 `AuthLayout`**（该件退役），**无页头**；登录页 = **双栏 42/58**（左品牌渐变面板 + 右表单，**无白卡**）、**无 tab**（底部「使用 OAuth 登录」链接 + 备用面板）；设备页 = 单列居中 + 品牌小方块；**语言切换器落页面右上角**。视觉真值 = M4b-2 批 design §14.4 A/B
- **响应式**：控制台表格窄屏（<1100px）→ 容器横向滚动（保留列完整，**不做卡片化**——控制台场景
  列信息密度优先）；抽屉窄屏 → 全宽侧滑；侧栏 <900px 折叠为图标态（沿用 M4a 断点体系）
- **关键空/错态文案（示例，非硬编码——zh 真源 / en 对齐）**：「暂无待审任务」·
  「未找到匹配的资产 · 试试切换状态筛选」·「该资产有已发布版本，不能删除」·
  「会话已过期，请重新登录」（401 拦截文案）·「标签定义已达上限 100 个」

## 11. i18n 资源规划（07 §3）

**键数当前值（2026-09-17 · UI 重做轮 + 侧栏统一轮实测）**：全仓 **222 键 / 11 组**（含 `navigation.groupPortal`）（含 M4b-3 落的两组 `submissions` 25 / `tokens` 47）；**本批 UI 重做净增 10 键**——① `login` 组 **8 → 16 键**（删 `tabLocal` · `tabOidc` → `oidcLink` · 增 `subtitle`/`oidcOpen`/`backToForm` + 左栏品牌面板 5 键）② `device` **13 → 14**（`subtitle`）③ `navigation` **12 → 13**（`adminBoard`「管理看板」，§14.7 归属 M4b-6 但**键落本批**）。**双语双向差集 0**；逐键真值 = M4b-2 批 design §10，证据 = `docs/smoke/2026-09-17-m4b2-ui-redo.md` §3。**史实值（下方 41 键 / §15 v1.32 行）保留不改，以本条为准**；逐键表真值 = M4b-2 批 design §10。
**键数当前值（2026-09-18 · M4b-4 收尾实测）**：全仓 **323 键 / 12 组**（= 上一行 222 + M4b-4 新增 `assets` 组 **79** + `dashboard` / `market` / `common` / `errors` 补键）；**双语双向差集 0** · **en 值级中文泄漏 0 处**（值级守卫为本批新增 —— 键集相等 ≠ 值已翻译）。实测命令 = `bun docs/smoke/scripts/m4b4-measure.ts`；证据 = `docs/smoke/2026-09-18-m4b4-personal-b.md` §7。**本行即本批口径，上一行（M4b-2 期值）保留不改**。
> **键数当前值（2026-09-18 · T11-e 门户视图切换 + 折叠搜索实测）**：全仓 **329 键 / 12 组**（= 上一行 323 + T11-e `market` 组 **+6**：`viewGrid` / `viewList` / `colName` / `colDesc` / `colDownload` / `searchClose`）；**双语双向差集 0** · **en 值级中文泄漏 0** · **未消费键 12 = 基线**（新键 6 个全部有消费者）。

**组清单（2026-09-16 按真码 `i18n/zh.ts` / `en.ts` 实测订正）**：既有 **7 组** + M4b-2 新增 **2 组**（zh 真源 / en 完整对齐、缺键即编译错，纪律同 M4a）。

**M4b-2 新增（2 组）**：

- `login`：登录页（**单表单 + OAuth 链接**——2026-09-17 Q9 撤两 tab / 表单文案 / 提交中 / 失败与校验提示）
- `device`：设备授权页（码输入与校验 / 客户端与范围展示 / 批准·拒绝 / 状态与错误文案——错误枚举取自官方端点契约，见 §7.1）

**既有（7 组）**——前 4 组 M4a 落、后 3 组 **M4b-1 已落骨架**（文案随各批补足）：

- `navigation`（9 键）· `market`（~50 键）· `common`（5 键）· `errors`（9 键）——M4a 落
- `dashboard`（**4 键**：title / myAssets / tokens / empty）——个人工作台；**M4b-2 补 `submissions` 等侧栏键**
- `admin`（6 键：title / reviews / audit / labels / users / empty）——治理面通用（+ Phase 2 占位提示）
- `review`（5 键：title / approve / reject / reason / empty）——审核面专属

本批 `errors` 补 **9 码**（**8 个** `auth.*` + `oidc.not_configured`；全量 **12 个** `auth.*` 见 `auth/errors.ts:6-21`——其中 `auth.rate_limited` **M4a 已落**，故实补 8 个；OIDC 回调 2 码见 §7.2 G6）。
`navigation` 另补**组标题 3 键**、**删**产品元信息 4 键（`starRepo`/`footDocs`/`footFeedback`/`versionLine`——P11，真码现状 9 键已含）。
**文案分层口径**（2026-09-16 拍板）：导航条目用短词（工作台 / 审核队列 / 审计浏览），页头用全称（个人工作台 / 审计日志）。

## 12. 线框图
> **归属批（2026-09-14 拆批）**：逐张归属：`/dashboard` → **M4b-4** · `/dashboard/assets` → **M4b-4** · `/dashboard/submissions` → **M4b-3** · `/dashboard/tokens` → **M4b-3** · `/reviews/:id` → **M4b-5** · `/admin/reviews` → **M4b-5** · `/admin/labels` → **M4b-6** · `/admin/audit` → **M4b-6**；`/login` 与 `/device` 线框于 2026-09-16 补入（**本节 10 张 / 11 视图**）


个人工作台 `/dashboard`（角色感知卡片；治理卡片仅 `role >= 10` 渲染）：

```text
┌ « │ 工作台                    🌐 中|EN ┐  ← 顶栏（官方 SiteHeader 形态 · 宽 = 内容区宽）：触发钮 + `<h1>` 标题 + 语言
│ ⌂首页 ✦技能中心 ⚙MCP ◈专家                            │
│ ─ 个人 ─────────────────────────────────────────────  │
│  ▤ 工作台  ◫ 我的资产  ⇪ 我的提交  ⛁ 我的令牌          │
│ ─ 管理 ─（role>=10 才渲染）──────────────────────────  │
│  ⚖ 审核队列  ☰ 审计浏览                                │
│ ─ 超级管理 ─（role>=100 才渲染）─────────────────────  │
│  ⌗ 标签定义  ⚙ 系统设置  ☺ 用户管理                    │
│                                                        │
│  [👤 孙学文 ▾]  ← 用户区（侧栏底部；未登录为「登录」）  │
├────────────────────────────────────────────────────────┤
│ 工作台                                                  │
│ ┌待审核────┐┌我的资产──┐┌最近审计──────────────┐      │
│ │    3     ││   12     ││ auth.login.success    │      │
│ │ 待处理   ││          ││ asset.status_update   │      │
│ │ [去处理] ││ [去管理] ││ asset.version_yank    │      │
│ └──────────┘└──────────┘└───────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

审核详情 `/reviews/:id`（共享路由——坐标 = 全局唯一裸 slug）：

```text
│ 首页 / 审核队列 / #1024                                 │
│ langgraph-rag  v1.3.2   提交人 林晓峰                    │
│ ┌ 主列 ───────────────────────────────┬ 右栏 320px ────┐│
│ │ [manifest 摘要卡]                    │ 状态 PENDING    ││
│ │ name/version/license/description…    │ 提交 09-10 14:02││
│ │ ─────────────────────────────────    │ task#1024 v1    ││
│ │ [文件树]  ▼ reference/               │ ─────────────── ││
│ │           SKILL.md  sha a1b2…  [预览]│ [✔ 通过]        ││
│ │           agent.md  4.2KB            │ [✘ 拒绝]        ││
│ └──────────────────────────────────────┴─────────────────┘│
└──────────────────────────────────────────────────────────┘
```

我的资产 `/dashboard/assets`（含状态筛选与恢复——坐标 = 裸 slug，无可见性列）：

```text
│ 我的资产                        [状态: 全部▾] [🔍 搜索]  │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标             类型  状态     版本   更新  动作      ││
│ │ rag-skill        skill ●ACTIVE  1.3.2 09-09 ⋯        ││
│ │ old-tool         mcp   ●HIDDEN  0.9.0 08-21 ⋯        ││
│ │ x-agent          agent ●ARCHIVED 2.1.0 07-30 ⋯       ││
│ └──────────────────────────────────────────────────────┘│
│ 行内 ⋯ → [恢复 ACTIVE][归档][删除][标签挂载]             │
└──────────────────────────────────────────────────────────┘
```

审核队列 `/admin/reviews`（全站单队列 + 状态过滤）：

```text
│ 审核队列                              [状态: 待审核▾]       │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标            版本    类型   提交人   提交时间      ││
│ │ rag-skill      1.3.2  skill  林晓峰  09-10 14:02   →││
│ │ old-tool       0.9.1  mcp    赵敏    09-10 11:30   →││
│ └──────────────────────────────────────────────────────┘│
│ 共 2 条        [‹ 上一页]  1/1  [下一页 ›]              │
```

标签定义 `/admin/labels`（超管面：两级树 + 编辑 + 翻译 + 上/下移）：

```text
│ 标签定义                                    [+ 新建标签]   │
│ ┌ 定义树 ──────────────────┬ 编辑（retrieval）──────────┐│
│ │ ▼ 检索类 (retrieval)     │ 类型  RECOMMENDED ▾         ││
│ │     ● rag      [↑][↓][⋯] │ 筛选中展示  [✓]             ││
│ │     ● embedding[↑][↓][⋯] │ 翻译                        ││
│ │ ▼ 开发类 (dev)           │   zh-CN  检索类             ││
│ │     ● sdk      [↑][↓][⋯] │   en     Retrieval          ││
│ │  (定义 12 / 上限 100)    │ [保存] [删除]（有子级→阻断） ││
│ └──────────────────────────┴─────────────────────────────┘│
```

我的令牌 `/dashboard/tokens`（签发明文仅一次）：

```text
│ 我的令牌                                     [+ 签发令牌]   │
│ ┌──────────────────────────────────────────────────────┐│
│ │ scope          签发时间   过期      状态      动作    ││
│ │ asset:manage   09-01      12-01    ●有效     [吊销]  ││
│ │ (未设)         08-20      —        ○已吊销   —       ││
│ └──────────────────────────────────────────────────────┘│
│ ⚠ 明文仅在签发时展示一次，关闭后不可再查看                 │
```

审计 `/admin/audit`（八维过滤全暴露）：

```text
│ 审计日志                                                  │
│ [动作▾][对象类型▾][对象ID][操作人ID][请求ID][IP][从][到]   │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 时间          动作                  操作人   对象      ││
│ │ 09-10 14:02   asset.status_update   孙学文   rag-skill││
│ │ 09-10 11:31   auth.login.success    赵敏      —       ││
│ └──────────────────────────────────────────────────────┘│
│ 共 N 条        [‹ 上一页]  1/N  [下一页 ›]              │
```

我的提交 `/dashboard/submissions`（提交人视角——撤回入口；任务状态取源码真值）：

```text
│ 我的提交                              [状态: 全部▾]        │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 坐标            版本    状态            提交时间 动作 ││
│ │ langgraph-rag  1.4.0  ●PENDING_REVIEW  09-10 09:20 撤回││
│ │ old-tool       0.9.1  ●REJECTED        09-09 15:02 撤回││
│ │ rag-skill      1.3.0  ●APPROVED       09-08 10:11  —  ││
│ └──────────────────────────────────────────────────────┘│
│ 共 3 条        [‹ 上一页]  1/1  [下一页 ›]              │
```

登录 `/login`（**全屏双栏版式**（2026-09-17 Q10：无 `AuthLayout` 页头）；**无 tab**（Q9）；失败 = 表单内 inline 错误条；语言切换在**右上角**）：

```text
┌──────────────────────────────┬─────────────────────────┐
│ AI X Hub           (渐变面板) │                🌐 中|EN │ ← 右上角语言切换
│ 企业级 AI 资产注册中心与市场  │                         │
│                              │      登录 AI X Hub      │
│ 分发 · 协作 · 治理            │  使用企业目录账号登录    │
│ 技能/MCP/Agent 统一注册与分发 │                         │
│ · 三族资产统一协议与版本化    │  [ 企业工号 / 用户名      ]│ ← 胶囊输入 48/28
│ · 开放协作审核（提交·复核）   │  [ 密码                  ]│
│ · 企业目录账号直连(LDAP/OIDC) │                         │
│                              │  ⚠ 用户名或密码错误       │ ← inline 错误
│ Apache 2.0 · 可自托管         │  [        登录         ] │ ← 胶囊按钮 42
│                              │      使用 OAuth 登录     │ ← 链接→备用面板
└──────────────────────────────┴─────────────────────────┘
   左栏 42%（`--gradient-brand` 渐变）      右栏 58%（表单列 336 · 水平垂直居中）
```

设备授权 `/device`（独立版式；`?user_code=` 或手输；未登录先登录再回跳 —— 认领机制见 §7.1；页面基址与 dev 口径见 §3.4）：

```text
┌────────────────────────────────────────────────────────┐
│                    AI X Hub            🌐 中|EN        │
│        ┌──────────────────────────────────────┐        │
│        │  设备授权确认                         │        │
│        │  设备码  [ ABCD-1234 ]  [ 确认 ]      │        │
│        │  ─────────────────────────────────    │        │
│        │  客户端   aihub-cli                   │        │
│        │  请求范围 全量（无条件 scope）         │        │
│        │  有效期   30 分钟                      │        │
│        │  [ 批准 ]            [ 拒绝 ]          │        │
│        │  （无效/过期 → 码级错误文案；已处理 →  │        │
│        │    「已批准」「已拒绝」；他人已认领 →   │        │
│        │    「该请求已由其他账号认领」）         │        │
│        └──────────────────────────────────────┘        │
└────────────────────────────────────────────────────────┘
```
> §12 覆盖**全部 10 张线框**（示意数据非设计硬值；`/login` 与 `/device` 于 2026-09-16 补图；**侧栏图标为示意字形**——**图标真值 = M4b-2 批 design §14.6 映射表**，引用不复制；`/login` 线框于 **2026-09-17 UI 重做**改为双栏版式）。M4b 路由实为
> **11 个视图**——未画线框的只有 `/admin`（纯重定向，不需线框）。
> 视觉环节产出（tokens 全规格 → §10.1、语义修正记录 → §8）随定稿条件 ① 回写。

## 13. 引用文件清单

- 规范：`docs/00-product-direction.md` §2/§5/§7 · `docs/05-identity-access.md` §3/§5/§6 ·
  `docs/06-label-system.md` §3/§5 · `docs/07-i18n-conventions.md` 全 · `docs/08-data-model.md` §5/§7
- 服务端（消费与改动）：`apps/server/src/http/assets.ts`（`assertAssetReadable`、
  `listQuerySchema`、管理端点族）· `assets/service.ts`（`listViewableAssets`）·
  `assets/manage.ts`（`canManageAsset`）· `http/reviews.ts` + `review/query.ts` ·
  `http/labels.ts` + `labels/service.ts` · `http/tokens.ts` · `http/audit.ts` +
  `audit/query.ts` · `http/stats.ts` · `http/auth-middleware.ts`（`requireRole`）·
  `http/auth-routes.ts`（`/me` 薄层）· `auth/plugins/ldap-credentials.ts`（自绘目录凭证插件）· `auth/better-auth.ts`（官方实例装配）· `http/origin-guard.ts`（业务面同源守卫）· `auth/rbac.ts`（`roleOf`/`hasRole`/`isSelfReview`）·
  `auth/token-scopes.ts`（token 凭证 scope 码）· `auth/roles.ts`（`ROLE_LEVEL` / `accountRoleOf`）· `db/schema/auth.ts`（官方 6 表：`user`/`session`/`account`/`verification`/`device_code`/`apikey`）
- 前端（复用与新增）：`apps/web/src/components/ui/`（既有 AppShell/TopBar/SideNav/MarkdownRenderer/
  AssetAvatar/Badge/Pagination/Spinner/EmptyState/ErrorState ＋ 迁入 FileTree/FilePreviewDialog ＋
  新增 Toaster/SkeletonLoader/RoleGuard/CopyButton）· `components/console/`（M4b 新增面域：
  PageHeader/DataTable/Drawer/ConfirmDialog/StatusPill/FilterBar + reviews/labels/assets/tokens/audit
  子域）· `components/market/detail/FilesTab.tsx`（迁移引用方）· `auth/`（AuthProvider/roles.ts）·
  `components/ui/UserMenu.tsx`（用户区——跨面件）· `components/console/ComingSoon.tsx`（占位页）·
  `api/auth.ts`（login/logout/me）· `pages/Device.tsx`（`/device` 设备授权页）·
  `pages/`（Login/dashboard/*/reviews/*/admin/*）· `i18n/`（I18nProvider/lang/zh/en）·
  `hooks/useApi.ts` · `hooks/useMarketQuery.ts`（控制台面参数化扩展——**不新建 hook**）· `styles/aih-theme.css`（**T24 后为唯一样式文件**；原 `tokens.css` 已删）
- 被更新测试：`apps/server/src/http/assets.test.ts`（`:421` 授权集断言——R6-b）
- 模型事实源：`docs/designs/2026-09-10-flat-model-refactor-design.md`（M4-pre）
- 对标源：skillhub 源码（Apache-2.0）（MeController / MySkillAppService /
  controller/admin/* / web/src/pages/dashboard/my-skill-filters.ts）·
  `https://clawhub.ai/api/v1/openapi.json`（2026-09-10 实测，27 端点）
- 视觉参照（公开）：**shadcn/ui**（v4，MIT；本机对照仓 `00-ui` = 官方仓 fork）——**视觉体系真值源**，
  取值见 M4a design §4.4（引用不复制）；skillhub 管理面——`skillhub/web/src/pages/admin/{audit-log,labels,users}.tsx`
  + `shared/ui/*`（Table/Card/Select/Input/Button）· `shared/components/`
  （confirm-dialog/pagination/empty-state/skeleton-loader/toaster/dashboard-page-header/role-guard/copy-button）
  ——**形态参照**（信息组织形态：表格列结构 / 筛选条位序 / 分页 / 确认对话框 / 页头）
- 图标：lucide（ISC，沿用 M4a 同一来源）
- 流程：`portal-ui-design`（编排：环节 0 线框 → 1 风格板 → 2 高保真 → 3 tokens 定档）+
  `shadcn-ui-project`（shadcn v4 消费侧：CLI 装法 / 四个坑 / 组件真值表）；
  **不做 sketch 三变体**（R9）；线框见 §12
- 评审物料（不进仓，`/tmp` 会丢）：全页可点原型（shadcn 真身，dev :5199）——**M4a 换皮落地后
  以本仓代码为准**

## 14. 规范同步项
> **归属批（2026-09-14 拆批）**：逐行归属：`05` §6.4 读面授权集 + `08` §7 读面注记 → **M4b-4** · `07` §3 资源组落地注记 → **M4b-1 已落骨架 / 各批补文案** · `05` §6.4 用户管理两行 + M4-pre P3/§2.5 旧注修订 + Device Flow 归属 → **M4c** · 审计动作常量集中化 → 后置 · `M4a §4.4` SSOT 引用纪律 → 已生效


| 规范 | 同步内容 | 时点 |
|------|---------|------|
| `05` §6.4 | **R6-b** 非 ACTIVE 读面授权集注记（owner 本人 / 管理档 / 超管可读）——修改 M4-pre 已同步的「仅超管」行（`05` §6.4:187）+ **连带订正超管行措辞**（`05` §6.4:161「全部权限（含非 ACTIVE 资产读面）」——"含"字暗示独占，授权集放宽后须改写） | **随 M4b-4 落地即改**（2026-09-18 用户拍板 **A**——收敛原「落地后 / 统一于 M4b 收尾」双口径；先例 = M4b-pre 规范层原地改写） |
| `08` §7 | ① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）；② **ARCHIVED 语义补实**——当前与 HIDDEN 判定同构（`status !== 'ACTIVE'`），写明「HIDDEN = 临时下架/可恢复；ARCHIVED = 长期退役/停止维护」的运营语义分界（**本批「恢复」动作的判据依据**） | **随 M4b-4 落地即改**（同上拍板 **A**——语义补实与本批 UI 规则同批落，避免「UI 有规则、规范无依据」） |
| `07` §3 | **`publish` 资源组落地注记**（M4b-8 新增该组文案；§3 组清单**已含 `publish`（发布流）**，本条只作落地注记——同批核对组清单是否仍缺 `dashboard` 行，见下行） | **M4b-8** 收尾 |
| `07` §3 | `dashboard`/`admin`/`review` 资源组落地注记（**M4b-1 已落三层骨架**——各批补文案；§3 资源组清单**需补 `dashboard` 行**：`07` 现列 7 组含 `review`/`admin` 但**无 `dashboard`**，落后于真码 `i18n/zh.ts`） | M4b 收尾 |
| `00` §5 | M4b 行完成注记 | M4b 收尾 |
| `07` §3 | **资源组清单 +2**（`login` / `device`）——M4b-2 新增两组落地注记 | M4b-2 收尾 |
| `00` §5 | **M4b-2 行状态回写**（对齐完成 → 实现中 → ✅）+「零服务端改动」口径确认（原「随 M4b-pre 结论重估」→ 重估结论：**仍成立**） | M4b-2 收尾 |
| `05` §6.4 | 补 **列表 / 启用·禁用** 两行（管理档 `role >= 10`）；**改角色沿用既有「角色分配 = 超管」行**（05 §6.1 明文，不重复新增）+ **末位超管保护**（禁止把最后一个 ACTIVE 超管降级/禁用）与**禁止自我降级 / 自我禁用**注记 | **M4c** 立项时 |
| `00` §5 | M4c 行（2026-09-10 已新增 ⬜）+ M4b 行范围注记（用户管理移出） | **已同步** 2026-09-10 |
| `00` §5 · `M1-phase2` plan | **Device Flow 确认页归属 —— 已闭合**：`M1-phase2` plan 原记「M4 web」→ 2026-09-10 改「M4c 或随 M5 CLI」→ **2026-09-16 用户拍板改判归 M4b-2**（设备授权页 `/device`）；不改写已收尾的 M1 plan（历史完成注记不改） | ✅ 2026-09-16 闭合 |
| `2026-09-10-flat-model-refactor-design` **P3**（:120）· §2.5（:285） | **用户管理 / 角色分配旧注修订**：P3 与 §2.5 写「用户管理能力（未实现）将来落地按 `role >= ADMIN` 判定」→ M4c 立项时以 **05 §6.1/§6.4 为准**（**改角色 = 超管**；列表/启用·禁用 = 管理档），并在 M4c design 写明该修订 | **M4c** 立项时 |
| （后置·非规范） | **审计动作常量集中化**：`audit_log.action` 现为 server 侧散落字面量（27 个，2026-09-16 实测），前端过滤清单靠同步维护；建议抽为共享常量（对齐 `auth/token-scopes.ts` 的常量单源模式），消除漂移 | M6 或按需 |
| `2026-09-09-m4a-marketplace-portal-design` **§4.4** | **全站视觉真值 SSOT 引用**：M4b 控制台面视觉基线指向该节（色彩 token / 圆角轴 / 字阶 / 组件真值 / AIH 补丁表）；本文件 §10.1 只记控制台特有值（表格密度 / 抽屉宽 / 状态映射）——**双写即漂移，改动只动 SSOT** | M4b 实现期（引用即生效） |
| （后置·非规范） | **AIH token 补丁（`--success` / `--warning` / 类型色）无规范层归属**：`07` 实测无 token / 视觉章节（2026-09-11 核）→ 补丁表登记于 M4a §4.4 ②，规范层不新增行；若将来新增视觉规范文档，补丁表随之迁入 | 按需 |
| `00` §5 | M4a 行「视觉体系切换进行中」+ M4b 行「依赖 M4a 视觉体系切换先行」+ M5 行 **Device Flow 确认页归属**注记 | **已同步** 2026-09-11 |

> ARCHIVED 语义补实的依据：clawhub 契约**无 archive 概念**，skillhub 的 `SkillStatus.ARCHIVED`
> 语义分界亦弱——AIH 保留三态（改枚举代价 > 收益），但应在规范层写实差异，
> 消除"两个状态行为完全一致"的规范空白。

## 15. 修订记录

| **v1.57** | 2026-09-20 | sunxuewen-rush | **T11-f 契约行补 `dir`（F82 · 实现期订正）** —— ① §7.1 资产列表行 `…&sort=&dir=`（方向覆盖：缺省 ⇒ 档位固有方向）② §7.2 me 面契约块 + R6 行补 `dir`（与公开面同参数、同默认、同回落）③ 根因：**契约只登记 `sort` 漏 `dir`** —— 若不落服务端，列头升序只作用于当前页 | **T11-f 资产排序契约登记（文档面 · 零实现改动）** —— ① §7.1 资产列表行补 `&sort=`（五档白名单 · 默认 `newest` 行为零变化 · 非法值静默回落）② §7.2 R6 行补「与公开面同参数」③ 依据 = 批 design v1.23 §4.7（口径 / UI / 断言 / 基础面四项实证 / F80·F81 纠错留痕）|
| **v1.55** | 2026-09-18 | sunxuewen-rush | **M4b-4 T8 作废散点订正（文档面）** —— ① §9/§12「**资产管理抽屉**」段（v1.53 漏改）→ 「**资产管理**（~~抽屉~~ 已取消）+ 全部动作**归详情页管理区** + 入口 = 列表操作列 `Eye` 真链接」② **F64 登记**（残留审计只查关键字不判语义 ⇒ 活口径行漏扫；审计脚本已加「活口径谓词」）③ 订正**合计 14 处**（批 plan **v0.16** 7 处 · 本文件 2 处 · 批 design **v1.19** 5 处）④ 文档 15 维自检 **9.22**（④⑪⑫ 扣分：散点复发 + 首轮漏项）⑤ 无代码改动 |
| **v1.54** | 2026-09-18 | sunxuewen-rush | **M4b-4 收尾回填（执行期）** —— ① §2.3 登记表 M4b-4 行 → **✅ 五件已执行**（design 8 维 9.69 · **T1–T16 全绿**（T8 作废；逐 Task 9.41–9.71）· 五门禁 exit 0（`test` 537 pass / 0 fail）· dogfood **G1–G19 = 53 PASS / 0 FAIL / NO JS ERRORS** + 门户零回归 36/36 + chain-smoke PASS · 整体审计无未决项）；件规格 **新建 16 / 改造 19 + 3 文档**② §11 **键数实测回填**：**323 键 / 12 组**（`assets` 79 · `errors` 35）· 双向差集 0 · **en 值级泄漏 0**（值级守卫新增）③ **D2/D3 订正**：§12 线框去「含2隐藏」；§7.3 引用改「与 U4 拍板一致（省略副文案）」④ 证据 `docs/smoke/2026-09-18-m4b4-personal-b.md` |
| **v1.53** | 2026-09-18 | sunxuewen-rush | **资产管理抽屉取消（用户「简单一点，这个抽屉不做了，取消，一点预览，直接进入完整详情」）** —— ① **§2.4 U6 整条作废**（⛔ 标注 + 原文保留作沿革留痕）：**不做抽屉** ⇒ 列表（U5）「操作」列 = **`Eye` 图标钮真链接**直跳完整详情页（`/assets/:slug`；与 M4b-3 操作列同款）② 连带同步 6 处：§2.3 拆批表 M4b-4 行 · §2.3 批件登记表预期产出物 · §2.4 U5 操作列描述（~~`⋯` 菜单~~ 已废）· §4 路由表 `/dashboard/assets` 行 · §9 数据流（改为「详情页管理区动作后重取」）· §12 线框 · §11 归属批行 ③ 件表 **新建 15 → 14**（~~`AssetDrawer.tsx`~~）· i18n **删 6 键**（批 design §6.1）④ **`console/Drawer` 件本身保留**（控制台通用形态；视觉基线 §10.1 的 560 宽真值不变）⑤ 真值落批 design **v1.9**（§4.3 取消节 · §11.7 复评 **9.69**）与批 plan **v0.9**（**T8 作废** · T7 改直跳 · **9.64**）⑥ 本版**零实现改动** |
| **v1.52** | 2026-09-18 | sunxuewen-rush | **star 最小集并入 M4b-4（用户「不要单独开 M4-star，看看放在 M4b 行不行」→ 确认）** —— ① §2.3 拆批表 M4b-4 行改写（批界 = 个人面 B + **star 最小集** · **含 1 次迁移 + 2 端点**；交付物补 9 列列表 / 纯预览抽屉 / **资产详情页 owner 管理区** / star 能力）② **§7.1 端点表 +2 行**（`PUT`/`DELETE /api/assets/:slug/star` · **任何登录用户**（社交动作，不受 `canManageAsset`）· **幂等** · 授权集外 404）· 资产详情行标注 `labels[]` 元素改**结构体** ③ §4 路由表 `/dashboard/assets` 行：关键动作改为「**管理动作全在资产详情页 owner 管理区**」+ 收藏端点 ④ §2.3 ④ star 自「后置（未排期）」**撤出** ⇒ 并入本批；连带 `docs/00` 升 **v1.74** ⑤ 真值落批 design **v1.8**（§5.1 ⑧ star 契约 · 件表 新建 15 / 改造 13+3 · dogfood G15–G19 · 复评 **9.68**）与批 plan **v0.8**（T15/T16 · 执行序 T15 最先）⑥ 本版**零实现改动** |
| **v1.51a** | 2026-09-18 | sunxuewen-rush | **落档一致性订正（换靶第 3 轮：事实一致性）** —— ① §2.3 批件登记表 **M4b-4 两行**口径更新（`T1-T11`→**T1-T14** · `v0.1`→**v0.7** · 件规格 `新建 9`→**新建 12** · 「我的资产六列」→**九列** · 「抽屉四段」→**纯预览** · 补「详情页 owner 管理区」与「`labels` 结构体」· `G1-G13`→**G1-G15**）② 头部**删除 v1.49 历史行**（头部口径 = 只留最近 1-2 版）③ 依据 = 用户 2026-09-18「先检查修改并打分」 |
| **v1.51** | 2026-09-18 | sunxuewen-rush | **M4b-4 原型评审收口（R1–R23）→ 主 design 契约同步** —— ① **U5**：列表列集合 **6 → 9 列**（新增 标签/下载/收藏 · 类型列去色 · 操作列 = 「快速预览」图标钮 · **去 `⋯` 菜单**；原 6 列口径作废）② **U6**：抽屉由 **四段**（状态治理/标签挂载/版本列表/危险区）改为 **纯预览**（工具行 + 下载·收藏统计 + 描述 + 标签+-）⇒ **管理动作统一归资产详情页 owner 管理区**（`pages/AssetDetail.tsx` 改造 · §4.6 权限矩阵逐条对真码守卫）③ **侧栏条目更名**：`标签管理` → **`标签定义`**（超管组；`admin.labels` **键名保留**、值变更；7 处含 §4 入口表 / §5.2 路由表 / §12 线框 / §7 能力清单；已收尾批件 **M4b-2 design 不追改**——按「已收尾件不追改」纪律，如实登记）④ **§2.3 ④ star 行更新**：用户同日后续拍板「UI 收尾提交 → 暂停 → **先做 star**」⇒ 建议单独立批 **`M4-star`**、执行序在 **M4b-4 之前**；M4b-4 的列表「收藏」列 / 抽屉收藏统计 / 详情页收藏按钮**依赖该批**（未落地 ⇒ 三处**不渲染**）⑤ 依据 = 批 design **v1.7**（§2.1d 原型评审 R1–R23 · §4.6 管理区规格 · §5.1 ⑦ `labels` 结构体 · §11.4 复评 9.66）⑥ 本版**零实现改动** |
| **v1.50** | 2026-09-18 | sunxuewen-rush | **star/收藏登记 backlog + 首期非目标口径订正（用户拍板「两条都要」）** —— ① **§2.3 新增 ④「后置（未排期）功能项」**：资产 star / 收藏（读面 + 收藏端点 + 门户按钮 + 一次迁移；配套待定 = 审计 / 限流 / 未登录语义）—— 依据 = 用户 2026-09-18 拍板「登记 backlog」② **连同 `docs/00` 升 v1.72**（§6 首期非目标行改写：首期不做社交面 · **下载统计已交付 M4a** · **star / 收藏 = 后置 · 未排期**）—— **消除口径冲突**（M4a design §2 已列「社交面（star/评分/收藏）」后置；`00` §6 原措辞「只保留下载统计与收藏所需最小集」易被读成首期保留收藏）③ **实测取证**（本版判断依据）：`asset.download_count`（`db/schema/assets.ts:55`）· 授权即原子增量（`assets/download.ts:95`）· `assetItem()` 带出（`http/assets.ts:126`）· 门户展示（`AssetCard.tsx:33` / `AssetDetail.tsx:279`）· **14 张表中无 star / favorite 表** · `http/assets.ts` 15 条路由**无 star 端点** · `packages/protocol` **无 star 字段** ④ **本版零实现改动** |
| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v1.49** | 2026-09-18 | sunxuewen-rush | **M4b-4 批件落地登记（用户按推荐流程批准）** —— ① **§2.3 批件登记表**加 **M4b-4 行**：批 design `2026-09-18-m4b4-personal-b-design.md`（**定稿** · 8 维 **9.66** —— 初评 9.63 → Q13 拍板后 9.69 → **换靶复核后 9.66**）· 批 plan `M4b-4-me-assets-and-console.md`（**v0.1** · T1-T11）；状态 → **🔵 计划已立（2026-09-18）** ② **grilling 产物登记**：**Q1–Q13**（Q1 卡口径 `status=ALL` · Q2 扩 `useMarketQuery` 可选 status · Q4 独立 `http/me.ts` + 序列化器抽中性模块 + **参数化同一查询函数** · Q5 R6-b 授权集**不加宽** + 夹缝登记 · Q6 **3×2 状态治理矩阵** · Q7/Q8/Q9 全按推荐 · Q10 i18n 落点 · **Q11 规范同步随本批即改** · Q12 测试边界 + 造数 · **Q13 PRIVILEGED × 不做特判 ⇒ 缺口登记 M4b-6**） ③ 件规格（**新建 9 / 改造 11**）· dogfood **G1–G13** · 出口件 ④ 口径（CDP 断言 + 用户认可） ④ 证据骨架 `docs/smoke/2026-09-18-m4b4-personal-b.md` 已建（执行期回填；含未证项诚实清单：提审入口 → M4b-8 · PRIVILEGED 特判 → M4b-6） ⑤ **本版零实现改动** |
| **v1.48** | 2026-09-18 | sunxuewen-rush | **发布批立项：R2 翻转 + M4b-8 新增（用户拍板）** —— ① **§2.1 R2**：「发布/上传流不入首期」→ **入册 · 归 M4b-8「发布批」**（零服务端改动——注册/上传/提审三端点 M2/M3 已交付）② **§2.3**：拆批表加 **M4b-8 行**（七条子决策 = 终点「上传落 DRAFT + **手动**提审」· **单 zip** · **XHR 进度通道** · 「新建并上传」页内一步 · 未登录**轻提示 toast** · i18n 新组 `publish` · **页面原型评审**）· backlog 加该批行（含预期件名）· 登记表行并入「M4b-4…M4b-6 · M4b-8」· **编排说明依赖链 `1→2→3→4→5→6→8→7`**（插在治理批后、视觉收尾前）· 标题「六批」→「共八批」· ③ **§4**：侧栏「个人」组加**「发布」**条目 + 顶栏构成加**「发布」入口**（未登录 = 轻提示 + `/login?next=/dashboard/publish` 回跳 · 复用 M4b-2 既有链）④ **§5.1 / §5.2**：加 `/dashboard/publish` 职责行与路由行 + 逐行归属⑤ **§8**：加 **M4b-8 预告**（零服务端改动；R6/R6-b 两行不变）⑥ **§14**：加 `07` §3 `publish` 组落地注记 ⑦ **本轮自检补正 3 处**（自检当场修）：§4 顶栏构成按真码订正（原「只留品牌 + …」为 **v1.44 前旧漂移**——品牌实已移出顶栏、落侧栏顶部，`TopBar.tsx:82-92`）· §4 显隐组合锚点行补「未登录亦可见**顶栏发布入口**」· §6.2 改造件 `TopBar` 行同步真值 ⑧ 依据 = 用户 2026-09-18 拍板（「①–⑦ 全按推荐」+ 发布三入口：sidebar「个人」组「发布」· 顶栏「发布」· 未登录提示 → 登录 → 回跳发布页）⑨ **同类扫描登记**：`U1`/M4a design/`M4b-2` 批件的「品牌在顶栏」表述为**当时史实**，已收尾件**不追改**（先例：M1 plan）⑩ **M4b-4 规范同步时点收口（Q11 拍板 A）**：§14 两行原「M4b-4 落地后（统一于 M4b 收尾执行）」**双口径 → 随 M4b-4 落地即改**；待改对象实测 3 处（`05` §6.4:187 授权集行 · `05` §6.4:161 超管行措辞 · `08` §7 ①读面注记 + ②ARCHIVED 运营语义补实）⑪ **本版零实现改动** |
| **v1.47** | 2026-09-18 | sunxuewen-rush | **资产治理入口：个人面/治理面分工修正（用户拍板）** —— ① §7.2 R6 集合语义：`canManageAsset` 同源（owner ∪ `role >= ADMIN` 全站）→ **`asset.ownerId` = 我（owner-only）**，并写明「含全部状态」的理由（owner 找回/恢复隐藏资产的唯一 UI 入口 = G1 本意）② §2.4 **U5** 集合语义入表头 ③ §2.4 **新增 U8**：管理档全站资产治理独立成页 —— 侧栏「管理」组新子项「资产管理」，**归 M4b-6**，本批不预埋条目；服务端写面能力已在、**读面需新增管理档端点**（该批对齐时定契约）④ §4 入口表管理组补「管理看板」+「资产管理」两行（**订正漂移**：管理看板自 2026-09-17 拍板后仅落 §2.4 U1 与真码，§4 表漏列）⑤ §2.2 / §5.1 / §8 / §2.3（拆批行 + backlog 行）同步 ⑥ **自检补正 5 处**（本轮自检发现并当场修）：§2.1 **R6 / R6-a** 措辞（区分「列表面 owner-only」与「详情面授权集」）· §5.2 加 **M4b-6 待补路由登记**（防路由清单静默缺项）· §7.2 **R6-b 口径说明**（为何不随 R6 收窄）· `M4b-1` 批 design「登记」表下游指针订正 1 行 · 头部同步落点清单补全 ⑦ 依据 = 用户 2026-09-18 两条拍板（「我的资产不应看到全站」「管理组加子项资产管理」）⑧ **本版零实现改动** |
| **v1.46** | 2026-09-17 | sunxuewen-rush | M4b-2 收尾二次审计 + 登记表状态收口**—— ① §2.3 批件登记表 **M4b-2 行 → ✅ 完成（2026-09-17 · T1-T15）**（含「收尾二次审计无未决项 · 断言 49/0」）② v1.43 行的「滚动条保留 AIH 6px 细蓝」加**推翻指针**（2026-09-17 滚动条收敛为原生 + 轨道 transparent，见批 design v1.27/v1.28）③ 依据 = 批 design **v1.29** |
| **v1.45** | 2026-09-17 | sunxuewen-rush | **M4b-2 登录默认落点改首页**（用户拍板「按推荐」）—— ① `Login.tsx` 的 `destination` 默认 `/dashboard` → `/`（唯一改点；`next` 优先不变）② 反向守卫与成功跳转共用该值 ⇒ 一致 ③ `RoleGuard` 弹回保持 `/dashboard`（权限语义）④ 依据 = 批 design **v1.26**（断言 **49/0**，+C10）⑤ 本版零实现改动 |
| **v1.44** | 2026-09-17 | sunxuewen-rush | **M4b-2 官方结构 + SiteHeader 对齐 + 图标态闭环同步**——① §12 线框与 §4/§10.2 顶栏口径更新：**顶栏宽 = 内容区宽**（不再全宽）· 品牌移至**侧栏顶部** · 标题语义 **`<h1>`** ② 结构 = 官方 `SidebarProvider > SideNav + SidebarInset`；侧栏 `inset-y-0`；**AIH 覆盖点 2 → 1 处** ③ 图标态闭环 = F4 真因（官方件 `group-data-[collapsible=icon]:w-(--sidebar-width-icon)` 在 **tw 4.3.3 未生成** ⇒ 受控 open + 状态驱动 256↔48）④ 收起态单层底色 · tooltip 统一纯中文 · 滚动条 `scrollbar-gutter:stable` ⑤ 依据 = 批 design **v1.25**（断言 **47/0**）⑥ 本版**零实现改动** |
| **v1.43** | 2026-09-17 | sunxuewen-rush | **M4b-2 侧栏宽 256 + 面板圆角对齐官方（用户拍板 ①保留 ②保留 ③回退）**——① `--sidebar-width` 204 → **256**（官方 16rem；条目宽 214 · 内容区 x 256）② 撤除面板圆角覆盖 ⇒ 官方 floating（圆角 **10px** + 1px border + `shadow-sm`）· **AIH 覆盖点 3 → 2 处** ③ 滚动条**保留 AIH 6px 细蓝**（不随官方原生 15px）〔**⚠️ 本条已被推翻（2026-09-17 v1.45 后：滚动条机制收敛为原生 + 轨道 `transparent`，见批 design v1.27/v1.28）—— 史实值保留，以新条为准**〕④ 依据 = 批 design **v1.24**（实测 `sidebarW=256` `radius=10px` · 断言 **39/0**）⑤ 本版零实现改动 |
| **v1.42** | 2026-09-17 | sunxuewen-rush | **M4b-2 门户组加组标题「门户」+ 14 条全中性底（用户拍板翻转 Q3）**——① §4 注**翻转登记**：2026-09-16 grilling「不加」→ 用户 2026-09-17 拍板**加**（`navigation.groupPortal`；四组结构同构）② §4 现状行同步 ③ §11 键数 **221 → 222**（`navigation` 13 → 14 · 本批净增 **11**）④ 14 条衬底全中性（`--tint-*`/`--type-*` 撤除使用 · token 保留）⑤ 依据 = 批 design **v1.23**（组标题 **4** · 常态衬底种类 **1** · 断言 **39 PASS / 0 FAIL**）⑥ 本版零实现改动 |
| **v1.41** | 2026-09-17 | sunxuewen-rush | **M4b-2 侧栏条目形态统一同步（用户 2026-09-17 拍板）**——① §4「门户组不加组标题」注补**范围澄清**：结构/文案/门槛零改动不变，**条目级形态**经用户拍板统一（门户 4 条 51px 双行 → **32px 单行** + 图标槽 **22×22** 衬底；英文副标降级 hover tooltip）② 依据 = 批 design **v1.22**（§14.4 C 规格 · §14.6 P7 登记 · 实测 14 条逐项相同 · 断言 **38 PASS / 0 FAIL**）③ 本版**零实现改动** |
| **v1.40** | 2026-09-17 | sunxuewen-rush | **M4b-2 UI 重做落地收口（§14 定稿 · T11-T15 ✅）**——① §2.3 登记表 M4b-2 行补 UI 视觉重做 ✅（断言 37/0 · 门户零回归 36/36 + chain-smoke PASS · 证据 + 截图 5 张）② §11 键数实测：全仓 **221 键 / 11 组** · 本批净增 **10 键** · 双语双向差集 0 ③ 零实现改动（实现已在批内落地）|
| **v1.39** | 2026-09-17 | sunxuewen-rush | **M4b-2 UI 重做 Q7/Q9/Q10 同步 + §11 键数当前值 + Status 写实**——① §2.4 U1 补 **页面标题区**（Q7）② §10.2 补 Q7/Q9/Q10 三条（登录/设备全屏版式 · 撤 tab · 去页头 · 语言切换右上角；引用批 design §14.4）③ §11 键数当前值 **134 键 / 9 组**（`login` 10 键）· 净增 **41 → 43**（史实值保留）④ §12 顶栏线框加标题区 + `/login` 线框改双栏 + 图标真值指针⑤ **Status 当前进度写实**（原停 M4b-1 ⇒ 现 M4b-pre/M4b-1/M4b-2/M4b-3 完成 · 下一批 M4b-4）⑥ 零实现改动|
| **v1.38** | 2026-09-17 | sunxuewen-rush | **M4b-6 范围 + 「管理看板」归属登记（用户 2026-09-17 拍板）**——① §2.3 对齐要点表 M4b-6 行补 **`/admin` 管理看板**（内容清单待该批对齐时讨论）② §2.4 U1「管理」组补 **「管理看板」占位条目**（本批只落占位；页面本体归 M4b-6）③ 依据 = M4b-2 批 design §14.7；本版**零实现改动** |
| **v1.37** | 2026-09-17 | sunxuewen-rush | **M4b-3 两条未闭环断言收口**——① §2.3 登记表 M4b-3 行键表净增 **82 → 80 键**（`error.load` ×2 删除；`submissions` 25 · `tokens` 47）② T9④ 侧栏高亮语义 = 工作台精确匹配（`SideNav` 精确匹配集合 = `/` + `/dashboard`）③ **断言 69/69** ④ 激活语义 SSOT 落点说明（本节不含该语义 ⇒ 指向批 design v1.21 + 代码注释）|
| **v1.36** | 2026-09-17 | sunxuewen-rush | **M4b-3 人工验收回写**——§2.3 批件登记表 M4b-3 行补「人工验收 ✅（2026-09-17 用户实机逐条复核通过）」（出口件 ④ 闭合）+ 验收期发现的登录端点「本地短路」缺陷登记（归属 M4b-pre `fb7b4a7`，另立 fix 件）| 
| **v1.35** | 2026-09-16 | sunxuewen-rush | **M4b-3 批次完成回写（出口五件全绿）**：① §2.3 **批件登记表补 M4b-3 行**（该批落地中未回填 —— 体检发现）② 状态列 = ✅ **完成（2026-09-16）**，含提交链 11 项、键表净增 **82**、**零迁移** ③ 批间门五件逐条回写（design 8 维 **9.93** · T1-T10 ✅ · 五门禁 exit 0 · dogfood **39/39 + `NO JS ERRORS`** + 门户 36/36 · 整体审计无未决项）④ 登记待拍板项：`error.load` 孤儿键 ×2；与 `docs/00` **v1.56** 同源 |
| **v1.34** | 2026-09-16 | sunxuewen-rush | **M4b-3 令牌面契约收紧回写**（用户 2026-09-16 拍板：令牌彻底私有）① §7.1「令牌吊销」行：本人 ∨ `SUPER_ADMIN` → **仅本人**（他人含超管 ⇒ 404 防枚举）；依据 = 规范层 `05 §5` 原文本就是「本人」（**代码此前超出规范**）+ 兄弟仓 new-api 同款（`model/token.go:364-375` 按 userId 过滤、无全站令牌接口/页）② `PATCH /api/tokens/:id`（M4b-3 新增）同口径 **仅本人** ③ 如需超管令牌治理能力 ⇒ 另立治理面端点，登记 **M4b-6/M4c 候选**；本版不含实现改动 |
| **v1.33** | 2026-09-16 | sunxuewen-rush | **M4b-3 批 design 定稿 + 登记回写**（用户 2026-09-16「1原型删除 2批准」）① §2.3 拆批表 M4b-3 行范围更新（**类型列** · 操作列 **[👁 查看][↩ 撤回]** 图标化 · 令牌 **6 列** · 编辑/删除 · **`PATCH /api/tokens/:id`** · `assetType`）② §2.3 批件登记表 M4b-3 行回填实际件名（批 design `2026-09-16-m4b3-submissions-and-tokens-design.md` **定稿** · 批 plan `M4b-3-personal-submissions-and-tokens.md` **v0.1**）③ §7.1 契约表：我的提交 + `assetType`；令牌三行 + `name`/`start`/`tail`/`lastRequest`；**新增 `PATCH /api/tokens/:id` 行**；§5.1 令牌行补**编辑**操作 ④ 上游 `docs/00` 升 **v1.54**（§5 M4b-3 行 → 🔵 计划已立）⑤ 原型物料已删除（工作区零残留）⑥ 本版不含实现改动 | 
| **v1.32** | 2026-09-16 | sunxuewen-rush | **M4b-2 出口五件全绿（批次正式完成）**：§2.3 登记表 M4b-2 行
「出口五件」⑤ 列由「④ dogfood ✅ / **观感七项待用户实机确认** 🔶」→ **全部 ✅**（④ = **CDP 自动断言
14 PASS / 0 FAIL + NO JS ERRORS**）。**口径变更**（登记于批 design **v1.14**）：出口件 ④ 的执行方式由
「用户实机逐项确认」改为 **CDP 自动断言**（七项全为功能/行为项；脚本入仓
`docs/smoke/scripts/m4b2-acceptance-checklist.ts`，可重放），人工价值收敛为「**认可结论**」；
用户 2026-09-16 授权代跑并**认可**。⚠️ **审美面不在本批范围**（视觉打磨归 **M4b-7**，已登记于 v1.31）。
**证据**：`docs/smoke/2026-09-16-m4b2-auth-shell.md` §11。本版不含功能/契约改动（验证口径）|
| **v1.31** | 2026-09-16 | sunxuewen-rush | **新增 M4b-7「控制台视觉打磨批」（用户拍板 A）**——① **§2.3 拆批表**加第 **7** 行
（**收尾打磨批**：节奏 / 密度 / 视觉层次 / 微交互 / **全态一致性**（正常·空·载·403）· **控制台三判**；
**零服务端改动**；前置 = **M4b-1…6 全绿**）② **§2.3 编排说明**：依赖链 `1→2→3→4→5→6` → **`→7`**（注释：
M4b-7 不改功能依赖，只在全部功能批落定后做视觉收口）· **完整 converge 与 M4b-7 同批收口** · `docs/00` §5
子行 `M4b-1…6` → **`M4b-1…7`** ③ **★ 新增「视觉职责边界」四条（本版核心 —— 回答「UI 美化在哪对齐」）**：
**体系层** = M4a §4.4（已完成，引用不复制）· **页面视觉定稿层** = M4b 立项**全页可点原型**（11 视图 · R9）·
**逐批落地层** = 各批出口 `dogfood/观感` 只做**合规核对**（**不做审美定稿**）· **视觉收口层** = **M4b-7**
（唯一美化窗口）⇒ 二者职责分离，避免每批重复对齐；某批引入新组件/新交互 ⇒ **该批内就地补录 §4.4 映射**
④ **§2.3 backlog 表**加 M4b-7 行（打磨范围 / 探针切片 / 全态清单 / 偏差审计 / 逐条留痕 / 组件层收敛 /
**不进本批**清单）⑤ **拍板依据**：用户 2026-09-16 就「M4b 的 UI 美化放在哪个阶段做」提问 ⇒ 逐条给出
三条项目事实 + 业界三范式对照 + 推荐（M4b-7）⇒ **用户选 A**。**本版不含功能/契约改动**（拆批编排与职责边界）|
| **v1.30** | 2026-09-16 | sunxuewen-rush | **M4b-2 批次完成（T1-T10 ✅）**：§2.3 登记表 M4b-2 行状态
「🔵 执行中」→ **✅ 完成（2026-09-16）**，回填**收尾版本**（批 design **v1.13** · 批 plan **v0.13**）与
**出口五件**：① 批 design 8 维 ≥9（定稿 **9.44** / converge **9.50**）② **T1-T10 全绿** ③ **五门禁逐项
exit 0**（CI 顺序复现：`install --frozen-lockfile` → `typecheck` → `lint` → `format:check` → `build` →
`db:migrate` → **`CI=true bun run test`**；测试 = **500 pass · 1 skip · 0 fail**（501 例 / 48 文件），与
M4b-pre 基线逐项一致 ⇒ 零回归）④ **dogfood**：门户 `m4a-dogfood` **36/36 + NO JS ERRORS** · chain-smoke
**PASS** · **本批六组**（新建 `m4b2-auth-dogfood.ts`）**24 PASS / 0 FAIL + NO JS ERRORS** ✅ / **观感七项
待用户实机确认** 🔶 ⑤ **整体审计无未决项**（十一维扫描；**F4 关闭**——实测证伪 T4 误报；行数声明订正并
立权威表；旧口径指针 5 处关闭）。**证据文件** `docs/smoke/2026-09-16-m4b2-auth-shell.md`（门禁表 / dogfood
六组 / 种子输出 / 审计十一维 / 行数权威表 / F4 结论 / 出口五件 / 观感清单）。本版不含设计内容改动 |
| **v1.29** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T9 ✅）**：§2.3 登记表 M4b-2 行
「批内进度」由 T1-T8 ✅ → **T1-T9 ✅**（T10 ⬜）。依据 = 批 plan **v0.12** / 批 design **v1.12**：T9 落地
（**i18n 实测键数回填**——批前基线 `0ff0693` **91 键 / 7 组** ⇒ 当前 **132 键 / 9 组** ⇒ **净增 41 键**；
逐组 `login` 8 · `device` 13 · `errors` +12（18 → 21）· `navigation` +3 · `dashboard` +2 · `admin` +1 ·
`common` +2 · `market`/`review` 未变；**内容改动 = 补 3 个服务端实有码** `auth.forbidden` · `auth.oidc_denied` ·
`auth.oidc_state_mismatch` ⇒ 服务端 12 码**覆盖 12/12、缺失 0**；**校验全绿**：双语双向差集 **0** · 占位符
不一致 **0** · 空值 **0** · 门禁四连 · 生产产物零 `M4b-` · 门户零回归 **36/36** · 服务端与协议零改动）。
**本版不含设计内容改动**（进度回填与键数口径回填）|
| **v1.28** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T8 ✅）**：§2.3 登记表 M4b-2 行
「批内进度」由 T1-T7 ✅ → **T1-T8 ✅**（T9-T10 ⬜）。依据 = 批 plan **v0.11** / 批 design **v1.11**：T8 落地
（`pages/Dashboard.tsx` **78 行** = `ComingSoon` 内容槽形态 + 按档位裁剪入口 + `state.notice` 消费 ·
`main.tsx` `/dashboard` 换真页 · i18n `dashboard` **+1 键**）；**六条断言实测**（**档 0 未登录 →
`/login?next=%2Fdashboard`** · **三档入口裁剪**（role=1 → 2 项；10/100 → 3 项）· **零业务请求**（排除壳层
`me`+`stats` 后 = 0）· 过渡件注释 · **`notice` toast + 刷新不重弹** · 门禁四连 · 生产产物零 `M4b-` ·
门户零回归 **36/36** · 服务端与协议零改动）。**1 处口径订正**：「零请求」补**壳层例外**——`/api/stats`
来自 `SideNav.tsx:16` 的门户组计数徽章（**M4a 既有行为**，非本页引入；消除需改门户壳 ⇒ 违反
「门户零回归」⇒ 不采纳）⇒ 订正为「**页面自身**零业务请求」。**本版不含设计内容改动**（进度回填与登记）|
| **v1.27** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T7 ✅）**：§2.3 登记表 M4b-2 行
「批内进度」由 T1-T6 ✅ → **T1-T7 ✅**（T8-T10 ⬜）。依据 = 批 plan **v0.10** / 批 design **v1.10**：T7 落地
（`pages/Device.tsx` **303 行** · 新建跨页件 `components/console/AuthLayout.tsx` · `main.tsx` `/device` 换真页 ·
`api/auth.ts` device 三封装 + OAuth 错误映射 · `ApiError.body` · `auth/next.ts` 的 `devicePath` ·
i18n `device` **13 键**）；**十项断言实测**（四态 · **未登录保码回跳闭环** · 预填+大写归一 · 刷新态 = 终态 ·
**错误体适配不落 `http_400`** · **他人已认领双路** · 门禁四连 · 生产产物零 `M4b-` · 门户零回归 **36/36** ·
服务端与协议零改动）。**4 处契约订正**（★ = 设计缺口）：① ★**未登录判定机制重写**——官方 `GET /device`
**未登录也 200** ⇒ 401 分流不触发且会误报「他人已认领」⇒ 改读会话三态设门 ② `expiresLabel` **无数据源**
（详情接口不返 `expires_in`）⇒ 删键 ⇒ `device` **13 键** ③ 码形态 **8 位无横线** + `scope` 实测 `null`
④ 「他人已认领」**改判 ② 的变体**（GET 响应缺 `client_id` / approve 403）。**本版不含设计内容改动**
（进度回填与登记）|
| **v1.26** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T6 ✅）**：§2.3 登记表
M4b-2 行「批内进度」由 T1-T5 ✅ → **T1-T6 ✅**（T7-T10 ⬜）。依据 = 批 plan **v0.9** / 批 design
**v1.9**：T6 落地——新建 `pages/Login.tsx`（**205 行**）· `main.tsx` `/login` 占位改真页 · i18n
`login` **+8 键** / `errors` **+9 码**（键数 39 → **56**）；**六项断言实测**（独立版式 · 两 tab
（**CDP 真指针**）· **首帧骨架**（`/me` 延迟 1.6s：150-1500ms `sk=4 / form=false`，1650ms 落表单）·
**错口令 inline + URL 不变** · 成功链 → `/dashboard` + `/me` 200 · **反向守卫保码回跳**
`/device?user_code=ABCD-1234` + 非法 next 回落）· 门禁四连 · 生产产物零 `M4b-` · 门户零回归
**36/36**。**连带修正**：**种子脚本改 upsert（A2，用户授权）**——原删+建形态在 `audit_log.actor_id`
有行时恒 **23503**（引用 `"user"` 的外键 = **12 约束 / 9 张表**）；**F5 登记**（OIDC 成功
`/?oidc=success` 门户面零消费 ⇒ 交 M4b 收尾 / M4c）。**本版不含设计内容改动**（进度回填与登记） |
| **v1.25** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T5 ✅）**：§2.3 登记表 M4b-2 行「批内进度」由 T1-T4 ✅ → **T1-T5 ✅**（T6-T10 ⬜）。依据 = 批 plan **v0.8** / 批 design **v1.8**：T5 落地（**减法批**）——`TopBar.tsx` 43 → 41 行（删「登录」占位 + 两个 import）⇒ 顶栏**仅余 4 件** · `SideNav.tsx` 删 `APP_VERSION` 与Footer 三项 ⇒ **Footer 仅余 `UserMenu`** · `navigation` **−4 键**已落（全仓零残留） · 顶栏 58px 与语言切换零变更 · 门户零回归 **36/36**。**本版不含设计内容改动**（进度回填） |
| **v1.24** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T4 ✅）**：§2.3 登记表 M4b-2 行「批内进度」由 T1-T3 ✅ → **T1-T4 ✅**（T5-T10 ⬜）。依据 = 批 plan **v0.7** / 批 design **v1.7**：T4 落地（`ui/UserMenu.tsx` 新建 · `SideNav.tsx` 加三组 · **四档显隐全绿** · UserMenu 四态含 loading 无闪现 · **登出链实测全通**（含 T1 件缺陷修复）· 门户零回归 **36/36**）；**F4 登记**（图标态部分 `group-data-[collapsible=icon]` 变体未生效，待深挖）。**本版不含设计内容改动**（进度回填） |