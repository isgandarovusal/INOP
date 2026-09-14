const { sendEmail } = require("./email.service");

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

async function notifyCandidateStatus({ application, actor }) {
  const status = application?.status;

  if (!NOTIFIABLE_STATUSES.has(status)) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      reason: "Status does not require email notification.",
    };
  }

  const candidate = application?.candidateId;
  const recipient = String(candidate?.email || "").trim().toLowerCase();

  if (!recipient) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      reason: "Candidate email is missing.",
    };
  }

  const content = buildStatusMessage({
    candidateName: candidate?.name,
    jobTitle: application?.jobId?.title || candidate?.role,
    status,
  });

  try {
    const result = await sendEmail({
      to: recipient,
      title: content.subject,
      message: content.message,
    });

    return {
      attempted: true,
      sent: Boolean(result.sent),
      skipped: Boolean(result.skipped),
      reason: result.reason || "",
      messageId: result.messageId || "",
      actorId: actor?.id || null,
    };
  } catch (error) {
    console.error(
      "Candidate notification failed:",
      error.message
    );

    return {
      attempted: true,
      sent: false,
      skipped: false,
      reason: error.message || "Email delivery failed.",
    };
  }
}

module.exports = {
  NOTIFIABLE_STATUSES,
  buildStatusMessage,
  notifyCandidateStatus,
};
