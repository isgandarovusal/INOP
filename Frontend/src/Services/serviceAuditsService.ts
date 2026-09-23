import api from "../api/axios";
import type { ServiceAudit } from "../Types/Audit";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await api.request<T>({
    url: path,
    method: options?.method,
    data: options?.body,
  });

  return response.data;
}

export async function getServiceAudits(): Promise<ServiceAudit[]> {
  return request<ServiceAudit[]>("/audits");
}

export async function getServiceAuditById(
  id: string
): Promise<ServiceAudit | undefined> {
  return request<ServiceAudit>(`/audits/${id}`);
}

export async function getServiceAuditsByRestaurant(
  restaurantId: string
): Promise<ServiceAudit[]> {
  const audits = await getServiceAudits();

  return audits.filter(
    (audit) => audit.restaurantId === restaurantId
  );
}

export async function createServiceAudit(
  input: Omit<ServiceAudit, "id" | "auditorId" | "createdAt">
): Promise<ServiceAudit> {
  const audit = {
    ...input,
    auditType: input.type,
    id: `service-audit-${Date.now()}`,
    auditorId: "unknown",
  };

  return request<ServiceAudit>("/audits", {
    method: "POST",
    body: JSON.stringify(audit),
  });
}

export async function updateServiceAudit(
  audit: ServiceAudit
): Promise<ServiceAudit> {
  return request<ServiceAudit>(`/audits/${audit.id}`, {
    method: "PUT",
    body: JSON.stringify(audit),
  });
}

export async function deleteServiceAudit(
  id: string
): Promise<void> {
  await request(`/audits/${id}`, {
    method: "DELETE",
  });
}
