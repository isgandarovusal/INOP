import { getAuditTimeline } from "../../../Services/auditTimelineService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditTimeline({ auditId }: { auditId: string }) {
 const {data,status,reload}=useAuditResource(auditId,"audit.timeline",getAuditTimeline);
 return <section><h2>Audit Timeline</h2><button type="button" onClick={reload}>Refresh</button>
 {status !== "ready" ? <AuditResourceState status={status} retry={reload} /> : data?.data.length ? data.data.map(item => <div className="audit-card" key={item._id}><strong>{item.action}</strong><p>{item.description}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>) : <p>No records</p>}
 </section>;
}
