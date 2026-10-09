import { getFindings } from "../../../Services/auditFindingService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditFindingsList({ auditId }: { auditId: string }) {
 const {data,status,reload}=useAuditResource(auditId,"audit.finding",getFindings);
 return <section><h2>Audit Findings</h2><button type="button" onClick={reload}>Refresh</button>
 {status !== "ready" ? <AuditResourceState status={status} retry={reload} /> : data?.data.length ? data.data.map(item => <div className="audit-card" key={item._id}><h4>{item.title}</h4><p>{item.description}</p><span>Severity: {item.severity}</span><p>Status: {item.status}</p></div>) : <p>No records</p>}
 </section>;
}
