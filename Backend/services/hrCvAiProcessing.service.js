const crypto=require('node:crypto');
const {createProcessing}=require('./hrCvProcessing.service');
const evidence=require('./hrAiCvReview.service'),ai=require('./hrAiProvider.service');
const version='ai-professional-1';
const fail=()=>Object.assign(new Error('AI review result is unavailable.'),{code:'PROCESSING_INVALID_RESULT',status:422});
const unavailable=()=>Object.assign(new Error('AI review is temporarily unavailable.'),{code:'AI_PROVIDER_UNAVAILABLE'});
function checked(value,context){
 if(!value||value.version!=='cv-professional-review-v1'||value.requiresApproval!==true||!value.provenance||
  Object.keys(value).some(k=>!['version','status','proposals','uncertainty','requiresApproval','provenance'].includes(k))||
  Object.keys(value.provenance).some(k=>!['provider','model','mode','contextHash'].includes(k))||value.provenance.provider!=='openai'||
  !/^[a-zA-Z0-9_.:-]{1,120}$/.test(value.provenance.model||'')||!['live','mock_test_only'].includes(value.provenance.mode)||
  value.provenance.contextHash!==crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex'))throw fail();
 let result;try{result=evidence.validate({status:value.status,proposals:value.proposals,uncertainty:value.uncertainty},context);}catch{throw fail();}
 const parsed={},fields={};
 for(const row of result.proposals){
  if(['skills','languages','certificates'].includes(row.field))(parsed[row.field]??=[]).push(row.value);
  else parsed[row.field]=row.field==='experience'?Number(row.value):row.value;
  const field=fields[row.field]??={source:'ai-professional-evidence',confidence:null,evidence:[]};
  for(const id of row.evidenceIds){const quote=context.facts.find(f=>f.id===id).quote;if(!field.evidence.includes(quote))field.evidence.push(quote);}
 }
 const review={version,provider:'openai-professional-evidence',confidenceKind:'uncalibrated_ai',processingStatus:'extracted',reviewStatus:'pending',fields,warnings:['ai_human_review_required'],provenance:{...value.provenance}};
 return {parsed,review,parserVersion:version,requiresApproval:true,proposal:{version:value.version,...result,requiresApproval:true,provenance:{...value.provenance}},evidence:context.facts,reviewScope:'professional_evidence_only'};
}
// Trusted profile, disabled by default. Optional HTTP/worker wiring does not
// imply external-review consent, provider credentials or live E2E verification.
function createAiProcessing({enabled=false,provider=ai,...queue}={}){
 return createProcessing({...queue,enabled,kind:'ai-review',taskVersion:version,resultCurrent:async(candidate,result)=>{
  // Apply current output policy to historical successes as well as fresh model
  // responses. Metadata stays readable; unsafe proposals cannot reach approval.
  try{const verified=checked(result.proposal,evidence.context({version:'cv-professional-evidence-v1',facts:result.evidence}));if(!require('node:util').isDeepStrictEqual(result,verified))return false;}catch{return false;}
  if(!candidate.privateCvIntake||candidate.cvReview?.processingApproval)return null;
  try{const context=await evidence.currentContext(candidate);return result.proposal?.provenance?.contextHash===crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')&&require('node:util').isDeepStrictEqual(result.evidence,context.facts);}catch(error){if(error.code==='AI_NO_REVIEW_CONTEXT')return false;throw unavailable();}
 },task:async({candidate,actorId,signal,guard})=>{
  let context;try{context=await evidence.currentContext(candidate);}catch(error){if(error.code==='AI_NO_REVIEW_CONTEXT')return{state:'blocked',code:'AI_REVIEW_CONTEXT_REQUIRED'};throw unavailable();}
  try{if(candidate.privateCvIntake&&!candidate.cvReview?.processingApproval){if(typeof guard!=='function')throw fail();await guard();}const proposal=await provider.suggestCv(context,{actorId,signal});const latest=await evidence.currentContext(candidate);if(JSON.stringify(latest)!==JSON.stringify(context))throw fail();const result=checked(proposal,context);if(proposal.status==='insufficient_context')return{state:'blocked',code:'AI_REVIEW_CONTEXT_REQUIRED'};return{state:'succeeded',code:'AI_REVIEW_REQUIRED',result};}
  catch(error){
   if(['PROCESSING_AUTH_REVOKED','PROCESSING_SOURCE_CHANGED','PROCESSING_TIMEOUT'].includes(error.code))throw error;
   if(error.code==='AI_NO_REVIEW_CONTEXT')return{state:'blocked',code:'AI_REVIEW_CONTEXT_REQUIRED'};
   if(['AI_UNAVAILABLE','AI_CONFIGURATION_REQUIRED'].includes(error.code))return{state:'blocked',code:'AI_NOT_CONFIGURED'};
   if(error.code==='AI_INVALID_OUTPUT')throw fail();
   // Other provider failures use the existing persisted bounded retry policy.
   throw error?.code==='PROCESSING_INVALID_RESULT'?fail():unavailable();
  }
 }});
}
module.exports={createAiProcessing};
