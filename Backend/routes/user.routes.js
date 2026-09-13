const express = require("express");

const router = express.Router();

const usersController = require("../controllers/users.controller");
const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("user", "read"),
  usersController.getUsers
);

router.get(
  "/:id",
  ...authorize("user", "read"),
  usersController.getUserById
);

router.post(
  "/",
  ...authorize("user", "create"),
  usersController.createUser
);

router.put(
  "/:id",
  ...authorize("user", "update"),
  usersController.updateUser
);

router.patch(
  "/:id/status",
  ...authorize("user", "update"),
  usersController.updateUserStatus
);

router.delete(
  "/:id",
  ...authorize("user", "delete"),
  usersController.deleteUser
);

module.exports = router;
