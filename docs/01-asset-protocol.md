# 资产协议总纲

> Date: 2026-09-04
> Updated: 2026-09-08（v1.5：§3.2 searchText 正文摘要截断数值补注（≤500 字符——M2 投影实现同步）；v1.4：M0/M1 复验同步——§2 登记表 mcp 族协议版本标注回写 v1.2；v1.3 族协议状态同步——02/03/04 已定稿落地于 packages/protocol；v1.2 生命周期同步扫描态全序）
> Status: 定稿（族协议 02/03/04 已 v1.x 定稿，M1 已按本协议实现 packages/protocol zod schema）
> Scope: AI Asset Hub 可分发资产的公共协议层 —— 类型登记、包形态、元数据投影、校验器插拔

## 1. 定位

AI Asset Hub 分发「包型 AI 资产」：技能（skill）、MCP Server（mcp）、Agent 定义（agent）
等。本文档定义所有资产**共有的协议层**——类型如何登记、包长什么样、元数据如何投影、
发布时如何校验；各类型的**族协议**在 02/03/04 中细化。

原则：**类型是维度，不是另一套系统**。一套版本/审核/标签/搜索/下载管线服务所有类型，
类型只决定「包怎么校验、内容怎么展示、装到哪里」。

## 2. 类型登记表（Type Registry）

| type | 族协议 | 主文件 | 包性质 | 安装目标 |
|------|--------|--------|--------|---------|
| `skill` | `02-skill-protocol.md` | `SKILL.md` | 文本指令包（markdown + 资源） | agent 技能目录（`.agents/skills` 等） |
| `mcp` | `03-mcp-bundle-protocol.md`（v1.2） | `mcp.json` | 远程连接配置 / 本地 stdio 服务器包 | 客户端 MCP 配置区 |
| `agent` | `04-agent-protocol.md` | `agent.md` | agent 定义包（声明型：行为 + 模型偏好 + 技能引用） | agent 运行时配置目录（客户端自定） |

**类型扩展流程**（新类型只走一遍此流程）：

1. 本表登记 type + 族协议文档 + 主文件约定
2. 族协议定义 zip 布局/manifest/校验规则
3. 发布校验器按 type 注册（§5）
4. 前端内容视图组件按 type 挂载（详情页插槽）
5. CLI 安装目标按 type 落位

演进路径（见 `00-product-direction.md` §2.1，按需扩展不提前实现）：
`skill → mcp → agent → cli → api-tool → python → 连接类（V2）`

## 3. 通用包形态

### 3.1 zip 布局

```text
<slug>/
├── <主文件>      # root 级，族协议自定（SKILL.md / mcp.json / agent.md）
├── README.md     # 可选，人类可读长说明
└── <资源目录>    # 族协议自定（references/ scripts/ assets/ …）
```

约束：

- 上传格式为 zip；主文件必须在 zip 根目录
- 大小/文件数上限由族协议定义（均带服务端可配置项）
- 平台保留 `.aihub/` 目录约定：可选存放平台私有元数据（客户端可忽略）

### 3.2 元数据投影

上传时服务端解析主文件，投影出统一字段，供展示/搜索/标签管线使用：

| 投影字段 | 含义 | 来源约定 |
|---------|------|---------|
| `name` | 资产名（slug 源） | 主文件中的 name 字段（各族定义位置） |
| `description` | 一句话描述（列表/搜索用） | 主文件 description 字段 |
| `searchText` | 可索引文本 | name + description + 正文摘要（各族定义截断规则；**M2 定：正文摘要 ≤500 字符**——服务端投影统一截断，2026-09-08 补注） |
| `type` | 资产类型 | 显式声明（各族定义） |
| `summary` 扩展 | 展示性摘要 | 族协议可选字段（如 mcp 的连接形态、agent 的模型偏好） |

- 投影结果持久化于 DB 派生列；文件原文存对象存储
- 解析器按 type 插拔（skill/agent 解析 frontmatter 文本；mcp 解析 JSON manifest）

### 3.3 坐标与命名

- 寻址：`@namespace/slug`，对所有类型一致
- slug 规则：`[a-z0-9]([a-z0-9-]*[a-z0-9])?`，长度 1-64，不含连续 `--`
- **slug 跨类型唯一**（同 namespace 下 skill 与 mcp 不得同名）：安装目录以目录名寻址，
  目录名冲突会造成客户端歧义；slug 语义与类型无关
- 安装后目录名 = slug（不携带类型信息，类型差异体现在安装位置）

## 4. 版本与生命周期

- 版本号：semver（族协议可附加限定）
- 生命周期对所有类型一致：版本全序含扫描态（DRAFT → SCANNING → SCAN_FAILED →
  UPLOADED → PENDING_REVIEW → PUBLISHED，表结构详见 `08` §7）
- 资产状态独立于版本：ACTIVE / HIDDEN / ARCHIVED
- 标签通道：`latest` 只读跟随最新 PUBLISHED；`stable`/`beta` 等自定义标签做通道管理
- 治理（hidden/报告/归档/审计）与类型无关，全部复用

## 5. 发布校验器插拔

发布管线暴露 `AssetValidator` 接口：

```ts
interface AssetValidator {
  validate(input: { zip: Buffer; type: AssetType }): ValidationResult
}
```

- 注册表 `type → validator`：skill 校验器（族协议 02 规则）、mcp/agent 校验器（03/04 规则）
- 校验职责：zip 结构 / 主文件存在与格式 / 元数据必填 / 文件白名单与大小 / slug 冲突（跨类型）
- 校验错误以结构化 code + message 返回（前端按 code 映射 i18n）
- 安全扫描：发布审核期独立扩展点（后置接入，按 type 差异化规则——mcp 含代码/配置，
  扫描规则比纯文本 skill/agent 从严）

## 6. 协议 schema 单源原则

- 每类资产协议 = 一份 zod schema（`packages/protocol` 内），描述 manifest 结构
- 服务端校验与前端表单/详情渲染共用同一 schema 类型；协议变更先改 schema 再动两端
- manifest 示例字段一律给真实可读值（禁数字 id/占位符），示例即契约

## 7. 兼容边界

| 类型 | 兼容承诺 |
|------|---------|
| `skill` | OpenSkills/Claude 技能目录约定与 SKILL.md 格式互操作（族协议 02） |
| `mcp` | 遵循生态通用 MCP 配置形态（stdio/url），第三方格式经导入适配器（非协议承诺） |
| `agent` | 遵循生态 agent 定义惯例（frontmatter 声明），平台原生扩展字段 `x-aih-` 前缀 |

兼容承诺仅影响「安装后能否被第三方客户端识别」，不影响平台内治理与分发。
平台不与任何特定客户端绑定，协议中立面向全部 agent 生态。

## 8. 文档与代码对应

本文档为协议层规范；落地代码位置与 API 契约在对应设计文档中列全（引用文件清单按
项目文档习惯在每份设计文档末尾维护）。

## 9. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：类型登记/包形态/投影/校验器插拔/兼容边界 |
| v1.1 | 2026-09-04 | sunxuewen-rush | 类型体系对齐 00 v1.1（skill/mcp/agent）；演进路径中立化 |
| v1.2 | 2026-09-04 | sunxuewen-rush | §4 生命周期补扫描态全序；资产状态独立于版本（指向 08 §7） |
| v1.3 | 2026-09-07 | sunxuewen-rush | 族协议状态同步：02/03/04「待写」→ 已定稿（03 v1.1），Status 改定稿；§6 校验器已落地 packages/protocol |
| v1.4 | 2026-09-08 | sunxuewen-rush | M0/M1 复验同步：§2 登记表 mcp 行族协议版本标注 v1.1 → v1.2（03 已升版未回写） |
| v1.5 | 2026-09-08 | sunxuewen-rush | M2 实现同步：§3.2 投影 searchText 补「正文摘要 ≤500 字符」截断数值（T11 D1 拍板落档——族协议文档原无数值） |
