import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import PageState from "../../Components/PageState";
import PageHeader from "../../Components/PageHeader";
import EmptyState from "../../Components/EmptyState";
import { useAuth } from "../../Context/useAuth";
import { getPermissionScope } from "../../Utils/permissions";
import { getJobsSummary, getCandidatesSummary, getApplicationsSummary, type CountSummary, type CandidateSummary, type ApplicationSummary } from "../../Services/dashboardSummaryService";
import { getAuditAnalytics, type AuditAnalytics } from "../../Services/analyticsService";
import { ACCENT } from "../../Utils/theme";

const CandidateStatusDonut = React.lazy(() => import("./CandidateStatusDonut"));

const KPI_ICON_STYLES = {
  accent: {
    background: "rgba(99,102,241,0.12)",
    color: ACCENT,
  },
  info: {
    background: "rgba(14,165,233,0.12)",
    color: "#0ea5e9",
  },
  success: {
    background: "rgba(34,197,94,0.12)",
    color: "#22c55e",
  },
  warning: {
    background: "rgba(245,158,11,0.12)",
    color: "#f59e0b",
  },
} as const;

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const recruitmentScope = getPermissionScope(user, "recruitment", "read");
  const canJobs = Boolean(recruitmentScope && recruitmentScope !== 'none');
  const candidateScope=getPermissionScope(user,'candidate','read'),applicationScope=getPermissionScope(user,'application','read');
  const canCandidates=Boolean(candidateScope && candidateScope!=='none'),canApplications=Boolean(applicationScope && applicationScope!=='none');
  const showRecruitment = canJobs || canCandidates || canApplications;
  const auditScope = getPermissionScope(user, "audit", "read");
  const showAudit = !!auditScope && auditScope !== "none";
  // Translation changes do not change the user's data scope.
  const dataScopeKey = user
    ? JSON.stringify([
        user.id,
        user.role,
        user.departmentId,
        user.isActive,
        (user.permissions || []).map(({ resource, action, scope }) => [resource, action, scope]),
      ])
    : null;

  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [jobs, setJobs] = useState<CountSummary>({total:0});
  const [candidates, setCandidates] = useState<CandidateSummary>({total:0,shortlistedCount:0,statusBreakdown:[],recentCandidates:[]});
  const [applications, setApplications] = useState<ApplicationSummary>({total:0,pipeline:null});
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [summaryErrors,setSummaryErrors] = useState({jobs:false,candidates:false,applications:false});
  const [recruitmentError, setRecruitmentError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    let lastRefresh = 0;
    const refresh = () => { const now = Date.now(); if (document.visibilityState !== 'visible' || now - lastRefresh < 1000) return; lastRefresh = now; setRefreshRevision(value => value + 1); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const requestScopeKey = JSON.stringify([dataScopeKey, refreshRevision]);
    const deadline = setTimeout(() => controller.abort(), 15000);

    const loadDashboard = () => {
      setLoadedScopeKey(dataScopeKey);
      setRecruitmentError(null);
      setSummaryErrors({jobs:false,candidates:false,applications:false});
      setAuditError(null);
      setJobs({total:0});
      setCandidates({total:0,shortlistedCount:0,statusBreakdown:[],recentCandidates:[]});
      setApplications({total:0,pipeline:null});
      setAnalytics(null);

      if (showRecruitment) {
        setJobsLoading(true);
        setCandidatesLoading(true);
        setApplicationsLoading(true);

        if (canJobs) {
        void getJobsSummary(controller.signal, requestScopeKey)
          .then((result) => {
            if (!mounted) return;
            setJobs(result);
          })
          .catch((error) => {
            console.error("Jobs dashboard load error:", error);
            if (mounted) setSummaryErrors(current=>({...current,jobs:true}));

            if (!mounted) return;

            setRecruitmentError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            if (mounted) {
              setJobsLoading(false);
            }
          });
        } else { setJobsLoading(false); }

        if (canCandidates) {
        void getCandidatesSummary(controller.signal, requestScopeKey)
          .then((result) => {
            if (!mounted) return;
            setCandidates(result);
          })
          .catch((error) => {
            console.error("Candidates dashboard load error:", error);
            if (mounted) setSummaryErrors(current=>({...current,candidates:true}));

            if (!mounted) return;

            setRecruitmentError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            if (mounted) {
              setCandidatesLoading(false);
            }
          });
        } else { setCandidatesLoading(false); }

        if (canApplications) {
        void getApplicationsSummary(controller.signal, requestScopeKey)
          .then((result) => {
            if (!mounted) return;
            setApplications(result);
          })
          .catch((error) => {
            console.error("Applications dashboard load error:", error);
            if (mounted) setSummaryErrors(current=>({...current,applications:true}));

            if (!mounted) return;

            setRecruitmentError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            if (mounted) {
              setApplicationsLoading(false);
            }
          });
        } else { setApplicationsLoading(false); }
      } else {
        setJobsLoading(false);
        setCandidatesLoading(false);
        setApplicationsLoading(false);
      }

      if (showAudit) {
        setAuditLoading(true);

        void getAuditAnalytics(controller.signal, requestScopeKey)
          .then((result) => {
            if (!mounted) return;
            setAnalytics(result);
          })
          .catch((error) => {
            console.error("Audit dashboard load error:", error);

            if (!mounted) return;

            setAuditError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            if (mounted) {
              setAuditLoading(false);
            }
          });
      } else {
        setAuditLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [dataScopeKey, refreshRevision, showRecruitment, showAudit, canJobs, canCandidates, canApplications]);

  const statusBreakdown=candidates.profileStatusBreakdown ?? candidates.statusBreakdown;
  const recentCandidates=candidates.recentCandidates;

  if (!user) return null;
  if (loadedScopeKey !== dataScopeKey) return <PageState type="loading" message={t("dashboard.loading")} />;

  return (
    <div className="main-dashboard hr-workspace">
      <PageHeader title={t("dashboard.welcome", { name: user.name.split(" ")[0] })} subtitle={t("dashboard.subtitle")} />

          {showRecruitment && (
            <div className="hr-dashboard-summary">
              <h3 className="dashboard-section-title">{t("dashboard.recruitment")}</h3>
              <p className="form-hint">{t("recruitmentSemantics.dashboardHelp")}</p>
              {!applicationsLoading && !summaryErrors.applications && Boolean(applications.pipeline?.unknownCount) && <p role="status" className="dashboard-inline-error">{t("recruitmentSemantics.unknownStages", {count: applications.pipeline!.unknownCount})}</p>}

              {recruitmentError !== null && (
                <div className="dashboard-error">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{t("dashboard.recruitmentLoadErrorTitle")}</strong>
                    <p>{recruitmentError || t("dashboard.recruitmentLoadError")}</p><button className="btn-secondary" onClick={()=>setRefreshRevision(v=>v+1)}>{t('common.retry')}</button>
                  </div>
                </div>
              )}
              <div className="kpi-grid">
                {canJobs && (
                <div className="kpi-card anim-in">
                  <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.accent.background }}>
                    <Briefcase size={18} color={ACCENT} />
                  </div>
                  <p className="kpi-card__label">{t("recruitmentSemantics.activeProfilesJobs")}</p>
                  <p className="kpi-card__value">
                    {jobsLoading ? t("dashboard.loading") : summaryErrors.jobs ? t("auditFlow.unavailable") : jobs.total}
                  </p>
                </div>
                )}
                {canCandidates && (
                <div className="kpi-card anim-in" style={{ animationDelay: "0.05s" }}>
                  <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.info.background }}>
                    <UserSquare2 size={18} color={KPI_ICON_STYLES.info.color} />
                  </div>
                  <p className="kpi-card__label">{t("recruitmentSemantics.activeProfiles")}</p>
                  <p className="kpi-card__value">
                    {candidatesLoading ? t("dashboard.loading") : summaryErrors.candidates ? t("auditFlow.unavailable") : candidates.total}
                  </p>
                </div>
                )}
                {canApplications && (
                <div className="kpi-card anim-in" style={{ animationDelay: "0.1s" }}>
                  <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.success.background }}>
                    <ClipboardList size={18} color={KPI_ICON_STYLES.success.color} />
                  </div>
                  <p className="kpi-card__label">{t("recruitmentSemantics.applicationTotal")}</p>
                  <p className="kpi-card__value">
                    {applicationsLoading ? t("dashboard.loading") : summaryErrors.applications || !applications.pipeline ? t("auditFlow.unavailable") : applications.pipeline.total}
                  </p>
                </div>
                )}
                {canApplications && (
                <div className="kpi-card anim-in" style={{ animationDelay: "0.15s" }}>
                  <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.warning.background }}>
                    <Star size={18} color={KPI_ICON_STYLES.warning.color} />
                  </div>
                  <p className="kpi-card__label">{t("recruitmentSemantics.shortlistedApplications")}</p>
                  <p className="kpi-card__value">
                    {applicationsLoading ? t("dashboard.loading") : summaryErrors.applications || !applications.pipeline ? t("auditFlow.unavailable") : applications.pipeline.shortlistedCount}
                  </p>
                </div>
                )}
              </div>

              {canCandidates && (
              <div className="charts-grid">
                <div className="recent-card anim-in">
                  <div className="chart-card__header">
                    <h3>{t("dashboard.recentCandidates")}</h3>
                    <button className="btn-secondary recent-card__link" onClick={() => navigate("/app/recruitment/candidates")}>
                      {t("dashboard.viewAll")} <ArrowUpRight size={13} />
                    </button>
                  </div>
                  {candidatesLoading ? (
                    <div className="empty-state">{t("dashboard.loading")}</div>
                  ) : summaryErrors.candidates ? <p role="status" className="dashboard-inline-error">{t('auditFlow.unavailable')}</p> : recentCandidates.length === 0 ? (
                    <div className="chart-empty">
                      <PackageOpen size={22} />
                      <p>{t("dashboard.noCandidates")}</p>
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
                    <h3>{t("recruitmentSemantics.profileStatuses")}</h3>
                  </div>
                  {candidatesLoading ? (
                    <div className="empty-state">{t("dashboard.loading")}</div>
                  ) : summaryErrors.candidates ? <p role="status" className="dashboard-inline-error">{t('auditFlow.unavailable')}</p> : statusBreakdown.length === 0 ? (
                    <div className="chart-empty">
                      <UserSquare2 size={22} />
                      <p>{t("dashboard.addCandidates")}</p>
                    </div>
                  ) : (
                    <div className="donut-wrap">
                      <React.Suspense fallback={<div className="empty-state">{t("dashboard.loading")}</div>}><CandidateStatusDonut data={statusBreakdown} />
                      <div className="donut-center">
                        <span className="donut-center__value">{candidates.total}</span>
                        <span className="donut-center__label">{candidates.total === 1 ? t("dashboard.candidate") : t("dashboard.candidates")}</span>
                      </div>
                      </React.Suspense>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          )}

          {showAudit && (
            <>
              <h3 className="dashboard-section-title">{t("dashboard.auditOperations")}</h3>

              {auditLoading ? (
                <div className="empty-state">{t("dashboard.loading")}</div>
              ) : (
                <>
              {auditError !== null && (
                <div className="dashboard-error">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{t("dashboard.auditLoadErrorTitle")}</strong>
                    <p>{auditError || t("dashboard.auditLoadError")}</p><button className="btn-secondary" onClick={()=>setRefreshRevision(v=>v+1)}>{t('common.retry')}</button>
                  </div>
                </div>
              )}

              {analytics && (

                <>

                  <div className="kpi-grid">

                    <div className="kpi-card anim-in">

                      <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.accent.background }}>

                        <Gauge size={18} color={ACCENT} />

                      </div>

                      <p className="kpi-card__label">{t("dashboard.overallScore")}</p>

                      <p className={`kpi-card__value${analytics.overallScore == null ? " kpi-card__value--text" : ""}`}>{analytics.overallScore == null ? t('auditFlow.notCombined') : `${analytics.overallScore.toFixed(1)} / 10`}</p>

                    </div>


                    <div className="kpi-card anim-in" style={{ animationDelay: "0.05s" }}>

                      <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.info.background }}>

                        <ClipboardCheck size={18} color={KPI_ICON_STYLES.info.color} />

                      </div>

                      <p className="kpi-card__label">{t("dashboard.totalAudits")}</p>

                      <p className="kpi-card__value">{analytics.totalAudits}</p>

                    </div>


                    <div className="kpi-card anim-in" style={{ animationDelay: "0.1s" }}>

                      <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.success.background }}>

                        <Store size={18} color={KPI_ICON_STYLES.success.color} />

                      </div>

                      <p className="kpi-card__label">{t("dashboard.restaurantsAudited")}</p>

                      <p className="kpi-card__value">{analytics.restaurantsAudited}</p>

                    </div>


                    <div className="kpi-card anim-in" style={{ animationDelay: "0.15s" }}>

                      <div className="kpi-card__icon" style={{ background: KPI_ICON_STYLES.warning.background }}>

                        <AlertTriangle size={18} color={KPI_ICON_STYLES.warning.color} />

                      </div>

                      <p className="kpi-card__label">{t("dashboard.criticalLowScores")}</p>

                      <p className="kpi-card__value">{analytics.criticalCount}</p>

                    </div>

                  </div>


                  <div className="recent-card anim-in">

                    <div className="chart-card__header">

                      <h3>{t("dashboard.restaurantComparison")}</h3>

                      <button

                        className="btn-secondary recent-card__link"

                        onClick={() => navigate("/app/audit/analytics")}

                      >

                        {t("dashboard.fullAnalytics")} <ArrowUpRight size={13} />

                      </button>

                    </div>


                    {analytics.restaurantComparison.length === 0 ? (

                      <EmptyState

                        icon={<Store size={26} />}

                        title={t("dashboard.noAudits")}

                        hint={t("dashboard.submitAudit")}

                      />

                    ) : (

                      <div className="recent-list">

                        {analytics.restaurantComparison.map((r) => (

                          <div className="recent-row" key={r.restaurantId}>

                            <div className="recent-row__info">

                              <p className="recent-row__title">{r.name}</p>

                            </div>

                            <span className="recent-row__time">

                              {r.score?.toFixed(1) ?? "—"} / 10

                            </span>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                </>

              )}
                </>
              )}
            </>
          )}
    </div>
  );
};

export default Dashboard;
