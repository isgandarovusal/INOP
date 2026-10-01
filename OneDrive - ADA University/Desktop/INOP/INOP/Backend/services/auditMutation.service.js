const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const Activity = require("../models/auditActivity.model");
const { fail } = require("./policy.service");
// Updating the parent serializes child changes with approval/closure, preventing TOCTOU races.
async function mutate(req, resource, action, fn) {
  let result;
  await mongoose.connection.transaction(async (session) => {
    const audit = await Audit.findOneAndUpdate(
      { _id: req.audit._id, status: { $nin: ["completed", "cancelled"] } },
      { $inc: { revision: 1 } },
      { new: true, session },
    );
    if (!audit) fail("Closed/cancelled audit is immutable.", 409);
    result = await fn(session, audit);
    await Activity.create(
      [
        {
          auditId: audit._id,
          userId: req.user.id,
          action,
          resource,
          description: resource + " " + action,
          metadata: { departmentId: req.user.departmentId },
        },
      ],
      { session },
    );
  });
  return result;
}
module.exports = { mutate };
