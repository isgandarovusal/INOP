const express = require("express");

const router = express.Router();

const rolesController = require("../controllers/roles.controller");
const { authorize } = require("../middleware/authorization.middleware");

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
  rolesController.createRole
);

router.put(
  "/:id",
  ...authorize("role", "update"),
  rolesController.updateRole
);

router.patch(
  "/:id/status",
  ...authorize("role", "update"),
  rolesController.updateRoleStatus
);

router.delete(
  "/:id",
  ...authorize("role", "delete"),
  rolesController.deleteRole
);

module.exports = router;
