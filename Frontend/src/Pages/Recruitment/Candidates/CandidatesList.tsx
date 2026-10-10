import { getErrorMessage } from "../../../Utils/getErrorMessage";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import type { Candidate, CandidateStatus } from "../../../Types/recruitment";
import {
  deleteCandidate,
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
    case "new":
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const search = useDebouncedSearch(searchQuery);
  const result = useHRPage("candidate", { q: search }, getCandidatePage);
  const [deleteBusy, setDeleteBusy] = useState<{ key: string; id: string | null }>({ key: "", id: null });
  const context = useHRActionContext(JSON.stringify([search, result.page]));
  const deletingId = deleteBusy.key === context.key ? deleteBusy.id : null;
  const setDeletingId = (id: string | null) => setDeleteBusy({ key: context.key, id });
  const candidates = useMemo(() => result.data?.items ?? [], [result.data]);
  const loading = result.status === "loading";
  const [mutation, setMutation] = useState({ key: "", error: "" });
  const error = mutation.key === context.key ? mutation.error : "";
  const [exportBusy, setExportBusy] = useState<{ key: string; busy: boolean }>({ key: "", busy: false });
  const exporting = exportBusy.key === context.key && exportBusy.busy;
  const setExporting = (busy: boolean) => setExportBusy({ key: context.key, busy });

  const canCreate = hasPermission(user, "candidate", "create");
  const canDelete = hasPermission(user, "candidate", "delete");

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
      setMutation({ key, error: getErrorMessage(err, t("somethingWentWrong")) });
      toast.error(
        getErrorMessage(
          err,
          t("recruitment.candidates.exportError"),
        ),
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

    const confirmed = window.confirm(
      `${candidate.name} — ${t("recruitment.candidates.deleteConfirm")}`,
    );

    if (!confirmed) return;
    const key = context.key;

    try {
      setDeletingId(candidate.id);

      await deleteCandidate(candidate.id);

      if (context.current.current !== key) return;
      fetchCandidates();

      toast.success(t("recruitment.candidates.deleted"));
    } catch (err: unknown) {
      if (context.current.current !== key) return;
      setMutation({ key, error: getErrorMessage(err, t("somethingWentWrong")) });
      toast.error(
        getErrorMessage(err, t("recruitment.candidates.deleteError")),
      );
    } finally {
      if (context.current.current === key) setDeletingId(null);
    }
  };

  const filteredCandidates = candidates;

  if (["forbidden", "unauthenticated"].includes(result.status)) return <HRResourceState status={result.status} retry={fetchCandidates} />;

  return (
    <div className="page-container">
      <PageHeader
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
      />

      <div
        className="table-toolbar"
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          justifyContent: "space-between",
        }}
      >
        <>{hasPermission(user, "application", "read") && <button type="button" onClick={() => navigate("/app/recruitment/applications?view=board")}>{t("hrMatch.board")}</button>}</>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t(
            "recruitment.candidates.searchPlaceholder",
          )}
        />

        <div
          className="view-switcher"
          style={{
            display: "flex",
            gap: "4px",
            background: "var(--bg-card)",
            padding: "4px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <button
            className={
              "view-switcher__button " +
              (viewMode === "grid" ? "active" : "")
            }
            onClick={() => setViewMode("grid")}
            title={t("hrWorkflow.candidateCards")}
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
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {error && <p role="alert">{error} <button type="button" onClick={fetchCandidates}>{t("hrStates.retry")}</button></p>}
      {result.status !== "ready" ? <HRResourceState status={result.status} retry={fetchCandidates} /> : loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px",
          }}
        >
          <Loader2 size={24} className="spin" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 24px",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <Search size={32} />
          <h3 style={{ margin: "12px 0 6px" }}>
            {searchQuery
              ? t("recruitment.candidates.noSearchResults")
              : t("recruitment.candidates.empty")}
          </h3>

          <p style={{ margin: 0 }}>
            {searchQuery
              ? t("recruitment.candidates.noSearchResultsDescription")
              : t(
                  "recruitment.candidates.emptyDescription",
                )}
          </p>

          {canCreate && !searchQuery && (
            <button
              className="btn-primary"
              style={{ marginTop: "16px" }}
              onClick={() =>
                navigate("/app/recruitment/candidates/new")
              }
            >
              <Plus size={16} />
              {t("recruitment.candidates.newCandidate")}
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="hr-candidate-grid">{filteredCandidates.map(c => <article key={c.id} className="recruitment-kanban__card">
          <button type="button" onClick={() => navigate(`/app/recruitment/candidates/${c.id}`)}>{c.name}</button><p>{c.role}</p>
          <p>{t('hrWorkflow.profileStatus')}: {t(`recruitment.candidateStatus.${c.status}`)}</p>
        </article>)}</div>
      ) : (
        <div className="admin-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("recruitment.candidates.fullName")}</th>
                <th>{t("recruitment.candidates.position")}</th>
                <th>{t("recruitment.candidates.experience")}</th>
                <th>{t("recruitment.candidates.skills")}</th>
                <th>{t("recruitment.candidates.status")}</th>
                {canDelete && (
                  <th>{t("recruitment.candidates.actions")}</th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredCandidates.map((candidate) => {
                return (
                  <tr
                    key={candidate.id}
                    onClick={() =>
                      navigate(
                        "/app/recruitment/candidates/" +
                          candidate.id,
                      )
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 500 }}>
                      {candidate.name}
                    </td>

                    <td>
                      {candidate.role ||
                        t("recruitment.candidates.notProvided")}
                    </td>

                    <td>
                      {candidate.experience ?? t("cvReview.unknown")}{" "}
                      {t("recruitment.candidates.years")}
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
                      <span
                        className={`badge badge--${getCandidateStatusBadgeVariant(
                          candidate.status,
                        )}`}
                      >
                        {t(
                          `recruitment.candidateStatus.${candidate.status}`,
                        )}
                      </span>
                    </td>

                    {canDelete && (
                      <td>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title={t(
                            "recruitment.candidates.delete",
                          )}
                          disabled={deletingId === candidate.id}
                          onClick={(event) =>
                            void handleDelete(event, candidate)
                          }
                        >
                          {deletingId === candidate.id ? (
                            <Loader2
                              size={16}
                              className="spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <HRPageControls data={result.data} page={result.page} onPage={result.setPage} disabled={result.status !== "ready"} />
    </div>
  );
};

export default CandidatesList;
