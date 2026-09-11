const router=require("express").Router();

const controller =
require("../controllers/auditTimeline.controller");


router.get(
"/:auditId",
controller.getTimeline
);


module.exports=router;
