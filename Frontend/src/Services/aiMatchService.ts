export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: boolean;
}

export const calculateMatchScore = (
  candidateSkills: string[] = [],
  requiredSkills: string[] = [],
  candidateExperience: number = 0,
  requiredExperience: number = 0
): MatchResult => {
  if (!requiredSkills.length) {
    return { score: 100, matchedSkills: [], missingSkills: [], experienceMatch: true };
  }

  // Uyğun gələn və çatışmayan bacarıqların analizi
  const matchedSkills = candidateSkills.filter((skill) =>
    requiredSkills.some((req) => req.toLowerCase() === skill.toLowerCase())
  );

  const missingSkills = requiredSkills.filter(
    (req) => !candidateSkills.some((s) => s.toLowerCase() === req.toLowerCase())
  );

  // Bacarıqların çəkisi: 70%, Təcrübənin çəkisi: 30%
  const skillScore = (matchedSkills.length / requiredSkills.length) * 70;
  const expMatch = candidateExperience >= requiredExperience;
  const expScore = expMatch
    ? 30
    : Math.max(0, (candidateExperience / Math.max(1, requiredExperience)) * 30);

  const totalScore = Math.min(100, Math.round(skillScore + expScore));

  return {
    score: totalScore,
    matchedSkills,
    missingSkills,
    experienceMatch: expMatch,
  };
};