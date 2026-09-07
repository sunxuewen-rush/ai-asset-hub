# Agent 族协议

> Date: 2026-09-04
> Updated: 2026-09-07（v1.1：实现状态同步——M1 已按本文档落地 packages/protocol 的 agent manifest）
> Status: 定稿（M1 已实现 packages/protocol 的 agent 族 zod schema，docs/01 §6 单源）
> Scope: `agent` 类型资产的包协议 —— agent 定义包（声明型）

## 1. 定位与生态对齐

`agent` 资产 = **agent 定义包**（声明型）：描述一个可被指定调用的 AI 角色/子代理——
行为指令、展示信息、（可选）默认模型偏好。**不携带执行代码**；安装进目标运行时
（主流 agent 框架的 agents/roles 目录）后，由宿主按定义加载使用。

格式对齐主流 agent 定义惯例（markdown + YAML frontmatter，与 Claude Code agents、
OpenCode agents、通用专家/角色目录同构）：

- 单个 markdown 文件承载定义：frontmatter = 元数据，正文 = 角色/行为指令
- 安装后目录名或文件名 = agent 名（slug），作为运行时 lookup key

## 2. 包结构

```text
<slug>/
├── agent.md           # 主文件（必需，root 级）
├── README.md          # 可选：使用说明、适用场景
└── assets/            # 可选：图标等展示资源
```

- 典型包 = `agent.md` + `README.md`
- 与 skill 包同构（文本资产），差异在语义与安装目标（§6、§8）

## 3. agent.md 规范

### 3.1 frontmatter（字段组）

```yaml
---
name: code-reviewer          # 必需，kebab-case，= 资产 slug
description: 资深代码评审专家   # 必需，≤ 1024，列表/搜索摘要
label: 代码评审官              # 可选，展示名（缺省用 name）
icon: ShieldCheck            # 可选，图标名（lucide 等生态图标库）
color: emerald               # 可选，主题色（卡片视觉）
category: engineering        # 可选，分类 slug（映射平台 label 体系）
keywords: [review, lint]     # 可选，搜索增强
---

# 角色指令正文（markdown）
```

| 字段 | 必填 | 规则 |
|------|------|------|
| `name` | ✅ | kebab-case 正则，1-64，与 slug 规则一致 |
| `description` | ✅ | 非空，≤ 1024 字符 |
| `label` | 可选 | 展示名，≤ 64；缺省回退 name |
| `icon` / `color` | 可选 | 视觉元数据（卡片/列表用），格式宽松校验 |
| `category` | 可选 | 分类 slug；由平台解析映射到 label 体系 |
| `keywords` | 可选 | 字符串数组，搜索文本增强 |

- **未知字段一律忽略**（向前兼容：消费端未来扩展字段不破坏既有资产）
- 平台扩展字段预留 `x-aih-` 前缀（如 `x-aih-default-model` 声明默认模型偏好，
  仅平台语义，安装/运行时由消费端决定是否采用）

### 3.2 正文

- frontmatter 之后必须存在非空 markdown 正文（角色定义/行为指令）
- 推荐结构：身份与使命 → 关键规则 → 工作方式（正文结构消费端自定，平台不约束）

## 4. 校验规则表

| 项 | 规则 |
|----|------|
| `name` | kebab-case 正则，1-64 |
| `description` | 非空，≤ 1024 |
| 正文 | frontmatter 后非空 markdown |
| 文件白名单 | `.md .txt .png .jpg .svg .webp`（assets/ 内） |
| 单文件大小 | ≤ 1 MiB（可配置） |
| 总包大小 | ≤ 10 MiB（可配置） |
| 文件数量 | ≤ 100（可配置） |

## 5. 校验错误码

| code | 含义 |
|------|------|
| `invalid_agent_frontmatter` | 缺少 YAML frontmatter |
| `missing_name` / `invalid_name` | name 缺失/非法 |
| `missing_description` | description 缺失 |
| `missing_body` | 正文为空 |
| `unsupported_file_type` / `file_too_large` / `too_many_files` / `package_too_large` | 包结构违规 |

## 6. 安装语义

安装目标：目标运行时的 agent/角色定义目录（主流约定 `.claude/agents`、`agents/`
或运行时 experts/roles 目录；各消费端自定并负责解析）。安装器行为：

1. 校验包后解压到本地安装目录
2. 将 `agent.md`（及可选 assets/）落入目标目录的 `<slug>/` 子目录（目录名 = slug）
3. 消费端按自身惯例发现加载（frontmatter 未知字段由消费端自行处理）
4. 安装后可选自检：frontmatter 可解析、name 与目录一致

## 7. 元数据投影摘要

- `summary` 扩展：展示分类/视觉（category/icon/color 落平台元数据）
- 安装到消费端后，`label`/`icon`/`color` 供卡片与列表展示

## 8. 与其他资产类型的差异（速查）

agent 与 skill **包格式同构**（markdown + frontmatter），语义差异在消费端：

| | skill | agent |
|---|-------|-------|
| 定位 | 任务中被加载的指令 | 可被指定调用的角色/子代理 |
| 触发 | agent 判断适用时读取 | 用户/编排显式选用 |
| 安装目标 | 技能目录 | agent/角色目录 |

对比 mcp（03）：mcp 带连接/执行语义与配置，agent 无执行代码、无凭据、无启动声明——
安全扫描规则最宽（与 skill 同级）；发布校验最轻。

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：agent 定义包协议（markdown + frontmatter，声明型） |
| v1.1 | 2026-09-07 | sunxuewen-rush | 实现状态同步：M1 packages/protocol agent manifest 落地（label/icon/color/category 可选项） |
