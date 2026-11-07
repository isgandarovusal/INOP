import { useState } from 'react';
import { SectionCard } from '../../../Components/HRSection';
import { useTranslation } from 'react-i18next';
import { closeAudit, getClosure } from '../../../Services/auditClosureService';
import { useAuditAction } from '../../../Hooks/useAuditAction';
import { useAuditResource } from '../../../Hooks/useAuditResource';
import AuditResourceState from '../../../Components/AuditResourceState';

type ClosureResponse = { success: boolean; data: { finalStatus?: string } | null };

export default function AuditClosurePanel({ auditId }: { auditId: string }) {
 const { t } = useTranslation();
 const [comment, setComment] = useState('');
 const [submitted, setSubmitted] = useState(false);
 const mutation = useAuditAction(auditId, 'audit.closure', 'update');
 const closure = useAuditResource<ClosureResponse>(auditId, 'audit.closure', getClosure);
 const alreadyClosed = submitted || closure.data?.data?.finalStatus === 'completed';
 return <SectionCard><h3>{t('auditFoundation.closure')}</h3>
  {alreadyClosed ? <p role="status">{t('auditFoundation.alreadyClosed')}</p> : <>
   {mutation.allowed && <label>{t('auditFoundation.closureComment')}
    <textarea value={comment} maxLength={4000} onChange={event => setComment(event.target.value)} />
   </label>}
   <button type="button" className="btn-primary" disabled={!mutation.allowed || mutation.busy}
    onClick={() => void mutation.run(signal => closeAudit({ auditId, comment: comment.trim() }, signal), () => { setSubmitted(true); closure.reload(); })}>
    {mutation.busy ? t('auditFoundation.submitting') : t('auditFoundation.closeAudit')}
   </button>
  </>}
  {mutation.status !== 'ready' && <AuditResourceState status={mutation.status}/>}
 </SectionCard>;
}
