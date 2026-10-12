import API from "../api/axios";
import { readJson } from "../api/readRequest";

export interface AIStatus {
  version: "hr-ai-status-v1"; provider: "openai" | null;
  state: "not_configured" | "configuration_required" | "configured_not_verified";
  realE2EVerified: false; cvReviewApproved: boolean;
}
export async function getAIStatus(signal: AbortSignal, scopeKey: string): Promise<AIStatus> {
  const value = await readJson<AIStatus>("/hr/ai/status", { signal, scopeKey, suppressErrorToast: true });
  if (value?.version !== "hr-ai-status-v1" || ![null, "openai"].includes(value.provider) ||
      !["not_configured", "configuration_required", "configured_not_verified"].includes(value.state) ||
      value.realE2EVerified !== false || typeof value.cvReviewApproved !== "boolean") throw new Error("Invalid AI status metadata");
  return value;
}

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

export type ProfessionalField = "skills" | "languages" | "certificates" | "education" | "role" | "experience";
export interface CvFactProposal { field: ProfessionalField; value: string; evidenceIds: string[]; reason: string; confidence: number | null }
export interface CvReviewProposal {
  version: "cv-professional-review-v1"; status: "suggested" | "insufficient_context";
  proposals: CvFactProposal[]; uncertainty: string[]; requiresApproval: true;
  provenance: JobSkillsProposal["provenance"];
  source: { sha256: string; revision: number; parserVersion: "rules-2"|"ocr-rules-1" };
  reviewScope: "professional_evidence_only";
  evidence: { id: string; field: ProfessionalField; quote: string }[];
}
const professionalFields = ["skills", "languages", "certificates", "education", "role", "experience"];
export async function suggestCvReview(id: string, hash: string, revision: number, signal?: AbortSignal): Promise<CvReviewProposal> {
  const response = await API.post<CvReviewProposal>(`/candidates/${encodeURIComponent(id)}/ai-review`, { expectedHash: hash, expectedRevision: revision }, { signal, suppressErrorToast: true });
  const p = response.data;
  if (!p || p.version !== "cv-professional-review-v1" || p.requiresApproval !== true || p.reviewScope !== "professional_evidence_only" || p.source?.sha256 !== hash || p.source?.revision !== revision || !["rules-2","ocr-rules-1"].includes(p.source.parserVersion) || !["suggested", "insufficient_context"].includes(p.status) || !Array.isArray(p.proposals) || p.proposals.length > 20 || (p.status === "suggested" ? !p.proposals.length : p.proposals.length > 0) || !Array.isArray(p.evidence) || p.evidence.length > 24 || new Set(p.evidence.map(f => f?.id)).size !== p.evidence.length || p.evidence.some(f => !f || !professionalFields.includes(f.field) || typeof f.id !== "string" || !/^e(?:[1-9]|1\d|2[0-4])$/.test(f.id) || typeof f.quote !== "string" || f.quote.length > 500) || !Array.isArray(p.uncertainty) || p.uncertainty.length > 10 || p.uncertainty.some(s => typeof s !== "string" || s.length > 500) || !p.provenance || !["live", "mock_test_only"].includes(p.provenance.mode) || typeof p.provenance.provider !== "string" || typeof p.provenance.model !== "string" || !/^[a-f0-9]{64}$/.test(p.provenance.contextHash) || p.proposals.some(row => !row || !professionalFields.includes(row.field) || typeof row.value !== "string" || !row.value.trim() || row.value.length > 200 || typeof row.reason !== "string" || row.reason.length > 500 || row.confidence !== null && (!Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) || !Array.isArray(row.evidenceIds) || !row.evidenceIds.length || row.evidenceIds.length > 5 || new Set(row.evidenceIds).size !== row.evidenceIds.length || row.evidenceIds.some(ref => !p.evidence.some(f => f.id === ref && f.field === row.field)) || row.field === "experience" && (!/^\d+(?:\.\d+)?$/.test(row.value) || Number(row.value) > 80))) throw Object.assign(new Error("Invalid professional CV review response."), { code: "AI_INVALID_OUTPUT" });
  return p;
}
