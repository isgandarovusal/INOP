import type React from "react";
import Header from "../../Layouts/Site/Header/Header";
import { Outlet } from "react-router-dom";
import Footer from "../../Layouts/Site/Footer/Footer";

const SiteRoot: React.FC = () => {
    return (
        <div className="site-layout">
          <Header />
          <main className="site-main">
            <Outlet />
          </main>
          <Footer />
        </div>
    )
}
export default SiteRoot;