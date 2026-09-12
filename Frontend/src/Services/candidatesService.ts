import API from "../api/axios";
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

function normalizeCandidate(data: any): Candidate {
  return {
    ...data,

    id: data.id || data._id || "",
    _id: data._id,

    name: data.name || "",
    role: data.role || "Unspecified",

    status: normalizeCandidateStatus(
      data.status || "applied"
    ),

    skills: Array.isArray(data.skills)
      ? data.skills
      : [],

    experience: Number(data.experience || 0),

    cvUrl: data.cvUrl || "",

    email: data.email || "",
    phone: data.phone || "",
    education: data.education || "",

    languages: Array.isArray(data.languages)
      ? data.languages
      : [],

    certificates: Array.isArray(data.certificates)
      ? data.certificates
      : [],

    departmentId: data.departmentId || "",
    createdBy: data.createdBy || null,
    assignedTo: data.assignedTo || null,
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
  } catch (error: any) {
    if (error?.response?.status === 404) {
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
  return updateCandidate(id, { status });
}

export async function deleteCandidate(
  id: string
): Promise<void> {
  await API.delete(`/candidates/${id}`);
}
