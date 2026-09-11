import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/ui/AppShell.js';
import { I18nProvider } from './i18n/I18nProvider.js';
import { AssetDetail } from './pages/AssetDetail';
import { Center, type CenterType } from './pages/Center';
import { Home } from './pages/Home';
// 样式单入口（Tailwind v4 + shadcn token + AIH 层，design §4.4 v0.10 定案）：
// Tailwind Preflight / 工具类与 AIH 层（含「Tailwind 不提供的项」迁移面）均经此文件生效。
// T24 已删除旧层（原 `styles/tokens.css` + `styles/global.css`，双栈共存期结束）。
import './index.css';

// M4a 五路由（design §3，类型即路由）——占位页随板块 C/D/E 替换为真实页面
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
          {/* 布局路由（T10 AppShell：顶栏 + 侧栏 + 内容区 Outlet） */}
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            {CENTER_ROUTES.map(({ path, type }) => (
              <Route key={path} path={path} element={<Center type={type} />} />
            ))}
            {/* 扁平化坐标：全局唯一裸 slug（M4-pre R5） */}
            <Route path="/assets/:slug" element={<AssetDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
