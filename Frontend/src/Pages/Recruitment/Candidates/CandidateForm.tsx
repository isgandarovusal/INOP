import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import {
  createCandidate,
  getCandidateById,
  updateCandidate,
} from "../../../Services/candidatesService";
import { parseCVText, calculateMatchScore } from "../../../Services/aiMatchService";

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
  const [dragActive, setDragActive] = useState(false);
  
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
          setExistingCvName(candidate.cvUrl ? "Mövcut CV Faylı" : null);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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
      // AI Auto-Status Routing Calculation
      const matchResult = calculateMatchScore({ skills, experience }, { skills: ["React", "TypeScript"], experience: 2 });
      
      const payload = {
        name,
        email,
        phone,
        education,
        experience,
        skills,
        languages,
        certificates,
        status: matchResult.suggestedStatus,
        aiScore: matchResult.score,
      };

      if (isEdit && id) {
        await updateCandidate(id, payload);
        toast.success("Namizəd məlumatları yeniləndi");
      } else {
        await createCandidate(payload as any);
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

      {/* AI Quick Paste Section */}
      <div style={{ background: "var(--bg-card)", padding: "16px", borderRadius: "8px", marginBottom: "20px", border: "1px solid var(--border-color)" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, fontSize: "16px" }}>
          <Sparkles size={18} color="var(--primary-color)" /> AI CV İdxalı & Analizi
        </h3>
        <textarea
          rows={4}
          style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
          placeholder="CV mətnini (LinkedIn profili, email və ya mətni) bura yapışdırın..."
          value={rawCvText}
          onChange={(e) => setRawCvText(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAiParse}
          disabled={aiParsing}
          style={{ marginTop: "8px", padding: "8px 16px", background: "var(--primary-color)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {aiParsing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          AI ilə CV-ni Analiz Et
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>Ad və Soyad *</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Telefon</label>
          <input
            type="text"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Təcrübə (İl)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
          />
        </div>

        <div className="form-group form-group--full">
          <label>Bacarıqlar (Skills)</label>
          <TagInput tags={skills} onChange={setSkills} placeholder="Bacarıq əlavə et..." />
        </div>

        <div className="form-actions" style={{ marginTop: "20px" }}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
            Ləğv Et
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {isEdit ? "Yenilə" : "AI Analizi İlə Saxla & ATS-ə Yönləndir"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CandidateForm;
