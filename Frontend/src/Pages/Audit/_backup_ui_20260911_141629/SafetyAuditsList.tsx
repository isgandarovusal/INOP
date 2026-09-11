import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOccupationalSafetyAudits,
  deleteOccupationalSafetyAudit,
} from "../../../Services/occupationalSafetyAuditsService";
import type { OccupationalSafetyAudit } from "../../../Types/Audit";

export default function SafetyAuditsList() {
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
    if (!window.confirm("Bu Əməyin Mühafizəsi Auditi silinsin?")) return;

    deleteOccupationalSafetyAudit(id);
    setAudits(await getOccupationalSafetyAudits());
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>Əməyin Mühafizəsi Auditi</h1>
          <p>Təhlükəsizlik və əməyin mühafizəsi yoxlamaları.</p>
        </div>

        <Link to="/app/audit/safety/new" className="btn btn-primary">
          Yeni Təhlükəsizlik Auditi
        </Link>
      </div>

      {sortedAudits.length === 0 ? (
        <div className="audit-empty-state">
          Hələ heç bir Əməyin Mühafizəsi Auditi yaradılmayıb.
        </div>
      ) : (
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Növbə</th>
                <th>Restoran</th>
                <th>Auditor</th>
                <th>Bal</th>
                <th>Status</th>
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
                    <div className="audit-actions">
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
