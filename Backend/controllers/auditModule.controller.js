const Audit = require("../models/audit.model");


exports.getStandardAudits = async(req,res)=>{

 try{

  const audits = await Audit.find({
    auditType:"standard"
  })
  .sort({
    createdAt:-1
  });


  res.json({
    success:true,
    data:audits
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:"Standard audit error"
  });

 }

};




exports.getServiceAudits = async(req,res)=>{

 try{


  const audits = await Audit.find({
   auditType:"service"
  })
  .sort({
   createdAt:-1
  });


  res.json({
   success:true,
   data:audits
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:"Service audit error"
  });

 }

};





exports.getAuditFilters = async(req,res)=>{

 try{


 const statuses =
 await Audit.distinct(
  "status"
 );


 const types =
 await Audit.distinct(
  "auditType"
 );


 res.json({

  success:true,

  data:{
   statuses,
   types
  }

 });


 }catch(error){

 res.status(500).json({
  success:false,
  message:"Filter error"
 });

 }


};
