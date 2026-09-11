import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus, Search, Loader2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import KanbanBoard from "../../../Components/KanbanBoard";
import type { Candidate, CandidateStatus } from "../../../Types/recruitment";
import MatchScoreBadge from "../../../Components/MatchScoreBadge";
import { calculateMatchScore } from "../../../Services/aiMatchService";
import { getCandidates, updateCandidateStatus } from "../../../Services/candidatesService";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const targetRequirements = {
  skills: ["React", "TypeScript", "Node.js", "Tailwind"],
  experience: 2,
};

const CandidatesList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await getCandidates();
      setCandidates(data);
    } catch (err) {
      toast.error(t("recruitment.candidates.loadingError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    try {
      await updateCandidateStatus(candidateId, newStatus);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus as Candidate["status"] } : c))
      );
      toast.success(t("recruitment.candidates.statusUpdated"));
    } catch (err) {
      toast.error(t("recruitment.candidates.statusUpdateError"));
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(query);
    const skillMatch = c.skills?.some((s) => s.toLowerCase().includes(query));
    return nameMatch || skillMatch;
  });

  return (
    <div className="page-container">
      <PageHeader
        title={t("recruitment.candidates.title")}
        subtitle={t("recruitment.candidates.subtitle")}
        actions={
          <button
            className="btn-primary"
            onClick={() => navigate("/app/recruitment/candidates/new")}
          >
            <Plus size={16} /> {t("recruitment.candidates.newCandidate")}
          </button>
        }
      />

      <div className="table-toolbar" style={{ marginBottom: "20px", display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <div className="search-box" style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input
            type="text"
            placeholder={t("recruitment.candidates.searchPlaceholder")}
            className="input-field"
            style={{ paddingLeft: "36px" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="view-switcher" style={{ display: "flex", gap: "4px", background: "var(--bg-card)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <button
            className={"btn-icon " + (viewMode === "grid" ? "active" : "")}
            onClick={() => setViewMode("grid")}
            title={t("recruitment.candidates.kanbanMode")}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={"btn-icon " + (viewMode === "list" ? "active" : "")}
            onClick={() => setViewMode("list")}
            title={t("recruitment.candidates.listMode")}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : viewMode === "grid" ? (
        <KanbanBoard
          candidates={filteredCandidates}
          onStatusChange={handleStatusChange}
          targetRequirements={targetRequirements}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("recruitment.candidates.fullName")}</th>
                <th>{t("recruitment.candidates.position")}</th>
                <th>{t("recruitment.candidates.experience")}</th>
                <th>{t("recruitment.candidates.skills")}</th>
                <th>{t("recruitment.candidates.matchScore")}</th>
                <th>{t("recruitment.candidates.status")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => {
                const score = calculateMatchScore(candidate, targetRequirements).score;
                return (
                  <tr
                    key={candidate.id}
                    onClick={() => navigate("/app/recruitment/candidates/" + candidate.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 500 }}>{candidate.name}</td>
                    <td>{candidate.education}</td>
                    <td>{candidate.experience} {t("recruitment.candidates.years")}</td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {candidate.skills?.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="tag-chip">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <MatchScoreBadge score={score} />
                    </td>
                    <td>
                      <span className={"status-badge status-" + candidate.status}>
                        {candidate.status}
                      </span>
                    </td>
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
