import { Outlet } from 'react-router-dom';
import styles from './AppShell.module.css';
import { SideNav } from './SideNav.js';
import { TopBar } from './TopBar.js';

/** 应用壳（design §3 v0.3 定稿：顶栏通用 + 侧栏功能 + 内容区；底部开源出口归侧栏） */
export function AppShell() {
  return (
    <>
      <div className="bg-glow" aria-hidden="true" />
      <TopBar />
      <div className={styles.shell}>
        <SideNav />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
