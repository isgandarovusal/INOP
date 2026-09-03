export type JobStatus = "open" | "closed" | "draft";

export interface Job {
  id: string;
  position: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experience: number;
  status: JobStatus;
  createdAt: string;
}

export type CandidateStatus =
  | "new"
  | "screening"
  | "shortlisted"
  | "rejected"
  | "hired";

export interface CandidateFile {
  name: string;
  size: number;
  blobUrl: string | null;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  education: string;
  experience: number;
  skills: string[];
  languages: string[];
  certificates: string[];
  status: CandidateStatus;
  cv: CandidateFile | null;
  createdAt: string;
}

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "shortlisted"
  | "rejected"
  | "hired";

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  score: number;
  appliedAt: string;
}
