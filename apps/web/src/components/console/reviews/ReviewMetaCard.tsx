/**
 * 右栏 task 元信息卡（批 design §4.2「右栏 1」· M4b-5 T8）。
 *
 * 键值行形态（label 左 `text-muted-foreground` / 值右 ellipsis）+ `StatusPill kind="task"`。
 * 行集合（真源 = `ReviewDetailItem` 字段）：
 * 状态 · 提交人（**= 当前登录者 ⇒ 「你」**；`submittedByName` 缺 ⇒ 回落 `submittedBy`）· 工号 · 提交时间 ·
 * task（`#id` · 评审计数 v`reviewVersion`）· 驳回原因（**仅 `REJECTED` 有值 ⇒ 否则整行不渲染**）。
 */
import type { ReviewDetailItem } from '../../../api/reviews.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { REVIEW_STATUS_KEY } from '../../../lib/review-permissions.js';
import { Card } from '../../ui/shadcn/card.js';
import { StatusPill } from '../StatusPill.js';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-[3px] text-[13px]">
      <span className="w-[64px] shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}

export function ReviewMetaCard({
  detail,
  viewerId,
}: {
  detail: ReviewDetailItem;
  /** 当前登录者 id（判「= 我提交的 ⇒ 显示『你』」；未登录/anonymous ⇒ `null`） */
  viewerId: string | null;
}) {
  const { t } = useI18n();
  const isMine = viewerId !== null && viewerId === detail.submittedBy;
  const submitter = detail.submittedByName ?? detail.submittedBy;

  return (
    <Card className="gap-0 px-5 py-[18px]">
      <h3 className="mb-3 text-[13px] font-bold">{t('review', 'detail.task')}</h3>
      <Row label={t('review', 'col.status')}>
        <StatusPill
          kind="task"
          status={detail.status}
          label={t('review', REVIEW_STATUS_KEY[detail.status])}
        />
      </Row>
      <Row label={t('review', 'detail.submitter')}>
        {isMine ? t('review', 'detail.you') : submitter}
      </Row>
      <Row label={t('review', 'col.employeeId')}>
        {/* `submittedBy`：LDAP 建号 = 工号；dev 夹具 = 合成 `usr_…` ⇒ 截断 + title（不断字换行） */}
        <span className="font-mono text-xs" title={detail.submittedBy}>
          {detail.submittedBy}
        </span>
      </Row>
      <Row label={t('review', 'col.submittedAt')}>
        <span className="text-muted-foreground">
          {new Date(detail.submittedAt).toLocaleString()}
        </span>
      </Row>
      <Row label={t('review', 'detail.task')}>
        <span className="font-mono text-xs">
          #{detail.taskId} · {t('review', 'detail.reviewVersion')} v{detail.reviewVersion}
        </span>
      </Row>
      {/* 驳回原因：仅 `REJECTED` 有值 ⇒ 否则整行不渲染 */}
      {detail.status === 'REJECTED' && detail.reviewComment ? (
        <div className="mt-2 border-t border-border pt-2">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">
            {t('review', 'reason')}
          </p>
          <p className="text-[13px] leading-[1.7] whitespace-pre-wrap">{detail.reviewComment}</p>
        </div>
      ) : null}
    </Card>
  );
}
