import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const AppShell: React.FC = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
