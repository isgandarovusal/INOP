import { getErrorMessage } from "../../../Utils/getErrorMessage";
import React, { useCallback, useMemo, useState } from "react";
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
import { useAuth } from "../../../Context/useAuth";
import { hasPermission } from "../../../Utils/permissions";

import HRResourceState from "../../../Components/HRResourceState";
import { useAuditResource } from "../../../Hooks/useAuditResource";

const JobDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = hasPermission(user, "recruitment", "update");
  const canLink = hasPermission(user, "application", "create") && hasPermission(user, "candidate", "read");
  const canReadApps = hasPermission(user, "application", "read");

  const [linking, setLinking] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (jobId: string, signal?: AbortSignal, scopeKey?: string) => {
    const primary = await getJobById(jobId, signal, scopeKey);
    if (!primary) return null;
    const [apps, people] = await Promise.allSettled([
      canReadApps ? getApplications(signal, scopeKey) : Promise.resolve([]),
      canLink ? getCandidates(signal, scopeKey) : Promise.resolve([]),
    ]);
    return { job: primary,
      applications: apps.status === "fulfilled" ? apps.value.filter(a => (typeof a.jobId === "string" ? a.jobId : a.jobId?.id) === jobId) : [],
      candidates: people.status === "fulfilled" ? people.value : [],
      secondaryError: apps.status === "rejected" || people.status === "rejected",
    };
  }, [canReadApps, canLink]);
  const result = useAuditResource(id, "recruitment", load);
  const job = result.data?.job;
  const applications = useMemo(() => result.data?.applications ?? [], [result.data]);
  const candidates = useMemo(() => result.data?.candidates ?? [], [result.data]);
  const loadJobDetail = result.reload;

  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate])),
    [candidates],
  );

  const appliedCandidateIds = useMemo(
    () =>
      new Set(
        applications
          .map((application) => typeof application.candidateId === "string" ? application.candidateId : application.candidateId?.id)
          .filter((candidateId): candidateId is string => Boolean(candidateId)),
      ),
    [applications],
  );

  const ranked = useMemo(() => {
    return applications
      .map((app) => ({
        app,
        candidate:
          typeof app.candidateId === "string"
            ? candidateById.get(app.candidateId)
            : app.candidateId,
      }))
      .filter((r) => r.candidate)
      .sort((a, b) => b.app.score - a.app.score);
  }, [applications, candidateById]);

  const applicableCandidates = useMemo(
    () => candidates.filter((candidate) => !appliedCandidateIds.has(candidate.id)),
    [candidates, appliedCandidateIds],
  );

  const handleLink = async () => {
    if (!id || !selectedCandidate) return;

    setLinking(true);
    setError(null);

    try {
      await createApplication({
        jobId: id,
        candidateId: selectedCandidate,
      });

      setSelectedCandidate("");
      await loadJobDetail();
    } catch (err: unknown) {
      console.error("Failed to create application:", err);
      setError(
        getErrorMessage(err, t("recruitment.jobDetail.linkError")),
      );
    } finally {
      setLinking(false);
    }
  };

  if (result.status !== "ready" || !job) return <HRResourceState status={result.status} retry={result.reload} />;

  return (
    <div className="job-detail-page">
      {error && <div role="alert">{error}</div>}
      {result.data?.secondaryError && <div role="alert">{t("hrStates.secondaryError")}</div>}
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

            {canEdit && (
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

      {hasPermission(user, "candidate", "create") && hasPermission(user, "application", "create") && <button type="button" onClick={() => navigate(`/app/recruitment/candidates/new?jobId=${encodeURIComponent(job.id)}`)}>{t("hrStates.cvForJob")}</button>}
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

          {canLink && (
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
