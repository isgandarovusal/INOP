import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import { getStandardAudits } from "../../../Services/standardAuditsService";
import type { StandardAudit } from "../../../Types/Audit";

export default function StandardAuditAnalytics() {
  const [audits, setAudits] = useState<StandardAudit[]>([]);

  useEffect(() => {
    getStandardAudits()
      .then(setAudits)
      .catch(() => setAudits([]));
  }, []);

  const stats = useMemo(() => {
    const total = audits.length;

    return {
      total,
      average:
        total > 0
          ? audits.reduce(
              (sum, audit) => sum + audit.compliancePercentage,
              0
            ) / total
          : 0,
      critical: audits.reduce(
        (sum, audit) => sum + audit.foundCritical,
        0
      ),
      major: audits.reduce((sum, audit) => sum + audit.foundMajor, 0),
      minor: audits.reduce((sum, audit) => sum + audit.foundMinor, 0),
      passed: audits.filter((audit) => audit.passed).length,
    };
  }, [audits]);

  const trend = [...audits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);

  return (
    <div className="audit-page">
      <PageHeader
        title="Standart Audit Analitikası"
        subtitle="Uyğunluq və uyğunsuzluqların severity analizi"
        actions={
          <Link to="/app/audit/standard" className="btn btn-secondary">
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

        <div className="audit-kpi-card audit-severity-kpi--compliant">
          <div className="audit-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Orta uyğunluq</span>
          <strong>{stats.average.toFixed(1)}%</strong>
        </div>

        <div className="audit-kpi-card audit-severity-kpi--critical">
          <div className="audit-kpi-icon">
            <ShieldAlert size={20} />
          </div>
          <span>Critical</span>
          <strong>{stats.critical}</strong>
        </div>

        <div className="audit-kpi-card audit-severity-kpi--major">
          <div className="audit-kpi-icon">
            <AlertCircle size={20} />
          </div>
          <span>Major</span>
          <strong>{stats.major}</strong>
        </div>
      </div>

      <div className="audit-detail-grid">
        <section className="audit-card">
          <div className="audit-card-header">
            <div>
              <h3>Uyğunluq trendi</h3>
              <p>Son 8 audit üzrə nəticələr</p>
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
                    {audit.compliancePercentage.toFixed(0)}%
                  </div>

                  <div className="audit-analytics-bar-track">
                    <div
                      className="audit-analytics-bar audit-analytics-bar--standard"
                      style={{
                        height: `${Math.max(
                          5,
                          Math.min(100, audit.compliancePercentage)
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
              <h3>Severity xülasəsi</h3>
              <p>Bütün standart auditlər</p>
            </div>
          </div>

          <div className="audit-analytics-stat-list">
            <div>
              <span>Critical</span>
              <strong>{stats.critical}</strong>
            </div>

            <div>
              <span>Major</span>
              <strong>{stats.major}</strong>
            </div>

            <div>
              <span>Minor</span>
              <strong>{stats.minor}</strong>
            </div>

            <div>
              <span>Passed</span>
              <strong>{stats.passed}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
