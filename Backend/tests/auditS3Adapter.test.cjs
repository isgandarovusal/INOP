const {test}=require('node:test'),assert=require('node:assert/strict'),{Readable}=require('node:stream');
const {createAdapter}=require('../services/auditS3Adapter.service'),storage=require('../services/auditEvidenceStorage.service');
const {env,harness,pdf,auditId,privateXml,versionXml}=require('./helpers/auditS3Protocol.cjs');
test('S3 bootstrap is explicit, idempotent, performs no I/O and fails closed for missing/malformed bindings',()=>{
 const bootstrap=require('../services/auditStorageBootstrap.service'),registered=new Map(),registry={registerProvider:(id,f)=>{assert.ok(!registered.has(id));registered.set(id,f);}};let created=0;bootstrap.initialize({storage:registry,createAdapter:e=>{created++;return createAdapter(e);}});bootstrap.initialize({storage:registry});assert.equal(registered.size,1);assert.equal(created,0);
 for(const patch of [{AUDIT_EVIDENCE_STORAGE_ENABLED:'false'},{AUDIT_EVIDENCE_STORAGE_PRIVATE_BUCKET_APPROVED:'false'},{AUDIT_EVIDENCE_STORAGE_ENDPOINT:'http://example.com'},{AUDIT_EVIDENCE_STORAGE_ENDPOINT:'https://127.0.0.1'},{AUDIT_EVIDENCE_STORAGE_BUCKET:'../foreign'},{AUDIT_EVIDENCE_STORAGE_SECRET_ACCESS_KEY:'PRIVATE\nSECRET'},{AUDIT_EVIDENCE_STORAGE_ACCESS_KEY_ID:''}])assert.throws(()=>registered.get('s3')({...env,...patch}),e=>e.code==='AUDIT_STORAGE_NOT_CONFIGURED'&&!e.message.includes('PRIVATE'));
 bootstrap.initialize();assert.throws(()=>storage.fromEnvironment({NODE_ENV:'production'}),{code:'AUDIT_STORAGE_NOT_CONFIGURED'});assert.equal(storage.fromEnvironment(env).provider,'s3');
});
test('Versioned private conditional S3 put/get/remove preserves bytes and signed identity without changing Recruitment signature semantics',async()=>{
 const h=harness(),adapter=createAdapter(env,{transport:h.transport,now:()=>new Date('2026-10-19T00:00:00Z')}),store=storage.createPrivateStore(adapter),input=storage.prepare(pdf,'application/pdf',auditId,'s3');
 const ref=await store.put(input,pdf);assert.equal(ref.version,'v+1/=');assert.deepEqual(await store.get(ref),pdf);assert.ok(!JSON.stringify(ref).includes('synthetic-only'));assert.ok(h.requests.some(r=>r.url.includes('?publicAccessBlock=')));assert.ok(h.requests.some(r=>r.url.includes('?versioning=')));await assert.rejects(store.put(input,pdf),{code:'AUDIT_STORAGE_WRITE_CONFLICT'});await store.remove(ref);assert.equal(h.objects.size,0);
});
test('Public/suspended buckets, invalid receipts, redirects, tampering and secret-bearing provider exceptions never succeed',async()=>{
 const input=storage.prepare(pdf,'application/pdf',auditId,'s3');
 for(const scenario of ['public','duplicate-policy','suspended','missing-version','wrong-encryption','wrong-read-version','redirect','exception','tamper']){
  const h=harness();if(scenario==='public')h.setPolicy(privateXml.replace('<BlockPublicPolicy>true','<BlockPublicPolicy>false'));if(scenario==='duplicate-policy')h.setPolicy(privateXml.replace('</PublicAccessBlockConfiguration>','<BlockPublicPolicy>false</BlockPublicPolicy></PublicAccessBlockConfiguration>'));if(scenario==='suspended')h.setState(versionXml.replace('Enabled','Suspended'));
  const transport=async r=>{if(scenario==='exception')throw Object.assign(Error('PRIVATE_CREDENTIAL'),{code:'AUDIT_STORAGE_INVALID_RECEIPT'});const result=await h.transport(r);if(r.method==='PUT'&&scenario==='missing-version')delete result.headers['x-amz-version-id'];if(r.method==='PUT'&&scenario==='wrong-encryption')result.headers['x-amz-server-side-encryption']='';if(new URL(r.url).searchParams.has('versionId')&&scenario==='wrong-read-version')result.headers['x-amz-version-id']='other';if(scenario==='redirect')result.status=302;if(new URL(r.url).searchParams.has('versionId')&&scenario==='tamper')result.body=Readable.from([Buffer.from('tampered')]);return result;};
  await assert.rejects(storage.createPrivateStore(createAdapter(env,{transport})).put(input,pdf),e=>e.status>=400&&!e.message.includes('PRIVATE'),scenario);
  if(['public','duplicate-policy','suspended'].includes(scenario))assert.ok(!h.requests.some(r=>r.method==='PUT'));
 }
});
test('Protocol adapter rejects foreign key shapes, unversioned access, cancellation and metadata mutation before sending object requests',async()=>{
 const h=harness(),adapter=createAdapter(env,{transport:h.transport}),abort=new AbortController();abort.abort();
 await assert.rejects(adapter.get({key:'hr/cv/foreign',version:'v',signal:abort.signal}),{code:'AUDIT_STORAGE_INVALID_REFERENCE'});
 const key=storage.prepare(pdf,'application/pdf',auditId,'s3').key;for(const v of [undefined,'null','', 'bad\nversion'])await assert.rejects(adapter.get({key,version:v,signal:new AbortController().signal}),{code:'AUDIT_STORAGE_INVALID_REFERENCE'});
 await assert.rejects(adapter.get({key,version:'v',signal:abort.signal}),{code:'AUDIT_STORAGE_TIMEOUT'});assert.equal(h.requests.length,0);
});
test('Ambiguous or nested bucket XML fails closed before any object write',async()=>{
 const cases=[
  {state:versionXml.replace('</VersioningConfiguration>','<Status>Disabled</Status></VersioningConfiguration>')},
  {state:'<VersioningConfiguration><Unexpected><Status>Enabled</Status></Unexpected></VersioningConfiguration>'},
  {policy:privateXml.replace('<PublicAccessBlockConfiguration>','<PublicAccessBlockConfiguration><Unexpected>').replace('</PublicAccessBlockConfiguration>','</Unexpected></PublicAccessBlockConfiguration>')},
  {state:versionXml.replace('</VersioningConfiguration>','<Unexpected>Enabled</Unexpected></VersioningConfiguration>')},
 ];
 for(const sample of cases){const h=harness();if(sample.state)h.setState(sample.state);if(sample.policy)h.setPolicy(sample.policy);
  const adapter=createAdapter(env,{transport:h.transport}),input=storage.prepare(pdf,'application/pdf',auditId,'s3');
  await assert.rejects(storage.createPrivateStore(adapter).put(input,pdf),e=>e.status===503);
  assert.ok(!h.requests.some(r=>r.method==='PUT'));
 }
});
test('Standard S3 XML namespace, declaration, whitespace and optional MFA status preserve private versioned reads',async()=>{
 const h=harness(),namespace=' xmlns="http://s3.amazonaws.com/doc/2006-03-01/"';
 h.setPolicy('<?xml version="1.0" encoding="UTF-8"?>\n'+privateXml.replace('<PublicAccessBlockConfiguration>','<PublicAccessBlockConfiguration'+namespace+'>'));
 h.setState(versionXml.replace('<VersioningConfiguration>','<VersioningConfiguration'+namespace+'>').replace('</VersioningConfiguration>','<MfaDelete>Disabled</MfaDelete></VersioningConfiguration>'));
 const store=storage.createPrivateStore(createAdapter(env,{transport:h.transport})),ref=await store.put(storage.prepare(pdf,'application/pdf',auditId,'s3'),pdf);
 assert.deepEqual(await store.get(ref),pdf);
});
