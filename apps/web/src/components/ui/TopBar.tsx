import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/shadcn/separator';
import { SidebarTrigger } from '@/components/ui/shadcn/sidebar';
import { LanguageSwitcher } from './LanguageSwitcher.js';

/**
 * 顶栏（design §4.4 v0.10，plan T5；design v0.12 增侧栏触发钮）
 *
 * 换皮：贴顶**实底白条**（`bg-card`）+ 底部泛蓝细边（`border-border`）——原「悬浮圆角玻璃条」
 * （backdrop-blur + 圆角 18px + 蓝色投影）按 §4.4 废弃清单清除。
 * 品牌字（v0.14，design §4.4 ②bis）：改 **`--gradient-brand` 蓝色渐变**（`bg-clip-text` +
 * `text-transparent`）——v0.9「渐变大字废弃 / 实底 primary」在此项上按用户 2026-09-11 拍板翻转。
 * 侧栏收起（plan T7b）：左端加 `SidebarTrigger`（shadcn 原语钮，`size-7` ghost；键盘 `⌘B`/`Ctrl+B` 亦有效）。
 *
 * **M4b-2 T5 减法（批 design §8「顶栏行」· 主 design §4）**：删除 M4a 的「登录」占位 `<span>`
 * （类型图标衬底 + 登录文案）——用户区已落**侧栏底部**（`SideNav` 的 `UserMenu`）。
 * 顶栏**仅余品牌 + `Separator` + `SidebarTrigger` + `LanguageSwitcher`**；随之移除占位件专用的
 * 两个 import（图标组件 + i18n 上下文——占位删除后顶栏不再有任何文案消费）。
 * 不变：高度 **58px**、sticky/z-20、竖分隔与语言切换器行为零变更。
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center gap-3 border-b border-border bg-card px-4">
      <Link to="/" className="flex items-center no-underline" aria-label="AI X Hub home">
        <b className="bg-[image:var(--gradient-brand)] bg-clip-text text-[17px] font-bold tracking-[-0.3px] text-transparent">
          AI X Hub
        </b>
      </Link>
      {/* 竖分隔（2026-09-11 用户拍板：品牌字与侧栏触发钮**左右对调**后，分隔仍居中隔离两者；
          官方 `blocks/dashboard-01` SiteHeader 形态，高度收 16px，间距沿用本仓 `gap-3`） */}
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <SidebarTrigger />
      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitcher />
      </div>
    </header>
  );
}
