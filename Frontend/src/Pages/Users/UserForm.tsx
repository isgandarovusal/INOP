import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../Components/PageHeader";
import {
  createUser,
  getUsers,
  updateUser,
} from "../../Services/usersService";
import { getDepartments } from "../../Services/departmentsService";
import { getRoles, type RoleRecord } from "../../Services/rolesService";
import type { Role } from "../../Types/auth";
import type { Department } from "../../Types/core";
import { getRoleLabel } from "../../Utils/permissions";

const UserForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
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

    setLoading(true);
    setLoadError(null);

    Promise.all([
      getDepartments(),
      getRoles(),
      isEdit ? getUsers() : Promise.resolve([]),
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
            activeRoles.find((item) => item.key === "employee") ||
            activeRoles[0];

          if (defaultRole) {
            setRole(defaultRole.key);
          }
        }

        if (deptResult.length && !departmentId) {
          setDepartmentId(deptResult[0].id);
        }

        if (isEdit && id) {
          const existing = userResult.find((u) => u.id === id);

          if (existing) {
            setName(existing.name);
            setEmail(existing.email);
            setRole(existing.role);
            setDepartmentId(existing.departmentId);
            setPosition(existing.position);
          } else {
            setLoadError(t("auth.somethingWentWrong"));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load user form data:", err);

        if (!cancelled) {
          setLoadError(t("auth.somethingWentWrong"));
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, retryCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || (!isEdit && !password.trim())) {
      setError(t("userForm.required"));
      return;
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
        <p>{loadError}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRetryCount((value) => value + 1)}
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? t("userForm.editUser") : t("userForm.newUser")}
      />

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                {t("userForm.fullName")}
              </label>
              <input
                className="input-field"
                value={name}
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
                value={email}
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
                value={password}
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
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {roles
                  .filter(
                    (item) =>
                      item.isActive ||
                      (isEdit && item.key === role),
                  )
                  .map((item) => (
                    <option key={item.id} value={item.key}>
                      {getRoleLabel(item.key)}
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
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
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
              value={position}
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

export default UserForm;
