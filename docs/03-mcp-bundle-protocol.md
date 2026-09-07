# MCP 族协议

> Date: 2026-09-04
> Status: Draft（未动代码）
> Scope: `mcp` 类型资产的包协议 —— 双形态：远程连接配置 / 本地 stdio 服务器包

## 1. 定位与生态对齐

`mcp` 资产 = 可被 AI agent 连接的 MCP（Model Context Protocol）服务器。双形态：

- **远程型**：纯配置——MCP 服务器已在远端运行，包内只含连接信息（url/headers）
- **本地型**：含实现——服务器以 stdio 方式本地启动，包内含启动声明与实现脚本

配置形态对齐生态通用惯例（MCP 官方传输规范 + Claude Code `.mcp.json` / mcp-directory
社区格式）：配置主体为 `mcpServers` 对象，条目按字段推断传输方式
（有 `command` = stdio，有 `url` = HTTP）；平台解析时兼容 `mcpServers` 与 `mcp`
两个键名（主流客户端两种写法都认）。

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
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://mcp.example.com/github",
      "headers": {
        "Authorization": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

| 字段 | 规则 |
|------|------|
| `name` | 必需，kebab-case，= 资产 slug |
| `description` | 必需，≤ 1024 字符（列表/搜索摘要） |
| `mcpServers` | 必需，非空对象；兼容键名 `mcp`。一个包可声明多个 server（通常 1 个） |

### 3.2 server 条目（stdio 型）

```json
"github-local": {
  "type": "stdio",
  "command": "node",
  "args": ["scripts/server.js"],
  "env": {
    "LOG_LEVEL": "info"
  }
}
```

| 字段 | 规则 |
|------|------|
| `type` | 可选；缺省按字段推断（有 command 即 stdio） |
| `command` | stdio 必需；非空、不含反斜杠；`./` 或 `scripts/` 开头 = 包内引用（安装器改写，见 §6） |
| `args` | 可选，字符串数组 |
| `env` | 可选；值只收字符串 |

### 3.3 server 条目（HTTP 型）

```json
"github-remote": {
  "type": "http",
  "url": "https://mcp.example.com/github",
  "headers": {
    "Authorization": "${GITHUB_TOKEN}"
  }
}
```

| 字段 | 规则 |
|------|------|
| `type` | 可选；缺省按字段推断（有 url 即 http） |
| `url` | http 必需；合法 http(s) URL |
| `headers` | 可选；键值均为字符串 |

### 3.4 校验互斥

- `command` 与 `url` **必须且只能出现一个**（stdio / http 互斥）
- `type` 与推断结果冲突时报错（声明了 `type: "stdio"` 却给了 `url` → 拒绝）
- 空 `mcpServers`、server 名非字符串键、条目非对象 → 拒绝

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
| `mcpServers`/`mcp` | 非空；条目字段按 §3 校验；command/url 互斥 |
| 敏感头明文 | 见 §4，违规报错 |
| 文件白名单 | `.json .md .js .cjs .mjs .ts .py .sh .png .svg`（scripts/ 内） |
| 单文件大小 | ≤ 1 MiB（可配置） |
| 总包大小 | ≤ 10 MiB（可配置） |
| 文件数量 | ≤ 100（可配置） |
| 依赖目录 | 禁止 `node_modules/`/`vendor/` 等依赖目录入包 |

## 6. 安装语义

安装目标：客户端 MCP 配置区（Claude Code `.mcp.json`、OpenCode 配置、平台 CLI 的
MCP 配置等）。安装器行为：

1. 校验包（§3-§5）后解压到本地安装目录
2. 提取 `mcpServers` 段，合并进目标客户端 MCP 配置（不覆盖已有同名 server，冲突报错）
3. **包内相对路径改写**：`command` 以 `./` 或 `scripts/` 开头 → 改写为安装目录下的
   实际路径（或等价 `node <install_dir>/scripts/...` 调用）；`npx`/绝对路径原样保留
4. `${VAR}` 引用在安装时向用户收集值（跳过留空则该项不注入），明文非敏感值原样写入
5. 安装完成后可选连通性自检（stdio 启动探测 / http GET）——客户端能力，非强制

## 7. 元数据投影摘要

- `summary` 扩展字段展示连接形态：`远程 · https://…` 或 `本地 · node scripts/server.js`
- 可选声明 `tools`（工具名列表，纯展示用途，服务端不探测不校验语义）

## 8. 与其他资产类型的差异（速查）

mcp 是**连接/执行语义**资产：可能含实现脚本（安全扫描从严，比 skill/agent 重）、
携带配置（secret 管理规则 §4）、安装需合并进客户端 MCP 配置而非简单目录解压。
对比 skill（纯文本）/ agent（声明型定义，见 02/04 族协议）。

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：mcp 双形态包协议 + secret 不入包规则 |
