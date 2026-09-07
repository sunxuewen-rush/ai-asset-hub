# Skill 族协议

> Date: 2026-09-04
> Status: Draft（未动代码）
> Scope: `skill` 类型资产的包协议 —— 兼容 OpenSkills / Claude 技能生态

## 1. 定位与兼容承诺

`skill` 资产 = 纯文本指令包（markdown 指令 + 可选资源文件），通过 AI agent 的技能目录
被加载使用。协议对齐 OpenSkills / Claude Code 生态：

- 格式：`SKILL.md`（frontmatter + markdown body）—— 安装后第三方兼容客户端可发现使用
- 目录约定：`SKILL.md + references/ + scripts/ + assets/`
- 安装目录优先级：`.agents/skills` → `~/.agents/skills` → `.claude/skills` → `~/.claude/skills`
- 目录名 = skill 名（slug），作为客户端 lookup key

平台只承诺「格式与目录约定的互操作」；服务端返回元数据（name/description/version），
`location` 是客户端安装后计算值，服务端不生成不修改 AGENTS.md。

## 2. 包结构

```text
<slug>/
├── SKILL.md           # 主文件（必需，root 级）
├── references/        # 参考资料（可选）
├── scripts/           # 脚本（可选）
└── assets/            # 静态资源（可选）
```

上传兼容 `skill.md`/`Skill.md` 等大小写变体，服务端归一化为 `SKILL.md`。

## 3. SKILL.md 规范

### 3.1 frontmatter（必需字段）

```yaml
---
name: my-skill            # 必需，kebab-case，= 资产 slug
description: When to use  # 必需，1-2 句，搜索/列表摘要
---
```

解析规则：

- `name` 缺失/非法则校验失败；映射为 `@namespace/slug` 的 slug（首版固定，后续版本不可变更）
- `description` 缺失则校验失败；映射为列表/搜索摘要
- frontmatter 完整解析结果持久化（`parsed_metadata_json`），未来扩展字段向后兼容

### 3.2 平台扩展字段（可选，`x-aih-` 前缀）

```yaml
name: my-skill
description: When to use
x-aih-runtime: claude-code    # 预留：目标运行时
x-aih-min-version: "1.0"      # 预留：最低平台版本
```

扩展字段仅平台语义，不破坏 OpenSkills 兼容（第三方客户端忽略未知字段）。

### 3.3 校验规则

| 项 | 规则 |
|----|------|
| `name` | kebab-case 正则，长度 1-64，与 slug 规则一致 |
| `description` | 非空，≤ 1024 字符 |
| body | frontmatter 之后必须存在非空 markdown 正文（指令内容） |
| 文件白名单 | `.md .txt .json .yaml .yml .js .cjs .mjs .ts .py .sh .png .jpg .svg` |
| 单文件大小 | ≤ 1 MiB（服务端可配置） |
| 总包大小 | ≤ 10 MiB（服务端可配置） |
| 文件数量 | ≤ 100（服务端可配置） |

超过限制返回结构化校验错误（code 见 §5）。

## 4. 校验错误码

| code | 含义 | 建议 i18n |
|------|------|----------|
| `invalid_skill_frontmatter` | 缺少 YAML frontmatter | 必须以 `---` 开头的 YAML frontmatter 开始 |
| `missing_name` / `invalid_name` | name 缺失/非法 | 检查 name 格式 |
| `missing_description` | description 缺失 | 补充一句话描述 |
| `missing_body` | 正文为空 | 正文需要包含技能指令 |
| `unsupported_file_type` / `file_too_large` / `too_many_files` / `package_too_large` | 包结构违规 | 见校验规则表 |

## 5. 安装语义

- CLI 将包解压到安装目录（目录名 = slug），覆盖写前校验目标目录
- 安装后由客户端（agent）通过目录扫描发现技能；平台不介入运行时
- 平台 CLI 生成的 AGENTS.md 索引区块与 OpenSkills `<skill>` 节点格式兼容

## 6. 与其他资产类型的差异（速查）

skill 是**纯文本**资产（无执行入口、无连接、无运行时声明）——这决定它：
发布校验最轻、安全扫描规则最宽（markdown 为主）、安装 = 目录解压。
对比 mcp（03）/ agent（04）：mcp 含连接/实现语义，校验与扫描从严；
agent 是声明型（行为 + 模型偏好 + 技能引用，无执行代码），校验规则介于两者之间。

## 7. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：OpenSkills 兼容的 skill 包协议（含与其他资产类型的差异对照） |
