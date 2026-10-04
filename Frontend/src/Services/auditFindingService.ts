import authenticatedFetch from "../api/authenticatedFetch";
export interface AuditFinding {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
}

const API = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getFindings(
  auditId: string,
): Promise<{ data: AuditFinding[] }> {
  const res = await authenticatedFetch(`${API}/audit-findings/${auditId}`);

  return res.json();
}

export async function createFinding(data: Record<string, unknown>) {
  const res = await authenticatedFetch(`${API}/audit-findings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}
