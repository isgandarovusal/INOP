import { getErrorMessage } from "../../../Utils/getErrorMessage";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  FileDown,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import {
  deleteCandidate,
  exportCandidatePdf,
  getCandidateById,
} from "../../../Services/candidatesService";
import type { Candidate } from "../../../Types/recruitment";
import { useTranslation } from "react-i18next";
import { hasPermission } from "../../../Utils/permissions";
import { useAuth } from "../../../Context/useAuth";
import { downloadBlob } from "../../../Utils/downloadFile";

const CandidateDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canUpdate = hasPermission(user, "candidate", "update");
  const canDelete = hasPermission(user, "candidate", "delete");
  const canExportPdf = hasPermission(user, "application", "read");

  const loadCandidate = useCallback(async () => {
    if (!id) {
      setError(t("recruitment.candidateDetail.notFound"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getCandidateById(id);

      if (!data) {
        setCandidate(null);
        setError(t("recruitment.candidateDetail.notFound"));
        return;
      }

      setCandidate(data);
    } catch (err: unknown) {
      setCandidate(null);
      setError(
        getErrorMessage(err, t("recruitment.candidateDetail.loadError")),
      );
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setCandidate(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getCandidateById(id);

        if (cancelled) return;

        if (!data) {
          setCandidate(null);
          setError(t("recruitment.candidateDetail.notFound"));
          return;
        }

        setCandidate(data);
      } catch (err: unknown) {
        if (cancelled) return;

        const error = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };

        setCandidate(null);
        setError(
          error.response?.data?.message ||
            error.message ||
            t("recruitment.candidateDetail.loadError"),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

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

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={32} />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="candidate-detail-page">
        <PageHeader
          title={t("recruitment.candidateDetail.title")}
          subtitle={t("recruitment.candidateDetail.subtitle")}
        />

        <div className="alert alert--danger">
          <AlertCircle size={18} />
          <span>
            {error || t("recruitment.candidateDetail.notFound")}
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={loadCandidate}
          >
            <RefreshCw size={16} />
            {t("recruitment.candidateDetail.retry")}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            {t("recruitment.candidateDetail.back")}
          </button>
        </div>
      </div>
    );
  }

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
                className="btn-secondary"
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
                className="btn-primary"
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
                className="btn-secondary"
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
              className="btn-secondary"
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
            <a
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FileText size={16} />
              {t("recruitment.candidateDetail.openCv")}
            </a>
          </p>
        )}
      </div>

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
