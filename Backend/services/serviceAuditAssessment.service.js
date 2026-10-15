const crypto = require('node:crypto');
const sources = require('../config/serviceAuditSources.json');
const { auditError } = require('./auditTransaction.service');
const clone = value => JSON.parse(JSON.stringify(value));
const sourceFor = brandId => sources.find(source => source.brandId === brandId);
function contentFor(brandId) {
 const source=sourceFor(brandId);if(!source)throw auditError(400,'Unknown Service brand.');
 return {organizationId:'gfc',brandId,brandName:source.brandName,auditType:'service',name:`Servis auditi — ${source.brandName}`,version:source.version,sections:clone(source.sections),serviceReferences:clone(source.referenceRows),sourceDocumentIds:[],serviceSource:{sha256:source.sha256,version:source.version,scoringStatus:source.scoringStatus}};
}
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function verifiedSource(snapshot) {
  const source = sourceFor(snapshot?.brandId);
  const expected = source && contentFor(source.brandId);
  if (!expected || snapshot.sections?.some(s=>s.subsections?.length) || snapshot.auditType !== 'service' || snapshot.organizationId !== 'gfc' ||
      digest(snapshot.serviceSource) !== digest(expected.serviceSource) ||digest(snapshot.serviceReferences)!==digest(expected.serviceReferences)||
      digest((snapshot.sections || []).map(s => ({id:s.id,title:s.title,active:s.active,order:s.order,questions:s.questions?.map(q=>({id:q.id,label:q.label,answerType:q.answerType,sourceCell:q.sourceCell,guidance:q.guidance,required:q.required,active:q.active,order:q.order}))}))) !==
      digest(expected.sections.map(s => ({id:s.id,title:s.title,active:s.active,order:s.order,questions:s.questions.map(q=>({id:q.id,label:q.label,answerType:q.answerType,sourceCell:q.sourceCell,guidance:q.guidance,required:q.required,active:q.active,order:q.order}))})))) throw auditError(409,'Service source revision does not match the reviewed questionnaire.');
  return source;
}
function assessService(snapshot, answers, submitting=false) {
  const source=verifiedSource(snapshot);
  if (!Array.isArray(answers) || answers.length>200) throw auditError(400,'Invalid Service answers.');
  const ids=new Set(source.sections.flatMap(s=>s.questions.map(q=>q.id))), supplied=new Map();
  for(const item of answers){
    if(!item || !ids.has(item.questionId) || supplied.has(item.questionId) || !['','0','0.5','1','na'].includes(item.answer))throw auditError(400,'Invalid, duplicate or unknown Service answer.');
    supplied.set(item.questionId,item.answer);
  }
  const complete=ids.size===supplied.size && [...supplied.values()].every(Boolean);
  if(submitting&&!complete)throw auditError(422,'Answer every Service criterion before completion.');
  const sections=source.sections.map(section=>{
    const values=section.questions.map(q=>supplied.get(q.id));
    const applicable=values.filter(v=>v!==undefined&&v!==''&&v!=='na');
    const earned=applicable.reduce((sum,v)=>sum+Number(v),0);
    const sectionComplete=values.every(Boolean);
    return {id:section.id,title:section.title,total:values.length,answered:values.filter(Boolean).length,na:values.filter(v=>v==='na').length,applicable:applicable.length,earned,percentage:sectionComplete&&applicable.length?earned/applicable.length*100:null};
  });
  const applicable=sections.reduce((sum,s)=>sum+s.applicable,0);
  const earned=sections.reduce((sum,s)=>sum+s.earned,0);
  const overallPercentage=complete&&applicable?earned/applicable*100:null;
  return {assessmentStatus:overallPercentage===null?'unscored':'scored',overallPercentage,passed:null,serviceAssessment:{contract:snapshot.serviceSource.scoringStatus,sourceHash:source.sha256,complete,applicable,earned,na:sections.reduce((n,s)=>n+s.na,0),sections}};
}
function text(value,max=4000){if(value===undefined)return '';if(typeof value!=='string'||value.length>max)throw auditError(400,'Invalid Service notes.');return value;}
function normalizeDetails(snapshot,value={}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw auditError(400,'Invalid Service details.');
  const sectionIds=new Set(snapshot.sections.map(s=>s.id));
  const notes=value.sectionNotes||{};
  if(typeof notes!=='object'||Array.isArray(notes)||Object.keys(notes).some(k=>!sectionIds.has(k)))throw auditError(400,'Unknown Service section.');
  const sectionPhotos=value.sectionPhotos||{};
  if(typeof sectionPhotos!=='object'||Array.isArray(sectionPhotos)||Object.entries(sectionPhotos).some(([id,v])=>!sectionIds.has(id)||typeof v!=='string'))throw auditError(400,'Invalid Service section photos.');
  const referenceNotes=value.referenceNotes||{};
  const referenceIds=new Set(sourceFor(snapshot.brandId).referenceRows.map(r=>r.id));
  if(typeof referenceNotes!=='object'||Array.isArray(referenceNotes)||Object.entries(referenceNotes).some(([id,v])=>!referenceIds.has(id)||typeof v!=='string'||v.length>4000))throw auditError(400,'Invalid Service source reference notes.');
  const finalEvidence=value.finalEvidence||{};
  if(typeof finalEvidence!=='object'||Array.isArray(finalEvidence)||finalEvidence.photoId!==undefined&&typeof finalEvidence.photoId!=='string'||finalEvidence.documentIds!==undefined&&(!Array.isArray(finalEvidence.documentIds)||finalEvidence.documentIds.length>3||finalEvidence.documentIds.some(v=>typeof v!=='string')))throw auditError(400,'Invalid Service final attachments.');
  return {sectionPhotos,referenceNotes,finalEvidence:{photoId:finalEvidence.photoId||'',documentIds:finalEvidence.documentIds||[]},sectionNotes:Object.fromEntries(Object.entries(notes).map(([k,v])=>[k,text(v)])),observations:text(value.observations,10000),finalOpinion:text(value.finalOpinion,10000),restaurantManager:text(value.restaurantManager,200),shiftManager:text(value.shiftManager,200)};
}
const bindingKey=source=>`service:${source.brandId}:${source.sha256}:${source.version}`;
module.exports={bindingKey,sources,sourceFor,contentFor,verifiedSource,assessService,normalizeDetails,text};
