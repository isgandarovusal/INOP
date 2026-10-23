import {useEffect,useRef,useState} from 'react';
import {isAxiosError} from 'axios';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useHRActionContext} from '../Hooks/useHRActionContext';
import {useHRPage} from '../Hooks/useHRPage';
import {auditErrorStatus} from '../Hooks/useAuditResource';
import type {AuditLoadStatus} from '../Hooks/useAuditResource';
import {getJobPage,getBrandPage} from '../Services/hrPageService';
import {intakeSourceTypes,intakeReviewUrl,type CvIntakeContext} from '../Services/cvIntakeService';
import {prepareCvImport,getCvImport,uploadCvImport,getCvImportHistory,readCvImportRouting,type CvImportReceipt,type CvImportManifest,type CvImportHistory} from '../Services/cvImportService';
import AuditFilePicker from './AuditFilePicker';
import HRResourceState from './HRResourceState';
// Changing authority remounts the draft; changing locale must not discard files.
export default function CvImportPanel({writable,onAccepted}:{writable:boolean;onAccepted:()=>void}){const context=useHRActionContext();return <Panel key={context.key} writable={writable} onAccepted={onAccepted}/>;}
function Panel({writable,onAccepted}:{writable:boolean;onAccepted:()=>void}){
 const {t}=useTranslation(),authority=useHRActionContext(),active=useRef<AbortController|null>(null),lock=useRef(false);
 const routingInput=useRef<HTMLInputElement>(null),[routing,setRouting]=useState<Record<string,Omit<CvIntakeContext,'declaredByHR'>>>({});
 const [files,setFiles]=useState<File[]>([]),[sourceType,setSource]=useState<CvIntakeContext['sourceType']>('manual'),[brandId,setBrand]=useState(''),[jobId,setJob]=useState('');
 const [manifest,setManifest]=useState<CvImportManifest>(),[receipt,setReceipt]=useState<CvImportReceipt>(),[busy,setBusy]=useState(false),[status,setStatus]=useState<AuditLoadStatus>('ready'),[validation,setValidation]=useState<''|'files'|'routing'>(''),[history,setHistory]=useState<CvImportHistory>();
 const brands=useHRPage('recruitment',{},getBrandPage,{enabled:writable}),jobs=useHRPage('recruitment',{brandId,status:'Open'},getJobPage,{enabled:writable});
 useEffect(()=>()=>active.current?.abort(),[]);
 const action=async(run:(signal:AbortSignal)=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setStatus('ready');const c=new AbortController();active.current=c;const key=authority.key;try{await run(c.signal);}catch(e){if(!c.signal.aborted&&authority.current.current===key){const denied=auditErrorStatus(e);setStatus(denied);if(['forbidden','unauthenticated','not-found'].includes(denied)){setFiles([]);setReceipt(undefined);setManifest(undefined);setRouting({});setHistory(undefined);}}}finally{lock.current=false;if(!c.signal.aborted&&authority.current.current===key)setBusy(false);}};
 const preview=()=>void action(async signal=>{
  if(!files.length||files.length>10||files.reduce((n,f)=>n+f.size,0)>25*1024*1024||new Set(files.map(f=>f.name)).size!==files.length||Object.keys(routing).some(name=>!files.some(f=>f.name===name))){setValidation('files');return;}
  const batchId=crypto.randomUUID(),rows:CvImportManifest['rows']=[];
  for(const f of files){const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('');rows.push({id:crypto.randomUUID(),commandId:crypto.randomUUID(),originalName:f.name,mimeType:f.type,size:f.size,sha256,context:routing[f.name]??{sourceType,...(brandId?{brandId}:{}),...(jobId?{jobId}:{})}});}
  if(signal.aborted)return;const m:CvImportManifest={version:'hr-import-v1',batchId,rows};setManifest(m);setReceipt(undefined);setValidation('');
 });
 const admit=()=>void action(async signal=>{
  if(!manifest&&!receipt)return;let r=receipt??await prepareCvImport(manifest!,signal);if(signal.aborted)return;setReceipt(r);
  // Bounded sequential admission, without polling or automatic failed-file retry.
  for(const row of r.rows){if(row.state==='accepted'||row.state==='failed')continue;const file=files.find(f=>f.name===row.originalName);if(!file)continue;let stop=false;try{r=await uploadCvImport(r.batchId,row.id,file,signal);}catch(e){if(signal.aborted)return;if(['forbidden','unauthenticated','not-found'].includes(auditErrorStatus(e)))throw e;setStatus(auditErrorStatus(e));r=await getCvImport(r.batchId,signal);stop=isAxiosError(e)&&e.response?.status===429;}if(signal.aborted)return;setReceipt(r);if(stop)break;}
  onAccepted();
 });
 if(['forbidden','unauthenticated','not-found'].includes(status))return <section data-cv-import-denied><HRResourceState status={status}/></section>;
 return <section className='candidate-form-section' data-cv-import aria-busy={busy}>
  <h2>{t('hrImport.title')}</h2><p>{t('hrUniversal.declared')}</p><p>{t('hrImport.limits')}</p>
  {writable&&<><div className='hr-list-controls'><label>{t('hrIntake.source')}<select disabled={busy||!!receipt||!!manifest} value={sourceType} onChange={e=>setSource(e.target.value as CvIntakeContext['sourceType'])}>{intakeSourceTypes.map(s=><option key={s} value={s}>{t('hrUniversal.sources.'+s)}</option>)}</select></label>
   <label>{t('hrUniversal.brand')}<select disabled={busy||!!receipt||!!manifest||brands.status!=='ready'} value={brandId} onChange={e=>{setBrand(e.target.value);setJob('');}}><option value=''>{t('hrImport.unassigned')}</option>{brands.data?.items.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
   <label>{t('hrImport.vacancy')}<select disabled={busy||!!receipt||!!manifest||jobs.status!=='ready'} value={jobId} onChange={e=>setJob(e.target.value)}><option value=''>{t('hrImport.unassigned')}</option>{jobs.data?.items.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label></div>
   {brands.status!=='ready'&&<HRResourceState status={brands.status} retry={brands.reload}/>}{jobs.status!=='ready'&&<HRResourceState status={jobs.status} retry={jobs.reload}/>}
   <AuditFilePicker translate={t} multiple label={t('hrImport.files')} accept='.pdf,.docx' disabled={busy} onChange={e=>{setFiles(Array.from(e.currentTarget.files||[]));if(!receipt)setManifest(undefined);setValidation('');}}/>
   {!receipt&&<><input ref={routingInput} hidden type='file' accept='.json,application/json' disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void action(async s=>{try{const r=await readCvImportRouting(file);if(s.aborted)return;setRouting(r);setManifest(undefined);setValidation('');}catch{setValidation('routing');}});e.currentTarget.value='';}}/><button className='btn-secondary' type='button' disabled={busy} onClick={()=>routingInput.current?.click()}>{t('hrImport.routing')}</button><p>{t('hrImport.routingHint')}</p></>}
   {!receipt&&<button className='btn-secondary' type='button' disabled={busy||!files.length} onClick={preview}>{t('hrImport.preview')}</button>}
   {manifest&&!receipt&&<ul data-import-preview>{manifest.rows.map(row=><li key={row.id}>{row.originalName} · {row.size} B · {t('hrUniversal.sources.'+(row.context?.sourceType??'manual'))}{row.context?.brandId&&' · '+row.context.brandId}{manifest.rows.filter(x=>x.sha256===row.sha256).length>1&&<span> · {t('hrImport.possibleDuplicate')}</span>}</li>)}</ul>}
   <div className='form-actions'>{(manifest||receipt)&&<button className='btn-primary' type='button' disabled={busy||!files.length} onClick={admit}>{t(receipt?'hrImport.retry':'hrImport.admit')}</button>}
   {(manifest||receipt)&&<button className='btn-secondary' type='button' disabled={busy} onClick={()=>{setManifest(undefined);setReceipt(undefined);setFiles([]);setRouting({});}}>{t('hrImport.new')}</button>}</div>
  </>}
  {validation&&<p role='alert'>{t(validation==='routing'?'hrImport.routingInvalid':'hrImport.invalid')}</p>}{status!=='ready'&&<HRResourceState status={status}/>}
  {receipt&&<div data-import-receipt><h3>{t('hrImport.result')}</h3><p>{t('hrImport.reviewNotice')}</p><div className='hr-profile-facts'>{(['accepted','pending','uncertain','failed','processing','processingFailed','reviewRequired','completed'] as const).map(k=><p key={k}><strong>{t('hrImport.counts.'+k)}</strong> <span data-import-count={k}>{receipt.summary[k]}</span></p>)}</div><ul>{receipt.rows.map(row=><li key={row.id} data-import-row={row.id}>{row.originalName} · {t('hrImport.admission.'+row.state)}{row.source&&<> · {t('hrIntake.states.'+row.source.state)} · {t(row.source.evidenceMode==='test'?'hrIntake.test':'hrIntake.notice')} <span className='form-actions'><Link className='btn-secondary' to={'/app/recruitment/cv-intake/'+row.source.id}>{t('hrIntake.view')}</Link>{row.source.state==='ready'&&writable&&<Link className='btn-secondary' to={intakeReviewUrl({id:row.source.id,intakeContext:row.context})}>{t('hrIntake.resume')}</Link>}</span></>}</li>)}</ul><button className='btn-secondary' type='button' disabled={busy} onClick={()=>void action(async s=>{const r=await getCvImport(receipt.batchId,s);if(s.aborted)return;setReceipt(r);onAccepted();})}>{t('hrIntake.check')}</button></div>}
  <button className='btn-secondary' type='button' disabled={busy} onClick={()=>void action(async s=>setHistory(await getCvImportHistory(s)))}>{t('hrImport.history')}</button><ul>{history?.items.map(h=><li key={h.batchId}><button className='btn-secondary' type='button' disabled={busy} onClick={()=>void action(async s=>{const r=await getCvImport(h.batchId,s);if(s.aborted)return;setReceipt(r);setFiles([]);setManifest(undefined);})}>{new Date(h.createdAt).toLocaleString()}</button></li>)}</ul>{history&&<div className='form-actions'><button className='btn-secondary' type='button' disabled={busy||history.page<=1} onClick={()=>void action(async s=>setHistory(await getCvImportHistory(s,history.page-1)))}>{t('common.actions.previous')}</button><span>{history.page}</span><button className='btn-secondary' type='button' disabled={busy||!history.hasMore||history.page>=2000} onClick={()=>void action(async s=>setHistory(await getCvImportHistory(s,history.page+1)))}>{t('common.actions.next')}</button></div>}
 </section>;
}
