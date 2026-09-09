// 中心页占位（T7 基座；T12 参数化单组件替换——type 即路由，design §3）
const CENTER_LABEL = {
  skill: '技能中心 Skill Center',
  mcp: 'MCP 中心 MCP Server Center',
  agent: '专家中心 Agent Center',
} as const;

export type CenterType = keyof typeof CENTER_LABEL;

export function Center({ type }: { type: CenterType }) {
  return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <h2>{CENTER_LABEL[type]}</h2>
      <p>占位路由（T7）——筛选条 + 卡片网格将在 T12/T13 落地。</p>
    </div>
  );
}
