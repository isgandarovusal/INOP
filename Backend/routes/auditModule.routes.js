const express = require("express");

const router = express.Router();

const {
 getStandardAudits,
 getServiceAudits
}=require("../controllers/auditModule.controller");


router.get(
 "/standard",
 getStandardAudits
);


router.get(
 "/service",
 getServiceAudits
);


module.exports = router;
