# AI Asset Hub — Agent 工作指南

AI Asset Hub 是开源、可自托管的 AI 资产注册中心与市场：技能（skill）、MCP Server、
Agent 定义等资产的分发平台，带开放协作审核治理。

本文件指引 Agent 在本仓库如何工作。人类读者请走 `CONTRIBUTING.md`（M6 补齐）。

## 仓库结构

```
docs/                 设计与协议文档（见下方「文档体系」）
packages/protocol     资产协议 zod schema（单一事实源，M1 落地）
apps/                 server / web / cli（M1 落地）
README.md · LICENSE   Apache 2.0
```

## 文档体系

遵循 `docs/00-product-direction.md` §7 的三层一表架构：

- **规范层** `docs/NN-*.md` —— 系统形态（跨里程碑稳定）：
  `00` 定位/决定板 · `01` 资产协议总纲 · `02-04` 族协议（skill/mcp/agent）·
  `05` 用户与权限 · `06` 标签分类 · `07` UI 语言与本地化 · `08` 数据模型
- **设计层** `docs/YYYY-MM-DD-<主题>-design.md` —— 阶段决策（8 段骨架；仅里程碑内的设计块）
- **计划层** `docs/plans/<里程碑>-<主题>.md` —— 实现任务清单（含验收断言）
- **追踪表** —— `00` §5 里程碑状态表（出口标准：design ≥9 自检 + plan Task 全绿 + 代码验证）

引用链单向：plan → design → 规范 §N。引用不复制，防漂移。

## 命令

_M1 骨架落地后填充：`pnpm install / typecheck / test / lint / build`。
在此之前不要凭空发明命令。_

## 协作约定

- Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`）
- 提交前验证：typecheck + 全量测试绿。测试是上游契约——不为本地 hack 改弱测试
- 协议变更先改 `packages/protocol` 的 zod schema（docs/01 §6），两端（server + web）
  消费更新后的类型
- 文档定稿门禁：8 维自检 ≥9（docs/00 §7）后才允许写实现代码
- Clean Room：架构可参考他项目，代码必须原创——严禁把 FSL 许可源码
  （如 Den `ee/`）复制进本仓库
- 中立开放：文档不得引用任何内部/公司系统，不绑定特定客户端（docs/00 §4）
- 实现协议字段时以族协议文档（02/03/04）为契约，不凭记忆

## 操作限制

- 不做破坏性命令/数据库数据变更，除非用户明确要求
- 不暴露密钥、令牌、连接串
- 设计决策不确定时停下询问，不猜测后直接实现

## 里程碑

见 `docs/00` §5 的 M0-M6 追踪表与出口标准。当前：M0 ✅，文档族 00-08 已定稿；
下一步：M1 平台底座骨架。
