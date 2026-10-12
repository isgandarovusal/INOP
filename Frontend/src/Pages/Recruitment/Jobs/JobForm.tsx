import AIAvailability from "../../../Components/AIAvailability";
import JobSkillsAssistant from "../../../Components/JobSkillsAssistant";
import RecruitmentLocationFields from "../../../Components/RecruitmentLocationFields";
import { useMounted } from "../../../Hooks/useMounted";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import {isAxiosError} from "axios";
import React, { useState } from "react";
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
  const [accessDenied, setAccessDenied] = useState<"unauthenticated" | "forbidden" | "not-found" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!position.trim()) {
      setError("recruitment.jobForm.positionRequired");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        position, brandId, branchId,
        description,
        requiredSkills,
        preferredSkills, requiredEducation, requiredCertificates,
        department, location, type,
        experience,
        status,
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
      if (mounted.current) setSaving(false);
    }
  };

  if (accessDenied) return <HRResourceState status={accessDenied} />;
  const aiContext = { title: position, description, brandId, branchId, workplace: location, experienceYears: experience, requiredSkills, preferredSkills };
  return (
    <div className="hr-workspace job-form-page">
      <PageHeader
        title={
          isEdit
            ? t("recruitment.jobForm.editTitle")
            : t("recruitment.jobForm.newTitle")
        }
        subtitle={t("recruitment.jobForm.subtitle")}
      />

      {error && (
        <div className="alert alert--danger">
          <AlertCircle size={18} />
          <span>{t(error)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <RecruitmentLocationFields brandId={brandId} branchId={branchId} onChange={(brand, branch) => { setBrandId(brand); setBranchId(branch); }} />
        <div className="form-group"><label htmlFor="job-department">{t("hrStates.department")}</label><input id="job-department" value={department} onChange={e => setDepartment(e.target.value)} required /></div>
        <div className="form-group"><label htmlFor="job-location">{t("hrStates.location")}</label><input id="job-location" value={location} onChange={e => setLocation(e.target.value)} required /></div>
        <div className="form-group"><label htmlFor="job-type">{t("hrStates.type")}</label><select id="job-type" value={type} onChange={e => setType(e.target.value as JobType)}>{["Full-time", "Part-time", "Contract", "Internship"].map(value => <option key={value}>{value}</option>)}</select></div>
        <div className="form-group"><label htmlFor="job-status">{t("recruitment.jobs.status")}</label><select id="job-status" value={status} onChange={e => setStatus(e.target.value as typeof status)}>{["open", "closed", "draft"].map(value => <option key={value} value={value}>{t(`recruitment.jobStatus.${value}`)}</option>)}</select></div>
        <div className="form-group form-group--full"><TagInput label={t("hrMatch.requiredEducation")} values={requiredEducation} onChange={setRequiredEducation} /><TagInput label={t("hrMatch.requiredCertificates")} values={requiredCertificates} onChange={setRequiredCertificates} /></div>
        <div className="form-group form-group--full"><TagInput label={t("hrStates.preferredSkills")} values={preferredSkills} onChange={setPreferredSkills} /></div>
        <div className="form-group">
          <label>{t("recruitment.jobForm.position")}</label>
          <input
            type="text"
            className="input"
            name="position"
            aria-label={t("recruitment.jobForm.position")}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder={t("recruitment.jobForm.positionPlaceholder")}
            required
          />
        </div>

        <div className="form-group">
          <label>{t("recruitment.jobForm.experience")}</label>
          <input
            type="number"
            className="input"
            min={0}
            name="experience"
            aria-label={t("recruitment.jobForm.experience")}
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
          />
        </div>

        <div className="form-group form-group--full">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <label style={{ margin: 0 }}>
              {t("recruitment.jobForm.requiredSkills")}
            </label>


          </div>

          <TagInput
            label={t("recruitment.jobForm.tagLabel")}
            values={requiredSkills}
            onChange={setRequiredSkills}
            placeholder={t("recruitment.jobForm.skillPlaceholder")}
          />
        </div>

        <div className="form-group form-group--full">
          <label>{t("recruitment.jobForm.description")}</label>
          <textarea
            aria-label={t("recruitment.jobForm.description")}
            rows={4}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group form-group--full"><AIAvailability /></div>
        <JobSkillsAssistant key={JSON.stringify(aiContext)} context={aiContext} jobId={id} onAccessDenied={setAccessDenied} onApprove={(required, preferred) => { setRequiredSkills(prev => [...new Set([...prev, ...required])]); setPreferredSkills(prev => [...new Set([...prev, ...preferred])]); }} />
        <div className="form-actions recruitment-form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            {t("recruitment.jobForm.cancel")}
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {isEdit
              ? t("recruitment.jobForm.update")
              : t("recruitment.jobForm.publish")}
          </button>
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
