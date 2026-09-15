import API from "../api/axios";
import { isAxiosError } from "axios";
import type {
  Job,
  JobStatus,
  JobType,
} from "../Types/recruitment";

export interface JobInput {
  title?: string;
  position?: string;

  department?: string;
  location?: string;
  type?: JobType;

  description: string;

  requiredSkills: string[];
  preferredSkills?: string[];

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

function normalizeJob(raw: unknown): Job {
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
    id:
      typeof data.id === "string"
        ? data.id
        : typeof data._id === "string"
          ? data._id
          : "",
    _id: typeof data._id === "string" ? data._id : undefined,

    title,
    position: title,

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
    preferredSkills: stringArray(data.preferredSkills),

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
  };
}

function toBackendPayload(input: JobInput) {
  return {
    title: input.title || input.position || "",
    department: input.department || "HR",
    location: input.location || "Remote",
    type: input.type || "Full-time",
    description: input.description || "",
    requiredSkills: input.requiredSkills || [],
    preferredSkills: input.preferredSkills || [],
    experienceYears: Number(
      input.experienceYears ?? input.experience ?? 0
    ),
    status: backendStatus(input.status),
  };
}

export async function getJobs(): Promise<Job[]> {
  const response = await API.get("/jobs");

  return Array.isArray(response.data)
    ? response.data.map(normalizeJob)
    : [];
}

export async function getJobById(
  id: string
): Promise<Job | null> {
  try {
    const response = await API.get(`/jobs/${id}`);
    return normalizeJob(response.data);
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
  const response = await API.put(
    `/jobs/${id}`,
    toBackendPayload({
      description: input.description || "",
      requiredSkills: input.requiredSkills || [],
      ...input,
      status: input.status || "open",
    })
  );

  return normalizeJob(response.data);
}

export async function deleteJob(
  id: string
): Promise<void> {
  await API.delete(`/jobs/${id}`);
}
