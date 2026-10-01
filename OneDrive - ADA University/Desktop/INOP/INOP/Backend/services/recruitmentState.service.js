const Application = require("../models/application.model");
const Candidate = require("../models/candidate.model");
async function syncCandidate(id, session) {
  const apps = await Application.find({ candidateId: id })
    .select("status")
    .session(session)
    .lean();
  const order = [
    "Applied",
    "Screening",
    "Shortlisted",
    "Interview",
    "Offered",
    "Hired",
  ];
  let status = "applied";
  if (apps.length) {
    const active = apps.filter((a) => a.status !== "Rejected");
    status = active.length
      ? order[
          Math.max(...active.map((a) => order.indexOf(a.status)))
        ].toLowerCase()
      : "rejected";
    if (status === "offered") status = "offer";
  }
  await Candidate.updateOne({ _id: id }, { $set: { status } }, { session });
}
module.exports = { syncCandidate };
