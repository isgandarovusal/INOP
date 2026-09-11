const express=require("express");

const router=express.Router();


const {
 approveAudit
}=require(
"../controllers/auditApproval.controller"
);



router.put(
"/:id/approve",
approveAudit
);



module.exports=router;
