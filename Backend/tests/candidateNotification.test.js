const test = require("node:test");
const assert = require("node:assert/strict");
const {
  NOTIFIABLE_STATUSES,
  buildStatusMessage,
} = require("../services/candidateNotification.service");

test("only interview and offered statuses require candidate email", () => {
  assert.equal(NOTIFIABLE_STATUSES.has("Interview"), true);
  assert.equal(NOTIFIABLE_STATUSES.has("Offered"), true);
  assert.equal(NOTIFIABLE_STATUSES.has("Screening"), false);
});

test("interview email includes candidate and job", () => {
  const message = buildStatusMessage({
    candidateName: "Jane",
    jobTitle: "Backend Developer",
    status: "Interview",
  });

  assert.match(message.subject, /Backend Developer/);
  assert.match(message.message, /Jane/);
});
