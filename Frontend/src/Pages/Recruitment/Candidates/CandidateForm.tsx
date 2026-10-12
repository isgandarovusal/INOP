import { UserRound } from "lucide-react";
import CvIntakeSourceReview from '../../../Components/CvIntakeSourceReview';
import {enqueueCvIntake,getCvIntake,approveCvIntake,downloadCvIntake,reconcileCvIntake,retryCvIntake} from '../../../Services/cvIntakeService';
import type {CvIntakeSource,CvIntakeApproval} from '../../../Services/cvIntakeService';
import {isAxiosError} from 'axios';
import {hrDocumentErrorKey} from '../../../Utils/hrDocumentError';
import CvProcessingApprovalReview from '../../../Components/CvProcessingApprovalReview';
import type {CvProcessingJob} from '../../../Services/cvProcessingService';
import CvReviewAssistant from "../../../Components/CvReviewAssistant";
import CvReviewEvidence from "../../../Components/CvReviewEvidence";
import CvHistoryEditor from "../../../Components/CvHistoryEditor";
import { useMounted } from "../../../Hooks/useMounted";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
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

const CandidateFormFields: React.FC<{ initial?: Candidate; job?: Job; processingJobId?: string; source?:CvIntakeSource }> = ({ initial, job, processingJobId, source }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const mounted = useMounted();
  const durable = !isEdit && import.meta.env.VITE_HR_DURABLE_INTAKE_ENABLED === 'true';
  const draft = source?.approvedProfile ?? source?.result?.parsed;
  const [intakeSource,setIntakeSource]=useState<CvIntakeSource|undefined>(source);
  const [intakeAttempt,setIntakeAttempt]=useState<CvIntakeApproval|'reserved'|null>(source?.approvalState?'reserved':null);
  const retrySourceCommand=useRef<{source:CvIntakeSource;command:string}|null>(null);
  const intakeCommand=useRef<{file:File;command:string}|null>(null);
  const savingSource=useRef<AbortController|null>(null);


  const [name, setName] = useState(initial?.name ?? draft?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? draft?.role ?? "");
  const [email, setEmail] = useState(initial?.email ?? draft?.email ?? "");
  const [phone, setPhone] = useState(initial?.phoneRaw || initial?.phone || draft?.phoneRaw || draft?.phone || "");
  const [education, setEducation] = useState(initial?.education ?? draft?.education ?? "");
  const [experience, setExperience] = useState<number | null>(initial?.experience ?? draft?.experience ?? null);
  const [employmentHistory, setEmploymentHistory] = useState<CvHistoryEntry[]>(initial?.employmentHistory ?? draft?.employmentHistory ?? []);
  const [educationHistory, setEducationHistory] = useState<CvHistoryEntry[]>(initial?.educationHistory ?? draft?.educationHistory ?? []);
  const [certificationHistory, setCertificationHistory] = useState<CvHistoryEntry[]>(initial?.certificationHistory ?? draft?.certificationHistory ?? []);
  const [review, setReview] = useState<CvReview | undefined>(initial?.cvReview ?? source?.result?.review);
  const [confirmReview, setConfirmReview] = useState(false);
  const [processingApproval,setProcessingApproval]=useState<CvProcessingApproval|undefined>();
  function applyProcessing(job:CvProcessingJob){
    const p=job.result!.parsed;
    for(const [field,setter] of [["name",setName],["role",setRole],["email",setEmail],["education",setEducation]] as const)if(typeof p[field]==="string"&&p[field])setter(p[field] as string);
    if(typeof p.phoneRaw==="string"&&p.phoneRaw)setPhone(p.phoneRaw);else if(typeof p.phone==="string"&&p.phone)setPhone(p.phone);
    if(typeof p.experience==="number")setExperience(p.experience);
    for(const [field,setter] of [["skills",setSkills],["languages",setLanguages],["certificates",setCertificates]] as const)if(Array.isArray(p[field])&&p[field].length)setter(old=>job.kind==='ai-review'?[...new Set([...old,...p[field] as string[]])]:p[field] as string[]);
    for(const [field,setter] of [["employmentHistory",setEmploymentHistory],["educationHistory",setEducationHistory],["certificationHistory",setCertificationHistory]] as const)if(Array.isArray(p[field])&&p[field].length)setter(p[field] as CvHistoryEntry[]);
    setReview(job.result!.review);setConfirmReview(false);
    setProcessingApproval({jobId:job.id,contextHash:job.source.contextHash,expectedJobUpdatedAt:job.updatedAt});
  }
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? draft?.skills ?? []);
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? draft?.languages ?? []);
  const [certificates, setCertificates] = useState<string[]>(initial?.certificates ?? draft?.certificates ?? []);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(initial?.cvOriginal?.originalName ?? initial?.cvUrl?.split("/").pop() ?? source?.original.originalName ?? null);
  
  const parsing = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 });
  const [sourceChanged, setSourceChanged] = useState(false), [sourceEpoch, setSourceEpoch] = useState(0);
  const [accessDenied, setAccessDenied] = useState<"unauthenticated" | "forbidden" | "not-found" | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [documentError,setDocumentError]=useState('');
  const [createRecovery,setCreateRecovery]=useState<{candidateId?:string}|null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { parsing.current.sequence++; parsing.current.controller?.abort(); savingSource.current?.abort(); }, []);

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
    if(saving||intakeAttempt)return;
    // A rejected selection does not replace the current source or its approval.
    if (file && !validateCvFile(file)) return;
    if (!file && !cvFile) return;
    setProcessingApproval(undefined);setConfirmReview(false);setIntakeSource(undefined);
    setDocumentError('');retrySourceCommand.current=null;
    setSourceEpoch(value => value + 1);
    parsing.current.controller?.abort();
    const sequence = ++parsing.current.sequence;
    setAiGenerating(false);
    if (!file) {
      setCvFile(null);
      return;
    }

    setSourceChanged(true);
    setCvFile(file);
    setExistingCvName(null);
    setError(null);
    setAiGenerating(true);
    const controller = new AbortController(); parsing.current.controller = controller;

    try {
      let parsed;
      if(durable){
        if(intakeCommand.current?.file!==file)intakeCommand.current={file,command:crypto.randomUUID()};
        let current=await enqueueCvIntake(file,intakeCommand.current.command,controller.signal);
        for(let attempt=0;attempt<30;attempt++){
          if(sequence!==parsing.current.sequence||controller.signal.aborted)return;
          setIntakeSource(current);
          if(!['queued','running','retry'].includes(current.state))break;
          await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{controller.signal.removeEventListener('abort',abort);resolve();},1000);controller.signal.addEventListener('abort',abort,{once:true});if(controller.signal.aborted)abort();});
          current=await getCvIntake(current.id,controller.signal);
        }
        if(sequence!==parsing.current.sequence||controller.signal.aborted)return;
        setIntakeSource(current);
        if(current.state!=='ready'||!current.result){setDocumentError(current.code==='OCR_REQUIRED'?'cvReview.unsupported_ocr':'hrIntake.notReady');return;}
        parsed={...current.result.parsed,extraction:current.result.review};
      }else parsed=await parseCandidateCv(file,controller.signal);
      if (sequence !== parsing.current.sequence || controller.signal.aborted) return;

      if (parsed.name) setName(parsed.name);
      if (parsed.role) setRole(parsed.role);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.phoneRaw || parsed.phone) setPhone(parsed.phoneRaw || parsed.phone || "");
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
      const status=isAxiosError(err)?err.response?.status:undefined;
      if(status===401||status===403){setAccessDenied(status===401?'unauthenticated':'forbidden');return;}
      const key=hrDocumentErrorKey(err);setError(null);setDocumentError(key);
      toast.error(t(key));
    } finally {
      if (sequence === parsing.current.sequence) setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving||intakeAttempt) return;
    if(durable&&(cvFile||intakeSource)&&(!intakeSource?.result||intakeSource.state!=="ready")){setDocumentError("hrIntake.notReady");return;}
    if((processingApproval||durable&&intakeSource)&&!confirmReview){setError("hrApproval.confirmRequired");return;}
    if (aiGenerating || saving || createRecovery) return;
    if (job && !cvFile && !intakeSource) { setError("hrStates.cvRequired"); return; }
    if (!name.trim()) {
      setError("recruitment.candidateForm.nameRequired");
      return;
    }

    setSaving(true);
    setDocumentError('');
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

      if(durable&&intakeSource){
        const input:CvIntakeApproval={confirmed:true,expectedHash:intakeSource.original.sha256,expectedUpdatedAt:intakeSource.updatedAt,profile:{name:payload.name,role:role.trim(),email:payload.email,phone,education,experience,skills,languages,certificates,employmentHistory,educationHistory,certificationHistory},...(job?{jobId:job.id}:{})};
        await confirmIntake(input);return;
      }
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
      if(isAxiosError(err)&&err.response?.data?.retrySafe===false&&['CV_PIPELINE_PARTIAL','CV_CREATE_UNCERTAIN'].includes(err.response.data.code)&&!isEdit){
        const candidateId=err.response.data.recovery?.candidateId;
        if(![401,403].includes(err.response.status)){setError(null);setCreateRecovery({candidateId:typeof candidateId==='string'&&/^[a-f0-9]{24}$/.test(candidateId)?candidateId:undefined});return;}
      }
      if(isAxiosError(err)){const status=err.response?.status;if(status===401||status===403||(status===404&&err.response?.data?.code!=="PROCESSING_JOB_UNAVAILABLE")){setAccessDenied(status===401?"unauthenticated":status===403?"forbidden":"not-found");return;}if(status===409||status===404){setConfirmReview(false);setError("hrProcessing.error.changed");return;}}
      setError(hrCrudErrorKey(err));
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  async function confirmIntake(input:CvIntakeApproval|'reserved'){
    if(!intakeSource)return;
    savingSource.current?.abort();const controller=new AbortController();savingSource.current=controller;setSaving(true);setDocumentError('');
    try{const result=input==='reserved'?await reconcileCvIntake(intakeSource.id,controller.signal):await approveCvIntake(intakeSource.id,input,controller.signal);if(controller.signal.aborted||!mounted.current)return;navigate('/app/recruitment/candidates/'+result.candidateId);}
    catch(failure){if(controller.signal.aborted||!mounted.current)return;const status=isAxiosError(failure)?failure.response?.status:undefined;if(status===401||status===403||status===404){setAccessDenied(status===401?'unauthenticated':status===403?'forbidden':'not-found');return;}if(status===400||status===422){setDocumentError('hrDocuments.invalid');return;}setIntakeAttempt(input);setDocumentError(status===409?'hrProcessing.error.changed':'hrIntake.uncertain');}
    finally{if(mounted.current&&!controller.signal.aborted)setSaving(false);}
  }
  async function retryIntakeSource(){
    if(!intakeSource||saving||aiGenerating||intakeAttempt)return;
    if(retrySourceCommand.current?.source.id!==intakeSource.id)retrySourceCommand.current={source:intakeSource,command:crypto.randomUUID()};
    const command=retrySourceCommand.current,controller=new AbortController(),sequence=++parsing.current.sequence;parsing.current.controller?.abort();parsing.current.controller=controller;setAiGenerating(true);setDocumentError('');setConfirmReview(false);
    try{
      let source=await retryCvIntake(command.source,command.command,controller.signal);
      for(let attempt=0;attempt<30;attempt++){
        if(controller.signal.aborted||sequence!==parsing.current.sequence||!mounted.current)return;setIntakeSource(source);
        if(!['queued','running','retry'].includes(source.state))break;
        await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{controller.signal.removeEventListener('abort',abort);resolve();},1000);controller.signal.addEventListener('abort',abort,{once:true});if(controller.signal.aborted)abort();});source=await getCvIntake(source.id,controller.signal);
      }
      if(controller.signal.aborted||sequence!==parsing.current.sequence||!mounted.current)return;setIntakeSource(source);
      if(source.result){setReview(source.result.review);setDocumentError('');}else setDocumentError(source.code==='OCR_REQUIRED'?'cvReview.unsupported_ocr':'hrIntake.notReady');
      // Never overwrite HR's manual fields with a reprocessing result.
      retrySourceCommand.current=null;
    }catch(failure){if(controller.signal.aborted||sequence!==parsing.current.sequence||!mounted.current)return;const status=isAxiosError(failure)?failure.response?.status:undefined;if(status===401||status===403||status===404)setAccessDenied(status===401?'unauthenticated':status===403?'forbidden':'not-found');else setDocumentError(status===409?'hrProcessing.error.changed':'hrIntake.retryUncertain');}
    finally{if(mounted.current&&!controller.signal.aborted&&sequence===parsing.current.sequence)setAiGenerating(false);}
  }
  async function intakeDownload(){if(!intakeSource)return;const controller=new AbortController();savingSource.current?.abort();savingSource.current=controller;try{await downloadCvIntake(intakeSource,controller.signal);}catch(failure){if(controller.signal.aborted||!mounted.current)return;const status=isAxiosError(failure)?failure.response?.status:undefined;if(status===401||status===403||status===404)setAccessDenied(status===401?'unauthenticated':status===403?'forbidden':'not-found');else setDocumentError(hrDocumentErrorKey(failure));}}

  if (accessDenied) return <HRResourceState status={accessDenied} />;
  if(initial?.archivedAt)return <section className="hr-workspace" role="status"><p>{t("hrArchive.readOnly")}</p><button type="button" onClick={()=>navigate(`/app/recruitment/candidates/${initial.id}`)}>{t("hrIntake.view")}</button></section>;
  const eligibleAiReview = id && initial?.cvOriginal?.sha256 && ((initial.cvReview?.version === "rules-2" && initial.cvReview.provider === "rule-based") || (initial.cvReview?.version === "ocr-rules-1" && initial.cvReview.provider === "tesseract-rules" && ["confirmed","corrected"].includes(initial.cvReview.reviewStatus??'') && initial.cvReview.processingApproval?.sourceHash===initial.cvOriginal.sha256)) && initial.cvReview.processingStatus === "extracted" && !sourceChanged && !cvFile && !aiGenerating && !saving;
  return (
    <div className="hr-workspace candidate-form-page">
      {job && !intakeAttempt && <p>{job.position}</p>}
      <PageHeader icon={<UserRound size={26} />}
        title={isEdit ? t("recruitment.candidateForm.editTitle") : t("recruitment.candidateForm.newTitle")}
        subtitle={t("recruitment.candidateForm.subtitle")}
      />

      {createRecovery&&<div role="alert" data-cv-create-recovery>
        <p>{t('hrDocuments.createUncertain')}</p>
        {createRecovery.candidateId&&hasPermission(user,'candidate','read')&&<button type="button" onClick={()=>navigate('/app/recruitment/candidates/'+createRecovery.candidateId)}>{t('hrDocuments.reviewCreated')}</button>}
      </div>}

      {(error||documentError) && (
        <div className="alert alert--danger" role="alert">
          <AlertCircle size={18} />
          <span data-hr-document-error={documentError||undefined}>{documentError?t(documentError):error?t(error):null}</span>
        </div>
      )}

        {durable&&intakeSource&&<section data-cv-intake aria-busy={aiGenerating}><p>{t(intakeSource.evidenceMode==='test'?'hrIntake.test':'hrIntake.notice')}</p><p role='status'>{t('hrIntake.state')}: {t('hrIntake.states.'+intakeSource.state)}</p><a href={'?'+new URLSearchParams({intakeId:intakeSource.id,...(job?{jobId:job.id}:{})}).toString()}>{t('hrIntake.resume')}</a>{['blocked','failed'].includes(intakeSource.state)&&!intakeSource.approvalState&&typeof intakeSource.attempts==='number'&&intakeSource.attempts<3&&(!intakeSource.manualRetries||intakeSource.manualRetries<2)&&['OCR_REQUIRED','INTAKE_SCAN_REQUIRED','INTAKE_RESULT','INTAKE_READBACK','INTAKE_PROVIDER_UNAVAILABLE','INTAKE_TIMEOUT'].includes(intakeSource.code)&&<button data-retry-intake-source type='button' disabled={saving||aiGenerating} onClick={()=>void retryIntakeSource()}>{t('hrIntake.retryProcessing')}</button>}{(intakeSource.state==='ready'||intakeSource.state==='blocked'&&intakeSource.code==='OCR_REQUIRED')&&<button type="button" disabled={saving} onClick={()=>void intakeDownload()}>{t('hrIntake.original')}</button>}</section>}
        {durable&&intakeSource&&<CvIntakeSourceReview source={intakeSource} linkedJob={Boolean(job)} recovering={Boolean(intakeAttempt)}/> }
        {durable&&cvFile&&!intakeSource&&!aiGenerating&&!intakeAttempt&&documentError&&<button data-retry-intake-upload type='button' disabled={saving} onClick={()=>void handleCvChange(cvFile)}>{t('hrIntake.retryUpload')}</button>}
        {intakeAttempt&&<section role="alert" data-intake-recovery><p>{t('hrIntake.uncertain')}</p><button type="button" disabled={saving} onClick={()=>void confirmIntake(intakeAttempt)}>{t('hrIntake.retryApproval')}</button></section>}
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
                    disabled={saving||Boolean(intakeAttempt)}
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
                    disabled={saving||Boolean(intakeAttempt)}
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
            {processingJobId ? null : eligibleAiReview && id && initial?.cvOriginal?.sha256 ? <CvReviewAssistant
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
            <fieldset className="candidate-fields" disabled={aiGenerating || saving || Boolean(intakeAttempt)}>
              <div className="form-group">
                <label className="candidate-field-label" htmlFor="candidate-name">
                  {t("recruitment.candidateForm.fullName")} <span className="candidate-field-required">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  id="candidate-name" name="name"
                  aria-label={t("recruitment.candidateForm.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label" htmlFor="candidate-role">
                  {t("recruitment.candidateForm.position")}
                </label>
                <input
                  type="text"
                  className="input"
                  id="candidate-role" name="role"
                  aria-label={t("recruitment.candidateForm.position")}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label" htmlFor="candidate-email">{t("recruitment.candidateForm.email")}</label>
                <input
                  type="email"
                  className="input"
                  id="candidate-email" name="email"
                  aria-label={t("recruitment.candidateForm.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label" htmlFor="candidate-phone">{t("recruitment.candidateForm.phone")}</label>
                <input
                  type="text"
                  className="input"
                  id="candidate-phone" name="phone"
                  aria-label={t("recruitment.candidateForm.phone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label" htmlFor="candidate-experience">{t("recruitment.candidateForm.experience")}</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  id="candidate-experience" name="experience"
                  aria-label={t("recruitment.candidateForm.experience")}
                  value={experience ?? ""}
                  onChange={(e) => setExperience(e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>

              <div className="form-group form-group--full">
                <TagInput
                  label={t("recruitment.candidateForm.skills")}
                  values={skills}
                  onChange={setSkills}
                  placeholder={t("recruitment.candidateForm.skillPlaceholder")}
                />
              </div>
              <div className="form-group"><label htmlFor="candidate-education">{t("cvReview.education")}</label><textarea id="candidate-education" name="education" className="input" value={education} onChange={e => setEducation(e.target.value)} /></div>
              <TagInput label={t("cvReview.languages")} values={languages} onChange={setLanguages} />
              <TagInput label={t("cvReview.certificates")} values={certificates} onChange={setCertificates} />
              <CvHistoryEditor label={t("cvReview.employmentHistory")} entries={employmentHistory} onChange={setEmploymentHistory} />
              <CvHistoryEditor label={t("cvReview.educationHistory")} entries={educationHistory} onChange={setEducationHistory} />
              <CvHistoryEditor label={t("cvReview.certificates")} entries={certificationHistory} onChange={setCertificationHistory} />
              {((isEdit && review?.version && !cvFile)||(durable&&intakeSource?.result)) && <label><input name="confirmReview" type="checkbox" checked={confirmReview} onChange={e => setConfirmReview(e.target.checked)} />{t("cvReview.confirm")}</label>}
            </fieldset>
          </section>

          {/* Actions */}
          <div className="candidate-form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
            >
              {t("recruitment.candidateForm.cancel")}
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving || aiGenerating || Boolean(createRecovery) || Boolean(intakeAttempt) || (durable&&Boolean(cvFile||intakeSource)&&intakeSource?.state!=="ready")}
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
  const intakeId=!id&&import.meta.env.VITE_HR_DURABLE_INTAKE_ENABLED==='true'?search.get('intakeId')??undefined:undefined;
  const intake=useAuditResource(intakeId,'candidate',getCvIntake,{refreshOnFocus:false});
  const result = useAuditResource(id, "candidate", getCandidateById, { refreshOnFocus: false });
  const processingJobId=id ? search.get("processingJobId") ?? undefined : undefined;
  const key = JSON.stringify([id, jobId, intakeId, intake.data?.id, processingJobId, result.data?.revision, result.data?.updatedAt, user?.id, user?.role, user?.departmentId, user?.permissions]);
  if (!hasPermission(user, "candidate", id ? "update" : "create")) return <HRResourceState status="forbidden" />;
  if (jobId && !hasPermission(user, "application", "create")) return <HRResourceState status="forbidden" />;
  if (jobId && job.status !== "ready") return <HRResourceState status={job.status} retry={job.reload} />;
  if (id && result.status !== "ready") return <HRResourceState status={result.status} retry={result.reload} />;
  if(intakeId&&intake.status!=='ready')return <HRResourceState status={intake.status} retry={intake.reload}/>;
  if(intakeId&&intake.data?.approvalState==='completed'&&intake.data.candidateId)return <IntakeCompleted id={intake.data.candidateId}/>;
  if(intakeId&&!['ready','blocked','failed'].includes(intake.data?.state??''))return <IntakePending source={intake.data!} reload={intake.reload}/>;
  return <CandidateFormFields key={key} source={intake.data} initial={result.data ?? undefined} job={job.data ?? undefined} processingJobId={processingJobId} />;
};
function IntakeCompleted({id}:{id:string}){const {t}=useTranslation(),navigate=useNavigate();return <section data-intake-completed><p>{t('hrIntake.completed')}</p><button type='button' onClick={()=>navigate('/app/recruitment/candidates/'+id)}>{t('hrDocuments.reviewCreated')}</button></section>;}
function IntakePending({source,reload}:{source:CvIntakeSource;reload:()=>void}){const {t}=useTranslation();return <section data-intake-resume><p>{t('hrIntake.states.'+source.state)}</p><p>{t('hrIntake.notReady')}</p><button type='button' onClick={reload}>{t('hrIntake.check')}</button></section>;}
export default CandidateForm;
