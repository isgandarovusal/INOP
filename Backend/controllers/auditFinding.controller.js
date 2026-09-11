const AuditFinding=require("../models/auditFinding.model");


exports.getFindings=async(req,res)=>{

try{

const data =
await AuditFinding.find({
 auditId:req.params.auditId
})
.sort({
 createdAt:-1
});


res.json({
 success:true,
 data
});


}catch(e){

res.status(500).json({
 success:false,
 message:"Finding error"
});

}

};



exports.createFinding=async(req,res)=>{

try{


const finding =
await AuditFinding.create({
 auditId:req.body.auditId,
 executionId:req.body.executionId,
 title:req.body.title,
 description:req.body.description,
 severity:req.body.severity,
 category:req.body.category,
 dueDate:req.body.dueDate
});


res.json({
 success:true,
 data:finding
});


}catch(e){

res.status(500).json({
 success:false
});

}

};
