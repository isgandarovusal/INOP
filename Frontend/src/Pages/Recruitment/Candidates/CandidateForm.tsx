import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, FileText, Loader2, UploadCloud, X } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import TagInput from "../../../Components/TagInput";
import {
  createCandidate,
  getCandidateById,
  updateCandidate,
} from "../../../Services/candidatesService";

const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getCandidateById(id).then((candidate) => {
      if (!candidate) return;
      setName(candidate.name);
      setEmail(candidate.email);
      setPhone(candidate.phone);
      setEducation(candidate.education);
      setExperience(candidate.experience);
      setSkills(candidate.skills);
      setLanguages(candidate.languages);
      setCertificates(candidate.certificates);
      setExistingCvName(candidate.cv?.name ?? null);
      setLoading(false);
    });
  }, [id]);

  const addFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!ACCEPTED_CV_TYPES.includes(file.type)) {
      setError("Only PDF or DOCX files are supported for CVs.");
      return;
    }
    setError(null);
    setCvFile(file);
    setExistingCvName(null);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFile(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
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
        await updateCandidate(id, cvFile ? input : { ...input, cvFile: undefined });
      } else {
        await createCandidate(input);
      }
      navigate("/app/recruitment/candidates");
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
        title={isEdit ? "Edit candidate" : "Add candidate"}
        subtitle="Structured profile used for search, filtering and ranking."
      />

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elvin Guliyev"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+994 50 000 00 00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Experience (years)</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Education</label>
            <input
              className="input-field"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. BSc Computer Science, ADA University"
            />
          </div>

          <TagInput label="Skills" values={skills} onChange={setSkills} placeholder="Add a skill" />
          <TagInput
            label="Languages"
            values={languages}
            onChange={setLanguages}
            placeholder="Add a language"
          />
          <TagInput
            label="Certificates"
            values={certificates}
            onChange={setCertificates}
            placeholder="Add a certificate"
          />

          <div className="form-group form-group--images">
            <label className="form-label">CV (PDF or DOCX)</label>
            {existingCvName && !cvFile && (
              <div className="file-list" style={{ marginBottom: 10 }}>
                <div className="file-chip">
                  <FileText size={14} />
                  <span>{existingCvName} (current)</span>
                </div>
              </div>
            )}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("cv-input")?.click()}
              className={`drop-zone ${dragActive ? "drop-zone--active" : ""}`}
            >
              <div className="drop-zone__icon">
                <UploadCloud size={18} color="#a5b4fc" />
              </div>
              <p className="drop-zone__title">Drag & drop a CV here</p>
              <p className="drop-zone__hint">or click to browse · PDF, DOCX</p>
              <input
                id="cv-input"
                type="file"
                accept=".pdf,.docx"
                className="drop-zone__input"
                onChange={(e) => addFile(e.target.files)}
              />
            </div>
            {cvFile && (
              <div className="file-list">
                <div className="file-chip">
                  <FileText size={14} />
                  <span>{cvFile.name}</span>
                  <button type="button" onClick={() => setCvFile(null)} aria-label="Remove file">
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}
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
              onClick={() => navigate("/app/recruitment/candidates")}
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
                  {isEdit ? "Save changes" : "Add candidate"} <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateForm;
