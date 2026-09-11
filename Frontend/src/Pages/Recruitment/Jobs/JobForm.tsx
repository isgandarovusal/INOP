import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import { createJob, getJobById, updateJob } from "../../../Services/jobsService";

const JobForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState(1);
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
          setPosition(job.position || "");
          setDescription(job.description || "");
          setRequiredSkills(job.requiredSkills || []);
          setExperience(job.experience || 1);
          setStatus(job.status || "open");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAiSuggestRequirements = () => {
    if (!position.trim()) {
      toast.error(t("recruitment.jobForm.aiPositionRequired"));
      return;
    }

    setAiGenerating(true);

    setTimeout(() => {
      let suggestedSkills = ["Git", "Problem Solving", "Teamwork"];
      const titleLower = position.toLowerCase();

      if (titleLower.includes("react") || titleLower.includes("frontend")) {
        suggestedSkills = ["React", "TypeScript", "JavaScript", "Tailwind CSS", "REST API"];
      } else if (titleLower.includes("backend") || titleLower.includes("node")) {
        suggestedSkills = ["Node.js", "Express", "PostgreSQL", "Docker", "REST API"];
      } else if (titleLower.includes("designer") || titleLower.includes("figma")) {
        suggestedSkills = ["Figma", "UI/UX", "Prototyping", "Design Systems"];
      }

      setRequiredSkills((prev) =>
        Array.from(new Set([...prev, ...suggestedSkills])),
      );
      setAiGenerating(false);
      toast.success(t("recruitment.jobForm.aiSuccess"));
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!position.trim()) {
      setError(t("recruitment.jobForm.positionRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        position,
        description,
        requiredSkills,
        preferredSkills: [],
        experience,
        status,
      };

      if (isEdit && id) {
        await updateJob(id, payload);
        toast.success(t("recruitment.jobForm.updated"));
      } else {
        await createJob(payload as any);
        toast.success(t("recruitment.jobForm.created"));
      }

      navigate("/app/recruitment/jobs");
    } catch (err: any) {
      setError(err.message || t("recruitment.jobForm.genericError"));
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
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>{t("recruitment.jobForm.position")}</label>
          <input
            type="text"
            className="input"
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

            <button
              type="button"
              onClick={handleAiSuggestRequirements}
              disabled={aiGenerating}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-color)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {aiGenerating ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {t("recruitment.jobForm.generateRequirements")}
            </button>
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
            rows={4}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate(-1)}
          >
            {t("recruitment.jobForm.cancel")}
          </button>

          <button
            type="submit"
            className="btn btn--primary"
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

export default JobForm;
