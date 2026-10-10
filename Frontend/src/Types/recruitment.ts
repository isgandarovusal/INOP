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
  brandId?: string | null;
  branchId?: string | null;
  brandName?: string | null;
  branchName?: string | null;
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
  requiredSkillsCount?: number;
  preferredSkills: string[];
  requiredEducation?: string[];
  requiredCertificates?: string[];
  criterionWeights?: Partial<Record<"skills" | "preferred" | "experience" | "education" | "certificates", number>>;

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
  revision?: number;

  name: string;
  role: string;

  status: CandidateStatus;

  skills: string[];
  skillsCount?: number;
  experience: number | null;
  phoneRaw?: string;
  employmentHistory?: CvHistoryEntry[];
  educationHistory?: CvHistoryEntry[];
  certificationHistory?: CvHistoryEntry[];
  cvOriginal?: { originalName?: string; mimeType?: string; size?: number; sha256?: string };
  cvReview?: CvReview;

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

export interface CvHistoryEntry {
  raw: string;
  organization: string | null;
  title: string | null;
  start: { year: number; month: number | null } | null;
  end: { year: number; month: number | null } | null;
  ongoing: boolean;
}
export interface CvReview {
  version?: string; provider?: string; confidenceKind?: string;
  processingStatus?: "extracted" | "unsupported_ocr" | "failed";
  reviewStatus?: "pending" | "confirmed" | "corrected";
  fields?: Record<string, { source: string; evidence: string[]; confidence: number | null }>;
  warnings?: string[]; correctedFields?: string[];
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
  boardOrder?: string;

  jobId: string | Job | null;
  candidateId: string | Candidate | null;

  departmentId?: string;
  createdBy?: string | null;
  assignedTo?: string | null;

  revision?: number;
  processingState?: 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'unsupported';
  substatus?: string;
  stageEnteredAt?: string;
  interview?: ApplicationInterview | null;
  nextAction?: ApplicationNextAction | null;
  score: number | null;
  scoreStatus: "pending" | "incomplete" | "calculated" | "stale" | "legacy" | "restricted";
  matching?: ApplicationMatch | null;
  status: ApplicationStatus;
  notes?: string;

  appliedAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface MatchCriterion {
  key: string; known: boolean; weight: number; ratio: number | null; source: string;
  matched?: string[]; missing?: string[]; value?: number | null; required?: number;
}
export interface ApplicationMatch {
  summary?: boolean;
  version: string; calculatedAt: string; dataCoverage: number; reason: string | null;
  jobHash: string; candidateHash: string; criteria: MatchCriterion[];
}

export interface ApplicationInterview { startsAt: string; timezone: string; durationMinutes: number; interviewerId: string; result: 'pending' | 'passed' | 'failed' | 'no_show' | 'cancelled' }
export interface ApplicationNextAction { kind: 'review' | 'call' | 'interview' | 'offer' | 'follow_up' | 'none'; dueAt: string | null; timezone?: string | null; notes: string }
export interface ApplicationEvent { id: string; type: string; actor: string; at: string; revision: number; reason: string;
  before: Record<string, unknown> | null; after: Record<string, unknown>; delivery?: { state: string; attempts: number; lastErrorCode?: string } }
