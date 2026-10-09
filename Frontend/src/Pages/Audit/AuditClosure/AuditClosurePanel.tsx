import { closeAudit } from "../../../Services/auditClosureService";
import { useAuditAction } from "../../../Hooks/useAuditAction";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditClosurePanel({auditId}:{auditId:string}) {
 const mutation=useAuditAction(auditId,"audit.closure","update");
 return <section className="audit-modern-card"><h3>Audit Closure</h3>
 <button disabled={!mutation.allowed || mutation.busy} onClick={()=>void mutation.run(signal=>closeAudit({auditId,comment:"Audit completed"},signal))}>{mutation.busy ? "Closing…" : "Close Audit"}</button>
 {mutation.status !== "ready" && <AuditResourceState status={mutation.status}/>}
 </section>;
}
