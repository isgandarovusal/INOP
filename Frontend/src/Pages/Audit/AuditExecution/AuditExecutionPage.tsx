import HseAuditExecution from '../HSESource/HseAuditExecution';
import StandardAuditExecution from '../StandardSource/StandardAuditExecution';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuditResourceState from '../../../Components/AuditResourceState';
import ServiceAuditExecution from '../ServiceSource/ServiceAuditExecution';
import HRAuditExecution from '../HRAudit/HRAuditExecution';
import { useAuditResource } from '../../../Hooks/useAuditResource';
import { useAuditAction } from '../../../Hooks/useAuditAction';
import { useAuth } from '../../../Context/useAuth';
import { getAuditExecution, submitAuditAnswers, type AuditExecution, type AuditExecutionAnswer } from '../../../Services/auditExecutionService';

const loadExecution = async (id: string, signal?: AbortSignal, scopeKey?: string) =>
  (await getAuditExecution(id, signal, scopeKey)).data;

function ExecutionForm({ execution, reload }: { execution: AuditExecution; reload: () => void }) {
  const {t}=useTranslation();
  const content = execution.templateSnapshot;
  const items = (content?.sections || []).filter(section => section.active !== false).flatMap(section => [
    ...(section.questions || []).filter(question => question.active !== false),
    ...(section.subsections || []).filter(subsection => subsection.active !== false).flatMap(subsection => (subsection.questions || []).filter(question => question.active !== false)),
  ]);
  const [answers, setAnswers] = useState<AuditExecutionAnswer[]>(() => [
    ...(execution.answers || []), ...items.filter(question => !(execution.answers || []).some(answer => answer.questionId === question.id)).map(question => ({ questionId: question.id, answer: '', score: 0 })),
  ]);
  const labels = Object.fromEntries(items.map(question => [question.id, question.label]));
  const templateWarning = Boolean(execution.checklistId && !content);
  const action = useAuditAction(execution._id, 'audit.execution', 'update');

  const answered = answers.filter(answer => answer.answer?.trim()).length;
  const total = answers.length;
  const progress = total ? Math.round(answered / total * 100) : 0;
  return <div className="audit-execution">
    <header className="audit-execution__header"><span className="audit-execution__eyebrow">{t("auditFoundation.execution")}</span><h1>{t("auditFoundation.execution")}</h1><p>{t("auditFoundation.executionHelp")}</p></header>
    {templateWarning && <p role="alert">{t("auditFoundation.legacyExecution")}</p>}
    <section className="audit-execution__progress"><div className="audit-execution__progress-top"><div><span className="audit-execution__progress-label">{t("auditFoundation.checklistProgress")}</span><strong>{answered} / {total}</strong></div><span className="audit-execution__progress-percent">{progress}%</span></div><div className="audit-execution__progress-track" aria-hidden="true"><div className="audit-execution__progress-fill" style={{ width: `${progress}%` }} /></div></section>
    {!total && <p role="status">{t("auditFoundation.noExecutionAnswers")}</p>}
    <section className="audit-execution__questions">{answers.map((answer, index) => <article key={answer.questionId || index} className={`audit-question ${answer.answer?.trim() ? 'audit-question--answered' : ''}`}>
      <div className="audit-question__number">{String(index + 1).padStart(2, '0')}</div><div className="audit-question__body"><h3>{labels[answer.questionId || ''] || answer.questionId || t('auditFoundation.questionNumber',{number:index+1})}</h3>
      {items.find(item=>item.id===answer.questionId)?.answerType==='yes-no-na'?<select aria-label={labels[answer.questionId||'']||answer.questionId||t('auditFoundation.answer')} value={answer.answer||''} disabled={!action.allowed||action.busy} onChange={event=>setAnswers(previous=>previous.map((item,position)=>position===index?{...item,answer:event.target.value}:item))}><option value="">{t('auditFoundation.chooseAnswer')}</option>{['yes','no','na'].map(value=><option key={value} value={value}>{t(`auditFoundation.answers.${value}`)}</option>)}</select>:<input aria-label={labels[answer.questionId || ''] || answer.questionId || t('auditFoundation.questionNumber',{number:index+1})} value={answer.answer || ''} disabled={!action.allowed || action.busy}
        onChange={event => setAnswers(previous => previous.map((item, position) => position === index ? { ...item, answer: event.target.value } : item))} placeholder={t('auditFoundation.enterAnswer')} />}</div>
    </article>)}</section>
    {action.status !== 'ready' && action.status !== 'loading' && <AuditResourceState status={action.status} />}
    <div className="audit-execution__actions"><div className="audit-execution__action-copy"><span>{t('auditFoundation.progressCount',{answered,total})}</span><small>{t('auditFoundation.status')}: {t(`auditFoundation.statusLabels.${execution.status}`,{defaultValue:execution.status})}</small></div>
      <button type="button" className="btn-primary audit-execution__submit" disabled={!action.allowed || action.busy || !total || items.some(item=>item.required!==false&&!answers.some(answer=>answer.questionId===item.id&&answer.answer?.trim()))}
        onClick={() => void action.run(signal => submitAuditAnswers(execution._id, answers, signal), reload)}>{action.busy ? t('auditFoundation.submitting') : t('auditFoundation.submit')}<span aria-hidden="true">→</span></button></div>
  </div>;
}

export default function AuditExecutionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useAuditResource(id, 'audit.execution', loadExecution, {refreshOnFocus:false});
  const key = JSON.stringify([id, user?.id, user?.role, user?.departmentId, user?.permissions]);
  if (resource.status !== 'ready' || !resource.data) return <AuditResourceState status={resource.status} retry={resource.reload} />;
  if(resource.data.templateSnapshot?.hseSource)return <HseAuditExecution key={JSON.stringify([key,resource.data.hseVersion])} execution={resource.data} reload={resource.reload}/>;
  if(resource.data.templateSnapshot?.auditType==='standard'&&resource.data.templateSnapshot.standardSource)return <StandardAuditExecution key={JSON.stringify([key,resource.data.standardVersion])} execution={resource.data} reload={resource.reload}/>;
  if(resource.data.templateSnapshot?.auditType==='service'&&resource.data.templateSnapshot.serviceSource)return <ServiceAuditExecution key={JSON.stringify([key,resource.data.serviceVersion])} execution={resource.data} reload={resource.reload}/>;
  if(resource.data.templateSnapshot?.auditType==='hr'&&resource.data.templateSnapshot.hrSource) return <HRAuditExecution key={JSON.stringify([key,resource.data.hrVersion])} execution={resource.data} reload={resource.reload}/>;
  return <ExecutionForm key={JSON.stringify([key, resource.data.updatedAt])} execution={resource.data} reload={resource.reload} />;
}
