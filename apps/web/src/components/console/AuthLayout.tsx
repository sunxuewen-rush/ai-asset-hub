/**
 * 认证页独立版式（批 design §5.1/§5.2：「**独立版式**——不入 `AppShell`，无侧栏 / 无顶栏件」）。
 *
 * `/login` 与 `/device` **共用**：顶部品牌（`--gradient-brand` 渐变字，**引用**视觉真值 SSOT
 * = M4a design §4.4，不复制色值）+ 语言切换器；中部居中内容槽（顶部对齐，`items-start`）。
 *
 * 抽出理由（T7 执行期）：T6 把该版式内联在 `pages/Login.tsx` 的 `LoginScaffold` 里；
 * 设备授权页是**同一版式** ⇒ 抽为跨页件，避免第二份品牌字样式（T6 自检 B3/C4 已就该项扣分）。
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center no-underline" aria-label="AI X Hub home">
          <b className="bg-[image:var(--gradient-brand)] bg-clip-text text-[17px] font-bold tracking-[-0.3px] text-transparent">
            AI X Hub
          </b>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-24">{children}</main>
    </div>
  );
}
