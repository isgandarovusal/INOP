import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStandardAudits,
  deleteStandardAudit,
} from "../../../Services/standardAuditsService";
import type { StandardAudit } from "../../../Types/Audit";

export default function StandardAuditsList() {
  const [audits, setAudits] = useState<StandardAudit[]>([]);

  const sortedAudits = useMemo(
    () =>
      [...audits].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [audits]
  );

  async function handleDelete(id: string) {
    if (!window.confirm("Bu Standart Audit silinsin?")) return;

    deleteStandardAudit(id);
    setAudits(await getStandardAudits());
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>Standart Audit</h1>
          <p>
            Qida təhlükəsizliyi və brend standartları üzrə audit.
          </p>
        </div>

        <Link to="/app/audit/standard/new" className="btn btn-primary">
          Yeni Standart Audit
        </Link>
      </div>

      {sortedAudits.length === 0 ? (
        <div className="audit-empty-state">
          Hələ heç bir Standart Audit yaradılmayıb.
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
                <th>Uyğunluq</th>
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
                  <td>{audit.compliancePercentage.toFixed(1)}%</td>
                  <td>{audit.passed ? "PASSED" : "FAILED"}</td>
                  <td>
                    <div className="audit-actions">
                      <Link to={`/app/audit/standard/${audit.id}`}>
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
