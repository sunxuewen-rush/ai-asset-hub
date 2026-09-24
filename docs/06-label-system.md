# 标签与分类设计

> Date: 2026-09-04
> Updated: 2026-09-24（v1.7：**§5.2 一级可重挂**——原「一级不可降级」硬拒改为**安全重挂**（前置 = 自身无子级 + 目标必须一级），并**明写相对兄弟仓 SkillHub 契约的偏离 + 理由**；见 M4b-6 批 design **F218**）· 2026-09-24（v1.6：**§2.3 解析链精确化**——补齐「主语言前缀回退」（`zh-cn` / `zh-Hans` 等带地区码行）+ locale 归一，并写明「精确优先于前缀」；背景 = 管理页写入 `zh-CN` 落库 `zh-cn` 后中文请求误落 `en`，见 M4b-6 批 design F215）· 2026-09-10（v1.5：**M4-pre 扁平化重构同步**——§1 去「空间运营」；§3 挂载 RECOMMENDED 判定改「owner 本人 / 管理档」；§5.3 API 路径去命名空间段；§6 引用同步；v1.4：复盘对标 skillhub 源码修正——管理面响应 slug 契约/定义上限/翻译整组替换/locale 归一/parent_id 索引；v1.3（2026-09-08）：M3 实现同步——标签管理管线落地（定义 CRUD/挂载/公开列表）；v1.2：实现状态同步——M1 落 label 数据表结构；v1.1 §5.3 API 路径前缀统一 /api）
> Status: 定稿（M1 已落 label_definition/translation/asset_label 表结构；M3 已按 v1.3-v1.4 落地标签管理管线——定义 CRUD/挂载/公开列表全量实现 + skillhub 对标修正）
> Scope: AI Asset Hub 的 label 体系 —— 定义/多语言/两级分类/挂载/筛选语义/权限
> 设计来源：企业实战验证的 label 方案（Phase 1 基础 + Phase 2 两级分类，设计决策继承，命名资产化）

## 1. 定位与范围

label 是资产的**横切分类与运营标记**体系，独立于 type 维度：

- type（skill/mcp/agent）= 资产「是什么」，协议层固定
- label = 资产「归哪类/有何标记」，由平台运营，跨类型通用（skill/mcp/agent 均可挂；M4-pre：原「空间运营」随空间域删除）
- label 承担两类职责：**功能分类**（业务域/方向的两级导航）与**运营标记**（RECOMMENDED 推荐位）

挂载上限：每资产最多 10 个 label。

## 2. 数据模型

三表：

```text
label_definition        label 定义（slug 唯一，自引用成树）
label_translation       多语言展示名（locale → display_name）
asset_label             资产挂载（asset_id + label_id，ON DELETE CASCADE）
```

### 2.1 label_definition

| 字段 | 说明 |
|------|------|
| `slug` | 全局唯一公开标识（kebab-case），API/路径/筛选都走它 |
| `type` | `RECOMMENDED`（功能分类/推荐，可挂载面宽）或 `PRIVILEGED`（特权标记，仅超管挂） |
| `visible_in_filter` | 是否出现在公开筛选列表（`false` = 隐藏导航，挂载仍生效） |
| `sort_order` | 展示排序（一级各自排、二级在父级下排） |
| `parent_id` | 自引用父级（`NULL` = 一级；DB 存内部 id） |
| `created_by` / 时间戳 | 审计 |

### 2.2 层级语义（两级严格树）

- 一级 = 业务域（如 `software`、`hardware`）；二级 = 方向（`communication` 挂 `software` 下）
- 单父级严格树：slug 全局唯一 ⇒ 同一 label 不能同时属于多个一级分类
- 二级 slug **不带域前缀**（`communication` 而非 `sw-communication`）：父子由 `parent_id`
  表达，slug 只承担全局唯一标识；换域（改挂另一一级）时 slug 与挂载均无需变动
- 数据模型天然支持 N 级，**应用层锁两级**（未来放开三级只需放宽校验 + 前端递归渲染，DB 零迁移）
- 层级只存在于定义侧；挂载表/挂载 API/搜索 SQL 均不感知层级（最小改动面）

### 2.3 多语言

`label_translation` 存 `locale → display_name`；**解析链（v1.6 · F215 后精确化）**：
请求语言（归一：trim + `_`→`-` + 小写）→ ① 归一后精确 → ② 主语言精确（如 `zh`）→ ③ **主语言前缀**
（`zh-cn` / `zh-Hans` 等带地区码/书写系统的行）→ ④ `en` → ⑤ `slug`。
（① 精确优先于 ③ 前缀 —— 请求语言那行胜出；未命中任何翻译时回退 slug，保证永不空显示。）

## 3. 权限模型

| 操作 | 权限 |
|------|------|
| label 定义 CRUD（含 parentId 设置） | 仅 `SUPER_ADMIN` |
| 挂载 `RECOMMENDED` | owner 本人 / 管理档（`role >= ADMIN`）/ `SUPER_ADMIN`（M4-pre：原「命名空间 ADMIN」并入管理档） |
| 挂载 `PRIVILEGED` | 仅 `SUPER_ADMIN` |
| 移除挂载 | 同挂载权限 |

权限判定只看 `label.type`，与 label 处于哪一级无关（一级/二级均可为任一 type）。

## 4. 挂载与筛选语义

- 挂载 API 不感知层级：asset_label 只存 `asset_id + label_id`，一级/二级均可挂
- 搜索筛选按「选中节点 + 全部后代」展开多值 OR：
  - 点一级（`software`）→ 前端合并其全部直接子级传多值 OR（命中语义 = 挂了列表任一 label 即命中：
    挂二级的精确资产与挂一级的通用资产都被一级筛选覆盖）
  - 点二级 → 只传该二级 slug
- URL 只同步用户选中的节点 slug（一级或二级）；刷新后前端按树判断是否展开
- 兜底：URL 携带的 label 不在公开列表（已删/`visible_in_filter=false`）→ 视为无筛选，不报错

## 5. API 设计

### 5.1 公开 labels API

```
GET /api/labels        （同 web 查询面）
```

响应（扁平列表 + parentId，前端组树）：

```json
[
  { "slug": "software", "type": "RECOMMENDED", "parentId": null, "displayName": "软件" },
  { "slug": "communication", "type": "RECOMMENDED", "parentId": "software", "displayName": "通讯" }
]
```

- **只返回 `type=RECOMMENDED` 且 `visible_in_filter=true`**（搜索导航只承载功能分类，
  PRIVILEGED 与隐藏项不混入）；资产详情 chip 与 URL 筛选仍按实际挂载生效
- `parentId` 用**父级 slug（String）**而非内部数字 id：slug 是既有公开标识，前端无需暴露数字 id
- 服务端映射：DB 存父级 id，创建/更新按 slug 解析，响应转回 slug

### 5.2 管理 API（SUPER_ADMIN）

label 定义 CRUD + 批量排序：

- `POST/PUT` 请求带可选 `parentId`（String，缺省/`null` = 一级）；**响应 `parentId` 同回父 slug**
  （skillhub LabelDefinitionResponse 同构——入参/响应契约自洽）
- **锁两级校验**：parent 必须是一级分类；不能挂二级之下；不能指自身；parent 不存在 →
  `label.not_found`；二级可换域（含降回一级）
- **一级可重挂**（v1.7 · F218）：原一级标签可挂到另一个一级标签下（变二级），前置 =
  自身**无子级**（有子级时会造三级/孤儿 ⇒ 400 `label.parent.has_children`）；重挂是
  **纯结构变更**——挂载/翻译/排序不动，无数据丢失

  > **相对兄弟仓 SkillHub 契约的偏离（v1.7 · F218）**：SkillHub 的 label 定义契约为
  > 「**一级不可降级 / 不可重挂**」；本仓放开**一级重挂**，理由 = 一级标签误建后原路径
  > 只有「删除重建」，而删除在**有挂载**时被 `label_in_use` 拒、在**有子级**时被
  > `label.parent.has_children` 拒 ⇒ 运营实际**无法归位**。重挂只改结构、不动数据，
  > 且仍受锁两级约束（目标必须一级、自身必须无子级）；其余条款与 SkillHub 保持一致。
- **定义总数 ≤100**（skillhub max-definitions 同构——防膨胀）→ `label.definition_limit_exceeded`
- **翻译**：`translations` 提供即整组替换（删未列 locale——移除翻译可达；PUT 语义）；locale
  入参归一 `_→-` 小写（07 BCP47）；同批 locale 重复 → `label.translation.locale_duplicate` 预检
- 删除：带子级的一级分类拒绝（`label.parent.has_children`，先删/转移子级）；
  DDL `ON DELETE RESTRICT` 双保险 + `parent_id` 索引（子级检查）；删二级 → 级联清理挂载
  （无搜索文档重建——实时 join 模型）
- 展示排序：一级按 `sort_order`、二级在父级下按 `sort_order`（服务端层级序，前端直接消费）

### 5.3 资产 label API（owner / 管理档）

挂载/移除：`PUT/DELETE /api/assets/:slug/labels/:labelSlug` —— 按 §3 权限校验（M4-pre：坐标去命名空间段），
层级无关。查询响应含 `parentId`（该 label 定义侧的层级归属，`null` = 一级）。
**幂等**：重复挂已挂 label → 200 成功（不重复计数、不超上限判定）；移除不存在的挂载 → 204
（DELETE 语义——RESTful 幂等；上限 ≤10 只对新增生效）。

> API 路径前缀统一 `/api`（版本化前缀 `v1` 待 API 设计文档定）；§5 各路径为资源级示意。

## 6. 与相邻文档关系

- `01` §3.2 元数据投影的 category 落点 = 本体系（category 挂载 = 资产挂 label）
- `04` frontmatter 的 `category` 字段：发布时解析映射为挂载（RECOMMENDED 型一级/二级 label）
- `05` §6 用户角色：挂载权限所需的 `owner 本人 / 管理档 / SUPER_ADMIN` 见用户设计（M4-pre 同步）

## 7. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：label 三表/两级树/多语言/挂载筛选语义/权限矩阵 |
| v1.1 | 2026-09-04 | sunxuewen-rush | §5.3 API 路径前缀统一 /api |
| v1.2 | 2026-09-07 | sunxuewen-rush | 实现状态同步：M1 落 label 三表结构（definition/translation/asset_label），管线后置 M3 |
| v1.3 | 2026-09-08 | sunxuewen-rush | M3 实现同步：标签管理管线落地——定义 CRUD/排序（SUPER_ADMIN，slug_taken 409 补码）、挂载 API（RECOMMENDED = owner/空间 ADMIN/SUPER_ADMIN，PRIVILEGED = 仅 SUPER_ADMIN；重复挂幂等 200、≤10 超限 400 label.limit_exceeded、删定义级联挂载） |
| v1.4 | 2026-09-08 | sunxuewen-rush | 复盘对标 skillhub 源码修正：§5.2 管理面响应 parentId 回父 slug（LabelDefinitionResponse 同构）；定义总数 ≤100（definition_limit_exceeded）；翻译整组替换（PUT 语义——删未列 locale）；locale 归一与去重预检（translation.locale_duplicate）；parent_id 索引 + 搜索重建句改「无重建——实时 join 模型」落实 |
| v1.7 | 2026-09-24 | sunxuewen-rush | **§5.2 一级可重挂（F218 修复同步）**：原「**一级不可降级**」硬拒 → **安全重挂**（原一级可挂到另一个一级下变二级；前置 = 目标必须一级 + **自身无子级**，后者违规报 `label.parent.has_children`）；**明写相对兄弟仓 SkillHub 契约的偏离 + 理由**（一级误建后原路径只有删除重建，而删除在有挂载/有子级时均被拒 ⇒ 运营无法归位；重挂为纯结构变更、不动挂载/翻译/排序）；守卫顺序 = 先 `resolveParent`（自指/目标非一级报更具体的 `label.invalid_parent`）后自身子级检查 |
| v1.6 | 2026-09-24 | sunxuewen-rush | **§2.3 解析链精确化（F215 修复同步）**：原文只写「请求语言 → 回退链 → slug」，实现只做了「精确 + 主语言精确」而**漏了注释承诺的主语言前缀回退** ⇒ 管理页表单写入 `zh-CN`（落库归一为 `zh-cn`）后，中文请求一律落 `en`（中文界面显示英文标签名）。现补齐五级链（归一精确 → 主语言精确 → **主语言前缀** → `en` → `slug`）并写明「精确优先于前缀」 |
| v1.5 | 2026-09-10 | sunxuewen-rush | **M4-pre 扁平化重构同步**：§1 「空间运营」去空间维度；§3 挂载 `RECOMMENDED` 判定「命名空间 ADMIN」→ **管理档（`role >= ADMIN`）**；§5.3 API 路径去命名空间段（`/api/assets/:slug/labels/:labelSlug`）；§6 `05` §6 引用同步 |
