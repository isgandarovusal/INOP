import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  UserSquare2,
  ClipboardList,
  Star,
  ClipboardCheck,
  Gauge,
  Store,
  AlertTriangle,
  ArrowUpRight,
  PackageOpen,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import PageHeader from "../../Components/PageHeader";
import EmptyState from "../../Components/EmptyState";
import { useAuth } from "../../Context/AuthContext";
import { canAccessSection } from "../../Utils/permissions";
import { getJobs } from "../../Services/jobsService";
import { getCandidates } from "../../Services/candidatesService";
import { getApplications } from "../../Services/applicationsService";
import { getAuditAnalytics, type AuditAnalytics } from "../../Services/analyticsService";
import type { Job, Candidate, Application, CandidateStatus } from "../../Types/recruitment";

const STATUS_COLORS: Record<CandidateStatus, string> = {
  new: "#0ea5e9",
  screening: "#d97706",
  shortlisted: "#6366f1",
  rejected: "#ef4444",
  hired: "#16a34a",
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const showRecruitment = user ? canAccessSection(user.role, "recruitment") : false;
  const showAudit = user ? canAccessSection(user.role, "audit") : false;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tasks: Promise<unknown>[] = [];
    if (showRecruitment) {
      tasks.push(getJobs().then(setJobs));
      tasks.push(getCandidates().then(setCandidates));
      tasks.push(getApplications().then(setApplications));
    }
    if (showAudit) {
      tasks.push(getAuditAnalytics().then(setAnalytics));
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [showRecruitment, showAudit]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    candidates.forEach((c) => {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ status, value }));
  }, [candidates]);

  const recentCandidates = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [candidates],
  );

  if (!user) return null;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} subtitle="Here's what's happening across INOP." />

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          {showRecruitment && (
            <>
              <h3 className="dashboard-section-title">Recruitment</h3>
              <div className="kpi-grid">
                <div className="kpi-card anim-in">
                  <div className="kpi-card__icon" style={{ background: "rgba(99,102,241,0.12)" }}>
                    <Briefcase size={18} color="#6366f1" />
                  </div>
                  <p className="kpi-card__label">Total jobs</p>
                  <p className="kpi-card__value">{jobs.length}</p>
                </div>
                <div className="kpi-card anim-in" style={{ animationDelay: "0.05s" }}>
                  <div className="kpi-card__icon" style={{ background: "rgba(14,165,233,0.12)" }}>
                    <UserSquare2 size={18} color="#0ea5e9" />
                  </div>
                  <p className="kpi-card__label">Total candidates</p>
                  <p className="kpi-card__value">{candidates.length}</p>
                </div>
                <div className="kpi-card anim-in" style={{ animationDelay: "0.1s" }}>
                  <div className="kpi-card__icon" style={{ background: "rgba(34,197,94,0.12)" }}>
                    <ClipboardList size={18} color="#22c55e" />
                  </div>
                  <p className="kpi-card__label">Applications</p>
                  <p className="kpi-card__value">{applications.length}</p>
                </div>
                <div className="kpi-card anim-in" style={{ animationDelay: "0.15s" }}>
                  <div className="kpi-card__icon" style={{ background: "rgba(245,158,11,0.12)" }}>
                    <Star size={18} color="#f59e0b" />
                  </div>
                  <p className="kpi-card__label">Shortlisted</p>
                  <p className="kpi-card__value">
                    {candidates.filter((c) => c.status === "shortlisted").length}
                  </p>
                </div>
              </div>

              <div className="charts-grid">
                <div className="recent-card anim-in">
                  <div className="chart-card__header">
                    <h3>Recent candidates</h3>
                    <button className="recent-card__link" onClick={() => navigate("/app/recruitment/candidates")}>
                      View all <ArrowUpRight size={13} />
                    </button>
                  </div>
                  {recentCandidates.length === 0 ? (
                    <div className="chart-empty">
                      <PackageOpen size={22} />
                      <p>No candidates yet — add your first one to see it here.</p>
                    </div>
                  ) : (
                    <div className="recent-list">
                      {recentCandidates.map((c) => (
                        <div
                          className="recent-row"
                          key={c.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/app/recruitment/candidates/${c.id}`)}
                        >
                          <div className="recent-row__info">
                            <p className="recent-row__title">{c.name}</p>
                            <p className="recent-row__desc">{c.skills.slice(0, 3).join(", ") || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="chart-card anim-in" style={{ animationDelay: "0.06s" }}>
                  <div className="chart-card__header">
                    <h3>Candidates by status</h3>
                  </div>
                  {statusBreakdown.length === 0 ? (
                    <div className="chart-empty">
                      <UserSquare2 size={22} />
                      <p>Add candidates to see the status breakdown.</p>
                    </div>
                  ) : (
                    <div className="donut-wrap">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={statusBreakdown}
                            dataKey="value"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={2}
                            animationDuration={900}
                          >
                            {statusBreakdown.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={STATUS_COLORS[entry.status as CandidateStatus]}
                                stroke="none"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center">
                        <span className="donut-center__value">{candidates.length}</span>
                        <span className="donut-center__label">candidates</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {showAudit && analytics && (
            <>
              <h3 className="dashboard-section-title">Audit &amp; Operations</h3>
              <div className="kpi-grid">
                <div className="kpi-card anim-in">
                  <div className="kpi-card__icon" style={{ background: "rgba(99,102,241,0.12)" }}>
                    <Gauge size={18} color="#6366f1" />
                  </div>
                  <p className="kpi-card__label">Overall score</p>
                  <p className="kpi-card__value">{analytics.overallScore.toFixed(1)} / 10</p>
                </div>
                <div className="kpi-card anim-in" style={{ animationDelay: "0.05s" }}>
                  <div className="kpi-card__icon" style={{ background: "rgba(14,165,233,0.12)" }}>
                    <ClipboardCheck size={18} color="#0ea5e9" />
                  </div>
                  <p className="kpi-card__label">Total audits</p>
                  <p className="kpi-card__value">{analytics.totalAudits}</p>
                </div>
                <div className="kpi-card anim-in" style={{ animationDelay: "0.1s" }}>
                  <div className="kpi-card__icon" style={{ background: "rgba(34,197,94,0.12)" }}>
                    <Store size={18} color="#22c55e" />
                  </div>
                  <p className="kpi-card__label">Restaurants audited</p>
                  <p className="kpi-card__value">{analytics.restaurantsAudited}</p>
                </div>
                <div className="kpi-card anim-in" style={{ animationDelay: "0.15s" }}>
                  <div className="kpi-card__icon" style={{ background: "rgba(245,158,11,0.12)" }}>
                    <AlertTriangle size={18} color="#f59e0b" />
                  </div>
                  <p className="kpi-card__label">Critical / low scores</p>
                  <p className="kpi-card__value">{analytics.criticalCount}</p>
                </div>
              </div>

              <div className="recent-card anim-in">
                <div className="chart-card__header">
                  <h3>Restaurant comparison</h3>
                  <button className="recent-card__link" onClick={() => navigate("/app/audit/analytics")}>
                    Full analytics <ArrowUpRight size={13} />
                  </button>
                </div>
                {analytics.restaurantComparison.length === 0 ? (
                  <EmptyState icon={<Store size={26} />} title="No audits yet" hint="Submit an audit to see comparisons." />
                ) : (
                  <div className="recent-list">
                    {analytics.restaurantComparison.map((r) => (
                      <div className="recent-row" key={r.restaurantId}>
                        <div className="recent-row__info">
                          <p className="recent-row__title">{r.name}</p>
                        </div>
                        <span className="recent-row__time">{r.score.toFixed(1)} / 10</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
