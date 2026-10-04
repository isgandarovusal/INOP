function buildScopeFilter(req) {
  const scope = req.permission?.scope;

  if (!scope) {
    return null;
  }

  if (scope === "all") {
    return {};
  }

  if (scope === "department") {
    if (!req.user?.departmentId) {
      return null;
    }

    return {
      departmentId: req.user.departmentId,
    };
  }

  if (scope === "assigned") {
    if (!req.user?.id) {
      return null;
    }

    return {
      assignedTo: req.user.id,
    };
  }

  if (scope === "own") {
    if (!req.user?.id) {
      return null;
    }

    return {
      createdBy: req.user.id,
    };
  }

  return null;
}

exports.getDataScope = (req) => {
  return buildScopeFilter(req);
};

exports.applyDataScope = (req, res, next) => {
  const scope = buildScopeFilter(req);

  if (scope === null) {
    return res.status(403).json({
      message:
        "Bu məlumatlara giriş üçün tələb olunan məlumat səviyyəsi müəyyən edilə bilmədi.",
    });
  }

  req.dataScope = scope;

  next();
};
