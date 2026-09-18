/**
 * 收藏按钮共用件（M4b-4 T16 · 契约 = 批 design §5.1 ⑧ · §2.1d R20/R23）。
 *
 * 消费点（**1 处** · 2026-09-18 收敛）：
 * 资产详情页头卡 —— `[收藏 N]` 次级按钮（R20：消费者动作从右栏移到 title 卡）
 * （门户资产卡的收藏已改**纯展示**：`AssetStat kind="star"`，与下载同件同款 —— 用户 2026-09-18
 *  「卡片上的星标只用显示就好了，不用响应点击。类似于元信息」⇒ **收藏交互的唯一入口 = 详情页**）
 *
 * 口径：
 * - **交互按钮**才表达收藏态：已收藏 ⇒ 星形填充 `text-warning`
 *   （R23：列表列 / 详情元信息卡 / **门户卡** 的展示型图标一律无色、不表达收藏态）
 * - **未登录** ⇒ `toast` + 跳 `/login?next=<当前页>`，**不发写请求**（G18 断言）
 * - **幂等**：服务端双保险 + 飞行中 `disabled`（防连点重入）
 * - 乐观值走 `override`：外部重取（详情重取 / 列表回访）后以 props 为准 ⇒ 「点完数字不动」类观感不会发生
 * - `loading`（会话未就绪）**不渲染**：按 anon 渲染再切换 = 首帧闪烁（沿 U1 口径）
 */
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { starAsset, unstarAsset } from '@/api/stars';
import { Button } from '@/components/ui/shadcn/button';
import { useViewer } from '@/hooks/useViewer';
import { useI18n } from '@/i18n/I18nProvider';

export function StarButton({
  slug,
  starred,
  count,
  className,
}: {
  slug: string;
  starred: boolean;
  count: number;
  /**
   * 形态（2026-09-18 收敛为**单一形态**）：门户卡上的收藏已改**纯展示**（`AssetStat kind="star"`，
   * 用户「卡片上的星标只用显示就好了…类似于元信息」）⇒ 本件现只为**详情页头卡**的 `[收藏 N]` 服务，
   * 不再有 `compact` / `form` 变体（避免死代码）。
   */
  className?: string;
}) {
  const { t, tErr } = useI18n();
  const viewer = useViewer();
  const navigate = useNavigate();
  const location = useLocation();
  const [override, setOverride] = useState<{ starred: boolean; count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  if (viewer.loading) return null;

  const on = override?.starred ?? starred;
  const n = override?.count ?? count;
  const label = t('market', on ? 'starred' : 'star');

  async function onClick() {
    if (busy) return;
    if (viewer.userId === null) {
      toast.info(t('market', 'starLoginRequired'));
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }
    setBusy(true);
    try {
      const result = on ? await unstarAsset(slug) : await starAsset(slug);
      setOverride({ starred: result.starred, count: result.starCount });
      toast.success(t('market', result.starred ? 'starToast' : 'unstarToast'));
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      disabled={busy}
      aria-pressed={on}
      aria-label={`${label} ${n}`}
      title={`${label} ${n}`}
      onClick={() => void onClick()}
    >
      <Star className={on ? 'size-4 fill-current text-warning' : 'size-4'} />
      <span className="text-[11px] tabular-nums">{`${label} ${n}`}</span>
    </Button>
  );
}
