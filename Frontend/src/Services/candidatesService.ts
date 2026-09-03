import { makeCrud } from "./collection";
import { generateId } from "./storage";
import type { Candidate, CandidateFile, CandidateStatus } from "../Types/recruitment";

const crud = makeCrud<Candidate>("candidates", "Candidate", (c) => c.name);

export const getCandidates = crud.getAll;
export const getCandidateById = crud.getById;
export const deleteCandidate = crud.remove;

export interface CandidateInput {
  name: string;
  email: string;
  phone: string;
  education: string;
  experience: number;
  skills: string[];
  languages: string[];
  certificates: string[];
  cvFile?: File | null;
}

function toCandidateFile(file?: File | null): CandidateFile | null {
  if (!file) return null;
  return { name: file.name, size: file.size, blobUrl: URL.createObjectURL(file) };
}

export async function createCandidate(input: CandidateInput): Promise<Candidate> {
  const { cvFile, ...rest } = input;
  const candidate: Candidate = {
    id: generateId("cand"),
    status: "new",
    createdAt: new Date().toISOString(),
    cv: toCandidateFile(cvFile),
    ...rest,
  };
  return crud.create(candidate);
}

export interface CandidateUpdateInput extends Partial<CandidateInput> {
  status?: CandidateStatus;
}

export async function updateCandidate(
  id: string,
  patch: CandidateUpdateInput,
): Promise<Candidate | undefined> {
  const { cvFile, ...rest } = patch;
  const fieldPatch: Partial<Candidate> = { ...rest };
  if (cvFile !== undefined) {
    fieldPatch.cv = toCandidateFile(cvFile);
  }
  return crud.update(id, fieldPatch);
}
