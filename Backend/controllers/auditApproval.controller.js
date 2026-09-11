const AuditApproval =
 require("../models/auditApproval.model");



exports.createApproval = async(req,res)=>{

 try{

  const approval =
   await AuditApproval.create({
    ...req.body,
    requestedBy:req.user?.id
   });


  res.json({
   success:true,
   data:approval
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:error.message
  });

 }

};




exports.getApprovals = async(req,res)=>{

 try{

  const approvals =
   await AuditApproval.find({
    auditId:req.params.auditId
   })
   .populate(
    "reviewer requestedBy"
   )
   .sort({
    createdAt:-1
   });


  res.json({
   success:true,
   data:approvals
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:error.message
  });

 }

};




exports.updateApproval = async(req,res)=>{

 try{

  const {
   status,
   comment
  }=req.body;


  const approval =
   await AuditApproval.findByIdAndUpdate(
    req.params.id,
    {
     status,
     comment,
     approvedAt:
      status==="approved"
      ?
      new Date()
      :
      null
    },
    {
     new:true
    }
   );


  res.json({
   success:true,
   data:approval
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:error.message
  });

 }

};
