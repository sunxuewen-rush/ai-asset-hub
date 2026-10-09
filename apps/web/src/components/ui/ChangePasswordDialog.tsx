/**
 * 自助改密对话框（M4c-2 **T5** · 批 design §4.5 R21）。
 *
 * 契约：
 * - **零薄端点**：直调官方 `POST /api/auth/change-password`（`revokeOtherSessions: true`）；
 * - **目录账号无入口**：本组件只在 `hasLocalPassword === true` 时被 `UserMenu` 渲染（入口层拒绝）；
 * - **视觉零新值**：`Dialog` / `Input` / `Button` / `Label` 全部复用（M4a §4.4 体系，无新视觉决策）；
 * - 前端校验：非空 · ≥8 位（官方 `min 8`）· 两次一致；服务端仍是权威（错误码经 `tErr` 呈现）。
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { changePassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { useI18n } from '@/i18n/I18nProvider';

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t, tErr } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = next !== '' && next.length < 8;
  const mismatch = confirm !== '' && next !== confirm;
  const canSubmit = current !== '' && next.length >= 8 && next === confirm && !busy;

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  const submit = async () => {
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast.success(t('account', 'toast.changed'));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('account', 'password.title')}</DialogTitle>
          <DialogDescription>{t('account', 'password.desc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="cp-current">{t('account', 'password.current')}</Label>
            <Input
              id="cp-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="cp-next">{t('account', 'password.new')}</Label>
            <Input
              id="cp-next"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">{t('account', 'password.hint')}</span>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="cp-confirm">{t('account', 'password.confirm')}</Label>
            <Input
              id="cp-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch ? (
              <span className="text-xs text-destructive">{t('account', 'password.mismatch')}</span>
            ) : null}
            {tooShort ? (
              <span className="text-xs text-destructive">{t('account', 'password.tooShort')}</span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{t('account', 'password.revokeNote')}</p>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            {t('common', 'cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {t('account', 'password.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
