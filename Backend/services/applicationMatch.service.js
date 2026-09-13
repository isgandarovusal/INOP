function normalizeList(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function calculateSkillMatch(candidateSkills, jobSkills) {
  const candidate = normalizeList(candidateSkills);
  const required = normalizeList(jobSkills);

  if (required.length === 0) {
    return {
      score: 1,
      matched: [],
      missing: [],
    };
  }

  const matched = required.filter((requiredSkill) =>
    candidate.some(
      (candidateSkill) =>
        candidateSkill === requiredSkill
    )
  );

  const missing = required.filter(
    (requiredSkill) => !matched.includes(requiredSkill)
  );

  return {
    score: matched.length / required.length,
    matched,
    missing,
  };
}

function calculateExperienceMatch(candidateExperience, requiredExperience) {
  const candidate = Math.max(
    0,
    Number(candidateExperience) || 0
  );

  const required = Math.max(
    0,
    Number(requiredExperience) || 0
  );

  if (required === 0) {
    return {
      score: 1,
      candidate,
      required,
    };
  }

  return {
    score: Math.min(candidate / required, 1),
    candidate,
    required,
  };
}

function calculateApplicationMatch(job, candidate) {
  const requiredMatch = calculateSkillMatch(
    candidate?.skills,
    job?.requiredSkills
  );

  const preferredMatch = calculateSkillMatch(
    candidate?.skills,
    job?.preferredSkills
  );

  const experienceMatch = calculateExperienceMatch(
    candidate?.experience,
    job?.experienceYears
  );

  const hasPreferredSkills =
    Array.isArray(job?.preferredSkills) &&
    job.preferredSkills.length > 0;

  let weightedScore;
  let weights;

  if (hasPreferredSkills) {
    weights = {
      requiredSkills: 0.6,
      experience: 0.25,
      preferredSkills: 0.15,
    };

    weightedScore =
      requiredMatch.score * weights.requiredSkills +
      experienceMatch.score * weights.experience +
      preferredMatch.score * weights.preferredSkills;
  } else {
    weights = {
      requiredSkills: 0.7,
      experience: 0.3,
    };

    weightedScore =
      requiredMatch.score * weights.requiredSkills +
      experienceMatch.score * weights.experience;
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(weightedScore * 100))
  );

  return {
    score,

    breakdown: {
      requiredSkills: Math.round(
        requiredMatch.score * 100
      ),
      preferredSkills: Math.round(
        preferredMatch.score * 100
      ),
      experience: Math.round(
        experienceMatch.score * 100
      ),
    },

    matchedSkills: requiredMatch.matched,
    missingSkills: requiredMatch.missing,

    matchedPreferredSkills: preferredMatch.matched,
    missingPreferredSkills: preferredMatch.missing,

    experienceMatch:
      experienceMatch.score >= 1,

    weights,
  };
}

module.exports = {
  calculateApplicationMatch,
};
