import HRScopeFilters from "../../../Components/HRScopeFilters";
import { brandLabel } from "../../../Services/recruitmentCatalogService";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Loader2, Pencil, Plus, Archive, RotateCcw } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/HRConfirmDialog";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import { deleteJob, restoreJob } from "../../../Services/jobsService";
import type { Job, JobStatus } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/useAuth";
import { hasPermission } from "../../../Utils/permissions";
import { useTranslation } from "react-i18next";

const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  open: "success",
  closed: "neutral",
  draft: "warning",
};

import HRResourceState from "../../../Components/HRResourceState";
import { useHRPage, useDebouncedSearch } from "../../../Hooks/useHRPage";
import { useHRActionContext } from "../../../Hooks/useHRActionContext";
import HRPageControls from "../../../Components/HRPageControls";
import { getJobPage, canonicalHRStatus } from "../../../Services/hrPageService";

const JobsList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = hasPermission(user, "recruitment", "create");
  const canUpdate = hasPermission(user, "recruitment", "update");
  const canDelete = hasPermission(user, "recruitment", "delete");
  const canManage = canUpdate || canDelete;

  const [archived, setArchived] = useState("false");
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [deleteBusy, setDeleteBusy] = useState<{ key: string; id: string | null }>({ key: "", id: null });
  const [mutation, setMutation] = useState({ key: '', error: '' });
  const search = useDebouncedSearch(query);
  const result = useHRPage('recruitment', { archived, q: search, brandId: brandFilter === 'all' ? undefined : brandFilter, branchId: branchFilter === 'all' ? undefined : branchFilter, status: statusFilter === 'all' ? undefined : canonicalHRStatus(statusFilter) }, getJobPage);
  const context = useHRActionContext(JSON.stringify([archived, search, brandFilter, branchFilter, statusFilter, result.page]));
  const deletingId = deleteBusy.key === context.key ? deleteBusy.id : null;
  const setDeletingId = (id: string | null) => setDeleteBusy({ key: context.key, id });
  const jobs = useMemo(() => result.data?.items ?? [], [result.data]);
  const loading = result.status === 'loading';
  const error = mutation.key === context.key ? mutation.error : '';
  const [selection, setSelection] = useState<{ key: string; target: Job } | null>(null);
  const deleteTarget = selection?.key === context.key ? selection.target : null;
  const setDeleteTarget = (target: Job | null) => setSelection(target ? { key: context.key, target } : null);

  const filtersActive =
    query.trim() !== "" || statusFilter !== "all" || brandFilter !== "all" || branchFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all"); setBrandFilter("all"); setBranchFilter("all");
  };

  const load = result.reload;

  const filtered = jobs;

  const handleDelete = async () => {
    if (!deleteTarget || !canDelete) return;

    const id = deleteTarget.id; const key = context.key;
    setDeletingId(id);

    try {
      await deleteJob(id, undefined, deleteTarget.revision);
      if (context.current.current === key) { load(); setDeleteTarget(null); }
    } catch (err: unknown) {
      if (context.current.current === key) setMutation({ key, error: hrCrudErrorKey(err) });
    } finally {
      if (context.current.current === key) setDeletingId(null);
    }
  };

  const handleRestore = async(job:Job)=>{const key=context.key;setDeletingId(job.id);try{await restoreJob(job.id,job.revision??0);if(context.current.current===key)load();}catch(err){if(context.current.current===key)setMutation({key,error:hrCrudErrorKey(err)});}finally{if(context.current.current===key)setDeletingId(null);}};

  if (["forbidden", "unauthenticated"].includes(result.status)) return <HRResourceState status={result.status} retry={load} />;

  return (
    <div className="hr-workspace recruitment-list-page">
      <PageHeader
        title={t("recruitment.jobs.title")}
        subtitle={t("recruitment.jobs.totalShown", {
          total: result.data?.total ?? 0,
          shown: filtered.length,
        })}
        actions={
          canCreate && (
            <button className="btn-add recruitment-action--create" onClick={() => navigate("/app/recruitment/jobs/new")}>
              <Plus size={16} />
              {t("recruitment.jobs.newJob")}
            </button>
          )
        }
      />

      {error && <p role="alert">{t(error)} <button type="button" onClick={load}>{t("hrStates.retry")}</button></p>}
      <div className="filter-bar">
        <select className="input-field" aria-label={t("hrJobArchive.visibility")} value={archived} onChange={e=>setArchived(e.target.value)}><option value="false">{t("hrJobArchive.active")}</option><option value="true">{t("hrArchive.archiveList")}</option></select>
        <HRScopeFilters jobs={jobs} brand={brandFilter} branch={branchFilter} onBrand={value => { setBrandFilter(value); setBranchFilter('all'); }} onBranch={setBranchFilter} />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("recruitment.jobs.searchPlaceholder")}
        />
        <select
          aria-label={t('hrPage.statusFilter')}
          className="input-field"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | JobStatus)}
        >
          <option value="all">{t("recruitment.jobs.allStatuses")}</option>
          <option value="open">{t("recruitment.jobs.open")}</option>
          <option value="closed">{t("recruitment.jobs.closed")}</option>
          <option value="draft">{t("recruitment.jobs.draft")}</option>
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

      {result.status !== "ready" ? <HRResourceState status={result.status} retry={load} /> : <div className="admin-table-container" role="region" aria-label={t('recruitment.jobs.title')} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{t("recruitment.jobs.position")}</th>
              <th>{t("recruitment.jobs.requiredSkills")}</th>
              <th>{t("recruitment.jobs.experience")}</th>
              <th>{t("recruitment.jobs.status")}</th>
              {canManage && (
                <th className="col-actions">
                  {t("recruitment.jobs.actions")}
                </th>
              )}
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  <EmptyState
                    icon={<Briefcase size={28} />}
                    title={
                      filtersActive
                        ? t("recruitment.jobs.noSearchResults")
                        : t("recruitment.jobs.noJobs")
                    }
                    hint={
                      filtersActive
                        ? t("recruitment.jobs.tryDifferentKeyword")
                        : t("recruitment.jobs.jobsWillAppear")
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((job) => (
                <tr
                  key={job.id}
                  className={deletingId === job.id ? "row--removing" : ""}
                >
                  <td
                    className="cell-title"
                  >
                    <button type="button" className="hr-row-title" onClick={() => navigate(`/app/recruitment/jobs/${job.id}`)}>{job.position}</button>
                    <small style={{ display: "block" }}>{job.brandName || brandLabel(job.brandId) || t("hrCatalog.unset")}{job.branchName ? ` · ${job.branchName}` : ""}</small>
                  </td>
                  <td className="cell-muted">
                    <div className="tag-list">
                      {job.requiredSkills.slice(0, 3).map((s) => (
                        <Badge tone="accent" key={s}>
                          {s}
                        </Badge>
                      ))}
                      {(job.requiredSkillsCount ?? job.requiredSkills.length) > 3 && (
                        <Badge tone="neutral">+{(job.requiredSkillsCount ?? job.requiredSkills.length) - 3}</Badge>
                      )}
                    </div>
                  </td>
                  <td>
                    {job.experience}+ {t("recruitment.jobs.years")}
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[job.status]}>
                      {t(`recruitment.jobStatus.${job.status}`)}
                    </Badge>
                  </td>
                  {canManage && (
                    <td>
                      <div className="row-actions">
                        {job.archivedAt && canUpdate && <button type="button" className="icon-btn" title={t("hrArchive.restore")} disabled={deletingId===job.id} onClick={()=>{void handleRestore(job);}}><RotateCcw size={15}/></button>}
                        {canUpdate && !job.archivedAt && <button
                          className="icon-btn icon-btn--edit"
                          title={t("recruitment.jobs.edit")}
                          onClick={() =>
                            navigate(`/app/recruitment/jobs/${job.id}/edit`)
                          }
                        >
                          <Pencil size={15} />
                        </button>}
                        {canDelete && !job.archivedAt && <button
                          className="icon-btn icon-btn--danger"
                          title={t("hrArchive.archive")}
                          disabled={deletingId === job.id}
                          onClick={() => setDeleteTarget(job)}
                        >
                          {deletingId === job.id ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Archive size={15} />
                          )}
                        </button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>}

      <HRPageControls data={result.data} page={result.page} onPage={result.setPage} disabled={result.status !== "ready"} />

      {deleteTarget && (
        <ConfirmDialog
          title={t("hrArchive.archive")}
          confirmLabel={t("hrArchive.archive")}
          message={t("hrJobArchive.confirm", {
            name: deleteTarget.position,
          })}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default JobsList;
