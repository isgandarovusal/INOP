const Audit = require("../models/audit.model");

exports.getSummary = async (req, res) => {
  try {
    const result = await Audit.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success:false,
      message:"Analytics error"
    });
  }
};


exports.getByType = async (req,res)=>{
  try {

    const result = await Audit.aggregate([
      {
        $group:{
          _id:"$auditType",
          count:{
            $sum:1
          }
        }
      }
    ]);

    res.json({
      success:true,
      data:result
    });

  } catch(error){

    res.status(500).json({
      success:false,
      message:"Type analytics error"
    });

  }
};


exports.getTrend = async(req,res)=>{
  try {

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
          count:{
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
      data:result
    });


  }catch(error){

    res.status(500).json({
      success:false,
      message:"Trend analytics error"
    });

  }
};
