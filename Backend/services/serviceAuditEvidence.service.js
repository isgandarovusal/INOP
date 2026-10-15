const {auditError}=require('./auditTransaction.service');
exports.validate=async(ids,auditId,session)=>{
 if(!Array.isArray(ids)||ids.length>200||new Set(ids).size!==ids.length)throw auditError(400,'Invalid Service evidence references.');
 for(const id of ids)if(!require('mongoose').isObjectIdOrHexString(id)||!await require('../models/auditEvidence.model').exists({_id:id,auditId}).session(session))throw auditError(400,'Evidence belongs to another audit or is unavailable.');
 return ids;
};
