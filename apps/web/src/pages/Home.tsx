import { fetchStats } from '../api/stats.js';
import { Hero } from '../components/market/Hero.js';
import { useApi } from '../hooks/useApi.js';

/**
 * 首页（design §3 v0.15：**首页 = 纯 hero 落地页**——2026-09-11 用户拍板方案 A）
 *
 * IA 变更（非换皮）：删「按类型探索」（`TypeEntryCard`）与「最新发布」两块 → 首页只剩 hero。
 * 依据：hero 内已有「搜索 + 三族计数 + 累计下载 + 用户数量（R7 stats）」，即「怎么进去」与「库里有多少」
 * 均由 hero 承担；被删两块的计数与 hero 统计语义重复，独有价值仅「三族一句话解释」与
 * 「内容新鲜度」（用户判定可舍）。
 *
 * v0.16：「撑满一屏」的职责曾下移到 `Hero` 自身（`min-h-[calc(100vh-110px)]` + 内容垂直居中）——
 * 本页因此不再需要包装层，直接返回 `<Hero />`（该形态仍成立）。
 * v0.18b（去硬编码）：撑满职责**再上移到壳**——`AppShell` 的 `main` 改
 * `flex min-h-[calc(100vh-58px)] flex-col`，`Hero` 改用 `flex-1`（派生和 `74` 已消除，只剩 `58`）。
 * 本页最终形态：`return <Hero stats={stats} />`。
 *
 * 保留：R7 真实统计 · 搜索提交（`/skills?q=`）· 入场 rise 动效。
 */
export function Home() {
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);

  return <Hero stats={stats ?? null} />;
}
