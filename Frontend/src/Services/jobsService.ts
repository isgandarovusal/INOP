import API from "../api/axios";
import { isAxiosError } from "axios";
import { readJson } from "../api/readRequest";
import type {
  Job,
  JobStatus,
  JobType,
} from "../Types/recruitment";

export interface JobInput {
  brandId?: string | null;
  branchId?: string | null;
  title?: string;
  position?: string;

  department?: string;
  location?: string;
  type?: JobType;

  description: string;

  requiredSkills: string[];
  preferredSkills?: string[];
  requiredEducation?: string[];
  requiredCertificates?: string[];
  criterionWeights?: Job["criterionWeights"];

  experienceYears?: number;
  experience?: number;

  status: JobStatus;
}

function normalizeStatus(status: JobStatus): JobStatus {
  const value = String(status || "").toLowerCase();

  if (value === "closed") return "closed";
  if (value === "draft") return "draft";

  return "open";
}

function backendStatus(status: JobStatus): "Open" | "Closed" | "Draft" {
  const value = normalizeStatus(status);

  if (value === "closed") return "Closed";
  if (value === "draft") return "Draft";

  return "Open";
}

export function normalizeJob(raw: unknown): Job {
  const data =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const title =
    typeof data.title === "string"
      ? data.title
      : typeof data.position === "string"
        ? data.position
        : "";

  const experienceYears = Number(
    data.experienceYears ?? data.experience ?? 0
  );

  const status =
    typeof data.status === "string"
      ? normalizeStatus(data.status as JobStatus)
      : "open";

  const stringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  const type: JobType =
    data.type === "Full-time" ||
    data.type === "Part-time" ||
    data.type === "Contract" ||
    data.type === "Internship"
      ? data.type
      : "Full-time";

  return {
    archivedAt: typeof data.archivedAt === "string" ? data.archivedAt : null,
    archivedBy: typeof data.archivedBy === "string" ? data.archivedBy : null,
    revision: typeof data.__v === "number" ? data.__v : undefined,
    id:
      typeof data.id === "string"
        ? data.id
        : typeof data._id === "string"
          ? data._id
          : "",
    _id: typeof data._id === "string" ? data._id : undefined,

    title,
    position: title,
    brandId: typeof data.brandId === "string" ? data.brandId : null,
    branchId: typeof data.branchId === "string" ? data.branchId : null,
    brandName: typeof data.brandName === "string" ? data.brandName : null,
    branchName: typeof data.branchName === "string" ? data.branchName : null,

    department:
      typeof data.department === "string"
        ? data.department
        : "",
    departmentId:
      typeof data.departmentId === "string"
        ? data.departmentId
        : undefined,

    location:
      typeof data.location === "string"
        ? data.location
        : "Remote",

    type,

    description:
      typeof data.description === "string"
        ? data.description
        : "",

    requiredSkills: stringArray(data.requiredSkills),
    requiredSkillsCount: typeof data.requiredSkillsCount === "number" && Number.isInteger(data.requiredSkillsCount) && data.requiredSkillsCount >= 0 ? data.requiredSkillsCount : undefined,
    preferredSkills: stringArray(data.preferredSkills),
    requiredEducation: stringArray(data.requiredEducation),
    requiredCertificates: stringArray(data.requiredCertificates),
    criterionWeights: typeof data.criterionWeights === "object" && data.criterionWeights !== null ? data.criterionWeights as Job["criterionWeights"] : {},

    experienceYears,
    experience: experienceYears,

    status,

    createdBy:
      typeof data.createdBy === "string" || data.createdBy === null
        ? data.createdBy
        : undefined,

    assignedTo:
      typeof data.assignedTo === "string" || data.assignedTo === null
        ? data.assignedTo
        : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

function toBackendPayload(input: JobInput) {
  return {
    brandId: input.brandId ?? null, branchId: input.branchId ?? null,
    title: input.title || input.position || "",
    department: input.department || "HR",
    location: input.location || "Remote",
    type: input.type || "Full-time",
    description: input.description || "",
    requiredSkills: input.requiredSkills || [],
    preferredSkills: input.preferredSkills || [],
    requiredEducation: input.requiredEducation || [],
    requiredCertificates: input.requiredCertificates || [],
    criterionWeights: input.criterionWeights || {},
    experienceYears: Number(
      input.experienceYears ?? input.experience ?? 0
    ),
    status: backendStatus(input.status),
  };
}

export async function getJobs(signal?: AbortSignal, scopeKey?: string): Promise<Job[]> {
  const data = await readJson<unknown>("/jobs", { signal, scopeKey });

  return Array.isArray(data)
    ? data.map(normalizeJob)
    : [];
}

export async function getJobById(
  id: string, signal?: AbortSignal, scopeKey?: string
): Promise<Job | null> {
  try {
    return normalizeJob(await readJson(`/jobs/${id}`, { signal, scopeKey }));
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createJob(
  input: JobInput
): Promise<Job> {
  const response = await API.post(
    "/jobs",
    toBackendPayload(input)
  );

  return normalizeJob(response.data);
}

export async function updateJob(
  id: string,
  input: Partial<JobInput>
): Promise<Job> {
  const payload: Record<string, unknown> = {};
  for (const field of ["requiredEducation", "requiredCertificates", "criterionWeights", "brandId", "branchId", "department", "location", "type", "description", "requiredSkills", "preferredSkills"] as const) {
    if (input[field] !== undefined) payload[field] = input[field];
  }
  if (input.title !== undefined || input.position !== undefined) payload.title = input.title ?? input.position;
  if (input.experienceYears !== undefined || input.experience !== undefined) payload.experienceYears = input.experienceYears ?? input.experience;
  if (input.status !== undefined) payload.status = backendStatus(input.status);
  const response = await API.put(`/jobs/${id}`, payload);

  return normalizeJob(response.data);
}

export async function deleteJob(
  id: string, signal?: AbortSignal, expectedRevision?: number
): Promise<void> {
  await API.delete(`/jobs/${id}`, {signal, data: expectedRevision === undefined ? undefined : {expectedRevision}});
}

export async function restoreJob(id:string, expectedRevision:number, signal?:AbortSignal):Promise<void>{await API.post(`/jobs/${id}/restore`,{expectedRevision},{signal});}
export const getJobArchiveHistory=(id:string,signal?:AbortSignal,scopeKey?:string):Promise<{items:{action:"archive"|"restore";actor:string;at:string;reason:string;revision:number}[];limit:number}>=>readJson(`/jobs/${id}/archive-history`,{signal,scopeKey});
