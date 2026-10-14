import { useTranslation } from 'react-i18next';
import { SectionCard } from '../../../Components/HRSection';
import {exportAuditCsv,exportAuditExcel,exportAuditPdf} from "../../../Services/auditExportService";
import {useAuditAction} from "../../../Hooks/useAuditAction";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditExportPanel({auditId}:{auditId:string}) {
 const {t}=useTranslation();
 const mutation=useAuditAction(auditId,"audit.export","read");
 return <SectionCard><h3>{t("auditFoundation.export")}</h3><div className="audit-control-row">
 {([["PDF",exportAuditPdf],["Excel",exportAuditExcel],["CSV",exportAuditCsv]] as const).map(([label,download])=><button type="button" className="btn-secondary" key={label} disabled={!mutation.allowed || mutation.busy} onClick={()=>void mutation.run(signal=>download(auditId,signal))}>{t("auditFoundation.export")} {label}</button>)}
 </div>
 {mutation.status !== "ready" && <AuditResourceState status={mutation.status}/>}
 </SectionCard>;
}
