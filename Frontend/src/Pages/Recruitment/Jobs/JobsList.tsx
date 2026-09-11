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
import { useTranslation } from "react-i18next";

const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  open: "success",
  closed: "neutral",
  draft: "warning",
};

const JobsList: React.FC = () => {
  const { t } = useTranslation();
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
        title={t("recruitment.jobs.title")}
        subtitle={t("recruitment.jobs.totalShown", {
          total: jobs.length,
          shown: filtered.length,
        })}
        actions={
          canManage && (
            <button className="btn-add" onClick={() => navigate("/app/recruitment/jobs/new")}>
              <Plus size={16} />
              {t("recruitment.jobs.newJob")}
            </button>
          )
        }
      />

      <div className="filter-bar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("recruitment.jobs.searchPlaceholder")}
        />
        <select
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
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>{t("recruitment.jobs.position")}</th>
              <th>{t("recruitment.jobs.requiredSkills")}</th>
              <th>{t("recruitment.jobs.experience")}</th>
              <th>{t("recruitment.jobs.status")}</th>
              <th className="col-actions">{t("recruitment.jobs.actions")}</th>
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
                    title={
                      query
                        ? t("recruitment.jobs.noSearchResults")
                        : t("recruitment.jobs.noJobs")
                    }
                    hint={
                      query
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
                  <td>
                    {job.experience}+ {t("recruitment.jobs.years")}
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[job.status]}>
                      {t(`recruitment.jobStatus.${job.status}`)}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canManage && (
                        <>
                          <button
                            className="icon-btn icon-btn--edit"
                            title={t("recruitment.jobs.edit")}
                            onClick={() =>
                              navigate(`/app/recruitment/jobs/${job.id}/edit`)
                            }
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            title={t("recruitment.jobs.delete")}
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
          title={t("recruitment.jobs.deleteTitle")}
          message={t("recruitment.jobs.deleteMessage", {
            position: deleteTarget.position,
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
