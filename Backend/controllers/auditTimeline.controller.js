const { listRecords } = require("../utils/listQuery");
const AuditTimeline =
require("../models/auditTimeline.model");


exports.getTimeline=async(req,res,next)=>{

try{

const data =
await listRecords(AuditTimeline, { auditId: req.audit._id }, req, res);


res.json({
 success:true,
 data
});


}catch(e){
if (e.status || e.statusCode) return next(e);

res.status(500).json({
 success:false
});

}

};
