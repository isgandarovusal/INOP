const express =
require("express");


const router =
express.Router();


const {
getAuditDashboard
}=require(
"../controllers/auditDashboard.controller"
);



router.get(
"/",
getAuditDashboard
);



module.exports =
router;
