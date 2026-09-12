import API from "../api/axios";
import type {
  Application,
  ApplicationStatus,
} from "../Types/recruitment";

function backendStatus(
  status: ApplicationStatus
): "Applied" | "Screening" | "Interview" | "Offered" | "Rejected" {
  switch (String(status).toLowerCase()) {
    case "screening":
      return "Screening";

    case "interview":
      return "Interview";

    case "offered":
    case "offer":
      return "Offered";

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

function normalizeApplication(
  data: any
): Application {
  return {
    ...data,

    id: data.id || data._id || "",
    _id: data._id,

    jobId: data.jobId,
    candidateId: data.candidateId,

    score: Number(data.score || 0),

    status: frontendStatus(
      data.status || "Applied"
    ),

    notes: data.notes || "",
    appliedAt: data.appliedAt || data.createdAt || "",
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
  } catch (error: any) {
    if (error?.response?.status === 404) {
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
