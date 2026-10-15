import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {getFindings} from '../../../Services/auditFindingService';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import api from '../../../api/axios';
import AuditResourceState from '../../../Components/AuditResourceState';
export default function AuditFindingsList({auditId}:{auditId:string}){
 const{t}=useTranslation();const[title,setTitle]=useState('');const resource=useAuditResource(auditId,'audit.finding',getFindings);const create=useAuditAction(auditId,'audit.finding','create');const update=useAuditAction(auditId,'audit.finding','update');
 return <section className="hr-section"><h3>{t('auditFoundation.findings')}</h3>{create.allowed&&<form className="audit-control-row" onSubmit={event=>{event.preventDefault();void create.run(async signal=>{await api.post('/audit-findings',{auditId,title},{signal});},()=>{setTitle('');resource.reload();});}}><label>{t('auditFoundation.findingTitle')}<input required value={title} onChange={event=>setTitle(event.target.value)}/></label><button className="btn-primary" disabled={!title.trim()||create.busy}>{t('auditFoundation.addFinding')}</button></form>}
 {resource.status!=='ready'?<AuditResourceState status={resource.status} retry={resource.reload}/>:resource.data?.data.map(item=><article className="audit-card" key={item._id}><h4>{item.title}</h4><p>{item.description}</p><span>{item.severity} · {t(`auditFoundation.statusLabels.${item.status}`,{defaultValue:item.status})}</span>{update.allowed&&item.status!=='closed'&&<button type="button" className="btn-secondary" disabled={update.busy} onClick={()=>void update.run(async signal=>{await api.patch(`/audit-findings/${item._id}/status`,{status:'closed'},{signal});},resource.reload)}>{t('auditFoundation.closeFinding')}</button>}</article>)}
 {create.status!=='ready'&&create.status!=='loading'&&<AuditResourceState status={create.status}/>}{resource.status==='ready'&&!resource.data?.data.length&&<p className="audit-inline-empty" role="status">{t("auditFoundation.noRecords")}</p>}</section>;
}
