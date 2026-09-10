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

const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CandidateForm: React.FC = () => {
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
      toast.error("CV yalnız PDF, DOC və ya DOCX formatında ola bilər");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("CV faylının ölçüsü maksimum 5 MB ola bilər");
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
      toast.error("Zəhmət olmasa təhlil üçün CV mətnini daxil edin");
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
      toast.success("AI CV-ni uğurla analiz etdi və sahələri doldurdu!");
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ad və soyad mütləqdir");
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
        toast.success("Namizəd məlumatları yeniləndi");
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
        toast.success("Yeni namizəd AI analizi ilə Kanban lövhəsinə əlavə olundu!");
      }
      navigate("/app/recruitment/candidates");
    } catch (err: any) {
      setError(err.message || "Xəta baş verdi");
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
        title={isEdit ? "Namizədi Redaktə Et" : "Yeni Namizəd / CV Analizi"}
        subtitle="Mənbələrdən gələn CV-ləri AI ilə təhlil edin və avtomatik ATS-ə yerləşdirin"
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
                AI CV İdxalı & Analizi
              </h3>
              <p className="candidate-form-section__description">
                CV mətnini daxil edin və namizəd məlumatlarını AI ilə avtomatik çıxarın.
              </p>
            </div>
          </div>

          <div className="candidate-ai-card">
            <div className="candidate-ai-card__header">
              <Sparkles size={18} />
              <h4 className="candidate-ai-card__title">
                CV mətnini AI ilə analiz edin
              </h4>
            </div>

            <textarea
              className="candidate-ai-textarea"
              rows={4}
              placeholder="CV mətnini (LinkedIn profili, email və ya mətni) bura yapışdırın..."
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
              AI ilə CV-ni Analiz Et
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
                <h3 className="candidate-form-section__title">CV sənədi</h3>
                <p className="candidate-form-section__description">
                  Namizədin CV faylını əlavə edin və ya mövcud faylı dəyişdirin.
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
                    aria-label="CV faylını sil"
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
                    CV faylını buraya sürükləyin
                  </p>
                  <p className="candidate-cv-upload__hint">
                    PDF, DOC və DOCX — maksimum 5 MB
                  </p>
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: "14px" }}>
                <label className="btn-secondary" style={{ cursor: "pointer" }}>
                  <UploadCloud size={16} />
                  {cvFile || existingCvName ? "Başqa CV seç" : "CV seç"}
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
                  PDF, DOC və DOCX — maksimum 5 MB
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
                  Namizəd məlumatları
                </h3>
                <p className="candidate-form-section__description">
                  Əsas namizəd məlumatlarını daxil edin və ya AI tərəfindən çıxarılan məlumatları yoxlayın.
                </p>
              </div>
            </div>

            <div className="candidate-fields">
              <div className="form-group">
                <label className="candidate-field-label">
                  Ad və Soyad <span className="candidate-field-required">*</span>
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
                <label className="candidate-field-label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">Telefon</label>
                <input
                  type="text"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="candidate-field-label">Təcrübə (İl)</label>
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
                  Bacarıqlar (Skills)
                </label>
                <TagInput
                  label="Bacarıqlar"
                  values={skills}
                  onChange={setSkills}
                  placeholder="Bacarıq əlavə et..."
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
                ? "Yenilə"
                : "AI Analizi İlə Saxla & ATS-ə Yönləndir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateForm;
