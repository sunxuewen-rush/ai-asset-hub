/**
 * 分型 manifest 卡（批 design §4.3 —— **主 design 定稿条件 ② 的载体** · M4b-5 T8）。
 *
 * **复用**门户总览的分型**逻辑**（`mainDocPath` / `manifestFields`，均已 export 自
 * `market/detail/OverviewTab.tsx` —— 该件**零改动**）；本件只做**审核面呈现**。
 *
 * 三族呈现（字段真源 = `packages/protocol/src/<族>/manifest.ts`）：
 * - **skill**：主文档 `SKILL.md`（族协议必需 root）· 字段 = `name` / `description` + passthrough 纯量
 * - **agent**：主文档 `README*`（大小写归一探测 root 级 · 可选）· 字段 = `name` / `description` / `label` /
 *   `icon` / `color` / `category` / `keywords` + passthrough
 * - **mcp**：主文档 `README*`（可选）· 字段 = `name` / `description` + **`servers` 专属块**
 *
 * ⚠️ **安全**：`servers` 条目的 `env` / `headers` **一律不渲染**（`env` 值可能为明文 · `headers` 键多为环境引用）。
 * ⚠️ **零新增键**：`enabled` 仅在为 `true` 时渲染标记（false / 未声明 ⇒ 不渲染），避免自造「未启用」文案。
 */
import type { AssetType, VersionFileEntry } from '../../../api/types.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { mainDocPath, manifestFields } from '../../market/detail/OverviewTab.js';
import { Badge } from '../../ui/shadcn/badge.js';
import { Card } from '../../ui/shadcn/card.js';
import { TypeIcon } from '../../ui/TypeIcon.js';

/** 族内字段**优先序**（其余 passthrough 纯量字段随后追加；去重） */
const FAMILY_FIRST: Record<AssetType, readonly string[]> = {
  skill: ['name', 'description'],
  agent: ['name', 'description', 'label', 'icon', 'color', 'category', 'keywords'],
  mcp: ['name', 'description'],
};

/** mcp `servers` 条目（只读所需子集；`env`/`headers` 刻意不取） */
type ServerEntry = {
  type?: unknown;
  enabled?: unknown;
  command?: unknown;
  args?: unknown;
  url?: unknown;
};

function asServers(manifest: Record<string, unknown> | null): Array<[string, ServerEntry]> {
  if (!manifest) return [];
  const raw = manifest.servers;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, ServerEntry>);
}

/** 键值行（label 左 muted / 值右 ellipsis） */
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-[3px] text-[13px]">
      <span className="w-[104px] shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

export function ManifestCard({
  type,
  version,
  manifest,
  files,
}: {
  type: AssetType;
  version: string;
  manifest: Record<string, unknown> | null;
  files: readonly VersionFileEntry[];
}) {
  const { t } = useI18n();
  const docPath = mainDocPath(type, files);
  const scalar = manifestFields(manifest);
  const first = FAMILY_FIRST[type];
  const ordered = [
    ...first.flatMap((key) => scalar.filter(([k]) => k === key)),
    ...scalar.filter(([k]) => !first.includes(k)),
  ];
  const servers = type === 'mcp' ? asServers(manifest) : [];

  return (
    <Card className="gap-0 px-5 py-[18px]">
      <h3 className="mb-3 text-[13px] font-bold">{t('review', 'detail.manifestTitle')}</h3>

      {/* 卡头：类型（**无色**图标 —— 色由标题/徽章承担）· 主文档行 · 版本 · 来源标注 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5 text-foreground">
          <TypeIcon type={type} size={14} />
          {t('assets', `type.${type}`)}
        </span>
        <span className="font-mono">{version}</span>
        <span>
          {t('review', 'detail.mainDoc')}：<span className="font-mono">{docPath ?? '—'}</span>
        </span>
        <span>{docPath === null ? 'manifest' : null}</span>
      </div>

      {/* 字段区（按族分型；`manifestJson` 缺 ⇒ 显「—」不空窗） */}
      {manifest === null ? (
        <p className="text-[13px] text-muted-foreground">—</p>
      ) : ordered.length === 0 && servers.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-col">
          {ordered.map(([key, value]) => (
            <FieldRow key={key} label={key} value={value} />
          ))}
        </div>
      )}

      {/* mcp `servers` 专属块（`env` / `headers` 不渲染 —— 安全口径见文件头） */}
      {servers.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            {t('review', 'detail.servers')}
          </p>
          <div className="flex flex-col gap-2">
            {servers.map(([name, entry]) => {
              const transport = typeof entry.type === 'string' ? entry.type : null;
              const command = typeof entry.command === 'string' ? entry.command : null;
              const args = Array.isArray(entry.args)
                ? entry.args.filter((a): a is string => typeof a === 'string')
                : [];
              const url = typeof entry.url === 'string' ? entry.url : null;
              return (
                <div key={name} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px]">{name}</span>
                    {transport ? (
                      <Badge variant="secondary" className="font-mono">
                        {transport}
                      </Badge>
                    ) : null}
                    {entry.enabled === true ? (
                      <Badge variant="success">{t('review', 'detail.enabled')}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5 text-[12px] text-muted-foreground">
                    {command !== null ? (
                      <span className="truncate font-mono" title={[command, ...args].join(' ')}>
                        {t('review', 'detail.command')}：{command}
                        {args.length > 0 ? ` ${args.join(' ')}` : ''}
                      </span>
                    ) : null}
                    {url !== null ? (
                      <span className="truncate font-mono" title={url}>
                        {t('review', 'detail.url')}：{url}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
