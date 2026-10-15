import { useTranslation } from "react-i18next";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
import { SectionCard } from "../../../Components/HRSection";
import { getAuditHistory, type AuditActivity } from "../../../Services/auditActivityService";

export default function AuditHistoryPanel({ auditId }: { auditId: string }) {
  const { t, i18n } = useTranslation();
  const { data, status, reload } = useAuditResource(auditId, "audit.activity", getAuditHistory);
  const activities = data?.data || [];
  const userName = (activity: AuditActivity) => {
    if (!activity.user) return t("auditPresentation.system");
    return activity.user.name || [activity.user.firstName, activity.user.lastName].filter(Boolean).join(" ") || activity.user.email || t("auditPresentation.user");
  };
  return <SectionCard className="audit-history">
    <div className="audit-section-header"><div><h2>{t("auditFoundation.history")}</h2><p>{t("auditPresentation.historyHelp")}</p></div>
      <button className="btn-secondary" type="button" onClick={reload} disabled={status === "loading"}>{t("auditFoundation.refresh")}</button>
    </div>
    {status !== "ready" ? <AuditResourceState status={status} retry={reload} /> : activities.length === 0 ? <p className="audit-inline-empty" role="status">{t("auditPresentation.emptyHistory")}</p> :
      <ol className="audit-event-list">{activities.map(activity => {
        const date = new Date(activity.createdAt);
        return <li key={activity._id}><div className="audit-event-heading"><strong>{activity.action.replace(/[_-]/g, " ")}</strong>
          <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{Number.isNaN(date.getTime()) ? activity.createdAt : date.toLocaleString(i18n.language)}</time></div>
          <p>{activity.description || t("auditPresentation.activity", { resource: activity.resource })}</p>
          <small>{t("auditPresentation.by")}: {userName(activity)} · {t("auditPresentation.resource")}: {activity.resource}</small>
        </li>;
      })}</ol>}
  </SectionCard>;
}
