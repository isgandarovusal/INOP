import { preloadHRRoute } from '../../Routes/hrRouteModules';
import React, { useEffect, useId, useRef, useState } from "react";

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
  KeyRound,
  ChevronUp,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileId = useId();
  const profileRef = useRef<HTMLDivElement>(null);
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const profileToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!profileOpen) return;
    const items = () => Array.from(profileRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
    items()[0]?.focus();
    const outside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setProfileOpen(false);
        profileToggle.current?.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const options = items(), index = options.indexOf(document.activeElement as HTMLElement);
        options[event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [profileOpen]);
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
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); navigationToggle.current?.focus(); } };
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
          ref={navigationToggle}
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
          onClick={() => { setMenuOpen(false); navigationToggle.current?.focus(); }}
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

        <div className="admin-sidebar__scroll">
        <LanguageSwitcher />

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

        </div>
        <div className="admin-sidebar__user" ref={profileRef} onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setProfileOpen(false);
        }}>
          <button ref={profileToggle} type="button" className="admin-sidebar__profile-toggle"
            aria-expanded={profileOpen} aria-haspopup="menu" aria-controls={profileId}
            onClick={() => setProfileOpen(value => !value)}
            onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setProfileOpen(true); } }}>
            <span className="admin-sidebar__user-info">
              <span className="admin-sidebar__user-name">{user.name}</span>
              <span className="admin-sidebar__user-role">{ROLE_LABELS[user.role] || user.role}</span>
            </span>
            <ChevronUp size={16} aria-hidden="true" />
          </button>
          {profileOpen && <div id={profileId} role="menu" aria-label={t("adminUI.profile")} className="admin-sidebar__profile-menu">
            <NavLink role="menuitem" to="/app/profile" onClick={() => setProfileOpen(false)}><KeyRound size={16} aria-hidden="true" />{t("adminUI.changePassword")}</NavLink>
            <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); logout(); }}><LogOut size={16} aria-hidden="true" />{t("navigation.logout")}</button>
          </div>}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
