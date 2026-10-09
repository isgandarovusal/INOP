const number = (value: unknown): number | null => {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};
const percentage = (value: unknown): number | null => {
  const result = number(value);
  return result !== null && result >= 0 && result <= 100 ? result : null;
};

export const scoreCategories = ["food", "cleanliness", "staff", "service"] as const;
export function categoryScores(value: unknown): Partial<Record<typeof scoreCategories[number], number>> {
  const audit = value as { scores?: Record<string, unknown> };
  return Object.fromEntries(scoreCategories.flatMap(key => {
    const score = number(audit?.scores?.[key]);
    return score !== null && score >= 0 && score <= 10 ? [[key, score]] : [];
  }));
}

// The Audit schemas define percentages; the generic dashboard displays /10.
// Presence, rather than truthiness, distinguishes a genuine zero from missing data.
export function auditScore(value: unknown): number | null {
  const audit = value as Record<string, unknown>;
  const type = audit.auditType || audit.type;
  let score: number | null = null;
  if (type === "standard") score = percentage(audit.compliancePercentage);
  if (type === "service") score = percentage(audit.overallPercentage);
  if (type === "occupational-safety" || type === "safety") {
    score = percentage(audit.scorePercentage);
    const total = number(audit.totalScore), max = number(audit.maxScore);
    if (score === null && total !== null && max !== null && max > 0) score = percentage(total / max * 100);
  }
  if (score !== null) return score / 10;
  const categories = categoryScores(audit);
  if (scoreCategories.every(key => categories[key] !== undefined)) return scoreCategories.reduce((sum, key) => sum + categories[key]!, 0) / 4;
  // A percentage may also exist on old generic records. It is not a fallback
  // for a typed audit whose canonical score is unavailable.
  if (!type || !["standard", "service", "safety", "occupational-safety"].includes(String(type))) {
    const legacy = percentage(audit.overallPercentage);
    if (legacy !== null) return legacy / 10;
  }
  return null;
}
