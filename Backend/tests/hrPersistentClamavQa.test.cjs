const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),yaml=require('js-yaml');
const {main,validateReport,validateFailure,signatureMetadata,config,ids,metricNames,command}=require('../scripts/verifyPersistentClamav.cjs');
const {workerRescan,legacyClosed}=require('./helpers/clamdWorkerContract.cjs');
const {syntheticFixtures}=require('../scripts/verifyNativeClamav.cjs');
const root=path.join(__dirname,'../..'),source=fs.readFileSync(path.join(root,'.github/workflows/clamav-synthetic-qa.yml'),'utf8'),w=yaml.load(source),job=w.jobs['persistent-unix-qa'];
const approved='a'.repeat(40);
function allowed(overrides={}){const context={github:{repository:'isgandarovusal/INOP',ref:'refs/heads/inop-main',actor:'isgandarovusal',triggering_actor:'isgandarovusal',event_name:'workflow_dispatch'},inputs:{mode:'persistent-unix',run_native_qa:true},vars:{INOP_CLAMD_UNIX_QA_ENABLED:'true'},...overrides};return vm.runInNewContext(job.if,context);}
function safeReport(){return{engineVersion:'1.5.4-db28166',signatureTimestamp:'2026-10-29T08:00:00.000Z',productionReady:false,resourceLimit:'PASS',metrics:Object.fromEntries(metricNames.map(k=>[k,1])),tests:ids.map(id=>({id,status:'PASS'}))};}
test('Persistent QA is manual, explicit, owner-only, main-only, default-off and no rerun bypass',()=>{
 assert.deepEqual(Object.keys(w.on),['workflow_dispatch']);assert.equal(w.on.workflow_dispatch.inputs.run_native_qa.default,false);assert.equal(w.on.workflow_dispatch.inputs.mode.default,'native');assert.deepEqual(w.on.workflow_dispatch.inputs.mode.options,['native','persistent-unix']);assert.deepEqual(w.permissions,{contents:'read'});assert.equal(w.concurrency.group,'clamav-synthetic-qa-single');assert.equal(w.concurrency['cancel-in-progress'],false);
 assert.equal(allowed(),true);
 for(const context of [{vars:{}},{vars:{INOP_CLAMD_UNIX_QA_ENABLED:'false'}},{inputs:{mode:'native',run_native_qa:true}},{inputs:{mode:'persistent-unix',run_native_qa:false}},...['repository','ref','actor','triggering_actor','event_name'].map(k=>({github:{repository:'isgandarovusal/INOP',ref:'refs/heads/inop-main',actor:'isgandarovusal',triggering_actor:'isgandarovusal',event_name:'workflow_dispatch',[k]:'unauthorized'}}))])assert.equal(allowed(context),false);
 const gate=job.steps[0];assert.equal(gate.env.REVIEWED_SHA,'${{ inputs.reviewed_sha }}');assert.equal(gate.env.EXECUTION_SHA,'${{ github.sha }}');
 for(const [sha,current,attempt,ok]of [[approved,approved,'1',true],[approved,'b'.repeat(40),'1',false],['bad',approved,'1',false],[approved,approved,'2',false],[approved+'\necho PRIVATE',approved,'1',false]]){
  const r=cp.spawnSync('bash',['-c',gate.run],{env:{PATH:process.env.PATH,REVIEWED_SHA:sha,EXECUTION_SHA:current,GITHUB_RUN_ATTEMPT:attempt},encoding:'utf8'});assert.equal(r.status===0,ok);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
 }
});
test('Shared cgroup, private socket, clean environment, pinned actions and bounded upload/cleanup',()=>{
 assert.equal(job['runs-on'],'ubuntu-24.04');assert.equal(job['timeout-minutes'],20);assert.ok(!/secrets\.|id-token:|environment:|pull_request|schedule:|MONGO_URI|HR_CV_STORAGE_/.test(source));
 for(const step of job.steps)if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);
 for(const k of ['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'])assert.equal(job.env['HR_CV_'+k+'_ENABLED'],'false');
 const run=job.steps.find(s=>s.name?.startsWith('FreshClam')).run;
 for(const required of ['--memory=4g --memory-swap=4g --cpus=2','--pids-limit=128','--read-only --cap-drop=ALL','--security-opt=no-new-privileges','-i PATH=','--validate-report','clamd-report.pending'])assert.ok(run.includes(required));
 assert.ok(!/--network[= ]host|--privileged|--env-file|--publish|(?:^|\s)-p\s/.test(run));
 const upload=job.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@'));assert.equal(upload.if,'success()');assert.equal(upload.with['retention-days'],1);assert.equal(upload.with.path,'${{ runner.temp }}/clamd-report.json');assert.equal(upload.with['if-no-files-found'],'error');
 const clean=job.steps.at(-1);assert.equal(clean.if,'always()');assert.ok(clean.run.includes('index .Config.Labels'));assert.ok(!/prune|docker rm -f \$\(/.test(clean.run));
 const docker=fs.readFileSync(path.join(root,'Backend/scripts/clamdQa/Dockerfile'),'utf8');assert.ok(docker.includes('exit 101'));assert.ok(docker.includes('USER node'));assert.ok(docker.includes('"-i"'));assert.ok(!/EXPOSE|\.env|COPY \. /.test(docker));
 const ignore=fs.readFileSync(path.join(root,'Backend/scripts/clamdQa/Dockerfile.dockerignore'),'utf8');assert.ok(ignore.startsWith('**\n'));assert.ok(!ignore.includes('!Backend/node_modules'));assert.ok(!ignore.includes('!Backend/.env'));
 const policy=config('/qa/run/clamd.sock');assert.ok(!/TCP|Include|LogFile/.test(policy));assert.ok(policy.includes('MaxThreads 2\n'));assert.ok(policy.includes('MaxScanTime 10000\n'));assert.ok(policy.includes('AlertExceedsMax yes\n'));
});
test('Default invocation and enabled production gates cannot reach filesystem, downloads or engine',async()=>{
 for(const options of [{},{execute:false,env:{INOP_CLAMD_UNIX_QA_ENABLED:'true',GITHUB_ACTIONS:'true'}},{execute:true,env:{}},{execute:true,env:{INOP_CLAMD_UNIX_QA_ENABLED:'true',GITHUB_ACTIONS:'true',RENDER:'true'}},...['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'].map(k=>({execute:true,env:{INOP_CLAMD_UNIX_QA_ENABLED:'true',GITHUB_ACTIONS:'true',['HR_CV_'+k+'_ENABLED']:'true'}}))])await assert.rejects(main(options),/QA disabled/);
});
test('Public report is allowlisted and refuses partial, unsafe or unbounded fields',()=>{
 assert.equal(validateReport(safeReport()).productionReady,false);
 for(const mutate of [r=>r.raw='PRIVATE',r=>r.metrics.raw='PRIVATE',r=>r.metrics.pdfMs=Infinity,r=>r.metrics.pdfMs=-1,r=>r.metrics.pdfMs=1e13,r=>r.engineVersion='PRIVATE',r=>r.signatureTimestamp='PRIVATE',r=>r.productionReady=true,r=>r.resourceLimit='UNKNOWN',r=>r.tests.pop(),r=>r.tests[0].explanation='PRIVATE',r=>r.tests[0].status='FAIL',r=>r.tests[0].id='PRIVATE']){const r=safeReport();mutate(r);assert.throws(()=>validateReport(r));}
});
test('Synthetic worker service really re-scans before parser; legacy fails closed without DB or storage access',async()=>{
 const sample=(await syntheticFixtures())[0];let calls=0;
 await workerRescan({scan:async(_b,c)=>{calls++;return{verdict:'clean',sha256:c.sha256,engine:'synthetic',version:'1'};}},sample);assert.equal(calls,2);
 await legacyClosed({scan:async()=>{throw Error('PRIVATE');}},sample);
 let n=0;await assert.rejects(workerRescan({scan:async(_b,c)=>({verdict:++n===1?'clean':'infected',sha256:c.sha256,engine:'synthetic',version:'1'})},sample));
});

test('Freshness is tied to downloaded verified daily metadata, never an unrelated default DB',()=>{
 const info='Build time: 29 Oct 2026 08:00 +0000\nVersion: 28166\nVerification OK.\n',now=Date.parse('2026-10-29T12:00:00Z');
 assert.deepEqual(signatureMetadata(info,'ClamAV 1.5.4/1/old unrelated system database',now),{engineVersion:'1.5.4-db28166',signatureTimestamp:'2026-10-29T08:00:00.000Z'});
 assert.throws(()=>signatureMetadata(info,'ClamAV 1.5.4',now+25*3600000));assert.throws(()=>signatureMetadata(info,'ClamAV 1.5.4',now-5*3600000));assert.throws(()=>signatureMetadata('PRIVATE','ClamAV 1.5.4',now));
 assert.deepEqual(validateFailure({id:'freshclam',status:'FAIL'}),{id:'freshclam',status:'FAIL'});
 for(const v of [{id:'PRIVATE',status:'FAIL'},{id:'freshclam',status:'FAIL',raw:'PRIVATE'},{id:'freshclam',status:'PASS'}])assert.throws(()=>validateFailure(v));
});

test('QA subprocesses use fixed secret-free environment and bound/sanitize failed output',async()=>{
 process.env.INOP_SYNTHETIC_PRIVATE_CANARY='PRIVATE_TEST_ONLY';
 try{assert.equal(await command(process.execPath,['-e',"if(process.env.INOP_SYNTHETIC_PRIVATE_CANARY)process.exit(2);process.stdout.write('OK')"]),'OK');}
 finally{delete process.env.INOP_SYNTHETIC_PRIVATE_CANARY;}
 for(const args of [['-e',"console.error('PRIVATE_TEST_ONLY');process.exit(1)"],['-e',"process.stdout.write('x'.repeat(1100000))"],['-e','setTimeout(()=>{},10000)']])await assert.rejects(command(process.execPath,args,100),e=>e.message==='QA command failed'&&!e.message.includes('PRIVATE_TEST_ONLY'));
});
