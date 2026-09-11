import "../auditModern.css";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";

type StandardAudit = {
  _id: string;
  id: string;
  restaurantId: string;
  auditType: "standard";
  status?: string;
  date?: string;
  createdAt: string;
  compliancePercentage?: number;
  foundCritical?: number;
  foundMajor?: number;
  foundMinor?: number;
  passed?: boolean;
};

export default function StandardAuditsList() {
  const { t } = useTranslation();

  const [audits, setAudits] = useState<StandardAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadAudits = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (status) params.set("status", status);
      if (restaurantId) params.set("restaurantId", restaurantId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const query = params.toString();
      const response = await fetch(
        `${API}/audit-module/standard${query ? `?${query}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Failed to load standard audits");
      }

      const result = await response.json();
      setAudits(result.data || []);
    } catch (error) {
      console.error("Failed to load standard audits:", error);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  };

  const restaurants = useMemo(
    () =>
      Array.from(
        new Set(
          audits
            .map((audit) => audit.restaurantId)
            .filter(Boolean)
        )
      ),
    [audits]
  );

  const resetFilters = () => {
    setStatus("");
    setRestaurantId("");
    setFrom("");
    setTo("");
  };

  useEffect(() => {
    loadAudits();
  }, [status, restaurantId, from, to]);

  if (loading) {
    return <div>{t("audit.standard.list.loading")}</div>;
  }

  return (
    <div>
      <h2>{t("audit.standard.list.title")}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">
            {t("audit.standard.list.allStatuses", {
              defaultValue: "All statuses",
            })}
          </option>
          <option value="draft">
            {t("common.status.draft", {
              defaultValue: "Draft",
            })}
          </option>
          <option value="completed">
            {t("common.status.completed", {
              defaultValue: "Completed",
            })}
          </option>
          <option value="failed">
            {t("common.status.failed", {
              defaultValue: "Failed",
            })}
          </option>
        </select>

        <select
          value={restaurantId}
          onChange={(event) =>
            setRestaurantId(event.target.value)
          }
        >
          <option value="">
            {t("audit.standard.list.allRestaurants", {
              defaultValue: "All restaurants",
            })}
          </option>

          {restaurants.map((restaurant) => (
            <option key={restaurant} value={restaurant}>
              {restaurant}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label={t("audit.standard.list.from", {
            defaultValue: "From",
          })}
        />

        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label={t("audit.standard.list.to", {
            defaultValue: "To",
          })}
        />

        <button type="button" onClick={resetFilters}>
          {t("audit.standard.list.resetFilters", {
            defaultValue: "Reset filters",
          })}
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              {t("audit.standard.list.status")}
            </th>
            <th>
              {t("audit.standard.list.type")}
            </th>
            <th>
              {t("audit.standard.list.date")}
            </th>
            <th>
              {t("audit.standard.list.compliance", {
                defaultValue: "Compliance",
              })}
            </th>
            <th>
              {t("audit.standard.list.findings", {
                defaultValue: "Findings",
              })}
            </th>
            <th>
              {t("audit.standard.list.result", {
                defaultValue: "Result",
              })}
            </th>
          </tr>
        </thead>

        <tbody>
          {audits.map((audit) => (
            <tr key={audit._id || audit.id}>
              <td>
                {t(`common.status.${audit.status}`, {
                  defaultValue: audit.status || "—",
                })}
              </td>

              <td>
                {t("audit.types.standard", {
                  defaultValue: "Standard Audit",
                })}
              </td>

              <td>
                {audit.date ||
                  new Date(audit.createdAt).toLocaleDateString()}
              </td>

              <td>
                {typeof audit.compliancePercentage === "number"
                  ? `${audit.compliancePercentage}%`
                  : "—"}
              </td>

              <td>
                C: {audit.foundCritical ?? 0} / M:{" "}
                {audit.foundMajor ?? 0} / m:{" "}
                {audit.foundMinor ?? 0}
              </td>

              <td>
                {audit.passed === true
                  ? t("audit.standard.list.passed", {
                      defaultValue: "Passed",
                    })
                  : audit.passed === false
                    ? t("audit.standard.list.failed", {
                        defaultValue: "Failed",
                      })
                    : "—"}
              </td>
            </tr>
          ))}

          {audits.length === 0 && (
            <tr>
              <td colSpan={6}>
                {t("audit.standard.list.empty", {
                  defaultValue: "No standard audits found",
                })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
