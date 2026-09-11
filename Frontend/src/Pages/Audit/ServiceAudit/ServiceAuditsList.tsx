import "../auditModern.css";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";

type ServiceAudit = {
  _id: string;
  id: string;
  restaurantId: string;
  auditType: "service";
  status?: string;
  date?: string;
  createdAt: string;
  overallPercentage?: number;
  checks?: Array<{
    answer?: string;
  }>;
  serviceTimeObservations?: Array<{
    seconds?: number | null;
  }>;
};

export default function ServiceAuditsList() {
  const { t } = useTranslation();

  const [audits, setAudits] = useState<ServiceAudit[]>([]);
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
        `${API}/audit-module/service${query ? `?${query}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Failed to load service audits");
      }

      const result = await response.json();
      setAudits(result.data || []);
    } catch (error) {
      console.error("Failed to load service audits:", error);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, [status, restaurantId, from, to]);

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

  if (loading) {
    return <div>{t("audit.service.list.loading")}</div>;
  }

  return (
    <div>
      <h2>{t("audit.service.list.title")}</h2>

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
            {t("audit.service.list.allStatuses", {
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
            {t("audit.service.list.allRestaurants", {
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
          aria-label={t("audit.service.list.from", {
            defaultValue: "From",
          })}
        />

        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label={t("audit.service.list.to", {
            defaultValue: "To",
          })}
        />

        <button type="button" onClick={resetFilters}>
          {t("audit.service.list.resetFilters", {
            defaultValue: "Reset filters",
          })}
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              {t("audit.service.list.status")}
            </th>

            <th>
              {t("audit.service.list.type")}
            </th>

            <th>
              {t("audit.service.list.date")}
            </th>

            <th>
              {t("audit.service.list.overall", {
                defaultValue: "Overall",
              })}
            </th>

            <th>
              {t("audit.service.list.answers", {
                defaultValue: "Answers",
              })}
            </th>

            <th>
              {t("audit.service.list.serviceTime", {
                defaultValue: "Service Time",
              })}
            </th>
          </tr>
        </thead>

        <tbody>
          {audits.map((audit) => {
            const yes =
              audit.checks?.filter(
                (check) =>
                  String(check.answer).toLowerCase() === "yes" ||
                  String(check.answer).toLowerCase() === "y" ||
                  String(check.answer).toLowerCase() === "bəli"
              ).length || 0;

            const no =
              audit.checks?.filter(
                (check) =>
                  String(check.answer).toLowerCase() === "no" ||
                  String(check.answer).toLowerCase() === "n" ||
                  String(check.answer).toLowerCase() === "xeyr"
              ).length || 0;

            const serviceTimes =
              audit.serviceTimeObservations
                ?.map((item) => item.seconds)
                .filter(
                  (seconds): seconds is number =>
                    typeof seconds === "number"
                ) || [];

            const averageServiceTime =
              serviceTimes.length > 0
                ? Math.round(
                    serviceTimes.reduce(
                      (sum, value) => sum + value,
                      0
                    ) / serviceTimes.length
                  )
                : null;

            return (
              <tr key={audit._id || audit.id}>
                <td>
                  {t(`common.status.${audit.status}`, {
                    defaultValue: audit.status || "—",
                  })}
                </td>

                <td>
                  {t("audit.types.service", {
                    defaultValue: "Service Audit",
                  })}
                </td>

                <td>
                  {audit.date ||
                    new Date(
                      audit.createdAt
                    ).toLocaleDateString()}
                </td>

                <td>
                  {typeof audit.overallPercentage === "number"
                    ? `${audit.overallPercentage}%`
                    : "—"}
                </td>

                <td>
                  Yes: {yes} / No: {no}
                </td>

                <td>
                  {averageServiceTime !== null
                    ? `${averageServiceTime}s`
                    : "—"}
                </td>
              </tr>
            );
          })}

          {audits.length === 0 && (
            <tr>
              <td colSpan={6}>
                {t("audit.service.list.empty", {
                  defaultValue: "No service audits found",
                })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
