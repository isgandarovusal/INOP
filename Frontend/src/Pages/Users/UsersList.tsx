import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, PowerOff, Power, UserCog } from "lucide-react";
import PageHeader from "../../Components/PageHeader";
import SearchInput from "../../Components/SearchInput";
import EmptyState from "../../Components/EmptyState";
import Badge from "../../Components/Badge";
import { getUsers, setUserActive } from "../../Services/usersService";
import { getDepartments } from "../../Services/departmentsService";
import type { PublicUser } from "../../Types/auth";
import type { Department } from "../../Types/core";
import { ROLE_LABELS } from "../../Utils/permissions";

const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getUsers(), getDepartments()]).then(([userResult, deptResult]) => {
      setUsers(userResult);
      setDepartments(deptResult);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const departmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  const toggleActive = async (user: PublicUser) => {
    setTogglingId(user.id);
    await setUserActive(user.id, !user.isActive);
    setTogglingId(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${users.length} total · ${filtered.length} shown`}
        actions={
          <button className="btn-add" onClick={() => navigate("/app/users/new")}>
            <Plus size={16} />
            New user
          </button>
        }
      />

      <div className="filter-bar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or email…" />
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th className="col-actions">Actions</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon={<UserCog size={28} />} title="No users found" hint="Try a different search." />
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id}>
                  <td className="cell-title">
                    {user.name}
                    <div className="cell-muted" style={{ fontSize: "0.78rem" }}>
                      {user.email}
                    </div>
                  </td>
                  <td>
                    <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge>
                  </td>
                  <td className="cell-muted">{departmentName(user.departmentId)}</td>
                  <td>
                    <Badge tone={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "active" : "inactive"}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn icon-btn--edit"
                        title="Edit"
                        onClick={() => navigate(`/app/users/${user.id}/edit`)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        title={user.isActive ? "Deactivate" : "Activate"}
                        disabled={togglingId === user.id}
                        onClick={() => toggleActive(user)}
                      >
                        {togglingId === user.id ? (
                          <Loader2 size={15} className="spin" />
                        ) : user.isActive ? (
                          <PowerOff size={15} />
                        ) : (
                          <Power size={15} />
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
    </div>
  );
};

export default UsersList;
