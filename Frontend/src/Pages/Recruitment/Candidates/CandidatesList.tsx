import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Trash2, UserSquare2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import { getCandidates, deleteCandidate } from "../../../Services/candidatesService";
import type { Candidate, CandidateStatus } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/AuthContext";
import { canManageRecruitment } from "../../../Utils/permissions";

const STATUS_TONE: Record<CandidateStatus, BadgeTone> = {
  new: "info",
  screening: "warning",
  shortlisted: "accent",
  rejected: "danger",
  hired: "success",
};

const CandidatesList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user ? canManageRecruitment(user.role) : false;

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CandidateStatus>("all");
  const [minExperience, setMinExperience] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getCandidates()
      .then(setCandidates)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const minExp = minExperience ? Number(minExperience) : 0;
    return candidates
      .filter((c) => statusFilter === "all" || c.status === statusFilter)
      .filter((c) => c.experience >= minExp)
      .filter((c) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [candidates, query, statusFilter, minExperience]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await deleteCandidate(deleteTarget.id);
    setDeleteTarget(null);
    setDeletingId(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle={`${candidates.length} total · ${filtered.length} shown`}
        actions={
          canManage && (
            <button
              className="btn-add"
              onClick={() => navigate("/app/recruitment/candidates/new")}
            >
              <Plus size={16} />
              Add candidate
            </button>
          )
        }
      />

      <div className="filter-bar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or skill…" />
        <select
          className="input-field"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | CandidateStatus)}
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="screening">Screening</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
        <input
          type="number"
          min={0}
          className="input-field"
          style={{ width: 150 }}
          placeholder="Min experience"
          value={minExperience}
          onChange={(e) => setMinExperience(e.target.value)}
        />
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Skills</th>
              <th>Experience</th>
              <th>Status</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={<UserSquare2 size={28} />}
                    title={query ? "No candidates match your search" : "No candidates yet"}
                    hint={query ? "Try a different keyword." : "Candidates you add will show up here."}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((candidate) => (
                <tr
                  key={candidate.id}
                  className={deletingId === candidate.id ? "row--removing" : ""}
                >
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => navigate(`/app/recruitment/candidates/${candidate.id}`)}
                  >
                    {candidate.name}
                  </td>
                  <td className="cell-muted">
                    <div className="tag-list">
                      {candidate.skills.slice(0, 3).map((s) => (
                        <Badge tone="accent" key={s}>
                          {s}
                        </Badge>
                      ))}
                      {candidate.skills.length > 3 && (
                        <Badge tone="neutral">+{candidate.skills.length - 3}</Badge>
                      )}
                    </div>
                  </td>
                  <td>{candidate.experience} yrs</td>
                  <td>
                    <Badge tone={STATUS_TONE[candidate.status]}>{candidate.status}</Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canManage && (
                        <>
                          <button
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() =>
                              navigate(`/app/recruitment/candidates/${candidate.id}/edit`)
                            }
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            title="Delete"
                            disabled={deletingId === candidate.id}
                            onClick={() => setDeleteTarget(candidate)}
                          >
                            {deletingId === candidate.id ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this candidate?"
          message={`"${deleteTarget.name}" will be permanently removed. This can't be undone.`}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default CandidatesList;
