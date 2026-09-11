import { cn } from 'cn';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown 渲染封装（design §4.4：⑤ 字阶 9 档 + 语义色；skill.md/README 正文，M4b 复用）。
 *
 * 换皮（T18）：原 `MarkdownRenderer.module.css` 的 `md-body` 选择器组改由 Tailwind
 * **子元素变体**（`[&_h1]:…`）承接——单处声明、零新增 CSS 文件、旧 token 全清（§4.4 ⑦）。
 * 映射：`--ink`→`foreground` · `--text-2`→`muted-foreground` · `--line-*`→`border` ·
 * 表头底 `--tint-row`→`bg-muted/50` · 链接 `--brand`→`primary`；字阶按 9 档轴收敛
 * （19→`text-lg` · 15/14→`text-sm` · 13.5→`text-[13px]` · 12.5→`text-xs`）。
 * 内联 code 用 `:not(pre)>code` 与代码块 `pre` **元素互斥**（同元素双选择器会让生效值
 * 依赖 Tailwind 排序，禁）。
 * 两处执行期处置（design 缺口，已登记）：① 旧 `--md-pre-bg` #0f172a 深底 + `--md-quote-border`
 * 青色无 §4.4 映射 → 随新体系落**浅色语义面**（`bg-muted` + `border-border`），与 diff/预览
 * 内容面同族；② `h4-h6` 补显式样式——Tailwind Preflight 归零标题默认尺寸，旧层吃浏览器默认值，
 * 不补即回归（默认值 → 普通正文）。
 * 安全：react-markdown v10 默认 urlTransform 拦截 javascript: 等危险协议。
 */
const MD_BODY = cn(
  // 底：13.5 → text-[13px]（9 档轴）；ink → foreground
  'text-[13px] leading-[1.8] text-foreground',
  // 标题：19 → text-lg（18/19 档）· 15/14 → text-sm（14/14.5/15/15.5 档）
  '[&_h1]:mt-1 [&_h1]:mb-2.5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:tracking-[-0.4px]',
  '[&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-bold',
  '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-bold',
  // h4-h6：Preflight 后补（旧层吃浏览器默认值——不加则退化为普通正文）
  '[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-[13px] [&_h4]:font-bold',
  '[&_h5]:mt-2.5 [&_h5]:mb-1 [&_h5]:text-xs [&_h5]:font-bold',
  '[&_h6]:mt-2.5 [&_h6]:mb-1 [&_h6]:text-xs [&_h6]:font-bold',
  // 正文/列表：text-2 → muted-foreground
  '[&_p]:my-1.5 [&_p]:text-muted-foreground',
  '[&_ul]:my-1.5 [&_ul]:ml-0.5 [&_ul]:list-disc [&_ul]:pl-[18px] [&_ul]:text-muted-foreground',
  '[&_ol]:my-1.5 [&_ol]:ml-0.5 [&_ol]:list-decimal [&_ol]:pl-[18px] [&_ol]:text-muted-foreground',
  '[&_li]:my-[3px]',
  // 内联 code（:not(pre)>code 与 pre 内 code 互斥）
  '[&_:not(pre)>code]:rounded-[5px] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border',
  '[&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-px',
  '[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-xs',
  // 代码块
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:border',
  '[&_pre]:border-border [&_pre]:bg-muted [&_pre]:px-3.5 [&_pre]:py-3 [&_pre]:font-mono',
  '[&_pre]:text-xs [&_pre]:leading-[1.6]',
  // 引用：旧 cyan 边/底 → 中性语义色
  '[&_blockquote]:my-2 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-[3px]',
  '[&_blockquote]:border-border [&_blockquote]:bg-muted/50 [&_blockquote]:px-3',
  '[&_blockquote]:py-1.5 [&_blockquote]:text-muted-foreground',
  // GFM 表格（remark-gfm——§4.1）
  '[&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_table]:border-collapse',
  '[&_table]:text-xs',
  '[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-1.5',
  '[&_th]:text-left [&_th]:font-semibold',
  '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-left',
  '[&_hr]:my-3 [&_hr]:border-border',
  '[&_a]:text-primary [&_a]:hover:underline',
);

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className={MD_BODY}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
