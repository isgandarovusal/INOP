const indexes=require('../config/auditOperationalIndexes.json');
exports.indexes=indexes;
exports.inspect=snapshot=>{
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw Error('Read-only index inventory required.');
 return{mode:'offline-index-plan',writes:0,autoApply:false,requiresOperatorApproval:true,indexes:indexes.map(spec=>{
  const existing=snapshot[spec.model];if(!Array.isArray(existing))return{...spec,status:'BLOCKED',action:'inventory-required'};
  const equivalent=existing.find(i=>JSON.stringify(i.key)===JSON.stringify(spec.key)&&!i.partialFilterExpression&&!i.sparse&&!i.unique&&!i.hidden&&!i.collation);
  if(equivalent)return{...spec,status:'PASS',action:'no-op',existingName:equivalent.name};
  if(existing.some(i=>i.name===spec.name||JSON.stringify(i.key)===JSON.stringify(spec.key)))return{...spec,status:'BLOCKED',action:'manual-review'};
  return{...spec,status:'NOT TESTED',action:'measure-then-operator-create',rollback:{dropIndex:spec.name,onlyIfCreatedByThisApprovedPlan:true}};
 })};
};
