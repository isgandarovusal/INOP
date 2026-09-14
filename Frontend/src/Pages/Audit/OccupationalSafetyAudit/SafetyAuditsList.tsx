import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  getOccupationalSafetyAudits,
  deleteOccupationalSafetyAudit,
} from "../../../Services/occupationalSafetyAuditsService";
import type { OccupationalSafetyAudit } from "../../../Types/Audit";

export default function SafetyAuditsList() {
  const { t } = useTranslation();
  const [audits, setAudits] = useState<OccupationalSafetyAudit[]>([]);

  const sortedAudits = useMemo(
    () =>
      [...audits].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [audits]
  );

  async function handleDelete(id: string) {
    if (!window.confirm(t("audit.safety.list.deleteConfirm"))) return;

    deleteOccupationalSafetyAudit(id);
    setAudits(await getOccupationalSafetyAudits());
  }

  return (
    <div className="audit-modern-page">
      <div className="audit-modern-header">
        <div>
          <h1>{t("audit.safety.list.title")}</h1>
          <p>{t("audit.safety.list.subtitle")}</p>
        </div>

        <Link to="/app/audit/safety/new" className="audit-modern-button">
          {t("audit.safety.list.newAudit")}
        </Link>
      </div>

      {sortedAudits.length === 0 ? (
        <div className="audit-modern-empty">
          {t("audit.safety.list.noAudits")}
        </div>
      ) : (
        <div className="audit-modern-table-wrapper">
          <table className="audit-modern-table">
            <thead>
              <tr>
                <th>{t("audit.safety.list.date")}</th>
                <th>{t("audit.safety.list.shift")}</th>
                <th>{t("audit.safety.list.restaurant")}</th>
                <th>{t("audit.safety.list.auditor")}</th>
                <th>{t("audit.safety.list.score")}</th>
                <th>{t("audit.safety.list.status")}</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {sortedAudits.map((audit) => (
                <tr key={audit.id}>
                  <td>{audit.date}</td>
                  <td>{audit.shift}</td>
                  <td>{audit.restaurantId}</td>
                  <td>{audit.auditorId}</td>
                  <td>
                    {audit.scorePercentage.toFixed(1)}%
                  </td>
                  <td>{audit.status}</td>
                  <td>
                    <div className="audit-modern-actions">
                      <Link to={`/app/audit/safety/${audit.id}`}>
                        Bax
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(audit.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
