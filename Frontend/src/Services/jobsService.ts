import { makeCrud } from "./collection";
import { generateId } from "./storage";
import type { Job, JobStatus } from "../Types/recruitment";

const crud = makeCrud<Job>("jobs", "Job", (job) => job.position);

export const getJobs = crud.getAll;
export const getJobById = crud.getById;
export const updateJob = crud.update;
export const deleteJob = crud.remove;

export interface JobInput {
  position: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experience: number;
  status: JobStatus;
}

export async function createJob(input: JobInput): Promise<Job> {
  const job: Job = {
    id: generateId("job"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  return crud.create(job);
}
