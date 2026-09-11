const express=require("express");

const router=express.Router();


const {
 getAuditReport
}=require("../controllers/auditReport.controller");


router.get(
 "/:id",
 getAuditReport
);


module.exports=router;
