const express=require("express");

const router=express.Router();

const {
createExecution,
getExecution,
submitExecution
}=require(
"../controllers/auditExecution.controller"
);



router.post(
"/",
createExecution
);


router.get(
"/:id",
getExecution
);


router.put(
"/:id/submit",
submitExecution
);



module.exports=router;
