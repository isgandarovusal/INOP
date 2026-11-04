import API from "../api/axios";
import { isAxiosError } from "axios";
import { readJson } from "../api/readRequest";
import { normalizeJob } from "./jobsService";
import { normalizeCandidate } from "./candidatesService";
import type {
  Application, ApplicationHandoffContext, ApplicationActionEligibility,
  ApplicationStatus, ApplicationMatch, ApplicationInterview, ApplicationNextAction, ApplicationEvent,
} from "../Types/recruitment";

function backendStatus(
  status: ApplicationStatus
): "Applied" | "Screening" | "Shortlisted" | "Interview" | "Offered" | "Hired" | "Rejected" {
  switch (String(status).toLowerCase()) {
    case "screening":
      return "Screening";

    case "shortlisted":
      return "Shortlisted";

    case "interview":
      return "Interview";

    case "offered":
    case "offer":
      return "Offered";

    case "hired":
      return "Hired";

    case "rejected":
      return "Rejected";

    default:
      return "Applied";
  }
}

function frontendStatus(
  status: ApplicationStatus
): ApplicationStatus {
  switch (String(status).toLowerCase()) {
    case "screening":
      return "screening";

    case "interview":
      return "interview";

    case "offered":
      return "offered";

    case "rejected":
      return "rejected";

    case "shortlisted":
      return "shortlisted";

    case "hired":
      return "hired";

    default:
      return "applied";
  }
}

function handoffContext(raw: unknown, id: string, revision: number): ApplicationHandoffContext | undefined {
  if (raw === undefined) return undefined;
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const keys = (v: unknown, allowed: string[], required = allowed): v is Record<string, unknown> => object(v) && Object.keys(v).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(v, k));
  const text = (v: unknown) => typeof v === 'string' && v.length <= 500;
  const list = (v: unknown) => Array.isArray(v) && v.length <= 100 && v.every(text);
  const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const invalid = () => { throw Error('Invalid Application context.'); };
  if (!keys(raw, ['version','mode','applicationId','revision','candidate','job','score','scoreStatus','matching']) || raw.version !== 'application-context-v1' || raw.mode !== 'assigned-read-only' || raw.applicationId !== id || raw.revision !== revision || !Number.isInteger(raw.revision) || revision < 0) return invalid();
  const c = raw.candidate, j = raw.job;
  if (!keys(c, ['name','role','email','phone','skills','experience','education','languages','certificates']) || !['name','role','email','phone','education'].every(k => text(c[k])) || !['skills','languages','certificates'].every(k => list(c[k])) || c.experience !== null && !number(c.experience)) return invalid();
  if (!keys(j, ['title','department','location','type','status','brandId','requiredSkills','preferredSkills','experienceYears','requiredEducation','requiredCertificates']) || !['title','department','location','type','status'].every(k => text(j[k])) || j.brandId !== null && !text(j.brandId) || !['requiredSkills','preferredSkills','requiredEducation','requiredCertificates'].every(k => list(j[k])) || !number(j.experienceYears)) return invalid();
  if (!['pending','incomplete','calculated','stale','legacy','restricted'].includes(String(raw.scoreStatus)) || (raw.score !== null && (!number(raw.score) || raw.score > 100)) || (raw.scoreStatus === 'calculated' ? raw.score === null || raw.matching === null : raw.score !== null)) return invalid();
  const m = raw.matching;
  if (m !== null) {
    if (!keys(m, ['version','calculatedAt','dataCoverage','reason','criteria']) || m.version !== 'ats-v2' || typeof m.calculatedAt !== 'string' || !Number.isFinite(Date.parse(m.calculatedAt)) || !number(m.dataCoverage) || m.dataCoverage > 1 || m.reason !== null && !['requirements_missing','application_context_required','protected_criteria_forbidden','hr_review_required','facts_missing'].includes(String(m.reason)) || !Array.isArray(m.criteria) || m.criteria.length > 5) return invalid();
    for (const v of m.criteria) {
      if (!keys(v, ['key','known','weight','ratio','source','matched','missing','value','required'], ['key','known','weight','ratio','source']) || !['skills','preferred','experience','education','certificates'].includes(String(v.key)) || typeof v.known !== 'boolean' || !number(v.weight) || v.weight > 1 || v.ratio !== null && (!number(v.ratio) || v.ratio > 1) || !['candidate.skills','candidate.certificates','candidate.education','application.hr-review','candidate.experience:matching-role','candidate.employmentHistory:unknown','candidate.employmentHistory:dated-matching-role'].includes(String(v.source)) || ['matched','missing'].some(k => v[k] !== undefined && !list(v[k])) || ['value','required'].some(k => v[k] !== undefined && v[k] !== null && !number(v[k]))) return invalid();
    }
  } else if (raw.scoreStatus === 'calculated') return invalid();
  return raw as unknown as ApplicationHandoffContext;
}

function actionEligibility(raw: unknown, id: string, revision: number): ApplicationActionEligibility | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).length !== 5 || value.version !== 'application-actions-v1' || value.applicationId !== id || value.revision !== revision || !Number.isInteger(revision) || revision < 0 || typeof value.update !== 'boolean' || typeof value.delete !== 'boolean') return undefined;
  return { version: 'application-actions-v1', applicationId: id, revision, update: value.update, delete: value.delete };
}

export function normalizeApplication(raw: unknown): Application {
  const data =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const jobId =
    typeof data.jobId === "string" ? data.jobId
      : data.jobId && typeof data.jobId === "object" ? normalizeJob(data.jobId) : null;

  const candidateId =
    typeof data.candidateId === "string" ? data.candidateId
      : data.candidateId && typeof data.candidateId === "object" ? normalizeCandidate(data.candidateId) : null;

  const status =
    typeof data.status === "string"
      ? data.status as ApplicationStatus
      : "applied";

  const id = typeof data.id === 'string' ? data.id : typeof data._id === 'string' ? data._id : '';
  const revision = typeof data.__v === 'number' ? data.__v : 0;
  return {
    id,
    handoffContext: handoffContext(data.handoffContext, id, revision),
    actionEligibility: actionEligibility(data.actionEligibility, id, revision),
    _id: typeof data._id === "string" ? data._id : undefined,

    jobId,
    candidateId,
    assignedTo: typeof data.assignedTo === "string" ? data.assignedTo : null,

    revision: typeof data.__v === 'number' ? data.__v : 0,
    boardOrder: typeof data.boardOrder === 'string' ? data.boardOrder : undefined,
    substatus: typeof data.substatus === 'string' ? data.substatus : '',
    stageEnteredAt: typeof data.stageEnteredAt === 'string' ? data.stageEnteredAt : undefined,
    processingState: ['idle','queued','running','completed','failed','unsupported'].includes(String(data.processingState)) ? data.processingState as Application['processingState'] : 'idle',
    interview: data.interview && typeof data.interview === 'object' ? data.interview as ApplicationInterview : null,
    nextAction: data.nextAction && typeof data.nextAction === 'object' ? data.nextAction as ApplicationNextAction : null,
    score: data.scoreStatus === 'calculated' && typeof data.score === 'number' && Number.isFinite(data.score) && data.score >= 0 && data.score <= 100 ? data.score : null,
    scoreStatus: ['pending', 'incomplete', 'calculated', 'stale', 'legacy', 'restricted'].includes(String(data.scoreStatus)) ? data.scoreStatus as Application['scoreStatus'] : 'legacy',
    matching: data.matching && typeof data.matching === 'object' && 'version' in data.matching && 'criteria' in data.matching && Array.isArray(data.matching.criteria) ? data.matching as ApplicationMatch : null,

    status: frontendStatus(status),
    statusKnown: typeof data.status === "string" && ["applied", "screening", "shortlisted", "interview", "offered", "hired", "rejected"].includes(data.status.toLowerCase()),

    notes: typeof data.notes === "string" ? data.notes : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    appliedAt:
      typeof data.appliedAt === "string"
        ? data.appliedAt
        : typeof data.createdAt === "string"
          ? data.createdAt
          : undefined,
  };
}

export async function getApplications(signal?: AbortSignal, scopeKey?: string): Promise<Application[]> {
  const data = await readJson<unknown>("/applications", { signal, scopeKey });

  return Array.isArray(data)
    ? data.map(normalizeApplication)
    : [];
}

export async function getApplicationById(
  id: string, signal?: AbortSignal, scopeKey?: string
): Promise<Application | null> {
  try {
    const application = normalizeApplication(await readJson(`/applications/${id}`, { signal, scopeKey }));
    if (application.handoffContext && application.id.toLowerCase() !== id.toLowerCase()) throw Error('Invalid Application context binding.');
    return application;
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export interface ApplicationInput {
  jobId: string;
  candidateId: string;
  notes?: string;
}

export async function createApplication(
  input: ApplicationInput
): Promise<Application> {
  const response = await API.post(
    "/applications",
    input
  );

  return normalizeApplication(response.data);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus, expectedRevision?: number, placement?: ApplicationPlacement, signal?: AbortSignal
): Promise<Application> {
  const response = await API.patch(
    `/applications/${id}/status`,
    {
      status: backendStatus(status), expectedRevision, commandId: crypto.randomUUID(), ...(placement ? { placement } : {}),
    }, { signal }
  );

  return normalizeApplication(response.data);
}

export async function deleteApplication(
  id: string
): Promise<void> {
  await API.delete(`/applications/${id}`);
}

export async function recalculateApplicationMatch(id: string, input: { expectedRevision?: number; relevantExperienceYears?: number | null; reason?: string } = {}): Promise<Application> {
  return normalizeApplication((await API.post(`/applications/${id}/recalculate`, input)).data);
}

export interface ApplicationWorkflowInput {
  placement?: ApplicationPlacement;
  expectedRevision?: number; status?: ApplicationStatus; assignedTo?: string; substatus?: string; notes?: string; reason?: string; reopen?: boolean;
  interview?: { localStart?: string; startsAt?: string; timezone: string; durationMinutes: number; interviewerId: string; result: ApplicationInterview['result'] } | null;
  nextAction?: { kind: ApplicationNextAction['kind']; localDueAt?: string; dueAt?: string | null; timezone?: string; notes?: string } | null;
}
export interface ApplicationAnchor { id: string; expectedRevision: number }
export interface ApplicationPlacement { before: ApplicationAnchor | null; after: ApplicationAnchor | null }
export async function updateApplicationWorkflow(id: string, input: ApplicationWorkflowInput): Promise<Application> {
  return normalizeApplication((await API.patch(`/applications/${id}/workflow`, { ...input, ...(input.status ? { status: backendStatus(input.status) } : {}), commandId: crypto.randomUUID() })).data);
}
export async function getApplicationHistory(id: string, offset = 0, signal?: AbortSignal, scopeKey?: string) {
  return readJson<{ items: ApplicationEvent[]; total: number; hasMore: boolean }>(`/applications/${id}/history?offset=${offset}&limit=50`, { signal, scopeKey });
}
export async function getApplicationInterviewers(id: string, signal?: AbortSignal, scopeKey?: string) {
  return readJson<{ id: string; name: string }[]>(`/applications/${id}/interviewers`, { signal, scopeKey });
}

export async function retryApplicationDelivery(id: string, eventId: string, input: { expectedRevision: number; commandId: string; reason: string }, signal?: AbortSignal) {
  return (await API.post<{ revision: number; eventId: string; delivery: NonNullable<ApplicationEvent['delivery']>; replayed: boolean }>(`/applications/${id}/notifications/${eventId}/retry`, input, { signal, suppressErrorToast: true })).data;
}
