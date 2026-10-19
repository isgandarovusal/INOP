const crypto=require('node:crypto');
// Bounded process-local counters; no identities, bodies, URLs, query strings or file keys.
exports.createTelemetry=({enabled=false,emit=row=>console.info(JSON.stringify(row))}={})=>{
 const counters={requests:0,success:0,denied:0,clientError:0,serverError:0,analyticsRequests:0,analyticsDurationMs:0};
 const middleware=(req,res,next)=>{const requestId=crypto.randomUUID(),started=performance.now();res.setHeader('X-Request-ID',requestId);
  const match=/^\/api\/(audit-[a-z-]+|audits|occupational-safety-[a-z-]+)(?:\/|$)/.exec(req.path||'');const group=match&&(/analytics/.test(match[1])||/^\/api\/audit-(?:hr|service|standard|hse)\/analytics(?:\/|$)/.test(req.path||''))?'audit-analytics':match?'audit':'api';
  res.once('finish',()=>{const durationMs=Math.max(0,Math.round(performance.now()-started)),status=res.statusCode;counters.requests++;counters[status<400?'success':[401,403].includes(status)?'denied':status<500?'clientError':'serverError']++;if(group==='audit-analytics'){counters.analyticsRequests++;counters.analyticsDurationMs+=durationMs;}
   if(enabled)emit({event:'api_request',requestId,method:['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(req.method)?req.method:'OTHER',group,status,durationMs});
  });next();};
 return{middleware,snapshot:()=>({...counters})};
};
