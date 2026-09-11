export type AuditSourceDocumentStatus =
  | "uploaded"
  | "processing"
  | "processed"
  | "failed";

export interface AuditSourceDocument {
  id: string;
  organizationId: string;
  brandId: string;
  auditType: "service" | "standard" | "occupational-safety";
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  status: AuditSourceDocumentStatus;
  extractedData?: unknown;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.message || "Sorğu zamanı xəta baş verdi."
    );
  }

  return response.json();
}

export async function getAuditSourceDocuments(params?: {
  brandId?: string;
  auditType?: string;
}): Promise<AuditSourceDocument[]> {
  const query = new URLSearchParams();

  if (params?.brandId) {
    query.set("brandId", params.brandId);
  }

  if (params?.auditType) {
    query.set("auditType", params.auditType);
  }

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return request<AuditSourceDocument[]>(
    `/audit-source-documents${suffix}`
  );
}

export async function uploadAuditSourceDocument(
  file: File,
  metadata: {
    organizationId?: string;
    brandId?: string;
    auditType:
      | "service"
      | "standard"
      | "occupational-safety";
    uploadedBy?: string;
  }
): Promise<AuditSourceDocument> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "organizationId",
    metadata.organizationId || ""
  );
  formData.append("brandId", metadata.brandId || "");
  formData.append("auditType", metadata.auditType);
  formData.append(
    "uploadedBy",
    metadata.uploadedBy || ""
  );

  return request<AuditSourceDocument>(
    "/audit-source-documents",
    {
      method: "POST",
      body: formData,
    }
  );
}

export async function deleteAuditSourceDocument(
  id: string
): Promise<void> {
  await request(`/audit-source-documents/${id}`, {
    method: "DELETE",
  });
}
