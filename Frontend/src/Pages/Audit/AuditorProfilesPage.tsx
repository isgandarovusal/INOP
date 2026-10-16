import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/useAuth';
import { useAuditResource } from '../../Hooks/useAuditResource';
import { useAuditAction } from '../../Hooks/useAuditAction';
import { readJson } from '../../api/readRequest';
import api from '../../api/axios';
import PageHeader from '../../Components/PageHeader';
import { FormSection } from '../../Components/HRSection';
import AuditResourceState from '../../Components/AuditResourceState';
const candidates=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string}[]}>('/auditor-profiles/candidates',{signal,scopeKey});
export default function AuditorProfilesPage(){
 const{t}=useTranslation();const{user}=useAuth();const[id,setId]=useState(''),[direction,setDirection]=useState(''),[reason,setReason]=useState('');const[grants,setGrants]=useState<string[]>([]);
 const list=useAuditResource('candidates','audit.assignment',candidates);
 const load=useCallback((id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{direction:string;directions?:string[];version:number;history:{from:string;to:string;reason:string;changedAt:string}[]}|null}>(`/auditor-profiles/${id}`,{signal,scopeKey}),[]);
 const profile=useAuditResource(id||undefined,'audit.assignment',load);const action=useAuditAction(id,'audit.assignment','update');
 if(!['admin','audit_manager'].includes(user?.role||''))return <AuditResourceState status="forbidden"/>;
 return <div className="audit-direction-page"><PageHeader title={t('auditFoundation.profiles')} subtitle={t('auditCenter.multipleDirections')}/>
 <form onSubmit={event=>{event.preventDefault();void action.run(async signal=>{await api.put(`/auditor-profiles/${id}`,{direction,reason},{signal});},profile.reload);}}><FormSection title={t('auditFoundation.profiles')}>
 <div className="audit-filter-grid"><label>{t('auditFoundation.auditor')}<select required value={id} onChange={event=>{setId(event.target.value);setDirection('');setGrants([]);setReason('');}}><option value="">{t('auditFoundation.chooseAuditor')}</option>{list.data?.data.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
 <label>{t('auditFoundation.direction')}<select required value={direction} onChange={event=>setDirection(event.target.value)}><option value="">{profile.data?.data?t(`auditFoundation.directions.${profile.data.data.direction}`):t('auditFoundation.chooseDirection')}</option>{['hr','service','standard','occupational-safety'].map(key=><option key={key} value={key}>{t(`auditFoundation.directions.${key}`)}</option>)}</select></label>
 <label>{t('auditFoundation.reason')}<input required maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></label></div><button className="btn-primary" disabled={!id||!direction||!reason.trim()||!action.allowed||action.busy}>{t('auditFoundation.save')}</button></FormSection></form>
 {profile.data?.data&&<FormSection title={t('auditCenter.multipleDirections')}><p>{(profile.data.data.directions||[profile.data.data.direction]).map(d=>t(`auditFoundation.directions.${d}`)).join(' · ')}</p><div className="audit-filter-grid">{['hr','service','standard','occupational-safety'].map(d=><label key={d}><input type="checkbox" checked={grants.includes(d)} onChange={e=>setGrants(p=>e.target.checked?[...p,d]:p.filter(v=>v!==d))}/>{t(`auditFoundation.directions.${d}`)}</label>)}</div><button className="btn-primary" disabled={!grants.length||!reason.trim()||action.busy||!action.allowed} onClick={()=>void action.run(signal=>api.patch(`/auditor-profiles/${id}/directions`,{directions:grants,reason,expectedVersion:profile.data!.data!.version},{signal}),profile.reload)}>{t('auditFoundation.save')}</button></FormSection>}
 {action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
 {profile.data?.data&&<section className="hr-section"><h3>{t('auditFoundation.history')}</h3><ul>{profile.data.data.history.map((entry,index)=><li key={index}>{entry.changedAt.slice(0,10)} · {entry.from||'—'} → {entry.to} · {entry.reason}</li>)}</ul></section>}
 </div>;
}
