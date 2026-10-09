import type { AxiosRequestConfig } from "axios";
import api from "../api/axios";
import type { ServiceAudit } from "../Types/Audit";

async function request<T>(
  path: string,
  options?: AxiosRequestConfig
): Promise<T> {
  const response = await api.request<T>({
    ...options,
    url: path,
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
    data: audit,
  });
}

export async function updateServiceAudit(
  audit: ServiceAudit
): Promise<ServiceAudit> {
  return request<ServiceAudit>(`/audits/${audit.id}`, {
    method: "PUT",
    data: audit,
  });
}

export async function deleteServiceAudit(
  id: string
): Promise<void> {
  await request(`/audits/${id}`, {
    method: "DELETE",
  });
}
