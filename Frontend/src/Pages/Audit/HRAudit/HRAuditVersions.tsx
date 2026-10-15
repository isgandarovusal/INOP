import {useCallback,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SectionCard} from '../../../Components/HRSection';
import AuditResourceState from '../../../Components/AuditResourceState';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {readJson} from '../../../api/readRequest';
interface Version {version:number;actor:string;at:string;status:string;answers:{questionId:string;answer:string;comment?:string}[];details:{observations?:string;finalOpinion?:string}}
export default function HRAuditVersions({executionId,historyPath='hr-history'}:{executionId:string;historyPath?:string}){
 const{t,i18n}=useTranslation();const[page,setPage]=useState(1);
 const load=useCallback((id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:Version[];hasMore:boolean}>(`/audit-execution/${id}/${historyPath}?page=${page}&limit=25`,{signal,scopeKey,suppressErrorToast:true}),[page,historyPath]);
 const resource=useAuditResource(executionId,'audit.execution',load,{refreshOnFocus:false});
 return <SectionCard><h2>{t('hrAudit.versions')}</h2>{resource.status!=='ready'?<AuditResourceState status={resource.status} retry={resource.reload}/>:resource.data?.data.length?<ol className="audit-event-list">{resource.data.data.map(v=><li key={v.version}><details><summary>v{v.version} · {new Date(v.at).toLocaleString(i18n.language)} · {t(`auditFoundation.statusLabels.${v.status}`,{defaultValue:v.status})}</summary><p>{t('auditFoundation.auditor')}: {v.actor}</p><p>{v.details.observations}</p><p>{v.details.finalOpinion}</p><ul>{v.answers.map(a=><li key={a.questionId}>{a.questionId}: {a.answer==='na'?'N/A':a.answer} {a.comment&&`· ${a.comment}`}</li>)}</ul></details></li>)}</ol>:<p>{t('hrAudit.empty')}</p>}<nav className="audit-control-row" aria-label={t('auditFoundation.pagination')}><button type="button" className="btn-secondary" disabled={page<=1||resource.status!=='ready'} onClick={()=>setPage(p=>p-1)}>{t('auditFoundation.previous')}</button><span>{page}</span><button type="button" className="btn-secondary" disabled={!resource.data?.hasMore||resource.status!=='ready'} onClick={()=>setPage(p=>p+1)}>{t('auditFoundation.next')}</button></nav></SectionCard>;
}
