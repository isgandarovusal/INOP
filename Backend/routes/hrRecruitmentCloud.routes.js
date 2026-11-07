const router=require('express').Router();
const {authorize}=require('../middleware/authorization.middleware');
// This route is mounted *after* the global JWT verifier. Permission is checked
// before any Cloudflare request; it exposes only fixed service readiness metadata.
router.get('/status',...authorize('candidate','read'),async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try{
  const cloud=require('../services/hrRecruitmentCloud.service');
  let data;
  try{data=await cloud.status();}
  catch{data=await cloud.publicHealth();}
  return res.status(200).json({success:true,data});
 }catch{
  return res.status(503).json({success:false,code:'RECRUITMENT_CLOUD_UNAVAILABLE'});
 }
});
module.exports=router;
