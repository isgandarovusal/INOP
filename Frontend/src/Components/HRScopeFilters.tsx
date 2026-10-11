import HRFilterPanel from './HRFilterPanel';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/useAuth';
import { hasPermission } from '../Utils/permissions';
import { useHRPage, useDebouncedSearch } from '../Hooks/useHRPage';
import { getBrandPage, getBranchPage, getJobPage } from '../Services/hrPageService';
import { brandLabel } from '../Services/recruitmentCatalogService';
import type { Job } from '../Types/recruitment';
import HRPageControls from './HRPageControls';
import HRResourceState from './HRResourceState';
export default function HRScopeFilters({ jobs, brand, branch, job, onBrand, onBranch, onJob }: {
  jobs: Job[]; brand: string; branch: string; job?: string; onBrand: (value: string) => void; onBranch: (value: string) => void; onJob?: (value: string) => void;
}) {
  const { t } = useTranslation(), { user } = useAuth();
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState(false), [brandSearch, setBrandSearch] = useState(''), [branchSearch, setBranchSearch] = useState(''), [jobSearch, setJobSearch] = useState('');
  const enabled = filterOpen && expanded && hasPermission(user, 'recruitment', 'read');
  const brands = useHRPage('recruitment', { q: useDebouncedSearch(brandSearch), sort: 'name' }, getBrandPage, { enabled });
  const branches = useHRPage('recruitment', { q: useDebouncedSearch(branchSearch), sort: 'name', brandId: brand === 'all' ? undefined : brand }, getBranchPage, { enabled });
  const jobOptions = useHRPage('recruitment', { q: useDebouncedSearch(jobSearch), brandId: brand === 'all' ? undefined : brand, branchId: branch === 'all' ? undefined : branch }, getJobPage, { enabled: enabled && !!onJob });
  // Initial choices come from the visible scoped page. The lookup opens any
  // additional authorized catalog page without loading the whole catalog.
  const brandIds = useMemo(() => [...new Set(['kfc', 'pizza-hut', 'simit-sarayi', ...(brand !== 'all' && brand !== 'unset' ? [brand] : []), ...jobs.map(j => j.brandId).filter((id): id is string => !!id), ...(brands.data?.items.map(b => b.id) || [])])], [jobs, brand, brands.data]);
  const branchOptions = new Map(jobs.filter(j => j.branchId).map(j => [j.branchId!, j.branchName || t('hrCatalog.unavailable')]));
  for (const b of branches.data?.items || []) branchOptions.set(b.id, b.name);
  if (branch !== 'all' && !branchOptions.has(branch)) branchOptions.set(branch, t('hrCatalog.unavailable'));
  const vacancies = new Map([...jobs, ...(jobOptions.data?.items || [])].map(j => [j.id, j.position]));
  if (job && job !== 'all' && !vacancies.has(job)) vacancies.set(job, t('hrCatalog.unavailable'));
  return <HRFilterPanel activeCount={[brand, branch, ...(onJob ? [job] : [])].filter(value => value && value !== "all").length} onOpenChange={open => { setFilterOpen(open); if (!open) setExpanded(false); }}>
    <select aria-label={t('hrCatalog.brand')} value={brand} disabled={!hasPermission(user, 'recruitment', 'read')} onChange={e => onBrand(e.target.value)}>
      <option value="all">{t('hrCatalog.allBrands')}</option><option value="unset">{t('hrCatalog.unset')}</option>
      {brandIds.map(id => <option key={id} value={id}>{brands.data?.items.find(b => b.id === id)?.name || jobs.find(j => j.brandId === id)?.brandName || brandLabel(id)}</option>)}
    </select>
    <select aria-label={t('hrCatalog.branch')} value={branch} disabled={!hasPermission(user, 'recruitment', 'read')} onChange={e => onBranch(e.target.value)}>
      <option value="all">{t('hrCatalog.allBranches')}</option>{[...branchOptions].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
    {onJob && <select aria-label={t('hrPage.jobFilter')} value={job} disabled={!hasPermission(user, 'recruitment', 'read')} onChange={e => onJob(e.target.value)}>
      <option value="all">{t('recruitment.applications.allJobs')}</option>{[...vacancies].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>}
    {hasPermission(user, 'recruitment', 'read') && <details open={expanded} onToggle={e => setExpanded(e.currentTarget.open)} className="hr-filter-lookups">
      <summary>{t('hrPage.lookup')}</summary>
      {expanded && <div>{[
        { key: 'brand', value: brandSearch, set: setBrandSearch, result: brands },
        { key: 'branch', value: branchSearch, set: setBranchSearch, result: branches },
        ...(onJob ? [{ key: 'job', value: jobSearch, set: setJobSearch, result: jobOptions }] : []),
      ].map(({ key, value, set, result }) => <section key={key} aria-label={t(`hrPage.${key}Lookup`)}>
        <label>{t(`hrPage.${key}Lookup`)}<input type="text" maxLength={80} value={value} onChange={e => set(e.target.value)} /></label>
        {result.status !== 'ready' && <HRResourceState status={result.status} retry={result.reload} />}
        <HRPageControls data={result.data} page={result.page} onPage={result.setPage} disabled={result.status !== 'ready'} />
      </section>)}</div>}
    </details>}
  </HRFilterPanel>;
}
