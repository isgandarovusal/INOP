const AuditAssignment =
require("../models/auditAssignment.model");


exports.assignAudit=async(req,res)=>{

try{


const assignment =
await AuditAssignment.create(req.body);


res.json({
 success:true,
 data:assignment
});


}catch(e){

res.status(500).json({
 success:false
});

}

};



exports.getAssignments=async(req,res)=>{

try{

const data =
await AuditAssignment.find({
 auditId:req.params.auditId
})
.populate("auditor");


res.json({
 success:true,
 data
});


}catch(e){

res.status(500).json({
 success:false
});

}

};
