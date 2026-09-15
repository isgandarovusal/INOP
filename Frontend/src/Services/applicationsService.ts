import API from "../api/axios";
import { isAxiosError } from "axios";
import type {
  Application,
  ApplicationStatus,
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

function normalizeApplication(raw: unknown): Application {
  const data =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const jobId =
    typeof data.jobId === "string" || typeof data.jobId === "object"
      ? data.jobId as Application["jobId"]
      : "";

  const candidateId =
    typeof data.candidateId === "string" || typeof data.candidateId === "object"
      ? data.candidateId as Application["candidateId"]
      : "";

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

    score: Number(data.score ?? 0),

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

export async function getApplications(): Promise<Application[]> {
  const response = await API.get("/applications");

  return Array.isArray(response.data)
    ? response.data.map(normalizeApplication)
    : [];
}

export async function getApplicationById(
  id: string
): Promise<Application | null> {
  try {
    const response = await API.get(
      `/applications/${id}`
    );

    return normalizeApplication(response.data);
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
  status: ApplicationStatus
): Promise<Application> {
  const response = await API.patch(
    `/applications/${id}/status`,
    {
      status: backendStatus(status),
    }
  );

  return normalizeApplication(response.data);
}

export async function deleteApplication(
  id: string
): Promise<void> {
  await API.delete(`/applications/${id}`);
}
