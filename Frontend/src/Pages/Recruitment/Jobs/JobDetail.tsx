import JobArchiveHistory from "../../../Components/JobArchiveHistory";
import MatchScoreBadge from "../../../Components/MatchScoreBadge";
import { useHRRankingPage } from "../../../Hooks/useHRRankingPage";
import { brandLabel } from "../../../Services/recruitmentCatalogService";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Plus, UserSquare2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getJobById, restoreJob } from "../../../Services/jobsService";
import {
  createApplication,
} from "../../../Services/applicationsService";
import { getCandidatePage } from "../../../Services/hrPageService";
import { useHRPage, useDebouncedSearch } from "../../../Hooks/useHRPage";
import { useHRActionContext } from "../../../Hooks/useHRActionContext";
import HRPageControls from "../../../Components/HRPageControls";
import SearchInput from "../../../Components/SearchInput";
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

  const result = useAuditResource(id, "recruitment", getJobById, { retainOnReload: true });
  const job = result.data;
  const [candidateSearch, setCandidateSearch] = useState('');
  const search = useDebouncedSearch(candidateSearch);
  const apps = useHRRankingPage(id, !!id && canReadApps);
  const people = useHRPage('candidate', { excludeJobId: job?.id, q: search }, getCandidatePage, { enabled: !!job && canLink && !job.archivedAt && job.status === 'open' });
  const applications = useMemo(() => apps.data?.items ?? [], [apps.data]);
  const candidates = useMemo(() => people.data?.items ?? [], [people.data]);
  const context = useHRActionContext(id);
  const [action, setAction] = useState({ key: '', busy: false, selected: '', error: '' });
  const currentAction = action.key === context.key ? action : { busy: false, selected: '', error: '' };
  const linking = currentAction.busy, selectedCandidate = currentAction.selected, error = currentAction.error;
  const setSelectedCandidate = (selected: string) => setAction(previous => ({ key: context.key, busy: previous.key === context.key && previous.busy, error: '', selected }));
  const loadJobDetail = () => { apps.reload(); people.reload(); };

  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate])),
    [candidates],
  );

  const ranked = useMemo(() => {
    return applications
      .map((app) => ({
        app,
        candidate:
          typeof app.candidateId === "string"
            ? candidateById.get(app.candidateId)
            : app.candidateId,
      }));
  }, [applications, candidateById]);

  const applicableCandidates = useMemo(
    () => candidates,
    [candidates],
  );

  const handleRestore = async()=>{if(!job||!canEdit)return;const key=context.key;setAction({key,busy:true,selected:selectedCandidate,error:""});try{await restoreJob(job.id,job.revision??0);if(context.current.current===key)result.reload();}catch(err){if(context.current.current===key)setAction({key,busy:false,selected:selectedCandidate,error:hrCrudErrorKey(err)});}finally{if(context.current.current===key)setAction(old=>({...old,busy:false}));}};

  const handleLink = async () => {
    if (!id || !selectedCandidate || !canLink || job?.archivedAt || job?.status !== "open" || !candidates.some(c => c.id === selectedCandidate)) return;
    const key = context.key;

    setAction({ key, busy: true, selected: selectedCandidate, error: "" });

    try {
      await createApplication({
        jobId: id,
        candidateId: selectedCandidate,
      });

      if (context.current.current === key) { setSelectedCandidate(""); loadJobDetail(); }
    } catch (err: unknown) {
      if (context.current.current === key) setAction(previous => ({ ...previous, key, error: hrCrudErrorKey(err) }));
    } finally {
      if (context.current.current === key) setAction(previous => ({ ...previous, busy: false }));
    }
  };

  if (result.status !== "ready" || !job) return <HRResourceState status={result.status} retry={result.reload} />;

  return (
    <div className="hr-workspace job-detail-page">
      {error && <div role="alert">{t(error)}</div>}

      {job.branchName && <p>{t("hrCatalog.branch")}: {job.branchName}</p>}
      <PageHeader
        title={job.position + (job.brandId ? ` · ${job.brandName || brandLabel(job.brandId)}` : "")}
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

            {canEdit && !job.archivedAt && (
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

      {!job.archivedAt && job.status === "open" && hasPermission(user, "candidate", "create") && hasPermission(user, "application", "create") && <button type="button" onClick={() => navigate(`/app/recruitment/candidates/new?jobId=${encodeURIComponent(job.id)}`)}>{t("hrStates.cvForJob")}</button>}
      {job.archivedAt&&<section className="hr-notice"><p role="status">{t("hrJobArchive.readOnly")}</p>{canEdit&&<button type="button" className="btn-secondary" disabled={linking} onClick={()=>{void handleRestore();}}>{t("hrArchive.restore")}</button>}</section>}
      <JobArchiveHistory key={job.id+":"+job.revision} id={job.id} revision={job.revision}/>
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
                count: apps.data?.total ?? ranked.length,
              })}
            </h3>

            <p role="note">{t("hrPage.vacancyRanking")}</p>
            {apps.changed && <p role="alert">{t("hrPage.rankingChanged")}</p>}
            {canReadApps && apps.status !== "ready" ? <HRResourceState status={apps.status} retry={apps.reload} /> : ranked.length === 0 ? (
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
                  >
                    <span className="ranking-row__rank">{(apps.page - 1) * (apps.data?.pageSize ?? 30) + idx + 1}</span>

                    <div className="ranking-row__info">
                      <p className="ranking-row__name">
                        {candidate ? <button type="button" onClick={() => navigate(`/app/recruitment/candidates/${candidate.id}`)}>{candidate.name}</button> : t("hrStates.restricted")}
                      </p>

                      <p className="ranking-row__meta">
                        {candidate?.experience ?? t("cvReview.unknown")}{" "}
                        {t("recruitment.jobs.years")} ·{" "}
                        <Badge tone="accent">
                          {t(`recruitment.applicationStatus.${app.status}`)}
                        </Badge>
                      </p>
                    </div>

                    <span className="ranking-row__score">
                      <MatchScoreBadge application={app} onUpdated={loadJobDetail} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {canReadApps && <HRPageControls data={apps.data} page={apps.page} onPage={apps.setPage} disabled={apps.status !== "ready"} />}
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

          {canLink && !job.archivedAt && job.status === "open" && (
            <div className="detail-card">
              <h3>{t("recruitment.jobDetail.linkCandidate")}</h3>

              <SearchInput value={candidateSearch} onChange={setCandidateSearch} placeholder={t("recruitment.candidates.searchPlaceholder")} />
              {people.status !== "ready" ? <HRResourceState status={people.status} retry={people.reload} /> : applicableCandidates.length === 0 ? (
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
                      aria-label={t("recruitment.jobDetail.selectCandidate")}
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
                    disabled={!selectedCandidate || !candidates.some(c => c.id === selectedCandidate) || linking}
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
              <HRPageControls data={people.data} page={people.page} onPage={people.setPage} disabled={people.status !== "ready"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
