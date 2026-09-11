import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import type { StatsResponse } from '../../api/types.js';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 首页 hero（design §4.4；plan T8）
 *
 * 换皮（v0.11）：氛围光斑整块删除；搜索框/CTA 换 shadcn `Input` / `Button`；蓝色投影与 hover 位移清除。
 * v0.14（§4.4 ②bis）：96px 主标改 `--gradient-brand` 蓝渐变（`bg-clip-text` + `text-transparent`）；
 *   主 CTA 叠 `--gradient-cta`（保 `bg-primary` 实底兜底，hover 用 `brightness` 提亮）。
 * v0.15：首页精简为「纯 hero 落地页」——原「了解资产类型」CTA（锚点 `#explore-types` 已随区块删除）
 *   整枚删除。
 * v0.16（用户拍板三项）：① **hero 卡撑满浏览器** —— `min-h-[calc(100vh-110px)]`（110 = 顶栏 58 +
 *   AppShell `main` 上下 padding `pt-4` 16 + `pb-9` 36）+ `flex flex-col justify-center`（内容在卡内
 *   垂直居中；`py-12` 仅作短视口下的上下留白下限）② 「进入技能中心」CTA **整枚删除**（`browseMarket`
 *   键随删；`Link` 导入随之移除）③ **「资产总数」拆分为「技能总数 / 专家总数 / MCP 总数」**——数据源 =
 *   R7 `stats.typeCounts`（枚举驱动动态键），顺序按用户给定（技能 → 专家 → MCP）；同一行内
 *   「累计下载」按原样保留（用户未要求改动）。
 * v0.18（用户拍板「hero 上下与 sidebar 上下一致」）：`min-h` 由 `calc(100vh-110px)` 改
 *   **`calc(100vh-74px)`**（= 顶栏 58 + `main` `py-2` 8×2）——与侧栏浮层面板的上下边界对齐
 *   （实测侧栏面板 `66 → 892` / h 826，hero 卡同值）。
 * v0.18b（去硬编码）：撑满改为 **`flex-1`**（父 `main` 已 `flex min-h-[calc(100vh-58px)] flex-col`）
 *   ——不再自算 `100vh - 74`，只剩「顶栏 58」一个常量；几何实测同值（top 66 / bottom 892 / h 826）。
 * 不变：96/72/52px 三档响应式 · 搜索提交 → `/skills?q=…` · `tabular-nums` · 入场 rise stagger。
 */
export function Hero({ stats }: { stats: StatsResponse | null }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/skills?q=${encodeURIComponent(q)}` : '/skills');
  }

  /** 统计条（`value: null` = stats 未到位 → 渲染 `—`，与旧行为一致） */
  const statsItems = [
    { key: 'statSkill', value: stats ? (stats.typeCounts.skill ?? 0) : null },
    { key: 'statAgent', value: stats ? (stats.typeCounts.agent ?? 0) : null },
    { key: 'statMcp', value: stats ? (stats.typeCounts.mcp ?? 0) : null },
    { key: 'statDownloads', value: stats?.totalDownloads ?? null },
    { key: 'statUsers', value: stats?.totalUsers ?? null },
  ] as const;

  // ⚠ 坑⑦（v0.16/v0.17 实测）：卡改 `flex flex-col` 后，子项 `mx-auto` 会在**交叉轴**吸收剩余空间
  // → 元素退化为 **fit-content**（搜索行实测从 700px 缩到 248px、输入框 180px）。故凡「居中 + 限宽」
  // 的子项**必须显式 `w-full`**（`mx-auto w-full max-w-[Npx]`）——form 与 heroSub 两处均已补。

  return (
    <section className="flex flex-1 flex-col justify-center rounded-2xl bg-card px-10 py-12 text-center shadow-sm [&>*]:animate-rise [&>*:nth-child(2)]:[animation-delay:50ms] [&>*:nth-child(3)]:[animation-delay:100ms] [&>*:nth-child(4)]:[animation-delay:150ms] [&>*:nth-child(5)]:[animation-delay:200ms]">
      <h1 className="mb-[18px] text-[96px] leading-[1.02] font-bold tracking-[-3px] max-[1100px]:text-[72px] max-[1100px]:tracking-[-2.4px] max-[760px]:text-[52px] max-[760px]:tracking-[-1.6px]">
        <em className="bg-[image:var(--gradient-brand)] bg-clip-text not-italic text-transparent">
          AI X Hub
        </em>
      </h1>
      <p className="mb-3 text-2xl font-semibold tracking-[-0.5px]">{t('market', 'heroIntro')}</p>
      <p className="mx-auto mb-8 w-full max-w-[640px] text-lg leading-[1.7] text-muted-foreground">
        {t('market', 'heroSub')}
      </p>

      <form className="mx-auto flex w-full max-w-[900px] items-center gap-2" onSubmit={onSubmit}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('market', 'searchPlaceholder')}
          aria-label={t('market', 'searchPlaceholder')}
          className="flex-1"
        />
        <Button type="submit" className="bg-[image:var(--gradient-cta)] hover:brightness-[1.07]">
          {t('market', 'searchBtn')}
        </Button>
      </form>

      {/* v0.19：去中间分割线（原 `border-t border-border pt-6` 整组移除）。
          v0.20（用户拍板）：统计条改**卡片形态 + 宽度撑满 hero** —— 每项一枚 tile（淡蓝底 `bg-secondary`
          #f0f5ff + 泛蓝细边 `border-border` #e3eaf6 + `rounded-xl`），`flex-1` 等分铺满 hero 内容区宽度
          （不再 fit-content 居中）。tile = 展示件，按 §4.1 纪律 1 手搓：不引 `ui/shadcn/card`（其默认白底在
          hero 白卡内不可见、24px 内距过重，需多处覆盖；且 §4.4 ② 组件源码零改动纪律下不宜就地改）。 */}
      <div className="mt-11 flex w-full flex-wrap justify-center gap-3">
        {statsItems.map(({ key, value }) => (
          <div
            key={key}
            className="min-w-[96px] flex-1 rounded-xl border border-border bg-secondary px-4 py-4"
          >
            <b className="block text-[26px] leading-tight font-bold tracking-[-0.5px] tabular-nums">
              {value === null ? '—' : value.toLocaleString()}
            </b>
            <span className="mt-1 block text-[13px] font-medium text-muted-foreground">
              {t('market', key)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
