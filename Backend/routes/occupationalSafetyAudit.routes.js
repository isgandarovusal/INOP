const express = require("express");

const router = express.Router();


const {
 getOccupationalSafetyAudits,
 createOccupationalSafetyAudit
}=require("../controllers/occupationalSafetyAudit.controller");



router.get(
 "/",
 getOccupationalSafetyAudits
);



router.post(
 "/",
 createOccupationalSafetyAudit
);



module.exports = router;
