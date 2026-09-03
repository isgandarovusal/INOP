import { makeCrud } from "./collection";
import { generateId, getCollection } from "./storage";
import type { Application, ApplicationStatus, Job, Candidate } from "../Types/recruitment";
import { computeCandidateScore } from "./rankingService";

function describeApplication(app: Application): string {
  const jobs = getCollection<Job>("jobs");
  const candidates = getCollection<Candidate>("candidates");
  const job = jobs.find((j) => j.id === app.jobId);
  const candidate = candidates.find((c) => c.id === app.candidateId);
  return `${candidate?.name ?? "Candidate"} → ${job?.position ?? "Job"}`;
}

const crud = makeCrud<Application>("applications", "Application", describeApplication);

export const getApplications = crud.getAll;
export const getApplicationById = crud.getById;
export const deleteApplication = crud.remove;

export interface ApplicationInput {
  jobId: string;
  candidateId: string;
}

export async function createApplication(input: ApplicationInput): Promise<Application> {
  const jobs = getCollection<Job>("jobs");
  const candidates = getCollection<Candidate>("candidates");
  const job = jobs.find((j) => j.id === input.jobId);
  const candidate = candidates.find((c) => c.id === input.candidateId);
  const score = job && candidate ? computeCandidateScore(candidate, job) : 0;

  const application: Application = {
    id: generateId("app"),
    status: "applied",
    score,
    appliedAt: new Date().toISOString(),
    ...input,
  };
  return crud.create(application);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<Application | undefined> {
  return crud.update(id, { status });
}
