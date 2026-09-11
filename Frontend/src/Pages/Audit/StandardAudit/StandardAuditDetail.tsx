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

const resultLabels = {
  compliant: "Uyğundur",
  minor: "MINOR",
  major: "MAJOR",
  critical: "CRITICAL",
} as const;

export default function StandardAuditDetail() {
  const { id } = useParams();

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
        title="Standart audit tapılmadı"
        hint="Audit silinmiş və ya mövcud deyil."
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
        title="Standart Audit"
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
            FOOD SAFETY · OPERATIONS · HYGIENE · BRAND STANDARDS
          </span>

          <h2>Audit nəticəsi</h2>

          <p>
            Restoran ID: <strong>{audit.restaurantId}</strong>
            {" · "}
            Auditor: <strong>{audit.auditorId}</strong>
          </p>
        </div>

        <div className="audit-score-ring">
          <strong>{audit.compliancePercentage.toFixed(1)}%</strong>
          <span>Uyğunluq</span>
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
              <h3>Uyğunsuzluqların paylanması</h3>
              <p>Audit zamanı aşkar edilmiş nəticələr</p>
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
              <h3>Audit statusu</h3>
              <p>Ümumi audit qərarı</p>
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
                {audit.passed ? "AUDİT UĞURLU / PASSED" : "AUDİT UĞURSUZ / FAILED"}
              </strong>

              <p>
                {audit.passed
                  ? "Kritik və major uyğunsuzluq aşkar edilməyib."
                  : "Aşkar edilmiş kritik və ya major uyğunsuzluqlar mövcuddur."}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>Kateqoriya və bölmələr</h3>
            <p>Konfiqurasiya edilmiş audit strukturu üzrə nəticələr</p>
          </div>
        </div>

        {categoryRows.length === 0 ? (
          <div className="audit-empty-state">
            Bu audit üçün hələ checklist nəticəsi yoxdur.
          </div>
        ) : (
          <div className="audit-standard-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Kateqoriya</th>
                  <th>Bölmə</th>
                  <th>Ümumi</th>
                  <th>Critical</th>
                  <th>Major</th>
                  <th>Minor</th>
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
            <h3>Tapılan nəticələr</h3>
            <p>{audit.foundTotal} uyğunsuzluq qeydə alınıb</p>
          </div>
        </div>

        {audit.results.length === 0 ? (
          <div className="audit-empty-state">
            Bu auditdə hələ nəticə yoxdur. Real 175 checklist sualı əlavə
            edildikdən sonra nəticələr burada göstəriləcək.
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
                      <strong>Düzəldici tədbir:</strong>{" "}
                      {item.correctiveAction}
                    </p>
                  )}
                </div>

                <span
                  className={`audit-answer audit-answer--${item.result}`}
                >
                  {resultLabels[item.result]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>Audit məlumatları</h3>
            <p>Əsas metadata məlumatları</p>
          </div>
        </div>

        <div className="audit-meta-grid">
          <div>
            <span>Restoran</span>
            <strong>{audit.restaurantId}</strong>
          </div>

          <div>
            <span>Auditor</span>
            <strong>{audit.auditorId}</strong>
          </div>

          <div>
            <span>Tarix</span>
            <strong>{audit.date}</strong>
          </div>

          <div>
            <span>Növbə</span>
            <strong>{audit.shift}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{audit.status}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
