const { sendEmail } = require("./email.service");
const NotificationLog = require("../models/notificationLog.model");

const NOTIFIABLE_STATUSES = new Set(["Interview", "Offered"]);

function buildStatusMessage({ candidateName, jobTitle, status }) {
  const name = candidateName || "Namizəd";
  const job = jobTitle || "vakansiya";

  if (status === "Interview") {
    return {
      subject: `INOP: ${job} üzrə müsahibə mərhələsi`,
      message:
        `Salam ${name},\n\n${job} vakansiyası üzrə müraciətiniz müsahibə mərhələsinə keçib. ` +
        "Müsahibənin vaxtı və əlavə məlumatlar HR komandası tərəfindən sizinlə paylaşılacaq.\n\nINOP HR",
    };
  }

  return {
    subject: `INOP: ${job} üzrə offer mərhələsi`,
    message:
      `Salam ${name},\n\n${job} vakansiyası üzrə müraciətiniz offer mərhələsinə keçib. ` +
      "Ətraflı məlumat üçün HR komandası sizinlə əlaqə saxlayacaq.\n\nINOP HR",
  };
}

async function writeLog(input) {
  try {
    return await NotificationLog.create(input);
  } catch (error) {
    console.error("Notification log create error:", error);
    return null;
  }
}

async function deliverCandidateStatusEmail({
  candidate,
  jobTitle,
  status,
  applicationId = null,
  departmentId = "",
  actor,
}) {
  if (!NOTIFIABLE_STATUSES.has(status)) {
    return {
      attempted: false,
      reason: "Status does not require email notification.",
    };
  }

  const recipient = String(candidate?.email || "").trim().toLowerCase();
  const content = buildStatusMessage({
    candidateName: candidate?.name,
    jobTitle: jobTitle || candidate?.role,
    status,
  });

  const logBase = {
    type: `candidate_${status.toLowerCase()}`,
    recipient,
    subject: content.subject,
    message: content.message,
    candidateId: candidate?._id || null,
    applicationId,
    departmentId: departmentId || candidate?.departmentId || "",
    createdBy: actor?.id || null,
  };

  if (!recipient) {
    await writeLog({
      ...logBase,
      status: "skipped",
      reason: "Candidate email is missing.",
    });

    return {
      attempted: false,
      reason: "Candidate email is missing.",
    };
  }

  try {
    const result = await sendEmail({
      to: recipient,
      title: content.subject,
      message: content.message,
    });

    await writeLog({
      ...logBase,
      status: result.sent ? "sent" : "skipped",
      reason: result.reason || "",
      providerMessageId: result.messageId || "",
    });

    return {
      attempted: true,
      sent: Boolean(result.sent),
      skipped: Boolean(result.skipped),
    };
  } catch (error) {
    await writeLog({
      ...logBase,
      status: "failed",
      reason: error.message || "Email delivery failed.",
    });

    console.error("Candidate notification failed:", error);

    return {
      attempted: true,
      sent: false,
      skipped: false,
      error: error.message,
    };
  }
}

async function notifyCandidateStatus({ application, actor }) {
  return deliverCandidateStatusEmail({
    candidate: application?.candidateId,
    jobTitle: application?.jobId?.title,
    status: application?.status,
    applicationId: application?._id || null,
    departmentId: application?.departmentId || "",
    actor,
  });
}

async function notifyCandidateRecordStatus({ candidate, status, actor }) {
  const mappedStatus =
    status === "interview"
      ? "Interview"
      : status === "offer"
        ? "Offered"
        : null;

  if (!mappedStatus) {
    return {
      attempted: false,
      reason: "Status does not require email notification.",
    };
  }

  return deliverCandidateStatusEmail({
    candidate,
    jobTitle: candidate?.role,
    status: mappedStatus,
    departmentId: candidate?.departmentId || "",
    actor,
  });
}

module.exports = {
  NOTIFIABLE_STATUSES,
  buildStatusMessage,
  notifyCandidateStatus,
  notifyCandidateRecordStatus,
};
