#!/usr/bin/env bash
# M4b-4 收尾审计扫描（只读）：残留引用 / 待删件 / 旧口径散点 / 未消费 i18n 键
cd /Users/xuewensun/04-ws/24-ai-asset-hub || exit 1

echo "=== ① 已删/作废件残留（__proto · AssetDrawer · ScanEye · asset-actions）==="
grep -rn "__proto\|AssetDrawer\|ScanEye\|asset-actions" apps/web/src docs/designs/2026-09-18-m4b4-personal-b-design.md docs/plans/M4b-4-me-assets-and-console.md 2>/dev/null | grep -v "作废\|取消\|~~\|留痕" | head -10
echo "(以上为命中；空 = 无残留)"

echo
echo "=== ② 抽屉时代旧口径散点（批 design / 批 plan 全文，排除历史节）==="
grep -n "四段抽屉\|六列\|⋯ 菜单\|打开抽屉" docs/designs/2026-09-18-m4b4-personal-b-design.md docs/plans/M4b-4-me-assets-and-console.md | grep -v "作废\|取消\|v0.7\|v0.9\|历史\|沿革\|R4\|R15" | head -10
echo "(同上)"

echo
echo "=== ③ 未消费 i18n 键（新键中的死键，如实登记）==="
for k in 'version.deleteDisabled' 'version.yankDisabled' 'admin.noPermission' 'status.current' 'section.labels' 'market.versionPublished' 'market.versionYanked' 'version.col.version' 'version.col.status' 'version.col.created' 'version.col.files' 'version.empty'; do
  n=$(grep -rn "'$k'" apps/web/src --include=*.tsx --include=*.ts | grep -v 'src/i18n/' | wc -l | tr -d ' ')
  printf "  %-26s 消费者=%s\n" "$k" "$n"
done

echo
echo "=== ④ 新件导出面（死导出检查：导出是否被引用）==="
for sym in AssetStat canYank canPrivileged deletableStatuses isVersionDeletable DELETABLE_BY_MANAGER DELETABLE_BY_UPLOADER useViewer StarButton starAsset unstarAsset apiPut; do
  n=$(grep -rn "\b$sym\b" apps/web/src --include=*.tsx --include=*.ts | grep -v "export function $sym\|export const $sym\|export interface $sym\|export async function $sym" | wc -l | tr -d ' ')
  printf "  %-22s 引用=%s\n" "$sym" "$n"
done

echo
echo "=== ⑤ 门户调用点零 diff 复核（CenterPage / useMarketQuery 消费点）==="
git status --porcelain apps/web/src/components/market/CenterPage.tsx apps/web/src/components/market/FilterStrip.tsx || true
echo "(空 = 零 diff)"

echo
echo "=== ⑥ 主 design / docs00 是否仍有「抽屉 / 快速预览」在册项 ==="
grep -rn "资产管理抽屉" docs/00-product-direction.md docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md | head -5
echo "(命中属历史/作废留痕，需逐条判读)"

echo
echo "=== ⑦ 【活口径谓词】作废件在「非留痕行」的命中（应恒为 0 —— F64）==="
echo "判据：命中行不含 作废|取消|~~|修订记录|历史|沿革|收益|留痕 等标记 ⇒ 视为陈旧活口径 ⇒ 报警"
for f in docs/00-product-direction.md docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md docs/designs/2026-09-18-m4b4-personal-b-design.md docs/plans/M4b-4-me-assets-and-console.md docs/smoke/2026-09-18-m4b4-personal-b.md; do
  hits=$(grep -n "抽屉\|AssetDrawer" "$f" | grep -v "作废\|取消\|~~\|修订记录\|历史\|沿革\|收益\|留痕\|v1\.9\|v0\.9\|抽屉宽\|Drawer\.tsx\|不进 URL\|全宽侧滑\|toast\|资产管理（" | wc -l | tr -d ' ')
  printf "  %-70s 非留痕命中=%s\n" "$f" "$hits"
done
echo "(全部为 0 方可提交；非 0 ⇒ 逐条订正后再跑)"
