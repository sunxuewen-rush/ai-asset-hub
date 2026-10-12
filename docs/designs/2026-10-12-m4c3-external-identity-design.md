# M4c-3 外部身份源接入 · 批设计（社交 provider + 官方内置 Entra ID + 账号链接统一 + 登录页入口）

> Date: 2026-10-12
> Updated: 2026-10-12（**v0.8：实现期 T5 轮 —— 设计缺口补写（写入点定案）+ 件面 23 → 24** —— §3.6 原未定「建号信号来源」⇒ 实测官方 `databaseHooks.account.create.after`（`Account.providerId` 原生在场）+ `with-hooks.mjs` 全模型通用 ⇒ 定案 **钩子记建号（providerId ∈ 四通道 且 该用户无其他 account 行）/ 包装层记登录成功（响应 Set-Cookie→token 查库）**；备选（`createdAt` 近因启发式 · `validateUserInfo` 校验缝）**未采**并写明理由；**删除面（oidc 组 / 2 错误码）归 T6**（消费点 `oidc-routes.ts:134/149/189` 同批删）· **件面 23 → 24**：`docs/smoke/scripts/doc-claims-check.ts` 的 `app.ts` 行锚随本轮插入漂移 `216 → 268`（同 F224/M23 先例）· 8 维 **9.69 不变**）
> Updated: 2026-10-12（**v0.7：实现期 T4 轮订正（件面 22 → 23）** —— ① **件面 +1**：`http/admin-users.test.ts` 补入（T4 轮的「占位邮箱出参归一」用例落点）⇒ **改造 23 件**（Scope / §1 ⑥ / §3.5 表 #23 / F303 两处同步；F303 的「含测试 N」改为**枚举式**测试件 5）② 同轮实现见批 plan v0.6（T4）· 8 维 **9.69 不变**（计数订正不改设计实质））
> Updated: 2026-10-12（**v0.6：实现期 T2 轮订正（F307 + 件面 22）** —— ① **登记 F307**：官方「provider 未装配」404 的 `code` **实测 = `PROVIDER_NOT_FOUND`**（原写 `oauth_provider_not_found` · **正反双证**：真服务 body ＋ 官方源 `error/codes.mjs:14`，旧串在 dist 内**零命中**）⇒ §3.6 / §3.7④ / §6 L2 / §6 L7③ **四处订正**；⚠ **无行为影响**（前端不按官方码分支，失败态走 `login.providerFailed`）② **件面 21 → 22**（补 `auth/better-auth.test.ts`：**L1/L2 单测落点** · §3.5 表 #22 · Scope / §1 ⑥ / F303 同步）③ 8 维 **9.69 不变**（本轮为**纠错**，设计实质未变；偏差已由 F307 承接））
> Status: **定稿**（2026-10-12 · grilling **G1–G12** + **UI 逐条评审 P1–P13** + **v0.5 入口形态翻转 P14–P17** 全部定案 · 8 维 **9.69**（标准 9.72 · 深度 9.65 · §11.6）· **v0.6–v0.8 实现期订正（F307 · 件面 21 → 23 · §3.6 写入点定案）** · **门 ≥9 ✓** · 实现细则落批 plan）
> Scope: env 契约（**+13 / −5** 键）· `auth/better-auth.ts` 装配 4 provider（`microsoft` / `google` / `github` / `wechat`）· 只读启用集端点 `GET /api/meta/auth-providers` · 占位邮箱识别（`.placeholder.invalid`）· 登录页 provider 文字链一行（**无「或」分隔线**）+ 降级 · 自绘 OIDC 全链退役（**删件 4 · 改造 24 · 新建 2**）· 登出落点确定化（**F298** 关账）

## 1. 目标与非目标

| 类 | 项 |
|----|----|
| **目标（本批交付）** | ① env 契约 **+13 键**（企业通道 4 + 社交三通道 9）· **删 5 键**（`OIDC_*`）② `auth/better-auth.ts` 装配 4 provider（官方内置 `microsoft` 含 `tenantId`，不采 SSO 插件 / 不走 `genericOAuth`）③ 只读启用集端点 `GET /api/meta/auth-providers` ④ 占位邮箱识别（共享模块唯一实现处）⑤ 登录页 provider **文字链一行**（**退役 `altMode`** · 无「或」分隔线）+ 降级 ⑥ 自绘 OIDC 全链退役（删件 4 / 改造 **24** / 新建 2：两个 smoke 脚本）⑦ **等价完成判据**（补主 design 缺口 · §3.7）⑧ 登出落点确定化（F298 关账）⑨ 审计动作 `external.provisioned` 替代 `oidc.provisioned` ⑩ 文档订正（F303–F306） |
| **非目标（明确不做）** | 准入策略（主 design §2.6 **D5** 保留不实现）· 管理员重置密码 · 资产面 · **SAML** · 旧自绘 OIDC 兼容层（**彻底删**，不做并行兼容）· **连通性预探测 / 入口禁用**（Q2 备选 A 未采）· 官方 SSO 插件 / `genericOAuth`（主 design §2.6 R4）· 邮件服务（本仓无）· **存量外部身份数据迁移**（**迁移 0** —— 本批不动 `user` / `account` 任何数据）· 管理员删除外部身份行（无入口） |

## 2. 批内对齐拍板结果

### 2.1 承主 design（已拍定 · 不重议）

| 项 | 定案 | 主 design |
|----|------|-----------|
| U1 provider 开关范式 | env 驱动 · 默认关闭 + **逐 provider 开关**（同 `OIDC_ENABLED` / `LDAP_ENABLED` 范式） | §5.1 |
| U3 占位邮箱口径 | `.placeholder.invalid` 占位 + `emailVerified:false` · 跳过邮箱唯一性 · UI 显「—」· **不参与自动链接** | §2.6 R11 · §3.4 |
| U5 退役面 | 彻底删 `oidc-routes.ts` + 端点 `signInAihOidc` + 错误码 `auth.oidc_state_mismatch` / `auth.oidc_denied` + `oidc_state` cookie 处理 + 相关测试 | §5.2 · §8 |
| U8 准入策略 | 不动（`ACCESS_POLICY` 保留不实现） | §2.6 D5 |

### 2.2 本批 Q1–Q4 定案（2026-10-12 · 用户「按推荐来」逐条确认）

| # | 议题 | 拍板 | 代价 |
|--:|------|------|------|
| Q1 | 登录页入口构成 | **退役 `altMode`**（整页备选态）⇒ 落 R13 形态：表单下方 provider **文字链一行**（v0.5 定形 · 无「或」分隔线）；底部文本链接与备选态块一并删 | **删 4 处 · 合计 26 行**（实测行区间 `:46` · `:90-91` · `:160-172` · `:222-231`）· 新增块行数留实现期实测；连带 M4b-2 证据脚本 2 条断言（§5） |
| Q1-R3 | 入口排列（**v0.5 订正** · 原 2 列网格已废 · 见 §4.6） | ~~2 列网格~~ ⇒ **一行文字链**：项间 **1×12 CSS 竖线** · **1 项无竖线** · **按启用集条件渲染**（0 启用 ⇒ 链接行**整体不渲染**） | 无（**零新件** · 唯一新增值 = 间距 16px） |
| Q2 | 降级表现 | **混合式**：渲染期取**只读启用集** + 点击期**不做连通性预探测** | +1 只读端点（件面订正见 §3.5） |
| Q2-R3 | 失败落点形态 | ⚠ **已被 G3 订正**（见 §14）：原「新标签页 + 可关」⇒ 现为**同页跳转**（SDK 默认跳；回调即登录态，**顺带消 F5 缺口**） | 需 **1 条失败文案键**（`login.providerFailed`） |
| Q3 | F298 登出落点 | **甲：统一落 `/`**（调序：先 `navigate('/')` 离开受保护路由，再 `refresh()`）+ **探针正反双证** | `UserMenu.tsx` 一处调序；F298 关账 |
| Q4 | 测试策略 | **分层 L1–L7**；L5 仅 **Entra** 可做假 issuer 全流程；L6 dogfood 在**默认（全关）态**覆盖「关闭态渲染 + 误配降级」；**L7 手工实测纳入本批验收** | 三社交通道真跳不被自动化覆盖（§6 诚实标注） |

### 2.3 写入级契约（C1–C4 · 2026-10-12 定案）

| # | 契约 | 定案 |
|--:|------|------|
| C1 | 批 design 文件名 | `docs/designs/2026-10-12-m4c3-external-identity-design.md`（主题名承主 design §2.3） |
| C2 | env 键名 | `ENTRA_*`（企业通道，对齐 `OIDC_*` 范式）+ `SOCIAL_<PROVIDER>_*`（社交三通道）；`*_ENABLED=true` 缺 `_CLIENT_ID` / `_CLIENT_SECRET` ⇒ **拒绝启动** |
| C3 | 只读启用集端点 | `GET /api/meta/auth-providers` → `{ "providers": string[] }`（值 = 官方 provider 键名，序 = 界面入口序） |
| C4 | F 号 | 新号 **F303** 起编（F 账上界 F302 已冻结 · `docs/README` §6.1「下一批行起续编」） |

> **grilling 定案见 §14**（G1–G12）· **UI 定稿见 §4.6**（P1–P13 + **v0.5 P14–P17**）· 8 维重评见 §11.3/§11.4/§11.5/**§11.6**。

## 3. 服务端设计

### 3.1 env 契约（`apps/server/src/config/env.ts`）

**新增 13 键**（默认全关 ⇒ 独立部署零影响）：

| 键 | 缺省 | 语义 |
|----|------|------|
| `ENTRA_ENABLED` | `false` | 企业 IdP（Entra ID）通道开关 |
| `ENTRA_CLIENT_ID` | `''` | 应用（客户端）ID |
| `ENTRA_CLIENT_SECRET` | `''` | 客户端密钥 |
| `ENTRA_TENANT_ID` | `''` | 租户 ID。**必填**（G1 定案 · 2026-10-12）：`ENTRA_ENABLED=true` 且本键为空 ⇒ **拒绝启动**。官方缺省为 `"common"` = **任何 Microsoft 账号（含个人账号）均可走通授权**（实测 `microsoft-entra-id.mjs:19`（`options.tenantId \|\| "common"`））⇒ 自托管企业部署**必须收紧到本租户**；填具体租户时官方**会校验 `issuer`**（`:79`） |
| `SOCIAL_GOOGLE_ENABLED` / `SOCIAL_GOOGLE_CLIENT_ID` / `SOCIAL_GOOGLE_CLIENT_SECRET` | `false` / `''` / `''` | Google |
| `SOCIAL_GITHUB_ENABLED` / `SOCIAL_GITHUB_CLIENT_ID` / `SOCIAL_GITHUB_CLIENT_SECRET` | 同上 | GitHub |
| `SOCIAL_WECHAT_ENABLED` / `SOCIAL_WECHAT_CLIENT_ID` / `SOCIAL_WECHAT_CLIENT_SECRET` | 同上 | WeChat |

**fail-fast（沿用既有模式）**：任一 `*_ENABLED=true` 且其 `_CLIENT_ID` 或 `_CLIENT_SECRET` 为空 ⇒ `parseEnv` 抛错**拒绝启动**（同 `LDAP_ENABLED`（`env.ts:112-114`）/ `OIDC_ENABLED`（`:120-125`）既有校验）。**另加 G1 校验**：`ENTRA_ENABLED=true` 且 `ENTRA_TENANT_ID` 为空 ⇒ 亦**拒启**。

**删除 5 键 + 2 段校验**：`OIDC_ENABLED` / `OIDC_DISCOVERY_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `OIDC_REDIRECT_URL`（`:69-75`）+「OIDC 配置完整性」（`:119-125`）+「discovery 须 https」校验（`:126-133`）。

### 3.2 provider 装配（`apps/server/src/auth/better-auth.ts`）

```
socialProviders: {
  ...(env.ENTRA_ENABLED
    ? { microsoft: { clientId: env.ENTRA_CLIENT_ID, clientSecret: env.ENTRA_CLIENT_SECRET,
                     tenantId: env.ENTRA_TENANT_ID } }
    : {}),
  ...(env.SOCIAL_GOOGLE_ENABLED ? { google: { clientId, clientSecret } } : {}),
  ...(env.SOCIAL_GITHUB_ENABLED ? { github: { clientId, clientSecret } } : {}),
  ...(env.SOCIAL_WECHAT_ENABLED ? { wechat: { clientId, clientSecret } } : {}),
}
```

**官方键名（实测来源 `@better-auth/core@1.7.5` `dist/social-providers/`）**：`microsoft`（文件 `microsoft-entra-id.mjs` · 导出符号 `microsoft`）· `google` · `github` · `wechat`；四者均在官方 `socialProviders` 索引的导出清单内（`social-providers/index.d.mts:1875`），且与 `POST /api/auth/sign-in/social` 的 `provider` 入参**同值**（前端零映射表）。
**不采**：官方 SSO 插件 · `genericOAuth`（主 design §2.6 R4）。

### 3.3 只读启用集端点（`apps/server/src/http/meta.ts`）

| 项 | 契约 |
|----|------|
| 方法 / 路径 | `GET /api/meta/auth-providers` |
| 出参 | `{ "providers": string[] }` —— 值 = **官方 provider 键名**，序 = 界面入口序（`microsoft` → `google` → `github` → `wechat` · 链接行从左到右）的**启用子集**；全关 ⇒ `[]` |
| 语义 | **匿名只读 · 零副作用 · 不入审计** · **只回显启用集**（不回显任何密钥类 env）—— 与 `/api/meta/limits` 同档同法，落在既有 `createMetaRoutes` 内，**不新建文件** |
| 取数时机 | 前端**进登录页时取一次**（随页面生命周期，**不落持久缓存**）；端点不可达 ⇒ 按「未启用」处理（**不渲染链接行，不留死入口**） |
| 为什么必须存在 | Q1 的 R2（0 启用 ⇒ 不渲染）要求前端**必须知道**服务端启用集；而官方**无**「列出已配置 provider」的只读端点（实测 `better-auth/dist/api/routes/` **全表**：account / callback / email-verification / error / **ok** / password / session / sign-in / sign-out / sign-up / update-session / update-user；`/ok` 只回 `{ok:true}`）⇒ 本仓自备只读端点（先例 = `/api/meta/limits`） |

### 3.4 建号与链接统一（四通道口径 · 重定向类共用一套）

| 通道 | 建号 / 链接承担者 | 规则 |
|------|------------------|------|
| 本地 | 官方 `sign-up/*`（`REGISTRATION_ENABLED` 默认关）+ 管理员建号（M4c-2） | 本批零改动 |
| 企业目录（LDAP） | 本仓钩子 → 共享模块 `identity.ensureDirectoryUser`（M4c-1 T3 · `plugins/ldap-credentials.ts:203`） | **不变**：邮箱必填 · 缺失即拒（绝不合成）· **同邮箱冲突即拒** |
| Entra / 社交（重定向） | 官方 `oauth2/link-account.mjs` | **默认即「撞已验证邮箱自动链接」**（实测 `:79` 隐式链接条件：`accountLinking.enabled !== false` 且非 `disableImplicitLinking` 且 `userInfo.emailVerified`）⇒ **本批不改该默认**（= 主 design §2.6 **R1** 拍板「自动链接」） |

> 口径：**四通道** = 本地 / 目录（LDAP）/ Entra / 社交；其中 **Entra 与社交同属「重定向类」**，共用官方 `oauth2/link-account.mjs` 的链接策略 ⇒ 上表按「通道类别」列三行。

**共享模块新增职责（唯一实现处 = `apps/server/src/auth/identity.ts` 的规则集）**：
- **占位邮箱识别（G9 甲 · 2026-10-12 落点定案）**：`email` 以 `.placeholder.invalid` 结尾 ⇒ 判为「无邮箱身份」。**服务端零新增拦截** —— R11 的实质**已由官方满足**：① `emailVerified:false` ⇒ 官方**本就不参与自动链接** ② 官方占位串天然唯一 ⇒ **不撞** `user_email_unique`（`db/schema/auth.ts:42`）③ 我方「同邮箱冲突即拒」只在**目录通道**跑，占位邮箱不会从目录来 ⇒ 「跳过邮箱唯一性判定」在服务端**无对应代码**（**这不是漏实现，是官方已满足**）。本批只落两件：**(a)** 服务端**共享识别函数 + 单测**（供未来准入复用，**不改任何建号行为**）；**(b)** **管理面出参把占位邮箱归一为「无」** ⇒ 前端既有 `{email \|\| '—'}` 兜底**直接生效**（**零前端改动 · 零新键**）。
　⚠ **口径订正（UI 评审轮 P7 丙 · 2026-10-12）**：G9 原定「前端按 RFC 6761 保留 TLD `.invalid` 判定」⇒ 改为**服务端出参归一**。依据（G9 时未见的真码）：① 前端**已有** `{email \|\| '—'}` 兜底（**`AdminUsers.tsx:297`** · 实测回读订正）② 该列**排序与筛选都在服务端**（`AdminUsers.tsx:11`/`:189-192`）⇒ 归一**不影响**两者 ③ 判定单点在数据面 ⇒ 不出现「`.invalid` 常量前端复制」的双源。**连带口径**：管理端**看不到**占位邮箱真值 —— 这是**期望**（R11 = UI 显「—」）；排查走 `account` 表 / 审计 `detail.provider`。
- **官方占位邮箱真值已核**（`@better-auth/core@1.7.5` `dist/utils/email.mjs`）：`PLACEHOLDER_EMAIL_DOMAIN = "placeholder.invalid"`，`createPlaceholderEmail({ identifier, namespace })` 产出 `<identifier>@<namespace>.placeholder.invalid`；WeChat provider 即用该函数 + `emailVerified: false`（`social-providers/wechat.mjs:77` / `:82`）⇒ **R11 口径与官方实现一致**。
- **定位声明（承主 design §3.4）**：本模块**不是**与官方并行的第二套建号机制，而是**挂在官方钩子 / 官方建号流程下游**的规则实现。
- **显示名（G10 甲 · 2026-10-12）**：外部通道建号时 `user.name` **直接采官方缺省**（provider profile 显示名 · 官方 `mapProfileToUser`），**不额外归一** —— 不加第三套规则；各 provider 风格差异（Google「名 姓」· 微信昵称）**如实接受**（本批无改名入口）。
- **已知风险（G2 定案 · 2026-10-12 · 显式入档，不藏）**：官方隐式链接条件中 `requireLocalEmailVerified` 默认 **false**（实测 `oauth2/link-account.mjs:79`）⇒ 若某**本地账号**（管理员建号 · 邮箱通常**未验证**）的邮箱被第三方账号证明持有，则**自动链接到该本地账号（含其角色）**。本批**不新增第二套链接机制**（守「官方优先 / 单轨」）：准入收敛放在**身份源侧** —— G1 的租户收紧（只有本企业员工进得来）；社交通道的**域限制**属准入策略 `ACCESS_POLICY`，主 design §2.6 **D5** 保留不实现。**残余风险如实登记**；如需收紧，处置口 = 官方 `accountLinking.requireLocalEmailVerified`（代价：未验证邮箱的本地账号将**拒绝登录**而非链接）。

### 3.5 退役面（逐件 · 2026-10-12 实测 · `grep -ric oidc` 命中数为实测）

**删件 4**：

| 件 | 命中 | 内容 |
|----|:--:|------|
| `apps/server/src/http/oidc-routes.ts` | 50 | `createOidcRoutes` · `OIDC_STATE_COOKIE` · `parseOidcStateCookie` / `readOidcState` / `clearOidcStateCookie` · `signInAihOidc` 调用面 |
| `apps/server/src/http/oidc-routes.test.ts` | 29 | 端点测试 |
| `apps/server/src/auth/oidc.ts` | 19 | 自绘 OIDC 客户端工厂（`createOidcClient` / `getOidcClient` / `oidcRedirectUrl` / `resetOidcClientCache`） |
| `apps/server/src/auth/oidc.test.ts` | 20 | 工厂单测（含 `it.skip` 的 enabled 分支） |

**改造 24 件**（21 + **`better-auth.test.ts`**（T2 轮 · 见 #22）+ **`admin-users.test.ts`**（T4 轮 · 见 #23）+ **`doc-claims-check.ts`**（T5 轮 · 见 #24））：

| # | 件 | 命中 | 处置 |
|--:|---|:--:|------|
| 1 | `apps/server/src/app.ts` | 5 | 删 import + `/api/auth/oidc` 挂载（`:132`） |
| 2 | `apps/server/src/auth/plugins/ldap-credentials.ts` | 10 | 删端点 `signInAihOidc`（`/sign-in/aih-oidc`，`:116`）与其 `OIDC_PROVIDER` 引用；**保留** `before` 钩子（CSRF 平价 + 首登建号） |
| 3 | `apps/server/src/auth/errors.ts` | 4 | 删 2 码（`:15-16`）+ 2 个 `case`（`:58-59`） |
| 4 | `apps/server/src/config/env.ts` | 16 | 删 `OIDC_*` 5 键 + 2 段校验；加 13 键 + fail-fast |
| 5 | `apps/server/src/config/env.test.ts` | 24 | 删 OIDC 断言块；加 13 键**两态**断言 |
| 6 | `apps/server/src/audit/actions.ts` | 2 | 删 `oidc` 组（**`:52-55`** · 实测回读）；加 `external` 组（§3.6） |
| 7 | `apps/server/src/audit/audit.ts` | 2 | 删 `provisionOidc`（`:12-13`）；加 `provisionExternal` |
| 8 | `apps/server/src/auth/identity.ts` | 2 | 注释订正（`usr_oidc_<uuid>` / 「OIDC 通道」表述）+ 占位邮箱规则 |
| 9 | `apps/server/src/auth/identity.test.ts` | 5 | 退役 OIDC 建号断言；加占位邮箱断言 |
| 10 | `apps/server/src/test-utils/auth-fixture.ts` | 1 | 注释订正（`'ldap'/'oidc'` ⇒ `'ldap'/'external'`） |
| 11 | `apps/server/src/auth/better-auth.ts` | 1 | 注释订正 + provider 装配（§3.2） |
| 12 | `apps/server/src/http/admin-users.ts` | 2 | 注释订正（先例指向 `oidc-routes.ts` ⇒ 改指现存先例，防注释腐化） |
| 13 | `apps/server/src/http/meta.ts` | — | 加只读端点（§3.3） |
| 14 | `apps/server/src/http/meta.test.ts` | — | 加两态断言 |
| 15 | `apps/web/src/pages/Login.tsx` | 10 | 退役 `altMode` + provider **文字链一行**（§4.1 · v0.5） |
| 16 | `apps/web/src/pages/AdminAudit.tsx` | 2 | 删 `'oidc'` 组标签分支（`:68-69`） |
| 17 | `apps/web/src/i18n/zh.ts` | 9 | 键账（§4.4） |
| 18 | `apps/web/src/i18n/en.ts` | 8 | 键账（§4.4） |
| 19 | `apps/web/src/api/meta.ts` | — | 加取启用集函数 |
| 20 | `docs/smoke/scripts/dogfood-all.ts` | — | `SCRIPT_NAMES` 登记 L6 新脚本 |
| 21 | `apps/web/src/pages/AdminUsers.tsx` | — | 邮箱列「占位邮箱显 —」（**UI 评审轮 P7 丙 补入件面**：判定经**服务端出参归一**，前端**零逻辑改动**，`{email \|\| '—'}` 兜底直接生效） |
| 22 | `apps/server/src/auth/better-auth.test.ts` | — | **T2 轮补入件面**（原表漏算）：加 **L1 / L2** 单测 —— 关态逐 provider **404 `PROVIDER_NOT_FOUND`** · 开态装配 + **`tenantId` 接入授权 URL**（行为级断言）⇒ 件面 **21 → 22** |
| 23 | `apps/server/src/http/admin-users.test.ts` | — | **T4 轮补入件面**：加「**占位邮箱出参归一**」用例（占位账号 ⇒ 出参 `email = null` 且真值不外泄 / 正常邮箱 ⇒ 原样对照）⇒ 件面 **22 → 23** |
| 24 | `docs/smoke/scripts/doc-claims-check.ts` | — | **T5 轮补入件面**：`app.ts` 的 `createAdminRoutes` 行锚随本轮插入（约 52 行）漂移 **`216 → 268`** ⇒ 同步锚点 + 就地注明迁移原因（**同 F224/M23 先例**）；断言意图不变 ⇒ 件面 **23 → 24** |

**新建 2 件**：

| 件 | 内容 | 层 |
|----|------|----|
| `docs/smoke/scripts/m4c3-login-providers-dogfood.ts` | L6：关闭态渲染（**无链接行**）+ 误配降级（未启用 provider ⇒ 404） | 冒烟 |
| `docs/smoke/scripts/m4c3-entra-fake-issuer.ts` | L5：Entra 通道假 issuer 全流程（自签 jwks · `authority` 指向本地） | 冒烟 |

**时序侧信道（⚠ 主 design §6.1 锚点失效 · 见 F304）**：主 design §6.1 写「本仓自绘端点已有同款处理（`plugins/ldap-credentials.ts:393` 的固定假哈希校验）」。**实测该文件仅 267 行 ⇒ 行号越界**；真身 = `apps/server/src/auth/password-verify.ts:35`（`DUMMY_PASSWORD_HASH`）+ `:63`（无凭据分支后补跑）+ `:69`（目录 `bind` 后补跑）。**且该处理挂在官方 `password.verify` 的存值前缀分派上，不依赖任何 OIDC 端点 ⇒ 本批退役 OIDC 全链对它零影响**（主 design §6.1「须跟着迁移」的前提不成立）。本批**只订正引用，不改该逻辑**。

### 3.6 审计与错误码

| 面 | 处置 |
|----|------|
| 审计动作 | 删 `oidc` 组（`oidc.provisioned`）⇒ 新增 **`external` 组 / `external.provisioned`**（外部身份源首登建号），四通道（Entra / Google / GitHub / WeChat）**共用一枚动作**，来源 provider 落 `audit_log.detail.provider`（`jsonb` · 值 = **官方 provider 键名** · `db/schema/governance.ts:138`）；**登录成功另记既有 `auth.login.success`**（同样带 `detail.provider`）⇒ 三通道登录审计口径统一（**G5**）；写入点沿用本仓既有先例 —— 官方端点在本仓包装层的「先读上下文 → 官方处理 → **成功即补审计**」（`app.ts` 已用于 `sign-out` / `device.approve\|deny`）· **`ldap` 组不动**（G11：史实连续 —— 历史审计行已有 `ldap.provisioned`；目录通道与重定向通道建号入口不同）· 审计字段沿用既有惯例 `{ provider, via }`（写入点惯例 `ldap-credentials.ts:214-220`） |
| 错误码 | 删 `auth.oidc_state_mismatch` / `auth.oidc_denied`（`errors.ts` + i18n `errors` 组 2 键）· `oidc.not_configured` 键随自绘端点一并退役；**不新增业务错误码**（provider 未装配由官方 **404** `PROVIDER_NOT_FOUND` 承担，见 §4.2 · **F307 订正**） |

> **写入点定案（实现期 T5 轮**补写** · 2026-10-12 · 原为设计缺口）**：本节原只写「写入点沿用既有先例（包装层）」，
> **未定** `external.provisioned` 的**信号来源**。实测官方 `@better-auth/core@1.7.5`：
> `databaseHooks.account.create.after(account, ctx)`（`dist/types/init-options.d.mts:1358-1399`）· 钩子对**所有模型通用**
> （`dist/db/with-hooks.mjs` 的 `createWithHooks` 按 `hooks[model]?.create?.after` 分派）⇒ **定案**：
> - **`external.provisioned` = 官方 `account.create.after` 钩子**：`account.providerId ∈ {microsoft, google, github, wechat}`
>   **且**该用户**无其他 account 行**（新建的外部账号是唯一一行 ⇒ **首登建号**；存量本地/目录账号**链接**第三方时已有
>   `credential` 行 ⇒ 计数 ≥ 2 ⇒ **不记建号**）⇒ `detail: { provider, via: 'oauth/callback' }`（provider = 官方键名）
> - **`auth.login.success` = 包装层**（`app.ts` 的 `/api/auth/*` catch-all · 命中 `/api/auth/callback/<provider>`）：
>   会话由**响应**下发（请求头里没有）⇒ 从响应 `Set-Cookie` 取 token 段查库（**复用 device/token 先例** `sessionOwnerOfResponse` 的手法）⇒ `detail: { provider, via: 'oauth/callback' }`
> - **备选（未采）**：① 包装层按 `user.createdAt` 近因判建号 —— **启发式**，非确定 ② 官方 `validateUserInfo` 校验缝 —— **校验钩子不宜承载副作用**（越权使用扩展点）
> - **删除面归属**：`oidc` 组 / `provisionOidc` / 2 错误码的**删除**须与消费点（`http/oidc-routes.ts:134/149/153/155/189`）同批 ⇒ **归 T6**（同 T1 的 `OIDC_*` 删键教训）

### 3.7 等价完成判据（补主 design 缺口）

主 design **已给 M4c-1 的 R16 三层判据、未给 M4c-3 的判据** ⇒ 本批补 **四层硬判据**：

| # | 判据 | 判定手法 |
|--:|------|---------|
| ① | **自绘 OIDC 全链归零** | 全仓 `grep -rn "oidc_state\|signInAihOidc\|createOidcRoutes\|getOidcClient\|OIDC_ENABLED\|oidc\.provisioned\|auth\.oidc_"` over `apps/` + `packages/` + `docs/` ⇒ **零命中**（豁免仅限：本批 design 与 §13 F 账、主 design 沿革行、历史证据文件） |
| ② | **四通道均可建号并正确链接** | 本地（管理员建号 / 官方注册）· 目录（LDAP 首登）· Entra（L5 假 issuer 全流程）· 社交（L1–L4 + L7 手工）—— 各自双断言：**首登建号** + **二次登录复用**（`(providerId, accountId)` 命中不重复建号） |
| ③ | **占位邮箱口径** | WeChat 无邮箱身份：跳过邮箱唯一性 · `emailVerified:false` · 不参与自动链接（L3 单测 + UI 显「—」） |
| ④ | **入口与降级** | 启用集驱动渲染（**0 启用 ⇒ 无链接行**）· 未装配 provider ⇒ **404 `PROVIDER_NOT_FOUND`**（L4 + L6 · **F307 订正**） |

## 4. 前端设计

### 4.1 登录页入口形态（`apps/web/src/pages/Login.tsx` · **236 行**实测）

**现状**：单表单 + 底部文本链接（`oidcLink` ⇄ `backToForm`）切**整页备选态**（`altMode`）—— 备选态文案的唯一载体是「统一认证页」（自绘 OIDC 时代产物，随 U5 消失、无内容可承载）。

**目标（Q1 = ②）**：退役 `altMode`，落 R13 形态。

| 删 | 增 |
|----|----|
| `altMode` state（`:90-91`）· 备选态块（`:160-172`：`oidcHint` + `oidcOpen` 按钮）· 底部文本链接（`:222-231`）· `OIDC_AUTHORIZE_URL` 常量（`:46`） | 表单下方 provider **文字链一行**（按启用集渲染 · 项间 1×12 竖线 · 1 项无竖线 · 0 项不渲染 · **无「或」分隔线**） |

**件与档指名（UI 定稿 P1–P3 → **v0.5 二次翻转** · 2026-10-12 · 只记件与档，不抄 class/px）**

| 元素 | 件 / 档 | 依据 |
|------|--------|------|
| ~~分隔线「或」~~ | **去掉（v0.5）** ⇒ 本页**不消费** `FieldSeparator`；原「全仓第一个消费者」披露**撤回** | ~~P1 甲~~ **作废**（留痕见 §4.6） |
| provider 入口 | **文字链一行**：本页**既有链接档**（`text-[13px]` + `text-muted-foreground` + `hover:text-foreground` · `Login.tsx:223`）+ **常态下划线**（官方链接写法 `underline underline-offset-4`） | **P14 甲**（v0.5）· 照 DeepSeek 实测形态 + 本页既有语言 · **零新件** |
| 内容 | **纯文字**（Microsoft 账号 / Google / GitHub / 微信）—— **不带图标** | **P3 甲**（语义不变 · 载体由「按钮内容」改「链接文字」）· 零新视觉资产 · 零商标/许可新增面 |
| 分隔 | 项与项之间 **1×12 CSS 竖线**（本页取 `--border` 令牌）；**1 项 ⇒ 无竖线**；整行居中 | **P15 甲**（v0.5 · 照 DeepSeek 实测 `1×12` · 非字符「｜」） |
| 排列 | **一行**（不换行：实测 ZH 内容 **250** / EN **294**，均 < 336）· **0 项 ⇒ 整行不渲染** | Q1-R3（v0.5 订正）+ Q1 |
| 位置 | 表单块**下方** · 主按钮 ↔ 链接行 **16px**（其余沿用本页 22px） | **P16 甲**（v0.5 · 照 DeepSeek 实测）· R13「不改页面结构」仍守 |

**原型证据（未跟踪 · 不入仓）**：`apps/web/proto-m4c3-login-links.html`（**v0.5 现行** · 8 态：关态 / 开态 4 项 ZH / 4 项 EN / 1 项 / 失败态 E2 / 失败态 E1 / 骨架态 / 间距 16px 对照）+ `.png`（CDP 实拍）；`apps/web/proto-m4c3-login-providers.html`（**已被取代** · 按钮组旧形态 · 留作沿革）；**大厂/官方参照**：`apps/web/proto-ref-deepseek-signin.png`（DeepSeek `sign_in` 实测截图）· `apps/web/proto-m4c3-official-blocks.html` + `.png`（shadcn 官方 login blocks **5 块源码复刻**，P14–P16 的官方对照）· **均静态复刻或实测截图**（令牌与形态逐条抄自真码 / registry 源）· **真页验证归 L7**
**实测几何（原型 · 来源 = `getComputedStyle` / `getBoundingClientRect` / 像素采样 · **v0.5 重测**）**：列宽 **336** · 字段 **48 / 圆角 28** · 主按钮 **42 胶囊** · **链接行 336×18（单行）** · 链接档 **13px / muted-foreground / 常态下划线（offset 4px）**（像素级复核：行带连续暗像素 **398** ≈ 4 条下划线合计 **396** ⇒ 下划线**实测在场**）· **竖线 1×12（`--border`）** · 段间距 **22 / 22 / 16（仅主按钮↔链接行）** · 列高：关态 **266** · 开态 **300** · 失败态 **344**（E2/E1 等高 · 仅落点不同）· **入口块实增 34**（沿革：按钮组+分隔线 144 → 文字链+分隔线 66 → 无分隔线 40 → **v0.5 现档 34**）· **骨架 = 300 = 开态 ⇒ 零跳动**（⚠ 实现约束：骨架的链接行位须用**同一 16px 间距**，否则 6px 跳动）· **1366×768 富余 468 ⇒ 无纵向溢出 · 横向无溢出**

**入口交互（官方入参实测锁定）**：

| 步 | 行为 | 依据 |
|----|------|------|
| 1 | 点**链接项** ⇒ SDK `authClient.signIn.social({ provider, callbackURL: destination })` —— **不取 `disableRedirect`**（交 SDK 自行跳转） | 官方 `POST /api/auth/sign-in/social` 入参：`provider`（`sign-in.mjs:40` · 枚举含 `microsoft`/`google`/`github`/`wechat`）· `callbackURL`（`:23`）· `disableRedirect`（`:47` · **本批不用**） |
| 2 | 成功 ⇒ SDK **同页跳转**至 `url` | **官方社交通道是 POST 端点**（非 GET）⇒ 不能照抄今日 `<a href>` 直跳。**同页跳转 = 浏览器原生 OAuth 语义**：回调即整页重载 ⇒ `AuthProvider` 重新 bootstrap ⇒ **登录态当场就位（顺带消 F5「需刷新才见登录态」缺口 · G3）** |
| 3 | 失败（未装配 / 网络）⇒ **inline 错误条**（复用既有 `role="alert"` 错误行 · 文案 `login.providerFailed`） | Q2 定案 = 「点击后失败提示」；**不做连通性预探测**（Q2 备选 A 未采）。**已启用集渲染 ⇒ 该路径仅剩网络 / 配置异常**；已跳转后 provider 侧失败落浏览器侧（可回退） |

**落点纪律（G4 定案）**：`callbackURL` = 复用 `sanitizeNext` 单点（`auth/next.ts`）算出的 `destination`（`next ?? '/'`），**不另立一套白名单**；**严格走 `next`**（不经今日 `/?oidc=success` 式旁路）。

### 4.2 降级（Q2 定案行为）

| 场景 | 表现 | 依据 |
|------|------|------|
| provider **未启用** | 该**链接项不渲染**（启用集驱动）⇒ 不产生入口 | §3.3 + Q1-R3 |
| **全部** provider 未启用 | **链接行整体不渲染**（不留空行 / 空占位） | §5.1「不留点了没反应」 |
| 已启用但**不可达**（企业内网） | **POST 阶段**失败 ⇒ 本页落 **inline 错误条**（`login.providerFailed`）；**已跳转后** provider 侧失败 ⇒ 落浏览器侧（可回退） | 官方 `api/routes/sign-in.mjs:151`（未装配 ⇒ `APIError.from("NOT_FOUND", PROVIDER_NOT_FOUND)` = 404） |

**明确不做**：渲染前逐个 ping provider 的连通性探测（慢 + 有副作用 + 不保证后续 token 交换成功，且区分不了「未启用 vs 不可达」）—— 登记为**非目标**，不留给实现期。

### 4.3 复用件清单（**零新视觉值 · 零新件**）

| 用途 | 件 | 来源 |
|------|----|------|
| provider 入口 | 本页**既有链接档**（`text-[13px]` + `text-muted-foreground` + `hover:text-foreground`）+ 官方链接写法（`underline underline-offset-4`） | 本页既有 + 官方惯例（**v0.5**：不再引 `button` / `separator`） |
| 失败/错误行 | 表单既有 inline `role="alert"` 行（本页 `:202-206`） | 本页既有 |
| 尺寸档 | 复用本页 `FIELD_CLASS` / `SUBMIT_CLASS` 既有尺寸语言 + **唯一新增值 = 主按钮↔链接行 16px**（照 DeepSeek 实测） | 本页既有（**不新增 token**） |
| 骨架 | `components/ui/shadcn/skeleton.tsx`（`loading` 态镜像表单列，**保持零跳动**） | 官方件（已 vendor） |

### 4.4 i18n 键账（`07` §3 · 真源 = `apps/web/src/i18n/{zh,en}.ts`）

**实测基线（2026-10-12）**：全仓 **16 组 · 701 键** · zh / en **双向差集 0**；`login` 组 **16 键**。

| 动作 | 键 | 数量 |
|------|----|:--:|
| **退役** | `login.oidcLink` · `login.oidcHint` · `login.oidcOpen` · `login.backToForm` | **−4** |
| **退役** | `errors` 组：`auth.oidc_denied` · `auth.oidc_state_mismatch` · `oidc.not_configured` | **−3** |
| **退役** | `admin` 组：`audit.group.oidc`（审计分组标签，随 `oidc` 动作组删除） | **−1** |
| **新增** | ~~`login.orDivider`~~（**v0.5 去分隔线 ⇒ 不新增**）· `login.providerMicrosoft`（**`Microsoft 账号`** / `Microsoft account` · v0.5 改名）· `login.providerGoogle`（`Google`）· `login.providerGitHub`（`GitHub`）· `login.providerWechat`（`微信` / `WeChat`）· `login.providerFailed`（G6 定值 · 失败提示） | **+5** |
| **改值（键数不变）** | `login.subtitle`：`使用企业目录账号登录` ⇒ **`使用企业账号登录`** · `login.feature3`：`企业目录账号直连（LDAP / OIDC）` ⇒ **`企业目录账号直连（LDAP / Entra ID）`**（G6 甲 · 最小改：只把退役的 OIDC 换成正主） | 0 |

⇒ `login` 组 **16 → 17**（−4 +5 · v0.5 去 `orDivider`）；全仓 **701 → 698**（−4 −3 −1 +5 = **−1**）。
**同批同步**：`docs/07` §3.3 注记 + 修订行（**并订正 §3 正文两处过期值** → F305）。

### 4.5 边界与状态

| 场景 | 处理 |
|------|------|
| 提交中连点 | 链接行不进提交态（非表单控件）；表单提交期禁用沿用现状 |
| `loading`（`bootstrapAuth` 未返回） | 骨架**镜像表单列**（**含入口块占位**：仅**链接行位**（无分隔线位）· **须用同一 16px 间距** ⇒ 与真实高度同节奏 / 零跳动），且**占位随启用集条件渲染**（0 启用 ⇒ 骨架也不多画）—— 闭「切态跳动」缺口（**P5 甲 + R9**） |
| **两条错误互斥** | 表单错误（`tErr(code)`）与入口失败（`login.providerFailed`）**不同槽但互斥**：操作任一方即清另一方 ⇒ **不同屏出现两条红字**（**P4 + R6**）· 入口失败行**落链接行之下**（**P4 ⟶ v0.5 E2**） |
| `authed` 访 `/login` | 反向守卫 `<Navigate to={destination} />`（**零改动**） |
| 语言切换 | 右栏右上角 `LanguageSwitcher` 不动；provider 名随语言切换 |
| 空启用集 | 见 §4.2 第二行 |

### 4.6 UI 定稿（逐条评审 5 条 · P1–P13 · 2026-10-12 · 用户「按推荐来」）

| # | 议题 | 定案 |
|--:|------|------|
| ~~P1~~ | ~~分隔线落法~~ | ⚠ **作废（v0.5）**：分隔线**去掉** ⇒ 不消费 `FieldSeparator` |
| ~~P2~~ | ~~按钮变体与尺寸档~~ | ⚠ **作废（v0.5）**：按钮组 ⇒ **文字链一行**（见 P14） |
| P3 | 是否带图标 | **纯文字**（零新视觉资产 · 零商标面）—— **v0.5 语义不变**，载体由「按钮内容」改「链接文字」 |
| ~~P4~~ | ~~失败条落点（按钮组上方）~~ | ⚠ **订正（v0.5）**：入口失败行落 **链接行之下**（**E2** · 观感复核 3 次一致 + 用户拍板） |
| P5 | 骨架是否镜像入口块 | **镜像**（且**随启用集条件渲染**） |
| P6 | `login.providerFailed` 文案 | ZH「登录未完成，请稍后重试或联系管理员」· EN「Sign-in could not be completed. Try again or contact your administrator.」（**不暴露内部配置状态**） |
| P7 | 占位邮箱判定落法 | **丙：服务端出参归一**（**订正 G9 甲**；前端零改动 · 零新键；排序/筛选在服务端不受影响） |
| P8 | `who` 兜底（`AdminUsers.tsx:335`）是否同规则 | **不动**（「标识符兜底」语义 · 且几乎落不到 email） |
| P9 | `UserMenu` 改动面归属 | **纯逻辑调序**（登出链）+ **只做行为双证**（改的是执行序，无视觉对象） |
| P10 | 是否为外部身份源加管理界面 | **不加**（provider 开关 = env 驱动 · U1）⇒ 写为**明确非目标**，不留「以后再定」 |
| P11 | `docs/07` 落痕形态 | 顺号新增 **§3.4 `login` 组落地注记** + 修订行 **v1.17**；**同笔承载 F305** 的 §3 正文两处订正 |
| P12 | 断点面 | **不引入响应式断点**（沿用现状固定 42/58）；若 L7 实测溢出 ⇒ **本批单点处置** |
| P13 | 双语验收口径 | 既有门禁（zh/en 成对 · 双向差集 0 · 占位符一致） |

**本轮的处置与留痕（3 补 · 1 订正 · 1 实测解除 · 2 非目标）**：

| 类 | 项 | 处置 |
|----|----|------|
| 补写 | 骨架未镜像入口块（切态会跳动） | §4.5 补「镜像 + 条件渲染」（**P5**）· 进 L7 断言 |
| 补写 | 两条红色错误可能同屏 | §4.5 补「互斥」（**P4 + R6**） |
| 补写 | 件面漏 `AdminUsers.tsx` | §3.5 改造 **20 → 21**（**P7 丙** 的落点） |
| 订正 | 占位邮箱判定（G9 甲 → **P7 丙**） | §3.4 已订正并留痕（依据 = 前端既有兜底 + 排序/筛选在服务端） |
| 实测解除 | 「336px 列加高 ⇒ 矮屏溢出」 | 原型实测：**1366×768 富余 359px**（**v0.4 轮读数**）；**v0.5 重测 = 468px**（见 §4.1 实测几何）⇒ 风险解除（仍留 L7 断言作护栏） |
| 非目标 | 身份源管理界面（P10）· 引入响应式断点（P12） | 均写为**明确非目标** |

> **条 4 留痕（R16）**：本批**壳的结构与视觉零改动**，唯一被触碰的壳件 = `UserMenu.tsx`（登出链**逻辑调序** · Q3 甲）—— 评审时勿把它漏出改动面。

**v0.5 二次翻转（用户 2026-10-12 · 4 项「按推荐」拍板）**

| # | 议题 | 定案 | 留痕 / 依据 |
|--:|------|------|------|
| P14 | provider 入口形态 | **文字链一行**（非按钮）：13px 沿用本页链接档 + **常态下划线** + `hover:text-foreground` | 取代 **P2 甲**；依据 = 用户拍板「像 DeepSeek 一样下划线文字可点击」+ DeepSeek `sign_in` 实测（12px / 灰 / **常态**下划线）+ shadcn 官方链接写法 |
| P15 | 项间分隔 | **1×12 CSS 竖线**（本页取 `--border`）；**1 项 ⇒ 无竖线** | 依据 = DeepSeek 实测（`1×12` · 黑 10% · **非字符「｜」**）；备选字符写法未采 |
| P16 | 链接行 ↔ 主按钮间距 | **16px**（其余段仍 22px） | 依据 = DeepSeek 实测（其登录钮底 360 → 社交行 376 = **16**）；备选「22px = 零新数值」未采 |
| P17 | ~~是否保留「── 或 ──」~~ | **去掉** | ⚠ **口径订正**：本条**决断翻转 1 次**（保留 → 去掉），此前是**被问 3 次**（UI 定稿 P1 · v0.5 条 4 · 本次），**不是翻转 3 次**；⇒ **P1 甲 作废** |

**被本次翻转取代的旧拍板（留痕 · 不删历史）**：~~P1 甲~~（分隔线 = `FieldSeparator`）· ~~P2 甲~~（`Button variant="outline"` + 本页按钮档）· ~~Q1-R3~~（2 列网格 / 3 个末个不拉伸 / <2 单列全宽）· ~~笔 2~~（网格断裂规则）· ~~笔 3~~（图标取舍）—— 前两者因**分隔线去掉**失去载体，后三者因**不再有按钮**失去对象；**P3 甲（纯文字不带图标）继续成立**（更彻底：连按钮都没有）。

**v0.5 官方/大厂对照留痕（本轮新取证 · 只读学习，不改本批机制）**：① shadcn 官方 login blocks **5 块源码**（`/r/styles/new-york-v4/login-0{1..5}.json`）—— 社交入口三范式（A 无分隔线 / B 社交在表单前 / C 表单→分隔线→按钮组 = 本批原 R13）、官方**两块**给的是「按钮 + 品牌图标」、`FieldSeparator` 放进 Card 才需 `*:data-[slot=field-separator-content]:bg-card` 覆写、官方 **04 块图标按钮用默认档被 grid 拉伸成 117×36（非正方形）**；**本仓 `field.tsx` 与官方语义同版**（差分 100% 为 prettier 格式 + 去 `'use client'`）。② DeepSeek `sign_in` 实测 —— 社交入口 = **12px 灰字常态下划线 + 1×12 竖线**一行（**无「或」横线**）· 微信走 **官方 `qrconnect` iframe 内嵌**（非跳转）· 输入框 **336×48 / 圆角 28**、主按钮 **42 胶囊**（与本页同档）· 「未注册的手机号将自动注册」告知。**本批不采纳项**：内嵌 iframe（state 由 better-auth 服务端签发 ⇒ 内嵌 = 第二条 OAuth 链路，违单轨）· 品牌图标（P3）· 自动建号告知（登记为后续可选 · 见批 plan）。

## 5. 判据与回归面

| 面 | 项 |
|----|----|
| **等价完成判据** | §3.7 四层（grep 归零 / 四通道建号+链接 / 占位邮箱 / 入口与降级） |
| **零回归面（硬）** | ① 本地登录（账号+口令）链路与错误码文案不变 ② 目录（LDAP）首登建号与凭据委派行不变 ③ 反向守卫 + `next` 白名单（`sanitizeNext`）不变 ④ 401 四分类**语义**不变；表单失败行沿用既有 inline `role="alert"`（本批**新增一个错误来源**复用同一行，不引入 Alert 块） ⑤ 门户面 **零改动**（M4a 零回归硬约束） |
| **连带面** | `docs/smoke/scripts/m4b2-ui-redo-assertions.ts`（M4b-2 批证据脚本 · **49 断言** · 不在 CI / 不在 dogfood 8 脚本内）有 **2 条**断言绑死 `altMode`：`A10`（底部 OAuth 链接存在 · `:344-348`）· `A10b`（链接 ⇒ 备用面板 · `:360`）⇒ 随 Q1 退役**恒红**，本批同步改为「表单下方 provider 文字链一行」断言（沿 **F221** 先例：写死历史结构的断言须回改，不留恒红） |
| **跨平台影响** | **无平台分支**：本批改动 = 服务端 env / provider 装配 + 前端入口渲染，三平台（Windows / macOS / Linux）行为同一，无路径 / 权限 / 信号 / 编码差异 |
| **不含** | 未启用 provider 的连通性探测 · 管理员外部身份管理面 · 邮件找回 |

## 6. 测试策略（Q4 定案 · 分层 L1–L7）

| 层 | 内容 | 手段 | 网络 |
|----|------|------|------|
| **L1** | provider 装配两态（关 ⇒ 不装配 · 开 ⇒ 装配且含 `tenantId`） | `apps/server` 单测（注入 env） | 零 |
| **L2** | 未装配 provider ⇒ `sign-in/social` **404 `PROVIDER_NOT_FOUND`**（body `{"message":"Provider not found","code":"PROVIDER_NOT_FOUND"}` · **F307 订正**） | `apps/server` 单测（`better-auth.test.ts`） | 零 |
| **L3** | 占位邮箱识别（`.placeholder.invalid`）· 跳过邮箱唯一性 · 不参与自动链接 | 共享模块直测（`identity.test.ts`） | 零 |
| **L4** | 只读启用集端点两态（全关 ⇒ `[]`；开 N ⇒ N 项且**序**正确） | `meta.test.ts` | 零 |
| **L5** | **Entra 通道假 issuer 全流程**（唯一可做：官方 `microsoft` 支持 `options.authority` 覆盖 ⇒ 指向本地假端点；`google` / `github` / `wechat` 端点**硬编码**，不可 fake） | 冒烟（自签 jwks · 注意 `tenantId` 非 `common` 时官方校验 `issuer`） | 本地 |
| **L6** | dogfood **+1 脚本**（默认全关态）：「关闭态渲染」（**无链接行**）+「误配降级」（调未启用 provider ⇒ 404） | CDP dogfood（**新件** `docs/smoke/scripts/m4c3-login-providers-dogfood.ts` + 在 `docs/smoke/scripts/dogfood-all.ts` 的 `SCRIPT_NAMES` 登记） | 本地 |
| **L7** | **手工实测（纳入本批验收 · G12 5 项清单 · 截图 2 张）**：① 关态 ⇒ 登录页**无链接行**（截图 1）② 开态（4 全开）⇒ 链接行**按序**「Microsoft 账号 ｜ Google ｜ GitHub ｜ 微信」**一行**（截图 2）③ 误配降级 ⇒ `POST /api/auth/sign-in/social {provider:'github'}`（未装配）= **404 `PROVIDER_NOT_FOUND`**（**F307 订正**）④ **F298 关账取证**：连续 **5 次**登出**全落 `/`**（正反双证）⑤ 回调落点：`/login?next=%2Fadmin%2Fusers` 发起 ⇒ 成功回 **`/admin/users`**（**条件项**：需真凭据 · **用超管账号跑**，避免误判既有 `RoleGuard` 行为）⑥ **1366×768 无纵向滚动/裁切**（原型实测：富余 **468px**）⑦ **骨架含入口块占位**（`loading → anon` 无跳动）⑧ **两条错误互斥**（不同屏出现两条红字） | 浏览器 | 需重启服务两次（关 / 开切 env）· ⑤ 依赖真 IdP 凭据 |

**诚实标注（不隐瞒）**：`google` / `github` / `wechat` 的**真跳 + 回调 + 建号**三社交通道**不被自动化覆盖**（端点硬编码、真凭据不可依赖）⇒ 由 L7 按条件手工验证；**基线数会变**（删 2 个测试文件 + 新增 4 组测试 ⇒ 服务端用例数与 pass 数须重新记录，**新基线以实施期实测为准并写入批 plan / 证据**）。

## 7. 接口变更总览（服务端面）

| 类 | 变更 |
|----|------|
| **新增** | `GET /api/meta/auth-providers`（匿名只读） |
| **删除** | `GET /api/auth/oidc/authorize` · `GET|POST /api/auth/oidc/callback` · 端点 `POST /api/auth/sign-in/aih-oidc`（`signInAihOidc`） |
| **新增（非 HTTP）** | 审计动作 `external.provisioned`（组 `external`） |
| **删除（非 HTTP）** | 审计动作 `oidc.provisioned`（组 `oidc`）· 错误码 `auth.oidc_state_mismatch` / `auth.oidc_denied` · cookie `oidc_state` |
| **新增（配置面）** | env **13 键**（`ENTRA_*` 4 + `SOCIAL_*` 9） |
| **删除（配置面）** | env **5 键**（`OIDC_*`） |
| **不变** | 官方 `/api/auth/*` 其余端点 · `/api/auth/me` 形状 · 会话与 401 四分类语义 |

## 8. UI-UX 变动总览

| 面 | 变动 |
|----|------|
| 登录页 | **底部文本链接 + 整页备选态退役** ⇒ 表单下方 provider **文字链一行**（按启用集 · 项间 1×12 竖线 · **无「或」分隔线**） |
| 页面结构 | **不变**（全屏双栏 42/58 · 无白卡 · 骨架镜像表单列 · 语言切换右栏右上角）—— 守主 design §2.6 **R13**「不改页面结构」 |
| 新视觉值 | **仅 1 个间距值**：主按钮 ↔ 链接行 **16px**（照 DeepSeek 实测）；其余复用本页既有档（**不新增件 · 不新增 token**） |
| 失败态 | 复用既有 inline `role="alert"` 行（**非 Alert 块**） |
| 审计页 | 「OIDC」分组标签随动作组删除而消失；新增「外部身份源」分组标签 |

## 9. 线框图

```text
┌─ 左：品牌栏 ─────────────┬─ 右：表单栏 ────────────────────┐
│ 品牌字 / tagline / 许可   │  登录                            │
│                          │  账号 [________________]         │
│                          │  口令 [________________]         │
│                          │  [        登录        ]          │
│                          │  Microsoft 账号 ｜ Google ｜      │
│                          │  GitHub ｜ 微信                   │
└──────────────────────────┴─────────────────────────────────┘
按启用集渲染：N=0 ⇒ 链接行整体不渲染 · N≥1 ⇒ 一行文字链（项间 1×12 竖线 · N=1 无竖线）
```

> ⚠ 主 design §10.2 的线框只画 **2 个**按钮（Google / GitHub）而 R10 实名单 = **3 社交 + 1 Entra** ⇒ 那张图是**示意**，本图以「按启用集渲染」为准（**F303** 处置项之一）。

## 10. 引用文件清单

**上游（本批真值来源）**：主 design `docs/designs/2026-10-08-m4c-account-and-access-governance-design.md`（§2.3 拆批 · §2.6 R1/R4/R10/R11/R13 · §2.7 件面 · §3.4 共享模块 · §5.1–§5.3 · §6.1 时序侧信道 · §10.2 线框）· `docs/05-identity-access.md` §3 · `docs/07-i18n-conventions.md` §3/§4 · `docs/08-data-model.md` §5

**代码锚点（实测）**
- 服务端：`apps/server/src/config/env.ts`(_:69-75/112-133_) · `apps/server/src/auth/better-auth.ts` · `apps/server/src/auth/identity.ts`(_:55/61_) · `apps/server/src/auth/password-verify.ts`(_:35/63/69_ 时序侧信道真锚点) · `apps/server/src/auth/plugins/ldap-credentials.ts`(_:116/155/203_) · `apps/server/src/auth/errors.ts`(_:15-16/58-59_) · `apps/server/src/http/meta.ts` · `apps/server/src/http/oidc-routes.ts`(删) · `apps/server/src/auth/oidc.ts`(删) · `apps/server/src/audit/actions.ts`(_:51-54_) · `apps/server/src/audit/audit.ts`(_:12-13_) · `apps/server/src/db/schema/governance.ts`(_:138_ `detail` jsonb) · `apps/server/src/app.ts`(_:132_)
- 前端：`apps/web/src/pages/Login.tsx`(_:46/90-91/160-172/202-206/222-231_) · `apps/web/src/api/auth.ts` · `apps/web/src/api/meta.ts` · `apps/web/src/auth/next.ts` · `apps/web/src/components/ui/UserMenu.tsx`(_:80-89_) · `apps/web/src/components/auth/RoleGuard.tsx`(_:38-41_) · `apps/web/src/api/client.ts`(_:343-359_)
- 脚本：`docs/smoke/scripts/m4b2-ui-redo-assertions.ts`(_:344-360_) · `docs/smoke/scripts/dogfood-all.ts`

**上游事实（`better-auth@1.7.5` / `@better-auth/core@1.7.5` 实测）**：`dist/social-providers/{google,github,wechat,microsoft-entra-id}.mjs` · `dist/social-providers/index.d.mts`（键名清单）· `dist/utils/email.mjs`（占位邮箱域）· `dist/api/routes/sign-in.mjs`(_:23/40/47/151_) · `dist/oauth2/link-account.mjs`(_:79_ 隐式链接门槛) · `dist/api/routes/`（无 provider 清单端点）

## 11. 8 维自检（首稿自评 · 2026-10-12 · 本仓口径 = 标准 4 维 + 深度 4 维）

### 11.1 首稿自评（修后）

| 组 | 维度 | 评分 | 说明（证据） |
|----|------|:--:|------|
| 标准 | 完整性 | 9.5 | 骨架与同仓先例（M4c-2 批 design）逐节对照**无缺章**：拍板结果 / 服务端 / 前端 / 判据与回归面 / 接口变更总览 / UI-UX 变动 / 线框 / 引用清单 / 自检 / 修订记录 / F 登记齐备；并**补主 design 缺口**「等价完成判据」（§3.7） |
| 标准 | 一致性 | 9.5 | 件面数字（**改造 21 · 新建 2 · 删件 4**）贯穿 Scope / §1 / §3.5；i18n 算术自洽（`login` 16 → 18 · 全仓 701 → 699）；F303–F305 与 §13 / `docs/README` §6.1 一致；线框（§9 2×2）与 §4.1 / §4.2 **三向一致** |
| 标准 | 清晰度 | 9.5 | 每处改 / 删 / 增均带件名 + 行区间；官方行为一律带 `dist` 文件:行号；决策以「拍板 / 代价」两列成表 |
| 标准 | 可实施性 | 9.5 | 删件 / 改造逐件清单（含命中数）+ env 键名与 fail-fast + 端点出参形状 + 交互三步（含官方入参名）+ 测试分层（手段 / 网络条件）+ 判据判定手法 |
| 深度 | 设计纯粹性 | 9.4 | 零新件 / 零新视觉值（复用官方 `separator` / `button`）· 退役彻底（不做兼容层）· 端点不新建文件、不加分组字段 · 非目标 9 项**明确说不**（含连通性预探测） |
| 深度 | 边界覆盖 | 9.4 | 空启用集（0 / 1 / N）· 未启用 vs 不可达 · 失败两态（POST 失败落 inline / provider 侧失败落新标签页）· loading / authed / anon 三态 · 二次登录复用 · 占位邮箱不参与链接 · 回归面五项 · blast radius（注释腐化 4 处 · 测试基线变化 · M4b-2 证据脚本 2 断言） |
| 深度 | 实施精度 | 9.4 | 路径全相对 · 键名 / 端点形状 / 官方入参名给出 · 审计写入点与 `detail.provider` 给出 · 行区间锚点给出 · 测试分层给出手法与网络条件 |
| 深度 | 跨平台 | 9.5 | **无平台分支**（env + 浏览器行为三平台一致）⇒ Windows / macOS / Linux 行为同一；无路径 / 权限 / 信号 / 编码差异（§5 显式声明） |

**标准均分 9.50 · 深度均分 9.425（9.43）· 综合 9.46 ≥ 9 ✓**

### 11.2 首稿自检发现与处置（8 项 · 本轮回填 · 修前 综合 9.33）

| # | 严重度 | 位置 | 问题 | 处置 |
|--:|:--:|------|------|------|
| 1 | 🔴 | §11 | 首稿写「自评见 §11.1」而 §11.1 **不存在** = 自指空引用 | 本轮回填 §11.1 / §11.2 |
| 2 | 🔴 | §3.5 · §6 | **件面漏算**：L6 新增 dogfood 脚本须改 `docs/smoke/scripts/dogfood-all.ts` 的 `SCRIPT_NAMES`，且新脚本本身是**新建件** ⇒ 原「改造 19 · 新建 0」漏算 | 订正为 **改造 20 · 新建 2**，贯穿 Scope / §1 / §3.5 |
| 3 | 🟡 | §2.2 Q1 | 代价栏「删 ≈25 行 / 增 ≈15–25 行」= **估算值**（违「无估算值」） | 改**实测行区间**（4 处 · 合计 26 行） |
| 4 | 🟡 | §5 | 未声明**跨平台影响**（本仓硬偏好） | §5 新增「跨平台影响」行 |
| 5 | 🟡 | §3.3 | 未写**取数时机与兜底**（端点不可达时如何） | 新增「取数时机」行 |
| 6 | 🟡 | §3.6 | 审计 `detail` 未给字段名 | 明确 **`detail.provider`**（值 = 官方 provider 键名） |
| 7 | 🟡 | §3.4 / §3.7 | 「三通道」与「四通道」**同概念两名** | 统一为**四通道**（本地 / 目录 / Entra / 社交） |
| 8 | 🟡 | §5 | 「inline 失败态不变」表述不准（本批新增一个错误来源） | 改为「401 四分类语义不变；失败行沿用既有 inline `role="alert"`（新增一个错误来源，不引入 Alert 块）」 |

### 11.3 grilling 第 1 轮后重评（v0.2 · 2026-10-12）

| 维度 | v0.1 | v0.2 | 变化 | 说明 |
|------|:--:|:--:|:--:|------|
| 标准 · 完整性 | 9.5 | 9.5 | — | §14 grilling 定案 + §3.4 已知风险入档 |
| 标准 · 一致性 | 9.5 | 9.5 | — | Q2-R3 订正**留痕**（§2.2 标注「已被 G3 订正」）· §4.1 / §4.2 / §14 三向一致 |
| 标准 · 清晰度 | 9.5 | 9.6 | ↑0.1 | 文案**定值**（不再只给「改口径」）· 入参**取/不取 `disableRedirect`** 明确 |
| 标准 · 可实施性 | 9.5 | 9.6 | ↑0.1 | 回调落点、审计口径（建号 + 登录两笔）、失败两态边界全部落地 |
| 深度 · 设计纯粹性 | 9.4 | 9.5 | ↑0.1 | G2 明示「**不加第二套链接机制**」+ 风险入档（不藏、不敷衍） |
| 深度 · 边界覆盖 | 9.4 | 9.6 | ↑0.2 | 不可达两态（POST 阶段 / 已跳转后）细分；同页 vs 新标签页取舍已定 ⇒ **消 F5 缺口** |
| 深度 · 实施精度 | 9.4 | 9.5 | ↑0.1 | 校验点（G1 拒启）、跳转落法、审计 `detail.provider` 全给出 |
| 深度 · 跨平台 | 9.5 | 9.5 | — | 仍无平台分支（同页跳转亦无平台差异） |

**标准均分 9.55 · 深度均分 9.525（9.53）· 综合 9.54**（v0.1 = 9.46 · ↑0.08）

### 11.4 grilling 第 2 轮后定稿重评（v0.3 · 2026-10-12）

| 维度 | v0.2 | v0.3 | 变化 | 说明 |
|------|:--:|:--:|:--:|------|
| 标准 · 完整性 | 9.5 | 9.6 | ↑0.1 | 两轮 grilling 定案（§14 G1–G12）· L7 验收清单成文 · 占位邮箱落点写透（含「为何服务端无代码」） |
| 标准 · 一致性 | 9.5 | 9.5 | — | 件面**再订正一次**（G9 砍掉服务端拦截 ⇒ 改造面不变，因该件本就在「注释订正 + 占位邮箱规则」内）· §3.4 / §4.4 / §14 三向一致 |
| 标准 · 清晰度 | 9.6 | 9.6 | — | 占位邮箱判定**落点明确**（前端 `.invalid`）· 显示名口径明确 |
| 标准 · 可实施性 | 9.6 | 9.6 | — | 验收 5 项 + 审计字段惯例（`{ provider, via }`）+ 前端判定式全给出 |
| 深度 · 设计纯粹性 | 9.5 | 9.6 | ↑0.1 | **G9 = 三刀法命中**：砍掉服务端冗余拦截（官方已满足）· 不加第三套规则（显示名 / 链接） |
| 深度 · 边界覆盖 | 9.6 | 9.5 | ↓0.1 | 边界面未再扩（本轮主要收敛机制）；如实下调 —— 不改动即不加分 |
| 深度 · 实施精度 | 9.5 | 9.6 | ↑0.1 | 占位判定式 / 审计字段 / 验收项 / 截图数与前置全部落到可执行 |
| 深度 · 跨平台 | 9.5 | 9.5 | — | 无平台分支（前端判定 + env 装配，三平台一致） |

**标准均分 9.575（9.58）· 深度均分 9.55 · 综合 9.56**（v0.2 = 9.54 · ↑0.02）

### 11.5 技能对账轮 + UI 逐条评审轮后重评（v0.4 · 2026-10-12）

**技能对账（本批 UI 定稿实际使用的技能 · 各步骤落到哪个产物）**

| 技能 | 用到的环节 / 步骤 | 落到哪个产物 |
|------|------------------|-------------|
| `ui-grammar-alignment` | 步骤 1「先读参照页源码 → **件复用清单**」· 步骤 3「变体只在立场上分」· 步骤 4「原型实跑 + CDP 截图 · 产物不进仓」· 步骤 5「**停点拍板**」· 陷阱 5「复用件前 grep 消费者：**零消费者须披露**」 | §4.3 件复用清单 · §4.6 定稿 · 原型 + 截图 · ~~`FieldSeparator` 零消费者披露~~（**v0.5 撤回**：分隔线去掉后不再消费该件） |
| `ui-design-review-walkthrough` | 清单切法「**页面 × 壳 × 跨面**」= 5 条 · 每条**四段式** · **汇报期只读不写** · 高价值靶点（首帧/加载态 · 门槛不一致 · 数据面缺口） | §4.6（P1–P13）· 本轮 3 处文档补写 |
| `alignment-check-method` | 「**件与键必须 grep 真实存在**」（防幽灵件/幽灵键）· 「**几何结论用 `getBoundingClientRect`/`getComputedStyle` 复核**，vision 判 px 不可信」· 「展原型须在**同一条回复**给 `open` 命令」 | §4.3 件来源列 · §4.6 实测几何行 · 交付报告 |
| `portal-ui-design` | 环节 3「**design 只记令牌语义，css 落实现**」· 红线「定稿自检 ❌ 凭印象说够了 → ✅ 查表跑档位判据」 | 全文禁 class/px · 本节打分 |
| `self-review-scoring` / `design-doc-scoring` | 8 维逐维打分 + 呈现 delta（本仓口径 = 标准 4 + 深度 4） | §11.1–§11.5 |

**重评（v0.3 → v0.4）**

| 维度 | v0.3 | v0.4 | 变化 | 说明 |
|------|:--:|:--:|:--:|------|
| 标准 · 完整性 | 9.6 | 9.7 | ↑0.1 | UI 定稿成节（§4.6）· 3 处文档补齐（骨架镜像 / 错误互斥 / 件面 +1）· 原型与实测几何入档 |
| 标准 · 一致性 | 9.5 | 9.6 | ↑0.1 | 件面 **21** 贯穿 Scope / §1 / §3.5 / §11.1 / §13 · G9 → P7 丙 的订正在 §3.4 与 §4.6 **双向留痕** |
| 标准 · 清晰度 | 9.6 | 9.7 | ↑0.1 | 入口块**指名到件与档**（分隔线/按钮/内容/排列/位置五行）· 实测几何带来源口径 |
| 标准 · 可实施性 | 9.6 | 9.7 | ↑0.1 | L7 补 3 项断言（溢出 / 骨架占位 / 错误互斥）· 失败行落点与文案定值 |
| 深度 · 设计纯粹性 | 9.6 | 9.6 | — | P3 纯文字（拒引品牌资产）· P10/P12 写为明确非目标 —— 无新增机制 |
| 深度 · 边界覆盖 | 9.5 | 9.7 | ↑0.2 | 溢出风险**实测解除**（富余 359px）· 骨架**条件渲染**（关态不多画）· 两条错误互斥 · 条 4 留痕 |
| 深度 · 实施精度 | 9.6 | 9.7 | ↑0.1 | 件/档/位置/文案/落点全指名 · 原型路径与截图可回溯 · 实测数字带来源 |
| 深度 · 跨平台 | 9.5 | 9.5 | — | 仍无平台分支（前端件 + env 装配 · 三平台一致） |

**标准均分 9.675（9.68）· 深度均分 9.625（9.63）· 综合 9.65**（v0.3 = 9.56 · ↑0.09）

### 11.6 v0.5 入口形态翻转轮后重评（2026-10-12）

**本轮实际使用的技能 / 方法（对账）**

| 技能 / 方法 | 用到的环节 | 落到哪个产物 |
|------|------------------|-------------|
| `alignment-check-method` | 「件与键必须 grep 真实存在」→ 本轮**扩到上游 registry 源**（拉 shadcn 官方登录块与 `field` / `button` / `input` / `card` / `separator` 件源，逐条对 class 真值，不靠描述页）· 「几何结论必须 `getBoundingClientRect` / `getComputedStyle` 复核」→ 本轮**加像素采样**（下划线有无）· 「vision 判 px / 细字不可信」→ 本轮复核 4 条误报**逐条实测反证** | §4.1 实测几何 · §4.6 对照留痕 · 交付报告 |
| `self-review-scoring` | 读全文 + 逐维打分 + delta 呈现 + **换靶 ⑨ 表 / 图 / 真码三向一致**（用于 §9 线框 ↔ §4.1 件与档表 ↔ 真码 `Login.tsx`）· **换靶 ⑦ 同一量跨节对照**（本轮扫出 8 处编辑涟漪 与 1 处跨节数字并存） | 本节 |
| `ui-grammar-alignment` | 陷阱 5「复用件前 grep 消费者：**零消费者须披露**」→ 本轮**反向适用**：分隔线去掉 ⇒ 本页**不再消费** `FieldSeparator` ⇒ 原披露**撤回** | §4.3 · §4.6 |

**重评（v0.4 → v0.5）**

| 维度 | v0.4 | v0.5 | 变化 | 说明 |
|------|:--:|:--:|:--:|------|
| 标准 · 完整性 | 9.7 | 9.8 | ↑0.1 | 新增 **§4.6 P14–P17** + **官方 / 大厂对照留痕**（shadcn 5 块 registry 源码 · DeepSeek 实测）+ **F306**；入口块档由 5 行扩到 6 行（加「分隔」行） |
| 标准 · 一致性 | 9.6 | 9.6 | — | 件 / 键 / 几何 / 名字跨节逐节对平（§1 / §2 / §3.3 / §3.5 / §4.1 / §4.4 / §5 / §6 / §8 / §9 / §12 / §13 / §14 全扫 **0 残留**）；**F306 的跨文档冲突已登记并给处置**（不藏 · 不静默） |
| 标准 · 清晰度 | 9.7 | 9.7 | — | 入口形态 = 「件 / 档 / 分隔 / 排列 / 位置」五行 + 依据列（带大厂实测锚点）；「下划线有无」这类观感争议**用像素证据**钉死 |
| 标准 · 可实施性 | 9.7 | 9.8 | ↑0.1 | 新增**实现约束**「骨架链接行位须用**同一 16px 间距**（否则 6px 跳动）」+ i18n 改名与键数订正 + 「**仅 1 个间距值**」口径（原「零新视觉值」） |
| 深度 · 设计纯粹性 | 9.6 | 9.7 | ↑0.1 | **零新件**且**少消费两件**（不再是 `FieldSeparator` / `button` 的消费者）· 唯一新增值 = 1 个间距 · 三项不采纳**各带理由**（内嵌 iframe 违单轨 / 品牌图标 / 自动建号告知） |
| 深度 · 边界覆盖 | 9.7 | 9.7 | — | 新增边界：**0 项不渲染 · 1 项无竖线 · 换行边界（ZH 250 / EN 294 < 336）· 骨架零跳动实测**；未扩新机制面 |
| 深度 · 实施精度 | 9.7 | 9.7 | — | 几何全带来源口径（含**像素级**下划线复核读数）· 实现约束与 §14 G6 文案改动逐条落地 |
| 深度 · 跨平台 | 9.5 | 9.5 | — | 仍**无平台分支**（前端件 + env 装配，三平台一致） |

**标准均分 9.725（9.72）· 深度均分 9.65 · 综合 9.69**（v0.4 = 9.65 · **↑0.04**）

**本轮问题清单（自检抓出 · 全部同轮处置）**

| # | 严重度 | 位置 | 问题 | 处置 |
|--:|:--:|------|------|------|
| 1 | 🟡 | §1 / §3.3 / §4.4 / §11.5 / §14 | **v0.5 编辑涟漪 8 处**：目标行「或 + 按钮组」· 取数时机「不渲染按钮组」· 契约 C3 与 §3.3 出参「按钮序」· 交互表「点按钮」· 键数单元格残留 `+6`（应 `+5`）· §11.5 零消费者披露未撤回 · §14 G6「按钮」文案 | **全文档关键词扫描后逐处清** ⇒ 残留 **0**（扫 `按钮组` / `orDivider` / `企业账号` / `2 列网格` / `FieldSeparator` / `162` / `单列全宽`） |
| 2 | 🟡 | §13 F306 | 主 design **4 处**口径与本批冲突（R13 行 + 3 处指针） | 登记 **F306** + 处置写明（随实现批就地订正 · G8 口径）· `docs/README` §6.1 号段已同步 |
| 3 | 🟡 | §4.6 | 同一量跨节并存两值（富余 **359**（v0.4）/ **468**（v0.5）） | 加**口径注**（各标轮次 + 指向 §4.1） |
| 4 | ⚪ | §11.1 / §11.5 | 历史打分行仍含旧口径数字（`16 → 18` / `2×2 线框` / `359px`） | **保留为留痕**（不删历史）；**本节为现行口径** |
| 5 | ⚪ | §7 / `docs/07` | `docs/07` §3.4 注记 + F305 两处订正**尚未落笔**（归实现批 · G8 / P11） | 已在 §4.4 与 §12 写明；**非本轮漏项** |
| 6 | ⚪ | §4.4 | 键账终值目前是**算术值**（+5 / 698），逐键回读只在实现期可做 | 已写明「以实施期实测为准」口径 |

**诚实标注**：本轮 **+0.04 来自「决策留痕 + 对照证据补齐」**，不是功能变化；上表 8 处编辑涟漪**由本轮改动引入或暴露**，已在**同一轮**清零 ⇒ 既不计为质量提升，也不倒扣 v0.4 的 9.65。

## 12. 修订记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v0.8 | 2026-10-12 | **实现期 T5 轮 · 设计缺口补写（写入点定案）+ 件面 23 → 24** —— §3.6 未定「建号信号来源」⇒ 定案：**官方 `account.create.after` 钩子**（`providerId` 原生在场 · 与 `with-hooks.mjs` 全模型分派一致）+ 判据「该用户无其他 account 行」（链接 ≠ 建号）· `auth.login.success` 走**包装层**（响应 `Set-Cookie` → token 查库，复用 device/token 手法）· 备选（`createdAt` 启发式 / `validateUserInfo` 校验缝）**未采 + 写明理由** · **删除面（oidc 组 / 2 错误码 / i18n 2 键）明确归 T6** · **件面 23 → 24**（`doc-claims-check.ts` 行锚 `216 → 268` · 同 F224/M23 先例）· 8 维 **9.69 不变** |
| v0.7 | 2026-10-12 | **实现期 T4 轮订正（件面 22 → 23）** —— `apps/server/src/http/admin-users.test.ts` 补入件面（T4 的「占位邮箱出参归一」用例落点 · §3.5 表 #23）⇒ Scope / §1 ⑥ / §3.5 标题 / F303 两处同步；F303 的测试件计数改**枚举式**（5 件，可逐条回读）· 8 维 **9.69 不变** |
| v0.6 | 2026-10-12 | **实现期 T2 轮订正（F307 + 件面 22）** —— ① **F307**：官方 404 `code` 真值 = **`PROVIDER_NOT_FOUND`**（原 `oauth_provider_not_found`）⇒ §3.6 / §3.7④ / §6 L2 / §6 L7③ 四处订正（**正反双证**：真服务 `curl` + 官方源 `error/codes.mjs:14`；旧串 dist 内零命中）· 前端不依赖该串 ⇒ 零行为影响 ② **件面 21 → 22**：补 `apps/server/src/auth/better-auth.test.ts`（L1/L2 单测 · §3.5 表 #22）⇒ Scope / §1 ⑥ / §3.5 标题 / F303 两处同步 ③ 8 维 **9.69 不变**（纠错轮 · 设计实质未变） |
| v0.5 | 2026-10-12 | **入口形态二次翻转（用户 4 项拍板「按推荐」）** —— ① provider 入口：**按钮组 ⇒ 文字链一行**（13px 沿本页链接档 + 常态下划线 + `hover:text-foreground`）② **「── 或 ──」去掉** ⇒ **P1 甲 作废** + `FieldSeparator` 零消费者披露**撤回**③ `providerMicrosoft`「企业账号」⇒ **「Microsoft 账号」**（撞名随之消解 ⇒ subtitle 不动）· 新增键 **6 → 5**（`login` 16 → 17 · 全仓 701 → **698**）④ 入口失败行落 **链接行之下（E2）** ⑤ 间距 **16px**（仅主按钮↔链接行）⑥ 分隔 = **1×12 CSS 竖线** ⑦ 新增 **§4.6 P14–P17 + 官方/大厂对照留痕**；**P2 甲 / Q1-R3 / 笔 2 / 笔 3 作废留痕** ⑧ 新几何（入口块实增 **34** · 富余 **468** · 骨架零跳动）⑨ 新登记 **F306**（主 design R13 措辞 4 处过期）· 原型换代 `proto-m4c3-login-links.html` · **§11.6 重评 8 维 9.69**（v0.4 = 9.65）|
| v0.4 | 2026-10-12 | **UI 定稿（逐条评审 5 条 · P1–P13 全采 · 用户「按推荐来」）** —— 入口块**指名到件与档**（分隔线 = 官方 `FieldSeparator`（`apps/web/src/components/ui/shadcn/field.tsx:145` · **v0.5 已作废**）/ `Button variant="outline"` / 纯文字 / 2 列网格 / 表单下方）· 骨架**同步镜像入口块 + 随启用集条件渲染**（闭切态跳动）· **两条错误互斥** · 占位邮箱改**服务端出参归一**（**订正 G9 甲**）· `AdminUsers.tsx` 入件面 ⇒ **改造 21** · 断点不引入（**实测 1366×768 富余 359px 无溢出**）· 新增 **§4.6 / §11.5 技能对账轮** · 8 维 **9.65** · 原型证据 `apps/web/proto-m4c3-login-providers.html`（未跟踪不入仓） |
| v0.3 | 2026-10-12 | **定稿（grilling 第 2 轮 G9–G12 · 用户「按推荐来」）** —— ① 占位邮箱**服务端零新增拦截** + 前端按 `.invalid`（RFC 6761）显「—」⇒ **砍掉一件服务端改造**（R11 实质由官方满足，已写明）② 显示名采官方缺省 ③ 审计 `external` 组 + `ldap` 组不动（史实连续）④ L7 验收 **5 项清单**定稿 —— **grilling 前沿已空** · §11.4 定稿重评 **9.56** |
| v0.2 | 2026-10-12 | **grilling 第 1 轮定案（G1–G8 · 用户「按推荐来」）** —— `ENTRA_TENANT_ID` 改**必填**（拒启校验）· 自动链接保持官方默认 + **风险入档**（§3.4）· 入口转**同页**（**订正 Q2-R3**；顺带消 F5 缺口）· 回调严格走 `next` · 登录成功补记 `auth.login.success` · 三处文案定值 · 新 smoke 脚本不入 CI · F303/F305 随实现批订正 · 新增 **§14** + **§11.3** 重评 |
| v0.1 | 2026-10-12 | **首稿** —— 立项对齐 Q1–Q4 定案（用户「按推荐来」）+ 写入级契约 C1–C4 定案；承主 design §5 详章；退役面逐件实测（**删件 4 / 改造 20 / 新建 2**）· 件面订正 · §3.7 等价完成判据（补主 design 缺口）· §6 测试策略 L1–L7 · 登记 **F303–F305** · 承 **F298** 关账（Q3 甲） |

## 13. 实施期发现与处置（F…）

| 号 | 面 | 问题（真） | 处置 |
|----|----|-----------|------|
| **F298** | 设计 ⇄ 实现偏差（登出落点） | 登出落点**不确定**：主 design / 批 design §4.4 明文「登出回首页 `/`」· 应用侧真码实测为 `UserMenu.tsx:86-88` 的 `invalidateCache(); await refresh(); navigate('/', { replace: true });` —— 即 **navigate 在 `refresh()` 之后**（竞态窗正在此处；`{replace:true}` 已在场）；但实测两态都有（2026-10-10 逐份 `.log` 回读订正：换断言前 **1 次**落 `/login`；换新断言后 **3 次**跑均落 `/`）—— 竞争者两条路径均在真码场（`RoleGuard.tsx:38-41` 的 anon 跳 `/login?next=` · `client.ts:343-359` 401 分流 ② 档 → `AuthProvider.tsx:119`），**「哪条最后生效」属执行序竞态** | **断言侧已修（2026-10-10）**：`m4b2` G5 改按设计契约（不留在受保护路由 · 复用 `next.ts` 的 `isProtectedRoute` 单点 + 三档角色面归零 + 用户区回登录入口 + `/me` 401）· 隔离复跑 **24/0**。**产品侧 = 本批 Q3 甲**（统一落 `/` · `UserMenu.tsx:80-89` 一处调序）+ **探针正反双证** ⇒ 本批**关账** |
| **F303** | 主 design 估算层失真 | 三处：① **§2.7 件面**写「改造 3」，实测**改造 24 件 · 新建 2 件**（**测试件 5** = `env.test.ts` / `identity.test.ts` / `meta.test.ts` / `better-auth.test.ts`（T2 轮 +）/ `admin-users.test.ts`（T4 轮 +）· 注释订正 4；**+`AdminUsers.tsx` 由 UI 评审轮 P7 丙 补入**）② **§10.2 线框**只画 2 个按钮，实名单 = 3 社交 + 1 Entra（示意未标注）③ **§2.3 表** M4c-3 行对齐要点未含测试策略 ⇒ 主 design 缺「等价完成判据」（M4c-1 有 R16，M4c-3 无） | 本批承载真值（**§3.5 件面 · §9 线框 · §6 测试策略 · §3.7 判据**）+ **主 design 三处就地订正**（§2.7 数字订正为「删件 4 · 改造 **24** · 新建 2」· §10.2 线框加「示意 · 按启用集渲染」注 · §2.3 行补判据指针）；实现 Task 见批 plan |
| **F304** | 主 design 引用锚点失效 | §6.1 写「本仓自绘端点已有同款处理（`plugins/ldap-credentials.ts:393` 的固定假哈希校验）」—— **实测该文件仅 267 行**（行号越界）；真身 = `apps/server/src/auth/password-verify.ts:35`（`DUMMY_PASSWORD_HASH`）+ `:63` / `:69`。**且该处理挂在官方 `password.verify` 存值前缀分派上，不依赖任何 OIDC 端点** ⇒ §6.1「须跟着迁移」的前提**不成立**（本批零迁移风险） | 本批**只订正引用**（主 design §6.1 行号改 `auth/password-verify.ts:35/63/69` + 注明「不随 OIDC 退役而迁移」）· **不改该逻辑**（零行为变更） |
| **F305** | `docs/07` §3 键账过期 | §3 正文写 `users`（用户管理 · 已落地 **63 键**）与 `account`（自助改密 · 已落地 **13 键**）；**实测**（逐键枚举）`users` = **65** · `account` = **12**（zh / en 双向一致）—— 前者落后头部/§3.3 的 65，后者多算 1 | 本批**同批订正**（§3 正文两处数字改实测值 + §3.3 注记 + 修订行），因本批本就要动 `docs/07`（`login` 组键账） |
| **F306** | 主 design 形态措辞过期 | 主 design **§2.6 R13** 写「现有右栏表单下方**加分隔线 + 按钮组**」，另有 **3 处**同口径指针（§3 入口指针 · §5.1 小标题 · §10.2 线框）—— **v0.5 已改为「provider 文字链一行 · 无分隔线」** ⇒ 主 design **4 处**与本批 design 冲突（R13 的「**不改页面结构**」仍守） | **本批承载真值**（§4.1 件与档 · §4.6 P14–P17 · §9 线框）+ **主 design 4 处就地订正**随实现批文档笔（同 **F303/F304 · G8** 口径）；**同步面**：README §6.1 号段（本次已同步）· 证据 §5 与 `docs/00` §5 子行随实现批 / 收口批补（与 F303–F305 同口径） |
| **F307** | 设计 ⇄ 真码（官方错误码） | 批 design 四处（§3.6 / §3.7 ④ / §6 L2 / §6 L7 ③）把「provider 未装配」的官方 404 `code` 写作 **`oauth_provider_not_found`**；**实测**（T2 靶测试 + 真服务 `curl`）真值 = **`PROVIDER_NOT_FOUND`**（body `{"message":"Provider not found","code":"PROVIDER_NOT_FOUND"}`），且官方源 `@better-auth/core@1.7.5` `dist` 内 **`oauth_provider_not_found` 零命中**、`PROVIDER_NOT_FOUND` 见 `error/codes.mjs:14` / `codes.d.mts:27`（**正反双证**） | **本批同批订正**（design 4 处 + plan 3 处 + 测试期望改 `PROVIDER_NOT_FOUND`）· ⚠ **无行为影响**：前端**不按官方码分支**（失败态统一走本仓 `login.providerFailed` 文案 · §4.1 交互第 3 步）⇒ 纯文档口径纠错；**同步面**：README §6.1 号段（本次已同步）· 证据 §5 与 `docs/00` 随实现批 / 收口批补 |

## 14. grilling 轮定案（G1–G12 · 两轮全采 · 2026-10-12 · 用户「按推荐来」）

### 14.1 第 1 轮（G1–G8）

| # | 议题 | 定案 | 代价 / 留痕 |
|--:|------|------|------|
| G1 | Entra 租户是否收紧必填（**安全**） | **必填**：`ENTRA_ENABLED=true` 且 `ENTRA_TENANT_ID` 为空 ⇒ **拒启**（缺省 `''`） | 部署须先取得租户 ID；`env.ts` **+1 校验** |
| G2 | 自动链接适用范围（**安全**） | **保持官方默认**（不加第二套机制）+ **风险入档**（§3.4 已知风险） | 残余风险如实登记（本地账号可被同邮箱第三方接管 · 收紧口 = 官方 `requireLocalEmailVerified`） |
| G3 | 入口跳转形态 | **同页跳转**（SDK 默认跳 · 不取 `disableRedirect`） | **订正 Q2-R3**（原「新标签页 + 可关」）；**顺带消 F5 缺口** |
| G4 | 回调落点 | **严格走 `sanitizeNext` 的 `destination`**（不经 `/?oidc=success` 式旁路） | 零（复用既有单点） |
| G5 | 外部通道登录审计 | **补记 `auth.login.success`**（`detail.provider`）；建号另记 `external.provisioned` | 包装层 +1 补记分支（同 `sign-out` 先例） |
| G6 | 三处文案 | **甲（最小改）**：`subtitle`「使用企业账号登录」· `feature3`「企业目录账号直连（LDAP / Entra ID）」· 入口文字「**Microsoft 账号** / Google / GitHub / 微信」（**v0.5 改名** · 原「企业账号」） | 双语细校面最小（只把退役的 OIDC 换成正主） |
| G7 | 新 smoke 脚本是否入 CI | **不入**（沿用 CI 口径：6 门禁 + build + migrate + test） | 无；靠批验收人工跑 + 证据留档 |
| G8 | F303–F306 订正时点 | **随实现批文档笔**（不单开一笔） | 「已订正」状态晚于 design 定稿（§13 已写清） |

> 第 2 轮前沿见会话记录；本轮 8 项全部落进 §3.1 / §3.4 / §3.6 / §4.1 / §4.2 / §4.4 正文，**无遗留未决项**。

### 14.2 第 2 轮（G9–G12 · 定稿轮）

| # | 议题 | 定案 | 代价 / 留痕 |
|--:|------|------|------|
| G9 | 占位邮箱口径落在哪一层 | **甲**（⚠ **已被 UI 评审轮 P7 丙 订正** 为「服务端出参归一」· 见 §3.4 / §4.6）：服务端**零新增拦截**（只加共享识别函数 + 单测，不改建号行为）+ 前端按 **RFC 6761 保留 TLD `.invalid`** 判定显「—」 | **砍掉一件服务端改造**（R11 实质由官方满足：`emailVerified:false` 不参与链接 · 占位串天然唯一不撞 `user_email_unique`）；文档须写明「服务端无代码 ≠ 漏实现」 |
| G10 | 显示名是否额外归一 | **甲**：`user.name` **直接采官方缺省**（provider profile） | 各 provider 风格差异如实接受（本批无改名入口） |
| G11 | 审计组新增 vs 合并 | **甲**：新增 **`external` 组**（覆盖 Entra / Google / GitHub / WeChat）+ **`ldap` 组不动** | 史实连续（历史行已有 `ldap.provisioned`）；审计下拉 +1 项 · 字段沿用 `{ provider, via }` |
| G12 | L7 手工实测验收清单 | **全采①–⑤**（关态 / 开态 / 误配降级 / F298 连续 5 次登出落 `/` / 回调落点条件项）· 截图 2 张 | 需重启服务两次（关 / 开切 env）· ⑤ 依赖真凭据 |

> **前沿已空**：其余实现细节均由**既有惯例**决定（审计字段 `{ provider, via }` · `docs/07` 落地注记顺号落 §3.4 · 新 dogfood 脚本按批序追加 `SCRIPT_NAMES` 末尾 · 迁移 0）⇒ **转定稿**。
