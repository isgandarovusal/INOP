const Audit = require("../models/audit.model");


exports.getSummary = async (req,res)=>{
  try{

    const result = await Audit.aggregate([
      {
        $group:{
          _id:"$status",
          value:{
            $sum:1
          }
        }
      }
    ]);


    res.json({
      success:true,
      data:{
        statusSummary: result.map(item=>({
          name:item._id || "unknown",
          value:item.value
        }))
      }
    });


  }catch(error){

    res.status(500).json({
      success:false,
      message:"Analytics error"
    });

  }
};



exports.getByType = async(req,res)=>{

 try{

  const result = await Audit.aggregate([
    {
      $group:{
        _id:"$auditType",
        value:{
          $sum:1
        }
      }
    }
  ]);


  res.json({
    success:true,
    data:{
      typeSummary:result.map(item=>({
        name:item._id || "unknown",
        value:item.value
      }))
    }
  });


 }catch(error){

  res.status(500).json({
    success:false,
    message:"Type analytics error"
  });

 }

};



exports.getTrend = async(req,res)=>{

 try{

 const result = await Audit.aggregate([
  {
    $group:{
      _id:{
        year:{
          $year:"$createdAt"
        },
        month:{
          $month:"$createdAt"
        }
      },
      value:{
        $sum:1
      }
    }
  },
  {
    $sort:{
      "_id.year":1,
      "_id.month":1
    }
  }
 ]);


 res.json({
  success:true,
  data:{
    trend:result.map(item=>({
      label:`${item._id.year}-${String(item._id.month).padStart(2,"0")}`,
      value:item.value
    }))
  }
 });


 }catch(error){

 res.status(500).json({
  success:false,
  message:"Trend analytics error"
 });

 }

};
