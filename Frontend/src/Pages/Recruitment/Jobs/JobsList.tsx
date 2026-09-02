import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import { getJobs, deleteJob } from "../../../Services/jobsService";
import type { Job, JobStatus } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/AuthContext";
import { canManageRecruitment } from "../../../Utils/permissions";

const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  open: "success",
  closed: "neutral",
  draft: "warning",
};

const JobsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user ? canManageRecruitment(user.role) : false;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    return jobs
      .filter((j) => statusFilter === "all" || j.status === statusFilter)
      .filter((j) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          j.position.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, query, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await deleteJob(deleteTarget.id);
    setDeleteTarget(null);
    setDeletingId(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} total · ${filtered.length} shown`}
        actions={
          canManage && (
            <button className="btn-add" onClick={() => navigate("/app/recruitment/jobs/new")}>
              <Plus size={16} />
              New job
            </button>
          )
        }
      />

      <div className="filter-bar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search position or skill…" />
        <select
          className="input-field"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | JobStatus)}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Required skills</th>
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
                    icon={<Briefcase size={28} />}
                    title={query ? "No jobs match your search" : "No jobs yet"}
                    hint={query ? "Try a different keyword." : "Jobs you create will show up here."}
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
                    className="cell-title cell-title--clickable"
                    onClick={() => navigate(`/app/recruitment/jobs/${job.id}`)}
                  >
                    {job.position}
                  </td>
                  <td className="cell-muted">
                    <div className="tag-list">
                      {job.requiredSkills.slice(0, 3).map((s) => (
                        <Badge tone="accent" key={s}>
                          {s}
                        </Badge>
                      ))}
                      {job.requiredSkills.length > 3 && (
                        <Badge tone="neutral">+{job.requiredSkills.length - 3}</Badge>
                      )}
                    </div>
                  </td>
                  <td>{job.experience}+ yrs</td>
                  <td>
                    <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canManage && (
                        <>
                          <button
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/app/recruitment/jobs/${job.id}/edit`)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            title="Delete"
                            disabled={deletingId === job.id}
                            onClick={() => setDeleteTarget(job)}
                          >
                            {deletingId === job.id ? (
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
          title="Delete this job?"
          message={`"${deleteTarget.position}" will be permanently removed. This can't be undone.`}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default JobsList;
