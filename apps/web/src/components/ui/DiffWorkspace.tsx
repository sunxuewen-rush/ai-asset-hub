/**
 * `DiffWorkspace` —— 版本 diff 的**薄封装**（批 design **§4.10** · M4b-5 F156）。
 *
 * **非算法**：diff 解析 / 行级渲染 / 语法高亮全部由官方件承担
 * （`react-diff-view@3.3.3` + `refractor@3.6.0`）—— 本件只负责：
 *   ① 消费服务端 `files[]`（每文件一段完整 `diff --git` 段 ⇒ `parseDiff` 逐个解析）
 *   ② 按文件**折叠懒渲染**（默认全折叠 ⇒ 未展开文件**不进 DOM**）
 *   ③ **默认左右对比（split）** + 用户切换钮
 *   ④ **按容器实宽回退** `unified`（`ResizeObserver` · 阈值 < 960 **容器** px ·
 *      ⚠️ **不新造视口断点** —— 守 §4.8；卡片在主列 `1fr` 内，视口宽 ≠ 可用宽 · design G-Q10）
 *   ⑤ **语法高亮开/关**（开 ⇒ 传 `tokens`；关 ⇒ 不传 ⇒ 0 span）
 *   ⑥ **单文件首展开测成本**：tokenize 超过 `TOKENIZE_BUDGET_MS` ⇒ 该文件**降级为关高亮**
 *      （§2.1d：无内置 Worker ⇒ 主线程保护；阈值实现期以 fixture 实测回填）
 *   ⑦ 服务端二态标注（`binary` / `truncated` ⇒ **不渲染 diff 区**，只显说明）
 *   ⑧ a11y：折叠钮 `aria-expanded` · diff 区 `<section aria-label>`（路径 + `+N/−M`）·
 *      **行号列 `aria-hidden`**（库不暴露逐格 aria 属性 ⇒ 渲染后就地标注，见 `useEffect`）
 *
 * **零新增设计 token**：语法色属**第 3 方主题域**（refractor 主题类）；行底色由库 CSS 变量承载。
 * **不渲染空态**：`files` 为空（无差异）⇒ 本件返回 `null`（空态由调用方的卡承载 —— 双处挂载零分叉）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Diff,
  type FileData,
  Hunk,
  type HunkTokens,
  parseDiff,
  tokenize,
  type ViewType,
} from 'react-diff-view';
// 库自带布局样式（含 `--diff-code-insert-background-color` 等 CSS 变量）—— 可选件，本项目显式引入
import 'react-diff-view/style/index.css';
// 语法高亮主题（**第 3 方主题域** · 字面值有意保留）：refractor 只产带类名的 token，
// 无主题 CSS ⇒ token 全部继承同色 = **高亮形同虚设**（浏览器实测色数 = 1 即此因）
import '@/styles/diff-tokens.css';
// ⚠️ 按需注册：整包 `import 'refractor'` 会拉进 277 种语言（gzip 213KB → 本批只带 21 种 ≈33KB）
import refractor from 'refractor/core.js';
import bash from 'refractor/lang/bash.js';
import css from 'refractor/lang/css.js';
import diff from 'refractor/lang/diff.js';
import docker from 'refractor/lang/docker.js';
import go from 'refractor/lang/go.js';
import ini from 'refractor/lang/ini.js';
import java from 'refractor/lang/java.js';
import javascript from 'refractor/lang/javascript.js';
import json from 'refractor/lang/json.js';
import jsx from 'refractor/lang/jsx.js';
import makefile from 'refractor/lang/makefile.js';
import markdown from 'refractor/lang/markdown.js';
import markup from 'refractor/lang/markup.js';
import python from 'refractor/lang/python.js';
import rust from 'refractor/lang/rust.js';
import shellSession from 'refractor/lang/shell-session.js';
import sql from 'refractor/lang/sql.js';
import toml from 'refractor/lang/toml.js';
import tsx from 'refractor/lang/tsx.js';
import typescript from 'refractor/lang/typescript.js';
import yaml from 'refractor/lang/yaml.js';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * 初始语言清单（**21 种** · design §2.1d）——**新增语言须手动补注册**：
 * 漏注册 ⇒ 该语言**静默无高亮**（`refractor` 不报错）⇒ 走本件的 `plainText` 兜底分支。
 */
const LANGUAGES: Array<[string, unknown]> = [
  ['markdown', markdown],
  ['typescript', typescript],
  ['tsx', tsx],
  ['javascript', javascript],
  ['jsx', jsx],
  ['json', json],
  ['yaml', yaml],
  ['toml', toml],
  ['bash', bash],
  ['shell-session', shellSession],
  ['python', python],
  ['go', go],
  ['rust', rust],
  ['java', java],
  ['sql', sql],
  ['css', css],
  ['markup', markup],
  ['diff', diff],
  ['ini', ini],
  ['docker', docker],
  ['makefile', makefile],
];
for (const [, grammar] of LANGUAGES) refractor.register(grammar);

/** 扩展名 / 文件名 → refractor 语言名（未列出的 ⇒ `plainText` 兜底） */
const EXT_LANGUAGE: Record<string, string> = {
  md: 'markdown',
  markdown: 'markdown',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  sql: 'sql',
  css: 'css',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  diff: 'diff',
  patch: 'diff',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
};
const NAME_LANGUAGE: Record<string, string> = {
  dockerfile: 'docker',
  makefile: 'makefile',
  mk: 'makefile',
};

function languageFor(path: string): string | null {
  const base = path.split('/').pop() ?? path;
  const lower = base.toLowerCase();
  if (NAME_LANGUAGE[lower] !== undefined) return NAME_LANGUAGE[lower] ?? null;
  const dot = lower.lastIndexOf('.');
  if (dot <= 0) return null;
  return EXT_LANGUAGE[lower.slice(dot + 1)] ?? null;
}

/** 单文件首展开的 tokenize 预算（超 ⇒ 该文件降级关高亮）；实现期以 fixture 实测回填（§9.8） */
const TOKENIZE_BUDGET_MS = 200;
/**
 * 容器实宽回退阈值（**组件内常数**，非全局断点 —— design G-Q10）。
 *
 * ⚠️ **实测调参（2026-09-22 · headless Edge）**：v0.9 设计的初值 960 经真浏览器实测**不可用** ——
 * 门户资产详情「版本」tab 的主列实宽仅 **755px**（1440 视口 · 两栏 `grid-cols-[1fr_320px]`）
 * ⇒ 960 会让 split **永不出现**，与用户「喜欢左右对比式的 diff 查看」偏好直接冲突。
 * 下调至 **700**：755 容器 ⇒ split（两列各 ≈320px code，可横向滚动）· 600 容器 ⇒ 自动 unified。
 */
const SPLIT_MIN_WIDTH = 700;

/** 与服务端 `CompareFile` 同形（仅取渲染所需字段 —— 双处挂载零分叉） */
export interface DiffWorkspaceFile {
  path: string;
  changeType: string;
  binary: boolean;
  truncated: boolean;
  /** 标准 unified diff 文本（单文件段）；`binary` / `truncated` / 无差异 ⇒ 缺省 */
  patch?: string;
}

export interface DiffWorkspaceProps {
  files: readonly DiffWorkspaceFile[];
  /** 外层类名（间距由调用方卡控制） */
  className?: string;
}

export function DiffWorkspace({ files, className }: DiffWorkspaceProps) {
  const { t } = useI18n();
  /**
   * 容器节点用 **callback ref**（而非 `useRef` + `useEffect([])`）：
   * 本件在 `files` 为空时**提前 return `null`**（数据未就绪 ⇒ 容器尚未挂载）
   * ⇒ 一次性 effect 会在 `ref.current === null` 时跑完，**ResizeObserver 永不 attach**
   * （已实测：容器窄化后仍不回落 `unified`）。callback ref 在节点挂载/替换时才触发 ✓
   */
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const measuredRef = useRef<Set<string>>(new Set());
  const [openPaths, setOpenPaths] = useState<ReadonlySet<string>>(() => new Set());
  const [userMode, setUserMode] = useState<ViewType | null>(null);
  const [narrow, setNarrow] = useState(false);
  /** **高亮开关**（默认开 · design §4.10 ②）—— 关 ⇒ 不传 `tokens`（0 token span） */
  const [highlightOn, setHighlightOn] = useState(true);
  /** 逐文件降级位（首展开 tokenize 超预算 ⇒ 该文件强制关高亮；与用户开关取「与」） */
  const [noHighlight, setNoHighlight] = useState<ReadonlySet<string>>(() => new Set());

  /** 容器实宽观测 ⇒ < 阈值 自动回退 unified（**不依赖视口断点**） */
  useEffect(() => {
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? container.clientWidth;
      setNarrow(width > 0 && width < SPLIT_MIN_WIDTH);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  /** 行号列 `aria-hidden`（库不暴露逐格 aria ⇒ 渲染后就地标注；cells 随展开重挂 ⇒ 每次渲染后跑） */
  useEffect(() => {
    if (!container) return;
    for (const cell of container.querySelectorAll('td.diff-gutter, th.diff-gutter')) {
      cell.setAttribute('aria-hidden', 'true');
    }
  });

  /** 逐文件解析（每文件一段完整 `diff --git` 段 ⇒ 单文件解析结果取首项） */
  const entries = useMemo(
    () =>
      files.map((file) => {
        if (file.binary || file.truncated || !file.patch) {
          return { file, data: null as FileData | null, parseFailed: false };
        }
        try {
          const data = parseDiff(file.patch, { nearbySequences: 'zip' })[0] ?? null;
          // 服务端已保证非空段 ⇒ 解析不出内容即编排层异常（显式提示，不静默空窗）
          return { file, data, parseFailed: data === null };
        } catch {
          return { file, data: null as FileData | null, parseFailed: true };
        }
      }),
    [files],
  );

  const effectiveMode: ViewType = narrow ? 'unified' : (userMode ?? 'split');

  const toggle = useCallback((path: string, hunks: FileData['hunks']) => {
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    // 首次展开：测该文件 tokenize 成本 ⇒ 超预算则该文件降级关高亮（主线程保护）
    if (!measuredRef.current.has(path)) {
      measuredRef.current.add(path);
      const language = languageFor(path);
      if (language !== null) {
        const started = performance.now();
        try {
          tokenize(hunks, { highlight: true, refractor, language });
        } catch {
          setNoHighlight((prev) => new Set(prev).add(path));
          return;
        }
        if (performance.now() - started > TOKENIZE_BUDGET_MS) {
          setNoHighlight((prev) => new Set(prev).add(path));
        }
      }
    }
  }, []);

  /** 无差异 / 全二进制 ⇒ 不渲染（空态归调用方的卡） */
  if (files.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`} ref={setContainer}>
      <div className="flex items-center justify-end gap-1">
        {(['split', 'unified'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={effectiveMode === mode}
            disabled={narrow && mode === 'split'}
            onClick={() => setUserMode(mode)}
            className={`rounded-[6px] border border-border px-2 py-[3px] font-sans text-[11px] ${
              effectiveMode === mode ? 'bg-muted text-foreground' : 'text-muted-foreground'
            }`}
          >
            {mode === 'split' ? t('review', 'diff.split') : t('review', 'diff.unified')}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={highlightOn}
          onClick={() => setHighlightOn((v) => !v)}
          className={`rounded-[6px] border border-border px-2 py-[3px] font-sans text-[11px] ${
            highlightOn ? 'bg-muted text-foreground' : 'text-muted-foreground'
          }`}
        >
          {t('review', 'diff.highlight')}
        </button>
      </div>

      {entries.map(({ file, data, parseFailed }) => {
        const path = file.path;
        const open = openPaths.has(path);
        const adds =
          data?.hunks.reduce(
            (n, h) => n + h.changes.filter((c) => c.type === 'insert').length,
            0,
          ) ?? 0;
        const dels =
          data?.hunks.reduce(
            (n, h) => n + h.changes.filter((c) => c.type === 'delete').length,
            0,
          ) ?? 0;
        const language = languageFor(path);
        const highlight =
          data !== null && language !== null && highlightOn && !noHighlight.has(path);
        const tokens: HunkTokens | null =
          open && highlight && data !== null
            ? tokenize(data.hunks, { highlight: true, refractor, language })
            : null;

        return (
          <div key={path} className="rounded-md border border-border">
            <button
              type="button"
              aria-expanded={open}
              disabled={data === null}
              onClick={() => {
                if (data !== null) toggle(path, data.hunks);
              }}
              className="flex w-full items-center gap-2 px-[10px] py-[6px] text-left"
            >
              <span aria-hidden="true" className="text-[11px] text-muted-foreground">
                {data === null ? '·' : open ? '▾' : '▸'}
              </span>
              <span className="truncate font-mono text-[13px]">{path}</span>
              {data === null ? null : (
                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  +{adds} −{dels}
                </span>
              )}
            </button>
            {data === null ? (
              <p className="border-t border-border px-[10px] py-[6px] font-sans text-[13px] text-muted-foreground">
                {file.binary
                  ? t('review', 'diff.binary')
                  : file.truncated
                    ? t('review', 'diff.truncated')
                    : parseFailed
                      ? t('review', 'diff.failed')
                      : null}
              </p>
            ) : open ? (
              // `role="region"` 由语义元素 `<section aria-label>` 承载（biome a11y 规则）
              <section
                aria-label={`${path} +${adds} −${dels}`}
                className="overflow-x-auto border-t border-border"
              >
                <Diff
                  viewType={effectiveMode}
                  diffType={data.type}
                  hunks={data.hunks}
                  tokens={tokens}
                >
                  {(hunks) => hunks.map((h) => <Hunk key={`${path}:${h.content}`} hunk={h} />)}
                </Diff>
              </section>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
