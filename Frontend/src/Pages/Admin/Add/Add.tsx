import React, { useCallback, useContext, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  X,
  Loader2,
  ImagePlus,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import MainContext from "../../../Context/Context";

interface ImageItem {
  file: File;
  url: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  submit?: string;
}

const Add: React.FC = () => {
  const { addProduct } = useContext(MainContext);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [shakeField, setShakeField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    const incoming = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    const withUrls: ImageItem[] = incoming.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...withUrls]);
  }, []);

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
    addFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].url);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!description.trim()) next.description = "Description is required.";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstField = Object.keys(next)[0];
      setShakeField(firstField);
      setTimeout(() => setShakeField(null), 500);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    images.forEach(({ file }) => formData.append("images", file));

    try {
      await addProduct(formData);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setTitle("");
    setDescription("");
    setImages([]);
    setErrors({});
  };

  return (
    <div className="add-page">
      <div className="add-page__grid-overlay" />

      <div className="add-page__wrap">
        {/* Eyebrow + heading */}
        <div className="add-page__header anim-in">
          <div className="add-page__eyebrow font-mono-ui">
            <Sparkles size={13} />
            INOP · Catalog
          </div>
          <h1 className="add-page__title font-display">Add a new product</h1>
          <p className="add-page__subtitle">
            Fill in the details below. Your changes go live as soon as you
            submit.
          </p>
        </div>

        {/* Card */}
        <div className="add-card anim-in" style={{ animationDelay: "0.08s" }}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Title */}
            <div
              className={`form-group ${shakeField === "title" ? "anim-shake" : ""}`}
            >
              <label htmlFor="title" className="form-label font-mono-ui">
                Title
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g. Wireless Mechanical Keyboard"
                className={`input-field ${errors.title ? "input-error" : ""}`}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title)
                    setErrors((p) => ({ ...p, title: undefined }));
                }}
              />
              {errors.title && (
                <p className="form-error">
                  <AlertCircle size={12} /> {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div
              className={`form-group ${shakeField === "description" ? "anim-shake" : ""}`}
            >
              <label htmlFor="description" className="form-label font-mono-ui">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="What makes this product worth listing?"
                className={`input-field input-field--textarea ${errors.description ? "input-error" : ""}`}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description)
                    setErrors((p) => ({ ...p, description: undefined }));
                }}
              />
              {errors.description && (
                <p className="form-error">
                  <AlertCircle size={12} /> {errors.description}
                </p>
              )}
            </div>

            {/* Images */}
            <div className="form-group form-group--images">
              <label className="form-label font-mono-ui">Images</label>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`drop-zone ${dragActive ? "drop-zone--active" : ""}`}
              >
                <div className="drop-zone__icon">
                  <UploadCloud size={20} color="#a5b4fc" />
                </div>
                <p className="drop-zone__title">Drag & drop images here</p>
                <p className="drop-zone__hint">
                  or click to browse · PNG, JPG up to 10MB each
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="drop-zone__input"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {images.length > 0 && (
                <div className="thumb-grid">
                  {images.map((img, idx) => (
                    <div
                      key={img.url}
                      className="thumb"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <img src={img.url} alt="" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="thumb__remove"
                        aria-label="Remove image"
                      >
                        <X size={12} color="white" />
                      </button>
                    </div>
                  ))}
                  <div
                    onClick={() => inputRef.current?.click()}
                    className="thumb thumb--add"
                  >
                    <ImagePlus size={16} color="#8b90a8" />
                  </div>
                </div>
              )}
            </div>

            {errors.submit && (
              <p className="form-error form-error--submit">
                <AlertCircle size={12} /> {errors.submit}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Adding product…
                </>
              ) : (
                <>
                  Add product
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Success modal */}
      {success && (
        <div className="modal-backdrop">
          <div className="modal-card anim-pop">
            <div className="modal-card__icon">
              <svg width="72" height="72" viewBox="0 0 60 60" fill="none">
                <circle
                  className="check-circle"
                  cx="30"
                  cy="30"
                  r="26"
                  stroke="#34d399"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <path
                  className="check-mark"
                  d="M18 30.5L26 38L42 21"
                  stroke="#34d399"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <h3 className="modal-card__title font-display">Product added</h3>
            <p className="modal-card__subtitle">
              "{title}" is now live in your catalog.
            </p>
            <div className="modal-card__actions">
              <button
                onClick={() => {
                  resetForm();
                  setSuccess(false);
                }}
                className="btn-primary"
              >
                Add another product
              </button>
              <button
                onClick={() => navigate("/admin/products")}
                className="btn-secondary"
              >
                View products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Add;
