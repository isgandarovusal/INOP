import {auditScore} from '../../../Utils/auditScore';
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Pencil, Plus, Store } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import PageState from "../../../Components/PageState";
import { getRestaurantById } from "../../../Services/restaurantsService";
import { getAudits } from "../../../Services/auditsService";
import type { Restaurant, Audit } from "../../../Types/audit";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit } from "../../../Utils/permissions";

const RestaurantDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user ? canManageAudit(user) : false;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const [restaurantResult, auditResult] = await Promise.all([
          getRestaurantById(id),
          getAudits(),
        ]);

        if (cancelled) return;

        setRestaurant(restaurantResult ?? null);
        setAudits(
          auditResult
            .filter((a) => a.restaurantId === id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed loading restaurant detail:", error);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, revision]);

  const history = useMemo(
    () =>
      audits.map((a) => {
        const versioned = Boolean(a.hrAssessment || a.serviceAssessment || a.standardAssessment || a.hseAssessment);
        const percent = a.overallPercentage;
        // Display the published source result; never replace all-N/A or a real
        // zero with a legacy category average. No assessment is recomputed here.
        const source = (!a.assessmentStatus || a.assessmentStatus === 'scored') && typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent / 10 : null;
        return { ...a, overall: versioned ? source : auditScore(a) };
      }),
    [audits]
  );

  const maxScore = 10;

  if (loading) {
    return <PageState type="loading" />;
  }

  if (loadError) {
    return (
      <PageState
        type="error"
        title={t("auth.somethingWentWrong")}
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRevision(value => value + 1)}
          >
            {t("common.retry")}
          </button>
        }
      />
    );
  }

  if (!restaurant) {
    return <EmptyState icon={<Store size={28} />} title={t("audit.restaurants.detail.notFound")} hint={t("audit.restaurants.detail.deletedHint")} />;
  }

  return (
    <div className="restaurant-detail-page">
      <PageHeader
        title={restaurant.name}
        subtitle={restaurant.location}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate("/app/audit/restaurants")}>
              <ArrowLeft size={15} /> {t("audit.restaurants.detail.back")}
            </button>
            {canManage && (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/app/audit/restaurants/${restaurant.id}/edit`)}
                >
                  <Pencil size={15} /> {t("audit.restaurants.detail.edit")}
                </button>
                <button
                  className="btn-add"
                  onClick={() => navigate(`/app/audit/audits/new?restaurantId=${restaurant.id}`)}
                >
                  <Plus size={15} /> {t("audit.restaurants.detail.newAudit")}
                </button>
              </>
            )}
          </>
        }
      />

      <div className="audit-modern-card">
        <h3>{t("audit.restaurants.detail.status")}</h3>
        <Badge tone={restaurant.status === "active" ? "success" : "neutral"}>
          {t(`common.status.${restaurant.status}`)}
        </Badge>
      </div>

      <div className="audit-modern-card">
        <h3>{t("audit.restaurants.detail.auditHistory", { count: history.length })}</h3>
        {history.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={26} />}
            title={t("audit.restaurants.detail.noAudits")}
            hint={t("audit.restaurants.detail.historyHint")}
          />
        ) : (
          <>
            <div className="audit-trend-mini">
              {history.map((a) => (
                <div
                  key={a.id}
                  className="audit-trend-mini__bar"
                  style={{ height: `${((a.overall ?? 0) / maxScore) * 100}%` }}
                  title={`${a.date}: ${a.overall?.toFixed(1) ?? t("hrAudit.notAssessed")}`}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, marginBottom: 20 }}>
              {history.map((a) => (
                <span key={a.id} className="audit-trend-mini__label" style={{ flex: 1 }}>
                  {new Date(a.date).toLocaleDateString(i18n.language, { month: "short" })}
                </span>
              ))}
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("audit.restaurants.detail.date")}</th>
                    <th>{t("audit.restaurants.detail.type")}</th>
                    <th>{t("audit.restaurants.detail.overallScore")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((a) => (
                    <tr
                      key={a.id}
                    >
                      <th scope="row"><Link to={`/app/audit/audits/${a.id}`}>{a.date}</Link></th>
                      <td>{t(`auditFoundation.directions.${a.auditType==='safety'?'occupational-safety':a.auditType}`,{defaultValue:a.auditType})}</td>
                      <td>
                        <strong>{a.overall===null?t("hrAudit.notAssessed"):`${a.overall.toFixed(1)} / 10`}</strong>
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
