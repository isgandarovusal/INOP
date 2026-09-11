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
import type { Role } from "../../Types/auth";
import type { Department } from "../../Types/core";
import { ROLE_LABELS } from "../../Utils/permissions";

const ROLES: Role[] = ["admin", "hr", "auditor", "manager"];

const UserForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("hr");
  const [departmentId, setDepartmentId] = useState("");
  const [position, setPosition] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDepartments(),
      isEdit ? getUsers() : Promise.resolve([]),
    ]).then(([deptResult, userResult]) => {
      setDepartments(deptResult);

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
        }
      }

      setLoading(false);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
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
