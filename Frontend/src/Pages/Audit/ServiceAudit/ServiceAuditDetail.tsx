import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

const answerLabel = {
  yes: "Bəli",
  no: "Xeyr",
  na: "N/A",
} as const;

export default function ServiceAuditDetail() {
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
        title="Servis auditi tapılmadı"
        hint="Audit silinmiş və ya mövcud deyil."
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
        title="Servis Auditi"
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
          <span className="audit-detail-eyebrow">SERVİS KEYFİYYƏTİ</span>
          <h2>Audit nəticəsi</h2>
          <p>
            Restoran ID: <strong>{audit.restaurantId}</strong>
            {" · "}
            Auditor: <strong>{audit.auditorId}</strong>
          </p>
        </div>

        <div className="audit-score-ring">
          <strong>{audit.overallPercentage.toFixed(1)}%</strong>
          <span>Ümumi nəticə</span>
        </div>
      </div>

      <div className="audit-kpi-grid">
        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Bəli</span>
          <strong>{yesCount}</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <XCircle size={20} />
          </div>
          <span>Xeyr</span>
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
          <span>Orta xidmət vaxtı</span>
          <strong>
            {averageServiceTime === null
              ? "—"
              : `${averageServiceTime.toFixed(1)} san`}
          </strong>
        </div>
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Yoxlama nəticələri</h3>
              <p>{answered.length} cavablandırılmış kriteriya</p>
            </div>
          </div>

          {audit.checks.length === 0 ? (
            <div className="audit-empty-state">
              Bu auditdə hələ kriteriya nəticəsi yoxdur.
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
                    {answerLabel[item.answer]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Xidmət vaxtı</h3>
              <p>Qonaq müşahidələrinin real nəticələri</p>
            </div>
          </div>

          {audit.serviceTimeObservations.length === 0 ? (
            <div className="audit-empty-state">
              Xidmət vaxtı müşahidəsi yoxdur.
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
                    <span>Qonaq {observation.guestNumber}</span>

                    <div className="audit-service-time-track">
                      <div
                        className="audit-service-time-bar"
                        style={{ width: `${width}%` }}
                      />
                    </div>

                    <strong>
                      {observation.seconds === null
                        ? "—"
                        : `${observation.seconds} san`}
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
            <h3>Tövsiyələr</h3>
            <p>Audit nəticələrinə əsaslanan inkişaf istiqamətləri</p>
          </div>
        </div>

        {audit.recommendations.length === 0 ? (
          <div className="audit-empty-state">
            Tövsiyə əlavə edilməyib.
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
            <h3>Audit məlumatları</h3>
            <p>Auditin əsas metadata məlumatları</p>
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
