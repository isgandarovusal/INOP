const AuditAction =
require("../models/auditAction.model");



exports.createAction =
async(req,res)=>{

try{


const action =
await AuditAction.create(
 req.body
);


res.status(201).json({
 success:true,
 data:action
});


}catch(error){

res.status(500).json({
 success:false,
 message:"Action create error"
});

}

};





exports.getActions =
async(req,res)=>{

try{


const actions =
await AuditAction.find({
 auditId:req.params.auditId
})
.sort({
 createdAt:-1
});


res.json({
 success:true,
 data:actions
});


}catch(error){

res.status(500).json({
 success:false
});

}

};





exports.updateActionStatus =
async(req,res)=>{

try{


const {
 status,
 verificationNote,
 verifiedBy
}=req.body;



const update={

 status

};



if(status==="completed"){

 update.completedAt =
 new Date();

}



if(status==="verified"){

 update.verifiedBy =
 verifiedBy;

 update.verificationNote =
 verificationNote;

}



const action =
await AuditAction.findByIdAndUpdate(

req.params.id,

update,

{
 new:true
}

);



res.json({
 success:true,
 data:action
});



}catch(error){

res.status(500).json({
 success:false,
 message:"Action update error"
});

}

};
