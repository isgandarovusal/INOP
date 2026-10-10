import API from "../api/axios";
import { isAxiosError } from "axios";
import { readJson } from "../api/readRequest";
import { normalizeJob } from "./jobsService";
import { normalizeCandidate } from "./candidatesService";
import type {
  Application,
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

  return {
    id:
      typeof data.id === "string"
        ? data.id
        : typeof data._id === "string"
          ? data._id
          : "",
    _id: typeof data._id === "string" ? data._id : undefined,

    jobId,
    candidateId,
    assignedTo: typeof data.assignedTo === "string" ? data.assignedTo : null,

    revision: typeof data.__v === 'number' ? data.__v : 0,
    substatus: typeof data.substatus === 'string' ? data.substatus : '',
    stageEnteredAt: typeof data.stageEnteredAt === 'string' ? data.stageEnteredAt : undefined,
    processingState: ['idle','queued','running','completed','failed','unsupported'].includes(String(data.processingState)) ? data.processingState as Application['processingState'] : 'idle',
    interview: data.interview && typeof data.interview === 'object' ? data.interview as ApplicationInterview : null,
    nextAction: data.nextAction && typeof data.nextAction === 'object' ? data.nextAction as ApplicationNextAction : null,
    score: data.scoreStatus === 'calculated' && typeof data.score === 'number' && Number.isFinite(data.score) && data.score >= 0 && data.score <= 100 ? data.score : null,
    scoreStatus: ['pending', 'incomplete', 'calculated', 'stale', 'legacy', 'restricted'].includes(String(data.scoreStatus)) ? data.scoreStatus as Application['scoreStatus'] : 'legacy',
    matching: data.matching && typeof data.matching === 'object' && 'version' in data.matching && 'criteria' in data.matching && Array.isArray(data.matching.criteria) ? data.matching as ApplicationMatch : null,

    status: frontendStatus(status),

    notes: typeof data.notes === "string" ? data.notes : "",
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
    return normalizeApplication(await readJson(`/applications/${id}`, { signal, scopeKey }));
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
  status: ApplicationStatus, expectedRevision?: number
): Promise<Application> {
  const response = await API.patch(
    `/applications/${id}/status`,
    {
      status: backendStatus(status), expectedRevision, commandId: crypto.randomUUID(),
    }
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
  expectedRevision?: number; status?: ApplicationStatus; assignedTo?: string; substatus?: string; notes?: string; reason?: string; reopen?: boolean;
  interview?: { localStart?: string; startsAt?: string; timezone: string; durationMinutes: number; interviewerId: string; result: ApplicationInterview['result'] } | null;
  nextAction?: { kind: ApplicationNextAction['kind']; localDueAt?: string; dueAt?: string | null; timezone?: string; notes?: string } | null;
}
export async function updateApplicationWorkflow(id: string, input: ApplicationWorkflowInput): Promise<Application> {
  return normalizeApplication((await API.patch(`/applications/${id}/workflow`, { ...input, ...(input.status ? { status: backendStatus(input.status) } : {}), commandId: crypto.randomUUID() })).data);
}
export async function getApplicationHistory(id: string, offset = 0, signal?: AbortSignal, scopeKey?: string) {
  return readJson<{ items: ApplicationEvent[]; total: number; hasMore: boolean }>(`/applications/${id}/history?offset=${offset}&limit=50`, { signal, scopeKey });
}
export async function getApplicationInterviewers(id: string, signal?: AbortSignal, scopeKey?: string) {
  return readJson<{ id: string; name: string }[]>(`/applications/${id}/interviewers`, { signal, scopeKey });
}
