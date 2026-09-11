const express=require("express");

const router=express.Router();

const {
checkAuditAccess
}=require("../controllers/auditPermission.controller");


router.get(
"/check",
checkAuditAccess
);


module.exports=router;
