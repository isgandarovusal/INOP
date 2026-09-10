import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus, Search, Loader2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import KanbanBoard from "../../../Components/KanbanBoard";
import type { Candidate } from "../../../Components/KanbanBoard";
import MatchScoreBadge from "../../../Components/MatchScoreBadge";
import { calculateMatchScore } from "../../../Services/aiMatchService";
import { getCandidates, updateCandidateStatus } from "../../../Services/candidatesService";
import toast from "react-hot-toast";

const targetRequirements = {
  skills: ["React", "TypeScript", "Node.js", "Tailwind"],
  experience: 2,
};

const CandidatesList: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await getCandidates();
      setCandidates(data as Candidate[]);
    } catch (err) {
      toast.error("Namizədlər yüklənərkən xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await updateCandidateStatus(candidateId, newStatus);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus as Candidate["status"] } : c))
      );
      toast.success("Status yeniləndi");
    } catch (err) {
      toast.error("Status yenilənərkən xəta baş verdi.");
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(query);
    const roleMatch = c.role.toLowerCase().includes(query);
    const skillMatch = c.skills?.some((s) => s.toLowerCase().includes(query));
    return nameMatch || roleMatch || skillMatch;
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Namizədlər"
        subtitle="Bütün müraciət edən namizədlərin siyahısı və status idarəetməsi"
        action={
          <button
            className="btn-primary"
            onClick={() => navigate("/app/recruitment/candidates/new")}
          >
            <Plus size={16} /> Yeni Namizəd
          </button>
        }
      />

      <div className="table-toolbar" style={{ marginBottom: "20px", display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <div className="search-box" style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input
            type="text"
            placeholder="Axtarış (ad, vəzifə, bacarıq)…"
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
            title="Kanban Rejimi"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={"btn-icon " + (viewMode === "list" ? "active" : "")}
            onClick={() => setViewMode("list")}
            title="Siyahı Rejimi"
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
                <th>Ad Soyad</th>
                <th>Vəzifə</th>
                <th>Təcrübə</th>
                <th>Bacarıqlar</th>
                <th>Match Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => {
                const score = calculateMatchScore(candidate, targetRequirements);
                return (
                  <tr
                    key={candidate.id}
                    onClick={() => navigate("/app/recruitment/candidates/" + candidate.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 500 }}>{candidate.name}</td>
                    <td>{candidate.role}</td>
                    <td>{candidate.experience} il</td>
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
