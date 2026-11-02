import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useAuth } from '../Context/useAuth';
import { useHRActionContext } from '../Hooks/useHRActionContext';
import { hasPermission } from '../Utils/permissions';
import { retryApplicationDelivery } from '../Services/applicationsService';
import type { ApplicationEvent } from '../Types/recruitment';
const states = new Set(['pending','running','sent','failed','blocked','skipped']);
const codes = new Set(['SMTP_NOT_CONFIGURED','DELIVERY_FAILED','SEND_TIMEOUT','ATTEMPTS_EXHAUSTED','AUTH_REVOKED','PARENT_SCOPE_REVOKED','MISSING_RECIPIENT','STALE_WORKFLOW','INVALID_EVENT','DELIVERED','RETRY_QUEUED']);
export default function ApplicationDelivery({ id, event, revision, retryEligible, onUpdated, onAccessDenied }: { id: string; event: ApplicationEvent; revision?: number; retryEligible: boolean; onUpdated: () => void; onAccessDenied: () => void }) {
  const { t, i18n } = useTranslation(), { user } = useAuth(), context = useHRActionContext(id + ':' + event.id);
  const [retryRefusal, setRetryRefusal] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => () => { request.current?.abort(); }, []);
  const delivery = event.delivery;
  if (!delivery) return null;
  const knownState = states.has(delivery.state);
  const countersValid = Number.isInteger(delivery.attempts) && delivery.attempts >= 0 && delivery.attempts <= 3 &&
    Number.isInteger(delivery.retryCount ?? 0) && (delivery.retryCount ?? 0) >= 0 && (delivery.retryCount ?? 0) < 3 &&
    Number.isInteger(delivery.priorAttempts ?? 0) && (delivery.priorAttempts ?? 0) >= 0 && (delivery.priorAttempts ?? 0) <= 9;
  // A server refusal applies to this existing delivery snapshot, not a future
  // authorized refresh. No retry, polling or reload is triggered by this state.
  const retrySnapshot = JSON.stringify([context.key, revision, knownState ? delivery.state : null, delivery.attempts, delivery.retryCount, delivery.priorAttempts]);
  const retryRejected = retryRefusal === retrySnapshot;
  const canRetry = !retryRejected && retryEligible && countersValid && typeof revision === 'number' && Number.isInteger(revision) && revision >= 0 && hasPermission(user,'application','update') && hasPermission(user,'application','read') && hasPermission(user,'candidate','read') && hasPermission(user,'recruitment','read') && ['failed','blocked'].includes(delivery.state);
  const showGuidance = !knownState || delivery.state === 'skipped' || ['failed','blocked'].includes(delivery.state) && !canRetry;
  const visibleError = error === 'notRetryable' && !retryRejected ? '' : error;
  const at = delivery.nextAttemptAt ? new Date(delivery.nextAttemptAt) : null;
  const formatted = at && !Number.isNaN(at.getTime()) ? new Intl.DateTimeFormat(i18n.language,{ dateStyle: 'medium', timeStyle: 'short' }).format(at) : null;
  return <div data-application-delivery>
    <p>{t('hrWorkflow.delivery')}: {knownState ? t(`hrWorkflow.deliveryState.${delivery.state}`) : t('hrDelivery.unknownState')}</p>
    {delivery.code && <p>{t(`hrDelivery.code.${codes.has(delivery.code) ? delivery.code : 'UNKNOWN'}`)}</p>}
    {Number.isInteger(delivery.attempts) && delivery.attempts >= 0 && <p>{t('hrDelivery.attempts')}: {delivery.attempts}{Number.isInteger(delivery.priorAttempts) && (delivery.priorAttempts ?? 0) > 0 ? ` (+${delivery.priorAttempts})` : ''}</p>}
    {formatted && <p>{t('hrDelivery.nextAttempt')}: <time dateTime={delivery.nextAttemptAt}>{formatted}</time></p>}
    {showGuidance && <div role="note" data-delivery-guidance>
      {delivery.state === 'skipped' && delivery.code === 'PARENT_SCOPE_REVOKED' && <p>{t('hrDelivery.escalation.parentScope')}</p>}
      <p>{t(knownState ? 'hrDelivery.escalation.noRetry' : 'hrDelivery.escalation.incomplete')}</p>
      <p>{t('hrDelivery.escalation.admin')}</p>
    </div>}
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
        if (code === 'DELIVERY_NOT_RETRYABLE') { setRetryRefusal(retrySnapshot); setError('notRetryable'); return; }
        setError(code === 'SMTP_NOT_CONFIGURED' ? 'smtp' : status === 409 ? 'conflict' : 'failed');
      } finally { if (!controller.signal.aborted && context.current.current === key) setBusy(false); }
    }}>
      <p>{t('hrDelivery.warning')}</p>
      <label>{t('hrDelivery.reason')}<textarea aria-label={t('hrDelivery.reason')} maxLength={500} required disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} /></label>
      <button type="submit" disabled={busy || !reason.trim()}>{t(busy ? 'common.actions.loading' : 'hrDelivery.retry')}</button>
    </form>}
    {visibleError && <p role="alert">{t(`hrDelivery.error.${visibleError}`)}{visibleError === 'conflict' && <button type="button" onClick={onUpdated}>{t('hrStates.retry')}</button>}</p>}
  </div>;
}
