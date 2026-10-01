import API from "../api/axios";
import type { Audit, AuditScores } from "../Types/audit";

export interface AuditInput {
  restaurantId: string;
  auditType: string;
  date: string;
  scores: AuditScores;
  comments: string;
  photos: File[];
  attachments: File[];
}

export async function getAudits(page = 1): Promise<Audit[]> {
  const res = await API.get("/audits", { params: { page, limit: 100 } });
  return res.data;
}

export async function getAuditById(id: string): Promise<Audit> {
  const res = await API.get(`/audits/${id}`);
  return res.data;
}

export async function createAudit(input: AuditInput): Promise<Audit> {
  const { photos, attachments, ...rest } = input;

  const payload = {
    id: `aud-${Date.now()}`,
    status: "draft",
    overallPercentage:
      (input.scores.cleanliness +
        input.scores.service +
        input.scores.food +
        input.scores.staff) *
      2.5,
    photos: [],
    attachments: [],
    findings: [],
    recommendations: [],
    checks: [],
    serviceTimeObservations: [],
    ...rest,
  };

  const res = await API.post("/audits", payload);

  let saved = res.data as Audit;
  for (const [kind, files] of [
    ["photos", photos],
    ["attachments", attachments],
  ] as const) {
    if (!files.length) continue;
    const form = new FormData();
    form.append("kind", kind);
    files.forEach((f) => form.append("files", f));
    try {
      saved = (await API.post(`/audits/${saved.id}/evidence`, form)).data;
    } catch {
      throw new Error(
        `Draft ${saved.id} was saved, but evidence upload failed. Open that draft and retry the upload.`,
      );
    }
  }
  return saved;
}

export async function updateAudit(id: string, input: Partial<AuditInput>) {
  const { photos, attachments, ...fields } = input;
  let saved = (await API.put(`/audits/${id}`, fields)).data;
  for (const [kind, files] of [
    ["photos", photos],
    ["attachments", attachments],
  ] as const) {
    if (!files?.length) continue;
    const form = new FormData();
    form.append("kind", kind);
    files.forEach((f) => form.append("files", f));
    saved = (await API.post(`/audits/${id}/evidence`, form)).data;
  }
  return saved;
}

export async function deleteAudit(id: string) {
  await API.delete(`/audits/${id}`);
}

export function overallScore(audit: Audit): number {
  if (
    typeof audit.overallPercentage === "number" &&
    Number.isFinite(audit.overallPercentage)
  )
    return audit.overallPercentage / 10;
  const scores = Object.values(audit.scores || {}).filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}
