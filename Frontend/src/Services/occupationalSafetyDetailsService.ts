import API from "./api";

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
  const response = await API.get(`/occupational-safety-audits/${auditId}/details`);
  return response.data.data;
}

export async function updateSafetyDetails(
  auditId: string,
  details: SafetyDetails
): Promise<SafetyDetails> {
  const response = await API.patch(
    `/occupational-safety-audits/${auditId}/details`,
    details
  );

  return response.data.data;
}
