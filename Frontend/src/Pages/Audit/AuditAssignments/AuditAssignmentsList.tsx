import { getAssignments } from "../../../Services/auditAssignmentService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditAssignmentsList({ auditId }: { auditId: string }) {
 const {data,status,reload}=useAuditResource(auditId,"audit.assignment",getAssignments);
 return <section><h2>Audit Assignments</h2><button type="button" onClick={reload}>Refresh</button>
 {status !== "ready" ? <AuditResourceState status={status} retry={reload} /> : data?.data.length ? data.data.map(item => <div className="audit-card" key={item._id}><p>Auditor: {typeof item.auditor === "object" ? item.auditor?.name || "Unknown" : item.auditor || "Unknown"}</p><p>Status: {item.status}</p></div>) : <p>No records</p>}
 </section>;
}
