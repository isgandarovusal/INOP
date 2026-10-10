import api from "../api/axios";
import { readJson } from "../api/readRequest";
export interface AuditSourceDocument {
  id: string;
  templateId?: string;
  name: string;
  originalName?: string;
  filePath?: string;
  uploadedBy?: string;
  createdAt?: string;
}
type Metadata = {
  templateId?: string; organizationId?: string; brandId?: string;
  auditType?: "service" | "standard" | "occupational-safety"; uploadedBy?: string;
};
export function getAuditSourceDocuments(templateId?: string, signal?: AbortSignal, scopeKey?: string): Promise<AuditSourceDocument[]> {
  const query = templateId ? `?${new URLSearchParams({ templateId })}` : "";
  return readJson(`/audit-source-documents${query}`, { signal, scopeKey });
}
export async function uploadAuditSourceDocument(file: File, metadata: Metadata, signal?: AbortSignal): Promise<AuditSourceDocument> {
  const form = new FormData(); form.append("file", file);
  for (const key of ["templateId", "organizationId", "brandId", "auditType", "uploadedBy"] as const) {
    if (metadata[key] !== undefined) form.append(key, metadata[key]);
  }
  // Axios/browser supplies the multipart boundary; never force a JSON Content-Type.
  return (await api.post<AuditSourceDocument>("/audit-source-documents", form, { signal })).data;
}
export async function deleteAuditSourceDocument(id: string, signal?: AbortSignal): Promise<void> {
  await api.delete(`/audit-source-documents/${encodeURIComponent(id)}`, { signal });
}
export async function getAuditSourceDocumentFile(id: string, signal?: AbortSignal): Promise<Blob> {
  return (await api.get<Blob>(`/audit-source-documents/${encodeURIComponent(id)}/file`, { responseType: "blob", signal })).data;
}
