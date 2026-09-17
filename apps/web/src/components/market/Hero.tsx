import { Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/shadcn/input-group';
import type { StatsResponse } from '../../api/types.js';
import { useI18n } from '../../i18n/I18nProvider.js';

/**
 * 首页 hero（**M4a 门户 design §4.4 视觉体系 + §8.9 呈现规格 v0.29**；plan T8）
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
 * v0.21（2026-09-17 用户拍板 B · 登记 M4a design v0.29 §8.9）：**整个 hero 去卡**（`Card` → `div`）—— 内容是「落底展示」而非「卡内展示」。
 *   本件不再引用 `Card`（实测：该件仍有 6 处消费者——`FilterStrip` / `AssetCard` / `CenterPage` /
 *   `DetailTabs` / `PageHeader` / `AssetDetail` ⇒ 不受影响，非"零消费者"）。撑满/居中/内距/动画四项不变。
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
    // v0.21（2026-09-17 用户拍板 B「整个 hero 去卡」）：原 `<Card>`（官方件：白底 + border + rounded-xl +
    // shadow-sm）整体退役 —— 标题「AI X Hub」与副标 / 搜索行 / 统计条**全部直接落在页面底色上**
    // （底色 = `body` 的 `--gradient-page`，见 `aih-theme.css` §base）。
    // 撑满职责不变：容器仍 `flex-1`（父级 `AppShell` 内容区 `flex min-h-[calc(100vh-58px)] flex-col`）。
    // 内距保留 `px-10 py-12`（卡内留白随之保留在页面层，避免内容贴边）。
    <div className="flex flex-1 flex-col justify-center gap-0 px-10 py-12 text-center [&>*]:animate-rise [&>*:nth-child(2)]:[animation-delay:50ms] [&>*:nth-child(3)]:[animation-delay:100ms] [&>*:nth-child(4)]:[animation-delay:150ms] [&>*:nth-child(5)]:[animation-delay:200ms]">
      <h1 className="mb-[18px] text-[96px] leading-[1.02] font-bold tracking-[-3px] max-[1100px]:text-[72px] max-[1100px]:tracking-[-2.4px] max-[760px]:text-[52px] max-[760px]:tracking-[-1.6px]">
        <em className="bg-[image:var(--gradient-brand)] bg-clip-text not-italic text-transparent">
          AI X Hub
        </em>
      </h1>
      <p className="mb-3 text-2xl font-semibold tracking-[-0.5px]">{t('market', 'heroIntro')}</p>
      <p className="mx-auto mb-8 w-full max-w-[640px] text-lg leading-[1.7] text-muted-foreground">
        {t('market', 'heroSub')}
      </p>

      {/* 搜索行 —— v0.21（2026-09-17 用户拍板 ①）：由「`Input` + `Button` **并列**」改为官方 v4 的
          **`InputGroup` 形态**（= Google 首页那种「框内左侧图标 + 框内按钮」）：
          `<InputGroup>` > `InputGroupAddon(align=inline-start)` 放大镜 + `InputGroupInput`
          + `InputGroupAddon(align=inline-end)` 提交钮。
          · 口径更新：**M4b-1 批 design §6.2 的 D′ 项**（合规清理：输入框内按钮改 `InputGroup`）原以
            「hero 搜索行 = `Input`+`Button` 并列 ⇒ 官方硬规则 5 不适用」豁免；用户 2026-09-17 拍板改为
            **框内形态** ⇒ 本次即该 D′ 项的**收口落地**（豁免作废），登记见 M4b-1 v1.7 + M4a design v0.29 §8.9。
          · `InputGroupAddon` 官方自带「点附加物 → 聚焦框内 input」；放大镜为装饰性 ⇒ `aria-hidden`。
          · 尺寸循官方默认（`InputGroup` `h-9` = 原 `Input` `h-9`）⇒ 视觉高度零变化。
          · **v0.22（2026-09-17 用户拍板）胶囊化**：对标 Google 首页搜索框形态 ——
            `rounded-full`（覆盖官方默认 `rounded-md`）+ 高度 `h-11`（**44px**，Google 同档；原 36 的胶囊会显扁）。
          · **v0.23（2026-09-17 用户拍板方案 ①）单放大镜**：撤掉**左侧** addon 整块，放大镜只保留一次并
            移到**右侧当提交按钮**（`InputGroupButton size="icon-sm"` + `variant="ghost"`，`type="submit"`）
            —— 依据 = Google 的两种范式：首页大框「左提示图标 + 右不同语义图标」，**结果页**「左不放、右侧
            放大镜即提交」；一个框里放大镜只应出现一次，承担提交时归**右侧**。
            · 内距改用官方 addon 自带值（`inline-end` 的 `pr-3` / `has-[>button]:mr-[-0.45rem]`），
              不再叠加自定义 pl/pr。 */}
      <form className="mx-auto w-full max-w-[900px]" onSubmit={onSubmit}>
        <InputGroup className="h-11 rounded-full">
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('market', 'searchPlaceholder')}
            aria-label={t('market', 'searchPlaceholder')}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={t('market', 'searchBtn')}
            >
              <Search className="size-4" aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
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
    </div>
  );
}
