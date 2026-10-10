import { useTranslation } from 'react-i18next';
import PageState from './PageState';
import type { AuditLoadStatus } from '../Hooks/useAuditResource';

export default function HRResourceState({ status, retry }: { status: AuditLoadStatus; retry?: () => void }) {
  const { t } = useTranslation();
  if (status === 'ready') return null;
  return <div data-hr-state={status} role={status === 'loading' ? 'status' : 'alert'} aria-busy={status === 'loading' || undefined}>
    <PageState type={status === 'loading' ? 'loading' : status === 'not-found' ? 'empty' : 'error'}
      title={t(`hrStates.${status}`)} action={retry && !['loading', 'unauthenticated'].includes(status)
        ? <button type="button" onClick={retry}>{t('hrStates.retry')}</button> : undefined} />
    {status === 'loading' && <div className="hr-skeleton" data-hr-skeleton aria-hidden="true">
      {[0, 1, 2, 3].map(row => <div key={row} className="hr-skeleton-row" data-skeleton-row />)}
    </div>}
  </div>;
}
