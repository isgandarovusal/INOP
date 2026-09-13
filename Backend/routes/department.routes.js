const express = require("express");

const router = express.Router();

const departmentsController = require("../controllers/departments.controller");
const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("department", "read"),
  departmentsController.getDepartments
);

router.get(
  "/:id",
  ...authorize("department", "read"),
  departmentsController.getDepartmentById
);

router.post(
  "/",
  ...authorize("department", "create"),
  departmentsController.createDepartment
);

router.put(
  "/:id",
  ...authorize("department", "update"),
  departmentsController.updateDepartment
);

router.delete(
  "/:id",
  ...authorize("department", "delete"),
  departmentsController.deleteDepartment
);

module.exports = router;
