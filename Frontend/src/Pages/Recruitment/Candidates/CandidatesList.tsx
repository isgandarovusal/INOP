import { getErrorMessage } from "../../../Utils/getErrorMessage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import KanbanBoard from "../../../Components/KanbanBoard";
import type { Candidate, CandidateStatus } from "../../../Types/recruitment";
import {
  deleteCandidate,
  exportCandidatesExcel,
  getCandidates,
  updateCandidateStatus,
} from "../../../Services/candidatesService";
import { hasPermission } from "../../../Utils/permissions";
import { useAuth } from "../../../Context/useAuth";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../../../Utils/downloadFile";

const CandidatesList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const canCreate = hasPermission(user, "candidate", "create");
  const canUpdate = hasPermission(user, "candidate", "update");
  const canDelete = hasPermission(user, "candidate", "delete");

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getCandidates();
      return data;
    } catch (err: unknown) {
      const message =
        getErrorMessage(err, t("recruitment.candidates.loadingError"));

      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await fetchCandidates();

      if (!cancelled && data) {
        setCandidates(data);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchCandidates]);

  const handleStatusChange = async (
    candidateId: string,
    newStatus: CandidateStatus,
  ) => {
    if (!canUpdate) return;

    try {
      await updateCandidateStatus(candidateId, newStatus);

      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, status: newStatus }
            : candidate,
        ),
      );

      toast.success(t("recruitment.candidates.statusUpdated"));
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err, t("recruitment.candidates.statusUpdateError")),
      );
    }
  };

  const handleExportExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const blob = await exportCandidatesExcel();

      downloadBlob(blob, "candidates.xlsx");

      toast.success(t("recruitment.candidates.exportSuccess"));
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(
          err,
          t("recruitment.candidates.exportError"),
        ),
      );
    } finally {
      setExporting(false);
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

    try {
      setDeletingId(candidate.id);

      await deleteCandidate(candidate.id);

      setCandidates((prev) =>
        prev.filter((item) => item.id !== candidate.id),
      );

      toast.success(t("recruitment.candidates.deleted"));
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err, t("recruitment.candidates.deleteError")),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return candidates;

    return candidates.filter((candidate) => {
      const nameMatch = candidate.name.toLowerCase().includes(query);
      const roleMatch = candidate.role?.toLowerCase().includes(query);
      const skillMatch = candidate.skills?.some((skill) =>
        skill.toLowerCase().includes(query),
      );

      return nameMatch || roleMatch || skillMatch;
    });
  }, [candidates, searchQuery]);

  return (
    <div className="page-container">
      <PageHeader
        title={t("recruitment.candidates.title")}
        subtitle={t("recruitment.candidates.subtitle")}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
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
                className="btn-primary"
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
        <div
          className="search-box"
          style={{
            position: "relative",
            flex: 1,
            maxWidth: "320px",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6b7280",
            }}
          />

          <input
            type="text"
            placeholder={t(
              "recruitment.candidates.searchPlaceholder",
            )}
            className="input-field"
            style={{ paddingLeft: "36px" }}
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
          />
        </div>

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
              "btn-icon " +
              (viewMode === "grid" ? "active" : "")
            }
            onClick={() => setViewMode("grid")}
            title={t("recruitment.candidates.kanbanMode")}
          >
            <LayoutGrid size={18} />
          </button>

          <button
            className={
              "btn-icon " +
              (viewMode === "list" ? "active" : "")
            }
            onClick={() => setViewMode("list")}
            title={t("recruitment.candidates.listMode")}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px",
          }}
        >
          <Loader2 size={24} className="spin" />
        </div>
      ) : error ? (
        <div
          className="alert alert--danger"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>

          <button
            className="btn-secondary"
            onClick={() => void fetchCandidates()}
          >
            <RefreshCw size={16} />
            {t("recruitment.candidates.retry")}
          </button>
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
        <KanbanBoard
          candidates={filteredCandidates}
          onStatusChange={handleStatusChange}
          canChangeStatus={canUpdate}
        />
      ) : (
        <div className="admin-table-container glass">
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
                      {candidate.experience}{" "}
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
                        className={
                          "status-badge status-" +
                          candidate.status
                        }
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
                          className="btn-icon"
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
    </div>
  );
};

export default CandidatesList;
