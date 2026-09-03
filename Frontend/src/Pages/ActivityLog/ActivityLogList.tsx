import React, { useEffect, useMemo, useState } from "react";
import { History, Loader2 } from "lucide-react";
import PageHeader from "../../Components/PageHeader";
import SearchInput from "../../Components/SearchInput";
import EmptyState from "../../Components/EmptyState";
import Badge from "../../Components/Badge";
import { getActivityLogs } from "../../Services/activityLogService";
import type { ActivityLogEntry } from "../../Types/core";

const relativeTime = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const ActivityLogList: React.FC = () => {
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
      (l) => l.description.toLowerCase().includes(q) || l.entityType.toLowerCase().includes(q),
    );
  }, [logs, query]);

  return (
    <div>
      <PageHeader title="Activity log" subtitle={`${logs.length} recorded actions`} />

      <div className="filter-bar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search actions…" />
      </div>

      <div className="detail-card">
        {loading ? (
          <div className="empty-state">
            <Loader2 size={24} className="spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<History size={28} />} title="No activity yet" hint="Actions across the platform will appear here." />
        ) : (
          <div className="recent-list">
            {filtered.map((log) => (
              <div className="recent-row" key={log.id}>
                <div className="recent-row__info">
                  <p className="recent-row__title">{log.description}</p>
                  <p className="recent-row__desc">
                    <Badge tone="neutral">{log.entityType}</Badge>
                  </p>
                </div>
                <span className="recent-row__time">{relativeTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogList;
