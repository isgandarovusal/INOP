export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: boolean;
  suggestedStatus: "applied" | "screening" | "shortlisted" | "rejected";
  aiSummary: string;
}

export interface CandidateRequirement {
  skills: string[];
  experience: number;
}

export const calculateMatchScore = (
  candidate: { skills?: string[]; experience?: number },
  target: CandidateRequirement
): MatchResult => {
  const candidateSkills = candidate.skills || [];
  const requiredSkills = target.skills || [];
  const candidateExperience = candidate.experience || 0;
  const requiredExperience = target.experience || 0;

  if (requiredSkills.length === 0) {
    return {
      score: 100,
      matchedSkills: candidateSkills,
      missingSkills: [],
      experienceMatch: true,
      suggestedStatus: "shortlisted",
      aiSummary: "Vakansiya üzrə xüsusi bacarıq tələbi qoyulmayıb.",
    };
  }

  const matchedSkills = candidateSkills.filter((skill) =>
    requiredSkills.some((req) => req.toLowerCase() === skill.toLowerCase())
  );

  const missingSkills = requiredSkills.filter(
    (req) => candidateSkills.every((s) => s.toLowerCase() !== req.toLowerCase())
  );

  const skillScore = (matchedSkills.length / requiredSkills.length) * 70;
  const expMatch = candidateExperience >= requiredExperience;
  const expScore = expMatch
    ? 30
    : Math.max(0, (candidateExperience / Math.max(1, requiredExperience)) * 30);

  const totalScore = Math.min(100, Math.round(skillScore + expScore));

  let suggestedStatus: MatchResult["suggestedStatus"] = "applied";
  if (totalScore >= 80) {
    suggestedStatus = "shortlisted";
  } else if (totalScore >= 50) {
    suggestedStatus = "screening";
  } else {
    suggestedStatus = "applied";
  }

  const aiSummary = totalScore >= 75
    ? "Tələblərə yüksək dərəcədə uyğundur. Təcrübə və əsas bacarıqlar üst-üstə düşür."
    : "Bəzi bacarıqlar çatışmır, ilkin müsahibə və ya screening tövsiyə olunur.";

  return {
    score: totalScore,
    matchedSkills,
    missingSkills,
    experienceMatch: expMatch,
    suggestedStatus,
    aiSummary,
  };
};

export const parseCVText = (text: string) => {
  const commonSkills = [
    "React", "TypeScript", "JavaScript", "Node.js", "Python",
    "SQL", "Tailwind", "CSS", "HTML", "Git", "Docker",
    "Figma", "REST API", "GraphQL", "Next.js"
  ];

  const foundSkills = commonSkills.filter((skill) =>
    new RegExp("\\b" + skill + "\\b", "i").test(text)
  );

  const expMatch = text.match(/(\d+)\s*(?:il|year|years|ililik)/i);
  const experienceYears = expMatch ? parseInt(expMatch[1], 10) : 1;

  return {
    extractedSkills: foundSkills,
    extractedExperience: experienceYears,
    rawTextLength: text.length,
  };
};
