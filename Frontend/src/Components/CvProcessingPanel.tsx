import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {isAxiosError} from 'axios';
import {useAuth} from '../Context/useAuth';
import {hasPermission} from '../Utils/permissions';
import {useHRActionContext} from '../Hooks/useHRActionContext';
import {getCvProcessing,listCvProcessing,startCvProcessing,retryCvProcessing} from '../Services/cvProcessingService';
import type {CvProcessingJob} from '../Services/cvProcessingService';
import type {Candidate} from '../Types/recruitment';
const codes=new Set(['QUEUED','PROCESSING','REVIEW_REQUIRED','OCR_REQUIRED','AUTH_REVOKED','SOURCE_CHANGED','SOURCE_MISSING','RESULT_LIMIT','INPUT_LIMIT','STORAGE_NOT_CONFIGURED','PROCESSING_TIMEOUT','PROCESSING_FAILED','ATTEMPTS_EXHAUSTED']);
const fields=['name','email','phone','phoneRaw','role','education','skills','experience','languages','certificates'];
function facts(value:unknown):string { if(value==null||value==='')return '';if(typeof value==='string'||typeof value==='number')return String(value).slice(0,500);if(Array.isArray(value))return value.filter(v=>typeof v==='string').slice(0,20).join(', ').slice(0,1000);return ''; }
export default function CvProcessingPanel({candidate,onAccessDenied}:{candidate:Candidate;onAccessDenied:()=>void}) {
 const {t}=useTranslation(),{user}=useAuth(),context=useHRActionContext(candidate.id);
 const [open,setOpen]=useState(false),[jobs,setJobs]=useState<CvProcessingJob[]>([]),[selected,setSelected]=useState<CvProcessingJob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef<{sequence:number;controller:AbortController|null}>({sequence:0,controller:null});
 useEffect(()=>()=>{active.current.controller?.abort();active.current.sequence++;},[]);
 const canStart=hasPermission(user,'candidate','update')&&typeof candidate.revision==='number'&&Number.isInteger(candidate.revision)&&/^[a-f0-9]{64}$/.test(candidate.cvOriginal?.sha256||'');
 async function run(action:'list'|'start'|'get'|'retry',jobId?:string) {
  const expectedHash=candidate.cvOriginal?.sha256,expectedRevision=candidate.revision;
  if(action==='start'&&(!canStart||typeof expectedHash!=='string'||typeof expectedRevision!=='number'))return;
  const retryJob=action==='retry'?jobs.find(job=>job.id===jobId):undefined;
  if(action==='retry'&&(!canStart||!retryJob||!retryable(retryJob)))return;
  const key=context.key,sequence=++active.current.sequence,controller=new AbortController();active.current.controller?.abort();active.current.controller=controller;setBusy(true);setError('');
  try {
   const result=action==='list'?await listCvProcessing(candidate.id,controller.signal):action==='start'?await startCvProcessing(candidate.id,{expectedHash:expectedHash!,expectedRevision:expectedRevision!},controller.signal):action==='retry'?await retryCvProcessing(candidate.id,retryJob!,controller.signal):await getCvProcessing(candidate.id,jobId!,controller.signal);
   if(controller.signal.aborted||context.current.current!==key||active.current.sequence!==sequence)return;
   if(Array.isArray(result)){setJobs(result);setSelected(null);}else{setSelected(result);setJobs(old=>[result,...old.filter(j=>j.id!==result.id)].slice(0,20));}
  }catch(failure){
   if(controller.signal.aborted||context.current.current!==key||active.current.sequence!==sequence)return;
   const status=isAxiosError(failure)?failure.response?.status:undefined,code=isAxiosError(failure)?failure.response?.data?.code:undefined;
   if(status===401||status===403||(status===404&&code==='PROCESSING_PARENT_UNAVAILABLE')){onAccessDenied();return;}
   if(action==='get'||status===409)setSelected(null);
   setError(code==='PROCESSING_DISABLED'?'disabled':code==='PROCESSING_QUEUE_NOT_READY'?'setup':status===409?'changed':status===429?'busy':status===404?'missing':'unavailable');
  }finally{if(!controller.signal.aborted&&context.current.current===key&&active.current.sequence===sequence)setBusy(false);}
 }
 function retryable(job:CvProcessingJob){return job.currentSource&&job.state==='blocked'&&['SOURCE_MISSING','STORAGE_NOT_CONFIGURED'].includes(job.code)&&job.attempts>=1&&job.attempts<3&&job.manualRetries<2&&job.source.sha256===candidate.cvOriginal?.sha256&&job.source.revision===candidate.revision;}
 if(!hasPermission(user,'candidate','read'))return null;
 return <section data-cv-processing><h3>{t('hrProcessing.title')}</h3><p>{t('hrProcessing.notice')}</p>
  {!open?<button type="button" onClick={()=>{setOpen(true);void run('list');}}>{t('hrProcessing.show')}</button>:<>
   <button type="button" disabled={busy} onClick={()=>void run('list')}>{t('hrProcessing.refresh')}</button>
   {canStart?<button type="button" disabled={busy} onClick={()=>void run('start')}>{t('hrProcessing.start')}</button>:<p>{t(hasPermission(user,'candidate','update')?'hrProcessing.identityRequired':'hrProcessing.readOnly')}</p>}
   {busy&&<p role="status" aria-busy="true">{t('common.actions.loading')}</p>}
   {error&&<p role="alert">{t(`hrProcessing.error.${error}`)}</p>}
   {!busy&&!error&&!jobs.length&&<p>{t('hrProcessing.empty')}</p>}
   <ul>{jobs.map(job=><li key={job.id}><strong>{t(`hrProcessing.state.${job.state}`)}</strong> — {t(`hrProcessing.code.${codes.has(job.code)?job.code:'UNKNOWN'}`)} · {t('hrDelivery.attempts')}: {job.attempts}
    <p>{t('hrProcessing.retries')}: {job.manualRetries}</p>
    {!job.currentSource&&<p>{t('hrProcessing.obsolete')}</p>}
    <button type="button" disabled={busy} onClick={()=>void run('get',job.id)}>{t('hrProcessing.inspect')}</button>
    {canStart&&retryable(job)&&<button type="button" disabled={busy} onClick={()=>void run('retry',job.id)}>{t('hrProcessing.retry')}</button>}
   </li>)}</ul>
   {selected?.result&&selected.currentSource&&<div data-processing-result><h4>{t('hrProcessing.review')}</h4><p>{t('hrProcessing.manual')}</p><dl>{fields.map(field=>{const value=facts(selected.result!.parsed[field]);return value?<div key={field}><dt>{t(`hrProcessing.field.${field}`)}</dt><dd>{value}</dd></div>:null;})}</dl></div>}
  </>}
 </section>;
}
