const Audit = require("../models/audit.model");


exports.getStandardAudits = async (req,res)=>{
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

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Standard audit error"
    });

  }
};



exports.getServiceAudits = async (req,res)=>{
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

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Service audit error"
    });

  }
};
