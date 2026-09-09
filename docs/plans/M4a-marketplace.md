# M4a 市场门户实现计划

> Date: 2026-09-09
> Updated: 2026-09-09（v0.10：T14 完成回填——commit hash；详情壳两波编排 + tab 语义 SSR 断言。v0.9：T13 完成回填——commit hash；卡/筛选 SSR 断言 + curl 契约实测（type/q/label 参数名）。v0.8：T12 完成回填——commit hash；三中心参数化 SSR 冒烟 9 断言（type 注入矩阵 + URL q 还原）。v0.7：T11 完成回填——commit hash；首页 SSR 冒烟 12 断言（zh/en 双语）。v0.6：T10 完成回填——commit hash + 板块 B（T7-T10）全部 ✅；SSR 冒烟 12 断言留证。v0.5：T9 完成回填——commit hash；原子组件 SSR 冒烟 17 断言留证。v0.4：T8 完成回填——commit hash + compare.ts 建文件注记（§4.2 树对齐，plan Files 未列）；T6 漂移注记（from=to 实测 200 空 files——测试为真相，非 plan 所写 400；version_compare_invalid 未落地）。v0.3：T7 完成回填——依赖版本入档 + commit hash；注记 I18nProvider 装配归 T8（i18n 层属 T8 交付物）。v0.2：板块 A（T1-T6）执行完成——任务状态回填 ✅ + commit hash；Status 转执行中。v0.1 修复：R8/R9 错误码注册/T14 YANKED 断言/T6 依赖声明/T11 v0.8 规格/引用链 v0.8）
> Status: 执行中（已批准；板块 A 完成——T1-T6 全部 ✅ + commit；板块 B 完成——T7-T10 全部 ✅ + commit；当前板块 C 首页）
> 引用链：本文档 → 设计 docs/designs/2026-09-09-m4a-marketplace-portal-design.md（v0.8，§N 逐 Task 引用）→ 规范 00 §5 · 02/03/04 族协议 · 05 §3.1 · 06 §2.3/§4 · 07 全 · 08 §5/§7（引用不复制，契约以 design v0.8 为准）
> 命名约定见 docs/plans/README.md

## 1. 目标与范围

**目标**：落地 M4a 公开市场门户（消费者视角，全程匿名）——五路由（首页/三中心/详情）+ AppShell；
服务端最小支撑 R4-R9（匿名列表/assetItem 展示字段/ownerDisplayName/stats/文件内容/版本
compare）；web 从空壳到可用门户（视觉按 design v0.3-v0.7 定稿 tokens）。
前置已就绪：server 520 tests 绿（M0-M3 闭环）；apps/web 空壳基座（React 19 + Vite 6 + TS strict）；
GET /api/labels 公开端点；PUBLIC 匿名读/下载端点（详情/版本/下载匿名实证）。

**不含**（design §2 out）：M4b（审核队列/标签管理/生命周期动作/发布流/真实登录）；M5 CLI；
README 之外的排序切换；社交面。

**执行纪律**：
- server 测试 = `bun test src/`（真 PG ai_asset_hub_test@localhost:5433 密码 aih——dev db：
  `docker compose up -d db` + `bun run db:migrate`）；web 无单测基建先立 vitest 或延后（M4a web
  测试策略：组件级测试最小化——首期以 dogfood 冒烟 + typecheck 为主，测试基建不阻塞页面落地，
  若建 vitest 需用户批准依赖）；提交前验证 typecheck + 相关测试绿
- **禁 mock 服务模块**（网络层 stub 例外）；测试数据清理 afterAll 前缀 like 清，禁全表 delete；
  drizzle 条件组合 and()/or()（23505 看 err.cause.code）
- 前端调用以 design §5.1/§5.2 契约为准；**R8/R9 存储实证先行**（T5 前置——决定实现路径）
- 视觉实现以 design §4.4 tokens 与 demo（/tmp/m4a-styleboards/demo-m4a.html 评审实证）为准，
  漂移视为缺陷
- dev 联调：server `.env`（DATABASE_URL/SESSION_SECRET）起 `bun run --filter=@ai-asset-hub/server
  dev`（localhost:3000）；web dev 需 vite 代理 `/api → http://localhost:3000`（T7 落地）

## 2. Task 清单

约定：每个 Task 完成 = 断言为真；commit 点为 Task 结束（Conventional Commits）；板块顺序执行
（服务端先行——web 联调依赖）。

### 板块 A 服务端最小支撑（design §6 R4-R9）

#### T1 实证：bundle 存储结构与读路径（design §5.2 R8 前置）
✅ 完成（2026-09-09——实证结论已回写 design §5.2 R8 注记）
- **Files**: 读 `apps/server/src/assets/download.ts` · `db/schema/assets.ts`（asset_file/
  asset_version.bundleStorageKey/bundleSha256）· storage SPI——确认版本文件内容存取方式
  （zip 对象 or 逐文件顺存 or 双份）→ 结论写 Task 断言
- **Assert**: 明确回答「按 path 读单文件」的实现路径（顺存 key 直读 / zip 解压索引）——
  输出决策记录（写进 T5 Files 注释），驱动 T5/T6 实现
- **Commit**: 无代码变更——结论并入 T5（不单独 commit）

#### T2 R4：列表匿名放行（design §6 R4）
✅ 完成（commit `8c8d2cf`）
- **Files**: Modify `apps/server/src/http/assets.ts`（GET / 撤 requireAuth；viewer 组装复用
  viewerContext 匿名分支：principal 无 → userId null → listViewableAssets 条件坍缩 PUBLIC-only——
  service.ts 实证）；Test `src/http/assets.test.ts` 或新增匿名面用例
- **Assert**: 匿名 `GET /api/assets` 200 且仅 PUBLIC+ACTIVE 资产；登录态列表行为零变化
  （既有测试全绿）；PRIVATE/NAMESPACE_ONLY 不出现在匿名响应
- **Commit**: `feat(server): allow anonymous asset listing (PUBLIC-only visibility)`

#### T3 R5 + R6：assetItem 展示字段（design §5.2 R5/R6）
✅ 完成（commit `163e3f2`）
- **Files**: Modify `apps/server/src/http/assets.ts`（assetItem 序列化 + 数据源查询 join——
  list/detail/versions 数据行 join `asset_version`(latest_version_id) 投影
  version/name/description + join `user_account` 投影 displayName）；列表与详情共用一处；
  服务层或查询层增强 AssetRow（plan 实证 join 形态）；Test 新断言
- **Assert**: assetItem 响应含 latestVersion/latestName/latestDescription/ownerDisplayName；
  列表与详情一致；ownerId 保留（前端工号拼装）；无 N+1（单 join 批）
- **Commit**: `feat(server): enrich assetItem with latest version projection and owner display name`

#### T4 R7：stats 聚合端点（design §5.2 G6）
✅ 完成（commit `574da4b`）
- **Files**: Create `apps/server/src/http/stats.ts`（或并入 assets.ts 同面——plan 实现取）+ 
  app.ts 注册 GET /api/stats（匿名）；聚合 PUBLIC+ACTIVE：count / sum(downloadCount) /
  group by type → `{totalAssets,totalDownloads,typeCounts:{type:n}}`；Test 新用例
- **Assert**: 匿名 200 形状符合 §5.2；仅 PUBLIC+ACTIVE 计入（PRIVATE 资产不入统计——防泄露）；
  typeCounts 键动态（Record）
- **Commit**: `feat(server): add public stats aggregation endpoint`

#### T5 R8：文件内容读取端点（design §5.2 G7；**T1 实证结论（2026-09-09）——逐文件顺存直读**：
✅ 完成（commit `066eab4`）
assetFile 行含 storageKey/（versionId,filePath）uq；读路径 = db 参数化查 assetFile → 
storage.get(storageKey)（ObjectStorage.get → Buffer|Readable）零解压；`..`/绝对路径在 db 查
天然不命中——显式含 `..` 先拒 400 path_invalid 友好提示再查；truncated 用 fileSize 先行判定
（>256KB 流截断读前段）；binary 判定 contentType + utf8 试解码）
- **Files**: Create 版本文件内容读（storage.get 直读 + fileSize 截断 + binary 判定）；路由
  GET /assets/:ns/:slug/versions/:version/files/*path（path 含目录，URL
  编码）匿名 + YANKED 400 + 不存在 404 + 路径越权 400（禁 `..`/绝对路径）+ 越界文件 404；
  响应 `{path,size,binary,truncated,content?}`——文本 utf8（解码失败 binary=true）；
  truncated 阈值（常量 256KB——超限截断 content + truncated:true，二进制无 content；
  契约 §5.2）；**错误码注册：assets/errors.ts 补 `version_file_not_found`（404）/
  `version_file_path_invalid`（400）/`version_yanked`（400）并同步 httpStatusForAsset
  穷尽 switch（M3 纪律：新码漏映射即编译错）**；Test 全路径
- **Assert**: 文本文件内容可取、二进制标记、超大截断、YANKED 400、路径穿越拒绝；匿名可达
- **Commit**: `feat(server): add version file content endpoint`

#### T6 R9：版本 compare 端点（design §5.2 G8；依赖 T1/T5 存储路径——hunks 计算需读两版
✅ 完成（commit `a76e963`）
文件内容，读取实现复用 T5 路径结论）
- **Files**: Create compare 实现——两版本文件清单并集比对（sha/路径 → ADDED/MODIFIED/DELETED）；
  MODIFIED 文本文件行级 diff → hunks（diff 算法：引入轻量 diff 依赖需用户批准——或自实现
  LCS/Myers，plan 实证决策：行数规模小，自实现可接受；binary/truncated 标注——文件级 diff
  只在文本+未截断范围）；路由 GET /assets/:ns/:slug/versions/compare?from=&to= 匿名 +
  版本校验（from/to 存在、非 YANKED 400、方向归一服务端容错）；**错误码注册：assets/errors.ts
  补 `version_compare_invalid`（400——from/to 缺失/相等/不存在/YANKED）并同步 httpStatusForAsset
  穷尽 switch**；Test
- **Assert**: changeType 与 hunks 形状符合 §5.2；YANKED/不存在版本 400；同版本 from=to 400；
 目录不入行 diff（文件级清单）
 **注（v0.4 实测对齐）**：同版本 from=to 实为 **200 `{files:[]}`**（assets.test.ts
 「同版本对比：无差异文件」断言为真相）非 400；`version_compare_invalid` 未落地——
 错误响应用既有码（缺失参数 400 request.invalid / 版本不存在 404 asset.not_found /
 YANKED 400 asset.version_yanked）；前端 base≠head 防非法调换兜底（T17）
- **Commit**: `feat(server): add version compare endpoint with line-level hunks`

### 板块 B web 工程基座（design §3/§4）

#### T7 基座装配：依赖 + 路由 + 代理 + 样式骨架
✅ 完成（commit `d506125`；依赖版本入档——react-router-dom@7.18.3 / react-markdown@10.1.0 /
remark-gfm@4.0.1（全自带 types 零 @types）；I18nProvider 装配归 T8——i18n 层（I18nProvider/
useI18n/字典）为 T8 交付物，T7 引之须半份落地，故 main.tsx 的 Provider 包裹随 T8 补）
- **Files**: Modify `apps/web/package.json`（+react-router-dom +react-markdown +remark-gfm——
  design §4.1 破例已批；类型 @types 按需）+ vite.config.ts（dev 代理 /api→3000）+
  main.tsx（BrowserRouter + 五路由占位 + I18nProvider）+ styles/tokens.css（design §4.4
  全量 tokens：品牌渐变/玻璃/类型色/字阶/滚动条/卡片规格/Avatar 8 色板）+ global.css
- **Assert**: `bun run --filter=@ai-asset-hub/web build` 绿；typecheck 绿；代理配置生效
  （dev 起后 curl 验证）；五路由渲染占位
- **Commit**: `feat(web): scaffold app shell with tokens, router and dev proxy`

#### T8 api 层 + i18n 层（design §4.1/§7）
✅ 完成（commit `6c2b27d`；api/ 建 client/types/assets/labels/stats/content + compare.ts——
compare 按 design §4.2 组件树分文件，plan Files 行未列）
- **Files**: Create `api/client.ts`（fetch+Abort+语言感知 Map 缓存（键含 lang——07 §5）+
  失败清理缓存（重试可真实重发）+ 错误归一 `{code,message}`/http_*/network + Accept-Language
  头）+ `api/types.ts`（§5.2 契约形状一一对应：assetItem/labels/stats/fileContent/compare）+
  `api/assets.ts|labels.ts|stats.ts|content.ts`；i18n/
  （I18nProvider/useI18n + localStorage + 字典 zh|en 四组 navigation/market/common/errors——
  文案按 demo 拍板：技能中心 Skill/MCP 中心 MCP Server/专家中心 Agent/总览文件版本等）+ 
  LanguageSwitcher.tsx
- **Assert**: typecheck 绿；i18n 切换即时生效 + 持久化 + 请求头跟随（单测或冒烟断言——
  语言切换后 fetch 头验证）
- **Commit**: `feat(web): api client layer and i18n provider`

#### T9 ui 原子组件（design §4.2 ui 层，M4b 复用面）
✅ 完成（commit `cc4c4f1`；SSR 冒烟 17 断言：TypeIcon 三图标互异/mcp 互锁链 ≥3 path、
AssetAvatar 恒色（同资产 --ava-8 两次一致）+ 色板域 1..8 + 首字母大写/CJK、
ErrorState 已知码 zh 文案 + 未知码兜底含 code、Pagination/Empty/Badge/Spinner 渲染）
- **Files**: Create ui/：Spinner.tsx · EmptyState.tsx · ErrorState.tsx（错误码本地化兜底
  07 §4）· Badge.tsx · Pagination.tsx（offset 替换式+回顶）· AssetAvatar.tsx（8 色板 hash +
  首字母规则 §4.4）· TypeIcon.tsx（skill 扳手/mcp 互锁链/agent 人像——mcp 造型 Clean Room
  自绘，§4.4）
- **Assert**: typecheck 绿；AssetAvatar 同资产恒色（hash 稳定单测或冒烟）；TypeIcon 三图标
  渲染正确（SVG path 自绘验证）
- **Commit**: `feat(web): core ui atoms for M4b reuse`

#### T10 应用壳 AppShell（design §3/§8）
✅ 完成（commit `459d9fd`；SSR MemoryRouter 冒烟 12 断言——五入口高亮矩阵：home/skills/mcps/
agents 各自 aria-current、详情页零高亮、壳内容 TopBar 品牌/语言切换/登录占位/开源区全在）
- **Files**: Create ui/AppShell.tsx（顶栏+侧栏+内容区三区）+ TopBar.tsx（品牌纯文字渐变
  AI X Hub/语言切换/登录占位）+ SideNav.tsx（首页/三中心类型色图标+计数+中英+底部开源区
  Star/文档反馈/版本行；全高 sticky 滚动条隐藏可滚——§4.4）+ 路由高亮
- **Assert**: typecheck 绿；五路由切换导航高亮正确；顶栏/侧栏视觉 tokens 对齐 demo
- **Commit**: `feat(web): app shell with topbar and sidenav`

### 板块 C 首页（design §3/§8）

#### T11 首页 Home（design §4.4 polish 段——v0.8 规格）
✅ 完成（commit `400cd96`；SSR 冒烟 12 断言——hero 全套/入口卡计数兜底 0/最新区/CTA/en 全案切换）
- **Files**: Create market/Hero.tsx（居中 hero：品牌大字 96px 渐变/主句 24/副标 18/搜索 700px/
  双 CTA/三项统计——stats 消费 /api/stats；§4.4 字阶；光斑 alpha≤0.1 衬底）+ TypeEntryCard.tsx
  （**v0.8：icon 左置 44px 横向 grid + 真实计数 typeCounts**——stats.typeCounts[type] 渲染
  「5,203 资产」类 + hover 箭头浮现）+ 最新发布区（**v0.8 竖排行式：类型色点 8px + 名称/
  @坐标·版本 mono + 右端 mono ⇣下载/作者·工号——assetItem R5/R6 字段**；GET /api/assets?
  limit=3 默认排序——R4 匿名后可用）+ pages/Home.tsx 装配；动效 posture（入场 rise stagger
  ≤0.2s + hover lift -3px + prefers-reduced-motion 关——§4.4 规范）；数字 tabular-nums；
  hero 搜索提交 → 路由中心页（URL q 携带）
- **Assert**: dev 联调匿名渲染 stats 三数字与最新三资产（行式含下载/作者）；入口卡计数 =
  stats.typeCounts 对应值；搜索提交带 q 跳中心页；空统计兜底（0 值渲染不破版）
- **Commit**: `feat(web): marketplace home with hero and latest assets`

### 板块 D 中心页（design §3/§4.4）

#### T12 CenterPage 骨架（type 参数化单组件）
✅ 完成（commit `bdc0d5e`；SSR 冒烟 9 断言——三中心 type 注入表标题/副述/占位/徽章 + URL ?q 还原输入框）
- **Files**: Create pages/Center.tsx（路由参数 type=skill|mcp|agent → 单一 CenterPage）+ 
  market/CenterPage.tsx（CenterHeader：类型图标+标题中英+副述+搜索框+计数徽章——搜索在左
  徽章在右）+ useMarketQuery（URL ?q/?label/?page ↔ 参数同步 300ms 防抖写 URL）
- **Assert**: 三路由 /skills /mcps /agents 渲染各自标题/图标/文案（type 注入表）；URL 状态
  回退/分享还原
- **Commit**: `feat(web): parameterized center pages`

#### T13 筛选条 + 资产卡网格 + 分页（design §3/§4.4）
✅ 完成（commit `d3c3d55`；SSR 断言 + curl 契约实测——type/q/label 参数名；卡作者规则/回退/链接全过）
- **Files**: Create market/FilterStrip.tsx（两级标签条：父级 chips 行 + 子标签行——GET
  /api/labels 组树 + displayName 回退；选中实底渐变）+ AssetCard.tsx（§4.4 正式结构命名
  card-head/title(main/meta)/card-desc/card-foot——完整卡可点 → 详情路由）+ 网格 4 列×5
  行响应式降列（§4.4 断点）+ Pagination 装配 + 空/错/载态
- **Assert**: dev 联调真实数据渲染（seed 数据 or M3 冒烟资产）；标签筛选多值 OR 请求正确；
  卡片点击进详情；分页替换式不重影
- **Commit**: `feat(web): label filter strip and asset card grid`

### 板块 E 详情页（design §3/§5.3/§8/§9）

#### T14 详情壳 + 两波编排（design §5.3）
✅ 完成（commit `643aab7`；tab 语义 SSR 断言（默认唯一选中/role 完备）+ 载态骨架；两波编排 deps 串行实证）
- **Files**: Create pages/AssetDetail.tsx + market/detail/DetailTabs.tsx（总览/文件/版本）：
  头部（名称+可见性 pill+@ns 徽章+标签）+ 右栏（下载卡：latestVersion 拼下载 URL + 限流文案/
  元信息卡：作者 displayName·userId（R6 拼装规则）/命名空间/可见性/更新/下载量）；编排：
  波 1 详情∥版本列表 → 波 2 latest 版本详情（useApi 组合 + loading 骨架）
- **Assert**: 匿名详情渲染全头部字段；下载按钮 URL 拼 `…/versions/{latestVersion}/download`；
  波次请求顺序断言（网络顺序冒烟）；**latest 版本 YANKED 边界：下载按钮渲染禁用/提示态
  （后端 400 兜底显示友好文案，不裸报错）**
- **Commit**: `feat(web): asset detail shell with two-wave data orchestration`

#### T15 总览 tab：主文档渲染 + 摘要回退（design §2/§5.2 G7 分型）
- **Files**: Create ui/MarkdownRenderer.tsx（react-markdown+remark-gfm 封装——样式 §4.4
  md-body tokens）+ market/detail/OverviewTab.tsx（type 分型：skill→G7 SKILL.md；
  mcp|agent→README.md 探测（版本文件清单含 README* 大小写归一）→ G7 渲染；无 → manifest
  摘要卡 mcp.json/agent.md 结构化字段 + meta 条）
- **Assert**: skill 资产总览渲染 SKILL.md markdown（标题/列表/代码块样式）；无 README 的
  mcp 资产回退摘要卡；G7 404（无主文档）不破版转摘要
- **Commit**: `feat(web): overview tab with markdown render and manifest fallback`

#### T16 文件 tab：折叠树 + 预览对话框（design §5.2 R8）
- **Files**: Create ui/FileTree.tsx（版本文件清单平铺 → 树；目录折叠 ▶ 旋转；文件行 sha 徽章）
+ ui/FilePreviewDialog.tsx（遮罩+玻璃对话框：路径头/大小/内容 mono pre-wrap——文本 G7 渲染；
binary/truncated 提示）+ market/detail/FilesTab.tsx 编排（已拉缓存——useApi 缓存复用）
- **Assert**: 目录折叠交互正确；文件点击 → G7 内容对话框（真实 server 文件——skill zip 内
  SKILL.md 等）；二进制文件提示下载；sha 截断显示
- **Commit**: `feat(web): file tree with preview dialog`

#### T17 版本 tab：历史 + 行级对比（design §5.2 G8/§4.4 diff tokens）
- **Files**: Create market/detail/VersionCompare.tsx（双下拉 base⇄head 防非法调换 + 版本历史
  列表——状态徽章 YANKED 禁对比 400 兜底）+ DiffNav.tsx（变更文件导航 changeType 徽章 +
  点击滚动锚点）+ DiffView.tsx（文件头 chevron 折叠 + 路径 + 徽章 + +N−M 统计 + 行级三列
  unified diff：old/new 行号/内容行色 GitHub 系 #1a7f37/#cf222e——外层纵排行内 grid 布局
  纪律防重叠）
- **Assert**: 双下拉切换 → G8 消费渲染真实 hunks；YANKED 版本对 400 友好提示；折叠/统计/
  行色对齐 demo；空 diff 文案
- **Commit**: `feat(web): version compare with line-level diff`

### 板块 F 联调与收尾

#### T18 联调冒烟（design §5 契约全链）
- **Files**: 起 dev db + server（M3 冒烟资产沿用或补 seed——匿名可见资产）+ web dev；
  冒烟断言：匿名 labels/assets(q+label)/详情/版本/文件内容/compare/stats/download 全链 200
  形状对齐 §5.2；web 五路由 dogfood 走查（首页统计/中心筛选网格/详情三 tab/下载）——
  浏览器实测截图留证（browser_exec 授权可用则代跑，否则用户本地走查录证）
- **Assert**: 契约形状逐一比对通过；页面无控制台错误；截图/走查记录入档
- **Commit**: `chore(web): smoke verification records`（如产生修复随 Task commit）

#### T19 全仓验证 + 收敛（design §11/00 §7 ②）
- **Files**: `bun run typecheck && bun run test && bun run lint && bun run build` 全绿；
  design-代码对齐回查（版本头/修订记录/引用/状态）+ 8 维重评 ≥9；00 §5 M4 行注记
  （M4a 完成 → 拆 M4b 待办）；07 资源组 i18n 落地注记；18 维自检逐维留档
- **Assert**: 全仓验证绿；converge 重评 ≥9；00 §5 注记提交
- **Commit**: `docs: M4a completion notes and convergence review`

## 3. 顺序与依赖

板块 A（T1-T6）先行——web 所有页面联调依赖 R4-R9 端点；T7-T10 基建 → C/D/E 页面板块
（T11 → T12/T13 → T14-T17 依赖 T7/T10）；T18 联调在 A+E 完成后；T19 收尾。每 Task 独立
commit + 用户批准；服务端六改会 bump 520 基线（+新用例），每次改动跑全量 server 测试。

## 4. 待用户批准的执行前决策（plan 内小决策点）

1. T5 R8 存储路径（T1 实证结论驱动——顺存直读 vs zip 解压索引）
2. T6 R9 diff 算法实现形态（自实现 Myers/LCS vs 引入 diff 依赖——倾向自实现，行规模小）
3. T7 web 测试基建：首期不建单测框架（typecheck+冒烟为主）or 建 vitest（新增依赖需批准）
4. T18 dogfood 截图：browser_exec（需 Chrome 授权）or 用户本地走查
