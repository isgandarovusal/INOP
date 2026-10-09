import api from "../api/axios";
import type { AuditApproval, CreateApprovalPayload, UpdateApprovalPayload } from "../Types/Audit/approval";
interface ApprovalResponse { success: boolean; data: AuditApproval; }
interface ApprovalsResponse { success: boolean; data: AuditApproval[]; }
export async function getApprovals(auditId: string, signal?: AbortSignal): Promise<ApprovalsResponse> {
  return (await api.get(`/audit-approval/${auditId}`, { signal })).data;
}
export async function createApproval(payload: CreateApprovalPayload): Promise<ApprovalResponse> {
  return (await api.post("/audit-approval", payload)).data;
}
export async function updateApproval(id: string, payload: UpdateApprovalPayload, signal?: AbortSignal): Promise<ApprovalResponse> {
  return (await api.patch(`/audit-approval/${id}`, payload, { signal })).data;
}
