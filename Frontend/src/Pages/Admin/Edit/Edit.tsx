import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  UploadCloud,
  X,
  Loader2,
  ImagePlus,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Check,
  RefreshCw,
} from "lucide-react";
import MainContext from "../../../Context/Context";
// Styles for this page live in App.css, scoped under .edit-page
// (see the CSS block provided alongside this file).

interface NewImageItem {
  file: File;
  url: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  submit?: string;
}

const Edit: React.FC = () => {
  const { editProduct } = useContext(MainContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newImages, setNewImages] = useState<NewImageItem[]>([]);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [shakeField, setShakeField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const res = await axios.get(`${API_URL}/products/${id}`);
      setTitle(res.data.title);
      setDescription(res.data.description);
      setCurrentImages(res.data.images || []);
    } catch (error) {
      console.error("Error fetching product:", error);
      setFetchError(
        "Couldn't load this product. Check your connection and try again.",
      );
    } finally {
      setIsFetching(false);
    }
  }, [id, API_URL]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const addFiles = useCallback((fileList: FileList | null) => {
    const incoming = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    const withUrls: NewImageItem[] = incoming.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setNewImages((prev) => [...prev, ...withUrls]);
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

  const removeNewImage = (idx: number) => {
    setNewImages((prev) => {
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
    if (!id) return;
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
    newImages.forEach(({ file }) => formData.append("images", file));

    try {
      await editProduct(id, formData);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-page">
      <div className="edit-page__grid-overlay" />

      <div className="edit-page__wrap">
        {/* Eyebrow + heading */}
        <div className="edit-page__header anim-in">
          <div className="edit-page__eyebrow font-mono-ui">
            <Sparkles size={13} />
            INOP · Catalog
          </div>
          <h1 className="edit-page__title font-display">Edit product</h1>
          <p className="edit-page__subtitle">
            Update the details below. Existing images stay unless you add new
            ones.
          </p>
        </div>

        {/* Fetch error state */}
        {fetchError && !isFetching && (
          <div className="edit-card anim-in edit-card--error">
            <AlertCircle size={22} />
            <p>{fetchError}</p>
            <button className="btn-secondary" onClick={fetchProduct}>
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {/* Skeleton loading state */}
        {isFetching && (
          <div className="edit-card anim-in">
            <div className="skeleton skeleton--label" />
            <div className="skeleton skeleton--input" />
            <div className="skeleton skeleton--label" />
            <div className="skeleton skeleton--textarea" />
            <div className="skeleton skeleton--label" />
            <div className="skeleton skeleton--images" />
          </div>
        )}

        {/* Form */}
        {!isFetching && !fetchError && (
          <div
            className="edit-card anim-in"
            style={{ animationDelay: "0.08s" }}
          >
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
                <label
                  htmlFor="description"
                  className="form-label font-mono-ui"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
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

              {/* Current images */}
              {currentImages.length > 0 && (
                <div className="form-group">
                  <label className="form-label font-mono-ui">
                    Current images
                  </label>
                  <div className="thumb-grid thumb-grid--static">
                    {currentImages.map((img, index) => (
                      <div key={index} className="thumb thumb--current">
                        <img
                          src={`${API_URL}/${img.replace(/\\/g, "/")}`}
                          alt={`current-${index}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New images */}
              <div className="form-group form-group--images">
                <label className="form-label font-mono-ui">
                  Add new images (optional)
                </label>

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
                    or click to browse · new images are added, not replaced
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

                {newImages.length > 0 && (
                  <div className="thumb-grid">
                    {newImages.map((img, idx) => (
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
                            removeNewImage(idx);
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

              <div className="edit-page__form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate("/admin/products")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Save changes
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Success modal */}
      {success && (
        <div className="modal-backdrop">
          <div className="modal-card anim-pop">
            <div className="modal-card__icon modal-card__icon--success">
              <Check size={26} />
            </div>
            <h3 className="modal-card__title font-display">Changes saved</h3>
            <p className="modal-card__subtitle">“{title}” has been updated.</p>
            <div className="modal-card__actions">
              <button
                onClick={() => navigate("/admin/products")}
                className="btn-primary"
              >
                Back to products
              </button>
              <button
                onClick={() => setSuccess(false)}
                className="btn-secondary"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Edit;
