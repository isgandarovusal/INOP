import {useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {isAxiosError} from 'axios';
import {useAuditResource} from '../Hooks/useAuditResource';
import {useAuditAction} from '../Hooks/useAuditAction';
import AuditResourceState from './AuditResourceState';
import {readJson} from '../api/readRequest';
import api from '../api/axios';
import {formatDateOnly,formatDateTime} from '../Utils/dateUtils';
interface Links{version:string;eligible:boolean;canCreate:boolean;page:number;total:number;hasMore:boolean;items:{id:string;parent:{_id:string;id:string;date:string;status:string};child:{_id:string;id:string;date:string;status:string};actorId:string;at:string}[]}
const load=(key:string,signal?:AbortSignal,scopeKey?:string)=>{const[id,page]=JSON.parse(key) as [string,number];return readJson<Links>(`/audit-reinspections/${encodeURIComponent(id)}?page=${page}&limit=10`,{signal,scopeKey,suppressErrorToast:true});};
export default function AuditReinspections({id,direction}:{id:string;direction:string}){
 const{t,i18n}=useTranslation(),[page,setPage]=useState(1),[date,setDate]=useState(''),[error,setError]=useState(''),command=useRef<{key:string;id:string}|undefined>(undefined);
 const resource=useAuditResource(JSON.stringify([id,page]),'audit',load,{refreshOnFocus:false,retainOnReload:true}),action=useAuditAction(id,'audit','create',direction);
 return <section className='detail-card' data-audit-reinspections><h2>{t('reinspection.title')}</h2><p>{t('reinspection.policy')}</p>
 {resource.status!=='ready'||!resource.data?<AuditResourceState status={resource.status} retry={resource.reload}/>:<>
 {resource.data.canCreate===true&&action.allowed&&<form onSubmit={e=>{e.preventDefault();const payload={date,expectedVersion:resource.data!.version},key=JSON.stringify([id,payload]);if(command.current?.key!==key)command.current={key,id:crypto.randomUUID()};setError('');void action.run(async signal=>{try{await api.post('/audit-reinspections/'+encodeURIComponent(id),{...payload,commandId:command.current!.id},{signal,suppressErrorToast:true});}catch(err){const status=isAxiosError(err)?err.response?.status:undefined;setError(status===409?'conflict':[401,403,404].includes(status||0)?'denied':'failed');if([401,403,404,409].includes(status||0))resource.reload();throw err;}},resource.reload);}}>
 <label>{t('reinspection.date')}<input type='date' aria-label={t('reinspection.date')} required value={date} onChange={e=>setDate(e.target.value)}/></label><button type='submit' className='btn-secondary' disabled={action.busy}>{t(action.busy?'reinspection.creating':'reinspection.create')}</button></form>}
 {!resource.data.eligible&&<p>{t('reinspection.notEligible')}</p>}
 {resource.data.items.map(row=><article key={row.id} data-reinspection-link><p><Link to={'/app/audit/audits/'+row.parent.id}>{t('reinspection.original')} · {formatDateOnly(row.parent.date,i18n.language)}</Link></p><p><Link to={'/app/audit/audits/'+row.child.id}>{t('reinspection.child')} · {formatDateOnly(row.child.date,i18n.language)}</Link></p><p>{t('reinspection.recorded',{actor:row.actorId})} · {formatDateTime(row.at,i18n.language)}</p></article>)}
 <p>{t('integrationAcceptance.page',{page,total:resource.data.total})}</p><button type='button' className='btn-secondary' disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t('auditFoundation.previous')}</button><button type='button' className='btn-secondary' disabled={!resource.data.hasMore||page>=10000} onClick={()=>setPage(p=>p+1)}>{t('auditFoundation.next')}</button><button type='button' className='btn-secondary' onClick={resource.reload}>{t('common.actions.refresh')}</button>
 </>}{error&&<p role='alert'>{t('reinspection.'+error)}</p>}
 </section>;
}
