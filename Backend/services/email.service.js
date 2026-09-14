const nodemailer = require("nodemailer");

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || "").trim();

  if (!host || !user || !pass || !from) {
    return null;
  }

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    secure:
      String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user,
      pass,
    },
    from,
  };
}

function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildNotificationEmail({ title, message }) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  return {
    subject: title,
    text: message,
    html: `
      <!doctype html>
      <html lang="az">
        <body style="margin:0;padding:24px;background:#f5f6fa;font-family:Arial,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
            <h2 style="margin:0 0 16px;font-size:20px;">
              ${safeTitle}
            </h2>

            <div style="font-size:15px;line-height:1.6;color:#4b5563;">
              ${safeMessage}
            </div>

            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
              INOP — Internal Operations Platform
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

async function sendEmail({ to, title, message }) {
  const recipient = String(to || "").trim().toLowerCase();

  if (!recipient) {
    throw new Error("Email recipient is required.");
  }

  if (!title || !message) {
    throw new Error("Email title and message are required.");
  }

  const config = getSmtpConfig();

  if (!config) {
    return {
      sent: false,
      skipped: true,
      reason: "SMTP is not configured.",
    };
  }

  const transporter = createTransporter(config);
  const email = buildNotificationEmail({
    title,
    message,
  });

  const result = await transporter.sendMail({
    from: config.from,
    to: recipient,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return {
    sent: true,
    skipped: false,
    messageId: result.messageId,
  };
}

module.exports = {
  getSmtpConfig,
  buildNotificationEmail,
  sendEmail,
};
