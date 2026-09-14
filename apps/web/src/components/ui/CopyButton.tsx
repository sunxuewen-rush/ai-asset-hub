import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

/**
 * 复制按钮（design §5.2：复制资产坐标 / 令牌明文 / sha）。
 *
 * 形态 = 官方 `Button`（`variant="ghost"` + `size="icon-sm"`）+ 官方 `Tooltip` 反馈（本件自带
 * `TooltipProvider`，不要求 App 根改造）；文案由调用方传入（i18n 在消费点）。
 *
 * **明文场景关闭即清**（design §5.2）＝ `clearOnUnmount`：
 * 组件卸载时，若剪贴板内容**仍等于**本件复制的值（读回比对，尽力而为），清空之 —— 用于令牌明文等
 * 敏感值，避免关闭后长期驻留剪贴板。读写失败（无权限/非安全上下文）静默忽略，不影响复制本身。
 *
 * a11y：按钮 `aria-label` 必备；点击后用 `aria-live` 区域播报复制结果。
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  clearOnUnmount = false,
}: {
  /** 待复制文本 */
  value: string;
  /** 按钮 aria-label（如「复制坐标」） */
  label: string;
  /** 复制成功后的提示文案（如「已复制」） */
  copiedLabel: string;
  /** 明文场景：卸载时尽力清空剪贴板（见上文） */
  clearOnUnmount?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!clearOnUnmount) return;
    return () => {
      void (async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === valueRef.current) await navigator.clipboard.writeText('');
        } catch {
          // 读/写剪贴板不可用（权限或非安全上下文）⇒ 尽力而为，静默
        }
      })();
    };
  }, [clearOnUnmount]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={handleCopy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? copiedLabel : label}</TooltipContent>
      </Tooltip>
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </TooltipProvider>
  );
}
