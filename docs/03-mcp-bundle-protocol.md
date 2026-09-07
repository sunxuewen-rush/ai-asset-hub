# MCP 族协议

> Date: 2026-09-04
> Updated: 2026-09-07（v1.2：实现状态同步——M1 packages/protocol mcp manifest 落地；v1.1 server 条目 schema 对齐主流契约）
> Status: 定稿（M1 已实现 packages/protocol 的 mcp 族 zod schema，docs/01 §6 单源）
> Scope: `mcp` 类型资产的包协议 —— 双形态：远程连接配置 / 本地 stdio 服务器包

## 1. 定位与生态对齐

`mcp` 资产 = 可被 AI agent 连接的 MCP（Model Context Protocol）服务器。双形态：

- **远程型**：纯配置——MCP 服务器已在远端运行，包内只含连接信息
  （url/headers；`http` 与 `sse` 传输同用此组字段）
- **本地型**：含实现——服务器以 stdio 方式本地启动，包内含启动声明与实现脚本

平台内 server 条目 schema 对齐主流 MCP 运行时（基于 MCP 官方传输规范演进的实际
运行时配置契约，如 Pi/OpenCode 系工作区 MCP 配置）——**顶层 `servers` 键 + `type`
必填 + `stdio/http/sse` 三传输**。生态中另有 `mcpServers`/`mcp` 键名写法
（Claude Code `.mcp.json`、mcp-directory 等）——平台解析时**兼容导入**（归一为
`servers`），安装器按目标客户端格式适配写出。

## 2. 包结构

```text
<slug>/
├── mcp.json          # 主文件（必需，root 级）
├── scripts/          # 本地实现脚本（可选，stdio 型引用）
└── README.md         # 可选：用法、所需环境、凭据说明
```

- 远程型典型包 = `mcp.json` + `README.md`（无 scripts/）
- 本地型典型包 = `mcp.json` + `scripts/server.js`（+ 依赖说明）
- 打包约束：不打包 `node_modules` 等依赖目录；依赖通过 `command` 的
  运行时解析（如 `npx`）或系统环境提供——包保持轻量

## 3. mcp.json 规范

### 3.1 顶层结构

```json
{
  "name": "github-mcp",
  "description": "连接 GitHub 的 MCP 服务器",
  "servers": {
    "github": {
      "type": "http",
      "url": "https://mcp.example.com/github",
      "headers": {
        "Authorization": "${GITHUB_TOKEN}"
      },
      "enabled": true
    }
  }
}
```

| 字段 | 规则 |
|------|------|
| `name` | 必需，kebab-case，= 资产 slug（平台元数据，安装时不下发） |
| `description` | 必需，≤ 1024 字符（列表/搜索摘要，平台元数据） |
| `servers` | 必需，非空对象 `Record<serverName, ServerEntry>`。解析时兼容 `mcpServers`/`mcp` 键名（归一为 `servers`） |

### 3.2 server 条目（对齐运行时配置契约）

```jsonc
{
  "type": "stdio",            // 必填: 'stdio' | 'http' | 'sse'
  "command": "node",          // stdio: 可执行命令
  "args": ["scripts/server.js"], // stdio: 命令参数
  "env": { "LOG_LEVEL": "info" },// stdio: 环境变量
  "timeout": 30,              // stdio: 启动超时秒（默认 30）
  "enabled": true             // 必填: 是否启用
}
// http / sse 型: url + headers（sse 兼容同 http 字段）
```

| 字段 | 类型 | 规则 |
|------|------|------|
| `type` | string | **必填**：`stdio` / `http` / `sse` |
| `command` | string | stdio 必需；非空、不含反斜杠；`./` 或 `scripts/` 开头 = 包内引用（安装器改写，见 §6） |
| `args` | string[] | 可选（stdio） |
| `env` | Record<string,string> | 可选（stdio）；值只收字符串 |
| `timeout` | number | 可选（stdio）；启动超时秒，默认 30 |
| `url` | string | http/sse 必需；合法 http(s) URL |
| `headers` | Record<string,string> | 可选（http/sse）；键值均为字符串 |
| `enabled` | boolean | **必填**：是否启用（默认应显式给出） |

### 3.3 校验互斥

- `type` 与字段匹配：`stdio` → 必须有 `command`；`http`/`sse` → 必须有 `url`
- `command` 与 `url` 互斥出现（type 冲突时报错：声明 `stdio` 却给 `url` → 拒绝）
- 空 `servers`、server 名非字符串键、条目非对象 → 拒绝

## 4. 凭据安全规则（secret 不入包 ★）

对象存储中的包体可被任何有下载权的人读取——**敏感值禁止明文落包**：

- `headers` / `env` 中的值支持两种形式：
  - 明文：仅限非敏感配置（`LOG_LEVEL`、`USER_AGENT` 等）
  - 引用：`${VAR_NAME}` —— 安装时由安装侧提供（客户端提示用户填写）
- **敏感头名强制引用**：`authorization` / `x-api-key` / `api-key` / `x-api-token` 等
  头（大小写不敏感）的值若不是 `${VAR}` 引用形式 → 校验错误
  `sensitive_header_plaintext`（防把 Bearer token 明文打进包）
- `README.md` 说明所需凭据与获取方式（占位说明，不含真实值）

## 5. 校验规则表

| 项 | 规则 |
|----|------|
| `name` | kebab-case 正则，1-64，与 slug 规则一致 |
| `description` | 非空，≤ 1024 |
| `servers` | 非空；条目字段按 §3.2 校验；type/字段匹配按 §3.3 |
| 敏感头明文 | 见 §4，违规报错 |
| 文件白名单 | `.json .md .js .cjs .mjs .ts .py .sh .png .svg`（scripts/ 内） |
| 单文件大小 | ≤ 1 MiB（可配置） |
| 总包大小 | ≤ 10 MiB（可配置） |
| 文件数量 | ≤ 100（可配置） |
| 依赖目录 | 禁止 `node_modules/`/`vendor/` 等依赖目录入包 |

## 6. 安装语义

安装目标：目标客户端的 MCP 配置区。安装器行为：

1. 校验包（§3-§5）后解压到本地安装目录
2. 提取 `servers` 段，按目标客户端格式写出（主流运行时配置：直接合并 `servers`
   对象；Claude Code/mcp-directory 型：适配为 `mcpServers` 结构）——
   已有同名 server 不覆盖，冲突报错
3. **包内相对路径改写**：`command` 以 `./` 或 `scripts/` 开头 → 改写为安装目录下的
   实际路径（或等价 `node <install_dir>/scripts/...` 调用）；`npx`/绝对路径原样保留
4. `${VAR}` 引用在安装时向用户收集值（跳过留空则该项不注入），明文非敏感值原样写入
5. 安装完成后可选连通性自检（stdio 启动探测 / http(s) GET / sse 握手）——客户端能力，非强制

## 7. 元数据投影摘要

- `summary` 扩展字段展示连接形态：`远程 · https://…` / `sse · …` 或 `本地 · node scripts/server.js`
- 可选声明 `tools`（工具名列表，纯展示用途，服务端不探测不校验语义）

## 8. 与其他资产类型的差异（速查）

mcp 是**连接/执行语义**资产：可能含实现脚本（安全扫描从严，比 skill/agent 重）、
携带配置（secret 管理规则 §4）、安装需合并进客户端 MCP 配置而非简单目录解压。
对比 skill（纯文本）/ agent（声明型定义，见 02/04 族协议）。

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：mcp 双形态包协议 + secret 不入包规则 |
| v1.1 | 2026-09-04 | sunxuewen-rush | server 条目 schema 对齐主流 MCP 运行时契约：顶层 `servers` 键（兼容 mcpServers/mcp 导入）、`type` 必填（stdio/http/sse）、补 `enabled`/`timeout` 字段 |
| v1.2 | 2026-09-07 | sunxuewen-rush | 实现状态同步：M1 packages/protocol mcp manifest 落地（含敏感头 `${VAR}` 规则） |
