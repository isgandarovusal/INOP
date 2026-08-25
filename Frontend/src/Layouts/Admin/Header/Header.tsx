import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ExternalLink,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package, end: false },
  { to: "/admin/add", label: "Add Product", icon: PlusCircle, end: false },
];

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar__brand">
          <Sparkles size={16} />
          Admin Panel
        </div>
        <button
          className="admin-topbar__toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="admin-overlay" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        className={`admin-sidebar glass ${menuOpen ? "admin-sidebar--open" : ""}`}
      >
        <h2 className="admin-sidebar__brand">
          <Sparkles size={18} />
          Admin Panel
        </h2>

        <nav className="admin-sidebar__nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={17} className="admin-sidebar__icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <NavLink to="/" className="admin-sidebar__site-link">
          <ExternalLink size={16} />
          Go to Site
        </NavLink>
      </aside>
    </>
  );
};

export default Header;
