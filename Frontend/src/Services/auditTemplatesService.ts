import type { AuditTemplate } from "../Types/Audit";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || "Sorğu zamanı xəta baş verdi."
    );
  }

  return response.json();
}

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

  return request<AuditTemplate[]>(
    `/audit-templates${suffix}`
  );
}

export function getAuditTemplate(
  id: string
): Promise<AuditTemplate> {
  return request<AuditTemplate>(`/audit-templates/${id}`);
}

export function createAuditTemplate(
  input: Partial<AuditTemplate>
): Promise<AuditTemplate> {
  return request<AuditTemplate>("/audit-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAuditTemplate(
  id: string,
  input: Partial<AuditTemplate>
): Promise<AuditTemplate> {
  return request<AuditTemplate>(`/audit-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteAuditTemplate(
  id: string
): Promise<void> {
  await request(`/audit-templates/${id}`, {
    method: "DELETE",
  });
}
