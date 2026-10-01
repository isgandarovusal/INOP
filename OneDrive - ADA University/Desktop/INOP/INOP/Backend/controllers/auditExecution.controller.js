const Execution = require("../models/auditExecution.model");
const { mutate } = require("../services/auditMutation.service");
const { fail } = require("../services/policy.service");
const {
  templateQuestions,
  executionScore,
} = require("../services/auditDomain.service");
exports.createExecution = async (req, res, next) => {
  try {
    const data = await mutate(
      req,
      "execution",
      "created",
      async (session, audit) => {
        if (audit.status !== "in-progress") fail("Start the audit first.", 409);
        if (
          await Execution.exists({
            auditId: audit._id,
            status: { $in: ["draft", "in-progress"] },
          }).session(session)
        )
          fail("An execution is already in progress.", 409);
        let checklist = templateQuestions(audit.templateSnapshot);
        // Snapshot pre-existing form criteria when no managed template was selected.
        if (!checklist.length)
          checklist = (
            audit.results?.length ? audit.results : audit.checks || []
          ).map((c, i) => ({
            id: c.checkId || String(i),
            question: c.label || c.checkId || "Check " + (i + 1),
            answerType:
              audit.auditType === "standard"
                ? "severity"
                : audit.auditType === "occupational-safety"
                  ? "score"
                  : "yes-no-na",
            required: true,
          }));
        if (!checklist.length && audit.scores)
          checklist = ["food", "cleanliness", "staff", "service"].map((id) => ({
            id,
            question: id + " (0–5)",
            answerType: "score",
            required: true,
          }));
        if (!checklist.length)
          fail("Add a checklist or active template before execution.", 400);
        return (
          await Execution.create(
            [
              {
                auditId: audit._id,
                checklistId: audit.templateId || undefined,
                templateVersion: audit.templateSnapshot?.version || "form-v1",
                checklist,
                createdBy: req.user.id,
                status: "in-progress",
              },
            ],
            { session },
          )
        )[0];
      },
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
exports.getExecution = async (req, res) =>
  res.json({ success: true, data: req.auditChild });
exports.listExecutions = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Execution.find({ auditId: req.audit._id }).sort({
        createdAt: -1,
      }),
    });
  } catch (e) {
    next(e);
  }
};
exports.submitExecution = async (req, res, next) => {
  try {
    const data = await mutate(
      req,
      "execution",
      "updated",
      async (session, audit) => {
        const e = await Execution.findById(req.params.id).session(session);
        if (e.status === "completed") fail("Execution already submitted.", 409);
        const scored = executionScore(e.checklist, req.body.answers);
        Object.assign(e, scored, {
          status: "completed",
          riskLevel:
            scored.totalScore >= 90
              ? "low"
              : scored.totalScore >= 70
                ? "medium"
                : scored.totalScore >= 50
                  ? "high"
                  : "critical",
        });
        await e.save({ session });
        audit.overallPercentage = e.totalScore;
        await audit.save({ session });
        return e;
      },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
