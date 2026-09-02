import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import { createJob, getJobById, updateJob } from "../../../Services/jobsService";
import type { JobStatus } from "../../../Types/recruitment";

const JobForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState(0);
  const [status, setStatus] = useState<JobStatus>("open");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getJobById(id).then((job) => {
      if (!job) return;
      setPosition(job.position);
      setDescription(job.description);
      setRequiredSkills(job.requiredSkills);
      setPreferredSkills(job.preferredSkills);
      setExperience(job.experience);
      setStatus(job.status);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position.trim()) {
      setError("Position title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { position, description, requiredSkills, preferredSkills, experience, status };
      if (isEdit && id) {
        await updateJob(id, input);
      } else {
        await createJob(input);
      }
      navigate("/app/recruitment/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit job" : "New job"}
        subtitle="Vacancy details used for candidate filtering and ranking."
      />

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Position</label>
            <input
              className="input-field"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Backend Developer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input-field input-field--textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsibilities and context for this role"
            />
          </div>

          <TagInput
            label="Required skills"
            values={requiredSkills}
            onChange={setRequiredSkills}
            placeholder="Type a skill and press Enter"
          />
          <TagInput
            label="Preferred skills"
            values={preferredSkills}
            onChange={setPreferredSkills}
            placeholder="Type a skill and press Enter"
          />

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Minimum experience (years)</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="form-error form-error--submit">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/app/recruitment/jobs")}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" /> Saving…
                </>
              ) : (
                <>
                  {isEdit ? "Save changes" : "Create job"} <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobForm;
