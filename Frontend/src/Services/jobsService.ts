import API from "../api/axios";
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

function normalizeJob(data: any): Job {
  const title = data.title || data.position || "";
  const experienceYears = Number(
    data.experienceYears ?? data.experience ?? 0
  );

  const status = normalizeStatus(
    data.status || "open"
  );

  return {
    ...data,

    id: data.id || data._id || "",
    _id: data._id,

    title,
    position: title,

    department: data.department || "",
    departmentId: data.departmentId || "",

    location: data.location || "Remote",
    type: data.type || "Full-time",

    description: data.description || "",

    requiredSkills: Array.isArray(data.requiredSkills)
      ? data.requiredSkills
      : [],

    preferredSkills: Array.isArray(data.preferredSkills)
      ? data.preferredSkills
      : [],

    experienceYears,
    experience: experienceYears,

    status,

    createdBy: data.createdBy || null,
    assignedTo: data.assignedTo || null,
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
  } catch (error: any) {
    if (error?.response?.status === 404) {
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
