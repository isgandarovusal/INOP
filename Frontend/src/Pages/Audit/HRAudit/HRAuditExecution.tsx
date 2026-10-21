import ServicePhoto from '../ServiceSource/ServicePhoto';
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
import {saveHR,readHROptions,type HRDetails} from '../../../Services/hrAuditService';
import HRAuditVersions from './HRAuditVersions';
import HRFinalEvidence from './HRFinalEvidence';
import {hrText,hrOptionalRole,hrNeedsClarification} from './hrAuditPresentation';
const evidenceLoad=(id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:{id:string;name:string}[]}>(`/audit-evidence/by-audit/${id}`,{signal,scopeKey,suppressErrorToast:true});
const parentLoad=async(id:string,signal?:AbortSignal,scopeKey?:string)=>{const[audit,options]=await Promise.all([readJson<{restaurantId:string;date:string;auditorId:string}>(`/audits/${id}`,{signal,scopeKey,suppressErrorToast:true}),readHROptions(false,signal,scopeKey)]);return{audit,options:options.data};};
export default function HRAuditExecution({execution,reload}:{execution:AuditExecution;reload:()=>void}){
 const{t,i18n}=useTranslation();const snapshot=execution.templateSnapshot!;const questions=snapshot.sections.flatMap(s=>s.questions);
 const initial=questions.map(q=>execution.answers.find(a=>a.questionId===q.id)||{questionId:q.id,answer:'',comment:''});
 const[answers,setAnswers]=useState<AuditExecutionAnswer[]>(initial);const[details,setDetails]=useState<HRDetails>(execution.hrDetails||{});const[confirm,setConfirm]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[saved,setSaved]=useState(false);
 const[uploadBusy,setUploadBusy]=useState(false);
 const action=useAuditAction(execution._id,'audit.execution','update');const writable=['draft','in-progress'].includes(execution.status)&&action.allowed;
 const dirty=!saved&&(JSON.stringify(answers)!==JSON.stringify(initial)||JSON.stringify(details)!==JSON.stringify(execution.hrDetails||{}));
 const blocker=useBlocker(writable&&(dirty||uploadBusy)&&!action.busy);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty||uploadBusy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,uploadBusy]);
 const evidence=useAuditResource(execution.auditId,'audit',evidenceLoad,{refreshOnFocus:false});
 const parent=useAuditResource(execution.auditId,'audit',parentLoad,{refreshOnFocus:false});

 const setAnswer=(id:string,key:'answer'|'comment',value:string)=>{setSaved(false);setAnswers(p=>p.map(a=>a.questionId===id?{...a,[key]:value}:a));};
 const setDetail=(key:keyof HRDetails,value:string)=>{setSaved(false);setDetails(p=>({...p,[key]:value}));};
 const persist=(complete:boolean)=>void action.run(async signal=>{
  setError('');setMessage('');
  try{await saveHR(execution,answers,details,complete,signal);setSaved(true);setConfirm(false);setMessage(t(complete?'hrAudit.submittedMessage':'hrAudit.savedMessage'));reload();}
  catch(e){const status=isAxiosError(e)?e.response?.status:undefined;setError(t(status===409?'hrAudit.conflict':status===422?'hrAudit.incomplete':'hrAudit.saveError'));throw e;}
 });
 const answered=answers.filter(a=>a.answer).length;
 return <div className="audit-direction-page audit-hr-page">
  <PageHeader title={`${t('hrAudit.title')} — ${snapshot.brandName}`} subtitle={t('hrAudit.sourceOriginal')} actions={<Link className="btn-secondary" to={`/app/audit/audits/${execution.auditId}`}>{t('hrAudit.workflow')}</Link>}/>
  <p className="audit-hr-notice" role="note">{t(snapshot.hrSource?.scoringStatus==='blocked-kfc-denominator'?'hrAudit.kfcBlocked':'hrAudit.scale')}</p>
  {parent.status!=='ready'?<AuditResourceState status={parent.status} retry={parent.reload}/>:<SectionCard><dl><div className="detail-row"><dt>{t('hrAudit.restaurant')}</dt><dd>{parent.data?.options.find(r=>r.id===parent.data?.audit?.restaurantId)?.name||parent.data?.audit?.restaurantId}</dd></div><div className="detail-row"><dt>{t('hrAudit.date')}</dt><dd>{parent.data?.audit?.date}</dd></div><div className="detail-row"><dt>{t('auditFoundation.auditor')}</dt><dd>{execution.createdByName||parent.data?.audit?.auditorId}</dd></div></dl></SectionCard>}
  <SectionCard><p>{t('hrAudit.progress',{answered,total:questions.length})} · {t(`auditFoundation.statusLabels.${execution.status}`,{defaultValue:execution.status})}</p><progress max={questions.length} value={answered} aria-label={t('auditFoundation.checklistProgress')}/><p>{t('hrAudit.result')}: {execution.overallPercentage==null?t('hrAudit.notAssessed'):`${execution.overallPercentage.toFixed(1)}%`}</p></SectionCard>
  <form onSubmit={e=>{e.preventDefault();setConfirm(true);}}>
   <FormSection title={t('hrAudit.visit')} disabled={!writable||action.busy||uploadBusy}><div className="audit-filter-grid">{(['restaurantManager','shiftManager'] as const).map(k=><label key={k}>{t(`hrAudit.${k}`)}<input maxLength={200} value={details[k]||''} onChange={e=>setDetail(k,e.target.value)}/></label>)}</div></FormSection>
   {snapshot.sections.map(section=><FormSection key={section.id} title={hrText(section.id,section.title,i18n.language)} disabled={!writable||action.busy||uploadBusy}>
    {section.questions.map((q,index)=>{const a=answers.find(a=>a.questionId===q.id);const linked=details.evidenceLinks?.find(l=>l.questionId===q.id)?.evidenceId||'';return <article className="audit-hr-question" key={q.id}>
     <h3 id={`${q.id}-label`}>{index+1}. {hrText(q.id,q.label,i18n.language)}</h3>{q.guidance&&<p className="audit-hr-guidance">{hrText(q.id,q.guidance,i18n.language,true)}</p>}{hrNeedsClarification(q.id)&&<p role="note">{t('hrAudit.clarification')}</p>}
     {hrOptionalRole(q.id)&&<><p>{t('hrAudit.roleRule')}</p><label>{t('hrAudit.roleAvailability')}<select className="audit-hr-role" value={details.roleAvailability?.[q.id]===undefined?'':String(details.roleAvailability[q.id])} onChange={e=>{const value=e.target.value;setSaved(false);setDetails(p=>{const roles={...p.roleAvailability};if(!value)delete roles[q.id];else roles[q.id]=value==='true';return {...p,roleAvailability:roles};});if(value==='false')setAnswer(q.id,'answer','na');else if(value==='true'&&a?.answer==='na')setAnswer(q.id,'answer','');}}><option value="">{t('hrAudit.choose')}</option><option value="true">{t('hrAudit.rolePresent')}</option><option value="false">{t('hrAudit.roleAbsent')}</option></select></label></>}<small>{t('hrAudit.sourceCell')}: {q.sourceCell}</small>
     <div className="audit-filter-grid"><label>{t('hrAudit.answer')}<select disabled={details.roleAvailability?.[q.id]===false} aria-labelledby={`${q.id}-label`} value={a?.answer||''} onChange={e=>setAnswer(q.id,'answer',e.target.value)}><option value="">{t('hrAudit.choose')}</option>{['0','0.5','1','na'].map(v=><option key={v} value={v}>{v==='na'?'N/A':v}</option>)}</select></label>
     <label>{t('hrAudit.questionNote')}<textarea maxLength={4000} value={a?.comment||''} onChange={e=>setAnswer(q.id,'comment',e.target.value)}/></label>
</div>
     <ServicePhoto label={t('hrAudit.evidenceLink')} auditId={execution.auditId} value={linked} files={evidence.data?.data||[]} disabled={!writable||action.busy||uploadBusy} reload={evidence.reload} onBusyChange={setUploadBusy} onChange={id=>{setSaved(false);setDetails(p=>({...p,evidenceLinks:[...(p.evidenceLinks||[]).filter(l=>l.questionId!==q.id),...(id?[{questionId:q.id,evidenceId:id}]:[])]}));}}/>
    </article>;})}
    <ServicePhoto auditId={execution.auditId} value={details.sectionPhotos?.[section.id]||''} files={evidence.data?.data||[]} disabled={!writable||action.busy||uploadBusy} reload={evidence.reload} onBusyChange={setUploadBusy} onChange={id=>{setSaved(false);setDetails(p=>({...p,sectionPhotos:{...p.sectionPhotos,[section.id]:id}}));}}/>
    <label className="audit-hr-note">{t('hrAudit.sectionNote')}<textarea maxLength={4000} value={details.sectionNotes?.[section.id]||''} onChange={e=>{setSaved(false);setDetails(p=>({...p,sectionNotes:{...p.sectionNotes,[section.id]:e.target.value}}));}}/></label>
   </FormSection>)}
   <FormSection title={t('hrAudit.conclusion')} disabled={!writable||action.busy||uploadBusy}>{(['observations','finalOpinion'] as const).map(k=><label className="audit-hr-note" key={k}>{t(`hrAudit.${k}`)}<textarea maxLength={10000} value={details[k]||''} onChange={e=>setDetail(k,e.target.value)}/></label>)}<HRFinalEvidence auditId={execution.auditId} details={details} onChange={value=>{setSaved(false);setDetails(value);}} files={evidence.data?.data||[]} reload={evidence.reload} onBusyChange={setUploadBusy} disabled={!writable||action.busy||uploadBusy}/></FormSection>
   {writable&&<div className="audit-control-row"><button type="button" className="btn-secondary" disabled={action.busy||uploadBusy} onClick={()=>persist(false)}>{t('hrAudit.saveDraft')}</button><button type="submit" className="btn-primary" disabled={action.busy||uploadBusy||answered!==questions.length}>{t('hrAudit.complete')}</button><span role="status">{dirty?t('hrAudit.unsaved'):message}</span></div>}
   {error&&<p role="alert">{error}</p>}{action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
  </form>
  <AuditEvidencePanel auditId={execution.auditId}/><button className="btn-secondary" type="button" onClick={evidence.reload}>{t('hrAudit.refreshEvidence')}</button>
  {evidence.status!=='ready'&&<AuditResourceState status={evidence.status} retry={evidence.reload}/>}

  <HRAuditVersions executionId={execution._id}/>
  {confirm&&<HRConfirmDialog title={t('hrAudit.complete')} message={t(snapshot.hrSource?.scoringStatus==='blocked-kfc-denominator'?'hrAudit.kfcConfirm':'hrAudit.completeConfirm')} confirmLabel={t('hrAudit.complete')} loading={action.busy} onCancel={()=>setConfirm(false)} onConfirm={()=>persist(true)}/>}
  {blocker.state==='blocked'&&<HRConfirmDialog title={t('hrAudit.unsaved')} message={t('hrAudit.leaveConfirm')} confirmLabel={t('hrAudit.leave')} onCancel={()=>blocker.reset()} onConfirm={()=>blocker.proceed()}/>}
 </div>;
}
