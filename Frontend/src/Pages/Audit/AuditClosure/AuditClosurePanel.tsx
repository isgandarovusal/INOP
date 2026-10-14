import { SectionCard } from '../../../Components/HRSection';
import { useTranslation } from 'react-i18next';
import { closeAudit } from "../../../Services/auditClosureService";
import { useAuditAction } from "../../../Hooks/useAuditAction";
import AuditResourceState from "../../../Components/AuditResourceState";
export default function AuditClosurePanel({auditId}:{auditId:string}) {
 const {t}=useTranslation();
 const mutation=useAuditAction(auditId,"audit.closure","update");
 return <SectionCard><h3>{t("auditFoundation.closure")}</h3>
 <button type="button" className="btn-primary" disabled={!mutation.allowed || mutation.busy} onClick={()=>void mutation.run(signal=>closeAudit({auditId,comment:"Audit completed"},signal))}>{mutation.busy ? t("auditFoundation.submitting") : t("auditFoundation.closeAudit")}</button>
 {mutation.status !== "ready" && <AuditResourceState status={mutation.status}/>}
 </SectionCard>;
}
