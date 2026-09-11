const Audit = require("../models/audit.model");



exports.calculateScore = async(req,res)=>{


 try{


  const audit =
    await Audit.findById(
      req.params.id
    );


  if(!audit){

    return res.status(404).json({

      success:false

    });

  }



  const checks =
    audit.checklist || [];



  const total =
    checks.length;



  const passed =
    checks.filter(
      x=>x.status==="passed"
    ).length;



  const score =
    total
    ? Math.round(
        (passed / total) * 100
      )
    : 0;



  audit.score = score;


  await audit.save();



  res.json({

    success:true,

    score

  });



 }catch(error){


  res.status(500).json({

    success:false,

    message:"Score error"

  });


 }


};
