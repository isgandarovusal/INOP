const router = require("express").Router();

const controller =
 require("../controllers/auditApproval.controller");


router.post(
 "/",
 controller.createApproval
);


router.get(
 "/:auditId",
 controller.getApprovals
);


router.patch(
 "/:id",
 controller.updateApproval
);


module.exports = router;
