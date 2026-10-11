import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, SearchX, ShieldCheck } from 'lucide-react';
import type { AuditLoadStatus } from '../Hooks/useAuditResource';

export default function HRResourceState({ status, retry }: { status: AuditLoadStatus; retry?: () => void }) {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (status !== 'loading') { return; }
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => { clearTimeout(timer); setSlow(false); };
  }, [status]);
  if (status === 'ready') return null;
  const loading = status === 'loading';
  const Icon = loading ? Loader2 : status === 'not-found' ? SearchX : status === 'forbidden' ? ShieldCheck : AlertCircle;
  return <div className="hr-workspace hr-resource-state" data-hr-state={status} role={loading ? 'status' : 'alert'} aria-live="polite" aria-busy={loading || undefined}>
    <Icon size={18} className={loading ? 'spin' : undefined} aria-hidden="true" />
    <div className="hr-resource-state__copy"><p>{t(`hrStates.${status}`)}</p>{loading && slow && <small>{t('hrStates.slow')}</small>}</div>
    {retry && !['unauthenticated'].includes(status) && (!loading || slow) && <button type="button" className="btn-secondary" onClick={retry}>{t('hrStates.retry')}</button>}
  </div>;
}
