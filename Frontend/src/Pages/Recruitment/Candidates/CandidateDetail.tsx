import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import { getCandidateById } from "../../../Services/candidatesService";
import { calculateMatchScore, type MatchResult } from "../../../Services/aiMatchService";
import type { Candidate } from "../../../Types/recruitment";
import { useTranslation } from "react-i18next";

const CandidateDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (!id) return;
    getCandidateById(id)
      .then((data) => {
        if (data) {
          setCandidate(data);
          // Nümunə vakansiya şərtləri ilə AI Match hesablama
          const result = calculateMatchScore(
            { skills: data.skills, experience: data.experience },
            { skills: ["React", "TypeScript", "Node.js", "SQL"], experience: 2 }
          );
          setMatchResult(result);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={32} />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="alert alert--danger">
        <AlertCircle size={18} />
        <span>{t("recruitment.candidateDetail.notFound")}</span>
      </div>
    );
  }

  return (
    <div className="candidate-detail-page">
      <PageHeader
        title={candidate.name}
        subtitle={candidate.email || t("recruitment.candidateDetail.publicProfile")}
        actions={
          <>
            <button
              className="btn-primary"
              onClick={() => navigate(`/app/recruitment/candidates/${candidate.id}/edit`)}
            >
              Redaktə et
            </button>

            <button className="btn-primary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> {t("recruitment.candidateDetail.back")}
            </button>
          </>
        }
      />

      {/* AI Match Breakdown Card */}
      {matchResult && (
        <div style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "8px", marginBottom: "24px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles color="var(--primary-color)" size={20} /> {t("recruitment.candidateDetail.aiAnalysis")}
            </h3>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: matchResult.score >= 70 ? "#22c55e" : "#f59e0b" }}>
              {matchResult.score}% {t("recruitment.candidateDetail.match")}
            </span>
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
            <strong>{t("recruitment.candidateDetail.aiSummary")}:</strong> {matchResult.aiSummary}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#22c55e", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} /> {t("recruitment.candidateDetail.matchedSkills")}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {matchResult.matchedSkills.length > 0 ? (
                  matchResult.matchedSkills.map((s) => <Badge key={s} tone="success">{s}</Badge>)
                ) : (
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t("recruitment.candidateDetail.noMatchedSkills")}</span>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                <XCircle size={16} /> {t("recruitment.candidateDetail.missingSkills")}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {matchResult.missingSkills.length > 0 ? (
                  matchResult.missingSkills.map((s) => <Badge key={s} tone="danger">{s}</Badge>)
                ) : (
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t("recruitment.candidateDetail.allRequiredSkills")}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profil Detalları */}
      <div style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
        <h4>{t("recruitment.candidateDetail.mainInformation")}</h4>
        <p><strong>{t("recruitment.candidateDetail.phone")}:</strong> {candidate.phone || t("recruitment.candidateDetail.notProvided")}</p>
        <p><strong>{t("recruitment.candidateDetail.experience")}:</strong> {candidate.experience} {t("recruitment.candidateDetail.years")}</p>
        <p><strong>{t("recruitment.candidateDetail.education")}:</strong> {candidate.education || t("recruitment.candidateDetail.notProvided")}</p>
        <p><strong>{t("recruitment.candidateDetail.currentAtsStatus")}:</strong> <Badge tone="info">{t(`recruitment.candidateStatus.${candidate.status}`)}</Badge></p>
      </div>
    </div>
  );
};

export default CandidateDetail;
