import {isAxiosError} from 'axios';
import CvProcessingApprovalReview from '../../../Components/CvProcessingApprovalReview';
import type {CvProcessingJob} from '../../../Services/cvProcessingService';
import CvReviewAssistant from "../../../Components/CvReviewAssistant";
import CvReviewEvidence from "../../../Components/CvReviewEvidence";
import CvHistoryEditor from "../../../Components/CvHistoryEditor";
import { useMounted } from "../../../Hooks/useMounted";
import { getErrorMessage } from "../../../Utils/getErrorMessage";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import HRResourceState from "../../../Components/HRResourceState";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import { useAuth } from "../../../Context/useAuth";
import { hasPermission } from "../../../Utils/permissions";
import { AlertCircle, FileText, Loader2, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import {
  createCandidate,
  getCandidateById,
  parseCandidateCv,
  updateCandidate,
} from "../../../Services/candidatesService";
import type { Candidate, CandidateStatus, Job, CvHistoryEntry, CvReview, CvProcessingApproval } from "../../../Types/recruitment";
import { useTranslation } from "react-i18next";

const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CandidateFormFields: React.FC<{ initial?: Candidate; job?: Job; processingJobId?: string }> = ({ initial, job, processingJobId }) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const mounted = useMounted();

  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phoneRaw || initial?.phone || "");
  const [education, setEducation] = useState(initial?.education ?? "");
  const [experience, setExperience] = useState<number | null>(initial?.experience ?? null);
  const [employmentHistory, setEmploymentHistory] = useState<CvHistoryEntry[]>(initial?.employmentHistory ?? []);
  const [educationHistory, setEducationHistory] = useState<CvHistoryEntry[]>(initial?.educationHistory ?? []);
  const [certificationHistory, setCertificationHistory] = useState<CvHistoryEntry[]>(initial?.certificationHistory ?? []);
  const [review, setReview] = useState<CvReview | undefined>(initial?.cvReview);
  const [confirmReview, setConfirmReview] = useState(false);
  const [processingApproval,setProcessingApproval]=useState<CvProcessingApproval|undefined>();
  function applyProcessing(job:CvProcessingJob){
    const p=job.result!.parsed;
    for(const [field,setter] of [["name",setName],["role",setRole],["email",setEmail],["education",setEducation]] as const)if(typeof p[field]==="string"&&p[field])setter(p[field] as string);
    if(typeof p.phoneRaw==="string"&&p.phoneRaw)setPhone(p.phoneRaw);else if(typeof p.phone==="string"&&p.phone)setPhone(p.phone);
    if(typeof p.experience==="number")setExperience(p.experience);
    for(const [field,setter] of [["skills",setSkills],["languages",setLanguages],["certificates",setCertificates]] as const)if(Array.isArray(p[field])&&p[field].length)setter(p[field] as string[]);
    for(const [field,setter] of [["employmentHistory",setEmploymentHistory],["educationHistory",setEducationHistory],["certificationHistory",setCertificationHistory]] as const)if(Array.isArray(p[field])&&p[field].length)setter(p[field] as CvHistoryEntry[]);
    setReview(job.result!.review);setConfirmReview(false);
    setProcessingApproval({jobId:job.id,contextHash:job.source.contextHash,expectedJobUpdatedAt:job.updatedAt});
  }
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? []);
  const [certificates, setCertificates] = useState<string[]>(initial?.certificates ?? []);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(initial?.cvOriginal?.originalName ?? initial?.cvUrl?.split("/").pop() ?? null);
  
  const parsing = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 });
  const [sourceChanged, setSourceChanged] = useState(false), [sourceEpoch, setSourceEpoch] = useState(0);
  const [accessDenied, setAccessDenied] = useState<"unauthenticated" | "forbidden" | "not-found" | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { parsing.current.sequence++; parsing.current.controller?.abort(); }, []);

  const validateCvFile = (file: File): boolean => {
    if (!ACCEPTED_CV_TYPES.includes(file.type)) {
      toast.error(t("recruitment.candidateForm.cvFormatError"));
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("recruitment.candidateForm.cvSizeError"));
      return false;
    }

    return true;
  };

  const handleCvChange = async (file: File | null) => {
    setProcessingApproval(undefined);setConfirmReview(false);
    setSourceEpoch(value => value + 1);
    parsing.current.controller?.abort();
    const sequence = ++parsing.current.sequence;
    setAiGenerating(false);
    if (!file) {
      setCvFile(null);
      return;
    }

    if (!validateCvFile(file)) {
      return;
    }

    setSourceChanged(true);
    setCvFile(file);
    setExistingCvName(null);
    setError(null);
    setAiGenerating(true);
    const controller = new AbortController(); parsing.current.controller = controller;

    try {
      const parsed = await parseCandidateCv(file, controller.signal);
      if (sequence !== parsing.current.sequence || controller.signal.aborted) return;

      if (parsed.name) setName(parsed.name);
      if (parsed.role) setRole(parsed.role);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.phoneRaw || parsed.phone) setPhone(parsed.phoneRaw || parsed.phone);
      if (parsed.education) setEducation(parsed.education);
      setExperience(parsed.experience == null ? null : Number(parsed.experience));
      setEmploymentHistory(parsed.employmentHistory ?? []); setEducationHistory(parsed.educationHistory ?? []); setCertificationHistory(parsed.certificationHistory ?? []);
      setReview(parsed.extraction); setConfirmReview(false);
      if (parsed.skills?.length) setSkills(parsed.skills);
      if (parsed.languages?.length) setLanguages(parsed.languages);
      if (parsed.certificates?.length) setCertificates(parsed.certificates);

      toast.success(t("cvReview.extracted"));
    } catch (err: unknown) {
      if (sequence !== parsing.current.sequence || controller.signal.aborted) return;
      const processing = (err as { response?: { data?: { processingStatus?: "unsupported_ocr" | "failed" } } }).response?.data?.processingStatus;
      if (processing) setReview({ version: "rules-2", provider: "rule-based", processingStatus: processing, reviewStatus: "pending" });
      setError(
        getErrorMessage(err, t("recruitment.candidateForm.genericError")),
      );
      toast.error(
        getErrorMessage(
          err,
          t("recruitment.candidateForm.genericError"),
        ),
      );
    } finally {
      if (sequence === parsing.current.sequence) setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if(processingApproval&&!confirmReview){setError(t("hrApproval.confirmRequired"));return;}
    if (aiGenerating || saving) return;
    if (job && !cvFile) { setError(t("hrStates.cvRequired")); return; }
    if (!name.trim()) {
      setError(t("recruitment.candidateForm.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        role: role.trim() || "Unspecified",
        email: email.trim(),

        phone,
        education,
        experience,
        skills,
        languages,
        certificates,
        employmentHistory, educationHistory, certificationHistory,
        reviewStatus: confirmReview ? "confirmed" as const : undefined,
        expectedRevision: initial?.revision,
        processingApproval,
        cvFile,
        jobId: job?.id,
      };

      if (isEdit && id) {
        // Edit zamanı mövcud ATS statusunu qoruyuruq.
        await updateCandidate(id, payload);
        if (!mounted.current) return;
        toast.success(t("recruitment.candidateForm.updated"));
      } else {
        // Namizəd yaradılarkən vakansiya konteksti olmadığı üçün
        // match score burada hesablanmır. Score Application səviyyəsində,
        // konkret Job ilə birlikdə backend-də hesablanacaq.
        await createCandidate({
          ...payload,
          status: "new" as CandidateStatus,
        });
        if (!mounted.current) return;
        toast.success(t("recruitment.candidateForm.created"));
      }
      navigate("/app/recruitment/candidates");
    } catch (err: unknown) {
      if (!mounted.current) return;
      if(isAxiosError(err)){const status=err.response?.status;if(status===401||status===403||(status===404&&err.response?.data?.code!=="PROCESSING_JOB_UNAVAILABLE")){setAccessDenied(status===401?"unauthenticated":status===403?"forbidden":"not-found");return;}if(status===409||status===404){setConfirmReview(false);setError(t("hrProcessing.error.changed"));return;}}
      setError(
        getErrorMessage(err, t("recruitment.candidateForm.genericError")),
      );
    } finally {
      if (mounted.current) setSaving(false);
    }
  };


  if (accessDenied) return <HRResourceState status={accessDenied} />;
  const eligibleAiReview = id && initial?.cvOriginal?.sha256 && initial.cvReview?.version === "rules-2" && initial.cvReview.provider === "rule-based" && initial.cvReview.processingStatus === "extracted" && !sourceChanged && !cvFile && !aiGenerating && !saving;
  return (
    <div className="candidate-form-page">
      {job && <p>{job.position}</p>}
      <PageHeader
        title={isEdit ? t("recruitment.candidateForm.editTitle") : t("recruitment.candidateForm.newTitle")}
        subtitle={t("recruitment.candidateForm.subtitle")}
      />

      {error && (
        <div className="alert alert--danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

        <form onSubmit={handleSubmit}>
          {initial&&processingJobId&&!sourceChanged&&!cvFile&&<CvProcessingApprovalReview candidate={initial} jobId={processingJobId} disabled={saving||aiGenerating} onApply={applyProcessing} onAccessDenied={setAccessDenied}/>}
          {/* CV Upload */}
          <section className="candidate-form-section">
            <div className="candidate-form-section__header">
              <div className="candidate-form-section__icon">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="candidate-form-section__title">{t("recruitment.candidateForm.cvDocument")}</h3>
                <p className="candidate-form-section__description">
                  {t("recruitment.candidateForm.cvDescription")}
                </p>
              </div>
            </div>

            <div
              className="candidate-cv-upload"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!saving) void handleCvChange(e.dataTransfer.files?.[0] || null);
              }}
            >
              {cvFile ? (
                <div className="candidate-cv-upload__file">
                  <div className="candidate-cv-upload__file-info">
                    <FileText size={20} />
                    <span className="candidate-cv-upload__file-name">
                      {cvFile.name}
                    </span>
                    <small>
                      ({(cvFile.size / 1024 / 1024).toFixed(2)} MB)
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary candidate-cv-upload__remove"
                    disabled={saving}
                    onClick={() => void handleCvChange(null)}
                    aria-label={t("recruitment.candidateForm.removeCv")}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : existingCvName ? (
                <div className="candidate-cv-upload__file">
                  <div className="candidate-cv-upload__file-info">
                    <FileText size={20} />
                    <span className="candidate-cv-upload__file-name">
                      {existingCvName}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="candidate-cv-upload__empty">
                  <div className="candidate-cv-upload__icon">
                    <UploadCloud size={22} />
                  </div>
                  <p className="candidate-cv-upload__title">
                    {t("recruitment.candidateForm.dragCv")}
                  </p>
                  <p className="candidate-cv-upload__hint">
                    {t("recruitment.candidateForm.cvFormats")}
                  </p>
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: "14px" }}>
                <label className="btn-secondary recruitment-upload-button">
                  {aiGenerating ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <UploadCloud size={16} />
                  )}
                  {aiGenerating
                    ? t("hrStates.parsing")
                    : cvFile || existingCvName
                      ? t("recruitment.candidateForm.chooseAnotherCv")
                      : t("recruitment.candidateForm.chooseCv")}
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hr-private-file-input"
                    aria-label={t("recruitment.candidateForm.chooseCv")}
                    disabled={saving}
                    onChange={(e) =>
                      handleCvChange(e.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>

              {(cvFile || existingCvName) && (
                <div
                  style={{
                    marginTop: "10px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("recruitment.candidateForm.cvFormats")}
                </div>
              )}
            </div>
          </section>

          {/* Candidate Information */}
          <section className="candidate-form-section">
            <div className="candidate-form-section__header">
              <div className="candidate-form-section__icon">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="candidate-form-section__title">
                  {t("recruitment.candidateForm.candidateInformation")}
                </h3>
                <p className="candidate-form-section__description">
                  {t("recruitment.candidateForm.candidateInformationDescription")}
                </p>
              </div>
            </div>

            <CvReviewEvidence review={review} />
            {eligibleAiReview && id && initial?.cvOriginal?.sha256 ? <CvReviewAssistant
              key={JSON.stringify([id, initial.revision, initial.cvOriginal.sha256, sourceEpoch, role, education, experience, skills, languages, certificates])}
              id={id} hash={initial.cvOriginal.sha256} revision={initial.revision ?? 0} onAccessDenied={setAccessDenied}
              onApprove={rows => {
                for (const row of rows) {
                  if (row.field === "skills") setSkills(prev => [...new Set([...prev, row.value])]);
                  if (row.field === "languages") setLanguages(prev => [...new Set([...prev, row.value])]);
                  if (row.field === "certificates") setCertificates(prev => [...new Set([...prev, row.value])]);
                  if (row.field === "education") setEducation(row.value);
                  if (row.field === "role") setRole(row.value);
                  if (row.field === "experience") setExperience(Number(row.value));
                }
                setConfirmReview(false);
              }} /> : <p role="note">{t("hrCvAi.saveFirst")}</p>}
            <fieldset className="candidate-fields" disabled={aiGenerating || saving}>
              <div className="form-group">
                <label className="candidate-field-label">
                  {t("recruitment.candidateForm.fullName")} <span className="candidate-field-required">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  name="name"
                  aria-label={t("recruitment.candidateForm.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">
                  {t("recruitment.candidateForm.position")}
                </label>
                <input
                  type="text"
                  className="input"
                  name="role"
                  aria-label={t("recruitment.candidateForm.position")}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">{t("recruitment.candidateForm.email")}</label>
                <input
                  type="email"
                  className="input"
                  name="email"
                  aria-label={t("recruitment.candidateForm.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">{t("recruitment.candidateForm.phone")}</label>
                <input
                  type="text"
                  className="input"
                  name="phone"
                  aria-label={t("recruitment.candidateForm.phone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">{t("recruitment.candidateForm.experience")}</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  name="experience"
                  aria-label={t("recruitment.candidateForm.experience")}
                  value={experience ?? ""}
                  onChange={(e) => setExperience(e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>

              <div className="form-group form-group--full">
                <label className="candidate-field-label">
                  {t("recruitment.candidateForm.skillsEnglish")}
                </label>
                <TagInput
                  label={t("recruitment.candidateForm.skills")}
                  values={skills}
                  onChange={setSkills}
                  placeholder={t("recruitment.candidateForm.skillPlaceholder")}
                />
              </div>
              <div className="form-group"><label>{t("cvReview.education")}<textarea name="education" value={education} onChange={e => setEducation(e.target.value)} /></label></div>
              <TagInput label={t("cvReview.languages")} values={languages} onChange={setLanguages} />
              <TagInput label={t("cvReview.certificates")} values={certificates} onChange={setCertificates} />
              <CvHistoryEditor label={t("cvReview.employmentHistory")} entries={employmentHistory} onChange={setEmploymentHistory} />
              <CvHistoryEditor label={t("cvReview.educationHistory")} entries={educationHistory} onChange={setEducationHistory} />
              <CvHistoryEditor label={t("cvReview.certificates")} entries={certificationHistory} onChange={setCertificationHistory} />
              {isEdit && review?.version && !cvFile && <label><input name="confirmReview" type="checkbox" checked={confirmReview} onChange={e => setConfirmReview(e.target.checked)} />{t("cvReview.confirm")}</label>}
            </fieldset>
          </section>

          {/* Actions */}
          <div className="candidate-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              {t("recruitment.candidateForm.cancel")}
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving || aiGenerating}
            >
              {saving ? <Loader2 size={16} className="spin" /> : null}
              {isEdit
                ? t("recruitment.candidateForm.update")
                : t("recruitment.candidateForm.saveAndRedirect")}
            </button>
          </div>
        </form>
    </div>
  );
};

import { getJobById } from "../../../Services/jobsService";

const CandidateForm: React.FC = () => {
  const { id } = useParams(); const { user } = useAuth();
  const [search] = useSearchParams(); const jobId = id ? undefined : search.get("jobId") ?? undefined;
  const job = useAuditResource(jobId, "recruitment", getJobById, { refreshOnFocus: false });
  const result = useAuditResource(id, "candidate", getCandidateById, { refreshOnFocus: false });
  const processingJobId=id ? search.get("processingJobId") ?? undefined : undefined;
  const key = JSON.stringify([id, jobId, processingJobId, result.data?.revision, result.data?.updatedAt, user?.id, user?.role, user?.departmentId, user?.permissions]);
  if (!hasPermission(user, "candidate", id ? "update" : "create")) return <HRResourceState status="forbidden" />;
  if (jobId && !hasPermission(user, "application", "create")) return <HRResourceState status="forbidden" />;
  if (jobId && job.status !== "ready") return <HRResourceState status={job.status} retry={job.reload} />;
  if (id && result.status !== "ready") return <HRResourceState status={result.status} retry={result.reload} />;
  return <CandidateFormFields key={key} initial={result.data ?? undefined} job={job.data ?? undefined} processingJobId={processingJobId} />;
};
export default CandidateForm;
