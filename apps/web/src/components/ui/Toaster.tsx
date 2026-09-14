import { Toaster as SonnerToaster } from '@/components/ui/shadcn/sonner';

/**
 * 轻提示（toast）全局单例容器（design §5.2；主 design §9 写操作反馈）。
 *
 * 形态 = 官方 shadcn `Sonner` 封装（`shadcn/sonner.tsx`，本仓 `ui/Toaster.tsx` 只做**应用层默认值**与
 * 稳定导入路径）；**全局单例**挂载于 `main.tsx`（App 根，路由之外 ⇒ 跨页存活）。
 *
 * 本件只设官方支持的 props（非 className 外观覆盖）：
 * - `closeButton`：给每条 toast 一个可键盘关闭的 ✕（a11y）
 * - `position="top-right"`：避开门户右下角的下载态与滚动条热区
 *
 * 消费方式（M4b-2 起）：`import { toast } from 'sonner'` 触发，
 * 或 `<Toaster />` 已挂根 ⇒ 直接 `toast.success(t('...'))`。
 */
export function Toaster() {
  return <SonnerToaster closeButton position="top-right" />;
}
