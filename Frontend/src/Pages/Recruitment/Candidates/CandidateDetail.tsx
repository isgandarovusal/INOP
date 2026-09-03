import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, FileWarning, Loader2, Pencil, UserSquare2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import Badge, { type BadgeTone } from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getCandidateById, updateCandidate } from "../../../Services/candidatesService";
import { getApplications } from "../../../Services/applicationsService";
import { getJobs } from "../../../Services/jobsService";
import type { Candidate, CandidateStatus, Application, Job } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/AuthContext";
import { canManageRecruitment } from "../../../Utils/permissions";

const STATUS_TONE: Record<CandidateStatus, BadgeTone> = {
  new: "info",
  screening: "warning",
  shortlisted: "accent",
  rejected: "danger",
  hired: "success",
};

const CandidateDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user ? canManageRecruitment(user.role) : false;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([getCandidateById(id), getApplications(), getJobs()]).then(
      ([candidateResult, appResult, jobResult]) => {
        setCandidate(candidateResult ?? null);
        setApplications(appResult.filter((a) => a.candidateId === id));
        setJobs(jobResult);
        setLoading(false);
      },
    );
  };

  useEffect(load, [id]);

  const applicationRows = useMemo(
    () =>
      applications
        .map((app) => ({ app, job: jobs.find((j) => j.id === app.jobId) }))
        .filter((r) => r.job),
    [applications, jobs],
  );

  const handleStatusChange = async (status: CandidateStatus) => {
    if (!id) return;
    setStatusSaving(true);
    const updated = await updateCandidate(id, { status });
    if (updated) setCandidate(updated);
    setStatusSaving(false);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <EmptyState
        icon={<UserSquare2 size={28} />}
        title="Candidate not found"
        hint="It may have been deleted."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={candidate.name}
        subtitle={candidate.email}
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => navigate("/app/recruitment/candidates")}
            >
              <ArrowLeft size={15} /> Back
            </button>
            {canManage && (
              <button
                className="btn-add"
                onClick={() => navigate(`/app/recruitment/candidates/${candidate.id}/edit`)}
              >
                <Pencil size={15} /> Edit
              </button>
            )}
          </>
        }
      />

      <div className="detail-grid">
        <div>
          <div className="detail-card">
            <h3>Profile</h3>
            <dl>
              <div className="detail-row">
                <dt>Phone</dt>
                <dd>{candidate.phone || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Education</dt>
                <dd>{candidate.education || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Experience</dt>
                <dd>{candidate.experience} years</dd>
              </div>
            </dl>
          </div>

          <div className="detail-card">
            <h3>Skills</h3>
            <div className="tag-list">
              {candidate.skills.length === 0 && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>None listed</span>
              )}
              {candidate.skills.map((s) => (
                <Badge tone="accent" key={s}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <h3>Languages & certificates</h3>
            <div className="tag-list" style={{ marginBottom: candidate.certificates.length ? 10 : 0 }}>
              {candidate.languages.map((l) => (
                <Badge tone="info" key={l}>
                  {l}
                </Badge>
              ))}
            </div>
            <div className="tag-list">
              {candidate.certificates.map((c) => (
                <Badge tone="success" key={c}>
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <h3>Applications ({applicationRows.length})</h3>
            {applicationRows.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Not linked to any job yet.
              </p>
            ) : (
              <div className="ranking-list">
                {applicationRows.map(({ app, job }) => (
                  <div
                    key={app.id}
                    className="ranking-row"
                    onClick={() => navigate(`/app/recruitment/jobs/${job!.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="ranking-row__info">
                      <p className="ranking-row__name">{job!.position}</p>
                      <p className="ranking-row__meta">
                        <Badge tone="accent">{app.status}</Badge>
                      </p>
                    </div>
                    <span className="ranking-row__score">{app.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="detail-card">
            <h3>Status</h3>
            <select
              className="input-field"
              value={candidate.status}
              disabled={!canManage || statusSaving}
              onChange={(e) => handleStatusChange(e.target.value as CandidateStatus)}
            >
              <option value="new">New</option>
              <option value="screening">Screening</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="hired">Hired</option>
            </select>
            <div style={{ marginTop: 10 }}>
              <Badge tone={STATUS_TONE[candidate.status]}>{candidate.status}</Badge>
            </div>
          </div>

          <div className="detail-card">
            <h3>CV</h3>
            {candidate.cv?.blobUrl ? (
              <a
                href={candidate.cv.blobUrl}
                target="_blank"
                rel="noreferrer"
                className="file-chip"
                style={{ textDecoration: "none" }}
              >
                <FileText size={14} />
                <span>{candidate.cv.name}</span>
              </a>
            ) : candidate.cv?.name ? (
              <div className="file-chip">
                <FileWarning size={14} />
                <span>{candidate.cv.name} — not available (no backend yet)</span>
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No CV uploaded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetail;
