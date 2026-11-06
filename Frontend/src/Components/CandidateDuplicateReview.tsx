import {isAxiosError} from 'axios';
import {useAuth} from '../Context/useAuth';
import {syncClientSession} from '../api/clientSession';
import CandidateDuplicateHistory from './CandidateDuplicateHistory';
import {useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuditResource} from '../Hooks/useAuditResource';
import {useAuditAction} from '../Hooks/useAuditAction';
import {readJson} from '../api/readRequest';
import api from '../api/axios';
import HRResourceState from './HRResourceState';
import {formatDateTime} from '../Utils/dateUtils';
type Item={id:string;name:string;revision:string;reasons:string[];canReview:boolean;review:{id:string;decision:string;note:string;at:string}|null};
type Draft={decision:string;note:string};
type Result={revision:string;hasMore:boolean;page:number;total:number;automaticMerge:false;items:Item[]};
const load=(key:string,signal?:AbortSignal,scopeKey?:string)=>{const[id,page]=JSON.parse(key) as [string,number];return readJson<Result>(`/candidates/${id}/duplicates?page=${page}&limit=5`,{signal,scopeKey,suppressErrorToast:true});};
function ReviewItem({id,revision,item,reload,drafts}:{id:string;revision:string;item:Item;reload:()=>void;drafts:Map<string,Draft>}){
 const{t,i18n}=useTranslation(),action=useAuditAction(id,'candidate','update'),[decision,setDecision]=useState(drafts.get(item.id)?.decision||'uncertain'),[note,setNote]=useState(drafts.get(item.id)?.note||''),command=useRef<{key:string;id:string}|undefined>(undefined);
 return <li><Link to={'/app/recruitment/candidates/'+item.id}>{item.name}</Link><p>{item.reasons.map(r=>t('hrIntake.duplicateReasons.'+r)).join(', ')}</p>
 {item.review&&<p data-duplicate-decision>{t('candidateDuplicates.'+item.review.decision)} · {formatDateTime(item.review.at,i18n.language)}{item.review.note?' · '+item.review.note:''}</p>}
 {item.canReview===true&&action.allowed&&!['unauthenticated','forbidden','not-found'].includes(action.status)&&<form onSubmit={e=>{e.preventDefault();const payload={otherId:item.id,revision,otherRevision:item.revision,decision,note},key=JSON.stringify(payload);if(command.current?.key!==key)command.current={key,id:crypto.randomUUID()};void action.run(async signal=>{try{return await api.post('/candidates/'+id+'/duplicate-reviews',{...payload,commandId:command.current!.id},{signal,suppressErrorToast:true});}catch(error){if(isAxiosError(error)&&[401,403,404,409].includes(error.response?.status||0))reload();throw error;}},reload);}}>
 <label>{t('candidateDuplicates.decision')}<select aria-label={t('candidateDuplicates.decision')} value={decision} onChange={e=>{setDecision(e.target.value);drafts.set(item.id,{decision:e.target.value,note});}}>{['uncertain','same_person','different_people'].map(v=><option key={v} value={v}>{t('candidateDuplicates.'+v)}</option>)}</select></label>
 <label>{t('candidateDuplicates.note')}<textarea aria-label={t('candidateDuplicates.note')} maxLength={1000} value={note} onChange={e=>{setNote(e.target.value);drafts.set(item.id,{decision,note:e.target.value});}}/></label><button type='submit' className='btn-secondary' disabled={action.busy}>{t('candidateDuplicates.save')}</button>
 {action.status!=='ready'&&action.status!=='loading'&&<HRResourceState status={action.status}/>}</form>}
 {['unauthenticated','forbidden','not-found'].includes(action.status)&&<HRResourceState status={action.status}/>}
 <CandidateDuplicateHistory id={id} otherId={item.id}/>
 </li>;
}
export default function CandidateDuplicateReview({id}:{id:string}){
 const{t}=useTranslation(),{user}=useAuth(),owner=JSON.stringify([id,syncClientSession(user),api.defaults.baseURL]),[open,setOpen]=useState(false),[position,setPosition]=useState({owner,page:1});
 const page=position.owner===owner?position.page:1,draftStore=useMemo(()=>({owner,notes:new Map<string,Draft>()}),[owner]),drafts=draftStore.notes;
 const result=useAuditResource(open?JSON.stringify([id,page]):undefined,'candidate',load,{refreshOnFocus:false,retainOnReload:true});
 return <details className='detail-card' data-candidate-duplicates onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('candidateDuplicates.title')}</summary>{open&&<><p>{t('candidateDuplicates.help')}</p>{result.status!=='ready'||!result.data?<HRResourceState status={result.status} retry={result.reload}/>:<>{result.data.items.length?<ul>{result.data.items.map(item=><ReviewItem key={item.id+result.data!.revision+item.revision} id={id} revision={result.data!.revision} item={item} reload={result.reload} drafts={drafts}/>)}</ul>:<p>{t('hrIntake.noVisibleDuplicate')}</p>}<p>{t('integrationAcceptance.page',{page,total:result.data.total})}</p><button className='btn-secondary' type='button' disabled={page===1} onClick={()=>setPosition({owner,page:page-1})}>{t('auditFoundation.previous')}</button><button className='btn-secondary' type='button' disabled={!result.data.hasMore} onClick={()=>setPosition({owner,page:page+1})}>{t('auditFoundation.next')}</button><button type='button' className='btn-secondary' onClick={result.reload}>{t('common.actions.refresh')}</button></>}</>}</details>;
}
