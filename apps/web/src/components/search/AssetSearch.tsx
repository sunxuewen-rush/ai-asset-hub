import { Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/shadcn/input-group';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * 全资产搜索框（**公共件** · T11-i A 部分 · 规格 = M4a design **§8.12**）
 *
 * 两个消费点：**首页 Hero**（`size="lg"` · `h-11` 胶囊 · 外框 `max-w-[900px]`）与
 * **顶栏**（`size="sm"` · `h-9` · 外框 `max-w-[320px]`）。**行为只此一份**（原住 `Hero.tsx`
 * v0.24 / v0.25，T11-i 抽出）：
 *   · 空 / 纯空白 ⇒ **不提交**（无反应 —— 2026-09-20 用户拍板「没反应」，不造假推荐词）
 *   · **聚焦 或 有输入** ⇒ **点亮**（`variant="default"` 实底主色 + 白图标；v0.25 判据）
 *   · **可提交性只看「有输入」**（`aria-disabled` + 提交守卫）⇒「点亮 ⟷ 可提交」**解耦**
 *   · 圆角与容器同心（两档均胶囊）；**零 class 覆写** —— 走官方 `InputGroup` / `InputGroupButton`
 *     的 `variant` 两态切换（不赌 `cn` 冲突合并，也不用原生 `disabled`（其 `opacity-50` 会淡图标））
 *
 * **落地由调用方决定**（`onSubmit` prop）：当前两处均跳 `/search?q=`（跨类型结果页）。
 */
export interface AssetSearchProps {
  /** `lg` = 首页（`h-11`）· `sm` = 顶栏（`h-9`） */
  size: 'lg' | 'sm';
  placeholder: string;
  onSubmit: (q: string) => void;
  /** 仅用于**外框**定位 / 限宽；不覆官方件色值与尺寸 */
  className?: string;
}

export function AssetSearch({ size, placeholder, onSubmit, className }: AssetSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  /** 聚焦态（鼠标点入 / Tab 进入 / 官方 addon 代聚焦同路径） */
  const [focused, setFocused] = useState(false);
  /** 空 / 纯空白 ⇒ 空态 */
  const hasQuery = query.trim().length > 0;
  /** 点亮判据 = **聚焦 或 有输入**（v0.25 拍板「点入即变」） */
  const lit = focused || hasQuery;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return; // 空输入 = 无反应（拍板 ①）
    onSubmit(q);
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <InputGroup className={size === 'lg' ? 'h-11 rounded-full' : 'h-9 rounded-full'}>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <InputGroupAddon align="inline-end">
          {/* 两态（未点亮 = `ghost` 底 + 主色描边 + `aria-disabled`；点亮 = 实底主色 + 白图标）。
              `aria-disabled` 只看「有输入」⇒ 聚焦空态虽点亮、仍不可提交。 */}
          <InputGroupButton
            type="submit"
            variant={lit ? 'default' : 'ghost'}
            size="icon-sm"
            aria-disabled={hasQuery ? undefined : true}
            className={lit ? 'rounded-full' : 'rounded-full cursor-default text-primary'}
            aria-label={t('market', 'searchBtn')}
          >
            {/* 2026-09-20 用户调整：放大镜**加粗一倍**（`strokeWidth` 2 → **4**；lucide 默认 2）
                —— 一处生效、两处同观感（首页 `lg` 与顶栏 `sm` 共用本件）。 */}
            <Search className="size-4" strokeWidth={4} aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
