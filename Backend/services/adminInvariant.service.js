const crypto = require("crypto");
const Role = require("../models/role.model");
const User = require("../models/user.model");

// Serialize administrator removals across backend processes without requiring
// a replica set. A lease releases a lock after a crashed process exits.
async function mutateAdminSafely(user, removesAdmin, mutate) {
  if (!removesAdmin) return mutate();
  const lockToken = crypto.randomUUID();
  const now = new Date();
  const acquired = await Role.findOneAndUpdate({
    key: "admin",
    $or: [
      { userMutationLockUntil: { $exists: false } },
      { userMutationLockUntil: { $lte: now } },
    ],
  }, { $set: { userMutationLockToken: lockToken, userMutationLockUntil: new Date(now.getTime() + 60_000) } }, { returnDocument: "after", maxTimeMS: 5000 });
  if (!acquired) {
    const error = new Error("Administrator dəyişiklikləri hazırda icra olunur. Yenidən cəhd edin.");
    error.statusCode = 409;
    throw error;
  }
  try {
    const anotherAdministrator = await User.exists({ role: "admin", isActive: true, _id: { $ne: user._id } });
    if (!anotherAdministrator) {
      const error = new Error("Son aktiv administrator silinə və ya deaktiv edilə bilməz.");
      error.statusCode = 409;
      throw error;
    }
    return await mutate();
  } finally {
    try {
      await Role.updateOne({ key: "admin", userMutationLockToken: lockToken }, {
        $unset: { userMutationLockToken: "", userMutationLockUntil: "" },
      }, { maxTimeMS: 5000 });
    } catch (error) {
      console.error("Administrator safety lock cleanup failed:", error.name);
    }
  }
}

module.exports = { mutateAdminSafely };
