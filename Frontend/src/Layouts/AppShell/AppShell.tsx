import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const AppShell: React.FC = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <Suspense
          fallback={
            <div className="route-loading route-loading--content" role="status" aria-live="polite">
              <div className="route-loading__content-state">
                <div className="route-loading__line route-loading__line--wide" />
                <div className="route-loading__line route-loading__line--medium" />
                <div className="route-loading__card-grid">
                  <div />
                  <div />
                  <div />
                </div>
                <span className="route-loading__text">Yüklənir...</span>
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default AppShell;
