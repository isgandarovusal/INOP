import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Camera, Loader2, Paperclip, X } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import { createAudit } from "../../../Services/auditsService";
import { getRestaurants } from "../../../Services/restaurantsService";
import type { Restaurant, AuditScores } from "../../../Types/audit";

const AUDIT_TYPES = ["Routine", "Follow-up", "Surprise", "Complaint-driven"];

const SCORE_FIELDS: { key: keyof AuditScores; label: string }[] = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "service", label: "Service" },
  { key: "food", label: "Food" },
  { key: "staff", label: "Staff" },
];

const AuditForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState(searchParams.get("restaurantId") ?? "");
  const [auditType, setAuditType] = useState(AUDIT_TYPES[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState<AuditScores>({
    cleanliness: 8,
    service: 8,
    food: 8,
    staff: 8,
  });
  const [comments, setComments] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRestaurants().then((result) => {
      setRestaurants(result);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) {
      setError("Please select a restaurant.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAudit({ restaurantId, auditType, date, scores, comments, photos, attachments });
      navigate(`/app/audit/restaurants/${restaurantId}`);
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
      <PageHeader title="New audit" subtitle="Scores, comments and evidence for a restaurant visit." />

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Restaurant</label>
              <select
                className="input-field"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
              >
                <option value="">Select a restaurant…</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Audit type</label>
              <select
                className="input-field"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value)}
              >
                {AUDIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scores (1–10)</label>
            {SCORE_FIELDS.map(({ key, label }) => (
              <div className="score-field" key={key}>
                <label>{label}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={scores[key]}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                />
                <span className="score-field__value">{scores[key]}</span>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Comments</label>
            <textarea
              className="input-field input-field--textarea"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Observations, issues found, follow-up needed…"
            />
          </div>

          <div className="form-group form-group--images">
            <label className="form-label">Photos</label>
            <div
              className="drop-zone"
              onClick={() => document.getElementById("photo-input")?.click()}
            >
              <div className="drop-zone__icon">
                <Camera size={18} color="#a5b4fc" />
              </div>
              <p className="drop-zone__title">Click to add photos</p>
              <p className="drop-zone__hint">JPG, PNG</p>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                multiple
                className="drop-zone__input"
                onChange={(e) => setPhotos((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
            </div>
            {photos.length > 0 && (
              <div className="thumb-grid">
                {photos.map((file, idx) => (
                  <div className="thumb" key={`${file.name}-${idx}`}>
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button
                      type="button"
                      className="thumb__remove"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove photo"
                    >
                      <X size={12} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group form-group--images">
            <label className="form-label">Attachments</label>
            <div
              className="drop-zone"
              onClick={() => document.getElementById("attachment-input")?.click()}
            >
              <div className="drop-zone__icon">
                <Paperclip size={18} color="#a5b4fc" />
              </div>
              <p className="drop-zone__title">Click to add files</p>
              <p className="drop-zone__hint">Reports, spreadsheets, PDFs</p>
              <input
                id="attachment-input"
                type="file"
                multiple
                className="drop-zone__input"
                onChange={(e) =>
                  setAttachments((prev) => [...prev, ...Array.from(e.target.files ?? [])])
                }
              />
            </div>
            {attachments.length > 0 && (
              <div className="file-list">
                {attachments.map((file, idx) => (
                  <div className="file-chip" key={`${file.name}-${idx}`}>
                    <Paperclip size={13} />
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove attachment"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="form-error form-error--submit">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate("/app/audit/audits")}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" /> Submitting…
                </>
              ) : (
                <>
                  Submit audit <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuditForm;
