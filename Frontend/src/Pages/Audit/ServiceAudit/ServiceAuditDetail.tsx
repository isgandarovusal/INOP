import "../auditModern.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  MinusCircle,
  XCircle,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import { getServiceAuditById } from "../../../Services/serviceAuditsService";
import type { ServiceAudit } from "../../../Types/Audit";
import AuditLifecyclePanel from "../AuditLifecycle/AuditLifecyclePanel";

const answerKeys = {
  yes: "audit.service.detail.yes",
  no: "audit.service.detail.no",
  na: "audit.service.detail.notApplicable",
} as const;

export default function ServiceAuditDetail() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [audit, setAudit] = useState<ServiceAudit | undefined>();

  useEffect(() => {
    const load = async () => {
if (!id) return;

    const data = await getServiceAuditById(id);
      setAudit(data);
    };

    load();
  }, [id]);

  if (!audit) {
    return (
      <EmptyState
        icon={<MessageSquareText size={28} />}
        title={t("audit.service.detail.notFound")}
        hint={t("audit.service.detail.notFoundHint")}
      />
    );
  }

  const answered = audit.checks.filter((item) => item.answer !== "na");
  const yesCount = audit.checks.filter((item) => item.answer === "yes").length;
  const noCount = audit.checks.filter((item) => item.answer === "no").length;
  const naCount = audit.checks.filter((item) => item.answer === "na").length;

  const averageServiceTime = (() => {
    const values = audit.serviceTimeObservations
      .map((item) => item.seconds)
      .filter((value): value is number => value !== null && value >= 0);

    if (!values.length) return null;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  })();

  const maxServiceTime = Math.max(
    0,
    ...audit.serviceTimeObservations.map((item) => item.seconds ?? 0)
  );

  return (
    <div className="audit-page">
      <PageHeader
        title={t("audit.service.detail.title")}
        subtitle={`${audit.date} · ${audit.shift}`}
        actions={
          <Link to="/app/audit/service" className="btn btn-secondary">
            <ArrowLeft size={15} />
            Geri
          </Link>
        }
      />

      <div className="audit-detail-hero">
        <div>
          <span className="audit-detail-eyebrow">{t("audit.service.detail.eyebrow")}</span>
          <h2>{t("audit.service.detail.result")}</h2>
          <p>
            {t("audit.service.detail.restaurantId")}: <strong>{audit.restaurantId}</strong>
            {" · "}
            {t("audit.service.detail.auditor")}: <strong>{audit.auditorId}</strong>
          </p>
        </div>

        <div className="audit-score-ring">
          <strong>{audit.overallPercentage.toFixed(1)}%</strong>
          <span>{t("audit.service.detail.overallResult")}</span>
        </div>
      </div>

      <div className="audit-kpi-grid">
        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>{t("audit.service.detail.yes")}</span>
          <strong>{yesCount}</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <XCircle size={20} />
          </div>
          <span>{t("audit.service.detail.no")}</span>
          <strong>{noCount}</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <MinusCircle size={20} />
          </div>
          <span>N/A</span>
          <strong>{naCount}</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <Clock3 size={20} />
          </div>
          <span>{t("audit.service.detail.averageServiceTime")}</span>
          <strong>
            {averageServiceTime === null
              ? "—"
              : `${averageServiceTime.toFixed(1)} ${t("audit.service.detail.secondsShort")}`}
          </strong>
        </div>
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>{t("audit.service.detail.checkResults")}</h3>
              <p>{t("audit.service.detail.answeredCriteria", { count: answered.length })}</p>
            </div>
          </div>

          {audit.checks.length === 0 ? (
            <div className="audit-empty-state">
              {t("audit.service.detail.noCriteria")}
            </div>
          ) : (
            <div className="audit-result-list">
              {audit.checks.map((item) => (
                <div className="audit-result-row" key={item.checkId}>
                  <div className="audit-result-main">
                    <strong>{item.checkId}</strong>
                    {item.comment && <p>{item.comment}</p>}
                  </div>

                  <span
                    className={`audit-answer audit-answer--${item.answer}`}
                  >
                    {t(answerKeys[item.answer])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>{t("audit.service.detail.serviceTime")}</h3>
              <p>{t("audit.service.detail.guestObservations")}</p>
            </div>
          </div>

          {audit.serviceTimeObservations.length === 0 ? (
            <div className="audit-empty-state">
              {t("audit.service.detail.noServiceTime")}
            </div>
          ) : (
            <div className="audit-service-time-chart">
              {audit.serviceTimeObservations.map((observation) => {
                const seconds = observation.seconds ?? 0;
                const width =
                  maxServiceTime > 0
                    ? Math.max(4, (seconds / maxServiceTime) * 100)
                    : 4;

                return (
                  <div
                    className="audit-service-time-row"
                    key={observation.guestNumber}
                  >
                    <span>{t("audit.service.detail.guest", { number: observation.guestNumber })}</span>

                    <div className="audit-service-time-track">
                      <div
                        className="audit-service-time-bar"
                        style={{ width: `${width}%` }}
                      />
                    </div>

                    <strong>
                      {observation.seconds === null
                        ? "—"
                        : `${observation.seconds} ${t("audit.service.detail.secondsShort")}`}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>{t("audit.service.detail.recommendations")}</h3>
            <p>{t("audit.service.detail.recommendationsHint")}</p>
          </div>
        </div>

        {audit.recommendations.length === 0 ? (
          <div className="audit-empty-state">
            {t("audit.service.detail.noRecommendations")}
          </div>
        ) : (
          <ol className="audit-recommendation-list">
            {audit.recommendations.map((recommendation, index) => (
              <li key={`${recommendation}-${index}`}>{recommendation}</li>
            ))}
          </ol>
        )}
      </section>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>{t("audit.service.detail.auditInformation")}</h3>
            <p>{t("audit.service.detail.metadataHint")}</p>
          </div>
        </div>

        <div className="audit-meta-grid">
          <div>
            <span>{t("audit.service.detail.restaurant")}</span>
            <strong>{audit.restaurantId}</strong>
          </div>
          <div>
            <span>{t("audit.service.detail.auditor")}</span>
            <strong>{audit.auditorId}</strong>
          </div>
          <div>
            <span>{t("audit.service.detail.date")}</span>
            <strong>{audit.date}</strong>
          </div>
          <div>
            <span>{t("audit.service.detail.shift")}</span>
            <strong>{audit.shift}</strong>
          </div>
          <div>
            <span>{t("audit.service.detail.status")}</span>
            <strong>{audit.status}</strong>
          </div>
        </div>
      </section>

      <AuditLifecyclePanel auditId={id ?? audit?.id ?? ""} />
    </div>
  );
}
