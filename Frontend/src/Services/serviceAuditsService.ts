import API_BASE_URL from "./../config/api";
import type { ServiceAudit } from "../Types/Audit";


async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Sorğu uğursuz oldu");
  }

  return response.json();
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
