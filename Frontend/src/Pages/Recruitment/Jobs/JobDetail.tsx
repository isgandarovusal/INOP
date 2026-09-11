import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Plus, UserSquare2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getJobById } from "../../../Services/jobsService";
import {
  getApplications,
  createApplication,
} from "../../../Services/applicationsService";
import { getCandidates } from "../../../Services/candidatesService";
import type {
  Job,
  Application,
  Candidate,
} from "../../../Types/recruitment";
import { useAuth } from "../../../Context/AuthContext";
import { canManageRecruitment } from "../../../Utils/permissions";

const JobDetail: React.FC = () => {
  const { t } = useTranslation();
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
      .map((app) => ({
        app,
        candidate: candidates.find((c) => c.id === app.candidateId),
      }))
      .filter((r) => r.candidate)
      .sort((a, b) => b.app.score - a.app.score);
  }, [applications, candidates]);

  const applicableCandidates = useMemo(
    () =>
      candidates.filter(
        (c) => !applications.some((a) => a.candidateId === c.id),
      ),
    [candidates, applications],
  );

  const handleLink = async () => {
    if (!id || !selectedCandidate) return;

    setLinking(true);
    await createApplication({
      jobId: id,
      candidateId: selectedCandidate,
    });
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
        title={t("recruitment.jobDetail.notFound")}
        hint={t("recruitment.jobDetail.deletedHint")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={job.position}
        subtitle={`${t("recruitment.jobDetail.yearsExperience", {
          years: job.experience,
        })} · ${t(`recruitment.jobStatus.${job.status}`)}`}
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => navigate("/app/recruitment/jobs")}
            >
              <ArrowLeft size={15} /> {t("recruitment.jobDetail.back")}
            </button>

            {canManage && (
              <button
                className="btn-add"
                onClick={() =>
                  navigate(`/app/recruitment/jobs/${job.id}/edit`)
                }
              >
                <Pencil size={15} /> {t("recruitment.jobDetail.edit")}
              </button>
            )}
          </>
        }
      />

      <div className="detail-grid">
        <div>
          <div className="detail-card">
            <h3>{t("recruitment.jobDetail.description")}</h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {job.description || t("recruitment.jobDetail.noDescription")}
            </p>
          </div>

          <div className="detail-card">
            <h3>
              {t("recruitment.jobDetail.rankedCandidates", {
                count: ranked.length,
              })}
            </h3>

            {ranked.length === 0 ? (
              <EmptyState
                icon={<UserSquare2 size={26} />}
                title={t("recruitment.jobDetail.noApplications")}
                hint={t("recruitment.jobDetail.noApplicationsHint")}
              />
            ) : (
              <div className="ranking-list">
                {ranked.map(({ app, candidate }, idx) => (
                  <div
                    key={app.id}
                    className="ranking-row"
                    onClick={() =>
                      navigate(
                        `/app/recruitment/candidates/${candidate!.id}`,
                      )
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <span className="ranking-row__rank">{idx + 1}</span>

                    <div className="ranking-row__info">
                      <p className="ranking-row__name">
                        {candidate!.name}
                      </p>

                      <p className="ranking-row__meta">
                        {candidate!.experience}{" "}
                        {t("recruitment.jobs.years")} ·{" "}
                        <Badge tone="accent">
                          {t(`recruitment.applicationStatus.${app.status}`)}
                        </Badge>
                      </p>
                    </div>

                    <span className="ranking-row__score">
                      {app.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="detail-card">
            <h3>{t("recruitment.jobDetail.requiredSkills")}</h3>

            <div className="tag-list">
              {job.requiredSkills.length === 0 && (
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {t("recruitment.jobDetail.noneSpecified")}
                </span>
              )}

              {job.requiredSkills.map((s) => (
                <Badge tone="accent" key={s}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <h3>{t("recruitment.jobDetail.preferredSkills")}</h3>

            <div className="tag-list">
              {job.preferredSkills.length === 0 && (
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {t("recruitment.jobDetail.noneSpecified")}
                </span>
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
              <h3>{t("recruitment.jobDetail.linkCandidate")}</h3>

              {applicableCandidates.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("recruitment.jobDetail.allCandidatesApplied")}
                </p>
              ) : (
                <>
                  <div className="form-group">
                    <select
                      className="input-field"
                      value={selectedCandidate}
                      onChange={(e) =>
                        setSelectedCandidate(e.target.value)
                      }
                    >
                      <option value="">
                        {t("recruitment.jobDetail.selectCandidate")}
                      </option>

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
                    {linking ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {t("recruitment.jobDetail.addApplication")}
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
