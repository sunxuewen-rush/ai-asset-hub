import { useLocation, useNavigate } from 'react-router-dom';
import { AssetSearch } from '@/components/search/AssetSearch';
import { Separator } from '@/components/ui/shadcn/separator';
import { SidebarTrigger } from '@/components/ui/shadcn/sidebar';
import type { Translate } from '@/i18n/I18nProvider';
import { useI18n } from '@/i18n/I18nProvider';
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
 *
 * **2026-09-17 UI 重做 T11（批 design §14.4 C · §14.6 Q7）**：新增**页面标题区**——
 * 标题 **14px/600** + 分区 **12px**（`text-muted-foreground`）；来源 = 当前路由（`titleOf` 最长前缀优先）
 * · **零新增 i18n 键**（未知路由不渲染本区）。
 *
 * **2026-09-17 对齐官方骨架（用户拍板）**：照官方 `blocks/sidebar-07` 的 header 形态——
 * ① **`SidebarTrigger` 置最左**（带 `-ml-1` 视觉贴边）② **品牌字标移出顶栏** ⇒ 落**侧栏顶部**
 * （`SideNav` 的 `SidebarHeader`）③ 图标态**收矮**：官方 `group-has-data-[collapsible=icon]…:h-12`
 * （64→48）⇒ 本仓同构落地 `h-[58px] → h-[42px]`（同减 16）；顶栏高 58 为 AIH 自定值，保留。
 *
 *
 * **2026-09-17 对齐官方 `SiteHeader`（用户拍板「按官方对齐」）**：照
 * `blocks/dashboard-01/components/site-header.tsx` 逐项落地 ——
 *   ① 高度 → CSS 变量 `--header-height`（由 `AppShell` 提供；官方用 `h-(--header-height)` 简写，
 *      本仓因该简写在 Tailwind v4 未生成（同 F4）改**等价的方括号形式** `h-[var(--header-height)]`）
 *   ② 新增**内层容器** `div.flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6`（内距归它，含 lg 响应式）
 *   ③ 分隔符间距 → `mx-2`（不再依赖父级 gap）
 *   ④ 页面标题 → 语义 **`<h1 class="text-base font-medium">`**（原「标题 + 分区」自绘撤除）
 *   ⑤ 补 `shrink-0` + `transition-[width,height] ease-linear`
 *   ⑥ 图标态高度：官方 dashboard-01 用 `h-(--header-height)`（**保持不变**）⇒ 撤除本仓此前的
 *      `58 → 42` 收矮（那是照 `sidebar-07` 的 `h-12` 写法，此处改跟 dashboard-01）
 * ⚠️ **唯一保留的 AIH 差异**：`sticky top-0 z-20 bg-card`（官方 SiteHeader 不 sticky；本仓内容区
 *    随文档滚动，去掉会连带顶栏滚走 ⇒ 属功能性保留，非视觉偏离）。
 */
/**
 * 页面标题区（批 design §14.4 C · §14.6 **Q7**）：按**最长前缀**优先命中（顺序即优先级）；
 * 未命中 ⇒ 不渲染标题区（`/assets/:slug` 等无既有键的路由**不新增 i18n 键**）。
 * 「标题 = 页面全称 / 分区 = 所属组」的分层口径见主 design §11（导航短词 · 页头全称）。
 */
function titleOf(pathname: string, t: Translate): { title: string; section?: string } | null {
  const at = (p: string) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`);
  if (at('/dashboard/assets'))
    return { title: t('dashboard', 'myAssets'), section: t('navigation', 'groupPersonal') };
  if (at('/dashboard/submissions'))
    return { title: t('dashboard', 'submissions'), section: t('navigation', 'groupPersonal') };
  if (at('/dashboard/tokens'))
    return { title: t('dashboard', 'tokens'), section: t('navigation', 'groupPersonal') };
  if (at('/dashboard'))
    return { title: t('dashboard', 'title'), section: t('navigation', 'groupPersonal') };
  if (at('/admin/reviews'))
    return { title: t('admin', 'reviews'), section: t('navigation', 'groupAdmin') };
  if (at('/admin/audit'))
    return { title: t('admin', 'audit'), section: t('navigation', 'groupAdmin') };
  if (at('/admin/labels'))
    return { title: t('admin', 'labels'), section: t('navigation', 'groupSuperAdmin') };
  if (at('/reviews'))
    return { title: t('review', 'title'), section: t('navigation', 'groupAdmin') };
  if (at('/skills')) return { title: t('navigation', 'skills') };
  if (at('/mcps')) return { title: t('navigation', 'mcps') };
  if (at('/agents')) return { title: t('navigation', 'agents') };
  if (at('/')) return { title: t('navigation', 'home') };
  return null;
}

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const crumb = titleOf(pathname, t);
  return (
    <header className="sticky top-0 z-20 flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b border-border bg-card transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        {crumb && (
          <>
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium">{crumb.title}</h1>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* 全资产搜索（**T11-i A** · M4a design §8.12 ④）。
              2026-09-20 用户调整：**靠右**、置于**语言切换左侧**（原 = 标题右侧）；固定 **w-320**（非弹性）。
              `<lg`（1024px）整条隐藏（窄屏不挤顶栏、不做图标钮展开）；提交 ⇒ `/search?q=`（跨类型结果页）
              并**保留输入**（顶栏常驻 ⇒ 便于改词）。组件 = 公共件 `AssetSearch`（与首页 Hero 同一份行为）。 */}
          <AssetSearch
            size="sm"
            className="hidden w-[320px] lg:block"
            placeholder={t('market', 'searchPlaceholder')}
            onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
          />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
