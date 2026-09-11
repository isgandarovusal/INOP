const Audit =
require("../models/audit.model");

const AuditExecution =
require("../models/auditExecution.model");

const AuditFinding =
require("../models/auditFinding.model");

const AuditApproval =
require("../models/auditApproval.model");

const AuditClosure =
require("../models/auditClosure.model");



exports.closeAudit =
async(req,res)=>{

try{


const {
 auditId,
 executionId,
 comment
}=req.body;



const audit =
await Audit.findById(
 auditId
);


if(!audit){

return res.status(404)
.json({
 success:false,
 message:"Audit not found"
});

}



const openFindings =
await AuditFinding.countDocuments({
 auditId,
 status:{
  $ne:"closed"
 }
});



if(openFindings>0){

return res.status(400)
.json({
 success:false,
 message:"Open findings exist"
});

}



const approval =
await AuditApproval.findOne({
 auditId
})
.sort({
 createdAt:-1
});



if(
 approval &&
 approval.status !== "approved"
){

return res.status(400)
.json({
 success:false,
 message:"Approval required"
});

}



const closure =
await AuditClosure.create({

 auditId,

 executionId,

 comment,

 closedBy:req.user?.id

});



audit.status =
"completed";


await audit.save();



res.json({

 success:true,

 data:closure

});


}
catch(error){

res.status(500)
.json({

success:false,

message:error.message

});

}

};




exports.getClosure =
async(req,res)=>{

try{


const data =
await AuditClosure.find({
 auditId:req.params.auditId
})
.sort({
 createdAt:-1
});


res.json({

success:true,

data

});


}
catch(error){

res.status(500)
.json({

success:false,

message:error.message

});

}

};
