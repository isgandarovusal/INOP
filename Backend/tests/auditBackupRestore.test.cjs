const{test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const{withAuditFixture}=require('./helpers/auditFixture.cjs'),{create,submit,upload,cleanup}=require('./helpers/reportFixture.cjs');
const canonical=value=>JSON.stringify(value,(key,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const digest=rows=>crypto.createHash('sha256').update(rows.map(canonical).sort().join('\n')).digest('hex');
test('Owned replica-set mongodump/restore and isolated evidence copy preserve source revisions, complete answers, metadata and indexes',{timeout:120000},async()=>withAuditFixture(async h=>{
 assert.equal(process.env.INOP_AUDIT_TEST_PORT,'27018');const container=process.env.INOP_AUDIT_QA_CONTAINER||'inop-audit-p09-qa',env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
 const docker=args=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env,encoding:'utf8',timeout:45000,maxBuffer:2*1024*1024});
 const inspected=JSON.parse(docker(['inspect',container]))[0];assert.ok(['audit-p09','audit-ci'].includes(inspected.Config.Labels['inop.task']));
 const source=h.mongoose.connection.name,target=`inop_audit_restore_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,archive='/tmp/inop-owned-restore-'+crypto.randomUUID()+'.gz',files=await fs.mkdtemp(path.join(os.tmpdir(),'inop-owned-restore-'));
 assert.match(source,/^inop_audit_test_\d+_[a-f0-9]{12}$/);const db=h.mongoose.connection.db,restored=db.client.db(target);assert.ok(!(await db.admin().listDatabases()).databases.some(d=>d.name===target));
 try{
  const row=await create(h,'standard','kfc',true),id=await upload(h,row.audit._id,'synthetic.pdf',Buffer.from('%PDF-1.4\nSynthetic restore only\n%%EOF'),'application/pdf');row.details.finalEvidence={documentIds:[id]};await submit(h,row);
  const evidence=await require('../models/auditEvidence.model').findById(id).lean(),ref=require('../services/auditEvidenceStorage.service').reference(evidence.storageReference,String(row.audit._id));assert.equal(ref.provider,'local');
  const backupFile=path.join(files,ref.key);await fs.copyFile(path.join(require('../middleware/privateUpload.middleware').uploadsDir,ref.key),backupFile);
  docker(['exec',container,'mongodump','--host=127.0.0.1:27017','--db='+source,'--archive='+archive,'--gzip','--quiet']);
  docker(['exec',container,'mongorestore','--host=127.0.0.1:27017','--archive='+archive,'--gzip','--nsFrom='+source+'.*','--nsTo='+target+'.*','--quiet']);
  const names=(await db.listCollections().toArray()).map(c=>c.name).sort();assert.deepEqual((await restored.listCollections().toArray()).map(c=>c.name).sort(),names);let documents=0;
  for(const name of names){const original=await db.collection(name).find({}).toArray(),copy=await restored.collection(name).find({}).toArray();assert.equal(digest(copy),digest(original),name);documents+=copy.length;const index=i=>({name:i.name,key:i.key,unique:Boolean(i.unique)});assert.equal(digest((await db.collection(name).indexes()).map(index)),digest((await restored.collection(name).indexes()).map(index)),name+' indexes');}
  const copy=await restored.collection(require('../models/auditEvidence.model').collection.name).findOne({_id:evidence._id});assert.deepEqual(copy.storageReference,ref);assert.equal(crypto.createHash('sha256').update(await fs.readFile(backupFile)).digest('hex'),copy.storageReference.sha256);
  console.log(JSON.stringify({scenario:'isolated DB and evidence restore',collections:names.length,documents,sourceDigestVerified:true,indexesVerified:true,evidenceHashVerified:true,productionAccess:false}));
 }finally{assert.match(target,/^inop_audit_restore_\d+_[a-f0-9]{12}$/);await restored.dropDatabase();docker(['exec',container,'rm','-f',archive]);await cleanup(h);await fs.rm(files,{recursive:true});}
}));
