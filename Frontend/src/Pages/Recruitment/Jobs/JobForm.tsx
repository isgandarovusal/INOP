import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import { createJob, getJobById, updateJob } from "../../../Services/jobsService";

const JobForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"full-time" | "part-time" | "contract">("full-time");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [requiredExperience, setRequiredExperience] = useState(1);
  const [status, setStatus] = useState<"open" | "closed" | "draft">("open");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getJobById(id)
      .then((job) => {
        if (job) {
          setTitle(job.title || "");
          setDepartment(job.department || "");
          setLocation(job.location || "");
          setType(job.type || "full-time");
          setDescription(job.description || "");
          setRequiredSkills(job.requiredSkills || []);
          setRequiredExperience(job.requiredExperience || 1);
          setStatus(job.status || "open");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAiSuggestRequirements = () => {
    if (!title.trim()) {
      toast.error("Zəhmət olmasa əvvəlcə Vakansiyanın Adını daxil edin");
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      let suggestedSkills = ["Git", "Problem Solving", "Teamwork"];
      const titleLower = title.toLowerCase();

      if (titleLower.includes("react") || titleLower.includes("frontend")) {
        suggestedSkills = ["React", "TypeScript", "JavaScript", "Tailwind CSS", "REST API"];
      } else if (titleLower.includes("backend") || titleLower.includes("node")) {
        suggestedSkills = ["Node.js", "Express", "PostgreSQL", "Docker", "REST API"];
      } else if (titleLower.includes("designer") || titleLower.includes("figma")) {
        suggestedSkills = ["Figma", "UI/UX", "Prototyping", "Design Systems"];
      }

      setRequiredSkills((prev) => Array.from(new Set([...prev, ...suggestedSkills])));
      setAiGenerating(false);
      toast.success("AI vakansiya üçün uyğun bacarıq tələblərini yaratdı!");
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vakansiya adı mütləqdir");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title,
        department,
        location,
        type,
        description,
        requiredSkills,
        requiredExperience,
        status,
      };

      if (isEdit && id) {
        await updateJob(id, payload);
        toast.success("Vakansiya yeniləndi");
      } else {
        await createJob(payload as any);
        toast.success("Yeni vakansiya yaradıldı!");
      }
      navigate("/app/recruitment/jobs");
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
    <div className="job-form-page">
      <PageHeader
        title={isEdit ? "Vakansiyanı Redaktə Et" : "Yeni Vakansiya Yaradın"}
        subtitle="AI tələb generatoru ilə vakansiya şərtlərini müəyyən edin"
      />

      {error && (
        <div className="alert alert--danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>Vakansiyanın Adı *</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="məs: Senior React Developer"
            required
          />
        </div>

        <div className="form-group">
          <label>Departament</label>
          <input
            type="text"
            className="input"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Tələb Olunan Təcrübə (İl)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={requiredExperience}
            onChange={(e) => setRequiredExperience(Number(e.target.value))}
          />
        </div>

        <div className="form-group form-group--full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ margin: 0 }}>Tələb Olunan Bacarıqlar (Skills)</label>
            <button
              type="button"
              onClick={handleAiSuggestRequirements}
              disabled={aiGenerating}
              style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 500 }}
            >
              {aiGenerating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} AI ilə Tələbləri Generator Et
            </button>
          </div>
          <TagInput tags={requiredSkills} onChange={setRequiredSkills} placeholder="Tələb olunan bacarıq..." />
        </div>

        <div className="form-group form-group--full">
          <label>Vakansiya Haqqında</label>
          <textarea
            rows={4}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-actions" style={{ marginTop: "20px" }}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
            Ləğv Et
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {isEdit ? "Yenilə" : "Vakansiyanı Dərc Et"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobForm;
