const Audit = require("../models/audit.model");



exports.updateAuditStatus = async(req,res)=>{

 try{


  const {
    status
  } = req.body;



  const allowed = [
    "draft",
    "scheduled",
    "in-progress",
    "completed",
    "failed",
    "cancelled"
  ];



  if(!allowed.includes(status)){

    return res.status(400).json({

      success:false,

      message:"Invalid audit status"

    });

  }



  const audit = await Audit.findByIdAndUpdate(

    req.params.id,

    {
      status
    },

    {
      new:true
    }

  );



  if(!audit){

    return res.status(404).json({

      success:false,

      message:"Audit not found"

    });

  }



  res.json({

    success:true,

    data:audit

  });



 }catch(error){

  console.error(error);


  res.status(500).json({

    success:false,

    message:"Status update error"

  });


 }

};
