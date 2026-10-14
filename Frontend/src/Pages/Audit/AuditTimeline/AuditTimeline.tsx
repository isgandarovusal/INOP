import { useTranslation } from 'react-i18next';
import { SectionCard } from '../../../Components/HRSection';
import { getAuditTimeline } from "../../../Services/auditTimelineService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditTimeline({ auditId }: { auditId: string }) {
 const {t}=useTranslation();
 const {data,status,reload}=useAuditResource(auditId,"audit.timeline",getAuditTimeline);
 return <SectionCard><h3>{t("auditFoundation.timeline")}</h3><button className="btn-secondary" type="button" onClick={reload}>{t("auditFoundation.refresh")}</button>
 {status !== "ready" ? <AuditResourceState status={status} retry={reload} /> : data?.data.length ? data.data.map(item => <div className="audit-card" key={item._id}><strong>{item.action}</strong><p>{item.description}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>) : <p>{t("auditFoundation.noRecords")}</p>}
 </SectionCard>;
}
