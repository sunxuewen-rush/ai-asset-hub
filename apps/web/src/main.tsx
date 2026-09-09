import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider.js';
import { AssetDetail } from './pages/AssetDetail';
import { Center, type CenterType } from './pages/Center';
import { Home } from './pages/Home';
import './styles/tokens.css';
import './styles/global.css';

// M4a 五路由（design §3，类型即路由）——占位；AppShell 于 T10 包壳
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('missing #root mount element');
}

const CENTER_ROUTES: Array<{ path: string; type: CenterType }> = [
  { path: '/skills', type: 'skill' },
  { path: '/mcps', type: 'mcp' },
  { path: '/agents', type: 'agent' },
];

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {CENTER_ROUTES.map(({ path, type }) => (
            <Route key={path} path={path} element={<Center type={type} />} />
          ))}
          <Route path="/assets/:nsSlug/:slug" element={<AssetDetail />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
