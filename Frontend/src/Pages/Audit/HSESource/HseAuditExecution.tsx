import {useAuth} from '../../../Context/useAuth';
import {useEffect,useState} from 'react';
import {Link,useBlocker} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {isAxiosError} from 'axios';
import {SectionCard,FormSection} from '../../../Components/HRSection';
import PageHeader from '../../../Components/PageHeader';
import HRConfirmDialog from '../../../Components/HRConfirmDialog';
import AuditResourceState from '../../../Components/AuditResourceState';
import AuditEvidencePanel from '../../../Components/AuditEvidencePanel';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {readJson} from '../../../api/readRequest';
import type {AuditExecution,AuditExecutionAnswer} from '../../../Services/auditExecutionService';
import {saveHse,readOptions,type HseDetails} from '../../../Services/hseAuditService';
import HRAuditVersions from '../HRAudit/HRAuditVersions';
import HRFinalEvidence from '../HRAudit/HRFinalEvidence';
import ServicePhoto from '../ServiceSource/ServicePhoto';
import HseCover from './HseCover';
const evidenceLoad=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string}[]}>(`/audit-evidence/by-audit/${id}`,{signal,scopeKey,suppressErrorToast:true});
const parentLoad=async(id:string,signal?:AbortSignal,scopeKey?:string)=>{const[audit,options]=await Promise.all([readJson<{restaurantId?:string;hseObjectId:string;hseObjectSnapshot:{name:string;brandId?:string};date:string;auditorId:string}>(`/audits/${id}`,{signal,scopeKey,suppressErrorToast:true}),readOptions(id,signal,scopeKey)]);return{audit,options:options.data};};
export default function HseAuditExecution({execution,reload}:{execution:AuditExecution;reload:()=>void}){
 const{user}=useAuth();const{t}=useTranslation();const snapshot=execution.templateSnapshot!;const questions=snapshot.sections.flatMap(s=>s.questions);
 const initial=questions.map(q=>execution.answers.find(a=>a.questionId===q.id)||{questionId:q.id,answer:'',comment:''});
 const[answers,setAnswers]=useState<AuditExecutionAnswer[]>(initial);const[details,setDetails]=useState<HseDetails>(execution.hseDetails||{});const[confirm,setConfirm]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[saved,setSaved]=useState(false);
 const[uploadBusy,setUploadBusy]=useState(false);
 const action=useAuditAction(execution._id,'audit.execution','update');const writable=['draft','in-progress'].includes(execution.status)&&action.allowed;
 const dirty=!saved&&(JSON.stringify(answers)!==JSON.stringify(initial)||JSON.stringify(details)!==JSON.stringify(execution.hseDetails||{}));
 const blocker=useBlocker(writable&&(dirty||uploadBusy)&&!action.busy);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty||uploadBusy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,uploadBusy]);
 const evidence=useAuditResource(execution.auditId,'audit',evidenceLoad,{refreshOnFocus:false});
 const parent=useAuditResource(execution.auditId,'audit',parentLoad,{refreshOnFocus:false});

 const setAnswer=(id:string,key:'answer'|'comment',value:string)=>{setSaved(false);setAnswers(p=>p.map(a=>a.questionId===id?{...a,[key]:value}:a));};
 const setDetail=(key:keyof HseDetails,value:string)=>{setSaved(false);setDetails(p=>({...p,[key]:value}));};
 const persist=(complete:boolean)=>void action.run(async signal=>{
  setError('');setMessage('');
  try{await saveHse(execution,answers,details,complete,signal);setSaved(true);setConfirm(false);setMessage(t(complete?'hseAudit.submittedMessage':'hseAudit.savedMessage'));reload();}
  catch(e){const status=isAxiosError(e)?e.response?.status:undefined;setError(t(status===409?'hseAudit.conflict':status===422?'hseAudit.incomplete':'hseAudit.saveError'));throw e;}
 });
 const answered=answers.filter(a=>a.answer).length;
 return <div className="audit-direction-page audit-hr-page">
  <PageHeader title={`${t('hseAudit.title')} — ${t(`hseAudit.kinds.${snapshot.hseSource!.objectType}`)}`} subtitle={t('hseAudit.sourceOriginal')} actions={<Link className="btn-secondary" to={`/app/audit/audits/${execution.auditId}`}>{t('hseAudit.workflow')}</Link>}/>
  <p className="audit-hr-notice" role="note">{t('hseAudit.scale')}</p>
  {parent.status!=='ready'?<AuditResourceState status={parent.status} retry={parent.reload}/>:<SectionCard><dl>{parent.data?.audit.hseObjectSnapshot?.brandId&&<div className="detail-row"><dt>{t('auditFoundation.brand')}</dt><dd>{parent.data.audit.hseObjectSnapshot.brandId==='kfc'?'KFC':parent.data.audit.hseObjectSnapshot.brandId==='pizza-hut'?'Pizza Hut':'Simit Sarayı'}</dd></div>}<div className="detail-row"><dt>{t('hseAudit.restaurant')}</dt><dd>{parent.data?.audit.hseObjectSnapshot?.name||parent.data?.audit.hseObjectId}</dd></div><div className="detail-row"><dt>{t('hseAudit.date')}</dt><dd>{parent.data?.audit?.date}</dd></div><div className="detail-row"><dt>{t('auditFoundation.auditor')}</dt><dd>{execution.hseSubmission?.name||(writable?user?.name:execution.createdByName)||parent.data?.audit?.auditorId}</dd></div></dl></SectionCard>}
  <SectionCard><p>{t('hseAudit.progress',{answered,total:questions.length})} · {t(`auditFoundation.statusLabels.${execution.status}`,{defaultValue:execution.status})}</p><progress max={questions.length} value={answered} aria-label={t('auditFoundation.checklistProgress')}/><p>{t('hseAudit.result')}: {execution.overallPercentage==null?t('hseAudit.notAssessed'):`${execution.overallPercentage.toFixed(2)}%`}</p></SectionCard>
  <HseCover assessment={execution.hseAssessment}/>
  <form onSubmit={e=>{e.preventDefault();setConfirm(true);}}>
   <FormSection title={t('hseAudit.visit')} disabled={!writable||action.busy}><div className="audit-filter-grid">{(['restaurantManager','shiftManager'] as const).map(k=><label key={k}>{t(`hseAudit.${k}`)}<input maxLength={200} value={details[k]||''} onChange={e=>setDetail(k,e.target.value)}/></label>)}</div></FormSection>
   <FormSection title={t('hseAudit.nextAuditDate')} disabled={!writable||action.busy}><label>{t('hseAudit.nextAuditDate')}<input type="date" value={details.nextAuditDate||''} onChange={e=>setDetail('nextAuditDate',e.target.value)}/></label></FormSection>
   {snapshot.sections.map(section=><FormSection key={section.id} title={section.title} disabled={!writable||action.busy}>
    <div className="service-section-layout"><div>{section.questions.map((q,index)=>{const a=answers.find(a=>a.questionId===q.id);const linked=details.evidenceLinks?.find(l=>l.questionId===q.id)?.evidenceId||'';return <article className="audit-hr-question" key={q.id}>
     <h3 id={`${q.id}-label`}>{index+1}. {q.label}</h3>{q.guidance&&<p className="audit-hr-guidance">{q.guidance}</p>}{q.clarification&&<p role="note">{t('hseAudit.clarification')}</p>}
     <small>{q.worksheet} · {t('hseAudit.sourceCell')}: {q.sourceCell} · {t('hseAudit.sourceRisk')}: {q.sourceRisk?t(`hseAudit.answers.${q.sourceRisk}`):t('hseAudit.unspecifiedRisk')}{q.weight!=null?` (${q.weight})`:''} · {q.sourceCode} · {Object.values(q.sourceMetadata||{}).join(' · ')}</small>
     <div className="audit-filter-grid"><label>{t('hseAudit.answer')}<select aria-labelledby={`${q.id}-label`} value={a?.answer||''} onChange={e=>setAnswer(q.id,'answer',e.target.value)}><option value="">{t('hseAudit.choose')}</option>{['compliant','noncompliant','na'].map(v=><option key={v} value={v}>{t(`hseAudit.answers.${v.replace('.','_')}`)}</option>)}</select></label>
     <label>{t('hseAudit.questionNote')}<textarea maxLength={4000} value={a?.comment||''} onChange={e=>setAnswer(q.id,'comment',e.target.value)}/></label>
     {a?.answer==='na'&&<label>{t('hseAudit.naReason')}<textarea maxLength={4000} value={details.naReasons?.[q.id]||''} onChange={e=>{setSaved(false);setDetails(p=>({...p,naReasons:{...p.naReasons,[q.id]:e.target.value}}));}}/></label>}
     <div className="audit-filter-grid">{(['rootCause','sample'] as const).map(k=><label key={k}>{t(`hseAudit.${k}`)}<textarea maxLength={k==='sample'?200:4000} value={details.criterionMetadata?.[q.id]?.[k]||''} onChange={e=>{setSaved(false);setDetails(p=>({...p,criterionMetadata:{...p.criterionMetadata,[q.id]:{rootCause:'',sample:'',repeated:'',...p.criterionMetadata?.[q.id],[k]:e.target.value}}}));}}/></label>)}<label>{t('hseAudit.repeated')}<select value={details.criterionMetadata?.[q.id]?.repeated||''} onChange={e=>{const repeated=e.target.value as ''|'yes'|'no';setSaved(false);setDetails(p=>({...p,criterionMetadata:{...p.criterionMetadata,[q.id]:{rootCause:'',sample:'',...p.criterionMetadata?.[q.id],repeated}}}));}}><option value="">—</option><option value="yes">{t('hseAudit.repeatedYes')}</option><option value="no">{t('hseAudit.repeatedNo')}</option></select></label></div>
     <details><summary>{t('hseAudit.extraObservations')}</summary>{details.criterionObservations?.filter(o=>o.standardId===q.id).map(o=><div key={o.id}><label>{t('hseAudit.questionNote')}<textarea maxLength={4000} value={o.description} onChange={e=>{setSaved(false);setDetails(p=>({...p,criterionObservations:p.criterionObservations?.map(row=>row.id===o.id?{...row,description:e.target.value}:row)}));}}/></label><label>{t('hseAudit.evidenceLink')}<select multiple value={o.evidenceIds} onChange={e=>{const ids=Array.from(e.target.selectedOptions,option=>option.value);setSaved(false);setDetails(p=>({...p,criterionObservations:p.criterionObservations?.map(row=>row.id===o.id?{...row,evidenceIds:ids}:row)}));}}>{evidence.data?.data.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button type="button" className="btn-secondary" onClick={()=>{setSaved(false);setDetails(p=>({...p,criterionObservations:p.criterionObservations?.filter(row=>row.id!==o.id)}));}}>{t('hseAudit.removeObservation')}</button></div>)}<button type="button" className="btn-secondary" onClick={()=>{setSaved(false);setDetails(p=>({...p,criterionObservations:[...(p.criterionObservations||[]),{id:crypto.randomUUID(),standardId:q.id,description:'',evidenceIds:[]}]}));}}>{t('hseAudit.addObservation')}</button></details>
     <ServicePhoto auditId={execution.auditId} value={linked} files={evidence.data?.data||[]} disabled={!writable||action.busy||uploadBusy} reload={evidence.reload} onBusyChange={setUploadBusy} onChange={id=>{setSaved(false);setDetails(p=>({...p,evidenceLinks:[...(p.evidenceLinks||[]).filter(l=>l.questionId!==q.id),...(id?[{questionId:q.id,evidenceId:id}]:[])]}));}}/>
     <label>{t('hseAudit.evidenceLink')}<select value={linked} onChange={e=>{setSaved(false);setDetails(p=>({...p,evidenceLinks:[...(p.evidenceLinks||[]).filter(l=>l.questionId!==q.id),...(e.target.value?[{questionId:q.id,evidenceId:e.target.value}]:[])]}));}}><option value="">{t('hseAudit.noEvidence')}</option>{evidence.data?.data.map(file=><option key={file.id} value={file.id}>{file.name}</option>)}</select></label></div>
    </article>;})}
    </div><aside className="service-section-notes"><ServicePhoto auditId={execution.auditId} value={details.sectionPhotos?.[section.id]||''} files={evidence.data?.data||[]} disabled={!writable||action.busy||uploadBusy} reload={evidence.reload} onBusyChange={setUploadBusy} onChange={id=>{setSaved(false);setDetails(p=>({...p,sectionPhotos:{...p.sectionPhotos,[section.id]:id}}));}}/><label className="audit-hr-note">{t('hseAudit.sectionNote')}<textarea maxLength={4000} value={details.sectionNotes?.[section.id]||''} onChange={e=>{setSaved(false);setDetails(p=>({...p,sectionNotes:{...p.sectionNotes,[section.id]:e.target.value}}));}}/></label></aside></div>
   </FormSection>)}
   <FormSection title={t('hseAudit.conclusion')} disabled={!writable||action.busy}>{(['observations','finalOpinion'] as const).map(k=><label className="audit-hr-note" key={k}>{t(`hseAudit.${k}`)}<textarea maxLength={10000} value={details[k]||''} onChange={e=>setDetail(k,e.target.value)}/></label>)}<HRFinalEvidence auditId={execution.auditId} details={details} onChange={value=>{setSaved(false);setDetails(value);}} files={evidence.data?.data||[]} reload={evidence.reload} onBusyChange={setUploadBusy} disabled={!writable||action.busy||uploadBusy}/></FormSection>
   {writable&&<div className="audit-control-row"><button type="button" className="btn-secondary" disabled={action.busy||uploadBusy} onClick={()=>persist(false)}>{t('hseAudit.saveDraft')}</button><button type="submit" className="btn-primary" disabled={action.busy||uploadBusy||answered!==questions.length}>{t('hseAudit.complete')}</button><span role="status">{dirty?t('hseAudit.unsaved'):message}</span></div>}
   {error&&<p role="alert">{error}</p>}{action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
  </form>
  <AuditEvidencePanel auditId={execution.auditId}/><button className="btn-secondary" type="button" onClick={evidence.reload}>{t('hseAudit.refreshEvidence')}</button>
  {evidence.status!=='ready'&&<AuditResourceState status={evidence.status} retry={evidence.reload}/>}

  <HRAuditVersions executionId={execution._id} historyPath="hse-history"/>
  {confirm&&<HRConfirmDialog title={t('hseAudit.complete')} message={t('hseAudit.completeConfirm')} confirmLabel={t('hseAudit.complete')} loading={action.busy} onCancel={()=>setConfirm(false)} onConfirm={()=>persist(true)}/>}
  {blocker.state==='blocked'&&<HRConfirmDialog title={t('hseAudit.unsaved')} message={t('hseAudit.leaveConfirm')} confirmLabel={t('hseAudit.leave')} onCancel={()=>blocker.reset()} onConfirm={()=>blocker.proceed()}/>}
 </div>;
}
