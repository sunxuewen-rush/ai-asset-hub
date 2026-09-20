# M4b-4 个人面 B：我的资产与工作台 landing —— 批设计

> Date: 2026-09-18
> Updated: 2026-09-20（**v1.38：T11-i B″ 观感收尾**（用户「只做 B」+「侧栏搜索图标要浅一些」）—— 页面条目加 `→` 前缀（兜底行不加）· 触发器放大镜取 `--muted-foreground` · §4.9 追加落地段（**并订正 5 处陈旧行数**）· §11.9 增行 · 断言 `m4a-dogfood` **60/0**）
> Updated: 2026-09-20（**v1.37：侧栏搜索定稿「框样触发器 → 命令面板」（T11-i B″）**（用户复审拍板「还是官方站的对话框更适合一些」）—— 入口 = **框样触发器**（像输入框的按钮 · shadcn 官方站同款配方）⇒ 点击 / `⌘K` 开官方 `CommandDialog` · **B′ 一体形态与其依赖 `@base-ui/react` 整体退役**（依赖归零 · notices 回 **33 件**）· i18n 回 **347 键** · §4.9 补 B″ 段 · §4.7.6 增「**F101/F102 同日撤回**」行（F103/F104 保留）· §11.9 增 T11-i B″ 行（代码 **9.48** / 文档 **9.45**）· 断言 `m4a-dogfood` **57/0**（B″ 六条）· 本批 **91/0** 零回归）
> Updated: 2026-09-20（**v1.36：T11-i B′ —— 侧栏搜索改「一体」形态**（用户 2026-09-20 拍板「就按 Combobox 方案来」）—— 由「条目 → `CommandDialog` 弹窗」改为 **常驻输入框 + 紧邻下拉**（官方 `Combobox` · Base UI 原语 · **新增依赖 `@base-ui/react@1.8.0`（MIT）**）· **弹窗形态整体退役**（`ui/CommandPalette.tsx` 删）· 侧栏条目 **15 → 14** · i18n **347 → 346**（`pages` 键退役）· 件 = 新建 2 / 删 1 · §4.9 补 **B′ 变更段** · §4.7.6 增 **F101–F104** · §11.9 增 T11-i B′ 行（代码 **9.40** / 文档 **9.41**）· 断言 `m4a-dogfood` **57/0**（B 段 6 条重写）· 本批 dogfood **91/0** 零回归）
> Updated: 2026-09-20（**v1.35：T11-i 观感微调落地回填**（用户 2026-09-20）—— 顶栏小搜索 **靠右 · 语言切换左侧** · **固定 `w-[320px]`** · 放大镜 **`strokeWidth=4`**；§4.9 落地记录追加；两套 dogfood 复跑（`m4a-dogfood` **57/0** · 本批 **91/0** 零回归））
> Updated: 2026-09-20（**v1.34：T11-i 落地回填**（A 顶栏小搜索 + `/search` 跨类型结果页 + 首页搜索抽公共件 · B 侧栏 `⌘K` 命令面板）—— §4.9 补**实测**（`m4a-dogfood` 46 → **57/0** · 本批 dogfood **91/0 零回归** · i18n **347 键**）· §11.9 增 T11-i 行（代码 18 维 **9.52**）· §4.7.6 增 **F98/F99**）
> Updated: 2026-09-20（**v1.33：全资产搜索立项（T11-i）**（用户拍板 A1 + B1 + C3 + Hero 对齐）· 新 **§4.9**（范围 / 语义边界 / 件 / 断言 / 边界）· 规格落 **M4a §8.12** · **F96 登记**（主 design §15 修订表 v1.56 行粘连 ⇒ 本轮修复；`doc-audit` 不覆盖修订表结构完整性））
> Updated: 2026-09-20（**v1.32：T11-h v0.25 —— 点亮判据扩为「聚焦 或 有输入」**（用户拍板「鼠标一点击输入的地方、焦点在的时候就变」· **可提交性不变**）· §4.8 更新 + §11.9 增 T11-h 行（**9.51**）+ §4.7.6 增 **F95**（后台 tab `element.focus()` 不派发 `focus` 事件 ⇒ 探针假红；判定聚焦类交互必用真指针）· `m4a-dogfood` **+4 断言 ⇒ 46/0**）
> Updated: 2026-09-20（**v1.31：T11-h 首页搜索形态对齐：§4.8 立项 + **F94**（探针读过渡中间态自伤）+ 规格落 M4a §8.10；`m4a-dogfood` **42/0****）
> v1.30（2026-09-20）：M4b-4 收口审计（converge）：**活口径 vs 历史留痕** 换靶 ⇒ 5 处当值陈旧订正（批 plan 3 · `docs/00` 2 · 证据 1）+ **F93** 登记；出口五件复核 ✅ + CI `35499952284` success；**零实现改动****
> v1.29（2026-09-20）：T11-g 验证效率：dogfood 分段执行（`SMOKE_ONLY`）+ 会话复用** —— ① §11.9 增 T11-g 行（**9.49**）② §4.7.6 增 **F90/F91** ③ 实测：段选 **45.6s** / 全跑 **2m59s** / 真登录 **9→4** / 全跑 **91/0**（零行为变化）④ **零产品码改动****
> v1.28（2026-09-20）：列表加「更新」列（⟷「最新」档）+ 修 F89** —— 用户 2026-09-20「资产列加一个『更新』对应更新时间，和我们的『排序-最新』相对应」⇒ ① `AssetList` 列集合 **5 → 6**（末位「更新」= `formatDate(updatedAt)`）· 列头可点 **4 → 5**（更新 ⟷ `newest`）② **F89**：`handleHeaderSort` 原把**列名当档位** ⇒ 产出 `?sort=updated`（白名单外 ⇒ 序与档位脱钩）⇒ 导出 **`COLUMN_SORT`** 单一事实源，调用方先译档 ③ §6.6 i18n **+`colUpdated` ⇒ 335 键**（实测）④ dogfood **+G22-6c** ⇒ **91 PASS / 0 FAIL** ⑤ §11.9 f2 **9.40 → 9.46**
> v1.27（2026-09-20）：**T11-f 排序控件形态定稿 = 官方 `Select`（用户拍板「方案 B」）** —— ① 排序控件 **chips ×5 → 官方 `Select`**（`Label`+`SelectTrigger#market-sort` `size="sm"` `w-[160px]`）② §4.7.2/§4.7.5 规格与落点同步 ③ §4.7.6 增 **F87**（104px 定宽在 EN 下截断 ⇒ 改 160px）· **F88**（行数表写了估值 ⇒ 实测回填，F76 同类第 4 次）④ §6.6 i18n **+`sortLabel` ⇒ 334 键**（实测）⑤ §11.9 f2 **9.37 → 9.40** ⑥ dogfood G22 断言随形态同步（仍 **90/0**）· `m4a-dogfood` **38/0**）
> v1.26（2026-09-20）：**T11-f 收口（f3 文档回填 · f4 验证）** —— ① §4.7.6 增 **F85**（`m4a-dogfood` 断言口径随形态变更）· **F86**（覆盖探针跑进 `dist/**` 陈旧产物 ⇒ 7 例假失败，已反证与本笔无关）② §11.9 T11-f 行 = **f1 9.35 · f2 9.37 · f3 9.46 · f4 9.47** ③ 证据 = `docs/smoke/2026-09-18-m4b4-personal-b.md` **§14**（门禁 / G22×13 / 覆盖探针 / 行数 / 3 张图）)
> v1.25（2026-09-20）：**T11-f f2（门户 UI）实现 + F84 订正** —— ① §4.7.5 前端行订正列头方向语义（首点 `desc` —— 见 **F84**：原「点异列 = 固有方向」与 §4.7.2/§4.7.3 矛盾）② §4.7.6 增 F84 ③ §6.6 i18n **实测 333 键** 回填 ④ §11.9 T11-f 行补 **f2 均分 9.37** ⑤ 实现落点：`useMarketQuery`（加性 `sort`/`dir`）· `api/assets.ts` · `CenterPage`（chips ×5）· `AssetList`（`SortableHead` 四列）· i18n +5/−1）
> v1.24（2026-09-20）：**T11-f f1 实现期订正（F82/F83）** —— ① §4.7.5 服务端行补 `dir`（**契约漏项** —— 见 F82）② 两路由 schema 写法订正 `.default` → **`.catch`**（原写法在非法值上 400，与「静默回落」矛盾 —— 见 F83）③ §4.7.6 增 F82/F83 ④ 测试行回填 f1 实际落点）
> v1.23（2026-09-20）：**验收期第三笔 T11-f「资产排序」立项** —— 用户 2026-09-20「资产排序的设计——收藏/下载/作者/名称 支持排序」+「列表视图表头可点排序，我的倾向是做」；① **服务端**：`GET /api/assets` 与 `GET /api/me/assets` 加白名单 `sort`（`newest`(默认)/`downloads`/`stars`/`name`/`author`）+ 每档 tiebreaker（`<field> DESC, updated_at DESC, id DESC`）· 非法值静默回落 · **零迁移**（不加减索引、不加 COLLATE）② **门户 UI**：工具条加 **5 档排序 chips**（官方 `ToggleGroup variant="chip"`，取代静态文本「排序：最近更新」，不新增行）+ **列表视图列头可点排序**（官方配方 `Button variant="ghost"` + `ArrowUpDown`/`ArrowUp`/`ArrowDown` + `aria-sort` · 两态）③ 排序状态入 URL `?sort=` · **改排序回第 1 页**（官方明写 manual 模式不自动 reset）④ 范围：门户三页 + 服务端两面通吃；**控制台「我的资产」UI 排序登记后续**⑤ 纠错留痕 **F80**（「v9 无 manual*」误判 · 根因 grep 非递归）· **F81**（「legacy 接排序需切原生面」夸大 · 根因未做探针）—— 已用类型探针 + 运行期 A/B 探针实证修正⑥ 本版为**立项+规格**（零实现改动），实现期按 f1→f4 推进）
> v1.22（验收期 UI 调整轮第二笔（T11-e · 门户视图切换 + 折叠搜索）** —— 用户逐条拍板：① 门户中心三页加**卡片 ⇄ 列表**切换（官方 `ToggleGroup`；`/mcps` 造数 21 条 ⇒ 23 > 20 出分页）② 列表形态**先试官方 `Item` 后弃用** ⇒ 改**官方 `Table` 家族**（5 列 + 表头 · 列宽百分比 · 单元格 `py-4` · 描述 `line-clamp-3`）③ **去卡化**：面板无边框/白底，表格落在页面底上（用户「table 和背景融为一体」）④ **折叠搜索**（用户「参考 ClawHub 切换钮左侧的搜索」）：官方 `Collapsible` + 官方 `InputGroup`，工具条下方撑满宽度⑤ **删页头搜索框**（用户「title 上的搜索就重复设计了，需要去掉」）—— **中心三页内**唯一搜索入口 = 折叠面板（首页 `Hero` 胶囊搜索未动 · F78）⑥ 件表 **新建 16 → 17**（`AssetList.tsx`；~~`ui/shadcn/item.tsx`~~ 落仓后弃用删除）· 改造 **19 → 20**（`CenterPage.tsx`）⑦ i18n **+6 键**（`viewGrid`/`viewList`/`colName`/`colDesc`/`colDownload`/`searchClose`）⇒ 全仓 **329 键 / 12 组**⑧ dogfood **G20（10 条）+ G21（6 条）** ⇒ **77 PASS / 0 FAIL**；`m4a-dogfood` **36 → 37**（搜索入口断言改折叠面板）⑨ 发现 **F68–F73**（官方件落仓后弃用 · 跨批断言口径变更 · 探针锚点雷区 · 登录限流 · 键数漂移 · measure 清单缺件）⑩ 提交前自检：代码 18 维 **9.24**（含 C9 文档未落档拖分）· 文档 8 维 **5.25** ⇒ **不得提交**，本轮补档后重评）
> v1.21（验收期 UI 调整轮（T11-d）** —— 用户逐条拍板三条：① 门户卡下载图标与详情页一致（退役 `⇣` → lucide `Download`）② **去掉卡片版本号** ③ 卡片星标**改纯展示**（与下载同件同款）+ 位置移到下载右侧 · 连带：`StarButton` 收敛为**单一形态**（撤 `compact`/`form`）· 收藏交互唯一入口 = 详情页 · 卡片改**覆盖层 Link**（整卡可点）· dogfood **G14b（+2）+ G18 改口径** ⇒ **60 PASS / 0 FAIL** · 新增 **F67** 并同步 §3.1 件 15 / G14 / G18 / F59)
> v1.20（2026-09-18）：**T11-c 覆盖补测轮** —— 用户追问「自测完成并做过 coverage 了么？」自查发现**审计维度缺「覆盖探针」**（F65）+ 实测暴露 **yank 路由层整段零覆盖**且本批 T12 已接其 UI 入口（F66）⇒ ① 新增 `apps/server/src/http/yank-route.test.ts`（**14 例**：鉴权 4 档 / reason 边界 / 状态门 / 坐标 404 / 形态守卫 / token scope 正反）② dogfood 增 **G12b**（真点击撤回分发 ⇒ 状态翻转 + 下载 400 + 重复 400）③ 实测：**全仓 95.60/96.28** · `http/assets.ts` **90.97 → 95.96 lines** · 测试 **537 → 551** · dogfood **53 → 58** ④ **F65/F66 登记**（web 包零测试基建 ⇒ 归 M4b-7/另立项）· 证据 §1/§3/§5/§6 A5/§10 同步)
> v1.19（2026-09-18）：**T8 作废散点订正（文档面）** —— 用户追问「文档也都对应修改了么？」自查发现 v1.9 的散点扫**只清主口径、漏清活口径**：**14 处**仍按「有抽屉」写（**首轮 8**：批 plan 7 + 主 design 1；**换靶精修谓词再挖 6**：本文件 5 + 主 design 1）⇒ 逐处订正（批 plan **v0.16** / 主 design **v1.55** / **本文件 v1.19**）· **F64 登记**（审计只查关键字不判语义 = 盲区，脚本补「活口径谓词」）· **口径撤回**：T11 收尾「整体审计无未决项」为关键字口径产物 ⇒ 改判「关键字残留 0 · 语义散点 14 处已订正」· 文档 15 维自检 **9.22**)
> v1.18（2026-09-18）：**T11 收尾回填（执行期）** —— ① **F50 订正**：未消费键原登记「5」⇒ **实测 12 键**（审计扫描）② 件表计数回填：**新建 16 / 改造 19 + 3 文档**（§3.1 +`hooks/useViewer`；§3.2 +wrappers 3 文件 + `apiPut` + `VersionCompare` + `Assets`）③ **§9.7 收尾回填记录**（六项逐条执行）④ 证据 = `docs/smoke/2026-09-18-m4b4-personal-b.md`（五门禁 / G1–G19 = **53 PASS / 0 FAIL** / 门户 36/36 / chain-smoke PASS / 权威行数表 / 整体审计）⑤ **本批交付完成**（T11 为末件）)
> v1.17（2026-09-18）：**T6 工作台三卡落地（实现期回写）** —— 过渡形态（`ComingSoon` + 按档入口）→ **三卡 landing**：角色裁剪（`role ≥ 10` 三卡三请求 / 否则单卡单请求）+ 每卡独立三态与重试 + 零值照常显示「0」；**卡形态取「内容即 `<Link>`」而非设计字面的「覆盖层」**（覆盖层会吞掉每卡重试按钮的点击 —— 发现 **F61**）；§11.9 增 **T6 均分 9.43** · 发现 **F61–F63** · 认证态断言归 T11 dogfood）
> v1.16（2026-09-18）：**T16 star 前端接线落地（实现期回写）** —— 新建 `api/stars.ts` + `components/market/StarButton.tsx`（详情页头卡「收藏 N」+ 门户卡紧凑「★ N」两形态）；**门户卡 DOM 结构调整**（`<Link>` 收窄到主体、页脚留链接外 —— 防按钮嵌 `<a>`，F58）；匿名路径实测（零写请求 + 跳登录 + toast）· 门户 dogfood 复跑 **36/36** · §11.9 增 **T16 均分 9.41** · 发现 **F58–F60**）
> v1.15（2026-09-18）：**T12 详情页管理区落地（实现期回写）** —— 交付面 = 头卡 [下载] + 右栏三卡（元信息 / 标签卡 / 管理卡，按权限显隐）+ 版本 Tab 行内动作（删除 / 撤回分发）+ 配套 6 件；**件表口径变化**（新建 15 → **16**（`hooks/useViewer`）· 改造 13 → **19**（`api/assets|versions|labels|client` + `VersionCompare` 加性 `rowActions` + `Assets` 共用件回改）—— **计数回填见 §9.7 ⑥（T11 收尾）**）；**实现期发现 F48–F57**（含 en 3 值中文泄漏修正 · i18n assets 组 **65 → 79** · 版本徽章 3 → 8 态）· §11.9 增 **T12 均分 9.43**）
> v1.10（2026-09-18）：**T15 实现期发现订正** —— F36「协议 = SSOT」失真：资产响应形状实际在 `apps/web/src/api/types.ts`（protocol 无此形状）⇒ §5.1 ⑦/⑧ 落点订正 + 批 plan 三处同步；F37 登记测试缺口归 T4 · §11.8 复评 **9.69** · 零实现改动）
> v1.9（2026-09-18）：抽屉取消 —— 列表直接进入完整详情（用户「简单一点，抽屉不做了，取消，一点预览，直接进入完整详情」）——
> ① §4.3 整节改写为「取消」（作废留痕）· 操作列 = `Eye` 图标钮 **真链接**直跳 `/assets/:slug`（与 M4b-3 同款）② 件表 **新建 15 → 14**（去 `AssetDrawer.tsx`）
> ③ i18n **删 6 键**（`section.labels` 保留供详情页标签卡）④ dogfood **G7/G8 改写**为「真链接 + `pathname` + 全站无 sheet 反证」⑤ **§4.6 补缺口**：
> 版本列表沿用 M4a 既有渲染、本批只增行内动作 ⑥ **§11.7 复评 9.69** ⑦ 本版零实现改动）
> v1.8（2026-09-18）：star 最小集并入本批（用户确认「不要单独开 M4-star」）——
> ① **§5.1 ⑧ 新增 star 契约**：新表 `asset_star`（`UNIQUE(asset_id,user_id)`）+ `asset.star_count` 冗余列（沿 `08` 范式 · skillhub 双证）+
> 幂等 `PUT`/`DELETE /api/assets/:slug/star` + 读面 `starCount`/`starredByMe` + 门户卡/详情页入口 · **权限 = 任意登录用户**（社交动作，不受 `canManageAsset`）·
> **不写审计 · 不限流**；**规范同步 `08` 数据模型** ② 件表 **新建 15 / 改造 13 + 3 文档** ③ **依赖消解**：§2.1d「依赖登记」star 行改「已并入」·
> **§4.2/§4.3/§4.6「未落地不渲染」降级口径全部作废** ④ dogfood **G15–G19** · 造数补 star 行 ⑤ 本批性质 = 「**个人面 + 资产管理 + star 最小集**」·
> **含 1 次迁移** ⑥ **§11.6 复评 9.68** ⑦ 本版**零实现改动**）
> v1.7（2026-09-18）：可点原型评审收口（R1–R23 逐条拍板）—— §2.1d 原型评审记录；**列表 6 → 9 列**（名称/类型/状态/标签/版本/下载/收藏/更新/操作）· **抽屉改纯预览**· 管理动作全部归**资产详情页 owner/管理区（按权限显隐 · §4.6）**· 段名 `标签+-` · 侧栏条目 `标签定义` · 件表 **新建 11 / 改造 11 + 2 文档** · star 依赖登记（用户决定 UI 收尾后先做 star））
> Status: **定稿**（8 维自检 **9.69 ≥9** ✅ —— **v1.9 抽屉取消后复评，见 §11.7**；历轮见 §11.3/§11.5/§11.6；**旧分 9.69 已撤回**：
> 该分系窄口径产物，换靶口径下修前实测 9.60。累计 findings **13 项**全部闭合：§11.2 八项 + §11.3 五项）
> Scope: M4b-4（`docs/00` §5 子行 / 主 design §2.3 拆批表）——个人面 B：**工作台 landing**
> （`/dashboard`）+ **我的资产**（`/dashboard/assets`）+ **资产管理抽屉** + 服务端
> **R6**（`GET /api/me/assets` 新增）+ **R6-b**（非 ACTIVE 读面授权集扩展）
> 引用链：本文档 → 主 design `2026-09-10-m4b-admin-console-and-auth-design.md`
> （§2.1 R6/R6-a/R6-b · §2.3 拆批与批件登记 · §2.4 **U4/U5/U6** · §4 入口显隐 · §5.1/§5.2 路由 ·
> §6.2 组件树 · §7.1 端点契约 · §7.2 **R6 系列** · §7.3 页面数据编排 · §8 接口变更总览 ·
> §10.1 状态映射 · §11 i18n · §12 线框）→ 规范 `00` §5/§7 · `05` §6.4 · `08` §7 →
> M4a design §4.4（视觉 SSOT，引用不复制）

---

## 1. 背景与批界

### 1.1 位置与依赖链

M4b 拆 8 批（主 design §2.3）：**顺序即依赖链 1 → 2 → 3 → 4 → 5 → 6 → 8 → 7**；本批 = **第 4 批（个人面 B）**。
前置 = **M4b-1 ✅ / M4b-2 ✅**（两批出口五件全绿）；后继 = M4b-5（审核批）。

**与前三批的关键差异**：M4a / M4b-1 / M4b-2 均**零服务端改动**；M4b-3 为**加性**字段；
**本批是 M4b 中唯一含「读面语义改动」的批** —— R6 新增 owner-only 读面，R6-b **放宽**既有读面授权集
（改的是判定本身，不是加字段）。故本批的**测试影响面**与**规范同步面**均为 M4b 内最大（§5.3 / §9）。

### 1.2 入口现状（真码实测，2026-09-18）

| # | 现状 | 证据（file:line / 命令） |
|---|------|--------------------------|
| 1 | `/dashboard/assets` 仍是**占位页**，`DEV_BATCH` 标注 `'M4b-4'` | `apps/web/src/main.tsx:55`（表）· `:104-111`（路由渲染 `ComingSoon` + `batch={DEV_BATCH['/dashboard/assets']}`） |
| 2 | `/dashboard` **已是真页**，但为**过渡形态**（`ComingSoon` 内容槽 + 按档裁剪入口），非三卡 | `apps/web/src/pages/Dashboard.tsx`（**73 行**，`wc -l` 实测）· `main.tsx:102`；主 design §2.3 登记「M4b-4 替换为三卡」 |
| 3 | 前端**无 `me` 面 API 封装** | `apps/web/src/api/` 实 **11 件**：`assets` `auth` `client` `compare` `content` `labels` `reviews` `stats` `tokens` `types` `versions` ⇒ 无 `me.ts` |
| 4 | 「我名下的资产」读面**不存在** | `apps/server/src/app.ts:187-206` 挂载表**无** `/api/me`；`assets/service.ts:173-177` `listViewableAssets` 硬编码 `eq(asset.status, 'ACTIVE')` |
| 5 | ★ **非 ACTIVE 读面现状仅超管** | `http/assets.ts:163-175` `assertAssetReadable`：`if (viewer.isSuperAdmin) return viewer;` → `if (row.status !== 'ACTIVE') throw AssetError(notFound);` |
| 6 | ★ 序列化器 `assetItem` **未导出** | `http/assets.ts:111-134`（14 字段：`id`/`slug`/`type`/`status`/`ownerId`/`latestVersionId`/`latestVersion`/`latestName`/`latestDescription`/`ownerDisplayName`/`downloadCount`/`createdAt`/`updatedAt`）⇒ 新 router 复用前须先抽件 |
| 7 | 可复用件**齐全**（零新增通用件） | `components/console/` **7 件**：`DataTable`(**139** 行 —— 本批加性 prop 已落，净 +6；原始 133) · `Drawer`(50) · `ConfirmDialog`(94，**已含 `requireReason` 变体**) · `StatusPill`(84，含 `ASSET_STATUS_VARIANT`/`VERSION_STATUS_VARIANT`) · `FilterBar`(61，含 `FILTER_ALL='ALL'`) · `PageHeader`(42) · `ComingSoon`(54) |
| 8 | 共享 hook `useMarketQuery` **无 `status` 维度**；唯一消费方 = 门户中心页 | `hooks/useMarketQuery.ts`（**104 行**）· 消费方 `components/market/CenterPage.tsx:119`（门户读面 ⇒ 本批改动须**零回归**） |
| 9 | i18n 现状 **222 键 / 11 组**（zh=en，双向差集 **0**） | 脚本实测（按顶层缩进解析）：`market` 53 · `tokens` 47 · `errors` 28 · `submissions` 25 · `login` 16 · `navigation` 14 · `device` 14 · `common` 8 · `dashboard` **6** · `admin` 6 · `review` 5 |
| 10 | ★ 抽屉**必然消费的 6 个错误码全部缺失** | 逐条 grep 零命中：`asset.has_published` · `asset.has_yanked` · `asset.version_not_deletable` · `asset.version_not_yankable` · `asset.yank_reason_required` · `label.limit_exceeded` ⇒ §6.3 补 |
| 11 | 主 design §11 键数为 **M4a 期史实值**（`navigation` 9 · `market` ~50 · `common` 5 · `errors` 9），与实测不符 | 该节自注「M4a 落」；本批收尾一并回填**实测值**（登记 §12 修订记录） |
| 12 | 既有测试 **2 处断言**将被 R6-b 打破 | `http/assets.test.ts:418`（fixture 的 owner 恰为 `member`）· `:844-857`（注释「owner 亦不可读」+ 断言）——详见 §5.3 |
| 13 | 标签候选端点为公开读面，**天然不含 PRIVILEGED** | `GET /api/labels`（匿名，`labels/service.ts:395` 只返 `RECOMMENDED` + `visibleInFilter`）⇒ 抽屉标签段零新端点 |
| 14 | 服务端写面**全齐**（本批零新增写端点） | `PATCH /:slug/status`（`assets.ts:384`）· `PUT`/`DELETE /:slug/labels/:labelSlug`（`:710`/`:738`）· `DELETE /:slug`（`:422`）· `DELETE /:slug/versions/:version`（`:559`）· `POST /:slug/versions/:version/yank`（`:672`） |

### 1.3 批界

**In（本批做）**

- **工作台 landing `/dashboard`**：角色感知三卡（待审核 / 我的资产 / 最近审计）+ 按档裁剪请求（U4 · Q1 · Q9）
- **我的资产 `/dashboard/assets`**：**九列**列表 + 状态筛选（显式 `status=ALL`）+ q 搜索 + 分页（U5 **v1.51 修订** · Q1 · Q2 · §2.1d）
- ~~**资产管理抽屉**（快速预览）~~ ⇒ **取消（v1.9 · 用户 2026-09-18「简单一点，抽屉不做了」）**：列表**操作列图标钮直接跳转完整详情页**（`/assets/:slug`）—— 列表 ↔ 详情之间**零中间态**；管理动作仍全归**资产详情页管理区**（§4.6）
- **star 最小集**（**v1.8 并入** · 用户 2026-09-18「不要单独开 M4-star，看看放在 M4b 行不行」→ **确认**）：收藏关系（新表 `asset_star`）+
  热度计数（`asset.star_count` 冗余列 · 沿 `08` 范式 · skillhub 双证）+ 读面（`starCount`/`starredByMe`）+ 端点（幂等 `PUT`/`DELETE`）+
  **门户卡 + 详情页**入口 + 列表/抽屉消费 —— 契约见 **§5.1 ⑧**；**本批由此成为「个人面 + 资产管理 + star 最小集」复合批**
- **服务端 R6**：新增 `GET /api/me/assets`（owner-only · 含全状态 · status 过滤 · 分页）（§7.2 处置 R6）
- **服务端 R6-b**：`assertAssetReadable` 授权集 = {owner 本人 / 管理档 / 超管}（§7.2 处置 R6-b）
- **查询参数化**：`listViewableAssets` 加 `ownerId?` / `status?`，一份 SQL 逻辑服务三个面（Q4 ①-1）
- **测试更新**：2 处既有断言 + 分层四面对照 + 新端点用例 + 公开面回归锁（§5.3 · Q12 A–D）
- **规范同步**：`05` §6.4 读面授权集行（+ 超管行措辞连带）· `08` §7 读面注记 + ARCHIVED 运营语义补实（Q11 A）
- **i18n**：新组 `assets` + `dashboard` 补键 + `common` 补键 + `errors` 补 6 码（§6）
- **dogfood / 造数**：进仓造数脚本 + dogfood 脚本（§9.3/§9.5 · Q12 E）

**Out（不在本批做，各自归属已定）**

- **发布 / 上传流** → **M4b-8**（R2 已于 2026-09-18 翻转入册；主 design §2.1/§2.3）
- **管理档全站资产治理页「资产管理」** → **M4b-6**（U8；本批 R6 端点**保持 owner-only 语义、不回退**）
- 审核队列 / 审核详情 / 文件树与预览 / 防自审 → **M4b-5**
- 标签管理 CRUD / 审计页八维过滤 / 管理看板 → **M4b-6**
- **视觉打磨与审美定稿** → **M4b-7**（本批出口 `dogfood/观感` 只做**合规核对**：有无错位 / 溢出 / 串色 / 异常）
- 我的提交 / 我的令牌 → M4b-3 ✅（已交付）
- **登记缺口（不表达）**：抽屉**无「提交审核」入口** —— 提审端点已在（`:618`），但上传无 UI ⇒ 链路接不上；
  R2 已翻转入 M4b-8 ⇒ 提审入口随发布批一并交付（本批**显式登记**，防将来审计追问「草稿怎么提审」）

## 2. 拍板结果（本批）

### 2.1 grilling 决策表（2026-09-18 · 用户逐条「按推荐来」）

| # | 议题 | 拍板结果 |
|---|------|---------|
| **Q1** | 我的资产卡口径 | **A**：卡片发 `status=ALL`、**不加副文案**（与列表默认「全部」同源 ⇒ 卡片数与列表行数不跳变；不动后端） |
| **Q2** | 查询状态承载 | **A**：**扩共享 `useMarketQuery` 加 `status` 维度**（可选，不传时行为零变化）+ 本页用 `?page=`；门户零回归用断言锁 |
| **Q4** | R6 落点 / 序列化器 / 查询 | **A + a2 + ①-1**：独立 `http/me.ts` 挂 `/api/me` · 序列化器抽中性模块 `http/asset-item.ts` · **参数化同一查询函数**（`ownerId?`/`status?`，原硬编码 ACTIVE 降为默认值）⇒ 一份 SQL 逻辑服务公开面 / 我名下 /（M4b-6）管理档全站三面 |
| **Q5** | R6-b 授权集是否纳入「版本上传者本人」 | **A 不纳入**（上传者 ⊆ {owner, 管理档} 实测；纳入无现实可达新能力，代价是多一次 EXISTS + 存在性语义变宽）。**登记夹缝边界**：降级管理档 + 资产非 ACTIVE + 自己上传的草稿 ⇒ UI 不可达（服务端能力在，由 owner/管理档代办收口），**接受** |
| **Q6** | 抽屉状态治理动作矩阵 | **C 统一 3×2**：「**每态给出另外两态各一个按钮**」—— ACTIVE→[隐藏][归档] · HIDDEN→[恢复][归档] · ARCHIVED→[恢复][隐藏]。**与服务端能力 1:1**（无「UI 比服务端更严」的隐形规则）；列表行 ⋯ 菜单**同用该矩阵**；全部走 `ConfirmDialog` |
| **Q7** | 标签段 + 危险区（7 条） | 全按推荐：① 标签候选**恒用公开列表** `GET /api/labels`（超管亦不给 PRIVILEGED 候选）② 已挂 chips 取**资产详情** `labels[]` ③ 已挂 PRIVILEGED 标签的 × **一律可点**（**Q13 = A**：本批不做 type 特判——详情 `labels[]` 只返 slug 不可判定；非超管点击 ⇒ 服务端拒绝 ⇒ toast 显示 `label.access_denied` 文案；精确禁用需给详情加 `type`，**缺口登记 → M4b-6**） ④ chips ≥10 ⇒ 候选**禁用 + 说明** ⑤ 标签挂/卸**不做二次确认**（不在 §9 危险清单、可一键复原）⑥ 删除禁用取自**版本列表**，加载中**保持禁用**（防闪变）+ 服务端 400 兜底 toast ⑦ 行菜单「标签挂载」= 打开抽屉并**滚至标签段**（③ 已按 **Q13 = A** 裁定，见上） |
| **Q8** | 版本管理段（6 条） | 全按推荐：**A** 抽屉打开即并发 2 请求（详情 + 版本列表），不做滚动触发 **B** 版本行紧凑单行（版本号 mono · 状态徽章 · 创建时间 · 文件数+体积 · changelog **截断一行** + `title` 全文）**C** 可删 4 态显示 [删除]，禁删 3 态（`PENDING_REVIEW`/`PUBLISHED`/`YANKED`）**禁用 + 说明** **D** yank 仅 `PUBLISHED` 行显示（非该态**不占位**）；`role < 10` **禁用 + Tooltip**；点击 `ConfirmDialog requireReason` **E** 抽屉内分页 = 首屏 **20** + 「**加载更多**」**追加式** **F** 不做文件预览/详情跳转（归 M4b-5）；**本批确认弹窗统一去红**（对齐 M4b-3 先例，是否恢复红色语义留 M4b-7 裁决） |
| **Q9** | 工作台三卡（6 条） | 全按推荐：**A** `role ≥ 10` 发 **3 请求并发** / `role < 10` 发 **1 请求**；**每卡独立三态 + 独立重试** **B** 卡内容与跳转（待审核=全站队列 total→`/admin/reviews` · 我的资产=我名下 total→`/dashboard/assets` · 审计=5 行 [时间+动作原文枚举+对象]**不含操作人**→`/admin/audit`）**C** 零值**照常显示「0」**（不做空态替换）**D** 整卡 `<Link>` 覆盖层 + 内层 CTA 用**非 anchor** 样式化 `<span>`（**无嵌套 `<a>`**）；单卡态**保持 1/3 列宽左对齐** **E** 卡级 403 ⇒ **就地 ErrorState**（不退化为空态）**F** 审计 `action` 用**原文枚举**（中文映射归 M4b-6 一并裁决） |
| **Q10** | i18n 落点（5 条） | 全按推荐：**A** 新组名 **`assets`** · **B** `dashboard` 补三卡标题/CTA/审计卡列头（`viewAll` 归 `dashboard`）· **C** `errors` **只补本批消费的码**（**6 → 7**：Q13 拍板 A 后增 `label.access_denied`；M4b-6 的标签 CRUD 码仍不预支）· **D** 键表用**逐键表**、**总数由实现期实测回填**（不硬编码）· **E** 审计 action 不加中文名 |
| **Q11** | 规范同步时点 | **A 随本批落地即改**（收敛原「M4b-4 落地后 / 统一于 M4b 收尾」双口径）：`05` §6.4:187 授权集行 + `:161` 超管行措辞 + `08` §7 ①读面注记 ②ARCHIVED 运营语义补实；先例 = M4b-pre 规范层原地改写 |
| **Q12** | 测试更新边界 + 造数 | **A** 2 处 owner 断言 404→200 **并在同 `it` 内补齐授权集三档对照** · **B** §7.2 声明的**四面对照**（详情/版本/文件/下载，授权集内 200、集外 404）· **C** 新端点用例 `http/me.test.ts` · **D** **公开面回归锁**（不传参时默认 `status='ACTIVE'`）· **E** 进仓造数脚本 `m4b4-seed-assets.ts`（**写库须授权**） |

> **决策来源**：2026-09-18 三轮 grilling（Q1–Q12），用户逐条回复「按推荐来」「全按推荐」；
> 议题清单与选项/推荐的完整推演过程属**执行过程记录**（不入库），本表只留**拍板结果**（用户口径：被否决方案不进文档）。

### 2.1c UI 逐条评审记录（2026-09-18 · `ui-design-review-walkthrough`）

> ⚠️ **本节为过程记录**（条①–⑤ 当时口径）：其中「六列」「四段抽屉」「`⋯` 菜单」等**已被 §2.1d 原型评审推翻** ——
> **现行口径一律以 §4.2 / §4.3 / §4.6 为准**。

> 方法：清单公式 = **页面 × 壳 × 跨面**；每条**四段式**（设计真值 / 现状实测 / 拍板点 / 风险与文档缺陷）；
> **逐条汇报逐条拍板**（用户「按推荐来」）；**汇报轮只读不写**（缺陷先登记、不顺手改）。
> **进度：① ② ③ ④ ⑤ ✅ **全闭**（5 条）· 下一步 = **抽屉可点原型**（§2.1d 待建）。

**条 ① · 页面 · 工作台 landing `/dashboard`（三卡）** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 两个缺失前端封装怎么补 | **补封装**：`api/reviews.ts` 加**队列读面**函数（`/api/reviews?status=`）· **新建 `api/audit.ts`** ⇒ 件表 **新建 7 → 8 / 改造 10 → 11**。依据（实测）：`pages/` + `components/` 层**零直调 `apiGet`**（两种写法零命中）⇒「一律经 `api/` 封装」是硬惯例 |
| **P2** 「最近审计」卡保留否 | **保留 3 卡**（U4 已拍 + §7.3 已定 3 请求 + `/admin/audit` 占位路由 M4b-2 已交付，点得到） |
| **P3** 审计卡空数据态 | **行内空态文案（复用 `dashboard.empty`）+ 卡仍渲染**（不隐卡 —— 防「有权限却无入口」） |
| **P4** 首帧不闪 | **`loading` 期间整块骨架、不按默认态渲染**（沿 U1「防首帧闪烁」口径） |

**条 ① 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D1** | 🔴 | **件表漏项**：§3.1 原只列 `api/me.ts`，漏列**队列 reviews / audit 两个前端封装**（实测 `api/reviews.ts:67` 仅 `fetchMyReviews`；`api/` 无 `audit.ts`）⇒ 按原设计开工 **T6 会卡住** | ✅ **已随 P1 修正**（件表 7/10 → **8/11**） |
| **D2** | 🟡 | **线框与拍板冲突（三向不一致）**：主 design §12 `/dashboard` 线框画着「**含2隐藏**」，但 **U4:206** 明拍「**省略**「含 N 隐藏」副文案」 | **登记**（仓纪律：史实不顺手改）→ 本批**收尾回填**时订正主 design |
| **D3** | 🟡 | **过期引用**：主 design §7.3:624 写「与线框『含 N 隐藏』一致」—— 该依据已在 U4 作废 | **登记** → 同上 |
| **R1** | 🟡 | **请求数断言口径**：`role < 10` 断言「页面自身业务请求 = 1」须**排除壳层**（`SideNav` 的 `/api/stats` + 认证 `/auth/me`）—— M4b-2 已有同款先例（「零请求」→「**页面自身**零请求」） | ✅ 已并入 dogfood **G2** 口径 |
| **R2** | ⚪ | **数据面缺口**：审计卡需库里真有 **≥5 条审计** | ✅ 已并入 §9.5 造数需求 |

**条 ② · 页面 · 我的资产 `/dashboard/assets`（六列）** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 类型列的表格形态 | **`TypeIcon`（16px）+ 文案**，色底用 `--type-*` 的小方底；**具体尺寸随抽屉原型一并看效果定**（无表格内紧凑形态先例，须视觉定稿） |
| **P2** `⋯` 菜单与抽屉矩阵**防漂移** | **抽共享「动作集」函数**（新件 `components/console/asset-actions.ts`，纯逻辑无 JSX —— 沿用 `auth/roles.ts` 的「单点」模式）⇒ **列表与抽屉共用**（语义收敛）／件表 **新建 8 → 9** |
| **P3** 分页参数族 | **本批照主 design §5.2 用 `?page=`**；「与 Submissions 的 `?offset=` 族不同」**登记**（不动 M4b-3 已交付件） |
| **P4** 空态判据 | **沿用** Submissions 判据（**是否有生效筛选**）：无筛选 0 行 → 页面级两行空态；有筛选 0 行 → `DataTable.emptyMessage` |

**条 ② 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D4** | 🟡 | **线框 §12 与 U5/Q6 三处不符**：菜单写 `[恢复 ACTIVE][归档][删除][标签挂载]`（**缺「打开抽屉」「隐藏」**、未体现 3×2 矩阵）· 列头写「**坐标**」（U5 = 资产名 + slug 副行）· 类型列画成**纯文本**（U5 = 类型色小块 + 文案） | **登记** → 收尾回填时**随 D2/D3 一并订正**主 design |
| **D5** | 🟡 | **`AssetItem.labels` 类型谎言**（**既有缺陷，非本批引入**）：前端类型声明 `labels` **必填**，但服务端**列表响应不含 labels**（仅详情补，`http/assets.ts:297`）⇒ 列表消费方访问得 `undefined` 且 TS 不报错 | **登记** → 归属 **M4b-5 / M4b-6 触碰时修**（本批六列不展示标签，不受影响） |
| **R3** | 🟡 | 分页参数族不一致（Submissions `?offset=` vs 本批 `?page=`） | 见 P3（**登记**，不在本批统一） |
| **R4** | ⚪ | `<1100px` 横向滚动需**实测**断言（`scrollWidth > clientWidth` 且**列不消失**） | ✅ 并入 dogfood 口径（可复用 M4a 分辨率矩阵做法） |

**条 ③ · 壳内重型交互 · 资产管理抽屉（四段 · 560）** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 已挂 chips 的文案来源 | **候选表 join 出 `displayName`**，**join 不到则回退 slug**（详情只返 slug —— `labels/service.ts:584`，名字无处可取）；候选表（`api/labels.ts` 既有件）与详情**同批取** |
| **P2** `Popover` + `Command` 形态（实测**零消费者**，无先例可抄） | **进可点原型定稿**（落点 `/dashboard/__proto/m4b4`，沿 M4b-3 §2.1d 惯例：真仓真件 + 假数据，**物料不进仓**）；原型须含「无匹配」「已达 10 上限」两态 |
| **P3** 段④ 删除禁用真值 × 版本列表**分页** | **UI 只依「已加载页」判定（提示性守卫）+ 服务端 400 兜底 toast + 显式登记该边界**（见 D6）；**不加全量查询、零后端改动** |
| **P4** 段② 无二次确认 vs 段③ 有确认 | **维持**（按主 design §9 危险操作清单划分 —— 含隐藏/归档/恢复/删除/yank/吊销，**不含标签挂卸**） |

**条 ③ 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D6** | 🟡 | **分页 × 删除守卫的判定缝**（**设计逻辑缝，非既有缺陷**）：服务端 `DELETE /:slug` 守卫为**全量**判定（存在 `PUBLISHED`/`YANKED` 即拒），UI 只看**已加载 20 条** ⇒ 第二页才有 `PUBLISHED` 时 UI 会**误放行** | **接受 + 登记**（见 P3）：UI 为**提示性**守卫，最终以服务端 400 + toast 为准；§4.3 段④ 已写明 |
| **D7** | 🔴 | **门户资产详情页标签 chips 文案为空**（**既有缺陷，非本批引入**）：服务端详情 `labels` = **`string[]`（仅 slug）**（`labels/service.ts:584`），前端类型却声明 `{slug,displayName}[]`（`api/types.ts:42`）且 `AssetDetail.tsx:207` 用 `label.displayName ?? label.slug` ⇒ 运行时两属性皆 `undefined` ⇒ **chips 有底色边框、无文案**。反证：`fetchAssetDetail` 无任何映射（`api/assets.ts:29-31` 直通 `apiGet`）；`labelsOfAsset` JSDoc 亦写「slug 列表」 | **登记**（**先不改**：M4a 门户已交付件）→ 最小修法 = 前端 join `/api/labels` 做 slug→displayName 映射；归属 **M4b-6**（标签治理批）或另立小 fix —— **待指令** |
| **D8** | 🟡 | 「yank **不占位**（非 `PUBLISHED` 行不渲染）」与「删除**占位但禁用**（禁删 3 态）」两分类**易混**，实现期易写反 | **登记**（§4.3 段③ + 批 plan T8 ⚠️ 已带提示，复核成立，不另改） |
| **R5** | 🟡 | `VersionListItem.changelog` **可 `null`**（`api/types.ts:101`），版本行第 5 元素渲染口径未定 | ✅ **已定**：`null` ⇒ 渲染**弱化色 `—`**（保行高与列对齐）—— **本项为助手判断、非用户显式拍板**，落 §4.3 |
| **R7** | ⚪ | 抽屉内**快速切换资产** ⇒ 旧请求可能覆盖新数据 | ✅ 并入 §4.4（复用 `useApi` 既有 **abort** 口径）；**编号跳 R6** 以避与服务端读面「R6/R6-b」混淆 |

**条 ④ · 壳 · 壳与导航** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 顶栏 `<h1>` 与页内 `PageHeader` **同字重复** | **本批照 M4b-3 先例保留页头标题（不动已交付件）**；**「顶栏 h1 与页头同字」登记为全站议题 → M4b-7 视觉收尾统一**（届时可选「页头去 title、只留 description/actions」） |
| **P2** 页内「返回工作台」/面包屑 | **不加**（顶栏已有标题 + 侧栏高亮已定位；加则需新件 + 新键） |
| **P3** `DEV_BATCH` 表项 | **只删本路由表项（`/dashboard/assets`），机制保留**（该表 `import.meta.env.DEV` 门控、他批仍在用；批 plan T7 已写） |
| **P4** M4b-8「发布」入口接缝 | **本批不动，仅留指认**（主 design §4 已登记侧栏「发布」+ 顶栏入口，归 **M4b-8**） |

**条 ④ 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D9** | 🟡 | **`TopBar.titleOf` 的 `section` 为死数据**：8 处赋值、全仓**零消费**（v1.44 撤「分区副标」后的遗留；返回类型仍声明 `{title, section?}`） | **登记** → 随 **M4b-7** 或触碰 `TopBar` 时清理（本批零改动） |
| **D10** | 🟡 | **`TopBar.tsx:47-49` 注释过期且与上游口径相抵**：注释写「标题 = **页面全称** / 分区 = 所属组」，真码 = 标题取**导航短词**（与 `SideNav` 同键）、分区已撤 —— 与主 design §11「导航短词 · 页头全称」不符 | **登记** → 同上 |
| **R8** | ⚪ | **零 `document.title` 机制**（全仓 grep 零命中）⇒ 浏览器标签页标题全站不随路由变化 | **登记**（非本批议题） |

> **本组「无缺陷」的实测反证（2 条，防漏报）**：① 侧栏高亮 `EXACT_MATCH_PATHS` 含 `/dashboard` ⇒
> **无「父子项双高亮」**（若缺该集合，`/dashboard/assets`.startsWith(`/dashboard`) 会令两项同亮）；
> ② `titleOf` 的匹配顺序把 `/dashboard/assets` 排在 `/dashboard` **之前** ⇒ **不会误配成工作台标题**。
> 两条均为真码回读结论（`SideNav.tsx:90,145` · `TopBar.tsx:51-61`），非推断。

**条 ⑤ · 跨面 · 跨面交互约定** —— 2026-09-18 拍板

| 拍板点 | 结果 |
|--------|------|
| **P1** 抽屉「2 请求」的三态合并 | **分段三态**：详情失败 ⇒ 整抽屉 `ErrorState` + 重试；详情成功、版本段失败 ⇒ **段内** `ErrorState` + **段内重试**（另两段照常可用）；「版本未就绪 ⇒ 危险区禁用」口径不变（条③ P3） |
| **P2** 写后重取的范围与手法 | **① 状态治理成功 ⇒ `invalidateCache('/api/assets')` + 抽屉内详情重取 ② 列表 `retryTick++`（返回列表即新数据）③ 版本删除成功 ⇒ 只重取版本段**；三卡计数（异页）**不主动重取**（手法先例 = M4b-3 `Submissions.tsx` 的 `invalidateCache` + `retryTick` 双件） |
| **P3** 响应式断点口径 | **以真码为准**（抽屉 `<640px` 全宽 / `≥640px` 560 · SideNav `<768px` 官方 Sheet）：**本批不改 `Drawer` 件、不引断点逻辑**；**登记订正主 design §5.2/§10**（**D11/D12**）。§4.2「`<1100px` 横向滚动不卡片化」本批**按文档实现**（与真码无冲突，M4a 已验证） |
| **P4** URL 状态化写法 | **沿用 `useMarketQuery` 既有写法零改动**（`q` 防抖 + `replace` 写 · `page` 即时写、`page=1` ⇒ 删参数 · 筛选变更删 `page`）；本批 `status` 维度沿 `label` 口径（即时写） |

**条 ⑤ 附带 findings（主动报）**

| # | 严重度 | 内容 | 处置 |
|---|:------:|------|------|
| **D11** | 🟡 | **主 design §5.2 响应式口径与真码不符（抽屉）**：文档「抽屉 `<1100px` → 全宽侧滑」，真码 `Drawer.tsx:40` = `w-full … sm:max-w-[560px]` ⇒ 真值 **`<640px` 全宽、`≥640px` 560**（Tailwind `sm` = 640px） | **登记** → 收尾回填时**随 D2/D3/D4 一并订正**主 design（本批零改动） |
| **D12** | 🟡 | **同上（侧栏）**：文档「SideNav `<900px` 折叠为图标态」，真码 = shadcn 官方 `useIsMobile()`（**768px**）⇒ `<768px` 自动 **Sheet**（非图标态）；**图标态由用户手动切换 + cookie 持久化，无 900px 断点** | **登记** → 同上 |
| **R9** | ⚪ | 版本徽章 `REJECTED` 真色仍为 `destructive`（红） | **不冲突**：本批「去红」仅指 `ConfirmDialog`；**全站去红归 M4b-7**（M4b-3 已登记，口径一致） |

> **自证一条（防误报留痕）**：`errors` 键数先用正则算得 **26**，**逐行回读实为 28** —— `network` / `unknown`
> 两个**非点号键**未被该正则捕获 ⇒ 批 design 的「28 键 / 本批后 35」**正确**，非缺陷。
>
> **★ 五条评审全闭**：清单 = 页面 × 壳 × 跨面（① 工作台三卡 · ② 我的资产六列 · ③ 资产管理抽屉 ·
> ④ 壳与导航 · ⑤ 跨面交互约定）；累计 findings **D1–D12 + R1–R9**（🔴 2 = D1 件表漏项[已修] / D7 门户 chips 空文案[登记]）。
> **下一步 = 抽屉可点原型**（落点 `/dashboard/__proto/m4b4`，沿 M4b-3 §2.1d 惯例：真仓真件 + 假数据，**物料不进仓**）。

### 2.1d 原型评审记录（2026-09-18 · 可点原型两视图）

> 纪律同 M4b-3 §2.1d：**真仓真件 + 假数据 + 状态开关**；物料**不进仓**（`__proto/` 两文件 + `main.tsx` 的 DEV 路由行，评审收尾即删）。
> 入口：列表/抽屉视图 `/__proto/m4b4` · **详情页管理区视图** `/__proto/m4b4/detail`。

**净结果（相对 §4 初稿的差异 —— 以下为现行口径）**

| 面 | 初稿 → 定稿 |
|----|------------|
| 列表列集合 | 6 列 → **9 列**：`名称 · 类型 · 状态 · 标签 · 版本 · 下载 · 收藏 · 更新 · 操作` |
| 类型列 | ~~`--type-*` 色块 + 文案~~ → **无色图标（16px）+ 文案**（`TypeIcon` 无 `className` prop ⇒ **外层 `span` 定色**） |
| 操作列 | ~~`⋯` 下拉菜单~~ → ~~`ScanEye` 图标钮（快速预览/开抽屉）~~ → **`Eye` 图标钮 · 真链接直跳详情页**（**v1.9 最终**；文案由 `aria-label`/`title` 承载） |
| 抽屉 | 四段 → **纯预览**：工具行（状态徽章 + 「快速预览」定位 + 「完整详情 ↗」）+ **下载/收藏统计行** + **描述** 段 + **标签+-** 段 |
| 管理动作 | 抽屉内 → **资产详情页管理区**（§4.6 · **按权限显隐**） |
| 段名 | `标签挂载` →（`标签增删`）→ **`标签+-`**（沿革留痕，见 R10） |
| 动词 | `挂载` 退役 → **添加 / 移除**（回归 §6.1 既有键 `label.add`；与 skillhub 对齐） |
| 侧栏条目 | `标签管理` → **`标签定义`**（`admin.labels` **键名保留**、值变更；3 个消费点一次到位） |
| 详情页 | 头卡承载 **[下载] [收藏]**（原右栏下载卡移除）；右栏 = 元信息卡（下载/收藏图标**无色**）+ **标签+- 卡（独立）** + **管理卡** |
| **抽屉** | ~~四段 → 纯预览~~ ⇒ **整体取消（v1.9）**：列表操作列图标钮 = **真链接直跳详情页**（`/assets/:slug`）；件表去 1 件 · i18n 去 6 键 · dogfood G7/G8 改写 |
| **star** | **并入本批**（v1.8）：~~原「依赖 star 批」~~ ⇒ 收藏能力（表 / 计数 / 端点 / 读面）+ 四处消费（列表列 · 抽屉统计 · 详情页按钮 · 门户卡）**同批交付**（§5.1 ⑧） |

**逐条记录（可追溯）**

| # | 用户指令 | 处置与留痕 |
|---|---------|-----------|
| R1 | 列信息 + 标签 | 新增「标签」列（chips 最多 2 + `+N`，`title` 挂全量） |
| R2 | 列名「资产」→「名称」 | `col.name` 文案变更（zh/en 同步） |
| R3 | `⋯` 列名改「操作」 | `DataTable` 加**加性 prop `rowActionsHeader?`**（不传 ⇒ 维持 `sr-only` 表头 ⇒ M4b-3 两页零回归；实测全仓**仅本批传**） |
| R4 | 不要用 menu，直接「打开详情」 | `⋯` 菜单作废 ⇒ **共享动作集件 `asset-actions.ts` 随之作废**（列表无矩阵 ⇒ 无「双写漂移」风险）· `menu.*` 6 键**删 5**（仅留 `menu.open`，拟更名 `action.open`） |
| R5 | 「打开详情」换 svg 图标 | `Eye` → **`ScanEye`**（快速浏览语义；与 M4b-3「操作列图标化」口径一致） |
| R6 | 抽屉 = 快速浏览（理解确认） | 抽屉定位改写：**快速预览 + 唯一出口「完整详情 ↗」**（跳 `/assets/:slug`） |
| R7 | 文案「就地管理」→「快速预览」 | 工具行文案定稿 |
| R8 | 抽屉加「描述」删「状态治理」 | 段集合变更（状态治理动作并入详情页管理区；状态徽章保留在工具行为**信息**） |
| R9 | 「+挂载标签」→「添加标签」 | 按钮 + 3 处 toast 文案统一（原「挂载」系我自写偏离，非设计决定） |
| R10 | 「标签挂载」→「标签增删」→「标签+-」 | 段名沿革：`标签挂载`（初稿）→ `标签管理`（中间版，作废）→ `标签增删`（作废）→ **`标签+-`（现行）** |
| R11 | 列里需要「下载」「star」 | 列表加两列；**star 依赖 star 能力（未实现）** ⇒ 见「依赖登记」 |
| R12 | 抽屉也显示「下载」「star」 | 抽屉加统计行（与列表同口径：`compactCount` + 图标） |
| R13 | star 列中文「收藏」· 英文「star」 | `col.star` **中英刻意不对称**（用户指定） |
| R14 | 类型图标不要颜色 | 类型列去色（作废条② P1 的「色底」一半） |
| R15 | 抽屉「版本管理」「危险区」都不要，做到完整详情 | 两段整体移出 + 连带清理（版本假数据/常量/确认框/开关） |
| R16 | 详情页管理区承接**全部** + **按权限显示** | §4.6 管理区规格 + 权限矩阵（逐动作对照**服务端真码守卫**） |
| R17 | 标签用单独的 card | 详情页右栏：标签卡**独立**（位于元信息卡与管理卡之间） |
| R18 | 元信息卡「下载」「收藏」数字前有图标 | 加 `Download` / `Star` 图标 |
| R19 | 元信息卡的收藏图标不要有颜色 | 元信息卡图标**一律** `text-muted-foreground`（收藏态由头卡按钮表达） |
| R20 | 还得有「收藏」「下载」button | 成对出现：**移到头卡右侧**（下载 = 主按钮 · 收藏 = 次级按钮，已收藏 ⇒ 星形填充 warning） |
| R21 | 放 title card 好看些 | 头卡两栏：左 = 名称 + 状态徽章；右 = 两按钮；下载规则小字下移一行 |
| R22 | 管理区做进原型 + 位置按推荐 | 新视图 `/__proto/m4b4/detail`（右栏粘性列 · 对齐真页 `sticky top-[78px]`）；**5 档权限开关** + 「隐藏 / 禁用+说明」两形态可对比 |
| R23 | 原信息的收藏图标不要颜色 | 列表 star 列 + 详情页元信息卡图标**均无色**；仅**交互按钮**保留收藏态表达 |

**依赖登记（本批无法独立完成项）**

| 项 | 依赖 | 处置 |
|----|------|------|
| 列表 `收藏` 列 · 抽屉收藏统计 · 详情页「收藏」按钮 | ~~star 能力全链路未实现~~（实测：14 表无 star 表 · 15 路由无 star 端点 · protocol 无字段）⇒ **已并入本批**（§5.1 ⑧） | ✅ **依赖消解（v1.8）**：用户先定「UI 收尾后先做 star（建议 `M4-star`）」，随即改为「**并入 M4b-4**」⇒ 不再需要前置批，**能力与三处消费同批交付** |
| 详情页「发布新版本」入口 | M4b-8 发布批 | 本批**仅占位**（真入口归 M4b-8） |
| 详情页「审核」动作 | M4b-5（用户标注「还在讨论」） | 本批**占位 + 登记** |
| 详情页管理区（改 M4a 已交付件 `pages/AssetDetail.tsx`） | — | **本批承接**（批件不追改；先例 = M4b-2 改 M4a 已交付件） |

**顺带发现（登记，不阻塞）**
- **口径冲突**：`docs/00` §2.2「任何人可向任意资产提交更新」 vs 真码 `POST /:slug/versions` 要求 `canManageAsset`（owner ∨ 管理档）⇒ 登录非 owner **无法上传** ⇒ 归 **M4b-8 立项时定**。
- **可议**：owner 删版本权限（2 态）小于管理档（4 态）—— UI 照实体现，待议。
- **环境**：原型内 toast 不渲染（sonner 容器存在、`[data-sonner-toast]` 命中 0；列表页既有路径同样如此）⇒ 待查，不影响形态评审。
- **术语对标（skillhub 真仓实测）**：状态文案它用「**正常**」而我们用「活跃」（待定）；版本 8 态文案差异 3 处（`SCANNING` 安全扫描中 · `UPLOADED` 已上传 · `REJECTED` 已拒绝）。

### 2.2 承接主 design 的跨批契约（引用不复制）

| 契约 | 主 design 落点 | 本批用法 |
|------|---------------|---------|
| U4 工作台三卡 | §2.4 **U4** | 直接实施（三卡集合 / 整卡链接 / 单卡三态 / 待审核数 = 队列 total） |
| U5 我的资产（**owner-only · 含全部状态**） | §2.4 **U5**（v1.51 修订） | 集合语义与**九列**集合；列表面 ≠ 可见范围（§2.1 R6-a） |
| ~~U6 资产管理抽屉 = 快速预览（560）~~ ⇒ **作废（v1.9 · 用户取消抽屉）** | §2.4 **U6**（v1.51 改写 → **v1.53 取消**） | **无依赖**（抽屉整件取消）；管理动作归**详情页管理区**（§4.6 · 逐动作按真码守卫显隐） |
| 入口显隐 | §4 表 + 显隐组合锚点 | 本批**零入口改动**（两页均已在「个人」组，任何登录用户可见） |
| 路由 | §5.1 / §5.2 | 两路由**已存在**（`/dashboard` 真页过渡形态 · `/dashboard/assets` 占位），本批只换实现 |
| 端点契约 | §7.1 表 | 标签公开列表 / 资产详情 / 版本列表 / 状态治理 / 版本删除 / yank / 资产删除 / 标签挂卸 —— **逐行照抄，零新契约** |
| R6 系列缺口与处置 | §7.2（G1–G3 + 处置 R6/R6-b） | 本批实施对象（§5） |
| 页面数据编排 | §7.3 | 工作台 3/1 请求裁剪 · 抽屉动作后**局部重取** · 版本列表懒加载 |
| 状态语义映射 | §10.1（`ASSET_STATUS_VARIANT` / `VERSION_STATUS_VARIANT` 已落 M4b-1） | 直接用 `StatusPill`，**不新增映射** |
| 线框 | §12（`/dashboard` 与 `/dashboard/assets` 两张，归属 **M4b-4**） | **引用不复制**；本批只补「抽屉四段」的段内结构（§4.3） |
| 视觉真值 | M4a design §4.4（全站 SSOT） | 引用不复制；本批特有值 = 表格密度 40 / 抽屉宽 560（主 design §10.1 已落值） |

### 2.3 官方件装配清单（复用，**零新增依赖**）

| 用途 | 官方件 / 已落件 | 关键真值 |
|------|----------------|---------|
| 列表 | `console/DataTable`（shadcn `Table` 封装） | 表头 `h-10 px-2` = 40px · 单元格 `p-2` · `loading`/`error`/`onRetry`/`emptyMessage`/`skeletonRows`/`rowActions` 齐 |
| 抽屉 | `console/Drawer`（shadcn `Sheet` 封装） | **宽已由件内固定 = 560**（`Drawer.tsx:40` `w-full gap-0 p-0 sm:max-w-[560px]`，**无宽度 prop** ⇒ 本批**零改动**，勿再「覆盖」）· `title`/`description`/`footer`；**必带 `SheetTitle`**（硬规则 4） |
| 二次确认 | `console/ConfirmDialog` | **已含 `requireReason` 变体**（yank 直接复用）· `destructive` 本批**统一 false**（去红） |
| 状态徽章 | `console/StatusPill` | `ASSET_STATUS_VARIANT` / `VERSION_STATUS_VARIANT`（M4b-1 已落，**本批不改映射**） |
| 筛选条 | `console/FilterBar` | `statusOptions` / `status` / `q` + **`FILTER_ALL='ALL'`** 常量（显式 `status=ALL` 的载体） |
| 页头 | `console/PageHeader` | `title` / `description` / `actions` |
| 标签选择器 | shadcn `Popover` + `Command`（+`cmdk`，**M4b-1 已落仓**） | 可搜索候选 + chips × 移除 |
| 分页 | `ui/Pagination` | 组件 props = `{ total, limit, offset, onPageChange(offset) }` —— **组件吃 `offset`、URL 用 `?page=`** ⇒ **双语义换算点**（唯一实现口径）：`offset = (page - 1) * limit` · `onPageChange: (o) => setPage(o / limit + 1)`；**先例** `components/market/CenterPage.tsx:238-240`。★ **仅 `total > limit` 时渲染**（跨批契约：M4b-3 批 design §4.4.1 口径 —— 否则 3 条数据也出「1 / 1」空控件，该缺陷已在 M4b-3 T6 修过） |
| 加载 / 空 / 错 | `Skeleton` 组合（`DataTable` 内置）· `ui/EmptyState` · `ui/ErrorState` | 三态 + `onRetry` |

> **官方件硬规则**（主 design §2.4「官方件规则（全批适用）」16 条）对本批同样生效：`className` 只做布局 ·
> 变体/token/CSS 变量/加 variant/包组件五级顺序 · `Dialog`/`Sheet` 必带 Title · 覆盖层禁手写 z-index ·
> 条件类一律 `cn()` · CLI-only 纪律。**本批不新增任何依赖**。

## 3. 件与路由规格

### 3.1 新建件（**17** —— 含 star 最小集 3 件 + T12 前置补件 + **T11-e 列表件**；~~抽屉件~~ 已取消 · v1.9；**计数回填见 §9.7 ⑥**）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `apps/server/src/http/me.ts` | 新 router（`createMeRoutes`），挂 `/api/me`；本批 **1 端点**：`GET /assets`（`requireAuth`） |
| 2 | `apps/server/src/http/asset-item.ts` | **中性序列化器** —— `assetItem()` + `AssetItemMeta` 自 `assets.ts:111` 迁出（**Q4 a2**：不把 `me` 面绑到 `assets.ts` 的私有件上） |
| 3 | `apps/web/src/api/me.ts` | 前端封装 `GET /api/me/assets`（与 server `http/me.ts` **同构命名**；`api/` 现有 11 件的同族） |
| 4 | `apps/web/src/pages/Assets.tsx` | **我的资产**列表页（替换 `main.tsx:104-111` 的占位） |
| 6 | `docs/smoke/scripts/m4b4-seed-assets.ts` | 造数脚本（幂等 upsert；**写库须授权** —— §9.5） |
| 7 | `docs/smoke/scripts/m4b4-personal-b-dogfood.ts` | dogfood 脚本（多角色 / 多状态 —— §9.3） |
| 8 | `apps/web/src/api/audit.ts` | 前端封装 `GET /api/audit`（工作台「最近审计」卡用；**M4b-6 审计页复用**）—— **§2.1c 条① P1 追加** |
| 9 | `apps/web/src/components/console/AssetAdminCard.tsx` | **详情页管理区卡**（§4.6）：按权限显隐的动作组（资产状态 / 版本 / 审核占位 / 危险区）—— **§2.1d R16** |
| 10 | `apps/web/src/components/console/LabelCard.tsx` | **标签卡 / 标签段共用件**（chips × + `Popover`+`Command` 选择器 + 上限禁用）—— 抽屉「标签+-」段与详情页标签卡**同一件**，防两处漂移（**R9 / R17**） |
| 11 | `apps/web/src/components/console/asset-stats.tsx` | **下载/收藏展示小件**（图标 + `compactCount` · 图标**一律无色** · 收藏态表达可开关）—— 列表列 / 详情页元信息卡**两处共用**（~~抽屉统计行~~ 随抽屉取消 · v1.19）（**R11 / R12 / R18 / R19 / R23**） |
| 12 | `apps/server/src/assets/stars.ts` | **star 服务**：`starAsset` / `unstarAsset`（**同事务内维护 `asset.star_count` 冗余列**；幂等：已在 ⇒ 不重复计数）—— **v1.8 star 最小集** |
| 13 | `apps/server/drizzle/00xx_*.sql`（**生成物**） | **迁移**：新表 `asset_star`（`UNIQUE(asset_id, user_id)` + 双向 FK `ON DELETE CASCADE`）+ `asset.star_count integer NOT NULL DEFAULT 0` —— **本批唯一一次迁移**（drizzle-kit 生成，文件入库；`meta/**` 纳入 format 排除清单既有口径） |
| 14 | `apps/web/src/api/stars.ts` | 前端封装 `PUT / DELETE /api/assets/:slug/star`（与 `api/me.ts` 同族命名） |
| 15 | `apps/web/src/components/market/StarButton.tsx` | **收藏按钮共用件**（**详情页头卡** —— 2026-09-18 起门户卡改**纯展示**，见 **F67**；已收藏 ⇒ 星形填充 · 未登录 ⇒ 跳登录提示）—— 与 `asset-stats`（展示件）分工：**本件负责动作** |
| 16 | `apps/web/src/hooks/useViewer.ts` | **观看者（会话 + 档位）读取**：`useAuth()` 的只读包装（零新增请求）+ 派生档门（`canManageAll` / `isSuperAdmin`）—— **T12 前置件**（F47）；上表 `—` 行的 `lib/asset-permissions.ts` 计入本表 |
| — | `apps/web/src/lib/asset-permissions.ts` | **前端权限判定单点**（`canManage` / `canYank` / `canPrivileged` / 可删版本态集 —— **逐条对齐服务端真码守卫**，矩阵见 §4.6）—— **R16** |
| — | ~~`components/console/asset-actions.ts`~~ | **作废**（R4：列表无 `⋯` 菜单 ⇒ 无「列表与抽屉同矩阵」需求 ⇒ 无双写漂移风险） |
| 17 | `apps/web/src/components/market/AssetList.tsx` | **门户行列表件**（**T11-e**）：官方 `Table` 族（`table-fixed` + 表头 5 列 + `AssetListLoading` 载态）—— 视图切换的列表形态；同批另有 `ui/shadcn/item.tsx` **落仓后弃用并删除**（**F68**）|

### 3.2 改造件（**20** 代码 + 3 文档 —— 增量见 §5.1 ⑧ star 与 §9.7 ⑥ 计数回填）

| # | 文件 | 改造内容 |
|---|------|---------|
| 1 | `apps/web/src/pages/Dashboard.tsx`（现 **73 行**） | 过渡形态（`ComingSoon` 内容槽 + 按档裁剪入口）→ **三卡 landing**（§4.1） |
| 2 | `apps/web/src/main.tsx` | `/dashboard/assets` 占位 → 真页 `Assets`；**删** `DEV_BATCH['/dashboard/assets']` 条目（`:55`） |
| 3 | `apps/web/src/hooks/useMarketQuery.ts`（现 **104 行**） | 加**可选** `status` 维度 —— **不传时行为零变化**（不读不写 `status` param）⇒ 门户中心页 `CenterPage.tsx:119` **零 diff** |
| **4** | `apps/web/src/api/reviews.ts` | 加**队列读面**函数 `fetchReviewQueue`（`GET /api/reviews?status=&limit=&offset=`）—— 现有仅 `fetchMyReviews`（`/api/reviews/mine`，`:67`）⇒ 工作台「待审核」卡与 **M4b-5 队列页**共用。**§2.1c 条① P1 追加** |
| 5 | `apps/server/src/assets/service.ts`（现 **243 行**） | `listViewableAssets` **参数化**（`ownerId?` / `status?`；原硬编码 `ACTIVE` 降为默认值） |
| 6 | `apps/server/src/http/assets.ts`（现 **828 行**） | ★ **R6-b**：`assertAssetReadable` 授权集扩展（§5.1 ④）；`assetItem` 改 `import`（迁出后） |
| 7 | `apps/server/src/app.ts` | 挂载 `app.route('/api/me', createMeRoutes({ db: deps.db }))` |
| 8 | `apps/web/src/i18n/zh.ts` + `en.ts` | 新组 `assets` + `dashboard` 补键 + `common` +1 + `errors` +7（§6） |
| 9 | `apps/server/src/http/assets.test.ts` | 2 处断言更新 + 授权集三档对照 + 四面对照 + 公开面回归锁（§5.3） |
| 10 | 规范 `05-identity-access.md` · `08-data-model.md` | **Q11 A**：原地改写（§9.6） |
| 11 | 主 design `2026-09-10-m4b-admin-console-and-auth-design.md` | 收尾回填：§11 键数**实测值** · §2.3 批件登记表本批行 · **D2/D3 订正**（§9.7） |
| 12 | `apps/web/src/components/console/DataTable.tsx` | 加**加性** prop `rowActionsHeader?: string`（传入 ⇒ 渲染**可见**操作列表头；不传 ⇒ 维持 `sr-only` 现状）—— **R3**（M4b-3 两页零回归，实测全仓**仅本批传**） |
| 13 | `apps/web/src/pages/AssetDetail.tsx`（**M4a 已交付页** · 现 **287 行**） | **详情页改造**（§4.6）：头卡加 `[下载] [收藏]`（+ 下载规则小字）· 右栏加 **标签+- 卡** 与 **管理卡**（按权限显隐）· 取档位用既有 `useAuth`；**不改**三 Tab 既有能力 —— **R16–R21** |

| 14 | `apps/web/src/components/market/AssetCard.tsx`（M4a 已交付件） | 门户资产卡增 **`StarButton`**（消费者面入口之一）—— **v1.8** |
| 15 | `apps/server/src/assets/service.ts` · `http/assets.ts` | star 读面：列表/详情响应带 `starCount`（**读 `asset.star_count` 冗余列 ⇒ 零额外查询**）与 `starredByMe`（登录态；匿名 ⇒ `false`）；star 端点挂载 —— **v1.8** |

| 16 | `apps/web/src/api/assets.ts` · `api/versions.ts` · `api/labels.ts` | **写操作 wrappers 6 个**（`patchAssetStatus` / `deleteAsset` / `deleteVersion` / `yankVersion` / `attachLabel` / `detachLabel`）—— **T12 前置件**（F47）|
| 17 | `apps/web/src/api/client.ts` | 加性补 **`apiPut`**（原仅 get/post/patch/delete；标签挂载端点为 `PUT`）—— **F57** |
| 18 | `apps/web/src/components/market/detail/VersionCompare.tsx` | 加性可选 prop **`rowActions?`**（版本行右侧动作位；不传 ⇒ 零变化）+ **版本徽章 3 态 → 8 态 `StatusPill`**（修正既有缺陷，用户 2026-09-18 拍板）—— **F48** |
| 19 | `apps/web/src/pages/Assets.tsx` | 下载/收藏列改用共用件 **`asset-stats`**（原为内联实现）—— **F49** |
| 20 | `apps/web/src/components/market/CenterPage.tsx`（M4a 已交付页 —— **§9.1「零 diff」契约自 v1.22 起改为「零回归」**） | **T11-e**：结果计数行加**视图切换**（官方 `ToggleGroup`）+ **折叠搜索**（官方 `Collapsible` + `InputGroup`，工具条下方撑满宽度）；**删页头搜索框**（去重复入口）；载态随视图分派（`AssetListLoading`）；i18n 消费 6 新键 |

> 附注：侧栏条目更名「标签定义」= **i18n 值变更**（`admin.labels` 键名保留；zh/en 各 1 行，已在改造件 #8 覆盖，**不新增文件**）；3 个消费点（`SideNav` / `TopBar` / `main.tsx` 占位标题）随键值一次到位。
> **件表增量（T11-f · v1.23）**：**新建件 0**（复用官方 `Select`（排序控件 · v1.27）+ 官方 `ToggleGroup`（视图切换）+ 官方 `Button`/lucide 图标）；**改造件 +4** —— `hooks/useMarketQuery.ts`（加性 `sort`/`dir` 维度，照 `status` 先例）· `api/assets.ts`（列表参数透传 `sort`/`dir`）· `components/market/AssetList.tsx`（列头可点排序 · 本表 §3.1 #17 件内增量）· `components/market/CenterPage.tsx`（排序 chips · 本表 §3.2 #20 件内增量）；**脚本 +2** —— `m4b4-seed-assets.ts`（排序样本）· `m4b4-personal-b-dogfood.ts`（**G22 ×13** —— 立项时按 7 条口径登记，实现期细化为 13 条，实测见证据 §14.2）。

### 3.3 路由（本批形态）

| 路由 | 形态变化 |
|------|---------|
| `/dashboard` | **已存在**（真页）⇒ 本批**换内容**（过渡形态 → 三卡），路由表零改动 |
| `/dashboard/assets` | **已存在**（占位）⇒ 本批**换真页** + 删 `DEV_BATCH` 条目 |

> 两路由的**入口显隐**（「个人」组 · 任何登录用户）与**守卫**（`RoleGuard` `ROLE.USER`，`main.tsx:71-72`）
> 均已由 M4b-2 交付 ⇒ **本批零路由新增、零入口改动**（主 design §4/§5.2 为唯一源，引用不复制）。

## 4. 页面规格（本批核心）

### 4.1 工作台 landing `/dashboard`

**结构**：`PageHeader`（标题复用 `dashboard.title`）+ 三卡栅格（`grid` 3 列 → 窄屏收敛；单卡态**保持 1/3 列宽左对齐**）。

| 卡 | 数据源 | 内容 | CTA → |
|----|--------|------|-------|
| **待审核** | `GET /api/reviews?status=PENDING&limit=1` → `total`（**全站队列**） | 大数字 + `dashboard.card.pending.title` | `/admin/reviews`（`去处理`） |
| **我的资产** | `GET /api/me/assets?status=ALL&limit=1` → `total`（**我名下全集**） | 大数字 + `dashboard.myAssets`（**标题复用既有键**） | `/dashboard/assets`（`去管理`） |
| **最近审计** | `GET /api/audit?limit=5` | 5 行 = **时间 + 动作（原文枚举）+ 对象（`targetType`/`targetId`）**，**不含操作人** | `/admin/audit`（`查看全部`） |

**请求口径（Q9 A · U4）**
- `role ≥ 10` ⇒ **3 请求并发**；`role < 10` ⇒ **1 请求**（只 `/api/me/assets`），只渲染「我的资产」卡
  （不发必然 403 的请求）
- **每卡独立三态 + 独立重试**：一卡失败不拖累另两卡；`ErrorState` 的 retry **只重取该卡**
- **零值照常显示「0」**（0 是有效信息，不做空态替换）
- 卡级 403 ⇒ **就地 `ErrorState`**（不退化为空态，对齐主 design §9「403 → 就地提示」）

**结构 / 无障碍（Q9 D）**
- 整卡 = `<Link>` 覆盖层；内层 CTA 用**非 anchor** 的样式化 `<span>`（`aria-hidden`）
  ⇒ **屏幕阅读器只读「整卡链接」，无嵌套 `<a>`**
- 每卡 `Skeleton` 载态（`DataTable`/`Skeleton` 组合，零新件）

### 4.2 我的资产 `/dashboard/assets`

**列集合（固定 9 列 · U5 修订 —— §2.1d R1/R2/R3/R11/R13/R14）**

| 列 | 内容 | 对齐 / 形态 |
|----|------|------------|
| **名称** | 资产名（`latestName` 回退 `slug`）+ **slug 副行**（`mono`） | 左对齐（`col.name` = 名称/Name —— R2） |
| **类型** | **无色 `TypeIcon`(16px) + 文案**（`type.*` 复用 `market` 组既有键） | 左对齐；**禁色底**（R14）；`TypeIcon` 无 `className` prop ⇒ **外层 `span` 定色** |
| **状态** | `StatusPill kind="asset"`（`ASSET_STATUS_VARIANT` 已落）· 文案取 `assets.filter.status.*`（3 态复用筛选键，先例 = M4b-3 `STATUS_KEY`） | 左对齐 |
| **标签** | chips：**最多 2 个 + `+N`**，`title` 挂全量；无标签 ⇒ `—` | 左对齐；**数据形状见 §5.2（Q14 = B）** |
| **版本** | `latestVersion`（`null` ⇒ `—`） | **`tabular-nums`** |
| **下载** | `asset-stats` 件（`Download` 图标 + `compactCount`）—— **零服务端改动**（`AssetItem.downloadCount` 已在响应） | **`tabular-nums`** · 图标无色 |
| **收藏** | `asset-stats` 件（`Star` 图标 + `compactCount`，已收藏 ⇒ 填充 warning）—— **含在本批内（v1.8 §5.1 ⑧）**：`asset.star_count` 冗余列直读，零额外查询 | **`tabular-nums`** · 列头 = `col.star`（zh「收藏」/ en「star」，**刻意不对称** R13） |
| **更新** | `updatedAt`（本地化短格式） | **`tabular-nums`** |
| **操作** | **单个 `Eye` 图标钮 · 真链接直跳详情页**（`/assets/:slug`；`aria-label`/`title` = 「打开详情」——v1.9 抽屉取消后口径；~~ScanEye + 打开抽屉~~）—— 原文：`aria-label`/`title` = `menu.open` 文案） | 右对齐；**无下拉菜单**（R4/R5） |

> 列表**不再承载任何治理动作**（R4/R15/R16）：所有管理动作集中在资产详情页管理区（§4.6）。
> 列宽变化 ⇒ `< 1100px` 横向滚动阈值不变（图标钮 32px 比原下拉更窄）。

**筛选与状态**
- `FilterBar`：状态下拉（**默认「全部」⇒ 显式发 `status=ALL`** —— U5 硬约束，防「名实不符」）+ q 搜索
- URL 化：`?status=&q=&page=`（**复用扩展 `useMarketQuery`**，Q2 A）
- q **debounce 300ms** 后写 URL 才发请求（沿 M4a 纪律）；筛选/搜索变更 ⇒ **`page` 回落 1**
- 分页：**offset 替换式**（管理表格无跨页选中需求，主 design §9）· **`?page=` ↔ 组件 `offset` 换算公式**与**渲染条件（仅 `total > limit`）**见 §2.3 分页行（唯一口径，不在此复写）

**三态与响应式**
- 载态 = `DataTable` 内置 `Skeleton` 行占位；空态**两套文案**（U5）：① 从未有资产 → `assets.empty.title` + `hint` ② 筛选无结果 → `assets.empty.filtered`
- `< 1100px` ⇒ 容器**横向滚动**（保留列完整，**不卡片化** —— 控制台列信息密度优先，主 design §5.2）

### 4.3 ~~资产管理抽屉~~ ⇒ **取消**（v1.9 · 用户 2026-09-18「我们简单一点，这个抽屉不做了，取消，一点预览，直接进入完整详情」）

> **结论**：**不做抽屉**。列表「操作」列的图标钮 = **真链接**，点击**直接进入完整详情页**（`/assets/:slug`）。
> 收益（如实记账）：少 **1 个新件**（`AssetDrawer.tsx`）· 少一整套抽屉交互态（打开/关闭/请求竞态/无 URL 状态）·
> 少 **6 个 i18n 键**（`drawer.title` / `section.previewHint` / `desc.*` ×2 / `stat.*` ×2）· 少 **约 4 组 dogfood 断言** ⇒
> **列表 ↔ 详情零中间态**。
>
> **作废留痕（本节历史）**：~~四段抽屉~~（状态治理 / 标签+- / 版本管理 / 危险区）⇒ 管理动作先归详情页管理区（v1.51）⇒
> ~~纯预览抽屉~~（工具行 + 统计行 + 描述 + 标签+-）⇒ **整体取消（v1.9）**。相关原型评审条目
> **R6 / R8 / R9 / R10 / R12 / R15** 中与抽屉**形态**有关的部分**随之作废**（其结论——如「管理动作归详情页」「动词统一为添加/移除」——**仍然有效**）。
>
> **操作列最终形态**：`Eye` 图标钮（`Button asChild` + `Link`，`aria-label`/`title` = 「打开详情」）——
> **与 M4b-3「我的提交」操作列同款**（跨页一致）；`ScanEye`（快速浏览语义）随抽屉退役。

### 4.4 全局交互约定

- **危险操作**（隐藏/归档/恢复/删除资产/删除版本/yank）→ **`ConfirmDialog` 二次确认**，文案含对象坐标与后果
  （主 design §9）；**本批统一 `destructive={false}`（去红）**，是否恢复红色语义**留 M4b-7 裁决**（Q8 F）
  —— **适用面随管理区迁移**（v1.7）：确认框**统一出自资产详情页管理区**（§4.6），抽屉内**零确认框**（纯预览）
- **写操作成功** → **局部重取 + 轻提示 `Toaster`**（不整页刷新，保留筛选与滚动位置）
- **错误** → `errors` 组按 code 本地化；401 ⇒ 按 U3 三分类分流（本批两页均在受保护前缀内 ⇒ 走 `/login?next=`）；
  **403 ⇒ 就地提示**（不退化为空态）
- **抽屉内快速切换资产** ⇒ 旧请求 **abort**（复用 `useApi` 既有 abort 口径），防旧响应覆盖新数据（**条③ R7**；编号跳 R6 —— 避与服务端读面「R6/R6-b」混淆）
- **语言切换** ⇒ `useApi` 语言感知缓存键含 `lang`（沿用 M4a），本批零改动

### 4.5 UI 结构与组件树（本批两页）

```text
pages/Dashboard.tsx（改造）
└─ PageHeader(title=dashboard.title)
└─ div.grid（3 列；单卡态保持 1/3 宽）
   ├─ DashboardCard（待审核）    ─ Link → /admin/reviews   [Skeleton | ErrorState(retry)]
   ├─ DashboardCard（我的资产）  ─ Link → /dashboard/assets [Skeleton | ErrorState(retry)]
   └─ DashboardCard（最近审计）  ─ 5 行 + Link → /admin/audit [Skeleton | ErrorState(retry)]

pages/Assets.tsx（新建）
└─ PageHeader(title=assets.title)
└─ FilterBar(status∈{ALL,ACTIVE,HIDDEN,ARCHIVED} · q · placeholder)
└─ DataTable（9 列 · rowActions=**`Eye` 真链接图标钮** + rowActionsHeader="操作" · loading/error/empty/skeleton）
└─ Pagination（?page= ↔ offset 换算）
└─ （**无抽屉** —— 操作列图标钮 = `Link` 直跳 `/assets/:slug`）

~~components/console/AssetDrawer.tsx（新建 · 纯预览）~~ ⇒ **取消（v1.9）**：抽屉整体不做；列表直接跳详情页。

pages/AssetDetail.tsx（改造 · M4a 已交付页 —— 唯一完整视图 + 管理区）
└─ 面包屑 → 头卡（名称 + StatusPill + [下载][收藏] 按钮 + 下载规则小字 + 标签行）
└─ grid [1fr_320px]
   ├─ 主列：Tabs（总览 / 文件 / 版本）
   │    └─ 版本 Tab 行内动作：删除（owner 2 态 / 管理档 4 态）· 撤回分发（仅管理档，仅 PUBLISHED 行）
   └─ 右栏 aside（sticky top-[78px]）
        ├─ 元信息卡（作者 / 更新时间 / 下载 / 收藏 —— 图标一律无色）
        ├─ LabelCard（独立「标签+-」卡）
        └─ AssetAdminCard（管理区 · 按权限显隐：资产状态 / 版本 / 审核[占位] / 危险区）
```

> **抽屉/对话框状态不进 URL**（次要状态，同 M4a 版本对比对的处置；主 design §5.2 已定）。

### 4.6 资产详情页管理区（改 M4a 已交付页 · §2.1d R16–R21）

> **定位**：详情页是**唯一完整视图**，同时承载**全部管理动作**（用户 2026-09-18 拍板：「管理区承接全部，
> 包含『标签+-』『发布新版本』『状态治理』『版本管理』，**根据用户权限来显示**」）。
> 页面上仍是公开面（匿名可读）⇒ 管理动作**逐条按权限显隐**，不是整块一刀切。

**版式**（对齐真页真码：面包屑 → 头卡 → `grid grid-cols-[1fr_320px] items-start gap-4`）

| 区 | 内容 | 可见性 |
|----|------|--------|
| **头卡** | `h1` 名称 + `StatusPill` + **`[下载 vX.Y.Z]`（主按钮）** + **`[收藏 N]`（次级按钮；已收藏 ⇒ 星形填充）** + 下载规则小字（匿名可下载 · 限流 60/分·IP） + 标签行（只读 chips） | 全公开（消费者面） |
| **主列三 Tab** | 总览 / 文件 / 版本 —— **不改 M4a 既有能力**（版本列表的首屏/加载更多/行内容**沿用 M4a 既有渲染**，本批**只增行内动作**） | 行内动作按权限 |
| **右栏 · 元信息卡** | 作者 / 更新时间 / 下载 / 收藏 —— **图标一律无色**（R18/R19/R23） | 全公开 |
| **右栏 · 标签+- 卡（独立）** | `LabelCard` 共用件（chips × + 添加标签 + 特权标签按钮） | 按权限（R17） |
| **右栏 · 管理卡** | `AssetAdminCard`：资产状态 / 版本 / 审核（占位）/ 危险区 | **按权限**（下表） |

**权限矩阵（逐条对齐**服务端真码守卫** —— 前端单点 `lib/asset-permissions.ts`；判定源 `assets/manage.ts:19` `canManageAsset`）**

| 动作 | 服务端真源（真码实测） | owner | 管理档 ≥10 | 超管 ≥100 | 登录非 owner | 访客 |
|------|----------------------|:---:|:---:|:---:|:---:|:---:|
| 状态治理（隐藏/归档/恢复） | `PATCH /:slug/status` → `assertManageable` | ✅ | ✅ | ✅ | ✗ | ✗ |
| 删除资产 | `DELETE /:slug` → `assertManageable` | ✅ | ✅ | ✅ | ✗ | ✗ |
| **发布新版本** | `POST /:slug/versions` → `canManageAsset` + scope `asset:publish` | ✅ | ✅ | ✅ | ✗ | ✗ |
| 提交审核 | `POST .../submit` → owner ∨ 管理档 + scope `review:submit` | ✅ | ✅ | ✅ | ✗ | ✗ |
| **撤回分发（yank）** | `POST .../yank` → **`role ≥ ADMIN`**（`canYank`）+ 原因必填 + scope `asset:manage` | **✗** | ✅ | ✅ | ✗ | ✗ |
| **删除版本** | `DELETE .../versions/:v` → **状态门分治**（上传者/owner 仅 `DRAFT`/`SCAN_FAILED`；管理档 +`REJECTED`/`UPLOADED`）+ scope `asset:manage` | ✅（**2 态**） | ✅（**4 态**） | ✅（4 态） | ✗ | ✗ |
| 标签+-（RECOMMENDED） | `PUT/DELETE .../labels/:slug` → `canManageAsset` + scope `asset:manage` | ✅ | ✅ | ✅ | ✗ | ✗ |
| 标签+-（**PRIVILEGED**） | 同上（短路） | ✗ | ✗ | ✅ | ✗ | ✗ |
| 审核（通过/拒绝/撤回） | `/api/reviews/*`（**M4b-5 待做**） | ✗ | ✅ | ✅ | ✗ | ✗ |

**显隐口径（两层 · 需分开处理）**：
- **卡层**：`AssetAdminCard` / `LabelCard` 若**整卡无任何可见动作** ⇒ **整卡不渲染**（避免空卡；访客与「登录非 owner」即此情形）；
  仅当**有可见动作、个别动作被禁**时才用「禁用 + `title` 说明」形态（对齐主 design §9「403 → 就地提示」）
- **动作层**：无权限 ⇒ **不渲染**（默认）或 **禁用 + `title` 说明** —— 原型两形态均已做出，**实现期取一**（登记：待拍板）
- `admin.noPermission` 文案**仅用于**「实现期选了禁用形态且整卡进入降级」时的说明句

**占位（登记不实现）**：
- 「**发布新版本**」按钮**仅占位**（真入口归 **M4b-8** 发布批；本批不接发布流）
- 「**审核**」动作**仅占位**（归 **M4b-5**；用户标注「还在讨论」）
- 「**收藏**」按钮 = **本批交付**（v1.8 §5.1 ⑧：`StarButton` 共用件 + `starCount`/`starredByMe` 读面）⇒
  ~~star 批未落地时不渲染~~ **降级口径作废**；未登录点击 ⇒ toast + 跳登录（§5.1 ⑧）

**并发/一致性**：管理区动作成功后 ⇒ **局部重取**（`invalidateCache` + 详情重取；列表页 `retryTick++`），不整页刷新（§4.4）；抽屉内跳详情走 `Link`（路由切换，天然重取）。
### 4.7 资产排序（**T11-f** · 2026-09-20 立项 · 验收期第三笔）

> 用户 2026-09-20：「资产排序的设计 —— 收藏/下载/作者/名称 支持排序」·「列表视图表头可点排序，我的倾向是做」。
> **归属** = M4b-4 验收期第三笔（沿 T11-d/T11-e 范式）；与前三笔的**唯一差异**：本笔**含服务端契约变更** ⇒ 契约行（主 design §7.1/§7.2）与规范同步必须先于代码。

> **形态变更（2026-09-20）**：工具条排序控件 **静态文本 → chips ×5（v1.25）→ 官方 `Select`（v1.27）** ——
> 用户线框四案对比（A 现状 chips / B 官方 `Select` / C 官方 `DropdownMenu` / D chips 独占一行）后拍板 **「方案 B」**：
> 判据 = 列表视图列头已承担四轴排序 ⇒ chips 常驻宽度（274px）不划算，而网格视图无列头 ⇒ 工具条入口必须保留、只需最省形态。
>
> **列集合变更（2026-09-20 · v1.28）**：列表加第 **6** 列「**更新**」（`updatedAt`）—— 用户「资产列加一个『更新』对应更新时间，和我们的『排序-最新』相对应」；列头可点集随之 **4 → 5 列**（「更新」⟷ `newest` 档）。

#### 4.7.1 定值口径（对齐兄弟仓 skillhub + 本仓既有纪律）

| # | 项 | 定值 | 依据（实测坐标） |
|---|----|------|------|
| 1 | 参数名 | **`sort`** | skillhub 搜索面同款（ClawHub 兼容名 · `ClawHubCompatAppService.java:195` `sort != null ? sort : "newest"`）|
| 2 | 档位 | `newest`（默认）/ `downloads` / `stars` / `name` / `author` | 用户指定 4 轴 + 现状默认；**不做 `relevance`**（本仓搜索为 ILIKE，无 ranking）|
| 3 | 默认 | 不传参 ⇒ `newest` = 现状 `updated_at desc, id desc`（**行为零变化**）| 同 skillhub「默认值写死」|
| 4 | 非法值 | **静默回落 `newest`** | skillhub 搜索面口径（其 promotion 面用严格 400；搜索面取静默）|
| 5 | tiebreaker | `<field> DESC, updated_at DESC, id DESC` | 本仓 13 处既有排序**全部带 `id` 破平**（`assets/service.ts:167/248` 等）|
| 6 | 字段口径 | 下载 = `asset.download_count` · 收藏 = `asset.star_count` · 名称 = `COALESCE(parsed_metadata_json->>'name', slug)` · 作者 = `user.display_name`（空则 `username`）| 实测 schema（冗余列现成）+ 读面投影（latest 版本元数据在 `asset_version.parsed_metadata_json`）|
| 7 | 中文名称 collation | **保持 DB 默认（code point 序）**，不加 `COLLATE` | 加 COLLATE 需表达式索引/迁移；本笔**零迁移** ⇒ 口径写明、**不作断言** |
| 8 | 索引 | **零迁移**；`download_count` / `star_count` **无索引** ⇒ 登记「数据量上来再加」 | 实测 `asset` 表仅 `idx_asset_status` / `idx_asset_namespace_status`；现规模（百级）无影响 |
| 9 | 状态位置 | URL **`?sort=`**（沿用 `useMarketQuery` 同族）· 默认档**删参数**（干净 URL）· **改排序回第 1 页**（`dropPage`）| skillhub 同款；官方 TanStack 指南明写 **manual 模式不自动重置页码** ⇒ 必须自己重置 |
| 10 | 生效范围 | 门户三页（`/skills` `/mcps` `/agents`）+ **服务端两面通吃**（`GET /api/me/assets` 同参数）| `listViewableAssets` 为门户/我的资产共用单点 |

#### 4.7.2 UI 规格

| 位置 | 形态 | 定值 |
|------|------|------|
| 工具条（结果计数行） | **排序 `Select`**（`Label`「排序」+ 收起态显示当前档），取代原静态文本「排序：最近更新」与 v1.25 的 chips ×5 | 官方 `Select`（`ui/shadcn/select.tsx`）· `SelectTrigger#market-sort` + **`size="sm"`（= 32px，与搜索钮/视图钮同高）** + `w-[160px]`（**实测 160×32** —— 沿控制台 `#assets-status-filter` 的 `Label`+`SelectTrigger#id` 先例）；位置 = 计数行内、**搜索钮左侧**（`ml-auto` 贴右）；**不新增行**（两视图**共用同一 `sort` 状态**）。**v1.27 形态变更**：常驻宽度 **274px → 160px**，换档点击成本 **1 → 2 次**（用户 2026-09-20 线框四案对比后拍板「方案 B」）；**宽度 104 → 160 的根因 = F87**（EN 最长选项 `Most downloads` 文本宽 **106px** > 104px 触发器的可用 54px ⇒ 截断）|
| 列表视图列头 | **可点排序**（**五列**：名称 / 作者 / 下载 / 收藏 / **更新 ⟷ `newest` 档**；**描述列不可点**）| 官方配方：`TableHead` 内官方 `Button variant="ghost" size="sm"` + lucide `ArrowUpDown`（未排）/ `ArrowDown`（降）/ `ArrowUp`（升）+ `th` 的 `aria-sort="none｜ascending｜descending"`；**两态**（首次进该列 ⇒ `desc`，再点 ⇒ `asc`；回默认 = 用工具条 `Select` 选「最新」）。**v1.28 追加「更新」列**（用户 2026-09-20：「资产列加一个『更新』对应更新时间，和我们的『排序-最新』相对应」）：末位（沿控制台 9 列「… 收藏 · **更新** · 操作」序）· 值 = `formatDate(updatedAt)`（`YYYY-MM-DD`，与控制台「更新」列同件）· 列宽 **12%** · **与「最新」档同档**（点它写 `?sort=newest`，**不是** `?sort=updated` —— 见 F89）· 列表列集合 ⇒ **六列**（名称/描述/作者/下载/收藏/更新）|

**交互与边界**

1. 改排序（`Select` 或列头）⇒ 写 `?sort=` + **回第 1 页** + 列表重取（缓存键含 `sort`）
2. 与 `q` / 标签**正交**：三者可叠加；任一变更均回第 1 页（沿既有口径）
3. **匿名可用**（读面公开）· 双视图共用同一排序状态（切视图不丢排序）
4. 空结果 / 单页：`Select` 照常可切换（可切回「最新」）；列头在无数据行时仍可点（不报错）
5. 竞态：快速连点 ⇒ 走既有 abort + 缓存键（`sort` 参与键）
6. **非目标**：多列排序 · 排序**记忆**（刷新回默认 `newest`）· **控制台「我的资产」UI 排序**（`console/DataTable` 走 v9 **legacy** 面，加性接法已实证可行（见 §4.7.4），但会牵动 3 张控制台表的回归面 ⇒ 登记后续）· `relevance` 档 · 排序索引/COLLATE 迁移

#### 4.7.3 断言口径（实现期 f4 · dogfood 新增 **G22**）

- 默认无参 ⇒ 请求 URL **不含 `sort`**、列表按 `updated_at desc`（= 现状）
- 五档逐档：请求 URL 含 `?sort=<档>` + **首条真值对接口**（下载/收藏取 `downloadCount`/`starCount` 最大值；名称按 slug 升序首条；作者按 display_name）
- 改排序 ⇒ URL 含 `?sort=` **且不含 `page`**（回第 1 页）
- 非法值（`?sort=bogus`）⇒ 静默回落默认顺序（不报错、不空白）
- 列头：点名称列 ⇒ `aria-sort="descending"`（首点）→ 再点 `ascending`；URL 同步 `?sort=name&dir=…`
- **「更新」列（v1.28）**：默认档即「最新」⇒ 该列**恒 active**，点它是**同列反向**（`desc → asc → desc`）；URL **不出现 `?sort=updated`**（列名 ≠ 档位 · 白名单外）· `Select` 仍显示「最新」· 序与接口 `sort=newest&dir=<同向>` 逐项一致
- 双视图：列表视图切排序后切回网格 ⇒ 排序保持（同一状态）
- 匿名：排序 `Select` 可用、列头可点
- **`me` 面零影响反证**：`GET /api/me/assets` 带 `ownerId` 且**不传 `sort`** ⇒ 排序仍为 `updated_at desc`（本批既有断言 G4–G6 不受影响）
- **深链边界**：`?page=2&sort=name` 直入 ⇒ 服务端按新排序返回第 2 页（合法）；若该页为空 ⇒ 沿用既有空态（**不做**自动回第 1 页 —— 深链非「过滤变更」路径）

#### 4.7.4 基础面实证（立项前已完成，作为设计依据）

| 命题 | 实证方式 | 结果 |
|------|---------|------|
| 我们是 v9 | `package.json` 实测 | `@tanstack/react-table@9.2.4` |
| v9 有 manual 选项 | 递归 grep d.ts | `rowSortingFeature.types.d.ts:189 manualSorting?` · `rowPaginationFeature.types.d.ts:24 manualPagination?` |
| legacy 面支持排序（类型层） | 类型探针 + `typecheck` | **exit 0**（`getSortedRowModel` + `manualSorting` + 受控 `state.sorting`/`onSortingChange` 全可用）|
| legacy 面 manual 语义（运行期） | `renderToStaticMarkup` A/B 探针 | A 客户端排序 ⇒ `rows=[a,b,c]`（重排）· B `manualSorting:true` ⇒ `rows=[b,a,c]`（**不重排**）+ `getIsSorted=asc` ⇒ 服务端排序语义正确 |
| 官方 UI 配方 | 官方 data-table 文档 Sorting 节 | `Button variant="ghost"` + `ArrowUpDown` + `toggleSorting(getIsSorted() === "asc")`（两态）|
| 官方注册表无排序成品件 | 官方 64 件清单 + 仓内 `ui/shadcn/` | 只有 `table.tsx`；`DataTableColumnHeader` 为**示例代码**（需照抄）|
| 仓内零先例 | grep | `aria-sort` / `ArrowUpDown` / `toggleSorting` 命中 **0** |
#### 4.7.5 实现落点（**文件级 · 签名级 · 定死到可照抄**）

**服务端（f1）**

| 落点 | 改动 |
|------|------|
| `assets/service.ts` | `ListAssetsOptions` 增 `sort?: AssetSort`（枚举联合）+ `dir?: AssetSortDir`（`'asc' ｜ 'desc'`）· `listViewableAssets` 按**白名单映射** `orderBy`（下表）· **非法/缺省 ⇒ `newest` 分支 + 档位固有方向**（静默回落）· 单点导出 `ASSET_SORT_VALUES` / `ASSET_SORT_DIRS` / `isAssetSort()` / `isAssetSortDir()` / `assetSortQueryFields`（**v1.24 订正**：`dir` 亦由服务端消费 —— 见 F82）|
| `http/assets.ts` · `http/me.ts` | 两处 query schema **各 spread `...assetSortQueryFields`**（单点复用，防两处漂移）⇒ `sort: z.enum(ASSET_SORT_VALUES).catch('newest')` · `dir: z.enum(ASSET_SORT_DIRS).optional().catch(undefined)` —— **v1.24 订正**：原写 `.default('newest')` **在非法值上会 400**，与 §4.7.1 #4「静默回落」矛盾 ⇒ 一律 `.catch()`（缺省与非法走**同一条回落路径**，见 F83）|
| `assets/service.test.ts` · `http/assets.test.ts` · `http/me.test.ts` | 新用例：五档顺序真值 · `dir` 反向序 · 非法值/非法方向回落 · tiebreaker 稳定（同 `updated_at` 按 `id`）· 路由层白名单放行 + 回落 · `me` 面不传 ⇒ 现状序（**f1 已落**，见 §4.7.6 F82/F83）|

**ORDER BY 白名单映射（`sort` → 表达式 · 全部带 tiebreaker）**

| `sort` | ORDER BY | 方向直觉 |
|--------|----------|---------|
| `newest`（默认） | `asset.updated_at DESC, asset.id DESC`（**= 现状，零变化**）| 最近更新在前 |
| `downloads` | `asset.download_count DESC, asset.updated_at DESC, asset.id DESC` | 下载多在前 |
| `stars` | `asset.star_count DESC, asset.updated_at DESC, asset.id DESC` | 收藏多在前 |
| `name` | `COALESCE(asset_version.parsed_metadata_json ->> 'name', asset.slug) ASC, asset.id DESC`（取 **latest 版本**元数据；空名回退 `slug`）| A→Z（升序）|
| `author` | `user.display_name ASC NULLS LAST, user.username ASC, asset.id DESC`（join `user`；空名回退用户名）| A→Z（升序）|

> **方向模型（定死）**：档位（`Select` 选项）用**上表固有方向**（不暴露 asc/desc）；`?dir=asc｜desc` **仅由列头可点写入**；**换档（`Select`）⇒ 清 `dir`**（避免「名称 + desc」这类跨控件残留）。`name`/`author` 的 `dir=desc` 为反向序；`newest`/`downloads`/`stars` 的 `dir=asc` 为反向序。

**前端（f2）**

| 落点 | 改动（**签名级**） |
|------|-------------------|
| `hooks/useMarketQuery.ts` | `opts` 增 `sort?: { defaultValue: string }`（**照 `status` 先例**：不给 ⇒ 不读不写 `sort`/`dir`）· 返回增 `sort: string`、`setSort(next)`、`dir?: 'asc' ｜ 'desc'`、`setDir(next?)` · `setSort` 内部 **`dropPage`**（改排序回第 1 页）+ **清 `dir`** · 默认档 ⇒ **删 `sort` 参数** |
| `api/assets.ts` | `fetchAssetList` 拼装 `sort` / `dir`（**透传，不在前端做默认判定**）|
| `components/market/CenterPage.tsx` | `useMarketQuery({ sort: { defaultValue: 'newest' } })` · 计数行内 **搜索钮左侧**插官方 `Select`（`Label htmlFor="market-sort"` + `SelectTrigger#market-sort size="sm" w-[160px]` + 5 × `SelectItem value=<档>` · v1.27）· **删**静态文本 `sortRecent` · 向 `AssetList` 传 `sortKey={sort}` / `dir={dir}` / `onSortChange={onHeaderSort}`（`handleHeaderSort(column, nextDir)` 内先 **`COLUMN_SORT[column]` 译档** ⇒ 同档走 `setDir` / 异档走 `setSort` —— v1.28 · F89）|
| `components/market/AssetList.tsx` | `AssetList` **props 显式透传**（**不用 context** —— 决策定死）：`{ sortKey, dir, onSortChange, children }` · 列头**五列**（名称/作者/下载/收藏/**更新**）`TableHead` 内官方 `Button variant="ghost" size="sm"` + 图标（未排 `ArrowUpDown` / 降 `ArrowDown` / 升 `ArrowUp`）+ `th` 的 `aria-sort`（`none ｜ ascending ｜ descending`）· **点同列 = 切 `dir`（`asc ↔ desc`）；点异列 = `desc`（首点降序 —— 官方配方 `toggleSorting(false)` 同口径）** —— **v1.25 订正**：原写「点异列 = 该列固有方向」与 §4.7.2/§4.7.3「首点 ⇒ `descending`」矛盾（见 F84）。**方向判定落在本件**（持 `DEFAULT_DIR` 与有效方向 = 单一事实源），调用方只落 URL。**v1.28**：本件导出 **`COLUMN_SORT`（列 → 档映射 · 单一事实源）**，`CenterPage.handleHeaderSort` 先译档再落 URL —— 否则「更新」列会产出 `?sort=updated`（白名单外 ⇒ 服务端静默回落，但 `dir` 仍生效 ⇒ **序与档位脱钩**，见 **F89**）· 列集合 **六列**（+「更新」= `formatDate(updatedAt)` · 列宽 24/26/16/11/11/12）· 载态骨架 `colSpan` **6** |
| `i18n/zh.ts` · `en.ts` | §6.6 的 **+5 键 / 退役 1 键** |

**登记落点（非目标项的去处，写死）**：控制台「我的资产」UI 排序 · 排序索引 · 名称 `COLLATE` ⇒ 均见 **§4.7.2 非目标** + `docs/00` §5 M4b-4 行注记；后续触碰时（M4b-6 资产管理面最可能）评估，不另立本笔。

#### 4.7.6 纠错留痕（**F80 / F81** · 立项过程中的两处判断错误，如实入档）

| # | 错误判断 | 根因 | 修正 |
|---|---------|------|------|
| **F80** | 「v9 **没有** `manualSorting`/`manualPagination`」 | **方法错**：`grep dist/*.d.ts` **非递归**，只扫顶层；两选项在 `dist/features/**` | 递归 grep 实测两处定义 ⇒ 撤回原判断 |
| **F81** | 「控制台要接排序，得把 legacy 升到 v9 原生 feature 面、改动面不小」 | **未做探针就下结论** | 类型探针（typecheck 0）+ 运行期 A/B 探针 ⇒ legacy 面**加性**可用，撤回「需切面」说法 |

| **F82** | 契约行（主 design §7.1 / §7.2 R6）只登记 `sort`，**漏 `dir`** | 立项期只按「档位」建模，把列头升/降当成纯 UI 局部状态 | 实现期发现：`dir` 若不落服务端，列头升序**只作用于当前页** ⇒ 契约行补 `&dir=`（主 design v1.57）+ §4.7.5 补字段 |
| **F83** | §4.7.5 写 `sort: z.enum(...).default('newest')` | 未对「非法值」做**同一条路径**推演（`.default` 只兜缺省，非法值仍 400）| 与 §4.7.1 #4「静默回落」自相矛盾 ⇒ 改 `.catch('newest')`；`dir` 同法 `.catch(undefined)` |
| **F84** | §4.7.5 写「点异列 = 该列**固有方向**」 | 与 §4.7.2「两态（首次进该列 ⇒ `desc`）」+ §4.7.3 断言「点名称列 ⇒ 首点 `descending`」**同文档互相矛盾**（未做「点名称列」这条断言的路径推演）| 实现取**首点 `desc`**（官方配方 + 两条上游口径一致）⇒ 订正 §4.7.5；`DEFAULT_DIR` 仅用于 chips 驱动时图标/`aria-sort` 真值与同列切换基准 |
| **F85** | `m4a-dogfood` 的「中心排序栏」断言硬依赖**被取代的静态文本**（`排序：最近更新`）| 跨批交付物改动未同步下游断言（F69 同类：改的是 UI 形态，断言读的是形态文本）| 改写为 **2 条**（旧文本退役反证 + 五档 chips 齐/默认选中）⇒ `m4a-dogfood` **37 → 38**；实现期实测即暴露（非事后补）。**连带**：该脚本产出的 M4a 证据图 5 张随形态变更**重生成**（二进制差异归用户人眼）|
| **F90** | `stashSession` 存下的是**空 cookie 数组**（会话复用**静默失效**）| `send()` 回的是**整条 CDP 消息**（`{ id, result }`），我按 `res.cookies` 取值 ⇒ 恒 `undefined` ⇒ `?? []` 把空值**静默吞掉**；症状 = 复用「永不命中」而脚本**全绿**（91/0），只有对数才看得出 | 加临时诊断打出 `getAllCookies` 原始返回 ⇒ cookie 在 `result.cookies` ⇒ 改 `all?.result?.cookies ?? all?.cookies ?? []`；并加「存档为空 ⇒ 打印提示」（同类静默失效不再无声）；**实测转绿**：真登录 9 → 4，复用 `extra` 标注「还原 cookie · `me.user.id` 一致」|
| **F94** | 验证探针把 CSS **过渡中间态**当成终值读 ⇒ 误判「实底没生效」（本笔自伤） | 官方 `Button` 带 `transition-all`；探针在**后台 / hidden tab** 里读 `getComputedStyle().backgroundColor` 时过渡**不推进** ⇒ 读到起点值 `oklab(0 0 0 / 0)`（透明）。**反证链**：① 同 class 的**克隆元素**读数是**主色**（克隆首次渲染不触发过渡）② 显式 `transition:none` 后读 = `oklch(0.488 0.243 264.376)`（主色）③ 等待 3s 后原位读也变主色 ⇒ **代码无 bug，是探针口径错** | ✅ **探针固定写法**：读计算样式前 `transition:none` → 读 → 复原（已写进 `m4a-dogfood` T11-h 注释）；**纪律沉淀**：凡断言「类切换后的计算样式」，必须先排除过渡中间态（关过渡或等稳态），否则会得到**假红/假绿** |
| **F95** | 验证探针用**页内 `element.focus()`** 模拟聚焦 ⇒ 假红（本笔自伤） | **后台 tab** 里 `element.focus()` 会设上 `document.activeElement`、**却不派发 `focus` 事件** ⇒ React `onFocus` 不触发 ⇒ 按钮仍 `ghost`。**实证**：探针同一份输出里 `activeElement === input` 为真而 `data-variant` 仍 `ghost`；同一操作换成 **CDP 真指针**（`clickReal`）⇒ `default` 实底立刻成立 | ✅ **纪律沉淀**：凡判定「聚焦 / hover / 按下」等**键鼠派生状态**，必须用**真指针**（`Input.dispatchMouseEvent`）而非页内合成事件或 `el.focus()`；与 **F94**（过渡不推进）同属「后台 tab 副作用」家族，但**成因不同**（本条是事件不派发，不是样式不推进）|
| **F96** | 修订记录表**行粘连** —— 主 design §15 的 **v1.56 整行丢失**（内容被并进 v1.57 行 ⇒ 该行 `|` 数 **5 → 6**（4 列 → 5 列）、版本序出现空洞 `v1.57 → v1.55`）| 落笔 T11-f 契约登记时 **patch 锚点取自长行/截断输出** ⇒ 行首单元格 `| **v1.56** | 2026-09-20 | sunxuewen-rush |` 被吃掉，残余内容挂到上行尾。**同族先例** = `self-review-scoring`「patch/编辑锚点安全」条（禁用截断输出做锚点；长行改动走「读文件→字符串处理→写回」）| ✅ **本轮修复**：按 ` \| **T11-f 资产排序契约登记` 拆回两行（v1.57 / v1.56 · 内容逐字保留 · 修后两行 `\|` 数各为 5，脚本 assert 断言）；**审计缺口登记**：`doc-audit` 现有检查**不覆盖修订表结构完整性**（本次系人工撞见，门禁未抓到）⇒ 候选新增检查 = 「行首单元格形态 + 每行 `\|` 数与表头一致 + 版本序无空洞」· **修复副作用（同日自查抓到并已补）**：首版拆分脚本用 `partition` ⇒ **切分标记自身文字（`**T11-f 资产排序契约登记`）被吃掉**、v1.56 行缺 2 词 —— 已补回，并以「与 HEAD 合并行**逐字比对**」复核（v1.57 / v1.56 两段 strip 后内容与长度全等）；**纪律沉淀**：修复类改动**不能只比结构（竖线数），必须与原文逐字比对** |
| **F97** | 修订记录表**版本序错位**（**F96 同族** · 同表同因）—— `M4a §12`：本笔新增的 **v0.31 / v0.32 / v0.33 三行落点漂到 `v0.30` 行下方** ⇒ 尾部块非严格降序（`v0.30 → v0.33 → v0.32 → v0.31`）| 与 **F96** 同根：**插入锚点选「相邻行」而非「尾部块首」** ⇒ 每次新增落点漂一格；`doc-audit` 同样**不检查修订表版本序**（与 F96 同一缺口）| ✅ **本轮修复**：`v0.30` 行移至 `v0.31` 之后 ⇒ **`v0.33 → v0.32 → v0.31 → v0.30 → v0.29 → v0.28 → v0.27` 严格降序**（与 HEAD 尾块同向）；脚本按行前缀定位 + assert 唯一 + 回读打印全序；**行数零丢失**（939 → 939）。**F96+F97 合并登记一条候选检查** = 「修订表：行首单元格形态 + 每行 `｜` 数与表头一致 + **尾部块版本序严格降序**」|
| **F98** | **后台 tab 里 SPA 路由切换的 DOM 不提交**（本笔实测）| dev 环境用 CDP 在**隐藏 tab** 里点面板条目 ⇒ `location` 已变 `/skills`，但 `sidebar-inset` 内容仍是**上一页**（home）⇒ 一度误判「导航没生效」；`Page.bringToFront` 激活后同一页面立刻正确渲染。与 **F94**（过渡不推进）· **F95**（focus 不派发）**同族**：后台 tab 的渲染/动画/事件都可能停摆 | ✅ **探针纪律**：凡断言「**导航后的页面内容**」须先 `Page.bringToFront` 激活 tab（`m4a-dogfood` T11-i 段已加）；**只断言 URL** 时不受影响。**反证**：同一操作在激活后 100% 正确；且 `data-state` 类**逻辑态**属性不受影响（Esc 后 `state=closed` 在两种情形下都成立）|
| **F99** | **壳层新增件与页面级选择器撞车** ⇒ 断言**测错对象**（5 条失败 · 本笔自伤）| T11-i 给顶栏加了公共搜索件（`aria-label="搜索"` = 与门户折叠搜索触发钮**同名**、`[data-slot="input-group"]`、`input[aria-label]`），而**顶栏本身就在 `[data-slot="sidebar-inset"]` 内** ⇒ 本批 dogfood 里「`CONTENT` 作用域内第一个可见 `input-group` / `input[aria-label]` / `aria-label=搜索` 的按钮」全部命中**顶栏**（G13 写 URL 失败 + G21 四条形态断言失败）| ✅ **修复**：新增 **`PAGE` 作用域** = `[data-slot="sidebar-inset"] > div`（**排除顶栏**；实测该 div 唯一且不含顶栏件），把 6 处页面级控件探针（G13 点击、G21 的 TRIG/VIEWBTN/`g`×2/`visibleInputs`）改为 `PAGE` 级 ⇒ 本批 dogfood **91/0 全绿**；**纪律沉淀**：**壳层件投影到页面作用域时，页面级探针必须按「排除壳层」的作用域限定**（同族先例：`STAR_BTN` 早已因顶栏语言钮带 `aria-pressed` 而用 title 前缀精筛）|
| **F101** | Base UI `Combobox` 选中后把**条目 value 写回输入框** ⇒ 兜底行哨兵值（`\u0000search-all`）**直接显示在框里**（本笔首跑 FAIL） | 输入框文案由 Base UI **自主管理**：受控 `inputValue` 会与它**互写**（我方清空被其回写覆盖）。**实证**：`value === "\u0000search-all"` 而断言期望空串 | ✅ **修复**：改为**不控 `inputValue`** + 选中后 `key` **重挂载**（`epoch`）换回干净状态 ⇒ 复跑 `value === ''` ✓。**纪律**：第三方件「自管 + 可受控」的字段，先确认**写回方向**再决定是否受控 |
| **F102** | **壳层新件抢 dogfood 裸选择器** ⇒ T11-h 三条断言**假红**（**F99 同族 · 第三例**） | `SidebarSearch` 的 `[data-slot=input-group]` 在 DOM 中**先于内容区** ⇒ T11-h 的 `document.querySelector('[data-slot="input-group"] input')` 改打**侧栏那支**（焦点与输入都进侧栏 ⇒ hero 按钮仍 `ghost`） | ✅ **修复**：引入 **`PAGE` 作用域** = `[data-slot=sidebar-inset] > div`（沿用 **F99 已立口径**），HERO_BTN / TYPE_HERO / CLICK_HERO / HERO_INPUT 四处切换 ⇒ 57/0。**纪律**：壳层每加一个输入类件，回扫页面级探针的裸选择器 |
| **F103** | Tailwind **4.3.3 不生成** `w-(--anchor-width)` **变量简写** ⇒ 面板宽度塌到**内容宽**（实测 **154px**，非 236px） | 官方 nova 档源码用简写；本仓工具链下该候选不生成 ⇒ 只剩 `min-w-[calc(...)]` 生效（与既有坑「**变体 + `w-(--var)` 简写不生成**」同族） | ✅ **修复**：`width="anchor"` 变体改用**任意值类** `w-[var(--anchor-width)]`（与 **Base UI 官方示例**同写法）⇒ 实证 **236 = 236**。**纪律**：官方件里的 `*-(--var)` 简写，接入前逐个验「生成与否」|
| **F104** | CDP **视口设在导航之后** ⇒ React 按**移动端**挂载 ⇒ 侧栏走 `Sheet` 分支**完全不渲染**（本笔一度误判「新件没生效」） | `useIsMobile()` 在 mount 读 `matchMedia`：先以默认窗宽（748px）加载、后设 1440 ⇒ 状态不更新（且无 resize 事件） | ✅ **纪律**：探针**先 `Emulation.setDeviceMetricsOverride` 再导航**（或改视口后**重载**）；与 **F94/F95/F98** 同族（后台 tab / 时序类假红）|
| **F101/F102（同日撤回）** | 随 **B″ 回退**撤回（对象已退役）| 两行的对象 = v0.35「常驻输入框 + 紧邻下拉」一体形态（`ui/SidebarSearch.tsx` / 官方 `Combobox`）—— 用户复审后拍板回到官方对话框 ⇒ 该形态与其依赖整体退役。**保留记录以便追溯，不再作为现行纪律**；**F103/F104 保留**（Tailwind 简写不生成 / 视口须先设 —— 工具链与探针事实，与实现无关）。**另**：F102 当时的 `PAGE` 作用域修复**保留在 m4a-dogfood**（防御性 · 57/0 复跑仍通过）|
| **F100** | **修订表版本序（F96/F97 同族 · 第三例）** —— ① **M4a §12**：F97 修后的「**尾块降序**」与其**升序表头**（`v0.1` 起）自相矛盾 ⇒ 本笔**改为全表升序**（尾块 8 行反转为 `v0.27 → v0.34`），并顺手修正表内 **`v0.10` / `v0.9` 位置颠倒**（点号版本号的**字典序陷阱**：字面比较会把 `v0.9` 判成大于 `v0.10`，须按**数值**比较）② **批 design §12 · 批 plan §9**：本笔新增行的**插入锚点低了一行**（`v1.35` 落到 `v1.31` 之下 · `v0.34` 落到 `v0.30` 之下）⇒ **一行移位**归位 ③ 复核：四张表**内部自洽**（M4a **升序** ≤ `v0.34` · 主 design / 批 design / 批 plan **降序** · 违规 **0 处**）| ✅ **脚本复核**（键 = `(主,次)` **数值**比较，禁字面）· **纪律沉淀**：① 修订表插入一律锚「**最新行之上**」（不是「相邻行之下」）② 版本比较**必须按数值** —— 否则 `v0.9 > v0.10` 式假序会长期潜伏 ③ **F97 的「尾块降序」口径由本笔改为「全表升序」**（M4a 表头本即升序 ⇒ 全表同向更自洽）|

| **F100-b** | **docs/00 §8 修订表方向混用**（**未修 · 待用户拍板**）| 82 行 · **39 处违规** —— 多轮不同插入风格累积 ⇒ 方向段交替（`v1.82→v1.78` 降 · `v1.1→v1.34` 升 · `v1.30→v1.61` 升 · `v1.61→v1.47` 降 …）| ⬜ **建议**：统一为「**降序 · 最新在上**」（与主 design / 批 design / 批 plan 一致）⇒ 需重排 **82 行**，属**独立文档整理笔 · 不与本笔混**；本笔只做**本笔新增行的局部归位**（`v1.79` 移到 `v1.78` 之下）。**注**：拟议中的 `doc-audit`「修订表完整性」检查需**按文档配置方向**，否则 docs/00 长期假红 |
| **F93** | 收口审计（converge）抓出 **5 处「活口径」陈旧**（批 plan 3 · `docs/00` 2 · 证据 1）| 前几轮落档**只写当轮新值、未回扫旧值**：批 plan §3 f4 / §7.5 T11-f 行仍写 `G22 ×13` / 合计 **90**；批 plan Status 行仍写「T11-f 实现中」「提交待用户口令」；`docs/00` §5 M4b-4 行仍写 **90 PASS** / **3 图** / v1.28；`docs/00` 头部停在 **v1.76** 而修订表已有 v1.77；证据 §10 出口件 ④ 行仍写现行 **90** | ✅ 全部订正（**修订记录行按纪律保留为历史留痕，不动**）；**口径新增检查项 = 「活口径 vs 历史留痕」**（改数字时区分「当值处」与「修订行」）；`doc-audit` 复跑 **64 PASS / 0 FAIL**（版本头 ↔ 修订表一致）|
| **F92** | 门禁 `test` 行的「PASS」可能是 **turbo 缓存回放**（`FULL TURBO` / `cache hit, replaying logs`），不是本次真跑 | 我报「门禁全绿」时**未区分真跑与回放**：输入未变的任务被 turbo 直接回放**历史日志**（今日实证：`CI=true bun run test` real **0.107s** · `Cached: 4/4` · `Time: 23ms >>> FULL TURBO`）⇒ 「562 pass」是**上一轮真实运行的日志**，不是本次 | **登记 + 补真跑**：`CI=true bun run test --force` real **32.6s** ⇒ **562 pass / 1 skip / 0 fail** rc=0（真跑）；**纪律** = 报门禁数字必须标注「真跑 / 回放」，收口判定一律 `--force` 或核对 `FULL TURBO` 标记 |
| **F91** | `docs/smoke/scripts/**` **不在** `bun run lint` 的 turbo 图内 | `lint` 按包定义（`packages/*`），`docs/` 无对应任务 ⇒ 改脚本只受 `format:check`（270 文件）与显式 `biome check` 约束（**改动面常被误以为已被 lint 覆盖**）| **登记 + 本轮显式核**：单文件 `biome check` 基线 11 warning ⇒ 12，**新增 1 条同类**（`SMOKE_ONLY` 未登记 turbo env —— 与本脚本既有 4 条 `SMOKE_*` 同族；脚本非 turbo 任务，登进 `turbo.json` 反而误导）；**未新增告警类** |
| **F89** | `handleHeaderSort` 把**列名当档位**传给 `setSort`（`?sort=updated`） | 列 → 档映射（`COLUMN_SORT`）只存在于 `AssetList`，调用方拿不到 ⇒ 一律直写列名；此前四列的列名**恰好等于**档名 ⇒ 缺陷不可见 | **加「更新」列时暴露**（列名 `updated` ≠ 档名 `newest`）⇒ 导出 `COLUMN_SORT` 作为单一事实源，调用方先译档；G22-6c 钉死（URL 不含 `sort=updated` + Select 仍「最新」+ 序 = 接口 `newest/<同向>`）|
| **F88** | 证据 §14.7 权威行数表**先写估值**（未跑 `wc -l`）| **F76 同类第 4 次复发**（纪律已立档仍犯）：行数类数字写成「顺手估」 | ✅ 实测回填（CenterPage 451→**438** · zh 391→**390** · en 386→**385** · dogfood 1303→**1307** · m4a 553→**552**）；**纪律加固**：五件全部纳入 `m4b4-measure.ts` 清单，提交前必跑 |
| **F87** | `Select` 触发器定宽 **104px** | 只按**中文选项**（≤3 字 ⇒ 42px）估宽，**未按 EN 最长选项**实测 | 实测 EN `Most downloads` 文本 **106px** > 触发器可用 54px ⇒ **截断**（`scrollWidth 106 > clientWidth 54`）⇒ 改 **160px**（沿控制台 `#assets-status-filter` 同宽先例 · 两语均不截断，实测 `clipped:false`）|
| **F86** | 覆盖探针口径：`bun test --coverage`（不带路径）把 **`dist/**` 陈旧编译产物**当测试跑 ⇒ 状态型用例（限流 / device code）**重复执行** ⇒ **7 例假失败** | 覆盖命令未限定 `src/`；`dist` 是本仓旧构建产物（非最新）| **反证**：`--coverage src/` = 562 pass / 0 fail + 单文件 11/11 ⇒ 与本笔无关；**登记**（与 **F66** web 零测试基建同族）⇒ 建议 coverage 前清 `dist` 或加 ignore |

> **纪律沉淀**：涉及**库能力**的判断，必须①递归扫 d.ts ②能写类型探针就写 ③能跑运行期 A/B 就跑 —— 三条都没做之前，不得在对外结论里出现「没有/不支持」。

---

### 4.8 首页搜索形态对齐（**T11-h** · 2026-09-20 立项）

**范围（用户 2026-09-20 明确）**：**只改首页**（`market/Hero.tsx`）· 拍板两条：「**只做形态对齐**」（位置与交互不变）·「空态**没反应**」（参考站是「拿默认推荐词直接搜」，我们**不造推荐词数据**，改为点/回车一律无反应）。
**门户中心三页**（`CenterPage` 折叠搜索）**与**控制台筛选框 **不动** —— 已逐条核：`m4b4` dogfood **G21 ×6** 与 `m4a` 门户搜索断言**零影响**。

**规格（定值）**：落 **M4a design §8.10**（Hero 属 M4a 交付物 ⇒ 规格随件走，本节只记口径 —— 引用不复制）。

**v1.32 追加拍板（2026-09-20）**：「**鼠标一点击输入的地方、焦点在的时候**就变」⇒ 点亮判据由「有输入」扩为「**焦点在 或 有输入**」（`lit = focused || hasQuery` · `focused` 来自 input `onFocus`/`onBlur`）；**可提交性不变** —— 空输入照样无反应 ⇒「**点亮 ⟷ 可提交 解耦**」（点亮 = 「焦点在」的形态回执，不是「可按」的信号）；规格增量落 **M4a §8.11**。

**行为**：空输入点击 / 回车**无反应**（`if (!q) return`）；有输入提交 `/skills?q=`（原口径「空回车 ⇒ `/skills`」作废）。

**断言**：`m4a-dogfood` 新增 **T11-h ×8**（空态形态 / 空态点击无反应 / **真指针点入 ⇒ 聚焦** / **聚焦空态点亮且仍不可提交** / **真指针点标题 ⇒ 失焦** / **失焦复位** / 有输入实底 / 有输入提交）⇒ **46 PASS / 0 FAIL**（基线 38；v1.31 时点为 ×4 = 42）。

**边界**：输入法组合期即时点亮（未抑制，与参考同款）· `disabled` 语义取舍见 §8.10 ⑤ · 读样式须排除过渡中间态（**F94**）· 判定**聚焦类交互必须用真指针**（后台 tab 里 `element.focus()` 不派发 `focus` 事件 —— **F95**）。

### 4.9 全资产搜索 + 侧栏命令面板（**T11-i** · 2026-09-20 立项 · **v1.34 追加 B 部分**）

**范围（用户 2026-09-20 拍板）**：**A** = ① **A1** 顶栏加**常驻小搜索框**（不做 ⌘K 面板）② **B1** 首页搜索**抽为公共件**（两处共用一份行为）③ **C3** 门户三页折叠搜索**保留** + 「**Hero 对齐**」。**B（v1.34 追加）** = ④ 命令面板入口落**侧栏**（品牌块正下方 / 门户组之前）⑤ `⌘K` / `Ctrl+K` 快捷键（壳层一处监听）⑥ 面板 v1 = **页面跳转**（按角色过滤）+ **兜底行「在全部资产里搜「{q}」」**。
**语义边界（用户口径）**：「顶栏上是**所有资产**都搜索的快速通道，各个资产页的搜索**只搜各个资产类型的**」+「**sidebar 放命令面板搜索 / header 放小的搜索**」⇒ 三处**互不重复**（顶栏 = 搜资产 · 资产页 = 搜本类型 · 侧栏面板 = 跳页面 / 命令）。
**落地页**：新增 `/search` 结果页（**不入侧栏 IA** · **零后端改动** —— `GET /api/assets` 的 `type` 本就可选）。
**Hero 对齐**：首页大搜索提交目标由 `/skills?q=` **改 `/search?q=`**（**行为变更**）⇒ 同一关键词在首页与顶栏给同一结果集。

**规格（定值）**：落 **M4a design §8.12**（**A**：件契约 · 结果页 · 顶栏接入 · 线框）+ **§8.13**（**B**：侧栏入口 · 面板 · i18n 键 · 线框）—— 引用不复制。

**件**：**A 新建 3**（`components/search/AssetSearch.tsx` · `pages/Search.tsx` · `components/market/sortOptions.ts`（常量上提））· **A 改造 4**（`ui/TopBar.tsx` · `market/Hero.tsx` · `market/CenterPage.tsx`（改 import）· `main.tsx`（+1 路由））· **B′ 新建 2**（`ui/SidebarSearch.tsx` · `ui/shadcn/combobox.tsx`（官方 vendoring）· `ui/navItems.ts` 上提**保留**）· **B′ 删 1**（`ui/CommandPalette.tsx` —— 弹窗形态退役）· **B′ 改造 3**（`ui/SideNav.tsx`（**条目回到 14** · 换入搜索件）· `ui/AppShell.tsx`（撤面板挂载 + `⌘K` 监听）· `main.tsx` 不动）· **新增依赖 1**（`@base-ui/react@1.8.0`）· i18n 新键 **12 枚**（**定名**：A 7 枚见 M4a §8.12 ③-b · B 5 枚见 §8.13 ④）· 两套 dogfood 断言。

**行为**：**A** —— 顶栏 `size="sm"` · 标题右侧 · `<lg` 隐藏 · 提交后保留输入；结果页 = 类型 chips（全部 / 技能 / MCP / 专家）+ 排序（沿五档白名单）+ 视图切换（网格 / 列表）+ 分页（`total > 20`）。**B** —— 侧栏 1 条独立块（**无组标题**）· 收起态只剩图标钮 · 点条目或按 `⌘K` 开官方 `CommandDialog` · 未登录**只列门户 4 条**。

**断言**：见批 plan **§3 T11-i**（**A 七条 + B 七条**）。

**边界**：不做页内第二个搜索框（防重复）· 面板内**不列资产结果**、**不放危险动作**（登出 / 发布）· 不做输入即搜 / 下拉建议 · 门户三页与控制台筛选框**零改动** · 侧栏**组结构不动**（只加 1 条 · 跨批改动 M4b-2 交付物已留痕）· 匿名可用 · 零迁移。

**落地记录（2026-09-20 实跑）**：**件** = 新建 **5**（`components/search/AssetSearch.tsx` **81** · `pages/Search.tsx` **251** · `components/market/sortOptions.ts` **31** · `components/ui/CommandPalette.tsx` **128** · `components/ui/navItems.tsx` **133**）+ 改造 **6**（`ui/TopBar.tsx` **109** · `ui/SideNav.tsx` **293** · `ui/AppShell.tsx` **99** · `market/Hero.tsx` **128** · `market/CenterPage.tsx` **424** · `main.tsx` +1 路由）；**i18n +12 键**（347 键 / 12 组 · 双向差集 0）；**断言** = `m4a-dogfood` **57/0**（+11）· 本批 dogfood **91/0**；**证据** = 证据文档 **§14.11** + 3 图；**行数一律 `m4b4-measure.ts` 实测回填**（新件已入 measure 清单）。**观感微调（用户 2026-09-20 · 见后一点）**：顶栏小搜索 **靠右 · 语言切换器左侧** · 宽 **固定 `w-[320px]`** · 放大镜 **`strokeWidth=4`**（「加粗一倍」）—— 实测 `rightHalf=true` · `leftOfSwitcher=true` · `gapToSwitcher=11` · `stroke=4`（A/B 白墨 141 → 334 · **2.37×**）。
**B′ 形态变更（2026-09-20 · 用户拍板「就按照 Combobox 方案来」）**：B 部分由「侧栏条目 → 官方 `CommandDialog` **弹窗**」改为 **侧栏常驻输入框 + 紧邻下拉**（官方 `Combobox` · **Base UI** 原语 · **新增依赖 `@base-ui/react@1.8.0`（MIT）**）—— 依据 = 用户同日核 **clawhub 实测**（`input[role=combobox]` 常驻 + `aria-controls` 指向紧邻下拉）后拍板「不弹对话框、侧栏直接输入」。**弹窗形态整体退役**（`ui/CommandPalette.tsx` 删 · 侧栏条目 **15 → 14**）· 规格落 **M4a §8.13 v0.35** · 件 = 新建 **2**（`ui/SidebarSearch.tsx` · `ui/shadcn/combobox.tsx`（vendoring · 偏离 3 处））/ 删 **1** / i18n **−1 键（346）**。断言 = `m4a-dogfood` **57/0**（B 段 6 条重写）· 本批 **91/0** 零回归 · 真登录角色过滤实测（匿名 4 条 / 普通用户 8 条 · 无管理面）。
**B″ 定稿形态（2026-09-20 同日 · 用户复审拍板「还是官方站的对话框更适合一些」· A 案）**：入口 = **框样触发器**（看起来像常驻输入框的**按钮** · **shadcn 官方站同款配方**：`bg-muted` + `border-none` + `shadow-none` + `justify-start` + 内嵌 `⌘K`）⇒ 点击 / `⌘K` 打开官方 **`CommandDialog`**（页面跳转按角色过滤 + 兜底行）。**B′ 一体形态与其依赖 `@base-ui/react` 整体退役**（依赖归零 · `THIRD-PARTY-NOTICES.md` 回 **33 件** · i18n 回 **347 键** · 侧栏条目仍 14）。实测：触发器 h32 · `#f1f5fb` · 无边框 · 点开 = 官方对话框（匿名 4 条 · `data-state=open`）；断言 `m4a-dogfood` **57/0**（B″ 六条）· 本批 **91/0**。自检：代码 18 维 **9.48** / 文档 8 维 **9.45**。
**B″ 观感收尾（2026-09-20 · 用户「只做 B」+「侧边栏搜索图标的颜色要浅一些」）**：用户把 **shadcn 官方文档站命令面板截图**放入仓库根（未跟踪文件 `dialog`，PNG 1104×900）要求对照 ⇒ 核官方仓 `apps/v4/components/command-menu.tsx`（**642 行** · 该面板为**站点应用层**实现，注册表 `command` 件**无 footer 槽位**）后出 **5 屏对照小样**，用户**拍板「只做 B」** = 仅取**条目前缀箭头**一项：① **页面**条目加 `→`（lucide `ArrowRight` · 尺寸 / 色值**全走官方 `CommandItem` 内建规则** ⇒ 本仓零 className 覆盖）· **兜底行不加**（搜索语义 ≠ 跳转）② 侧栏触发器放大镜改 **`text-muted-foreground`**（原 = 无 className ⇒ 继承 `--foreground` `#0f172a`）⇒ 与同块文案 / `⌘K` 徽标**三处同色**（实测三处 `rgb(100,116,139)`）。**未采纳**（用户看小样后未选，登记于 M4a §8.13 ⑦）：官方站**底栏操作提示栏**（其右半 = 复制安装命令，组件库专有动作）· nova 档**容器几何**（官方站自身皮肤）。**件与行数**：`ui/CommandPalette.tsx` **120 → 128** · `ui/SideNav.tsx` **293** 不变（单行改）；**断言** `m4a-dogfood` **57 → 60/0**（+3：触发器取色 / 条目箭头 4 条各 1 枚 / 兜底行无箭头）· 本批 **91/0** 零回归；**自检** = 代码 18 维 **9.55** / 文档 8 维 **9.60**。

## 5. 服务端改动规格（R6 + R6-b）

### 5.1 改动点（**9 个文件** + 3 份规范；**含 1 次迁移** —— v1.8 起 star 并入）

**① `assets/service.ts` —— `listViewableAssets` 参数化（Q4 ①-1）**

- **接口是既有件**：`ListAssetsOptions`（`service.ts:30-38`）现已含 `limit: number` / `offset: number`（**必填**）·
  `type?: AssetType` · `q?: string` · `labelSlugs?: string[]` ⇒ 本批**增量扩两字段**（不新建接口、不改既有字段）：

  ```ts
  + ownerId?: string;                 // 缺省 = 不限 owner（公开面）
  + status?: AssetStatus | 'ALL';     // 缺省 = 'ACTIVE'（公开面行为零变化）
  ```

- **条件数组首项**（`:177` 硬编码 `eq(asset.status, 'ACTIVE')`）改为**按 `status` 组装**：
  `'ALL'` ⇒ 不加状态条件 · `{ACTIVE,HIDDEN,ARCHIVED}` ⇒ 加等值条件 · 缺省 ⇒ 加 `ACTIVE`（= 现状）
- **q 语义零改动**（`:182-204`：slug `ILIKE` ∪ 版本投影 `name`/`description`/`searchText`）；`type`/`labelSlugs`
  两个既有过滤**保留**（me 面不暴露，见 §5.2）
- 返回值形状不变：`{ items: AssetRow[]; total: number }`（**裸 rows、不含 meta** —— 见 ③）
- 一份 SQL 逻辑服务**三面**：公开面（默认）· 我名下（`ownerId`）·（**M4b-6**）管理档全站（不传 `ownerId` + 任意 `status`）

**② `http/asset-item.ts`（新建）** —— `assetItem()` + `AssetItemMeta` 自 `http/assets.ts:111` **原样迁出**；
`assets.ts` 与 `me.ts` 共同 import（响应形状**零变化**；**实测 15 字段**：13 基础 + `starCount`/`starredByMe`——2026-09-18 复核）。

**③ `http/me.ts`（新建）** —— `createMeRoutes({ db })`，挂 `/api/me`：

```text
GET /api/me/assets   （requireAuth）
  1) meQuerySchema.safeParse（自有 schema · **上限口径与公开面 `listQuerySchema` 逐项一致**：
     `limit` int 1..**100** 默认 **20** · `offset` int ≥0 默认 **0** · `status` 默认 **`'ALL'`** · `q` trim 1..**100**）
     非法 `status` ⇒ 400 `request.invalid`（沿用公开面错误体形制 —— 该码为**已落码**，`validate/base.ts:32` 兜底）
  2) listViewableAssets({ ownerId: principal.userId, status, q, limit, offset })
  3) ★ loadAssetItemMeta(db, items)      —— 批注入（两条 inArray 防 N+1）
  4) items.map((i) => assetItem(i, metas.get(i.id)))
  → { items: AssetItem[], total, limit, offset }
```

- ★ **第 3 步不可省**：`listViewableAssets` 返回**裸 `AssetRow[]`**（`service.ts:242`，**不含 meta**）；
  公开列表路由正是在此处做 `loadAssetItemMeta` 批注入（`http/assets.ts:279-287`）。漏掉 ⇒ `latestVersion` /
  `latestName` / `ownerDisplayName` 全为 `null` ⇒ 「名称」列退化为 slug、「版本」列全 `—`（**九列**口径见 §4.2）。
- **owner-only**：`ownerId` 恒取会话 `principal.userId`，**不接受客户端传入**（防越权；U5 集合语义）
  —— `principal` 由中间件注入：`requireAuth()` 定义于 `http/auth-middleware.ts:96`（取用形制照 `http/tokens.ts`）
- 响应形状与公开面列表**同构**（`assetItem` 全 **15 字段**（实测），**含 `status`** ⇒ 「状态」列有值）；**另加 `labels`**（⑦ · 有意扩展项）

**④ `http/assets.ts` —— `assertAssetReadable` 授权集扩展（R6-b · 本批唯一改判定的地方）**

现状（`:163-175`）：`超管 → 放行`；其余 `status !== 'ACTIVE' → 404`。改为：

```ts
if (viewer.isSuperAdmin) return viewer;
const inAuthorizedSet =
  row.ownerId === viewer.viewerId || viewer.isPlatformReviewer;   // owner 本人 ∨ 管理档
if (row.status !== 'ACTIVE' && !inAuthorizedSet) throw new AssetError(assetErrorCodes.notFound);
return viewer;
```

- **一处判定，自动覆盖 8 个调用点（实测 2026-09-18：详情 · 版本列表 · 版本对比 · 版本详情 · 文件 · **star 收藏** · **star 取消** · 下载）**：详情 `:294` · 版本列表 `:308` · 版本详情 `:332` · 文件 `:351` · 下载 `:371` · 预览 `:778`
- **授权集外仍 404**（`asset.not_found`）⇒ 「不泄露存在性」原则（§7.1）**保持**
- 授权集 = **{owner 本人，管理档（`role ≥ 10`），超管}**（与 `canManageAsset` 同源；**不含**「版本上传者本人」—— Q5 A）

**⑤ `app.ts`** —— `app.route('/api/me', createMeRoutes({ db: deps.db }))`（挂载表新增 1 行）

**⑥ 规范同步（Q11 A，随本批即改）** —— 见 §9.6

**⑦ `labels` 形状升级 = 服务端返**结构体**（Q14 = B · §2.1d）**

> 背景：列表新增「标签」列（R1）；而既有 **D5**（前端类型谎言：`AssetItem.labels` 声明对象数组、服务端返
> `string[]`）与 **D7**（门户详情页标签 chips **渲染空白**）**同源** —— 根因都是「服务端只返 slug、文案无处可取」。
> 本批按 **skillhub 真仓做法**一次根治（对标实测：其 `SkillLabelDto = { slug, type, displayName, parentId }`）。

- **形状**（对齐 skillhub）：
    ```ts
  // **v1.11 实测订正（F44）**：`parentId` = **父标签 slug（`string | null`）**，非 id ——
  // 与既有 `listPublicLabels`（`PublicLabel.parentId`）及 skillhub `SkillLabelDto` 同形
  labels: Array<{ slug: string; type: 'RECOMMENDED' | 'PRIVILEGED'; displayName: string; parentId: string | null }>
  ```
- **`displayName` 语种口径**：与公开候选面 `GET /api/labels` **同源** —— 取 `Accept-Language` 首段；
  **v1.12 实现期收口**：原 `http/labels.ts:66` 内联表达式抽为 **`http/asset-item.ts` `requestLocale(c)`** 单点，
  由 `labels.ts` / `assets.ts`（详情）/ `me.ts`（个人面）**三处共用** ⇒ 语种解析只有一份实现（防三处漂移）
- **落点（4 处）**：
  1. `apps/web/src/api/types.ts` —— 标签形状类型改写（**v1.10 订正**：实测资产响应类型**不在** `packages/protocol`，
     而在 web 的 `api/types.ts` ⇒ **该处才是形状 SSOT**；协议层本批**零改动**）
  2. `labels/service.ts` —— 新增**批量** `labelsOfAssets(db, assetIds, locale)`（一次 `inArray` join
     `label_definition` + `label_translation`，**防 N+1**）；既有单资产 `labelsOfAsset`（返 `string[]`）**保留**
  3. `http/asset-item.ts` —— `assetItem()` 增**可选** `labels` 形参（不传 ⇒ 不下发 ⇒ 公开**列表**面形状零变化）
  4. `http/me.ts` —— meta 批注入之外**并列一次批量 labels 查询**（仍无 N+1）
  5. `http/assets.ts` **详情路由**（`:294` 一带）—— 传入批查到的 labels ⇒ **D7 在同一处修好**（公开详情面随之改形状）
- **偏离登记（如实）**：**skillhub 的列表不返回标签**（实测 `SkillSummaryResponse` 无 `labels` 字段，标签只在详情面）
  ⇒ 本批「列表带标签」= **有意扩展**；形状与它详情面**保持一致**，不自创第二套
- **D5 / D7 处置**：D5 ⇒ 前端 `AssetItem.labels` 类型改结构体数组（与协议一致）· D7 ⇒ `AssetDetail.tsx:200-208`
  改读 `label.displayName ?? label.slug`（**服务端已给名字，前端零 join**）⇒ **两缺陷同批闭合**
- **兼容面实测**：`labels` 元素类型 `string → object` 的唯一**仓内消费者** = `AssetDetail.tsx:200-208`（正被本批修）；
  `apps/cli` / `packages/protocol` 其余消费点 **0**（grep 实证）⇒ 破坏面收敛到「本批修的那一处」

**⑧ star 最小集 = 收藏关系 + 热度计数 + 三处读面 + 一个门户入口（v1.8 · 用户 2026-09-18 决定「并入 M4b-4」）**

> 依据：`docs/00` §6 首期非目标原文「社交面（评分/评论/关注）—— 只保留下载统计与**收藏**所需最小集」
> ⇒ star **属首期允许范围**；对标 skillhub 实测（`skill` 表含 **`star_count integer` 冗余列**）与 `08` 范式
> （「热查询计数**冗余在主表**、落库时事务内自增」）**双证** ⇒ 计数口径 = 冗余列。

- **数据模型（1 次迁移）**
  - 新表 `asset_star(id bigint PK · asset_id FK→asset ON DELETE CASCADE · user_id FK→user ON DELETE CASCADE ·
    created_at)\` + **`UNIQUE(asset_id, user_id)`**（幂等的结构保证）
  - `asset` 增 **`star_count integer NOT NULL DEFAULT 0`**（与 `download_count` 同族口径）
- **端点（2 条 · `requireAuth`）**
  | 方法 | 路径 | 语义 | 响应 |
  |------|------|------|------|
  | PUT | `/api/assets/:slug/star` | 收藏（**幂等**：已收藏 ⇒ 200 且不重复计数） | `{ starCount, starred: true }` |
  | DELETE | `/api/assets/:slug/star` | 取消收藏（**幂等**：未收藏 ⇒ 200） | `{ starCount, starred: false }` |
- **权限**：**任何登录用户**（含非 owner）—— star 是**社交动作**，**不受** `canManageAsset` 约束（与 skillhub 一致）；
  资产可见性仍走既有 `assertAssetReadable`（授权集外 ⇒ **404**，不泄露存在性）
- **审计**：**不写审计**（与「下载不入审计」同口径，R13 先例）· **不限流**（`PUT`/`DELETE` 幂等，无放大写入）
- **读面（三处 · 同一形状）**：`assetItem()` 增 **`starCount: number`**（所有面：公开列表 / 详情 / me 列表）·
  **`starredByMe: boolean`**（需登录态；**匿名 ⇒ `false`**）⇒ 列表「收藏」列 / 详情页头卡按钮**两处消费**（~~抽屉统计行~~ 随抽屉取消 · v1.19）
- **计数维护**：`star_count` 在**同事务内** ±1（先尝试 INSERT `ON CONFLICT DO NOTHING` ⇒ 仅真正新增/删除时改计数）
- **未登录**：`401` ⇒ 前端 toast `market.starLoginRequired` + 跳 `/login?next=<当前页>`（原型已演示该交互）
- **响应类型**：`apps/web/src/api/types.ts` 增 `starCount: number` / `starredByMe: boolean`
  （**v1.10 订正**：`packages/protocol` **无资产响应形状** ⇒ 协议层零改动；形状 SSOT = web `api/types.ts`）
- **规范同步**：`08-data-model.md` 补 `asset_star` 表 + `asset.star_count`（**Q11 A 随本批即改**）

### 5.2 契约影响（向后兼容论证）

| 变更 | 类型 | 影响面 |
|------|------|-------|
| `GET /api/me/assets` | **纯新增** | 无既有消费方；公开面零改动 |
| `listViewableAssets` 参数化 | **内部函数签名** | 调用方（`http/assets.ts:257` 公开列表）**不传新参** ⇒ 走默认值 ⇒ **响应零变化**（Q12 D 用断言锁） |
| `assetItem` 迁文件 | **内部重构** | 导出面扩大（`assets.ts` → 中性模块），**响应形状零变化** |
| `assertAssetReadable` 授权集 | **读面放宽** | 唯一行为变化 = **owner / 管理档**对非 ACTIVE 资产：404 → 200；**匿名与其他登录用户不变（仍 404）**；超管不变 |

**非目标（本批明确不做）**：不改公开列表口径（`GET /api/assets` 默认仍只返 `ACTIVE`）· 不给 `me/assets`
加 `labels` 字段（标签取详情，Q7 ②）· 不给版本列表项加 `createdBy`（Q5/Q8 C 登记）· 不动 token scope 组合 · **me 面不暴露 `type`/`label` 过滤**
（U5 只要求状态 + q ⇒ 最小面）。

### 5.3 测试面（Q12 A–D）

**① 更新既有断言 2 处**（`http/assets.test.ts`，均属**需求变更驱动的契约更新**，已获准）

| 位置 | 现状 | 更新为 |
|------|------|--------|
| `:418` | fixture `insertAsset('ast-hidden','agent',**member**,'HIDDEN')`（`:143`）⇒ 断言 `member → 404` | `member`（**= owner**）→ **200**；**保留** `superAdmin → 200`；**新增** 非 owner 登录用户 → 404 |
| `:844-857` | `:854` 注释「owner 亦不可读（详情语义）」+ `:856` 断言 owner 404 | owner → **200**；**保留**匿名 404；**注释去腐化**（改为「授权集内可读，集外 404」） |

**② 授权集三档对照**（在①的同一 `it` 内补齐）：owner **200** / 管理档 **200** / 非 owner 登录 **404** / 匿名 **404**。

**③ 分层四面对照**（§7.2 声明「详情 / 版本 / 文件 / 下载」四面同步放宽 ⇒ 四面各一条断言）：
`GET /:slug` · `GET /:slug/versions` · `GET /:slug/versions/:v/files/*` · `GET /:slug/versions/:v/download`
—— 对同一 HIDDEN 资产，**授权集内 200 / 集外 404**。

**④ 新端点用例**（新建 `http/me.test.ts`）：未登录 **401** · **owner-only 集合**（他人资产不出现）·
`status=ALL` 含三态 · `status=HIDDEN` 过滤 · 分页（`limit`/`offset`/`total`）· `q` 检索 · 非法 `status` → 400。

**⑤ 公开面回归锁**（Q4 参数化的唯一回归风险点）：`GET /api/assets`（**不传新参**）⇒ 仍只返 `ACTIVE`、
响应字段集不变。

**⑥ 必须原样保留（防「改弱测试」）**：匿名列表不含 HIDDEN（`:442-450`）· HIDDEN 文件匿名 404（`:694`）·
陌生人下载 404（`download.test.ts:212`）· 统计不计 HIDDEN（`stats.test.ts`）—— **一个字不动**。

## 6. i18n 变更规格

> **口径**（Q10 D）：本节给**逐键表**（zh 真源 + en 逐条对齐）；**总键数不预写**，由实现期**实测回填**
> （防「AI 自报数字」漂移）。纪律：双语**双向差集 = 0** · 占位符一致 · `Dict` 类型约束（缺键即编译错）。
> 现状基线：**222 键 / 11 组**（2026-09-18 实测，双向差集 0）；本批新增/变更见 §6.1–§6.4，**总数实现期实测回填**。

### 6.1 新建组 `assets`（逐键表 · v1.7 修订口径）

 > v1.9 变更：**删 6 键**（`drawer.title` / `section.previewHint` / `desc.title` / `desc.empty` / `stat.downloads` / `stat.stars`）—— 抽屉取消（§4.3）；`section.labels` 保留供详情页标签卡复用。
> v1.7 变更（§2.1d）：`col.name` 值改「名称」· **新增 3 列键**（`col.labels` / `col.download` / `col.star`）·
> `menu.open` → **`action.open`**（列表去菜单）· **删 5 键**（`menu.restore/hide/archive/labels/delete`）·
> **删 `section.status`**（状态治理段移出抽屉，改由 `admin.statusGroup` 表达）· 段名 `标签+-` ·
> 新增抽屉预览键（`section.previewHint` / `desc.*` / `stat.*`）与**详情页管理区键**（`admin.*`）·
> **补版本 8 态徽章键**（F14：§6.1 原缺 —— `StatusPill` 的 `label` 为**必填 prop**）

| 键 | zh | en |
|----|----|----|
| `title` | 我的资产 | My assets |
| `description` | 管理你名下的资产（含隐藏与归档） | Manage the assets you own, including hidden and archived |
| `col.name` | **名称** | Name |
| `col.type` | 类型 | Type |
| `type.skill` | **技能** | **Skill**（F46 补：§6.1 原称「复用 `market` 组既有键」——实测**不存在**逐类型文案键，仅中心页标题键 ⇒ 本组新建 3 键） |
| `type.mcp` | **MCP Server** | **MCP Server** |
| `type.agent` | **Agent** | **Agent** |
| `col.status` | 状态 | Status |
| `col.labels` | **标签** | Labels |
| `col.version` | 版本 | Version |
| `col.download` | **下载** | Downloads |
| `col.star` | **收藏** | **star** |
| `col.updated` | 更新 | Updated |
| `col.actions` | 操作 | Actions |
| `filter.status.all` | 全部 | All |
| `filter.status.active` | 活跃 | Active |
| `filter.status.hidden` | 已隐藏 | Hidden |
| `filter.status.archived` | 已归档 | Archived |
| `filter.search` | 搜索名称或 slug | Search name or slug |
| `empty.title` | 你还没有资产 | You have no assets yet |
| `empty.hint` | 通过 CLI 或发布页上传你的第一个资产 | Upload your first asset via the CLI or the publish page |
| `empty.filtered` | 没有符合条件的资产 | No assets match the filter |
| `action.open` | **打开详情** | Open details |
| `section.labels` | **标签+-** | Labels (+/-) |（**详情页标签卡复用**；原属抽屉段，v1.9 后仍保留） |
| `label.add` | 添加标签 | Add label |
| `label.search` | 搜索标签 | Search labels |
| `label.empty` | 没有匹配的标签 | No matching labels |
| `label.limit` | 已达到 10 个标签上限 | Label limit reached (10) |
| `label.privileged` | 仅超级管理员可移除特权标签 | Only super admins can remove privileged labels |
| `admin.title` | **管理** | Manage |
| `admin.statusGroup` | **资产状态** | Asset status |
| `admin.versionGroup` | **版本** | Versions |
| `admin.reviewGroup` | **审核（形态待讨论）** | Review (to be discussed) |
| `admin.dangerGroup` | **危险区** | Danger zone |
| `admin.noPermission` | **当前身份无管理权限** | You do not have permission to manage this asset |
| `status.current` | 当前状态 | Current status |
| `action.restore` | 恢复 | Restore |
| `action.hide` | 隐藏 | Hide |
| `action.archive` | 归档 | Archive |
| `version.col.version` | 版本 | Version |
| `version.col.status` | 状态 | Status |
| `version.col.created` | 创建时间 | Created |
| `version.col.files` | 文件 | Files |
| `version.empty` | 该资产还没有版本 | This asset has no versions yet |
| `version.delete` | 删除 | Delete |
| `version.yank` | 撤回分发 | Yank |
| `version.deleteDisabled` | 该状态不可删除 | This version cannot be deleted |
| `version.yankDisabled` | 仅管理档可撤回已发布版本 | Only admins can yank a published version |
| `version.status.draft` | 草稿 | Draft |
| `version.status.scanning` | 扫描中 | Scanning |
| `version.status.scan_failed` | 扫描失败 | Scan failed |
| `version.status.uploaded` | 待提交 | Uploaded |
| `version.status.pending_review` | 审核中 | Pending review |
| `version.status.published` | 已发布 | Published |
| `version.status.rejected` | 已驳回 | Rejected |
| `version.status.yanked` | 已撤回 | Yanked |
| `danger.delete` | 删除资产 | Delete asset |
| `danger.hasPublished` | 该资产有已发布版本，不能删除 | This asset has published versions |
| `danger.hasYanked` | 该资产有已撤回版本，不能删除 | This asset has yanked versions |
| `toast.statusUpdated` | 状态已更新 | Status updated |
| `toast.labelAttached` | 标签已添加 | Label added |
| `toast.labelDetached` | 标签已移除 | Label removed |
| `toast.versionDeleted` | 版本已删除 | Version deleted |
| `toast.versionYanked` | 版本已撤回 | Version yanked |
| `toast.assetDeleted` | 资产已删除 | Asset deleted |

> **删键留痕**（v1.7）：`menu.restore` / `menu.hide` / `menu.archive` / `menu.labels` / `menu.delete`（列表去 `⋯` 菜单）·
> `section.status`（段移出）· `danger.deleteChecking` / `danger` 的「版本列表未就绪」口径（纯预览不再需要）。
> **资产 3 态徽章文案**：复用 `filter.status.*`（先例 = M4b-3 `STATUS_KEY` 同时供筛选与徽章）。

### 6.2 既有组 `dashboard` 补键（现 **6 键**）

> **优先复用既有键**：我的资产卡标题用 `dashboard.myAssets`（不新增）；空态用既有 `dashboard.empty`。

| 键 | zh | en |
|----|----|----|
| `card.pending.title` | 待审核 | Pending review |
| `card.pending.cta` | 去处理 | Review |
| `card.assets.cta` | 去管理 | Manage |
| `card.audit.title` | 最近审计 | Recent activity |
| `card.audit.col.time` | 时间 | Time |
| `card.audit.col.action` | 动作 | Action |
| `card.audit.col.target` | 对象 | Target |
| `card.audit.viewAll` | 查看全部 | View all |

### 6.3 既有组 `common` +1 · `errors` +7 码

| 组 | 键 | zh | en |
|----|----|----|----|
| `common` | `loadMore`（**跨面通用** —— 抽屉版本段与未来列表共用） | 加载更多 | Load more |
| `errors` | `asset.has_published` | 该资产存在已发布版本，无法删除 | This asset has published versions and cannot be deleted |
| `errors` | `asset.has_yanked` | 该资产存在已撤回版本，无法删除 | This asset has yanked versions and cannot be deleted |
| `errors` | `asset.version_not_deletable` | 当前状态的版本不可删除 | A version in this state cannot be deleted |
| `errors` | `asset.version_not_yankable` | 仅已发布版本可撤回分发 | Only published versions can be yanked |
| `errors` | `asset.yank_reason_required` | 请填写撤回原因 | A yank reason is required |
| `errors` | `label.limit_exceeded` | 标签数量已达上限（10） | Label limit reached (10) |
| `errors` | `label.access_denied`（**Q13 = A 引入** —— 非超管移除 PRIVILEGED 标签的服务端拒绝码） | 没有权限操作该标签 | You do not have permission to modify this label |

> **不预支**：M4b-6 的标签 CRUD 错误码（如 `label.slug_taken`）**本批不补**（Q10 C）。
> **`errors` 组现状 28 键**（脚本实测）⇒ 本批后 **35 键**（28 实测 + 7 新增；**实现期以脚本实测回填**，不视为已证值）。

### 6.4 既有组 `market` 补键（详情页改造 · §4.6）

> 详情页头卡 [下载] / [收藏] 与右栏标签卡文案 —— **优先复用既有键**（`market.dlLatest` / `market.downloads`
> 用于下载按钮与元信息「下载」行），仅补下列 **6 键**（2026-09-18 实测复核：表头曾写 4、表列 6，以此表为准）：

| 键 | zh | en |
|----|----|----|
| `market.star` | 收藏 | Star |
| `market.starred` | 已收藏 | Starred |
| `market.starLoginRequired` | 登录后可收藏 | Sign in to star this asset |
| `market.labelsTitle` | 标签+- | Labels (+/-) |
| `market.starToast` | 已收藏 | Starred |
| `market.unstarToast` | 已取消收藏 | Unstarred |

### 6.5 既有组 `market` 补键（T11-e 视图切换 + 折叠搜索 · v1.22）

> **6 键**（全部实测消费 · 未消费键基线 12 不变）：触发钮复用既有 `market.searchBtn`（「搜索」）；`colName`/`colDesc`/`colDownload`
> 为表头文案，`author`/`star` 复用既有键 ⇒ 净增 6 键。

| 键 | zh | en | 消费点 |
|----|----|----|--------|
| `market.viewGrid` | 网格视图 | Grid view | `CenterPage.tsx` 视图切换钮 `aria-label`/`title` |
| `market.viewList` | 列表视图 | List view | 同上 |
| `market.colName` | 名称 | Name | `AssetList.tsx` 表头列 1 |
| `market.colDesc` | 描述 | Description | 表头列 2 |
| `market.colDownload` | 下载 | Downloads | 表头列 4（列 3/5 复用 `market.author` / `market.star`）|
| `market.searchClose` | 关闭搜索 | Close search | 折叠面板尾部关闭钮（清空 `q` + 收起）|
### 6.6 既有组 `market` 补键 + 退役一键（T11-f 排序 · v1.23）

| 键 | zh | en | 消费点 |
|----|----|----|--------|
| `market.sortLabel` | 排序 | Sort | `Select` 前 `Label`（**v1.27 新增**）|
| `market.colUpdated` | 更新 | Updated | 列表「更新」列头（**v1.28 新增** · 与控制台 `assets.col.updated` **同词**）|
| `market.sortNewest` | 最新 | Newest | `Select` 选项 1（默认档）|
| `market.sortDownloads` | 下载量 | Most downloads | 选项 2 |
| `market.sortStars` | 星标数 | Most stars | 选项 3 |
| `market.sortName` | 名称 | Name | 选项 4 |
| `market.sortAuthor` | 作者 | Author | 选项 5 |
| ~~`market.sortRecent`~~ | ~~排序：最近更新~~ / ~~Sort: recently updated~~ | — | **退役**：原静态文本被排序控件取代（消费点仅 `CenterPage.tsx` 一处，实测）|

> **净变化（预期值 · 实现期以 `m4b4-measure.ts` + 审计扫描实测回填）**：全仓键数 329 → **333**（+5 新键 −1 退役）；**未消费键 12 → 12（不变）**
> —— `sortRecent` 原本**有消费者**（`CenterPage.tsx:242`），退役它与消费点**同时消失** ⇒ 未消费清单不受影响；**7 个新键**（五档 + **`sortLabel`**（v1.27 随 `Select`）+ **`colUpdated`**（v1.28 随「更新」列））全部有消费点。**实测键数 = 335 / 12 组**（`m4b4-measure`，en 值级中文泄漏 0）。
> 列头排序的 `aria-sort` 为**属性**、无文案 ⇒ 不涉 i18n；图标用 lucide（`ArrowUpDown`/`ArrowUp`/`ArrowDown`）。


## 7. 接口变更总览（服务端面）

| # | 变更 | 类型 | 位置 | 说明 | 归属 |
|---|------|------|------|------|------|
| **R6** | 新增 | `GET /api/me/assets` | 「**我名下的资产**」读面（owner-only · `status` 默认 `'ALL'` · `q` · 分页）；响应形状与公开面列表同构 | 本批 |
| **R6-b** | **修改** | `http/assets.ts` `assertAssetReadable` | 非 ACTIVE 读面授权集 = {owner 本人 / 管理档 / 超管}；**集外仍 404**（不泄露存在性） | 本批 |
| — | 内部 | `assets/service.ts` `ListAssetsOptions` | **+ `ownerId?` / `status?`**（默认值保公开面行为零变化） | 本批 |
| — | 内部 | `http/asset-item.ts`（新件） | `assetItem` + `AssetItemMeta` 迁出为中性模块（`assets.ts` / `me.ts` 共用） | 本批 |
| — | 内部 | `app.ts` | 挂载 `/api/me`（1 行） | 本批 |
| — | 迁移 | — | **零迁移**（无 schema 改动） | — |
| 规范 | 修改 | `05` §6.4:187 + `:161` · `08` §7 | 读面授权集行 + 超管行措辞 · 读面注记 + **ARCHIVED 运营语义补实** | 本批（Q11 A） |

## 8. UI-UX 变动总览（本批用户可见变化）

| 面 | 变动 |
|----|------|
| `/dashboard` | 过渡形态（`ComingSoon` 内容槽）→ **三卡 landing**：三张计数/列表卡 + 卡内 CTA + 审计卡 5 行（`role ≥ 10` 才渲染后两卡） |
| `/dashboard/assets` | 占位页 → **真页**：**九列**列表 + 状态筛选 + q 搜索 + 分页（**无行菜单**；操作列 = 单个 `Eye`「打开详情」图标钮 · `Button asChild` + `Link` 真链接直跳 `/assets/:slug`） |
| 新件 | ~~资产管理抽屉 = 快速预览（右侧 `Sheet` · 宽 560）~~ ⇒ **取消（v1.9）** · **资产详情页管理区**（改 M4a 页 · §4.6）—— 管理动作**全部**归此面（入口 = 列表操作列 `Eye` 真链接） |
| 入口与导航 | **零变动**（两条目已在「个人」组；本批不新增入口、不改显隐） |
| 视觉 | **零新 token、零新依赖** —— 全部消费 M4a §4.4（SSOT）+ 主 design §10.1 控制台特有值（表格密度 **40** / 抽屉宽 **560**，均已落值） |
| 空 / 载 / 错态 | 列表：骨架行 + **两套空态文案**；三卡：**每卡独立三态 + 独立重试**；抽屉：段内载态（危险区在版本列表就绪前**保持禁用**） |
| 无障碍 | 整卡 `<Link>` 覆盖层 + 内层 CTA 用**非 anchor** `<span>`（**无嵌套 `<a>`**）；`Drawer`/`ConfirmDialog` 必带 title/description |
| i18n | 新组 `assets`（逐键表 §6.1）+ `dashboard` 补 8 键 + `common` +1 + `errors` **+7** + `market` **+6**（§6.5 · v1.22）|
| 门户中心三页（`/skills` `/mcps` `/agents`） | **v1.22 · 视图切换**：结果计数行右端加**网格 ⇄ 列表**（官方 `ToggleGroup`）· 默认网格 · 同页翻页/搜索/筛标签**保持视图**（组件 state，不落 URL/存储）· 离开页面/刷新/后退前进 ⇒ 回网格（用户「不用记忆」）· 列表形态 = 官方 `Table`（5 列 + 表头 · **与页面背景融为一体** · 行高 55/多行 93 · 描述最多 3 行 + 省略号）|
| 门户中心三页 · 搜索入口 | **v1.22 · 折叠搜索**：触发钮（官方 `Button` ghost `icon-sm` 32×32 + lucide `Search`）位于视图切换钮**左侧**；点开在工具条**下方**撑满宽度展开官方 `InputGroup`（左放大镜 + 无边框输入 + 尾部关闭钮 24px）· 展开自动聚焦（**有意偏离 ClawHub**）· **页头搜索框删除**（**中心三页内**唯一入口 = 折叠面板；首页 `Hero` 的胶囊搜索属 **M4a 落地页入口，本批未动** —— F78）|

## 9. 回归面与验证口径

### 9.1 门户零回归（**硬约束 —— 每 Task 收尾必跑**）

- **`m4a-dogfood.ts` 全量 PASS + `NO JS ERRORS`**（M4a 四条门户读面行为语义不变 —— **T11-e 后为 37/37 · T11-f 后为 38/38**：
  搜索入口断言由「页头输入框」改「折叠面板两步」（**F69**）；**v1.22 起「`CenterPage.tsx` 零 diff」不再是本批契约**，改为**零回归**）
- **`m4a-chain-smoke.ts` PASS**
- **`CenterPage.tsx` 零回归**（**v1.22 口径订正 · F74**）：原表述为「零 diff」—— 该契约**自 T11-e 起解除**（同页已加视图切换与折叠搜索）⇒ 现行契约 = 「门户读面**行为**零变化」：
  `useMarketQuery` 的 `status` 维度为**可选参数**、门户调用点（`CenterPage.tsx`）**不传** ⇒ 不读不写 `status` param ⇒ 行为零变化；**回归判据** = `m4a-dogfood` 全量 PASS（36 → **37**）+ 网格形态与默认排序不变
- 生产产物 **零 `M4b-` marker**（DEV_BATCH 条目随真页删除）

### 9.2 门禁与冒烟顺序（**复现 CI**，AGENTS.md 硬规则）

```
bun install --frozen-lockfile → typecheck → lint → format:check → 文档体检(doc-audit)
  → build → db:migrate → CI=true bun run test
```

- 测试库口径 = **单库 + 干净 schema + `CI=true`**（CI 只建一个库）；测试**禁止无条件改写 `process.env`**（沿用 `??=` 兜底）
- `turbo.json` 环境变量声明：**本批不新增**任务依赖 env
- `db:migrate` 独立步骤先跑（消除多文件 `beforeAll` 并发迁移竞态）；**本批零迁移**但仍跑（守门）

### 9.3 本批 dogfood 分组（新建 `docs/smoke/scripts/m4b4-personal-b-dogfood.ts`；v1.9 起 G7/G8 改为「直跳详情」口径；**v1.22 起增 G20/G21**）

| # | 断言组 |
|---|-------|
| G1 | **未登录**访 `/dashboard` 与 `/dashboard/assets` ⇒ 重定向 `/login?next=<带码路径>`（保码） |
| G2 | `role = 1` 工作台：**只渲染 1 卡** + **只发 1 请求**（排除壳层 `me`/`stats`） |
| G3 | `role = 10` 工作台：**3 卡 + 3 请求**；审计卡 5 行且**不含操作人** |
| G4 | 我的资产默认「全部」⇒ **实际请求 URL 含 `status=ALL`**（防名实不符） |
| G5 | **owner-only 集合**：造数的「他人资产」**不出现**在我的列表 |
| G6 | **九列**齐 + 状态列值正确（ACTIVE/HIDDEN/ARCHIVED 各一行）+ **类型列无色**（反证：容器内 `[class*="bg-type-"]` 计数 = 0） |
| G7 | **列表操作列 = 真链接**（`<a href="/assets/<slug>">`）；点击后 `location.pathname` = `/assets/<slug>`；**全站无 `[data-slot="sheet-content"]`**（反证：抽屉已取消 · §4.3） |
| G8 | **详情页为唯一视图**：列表点图标 ⇒ 详情页渲染该资产 `h1`（**无过渡态**）；详情页内**管理动作按权限显隐**（与 G11 合验） |
| G9 | 标签 chip 文案 = **`displayName`**（结构体渲染；反证：chips 文本 ≠ slug，Q14 = B）· chips ≥ 10 ⇒ 候选禁用 + 说明 |
| G10 | 列表 star/下载两列数值 = 接口 `downloadCount` / `starCount` —— **star 批落地后启用**（未落地 ⇒ 三处均不渲染，§4.6 降级口径） |
| G11 | **详情页管理区 5 档权限矩阵**逐档断言：访客 / 登录非 owner（两卡均不渲染）· owner（无 yank / 无特权标签）· 管理档（有 yank）· 超管（+ 特权标签） |
| G12 | 详情页版本 Tab 行内动作：**owner 视图「删除」仅 2 态、管理档 4 态**；yank 仅 `PUBLISHED` 行且仅管理档（真码守卫对照） |
| G13 | 筛选 / 搜索变更 ⇒ `page` **回落 1** + URL 同步（`?status=&q=&page=`） |
| G14 | 门户零回归 **38/38**（`m4a-dogfood` 实跑基线 —— T11-e 36 → 37（**F69/F75**）· **T11-f 37 → 38**（排序栏断言随形态改写，**F85**））· **门户卡星标 = 纯展示**（两枚同款 stat：下载 + 收藏 · 卡内无 `button[aria-pressed]`）· 详情页收藏入口存在 —— 口径随 v1.8 追加、**2026-09-18 随 F67 更新**（见 **G14b**） |
| G15 | **star 幂等**：同一资产连点两次收藏 ⇒ `starCount` 只 +1（`starred` 恒 true）；取消两次同理只 −1 回基线 |
| G16 | **`starredByMe` 语义**：匿名 / 未收藏 ⇒ `false`；本人收藏后 ⇒ `true`；**他人**收藏同一资产 ⇒ 我的 `starredByMe` 仍 `false`（计数 +1） |
| G17 | **star 读面一致**（**两处 UI + 接口**）：列表「收藏」列 = 详情页头卡按钮数字 = 接口 `starCount`（~~抽屉统计行~~ 随抽屉取消 · v1.19） |
| G18 | **未登录**点「收藏」⇒ **不发写请求**，走 toast + `/login?next=`（§5.1 ⑧）—— 入口 = **详情页头卡**（2026-09-18 门户卡改纯展示后，F67）|
| G19 | 全场景 **`NO JS ERRORS`** |
| G20 | **门户视图切换（T11-e · 10 条）**：① `/mcps` 首访默认网格（两枚视图钮 · 网格容器在 · 行容器 0）② 点列表切换成功 ③ 列表形态 20 行 · **行高 55**（官方 `Table` + `py-4` 实测）· **行内 0 button**（纯展示口径不破）④ 表头 5 列文案（名称/描述/作者/下载/收藏）+ 行内五格字段齐 ⑤ **描述上限 = 3 行 + 省略号**（`line-clamp: 3` 真值 + 单元格 `white-space: normal`）⑥ 点下一页 ⇒ URL `?page=2` 且**仍是列表**（视图不受翻页影响）⑦ 离开再回 ⇒ 回默认网格（「不记忆」口径）⑧⑨⑩ 匿名：视图钮照常渲染 + 可切列表 + `/skills` 6 行无分页（正当缺席）|
| G21 | **折叠搜索（T11-e · 6 条）**：① 收起态 = 图标钮 32×32 · 位于视图切换钮**左侧** · `aria-expanded=false` · 面板未渲染 · 全页可见 input 0 ② 点触发钮展开 ③ 展开态 = 面板在工具条**下方** · 宽度与工具条等宽（±2px）· 两枚 addon · **自动聚焦** · 关闭钮 24px ④ 面板输入 ⇒ URL `?q=` + 计数改「筛选结果」⑤ **页头搜索已移除**（hero 卡内 input = 0 · 全页可见 input = 1）⑥ 关闭钮 ⇒ 清空 q + 收起（可见 input 归 0）|
| G22 | **资产排序（T11-f · 实测 14 条 · 控件 = 官方 `Select` + 列表五列可点）**：① 默认无参 ⇒ URL 无 `sort` + 顺序 = `updated_at desc` ② 五档逐档 ⇒ URL 含 `?sort=<档>` + 首条真值对接口（下载/收藏取最大值 · 名称按 slug 升序 · 作者按 display_name）③ 改排序 ⇒ URL 含 `sort` **且不含 `page`**（回第 1 页）④ 非法值 `?sort=bogus` ⇒ 静默回落默认（不报错不空白）⑤ 列头：点名称列 ⇒ `aria-sort="descending"` → 再点 `ascending` + URL 同步 ⑥ 双视图：列表切排序 ⇒ 切回网格仍保持 ⑦ 匿名：chips 可用 + 列头可点 |

### 9.4 出口件 ④（本批验收清单）

沿用 M4b-2 口径（**CDP 自动断言 + 用户认可**）：出口件 ④ = 上表 **G1–G22** 逐组实测 + 用户实机认可结论；
**审美面不在本批范围**（视觉打磨归 **M4b-7**，本批只做**合规核对**：有无错位 / 溢出 / 串色 / 异常）。

### 9.5 造数需求（**写库须用户授权**；脚本进仓，口令不落库）

`docs/smoke/scripts/m4b4-seed-assets.ts`（**幂等 upsert**）：

| 类别 | 内容 | 用途 |
|------|------|------|
| 角色 | 3 账号：普通 `USER` / 管理档 `ADMIN` / 超管 `SUPER_ADMIN` | G2/G3/G7/G9 按档断言 |
| owner 名下**三态资产** | `ACTIVE` / `HIDDEN` / `ARCHIVED` 各 ≥1（三族各一条更佳） | G6 状态列 · R6 集合含三态 |
| **他人**名下资产 | 非当前 owner 的 `ACTIVE` 资产 ≥1 | **G5 owner-only 集合断言**（关键） |
| 版本 | 每个资产 ≥1 版本；**含 `PUBLISHED` 的资产** 与 **仅 DRAFT 的资产** 各一 | G8 危险区禁用真值 · G9 可删/禁删 |
| 标签 | 复用既有种子标签；挂 ≥1 个到 owner 资产 | G10 chips 与候选差集 |
| **审计** | **≥5 条**审计记录（由造数动作自然产生，或直插 `audit_log`） | 工作台「最近审计」卡 5 行（**§2.1c 条① R2**） |
| **star**（v1.8 追加） | ①「他人」给 owner 资产挂 **1 个收藏** ② owner 自己收藏 **1 条**（另一资产） | G15/G16/G17 三组断言（覆盖 `starredByMe=false` 而 `starCount=1` 的对照） |
| **分页占位**（v1.22 追加 · T11-e） | **21 条 `m4b4-seed-page-01`…`-21`**：类型 = **mcp** · owner = `m4b2_mgr` · `ACTIVE` · 各带 `PUBLISHED` 版本 | G20 翻页断言（`/mcps` 2 → **23** > 20 出第二页）。⚠️ **不用 skill 类型**（会打翻 `m4a-dogfood` 的「/skills < limit ⇒ 无分页」与「首屏含 LangGraph 卡」两条基线）· **不挂 owner 名下**（会污染 G5/G6 的 3 行断言）|
| **排序样本**（v1.23 追加 · T11-f） | 给 21 条占位资产写**可判定递变值**：`star_count = i` · `download_count = i × 3`（i = 1…21）⇒ 下载档与星标档顺序可区分；名称档按 slug（`m4b4-seed-page-01`…`-21`）天然有序 ⇒ 顺带覆盖「空名回退 slug」口径；作者档由两组 owner（`m4b2_user` / `m4b2_mgr`）构成两个可区分值 | G22 四档断言（下载/星标/名称/作者）|

- 口令从 **env** 读（`SMOKE_*_PASSWORD` 惯例）；**仓库内不落任何口令 / 连接串**
- **首次写库前须用户明确授权**（先例：M4b-2/M4b-3 造数）；幂等 ⇒ 可重放

### 9.6 规范同步（Q11 A —— 随本批即改）

| 文件 | 改动 |
|------|------|
| `05-identity-access.md` §6.4 | `:187` 授权集行：「非 ACTIVE 资产读面 = **仅超管**」→ **{owner 本人 / 管理档 / 超管}**；`:161` 超管行措辞连带（「全部权限（含非 ACTIVE 资产读面）」→ 去「含」的独占暗示） |
| `08-data-model.md` §7 | ① 版本读面注记与 R6-b 对齐（资产级非 ACTIVE 授权集）；② **ARCHIVED 运营语义补实**：`HIDDEN = 临时下架/可恢复` · `ARCHIVED = 长期退役/停止维护`（本批「恢复」动作的判据依据） |

### 9.7 收尾回填项（本批遗留的「写数字」动作，全部用**实测**）

> **v1.7a 追加（F27/F30 纪律）**：口径变更后须做**全文散点扫**（`grep` 旧称：列数 / 段集合 / 菜单 / Task 区间 / 断言区间），
> 并把扫描结果（命中处数 + 处置）回填本节 —— 依据 = §11.5 揭示的 20 处散点漏改。
>
> **v1.23 追加纪律（F76）**：**行数类数字必须在提交前重跑实测回填**（`bun docs/smoke/scripts/m4b4-measure.ts`）—— 与本批 F26 / F76 两次「行数过期」同源；
> **v1.22 散点扫记录（2026-09-18 · T11-e · 诚实记账）**：⚠️ **本轮首稿漏做散点扫**（补档轮只写新内容、未扫「本轮变更的口径」）⇒ 用户「检查并打分」轮换靶抓出：
> 模式 = `零 diff|36/36|G1–G19|G1-G19|53 PASS|60 PASS`，范围 = 批 design / 批 plan / 主 design / `docs/00` / 证据 **五份全文**。
> 命中 **11 处需改**（**F74 契约 4 处**：本文件 §9.1 硬约束 + §9.7 本行 + 批 plan T3 步骤 + 证据 §3 行；**F75 数字 7 处**：本文件 §9.1 + G14 ·
> 批 plan T7/T11/T12 断言 + §2 Task 总览 + **§6 R1 风险信号** + 证据 §8），其余为**日期戳历史留痕**（修订行 / T11 收尾记录）不改。
> **教训**：补档轮 = 「写新内容 + **扫变更口径**」两步，缺第二步 ⇒ 契约/数字双面散点。
> **v1.8 散点扫记录（2026-09-18 · 首次按该纪律执行）**：模式 = `M4-star|依赖 star 批|未落地不渲染|T1–T14|G1–G15|9.66`，
> 范围 = 本批 design / 本批 plan / 主 design / `docs/00` / 证据文件 **五份全文**。
> 命中 **13 处需改**，逐处处置：批 design 3 处（出口件口径 G1–G19 · §11.1/§11.3「现行分」改指 §11.6 · §2.1d 净结果表补 star 行）；
> 批 plan 5 处（T11 行 G/T 区间 · T11 步骤 2 · 步骤① · 落地记录 · §8.2 完整性依据）；主 design 2 处（§2.3 登记表 M4b-4 行
> 分数/件表/Task 区间 · 头部 v1.51 块的「star 前置」表述压缩为「已被 v1.52 取代」）；证据文件 1 处（star ⬜ 项 ⇒ 依赖消解）+ 其余 2 处（§5 造数、门户零回归口径随件表联动）。
> **残余命中 3 处均为有意保留**（v1.8 头部对「降级口径作废」的说明 · §11.4 历史维度表 · 批 plan §8 初稿表）。
>
> **执行期收尾回填记录（2026-09-18 · T11）**：本节 ①–⑥ 逐条执行 —— ① 主 design §11 **键数实测回填**（**323 键 / 12 组**）② 主 design §2.3 登记表本批行 → **✅ 五件已执行** ③ `docs/00` §5 M4b-4 行 → **✅** ④ 本文档 §6 键表总数（`assets` **79** / `errors` **35**）⑤ **D2/D3 订正**（§12 线框去「含2隐藏」· §7.3 引用改与 U4 一致）⑥ **件表计数回写**（新建 **16** / 改造 **19** + 3 文档 —— §3.1/§3.2 已同步）。证据 = `docs/smoke/2026-09-18-m4b4-personal-b.md`。

> **v1.9 散点扫记录（抽屉退役）**：模式 = `AssetDrawer|ScanEye|开抽屉|抽屉四段|抽屉纯预览`，五份全文。
> 命中 **9 处需改**，逐处处置：批 design 3 处（§4.2 操作列 cell「`Eye` 真链接直跳」· §4.5 组件树 · §2.1d 净结果表操作列行加「v1.9 最终」标注）·
> 批 plan 5 处（T16 目标表去「抽屉统计」· **T7 步骤 5 行菜单作废** · **T7 步骤 8 接入抽屉作废** · T9 步骤 1 去抽屉键段 · T16 步骤 4 抽屉统计行作废）·
> 主 design 1 处（控制台规划树去 `AssetDrawer.tsx`）。**残余命中均为有意保留**：§2.1c/§2.1d 的 R 表（历史过程）、§11.x 历轮维度表、
> 各文档修订记录、以及 `console/Drawer` **件本身**的视觉/真值条目（件保留、本批不用）。

1. 主 design **§11 i18n 键数**：回填实测值（现状为 M4a 期史实值，§1.2 #11）
2. 主 design **§2.3 批件登记表**：回填本批 design/plan 实际文件名 + 版本 + 状态 + 出口五件
3. `docs/00` **§5 M4b-4 行**：状态 ⬜ → 🔵 → ✅（按批间门五件）
4. 本文档 **§6 键表总数**：脚本实测回填（Q10 D）
5. **主 design 文档缺陷订正（§2.1c 条① D2/D3 登记项）**：§12 `/dashboard` 线框去掉 stale 的「含2隐藏」副文案；
   §7.3:624「与线框『含 N 隐藏』一致」改为与 U4 拍板一致（**省略副文案**）
6. **件表追加回写**：`api/audit.ts`（新建）· `api/reviews.ts` 队列函数（改造）—— 同步主 design §2.3 登记表与 `docs/00` §5 的件规格计数

## 10. 引用文件清单

**代码（本批改动面 —— 读/改均以这些为准）**

| 层 | 文件 |
|----|------|
| server 路由 | `http/me.ts`（新）· `http/asset-item.ts`（新）· `http/assets.ts`（`:111`/`:163-175` 改 · `:255-290` 参照）· `app.ts`（挂载） |
| server 服务 | `assets/service.ts`（`:30-38` 接口 · `:173-242` 查询）· `assets/version-read.ts`（版本级授权参照）· `assets/manage.ts`（`canManageAsset` 同源）· `labels/service.ts`（`:573` `labelsOfAsset`） |
| server 测试 | `http/assets.test.ts`（`:418`/`:844-857` 改 · `:442-450`/`:694` 保留）· `http/me.test.ts`（新）· `http/download.test.ts:212` · `http/stats.test.ts`（保留） |
| web 页面 | `pages/Dashboard.tsx`（改）· `pages/Assets.tsx`（新）· `main.tsx`（路由 + DEV_BATCH） |
| web 件 | ~~`components/console/AssetDrawer.tsx`（新）~~ **v1.9 取消** · `console/{DataTable,Drawer,ConfirmDialog,StatusPill,FilterBar,PageHeader}`（复用）· `hooks/useMarketQuery.ts`（扩可选参数）· `api/me.ts`（新）· `i18n/zh.ts` + `en.ts` |
| 脚本 | `docs/smoke/scripts/m4b4-seed-assets.ts`（新）· `m4b4-personal-b-dogfood.ts`（新）· `m4a-dogfood.ts`/`m4a-chain-smoke.ts`/`doc-audit.ts`（回归） |

**文档（引用不复制）**

- 主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.1 R6/R6-a/R6-b · §2.3 · §2.4 U4/U5/U6 · §4 · §5.1/§5.2 · §6.2 · §7.1 · §7.2 · §7.3 · §8 · §9 · §10.1 · §11 · §12）
- 规范 `docs/05-identity-access.md` §6.4 · `docs/08-data-model.md` §7 · `docs/06-*.md`（标签挂载权限）· `docs/07-i18n-conventions.md` §3
- 视觉 SSOT：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（引用不复制）
- 追踪表：`docs/00-product-direction.md` §5/§7

## 11. 8 维自检

### 11.1 复评（2026-09-18 · 门禁 = 8 维 ≥9，口径 = 标准 4 维 + 深度 4 维）

> ⚠️ **历史快照**（v1.1 口径）：本节依据列中的「件表（新建 9 / 改造 11）」「四段抽屉」「6 列」等为**当时值**，
> **现行值以 §3 件表（新建 12 / 改造 11+2 文档）· §4.2（9 列）· §4.3（纯预览抽屉）为准**（v1.7 原型评审收口后）。

> 初评 **9.63**（当时含 1 项未闭合决策 F1）→ 用户拍板 **Q13 = A** 后**复评 9.69**
> ⚠️ **该分已于 v1.2 换靶复核后撤回**（窄口径产物）—— **§11.3 报 9.66、§11.5 重报 9.66、§11.6 现行 = 9.68**；delta 见本节末。

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.7** | 12 段骨架齐（对齐 M4b-3）· 决策齐（**Q1–Q13 全闭合**）· 件表（新建 **9** / 改造 **11**）· 服务端改动点逐条（含现状与改法）· 测试面 6 组 · i18n 逐键表 · 验证口径（门禁 / dogfood G1–G13 / 出口件 / 造数 / 规范同步 / 收尾回填）齐 |
| 标准 2 准确性 | **9.6** | §1.2 **十四条真码实测**（`file:line` + `wc -l` + 脚本实测键数）· 契约逐条对主 design §7.1 · i18n 基线 **222 键 / 11 组**（脚本实测，双向差集 0）· 服务端改动**贴现状代码**（`service.ts:30-38`/`:177`/`:242`） |
| 标准 3 一致性 | **9.7** | 与主 design §2.1/§2.4/**§7.1/§7.2/§7.3**/§8/§10.1/§11/§12 逐条对齐；与 `docs/00` §5 M4b-4 行一致（R6 + R6-b 两处）；命名合规（`YYYY-MM-DD-m4b4-<主题>-design.md`，功能自描述）；与 M4b-3 批 design 同构 |
| 标准 4 可用性 | **9.7** | 实现者**照抄零二次决策**：列集合 / 抽屉四段每段内容与禁用真值 / 请求口径（3 vs 1）/ 键名 / 服务端改动骨架（含既有接口形状与改法）/ 测试面全部定死；**无待拍板项**（Q13 闭合后连 PRIVILEGED 路径也给了确定实现与错误码） |
| 深度 1 追溯性 | **10** | 每条现状带 `file:line`；每个决策带 Q 编号 + 日期 + 来源（「按推荐来」）；规范同步带 `05:187`/`:161` 行号；测试影响带到行 |
| 深度 2 反证 | **9.4** | 含向后兼容论证（4 行表）· 非目标清单 · Q5 夹缝登记 · Q8 C「不加 `createdBy`」登记 · 「提审入口」缺口显式登记；**扣分 = 未展开被否决选项的对照**（按用户口径「被否决方案不进文档」，**有意**不复述 ⇒ 如实扣分） |
| 深度 3 边界/风险 | **9.7** | R6-b 边界（**集外仍 404** 保持）· 参数化回归风险 + **回归锁断言** · 删除禁用「闪变」防护 + 服务端兜底 · 权限降级夹缝 · 加载态保持禁用 · 旧语义被替换点（测试注释腐化）· 零迁移 · 未登录 / 降级 / 403 三类分支 · **Q13 缺口已登记并明确归属 M4b-6** |
| 深度 4 维护性 | **9.6** | 引用不复制（主 design / 规范 / 线框 / 视觉全走指针）· 键表可直接落码 · **收尾回填项显式列出（§9.7）** · 修订记录 + 自检段齐 · 与主 design 的双向查询点（§2.3 登记表）在 §9.7 挂钩 |

**v1.1 均分 = 9.69** ⇒ 达门 ✅（9.7+9.6+9.7+9.7+10+9.4+9.8+9.6 = 77.5 ÷ 8）
⚠️ **窄口径自报值，已撤回** —— **现行分见 §11.6 = 9.68**（§11.3/§11.5 的 9.66 为历轮值）。

**复评 delta**：完整性 9.5 → **9.7**（Q13 决策闭合）· 可用性 9.5 → **9.7**（零待拍板项）·
边界 9.7 → **9.8**（Q13 缺口登记 + 服务端兜底路径明确）；准确性 / 一致性 / 追溯性 / 反证 / 维护性**不变**
（**反证如实保持 9.4**：被否决选项按用户口径不入档 ⇒ 不因本轮而升）。

### 11.2 自检发现与处置（首稿自检当场处置 6 项 + 未决 1 项）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **F1** | 🔴 | §4.3 段② · §2.1 Q7 ③ | **「PRIVILEGED 标签的 × 禁用」在现状契约下不可判定**：chips 来源 = 资产详情 `labels[]`，而 `labelsOfAsset` 返回 **`string[]`（仅 slug，不含 `type`）**（`labels/service.ts:573`）⇒ UI 无从知道哪个已挂标签是 PRIVILEGED | ✅ **已闭合（Q13 = A，2026-09-18 用户拍板）**：本批不做特判（× 一律可点 · 服务端拒绝 ⇒ toast 码文案）；**缺口登记 → M4b-6** —— ⚠️ **v1.7 更新**：**Q14 = B** 后 `labels` 携带 `type`（§5.1 ⑦）⇒ 该缺口**技术上已可在本批闭合**（非超管 ⇒ PRIVILEGED 的 × 可精确「禁用 + 说明」）；本批**默认仍按 Q13 = A 口径**，是否升级为精确禁用 **待用户拍板**（登记） |
| F2 | 🔴 | §5.1 ③ | 漏写 **`loadAssetItemMeta` 批注入**步骤 ⇒ `latestVersion`/`latestName` 全 `null`，六列「资产名」「版本」列退化 | ✅ **已补**（§5.1 ③ 第 3 步 + 写明漏掉的后果） |
| F3 | 🔴 | 头部 Status | 首稿误写「**定稿** + 用户已批准」（**未发生的事实**） | ✅ **已改**「待用户确认（初评）」 |
| F4 | 🟡 | §5.1 ① | 原写「新建 `ListAssetsOptions`」，实为**既有接口**（`service.ts:30-38`，`limit`/`offset` **必填**）⇒ 应「增量扩两字段」 | ✅ **已改**并补条件组装 / 返回值口径（裸 rows） |
| F5 | 🟡 | §6.3 | 「本批后 34 键」是**推算值**（28 实测 + 新增）却按已证口吻写 | ✅ **已标**「实现期实测回填，不视为已证值」 |
| F6 | 🟡 | §5.2 | 非目标清单漏「me 面不暴露 `type`/`label` 过滤」⇒ 最小面未声明 | ✅ **已补** |
| F7 | ⚪ | §4.1 | 三卡取数未写明「我的资产卡 `total` 口径 = **我名下全集**（含 HIDDEN/ARCHIVED）」 | ✅ **已补**（数据源列显式标注） |
| **F8** | 🟡 | §6.3 | **`label.access_denied` 未在 `errors` 组**（实测：`errors` 现 **28 键中无任何 `label.*` 码**）⇒ Q13 = A 的服务端兜底路径**无法本地化 toast** | ✅ **已补**（`errors` +7 码；并回改 §2.1 Q10 C · §3.2 #7 · §6.3 · §8 四处计数口径） |

**F1 处置后的登记（Q13 = A）**

- **本批口径**：chips 的 × **一律可点**；非超管移除 PRIVILEGED 标签 ⇒ 服务端 **`label.access_denied`** ⇒ **toast 显示码文案**
- **缺口与归属**：精确的「× 禁用 + 说明」需资产详情返回标签 `type` —— **登记 → M4b-6**（标签治理批 · 标签面契约的天然归属批）
- **依据**：本批「不动后端优先」；为单个禁用态做契约扩张收益不成比例
- **连带**：本项引入 `errors` 补码 **1 个**（`label.access_denied`）⇒ §6.3 由 +6 改 **+7**

### 11.3 换靶复核（v1.2 · 2026-09-18 —— **不重复上轮角度**）

> 换靶角度：**⑥ 引用语义回读**（`file:line` 打印真码逐条比对）· **⑪ 机制声明的实测复核**（件 props 是否真支持我声明的用法）·
> **⑦ 同一量跨节对照** · **跨批契约承接检查**（本仓既有批已修的缺陷，本批是否复现）。**不做**上轮已做的自检项。

| # | 严重度 | 位置 | 新发现 | 处置 |
|---|:------:|------|--------|------|
| **F9** | 🟡 | §2.3 分页行 · §4.2 | **跨批契约漏承接**：`Pagination` 须**仅 `total > limit` 时渲染**（M4b-3 批 design §4.4.1 口径；该「1 / 1 空控件」缺陷已在 M4b-3 T6 修过）—— 本批原稿未承接 ⇒ 会复现 | ✅ **已补**（§2.3 分页行标 ★ + §4.2 指向唯一口径） |
| **F10** | 🟡 | §2.3 分页行 · §4.2 | **双语义换算点未写明**：组件 props 吃 `offset`，URL 用 `?page=`（实测 `Pagination.tsx:33-41`）—— 原稿只写「换算」，实现者易直传 `page` | ✅ **已补**（写出公式 + 先例 `CenterPage.tsx:238-240`） |
| **F11** | 🟡 | §5.1 ③ | **me 面 schema 上限口径缺失**：公开面 `listQuerySchema` 实为 `limit 1..100 default 20` · `offset ≥0` · `q` trim 1..**100**（`http/assets.ts:75-83`）—— 原稿只写默认值 | ✅ **已补**（逐项对齐上限；并注明 `request.invalid` 为已落码 `validate/base.ts:32`） |
| **F12** | 🟡 | §2.3 官方件表 | **件能力声明失真**：`console/Drawer` **无宽度 prop**、560 已**硬编码在件内**（`Drawer.tsx:40`）—— 原稿写「覆盖为 `sm:max-w-[560px]`」会误导实现者去改件 | ✅ **已改**（标明「零改动，勿再覆盖」） |
| **F13** | ⚪ | §5.1 ③ | `requireAuth()` 落点未引（实现者需知 `principal` 从哪来） | ✅ **已补**（`http/auth-middleware.ts:96`） |

**换靶实测通过项**（非缺陷，留作证据）：`request.invalid` 为已落码且 `errors` 组有文案 · `assetItem` 14 字段含 `type`/`status`/`latestVersion` ⇒ 六列数据源齐 ·
`labelsOfAsset` 返 `string[]`（F1/Q13 的判定前提**复核成立**）· `DataTable` 的 `rowActions(row)` / `FilterBar` 的 `statusOptions`+`q` / `ConfirmDialog` 的 `requireReason` 三件 props 与用法声明**逐项吻合**。

**复评（换靶口径 · 修前 → 修后）**

| 维度 | 修前 | 修后 | 依据 |
|------|:----:|:----:|------|
| 标准 1 完整性 | 9.7 | **9.7** | 13 项 findings 全闭合后无已知缺口 |
| 标准 2 准确性 | 9.5 | **9.6** | `Drawer` 宽度等件能力声明按真码订正 |
| 标准 3 一致性 | 9.5 | **9.6** | 补承接 M4b-3 的 `Pagination` 渲染口径 |
| 标准 4 可用性 | 9.6 | **9.7** | 换算公式 + 渲染条件定死 ⇒ 实现零猜测 |
| 深度 1 追溯性 | 9.9 | **10** | 补 `requireAuth` 落点 |
| 深度 2 反证 | 9.4 | **9.4** | 不变（被否决选项按用户口径不入档） |
| 深度 3 边界/风险 | 9.6 | **9.7** | 空控件边界已承接 |
| 深度 4 维护性 | 9.6 | **9.6** | 不变 |
| **均分** | **9.60** | **9.66** | ≥9 ⇒ **达门** ✅ |

### 11.4 原型轮换靶复核（v1.7 · 2026-09-18 —— **角度 = 原型可点性 / 权限矩阵 / 依赖完整性**）

> 换靶口径（同 v1.2）：**不重复上轮角度**。本轮检验的是「**原型做出来后，规格是否自洽**」——
> 即：UI 已按 R1–R23 改过，文字规格有没有跟上；跨面依赖有没有写全；权限矩阵有没有对着真码。

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:------:|------|------|------|
| **F15** | 🟡 | §4.4 | 「危险操作 → `ConfirmDialog`」的**适用面**随管理区迁移后未更新（读起来仍像抽屉内动作） | ✅ **已改**：明确「确认框统一出自详情页管理区（§4.6），抽屉内零确认框」 |
| **F21** | 🟡 | §4.6 | **卡层显隐**与**动作层显隐**混为一谈 ⇒ 「访客看到一张空管理卡」这种边界未定义 | ✅ **已补**：整卡无可见动作 ⇒ **整卡不渲染**；仅「有可见动作 + 个别禁用」才用「禁用 + `title`」形态；`admin.noPermission` 仅用于降级场景 |
| **F22** | 🔴 | §5.1 ⑦ | 只写了 `http/me.ts` 侧落点，**漏公开详情面调用点**（`http/assets.ts:294` 一带）⇒ D7 会在「详情面仍返 slug」时复发 | ✅ **已补**第 5 落点（详情路由传入 labels） |
| **F23** | 🟡 | §4.6 | star 未落地时三处 UI 的**降级口径**未定 ⇒ 可能上线恒为 0 的「死数」 | ✅ **已补**：star 批未落地 ⇒ **三处一律不渲染**（不显示死数）；落地后按 §4.2/§4.3/§4.6 补回 |
| **F24** | ⚪ | `docs/smoke/2026-09-18-m4b4-personal-b.md` | 证据文件缺「**原型评审**」节（R1–R23 结论 + 用户实机确认记录） | ✅ **已补**（该文件新增 §原型评审） |
| **F25** | ⚪ | §3.1/§3.2 | 件表新增 4 件（`AssetAdminCard` / `LabelCard` / `asset-stats` / `asset-permissions`）后，**与 plan Task 的一一映射**尚未同步 | ✅ **已同步**（批 plan **v0.7** 新增 Task 12–14 覆盖详情页改造与共用件） |

**顺带实证（反证 3 条 · 防误报）**
- `labels` 元素类型 `string → object` 的仓内消费者 **仅 1 处**（`AssetDetail.tsx:200-208`，正被本批修）；`apps/cli` 与 `packages/protocol` **0 命中**（grep 实证）
- `SkillSummaryResponse` **无 `labels` 字段**（skillhub 列表不带标签）⇒ 「列表带标签」属**有意扩展**，非对齐项
- skillhub `skill` 表 **含 `star_count integer` 冗余列**（+ `download_count` / `rating_*` / `subscription_count`）⇒ 「star 用冗余列」有**自有规范 + 对标实现 双证**

**维度复评（v1.7）**

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.7** | 新增 §2.1d（R1–R23 + 依赖登记）· §4.6（管理区规格 + 权限矩阵）· §5.1 ⑦（labels 形状）· §6.4（market 补键）· §9.3 G1–G15 |
| 标准 2 准确性 | **9.7** | 权限矩阵**逐条对服务端真码守卫**（`PATCH/status` `assertManageable` · `canYank` 仅 ADMIN · 删版本状态门分治）· skillhub 对标实测（`SkillSummaryResponse` / `SkillLabelDto` / `skill.star_count`）· 兼容面 grep 实证 |
| 标准 3 一致性 | **9.7** | 列表 9 列 / 抽屉纯预览 / 详情页管理区**三处口径互指且无重复定义**；作废项逐条留痕（`⋯` 菜单 · 共享动作集 · 四段抽屉 · `menu.*` 键） |
| 标准 4 可用性 | **9.6** | 实现者照抄：列集合 / 抽屉段 / 管理区矩阵 / 键表全定死；**扣分 = 2 项留待拍板**（动作层显隐取「渲染 or 禁用」· PRIVILEGED 是否升级精确禁用）+ 1 项外部依赖（star 批） |
| 深度 1 追溯性 | **10** | 每条留 R 编号 + 用户原话；对标结论带文件与字段名；权限矩阵带端点与守卫函数名 |
| 深度 2 反证 | **9.5** | 升 0.1：本轮新增 3 条**反证实证**（消费者 grep · skillhub 负例 · 冗余列正例）；被否决选项仍按用户口径**不入档** |
| 深度 3 边界/风险 | **9.7** | 新增边界：整卡显隐 · star 降级 · 兼容面收敛 · 具名依赖（star 批 / M4b-8 / M4b-5）逐条登记 |
| 深度 4 维护性 | **9.6** | 段名沿革与作废留痕可追溯；共用件（`LabelCard` / `asset-stats`）防三处漂移；§6 键表可直接落码 |

**v1.7 维度表实测均分 = 9.6875 ≈ 9.69**（9.7+9.7+9.7+9.6+10+9.5+9.7+9.6 = 77.5 ÷ 8）⚠️ **本条自报 9.66 系沿用旧值的算错**
（未自算）⇒ 已于 §11.5 换靶轮**撤回该值**并重新打分（现行分见 §11.5）

### 11.5 落档一致性换靶复核（v1.7a · 2026-09-18 —— **角度 = 事实一致性（行数 / 行号 / 跨文档数字）**）

> 换靶口径（同前）：**不重复上轮角度**。本轮只问两件事：① 文档里的**可实测事实**（文件行数、`file:line` 引用、跨文档数字）
> 是否与真码一致；② **同一口径**在五份文档里是否处处一致（主口径改了 ⇒ 正文散点有没有跟上）。

| # | 严重度 | 位置 | 新发现（实测） | 处置 |
|---|:------:|------|---------------|------|
| **F26** | 🟡 | §1.2 可复用件表 | **`DataTable` 行数过期**：文档写 `133 行`，`wc -l` 实测 **139**（本批加性 prop 已落 ⇒ 净 +6）。同批核对的其余 5 项（`assets.ts` 828 · `service.ts` 243 · `Dashboard.tsx` 73 · `useMarketQuery.ts` 104 · `AssetDetail.tsx` 287）**全部吻合** ✓ | ✅ **已修**（改 `139`，并注明含本批加性 prop） |
| **F27** | 🔴 | 批 design §1.3/§2.2/§7 · 批 plan §1/T7/T8/T9/T11/§8 | **正文散点旧口径 20 处**（「六列」「四段抽屉/状态治理·标签挂载·版本管理·危险区」「`⋯` 行菜单」「T1-T11」「G1–G13」）—— 主口径已在 §4.2/§4.3/§4.6 改写，**但散点未跟** ⇒ 实现者按 §1.3/T7 照抄会**做回旧形态** | ✅ **已修（14 处文档编辑）**：批 design 6 处 + 批 plan 7 处（**含 T7 步骤 1「六列→九列」与 T8 步骤 9 行菜单作废**）+ 证据文件 1 处；§2.1c/§11.1 等**历史节**加「现行口径见 §4.2/§4.3/§4.6」指针，**不追改历史** |
| **F28** | 🔴 | 主 design §2.3 批件登记表 | M4b-4 **两行**仍写 `v0.1 / T1-T11 / 件规格（新建 9）/ G1–G13`、「我的资产六列」「抽屉四段」⇒ **登记表是全批唯一索引面**，错值影响面最大 | ✅ **已修**（`v0.7 / T1–T14 / 新建 12 / 改造 11+2 文档 / G1–G15` · 补「详情页 owner 管理区」「`labels` 结构体」）+ 头部删 v1.49 历史行（头部口径 1-2 版） |
| **F29** | ⚪ | 证据文件 §3/§8 | G6 仍写「六列齐」· 出口件② 仍写 `T1-T11` | ✅ **已修**（九列 / T1–T14） |
| **F30** | 🟡 | §11.4 | **均分算错**：维度表 8 项实为 77.5 ÷ 8 = **9.6875 ≈ 9.69**，却自报 **9.66**（沿用旧值未自算） | ✅ **已修 + 撤回**：§11.4 末段订正为 9.69 并声明撤回；**现行分按本轮重新打分 = 9.66（依据不同，见下）** |

**换靶实测通过项（非缺陷 · 留作证据）**：`file:line` 引用 **5/5 吻合** —— `assets/manage.ts:19`（`canManageAsset` 定义）·
`http/labels.ts:66`（`accept-language` 首段）· `AssetDetail.tsx:200-202`（labels chips）· `http/assets.ts:291-294`（详情路由 +
`assertAssetReadable` 调用点）· `labels/service.ts:573`（`labelsOfAsset` 返 `string[]`）。

**维度复评（v1.7a · 现行）**

| 维度 | 分数 | 依据（含本轮变动） |
|------|:----:|------|
| 标准 1 完整性 | **9.7** | 段骨架 / 决策 / 件表 / 服务端 / 键表 / 验证口径齐 |
| 标准 2 准确性 | **9.7** | 本轮行数 6 项核对（1 项过期已修）+ 行号 5/5 吻合 + 对标实测 |
| 标准 3 一致性 | **9.6** ↓ | **本轮暴露**：主口径改写后正文散点大面积未跟（20 处）—— 修后虽一致，**同类风险未机制化** ⇒ 如实下调 9.7 → 9.6 |
| 标准 4 可用性 | **9.6** | 实现指令（T7/T8）曾含旧口径 ⇒ 已修；仍 2 项待拍板 + star 依赖 |
| 深度 1 追溯性 | **10** | 每条带 R 编号 / Q 编号 / `file:line` |
| 深度 2 反证 | **9.5** | 3 条反证实证；被否决选项按用户口径不入档 |
| 深度 3 边界/风险 | **9.7** | 具名依赖 + 降级口径 + 卡层/动作层显隐边界 |
| 深度 4 维护性 | **9.5** ↓ | **本轮暴露流程缺陷**：口径变更未做「主口径 + 全文散点扫」⇒ 下调并补纪律（见下） |
| **均分** | **9.66** | 9.7+9.7+9.6+9.6+10+9.5+9.7+9.5 = 77.3 ÷ 8 = **9.6625 ≈ 9.66** ⇒ ≥9 **达门** ✅ |

> **旧值撤回声明**：v1.7 自报 **9.66**（沿用 v1.2 值、未自算）与中间值 **9.69**（算错的维度表和）
> **一并撤回**；**现行 9.66 由本轮 8 维表独立推出**（一致性/维护性各下调 0.1）—— 数值同而**依据不同**，如实记录。

**补的纪律（本批执行期适用）**：**口径变更 = 主口径改写 + 全文散点扫**（`grep` 旧称全仓，含 plan T 步骤 / §1 目标表 / §7 总览 /
证据文件 / 跨文档登记表），并把扫描结果写进收尾回填（§9.7）。

### 11.6 需求变更后复评（v1.8 · 2026-09-18 —— **star 最小集并入**）

> 变更来源：用户 2026-09-18「不要在单独开 M4-star 了，看看放在 M4b 行不行」→ **确认并入 M4b-4**。
> 本轮检验：**容量**是否已被正确吸收（批界 / 件表 / 契约 / 键表 / dogfood / 造数 / 跨文档 七处同扫）。

| 项 | 结论 |
|----|------|
| 批界 | §1.3 补 star 最小集条目 ⇒ 批名语义 = 「个人面 + 资产管理 + **star 最小集**」复合批（**已如实写明**） |
| 契约完整性 | §5.1 ⑧ 覆盖：表 / 唯一约束 / 冗余列 / 两端点语义与幂等 / 权限（**任意登录用户**，不受 `canManageAsset`）/ 审计（不写）/ 限流（不加）/ 三处读面形状 / 计数维护规则 / 未登录交互 / 协议 + `08` 规范同步 |
| 依赖闭环 | §2.1d 依赖登记 star 行 ⇒ **已并入**；§4.2/§4.3/§4.6 降级口径 ⇒ **作废**（无外部前置批） |
| 验证面 | dogfood **G15–G19**（幂等 / `starredByMe` 语义 / 三处读面一致 / 未登录不发写请求）· 门户零回归口径 **36 → 38** |
| 造数 | §9.5 补 star 行（他人收藏 1 + 我收藏 1 ⇒ 覆盖 `starredByMe=false` 而 `starCount=1`） |
| 迁移 | 本批性质由「零迁移」→ **含 1 次迁移**（`asset_star` + `star_count`）；迁移文件入库，`meta/**` 沿用既有 format 排除 |

**维度复评（v1.8）**

| 维度 | 分数 | 依据 |
|------|:----:|------|
| 标准 1 完整性 | **9.7** | star 契约六要素齐（数据 / 端点 / 权限 / 审计 / 读面 / 维护）+ 验证与造数同步 |
| 标准 2 准确性 | **9.7** | 计数口径**双证**（`08` 范式 + skillhub `skill.star_count` 实测）· 端点语义与幂等可断言 |
| 标准 3 一致性 | **9.6** | 七处同扫（批界 / 件表 / i18n / dogfood / 造数 / §4.x / 依赖登记）；**保持 9.6**（散点纪律刚补、未经完整周期验证 ⇒ 不虚升） |
| 标准 4 可用性 | **9.7** | star 契约照抄即实现（表 DDL / 端点形状 / 计数规则 / 交互全定死） |
| 深度 1 追溯性 | **10** | 变更来源（用户原话）+ 依据（规范 / 对标）+ 落点逐条 |
| 深度 2 反证 | **9.5** | 保持（「并入 vs 独立批」的取舍理由已记 §2.1d 依赖登记行） |
| 深度 3 边界/风险 | **9.7** | 新增边界：未登录不发写请求 · 幂等不重复计数 · 他人收藏不影响我的 `starredByMe` · 非 ACTIVE 走 `assertAssetReadable` 404 |
| 深度 4 维护性 | **9.5** | 保持（散点纪律见效待观察） |
| **均分** | **9.68** | 9.7+9.7+9.6+9.7+10+9.5+9.7+9.5 = 77.4 ÷ 8 = **9.675 ≈ 9.68** ⇒ ≥9 **达门** ✅ |

### 11.7 承重件退役后复核（v1.9 · 2026-09-18 —— **角度 = 承重件退役的连锁完整性**）

> 变更来源：用户 2026-09-18「我们简单一点，这个抽屉不做了，取消，一点预览，直接进入完整详情」。
> 本轮检验：**一个承重件（抽屉）退役**后，其**五类连锁面**是否全部跟到位 —— 件表 / i18n 键 / dogfood 断言 /
> 组件树 / 跨文档（主 design 线框 · 批 plan Task）。

| # | 严重度 | 连锁面 | 检验结果 | 处置 |
|---|:------:|------|---------|------|
| **F31** | 🟡 | 件表 | 抽屉件在 §3.1 计 1 件（15 → **14**） | ✅ **已改**（并留痕：~~AssetDrawer~~ 已取消） |
| **F32** | 🟡 | i18n 键表 | **6 键**成为孤儿（`drawer.title` / `section.previewHint` / `desc.*` ×2 / `stat.*` ×2） | ✅ **已删**；`section.labels`（标签+-）**保留**（详情页标签卡复用）并在表内注明 |
| **F33** | 🟡 | dogfood | G7/G8 是**抽屉专属断言**（打开即 1 请求 / 工具行出口 href） | ✅ **已改写**：G7 = 操作列真链接 + 点击后 `pathname` + **全站无 sheet 反证**；G8 = 详情页为唯一视图 |
| **F34** | ⚪ | 组件树 | §4.5 仍画 `AssetDrawer` 子树 | ✅ **已改**（改为「无抽屉 · 操作列直跳」） |
| **F35** | 🔴 | 跨面缺口 | 抽屉退役后，**「版本列表首屏 20 / 加载更多 / 行内容」的原 Q8 E 口径**失去宿主（原属抽屉段③）—— 未声明归属 ⇒ 实现者可能去详情页**重建**该列表 | ✅ **已补**（§4.6 明确：版本 Tab 列表**沿用 M4a 既有渲染、本批只增行内动作**）—— 这是本轮**唯一实质缺口**，靠**追查原口径宿主**发现 |

**反证通过项（留证）**：抽屉退役**未削弱**任何安全口径 —— 危险操作仍**集中**在详情页管理区（对齐主 design §9「危险操作集中确认」）；
列表**零管理动作**（`grep` 件表与 §4.2 逐列确认）；`star` 契约（§5.1 ⑧）与 `labels` 结构体（§5.1 ⑦）**不受影响**（均为详情面/读面能力）。

**维度复评（v1.9）**

| 维度 | 分数 | 依据 |
|------|:----:|------|
| 标准 1 完整性 | **9.7** | 抽屉取消的**五类连锁面**齐（件表/i18n/dogfood/组件树/跨文档）—— 且本轮发现并补了原口径宿主缺口（F35） |
| 标准 2 准确性 | **9.7** | 原型实测：操作列 = 真链接（`<a>`）· 点击后 `pathname=/assets/<slug>` · 全站无 `[data-slot="sheet-content"]` |
| 标准 3 一致性 | **9.7** ↑ | 口径收敛为「列表 ↔ 详情零中间态」；作废留痕逐条（四段 → 纯预览 → 取消）；`section.labels` 复用性已注明 |
| 标准 4 可用性 | **9.7** | 实现面**更小**（少 1 件 + 6 键 + 一套交互态）且边界更硬（点即跳，无中间态语义） |
| 深度 1 追溯性 | **10** | 变更带用户原话 + 逐面处置 + 实测值 |
| 深度 2 反证 | **9.5** | 新增反证：退役未削弱安全口径（危险操作仍集中）· 列表零管理动作 |
| 深度 3 边界/风险 | **9.7** | 新增边界：版本列表规格归 M4a（防重建）· 全站无 sheet 反证 · 假 slug 下详情落 404（原型环境说明） |
| 深度 4 维护性 | **9.5** | 保持（散点纪律刚见效一周期，未满） |
| **均分** | **9.69** | 9.7+9.7+9.7+9.7+10+9.5+9.7+9.5 = **77.5 ÷ 8 = 9.6875 ≈ 9.69** ⇒ ≥9 **达门** ✅ |

### 11.8 T15 实现期发现订正（v1.10 · 2026-09-18 —— **角度 = 设计声明的实测复核**）

> 触发：实现 T15 时逐条核对设计落点，命中一条**机制声明失真**（同族问题在 §5.1 ⑦/⑧ 各一处）。

| # | 严重度 | 位置 | 设计声明 | 实测 | 处置 |
|---|:------:|------|---------|------|------|
| **F36** | 🟡 | §5.1 ⑦ 落点 1 · §5.1 ⑧ 末条 · 批 plan T14/T15/T16 | 「`packages/protocol` 增字段（**协议 = SSOT，先改**）」 | `packages/protocol/src` 只有 `agent/ mcp/ skill/ errors/ slug/ type` —— **无资产响应形状**；`AssetItem` 定义在 **`apps/web/src/api/types.ts:27`** | ✅ **已订正**：两处落点改指 `apps/web/src/api/types.ts`（**形状 SSOT 实际所在**），并注明「协议层本批零改动」；批 plan T14/T15/T16 的 Files/步骤同步（含 T15 类型列 `server + protocol` → **`server`**）|
| **F37** | ⚪ | 测试面 | —（实现期新增） | 9 用例覆盖幂等/语义/守卫，但**并发双向写入**与「用户删除级联」无用例 | 📌 **登记**：归 **T4**（服务端测试）补充；不阻塞 T15（结构保证已由 `UNIQUE` + 原子 `UPDATE` 提供） |

**反证通过项**：`.labels` / star 字段的仓内消费者 grep —— `apps/cli` 与 `packages/protocol` **0 命中**（两次独立实证），
⇒ 加性字段与 `labels` 形状升级的破坏面确为 0；本订正**不改变任何契约语义**，只改「类型放在哪里」。

**维度复评（v1.10）**：完整性 **9.7** · 准确性 **9.7**（「协议 SSOT」失真已修）· 一致性 **9.7** · 可用性 **9.7** ·
追溯 **10** · 反证 **9.5** · 边界 **9.7** · 维护性 **9.5** ⇒ **均分 9.69**（77.5 ÷ 8 = 9.6875 ≈ 9.69）

### 11.9 逐 Task 收口打分（2026-09-18 · 标准档 18 维 / 文档 15 维）

> 纪律补充（用户 2026-09-18 明确）：**每个 Task 收尾即自测 + 自检打分**，不留到批收尾。
> 本轮（T1–T5/T9/T10/T13 收口）逐 Task 打分，并抓出 **4 组实现期缺陷**（F38/F41/F42/F43）。

| Task | 档 | 均分 | 关键扣分（有据） |
|------|:--:|:--:|------|
| **T1** 抽件 + 参数化 | 代码 18 维 | **9.58** | C9 9.0（「14 字段」声明失真 —— F38）· B2 9.0（T1 自身无新断言，边界由 T4 覆盖）|
| **T2** R6-b 授权集 | 代码 18 维 | **9.71** | C9 9.0（调用点「6」vs 实测 8 —— F42）|
| **T3** `me` 端点 | 代码 18 维 | **9.70** | C9 9.0（同 F38 的字段数声明）|
| **T4** 服务端测试 | 代码 18 维 | **9.65** | B2 9.0（并发/级联用例缺 —— F37 已登记）|
| **T5** api 三件 + hook | 代码 18 维 | **9.62** | C5 8.5（web 包无测试基建 ⇒ 新行为**无自动化测试**）· B2 9.0 |
| **T9** i18n 键表 | 代码 18 维 | **9.42** | **A1/B1/C5 8.5**（**漏 3 键 —— F43 实现缺陷**：表 62 / 实现 59）|
| **T10** 规范同步 | 文档 15 维 | **9.56** | 反证 9.0（未逐条把规范行与真码守卫对照——只核了「与 canManageAsset 同集」）|
| **T13** `DataTable` prop | 代码 18 维 | **9.63** | C5 8.5（加性 prop 无单测；两消费点零回归靠既有套件）|
| **T15** star 服务端 | 代码 18 维 | **9.55** | 保持（§11.7 打分；B2 并发用例缺 · C9 已订正）|
| **T7** 我的资产列表页 | 代码 18 维 | **9.46** | **A1 9.0**（**未做认证态 E2E**：9 列/筛选/分页未在真会话实测——路由级已验证匿名重定向 + 0 JS 错误；完整 dogfood 归 **T11**）· **B2 9.0**（分页边界与 q 防抖竞态未 E2E）· **C5 8.5**（新页无自动化测试——web 包无测试基建）· C9 9.5（F46 已订正）|
| **T6** 工作台三卡 landing | 代码 18 维 | **9.43** | **A1 9.0**（**认证态 3 卡/请求数断言未跑**——需造数，归 T11 G2/G3；匿名归位已实测）· **B2 9.0**（空/零值/单卡态未 E2E）· **C5 8.5**（web 包无测试基建）· C8 9.5（过渡形态被替换，路由零改动）|
| **T16** star 前端接线 | 代码 18 维 | **9.41** | **A1 9.0**（未登录路径 CDP 实测 ✓；**登录态写路径/幂等未跑**——需造数）· **B2 9.0**（连点竞态未测）· **C8 9.3**（`AssetCard` DOM 结构调整 = 门户面改动，已复跑 dogfood 36/36）· **C5 8.5**（web 包无测试基建）|
| **T12** 详情页管理区 | 代码 18 维 | **9.43** | **A1 9.0**（认证四档 E2E 未跑——需造数，归 T11 G11/G12；匿名面 CDP 实测通过）· **B2 9.0**（并发与「上传者例外」面未测）· **C5 8.5**（web 包无测试基建 ⇒ 新行为无自动化测试——沿 T5/T7/T13 同款）· C9 9.3（批文档回填本轮回写）|
| **T14** `labels` 结构体 | 代码 18 维 | **9.47** | **A3/C8 9.0**（`string[] → object[]` 属**破坏性形状变更**——仓内消费者 1 处已同步、CLI/protocol 0 命中，外部面未评估）· **B2 9.0**（父标签不挂同资产时 `parentId` 解析批未测）· **C5 9.5**（N+1 无 SQL 计数断言）· **C9 9.5**（F44 已订正）|
| **T11-e** 门户视图切换 + 折叠搜索 | 代码 18 维 | **9.24**（提交前自检 · 文档未落档态）| **C9 文档 5.5**（本版落档前：T11-e 五处未写 ⇒ 最大扣分项）· **A1 9.3**（首版验证设计不严 ⇒ 4 处自伤返工：探针反引号截断 · hero 锚点错两次 · `pagination` 字段漏带 —— F70）· C5 9.3（web 零单测基建，既有 F66）· C3 9.0（产品层零可观测，既有）；加分面：官方件纪律（`Table` 零外观覆盖除 3 处必要 override）、零服务端改动、零新依赖、行为断言 16 条（G20×10 + G21×6）全绿 + `m4a` 零回归；**落档后重评见 §12 v1.22 行** |
| **T11-i B′**（侧栏一体搜索 · 官方 Combobox） | 代码 18 维 / 文档 8 维 | **9.40** / **9.41** | 代码：A **9.38** ×0.40（A2 9.6 · A4 9.0 = 无请求路径类处理）· B **9.38** ×0.30（**B2 9.2** = 列表限高依赖 nova 简写未生成 · 未做窄屏 Sheet 实跑）· C **9.45** ×0.30（C1 9.6 · C3 9.0 = 纯 UI 无可观测标记 · C5 9.6 = 新增 6 条断言 + 2 条真登录验证）｜文档：标准 4 **9.45** + 深度 4（跨平台 N/A 剔除）**9.2** = **9.41**（**边界覆盖 9.2** = 窄屏/超长列表未列边界）|
| **T11-i B″**（侧栏框样触发器 → 官方命令面板 · 同日回退定稿） | 代码 18 维 / 文档 8 维 | **9.48** / **9.45** | 代码：A **9.45** ×0.40（回退干净：件删 2 / 依赖撤 1 / i18n 复回 · 框样触发器**照官方站实测配方**，非手搓）· B **9.5** ×0.30 · C **9.5** ×0.30（**C6 9.7** 零迁移可回退 · **C8 9.6** 依赖归零无残留 -- 实测 `apps/web/package.json` 无 `@base-ui`）｜文档 **9.45**（**一致性**：三稿沿革在三处文档同步留痕）|
| **T11-i B″ 观感收尾**（条目 `→` 前缀 + 触发器图标取色 · 2026-09-20） | 代码 18 维 / 文档 8 维 | **9.55** / **9.60** | 只取**条目前缀箭头**一项（用户拍板「只做 B」）—— 尺寸 / 色值走官方 `CommandItem` 内建规则（**零 className 覆盖**）· 兜底行不加（搜索语义）· 触发器放大镜 `text-muted-foreground`（原继承 `--foreground`）⇒ 三处同色实测 · **C5 9.8**（+3 断言覆盖取色与形态）· **B2 9.4**（窄屏 Sheet 未实跑）· 复核发现 **F105**（注释腐化：脚本注释仍称壳层件为已退役的 `SidebarSearch`）· **F106**（§4.9 落地记录 **5 处行数陈旧**：`AssetSearch` 79→81 · `CommandPalette` 116→128 · `TopBar` 108→109 · `SideNav` 291→293 · `AppShell` 98→99）|

**本轮实现期缺陷（全部已修）**

| # | 严重度 | 类型 | 证据 | 处置 |
|---|:---:|------|------|------|
| **F38** | 🟡 | **数字声明失真** | 「`assetItem` 14 字段」实为 **15**（13 基础 + `starCount` + `starredByMe`；`starredByMe` 为 shorthand 易漏数）—— plan `:92`/`:152` · 本 design `:550`/`:570` **共 4 处** | ✅ 全改 15 + 注明实测量法 |
| **F41** | ⚪ | 文内自相矛盾 | §6.4 prose「仅补下列 **4** 键」vs 表列 **6** 行 | ✅ prose 改 6 并注明「以表为准」 |
| **F42** | 🟡 | 调用点计数失真 | 「**6** 个调用点」实测 **8**（详情 · 版本列表 · **版本对比** · 版本详情 · 文件 · **star 收藏/取消**（T15 新增）· 下载）—— 原清单漏「版本对比」且未回填 T15 新增 2 处 | ✅ 改 8 + 点名清单（design + plan）|
| **F43** | 🔴 | **实现缺陷（漏做）** | §6.1 表 **62 键**，实现只落 **59** —— 缺 `toast.versionDeleted` / `toast.versionYanked` / `toast.assetDeleted` | ✅ 补进 zh/en；复核 **62 = 62** ✅（v1.12 后随 F46 补 3 键 ⇒ **现 65**） |
| **F44** | 🟡 | 类型声明失真 | §5.1 ⑦ 写 `parentId: number \| null`，实现与 skillhub 同形为 **父标签 slug（`string \| null`）** | ✅ 订正（v1.12）|
| **F47** | 🟡 | 件表缺口（前置件未列） | T7 收尾侦察发现 T12 的两类前置件在 §3 件表**未列**：**`hooks/useViewer`**（会话/档位读取；web 现无此抽象）· **写操作 wrappers** 6 个（`patchAssetStatus`/`deleteAsset`/`deleteVersion`/`yankVersion`/`attachLabel`/`detachLabel`） | ✅ 登记于批 plan T12 注记；**件表随 T12 实现同步（新建 14 → 16）** |
| **F46** | 🟡 | 复用声明失真 | §6.1 称类型文案「复用 `market` 组既有键」——实测 `market` 组**无逐类型文案键**（仅有 `centerTitle*` 中心页标题与 `statSkill/statMcp` 计数标签）⇒ 实现期新建 `type.skill`/`type.mcp`/`type.agent` | ✅ 补 3 键（zh/en）· §6.1 加行并注明依据；**键数 62 → 65** |
| **F45** | ⚪ | 引用过期 | §5.1 ⑦ 语种口径指向 `http/labels.ts:66` 内联式 —— T14 已抽为 `requestLocale(c)` 单点 | ✅ 改指新单点（三处共用）|

**T12 实现期发现（2026-09-18 · 逐条处置）**

| # | 严重度 | 位置 | 发现 | 处置 |
|---|:---:|------|------|------|
| **F48** | 🟡 | §3.2 件表 | 版本行内动作的**唯一可行落点**是 M4a 已交付件 `components/market/detail/VersionCompare.tsx`（§3.2 未列；全仓唯一消费者 = `AssetDetail.tsx`）| ✅ **加性可选 prop `rowActions?`**（不传 ⇒ 零变化）；改造件 **+1**，计数随 §9.7 ⑥ 回填 |
| **F49** | ⚪ | §3.1 件 11 | `asset-stats` 原设**三处**共用；抽屉取消后 = **列表列 + 详情元信息卡** 两处，且列表原为 T7 **内联**实现 | ✅ **抽件 + 回改 `pages/Assets.tsx`**（纯重构，零行为变化）|
| **F50** | 🟡 | §6.1 | Q1 拍「不渲染」后，「禁用 + 说明」族键 + **已取消抽屉的段键**成**死键** —— **T11 审计扫描实测 12 键**：`version.deleteDisabled` · `version.yankDisabled` · `admin.noPermission` · `status.current` · `section.labels` · `market.versionPublished` · `market.versionYanked` · `version.col.version` · `version.col.status` · `version.col.created` · `version.col.files` · `version.empty`（`label.privileged` 经 Q2 已消费）| ✅ **登记**（不静默删键；分归「禁用+说明」族 2 键 / 抽屉版本段 5 键 / 同义二选一 2 键 ⇒ M4b-6·M4b-7 触碰时收敛）。**口径订正**：原登记「5 键」为估数，实测 **12 键**（A1）|
| **F51** | 🟡 | 批 plan §7.5 | 计划表把 **T7 / T14** 记为 ⬜ 待做，而本 design §11.9 已给分（9.46 / 9.47）| ✅ 本轮订正（plan v0.12）|
| **F52** | ⚪ | 批 plan 头部 / §8 | plan 仍引 design「8 维 **9.66**」，design 版本头现行 **9.69** | ✅ 改为「以版本头为准（现行 **9.69**）」|
| **F53** | 🟡 | §4.6 标签卡 | **「特权标签」按钮本批不可功能化**：候选源 `GET /api/labels` **恒不含 PRIVILEGED**（§2.1 Q7 ①）⇒ 无数据可挂 | ✅ **禁用占位**（新键 `label.privilegedTitle`）+ `title` 复用 `label.privileged`；真入口归 **M4b-6**；**tooltip 复用属实现期判断**（如实登记）|
| **F54** | 🔴 | §6 i18n 键表 | 键表**未列**详情页管理区的确认框文案与新增按钮文案 ⇒ 不补则 `ConfirmDialog`（title/description 类型必填）无法落码 | ✅ **补 14 键**（`confirm.submit/assetTitle/versionTitle/desc.*6/yankReasonLabel/yankReasonPlaceholder` + `label.remove` + `label.privilegedTitle` + `admin.publishNewVersion`）；assets 组 **65 → 79** |
| **F55** | 🟡 | `i18n/en.ts`（T9 落码缺陷）| **3 个 en 值是中文**：`admin.versionGroup`「版本」· `version.col.version`「版本」· `version.col.status`「状态」—— T9 的双语断言只查**键集差集**、不查**值** ⇒ 漏网 | ✅ 修正为 Versions / Version / Status |
| **F56** | ⚪ | 批 plan T12 件表 | 写「版本（发布新版本占位 **+ yank**）」，但管理卡内**无版本对象** ⇒ 盲按钮 = 死件 | ✅ **yank 仅落版本行内动作**（`PUBLISHED` 行）；与字面偏离，按可实现性判定并登记 |
| **F57** | ⚪ | `api/client.ts` | 仅 get/post/patch/delete，**无 PUT 动词**，而标签挂载端点为 `PUT /:slug/labels/:labelSlug` | ✅ 加性补 **`apiPut`**（同形复用 `doFetch`）|
| **F61** | 🟡 | §4.1 | **卡形态偏离设计字面**：设计要求「整卡 `<Link>` **覆盖层**」，但覆盖层会吞掉「每卡独立重试」按钮的点击（断言 ④ 要求独立重试）⇒ 实现取 **「内容即 `<Link>`」**：正常态整卡可点、错误态就地可重试、零嵌套 `<a>` | ✅ 落地并登记（形态差异属实现期判定）|
| **F62** | ⚪ | §4.1 | §4.1 只写「`PageHeader` 标题复用 `dashboard.title`」，未提副述；原过渡件的欢迎语 `dashboard.welcome` 与 `Q17 state.notice` 链路若不保留即成为死键/行为回退 | ✅ **保留**：欢迎语作 `PageHeader.description`；`state.notice` 消费逻辑原样保留（`dashboard.welcome` 键因此仍有消费者）|
| **F63** | ⚪ | §4.1 · §2.1c 条① P4 | 「`loading` 期间整块骨架、不按默认态渲染」的落地口径：**会话未就绪（`useViewer().loading`）不发任何业务请求 + 整块 `Skeleton`** —— 否则会先按「非管理档」渲染 1 卡再切 3 卡（首帧闪烁）且请求数断言不可稳定 | ✅ 落地并登记 |
| **F67** | 🟡 | 验收期 UI 三连（用户逐条拍板） | ① 门户卡**下载图标**原为文本字形 `⇣`（与详情页 lucide `Download` 不一致）② 卡片带**版本号**（信息冗余）③ 卡片星标为**可交互按钮**且尺寸/颜色/字体与下载不一致（`size-4` + 按钮底色 vs `size-3.5` + muted）| ✅ **全部落地**：① 换 `AssetStat`（与元信息卡/列表列同件）② 去掉版本号 ③ 星标改 `AssetStat kind="star"` **纯展示**（与下载同件同款：font 11px · color `#64748b` · icon 14×14 · gap 4px 实测一致）+ 位置移至下载右侧 · **连带**：`StarButton` 形态收敛为单一形态（撤 `compact`/`form`，避免死代码）· 收藏交互唯一入口 = **详情页头卡** · 卡片结构因无交互元素而改为**覆盖层 Link**（整卡可点含页脚）· dogfood 更新（G18 改指详情页 + 新增 **G14b** 两条）⇒ **60 PASS / 0 FAIL** |
| **F65** | 🟡 | §9.5 整体审计**维度表** | **审计缺「覆盖探针」维度**（skill 明列的换靶角度未用）—— T11 收尾据此判「全绿」，直到用户追问「做过 coverage 了么」才实测 | ✅ 已补：维度入档（证据 §1/§5）+ 命令可复跑（`cd apps/server && bun test --coverage src/`）|
| **F66** | 🟡 | 覆盖实测（T11-c） | ① **`POST /:slug/versions/:version/yank` 路由层整段零覆盖**（`http/assets.ts:683-713`；服务层 `assets/yank.ts` 本就 100%）—— 该端点 2026-09-08（M4a 期）引入，本批 **T12 把它接成「撤回分发」唯一 UI 入口** ⇒ 缺口落在本批依赖面上 ② **web 包零测试基建** ⇒ 本批 14 个前端新/改文件单测覆盖 = 0 | ✅ ① 已补 `apps/server/src/http/yank-route.test.ts`（14 例）+ dogfood **G12b**（真点击端到端）⇒ `http/assets.ts` lines **90.97 → 95.96** ② **登记**归 **M4b-7 / 另立项**（vitest+RTL 独立一笔）|
| **F64** | 🟡 | §9.5 整体审计口径 | **作废件残留审计只查关键字、不判语义**（T11 收尾据此判「残留 0」）⇒ T8 作废后**活口径散点 14 处**被漏扫 —— **首轮 8 处**（批 plan §1 目标表 #2/#3 · §1 缺口段 · §2-T16 行（依赖 `T8` + 件列 `AssetDrawer.tsx`）· T7 步骤 · T12 件表 ×2；主 design §9/§12 段）· **换靶精修谓词再挖 6 处**（本文件 §2.1d 依赖表 U6 行 · §3.1 件 11 · §5.1 ⑧ · §9.2 ×2；主 design §2.4 U5 行）| ✅ **已订正**（批 plan **v0.16** · 主 design **v1.55**）+ `m4b4-audit-scan.sh` **加「活口径谓词」**（命中行不含 作废/取消/~~/修订记录 标记 ⇒ 报警）· 证据文件 §5 **口径撤回**（「无未决项」→「关键字残留 0 · 语义散点 8 处已订正」）|
| **F58** | 🟡 | §3.2 改造件 14 | **门户卡 DOM 结构调整**：原 `<Link>` 包整卡，收藏按钮会落进 `<a>` 内（HTML 禁 interactive content 后代，且点击被导航吞掉）⇒ `<Link>` **收窄到「头像 + 标题 + 描述」主体**、页脚（作者行 + 收藏钮）留链接外 | ✅ 落地并登记；代价 = 整卡点击区少页脚一行；门户 dogfood **36/36** 复跑通过 |
| **F59** | ⚪ | §5.1 ⑧ · §4.6 | 收藏按钮**两形态**（设计只说「门户卡 + 详情页共用」）：详情页 = `[收藏 N]`（文字 + 数字，R20 原型口径）· 门户卡 = 紧凑 `★ N`（无文字，`aria-label`/`title` 承载） | ✅ 实现期判定（`compact` prop）→ **2026-09-18 收敛为单一形态**：门户卡改**纯展示**（`AssetStat kind="star"`）后 `compact`/`form` 变体已撤，本件只服务详情页头卡（**F67**）|
| **F60** | 🟡 | §9.3 G15 | G15「同一资产连点两次收藏 ⇒ 计数只 +1」**语义歧义**：UI 为**切换**（已收藏 ⇒ 再点 = 取消）⇒ 连点两次 = 收藏后取消，计数回基线 | ⚠️ **登记**：G15 幂等断言以 **API 两次 `PUT`** 形式落地（T11 脚本），**不得**以「UI 连点两次」判 G15，否则误红 |
| **T11-f** 资产排序（**f1–f4 全绿** ✅ · **v1.28 定稿 = 官方 `Select` + 列表六列（含「更新」）**） | 代码 18 维 / 文档 8 维 | **f1 9.35 · f2 9.46 · f3 9.46（文档）· f4 9.47** | f2 实测（匿名 CDP + dogfood）：`Select` 五档（显示 + `?sort=` + 序逐项对接口）· 列头**五列**可点（描述列 `clickable:false`）· **「更新」列**（`YYYY-MM-DD` · 恒 active ⇒ 同列反向 `desc→asc→desc` · URL **无** `?sort=updated`）· 两态 + `aria-sort` 同步 · 深链/非法值/回第 1 页/双视图同序/匿名可用 全绿。扣分：**C2 9.0**（排序变更走重取，无计时实测）· **B2 9.3**（EN 宽度已验；**六列在窄视口（≤900px）的挤压未实测**）· **C5 9.0**（web 包零测试基建 —— F66 归 M4b-7）· 实现期缺陷 **F82–F89** 全部入档 |
| **T11-g** 验证效率（dogfood 分段执行 + 会话复用） | 代码 18 维 | **9.49** | **A1 9.0**（会话复用的**失败回落分支**未实测 —— 只跑过命中路径）· **C5 9.0**（脚本自身无自动化回归入口）· **C4 9.0**（守卫 + 段头注释 + `SECTION_IDS` 三处手工同维护；段包块使全文 reindent ⇒ `git blame` 噪声变大，语义 diff 须用 `git diff -w`：452/-60）· C7 9.3（段级粒度 · 跨段共享量需手工上提）| 依据 = **实测**：段选 45.6s（原 3.5~5 分）· 全跑 2m59s · 真登录 9→4 · 全跑 91/0 零行为变化 · 打错组名 3.1s FAIL |
| **T11-i**（全资产搜索 A + 侧栏命令面板 B） | 代码 18 维 | **9.52** | 逐维打分（A **9.50** ×0.40 / B **9.48** ×0.30 / C **9.59** ×0.30）；**B2 9.2**（输入法组合期点亮未抑制 —— 继承 v0.25 边界）· **C3 9.2**（无运行时可观测标记，靠 DOM 属性探）· **A3 9.4**（Hero 提交目标属**有意**行为变更，已拍板 + 留痕）· **C8 9.5**（跨批改动 M4a 交付物 Hero + 壳层 SideNav/TopBar，均已留痕且本批 dogfood 零回归）| 依据 = **实测**：`m4a-dogfood` **57/0**（+11 条）· 本批 dogfood **91/0** · 五门禁全绿 · i18n **347 键** · 3 图 · **F98/F99 两条自伤已登记并修复** |
| **T11-h** 首页搜索形态对齐（两态 + **v0.25 聚焦判据**） | 代码 18 维 | **9.51** | **B2 9.0**（输入法组合期即时点亮未抑制 —— 与参考同款，未处理）· **C3 9.0**（无运行时可观测标记；状态只能靠 `data-variant`/计算样式探）· **C8 9.5**（跨批改动 M4a 交付物，已留痕）| 依据 = **实测**：真指针四态（未聚焦 / 聚焦空态 / 失焦 / 有输入）逐态读数 · `m4a-dogfood` **46/0**（+4 断言）· 50s 全跑 · `NO JS ERRORS`；**同分不同构成**：+4 断言使 **C5 ↑**，与 B2/C3 保留扣分相抵 |


**T11-e 实现期发现（v1.22 · 逐条处置）**

| # | 严重度 | 位置 | 发现 | 处置 |
|---|:---:|------|------|------|
| **F68** | 🟡 | §3.1 件表 | **官方件「落仓后弃用」**：按用户「用官方的」先落 `ui/shadcn/item.tsx` 并实现列表形态，实机观感判「带边框 `Item` 逐行成卡 ⇒ 碎/松」⇒ 改官方 `Table` | ✅ **删除 `item.tsx`**（零消费点，grep 实证）+ 件表改记 `AssetList.tsx`；⚠️ **留痕防复现**：官方注册表**无 `list` 件**（64 件实测核对：只有 `table` / `data-table` / `item`），下次别从 `Item` 起步 |
| **F69** | 🟡 | `m4a-dogfood.ts:279` | **跨批断言口径变更**：原「中心搜索占位」直接查页头输入框；v1.22 删页头搜索后该断言**必红** | ✅ 改写为「入口 = 折叠面板触发钮 + 点开出现输入框」（拆两步 · 幂等）；断言 **36 → 37** —— ⚠️ 属**跨批（M4a 交付物）改动**，须留痕 |
| **F70** | 🟡 | G20/G21 探针 | **探针锚点四处自伤**（首版验证设计不严）：① 模板字符串内写反引号 ⇒ 截断探针字符串（解析错）② hero 卡锚点用 `document.querySelector('h1').closest(card)` —— 页面上有**两个 h1**（顶栏 + hero）⇒ 命中顶栏、返回 `-1` ③ 改用「计数徽章文案」正则 ⇒ 在 `/mcps` 失配（zh 是「个 **MCP** 资产」**带空格**）④ 探针漏带 `pagination` 字段 ⇒ `undefined === false` 恒假 | ✅ 四条全部修 + **写进脚本注释留痕**；最终锚点 = 「首个内含 `h1` 的 `Card`」 |
| **F71** | 🟡 | 运行环境（非代码） | **登录限流**：`LOGIN_RATE_LIMIT = 15 分钟 / 20 次`（`auth/better-auth.ts:64` · in-memory）⇒ 本脚本含 6~7 次登录，**同一窗口连跑两遍即撞限流**，症状 = 凭据正确但 `me=401:anon` + 脚本中止 | ✅ **写进脚本头**（症状 + 处置「重启 api 清零」）；双证：限流配置存在 + 重启后同命令 **77/0 全绿** |
| **F72** | 🟡 | 主 design §11:792 | **i18n 键数漂移**：文档记「全仓 **323 键 / 12 组**」⇒ T11-e 后实测 **329 键 / 12 组**（+6） | ✅ 同步主 design §11（本轮）|
| **F73** | ⚪ | `m4b4-measure.ts:62` | 行数实测脚本的**文件清单未含新件** `AssetList.tsx` ⇒ 权威行数表缺新件 | ✅ 补进清单（本轮）|

| **F74** | 🔴 | §9.1 硬约束 · §11.9 留证 · 批 plan T3 步骤 · 证据 §3 行 | **契约散点未随 T11-e 同步**：v1.22 改了 `CenterPage.tsx`，但**「`CenterPage.tsx` 零 diff」仍在 4 处作活口径**（§9.1 硬约束最严重：读者据此判回归会误红/误绿）| ✅ 全部订正：§9.1 改**「零回归」**（判据 = `m4a-dogfood` 全量 PASS + 网格形态/默认排序不变）· §11.9 留证行标注 T11 收尾态 · 批 plan T3 步骤限定为「`status` 维度零 diff」· 证据 §3 行标注收尾态 + 指向 §13.2 |
| **F75** | 🟡 | 批 design §9.1/G14 · 批 plan 4 处 + **§6 R1 风险信号** · 证据 §8 | **基线数字散点未随 T11-e 同步**：`m4a-dogfood` 由 **36 → 37**（F69 拆分断言），但 7 处仍写「36/36」—— 其中 **§6 R1 风险信号行**最要紧（`< 36/36` 作回归触发线 ⇒ 实际 37 时永远不会触发）| ✅ 全部订正为 **37/37（现行）**；R1 信号改「任一条断言失败（基线现行 37/37）」并注明「`CenterPage` 零 diff 不再是信号」|
| **根因** | — | 补档轮流程 | 本轮首稿**只做「写新内容」、漏做「扫变更口径」第二步**（本仓 §9.7 既有纪律要求口径变更后全文散点扫；此为 **F64 同类复发**）| ✅ §9.7 增 **v1.22 散点扫记录**（模式 + 命中 11 处 + 逐处处置 + 教训），把「补档轮 = 写新内容 + 扫变更口径」写死 |

| **F76** | 🟡 | 证据 §13.6 | **行数声明未随改动同步**：`AssetList.tsx` 文档记 **133** ⇒ 实测 **135** ⇒ 注释订正后再测 **138**（两次增行均未回填）—— **同类第三次**（F26 `DataTable` 133→139 同族）| ✅ 订正为 **135** + 写入纪律：**提交前必跑 `m4b4-measure.ts` 并用其输出回填行数表**（§9.7 收尾回填项已补）|

| **F77** | 🟡 | `CenterPage.tsx` 注释 | **注释腐化 4 处**（本轮换靶角度 ③）：删页头搜索后 ① M4a 迁移注释仍写「页头搜索框改 `Input`…受控行为不变」② 折叠搜索段写「**与页头搜索同源** —— 两处输入同步」（两处已不成立）③ `flex-1` 坑位注释仍列「**搜索框 240**」为不变项 | ✅ 三处均补「v1.22 已移除 / 唯一入口 = 折叠面板」标注（保留沿革，不删史实）|
| **F79** | 🟡 | `AssetList.tsx:6` vs `:66` | **同文件声明自相矛盾**：件头写「表头底色、单元格内距**全部走官方默认**（零外观覆盖）」，而行内注释写「`bg-muted/50` = 本件**唯一观感类覆盖**」；真码另有**布局类覆盖 3 项**（`table-fixed` / 百分比列宽 / `py-4`）—— 件头是**首版**写的，后续两次调整（行距加宽 / 表头底纹）未同步 | ✅ 件头改为逐条交代「布局类 3 + 观感类 1」，并写明「与控制台 `DataTable` 零外观覆盖纪律的唯一差异 = 表头底纹」|
| **F78** | ⚪ | §8 · v1.22 行 | **范围表述过宽**：写「唯一搜索入口 = 折叠面板」未限定范围，而门户首页 `Hero`（`pages/Home.tsx`）的官方 `InputGroup` 胶囊搜索**仍在**（M4a 落地页入口）| ✅ 两处限定为「**中心三页内**唯一入口」（并注明首页未动）|

| **F80/F81** | 🟡 | T11-f 立项（2026-09-20） | 两处**判断错误**：F80「v9 无 manual*」（根因 grep 非递归）· F81「legacy 接排序需切原生面」（根因未做探针）| ✅ 已用**类型探针 + 运行期 A/B 探针**实证修正 —— **明细与纪律沉淀见 §4.7.6**（本节不复述）|

**换靶实测通过项（留证）**：`errors` 组 **28 → 35 键**（+7，与 §6.3 声明一致 ✓，先前的 33 是计数法漏了两处非引号键）·
`canManageAsset` = `owner ∨ role ≥ ADMIN`（`assets/manage.ts:19-20` 真码）⇒「R6-b 与 canManageAsset 同集」声明**成立** ✓ ·
门户 `components/market/CenterPage.*` **零 diff**（`useMarketQuery` 加性维度未触达）✓ · `assets` 组键数 **62 = design 表 62** ✓

## 12. 修订记录

| **v1.38** | 2026-09-20 | sunxuewen-rush | **T11-i B″ 观感收尾（用户「只做 B」+「侧边栏搜索图标的颜色要浅一些」）** ① 用户放入官方站命令面板截图要求对照 ⇒ 核官方仓 `apps/v4/components/command-menu.tsx`（642 行 · **站点应用层**实现 · 注册表 `command` 件无 footer 槽位）· 出 5 屏小样后拍板**只取条目前缀箭头** ② **页面**条目加 `→`（尺寸 / 色走官方 `CommandItem` 内建规则 ⇒ 零 className 覆盖）· **兜底行不加**（搜索语义）③ 触发器放大镜 **`text-muted-foreground`**（原继承 `--foreground`）⇒ 与文案 / `⌘K` **三处同色** ④ §4.9 追加落地段 **并订正 5 处陈旧行数**（**F106**）· §11.9 增行（代码 **9.55** / 文档 **9.60**）⑤ 断言 `m4a-dogfood` **60/0**（+3）· 本批 **91/0** 零回归 ⑥ **F105** 登记（脚本注释腐化：仍称已退役件 `SidebarSearch`）|
| **v1.37** | 2026-09-20 | sunxuewen-rush | **侧栏搜索定稿「框样触发器 → 命令面板」（T11-i B″ · 用户复审拍板「还是官方站的对话框更适合一些」）** ① 入口 = **框样触发器**（像常驻输入框的按钮 · shadcn 官方站同款配方）⇒ 点击 / `⌘K` 开官方 `CommandDialog` ② **B′（官方 `Combobox` 一体形态）与其依赖 `@base-ui/react` 整体退役**（依赖归零 · notices 回 **33 件** · i18n 回 **347 键**）③ §4.9 补 B″ 段 · §4.7.6 增「F101/F102 同日撤回」（F103/F104 保留）· §11.9 增行（代码 **9.48** / 文档 **9.45**）④ 断言 `m4a-dogfood` **57/0** · 本批 **91/0** |
| **v1.36** | 2026-09-20 | sunxuewen-rush | **T11-i B′：侧栏搜索改「一体」形态（用户拍板「就按 Combobox 方案来」）** ① 由「侧栏条目 → 官方 `CommandDialog` **弹窗**」改为 **常驻输入框 + 紧邻下拉**（官方 `Combobox` · **Base UI** 原语）② **弹窗形态整体退役**（`ui/CommandPalette.tsx` 删 · 侧栏条目 **15 → 14**）③ **新增依赖 `@base-ui/react@1.8.0`（MIT）** + vendoring 偏离 **3 处**登记 ④ i18n **347 → 346**（`pages` 键退役）⑤ §4.9 补 B′ 段 · §4.7.6 增 **F101–F104** · §11.9 增行（代码 **9.40** / 文档 **9.41**）⑥ 断言 `m4a-dogfood` **57/0**（B 段 6 条重写 + 作用域修复）· 本批 **91/0** 零回归 |
| **v1.35** | 2026-09-20 | sunxuewen-rush | **T11-i 观感微调（用户 2026-09-20）落地回填**：① 顶栏小搜索 **靠右、置于语言切换器左侧**（原 = 标题右侧）② 宽 **固定 `w-[320px]`** ③ 放大镜 **`strokeWidth=4`**（加粗一倍）—— §4.9 落地记录追加实测（`w=320` · `gapToSwitcher=11` · A/B 白墨 **141 → 334 = 2.37×**）· `m4a-dogfood` 断言 A-① 收紧为 `w=320 + 靠右 + 切换钮左侧 + stroke=4` ⇒ **57/0** · 本批 dogfood **91/0** |
| **v1.34** | 2026-09-20 | sunxuewen-rush | **T11-i 全资产搜索 + 侧栏命令面板（落地回填）** ① **§4.9** 补实测段（A/B 两项 + 断言数 + i18n 键数 + 件行数）② **§11.9 增 T11-i 行**（代码 18 维 **9.52**）③ **§4.7.6 增 F98**（后台 tab SPA 导航 DOM 不提交 ⇒ 断言页面内容前须 `Page.bringToFront`）· **F99**（壳层新增件与页面级选择器撞车 ⇒ 新增 `PAGE` 作用域 · 修后本批 dogfood 91/0）④ `m4a-dogfood` **46 → 57/0**（+11 断言）· 本批 **91/0 零回归** ⑤ i18n **335 → 347 键**（+12）· **零后端改动** |
| **v1.33** | 2026-09-20 | sunxuewen-rush | **全资产搜索立项（T11-i · 用户拍板 A1 + B1 + C3 + 「Hero 对齐」）** ① 新增 **§4.9**（范围 = 顶栏常驻小框 + 抽公共件 + 资产页搜索保留 · **语义边界 = 顶栏跨类型 / 资产页本类型** · 落地页 `/search`（不入侧栏 · 零后端改动）· Hero 提交目标改 `/search?q=`）② 件规格 **新建 3**（`search/AssetSearch.tsx` · `pages/Search.tsx` · `market/sortOptions.ts`）/ **改造 4**（`ui/TopBar.tsx` · `market/Hero.tsx` · `market/CenterPage.tsx`（常量改 import）· `main.tsx`（+1 路由））③ 规格落 **M4a §8.12 + §8.13**（**B** = 侧栏命令面板：入口 **14 → 15** · 官方 `CommandDialog` · 导航清单上提 `ui/navItems.ts` 单一事实源 · 角色过滤 · 兜底行跳 `/search?q=`；用户拍板「sidebar 放命令面板搜索 / header 放小的搜索」） ④ **F96 登记**（主 design §15 v1.56 行粘连 ⇒ 本轮修复 · 审计候选检查登记）⑤ **本版零实现改动** |
| **v1.32** | 2026-09-20 | sunxuewen-rush | **T11-h v0.25 —— 点亮判据扩为「聚焦 或 有输入」**（用户拍板「鼠标一点击输入的地方、焦点在的时候就变」）① **§4.8** 更新：`lit = focused || hasQuery`；**可提交性不变**（空输入仍无反应）⇒ 点亮 ⟷ 可提交**解耦** ② **§11.9** 增 T11-h 行（代码 18 维 **9.51**）③ **§4.7.6 增 F95**（后台 tab `element.focus()` 设 `activeElement` 却不派发 `focus` 事件 ⇒ React `onFocus` 不触发 ⇒ 探针假红；**判定聚焦类交互必用真指针**）④ `m4a-dogfood` **+4 断言 ⇒ 46/0**（基线 38）⑤ 规格落 **M4a §8.11**（v0.31）|
| **v1.31** | 2026-09-20 | sunxuewen-rush | **T11-h 首页搜索形态对齐（只改首页）** —— 用户拍板「只做形态对齐 · 空态没反应」⇒ ① 新增 **§4.8**（范围/行为/断言/边界）② **§4.7.6 增 F94**（探针把 CSS 过渡中间态当终值 ⇒ 自伤假红；反证链 + 固定写法）③ 规格落 **M4a §8.10**（Hero 属 M4a 交付物 · 引用不复制）④ `m4a-dogfood` **+4 断言 ⇒ 42/0** ⑤ 门户三页与控制台零改动 |
| **v1.30** | 2026-09-20 | sunxuewen-rush | **M4b-4 收口审计（converge）** —— 换靶角度 = **「活口径 vs 历史留痕」**：抓出 **5 处当值处陈旧**（批 plan 3 · `docs/00` 2 · 证据 1；批 design 自身干净）⇒ 全部订正 + **F93** 登记（纪律：改数字须区分「当值处」与「修订行」）· 出口五件终态复核 ✅（含 CI run `35499952284` success）· 三笔提交 `72e48db`/`434043b`/`ced0d6a` · 零实现改动 |
| **v1.29** | 2026-09-20 | sunxuewen-rush | **T11-g（验证效率）—— dogfood 分段执行 + 会话复用** （用户「连续几条任务时间都有点长，耗时点在哪里？」· 归因结论 = dogfood 复跑为工具时间大头；**分桶数字口径已撤**，只留直接 `time` 实测 —— 见证据 §14.9）① **§11.9** 增 T11-g 行（代码 18 维 **9.49**）② **§4.7.6** 增 **F90**（`send()` 回整条 CDP 消息 ⇒ cookie 键取错 ⇒ 复用静默失效，诊断实证后改正）· **F91**（`docs/` 脚本不在 turbo lint 图内）· **F92**（门禁 `test` 行可能是 turbo **缓存回放** ⇒ 报数须标真跑/回放；已 `--force` 补真跑 32.6s / 562 pass / 0 fail）③ 实现：`SMOKE_ONLY` 14 段守卫 + 命中检查 + 跨段探针上提 + `jar`/`me.user.id` 会话复用；**零产品码改动** ④ 实测：段选 **45.6s**（原 3.5~5 分）· 全跑 **2m59s** · 真登录 **9 → 4** · 全跑 **91/0**（零行为变化）· 打错组名 3.1s FAIL 并列可选段 |
| **v1.28** | 2026-09-20 | sunxuewen-rush | **列表加「更新」列（⟷「最新」档）+ F89 订正** —— ① `AssetList` **六列**（名称/描述/作者/下载/收藏/**更新**）· 列宽 24/26/16/11/11/12 · 载态 `colSpan` 6 ② 列头可点 **五列**（`updated ⟷ newest`；`formatDate` 与控制台「更新」列同件；i18n `market.colUpdated` 同词）③ **F89**：`handleHeaderSort` 把列名当档位 ⇒ `?sort=updated`（服务端白名单外静默回落，但 `dir` 仍生效 ⇒ 序与档位脱钩）⇒ 导出 `COLUMN_SORT` 单一事实源 + `CenterPage` 先译档 ④ dogfood **G20-4 改六列** + **G22-6c 新增**（URL 无 `sort=updated` · Select 仍「最新」· `desc→asc→desc` 序对接口）⇒ **91 PASS / 0 FAIL** ⑤ i18n **+`colUpdated` ⇒ 335 键**（实测）⑥ f2 复评 **9.46** |
| **v1.27** | 2026-09-20 | sunxuewen-rush | **T11-f 排序控件形态定稿 = 官方 `Select`（用户拍板）** —— ① 线框四案对比（`/tmp` 原型物料不进仓）后用户选 **B**：`Label「排序」+ SelectTrigger#market-sort`（`size="sm"` · **`w-[160px]`** · `role=combobox`）取代 chips ×5 ② **实测**：常驻宽 **274 → 160px**、换档点击 **1 → 2 次**、中英均**不截断** ③ **F87**（104px 定宽在 EN `Most downloads`=106px 下截断）⇒ 沿控制台 `#assets-status-filter` 同宽先例改 160 ④ i18n **+`sortLabel` ⇒ 334 键**（实测 · 未消费 12 不变）⑤ G22 断言同步（Select 显示 + `160x32` 尺寸真值）⇒ **90 PASS / 0 FAIL** · `m4a-dogfood` **38/0** ⑥ f2 自检 **9.40**（形态变更后复评：+0.03 = 常驻宽度 -114px 且两语无截断）|
| **v1.26** | 2026-09-20 | sunxuewen-rush | **T11-f 收口：f3 文档回填 + f4 验证（全绿）** —— ① `m4a-dogfood` 断言改写（**F85**）⇒ **38/0** ② 本批 dogfood **90 PASS / 0 FAIL / 0 超时 / NO JS ERRORS**（+**G22×13**）③ 覆盖探针：全仓 **95.60/96.29**（lines **+0.07**）· `http/assets.ts` **95.98** · `assets/service.ts` 100/97.49 · `http/me.ts` 100/100 ⇒ **不降** ④ **F86**（`--coverage` 含 `dist/**` ⇒ 7 例假失败；`--coverage src/` = 562/0 反证）⑤ 证据回填 `docs/smoke/…personal-b.md` **§14** ⑥ f3 文档 **9.46** · f4 **9.47** ⑦ i18n 实测 **333 键** | 
| **v1.25** | 2026-09-20 | sunxuewen-rush | **T11-f f2（门户 UI 排序）实现 + F84 订正** —— ① **chips ×5**（官方 `ToggleGroup variant="chip"` · 计数行内搜索钮左侧 · 取代静态文本）② **列头可点**（`AssetList` 内新 `SortableHead`：官方 `Button ghost/sm` + `ArrowUpDown/Up/Down` + `th[aria-sort]`；**描述列不可点**）③ `useMarketQuery` **加性** `sort`/`dir`（`setSort` 清 `dir` + `dropPage`；`dir` 缺省 ⇒ 档位固有方向）④ `api/assets.ts` 透传 ⑤ i18n `market` **+5 / 退役 `sortRecent`** ⇒ **实测 333 键**（未消费不变）⑥ **F84**：列头首点恒 `desc`（原 §4.7.5「点异列 = 固有方向」与 §4.7.2/§4.7.3 自相矛盾）⇒ 订正 ⑦ f2 自检 **9.37**（A 9.38 · B 9.38 · C 9.35）| 
| **v1.24** | 2026-09-20 | sunxuewen-rush | **T11-f f1（服务端）实现期订正** —— ① **F82**：契约漏 `dir` ⇒ 主 design v1.57 补 `&dir=` + §4.7.5 补 `dir?: AssetSortDir` ② **F83**：`.default('newest')` 写法在非法值上 400 ⇒ 订正 `.catch('newest')` / `dir: …optional().catch(undefined)` ③ 测试行回填 f1 实际落点（service + 两路由）。**实现口径**：白名单映射（全档带 tiebreaker）+ `name`/`author` 相关子查询（零 join）· 零迁移 · 零新依赖 |
| **v1.23** | 2026-09-20 | sunxuewen-rush | **验收期第三笔 T11-f「资产排序」立项（零实现改动）** —— ① 新增 **§4.7**（定值口径 10 条 · UI 规格 · 交互边界 · G22 断言口径 · **基础面实证** · **F80/F81 纠错留痕 + 纪律沉淀**）② **§6.6** i18n：`market` +5 键、**退役 `sortRecent`**（净 329 → **333** 键（**实测**：`m4b4-measure` = 12 组 · zh=333 / en=333 · en 值级中文泄漏 **0**） · 未消费 **12 不变** —— 退役键原有消费者）③ §3.3 前补**件表增量**（新建 **0** / 改造 **+4** / 脚本 +2）④ §9.3 增 **G22**（7 条）· §9.4 区间 **G1–G22** ⑤ §9.5 造数增**排序样本**（21 条占位写递变下载/星标值）⑥ §11.9 增 **T11-f 行**（实现中）⑦ 主 findings 表加 **F80/F81** 指针行 |
| **v1.22** | 2026-09-18 | sunxuewen-rush | **验收期 UI 调整轮第二笔（T11-e · 门户视图切换 + 折叠搜索 · 提交前自检 9.24 / 文档 5.25 ⇒ 补档轮）** —— ① **视图切换**：官方 `ToggleGroup`（`outline`/`sm`/`spacing=0` · `LayoutGrid`/`List` 图标 16px · 单钮 42×32）置于结果计数行右端；`ViewMode` = 组件 state（**不落 URL/存储** —— 用户「不用记忆」）⇒ 同页翻页/搜索/筛标签保持视图，离开/刷新/后退回网格（G20 断言）② **列表形态三易其形**（留痕）：官方 `Item`（弃用 · F68）→ 官方 **`Table`**（`table-fixed` · 5 列 · 列宽百分比 26/30/20/12/12 · 单元格 `py-4` ⇒ 行高 55 · 描述 `line-clamp-3` + `whitespace-normal` ⇒ 最长 93px · 整行热区 = 首列 stretched link）③ **去卡化**（用户「table 和背景融为一体」）：面板除边框/白底/圆角，表格落在页面底上，只留官方行分隔线与表头底纹④ **折叠搜索**（用户「参考 ClawHub 切换钮左侧的搜索」）：官方 `Collapsible` + 官方 `InputGroup`（放大镜 addon + 无边框输入 + `InputGroupButton size="icon-xs"` 关闭钮）；位置 = 工具条下方、宽度与工具条等宽（实测 693/693）；展开**自动聚焦**（有意偏离 ClawHub，1 行）⑤ **删页头搜索框**（用户「title 上的搜索就重复设计了，需要去掉」）⇒ 唯一入口 = 折叠面板；hero 卡内 input = 0（G21-5 反证）⑥ 件表 **新建 16 → 17** / 改造 **19 → 20**（`CenterPage.tsx`；**§9.1「CenterPage 零 diff」契约改为「零回归」**）⑦ i18n **+6 键** ⇒ **329 键 / 12 组**（双语差集 0 · 未消费键 12 = 基线）⑧ 造数 **+21 条 mcp 分页占位**（类型/owner 选择有据 —— F/§9.5）⑨ dogfood **77 PASS / 0 FAIL**（G20×10 + G21×6）· `m4a-dogfood` **37 PASS / 0 FAIL** ⑩ 发现 **F68–F73** ⑪ 零服务端改动 · 零新依赖 |
| **v1.21** | 2026-09-18 | sunxuewen-rush | **验收期 UI 调整轮（T11-d · 代码 18 维 9.59）** —— ① 门户卡下载图标 → `AssetStat`（与详情页/列表列同件）· 退役 `⇣` 字形 ② **去卡片版本号** ③ 星标 → `AssetStat kind="star"` **纯展示**（与下载实测同款：font 11px · color `#64748b` · icon 14×14 · gap 4px），位置 = 下载右侧；**交互只留详情页** ④ 连带收敛：`StarButton` 撤 `compact`/`form`（单一形态 · 避免死代码）；卡片改**覆盖层 Link**（整卡可点含页脚 · 无嵌套 interactive content 顾虑）⑤ dogfood：**G18 改指详情页** + 新增 **G14b**（纯展示反证 + 点击穿透）⇒ **60 PASS / 0 FAIL** · 总用例 **551** 不变 ⑥ **F67 登记** + §3.1 件 15 / G14 / G18 / F59 同步 |
| **v1.20** | 2026-09-18 | sunxuewen-rush | **T11-c 覆盖补测轮（代码 18 维 9.64）** —— ① **F65 登记**：整体审计**缺「覆盖探针」维度**（skill 明列换靶角度未用，T11 据此判全绿 ⇒ 口径缺口）② **F66 登记 + 已闭**：`POST /:slug/versions/:version/yank` **路由层整段零覆盖**（`http/assets.ts:683-713`；服务层本就 100%；本批 T12 首接 UI 入口）⇒ 新增 **`apps/server/src/http/yank-route.test.ts` 14 例** + dogfood **G12b** 真点击端到端；**web 包零测试基建**（14 个前端文件覆盖 0）⇒ 归 **M4b-7 / 另立项** ③ 实测：全仓 **95.60/96.28** · `http/assets.ts` **90.97 → 95.96** · 测试 **537 → 551** · dogfood **53 → 58** ④ 补测期自身两缺陷留痕：清理链序（`asset_version.asset_id` FK **无 onDelete** ⇒ 必须先删版本）+ 对话框探测器（官方 `AlertDialog` 而非 `Dialog`）⑤ 证据 §1/§3/§4/§5/§6 A5/§8/§10 同步 |
| **v1.19** | 2026-09-18 | sunxuewen-rush | **T8 作废散点订正（文档面 · 文档 15 维 9.22）** —— ① 订正 **14 处**活口径（首轮 8 + **换靶精修谓词再挖 6**）：**本文件 5 处**（§2.1d 依赖表 U6 行标作废 · §3.1 件 11「三处共用」→ 两处 · §5.1 ⑧ star 消费「三处」→ 两处 · §9.2 交付物表资产页行「快速预览」→ `Eye`「打开详情」· §9.2 新件行抽屉划掉）+ **主 design 1 处**（§2.4 U5 操作列「快速预览」）+ **批 plan 7 处**：批 plan §1 目标表 #2（操作列「快速预览」→ `Eye`「打开详情」）/ #3（抽屉行标**作废**）· §1 缺口段（去「抽屉」）· §2-T16 行（**去 `T8` 依赖 + `AssetDrawer.tsx` 件列**）· T7 步骤（「与抽屉同一矩阵」→「与详情页管理区同一矩阵」）· T12 件表（LabelCard 去「与抽屉段同件」；asset-stats **三处 → 两处共用**）；主 design §9/§12 段 ② **F64 登记**（审计关键字口径盲区 → 脚本补「活口径谓词」）③ **口径撤回**：T11「整体审计无未决项」→「关键字残留 0 · 语义散点 8 处已订正」④ 证据文件 §5/§6 同步 ⑤ 无代码改动 |