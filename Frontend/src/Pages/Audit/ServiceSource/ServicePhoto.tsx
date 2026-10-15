import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import api from '../../../api/axios';
import {useAuditAction} from '../../../Hooks/useAuditAction';
export default function ServicePhoto({auditId,value,files,disabled,reload,onChange,onBusyChange}:{auditId:string;value:string;files:{id:string;name:string}[];disabled:boolean;reload:()=>void;onChange:(id:string)=>void;onBusyChange:(busy:boolean)=>void}){
 const{t}=useTranslation();const action=useAuditAction(auditId,'audit','update');const[failed,setFailed]=useState(false);
 useEffect(()=>{if(action.busy)onBusyChange(true);return()=>{if(action.busy)onBusyChange(false);};},[action.busy,onBusyChange]);
 return <div className="service-photo"><label>{t('serviceAudit.photo')}<select disabled={disabled||action.busy} value={value} onChange={e=>onChange(e.target.value)}><option value="">{t('serviceAudit.noEvidence')}</option>{files.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>{action.allowed&&<label>{t('serviceAudit.uploadFile')}<input type="file" accept="image/*" disabled={disabled||action.busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setFailed(false);void action.run(async signal=>{try{const body=new FormData();body.append('file',file);const response=await api.post<{data:{id:string}}>(`/audit-evidence/${auditId}`,body,{signal,suppressErrorToast:true});onChange(response.data.data.id);reload();}catch(error){setFailed(true);throw error;}});}}/></label>}{failed&&<p role="alert">{t('serviceAudit.uploadError')}</p>}</div>;
}
