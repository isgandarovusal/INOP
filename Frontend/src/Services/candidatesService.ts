import API from "../api/axios";
import { isAxiosError } from "axios";
import type {
  Candidate,
  CandidateStatus,
} from "../Types/recruitment";

export interface CandidateInput {
  name: string;

  role?: string;

  status?: CandidateStatus;

  email?: string;
  phone?: string;
  education?: string;

  skills?: string[];
  experience?: number;

  languages?: string[];
  certificates?: string[];

  cvFile?: File | null;
}

function normalizeCandidateStatus(
  status: CandidateStatus
): CandidateStatus {
  const value = String(status || "").toLowerCase();

  if (value === "screening") return "screening";
  if (value === "shortlisted") return "shortlisted";
  if (value === "interview") return "interview";
  if (value === "offer") return "offer";
  if (value === "hired") return "hired";
  if (value === "rejected") return "rejected";

  return "applied";
}

function normalizeCandidate(raw: unknown): Candidate {
  const data =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const stringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  return {
    id:
      typeof data.id === "string"
        ? data.id
        : typeof data._id === "string"
          ? data._id
          : "",
    _id: typeof data._id === "string" ? data._id : undefined,

    name: typeof data.name === "string" ? data.name : "",
    role: typeof data.role === "string" ? data.role : "Unspecified",

    status:
      typeof data.status === "string"
        ? normalizeCandidateStatus(data.status as CandidateStatus)
        : "applied",

    skills: stringArray(data.skills),

    experience: Number(data.experience ?? 0),

    cvUrl: typeof data.cvUrl === "string" ? data.cvUrl : "",

    email: typeof data.email === "string" ? data.email : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    education:
      typeof data.education === "string"
        ? data.education
        : "",

    languages: stringArray(data.languages),
    certificates: stringArray(data.certificates),

    departmentId:
      typeof data.departmentId === "string"
        ? data.departmentId
        : undefined,

    createdBy:
      typeof data.createdBy === "string" || data.createdBy === null
        ? data.createdBy
        : undefined,

    assignedTo:
      typeof data.assignedTo === "string" || data.assignedTo === null
        ? data.assignedTo
        : undefined,

    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : undefined,

    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : undefined,
  };
}

export async function getCandidates(): Promise<Candidate[]> {
  const response = await API.get("/candidates");

  return Array.isArray(response.data)
    ? response.data.map(normalizeCandidate)
    : [];
}

export async function getCandidateById(
  id: string
): Promise<Candidate | null> {
  try {
    const response = await API.get(
      `/candidates/${id}`
    );

    return normalizeCandidate(response.data);
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

function appendArray(
  formData: FormData,
  key: string,
  values?: string[]
) {
  if (!values) return;

  values.forEach((value) => {
    formData.append(key, value);
  });
}

export interface ParsedCvResult {
  fileName: string;
  mimeType: string;
  size: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  education: string;
  skills: string[];
  experience: number;
  languages: string[];
  certificates: string[];
  sections: Record<string, string>;
  rawText: string;
}

export async function parseCandidateCv(
  file: File
): Promise<ParsedCvResult> {
  const formData = new FormData();
  formData.append("cv", file);

  const response = await API.post(
    "/candidates/parse-cv",
    formData
  );

  return response.data;
}

export async function createCandidate(
  input: CandidateInput
): Promise<Candidate> {
  const formData = new FormData();

  formData.append("name", input.name);

  /*
   * Backend currently requires role.
   * If the old form does not have a dedicated role field,
   * use a neutral fallback until CV extraction supplies it.
   */
  formData.append(
    "role",
    input.role?.trim() || "Unspecified"
  );

  if (input.status) {
    formData.append(
      "status",
      normalizeCandidateStatus(input.status)
    );
  }

  if (input.email) {
    formData.append("email", input.email);
  }

  if (input.phone) {
    formData.append("phone", input.phone);
  }

  if (input.education) {
    formData.append(
      "education",
      input.education
    );
  }

  if (input.experience !== undefined) {
    formData.append(
      "experience",
      String(input.experience)
    );
  }

  appendArray(
    formData,
    "skills",
    input.skills
  );

  appendArray(
    formData,
    "languages",
    input.languages
  );

  appendArray(
    formData,
    "certificates",
    input.certificates
  );

  if (input.cvFile) {
    formData.append("cv", input.cvFile);
  }

  const response = await API.post(
    "/candidates",
    formData
  );

  return normalizeCandidate(response.data);
}

export async function updateCandidate(
  id: string,
  input: Partial<CandidateInput>
): Promise<Candidate> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }

  if (input.role !== undefined) {
    payload.role = input.role;
  }

  if (input.status !== undefined) {
    payload.status = normalizeCandidateStatus(
      input.status
    );
  }

  if (input.email !== undefined) {
    payload.email = input.email;
  }

  if (input.phone !== undefined) {
    payload.phone = input.phone;
  }

  if (input.education !== undefined) {
    payload.education = input.education;
  }

  if (input.skills !== undefined) {
    payload.skills = input.skills;
  }

  if (input.experience !== undefined) {
    payload.experience = input.experience;
  }

  if (input.languages !== undefined) {
    payload.languages = input.languages;
  }

  if (input.certificates !== undefined) {
    payload.certificates = input.certificates;
  }

  const response = await API.put(
    `/candidates/${id}`,
    payload
  );

  return normalizeCandidate(response.data);
}

export async function updateCandidateStatus(
  id: string,
  status: CandidateStatus
): Promise<Candidate> {
  const response = await API.patch(
    `/candidates/${id}`,
    { status }
  );

  return normalizeCandidate(response.data);
}

export async function deleteCandidate(
  id: string
): Promise<void> {
  await API.delete(`/candidates/${id}`);
}

export async function exportCandidatesExcel(): Promise<Blob> {
  const response = await API.get(
    "/candidate-export/excel",
    {
      responseType: "blob",
    }
  );

  return response.data;
}

export async function exportCandidatePdf(
  id: string
): Promise<Blob> {
  const response = await API.get(
    `/candidate-export/${id}/pdf`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}
