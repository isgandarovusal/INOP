const {pagination,scalar}=require('./auditQuery.service');
const {auditError}=require('./auditTransaction.service');
function actionQuery(req,at=new Date()){
 const q=req.query||{};
 if(Object.keys(q).some(k=>!['page','limit','status','overdue','responsible'].includes(k)))throw auditError(400,'Invalid action filter.');
 for(const [key,value]of Object.entries(q))scalar(value,key);
 if(q.status!==undefined&&!['open','in-progress','completed','verified','rejected'].includes(q.status)||q.overdue!==undefined&&!['true','false'].includes(q.overdue)||q.responsible!==undefined&&q.responsible!=='me')throw auditError(400,'Invalid action filter.');
 const filter={auditId:req.auditScopeId};if(q.status)filter.status=q.status;if(q.responsible)filter.responsible=req.user.id;
 if(q.overdue==='true'){
  // Due dates entered by Audit are calendar dates: today is not yet overdue.
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at).map(p=>[p.type,p.value]));
  filter.dueDate={$lt:new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`)};filter.$and=[{status:{$in:['open','in-progress','rejected']}}];
 }
 return{...pagination(req),filter,paged:Object.keys(q).length>0};
}
module.exports={actionQuery};
