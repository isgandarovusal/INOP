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

  const {
    photos,
    attachments,
    ...rest
  } = input;

  const payload = {
    id: `aud-${Date.now()}`,
    auditorId: "test-user",
    status: "completed",
    overallPercentage:
      (
        input.scores.cleanliness +
        input.scores.service +
        input.scores.food +
        input.scores.staff
      ) * 2.5,
    photos: toAuditFiles(photos),
    attachments: toAuditFiles(attachments),
    findings: [],
    recommendations: [],
    checks: [],
    serviceTimeObservations: [],
    ...rest,
  };

  const res = await API.post("/audits", payload);

  return res.data;
}

export async function updateAudit(
  id: string,
  input: Partial<AuditInput>
) {
  const res = await API.put(`/audits/${id}`, input);
  return res.data;
}

export async function deleteAudit(id: string) {
  await API.delete(`/audits/${id}`);
}

export function overallScore(audit: Audit): number {

  if (audit.overallPercentage && audit.overallPercentage > 0) {
    return audit.overallPercentage / 10;
  }

  return (
    audit.scores.cleanliness +
    audit.scores.service +
    audit.scores.food +
    audit.scores.staff
  ) / 4;
}
