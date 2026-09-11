const router=require("express").Router();

const controller =
require("../controllers/auditAssignment.controller");


router.post(
"/",
controller.assignAudit
);


router.get(
"/:auditId",
controller.getAssignments
);


module.exports=router;
