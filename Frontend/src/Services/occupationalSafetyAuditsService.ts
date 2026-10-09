import request from "../api/axios";
import type { OccupationalSafetyAudit } from "../Types/Audit";

const BASE = "/audits";

export async function getOccupationalSafetyAudits(): Promise<OccupationalSafetyAudit[]> {
  const { data } = await request.get(BASE);

  return (data as OccupationalSafetyAudit[]).filter(
    (audit) => {
      const auditType = (audit as OccupationalSafetyAudit & { auditType?: string }).auditType;
      return auditType === "occupational-safety" || auditType === "safety";
    }
  );
}

export async function getOccupationalSafetyAuditById(
  id: string
): Promise<OccupationalSafetyAudit | undefined> {
  const { data } = await request.get(`${BASE}/${id}`);
  return data;
}

export async function createOccupationalSafetyAudit(
  input: Omit<
    OccupationalSafetyAudit,
    "id" | "auditorId" | "createdAt"
  >
): Promise<OccupationalSafetyAudit> {
  const payload = {
    ...input,
    id: `safety-audit-${crypto.randomUUID()}`,
    auditType: "occupational-safety",
  };
  const { data } = await request.post(BASE, payload);
  return data;
}

export async function updateOccupationalSafetyAudit(
  audit: OccupationalSafetyAudit
): Promise<OccupationalSafetyAudit> {
  const { data } = await request.put(`${BASE}/${audit.id}`, audit);
  return data;
}

export async function deleteOccupationalSafetyAudit(id: string): Promise<void> {
  await request.delete(`${BASE}/${id}`);
}
