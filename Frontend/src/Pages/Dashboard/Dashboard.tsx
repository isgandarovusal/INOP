import React, { useEffect, useRef, useState } from "react";
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
import { syncClientSession } from "../../api/clientSession";
import api from "../../api/axios";
import { dashboardSnapshot, keepDashboardSnapshot, clearDashboardSnapshot } from "../../api/dashboardSnapshot";
import { aggregateEpoch, invalidateAggregates } from "../../api/aggregateCache";
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
  const sessionOwner = syncClientSession(user);

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
        user.id, sessionOwner, api.defaults.baseURL,
        user.role,
        user.departmentId,
        user.isActive, user.hrAccess, user.auditDirection, user.auditDirections,
        (user.permissions || []).map(({ resource, action, scope }) => [resource, action, scope]),
      ])
    : null;

  const snapshot = dataScopeKey ? dashboardSnapshot(dataScopeKey) : undefined;
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(snapshot ? dataScopeKey : null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [jobs, setJobs] = useState<CountSummary>(snapshot?.value.jobs ?? {total:0});
  const [candidates, setCandidates] = useState<CandidateSummary>(snapshot?.value.candidates ?? {total:0,shortlistedCount:0,statusBreakdown:[],recentCandidates:[]});
  const [applications, setApplications] = useState<ApplicationSummary>(snapshot?.value.applications ?? {total:0,pipeline:null});
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(snapshot?.value.analytics ?? null);
  const [jobsLoading, setJobsLoading] = useState(!snapshot?.value.jobs);
  const [candidatesLoading, setCandidatesLoading] = useState(!snapshot?.value.candidates);
  const [applicationsLoading, setApplicationsLoading] = useState(!snapshot?.value.applications);
  const [auditLoading, setAuditLoading] = useState(!snapshot?.value.analytics);
  const [summaryErrors,setSummaryErrors] = useState({jobs:false,candidates:false,applications:false});
  const [recruitmentError, setRecruitmentError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const refreshSnapshot = useRef<{key: string; snapshot: ReturnType<typeof dashboardSnapshot>} | undefined>(undefined);
  const refreshDashboard = () => { refreshSnapshot.current = dataScopeKey ? {key: dataScopeKey, snapshot: dashboardSnapshot(dataScopeKey)} : undefined; invalidateAggregates(); setRefreshRevision(value=>value+1); };


  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const requestScopeKey = JSON.stringify([dataScopeKey, refreshRevision]);
    const epoch = aggregateEpoch();
    const previous = (dataScopeKey ? dashboardSnapshot(dataScopeKey) : undefined) ?? (refreshRevision && refreshSnapshot.current?.key === dataScopeKey ? refreshSnapshot.current.snapshot : undefined);
    if (previous?.fresh && (previous.value.jobs !== undefined) === canJobs && (previous.value.candidates !== undefined) === canCandidates && (previous.value.applications !== undefined) === canApplications && (previous.value.analytics !== undefined) === showAudit && refreshRevision === 0) {
      setJobsLoading(false); setCandidatesLoading(false); setApplicationsLoading(false); setAuditLoading(false);
      return;
    }
    const remember = (patch: Parameters<typeof keepDashboardSnapshot>[2]) => { if (dataScopeKey) keepDashboardSnapshot(dataScopeKey, epoch, patch); };
    setRefreshing(canJobs || canCandidates || canApplications || showAudit);
    let remaining = Number(canJobs) + Number(canCandidates) + Number(canApplications) + Number(showAudit);
    const settled = () => { if (--remaining <= 0 && mounted) setRefreshing(false); };
    const deadline = setTimeout(() => controller.abort(), 15000);

    const loadDashboard = () => {
      setLoadedScopeKey(dataScopeKey);
      setRecruitmentError(null);
      setSummaryErrors({jobs:false,candidates:false,applications:false});
      setAuditError(null);


      if (showRecruitment) {
        setJobsLoading(!previous?.value.jobs);
        setCandidatesLoading(!previous?.value.candidates);
        setApplicationsLoading(!previous?.value.applications);

        if (canJobs) {
        void getJobsSummary(controller.signal, requestScopeKey, recruitmentScope === 'all' ? dataScopeKey ?? undefined : undefined)
          .then((result) => {
            if (!mounted) return;
            setJobs(result); remember({jobs: result});
          })
          .catch((error) => {
            if (!mounted) return;
            console.error("Jobs dashboard load failed.");
            if ([401,403,404].includes(error?.response?.status)) { clearDashboardSnapshot(); setSummaryErrors(current=>({...current,jobs:true})); } else if (!previous?.value.jobs) setSummaryErrors(current=>({...current,jobs:true}));

            setRecruitmentError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            settled();
            if (mounted) {
              setJobsLoading(false);
            }
          });
        } else { setJobsLoading(false); }

        if (canCandidates) {
        void getCandidatesSummary(controller.signal, requestScopeKey)
          .then((result) => {
            if (!mounted) return;
            setCandidates(result); remember({candidates: result});
          })
          .catch((error) => {
            if (!mounted) return;
            console.error("Candidates dashboard load failed.");
            if ([401,403,404].includes(error?.response?.status)) { clearDashboardSnapshot(); setSummaryErrors(current=>({...current,candidates:true})); } else if (!previous?.value.candidates) setSummaryErrors(current=>({...current,candidates:true}));

            setRecruitmentError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            settled();
            if (mounted) {
              setCandidatesLoading(false);
            }
          });
        } else { setCandidatesLoading(false); }

        if (canApplications) {
        void getApplicationsSummary(controller.signal, requestScopeKey, applicationScope === 'all' && candidateScope === 'all' && recruitmentScope === 'all' ? dataScopeKey ?? undefined : undefined)
          .then((result) => {
            if (!mounted) return;
            setApplications(result); remember({applications: result});
          })
          .catch((error) => {
            if (!mounted) return;
            console.error("Applications dashboard load failed.");
            if ([401,403,404].includes(error?.response?.status)) { clearDashboardSnapshot(); setSummaryErrors(current=>({...current,applications:true})); } else if (!previous?.value.applications) setSummaryErrors(current=>({...current,applications:true}));

            setRecruitmentError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            settled();
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
        setAuditLoading(!previous?.value.analytics);

        void getAuditAnalytics(controller.signal, requestScopeKey)
          .then((result) => {
            if (!mounted) return;
            setAnalytics(result); remember({analytics: result});
          })
          .catch((error) => {
            if (!mounted) return;
            console.error("Audit dashboard load failed.");

            if ([401,403,404].includes(error?.response?.status)) { clearDashboardSnapshot(); setAnalytics(null); }
            setAuditError(
              error?.response?.data?.message || ""
            );
          })
          .finally(() => {
            settled();
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
  }, [dataScopeKey, refreshRevision, showRecruitment, showAudit, canJobs, canCandidates, canApplications, recruitmentScope, candidateScope, applicationScope]);

  const statusBreakdown=candidates.profileStatusBreakdown ?? candidates.statusBreakdown;
  const recentCandidates=candidates.recentCandidates;

  if (!user) return null;
  if (loadedScopeKey !== dataScopeKey) return <PageState type="loading" message={t("dashboard.loading")} />;

  return (
    <div className="main-dashboard hr-workspace">
      <PageHeader title={t("dashboard.welcome", { name: user.name.split(" ")[0] })} subtitle={t("dashboard.subtitle")} actions={<button type="button" className="btn-secondary" aria-busy={refreshing} disabled={refreshing || jobsLoading || candidatesLoading || applicationsLoading || auditLoading} onClick={refreshDashboard}>{t("common.actions.refresh")}</button>} />

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
                    <p>{recruitmentError || t("dashboard.recruitmentLoadError")}</p><button className="btn-secondary" onClick={refreshDashboard}>{t('common.retry')}</button>
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
                          role="link" tabIndex={0}
                          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/app/recruitment/candidates/${c.id}`); } }}
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
                    <p>{auditError || t("dashboard.auditLoadError")}</p><button className="btn-secondary" onClick={refreshDashboard}>{t('common.retry')}</button>
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
