const test=require('node:test'),assert=require('node:assert/strict'),net=require('node:net'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createScanner}=require('../services/hrClamScan.service');
const {syntheticFixtures}=require('../scripts/verifyNativeClamav.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const current='ClamAV 1.5.4/28166/Thu Oct 29 08:00:00 2026';
function policy(socketPath){return Object.entries({Foreground:'yes',LocalSocket:socketPath,LocalSocketMode:'660',MaxThreads:'2',MaxQueue:'4',StreamMaxLength:'5M',MaxFileSize:'5M',MaxScanSize:'20M',MaxRecursion:'8',MaxFiles:'100',MaxScanTime:'10000',AlertExceedsMax:'yes',AlertEncrypted:'yes',ScanArchive:'yes',ScanPDF:'yes',ScanOLE2:'yes',ScanPE:'yes',ScanELF:'yes',LeaveTemporaryFiles:'no',ConcurrentDatabaseReload:'no'}).map(([k,v])=>`${k} ${v}`).join('\n')+'\n';}
async function fixture(callback){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inop-clamd-')),socketPath=path.join(dir,'scan.sock'),daemonConfigPath=path.join(dir,'clamd.conf');
 await fs.writeFile(daemonConfigPath,policy(socketPath),{mode:0o600});
 const s={version:current,requests:[],scans:[],held:[],hold:false,reply:undefined,sockets:new Set()};let server;
 async function start(){
  server=net.createServer(socket=>{
   s.sockets.add(socket);socket.on('error',()=>{});socket.on('close',()=>s.sockets.delete(socket));let pending=Buffer.alloc(0),command,frames=[];
   socket.on('data',data=>{
    pending=Buffer.concat([pending,data]);
    if(!command){const end=pending.indexOf(0);if(end<0)return;command=pending.subarray(0,end).toString();pending=pending.subarray(end+1);s.requests.push(command);
     if(command==='zPING'){socket.end('PONG\0');return;}
     if(command==='zVERSION'){socket.end((typeof s.version==='function'?s.version():s.version)+'\0');return;}
     assert.equal(command,'zINSTREAM');
    }
    if(command!=='zINSTREAM')return;
    while(pending.length>=4){const length=pending.readUInt32BE(0);if(pending.length<4+length)return;
     frames.push(pending.subarray(4,4+length));pending=pending.subarray(4+length);
     if(!length){const bytes=Buffer.concat(frames);s.scans.push(Buffer.from(bytes));
      if(s.hold){s.held.push(socket);return;}
      const reply=s.reply===undefined?'stream: OK\0':typeof s.reply==='function'?s.reply(bytes):s.reply;
      if(reply===null)socket.destroy();else socket.end(reply);return;
     }
    }
   });
  });
  await new Promise(resolve=>server.listen(socketPath,resolve));await fs.chmod(socketPath,0o600);
 }
 async function stop(){for(const socket of s.sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
 s.restart=async()=>{await stop();await start();};s.stop=stop;
 s.options={enabled:true,transport:'clamd-unix',socketPath,daemonConfigPath,now:()=>new Date('2026-10-29T12:00:00Z')};s.dir=dir;
 await start();try{return await callback(s);}finally{if(server.listening)await stop();await fs.rm(dir,{recursive:true,force:true});}
}
const context=bytes=>({sha256:sha(bytes),mimeType:'application/pdf'});

test('Unix transport is explicit, default-off and cannot select TCP, abstract sockets or relaxed limits',async()=>{
 const off=createScanner({transport:'clamd-unix'});assert.equal(off.health().configured,false);assert.equal((await off.readiness()).ready,false);await assert.rejects(off.scan(Buffer.from('%PDF'),{}),{code:'AV_DISABLED'});
 await fixture(async s=>{for(const extra of [{socketPath:'tcp://localhost:3310'},{socketPath:'relative.sock'},{socketPath:'\0abstract'},{timeoutMs:10001},{maxDefinitionAgeHours:25},{socketUid:-1},{daemonConfigPath:undefined}])assert.throws(()=>createScanner({...s.options,...extra}),{code:'AV_CONFIGURATION'});});
 assert.throws(()=>createScanner({transport:'tcp'}),{code:'AV_CONFIGURATION'});
});
test('Mock Unix engine: clean PDF/DOCX and EICAR verdicts bind immutable original bytes; readiness requires real protocol work',async()=>fixture(async s=>{
 const cases=await syntheticFixtures(),infected=new Set(cases.filter(x=>x.expected==='infected').map(x=>sha(x.bytes)));
 s.reply=b=>infected.has(sha(b))?'stream: Eicar-Test-Signature FOUND\0':'stream: OK\0';
 const scanner=createScanner(s.options);assert.equal(scanner.health().ready,false);
 for(const f of cases){const bytes=Buffer.from(f.bytes),promise=scanner.scan(bytes,{sha256:sha(bytes),mimeType:f.mimeType});bytes.fill(0);const result=await promise;assert.equal(result.verdict,f.expected);assert.equal(result.sha256,sha(f.bytes));assert.equal(result.engine,'clamav');assert.deepEqual(s.scans.at(-1),f.bytes);}
 const status=await scanner.readiness();for(const key of ['configured','daemonReachable','engineInitialized','signaturesFresh','ready'])assert.equal(status[key],true,key);assert.equal(status.realScannerVerified,false);assert.ok(!JSON.stringify(status).includes(s.dir));
}));
test('Stale/malformed/future engine versions stop before transmitting any file',async()=>fixture(async s=>{
 const scanner=createScanner(s.options),bytes=Buffer.from('%PDF fixture');
 for(const version of ['ClamAV 1.5.4/1/Sun Oct 25 06:00:00 2026','ClamAV 1.5.4/1/Fri Oct 30 06:00:00 2026','PONG']){s.version=version;await assert.rejects(scanner.scan(bytes,context(bytes)),{code:'AV_DEFINITIONS'});assert.equal(s.scans.length,0);assert.equal(scanner.health().ready,false);}
 s.version='ClamAV 1.5.4/1/Sun Oct 25 06:00:00 2026';const health=await scanner.readiness();assert.equal(health.daemonReachable,true);assert.equal(health.engineInitialized,true);assert.equal(health.signaturesFresh,false);
}));
test('Private socket ownership/permissions and protected explicit daemon policy fail closed',async()=>fixture(async s=>{
 const bytes=Buffer.from('%PDF fixture');
 for(const modified of [policy(s.options.socketPath).replace('MaxScanTime 10000','MaxScanTime 120000'),policy(s.options.socketPath).replace('ScanPDF yes','ScanPDF no'),policy(s.options.socketPath)+'Include /unsafe\n',policy(s.options.socketPath)+'MaxThreads 2\n']){
  await fs.writeFile(s.options.daemonConfigPath,modified);await assert.rejects(createScanner(s.options).scan(bytes,context(bytes)),{code:'AV_CONFIGURATION'});
 }
 await fs.writeFile(s.options.daemonConfigPath,policy(s.options.socketPath));await fs.chmod(s.options.socketPath,0o666);
 await assert.rejects(createScanner(s.options).scan(bytes,context(bytes)),{code:'AV_CONFIGURATION'});await fs.chmod(s.options.socketPath,0o600);
 const alias=path.join(s.dir,'alias.sock');await fs.symlink(s.options.socketPath,alias);await assert.rejects(createScanner({...s.options,socketPath:alias}).scan(bytes,context(bytes)),{code:'AV_CONFIGURATION'});
 await assert.rejects(createScanner({...s.options,socketUid:process.getuid()+1}).scan(bytes,context(bytes)),{code:'AV_CONFIGURATION'});assert.equal(s.scans.length,0);
}));
test('Wrong hash and invalid file size/MIME never reach the daemon',async()=>fixture(async s=>{
 const scanner=createScanner(s.options),bytes=Buffer.from('%PDF fixture');
 for(const [b,c]of [[bytes,{...context(bytes),sha256:'0'.repeat(64)}],[bytes,{...context(bytes),mimeType:'text/plain'}],[Buffer.alloc(0),{}],[Buffer.alloc(5*1024*1024+1),{}]])await assert.rejects(scanner.scan(b,c),{code:'AV_INPUT'});
 assert.equal(s.requests.length,0);
}));
test('Malformed/inconclusive/incomplete replies never become clean; recovery requires a new socket identity',async()=>fixture(async s=>{
 const bytes=Buffer.from('%PDF fixture');
 for(const reply of ['stream: OK','stream: OK\0extra\0','secret=UNTRUSTED\0','stream: incomplete scan ERROR\0','x'.repeat(4097)+'\0',null]){
  const scanner=createScanner(s.options);s.reply=reply;await assert.rejects(scanner.scan(bytes,context(bytes)),e=>e.code==='AV_UNAVAILABLE'&&!e.message.includes('UNTRUSTED'));assert.equal(scanner.health().ready,false);
  const count=s.scans.length;s.reply=undefined;await assert.rejects(scanner.scan(bytes,context(bytes)),{code:'AV_RECOVERY_REQUIRED'});assert.equal(s.scans.length,count);
  await s.restart();assert.equal((await scanner.scan(bytes,context(bytes))).verdict,'clean');
 }
}));
test('Version changes or daemon restart during a scan withhold its verdict',async()=>fixture(async s=>{
 const bytes=Buffer.from('%PDF fixture'),scanner=createScanner(s.options);let versions=0;
 s.version=()=>++versions===1?current:'ClamAV 1.5.4/28167/Thu Oct 29 09:00:00 2026';await assert.rejects(scanner.scan(bytes,context(bytes)),{code:'AV_DEFINITIONS'});
 s.version=current;s.reply=null;await assert.rejects(scanner.scan(bytes,context(bytes)),{code:'AV_UNAVAILABLE'});await s.restart();s.reply=undefined;assert.equal((await scanner.readiness()).ready,true);
 await s.stop();const missing=await scanner.readiness();assert.equal(missing.ready,false);assert.equal(missing.daemonReachable,false);
}));
test('Two timed-out scans retain capacity until daemon settlement; third request cannot start and no retry occurs',async()=>fixture(async s=>{
 const bytes=Buffer.from('%PDF fixture'),scanner=createScanner({...s.options,timeoutMs:150});s.hold=true;
 const results=await Promise.allSettled([scanner.scan(bytes,context(bytes)),scanner.scan(bytes,context(bytes))]);assert.ok(results.every(r=>r.status==='rejected'&&r.reason.code==='AV_TIMEOUT'));assert.equal(scanner.health().active,2);assert.equal(s.scans.length,2);
 await assert.rejects(scanner.scan(bytes,context(bytes)),{code:'AV_BUSY'});assert.equal(s.scans.length,2);
 const closed=s.held.map(socket=>new Promise(resolve=>socket.once('close',resolve)));for(const socket of s.held)socket.end('stream: OK\0');await Promise.all(closed);
 assert.equal(scanner.health().active,0);s.hold=false;assert.equal((await scanner.scan(bytes,context(bytes))).verdict,'clean');
}));
test('Unix scanner fits existing intake re-scan, metadata and legacy fail-closed contracts (owned synthetic DB only)',async()=>require('./helpers/auditFixture.cjs').withAuditFixture(async h=>fixture(async s=>{
 const {createIntake}=require('../services/hrCvIntake.service'),Source=require('../models/hrCvIntake.model'),profiles=require('../services/hrCvIntakeProfiles.service');
 await Source.createIndexes();const scanner=createScanner(s.options),objects=new Map(),bytes=(await syntheticFixtures()).find(f=>f.label==='clean_docx').bytes;
 const intake=createIntake({enabled:true,evidenceMode:'test',scanBeforePersistence:true,scanner,store:{get:async b=>{if(!objects.has(b.key))throw Object.assign(Error("synthetic missing"),{code:"STORAGE_NOT_FOUND"});return Buffer.from(objects.get(b.key));},put:async(b,v)=>objects.set(b.key,Buffer.from(v))}}),req={headers:{authorization:'Bearer '+h.tokens.admin}};
 const source=await intake.enqueue(req,{buffer:bytes,originalname:'synthetic.docx',mimetype:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},crypto.randomUUID());assert.equal(s.scans.length,1);await intake.runOnce(1);assert.equal(s.scans.length,2);assert.equal((await intake.get(req,source.id)).state,'ready');
 await s.stop();assert.equal((await intake.list(req)).items.length,1);assert.equal((await intake.get(req,source.id)).id,source.id);
 const previous=profiles.scanner;profiles.scanner=()=>scanner;
 try{const body=new FormData();body.append('cv',new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'synthetic.docx');const r=await fetch(h.apiBase+'/candidates/parse-cv',{method:'POST',headers:{Authorization:'Bearer '+h.tokens.admin},body});assert.equal(r.status,503);assert.equal((await r.json()).code,'INTAKE_SCAN_REQUIRED');}
 finally{profiles.scanner=previous;}
 assert.equal(await require('../models/candidate.model').countDocuments(),0);assert.equal(await require('../models/application.model').countDocuments(),0);
}))); 

test('Readiness never certifies an infected probe or an expired prior observation',async()=>fixture(async s=>{
 let clock=new Date('2026-10-29T12:00:00Z');const scanner=createScanner({...s.options,now:()=>clock});
 s.reply='stream: Synthetic-Test FOUND\0';assert.equal((await scanner.readiness()).ready,false);
 s.reply=undefined;assert.equal((await scanner.readiness()).ready,true);const scans=s.scans.length;
 clock=new Date('2026-10-30T12:00:00Z');assert.equal(scanner.health().ready,false);assert.equal(scanner.health().signaturesFresh,false);
 assert.equal((await scanner.readiness()).ready,false);assert.equal(s.scans.length,scans);
}));
test('Protected policy changes during a scan cannot produce a clean verdict',async()=>fixture(async s=>{
 const bytes=Buffer.from('%PDF fixture');s.reply=()=>{require('node:fs').appendFileSync(s.options.daemonConfigPath,'# changed during scan\n');return 'stream: OK\0';};
 await assert.rejects(createScanner(s.options).scan(bytes,context(bytes)),{code:'AV_DEFINITIONS'});
}));
