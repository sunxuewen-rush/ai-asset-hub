import { ApiError } from '../../../api/client.js';
import { fetchVersionFile } from '../../../api/content.js';
import type { AssetType, VersionFileEntry } from '../../../api/types.js';
import { useApi } from '../../../hooks/useApi.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { ErrorState } from '../../ui/ErrorState.js';
import { MarkdownRenderer } from '../../ui/MarkdownRenderer.js';
import { Spinner } from '../../ui/Spinner.js';

/**
 * 主文档探测（design §5.2 G7 v0.7 分型）：skill 族 = SKILL.md（必需 root）；
 * mcp/agent 族 = README*（可选——文件清单大小写归一探测 root 级）。
 */
export function mainDocPath(type: AssetType, files: readonly VersionFileEntry[]): string | null {
  if (type === 'skill') return 'SKILL.md';
  const readme = files.find(
    (f) =>
      f.filePath.toLowerCase() === 'readme.md' || f.filePath.toLowerCase().startsWith('readme.'),
  );
  return readme?.filePath ?? null;
}

/** manifest 摘要字段（深度 1：标量 + 纯量数组 join——纯对象/嵌套跳过） */
export function manifestFields(manifest: Record<string, unknown> | null): Array<[string, string]> {
  if (!manifest) return [];
  return Object.entries(manifest)
    .filter(
      ([key, value]) =>
        key !== 'servers' && value !== null && (typeof value !== 'object' || Array.isArray(value)),
    )
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)]);
}

/** 总览 tab（v0.7：主文档 markdown 正文 + manifest 摘要回退——缺主文档不空窗） */
export function OverviewTab({
  type,
  slug,
  version,
  files,
  manifest,
  changelog,
}: {
  type: AssetType;
  slug: string;
  version: string;
  files: readonly VersionFileEntry[] | null;
  manifest: Record<string, unknown> | null;
  changelog?: string | null;
}) {
  const { t } = useI18n();
  const docPath = mainDocPath(type, files ?? []);

  const contentState = useApi(
    (signal) =>
      docPath ? fetchVersionFile(slug, version, docPath, { signal }) : Promise.resolve(null),
    [slug, version, docPath],
  );

  const notFound =
    contentState.error instanceof ApiError &&
    contentState.error.code === 'asset.version_file_not_found';
  // 无主文档（mcp/agent 无 README）或 G7 404 → manifest 摘要卡（不破版）
  const showSummary = docPath === null || notFound;

  if (contentState.error && !showSummary) {
    return <ErrorState error={contentState.error} />;
  }
  // R2：波 2 未就且暂无主文档探测依据 → 加载占位（防误导性空摘要闪烁）
  if (docPath === null && files === null) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (showSummary) {
    const fields = manifestFields(manifest);
    return (
      <div>
        {/* 换皮（T18）：原 `OverviewTab.module.css` 全量 Tailwind 化——字阶按 9 档轴
            （11.5→text-[11px] · 13.5→text-[13px] · 12.5→text-xs），`--text-3`/`--line-faint`
            → muted-foreground / border（§4.4 ⑦）。结构/分支逻辑零变更。 */}
        <div className="mb-3 flex flex-wrap gap-4 border-b border-border pb-3 font-mono text-[11px] text-muted-foreground">
          {docPath ?? 'manifest'} · v{version}
        </div>
        {fields.length === 0 ? (
          <p className="py-5 text-center text-[13px] text-muted-foreground">
            {t('common', 'empty')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-[22px] gap-y-3">
            {fields.map(([key, value]) => (
              <div key={key}>
                <div className="mb-[3px] font-mono text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
                  {key}
                </div>
                <div className="text-[13px] leading-[1.6] break-words text-foreground">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (contentState.loading || !contentState.data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 border-b border-border pb-3 font-mono text-[11px] text-muted-foreground">
        {docPath} · v{version}
        {changelog ? ` · ${changelog}` : ''}
      </div>
      <MarkdownRenderer content={contentState.data.content ?? ''} />
    </div>
  );
}
