import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownRenderer.module.css';

/**
 * Markdown 渲染封装（design §4.1：react-markdown + remark-gfm——skill.md/README 正文；
 * M4b 复用）。样式 §4.4 md-body tokens（h1/h2/code/pre/blockquote/GFM table）。
 * 安全：react-markdown v10 默认 urlTransform 拦截 javascript: 等危险协议。
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className={styles.body}>
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
