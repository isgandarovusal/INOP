import { getApprovals, updateApproval } from "../../../Services/auditApprovalService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import { useAuditAction } from "../../../Hooks/useAuditAction";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditApprovalPanel({auditId}:{auditId:string}) {
 const {data,status,reload}=useAuditResource(auditId,"audit.approval",getApprovals);
 const mutation=useAuditAction(auditId,"audit.approval","update");
 return <section className="audit-modern-card"><h3>Audit Approval</h3>
 {status !== "ready" ? <AuditResourceState status={status} retry={reload}/> : data?.data.length ? data.data.map(item => <div key={item._id} className="detail-row">
 <div><strong>{item.status}</strong><p>{item.comment}</p></div>
 {mutation.allowed && <div>{(["approved","rejected"] as const).map(value => <button key={value} disabled={mutation.busy} onClick={() => void mutation.run(signal=>updateApproval(item._id,{status:value},signal),reload)}>{value === "approved" ? "Approve" : "Reject"}</button>)}</div>}
 </div>) : <p>No approval requests</p>}
 {mutation.status !== "ready" && mutation.status !== "forbidden" && <AuditResourceState status={mutation.status}/>}
 </section>;
}
