// Explicit isolated QA only. No startup/route/worker registration or live stores.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {createScanner}=require('../services/hrClamScan.service');
const {syntheticFixtures}=require('./verifyNativeClamav.cjs');
const {workerRescan,legacyClosed}=require('../tests/helpers/clamdWorkerContract.cjs');
const gates=['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'].map(k=>'HR_CV_'+k+'_ENABLED');
const ids=['resource_limits','freshclam','signature_integrity','signature_freshness','startup','clean_pdf','clean_docx','eicar_raw','eicar_docx','wrong_hash','missing_socket','daemon_unavailable','legacy_fail_closed','restart','timeout','two_concurrent','third_concurrent','stale_clock_simulation','worker_rescan_stubbed_persistence','offline_protocol_regression'];
const metricNames=['freshclamMs','freshclamCpuMs','freshclamPeakBytes','startupMs','restartMs','idleBytes','peakBytes','cpuPeakPercent','cpuTotalMs','pdfMs','docxMs','eicarRawMs','eicarDocxMs','concurrentMs'];
const fixedEnv={PATH:'/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',LANG:'C',LC_ALL:'C',TZ:'UTC',HOME:'/qa'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function config(socket){return Object.entries({Foreground:'yes',LocalSocket:socket,LocalSocketMode:'660',DatabaseDirectory:'/qa/db',TemporaryDirectory:'/qa/tmp',FixStaleSocket:'yes',MaxThreads:'2',MaxQueue:'4',StreamMaxLength:'5M',MaxFileSize:'5M',MaxScanSize:'20M',MaxRecursion:'8',MaxFiles:'100',MaxScanTime:'10000',AlertExceedsMax:'yes',AlertEncrypted:'yes',ScanArchive:'yes',ScanPDF:'yes',ScanOLE2:'yes',ScanPE:'yes',ScanELF:'yes',LeaveTemporaryFiles:'no',ConcurrentDatabaseReload:'no'}).map(([k,v])=>`${k} ${v}`).join('\n')+'\n';}
function validateReport(r){
 assert.deepEqual(Object.keys(r).sort(),['engineVersion','metrics','productionReady','resourceLimit','signatureTimestamp','tests']);assert.equal(r.productionReady,false);assert.equal(r.resourceLimit,'PASS');
 assert.match(r.engineVersion,/^[\d.]{1,20}-db\d{1,12}$/);assert.match(r.signatureTimestamp,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/);
 assert.deepEqual(Object.keys(r.metrics).sort(),[...metricNames].sort());for(const v of Object.values(r.metrics))assert.ok(Number.isFinite(v)&&v>=0&&v<=1e12);
 assert.equal(r.tests.length,ids.length);r.tests.forEach((t,i)=>{assert.deepEqual(Object.keys(t).sort(),['id','status']);assert.equal(t.id,ids[i]);assert.equal(t.status,'PASS');});
 return r;
}
function signatureMetadata(info,engineText,now=Date.now()){
 const built=/^Build time: ([^\r\n]{1,80})$/m.exec(info),db=/^Version: (\d{1,12})$/m.exec(info),engine=/^ClamAV ([\d.]{1,20})(?:\/\d{1,12}\/[^\r\n]{1,80})?$/.exec(engineText.trim());
 assert.ok(built&&db&&engine);const date=Date.parse(built[1]),age=now-date;assert.ok(Number.isFinite(age)&&age>=-300000&&age<=86400000);
 return{engineVersion:engine[1]+'-db'+db[1],signatureTimestamp:new Date(date).toISOString()};
}
async function command(binary,args,limitMs=300000){return new Promise((resolve,reject)=>{
 let text='',size=0,done=false;const p=spawn(binary,args,{env:fixedEnv,stdio:['ignore','pipe','pipe'],shell:false});
 const timer=setTimeout(()=>{p.kill('SIGKILL');finish(false);},limitMs);
 function finish(ok){if(done)return;done=true;clearTimeout(timer);ok?resolve(text):reject(Error('QA command failed'));}
 for(const stream of [p.stdout,p.stderr])stream.on('data',b=>{if((size+=b.length)>1024*1024){p.kill('SIGKILL');finish(false);}else text+=b.toString();});
 p.once('error',()=>finish(false));p.once('close',code=>finish(code===0));
 });}
async function counters(){const [m,c]=await Promise.all([fs.readFile('/sys/fs/cgroup/memory.current','utf8'),fs.readFile('/sys/fs/cgroup/cpu.stat','utf8')]);return{memory:Number(m),cpu:Number(/^usage_usec (\d+)$/m.exec(c)?.[1]),time:performance.now()};}
async function main({execute=false,env=process.env}={}){
 if(!execute||env.INOP_CLAMD_UNIX_QA_ENABLED!=='true'||env.GITHUB_ACTIONS!=='true'||env.RENDER==='true'||gates.some(k=>env[k]!==undefined&&env[k]!=='false'))throw Error('QA disabled');
 const report={engineVersion:'',signatureTimestamp:'',resourceLimit:'PASS',productionReady:false,metrics:Object.fromEntries(metricNames.map(k=>[k,0])),tests:[]};
 let stage=ids[0],daemon,timer,dailyMetadata,sampling=Promise.resolve(),samplingError=false;const passed=id=>report.tests.push({id,status:'PASS'});
 let previous=await counters(),initialCpu=previous.cpu;
 async function sample(){const next=await counters();report.metrics.peakBytes=Math.max(report.metrics.peakBytes,next.memory);report.metrics.cpuPeakPercent=Math.max(report.metrics.cpuPeakPercent,(next.cpu-previous.cpu)/((next.time-previous.time)*10));previous=next;}
 async function stop(){if(!daemon)return;const p=daemon;daemon=undefined;if(p.exitCode!==null||p.signalCode)return;await new Promise(resolve=>{const kill=setTimeout(()=>p.kill('SIGKILL'),5000);p.once('close',()=>{clearTimeout(kill);resolve();});p.kill('SIGCONT');p.kill('SIGTERM');});}
 const socket='/qa/run/clamd.sock',policy='/qa/run/clamd.conf',options={enabled:true,transport:'clamd-unix',socketPath:socket,daemonConfigPath:policy};
 const scanner=createScanner(options);
 async function start(){await fs.rm(socket,{force:true});daemon=spawn('/usr/sbin/clamd',['--config-file='+policy],{env:fixedEnv,stdio:'ignore',shell:false});let failed=false;daemon.once('error',()=>{failed=true;});const started=performance.now();while(performance.now()-started<90000){if(failed||daemon.exitCode!==null||daemon.signalCode)throw Error('Daemon failed');if(await fs.stat(socket).then(s=>s.isSocket(),()=>false)){const ready=await scanner.readiness();assert.equal(ready.daemonReachable,true);assert.equal(ready.engineInitialized,true);assert.equal(ready.signaturesFresh,true);assert.equal(ready.ready,true);return performance.now()-started;}await sleep(100);}throw Error('Daemon startup deadline');}
 async function step(id,fn){stage=id;await fn();passed(id);}
 try{
 await step('resource_limits',async()=>{assert.equal((await fs.readFile('/sys/fs/cgroup/memory.max','utf8')).trim(),'4294967296');assert.equal((await fs.readFile('/sys/fs/cgroup/memory.swap.max','utf8')).trim(),'0');const [quota,period]=(await fs.readFile('/sys/fs/cgroup/cpu.max','utf8')).trim().split(/\s+/).map(Number);assert.equal(quota/period,2);});
 timer=setInterval(()=>{sampling=sampling.then(sample).catch(()=>{samplingError=true;clearInterval(timer);});},100);
 await Promise.all(['db','run','tmp'].map(dir=>fs.mkdir('/qa/'+dir,{recursive:true,mode:0o700})));
 await fs.writeFile(policy,config(socket),{mode:0o600});
 await fs.writeFile('/qa/freshclam.conf','DatabaseDirectory /qa/db\nDatabaseOwner node\nDatabaseMirror database.clamav.net\nTestDatabases yes\nConnectTimeout 20\nReceiveTimeout 60\nMaxAttempts 1\n',{mode:0o600});
 await step('freshclam',async()=>{const at=performance.now(),before=await counters();await command('/usr/bin/freshclam',['--config-file=/qa/freshclam.conf','--stdout','--checks=1'],300000);report.metrics.freshclamMs=performance.now()-at;report.metrics.freshclamCpuMs=((await counters()).cpu-before.cpu)/1000;report.metrics.freshclamPeakBytes=Number((await fs.readFile('/sys/fs/cgroup/memory.peak','utf8')).trim());});
 await step('signature_integrity',async()=>{const files=await fs.readdir('/qa/db');for(const base of ['main','daily','bytecode']){const name=files.find(f=>f===base+'.cvd'||f===base+'.cld');assert.ok(name);const info=await command('/usr/bin/sigtool',['--info',path.join('/qa/db',name)]);assert.match(info,/Verification OK\./);if(base==='daily')dailyMetadata=info;}});
 await step('signature_freshness',async()=>{Object.assign(report,signatureMetadata(dailyMetadata,await command('/usr/bin/clamscan',['--version'])));});
 await step('startup',async()=>{report.metrics.startupMs=await start();await sample();report.metrics.idleBytes=previous.memory;});
 const fixtures=await syntheticFixtures();assert.deepEqual(fixtures.map(f=>f.label),['clean_pdf','clean_docx','eicar_raw','eicar_docx']);
 const context=f=>({sha256:hash(f.bytes),mimeType:f.mimeType});
 for(const [i,f]of fixtures.entries())await step(f.label,async()=>{const at=performance.now(),r=await scanner.scan(f.bytes,context(f));assert.equal(r.verdict,f.expected);assert.equal(r.sha256,hash(f.bytes));assert.equal(r.engine,'clamav');assert.equal(r.version,report.engineVersion);report.metrics[['pdfMs','docxMs','eicarRawMs','eicarDocxMs'][i]]=performance.now()-at;});
 const pdf=fixtures[0];
 await step('wrong_hash',async()=>assert.rejects(scanner.scan(pdf.bytes,{...context(pdf),sha256:'0'.repeat(64)}),{code:'AV_INPUT'}));
 await step('missing_socket',async()=>{await fs.writeFile('/qa/run/missing.conf',config('/qa/run/missing.sock'),{mode:0o600});await assert.rejects(createScanner({...options,socketPath:'/qa/run/missing.sock',daemonConfigPath:'/qa/run/missing.conf'}).scan(pdf.bytes,context(pdf)));});
 await stop();
 await step('daemon_unavailable',async()=>{await assert.rejects(scanner.scan(pdf.bytes,context(pdf)));assert.equal((await scanner.readiness()).ready,false);});
 await step('legacy_fail_closed',async()=>legacyClosed(scanner,pdf));
 await step('restart',async()=>{report.metrics.restartMs=await start();});
 await step('timeout',async()=>{daemon.kill('SIGSTOP');try{await assert.rejects(scanner.scan(pdf.bytes,context(pdf)),{code:'AV_TIMEOUT'});}finally{daemon.kill('SIGCONT');}assert.equal((await scanner.readiness()).ready,true);});
 stage='two_concurrent';const at=performance.now(),first=scanner.scan(pdf.bytes,context(pdf)),second=scanner.scan(fixtures[1].bytes,context(fixtures[1]));const third=assert.rejects(scanner.scan(pdf.bytes,context(pdf)),{code:'AV_BUSY'});const results=await Promise.all([first,second,third]);assert.equal(results[0].verdict,'clean');assert.equal(results[1].verdict,'clean');report.metrics.concurrentMs=performance.now()-at;passed('two_concurrent');passed('third_concurrent');
 await step('stale_clock_simulation',async()=>{const stale=createScanner({...options,now:()=>new Date(Date.now()+25*3600000)});await assert.rejects(stale.scan(pdf.bytes,context(pdf)),{code:'AV_DEFINITIONS'});assert.equal((await stale.readiness()).ready,false);});
 await step('worker_rescan_stubbed_persistence',async()=>workerRescan(scanner,pdf));
 await stop();
 await step('offline_protocol_regression',async()=>{await command(process.execPath,['--test','--test-concurrency=1','--test-skip-pattern=owned synthetic DB only|Real legacy HTTP','Backend/tests/hrClamScan.test.cjs','Backend/tests/hrClamdUnix.test.cjs','Backend/tests/hrCvIntakeProfiles.test.cjs','Backend/tests/hrCvIntakeWorker.test.cjs','Backend/tests/legacyCvScan.test.cjs'],120000);});
 clearInterval(timer);await sampling;assert.equal(samplingError,false);await sample();report.metrics.cpuTotalMs=(previous.cpu-initialCpu)/1000;const peak=Number((await fs.readFile('/sys/fs/cgroup/memory.peak','utf8')).trim());assert.ok(Number.isFinite(peak)&&peak<=4294967296);report.metrics.peakBytes=Math.max(peak,report.metrics.peakBytes);
 const events=await fs.readFile('/sys/fs/cgroup/memory.events','utf8');assert.equal(Number(/^oom_kill (\d+)$/m.exec(events)?.[1]),0);assert.equal(Number(/^oom (\d+)$/m.exec(events)?.[1]),0);
 return validateReport(report);
 }catch{throw Object.assign(Error('Persistent synthetic QA failed'),{stage:ids.includes(stage)?stage:'resource_limits'});}
 finally{clearInterval(timer);await sampling;await stop();await fs.rm('/qa/run/clamd.sock',{force:true});}
}
function validateFailure(r){assert.deepEqual(Object.keys(r).sort(),['id','status']);assert.ok(ids.includes(r.id));assert.equal(r.status,'FAIL');return r;}
if(require.main===module){const args=process.argv.slice(2);if(args.length===2&&args[0]==='--failure-summary'){fs.readFile(args[1],'utf8').then(text=>{assert.ok(Buffer.byteLength(text)<=1024);console.log(JSON.stringify(validateFailure(JSON.parse(text))));}).catch(()=>{process.exitCode=1;});}else if(args.length===2&&args[0]==='--validate-report'){fs.readFile(args[1],'utf8').then(text=>{assert.ok(Buffer.byteLength(text)<=16384);validateReport(JSON.parse(text));}).catch(()=>{process.exitCode=1;});}else main({execute:args.length===1&&args[0]==='--synthetic-only'}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.log(JSON.stringify({id:ids.includes(e.stage)?e.stage:'resource_limits',status:'FAIL'}));process.exitCode=1;});}
module.exports={main,validateReport,validateFailure,signatureMetadata,config,ids,metricNames,command};
