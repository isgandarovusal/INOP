import AuditFilePicker from './AuditFilePicker';
import {useTranslation} from 'react-i18next';
import {useAuditResource} from '../Hooks/useAuditResource';
import {useAuditAction} from '../Hooks/useAuditAction';
import {readJson} from '../api/readRequest';
import api from '../api/axios';
import {downloadBlob} from '../Utils/downloadFile';
import AuditResourceState from './AuditResourceState';
const load=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string;size:number}[]}>(`/audit-evidence/by-audit/${id}`,{signal,scopeKey});
export default function AuditEvidencePanel({auditId}:{auditId:string}){
 const{t}=useTranslation();const resource=useAuditResource(auditId,'audit',load);const upload=useAuditAction(auditId,'audit','update');const download=useAuditAction(auditId,'audit','read');
 return <section className="hr-section"><h3>{t('auditFoundation.evidence')}</h3>{upload.allowed&&<AuditFilePicker translate={t} label={t('auditFoundation.upload')} busy={upload.busy} status={upload.status} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload.run(async signal=>{const form=new FormData();form.append('file',file);await api.post(`/audit-evidence/${auditId}`,form,{signal});},resource.reload);}}/>}
 {resource.status!=='ready'?<AuditResourceState status={resource.status} retry={resource.reload}/>:resource.data?.data.map(file=><div className="audit-control-row" key={file.id}><span>{file.name} · {file.size} B</span><button type="button" className="btn-secondary" disabled={download.busy} onClick={()=>void download.run(async signal=>{const response=await api.get(`/audit-evidence/${file.id}/file`,{signal,responseType:'blob'});downloadBlob(response.data,file.name);})}>{t('auditFoundation.download')}</button></div>)}
 {upload.status!=='ready'&&upload.status!=='loading'&&<AuditResourceState status={upload.status}/>}
 {resource.status==='ready'&&!resource.data?.data.length&&<p className="audit-inline-empty" role="status">{t("auditFoundation.noRecords")}</p>}
 </section>;
}
