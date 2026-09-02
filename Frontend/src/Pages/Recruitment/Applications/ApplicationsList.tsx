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

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  applied: "info",
  screening: "warning",
  shortlisted: "accent",
  rejected: "danger",
  hired: "success",
};

const ApplicationsList: React.FC = () => {
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
        title="Applications"
        subtitle={`${applications.length} total · ${rows.length} shown`}
      />

      <div className="filter-bar">
        <select className="input-field" style={{ width: 220 }} value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="all">All jobs</option>
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
          <option value="all">All statuses</option>
          <option value="applied">Applied</option>
          <option value="screening">Screening</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Job</th>
              <th>Score</th>
              <th>Status</th>
              {canManage && <th className="col-actions">Actions</th>}
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
                    title="No applications yet"
                    hint="Link candidates to jobs from a job's detail page."
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
                        <option value="applied">Applied</option>
                        <option value="screening">Screening</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                    ) : (
                      <Badge tone={STATUS_TONE[app.status]}>{app.status}</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Delete"
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
          title="Remove this application?"
          message="This link between the candidate and job will be removed."
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ApplicationsList;
