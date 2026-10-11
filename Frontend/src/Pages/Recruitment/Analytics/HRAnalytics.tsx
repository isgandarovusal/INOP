import HRFilterPanel from '../../../Components/HRFilterPanel';
import { useId, useMemo, useState } from 'react';
import { BriefcaseBusiness, UsersRound, Inbox, Clock3, RefreshCw } from 'lucide-react';
import HRHistogram from '../../../Components/HRHistogram';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuditResource } from '../../../Hooks/useAuditResource';
import { getHRAnalytics, type HRAnalyticsFilters } from '../../../Services/hrAnalyticsService';
import { brandLabel } from '../../../Services/recruitmentCatalogService';
import PageHeader from '../../../Components/PageHeader';
import HRResourceState from '../../../Components/HRResourceState';
export default function HRAnalyticsPage() {
  const { t, i18n } = useTranslation(); const [filters, setFilters] = useState<HRAnalyticsFilters>({});
  const [pane, setPane] = useState<'overview' | 'operations'>('overview'), tabId = useId();
  const result = useAuditResource(JSON.stringify(filters), 'application', getHRAnalytics), data = result.data;
  const update = (key: keyof HRAnalyticsFilters, value: string) => setFilters(old => ({ ...old, [key]: value,
    ...(key === 'brandId' ? { branchId: '', jobId: '' } : key === 'branchId' ? { jobId: '' } : {}) }));
  const brands = data?.options.brands || [{ id: 'kfc', name: 'KFC', active: true }, { id: 'pizza-hut', name: 'Pizza Hut', active: true }, { id: 'simit-sarayi', name: 'Simit Sarayı', active: true }];
  const days = (value: number | null) => value === null ? t('hrAnalytics.unknown') : t('hrAnalytics.days', { count: value });
  const formatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baku' }), [i18n.language]);
  const kpiIcons = { activeVacancies: BriefcaseBusiness, applications: UsersRound, newApplications: Inbox, processing: Clock3 };
  const scoreRows = useMemo(() => data?.scores?.buckets.map(b => ({ label: `${b.min}–${b.max}%`, count: b.count })) || [], [data?.scores]);
  const statuses = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];
  return <div className="hr-workspace hr-analytics-page">
    <PageHeader title={t('hrAnalytics.title')} subtitle={t('hrAnalytics.subtitle')} actions={<><button type="button" className="btn-secondary hr-icon-action" aria-label={t('common.actions.refresh')} title={t('common.actions.refresh')} onClick={result.reload}><RefreshCw size={16}/></button><Link className="btn-secondary hr-header-link" to="/app/recruitment/applications">{t('navigation.applications')}</Link></>} />
    <div className="hr-analytics-toolbar"><div className="filter-bar hr-brand-segments" aria-label={t('hrAnalytics.brands')}>
      <button type="button" aria-pressed={!filters.brandId} onClick={() => update('brandId', '')}>GFC</button>
      {brands.map(b => <button type="button" key={b.id} aria-pressed={filters.brandId === b.id} onClick={() => update('brandId', b.id)}>{b.name}</button>)}
      <button type="button" aria-pressed={filters.brandId === 'unset'} onClick={() => update('brandId', 'unset')}>{t('hrCatalog.unset')}</button>
    </div>
    <HRFilterPanel activeCount={Object.entries(filters).filter(([key, value]) => key !== "brandId" && value).length}><div className="hr-analytics-filter-grid">
      <label>{t('hrCatalog.branch')}<select aria-label={t('hrCatalog.branch')} value={filters.branchId || ''} onChange={e => update('branchId', e.target.value)}>
        <option value="">{t('hrCatalog.allBranches')}</option>{data?.options.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        {filters.branchId && !data?.options.branches.some(b => b.id === filters.branchId) && <option value={filters.branchId}>{t('hrCatalog.unavailable')}</option>}
      </select></label>
      <label>{t('recruitment.applications.job')}<select aria-label={t('recruitment.applications.job')} value={filters.jobId || ''} onChange={e => update('jobId', e.target.value)}>
        <option value="">{t('recruitment.applications.allJobs')}</option>{data?.options.jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        {filters.jobId && !data?.options.jobs.some(j => j.id === filters.jobId) && <option value={filters.jobId}>{t('hrCatalog.unavailable')}</option>}
      </select></label>
      <label>{t('hrAnalytics.from')}<input type="date" aria-label={t('hrAnalytics.from')} value={filters.from || ''} onChange={e => update('from', e.target.value)} /></label>
      <label>{t('hrAnalytics.to')}<input type="date" aria-label={t('hrAnalytics.to')} value={filters.to || ''} onChange={e => update('to', e.target.value)} /></label>
      <label>{t('hrAnalytics.source')}<select aria-label={t('hrAnalytics.source')} value={filters.source || ''} onChange={e => update('source', e.target.value)}>
        <option value="">{t('hrAnalytics.allSources')}</option>{['manual', 'cv_upload', 'outlook', 'kfc', 'pizzahut', 'jobsearch', 'external_form', 'unknown'].map(s => <option key={s} value={s}>{t(`hrAnalytics.sources.${s}`)}</option>)}
      </select></label>
      <label>{t('recruitment.applications.status')}<select aria-label={t('recruitment.applications.status')} value={filters.status || ''} onChange={e => update('status', e.target.value)}>
        <option value="">{t('recruitment.applications.allStatuses')}</option>{statuses.map(s => <option key={s} value={s}>{t(`recruitment.applications.${s.toLowerCase()}`)}</option>)}
      </select></label>
      <button type="button" onClick={() => setFilters({})}>{t('common.actions.clear')}</button>
    </div></HRFilterPanel></div>
    {result.status !== 'ready' || !data ? <><HRResourceState status={result.status} retry={result.reload} />{result.status === 'loading' && <div className="hr-analytics-kpis" aria-hidden="true">{Object.keys(kpiIcons).map(key => <article key={key}><h3>{t(`hrAnalytics.kpi.${key}`)}</h3><strong>—</strong></article>)}</div>}</> : <>
      {data.totals.applications === 0 && <p role="status" data-hr-analytics-empty>{t('hrAnalytics.empty')}</p>}
      {data.coverage.restrictedCandidateApplications > 0 && <p role="status">{t('hrAnalytics.partial', { count: data.coverage.restrictedCandidateApplications })}</p>}
      <p className="hr-analytics-updated"><span>{t('hrWorkspace.updated')}</span> <time dateTime={data.generatedAt}>{formatter.format(new Date(data.generatedAt))}</time></p>
      <div className="hr-analytics-kpis">{Object.entries(data.totals).map(([key, value]) => { const Icon = kpiIcons[key as keyof typeof kpiIcons]; return <article key={key} data-hr-kpi={key}><div className="hr-kpi-heading"><h3>{t(`hrAnalytics.kpi.${key}`)}</h3>{Icon && <Icon size={18} aria-hidden="true" />}</div><strong>{value.toLocaleString(i18n.language)}</strong></article>; })}</div>
      <div className="hr-analytics-tabs" role="tablist" aria-label={t('hrWorkspace.analyticsViews')}>
        {(['overview', 'operations'] as const).map(value => <button type="button" role="tab" key={value} id={`${tabId}-${value}`} aria-controls={`${tabId}-panel`} aria-selected={pane === value} tabIndex={pane === value ? 0 : -1} onClick={() => setPane(value)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); const next = event.key === 'Home' ? 'overview' : event.key === 'End' ? 'operations' : value === 'overview' ? 'operations' : 'overview';
          setPane(next); document.getElementById(`${tabId}-${next}`)?.focus();
        }}>{t(`hrWorkspace.${value}`)}</button>)}
      </div>
      <div className="hr-analytics-sections" role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${pane}`} data-hr-analytics-pane={pane}>
        {pane === 'overview' ? <>
        <section className="hr-panel hr-panel--funnel"><h2>{t('hrAnalytics.funnel')}</h2><table><thead><tr><th>{t('recruitment.applications.status')}</th><th>{t('hrAnalytics.count')}</th></tr></thead><tbody>{data.funnel.map(r => <tr key={r.status} data-hr-stage={r.status}><th scope="row">{t(`recruitment.applications.${r.status.toLowerCase()}`)}</th><td><span className="hr-analytic-number">{r.count}</span><span className="hr-metric-track" aria-hidden="true"><span style={{width:`${data.totals.applications ? Math.min(100,r.count/data.totals.applications*100):0}%`}}/></span></td></tr>)}</tbody></table></section>
        <section className={"hr-panel hr-panel--scores" + (data.totals.applications === 0 ? " hr-panel--empty" : "")}><h2>{t('hrAnalytics.scores')}</h2>{data.scores ? <><HRHistogram title={t('hrAnalytics.scores')} rows={scoreRows}/><ul className="hr-score-states">{Object.entries(data.scores.states).filter(([, value]) => value > 0).map(([key, value]) => <li key={key} data-hr-score={key}>{t(`hrMatch.${key}`)}: {value}</li>)}</ul><ul className="hr-score-legend">{data.scores.buckets.map(b => <li key={b.min} data-hr-score-bucket={b.min}>{b.min}–{b.max}%: {b.count}</li>)}</ul></> : <p role="status">{t('hrAnalytics.changed')}</p>}</section>
        <section className="hr-panel hr-panel--sources"><h2>{t('hrAnalytics.source')}</h2><ul className="hr-distribution">{data.sources.map(r => <li key={r.key} data-hr-source={r.key}><span>{t(`hrAnalytics.sources.${r.key}`)}: {r.count}</span><span className="hr-metric-track" aria-hidden="true"><span style={{width:`${data.totals.applications ? Math.min(100,r.count/data.totals.applications*100):0}%`}}/></span></li>)}</ul></section>
        </> : <>
        <section><h2>{t('hrAnalytics.brands')}</h2><table><thead><tr><th>{t('hrCatalog.brand')}</th><th>{t('hrAnalytics.kpi.applications')}</th><th>{t('hrAnalytics.kpi.activeVacancies')}</th></tr></thead><tbody>{data.byBrand.map(r => <tr key={r.id}><th scope="row">{r.id === 'unset' ? t('hrCatalog.unset') : brands.find(b => b.id === r.id)?.name || brandLabel(r.id)}</th><td>{r.applications}</td><td>{r.activeVacancies}</td></tr>)}</tbody></table>{data.byBrandTruncated && <p>{t('hrAnalytics.catalogCap')}</p>}</section>
        <section><h2>{t('hrAnalytics.review')}</h2><p>{t('hrAnalytics.linkedReview')}</p>{data.coverage.candidateReadable ? <ul>{Object.entries(data.review).map(([key, value]) => <li key={key}>{t(`hrAnalytics.reviewState.${key}`)}: {value}</li>)}<li>{t('hrAnalytics.duplicates')}: {data.duplicateAlerts.extraProfiles}</li></ul> : <p>{t('hrStates.restricted')}</p>}</section>
        <section><h2>{t('hrAnalytics.interviews')}</h2>{data.interviews.length ? <ul>{data.interviews.map(r => <li key={r.result}>{t(r.result === 'unscheduled' ? 'hrAnalytics.unscheduled' : `hrWorkflow.resultState.${r.result}`)}: {r.count}</li>)}</ul> : <p>{t('hrAnalytics.empty')}</p>}</section>
        <section><h2>{t('hrAnalytics.stageTime')}</h2><p>{t('hrAnalytics.currentStage')}</p><ul>{data.timeInStage.map(r => <li key={r.status}>{t(`recruitment.applications.${r.status.toLowerCase()}`)}: {days(r.averageDays)} ({t('hrAnalytics.samples', { count: r.samples })})</li>)}</ul><h3>{t('hrAnalytics.hireTime')}</h3><p data-hr-hire-time>{days(data.timeToHire.averageDays)} ({t('hrAnalytics.samples', { count: data.timeToHire.samples })})</p></section>
        <section><h2>{t('hrAnalytics.health')}</h2><ul>{Object.entries(data.integrations).map(([key, value]) => <li key={key}>{t(`hrAnalytics.integration.${key}`)}: {t(`hrAnalytics.healthState.${value}`)}</li>)}</ul><h3>{t('hrWorkflow.delivery')}</h3><ul>{data.deliveryQueue.map(r => <li key={r.state}>{t(`hrWorkflow.deliveryState.${r.state}`)}: {r.count}</li>)}</ul></section>
        </>}
      </div>
      {(data.options.jobsTruncated || data.options.brandsTruncated) && <p>{t('hrAnalytics.catalogCap')}</p>}
    </>}
    <details className="hr-data-note"><summary>{t('hrWorkspace.cohort')}</summary><p>{t('hrAnalytics.cohort')}</p></details>
  </div>;
}
