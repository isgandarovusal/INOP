const assert=require('node:assert/strict');
async function create(h,kind,brand='kfc',allNA=false){
 const prefix={hr:'hr',service:'service',standard:'standard',hse:'hse'}[kind],objectType=kind==='hse'?brand:null;
 assert.equal((await h.request('admin','POST',`/audit-${prefix}/templates/${objectType||brand}`,{})).status,201);
 let restaurantId='restaurant-admin',object;
 if(kind==='hse'&&objectType!=='restaurant')object=(await h.request('admin','POST','/audit-hse/objects',{objectType,name:'Synthetic '+objectType})).data.data;
 if(kind!=='hse'&&brand!=='kfc'){restaurantId='report-'+brand;if(!await require('../../models/restaurant.model').exists({id:restaurantId}))await require('../../models/restaurant.model').create({id:restaurantId,name:'Synthetic '+brand,organizationId:'gfc',brandId:brand});}
 const c=await h.request('admin','POST',`/audit-${prefix}/audits`,kind==='hse'?{objectType,objectId:object?.id||restaurantId,brandId:object?'':brand==='restaurant'?'kfc':brand,date:'2026-10-16'}:{brandId:brand,restaurantId,date:'2026-10-16'});assert.equal(c.status,201,JSON.stringify(c.data));
 const audit=c.data.data,e=(await h.request('admin','POST','/audit-execution',{auditId:audit._id})).data.data;
 const questions=e.templateSnapshot.sections.flatMap(s=>s.questions);const answers=questions.map((q,i)=>({questionId:q.id,answer:allNA||i>2?'na':kind==='standard'?['compliant','critical','minor'][i]:kind==='hse'?['compliant','noncompliant','compliant'][i]:['0','0.5','1'][i],comment:i===0?'=HYPERLINK("https://example.invalid","text")':'Synthetic criterion note'}));
 return{audit,e,answers,kind,details:{observations:'=1+1',finalOpinion:'Synthetic final opinion',sectionNotes:{[e.templateSnapshot.sections[0].id]:'Synthetic section note'},...(['standard','hse'].includes(kind)?{naReasons:Object.fromEntries(answers.filter(a=>a.answer==='na').map(a=>[a.questionId,'Synthetic objective inapplicability']))}:{} )}};
}
async function submit(h,row){const r=await h.request('admin','PUT',`/audit-execution/${row.e._id}/submit`,{answers:row.answers,details:row.details,evidenceLinks:row.evidenceLinks||[],expectedVersion:0});assert.equal(r.status,200,JSON.stringify(r.data));return r.data.data;}
async function upload(h,auditId,name,bytes,mime){const f=new FormData();f.set('file',new Blob([bytes],{type:mime}),name);const r=await fetch(h.apiBase+`/audit-evidence/${auditId}`,{method:'POST',headers:{Authorization:'Bearer '+h.tokens.admin},body:f});assert.equal(r.status,201);return(await r.json()).data.id;}
async function cleanup(_h){const store=require('../../services/auditEvidenceStorage.service');for(const f of await require('../../models/auditEvidence.model').find({}).lean())if(f.storageReference)await store.forReference(f.storageReference,String(f.auditId)).remove(f.storageReference);}
module.exports={create,submit,upload,cleanup};
