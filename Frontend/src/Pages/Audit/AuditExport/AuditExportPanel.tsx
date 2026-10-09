import {exportAuditCsv,exportAuditExcel,exportAuditPdf} from "../../../Services/auditExportService";
import {useAuditAction} from "../../../Hooks/useAuditAction";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditExportPanel({auditId}:{auditId:string}) {
 const mutation=useAuditAction(auditId,"audit.export","read");
 return <section className="audit-modern-card"><h3>Audit Export</h3>
 {([["PDF",exportAuditPdf],["Excel",exportAuditExcel],["CSV",exportAuditCsv]] as const).map(([label,download])=><button key={label} disabled={!mutation.allowed || mutation.busy} onClick={()=>void mutation.run(signal=>download(auditId,signal))}>Export {label}</button>)}
 {mutation.status !== "ready" && <AuditResourceState status={mutation.status}/>}
 </section>;
}
