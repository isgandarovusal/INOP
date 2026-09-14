import { useEffect, useState } from "react";
import { getAuditTimeline } from "../../../Services/auditTimelineService";
import type { AuditTimelineItem } from "../../../Services/auditTimelineService";

interface AuditTimelineProps {
  auditId: string;
}

export default function AuditTimeline({
  auditId,
}: AuditTimelineProps) {
  const [items, setItems] = useState<AuditTimelineItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await getAuditTimeline(auditId);

        if (!cancelled) {
          setItems(result.data ?? []);
        }
      } catch (error) {
        console.error("Failed to load audit timeline:", error);

        if (!cancelled) {
          setItems([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [auditId]);

  return (
    <div>
      <h2>Audit Timeline</h2>

      {items.map((item) => (
        <div
          key={item._id}
          className="audit-card"
        >
          <strong>{item.action}</strong>

          <p>{item.description}</p>

          <small>
            {new Date(item.createdAt).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
}
