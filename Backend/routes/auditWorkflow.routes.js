const express = require("express");

const router = express.Router();


const {
 updateAuditStatus
}=require("../controllers/auditWorkflow.controller");



router.patch(
 "/:id/status",
 updateAuditStatus
);



module.exports = router;
