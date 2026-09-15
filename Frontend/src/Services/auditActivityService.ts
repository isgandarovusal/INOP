import API_BASE_URL from "./../config/api";
import axios from "axios";

const auditActivityApi = axios.create({
  baseURL: `${API_BASE_URL}/audit-activity`,
});

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
  auditId: string
): Promise<AuditActivityResponse> => {
  const response = await auditActivityApi.get<AuditActivityResponse>(
    `/${auditId}`
  );

  return response.data;
};
