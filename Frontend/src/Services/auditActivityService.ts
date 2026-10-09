import api from "../api/axios";

export interface AuditActivityUser {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AuditActivity {
  _id: string;
  auditId: string;
  userId?: string | null;
  action: string;
  resource: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: AuditActivityUser | null;
}

export interface AuditActivityResponse {
  success: boolean;
  count: number;
  data: AuditActivity[];
}

export const getAuditHistory = async (
  auditId: string, signal?: AbortSignal
): Promise<AuditActivityResponse> => {
  const response = await api.get<AuditActivityResponse>(
    `/audit-activity/${auditId}`, { signal }
  );

  return response.data;
};
