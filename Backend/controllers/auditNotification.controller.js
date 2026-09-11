const AuditNotification = require("../models/auditNotification.model");


exports.getNotifications = async(req,res)=>{

 try{

  const notifications =
   await AuditNotification.find({
    userId:req.user.id
   })
   .sort({
    createdAt:-1
   });


  res.json({
    success:true,
    data:notifications
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:error.message
  });

 }

};



exports.createNotification = async(req,res)=>{

 try{

  const notification =
   await AuditNotification.create({

    auditId:req.body.auditId,

    userId:req.body.userId,

    type:req.body.type,

    message:req.body.message,

    read:false

   });


  res.json({
   success:true,
   data:notification
  });


 }catch(error){

  res.status(500).json({
   success:false,
   message:error.message
  });

 }

};



exports.markRead = async(req,res)=>{

 try{


 const notification =
 await AuditNotification.findByIdAndUpdate(

  req.params.id,

  {
   read:true
  },

  {
   new:true
  }

 );


 res.json({

  success:true,

  data:notification

 });



 }catch(error){

 res.status(500).json({

  success:false,

  message:error.message

 });


 }


};
