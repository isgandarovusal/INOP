const express=require("express");

const router=express.Router();


const {
 calculateScore
}=require("../controllers/auditScore.controller");


router.post(
 "/:id/calculate",
 calculateScore
);


module.exports=router;
