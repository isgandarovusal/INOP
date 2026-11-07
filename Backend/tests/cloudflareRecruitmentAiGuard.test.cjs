const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const uri=pathToFileURL(path.resolve(__dirname,'../../Cloudflare/recruitment-worker/src/index.mjs')).href;
const token='synthetic-service-token-not-usable-in-cloudflare-001';
const payload={sourceId:'11111111-1111-4111-8111-111111111111',candidateRef:'507f1f77bcf86cd799439011',
 consentRef:'22222222-2222-4222-8222-222222222222',requirements:['Cash register accuracy','Team collaboration'],evidence:['Daily register reconciliation','Worked with kitchen and sales team']};
function request(body=payload){
 const data=JSON.stringify(body);
 return new Request('https://example.invalid/v1/ai/review',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','content-length':String(Buffer.byteLength(data))},body:data});
}
function state({clean=true,quota=true}={}){
 const commands=[],model=[];
 const db={prepare(sql){return{bind(...args){commands.push({sql,args});return{
  first:async()=>sql.startsWith('SELECT id FROM cv_sources')?(clean?{id:payload.sourceId}:null):
     sql.startsWith('INSERT INTO ai_daily_quota')?(quota?{attempts:1}:null):undefined,
  run:async()=>({success:true})
 };}};}};
 return {calls:()=>({commands,model}),env:{RECRUITMENT_SERVICE_TOKEN:token,RECRUITMENT_DB:db,
  RECRUITMENT_CLOUD_AI_ENABLED:'true',RECRUITMENT_PII_TRANSFER_APPROVED:'true',
  RECRUITMENT_VERIFIED_SCANNER_ENABLED:'true',
  AI:{run:async(name,options)=>{model.push({name,options});return {response:JSON.stringify({matches:[{requirement:0,evidence:0}],unknown:[1]})};}}}};
}
test('Recruitment AI stays off and never uses models without explicit activation',async()=>{
 const worker=(await import(uri)).default;const s=state();
 delete s.env.RECRUITMENT_CLOUD_AI_ENABLED;
 assert.equal((await worker.fetch(request(),s.env)).status,423);assert.equal(s.calls().model.length,0);
});
test('Scanner activation cannot be replaced by a manually marked clean DB row',async()=>{
 const worker=(await import(uri)).default;const s=state();
 delete s.env.RECRUITMENT_VERIFIED_SCANNER_ENABLED;
 assert.equal((await worker.fetch(request(),s.env)).status,423);
 assert.equal(s.calls().model.length,0);
 assert.equal(s.calls().commands.length,0);
});
test('Unscanned CV source cannot trigger Workers AI or reserve free quota',async()=>{
 const worker=(await import(uri)).default;const s=state({clean:false});
 assert.equal((await worker.fetch(request(),s.env)).status,409);
 assert.equal(s.calls().model.length,0);assert.equal(s.calls().commands.length,1);
});
test('AI daily quota blocks inference with no fallback or model request',async()=>{
 const worker=(await import(uri)).default;const s=state({quota:false});
 assert.equal((await worker.fetch(request(),s.env)).status,429);assert.equal(s.calls().model.length,0);
});
test('Synthetic, scanner-cleared evidence creates human-only bounded AI proposal',async()=>{
 const worker=(await import(uri)).default,s=state();
 const response=await worker.fetch(request(),s.env),data=await response.json();
 assert.equal(response.status,200);assert.equal(data.automatedDecision,false);
 assert.equal(data.humanReviewRequired,true);assert.deepEqual(data.matches,[{requirement:0,evidence:0}]);
 assert.deepEqual(data.unknown,[1]);assert.equal(s.calls().model.length,1);
 assert.equal(s.calls().model[0].name,'@cf/qwen/qwen3.8-27b');
 assert.equal(s.calls().model[0].options.max_tokens,192);
 assert.ok(s.calls().commands.some(c=>c.sql.startsWith('INSERT INTO ai_proposals')));
 assert.equal(JSON.stringify(data).includes(payload.evidence[0]),false);
});
test('Unstructured AI replies are never treated as verified or hired',async()=>{
 const worker=(await import(uri)).default,s=state();
 s.env.AI.run=async()=>({response:'Not a JSON verdict'});
 const response=await worker.fetch(request(),s.env),data=await response.json();
 assert.equal(response.status,503);assert.equal(data.code,'AI_UNVERIFIED');
 assert.ok(s.calls().commands.some(c=>c.sql.includes("SET state='failed'")));
});
