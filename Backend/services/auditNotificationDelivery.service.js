const { notifyUser } = require('./notification.service');
async function notifyUserBestEffort(input) {
  try { return await notifyUser(input); }
  catch (error) {
    console.error('Audit notification delivery failed:', error?.name || "Error");
    return { created: false, email: { sent: false, skipped: true } };
  }
}
module.exports = { notifyUserBestEffort };
