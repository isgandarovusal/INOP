import "./workspace.css";
import "../../Styles/administration.css";
import { useTranslation } from "react-i18next";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import HRNavigation from "../../Components/HRNavigation";
import HRResourceState from "../../Components/HRResourceState";

const AppShell: React.FC = () => {
  const { t } = useTranslation();
  const hr = useLocation().pathname.startsWith("/app/recruitment/");
  return (
    <div className={hr ? "admin-layout hr-shell" : "admin-layout"}>
      <Sidebar />
      <main className="admin-main">
        {hr && <HRNavigation />}
        <Suspense
          fallback={hr ? <HRResourceState status="loading" /> :
            <div className="route-loading route-loading--content" role="status" aria-live="polite">
              <div className="route-loading__content-state">
                <div className="route-loading__line route-loading__line--wide" />
                <div className="route-loading__line route-loading__line--medium" />
                <div className="route-loading__card-grid">
                  <div />
                  <div />
                  <div />
                </div>
                <span className="route-loading__text">{t("dashboard.loading")}</span>
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
