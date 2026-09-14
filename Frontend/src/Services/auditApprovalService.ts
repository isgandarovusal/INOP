import type {
  AuditApproval,
  CreateApprovalPayload,
  UpdateApprovalPayload,
} from "../Types/Audit/approval";


const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";


interface ApprovalResponse {
  success: boolean;
  data: AuditApproval;
}


interface ApprovalsResponse {
  success: boolean;
  data: AuditApproval[];
}


interface ErrorResponse {
  message?: string;
}


async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const res = await fetch(
    `${API}${path}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    }
  );


  const data = await res.json() as T | ErrorResponse;


  if (!res.ok) {

    const errorData = data as ErrorResponse;

    throw new Error(
      errorData.message ||
      "Audit approval request failed"
    );

  }


  return data as T;

}


export function getApprovals(
  auditId: string
): Promise<ApprovalsResponse> {

  return request<ApprovalsResponse>(
    `/audit-approval/${auditId}`
  );

}


export function createApproval(
  payload: CreateApprovalPayload
): Promise<ApprovalResponse> {

  return request<ApprovalResponse>(
    "/audit-approval",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

}


export function updateApproval(
  id: string,
  payload: UpdateApprovalPayload
): Promise<ApprovalResponse> {

  return request<ApprovalResponse>(
    `/audit-approval/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

}
