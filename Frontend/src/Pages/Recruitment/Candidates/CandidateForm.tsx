import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import {
  createCandidate,
  getCandidateById,
  updateCandidate,
} from "../../../Services/candidatesService";
import { parseCVText, calculateMatchScore } from "../../../Services/aiMatchService";
import type { CandidateStatus } from "../../../Types/recruitment";
import { useTranslation } from "react-i18next";

const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CandidateForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [certificates, setCertificates] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(null);
  // AI Raw Text Extraction State
  const [rawCvText, setRawCvText] = useState("");
  const [aiParsing, setAiParsing] = useState(false);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getCandidateById(id)
      .then((candidate) => {
        if (candidate) {
          setName(candidate.name || "");
          setEmail(candidate.email || "");
          setPhone(candidate.phone || "");
          setEducation(candidate.education || "");
          setExperience(candidate.experience || 0);
          setSkills(candidate.skills || []);
          setLanguages(candidate.languages || []);
          setCertificates(candidate.certificates || []);
          setExistingCvName(candidate.cv?.name || null);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  const handleCvChange = (file: File | null) => {
    if (!file) {
      setCvFile(null);
      return;
    }

    if (validateCvFile(file)) {
      setCvFile(file);
      setExistingCvName(null);
    }
  };

  const handleAiParse = () => {
    if (!rawCvText.trim()) {
      toast.error(t("recruitment.candidateForm.enterCvText"));
      return;
    }
    setAiParsing(true);
    setTimeout(() => {
      const parsed = parseCVText(rawCvText);
      if (parsed.extractedSkills.length > 0) {
        setSkills((prev) => Array.from(new Set([...prev, ...parsed.extractedSkills])));
      }
      if (parsed.extractedExperience) {
        setExperience(parsed.extractedExperience);
      }
      setAiParsing(false);
      toast.success(t("recruitment.candidateForm.aiSuccess"));
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("recruitment.candidateForm.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name,
        email,
        phone,
        education,
        experience,
        skills,
        languages,
        certificates,
        cvFile,
      };

      if (isEdit && id) {
        // Edit zamanı mövcud ATS statusunu qoruyuruq.
        await updateCandidate(id, payload);
        toast.success(t("recruitment.candidateForm.updated"));
      } else {
        // Yeni namizəd üçün AI uyğunlaşdırma ilə ilkin ATS statusu təyin olunur.
        const matchResult = calculateMatchScore(
          { skills, experience },
          {
            skills: ["React", "TypeScript", "Node.js", "SQL"],
            experience: 2,
          },
        );

        await createCandidate({
          ...payload,
          status: (
            matchResult.suggestedStatus === "applied"
              ? "new"
              : matchResult.suggestedStatus
          ) as CandidateStatus,
        });
        toast.success(t("recruitment.candidateForm.created"));
      }
      navigate("/app/recruitment/candidates");
    } catch (err: any) {
      setError(err.message || t("recruitment.candidateForm.genericError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={32} />
      </div>
    );
  }

  return (
    <div className="candidate-form-page">
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

      {/* AI CV Import & Analysis */}
      <div className="candidate-form-card">
        <section className="candidate-form-section">
          <div className="candidate-form-section__header">
            <div className="candidate-form-section__icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="candidate-form-section__title">
                {t("recruitment.candidateForm.aiImportTitle")}
              </h3>
              <p className="candidate-form-section__description">
                {t("recruitment.candidateForm.aiImportDescription")}
              </p>
            </div>
          </div>

          <div className="candidate-ai-card">
            <div className="candidate-ai-card__header">
              <Sparkles size={18} />
              <h4 className="candidate-ai-card__title">
                {t("recruitment.candidateForm.aiAnalyzeTitle")}
              </h4>
            </div>

            <textarea
              className="candidate-ai-textarea"
              rows={4}
              placeholder={t("recruitment.candidateForm.aiPlaceholder")}
              value={rawCvText}
              onChange={(e) => setRawCvText(e.target.value)}
            />

            <button
              type="button"
              className="btn-primary candidate-ai-button"
              onClick={handleAiParse}
              disabled={aiParsing}
            >
              {aiParsing ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {t("recruitment.candidateForm.analyzeCv")}
            </button>
          </div>
        </section>

        <form onSubmit={handleSubmit}>
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
                handleCvChange(e.dataTransfer.files?.[0] || null);
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
                    onClick={() => setCvFile(null)}
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
                <label className="btn-secondary" style={{ cursor: "pointer" }}>
                  <UploadCloud size={16} />
                  {cvFile || existingCvName ? t("recruitment.candidateForm.chooseAnotherCv") : t("recruitment.candidateForm.chooseCv")}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: "none" }}
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

            <div className="candidate-fields">
              <div className="form-group">
                <label className="candidate-field-label">
                  {t("recruitment.candidateForm.fullName")} <span className="candidate-field-required">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">{t("recruitment.candidateForm.email")}</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">{t("recruitment.candidateForm.phone")}</label>
                <input
                  type="text"
                  className="input"
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
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
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
            </div>
          </section>

          {/* Actions */}
          <div className="candidate-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              Ləğv Et
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="spin" /> : null}
              {isEdit
                ? t("recruitment.candidateForm.update")
                : t("recruitment.candidateForm.saveAndRedirect")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateForm;
