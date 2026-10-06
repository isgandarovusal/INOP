import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  getOccupationalSafetyAudits,
  deleteOccupationalSafetyAudit,
} from "../../../Services/occupationalSafetyAuditsService";
import type { OccupationalSafetyAudit } from "../../../Types/Audit";
import PageState from "../../../Components/PageState";

export default function SafetyAuditsList() {
  const { t } = useTranslation();
  const [audits, setAudits] = useState<OccupationalSafetyAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      setAudits(await getOccupationalSafetyAudits());
    } catch {
      setLoadError(t("auth.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

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

    setDeletingId(id);

    try {
      await deleteOccupationalSafetyAudit(id);
      await load();
    } catch {
      setLoadError(t("auth.somethingWentWrong"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="audit-modern-page safety-audits-page">
      <div className="audit-modern-header">
        <div>
          <h1>{t("audit.safety.list.title")}</h1>
          <p>{t("audit.safety.list.subtitle")}</p>
        </div>

        <Link to="/app/audit/safety/new" className="btn-primary safety-audits-create">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{t("audit.safety.list.newAudit")}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <PageState type="loading" />
      ) : loadError ? (
        <PageState
          type="error"
          message={loadError}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void load()}
            >
              {t("common.retry")}
            </button>
          }
        />
      ) : sortedAudits.length === 0 ? (
        <section className="safety-audits-empty" aria-label="Occupational safety audit empty state">
          <div className="safety-audits-empty__watermark" aria-hidden="true">
            HSE
          </div>

          <div className="safety-audits-empty__visual" aria-hidden="true">
            <ShieldCheck size={34} strokeWidth={1.8} />
          </div>

          <div className="safety-audits-empty__content">
            <span className="safety-audits-empty__eyebrow">
              Occupational Safety
            </span>
            <h2>{t("audit.safety.list.noAudits")}</h2>
            <p>
              Təhlükəsizlik yoxlamalarını başladın və əməyin mühafizəsi
              nəticələrini burada izləyin.
            </p>
          </div>

        </section>
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
                      <Link
                        to={`/app/audit/safety/${audit.id}`}
                        className="btn-secondary"
                      >
                        Bax
                      </Link>

                      <button
                        type="button"
                        className="btn-danger"
                        disabled={deletingId === audit.id}
                        onClick={() => void handleDelete(audit.id)}
                      >
                        {deletingId === audit.id ? "..." : "Sil"}
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
