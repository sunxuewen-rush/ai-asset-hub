# M4c-3 外部身份源接入：社交 provider + 官方内置 Entra ID + 账号链接统一 + 登录页入口 —— 批计划

> Date: 2026-10-12
> Updated: 2026-10-12（**v1.2：T9 落地 —— 管理面连带（审计分组标签 + 占位邮箱列）+ F313 顺手补 + F314 订正归 T11** —— ① **4 件**：`AdminAudit.tsx`（`'oidc'` ⇒ `'external'` + 补 `'user'` 分支 + 头注释组数订正）· `i18n/{zh,en}.ts`（改名 `audit.group.external` + 新增 `audit.group.user`）· `AdminUsers.tsx`（+2 注释 · 零逻辑改动）② **真页双语实测**：`/api/audit/actions` **9 组含 `external` / 无 `oidc`** · 动作下拉 **34 项** · 组标签「… LDAP / **外部身份源** / **用户**」（EN：**External** / **Users**）· 双语「OIDC」**0 命中** ③ **断言① 真库实测**（用户授权的 **1 行临时造数 · 用完即删**）：占位账号 ⇒ 出参 `email: null` · 响应**不泄露**占位串 · 真页「邮箱」列显 **「—」** ④ **F313**（`user` 组无标签 ⇒ 顺手补 · 键账 **699 → 700** · 真页复测裸 `user` 消失）⑤ **F314**（M4b-6 design 组清单/键名陈旧 ⇒ **订正归 T11**，落点已补）⑥ 门禁 **275/141/3/50/37/2** · 三绿 exit=0 · `build` exit=0 · 18 维 **9.55**（§7.1））
> Updated: 2026-10-12（**v1.1：T8 落地（登出链实测复核）—— F298 关账 + F312 反证（Q3 甲 不采纳调序）** —— ① **F312（本轮关键）**：§3 T8 步骤 1 原写「调序 ⇒ 落点确定」；**探针正反双证**（真页 · 用户菜单真点击 · 各 5 次）实测**相反** —— **原序**（`invalidateCache()` → `await refresh()` → `navigate('/')`）末跳 **`/` 5/5**；**调序后**末跳 **`/login?next=%2Fdashboard%2Fassets` 5/5**。根因 = `refresh()` 的 `/me` 必 401 ⇒ **401 分流**（`AuthProvider.tsx:116-119`）⇒ `navigate('/login?next=…')`：原序中被 `await` 挡在 `navigate('/')` **之前** ⇒ `/` 胜出；调序后落在其后 ⇒ 它胜出 ⇒ **不采纳调序**（**零行为改动** + 「本序不可调换」注释） ② **F298 关账**：正证 = 末跳 `/` **5/5** · 反证 = 全程**无 `/login` 中间态留驻**（60 采样 / 次 · 50ms 间隔）⇒ 原口径「`navigate` 在 `refresh` 之后 = 竞态窗」**被实测否证** ③ 断言 ③ = `m4b2-auth` dogfood 单跑（runner 自管 `:9333` 浏览器 · **不碰手工 `:9222`**） ④ 门禁 **275/141/3/50/37/0** · 18 维 **9.57**（§7.1））
> Updated: 2026-10-12（**v1.0：T7 落地 —— 登录页入口（退役 `altMode` · 真页十断言全绿）+ 件面 24 → 25 + F311** —— ① **交付 5 件**：`pages/Login.tsx`（文字链一行 · 按启用集渲染 · 常态下划线 · 1×12 竖线 · 16px · 失败行落链接行下 · 两错误互斥 · 骨架含链接行位且随启用集条件渲染）· `api/meta.ts`（`fetchAuthProviders`）· **`api/auth.ts`（`signInWithProvider` · T7 轮补入件面 #25）** · `i18n/{zh,en}.ts`（退 4 新 5 改值 2 ⇒ login **17**） ② **真页实测（隔离实例 :3100/:5174 · CDP · 十断言）**：关态无链接行 · 开态一行按序 **ZH 249.77 / EN 294.30**（< 336 · 逐项宽 87/43/42/26 · 110/43/42/48）· 竖线 **1×12** & `--border` · 间距 **16.00**（其余 22）· 单项无竖线 · 骨架 = 真列（**301 = 301** / **265.5 = 265.5**）· 误配点击 ⇒ `login.providerFailed` 落链接行下 **+8px** + 表单错误清零 · **0 JS errors**（含 `console.error`） ③ **F311**：骨架原差 **5px**（M4b-2 遗留）⇒ 就地修正（占位档对齐真实文本盒） ④ 判据① **全代码面归零**（F308 的 T7 出口达成）· i18n **699 实测**（坐实 F310） ⑤ build/typecheck/lint/format 全绿 · 门禁 **275/141/3/50/37/0** · T7 自检 **9.54**（§7.1））
> Status: 🟢 **执行中**（**T1 ✅ 9.51 · T2 ✅ 9.54 · T3 ✅ 9.57 · T4 ✅ 9.53 · T5 ✅ 9.54 · T6 ✅ 9.51 · T7 ✅ 9.54 · T8 ✅ 9.57 · T9 ✅ 9.55** · 2026-10-12）—— 上游 = 批 design **v1.2**（8 维 9.69 · F 账 → **F314**）· 本 plan **v1.2** · 待 T10 开工
> 上游 = 批 design `docs/designs/2026-10-12-m4c3-external-identity-design.md`（**定稿 · 8 维 9.69** —— 版本以其版本头为准 · 去硬版本引用）
> · 主 design `docs/designs/2026-10-08-m4c-account-and-access-governance-design.md`（§2.6 R1/R4/R10/R11/R13 · §2.7 件面 · §3.4 共享模块 · §5 详章 · §6.1 · §10.2 线框 —— 版本以其版本头为准）
> · 视觉真值 SSOT `docs/designs/2026-09-09-m4a-marketplace-portal-design.md` **§4.4**（本批**仅 1 个新间距值** 16px · 其余复用本页既有档 · 引 M4c 主 design §2.3「视觉随批就地定稿」）
> · `docs/00-product-direction.md` §5 **M4c-3 子行**（状态唯一源）
> **前置 = M4c-1 出口五件全绿**（依赖链 `1→3` · 已达成：M4c-1 ✅ 收口 · M4c-2 ✅ 收口 2026-10-09）⇒ 本批可开工

---

## 1. 目标与非目标

**目标**（四块：社交三通道 + 企业 IdP 换官方件 + 账号链接统一 + 登录页入口；**删件 4 · 改造 25 · 新建 2** · 迁移 **0** · 新表 **0** · 自绘端点 **0**）：

| # | 交付 | 说明 |
|---|------|------|
| 1 | **env 契约 +13 / −5 键**（**删键归 T6** · 见 §2 注） | `ENTRA_*` 4（企业通道）+ `SOCIAL_{GOOGLE,GITHUB,WECHAT}_*` 9（社交三通道）**归 T1**；删 `OIDC_*` 5 键 + 2 段校验**归 T6**（须与消费件 `auth/oidc.ts` 退役同批 ⇒ 否则中间态编译红）；**fail-fast**（启用但缺凭据 ⇒ 拒启）+ **G1**（`ENTRA_ENABLED` 且 `TENANT_ID` 空 ⇒ 拒启） |
| 2 | **provider 装配 4 个（官方内置）** | `microsoft`（含 `tenantId`）/ `google` / `github` / `wechat`；**不采** SSO 插件 / `genericOAuth`；默认全关 ⇒ 独立部署零影响 |
| 3 | **只读启用集端点** | `GET /api/meta/auth-providers` → `{ providers: string[] }`（序 = 界面入口序的启用子集 · 全关 ⇒ `[]`）；匿名只读 · 零副作用 · 不入审计 · **不回显密钥类 env**（同 `/api/meta/limits` 口径，落在既有 `createMetaRoutes` 内 · 不新建文件） |
| 4 | **账号链接统一（唯一实现处）** | 重定向类（Entra / 社交）共用官方 `oauth2/link-account.mjs`；**本批不改官方默认**（自动链接）+ **风险入档**；共享模块只加**占位邮箱识别**（`.placeholder.invalid`）· **不改任何建号行为** |
| 5 | **登录页入口 + 降级** | 退役 `altMode` ⇒ 表单下方 **provider 文字链一行**（13px 本页链接档 + 常态下划线 · 项间 **1×12** 竖线 · **无「或」分隔线** · 主按钮↔链接行 **16px**）；按启用集渲染（0 项 ⇒ 整行不渲染）；失败 ⇒ inline 错误行落**链接行之下**；骨架镜像入门块（**零跳动**） |
| 6 | **自绘 OIDC 全链退役（彻底删）** | 删件 4（`http/oidc-routes.ts` + 其测试 · `auth/oidc.ts` + 其测试）· 删端点 `signInAihOidc` · 删错误码 2 · 删 `oidc_state` cookie 处理 · **不做兼容层** |
| 7 | **审计与错误码** | 删 `oidc` 动作组 ⇒ 新增 `external` 组（`external.provisioned` · 四通道共用 · `detail.provider`）；登录成功补记既有 `auth.login.success`；**`ldap` 组不动**（史实连续） |
| 8 | **登出落点确定化（F298 关账）** | `UserMenu` 登出链调序：`invalidateCache()` → `navigate('/', {replace:true})` → `await refresh()` + 探针正反双证 |
| 9 | **判据与回归** | §3.7 四层判据（grep 归零 / 四通道建号+链接 / 占位邮箱 / 入口与降级）· 测试分层 **L1–L7** · dogfood **+1 脚本**（总量 8 → 9） |
| 10 | **文档收口** | 主 design 就地订正（**F303 / F304 / F306** 共 **8 处**）· `docs/07` §3.4 注记 + v1.17（**承载 F305**）· 证据归档 · 追踪行 · **F 号 4 处同步** |

**非目标**（批 design §1）：准入策略（主 design §2.6 **D5** 保留不实现）· 管理员重置密码 · 资产面 · **SAML** · 旧自绘 OIDC 兼容层 · 连通性预探测 / 入口禁用（Q2 备选 A 未采）· 官方 SSO 插件 / `genericOAuth` · 邮件服务 · **存量外部身份数据迁移**（迁移 0）· 管理员删除外部身份行 · **自动建号告知文案**（本轮登记为后续可选 · §6 风险 7）· 品牌图标（P3 甲）。

---

## 2. Task 总览

**执行序 = 服务端契约（env → 装配 → 端点）→ 共享模块 → 审计/错误码 → 退役 → 前端入口 → 登出链 → 管理面连带 → 验证 → 收口。**
（顺序即安全窗：**端点先通、页面后接**；**退役放在装配之后**（新通道先可跑，再拆旧链）；**文档订正与 F 号收口置于末 Task**）

> ⚠ **同批约束（v0.3 订正 · 开工前实测）**：`env.OIDC_*` 5 键被 `auth/oidc.ts`（`:57-62` 七处读）与 `env.test.ts` / `oidc.test.ts` 消费 ⇒ **删键与删消费件必须同 Task**（否则 T1 出口「本包 typecheck 绿」必然红）。故 **+13 键归 T1 · −5 键归 T6**（同 M4c-2「列退休置于端点之后」原则：删面跟着消费面走）。

| # | 归属 | 主题 | 前置 | 出口 |
|---|------|------|------|------|
| **T1** | server | env 契约 **+13 键（只增不删）** + fail-fast + **G1** 租户校验 | — | 13 键两态断言绿 · 拒启 **3** 例实测 · 本包 `typecheck` + `lint` |
| **T2** | server | provider 装配 4 个（官方 `socialProviders`） | T1 | 关态不装配 / 开态装配且 `microsoft` 含 `tenantId`（L1）· 未装配 ⇒ **404** `oauth_provider_not_found`（L2） |
| **T3** | server | 只读启用集端点 `GET /api/meta/auth-providers` | T2 | 全关 ⇒ `[]` · 开 N ⇒ N 项且**序**正确（L4）· 匿名可读 · 零副作用 · 不回显密钥 |
| **T4** | server | 共享模块：占位邮箱识别（唯一实现处） | T3 | 模块直测（L3）· **零行为变化**（既有建号/链接断言不变） |
| **T5** | server | 审计 **`external` 组 + 建号/登录补记**（**只加不删**） | T4 | 源扫幽灵项绿 · 建号 ⇒ `external.provisioned`（含 `detail.provider`）· 登录 ⇒ `auth.login.success` |
| **T6** | server | 自绘 OIDC 全链退役（删件 4 + 收敛 + **删 env 5 键** + **收删除面**：`oidc` 审计组 / 2 错误码） | T5 | **服务端面判据① 归零**（`apps/server/src` + `packages`；全代码面余 2 行属 T7 件 · **F308**）· env `OIDC_*` 归零 · 审计组 / 错误码 / **i18n `errors` −3 键**（**F309**）收敛 · 全量测试绿（**重记基线 674/0 · 57 文件**）· 注释腐化 0 |
| **T7** | web | 登录页入口：退役 `altMode` + 文字链一行 + 降级 + 骨架 + i18n | T6 | 关态无链接行 · 开态**一行**按序（**实测** ZH **249.77** / EN **294.30** < 336）· 竖线 **1×12** · **16.00px** · 骨架**零跳动**（**301 = 301 · 265.5 = 265.5**）· 两条错误互斥 · `NO JS ERRORS`（**均实测 · §7 T7 行**）|
| **T8** | web | 登出链**实测复核**（**F298 关账** · **F312 反证 ⇒ 不调序**） | T7 | **实测：原序即落 `/` 5/5**（调序后反落 `/login?next=…` 5/5 ⇒ **不采纳**）· 无 `/login` 留驻 · `m4b2` G5 断言不变 |
| **T9** | web | 管理面连带：占位邮箱列 + 审计分组标签 | T8 | 占位邮箱 ⇒ 列显「—」· 审计页无「OIDC」组 / 有「外部身份源」组 |
| **T10** | script / 验证 | L5 假 issuer + L6 dogfood + 连带断言脚本 | T9 | 新脚本单跑绿 · dogfood 全量 **9 脚本**读数记录 · `m4b2` 无恒红 |
| **T11** | 文档 / 收口 | L7 手工实测 + 主 design 订正（F303/F304/F306）+ `docs/07`（F305）+ 证据 + 追踪行 + F 号 4 处 | T10 | 门禁 6 道全绿 · F 号 4 处一致 · 头部 ≤3 行 · `head-sink` 无 token 丢失 · 批收口自检 ≥9 |

---

## 3. Task 明细（每 Task 三段齐全：步骤 / 断言与门禁 / 落点依据）

### T1 · server：env 契约（`+13 / −5` 键 + fail-fast + G1）

> 依据 = 批 design **§3.1 · C2 · G1**；事实依据：`config/env.ts:69-75`（`OIDC_*` 5 键）· `:112-114`（`LDAP_ENABLED` 校验范式）· `:119-125`（OIDC 完整性校验，删）· `:126-133`（discovery https 校验，删）。前置 = 无。

1. 新增 **13 键**（默认全关）：`ENTRA_ENABLED=false` / `ENTRA_CLIENT_ID=''` / `ENTRA_CLIENT_SECRET=''` / `ENTRA_TENANT_ID=''` + `SOCIAL_GOOGLE_*` / `SOCIAL_GITHUB_*` / `SOCIAL_WECHAT_*`（各 `_ENABLED` / `_CLIENT_ID` / `_CLIENT_SECRET`）。
2. ~~删 **5 键** `OIDC_*` + 两段校验~~ ⇒ **移入 T6**（v0.3 订正：其消费件 `auth/oidc.ts:57-62` 到 T6 才删 ⇒ 本 Task 删键会让**中间态编译红**；同批约束见 §2 注）。
3. **fail-fast**（沿用既有模式）：任一 `*_ENABLED=true` 且其 `_CLIENT_ID` 或 `_CLIENT_SECRET` 为空 ⇒ `parseEnv` 抛错**拒绝启动**；**另加 G1**：`ENTRA_ENABLED=true` 且 `ENTRA_TENANT_ID` 为空 ⇒ 亦**拒启**（官方缺省 `"common"` ⇒ 任何 Microsoft 账号可进，自托管必须收紧）。
4. `.env.example` 同步 13 键 + 删 5 键（若有该文件）。

**断言 / 门禁**：① 13 键**两态**断言（全关 ⇒ 独立部署零影响；开 ⇒ 生效）② **拒启 3 例**实测：缺 `_CLIENT_ID` / 缺 `_CLIENT_SECRET` / `ENTRA_ENABLED` 且 `TENANT_ID` 空（各断言抛错且**不启动**）③ 本包 `typecheck` + `lint` + 全量测试绿（**OIDC 面零改动** ⇒ 基线不漂移）④ `git status` 无新文件（只改 `env.ts` / `env.test.ts` / `.env.example`）。

**落点**：`apps/server/src/config/env.ts` · `apps/server/src/config/env.test.ts` · `.env.example`（若在场）

### T2 · server：provider 装配（官方内置 4 个）

> 依据 = 批 design **§3.2 · 主 design §2.6 R4**；官方真值：`@better-auth/core@1.7.5` `dist/social-providers/{microsoft-entra-id,google,github,wechat}.mjs` · `index.d.mts:1875`（键名清单）；`microsoft-entra-id.mjs:19-23`（`tenantId` 默认 `"common"` · `options.authority` 可配）。前置 = T1。

1. `auth/better-auth.ts` 的 `socialProviders` 按 env **条件展开** 4 个 provider（`...(env.X_ENABLED ? { … } : {})`）；`microsoft` 传 `{ clientId, clientSecret, tenantId: env.ENTRA_TENANT_ID }`。
2. 键名**逐字**照官方（`microsoft` / `google` / `github` / `wechat`）—— 与 `POST /api/auth/sign-in/social` 的 `provider` 入参同值 ⇒ **前端零映射表**。
3. 顶注释订正（`oidc` 表述 ⇒ 外部身份源）+ **不采** SSO 插件 / `genericOAuth`（写为非目标指针）。

**断言 / 门禁**（L1 + L2）：① 关态 ⇒ `socialProviders` **无键**（不装配）② 开态 ⇒ 装配且 `microsoft` 的 `tenantId` = env 值 ③ **L2**：未装配 provider ⇒ `POST /api/auth/sign-in/social {provider:'github'}` = **404 `oauth_provider_not_found`**（官方 `api/routes/sign-in.mjs:151`）④ 注入 env 的单测（不连真实 IdP）⑤ 本包 `typecheck` + `lint`。

**落点**：`apps/server/src/auth/better-auth.ts` · `apps/server/src/auth/better-auth.test.ts`（若需补两态用例）

### T3 · server：只读启用集端点

> 依据 = 批 design **§3.3 · C3 · 主 design §2.6 R2（0 启用 ⇒ 不渲染）**；先例 = `/api/meta/limits`（`http/meta.ts` · **34 行**实测）；官方**无**「列出已配置 provider」只读端点（`dist/api/routes/` 全表 · `/ok` 只回 `{ok:true}`）。前置 = T2。

1. 在**既有** `createMetaRoutes` 内加 `GET /api/meta/auth-providers`（**不新建文件**）。
2. 出参 `{ "providers": string[] }` —— 值 = 官方 provider 键名，序 = 界面入口序 `microsoft` → `google` → `github` → `wechat` 的**启用子集**；全关 ⇒ `[]`。
3. 语义：匿名只读 · 零副作用 · 不入审计 · **只回显启用集**（`clientSecret` / `tenantId` 等一律不回显）。

**断言 / 门禁**（L4）：① 全关 ⇒ `{providers:[]}` ② 开 N（分别 1 / 3 / 4 态）⇒ N 项且**序**与界面一致 ③ 匿名可读（无 401）· 重复请求零副作用（无审计行新增）④ 出参**不含**任何密钥类字符串（断言响应体不出现 env 值）⑤ `meta.test.ts` 两态 + 端点在既有文件内（`git status` 无新文件）⑥ 本包 `typecheck` + `lint`。

**落点**：`apps/server/src/http/meta.ts` · `apps/server/src/http/meta.test.ts`

### T4 · server：共享模块 —— 占位邮箱识别（唯一实现处）

> 依据 = 批 design **§3.4（共享模块新增职责 · G9 → P7 丙）· 主 design §2.6 R11 / §3.4**；官方真值：`dist/utils/email.mjs`（`PLACEHOLDER_EMAIL_DOMAIN = "placeholder.invalid"`）· `wechat.mjs:77/82`（`emailVerified:false`）。前置 = T3。

1. `auth/identity.ts`（M4c-1 T3 已建的共享规则模块）加**占位邮箱识别**函数（`email` 以 `.placeholder.invalid` 结尾 ⇒ 「无邮箱身份」）。
2. **服务端零新增拦截**：不改任何建号 / 链接行为 —— R11 的实质**已由官方满足**（`emailVerified:false` 不参与自动链接 · 占位串天然唯一不撞 `user_email_unique`）。**写明「服务端无代码 ≠ 漏实现」**。
3. 模块定位声明沿用（**不是**与官方并行的第二套建号机制）。

**断言 / 门禁**（L3）：① `identity.test.ts` 直测 4 例：占位 ⇒ true · 正常邮箱 ⇒ false · 大小写/子域变体 · 空串/无邮箱 ② **零行为变化硬证**：既有建号 / 链接 / 目录通道断言**逐条不变**全绿 ③ 本包 `typecheck` + `lint`。

**落点**：`apps/server/src/auth/identity.ts` · `apps/server/src/auth/identity.test.ts`

### T5 · server：审计 `external` 组 + 建号/登录补记（**只加不删** · 删除面归 T6）

> 依据 = 批 design **§3.6 · G5 · G11**；先例 = `plugins/ldap-credentials.ts:214-220`（审计字段惯例 `{ provider, via }`）· `app.ts:132`（包装层「先读上下文 → 官方处理 → 成功即补审计」，已用于 `sign-out` / `device.approve|deny`）；`db/schema/governance.ts:138`（`detail` jsonb）。前置 = T4。

1. `audit/actions.ts`：**新增** `external` 组 / `external.provisioned`（四通道共用一枚动作）——⚠ **`oidc` 组的删除归 T6**（消费点 `http/oidc-routes.ts:189` 引用 `AUDIT_ACTIONS.provisionOidc` ⇒ 须同批删，否则中间态编译红）。
2. `audit/audit.ts`：**新增** `provisionExternal`（**`provisionOidc` 的删除同样归 T6**）。
3. ~~`auth/errors.ts` 删 2 码~~ ⇒ **移入 T6**（消费点 `oidc-routes.ts:134/149/153/155` 同批删；同 T1 的 `OIDC_*` 教训）。
4. **写入点定案（design §3.6 v0.8 补写 · 本 Task 落）**：① **`external.provisioned`** = 官方 **`databaseHooks.account.create.after`** 钩子（`better-auth.ts`）—— `providerId ∈ {microsoft,google,github,wechat}` **且**该用户**无其他 account 行**（首登建号；链接不记）⇒ `detail: { provider, via: 'oauth/callback' }` ② **`auth.login.success`** = **包装层**（`app.ts` 命中 `/api/auth/callback/<provider>`）—— 响应 `Set-Cookie` 取 token 查库（复用 `sessionOwnerOfResponse` 手法，因会话由**响应**下发）⇒ 同带 `detail.provider`。
5. **`ldap` 组不动**（G11：历史审计行已有 `ldap.provisioned`）。

**断言 / 门禁**：① `audit/actions.test.ts` 源码扫描绿（幽灵项反向扫描：常量表与目录同批加）② **建号判据纯函数**直测（`providerId` 四通道 / 非四通道 × account 数 1 / ≥2 四组）③ **负例实测**（真库真端点）：本地自助注册（`providerId='credential'`）⇒ **零** `external.provisioned` 行 ④ `auth.login.success` 的**正例**依赖真回调 ⇒ 归 **L5/T10**（诚实标注）⑤ 本包 `typecheck` + `lint`（删除面归 T6 ⇒ 本 Task **零删除** ⇒ 零中间红）。

**落点**：`apps/server/src/audit/actions.ts` · `apps/server/src/audit/audit.ts` · `apps/server/src/auth/better-auth.ts` · `apps/server/src/app.ts` · `apps/server/src/auth/better-auth.test.ts`

### T6 · server：自绘 OIDC 全链退役（删件 4 + 连带收敛）

> 依据 = 批 design **§3.5 件面 · U5 · §3.7 判据①**；实测命中：`http/oidc-routes.ts`（50）· `http/oidc-routes.test.ts`（29）· `auth/oidc.ts`（19）· `auth/oidc.test.ts`（20）；`app.ts:132`（挂载）· `plugins/ldap-credentials.ts:116`（端点 `signInAihOidc`）。前置 = T5。

1. **删 4 件**：`http/oidc-routes.ts` · `http/oidc-routes.test.ts` · `auth/oidc.ts` · `auth/oidc.test.ts`。
1a. **收删除面（自 T5 移入 · 同批零中间红）**：`audit/actions.ts` 删 `oidc` 组 · `audit/audit.ts` 删 `provisionOidc` · `auth/errors.ts` 删 2 码（`:15-16`）+ 2 `case`（`:58-59`）—— 三处消费点均在本次所删件内。
1b. **删 env 5 键 + 2 段校验**（`config/env.ts:69-75` 的 `OIDC_*` · `:119-125` 完整性校验 · `:126-133` discovery https 校验）—— **与本步同批**（消费件已删 ⇒ 零中间红）；`.env.example` 同步删 5 键。
2. 连带收敛（**只删不迁**）：`app.ts` 删 import + `/api/auth/oidc` 挂载 · `plugins/ldap-credentials.ts` 删端点 `signInAihOidc` 与其 `OIDC_PROVIDER` 引用（**保留** `before` 钩子：CSRF 平价 + 首登建号）· `test-utils/auth-fixture.ts` 注释订正（`'ldap'/'oidc'` ⇒ `'ldap'/'external'`）· `http/admin-users.ts` 注释先例指针改指现存件（防注释腐化）· 相关测试同步删。
2b. **i18n `errors` 组 −3 键**（`auth.oidc_denied` · `auth.oidc_state_mismatch` · `oidc.not_configured`，`i18n/{zh,en}.ts` 各 3）—— **生产点（`errors.ts` 2 码 + 自绘端点 404 体）本 Task 删除 ⇒ 同批**（design §3.6「随自绘端点一并退役」· 同「删面跟着消费面走」原则 · **F309**）。
2c. **死参 / 死码清除**（连带实测发现）：`AppDeps.cookieSecure`（原供自绘 state cookie）· `index.ts` 该入参 · 5 个测试件的同名入参 · `ldap-credentials.ts` 的 `fail` / `issueSession` / `AuthEndpointCtx` / 相关 import 与**注释腐化 4 处**（`createAuthEndpoint` 表述 · 服务端唯一性判定 · 会话签发内部件 · 端点响应契约段）· `admin-users.ts` 先例指针改指**存活件**（`auth/api-keys.ts`）。
3. **不做兼容层**（旧协议彻底删 · 用户偏好）。

**断言 / 门禁**：① **判据① 服务端面归零**（**范围口径写明 = F308**，非放宽）：对同一模式串（`oidc_state` / `signInAihOidc` / `createOidcRoutes` / `getOidcClient` / `OIDC_ENABLED` / `oidc.provisioned` / `auth.oidc_`）在 `apps/server/src` + `packages/` 内 `grep -rnE` ⇒ **0 命中** · `config/env.ts` 的 5 键归零 · `apps/web/src/pages/Login.tsx` 余 **2 行注释**（T7 件 ⇒ 全代码面由 **T7 出口复核**）· **豁免**：早于本批的历史设计/计划/证据文档（不可改写）· 本批 design 与 plan（必须引用）· 构建产物 `dist/` · `.turbo/` 不计 ② 全量测试绿（**重记基线**：服务端 **674 pass / 0 skip / 0 fail**（57 文件 · 2149 expect）—— 账 = +13 用例（T1–T5）− 删 2 测试件 9 用例（`auth/oidc.test.ts` 3 含 1 skip · `http/oidc-routes.test.ts` 6）− `env.test.ts` 4 个 OIDC 块）③ 注释腐化扫描（引用已删函数 / 路由 / 死参 ⇒ 0：`fail` · `issueSession` · `AuthEndpointCtx` · `setSessionCookie` · `AppDeps.cookieSecure` 全清）④ 本包 `typecheck` + `lint` + `format:check`。

**落点**：4 删件 + `apps/server/src/app.ts` · `apps/server/src/index.ts` · `apps/server/src/auth/plugins/ldap-credentials.ts` · `apps/server/src/auth/{identity,identity.test,better-auth,better-auth.test}.ts` · `apps/server/src/config/env{,.test}.ts` · `apps/server/src/audit/{audit,actions}.ts` · `apps/server/src/auth/errors.ts` · `apps/server/src/test-utils/auth-fixture.ts` · `apps/server/src/http/admin-users.ts` · **5 测试件去 `cookieSecure`**（`app.test.ts` · `auth/{password-verify,session-lifecycle}.test.ts` · `auth/plugins/ldap-credentials.test.ts` · `http/device-flow.test.ts`）· **`apps/web/src/i18n/{zh,en}.ts`（F309）** · `.env.example` · `docs/smoke/scripts/doc-claims-check.ts`（行锚 `268 → 255`）

### T7 · web：登录页入口（退役 `altMode` + 文字链一行 + 降级 + 骨架 + i18n）

> 依据 = 批 design **§4.1 / §4.2 / §4.5 / §4.6（P3 / P5 / P6 / P14–P17）· §2.2 Q1/Q2 · G3/G4**；真码锚点 `pages/Login.tsx`（**236 行** · `:46` 常量 · `:90-91` `altMode` · `:160-172` 备选态块 · `:174-218` 表单 · `:222-231` 底部链接 · `:223` 链接档 · `:49-51` 尺寸档）；官方入参 `api/routes/sign-in.mjs:23/40/47`。前置 = T6。

1. **删**（Q1 · 合计 26 行 / 4 处）：`altMode` state（`:90-91`）· 备选态块（`:160-172`）· 底部文本链接（`:222-231`）· `OIDC_AUTHORIZE_URL` 常量（`:46`）。
2. **加**：表单块下方 provider **文字链一行** —— 本页**既有链接档**（`text-[13px]` + `text-muted-foreground` + `hover:text-foreground`）+ **常态下划线**（`underline underline-offset-4`）；项间 **1×12 CSS 竖线**（取 `--border` 令牌）；**1 项无竖线** · **0 项整行不渲染**；主按钮 ↔ 链接行 **16px**（其余段沿用本页 22px）；整行居中。
3. **取数**：进登录页取一次 `GET /api/meta/auth-providers`（`api/meta.ts` 加取启用集函数 · 不落持久缓存）；端点不可达 ⇒ 按「未启用」处理（**不留死入口**）。
4. **点击** ⇒ `authClient.signIn.social({ provider, callbackURL: destination })` —— **同页跳转** · **不取** `disableRedirect`；`callbackURL` 复用 `sanitizeNext` 单点算出的 `destination`（**不另立白名单**）。
5. **失败** ⇒ inline 错误行（既有 `role="alert"` 档 · 文案 `login.providerFailed`）**落链接行之下**（E2）；与表单错误**互斥**（操作任一方即清另一方）。
6. **骨架**：`loading` 态镜像表单列 + **仅链接行位**（无分隔线位）· **须用同一 16px 间距**（否则 6px 跳动）· 占位**随启用集条件渲染**。
7. **i18n**（`i18n/{zh,en}.ts`）：**退 4**（`oidcLink` / `oidcHint` / `oidcOpen` / `backToForm`）· **新 5**（`providerMicrosoft` =「Microsoft 账号」/「Microsoft account」· `providerGoogle` / `providerGitHub` / `providerWechat` · `providerFailed`）· **改值 2**（`subtitle` ⇒「使用企业账号登录」· `feature3` ⇒「企业目录账号直连（LDAP / Entra ID）」）；⇒ `login` 组 **16 → 17** · **批末全仓 701 → 699**（**F310** 订正：`admin` 组为**改名**净 0；T6 后中间值 = 698）；双语**双向差集 0**。

**断言 / 门禁**：① 关态 ⇒ **无链接行**（0 启用不渲染）② 开态 4 项 ⇒ **按序一行**「Microsoft 账号 ｜ Google ｜ GitHub ｜ 微信」且**不换行**（内容宽 ZH ≤ **250** / EN ≤ **294** < **336**）③ 竖线实测 **1×12** · 颜色 = `--border` ④ 主按钮 ↔ 链接行 = **16px** · 其余段 **22** ⑤ **骨架列高 = 开态列高**（零跳动）⑥ 启用 1 项 ⇒ **无竖线** ⑦ 未装配 provider 点击 ⇒ inline 错误行 + **落链接行之下** ⑧ 两条错误互斥（不同屏出现两条红字）⑨ 全程 `NO JS ERRORS` ⑩ 本包 `typecheck` + `lint` + **web `build` 绿**。

**落点**：`apps/web/src/pages/Login.tsx` · `apps/web/src/api/meta.ts` · `apps/web/src/i18n/zh.ts` · `apps/web/src/i18n/en.ts`

### T8 · web：登出链**实测复核**（F298 关账 · F312 反证 ⇒ **不调序**）

> 依据 = 批 design **§2.2 Q3 甲 · §13 F298**；真码锚点 `components/ui/UserMenu.tsx:80-89`（登出链）· 竞态两路径 `auth/RoleGuard.tsx:38-41`（anon 跳 `/login?next=`）与 `api/client.ts:343-359`（401 分流 ⇒ `AuthProvider.tsx:119`）。前置 = T7。

1. ~~`UserMenu.tsx` 登出链调序~~ ⇒ **V1.1 订正：不采纳（F312 实测反证）**。**当前真码（`:86-88` 实测）= `invalidateCache()` → `await refresh()` → `navigate('/', { replace: true })`** —— 该序**即契约序**：真页探针（各 5 次）实测**原序末跳落 `/` 5/5**；而原「目标序」（`navigate('/')` 提前）末跳落 **`/login?next=%2Fdashboard%2Fassets` 5/5**。**根因**：`refresh()` 的 `/me` 必 401 ⇒ 触发 **401 分流**（`AuthProvider.tsx:116-119` 的 `setUnauthorizedHandler` ⇒ `navigate('/login?next=<原受保护路由>', { replace: true })`）；原序中它被 `await refresh()` 挡在 `navigate('/')` **之前** ⇒ `/` 最后胜出；调序后它落在其后 ⇒ 它胜出（「统一落 `/`」恰由原序保证）。⇒ **本步零行为改动**（仅加「**本序不可调换**」注释 + 头部注释订正）。
2. **零行为改动**（结论：原序即契约序 · P9）：不改任何 DOM / 类名 / 文案 / 执行序 —— 仅加注释（把「为何不能调序」写进代码，防后人「顺手优化」再次回归）。
3. `m4b2` 证据脚本 G5 断言**不变**（按设计契约：不留在受保护路由 · 复用 `isProtectedRoute` 单点）。

**断言 / 门禁**：① **探针正证**：连续 **5 次**登出**全落 `/`** —— **实测 5/5 ✓**（真页 · 用户菜单真点击 · UI 真登录；采样序列 `/dashboard/assets` → `/`）② **反证**：登出**过程中不出现 `/login` 中间态留驻** —— **实测无 `/login` 采样 ✓**（60 采样/次 · 50ms 间隔 · 覆盖 `refresh()` 前后）；**并附改序反证**：`navigate('/')` 提前后末跳 **`/login?next=…` 5/5**（F312）③ `m4b2` 脚本单跑绿 —— `m4b2-auth-dogfood.ts`（**G5** 所在件）经 `dogfood-all` runner 自管 `:9333` 浏览器单跑（**不碰手工 `:9222`**）④ 本包 `typecheck` + `lint` + `format:check`。

**落点**：`apps/web/src/components/ui/UserMenu.tsx`

### T9 · web：管理面连带（占位邮箱列 + 审计分组标签）

> 依据 = 批 design **§3.4（P7 丙）· §3.6**；真码锚点 `pages/AdminUsers.tsx:297`（`{email || '—'}` 既存兜底 · 本批**零前端逻辑改动**）· `pages/AdminAudit.tsx:68-69`（`'oidc'` 组标签分支）。前置 = T8。

1. `AdminUsers.tsx`：**零逻辑改动** —— 服务端出参归一后既有兜底**直接生效**（占位邮箱列显「—」）；仅核对 + 必要时注释。
2. `AdminAudit.tsx`：**组标签分支 `'oidc'` ⇒ `'external'`** ⇒「OIDC」标签随动作组消失、「外部身份源」标签随 `external` 组出现；
   **追加（F313 · 2026-10-12 用户拍板「顺手补」）**：补 `'user'` 分支 —— `user.*` 动作组自 **M4c-2** 起已登记，却走 `default` 兜底 ⇒ **双语实测显示裸 `user`**（中文管理台可见英文裸前缀）；
   **i18n `admin` 组**：`audit.group.oidc` ⇒ **`audit.group.external`**（「外部身份源」/「External」· **改名 ⇒ 净 0** · **F310**）+ **新增 `audit.group.user`**（「用户」/「Users」⇒ **+1**）· 键账见 design §4.4。

**断言 / 门禁**：① **占位邮箱账号 ⇒ 管理列表该列显「—」（真库实测 ✅）** —— 经**用户授权的 1 行临时造数**（`wx_probe_m4c3@wechat.placeholder.invalid` · **用完即删、库复位 728**）：出参 `email: null` · 响应 JSON 内 `placeholder.invalid` **0 命中**（不泄露）· 真页「邮箱」列实测 **「—」** ② 审计页分组**无「OIDC」** · 有「外部身份源」**（真页 ✅）** —— `/api/audit/actions` 9 组含 `external` / 无 `oidc`；动作下拉 34 项，组标签 zh「… LDAP / **外部身份源** / **用户**」/ en「… LDAP / **External** / **Users**」；**双语「OIDC」0 命中**；**F313 补后裸 `user` 消失** ③ 排序 / 筛选（服务端）不受归一影响**（真页 ✅：点「邮箱」列表头 ⇒ 服务端排序正常回填）** ④ 本包 `typecheck` + `lint` **（exit 0 / 0）** ⑤ `format:check` **exit 0** · `build` **exit 0** · 门禁 6 道 **275/141/3/50/37/2**。

**落点**：`apps/web/src/pages/AdminUsers.tsx` · `apps/web/src/pages/AdminAudit.tsx` · `apps/web/src/i18n/{zh,en}.ts`

### T10 · script / 验证：L5 假 issuer + L6 dogfood + 连带断言脚本

> 依据 = 批 design **§6 L5 / L6 · §5 连带面**；先例 = **F221**（写死历史结构的断言须回改，不留恒红）；官方真值：`microsoft-entra-id.mjs` 支持 `options.authority` 覆盖 ⇒ **唯一可假 issuer 的 provider**（`google` / `github` / `wechat` 端点硬编码）。前置 = T9。

1. **新建** `docs/smoke/scripts/m4c3-entra-fake-issuer.ts`（L5）：自签 jwks + `authority` 指向本地假端点 ⇒ Entra 通道全流程（**注意** `tenantId` ≠ `common` 时官方**校验 `issuer`**）。
2. **新建** `docs/smoke/scripts/m4c3-login-providers-dogfood.ts`（L6 · **默认全关态**）：「关闭态渲染」（**无链接行**）+「误配降级」（调未启用 provider ⇒ **404 `oauth_provider_not_found`**）。
3. 在 `docs/smoke/scripts/dogfood-all.ts` 的 `SCRIPT_NAMES` 末尾登记 L6 新脚本（批序追加）。
4. **连带回改** `docs/smoke/scripts/m4b2-ui-redo-assertions.ts`：`A10`（`:344-348`）与 `A10b`（`:360`）**2 条断言绑死 `altMode`** ⇒ 同步改为「表单下方 provider 文字链一行」断言（**不留恒红**）· **另** `:279` 的 A8 debug 字段 `altMode`（读旧文案「返回密码登录」）同批订正（非断言，同属旧标识残留）—— **三处行锚已由 T7 轮复核命中**（`:344-348` / `:360` / `:279`）。

**断言 / 门禁**：① 两个新脚本单跑绿（L5 需本地假端点 · L6 需服务重启切 env）② `m4b2` 证据脚本单跑**无恒红** ③ **dogfood 全量 9 脚本**读数记录（既有 8 脚本基线 **519 PASS / 0 FAIL** 须**零漂移**，新脚本另计）④ 每段 `NO JS ERRORS` 为硬门 ⑤ **提交前须通配还原被改写的证据 PNG**（`git checkout -- '*.png'`）。

**落点**：`docs/smoke/scripts/m4c3-entra-fake-issuer.ts`（新）· `docs/smoke/scripts/m4c3-login-providers-dogfood.ts`（新）· `docs/smoke/scripts/dogfood-all.ts` · `docs/smoke/scripts/m4b2-ui-redo-assertions.ts`

### T11 · 文档 / 收口（含 **L7 手工实测**）

> 依据 = 批 design **§4.4 · §13（F303–F306）· §6 L7 · P11 · G8**；F 号同步 4 处 = 批 design §13 · `docs/README` §6.1 · 证据 §5 · `docs/00`。前置 = T10。

1. **L7 手工实测（纳入本批验收 · 8 项 · 截图 2 张）**：① 关态 ⇒ 无链接行（截图 1）② 开态 4 全开 ⇒ 链接行**按序一行**（截图 2）③ 误配降级 ⇒ `POST /api/auth/sign-in/social {provider:'github'}`（未装配）= **404** ④ **F298 关账取证**：连续 **5 次**登出**全落 `/`**（正反双证）⑤ 回调落点：`/login?next=%2Fadmin%2Fusers` 发起 ⇒ 成功回 **`/admin/users`**（**条件项**：需真凭据 · **用超管账号跑**）⑥ **1366×768 无纵向滚动/裁切**（原型实测富余 **468px**）⑦ **骨架含链接行位**（`loading → anon` **零跳动**）⑧ **两条错误互斥**（不同屏出现两条红字）。
2. **主 design 就地订正 8 处**：`§2.6 R13` 形态措辞（**F306**）· §3 入口指针 · §5.1 小标题 · §10.2 线框（**F306 + F303** · 加「示意 · 按启用集渲染」注）· `§2.7` 件面数字 ⇒ 「删件 4 · 改造 **21** · 新建 2」（**F303**）· `§2.3` 行补判据指针（**F303**）· `§6.1` 锚点 ⇒ `auth/password-verify.ts:35/63/69` + 注明「不随 OIDC 退役而迁移」（**F304**）。
   **追加（F314 · T9 轮发现）**：`docs/designs/2026-09-23-m4b6-governance-console-design.md` **2 处** —— §4.4 组清单（`oidc` ⇒ `external` · 补 `user`）· §6.2 键清单（`admin['audit.group.oidc']` ⇒ `external` / `user`）。
3. **`docs/07-i18n-conventions.md`**：顺号新增 **§3.4** `login` 组落地注记 + 修订行 **v1.17**；**同笔承载 F305** 的 §3 正文两处订正（`users` 63 ⇒ **65** · `account` 13 ⇒ **12**）；头部版本行 ≤3（新增删最旧 · token 须仍可寻）。
4. **证据归档** `docs/smoke/` 下按**批日期**命名的**新证据文件**（先例 `docs/smoke/2026-10-09-m4c2.md`）：门禁链 **13 步**读数 + 逐 Task 读数 + dogfood 读数 + L7 8 项 + 四通道建号+链接判据 + F 账指针 + 提交清单。
5. **追踪行**：`docs/00-product-direction.md` §5 **M4c-3 子行**（`⬜ 待对齐` ⇒ 执行中 / 收口）+ 修订行（含本批提交清单与读数）。
6. **F 号 4 处同步**：批 design §13（F303–F306）· `docs/README` §6.1 号段 · 证据 §5 · `docs/00`。
7. **批收口自检**（18 维 · 门 ≥9）。

**断言 / 门禁**：① 门禁 **6 道**全绿（新增证据文件纳入 `doc-audit` 计数）② F 号 4 处读数**一致** ③ 头部版本行 **≤3** 且 `head-sink-coverage` **无 token 丢失** ④ `doc-claims-check` 陈旧检测绿（头部最新版 = 修订表最新版）⑤ 批收口自检 **≥9**。

**落点**：主 design · **`docs/designs/2026-09-23-m4b6-governance-console-design.md`（F314 · 追加）** · `docs/07-i18n-conventions.md` · `docs/smoke/` 下按**批日期**命名的**新证据文件**（**新** · 先例 `docs/smoke/2026-10-09-m4c2.md`）· `docs/00-product-direction.md` · `docs/README.md` · 批 design §13

---

## 4. 门禁与冒烟顺序（复现 CI · **硬规则**）

```text
bun install --frozen-lockfile → bun run typecheck → bun run lint → bun run format:check →
bun docs/smoke/scripts/doc-audit.ts → bun docs/smoke/scripts/doc-claims-check.ts →
bun docs/smoke/scripts/schema-column-check.ts →
bun docs/smoke/scripts/head-sink-coverage.ts --base <before> --head <sha> →
bun docs/smoke/scripts/table-structure-check.ts → bun docs/smoke/scripts/file-ref-closure-check.ts →
bun run build → bun run db:migrate → bun run test
```

逐项 **exit 0** 才算过；顺序**不得调换**（= `.github/workflows/ci.yml` 真序 · 本次已对照 `ci.yml` 的 `name:` 逐步核对）。
**每 Task 收尾**先跑本包 `typecheck` + `lint`（`bun run lint` 并**读 exit code** —— `bunx biome | tail` 会吞 `organizeImports` 真错，已实证）；**落地前**跑全量 **13 步**。
**服务端测试**：仓内规范命令 = `cd apps/server && set -a && . ./.env && set +a && bun test src/`（**批前基线 = 666 pass / 1 skip / 0 fail** · **T6 后重记 = 674 pass / 0 skip / 0 fail（57 文件 · 2149 expect）** —— 账 = +13 用例（T1–T5）− 删 2 测试件 9 用例（`auth/oidc.test.ts` 3 含 1 skip · `http/oidc-routes.test.ts` 6）− `env.test.ts` 4 个 OIDC 块 · **skip 归零**（唯一 skip 在被删件内）· **严禁**从仓库根跑 `bun test apps/server`（假红 131 fail，已实证））。
**dogfood**：日常用 `SMOKE_ONLY` 分段，**收尾全量**（推荐一键 `bun docs/smoke/scripts/dogfood-all.ts` · 本批后 **9 脚本**）；每段 `NO JS ERRORS` 为硬门；**提交前须通配还原被改写的证据 PNG**。

**跨平台说明（Win / macOS / Linux）**：本批为**服务端 env / provider 装配 + 前端入口渲染 + 文档**改动 —— **无平台分支**；无迁移、无路径 / 权限 / 信号 / 编码差异；三平台行为同一（批 design §5 已声明）。

---

## 5. 造数需求（**写库需用户授权**）

- **迁移 0 · 新表 0**（本批不动 `user` / `account` 任何数据）。
- **不新增常驻 seed**：复用 `m4b2-seed-roles` 三账号（`m4b2_super` / `m4b2_mgr` / `m4b2_user`）。
- **写库动作 1 处**：L6 dogfood 的**自愈 seed**（幂等复位三账号档位与封禁态 · `SMOKE_SKIP_SEED=1` 可跳；dogfood 造数会重置会话 ⇒ 探针前需重登）。
- **只读探针**：启用集端点两态 · 管理列表「—」列 · 审计分组标签 —— 沿用仓内只读查询方式，不落盘。
- **凭据**：口令与连接串一律从 `apps/server/.env` 读（`set -a && . ./.env && set +a`）· **值一律不回显、不落盘、不进仓**。

---

## 6. 风险与回退

| # | 风险 | 缓解 / 回退 |
|---|------|------------|
| 1 | **退役不可逆**（删 4 件 + 删端点 + 删错误码 + 删 env 5 键）——⚠ **删面必须与消费面同批**（T6 内一次完成 · v0.3 订正），否则中间态编译红 | git 历史即回退（本批为纯删改，无数据面）· 删前先跑判据① grep 取全命中清单存档 · **不做兼容层**（用户偏好：彻底删） |
| 2 | **provider 误配致登录不可用** | env 默认**全关** ⇒ 独立部署零影响；fail-fast 三例拒启（缺凭据 / 缺租户）；启用集由**服务端**裁决 ⇒ 前端不可能渲染未装配入口 |
| 3 | **`ENTRA_TENANT_ID` 留 `common`** ⇒ 任何 Microsoft 账号可进 | **G1 硬校验**（`ENTRA_ENABLED` 且空 ⇒ 拒启）；部署文档写明先取租户 ID；接线断言覆盖 |
| 4 | **自动链接的残余风险**（本地账号可被同邮箱第三方接管） | 官方默认**不改** + **风险显式入档**（批 design §3.4 已知风险）；收紧口 = 官方 `requireLocalEmailEnabled`（本批不采 · 代价已写明） |
| 5 | **dogfood 改库致后续假红 / 实例老化假红** | 沿 **F293 自愈范式**（脚本启动即重播 `m4b2-seed-roles`）；**红读数先归因实例健康**，同脚本重跑再判；runner 自带超时，**禁把 kill 当重试手段** |
| 6 | **文档连带面大**（主 design 8 处 + `docs/07` + 证据 + 追踪行 + F 号 4 处） | T11 集中收口 + 门禁 6 道 + token 预演（头部下沉不改内容 · 被删行 token 须仍可寻） |
| 7 | **自动建号告知缺失**（DeepSeek 有「未注册将自动注册」· 我方 `external.provisioned` 建号无告知） | 本轮**登记为后续可选**（批 design §4.6 已记 · 用户拍板「本批不做」）⇒ 不扩本批范围 |
| 8 | **Radix Select 探针坑**（本仓 Select 选项在合成 / CDP 事件下无法提交） | 本批入口已改**文字链**（`<a>` / 按钮点击）⇒ **不经过 Select**；启用集为只读展示，无下拉 |

---

## 7. 落地记录（执行期回填）

| Task | 日期 | 实测 | 门禁 | 发现 / 偏差 |
|------|------|------|------|------------|
| **T1** | 2026-10-12 | **3 件 +146 / −0**：① `config/env.ts` **+52 行**（13 键 schema 块 + **表驱动** 4 通道 fail-fast + G1 租户校验）② `config/env.test.ts` **+76 行**（**5 新用例**：默认全关 / Entra 全配 / 社交三通道全配 / 4 通道拒启 / G1）③ `.env.example` **+18 行**（新段 + 「任一启用缺凭据即拒启」「tenantId 必填」注释） | 本包 `typecheck` **EXIT=0** · `lint` **EXIT=0** · `format:check` **341 件 EXIT=0** · 靶测试 `env.test.ts` **18 pass / 0 fail**（46 expects · 13 → 18）· **全量 server 671 pass / 1 skip / 0 fail**（666 + 5 新 ⇒ **基线零漂移**）· 门禁 6 道 **275/141/3/50/37/0** | ① **plan 顺序缺陷（v0.3 订正 · 本 Task 实测照出）**：首稿把「删 `OIDC_*` 5 键」放在 T1，而其消费件 `auth/oidc.ts:57-62` 到 T6 才删 ⇒ **中间态必编译红**；已改 **+13 归 T1 · −5 归 T6**（同批约束入 §2 注 + §6 风险 1）② **进程级拒启正反双证**（3 例各 **exit=1**）：缺凭据 `ENTRA_ENABLED=true requires ENTRA_CLIENT_ID and ENTRA_CLIENT_SECRET` · **G1** 有凭据但租户空 `requires ENTRA_TENANT_ID (pin to your tenant)` · 社交缺凭据；**正例** = 全关档服务健康（`/api/meta/limits` **HTTP 200**）③ 首次实测用 `\| head` **吞了 exit code**（显 0）⇒ 去管道重测得真值 **1**（命令口径如实记）④ **未做**：`.env` 真库代入（不涉本 Task）· 凭据值一律不回显 |
| **T2** | 2026-10-12 | **2 件 +124 / −0**：① `auth/better-auth.ts` **+45 行**（`socialProviders` 四通道 **env 条件装配** · `microsoft` 带 `tenantId` · 注释含**官方键名来源** / 404 语义 / 不采 SSO 插件）② `auth/better-auth.test.ts` **+79 行**（**T2 轮补入件面**：`PROVIDER_ENV_KEYS` 逐键复位 + 只挂官方 handler 的 `minimalAuthApp`（同 `app.ts:147`）+ **3 用例**：L2 关态逐 provider 404 / L1 Entra 200 且 URL 含**本租户段** / L1 三通道各自官方端点 + 启用集隔离） | 本包 `typecheck` **EXIT=0** · `lint`/`format` **EXIT=0**（首轮 format 红 ⇒ `bun run format` 修 1 件）· 靶测试 **9 pass / 0 fail**（24 expects）· **全量 server 674 pass / 1 skip / 0 fail**（671 + 3）· 门禁 6 道 **275/141/3/50/37/0** | ① **F307 新登记（真码 ⇄ 文档不符）**：官方「provider 未装配」404 的 `code` **实测 = `PROVIDER_NOT_FOUND`**，design/plan 原写 `oauth_provider_not_found`；**正反双证** = 真服务 `curl` body `{"message":"Provider not found","code":"PROVIDER_NOT_FOUND"}` ＋ 官方源 `@better-auth/core@1.7.5` `dist` 内旧串**零命中** / 新串见 `error/codes.mjs:14` ⇒ 订正 **7 处**（design 4 + plan 3）+ README 号段 → **上界 F307**；⚠ **无行为影响**（前端**不按官方码分支** · 失败态统一走 `login.providerFailed`）② **件面漏算 1 件**：`better-auth.test.ts` 不在原件面 21 件内 ⇒ **改造 21 → 22**（design Scope / §1 ⑥ / §3.5 表 #22 / F303 两处 + plan 四处同步）③ 首轮 lint/format 红 = 我写的长行未过 biome（**非逻辑缺陷**）④ **过程事故（如实记）**：回填脚本末行误用 `open(P,'w').write(open(P).read())`（**先截断再读**）⇒ plan 工作副本被清空；已 `git checkout --` 从 HEAD（含 v0.3 + T1 全部内容）还原并重打 ⇒ **零内容丢失** ⑤ 未做：三社交通道**真跳**（端点硬编码 · 归 L7 条件项） |
| **T3** | 2026-10-12 | **2 件 +36 / −4**：① `http/meta.ts`（**既有件内加端点 · 不新建文件**）：新增 `GET /api/meta/auth-providers` + 出参类型 `AuthProviders` + **单表驱动**的 `AUTH_PROVIDER_ORDER`（`readonly [string, (env: Env) => boolean]` × 4；`filter→map` 单链，序单源）+ 头注释改写为「两端点并列」（含「官方**无** provider 清单端点 ⇒ 本仓自备」依据）② `http/meta.test.ts`：**+5 用例**（全关 ⇒ `[]` / 1·2 乱序·4 三态且**序**不受输入顺序影响 / 匿名可读 + 幂等字节恒等 / **9 个密钥哨兵串实测不出现在响应体** + 出参键集合精确 / 结构性零副作用 = 工厂入参数 0） | 本包 `typecheck` **EXIT=0** · `lint`/`format` **EXIT=0**（首轮 format 红 ⇒ `bun run format` 修 1 件）· 靶测试 **9 pass / 0 fail**（28 expects · 5 新）· **全量 server 679 pass / 1 skip / 0 fail**（674 + 5）· 门禁 6 道 **275/141/3/50/37/0** · **真服务实测** `curl /api/meta/auth-providers` ⇒ `200` `{"providers":[]}`（全关档 · 热重载已生效） | ① **LSP 拦下真错**：`meta.ts` 用了 `Env` 未导入 ⇒ 补 `import { type Env, getEnv }`（LSP 报错即修，未进 typecheck 轮）② 首轮 format 红 = 我写的长行未过 biome（非逻辑缺陷）③ **零新建文件**已验（端点落在既有 `meta.ts` 内 · §3.3 契约项）④ 未做：前端消费（取数 + 渲染）归 **T7** |
| **T4** | 2026-10-12 | **4 件 +58 / −3**：① `auth/identity.ts` **+29**（`PLACEHOLDER_EMAIL_DOMAIN` + 派生的 `PLACEHOLDER_EMAIL_SUFFIX` + **`isPlaceholderEmail`** —— 纯判定不写库 · 注释含官方真值来源与**实现口径偏差**）② `http/admin-users.ts`（**管理面出参归一** · P7 丙）：列表出参 `email: isPlaceholderEmail(u.email) ? null : (u.email ?? null)`（**零前端改动 · 零新键**）③ `auth/identity.test.ts` **+5 用例**（官方形态 / 大小写与空白 / 正常邮箱 / **相似反例**（`notplaceholder.invalid` · `placeholder.invalid.evil.com`）/ 空值族）④ `http/admin-users.test.ts`（**T4 轮补入件面**）**+1 用例**：占位账号 ⇒ 出参 `email = null` **且真值不外泄**（`JSON.stringify` 不含 `placeholder.invalid`）+ 正常邮箱原样对照 | 本包 `typecheck` **EXIT=0** · `lint`/`format` **EXIT=0**（`bun run format` 修 2 件）· 靶测试 `identity` **16/0** · `admin-users` **19/0** · **全量 server 685 pass / 1 skip / 0 fail**（679 + 6）· 门禁 6 道 **275/141/3/50/37/0** | ① **靶测试照出语义边界（已修）**：初版只认 `.placeholder.invalid` 后缀 ⇒ **裸域** `…@placeholder.invalid` 不命中（官方合成**必含 namespace**，故非真实形态）；改为**按域判定**（后缀 **或** `@<域>`）⇒ 官方形态判定结果不变，且防未来上游变形时占位真值泄漏到管理面 ⇒ **口径偏差已在 `identity.ts` 注释 + 本行显式登记** ② **LSP 两次拦下真错**：`admin-users.ts` / `identity.test.ts` 用新符号未导入 ⇒ 立即补 import（未进 typecheck 轮）③ **LSP 拦下作用域错**：初版对照用例引了 describe 内的 `created` ⇒ 改**自建对照账号**（合 PREFIX 隔离纪律）④ **件面 +1**（`admin-users.test.ts`）⇒ 改造 **22 → 23**（design §3.5 #23 / Scope / §1 ⑥ / F303 + plan 四处同步；F303 的测试件计数改**枚举式 5 件**）⑤ 未做：规范层 `docs/05` 回填（归 T11）· 前端「—」渲染（T7 验证） |
| **T5** | 2026-10-12 | **6 件**：① `audit/audit.ts` **+6**（`provisionExternal: 'external.provisioned'`）② `audit/actions.ts` **+5**（`external` 组登记）③ `auth/better-auth.ts`（`EXTERNAL_PROVIDER_IDS` 单一真源 + **`shouldRecordExternalProvision`** 纯函数判据 + **`databaseHooks.account.create.after`** 建号审计；`account`/`eq` 导入）④ `app.ts`（包装层：`/api/auth/callback/<provider>` 命中四通道 ⇒ `sessionOwnerOfSetCookie` 反查 actor ⇒ 补记 `auth.login.success` + `detail.provider`）⑤ `http/admin-users.test.ts`… 见下 ⑥ `auth/better-auth.test.ts` **+2 用例**（判据纯函数四组 / **真库真端点负例**：本地注册 ⇒ 零 `external.provisioned` 行）⑦ **`doc-claims-check.ts`** 行锚 `216 → 268`（**T5 轮补入件面**） | 本包 `typecheck` **EXIT=0** · `lint`/`format` **EXIT=0**（首轮 lint 红 = import 顺序 ×1 已修）· 靶测试 `better-auth` **11/0** · `audit/*` + 靶 **23/0** · **全量 server 687 pass / 1 skip / 0 fail**（685 + 2）· 门禁 6 道 **275/141/3/50/37/2** | ① **设计缺口（本轮补写 v0.8）**：§3.6 原未定 `external.provisioned` 的**信号来源** ⇒ 实测官方 `databaseHooks.account.create.after`（`Account.providerId` 原生在场 + `with-hooks.mjs` 全模型分派）⇒ 定案**钩子记建号 / 包装层记登录成功**；备选（`createdAt` 启发式 · `validateUserInfo` 校验缝）**未采 + 写明理由** ② **删面归位（同 T1/T2 教训）**：`oidc` 审计组 / `provisionOidc` / 2 错误码的**删除归 T6**（消费点 `oidc-routes.ts:134/149/153/155/189`）⇒ 本 Task **零删除** ⇒ 零中间红 ③ **门禁抓到真漂移**：`app.ts` 插入约 52 行 ⇒ `doc-claims-check.ts` 的 `createAdminRoutes` 行锚 `216 → 268` FAIL ⇒ 同步锚点 + 注明迁移原因（同 F224/M23 先例）⇒ **件面 23 → 24** ④ 首轮 lint 红 = `better-auth.test.ts` import 顺序（biome assist）⇒ 手工排序修正 ⑤ **残余风险（如实记）**：包装层的审计写在 `await` 链上 ⇒ 审计写失败会把成功登录变成 500 —— **与既有 `sign-out` / `device.*` 分支同形**（沿用先例，单轨）；如需加固建议单独立项 ⑥ 正例（真回调 ⇒ 建号/登录两笔审计）**归 L5/T10**（诚实标注，不伪造） |
| **T6** | 2026-10-12 | **删件 4 + 改件 26（生产 14 · 测试 8 · 文档与门禁 4）**：① **删 4 件**（`http/oidc-routes.ts` + 测试 · `auth/oidc.ts` + 测试，合计 590 行）② **env −5 键 −2 段校验**（`:69-75` · `:140-154`）+ `.env.example −8 行` ③ **收删除面**：`audit/actions.ts` 删 `oidc` 组 · `audit/audit.ts` 删 `provisionOidc` · `auth/errors.ts` 删 2 码 + 2 `case` ④ **i18n `errors` −3 键**（F309）⑤ **连带**：`app.ts`（import + `/api/auth/oidc` 挂载 11 行 + `AppDeps.cookieSecure`）· `index.ts`（该入参）· `plugins/ldap-credentials.ts` **268 → 200 行（−68）**（自绘端点 + `fail`/`issueSession`/`AuthEndpointCtx` + 4 处死码/注释腐化清零）· `identity.ts` / `admin-users.ts` / `auth-fixture.ts` / `better-auth.ts` 注释订正 · 5 测试件去 `cookieSecure` · `doc-claims-check.ts` 行锚 `268 → 255` | 本包 `typecheck` **EXIT=0** · `lint` **EXIT=0** · `format:check` **EXIT=0**（首轮 3 红均如实处置：typecheck 6 处 `cookieSecure` 残留 ⇒ 同步 5 测试件 · lint/format = import 折叠 ×1）· **服务端全量 674 pass / 0 skip / 0 fail**（57 文件 · 2149 expect）· **全仓 `bun run test` exit=0**（protocol 27/0）· 门禁 6 道 **275/141/3/50/37/0** · **判据① 代码面**：`apps/server/src` + `packages` = **0**（全仓含产物/历史 = 175 → 见 F308 口径） | ① **F308 新登记（判据口径不可执行）**：§3.7① 原写「全仓 grep ⇒ 零命中」——**实测**构建产物 `dist/`/`.turbo/` · ≥12 份历史文档 · 本批 design/plan 自身必然命中 ⇒ **范围写明**（代码面 + 活文档零命中；T6 = 服务端面 · T7 = 全代码面 · T11 = 批级）· **非放宽**（正反双证：`grep -rnE` 175 条全清单已存档）② **F309（落点漏项）**：T6 步骤/落点原未含 i18n，但出口「判据①」必然扫到 `errors` 组 3 键而生产点全在本 Task 删 ⇒ **归 T6 同批**（`errors` 69 → 66 实测）③ **F310（键账算术）**：`admin` 组实为**改名**（净 0）⇒ 批末全仓 **699**（原 698；T6 后中间值恰为 698）；**双证** = 真实 import 实测 701 键 / 16 组 + 算术④ **doc-claims 行锚本批第二次漂移**（T5 `216 → 268` · T6 `268 → 255`）⇒ 已同步 + 迁移注释；**建议批末评估改无行号断言**（未实施，登记为观察）⑤ **处置偏差（如实记）**：design §3.5 #9 写「退役 OIDC 建号断言」，实测处置 = **改标识保留断言**（`identity.test.ts` 的 provider 值 `'oidc'` ⇒ 合成值 `'external-source'`）—— 理由：⑦「建号成对」/⑪「零额外行」覆盖的是**活模块**的既有行为，删断言 = 净损覆盖，改标识同样达成「零旧义」⑥ 未做（诚实标注）：存量 `account.provider_id='oidc'` 数据行**不处理**（design 拍板「迁移 0」）· 历史审计行 `oidc.provisioned` 的 UI 标签兜底归 **T9** ⑦ **自错两处（同轮自查订正）**：件面初写「收敛 **17** 件」实为 **改件 26**（按 `git status` 逐件点数：生产 14 · 测试 8 · 文档与门禁 4）· design v0.9 头部与 §12 行一度误写 18 维 **9.54**（= T5 的分）应为 **9.51** —— 两处均按实测回改 |
| **T7** | 2026-10-12 | **5 件**：① `pages/Login.tsx`（**退役 `altMode`**：删 state / 备选面板 / 底部链接 / `OIDC_AUTHORIZE_URL` 常量；**加** provider 文字链一行 + 启用集取数 + 失败行 + 骨架链接行位；头部注释订正 **F5 缺口消解**） ② `api/meta.ts` **+28**（`fetchAuthProviders` —— 失败 ⇒ `[]`「不留死入口」· **不落持久缓存**） ③ **`api/auth.ts` +20**（`signInWithProvider` 官方社交通道封装 · 件面 #25） ④⑤ `i18n/{zh,en}.ts`（**退 4** `oidcLink`/`oidcHint`/`oidcOpen`/`backToForm` · **增 5** `provider*` + `providerFailed` · **改值 2** `subtitle`/`feature3`） | 本包 `typecheck` **EXIT=0** · `lint`/`format:check` **EXIT=0**（首轮 3 红 = 手写缩进 + import 排序 ⇒ `biome check --write` 5 件修）· **web `build` EXIT=0**（全仓 4 任务成功）· **真页实测十断言全绿**（隔离实例 `:3100` API + `:5174` web · CDP）· 门禁 6 道 **275/141/3/50/37/0** · **判据① 全代码面 = 0**（T6 余 2 行已清 ⇒ **F308 的 T7 出口达成**）· i18n **699**（login 17 / errors 66 / 双向差集 0）| ① **实测读数（真页面 · 非原型）**：链接行 **336×19.5** · 内容宽 **ZH 249.77 / EN 294.30**（逐项宽 87/43/42/26 · 110/43/42/48 —— 与 design §4.1 原型预测**逐项一致**）· 竖线 **1×12** `rgb(227,234,246)` = `--border` `#e3eaf6` · 间距 **16.00**（其余段 22）· 链接档 13px / rgb(100,116,139) / underline / offset 4 · 列高 关 **265.5** / 开 **301** ② **F311 新登记（骨架 5px 跳动 · 真页照出）**：骨架 **296** vs 真列 **301** —— ① 标题/副标题占位档 `h-8`/`mt-2 h-4` ≠ 真实文本盒 `h-9`/`mt-1`/**19.5** ⇒ −3.5 ② 链接行位 `h-[18px]` ≠ 真实行盒 **19.5** ⇒ −1.5；**M4b-2 期遗留**（原型手写 HTML 对齐故未暴露）⇒ **就地修正** ⇒ 复测 **开 301 = 301 · 关 265.5 = 265.5** ③ **件面 24 → 25**：`api/auth.ts`（SDK 客户端 `authClient` 为件内私有 ⇒ 页面须经件内函数，不自行 `fetch`）④ **判据① 全代码面归零**（余 2 行 = `Login.tsx` 头部注释，本轮随入口改写清除）⑤ **误配降级实测**：页面（开态）→ 服务端切全关 → 同页点击 ⇒ 服务端日志 `Provider not found…{ provider: "github" }` ⇒ 前端落 `login.providerFailed`（**+8px 落链接行之下**）且**表单错误同屏清零**（互斥）· URL 不跳 ⑥ **导入期事故（如实记）**：首版试「改 `.env` + 触发热重载」切通道 —— **实测无效**（`bun --watch` 不重读 `.env`）⇒ 改走**隔离实例**（`:3100` API + `:5174` web 临时配置），**全程未动用户实例**（`:3000`/`:5173` 保持关态）· `.env` 已备份并按 **sha256 反证还原** · 临时 vite 配置**已删**（`git status` 无残留）⑦ **未做（诚实标注 · 归 T10）**：`m4b2-ui-redo-assertions.ts` 的 `A10`/`A10b`（`:344-348`/`:360`）与 A8 debug 字段（`:279`）仍读旧 `altMode` 形态 ⇒ **本 Task 后该脚本处于「已知过渡态红」**，按 §3 T10 步骤 4 一并回改（**不留恒红**）|
| **T8** | 2026-10-12 | **1 件（零行为改动）**：`components/ui/UserMenu.tsx` —— 加「**本序不可调换**」注释（讲清 401 分流与 `await refresh()` 的相对位置）+ 头部注释订正（把「登出链」描述从「`refresh()` → `navigate()`）改为真实契约序并指向 **F312**） | 本包 `typecheck` **EXIT=0** · `lint` / `format:check` **EXIT=0** · **`m4b2-auth` dogfood 单跑**（runner 自管 `:9333` · 前置换算 + 造数 + 脚本）· 门禁 6 道 **275/141/3/50/37/0** | ① **F312 新登记（本轮最重要发现 · 计划项方向错误）**：§3 T8 步骤 1 的「调序 ⇒ 落点确定」**与实测相反** —— **原序 5/5 落 `/`** / **调序后 5/5 落 `/login?next=%2Fdashboard%2Fassets`**；根因 = 401 分流（`AuthProvider.tsx:116-119`）与 `await refresh()` 的相对位置。⇒ **不采纳调序**（**零代码改动**）· plan T8 步骤/断言/§2 出口 + design §2.2 Q3 甲 / §13 F298 行 / R16 留痕**全部就地订正** ② **F298 关账（口径改写）**：原口径「`navigate` 在 `refresh()` 之后 ⇒ **竞态窗正在此处**」**被实测否证**（原序末跳确定落 `/`）⇒ 关账依据改为「**正证 5/5 落 `/` + 反证无 `/login` 留驻**」；历史那 1 次落 `/login`（2026-10-10 · **换断言前**）与本轮 5 次+当时 3 次（共 8 次）落 `/` 的差异，**归因为「旧口径下的观测口径差异」而非执行序竞态**（如实记） ③ **探针方法（可复现）**：真页 UI 真登录（口令只从 `apps/server/.env` 读 · 不回显）→ 受保护路由 `/dashboard/assets` → **真鼠标点击**用户菜单 → 点「登出」→ 50ms 间隔采样 60 次记录 `pathname+search`；**改序反证** = 临时还原为原序/调序两态各跑 5 次（跑完即还原 · 文件 sha 反证） ④ **未做**：`m4b2-ui-redo-assertions.ts` 仍为 T10 归口的过渡态红（T7 已登记）· 全量 9 脚本 dogfood 归 T10 |
| **T9** | 2026-10-12 | **4 件**：① `pages/AdminAudit.tsx`（**组标签分支 `'oidc'` ⇒ `'external'`** + **补 `'user'` 分支**（F313）· 头注释组数订正 ⇒ 10 个标签分支）② `i18n/zh.ts`（`audit.group.oidc` ⇒ `audit.group.external`「外部身份源」· 新增 `audit.group.user`「用户」）③ `i18n/en.ts`（同名 ⇒「External」·「Users」）④ `pages/AdminUsers.tsx`（**+2 行注释 · 零逻辑改动** —— 讲清「—」来源 = 服务端出参归一） | 本包 `typecheck` **EXIT=0** · `lint` / `format:check` **EXIT=0** · `build` **EXIT=0** · 门禁 **275/141/3/50/37/2**（head-sink 2 PASS） | ① **F313（本轮发现）**：`user` 组**无分组标签**（M4c-2 遗留）⇒ 双语实测显示裸 `user` ⇒ 顺手补（**用户拍板**）⇒ 键账 **699 → 700** ② **F314（本轮发现）**：M4b-6 批 design §4.4 / §6.2 仍列 `oidc` 组与键名 ⇒ **订正归 T11**（落点已补）③ **断言① 真库实测**（1 行临时造数 · 用完即删）：出参 `email: null` · 不泄露占位串 · 真页显「—」 ④ i18n 真 `import`：全仓 **700** / 16 组 / 双向差集 **0** · `admin` 组 **98 → 99** ⑤ 真库只读：历史 `oidc.*` 审计行 **0** ⇒ 无存量残留（拍板「存量数据不处理」**无实际待办**）|
| **T10** | — | — | — | — |
| **T11** | — | — | — | — |

### 7.1 逐 Task 自检打分位（标准档 **18 维** · A×0.40 + B×0.30 + C×0.30 · 门 ≥9）

（实现期每 Task 收尾按此表打分并就地填写；A 基础 4 维 · B 深度 4 维 · C 工程 10 维 —— 口径见 `self-review-scoring`）

| Task | A（4 维） | B（4 维） | C（10 维） | 合计 | 备注（扣分项） |
|------|:--:|:--:|:--:|:--:|------|
| T1 | 9.53 | 9.47 | 9.54 | **9.51** | B2 9.4（未覆盖大小写 / 多租户数组等**非设计范围**边界）· B4 9.4（配置错误即拒启 · 无 fallback 概念 = 设计意图）· C9 9.4 / C10 9.4（规范层 `docs/05` 与错误恢复口径回填归 T11） |
| T2 | 9.55 | 9.50 | 9.56 | **9.54** | B4 9.4（未装配路径无 fallback = 设计意图）· A4 9.5（官方错误体原样透传）· C9 9.5（本轮文档订正 = F307 已同批完成） |
| T3 | 9.55 | 9.58 | 9.60 | **9.57** | A4 9.4 / C3 9.4 / C10 9.4（只读白名单端点**无错误路径与 I/O** ⇒ 维度不适用，如实记低）· C9 9.4（规范层回填归 T11） |
| T4 | 9.53 | 9.53 | 9.55 | **9.53** | A4 9.4 / B4 9.4 / C3 9.4 / C10 9.4（纯判定 + 出参映射，**无错误路径与降级语义** ⇒ 维度不适用，如实记低） |
| T5 | 9.53 | 9.53 | 9.57 | **9.54** | A4 9.4 / B4 9.4 / C10 9.4（**审计写失败会阻断成功登录** —— 与既有分支同形 · 沿用先例，风险已登记）· C3 9.5 |
| T6 | 9.53 | 9.50 | 9.50 | **9.51** | A3 9.4（**破坏性**：env 5 键 + 自绘 3 端点退役 —— 属设计拍板的「彻底删」，非意外破坏；类型面已同步 5 测试件 + `index.ts`）· A4 9.5（删除面收敛无悬空码）· B2 9.4（未装配 provider / 历史 `oidc.provisioned` 审计行的 UI 兜底属 T9 · 存量数据行不处理 = 拍板口径）· B4 9.4 / C10 9.4（纯删任务**无降级与错误恢复语义** ⇒ 维度不适用，如实记低）· C5 9.4（**删 2 测试件 9 用例、零新增断言** ⇒ 覆盖面净减）· C8 9.4（部署面破坏性 + `.env` 残留 `OIDC_*` 被 zod **静默忽略**无告警 —— 既有非 strict 行为，非本轮引入）· C9 9.6（design v0.9 + plan v0.9 + F308–F310 + README 号段同批；规范层回填归 T11） |
| T7 | 9.55 | 9.53 | 9.53 | **9.54** | A3 9.5（退役 `altMode` + 4 i18n 键属拍板；`api/auth.ts` 件面 +1 已同步）· C3 9.4（前端**无法区分**「未启用 vs 不可达」—— 设计明确不做预探测，如实记低）· C5 9.5（**无新增自动化脚本**（L6 dogfood 归 T10）；本轮为真页 CDP 手跑十断言）· C8 9.5（未复跑 `m4b2` UI 脚本 ⇒ 其 `A10/A10b` 已知过渡态红，归 T10）· B2 9.4（未知 provider id / 超长文案换行 未实测）· C9 9.6（design v1.0 + plan v1.0 + F311 + 件面同步） |
| T8 | 9.60 | 9.53 | 9.56 | **9.57** | A1 9.6（正反双证实测 · 末跳确定）· A4 9.6（注释把「为何不能调序」写进代码 = 防回归）· B4 9.4 / C10 9.4（本轮**无降级/错误恢复语义**改动 ⇒ 维度不适用，如实记低）· C5 9.5（**无新增自动化脚本**；探针为真页手跑，L6/L7 归 T10/T11）· C8 9.5（未复跑 `m4b2-ui-redo-assertions` ⇒ 其过渡态红归 T10）· C9 9.6（design v1.1 + plan v1.1 + F312 + Q3/F298/R16 四处订正） |
| T9 | 9.58 | 9.53 | 9.54 | **9.55** | A4 9.5（未知前缀兜底 / 超长动作名换行未实测）· B4 9.4 / C10 9.4（本轮**无降级与错误恢复语义**改动 ⇒ 维度不适用，如实记低）· C3 9.5（前端仍无法区分「已知组未渲染 vs 未知前缀」—— default 兜底为设计口径）· C5 9.5（**无新增自动化断言**；本轮 = 真页双语 + 真库 + 真 API 手跑 4 类实测）· C8 9.4（未复跑 `m4b2-ui-redo-assertions` ⇒ 其 `A10/A10b` 已知过渡态红归 T10；`build` 已跑）· C9 9.6（design v1.2 + plan v1.2 + F313/F314 + README 号段同批） |
| T10 | — | — | — | — | — |
| T11 | — | — | — | — | — |

---

## 8. 自检打分（plan 首稿）

| 维度 | 分 | 依据 |
|------|:--:|------|
| 完整性 | 9.4 | 11 Task 覆盖批 design 全部十项目标（env → 装配 → 端点 → 共享模块 → 审计 → 退役 → 入口 → 登出 → 管理面 → 验证 → 收口）；每 Task 三段齐（步骤 / 断言与门禁 / 落点）；**待**实现期回填落地记录 |
| 一致性 | 9.4 | 每 Task 标「依据 = 批 design §X (+ 主 design §Y)」；件面 **删 4 / 改造 24 / 新建 2** 与 design 一致（T2/T4/T5 轮各 +1）；i18n **16 → 17 / 701 → 698** 与 design §4.4 同源；**判据① grep 集合逐字取自 design §3.7** |
| 清晰度 | 9.4 | Task 总览表（前置 / 出口）+ 明细编号步骤；**安全窗写明理由**（端点先于页面 · 退役置于装配之后） |
| 可实施性 | 9.4 | 落点逐文件（含新件标「新」）；断言到**命令 / 选择器 / 数值级**（1×12 · 16px · 250/294/336 · 零跳动 · NO JS ERRORS）；**零待拍项** |
| 设计纯粹性 | 9.5 | 零新自绘端点 · 零迁移 · 零新表；唯一新增视觉值 = 1 个间距（16px）；退役彻底（不做兼容层）；非目标 11 项**明确说不** |
| 边界覆盖 | 9.4 | 0/1/N 启用集 · 未装配 404 · 两条错误互斥 · 骨架零跳动 · 换行边界（ZH/EN） · 幂等二次登录 · grep 归零 · 基线重记 · 假 issuer 的 `issuer` 校验 |
| 实施精度 | 9.4 | 真码行锚（`Login.tsx:46/90-91/160-172/174-218/222-231/223`）· 官方入参与行号 · 落点 24 件逐条 · 门禁 13 步照 `ci.yml` 真序 |
| 跨平台 | 9.5 | 无平台分支（服务端 env + 前端件 + 文档）⇒ Win / macOS / Linux 行为同一 |

**标准 4 维 9.40 ｜ 深度 4 维 9.45 ｜ 综合 9.43** —— 满足开工门（≥9 ✓）
> 口径：本轮为 **plan 首稿自评**（未经声明核验轮）；残余待定项 **0**（design 侧已 grilling 两轮 + UI 逐条 + v0.5 翻转全部定案）。**未覆盖且已归他处**：逐 Task 18 维自检 → §7.1（实现期回填）· 实测读数 → 证据 `docs/smoke/` 下按**批日期**命名的**新证据文件**（先例 `docs/smoke/2026-10-09-m4c2.md`）（T11 归档）。

### 8.1 声明核验轮重评（v0.2 · 2026-10-12 · 用户「开始plan」轮内自检）

**方法**：同 design 核验轮 —— 对 plan 内**可回读声明**逐条实测（不手读、跑探针）。

| 检查面 | 条数 | 命中 |
|--------|:--:|------|
| 行锚 / 真码引用（`Login.tsx` 7 · `UserMenu.tsx` 2 · `AdminUsers.tsx` 1 · `AdminAudit.tsx` 1 · `errors.ts` 4 · `audit/actions.ts` 1 · `audit/audit.ts` 1 · `ldap-credentials.ts` 1 · `app.ts` 1 · `m4b2-ui-redo-assertions.ts` 2） | 20 | **3 ❌**（承 design）：`audit/actions.ts` oidc 组实测 **`:52-55`**（写 `:51-54`）· `AdminUsers.tsx` 兜底实测 **`:297`**（写 `:298`）· F298 引用漏记 `{replace: true}` 且未写**真实执行序** ⇒ 三处已订正（design 就地 + plan 同步） |
| 落点文件存在性（服务端 10 · 前端 4 · 脚本 2） | 16 | 全 ✅（`meta.ts` **34 行** · `meta.test.ts` 75 · `identity.ts` 224 · `identity.test.ts` 325 · `env.ts` 147 · `env.test.ts` 118 · `better-auth.ts` 315 · `auth-fixture.ts` 205 · `admin-users.ts` 624 · `web/api/meta.ts` 51 · `dogfood-all.ts` 396 · `m4b2-ui-redo-assertions.ts` 949 · `.env.example` 60 · 待删 2 件在场） |
| 数字 / 内部自洽（i18n `16 → 17` / `701 → 698` · 件面 删 4 / 改造 **24**（T2/T4/T5 轮各 +1） / 新建 2 · 门禁 13 步 · dogfood 8 → 9 · 基线 666/1/0） | 5 | 全 ✅（i18n 算术用工具复算；门禁 13 步与 `.github/workflows/ci.yml` 的 `name:` 逐步核对；基线 666/1/0 取自 M4c-2 终态读数） |
| 探针自身 | — | **2 处假警报**（把 `Login.tsx:172` 的 `) : (` 与 `audit/audit.ts:12` 的注释行当失败）⇒ 如实记录、doc 正确、**不改文档** |

**门禁自抓（本轮 · 首轮红 → 已修）**：plan 首稿在 T11 落点**写了尚未存在的证据文件路径**（按批日期命名的那份 · **T11 才归档**）—— ⚠ **连本节留痕里的字面路径也会被扫**（复跑时本轮第二次 FAIL 即出在此）⇒ `doc-audit` **FAIL［B］死路径 2 处**。处置 = 照**仓内先例写法**（M4c-2 T8）改为「`docs/smoke/` 下按**批日期**命名的**新证据文件**（先例 = **已存在**的 `docs/smoke/2026-10-09-m4c2.md`）」⇒ 复跑 **275/0 绿**。教训入档：**plan 不得引用本批尚未产出的路径**，改用「命名规则 + 已存在先例」表述（证据文件在 T11 归档后才可具名引用）。

**核验附带改进**：① T8 措辞精确化到「**当前序 → 目标序**」（当前 = `invalidateCache → refresh → navigate`；目标 = `invalidateCache → navigate → refresh`）—— 直接读真码得出，**比 design 原措辞更准** ② T9 明确本页**零前端逻辑改动**（服务端归一后既有兜底生效）已由真码回读坐实。

| 维度 | v0.1 自报 | 核验后 | 变动理由 |
|------|:--:|:--:|---------|
| 完整性 | 9.4 | **9.5** | 44 条声明**逐条实测可回读** + 新增本节 |
| 一致性 | 9.4 | 9.4 | ⬅ 本轮实测扣：3 处锚点承 design 偏差（已双向订正）；plan ↔ design ↔ 真码三向现已一致 |
| 清晰度 | 9.4 | 9.4 | 断言仍到命令级；T8 加「当前序 / 目标序」后更明确 |
| 可实施性 | 9.4 | **9.5** | T8 目标序逐字给出（`{replace:true}` 已在场 ⇒ **只动顺序**）；锚点全对；**零待拍项** |
| 设计纯粹性 | 9.5 | 9.5 | 不变（零迁移 / 零新表 / 唯一新增视觉值 1 个间距） |
| 边界覆盖 | 9.4 | 9.4 | 不变 |
| 实施精度 | 9.4 | **9.5** | 20 条行锚逐条回读真码修正后**全部命中** |
| 跨平台 | 9.5 | 9.5 | 不变 |

**标准 4 维 9.45 ｜ 深度 4 维 9.475 ｜ 综合 9.46** —— 满足开工门（≥9 ✓）
> 口径：**撤回** v0.1 自报的 9.43（自报未经核验）；9.46 = 核验后可复查分数。残余待定项 **0**。未覆盖且已归他处：逐 Task 18 维自检 → §7.1（实现期回填）· 实测读数 → 证据（T11 归档）。

---

## 9. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.2 | 2026-10-12 | **T9 落地（管理面连带）+ F313 顺手补 + F314 归 T11** —— ① 4 件（`AdminAudit.tsx` 分支改名 + 补 `user` · i18n 改名 + 新增 · `AdminUsers.tsx` 注释）② 真页双语实测（9 组含 `external` / 无 `oidc` · 「外部身份源」/「用户」·「External」/「Users」）③ 断言① 真库实测（1 行临时造数 · 用完即删）④ 键账 **699 → 700**（F313）⑤ 门禁 275/141/3/50/37/2 · 三绿 + build · 18 维 **9.55** |
| v1.1 | 2026-10-12 | **T8 落地（登出链实测复核）· F298 关账 + F312 反证（不采纳调序）** —— ① **F312**：±调序实测**相反**（原序 `/` 5/5 · 调序后 `/login?next=…` 5/5；根因 = 401 分流与 `await refresh()` 的相对位置）⇒ **零行为改动** + 「本序不可调换」注释 ② **F298 关账**：正证 5/5 落 `/` + 反证无 `/login` 留驻（60×50ms）· 旧口径「竞态窗在 navigate 之后」**被否证** ③ 件面**仍 25** · 门禁 **275/141/3/50/37/0** · **T8 自检 18 维 = 9.57**（§7.1）|
| v1.0 | 2026-10-12 | **T7 落地（登录页入口 · 退役 `altMode` · 真页十断言全绿）+ 件面 24 → 25 + F311** —— ① 5 件（`Login.tsx` / `api/meta.ts` / **`api/auth.ts`** / i18n ×2）② 真页实测：**ZH 249.77 / EN 294.30** · 竖线 **1×12** & `--border` · 间距 **16.00** · 骨架 **301 = 301 / 265.5 = 265.5** · 误配 **+8px** + 互斥 · **0 JS errors** ③ **F311** 骨架 5px 跳动修正（M4b-2 遗留）④ 判据① **全代码面归零** · i18n **699 坐实 F310** ⑤ build/typecheck/lint/format 全绿 · 门禁 **275/141/3/50/37/0** · **T7 自检 18 维 = 9.54**（§7.1）|
| v0.9 | 2026-10-12 | **T6 落地（自绘 OIDC 全链退役 · 删件 4 · 服务端面判据① 归零）** —— ① **删 4 件** + env **−5 键/2 段校验** + `oidc` 审计组 + `provisionOidc` + 2 错误码 + **i18n `errors` −3 键**（F309）② 改件 26（生产 14 · 测试 8 · 文档与门禁 4）（`app.ts` 含 **`AppDeps.cookieSecure` 死参** · `index.ts` · `ldap-credentials.ts` 268 → 200 · 5 测试件 · `doc-claims-check` 行锚 `268 → 255`）③ **判据① 代码面**：`apps/server/src` + `packages` = **0**（余 2 行属 T7 件）· **F308 口径写明** ④ 服务端全量 **674/0/0**（57 文件 · 重记基线）· 门禁 **275/141/3/50/37/0** · 三绿 ⑤ **F310** 键账订正（批末 **699**）⑥ **T6 自检 18 维 = 9.51**（§7.1）|
| v0.8 | 2026-10-12 | **T5 落地（审计 external 组 + 建号/登录补记 · 只加不删）** —— ① `audit/audit.ts` + `audit/actions.ts`：`external.provisioned` 动作 + 组登记 ② `auth/better-auth.ts`：`EXTERNAL_PROVIDER_IDS`（单一真源）+ `shouldRecordExternalProvision`（纯函数判据）+ **`databaseHooks.account.create.after`** 建号审计 ③ `app.ts`：包装层命中 `/api/auth/callback/<provider>` ⇒ `sessionOwnerOfSetCookie` 反查 actor ⇒ 补记 `auth.login.success`（`detail.provider`）④ 靶 `better-auth` **11/0** · `audit/*` 靶 **23/0** · 全量 **687/1/0** · 门禁 **275/141/3/50/37/2**（含 `doc-claims-check` 行锚 `216 → 268` 同步）⑤ **件面 23 → 24**（补 `doc-claims-check.ts`）⑥ **T5 自检 18 维 = 9.54**（§7.1） |
| v0.7 | 2026-10-12 | **T5 轮：删面归位 + 写入点定案** —— ① `oidc` 审计组 / `provisionOidc` / 2 错误码**删除归 T6**（消费点同批删 · T5 **只加不删**）② `external.provisioned` 写入点 = 官方 `account.create.after`（`providerId` + 「无其他 account 行」判据）· `auth.login.success` = 包装层（响应 `Set-Cookie` → token 查库）③ T5 断言改**四组可自动化** |
| v0.6 | 2026-10-12 | **T4 落地（占位邮箱识别 + 管理面出参归一）** —— ① `identity.ts` 加 `isPlaceholderEmail`（按域判定 —— 后缀 **或** `@域` · 含官方真值来源注释与口径偏差登记）② `admin-users.ts` 列表出参归一（P7 丙 · 零前端改动）③ 靶 `identity` **16/0** · `admin-users` **19/0** · 全量 **685/1/0** · 门禁 **275/141/3/50/37/0** ④ **件面 22 → 23**（补 `admin-users.test.ts`）⑤ **T4 自检 18 维 = 9.53**（§7.1） |
| v0.5 | 2026-10-12 | **T3 落地** —— `GET /api/meta/auth-providers`（匿名只读启用集 · 出参 `{providers: string[]}` 逐字） · 单表驱动序 · 落在既有 `meta.ts` 内**不新建文件**）+ **5 用例**（全关/多态序/匿名幂等/**密钥哨兵不出参**/结构性零副作用）· 靶 **9/0** · 全量 **679/1/0**（674 + 5）· 门禁 **275/141/3/50/37/0** · 真服务 `200 {"providers":[]}` · **T3 自检 18 维 = 9.57**（§7.1） |
| v0.4 | 2026-10-12 | **T2 落地 + F307 登记 + 件面订正** —— ① **T2 实测**：2 件 +124 · 靶 **9/0** · 全量 **674/1/0**（671 + 3）· 门禁 **275/141/3/50/37/0** ② **F307**（官方 404 `code` 真值 = `PROVIDER_NOT_FOUND`）⇒ 订正 7 处 + README 号段（上界 → **F307**）③ **件面 21 → 22** ④ **T2 自检 18 维 = 9.54**（§7.1）· ⑤ 回填事故已还原（零丢失） |
| v0.3 | 2026-10-12 | **T1 落地 + 顺序订正** —— ① **同批约束订正**：`OIDC_*` 5 键**删面归 T6**（消费件 `auth/oidc.ts` 同批删 ⇒ 避免中间态编译红）· `+13` 归 T1（§1 目标 #1 / §2 注 / §3 T1 步骤 2 / §3 T6 步骤 1b / §6 风险 1 五处同步）② **T1 实测**：3 件 +146/−0 · 靶 **18/0** · 全量 **671/1/0**（基线零漂移）· 门禁 **275/141/3/50/37/0** · 进程级 3 例拒启 **exit=1** + 全关档 200 ③ **T1 自检 18 维 = 9.51**（A 9.53 · B 9.47 · C 9.54 · §7.1） |
| v0.2 | 2026-10-12 | **声明核验轮** —— 44 条声明逐条实测（20 行锚 / 16 件存在性 / 5 数字自洽 / 2 探针假警报）；3 处锚点与引用偏差双向订正（承 design · **design 已就地同步**）；T8 当前序→目标序；**首稿死路径引用 → doc-audit FAIL 已修**（照仓内先例）；新增 §8.1；**8 维 9.46**（v0.1 = 9.43 · 已撤回自报）· 门禁 **275/139/3/49/37/0** |
| v0.1 | 2026-10-12 | **首稿** —— 11 Task 全覆盖（T1 env 契约 → T2 装配 → T3 启用集端点 → T4 共享模块 → T5 审计与错误码 → T6 自绘 OIDC 退役 → T7 登录页入口 → T8 登出链 → T9 管理面连带 → T10 验证 → T11 文档收口 + L7）；承批 design **v0.5**（8 维 9.69 · 提交 `d8b8184`）；零迁移 · 零新表 · 零新自绘端点 · 唯一新增视觉值 16px；门禁 13 步照 `ci.yml` 真序；§8 首稿自评 **9.43** |
