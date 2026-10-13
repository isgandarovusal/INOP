import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditResource } from '../Hooks/useAuditResource';
import { useMounted } from '../Hooks/useMounted';
import { useAuth } from '../Context/useAuth';
import { getPermissionScope, hasPermission } from '../Utils/permissions';
import { getErrorMessage } from '../Utils/getErrorMessage';
import { getRecruitmentCatalog, createRecruitmentBrand, createRecruitmentBranch, type RecruitmentBranch } from '../Services/recruitmentCatalogService';

export default function RecruitmentLocationFields({ brandId, branchId, onChange }: {
  brandId: string | null; branchId: string | null;
  onChange: (brandId: string | null, branchId: string | null) => void;
}) {
  const { t } = useTranslation(); const { user } = useAuth(); const mounted = useMounted();
  const result = useAuditResource('catalog', 'recruitment', getRecruitmentCatalog, { refreshOnFocus: false });
  const [brandCode, setBrandCode] = useState(''), [brandName, setBrandName] = useState('');
  const [code, setCode] = useState(''), [name, setName] = useState('');
  const [kind, setKind] = useState<RecruitmentBranch['kind']>('restaurant');
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const lock = useRef(false), branchDetails = useRef<HTMLDetailsElement>(null), brandDetails = useRef<HTMLDetailsElement>(null);
  const canCreate = hasPermission(user, 'recruitment', 'create');
  const brands = result.data?.brands ?? [], branches = (result.data?.branches ?? []).filter(b => b.brandId === brandId);
  const add = async (type: 'brand' | 'branch') => {
    if (lock.current || type === 'branch' && kind === 'restaurant' && !brandId) return;
    const selectedCode = (type === 'brand' ? brandCode : code).trim();
    const selectedName = (type === 'brand' ? brandName : name).trim();
    if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(selectedCode) || !selectedName || selectedName.length > (type === 'brand' ? 80 : 100)) {
      setError(t('hrCatalog.catalogInvalid')); return;
    }
    if (type === 'brand' ? brands.some(b => b.id === selectedCode) : (result.data?.branches ?? []).some(b => b.code === selectedCode)) {
      setError(t('hrCatalog.catalogDuplicate')); return;
    }
    lock.current = true; setSaving(true); setError('');
    try {
      if (type === 'brand') {
        const b = await createRecruitmentBrand(selectedCode, selectedName); if (!mounted.current) return;
        onChange(b.id, null); setBrandCode(''); setBrandName(''); if (brandDetails.current) brandDetails.current.open = false;
      } else {
        const b = await createRecruitmentBranch({ code: selectedCode, name: selectedName, brandId, kind }); if (!mounted.current) return;
        onChange(b.brandId, b._id); setCode(''); setName(''); if (branchDetails.current) branchDetails.current.open = false;
      }
      result.reload();
    } catch (e) { if (mounted.current) setError(getErrorMessage(e, t('somethingWentWrong'))); }
    finally { lock.current = false; if (mounted.current) setSaving(false); }
  };
  return <div className="form-group form-group--full" data-recruitment-locations>
    <p className="job-catalog-hint">{t('hrCatalog.catalogHint')}</p>
    <div className="form-group"><label htmlFor="job-brand">{t('hrCatalog.brand')}</label>
    <select disabled={saving} id="job-brand" value={brandId || ''} onChange={e => onChange(e.target.value || null, null)}>
      <option value="">{t('hrCatalog.unset')}</option>
      {brandId && !brands.some(b => b.id === brandId) && <option value={brandId}>{brandId}</option>}
      {brands.filter(b => b.active || b.id === brandId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
    </div><div className="form-group"><label htmlFor="job-branch">{t('hrCatalog.branch')}</label>
    <select disabled={saving} id="job-branch" value={branchId || ''} onChange={e => onChange(brandId, e.target.value || null)}>
      <option value="">{t('hrCatalog.unset')}</option>
      {branchId && !branches.some(b => b._id === branchId) && <option value={branchId}>{t('hrCatalog.unavailable')}</option>}
      {branches.filter(b => b.status === 'active' || b._id === branchId).map(b => <option key={b._id} value={b._id}>{b.name} · {t(`hrCatalog.${b.kind}`)}</option>)}
    </select>
    </div>
    {result.status !== 'ready' && <p role="status">{t(result.status === 'loading' ? 'hrStates.loading' : 'hrCatalog.loadError')} {result.status !== 'loading' && <button type="button" onClick={result.reload}>{t('hrStates.retry')}</button>}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="job-location-actions">{canCreate && <details ref={branchDetails} onToggle={event => { if (event.currentTarget.open) setError(''); }}><summary>{t('hrCatalog.addBranch')}</summary><div className="job-inline-form" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); void add('branch'); } }}>
      <label>{t('hrCatalog.code')}<input aria-label={t('hrCatalog.branchCode')} value={code} onChange={e => setCode(e.target.value)} /></label>
      <label>{t('hrCatalog.name')}<input aria-label={t('hrCatalog.branchName')} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{t('hrCatalog.kind')}<select aria-label={t('hrCatalog.kind')} value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{['restaurant', 'office', 'warehouse', 'remote'].map(k => <option key={k} value={k}>{t(`hrCatalog.${k}`)}</option>)}</select></label>
      <button type="button" disabled={saving || !code || !name || (kind === 'restaurant' && !brandId)} onClick={() => void add('branch')}>{t('hrCatalog.addBranch')}</button></div>
    </details>}
    {getPermissionScope(user, 'recruitment', 'create') === 'all' && <details ref={brandDetails} onToggle={event => { if (event.currentTarget.open) setError(''); }}><summary>{t('hrCatalog.addBrand')}</summary><div className="job-inline-form" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); void add('brand'); } }}>
      <label>{t('hrCatalog.code')}<input aria-label={t('hrCatalog.brandCode')} value={brandCode} onChange={e => setBrandCode(e.target.value)} /></label>
      <label>{t('hrCatalog.name')}<input aria-label={t('hrCatalog.brandName')} value={brandName} onChange={e => setBrandName(e.target.value)} /></label>
      <button type="button" disabled={saving || !brandCode || !brandName} onClick={() => void add('brand')}>{t('hrCatalog.addBrand')}</button></div>
    </details>}
    </div>
  </div>;
}
