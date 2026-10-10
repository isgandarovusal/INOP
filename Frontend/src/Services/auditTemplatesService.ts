import type { AuditTemplate } from "../Types/Audit";
import api from "../api/axios";
import { readJson } from "../api/readRequest";

export async function getAuditTemplates(params?: {
  brandId?: string;
  auditType?: string;
  status?: string;
}): Promise<AuditTemplate[]> {
  const query = new URLSearchParams();

  if (params?.brandId) query.set("brandId", params.brandId);
  if (params?.auditType) query.set("auditType", params.auditType);
  if (params?.status) query.set("status", params.status);

  const suffix = query.toString() ? `?${query}` : "";

  return readJson<AuditTemplate[]>(
    `/audit-templates${suffix}`
  );
}

export function getAuditTemplate(
  id: string, signal?: AbortSignal, scopeKey?: string
): Promise<AuditTemplate> {
  return readJson<AuditTemplate>(`/audit-templates/${encodeURIComponent(id)}`, { signal, scopeKey });
}

export async function createAuditTemplate(
  input: Partial<AuditTemplate>, signal?: AbortSignal
): Promise<AuditTemplate> {
  return (await api.post<AuditTemplate>("/audit-templates", input, { signal })).data;
}

export async function updateAuditTemplate(
  id: string,
  input: Partial<AuditTemplate>, signal?: AbortSignal
): Promise<AuditTemplate> {
  return (await api.put<AuditTemplate>(`/audit-templates/${encodeURIComponent(id)}`, input, { signal })).data;
}

export async function deleteAuditTemplate(
  id: string
): Promise<void> {
  await api.delete(`/audit-templates/${encodeURIComponent(id)}`);
}
