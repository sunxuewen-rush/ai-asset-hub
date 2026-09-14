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
 * `variant="destructive"`（可关）· **「需输入原因」变体**（`requireReason`）—— `Field` + `Textarea`，
 * 对应服务端 yank 等动作的 `reason` 必填：原因为空时确认钮 `disabled`，确认回调带出 reason。
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
  requireReason = false,
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
  /** 确认回调；`requireReason` 时第二参数为已 trim 的原因 */
  onConfirm: (reason?: string) => void;
  destructive?: boolean;
  /** 开启「需输入原因」变体（原因必填，空则确认钮禁用） */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonHint?: string;
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const reasonMissing = requireReason && reason.trim() === '';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requireReason ? (
          <Field>
            <FieldLabel htmlFor="confirm-dialog-reason">{reasonLabel}</FieldLabel>
            <Textarea
              id="confirm-dialog-reason"
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(event) => setReason(event.target.value)}
            />
            {reasonHint ? <FieldDescription>{reasonHint}</FieldDescription> : null}
          </Field>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={reasonMissing}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
