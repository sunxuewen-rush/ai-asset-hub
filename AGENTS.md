# AI Asset Hub — Agent 工作指南

AI Asset Hub 是开源、可自托管的 AI 资产注册中心与市场：技能（skill）、MCP Server、
Agent 定义等资产的分发平台，带开放协作审核治理。

本文件指引 Agent 在本仓库如何工作。人类读者请走 `CONTRIBUTING.md`（M6 补齐）。

## 仓库结构

```
docs/                 设计与协议文档（见下方「文档体系」）+ smoke/（证据记录 · 冒烟/断言/体检脚本）
packages/protocol     资产协议 zod schema（单一事实源，M1 落地）
apps/                 server / web / cli（M1 落地）
.github/workflows     CI 流水线（push main + PR：校验门禁，见「测试与 CI 约定」）
README.md · LICENSE   Apache 2.0
THIRD-PARTY-NOTICES.md  第三方依赖与许可声明（从实际依赖树实测生成，非手抄）
```

## 文档体系

三层一表（规范 → 设计 → 计划 + 追踪表）。**各层的命名规则与细则不在本文件复述**
（本节只讲「去哪层找什么」，细则见各层 README —— 遵循「引用不复制」）：

| 层 | 位置 | 承载什么 | 细则 |
|----|------|----------|------|
| 规范层 | `docs/NN-*.md` | 系统形态（跨里程碑稳定） | [`docs/README.md`](docs/README.md) |
| 设计层 | `docs/designs/YYYY-MM-DD-<主题>-design.md` | 阶段决策（任务清单归属 plan 层） | [`docs/designs/README.md`](docs/designs/README.md) |
| 计划层 | `docs/plans/<里程碑>-<主题>.md` | 实现任务清单（含验收断言） | [`docs/plans/README.md`](docs/plans/README.md) |
| 追踪表 | `docs/00` §5 | 里程碑状态（**唯一源**） | `docs/00` §7 |

**引用链单向**：plan → design → 规范 §N。**引用不复制，防漂移** —— 本节即是这条原则的示范。

## 命令

_M1 阶段一 platform-core 落地后实测（2026-09-07）_：

| 任务 | 命令 |
|------|------|
| 依赖安装 | `bun install`（workspace 定义在根 package.json `workspaces`；构建脚本白名单在 `bunfig.toml` `trustedDependencies`；CI 用 `bun install --frozen-lockfile`，本地等价可加同参数） |
| 全仓校验 | `bun run typecheck` / `bun run lint` / `bun run format:check` / `bun run build` / `bun run test`（turbo 按包并行；测试 = bun test，需 `DATABASE_URL` 指向**已迁移**的库——先 `bun run db:migrate`） |
| 单包操作 | `bun run --filter=<pkg> <script>`（包：`@ai-asset-hub/protocol` / `server` / `web` / `cli`） |
| 起 dev 数据库 | `docker compose up -d db`（postgres，宿主端口 5433，连接串样例见 `.env.example`） |
| 迁移 | `bun run db:migrate`（forward-only；drizzle-kit 生成，迁移文件入库） |
| 种子 | `bun run db:seed`（幂等；设 `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` 建首管理员并直写 `role=SUPER_ADMIN`——M4-pre 后无角色表/权限码/global 空间） |
| 起本地服务 | `bun run --filter=@ai-asset-hub/server dev`（先按 `.env.example` 建 `.env`：`DATABASE_URL`/`SESSION_SECRET` 必填） |
| 写格式 | `bun run format`（biome 写入式，覆盖 `**/*.ts|tsx|json`；提交前用 `format:check` 校验，非 `format`） |
| 冒烟 / 断言 / 体检脚本 | `bun docs/smoke/scripts/<name>.ts`（链路冒烟 `m4a-chain-smoke` · dogfood 截图 `m4a-dogfood` · CDP 断言 · `doc-audit` 文档体检；用法见各脚本头注释） |

注：db 运维脚本（migrate/seed）只需 `DATABASE_URL` 环境变量，不走全量 env。

## 测试与 CI 约定（硬规则）

本地跑绿**不等于**通过——测试与 CI 的验证按下列口径；违反会在 CI 暴露
（2026-09-10 首条 CI 流水线两次踩坑沉淀：测试进程 env 污染 + turbo 吞 env）。

- **测试文件 MUST NOT 无条件改写 `process.env`**——bun test 多文件共享同一进程，无条件写入会污染
  后续所有文件（实证：`auth/oidc.test.ts` / `http/oidc-routes.test.ts` 无条件改 `DATABASE_URL`
  → CI 里 53 个文件的 `beforeAll` 集体连到并不存在的库）。需要 env 基线时用 `??=` 兜底，注入值优先。
- **任务依赖的环境变量 MUST 在 `turbo.json` 声明**——turbo 2 在 `CI=true`（GitHub Actions 默认
  设置）下启用严格环境模式，未声明在 `tasks.<task>.env` 的变量会被静默丢弃（实证：`DATABASE_URL`
  被吞 → 各测试文件退回 `??=` 兜底库名）。新增「任务依赖的 env」时同步声明。
- **测试 MUST 只依赖自己造的数据**——断言不得依赖「库里只有本文件的数据」（实证：
  `http/assets.test.ts` 的 type 过滤断言、`review/query.test.ts` 的队列总数硬编码 → 库里存在
  seed/demo 数据即失败）。按自己的 fixture / 前缀筛出目标子集后再断言，或显式构造所需状态。
- **验证 MUST 复现 CI 的库条件**——CI 只建一个库（`ai_asset_hub`，与 docker-compose 同名），本地
  自建的 `ai_asset_hub_test` 在 CI 不存在：凡「忽略注入的 `DATABASE_URL`」或「依赖本地自建库」的
  写法都会在 CI 暴露。测试改动按「单库 + 干净 schema + `CI=true`」跑过才算验证。
- **测试库 MUST 先迁移**——各测试文件在 `beforeAll` 各自 `migrate()`，冷库并发迁移会互相踩；
  CI 用独立的 `db:migrate` 步骤消除该竞态（顺序见末条）。
- **格式化只覆盖手写代码**——`bun run format` / `bun run format:check`（biome）覆盖
  `**/*.ts|tsx|json`，但 MUST 排除 `apps/server/drizzle/meta/**`（drizzle-kit 生成物：生成物归
  生成器；纳入会让每次 `db:migrate` 后 format:check 周期性翻红）。调整 biome 规则时保持该边界。
- **CI 顺序 MUST 被本地复现**：`bun install --frozen-lockfile` → `typecheck` → `lint` →
  `format:check` → **`文档体检`**（`bun docs/smoke/scripts/doc-audit.ts`：版本头 ↔ 修订表一致性 ·
  死路径引用 · 头部长度告警；纯只读不连库）→ `build` → `db:migrate` → `test`
  （`.github/workflows/ci.yml`，push main + PR）。

## 协作约定

- Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`）
- 提交前验证：**跑与 CI 同序的全量校验**（步骤见「测试与 CI 约定」末条；漏跑任一步会在提交后翻红）。
  测试是上游契约——不为本地 hack 改弱测试
- 协议变更先改 `packages/protocol` 的 zod schema（docs/01 §6），两端（server + web）
  消费更新后的类型
- 文档定稿门禁：8 维自检 ≥9（docs/00 §7）后才允许写实现代码
- 里程碑收尾必跑文档-代码对齐重评（converge，docs/00 §7 ②）：design/plan/规范
  vs 代码回查（版本头/修订记录/引用/状态同步）+ 8 维重评 ≥9——执行偏离（如 design
  层该写未写）在收尾时暴露并修正，不留给下个里程碑
- Clean Room：架构可参考他项目，代码必须原创——严禁把 FSL 许可源码
  （如 Den `ee/`）复制进本仓库；借鉴只取**设计思路**，对外致谢口径见 `README.md`
  （用 design reference，**不写 based on / forked from**，避免被读成代码衍生）
- 中立开放：文档不得引用任何内部/公司系统，不绑定特定客户端（docs/00 §4）。**具体禁三类**：
  **公司名** · **内部仓编号**（本地工作区编号）· **本机绝对路径**（`/Users/…`）；外部开源项目只写
  项目名 + 许可。由 `doc-audit.ts` 的「中立性」检查守护（文档与 `apps/*/src` 一并扫）
- 实现协议字段时以族协议文档（02/03/04）为契约，不凭记忆

## 操作限制

- 不做破坏性命令/数据库数据变更，除非用户明确要求
- 不暴露密钥、令牌、连接串
- 设计决策不确定时停下询问，不猜测后直接实现

## 里程碑

见 `docs/00` §5 的 M0-M6 追踪表与出口标准（追踪表 = 状态唯一源；**子批口径 = 出口五件**全绿才启下一批：
`批 design 8 维 ≥9 定稿` + `批 plan Task 全绿` + `五门禁` + `dogfood/观感` + **`整体审计`**，见 `docs/00` §5/§7 ②）。

**M4b 管理后台（拆 7 批，逐批对齐/实现）**：

> **编排（序与依赖）· 逐批件名 / 版本 / 状态 / 证据 = 主 design §2.3**
> （`docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md`）+ `docs/00` §5 子行
> —— **本文件不复制这些状态**（版本一律以各文档**版本头**为准；防双份维护漂移）。

**当前（快照 2026-09-18）**：M0 ✅ · M1 ✅ · M2 ✅ · M3 ✅ · M4a ✅ · M4-pre ✅ · M4b-pre ✅ · M4b-1 ✅ ·
M4b-2 ✅ · M4b-3 ✅ ⇒ 下一批 = **M4b-4**（M4b-4…7 ⬜：个人面 B → 审核面 → 治理面 → **M4b-7 控制台视觉打磨批**）

> 本段是**带日期的快照**，只为一眼可读；**真值一律以 `docs/00` §5 追踪表 + 主 design §2.3 为准**。
> 快照与真值不一致时，改的是本段、不是追踪表。
