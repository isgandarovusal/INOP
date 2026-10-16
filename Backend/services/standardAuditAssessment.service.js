const crypto=require('node:crypto');
const catalogues=require('../config/standardAuditSources.json');
// Retain reviewed historical entries when publishing a new catalogue version.
const sources=[...new Map(catalogues.map(s=>[s.brandId,s])).values()];
const {auditError}=require('./auditTransaction.service');
const clone=v=>JSON.parse(JSON.stringify(v));
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sourceFor=(brand,version,hash)=>version?catalogues.find(s=>s.brandId===brand&&s.version===version&&(!hash||s.sha256===hash)):sources.find(s=>s.brandId===brand);
function contentFor(brand,version,hash){const s=sourceFor(brand,version,hash);if(!s)throw auditError(400,'Unknown Standard brand.');return {organizationId:'gfc',brandId:brand,brandName:s.brandName,auditType:'standard',name:`Standart auditi — ${s.brandName}`,version:s.version,sections:clone(s.sections),sourceDocumentIds:[],standardSource:{sha256:s.sha256,version:s.version,scoringStatus:s.scoringStatus}};}
function verifiedSource(snapshot){const s=sourceFor(snapshot?.brandId,snapshot?.standardSource?.version,snapshot?.standardSource?.sha256),expected=s&&contentFor(s.brandId,s.version,s.sha256);if(!expected||snapshot.auditType!=='standard'||snapshot.organizationId!=='gfc'||digest(snapshot.standardSource)!==digest(expected.standardSource)||digest(snapshot.sections)!==digest(expected.sections))throw auditError(409,'Standard catalog revision does not match the complete reviewed source.');return s;}
const results=['critical','major','minor','compliant','na'];
function assessStandard(snapshot,answers,submitting=false,details={}){
 const source=verifiedSource(snapshot);if(source.scoringStatus!=='approved-standard-contract-v1')throw auditError(409,'Standard scoring contract requires explicit review.');const questions=source.sections.flatMap(s=>s.questions),known=new Set(questions.map(q=>q.id)),supplied=new Map();
 if(!Array.isArray(answers)||answers.length>500)throw auditError(400,'Invalid Standard answers.');
 for(const a of answers){if(!a||a.comment!==undefined&&typeof a.comment!=='string'||!known.has(a.questionId)||supplied.has(a.questionId)||!['',...results].includes(a.answer))throw auditError(400,'Invalid, duplicate or foreign Standard answer.');supplied.set(a.questionId,a);}
 const naReasons=details.naReasons||{};
 const summarize=questions=>{const counts={total:questions.length,applicable:0,na:0,unanswered:0,compliant:0,critical:0,major:0,minor:0,sourceRisk:{critical:0,major:0,minor:0,unspecified:0},percentage:null};for(const q of questions){counts.sourceRisk[q.sourceRisk||'unspecified']++;const answer=supplied.get(q.id)?.answer;if(!answer){counts.unanswered++;continue;}counts[answer]++;if(answer!=='na')counts.applicable++;}return counts;};
 const counts=summarize(questions),missingNa=questions.filter(q=>supplied.get(q.id)?.answer==='na'&&!(typeof naReasons[q.id]==='string'&&naReasons[q.id].trim()));
 const complete=counts.unanswered===0&&missingNa.length===0;
 if(submitting&&!complete)throw auditError(422,'Answer every Standard criterion and justify every N/A.');
 if(submitting&&(details.criterionObservations||[]).some(o=>!o.description?.trim()))throw auditError(422,'Describe or remove every additional observation.');
 if(submitting&&questions.some(q=>['critical','major','minor'].includes(supplied.get(q.id)?.answer)&&!supplied.get(q.id)?.comment?.trim()&&!(details.criterionObservations||[]).some(o=>o.standardId===q.id&&o.description?.trim())))throw auditError(422,'Describe every Standard nonconformity.');
 // User approved applicable-criteria conformity for all three brands.
 // Source severity remains metadata; no severity weights, deadlines or fail threshold.
 const percentage=complete&&counts.applicable?counts.compliant/counts.applicable*100:null;
 return {assessmentStatus:percentage===null?'unscored':'scored',overallPercentage:percentage,passed:null,standardAssessment:{contract:source.scoringStatus,sourceHash:source.sha256,catalogVersion:source.version,complete,...counts,percentage,reason:!complete?'incomplete':counts.applicable?null:'all-not-applicable',sections:source.sections.map(s=>{const c=summarize(s.questions),ready=s.questions.every(q=>supplied.get(q.id)?.answer&&(supplied.get(q.id).answer!=='na'||naReasons[q.id]?.trim()));return {id:s.id,title:s.title,category:s.category,...c,percentage:ready&&c.applicable?c.compliant/c.applicable*100:null};})}};
}
function text(v,max=4000){if(v===undefined)return '';if(typeof v!=='string'||v.length>max)throw auditError(400,'Invalid Standard text.');return v;}
function normalizeDetails(snapshot,v={}){
 if(!v||typeof v!=='object'||Array.isArray(v))throw auditError(400,'Invalid Standard details.');
 const questions=new Set(snapshot.sections.flatMap(s=>s.questions.map(q=>q.id))),sections=new Set(snapshot.sections.map(s=>s.id));
 const object=(input,allowed,max)=>{if(input===undefined)return {};if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.has(k)))throw auditError(400,'Unknown Standard detail key.');return Object.fromEntries(Object.entries(input).map(([k,value])=>[k,text(value,max)]));};
 const final=v.finalEvidence||{};if(!final||typeof final!=='object'||Array.isArray(final)||final.documentIds!==undefined&&(!Array.isArray(final.documentIds)||final.documentIds.length>3||final.documentIds.some(id=>typeof id!=='string')))throw auditError(400,'Invalid Standard final attachments.');
 const observations=v.criterionObservations||[];
 if(!Array.isArray(observations)||observations.length>1000||new Set(observations.map(o=>o?.id)).size!==observations.length)throw auditError(400,'Invalid Standard observations.');
 return {sectionNotes:object(v.sectionNotes,sections,4000),sectionPhotos:object(v.sectionPhotos,sections,100),naReasons:object(v.naReasons,questions,4000),finalEvidence:{photoId:text(final.photoId,100),documentIds:final.documentIds||[]},observations:text(v.observations,10000),finalOpinion:text(v.finalOpinion,10000),restaurantManager:text(v.restaurantManager,200),shiftManager:text(v.shiftManager,200),criterionObservations:observations.map(o=>{if(!o||typeof o.id!=='string'||o.id.length>100||!o.id||!questions.has(o.standardId)||!Array.isArray(o.evidenceIds||[])||(o.evidenceIds||[]).length>50||(o.evidenceIds||[]).some(id=>typeof id!=='string'))throw auditError(400,'Invalid Standard observation linkage.');return {id:o.id,standardId:o.standardId,description:text(o.description),evidenceIds:o.evidenceIds||[]};})};
}
const bindingKey=s=>`standard:${s.brandId}:${s.sha256}:${s.version}`;
module.exports={sources,sourceFor,contentFor,verifiedSource,assessStandard,normalizeDetails,text,digest,results,bindingKey};
