import React, { useEffect, useState } from "react";
import azFlag from "../../assets/flags/az.svg";
import gbFlag from "../../assets/flags/gb.svg";
import ruFlag from "../../assets/flags/ru.svg";

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
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import {
  canAccessSection,
  ROLE_LABELS,
  type Section,
} from "../../Utils/permissions";
import i18n, { changeLanguage } from "../../i18n";
import "../../Styles/admin.css";

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: Section;
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
        to: "/app/recruitment/jobs",
        labelKey: "navigation.jobs",
        icon: Briefcase,
        section: "recruitment",
      },
      {
        to: "/app/recruitment/candidates",
        labelKey: "navigation.candidates",
        icon: UserSquare2,
        section: "recruitment",
      },
      {
        to: "/app/recruitment/applications",
        labelKey: "navigation.applications",
        icon: ClipboardList,
        section: "recruitment",
      },
    ],
  },
  {
    titleKey: "navigation.groups.audit",
    items: [
      {
        to: "/app/audit/restaurants",
        labelKey: "navigation.restaurants",
        icon: Store,
        section: "audit",
      },
      {
        to: "/app/audit/audits",
        labelKey: "navigation.audits",
        icon: ClipboardCheck,
        section: "audit",
      },
      {
        to: "/app/audit/analytics",
        labelKey: "navigation.analytics",
        icon: BarChart3,
        section: "audit",
      },
      {
        to: "/app/audit/checklists",
        labelKey: "navigation.checklists",
        icon: ClipboardList,
        section: "audit",
      },
      {
        to: "/app/audit/service",
        labelKey: "navigation.serviceAudit",
        icon: ClipboardCheck,
        section: "audit",
      },
      {
        to: "/app/audit/service/analytics",
        labelKey: "navigation.serviceAnalytics",
        icon: BarChart3,
        section: "audit",
      },
      {
        to: "/app/audit/standard",
        labelKey: "navigation.standardAudit",
        icon: ClipboardCheck,
        section: "audit",
      },
      {
        to: "/app/audit/standard/analytics",
        labelKey: "navigation.standardAnalytics",
        icon: BarChart3,
        section: "audit",
      },
      {
        to: "/app/audit/safety",
        labelKey: "navigation.occupationalSafety",
        icon: ClipboardCheck,
        section: "audit",
      },
      {
        to: "/app/audit/safety/analytics",
        labelKey: "navigation.occupationalSafetyAnalytics",
        icon: BarChart3,
        section: "audit",
      },
    ],
  },
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
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canAccessSection(user.role, item.section)
    ),
  })).filter((group) => group.items.length > 0);

  const currentLanguage = i18n.language.split("-")[0];

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar__brand">
          <Sparkles size={16} />
          INOP
        </div>

        <button
          className="admin-topbar__toggle"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={t("navigation.toggleMenu")}
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
        className={`admin-sidebar glass ${
          menuOpen ? "admin-sidebar--open" : ""
        }`}
      >
        <h2 className="admin-sidebar__brand">
          <Sparkles size={18} />
          INOP
        </h2>

          <div className="admin-language-panel">
            <button
              type="button"
              className={`admin-language-option ${
                currentLanguage === "az"
                  ? "admin-language-option--active"
                  : ""
              }`}
              onClick={() => changeLanguage("az")}
              aria-pressed={currentLanguage === "az"}
            >
              <img
                src={azFlag}
                alt=""
                className="admin-language-flag"
              />
              <span
                style={{
                  color: "#ffffff",
                  opacity: 1,
                  visibility: "visible",
                  fontWeight: 800,
                }}
              >
                AZE
              </span>
            </button>

            <button
              type="button"
              className={`admin-language-option ${
                currentLanguage === "en"
                  ? "admin-language-option--active"
                  : ""
              }`}
              onClick={() => changeLanguage("en")}
              aria-pressed={currentLanguage === "en"}
            >
              <img
                src={gbFlag}
                alt=""
                className="admin-language-flag"
              />
              <span
                style={{
                  color: "#ffffff",
                  opacity: 1,
                  visibility: "visible",
                  fontWeight: 800,
                }}
              >
                ENG
              </span>
            </button>

            <button
              type="button"
              className={`admin-language-option ${
                currentLanguage === "ru"
                  ? "admin-language-option--active"
                  : ""
              }`}
              onClick={() => changeLanguage("ru")}
              aria-pressed={currentLanguage === "ru"}
            >
              <img
                src={ruFlag}
                alt=""
                className="admin-language-flag"
              />
              <span
                style={{
                  color: "#ffffff",
                  opacity: 1,
                  visibility: "visible",
                  fontWeight: 800,
                }}
              >
                RUS
              </span>
            </button>
          </div>

        {visibleGroups.map((group) => (
          <div className="admin-sidebar__group" key={group.titleKey}>
            <p className="admin-sidebar__group-title">
              {t(group.titleKey)}
            </p>

            <nav className="admin-sidebar__nav">
              {group.items.map(({ to, labelKey, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}>
                  <Icon size={17} className="admin-sidebar__icon" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="admin-sidebar__user">
          <div className="admin-sidebar__user-info">
            <p className="admin-sidebar__user-name">{user.name}</p>
            <p className="admin-sidebar__user-role">
              {ROLE_LABELS[user.role]}
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
