import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AuditResourceState from '../../../Components/AuditResourceState';
import { useAuditResource } from '../../../Hooks/useAuditResource';
import { useAuditAction } from '../../../Hooks/useAuditAction';
import { useAuth } from '../../../Context/useAuth';
import { getAuditExecution, submitAuditAnswers, type AuditExecution, type AuditExecutionAnswer } from '../../../Services/auditExecutionService';

const loadExecution = async (id: string, signal?: AbortSignal, scopeKey?: string) =>
  (await getAuditExecution(id, signal, scopeKey)).data;

function ExecutionForm({ execution, reload }: { execution: AuditExecution; reload: () => void }) {
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
    <header className="audit-execution__header"><span className="audit-execution__eyebrow">AUDIT EXECUTION</span><h1>Audit Execution</h1><p>Complete each checklist item before submitting the audit.</p></header>
    {templateWarning && <p role="alert">Legacy execution has no immutable template snapshot. Stored answers remain available.</p>}
    <section className="audit-execution__progress"><div className="audit-execution__progress-top"><div><span className="audit-execution__progress-label">CHECKLIST PROGRESS</span><strong>{answered} / {total}</strong></div><span className="audit-execution__progress-percent">{progress}%</span></div><div className="audit-execution__progress-track" aria-hidden="true"><div className="audit-execution__progress-fill" style={{ width: `${progress}%` }} /></div></section>
    {!total && <p role="status">No checklist answers are available for this execution.</p>}
    <section className="audit-execution__questions">{answers.map((answer, index) => <article key={answer.questionId || index} className={`audit-question ${answer.answer?.trim() ? 'audit-question--answered' : ''}`}>
      <div className="audit-question__number">{String(index + 1).padStart(2, '0')}</div><div className="audit-question__body"><h3>{labels[answer.questionId || ''] || answer.questionId || `Question ${index + 1}`}</h3>
      <input aria-label={labels[answer.questionId || ''] || answer.questionId || `Question ${index + 1}`} value={answer.answer || ''} disabled={!action.allowed || action.busy}
        onChange={event => setAnswers(previous => previous.map((item, position) => position === index ? { ...item, answer: event.target.value } : item))} placeholder="Enter your answer" /></div>
    </article>)}</section>
    {action.status !== 'ready' && action.status !== 'loading' && <AuditResourceState status={action.status} />}
    <div className="audit-execution__actions"><div className="audit-execution__action-copy"><span>{answered} of {total} completed</span><small>Status: {execution.status}</small></div>
      <button type="button" className="btn-primary audit-execution__submit" disabled={!action.allowed || action.busy || !total}
        onClick={() => void action.run(signal => submitAuditAnswers(execution._id, answers, signal), reload)}>{action.busy ? 'Submitting…' : 'Submit Audit'}<span aria-hidden="true">→</span></button></div>
  </div>;
}

export default function AuditExecutionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useAuditResource(id, 'audit.execution', loadExecution);
  const key = JSON.stringify([id, user?.id, user?.role, user?.departmentId, user?.permissions]);
  if (resource.status !== 'ready' || !resource.data) return <AuditResourceState status={resource.status} retry={resource.reload} />;
  return <ExecutionForm key={JSON.stringify([key, resource.data.updatedAt])} execution={resource.data} reload={resource.reload} />;
}
