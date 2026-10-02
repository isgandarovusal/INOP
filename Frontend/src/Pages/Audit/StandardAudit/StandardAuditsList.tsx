import "../auditModern.css";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import PageState from "../../../Components/PageState";
import { getRestaurants } from "../../../Services/restaurantsService";
import type { Restaurant } from "../../../Types/audit";
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

  const resetFilters = () => {
    setStatus("");
    setRestaurantId("");
    setFrom("");
    setTo("");
  };

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
        const response = await fetch(
          `${API}/audit-module/standard${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load standard audits");
        }

        const result = await response.json();

        if (!cancelled) {
          setAudits(result.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load standard audits:", error);
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

  if (loading) {
    return (
      <PageState
        type="loading"
        title={t("audit.standard.list.loading")}
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
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
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

        <button type="button" className="btn-secondary" onClick={resetFilters}>
          {t("audit.standard.list.resetFilters", {
            defaultValue: "Reset filters",
          })}
        </button>
      </div>

      <div
        className="admin-table-container glass"
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
    </div>
  );
}
