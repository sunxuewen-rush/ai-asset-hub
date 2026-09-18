#!/usr/bin/env bash
# ⑦ 活口径谓词（F64）· 精修版：只抓「交付物形状」的作废件字面
#
# 为什么不用裸 `抽屉`：`Drawer` 是**保留的通用件**（`console/Drawer.tsx`，M4b-1 交付），文档里合法出现
# 在「抽屉宽 560 / 窄屏侧滑 / 状态不进 URL / 组件树」等处 —— 裸词命中全是噪音（实测 57 条假阳性）。
# 本谓词只抓 **五类真陈旧形状**：① `资产管理抽屉`（退役名词）② `AssetDrawer`（作废件名）
#   ③ `快速预览`（退役操作语义）④ `抽屉无…`（缺口表述里仍在说抽屉）⑤ `抽屉统计`（已取消的统计行）
# 排除：历史/过程节（§2.1c/§2.1d/§4.3/评审记录/修订记录/复核/维表/史实/原型评审/发现/审计发现/待明确口令）、
#      头部 `>` 行、修订记录表行、以及**带划线 `~~…~~` 的历史留痕行**。
cd /Users/xuewensun/04-ws/24-ai-asset-hub || exit 1

scan() {
  awk '
    /^#{2,4} / {
      skip = ($0 ~ /2\.1c|2\.1d|4\.3|评审记录|修订记录|复核|维表|史实|原型评审|发现|待明确口令|审计发现/)
      next
    }
    skip { next }
    /^>/ { next }
    /^\| \*?\*?v[0-9]/ { next }
    /~~/ { next }
    /已删\/作废件残留/ { next }  # 证据文件 §5 的**自指行**（审计结论本身），非陈旧口径
    /资产管理抽屉|AssetDrawer|快速预览|抽屉无|抽屉统计/ { print FILENAME":"NR": "$0 }
  ' "$1"
}

echo "=== ⑦ 【活口径谓词】交付物形状的作废件字面（目标 = 0 · F64）==="
total=0
for f in docs/00-product-direction.md docs/designs/2026-09-10-m4b-admin-console-and-auth-design.md docs/designs/2026-09-18-m4b4-personal-b-design.md docs/plans/M4b-4-me-assets-and-console.md docs/smoke/2026-09-18-m4b4-personal-b.md; do
  n=$(scan "$f" | wc -l | tr -d ' ')
  total=$((total + n))
  printf "  %-70s 命中=%s\n" "$f" "$n"
  scan "$f" | cut -c1-170 | sed 's/^/      /'
done
echo "  ── 合计 = ${total}（0 方可提交）"
