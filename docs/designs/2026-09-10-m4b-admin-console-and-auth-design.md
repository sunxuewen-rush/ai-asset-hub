# M4b 管理后台与认证设计

> Date: 2026-09-10
> Updated: 2026-09-16（**v1.27：M4b-2 批内执行进度回填（T1-T7 ✅）**——§2.3 登记表 M4b-2 行「批内进度」
T1-T6 → **T1-T7 ✅**（T8-T10 ⬜）；依据 = 批 plan **v0.10** / 批 design **v1.10** 的 T7 落地登记（设备授权页
`pages/Device.tsx` **303 行** + 跨页件 `AuthLayout` · **四态 + 保码回跳闭环 + 刷新态 + 他人已认领双路**
全实测 · 门户零回归 **36/36** · **4 处契约订正**：未登录判定改读会话三态 / `expiresLabel` 无数据源删除
/ 码形态与 `scope` 实测写实 / 他人已认领改判 ② 变体）；**v1.26：M4b-2 批内执行进度回填（T1-T6 ✅）**——§2.3 登记表 M4b-2 行「批内进度」
T1-T5 → **T1-T6 ✅**（T7-T10 ⬜）；依据 = 批 plan **v0.9** / 批 design **v1.9** 的 T6 落地登记（登录页
`pages/Login.tsx` **205 行** · 六项断言实测含 **首帧骨架**（`/me` 延迟 1.6s 采样）· **错口令 inline + URL
不变** · **反向守卫保码回跳** · 门户零回归 **36/36** · **种子脚本改 upsert（A2）**）；**v1.25：M4b-2
批内执行进度回填（T1-T5 ✅）**——§2.3 登记表 M4b-2 行「批内进度」T1-T4 → **T1-T5 ✅**（T6-T10 ⬜）；依据 = 批 plan **v0.8** / 批 design **v1.8** 的 T5 落地登记（减法批：`TopBar` 43 → 41 行仅余 4 件 · 侧栏 Footer 仅余用户区 · `navigation` −4 键已落 · 门户零回归 **36/36**）；**v1.24：M4b-2 批内执行进度回填（T1-T4 ✅）**——§2.3 登记表 M4b-2 行「批内进度」T1-T3 → **T1-T4 ✅**（T5-T10 ⬜）；依据 = 批 plan **v0.7** / 批 design **v1.7** 的 T4 落地登记（**四档侧栏显隐全绿** · UserMenu 四态 · 门户零回归 **36/36** · 登出链实测全通）；**v1.23：M4b-2 批内执行进度回填（T1-T3 ✅）**——§2.3 登记表 M4b-2 行：状态「计划已立」→ **🔵 执行中（T1-T3 ✅）**；**版本列与 i18n 键数去硬值**（改指「以其版本头 / 批 design §10 为准」——沿用 docs/00 v1.24/v1.26 既有纪律，防批内每 Task 迭代反复漂移）；依据 = 批 design **v1.6** / 批 plan **v0.6** 的 T3 落地登记（路由 **11 条** · 真浏览器 **4/4** + **role=1** 实测 · 门禁四连 · 门户零回归 **36/36**）；**v1.22：批 plan 立项回写 + 401 接线点口径订正**——§2.3 批件登记表 M4b-2 行回填（批 design **v1.2** / 批 plan **v0.2** / 状态 → 🔵 **计划已立**）· §2.4 U3 分流单点 **`apiGet` 层 → `doFetch` 层**（`apiGet`/`apiPost` 共用底层）+ `sanitizeNext` 落点补注；依据 = **深度档评审**（三合一 15 维 + 深度 4 维 + 四轮审查法）findings **D1/D2**；**v1.21：文件更名**——`2026-09-10-m4b-admin-console-design` → **`2026-09-10-m4b-admin-console-and-auth-design`**（标题 →「M4b 管理后台与认证设计」）；理由 = 拆批后本文件为主 design、范围含认证与壳，原名窄于内容；全仓引用同步 + `docs/00` v1.42。纯更名，零内容改动；**v1.20：第五轮体检 D 组（3 项）+ grilling 13 项决策回写**——i18n 组口径按真码统一为「**既有 7 组 + 新增 2 组**」（四处）· `errors` 补码 **10 → 9**（`auth.rate_limited` M4a 已落）· §7.1 补 `label.slug_taken`/`label.definition_limit_exceeded` · U3 反向守卫 = **`next` 优先** · **G6 已决 = B+ 新标签页直跳** · 门户组**不加组标题**；**v1.19：B 组订正（K3/K4/N2，用户拍板「按推荐来」）**——新增 **§3.4 设备授权页基址与 dev 口径**（`PUBLIC_BASE_URL` 保持 API 源语义；dev 双源以 web 源直达 + 手输码为准；两项不采纳留痕）· §2.4 U3 补 **`PROTECTED_PREFIXES` 4 前缀**（`/dashboard` `/admin` `/reviews` `/device`）+ 锁 **401 接线点 = `apiGet` 层单点**（`useApi` 零改动）+ `sanitizeNext` 支持带 query；**v1.18：第三/四轮体检订正 A 组（K1/K2/K5/N1/N4/N5/N8/N10）**——口径升级为**契约级（design vs 真码）+ 深度档四轮审查**：§7.1 补设备授权三行契约 + 错误族 + §7.2 G5/G6；`REGISTRATION_ENABLED` 真码默认 `true` 订正；§7.1 补 `review:approve` scope；§4 补门户组（表/线框/真码三向一致）+ 显隐组合；§6.3「零改动」清单误列 `TopBar`/`SideNav` 订正为改造件；OIDC 实测路径入 §3.1（未配置 404 JSON · 成功 302 `/?oidc=success` 不经 `next`）；**v1.17：M4b-2 立项前第二轮体检订正（G1-G17）**——跨节口径统一（路由 **11 条** / i18n **五组** / audit **27** / 线框 **10 张**）；组件树补 4 件（`auth/roles.ts` · `UserMenu.tsx` · `ComingSoon.tsx` · `pages/Device.tsx`）；`app.ts:101-119` 引用修正；401 分流口径统一（§9 ↔ §2.4 U3）；「待拍板」残留清除（已落值 40/560）；**v1.16：M4b-2 立项对齐（P1-P12）+ 主 design 契约订正（F1-F14）**——认证契约订正（登录 → `POST /api/auth/sign-in/aih` · 登出 → `POST /api/auth/sign-out`；死引用 `auth/routes.ts`/`db/schema/users.ts` 清除；audit 动作 **25 → 27** 实测）；§3.0 增「认证栈实现载体」行；**设备授权页 `/device` 归 M4b-2**；侧栏两组 → **三组**；**用户区落侧栏底部**（顶栏只剩品牌+触发钮+语言）；i18n 三组 → **五组**；组件树删 `RequireAuth`、增 `UserMenu`/`ComingSoon`；§12 线框 **10 张 / 11 视图**）；**v1.15：M4b-pre 批次完成（出口五件全绿）**——§2.3 批件登记表 M4b-pre 行 → **✅ 完成**（design **v2.4** · plan **v0.14** · 五件全绿；**出口件 ④ = 本批不适用（移交 M4b-2）**：零 UI 改动且登录面未交付）；**M4b-2 行登记「前置已满足 ⇒ 可开工对齐」+ 立项必核现状项**（`TopBar` 占位件 → 真认证入口 + `/login` + `AuthProvider`；出口件 ④ 承接）；上游 `docs/00` 升 **v1.34**；**v1.14：M4b-pre 代码完成回写（T8）**——§2.3 批件登记表 M4b-pre 行回填**收尾版本**（design **v2.3** · plan **v0.13**）与**出口五件终态**（① converge 8 维 **9.5** ② T1-T8 全绿 ③ 五门禁逐项 exit 0 ⑤ 整体审计十一维无未决项 修 8/口径登记 6；**④ dogfood/观感 ⏳ 待用户** H1/H2）；九提交与 CI #41-#49 入表；上游 `docs/00` 升 **v1.33**（M4b-pre 行 → 🔵 代码完成 + 硬证据 `docs/smoke/2026-09-15-m4b-pre.md`）；**v1.13：M4b-pre 执行期登记（T1-T6 落地 + 规范层同步）**——§2.3 批件登记表 M4b-pre 行回填**实际版本**（design **v2.1** · plan **v0.11**）与**五件进度**（① design 8 维 ≥9 ✅ ② T1-T6 ✅ / T7-T8 ⬜ ③ 五门禁 ✅ ④ dogfood/观感 ⬜（T8）⑤ 整体审计 ⬜（T8）），七个提交与 CI 号段入表；上游 `docs/00` 升 **v1.32**（含规范层 `05` v1.9 / `08` v1.6 改写登记 + M4c/M5 实证注记）；**v1.12：M4b-pre 立项登记（设计定稿批准 + 计划立项）**——§2.3 批件登记表 M4b-pre 行回填实际件名：批 design `2026-09-15-m4b-pre-auth-migration-design.md`（定稿 · 8 维 **9.44** · 已批准）· 批 plan `M4b-pre-auth-migration.md`（**v0.2** 立项 · T1-T9）· 状态 ⬜ **计划已立**（spike ✅ X1-X8 全通过）；上游 `docs/00` 升 **v1.30**；**v1.11：认证整车迁移前置 + M4b 暂停（用户 2026-09-15 拍板 A）**——§2.3 批件登记表：**M4b-2** 由「对齐中」→ **⏸ 暂停**（认证底座以 **M4b-pre** 结论为前置；M4b 整体顺延；本批未动工零代码），并新增 **M4b-pre** 行（状态 ⬜ 评估中；**spike 裁定前不立 design/plan**，定案后回填实际件名）。上游 `docs/00` 升 **v1.29**。**文档落点（拍板 A）**：规范层 `05`/`08` 原地改写 · 认证面实现（服务端/CLI/设备授权页）· **M1 及其两 plan 为历史执行档案不回改**（**唯一例外**：M1 design 仅加「后继变更指针」两行、不改任何结论 ⇒ 升 **v1.3**） · 本次「技术选型」另立 design + plan；**实证依据**（细节不入库）：企业目录通道可取**真实邮箱** ⇒ 官方 `user.email` 必填可满足 · 权限码 `resource:action` 与官方 api-key 权限模型 **1:1** · 官方 Hono 接缝与既有会话中间件 **同构** · **会话为进程内内存**（重启即全员登出）⇒ 采纳顺带修缺陷；**v1.10：文档形态旧口径订正 + 「批件登记表」落档（用户 2026-09-14 拍板「按你的建议来」）**——① **旧口径订正 2 处**：§1「流程定位」与 §7.2 尾的单数「M4b plan」→「**批 plan（逐批立）**」（查证：M4b 单块 plan **从未创建**——全历史 `docs/plans/` 无该文件、`--diff-filter=D` 零删除记录、落档提交 c91a21a 自注 *m4b shelved*；拆批时以「逐批 design + 逐批 plan」取代其意图，故属**旧意图残留**而非漏删文件）② §2.3 增 **「批件登记表」**：登记各批**实际** design/plan 文件名 + 版本 + 状态 + 批间门五件（M4b-1 已回填，M4b-2 标「对齐中」，M4b-3…6 待回填）——兼作「主 ↔ 批」双向查询点与批间门执行台账（计划名见 backlog 表，**实际名以本表为准**）；**v1.9：批间门升为「出口五件」（整体审计入环）+ M4b-1 审计结果回写**——① §2.3 批间门由 **出口四件** → **出口五件**：`批 design 8 维 ≥9 定稿` + `批 plan Task 全绿` + `五门禁` + `dogfood/观感` + **`整体审计`（收尾全仓覆盖式扫描：findings 逐条登记 + 处置）**；同节「出口口径」行同步（承 M4a T17-T26 惯例，流程定案见 `docs/00` §5/§7 ②）② M4b-1 批审计闭合：findings **8 项**（修 1 / 订正 1 / 回填 1 / 口径登记 5，无未决项）⇒ 批 design **v1.6** · 批 plan **v0.13**（登记表见批 plan §3；含 §6.4 `--radius-2xl` 候选剔除订正 —— 本文件 §12 同步项表内该类行的口径随批 plan 走）；**v1.7：版本八态映射闭合（用户拍板）**——§10.1 八态映射补齐 `UPLOADED` = warning
> （原只列 7 态、该态无据可从）+ `YANKED` destructive → **secondary**（对标 21-skillhub：`SkillVersionStatus`
> 八态同源 · 列表页 `UPLOADED` 归 review 档 · 详情页 `YANKED` 归灰档）⇒ `StatusPill` 映射与批 plan T6
> 断言同步，M4a design 门户侧口径订正 `destructive` → `neutral`；**v1.6：口径统一 + 版本引用去硬值 + 状态回写**——① 官方件口径统一为「**新落仓 11 件（表列 13 项）**」（原写「补装 13 件」= 表列编号数，与实测 11 件混用）② 依赖口径统一为「**4 个包 / 3 组**」（原「3 项」按组计数、实测为 4 个包）③ 批 design / 批 plan 内对本文件的 5 处硬版本引用去值（改「版本随主 design 演进，以其版本头为准」）；本文件内 `M4a design v0.20` 硬值与旧「待拍板」口径同步去除 ④ 头部 3 条 `> Updated:` 合并为 1 条累积式（对齐 `docs/00` 写法）+ **Status 去重写**（删 v1.4/v1.2 变更摘要与「定稿条件」双写；修正过期项「待拍板 40/48 · 384/560」与「M4b 尚不进入实现」）⑤ 状态回写：M4b-1 = 批 design **v1.2** · 批 plan **v0.2** · **T1 ✅ / T2-T8 待执行** ⑥ §2.3「出口口径」与「批间门」去重（前者指向后者）；**v1.5：拆批文档模型落定**——① **主 design（跨批不变层）↔ 批 design** 术语与模型确立（本文件 = 主 design；批内决策另立批 design，批内内容随批迁出、本文件留指针）② §2.3 增 **批间门**（上一批出口四件全绿才启下一批）+ **各批预期产出物与对齐要点**（粗粒度 backlog，不预建空文件）③ §5.1/§5.2/§7.3/§8/§10.2/§12/§14 增**批归属标记** ④ Status 重写为「主 design 定稿条件：① ✅ ② ⬜（随 M4b-5）③ ✅」⑤ 修跨文档版本引用漂移（`M4a design v0.20` → 去硬版本号；**v1.4：子里程碑拆批 + M4b-1 地基批落档（用户 2026-09-14 拍板）**——① M4b 拆为 **M4b-1…M4b-6** 六批（§2.3 拆批表：地基 → 认证壳 → 个人面 A → 个人面 B（唯一含服务端改动）→ 审核面 → 治理面）② **M4b-1 设计块另立** `docs/designs/2026-09-14-m4b1-console-foundation-design.md` v1.0（组件归位 14 处 / 官方件新落仓 11 件（表列 13 项） / 控制台面域 6 件 / 跨面 4 件 / 合规清理 4 项）+ 其 plan `docs/plans/M4b-1-console-foundation.md` v0.1（T1-T8）③ 新增 §2.4 **对齐决策登记**（U1-U7 壳/登录/会话/工作台/资产/抽屉/提交 + P1-P5 + 官方件硬规则）④ 修 §12 尾部两处缺陷（重复行 + 「8 个页面」口径 → **8 张线框 / 9 视图**，`/login` 线框随 M4b-2 补）⑤ 控制台特有值落值（表格密度 **40** / 抽屉宽 **560**）⑥ §8 登记加性变更 `reviewComment`（→ M4b-3）；**v1.3：视觉体系切换对齐（用户 2026-09-11 拍板）**——全站统一 **shadcn 蓝科技**，**视觉真值 SSOT 移交 M4a design §4.4**（本文件 §10.1 改为引用 + 只记控制台特有值）；§6.1 依赖/§6.2 组件树（shadcn 原语落位）/§3.1/§10.2/§13/§14/§15 同步；**顺序翻转**：原「先控制台面」→ 现「先门户换皮 → 再 M4b」（M4b 依赖 M4a 视觉体系切换先行，故本文件本期只做**对齐**、不动实现）；控制台特有值 2 项（表格密度 / 抽屉宽）**待拍板**，本版不落值；**v1.2：范围调整（用户 2026-09-10 拍板 A）**——§2.1 **R3 翻转**（用户管理移出 → M4c「账号与权限治理」）· §2.2 In/Out 与 §3.0 阶段对照 · §14 同步项与漂移登记 · §15 记录；v1.1：入口分层修正（恢复已拍板两层架构）+ 环节 0 收口 + 8 维自检 9.4**——`/dashboard/*` 个人面 + `/admin/*` 治理面 · 共享详情 `/reviews/:id` · 组件面域 `console/` · 新增 §5.1 页面职责矩阵 + §12 第 8 张线框；**详细变更见 §15**。v1.0：按 M4-pre 扁平化模型整体重写；v0.3/v0.2/v0.1：见 §15）
> Status: 草稿（**主 design（跨批不变层）**——拆批后本文件只保留跨批不变层（里程碑范围 / 模型与角色契约 / 路由清单 / 视觉基线归属 / 拆批表 §2.3 / 决策登记 §2.4 / 接口变更总览 §8）；批内决策另立**批 design**（命名与迁移规则见 `docs/designs/README.md`）。**主 design 定稿条件**：① **视觉体系收敛 ✅ 已闭合**（视觉真值 SSOT = M4a design §4.4，版本随 M4a 演进、以其版本头为准；控制台特有值已落值：表格密度 **40** / 抽屉宽 **560**）② **三族适用性实证 ⬜ 随 M4b-5**（审核详情分型 manifest 卡）③ **grilling ✅ 已闭环**（R1-R9 + 补充锁定 5 条）⇒ ② 闭合后由用户批准转定稿。**当前进度**：进入实现——**M4b-1 地基批**（批 design / 批 plan **版本以其各自版本头为准** · **T1-T8 ✅ 2026-09-14 代码完成**——五门禁/双冒烟/marker/§9 六条全绿，**观感复看 ✅ 用户复核通过**；T1-T7 已推送），其余五批待对齐；批间门见 §2.3）
> Scope: M4b（00 §5）——管理与治理后台：审核队列 · 标签管理 · 资产生命周期 · 令牌 · 审计浏览；真实登录与会话（角色感知）；zh/en 双语；复用 M4a 组件基建
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

- **21-skillhub 源码**（Apache-2.0，本地 `/Users/xuewensun/04-ws/21-skillhub`）：
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
| R2 | 发布/上传流 | **不入首期**（后端端点已齐 `POST /api/assets` + `POST /:slug/versions`；前端 multipart/进度/校验映射基建会稀释治理闭环收敛，单列后置） |
| R3′ | 用户管理 | **不入 M4b —— 已移出至 M4c「账号与权限治理」**（2026-09-10 用户拍板 A 翻转原 R3）：服务端用户管理 HTTP 面为零（M1 期实现：`UserService` 仅 register/localLogin——**该文件已随 M4b-pre T3 迁移删除**），且改角色/启停/建号需与「准入策略 `ACCESS_POLICY`（现仅实现 `open`，`config/env.ts:36,104-105`）/ 重置密码 / 强制登出（Session 按用户吊销）」一并设计——同属**新机制**，打包 M4c（`docs/00` §5 已加行；**范围档位候选见该行**，M4c 立项时定档）。数据侧无需迁移（`user_account.status/role` 与索引已就绪，`db/schema/auth.ts`（官方 6 表）+ 08 §3）。**M4b 内不建用户管理页**；M4c 落地前角色分配仍靠 `SEED_ADMIN_*` + 手工 SQL（M4-pre P3） |
| R4 | 登录方式 | 本地账号密码（LDAP 复用同一密码通道，05 §3.1）+ 登出；OIDC 仅保留入口跳转（服务端授权码流已就绪） |
| R5 | 角色感知 | **沿用 M4-pre 已交付契约**：`GET /api/auth/me` → `{ user: { id, displayName }, role: number }`（`role ∈ 0/1/10/100`）；前端按 `role >= N` 显隐。**本项零服务端改动**（重构前拟的「平台角色数组」方案已废弃，§15） |
| R6 | 非 ACTIVE 资产的发现与恢复 | **新增「我可管理的资产」读面**（§7.2 R6）——公开面 `GET /api/assets` 与写面端点**零改动** |
| R6-a | 非 ACTIVE 可见范围 | **owner 本人 / 管理档（`role >= ADMIN`）/ 超管** 可见自己管理域内的 HIDDEN/ARCHIVED 资产（判定同 `canManageAsset`：`owner 本人 ∨ role >= ADMIN`，05 §6.2/§6.4） |
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
- 标签管理：定义 CRUD + 多语言翻译（固定 `zh-CN`/`en`）+ 两级树 + 行内上/下移排序 + 上限提示（超管面）
- 资产生命周期：我可管理的资产列表（状态筛选）+ 状态治理 + 版本管理（yank/删除）+
  资产删除 + 标签挂载
- 令牌管理：签发（scope/有效期，明文一次展示）/ 列表 / 吊销
- 审计浏览：日志列表 + 八维过滤
- i18n：**既有 7 组**（`navigation` / `market` / `common` / `errors` + **M4b-1 已落骨架的** `dashboard` / `admin` / `review`）之上，M4b-2 新增 `login` / `device` **两组**（07 §3；2026-09-16 按真码 `i18n/zh.ts` 实测订正——原「新增五组」口径作废，登记 §14）
- 服务端最小支撑：R6（`GET /api/me/assets` 新增）+ R6-b（读面授权集扩）

**Out（后置，不混入）**：自助注册入口（M4b-pre 后注册端点为官方 `sign-up/email`，由
`REGISTRATION_ENABLED` 控制——`better-auth.ts:79-80` `disableSignUp: !REGISTRATION_ENABLED`；
**该开关无公开端点暴露** ⇒ 前端无法感知注册是否开启；**真码默认 `true`（开启）**——`env.ts:35`
与 `.env.example:19` 均为 `true`（2026-09-16 实测；原「默认关闭」表述订正），企业自托管按惯例置
`false`、由管理员建号（seed / 用户管理面）；若需开放自助注册，须一并新增开关暴露端点，
属后置议题）· 资产发布/上传流（R2）· **用户管理面（R3 → 已移出至 M4c「账号与权限治理」**：列表/改角色/启停/建号 + 准入策略 `ACCESS_POLICY` + 重置密码 + 强制登出；`docs/00` §5 M4c 行）· 提升申请
（`promotion` 权限码与端点均未建，`promotion_request` 表 08 §9 蓝图随对应服务引入）·
排序切换/社交面（M4a 已 out）· 安全扫描面（AIH 版本态 SCANNING 为扫描扩展点，
clawhub 的 scan/moderation 面为独立议题）· 自定义版本通道 stable/beta（M3 明确后置）·
空间管理（M4-pre 已整体删除，无回归议题）· ~~Device Flow 确认网页~~ —— **已改判归 M4b-2**（2026-09-16 用户拍板；原「M4c 或随 M5 CLI」口径作废，见 §3.0/§5.1/§5.2）

### 2.3 子里程碑拆批（2026-09-14 用户拍板：M4b 拆为六批，一个一个对齐与实现）

> 拆分维度 = **依赖顺序 + 可独立交付 + 服务端改动隔离**。每批走同构流程：
> 对齐（逐条过 UI 与契约）→ 该批 design 定稿（8 维 ≥9）→ 立 plan → 实现 + 自检 ≥9 → 门禁/冒烟 → 追踪表注记。

| 批 | 主题 | 范围要点 | 服务端改动 | 前置 |
|----|------|---------|-----------|------|
| **M4b-1** | **地基批：组件归位 + 控制台组件面域** | 手搓展示件 → 官方件 14 处 · 官方件**新落仓 11 件（表列 13 项）** · `components/console/` 6 件 · 跨面 4 件 · 合规清理 4 项 · i18n 骨架 | **零** | — |
| **M4b-2** | 认证与壳批 | 登录页（官方 `Card`+`Field` 装配 + 常规/OAuth 两 tab；`login-03` demo **不落仓**）· 设备授权页 `/device` · `AuthProvider`（loading/anon/authed）· 401 三分类分流 + 反向守卫 + `sanitizeNext` · 角色判定单点 `auth/roles.ts` · 登出 · `next` 白名单 · SideNav **三组** + 条目级门槛 · 路由骨架（11 条 + `ComingSoon` 占位；`/dashboard` 先落**临时落地页**——与 `ComingSoon` **同一件**、内容由 props 决定，M4b-4 替换为三卡）· 直访守卫 · **用户区（侧栏底部）**· 「系统设置」/「用户管理」占位条目 | **零** | M4b-1 |
| **M4b-3** | 个人面 A | 我的提交（task 状态列 + 仅 PENDING 可撤回 + 二次确认）· 我的令牌（明文一次性 + 吊销） | **加性**：`ReviewListItem.reviewComment`（§8 R6-c） | M4b-1/2 |
| **M4b-4** | 个人面 B（**唯一含读面改动**） | `GET /api/me/assets`（R6）+ R6-b 授权集扩展 + 测试更新 · 我的资产列表 · 资产管理抽屉（状态治理/标签挂载/版本管理/危险区）· 工作台 landing（角色感知三卡） | **2 处**（§8 R6/R6-b） | M4b-1/2 |
| **M4b-5** | 审核批 | `/admin/reviews` 队列 · `/reviews/:id` 共享详情（分型 manifest 卡 + 文件树 + 预览 + 通过/拒绝/撤回 + 防自审交互） | **零** | M4b-1/2 |
| **M4b-6** | 治理批 | 标签管理（两级树 CRUD + zh-CN/en 翻译 + 行内上/下移 + 上限提示）· 审计浏览（八维过滤 + `action` 分组下拉 + 日期区间用官方 `Calendar`） | **零** | M4b-1/2 |

**编排说明**：
- 顺序即依赖链 **1 → 2 → 3 → 4 → 5 → 6**（M4b-1 是所有批的组件底座；M4b-2 是所有页面的认证底座）；
  3/4 与 5/6 之间可微调先后
- **文档形态**：**主 design**（本文件）保留模型/契约/路由/视觉基线；**每批另立 design 块 + plan 文件**
  （命名 `docs/designs/YYYY-MM-DD-<批>-design.md` / `docs/plans/<批>-<主题>.md`）
- **出口口径**：见下行「批间门」（**五件全绿**）；**完整 converge 放到 M4b 全部子批收尾**（避免六次重评）
- **`docs/00` §5**：M4b 行下加 M4b-1…M4b-6 子行（状态唯一源不变）
- **批间门（gate）**：上一批**出口五件**全绿才启下一批 —— `批 design 8 维 ≥9 定稿` + `批 plan Task 全绿` + `五门禁` + `dogfood/观感` + **`整体审计`**（收尾全仓覆盖式扫描：findings 逐条登记 + 处置「修 / 订正 / 回填 / 口径登记」，不留未决项）；未达标不进入下一批（各批 plan §1「前置」引用本条；先例 M4a T17-T26 · M4b-1 批 plan §3）
- **批内内容迁移规则**：某批对齐时把该批专属内容（拍板 / 规格 / UI 变动 / 线框）从本文件**迁出到该批 design**，本文件留指针；§2.4 决策登记同规则（落地即转指针，不复制内容）

**各批预期产出物与对齐要点（粗粒度 backlog——不预建空文件，到批才立）**

| 批 | 预期 design | 预期 plan | 对齐要点（立项时逐条过） |
|----|------------|----------|------------------------|
| M4b-2 | `YYYY-MM-DD-m4b2-auth-shell-design.md` | `M4b-2-auth-shell.md` | 登录页两 tab（官方 `Tabs` + `field`）· **设备授权页 `/device`** · `AuthProvider` 三态与首帧不闪 · 401 三分类分流 + 反向守卫 · 角色判定单点 · SideNav **三组** + 组标题 + 条目门槛 · 路由骨架 + `ComingSoon` · 直访守卫与轻提示 · **用户区（侧栏底部）** · 占位条目交互 · **`/login` / `/device` 线框补图** |
| M4b-3 | `YYYY-MM-DD-m4b3-personal-a-design.md` | `M4b-3-personal-submissions-tokens.md` | 我的提交列集合与 **task 状态**文案 · 撤回仅 PENDING + `AlertDialog` · `reviewComment` **加性字段**（服务端 + 用例）· 令牌签发（明文一次性）/ 吊销 · 表格三态 |
| M4b-4 | `YYYY-MM-DD-m4b4-personal-b-design.md` | `M4b-4-me-assets-and-console.md` | **R6 端点契约**与分页 · **R6-b 授权集**与测试更新 · 工作台三卡与角色裁剪 · 我的资产六列（显式 `status=ALL`）· 抽屉四段与守卫禁用（yank 需原因 / owner 不可 yank / 版本删除按状态）· 标签选择器（`Popover`+`Command`）· 版本列表懒加载 · dogfood 多角色数据准备 |
| M4b-5 | `YYYY-MM-DD-m4b5-review-workbench-design.md` | `M4b-5-review-workbench.md` | 队列列集合与状态过滤 · 共享详情路由与权限面 · **分型 manifest 卡（三族）** · 文件树 + 预览（官方 `Dialog`）· 三动作 + 防自审交互 · 拒绝必填原因 · 端点权限与 token scope 交叉验证 |
| M4b-6 | `YYYY-MM-DD-m4b6-governance-design.md` | `M4b-6-labels-and-audit.md` | 标签两级树 CRUD + 固定 zh-CN/en 翻译 + 行内上/下移（`PUT /order`）+ 上限 100 提示 · 审计八维过滤 + `action` 分组下拉（27 个动作）+ 日期区间（官方 `Calendar`）· 分页 |

**批件登记表（实际落地件与状态——每批落地后回填）**

| 批 | 批 design（实际文件名） | 批 plan（实际文件名） | 版本 | 状态 | 批间门（五件） |
|----|------------------------|----------------------|------|------|----------------|
| **M4b-pre** | `2026-09-15-m4b-pre-auth-migration-design.md` | `M4b-pre-auth-migration.md` | design **v2.4**（批次收口后） · plan **v0.14** | ✅ **完成（2026-09-15）**——spike **✅ X1-X8 全通过** · design 定稿并整体批准（8 维 **9.44**；T2-T8 落地回写至 **v2.3**）· 九个提交 `fd58de0`/`a7ce23e`/`fb7b4a7`/`7b8ea11`/`b76e978`/`a6c2c5a`/`50b0c52`/`52f8156` + T8，**CI #41-#49 全绿**；全量测试 **501 例 0 fail**；批内自绘面 = 企业目录凭证插件 + 业务面同源守卫 + api-key 适配层 + `/me` 薄层（理由见 design §1.4/§2.3 P14/P6-P7） | ✅ **五件全绿** ① design 8 维 ≥9（converge **9.5**）② T1-T8 全绿 ③ 五门禁逐项 exit 0 ⑤ 整体审计十一维无未决项（修 8 / 口径登记 6）· **④ dogfood/观感 = 本批不适用（移交 M4b-2）**——零 UI 改动且登录面未交付（`TopBar` 占位件 + 无 `/login` 路由），登记为 M4b-2 出口件 |
| **M4b-1** | `2026-09-14-m4b1-console-foundation-design.md` | `M4b-1-console-foundation.md` | design **v1.6** · plan **v0.14** | ✅ 批完成 2026-09-14 | ✅ 五件全绿 —— ① design 8 维 ≥9（定稿 9.63 / 审计轮 9.81）② T1-T8 全绿 ③ 五门禁逐项 exit 0 ④ dogfood 36/36 + NO JS ERRORS + 观感复核通过 ⑤ 整体审计 F1-F8（无未决） |
| **M4b-2** | `2026-09-16-m4b2-auth-shell-design.md` | `M4b-2-auth-shell.md` | design / plan **版本以其版本头为准** | 🔵 **执行中（2026-09-16）**——**批内进度：T1-T7 ✅**（T8-T10 ⬜）·**前置已满足（M4b-pre ✅ 2026-09-15）**；grilling **13 项决策**（Q1-Q13 逐条按推荐拍板）· 入口现状 **8 项真码实证** · 件规格（新建 **9** / 改造 **6** / 不改 4 类）· 路由 **11 条**（3 真页 + 1 重定向 + 7 占位）· 认证机制（`doFetch` 单点 401 四分类 · `sanitizeNext` 保码 · `hasRole` 单点）· 出口件④ **七项** · dogfood **六组** · i18n **键数以其 §10 口径为准**（+9 码）。**立项对齐必核现状项（M4b-pre 移交）**：`TopBar.tsx:33-39` 的「登录」是**占位 `<span>`（无 `onClick`/`href`）**、路由表**无 `/login`** ⇒ 本批入口改造 = 占位件 → 真认证入口 + `/login` 页 + `AuthProvider`；**出口件 ④（dogfood/观感）自 M4b-pre 移交本批** | ⬜ 五件待执行 |
| M4b-3…M4b-6 | ⬜ 待落地回填 | ⬜ 待落地回填 | — | ⬜ 待对齐 | ⬜ |

> **说明**：① 上表「各批预期产出物」= 立项时的**计划名**，主题词可在落地时按实际范围微调；
> **实际名以本表为准**——本表即「主 ↔ 批」的双向查询点（查「这批的 design/plan 到底叫什么、几点几版、什么状态」）。
> ② M4b-1 落档早于本 backlog 表（拆批时即定稿），故 backlog 无其行，其名亦以本表为准。
> ③ 本表同时是**批间门执行台账**（第五件 = 整体审计，口径见 §2.3 上条与 `docs/00` §5/§7 ②）。

### 2.4 对齐决策登记（2026-09-14 逐条对齐产物）

> 本表登记**跨批的壳/交互决策**（逐条经用户拍板）；各批 design 只引用、不复制。

**U1 壳与导航**（→ M4b-2；**2026-09-16 修订：两组 → 三组 + 用户区落侧栏底部**）：`SidebarGroup` + `SidebarGroupLabel` **三组**（「个人」/「管理」/「超级管理」）·
未登录「个人」组整组不渲染 · 图标态隐藏组标题 · `AuthProvider` 为本批最先落地的基建（`Toaster` 已于 M4b-1 落仓并挂根——`main.tsx:45`）·
「管理」组 `role >= 10`（**审核队列 + 审计浏览**）· 「超级管理」组 `role >= 100`（**标签管理 + 系统设置 + 用户管理**）——
**标签管理 = 超管（2026-09-14 修正回超管，服务端 `labels.ts:56-62 assertSuperAdmin` 为硬门）**；「系统设置」为占位条目：
仅显示 + 点击弹 Phase 2 提示，不建页面；「用户管理」→ M4c ·
`me` 未返回前三组均不渲染（防首帧闪烁）· **用户区（未登录「登录」入口 / 已登录用户菜单）落侧栏底部 `SidebarFooter`**
（2026-09-16 用户拍板）——顶栏只留品牌 + 侧栏触发钮 + 语言切换器；侧栏底部同时**移除**产品元信息三项
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

**U5 我的资产**（→ M4b-4）：列集合固定 **6 列**（资产名+slug / 类型 / 状态 / 版本 / 更新 / 动作）·
类型列 = 类型色小块 + 文案 · **筛选默认「全部」须显式发 `status=ALL`**（防名实不符）·
`?status=&q=&page=` URL 化（复用 `useMarketQuery`，不新建 hook）· debounce 300ms · 空态两套文案 ·
⋯ 菜单（打开抽屉 / 恢复(仅非 ACTIVE) / 隐藏或归档 / 标签挂载 / ── / 删除）· `<1100px` 横向滚动不卡片化

**U6 资产管理抽屉**（→ M4b-4）：四段（状态治理 / 标签挂载 / 版本列表 / 危险区）· 状态治理 = **按当前状态给动作按钮** ·
标签 = `Popover` + `Command` 可搜索（+`cmdk`）+ chips × 移除 + 10 个上限 · 版本列表紧凑 + 懒加载 ·
危险区常驻但按守卫禁用 · 宽 **560** · 写后局部重取 + Toaster；**三处服务端守卫须在 UI 体现**：
yank 需 **输入原因**（`reason` 必填）· **owner 不可 yank**（仅 `role ≥ 10`）· 版本删除按状态禁用
（PUBLISHED/PENDING_REVIEW/YANKED 禁删）

**U7 我的提交**（→ M4b-3）：状态列 = **review task 状态**（PENDING/APPROVED/REJECTED/WITHDRAWN 中文自然语）·
筛选含 WITHDRAWN · **撤回仅 PENDING 行可用**（其余「—」）+ `AlertDialog` 二次确认 ·
列表露出**拒绝原因**（服务端加性字段，§8 R6-c）· 整行可点进 `/reviews/:id`

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

SideNav 在**既有门户组**（首页 `/` · 技能中心 `/skills` · MCP `/mcps` · 专家 `/agents`——M4a 交付，现状为**无组标题平铺** 4 条，`SideNav.tsx:53-58`）之上，新增**三组**
（**2026-09-16 用户拍板：两组 → 三组**），组级显隐 + 条目级 role 门槛
（机制同 new-api `use-sidebar-view`；Den 的「组内无可见条目 ⇒ 整组不渲染」同构）：
> **门户组不加组标题（2026-09-16 grilling 拍板）**：保持 M4a 现状**无标题平铺** ⇒ 视觉语义 =「门户 = 一级入口、三组 = 登录后分区」；加标题会动门户面（违「零回归」硬约束）。

| 组 | 组级显隐 | 条目 | 条目可见条件 |
|----|---------|------|-------------|
| **门户**（M4a 既有，**保留**） | **恒显示**（未登录亦显示） | 首页 `/` · 技能中心 `/skills` · MCP `/mcps` · 专家 `/agents` | 任何访客 |
| **个人** | 已登录（未登录整组不渲染） | 工作台 `/dashboard` | 任何登录用户 |
| | | 我的资产 `/dashboard/assets` | 任何登录用户 |
| | | 我的提交 `/dashboard/submissions` | 任何登录用户 |
| | | 我的令牌 `/dashboard/tokens` | 任何登录用户 |
| **管理** | `role >= ADMIN`（10；未达整组不渲染） | 审核队列 `/admin/reviews` | `role >= ADMIN`（10） |
| | | 审计浏览 `/admin/audit` | `role >= ADMIN`（10） |
| **超级管理** | `role >= SUPER_ADMIN`（100；未达整组不渲染） | 标签管理 `/admin/labels` | `role >= SUPER_ADMIN`（100） |
| | | 系统设置（占位条目：点击弹提示，不建页面） | `role >= SUPER_ADMIN`（100） |
| | | 用户管理（占位条目 → M4c） | `role >= SUPER_ADMIN`（100） |

> **显隐组合（表 / §12 线框 / 真码三向一致锚点）**：未登录 = 门户组 + 侧栏底部「登录」入口（三组全不渲染）；`role = 1` = 门户 + 「个人」+ 用户菜单；`role = 10` = + 「管理」；`role = 100` = + 「超级管理」。

顶栏：只留品牌 + 侧栏触发钮 + 语言切换器。**用户区落侧栏底部 `SidebarFooter`**（2026-09-16 用户拍板）——
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
> **归属批（2026-09-14 拆批）**：`/login` → **M4b-2** · `/dashboard` → **M4b-4** · `/dashboard/assets` → **M4b-4** · `/dashboard/submissions` → **M4b-3** · `/dashboard/tokens` → **M4b-3** · `/reviews/:id` → **M4b-5** · `/admin`（重定向）与 `/admin/reviews` → **M4b-5** · `/admin/labels` → **M4b-6** · `/admin/audit` → **M4b-6**


| 路由 | 页面职责 | 用户 | 关键动作 | 主要接口 |
|------|---------|------|---------|---------|
| `/login` | 认证 | 未登录 | 本地/LDAP 登录 · OIDC 入口跳转 | `POST /api/auth/sign-in/aih` · `GET /api/auth/oidc/authorize` |
| `/dashboard` | 工作台 landing | 任何登录用户 | 三项计数卡 → 跳对应列表（`role < 10` 只发「我的资产」1 个请求） | `GET /api/reviews?status=PENDING&limit=1` · `GET /api/me/assets?status=ALL&limit=1` · `GET /api/audit?limit=5` |
| `/dashboard/assets` | 我的资产（我可管理的集合） | 任何登录用户 | 状态筛选 · 恢复/隐藏/归档 · 标签挂载 · 版本删除/yank · 删资产（全在抽屉内） | `GET /api/me/assets`（R6 新增）· `PATCH /:slug/status` · `PUT`/`DELETE /:slug/labels/:labelSlug` · `DELETE /:slug/versions/:version` · `POST /:slug/versions/:version/yank` · `DELETE /:slug` |
| `/dashboard/submissions` | 我的提交 | 任何登录用户 | 看自己的提审 · **撤回**（仅本人/owner/管理档） | `GET /api/reviews/mine` · `POST /api/reviews/:id/withdraw` |
| `/dashboard/tokens` | 我的令牌 | 任何登录用户 | 签发（明文仅一次）· 吊销 | `GET`/`POST /api/tokens` · `DELETE /api/tokens/:id` |
| `/reviews/:id` | 审核详情（**共享路由**） | 管理档 ∨ 提交人本人 | manifest 分型卡 + 文件树 + 预览 · 通过/拒绝/撤回 | `GET /api/reviews/:id` · `GET /api/assets/:slug/versions/:version/files/*` · `POST /api/reviews/:id/approve`／`reject`／`withdraw` |
| `/admin` | 重定向 | 管理档 | → `/admin/reviews`（治理面无 landing） | — |
| `/admin/reviews` | 审核队列（全站单队列） | `role >= 10` | 状态过滤 · 分页 · 进详情 | `GET /api/reviews?status=` |
| `/admin/labels` | 标签管理 | 超管（100） | 两级树 CRUD · 翻译（zh-CN/en）· 上/下移排序 | `GET /api/labels/all` · `POST`/`PATCH`/`DELETE /api/labels` · `PUT /api/labels/order` |
| `/admin/audit` | 审计浏览 | `role >= 10` | 八维过滤 · 分页 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=` |
| `/device` | 设备授权确认（CLI 设备流） | 任何登录用户 | 输入/校验 user_code → 认领 → 批准 / 拒绝 | `GET /api/auth/device?user_code=` · `POST /api/auth/device/approve`／`deny` |

> **入口可见性（谁在导航上看得到）以 §4 为唯一源**；本节只定义页面职责与数据来源（防两处漂移）。
> `/device` 的**页面基址与 dev 口径**见 §3.4（引用不复制）。

### 5.2 路由清单（除 `/login` 外均在既有 AppShell 的 `<Outlet/>` 区）
> **归属批（2026-09-14 拆批）**：同 §5.1 逐行映射（登录 → M4b-2；submissions/tokens → M4b-3；dashboard/** → M4b-4；审核两路由 → M4b-5；labels/audit → M4b-6）


```text
/login                        登录（独立版式，不进 AppShell 分组）
/device                       设备授权确认（独立版式；`?user_code=` 或手输）
/dashboard                    个人工作台 landing（角色感知卡片——§7.3 编排）
/dashboard/assets             我的资产：列表 + 状态筛选 + 抽屉
/dashboard/submissions        我的提交：列表 + 撤回
/dashboard/tokens             我的令牌：列表 + 签发 + 吊销
/reviews/:id                  审核详情（共享：管理档自队列进、提交人自我的提交进）
/admin                        → 重定向 /admin/reviews
/admin/reviews                审核队列
/admin/labels                 标签管理
/admin/audit                  审计浏览
```

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
│   ├── assets/                AssetAdminTable.tsx · AssetDrawer.tsx · AssetVersionList.tsx
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
  `TopBar`（**删**产品元信息三项与 `TypeIcon` 残留 → 只留品牌 + 侧栏触发钮 + 语言切换器）·
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
| 我的提交 | `GET /api/reviews/mine?status=&limit=&offset=` | 登录（身份面） | 同上 items 形状 | `http/reviews.ts:69-86` |
| 审核详情 | `GET /api/reviews/:id` | 管理档 ∨ 提交人本人（否则 403 `review.access_denied`；不存在 404 `review.not_found`） | `ReviewListItem + {manifestJson, files:[{filePath,fileSize,sha256}]}` | `http/reviews.ts:89-98` · `review/query.ts:46-50` |
| 通过/拒绝 | `POST /api/reviews/:id/approve`（`{comment?}`）· `POST /:id/reject`（`{comment}` 必填） | 管理档 `role >= ADMIN` + 防自审（05 §6.4，超管例外）；token scope `review:approve`（`auth/token-scopes.ts:17`） | 200 `{taskId,status,version}` | `http/reviews.ts:101-143` · `auth/rbac.ts:70` |
| 撤回提审 | `POST /api/reviews/:id/withdraw` | 提交人本人 / asset owner / 管理档（服务内判定） | 204 | `http/reviews.ts:146-160` |
| 标签公开列表 | `GET /api/labels` | 匿名 | `Label[]`（displayName 回退 Accept-Language→en→slug） | `http/labels.ts:65-69` |
| 标签全量 | `GET /api/labels/all` | `role >= SUPER_ADMIN` | `ManagedLabel[]`：`{id,slug,type,visibleInFilter,sortOrder,parentId(父 slug),translations:[{locale,displayName}]}` | `http/labels.ts:72-75` |
| 标签 CRUD | `POST /api/labels` · `PATCH /api/labels/:slug` · `DELETE /api/labels/:slug` | `role >= SUPER_ADMIN` | 同上单条；slug 冲突 → 409 `label.slug_taken`；**定义总数上限 100** → `label.definition_limit_exceeded`；删除带子级 → `label.parent.has_children`（三码见 `labels/errors.ts:9,11,19`） | `http/labels.ts:77-121` |
| 标签排序 | `PUT /api/labels/order` | `role >= SUPER_ADMIN` | 204 | `http/labels.ts:123-131` |
| 标签挂载 | `PUT`/`DELETE /api/assets/:slug/labels/:labelSlug` | RECOMMENDED = `canManageAsset`（owner 本人 ∨ `role >= ADMIN`）；PRIVILEGED = 超管 | 幂等（重复挂 204 / 移除不存在 204）；≤10 → `label.limit_exceeded` | `http/assets.ts:709-763` · `assets/manage.ts:19-22` |
| 令牌列表 | `GET /api/tokens` | 登录（仅本人） | `{items:[{id,scope,expiresAt,revokedAt,createdAt}]}`（库中仅 sha256，无掩码字段） | `http/tokens.ts:87-102` |
| 令牌签发 | `POST /api/tokens`（`{scope?:string[], expiresInDays?}`） | 登录 | 201 `{id,token,expiresAt}`——**明文仅此一次** | `http/tokens.ts:41-82` |
| 令牌吊销 | `DELETE /api/tokens/:id` | 本人 ∨ `role >= SUPER_ADMIN`；幂等 204；他人 token 视同 404 防枚举 | 204 | `http/tokens.ts:105-141` |
| 审计 | `GET /api/audit?action=&targetType=&targetId=&actorId=&requestId=&clientIp=&from=&to=&limit=&offset=` | 管理档 `role >= ADMIN`（token scope `audit:read` 交集） | `{items:[audit_log 全列],total,limit,offset}`，createdAt desc + id desc 稳定分页 | `http/audit.ts:45-55` |
| 公开统计 | `GET /api/stats` | 匿名 | 公开聚合（活跃资产计数等） | `http/stats.ts:11-14` |
| 资产列表 | `GET /api/assets?limit=&offset=&type=&q=&label=` | **匿名**（读面恒「活跃资产」面，与 viewer 无关） | `{items:AssetItem[],total,limit,offset}`；项含 latest 投影 + ownerDisplayName | `http/assets.ts:75-83,256-283` · `assets/service.ts:173-177` |
| 资产注册 | `POST /api/assets`（`{slug,type}`） | 登录（`role >= USER`；token scope `asset:publish`） | 201 单条 AssetItem | `http/assets.ts:92-95,221-253` |
| 资产详情 | `GET /api/assets/:slug` | ACTIVE 匿名；非 ACTIVE **当前仅超管**（其余含 owner/管理档同 404 `asset.not_found`）——**R6-b 后扩为授权集，见 §7.2** | AssetItem + `labels[]` | `http/assets.ts:163-176,290-299` |
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
| G1 | 非 ACTIVE 资产不进任何列表（匿名/owner/管理档/超管一致——`listViewableAssets` 硬条件 `status='ACTIVE'`） | R6：新增「我可管理的资产」读面 |
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

**处置 R6：新增「我可管理的资产」读面**

```
GET /api/me/assets?status=ACTIVE|HIDDEN|ARCHIVED|ALL&q=<kw>&limit=&offset=
  （requireAuth；默认 status=ACTIVE、limit=20、offset=0）
  200 { items: AssetItem[], total, limit, offset }
```

- **集合语义** = 我可管理的资产（`canManageAsset`（`assets/manage.ts:19-22`）同源，
  05 §6.2/§6.4）：owner 本人 ∪（`role >= ADMIN` → 全站）
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
  `/api/me/assets?status=ALL&limit=1` 取 total（含隐藏/归档——与线框「含 N 隐藏」一致）∥
  `/api/audit?limit=5`）——**按角色裁剪**（`role < 10` 不发审核/审计两请求，避免必然 403；
  只渲染「我的资产」卡）
- 列表页：单请求 + `useApi` 语言感知缓存；筛选变更 → 重置 offset=1 页（沿用 M4a 修复录
  「筛选/搜索 page 回落 1」纪律）
- 审核详情：单请求（`GET /api/reviews/:id` 已含 manifest + 文件清单）→ 文件点击经既有
  `GET .../versions/:version/files/*` 拉内容进预览对话框（`useApi` 缓存复用）
- 资产管理：列表请求 + 抽屉内动作后**局部重取**（不整页刷新）；版本列表懒加载
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
| R6 | 新增 | `GET /api/me/assets` | 「我可管理的资产」读面（§7.2 契约）；公开面零改动 |
| R6-b | 修改 | `assertAssetReadable` 授权集 | 非 ACTIVE 详情/版本/文件/下载面：授权集（owner 本人 / 管理档 / 超管）放行，其余仍 404（§7.2；§14 同步 05 §6.4 + 08 §7） |

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
- **版本八态 → token 映射**（控制台特有，**2026-09-14 用户拍板定死**——对标 21-skillhub）：`PUBLISHED`
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
> **归属批（2026-09-14 拆批）**：审核详情（核心工作台）→ **M4b-5** · 资产管理抽屉 → **M4b-4** · 标签管理 → **M4b-6** · 个人工作台 → **M4b-4** · 状态语义可视化（`StatusPill` 落件于 M4b-1、各批消费）→ **跨批** · 品牌/语言切换 · 响应式 · 空错态文案 → **跨批**


- **审核详情**是核心工作台：左主列 = manifest 摘要卡 + 文件树（`ui/FileTree`）+
  文件预览对话框；右栏 = task 元信息（坐标/版本/提交人/时间）+ 动作区（通过/拒绝/撤回）
  - **manifest 卡按 type 分型（三族适用性——M4a T15 实证的族协议差异）**：skill 族主文档
    `SKILL.md`（必需）；mcp 族 `mcp.json` / `README.md`（可选）；agent 族 `agent.md` /
    `README.md`（可选）——复用 M4a `OverviewTab` 的分型探测与回退逻辑（大小写归一 + 缺失
    回退结构化摘要），审核人看到的摘要形态随类型自适应，不空窗
- **资产管理抽屉**：状态治理（含恢复）+ 标签挂载 + 版本列表（yank/删除）+
  危险区（删除资产，说明"有已发布/已撤回版本时不可删除"）
- **标签管理**：两级树 + 定义 CRUD + 翻译（**固定 `zh-CN`/`en` 两行**）+ **行内上/下移**排序
  （改序后批量提交 `PUT /api/labels/order`；不做拖拽——零新增依赖）
- **个人工作台**：角色感知卡片（见 §7.3 编排）+ 卡片动作槽跳转对应列表页
- **状态语义可视化**：`StatusPill` 统一呈现资产三态（ACTIVE = success / HIDDEN = warning /
  ARCHIVED = muted-foreground）、版本八态——**色值取 M4a §4.4 ② 补丁 token**（不复制，映射表见 §10.1）
- 品牌显示名「AI X Hub」沿用（R8）；语言切换器沿用（控制台面与门户共用 i18n 机制）
- **响应式**：控制台表格窄屏（<1100px）→ 容器横向滚动（保留列完整，**不做卡片化**——控制台场景
  列信息密度优先）；抽屉窄屏 → 全宽侧滑；侧栏 <900px 折叠为图标态（沿用 M4a 断点体系）
- **关键空/错态文案（示例，非硬编码——zh 真源 / en 对齐）**：「暂无待审任务」·
  「未找到匹配的资产 · 试试切换状态筛选」·「该资产有已发布版本，不能删除」·
  「会话已过期，请重新登录」（401 拦截文案）·「标签定义已达上限 100 个」

## 11. i18n 资源规划（07 §3）

**组清单（2026-09-16 按真码 `i18n/zh.ts` / `en.ts` 实测订正）**：既有 **7 组** + M4b-2 新增 **2 组**（zh 真源 / en 完整对齐、缺键即编译错，纪律同 M4a）。

**M4b-2 新增（2 组）**：

- `login`：登录页（两 tab / 表单文案 / 提交中 / 失败与校验提示）
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
┌ AI X Hub                        🌐 中|EN              ┐  ← 顶栏：品牌 + 触发钮 + 语言
│ ⌂首页 ✦技能中心 ⚙MCP ◈专家                            │
│ ─ 个人 ─────────────────────────────────────────────  │
│  ▤ 工作台  ◫ 我的资产  ⇪ 我的提交  ⛁ 我的令牌          │
│ ─ 管理 ─（role>=10 才渲染）──────────────────────────  │
│  ⚖ 审核队列  ☰ 审计浏览                                │
│ ─ 超级管理 ─（role>=100 才渲染）─────────────────────  │
│  ⌗ 标签管理  ⚙ 系统设置  ☺ 用户管理                    │
│                                                        │
│  [👤 孙学文 ▾]  ← 用户区（侧栏底部；未登录为「登录」）  │
├────────────────────────────────────────────────────────┤
│ 工作台                                                  │
│ ┌待审核────┐┌我的资产──┐┌最近审计──────────────┐      │
│ │    3     ││   12     ││ auth.login.success    │      │
│ │ 待处理   ││ 含2隐藏  ││ asset.status_update   │      │
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

标签管理 `/admin/labels`（超管面：两级树 + 编辑 + 翻译 + 上/下移）：

```text
│ 标签管理                                    [+ 新建标签]   │
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

登录 `/login`（独立版式：无侧栏；两 tab + 语言切换器；失败 = 表单内 inline 错误条）：

```text
┌────────────────────────────────────────────────────────┐
│                    AI X Hub            🌐 中|EN        │
│                                                        │
│        ┌──────────────────────────────────────┐        │
│        │  登录                                 │        │
│        │  ┌ 常规登录 ┬ OAuth 登录 ┐            │        │
│        │  │ [用户名            ]              │        │
│        │  │ [密码              ]              │        │
│        │  │ ⚠ 用户名或密码错误（inline 错误条）│        │
│        │  │ [      登录（提交中… Spinner）   ] │        │
│        │  └──────────────────────────────────┘ │        │
│        └──────────────────────────────────────┘        │
└────────────────────────────────────────────────────────┘
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
> §12 覆盖**全部 10 张线框**（示意数据非设计硬值；`/login` 与 `/device` 于 2026-09-16 补图）。M4b 路由实为
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
- 对标源：`/Users/xuewensun/04-ws/21-skillhub`（MeController / MySkillAppService /
  controller/admin/* / web/src/pages/dashboard/my-skill-filters.ts）·
  `https://clawhub.ai/api/v1/openapi.json`（2026-09-10 实测，27 端点）
- 视觉参照（公开）：**shadcn/ui**（v4，MIT；本机对照仓 `00-ui` = 官方仓 fork）——**视觉体系真值源**，
  取值见 M4a design §4.4（引用不复制）；skillhub 管理面——`21-skillhub/web/src/pages/admin/{audit-log,labels,users}.tsx`
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
| `05` §6.4 | **R6-b** 非 ACTIVE 读面授权集注记（owner 本人 / 管理档 / 超管可读）——修改 M4-pre 已同步的「仅超管」行 | **M4b-4 落地后**（规范同步统一于 M4b 收尾执行） |
| `08` §7 | ① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）；② **ARCHIVED 语义补实**——当前与 HIDDEN 判定同构（`status !== 'ACTIVE'`），建议写明「HIDDEN = 临时下架/可恢复；ARCHIVED = 长期退役/停止维护」的运营语义分界 | **M4b-4 落地后**（规范同步统一于 M4b 收尾执行） |
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

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
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
| **v1.23** | 2026-09-16 | sunxuewen-rush | **M4b-2 批内执行进度回填（T1-T3 ✅）**：① **§2.3 登记表 M4b-2 行**——状态「🔵 计划已立」→ **🔵 执行中（2026-09-16）· 批内进度 T1-T3 ✅**（T4-T10 ⬜）② **版本列与 i18n 键数去硬值**：`design v1.2 · plan v0.2` → **「版本以其版本头为准」**；`i18n 净增 32 键 + 9 码` → **「键数以其 §10 口径为准（+9 码）」**——理由 = 批内每 Task 迭代都会推进批件版本与键数（T3 已把批 design 推到 v1.6 / 批 plan v0.6、键数 32 → 34），硬值必致跨文档漂移；纪律先例 = `docs/00` v1.24/v1.26 对 M4b-1 批件的「硬版本引用去值」③ **批间门（五件）栏不变**（⬜ 五件待执行——批未收尾）④ 依据 = 批 plan v0.6 T3 落地记录（路由 **11 条** · **真浏览器 4/4** · **role=1 实测**（`/admin*` → 落 `/dashboard`）· 门禁四连 · 门户零回归 **36/36**）。**本版不含设计内容改动**（登记表状态与去硬值） |
| **v1.22** | 2026-09-16 | sunxuewen-rush | **批 plan 立项回写 + 401 接线点口径订正（深度档评审 D1/D2）**：① **§2.3 批件登记表 M4b-2 行回填**——批 design `2026-09-16-m4b2-auth-shell-design.md`（**v1.2**）· 批 plan `M4b-2-auth-shell.md`（**v0.2**）· 状态「对齐完成（待批准立项）」→ **🔵 计划已立**（件规格 新建 9/改造 6 · 路由 11 条 · 出口件④ 七项 · dogfood 六组 · i18n 净增 32 键 + 9 码入表；原「立项对齐必核现状项（M4b-pre 移交）」保留）；**批间门（五件）栏 = ⬜ 五件待执行** ② **§2.4 U3 401 接线点口径订正**：分流单点 `apiGet` 层 → **`doFetch` 层**（`apiGet` 与新增 `apiPost` 的共用底层 = N2「单点」拍板在 M4b-2 的落地细化，与批 design §4.2 对齐）· 同节 `sanitizeNext` 补**落点**（`auth/next.ts`）③ **依据**：对批 design/plan 的**深度档评审**（三合一 15 维 + 深度 4 维 + **四轮审查法**）四方对账 findings——**D1**（批件登记表未随批 design 落档 / plan 立项回填，主↔批双向查询点失真）· **D2**（跨文档落点口径不一）；本轮**无其他内容改动** |
| **v1.21** | 2026-09-16 | sunxuewen-rush | **文件更名（用户 2026-09-16 拍板）**：`2026-09-10-m4b-admin-console-design.md` → **`2026-09-10-m4b-admin-console-and-auth-design.md`**；标题同步 →「**M4b 管理后台与认证设计**」。理由：拆批后本文件为主 design（跨批不变层），内容含**认证与壳**（M4b-pre 认证整车迁移 + M4b-2 登录页/设备授权页/角色感知壳），原名「管理后台」窄于实际范围；新名与 M4a 的 `m4a-marketplace-portal-design`（里程碑 + 内容）同构，且一看可知覆盖两块内容。**同步面**：全仓引用（含追踪表 `docs/00`、各批 design/plan、smoke 记录）统一改新名；`docs/00` 升 **v1.42**。**本版无内容改动**（纯更名）；8 维自检**重评 9.5**（8 维全 9.5；设计内容不变，更名收益 = 可发现性 / 命名一致性。**覆盖缺口同轮闭合 2 项**：`README` 门面句措辞同步 · 已收口件中的主 design 行号引用保留史实、不追改〔现真值 `:33`/`:671`〕） |
| **v1.20** | 2026-09-16 | sunxuewen-rush | **第五轮体检 D 组订正（3 项）+ grilling 13 项决策回写**——① **i18n 组口径按真码统一**（`i18n/zh.ts`/`en.ts` 实测 **7 组**）：§2.2 In / §6.4 / §11 / §14 四处「新增五组」→ **既有 7 组 + M4b-2 新增 2 组**（`login`/`device`）；§11 整块重写为「新增 2 组 + 既有 7 组（M4a 落 4 / **M4b-1 已落骨架 3**：`dashboard` 4 键 / `admin` 6 键 / `review` 5 键）」，并补 `dashboard` 需补 `submissions` 等键、`navigation` 组标题 3 键与**待删 4 键**（真码现状吻合 P11）② **`errors` 补码数订正 10 → 9**（真码 `errors` 组**已有 `auth.rate_limited`**；全量 `auth.*` **12 个**见 `auth/errors.ts:6-21`，本批实补 **8 个** + `oidc.not_configured`）③ **§7.1 标签 CRUD 补两码**（409 `label.slug_taken` · `label.definition_limit_exceeded` 定义上限 100——`labels/errors.ts:9,11,19`）④ **grilling 决策回写 3 项**：U3 反向守卫 = **`next` 优先**（保住 `/device?user_code=` 深链）· §7.2 G6 = ✅ **已决 B+ 新标签页直跳**（不做前置探测；`next` 对 OIDC 不适用）· §4 = 门户组**不加组标题**（零回归）。**grilling 其余 10 项批内决策**（10 Task 切分 / 3 真页+1 重定向+7 占位 / `/device` 完整实现 / `/dashboard` role 裁剪 / 占位页 DEV-only 批次号 / dogfood 六组断言 / 出口件④ 七项 / 3 种子账号 / 壳先渲染 + 第③类仅登录表单 / 不做原型）落 **M4b-2 批 design §2 拍板表** |
| **v1.19** | 2026-09-16 | sunxuewen-rush | **B 组订正（K3/K4/N2，用户 2026-09-16 拍板「按推荐来」）**——① **新增 §3.4「设备授权页基址与 dev 口径」**（K3 = 推荐 A）：`PUBLIC_BASE_URL` **保持 API 源语义**（官方 `baseURL` / OIDC 回调推导源 / `trustedOrigins` 自动项，**不为 dev 双源妥协**）；生产反代同源 ⇒ 无需处理；dev 双源以 **web 源直达 + 手输/复制码**（`http://localhost:5173/device?user_code=…`）为准；**两项不采纳留痕**（dev 改指 web 源会带偏 OIDC 回调；API 代管违反零服务端改动）+ §5.1 与 §12 加指针② **§2.4 U3 补 `PROTECTED_PREFIXES` 清单**（K4 = 是）：`/dashboard` · `/admin` · `/reviews` · `/device` **4 个**（与 §5.2 路由同源；其余为公开段，401 静默 anon）③ **§2.4 U3 锁 401 接线点**（N2 = 推荐）：**单点在 `api/client.ts` 的 `apiGet` 层**，拦截后调 `AuthProvider` 注册的 `onUnauthorized`；`useApi` 保持通用薄 hook 零改动（`useApi.ts:17-47` 现状）＋ `sanitizeNext` 支持带 query 的站内相对路径。**本轮后 K/N 系列全部闭合**（⚪ N7 交互重叠态按主 design 纯度纪律留给批 design） |
| **v1.18** | 2026-09-16 | sunxuewen-rush | **第三/四轮体检订正 A 组（K1/K2/K5/N1/N4/N5/N8/N10）**——口径：**契约级**（design 声明 vs 服务端真码）+ **深度档四轮审查**（R1 清单 / R2 无预设通读 / R3 UI 视角 / R4 三刀法）。① **K1** §7.1 补**设备授权·认领/批准/拒绝**三行契约（实测 `http/device-flow.test.ts:156-165` + `app.ts:145-185`：`{user_code,status:'pending',client_id,scope}` · `{success:true}` · **须先认领**否则 400 `DEVICE_CODE_NOT_CLAIMED`）+ CLI 两端与**轮询错误族**（`authorization_pending`/`slow_down`/`expired_token`/`access_denied`/`invalid_grant`）+ §7.2 登记 **G5**（原三处「见 §7.1」悬空引用闭合）② **K2** §2.2 Out：`REGISTRATION_ENABLED` 订正为**真码默认 `true`（`env.ts:35`/`.env.example:19`）**、`disableSignUp: !REGISTRATION_ENABLED`（`better-auth.ts:79-80`）、注册端点为官方 `sign-up/email`（原「`POST /api/auth/register` 存在」「默认关闭」两处订正）③ **K5** §7.1 通过/拒绝行补 **token scope `review:approve`**（`auth/token-scopes.ts:17`，原漏第 5 个 scope 码）④ **N1** §4 补**门户组**（M4a 既有 4 条，`SideNav.tsx:53-58` 无组标题平铺）为表格首行 + 说明句 + **显隐组合锚点段**（表/§12 线框/真码三向一致）⑤ **N5** §6.3 「零改动」清单**误列** `TopBar`/`SideNav` 订正为**改造件**（与 §2.4 U1「删产品元信息三项 / 加三组 / 清 `APP_VERSION`」自洽）⑥ **N10** §2.4 U1 「`Toaster` 与 `AuthProvider` 为本批最先落地」→ **仅 `AuthProvider`**（`Toaster` 已于 M4b-1 落仓，`main.tsx:45`）⑦ **N4** 占位机制统一：`/dashboard` 临时落地页 = `ComingSoon` **同件不同 props**（§2.3 + §6.2 双写）⑧ **N8** §3.1 补 OIDC **实测路径**（未配置=404 JSON / callback 失败=JSON 错误体 / 成功=302 `/?oidc=success` **不经 `next`**）+ §7.2 登记 **G6**（OIDC 成败路径与 `/login` 约定的缺口 → M4b-2 批内决策）。**未决（待拍板）**：K3 dev 双源基址 / K4 `PROTECTED_PREFIXES` / N2 401 接线点 |
| **v1.17** | 2026-09-16 | sunxuewen-rush | **M4b-2 立项前第二轮体检订正（G1-G17）**——方法升级后（全量 `file:line` **语义回读** + 硬数字实测 + 跨节口径对照 + 修订记录声明回查实体）揭出 17 项，本轮全修：① **跨节口径统一**——§6.4 规模预估「10 条路由条目 / 3 i18n 资源组」→ **11 条（含 2 独立版式）/ 5 组**（G1/G2）· §2.2 In i18n 组补 `login`/`device`（G3）· §2.3 backlog M4b-6「25 个动作」→ **27**（G7）· §12 头部「现有 8 张 / `/login` 待 M4b-2 补」→ **10 张 / 11 视图已补**（G6）· R9/§10.1「9 视图」→ **11 视图**（G14）② **引用修正**——§7.1 表尾注 `app.ts:82-100`（回读为 `AppDeps`/`createApp`）→ **`app.ts:101-119`**（`// 统一错误出口` + `app.onError` 实测行）（G4）；表头核对日期改「业务面 2026-09-10 · 认证面 2026-09-16 重核」（G17）③ **§9 401 口径**「全局拦截重定向」→ **按 §2.4 U3 三分类分流**（消除与决策登记的矛盾）（G5）④ **「待拍板」残留清除**——§10.1 表格密度/抽屉宽改「**已取 40 / 560**（2026-09-14 拍板）」（G8）+ R9 同步（G9）⑤ **§6.2 组件树补 4 件**（`auth/roles.ts` · `ui/UserMenu.tsx` · `console/ComingSoon.tsx` · `pages/Device.tsx`）——修正 v1.16 修订记录「已增 `UserMenu`/`ComingSoon`」的**声明与实体不符**（G11）⑥ **§2.4 U3 补 P7 三改**（反向守卫 / `sanitizeNext` / 首帧预热）（G12）⑦ §3.1 三路分派表述去重（G15）· §14 时点列口径澄清（G16）· 头部 `**v1.15：**v1.15：` 排版破损修复 + CI 号段 **#41-#48 → #41-#49**（G10/G13）。**实测通过项**：audit 动作 **27 个**（常量表 `audit/audit.ts:5-20` 9 条 + 业务面散落 18 条，分域逐项吻合）· 60 处引用除 G4 外全部语义正确 |
| **v1.16** | 2026-09-16 | sunxuewen-rush | **M4b-2 立项对齐（P1-P12）+ 主 design 契约订正（F1-F14）**：① **认证契约订正**（M4b-pre 整车迁移的正文同步）——登录 `POST /api/auth/sign-in/aih` · 登出 `POST /api/auth/sign-out` · `/me` 薄层改指 `http/auth-routes.ts:17-28`；死引用 `auth/routes.ts`（8 处）与 `db/schema/users.ts`（4 处）清除；行号漂移修正（`auth/rbac.ts:70` · `config/env.ts:36,104-105`）；**audit 动作 25 → 27 实测**（+`device.deny` / `ldap.provisioned`，并收敛 3 处散落字面量）② §3.0 增「认证栈实现载体」行（better-auth 官方整车 + 自绘目录凭证插件 + 业务面同源守卫）③ **设备授权页 `/device` 归 M4b-2**（原「M4c 或随 M5 CLI」作废；§2.2/§3.0/§5.1/§5.2/§11/§12 同步）④ **侧栏两组 → 三组**（个人 / 管理 / 超级管理；标签管理移入超级管理组）⑤ **用户区落侧栏底部**（顶栏只留品牌 + 触发钮 + 语言；侧栏底部移除产品元信息三项）⑥ **i18n 三组 → 五组**（+`login` / `device`；`errors` 补 10 码；文案分层口径）⑦ **组件树删 `RequireAuth`**（`RoleGuard(minRole=USER)` 覆盖其语义）+ 增 `UserMenu` / `ComingSoon` ⑧ §12 线框补 `/login`、`/device`（**10 张 / 11 视图**）· §13 引用清单 · §14 规范同步项同步。**本轮体检**：订正前 8 维 **8.4**（未达门，根因 = M4b-pre 收尾未同步主 design 正文契约） |
| v0.1 | 2026-09-10 | sunxuewen-rush | 初稿：立项对齐产物——范围拍板 R1-R9（档 B/发布流后置/用户管理后置/本地+LDAP 登录/`/me` 补角色/`/admin/*` 复用壳/品牌沿用/精简视觉流程）；R6 缺口实证（探针 9/9）与处置（新增 `GET /api/me/assets` + 详情面授权集放宽 R6-b）；对标 21-skillhub 源码（admin 面/MeController filter 枚举/HIDDEN 超管校验）与 clawhub.ai 官方契约（无 hide/archive，soft delete + moderation 轴） |
| v0.2 | 2026-09-10 | sunxuewen-rush | 8 维自检修复（8.6 → 重评）：🔴4 + 🟡8 全修——① `POST /api/namespaces` 权限对齐源码（`ASSET_ADMIN` 平台角色，非 asset:publish）② `canManageAsset` 归属修正（`assets/manage.ts`）③ §6.1 依赖段与 §6.3 的 diff 表述矛盾消除（明确不引入 diff 依赖、组件群不迁移）④ `/admin/reviews` 入口改「任何登录用户 + 按角色渲染 tab」，消除 `reviews/mine`（`requireAuth`）与入口条件（`ASSET_ADMIN`）的矛盾（撤回入口随之可达）；自助注册显式 out（含 `REGISTRATION_ENABLED` 无公开端点的影响说明）；术语统一（待审核）与线框/契约对齐（概览 `status=ALL`）；`platformRoles` 顺序不作契约；FileTree 迁移影响面说明（`FilesTab.tsx` import）；测试影响面补全（`:495` + `:990` 段两处）；拼写修正 |
| v0.3 | 2026-09-10 | sunxuewen-rush | M4a 范本对标补全（学 M4a design 12 段 + 6 特质后回查缺口，11 项全补）：① **视觉参照三元组**（气质=M4a tokens / 形态=skillhub 管理面公开源 / 图标=lucide ISC——用户拍板）；② **三族适用性**（审核详情 manifest 卡按 type 分型，复用 M4a `OverviewTab` 分型探测）；③ 响应式断点（表格 <1100px 横向滚动 / 抽屉全宽 / 侧栏 <900px 图标态）；④ 组件补件（`Toaster`/`SkeletonLoader`/`RoleGuard`/`CopyButton`/`AuditActionSelect`——skillhub `shared/components` 对标发现）；⑤ 缺口 **G 段呈请编号**（G1-G4 → R5/R6/R6-b 两段式）；⑥ 审计页 8 过滤器全暴露 + **31 个 action 分组下拉**（清单列全，集中化登记 §14）；⑦ 联调数据需求（多角色/各状态/三族/FROZEN 空间）；⑧ 依赖版本锚；⑨ 关键空/错态文案示例；⑩ 评审物料时点修正；⑪ 规模预估更新（~27 组件） |
| ⏸ 搁置 | 2026-09-10 | sunxuewen-rush | 因 **M4-pre 扁平化重构**搁置（用户 2026-09-10 拍板）：角色改 4 档单值（`user_account.role`）、空间整体删除、可见性删除、权限码归零 → 本文档 `platformRoles` 契约（R5/§6/§4）与空间管理章节**作废**；待 M4-pre S4（T13）按新模型重写为 v1.0。搁置前的 8 维 9.4 评价对其余章节（审核队列/标签/资产/令牌/审计 + 视觉体系）仍有效 |
| **v1.0** | 2026-09-10 | sunxuewen-rush | **按 M4-pre 扁平化模型整体重写**（解除搁置）：角色 4 档线性单值 `role >= N`（R5 改为消费 M4-pre 已交付的 `/me → {user, role}`，本版**零服务端改动**）· 删空间域（9 端点/2 表/空间角色/FROZEN 态/`@ns/slug` 坐标全清）· 删可见性（`PATCH /:slug` 与读面可见性出口）· 坐标改全局唯一裸 slug · §7.1 契约表逐条对照源码重核（附 file:line）· G4 由 M4-pre 闭环 · 组件 ~27→~25 · audit 动作 31→25 · §12/§13/§14 同步 |
| **v1.1** | 2026-09-10 | sunxuewen-rush | **入口分层修正（恢复已拍板决策）+ 环节 0 收口 + 8 维自检修复**：① `/dashboard/*` 个人面 + `/admin/*` 治理面（v0.1-v1.0 把个人事务全塞进 `/admin/*`，属分层缺失）② R7 改写（组级显隐 + 条目级 role 门槛）③ **共享审核详情 `/reviews/:id`**（否则提交人被 `/admin` 组级守卫挡住 → 撤回不可达）④ 章节同步 §4/§5/§6.2/§6.3/§6.4/§7.3/§10.2/§11/§12/§13 ⑤ 组件面域 `components/admin/` → `components/console/`，跨面基础件归 `ui/` ⑥ 补充锁定 5 条入 §2.1 ⑦ §7.1 端点契约逐条复核源码，全表吻合（audit action 实测 25）⑧ 8 维自检 8.8 → 修复后 9.4 ⑨ M4a 范本对标修复（断点入路由段/Status 补定稿条件/§13 补流程行/删被否决残余/线框补 4 页）⑩ **环节 0 收口**：新增 §5.1 页面职责矩阵 + §12 第 8 张线框；§15/头部按体量纪律压缩 |
| **v1.2** | 2026-09-10 | sunxuewen-rush | **范围调整（用户拍板 A：登录留 M4b + 用户管理移出）**：① §2.1 **R3 → R3′**：用户管理移出至 **M4c「账号与权限治理」**（同属新机制：改角色/启停/建号 + `ACCESS_POLICY` 准入策略 + 重置密码 + 强制登出）——原「不入首期」理由（服务端零 HTTP 面）保留为实证，新增数据侧已就绪（`user_account.status/role` + 索引）与 M4c 依赖 M4b 组件基建的注记 ② §2.2 In 明确「认证与会话 = **前端层**，服务端 M1 已交付 → 本里程碑零服务端改动」；Out 用户管理行与 Device Flow 确认页改指 M4c ③ **新增 §3.0「认证能力 × 阶段归属」对照表**（M1 ✅ / M4b ⬜ / M4c ⬜ / M5 ⬜） ④ §14 新增三行：`05` §6.4 用户管理行（M4c 时点）· `00` §5 M4c 行（已同步）· **Device Flow 确认页 plan↔design 漂移登记** ⑤ 依据：服务端与规范实测（`auth/routes.ts:46-122` · `db/schema/users.ts:49-68` · `config/env.ts:95-96` · `docs/00` §5 v1.15）⑥ M4b 范围与两项定稿条件不变 ⑦ **自检修复（同日整合，8 维 9.2 → 见下轮重评）**：§3.3 旧编号 `（R3）`→`R3′` · §14 措辞去重（`05` §6.4 改角色沿用既有「角色分配 = 超管」行，只补 列表/启停）· §14 Device 行改为**不改写已收尾的 M1 plan** · §14 **新增 M4-pre P3/§2.5 旧注修订登记**（旧文「按 `role >= ADMIN` 判定」→ 改角色 = 超管）· `00` §5 M4b 行版本号 v1.1→v1.2 + M4c 行补**范围档位候选** |
| **v1.3** | 2026-09-11 | sunxuewen-rush | **视觉体系切换对齐（用户拍板）**——全站统一 **shadcn 蓝科技**，本文件做**引用级对齐**（不复制、不落实现）：① **视觉真值 SSOT 移交 M4a design v0.9 §4.4**——§10.1 标题/主体重写为「引用 + 归属分工表」，控制台面只留特有项（状态语义映射 / 表格密度 / 抽屉宽）；§10.2 与 §6.2 的色值表述同步改引用 ② **§6.1 依赖重写**：删「零新增运行时依赖」→ 样式/组件栈 = M4a §4.1 + §4.4（Tailwind v4 + shadcn CLI + `cn` 等），控制台面特有依赖 = 无（Table/Sheet/Dialog/Select/DropdownMenu/Badge/Sonner/Skeleton 原语全覆盖）③ **§6.2 组件树落位**：新增 `components/ui/shadcn/` 目录（**大小写碰撞规避**：`badge.tsx` vs 既有 `Badge.tsx`、`pagination.tsx` vs `Pagination.tsx`）；Toaster→`Sonner` 封装、SkeletonLoader→`Skeleton` 组合；DataTable→`Table` 封装、Drawer→`Sheet` 封装 ④ **§3.1 登录页**：玻璃卡 + 品牌渐变标题 → shadcn `Card` + `--primary` ⑤ **危险操作语义修正**：色值 `#cf222e`（M4a diff 内容色）→ `--destructive` #e7000b（UI 语义色，两者分工不同）⑥ **R9 改写**：产出范围由「1 版风格板 + 2 交互 demo」→ **全页可点原型**（9 视图 + 评审控件；用户扩大范围）；技术落法 = 真上 shadcn/ui（用户拍板 B「一步到位省的返工」）⑦ **§14 新增三行**（SSOT 引用纪律 / AIH 补丁无规范层归属 / `00` §5 三处注记已同步）· §13 引用（+shadcn/ui 与 `shadcn-ui-project` 流程）⑧ **顺序翻转**：原 2026-09-10 拍板「先控制台面」→ 现「**先门户换皮 → 再 M4b**」（理由：共享壳为门户与控制台共用、门户类型色是 shadcn 体系最难落的一块；M4a design 升 v0.9 承载）⑨ **控制台特有值 2 项待拍板**（表格密度 40/48 · 抽屉宽 384/560）——本版**刻意不落值**（未拍板不写成契约） |
| **v1.4** | 2026-09-14 | sunxuewen-rush | **v1.4：子里程碑拆批 + M4b-1 地基批落档（用户 2026-09-14 拍板）**——① M4b 拆为 **M4b-1…M4b-6** 六批（§2.3 拆批表：地基 → 认证壳 → 个人面 A → 个人面 B（唯一含服务端改动）→ 审核面 → 治理面）② **M4b-1 设计块另立** `docs/designs/2026-09-14-m4b1-console-foundation-design.md` v1.0（组件归位 14 处 / 官方件补装 13 件 / 控制台面域 6 件 / 跨面 4 件 / 合规清理 4 项）+ 其 plan `docs/plans/M4b-1-console-foundation.md` v0.1（T1-T8 待执行）③ 新增 §2.4 **对齐决策登记**（U1-U7 壳/登录/会话/工作台/资产/抽屉/提交 + P1-P5 + 官方件硬规则）④ 修 §12 尾部两处缺陷（重复行 + 「8 个页面」口径 → **8 张线框 / 9 视图**，`/login` 线框随 M4b-2 补）⑤ 控制台特有值落值（表格密度 **40** / 抽屉宽 **560**）⑥ §8 登记加性变更 `reviewComment`（→ M4b-3）； 详见 §2.3 拆批表与 §2.4 对齐决策登记 |
| **v1.5** | 2026-09-14 | sunxuewen-rush | **拆批文档模型落定（主 design ↔ 批 design）**：① 术语与模型确立（本文件 = **主 design（跨批不变层）**；批内内容随批迁出、本文件留指针；§2.4 决策登记落地即转指针）② §2.3 增 **批间门** + **各批预期产出物与对齐要点 backlog 表**（不预建空文件）③ §5.1/§5.2/§7.3/§8/§10.2/§12/§14 增**批归属标记** ④ Status 重写（定稿条件 ① ✅ ② ⬜ 随 M4b-5 ③ ✅）⑤ 修跨文档版本引用漂移（`M4a design v0.20` → 去硬版本号）⑥ `docs/README` · `designs/README` · `plans/README` 同步术语与命名约定 |
| **v1.6** | 2026-09-14 | sunxuewen-rush | **口径统一 + 版本引用去硬值 + 状态回写**：① 官方件口径 → **新落仓 11 件（表列 13 项）**（本文件 §2.3 行原写「补装 13 件」= 表列编号数，历史修订行保留原文，语义以本条为准）② 依赖口径 → **4 个包 / 3 组** ③ 批 design / 批 plan 对本文件的 **5 处**硬版本引用去值（改「以版本头为准」）；本文件内 `M4a design v0.20` 硬值去除 ④ 头部 3 条 `> Updated:` 合并为 1 条累积式 + Status 去重写（删 v1.4/v1.2 摘要与「定稿条件」双写；修正过期「待拍板 40/48·384/560」与「尚不进入实现」）⑤ 状态回写：批 design **v1.2** · 批 plan **v0.2** · **T1 ✅** ⑥ §2.3 出口口径与批间门去重 ⑦ 本轮文档模型变更 8 维自检 **9.50**（修正前 **8.94 未达门**；标准 4 维 9.0/9.5/9.5/9.5 + 深度 4 维 9.5/9.5/9.5/10） |
| **v1.7** | 2026-09-14 | sunxuewen-rush | **版本八态映射闭合（用户 2026-09-14 拍板）**：§10.1 版本八态映射**补齐 `UPLOADED` = warning**（此前仅列 7 态，`UPLOADED` 无据可从）+ **`YANKED` destructive → secondary**（灰）。**对标依据（21-skillhub 源码实证）**：① `skillhub-domain/.../SkillVersionStatus.java` 八态与本仓 `versionStatusSchema` **逐项同序同源** ② 列表页 `web/src/pages/dashboard/my-skills.tsx` 把 `UPLOADED` 归 review 档（= 与 `PENDING_REVIEW` 同色，本文件从之）③ 详情页 `web/src/features/skill/version-status-badge.tsx` `YANKED` 归灰档（与 `DRAFT` 同）+ **门户侧代码实况**（`VersionCompare.tsx:188` `tone` 由「是否 latest」决定、`YANKED` 仅换文案 ⇒ 灰）——即被否决的「独立蓝/紫 token」路径（须动 M4a §4.4 视觉 SSOT）未采纳。同步件：`StatusPill.tsx` 映射表 + 注释 · 批 plan T6 断言 · M4a design §（门户侧表述订正 `destructive` → `neutral`） |
| **v1.8** | 2026-09-14 | sunxuewen-rush | **M4b-1 批收尾状态回写（T8）**：Status 进度同步 —— 批 design **v1.4**（§9 增「本批验收结果」）· 批 plan **v0.12** · **T1-T8 ✅ 2026-09-14 代码完成**（五门禁逐项 exit 0，test **475 例 474 pass / 1 skip / 0 fail** 与基线一致 · chain-smoke **29/29** · dogfood **36/36 + NO JS ERRORS** · marker 0 · §9 六条逐条复验）；**观感复看 ✅ 用户复核通过**；硬证据记录 `docs/smoke/2026-09-14-m4b1-foundation.md` |
| **v1.9** | 2026-09-14 | sunxuewen-rush | **批间门升为「出口五件」+ M4b-1 审计结果回写（用户 2026-09-14 拍板「按建议处置」）**：① §2.3 **批间门**由「出口四件」→「**出口五件**」——新增第 ⑤ 件 **`整体审计`**（承 M4a T17-T26 惯例：批次收尾对全仓跑覆盖式扫描〔死导出 · i18n 键 · 残留 · 类串重复 · 越轴值 · token 消费者 · 注释腐化 · 文档数字实测 · 官方件硬规则 · 既有登记项状态〕，findings 逐条登记 + 处置「修 / 订正 / 回填 / 口径登记」，不留未决项）；同节「出口口径」行「四件全绿」→「五件全绿」；流程定案同步落 `docs/00` §5 M4b 子批口径 + §7 ② ② M4b-1 批审计闭合：十维扫描 findings **8 项** —— **F1 修**（`FilterStrip.tsx:39` 注释 `spacing={7}` → `1.75`，真值 7px）· **F2 订正**（批 design §6.4 `--radius-2xl` 从「潜在零消费者」候选剔除：`rounded-2xl` utility 有 1 消费点 `SideNav.tsx:71`，与同表「现状」列自相矛盾；本文件 §12 同步项表内该类行口径随批 plan 走）· **F3 回填**（M4a 审计第 24 项 chip 类串跨 4 文件重复 → 本批落官方 `toggle.tsx` `variant="chip"` 已收敛）· **F4/F5 口径登记**（地基批「有意零消费」：console 6 件 + 跨面 4 件 + i18n 三组 15 键 → 消费点 M4b-2..6，非死代码；越轴任意值 4 处为布局级，`text-[11px]` 在轴上）· **F6 方法教训**（i18n 键计数须按顶层缩进：嵌套计入致 market 假阳性 53/58 → 顶层键重算 53/53 对齐）· **F7 维持**（`buildLabelRows`/`labelName` 状态不变）· **F8 无需动作**（残留 8 类全 0 · 硬规则 6 项 0 违规 · 文档数字 8 项实测一致）；**无未决项** ⇒ 批 design 升 **v1.6** · 批 plan 升 **v0.13** |
| **v1.10** | 2026-09-14 | sunxuewen-rush | **文档形态旧口径订正 + 「批件登记表」落档（用户 2026-09-14 拍板「按你的建议来」）**：① **旧口径订正 2 处**——§1「流程定位」与 §7.2 尾的单数「M4b plan」→「**批 plan（逐批立；命名见 §2.3）**」。**查证（git 全历史实证）**：M4b 单块 plan **从未创建**——`docs/plans/` 全历史文件清单无该件、`git log --diff-filter=D -- docs/plans/` **零删除记录**、2026-09-10 落档提交 `c91a21a` 自注 *m4b shelved*（只有 design 落档）；2026-09-14 拆批（`801be9a` / 本文件 v1.4）以「逐批 design + 逐批 plan」**取代单数 M4b plan 的意图** ⇒ 该表述属**旧意图残留**，非漏删文件（全仓仅此 2 处）② §2.3 增 **「批件登记表」**——登记各批**实际** design/plan 文件名 + 版本 + 状态 + 批间门五件（M4b-1 回填 design v1.6 / plan v0.14 / 五件全绿；M4b-2 标「对齐中」；M4b-3…6 待回填），兼作「主 ↔ 批」双向查询点与批间门执行台账；**计划名（backlog 表）与实际名分离，实际名以本表为准**（M4b-1 落档早于 backlog 表，故其名仅在本表）③ 连带上游同步：`docs/00` 升 **v1.28**（§7 ② 整体审计口径补**第十一维「旧口径/术语指针」**）· 批 plan `M4b-1-console-foundation` 升 **v0.14**（§3 登记本批漏扫该维 + 口径增补） |
| **v1.11** | 2026-09-15 | sunxuewen-rush | **认证整车迁移前置 + M4b 暂停（用户 2026-09-15 拍板 A）**：① §2.3 批件登记表 —— **M4b-2** 由「⬜ 对齐中」→ **⏸ 暂停**（认证底座以 **M4b-pre** 结论为前置；M4b 整体顺延；本批**未动工零代码**）② 登记表新增 **M4b-pre** 行（认证整车迁移**前置批**；批 design / 批 plan 均标「**spike 裁定前不立**」，定案后回填实际件名）③ 上游 `docs/00` 升 **v1.29**（§5 新增 M4b-pre 行 + M4b-2 暂停 + M4c 行补「待 M4b-pre 结论」注记 + 子批口径补前置关系）④ **命名查证**：原拟「M4c」与 `docs/00` §5 既有 **M4c（账号与权限治理）** 撞名 ⇒ 改定 **M4b-pre**（镜像 M4-pre 前置批命名），避免里程碑号复用 ⑤ **文档落点（拍板 A）**：规范层 `05`/`08` **原地改写**（同 M4-pre v1.8 先例）· 认证面实现 · **M1 及其两 plan 为历史执行档案不回改**（**唯一例外**：M1 design 仅加「后继变更指针」两行、不改任何结论 ⇒ 升 **v1.3**）（其 design 与 plan 同阶段配套，回改会破「执行记录原貌零改动」纪律并造成引用链自相矛盾）· 本次「技术选型」**另立 design + plan**（体系 00 §7 ②：设计层触发条件点名技术选型）⑥ **实证依据**（企业目录只读查询 + 官方文档 22 页 + 官方源码；**细节调查记录不入库**——开源文档中立铁律）：企业目录通道**可取真实邮箱** ⇒ 官方 `user.email` 必填（`unique + required`）可满足、**无需合成邮箱** · 权限码 `resource:action` ↔ 官方 api-key `permissions` **1:1** · 官方 Hono 接缝与既有会话中间件 **同构** · **会话为进程内内存**（`InMemorySessionStore`，重启即全员登出）⇒ 采纳顺带修缺陷 ⑦ **本批不含实现改动**（纯登记 + 状态同步） |
| **v1.15** | 2026-09-15 | sunxuewen-rush | **M4b-pre 批次完成（出口五件全绿）**：① §2.3 批件登记表 M4b-pre 行 🔵 代码完成 → **✅ 完成（2026-09-15）**（design **v2.4** · plan **v0.14**；五件全绿）② **出口件 ④（dogfood/观感）= 本批不适用 → 移交 M4b-2**：用户实测「dev（5173）点登录无响应」经代码核实为**当前形态**（`TopBar.tsx:33-39` 占位 `<span>` 无 `onClick`/`href`；路由表无 `/login`——登录页归 M4b-2）⇒ 本批零 UI 改动、登录面未交付 ③ **M4b-2 行同步**：登记「**前置已满足（M4b-pre ✅）⇒ 可开工对齐**」+ **立项必核现状项**（入口改造：占位件 → 真认证入口 + `/login` + `AuthProvider`）+ **出口件 ④ 承接** ④ 本批等价证据：chain smoke 29/29 · dev 六态探针 · 501 例（含登录→会话→登出）· 冷库迁移 14 表；上游 `docs/00` 升 **v1.34**；**本版不含实现改动** |
| **v1.14** | 2026-09-15 | sunxuewen-rush | **M4b-pre 代码完成回写（T8 · 门禁 + converge + 整体审计）**：§2.3 批件登记表 M4b-pre 行回填收尾版本（design **v2.3** · plan **v0.13**）与**出口五件终态** —— ① design converge 8 维 **9.5** ② **T1-T8 全绿**（九提交 `fd58de0`→T8；CI **#41-#48** 全绿；全量测试 **501 例 0 fail**）③ 五门禁逐项 exit 0（含**冷库全量迁移 0000→0011 = 14 表 / FK 12 / 旧表引用 0**）⑤ **整体审计十一维无未决项**（修 **8**：F1 同源守卫自身源推断改读 `Host` 头 + F2-F8 七项零消费死导出删除；口径登记 6）④ **dogfood/观感 ⏳ 交用户**（H1 dev 登录→浏览→登出 · H2 硬刷新仍在登录态）；硬证据 `docs/smoke/2026-09-15-m4b-pre.md`；上游 `docs/00` 升 **v1.33**；**本版不含实现改动**（收尾回写） |
| **v1.13** | 2026-09-15 | sunxuewen-rush | **M4b-pre 执行期登记（T1-T6 落地 + 规范层同步）**：§2.3 批件登记表 M4b-pre 行回写**实际版本与进度** —— 批 design **v2.1**（T2-T6 落地回写后；初版 v1.3 定稿）· 批 plan **v0.11**；① design 8 维 ≥9 ✅（9.44）② Task **T1-T6 ✅**（七个提交 `fd58de0`/`a7ce23e`/`fb7b4a7`/`7b8ea11`/`b76e978`/`a6c2c5a`/`50b0c52`；CI #41-#47 全绿）· **T7-T8 ⬜** ③ 五门禁 ✅（T6 末次全绿，全量测试 **501 例 0 fail**）④ dogfood/观感 ⬜（T8 人工项）⑤ 整体审计 ⬜（T8）；上游 `docs/00` 升 **v1.32**（规范层 `05` → **v1.9** · `08` → **v1.6** 原地改写登记；M4c/M5 实证注记）；**本版不含实现改动** |
| **v1.12** | 2026-09-15 | sunxuewen-rush | **M4b-pre 立项登记（设计定稿批准 + 计划立项）**：§2.3 批件登记表 M4b-pre 行回填实际件名 —— 批 design `2026-09-15-m4b-pre-auth-migration-design.md`（**v1.3 定稿** · 8 维 **9.44** · 用户 2026-09-15 整体批准）· 批 plan `M4b-pre-auth-migration.md`（**v0.2** · T1-T9 立项）；状态 ⬜ **计划已立**（spike **✅ X1-X8 全通过**：LDAP 自定义凭证 / 会话落库 / 4 档角色 / 设备流两段式 / 令牌权限映射 / 测试 fixture / 存量令牌 re-encode / 官方 CLI 能力）；上游 `docs/00` 升 **v1.30**；**本版不含实现改动**（纯登记） |
