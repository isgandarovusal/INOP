const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const { createScanner } = require('../services/hrClamScan.service');
const { docx } = require('./helpers/cvDocuments.cjs');
const bytes = docx('Name: Synthetic legacy CV\nSkills\nHACCP');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function controller(scanner) {
  let parsed = 0; const logs = [], module = { exports: {} };
  const deps = {
    '../services/cvParser.service': { parseCvResultFromBuffer: async b => { parsed++; assert.deepEqual(Buffer.from(b), bytes); return {text:'synthetic',parsed:{name:'Synthetic'}}; } },
    '../services/hrCvIntakeProfiles.service': { scanner: () => { if (!scanner) throw Error('PRIVATE_CONFIGURATION'); return scanner; } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/cv.controller.js'),'utf8'), { module, exports:module.exports, require:id=>id.startsWith('node:')?require(id):deps[id], Buffer, console:{error:(...args)=>logs.push(args)} });
  return { parsed:()=>parsed, logs, async call() { const res={code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}}; await module.exports.parseCv({file:{buffer:Buffer.from(bytes),originalname:'synthetic.docx',mimetype:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',size:bytes.length}},res);return res; } };
}
for (const [name, scanner, status, code] of [
  ['unavailable',undefined,503,'INTAKE_SCAN_REQUIRED'],
  ['error',{scan:async()=>{throw Error('PRIVATE_SCANNER_ERROR');}},503,'INTAKE_SCAN_REQUIRED'],
  ['inconclusive',{scan:async()=>({verdict:'unknown'})},503,'INTAKE_SCAN_REQUIRED'],
  ['infected',{scan:async()=>({verdict:'infected'})},422,'INTAKE_QUARANTINED'],
  ['wrong hash',{scan:async()=>({verdict:'clean',sha256:'0'.repeat(64),engine:'synthetic',version:'1'})},503,'INTAKE_SCAN_REQUIRED'],
]) test('Legacy CV '+name+' refuses extraction without leaking diagnostics',async()=>{
  const h=controller(scanner),res=await h.call();assert.equal(res.code,status);assert.equal(res.data.code,code);assert.equal(h.parsed(),0);assert.deepEqual(h.logs,[]);assert.ok(!JSON.stringify(res.data).includes('PRIVATE_'));
});
test('Existing native scanner timeout refuses extraction; no retry or raised production deadline',async()=>{
  let calls=0;const scanner=createScanner({enabled:true,binary:'/usr/bin/clamscan',timeoutMs:50,run:async()=>{calls++;return new Promise(()=>{});}});
  const h=controller(scanner),res=await h.call();assert.equal(res.code,503);assert.equal(res.data.code,'INTAKE_SCAN_REQUIRED');assert.equal(h.parsed(),0);assert.equal(calls,1);assert.equal(scanner.health().active,1);
});
test('One successful hash-bound scan precedes extraction and preserves legacy response',async()=>{
  let scans=0;const h=controller({scan:async(b,c)=>{scans++;assert.equal(h.parsed(),0);assert.equal(c.sha256,hash(b));return{verdict:'clean',sha256:c.sha256,engine:'synthetic',version:'1'};}});
  const r=await h.call();assert.equal(r.code,200);assert.equal(scans,1);assert.equal(h.parsed(),1);assert.equal(r.data.name,'Synthetic');assert.equal(r.data.fileName,'synthetic.docx');
});

test('Real legacy HTTP authorization, invalid bytes, default-off scanning and no persistence',async()=>require('./helpers/auditFixture.cjs').withAuditFixture(async h=>{
 const profiles=require('../services/hrCvIntakeProfiles.service'),previous=profiles.scanner;
 const Candidate=require('../models/candidate.model'),Application=require('../models/application.model'),Source=require('../models/hrCvIntake.model');
 const files=()=>require('node:fs/promises').readdir(require('../middleware/privateUpload.middleware').uploadsDir).catch(e=>{if(e.code==='ENOENT')return[];throw e;});
 const before=await files(),counts=await Promise.all([Candidate.countDocuments(),Application.countDocuments(),Source.countDocuments()]);
 const upload=async(actor,content=bytes,name='synthetic.docx',mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document')=>{
  const body=new FormData();body.append('cv',new Blob([content],{type:mime}),name);
  const r=await fetch(h.apiBase+'/candidates/parse-cv',{method:'POST',headers:h.tokens[actor]?{Authorization:'Bearer '+h.tokens[actor]}:{},body});return{status:r.status,data:await r.json()};
 };
 let scans=0;
 try {
  // Missing native configuration must not inherit the durable profile's metadata fallback.
  profiles.scanner=()=>{throw Error('PRIVATE_CONFIG');};assert.equal((await upload('admin')).status,503);
  profiles.scanner=()=>({scan:async(_b,c)=>{scans++;return{verdict:'clean',sha256:c.sha256,engine:'synthetic-test-only',version:'1'};}});
  assert.equal((await upload('anonymous')).status,401);assert.equal((await upload('none')).status,403);assert.equal(scans,0);
  assert.equal((await upload('admin',Buffer.from('not a document'))).status,400);
  assert.equal((await upload('admin',bytes,'synthetic.exe','application/octet-stream')).status,400);
  assert.equal((await upload('admin',Buffer.alloc(5*1024*1024+1),'large.pdf','application/pdf')).status,413);assert.equal(scans,0);
  const good=await upload('admin');assert.equal(good.status,200);assert.equal(good.data.name,'Synthetic legacy CV');assert.equal(scans,1);
  assert.deepEqual(await Promise.all([Candidate.countDocuments(),Application.countDocuments(),Source.countDocuments()]),counts);
  assert.deepEqual(await files(),before);
 } finally {profiles.scanner=previous;}
}));
