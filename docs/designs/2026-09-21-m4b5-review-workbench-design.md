# M4b-5 审核批：审核工作台（队列 + 共享详情）—— 批设计

> Date: 2026-09-21
> Updated: 2026-09-22（**v0.14：diff 观感追加（字号/行高定值 · 对标 GitHub 实测）** —— ① **F195** 🟡：库 CSS **只定字体族与 `line-height:1.5`、不定字号** ⇒ 字号继承**根值 16px**（比同页正文 13px 还大）⇒ §4.10 定值 **字号 `12px` · 行高 `20px`**：字号与 **GitHub diff 实测值（12px · 真浏览器量 `github.com/…/commit/712c118`）一致**；行高 20px（1.67）为**有意偏离**（GitHub 用 24px/2.0，但本面主列实宽约 755px 的窄列下偏疏朗）· 值可单点回改 ② **F196** ⚪：split **对侧占位格的红竖线 = 上游默认渲染**（官方 README 语义 "Gutter with no content" vs 默认样式自画 2px 红线 · 本仓已用**最新版 3.3.3** · 上游 issue 无相关报告）⇒ **用户拍板保留官方设计与做法、不加覆盖**（决策留痕 + 日后两条关闭路径） ③ §9.8 回填更新（`diff-tokens.css` **85 → 117** 行 + 字号/行高行） ④ 处置累计 **51 项**）
> Updated: 2026-09-22（**v0.13：验收收口回填（T11 实测 · §9.8）** —— ① 八步门禁 **8/8 exit 0**（`test` **562 pass / 0 fail** · `doc-audit` **70 PASS / 0 FAIL**）② 本批 dogfood **62 PASS / 0 FAIL / 0 超时**（全量 · 含 `G10⑭` 门户侧同件）；分段 `SMOKE_ONLY=G10` **15/15** ③ §9.8 实测回填：i18n **404/404**（`review` 61 · 差集 0 · 组 12）· 件表 / 脚本 `wc -l` · gzip **54.6KB**（估 ≈56KB ⇒ 偏差 **2.5%**）· `refractor` 注册 **21** 语言 · 阈值 **700** · 高亮 **555 span / 6 色** ↔ 关 **0** · `latestVersion` 两态 · patch **3 行头无 `index`**；**未实测 2 项如实登记**（单文件耗时阈值 · patch 长度上界）④ **F192**（`G10⑭` 探针未按容器作用域 + 一次性 `sleep` ⇒ 假失败，已修为**作用域 + 轮询**）· **F193**（`m4b4` G13 探针过时：搜索改**折叠式** ⇒ 须先展开；**正向验证产品正常** · **非本批引入**（结构改于 HEAD 内 `b30607e`）· 用户拍板「修探针」已落）· **F194**（本批 2 脚本未过 `format:check` + 迁移 2 文件 `organizeImports` 2 error ⇒ 门禁抓出并修）⑤ 处置累计 **49 项**）
> Updated: 2026-09-22（**v0.12：实现期订正（T10 · dogfood 实证）** —— ① **F190** 🟡 退役**死键** `review.preview.failed`（零消费点）⇒ §4.4 改「复用共享对话框既有错误面」· i18n **405 → 404**（`review` 组 **61**）② **F189** 🟡 §9.6 造数清单**缺可比态数据** ⇒ 追加 ⑦⑧ + 动作专用 ⑩–⑬（隔离）+ ⑥ B1 语义订正（上传者须为 owner 本人）③ **F191** ⚪ 登录限流（20次/15分钟 · in-memory）⇒ 同轮多次重跑会打满、`m4b4` 回归待重跑 ④ G10 实证：契约/`split`/高亮两态/折叠/容器回退/两态/**门户侧同件** 全绿）
> 2026-09-22（**v0.11：实现期订正（T5/T6 · 真浏览器实测 3 处）** —— ① **F181** 🔴 §4.10 补「**必须交付主题 CSS**」段（缺它 ⇒ token 同色 = 高亮形同虚设；实测色数 1 → 6）② **F180** 🟡 回退阈值 **960 → 700**（门户主列实测 755 ⇒ 960 会让 split 永不出现）③ **F182** ⚪ G10 ③ 口径订正（关 ⇒ **0 token span**）④ 处置累计 **43 项**）
> 2026-09-22（**v0.10：实现期订正（T1/T2 落地发现的 2 处描述不准）** —— ① **F175**：§5.1b 的「`submittedByName` `null` 兜底用例」**不可构造**（`submittedBy` 有 FK + 用户仅软删 ⇒ 行恒在）⇒ 测试面改「字段在场 + 值 = `user.name`」② **F176**：§5.1b 组成式「2 个 `leftJoin`」实为 **1 个 `asset_version` 自连接**（`asset` 与 task 那版版本**主查询本已 join**）⇒ 订正并申报**本仓首个 `alias()` 用法** ③ Status 行更新（定稿待口令 + 实现期进度）④ 处置累计 **37 → 39 项**）
> 2026-09-22（**v0.9：grilling 第二轮 + P1–P6 收口（G-Q8–G-Q14 · 用户「全按推荐」）** —— ① **G-Q8** base 字段真码不存在 ⇒ **§5.1b** 加 `latestVersion`（仅详情 · 2 join）⇒ 服务端 **3 → 4 处** ② G-Q9 两态 · G-Q10 **容器宽回退**（消掉自造 960 视口断点）· G-Q11 patch **3 行头**（不产 `index`）· G-Q12 缓存复位钩子 · G-Q13 授权夹缝内联降级 ③ **P1/P3/P4/P5/P6 落地**（「审核队列」→「审核管理」**12 处**统一 · `FileTree` +1 加性 prop · 时间格式登记 · 互审注记改写）④ §9.3 G10 断言扩至 **9 条** ⑤ 登记 **F170–F173** ⇒ 处置 **37 项** ⑥ **§11.9 复评 9.86** ⑦ **零实现改动**）
> 2026-09-22（**v0.8：换靶整体体检 + 13 项连锁修复（F157–F169）** —— ① **撤回 §11.7 的 9.88**（自检口径过窄）⇒ 修复前 **9.40** → 修复后 **9.79** ② 修 **3 🔴**（§1.3 非目标冲突 · §4.2 段序编号 · §1.3 编号重叠）+ 8 🟡 + 2 ⚪ ③ §1.3 含项重排 **1–10** · §4.2 **三段竖排** · §4.7 树补 `DiffWorkspace` · §9.7b 扩为 R2+F156 · §2.1 Q11/§2.3 连带订正 · 处置累计 **33 项** ④ §11.8 新增复评段（含**两条机制留痕**）⑤ **零实现改动**）
> 2026-09-22（**v0.7：diff 能力现代化 —— 选型定案 + 规格落库** —— ① 自研 LCS DP / 自绘 DiffView·DiffNav **整体退役**，改用官方件：服务端 **`diff`(jsdiff) 9.0.0**（产标准 unified diff 文本）+ 前端 **`react-diff-view@3.3.3` + `refractor@3.6.0`（按需注册）** ② 契约 **破坏性替换** `CompareFile.hunks[]` → `patch: string`（消费者 7 处，§5.5）③ **默认左右对比（split）** + 窄屏回退 + 切换钮 ④ 服务端新增 §5.5 第 3 处改动 ⑤ §4.10 新增变更对比规格（审核详情「变更对比」卡同挂）⑥ §6 i18n `review` 再 **+9** ⇒ 净增 **57** · 全仓 **405** ⑦ §9 加「按需装配构建期体积实测」+ token 高亮回归断言 ⑧ §11.7 **复评 9.88** ⑨ **零实现改动**（PoC 物料不进仓））
> 2026-09-21（**v0.6：R2 跨批契约变更 —— 管理档可自审** —— ① **彻底移除防自审**（§4.6.1：删 `isSelfReview` / `isSuperAdmin` 传参 / `review.self_review` 错误码 + 2 处测试同步）② Q9 作废 ⇒ **权限矩阵**（新键 `review.adminOnly`）③ 服务端 **1 处 → 2 处**（§5.4）④ i18n errors **6 → 5** · `review` 净增 **48** · 全仓 **396** ⑤ 偏离四眼原则**代价 + 复归点**写明 ⑥ §9.7b 规范同步 ⑦ §11.6 **9.78** ⑧ 代码改动随实现期）
> 2026-09-21（**v0.5：原型评审轮落地（F151）** —— ① 物料**不进仓**（`__proto/` 4 文件 + `main.tsx` 2 条 DEV 路由 · 入口 `/__proto/m4b5` 与 `/detail?id=`）② 口径 = 真仓真件 + 假数据 + 状态开关 ③ **16 张截图 · 零 JS 异常**（逐态证据入 §2.1d）④ **新增待拍板 P1–P5** ⑤ typecheck 4/4 · biome 干净 ⑥ **零产品码改动**）
> 2026-09-21（**v0.4：规则层对齐 + 视觉映射补录（W1/W2）** —— ① **F154** 主 design :180 迁移规则补「**线框除外**」（主 design **v1.62**，规则 ↔ 实践对齐）② **F155** 补 **§4.5.1「→ §4.4 token 映射」10 行表**（取值全按件内真码现值 · 零新 token）③ §11.5 **复评 9.79** ④ 处置累计 **20 项** ⑤ **零实现改动**）
> 2026-09-21（**v0.3：UI 口径校正（U1/U3）** —— ① **线框口径回到仓例**（F150）：删自画两张 ASCII ⇒ 立 **§4.9「线框 ↔ 批 design 差异声明」6 行表**（以批 design 为准 · 引用不复制 · 照 M4b-3 §4.4.2）② **跨文档对账揪出并订正主 design 2 处硬错**（F152/F153 · 主 design **v1.61**）：族主文档口径与真码不符（`mainDocPath` 仅两档）· §12 详情线框缺撤回钮 + 拒绝→驳回 ③ **§2.1d 可点原型评审登记待做**（F151）④ §11.4 **复评 9.74** ⑤ 处置累计 **18 项**（F129–F142 + F150–F153）⑥ **零实现改动**）
> 2026-09-21（**v0.2：grilling 复核轮** —— 门禁中段「8 维 ≥9 → grilling → 重评 ≥9」：① **7 条前沿问题全闭合**（G-Q1–G-Q7 · §2.1b）② **5 处客观矛盾当场处置**（F137–F141）③ 键表补 `emptyHint` ⇒ 全仓 **396 键** ④ 编 **F129–F149** ⑤ §11.3 **复评 9.68**（首稿 9.60）⑥ **零实现改动**）
> 2026-09-21（**v0.1：对齐收口首稿** —— 12 条待拍板项 Q1–Q12 逐条「按推荐」全闭合（§2.1）；**零服务端改动 → 1 处加性字段**（`submittedByName`，§5）；**本批即主 design 定稿条件 ②「三族适用性实证」的闭合点**（§4.3 / §9.5）。本版**零实现改动**）
> Status: **定稿待口令**（8 维 **9.86** · grilling 两轮前沿清空 · 见 §11.9）；**实现期收口** —— **T1–T11 ✅**（八步门禁 **8/8** · dogfood **62/0** · 零回归 `m4a` 34/0 · `m4b3` 43/0 · `m4b4` **88/1 → 89/0**（修探针后归零））· **T12 文档同步进行中**（见批 plan `docs/plans/M4b-5-review-workbench.md`）；实现期订正累计 **49 项**（F192/F193/F194 见 §9.8 回填块）
> Scope: M4b-5（`docs/00` §5 子行 / 主 design §2.3 拆批表）—— 审核工作台：**队列 `/admin/reviews`** +
> **共享详情 `/reviews/:id`**（分型 manifest 卡 + 文件树 + 预览 + 通过/**驳回**/撤回 + **权限矩阵**（管理档可自审 · R2））
> 引用链：本文档 → 主 design `2026-09-10-m4b-admin-console-and-auth-design.md`
> （§2.1 R1/R6-c · §2.2 M4b 边界 · §2.3 拆批表与批件登记表 · §2.4 U1/U3/U5 · §4 入口显隐 ·
> §5.1 页面职责矩阵 · §5.2 路由清单与响应式断点 · §6.2 组件树 · §6.3 复用与升级边界 ·
> §7.1 端点契约表 · §7.2 R6 系列 · §7.3 页面数据编排 · §8 接口变更总览 · §9 数据获取与状态约定 ·
> §10.1 状态映射 · §10.2 信息架构与交互要点 · §11 i18n 资源规划 · §12 线框）
> → 规范 `docs/00` §5/§7 · `docs/05-identity-access.md` §6.4 · `docs/08-data-model.md` §6/§7 →
> M4a design `2026-09-09-m4a-marketplace-portal-design.md` §4.4（视觉 SSOT，引用不复制）
> **批间门（出口五件）**：① 批 design 8 维 ≥9 定稿 ② 批 plan Task 全绿 ③ 五门禁逐项 exit 0
> ④ dogfood/观感 ⑤ **整体审计**（收尾全仓覆盖式扫描：findings 逐条登记 + 处置，不留未决项）——
> 口径见 `docs/00` §5/§7 ② 与主 design §2.3「批间门」
> 前置：**M4b-1 ✅ / M4b-2 ✅ / M4b-3 ✅ / M4b-4 ✅**（四批出口五件全绿）⇒ 本批开工条件已满足

---

## 1. 背景与批界

### 1.1 位置与依赖链

M4b（管理后台）拆八批，顺序即依赖链 **1 → 2 → 3 → 4 → 5 → 6 → 8 → 7**（主 design §2.3）。
本批为**第 5 批 · 审核批**：

- **上游（已交付）**：M3 已铺完审核管线**全部服务端端点**（队列 / 我的提交 / 详情 / 三动作）；
  M4b-1 落组件底座；M4b-2 落认证与守卫（含 `/reviews/:id` 所在的 `ROLE.USER` 段）；M4b-3 落
  「我的提交」页（进详情入口）；M4b-4 落工作台「待审核」卡（指向本批队列）与表格族统一。
- **本批交付**：把上述端点接成**双面共享工作台**——管理档判（队列 → 详情 → 裁决）、提交人跟
  （详情 → 撤回）。
- **下游**：M4b-6 治理批（标签定义 / 审计浏览 / 资产管理）· M4b-8 发布批 · M4b-7 控制台视觉打磨
  （收尾，与完整 converge 同批）。

**本批不可替代的意义**：它是**主 design 定稿条件 ②**「三族适用性实证」的闭合点 —— 载体 =
审核详情的**分型 manifest 卡**（§4.3）。该条件闭合后，主 design 方由用户批准转定稿。

### 1.2 入口现状（真码实测，2026-09-21）

**路由与守卫（`apps/web/src/main.tsx`）**

| # | 现状 | 真值 |
|---|------|------|
| 1 | `/admin/reviews` | `ComingSoon` 占位（`:129-138`）· DEV 角标 `'M4b-5'`（`:59`） |
| 2 | `/reviews/:id` | `ComingSoon` 占位（`:114-123`）· DEV 角标 `'M4b-5'`（`:58`）· **在 `RoleGuard minRole=USER` 段内**（`:104`） |
| 3 | `/admin` | `<Navigate to="/admin/reviews" replace>`（`:128`）—— 已就位，本批不动 |
| 4 | 侧栏「管理」组「**审核管理**」条目 | **已存在**（`components/ui/navItems.tsx:111-112`，组门槛 `role >= 10`）⇒ 本批不动导航 |
| 5 | 顶栏页面标题区 | `TopBar.tsx:69-70` 已含 `/reviews` ⇒ 详情页顶栏渲染 `<h1>`「审核详情」；`titleOf` 的 `section` 字段**自 v1.44 起不再渲染**（`TopBar.tsx:87-90` 只用 `crumb.title`）⇒ **死数据**（登记见 §9.8） |
| 6 | `DEV_BATCH` 表 | 5 条（`:55-63`），消费点仅 4 处（`:120`/`:135`/`:145`/`:155`）⇒ **`'/dashboard/assets': 'M4b-4'` 为死条目**（该页已换真页，漏删） |

**服务端端点（`apps/server/src/http/reviews.ts`，163 行 —— M3 已交付，本批零新增端点）**

| 端点 | 权限面 | 参数 / 体 | 响应 |
|------|--------|----------|------|
| `GET /api/reviews` | `role >= ADMIN`（`:50`，不足 ⇒ 403 `review.access_denied`） | **仅** `status` / `limit`（默认 20，max 100）/ `offset`（`:33-36`）—— **无 `q`、无 `sort`** | `{items, total, limit, offset}` |
| `GET /api/reviews/mine` | 登录面（身份面，无权限码） | 同上 | 同上 |
| `GET /api/reviews/:id` | 管理档 ∨ **提交人本人**（`:89-98`）· 不存在 404 / 越权 403 | — | `ReviewDetailItem` |
| `POST /api/reviews/:id/approve` | 管理档（**含自审** · R2 后**无防自审**）+ scope `review:approve`（`:109`） | `{comment?}` ≤2000（`:38`） | 200 `{taskId, status:'APPROVED', version}` |
| `POST /api/reviews/:id/reject` | 同上（`:132`） | `{comment}` **必填** 1..2000（`:39`） | 200 `{taskId, status:'REJECTED', version}` |
| `POST /api/reviews/:id/withdraw` | 提交人本人 / owner / 管理档（服务内判）+ scope `review:submit`（`:152`） | — | **204** |

**详情响应字段**（`review/query.ts:32-55`）：`taskId` · `status` · `reviewVersion` · `submittedBy` ·
`submittedAt` · `assetSlug` · `assetVersion` · `versionStatus` · `versionId` · `reviewComment` ·
`assetType` · `manifestJson` · `files[{filePath,fileSize,sha256}]`

**本轮实测缺口（4 项 · 本批须处置或登记）**

| 缺口 | 真值 | 处置 |
|------|------|------|
| G1 提交人显示名 | `reviewTask.submittedBy` = 用户 id（`db/schema/governance.ts:45-47`，varchar(128) FK→`user.id`）· `LIST_SELECT` 原样返回（`review/query.ts:62`）⇒ **无显示名字段**；全仓**无用户查询端点**（`app.ts:126-211` 路由清单实测） | **§5 加性字段 `submittedByName`** |
| G2 提交人文件预览授权 | 文件内容端点先过 `assertAssetReadable`（`http/assets.ts:146-160`：非 ACTIVE 授权集 = owner ∨ 管理档 ∨ 超管，**不含**「版本上传者」）⇒ 资产非 ACTIVE + 提交人 ≠ owner 时**详情 200 但预览 404** | **§4.4 单点判定 + 运行时兜底**；边界登记 §9.8 |
| G3 撤回按钮判据 | 详情响应**不含** `asset.ownerId` ⇒ 前端不可判「我是不是 owner」（服务内 withdraw 授权含 owner） | 前端按「提交人本人 ∨ 管理档」近似 + **提示性守卫声明**（§4.6） |
| G4 队列排序 / 搜索 | `GET /api/reviews` 无 `sort` / `q` 档位 | **队列不开排序头、不做搜索**（§4.1） |

**关键事实（用于本批设计判断）**

- **id 形态**：LDAP 建号 `userId` = **工号**（`auth/ldap.ts:12-17` 注释「M4b-pre design §5.2：工号 = `userId`」·
  `ldap.ts:39` `userIdAttr` 默认 `sAMAccountName`）· OIDC = `usr_oidc_<uuid>` ·
  dev 种子 = `usr_<uuid>`（`db/seed.ts:42`）⇒ **企业面 id 人可读**
- **显示名来源**：`user.name` = LDAP `displayName`（`auth/ldap.ts:91-96` 属性链 `displayNameAttr → cn → userId`；
  `plugins/ldap-credentials.ts:200-208` 建号写入 `name: displayName`）· **每次登录自动同步**
  （`plugins/ldap-credentials.ts:179-183`：显示名漂移即 update）⇒ 读本地列即可，**不在读面实时查 LDAP**
- **资产面先例**：`ownerDisplayName`（`http/asset-item.ts:46`，`assets/service.ts:131-142` 用 `inArray` 批查 `user.name`）
- **task 状态 → 版本态 1:1**（`review/service.ts`）：`PENDING`→`PENDING_REVIEW`（`:85,93`）·
  `APPROVED`→`PUBLISHED`（`:181,192`）· `REJECTED`→`REJECTED`（`:236,247`）· `WITHDRAWN`→`UPLOADED`（`:314,321`）
- **防自审（R2：本批已移除 · 2026-09-21 拍板）**：原 `auth/rbac.ts:69-77` `isSelfReview(submittedBy, reviewedBy, isSuperAdmin)`
  ≡`{ if (isSuperAdmin) return false; return submittedBy === reviewedBy; }`，调用方 `http/reviews.ts:117,140` 传
  `isSuperAdmin: role >= ACCOUNT_ROLE.SUPER_ADMIN`。**本批删除该机制**（动因 / 改动面 / 偏离代价见 §4.6.1）

### 1.3 批界

**含（本批交付）**

1. **审核管理** `/admin/reviews`：7 列（§4.1）· 状态筛选 · 分页 · 列开关（保护 2 项）· 操作列真链接进详情
2. **共享详情** `/reviews/:id`：面包屑（按「谁的面」分叉）+ 页头 + 两栏（主列 = 分型 manifest 卡 +
   **变更对比卡** + 文件树〔**三段竖排**，序见 §4.2〕/ 右栏 = task 元信息卡 + 动作卡）
3. **分型 manifest 卡**（三族：skill / mcp / agent —— **定稿条件 ② 载体**，§4.3）
4. **文件树 + 预览**（迁 `ui/` 两件 + 预览可用性单点判定 + 不可预览降级，§4.4/§4.5）
5. **变更对比（版本 diff）**：**双处挂载**（门户「版本」tab 升级 + 审核详情新卡）· 默认**左右对比** · 高亮可开关 · 折叠懒渲染（§4.10）
6. **三动作 + 权限矩阵**（§4.6 —— 含 **R2 跨批契约变更**：移除防自审）
7. **服务端 4 处**：① 加性字段 `submittedByName`（读面三面共享 · **零迁移**）② **加性字段 `latestVersion`**（**仅详情查询** · G-Q8 · §5.1b）③ **R2 权限语义变更**（移除防自审）④ **对比引擎替换**（自研 LCS DP ⇒ `diff`(jsdiff)）**含 1 处破坏性契约变更**（`files[].hunks[]` → `patch`）（§5）
8. **diff 能力现代化**：前端自绘 `DiffView`/`DiffNav` **退役** ⇒ `react-diff-view@3.3.3` + `refractor@3.6.0`（按需 21 语言）；服务端自研算法退役（§2.1d / §3.2 / §5.5）
9. **跨批遗留处置**：删资产详情页「审核」占位块 + 键 `assets.admin.reviewGroup` 退役（§3.2 / §6.3）
10. **i18n**：`review` 组扩（**净增 57**）+ **2 键退役**（`assets.admin.reviewGroup` + `errors.review.self_review`，§6）· dogfood 新脚本 + 造数脚本（§9）

**不含（明确非目标 —— 防范围漂移）**

- **行内评论 / 行级批注**：主 design §6.3 口径保留 —— 审核详情首期**不提供行内评论**（**本条不涉及版本 diff 面**：
  diff 可视化已纳入本批，见含项 **5 / 8**）。
  ⚠️ **口径更正留痕**：v0.6 及以前本条写作「**行级 diff** … ⇒ `VersionCompare` + Diff 组件群**留 `components/market/detail/` 不动**」
  —— 该写法已被 **v0.7（F156）作废**（组件群**改向 + 退役**，非「不动」）；本次按新口径改写，原文留此以免读者据旧版执行
- 标签定义 / 审计浏览 / 资产管理页：归 **M4b-6**
- 发布页：归 **M4b-8**
- 视觉打磨（气质 / 密度 / 类型色的最后一公里）：归 **M4b-7**；本批出口的 `dogfood/观感` 只做**合规核对**，
  不做审美定稿（主 design §2.3「视觉职责边界」）
- token 面（CLI / scope 实跑）：归 **M5**；本批只做文档级对照表（§7.2）

**本批性质**：**纯消费批 → 4 处服务端改动**（① 读面加性字段 `submittedByName` ② **仅详情**加性字段 `latestVersion` ③ R2 权限语义变更 ④ 对比引擎替换含破坏性契约变更）
—— 原报「零服务端改动」，因 G1 显示名缺口经用户拍板改为**读面加性字段**（v0.1）⇒ 后经 **R2**（v0.6）、**diff 现代化**（v0.7）与 **G-Q8**（v0.9）扩为 4 处；**零迁移 · 零新端点**（权限语义**有**变更 —— 见 ③）。

---

## 2. 拍板结果（本批）

### 2.1 对齐决策表（2026-09-21 · 用户逐条「按推荐」）

| # | 决策点 | 拍板结果 | 落点 |
|---|--------|---------|------|
| **Q1** | 批件名与落点 | design `docs/designs/2026-09-21-m4b5-review-workbench-design.md` · plan 预定名 **`M4b-5-review-workbench.md`**（与上表 design 落同层 `plans/` 目录 · **立 plan 阶段创建**；backlog 预定名逐字 + 立项日；与四批先例零漂移） | 本文件 · §9.8 |
| **Q2** | 队列列集合与排序头 | **7 列**（坐标 / 类型 / 状态 / 姓名 / 工号 / 提交时间 / 操作）· **不开排序头**（服务端无 `sort` 档位；`submittedAt desc` 即队列语义）· **开列开关**（保护 **2** 项 = 坐标 + 操作槽列）· 分页 `total > limit` 才渲染 · §4.9 差异声明 + U5 半句订正 | §4.1 · §9.7 |
| **Q3** | 提交人取值口径 | **加性字段 `submittedByName`**（§5）· 队列**两列**（姓名在前、工号紧随）· en 列头 `Employee ID` · 姓名缺 ⇒ 「—」· 工号 `usr_` 前缀 ⇒ 截断 + `title` 全值 · 两列**均非保护列** · 详情页右栏**两行键值** · 批定性改「1 处加性字段」（**后经 R2 / F156 扩为 3 处** ⇒ 现行见 §1.3 本批性质） | §4.1/§4.2 · §5 · §6.1 |
| **Q4** | 提交人文件预览授权边界 | **守零服务端改动**（本条不再加）· 判定单点 = 详情响应的 `versionStatus`（§4.4 表）· 不可预览 ⇒ 文件树仍渲染（`sha256` 结构可审）· **不渲染预览动作**（不落灰钮）· 文件区顶部说明行 · 运行时兜底（3 码 ⇒ 弹层内联提示，**不破版**）· B1 边界登记 · **不加下载入口** | §4.4/§4.5 · §9.8 |
| **Q5** | 详情页版式 + 面包屑 + 返回 + 门户两件关系 | **B = 块级复用 + 新薄页**（不整件复用门户详情页；不复用 `DetailTabs`）· 两栏 `grid-cols-[1fr_320px]` + `max-[1100px]:grid-cols-1` · 面屑 + `PageHeader`（title = slug · v版本 / desc = 类型 / 动作槽空）· 面包屑三段按「**谁的面**」分叉 · 顶栏**零改动** · 返回 = 面包屑第 2 段 + 动作成功跳回来源 | §4.2 · §4.7 |
| **Q6** | 分型 manifest 卡实现方式 | **B = 复用逻辑 + 新件**：复用 `mainDocPath`/`manifestFields`（已 export）· 新写 `console/reviews/ManifestCard.tsx` · mcp 专属 `servers` 块 · 卡**不拉正文** ⇒ 不可预览态天然不破版 · `OverviewTab` **零改动**（门户零回归） | §4.3 |
| **Q7** | `FileTree`/`FilePreviewDialog` 落位 | **A = 三件一起迁 `ui/`**（含 `fileTreeNodes.ts` —— 只迁两件会造 `ui/` → `market/` 反向依赖）· 3 行 import 同步（`FilesTab` 2 + `VersionCompare` 1）· `FilesTab` **本体不迁**（含门户特有语义且无降级能力）· 复跑门户 dogfood · §6.3 影响面订正 | §4.5 · §3.1/§3.2 · §9.7 |
| **Q8** | 三动作交互形态 | **A = `ConfirmDialog` 升三态枚举**（`reason?: 'none' \| 'optional' \| 'required'`，删除 `requireReason` **不留兼容别名**）+ 1 行调用点同步（`AssetDetail.tsx:457`）· 通过 = 可选意见 / 驳回 = 必填原因 / 撤回 = 去红 · 按钮层级 `default` / `outline` / `ghost` · **仅 `PENDING` 渲染动作** · 成功提示带版本号 | §4.6 |
| **Q9** | ~~防自审交互~~ ⇒ **权限矩阵** | ⚠ **2026-09-21 追加拍板「管理也能审自己」⇒ 本项作废重写**（R2 · 见 **§2.1d P6** / **§4.6.1**）：`lib/review-permissions.ts` **不再含自审分支**；**管理档对任何 `PENDING` 三动作照常渲染**；非管理档提交人自查 ⇒ 仅撤回 + 说明行「**仅管理员可审核**」（新键 `review.adminOnly`）；队列仍**不**标注 | §4.6 · §2.3 |
| **Q10** | 路由与遗留清理 | **零新增路由**（两条 `ComingSoon` → 真页）· 新页扁平命名 `pages/ReviewQueue.tsx` + `pages/ReviewDetail.tsx` · `DEV_BATCH` **删 3 条**（两条本批 + **`/dashboard/assets` 死条目**）· `ComingSoon` 件保留（labels/audit 仍消费） | §3.3 · §9.8 |
| **Q11** | i18n 口径 + token scope | **零新组**；`review` 组扩（§6.1 组成式）· 领域文案自持 / **组件层固定文案跨组复用 `market.*`**（+0 键）· **2 键退役**（`assets.admin.reviewGroup`〔随占位块删除〕+ `errors.review.self_review`〔R2 连带 · v0.6〕）· 孤儿键转正（`review.reason`/`review.empty`）· token scope **文档级对照表**（§7.2） | §6 · §7.2 |
| **Q12** | 验证与造数策略 | 造数 `docs/smoke/scripts/m4b5-seed-reviews.ts`（**专用账号 + 三族资产 `HIDDEN`** ⇒ 零门户/零「我的资产」污染）· dogfood `m4b5-review-dogfood.ts`（**G1–G10** + `SMOKE_ONLY` 分段）· 服务端测试 **1 组** · 定稿条件 ② 证据单列（§9.5） | §9 |

### 2.1b grilling 复核记录（2026-09-21 · 7 条 · 用户逐条「按推荐」）

| # | 问题 | 结论 |
|---|------|------|
| **G-Q1** | 空态第二行键缺口（`review.emptyHint` 未入键表 ⇒ 内部矛盾） | **补键**（保持两行 · 对齐 M4b-3 空态形态）⇒ 提示组 **8** · `review` 净增 **47** · 全仓 **396**（**该轮值**；现行 = `review` 净增 **57** / 全仓 **405** → §6.3） |
| **G-Q2** | mcp fixture 造不造 `README.md`（回退分支实证充分性） | **② mcp 也不造 `README.md`** ⇒ ②③ 双双实证回退分支；§9.5 引用改「fixture **②/③**」；**不加**第 7 条 fixture |
| **G-Q3** | 定稿条件 ② 的判据范围（UI 形态 vs 端到端） | **只证 UI 形态** —— 管线的族适用性由 M3 已交付端点 + 测试在册，**端到端三族全链路不在本批范围**（防范围膨胀） |
| **G-Q4** | 登记项编号口径（本批内号 vs 跨批连续 F 号） | **接续 F129 起**：自检处置 **14** 项 = **F129–F142** · 登记 7 条 = **F143–F149**（表格族那套 `F-xx` **不回溯**，属历史留痕） |
| **G-Q5** | 跨批改动（删资产详情页「审核」占位块）的提交粒度 | **独立 commit**（`refactor(web): …（跨批清理 · 归 M4b-5）`）· 并在批 plan 登记该笔归属 |
| **G-Q6** | 主 design「条件 ② ⬜ → ✅ + 转定稿」的时机 | **M4b-5 实现完工后**（届时已有三族截图 + 断言证据）再动主 design 头部，并与 `docs/00` §5 注记**同一提交** ⇒ 本批 design 定稿**不连带**主 design 翻转（防「无证据先翻转」） |
| **G-Q7** | 线框图里的字形（glyph） | **保留 glyph + 图例**（线框为示意 · 主 design §12 先例；`⚒` 与仓内 skill 的 lucide `wrench` 语义一致，不冲突）—— **U1 后本批不再自画线框** ⇒ 本条适用于文档内示例性图示，线框字形归主 design §12 |

**同轮当场处置 5 处客观缺陷**（无决策成分 · 逐条留痕见 §11.2 **F137–F141**）：行数自相矛盾 · 错误码清单重复漏项 ·
把前端守卫说成服务端出口 · `test` 基线未标来源 · fixture 引用错位。

### 2.1d 原型评审记录（2026-09-21 · 可点原型两视图）

> 口径同 M4b-3 §2.1d / M4b-4 §2.1d：**真仓真件 + 假数据 + 状态开关**；**物料不进仓**
> （`apps/web/src/pages/__proto/` 4 文件 + `main.tsx` 两条 DEV 路由行，**评审收尾即删**）。
> 编号照先例保留 **d = 原型评审**（先例 §2.1c = UI 逐条评审轮 —— 本批该轮与 grilling 合并，不另设）。
> 入口：队列 `/__proto/m4b5` · 详情 `/__proto/m4b5/detail?id=<taskId>` —— 挂在 **AppShell 内**（真壳 + 真实内容宽度），
> **无守卫**（免登录即可评审，照 M4b-4 先例）。假数据 = §9.6 fixture 等值（**6 条 + 1 条 `APPROVED`**）；
> 文案 = §6.1 拟新增键的**候选文案**（zh/en 对照，供文案评审）。

**实测证据（2026-09-21 · headless Edge CDP · 16 张截图 · 零 JS 异常）**

| 面 | 实测 |
|----|------|
| 队列 · 列集合 | 列头逐字 = 坐标 / 类型 / 状态 / 姓名 / 工号 / 提交时间 / 操作（**7**）· 行数 **7** = fixture 6 + 1 |
| 队列 · 列开关 | 菜单 **7** 项 · 保护 **2** 项标「必显」（坐标 / 操作）· `aria-checked` 全 true（默认全显） |
| 队列 · 三态 | 空 ⇒ 页面级 `Empty` **两行**（标题 + 副述）· 载 ⇒ 骨架 **30** 元素 · 错 ⇒ `ErrorState` + 重试 |
| 队列 · 非管理档 | 守卫示意（零请求、零白屏） |
| 详情 · 分型卡 | skill ⇒ 主文档行 `SKILL.md` + 字段（**嵌套 `metadata` 被 `manifestFields` 滤掉**）· mcp ⇒ **`servers` 块 2 条 = stdio 1 + http 1** · agent ⇒ `label`/`icon`/`color`/`category`/`keywords` · `manifestJson` 缺失 ⇒ 字段区「—」（**不空窗**） |
| 详情 · 面包屑 | `submittedBy === 我` ⇒「首页 / **我的提交** / #taskId」；否则「首页 / **审核管理** / #taskId」（按**谁的面**分叉）｜⚠ 原型期实测显示「审核队列」⇒ **P3 定案后应为「审核管理」**（真源） |
| 详情 · ~~防自审~~ | 同一条 `#1024`：**管理档**视角 ⇒ 仅「撤回」+ 说明行；**超管**视角 ⇒ **通过 / 驳回 / 撤回** ｜⚠ **该口径已于同日 R2 拍板废除**（管理档改为可自审）—— 保留为「改前实测」留痕，见 **P6** |
| 详情 · 三动作 | 驳回弹窗（`role=alertdialog`）**确认钮 `disabled=true`**（必填原因）· 撤回 / 通过 `disabled=false` · 撤回与通过**去红**（`destructive=false`） |
| 详情 · 降级 | `REJECTED` ⇒ 文件区顶部说明行 + 动作区「该提交已被处理」· 文件树**仍渲染** |

**待拍板点（P1–P5 · 原型期新发现 · 逐条带推荐）**

| # | 待拍板 | 推荐 |
|---|--------|------|
| **P1** | 页头 `description` 放不进**类型图标**（真 `PageHeader.description` 是 `string`）⇒ A 纯文本类型名 / B 页头自组合 `Card` 承载图标 | **A 纯文本**（守「能上官方件就用」；类型信息右栏已有） |
| **P2** | 「通过」需**可选意见**输入，真 `ConfirmDialog` 现仅 `requireReason: boolean` ⇒ 原型只能演示 required/none 两档 | **照 §4.6 升 `reason` 三态**（本批已定 · 实现期落地；原型期以文案标注） |
| **P3** | 队列页标题**真源** = 文案字典 `admin.reviews` = 「**审核管理**」，而主 design §819 文案分层口径 + §12 线框 + 本批文档均写「**审核队列**」⇒ **文档 vs 真源漂移** | **✅ 已拍板（G-Q14 · 2026-09-22）：按真源统一为「审核管理」**（文档侧改 · 面包屑第 2 段同 · 主 design 与 `docs/00` 同步，见 §9.7）；**不改字典**（`admin.reviews` 亦被侧栏消费 ⇒ 改字典会连带改导航） |
| **P4** | 真 `FileTree` 行**恒可点**（`onOpenFile` **必填**）⇒ Q4「不可预览 ⇒ 不渲染预览动作」无法纯靠传参实现 | **给件加加性可选 prop**（`onOpenFile?` 缺省 ⇒ 行不可点 / 纯结构态）—— 比审核面自绘行更省 |
| **P5** | 提交时间列用 `toLocaleString()`（原型取值）⇒ 格式随 locale 变（同年可能省略年份），列内可能不齐 | 实现期**统一固定格式**或复用既有日期格式化（登记为 F 项） |
| **P6** ⭐ | **自审口径变更（用户原话「管理也能审自己」）**：原「仅超管例外」在单管理档团队下把提交全推给超管 ⇒ 单点过载 | **R2 彻底移除防自审**（2026-09-21 拍板 · 已落 design：§4.6.1 + §5.4 + §9.7b）；连带 Q9 作废重写、`errors.review.self_review` 退役、新键 `review.adminOnly` |

**diff 选型 PoC 结论（2026-09-22 · F156 —— PoC 前置到定稿之前）**

> 触发：现行「版本对比」为**自研**（服务端 `assets/version-compare.ts` 自写 LCS DP · 前端自绘 `DiffView.tsx` 139 行 + `DiffNav.tsx` 52 行）
> ⇒ 本批按用户口径「**服务端和前端都需要能用官方就用官方，不要自己重新造轮子**」做选型，**PoC 覆盖「高亮开 / 关」两场景 + 左右对比（split）**。
> 物料 = `apps/web/src/pages/__proto/M4b5DiffPoc.tsx` + `M4b5DiffPoc` DEV 路由（**不进仓**）；实测环境 React / ReactDOM = **19.2.8**（`apps/web/node_modules/react/package.json` 实测）。

**候选 × 硬要求实测矩阵**

| 候选 | 左右对比（split） | 高亮开 | 高亮关 | 入参契约 | React 19 |
|------|:----------------:|:------:|:------:|---------|:--------:|
| **② `react-diff-view@3.3.3`** ⭐选中 | ✔ 每行 2 个代码单元格 | ✔ `tokenize()` 传 `tokens`（**322 span / 5 色**） | ✔ 不传 `tokens`（**0 span / 0 色**） | `parseDiff(整段 patch)` 一次吃多文件 | ✔ **PoC 实跑通过**（peer 仅 `>=16.14.0`，无 `^19` 明示） |
| ① `@git-diff-view/react@0.1.7` | ✔ `DiffModeEnum.Split` | ✔ 内置（**194 span / 4 色**） | ✔ `diffViewHighlight=false`（**112 span / 1 色**） | `data.hunks: string[]`，**每元素 = 一段完整单文件 `diff --git` 段** | ✔ peer **明示** `^19` |
| ③ `@pierre/diffs@1.4.3` | ✔ `diffStyle:'split'` | ✔ 内建 shiki | ✗ **未证实**（`preferredHighlighter` 仅 `'shiki-js'\|'shiki-wasm'`，无关闭档） | `PatchDiff` 吃 `patch` 但**只允许单文件**（多文件抛 `Provided patch must contain exactly 1 file diff`） | ✔ peer 明示 `^19` |

**同口径体积核算（含高亮 · bundlephobia 实测 2026-09-22）**

| 组合 | min | **gzip** | 口径说明 |
|------|----:|--------:|---------|
| ② `react-diff-view@3.3.3` 本体 | 69.1KB | **22.8KB** | **不含高亮** |
| + `refractor@3.6.0` **按需装配**（`core` + 21 语言 = 95.4KB 源码） | — | **≈33KB**（估算） | 压缩/tree-shaking 后经验换算，**须构建期实测**（§9.8） |
| **② 合计（按需）** | — | **≈56KB** | 对比 ① 的口径 |
| ① `@git-diff-view/react@0.1.7` | 1086.0KB | **322.4KB** | **已含**内置 lowlight/highlight.js ⇒ 同口径 |
| ③ `@pierre/diffs@1.4.3` | 646.4KB | **175.7KB** | 含 shiki 入口 |

⇒ **排序：②≈56KB ＜ ③ 175.7KB ＜ ① 322.4KB**；② 对 ① = **约 1/5.8**。

**硬约束（3 条 · 实现期必须守）**
1. **refractor 必须按需注册语言**：整包 import 会退化为 **236KB**（优势缩到 1.4×）⇒ 只注册 §下表清单；**新增语言须手动补注册**（漏注册 ⇒ 该语言静默无高亮，不报错）
2. **体积以构建产物为准**：源码字节估算受 tree-shaking / 副作用标记影响 ⇒ 实现期用 `vite build` 后按 chunk 实测 gzip 回填（§9.8）
3. **0.x 包精确锁版**：`"react-diff-view": "3.3.3"` / `"refractor": "3.6.0"`（不带 `^`）

**② 的初始语言清单（21 种 · 覆盖三类资产常见文本）**
`markdown` · `typescript` · `tsx` · `javascript` · `jsx` · `json` · `yaml` · `toml` · `bash` · `shell-session` · `python` · `go` · `rust` · `java` · `sql` · `css` · `markup` · `diff` · `ini` · `docker` · `makefile`
（兜底：语言未注册 ⇒ 走 `plainText` 分支，**不抛错**）

**② 的已知风险与缓解（3 项）**
| 风险 | 判定 | 缓解 |
|------|------|------|
| **peer 依赖警告** | peer 仅 `>=16.14.0`，React 19 下安装可能告警 | **预期行为，功能已 PoC 实跑通过** ⇒ **不引入 `--force` / `--legacy-peer-deps`**（不动锁文件语义） |
| **无内置 Web Worker** | 单文件接近 `MAX_DIFF_LINES=1500` 且开高亮时主线程可能短暂阻塞 | ① **默认折叠、展开单文件才渲染**（天然懒渲染）② 实现期实测单文件渲染耗时，超 **200ms** ⇒ 该文件**降级为关闭高亮**渲染（阈值实现期以 fixture 实测确定 · 登记 §9.8） |
| **token 高亮在 React 19 的稳定性** | 上游 Argo CD 在 React 19 升级中曾出现 token 高亮丢失、需重新接线 `tokenize()`/`markEdits()` | **保留 token 高亮回归断言**（dogfood「高亮开 ⇒ token span 数 > 0 且色数 ≥ 2」· §9.3） |

**① 的复核项（保留在册）**：①H 的 split **观感逊于 ②**（对齐 / 整行底色 / 横向溢出）——**属目视观察**（`vision_analyze`），
**非实测硬证据** ⇒ 若实现期复核后 ① 不弱于 ②，其竞争力上升；但 ① 仍有 **322.4KB + v0.x 预发布** 的体量与锁版风险 ⇒ **维持次选**。

**PoC 缺陷留痕（自我纠正 · 供后续复用）**：首轮判定「① 五种格式变体全部失败 ⇒ 集成成本不可控」**错误** ——
根因 = **单个错误边界包住整个 PoC 面板**，任一变体抛错即整面板被替换，**掩盖了成功变体**，且把变体 D 的
`Invalid hunk header format` 错记为「所有变体」。修复（**每变体独立隔离**）后复测 ⇒ **变体 E/F/G/H（含 `diff --git` 完整单文件段）全部通过**，落选结论**已撤回**。
教训：**PoC 隔离边界必须与被测单元同粒度**，否则单点异常会伪装成全局结论。

### 2.1e grilling 复核记录（第二轮 · 2026-09-22 · 7 条 · 用户「全按推荐」）

> 触发：设计树前沿推进（v0.8 修复后重算前沿）。**事实均由本方自查**（真码 `file:line` / 全仓类名普查 / 包内文件实测），
> **未向用户索取任何可查事项**。编号接第二轮 **G-Q8–G-Q14**（首轮 = §2.1b 的 G-Q1–G-Q7）。

| # | 问题 | 结论 | 落点 |
|---|------|------|------|
| **G-Q8** | 审核面 diff 的 **base 从哪来** —— 真码 `ReviewDetailItem` **无**「已发布版本」字段 | **A = 服务端 +1 加性字段** `latestVersion: string \| null`：**仅详情查询**加 **2 个 `leftJoin`**（`asset` → `latestVersionId` → `assetVersion`）· **`LIST_SELECT` 不动** ⇒ 队列 / 我的提交**零影响、零性能税** ⇒ 服务端 **3 处 → 4 处** | §5.1b · §7.1 · §1.3 |
| **G-Q9** | 「无对比对象」两态怎么呈现 | **首版审核**（`latestVersion === null`）⇒ **整卡不渲染**（无对比对象，非灰卡）；**同版本重审**（`latestVersion === assetVersion`）⇒ **仍渲染 + 卡内空态**（文案「与当前已发布版本无差异」——比整卡消失更不易误读） | §4.10 |
| **G-Q10** | 窄屏回退的**判定方式**（v0.7 写的 960px 是**新造视口断点** ⇒ 违 §4.8「本批不新造断点」；真仓断点实测只有 **1100 / 760 / 900 / 1200**） | **A = 按容器宽度**：`ResizeObserver` 观测卡片实宽 ⇒ **< 960 容器 px** 回退 `unified`。阈值降级为**组件内常数**，**不新造任何视口断点**（且语义正确：卡片在主列 `1fr` 内，视口宽 ≠ 可用宽 —— GitHub 同做法） | §4.10 |
| **G-Q11** | 服务端产的 patch **头部行集合** & 增删文件表达 | ① **不产 `index` 行**（手中只有 `sha256`，产 index = **伪造 git blob 语义**）⇒ 头部 **3 行**；② **ADDED ⇒ `--- /dev/null`**，**DELETED ⇒ `+++ /dev/null`**（git 标准 + 与 `changeType` 一一对应）；③ **不产** `new file mode` / `deleted file mode` | §5.5 |
| **G-Q12** | 新引入的 diff 缓存在单测 / dogfood 中的**隔离** | **A = 模块导出 `__resetCompareCache()`**（仅测试 import · 约 3 行）· 并**明令 dogfood / 单测不得断言缓存命中率**（只断结果正确 ⇒ 不测实现细节） | §5.5 · §9.3 G10 |
| **G-Q13** | 提交人（**非 owner / 非上传者**）看不到 diff —— compare **双侧过 `decideDownload`**，而预览授权集 = 超管 / 平台审核人 / owner / 上传者 **4 类**（真码 `download.ts:27-37`） | **A = 复用 §4.4 B1 口径**：卡内**内联**提示（`diff.failed`）· **不扩授权集、不动服务端**（与 B1 当初「收益 << 风险」判词同口径） | §4.10 |
| **G-Q14** | **P1–P6 收口**（原型期待拍 6 项） | **6 条全按推荐**：**P1** 页头 `description` = **纯文本类型名** · **P2** `ConfirmDialog` `reason` 三态（已定）· **P3** 队列标题**按真源统一为「审核管理」**（`admin.reviews`）· **P4** `FileTree` **+1 加性可选 prop `onOpenFile?`** · **P5** 提交时间格式 ⇒ 登记 **F173** · **P6** 互审注记随 R2 改写 | §4.1 / §4.2 · §4.6 · §3.2 / §4.5 · §11.2 |

### 2.2 承接主 design 的跨批契约（引用不复制）

- **U1 壳与导航**：侧栏「管理」组条目与组门槛（`role >= 10`）已由 M4b-2 落地 ⇒ 本批**不动导航**
- **U3 会话与 401**：受保护前缀已含 `/reviews` 与 `/admin`（主 design §2.4 U3）⇒ 401 分流零改动
- **U5 我的资产**：本批**不动**该页；仅其姊妹页「我的提交」（M4b-3）提供进详情入口
- **§4 权限感知**：守卫为体验层、服务端为真门（主 design §4「双保险」）⇒ §4.6 同口径（**R2 后服务端侧已无自审判定**）
- **§5.2 响应式断点**：控制台表格 `<1100px` 容器横向滚动（**不做卡片化**）；详情两栏 `<1100px` 单列堆叠
- **§10.1 状态映射**：`StatusPill kind="task"` 四态映射由 M4b-3 落地（`TASK_STATUS_VARIANT`）⇒ 本批**直接消费**
- **§11 文案分层口径**：**导航 / 页标题 = 「审核管理」**（真源 `admin.reviews` = zh「审核管理」/ en `Review queue`，侧栏 `navItems.tsx:111-112` 同键消费）· **详情页头 = 「审核详情」**（`review.title`）· **面包屑第 2 段 = 「审核管理」**（P3 定案）
- **视觉 SSOT**：M4a design §4.4（引用不复制）—— 本批**不新造色值 / 字阶 / 圆角**

### 2.3 官方件装配与复用清单（**+2 依赖** —— 为 diff 现代化按「能上官方件就用」引入，见 §2.1d）

| 用途 | 件 | 来源 |
|------|----|------|
| 表格 + 三态 + 行动作槽 + 列可见性 | `ui/DataTable.tsx` | 既有（T11-j/k） |
| 列开关入口 | `ui/ColumnVisibilityMenu.tsx` | 既有 —— 两个固定文案**跨组复用** `market.colRequired`/`colReset` |
| 分页 | `ui/Pagination.tsx` | 既有（`total > limit` 才渲染） |
| 状态徽章 | `console/StatusPill.tsx` | 既有（`kind="task"`） |
| 确认对话框 | `console/ConfirmDialog.tsx` | **改造**（三态枚举，§4.6） |
| 页头 | `console/PageHeader.tsx` | 既有（`Card` + `CardAction` 槽） |
| 面包屑 | `ui/shadcn/breadcrumb.tsx` | 既有官方件（**照门户详情页产品线**：`BreadcrumbList`/`Item`/`Link asChild`+`Link`/`Separator`/`Page`） |
| 空 / 错 / 骨架 | `ui/shadcn/empty.tsx` · `ui/ErrorState.tsx` · `ui/shadcn/skeleton.tsx` | 既有 |
| 类型图标 | `ui/TypeIcon.tsx` | 既有（**无色**：外层 `text-muted-foreground` 定色） |
| 文件树 + 预览 | `ui/FileTree.tsx` · `ui/FilePreviewDialog.tsx` | **迁入**（Q7） |
| 分型探测与摘要 | `market/detail/OverviewTab.tsx` 的 `mainDocPath` / `manifestFields` | **逻辑复用**（已 export） |
| 键值行 | 门户详情页 `aside` 键值行结构（`market/` 内既有结构） | 结构复用（label 左 muted / 值右 ellipsis） |
| 提示 / 复制 | `ui/Toaster.tsx`（sonner） · `ui/CopyButton.tsx` | 既有 |
| **版本 diff 渲染** | **`react-diff-view@3.3.3`** | **新增**（MIT · gzip 22.8KB · headless ⇒ 样式 100% 自控 · 唯一同时满足「高亮开/关」两场景 · §2.1d） |
| **版本 diff 高亮** | **`refractor@3.6.0`** | **新增**（Prism 系 · **硬约束 3.x**（`react-diff-view` README 明确不兼容 4.x）· **按需注册 21 语言**） |

**有意不复用**：`market/detail/DetailTabs.tsx`（门户三 tab = 总览 / 文件 / 版本）—— 审核对象是**单个版本**
⇒ 不需要「**版本 tab**」；**对比不另立 tab，改内联于详情主列第 2 段**（§4.10 · v0.7/F156 起）；
详情主列为**三段竖排**（§4.2 · v0.8/F158 订正）。

**有意排除**：`@git-diff-view/react`（① 次选 · 322.4KB + v0.x）· `@pierre/diffs`（③ 回退位 · 175.7KB + 高亮关未证实）·
`react-diff-viewer-continued*`（**需客户端两份全文** + emotion）· Monaco（**无 patch 输入** + 数 MB + worker）。

---

## 3. 件与路由规格

### 3.1 新建件（**7** 表行 —— 含 `api/reviews.ts` 的新增函数行，其**件**归 §3.2 改造）

| # | 件 | 层 | 职责 |
|---|----|----|------|
| 1 | `apps/web/src/pages/ReviewQueue.tsx` | 页面 | **审核管理页**薄装配（数据 + URL 状态 + 列定义 + 工具条） |
| 2 | `apps/web/src/pages/ReviewDetail.tsx` | 页面 | 共享详情薄装配（面包屑 + 页头 + 两栏编排 + 三动作接线） |
| 3 | `apps/web/src/components/console/reviews/ManifestCard.tsx` | 件 | **分型 manifest 卡**（三族；§4.3） |
| 4 | `apps/web/src/components/console/reviews/ReviewMetaCard.tsx` | 件 | 详情右栏 task 元信息卡（键值行 ×5 + 动作槽） |
| 5 | `apps/web/src/lib/review-permissions.ts` | 单点 | 可裁决 / 可撤回判定（**唯一落点** · **R2 后无自审分支**，§4.6） |
| 6 | `apps/web/src/api/reviews.ts` 的三件函数 | api | 在**既有文件**内新增 `fetchReviewDetail` / `approveReview` / `rejectReview`（既有件改造，见 §3.2） |
| 7 | `apps/web/src/components/ui/DiffWorkspace.tsx` | 件 | **diff 薄封装**（`react-diff-view` 的样式 / 折叠 / 懒渲染 / 高亮开关 / split↔unified 切换 / i18n 适配 —— **非算法**，算法全在库内 · §4.10） |

> 计数口径：**页面 2 + 面域件 2 + 单点件 1 + diff 封装件 1 = 新建 6 件**；`api/reviews.ts` 为既有件**改造**（§3.2 #1）。
> 故本批 **新建 6 · 改造 11 + 退役 2 · 3 文档**（组成式见 §3.2 末行）。

### 3.2 改造件（**11 + 3 文档**）· 退役件（**2**）

| # | 件 | 改动 | 归属决策 |
|---|----|------|---------|
| 1 | `apps/web/src/api/reviews.ts` | +`fetchReviewDetail` / `approveReview` / `rejectReview`（既有三函数不动） | Q8 |
| 2 | `apps/web/src/main.tsx` | 两条路由占位 → 真页；`DEV_BATCH` **删 3 条** + 注释同步 | Q10 |
| 3 | `apps/web/src/components/console/ConfirmDialog.tsx` | `requireReason?: boolean` → `reason?: 'none'\|'optional'\|'required'`（缺省 `'none'` = 现状；**删除旧 prop 不留别名**） | Q8 |
| 4 | `apps/web/src/pages/AssetDetail.tsx` | 唯一调用点同步：`:457` `requireReason` → `reason="required"`（**1 行**） | Q8 |
| 5 | `apps/web/src/components/console/AssetAdminCard.tsx` | **删「审核」占位块**（`:163-179`）+ `reviewable` 判定（`:76`/`:78` 相应收口）—— **跨批改动**（M4b-4 已交付页） | Q11-f |
| 6 | `apps/web/src/i18n/zh.ts` · `en.ts` | `review` 组扩 · `assets.admin.reviewGroup` 退役（§6） | Q11 |
| 7 | **文件迁移 3 件**（`git mv`）：`market/detail/FileTree.tsx` · `market/detail/FilePreviewDialog.tsx` · `market/detail/fileTreeNodes.ts` → `components/ui/`；import 同步 3 行（`FilesTab.tsx:5,7` · `VersionCompare.tsx:13`）· ⚠️ **`FileTree` 非纯迁移**：**+1 加性可选 prop `onOpenFile?`**（缺省 ⇒ 行不可点 / 纯结构态 —— **P4** 定案） | Q7 · P4 |
| 8 | `apps/server/src/review/query.ts` | `LIST_SELECT` + `leftJoin(user)` + `submittedByName`（§5） | Q3 |
| 9 | `apps/web/src/components/market/detail/VersionCompare.tsx` | 渲染层改向 `DiffWorkspace`；消费契约 `hunks[]` → `patch`（**门户页用户可见形态升级**：默认 split + 高亮 + 折叠） | F156 |
| 10 | `apps/server/src/assets/version-compare.ts` | **自研 LCS DP → `diff`(jsdiff) 9.0.0**；产标准 unified diff 文本；契约 `hunks[]` → `patch`（**§5.5**） | F156 |
| 11 | `apps/web/package.json` · `apps/server/package.json`（+ `bun.lock`） | web +`react-diff-view@3.3.3` / `refractor@3.6.0`（**精确锁版**）· server +`diff@9.0.0` | F156 |

**文档（3 份）**：主 design（§2.3 登记表回填 · §5.1/§5.2 队列列集合与详情形态回写 · §6.2/§6.3 迁移影响面订正 · §7.1 端点表 + 字段 · §8 接口变更总览 · §11 键数链补档 · §12 线框**原地保留** + §4.9 差异声明）· `docs/00` §5 M4b-5 行 · M4a design（若 §4.2 复用意图行需补「已兑现」注记）。

**退役件（2 · `git rm`，非「注释掉」）**

| # | 件 | 行数 | 原因 |
|---|----|:----:|------|
| 1 | `apps/web/src/components/market/detail/DiffView.tsx` | 139 | 自绘渲染器 ⇒ 由 `DiffWorkspace`（`react-diff-view`）替代 |
| 2 | `apps/web/src/components/market/detail/DiffNav.tsx` | 52 | 自绘 hunk 导航 ⇒ 由库内折叠 + 懒渲染替代（**不做兼容保留**，符「退役倾向彻底删除」） |

**退役连锁（1 处 · N4 换靶体检新增 · 实现期同批改）**：`apps/web/src/components/ui/Badge.tsx:12` 的注释写着
「⇒ **3 个调用点（`DiffNav`/`DiffView`/`VersionCompare`）零改动**」—— 两件退役后**只剩 1 个调用点**（`VersionCompare`）
⇒ 实现期**同步改注释**（删两个已退役名 + 「3 个调用点」→「**唯一调用点**」）；**不为此保留任何兼容分支**。

### 3.3 路由（本批形态）

```text
/admin/reviews       审核管理（真页 · ROLE.ADMIN 段 · 不变）
/reviews/:id         审核详情（真页 · ROLE.USER 段 · 共享：管理档 ∨ 提交人本人）
/admin               → /admin/reviews（重定向 · 不变）
```

- **零新增路由**；两条占位换真页，守卫段、`/admin` 重定向、`titleOf` 条目**全部不变**
- `/reviews/:id` **不进 `/admin` 段**（主 design §5.2 已论证：挂 `/admin` 会让提交人 `role < 10`
  被组级守卫挡死 ⇒ 撤回在 UI 上不可达）

---

## 4. 页面规格（本批核心）

### 4.1 审核管理 `/admin/reviews`（队列）

**页头**：`PageHeader.title` = 字典 **`admin.reviews`**（zh「**审核管理**」/ en `Review queue`）—— **不自造文案**（P3 定案 · 与侧栏同键同值）。

**列集合（**7 列** —— `COLUMNS` preset 单一源，照 `pages/Assets.tsx:83-94` 写法）**

| # | 列 | 取值 | 形态 | 保护列 |
|---|----|------|------|:------:|
| 1 | 坐标 | `assetSlug` + `assetVersion` | **两行堆叠**：主行 `truncate` + 次行 `font-mono text-[11px] text-muted-foreground` | **是**（`hidable:false`） |
| 2 | 类型 | `assetType` | **无色** `TypeIcon`(16) + 文案（外层 `text-muted-foreground` 定色 —— `TypeIcon` 无 className prop） | 否 |
| 3 | 状态 | `status` | `StatusPill kind="task"`（四态映射已落） | 否 |
| 4 | 姓名 | `submittedByName` | 单行 `truncate` · 缺 ⇒ 「—」 | 否 |
| 5 | 工号 | `submittedBy` | 单行 `font-mono` · 列窄（≈110px）· `usr_` 前缀 ⇒ 截断 + `title` 全值 | 否 |
| 6 | 提交时间 | `submittedAt` | `new Date(...).toLocaleString()` | 否 |
| 7 | 操作 | — | **`rowActions` 槽列** · `Eye` 图标钮 · **`Button asChild` + `Link to={/reviews/${taskId}}` 真链接** · 表头可见「操作」 | **是**（哨兵 id `rowActions`） |

**规格要点**

- **不开排序头**：**不传** `sorting` prop ⇒ `DataTable` 契约原生的「全部表头纯文本」档（`ui/DataTable.tsx:222`）。
  理由：`GET /api/reviews` **无 `sort` 档位**（`:33-36` 仅 `status`/`limit`/`offset`）；服务端固定序
  `desc(submittedAt), desc(id)`（`review/query.ts:92`）—— 即「先到先审」，本就是队列唯一合理序。
  客户端排序会只排当前页 20 条（假排序，破坏分页语义）⇒ 不做
- **列开关**：受控 `columnVisibility` + `onColumnVisibilityChange`；入口 = `ui/ColumnVisibilityMenu`
  渲染在页面工具条右侧控件群（容器承担 `ml-auto`，同门户/控制台口径）；**不持久化**（刷新回全显示）；
  保护 **2** 项（坐标 + 操作槽列）；固定文案**跨组复用** `market.colShow`/`colRequired`/`colReset`（+0 键）
- **状态筛选**：官方 `Select`（`Label` + `SelectTrigger` + `SelectItem`），哨兵值 `__all__` 映射为
  **不带 `status` 参数**（服务端对非法值**静默忽略** ⇒ 绝不传 `ALL`/空串；M4b-3 R3 同口径）；
  筛选变更 ⇒ 回第 1 页（删 `offset`）
- **分页**：`Pagination` · **仅 `total > limit` 时渲染**（`limit = 20`，服务端默认）
- **空态两套**：① `status` 未筛 且 `total === 0` ⇒ 页面级 `Empty` 两行（标题复用既有键
  `review.empty` = 「暂无待审条目」· 副述 `review.emptyHint`）② 筛选无结果 ⇒ `DataTable` 的
  `emptyMessage` = `review.empty.filtered`
- **URL 状态化**：`?status=&offset=`（复用 `useMarketQuery` 的 `status` 维度扩展，**不新建 hook**）；
  刷新保持 / 后退可回
- **`<1100px`**：表格容器横向滚动（保留列完整，**不做卡片化** —— 主 design §5.2 硬口径）

**状态覆盖（状态 | 展示 | 可用操作）**

| 状态 | 展示效果 | 可用操作 |
|------|---------|---------|
| 载态 | `DataTable` 骨架（`loading`，控制台现状 `replace` 档） | — |
| 空（无待审） | 页面级 `Empty` 两行 | 无（可切筛选看历史裁决） |
| 空（筛选无结果） | 表格单行文案 `review.empty.filtered` | 切换筛选 |
| 错 | `ErrorState` + 重试（`onRetry` 递增刻度） | 重试 |
| 正常 | 7 列表格 + 分页 | 状态筛选 · 列开关 · 进详情（真链接） |
| 403（非管理档） | 由 `RoleGuard minRole=ADMIN` 弹回 `/dashboard`（守卫层，零白屏） | — |

### 4.2 共享详情 `/reviews/:id`

**版式**：`flex flex-col` 内 —— ① 面包屑一行 → ② `PageHeader`（`Card`）→ ③ 两栏
`grid grid-cols-[1fr_320px] items-start gap-4`（`<1100px` ⇒ `grid-cols-1` 单列堆叠）

**页头**
- `PageHeader.title` = **`assetSlug` · v`assetVersion`**（§12 头行内容）
- `PageHeader.description` = **类型名纯文本**（**不放图标** —— 真 `PageHeader.description` 类型是 `string`，放不进元素；P1 定案 · 类型信息右栏亦有 ⇒ 不重复）
- `PageHeader.actions` **留空** —— 动作归右栏（§12 原文）
- 说明：顶栏「审核详情」是**页面类型**、页面标题是**具体记录** ⇒ 两者信息不重复，不触「同信息只存一处」

**面包屑（三段 · 按「谁的面」分叉）**

| 判据 | 三段 | 第 2 段目标 |
|------|------|-----------|
| `detail.submittedBy === 当前登录者.id` | 首页 / **我的提交** / `#taskId` | `/dashboard/submissions` |
| 否则 | 首页 / **审核管理** / `#taskId` | `/admin/reviews` |

- 第 1 段「首页」→ `/`（§12 原文）；第 3 段 `BreadcrumbPage`（不可点）
- 用「谁的面」而非角色判定：管理档查**自己**的提交时也回「我的提交」（更贴直觉）；
  数据零额外（`submittedBy` 详情已有 + `AuthProvider.user.id` 已有）
- 形态照门户详情页产品线：`Breadcrumb` + `BreadcrumbList` + `BreadcrumbItem` +
  `BreadcrumbLink asChild`+`Link` + `BreadcrumbSeparator` + `BreadcrumbPage`

**主列（`min-w-0`，三段竖排 —— 序即编号；§4.10 所称「第 2 段」即此处）**
1. **分型 manifest 卡**（`console/reviews/ManifestCard`，§4.3）
2. **变更对比卡**（`ui/DiffWorkspace`，§4.10 —— base = `asset.latestVersion` / head = 待审版本；
   **版本不可预览 ⇒ 整卡不渲染**，照 §4.4 单点判据）
3. **文件清单**（`ui/FileTree` + `ui/FilePreviewDialog` 自组合，§4.5；含不可预览降级）
—— **不做 tab 化**（审核对象是单个版本；对比**内联于同页第 2 段**，不另立「版本 / 对比」tab）

**右栏（`aside` 320px 粘性 —— 照门户详情页 `sticky top-[78px] flex flex-col gap-3.5`）**
1. **task 元信息卡**（`console/reviews/ReviewMetaCard`）—— 键值行形态（label 左 `text-muted-foreground` /
   值右 ellipsis）+ `StatusPill kind="task"`：

| 行 | 值 |
|----|----|
| 状态 | `StatusPill kind="task"`（四态文案） |
| 提交人 | `submittedByName`；**= 当前登录者 ⇒ 「你」**；缺 ⇒ 回落 id 原值 |
| 工号 | `submittedBy`（`usr_` 前缀 ⇒ 截断 + `title`） |
| 提交时间 | `submittedAt` 本地化 |
| task | `#taskId` · 评审计数 v`reviewVersion` |
| 驳回原因 | `reviewComment`（**仅 `REJECTED` 有值**，否则该行不渲染） |

2. **动作卡**（§4.6）—— 卡内 = 通过 / 驳回（并排）· 撤回（次级）；非 `PENDING` ⇒ 静态状态行

**状态覆盖（状态 | 展示 | 可用操作）**

| 状态 | 展示效果 | 可用操作 |
|------|---------|---------|
| 载态 | 页头 + 两栏骨架（官方 `Skeleton`） | — |
| 错（404 `review.not_found`） | `ErrorState` + 重试 | 重试 / 面包屑返回 |
| 错（403 `review.access_denied`） | `ErrorState`（无权查看） | 面包屑返回 |
| 正常 · `PENDING` | 全量（卡 + 文件 + 三动作按权限） | 通过 / 驳回 / 撤回（§4.6 矩阵） |
| 正常 · 已裁决（`APPROVED`/`REJECTED`/`WITHDRAWN`） | 全量 + 驳回原因行（若 `REJECTED`）；动作区 = 静态状态行 | 无写动作（面包屑返回） |
| 版本不可预览（§4.4） | **变更对比卡不渲染**（禁灰卡）+ 文件区顶部说明行 + 文件行**无预览动作** | 查看 `sha256` 清单 / 面包屑返回 |
| 预览运行时失败 | 预览弹层内联提示（不破版） | 关闭弹层 / 重试 |

### 4.3 分型 manifest 卡（**主 design 定稿条件 ② 的载体**）

**实现方式（Q6 = B）**：**复用**门户总览的分型**逻辑**（`mainDocPath` / `manifestFields`，均已 export）
+ **新写**审核面呈现件 `console/reviews/ManifestCard.tsx`；`market/detail/OverviewTab.tsx` **零改动**。

**卡结构**
1. 卡头：类型（无色 `TypeIcon` + 文案）· **主文档行**（`mainDocPath` 结果）· 版本 `mono` · 来源标注（文档路径 / `manifest`）
2. 字段区：**按族分型**（下表）
3. 空态：`manifestJson === null` ⇒ 字段区显「—」（**不空窗**）

**三族呈现规格（字段真源 = `packages/protocol/src/<族>/manifest.ts`）**

| 族 | 主文档探测（`mainDocPath`） | 字段区 |
|----|---------------------------|--------|
| **skill** | `SKILL.md`（族协议必需 root） | `name` · `description` + passthrough 纯量字段（`allowed-tools` / `metadata` 等数组 join） |
| **agent** | `README*`（大小写归一探测 root 级，可选） | `name` · `description` · `label` · `icon` · `color` · `category` · `keywords`（数组 join）+ passthrough（`x-aih-*`） |
| **mcp** | `README*`（可选） | `name` · `description` + **`servers` 专属块** |

**mcp `servers` 块**（`McpManifestSchema` = `{name, description, servers: Record<名, entry>}` + passthrough）

- 条目 = 「server 名 · `type` 徽章（`stdio`/`http`/`sse`）· `enabled` 态 · `command` + `args`（stdio 档）/ `url`（http·sse 档）」
- **不显示 `env` / `headers` 的逐项**：`env` 值可能为明文、`headers` 键多数为环境引用 ⇒ 一律**不渲染**
  （`headers` 只显键名与「引用式」标记）
- ⚠️ **本项为审核面独有呈现**：`manifestFields` **显式滤掉 `servers`**（`OverviewTab.tsx:29` `key !== 'servers'`）
  且它是 record（非标量 / 非纯量数组）⇒ 门户摘要形态放不下 ⇒ **分型呈现必须自成一套**（口径理由留痕）

**卡不拉正文**：本卡不请求主文档内容 ⇒ 版本不可预览时（§4.4）**天然不破版**（对比：门户 `OverviewTab`
遇非 404 错误 ⇒ 整块 `ErrorState`，`OverviewTab.tsx:77-79`）。

**三族适用性实证（本批出口件，§9.5）**：造数三族各一条 `PENDING` ⇒ dogfood 逐族断言卡的**形态差异**
（skill 卡含 `SKILL.md` 行 · mcp 卡含 `servers` 块且**条数 = fixture 实测条数**（组成式）·
agent 卡含 `keywords` 行 · 三族字段数 > 0 不空窗）+ 三张详情页截图 ⇒ 用户据此对**主 design** 下**定稿口令**。

### 4.4 预览可用性判定表（**单点** —— 禁页面散写）

**判据源 = 详情响应自带的 `versionStatus`**（`review/query.ts` `LIST_SELECT` 已有）
⇒ 一次响应即可判，**零额外请求**，且**与查看者身份无关**（两角色共用同一条规则）。

| `versionStatus` | 可预览 | 服务端出口（真源） |
|-----------------|:------:|-------------------|
| `PUBLISHED` | ✅ | `decideDownload` ⇒ `ok`（`assets/download.ts`） |
| `UPLOADED` | ✅ | 预览授权集 |
| `PENDING_REVIEW` | ✅ | 预览授权集（「审核人取真包审内容」—— `download.ts` 注） |
| `REJECTED` · `SCAN_FAILED` · `DRAFT` · `SCANNING` | ❌ | 400 `asset.version_not_published`（未公开留档族） |
| `YANKED` | ❌ | 400 `asset.version_yanked` |

**不可预览时的 UI**（守「无权限不渲染 / 禁灰钮」）
- 文件树**仍渲染**（`filePath` / `fileSize` / `sha256` 仍可审**结构** —— 详情响应的 `files[]` 与版本态无关，照样下发）
- **不渲染预览动作**（文件行不出现可点预览的 affordance）
- 文件区**顶部说明行**：① `REJECTED`/`SCAN_FAILED`/`DRAFT`/`SCANNING` ⇒ `review.preview.unavailable`
  ② `YANKED` ⇒ `review.preview.yanked`

**运行时兜底（双保险 —— 覆盖不可预判档与竞态）**

| 出口 | 触发场景 | UI |
|------|---------|----|
| 404 `asset.not_found` | **B1 边界**：资产非 ACTIVE 且查看者不在读面授权集 | 预览弹层内联提示（**不整页报错、不破版**）—— **复用共享 `FilePreviewDialog` 既有错误面**（`errors.unknown {code}`，带真实错误码；**F190：不新增键**） |
| 400 `asset.version_not_published` | 版本态在判定表外（如判定后状态变更） | 同上 |
| 400 `asset.version_yanked` | 同上 | 同上 |

> **F190（实现期订正 · v0.12）**：原写「内联提示 `review.preview.failed`」—— 实测该键**零消费点**
> （共享 `FilePreviewDialog` 已统一用 `errors.unknown {code}` 渲染错误，信息量更大）⇒ **退役 `review.preview.failed`**，
> 口径改为「复用共享对话框的既有错误面」。**首跑实证**：B1 场景弹层显示「操作失败，`asset.not_found`」✓

**B1 边界（已知边界 · 非缺陷）**：触发条件 = 资产**非 ACTIVE**（`asset.status` 默认 `ACTIVE`，
须被显式 HIDDEN/ARCHIVED）+ 提交人 ≠ owner 且 `role < 10` + **版本上传者本人代提**（`canSubmitReview`
明确允许该档）。影响面 = **仅提交人自查预览**（审核人 = 管理档在授权集内 ✅ · 队列不受影响 ✅）。
**不做服务端扩展**：把「review task 提交人」并入资产读面授权集需 task 上下文（改动不止一行），
且会扩大资产读面授权语义（收益 << 风险）。

**不加下载入口**：`/reviews/:id` 范围为「manifest 卡 + 文件树 + 预览 + 三动作」；bundle 下载授权同
`decideDownload`（`REJECTED` 一样拒）⇒ 加了即「坏入口」。

### 4.5 文件树与预览（迁移 + 自组合 + 降级）

- **件落位（Q7 = A）**：`FileTree.tsx` · `FilePreviewDialog.tsx` · `fileTreeNodes.ts` **三件一并迁**
  `components/market/detail/` → `components/ui/`（`git mv`，**本体零改动**）
  - 只迁两件会造 **`ui/` → `market/` 反向依赖**（`fileTreeNodes` 会被 `ui/` 侧的 `FileTree` 反向引用）
    ⇒ 违反分层（先例：表格族 design §4.3 `AssetCard` 同因不迁并申报）
  - import 同步 **3 行**：`market/detail/FilesTab.tsx:5,7`（2 行）· `market/detail/VersionCompare.tsx:13`（1 行）
- **`FilesTab` 本体不迁**：其编排含门户特有语义（`files === null ⇒ Skeleton` 的「波 2 未就绪」占位）
  且**无降级能力** ⇒ 审核面**自组合** `ui/FileTree` + `ui/FilePreviewDialog`（约 30-40 行）
- **`FileTree` 的 1 处加性改动（P4）**：现 `onOpenFile` **必填** ⇒ 行**恒可点**，无法纯靠传参实现 §4.4「不可预览 ⇒ 不渲染预览动作」
  ⇒ 加**加性可选 prop `onOpenFile?`**（缺省 = 纯结构态：行不响应点击）；**既有调用点零改动**（门户传了该 prop ⇒ 行为不变）
- **结构复用**：文件行 = 路径 `mono` + 大小 + `sha256` 徽章（两件内部形态沿用，不新造）
- **降级**：§4.4 判定表 + 说明行 + 运行时兜底

#### 4.5.1 新组件/新交互 → M4a §4.4 token 映射（**就地补录 · 不等 M4b-7**）

> 依据：主 design §2.3「视觉职责边界」④ —— 某批引入**新组件/新交互**（**本批 = 文件树 + 预览卡 · 主 design 点名**）
> ⇒ **该批内就地补录 §4.4 映射**（局部视觉决策）。下表只记**本批新引入**的映射，其余一律走 §4.4 指针
> ⇒ **零新色值 / 零新字阶 / 零新圆角 / 零新阴影**。取值列 = **件内现值真码**（迁移是纯路径移动，**取值不变**）。

| 元素 | 现值（真码） | 映射依据 |
|------|-------------|---------|
| 文件行容器 | `flex items-center gap-[9px] py-[5px] font-mono text-[13px] text-muted-foreground` · hover → `text-foreground` | §4.4 行样式（换皮 T19 已 Tailwind 化）；hover 走**字色**非底色 |
| 目录名 | 同行 `font-semibold` · 展开箭头 `text-[9px]`（120ms 过渡） | §4.4 层级区分靠**字重** |
| 文件大小 / 元信息 | `text-[11px] text-muted-foreground` | §4.4 首档次级文本 |
| `sha256` 徽章 | `rounded-[6px] bg-muted px-[7px] py-px text-[11px] text-muted-foreground` | §4.4 ⑦ `--sha-bg` **无映射** ⇒ 已落 `bg-muted`（登记项） |
| 预览弹层 | 官方 `Dialog` · `w-[min(720px,88vw)]` · `sm:max-w-[720px]` · `max-h-[76vh]` · `p-0` | §4.4 弹层口径（官方 `Dialog` 真身） |
| 弹层标题行 | `border-b border-border px-[18px] py-[13px]` · 标题 `font-mono text-[13px] font-semibold` · 副述 `font-mono text-[11px]` | §4.4 分隔线与字阶 |
| 弹层正文 | `font-mono text-xs leading-[1.7] text-muted-foreground`（`pre` 自动换行） | §4.4 代码正文 |
| 弹层载态 | 居中 `py-10` + 官方 `Spinner` | §4.4 载态口径（**非** `Skeleton`） |
| 弹层空/错态 | 居中 `py-5 font-sans text-[13px] text-muted-foreground` | §4.4 提示文案（**不用警示色** 除非真错误） |
| 截断/二进制提示条 | `rounded-md bg-warning/10 px-3 py-1.5 font-sans text-[11px] text-warning` | §4.4 ⑦ warning 档（**件内既有**，本批不改） |

**本批**新增**仅有**：① 文件区顶部「不可预览说明行」= 同上「空/错态」字阶（`font-sans text-[13px] text-muted-foreground`），
**不用 warning 色**（属**状态说明**非错误）② 预览失败**内联**提示同档。两者均**不新造 token**。

> **F156 补充（v0.8 · N10）**：diff 面新增的**控件**（split↔unified 切换 / 高亮开关 / 折叠钮）**本体为库内组件**
> （`react-diff-view` 自有 DOM + CSS 变量），**语法色属第 3 方主题域**（`refractor` 主题类）⇒ 映射与边界见
> **§4.10 视觉段**。故本段「新增仅有」的**设计 token 面**结论不变（**本批新增设计 token = 0**）。

### 4.6 三动作与权限矩阵（**R2 后：防自审已移除**）

**渲染与可用矩阵（真源 = `http/reviews.ts:109,132,152` + `review/service.ts`）**

| 条件 | 通过 | 驳回 | 撤回 | 说明 |
|------|:----:|:----:|:----:|------|
| `status !== 'PENDING'` | ✗ | ✗ | ✗ | 静态状态行「该提交已被处理」 |
| `PENDING` ∧ **管理档**（`role >= 10`） | ✔ | ✔ | ✔ | **含审自己提交的版本**（R2 · 2026-09-21 拍板） |
| `PENDING` ∧ 提交人（非管理档） | ✗ | ✗ | ✔ | 说明行「**仅管理员可审核**」（`review.adminOnly`） |
| `PENDING` ∧ 非提交人非管理档 | ✗ | ✗ | ✗ | 同上一行（该组合访问详情本身即 403，属兜底） |

**判定件 `apps/web/src/lib/review-permissions.ts`**（体例照 `lib/asset-permissions.ts`：真源对照表 + **提示性守卫声明**）
- `canApproveReview(role)` = `role >= ROLE.ADMIN`（**无自审分支**）
- `canWithdrawReview(detail, viewer)` = `detail.submittedBy === viewer.userId || viewer.role >= ROLE.ADMIN`
- **服务端为唯一门**：`role >= ADMIN` + token scope + 状态流转（`review.access_denied` / `review.not_pending`）
- 动作区**不再渲染**「不能审核自己提交的版本」（随 R2 废除 ⇒ `errors.review.self_review` 键**退役**）

**按钮层级与确认形态（Q8）**：通过 = `default` · 驳回 = `outline`（**去红**）· 撤回 = `ghost`（**去红**，照 `Submissions.tsx:276-287`）
- 驳回走 `ConfirmDialog requireReason`（**原因必填** 1..2000 ⇒ 空则确认钮 `disabled`）· 通过 `reason="optional"`（Q8-a 三态升级）· 撤回无原因
- 成功 ⇒ `toast.success`（带版本号）+ `invalidateCache('/api/reviews')` + 跳回来源；失败 ⇒ `tErr(code)` + 刷新详情

**队列页不做权限标注**：队列是**认领 / 浏览**视图，非裁决视图；加「该行不可审」会引入新 UI 概念（Q9 原口径保留）

**运营注记（P6 · 随 R2 改写）**：上游 M3 §13 的运营前提是「**互审团队空间至少 2 个 ADMIN 级成员或平台审核人兜底**」；
**R2 后该「至少 2 人」不再成立为硬前提** —— 管理档**可自审**（单管理档团队不再需要超管兜底）⇒
注记口径改为「**推荐 ≥2 管理档以获得双人复核语义；单管理档团队由该档自审，超管兜底审计**」。
（M3 批 design §13 只加指针，不回改 —— 见 §9.7b）

#### 4.6.1 R2 · 跨批契约变更（2026-09-21 拍板 · 用户原话「管理也能审自己」）

- **动因**：原口径「仅 SUPER_ADMIN 例外」在「团队只有 1 个管理档」时，该管理档的提交**只能落到超管** ⇒ 单点过载。
  上游 M3 §13 的运营前提是「**互审团队空间至少 2 个 ADMIN 级成员**」，实际组织未必满足 ⇒ 改为**管理档可自审**，单点消除。
- **改动面（5 代码文件 + 2 处测试 —— 随本批实现期落地）**：
  1. `apps/server/src/auth/rbac.ts:69-77` —— **删除** `isSelfReview`（含导出与注释）
  2. `apps/server/src/auth/rbac.test.ts:125-135` —— 删除该 `describe` 块 + import 同步
  3. `apps/server/src/http/reviews.ts:117,140` —— 删除 `isSuperAdmin:` 实参（2 处）
  4. `apps/server/src/review/service.ts` —— 删除 `isSelfReview` 调用与入参 `isSuperAdmin`（approve/reject）
  5. `apps/server/src/review/errors.ts` —— **删除** `selfReview` 码（`review.self_review`）
  6. `apps/server/src/review/service.test.ts:328` —— 用例改写为「管理档审自己 → **放行**」（契约变更 ⇒ 断言同步，**非**为绕测而改）
  7. 规范/文档同步 → **§9.7b**
- **偏离与代价（如实登记）**：`docs/05-identity-access.md` §6.4 与兄弟仓同构的「**四眼原则**（审核人不得是提交人）」
  **有意偏离** —— 代价 = 失去「双人复核」的合规意义（自己可通过自己的版本）；收益 = 消除单管理档团队的单点。
  **复归路径**：恢复 `isSelfReview` + 403 码即可（恢复点唯一，本段即记录）。
- **i18n 连带**：退役 `errors.review.self_review`（errors **6 → 5**）· 新增 `review.adminOnly`（见 §6.1）

### 4.7 UI 结构与组件树

```text
src/
├── pages/
│   ├── ReviewQueue.tsx            新（队列薄装配）
│   └── ReviewDetail.tsx           新（共享详情薄装配）
├── components/console/reviews/    新（面域件）
│   ├── ManifestCard.tsx           分型 manifest 卡（§4.3）
│   └── ReviewMetaCard.tsx         右栏 task 元信息卡
├── components/ui/
│   ├── DiffWorkspace.tsx          新（diff 薄封装 · §4.10 · **双处挂载**：主列第 2 段 + 门户版本 tab）
│   ├── FileTree.tsx               ← 迁入（§4.5，本体零改动）
│   ├── FilePreviewDialog.tsx      ← 迁入
│   └── (fileTreeNodes.ts)         ← 迁入（同批，防反向依赖）
└── lib/review-permissions.ts      新（判定单点 · §4.6）
```

**复用不复制**：`DataTable` / `ColumnVisibilityMenu` / `Pagination` / `StatusPill` / `ConfirmDialog`（改造）/
`PageHeader` / `Empty` / `ErrorState` / `Skeleton` / `TypeIcon` / `Toaster` / `CopyButton` /
`mainDocPath` + `manifestFields`（逻辑）/ `react-diff-view` + `refractor`（第三方件 · §2.1d）。

**无独立件的两处（有意）**：① 主列第 2 段「变更对比卡」= `ReviewDetail` 薄装配内联 `ui/DiffWorkspace`
（卡壳 + 标题 + 空/错/降级三态，体量小 ⇒ 不另立件）② 队列列定义 = 页内 `COLUMNS` 常量（照 `pages/Assets.tsx` 范式）。

### 4.8 全局交互约定

- **URL 状态**：队列 `?status=&offset=`；详情 `:id` 路径参数（弹窗状态不进 URL —— 同 M4a 版本对比口径）
- **`<1100px`**：详情两栏 ⇒ 单列堆叠（右栏含动作区会落到页面下方 —— **已知代价**，窄屏体验登记 M4b-7）；
  队列表格 ⇒ 容器横向滚动
- **图标**：一律 **SVG（lucide）**，禁字形字符 / emoji
- **`<980px` 无特殊处理**：控制台面沿用 M4b-2 侧栏图标态断点（`<900px`），本批不新造断点

### 4.9 线框 ↔ 批 design 差异声明（**以批 design 为准**）

> 本批两页的线框**原地保留在主 design §12**（`/reviews/:id` 与 `/admin/reviews` 两张 · 均已标归属 `→ M4b-5`）
> ⇒ **引用不复制**（照 M4b-3 §4.4.2 先例 —— 其完整性判词同口径：「线框无缺口 —— 主 design §12 已含本批两页（引用不复制）」）。
> 主 design §12 头部已标「示意数据非设计硬值」⇒ **差异处一律以本文件 §4 为准**。

| 面 | 主 design §12 线框 | 批 design 定案（本文件） | 依据 |
|----|-------------------|------------------------|------|
| **队列** · 列集合 | 6 列（坐标 / **版本** / 类型 / 提交人 / 提交时间 / `→`） | **7 列**（坐标〔**版本折入**〕/ 类型 / **+ 状态** / **姓名** / **工号** / 提交时间 / **`Eye` 真链接**） | §2.1 **Q2** + **Q3c**（6 → 7 列修订） |
| **队列** · 工具条 | 仅 `[状态: 待审核▾]` + 分页 | **+ 列开关入口**（`ui/ColumnVisibilityMenu` · 保护 **2** 项）· 分页 `total > limit` 才渲染 | §4.1 · 表格族 k1 口径 |
| **详情** · 页头 | 一行 `slug v版本 提交人 姓名` | **`PageHeader`**（title = `slug · v版本` / desc = 类型 / 动作槽留空）· **提交人落右栏**键值行 | §4.2 · §2.1 **Q5** |
| **详情** · 动作区 | **2 钮**（通过 / ~~拒绝~~） | **3 动作**（通过 / **驳回** / **撤回**）· 仅 `PENDING` 渲染 · **管理档可自审（R2）** | §4.6 · 主 design §10.2（三动作）· 服务端 `withdraw` 端点 · 措辞真源 `i18n/zh.ts:314` |
| **详情** · 文件行 | `[预览]` 文字钮 | **图标 affordance**（控制台列表行操作统一为单动作图标钮）· 不可预览 ⇒ **该动作不渲染** | §4.5 · M4b-4 表格族口径 |
| **详情** · manifest 卡 | `[manifest 摘要卡]` · `name/version/license/description…` | **分型 manifest 卡**：skill ⇒ 主文档行 `SKILL.md`；mcp ⇒ **`servers` 块**；agent ⇒ 族字段 | §4.3 · 真码 `mainDocPath`（§11.2 **F152**） |
| **详情** · 变更对比卡 | **线框无此块**（主 design §12 未画）· 门户「版本」tab 线框亦未含 split / 高亮开关 | **新增卡**（主列**第 2 段**）· 默认**左右对比** + 高亮可开关 + 折叠懒渲染（门户侧 = **形态升级**） | §4.10 · §2.1d **F156** |

**回画口径**：上表 **7 行**即「以批 design 为准」的**完整差异清单**。主 design §12 那两张的状态列 / 列开关 / 三动作等演进
**不在本批回画**（避免逐批零改）⇒ 统一归 **M4b-7 完整 converge**（届时按各批定案一次重画 §12）。
**主 design 侧已同步订正 2 处**（§11.2 **F152/F153** · 主 design **v1.61**）：族主文档口径（与真码不符）+ 详情线框缺撤回钮与「拒绝 → 驳回」措辞。

---

### 4.10 变更对比（版本 diff）规格（**新增面 · 双处挂载 · F156**）

**挂载点（2 处 · 同一件 `ui/DiffWorkspace`）**

| 面 | 位置 | base | head |
|----|------|------|------|
| 门户 · 版本 tab（既有面升级） | `market/detail/VersionCompare.tsx` | 用户所选 `from` | 用户所选 `to` |
| **审核详情 `/reviews/:id`** | **主列第 2 段**「变更对比」卡（序见 §4.2 三段竖排） | **详情响应的 `latestVersion`**（= 当前已发布版本 · **G-Q8 新增加性字段** §5.1b） | **待审版本**（`task.version`） |

**渲染形态（6 条 · 全部为实测支撑的定案）**
1. **默认 = 左右对比（split）** —— 用户点名偏好；**按容器实宽回退**（`ResizeObserver` · **< 700 容器 px** ⇒ `unified`）+ 提供 **unified / split 切换钮**
   —— ⚠️ **观测须用 callback ref 挂载（F183）**：本件在无差异时**提前 return `null`** ⇒ `useRef` + 一次性 effect 会在节点未挂载时跑完、**观察器永不 attach**（实现首版踩坑 · 真浏览器复现）
   —— ⚠️ **阈值经真实浏览器实测调参（v0.11 · F180）**：初值 **960 不可用** —— 门户「版本」tab 主列实宽仅 **755px**（1440 视口 · 两栏 `grid-cols-[1fr_320px]`）⇒ 960 会让 split **永不出现**，与用户偏好直接冲突；调至 **700** 后实测：**755 ⇒ split**（两列各 ≈320px code）· **600 ⇒ 自动 unified + split 钮禁用**
   —— ⚠️ **判定用容器宽而非视口宽**（卡片在主列 `1fr` 内，右栏 320px + 间距会被视口断点忽略）；阈值是**组件内常数**，**不新造视口断点**（守 §4.8 · G-Q10）
2. **高亮默认开**（`tokenize(hunks, {highlight:true, refractor, language})`）· **提供开关**（关 ⇒ 不传 `tokens` ⇒ 0 span）
3. **默认全部折叠**，**展开单文件才渲染**（懒渲染 ⇒ 化解大 diff 渲染耗时）；单文件渲染 **> 200ms** ⇒ 该文件降级为**关高亮**（阈值实现期以 fixture 实测 · §9.8）
4. **文件头统计 `+N −M`** 我方自绘（数据服务端本有）
5. **词级行内高亮**：库支持（`tokenize` 的 `enhancers`）⇒ **本批不开**，登记为 M4b-7 视觉窗
6. **全库统一**：门户与审核面**共用同一件**，形态零分叉（禁两处各写）

**「无对比对象」两态（G-Q9 · 审核面专属 · 门户侧不受影响）**

| 态 | 判据 | 呈现 |
|----|------|------|
| **首版审核** | `latestVersion === null`（该资产从未发布过） | **整卡不渲染**（无对比对象 ⇒ 不渲染，非灰卡） |
| **同版本重审** | `latestVersion === assetVersion`（重审同一版本 · `reviewVersion` 递增） | **仍渲染 + 卡内空态**：文案「**与当前已发布版本无差异**」（compare 两侧同版本 ⇒ `files[]` 空） |

**二态语义（服务端标注 ⇒ 前端只读不判）**

| 标注 | UI |
|------|----|
| `binary: true` | 该文件显「二进制文件，不显示差异」（**不渲染 diff 区**） |
| `truncated: true` | 该文件显「文本过大，未生成差异对比」（**不渲染 diff 区**） |

**边界与降级（守「无权限不渲染 / 禁灰钮」+ §4.4 单点判据）**
- 审核详情侧**可预览性判定直接复用 §4.4**（`versionStatus` 单点）：**不可预览 ⇒ 整卡不渲染**（不是灰卡）
- 403 / 404 / 400 ⇒ **卡内内联**提示 `review.diff.failed`（**不整页报错、不破版**）
- 无变更（`files[]` 全 `UNCHANGED` 或无条目）⇒ 卡内空态 `review.detail.compareEmpty`
- **提交人视角的授权夹缝（G-Q13）**：提交人**非 owner 且非该版本上传者**且非管理档 ⇒ compare 双侧过 `decideDownload` 时 head 侧不放行 ⇒ 400 ⇒ **卡内内联提示**（`diff.failed`）。
  **不扩授权集**（与 §4.4 **B1** 同口径：并入 task 提交人需改服务端授权语义，收益 << 风险）

**a11y（定案项，非「可选」）**：折叠钮 `aria-expanded` · 行号列 `aria-hidden` · diff 区 `role="region"` + `aria-label`（路径 + `+N/−M`）· 全键盘可达

**视觉（守「零新 token」）**：结构 / 间距 / 字阶沿用 M4a §4.4（`font-mono text-xs` 档）；
**语法色属「第 3 方主题域」**（`refractor` 主题类），**不计入 §4.4 设计 token 面**（登记理由，非豁免）；行底色由库 CSS 变量承载
（`--diff-code-insert-background-color` / `--diff-code-insert-edit-background-color` 等）⇒ **本批新增设计 token = 0**。

> ⚠️ **必须随件交付一份主题 CSS（v0.11 · F181 实测补充）**：`refractor` 只产**带类名的 token**（`token keyword` …），
> **没有主题样式表时 token 全部继承同色 ⇒ 高亮「形同虚设」**（浏览器实测：token span 555 但**色数 = 1**）。
> 本批落 `apps/web/src/styles/diff-tokens.css`（**第 3 方主题域 · 有意字面值** · GitHub 亮色系，与旧 `DiffView` 的 `#1a7f37`/`#cf222e` 同源先例）
> ⇒ 实测色数 **1 → 6**。**新增语言时无需改此文件**（类名通用），但**新增 token 类型可能需补规则**。

> ⚠️ **字号与行高必须在主题域定值（v0.14 · F195 实测补充）**：库 CSS 只定 `font-family` 与
> `.diff-line{line-height:1.5}`、**不定字号** ⇒ 字号从外层继承**根值 16px**，比同页正文（13px）还大一圈
> （实测：继承 **16px** · 卡片标题 **13px** ⇒ 方向与 GitHub 相反）。
> **定值 = 字号 `12px` · 行高 `20px`**（落 `styles/diff-tokens.css`）：
>   · 字号 **12px** —— 与 **GitHub diff 实测值一致**（其 `.diff-text-cell` = 12px · 2026-09-22 真浏览器实测
>     `github.com/sunxuewen-rush/ai-asset-hub/commit/712c118`；其行容器实测 24px、页面正文 14px）；
>   · 行高 **20px**（1.67）—— GitHub 用 24px（2.0），但那是**整页宽**视图；本面主列实宽约 **755px** 的窄列下
>     明显疏朗 ⇒ 按控制台信息密度收紧，**属有意偏离、值可单点回改**。
>   两处挂载点共用 `DiffWorkspace` + 本主题文件 ⇒ **一处改、两处生效**（门户「版本」tab + 审核「变更对比」卡）。
>
> ⚪ **split「对侧占位格」的红竖线 = 上游默认渲染 · 本批保留不改（v0.14 · F196 登记）**：左右行数不等时短边生成的
> 占位格（官方类名 `diff-gutter-omit` / `diff-code-omit` · 官方 `README` §Class names 语义 = "**Gutter with no content**"）
> 被库自带样式 `.diff-gutter-omit:before` 画上 **2px 红竖线**（`--diff-omit-gutter-line-color: #cb2a1d` ·
> `react-diff-view/src/styles/index.css:125-138`）——**官方文档语义 vs 默认样式自相矛盾**；
> 且本仓已用**最新版 3.3.3**（`npm view` 实测）、上游 issue 搜 `omit` 无相关报告 ⇒ 属**未报告的上游默认样式**。
> **判定 = 上游行为，非我方用法错误**；**用户 2026-09-22 拍板：保留官方设计与做法、不加覆盖**（交互层保持上游原生形态）。
> 日后如确需关闭：① `--diff-omit-gutter-line-color: transparent`（连真折叠标记一起关）② 作用域精确处理
> `tr.diff-line-new-only > .diff-gutter-omit::before`（仅占位格）。**本批不做**。

## 5. 服务端改动规格（**4 处：2 处加性字段 + 1 处权限语义变更 + 1 处对比引擎替换**）

### 5.1 改动点（**1 文件 5 行 + 1 组测试** —— 组成式：`LIST_SELECT` +1 字段 · 三处查询各 +1 `leftJoin` = 3 行 · 接口 +1 行 ⇒ **1 + 3 + 1 = 5 行**）

| 文件 | 改动 | 说明 |
|------|------|------|
| `apps/server/src/review/query.ts` | `LIST_SELECT` 增一行 **`submittedByName: user.name`**；三处查询（`listQueue` / `listMine` / `getReviewDetail`）各增 **`leftJoin(user, eq(user.id, reviewTask.submittedBy))`** | 三处**共享 `LIST_SELECT`** ⇒ 一处改三面全得；`user.id` 为 PK ⇒ **1:1 不放大行数**；`leftJoin` ⇒ 用户行缺失也不丢 task 行 |
| `apps/server/src/review/query.ts` | 接口 `ReviewListItem` 增 `submittedByName: string \| null` | 与既有 `reviewComment` / `assetType`（M4b-3 R6-c）同形加性 |
| `apps/server/src/http/reviews.test.ts` | 新增 **1 组**（照 `:299-365`「读面加性」那组写法） | 三面齐（队列 / 我的提交 / 详情）+ 值 = fixture `displayName` + 与 `user.name` 一致 + **`leftJoin` 不放大行数**（`null` 兜底**不可达** ⇒ 见 §5.1b **F175**） |

**为什么不在读面实时查 LDAP**：显示名已在本地 `user.name`（LDAP 建号写入 `plugins/ldap-credentials.ts:200-208`，
且**每次登录自动同步** `:179-183`）⇒ 读本地列零新依赖、零延迟、零新故障面；实时查 LDAP 会把
目录可达性引入读面（抖动 ⇒ 队列读面挂）。

### 5.1b 读面第 2 加性字段 `latestVersion`（**仅详情查询** · G-Q8 · v0.9）

**动因**：§4.10 审核面「变更对比」需要 base = 当前**已发布版本**，而真码 `ReviewDetailItem` **无该字段**
（实测 12 字段清单见 §2.1e F-a）。

| 文件 | 改动 | 说明 |
|------|------|------|
| `apps/server/src/review/query.ts` | `getReviewDetail` 查询 **+1 `leftJoin`**（`asset_version` **自连接**：`alias(assetVersion, 'latest_version')` on `asset.latestVersionId` —— `asset` 与 task 的那版 `asset_version` **主查询已 join**）+ select **+1 字段** + 接口 **+1 字段** | **组成式：1 select + 1 自连接 + 1 接口行 = 3 行**（**不含** `LIST_SELECT`）· **本仓首个 `alias()` 用法**（drizzle 官方 helper）—— 替代方案是加一次小查询，但多一次往返且非原子 ⇒ 取单查询自连接（**F176** 订正：v0.9 原文写「2 join」，其中 `asset` 那侧本已存在） |
| `apps/server/src/review/query.ts` | `ReviewDetailItem` 增 **`latestVersion: string \| null`** | `null` = 该资产**从未发布过**（首版审核 ⇒ §4.10 **整卡不渲染**） |
| `apps/server/src/http/reviews.test.ts` | **新增 1 组**（5 例）：三面齐 = `user.name` · join 不放大行数 · **`latestVersion` 两态**（从未发布 ⇒ `null`；已发布 1.0.0 后再提 ⇒ `"1.0.0"`）· 队列/我的提交**不含**该字段 · `submittedByName` 的 `null` 分支**不可达**（**F175**：`submittedBy` 有 FK + 用户仅软删 `DISABLED` ⇒ 行恒在，`\| null` 属防御性类型，夹具无法构造 ⇒ 用例改为断言「字段在场 + 值 = `user.name`」） | **新增组而非改既有组**（两加性字段各自独立成组，便于回滚定位） |

**为什么只加在详情查询、不动 `LIST_SELECT`**：`LIST_SELECT` 被 `listQueue` / `listMine` / `getReviewDetail`
**三面共享** ⇒ 若在共享 SELECT 加，会让**队列列表**也背上 **2 个 join 的性能税**，而队列**不消费**该字段
（§4.1 的 7 列无此列）⇒ 按「**不动后端优先** + 只给需要的面」口径落在**详情查询内**。

### 5.2 契约影响（向后兼容论证）

| 面 | 影响 | 结论 |
|----|------|------|
| 响应形状 | `ReviewListItem` **+1 字段** | **向后兼容**（既有消费方按字段读取，新增字段不影响） |
| 「我的提交」页（M4b-3） | 同源 `LIST_SELECT` ⇒ 多收 `submittedByName` 一字段 | **纯加性无感**（该页不渲染提交人列 ⇒ 零 UI 变化） |
| `latestVersion`（§5.1b） | **仅 `ReviewDetailItem`**（详情端点） | **纯加性**；**队列 / 我的提交两面零影响**（含零性能税 —— 不在共享 SELECT） |
| 排序 / 分页 / 过滤 | 不受影响（`leftJoin` 不改行数与条件） | 零语义变化 |
| 迁移 | **零**（无 schema 变化） | — |
| 权限 | 不变（读面授权面零改动） | — |

### 5.3 测试面

- **新增**：`submittedByName` 加性 1 组（三面齐 + 值断言 + `null` 兜底）
- **既有回归**：`http/reviews.test.ts` 全量（19 例基线）· `review/query.test.ts` · `http/me.test.ts`
- **不动**：断言不得依赖库洁净度（AGENTS.md 硬规则）；本批不弱化任何既有测试

---

### 5.4 R2 权限语义变更（第 2 处）

- **改动面清单见 §4.6.1**（引用不复制）；本节只记契约影响与测试面。
- **契约影响（向后兼容论证）**：`POST /approve` 与 `/reject` 的**出参不变**；变化是**错误码收窄** ——
  `review.self_review`（403）不再可能返回。客户端若对该码做过特判，特判成为死分支（**不破版**，只失效）。
- **测试面**：`auth/rbac.test.ts:125-135`（删块）· `review/service.test.ts:328`（改写为放行断言）——
  其余审核用例不受影响（它们用的是「他人审核」路径）。
- **零迁移**：无 schema / 无数据变更（与 §5.1 的加性字段合起来仍为**读面改动 + 权限语义改动**）。

### 5.5 版本对比引擎替换（第 3 处 · **含 1 处破坏性契约变更 · F156**）

**动因**：`assets/version-compare.ts` 的 `lineDiff()` 为**自研 LCS DP**（`MAX_DIFF_LINES = 1500` 矩阵 + 回溯，238 行文件内的核心约 70 行）
⇒ 按用户口径「服务端能用官方就用官方」换为 **`diff`(jsdiff) `9.0.0`**（BSD-3-Clause · **零依赖** · 105.3M 周下载 · 2026-09-22 实测）。

**改动点**

| 文件 | 改动 | 说明 |
|------|------|------|
| `apps/server/src/assets/version-compare.ts` | `lineDiff()` 自研 LCS DP ⇒ `structuredPatch()`（hunk 数据）/ `createTwoFilesPatch()`（文本） | **保留** `MAX_DIFF_LINES` / `COMPARE_READ_CAP` 门槛与 `binary` / `truncated` 标注 |
| 同上 · **格式编排层（~20 行）** | 每个文件产 **一段完整 `diff --git` 段**（**3 行头** + 库产 hunk）并拼接为**单一 `patch` 字符串** | 属**格式编排**非造轮子（库产 hunk 数据 ⇒ 我方拼头）· 格式由 **PoC 变体 F/G 实证**（§2.1d）· 规范见下 |
| 同上 · 契约 | `CompareFile.hunks?: Array<{ lines: DiffLine[] }>` → **`patch: string`** | **破坏性替换 · 不双写**（符「退役倾向彻底删除」） |
| `apps/web/src/api/types.ts:94-110` | 删 `DiffLine` / `DiffLineType` / `hunks`，加 `patch: string` | 随消费端同批改 |
| **diff 结果缓存** | 进程内 Map（key = `assetId + from + to + **两侧 sha256**` · **TTL 5 分钟** · **LRU ≤ 100 条**） | 内容变 ⇒ sha 变 ⇒ **自动失效**；重启即清（不落库、不加表） |

⚠️ **安全硬约束**：缓存**只存「内容 → diff 结果」**，**永不缓存「授权判定」** —— **命中缓存也必须先过 `decideDownload`**（授权检查在缓存读取之前）。

**测试隔离（G-Q12）**：模块**导出 `__resetCompareCache()`**（仅测试 import · 约 3 行）⇒ 单测 / dogfood
在相关组前后各调一次；并**明令：dogfood 与单测不得断言「缓存命中 / 未命中」**（只断**结果正确** ⇒ 不测实现细节）。

**patch 格式规范（G-Q11 · 实现期以 §9.3 G10 ① 断言复证）**

```text
diff --git a/<path> b/<path>          ← 恒有（单文件段首行）
--- a/<path>   |  --- /dev/null        ← ADDED ⇒ /dev/null
+++ b/<path>   |  +++ /dev/null        ← DELETED ⇒ /dev/null
@@ -a,b +c,d @@                        ← 库产 hunk 头（jsdiff structuredPatch → 我方渲染）
<context / add / del lines>
```

| 约束 | 取值 | 理由 |
|------|------|------|
| `index <old>..<new> <mode>` 行 | **不产** | 我们只有 **`sha256`**（内容摘要），**不是 git blob sha** ⇒ 产 index = **伪造 git 语义**；且解析器**不依赖** index（§2.1d 变体 **E** 仅 `---`/`+++` 即可解析 ⇒ 实证） |
| `new file mode` / `deleted file mode` / `similarity index` / `rename` 头 | **不产** | 同上（避免伪造 git 元数据；`changeType` 已由字段承载） |
| 增 / 删文件的头表达 | **ADDED ⇒ `--- /dev/null`** · **DELETED ⇒ `+++ /dev/null`** | git 标准 · 与 `changeType` **一一对应** |
| 多文件 | **每文件一段**，段序 = **`files[]` 顺序**（服务端已按路径升序） | 让 `parseDiff` 结果**文件序**与 `files[]` 一致（G10 ① 断言的依据） |
| 未变更文件 | **不出段**（服务端 sha 全等即 `continue`，既有行为） | 与现状一致 |

**契约变更的消费者清单（7 处 · 全量普查 2026-09-22）**

| # | 消费者 | 动作 |
|---|--------|------|
| 1 | `apps/server/src/assets/version-compare.ts` | 生产者（本条） |
| 2 | `apps/server/src/http/assets.test.ts:746` 组（`:796` / `:831` / `:842` / `:845` 读 `hunks[0].lines`） | 断言改写为对 **`patch` 文本**断言（**契约变更 ⇒ 断言同步，非为绕测而改**） |
| 3 | `apps/web/src/api/types.ts:94-110` | 类型替换 |
| 4 | `apps/web/src/components/market/detail/VersionCompare.tsx` | 消费改向 `DiffWorkspace`（§4.10） |
| 5 | `apps/web/src/components/market/detail/DiffView.tsx` · `DiffNav.tsx` | **退役**（`git rm`，§3.2） |
| 6 | `docs/smoke/scripts/m4a-chain-smoke.ts:62,99` | 2 处断言改读 `patch` |
| 7 | `apps/web/src/pages/__proto/M4b5DiffPoc.tsx` | **物料不进仓**（收尾即删 ⇒ 零影响） |

**零外部消费者（实测）**：`packages/` 下仅 `protocol`，其中**无 compare 相关类型** ⇒ 契约变更**不出前端面**（这是「破坏性替换不双写」成立的前置条件）。

**不随替换放宽（4 项）**：`decideDownload` 授权 · `MAX_DIFF_LINES = 1500` · `COMPARE_READ_CAP = 512KB` · 超限 ⇒ `truncated` 标注且**不产 patch**（前端只读标注，不自行判定）。

## 6. i18n 变更规格

### 6.1 `review` 组扩（口径 + 组成式）

**净增 = 56 键**（`review` 组 5 → **61**；F190 退役 `preview.failed` ⇒ 405 → **404**）—— 组成式：
**队列 14** + **详情 12** + **动作与确认 13** + **提示与空态 8**（含 R2 新键 `review.adminOnly`；F190 退役 `preview.failed` ⇒ 9 → 8）+ **变更对比 9**（v0.7 · F156）= **57**

| 段 | 键（逐键） | 计数 |
|----|-----------|:----:|
| 队列 | `col.asset` · `col.type` · `col.status` · `col.name` · `col.employeeId` · `col.submittedAt` · `col.actions` · `subtitle` · `filter.label` · `filter.all` · `status.pending` · `status.approved` · `status.rejected` · `status.withdrawn` | 14 |
| 详情 | `detail.submitter` · `detail.task` · `detail.reviewVersion` · `detail.manifestTitle` · `detail.mainDoc` · `detail.files` · `detail.servers` · `detail.transport` · `detail.enabled` · `detail.command` · `detail.url` · `detail.you` | 12 |
| 动作与确认 | `withdraw` · `action.processed` · `confirm.approveTitle` · `confirm.approveDesc` · `confirm.approveOk` · `confirm.rejectTitle` · `confirm.rejectDesc` · `confirm.rejectOk` · `confirm.withdrawTitle` · `confirm.withdrawDesc` · `confirm.withdrawOk` · `reason.placeholder` · `reason.hint` | 13 |
| 提示与空态 | `toast.approved` · `toast.rejected` · `toast.withdrawn` · **`emptyHint`**（队列页面级空态副述 · G-Q1 补入）· `empty.filtered` · `preview.unavailable` · `preview.yanked` · `preview.failed` · **`adminOnly`**（R2 新键 —— v0.7 补正：v0.6 正文计 9 而本行漏列，**已修正为 9**） | 9 |
| **变更对比**（v0.7 · F156） | `detail.compareTitle` · `detail.compareEmpty` · `diff.split` · `diff.unified` · `diff.highlight` · `diff.binary` · `diff.truncated` · `diff.failed` · `diff.toggleFile` | 9 |

**口径（两条）**
1. **领域文案自持**：列名 / 页内 / 动作 / 确认 / 提示一律落 `review` 组 —— 照仓例（`assets` / `submissions` /
   `market` **三组各自持 `col.*`**，实测）
2. **组件层固定文案跨组复用**：`market.colShow` / `colRequired` / `colReset`（列开关入口）+ 列开关
   「必显 / 重置」两处 —— 照 k1 先例 ⇒ **本项 +0 键**

**复用既有（不新增）**：`review.title`（顶栏 + 详情）· `review.approve` / `review.reject`（动作钮）·
`review.reason`（驳回原因 `FieldLabel`）· `review.empty`（队列页面级空态标题）·
`errors.review.*` **五码**（R2 后 `review.self_review` 退役）。

**数字口径**：本表为**计划值**（键尚不存在）；实现期用 `bun docs/smoke/scripts/m4b4-measure.ts`
（按组实测 + 双语双向差集 + en 值级中文泄漏三项）**实测回填**，回填项见 §9.8。

### 6.2 组件层跨组复用（+0 键）

`market.colShow` · `market.colRequired` · `market.colReset` —— 列开关入口的两个固定文案与 tooltip
（与「我的资产」同一入口件、同一键，形态单源）。

### 6.3 键退役（**1 键**）

| 键 | 组 | 处置 | 原因 |
|----|----|------|------|
| `assets.admin.reviewGroup` | `assets` | **退役**（双语同删）；消费者仅 `AssetAdminCard.tsx:167`，随占位块删除（§3.2 #5） | 审核动作归 `/reviews/:id`；资产详情页管理区语义 = 资产管理 |

⇒ `assets` 组 79 → **78**；`errors` 组 35 → **34**（R2 退役 `review.self_review`）；全仓 `350 → 405`（= 350 + **57** − **2**〔`assets.admin.reviewGroup` + `errors.review.self_review`〕）。
（v0.6 记录值为 `396` = 350 + 48 − 2；v0.7 因 diff 面 **+9** ⇒ 现行口径 **405**。）

### 6.4 孤儿键转正（净减，非新增）

`review.reason` · `review.empty` 本批**获得消费者**（驳回原因 `FieldLabel` / 队列页面级空态标题）。

**顺带订正**：现「未消费键」测量口径是 `docs/smoke/scripts/m4b4-audit-scan.sh` ③ 段的**人工 12 键清单**
（非全表扫描）⇒ **实证漏项**（上述两键无消费者却不在清单内）⇒ 改为**按组全扫**（登记 §9.8）。

---

## 7. 接口变更总览（服务端面）

### 7.1 端点表（本批）

| 端点 | 变更 | 契约 |
|------|------|------|
| `GET /api/reviews` | **加性** | item 形状 + `submittedByName: string \| null`；参数面不变（`status`/`limit`/`offset`） |
| `GET /api/reviews/mine` | **加性** | 同上（同源 `LIST_SELECT`） |
| `GET /api/reviews/:id` | **加性（2 字段）** | 同队列加性 + `manifestJson` / `files[]`（既有）+ **`latestVersion: string \| null`**（G-Q8 · **仅详情** · §5.1b） |
| `POST /api/reviews/:id/approve` | **零改动** | 200 `{taskId, status, version}` |
| `POST /api/reviews/:id/reject` | **零改动** | 200 同上 |
| `POST /api/reviews/:id/withdraw` | **零改动** | 204 |
| `GET /api/assets/:slug/versions/:version/files/*` | **零改动**（消费方新增） | 预览内容；授权 = 资产读面 + 版本态判定（§4.4） |
| `GET /api/assets/:slug/versions/compare` | **破坏性变更**（F156 · §5.5） | `files[].hunks[]`（`{lines: DiffLine[]}`）→ **`files[].patch: string`**（标准 unified diff 文本）；**授权 / 截断 / `binary` 标注不变**；消费方 **3 件**同批改 + 2 处 dogfood 断言 |

### 7.2 token scope 交叉登记（**文档级 · 不做实现 / 不做 token 面 dogfood**）

| UI 动作 | 端点 | scope 交集（真源 `auth/token-scopes.ts` + `http/reviews.ts`） |
|---------|------|-------------------------------------------------------------|
| 看队列 | `GET /api/reviews` | **无 scope 门**（仅 `requireAuth` + `role >= ADMIN`） |
| 看详情 | `GET /api/reviews/:id` | **无 scope 门**（task 面授权） |
| 通过 / 驳回 | `POST …/approve` · `/reject` | **`review:approve`**（`:109` / `:132` `assertTokenScoped`） |
| 撤回 | `POST …/withdraw` | **`review:submit`**（`:152`） |

**理由**：本批 UI 走**浏览器会话面**；token 面（含 scope 收窄实跑）归 **M5 CLI**。本表供 M5 与文档查阅。

---

## 8. UI-UX 变动总览（本批用户可见变化）

| 面 | 现状 | 变动 |
|----|------|------|
| `/admin/reviews` | `ComingSoon` 占位（DEV 角标 `M4b-5`） | **真页**：7 列表格 + 状态筛选 + 列开关 + 分页 + 操作列真链接进详情 |
| `/reviews/:id` | `ComingSoon` 占位 | **真页**：面包屑（按「谁的面」分叉）+ 页头 + 两栏（主列 = 分型 manifest 卡 + **变更对比卡** + 文件树 / 右栏 = task 元信息卡 + 动作卡） |
| 资产详情页 owner 管理区 | 一组**禁用灰钮**「通过 / 驳回」+ 组标题「审核（形态待讨论）」 | **整块删除**（跨批改动；审核动作统一归审核详情页） |
| 顶栏 | `/reviews/:id` 显示「审核详情」 | **不变** |
| 侧栏 | 「管理」组「**审核管理**」条目（真源 `admin.reviews`） | **不变**（文案即真源，非本批新增） |
| 队列项数 | 侧栏「待审核」卡（工作台）计数 = 全站队列 `total` | 不变（本批不改计语义） |
| **门户 · 资产详情「版本」tab**（既有面） | 自绘 diff（无左右对比 · 无语法高亮开关 · 无折叠） | **升级**：默认**左右对比** + 语法高亮可开关 + 按文件折叠懒渲染（同一件 `DiffWorkspace` · §4.10） |
| **审核详情「变更对比」卡**（新增面） | — | **新增**：base = 当前已发布版本 · head = 待审版本（同一件 · §4.10） |

**结构/视觉边界**：本批**不新造**色值 / 字阶 / 圆角 / 密度（视觉 SSOT = M4a design §4.4，引用不复制）；
表格密度沿用控制台现状（行高 40 操作态）；两栏右栏宽 **320px**（沿用门户详情页真值）。

---

## 9. 回归面与验证口径

### 9.1 零回归（**硬约束**）

| 目标 | 口径 |
|------|------|
| 门户（M4a） | `m4a-dogfood` **60/0** |
| 个人面 A/B（M4b-3 / M4b-4） | `m4b3-personal-a-dogfood` **43/0** · `m4b4-personal-b-dogfood` **89/0** |
| 链路冒烟 | `m4a-chain-smoke` PASS |
| 服务端 | `test` 基线 **559 pass / 0 fail**（**文档记载值**，来源 = M4b-4 批 plan 收尾实测；**本批收尾须复测**）+ 本批新增 1 组 |

**迁移件（§4.5）额外回归**：门户文件树 / 预览路径（详情页「文件」tab）必须逐条走一遍 ——
迁移是纯路径移动，风险点只有 import 断链（`typecheck` + `build` 兜底）。

### 9.2 门禁与冒烟顺序（复现 CI · AGENTS.md 硬规则）

```text
bun install --frozen-lockfile → typecheck → lint → format:check →
bun docs/smoke/scripts/doc-audit.ts → build → db:migrate → test
```

逐项 **exit 0** 才算过；顺序不得调换（CI 同序）。

### 9.3 本批 dogfood 分组（新建 `docs/smoke/scripts/m4b5-review-dogfood.ts` · 支持 `SMOKE_ONLY=<组>`）

| 组 | 覆盖 |
|----|------|
| **G1** 队列（管理档） | 7 列集合（列头文案逐条）· 状态筛选（「全部」不传参）· 分页在场/缺席 · **操作列真链接**（`a[href="/reviews/<id>"]`）· 列开关菜单 7 项 + 保护 2 项置灰 |
| **G2** 队列（提交人） | 前端 `RoleGuard minRole=ADMIN` **守卫层弹回** `/dashboard`（**零请求、零白屏** —— 非服务端 403；服务端 403 面另由 `reviews.test.ts` 既有例覆盖） |
| **G3** 详情 · skill | 面包屑「**审核管理**」+ 页头（slug · v版本）· manifest 卡 **skill 形态**（含 `SKILL.md` 行）· 文件树行数 · 三动作在场 |
| **G4** 详情 · mcp | `servers` 块存在 + **条数组成式**（「2 条 = stdio 1 + http 1」）+ type 徽章 + url/command 呈现 |
| **G5** 详情 · agent | `keywords` 等族字段行 + passthrough 字段不报错 |
| **G6** 三动作 | 通过（**可选意见**，空亦可提交）· 驳回（**空原因 ⇒ 确认钮 `disabled`**）· 撤回 ⇒ 各带 toast（**含版本号**）+ 跳回来源 + `invalidateCache` 生效 |
| **G7** 权限矩阵（R2） | **管理档对自己的提交 ⇒ 三动件照常渲染**；提交人（非管理档）⇒ 仅撤回 + 说明行「仅管理员可审核」；非管理员视角无裁决动作 |
| **G8** 边界 | `REJECTED` 详情（**不可预览说明行 + 文件行无预览动作** + 文件树仍在）· B1（owner ≠ 提交人 ⇒ 预览弹层内联提示，**不破版**） |
| **G9** 零回归 | §9.1 三脚本复跑（`m4a` / `m4b3` / `m4b4`） |
| **G10** 变更对比（F156） | ① **契约**：详情/资产页 diff 区取到**非空 `patch` 文本**（`diff --git` 头）且 `parseDiff` 结果**文件数 = 服务端 `files[]` 数** + **段序一致** + **增删头正确**（`ADDED` ⇒ `--- /dev/null`；`DELETED` ⇒ `+++ /dev/null`；**不出现 `index` 行**）（**编排层可达性硬断言** · 支撑 G-Q11）② **左右对比默认在场**：split 态下每行 **2 个代码单元格** ③ **高亮开关两态**：开 ⇒ token span **> 0 且色数 ≥ 2**〔实测 **555 / 6**〕；关 ⇒ **token span = 0**（**React 19 token 高亮回归断言** · 防升级静默丢失）—— ⚠️ **v0.11 口径订正（F182）**：原文写「关 ⇒ 色数 = 1」是 ① 候选库的口径，② 的实测口径是 **0 span**（不传 `tokens` ⇒ 无 token span）④ **折叠懒渲染**：默认折叠时 diff 区 DOM **不含**未展开文件的行 ⑤ **降级**：`binary` / `truncated` 文件显对应提示且**不渲染 diff 区** ⑥ **无权限不渲染**：不可预览版本 ⇒ **整卡不渲染**（非灰卡）⑦ **无对比对象两态（G-Q9）**：首版（`latestVersion=null`）⇒ 整卡不在场；同版本重审 ⇒ 卡在场 + 空态文案 ⑧ **容器回退（G-Q10）**：把容器收窄至 <960 容器 px ⇒ 切到 `unified`（每行 **1** 个代码单元格）**⑨ 缓存（G-Q12）**：**不断言命中率**（只断结果一致） |

**跑法**（沿用 M4b-4 T11-g 机制）：先复位造数 → 分段跑（`SMOKE_ONLY=G3`）⇒ 改一处只跑相关段，
**收尾才全量**；`NO JS ERRORS` 为每段硬门。

### 9.4 出口件 ④（本批验收清单）

1. **G1–G10 全绿** + `NO JS ERRORS` 2. 三族详情页**截图各 1 张**（skill / mcp / agent）3. 队列页截图（7 列 + 列开关 ）4. 三动作成功路径截图（通过含意见 / 驳回含必填原因 / 撤回）5. 权限矩阵双视角截图（**管理档自查** / 提交人自查）6. `REJECTED` 不可预览态截图 7. **零回归三脚本**输出存档
8. **diff 面证据**：门户 + 审核面各 1 张截图（**split + 高亮开**）+ G10 断言输出 + **构建产物 gzip 实测值**（§9.8）

### 9.5 定稿条件 ② 闭合证据（**本批独有出口件**）

- 证据 = **三族卡形态断言（G3/G4/G5）+ 三张截图 + 结论一句**（「同一详情页上三族形态自适应、不空窗」）
- **判据范围（G-Q3 定死）= 只证 UI 形态**：管线的族适用性由 M3 已交付端点 + 测试在册，**端到端三族全链路不在本批范围**
- ⚠️ `mcp` / `agent` 族的「**无 README 回退分支**」必须真造一条（否则实证不成立）—— 见 §9.6 fixture **②/③**（② mcp 也**不造 `README.md`**，G-Q2 定）
- 用户据此对**主 design** 单独下**定稿口令**（**不在本批自动翻转**；主 design 头部条件 ② 由 ⬜ 改 ✅ 后
  方由用户批准转定稿）

### 9.6 造数需求（**写库须用户授权**；脚本进仓，口令不落库）

**新建 `docs/smoke/scripts/m4b5-seed-reviews.ts`**（可重放 · 幂等 · 零 `delete` · 只碰 `m4b5-seed-*` / `m4b5_*` 前缀）

- **专用账号**：`m4b5_owner`（资产 owner）· `m4b5_member`（上传者 / 提交人）—— **不碰**
  `m4b2_user` / `m4b2_mgr` / `m4b2_super` / `m4b4_outsider`（管理档与超管沿用既有账号）
- **三族 fixture 资产的 `asset.status` 一律 `HIDDEN`** ⇒ **零门户列表污染 + 零「我的资产」污染**
  （门户列表恒 `status = ACTIVE`；而「我的资产」显式 `status=ALL` ⇒ 必须靠专用账号挡）；
  审核人 = 管理档在「非 ACTIVE 授权集」内 ✅ 照样可审、可预览
- **fixture 清单（6 条）**

| # | 族 | 资产态 | task 态 | 用途 |
|---|----|--------|---------|------|
| ① | skill | `HIDDEN` | `PENDING` | 三族实证主体验 ①（含 `SKILL.md` ⇒ 走主文档分支） |
| ② | mcp | `HIDDEN` | `PENDING` | 三族实证主体验 ②（`servers` **2 条 = stdio 1 + http 1** ⇒ 组成式可断言 · **不造 `README.md`** ⇒ 与 ③ 共同实证回退分支 · G-Q2） |
| ③ | agent | `HIDDEN` | `PENDING` | 三族实证主体验 ③（**不造 README** ⇒ 实证回退分支） |
| ④ | skill | `HIDDEN` | `REJECTED` | Q4「版本不可预览」+ 驳回原因行 + 静态动作区 |
| ⑤ | skill | `HIDDEN` | `WITHDRAWN` | 已撤回状态行 |
| ⑥ | skill | `HIDDEN` | `PENDING` | **B1 边界**：owner = `m4b5_owner`、提交人 = `m4b5_member`（上传者代提）⇒ 提交人详情可见 / 预览 404 |

- **F189 追加（实现期 · v0.12）—— 上表 6 条不含「可比态」数据**，而 G10 ①⑧ 需要**真实 patch** ⇒ 追加：
  - **⑦ `m4b5-seed-compare`**（skill · HIDDEN）：`1.0.0 PUBLISHED`（`latest_version_id` 落位）+ `1.1.0 UPLOADED`（PENDING）· 两版**内容不同**（`SKILL.md` 改写 + 新增 `scripts/search.mjs` ⇒ `ADDED` 头可断）
  - **⑧ `m4b5-seed-samever`**（skill · HIDDEN）：`1.0.0 PUBLISHED`（= latest）+ **task 指向同一版本** ⇒ G10 ⑦ 空态
  - **⑩–⑬ 动作专用 4 条**（`act-reject`/`act-approve`/`act-withdraw`/`act-member`）：G6 真点三动作**会改库** ⇒ 与其它组依赖的 fixture **隔离**（分段跑与全量跑都不互相打翻）
  - **⑥ B1 语义订正**：上传者须为 **owner 本人**、提交人 = `m4b5_member`（代提）—— 否则成员即上传者、在预览授权集内 ⇒ **B1 不成立**
- **内容必须真写存储层**（`<assetId>/<versionId>/<path>` · 与 `versions.ts:115` 同布局）—— `version-compare` 经 `storage.get` 读**真实文件内容**
- **口令**只从 env 读（复用 `SMOKE_M4B2_PASSWORD` 约定）；运行方式 `bun --env-file=apps/server/.env …`（根目录无 `.env`）
- **既有基线保护（实测两处，均不脆）**：`m4a-dogfood:809-820`「资产数 < limit ⇒ 无分页控件」依赖
  `/skills` **ACTIVE** 数 < 20（余量充足；fixture 全 `HIDDEN` 更不参与）；`m4b4` G3 判**卡链接集合 +
  业务请求数 + 审计卡内容**，**不依赖队列 `total`** ⇒ 新增 PENDING 行不打翻它

### 9.7 规范与文档同步（本批即改 / 收尾回填）

**本批即改（随实现提交）**
1. 主 design **§2.3 批件登记表**：M4b-5 行 ⬜ → 实际件名 + 版本 + 状态 + 批间门
2. 主 design **§5.1 / §5.2**：队列列集合（**7 列**）与详情形态（两栏 / 面屑判据）回写
3. 主 design **§6.3 迁移影响面订正**：原文「仅需同步更新**唯一**引用方 `FilesTab.tsx:5,7`」
   ⇒ 真值 **3 处 import**（`FilesTab` 2 行 + `VersionCompare.tsx:13` 1 行）+ `fileTreeNodes` 同批迁
4. 主 design **§7.1 端点表**：`ReviewListItem` 形状行 + `submittedByName`
5. 主 design **§8 接口变更总览**：+ 一行「加性字段 `submittedByName`」（R6-c 同节）
6. 主 design **§11 键数链**：现最新行 = **347**（`:801`）**落后实测 350**（`j6` 的 +3 未回填）⇒ 补 350 +
   追加 M4b-5 行（组成式）
7. 主 design **§2.4 U5 半句订正**：同段前半「类型（**无色图标**）」（真码）与同段末「类型列 = **类型色小块 + 文案**」
   **自相矛盾** ⇒ 按真码订正末半句（`pages/Assets.tsx:197-203` 注释「R14：无色图标 + 文案」）
8. 主 design **§12 线框原地保留**（两张 · 归属 `→ M4b-5`）：本批**不自画**，改为 **§4.9「线框 ↔ 批 design 差异声明」**（引用不复制 · 照 M4b-3 §4.4.2）；§12 的状态列 / 列开关 / 三动作演进**不回画** ⇒ 归 **M4b-7 完整 converge**
9. `docs/00` **§5 M4b-5 行**：⬜ 待对齐 → 实现进度 + 证据指针
10. **P3 文案统一（v0.9 拍板）**：主 design **§11 文案分层口径** · **§12 线框**（两张内文案）· `docs/00` 中凡指本页者
    ⇒ 「**审核队列**」统一为「**审核管理**」（真源 `admin.reviews` · 侧栏同键）；**字典值不改**（改字典会连带改导航）

**收尾回填（数字实测）**
- i18n 键数实测（§6.1 计划值 → 真值）+ 双向差集 0 / en 值级中文泄漏 0
- `test` 实测例数 / dogfood 断言数（组成式）/ 件表行数实测（§9.8）

### 9.7b 跨批契约变更的规范同步项（**R2 + F156** · 随本批实现同批提交）

1. **规范层原地改**：`docs/05-identity-access.md` §6.4 —— 删除防自审规则行 + 记**有意偏离**（四眼原则）
2. **主 design 原地改**：§7.1 接口契约表删 `self_review` 行 + `:390`「双保险」句删「防自审」例举（**跨批契约活文档**）
3. **M3 批 design 只加指针**（不回改历史批文档）：§3.3 与 §13 运营注记各加一行
   「⇒ **防自审已于 M4b-5 R2 废除**（2026-09-21 · 管理档可自审）；见 05 §6.4 / 主 design §7.1」
4. **F156 diff 退役的跨文档指针**（**历史批 design 只加指针 · 不回改**）：
   `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` 组件树 `:192-193`（`DiffNav.tsx` / `DiffView.tsx`）·
   `docs/designs/2026-09-14-m4b1-console-foundation-design.md` §3.13 / §3.14 与件清单 `:75` / `:84` / `:200`
   ⇒ 各加一行「⇒ `DiffNav` / `DiffView` 已于 **M4b-5（F156）退役**（见 `2026-09-21-m4b5-review-workbench-design.md` §3.2 / §5.5）」
   · `docs/plans/*`（M4a-visual-shadcn / M4a-marketplace / M4b-1）为**一次性执行记录** ⇒ **不回改、不加指针**
5. 本次变更**不新增**规范层概念（只删规则 + 记偏离 + 记复归点）

### 9.8 收尾回填项（本批遗留的「写数字」动作，全部用**实测**）

1. i18n：`review` 组净增与全仓总数（命令 = `bun docs/smoke/scripts/m4b4-measure.ts`）
2. `test` 例数（基线 559 + 本批新增）· dogfood 各组断言数（**组成式**）
3. 件表行数（**新建 6 / 改造 11 + 退役 2** / 3 文档）与迁移 3 件的 `wc -l`
4. **§9.5 定稿条件 ② 证据**归档（截图路径 + 断言输出）
4b2. **G-Q8–G-Q13 落点的实测回填（v0.9）**：详情 `latestVersion` 真值（有/无已发布版本两态）· `patch` 头行**逐行**比对（无 `index`）· 容器回退阈值实测确认（960 容器 px 下 split 是否仍可读）
4b. **diff 面实测回填（F156 · 4 项 · 全部用真值）**：
   - **构建产物 gzip 体积**（`vite build` 后按 chunk 实测）—— 对照 §2.1d 估算值 **≈33KB**；**偏差 > 20% 须回填并复核**（硬约束 2）
   - **`refractor` 实际注册语言数**（= 21 · 复核清单与真码 import 一致）
   - **单文件渲染耗时阈值**（开高亮 vs 关高亮 · 以 §9.6 fixture 实测）⇒ 定死「降级为关高亮」的阈值（初值 **200ms** · §2.1d）
   - **端到端 patch 长度上限**（1500 行 × 2 侧的上界值）⇒ 定死缓存 LRU 的单条内存占用估算

**实测回填（v0.13 · 2026-09-22 · 全部真值，禁估算）**

| 项 | 实测值 | 证据 |
|---|---|---|
| i18n 总数 / 差集 / 组数 | **404 / 404** · 双向差集 **0** · 组 **12**（`review` **61** · `errors` **34** · `admin` **6** · `submissions` **25**） | `zh.ts` / `en.ts` 逐叶递归计数 |
| `test` 例数 | server **562 pass / 0 fail**（八步门禁第 8 步 · turbo **4/4** successful） | `bun run test` |
| dogfood 断言数 | **62 条**（G1–G10 全量 · 含 `G10⑭`）；分段 `SMOKE_ONLY=G10` **15/15** | `docs/smoke/scripts/m4b5-review-dogfood.ts` |
| 件表 `wc -l` | 新建：`DiffWorkspace` **358** · `diff-tokens.css` **117** · `ReviewQueue` **275** · `ReviewDetail` **363** · `ManifestCard` **157** · `ReviewMetaCard` **76** · `review-permissions` **88** · `refractor.d.ts` **44**；迁移：`FileTree` **139** · `FilePreviewDialog` **112** · `fileTreeNodes` **82**；脚本：seed **473** · dogfood **680** | `wc -l` |
| diff 字号 / 行高（**focal 追加**） | 字号 **12px** · 行高 **20px**（对标 GitHub diff 实测 12px · 行高按窄列密度收紧 = 有意偏离） | `styles/diff-tokens.css` · 真浏览器实测 `{fs:12px, lh:20px, rowH:20}` |
| 构建产物 gzip（按需装配） | min **158.11KB** / gzip **54.6KB**（§2.1d 估 ≈56KB ⇒ 偏差 **2.5%** · 阈值 20% 内） | `vite build`（**2542** 模块） |
| `refractor` 注册语言数 | **21**（+ `plainText` 兜底） | `components/ui/DiffWorkspace.tsx` import 清单 |
| 容器回退阈值 | **700 容器 px**（实测 755 ⇒ split · 600 ⇒ unified） | G10⑧/⑪ + **F180** |
| 高亮两态 | 开：**555** token span / **6** 色；关：**0** span | G10⑨/⑩（真浏览器） |
| `latestVersion` 两态 | 可比态 **1.0.0**（task 3214）· 同版本重审（3215）⇒ 卡内空态 · 首版 `null` ⇒ **整卡不渲染** | G10⑫/⑬ |
| patch 头 | **3 行** · **无 `index`** · ADDED ⇒ `--- /dev/null` | G10①–④（活 API） |
| **定稿条件 ② 证据** | 三族截图 `docs/smoke/m4b5-g3-detail-skill.png` · `g4-detail-mcp` · `g5-detail-agent`（本轮证据图共 **12** 张） | dogfood G3/G4/G5 断言全 PASS |

**未实测项（如实登记 · 不估数）**：①「单文件渲染耗时阈值」保留初值 **200ms**（未做耗时实测 · dogfood 不含该断言 · 触发后由「> 200ms ⇒ 关高亮」兜底）②「端到端 patch 长度上限（1500 行 × 2 侧）」未做上界实测 ⇒ 缓存 LRU 单条内存占用估算暂缺。

**本批 F 号补登**：**F192–F196** 已入 **§11 处置表**（单一事实源 · 此处不复制明细）。

---

## 10. 引用文件清单

**代码（本批改动面 —— 读 / 改均以这些为准）**

| 层 | 文件 |
|----|------|
| server 路由（**读，零改**） | `http/reviews.ts`（六端点 · 权限面 · scope 真源） |
| server 读面（**改 5 行**） | `review/query.ts`（`LIST_SELECT` +1 字段 · 三处查询各 +1 `leftJoin` · 接口 +1 行）· `review/service.ts`（三动作真值：防自审 / 状态流转 / withdraw 授权） |
| **server diff 面**（**改**） | `assets/version-compare.ts`（自研 LCS DP → `diff`(jsdiff) 9.0.0 · 契约 `hunks[]` → `patch`）· `http/assets.ts:314-329`（`compare` 路由 · 授权 `decideDownload`）· `assets/download.ts` · `assets/version-content.ts`（`readVersionFile`） |
| server 相邻真源（**读**） | `auth/rbac.ts:69-77`（`isSelfReview`）· `auth/token-scopes.ts` · `assets/download.ts`（`decideDownload` / `canDownloadPreview`）· `assets/version-content.ts`（`readVersionFile`）· `http/assets.ts:146-160`（`assertAssetReadable`）· `db/schema/governance.ts:35-62`（`review_task`）· `auth/ldap.ts` + `auth/plugins/ldap-credentials.ts`（id = 工号 / 显示名来源） |
| web 页面 | `pages/ReviewQueue.tsx`（新）· `pages/ReviewDetail.tsx`（新）· `main.tsx`（两条路由 + `DEV_BATCH`）· `pages/AssetDetail.tsx:457`（1 行）· `pages/Assets.tsx`（`COLUMNS` preset 范式参照）· `pages/Submissions.tsx`（撤回范式 / 失败收口参照） |
| web diff 面 | `components/ui/DiffWorkspace.tsx`（**新** · 薄封装）· `market/detail/VersionCompare.tsx`（改向）· `market/detail/{DiffView,DiffNav}.tsx`（**退役 `git rm`**）· `api/types.ts:94-110`（契约）· `api/compare.ts`（`fetchCompare`）· `packages` 依赖：`react-diff-view@3.3.3` + `refractor@3.6.0`（**按需 21 语言**） |
| web 件 | `components/console/reviews/ManifestCard.tsx`（新）· `ReviewMetaCard.tsx`（新）· `lib/review-permissions.ts`（新）· `console/ConfirmDialog.tsx`（改造）· `console/AssetAdminCard.tsx:76/78/163-179`（删占位块）· `ui/DataTable.tsx` · `ui/ColumnVisibilityMenu.tsx` · `ui/FileTree.tsx`（迁入）· `ui/FilePreviewDialog.tsx`（迁入）· `ui/fileTreeNodes.ts`（迁入）· `market/detail/{OverviewTab,FilesTab,VersionCompare}.tsx`（复用 / import 同步）· `api/reviews.ts`（+3 函数） |
| web 测试 / 脚本 | `docs/smoke/scripts/m4b5-seed-reviews.ts`（新）· `m4b5-review-dogfood.ts`（新）· `m4a-dogfood.ts` / `m4b3-personal-a-dogfood.ts` / `m4b4-personal-b-dogfood.ts` / `m4a-chain-smoke.ts` / `doc-audit.ts`（回归） |

**文档（引用不复制）**

- 主 design `docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`（§2.1 · §2.2 · §2.3 · §2.4 ·
  §4 · §5.1/§5.2 · §6.2/§6.3 · §7.1/§7.2/§7.3 · §8 · §9 · §10.1/§10.2 · §11 · §12）
- 规范 `docs/00-product-direction.md` §5/§7 · `docs/05-identity-access.md` §6.4 · `docs/08-data-model.md` §6
- 族协议 `packages/protocol/src/{skill,mcp,agent}/manifest.ts`（分型卡字段真源）
- 跨批 design `docs/designs/2026-09-21-table-family-alignment-design.md`（`DataTable` / 列开关契约 ·
  `AssetCard` 反向依赖先例 §4.3）
- 视觉 SSOT：`docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（引用不复制）
- 追踪表：`docs/00-product-direction.md` §5/§7

---

## 11. 8 维自检

### 11.1 首稿自检（标准 4 维 + 深度 4 维）

| 维度 | 分数 | 依据 |
|------|------|------|
| 标准 1 完整性 | **9.6** | 12 段骨架齐（对齐 M4b-4）· 决策齐（**Q1–Q12 全闭合**，§2.1）· 件表（新建 **5** / 改造 **8 + 3 文档**）· 服务端改动逐条（含现状与改法）· 测试面 · i18n 逐键表（含组成式）· 验证口径（零回归 / 门禁 / G1–G9 / 出口件 ④ / **定稿条件 ② 证据** / 造数 / 规范同步 / 收尾回填）齐 |
| 标准 2 准确性 | **9.7** | §1.2 **逐条真码实测**（`file:line` + 路由/端点/字段清单 + 键数脚本实测 + 迁移件依赖面）· 契约对主 design §7.1 · 迁移影响面按真码**订正**（3 处 import ≠ 原文「唯一」）· id 形态与显示名来源走**三层证据链**（`auth/ldap.ts` → `plugins/ldap-credentials.ts` → `db/seed.ts`）· mcp manifest record 形状逐字段核 · **仓内 `doc-audit` 68 PASS / 0 FAIL**（A 版本头一致性 / B 死路径 / C 头部长度 / D 中立三类禁） |
| 标准 3 一致性 | **9.6** | 与主 design §2.1/§2.3/§2.4/§4/§5.1/§5.2/§6.2/§6.3/§7.1/§7.3/§10.1/§10.2/§11/§12 逐条对齐；与 `docs/00` §5 M4b-5 行一致；命名合规（`YYYY-MM-DD-m4b5-<主题>-design.md`，功能自描述）；与 M4b-3/M4b-4 批 design 同构 |
| 标准 4 可用性 | **9.5** | 实现者**照抄零二次决策**：列集合与保护列 / 面包屑判据 / 判定表 / 三动作渲染矩阵 / 键名与组成式 / 服务端 2 行骨架 / 动画文案全定死；**无待拍板项**。扣分 = §4.3 的 mcp `servers` 行内呈现细节（`env`/`headers` 一律不渲染）已定死，但**块内排版**留给实现（属视觉收口范围） |
| 深度 1 追溯性 | **10** | 每条现状带 `file:line`；每个决策带 Q 编号 + 日期 + 来源（「按推荐」）；规范同步带章节；缺口 G1–G4 逐条带真值 + 处置 |
| 深度 2 反证 | **9.3** | 含向后兼容论证（5 行表）· 非目标 5 条 · 缺口 G1–G4 · **B1 边界**登记 · **G3 提示性守卫**申报 · **有意不复用** `DetailTabs` 的说明 · 「不实时查 LDAP」的理由；扣分 = 未展开被否决选项对照（按用户口径「被否决方案不进文档」⇒ **有意**不复述，如实扣分） |
| 深度 3 边界/风险 | **9.6** | 6 条边界 + 3 条登记：`REJECTED`/`YANKED` 不可预览 · B1 授权夹缝 · 并发双审（`not_pending`）与竞态 · 迁移件反向依赖（三件同迁的硬理由）· `<1100px` 动作区落底部（归 M4b-7）· fixture 基线污染面（HIDDEN + 专用账号双保险）· 用户行缺失时 `leftJoin` 不丢行 |
| 深度 4 维护性 | **9.5** | 引用不复制（主 design / 规范 / 族协议 / 视觉全走指针）· 键表可直接落码 · **判定与权限单点**（`versionStatus` 判定表 / `lib/review-permissions.ts`）· 收尾回填项显式列出（§9.8）· 修订记录 + 自检段齐 · 主 design §2.3 登记表在 §9.7 挂钩 |

**首稿均分 = 9.60**（9.6+9.7+9.6+9.5+10+9.3+9.6+9.5 = 76.8 ÷ 8）⇒ 达门（≥9）。

> ⚠️ **该分为首稿快照，已由 §11.3（grilling 后复评）取代** —— **现行分见 §11.3**。

### 11.2 自检发现与处置（首稿当场处置）

| # | 严重度 | 位置 | 问题 | 处置 |
|---|:---:|------|------|------|
| F129 | 🔴 | §3.1/§3.2 | 件表计数口径不清（`api/reviews.ts` 列「新建」还是「改造」⇒ 新建数会漂） | 已定口径：**新建 5 = 页面 2 + 面域件 2 + 单点件 1**；`api/reviews.ts` 归**改造**（§3.2 #1）+ §3.1 末行注明组成式 |
| F130 | 🔴 | §4.1 列集合 | Q2 拍 6 列、Q3c 修订 7 列 ⇒ 若只写 7 列会丢「拍板被后续细化」的账 | §2.1 Q2/Q3 两行并记「§12 线框回写」，§4.1 直书 7 列 |
| F131 | 🟡 | §6.1 | 键数原为口头预估（+45），与逐键表实际不符 | 改为**逐键表 + 组成式**（队列 14 + 详情 12 + 动作 13 + 提示 7 = **46**），标注「计划值 · 实现期实测回填」 |
| F132 | 🟡 | §4.4 | 判定表只写「可预览/不可预览」会漏「不可预测档」 | 补**运行时兜底表**（3 码）+ 明示 B1 不可预判（详情响应不含 `asset.status`/`ownerId`） |
| F133 | ⚪ | §3.2 #7 | 迁移件只写两件会造反向依赖 | 三件同迁 + 反向依赖硬理由 + 3 处 import 计数 |
| F134 | ⚪ | §9.5 | 定稿条件 ② 若只给「三张图」不足以证「回退分支」 | 明确 fixture ③ **不造 README** ⇒ 实证 mcp/agent 回退分支 |
| F135 | ⚪ | §9.8 | 全文出现多处「待订正」（主 design §6.3/§11/U5/§12） | 收拢为 §9.7「本批即改」9 条 + §9.8「收尾回填」5 项 |
| F136 | 🔴 | §2.1 Q1 | 引用**尚未创建**的批 plan 路径 ⇒ 仓内 `doc-audit` **B 段死路径**判 FAIL | 改为**不带目录前缀**的预定名（`M4b-5-review-workbench.md` + 注明「立 plan 阶段创建」）⇒ 重跑体检 **68 PASS / 0 FAIL** |
| F137 | 🔴 | §5.1 / §10 | 「1 文件 **2 行**」与正文（三处查询各 +1 `leftJoin`）**数字矛盾** | 改 **5 行** + 组成式（`LIST_SELECT` 1 + 三处 join 3 + 接口 1 = 5） |
| F138 | 🔴 | §4.6 | 错误码清单**重复列 `not_pending`、漏 `already_pending`**，且「`errors` 组 5 键」与实测 **6 码**不符 | 改「**6 码**逐码全列」（实测 `i18n/zh.ts:394-399`） |
| F139 | 🟡 | §9.3 G2 | 「组级 403」措辞把**前端守卫**说成服务端出口（守卫不发请求 ⇒ 无 403） | 改「前端 `RoleGuard` 守卫层弹回（零请求、零白屏）」+ 注明服务端 403 面由既有测试覆盖 |
| F140 | 🟡 | §9.1 | `test` 基线 559 为**文档记载值**，未标注来源 ⇒ 违反「数字必实测」口径 | 标注来源（M4b-4 批 plan 收尾实测）+ **本批收尾须复测** |
| F141 | ⚪ | §9.5 | 引用「§9.6 fixture ①/③」**错位**（① 是含 `SKILL.md` 的正证，非回退分支）；② 的 README 有无未定 | 转 **grilling 问题 Q-G2** 处置（见下） |
| F142 | 🟡 | §12 | 修订记录表形态被按**单样本**（n=1 的 M4b-4）改成少数派形态（加粗 / 无表头 / 无分隔），而**全量普查 25 份**主流 = 有表头 **21/25** + 有分隔 **21/25** + 不加粗 **19/25**；M4b 批族 **4/4** 均「加粗 + 新在前」 | 定口径 = **加粗 + 表头 + 分隔 + 新在前**（兼容普查多数与批族习惯）并按此重排 |
| F150 | 🟡 | §4.9 | 线框口径**偏离仓例**：自画两张 ASCII 并声明「自 §12 迁出」⇒ 违「**引用不复制**」（M4b-3 §4.4.2 = 引用 + 差异声明表），并与主 design §12 **双写** | 改为 **§4.9「线框 ↔ 批 design 差异声明」6 行表** · 删本批自画线框 · 演进统一归 **M4b-7 converge** |
| F151 | 🟡 | §2.1d | **缺「可点原型评审」轮**（M4b-3 §2.1d「令牌页原型评审」· M4b-4 §2.1d「原型评审记录（可点原型两视图）」均有；口径 = 真仓真件 + 假数据 + 状态开关 · 物料**不进仓** · 收尾即删） | **已落**：`__proto/` 4 文件 + `main.tsx` 2 条 DEV 路由 · 入口 2 个 · **16 张截图 · 零 JS 异常** · 证据见 **§2.1d**；**P1–P5 待你拍板** |
| F152 | 🔴 | 主 design §10.2 | 族主文档口径**与真码不符**：原文「mcp 族 `mcp.json` / `README.md`；agent 族 `agent.md` / `README.md`」—— 真码 `OverviewTab.tsx:14-21` `mainDocPath` **只有两档**（skill ⇒ `SKILL.md`；其余 ⇒ `README*`），**不探测 `mcp.json` / `agent.md`** | **已订正**（主 design **v1.61** §10.2：真码行号入档 + mcp `servers` 块口径补入） |
| F153 | 🔴 | 主 design §12 | 审核详情线框**仅 2 钮**（通过 / ~~拒绝~~）⇒ 与同文件 §10.2「动作区（通过/拒绝/**撤回**）」及服务端 `withdraw` 端点**自相矛盾**；且「拒绝」与文案真源 `i18n/zh.ts:314`（`review.reject = 驳回`）**漂移** | **已订正**（主 design **v1.61** §12：补 `[↩ 撤回]` + 拒绝 → 驳回） |
| F154 | 🔴 | 主 design :180 | 「批内内容迁移规则」把**线框**列入**迁出**面 ⇒ 与三批实践**相反**（M4b-3 判词「线框无缺口 · 引用不复制」；M4b-4 同） | **已订正**（主 design **v1.62**：规则补「**线框除外**」—— 原地保留 §12 · `→ M4b-n` 即指针 · 批 design 写差异声明 · §12 图面归 M4b-7 converge） |
| F155 | 🟡 | §4.5.1 | 主 design §2.3④ **点名本批**「文件树 + 预览卡」须**就地补录 §4.4 映射**，而本文档只在 §2.3/§8 声明「引用 §4.4」⇒ **漏做** | **已补 §4.5.1**（10 行映射表 · 取值全按件内**真码现值** · 零新 token） |

| F157 | 🔴 | §1.3 | **非目标段与 v0.7 新增面正面冲突**：原文「行级 diff … ⇒ `VersionCompare` + Diff 组件群**留 `components/market/detail/` 不动**」（v0.6 及以前口径） | 改写为「**行内评论 / 行级批注**」（真正的非目标）+ 明示 diff 面已纳入含项 5/8 + **口径更正留痕**；含项 2/6/8 同步（三段竖排 / 服务端 3 处 / diff 现代化）；本批性质行改「**3 处服务端改动**」 |
| F158 | 🔴 | §4.2 ↔ §4.10 | 段序编号冲突：§4.2 主列写「**两段**竖排」（manifest 卡 + 文件清单），§4.10 却称「左栏**第 2 段**变更对比卡」 | §4.2 改 **三段竖排（序即编号）**+ 状态覆盖表补「不可预览 ⇒ 变更对比卡不渲染」；§4.10 / §8 :829 措辞对齐 |
| F159 | 🟡 | §9.4 · §2.1 Q12 | 出口件 ④ 与 Q12 仍写「**G1–G9**」，G10 已加 | 现行 2 处改 **G1–G10**（§11.1 首稿快照 + §12 v0.1 修订行**按纪律不改**，保快照真实） |
| F160 | 🟡 | §3.2 | **退役连锁漏项**：`ui/Badge.tsx:12` 注释引退役件 + 声称「**3 个调用点**零改动」（换靶角度③ 注释腐化命中） | §3.2 退役件表下加「**退役连锁（1 处）**」：实现期同步改注释（删两退役名 + 改「唯一调用点」），不留兼容分支 |
| F161 | 🟡 | §9.7b | 历史批 design 引用退役件**未登记指针同步**（M4a `:192-193` · M4b-1 `:75/:84/:200`） | §9.7b 扩为「**跨批契约变更**（R2 + F156）」+ 新增第 4 项：历史批 design **只加指针**；`docs/plans/*` 不回改亦不加指针 |
| F162 | 🟡 | §4.7 | 组件树**未纳入** §3.1 #7 新建件 `ui/DiffWorkspace.tsx`，也无变更对比卡落位 | 树补 `DiffWorkspace.tsx`（标双处挂载）；复用清单补第三方件；新增「**无独立件的两处**」说明（卡 = 薄装配内联） |
| F163 | 🟡 | §11.7 | **算术自错**：写「78.9 ÷ 8 ≈ 9.86 · 按维取整后 9.88」，8 维之和实为 **79.0** ÷ 8 = **9.875** | 同批更正 + 记为**评分方自造的数字缺陷**；并在该节加 **撤回指针**（→ §11.8） |
| F164 | ⚪ | §1.3 | 含项第 6 条「服务端 **1 处**加性字段」未反映 §5 的 3 处；含项缺 diff 交付项 | 随 F157 同批改（含项重排为 10 条） |
| F165 | 🟡 | §4.9 | 差异声明表 6 行**未含 diff 面**（主 design §12 线框无变更对比卡 = 属新增差异） | 表 **+1 行**（变更对比卡 / 线框无此块 / §4.10 · F156）+ 行数口径 6 → **7** |
| F166 | ⚪ | §4.5.1 | 「本批新增**仅有**两项」断言未涵盖 diff 面控件（split 切换 / 高亮开关 / 折叠钮） | 加 **F156 补充**指针段：控件为本体库内件、语法色属第 3 方主题域 ⇒ **设计 token 口径不变（= 0）** |

| F167 | 🔴 | §1.3 | **本节修复引入的编号重叠**（重排后未去重）：`5.` 出现两次 · 「跨批遗留处置」列为 **#7 与 #9 两项** | 重排为**唯一 1–10**（变更对比 #5 / 三动作 #6 / 服务端 #7 / diff 现代化 #8 / 遗留 #9 / i18n #10） |
| F168 | 🟡 | §2.3 | 「有意不复用」段写「既不需要『版本 tab』**也不需要对比**；详情主列为**两段竖排**」—— 与 §4.10（对比内联第 2 段）**矛盾** + 段数过期（点修 §4.2 时**漏扫本节**） | 改写为「不另立**版本 tab** ⇒ 对比**内联**主列第 2 段」+ 段数订正为**三段**（带 v0.7/v0.8 依据） |
| F169 | 🟡 | §2.1 Q11 | 「**1 键退役**（`assets.admin.reviewGroup`）」—— v0.6 已加 `errors.review.self_review` 退役 ⇒ 键数过期 | 改 **2 键**（逐键注明来源 R2 / 占位块删除） |

| F170 | 🔴 | §4.10 | **设计断言未核真码**：v0.7 起 §4.10 写「base = **`asset.latestVersion`**」，而真码 `ReviewDetailItem`（12 字段）**没有该字段** ⇒ 实现者照写必然落空（**v0.7/v0.8 两轮体检均漏**，本轮 grilling 查事实时命中） | 改口径为「**详情响应的 `latestVersion`**」+ **§5.1b** 定 2 join / 接口 1 字段（G-Q8） |
| F171 | 🟡 | §2.1d P3 | **文档 vs 真源文案漂移**：文档（含文案分层口径 / §12 线框 / `docs/00`）写「**审核队列**」，真源 `admin.reviews` = 「**审核管理**」，且侧栏 `navItems.tsx:111-112` **同键消费** ⇒ 文档在教实现者造一个不存在的文案 | **P3 定案**：文档侧统一「审核管理」（**12 处**，含 §3.3 路由注释 / §4.1 标题 / 面包屑 / §8 / §9.3 G3）+ §9.7 第 10 项跨文档同步；**字典不改** |
| F172 | ⚪ | `i18n/en.ts:306` | `admin.reviews` 的 **zh「审核管理」/ en `Review queue` 语义不同构**（zh 是「管理」、en 是「队列」） | **本批不改字典**（非本批文案面）⇒ 登记归 **M4b-7 完整 converge** 一并定 |
| F173 | ⚪ | §4.1 列 6 | 提交时间列 `new Date(...).toLocaleString()` ⇒ 格式随 locale 变（同年可能省略年份），列内可能不齐（**P5**） | 实现期**统一固定格式**（建议复用既有日期格式化或 `YYYY-MM-DD HH:mm`）；登记入 §9.8 回填项 |

| F175 | 🟡 | §5.1 / §5.1b | **计划的「`null` 兜底用例」不可构造**：`reviewTask.submittedBy` **有 FK**（`governance.ts:45-47`）且用户仅**软删**（`DISABLED`，从不物理删除）⇒ `user` 行恒在 ⇒ `submittedByName \| null` 只是 `leftJoin` 的**防御性类型** | §5.1b 测试面改写为「字段在场 + 值 = `user.name` + join 不放大行数」并注明不可达理由；**类型保留 `\| null`**（防御性，成本为零） |
| F176 | 🟡 | §5.1b | **组成式不准**：写「`asset` on `task.assetId` → `assetVersion` on `asset.latestVersionId`」= **2 个 `leftJoin`**，实测 **`asset` 与 task 那版 `asset_version` 主查询本已 join** ⇒ 只需 **1 个 `asset_version` 自连接**（`alias()`）；且**本仓此前无 `alias()` 先例** | §5.1b 订正为「**1 select + 1 自连接 + 1 接口行 = 3 行**」+ 申报首个 `alias()` 用法与选它的理由（vs 加一次小查询） |

| F180 | 🟡 | §4.10 item 1 | **阈值 960 实测不可用**：门户「版本」tab 主列实宽仅 **755px**（1440 视口）⇒ split 永不出现，与用户「喜欢左右对比」偏好冲突 | 阈值下调 **700** 并写明实测（755 ⇒ split · 600 ⇒ unified + split 钮禁用）；阈值本就在 §9.8 回填清单内 ⇒ 属**实测调参**而非口径变更 |
| F181 | 🔴 | §4.10 视觉段 | **设计未要求「随件交付主题 CSS」** ⇒ 实测：`refractor` 只产带类名 token，无主题样式表时 **token 全部同色 = 高亮形同虚设**（span 555 但色数 **1**） | §4.10 补「**必须交付主题 CSS**」段；本批落 `apps/web/src/styles/diff-tokens.css`（第 3 方主题域 · 字面值）⇒ 实测色数 **1 → 6** |
| F182 | ⚪ | §9.3 G10 ③ | 断言措辞沿用 ① 候选库口径（「关 ⇒ 色数 = 1」），与 ② 实测不符（**关 ⇒ 0 token span**） | G10 ③ 改为「关 ⇒ **token span = 0**」+ 实测值入档（555 / 6） |

| F183 | 🟡 | §4.10 item 1 | **容器观测的挂载时机未写明**：v0.11 只说「`ResizeObserver` 观测卡片宽」，未提示「本件在无差异时**提前 return `null`** ⇒ 一次性 effect 会在 ref 未挂载时跑完，**观察器永不 attach**」 | §4.10 item 1 补「**用 callback ref 挂观测**（节点挂载/替换才触发）」；实现首版已踩此坑并经真浏览器复现修复 |

| F189 | 🟡 | §9.6 造数清单 | **清单缺「可比态」数据** ⇒ G10 ①⑧（契约/真实 patch）无法实证；且未考虑 G6「真点三动作**会改库**」对其它组 fixture 的连锁 | §9.6 追加 **⑦⑧**（可比态 / 同版本重审）+ **⑩–⑬ 动作专用**（隔离）；⑥ 的 B1 语义订正（上传者须为 owner 本人）|
| F190 | 🟡 | §4.4 兜底 / §6.1 | **死键**：`review.preview.failed` **零消费点** —— 共享 `FilePreviewDialog` 已用 `errors.unknown {code}` 渲染错误（带真实码，信息量更大） | §4.4 改「复用共享对话框既有错误面」；**退役该键** ⇒ i18n **405 → 404**（`review` 组 61）；首跑实证 B1 弹层显示「操作失败，`asset.not_found`」|
| F191 | ⚪ | 流程 / §9.3 | 同轮**多次重跑会打满服务端登录限流**（`LOGIN_RATE_LIMIT` 20次/15分钟 · in-memory · `better-auth.ts:64`）⇒ 后续与 `m4b4` 回归同跑时登录 401 | 记入「跑前四步」：分段/重跑留量；清零需重启 api 或等窗口；**本轮 m4b4 回归因此待重跑** |
| **F192** | 🟡 | §9.3 G10⑭（本批脚本） | 新增的门户侧探针**未按容器作用域**取展开钮 + 用一次性 `sleep` ⇒ run7 单条假失败（`portal=null`；产品侧无缺陷） | 修为「作用域（从工具栏上溯到文件行容器）+ **轮询**」；分段复测 **15/15** · 全量 **62/0** |
| **F193** | 🟡 | 既有冒烟（**非本批引入**） | `m4b4` G13「q 搜索写 URL」探针**过时**：搜索框经 HEAD 内 `b30607e`「搜索对齐」改为**折叠式**（默认不在 DOM）⇒ 探针点空、键盘输入无处可去 | 正向实测**产品正常**（展开后输入 ⇒ `?q=m4b4` 且 `page` 按契约清除）· 用户拍板 **A 修探针**（加「先点搜索开关」步）⇒ `m4b4` **88/1 → 89/0** |
| **F194** | ⚪ | §4 门禁口径 | 本批 2 个冒烟脚本未过 `format:check`（285 件口径）+ 迁移 2 文件 `organizeImports` **2 error**（`lint` 门禁抓出） | 已修（`biome` + 导入排序）· 复测 `lint` / `format:check` / `typecheck` 全绿 |
| **F195** | 🟡 | §4.10 视觉段 | **字号未定值**：库不定字号 ⇒ 继承根 16px（比同页正文 13px 大 · 与 GitHub 方向相反）；且未给**对标依据** | §4.10 定值 **12px / 行高 20px** + 对标 GitHub 实测依据 + 有意偏离说明；落 `diff-tokens.css`（两处挂载点一并生效） |
| **F196** | ⚪ | §4.10 视觉段 | split「对侧占位格」**红竖线**：官方文档语义 = 「Gutter with no content」，默认样式却画 2px 红线（上游 3.3.3 最新版仍未处理 · 上游无相关报告） | **用户拍板保留官方设计与做法、不加覆盖**（决策留痕 + 日后两条关闭路径）；判定 = 上游行为、非我方用法错误 |

> **登记项**（跨批 findings 编号在收尾审计时并入）：本批新增登记共 **7 条**（§9.8 第 5 项）。
> **自检当场处置 = 46 项**（= **F129–F142** + **F150–F155** + **F157–F169** + **F170–F173** + **F175–F176** + **F180–F183** + **F189–F191** · 🔴**13** / 🟡**25** / ⚪**8**）；**登记 7 条 = F143–F149**（§9.8 第 5 项）。
> **F157–F169 来源 = §11.8 换靶整体体检**；**F170–F173 = §11.9 grilling 第二轮**（查事实时命中，其中 **F170 为 v0.7 遗留、前两轮均漏**）。
> 重评：grilling 后见 **§11.3** · UI 口径校正后见 **§11.4** · 规则/映射补齐后见 **§11.5** · **R2 契约变更后见 §11.6**。
> **§2.1d 原型轮已落**（F151：16 张截图 · 零 JS 异常）⇒ **P1–P5 待拍板**，闭合后做定稿前终评。

---

### 11.3 grilling 后复评（2026-09-21 · 门禁 = 8 维 ≥9）

**变化来源**：① 消解 **5 处内部矛盾**（F137–F141）+ 1 处**惯例对齐纠错**（F142）② **前沿问题归零**（G-Q1–G-Q7 全闭合 ⇒ 零待拍板项）
③ 键表补齐（`emptyHint`）④ 处置项与登记项**跨批连续编号**落定（F129–F149）⑤ 实证充分性与范围口径定死（fixture ②/③ · 只证 UI）

| 维度 | 旧（首稿） | 新 | Δ | 依据 |
|------|:---------:|:--:|:--:|------|
| 标准 1 完整性 | 9.6 | **9.7** | +0.1 | 键表补齐（+`emptyHint`）· 新增 grilling 记录段（§2.1b）· F 号口径落地 · fixture 规格补 README 造法 |
| 标准 2 准确性 | 9.7 | **9.7** | — | 首稿真码实测面未变；本轮修的是「数字自相矛盾」（计入一致性维度） |
| 标准 3 一致性 | 9.6 | **9.7** | +0.1 | 5 处矛盾消解（行数 / 错误码清单 / 守卫措辞 / 来源标注 / 引用错位） |
| 标准 4 可用性 | 9.5 | **9.6** | +0.1 | 零待拍板项 + 提交粒度与主 design 翻转时机定死（G-Q5 / G-Q6） |
| 深度 1 追溯性 | 10 | **10** | — | 追加 **F129–F149** 连续编号 ⇒ 跨批可回溯 |
| 深度 2 反证 | 9.3 | **9.4** | +0.1 | 补「范围非目标（只证 UI 形态）」+ 回退分支实证充分性论证；**被否决方案仍按你的口径不入档** ⇒ 如实不升满 |
| 深度 3 边界/风险 | 9.6 | **9.7** | +0.1 | 补 fixture README 造法风险 · 跨批改动提交粒度 · 主 design 翻转时机（防「无证据先翻转」） |
| 深度 4 维护性 | 9.5 | **9.6** | +0.1 | 键表可直接落码 · 收尾回填与 F 号挂钩 · 文档同步 9 条齐 |

**现行均分 = 9.68**（9.7+9.7+9.7+9.6+10+9.4+9.7+9.6 = 77.4 ÷ 8）⇒ **达门 ✅**（门禁 ≥9）。

**升分构成说明**：+0.08 全部来自 **矛盾消解 + 前沿归零 + 键表补齐** 等实质修复，非口径放宽；
深度 2 仍因「被否决方案不入档」的口径**有意保持 9.4**（不随本轮升满）。**首稿 9.60 未撤回**（口径未变，
仅在同口径下补齐修复 ⇒ 属正常迭代，与「口径升级须撤回旧分」的情形不同）。

---

### 11.4 UI 口径校正后复评（2026-09-21 · **角轮 = 仓例对齐 + 跨文档真源对账**）

**变化来源**：① 线框口径回到仓例「**引用 + 差异声明**」（F150）② 跨文档对账揪出**主 design 2 处硬错**并订正（F152/F153 · 主 design v1.61）③ §2.1d 原型轮**登记待做**（F151）

| 维度 | 旧 | 新 | Δ | 依据 |
|------|:--:|:--:|:--:|------|
| 标准 1 完整性 | 9.7 | **9.8** | +0.1 | 补 §4.9 差异声明表（仓例要求项）；**仍非满分** —— §2.1d 原型评审未落（F151） |
| 标准 2 准确性 | 9.7 | **9.7** | — | 本文件主张原已对真码；本轮订正的是**主 design** 的偏差（折算进一致性） |
| 标准 3 一致性 | 9.7 | **9.8** | +0.1 | 线框口径与仓例对齐 ⇒ **消除与主 design §12 的双写**；跨文档矛盾（F152/F153）已闭合 |
| 标准 4 可用性 | 9.6 | **9.7** | +0.1 | 差异声明表让实现者一眼知「以谁为准」；6 行差异逐条带依据 |
| 深度 1 追溯性 | 10 | **10** | — | 两条主 design 订正带真码行号 + 文案真源行号 + 主 design 版本号 |
| 深度 2 反证 | 9.4 | **9.5** | +0.1 | 「以批 design 为准」+ 逐行依据 = 差异可反证；已否决线框画法按口径不入档 |
| 深度 3 边界/风险 | 9.7 | **9.7** | — | 无新增边界（原型轮未做 ⇒ 不升） |
| 深度 4 维护性 | 9.6 | **9.7** | +0.1 | 引用不复制落地 ⇒ 后续改线框只改一处；主 design 措辞与真码一致 ⇒ 不再误导读者 |

**现行均分 = 9.74**（9.8+9.7+9.8+9.7+10+9.5+9.7+9.7 = 77.9 ÷ 8）⇒ **达门 ✅**。

**未满理由（如实）**：**§2.1d 可点原型评审尚未落地**（F151）⇒ 完整性/边界两维不给满分；
原型轮收口后再评一次（届时另起节，不覆盖本节）。

---

### 11.5 规则/映射补齐后复评（2026-09-21 · **角轮 = 规则层对账 + 视觉映射落地**）

**变化来源**：① 主 design :180 规则与三批实践**对齐**（F154 · 主 design **v1.62**）② 本批被点名的「就地补录 §4.4 映射」**已落**（F155 · §4.5.1）

| 维度 | 旧 | 新 | Δ | 依据 |
|------|:--:|:--:|:--:|------|
| 标准 1 完整性 | 9.8 | **9.8** | — | §4.5.1 补入（完整性本就 9.8）；**§2.1d 原型轮仍未落**（F151）⇒ 不给满分 |
| 标准 2 准确性 | 9.7 | **9.8** | +0.1 | §4.5.1 取值**逐行按件内真码现值**（含「`--sha-bg` 无映射 ⇒ 已落 `bg-muted`」的既有登记）+ 弹层真值（`720px`/`76vh`/载态为 `Spinner` 非 `Skeleton`） |
| 标准 3 一致性 | 9.8 | **9.8** | — | 规则层已对齐；本轮无新跨文档矛盾 |
| 标准 4 可用性 | 9.7 | **9.7** | — | §4.5.1 让实现者可直接照抄取值 |
| 深度 1 追溯性 | 10 | **10** | — | 映射表每行带件内真码类名 |
| 深度 2 反证 | 9.5 | **9.5** | — | — |
| 深度 3 边界/风险 | 9.7 | **9.8** | +0.1 | 「本批新增**仅有**两项（说明行 / 内联提示）」显式划界 ⇒ 防实现期自由发挥 |
| 深度 4 维护性 | 9.7 | **9.8** | +0.1 | 视觉决策**就地留档** ⇒ M4b-7 converge 有据可依；规则层不再自相矛盾 |

**现行均分 = 9.79**（9.8+9.8+9.8+9.7+10+9.5+9.8+9.8 = 78.2 ÷ 8）⇒ **达门 ✅**。

**未满理由（如实）**：**§2.1d 可点原型评审仍未落地**（F151）⇒ 完整性保持 9.8。

---

### 11.6 R2 契约变更后复评（2026-09-21 · **角轮 = 跨批契约变更的落点与偏离登记**）

**变化来源**：① 拍板「管理也能审自己」⇒ **R2 彻底移除防自审**（§4.6.1）② 服务端改动面扩为 **2 处**（§5）·
③ i18n errors **6 → 5** + 新键 `review.adminOnly`（§6.1）④ **偏离代价与复归路径写明** ⑤ 规范同步单列 **§9.7b**

| 维度 | 旧（§11.5） | 新 | Δ | 依据 |
|------|:-----------:|:--:|:--:|------|
| 标准 1 完整性 | 9.8 | **9.8** | — | 改动面定死到**文件 + 行号**（5 码文件 / 2 测试 / 规范 3 处）；实现零留白 |
| 标准 2 准确性 | 9.8 | **9.8** | — | 全走真码（`rbac.ts` / `reviews.ts` / `errors.ts` / 测试行号）；无推断 |
| 标准 3 一致性 | 9.8 | **9.8** | — | 新口径在 §1.2 / §2.1 / §2.1d / §3.1 / §4.6 / §4.9 / §5 / §6 / §9 **九处同步改齐**（零残留） |
| 标准 4 可用性 | 9.7 | **9.8** | +0.1 | 实现者拿到「删哪行 / 改哪测 / 退役哪个键」的**机器可执行清单** |
| 深度 1 追溯性 | 10 | **10** | — | 变更动因（用户原话）+ 上游运营前提原文 + 复归点全留痕 |
| 深度 2 反证 | 9.5 | **9.6** | +0.1 | **写明有意偏离四眼原则的代价与恢复路径**（不为拍板粉饰） |
| 深度 3 边界/风险 | 9.7 | **9.7** | — | 风险 = 合规语义损失（已登记）；收益 = 单管理档单点消除 |
| 深度 4 维护性 | 9.7 | **9.7** | — | 恢复点唯一 + 规范同步项单列 |

**现行均分 = 9.78**（9.8+9.8+9.8+9.8+10+9.6+9.7+9.7 = 78.2 ÷ 8）⇒ **达门 ✅**
**未满理由（如实）**：P1–P6 的**终评**仍待你收口；本批**尚未实现**（零产品码改动）。

### 11.7 diff 现代化落库后复评（2026-09-22 · **角轮 = 官方件选型的证据链与破坏性契约**）

**变化来源**：① 自研 diff 链路**整体退役**（服务端 LCS DP + 前端自绘 2 件）⇒ 换官方件（§2.1d / §5.5）② **破坏性契约**
`hunks[]` → `patch` 且**消费者全量普查 7 处** ③ §4.10 变更对比规格（双处挂载 · split 默认 · 高亮两态 · 懒渲染 · a11y）
④ **同口径体积核算**（②≈56KB / ③ 175.7KB / ① 322.4KB）⑤ **三条硬约束 + 三项风险缓解** ⑥ **修正 v0.6「提示与空态」正文计 9 表列 8 的漏列**（`adminOnly`）

| 维度 | 旧（§11.6） | 新 | Δ | 依据 |
|------|:-----------:|:--:|:--:|------|
| 标准 1 完整性 | 9.8 | **9.9** | +0.1 | 新增 3 段（§2.1d PoC 结论 / §4.10 规格 / §5.5 契约）+ 件表/依赖/回填项/出口件齐 ⇒ 实现者零留白 |
| 标准 2 准确性 | 9.8 | **9.9** | +0.1 | 体积**同口径实测**（bundlephobia 4 包）· 语言覆盖**按包内文件实测**（277 种）· React 版本实测 · 真码锚点带 `file:line`（含消费者 7 处行号） |
| 标准 3 一致性 | 9.8 | **9.8** | — | 键数链 **405** 全文同步（零残留）；**修正 v0.6 adminOnly 漏列**（正文 9 vs 表 8）⇒ 消一处内部矛盾；但本轮新增面广，不升满分 |
| 标准 4 可用性 | 9.8 | **9.9** | +0.1 | 依赖**精确锁版** + 21 语言清单 + 缓存键/TTL/LRU + a11y 4 项 + 边界 5 条全定死 |
| 深度 1 追溯性 | 10 | **10** | — | 选型每个数字带**实测命令口径**；① 落选撤回的**根因**（PoC 隔离粒度）留痕；撤销决策可回溯 |
| 深度 2 反证 | 9.6 | **9.7** | +0.1 | ① 的**反向证据**（观感 = 目视观察，非硬证据）+ ② 的三项风险（peer 警告 / 无 Worker / token 高亮上游曾丢）如实入档；**仍不升满** —— 被否决方案按口径不入档 |
| 深度 3 边界/风险 | 9.7 | **9.9** | +0.2 | 破坏性契约的**前置条件**（零外部消费者）+ 消费者清单 + **缓存安全硬约束**（授权不可缓存）+ **4 项不放宽清单** + 阈值/体积**实测回填项** |
| 深度 4 维护性 | 9.7 | **9.9** | +0.2 | 退役件明列 `git rm`（不留兼容分支）· 单点件 `DiffWorkspace`（两处挂载零分叉）· 新增语言须补注册（漏注册不报错的**静默失败**已预警） |

**现行均分 = 9.875 ≈ 9.88**（9.9+9.9+9.8+9.9+10+9.7+9.9+9.9 = **79.0** ÷ 8 = **9.875**）
⇒ 达门 ✅（门禁 ≥9）。

> ⚠️ **本节分数已撤回**（2026-09-22 · 换靶整体体检）—— 该分是**自检口径过窄**的产物：只审 v0.7 新增面，
> **未做全文连锁扫描**，漏掉 2 条 🔴（§1.3 非目标与新增面正面冲突等 10 项，**N1–N10**）。
> **现行分见 §11.8 = 9.40**（撤回 0.48）。本段保留为「错误口径留痕」，勿作现状引用。

**算术更正留痕（N7）**：原文写「78.9 ÷ 8 ≈ 9.86 · 按维取整后 9.88」—— **求和与除法均错**
（8 维之和实为 **79.0**，÷8 = **9.875**）。属**评分方自造的数字缺陷**，同批更正。

**未满理由（如实）**：**P1–P6 终评待你收口**；本批**尚未实现**（本轮仍为零产品码改动的设计层）；
深度 2 保持 9.7 = 「被否决方案不进文档」口径下的**有意**不升满（与 §11.3–§11.6 同口径）。

---

### 11.8 换靶整体体检后复评（2026-09-22 · **角轮 = 全文连锁一致性 + 退役影响面 + 分数算术**）

**性质**：本轮**不是新增能力的复评**，而是对 **§11.7 的口径纠错** —— **撤回 §11.7 的 9.88**
（该分只审 v0.7 新增面，**未做全文连锁扫描** ⇒ 漏掉 2 条 🔴）。

**检查靶（4 条 · 全部实跑）**：① `file:line` **引用语义回读**（打印真码区间比对，**12/12 ✅**）
② **退役影响面全仓普查**（含**注释腐化**类 —— 本轮主命中：`ui/Badge.tsx:12`）
③ **新面 → 既有段连锁**（§1.3 非目标 / §4.2 版式 / §4.7 组件树 / §4.9 差异声明 / §9.4 出口件）
④ **分数算术自查**（AI 自写数字必实测 —— 命中 F163）

**发现（13 项 · F157–F169 · 3 🔴 / 8 🟡 / 2 ⚪）**：见 §11.2 表；最高严重度 = **§1.3 非目标与 v0.7
新增面正面冲突**（本批「防范围漂移」宪法段失效 ⇒ 实现者会照旧版把 diff 组件群「留不动」）。
**修复过程中自查又捕获 3 项**（F167 编号重叠〔本轮修复自身引入〕· F168 §2.3 漏扫 · F169 §2.1 Q11 键数）
—— 即「**点修必须扫类**」在本轮再次被验证：改 §4.2 段数时漏扫 §2.3 的同源描述。

| 维度 | §11.7（**已撤回**） | 本轮（修复前实测） | 本轮（修复后） | Δ vs 撤回前 |
|------|:---:|:---:|:---:|:--:|
| 标准 1 完整性 | 9.9 | 9.5 | **9.8** | −0.1 |
| 标准 2 准确性 | 9.9 | 9.6 | **9.8** | −0.1 |
| 标准 3 一致性 | 9.8 | **8.5** | **9.7** | −0.1 |
| 标准 4 可用性 | 9.9 | 9.5 | **9.8** | −0.1 |
| 深度 1 追溯性 | 10 | 9.5 | **10** | — |
| 深度 2 反证 | 9.7 | 9.5 | **9.7** | — |
| 深度 3 边界/风险 | 9.9 | 9.6 | **9.8** | −0.1 |
| 深度 4 维护性 | 9.9 | 9.5 | **9.7** | −0.2 |
| **综合** | ~~9.88~~ | **9.40** | **9.79** | **−0.09** |

**修复后均分 = 9.79**（9.8+9.8+9.7+9.8+10+9.7+9.8+9.7 = **78.3** ÷ 8 = **9.7875**）⇒ 达门 ✅（8 维全部 ≥9）。
（**算术自查**：78.3 ÷ 8 = 9.7875 ≈ 9.79 —— 本节数字同批复核，勿再出现 F163 式错误。）

**撤回与升分构成（如实）**：
- **撤回 9.88 → 9.79（净 −0.09）**：撤的是「口径过窄」带来的虚高，修的是 **13 项（含 3 🔴）**；
  标准 3 定 **9.7**（冲突消解 + 段序编号定死 + §2.3/§2.1 连带订正 + G1–G10 同步），**不是**回到 9.8/9.9
  —— 本轮共暴露 **3 条一致性类 🔴**（F157/F158/F167），说明本文档「新增面 → 既有段」的连锁面仍有系统性风险；
  深度 4 定 **9.7** —— **修复自身引入 F167** 证明编辑涟漪控制仍需加强。
- **未满理由**：**P1–P6 终评仍待你收口**；本批**尚未实现**（零产品码改动）；深度 2 保持 9.7 =
  「被否决方案不进文档」口径下的**有意**不升满（与 §11.3–§11.7 同口径）。
- **机制留痕（两条 · 本轮实证）**：① 「**新增面自检 ≠ 全文自检**」—— 凡新增章节（§4.10 / §5.5），必须回扫
  **§1.3 批界 / §2.1 拍板表 / §2.3 不复用清单 / §4.2 版式 / §4.7 组件树 / §4.9 差异声明 / §9.4 出口件** **七处**连锁点
  （本轮 §2.1 / §2.3 即因清单只有五处而漏扫）② 「**点修必扫类**」—— 改一个量的表述（如「两段 → 三段」）后，
  必须 **grep 该表述的全仓出现点**，逐条判定改/不改（本轮 §2.3 漏扫 + §1.3 重排引入重复项，均为反例）。

---

### 11.9 grilling 第二轮后复评（2026-09-22 · **角轮 = 前沿查事实 + 决策落库 + 遗留断言溯源**）

**性质**：本轮的升分来源**不是**「新增能力」，而是 **① 前沿 7 项决策落库**（G-Q8–G-Q14）**② 查事实时命中 4 项遗留**（F170–F173）
**③ 两处「不可执行约束」被换成可执行规范**（patch 格式表 · 容器宽回退）。

**变化来源**：① **G-Q8** 补 §5.1b（`latestVersion` · 仅详情 · 2 join）⇒ 服务端账 **3 → 4 处** ② **G-Q9** 两态表（首版 / 同版本重审）
③ **G-Q10** 回退判定改**容器宽**（消掉自造的 960 视口断点 ⇒ 与实跑
**真值吻合** ④ **G-Q11** patch **3 行头**规范表 + **不产 `index`** 理由 ⑤ **G-Q12** 缓存测试钩子 + 「不断言命中率」纪律
⑥ **G-Q13** 授权夹缝内联降级（与 §4.4 B1 同口径）⑦ **G-Q14（P1–P6）** 全落：P3 文案 12 处统一（F171）· P4 `FileTree` +1 加性 prop · P6 运营注记改写

| 维度 | §11.8 | 本轮 | Δ | 依据 |
|------|:-----:|:----:|:--:|------|
| 标准 1 完整性 | 9.8 | **9.8** | — | 前沿 7 项全落（§2.1e）+ 断言补至 **9 条**（G10）；**不给 9.9** —— 本轮又挖出 1 处 v0.7 遗留的**断言未核真码**（F170）⇒ 完备性仍有暴露面 |
| 标准 2 准确性 | 9.8 | **9.9** | +0.1 | 全走实测：真码 12 字段清单 · `asset.latestVersionId` 列 · `canDownloadPreview` 4 类授权集 · 断点普查（1100/760/900/1200）· `admin.reviews` 双语文案 |
| 标准 3 一致性 | 9.7 | **9.8** | +0.1 | P3 文案 **12 处**统一 + 账目 4 处（§1.3 / §5 标题 / §5.2 / §7.1）+ 面包屑/dogfood 同步；**不给 9.9** —— §4.10 曾声称响应里不存在的字段（F170） |
| 标准 4 可用性 | 9.8 | **9.9** | +0.1 | patch 格式**逐行表** + 缓存钩子 + 两态 + 回退阈值（组件内常数）+ 授权夹缝 —— 实现者零二次决策 |
| 深度 1 追溯性 | 10 | **10** | — | 每条结论带 `file:line` 或实测命令口径；F170 明确标注「v0.7 引入 / 前两轮漏」 |
| 深度 2 反证 | 9.7 | **9.8** | +0.1 | 「不产 `index`」的理由（只有 sha256）· 「不扩授权集」的取舍 · 「容器宽 ≠ 视口宽」的反例均入档 |
| 深度 3 边界/风险 | 9.8 | **9.9** | +0.1 | 两态（首版 / 同版本重审）+ 提交人授权夹缝 + 两个实测阈值（200ms / 960 容器 px）+ 缓存隔离 |
| 深度 4 维护性 | 9.7 | **9.8** | +0.1 | 阈值降为**组件内常数**（不再污染全局断点体系）· 缓存带复位钩子 · G10 断言可脚本化 |
| **综合** | **9.79** | **9.86** | **+0.07** | 78.9 ÷ 8 = **9.8625** |

⇒ 达门 ✅（8 维全部 ≥9）。

**未满理由（如实 · 三项有意不升满）**：标准 1 / 标准 3 定 **9.8·9.8**（F170 属 v0.7 遗留、本轮才挖出 ⇒ 诚实反映完备性暴露面）；
深度 2 / 深度 4 定 **9.8**（「被否决方案不进文档」口径未变 · 实现期仍有 3 项阈值/体积待实测回填）。
**状态未变**：**P1–P6 已收口，但本批仍未实现、批 plan 未立、主 design 定稿口令未下**。

---

## 12. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| **v0.14** | 2026-09-22 | sunxuewen-rush | **diff 观感追加（字号/行高定值 · 对标 GitHub 实测）** —— ① **F195** 🟡 §4.10 定值 **字号 12px · 行高 20px**（字号 = GitHub diff 实测 12px；行高 20px 为**有意偏离**，GitHub 用 24px/2.0）② **F196** ⚪ split 占位格红竖线 = **上游默认渲染**（官方 README 语义 vs 默认样式自相矛盾 · 已用最新版 3.3.3 · 上游无报告）⇒ **拍板保留官方设计与做法、不加覆盖** ③ §9.8 更新（`diff-tokens.css` **85 → 117** 行 + 字号/行高行）④ **F192–F196 入 §11 处置表**（单一事实源）· §9.8 补登段收敛为指针 ⑤ 处置累计 **51 项** |
| **v0.13** | 2026-09-22 | sunxuewen-rush | **验收收口回填（T11 实测）** —— ① 八步门禁 **8/8 exit 0**（`test` **562/0** · `doc-audit` **70/0**）② 本批 dogfood **62 PASS / 0 FAIL / 0 超时**（全量 · 含 `G10⑭`）· 分段 **15/15** ③ §9.8 层实测回填 **11 项**（i18n 404 · 件表 `wc -l` · gzip 54.6KB / 偏差 2.5% · 21 语言 · 阈值 700 · 高亮 555/6 ↔ 0 · patch 3 行头）+ **未实测 2 项如实登记** ④ **F192/F193/F194** 补登（含「非本批引入」归属与用户拍板记录）⑤ 处置累计 **49 项** |
| **v0.12** | 2026-09-22 | sunxuewen-rush | **实现期订正（T10 · dogfood 实证）** —— ① **F190** 死键 `review.preview.failed` 退役 ⇒ **404** ② **F189** §9.6 造数补 ⑦⑧ + ⑩–⑬（隔离）+ ⑥ B1 语义订正 ③ **F191** 登录限流打满 ⇒ `m4b4` 回归待重跑 ④ G10 全链实证（含门户侧同件）|
| **v0.11** | 2026-09-22 | sunxuewen-rush | **实现期订正（T5/T6 · headless Edge 真浏览器实测）** —— ① **F181** 🔴：§4.10 补「**必须随件交付主题 CSS**」段（`refractor` 只产带类名 token ⇒ 无主题表 = 高亮形同虚设；本批落 `apps/web/src/styles/diff-tokens.css` · 色数实测 **1 → 6**）② **F180** 🟡：回退阈值 **960 → 700**（门户「版本」tab 主列实测 **755px** ⇒ 960 让 split 永不出现，与用户偏好冲突；700 下 755 ⇒ split · 600 ⇒ unified）③ **F182** ⚪：G10 ③ 口径订正「关 ⇒ **0 token span**」+ 实测值（555 / 6）入档 ④ 处置累计 **43 项**（🔴13 / 🟡22 / ⚪8） |
| **v0.10** | 2026-09-22 | sunxuewen-rush | **实现期订正（T1/T2 落地）** —— ① **F175**（§5.1/§5.1b：「`null` 兜底用例」不可构造 —— FK + 软删 ⇒ 行恒在；测试面改写并注明不可达）② **F176**（§5.1b：组成式「2 `leftJoin`」⇒ **1 个 `asset_version` 自连接** + 申报**本仓首个 `alias()` 用法**）③ Status 行更新（**定稿待口令** + 实现期 T1/T2 已落）④ 处置累计 **39 项**（🔴12 / 🟡19 / ⚪8） |
| **v0.9** | 2026-09-22 | sunxuewen-rush | **grilling 第二轮（G-Q8–G-Q14）+ P1–P6 收口（用户「全按推荐」）** —— ① 新增 **§2.1e**（前沿 7 项 · 事实全由本方自查）② **G-Q8**：审核面 diff 的 base 字段真码**不存在** ⇒ 新增 **§5.1b**（`latestVersion` · **仅详情查询** 2 join，`LIST_SELECT` 不动）+ §5.2/§7.1 同步 ⇒ 服务端账 **3 → 4 处** ③ **G-Q9** 「无对比对象」两态（首版 ⇒ 整卡不渲染；同版本重审 ⇒ 空态）④ **G-Q10** 回退判定改**容器宽**（消掉自造 960 视口断点 ⇒ 守 §4.8）⑤ **G-Q11** patch **3 行头**规范表（**不产 `index`**；ADDED/DELETED ⇒ `/dev/null`）⑥ **G-Q12** 缓存 `__resetCompareCache()` + 「不断言命中率」⑦ **G-Q13** 提交人授权夹缝 ⇒ 内联降级（同 §4.4 B1 口径）⑧ **P1/P3/P4/P5/P6 落地**：页头 desc 纯文本 · 「审核队列」→「**审核管理**」**12 处**统一 · `FileTree` **+1 加性可选 prop** · 时间格式登记 · 互审注记随 R2 改写 ⑨ §9.3 G10 断言扩至 **9 条** ⑩ 登记 **F170–F173**（含 **F170 为 v0.7 遗留、前两轮漏**）⇒ 处置累计 **37 项** ⑪ **§11.9 复评 9.86**（9.79 → +0.07）⑫ **零实现改动** |
| **v0.8** | 2026-09-22 | sunxuewen-rush | **换靶整体体检 + 13 项连锁修复（F157–F169 · 用户「再次整体检查并打分」）** —— ① **撤回 §11.7 的 9.88**（自检口径过窄：只审新增面、未做全文连锁扫描）⇒ 修复前实测 **9.40**、修复后 **9.79** ② **2 🔴**：`F157` §1.3 **非目标与新增面正面冲突**（「Diff 组件群留 `market/detail/` 不动」已被 v0.7 作废）⇒ 改写为「行内评论」+ 含项/本批性质同步；`F158` §4.2 **段序编号冲突**（两段 vs「第 2 段」）⇒ **三段竖排（序即编号）** ③ **6 🟡**：`F159` G1–G10（现行 2 处 · 首稿快照不改）· `F160` **退役连锁** `ui/Badge.tsx:12` 注释腐化 · `F161` 历史批 design 指针（§9.7b 扩为 R2+F156）· `F162` §4.7 组件树补 `DiffWorkspace` · `F163` §11.7 **算术自错**（78.9 → **79.0** ÷ 8 = 9.875）· `F165` §4.9 差异声明 +diff 行 ④ **2 ⚪**：`F164` §1.3 含项 · `F166` §4.5.1 F156 指针 ⑤ **修复中自查再捕获 3 项**：`F167` 🔴 §1.3 编号重叠（**本轮修复自身引入**）· `F168` 🟡 §2.3 「不需要对比/两段竖排」漏扫 · `F169` 🟡 §2.1 Q11 键数 1→**2** ⑥ 处置累计 **20 → 33 项**（🔴11/🟡16/⚪6）⑦ 新增 **§11.8** 复评段（撤回说明 + **两条机制留痕**：新增面自检 ≠ 全文自检〔连锁点 **7 处**清单〕· 点修必扫类）⑧ **零实现改动** |
| **v0.7** | 2026-09-22 | sunxuewen-rush | **diff 能力现代化 —— 选型定案 + 规格落库（F156 · 用户「能用官方就用官方」+「PoC 前置到 design 定稿前」）** —— ① **自研链路整体退役**：服务端 `assets/version-compare.ts` 自研 LCS DP ⇒ **`diff`(jsdiff) 9.0.0**；前端自绘 `DiffView.tsx`(139) + `DiffNav.tsx`(52) ⇒ **`react-diff-view@3.3.3` + `refractor@3.6.0`（按需 21 语言）** ② **契约破坏性替换** `CompareFile.hunks[]` → **`patch: string`**（**不双写** · 消费者 **7 处**全量普查 · `packages/` 零外部消费者实测）③ §2.1d 新增 **PoC 结论段**（三候选 @ 两条硬要求矩阵 · **同口径体积核算 ②≈56KB < ③ 175.7KB < ① 322.4KB** · 三条硬约束 · 三项风险缓解 · **① 落选结论撤回的根因留痕**） ④ §4.10 新增**变更对比规格**（**默认左右对比** + <960px 回退 + 切换钮 + 高亮两态 + 折叠懒渲染 + a11y 4 项 + 边界 5 条）⑤ §5 改动面 **2 处 → 3 处**（§5.5 含 diff 结果缓存 + **授权不可缓存**硬约束）⑥ i18n `review` 再 **+9** ⇒ 净增 **57** · `review` 组 **62** · 全仓 **405**（**并修正 v0.6 「提示与空态」正文 9 / 表 8 的 `adminOnly` 漏列**）⑦ §9 加 **G10 diff 组**（含 **React 19 token 高亮回归断言**）+ 4 项实测回填 ⑧ §11.7 **复评 9.88** ⑨ **零实现改动**（PoC 物料不进仓 · 落选包待卸载） |
| **v0.6** | 2026-09-21 | sunxuewen-rush | **R2 · 跨批契约变更（用户拍板「管理也能审自己」）** —— ① **彻底移除防自审**（§4.6.1）：删 `isSelfReview`（`rbac.ts:69-77`）+ 删 `isSuperAdmin` 传参（`reviews.ts:117,140`）+ 删错误码 `review.self_review`（`errors.ts`）+ 2 处测试同步 ② **Q9 防自审交互作废重写** ⇒ 权限矩阵（管理档可自审三动作照常；非管理档提交人仅撤回 + 新键 `review.adminOnly` 说明行）③ 服务端改动面 **1 处 → 2 处**（§5.4 新增）④ i18n：errors **6 → 5** · `review` 净增 **47 → 48** · `review` 组 5 → **53** · 全仓仍 **396**（= 350 + 48 − 2）⑤ **偏离四眼原则的代价与复归路径写明** ⑥ 规范同步项单列 **§9.7b**（05 原地改 · 主 design 原地改 · M3 批 design 只加指针）⑦ §11.6 复评 **9.78** ⑧ 代码改动**随本批实现期落地**（本次仅设计层） |
| **v0.5** | 2026-09-21 | sunxuewen-rush | **原型评审轮落地（F151 · 用户「现在做可点原型」）** —— ① 物料（**不进仓**）：`apps/web/src/pages/__proto/` 4 文件（fixtures / controls / 队列 / 详情）+ `main.tsx` 2 条 DEV 路由；入口 `/__proto/m4b5` 与 `/__proto/m4b5/detail?id=`（**AppShell 内 · 无守卫**）② 口径照 M4b-3/M4b-4 §2.1d：**真仓真件 + 假数据 + 状态开关**；假数据 = §9.6 fixture 等值 6+1 条；文案 = §6.1 候选文案 zh/en 对照 ③ **实测：16 张截图 · 零 JS 异常**，逐态证据入 **§2.1d**（7 列 / 列开关 7 项保护 2 / 三态 / 分型卡三族 / 面包屑分叉 / **防自审双侧**（管理档仅撤回 vs 超管三动作）/ 驳回弹窗确认钮 disabled / REJECTED 降级）④ **新增待拍板 P1–P5**（页头 desc 放图标 / ConfirmDialog 三态 / 标题真源「审核管理」漂移 / FileTree 行恒可点 / 时间格式统一）⑤ 门禁本地部分：typecheck 4/4 · biome 干净 ⑥ **零产品码改动** |
| **v0.4** | 2026-09-21 | sunxuewen-rush | **规则层对齐 + 视觉映射补录（W1/W2 · 用户「按推荐」）** —— ① **F154**：主 design :180 迁移规则补「**线框除外**」⇒ 与三批实践对齐（主 design **v1.62**）② **F155**：补 **§4.5.1「新组件/新交互 → §4.4 token 映射」10 行表**（取值逐行按件内真码现值 · 零新 token · 本批新增仅「说明行 / 内联提示」两项）③ §11.5 **复评 9.79**（§11.4 9.74 → +0.05）④ 处置累计 **20 项**（F129–F142 + F150–F155）⑤ **零实现改动** |
| **v0.3** | 2026-09-21 | sunxuewen-rush | **UI 口径校正（U1/U3 · 用户「按推荐」）** —— ① **线框口径回到仓例**（F150）：删自画两张 ASCII ⇒ 立 **§4.9「线框 ↔ 批 design 差异声明」6 行表**（主 design §12 / 批 design 定案 / 依据，以批 design 为准）· 演进归 **M4b-7 converge** ② **跨文档对账揪出主 design 2 处硬错并订正**（F152/F153 · 主 design **v1.61**）：族主文档口径与真码不符（`mainDocPath` 只有两档）· §12 详情线框缺撤回钮 + 「拒绝 → 驳回」措辞漂移 ③ **§2.1d 可点原型评审登记待做**（F151 · 物料不进仓）④ §11.4 **复评 9.74**（§11.3 9.68 → +0.06）⑤ 处置累计 **18 项**（F129–F142 + F150–F153）⑥ **零实现改动** |
| **v0.2** | 2026-09-21 | sunxuewen-rush | **grilling 复核轮**（门禁「8 维 ≥9 → grilling → 重评 ≥9」中段）：① **7 条前沿问题全闭合**（G-Q1–G-Q7 · §2.1b）② **当场处置 5 处客观矛盾**（F137–F141）③ 键表补 `emptyHint` ⇒ `review` 净增 **46 → 47** · 全仓 **395 → 396** ④ 处置项与登记项**跨批连续编号 F129–F149** ⑤ §11.3 **grilling 后复评 9.68**（首稿 9.60 · +0.08，构成见该节）⑥ **零实现改动** |
| **v0.1** | 2026-09-21 | sunxuewen-rush | **首稿**：对齐收口（Q1–Q12 逐条「按推荐」全闭合）落地为 12 段骨架文档 —— ① §1.2 入口现状**真码实测**（路由 / 端点 / 字段 / 缺口 G1–G4 / 迁移件依赖面）② §2.1 拍板表 12 行 ③ §3 件与路由（**新建 5 / 改造 8 + 3 文档**；零新增路由）④ §4 页面规格（队列 **7 列** / 两栏详情 / **分型 manifest 卡** / 预览可用性判定表 / 三动作渲染矩阵 / 防自审）⑤ §5 服务端 **1 处加性字段**（`submittedByName` · 零迁移）⑥ §6 i18n **+46 键**（组成式）+ 1 键退役 + 2 孤儿键转正 ⑦ §7 接口变更 + token scope 交叉表 ⑧ §8 UI-UX 变动 5 行 ⑨ §9 验证口径（零回归 / 门禁 / G1–G9 / **定稿条件 ② 证据** / 造数 6 条 fixture / 文档同步 9 条 / 收尾回填 5 项）⑩ §10 引用文件清单（server 路由读 / 读面改 / 相邻真源三分）⑪ **§11 8 维自检 9.60** + **当场处置 8 项**（🔴3 / 🟡2 / ⚪3 —— 含 `doc-audit` B 段死路径 FAIL 修正 ⇒ 复跑 **68 PASS / 0 FAIL**）⑫ **零实现改动**（本版仅设计层） |
