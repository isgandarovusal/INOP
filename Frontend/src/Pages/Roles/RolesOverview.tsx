import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../Components/PageHeader";
import Badge from "../../Components/Badge";
import PageState from "../../Components/PageState";
import { getUsers } from "../../Services/usersService";
import type { PublicUser, Role } from "../../Types/auth";
import { ROLE_LABELS } from "../../Utils/permissions";

const ROLE_CAPABILITIES: Record<Role, string[]> = {
  admin: [
    "users",
    "roles",
    "departments",
    "systemManagement",
    "allPermissions",
  ],

  hr_manager: [
    "jobs",
    "candidates",
    "applications",
    "cvs",
    "candidateFiltering",
    "recruitmentAnalytics",
  ],

  assistant_hr: [
    "jobs",
    "candidates",
    "applications",
    "cvs",
    "candidateFiltering",
  ],

  employee: [
    "ownProfile",
    "ownApplications",
    "ownTasks",
  ],

  auditor: [
    "restaurants",
    "audits",
    "scores",
    "comments",
    "attachments",
  ],

  audit_manager: [
    "restaurants",
    "audits",
    "scores",
    "comments",
    "attachments",
    "auditAnalytics",
    "reportsDataViewing",
    "findings",
    "assignments",
  ],

  manager: [
    "dashboard",
    "auditAnalytics",
    "reportsDataViewing",
  ],
};

const RolesOverview: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    getUsers()
      .then((result) => {
        if (!cancelled) {
          setUsers(result);
        }
      })
      .catch((err) => {
        console.error("Failed to load users for roles:", err);

        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const roleCounts = users.reduce<Record<Role, number>>(
    (counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    },
    {} as Record<Role, number>,
  );

  return (
    <div>
      <PageHeader
        title={t("roles.title")}
        subtitle={t("roles.subtitle")}
      />

      {loading ? (
        <PageState
          type="loading"
          title={t("dashboard.loading")}
        />
      ) : error ? (
        <PageState
          type="error"
          title={t("auth.somethingWentWrong")}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRetryCount((value) => value + 1)}
            >
              {t("common.retry")}
            </button>
          }
        />
      ) : (
        <div className="kpi-grid">
          {(Object.keys(ROLE_CAPABILITIES) as Role[]).map(
          (role, idx) => (
            <div
              className="detail-card anim-in"
              key={role}
              style={{
                animationDelay: `${idx * 0.05}s`,
                marginBottom: 0,
              }}
            >
              <h3>
                <ShieldCheck
                  size={16}
                  style={{
                    verticalAlign: "-3px",
                    marginRight: 6,
                    color: "var(--accent)",
                  }}
                />
                {ROLE_LABELS[role]}
              </h3>

              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                {roleCounts[role] || 0}{" "}
                {(roleCounts[role] || 0) === 1
                  ? t("roles.user")
                  : t("roles.users")}
              </p>

              <div className="tag-list">
                {ROLE_CAPABILITIES[role].map((cap) => (
                  <Badge tone="accent" key={cap}>
                    {t(`roles.capabilities.${cap}`)}
                  </Badge>
                ))}
              </div>
            </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default RolesOverview;
