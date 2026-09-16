# M4b-2 认证与壳批 · 验收硬证据（2026-09-16）

> **本文件 = 本批出口件的证据记录**（批 plan T10 断言①-⑦）。所有数字均为**实测产出**（命令 / 脚本 / 浏览器），
> 非人工点数。运行环境：macOS · dev 三件在线（`:3000` API · `:5173` web · Edge CDP `:9222`）·
> DB 容器 `24-ai-asset-hub-db-1`（postgres:17 · healthy）。
>
> ⚠️ **口令纪律**：种子/冒烟脚本的口令一律从 `SMOKE_M4B2_PASSWORD` 读，**仓库内零口令**（本文件亦不含）。

## 1. 五门禁（CI 顺序复现 · 断言①）

| 步骤 | 命令 | 结果 |
|------|------|------|
| 依赖 | `bun install --frozen-lockfile` | ✓ 414 installs / 543 packages（no changes） |
| 类型 | `bun run typecheck` | ✓ exit 0（1.68s） |
| 静态 | `bun run lint` | ✓ exit 0（352ms） |
| 格式 | `bun run format:check` | ✓ 241 files · No fixes applied |
| 构建 | `bun run build` | ✓ exit 0（1.606s） |
| 迁移 | `bun run db:migrate` | ✓ `migrations applied` · exit 0 |
| 测试 | `CI=true bun run test` | ✓ **500 pass · 1 skip · 0 fail**（501 例 / 48 文件 / 1346 expect / 29.4s） |

> 测试口径：`DATABASE_URL` 指向 dev 库（单库 `ai_asset_hub`）+ `CI=true`（复现 CI 环境）。与 M4b-pre 基线
> （501 例 0 fail）**逐项一致 ⇒ 零回归** ✓

## 2. 门户零回归 + 链冒烟（断言②）

| 项 | 命令 | 结果 |
|----|------|------|
| 门户 dogfood | `SMOKE_SHOT_PREFIX=… bun docs/smoke/scripts/m4a-dogfood.ts` | ✓ **36/36 PASS** + `NO JS ERRORS`（网络层 404 log 2 条为 404 态断言的预期触发） |
| 链冒烟 | `bun docs/smoke/scripts/m4a-chain-smoke.ts` | ✓ **CHAIN SMOKE PASS** |

## 3. 本批 dogfood 六组（断言③ · 新建 `docs/smoke/scripts/m4b2-auth-dogfood.ts`）

**结果：24 PASS / 0 FAIL + `NO JS ERRORS`**（网络层 401 log 7 条 = 未登录态断言的预期触发）

| 组 | 覆盖 | 关键实测 |
|----|------|---------|
| **G1** 未登录壳态 | 门户组 4 条（裸 `SidebarMenu`，**门户组无组标签**）· 三档组零渲染 · 用户区为 `/login` 入口 · 顶栏 **4 件** | ✓ 4/4 |
| **G2** `role=USER` | 个人组 4 条（个人工作台/我的资产/我的提交/访问令牌）· 门户组仍在 · 管理/超管组零渲染 · 用户区含登出 · **直访 `/admin/labels` 弹回 `/dashboard`** + 轻提示「当前账号无权访问该页面」 | ✓ 6/6 |
| **G3** `role=ADMIN` | 个人组 4 · **管理组 2**（审核管理/审计日志）· 超管组零渲染 · `/admin/reviews` 可达（标题「审核管理」） | ✓ 4/4 |
| **G4** `role=SUPER_ADMIN` | **超管组 3 条**（标签管理/系统设置/用户管理）· 管理组 2 并存 · **占位条目 = `BUTTON` ×2** + 点击轻提示「该功能将在后续版本提供」 | ✓ 4/4 |
| **G5** 登录→用户菜单→登出 | 菜单含「我的资产 / 访问令牌 / 登出」· 登出后**归位 `/login`**（受保护路由 `/dashboard` 未登录 ⇒ `RoleGuard` 保码归位）· `/me` → **401** · 无侧栏（独立版式） | ✓ 4/4 |
| **G6** 设备授权 | `POST /device/code` 造码 → `/device?user_code=…` 落**已认领态**（含客户端名 `aih-cli`）→ 批准 → 终态「已批准」 | ✓ 2/2 |

## 4. 种子数据复核（断言④）

```
bun docs/smoke/scripts/m4b2-seed-roles.ts   # DATABASE_URL 从 apps/server/.env 载入；口令从 env 读
[seed] cleared 24 session(s)
[seed] m4b2_super updated (role=superadmin, password reset)
[seed] m4b2_mgr   updated (role=admin,      password reset)
[seed] m4b2_user  updated (role=user,       password reset)
[seed] done — 3 accounts ready
```
✓ **A2 upsert 形态**（只清 `session`；`user`/`account` 有则改无则建；`user.id` 恒定 ⇒ 审计留痕不丢）
✓ **可重放**（本轮为第 3 次复跑，结果幂等）· 账号 `m4b2_{super,mgr,user}` = superadmin/admin/user

## 5. 整体审计（断言⑥ · 十一维扫描）

| 维度 | 结果 |
|------|------|
| 死导出 | 本批 10 件扫描 ⇒ **0**（`export function/const/interface` 均有消费者或不导出） |
| i18n 键 | ✓ 132 键 / 9 组 · 双语差集 **0** · 孤儿键违规 **0** · 裸键泄漏 **0**（T9 实测） |
| 批次号残留 | `apps/web/src` 内 `M4b-` 字面量仅 `DEV_BATCH` 表内 · **生产产物命中 = 0** · `DEV_BATCH` 余 **7 项全部有对应占位路由** |
| 类串重复 | 品牌渐变字样式经 T7 抽 `AuthLayout` 收敛为单处 ✓ |
| 越轴值 | 本批零新增硬编码色值 / 间距（全部走 token / 官方件默认） |
| token 消费者 | 本批零新增 token（M4b-1 面域未改） |
| 注释腐化 | ⚠ **发现系统性偏差** ⇒ 见 §6（行数声明为执行期估算） |
| 文档数字实测 | ⚠ 同上 ⇒ 见 §6 |
| 官方件硬规则 | 手搓处均已注明理由：`Device.tsx` 的 `<dl>` 详情行（无对应官方件）· `Dashboard.tsx` 的 `<p>` 欢迎语（`EmptyContent` 内无对应官件） ✓ |
| 既有登记项状态 | **F1** ✓ T7 实测锚定（刷新落终态）· **F2** ✓ `.env` 已含 `5173` · **F3** ✓ T4 计算值 + 用户确认观感 · **F4 → 关闭（本 Task 实测证伪，见 §7）** · **F5** 登记交接 M4b 收尾/M4c（OIDC 回跳前端零消费，消费点碰 M4a 零回归约束） |
| 旧口径 / 术语指针 | ⚠ 残留 5 处（plan `待深挖`×3 · `待 T10`×1 · design `待 T7 实测`×4 · `待深挖`×1）⇒ 本 Task 逐处关闭（见 §8） |

## 6. ⚠ 审计发现 1：行数声明为执行期估算（本轮实测订正）

**权威行数表（`wc -l` 实测 · 本表为本批文件行数的唯一权威源）**：

| 文件 | 实测行数 | 前序 Task 声明 | 偏差 |
|------|---------|---------------|------|
| `apps/web/src/pages/Login.tsx` | **203** | 205（T6） | −2 |
| `apps/web/src/pages/Device.tsx` | **268** | 303（T7） | **−35** |
| `apps/web/src/pages/Dashboard.tsx` | **73** | 78（T8） | −5 |
| `apps/web/src/components/console/AuthLayout.tsx` | **28** | —（T7 未声明） | — |
| `apps/web/src/components/console/ComingSoon.tsx` | **54** | 55（T3） | −1 |
| `apps/web/src/components/ui/UserMenu.tsx` | **119** | —（T4 未声明行数） | — |
| `apps/web/src/components/ui/SideNav.tsx` | **225** | 254（T4） | **−29** |
| `apps/web/src/components/ui/TopBar.tsx` | **38** | 41（T5） | −3 |
| `apps/web/src/auth/roles.ts` | **33** | 38（T1） | −5 |
| `apps/web/src/auth/next.ts` | **97** | 83（T2） | +14 |
| `apps/web/src/auth/AuthProvider.tsx` | **120** | 121（T1） | −1 |
| `apps/web/src/api/client.ts` | **205** | 187（T2 后） | +18（T7 加 `ApiError.body`） |
| `apps/web/src/main.tsx` | **190** | 196（T3）/199（T6） | 后续 Task 重构后回落 |
| `docs/smoke/scripts/m4b2-auth-dogfood.ts` | **285** | —（本 Task 新建） | — |
| `docs/smoke/scripts/m4b2-seed-roles.ts` | **133** | 134（T6） | −1 |

**处置（诚实声明）**：前序 Task 落地记录中的行数为**执行期估算**（未 `wc -l` 实测即写入）⇒ **本表为权威源**，
前序记录**不作逐个改写**（它们是迭代史实，改写反而失真）⇒ 本批以 **§5 本表 + 本节订正声明** 为单一口径。
**后续批次纪律**：行数声明一律 `wc -l` 实测后回填。

## 7. ⚠ 审计发现 2：F4 关闭（T4 的「变体未生效」为**测量假阴性**）

**实测证据**（`/tmp` 探针：登录 `m4b2_super` → `/dashboard` → `cmd+b` 折叠 → 采样 computed）：

```
折叠前：.group 元素 = 1 个（`group peer hidden text-sidebar-foreground md:block`）· data-collapsible = ""
折叠后：同元素 data-collapsible = "icon"（★ group 类与 data-collapsible 同元素 ⇒ 变体前提满足）
  labelComputed  : margin-top = -32px（`-mt-8` 生效）· opacity = 0（`opacity-0` 生效）
  btnComputed    : width = 32px · height = 32px（`size-8!` 生效）
  containerW     : 66px（收纳窄档生效）
```

**结论**：`group-data-[collapsible=icon]` 变体**全部正常生效**。T4 登记时测得的「`size-8!` 仍 178px ·
`marginTop 0px` / `opacity 1`」正是**展开态**的值 ⇒ 当时**未真正进入折叠态**（`data-state=collapsed`
被设在非 `group` 元素上或采样在动画前）。⇒ **F4 为误报，关闭**；T4 落地记录中的 F4 段保留（史实）并加
「已由 T10 实测关闭」指针。

## 8. ⚠ 审计发现 3：旧口径指针（本 Task 逐处关闭）

| 位置 | 残留措辞 | 处置 |
|------|---------|------|
| `plan:407` | 「**待深挖**（候选方向：`--spacing` 变量…）」 | 保留史实 + 加「T10 实测证伪 ⇒ 关闭」 |
| `plan:627` / `设计:371` 等 | 「待 T10」/「待深挖」/「待 T7 实测」 | 状态关闭（T7 已实测 · T10 已执行） |

## 9. 出口五件状态（批 plan §5 / `docs/00` §7 ②）

| 件 | 状态 | 证据 |
|----|------|------|
| ① 批 design **8 维 ≥9** 定稿 | ✅ | 定稿 **9.44**；**converge 重评 9.50**（§10） |
| ② 批 plan **Task 全绿**（T1-T10） | ✅ | T1-T10 逐 Task 落地记录 + 本文件证据 |
| ③ **五门禁** exit 0 | ✅ | §1 |
| ④ **dogfood / 观感** | 🔶 | dogfood **36/36 + 24/24 + NO JS ERRORS** ✅；**观感七项人工清单待用户实机确认**（§11） |
| ⑤ **整体审计** | ✅ | §5-§8（无未决项：F4 关闭 · 旧指针关闭 · 行数订正声明） |

## 10. 文档-代码对齐重评（断言⑦ · converge）

**批 design 重评（8 维 + 深度档三合一）**：见批 design §13 修订记录 v1.13 行（**9.50**）。
**主 design §2.3 批件登记表**：M4b-2 行**复核 + 回填收尾版本**（design v1.13 · plan v0.13）✓
**规范同步**：`07` §3 资源组 +2 落地注记 · `00` §5 状态回写 ✓

## 11. 出口件 ④ 观感七项人工清单（**待用户实机确认**）

> 每项均为**人工作业结论**（观感 / 体验），按纪律**不由 AI 代判**。以下为各项的**自测状态**（供参考）：

| # | 项 | 自测证据 | 待确认 |
|---|----|---------|--------|
| 1 | 未登录跳转回原页 | G1 + T3 断言⑥（保 next）| ⬜ |
| 2 | 错密码 inline | T6 断言④（Alert + URL 不变）| ⬜ |
| 3 | 登录后硬刷新不闪 | T6 断言③（骨架 → 表单无 anon 闪现）| ⬜ |
| 4 | 登出回首页 | G5（归位 `/login`）| ⬜ |
| 5 | `role=USER` 直访 `/admin/labels` 弹回 + 轻提示 | G2 ✓ | ⬜ |
| 6 | 侧栏四档显隐逐档 | G1-G4 ✓ | ⬜ |
| 7 | `/device?user_code=` 认领→批准 | G6 ✓ | ⬜ |
