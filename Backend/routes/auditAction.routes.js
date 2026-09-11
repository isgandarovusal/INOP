const express =
require("express");


const router =
express.Router();


const {
createAction,
getActions,
updateActionStatus
}=require(
"../controllers/auditAction.controller"
);



router.post(
"/",
createAction
);



router.get(
"/audit/:auditId",
getActions
);



router.put(
"/:id/status",
updateActionStatus
);



module.exports =
router;
