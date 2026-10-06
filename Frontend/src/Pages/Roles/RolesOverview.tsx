import React, { useEffect, useState } from "react";
import {
  Check,
  Edit3,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Context/AuthContext";
import PageHeader from "../../Components/PageHeader";
import Badge from "../../Components/Badge";
import PageState from "../../Components/PageState";
import ConfirmDialog from "../../Components/ConfirmDialog";
import {
  createRole,
  deleteRole,
  getRoles,
  setRoleActive,
  updateRole,
  type RoleRecord,
} from "../../Services/rolesService";
import type {
  Permission,
  PermissionScope,
} from "../../Types/auth";
import { hasPermission } from "../../Utils/permissions";

const SCOPES: PermissionScope[] = [
  "all",
  "department",
  "assigned",
  "own",
  "none",
];

interface RoleFormState {
  name: string;
  key: string;
  description: string;
  permissions: Permission[];
}

const EMPTY_FORM: RoleFormState = {
  name: "",
  key: "",
  description: "",
  permissions: [],
};

const RolesOverview: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const canCreateRole = hasPermission(user, "role", "create");
  const canUpdateRole = hasPermission(user, "role", "update");
  const canDeleteRole = hasPermission(user, "role", "delete");

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(
    null,
  );

  const loadRoles = () => {
    setLoading(true);
    setError(false);

    getRoles()
      .then((result) => {
        setRoles(result);
      })
      .catch((err) => {
        console.error("Failed to load roles:", err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRoles();
  }, [retryCount]);

  const openCreate = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowCreate(true);
  };

  const openEdit = (role: RoleRecord) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      key: role.key,
      description: role.description,
      permissions: role.permissions.map((permission) => ({
        ...permission,
      })),
    });
    setFormError(null);
    setShowCreate(false);
  };

  const closeForm = () => {
    if (saving) return;

    setEditingRole(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const addPermission = () => {
    setForm((current) => ({
      ...current,
      permissions: [
        ...current.permissions,
        {
          resource: "",
          action: "",
          scope: "all",
        },
      ],
    }));
  };

  const updatePermission = (
    index: number,
    patch: Partial<Permission>,
  ) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.map((permission, itemIndex) =>
        itemIndex === index
          ? { ...permission, ...patch }
          : permission,
      ),
    }));
  };

  const removePermission = (index: number) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.key.trim()) {
      setFormError(t("roles.form.required"));
      return;
    }

    const invalidPermission = form.permissions.some(
      (permission) =>
        !permission.resource.trim() || !permission.action.trim(),
    );

    if (invalidPermission) {
      setFormError(t("roles.form.permissionRequired"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        key: form.key.trim(),
        description: form.description.trim(),
        permissions: form.permissions.map((permission) => ({
          resource: permission.resource.trim(),
          action: permission.action.trim(),
          scope: permission.scope,
        })),
      };

      if (editingRole) {
        const updated = await updateRole(editingRole.id, payload);

        setRoles((current) =>
          current.map((role) =>
            role.id === updated.id ? updated : role,
          ),
        );
      } else {
        const created = await createRole(payload);
        setRoles((current) => [...current, created]);
      }

      closeForm();
    } catch (err) {
      console.error("Failed to save role:", err);

      setFormError(
        err instanceof Error
          ? err.message
          : t("auth.somethingWentWrong"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (role: RoleRecord) => {
    if (role.isSystemRole) return;

    setStatusLoadingId(role.id);

    try {
      const updated = await setRoleActive(
        role.id,
        !role.isActive,
      );

      setRoles((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
    } catch (err) {
      console.error("Failed to update role status:", err);
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteRole(deleteTarget.id);

      setRoles((current) =>
        current.filter((role) => role.id !== deleteTarget.id),
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete role:", err);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (role: RoleRecord) =>
    !role.isSystemRole && role.userCount === 0;

  if (loading) {
    return (
      <div>
        <PageHeader
          title={t("roles.title")}
          subtitle={t("roles.subtitle")}
        />
        <PageState
          type="loading"
          title={t("dashboard.loading")}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title={t("roles.title")}
          subtitle={t("roles.subtitle")}
        />
        <PageState
          type="error"
          title={t("auth.somethingWentWrong")}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRetryCount((value) => value + 1)}
            >
              {t("common.retry")}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="roles-page">
      <PageHeader
        title={t("roles.title")}
        subtitle={t("roles.subtitle")}
      />

      <div
        className="roles-create-action"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        {canCreateRole && (
          <button
            type="button"
            className="btn-primary roles-create-button"
            onClick={openCreate}
          >
            <Plus size={16} />
            {t("roles.create")}
          </button>
        )}
      </div>

      {roles.length === 0 ? (
        <PageState
          type="empty"
          title={t("roles.empty")}
          action={
            canCreateRole ? (
              <button
                type="button"
                className="btn-primary"
                onClick={openCreate}
              >
                <Plus size={16} />
                {t("roles.create")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="kpi-grid roles-grid">
          {roles.map((role, idx) => (
            <div
              className="detail-card role-card anim-in"
              key={role.id}
              style={{
                animationDelay: `${idx * 0.05}s`,
                marginBottom: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>
                  <ShieldCheck
                    size={16}
                    style={{
                      verticalAlign: "-3px",
                      marginRight: 6,
                      color: "var(--accent)",
                    }}
                  />
                  {role.name}
                </h3>

                <Badge
                  tone={role.isActive ? "success" : "neutral"}
                >
                  {role.isActive
                    ? t("roles.active")
                    : t("roles.inactive")}
                </Badge>
              </div>

              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  margin: "8px 0 4px",
                }}
              >
                {role.key}
              </p>

              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                {role.userCount}{" "}
                {role.userCount === 1
                  ? t("roles.user")
                  : t("roles.users")}
              </p>

              {role.description && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  {role.description}
                </p>
              )}

              <div className="tag-list">
                {role.permissions.map((permission) => (
                  <Badge
                    tone="accent"
                    key={`${permission.resource}:${permission.action}:${permission.scope}`}
                  >
                    {`${permission.resource}.${permission.action}:${permission.scope}`}
                  </Badge>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                {canUpdateRole && (
                  <button
                    type="button"
                    className="btn-secondary role-edit-action"
                    onClick={() => openEdit(role)}
                  >
                    <Edit3 size={14} />
                    {t("roles.edit")}
                  </button>
                )}

                {canUpdateRole &&
                  !role.isSystemRole &&
                  (role.isActive || role.userCount === 0) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={statusLoadingId === role.id}
                      onClick={() => void handleToggleStatus(role)}
                    >
                    {statusLoadingId === role.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : role.isActive ? (
                      <X size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                    {role.isActive
                      ? t("roles.deactivate")
                      : t("roles.activate")}
                  </button>
                )}

                {canDeleteRole && canDelete(role) && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setDeleteTarget(role)}
                  >
                    <Trash2 size={14} />
                    {t("roles.delete")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editingRole) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!saving) {
              closeForm();
            }
          }}
        >
          <div
            className="modal-card anim-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-form-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, calc(100vw - 32px))",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <h3
                  id="role-form-title"
                  className="modal-card__title"
                  style={{ marginBottom: 4 }}
                >
                  {editingRole
                    ? t("roles.form.editTitle")
                    : t("roles.form.createTitle")}
                </h3>

                <p className="modal-card__subtitle">
                  {t("roles.form.subtitle")}
                </p>
              </div>

              <button
                type="button"
                className="btn-icon"
                onClick={closeForm}
                disabled={saving}
                aria-label={t("roles.form.close")}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} noValidate>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    {t("roles.form.name")}
                  </label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t("roles.form.key")}
                  </label>
                  <input
                    className="input-field"
                    value={form.key}
                    disabled={Boolean(editingRole?.isSystemRole)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        key: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t("roles.form.description")}
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <label className="form-label" style={{ margin: 0 }}>
                    {t("roles.form.permissions")}
                  </label>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addPermission}
                    disabled={saving}
                  >
                    <Plus size={14} />
                    {t("roles.form.addPermission")}
                  </button>
                </div>

                {form.permissions.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state__title">
                      {t("roles.form.noPermissions")}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {form.permissions.map((permission, index) => (
                      <div
                        key={`${index}-${permission.resource}-${permission.action}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr 160px auto",
                          gap: 8,
                          alignItems: "end",
                        }}
                      >
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">
                            {t("roles.form.resource")}
                          </label>
                          <input
                            className="input-field"
                            value={permission.resource}
                            onChange={(event) =>
                              updatePermission(index, {
                                resource: event.target.value,
                              })
                            }
                            placeholder="audit"
                            disabled={saving}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">
                            {t("roles.form.action")}
                          </label>
                          <input
                            className="input-field"
                            value={permission.action}
                            onChange={(event) =>
                              updatePermission(index, {
                                action: event.target.value,
                              })
                            }
                            placeholder="read"
                            disabled={saving}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">
                            {t("roles.form.scope")}
                          </label>
                          <select
                            className="input-field"
                            value={permission.scope}
                            onChange={(event) =>
                              updatePermission(index, {
                                scope: event.target
                                  .value as PermissionScope,
                              })
                            }
                            disabled={saving}
                          >
                            {SCOPES.map((scope) => (
                              <option key={scope} value={scope}>
                                {t(`roles.scopes.${scope}`)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => removePermission(index)}
                          disabled={saving}
                          aria-label={t(
                            "roles.form.removePermission",
                          )}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && (
                <p className="form-error form-error--submit">
                  <X size={12} />
                  {formError}
                </p>
              )}

              <div className="modal-card__actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  {t("roles.form.cancel")}
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      {t("roles.form.saving")}
                    </>
                  ) : (
                    <>
                      {editingRole
                        ? t("roles.form.save")
                        : t("roles.form.create")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("roles.deleteTitle")}
          message={t("roles.deleteMessage", {
            role: deleteTarget.name,
          })}
          confirmLabel={t("roles.delete")}
          loading={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default RolesOverview;
