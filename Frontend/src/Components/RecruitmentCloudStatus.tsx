import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {getRecruitmentCloudStatus} from '../Services/recruitmentCloudService';
import type {RecruitmentCloudStatus as CloudStatus} from '../Services/recruitmentCloudService';

// Explicit opt-in read only: no API calls until HR clicks; never contacts Cloudflare from browser.
export default function RecruitmentCloudStatus(){
 const {t}=useTranslation();
 const [state,setState]=useState<'idle'|'loading'|'ready'|'unavailable'>('idle');
 const [status,setStatus]=useState<CloudStatus|null>(null);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function check(){
  active.current?.abort();
  const controller=new AbortController();active.current=controller;
  setState('loading');setStatus(null);
  try{
   const result=await getRecruitmentCloudStatus(controller.signal);
   if(!controller.signal.aborted){setStatus(result);setState('ready');}
  }catch{
   if(!controller.signal.aborted){setStatus(null);setState('unavailable');}
  }
 }
 return <section data-recruitment-cloud aria-label={t('hrCloud.title')}>
  <h3>{t('hrCloud.title')}</h3>
  <p>{t('hrCloud.description')}</p>
  <button type="button" className="btn-secondary" data-cloud-check disabled={state==='loading'} onClick={()=>void check()}>
   {t(state==='loading'?'common.actions.loading':'hrCloud.check')}
  </button>
  {state==='unavailable'&&<p role="status" data-cloud-unavailable>{t('hrCloud.notConnected')}</p>}
  {state==='ready'&&status&&<p role="status" data-cloud-ready>
   {t('hrCloud.connected')} · {t(status.cvIntake==='disabled'?'hrCloud.uploadDisabled':'hrCloud.quarantineOnly')} · {t('hrCloud.aiDisabled')}
  </p>}
 </section>;
}
