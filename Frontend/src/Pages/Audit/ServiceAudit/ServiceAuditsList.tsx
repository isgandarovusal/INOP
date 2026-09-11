import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getServiceAudits,
  deleteServiceAudit,
} from "../../../Services/serviceAuditsService";
import type { ServiceAudit } from "../../../Types/Audit";

export default function ServiceAuditsList() {
  const [audits, setAudits] = useState<ServiceAudit[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getServiceAudits();
        setAudits(data);
      } catch {
        setAudits([]);
      }
    };

    load();
  }, []);

  const sortedAudits = useMemo(
    () =>
      [...audits].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [audits]
  );

  async function handleDelete(id: string) {
    if (!window.confirm("Bu Service Audit silinsin?")) return;

    try {
      await deleteServiceAudit(id);
      const data = await getServiceAudits();
      setAudits(data);
    } catch {
      setAudits([]);
    }
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>Servis Auditi</h1>
          <p>Servis keyfiyyəti və qonaq təcrübəsinin qiymətləndirilməsi.</p>
        </div>

        <Link to="/app/audit/service/new" className="btn btn-primary">
          Yeni Servis Auditi
        </Link>
      </div>

      {sortedAudits.length === 0 ? (
        <div className="audit-empty-state">
          Hələ heç bir Servis Auditi yaradılmayıb.
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
                <th>Nəticə</th>
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
                  <td>{audit.overallPercentage.toFixed(1)}%</td>
                  <td>{audit.status}</td>
                  <td>
                    <div className="audit-actions">
                      <Link to={`/app/audit/service/${audit.id}`}>
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
