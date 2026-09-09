import { useParams } from 'react-router-dom';

// 资产详情占位（T7 基座；T14 起以 design §5.3 两波编排替换为完整详情页）
export function AssetDetail() {
  const { nsSlug, slug } = useParams();
  return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <h2>资产详情 · Asset Detail</h2>
      <p>
        占位路由（T7）：@{nsSlug}/{slug}——三 Tab 内容体验将在 T14-T17 落地。
      </p>
    </div>
  );
}
