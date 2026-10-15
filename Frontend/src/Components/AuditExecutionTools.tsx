import {Link,useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../Context/useAuth';
import {hasPermission} from '../Utils/permissions';
import {useAuditResource} from '../Hooks/useAuditResource';
import {useAuditAction} from '../Hooks/useAuditAction';
import {listAuditExecutions,startAuditExecution} from '../Services/auditExecutionService';
import AuditResourceState from './AuditResourceState';
export default function AuditExecutionTools({auditId,versioned}:{auditId:string;versioned:boolean}){
 const{t}=useTranslation();const{user}=useAuth();const navigate=useNavigate();const list=useAuditResource(auditId,'audit.execution',listAuditExecutions);const action=useAuditAction(auditId,'audit.execution','create');
 if(!hasPermission(user,'audit.execution','read'))return null;
 return <section className="hr-section"><h3>{t('auditFoundation.execution')}</h3><div className="audit-control-row">{list.data?.data.map(item=><Link className="btn-secondary" key={item._id} to={`/app/audit/execution/${item._id}`}>{t('auditFoundation.open')} · {t(`auditFoundation.statusLabels.${item.status}`,{defaultValue:item.status})}</Link>)}
 {versioned&&action.allowed&&<button type="button" className="btn-primary" disabled={action.busy} onClick={()=>void action.run(async signal=>{const result=await startAuditExecution({auditId},signal);navigate(`/app/audit/execution/${result.data._id}`);})}>{t('auditFoundation.startExecution')}</button>}
 {hasPermission(user,'audit.report','read')&&<Link className="btn-secondary" to={`/app/audit/report/${auditId}`}>{t('auditFoundation.report')}</Link>}</div>
 {list.status!=='ready'&&<AuditResourceState status={list.status} retry={list.reload}/>}</section>;
}
