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
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import {
  canAccessSection,
  ROLE_LABELS,
  type Section,
} from "../../Utils/permissions";
import i18n, { changeLanguage } from "../../i18n";

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px 14px",
          }}
        >
          <Languages size={16} />
          <label
            htmlFor="inop-language"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              flex: 1,
            }}
          >
            {t("language.label")}
          </label>

          <select
            id="inop-language"
            value={currentLanguage}
            onChange={(event) =>
              changeLanguage(
                event.target.value as "az" | "en" | "ru"
              )
            }
            aria-label={t("language.label")}
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "6px",
              padding: "4px 6px",
              background: "transparent",
              color: "inherit",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value="az">{t("language.az")}</option>
            <option value="en">{t("language.en")}</option>
            <option value="ru">{t("language.ru")}</option>
          </select>
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
