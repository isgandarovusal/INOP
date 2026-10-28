import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../Context/useAuth';
import {hasPermission} from '../../../Utils/permissions';
import {useHRPage,useDebouncedSearch} from '../../../Hooks/useHRPage';
import {useHRActionContext} from '../../../Hooks/useHRActionContext';
import {getCvIntakePage,intakeSourceTypes,intakeReviewUrl} from '../../../Services/cvIntakeService';
import type {CvIntakePage} from '../../../Services/cvIntakeService';
import {getBrandPage,getJobPage} from '../../../Services/hrPageService';
import HRResourceState from '../../../Components/HRResourceState';
import HRPageControls from '../../../Components/HRPageControls';
import CvImportPanel from '../../../Components/CvImportPanel';
import PageHeader from '../../../Components/PageHeader';
export default function CvIntakeQueue(){
 const {t}=useTranslation(),{user}=useAuth(),navigate=useNavigate();
 const enabled=import.meta.env.VITE_HR_DURABLE_INTAKE_ENABLED==='true';
 const [sourceType,setSourceType]=useState(''),[brandId,setBrandId]=useState('');
 const context=useHRActionContext(brandId);
 // Retain only the selected label across result pages; authority/brand changes hide it immediately.
 const [selectedJob,setSelectedJob]=useState<{key:string;id:string;title:string}|null>(null);
 const jobId=selectedJob?.key===context.key?selectedJob.id:'';
 const [jobSearch,setJobSearch]=useState(''),jobQuery=useDebouncedSearch(jobSearch);
 const catalogEnabled=hasPermission(user,'recruitment','read');
 const brands=useHRPage('recruitment',{},getBrandPage,{enabled:catalogEnabled}),jobs=useHRPage('recruitment',{brandId,status:'Open',...(jobQuery?{q:jobQuery}:{})},getJobPage,{enabled:catalogEnabled});
 const [status,setStatus]=useState(''),[search,setSearch]=useState(''),q=useDebouncedSearch(search);
 const result=useHRPage('candidate',{status,q,sourceType,brandId,jobId},getCvIntakePage);
 const summary=(result.data as CvIntakePage|undefined)?.summary;
 if(!hasPermission(user,'candidate','read'))return <HRResourceState status='forbidden'/>;

 return <main className='hr-workspace hr-page' data-cv-intake-queue><PageHeader title={t('hrIntake.queue')} subtitle={t('hrIntake.queueNotice')}/>
  {!enabled&&<p className='hr-notice' role='status' data-intake-processing-disabled>{t('hrIntake.processingDisabled')}</p>}
  {enabled&&<CvImportPanel writable={hasPermission(user,'candidate','create')} onAccepted={result.reload}/>}
  <div className='hr-list-controls'><label>{t('hrIntake.source')}<select value={sourceType} onChange={e=>setSourceType(e.target.value)}><option value=''>{t('hrUniversal.allSources')}</option>{[...intakeSourceTypes,'unknown'].map(key=><option key={key} value={key}>{t('hrUniversal.sources.'+key)}</option>)}</select></label>{catalogEnabled&&<><label>{t('hrUniversal.brand')}<select value={brandId} disabled={brands.status!=='ready'} onChange={e=>{setBrandId(e.target.value);setSelectedJob(null);}}><option value=''>{t('hrImport.allBrands')}</option>{brands.data?.items.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>{t('hrImport.vacancy')}<select data-intake-job-select value={jobId} disabled={jobs.status!=='ready'} onChange={e=>{const job=jobs.data?.items.find(j=>j.id===e.target.value);setSelectedJob(job?{key:context.key,id:job.id,title:job.title}:null);}}><option value=''>{t('hrImport.allVacancies')}</option>{jobId&&!jobs.data?.items.some(j=>j.id===jobId)&&<option value={jobId}>{['forbidden','unauthenticated'].includes(jobs.status)?t('hrStates.restricted'):selectedJob?.title}</option>}{jobs.data?.items.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label></>}<label>{t('common.actions.search')}<input type='search' value={search} maxLength={80} onChange={e=>setSearch(e.target.value)}/></label><label>{t('hrIntake.state')}<select value={status} onChange={e=>setStatus(e.target.value)}><option value=''>{t('hrIntake.allStates')}</option>{['reserved','queued','running','retry','ready','blocked','quarantined','failed','cancelled'].map(state=><option key={state} value={state}>{t('hrIntake.states.'+state)}</option>)}</select></label><button className='btn-secondary' type='button' onClick={result.reload}>{t('hrIntake.check')}</button></div>
  {catalogEnabled&&<details className='hr-filter-lookups' data-intake-job-lookup><summary>{t('hrPage.jobLookup')}</summary><div><section aria-label={t('hrPage.jobLookup')}>
   <div className='hr-list-controls'><label>{t('hrPage.jobLookup')}<input type='text' maxLength={80} value={jobSearch} onChange={e=>setJobSearch(e.target.value)}/></label></div>
   {jobs.status==='loading'&&<HRResourceState status={jobs.status}/>}
   {jobs.status==='ready'&&!jobs.data?.items.length&&<p role='status'>{t('common.messages.noResults')}</p>}
   <HRPageControls data={jobs.data} page={jobs.page} onPage={jobs.setPage} disabled={jobs.status!=='ready'}/>
  </section></div></details>}
  {catalogEnabled&&[{key:'brands',label:t('hrUniversal.brand'),result:brands},{key:'jobs',label:t('hrImport.vacancy'),result:jobs}].map(catalog=>catalog.result.status!=='ready'&&catalog.result.status!=='loading'&&<section key={catalog.key} aria-label={catalog.label} data-intake-catalog-error={catalog.key}><HRResourceState status={catalog.result.status} retry={catalog.result.reload}/></section>)}
  {result.status!=='ready'?<HRResourceState status={result.status} retry={result.reload}/>:<>
   <p data-source-summary>{t('hrIntake.pendingReview')}: {summary?.pendingReview??0} · {t('hrIntake.recoveryPending')}: {summary?.recoveryPending??0}</p>
   {!result.data?.items.length?<p role='status'>{t('hrIntake.empty')}</p>:<ul>{result.data.items.map(item=><li key={item.id} data-source-id={item.id}><p>{item.original.originalName}</p><p>{t('hrUniversal.sources.'+(item.sourceType??'unknown'))}</p><p>{t('hrIntake.states.'+item.state)} · {t(item.evidenceMode==='test'?'hrIntake.test':'hrIntake.notice')}</p><button className='btn-secondary' data-source-view type='button' onClick={()=>navigate('/app/recruitment/cv-intake/'+item.id)}>{t('hrIntake.view')}</button><button className='btn-secondary' type='button' disabled={!enabled||!hasPermission(user,'candidate','create')||item.taskVersion!=='intake-rules-1'} onClick={()=>navigate(intakeReviewUrl(item))}>{t('hrIntake.resume')}</button></li>)}</ul>}
   {result.data&&<HRPageControls data={result.data} page={result.page} onPage={result.setPage}/>}</>}
 </main>;
}
