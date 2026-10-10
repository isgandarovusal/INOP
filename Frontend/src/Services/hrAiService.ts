import API from "../api/axios";

export interface JobSkillsContext {
  title: string; description: string; brandId: string | null; branchId: string | null;
  workplace: string; experienceYears: number; requiredSkills: string[]; preferredSkills: string[];
}
export interface SkillSuggestion { name: string; reason: string; confidence: number | null }
export interface JobSkillsProposal {
  version: "job-skills-v1"; status: "suggested" | "insufficient_context";
  requiredSkills: SkillSuggestion[]; preferredSkills: SkillSuggestion[]; uncertainty: string[];
  requiresApproval: true;
  provenance: { provider: string; model: string; mode: "live" | "mock_test_only"; contextHash: string };
}
function validProposal(value: unknown): value is JobSkillsProposal {
  if (!value || typeof value !== "object") return false;
  const p = value as JobSkillsProposal;
  const rows = (v: unknown): v is SkillSuggestion[] => Array.isArray(v) && v.length <= 15 && v.every(r => r && typeof r.name === "string" && r.name.trim() && r.name.length <= 100 && typeof r.reason === "string" && r.reason.trim() && r.reason.length <= 600 && (r.confidence === null || typeof r.confidence === "number" && Number.isFinite(r.confidence) && r.confidence >= 0 && r.confidence <= 1));
  return p.version === "job-skills-v1" && p.requiresApproval === true && ["suggested", "insufficient_context"].includes(p.status) && rows(p.requiredSkills) && rows(p.preferredSkills) && (p.status === "suggested" ? p.requiredSkills.length + p.preferredSkills.length > 0 : p.requiredSkills.length + p.preferredSkills.length === 0) && Array.isArray(p.uncertainty) && p.uncertainty.length <= 10 && p.uncertainty.every(s => typeof s === "string" && s.length <= 600) && Boolean(p.provenance && typeof p.provenance.provider === "string" && typeof p.provenance.model === "string" && ["live", "mock_test_only"].includes(p.provenance.mode) && /^[a-f0-9]{64}$/.test(p.provenance.contextHash));
}
export async function suggestJobSkills(context: JobSkillsContext, jobId?: string, signal?: AbortSignal): Promise<JobSkillsProposal> {
  const response = await API.post<unknown>(jobId ? `/jobs/${encodeURIComponent(jobId)}/ai-skills` : "/hr/ai/job-skills", context, { signal, suppressErrorToast: true });
  if (!validProposal(response.data)) throw Object.assign(new Error("Invalid structured AI response."), { code: "AI_INVALID_OUTPUT" });
  return response.data;
}
