import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Plus, UserSquare2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getJobById } from "../../../Services/jobsService";
import { getApplications, createApplication } from "../../../Services/applicationsService";
import { getCandidates } from "../../../Services/candidatesService";
import type { Job, Application, Candidate } from "../../../Types/recruitment";
import { useAuth } from "../../../Context/AuthContext";
import { canManageRecruitment } from "../../../Utils/permissions";

const JobDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user ? canManageRecruitment(user.role) : false;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState("");

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([getJobById(id), getApplications(), getCandidates()]).then(
      ([jobResult, appResult, candidateResult]) => {
        setJob(jobResult ?? null);
        setApplications(appResult.filter((a) => a.jobId === id));
        setCandidates(candidateResult);
        setLoading(false);
      },
    );
  };

  useEffect(load, [id]);

  const ranked = useMemo(() => {
    return applications
      .map((app) => ({ app, candidate: candidates.find((c) => c.id === app.candidateId) }))
      .filter((r) => r.candidate)
      .sort((a, b) => b.app.score - a.app.score);
  }, [applications, candidates]);

  const applicableCandidates = useMemo(
    () => candidates.filter((c) => !applications.some((a) => a.candidateId === c.id)),
    [candidates, applications],
  );

  const handleLink = async () => {
    if (!id || !selectedCandidate) return;
    setLinking(true);
    await createApplication({ jobId: id, candidateId: selectedCandidate });
    setSelectedCandidate("");
    setLinking(false);
    load();
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <EmptyState
        icon={<UserSquare2 size={28} />}
        title="Job not found"
        hint="It may have been deleted."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={job.position}
        subtitle={`${job.experience}+ years experience · ${job.status}`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate("/app/recruitment/jobs")}>
              <ArrowLeft size={15} /> Back
            </button>
            {canManage && (
              <button
                className="btn-add"
                onClick={() => navigate(`/app/recruitment/jobs/${job.id}/edit`)}
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
            <h3>Description</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
              {job.description || "No description provided."}
            </p>
          </div>

          <div className="detail-card">
            <h3>Ranked candidates ({ranked.length})</h3>
            {ranked.length === 0 ? (
              <EmptyState
                icon={<UserSquare2 size={26} />}
                title="No applications yet"
                hint="Link a candidate to this job to see their screening score."
              />
            ) : (
              <div className="ranking-list">
                {ranked.map(({ app, candidate }, idx) => (
                  <div
                    key={app.id}
                    className="ranking-row"
                    onClick={() => navigate(`/app/recruitment/candidates/${candidate!.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="ranking-row__rank">{idx + 1}</span>
                    <div className="ranking-row__info">
                      <p className="ranking-row__name">{candidate!.name}</p>
                      <p className="ranking-row__meta">
                        {candidate!.experience} yrs · <Badge tone="accent">{app.status}</Badge>
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
            <h3>Required skills</h3>
            <div className="tag-list">
              {job.requiredSkills.length === 0 && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>None specified</span>
              )}
              {job.requiredSkills.map((s) => (
                <Badge tone="accent" key={s}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <h3>Preferred skills</h3>
            <div className="tag-list">
              {job.preferredSkills.length === 0 && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>None specified</span>
              )}
              {job.preferredSkills.map((s) => (
                <Badge tone="neutral" key={s}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {canManage && (
            <div className="detail-card">
              <h3>Link a candidate</h3>
              {applicableCandidates.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  All candidates have already applied to this job.
                </p>
              ) : (
                <>
                  <div className="form-group">
                    <select
                      className="input-field"
                      value={selectedCandidate}
                      onChange={(e) => setSelectedCandidate(e.target.value)}
                    >
                      <option value="">Select a candidate…</option>
                      {applicableCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ width: "100%" }}
                    disabled={!selectedCandidate || linking}
                    onClick={handleLink}
                  >
                    {linking ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                    Add application
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
