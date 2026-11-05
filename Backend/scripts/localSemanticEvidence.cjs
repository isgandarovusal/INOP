// Offline experiment only. This helper grants no resource access and does not
// establish model provenance: the invoking local runner owns verified inference.
const review=require('../services/hrAiCvReview.service');
const fail=code=>Object.assign(new Error('Local semantic evidence is unavailable.'),{code});
const keys=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(key=>Object.hasOwn(value,key));
function prepare(input){
 if(!keys(input,['locale','requirement','evidence']))throw fail('SEMANTIC_INPUT_INVALID');
 if(input.locale!=='en')throw fail('SEMANTIC_LOCALE_UNSUPPORTED');
 try{
  // Reuse the existing professional-field/PII/protected-trait exclusions. This
  // is data minimization, not authorization or a general PII detector.
  review.context({version:'cv-professional-evidence-v1',facts:[{id:'e1',field:'skills',quote:input.requirement}]});
  const evidence=review.context(input.evidence);
  return{texts:[input.requirement,...evidence.facts.map(row=>row.quote)],evidenceIds:evidence.facts.map(row=>row.id)};
 }catch{throw fail('SEMANTIC_INPUT_INVALID');}
}
function rank(input,vectors){
 const prepared=prepare(input);
 if(!Array.isArray(vectors)||vectors.length!==prepared.texts.length||vectors.some(row=>!Array.isArray(row)||row.length!==300||row.some(value=>typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e6)))throw fail('SEMANTIC_VECTOR_INVALID');
 const norm=row=>Math.sqrt(row.reduce((sum,value)=>sum+value*value,0)),query=vectors[0],queryNorm=norm(query);
 const ranking=prepared.evidenceIds.map((evidenceId,index)=>{
  const evidence=vectors[index+1],evidenceNorm=norm(evidence);
  const similarity=queryNorm&&evidenceNorm?Math.max(-1,Math.min(1,query.reduce((sum,value,i)=>sum+value*evidence[i],0)/(queryNorm*evidenceNorm))):null;
  return{evidenceId,similarity};
 });
 ranking.sort((a,b)=>a.similarity===null?(b.similarity===null?0:1):b.similarity===null?-1:b.similarity-a.similarity);
 return{mode:'retrieval-only',model:'en_core_web_md-3.8.0',locale:'en',requiresHumanReview:true,ranking};
}
module.exports={prepare,rank};
