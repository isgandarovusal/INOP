const express = require("express");

const router = express.Router();

const rolesController = require("../controllers/roles.controller");
const { authorize } = require("../middleware/authorization.middleware");

// Roles and their permissions are global authority definitions. A scoped
// role grant cannot safely authorize mutation of one of these definitions.
function requireGlobalRoleScope(req, res, next) {
  if (req.permission?.scope !== "all") {
    return res.status(403).json({
      message: "Rol səlahiyyətlərini dəyişmək üçün all scope tələb olunur.",
    });
  }

  next();
}

router.get(
  "/",
  ...authorize("role", "read"),
  rolesController.getRoles
);

router.get(
  "/:id",
  ...authorize("role", "read"),
  rolesController.getRoleById
);

router.post(
  "/",
  ...authorize("role", "create"),
  requireGlobalRoleScope,
  rolesController.createRole
);

router.put(
  "/:id",
  ...authorize("role", "update"),
  requireGlobalRoleScope,
  rolesController.updateRole
);

router.patch(
  "/:id/status",
  ...authorize("role", "update"),
  requireGlobalRoleScope,
  rolesController.updateRoleStatus
);

router.delete(
  "/:id",
  ...authorize("role", "delete"),
  requireGlobalRoleScope,
  rolesController.deleteRole
);

module.exports = router;
