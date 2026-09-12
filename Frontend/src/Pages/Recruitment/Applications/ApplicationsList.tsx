import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import {
  getApplications,
  deleteApplication,
  updateApplicationStatus,
} from "../../../Services/applicationsService";
import { getJobs } from "../../../Services/jobsService";
import { getCandidates } from "../../../Services/candidatesService";
import type { Application, ApplicationStatus, Job, Candidate } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/AuthContext";
import { canManageRecruitment } from "../../../Utils/permissions";
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

const ApplicationsList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user ? canManageRecruitment(user.role) : false;

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getApplications(), getJobs(), getCandidates()]).then(
      ([appResult, jobResult, candidateResult]) => {
        setApplications(appResult);
        setJobs(jobResult);
        setCandidates(candidateResult);
        setLoading(false);
      },
    );
  };

  useEffect(load, []);

  const rows = useMemo(() => {
    return applications
      .map((app) => ({
        app,
        job: jobs.find((j) => j.id === app.jobId),
        candidate: candidates.find((c) => c.id === app.candidateId),
      }))
      .filter((r) => r.job && r.candidate)
      .filter((r) => jobFilter === "all" || r.job!.id === jobFilter)
      .filter((r) => statusFilter === "all" || r.app.status === statusFilter)
      .sort((a, b) => b.app.score - a.app.score);
  }, [applications, jobs, candidates, jobFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await deleteApplication(deleteTarget.id);
    setDeleteTarget(null);
    setDeletingId(null);
    load();
  };

  const handleStatusChange = async (appId: string, status: ApplicationStatus) => {
    await updateApplicationStatus(appId, status);
    load();
  };

  return (
    <div>
      <PageHeader
        title={t("recruitment.applications.title")}
        subtitle={t("recruitment.applications.totalShown", { total: applications.length, shown: rows.length })}
      />

      <div className="filter-bar">
        <select className="input-field" style={{ width: 220 }} value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="all">{t("recruitment.applications.allJobs")}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.position}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ width: 170 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ApplicationStatus)}
        >
          <option value="all">{t("recruitment.applications.allStatuses")}</option>
          <option value="applied">{t("recruitment.applications.applied")}</option>
          <option value="screening">{t("recruitment.applications.screening")}</option>
          <option value="shortlisted">{t("recruitment.applications.shortlisted")}</option>
          <option value="rejected">{t("recruitment.applications.rejected")}</option>
          <option value="hired">{t("recruitment.applications.hired")}</option>
        </select>
      </div>

      <div className="admin-table-container glass">
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
                <td colSpan={5}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={<ClipboardList size={28} />}
                    title={t("recruitment.applications.noApplications")}
                    hint={t("recruitment.applications.noApplicationsHint")}
                  />
                </td>
              </tr>
            ) : (
              rows.map(({ app, job, candidate }) => (
                <tr key={app.id} className={deletingId === app.id ? "row--removing" : ""}>
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => navigate(`/app/recruitment/candidates/${candidate!.id}`)}
                  >
                    {candidate!.name}
                  </td>
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => navigate(`/app/recruitment/jobs/${job!.id}`)}
                  >
                    {job!.position}
                  </td>
                  <td>{app.score}</td>
                  <td>
                    {canManage ? (
                      <select
                        className="input-field"
                        style={{ width: 150, padding: "6px 10px" }}
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app.id, e.target.value as ApplicationStatus)
                        }
                      >
                        <option value="applied">{t("recruitment.applications.applied")}</option>
                        <option value="screening">{t("recruitment.applications.screening")}</option>
                        <option value="shortlisted">{t("recruitment.applications.shortlisted")}</option>
                        <option value="rejected">{t("recruitment.applications.rejected")}</option>
                        <option value="hired">{t("recruitment.applications.hired")}</option>
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
      </div>

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
