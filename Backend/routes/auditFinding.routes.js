const router=require("express").Router();

const controller =
require("../controllers/auditFinding.controller");


router.get(
"/:auditId",
controller.getFindings
);


router.post(
"/",
controller.createFinding
);


module.exports=router;
