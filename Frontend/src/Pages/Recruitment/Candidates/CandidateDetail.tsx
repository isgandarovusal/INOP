import HRConfirmDialog from '../../../Components/HRConfirmDialog';
import CandidateArchiveHistory from '../../../Components/CandidateArchiveHistory';
import CvProcessingPanel from '../../../Components/CvProcessingPanel';
import { useHRActionContext } from "../../../Hooks/useHRActionContext";
import CandidateApplicationMatches from "../../../Components/CandidateApplicationMatches";
import CvReviewEvidence from "../../../Components/CvReviewEvidence";
import HRResourceState from "../../../Components/HRResourceState";
import { auditErrorStatus, useAuditResource } from "../../../Hooks/useAuditResource";
import { hrCrudErrorKey } from "../../../Utils/hrCrudError";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileDown,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import {
  deleteCandidate, restoreCandidate,
  exportCandidatePdf,
  getCandidateById,
  getCandidateCv,
  getCandidateCvPreview,
} from "../../../Services/candidatesService";
import { useTranslation } from "react-i18next";
import { hasPermission } from "../../../Utils/permissions";
import { useAuth } from "../../../Context/useAuth";
import { downloadBlob } from "../../../Utils/downloadFile";

import PrivateFilePreview from "../../../Components/PrivateFilePreview";
import { usePrivateFile, privateFileErrorMessage } from "../../../Hooks/usePrivateFile";

const CandidateDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const result = useAuditResource(id, "candidate", getCandidateById);
  const candidate = result.data;
  const [archiveConfirm, setArchiveConfirm]=useState<string|null>(null);
  const fileContext = JSON.stringify([id, candidate?.cvUrl, candidate?.cvOriginal?.sha256, user?.id, user?.role, user?.departmentId, user?.permissions]);
  const cv = usePrivateFile(fileContext);
  const context = useHRActionContext(JSON.stringify([id, candidate?.revision, candidate?.cvUrl, candidate?.cvOriginal?.sha256]));
  const controllers = useRef(new Map<AbortController, string>());
  useEffect(() => {
    const pending = controllers.current;
    const key = context.key;
    return () => { for (const [controller, started] of pending) if (started === key) { controller.abort(); pending.delete(controller); } };
  }, [context.key]);
  const [busy, setBusy] = useState({ key: '', deleting: false, exporting: false });
  const [actionError, setActionError] = useState<{ key: string; status: ReturnType<typeof auditErrorStatus> }>({ key: '', status: 'ready' });
  const deleting = busy.key === context.key && busy.deleting, exporting = busy.key === context.key && busy.exporting;
  const setDeleting = (deleting: boolean) => setBusy(previous => ({ key: context.key, exporting: previous.key === context.key && previous.exporting, deleting }));
  const setExporting = (exporting: boolean) => setBusy(previous => ({ key: context.key, deleting: previous.key === context.key && previous.deleting, exporting }));

  const canUpdate = hasPermission(user, "candidate", "update");
  const canDelete = hasPermission(user, "candidate", "delete");
  const canExportPdf = hasPermission(user, "application", "read");

  const handleExportPdf = async () => {
    if (!candidate || !canExportPdf || exporting) return;
    const key = context.key, controller = new AbortController(); controllers.current.set(controller, key);
    setActionError({ key, status: 'ready' });

    try {
      setExporting(true);

      const blob = await exportCandidatePdf(candidate.id, controller.signal);
      if (context.current.current !== key || controller.signal.aborted) return;

      downloadBlob(
        blob,
        `candidate-${candidate.id}.pdf`,
      );

      toast.success(t("recruitment.candidates.exportSuccess"));
    } catch (err: unknown) {
      if (context.current.current !== key || controller.signal.aborted) return;
      setActionError({ key, status: auditErrorStatus(err) });
      toast.error(
        t(hrCrudErrorKey(err)),
      );
    } finally {
      controllers.current.delete(controller);
      if (context.current.current === key) setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate || !canDelete) return;

    const key = context.key, controller = new AbortController(); controllers.current.set(controller, key);
    setActionError({ key, status: 'ready' });

    try {
      setDeleting(true);
      await deleteCandidate(candidate.id, controller.signal, candidate.revision);
      if (context.current.current !== key || controller.signal.aborted) return;

      toast.success(t("hrArchive.archived"));
      navigate("/app/recruitment/candidates");
    } catch (err: unknown) {
      if (context.current.current !== key || controller.signal.aborted) return;
      setActionError({ key, status: auditErrorStatus(err) });
      toast.error(
        t(hrCrudErrorKey(err)),
      );
    } finally {
      controllers.current.delete(controller);
      if (context.current.current === key) setDeleting(false);
    }
  };

  const handleRestore=async()=>{
    if(!candidate||!canUpdate||deleting)return;const key=context.key,controller=new AbortController();controllers.current.set(controller,key);setDeleting(true);
    try{await restoreCandidate(candidate.id,candidate.revision??0,controller.signal);if(context.current.current===key&&!controller.signal.aborted){toast.success(t('hrArchive.restored'));result.reload();}}
    catch(failure){if(context.current.current===key&&!controller.signal.aborted)setActionError({key,status:auditErrorStatus(failure)});}
    finally{controllers.current.delete(controller);if(context.current.current===key)setDeleting(false);}
  };
  if (result.status !== "ready" || !candidate) return <HRResourceState status={result.status} retry={result.reload} />;

  const cvUrl = candidate.cvUrl || "";

  return (
    <div className="hr-workspace candidate-detail-page">
      <PageHeader
        title={candidate.name}
        subtitle={
          candidate.email ||
          t("recruitment.candidateDetail.publicProfile")
        }
        actions={
          <>
            {canExportPdf && (
              <button
                type="button"
                className="btn-secondary candidate-detail-action candidate-detail-action--export"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <FileDown size={16} />
                )}
                {exporting
                  ? t("recruitment.candidates.exporting")
                  : t("recruitment.candidates.exportPdf")}
              </button>
            )}

            {canUpdate && !candidate.archivedAt && (
              <button
                type="button"
                className="btn-primary candidate-detail-action candidate-detail-action--edit"
                onClick={() =>
                  navigate(
                    `/app/recruitment/candidates/${candidate.id}/edit`,
                  )
                }
              >
                {t("recruitment.candidateDetail.edit")}
              </button>
            )}

            {candidate.archivedAt&&canUpdate&&<button type="button" className="btn-secondary" onClick={()=>{void handleRestore();}} disabled={deleting}>{t('hrArchive.restore')}</button>}
            {canDelete && !candidate.archivedAt && (
              <button
                type="button"
                className="btn-secondary candidate-detail-action candidate-detail-action--delete"
                onClick={()=>setArchiveConfirm(context.key)}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {t("hrArchive.archive")}
              </button>
            )}

            <button
              type="button"
              className="btn-secondary candidate-detail-action candidate-detail-action--back"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              {t("recruitment.candidateDetail.back")}
            </button>
          </>
        }
      />
      {archiveConfirm===context.key&&<HRConfirmDialog title={t('hrArchive.archive')} message={t('hrArchive.confirm',{name:candidate.name})} confirmLabel={t('hrArchive.archive')} loading={deleting} onConfirm={()=>{void handleDelete();}} onCancel={()=>setArchiveConfirm(null)}/>}
      {candidate.archivedAt&&<p className="hr-notice" role="status">{t('hrArchive.readOnly')}</p>}
      {actionError.key === context.key && actionError.status !== "ready" && <section data-candidate-action-error><HRResourceState status={actionError.status} retry={result.reload} /></section>}
      <div className="detail-card hr-profile-facts">
        <span className="hr-person-avatar hr-person-avatar--profile" aria-hidden="true">{candidate.name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toLocaleUpperCase()}</span>
        <h4>{t("recruitment.candidateDetail.mainInformation")}</h4>

        <p>
          <strong>{t("recruitment.candidateForm.position")}:</strong>{" "}
          {candidate.role ||
            t("recruitment.candidateDetail.notProvided")}
        </p>

        <p>
          <strong>{t("recruitment.candidateDetail.email")}:</strong>{" "}
          {candidate.email ||
            t("recruitment.candidateDetail.notProvided")}
        </p>

        <p>
          <strong>{t("recruitment.candidateDetail.phone")}:</strong>{" "}
          {candidate.phone ||
            t("recruitment.candidateDetail.notProvided")}
        </p>

        <p>
          <strong>
            {t("recruitment.candidateDetail.experience")}:
          </strong>{" "}
          {candidate.experience == null ? t("cvReview.unknown") : `${candidate.experience} ${t("recruitment.candidateDetail.years")}`}
        </p>

        <p>
          <strong>
            {t("recruitment.candidateDetail.education")}:
          </strong>{" "}
          {candidate.education ||
            t("recruitment.candidateDetail.notProvided")}
        </p>

        <p>
          <strong>
            {t("recruitment.candidateDetail.currentAtsStatus")}:
          </strong>{" "}
          <Badge tone="info">
            {t(
              `recruitment.candidateStatus.${candidate.status}`,
            )}
          </Badge>
        </p>

        {cvUrl && (
          <p>
            <strong>
              {t("recruitment.candidateDetail.cv")}:
            </strong>{" "}
            <button type="button" disabled={cv.loading || !hasPermission(user, "candidate", "read")} onClick={() => void cv.open(async signal => {
              const blob = await getCandidateCv(candidate.id, signal);
              if (candidate.cvUrl?.endsWith('.docx')) {
                try {
                  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
                  if (signal.aborted) throw new Error('Canceled preview.');
                  if (candidate.cvOriginal?.sha256 && candidate.cvOriginal.sha256 !== hash) throw Object.assign(new Error('CV changed.'), { response: { status: 409 } });
                  const parsed = await getCandidateCvPreview(candidate.id, hash, candidate.revision ?? 0, signal);
                  return { blob, text: [...parsed.warnings.map(code => t(`cvReview.${code}`)), parsed.rawText].join('\n\n') };
                } catch (error) {
                  const status = auditErrorStatus(error);
                  if (signal.aborted || status === 'unauthenticated' || status === 'forbidden' || status === 'not-found') throw error;
                  if ((error as { response?: { status?: number } })?.response?.status === 409) { result.reload(); throw error; }
                  return { blob, text: t('cvReview.previewUnavailable') };
                }
              }
              return blob;
            })}>
              <FileText size={16} />
              {cv.loading ? t("audit.checklist.builder.loading") : t("recruitment.candidateDetail.openCv")}
            </button>
            {cv.error && <span role="alert" data-file-error={cv.error}>{privateFileErrorMessage(cv.error)}</span>}
          </p>
        )}
      </div>

      {cv.url && <PrivateFilePreview url={cv.url} type={cv.type} text={cv.text} name={candidate.cvOriginal?.originalName || cvUrl.split("/").pop() || "cv"} onClose={cv.close} />}

      <div className="detail-card">
        <h4>{t("recruitment.candidateDetail.skills")}</h4>

        {candidate.skills.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {candidate.skills.map((skill) => (
              <Badge key={skill} tone="info">
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <span style={{ color: "var(--text-secondary)" }}>
            {t("recruitment.candidateDetail.notProvided")}
          </span>
        )}
      </div>

      <div className="detail-card">
        <h4>{t("recruitment.candidateDetail.additionalInformation")}</h4>

        <p>
          <strong>
            {t("recruitment.candidateDetail.languages")}:
          </strong>{" "}
          {candidate.languages.length > 0
            ? candidate.languages.join(", ")
            : t("recruitment.candidateDetail.notProvided")}
        </p>

        <p>
          <strong>
            {t("recruitment.candidateDetail.certificates")}:
          </strong>{" "}
          {candidate.certificates.length > 0
            ? candidate.certificates.join(", ")
            : t("recruitment.candidateDetail.notProvided")}
        </p>
      </div>
      <CvReviewEvidence review={candidate.cvReview} />
      {!candidate.archivedAt&&<CvProcessingPanel key={JSON.stringify([context.key, candidate.updatedAt])} candidate={candidate} onAccessDenied={result.reload} />}
      <CandidateArchiveHistory key={JSON.stringify([id,candidate.revision])} id={candidate.id} revision={candidate.revision}/>
      <CandidateApplicationMatches candidateId={candidate.id} />
      {candidate.phoneRaw && <p>{t("cvReview.phoneRaw")}: {candidate.phoneRaw}</p>}
      {candidate.cvOriginal?.originalName && <p>{candidate.cvOriginal.originalName} · {candidate.cvOriginal.size} bytes</p>}


    </div>
  );
};

export default CandidateDetail;
