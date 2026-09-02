import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  UserSquare2,
  ClipboardList,
  Store,
  ClipboardCheck,
  BarChart3,
  UserCog,
  Building2,
  ShieldCheck,
  History,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { canAccessSection, ROLE_LABELS, type Section } from "../../Utils/permissions";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: Section;
  end?: boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "dashboard", end: true },
    ],
  },
  {
    title: "Recruitment",
    items: [
      { to: "/app/recruitment/jobs", label: "Jobs", icon: Briefcase, section: "recruitment" },
      { to: "/app/recruitment/candidates", label: "Candidates", icon: UserSquare2, section: "recruitment" },
      { to: "/app/recruitment/applications", label: "Applications", icon: ClipboardList, section: "recruitment" },
    ],
  },
  {
    title: "Audit",
    items: [
      { to: "/app/audit/restaurants", label: "Restaurants", icon: Store, section: "audit" },
      { to: "/app/audit/audits", label: "Audits", icon: ClipboardCheck, section: "audit" },
      { to: "/app/audit/analytics", label: "Analytics", icon: BarChart3, section: "audit" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/app/users", label: "Users", icon: UserCog, section: "users" },
      { to: "/app/departments", label: "Departments", icon: Building2, section: "departments" },
      { to: "/app/roles", label: "Roles", icon: ShieldCheck, section: "roles" },
      { to: "/app/activity-log", label: "Activity Log", icon: History, section: "activityLog" },
    ],
  },
];

const Sidebar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessSection(user.role, item.section)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar__brand">
          <Sparkles size={16} />
          INOP
        </div>
        <button
          className="admin-topbar__toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && <div className="admin-overlay" onClick={() => setMenuOpen(false)} />}

      <aside className={`admin-sidebar glass ${menuOpen ? "admin-sidebar--open" : ""}`}>
        <h2 className="admin-sidebar__brand">
          <Sparkles size={18} />
          INOP
        </h2>

        {visibleGroups.map((group) => (
          <div className="admin-sidebar__group" key={group.title}>
            <p className="admin-sidebar__group-title">{group.title}</p>
            <nav className="admin-sidebar__nav">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}>
                  <Icon size={17} className="admin-sidebar__icon" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="admin-sidebar__user">
          <div className="admin-sidebar__user-info">
            <p className="admin-sidebar__user-name">{user.name}</p>
            <p className="admin-sidebar__user-role">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            className="admin-sidebar__logout"
            onClick={() => logout()}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
