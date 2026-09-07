import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// M4 前的最小占位——市场门户将在此生长
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('missing #root mount element');
}
createRoot(rootElement).render(
  <StrictMode>
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>AI Asset Hub</h1>
      <p>Open-source AI asset registry and marketplace.</p>
    </main>
  </StrictMode>,
);
