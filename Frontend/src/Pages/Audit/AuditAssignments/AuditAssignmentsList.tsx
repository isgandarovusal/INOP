import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../Context/useAuth';
import {getAssignments} from '../../../Services/auditAssignmentService';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import {readJson} from '../../../api/readRequest';
import api from '../../../api/axios';
import AuditResourceState from '../../../Components/AuditResourceState';
const candidates=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string}[]}>(`/audit-assignments/${id}/candidates`,{signal,scopeKey});
export default function AuditAssignmentsList({auditId}:{auditId:string}){
 const{t}=useTranslation();const{user}=useAuth();const[id,setId]=useState('');const{data,status,reload}=useAuditResource(auditId,'audit.assignment',getAssignments);const directory=useAuditResource(['admin','audit_manager'].includes(user?.role||'')?auditId:undefined,'audit.assignment',candidates);const create=useAuditAction(auditId,'audit.assignment','create');const revoke=useAuditAction(auditId,'audit.assignment','update');
 return <section className="hr-section"><h3>{t('auditFoundation.assignments')}</h3><button type="button" className="btn-secondary" onClick={reload}>{t('auditFoundation.refresh')}</button>
 {create.allowed&&directory.status==='ready'&&<form className="audit-control-row" onSubmit={event=>{event.preventDefault();void create.run(async signal=>{await api.post('/audit-assignments',{auditId,auditor:id},{signal});},reload);}}><label>{t('auditFoundation.auditor')}<select required value={id} onChange={event=>setId(event.target.value)}><option value="">{t('auditFoundation.chooseAuditor')}</option>{directory.data?.data.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button className="btn-primary" disabled={!id||create.busy}>{t('auditFoundation.assign')}</button></form>}
 {status!=='ready'?<AuditResourceState status={status} retry={reload}/>:data?.data.map(item=><div className="audit-control-row" key={item._id}><span>{typeof item.auditor==='object'?item.auditor?.name:item.auditor} · {t(`auditFoundation.statusLabels.${item.status}`,{defaultValue:item.status})}</span>{revoke.allowed&&['assigned','accepted','started'].includes(item.status)&&<button type="button" className="btn-danger" disabled={revoke.busy} onClick={()=>void revoke.run(async signal=>{await api.delete(`/audit-assignments/${item._id}`,{signal});},reload)}>{t('auditFoundation.revoke')}</button>}</div>)}
 {create.status!=='ready'&&create.status!=='loading'&&<AuditResourceState status={create.status}/>}{status==='ready'&&!data?.data.length&&<p className="audit-inline-empty" role="status">{t("auditFoundation.noRecords")}</p>}</section>;
}
