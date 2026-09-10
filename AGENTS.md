# AI Asset Hub — Agent 工作指南

AI Asset Hub 是开源、可自托管的 AI 资产注册中心与市场：技能（skill）、MCP Server、
Agent 定义等资产的分发平台，带开放协作审核治理。

本文件指引 Agent 在本仓库如何工作。人类读者请走 `CONTRIBUTING.md`（M6 补齐）。

## 仓库结构

```
docs/                 设计与协议文档（见下方「文档体系」）
packages/protocol     资产协议 zod schema（单一事实源，M1 落地）
apps/                 server / web / cli（M1 落地）
.github/workflows     CI 流水线（push main + PR：校验门禁，见「测试与 CI 约定」）
README.md · LICENSE   Apache 2.0
```

## 文档体系

遵循 `docs/00-product-direction.md` §7 的三层一表架构：

- **规范层** `docs/NN-*.md` —— 系统形态（跨里程碑稳定）：
  `00` 定位/决定板 · `01` 资产协议总纲 · `02-04` 族协议（skill/mcp/agent）·
  `05` 用户与权限 · `06` 标签分类 · `07` UI 语言与本地化 · `08` 数据模型
- **设计层** `docs/designs/YYYY-MM-DD-<主题>-design.md` —— 阶段决策（7 段骨架；仅里程碑内的设计块；任务清单归属 plan 层，design 不复制）
- **计划层** `docs/plans/<里程碑>-<主题>.md` —— 实现任务清单（含验收断言）
- **追踪表** —— `00` §5 里程碑状态表（出口标准：design ≥9 自检 + plan Task 全绿 + 代码验证）

引用链单向：plan → design → 规范 §N。引用不复制，防漂移。

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
  `format:check` → `build` → `db:migrate` → `test`（`.github/workflows/ci.yml`，push main + PR）。

## 协作约定

- Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`）
- 提交前验证：typecheck + lint + format:check + 全量测试绿（顺序与硬规则见「测试与 CI 约定」）。测试是上游契约——不为本地 hack 改弱测试
- 协议变更先改 `packages/protocol` 的 zod schema（docs/01 §6），两端（server + web）
  消费更新后的类型
- 文档定稿门禁：8 维自检 ≥9（docs/00 §7）后才允许写实现代码
- 里程碑收尾必跑文档-代码对齐重评（converge，docs/00 §7 ②）：design/plan/规范
  vs 代码回查（版本头/修订记录/引用/状态同步）+ 8 维重评 ≥9——执行偏离（如 design
  层该写未写）在收尾时暴露并修正，不留给下个里程碑
- Clean Room：架构可参考他项目，代码必须原创——严禁把 FSL 许可源码
  （如 Den `ee/`）复制进本仓库
- 中立开放：文档不得引用任何内部/公司系统，不绑定特定客户端（docs/00 §4）
- 实现协议字段时以族协议文档（02/03/04）为契约，不凭记忆

## 操作限制

- 不做破坏性命令/数据库数据变更，除非用户明确要求
- 不暴露密钥、令牌、连接串
- 设计决策不确定时停下询问，不猜测后直接实现

## 里程碑

见 `docs/00` §5 的 M0-M6 追踪表与出口标准（追踪表 = 状态唯一源）。当前：
M0 ✅（骨架）· M1 ✅（平台底座）· M2 ✅（资产域）· M3 ✅（治理管线）· M4a ✅（市场门户）·
**M4-pre ✅（扁平化重构：4 档角色 / 删空间域 / 删可见性 / 坐标改全局唯一裸 slug — 2026-09-10，
迁移 0005-0007，design/plan 见 `docs/designs/2026-09-10-flat-model-refactor-design.md` +
`docs/plans/M4-pre-flat-model-refactor.md`）**；
下一步：M4b 管理后台（design 已按扁平模型重写 v1.0，先对齐范围再立 plan）。
