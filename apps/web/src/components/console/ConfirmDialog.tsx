import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/shadcn/field';
import { Textarea } from '@/components/ui/shadcn/textarea';

/**
 * 危险操作确认框（design §5.1）：官方 `AlertDialog` 封装（HIDDEN / ARCHIVED / 删除 / yank / 吊销前）。
 *
 * 规格：`AlertDialogTitle` + `AlertDialogDescription` **必填**（类型上强制）· 确认钮
 * `variant="destructive"`（可关）· **原因三态**（`reason: 'none' | 'optional' | 'required'` · Q8 v0.6 升级）——
 * `none` 无输入区 · `optional` 可留空（通过提交的意见）· `required` 必填（空则确认钮 `disabled`，如驳回 / yank）。
 * 确认回调第二参数 = 已 trim 的原因（`none` ⇒ `undefined`）。
 *
 * 关闭时清空已输入原因（`open` 变化重置）⇒ 下次打开不残留上一次的敏感输入。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  reason = 'none',
  reasonLabel,
  reasonPlaceholder,
  reasonHint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** 确认回调；`reason !== 'none'` 时第二参数为已 trim 的原因（`none` ⇒ `undefined`） */
  onConfirm: (reason?: string) => void;
  destructive?: boolean;
  /**
   * **原因三态**（Q8 定案 · 删旧 `requireReason` 布尔，不留别名）：
   * `none` 不渲染输入区（如撤回）· `optional` 可选意见（如通过）· `required` 必填（如驳回 / yank）。
   */
  reason?: 'none' | 'optional' | 'required';
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonHint?: string;
}) {
  /** ⚠️ 局部态命名 `reasonText`（与 prop `reason` 区分 —— 三态是契约，输入是状态） */
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    if (!open) setReasonText('');
  }, [open]);

  const showReason = reason !== 'none';
  const reasonMissing = reason === 'required' && reasonText.trim() === '';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {showReason ? (
          <Field>
            <FieldLabel htmlFor="confirm-dialog-reason">{reasonLabel}</FieldLabel>
            <Textarea
              id="confirm-dialog-reason"
              value={reasonText}
              placeholder={reasonPlaceholder}
              onChange={(event) => setReasonText(event.target.value)}
            />
            {reasonHint ? <FieldDescription>{reasonHint}</FieldDescription> : null}
          </Field>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={reasonMissing}
            onClick={() => onConfirm(reason === 'none' ? undefined : reasonText.trim())}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
