const AuditExecution =
require("../models/auditExecution.model");



function calculateRisk(score){

 if(score >= 90)
  return "low";

 if(score >=70)
  return "medium";

 if(score >=50)
  return "high";

 return "critical";

}



exports.createExecution = async(req,res)=>{

 try{

 const execution =
 await AuditExecution.create(req.body);


 res.status(201).json({
  success:true,
  data:execution
 });


 }catch(error){

 res.status(500).json({
  success:false,
  message:"Audit execution error"
 });

 }

};





exports.getExecution =
async(req,res)=>{

 try{

 const item =
 await AuditExecution.findById(
  req.params.id
 );


 res.json({
  success:true,
  data:item
 });


 }catch(error){

 res.status(500).json({
  success:false
 });

 }

};





exports.submitExecution =
async(req,res)=>{

 try{

 const {
  answers=[]
 } = req.body;


 let score = 0;


 answers.forEach(a=>{
  score += Number(a.score || 0);
 });


 const risk =
 calculateRisk(score);


 const updated =
 await AuditExecution.findByIdAndUpdate(

 req.params.id,

 {
  answers,
  totalScore:score,
  riskLevel:risk,
  status:"completed"
 },

 {
  new:true
 }

 );


 res.json({
  success:true,
  data:updated
 });


 }catch(error){

 res.status(500).json({
  success:false,
  message:"Submit error"
 });

 }

};
