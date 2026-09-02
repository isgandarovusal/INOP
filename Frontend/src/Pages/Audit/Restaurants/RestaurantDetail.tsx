import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Loader2, Pencil, Plus, Store } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getRestaurantById } from "../../../Services/restaurantsService";
import { getAudits, overallScore } from "../../../Services/auditsService";
import type { Restaurant, Audit } from "../../../Types/audit";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit } from "../../../Utils/permissions";

const RestaurantDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user ? canManageAudit(user.role) : false;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getRestaurantById(id), getAudits()]).then(([restaurantResult, auditResult]) => {
      setRestaurant(restaurantResult ?? null);
      setAudits(
        auditResult
          .filter((a) => a.restaurantId === id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      );
      setLoading(false);
    });
  }, [id]);

  const history = useMemo(() => audits.map((a) => ({ ...a, overall: overallScore(a) })), [audits]);
  const maxScore = 10;

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!restaurant) {
    return <EmptyState icon={<Store size={28} />} title="Restaurant not found" hint="It may have been deleted." />;
  }

  return (
    <div>
      <PageHeader
        title={restaurant.name}
        subtitle={restaurant.location}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate("/app/audit/restaurants")}>
              <ArrowLeft size={15} /> Back
            </button>
            {canManage && (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/app/audit/restaurants/${restaurant.id}/edit`)}
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  className="btn-add"
                  onClick={() => navigate(`/app/audit/audits/new?restaurantId=${restaurant.id}`)}
                >
                  <Plus size={15} /> New audit
                </button>
              </>
            )}
          </>
        }
      />

      <div className="detail-card">
        <h3>Status</h3>
        <Badge tone={restaurant.status === "active" ? "success" : "neutral"}>
          {restaurant.status}
        </Badge>
      </div>

      <div className="detail-card">
        <h3>Audit history ({history.length})</h3>
        {history.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={26} />}
            title="No audits yet"
            hint="Audits conducted at this restaurant will appear here."
          />
        ) : (
          <>
            <div className="audit-trend-mini">
              {history.map((a) => (
                <div
                  key={a.id}
                  className="audit-trend-mini__bar"
                  style={{ height: `${(a.overall / maxScore) * 100}%` }}
                  title={`${a.date}: ${a.overall.toFixed(1)}`}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, marginBottom: 20 }}>
              {history.map((a) => (
                <span key={a.id} className="audit-trend-mini__label" style={{ flex: 1 }}>
                  {new Date(a.date).toLocaleDateString(undefined, { month: "short" })}
                </span>
              ))}
            </div>

            <div className="admin-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Overall score</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((a) => (
                    <tr
                      key={a.id}
                      className="cell-title--clickable"
                      onClick={() => navigate(`/app/audit/audits/${a.id}`)}
                    >
                      <td>{a.date}</td>
                      <td>{a.auditType}</td>
                      <td>
                        <strong>{a.overall.toFixed(1)}</strong> / 10
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;
