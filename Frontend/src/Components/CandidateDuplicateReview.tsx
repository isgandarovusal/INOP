import {useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuditResource} from '../Hooks/useAuditResource';
import {useAuditAction} from '../Hooks/useAuditAction';
import {readJson} from '../api/readRequest';
import api from '../api/axios';
import HRResourceState from './HRResourceState';
import {formatDateTime} from '../Utils/dateUtils';
type Item={id:string;name:string;revision:string;reasons:string[];canReview:boolean;review:{id:string;decision:string;note:string;at:string}|null};
type Result={revision:string;hasMore:boolean;automaticMerge:false;items:Item[]};
const load=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<Result>('/candidates/'+id+'/duplicates',{signal,scopeKey,suppressErrorToast:true});
function ReviewItem({id,revision,item,reload}:{id:string;revision:string;item:Item;reload:()=>void}){
 const{t,i18n}=useTranslation(),action=useAuditAction(id,'candidate','update'),[decision,setDecision]=useState('uncertain'),[note,setNote]=useState(''),command=useRef<{key:string;id:string}|undefined>(undefined);
 return <li><Link to={'/app/recruitment/candidates/'+item.id}>{item.name}</Link><p>{item.reasons.map(r=>t('hrIntake.duplicateReasons.'+r)).join(', ')}</p>
 {item.review&&<p data-duplicate-decision>{t('candidateDuplicates.'+item.review.decision)} · {formatDateTime(item.review.at,i18n.language)}{item.review.note?' · '+item.review.note:''}</p>}
 {item.canReview===true&&action.allowed&&<form onSubmit={e=>{e.preventDefault();const payload={otherId:item.id,revision,otherRevision:item.revision,decision,note},key=JSON.stringify(payload);if(command.current?.key!==key)command.current={key,id:crypto.randomUUID()};void action.run(signal=>api.post('/candidates/'+id+'/duplicate-reviews',{...payload,commandId:command.current!.id},{signal,suppressErrorToast:true}),reload);}}>
 <label>{t('candidateDuplicates.decision')}<select aria-label={t('candidateDuplicates.decision')} value={decision} onChange={e=>setDecision(e.target.value)}>{['uncertain','same_person','different_people'].map(v=><option key={v} value={v}>{t('candidateDuplicates.'+v)}</option>)}</select></label>
 <label>{t('candidateDuplicates.note')}<textarea aria-label={t('candidateDuplicates.note')} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><button type='submit' className='btn-secondary' disabled={action.busy}>{t('candidateDuplicates.save')}</button>
 {action.status!=='ready'&&action.status!=='loading'&&<HRResourceState status={action.status}/>}</form>}
 </li>;
}
export default function CandidateDuplicateReview({id}:{id:string}){
 const{t}=useTranslation(),[open,setOpen]=useState(false),result=useAuditResource(open?id:undefined,'candidate',load,{refreshOnFocus:false});
 return <details className='detail-card' data-candidate-duplicates onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('candidateDuplicates.title')}</summary>{open&&<><p>{t('candidateDuplicates.help')}</p>{result.status!=='ready'||!result.data?<HRResourceState status={result.status} retry={result.reload}/>:<>{result.data.items.length?<ul>{result.data.items.map(item=><ReviewItem key={item.id+result.data!.revision+item.revision} id={id} revision={result.data!.revision} item={item} reload={result.reload}/>)}</ul>:<p>{t('hrIntake.noVisibleDuplicate')}</p>}{result.data.hasMore&&<p>{t('candidateDuplicates.more')}</p>}<button type='button' className='btn-secondary' onClick={result.reload}>{t('common.actions.refresh')}</button></>}</>}</details>;
}
