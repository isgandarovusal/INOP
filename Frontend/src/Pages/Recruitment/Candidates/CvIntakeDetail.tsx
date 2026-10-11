import {useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../Context/useAuth';
import {hasPermission} from '../../../Utils/permissions';
import {useHRActionContext} from '../../../Hooks/useHRActionContext';
import {useAuditResource,auditErrorStatus} from '../../../Hooks/useAuditResource';
import type {AuditLoadStatus} from '../../../Hooks/useAuditResource';
import {getCvIntake,downloadCvIntake} from '../../../Services/cvIntakeService';
import CvReviewEvidence from '../../../Components/CvReviewEvidence';
import CvIntakeSourceReview from '../../../Components/CvIntakeSourceReview';
import HRResourceState from '../../../Components/HRResourceState';
import PageHeader from '../../../Components/PageHeader';

export default function CvIntakeDetail(){
 const {id}=useParams(),{user}=useAuth(),{t}=useTranslation(),enabled=import.meta.env.VITE_HR_DURABLE_INTAKE_ENABLED==='true';
 const result=useAuditResource(enabled?id:undefined,'candidate',getCvIntake),context=useHRActionContext(id),controller=useRef<AbortController|null>(null);
 const [action,setAction]=useState<{key:string;status:AuditLoadStatus;busy:boolean}>({key:'',status:'ready',busy:false});
 useEffect(()=>()=>controller.current?.abort(),[context.key]);
 const download=async()=>{
  if(!result.data)return;const key=context.key,c=new AbortController();controller.current?.abort();controller.current=c;setAction({key,status:'ready',busy:true});
  try{await downloadCvIntake(result.data,c.signal);}catch(error){if(context.current.current===key&&!c.signal.aborted)setAction({key,status:auditErrorStatus(error),busy:false});return;}
  if(context.current.current===key&&!c.signal.aborted)setAction({key,status:'ready',busy:false});
 };
 if(!hasPermission(user,'candidate','read'))return <HRResourceState status='forbidden'/>;
 if(!enabled)return <p role='alert'>{t('hrDocuments.unavailable')}</p>;
 if(result.status!=='ready'||!result.data)return <HRResourceState status={result.status} retry={result.reload}/>;
 const source=result.data,readable=source.state==='ready'||source.state==='blocked'&&source.code==='OCR_REQUIRED';
 return <main className='hr-workspace hr-page' data-source-detail><PageHeader title={source.original.originalName} subtitle={t('hrIntake.queueNotice')}/>
  <p>{t('hrIntake.states.'+source.state)} · {t(source.evidenceMode==='test'?'hrIntake.test':'hrIntake.notice')}</p>
  <button type='button' onClick={result.reload}>{t('hrIntake.check')}</button>
  {readable&&<button data-source-download type='button' disabled={action.key===context.key&&action.busy} onClick={()=>void download()}>{t('hrIntake.original')}</button>}
  {action.key===context.key&&action.status!=='ready'&&<HRResourceState status={action.status}/>}
  {source.candidateId&&<Link to={'/app/recruitment/candidates/'+source.candidateId}>{t('hrIntake.reviewExisting')}</Link>}
  {hasPermission(user,'candidate','create')&&(!source.approvalState||source.approvalState==='reserved')&&<Link data-source-resume to={'/app/recruitment/candidates/new?intakeId='+source.id}>{t('hrIntake.resume')}</Link>}
  <CvReviewEvidence review={source.result?.review}/>
  <CvIntakeSourceReview source={source} recovering/>
 </main>;
}
