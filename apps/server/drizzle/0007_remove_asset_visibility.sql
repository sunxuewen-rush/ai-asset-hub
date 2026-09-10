-- M4-pre S3/T10：删除资产可见性（design §2.3 R3——可见性概念整体取消，所有资产公开）
-- 依赖检查：`asset.visibility` 无索引、无约束引用（0006 重建的 asset 索引仅 idx_asset_status/uq_asset_slug）
--   → 单条 DROP COLUMN 即可，无需重排（与 0005/0006 的顺序坑不同）。
-- 语义后果（数据层）：存量 NAMESPACE_ONLY/PRIVATE 资产在此迁移后**对外公开可见**——读面仅由
--   `asset.status` 决定（非 ACTIVE 仅 SUPER_ADMIN 可读，其余 404；活跃面列表恒过滤 ACTIVE）。
--   S2 起这两种可见性已退化为 owner-only，故本迁移把其可见面放大到公开——属设计既定（R3 拍板）。
ALTER TABLE "asset" DROP COLUMN "visibility";
