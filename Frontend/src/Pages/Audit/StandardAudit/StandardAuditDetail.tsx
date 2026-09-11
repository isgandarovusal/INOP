import "../auditModern.css";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { StandardAudit } from "../../../Types/Audit/standardAudit";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import { getStandardAuditById } from "../../../Services/standardAuditsService";
import AuditLifecyclePanel from "../AuditLifecycle/AuditLifecyclePanel";

const resultLabelKeys = {
  compliant: "audit.standard.detail.compliant",
  minor: "audit.standard.detail.resultMinor",
  major: "audit.standard.detail.resultMajor",
  critical: "audit.standard.detail.resultCritical",
} as const;

export default function StandardAuditDetail() {
  const { id } = useParams();
  const { t } = useTranslation();

  const [audit, setAudit] =
    useState<StandardAudit | undefined>();

  useEffect(() => {
    if (!id) return;

    getStandardAuditById(id)
      .then(setAudit)
      .catch(() => setAudit(undefined));
  }, [id]);
  if (!audit) {
    return (
      <EmptyState
        icon={<ShieldAlert size={28} />}
        title={t("audit.standard.detail.notFound")}
        hint={t("audit.standard.detail.deletedHint")}
      />
    );
  }

  const compliantCount = audit.results.filter(
    (item) => item.result === "compliant"
  ).length;

  const categoryRows = audit.categories.flatMap((category) =>
    category.subsections.map((subsection) => ({
      categoryName: category.name,
      ...subsection,
    }))
  );

  const maxSeverity = Math.max(
    audit.foundCritical,
    audit.foundMajor,
    audit.foundMinor,
    1
  );

  const severityData = [
    {
      key: "critical",
      label: "CRITICAL",
      value: audit.foundCritical,
      icon: <ShieldAlert size={18} />,
      className: "critical",
    },
    {
      key: "major",
      label: "MAJOR",
      value: audit.foundMajor,
      icon: <CircleAlert size={18} />,
      className: "major",
    },
    {
      key: "minor",
      label: "MINOR",
      value: audit.foundMinor,
      icon: <AlertCircle size={18} />,
      className: "minor",
    },
    {
      key: "compliant",
      label: "COMPLIANT",
      value: compliantCount,
      icon: <CheckCircle2 size={18} />,
      className: "compliant",
    },
  ];

  return (
    <div className="audit-page">
      <PageHeader
        title={t("audit.standard.detail.title")}
        subtitle={`${audit.date} · ${audit.shift}`}
        actions={
          <Link to="/app/audit/standard" className="btn btn-secondary">
            <ArrowLeft size={15} />
            Geri
          </Link>
        }
      />

      <div className="audit-detail-hero">
        <div>
          <span className="audit-detail-eyebrow">
            {t("audit.standard.detail.eyebrow")}
          </span>

          <h2>{t("audit.standard.detail.result")}</h2>

          <p>
            {t("audit.standard.detail.restaurantId")}: <strong>{audit.restaurantId}</strong>
            {" · "}
            {t("audit.standard.detail.auditor")}: <strong>{audit.auditorId}</strong>
          </p>
        </div>

        <div className="audit-score-ring">
          <strong>{audit.compliancePercentage.toFixed(1)}%</strong>
          <span>{t("audit.standard.detail.compliance")}</span>
        </div>
      </div>

      <div className="audit-kpi-grid">
        {severityData.map((item) => (
          <div
            className={`audit-kpi-card audit-severity-kpi audit-severity-kpi--${item.className}`}
            key={item.key}
          >
            <div className="audit-kpi-icon">{item.icon}</div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>{t("audit.standard.detail.incompatibilities")}</h3>
              <p>{t("audit.standard.detail.findingsDescription")}</p>
            </div>
          </div>

          <div className="audit-severity-chart">
            {severityData.map((item) => {
              const width =
                maxSeverity > 0
                  ? Math.max(4, (item.value / maxSeverity) * 100)
                  : 4;

              return (
                <div className="audit-severity-row" key={item.key}>
                  <div className="audit-severity-label">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>

                  <div className="audit-service-time-track">
                    <div
                      className={`audit-severity-bar audit-severity-bar--${item.className}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>{t("audit.standard.detail.auditStatus")}</h3>
              <p>{t("audit.standard.detail.decisionDescription")}</p>
            </div>
          </div>

          <div
            className={`audit-status-panel ${
              audit.passed
                ? "audit-status-panel--passed"
                : "audit-status-panel--failed"
            }`}
          >
            {audit.passed ? (
              <CheckCircle2 size={28} />
            ) : (
              <ShieldAlert size={28} />
            )}

            <div>
              <strong>
                {audit.passed ? t("audit.standard.detail.passed") : t("audit.standard.detail.failed")}
              </strong>

              <p>
                {audit.passed
                  ? t("audit.standard.detail.passedDescription")
                  : t("audit.standard.detail.failedDescription")}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>{t("audit.standard.detail.categories")}</h3>
            <p>{t("audit.standard.detail.categoriesDescription")}</p>
          </div>
        </div>

        {categoryRows.length === 0 ? (
          <div className="audit-empty-state">
            {t("audit.standard.detail.noChecklistResults")}
          </div>
        ) : (
          <div className="audit-standard-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{t("audit.standard.detail.category")}</th>
                  <th>{t("audit.standard.detail.section")}</th>
                  <th>{t("audit.standard.detail.total")}</th>
                  <th>{t("audit.standard.detail.critical")}</th>
                  <th>{t("audit.standard.detail.major")}</th>
                  <th>{t("audit.standard.detail.minor")}</th>
                </tr>
              </thead>

              <tbody>
                {categoryRows.map((row) => (
                  <tr key={`${row.id}-${row.categoryName}`}>
                    <td>{row.categoryName}</td>
                    <td>{row.name}</td>
                    <td>{row.total}</td>
                    <td>{row.critical}</td>
                    <td>{row.major}</td>
                    <td>{row.minor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>{t("audit.standard.detail.foundResults")}</h3>
            <p>{t("audit.standard.detail.findingCount", { count: audit.foundTotal })}</p>
          </div>
        </div>

        {audit.results.length === 0 ? (
          <div className="audit-empty-state">
            {t("audit.standard.detail.noResults")}
          </div>
        ) : (
          <div className="audit-result-list">
            {audit.results.map((item) => (
              <div className="audit-result-row" key={item.checkId}>
                <div className="audit-result-main">
                  <strong>{item.checkId}</strong>

                  {item.finding && <p>{item.finding}</p>}

                  {item.correctiveAction && (
                    <p>
                      <strong>{t("audit.standard.detail.correctiveAction")}</strong>{" "}
                      {item.correctiveAction}
                    </p>
                  )}
                </div>

                <span
                  className={`audit-answer audit-answer--${item.result}`}
                >
                  {t(resultLabelKeys[item.result])}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>{t("audit.standard.detail.auditInformation")}</h3>
            <p>{t("audit.standard.detail.metadata")}</p>
          </div>
        </div>

        <div className="audit-meta-grid">
          <div>
            <span>{t("audit.standard.detail.restaurantId")}</span>
            <strong>{audit.restaurantId}</strong>
          </div>

          <div>
            <span>{t("audit.standard.detail.auditor")}</span>
            <strong>{audit.auditorId}</strong>
          </div>

          <div>
            <span>{t("audit.standard.detail.date")}</span>
            <strong>{audit.date}</strong>
          </div>

          <div>
            <span>{t("audit.standard.detail.shift")}</span>
            <strong>{audit.shift}</strong>
          </div>

          <div>
            <span>{t("audit.standard.detail.status")}</span>
            <strong>{audit.status}</strong>
          </div>
        </div>
      </section>

      <AuditLifecyclePanel auditId={id ?? audit?.id ?? ""} />
    </div>
  );
}
