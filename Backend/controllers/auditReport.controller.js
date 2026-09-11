const Audit = require("../models/audit.model");



exports.getAuditReport = async(req,res)=>{

 try{


  const audit = await Audit.findById(
    req.params.id
  );


  if(!audit){

    return res.status(404).json({

      success:false,
      message:"Audit not found"

    });

  }



  const score =
    audit.score ||
    audit.overallScore ||
    0;



  const report = {

    id:audit._id,

    type:audit.auditType,

    status:audit.status,

    score,


    summary:{

      totalChecks:
        audit.checklist?.length || 0,


      passed:
        audit.checklist
        ?.filter(
          x=>x.status==="passed"
        )
        .length || 0,


      failed:
        audit.checklist
        ?.filter(
          x=>x.status==="failed"
        )
        .length || 0

    },


    safety:
      audit.safetyDetails || null,


    createdAt:
      audit.createdAt

  };



  res.json({

    success:true,

    data:report

  });



 }catch(error){

  console.error(error);


  res.status(500).json({

    success:false,

    message:"Report generation error"

  });

 }


};
