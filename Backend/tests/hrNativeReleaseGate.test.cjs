const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),net=require('node:net'),{spawn}=require('node:child_process');
const mongoose=require('mongoose');
test('Native Node release startup performs no automatic DDL or unapproved notification/provider work',async()=>{
 const timings=[];const owner=crypto.randomUUID(),database=`inop_native_gate_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,uri=`mongodb://127.0.0.1:${require('./helpers/localTestDatabase.cjs').port()}/${database}?directConnection=true`;
 const connection=await mongoose.createConnection(uri,{autoIndex:false,autoCreate:false}).asPromise();let owned=false,child,dir;
 try{
  assert.equal(connection.host,'127.0.0.1');assert.equal(connection.name,database);assert.ok(!(await connection.db.admin().listDatabases()).databases.some(d=>d.name===database));
  await connection.db.collection('owned_release_marker').insertOne({owner});owned=true;dir=fs.mkdtempSync(path.join(os.tmpdir(),'inop-native-release-'));
  const preload=path.join(dir,'preload.cjs');fs.writeFileSync(preload,`const Module=require('node:module'),original=Module._load;Module._load=function(name,...args){if(name==='dotenv')return{config:()=>({parsed:{}})};if(name.includes('applicationNotificationWorker.service'))return{createNotificationWorker:()=>{if(process.env.HR_NOTIFICATION_WORKER_ENABLED!=='true')throw Error('UNAPPROVED_WORKER');return{start:()=>console.log('OWNED_OPT_IN_WORKER')}}};return original.call(this,name,...args)};`);
  for(const enabled of [false,true]){
   const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
   const env={PATH:process.env.PATH,PORT:String(port),MONGO_URI:uri,JWT_SECRET:crypto.randomBytes(32).toString('hex'),NODE_ENV:'production',INOP_BUILD_SHA:'f'.repeat(40),HR_CV_PROCESSING_ENABLED:'false',HR_CV_OCR_ENABLED:'false',HR_CV_AI_PROCESSING_ENABLED:'false',...(enabled?{HR_NOTIFICATION_WORKER_ENABLED:'true'}:{})};
   const spawnAt=performance.now();let output='';child=spawn(process.execPath,['--require',preload,'server.js'],{cwd:path.join(__dirname,'..'),env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>output=(output+b).slice(-8000));child.stderr.on('data',b=>output=(output+b).slice(-8000));
   let healthy=false;const start=Date.now();while(Date.now()-start<15000){try{const r=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(500)});if(r.status===200&&(await r.json()).status==='ok'){healthy=true;break;}}catch{/* Server may still be starting. */}await new Promise(r=>setTimeout(r,50));}
   assert.ok(healthy,'Actual Native server must start and serve health');const version=await fetch(`http://127.0.0.1:${port}/version`);assert.equal(version.status,200);const metadata=(await version.json()).runtime;assert.equal(metadata.nodeMajor,24);assert.equal(metadata.gitSha,'f'.repeat(40));assert.equal(metadata.gitShaSource,'INOP_BUILD_SHA');const readiness=await fetch(`http://127.0.0.1:${port}/ready`);assert.equal(readiness.status,503);const readyBody=await readiness.json();assert.equal(readyBody.checks.database,true);assert.equal(readyBody.checks.transactions,true);assert.equal(readyBody.checks.storageConfigured,false);assert.equal(readyBody.productionSmokeVerified,false);timings.push({notificationWorkerEnabled:enabled,spawnToHealthMs:performance.now()-spawnAt,hosted:false});assert.equal((await fetch(`http://127.0.0.1:${port}/api/jobs`)).status,401);
   await new Promise(r=>setTimeout(r,250));assert.equal(output.includes('OWNED_OPT_IN_WORKER'),enabled);assert.ok(!output.includes('UNAPPROVED_WORKER'));
   assert.deepEqual((await connection.db.listCollections().toArray()).map(c=>c.name),['owned_release_marker'],'Startup creates no collection/index/seed/migration');
   const stopped=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await stopped;child=undefined;
  }
  fs.writeFileSync(path.join(os.tmpdir(),'inop-hr18-native-startup-'+owner+'.json'),JSON.stringify({node:process.version,productionTouched:false,timings},null,2));
 }finally{
  if(child){const stopped=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await stopped;}
  if(owned){assert.equal((await connection.db.collection('owned_release_marker').findOne()).owner,owner);await connection.dropDatabase();}
  await connection.close();if(dir)fs.rmSync(dir,{recursive:true});
 }
});
