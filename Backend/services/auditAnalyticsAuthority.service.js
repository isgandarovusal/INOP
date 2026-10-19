const crypto=require('node:crypto');
const resources=['audit.analytics','audit.action','audit.finding','audit.approval','audit.closure'];
const canonical=value=>Array.isArray(value)?value.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):value&&typeof value==='object'?(typeof value.toHexString==='function'?value.toHexString():Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]))):value;
async function capture(req){
 const authority={user:{id:req.user.id,role:req.user.role,departmentId:req.user.departmentId||''},resources:{}};
 for(const resource of resources){const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,resource,'read');authority.resources[resource]={scope,filter:scope&&scope!=='none'?await require('../middleware/auditScope.middleware').getAuditScopeFilter({...req,permission:{scope}}):null};}
 return crypto.createHash('sha256').update(JSON.stringify(canonical(authority))).digest('hex');
}
async function recheck(req,res,before){
 await require('../middleware/auth.middleware').verifyToken(req,res,()=>{});if(res.headersSent)return false;
 req.auditorProfile=await require('../models/auditorProfile.model').findById(req.user.id).lean()||undefined;
 if(await capture(req)!==before){res.status(403).json({message:'Audit analytics access changed. Refresh filters before retrying.'});return false;}return true;
}
module.exports={capture,recheck};
