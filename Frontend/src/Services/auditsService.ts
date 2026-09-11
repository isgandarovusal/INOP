import API from "./api";
import type { Audit, AuditFile, AuditScores } from "../Types/audit";

function toAuditFiles(files: File[]): AuditFile[] {
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    blobUrl: URL.createObjectURL(file),
  }));
}

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

export async function getAuditById(id: string): Promise<Audit> {
  const res = await API.get(`/audits/${id}`);
  return res.data;
}

export async function createAudit(
  input: AuditInput
): Promise<Audit> {

  const { photos, attachments, ...rest } = input;

  const payload = {
    id: `aud-${Date.now()}`,
    auditorId: "unknown",
    photos: toAuditFiles(photos),
    attachments: toAuditFiles(attachments),
    ...rest,
  };

  const res = await API.post("/audits", payload);

  return res.data;
}

export async function deleteAudit(id: string) {
  await API.delete(`/audits/${id}`);
}

export function overallScore(audit: Audit): number {
  const {
    cleanliness,
    service,
    food,
    staff,
  } = audit.scores;

  return (
    cleanliness +
    service +
    food +
    staff
  ) / 4;
}
