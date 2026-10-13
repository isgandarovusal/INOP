import { FormSection, SectionCard } from '../../../Components/HRSection';
import { BriefcaseBusiness } from "lucide-react";
import AIAvailability from "../../../Components/AIAvailability";
import JobSkillsAssistant from "../../../Components/JobSkillsAssistant";
import RecruitmentLocationFields from "../../../Components/RecruitmentLocationFields";
import { useMounted } from "../../../Hooks/useMounted";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import {isAxiosError} from "axios";
import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HRResourceState from "../../../Components/HRResourceState";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import { useAuth } from "../../../Context/useAuth";
import { hasPermission } from "../../../Utils/permissions";
import type { Job, JobType } from "../../../Types/recruitment";
import { AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import { createJob, getJobById, updateJob } from "../../../Services/jobsService";

const JobFormFields: React.FC<{ initial?: Job }> = ({ initial }) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const mounted = useMounted();

  const [brandId, setBrandId] = useState<string | null>(initial?.brandId ?? null);
  const [branchId, setBranchId] = useState<string | null>(initial?.branchId ?? null);
  const [position, setPosition] = useState(initial?.position ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(initial?.requiredSkills ?? []);
  const [experience, setExperience] = useState(initial?.experience ?? 0);
  const [status, setStatus] = useState<"open" | "closed" | "draft">(initial?.status ?? "open");

  const [requiredEducation, setRequiredEducation] = useState<string[]>(initial?.requiredEducation ?? []);
  const [requiredCertificates, setRequiredCertificates] = useState<string[]>(initial?.requiredCertificates ?? []);
  const [preferredSkills, setPreferredSkills] = useState<string[]>(initial?.preferredSkills ?? []);
  const [department, setDepartment] = useState(initial?.department ?? "HR");
  const [location, setLocation] = useState(initial?.location ?? "Remote");
  const [type, setType] = useState<JobType>(initial?.type ?? "Full-time");
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [aiAvailable, setAIAvailable] = useState(true);
  const [accessDenied, setAccessDenied] = useState<"unauthenticated" | "forbidden" | "not-found" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearFieldError = (field: string) => setFieldErrors(previous => {
    if (!previous[field]) return previous;
    const next = { ...previous }; delete next[field]; return next;
  });

  const handleSubmit = async (asDraft = false) => {
    if (submitLock.current) return;
    const errors: Record<string, string> = {};
    if (!position.trim()) errors.position = "recruitment.jobForm.positionRequired";
    if (!description.trim()) errors.description = "recruitment.jobForm.descriptionRequired";
    if (!department.trim()) errors.department = "recruitment.jobForm.fieldRequired";
    if (!location.trim()) errors.location = "recruitment.jobForm.fieldRequired";
    if (!Number.isFinite(experience) || experience < 0) errors.experience = "recruitment.jobForm.experienceInvalid";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(`job-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    submitLock.current = true;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        position: position.trim(), brandId, branchId,
        description: description.trim(),
        requiredSkills,
        preferredSkills, requiredEducation, requiredCertificates,
        department: department.trim(), location: location.trim(), type,
        experience,
        status: asDraft ? "draft" : status,
      };

      if (isEdit && id) {
        await updateJob(id, payload);
        if (!mounted.current) return;
        toast.success(t("recruitment.jobForm.updated"));
      } else {
        await createJob(payload);
        if (!mounted.current) return;
        toast.success(t("recruitment.jobForm.created"));
      }

      navigate("/app/recruitment/jobs");
    } catch (err: unknown) {
      if (!mounted.current) return;
      if(isAxiosError(err)&&[401,403,404].includes(err.response?.status??0)){setAccessDenied(err.response!.status===401?'unauthenticated':err.response!.status===403?'forbidden':'not-found');return;}
      setError(hrCrudErrorKey(err));
    } finally {
      submitLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  if (accessDenied) return <HRResourceState status={accessDenied} />;
  const aiContext = { title: position, description, brandId, branchId, workplace: location, experienceYears: experience, requiredSkills, preferredSkills };
  return (
    <div className="hr-workspace job-form-page">
      <PageHeader icon={<BriefcaseBusiness size={26} />}
        title={
          isEdit
            ? t("recruitment.jobForm.editTitle")
            : t("recruitment.jobForm.newTitle")
        }
        subtitle={t("recruitment.jobForm.subtitle")}
      />

      {error && (
        <div className="alert alert--danger" role="alert">
          <AlertCircle size={18} />
          <span>{t(error)}</span>
        </div>
      )}

      <form onSubmit={event=>{event.preventDefault();void handleSubmit();}} className="form-grid" noValidate aria-busy={saving}>
        <FormSection className="job-form-section" title={t("recruitment.jobForm.sections.basic")}>
        <div className="form-group"><label htmlFor="job-position">{t("recruitment.jobForm.position")}</label><input id="job-position" aria-invalid={Boolean(fieldErrors.position)} aria-describedby={fieldErrors.position ? "job-position-error" : undefined} type="text" className="input" name="position" aria-label={t("recruitment.jobForm.position")} value={position} onChange={e=>{setPosition(e.target.value); clearFieldError("position");}} placeholder={t("recruitment.jobForm.positionPlaceholder")} required />{fieldErrors.position && <p className="form-error" id="job-position-error">{t(fieldErrors.position)}</p>}</div>
        <div className="form-group"><label htmlFor="job-experience">{t("recruitment.jobForm.experience")}</label><input id="job-experience" aria-invalid={Boolean(fieldErrors.experience)} aria-describedby={fieldErrors.experience ? "job-experience-error" : undefined} type="number" className="input" min={0} name="experience" aria-label={t("recruitment.jobForm.experience")} value={experience} onChange={e=>{setExperience(Number(e.target.value)); clearFieldError("experience");}} />{fieldErrors.experience && <p className="form-error" id="job-experience-error">{t(fieldErrors.experience)}</p>}</div>
        </FormSection>
        <FormSection className="job-form-section" title={t("recruitment.jobForm.sections.organization")}>
        <RecruitmentLocationFields brandId={brandId} branchId={branchId} onChange={(brand, branch) => { setBrandId(brand); setBranchId(branch); }} />
        <div className="form-group"><label htmlFor="job-department">{t("hrStates.department")}</label><input id="job-department" aria-invalid={Boolean(fieldErrors.department)} aria-describedby={fieldErrors.department ? "job-department-error" : undefined} className="input" value={department} onChange={e=>{setDepartment(e.target.value); clearFieldError("department");}} required />{fieldErrors.department && <p className="form-error" id="job-department-error">{t(fieldErrors.department)}</p>}</div>
        <div className="form-group"><label htmlFor="job-location">{t("hrStates.location")}</label><input id="job-location" aria-invalid={Boolean(fieldErrors.location)} aria-describedby={fieldErrors.location ? "job-location-error" : undefined} className="input" value={location} onChange={e=>{setLocation(e.target.value); clearFieldError("location");}} required />{fieldErrors.location && <p className="form-error" id="job-location-error">{t(fieldErrors.location)}</p>}</div>
        <div className="form-group"><label htmlFor="job-type">{t("hrStates.type")}</label><select id="job-type" className="input" value={type} onChange={e => setType(e.target.value as JobType)}>{["Full-time", "Part-time", "Contract", "Internship"].map(value => <option key={value}>{value}</option>)}</select></div>
        <div className="form-group"><label htmlFor="job-status">{t("recruitment.jobs.status")}</label><select id="job-status" className="input" value={status} onChange={e => setStatus(e.target.value as typeof status)}>{["open", "closed", "draft"].map(value => <option key={value} value={value}>{t(`recruitment.jobStatus.${value}`)}</option>)}</select></div>
        </FormSection>
        <FormSection className="job-form-section" title={t("recruitment.jobForm.sections.requirements")}>
        <div className="form-group form-group--full"><label htmlFor="job-description">{t("recruitment.jobForm.description")} *</label><textarea id="job-description" required aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "job-description-error" : undefined} aria-label={t("recruitment.jobForm.description")} rows={4} className="input" value={description} onChange={e=>{setDescription(e.target.value); clearFieldError("description");}} />{fieldErrors.description && <p className="form-error" id="job-description-error">{t(fieldErrors.description)}</p>}</div>
        <div className="form-group form-group--full job-criteria-grid"><TagInput label={t("recruitment.jobForm.tagLabel")} values={requiredSkills} onChange={setRequiredSkills} placeholder={t("recruitment.jobForm.skillPlaceholder")} /><TagInput label={t("hrStates.preferredSkills")} values={preferredSkills} onChange={setPreferredSkills} /></div>
        <div className="form-group form-group--full job-criteria-grid"><TagInput label={t("hrMatch.requiredEducation")} values={requiredEducation} onChange={setRequiredEducation} /><TagInput label={t("hrMatch.requiredCertificates")} values={requiredCertificates} onChange={setRequiredCertificates} /></div>
        </FormSection>
        <SectionCard className="form-group form-group--full hr-ai-panel" data-job-ai>
          <h3>{t("hrAi.label")}</h3>
          <AIAvailability onStatus={value => setAIAvailable(value.state === "configured_not_verified")} />
          <JobSkillsAssistant available={aiAvailable} key={JSON.stringify(aiContext)} context={aiContext} jobId={id} onAccessDenied={setAccessDenied} onApprove={(required, preferred) => { setRequiredSkills(prev => [...new Set([...prev, ...required])]); setPreferredSkills(prev => [...new Set([...prev, ...preferred])]); }} />
        </SectionCard>
        <div className="hr-section form-actions recruitment-form-actions">
          <button type="button" className="btn-cancel" disabled={saving} onClick={()=>navigate("/app/recruitment/jobs")}>{t("recruitment.jobForm.cancel")}</button>
          {!isEdit && <button type="button" className="btn-secondary" disabled={saving} onClick={()=>void handleSubmit(true)}>{t("hrJobArchive.saveDraft")}</button>}
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : null}{isEdit ? t("recruitment.jobForm.update") : status === "draft" ? t("hrJobArchive.saveDraft") : status === "closed" ? t("common.actions.save") : t("recruitment.jobForm.publish")}</button>
        </div>
      </form>
    </div>
  );
};

const JobForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams(); const { user } = useAuth();
  const result = useAuditResource(id, "recruitment", getJobById, { refreshOnFocus: false });
  const key = JSON.stringify([id, user?.id, user?.role, user?.departmentId, user?.permissions]);
  if (!hasPermission(user, "recruitment", id ? "update" : "create")) return <HRResourceState status="forbidden" />;
  if (id && result.status !== "ready") return <HRResourceState status={result.status} retry={result.reload} />;
  if(result.data?.archivedAt) return <div className="hr-workspace"><p role="status">{t("hrJobArchive.readOnly")}</p><button type="button" onClick={()=>navigate(`/app/recruitment/jobs/${id}`)}>{t("recruitment.jobDetail.back")}</button></div>;
  return <JobFormFields key={key} initial={result.data ?? undefined} />;
};
export default JobForm;
