import { makeCrud } from "./collection";
import { generateId, getCollection, getSession } from "./storage";
import type { Audit, AuditFile, AuditScores } from "../Types/audit";
import type { Restaurant } from "../Types/audit";

function describeAudit(audit: Audit): string {
  const restaurants = getCollection<Restaurant>("restaurants");
  const restaurant = restaurants.find((r) => r.id === audit.restaurantId);
  return `${restaurant?.name ?? "Restaurant"} (${audit.date})`;
}

const crud = makeCrud<Audit>("audits", "Audit", describeAudit);

export const getAudits = crud.getAll;
export const getAuditById = crud.getById;
export const deleteAudit = crud.remove;

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

export async function createAudit(input: AuditInput): Promise<Audit> {
  const { photos, attachments, ...rest } = input;
  const audit: Audit = {
    id: generateId("aud"),
    auditorId: getSession() ?? "unknown",
    createdAt: new Date().toISOString(),
    photos: toAuditFiles(photos),
    attachments: toAuditFiles(attachments),
    ...rest,
  };
  return crud.create(audit);
}

export function overallScore(audit: Audit): number {
  const { cleanliness, service, food, staff } = audit.scores;
  return (cleanliness + service + food + staff) / 4;
}
