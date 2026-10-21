import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Link,Navigate,useNavigate,useParams} from 'react-router-dom';
import PageHeader from '../../../Components/PageHeader';
import AuditResourceState from '../../../Components/AuditResourceState';
import {FormSection} from '../../../Components/HRSection';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import {useAuth} from '../../../Context/useAuth';
import {getAuditById,updateAudit} from '../../../Services/auditsService';
import type {Audit} from '../../../Types/audit';

function LegacyAuditEditor({audit}:{audit:Audit}){
 const {t}=useTranslation();const navigate=useNavigate();
 const [scores,setScores]=useState(audit.scores||{cleanliness:0,service:0,food:0,staff:0});
 const [comments,setComments]=useState(audit.comments||'');
 const action=useAuditAction(audit.id,'audit','update');
 return <div className="audit-direction-page">
  <PageHeader title={t('audit.generic.edit.title')}/>
  <form onSubmit={e=>{e.preventDefault();void action.run(signal=>updateAudit(audit.id,{scores,comments},signal),()=>navigate(`/app/audit/audits/${audit.id}`));}}>
   <FormSection title={t('audit.generic.form.scores')} disabled={!action.allowed||action.busy}>
    <div className="audit-filter-grid">{Object.entries(scores).map(([key,value])=><label key={key}>{t(`audit.generic.edit.scoreLabels.${key}`)}<input type="number" min="1" max="10" value={value} onChange={e=>setScores(p=>({...p,[key]:Number(e.target.value)}))}/></label>)}</div>
    <label className="audit-hr-note" htmlFor="audit-edit-comments">{t('audit.generic.form.comments')}</label>
    <textarea id="audit-edit-comments" className="input-field" value={comments} onChange={e=>setComments(e.target.value)}/>
   </FormSection>
   {action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
   <div className="audit-control-row"><Link className="btn-cancel" to={`/app/audit/audits/${audit.id}`}>{t('common.cancel')}</Link><button type="submit" className="btn-primary" disabled={!action.allowed||action.busy}>{t(action.busy?'audit.generic.edit.saving':'audit.generic.edit.save')}</button></div>
  </form>
 </div>;
}
export default function AuditEdit(){
 const {id}=useParams();const {user}=useAuth();
 const resource=useAuditResource(id,'audit',getAuditById,{refreshOnFocus:false,deadlineMs:15000});
 if(resource.status!=='ready'||!resource.data)return <AuditResourceState status={resource.status} retry={resource.reload}/>;
 const audit=resource.data;
 if(audit.hrAssessment||audit.serviceAssessment||audit.standardAssessment||audit.hseAssessment)return <Navigate to={`/app/audit/audits/${audit.id}`} replace/>;
 return <LegacyAuditEditor key={JSON.stringify([id,user?.id,user?.role,user?.departmentId,user?.auditDirections,user?.permissions])} audit={audit}/>;
}
