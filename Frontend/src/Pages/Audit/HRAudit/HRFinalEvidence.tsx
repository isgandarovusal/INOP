import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import {useTranslation} from 'react-i18next';
import {isAxiosError} from 'axios';
import api from '../../../api/axios';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import type {HRDetails} from '../../../Services/hrAuditService';
export default function HRFinalEvidence({auditId,details,onChange,files,reload,disabled,onBusyChange}:{auditId:string;details:HRDetails;onChange:Dispatch<SetStateAction<HRDetails>>;files:{id:string;name:string}[];reload:()=>void;disabled:boolean;onBusyChange:(busy:boolean)=>void}){
 const{t}=useTranslation();const upload=useAuditAction(auditId,'audit','update');const[error,setError]=useState('');
 useEffect(()=>{onBusyChange(upload.busy);},[upload.busy,onBusyChange]);
 const final=details.finalEvidence||{};
 const select=(slot:number,id:string)=>onChange(previous=>{const current=previous.finalEvidence||{};const next={...current};if(slot===-1)next.photoId=id;else{next.documentIds=Array.from({length:3},(_,index)=>current.documentIds?.[index]||'');next.documentIds[slot]=id;}return {...previous,finalEvidence:next};});
 return <div className="audit-filter-grid audit-hr-final-evidence">{[-1,0,1,2].map(slot=><div key={slot}>
  <label>{t(slot===-1?'hrAudit.photo':'hrAudit.document',{number:slot+1})}<select disabled={disabled||upload.busy} value={slot===-1?final.photoId||'':final.documentIds?.[slot]||''} onChange={e=>select(slot,e.target.value)}><option value="">{t('hrAudit.noEvidence')}</option>{files.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  {upload.allowed&&<label>{t('hrAudit.uploadFile')}<input type="file" accept={slot===-1?'image/*':undefined} disabled={disabled||upload.busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setError('');void upload.run(async signal=>{try{const form=new FormData();form.append('file',file);const result=await api.post<{data:{id:string}}>(`/audit-evidence/${auditId}`,form,{signal,suppressErrorToast:true});select(slot,result.data.data.id);reload();}catch(error){setError(t(isAxiosError(error)&&error.response?.status===503?'hrAudit.storageBlocked':'hrAudit.uploadError'));throw error;}});}}/></label>}
 </div>)}<p>{t('hrAudit.attachmentSave')}</p>{error&&<p role="alert">{error}</p>}</div>;
}
