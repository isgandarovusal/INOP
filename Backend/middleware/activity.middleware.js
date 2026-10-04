const Log = require("../models/activityLog.model");
module.exports = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const send = res.json.bind(res);
  let recorded = false;
  res.json = function (body) {
    if (
      recorded ||
      res.statusCode >= 400 ||
      !req.user ||
      req.path.startsWith("/auth")
    )
      return send(body);
    recorded = true;
    const status = res.statusCode;
    Log.create({
      departmentId: req.user.departmentId,
      userId: req.user.id,
      userName: req.user.name,
      action: req.method.toLowerCase(),
      entityType: req.permission?.resource || "api",
      entityId: req.params.id || String(body?._id || body?.data?._id || ""),
      description: req.method + " " + req.path,
    })
      .then(() => {
        res.statusCode = status;
        send(body);
      })
      .catch((e) => {
        console.error("Activity record failed", e.message);
        res.statusCode = 503;
        send({
          success: false,
          message:
            "Operation completed, but the activity record could not be saved. Do not repeat blindly; check the record.",
        });
      });
    return res;
  };
  next();
};
