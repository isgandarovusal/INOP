const transitions = {
  draft: ["scheduled", "in-progress", "cancelled"],
  scheduled: ["in-progress", "cancelled"],
  "in-progress": ["completed", "failed", "cancelled"],
  failed: ["in-progress", "cancelled"],
  completed: [], cancelled: [],
};
function canTransition(current, next) {
  return current === next || Boolean(transitions[current]?.includes(next));
}
function badRequest(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}
function getTemplateQuestions(template) {
  const questions = [];
  for (const section of template?.sections || []) {
    if (section.active === false) continue;
    questions.push(...(section.questions || []).filter(q => q.active !== false));
    for (const subsection of section.subsections || []) {
      if (subsection.active !== false) questions.push(...(subsection.questions || []).filter(q => q.active !== false));
    }
  }
  const ids = new Set();
  for (const question of questions) {
    if (!question.id || ids.has(question.id)) throw badRequest("Template contains ambiguous question identifiers");
    ids.add(question.id);
  }
  return questions;
}
function scoreAnswers(template, input, requireComplete = true) {
  if (!Array.isArray(input)) throw badRequest("answers must be an array");
  const questions = getTemplateQuestions(template);
  if (!questions.length) throw badRequest("The execution requires a checklist with active questions");
  const byId = new Map();
  input.forEach((item, index) => {
    if (!item || typeof item !== "object") throw badRequest("Invalid answer");
    const id = item.questionId || questions[index]?.id;
    if (!id || !questions.some(q => q.id === id) || byId.has(id)) throw badRequest("Unknown or duplicate question");
    byId.set(id, item);
  });
  let earned = 0, possible = 0;
  const answers = questions.map(question => {
    const source = byId.get(question.id) || {};
    const raw = source.value ?? source.answer ?? "";
    if (!["string", "number"].includes(typeof raw)) throw badRequest("Answer must be text or a number");
    const answer = String(raw).trim();
    if (!answer) {
      if (requireComplete && question.required !== false) throw badRequest(`Answer required: ${question.id}`);
      return { questionId: question.id, answer: "", score: 0, comment: String(source.comment || "") };
    }
    const normalized = answer.toLowerCase();
    let score = 0, maximum = 1;
    switch (question.answerType || "yes-no-na") {
      case "yes-no-na":
        if (!["yes", "no", "na", "n/a", "bəli", "xeyr"].includes(normalized)) throw badRequest(`Invalid yes/no answer: ${question.id}`);
        if (["na", "n/a"].includes(normalized)) maximum = 0;
        score = ["yes", "bəli"].includes(normalized) ? 1 : 0;
        break;
      case "severity": {
        const severity = { low: 3, medium: 2, high: 1, critical: 0 };
        if (!Object.hasOwn(severity, normalized)) throw badRequest(`Invalid severity answer: ${question.id}`);
        score = severity[normalized]; maximum = 3; break;
      }
      case "score":
        score = Number(answer); maximum = 5;
        if (!Number.isFinite(score) || score < 0 || score > maximum) throw badRequest(`Score must be between 0 and 5: ${question.id}`);
        break;
      case "text": maximum = 0; break;
      default: throw badRequest("Unsupported checklist answer type");
    }
    earned += score; possible += maximum;
    return { questionId: question.id, answer, score, comment: String(source.comment || "") };
  });
  const totalScore = possible ? Math.round(earned / possible * 10000) / 100 : 0;
  const riskLevel = totalScore >= 90 ? "low" : totalScore >= 70 ? "medium" : totalScore >= 50 ? "high" : "critical";
  return { answers, totalScore, riskLevel };
}
module.exports = { canTransition, badRequest, getTemplateQuestions, scoreAnswers };
