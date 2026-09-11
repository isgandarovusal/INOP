import { useEffect, useState } from "react";
import type { OccupationalSafetyAudit } from "../../../Types/Audit/occupationalSafetyAudit";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import { getOccupationalSafetyAuditById } from "../../../Services/occupationalSafetyAuditsService";

export default function SafetyAuditDetail() {
  const { id } = useParams();

  const [audit, setAudit] =
    useState<OccupationalSafetyAudit | undefined>();

  useEffect(() => {
    if (!id) return;

    getOccupationalSafetyAuditById(id)
      .then(setAudit)
      .catch(() => setAudit(undefined));
  }, [id]);
  if (!audit) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={28} />}
        title="Əməyin mühafizəsi auditi tapılmadı"
        hint="Audit silinmiş və ya mövcud deyil."
      />
    );
  }

  const answered = audit.checks.filter(
    (item) => item.score !== null
  ).length;

  const unanswered = audit.checks.length - answered;

  const averageScore =
    answered > 0
      ? audit.checks.reduce(
          (sum, item) => sum + (item.score ?? 0),
          0
        ) / answered
      : 0;

  const scoreScale = [
    { value: 0, label: "Uyğun deyil" },
    { value: 1, label: "Zəif" },
    { value: 2, label: "Zəif" },
    { value: 3, label: "Qismən uyğun" },
    { value: 4, label: "Yaxşı" },
    { value: 5, label: "Tam uyğun" },
  ];

  const scoreDistribution = scoreScale.map((item) => ({
    ...item,
    count: audit.checks.filter((check) => check.score === item.value).length,
  }));

  return (
    <div className="audit-page">
      <PageHeader
        title="Əməyin Mühafizəsi Auditi"
        subtitle={`${audit.date} · ${audit.shift}`}
        actions={
          <Link to="/app/audit/safety" className="btn btn-secondary">
            <ArrowLeft size={15} />
            Geri
          </Link>
        }
      />

      <div className="audit-detail-hero">
        <div>
          <span className="audit-detail-eyebrow">
            ƏMƏYİN MÜHAFİZƏSİ · TƏHLÜKƏSİZLİK
          </span>

          <h2>Audit nəticəsi</h2>

          <p>
            Restoran ID: <strong>{audit.restaurantId}</strong>
            {" · "}
            Auditor: <strong>{audit.auditorId}</strong>
          </p>
        </div>

        <div className="audit-score-ring audit-safety-score-ring">
          <strong>{audit.scorePercentage.toFixed(1)}%</strong>
          <span>Ümumi bal</span>
        </div>
      </div>

      <div className="audit-kpi-grid">
        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <Gauge size={20} />
          </div>
          <span>Toplam bal</span>
          <strong>
            {audit.totalScore} / {audit.maxScore}
          </strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Cavablandırılıb</span>
          <strong>{answered}</strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <AlertTriangle size={20} />
          </div>
          <span>Cavabsız</span>
          <strong>{unanswered}</strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <ClipboardCheck size={20} />
          </div>
          <span>Orta bal</span>
          <strong>{averageScore.toFixed(1)} / 5</strong>
        </div>
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Bal paylanması</h3>
              <p>Yoxlamalar üzrə verilmiş balların sayı</p>
            </div>
          </div>

          <div className="audit-safety-chart">
            {scoreDistribution.map((item) => {
              const maxCount = Math.max(
                ...scoreDistribution.map((score) => score.count),
                1
              );

              const width =
                item.count > 0
                  ? Math.max(5, (item.count / maxCount) * 100)
                  : 0;

              return (
                <div className="audit-safety-score-row" key={item.value}>
                  <div className="audit-safety-score-label">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>

                  <div className="audit-service-time-track">
                    <div
                      className="audit-safety-score-bar"
                      style={{ width: `${width}%` }}
                    />
                  </div>

                  <strong>{item.count}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Qiymətləndirmə şkalası</h3>
              <p>Əməyin mühafizəsi üzrə bal sistemi</p>
            </div>
          </div>

          <div className="audit-score-scale">
            {scoreScale.map((item) => (
              <div className="audit-score-scale-row" key={item.value}>
                <span className="audit-score-badge">
                  {item.value}
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>Yoxlama nəticələri</h3>
            <p>{audit.checks.length} yoxlama maddəsi</p>
          </div>
        </div>

        {audit.checks.length === 0 ? (
          <div className="audit-empty-state">
            Bu auditdə yoxlama nəticəsi yoxdur.
          </div>
        ) : (
          <div className="audit-safety-results">
            {audit.checks.map((item, index) => (
              <div className="audit-safety-result" key={item.checkId}>
                <div className="audit-safety-result-number">
                  {index + 1}
                </div>

                <div className="audit-safety-result-main">
                  <strong>{item.checkId}</strong>

                  {item.note ? (
                    <p>{item.note}</p>
                  ) : (
                    <p className="audit-muted">Qeyd əlavə edilməyib.</p>
                  )}
                </div>

                <div
                  className={`audit-safety-result-score ${
                    item.score === null
                      ? "audit-safety-result-score--empty"
                      : ""
                  }`}
                >
                  <span>BAL</span>
                  <strong>{item.score ?? "—"}</strong>
                </div>
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
