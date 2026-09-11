import { useEffect, useState } from "react";
import {
  getAuditHistory,
  type AuditActivity,
} from "../../../Services/auditActivityService";

interface AuditHistoryPanelProps {
  auditId: string;
}

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const getUserName = (activity: AuditActivity) => {
  if (!activity.user) {
    return "System";
  }

  if (activity.user.name) {
    return activity.user.name;
  }

  const fullName = [
    activity.user.firstName,
    activity.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || activity.user.email || "User";
};

const getActionLabel = (action: string) => {
  return action
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const AuditHistoryPanel = ({
  auditId,
}: AuditHistoryPanelProps) => {
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    if (!auditId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getAuditHistory(auditId);

      setActivities(response.data || []);
    } catch (err) {
      console.error("Failed to load audit history:", err);
      setError("Audit history could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [auditId]);

  return (
    <section
      style={{
        marginTop: "24px",
        padding: "20px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          gap: "12px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
            }}
          >
            Audit History
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Activity and lifecycle events for this audit.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          style={{
            padding: "8px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div
          style={{
            padding: "20px 0",
            color: "#6b7280",
          }}
        >
          Loading audit history...
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            padding: "14px",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div
          style={{
            padding: "20px 0",
            color: "#6b7280",
          }}
        >
          No activity has been recorded for this audit yet.
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {activities.map((activity) => (
            <div
              key={activity._id}
              style={{
                display: "grid",
                gridTemplateColumns: "12px 1fr",
                gap: "12px",
                padding: "14px",
                border: "1px solid #f0f0f0",
                borderRadius: "10px",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#4f46e5",
                  marginTop: "5px",
                }}
              />

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>
                    {getActionLabel(activity.action)}
                  </strong>

                  <span
                    style={{
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    {formatDate(activity.createdAt)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  {activity.description ||
                    `${activity.resource} activity`}
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  By: {getUserName(activity)} · Resource:{" "}
                  {activity.resource}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AuditHistoryPanel;
