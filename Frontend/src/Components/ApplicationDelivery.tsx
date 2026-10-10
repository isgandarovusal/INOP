import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useAuth } from '../Context/useAuth';
import { useHRActionContext } from '../Hooks/useHRActionContext';
import { hasPermission } from '../Utils/permissions';
import { retryApplicationDelivery } from '../Services/applicationsService';
import type { ApplicationEvent } from '../Types/recruitment';
const codes = new Set(['SMTP_NOT_CONFIGURED','DELIVERY_FAILED','SEND_TIMEOUT','ATTEMPTS_EXHAUSTED','AUTH_REVOKED','PARENT_SCOPE_REVOKED','MISSING_RECIPIENT','STALE_WORKFLOW','INVALID_EVENT','DELIVERED','RETRY_QUEUED']);
export default function ApplicationDelivery({ id, event, revision, retryEligible, onUpdated, onAccessDenied }: { id: string; event: ApplicationEvent; revision?: number; retryEligible: boolean; onUpdated: () => void; onAccessDenied: () => void }) {
  const { t, i18n } = useTranslation(), { user } = useAuth(), context = useHRActionContext(id + ':' + event.id);
  const request = useRef<AbortController | null>(null);
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => () => { request.current?.abort(); }, []);
  const delivery = event.delivery;
  if (!delivery) return null;
  const canRetry = retryEligible && typeof revision === 'number' && Number.isInteger(revision) && revision >= 0 && hasPermission(user,'application','update') && hasPermission(user,'application','read') && hasPermission(user,'candidate','read') && hasPermission(user,'recruitment','read') && ['failed','blocked'].includes(delivery.state) && (delivery.retryCount || 0) < 3;
  const at = delivery.nextAttemptAt ? new Date(delivery.nextAttemptAt) : null;
  const formatted = at && !Number.isNaN(at.getTime()) ? new Intl.DateTimeFormat(i18n.language,{ dateStyle: 'medium', timeStyle: 'short' }).format(at) : null;
  return <div data-application-delivery>
    <p>{t('hrWorkflow.delivery')}: {t(`hrWorkflow.deliveryState.${delivery.state}`)}</p>
    {delivery.code && <p>{t(`hrDelivery.code.${codes.has(delivery.code) ? delivery.code : 'UNKNOWN'}`)}</p>}
    {Number.isInteger(delivery.attempts) && <p>{t('hrDelivery.attempts')}: {delivery.attempts}{delivery.priorAttempts ? ` (+${delivery.priorAttempts})` : ''}</p>}
    {formatted && <p>{t('hrDelivery.nextAttempt')}: <time dateTime={delivery.nextAttemptAt}>{formatted}</time></p>}
    {canRetry && <form onSubmit={async e => {
      e.preventDefault(); if (busy || !reason.trim() || typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) return;
      const key = context.key, controller = new AbortController(); request.current?.abort(); request.current = controller;
      setBusy(true); setError('');
      try {
        await retryApplicationDelivery(id,event.id,{ expectedRevision: revision, reason: reason.trim(), commandId: crypto.randomUUID() },controller.signal);
        if (!controller.signal.aborted && context.current.current === key) onUpdated();
      } catch (failure) {
        if (controller.signal.aborted || context.current.current !== key) return;
        const status = isAxiosError(failure) ? failure.response?.status : undefined, code = isAxiosError(failure) ? failure.response?.data?.code : undefined;
        if ([401,403,404].includes(status || 0)) { onAccessDenied(); return; }
        setError(code === 'SMTP_NOT_CONFIGURED' ? 'smtp' : status === 409 ? 'conflict' : 'failed');
      } finally { if (!controller.signal.aborted && context.current.current === key) setBusy(false); }
    }}>
      <p>{t('hrDelivery.warning')}</p>
      <label>{t('hrDelivery.reason')}<textarea aria-label={t('hrDelivery.reason')} maxLength={500} required disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} /></label>
      <button type="submit" disabled={busy || !reason.trim()}>{t(busy ? 'common.actions.loading' : 'hrDelivery.retry')}</button>
      {error && <p role="alert">{t(`hrDelivery.error.${error}`)}{error === 'conflict' && <button type="button" onClick={onUpdated}>{t('hrStates.retry')}</button>}</p>}
    </form>}
  </div>;
}
