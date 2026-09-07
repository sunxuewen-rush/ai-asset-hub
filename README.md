# AI Asset Hub

> 开源的企业级 AI 资产注册中心与市场 —— 技能、MCP、Worker 等 AI 可复用资产的统一分发平台。

AI Asset Hub 让企业像用「内网 npm」一样管理 AI 资产：发布、发现、审核、安装，一条链到底。
自托管优先，Apache 2.0 全开源。

## 为什么做

- 团队技能包散落在各家注册中心，互不兼容（SKILL.md / OpenSkills / ClawHub 各自为政）
- 企业缺少「多类型 AI 资产」的统一治理：技能有了，MCP/Worker 没有家
- 现有方案要么单类型（skillhub），要么带商业边界（Den/OpenWork 的 FSL），要么绑云厂商（HiMarket 的阿里系网关）

AI Asset Hub 填补空白：**多类型资产（原生 type 设计）· TS 全栈 · 开放协作审核 · Apache 2.0 真开源**。

## 核心能力

| 能力 | 说明 |
|------|------|
| 多类型资产 | `skill`（兼容 SKILL.md/OpenSkills）+ `mcp` + `agent` 原生类型，演进路径按需扩展（cli/api-tool/python/连接类） |
| 资产协议 | 每类资产一族协议（zip 布局 + manifest + 校验器插拔），协议即 schema（zod，前后端共用） |
| 命名空间 | `@namespace/slug` 坐标，团队/全局空间治理边界 |
| 开放协作 | 任何人可向任意资产提交更新，非 owner 提交走 `PENDING_REVIEW` 审核（Git 式协作） |
| 生命周期 | draft → PENDING_REVIEW → PUBLISHED，版本化 + 标签通道 |
| 安装即用 | CLI 一条命令安装到 agent 目录 / MCP 配置 / Worker 运行时 |
| 治理与安全 | 报告/隐藏/归档 + 安全扫描扩展点 + 全链路审计 |

## 技术栈

TypeScript 全栈（前端 React 19 + Vite，后端 Hono + Drizzle + PostgreSQL，协议校验 zod），单仓库。

## 项目状态

设计阶段 —— 定位与范围见 `docs/00-product-direction.md`，里程碑推进中。

## License

[Apache License 2.0](./LICENSE)
