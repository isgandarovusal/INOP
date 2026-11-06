import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useAuditResource} from '../Hooks/useAuditResource';
import HRResourceState from './HRResourceState';
import {readJson} from '../api/readRequest';
import {formatDateTime} from '../Utils/dateUtils';
interface History {items:{id:string;decision:string;note:string;at:string;actorId:string;current:boolean}[];page:number;total:number;hasMore:boolean}
const load=(key:string,signal?:AbortSignal,scopeKey?:string)=>{const[id,otherId,page]=JSON.parse(key) as [string,string,number];return readJson<History>(`/candidates/${id}/duplicate-reviews?${new URLSearchParams({otherId,page:String(page),limit:'10'})}`,{signal,scopeKey,suppressErrorToast:true});};
export default function CandidateDuplicateHistory({id,otherId}:{id:string;otherId:string}){
 const{t,i18n}=useTranslation(),[open,setOpen]=useState(false),[page,setPage]=useState(1),result=useAuditResource(open?JSON.stringify([id,otherId,page]):undefined,'candidate',load,{refreshOnFocus:false});
 return <details data-duplicate-history onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('integrationAcceptance.history')}</summary>{open&&(result.status!=='ready'||!result.data?<HRResourceState status={result.status} retry={result.reload}/>:<>
 <p>{t('integrationAcceptance.page',{page,total:result.data.total})}</p><ul>{result.data.items.map(row=><li key={row.id} data-duplicate-history-event><p>{t('candidateDuplicates.'+row.decision)} · {formatDateTime(row.at,i18n.language)}</p><p>{t('integrationAcceptance.actor',{id:row.actorId})}</p><p>{t(row.current?'integrationAcceptance.current':'integrationAcceptance.historical')}</p>{row.note&&<p style={{overflowWrap:'anywhere'}}>{row.note}</p>}</li>)}</ul>
 <button type='button' className='btn-secondary' disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t('auditFoundation.previous')}</button><button type='button' className='btn-secondary' disabled={!result.data.hasMore} onClick={()=>setPage(p=>p+1)}>{t('auditFoundation.next')}</button><button type='button' className='btn-secondary' onClick={result.reload}>{t('common.actions.refresh')}</button></>)}</details>;
}
