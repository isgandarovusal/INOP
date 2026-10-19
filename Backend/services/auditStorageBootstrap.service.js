const initialized=new WeakSet();
function initialize({storage=require('./auditEvidenceStorage.service'),createAdapter=require('./auditS3Adapter.service').createAdapter}={}){
 if(initialized.has(storage))return;
 // Register support only. There is no network operation, credential read or enable
 // at bootstrap. Missing/invalid explicit bindings remain a fail-closed 503.
 storage.registerProvider('s3',env=>createAdapter(env));
 initialized.add(storage);
}
module.exports={initialize};
