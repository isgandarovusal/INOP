const express = require("express");

const router = express.Router();

const controller =
require("../controllers/auditNotification.controller");


router.get(
 "/",
 controller.getNotifications
);


router.post(
 "/",
 controller.createNotification
);


router.patch(
 "/:id/read",
 controller.markRead
);


module.exports = router;
