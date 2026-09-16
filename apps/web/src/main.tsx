import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, bootstrapAuth } from '@/auth/AuthProvider';
import { ROLE } from '@/auth/roles';
import { ComingSoon } from '@/components/console/ComingSoon';
import { AppShell } from '@/components/ui/AppShell';
import { RoleGuard } from '@/components/ui/RoleGuard';
import { Toaster } from '@/components/ui/Toaster';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { AssetDetail } from '@/pages/AssetDetail';
import { Center, type CenterType } from '@/pages/Center';
import { Dashboard } from '@/pages/Dashboard';
import { Device } from '@/pages/Device';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Submissions } from '@/pages/Submissions';
// 样式单入口（Tailwind v4 + shadcn token + AIH 层，design §4.4 v0.10 定案）：
// Tailwind Preflight / 工具类与 AIH 层（含「Tailwind 不提供的项」迁移面）均经此文件生效。
// T24 已删除旧层（原 `styles/tokens.css` + `styles/global.css`，双栈共存期结束）。
import './index.css';

// 首帧预热（批 design §4.1 · 主 design U3）：模块级调用、**不 `await`**——`/me` 与首屏渲染并行，
// 结果由 `<AuthProvider>` 挂载时复用（不重复请求）。
bootstrapAuth();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('missing #root mount element');
}

// 门户中心三路由（M4a，公开读面）
const CENTER_ROUTES: Array<{ path: string; type: CenterType }> = [
  { path: '/skills', type: 'skill' },
  { path: '/mcps', type: 'mcp' },
  { path: '/agents', type: 'agent' },
];

/**
 * DEV-only 批次号表（批 design §5.4：`import.meta.env.DEV` 门控的小字标注，**不进 i18n 字典**）。
 *
 * 门控写法是**生产产物纪律**的一部分：Vite 构建时把 `import.meta.env.DEV` 静态替换为 `false`
 * ⇒ `false ? {…'M4b-3'…} : {}` 被常量折叠成 `{}` ⇒ **`M4b-` 字面量不进 bundle**
 * （断言：`grep -c 'M4b-' dist/assets/*.js` = 0）。**不要**改成把批号塞进模块级数组/对象的字面量字段，
 * 那会绕过折叠（属性值不可消除）。
 *
 * 独立版式两页（`/login` **T6** · `/device` **T7**）与 `/dashboard`（**T8**）均已换真页
 * ⇒ 表内**不再有**这三条；M4b-3 的 `/dashboard/submissions`（**T6**）同样已换真页 ⇒ 随之下表。
 * 余下条目对应的仍是占位页。
 */
const DEV_BATCH: Record<string, string> = import.meta.env.DEV
  ? {
      '/dashboard/assets': 'M4b-4',
      '/dashboard/tokens': 'M4b-3',
      '/reviews/:id': 'M4b-5',
      '/admin/reviews': 'M4b-5',
      '/admin/labels': 'M4b-6',
      '/admin/audit': 'M4b-6',
    }
  : {};

/**
 * 路由骨架（批 design §3.3：新增 11 条 + 门户 5 条）。
 *
 * - **独立版式两页均为真页**：`/login`（`pages/Login.tsx`，T6）· `/device`（`pages/Device.tsx`，T7）
 *   —— 二者共用跨页件 `components/console/AuthLayout.tsx`
 * - **`/dashboard` 已是真页**（`pages/Dashboard.tsx`，T8；M4b-4 换三卡前的过渡形态）
 * - **门户 5 条无守卫**（公开读面，M4a 零回归）
 * - **守卫包裹（Q15）**：`/dashboard` + `/dashboard/*` 与非 `/admin` 的 `/reviews/:id` = `ROLE.USER`（布局路由一条包 4 条）；
 *   `/admin` + `/admin/*` = `ROLE.ADMIN`；**`/admin` 的 `<Navigate>` 放在守卫内**（未达档先被弹回 `/dashboard`，不白跳一层）
 * - **`/device` 不入 `RoleGuard`**：未登录由页内三态门处理（跳登录并**保码**回跳，T7 实测修正）
 * - **不加 `*` 兜底**（与 M4a 现态一致：未知路径落空白，本批不引入新行为）
 * - 文案经 `useI18n()` 在组件内解析（响应语言切换）；`ComingSoon` 均**零业务请求**
 */
function AppRoutes() {
  const { t } = useI18n();
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── 独立版式（不入 AppShell）── 两页均已换真页 */}
          <Route path="/login" element={<Login />} />
          <Route path="/device" element={<Device />} />

          {/* ── 应用壳（顶栏 + 侧栏 + 内容区 Outlet）── */}
          <Route element={<AppShell />}>
            {/* 门户 5 条（公开读面，**无守卫**） */}
            <Route path="/" element={<Home />} />
            {CENTER_ROUTES.map(({ path, type }) => (
              <Route key={path} path={path} element={<Center type={type} />} />
            ))}
            {/* 扁平化坐标：全局唯一裸 slug（M4-pre R5） */}
            <Route path="/assets/:slug" element={<AssetDetail />} />

            {/* ── 个人段（USER = 1）── */}
            <Route element={<RoleGuard minRole={ROLE.USER} />}>
              {/* 工作台：真页（T8；M4b-4 换三卡） */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route
                path="/dashboard/assets"
                element={
                  <ComingSoon
                    title={t('dashboard', 'myAssets')}
                    description={t('common', 'comingSoon')}
                    batch={DEV_BATCH['/dashboard/assets']}
                  />
                }
              />
              {/* 我的提交：真页（M4b-3 T6） */}
              <Route path="/dashboard/submissions" element={<Submissions />} />
              <Route
                path="/dashboard/tokens"
                element={
                  <ComingSoon
                    title={t('dashboard', 'tokens')}
                    description={t('common', 'comingSoon')}
                    batch={DEV_BATCH['/dashboard/tokens']}
                  />
                }
              />
              {/* 审核详情：提交人可达（撤回入口）；**不进 `/admin` 段** */}
              <Route
                path="/reviews/:id"
                element={
                  <ComingSoon
                    title={t('review', 'title')}
                    description={t('common', 'comingSoon')}
                    batch={DEV_BATCH['/reviews/:id']}
                  />
                }
              />
            </Route>

            {/* ── 管理段（ADMIN = 10）── */}
            <Route element={<RoleGuard minRole={ROLE.ADMIN} />}>
              <Route path="/admin" element={<Navigate to="/admin/reviews" replace />} />
              <Route
                path="/admin/reviews"
                element={
                  <ComingSoon
                    title={t('admin', 'reviews')}
                    description={t('common', 'comingSoon')}
                    batch={DEV_BATCH['/admin/reviews']}
                  />
                }
              />
              <Route
                path="/admin/labels"
                element={
                  <ComingSoon
                    title={t('admin', 'labels')}
                    description={t('common', 'comingSoon')}
                    batch={DEV_BATCH['/admin/labels']}
                  />
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ComingSoon
                    title={t('admin', 'audit')}
                    description={t('common', 'comingSoon')}
                    batch={DEV_BATCH['/admin/audit']}
                  />
                }
              />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <AppRoutes />
      {/* 轻提示单例（design §5.2：全局挂 App 根，路由之外 ⇒ 跨页存活） */}
      <Toaster />
    </I18nProvider>
  </StrictMode>,
);
