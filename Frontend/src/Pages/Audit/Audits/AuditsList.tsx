import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge from "../../../Components/Badge";
import { getAudits, deleteAudit } from "../../../Services/auditsService";
import { getRestaurants } from "../../../Services/restaurantsService";
import { getUsers } from "../../../Services/usersService";
import type { Audit } from "../../../Types/audit";
import type { PublicUser } from "../../../Types/auth";
import type { Restaurant } from "../../../Types/audit";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit } from "../../../Utils/permissions";

const scoreTone = (score: number) => (score >= 8 ? "success" : score >= 6 ? "warning" : "danger");

const AuditsList: React.FC = () => {
  const { t } = useTranslation();
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

  const load = async () => {
    try {
      setLoading(true);

      const [
        auditResult,
        restaurantResult,
        userResult,
      ] = await Promise.all([
        getAudits(),
        getRestaurants(),
        getUsers(),
      ]);

      setAudits(
        auditResult.sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        )
      );

      setRestaurants(restaurantResult);
      setUsers(userResult);

    } catch (error) {
      console.error("Failed loading audits:", error);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const auditors = useMemo(() => users.filter((u) => u.role === "auditor"), [users]);

  const rows = useMemo(() => {
    const min = minScore ? Number(minScore) : 0;
    return audits
      .map((audit) => ({
        audit,
        restaurant: restaurants.find((r) => r.id === audit.restaurantId),
        auditor: users.find((u) => u.id === audit.auditorId),
        overall:
          audit.overallPercentage && audit.overallPercentage > 0
            ? audit.overallPercentage / 10
            : (
                audit.scores.cleanliness +
                audit.scores.service +
                audit.scores.food +
                audit.scores.staff
              ) / 4,
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
        title={t("audit.generic.list.title")}
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
          <option value="all">{t("audit.generic.list.allRestaurants")}</option>
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
          <option value="all">{t("audit.generic.list.allAuditors")}</option>
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
          placeholder={t("audit.generic.list.minScore")}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>{t("audit.generic.list.restaurant")}</th>
              <th>{t("audit.generic.list.auditor")}</th>
              <th>{t("audit.generic.list.date")}</th>
              <th>{t("audit.generic.list.type")}</th>
              <th>{t("audit.generic.list.score")}</th>
              {canManage && <th className="col-actions">{t("audit.generic.list.actions")}</th>}
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
                    title={t("audit.generic.list.noAudits")}
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
                          title={t("common.actions.delete")}
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
          title={t("audit.generic.list.deleteTitle")}
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
