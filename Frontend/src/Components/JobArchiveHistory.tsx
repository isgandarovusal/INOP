import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getJobArchiveHistory } from '../Services/jobsService';
import { useAuditResource } from '../Hooks/useAuditResource';
import HRResourceState from './HRResourceState';
export default function JobArchiveHistory({id,revision}:{id:string;revision?:number}) {
  const {t,i18n}=useTranslation(),[open,setOpen]=useState(false);
  const result=useAuditResource(open?id:undefined,'recruitment',getJobArchiveHistory);
  return <section className="detail-card" data-job-archive-history data-revision={revision}>
    <button type="button" className="btn-secondary" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{t('hrArchive.history')}</button>
    {open&&(result.status!=='ready'?<HRResourceState status={result.status} retry={result.reload}/>:<><p>{t('hrArchive.historyLimit')}</p><ol>{result.data?.items.map(event=><li key={event.revision}><strong>{t('hrArchive.'+event.action)}</strong> · <time dateTime={event.at}>{new Intl.DateTimeFormat(i18n.language,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Baku'}).format(new Date(event.at))}</time>{event.reason&&<p>{event.reason}</p>}</li>)}</ol></>)}
  </section>;
}
