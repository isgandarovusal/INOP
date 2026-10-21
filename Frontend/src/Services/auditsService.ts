import { readJson } from "../api/readRequest";
import API from "../api/axios";
import type { Audit, AuditScores } from "../Types/audit";
import { auditScore } from "../Utils/auditScore";

export interface AuditInput {
  restaurantId: string;
  auditType: string;
  date: string;
  scores: AuditScores;
  comments: string;
  photos: File[];
  attachments: File[];
}

export async function getAudits(): Promise<Audit[]> {
  const res = await API.get("/audits");
  return res.data;
}

export async function getAuditById(id: string, signal?: AbortSignal, scopeKey?: string): Promise<Audit> {
  return readJson<Audit>(`/audits/${id}`, { signal, scopeKey });
}

export async function createAudit(
  input: AuditInput
): Promise<Audit> {

  const {
    photos,
    attachments,
    ...rest
  } = input;

  const payload = { id: `aud-${crypto.randomUUID()}`, status: 'draft', photos: [], attachments: [], ...rest };

  const res = await API.post("/audits", payload);

  for (const file of [...photos, ...attachments]) {
    const form = new FormData(); form.append('file',file);
    await API.post(`/audit-evidence/${res.data._id}`,form);
  }
  return res.data;
}

export async function updateAudit(
  id: string,
  input: Partial<AuditInput>,
  signal?: AbortSignal
) {
  const res = await API.put(`/audits/${id}`, input, {signal,suppressErrorToast:true});
  return res.data;
}

export async function deleteAudit(id: string) {
  await API.delete(`/audits/${id}`);
}

export const overallScore = auditScore;
