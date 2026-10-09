import api from '../api/axios';
import { readJson } from '../api/readRequest';

export interface AuditExecutionAnswer {
  questionId?: string | null;
  answer?: string | null;
  score?: number | null;
  comment?: string | null;
}

export interface AuditExecution {
  _id: string;
  auditId: string;
  checklistId?: string;
  answers: AuditExecutionAnswer[];
  totalScore: number;
  riskLevel: string;
  status: string;
  updatedAt: string;
}

interface ExecutionResponse<T> { success: boolean; data: T }

export function getAuditExecution(id: string, signal?: AbortSignal, scopeKey?: string): Promise<ExecutionResponse<AuditExecution>> {
  return readJson(`/audit-execution/${encodeURIComponent(id)}`, { signal, scopeKey });
}

export function listAuditExecutions(auditId?: string, signal?: AbortSignal, scopeKey?: string): Promise<ExecutionResponse<AuditExecution[]>> {
  const query = auditId ? `?auditId=${encodeURIComponent(auditId)}` : '';
  return readJson(`/audit-execution${query}`, { signal, scopeKey });
}

export async function startAuditExecution(data: Record<string, unknown>, signal?: AbortSignal): Promise<ExecutionResponse<AuditExecution>> {
  return (await api.post('/audit-execution', data, { signal })).data;
}

export async function submitAuditAnswers(id: string, answers: AuditExecutionAnswer[], signal?: AbortSignal): Promise<ExecutionResponse<AuditExecution>> {
  return (await api.put(`/audit-execution/${encodeURIComponent(id)}/submit`, { answers }, { signal })).data;
}
