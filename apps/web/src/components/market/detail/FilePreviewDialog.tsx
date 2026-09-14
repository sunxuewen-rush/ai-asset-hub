import { useEffect, useRef } from 'react';
import { fetchVersionFile } from '../../../api/content.js';
import { useApi } from '../../../hooks/useApi.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/shadcn/dialog.js';
import { Spinner } from '../../ui/shadcn/spinner.js';
import { formatBytes } from './fileTreeNodes.js';

/**
 * 文件预览对话框（design §4.4 v0.7 / ③；**M4b-1 T3 归位官方 `Dialog`**）
 *
 * T3 归位（design §3.2）：自绘浮层（`role="dialog"` + `aria-modal` + 手挂 Esc 监听 + 真 button 遮罩
 * + 手写 z 层级（90 / 0 / 10））→ 官方 `Dialog`（`DialogContent` + `DialogHeader` + `DialogTitle`
 * + `DialogDescription`）：白拿**焦点陷阱** / **滚动锁** / **内置 ✕**（`showCloseButton` 默认 true）
 * + Esc / 点遮罩两路关闭；手写 `z-*` 与 Esc 监听整段删除（Radix 承担）。标题 = 文件路径
 * （`DialogTitle` → 语义 `<h2>`），尺寸用 className 覆盖（`w-[min(720px,88vw)]` / `max-h-[76vh]`，
 * 属布局，官方允许）。
 * 视觉净变化（design §8.3）：**+1px 描边**；行为增强：焦点陷阱 / 滚动锁 / 内置 ✕。
 *
 * 不变：遮罩 `bg-black/50` 无 blur（§4.4 废弃清单）· mono pre-wrap · 文本 G7 渲染 / binary /
 * truncated 提示（AIH `--warning`）· useApi 缓存（重复打开零重拉）· 加载 / 错误 / 二进制 /
 * 截断四分支 · 关闭后由消费方卸载（`onClose`）。
 *
 * **焦点归还（本件特有）**：触发按钮在 `FileTree` 内，本件**无 `DialogTrigger`** ⇒ Radix 的
 * 关闭自动归还（依赖 Trigger）不会生效（2026-09-14 实测：Esc 关闭后 `activeElement` ≠ 触发钮）。
 * 故首渲染时捕获打开前焦点、卸载时归还（`restoreRef`）——补足断言②「关闭后焦点回到触发元素」。
 */
export function FilePreviewDialog({
  file,
  slug,
  version,
  onClose,
}: {
  file: { filePath: string; fileSize: number };
  slug: string;
  version: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data, error, loading } = useApi(
    (signal) => fetchVersionFile(slug, version, file.filePath, { signal }),
    [slug, version, file.filePath],
  );

  // 首渲染捕获打开前焦点（Radix 的 autoFocus 在子效果里跑，晚于此处的 render ⇒ 捕获到的是触发钮）
  const restoreRef = useRef<HTMLElement | null>(null);
  if (restoreRef.current === null && typeof document !== 'undefined') {
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  useEffect(() => {
    const target = restoreRef.current;
    return () => target?.focus?.();
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[76vh] w-[min(720px,88vw)] flex-col gap-0 p-0 sm:max-w-[720px]">
        <DialogHeader className="flex-row items-center gap-2.5 border-b border-border px-[18px] py-[13px] pr-12 text-left">
          <DialogTitle className="flex-1 truncate font-mono text-[13px] font-semibold text-foreground">
            {file.filePath}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px]">
            {formatBytes(file.fileSize)}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto px-[18px] py-4 font-mono text-xs leading-[1.7] text-muted-foreground">
          {loading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}
          {error && (
            <p className="py-5 text-center font-sans text-[13px] text-muted-foreground">
              {t('errors', 'unknown', { code: error.code })}
            </p>
          )}
          {!loading && !error && data && (
            <>
              {data.binary && (
                <p className="py-5 text-center font-sans text-[13px] text-muted-foreground">
                  {t('market', 'binaryPreviewUnsupported')}
                </p>
              )}
              {!data.binary && (
                <>
                  {data.truncated && (
                    <p className="mb-2.5 rounded-md bg-warning/10 px-3 py-1.5 font-sans text-[11px] text-warning">
                      {t('market', 'previewTruncated')}
                    </p>
                  )}
                  <pre className="whitespace-pre-wrap break-words">{data.content}</pre>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
