export type JobStatus =
  | "open"
  | "closed"
  | "draft";

export type JobType =
  | "Full-time"
  | "Part-time"
  | "Contract"
  | "Internship";

export interface Job {
  id: string;
  _id?: string;

  title: string;
  position: string;

  department: string;
  departmentId?: string;

  location: string;
  type: JobType;

  description: string;

  requiredSkills: string[];
  preferredSkills: string[];

  experienceYears: number;
  experience: number;

  status: JobStatus;

  createdBy?: string | null;
  assignedTo?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type CandidateStatus =
  | "new"
  | "applied"
  | "screening"
  | "shortlisted"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export interface CandidateFile {
  name: string;
  size: number;
  type?: string;
  url?: string;
}

export interface Candidate {
  id: string;
  _id?: string;

  name: string;
  role: string;

  status: CandidateStatus;

  skills: string[];
  experience: number;

  cvUrl?: string;
  cv?: CandidateFile | null;

  email?: string;
  phone?: string;
  education: string;
  languages: string[];
  certificates: string[];

  departmentId?: string;
  createdBy?: string | null;
  assignedTo?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offered"
  | "rejected"
  | "shortlisted"
  | "hired";

export interface Application {
  id: string;
  _id?: string;

  jobId: string | Job;
  candidateId: string | Candidate;

  departmentId?: string;
  createdBy?: string | null;
  assignedTo?: string | null;

  score: number;
  status: ApplicationStatus;
  notes?: string;

  appliedAt?: string;

  createdAt?: string;
  updatedAt?: string;
}
