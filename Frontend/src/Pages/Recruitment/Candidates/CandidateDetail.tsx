import HRResourceState from "../../../Components/HRResourceState";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import { getErrorMessage } from "../../../Utils/getErrorMessage";
import React, { useState } from "react";
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
  deleteCandidate,
  exportCandidatePdf,
  getCandidateById,
  getCandidateCv,
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

  const fileContext = JSON.stringify([id, user?.id, user?.role, user?.departmentId, user?.permissions]);
  const cv = usePrivateFile(fileContext);
  const result = useAuditResource(id, "candidate", getCandidateById);
  const candidate = result.data;
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canUpdate = hasPermission(user, "candidate", "update");
  const canDelete = hasPermission(user, "candidate", "delete");
  const canExportPdf = hasPermission(user, "application", "read");

  const handleExportPdf = async () => {
    if (!candidate || !canExportPdf || exporting) return;

    try {
      setExporting(true);

      const blob = await exportCandidatePdf(candidate.id);

      downloadBlob(
        blob,
        `candidate-${candidate.id}.pdf`,
      );

      toast.success(t("recruitment.candidates.exportSuccess"));
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(
          err,
          t("recruitment.candidates.exportError"),
        ),
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate || !canDelete) return;

    const confirmed = window.confirm(
      `${candidate.name} ${t("recruitment.candidateDetail.deleteConfirm")}`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteCandidate(candidate.id);

      toast.success(t("recruitment.candidateDetail.deleted"));
      navigate("/app/recruitment/candidates");
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err, t("recruitment.candidateDetail.deleteError")),
      );
    } finally {
      setDeleting(false);
    }
  };

  if (result.status !== "ready" || !candidate) return <HRResourceState status={result.status} retry={result.reload} />;

  const cvUrl = candidate.cvUrl || "";

  return (
    <div className="candidate-detail-page">
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

            {canUpdate && (
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

            {canDelete && (
              <button
                type="button"
                className="btn-secondary candidate-detail-action candidate-detail-action--delete"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {t("recruitment.candidateDetail.delete")}
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

      <div
        style={{
          background: "var(--bg-card)",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          marginBottom: "20px",
        }}
      >
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
          {candidate.experience}{" "}
          {t("recruitment.candidateDetail.years")}
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
            <button type="button" disabled={cv.loading || !hasPermission(user, "candidate", "read")} onClick={() => void cv.open(signal => getCandidateCv(candidate.id, signal))}>
              <FileText size={16} />
              {cv.loading ? t("audit.checklist.builder.loading") : t("recruitment.candidateDetail.openCv")}
            </button>
            {cv.error && <span role="alert" data-file-error={cv.error}>{privateFileErrorMessage(cv.error)}</span>}
          </p>
        )}
      </div>

      {cv.url && <PrivateFilePreview url={cv.url} type={cv.type} name={cvUrl.split("/").pop() || "cv"} onClose={cv.close} />}

      <div
        style={{
          background: "var(--bg-card)",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          marginBottom: "20px",
        }}
      >
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

      <div
        style={{
          background: "var(--bg-card)",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
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
    </div>
  );
};

export default CandidateDetail;
