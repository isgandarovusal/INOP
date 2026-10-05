import "../auditModern.css";
import "./serviceAuditsList.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import PageState from "../../../Components/PageState";
import api from "../../../api/axios";
import { getRestaurants } from "../../../Services/restaurantsService";
import type { Restaurant } from "../../../Types/audit";

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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [status, setStatus] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRestaurants = async () => {
      try {
        const result = await getRestaurants();

        if (!cancelled) {
          setRestaurants(result);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load restaurants:", error);
        }
      }
    };

    void loadRestaurants();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const isInitialLoad = !hasLoadedOnce;
      setLoading(isInitialLoad);
      setIsRefreshing(!isInitialLoad);
      setLoadError(false);

      try {
        const params = new URLSearchParams();

        if (status) params.set("status", status);
        if (restaurantId) params.set("restaurantId", restaurantId);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const query = params.toString();

        const response = await api.get<{ data?: ServiceAudit[] }>(
          `/audit-module/service${query ? `?${query}` : ""}`,
        );

        if (!cancelled) {
          setAudits(response.data?.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load service audits:", error);
          setAudits([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
          setHasLoadedOnce(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [status, restaurantId, from, to, retryCount]);

  const resetFilters = () => {
    setStatus("");
    setRestaurantId("");
    setFrom("");
    setTo("");
  };

  if (loading) {
    return (
      <PageState
        type="loading"
        title={t("audit.service.list.loading")}
      />
    );
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
            onClick={() => setRetryCount((value) => value + 1)}
          >
            {t("common.retry")}
          </button>
        }
      />
    );
  }

  return (
    <div className="service-audits-page">
      <h2>{t("audit.service.list.title")}</h2>

      <div className="filter-bar">
        <select
          className="input-field"
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
          className="input-field"
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
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>

        <input
          className="input-field"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label={t("audit.service.list.from", {
            defaultValue: "From",
          })}
        />

        <input
          className="input-field"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label={t("audit.service.list.to", {
            defaultValue: "To",
          })}
        />

        <button type="button" className="btn-secondary" onClick={resetFilters}>
          {t("audit.service.list.resetFilters", {
            defaultValue: "Reset filters",
          })}
        </button>
      </div>

      <div
        className="admin-table-container"
        style={{ position: "relative" }}
      >
        {isRefreshing && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.92)",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {t("common.loading", { defaultValue: "Loading…" })}
          </div>
        )}
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
    </div>
  );
}
