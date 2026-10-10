import MatchScoreBadge from "../../../Components/MatchScoreBadge";
import ApplicationKanban from "../../../Components/ApplicationKanban";
import { applicationScoreOrder } from "../../../Services/rankingService";
import { brandLabel } from "../../../Services/recruitmentCatalogService";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import {
  getApplications,
  deleteApplication,
  updateApplicationStatus,
} from "../../../Services/applicationsService";
import type { Application, ApplicationStatus } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/useAuth";
import { hasPermission } from "../../../Utils/permissions";
import { useTranslation } from "react-i18next";

const STATUS_TONE: Partial<Record<ApplicationStatus, BadgeTone>> = {
  applied: "info",
  screening: "warning",
  shortlisted: "accent",
  interview: "accent",
  offered: "success",
  rejected: "danger",
  hired: "success",
};

import HRResourceState from "../../../Components/HRResourceState";
import { useAuditResource } from "../../../Hooks/useAuditResource";
const loadApplications = (_id: string, signal?: AbortSignal, scopeKey?: string) => getApplications(signal, scopeKey);

const ApplicationsList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canUpdate = hasPermission(user, "application", "update");
  const canDelete = hasPermission(user, "application", "delete");
  const canManage = canDelete;

  const result = useAuditResource("list", "application", loadApplications);
  const applications = useMemo(() => result.data ?? [], [result.data]);
  const jobs = useMemo(() => Array.from(new Map(applications.flatMap(a => a.jobId && typeof a.jobId === "object" ? [[a.jobId.id, a.jobId] as const] : [])).values()), [applications]);
  const loading = result.status === "loading";
  const [error, setError] = useState(false);
  const [view, setView] = useState<"table" | "board">("table");
  const [brandFilter, setBrandFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtersActive =
    jobFilter !== "all" || statusFilter !== "all" || brandFilter !== "all" || branchFilter !== "all";

  const clearFilters = () => {
    setJobFilter("all"); setBrandFilter("all"); setBranchFilter("all");
    setStatusFilter("all");
  };

  const load = result.reload;

  const rows = useMemo(() => {
    const jobMap = new Map(jobs.map((job) => [job.id, job]));

    return applications
      .map((app) => ({
        app,
        job:
          typeof app.jobId === "string"
            ? jobMap.get(app.jobId)
            : app.jobId,
        candidate:
          typeof app.candidateId === "string"
            ? undefined
            : app.candidateId,
      }))
      .filter(r => brandFilter === "all" || (r.job?.brandId || "unset") === brandFilter)
      .filter(r => branchFilter === "all" || (r.job?.branchId || "unset") === branchFilter)
      .filter((r) => jobFilter === "all" || r.job?.id === jobFilter)
      .filter((r) => statusFilter === "all" || r.app.status === statusFilter)
      .sort((a, b) => applicationScoreOrder(a.app, b.app));
  }, [applications, jobs, jobFilter, statusFilter, brandFilter, branchFilter]);

  const handleDelete = async () => {
    if (!deleteTarget || !canDelete) return;

    setDeletingId(deleteTarget.id);

    try {
      await deleteApplication(deleteTarget.id);
      load();
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error("Application delete error:", deleteError); setError(true);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    appId: string,
    status: ApplicationStatus,
  ) => {
    if (!canUpdate) return;
    try {
      await updateApplicationStatus(appId, status);

      load();
    } catch (statusError) {
      console.error("Application status update error:", statusError); setError(true);
    }
  };

  if (result.status !== "ready") return <HRResourceState status={result.status} retry={load} />;

  return (
    <div className="recruitment-list-page">
      <PageHeader
        title={t("recruitment.applications.title")}
        subtitle={t("recruitment.applications.totalShown", { total: applications.length, shown: rows.length })}
      />

      <div className="filter-bar">
        <button type="button" onClick={() => setView(view === "table" ? "board" : "table")}>{t(view === "table" ? "hrMatch.board" : "hrMatch.table")}</button>
        <select aria-label={t('hrCatalog.brand')} value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setBranchFilter('all'); }}><option value="all">{t('hrCatalog.allBrands')}</option><option value="unset">{t('hrCatalog.unset')}</option>{[...new Set(jobs.map(j => j.brandId).filter((id): id is string => !!id))].map(id => <option key={id} value={id}>{jobs.find(j => j.brandId === id)?.brandName || brandLabel(id)}</option>)}</select>
        <select aria-label={t('hrCatalog.branch')} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}><option value="all">{t('hrCatalog.allBranches')}</option>{[...new Set(jobs.filter(j => brandFilter === 'all' || j.brandId === brandFilter).map(j => j.branchId).filter((id): id is string => !!id))].map(id => <option key={id} value={id}>{jobs.find(j => j.branchId === id)?.branchName || t("hrCatalog.unavailable")}</option>)}</select>
        <select className="input-field" style={{ width: 220 }} value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="all">{t("recruitment.applications.allJobs")}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.position}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ width: 170 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ApplicationStatus)}
        >
          <option value="all">{t("recruitment.applications.allStatuses")}</option>
          <option value="applied">{t("recruitment.applications.applied")}</option>
          <option value="screening">{t("recruitment.applications.screening")}</option>
          <option value="shortlisted">{t("recruitment.applications.shortlisted")}</option>
          <option value="interview">{t("recruitment.applications.interview")}</option>
          <option value="offered">{t("recruitment.applications.offered")}</option>
          <option value="hired">{t("recruitment.applications.hired")}</option>
          <option value="rejected">{t("recruitment.applications.rejected")}</option>
        </select>

        {filtersActive && (
          <button
            type="button"
            className="btn-secondary"
            onClick={clearFilters}
          >
            {t("common.actions.clear")}
          </button>
        )}
      </div>

      {view === "board" ? <ApplicationKanban applications={rows.map(r => r.app)} reload={load} /> : <div className="admin-table-container">
        <table>
          <thead>
            <tr>
              <th>{t("recruitment.applications.candidate")}</th>
              <th>{t("recruitment.applications.job")}</th>
              <th>{t("recruitment.applications.score")}</th>
              <th>{t("recruitment.applications.status")}</th>
              {canManage && <th className="col-actions">{t("recruitment.applications.actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  <EmptyState
                    icon={<ClipboardList size={28} />}
                    title={t("common.somethingWentWrong")}
                    hint={t("recruitment.applications.loadError")}
                  />
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={load}
                    >
                      {t("recruitment.applications.retry")}
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  <EmptyState
                    icon={<ClipboardList size={28} />}
                    title={
                      filtersActive
                        ? t("recruitment.applications.noFilteredApplications")
                        : t("recruitment.applications.noApplications")
                    }
                    hint={
                      filtersActive
                        ? t("recruitment.applications.noFilteredApplicationsHint")
                        : t("recruitment.applications.noApplicationsHint")
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map(({ app, job, candidate }) => (
                <tr key={app.id} className={deletingId === app.id ? "row--removing" : ""}>
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => candidate && navigate(`/app/recruitment/candidates/${candidate.id}`)}
                  >
                    {candidate?.name ?? t("hrStates.restricted")}
                  </td>
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => job && navigate(`/app/recruitment/jobs/${job.id}`)}
                  >
                    {job?.position ?? t("hrStates.restricted")}
                    {job?.brandId && <small style={{ display: "block" }}>{job.brandName || brandLabel(job.brandId)}{job.branchName ? ` · ${job.branchName}` : ""}</small>}
                  </td>
                  <td><MatchScoreBadge application={app} onUpdated={load} /></td>
                  <td>
                    {canUpdate ? (
                      <select
                        className="input-field"
                        style={{ width: 150, padding: "6px 10px" }}
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app.id, e.target.value as ApplicationStatus)
                        }
                      >
                        <option value="applied">{t("recruitment.applications.applied")}</option>
                        <option value="screening">{t("recruitment.applications.screening")}</option>
                        <option value="shortlisted">{t("recruitment.applications.shortlisted")}</option>
                        <option value="interview">{t("recruitment.applications.interview")}</option>
                        <option value="offered">{t("recruitment.applications.offered")}</option>
                        <option value="hired">{t("recruitment.applications.hired")}</option>
                        <option value="rejected">{t("recruitment.applications.rejected")}</option>
                      </select>
                    ) : (
                      <Badge tone={STATUS_TONE[app.status]}>{t(`recruitment.applications.${app.status}`)}</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn icon-btn--danger"
                          title={t("recruitment.applications.delete")}
                          disabled={deletingId === app.id}
                          onClick={() => setDeleteTarget(app)}
                        >
                          {deletingId === app.id ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>}

      {deleteTarget && (
        <ConfirmDialog
          title={t("recruitment.applications.removeTitle")}
          message={t("recruitment.applications.removeMessage")}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ApplicationsList;
