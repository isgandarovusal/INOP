import { preloadHRRoute } from '../../Routes/hrRouteModules';
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import {
  canAccessSection,
  canAccessAuditDirection,
  hasPermission,
  ROLE_LABELS,
  type Section,
} from "../../Utils/permissions";
import INOPLogo from "../../Components/INOPLogo";
import LanguageSwitcher from "../../Components/LanguageSwitcher";
import "../../Styles/admin.css";

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: Section;
  resource?: string;
  end?: boolean;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "navigation.groups.overview",
    items: [
      {
        to: "/app/dashboard",
        labelKey: "navigation.dashboard",
        icon: LayoutDashboard,
        section: "dashboard",
        end: true,
      },
    ],
  },
  {
    titleKey: "navigation.groups.recruitment",
    items: [
      {
        to: "/app/recruitment/analytics", resource: "application", labelKey: "hrAnalytics.title", icon: BarChart3, section: "recruitment",
      },
      {
        to: "/app/recruitment/jobs",
        resource: "recruitment",
        labelKey: "navigation.jobs",
        icon: Briefcase,
        section: "recruitment",
      },
      {
        to: "/app/recruitment/candidates",
        resource: "candidate",
        labelKey: "navigation.candidates",
        icon: UserSquare2,
        section: "recruitment",
      },
      {
        to: "/app/recruitment/applications",
        resource: "application",
        labelKey: "navigation.applications",
        icon: ClipboardList,
        section: "recruitment",
      },
    ],
  },
  {titleKey:'auditFoundation.management',items:[
    {to:'/app/audit',labelKey:'auditFoundation.center',icon:LayoutDashboard,section:'audit',end:true},
    {to:'/app/audit/restaurants',labelKey:'navigation.restaurants',icon:Store,section:'audit',resource:'restaurant'},
    {to:'/app/audit/analytics',labelKey:'auditFoundation.analytics',icon:BarChart3,section:'audit',resource:'audit.analytics'},
  ]},
  ...[{key:'hr',path:'hr'},{key:'service',path:'service'},{key:'standard',path:'standard'},{key:'occupational-safety',path:'safety'}].map(({key,path})=>({
    titleKey:`auditFoundation.directions.${key}`,
    items:[{to:`/app/audit/${path}`,labelKey:`auditFoundation.directions.${key}`,icon:ClipboardCheck,section:'audit' as const,end:true},{to:`/app/audit/${path}/analytics`,labelKey:`auditFoundation.analyticsDirections.${key}`,icon:BarChart3,section:'audit' as const,resource:'audit.analytics'}],
  })),
  {
    titleKey: "navigation.groups.administration",
    items: [
      {
        to: "/app/users",
        labelKey: "navigation.users",
        icon: UserCog,
        section: "users",
      },
      {
        to: "/app/departments",
        labelKey: "navigation.departments",
        icon: Building2,
        section: "departments",
      },
      {
        to: "/app/roles",
        labelKey: "navigation.roles",
        icon: ShieldCheck,
        section: "roles",
      },
      {
        to: "/app/activity-log",
        labelKey: "navigation.activityLog",
        icon: History,
        section: "activityLog",
      },
    ],
  },
];

const Sidebar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [menuOpen]);

  useEffect(() => {
    // Intentional: close the mobile menu whenever the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.section === 'audit') {
        if (user.role === 'auditor' && !user.auditDirection) return false;
        const direction = item.to.includes('/audit/hr') ? 'hr' : item.to.includes('/service') ? 'service' : item.to.includes('/standard') ? 'standard' : item.to.includes('/safety') ? 'occupational-safety' : null;
        const resource = item.to.includes('analytics') ? 'audit.analytics' : item.to.includes('/restaurants') ? 'restaurant' : item.to.includes('/checklists') ? 'audit.template' : 'audit';
        return direction ? canAccessAuditDirection(user, direction, resource) : hasPermission(user, resource, 'read');
      }
      return item.resource ? hasPermission(user, item.resource, "read") : canAccessSection(user, item.section);
    }),
  })).filter((group) => group.items.length > 0);


  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar__brand">
          <INOPLogo compact />
        </div>

        <button
          className="admin-topbar__toggle"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={t("navigation.toggleMenu")}
          aria-expanded={menuOpen}
          aria-controls="inop-navigation"
          title={t("navigation.toggleMenu")}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="admin-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="inop-navigation"
        inert={mobile && !menuOpen}
        className={`admin-sidebar ${
          menuOpen ? "admin-sidebar--open" : ""
        }`}
      >
        <h2 className="admin-sidebar__brand">
          <INOPLogo compact />
        </h2>

        <LanguageSwitcher />
        <NavLink to="/app/profile" className="admin-sidebar__account-link">{t("adminUI.profile")} · {t("adminUI.changePassword")}</NavLink>

        {visibleGroups.map((group) => (
          <div className="admin-sidebar__group" key={group.titleKey}>
            <p className="admin-sidebar__group-title">
              {t(group.titleKey)}
            </p>

            <nav className="admin-sidebar__nav">
              {group.items.map(({ to, labelKey, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({isActive}) => isActive || (end && location.pathname === `${to}/new`) ? "active" : undefined} onPointerEnter={event => { if (event.pointerType !== "touch") preloadHRRoute(to, user); }} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) preloadHRRoute(to, user); }}>
                  <Icon size={17} className="admin-sidebar__icon" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="admin-sidebar__user">
          <div className="admin-sidebar__user-info">
            <NavLink to="/app/profile" className="admin-sidebar__user-name" title={t("adminUI.profile")}>{user.name}</NavLink>
            <NavLink to="/app/profile" className="admin-sidebar__account-link">{t("adminUI.changePassword")}</NavLink>
            <p className="admin-sidebar__user-role">
              {ROLE_LABELS[user.role] || user.role}
            </p>
          </div>

          <button
            className="admin-sidebar__logout"
            onClick={() => logout()}
            title={t("navigation.logout")}
            aria-label={t("navigation.logout")}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
