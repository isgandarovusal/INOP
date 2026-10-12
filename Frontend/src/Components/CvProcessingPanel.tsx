import {Link} from 'react-router-dom';
import AIAvailability from './AIAvailability';
import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {isAxiosError} from 'axios';
import {useAuth} from '../Context/useAuth';
import {hasPermission} from '../Utils/permissions';
import {useHRActionContext} from '../Hooks/useHRActionContext';
import {getCvProcessing,listCvProcessing,startCvProcessing,retryCvProcessing} from '../Services/cvProcessingService';
import type {CvProcessingJob} from '../Services/cvProcessingService';
import type {Candidate} from '../Types/recruitment';
const codes=new Set(['AI_NOT_CONFIGURED','AI_REVIEW_CONTEXT_REQUIRED','AI_REVIEW_REQUIRED','OCR_REVIEW_REQUIRED','OCR_NOT_CONFIGURED','OCR_RUNTIME_REQUIRED','OCR_LANGUAGE_REQUIRED','OCR_PDF_REQUIRED','OCR_NO_TEXT','OCR_INPUT_LIMIT','OCR_INVALID_DOCUMENT','QUEUED','PROCESSING','REVIEW_REQUIRED','OCR_REQUIRED','AUTH_REVOKED','SOURCE_CHANGED','SOURCE_MISSING','RESULT_LIMIT','INPUT_LIMIT','STORAGE_NOT_CONFIGURED','PROCESSING_TIMEOUT','PROCESSING_FAILED','ATTEMPTS_EXHAUSTED']);
const fields=['name','email','phone','phoneRaw','role','education','skills','experience','languages','certificates'];
function facts(value:unknown):string { if(value==null||value==='')return '';if(typeof value==='string'||typeof value==='number')return String(value).slice(0,500);if(Array.isArray(value))return value.filter(v=>typeof v==='string').slice(0,20).join(', ').slice(0,1000);return ''; }
export default function CvProcessingPanel({candidate,onAccessDenied}:{candidate:Candidate;onAccessDenied:()=>void}) {
 const {t}=useTranslation(),{user}=useAuth(),context=useHRActionContext(candidate.id);
 const [kind,setKind]=useState<'parse'|'ocr'|'ai-review'>('parse');
 const [open,setOpen]=useState(false),[jobs,setJobs]=useState<CvProcessingJob[]>([]),[selected,setSelected]=useState<CvProcessingJob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef<{sequence:number;controller:AbortController|null}>({sequence:0,controller:null});
 useEffect(()=>()=>{active.current.controller?.abort();active.current.sequence++;},[]);
 const canStart=hasPermission(user,'candidate','update')&&typeof candidate.revision==='number'&&Number.isInteger(candidate.revision)&&/^[a-f0-9]{64}$/.test(candidate.cvOriginal?.sha256||'');
 async function run(action:'list'|'start'|'get'|'retry',jobId?:string,requestedKind:'parse'|'ocr'|'ai-review'=kind) {
  const expectedHash=candidate.cvOriginal?.sha256,expectedRevision=candidate.revision;
  if(action==='start'&&(!canStart||typeof expectedHash!=='string'||typeof expectedRevision!=='number'))return;
  const retryJob=action==='retry'?jobs.find(job=>job.id===jobId):undefined;
  if(action==='retry'&&(!canStart||!retryJob||!retryable(retryJob)))return;
  const key=context.key,sequence=++active.current.sequence,controller=new AbortController();active.current.controller?.abort();active.current.controller=controller;setBusy(true);setError('');
  try {
   const result=action==='list'?await listCvProcessing(candidate.id,controller.signal,requestedKind):action==='start'?await startCvProcessing(candidate.id,{expectedHash:expectedHash!,expectedRevision:expectedRevision!},controller.signal,requestedKind):action==='retry'?await retryCvProcessing(candidate.id,retryJob!,controller.signal):await getCvProcessing(candidate.id,jobId!,controller.signal);
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
 function retryable(job:CvProcessingJob){return job.currentSource&&job.state==='blocked'&&['SOURCE_MISSING','STORAGE_NOT_CONFIGURED',...(job.kind==='ocr'?['OCR_NOT_CONFIGURED','OCR_RUNTIME_REQUIRED','OCR_LANGUAGE_REQUIRED']:job.kind==='ai-review'?['AI_NOT_CONFIGURED']:[])].includes(job.code)&&job.attempts>=1&&job.attempts<3&&job.manualRetries<2&&job.source.sha256===candidate.cvOriginal?.sha256&&job.source.revision===candidate.revision;}
 if(!hasPermission(user,'candidate','read'))return null;
 return <section data-cv-processing><h3>{t('hrProcessing.title')}</h3><p>{t(kind==='ocr'?'hrProcessing.ocrNotice':kind==='ai-review'?'hrProcessing.aiNotice':'hrProcessing.notice')}</p>
  {open && kind === 'ai-review' && <AIAvailability cv />}
  {!open?<button type="button" onClick={()=>{setOpen(true);void run('list');}}>{t('hrProcessing.show')}</button>:<>
   <label>{t('hrProcessing.profile')}<select data-processing-kind value={kind} disabled={busy} onChange={e=>{const value=e.target.value==='ocr'?'ocr':e.target.value==='ai-review'?'ai-review':'parse';setKind(value);setSelected(null);setJobs([]);void run('list',undefined,value);}}><option value="parse">{t('hrProcessing.parseProfile')}</option><option value="ocr">{t('hrProcessing.ocrProfile')}</option><option value="ai-review">{t('hrProcessing.aiProfile')}</option></select></label>
   <button type="button" disabled={busy} onClick={()=>void run('list')}>{t('hrProcessing.refresh')}</button>
   {canStart?<button type="button" className={kind==='ai-review'?'btn-ai':'btn-secondary'} data-ai-action={kind==='ai-review'?'cv-professional-review':undefined} disabled={busy} onClick={()=>void run('start')}>{t(kind==='ocr'?'hrProcessing.startOcr':kind==='ai-review'?'hrProcessing.startAi':'hrProcessing.start')}</button>:<p>{t(hasPermission(user,'candidate','update')?'hrProcessing.identityRequired':'hrProcessing.readOnly')}</p>}
   {busy&&<p role="status" aria-busy="true">{t('common.actions.loading')}</p>}
   {error&&<p role="alert">{t(`hrProcessing.error.${error}`)}</p>}
   {!busy&&!error&&!jobs.length&&<p>{t('hrProcessing.empty')}</p>}
   <ul>{jobs.map(job=><li key={job.id}><strong>{t(`hrProcessing.state.${job.state}`)}</strong> — {t(job.kind==='ocr'&&job.code==='PROCESSING'?'hrProcessing.ocrRunning':job.kind==='ai-review'&&job.code==='PROCESSING'?'hrProcessing.aiRunning':`hrProcessing.code.${codes.has(job.code)?job.code:'UNKNOWN'}`)} · {t('hrDelivery.attempts')}: {job.attempts}
    <p>{t('hrProcessing.retries')}: {job.manualRetries}</p>
    {!job.currentSource&&<p>{t('hrProcessing.obsolete')}</p>}
    <button type="button" disabled={busy} onClick={()=>void run('get',job.id)}>{t('hrProcessing.inspect')}</button>
    {canStart&&retryable(job)&&<button type="button" disabled={busy} onClick={()=>void run('retry',job.id)}>{t(job.kind==='ocr'?'hrProcessing.retryOcr':job.kind==='ai-review'?'hrProcessing.retryAi':'hrProcessing.retry')}</button>}
   </li>)}</ul>
   {selected?.result&&selected.currentSource&&<div data-processing-result><h4>{t('hrProcessing.review')}</h4>{selected.result.review.provenance&&<p>{t(selected.result.review.provenance.mode==='mock_test_only'?'hrAi.mock':'hrAi.proposal')}</p>}<p>{t(kind==='ocr'?'hrProcessing.ocrManual':kind==='ai-review'?'hrProcessing.aiManual':'hrProcessing.manual')}</p><dl>{fields.map(field=>{const value=facts(selected.result!.parsed[field]);return value?<div key={field}><dt>{t(`hrProcessing.field.${field}`)}</dt><dd>{value}</dd></div>:null;})}</dl>{canStart&&<Link to={`/app/recruitment/candidates/${candidate.id}/edit?processingJobId=${selected.id}`}>{t("hrApproval.open")}</Link>}</div>}
  </>}
 </section>;
}
