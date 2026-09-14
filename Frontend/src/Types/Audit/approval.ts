export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";


export interface AuditApproval {
  _id: string;
  auditId: string;
  findingId?: string;
  actionId?: string;
  requestedBy?: string;
  reviewer?: string;
  status: ApprovalStatus;
  comment: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}


export interface CreateApprovalPayload {
  auditId: string;
  findingId?: string;
  actionId?: string;
  reviewer?: string;
  status?: ApprovalStatus;
  comment?: string;
}


export interface UpdateApprovalPayload {
  status?: ApprovalStatus;
  comment?: string;
}
