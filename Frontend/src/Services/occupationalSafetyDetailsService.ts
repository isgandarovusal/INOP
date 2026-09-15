import API_BASE_URL from "./../config/api";

export interface SafetyDetails {
  riskLevel: string;
  violations: string[];
  correctiveAction: string;
  responsiblePerson: string;
  deadline: string | null;
}

export async function getSafetyDetails(
  auditId: string
): Promise<SafetyDetails> {
  const response = await API_BASE_URL.get(`/occupational-safety-audits/${auditId}/details`);
  return response.data.data;
}

export async function updateSafetyDetails(
  auditId: string,
  details: SafetyDetails
): Promise<SafetyDetails> {
  const response = await API_BASE_URL.patch(
    `/occupational-safety-audits/${auditId}/details`,
    details
  );

  return response.data.data;
}
