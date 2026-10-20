import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../Components/PageHeader";
import {
  createUser,
  getUserById,
  updateUser,
} from "../../Services/usersService";
import { getDepartments } from "../../Services/departmentsService";
import { getRoles, type RoleRecord } from "../../Services/rolesService";
import type { Role } from "../../Types/auth";
import type { Department } from "../../Types/core";
import { useAuth } from "../../Context/useAuth";
import { getPermissionScope, getRoleLabel } from "../../Utils/permissions";

const UserFormFields: React.FC<{ id?: string }> = ({ id }) => {
  const { t } = useTranslation();
  const {user} = useAuth();
  const canAssign = getPermissionScope(user,'role','update') === 'all';
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [departmentId, setDepartmentId] = useState("");
  const [position, setPosition] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getDepartments(),
      getRoles(),
      isEdit && id ? getUserById(id) : Promise.resolve(null),
    ])
      .then(([deptResult, roleResult, userResult]) => {
        if (cancelled) return;

        setDepartments(deptResult);
        setRoles(roleResult);

        if (!isEdit && roleResult.length) {
          const activeRoles = roleResult.filter(
            (item) => item.isActive,
          );

          const defaultRole =
            activeRoles.find((item) => item.key === "employee");

          setRole(defaultRole?.key || '');
        }


        if (isEdit && id) {
          const existing = userResult;

          if (existing) {
            setName(existing.name);
            setEmail(existing.email);
            setRole(existing.role);
            setDepartmentId(existing.departmentId);
            setPosition(existing.position);
          } else {
            setLoadError("auth.somethingWentWrong");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load user form data:", err);

        if (!cancelled) {
          setLoadError("auth.somethingWentWrong");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };

  }, [id, isEdit, retryCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !role || (!isEdit && !password.trim())) {
      setError(t("userForm.required"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || (!isEdit && password.length < 6)) {
      setError(t("adminUI.invalidUser")); return;
    }
    setSaving(true);
    setError(null);

    try {
      if (isEdit && id) {
        await updateUser(id, {
          name,
          email,
          role,
          departmentId,
          position,
        });
      } else {
        await createUser({
          name,
          email,
          password,
          role,
          departmentId,
          position,
        });
      }

      navigate("/app/users");
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

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="empty-state">
        <AlertCircle size={28} />
        <p>{t(loadError)}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setLoading(true); setLoadError(null); setRetryCount(value => value + 1); }}
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="administration-page">
      <PageHeader
        title={isEdit ? t("userForm.editUser") : t("userForm.newUser")}
      />

      <div className="form-card administration-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                {t("userForm.fullName")}
              </label>
              <input
                className="input-field"
                aria-label={t("userForm.fullName")} value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t("userForm.email")}
              </label>
              <input
                type="email"
                className="input-field"
                aria-label={t("userForm.email")} value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEdit}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label className="form-label">
                {t("userForm.password")}
              </label>
              <input
                type="password"
                className="input-field"
                aria-label={t("userForm.password")} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("userForm.minimumPassword")}
              />
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                {t("userForm.role")}
              </label>

              <select
                className="input-field"
                aria-label={t("userForm.role")} value={role}
                disabled={!canAssign || saving} onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="">{t('adminUI.unassigned')}</option>
                {role && !roles.some(r=>r.key===role) && <option value={role}>{role}</option>}
                {roles
                  .filter(
                    (item) =>
                      item.isActive ||
                      (isEdit && item.key === role),
                  )
                  .map((item) => (
                    <option key={item.id} value={item.key}>
                      {item.name || getRoleLabel(item.key)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {t("userForm.department")}
              </label>

              <select
                className="input-field"
                aria-label={t("userForm.department")} value={departmentId}
                disabled={!canAssign || saving} onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">{t("adminUI.unassigned")}</option>
                {departmentId && !departments.some(d => d.id === departmentId) && <option aria-label={t("userForm.department")} value={departmentId}>{departmentId}</option>}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("userForm.position")}
            </label>

            <input
              className="input-field"
              aria-label={t("userForm.position")} value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("userForm.positionPlaceholder")}
            />
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
              onClick={() => navigate("/app/users")}
            >
              {t("userForm.cancel")}
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t("userForm.saving")}
                </>
              ) : (
                <>
                  {isEdit
                    ? t("userForm.saveChanges")
                    : t("userForm.createUser")}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function UserForm() {
  const { id } = useParams();
  return <UserFormFields key={id || 'new'} id={id} />;
}
