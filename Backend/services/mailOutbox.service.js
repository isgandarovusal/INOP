const Outbox = require("../models/mailOutbox.model");
const { sendEmail, getSmtpConfig } = require("./email.service");
const {
  buildStatusMessage,
  NOTIFIABLE_STATUSES,
} = require("./candidateNotification.service");
async function enqueueApplication(application, candidate, job, session) {
  if (!NOTIFIABLE_STATUSES.has(application.status)) return null;
  const content = buildStatusMessage({
    candidateName: candidate.name,
    jobTitle: job.title,
    status: application.status,
  });
  return Outbox.findOneAndUpdate(
    { key: `application:${application._id}:${application.statusRevision}` },
    {
      $setOnInsert: {
        applicationId: application._id,
        to: candidate.email || "",
        title: content.subject,
        message: content.message,
        status: candidate.email ? "queued" : "blocked",
        lastError: candidate.email ? "" : "Candidate email missing",
      },
    },
    { upsert: true, new: true, session },
  );
}
async function dispatchOne() {
  if (!getSmtpConfig()) {
    await Outbox.updateMany(
      { status: "queued" },
      { $set: { status: "blocked", lastError: "SMTP not configured" } },
    );
    return;
  }
  await Outbox.updateMany(
    { status: "blocked", lastError: "SMTP not configured" },
    { $set: { status: "queued", nextAttemptAt: new Date() } },
  );
  const item = await Outbox.findOneAndUpdate(
    {
      $or: [
        {
          status: { $in: ["queued", "failed"] },
          nextAttemptAt: { $lte: new Date() },
          attempts: { $lt: 5 },
        },
        { status: "sending", leaseUntil: { $lt: new Date() } },
      ],
    },
    {
      $set: { status: "sending", leaseUntil: new Date(Date.now() + 120000) },
      $inc: { attempts: 1 },
    },
    { new: true },
  );
  if (!item) return;
  try {
    const result = await sendEmail({
      to: item.to,
      title: item.title,
      message: item.message,
      messageId: `<${item._id}@inop.local>`,
    });
    if (!result.sent) throw new Error(result.reason || "Email not sent");
    item.status = "sent";
    item.sentAt = new Date();
    item.lastError = "";
  } catch (e) {
    item.status = "failed";
    item.lastError = String(e.message).slice(0, 500);
    item.nextAttemptAt = new Date(
      Date.now() + Math.min(3600000, 60000 * 2 ** item.attempts),
    );
  }
  await item.save();
}
function startWorker() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await dispatchOne();
    } catch (e) {
      console.error("Outbox worker:", e.message);
    } finally {
      running = false;
    }
  }, 10000);
  timer.unref();
  return () => clearInterval(timer);
}
module.exports = { enqueueApplication, dispatchOne, startWorker };
