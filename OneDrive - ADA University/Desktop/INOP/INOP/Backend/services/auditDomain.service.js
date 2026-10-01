const { fail } = require("./policy.service");
const TYPES = ["service", "standard", "occupational-safety"];
const STATUSES = [
  "draft",
  "scheduled",
  "in-progress",
  "completed",
  "cancelled",
];
function bounded(value, min, max, label) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    fail(label + " is out of range.", 400);
  return value;
}
function calculateScore(audit) {
  const checks =
    Array.isArray(audit.checks) && audit.checks.length
      ? audit.checks
      : audit.checklist || [];
  if (audit.auditType === "standard" && audit.results?.length) {
    const r = audit.results;
    for (const x of r)
      if (!["compliant", "minor", "major", "critical"].includes(x.result))
        fail("Invalid standard result", 400);
    return Math.round(
      (100 * r.filter((x) => x.result === "compliant").length) / r.length,
    );
  }
  if (checks.length) {
    if (audit.auditType === "occupational-safety")
      return Math.round(
        (100 *
          checks.reduce(
            (s, c) =>
              s +
              (c.score == null ? 0 : bounded(c.score, 0, 5, "Safety score")),
            0,
          )) /
          (checks.length * 5),
      );
    const applicable = checks.filter((c) => c.answer !== "na");
    for (const c of checks)
      if (
        !["yes", "no", "na"].includes(c.answer) &&
        !["passed", "failed"].includes(c.status)
      )
        fail("Invalid checklist answer", 400);
    return applicable.length
      ? Math.round(
          (100 *
            applicable.filter(
              (c) => c.answer === "yes" || c.status === "passed",
            ).length) /
            applicable.length,
        )
      : 0;
  }
  if (audit.scores) {
    const values = ["cleanliness", "service", "food", "staff"].map((k) =>
      bounded(audit.scores[k], 0, 10, k),
    );
    return Math.round(values.reduce((a, b) => a + b, 0) * 2.5);
  }
  return 0;
}
function payload(body, previous = {}) {
  const keys = [
    "restaurantId",
    "date",
    "shift",
    "comments",
    "scores",
    "checks",
    "results",
    "categories",
    "serviceTimeObservations",
    "recommendations",
    "templateId",
    "safetyDetails",
  ];
  const out = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  out.auditType = body.auditType || body.type || previous.auditType;
  if (out.auditType === "safety") out.auditType = "occupational-safety";
  if (!TYPES.includes(out.auditType)) fail("Invalid audit type", 400);
  if (previous.auditType && previous.auditType !== out.auditType)
    fail("Audit type cannot be changed", 400);
  const merged = { ...previous, ...out };
  if (!merged.restaurantId || typeof merged.restaurantId !== "string")
    fail("Restaurant is required", 400);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(merged.date || "") ||
    !Number.isFinite(Date.parse(merged.date)) ||
    new Date(merged.date).toISOString().slice(0, 10) !== merged.date
  )
    fail("Valid date required", 400);
  for (const key of [
    "checks",
    "results",
    "categories",
    "serviceTimeObservations",
    "recommendations",
  ])
    if (
      merged[key] !== undefined &&
      (!Array.isArray(merged[key]) || merged[key].length > 1000)
    )
      fail("Invalid " + key, 400);
  out.type = out.auditType;
  out.overallPercentage = calculateScore(merged);
  if (out.auditType === "standard") {
    const r = merged.results || [];
    out.foundCritical = r.filter((x) => x.result === "critical").length;
    out.foundMajor = r.filter((x) => x.result === "major").length;
    out.foundMinor = r.filter((x) => x.result === "minor").length;
    out.foundTotal = out.foundCritical + out.foundMajor + out.foundMinor;
    out.compliancePercentage = out.overallPercentage;
    out.passed = out.foundCritical === 0 && out.overallPercentage >= 80;
  }
  if (out.auditType === "occupational-safety") {
    out.totalScore = (merged.checks || []).reduce(
      (s, c) => s + (c.score || 0),
      0,
    );
    out.maxScore = (merged.checks || []).length * 5;
    out.scorePercentage = out.overallPercentage;
  }
  return out;
}
function transition(from, to) {
  const allowed = {
    draft: ["scheduled", "in-progress", "cancelled"],
    scheduled: ["in-progress", "cancelled"],
    "in-progress": ["cancelled"],
    completed: [],
    cancelled: [],
  };
  if (!allowed[from]?.includes(to))
    fail("Invalid transition. Completion requires the closure workflow.", 409);
}
function templateQuestions(template) {
  return (template?.sections || [])
    .filter((s) => s.active !== false)
    .flatMap((s) => [
      ...(s.questions || []),
      ...(s.subsections || [])
        .filter((x) => x.active !== false)
        .flatMap((x) => x.questions || []),
    ])
    .filter((q) => q.active !== false)
    .map((q) => ({
      id: q.id,
      question: q.label,
      answerType: q.answerType,
      required: q.required !== false,
    }));
}
function executionScore(checklist, answers) {
  if (!checklist.length) fail("Execution requires a checklist.", 400);
  if (!Array.isArray(answers) || answers.length !== checklist.length)
    fail("Every checklist item must have an answer.", 400);
  let sum = 0,
    count = 0;
  const normalized = checklist.map((q, i) => {
    const raw = answers[i];
    if (raw.questionId && raw.questionId !== q.id)
      fail("Question order mismatch", 400);
    const value = String(raw.answer ?? raw.value ?? "").trim();
    let score = 0;
    if (q.required && !value) fail("Required answer missing", 400);
    if (q.answerType === "yes-no-na") {
      if (!["yes", "no", "na"].includes(value)) fail("Expected yes/no/na", 400);
      if (value !== "na") {
        score = value === "yes" ? 100 : 0;
        count++;
      }
    } else if (q.answerType === "score") {
      score = bounded(Number(value), 0, 5, "Answer") * 20;
      count++;
    } else if (q.answerType === "severity") {
      const points = { compliant: 100, minor: 75, major: 25, critical: 0 };
      if (points[value] === undefined) fail("Invalid severity", 400);
      score = points[value];
      count++;
    } else if (q.answerType !== "text") fail("Unsupported question type", 400);
    sum += score;
    return {
      questionId: q.id,
      answer: value,
      value,
      score,
      comment: String(raw.comment || "").slice(0, 5000),
    };
  });
  return {
    answers: normalized,
    totalScore: count ? Math.round(sum / count) : 0,
  };
}
module.exports = {
  TYPES,
  STATUSES,
  payload,
  calculateScore,
  transition,
  templateQuestions,
  executionScore,
};
