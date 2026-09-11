import React, { useEffect, useMemo, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../Components/PageHeader";
import SearchInput from "../../Components/SearchInput";
import EmptyState from "../../Components/EmptyState";
import Badge from "../../Components/Badge";
import { getActivityLogs } from "../../Services/activityLogService";
import type { ActivityLogEntry } from "../../Types/core";

const ActivityLogList: React.FC = () => {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getActivityLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return logs;

    const q = query.toLowerCase();

    return logs.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q),
    );
  }, [logs, query]);

  const relativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);

    if (mins < 1) return t("activityLog.justNow");
    if (mins < 60) {
      return t("activityLog.minutesAgo", { count: mins });
    }

    const hrs = Math.floor(mins / 60);

    if (hrs < 24) {
      return t("activityLog.hoursAgo", { count: hrs });
    }

    const days = Math.floor(hrs / 24);

    return t("activityLog.daysAgo", { count: days });
  };

  return (
    <div>
      <PageHeader
        title={t("activityLog.title")}
        subtitle={t("activityLog.recordedActions", {
          count: logs.length,
        })}
      />

      <div className="filter-bar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("activityLog.search")}
        />
      </div>

      <div className="detail-card">
        {loading ? (
          <div className="empty-state">
            <Loader2 size={24} className="spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<History size={28} />}
            title={t("activityLog.noActivity")}
            hint={t("activityLog.hint")}
          />
        ) : (
          <div className="recent-list">
            {filtered.map((log) => (
              <div className="recent-row" key={log.id}>
                <div className="recent-row__info">
                  <p className="recent-row__title">
                    {log.description}
                  </p>

                  <p className="recent-row__desc">
                    <Badge tone="neutral">
                      {log.entityType}
                    </Badge>
                  </p>
                </div>

                <span className="recent-row__time">
                  {relativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogList;
