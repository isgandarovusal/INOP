const express = require("express");

const router = express.Router();


const {
 updateSafetyDetails
}=require("../controllers/occupationalSafetyDetails.controller");



router.patch(
 "/:id/details",
 updateSafetyDetails
);



module.exports = router;
