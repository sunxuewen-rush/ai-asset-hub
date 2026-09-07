# 标签与分类设计

> Date: 2026-09-04
> Status: Draft（未动代码）
> Scope: AI Asset Hub 的 label 体系 —— 定义/多语言/两级分类/挂载/筛选语义/权限
> 设计来源：企业实战验证的 label 方案（Phase 1 基础 + Phase 2 两级分类，设计决策继承，命名资产化）

## 1. 定位与范围

label 是资产的**横切分类与运营标记**体系，独立于 type 维度：

- type（skill/mcp/agent）= 资产「是什么」，协议层固定
- label = 资产「归哪类/有何标记」，由平台与空间运营，跨类型通用（skill/mcp/agent 均可挂）
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

`label_translation` 存 `locale → display_name`；解析链：请求语言 → 回退链 → slug。
（未命中任何翻译时回退 slug，保证永不空显示。）

## 3. 权限模型

| 操作 | 权限 |
|------|------|
| label 定义 CRUD（含 parentId 设置） | 仅 `SUPER_ADMIN` |
| 挂载 `RECOMMENDED` | owner / 命名空间 ADMIN / SUPER_ADMIN |
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

- `POST/PUT` 请求带可选 `parentId`（String，缺省/`null` = 一级）
- **锁两级校验**：parent 必须是一级分类；不能挂二级之下；不能指自身；一级不可降级；
  二级可换域；parent 不存在 → `label.not_found`
- 删除：带子级的一级分类拒绝（`label.parent.has_children`，先删/转移子级）；
  DDL `ON DELETE RESTRICT` 双保险；删二级 → 级联清理挂载 + 触发受影响资产搜索文档重建
- 展示排序：一级按 `sort_order`、二级在父级下按 `sort_order`

### 5.3 资产 label API（owner/空间管理员）

挂载/移除：`PUT/DELETE /assets/{namespace}/{slug}/labels/{labelSlug}` —— 按 §3 权限校验，
层级无关。查询响应含 `parentId`（该 label 定义侧的层级归属，`null` = 一级）。

## 6. 与相邻文档关系

- `01` §3.2 元数据投影的 category 落点 = 本体系（category 挂载 = 资产挂 label）
- `04` frontmatter 的 `category` 字段：发布时解析映射为挂载（RECOMMENDED 型一级/二级 label）
- `05` §6 用户角色：挂载权限所需的 owner/空间 ADMIN/SUPER_ADMIN 见用户设计

## 7. 修订记录

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| v1.0 | 2026-09-04 | sunxuewen-rush | 初稿：label 三表/两级树/多语言/挂载筛选语义/权限矩阵 |
