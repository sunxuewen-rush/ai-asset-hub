import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/shadcn/command';
import { useAuth } from '../../auth/AuthProvider.js';
import { hasRole } from '../../auth/roles.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { buildNav } from './navItems.js';

/**
 * 命令面板（**T11-i 的 B 部分** · 规格 = M4a design **§8.13**）
 *
 * 官方 `CommandDialog`（底层 cmdk）承载两类动作：
 *   · **页面跳转** —— 消费 `navItems.buildNav` 的**同一份**导航清单（与侧栏同源 ⇒ 不复制第三份路由表），
 *     并按角色过滤（`authed` / `hasRole` 档位）⇒ **未登录只列门户 4 条**（不泄露管理面）
 *   · **兜底行** —— 输入非空时末行「在全部资产里搜「{q}」」⇒ 回车跳 `/search?q=`（与 §8.12 结果页串联）
 *
 * **不做**：面板内直接列**资产结果**（要打接口 ⇒ 登记后续）· 危险动作（登出 / 发布不进面板）。
 * 入口两处：**侧栏框样触发器**（`SideNav` 的 `onOpenPalette`）与 **`⌘K` / `Ctrl+K`**（`AppShell` 监听）。
 *
 * **条目形态**（2026-09-20 拍板 · 参照官方站）：**页面**条目带 `→` 前缀箭头（跳转语义）；
 * **兜底行**不带箭头（它是「搜索」语义，不是跳转 ⇒ 不给跳转符号，免歧义）。
 */

/** 快捷键徽标文案（平台判定 · 非文案 ⇒ 不进 i18n） */
export function paletteShortcutLabel(): string {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl+K';
}

/** 面板条目（只列**有 `to`** 的页面 —— 占位条目（管理看板 / 系统设置 / 用户管理）不进面板） */
interface PaletteItem {
  to: string;
  text: string;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { state, role } = useAuth();
  const [q, setQ] = useState('');
  const { portal, groups } = buildNav(t);

  /** 组级门槛（与侧栏同一口径）：个人组 = 已登录 · 管理 / 超管组 = `hasRole` 档位 */
  const allowed = groups.filter((group) =>
    group.gate === 'authed' ? state.status === 'authed' : hasRole(role, group.gate),
  );
  const pages: PaletteItem[] = [
    ...portal.map((entry) => ({ to: entry.to, text: entry.zhLabel })),
    ...allowed.flatMap((group) =>
      group.entries
        .filter((entry) => entry.to !== undefined)
        .map((entry) => ({ to: entry.to as string, text: entry.text })),
    ),
  ];

  // 关闭后清空关键词（下次打开是干净状态）
  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  const keyword = q.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('navigation', 'searchEntry')}
      description={t('navigation', 'palettePlaceholder')}
    >
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder={t('navigation', 'palettePlaceholder')}
      />
      <CommandList>
        <CommandEmpty>{t('navigation', 'paletteEmpty')}</CommandEmpty>
        <CommandGroup heading={t('navigation', 'pages')}>
          {pages.map((page) => (
            <CommandItem
              key={page.to}
              value={`${page.text} ${page.to}`}
              onSelect={() => go(page.to)}
            >
              {/* 条目前缀箭头（lucide ArrowRight · 尺寸/色值由官方 `CommandItem` 内建样式给：
                  `[&_svg:not([class*=size-])]:size-4` + `[&_svg:not([class*=text-])]:text-muted-foreground`
                  ⇒ 此处不写 className，不覆盖官方件） */}
              <ArrowRight />
              {page.text}
            </CommandItem>
          ))}
        </CommandGroup>
        {keyword ? (
          <>
            <CommandSeparator />
            <CommandGroup>
              {/* 兜底行：value 带上关键词 ⇒ 自带过滤不会把它滤掉 */}
              <CommandItem
                value={`assets ${keyword}`}
                onSelect={() => go(`/search?q=${encodeURIComponent(keyword)}`)}
              >
                {t('navigation', 'paletteSearchAssets', { q: keyword })}
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
