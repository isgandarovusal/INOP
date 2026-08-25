import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  Trash2,
  Eye,
  Search,
  ImageOff,
  AlertTriangle,
  Loader2,
  PackageOpen,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MainContext from "../../../Context/Context";


interface Product {
  _id: string;
  title: string;
  description: string;
  images?: string[];
}

const Products: React.FC = () => {
  const { products, deleteProduct } = useContext(MainContext);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000";

  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const filtered: Product[] = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p: Product) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [products, query]);

  const openView = (item: Product) => {
    setViewTarget(item);
    setActiveImage(0);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      await deleteProduct(deleteTarget._id);
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const imgUrl = (path: string) => `${API_URL}/${path.replace(/\\/g, "/")}`;

  return (
    <div className="products-page">
      {/* Header */}
      <div className="products-page__header">
        <div>
          <h2 className="products-page__title">Products</h2>
          <p className="products-page__subtitle">
            {products.length} total · {filtered.length} shown
          </p>
        </div>

        <div className="products-page__actions">
          <div className="search-field">
            <Search size={15} className="search-field__icon" />
            <input
              type="text"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-add" onClick={() => navigate("/admin/add")}>
            <Plus size={16} />
            Add product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Description</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: Product, idx: number) => (
              <tr
                key={item._id}
                className={`product-row ${deletingId === item._id ? "product-row--removing" : ""}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <td>
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={imgUrl(item.images[0])}
                      alt={item.title}
                      className="table-img table-img--clickable"
                      onClick={() => openView(item)}
                    />
                  ) : (
                    <div
                      className="table-img table-img--empty table-img--clickable"
                      onClick={() => openView(item)}
                    >
                      <ImageOff size={16} />
                    </div>
                  )}
                </td>
                <td
                  className="cell-title cell-title--clickable"
                  onClick={() => openView(item)}
                >
                  {item.title}
                </td>
                <td className="cell-desc">{item.description}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn icon-btn--view"
                      onClick={() => openView(item)}
                      title="View details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="icon-btn icon-btn--edit"
                      onClick={() => navigate(`/admin/edit/${item._id}`)}
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => setDeleteTarget(item)}
                      disabled={deletingId === item._id}
                      title="Delete"
                    >
                      {deletingId === item._id ? (
                        <Loader2 size={15} className="spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <PackageOpen size={28} />
                    <p className="empty-state__title">
                      {query
                        ? "No products match your search"
                        : "No products yet"}
                    </p>
                    <p className="empty-state__hint">
                      {query
                        ? "Try a different keyword."
                        : "Products you add will show up here."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View details modal */}
      {viewTarget && (
        <div className="modal-backdrop" onClick={() => setViewTarget(null)}>
          <div
            className="modal-card modal-card--view anim-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="view-close"
              onClick={() => setViewTarget(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="view-gallery">
              <div className="view-gallery__main">
                {viewTarget.images && viewTarget.images.length > 0 ? (
                  <img
                    key={activeImage}
                    src={imgUrl(viewTarget.images[activeImage])}
                    alt={viewTarget.title}
                  />
                ) : (
                  <div className="view-gallery__empty">
                    <ImageOff size={26} />
                  </div>
                )}

                {viewTarget.images && viewTarget.images.length > 1 && (
                  <>
                    <button
                      className="view-gallery__nav view-gallery__nav--prev"
                      onClick={() =>
                        setActiveImage((i) =>
                          i === 0 ? viewTarget.images!.length - 1 : i - 1,
                        )
                      }
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="view-gallery__nav view-gallery__nav--next"
                      onClick={() =>
                        setActiveImage((i) =>
                          i === viewTarget.images!.length - 1 ? 0 : i + 1,
                        )
                      }
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {viewTarget.images && viewTarget.images.length > 1 && (
                <div className="view-gallery__thumbs">
                  {viewTarget.images.map((img, i) => (
                    <button
                      key={i}
                      className={`view-gallery__thumb ${
                        i === activeImage ? "view-gallery__thumb--active" : ""
                      }`}
                      onClick={() => setActiveImage(i)}
                    >
                      <img src={imgUrl(img)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="view-body">
              <h3 className="view-title">{viewTarget.title}</h3>
              <p className="view-desc">{viewTarget.description}</p>
            </div>

            <div className="view-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  const target = viewTarget;
                  setViewTarget(null);
                  navigate(`/admin/edit/${target._id}`);
                }}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                className="btn-danger-solid"
                onClick={() => {
                  setDeleteTarget(viewTarget);
                  setViewTarget(null);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-card anim-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__icon modal-card__icon--danger">
              <AlertTriangle size={26} />
            </div>
            <h3 className="modal-card__title">Delete this product?</h3>
            <p className="modal-card__subtitle">
              “{deleteTarget.title}” will be permanently removed. This can't be
              undone.
            </p>
            <div className="modal-card__actions">
              <button
                className="btn-danger-solid"
                onClick={handleConfirmDelete}
                disabled={deletingId === deleteTarget._id}
              >
                {deletingId === deleteTarget._id ? (
                  <>
                    <Loader2 size={15} className="spin" /> Deleting…
                  </>
                ) : (
                  "Yes, delete it"
                )}
              </button>
              <button
                className="btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget._id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
