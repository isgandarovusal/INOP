import Badge from '../../../Components/Badge';
import HRConfirmDialog from '../../../Components/HRConfirmDialog';
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UsersRound,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Archive, RotateCcw, Eye,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import EmptyState from "../../../Components/EmptyState";
import type { Candidate, CandidateStatus } from "../../../Types/recruitment";
import {
  deleteCandidate, restoreCandidate,
  exportCandidatesExcel,
} from "../../../Services/candidatesService";
import { hasPermission } from "../../../Utils/permissions";
import { useAuth } from "../../../Context/useAuth";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../../../Utils/downloadFile";

const getCandidateStatusBadgeVariant = (
  status: CandidateStatus,
): "neutral" | "info" | "success" | "warning" | "danger" | "accent" => {
  switch (status) {
    case "new":
    case "applied":
    case "screening":
      return "info";
    case "shortlisted":
    case "offer":
      return "accent";
    case "interview":
      return "warning";
    case "hired":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
};

import HRResourceState from "../../../Components/HRResourceState";
import { useHRPage, useDebouncedSearch } from "../../../Hooks/useHRPage";
import { useHRActionContext } from "../../../Hooks/useHRActionContext";
import HRPageControls from "../../../Components/HRPageControls";
import { getCandidatePage } from "../../../Services/hrPageService";

const CandidatesList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const search = useDebouncedSearch(searchQuery);
  const [archived, setArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("all");
  const result = useHRPage("candidate", { q: search, archived: String(archived), status: statusFilter === "all" ? undefined : statusFilter }, getCandidatePage);
  const [confirmation, setConfirmation] = useState<{key:string;candidate:Candidate}|null>(null);
  const [deleteBusy, setDeleteBusy] = useState<{ key: string; id: string | null }>({ key: "", id: null });
  const context = useHRActionContext(JSON.stringify([search, archived, statusFilter, result.page]));
  const deletingId = deleteBusy.key === context.key ? deleteBusy.id : null;
  const setDeletingId = (id: string | null) => setDeleteBusy({ key: context.key, id });
  const candidates = useMemo(() => result.data?.items ?? [], [result.data]);
  const [mutation, setMutation] = useState({ key: "", error: "" });
  const error = mutation.key === context.key ? mutation.error : "";
  const [exportBusy, setExportBusy] = useState<{ key: string; busy: boolean }>({ key: "", busy: false });
  const exporting = exportBusy.key === context.key && exportBusy.busy;
  const setExporting = (busy: boolean) => setExportBusy({ key: context.key, busy });

  const canRead = hasPermission(user, "candidate", "read");
  const canCreate = hasPermission(user, "candidate", "create");
  const canRestore = hasPermission(user, "candidate", "update");
  const canDelete = hasPermission(user, "candidate", "delete");
  const canAct = archived ? canRestore : canDelete;

  const fetchCandidates = result.reload;

  const handleExportExcel = async () => {
    if (exporting) return;
    const key = context.key;

    try {
      setExporting(true);

      const blob = await exportCandidatesExcel();

      if (context.current.current !== key) return;
      downloadBlob(blob, "candidates.xlsx");

      toast.success(t("recruitment.candidates.exportSuccess"));
    } catch (err: unknown) {
      if (context.current.current !== key) return;
      setMutation({ key, error: hrCrudErrorKey(err) });
      toast.error(
        t(hrCrudErrorKey(err)),
      );
    } finally {
      if (context.current.current === key) setExporting(false);
    }
  };

  const handleDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    candidate: Candidate,
  ) => {
    event.stopPropagation();

    if (!canDelete || deletingId) return;

    setConfirmation({key:context.key,candidate});
  };
  const confirmArchive = async () => {
    if (!confirmation || confirmation.key!==context.key || !canDelete) return;
    const candidate=confirmation.candidate;
    const key = context.key;

    try {
      setDeletingId(candidate.id);

      await deleteCandidate(candidate.id, undefined, candidate.revision);

      if (context.current.current !== key) return;
      setConfirmation(null);fetchCandidates();

      toast.success(t("hrArchive.archived"));
    } catch (err: unknown) {
      if (context.current.current !== key) return;
      setMutation({ key, error: hrCrudErrorKey(err) });
      toast.error(
        t(hrCrudErrorKey(err)),
      );
    } finally {
      if (context.current.current === key) setDeletingId(null);
    }
  };

  const handleRestore = async (event: React.MouseEvent<HTMLButtonElement>, candidate: Candidate) => {
    event.stopPropagation();if(!canRestore||deletingId)return;const key=context.key;setDeletingId(candidate.id);
    try{await restoreCandidate(candidate.id,candidate.revision??0);if(context.current.current===key){fetchCandidates();toast.success(t('hrArchive.restored'));}}
    catch(failure){if(context.current.current===key)setMutation({key,error:hrCrudErrorKey(failure)});}
    finally{if(context.current.current===key)setDeletingId(null);}
  };
  const candidateActions = (candidate: Candidate) => (
    <div className="hr-candidate-actions">
      {canRead && <button type="button" className="icon-btn" aria-label={`${t('common.actions.viewDetails')} ${candidate.name}`} title={t('common.actions.viewDetails')} onClick={event => {
        event.stopPropagation(); navigate(`/app/recruitment/candidates/${candidate.id}`);
      }}><Eye size={16} /></button>}
      {canAct && <button type="button" className={archived ? "icon-btn" : "icon-btn icon-btn--danger"} aria-label={`${t(archived ? 'hrArchive.restore' : 'hrArchive.archive')} ${candidate.name}`}
        title={t(archived ? 'hrArchive.restore' : 'hrArchive.archive')} disabled={deletingId === candidate.id}
        onClick={event => void (archived ? handleRestore(event, candidate) : handleDelete(event, candidate))}>
        {deletingId === candidate.id ? <Loader2 size={16} className="spin" /> : archived ? <RotateCcw size={16} /> : <Archive size={16} />}
      </button>}
    </div>
  );
  const filteredCandidates = candidates;

  if (["forbidden", "unauthenticated"].includes(result.status)) return <HRResourceState status={result.status} retry={fetchCandidates} />;

  return (
    <div className="hr-workspace recruitment-list-page hr-candidates-page">
      {confirmation?.key===context.key&&<HRConfirmDialog title={t("hrArchive.archive")} message={t("hrArchive.confirm",{name:confirmation.candidate.name})} confirmLabel={t("hrArchive.archive")} loading={Boolean(deletingId)} onConfirm={()=>{void confirmArchive();}} onCancel={()=>setConfirmation(null)}/>}
      <div className="hr-candidate-hero"><PageHeader icon={<UsersRound size={26} />}
        title={t("recruitment.candidates.title")}
        subtitle={t("recruitment.candidates.subtitle")}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary recruitment-action--export"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              {exporting
                ? t("recruitment.candidates.exporting")
                : t("recruitment.candidates.exportExcel")}
            </button>

            {canCreate && (
              <button
                type="button"
                className="btn-primary recruitment-action--create"
                onClick={() =>
                  navigate("/app/recruitment/candidates/new")
                }
              >
                <Plus size={16} />
                {t("recruitment.candidates.newCandidate")}
              </button>
            )}
          </>
        }
      /></div>
      <div className="hr-candidate-metrics" aria-label={t('hrCandidateUI.metrics')}>
        <article><UsersRound size={22} aria-hidden="true" /><div><p>{t('hrCandidateUI.matchingTotal')}</p><strong data-candidate-total>{result.status === 'ready' ? result.data?.total.toLocaleString(i18n.language) : '—'}</strong><small>{t(archived ? 'hrArchive.archiveList' : 'hrArchive.active')}</small></div></article>
        <article><List size={22} aria-hidden="true" /><div><p>{t('hrCandidateUI.pageShown')}</p><strong data-candidate-shown>{result.status === 'ready' ? candidates.length.toLocaleString(i18n.language) : '—'}</strong><small>{t('hrCandidateUI.page', { page: result.page })}</small></div></article>
      </div>

      <div className="filter-bar hr-primary-controls">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t("recruitment.candidates.searchPlaceholder")} />
        <select className="input-field" aria-label={t("hrArchive.visibility")} value={String(archived)} onChange={e=>setArchived(e.target.value==='true')}><option value="false">{t("hrArchive.active")}</option><option value="true">{t("hrArchive.archiveList")}</option></select>
        <select className="input-field" aria-label={t("hrPage.statusFilter")} value={statusFilter} onChange={e=>setStatusFilter(e.target.value as CandidateStatus | "all")}><option value="all">{t("recruitment.applications.allStatuses")}</option>{["new","applied","screening","shortlisted","interview","offer","hired","rejected"].map(value=><option key={value} value={value}>{t(`recruitment.candidateStatus.${value}`)}</option>)}</select>
        {import.meta.env.VITE_HR_DURABLE_INTAKE_ENABLED==='true'&&<button className="btn-secondary" type="button" onClick={()=>navigate("/app/recruitment/cv-intake")}>{t("hrIntake.queue")}</button>}
        {hasPermission(user, "application", "read") && <button className="btn-secondary" type="button" onClick={() => navigate("/app/recruitment/applications?view=board")}>{t("hrMatch.board")}</button>}

        {(searchQuery || archived || statusFilter !== 'all') && <button type="button" className="btn-secondary" onClick={() => { setSearchQuery(''); setArchived(false); setStatusFilter('all'); }}>{t('common.actions.clear')}</button>}
        <div className="view-switcher" role="group" aria-label={t("recruitment.candidates.title")}>
          <button
            className={
              "view-switcher__button " +
              (viewMode === "grid" ? "active" : "")
            }
            onClick={() => setViewMode("grid")}
            title={t("hrWorkflow.candidateCards")}
            aria-label={t("hrWorkflow.candidateCards")}
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid size={18} />
          </button>

          <button
            className={
              "view-switcher__button " +
              (viewMode === "list" ? "active" : "")
            }
            onClick={() => setViewMode("list")}
            title={t("recruitment.candidates.listMode")}
            aria-label={t("recruitment.candidates.listMode")}
            aria-pressed={viewMode === 'list'}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {error && <p role="alert">{t(error)} <button type="button" onClick={fetchCandidates}>{t("hrStates.retry")}</button></p>}
      {result.status !== "ready" ? <HRResourceState status={result.status} retry={fetchCandidates} /> : filteredCandidates.length === 0 ? (
        <EmptyState icon={<Search size={28} />} title={t(searchQuery ? "recruitment.candidates.noSearchResults" : "recruitment.candidates.empty")} hint={t(searchQuery ? "recruitment.candidates.noSearchResultsDescription" : "recruitment.candidates.emptyDescription")} />
      ) : viewMode === "grid" ? (
        <div className="hr-candidate-grid">{filteredCandidates.map(c => <article key={c.id} className="recruitment-kanban__card">
          <div className="hr-person-card-heading"><span className="hr-person-avatar" aria-hidden="true">{c.name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toLocaleUpperCase()}</span><div><button className="hr-row-title" type="button" disabled={!canRead} onClick={() => navigate(`/app/recruitment/candidates/${c.id}`)}>{c.name}</button><p>{c.role || t('cvReview.unknown')}</p></div></div>
          <div className="hr-person-card-contact">{c.email && <span>{c.email}</span>}{c.phone && <span>{c.phone}</span>}</div><div className="tag-list">{c.skills.slice(0,3).map(s=><Badge key={s} tone="neutral">{s}</Badge>)}</div>
          <p className="hr-person-card-status"><Badge tone={getCandidateStatusBadgeVariant(c.status)}>{t(`recruitment.candidateStatus.${c.status}`)}</Badge></p>
          {candidateActions(c)}
        </article>)}</div>
      ) : (
        <div className="admin-table-container" role="region" aria-label={t('recruitment.candidates.title')} tabIndex={0}>
          <table className="data-table hr-candidates-table">
            <colgroup><col className="hr-candidate-col-person" /><col className="hr-candidate-col-role" /><col className="hr-candidate-col-experience" /><col className="hr-candidate-col-skills" /><col className="hr-candidate-col-status" />{(canRead || canAct) && <col className="hr-candidate-col-actions" />}</colgroup>
            <thead>
              <tr>
                <th>{t("recruitment.candidates.fullName")}</th>
                <th>{t("recruitment.candidates.position")}</th>
                <th>{t("recruitment.candidates.experience")}</th>
                <th>{t("recruitment.candidates.skills")}</th>
                <th>{t("recruitment.candidates.status")}</th>
                {(canRead || canAct) && (
                  <th className="hr-candidate-actions-cell">{t("recruitment.candidates.actions")}</th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredCandidates.map((candidate) => {
                return (
                  <tr
                    key={candidate.id}
                    onClick={() =>
                      canRead && navigate(
                        "/app/recruitment/candidates/" +
                          candidate.id,
                      )
                    }
                    style={{ cursor: canRead ? "pointer" : "default" }}
                  >
                    <td><div className="hr-person-cell"><span className="hr-person-avatar" aria-hidden="true">{candidate.name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join("").toLocaleUpperCase()}</span><div><button className="hr-row-title" type="button" disabled={!canRead} onClick={event=>{event.stopPropagation();navigate("/app/recruitment/candidates/"+candidate.id);}}>{candidate.name}</button>{candidate.email && <small>{candidate.email}</small>}</div></div></td>

                    <td>
                      {candidate.role && candidate.role.length > 80 ? <details className="hr-cell-disclosure" onClick={event => event.stopPropagation()}><summary><span>{candidate.role}</span></summary><p>{candidate.role}</p></details> : candidate.role || t("recruitment.candidates.notProvided")}
                    </td>

                    <td>
                      {candidate.experience == null ? t("cvReview.unknown") : `${candidate.experience} ${t("recruitment.candidates.years")}`}
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        {candidate.skills?.slice(0, 3).map(
                          (skill, index) => (
                            <span
                              key={`${candidate.id}-${index}`}
                              className="tag-chip"
                            >
                              {skill}
                            </span>
                          ),
                        )}
                      </div>
                    </td>

                    <td>
                      <Badge tone={getCandidateStatusBadgeVariant(candidate.status)}>{t(`recruitment.candidateStatus.${candidate.status}`)}</Badge>
                    </td>

                    {(canRead || canAct) && (
                      <td className="hr-candidate-actions-cell">{candidateActions(candidate)}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <HRPageControls data={result.data} page={result.page} onPage={result.setPage} onRefresh={result.reload} refreshing={result.refreshing} disabled={result.status !== "ready"} />
    </div>
  );
};

export default CandidatesList;
