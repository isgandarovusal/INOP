const Audit = require("../models/audit.model");


exports.getOccupationalSafetyAudits = async (req,res)=>{

 try{

  const audits = await Audit.find({
    auditType:"occupational-safety"
  })
  .sort({
    createdAt:-1
  });


  res.json({
    success:true,
    data:audits
  });


 }catch(error){

  console.error(error);

  res.status(500).json({
    success:false,
    message:"Occupational safety audit error"
  });

 }

};



exports.createOccupationalSafetyAudit = async(req,res)=>{

 try{


  const audit = await Audit.create({

    ...req.body,

    auditType:"occupational-safety"

  });


  res.status(201).json({

    success:true,

    data:audit

  });


 }catch(error){

  console.error(error);

  res.status(500).json({

    success:false,

    message:"Create safety audit error"

  });

 }

};
