const router =
require("express").Router();


const controller =
require("../controllers/auditClosure.controller");


router.post(
 "/",
 controller.closeAudit
);


router.get(
 "/:auditId",
 controller.getClosure
);


module.exports =
router;
