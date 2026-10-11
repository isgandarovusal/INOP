import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../Context/useAuth';
import {hasPermission} from '../../../Utils/permissions';
import {useHRPage,useDebouncedSearch} from '../../../Hooks/useHRPage';
import {getCvIntakePage} from '../../../Services/cvIntakeService';
import type {CvIntakePage} from '../../../Services/cvIntakeService';
import HRResourceState from '../../../Components/HRResourceState';
import HRPageControls from '../../../Components/HRPageControls';
import PageHeader from '../../../Components/PageHeader';
export default function CvIntakeQueue(){
 const {t}=useTranslation(),{user}=useAuth(),navigate=useNavigate();
 const enabled=import.meta.env.VITE_HR_DURABLE_INTAKE_ENABLED==='true';
 const [status,setStatus]=useState(''),[search,setSearch]=useState(''),q=useDebouncedSearch(search);
 const result=useHRPage('candidate',{status,q},getCvIntakePage,{enabled});
 const summary=(result.data as CvIntakePage|undefined)?.summary;
 if(!hasPermission(user,'candidate','read'))return <HRResourceState status='forbidden'/>;
 if(!enabled)return <p role='alert'>{t('hrDocuments.unavailable')}</p>;
 return <main className='hr-workspace hr-page' data-cv-intake-queue><PageHeader title={t('hrIntake.queue')} subtitle={t('hrIntake.queueNotice')}/>
  <div className='hr-list-controls'><label>{t('common.actions.search')}<input type='search' value={search} maxLength={80} onChange={e=>setSearch(e.target.value)}/></label><label>{t('hrIntake.state')}<select value={status} onChange={e=>setStatus(e.target.value)}><option value=''>{t('hrIntake.allStates')}</option>{['reserved','queued','running','retry','ready','blocked','quarantined','failed','cancelled'].map(state=><option key={state} value={state}>{t('hrIntake.states.'+state)}</option>)}</select></label><button type='button' onClick={result.reload}>{t('hrIntake.check')}</button></div>
  {result.status!=='ready'?<HRResourceState status={result.status} retry={result.reload}/>:<>
   <p data-source-summary>{t('hrIntake.pendingReview')}: {summary?.pendingReview??0} · {t('hrIntake.recoveryPending')}: {summary?.recoveryPending??0}</p>
   {!result.data?.items.length?<p role='status'>{t('hrIntake.empty')}</p>:<ul>{result.data.items.map(item=><li key={item.id} data-source-id={item.id}><p>{item.original.originalName}</p><p>{t('hrIntake.states.'+item.state)} · {t(item.evidenceMode==='test'?'hrIntake.test':'hrIntake.notice')}</p><button data-source-view type='button' onClick={()=>navigate('/app/recruitment/cv-intake/'+item.id)}>{t('hrIntake.view')}</button><button type='button' disabled={!hasPermission(user,'candidate','create')||item.taskVersion!=='intake-rules-1'} onClick={()=>navigate('/app/recruitment/candidates/new?intakeId='+item.id)}>{t('hrIntake.resume')}</button></li>)}</ul>}
   {result.data&&<HRPageControls data={result.data} page={result.page} onPage={result.setPage}/>}</>}
 </main>;
}
