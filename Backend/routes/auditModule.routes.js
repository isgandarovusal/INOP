const express = require("express");

const router = express.Router();


const {
 getStandardAudits,
 getServiceAudits,
 getAuditFilters
}
=
require("../controllers/auditModule.controller");



router.get(
 "/standard",
 getStandardAudits
);



router.get(
 "/service",
 getServiceAudits
);



router.get(
 "/filters",
 getAuditFilters
);



module.exports = router;
