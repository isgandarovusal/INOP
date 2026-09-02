import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge from "../../../Components/Badge";
import { getAudits, deleteAudit, overallScore } from "../../../Services/auditsService";
import { getRestaurants } from "../../../Services/restaurantsService";
import { getUsers } from "../../../Services/usersService";
import type { Audit } from "../../../Types/audit";
import type { PublicUser } from "../../../Types/auth";
import type { Restaurant } from "../../../Types/audit";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit } from "../../../Utils/permissions";

const scoreTone = (score: number) => (score >= 8 ? "success" : score >= 6 ? "warning" : "danger");

const AuditsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user ? canManageAudit(user.role) : false;

  const [audits, setAudits] = useState<Audit[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [auditorFilter, setAuditorFilter] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Audit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getAudits(), getRestaurants(), getUsers()]).then(
      ([auditResult, restaurantResult, userResult]) => {
        setAudits(auditResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setRestaurants(restaurantResult);
        setUsers(userResult);
        setLoading(false);
      },
    );
  };

  useEffect(load, []);

  const auditors = useMemo(() => users.filter((u) => u.role === "auditor"), [users]);

  const rows = useMemo(() => {
    const min = minScore ? Number(minScore) : 0;
    return audits
      .map((audit) => ({
        audit,
        restaurant: restaurants.find((r) => r.id === audit.restaurantId),
        auditor: users.find((u) => u.id === audit.auditorId),
        overall: overallScore(audit),
      }))
      .filter((r) => restaurantFilter === "all" || r.audit.restaurantId === restaurantFilter)
      .filter((r) => auditorFilter === "all" || r.audit.auditorId === auditorFilter)
      .filter((r) => r.overall >= min);
  }, [audits, restaurants, users, restaurantFilter, auditorFilter, minScore]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await deleteAudit(deleteTarget.id);
    setDeleteTarget(null);
    setDeletingId(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Audits"
        subtitle={`${audits.length} total · ${rows.length} shown`}
        actions={
          canManage && (
            <button className="btn-add" onClick={() => navigate("/app/audit/audits/new")}>
              <Plus size={16} />
              New audit
            </button>
          )
        }
      />

      <div className="filter-bar">
        <select
          className="input-field"
          style={{ width: 200 }}
          value={restaurantFilter}
          onChange={(e) => setRestaurantFilter(e.target.value)}
        >
          <option value="all">All restaurants</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ width: 180 }}
          value={auditorFilter}
          onChange={(e) => setAuditorFilter(e.target.value)}
        >
          <option value="all">All auditors</option>
          {auditors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={10}
          className="input-field"
          style={{ width: 140 }}
          placeholder="Min score"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Auditor</th>
              <th>Date</th>
              <th>Type</th>
              <th>Score</th>
              {canManage && <th className="col-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<ClipboardCheck size={28} />}
                    title="No audits yet"
                    hint="Audits you submit will show up here."
                  />
                </td>
              </tr>
            ) : (
              rows.map(({ audit, restaurant, auditor, overall }) => (
                <tr key={audit.id} className={deletingId === audit.id ? "row--removing" : ""}>
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => navigate(`/app/audit/audits/${audit.id}`)}
                  >
                    {restaurant?.name ?? "Unknown"}
                  </td>
                  <td className="cell-muted">{auditor?.name ?? "Unknown"}</td>
                  <td>{audit.date}</td>
                  <td>{audit.auditType}</td>
                  <td>
                    <Badge tone={scoreTone(overall)}>{overall.toFixed(1)} / 10</Badge>
                  </td>
                  {canManage && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Delete"
                          disabled={deletingId === audit.id}
                          onClick={() => setDeleteTarget(audit)}
                        >
                          {deletingId === audit.id ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this audit?"
          message="This audit record will be permanently removed."
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AuditsList;
