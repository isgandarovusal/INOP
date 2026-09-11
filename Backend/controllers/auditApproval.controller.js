const AuditExecution =
require("../models/auditExecution.model");



exports.approveAudit =
async(req,res)=>{


try{


const execution =
await AuditExecution.findByIdAndUpdate(

req.params.id,

{
 status:"approved",

 approvedBy:req.body.approvedBy,

 approvedAt:new Date()
},

{
 new:true
}

);



res.json({

 success:true,

 data:execution

});



}catch(error){


res.status(500).json({

 success:false,

 message:"Approval error"

});


}

};
