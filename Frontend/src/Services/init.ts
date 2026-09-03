import { isSeeded, markSeeded, setCollection } from "./storage";
import {
  seedDepartments,
  seedUsers,
  seedJobs,
  seedCandidates,
  seedApplications,
  seedRestaurants,
  seedAudits,
  seedActivityLogs,
} from "./seedData";
import { computeCandidateScore } from "./rankingService";

export function ensureSeeded(): void {
  if (isSeeded()) return;

  setCollection("departments", seedDepartments);
  setCollection("users", seedUsers);
  setCollection("jobs", seedJobs);
  setCollection("candidates", seedCandidates);

  const scoredApplications = seedApplications.map((app) => {
    const job = seedJobs.find((j) => j.id === app.jobId);
    const candidate = seedCandidates.find((c) => c.id === app.candidateId);
    const score = job && candidate ? computeCandidateScore(candidate, job) : 0;
    return { ...app, score };
  });
  setCollection("applications", scoredApplications);

  setCollection("restaurants", seedRestaurants);
  setCollection("audits", seedAudits);
  setCollection("activityLogs", seedActivityLogs);

  markSeeded();
}
