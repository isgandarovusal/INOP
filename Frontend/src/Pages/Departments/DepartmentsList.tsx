import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../Components/PageHeader";
import EmptyState from "../../Components/EmptyState";
import ConfirmDialog from "../../Components/ConfirmDialog";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../Services/departmentsService";
import type { Department } from "../../Types/core";

const DepartmentsList: React.FC = () => {
  const { t } = useTranslation();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);

    getDepartments()
      .then(setDepartments)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setError(null);
    setShowForm(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setDescription(dept.description);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t("departments.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editing) {
        await updateDepartment(editing.id, {
          name,
          description,
        });
      } else {
        await createDepartment({
          name,
          description,
        });
      }

      setShowForm(false);
      load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.somethingWentWrong"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    await deleteDepartment(deleteTarget.id);
    setDeleteTarget(null);
    setDeletingId(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title={t("departments.title")}
        subtitle={t("departments.total", {
          count: departments.length,
        })}
        actions={
          <button className="btn-add" onClick={openCreate}>
            <Plus size={16} />
            {t("departments.newDepartment")}
          </button>
        }
      />

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>{t("departments.name")}</th>
              <th>{t("departments.description")}</th>
              <th className="col-actions">
                {t("departments.actions")}
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <EmptyState
                    icon={<Building2 size={28} />}
                    title={t("departments.noDepartments")}
                    hint={t("departments.addFirst")}
                  />
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr
                  key={dept.id}
                  className={
                    deletingId === dept.id
                      ? "row--removing"
                      : ""
                  }
                >
                  <td className="cell-title">{dept.name}</td>
                  <td className="cell-muted">
                    {dept.description || "—"}
                  </td>

                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn icon-btn--edit"
                        title={t("departments.edit")}
                        onClick={() => openEdit(dept)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        className="icon-btn icon-btn--danger"
                        title={t("departments.delete")}
                        disabled={deletingId === dept.id}
                        onClick={() => setDeleteTarget(dept)}
                      >
                        {deletingId === dept.id ? (
                          <Loader2 size={15} className="spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <div
            className="modal-card anim-pop"
            style={{
              textAlign: "left",
              maxWidth: 420,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-card__title">
              {editing
                ? t("departments.editDepartment")
                : t("departments.createDepartment")}
            </h3>

            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ marginTop: 16 }}
            >
              <div className="form-group">
                <label className="form-label">
                  {t("departments.name")}
                </label>

                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t("departments.description")}
                </label>

                <textarea
                  className="input-field input-field--textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {error && (
                <p className="form-error form-error--submit">
                  <AlertCircle size={12} /> {error}
                </p>
              )}

              <div className="modal-card__actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 size={16} className="spin" />
                  ) : editing ? (
                    t("departments.saveChanges")
                  ) : (
                    t("departments.create")
                  )}
                </button>

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowForm(false)}
                >
                  {t("departments.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("departments.deleteTitle")}
          message={t("departments.deleteMessage", {
            name: deleteTarget.name,
          })}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default DepartmentsList;
