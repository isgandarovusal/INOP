const Audit = require("../models/audit.model");
const AuditExecution = require("../models/auditExecution.model");
// Execution totals are raw points; legacy score is read only when totalScore is absent.
const executionScore = { $ifNull: ["$totalScore", "$score"] };
const { getAuditChildScopeFilter } = require("../middleware/auditScope.middleware");



exports.getAuditDashboard = async(req,res)=>{

try{

const directionSelected=Boolean(req.query.direction||req.query.auditType);
const auditFilter = await require('./auditDirectionAnalytics.controller').filterFor(req);
if (auditFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
const executionFilter = await getAuditChildScopeFilter(req,auditFilter);


const [
 totalAudits,
 completedAudits,
 riskStats,
 typeStats,
 scoreStats,
 trend
]=await Promise.all([



Audit.countDocuments(auditFilter),



AuditExecution.countDocuments({
 ...executionFilter,
 status:"completed"
}),



AuditExecution.aggregate([
{ $match: executionFilter },

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
{ $match: auditFilter },

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
{ $match: executionFilter },

{
 $group:{
  _id:null,
  averageScore:{
   $avg:directionSelected?executionScore:null
  },
  scoredExecutions: { $sum: { $cond: [{ $isNumber: executionScore }, 1, 0] } }
 }
}

]),



AuditExecution.aggregate([
{ $match: executionFilter },

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
   $avg:directionSelected?executionScore:null
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
directionSelected ? scoreStats[0]?.averageScore ?? null : null,

scoredExecutions: scoreStats[0]?.scoredExecutions || 0,
scoreUnit: directionSelected?"raw-points":"not-combined",
overallReason: directionSelected?null:"Different audit methodologies are not combined.",

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


res.status(error.status||500).json({

success:false,

message:
"Dashboard analytics error"

});


}

};
