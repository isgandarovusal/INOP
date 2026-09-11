import "../auditAnalytics.css";
import { useEffect, useMemo, useState } from "react";
import type { ServiceAudit } from "../../../Types/Audit";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import { getServiceAudits } from "../../../Services/serviceAuditsService";

export default function ServiceAuditAnalytics() {
  const [audits, setAudits] = useState<ServiceAudit[]>([]);

  useEffect(() => {
    const load = async () => {
try {
        const data = await getServiceAudits();
        setAudits(data);
      } catch {
        setAudits([]);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const total = audits.length;
    const average =
      total > 0
        ? audits.reduce((sum, audit) => sum + audit.overallPercentage, 0) /
          total
        : 0;

    const yes = audits.reduce(
      (sum, audit) =>
        sum + audit.checks.filter((item) => item.answer === "yes").length,
      0
    );

    const no = audits.reduce(
      (sum, audit) =>
        sum + audit.checks.filter((item) => item.answer === "no").length,
      0
    );

    const observations = audits.flatMap(
      (audit) => audit.serviceTimeObservations
    );

    const validTimes = observations
      .map((item) => item.seconds)
      .filter((value): value is number => value !== null && value >= 0);

    const averageTime =
      validTimes.length > 0
        ? validTimes.reduce((sum, value) => sum + value, 0) /
          validTimes.length
        : 0;

    return {
      total,
      average,
      yes,
      no,
      averageTime,
    };
  }, [audits]);

  const trend = [...audits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);

  return (
    <div className="audit-page">
      <PageHeader
        title="Servis Auditi Analitikası"
        subtitle="Servis keyfiyyəti, cavablar və xidmət vaxtının analizi"
        actions={
          <Link to="/app/audit/service" className="btn btn-secondary">
            Audİtlərə bax
          </Link>
        }
      />

      <div className="audit-kpi-grid">
        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <BarChart3 size={20} />
          </div>
          <span>Audit sayı</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Orta nəticə</span>
          <strong>{stats.average.toFixed(1)}%</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <XCircle size={20} />
          </div>
          <span>Xeyr cavabları</span>
          <strong>{stats.no}</strong>
        </div>

        <div className="audit-kpi-card">
          <div className="audit-kpi-icon">
            <Clock3 size={20} />
          </div>
          <span>Orta xidmət vaxtı</span>
          <strong>
            {stats.averageTime > 0
              ? `${stats.averageTime.toFixed(1)} san`
              : "—"}
          </strong>
        </div>
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Audit nəticələrinin trendi</h3>
              <p>Son auditlər üzrə ümumi faiz</p>
            </div>
          </div>

          {trend.length === 0 ? (
            <div className="audit-empty-state">
              Trend yaratmaq üçün hələ audit məlumatı yoxdur.
            </div>
          ) : (
            <div className="audit-analytics-bars">
              {trend.map((audit) => (
                <div className="audit-analytics-bar-item" key={audit.id}>
                  <div className="audit-analytics-bar-value">
                    {audit.overallPercentage.toFixed(0)}%
                  </div>

                  <div className="audit-analytics-bar-track">
                    <div
                      className="audit-analytics-bar"
                      style={{
                        height: `${Math.max(
                          5,
                          Math.min(100, audit.overallPercentage)
                        )}%`,
                      }}
                    />
                  </div>

                  <span>{audit.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Cavab paylanması</h3>
              <p>Bütün servis auditlərindəki nəticələr</p>
            </div>
          </div>

          <div className="audit-analytics-stat-list">
            <div>
              <span>Bəli</span>
              <strong>{stats.yes}</strong>
            </div>

            <div>
              <span>Xeyr</span>
              <strong>{stats.no}</strong>
            </div>

            <div>
              <span>N/A</span>
              <strong>
                {audits.reduce(
                  (sum, audit) =>
                    sum +
                    audit.checks.filter((item) => item.answer === "na")
                      .length,
                  0
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
