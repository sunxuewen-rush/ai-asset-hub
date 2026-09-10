# AI Asset Hub — Agent 工作指南

AI Asset Hub 是开源、可自托管的 AI 资产注册中心与市场：技能（skill）、MCP Server、
Agent 定义等资产的分发平台，带开放协作审核治理。

本文件指引 Agent 在本仓库如何工作。人类读者请走 `CONTRIBUTING.md`（M6 补齐）。

## 仓库结构

```
docs/                 设计与协议文档（见下方「文档体系」）
packages/protocol     资产协议 zod schema（单一事实源，M1 落地）
apps/                 server / web / cli（M1 落地）
.github/workflows     CI 流水线（push main + PR：校验门禁，见「命令」注）
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

注：CI（`.github/workflows/ci.yml`，push main + PR）按 install → typecheck → lint → format:check →
build → db:migrate → test 顺序跑；本地复现同一顺序即可。**测试库必须先迁移**——各测试文件在
beforeAll 各自 `migrate()`，冷库并发迁移会互相踩（CI 用预迁移步骤消除该竞态）。

注：格式化与生成物的所有权边界——`bun run format` / `bun run format:check` 由 biome 覆盖
`**/*.ts|tsx|json`，但**排除 `apps/server/drizzle/meta/**`**（drizzle-kit 生成的迁移快照：
生成物归生成器；若纳入格式化，每次 `db:migrate` 都会重新引入未格式化快照并让 format:check 翻红）。
调整 biome 规则时保持这条边界。

## 协作约定

- Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`）
- 提交前验证：typecheck + lint + format:check + 全量测试绿（CI 在 push/PR 复跑同一套，见 `.github/workflows/ci.yml`）。测试是上游契约——不为本地 hack 改弱测试
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
