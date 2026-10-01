const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.CS);
  const User = require("../models/user.model"),
    Audit = require("../models/audit.model");
  await User.updateMany({ role: "hr" }, { $set: { role: "hr_manager" } });
  await User.updateMany(
    { tokenVersion: { $exists: false } },
    { $set: { tokenVersion: 0 } },
  );
  let changed = 0,
    legacyFiles = 0,
    invalid = 0;
  for await (const a of Audit.find().cursor()) {
    const set = { revision: a.revision || 0 };
    if (
      a.status === "completed" &&
      !(await require("../models/auditClosure.model").exists({
        auditId: a._id,
        approvalStatus: "approved",
      }))
    )
      set["metadata.legacyUnverified"] = true;
    if (a.auditType === "safety") set.auditType = "occupational-safety";
    if (
      !["draft", "scheduled", "in-progress", "completed", "cancelled"].includes(
        a.status,
      )
    )
      set.status = "draft";
    if (!a.departmentId) {
      const u = mongoose.isValidObjectId(a.auditorId)
        ? await User.findById(a.auditorId)
        : null;
      set.departmentId = u?.departmentId || "";
    }
    for (const f of [...(a.photos || []), ...(a.attachments || [])])
      if (f.blobUrl?.startsWith("blob:")) legacyFiles++;
    try {
      const data = { ...a.toObject(), ...set };
      set.overallPercentage =
        require("../services/auditDomain.service").calculateScore(data);
    } catch {
      invalid++;
    }
    await Audit.updateOne({ _id: a._id }, { $set: set });
    changed++;
  }
  // Existing duplicate closure records require explicit review; do not silently delete historical records.
  const Closure = require("../models/auditClosure.model");
  const duplicates = await Closure.aggregate([
    { $group: { _id: "$auditId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (duplicates.length)
    throw new Error(
      "Duplicate historical closures found. Resolve them from backup before creating the unique index.",
    );
  await Closure.createIndexes();
  const Log = require("../models/activityLog.model");
  for await (const log of Log.find({
    departmentId: { $in: ["", null] },
  }).cursor()) {
    const u = log.userId ? await User.findById(log.userId) : null;
    if (u)
      await Log.updateOne(
        { _id: log._id },
        { $set: { departmentId: u.departmentId } },
      );
  }
  console.log({
    auditsMigrated: changed,
    legacyBlobFilesNeedingReupload: legacyFiles,
    invalidScoresNeedingReview: invalid,
  });
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
