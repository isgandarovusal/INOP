const Audit = require("../models/audit.model");


exports.checkAuditAccess = async(req,res)=>{

 try{

  const {
   role
  } = req.user || {};


  const allowedRoles=[
   "admin",
   "manager",
   "auditor"
  ];


  res.json({

   success:true,

   access:
    allowedRoles.includes(role)

  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:"Permission check failed"
  });

 }

};
