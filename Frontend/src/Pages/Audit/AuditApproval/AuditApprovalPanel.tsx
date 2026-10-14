import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../Context/useAuth';
import {getApprovals,updateApproval} from '../../../Services/auditApprovalService';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import {readJson} from '../../../api/readRequest';
import api from '../../../api/axios';
import AuditResourceState from '../../../Components/AuditResourceState';
const reviewers=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string}[]}>(`/audit-approval/${id}/reviewers`,{signal,scopeKey});
export default function AuditApprovalPanel({auditId}:{auditId:string}){
 const{t}=useTranslation();const{user}=useAuth();const[id,setId]=useState('');const resource=useAuditResource(auditId,'audit.approval',getApprovals);const directory=useAuditResource(auditId,'audit.approval',reviewers);const create=useAuditAction(auditId,'audit.approval','create');const update=useAuditAction(auditId,'audit.approval','update');
 return <section className="hr-section"><h3>{t('auditFoundation.approval')}</h3>{create.allowed&&<form className="audit-control-row" onSubmit={event=>{event.preventDefault();void create.run(async signal=>{await api.post('/audit-approval',{auditId,reviewer:id},{signal});},resource.reload);}}><label>{t('auditFoundation.reviewer')}<select required value={id} onChange={event=>setId(event.target.value)}><option value="">{t('auditFoundation.chooseReviewer')}</option>{directory.data?.data.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button className="btn-primary" disabled={!id||create.busy}>{t('auditFoundation.requestApproval')}</button></form>}
 {resource.status!=='ready'?<AuditResourceState status={resource.status} retry={resource.reload}/>:resource.data?.data.map(item=><div className="detail-row" key={item._id}><strong>{t(`auditFoundation.statusLabels.${item.status}`)}</strong><p>{item.comment}</p>{update.allowed&&item.status==='pending'&&item.requestedBy!==user?.id&&(item.reviewer===user?.id||['admin','audit_manager'].includes(user?.role||''))&&(['approved','rejected'] as const).map(status=><button key={status} type="button" className="btn-secondary" disabled={update.busy} onClick={()=>void update.run(signal=>updateApproval(item._id,{status},signal),resource.reload)}>{t(`auditFoundation.statusLabels.${status}`)}</button>)}</div>)}
 {create.status!=='ready'&&create.status!=='loading'&&<AuditResourceState status={create.status}/>}</section>;
}
