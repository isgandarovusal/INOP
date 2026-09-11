import "../auditModern.css";
import { useTranslation } from "react-i18next";
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
import AuditLifecyclePanel from "../AuditLifecycle/AuditLifecyclePanel";

export default function SafetyAuditDetail() {
  const { id } = useParams();
  const { t } = useTranslation();

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
        title={t("audit.safety.detail.notFound")}
        hint={t("audit.safety.detail.deletedHint")}
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
    { value: 0, label: t("audit.safety.detail.notCompliant") },
    { value: 1, label: t("audit.safety.detail.weak") },
    { value: 2, label: t("audit.safety.detail.weak") },
    { value: 3, label: t("audit.safety.detail.partiallyCompliant") },
    { value: 4, label: t("audit.safety.detail.good") },
    { value: 5, label: t("audit.safety.detail.fullyCompliant") },
  ];

  const scoreDistribution = scoreScale.map((item) => ({
    ...item,
    count: audit.checks.filter((check) => check.score === item.value).length,
  }));

  return (
    <div className="audit-page">
      <PageHeader
        title={t("audit.safety.detail.title")}
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
            {t("audit.safety.detail.eyebrow")}
          </span>

          <h2>{t("audit.safety.detail.result")}</h2>

          <p>
            {t("audit.safety.detail.restaurantId")}: <strong>{audit.restaurantId}</strong>
            {" · "}
            {t("audit.safety.detail.auditor")}: <strong>{audit.auditorId}</strong>
          </p>
        </div>

        <div className="audit-score-ring audit-safety-score-ring">
          <strong>{audit.scorePercentage.toFixed(1)}%</strong>
          <span>{t("audit.safety.detail.totalScore")}</span>
        </div>
      </div>

      <div className="audit-kpi-grid">
        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <Gauge size={20} />
          </div>
          <span>{t("audit.safety.detail.total")}</span>
          <strong>
            {audit.totalScore} / {audit.maxScore}
          </strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>{t("audit.safety.detail.answered")}</span>
          <strong>{answered}</strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <AlertTriangle size={20} />
          </div>
          <span>{t("audit.safety.detail.unanswered")}</span>
          <strong>{unanswered}</strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <ClipboardCheck size={20} />
          </div>
          <span>{t("audit.safety.detail.averageScore")}</span>
          <strong>{averageScore.toFixed(1)} / 5</strong>
        </div>
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>{t("audit.safety.detail.scoreDistribution")}</h3>
              <p>{t("audit.safety.detail.scoreDistributionDescription")}</p>
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
              <h3>{t("audit.safety.detail.evaluationScale")}</h3>
              <p>{t("audit.safety.detail.evaluationScaleDescription")}</p>
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
            <h3>{t("audit.safety.detail.results")}</h3>
            <p>{t("audit.safety.detail.checkCount", { count: audit.checks.length })}</p>
          </div>
        </div>

        {audit.checks.length === 0 ? (
          <div className="audit-empty-state">
            {t("audit.safety.detail.noResults")}
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
                    <p className="audit-muted">{t("audit.safety.detail.notAdded")}</p>
                  )}
                </div>

                <div
                  className={`audit-safety-result-score ${
                    item.score === null
                      ? "audit-safety-result-score--empty"
                      : ""
                  }`}
                >
                  <span>{t("audit.safety.detail.score")}</span>
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
            <h3>{t("audit.safety.detail.auditInformation")}</h3>
            <p>{t("audit.safety.detail.metadata")}</p>
          </div>
        </div>

        <div className="audit-meta-grid">
          <div>
            <span>{t("audit.safety.detail.restaurant")}</span>
            <strong>{audit.restaurantId}</strong>
          </div>

          <div>
            <span>{t("audit.safety.detail.auditorLabel")}</span>
            <strong>{audit.auditorId}</strong>
          </div>

          <div>
            <span>{t("audit.safety.detail.date")}</span>
            <strong>{audit.date}</strong>
          </div>

          <div>
            <span>{t("audit.safety.detail.shift")}</span>
            <strong>{audit.shift}</strong>
          </div>

          <div>
            <span>{t("audit.safety.detail.status")}</span>
            <strong>{audit.status}</strong>
          </div>
        </div>
      </section>

      <AuditLifecyclePanel auditId={id ?? audit?.id ?? ""} />
    </div>
  );
}
