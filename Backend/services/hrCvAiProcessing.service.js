const crypto=require('node:crypto');
const {createProcessing}=require('./hrCvProcessing.service');
const evidence=require('./hrAiCvReview.service'),ai=require('./hrAiProvider.service');
const version='ai-professional-1';
const fail=()=>Object.assign(new Error('AI review result is unavailable.'),{code:'PROCESSING_INVALID_RESULT',status:422});
function checked(value,context){
 if(!value||value.version!=='cv-professional-review-v1'||value.requiresApproval!==true||!value.provenance||
  Object.keys(value).some(k=>!['version','status','proposals','uncertainty','requiresApproval','provenance'].includes(k))||
  Object.keys(value.provenance).some(k=>!['provider','model','mode','contextHash'].includes(k))||value.provenance.provider!=='openai'||
  !/^[a-zA-Z0-9_.:-]{1,120}$/.test(value.provenance.model||'')||!['live','mock_test_only'].includes(value.provenance.mode)||
  value.provenance.contextHash!==crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex'))throw fail();
 let result;try{result=evidence.validate({status:value.status,proposals:value.proposals,uncertainty:value.uncertainty},context);}catch{throw fail();}
 return {parserVersion:version,requiresApproval:true,proposal:{version:value.version,...result,requiresApproval:true,provenance:{...value.provenance}},evidence:context.facts,reviewScope:'professional_evidence_only'};
}
// Internal and disabled by default. No HTTP/worker/AI feature activation or new
// external permission is implied by creating this server-owned task profile.
function createAiProcessing({enabled=false,provider=ai,...queue}={}){
 return createProcessing({...queue,enabled,kind:'ai-review',taskVersion:version,task:async({candidate,actorId,signal})=>{
  let context;try{context=evidence.buildContext(candidate);}catch(error){if(error.code==='AI_NO_REVIEW_CONTEXT')return{state:'blocked',code:'AI_REVIEW_CONTEXT_REQUIRED'};throw fail();}
  try{const proposal=await provider.suggestCv(context,{actorId,signal});return{state:'succeeded',code:'AI_REVIEW_REQUIRED',result:checked(proposal,context)};}
  catch(error){
   if(['AI_UNAVAILABLE','AI_CONFIGURATION_REQUIRED'].includes(error.code))return{state:'blocked',code:'AI_NOT_CONFIGURED'};
   if(error.code==='AI_INVALID_OUTPUT')throw fail();
   // Other provider failures use the existing persisted bounded retry policy.
   throw error?.code==='PROCESSING_INVALID_RESULT'?fail():Object.assign(new Error('AI review is unavailable.'),{code:'AI_PROVIDER_UNAVAILABLE'});
  }
 }});
}
module.exports={createAiProcessing};
