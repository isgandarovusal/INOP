import "../auditAnalytics.css";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import { getOccupationalSafetyAudits } from "../../../Services/occupationalSafetyAuditsService";
import type { OccupationalSafetyAudit } from "../../../Types/Audit";

export default function SafetyAuditAnalytics() {
  const [audits, setAudits] = useState<OccupationalSafetyAudit[]>([]);

  useEffect(() => {
    getOccupationalSafetyAudits()
      .then(setAudits)
      .catch(() => setAudits([]));
  }, []);

  const stats = useMemo(() => {
    const total = audits.length;

    const answered = audits.reduce(
      (sum, audit) =>
        sum +
        audit.checks.filter((item) => item.score !== null).length,
      0
    );

    return {
      total,
      average:
        total > 0
          ? audits.reduce(
              (sum, audit) => sum + audit.scorePercentage,
              0
            ) / total
          : 0,
      totalScore: audits.reduce(
        (sum, audit) => sum + audit.totalScore,
        0
      ),
      maxScore: audits.reduce(
        (sum, audit) => sum + audit.maxScore,
        0
      ),
      answered,
    };
  }, [audits]);

  const trend = [...audits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);

  return (
    <div className="audit-page">
      <PageHeader
        title="Əməyin Mühafizəsi Analitikası"
        subtitle="Təhlükəsizlik balları və uyğunluq göstəriciləri"
        actions={
          <Link to="/app/audit/safety" className="btn btn-secondary">
            Auditlərə bax
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

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <ShieldCheck size={20} />
          </div>
          <span>Orta nəticə</span>
          <strong>{stats.average.toFixed(1)}%</strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <Gauge size={20} />
          </div>
          <span>Toplam bal</span>
          <strong>
            {stats.totalScore} / {stats.maxScore}
          </strong>
        </div>

        <div className="audit-kpi-card audit-safety-kpi">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Cavablandırılan yoxlama</span>
          <strong>{stats.answered}</strong>
        </div>
      </div>

      <section className="audit-card">
        <div className="audit-card-header">
          <div>
            <h3>Bal trendi</h3>
            <p>Son 8 əməyin mühafizəsi auditi üzrə nəticələr</p>
          </div>
        </div>

        {trend.length === 0 ? (
          <div className="audit-empty-state">
            Trend yaratmaq üçün audit məlumatı yoxdur.
          </div>
        ) : (
          <div className="audit-analytics-bars">
            {trend.map((audit) => (
              <div className="audit-analytics-bar-item" key={audit.id}>
                <div className="audit-analytics-bar-value">
                  {audit.scorePercentage.toFixed(0)}%
                </div>

                <div className="audit-analytics-bar-track">
                  <div
                    className="audit-analytics-bar audit-analytics-bar--safety"
                    style={{
                      height: `${Math.max(
                        5,
                        Math.min(100, audit.scorePercentage)
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
    </div>
  );
}
