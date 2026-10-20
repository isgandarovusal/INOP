import { useListResource } from "../../Hooks/useListResource";
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Pencil, Plus, PowerOff, Power, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../Components/PageHeader";
import SearchInput from "../../Components/SearchInput";
import EmptyState from "../../Components/EmptyState";
import ConfirmDialog from "../../Components/ConfirmDialog";
import { useAuth } from "../../Context/AuthContext";
import { getRoles, type RoleRecord } from "../../Services/rolesService";
import Badge from "../../Components/Badge";
import { getUsers, setUserActive } from "../../Services/usersService";
import { getDepartments } from "../../Services/departmentsService";
import type { PublicUser } from "../../Types/auth";
import type { Department } from "../../Types/core";
import { hasPermission, getPermissionScope, getRoleLabel } from "../../Utils/permissions";

const EMPTY_DIRECTORY: { users: PublicUser[]; departments: Department[]; roles: RoleRecord[]; lookupError: boolean } = { users: [], departments: [], roles: [], lookupError: false };
async function loadDirectory() {
  const [users, departments, roles] = await Promise.allSettled([getUsers(), getDepartments(), getRoles()]);
  if (users.status === 'rejected') throw users.reason;
  return { users: users.value, departments: departments.status === 'fulfilled' ? departments.value : [], roles: roles.status === 'fulfilled' ? roles.value : [], lookupError: departments.status === 'rejected' || roles.status === 'rejected' };
}

const UsersList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {user: currentUser} = useAuth();
  const [params] = useSearchParams();
  const [departmentFilter,setDepartmentFilter] = useState(params.get('departmentId') || '');
  const [roleFilter,setRoleFilter] = useState('');
  const [statusFilter,setStatusFilter] = useState('');
  const [statusTarget,setStatusTarget] = useState<PublicUser|null>(null);

  const [actionError, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, loading, error: readError, reload: load, setData } = useListResource(loadDirectory, EMPTY_DIRECTORY);
  const { users, departments, roles, lookupError } = data;
  const error = readError || actionError;


  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return users.filter(u => (!q || `${u.name} ${u.email} ${u.position} ${u.role}`.toLocaleLowerCase().includes(q)) &&
      (!departmentFilter || u.departmentId === departmentFilter) && (!roleFilter || u.role === roleFilter) &&
      (!statusFilter || String(u.isActive) === statusFilter));
  }, [users, query, departmentFilter, roleFilter, statusFilter]);
  const departmentName = (id: string) => departments.find(d => d.id === id)?.name || (id === 'dep_hr' ? t('departments.humanResources') : id || t('adminUI.unassigned'));
  const toggleActive = async () => {
    if (!statusTarget) return;
    setTogglingId(statusTarget.id);
    try {
      const updated = await setUserActive(statusTarget.id, !statusTarget.isActive);
      setData(current => ({ ...current, users: current.users.map(u => u.id === updated.id ? updated : u) })); setStatusTarget(null);
    } catch { setError(t('auth.somethingWentWrong')); }
    finally { setTogglingId(null); }
  };

  return (
    <div className="administration-page">
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.totalShown", {
          total: users.length,
          shown: filtered.length,
        })}
        actions={
          hasPermission(currentUser,'user','create') && getPermissionScope(currentUser,'role','update') === 'all' && <button
            className="btn-add"
            onClick={() => navigate("/app/users/new")}
          >
            <Plus size={16} />
            {t("users.newUser")}
          </button>
        }
      />

      {lookupError && <p role="status" className="admin-notice">{t('adminUI.lookupError')}</p>}
      <div className="filter-bar administration-filters">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("users.search")}
        />
        <select className="input-field" aria-label={t('users.role')} value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">{t('adminUI.allRoles')}</option>{[...new Set(users.map(u=>u.role))].map(key=><option key={key} value={key}>{roles.find(r=>r.key===key)?.name || getRoleLabel(key)}</option>)}</select>
        <select className="input-field" aria-label={t('users.department')} value={departmentFilter} onChange={e=>setDepartmentFilter(e.target.value)}><option value="">{t('adminUI.allDepartments')}</option>{[...new Set(users.map(u=>u.departmentId).filter(Boolean))].map(id=><option key={id} value={id}>{departmentName(id)}</option>)}</select>
        <select className="input-field" aria-label={t('users.status')} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">{t('adminUI.allStatuses')}</option><option value="true">{t('common.status.active')}</option><option value="false">{t('common.status.inactive')}</option></select>
      </div>
      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>{t("users.name")}</th>
              <th>{t("users.role")}</th>
              <th>{t("users.department")}</th>
              <th>{t("users.status")}</th>
              <th className="col-actions">{t("users.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={<UserCog size={28} />}
                    title={t("auth.somethingWentWrong")}
                    hint={typeof error === 'string' ? t(error) : t('common.retry')}
                  />
                  <div style={{ textAlign: "center", marginTop: "12px" }}>
                    <button
                      className="btn-secondary"
                      onClick={load}
                    >
                      {t("common.retry")}
                    </button>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={<UserCog size={28} />}
                    title={t("users.noUsers")}
                    hint={t("users.tryDifferentSearch")}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id}>
                  <td className="cell-title">
                    {user.name}
                    <div
                      className="cell-muted"
                      style={{ fontSize: "0.78rem" }}
                    >
                      {user.email}
                    </div>
                  </td>

                  <td>
                    <Badge tone="accent">
                      {roles.find(r=>r.key===user.role)?.name || getRoleLabel(user.role)}
                    </Badge>
                  </td>

                  <td className="cell-muted">
                    {departmentName(user.departmentId)}
                    <div className="admin-help">{user.position || t('adminUI.positionMissing')}</div>
                  </td>

                  <td>
                    <Badge
                      tone={user.isActive ? "success" : "neutral"}
                    >
                      {user.isActive
                        ? t("common.status.active")
                        : t("common.status.inactive")}
                    </Badge>
                  </td>

                  <td>
                    <div className="row-actions">
                      {hasPermission(currentUser,'user','update') && <><button
                        className="icon-btn icon-btn--edit"
                        title={t("users.edit")}
                        onClick={() =>
                          navigate(`/app/users/${user.id}/edit`)
                        }
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        className="icon-btn icon-btn--danger"
                        title={
                          user.isActive
                            ? t("users.deactivate")
                            : t("users.activate")
                        }
                        disabled={togglingId === user.id || currentUser?.id === user.id}
                        onClick={() => setStatusTarget(user)}
                      >
                        {togglingId === user.id ? (
                          <Loader2 size={15} className="spin" />
                        ) : user.isActive ? (
                          <PowerOff size={15} />
                        ) : (
                          <Power size={15} />
                        )}
                      </button></>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {statusTarget && <ConfirmDialog title={statusTarget.isActive ? t('users.deactivate') : t('users.activate')} message={t('adminUI.statusConfirm',{name:statusTarget.name})} loading={Boolean(togglingId)} onCancel={()=>setStatusTarget(null)} onConfirm={()=>void toggleActive()} />}
    </div>
  );
};

export default UsersList;
