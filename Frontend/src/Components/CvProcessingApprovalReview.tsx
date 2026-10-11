import {useEffect,useRef,useState} from 'react';
import {isAxiosError} from 'axios';
import {useTranslation} from 'react-i18next';
import {getCvProcessing} from '../Services/cvProcessingService';
import type {CvProcessingJob} from '../Services/cvProcessingService';
import type {Candidate} from '../Types/recruitment';
import CvReviewEvidence from './CvReviewEvidence';

// Loading evidence never changes the editable profile. Applying a draft and
// confirming the existing save are separate, explicit HR actions.
export default function CvProcessingApprovalReview({candidate,jobId,onApply,onAccessDenied,disabled}:{candidate:Candidate;jobId:string;disabled?:boolean;onApply:(job:CvProcessingJob)=>void;onAccessDenied:(status:'unauthenticated'|'forbidden'|'not-found')=>void}) {
 const {t}=useTranslation(),[job,setJob]=useState<CvProcessingJob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function load(){
  active.current?.abort();const controller=new AbortController();active.current=controller;setBusy(true);setError('');setJob(null);
  try{
   const result=await getCvProcessing(candidate.id,jobId,controller.signal);if(controller.signal.aborted)return;
   if(!result.currentSource||result.source.revision!==candidate.revision||result.source.sha256!==candidate.cvOriginal?.sha256||result.parentUpdatedAt!==candidate.updatedAt||result.state!=='succeeded'||!result.result||!validReview(result))throw Error('Changed review');
   setJob(result);
  }catch(failure){if(controller.signal.aborted)return;const status=isAxiosError(failure)?failure.response?.status:undefined,code=isAxiosError(failure)?failure.response?.data?.code:undefined;
   if(status===401||status===403||(status===404&&code==='PROCESSING_PARENT_UNAVAILABLE'))onAccessDenied(status===401?'unauthenticated':status===403?'forbidden':'not-found');
   else setError(status===404?'missing':status===503?'disabled':status===500?'unavailable':'changed');
  }finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return <section data-processing-approval-review><h3>{t('hrApproval.title')}</h3><p>{t('hrApproval.notice')}</p><button type="button" disabled={busy||disabled} onClick={()=>void load()}>{t('hrApproval.load')}</button>{busy&&<p role="status">{t('common.actions.loading')}</p>}{error&&<p role="alert">{t(`hrProcessing.error.${error}`)}</p>}{job?.result&&<><CvReviewEvidence review={job.result.review}/><p>{job.result.parserVersion} · {job.source.sha256.slice(0,12)} · {job.source.revision}</p><button type="button" disabled={disabled} onClick={()=>{onApply(job);setJob(null);}}>{t('hrApproval.apply')}</button></>}</section>;
}
function validReview(job:CvProcessingJob){
 const review=job.result?.review,parsed=job.result?.parsed;
 if(!review||review.version!=='rules-2'||review.provider!=='rule-based'||review.processingStatus!=='extracted'||!parsed)return false;
 if(review.fields!=null&&(typeof review.fields!=="object"||Array.isArray(review.fields)||Object.keys(review.fields).length>30))return false;
 for(const value of [review.warnings,review.correctedFields])if(value!=null&&(!Array.isArray(value)||value.length>50||value.some(v=>typeof v!=="string"||v.length>80)))return false;
 if(Object.values(review.fields??{}).some(v=>!v||typeof v.source!=="string"||v.source.length>128||!Array.isArray(v.evidence)||v.evidence.length>50||v.evidence.some(q=>typeof q!=='string'||q.length>2000)||(v.confidence!==null&&(typeof v.confidence!=='number'||!Number.isFinite(v.confidence)||v.confidence<0||v.confidence>1))))return false;
 for(const key of ['name','role','email','phone','phoneRaw','education'])if(parsed[key]!=null&&(typeof parsed[key]!=='string'||(parsed[key] as string).length>2000))return false;
 for(const key of ['skills','languages','certificates'])if(parsed[key]!=null&&(!Array.isArray(parsed[key])||(parsed[key] as unknown[]).length>100||(parsed[key] as unknown[]).some(v=>typeof v!=='string'||v.length>200)))return false;
 for(const key of ['employmentHistory','educationHistory','certificationHistory'])if(parsed[key]!=null&&(!Array.isArray(parsed[key])||(parsed[key] as unknown[]).length>50||(parsed[key] as unknown[]).some(v=>!validHistory(v))))return false;
 return parsed.experience==null||(typeof parsed.experience==='number'&&Number.isFinite(parsed.experience)&&parsed.experience>=0);
}

function validHistory(value:unknown){
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const row=value as Record<string,unknown>;
 for(const key of ["raw","organization","title"])if(row[key]!=null&&(typeof row[key]!=="string"||(row[key] as string).length>500))return false;
 for(const key of ["start","end"]){const date=row[key] as {year:number;month:number|null}|null;if(date!=null&&(!Number.isInteger(date.year)||date.year<1900||date.year>2100||(date.month!=null&&(!Number.isInteger(date.month)||date.month<1||date.month>12))))return false;}
 return typeof row.ongoing==="boolean";
}
