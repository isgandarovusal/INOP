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
import {saveService,readServiceOptions,type ServiceDetails} from '../../../Services/serviceAuditService';
import HRAuditVersions from '../HRAudit/HRAuditVersions';
import HRFinalEvidence from '../HRAudit/HRFinalEvidence';
import ServicePhoto from './ServicePhoto';
const evidenceLoad=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string}[]}>(`/audit-evidence/by-audit/${id}`,{signal,scopeKey,suppressErrorToast:true});
const parentLoad=async(id:string,signal?:AbortSignal,scopeKey?:string)=>{const[audit,options]=await Promise.all([readJson<{restaurantId:string;date:string;auditorId:string}>(`/audits/${id}`,{signal,scopeKey,suppressErrorToast:true}),readServiceOptions(false,signal,scopeKey)]);return{audit,options:options.data};};
export default function ServiceAuditExecution({execution,reload}:{execution:AuditExecution;reload:()=>void}){
 const{t}=useTranslation();const snapshot=execution.templateSnapshot!;const questions=snapshot.sections.flatMap(s=>s.questions);
 const initial=questions.map(q=>execution.answers.find(a=>a.questionId===q.id)||{questionId:q.id,answer:'',comment:''});
 const[answers,setAnswers]=useState<AuditExecutionAnswer[]>(initial);const[details,setDetails]=useState<ServiceDetails>(execution.serviceDetails||{});const[confirm,setConfirm]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[saved,setSaved]=useState(false);
 const[uploadBusy,setUploadBusy]=useState(false);
 const action=useAuditAction(execution._id,'audit.execution','update');const writable=['draft','in-progress'].includes(execution.status)&&action.allowed;
 const dirty=!saved&&(JSON.stringify(answers)!==JSON.stringify(initial)||JSON.stringify(details)!==JSON.stringify(execution.serviceDetails||{}));
 const blocker=useBlocker(writable&&(dirty||uploadBusy)&&!action.busy);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty||uploadBusy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,uploadBusy]);
 const evidence=useAuditResource(execution.auditId,'audit',evidenceLoad,{refreshOnFocus:false});
 const parent=useAuditResource(execution.auditId,'audit',parentLoad,{refreshOnFocus:false});

 const setAnswer=(id:string,key:'answer'|'comment',value:string)=>{setSaved(false);setAnswers(p=>p.map(a=>a.questionId===id?{...a,[key]:value}:a));};
 const setDetail=(key:keyof ServiceDetails,value:string)=>{setSaved(false);setDetails(p=>({...p,[key]:value}));};
 const persist=(complete:boolean)=>void action.run(async signal=>{
  setError('');setMessage('');
  try{await saveService(execution,answers,details,complete,signal);setSaved(true);setConfirm(false);setMessage(t(complete?'serviceAudit.submittedMessage':'serviceAudit.savedMessage'));reload();}
  catch(e){const status=isAxiosError(e)?e.response?.status:undefined;setError(t(status===409?'serviceAudit.conflict':status===422?(legacyReview?'serviceAudit.legacyReview':'serviceAudit.incomplete'):'serviceAudit.saveError'));throw e;}
 });
 const answered=answers.filter(a=>a.answer).length;
 const legacyReview=snapshot.brandId==='kfc'&&snapshot.serviceSource?.version==='service-source-v1'&&writable;
 return <div className="audit-direction-page audit-hr-page">
  <PageHeader title={`${t('serviceAudit.title')} — ${snapshot.brandName}`} subtitle={t('serviceAudit.sourceOriginal')} actions={<Link className="btn-secondary" to={`/app/audit/audits/${execution.auditId}`}>{t('serviceAudit.workflow')}</Link>}/>
  <p className="audit-hr-notice" role="note">{t('serviceAudit.scale')}</p>
  {legacyReview&&<p className="audit-hr-notice" role="alert">{t('serviceAudit.legacyReview')}</p>}
  {parent.status!=='ready'?<AuditResourceState status={parent.status} retry={parent.reload}/>:<SectionCard><dl><div className="detail-row"><dt>{t('serviceAudit.restaurant')}</dt><dd>{parent.data?.options.find(r=>r.id===parent.data?.audit?.restaurantId)?.name||parent.data?.audit?.restaurantId}</dd></div><div className="detail-row"><dt>{t('serviceAudit.date')}</dt><dd>{parent.data?.audit?.date}</dd></div><div className="detail-row"><dt>{t('auditFoundation.auditor')}</dt><dd>{execution.createdByName||parent.data?.audit?.auditorId}</dd></div></dl></SectionCard>}
  <SectionCard><p>{t('serviceAudit.progress',{answered,total:questions.length})} · {t(`auditFoundation.statusLabels.${execution.status}`,{defaultValue:execution.status})}</p><progress max={questions.length} value={answered} aria-label={t('auditFoundation.checklistProgress')}/><p>{t('serviceAudit.result')}: {execution.overallPercentage==null?t('serviceAudit.notAssessed'):`${execution.overallPercentage.toFixed(1)}%`}</p></SectionCard>
  <form onSubmit={e=>{e.preventDefault();setConfirm(true);}}>
   <FormSection title={t('serviceAudit.visit')} disabled={!writable||action.busy}><div className="audit-filter-grid">{(['restaurantManager','shiftManager'] as const).map(k=><label key={k}>{t(`serviceAudit.${k}`)}<input maxLength={200} value={details[k]||''} onChange={e=>setDetail(k,e.target.value)}/></label>)}</div></FormSection>
   {snapshot.sections.map(section=><FormSection key={section.id} title={section.title} disabled={!writable||action.busy}>
    <div className="service-section-layout"><div>{section.questions.map((q,index)=>{const a=answers.find(a=>a.questionId===q.id);const linked=details.evidenceLinks?.find(l=>l.questionId===q.id)?.evidenceId||'';return <article className="audit-hr-question" key={q.id}>
     <h3 id={`${q.id}-label`}>{index+1}. {q.label}</h3>{q.guidance&&<p className="audit-hr-guidance">{q.guidance}</p>}{q.clarification&&<p role="note">{t('serviceAudit.clarification')}</p>}
     <small>{t('serviceAudit.sourceCell')}: {q.sourceCell}</small>
     <div className="audit-filter-grid"><label>{t('serviceAudit.answer')}<select aria-labelledby={`${q.id}-label`} value={a?.answer||''} onChange={e=>setAnswer(q.id,'answer',e.target.value)}><option value="">{t('serviceAudit.choose')}</option>{['0','0.5','1','na'].map(v=><option key={v} value={v}>{t(`serviceAudit.answers.${v.replace('.','_')}`)}</option>)}</select></label>
     <label>{t('serviceAudit.questionNote')}<textarea maxLength={4000} value={a?.comment||''} onChange={e=>setAnswer(q.id,'comment',e.target.value)}/></label>
     <ServicePhoto auditId={execution.auditId} value={linked} files={evidence.data?.data||[]} disabled={!writable||action.busy||uploadBusy} reload={evidence.reload} onBusyChange={setUploadBusy} onChange={id=>{setSaved(false);setDetails(p=>({...p,evidenceLinks:[...(p.evidenceLinks||[]).filter(l=>l.questionId!==q.id),...(id?[{questionId:q.id,evidenceId:id}]:[])]}));}}/>
     <label>{t('serviceAudit.evidenceLink')}<select value={linked} onChange={e=>{setSaved(false);setDetails(p=>({...p,evidenceLinks:[...(p.evidenceLinks||[]).filter(l=>l.questionId!==q.id),...(e.target.value?[{questionId:q.id,evidenceId:e.target.value}]:[])]}));}}><option value="">{t('serviceAudit.noEvidence')}</option>{evidence.data?.data.map(file=><option key={file.id} value={file.id}>{file.name}</option>)}</select></label></div>
    </article>;})}
    </div><aside className="service-section-notes"><ServicePhoto auditId={execution.auditId} value={details.sectionPhotos?.[section.id]||''} files={evidence.data?.data||[]} disabled={!writable||action.busy||uploadBusy} reload={evidence.reload} onBusyChange={setUploadBusy} onChange={id=>{setSaved(false);setDetails(p=>({...p,sectionPhotos:{...p.sectionPhotos,[section.id]:id}}));}}/><label className="audit-hr-note">{t('serviceAudit.sectionNote')}<textarea maxLength={4000} value={details.sectionNotes?.[section.id]||''} onChange={e=>{setSaved(false);setDetails(p=>({...p,sectionNotes:{...p.sectionNotes,[section.id]:e.target.value}}));}}/></label></aside></div>
   </FormSection>)}
   {snapshot.brandId==='kfc'&&<FormSection title={t('serviceAudit.reference')} disabled={!writable||action.busy}><label>{t('serviceAudit.sourceAverage')}<textarea maxLength={4000} value={details.referenceNotes?.['service-kfc-r79']||''} onChange={e=>{setSaved(false);setDetails(p=>({...p,referenceNotes:{...p.referenceNotes,'service-kfc-r79':e.target.value}}));}}/></label></FormSection>}
   <FormSection title={t('serviceAudit.conclusion')} disabled={!writable||action.busy}>{(['observations','finalOpinion'] as const).map(k=><label className="audit-hr-note" key={k}>{t(`serviceAudit.${k}`)}<textarea maxLength={10000} value={details[k]||''} onChange={e=>setDetail(k,e.target.value)}/></label>)}<HRFinalEvidence auditId={execution.auditId} details={details} onChange={value=>{setSaved(false);setDetails(value);}} files={evidence.data?.data||[]} reload={evidence.reload} onBusyChange={setUploadBusy} disabled={!writable||action.busy||uploadBusy}/></FormSection>
   {writable&&<div className="audit-control-row"><button type="button" className="btn-secondary" disabled={action.busy||uploadBusy} onClick={()=>persist(false)}>{t('serviceAudit.saveDraft')}</button><button type="submit" className="btn-primary" disabled={action.busy||uploadBusy||answered!==questions.length}>{t('serviceAudit.complete')}</button><span role="status">{dirty?t('serviceAudit.unsaved'):message}</span></div>}
   {error&&<p role="alert">{error}</p>}{action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
  </form>
  <AuditEvidencePanel auditId={execution.auditId}/><button className="btn-secondary" type="button" onClick={evidence.reload}>{t('serviceAudit.refreshEvidence')}</button>
  {evidence.status!=='ready'&&<AuditResourceState status={evidence.status} retry={evidence.reload}/>}

  <HRAuditVersions executionId={execution._id} historyPath="service-history"/>
  {confirm&&<HRConfirmDialog title={t('serviceAudit.complete')} message={t('serviceAudit.completeConfirm')} confirmLabel={t('serviceAudit.complete')} loading={action.busy} onCancel={()=>setConfirm(false)} onConfirm={()=>persist(true)}/>}
  {blocker.state==='blocked'&&<HRConfirmDialog title={t('serviceAudit.unsaved')} message={t('serviceAudit.leaveConfirm')} confirmLabel={t('serviceAudit.leave')} onCancel={()=>blocker.reset()} onConfirm={()=>blocker.proceed()}/>}
 </div>;
}
