// Basic candidate screening score — NOT a hiring decision, per the product
// brief. Weighted overlap of required/preferred skills, experience relative
// to the job's requirement, and education/language completeness.

import type { Candidate, Job } from "../Types/recruitment";

const WEIGHTS = {
  requiredSkills: 0.3,
  experience: 0.3,
  education: 0.15,
  languages: 0.1,
  preferredSkills: 0.15,
};

function overlapRatio(have: string[], need: string[]): number {
  if (need.length === 0) return 1;
  const haveLower = have.map((s) => s.toLowerCase().trim());
  const matched = need.filter((skill) => haveLower.includes(skill.toLowerCase().trim()));
  return matched.length / need.length;
}

export function computeCandidateScore(candidate: Candidate, job: Job): number {
  const requiredScore = overlapRatio(candidate.skills, job.requiredSkills);
  const preferredScore = overlapRatio(candidate.skills, job.preferredSkills);
  const experienceScore =
    job.experience > 0 ? Math.min(candidate.experience / job.experience, 1) : 1;
  const educationScore = candidate.education.trim() ? 1 : 0;
  const languagesScore =
    candidate.languages.length > 0 ? Math.min(candidate.languages.length / 2, 1) : 0;

  const total =
    requiredScore * WEIGHTS.requiredSkills +
    experienceScore * WEIGHTS.experience +
    educationScore * WEIGHTS.education +
    languagesScore * WEIGHTS.languages +
    preferredScore * WEIGHTS.preferredSkills;

  return Math.round(total * 100);
}
