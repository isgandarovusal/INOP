import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHRActionContext } from '../Hooks/useHRActionContext';
import { useAuditResource } from '../Hooks/useAuditResource';
import { getApplicationById } from '../Services/applicationsService';
import type { Application } from '../Types/recruitment';
import MatchScoreBadge from './MatchScoreBadge';
import HRResourceState from './HRResourceState';

export default function VacancyComparison({jobId, applications}: {jobId: string; applications: Application[]}) {
  const {t,i18n} = useTranslation();
  const years = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? t('hrMatch.years',{count:value,value:new Intl.NumberFormat(i18n.language).format(value)}) : t('cvReview.unknown');
  const context = useHRActionContext(JSON.stringify([jobId, applications.map(a=>[a.id,a.revision,a.scoreStatus])]));
  const [selection,setSelection] = useState({key:'',ids:[] as string[]});
  const [opened,setOpened] = useState({key:'',ids:[] as string[]});
  const ids = selection.key === context.key ? selection.ids : [];
  const visible = applications.filter(a=>a.candidateId && typeof a.candidateId === 'object');
  const requested = opened.key === context.key && opened.ids.length >= 2 ? JSON.stringify([jobId,opened.ids]) : undefined;
  const load = useCallback(async (value: string,signal?: AbortSignal,scopeKey?: string) => {
    const [job, selected] = JSON.parse(value) as [string,string[]];
    if(selected.length < 2 || selected.length > 3 || new Set(selected).size !== selected.length) throw Error('Invalid comparison.');
    const rows = await Promise.all(selected.map(id=>getApplicationById(id,signal,scopeKey)));
    // Independent parent grants are required. Handoff is deliberately never used.
    if(rows.some((a,i)=>!a || a.id !== selected[i] || !a.candidateId || typeof a.candidateId !== 'object' || !a.jobId || typeof a.jobId !== 'object' || a.jobId.id !== job)) throw Error('Comparison unavailable.');
    return rows as Application[];
  },[]);
  const detail = useAuditResource(requested,'application',load);
  const clear = () => {setSelection({key:context.key,ids:[]});setOpened({key:context.key,ids:[]});};
  return <section className="detail-card" aria-label={t('hrCompare.title')}>
    <h3>{t('hrCompare.title')}</h3><p>{t('hrCompare.help')}</p><p>{t('hrCandidateFilters.certHelp')}</p>
    <fieldset className="form-group"><legend>{t('hrCompare.select')}</legend>{visible.map(a=><div className="form-group" key={a.id}><label>
      <input type="checkbox" checked={ids.includes(a.id)} disabled={!ids.includes(a.id)&&ids.length>=3} onChange={()=>{setSelection({key:context.key,ids:ids.includes(a.id)?ids.filter(id=>id!==a.id):[...ids,a.id]});setOpened({key:context.key,ids:[]});}} />
      {typeof a.candidateId === 'object' && a.candidateId?.name}
    </label></div>)}</fieldset>
    <button type="button" className="btn-secondary" disabled={ids.length<2} onClick={()=>setOpened({key:context.key,ids:[...ids]})}>{t('hrCompare.open')}</button>{ids.length>0&&<button type="button" className="btn-secondary" onClick={clear}>{t('common.actions.clear')}</button>}
    {requested && (detail.status !== 'ready' ? <HRResourceState status={detail.status} retry={detail.reload} /> : <>
      <p role="note">{t('hrCompare.human')}</p><div className="detail-grid" aria-label={t('hrCompare.results')}>
        {detail.data?.map(a=><article className="detail-card" key={a.id} aria-label={typeof a.candidateId === 'object' ? a.candidateId?.name : undefined}>
          <h4>{typeof a.candidateId === 'object' && a.candidateId?.name}</h4>
          <p>{a.statusKnown ? t('recruitment.applicationStatus.'+a.status) : t('hrCompare.unavailable')}</p>
          <MatchScoreBadge application={a}/>
          {a.matching?.criteria.map(c=><div key={c.key}>
            <strong>{t('hrMatch.'+c.key)}</strong>
            {!c.known ? <p>{t('cvReview.unknown')}</p> : c.key==='experience' ? <p>{t('hrMatch.candidateExperience',{value:years(c.value)})} · {t('hrMatch.requiredExperience',{value:years(c.required)})}</p> : <>
              <p>{t('hrCompare.matched')}: {c.matched?.join(', ') || '—'}</p>
              <p>{t('hrMatch.missing')}: {c.missing?.join(', ') || '—'}</p>
            </>}
          </div>)}
          <Link to={'/app/recruitment/applications/'+a.id}>{t('hrWorkflow.details')}</Link>
        </article>)}
      </div>
    </>)}
  </section>;
}
