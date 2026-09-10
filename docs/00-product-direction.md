# AI Asset Hub 产品定位与方向

> Date: 2026-09-04
> Updated: 2026-09-10（v1.13：**M4-pre 扁平化重构同步**——§2.2 L50/L51-52 坐标与审核主体（去命名空间/空间管理员）；§5 新增 **M4-pre 里程碑行**（✅ 2026-09-10）+ M4 行 M4b 范围更新；§6 首期非目标补「多租户/空间隔离」；v1.12：§5 M4 行注记——M4a 市场门户完成 ✅（2026-09-09 收尾：portal design v0.8 定稿落地，T1-T19 全绿 538 tests，联调 dogfood 记录 docs/smoke/2026-09-09-m4a-t18.md）；M4b 管理后台拆为待办 ⬜）；v1.11：§5 M3 行完成注记（治理管线闭环 2026-09-08）；v1.10：§5 M2 行完成注记（资产域闭环 2026-09-08）+ M3 行治理语义注记；v1.9：§7 ② 设计层 8 段 → 7 段骨架（删任务清单段）；v1.8：§7 ② 补实施完成重评（converge）约定；v1.7：M1 阶段二完成注记；v1.6 Status 同步定稿；v1.5 M1 阶段一 platform-core 完成注记；v1.4 M6 补 CHANGELOG/runbook）
> Status: 定稿（项目方向决定板；里程碑出口状态见 §5 追踪表）
> Scope: 全新开源项目 —— AI 资产注册中心与市场（多类型 AI 可复用资产）

## 1. 定位

AI Asset Hub 是**开源的企业级 AI 资产注册中心与市场**：技能（Skill）、MCP Server、
Agent 定义等 AI 可复用资产，从发布、审核、发现到安装使用的统一分发平台。
自托管优先，面向防火墙内的企业/团队部署，也适合个人与社区使用。

一句话：像「自托管 npm 之于 AI agent」——多类型资产原生设计 + 开放协作审核治理 +
Apache 2.0 真开源。任何兼容主流技能生态的 agent 客户端（OpenSkills/Claude Code/
OpenCode 系等）都能消费其 skill 资产。

### 1.1 市场坐标（为什么存在）

| 现有方案 | 单/多类型 | 授权 | 与我们的差异 |
|---------|----------|------|-------------|
| skillhub（iflytek） | 单类型（skill） | Apache 2.0 | 无多类型资产 |
| Den/OpenWork | 多类型 | FSL-1.1（ee/ 有商业边界） | 资产市场只是其全家桶一部分；非全开源 |
| HiMarket | 多类型 | Apache 2.0 | 网关控制面形态，绑定特定网关生态 |
| ClawHub / OpenSkills | 单类型 | - | 客户端生态/注册面，非完整治理平台 |

AI Asset Hub = 多类型资产原生设计 + 开放协作审核治理 + TS 全栈 + 真开源（Apache 2.0），
在当前开源生态中无直接同类。

## 2. 核心范围

### 2.1 资产类型（原生 type 设计）

首期三类，全部为主流 agent 生态通用词：

| type | 包形态 | 安装目标 |
|------|--------|---------|
| `skill` | SKILL.md + 资源目录（兼容 OpenSkills/Claude 约定） | agent 技能目录（`.agents/skills` 等） |
| `mcp` | 双形态：远程 = 连接配置（url/headers）；本地 = stdio 声明 + 实现脚本 | 客户端 MCP 配置区（`mcp.json` 等） |
| `agent` | agent 定义包（声明型：行为描述 + 可选模型偏好/技能引用；无执行代码） | agent 运行时配置目录（各客户端自定） |

演进路径（类型登记按需扩展，不锁死）：

`skill → mcp → agent → cli（命令行工具）→ api-tool → python（脚本运行时包）→ 连接类（V2，凭据/Key 型资产）`

新增类型流程：类型登记 + 族协议文档（zip 布局/manifest/校验器）+ 前端内容视图组件 + CLI 安装目标 —— 模式固定，按需走流程，不提前实现。

### 2.2 治理模型

- 坐标 **`slug`（全局唯一，跨类型）**：无命名空间维度（M4-pre 扁平化重构——原 `@namespace/slug` 的空间段已删）
- **开放协作**：任何人可向任意资产提交更新；非 owner 提交走 `PENDING_REVIEW` 审核；
  owner / 平台管理员审核 —— Git 式协作，非 owner 独占（M4-pre：原「空间管理员」「全局空间由平台管理员治理」随空间域删除）
- 生命周期：版本全序含扫描态（DRAFT → SCANNING → SCAN_FAILED → UPLOADED →
  PENDING_REVIEW → PUBLISHED，详见 08 §7）；资产状态 ACTIVE/HIDDEN/ARCHIVED；
  版本化 + 标签通道（latest 只读，回滚走自定义标签）
- 安全：发布前置校验器（按 type 插拔）+ 安全扫描扩展点 + 全链路审计

### 2.3 消费与兼容

- CLI：安装/发布/搜索/认证（Device Flow 风格），一条命令装到对应位置
- 兼容边界：`skill` 资产承诺 OpenSkills/Claude 目录约定互操作；`mcp`/`agent`
  为平台原生协议（遵循生态通用配置形态），第三方格式只做导入适配器，非协议承诺
- 公开资产匿名可浏览/下载；自托管部署默认形态

## 3. 关键决策（决定板）

| # | 决策 | 结论 | 理由 |
|---|------|------|------|
| D1 | 项目形态 | 全新自研开源项目（从零设计，无历史包袱） | 目标架构（多类型资产）需要原生设计，自研最干净 |
| D2 | 名称 | AI Asset Hub | 直白表达定位；GitHub 同名无威胁 |
| D3 | License | Apache 2.0 | 全开源；对齐 agent 生态惯例 |
| D4 | 技术栈 | TypeScript 全栈（Hono + Drizzle + PostgreSQL；React 19 + Vite；zod） | 资产协议生态同语言；协议校验 zod 表达力强；前后端同栈 |
| D5 | 多类型 | 原生 type 设计（非单一聚合根打补丁） | 从零项目无历史包袱，一次到位 |
| D6 | 治理 | 开放协作 + PENDING_REVIEW（非 owner 独占） | 企业协作已验证的哲学；可持续维护 |
| D7 | 用户体系 | 产品自带（本地账号 + SSO/OIDC 适配） | 开源产品须可独立部署；与既有注册中心用户打通为部署期集成选项 |
| D8 | Clean Room | 架构借鉴同类开源设计，代码全部新写 | Den(ee/) 为 FSL，禁止复制其代码入开源仓库 |
| D9 | 生态兼容 | skill 兼容 OpenSkills/Claude 约定；不与任何特定客户端绑定 | 标准开源产品，服务所有 agent 生态 |

## 4. 设计原则

- 协议即 schema：资产包协议用 zod 单一定义，前后端共用，manifest 校验一致
- 治理优先：审核/审计/安全是分发平台的立身之本，功能可砍，治理不砍
- 类型是维度：一套版本/审核/标签/搜索管线服务所有类型，类型只决定「包怎么验、怎么展示」
- 兼容省心：skill 资产吃 OpenSkills/Claude 生态约定，迁移成本最低
- 中立开放：协议与文档不绑定任何特定客户端/内部系统，面向全部 agent 生态
- 单仓库：server + web + cli + docs 一体演进

## 5. 里程碑

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| M0 | 项目骨架：repo/license/README/docs 体系 | ✅ 本次 |
| M1 | 平台底座：schema/用户认证(本地+SSO 适配)/命名空间/对象存储/审计 | ✅ 阶段一 platform-core + 阶段二 五板块完成（命名空间 HTTP API / 对象存储 Local SPI / API Token 签发-Bearer / 审计浏览 / OIDC 授权码流 / Device Flow；T28/T34 冒烟记录于 M1-phase2 plan） |
| M2 | 资产域：skill/mcp/agent 三类资产坐标注册 + 族协议校验器/解析器 + 版本上传（DRAFT） | ✅ 2026-09-08 完成（资产域闭环：坐标注册/管理、三族校验器+解析投影、版本上传 DRAFT+读面/删除、空间 OWNER 转让、审计补全——design/plan 见 `2026-09-08-m2-asset-domain-design` + `M2-assets.md`；converge 重评见 docs/00 §7 ②） |
| M3 | 治理管线：SCANNING→PUBLISHED 状态流转（扫描/审核/发布）+ 标签/搜索/下载/统计 | ✅ 2026-09-08 完成（治理闭环：版本八态 schema+迁移、审核管线（submit/approve/reject/withdraw + 队列读面 + HTTP API）、yank 撤回与 latest 维护、删除面放宽、label 管理/挂载、搜索（q/标签/排序）、下载五档授权+限流、bundle 顺存、token scope 交集——design/plan 见 `2026-09-08-m3-governance-pipeline-design` + `M3-governance.md`；T1-T15 全绿 514 tests） |
| M4 | 前端：市场门户（类型化浏览/搜索/详情）+ 管理后台 | M4a ✅ 2026-09-09（市场门户：类型化浏览/搜索/详情三 tab + 行级版本对比——design/plan 见 `2026-09-09-m4a-marketplace-portal-design` + `M4a-marketplace.md`；T1-T19 全绿 538 tests；联调 dogfood 截图/记录 docs/smoke/2026-09-09-m4a-t18.md；修复录：useApi StrictMode abort / server lint 债全清）。M4b ⬜ 管理后台（标签/生命周期/审核 UI——按扁平模型重写 design v1.0，待立项） |
| **M4-pre** | **前置重构（扁平化）**：4 档角色（未登录/用户/管理/超管）· 删空间域 · 删可见性 · 坐标改全局唯一裸 slug · 删权限码矩阵 | ✅ 2026-09-10 完成（迁移 0005/0006/0007 三阶段实落；四门禁全绿 `--force`；全链冒烟 24/24 + 浏览器 dogfood 21/21 零 console error——design/plan 见 `2026-09-10-flat-model-refactor-design` + `M4-pre-flat-model-refactor.md`；冒烟记录 docs/smoke/2026-09-10-m4-pre-s2.md · `-s3.md`；板块 A-D 自检 9.10/9.32/9.28 + 收尾 converge） |
| M5 | CLI：安装/发布/搜索（对齐 OpenSkills/ClawHub 习惯） | ⬜ |
| M6 | 开源发布完善：贡献指南/CI/文档站/CHANGELOG.md + runbook 事故手册惯例 + 可选存量中心迁移工具 | ⬜ |

**里程碑出口标准**：相关设计文档 8 维自检 ≥9 定稿 + 对应计划 Task 全绿 +
代码验证通过 —— 三项齐备才可翻转状态为 ✅。

## 6. 首期非目标

- 多租户 / 空间隔离、计费/额度体系（网关层职责，不做——M4-pre 已删空间域，明确不做租户隔离）
- 在线资产编辑器
- 社交面（评分/评论/关注）—— 只保留下载统计与收藏所需最小集
- 与 Den/ClawHub/OpenSkills 服务端的协议级互联（格式兼容即可，互联后置）
- 云托管服务（开源自托管优先）
- 连接类资产（凭据/Key 型）—— V2 规划，与 MCP 并列设计

## 7. 文档体系

**三层一表 + 单向引用链**：

```
① 规范层  docs/NN-<主题>.md         定义系统形态（常青，跨里程碑稳定）
          00 定位/决定板 · 01 资产协议总纲 · 02-04 各族协议
          05 用户与权限 · 06 标签分类 · 07 UI 语言与本地化 · 08 数据模型
          按需新增：09 API 约定 / 10 部署配置 …

② 设计层  docs/designs/YYYY-MM-DD-<主题>-design.md   记录阶段决策（7 段骨架）
          触发：里程碑内出现需拍板的设计块（技术选型/状态机/UX 线框）
          例：M1 底座数据模型 · M3 审核治理 · M4 前端 UX
          定稿门禁：8 维自检 ≥9 → grilling → 重评 ≥9
          实施完成重评（converge）：文档落地/里程碑收尾必跑文档-代码对齐回查
          （版本头/修订记录/引用/状态同步），8 维重评 ≥9——设计不因代码演化而腐化
          任务清单不属本层：实现细则一律落对应 plan（见 ③）
          合并铁律：同主题小迭代追加既有 design（bump 版本），不新建散文档

③ 计划层  docs/plans/<里程碑>-<主题>.md       实现任务清单
          粒度：文件级任务 + 验收断言（命令/测试/断言）
          完成 = 断言为真；计划中冒出现未定决策 → 停下回设计层

④ 追踪表  00 §5 里程碑表 = 状态唯一源（出口标准见 §5）
```

引用链（单向）：`plan → design → 规范 §N`——引用不复制，防漂移；
改规范只动一处，引用方靠链接不靠拷贝。语言：中文为主，术语保留英文；
元信息/修订记录/评分门禁规则同项目既有习惯。

## 8. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：项目定位与方向定稿（决定板 D1-D9） |
| v1.1 | 2026-09-04 | sunxuewen-rush | 类型三件套定稿（skill/mcp/agent）；演进路径中立化；内部语境清理 |
| v1.2 | 2026-09-04 | sunxuewen-rush | §5 里程碑出口标准；§7 文档体系三层一表（规范/设计/计划 + 追踪表） |
| v1.3 | 2026-09-04 | sunxuewen-rush | §2.2 生命周期补扫描态全序（SCANNING/SCAN_FAILED/UPLOADED），指向 08 |
| v1.4 | 2026-09-04 | sunxuewen-rush | §5 M6 补 CHANGELOG.md 与 runbook 事故手册惯例（对标 OpenWork 运维文档借鉴） |
| v1.5 | 2026-09-07 | sunxuewen-rush | §5 M1 状态注记：阶段一 platform-core ✅（M1-plan 执行至 T24），阶段二后置另立 plan |
| v1.6 | 2026-09-07 | sunxuewen-rush | 元数据同步：Status 改定稿（M0 评审通过；方向决定板随里程碑演进，见 §5） |
| v1.7 | 2026-09-08 | sunxuewen-rush | §5 M1 状态注记：阶段二 五板块完成 ✅（M1-phase2 全 Task 绿；OIDC/Device Flow/Token/审计 落地） |
| v1.8 | 2026-09-08 | sunxuewen-rush | §7 ② 设计层补「实施完成重评（converge）」约定：里程碑收尾必跑文档-代码对齐回查 + 8 维重评（M0/M1 复验沉淀；防 design 层因代码演化腐化） |
| v1.9 | 2026-09-08 | sunxuewen-rush | §7 ② 设计层骨架 8 段 → 7 段：任务清单段删除（实现细则归属计划层，design 不复制，消除双清单漂移）；③ 计划层收拢为「实现任务清单」单一定位 |
| v1.10 | 2026-09-08 | sunxuewen-rush | §5 M2 行完成注记（资产域闭环——坐标注册/管理、三族校验器、DRAFT 上传+版本读面/删除、OWNER 转让、审计补全）；M3 行补治理语义注记（六态推进——上传即 DRAFT 已落 M2） |
| v1.11 | 2026-09-08 | sunxuewen-rush | §5 M3 行完成注记（治理管线闭环 2026-09-08——八态/审核管线/yank/删除面/label/搜索/下载/bundle/scope；T1-T15 全绿） |
| v1.12 | 2026-09-09 | sunxuewen-rush | §5 M4 行注记：M4a 市场门户完成 ✅（portal design v0.8 落地；T1-T19 全绿 538 tests；dogfood 记录 docs/smoke/2026-09-09-m4a-t18.md）；M4b 管理后台拆待办 |
| v1.13 | 2026-09-10 | sunxuewen-rush | **M4-pre 扁平化重构同步**：§2.2 坐标改「全局唯一裸 slug，无命名空间维度」+ 审核主体去「空间管理员/全局空间治理」；§5 **新增 M4-pre 行 ✅**（4 档角色/删空间域/删可见性/裸 slug；迁移 0005-0007；四门禁 + 全链冒烟 24/24 + dogfood 21/21）+ M4b 范围更新（按扁平模型重写 design）；§6 首期非目标补「多租户 / 空间隔离」；**L93/L94 历史完成注记不改**（已发生事实，重构记录由 M4-pre 行承担）——design/plan 见 `2026-09-10-flat-model-refactor-design` + `M4-pre-flat-model-refactor.md` |
