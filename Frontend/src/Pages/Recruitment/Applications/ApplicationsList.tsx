import HRScopeFilters from "../../../Components/HRScopeFilters";
import MatchScoreBadge from "../../../Components/MatchScoreBadge";
import { applicationTransitions } from "../../../Utils/applicationWorkflow";
import { useHRActionContext } from "../../../Hooks/useHRActionContext";
import { isAxiosError } from "axios";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import { applicationScoreOrder } from "../../../Services/rankingService";
import { brandLabel } from "../../../Services/recruitmentCatalogService";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import {
  deleteApplication,
  updateApplicationStatus,
  type ApplicationPlacement,
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
import { useHRPage, useDebouncedSearch } from "../../../Hooks/useHRPage";
import HRPageControls from "../../../Components/HRPageControls";
import { getApplicationPage, canonicalHRStatus } from "../../../Services/hrPageService";
import { useHRBoard } from "../../../Hooks/useHRBoard";

const ApplicationsList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canUpdate = hasPermission(user, "application", "update");
  const canDelete = hasPermission(user, "application", "delete");
  const canManage = canDelete;
  const [boardCode, setBoardCode] = useState<{ component?: typeof import("../../../Components/ApplicationKanban").default; error?: "error" | "timeout" }>({});

  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'board' ? 'board' : 'table';
  useEffect(() => {
    if (view !== "board" || !hasPermission(user, "application", "read") || boardCode.component || boardCode.error) return;
    let current = true;
    const deadline = window.setTimeout(() => {
      current = false;
      setBoardCode({ error: "timeout" });
    }, 15000);
    // Start public board code alongside its scoped data request. A table never
    // downloads the drag-and-drop runtime. A failed module requires a fresh
    // document rather than repeatedly retrying a poisoned browser module map.
    void import("../../../Components/ApplicationKanban").then(module => {
      window.clearTimeout(deadline);
      if (current) setBoardCode({ component: module.default });
    }).catch(() => { window.clearTimeout(deadline); if (current) setBoardCode({ error: "error" }); });
    return () => { current = false; window.clearTimeout(deadline); };
  }, [view, user, boardCode.component, boardCode.error]);
  const ApplicationKanban = boardCode.component;
  const setView = (value: 'table' | 'board') => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value === 'board') next.set('view', 'board'); else next.delete('view');
    return next;
  });
  const [optimistic, setOptimistic] = useState<{ key: string; statuses: Record<string, ApplicationStatus>; cards?: Application[] }>({ key: '', statuses: {} });
  const [mutation, setMutation] = useState<{ key: string; error: string }>({ key: '', error: '' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'score' | 'newest' | 'name'>('score');
  const [brandFilter, setBrandFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "processing" | ApplicationStatus>("all");
  const debouncedSearch = useDebouncedSearch(search);
  const filters = { q: debouncedSearch, jobId: jobFilter === "all" ? undefined : jobFilter, status: statusFilter === "all" ? undefined : canonicalHRStatus(statusFilter), brandId: brandFilter === "all" ? undefined : brandFilter, branchId: branchFilter === "all" ? undefined : branchFilter };
  const table = useHRPage("application", filters, getApplicationPage, { enabled: view === 'table' });
  const board = useHRBoard(filters, view === 'board');
  const result = view === 'board' ? board : table;
  const [deleteBusy, setDeleteBusy] = useState<{ key: string; id: string | null }>({ key: "", id: null });
  const context = useHRActionContext(JSON.stringify([debouncedSearch, jobFilter, statusFilter, brandFilter, branchFilter, view, view === 'table' ? table.page : 1]));
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => { const current = controllers.current; return () => { for (const c of current) c.abort(); current.clear(); }; }, [context.key]);
  const deletingId = deleteBusy.key === context.key ? deleteBusy.id : null;
  const setDeletingId = (id: string | null) => setDeleteBusy({ key: context.key, id });
  const applications = useMemo(() => view === 'board' ? Object.values(board.columns).flatMap(column => column?.items || []) : table.data?.items || [], [view, board.columns, table.data]);
  const jobs = useMemo(() => Array.from(new Map(applications.flatMap(a => a.jobId && typeof a.jobId === "object" ? [[a.jobId.id, a.jobId] as const] : [])).values()), [applications]);
  const loading = result.status === "loading";
  const visibleApplications = useMemo(() => (optimistic.key === context.key && optimistic.cards || applications).map(a => optimistic.key === context.key && optimistic.statuses[a.id] ? { ...a, status: optimistic.statuses[a.id] } : a), [applications, optimistic, context.key]);
  const [selection, setSelection] = useState<{ key: string; target: Application } | null>(null);
  const deleteTarget = selection?.key === context.key ? selection.target : null;
  const setDeleteTarget = (target: Application | null) => setSelection(target ? { key: context.key, target } : null);

  const filtersActive =
    search.trim() !== "" || jobFilter !== "all" || statusFilter !== "all" || brandFilter !== "all" || branchFilter !== "all";

  const clearFilters = () => {
    setJobFilter("all"); setBrandFilter("all"); setBranchFilter("all");
    setStatusFilter("all"); setSearch("");
  };

  const load = result.reload;

  const rows = useMemo(() => {
    const jobMap = new Map(jobs.map((job) => [job.id, job]));

    return visibleApplications
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
      .sort((a, b) => sort === 'newest' ? new Date(b.app.createdAt || 0).getTime() - new Date(a.app.createdAt || 0).getTime() : sort === 'name' ? (a.candidate?.name || '').localeCompare(b.candidate?.name || '') : applicationScoreOrder(a.app, b.app));
  }, [visibleApplications, jobs, sort]);

  const handleDelete = async () => {
    if (!deleteTarget || !canDelete) return;

    const key = context.key;
    setDeletingId(deleteTarget.id);

    try {
      await deleteApplication(deleteTarget.id);
      if (context.current.current === key) { load(); setDeleteTarget(null); }
    } catch (deleteError) {
      if (context.current.current === key) setMutation({ key, error: hrCrudErrorKey(deleteError) });
    } finally {
      if (context.current.current === key) setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    appId: string,
    status: ApplicationStatus,
    placement?: ApplicationPlacement,
    ordered?: Application[],
  ) => {
    if (!canUpdate || optimistic.key === context.key && optimistic.statuses[appId]) return;
    const app = applications.find(a => a.id === appId); if (!app) return;
    const key = context.key;
    const controller = new AbortController(); controllers.current.add(controller);
    setOptimistic(previous => ({ key, statuses: { ...(previous.key === key ? previous.statuses : {}), [appId]: status }, ...(ordered ? { cards: ordered } : {}) }));
    setMutation({ key, error: '' });
    try {
      await updateApplicationStatus(appId, status, app.revision, placement, controller.signal);
      if (!controller.signal.aborted && context.current.current === key) load();
    } catch (err) {
      if (!controller.signal.aborted && context.current.current === key) {
        setMutation({ key, error: isAxiosError(err) && err.response?.status === 409 ? 'hrWorkflow.conflict' : hrCrudErrorKey(err) });
        if (isAxiosError(err) && [401, 403, 404, 409].includes(err.response?.status || 0)) load();
      }
    } finally {
      controllers.current.delete(controller);
      if (context.current.current === key) setOptimistic(previous => { const statuses = { ...(previous.key === key ? previous.statuses : {}) }; delete statuses[appId]; return { key, statuses }; });
    }
  };

  if (["forbidden", "unauthenticated"].includes(result.status)) return <HRResourceState status={result.status} retry={load} />;

  return (
    <div className="hr-workspace recruitment-list-page">
      <PageHeader
        title={t("recruitment.applications.title")}
        subtitle={result.status === "ready" && result.data ? t("recruitment.applications.totalShown", { total: result.data.total, shown: rows.length }) : undefined}
      />

      {mutation.key === context.key && mutation.error && <p role="alert">{t(mutation.error)} <button type="button" onClick={load}>{t("hrStates.retry")}</button></p>}
      <div className="filter-bar hr-primary-controls">
        <SearchInput value={search} onChange={setSearch} placeholder={t("hrWorkflow.search")} />
        <select aria-label={t("hrWorkflow.sort")} value={sort} onChange={e => setSort(e.target.value as typeof sort)}>{["score", "newest", "name"].map(s => <option key={s} value={s}>{t(s === 'newest' ? 'hrWorkflow.sortNewest' : `hrPage.sort${s.charAt(0).toUpperCase() + s.slice(1)}Page`)}</option>)}</select>
        <button type="button" onClick={() => setView(view === "table" ? "board" : "table")}>{t(view === "table" ? "hrMatch.board" : "hrMatch.table")}</button>
        <select
          aria-label={t('hrPage.statusFilter')}
          className="input-field"
          style={{ width: 170 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "processing" | ApplicationStatus)}
        >
          <option value="all">{t("recruitment.applications.allStatuses")}</option>
          <option value="applied">{t("recruitment.applications.applied")}</option>
          <option value="processing">{t("hrWorkflow.processing")}</option>
          <option value="screening">{t("recruitment.applications.screening")}</option>
          <option value="shortlisted">{t("recruitment.applications.shortlisted")}</option>
          <option value="interview">{t("recruitment.applications.interview")}</option>
          <option value="offered">{t("recruitment.applications.offered")}</option>
          <option value="hired">{t("recruitment.applications.hired")}</option>
          <option value="rejected">{t("recruitment.applications.rejected")}</option>
        </select>

        <HRScopeFilters jobs={jobs} brand={brandFilter} branch={branchFilter} onBrand={value => { setBrandFilter(value); setBranchFilter('all'); }} onBranch={setBranchFilter} job={jobFilter} onJob={setJobFilter} />

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

      <p role="note">{t(view === 'board' ? board.data?.manualOrder ? 'hrBoard.manualOrder' : 'hrBoard.selectVacancy' : "hrPage.pageSort")}</p>
      {result.status !== "ready" ? <HRResourceState status={result.status} retry={load} /> : view === "board" ? ApplicationKanban ? <ApplicationKanban applications={visibleApplications} pages={board.columns} laneState={board.laneState} onPage={(stage, delta) => { void board.pageLane(stage, delta); }} manualOrder={board.data?.manualOrder} reload={load} canChangeStatus={canUpdate} pendingIds={optimistic.key === context.key ? Object.keys(optimistic.statuses) : []} onStatusChange={handleStatusChange} /> : <HRResourceState status={boardCode.error || "loading"} retry={boardCode.error ? () => window.location.reload() : undefined} /> : <div className="admin-table-container" role="region" aria-label={t('recruitment.applications.title')} tabIndex={0}>
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
                  <td className="cell-title">
                    {candidate ? <button type="button" className="hr-row-title" onClick={() => navigate(`/app/recruitment/candidates/${candidate.id}`)}>{candidate.name}</button> : t("hrStates.restricted")}
                  </td>
                  <td className="cell-title">
                    {job ? <button type="button" className="hr-row-title" onClick={() => navigate(`/app/recruitment/jobs/${job.id}`)}>{job.position}</button> : t("hrStates.restricted")}
                    {job?.brandId && <small style={{ display: "block" }}>{job.brandName || brandLabel(job.brandId)}{job.branchName ? ` · ${job.branchName}` : ""}</small>}
                  </td>
                  <td><MatchScoreBadge application={app} onUpdated={load} /><button type="button" onClick={() => navigate(`/app/recruitment/applications/${app.id}`)}>{t("hrWorkflow.details")}</button></td>
                  <td>
                    {canUpdate ? (
                      <select
                        className="input-field"
                        style={{ width: 150, padding: "6px 10px" }}
                        aria-label={`${t("recruitment.applications.status")} ${candidate?.name || app.id}`}
                        disabled={optimistic.key === context.key && !!optimistic.statuses[app.id]}
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app.id, e.target.value as ApplicationStatus)
                        }
                      >
                        {[app.status, ...applicationTransitions[app.status]].map(s => <option key={s} value={s}>{t(`recruitment.applications.${s}`)}</option>)}
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

      {view === 'table' && <HRPageControls data={table.data} page={table.page} onPage={table.setPage} disabled={table.status !== "ready"} />}
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
