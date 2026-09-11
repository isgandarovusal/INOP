const Audit = require("../models/audit.model");
const AuditExecution = require("../models/auditExecution.model");



exports.getAuditDashboard = async(req,res)=>{

try{


const [
 totalAudits,
 completedAudits,
 riskStats,
 typeStats,
 scoreStats,
 trend
]=await Promise.all([



Audit.countDocuments(),



AuditExecution.countDocuments({
 status:"completed"
}),



AuditExecution.aggregate([

{
 $group:{
  _id:"$riskLevel",
  count:{
   $sum:1
  }
 }
}

]),



Audit.aggregate([

{
 $group:{
  _id:"$auditType",
  count:{
   $sum:1
  }
 }
}

]),



AuditExecution.aggregate([

{
 $group:{
  _id:null,
  averageScore:{
   $avg:"$score"
  }
 }
}

]),



AuditExecution.aggregate([

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
  },

  averageScore:{
   $avg:"$score"
  }

 }
},

{
 $sort:{
  "_id.year":1,
  "_id.month":1
 }
}

])

]);



res.json({

success:true,

data:{

totalAudits,

completedAudits,

averageScore:
scoreStats[0]?.averageScore || 0,

riskStats,

typeStats,

trend

}

});



}catch(error){


console.error(
"Audit dashboard error",
error
);


res.status(500).json({

success:false,

message:
"Dashboard analytics error"

});


}

};
